import { v4 as uuidv4 } from 'uuid';
import { ActiveGame, Board, Room } from '../models/types';
import { TicTacToeEngine } from './ticTacToe';

const ROOM_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private activeGames: Map<string, ActiveGame> = new Map();

  createRoom(hostPhone: string): { room: Room; game: ActiveGame } {
    const roomId = uuidv4().slice(0, 8);
    const now = new Date();

    const room: Room = {
      id: roomId,
      game: 'tic-tac-toe',
      host_phone: hostPhone,
      status: 'WAITING',
      created_at: now,
      expires_at: new Date(now.getTime() + ROOM_EXPIRY_MS),
    };

    const game: ActiveGame = {
      roomId,
      players: [hostPhone],
      board: TicTacToeEngine.createBoard(),
      currentTurn: 'X',
      winner: null,
    };

    this.rooms.set(roomId, room);
    this.activeGames.set(roomId, game);

    return { room, game };
  }

  getRoom(roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    if (Date.now() > room.expires_at.getTime()) {
      room.status = 'EXPIRED';
      return room;
    }

    return room;
  }

  getActiveGame(roomId: string): ActiveGame | undefined {
    return this.activeGames.get(roomId);
  }

  joinRoom(roomId: string, phoneNumber: string, isReconnect: boolean = false): { room: Room; game: ActiveGame } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    if (Date.now() > room.expires_at.getTime()) {
      room.status = 'EXPIRED';
      return { error: 'Room has expired' };
    }

    const game = this.activeGames.get(roomId);
    if (!game) return { error: 'Game not found' };

    if (isReconnect) {
      // For reconnection, verify the player was already in this game
      if (!game.players.includes(phoneNumber)) {
        return { error: 'Player not found in this game' };
      }
      return { room, game };
    }

    if (room.status !== 'WAITING') return { error: 'Game already in progress or finished' };

    game.players.push(phoneNumber);
    room.status = 'PLAYING';

    return { room, game };
  }

  makeMove(roomId: string, phoneNumber: string, position: number): { game: ActiveGame } | { error: string } {
    const game = this.activeGames.get(roomId);
    if (!game) return { error: 'Game not found' };

    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'PLAYING') return { error: 'Game is not active' };

    const playerIndex = game.players.indexOf(phoneNumber);
    if (playerIndex === -1) return { error: 'Player not in this game' };

    const expectedSymbol: 'X' | 'O' = playerIndex === 0 ? 'X' : 'O';
    if (game.currentTurn !== expectedSymbol) return { error: 'Not your turn' };

    if (!TicTacToeEngine.isValidMove(game.board, position)) return { error: 'Invalid move' };

    game.board = TicTacToeEngine.makeMove(game.board, position, expectedSymbol);

    const winner = TicTacToeEngine.checkWinner(game.board);
    game.winner = winner;

    if (winner) {
      room.status = 'FINISHED';
    } else {
      game.currentTurn = TicTacToeEngine.switchPlayer(game.currentTurn);
    }

    return { game };
  }

  restartGame(roomId: string, phoneNumber: string): { game: ActiveGame } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    const game = this.activeGames.get(roomId);
    if (!game) return { error: 'Game not found' };

    const playerIndex = game.players.indexOf(phoneNumber);
    if (playerIndex === -1) return { error: 'Player not in this game' };

    game.board = TicTacToeEngine.createBoard();
    game.currentTurn = 'X';
    game.winner = null;
    room.status = 'PLAYING';

    return { game };
  }

  removePlayer(roomId: string, phoneNumber: string): void {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    const playerIndex = game.players.indexOf(phoneNumber);
    if (playerIndex !== -1) {
      game.players.splice(playerIndex, 1);
    }

    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'FINISHED';
    }
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.activeGames.delete(roomId);
  }

  cleanupExpiredRooms(): void {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (now > room.expires_at.getTime() || room.status === 'FINISHED') {
        this.rooms.delete(roomId);
        this.activeGames.delete(roomId);
      }
    }
  }
}

export const roomManager = new RoomManager();