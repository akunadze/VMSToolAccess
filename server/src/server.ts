import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import ws from 'ws';
import { Response as ApiResponse } from "./data";
import * as data from "./data";
import path from "path";
import https from "https";
import fs from "fs";
import * as config from "./config";
import { watchdog, latestVersion, setLatestVersion } from "./appState";

import { createAuthRouter } from "./routes/auth";
import { createToolsRouter } from "./routes/tools";
import { createUsersRouter } from "./routes/users";
import { createEnrollRouter } from "./routes/enroll";
import { createFirmwareRouter } from "./routes/firmware";

// Uncomment to see full request/response bodies in the log
// import morganBody from 'morgan-body';
// morganBody(app)

data.initData();

// --- TLS certificate loading ---
let certKey: Buffer;
let certPem: Buffer;

try {
  certKey = fs.readFileSync('server.key');
  certPem = fs.readFileSync('server.pem');
} catch (e) {
  console.error('TLS certificates not found. Provide server.key and server.pem to start the server.');
  process.exit(1);
}

// --- Express app setup ---
const app = express();

app.use(cookieParser());

// httpOnly, secure, sameSite (CSRF mitigation), resave:false
app.use(session({
  secret: config.SESSION_SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.use('/updates', express.static(path.join(__dirname, '../../updates')));

// --- WebSocket notification ---
const sockets = new Set<WebSocket>();

function sendUpdateNotification() {
  console.log('Sending updates');
  sockets.forEach((x: WebSocket) => x.send('update'));
}

// --- API routes (#16: requireAuth middleware applied inside each router) ---
app.use('/api', createAuthRouter(sendUpdateNotification));
app.use('/api', createToolsRouter(sendUpdateNotification));
app.use('/api', createUsersRouter(sendUpdateNotification));
app.use('/api', createEnrollRouter());
app.use('/api', createFirmwareRouter());

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist', 'index.html'));
});

// #19: Global error handler — catches any unhandled errors thrown by route handlers
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json(ApiResponse.mkErr('Internal server error'));
});

// --- HTTPS server ---
const server = https.createServer({ key: certKey, cert: certPem }, app);

server.listen(config.SERVER_PORT, () => {
  console.log(`Listening on port ${config.SERVER_PORT} (HTTPS)`);
});

// --- WebSocket server ---
const wsServer = new ws.Server({ server: server as any, path: '/ws' });

wsServer.on('connection', (socket: WebSocket) => {
  console.log('WebSocket connected');
  sockets.add(socket);
  socket.onclose = function () {
    sockets.delete(socket);
  };
  console.log("Sockets: " + sockets.size);
});
wsServer.on('error', console.error);

// --- Watchdog interval: track tool online/offline state and firmware updates ---
setInterval(() => {
  let change = false;

  const tools = data.getTools();

  for (const tool of tools) {
    let lastSeen = watchdog.find(x => x.toolMac === tool.mac); // #10: let instead of var
    if (!lastSeen) {
      lastSeen = { toolMac: tool.mac, timestamp: 0, updated: false, offline: false };
      watchdog.push(lastSeen);
    }

    const offline = (Math.floor(Date.now() / 1000) - lastSeen.timestamp) > 30;
    if (!lastSeen.updated || offline !== lastSeen.offline) {
      change = true;
      lastSeen.updated = true;
      lastSeen.offline = offline;
    }
  }

  if (change) {
    sendUpdateNotification();
  }

  try {
    let ver = 0;
    fs.readdirSync(path.join(__dirname, '../../updates')).forEach(file => {
      const match = file.match('^([0-9]+)\\.bin');
      if (match && +match[1] > ver) {
        ver = +match[1];
      }
    });
    if (latestVersion !== ver) {
      console.log("Update version available: " + ver);
    }
    setLatestVersion(ver);
  } catch (e) {
    console.log('Error scanning updates: ' + e);
  }
}, 10000);
