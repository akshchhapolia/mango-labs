import { API_BASE_URL } from './config';

export interface CreateRoomResponse {
  roomId: string;
  inviteLink: string;
}

export interface RoomDetails {
  id: string;
  game: string;
  host_phone: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export async function createRoom(phoneNumber: string): Promise<CreateRoomResponse> {
  const res = await fetch(`${API_BASE_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create room');
  }
  return res.json();
}

export async function getRoom(roomId: string): Promise<RoomDetails> {
  const res = await fetch(`${API_BASE_URL}/rooms/${roomId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get room');
  }
  return res.json();
}

export async function joinRoom(roomId: string, phoneNumber: string): Promise<RoomDetails> {
  const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to join room');
  }
  return res.json();
}