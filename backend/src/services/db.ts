import { Pool, QueryResult } from 'pg';
import { Room } from '../models/types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return pool.query(text, params);
}

export async function insertRoom(room: Room): Promise<void> {
  await query(
    `INSERT INTO rooms (id, game, host_phone, status, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [room.id, room.game, room.host_phone, room.status, room.created_at, room.expires_at]
  );
}

export async function getRoomById(roomId: string): Promise<Room | undefined> {
  const result = await query(
    'SELECT * FROM rooms WHERE id = $1',
    [roomId]
  );
  if (result.rows.length === 0) return undefined;
  const row = result.rows[0];
  return {
    id: row.id,
    game: row.game,
    host_phone: row.host_phone,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
  } as Room;
}

export async function updateRoomStatus(roomId: string, status: string): Promise<void> {
  await query(
    'UPDATE rooms SET status = $1 WHERE id = $2',
    [status, roomId]
  );
}

export async function deleteRoomFromDb(roomId: string): Promise<void> {
  await query('DELETE FROM rooms WHERE id = $1', [roomId]);
}

export async function cleanupExpiredRoomsFromDb(): Promise<void> {
  await query(
    "DELETE FROM rooms WHERE expires_at < NOW() OR status IN ('FINISHED', 'EXPIRED')"
  );
}

export async function closePool(): Promise<void> {
  await pool.end();
}