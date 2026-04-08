const express = require('express');
const http = require('http');
const https = require('https');
const ws = require('ws');
const path = require('path');

// flutterWebDir is passed from main.js and resolves to the correct location
// in both dev (source tree) and packaged builds (resources/web/).

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3080;
const KIOSK_SECRET = process.env.KIOSK_SECRET ?? 'dev-kiosk-secret';

/**
 * Forwards a request to the main HTTPS server at /api/kiosk/* and pipes the
 * response back. Injects the X-Kiosk-Secret header automatically.
 */
function proxyToServer(req, res) {
  const body = JSON.stringify(req.body ?? {});
  const targetPath = '/api/kiosk' + (req.url || req.path);

  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Kiosk-Secret': KIOSK_SECRET,
    },
    rejectUnauthorized: false, // server uses self-signed cert
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[KioskServer] Proxy error:', err.message);
    res.status(502).json({ error: 'Main server unavailable' });
  });

  proxyReq.write(body);
  proxyReq.end();
}

/**
 * Broadcasts a card event to all connected WebSocket clients.
 */
function makeBroadcaster(wsServer) {
  return function broadcast(type, cardId) {
    const message = JSON.stringify({ type, cardId });
    wsServer.clients.forEach((client) => {
      if (client.readyState === ws.WebSocket.OPEN) {
        client.send(message);
      }
    });
  };
}

/**
 * Starts the local Express + WebSocket server that:
 *   - Serves the Flutter web build as a static SPA
 *   - Proxies /kiosk-api/* to the main HTTPS server
 *   - Broadcasts card scan events over WebSocket to Flutter
 *
 * @param {{ doorCardReader, toolCardReader, port: number }} options
 * @returns {http.Server}
 */
function startKioskServer({ doorCardReader, toolCardReader, port, flutterWebDir }) {
  const app = express();
  app.use(express.json());

  // Dev-only: simulate card scans without hardware
  if (process.env.NODE_ENV !== 'production') {
    app.post('/kiosk-api/dev/simulate-door-scan', (req, res) => {
      const cardId = req.body?.cardId ?? 'AABBCCDD';
      doorCardReader.simulateScan(cardId);
      res.json({ ok: true, cardId });
    });

    app.post('/kiosk-api/dev/simulate-tool-scan', (req, res) => {
      const cardId = req.body?.cardId ?? '11223344';
      toolCardReader.simulateScan(cardId);
      res.json({ ok: true, cardId });
    });
  }

  // Proxy all other /kiosk-api/* requests to the main server
  app.use('/kiosk-api', proxyToServer);

  // Serve Flutter web build
  app.use(express.static(flutterWebDir));

  // SPA fallback: Flutter handles client-side routing
  app.get('*', (_req, res) => {
    res.sendFile(path.join(flutterWebDir, 'index.html'));
  });

  const server = http.createServer(app);

  // WebSocket server for card scan events
  const wsServer = new ws.WebSocketServer({ server, path: '/card-events' });
  const broadcast = makeBroadcaster(wsServer);

  wsServer.on('connection', () => {
    console.log('[KioskServer] Flutter connected via WebSocket');
  });

  // Forward hardware events to all connected Flutter clients
  doorCardReader.on('card', ({ cardId }) => {
    console.log('[KioskServer] Door card scanned:', cardId);
    broadcast('door-card', cardId);
  });

  toolCardReader.on('card', ({ cardId }) => {
    console.log('[KioskServer] Tool card scanned:', cardId);
    broadcast('tool-card', cardId);
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[KioskServer] Listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

module.exports = { startKioskServer };
