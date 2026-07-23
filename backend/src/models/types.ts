export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'EXPIRED';
export type PlayerSymbol = 'X' | 'O';
export type Board = (PlayerSymbol | null)[];

export interface Room {
  id: string;
  game: 'tic-tac-toe';
  host_phone: string;
  status: GameStatus;
  created_at: Date;
  expires_at: Date;
}

export interface ActiveGame {
  roomId: string;
  players: string[];
  playerNames: Record<string, string>;
  board: Board;
  currentTurn: PlayerSymbol;
  winner: PlayerSymbol | 'draw' | null;
}

export interface CreateRoomRequest {
  hostPhone: string;
  hostName: string;
}

export interface JoinRoomRequest {
  phoneNumber: string;
  displayName: string;
}

export interface MakeMoveData {
  roomId: string;
  phoneNumber: string;
  position: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ServerToClientEvents {
  'player-joined': (data: { phoneNumber: string; displayName: string }) => void;
  'move-made': (data: {
    board: Board;
    currentTurn: PlayerSymbol;
    moveNumber: number;
  }) => void;
  'game-over': (data: {
    winner: PlayerSymbol | 'draw' | null;
    board: Board;
  }) => void;
  'player-left': (data: { phoneNumber: string }) => void;
  'game-closed': (data: { closedBy: 'Host' | 'Partner' }) => void;
  'restart': (data: { board: Board; currentTurn: PlayerSymbol }) => void;
  'error': (data: { message: string }) => void;
  'game-state': (data: {
    board: Board;
    currentTurn: PlayerSymbol;
    players: string[];
    playerNames: Record<string, string>;
    status: string;
    winner: PlayerSymbol | 'draw' | null;
  }) => void;
}

export interface ClientToServerEvents {
  'join-room': (data: { roomId: string; phoneNumber: string; displayName: string }) => void;
  'make-move': (data: MakeMoveData) => void;
  'leave-room': (data: { roomId: string; phoneNumber: string }) => void;
  'restart-game': (data: { roomId: string; phoneNumber: string }) => void;
}