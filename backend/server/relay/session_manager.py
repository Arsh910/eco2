import time
import asyncio
from typing import Dict, Optional, List
from .transfer_buffer import TransferBuffer

class TransferSession:
    def __init__(self, transfer_id: str, buffer_size_mb: int = 64):
        self.transfer_id = transfer_id
        self.buffer = TransferBuffer(transfer_id, buffer_size_mb)
        self.sender_ws = None
        self.receiver_ws = None
        self.sender_task: Optional[asyncio.Task] = None
        self.receiver_task: Optional[asyncio.Task] = None
        self.created_at = time.time()
        self.last_activity = time.time()

    async def connect_sender(self, websocket) -> None:
        self.sender_ws = websocket
        self.update_activity()

    async def connect_receiver(self, websocket) -> None:
        self.receiver_ws = websocket
        self.update_activity()

    async def cleanup(self) -> None:
        self.buffer.finish()

        if self.sender_task and not self.sender_task.done():
            self.sender_task.cancel()
        if self.receiver_task and not self.receiver_task.done():
            self.receiver_task.cancel()

        if self.sender_ws:
            try:
                await self.sender_ws.close()
            except Exception:
                pass
                
        if self.receiver_ws:
            try:
                await self.receiver_ws.close()
            except Exception:
                pass

    def is_complete(self) -> bool:
        # Transfer is complete if buffer is empty and sender has disconnected normally
        # For simplicity in this session manager, we might just rely on explicit close
        return False

    def update_activity(self) -> None:
        self.last_activity = time.time()


class SessionManager:
    def __init__(self):
        self.active_sessions: Dict[str, TransferSession] = {}
        self._lock = asyncio.Lock()
        self.cleanup_task: Optional[asyncio.Task] = None

    async def create_session(self, transfer_id: str, buffer_size_mb: int = 64) -> TransferSession:
        async with self._lock:
            if transfer_id not in self.active_sessions:
                session = TransferSession(transfer_id, buffer_size_mb)
                self.active_sessions[transfer_id] = session
            return self.active_sessions[transfer_id]

    async def get_session(self, transfer_id: str) -> Optional[TransferSession]:
        async with self._lock:
            return self.active_sessions.get(transfer_id)

    async def remove_session(self, transfer_id: str) -> None:
        async with self._lock:
            if transfer_id in self.active_sessions:
                session = self.active_sessions.pop(transfer_id)
                await session.cleanup()

    async def cleanup_stale_sessions(self) -> None:
        while True:
            await asyncio.sleep(60)
            now = time.time()
            stale_ids = []
            
            async with self._lock:
                for transfer_id, session in self.active_sessions.items():
                    # 5 minutes idle timeout
                    if (now - session.last_activity) > 300:
                        stale_ids.append(transfer_id)
            
            for transfer_id in stale_ids:
                await self.remove_session(transfer_id)

    def get_all_sessions(self) -> List[TransferSession]:
        return list(self.active_sessions.values())

# Global singleton instance
session_manager = SessionManager()
