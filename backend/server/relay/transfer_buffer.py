import time
import asyncio
from dataclasses import dataclass
from typing import Optional

@dataclass
class Chunk:
    seq: int
    data: bytes
    timestamp: float
    checksum: Optional[str] = None

class TransferBuffer:
    def __init__(self, transfer_id: str, max_size_mb: int = 64):
        self.transfer_id = transfer_id
        self.max_bytes = max_size_mb * 1024 * 1024
        self.current_bytes = 0
        self.chunks = asyncio.Queue()
        self._space_available = asyncio.Event()
        self._space_available.set()  # starts open (space is available)
        self._finished = False
        self.sender_paused = False
        self.receiver_ready = False
        self.receiver_consumption_rate = 0.0
        self.last_consumption_check = time.time()
        self.created_at = time.time()

    def can_accept_chunk(self, chunk_size: int) -> bool:
        return (self.current_bytes + chunk_size) <= self.max_bytes

    async def add_chunk(self, chunk: Chunk) -> bool:
        """
        Called by SenderHandler to add a chunk.

        If buffer is full, this async function BLOCKS (sender sleeps).
        No polling, no wasted CPU. Returns False if transfer was cancelled.
        """
        chunk_size = len(chunk.data)

        # Wait until there is space — no polling, no dropped chunks
        while not self.can_accept_chunk(chunk_size):
            if self._finished:
                return False

            self._space_available.clear()
            await self._space_available.wait()

        if self._finished:
            return False

        await self.chunks.put(chunk)
        self.current_bytes += chunk_size

        self.sender_paused = self.should_sender_pause()
        return True

    async def get_chunk(self) -> Optional[Chunk]:
        """
        Called by ReceiverHandler to get a chunk.

        If queue is empty, this async function BLOCKS (receiver sleeps).
        No polling, no busy-waiting every 10ms. Returns None when finished.
        """
        try:
            chunk = await asyncio.wait_for(self.chunks.get(), timeout=1.0)
        except asyncio.TimeoutError:
            if self._finished:
                return None
            return await self.get_chunk()

        if chunk is None:
            return None

        chunk_size = len(chunk.data)
        self.current_bytes -= chunk_size
        self._update_consumption_rate(chunk_size)

        if self.can_accept_chunk(chunk_size):
            self._space_available.set()

        return chunk

    def finish(self):
        """
        Called when transfer completes or is cancelled.
        Wakes up any waiting coroutines so they can exit cleanly.
        """
        self._finished = True
        self._space_available.set()

        try:
            self.chunks.put_nowait(None)
        except asyncio.QueueFull:
            pass

    def get_buffer_pressure(self) -> float:
        if self.max_bytes <= 0:
            return 1.0
        return self.current_bytes / self.max_bytes

    def should_sender_pause(self) -> bool:
        pressure = self.get_buffer_pressure()

        # Adaptive backpressure logic
        if self.receiver_consumption_rate > 5_000_000:  # > 5MB/s
            return pressure >= 0.90  # Pause at 90%
        elif self.receiver_consumption_rate > 1_000_000:  # > 1MB/s
            return pressure >= 0.70  # Pause at 70%
        else:
            return pressure >= 0.50  # Pause at 50% for slow receivers

    def _update_consumption_rate(self, bytes_consumed: int) -> None:
        now = time.time()
        time_elapsed = now - self.last_consumption_check

        if time_elapsed > 0:
            current_rate = bytes_consumed / time_elapsed
            # Exponential moving average for smoothing
            if self.receiver_consumption_rate == 0.0:
                self.receiver_consumption_rate = current_rate
            else:
                alpha = 0.2  # Smoothing factor
                self.receiver_consumption_rate = (alpha * current_rate) + ((1 - alpha) * self.receiver_consumption_rate)

        self.last_consumption_check = now

    def get_stats(self) -> dict:
        return {
            "buffer_pressure": self.get_buffer_pressure(),
            "current_bytes": self.current_bytes,
            "max_bytes": self.max_bytes,
            "chunk_count": self.chunks.qsize(),
            "consumption_rate_bps": self.receiver_consumption_rate,
            "sender_paused": self.sender_paused,
            "finished": self._finished
        }
