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

const PORT = Number(process.env.PORT) || 3001;

// CORS configuration for Socket.IO
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.use(cors());
app.use(express.json());

// API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'BINGO Multiplayer',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
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
      res.status(200).send('BINGO Realtime Server Running. Client is running on Vite dev server.');
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎮 BINGO Multiplayer Server listening on http://localhost:${PORT}`);
});
