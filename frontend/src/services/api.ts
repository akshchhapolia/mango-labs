const API_BASE = '/rooms';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createRoom(hostPhone: string): Promise<ApiResponse<{ roomId: string; inviteLink: string; status: string }>> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostPhone }),
  });
  return res.json();
}

export async function joinRoom(roomId: string, phoneNumber: string): Promise<ApiResponse<{ roomId: string; status: string }>> {
  const res = await fetch(`${API_BASE}/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  return res.json();
}

export async function getRoom(roomId: string): Promise<ApiResponse<{ roomId: string; status: string; hostPhone: string; playerCount: number }>> {
  const res = await fetch(`${API_BASE}/${roomId}`);
  return res.json();
}