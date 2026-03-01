import json
from urllib.parse import parse_qs
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

User = get_user_model()

class ServerConsumer(WebsocketConsumer):
    def connect(self):
        self.room_id = self.scope['url_route']['kwargs'].get('connection')
        self.user = None
        self.guest_user = None
        self.is_authenticated_context = False

        if not self.room_id:
            self.close()
            return

        query_string = self.scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        guest_name = query_params.get('guest', [None])[0]

        if guest_name:
            self.guest_user = guest_name
            self.display_name = f"{self.channel_name}_{guest_name}"
            self.is_authenticated_context = True
            
            print(f"Guest Connection: {self.display_name} in room: {self.room_id}")
            self.accept()
            self._join_room()
        else:
            print(f"Pending Auth Connection in room: {self.room_id}")
            self.accept()

    def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        """
        try:
            if self.is_authenticated_context and hasattr(self, 'display_name') and self.display_name:
                print(f"Disconnected: {self.display_name}")
                self._update_user_list(add=False)
                self._broadcast_user_list()

                async_to_sync(self.channel_layer.group_discard)(
                    self.room_id,
                    self.channel_name
                )
        except Exception as e:
            print(f"Error in disconnect: {e}")

    def receive(self, text_data=None, bytes_data=None):
        """
        Handle incoming WebSocket messages.
        Supports both text (JSON) and binary (file transfer chunks) messages.
        If not authenticated, only accept 'auth' message.
        """
        try:
            if bytes_data:
                if not self.is_authenticated_context:
                    self.send_error("Authentication required")
                    self.close()
                    return
                
                async_to_sync(self.channel_layer.group_send)(
                    self.room_id,
                    {
                        'type': 'group_binary_handler',
                        'bytes_data': bytes_data,
                        'sender_channel_name': self.channel_name,
                    }
                )
                return
            
            if not text_data:
                return

            data = json.loads(text_data)
            message_type = data.get('type') or data.get('typeof')
      
            # Authentication Phase
            if not self.is_authenticated_context:
                if message_type == 'auth':
                    token = data.get('token')
                    if self._authenticate(token):
                        self.is_authenticated_context = True
                        self._join_room()
                        self.send_json({
                            'type': 'auth_success', 
                            'user': self._get_clean_username(self.display_name)
                        })
                    else:
                        self.send_error("Authentication failed")
                        self.close()
                else:
                    self.send_error("Authentication required")
                    self.close()
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
                        self.send_error("Checkpoint usage is restricted to signed-in users.")
                        return

            if message_type == 'copy':
                self._handle_copy_message(data)
            else:
                self._handle_generic_message(data)

        except json.JSONDecodeError:
            self.send_error("Invalid JSON format")
        except Exception as e:
            print(f"Error in receive: {e}")
            self.send_error("Internal server error processing message")

    def _authenticate(self, token):
        """
        Verify JWT token and set self.user.
        """
        if not token:
            return False
        
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            
            self.user = user
            self.display_name = f"{self.channel_name}_{user.username}"
            print(f"User Authenticated: {self.display_name}")
            return True
            
        except (TokenError, InvalidToken, User.DoesNotExist) as e:
            print(f"Auth Error: {e}")
            return False

    def _join_room(self):
        """
        Add connection to group and broadcast presence.
        """
        async_to_sync(self.channel_layer.group_add)(
            self.room_id,
            self.channel_name
        )
        self._update_user_list(add=True)
        self._broadcast_user_list()

    def _handle_copy_message(self, data):
        """
        Handle 'copy' type messages.
        """
        copy_text = data.get('copy') or data.get('payload') 
        file_name = data.get('file_name')
        
        if copy_text:
            print(f"Copy text: {copy_text}")
        if file_name:
            print(f"File: {file_name}")

        event = {
            'type': 'group_copy_handler',
            'message_type': 'copy', 
            'copy_text': copy_text,
            'file_data': data.get('file'),
            'file_name': file_name,
            'f_user': self.display_name, 
            'sender_channel_name': self.channel_name, 
        }

        async_to_sync(self.channel_layer.group_send)(
            self.room_id,
            event
        )

        if file_name:
            self.send_json({
                'type': 'progress',
                'sent': 'done'
            })

    def _handle_generic_message(self, data):
        """
        Handle other message types.
        """
        payload = data.get('payload') or data.get('disa')
        event = {
            'type': 'group_generic_handler', 
            'message_type': data.get('type') or data.get('typeof'),
            'payload': payload,
            'sender_channel_name': self.channel_name, 
        }
        async_to_sync(self.channel_layer.group_send)(
            self.room_id,
            event
        )

    # Group Event Handlers
    def group_copy_handler(self, event):
        if event.get('sender_channel_name') == self.channel_name:
            return

        raw_user = event.get('f_user')
        clean_user = self._get_clean_username(raw_user)

        self.send_json({
            'type': event['message_type'],
            'copy_text': event['copy_text'],
            'file_data': event.get('file_data'),
            'file_name': event.get('file_name'),
            'f_user': clean_user
        })

    def group_generic_handler(self, event):
        if event.get('sender_channel_name') == self.channel_name:
            return

        self.send_json({
            'type': event['message_type'],
            'payload': event.get('payload')
        })
    
    def group_binary_handler(self, event):
        """
        Forward binary data (file transfer chunks) to all group members except sender.
        Binary data is sent unchanged - no encoding/decoding.
        """
        if event.get('sender_channel_name') == self.channel_name:
            return
        
        self.send(bytes_data=event['bytes_data'])

    def group_user_list_handler(self, event):
        raw_list_str = event['list']
        try:
            import ast
            raw_list = ast.literal_eval(raw_list_str)
        except:
             raw_list = []

        clean_list = [self._get_clean_username(u) for u in raw_list]
        
        raw_new_user = event.get('new_user')
        clean_new_user = self._get_clean_username(raw_new_user)

        self.send_json({
            'type': 'user_list_update', 
            'list': clean_list,
            'new_user': clean_new_user
        })

    # Helpers
    def _get_clean_username(self, internal_name):
        """
        Strip the socket ID prefix from the internal unique name.
        Format: "channel.name_username" -> "username"
        """
        if not internal_name:
            return None
        try:
            parts = internal_name.split('_', 1)
            if len(parts) > 1:
                return parts[1]
            return internal_name
        except:
            return internal_name

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

    def _broadcast_user_list(self):
        key = f"group_users_{self.room_id}"
        users_set = cache.get(key, set())
        user_list = list(users_set)

        if user_list:
            event = {
                'type': 'group_user_list_handler',
                'list': str(user_list),
                'new_user': str(self.display_name)
            }
            async_to_sync(self.channel_layer.group_send)(
                self.room_id,
                event
            )

    def send_json(self, content):
        self.send(text_data=json.dumps(content))

    def send_error(self, message):
        self.send_json({'error': message})