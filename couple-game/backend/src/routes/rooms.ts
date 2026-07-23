import { Router, Request, Response } from 'express';
import { createRoom, getRoom, joinRoom } from '../services/roomService';

export const roomRoutes = Router();

roomRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ error: 'phoneNumber is required' });
      return;
    }

    const result = await createRoom(phoneNumber);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

roomRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) {
      res.status(404).json({ error: 'Room not found or expired' });
      return;
    }
    res.json(room);
  } catch (err) {
    console.error('Error getting room:', err);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

roomRoutes.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ error: 'phoneNumber is required' });
      return;
    }

    const room = await joinRoom(req.params.id);
    if (!room) {
      res.status(400).json({ error: 'Room not found, expired, or already has players' });
      return;
    }

    res.json(room);
  } catch (err) {
    console.error('Error joining room:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
});