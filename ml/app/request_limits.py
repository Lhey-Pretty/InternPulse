"""Bound request bodies and in-flight work, including background callbacks."""

import asyncio
import json

MAX_BODY_BYTES = 1_048_576
MAX_ACTIVE_REQUESTS = 4
BODY_TIMEOUT_SECONDS = 10


class RequestLimitsMiddleware:
    def __init__(self, app):
        self.app = app
        self.active = 0

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["path"] == "/health":
            return await self.app(scope, receive, send)
        if self.active >= MAX_ACTIVE_REQUESTS:
            return await self._error(send, 503, "Service busy; retry later")
        self.active += 1
        try:
            body = bytearray()
            async def read_body():
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return False
                    chunk = message.get("body", b"")
                    if len(body) + len(chunk) > MAX_BODY_BYTES:
                        return None
                    body.extend(chunk)
                    if not message.get("more_body", False):
                        return True
            try:
                complete = await asyncio.wait_for(read_body(), timeout=BODY_TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                return await self._error(send, 408, "Request body timed out")
            if complete is None:
                return await self._error(send, 413, "Request body is too large")
            if not complete:
                return
            consumed = False
            async def bounded_receive():
                nonlocal consumed
                if not consumed:
                    consumed = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()
            await self.app(scope, bounded_receive, send)
        finally:
            self.active -= 1

    @staticmethod
    async def _error(send, status, detail):
        body = json.dumps({"detail": detail}).encode()
        await send({"type": "http.response.start", "status": status,
                    "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})
