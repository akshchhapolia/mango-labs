import { v4 as uuidv4 } from 'uuid';
import { ActiveGame, Board, Room } from '../models/types';
import { TicTacToeEngine } from './ticTacToe';
import { insertRoom, getRoomById, updateRoomStatus, deleteRoomFromDb, cleanupExpiredRoomsFromDb } from './db';
import { saveGame, getGame, deleteGame } from './redis';

const ROOM_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

class RoomManager {
  async createRoom(hostPhone: string): Promise<{ room: Room; game: ActiveGame }> {
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

    await insertRoom(room);
    await saveGame(game);

    return { room, game };
  }

  async getRoom(roomId: string): Promise<Room | undefined> {
    const room = await getRoomById(roomId);
    if (!room) return undefined;

    if (Date.now() > room.expires_at.getTime()) {
      await updateRoomStatus(roomId, 'EXPIRED');
      room.status = 'EXPIRED';
      return room;
    }

    return room;
  }

  async getActiveGame(roomId: string): Promise<ActiveGame | undefined> {
    return getGame(roomId);
  }

  async joinRoom(
    roomId: string,
    phoneNumber: string,
    isReconnect: boolean = false
  ): Promise<{ room: Room; game: ActiveGame } | { error: string }> {
    const room = await getRoomById(roomId);
    if (!room) return { error: 'Room not found' };

    if (Date.now() > room.expires_at.getTime()) {
      await updateRoomStatus(roomId, 'EXPIRED');
      return { error: 'Room has expired' };
    }

    const game = await getGame(roomId);
    if (!game) return { error: 'Game not found' };

    if (isReconnect) {
      if (!game.players.includes(phoneNumber)) {
        return { error: 'Player not found in this game' };
      }
      return { room, game };
    }

    if (room.status !== 'WAITING') return { error: 'Game already in progress or finished' };

    game.players.push(phoneNumber);
    room.status = 'PLAYING';

    await updateRoomStatus(roomId, 'PLAYING');
    await saveGame(game);

    return { room, game };
  }

  async makeMove(
    roomId: string,
    phoneNumber: string,
    position: number
  ): Promise<{ game: ActiveGame } | { error: string }> {
    const game = await getGame(roomId);
    if (!game) return { error: 'Game not found' };

    const room = await getRoomById(roomId);
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
      await updateRoomStatus(roomId, 'FINISHED');
    } else {
      game.currentTurn = TicTacToeEngine.switchPlayer(game.currentTurn);
    }

    await saveGame(game);

    return { game };
  }

  async restartGame(roomId: string, phoneNumber: string): Promise<{ game: ActiveGame } | { error: string }> {
    const room = await getRoomById(roomId);
    if (!room) return { error: 'Room not found' };

    const game = await getGame(roomId);
    if (!game) return { error: 'Game not found' };

    const playerIndex = game.players.indexOf(phoneNumber);
    if (playerIndex === -1) return { error: 'Player not in this game' };

    game.board = TicTacToeEngine.createBoard();
    game.currentTurn = 'X';
    game.winner = null;
    room.status = 'PLAYING';

    await updateRoomStatus(roomId, 'PLAYING');
    await saveGame(game);

    return { game };
  }

  async removePlayer(roomId: string, phoneNumber: string): Promise<void> {
    const game = await getGame(roomId);
    if (!game) return;

    const playerIndex = game.players.indexOf(phoneNumber);
    if (playerIndex !== -1) {
      game.players.splice(playerIndex, 1);
    }

    await updateRoomStatus(roomId, 'FINISHED');
    await saveGame(game);
  }

  async deleteRoom(roomId: string): Promise<void> {
    await deleteRoomFromDb(roomId);
    await deleteGame(roomId);
  }

  async cleanupExpiredRooms(): Promise<void> {
    // Clean up from PostgreSQL
    await cleanupExpiredRoomsFromDb();
    // Redis keys have TTL, so they'll expire automatically
    // But we can still clean them up explicitly
    // (In production we'd scan for expired keys, but for MVP this is fine)
  }
}

export const roomManager = new RoomManager();