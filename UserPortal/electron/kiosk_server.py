"""
Local kiosk server — Python/FastAPI equivalent of kioskServer.js.

Provides:
  - HTTP proxy: /kiosk-api/* → main HTTPS server at TOOLACCESS_SERVER:3080
  - WebSocket:  /card-events  broadcasts card scan events to Flutter
  - Static:     serves Flutter web build when flutter_web_dir is supplied
  - Dev:        /kiosk-api/dev/simulate-{door,tool}-scan (non-production only)
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Optional, Set

import httpx
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, Response

SERVER_HOST = os.environ.get('TOOLACCESS_SERVER', 'localhost')
SERVER_PORT = 3080
KIOSK_SECRET = os.environ.get('KIOSK_SECRET', 'dev-kiosk-secret')
IS_DEV = os.environ.get('KIOSK_ENV', 'development') != 'production'

# Shared state
_ws_clients: Set[WebSocket] = set()
_http_client: Optional[httpx.AsyncClient] = None
_loop: Optional[asyncio.AbstractEventLoop] = None


async def _broadcast(event_type: str, card_id: str) -> None:
    """Send a card event JSON message to every connected WebSocket client."""
    message = json.dumps({'type': event_type, 'cardId': card_id})
    disconnected: Set[WebSocket] = set()
    for ws in _ws_clients:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.add(ws)
    _ws_clients.difference_update(disconnected)


def create_app(door_card_reader, tool_card_reader, flutter_web_dir: Optional[str] = None) -> FastAPI:
    app = FastAPI()

    # ------------------------------------------------------------------ lifecycle

    @app.on_event('startup')
    async def on_startup() -> None:
        global _http_client, _loop
        _loop = asyncio.get_running_loop()
        # verify=False mirrors rejectUnauthorized: false — main server uses self-signed cert
        _http_client = httpx.AsyncClient(verify=False)

    @app.on_event('shutdown')
    async def on_shutdown() -> None:
        if _http_client:
            await _http_client.aclose()

    # ------------------------------------------------------------------ dev endpoints
    # Must be registered before the /kiosk-api/{path:path} catch-all.

    if IS_DEV:
        @app.post('/kiosk-api/dev/simulate-door-scan')
        async def simulate_door_scan(request: Request) -> JSONResponse:
            body: dict = {}
            try:
                body = await request.json()
            except Exception:
                pass
            card_id: str = body.get('cardId', 'AABBCCDD')
            door_card_reader.simulate_scan(card_id)
            return JSONResponse({'ok': True, 'cardId': card_id})

        @app.post('/kiosk-api/dev/simulate-tool-scan')
        async def simulate_tool_scan(request: Request) -> JSONResponse:
            body: dict = {}
            try:
                body = await request.json()
            except Exception:
                pass
            card_id: str = body.get('cardId', '11223344')
            tool_card_reader.simulate_scan(card_id)
            return JSONResponse({'ok': True, 'cardId': card_id})

    # ------------------------------------------------------------------ proxy

    @app.api_route('/kiosk-api/{path:path}', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    async def proxy(path: str, request: Request) -> Response:
        """Forward requests to the main HTTPS server, injecting X-Kiosk-Secret."""
        body = await request.body() or b'{}'
        target_url = f'https://{SERVER_HOST}:{SERVER_PORT}/api/kiosk/{path}'
        try:
            resp = await _http_client.request(
                method=request.method,
                url=target_url,
                content=body,
                headers={
                    'Content-Type': 'application/json',
                    'X-Kiosk-Secret': KIOSK_SECRET,
                },
            )
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                media_type='application/json',
            )
        except Exception as exc:
            print(f'[KioskServer] Proxy error: {exc}')
            return JSONResponse({'error': 'Main server unavailable'}, status_code=502)

    # ------------------------------------------------------------------ websocket

    @app.websocket('/card-events')
    async def card_events(websocket: WebSocket) -> None:
        await websocket.accept()
        _ws_clients.add(websocket)
        print('[KioskServer] Flutter connected via WebSocket')
        try:
            while True:
                await websocket.receive_text()  # keep connection alive
        except WebSocketDisconnect:
            pass
        finally:
            _ws_clients.discard(websocket)

    # ------------------------------------------------------------------ static files (Flutter web)

    if flutter_web_dir:
        flutter_path = Path(flutter_web_dir)

        @app.get('/{full_path:path}')
        async def serve_flutter(full_path: str) -> FileResponse:
            candidate = flutter_path / full_path
            if candidate.is_file():
                return FileResponse(str(candidate))
            return FileResponse(str(flutter_path / 'index.html'))

    # ------------------------------------------------------------------ hardware events → websocket

    def _make_card_handler(event_type: str):
        def handler(event: dict) -> None:
            card_id: str = event['cardId']
            print(f'[KioskServer] {event_type} scanned: {card_id}')
            if _loop and _loop.is_running():
                # Safe to call from both the event-loop thread and background hardware threads.
                _loop.call_soon_threadsafe(
                    asyncio.ensure_future,
                    _broadcast(event_type, card_id),
                )
        return handler

    door_card_reader.on('card', _make_card_handler('door-card'))
    tool_card_reader.on('card', _make_card_handler('tool-card'))

    return app
