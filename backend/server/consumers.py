import json
import asyncio
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from asgiref.sync import sync_to_async

User = get_user_model()


class ServerConsumer(AsyncWebsocketConsumer):

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs'].get('connection')
        self.user = None
        self.guest_user = None


        self.is_authenticated_context = False

        if not self.room_id:
            await self.close()
            return

        query_string = self.scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        guest_name = query_params.get('guest', [None])[0]

        if guest_name:
            self.guest_user = guest_name
            self.display_name = f"{self.channel_name}_{guest_name}"
            self.is_authenticated_context = True

            print(f"Guest Connection: {self.display_name} in room: {self.room_id}")
            await self.accept()
            await self._join_room()
        else:
            print(f"Pending Auth Connection in room: {self.room_id}")
            await self.accept()

    async def disconnect(self, close_code):
        try:
            if self.is_authenticated_context and hasattr(self, 'display_name') and self.display_name:
                print(f"Disconnected: {self.display_name}")
                await sync_to_async(self._update_user_list)(add=False)
                await self._broadcast_user_list()

                await self.channel_layer.group_discard(
                    self.room_id,
                    self.channel_name
                )
        except Exception as e:
            print(f"Error in disconnect: {e}")

    async def receive(self, text_data=None, bytes_data=None):
        try:
            if bytes_data:
                await self.send_error("Binary data not supported on this endpoint. Use /ws/sender/<transfer_id> instead.")
                return

            if not text_data:
                return

            data = json.loads(text_data)
            message_type = data.get('type') or data.get('typeof')

            # Authentication Phase
            if not self.is_authenticated_context:
                if message_type == 'auth':
                    token = data.get('token')
                    if await self._authenticate(token):
                        self.is_authenticated_context = True
                        await self._join_room()
                        await self.send_json({
                            'type': 'auth_success',
                            'user': self._get_clean_username(self.display_name)
                        })
                    else:
                        await self.send_error("Authentication failed")
                        await self.close()
                else:
                    await self.send_error("Authentication required")
                    await self.close()
                return

            # Authenticated Phase
            if self.user is None:
                if message_type in ['resume-request', 'resume-info']:
                    print(f"Blocking {message_type} for guest user")
                    return

                if message_type == 'file-meta':
                    payload = data.get('payload')
                    if isinstance(payload, dict) and payload.get('resumed'):
                        print("Blocking resume capability for guest in file-meta")
                        await self.send_error("Checkpoint usage is restricted to signed-in users.")
                        return

            if message_type == 'copy':
                await self._handle_copy_message(data)
            else:
                await self._handle_generic_message(data)

        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            print(f"Error in receive: {e}")
            await self.send_error("Internal server error processing message")

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    async def _authenticate(self, token):
        if not token:
            return False
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = await sync_to_async(User.objects.get)(id=user_id)

            self.user = user
            self.display_name = f"{self.channel_name}_{user.username}"
            print(f"User Authenticated: {self.display_name}")
            return True

        except (TokenError, InvalidToken, User.DoesNotExist) as e:
            print(f"Auth Error: {e}")
            return False

    # ------------------------------------------------------------------
    # Room management
    # ------------------------------------------------------------------

    async def _join_room(self):
        await self.channel_layer.group_add(
            self.room_id,
            self.channel_name
        )
        await sync_to_async(self._update_user_list)(add=True)
        await self._broadcast_user_list()

    # ------------------------------------------------------------------
    # Message handlers
    # ------------------------------------------------------------------

    async def _handle_copy_message(self, data):
        copy_text = data.get('copy') or data.get('payload')
        file_name = data.get('file_name')

        event = {
            'type': 'group_copy_handler',
            'message_type': 'copy',
            'copy_text': copy_text,
            'file_data': data.get('file'),
            'file_name': file_name,
            'f_user': self.display_name,
            'sender_channel_name': self.channel_name,
        }

        await self.channel_layer.group_send(self.room_id, event)

        if file_name:
            await self.send_json({
                'type': 'progress',
                'sent': 'done'
            })

    async def _handle_generic_message(self, data):
        payload = data.get('payload') or data.get('disa')
        event = {
            'type': 'group_generic_handler',
            'message_type': data.get('type') or data.get('typeof'),
            'payload': payload,
            'sender_channel_name': self.channel_name,
        }
        await self.channel_layer.group_send(self.room_id, event)

    # ------------------------------------------------------------------
    # Channel layer event handlers (called by the channel layer)
    # ------------------------------------------------------------------

    async def group_copy_handler(self, event):
        if event.get('sender_channel_name') == self.channel_name:
            return

        raw_user = event.get('f_user')
        clean_user = self._get_clean_username(raw_user)

        await self.send_json({
            'type': event['message_type'],
            'copy_text': event['copy_text'],
            'file_data': event.get('file_data'),
            'file_name': event.get('file_name'),
            'f_user': clean_user
        })

    async def group_generic_handler(self, event):
        if event.get('sender_channel_name') == self.channel_name:
            return

        await self.send_json({
            'type': event['message_type'],
            'payload': event.get('payload')
        })

    async def group_user_list_handler(self, event):
        raw_list_str = event['list']
        try:
            import ast
            raw_list = ast.literal_eval(raw_list_str)
        except Exception:
            raw_list = []

        clean_list = [self._get_clean_username(u) for u in raw_list]

        raw_new_user = event.get('new_user')
        clean_new_user = self._get_clean_username(raw_new_user)

        await self.send_json({
            'type': 'user_list_update',
            'list': clean_list,
            'new_user': clean_new_user
        })

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _broadcast_user_list(self):
        key = f"group_users_{self.room_id}"
        users_set = await sync_to_async(cache.get)(key, set())
        user_list = list(users_set)

        if user_list:
            event = {
                'type': 'group_user_list_handler',
                'list': str(user_list),
                'new_user': str(getattr(self, 'display_name', ''))
            }
            await self.channel_layer.group_send(self.room_id, event)

    def _update_user_list(self, add=True):
        key = f"group_users_{self.room_id}"
        users = cache.get(key, set())

        if not isinstance(users, set):
            users = set(users)

        if add:
            users.add(self.display_name)
        else:
            users.discard(self.display_name)

        cache.set(key, users, timeout=None)

    def _get_clean_username(self, internal_name):
        if not internal_name:
            return None
        try:
            parts = internal_name.split('_', 1)
            if len(parts) > 1:
                return parts[1]
            return internal_name
        except Exception:
            return internal_name

    async def send_json(self, content):
        await self.send(text_data=json.dumps(content))

    async def send_error(self, message):
        await self.send_json({'error': message})

