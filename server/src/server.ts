import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupSocketHandlers } from './socket/handlers.js';
import { ClientToServerEvents, ServerToClientEvents } from './shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configuration from environment variables
const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

// Default production frontend origin on Render
const defaultOrigins = ['https://zyraforge-bingo.onrender.com'];

// Additional configurable origins from environment variables (comma-separated or single)
const envFrontendOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
  : [];
const envCorsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : [];

const allowedOrigins: string[] = Array.from(
  new Set([...defaultOrigins, ...envFrontendOrigins, ...envCorsOrigins].filter(Boolean))
);

// Local development origins
const localDevOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

/**
 * Validates whether an incoming request origin is permitted by CORS.
 */
function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests without Origin header (e.g. server-to-server, health checks, curl)
  if (!origin) return true;

  const normalized = origin.replace(/\/+$/, '');

  // Check against production allowed origins
  if (allowedOrigins.some((allowed) => allowed.replace(/\/+$/, '') === normalized)) {
    return true;
  }

  // Permit local development origins when not in strict production mode
  if (process.env.NODE_ENV !== 'production') {
    if (localDevOrigins.some((local) => local.replace(/\/+$/, '') === normalized)) {
      return true;
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
      return true;
    }
  }

  return false;
}

// CORS middleware options for Express
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Render Web Service required health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Detailed API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'BINGO Multiplayer',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// Socket.IO configuration with CORS and both WebSocket + Polling transport support
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Socket.IO CORS blocked origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Setup real-time multiplayer handlers
setupSocketHandlers(io);

// Static client serving if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (_req, res) => {
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).json({
        name: 'BINGO Multiplayer Realtime API',
        status: 'ok',
        healthCheck: '/health',
        allowedOrigins,
      });
    }
  });
});

// Bind to 0.0.0.0 and process.env.PORT for Render Web Service deployment
httpServer.listen(PORT, HOST, () => {
  console.log(`🎮 BINGO Multiplayer Server listening on ${HOST}:${PORT}`);
  console.log(`📡 CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
