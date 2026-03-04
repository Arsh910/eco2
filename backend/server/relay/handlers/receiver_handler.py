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
                chunk = self.buffer.get_chunk()
                
                if chunk is None:
                    # Buffer is empty, wait for sender
                    await asyncio.sleep(0.05)
                    continue
                    
                # Try to send chunk via websocket
                # For AsyncWebsocketConsumer, we use send(bytes_data=...)
                await self.websocket.send(bytes_data=chunk.data)
                
                # Check twisted backpressure
                buffered_bytes = await self.check_twisted_backpressure()
                if buffered_bytes > 0:
                    await self.adaptive_sleep(buffered_bytes)
                else:
                    # Give the Daphne Channel layer a tiny moment to flush the memory queue
                    # (Django Channels InMemoryChannelLayer has a default 100-message cap)
                    await asyncio.sleep(0.005)
                
                self.total_bytes_received += len(chunk.data)
                self.chunks_received += 1
                self.last_chunk_time = time.time()
                
                # Optionally check if sender needs to be resumed because we drained the buffer
                if hasattr(self.websocket, 'session') and self.websocket.session.sender_task:
                    # Let the sender_ws handler push resume signal if needed
                    # Or we can directly call check_resume on sender_handler if we had a ref
                    pass
                if hasattr(self.websocket, 'session'):
                    sender_consumer = self.websocket.session.sender_ws
                    if sender_consumer and hasattr(sender_consumer, 'handler'):
                        await sender_consumer.handler.check_resume()

        except Exception as e:
            print(f"[ReceiverHandler] Error in download loop for {self.buffer.transfer_id}: {e}")
            if hasattr(self.websocket, 'session'):
                # Notify sender that receiver disconnected
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
                await self.websocket.session.cleanup()

    async def check_twisted_backpressure(self) -> int:
        """Returns bytes buffered in Twisted's internal buffer"""
        try:
            # Django Channels generic async websocket consumer wraps the base send
            # We access the transport dynamically if possible.
            # Usually ASGI servers manage this opaquely. We'll try to find Autobahn protocol transport
            # As a fallback or if not accessible, we return 0. 
            # In purely ASGI compliant apps, this might not be accessible directly.
            # We will use a safe checking logic.
            # If daphne channel layer isn't exposing this directly on self.websocket...
            protocol = getattr(self.websocket, 'protocol', None)
            if protocol and hasattr(protocol, 'transport'):
                if hasattr(protocol.transport, 'getWriteBufferSize'):
                    return protocol.transport.getWriteBufferSize()
                elif hasattr(protocol.transport, 'get_write_buffer_size'): # asyncio transports
                    return protocol.transport.get_write_buffer_size()
                    
            # Try exploring ASGI scope if transport is injected (some ASGI servers do this)
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
