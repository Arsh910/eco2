import time
import asyncio
from dataclasses import dataclass
from collections import deque
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
        self.chunks = deque()
        self.sender_paused = False
        self.receiver_ready = False
        self.receiver_consumption_rate = 0.0
        self.last_consumption_check = time.time()
        self.created_at = time.time()

    def can_accept_chunk(self, chunk_size: int) -> bool:
        return (self.current_bytes + chunk_size) <= self.max_bytes

    def add_chunk(self, chunk: Chunk) -> bool:
        chunk_size = len(chunk.data)
        if not self.can_accept_chunk(chunk_size):
            return False
            
        self.chunks.append(chunk)
        self.current_bytes += chunk_size
        return True

    def get_chunk(self) -> Optional[Chunk]:
        if not self.chunks:
            return None
            
        chunk = self.chunks.popleft()
        chunk_size = len(chunk.data)
        self.current_bytes -= chunk_size
        self._update_consumption_rate(chunk_size)
        return chunk

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
            "chunk_count": len(self.chunks),
            "consumption_rate_bps": self.receiver_consumption_rate,
            "sender_paused": self.sender_paused
        }