# ---------------------------------------------------------------------------
# Adaptive Buffer Pool Consumers (Phase 3)
# ---------------------------------------------------------------------------
from server.relay.session_manager import session_manager
from server.relay.handlers.sender_handler import SenderHandler
from server.relay.handlers.receiver_handler import ReceiverHandler

class SenderConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.transfer_id = self.scope['url_route']['kwargs']['transfer_id']

        # Get or create session
        self.session = await session_manager.get_session(self.transfer_id)
        if not self.session:
            self.session = await session_manager.create_session(self.transfer_id)

        await self.session.connect_sender(self)
        await self.accept()

    async def receive(self, bytes_data=None, text_data=None):
        if bytes_data:
            # Create handler if not exists
            if not hasattr(self, 'handler'):
                self.handler = SenderHandler(self.session.buffer, self)

            # Delegate to handler
            await self.handler.handle_chunk(bytes_data)

    async def disconnect(self, close_code):
        if hasattr(self, 'session') and self.session.buffer:
            self.session.buffer.finish()

        if hasattr(self, 'session'):
            await self.session.cleanup()
            await session_manager.remove_session(self.transfer_id)


class ReceiverConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.transfer_id = self.scope['url_route']['kwargs']['transfer_id']
        
        # Get or create session to prevent race condition if receiver connects first
        self.session = await session_manager.get_session(self.transfer_id)
        if not self.session:
            self.session = await session_manager.create_session(self.transfer_id)
        
        await self.session.connect_receiver(self)
        await self.accept()
        
        # Start download task
        self.handler = ReceiverHandler(self.session.buffer, self)
        self.download_task = asyncio.create_task(self.handler.handle_download())

    async def disconnect(self, close_code):
        if hasattr(self, 'download_task'):
            self.download_task.cancel()

        if hasattr(self, 'session') and self.session.buffer:
            self.session.buffer.finish()

        if hasattr(self, 'session'):
            if self.session.sender_ws:
                try:
                    await self.session.sender_ws.send(text_data=json.dumps({
                        'type': 'receiver_disconnected',
                        'reason': 'connection_closed',
                        'code': close_code
                    }))
                except Exception:
                    pass