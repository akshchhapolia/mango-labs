import { v4 as uuidv4 } from 'uuid';
import { query } from '../models/db';
import { saveGameState, ActiveGame } from './redis';
import { createBoard } from './gameEngine';

const INVITE_BASE_URL = process.env.INVITE_BASE_URL || 'http://localhost:5173/join';
const ROOM_EXPIRY_HOURS = 2;

export interface CreateRoomResult {
  roomId: string;
  inviteLink: string;
}

export async function createRoom(hostPhone: string): Promise<CreateRoomResult> {
  const roomId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ROOM_EXPIRY_HOURS * 60 * 60 * 1000);

  await query(
    `INSERT INTO rooms (id, game, host_phone, status, created_at, expires_at)
     VALUES ($1, 'tic-tac-toe', $2, 'WAITING', $3, $4)`,
    [roomId, hostPhone, now, expiresAt]
  );

  const inviteLink = `${INVITE_BASE_URL}/${roomId}`;

  return { roomId, inviteLink };
}

export interface RoomDetails {
  id: string;
  game: string;
  host_phone: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export async function getRoom(roomId: string): Promise<RoomDetails | null> {
  const result = await query(
    'SELECT * FROM rooms WHERE id = $1 AND expires_at > NOW()',
    [roomId]
  );
  return result.rows[0] || null;
}

export async function joinRoom(roomId: string): Promise<RoomDetails | null> {
  const room = await getRoom(roomId);
  if (!room || room.status !== 'WAITING') return null;

  await query(
    "UPDATE rooms SET status = 'PLAYING' WHERE id = $1 AND status = 'WAITING'",
    [roomId]
  );

  return { ...room, status: 'PLAYING' };
}

export async function finishRoom(roomId: string): Promise<void> {
  await query(
    "UPDATE rooms SET status = 'FINISHED' WHERE id = $1",
    [roomId]
  );
}

export async function resetRoom(roomId: string): Promise<void> {
  // Reset room to PLAYING status (for restart)
  const room = await getRoom(roomId);
  if (!room) return;

  await query(
    "UPDATE rooms SET status = 'PLAYING' WHERE id = $1",
    [roomId]
  );

  const activeGame: ActiveGame = {
    roomId,
    players: [],
    board: createBoard(),
    currentTurn: 'X',
    winner: null,
    hostPhone: room.host_phone,
  };

  await saveGameState(activeGame);
}