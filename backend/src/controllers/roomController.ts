import { Request, Response } from 'express';
import { roomManager } from '../services/roomManager';
import { CreateRoomRequest, JoinRoomRequest } from '../models/types';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export function createRoom(req: Request, res: Response): void {
  const { hostPhone } = req.body as CreateRoomRequest;

  if (!hostPhone) {
    res.status(400).json({ success: false, error: 'Phone number is required' });
    return;
  }

  const { room, game } = roomManager.createRoom(hostPhone);

  res.status(201).json({
    success: true,
    data: {
      roomId: room.id,
      inviteLink: `${BASE_URL}/join/${room.id}`,
      status: room.status,
    },
  });
}

export function joinRoom(req: Request, res: Response): void {
  const { id } = req.params;
  const { phoneNumber } = req.body as JoinRoomRequest;

  if (!phoneNumber) {
    res.status(400).json({ success: false, error: 'Phone number is required' });
    return;
  }

  const result = roomManager.joinRoom(id, phoneNumber);

  if ('error' in result) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.json({
    success: true,
    data: {
      roomId: result.room.id,
      status: result.room.status,
    },
  });
}

export function getRoom(req: Request, res: Response): void {
  const { id } = req.params;

  const room = roomManager.getRoom(id);
  if (!room) {
    res.status(404).json({ success: false, error: 'Room not found' });
    return;
  }

  const game = roomManager.getActiveGame(id);

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