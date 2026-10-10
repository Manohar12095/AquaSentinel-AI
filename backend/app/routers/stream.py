import asyncio
import json
from typing import AsyncGenerator
from sse_starlette.sse import EventSourceResponse
from fastapi import APIRouter, Request, Query

router = APIRouter()

class SSEBroker:
    def __init__(self):
        # Store tuples of (queue, mode)
        self.queues = []

    def subscribe(self, mode: str = "simulation") -> asyncio.Queue:
        q = asyncio.Queue()
        self.queues.append((q, mode))
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self.queues = [(queue, m) for queue, m in self.queues if queue != q]

    async def publish(self, event_type: str, data: dict, mode: str = "simulation"):
        """
        Publish an event to all connected clients matching the mode.
        """
        message = {
            "event": event_type,
            "data": json.dumps(data)
        }
        for q, client_mode in self.queues:
            if client_mode == mode:
                await q.put(message)

# Global broker instance
broker = SSEBroker()

@router.get("/stream")
async def stream(request: Request, mode: str = Query("simulation")):
    """
    SSE stream endpoint. Clients connect here to receive live updates.
    """
    async def event_generator() -> AsyncGenerator[dict, None]:
        q = broker.subscribe(mode)
        try:
            while True:
                if await request.is_disconnected():
                    break
                message = await q.get()
                yield message
        except asyncio.CancelledError:
            pass
        finally:
            broker.unsubscribe(q)
            
    return EventSourceResponse(event_generator())
