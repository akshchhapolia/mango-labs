import { Request, Response } from 'express';
import { roomManager } from '../services/roomManager';
import { CreateRoomRequest, JoinRoomRequest } from '../models/types';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export async function createRoom(req: Request, res: Response): Promise<void> {
  const { hostPhone, hostName } = req.body as CreateRoomRequest;

  if (!hostPhone || !hostName?.trim()) {
    res.status(400).json({ success: false, error: 'Name and phone number are required' });
    return;
  }

  const { room, game } = await roomManager.createRoom(hostPhone, hostName.trim());

  res.status(201).json({
    success: true,
    data: {
      roomId: room.id,
      inviteLink: `${BASE_URL}/join/${room.id}`,
      status: room.status,
    },
  });
}

export async function joinRoom(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { phoneNumber, displayName } = req.body as JoinRoomRequest;

  if (!phoneNumber || !displayName?.trim()) {
    res.status(400).json({ success: false, error: 'Name and phone number are required' });
    return;
  }

  const room = await roomManager.getRoom(id);
  if (!room) {
    res.status(404).json({ success: false, error: 'Room not found' });
    return;
  }

  if (room.status !== 'WAITING') {
    res.status(400).json({ success: false, error: 'Game already in progress or finished' });
    return;
  }

  if (Date.now() > room.expires_at.getTime()) {
    res.status(400).json({ success: false, error: 'Room has expired' });
    return;
  }

  // Don't mutate state here — the socket join-room event handles it
  res.json({
    success: true,
    data: {
      roomId: room.id,
      status: room.status,
    },
  });
}

export async function getRoom(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const room = await roomManager.getRoom(id);
  if (!room) {
    res.status(404).json({ success: false, error: 'Room not found' });
    return;
  }

  const game = await roomManager.getActiveGame(id);

  res.json({
    success: true,
    data: {
      roomId: room.id,
      status: room.status,
      hostPhone: room.host_phone,
      playerCount: game ? game.players.length : 0,
      createdAt: room.created_at,
      expiresAt: room.expires_at,
    },
  });
}