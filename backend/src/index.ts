import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import roomRoutes from './routes/roomRoutes';
import { setupGameHandlers } from './socket/gameHandler';
import { roomManager } from './services/roomManager';

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/rooms', roomRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  setupGameHandlers(io, socket);
});

// Periodic room cleanup
setInterval(() => {
  roomManager.cleanupExpiredRooms();
}, 60 * 1000); // every minute

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});