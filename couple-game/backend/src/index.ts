import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { roomRoutes } from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/rooms', roomRoutes);

// Socket handlers
setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { io };