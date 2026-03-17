import asyncio
import time
import json
from server.relay.transfer_buffer import TransferBuffer, Chunk

class SenderHandler:
    def __init__(self, buffer: TransferBuffer, websocket):
        self.buffer = buffer
        self.websocket = websocket
        self.paused = False
        self.total_bytes_sent = 0
        self.chunks_sent = 0
        self.seq = 0

    async def handle_chunk(self, data: bytes) -> None:
        try:
            chunk = Chunk(
                seq=self.seq,
                data=data,
                timestamp=time.time()
            )

            # Proactive pause signal if pressure is high before blocking
            if not self.paused and self.buffer.should_sender_pause():
                await self.send_pause_signal()
                self.paused = True
                self.buffer.sender_paused = True

            # add_chunk now blocks if buffer is full — no polling loop needed
            success = await self.buffer.add_chunk(chunk)
            if not success:
                return

            # Resume sender if we were paused and pressure dropped
            if self.paused and self.buffer.get_buffer_pressure() < 0.3:
                await self.send_resume_signal()
                self.paused = False
                self.buffer.sender_paused = False

            # Chunk accepted
            await self.send_ack(self.seq)
            self.seq += 1
            self.chunks_sent += 1
            self.total_bytes_sent += len(data)

        except Exception as e:
            print(f"[SenderHandler] Error: {e}")
            if hasattr(self.websocket, 'session'):
                await self.websocket.session.cleanup()

    async def check_resume(self):
        """Called periodically or when receiver drains buffer to unpause sender."""
        if self.paused and self.buffer.get_buffer_pressure() < 0.3:
            await self.send_resume_signal()
            self.paused = False
            self.buffer.sender_paused = False

    async def send_pause_signal(self) -> None:
        try:
            msg = {
                "type": "pause",
                "reason": "receiver_slow",
                "buffer_pressure": self.buffer.get_buffer_pressure(),
                "wait_estimate_sec": self._estimate_wait_time()
            }
            await self.websocket.send(text_data=json.dumps(msg))
        except Exception as e:
            pass

    async def send_resume_signal(self) -> None:
        try:
            msg = {
                "type": "resume",
                "buffer_available_mb": (self.buffer.max_bytes - self.buffer.current_bytes) / (1024 * 1024)
            }
            await self.websocket.send(text_data=json.dumps(msg))
        except Exception as e:
            pass

    async def send_ack(self, seq: int) -> None:
        try:
            msg = {
                "type": "ack",
                "seq": seq,
                "buffer_pressure": self.buffer.get_buffer_pressure()
            }
            await self.websocket.send(text_data=json.dumps(msg))
        except Exception as e:
            pass

    def _estimate_wait_time(self) -> float:
        if self.buffer.receiver_consumption_rate <= 0:
            return 5.0 # fallback guess
        # Time to drain half the current buffer
        return (self.buffer.current_bytes * 0.5) / self.buffer.receiver_consumption_rate
