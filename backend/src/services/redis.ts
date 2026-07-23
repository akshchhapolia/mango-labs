import Redis from 'ioredis';
import { ActiveGame } from '../models/types';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

const GAME_PREFIX = 'game:';
const GAME_TTL = 60 * 60; // 1 hour in seconds

export async function saveGame(game: ActiveGame): Promise<void> {
  const key = GAME_PREFIX + game.roomId;
  await redis.setex(key, GAME_TTL, JSON.stringify(game));
}

export async function getGame(roomId: string): Promise<ActiveGame | undefined> {
  const key = GAME_PREFIX + roomId;
  const raw = await redis.get(key);
  if (!raw) return undefined;
  return JSON.parse(raw) as ActiveGame;
}

export async function deleteGame(roomId: string): Promise<void> {
  const key = GAME_PREFIX + roomId;
  await redis.del(key);
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}