export type PlayerSymbol = 'X' | 'O';
export type Board = (PlayerSymbol | null)[];

export interface RoomData {
  roomId: string;
  inviteLink: string;
  status: string;
}

export interface GameState {
  board: Board;
  currentTurn: PlayerSymbol;
  players: string[];
  status: string;
  winner: PlayerSymbol | 'draw' | null;
}

export type Screen = 'home' | 'waiting' | 'game' | 'result';