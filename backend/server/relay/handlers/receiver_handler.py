import asyncio
import time
from server.relay.transfer_buffer import TransferBuffer

class ReceiverHandler:
    def __init__(self, buffer: TransferBuffer, websocket):
        self.buffer = buffer
        self.websocket = websocket
        self.total_bytes_received = 0
        self.chunks_received = 0
        self.last_chunk_time = time.time()

    async def handle_download(self) -> None:
        try:
            while True:
                chunk = await self.buffer.get_chunk()

                if chunk is None:
                    break

                try:
                    await self.websocket.send(bytes_data=chunk.data)
                except Exception as e:
                    print(f"[ReceiverHandler] Failed to send chunk: {e}")
                    break

                # Check twisted backpressure
                buffered_bytes = await self.check_twisted_backpressure()
                if buffered_bytes > 0:
                    await self.adaptive_sleep(buffered_bytes)

                self.total_bytes_received += len(chunk.data)
                self.chunks_received += 1
                self.last_chunk_time = time.time()

                # Check if sender needs to be resumed because we drained the buffer
                if hasattr(self.websocket, 'session'):
                    sender_consumer = self.websocket.session.sender_ws
                    if sender_consumer and hasattr(sender_consumer, 'handler'):
                        await sender_consumer.handler.check_resume()

        except asyncio.CancelledError:
            print(f"[ReceiverHandler] Download cancelled for {self.buffer.transfer_id}")
            raise
        except Exception as e:
            print(f"[ReceiverHandler] Unexpected error for {self.buffer.transfer_id}: {e}")
            if hasattr(self.websocket, 'session'):
                sender_ws = self.websocket.session.sender_ws
                if sender_ws:
                    import json
                    try:
                        await sender_ws.send(text_data=json.dumps({
                            "type": "receiver_disconnected",
                            "reason": "connection_closed",
                            "error": str(e)
                        }))
                    except Exception:
                        pass
        finally:
            self.buffer.finish()

    async def check_twisted_backpressure(self) -> int:
        """Returns bytes buffered in Twisted's internal buffer"""
        try:
            protocol = getattr(self.websocket, 'protocol', None)
            if protocol and hasattr(protocol, 'transport'):
                if hasattr(protocol.transport, 'getWriteBufferSize'):
                    return protocol.transport.getWriteBufferSize()
                elif hasattr(protocol.transport, 'get_write_buffer_size'):
                    return protocol.transport.get_write_buffer_size()

            if hasattr(self.websocket, 'scope') and 'transport' in self.websocket.scope:
                transport = self.websocket.scope['transport']
                if hasattr(transport, 'get_write_buffer_size'):
                    return transport.get_write_buffer_size()

            return 0
        except Exception:
            return 0

    async def adaptive_sleep(self, buffered_bytes: int) -> None:
        if buffered_bytes > 10_000_000:  # 10MB critical
            await asyncio.sleep(0.5)
        elif buffered_bytes > 5_000_000:  # 5MB warning
            await asyncio.sleep(0.2)
        elif buffered_bytes > 2_000_000:  # 2MB caution
            await asyncio.sleep(0.1)
