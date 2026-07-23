import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const GAME_TTL = 60 * 60 * 4; // 4 hours in seconds

export interface ActiveGame {
  roomId: string;
  players: string[];
  board: string[];
  currentTurn: 'X' | 'O';
  winner: string | null;
  hostPhone: string;
}

export async function saveGameState(game: ActiveGame): Promise<void> {
  await redis.setex(`game:${game.roomId}`, GAME_TTL, JSON.stringify(game));
}

export async function getGameState(roomId: string): Promise<ActiveGame | null> {
  const data = await redis.get(`game:${roomId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteGameState(roomId: string): Promise<void> {
  await redis.del(`game:${roomId}`);
}

export async function addPlayerToRoom(roomId: string, phone: string): Promise<void> {
  await redis.sadd(`room:${roomId}:players`, phone);
  await redis.expire(`room:${roomId}:players`, GAME_TTL);
}

export async function getRoomPlayers(roomId: string): Promise<string[]> {
  return redis.smembers(`room:${roomId}:players`);
}

export async function removePlayerFromRoom(roomId: string, phone: string): Promise<void> {
  await redis.srem(`room:${roomId}:players`, phone);
}

export default redis;