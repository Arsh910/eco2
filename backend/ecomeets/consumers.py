import json
import random
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

User = get_user_model()


class EcoMeetsConsumer(WebsocketConsumer):

    # Class-level matching queue (shared across all consumer instances)
    # In production, use Redis or Django cache for multi-process support
    _waiting_queue = []        # list of (user_id, channel_name, user_info)
    _active_pairs = {}         # user_id → partner_channel_name
    _user_channels = {}        # user_id → channel_name
    _online_users = set()      # set of user_ids

    # ── Connection lifecycle ─────────────────────────────────────────────────

    def connect(self):
        self.accept()
        self.user = None
        self.user_id = None
        self.user_name = None
        self.is_authenticated = False
        self.partner_id = None
        self.partner_channel = None
        self.role = None

    def disconnect(self, code):
        if self.user_id is None:
            return

        # Notify partner if in a call
        if self.partner_channel:
            self._send_to_channel(self.partner_channel, {
                "typeof": "partner_disconnected",
            })
            # Clean up partner's pairing
            if self.partner_id in self._active_pairs:
                del self._active_pairs[self.partner_id]

        # Clean up own pairing
        if self.user_id in self._active_pairs:
            del self._active_pairs[self.user_id]

        # Remove from waiting queue
        self._waiting_queue[:] = [
            entry for entry in self._waiting_queue
            if entry[0] != self.user_id
        ]

        # Remove from online users & channel map
        self._online_users.discard(self.user_id)
        self._user_channels.pop(self.user_id, None)

        self._broadcast_online_count()
        print(f"[EcoMeets] Disconnected: {self.user_name} (id={self.user_id})")

    # ── Receive ──────────────────────────────────────────────────────────────

    def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        data = json.loads(text_data)
        typeof = data.get("type") or data.get("typeof")

        # ── Auth phase ───────────────────────────────────────────────────
        if not self.is_authenticated:
            if typeof == "auth":
                if self._authenticate_jwt(data.get("token")):
                    self._finish_auth()
                else:
                    self._send_json({"typeof": "auth_error", "error": "Invalid token"})
                    self.close()
            elif typeof == "auth_guest":
                self._authenticate_guest(data.get("name", "Guest"))
                self._finish_auth()
            else:
                self._send_json({"typeof": "auth_error", "error": "Auth required"})
                self.close()
            return

        # ── Signaling phase ──────────────────────────────────────────────

        if typeof == "find_match":
            self._handle_find_match()

        elif typeof == "cancel_search":
            self._handle_cancel_search()

        elif typeof == "offer":
            if self.partner_channel:
                self._send_to_channel(self.partner_channel, {
                    "typeof": "offer",
                    "offer": data["offer"],
                    "from": self.user_id,
                })

        elif typeof == "answer":
            if self.partner_channel:
                self._send_to_channel(self.partner_channel, {
                    "typeof": "answer",
                    "answer": data["answer"],
                    "from": self.user_id,
                })

        elif typeof == "ice_candidate":
            if self.partner_channel:
                self._send_to_channel(self.partner_channel, {
                    "typeof": "ice_candidate",
                    "candidate": data["candidate"],
                    "from": self.user_id,
                })

        elif typeof == "media_state":
            if self.partner_channel:
                self._send_to_channel(self.partner_channel, {
                    "typeof": "media_state",
                    "audioMuted": data.get("audioMuted", False),
                    "videoOff": data.get("videoOff", False),
                    "from": self.user_id,
                })

        elif typeof == "endcall":
            self._handle_endcall()

    # ── Matching logic ───────────────────────────────────────────────────────

    def _handle_find_match(self):
        # Don't allow double-queuing
        if any(entry[0] == self.user_id for entry in self._waiting_queue):
            return

        # Check if someone is already waiting
        if self._waiting_queue:
            # Pop the first waiting user
            partner_id, partner_channel, partner_info = self._waiting_queue.pop(0)

            # Verify partner is still connected
            if partner_id not in self._online_users:
                # Partner disconnected, try again
                self._handle_find_match()
                return

            # Pair them!
            self.partner_id = partner_id
            self.partner_channel = partner_channel
            self.role = "answerer"

            # Update partner
            self._active_pairs[partner_id] = self.channel_name
            self._active_pairs[self.user_id] = partner_channel

            # Store partner mapping
            self._user_channels[self.user_id] = self.channel_name

            # Tell the OFFERER (first user) — they create the offer
            self._send_to_channel(partner_channel, {
                "typeof": "matched",
                "role": "offerer",
                "partnerId": self.user_id,
                "partnerName": self.user_name,
            })

            # Tell the ANSWERER (this user) — they wait for the offer
            self._send_json({
                "typeof": "matched",
                "role": "answerer",
                "partnerId": partner_id,
                "partnerName": partner_info.get("name", "Unknown"),
            })

            # Update partner consumer's state via a channel message
            self._send_to_channel(partner_channel, {
                "typeof": "_internal_set_partner",
                "partner_id": self.user_id,
                "partner_channel": self.channel_name,
            })

            print(f"[EcoMeets] Matched: {partner_info.get('name')} (offerer) <-> {self.user_name} (answerer)")
        else:
            # No one waiting — add to queue
            self._waiting_queue.append((
                self.user_id,
                self.channel_name,
                {"name": self.user_name},
            ))
            self._send_json({"typeof": "waiting", "message": "Looking for a partner…"})
            print(f"[EcoMeets] {self.user_name} added to queue (queue size: {len(self._waiting_queue)})")

    def _handle_cancel_search(self):
        self._waiting_queue[:] = [
            entry for entry in self._waiting_queue
            if entry[0] != self.user_id
        ]
        self._send_json({"typeof": "search_cancelled"})

    def _handle_endcall(self):
        if self.partner_channel:
            self._send_to_channel(self.partner_channel, {
                "typeof": "endcall",
                "from": self.user_id,
            })

        # Clean up pairing for both sides
        if self.partner_id and self.partner_id in self._active_pairs:
            del self._active_pairs[self.partner_id]
        if self.user_id in self._active_pairs:
            del self._active_pairs[self.user_id]

        self.partner_id = None
        self.partner_channel = None
        self.role = None

    # ── Auth helpers ─────────────────────────────────────────────────────────

    def _authenticate_jwt(self, token):
        if not token:
            return False
        try:
            access_token = AccessToken(token)
            user = User.objects.get(id=access_token["user_id"])
            self.user = user
            self.user_id = user.id
            self.user_name = user.username
            return True
        except (TokenError, InvalidToken, User.DoesNotExist) as e:
            print(f"[EcoMeets] Auth error: {e}")
            return False

    def _authenticate_guest(self, name):
        self.user_id = random.randint(10000, 99999)
        self.user_name = f"Guest_{name}_{self.user_id}"

    def _finish_auth(self):
        self.is_authenticated = True
        self._online_users.add(self.user_id)
        self._user_channels[self.user_id] = self.channel_name

        self._send_json({
            "typeof": "welcome",
            "userId": self.user_id,
            "username": self.user_name,
        })
        self._broadcast_online_count()
        print(f"[EcoMeets] Authenticated: {self.user_name} (id={self.user_id})")

    # ── Channel messaging helpers ────────────────────────────────────────────

    def _send_json(self, data):
        self.send(text_data=json.dumps(data))

    def _send_to_channel(self, channel_name, data):
        """Send a message to a specific channel (point-to-point, no broadcast)."""
        async_to_sync(self.channel_layer.send)(channel_name, {
            "type": "direct.message",
            "data": data,
        })

    def direct_message(self, event):
        """Handler for point-to-point messages from channel layer."""
        data = event["data"]

        # Internal message to update partner state
        if data.get("typeof") == "_internal_set_partner":
            self.partner_id = data["partner_id"]
            self.partner_channel = data["partner_channel"]
            self.role = "offerer"
            return

        self.send(text_data=json.dumps(data))

    def _broadcast_online_count(self):
        """Send online count to all connected users via their channels."""
        count = len(self._online_users)
        for uid, ch in list(self._user_channels.items()):
            try:
                async_to_sync(self.channel_layer.send)(ch, {
                    "type": "direct.message",
                    "data": {"typeof": "online_count", "count": count},
                })
            except Exception:
                pass
