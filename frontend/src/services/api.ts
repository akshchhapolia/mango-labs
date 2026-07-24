const BACKEND_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/rooms` : '/rooms';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createRoom(hostPhone: string, hostName: string): Promise<ApiResponse<{ roomId: string; inviteLink: string; status: string }>> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostPhone, hostName }),
  });
  return res.json();
}

export async function joinRoom(roomId: string, phoneNumber: string, displayName: string): Promise<ApiResponse<{ roomId: string; status: string }>> {
  const res = await fetch(`${API_BASE}/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, displayName }),
  });
  return res.json();
}

export async function getRoom(roomId: string): Promise<ApiResponse<{ roomId: string; status: string; hostPhone: string; playerCount: number }>> {
  const res = await fetch(`${API_BASE}/${roomId}`);
  return res.json();
}