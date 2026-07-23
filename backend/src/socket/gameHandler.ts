import { Server, Socket } from 'socket.io';
import { roomManager } from '../services/roomManager';
import { MakeMoveData } from '../models/types';

export function setupGameHandlers(io: Server, socket: Socket): void {
  socket.on('join-room', async (data: { roomId: string; phoneNumber: string; displayName: string }) => {
    const { roomId, phoneNumber, displayName } = data;

    const existingGame = await roomManager.getActiveGame(roomId);
    const isReconnect = existingGame?.players.includes(phoneNumber) ?? false;

    const result = await roomManager.joinRoom(roomId, phoneNumber, displayName, isReconnect);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.phoneNumber = phoneNumber;

    if (!isReconnect) {
      socket.to(roomId).emit('player-joined', { phoneNumber, displayName });
    }

    const game = await roomManager.getActiveGame(roomId);
    if (game) {
      io.to(roomId).emit('game-state', {
        board: game.board,
        currentTurn: game.currentTurn,
        players: game.players,
        playerNames: game.playerNames || {},
        status: game.players.length === 2 ? 'PLAYING' : 'WAITING',
        winner: game.winner,
      });
    }
  });

  socket.on('make-move', async (data: MakeMoveData) => {
    const { roomId, phoneNumber, position } = data;

    const result = await roomManager.makeMove(roomId, phoneNumber, position);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    const game = result.game;
    const moveNumber = game.board.filter((cell) => cell !== null).length;

    io.to(roomId).emit('move-made', {
      board: game.board,
      currentTurn: game.currentTurn,
      moveNumber,
    });

    if (game.winner) {
      io.to(roomId).emit('game-over', {
        winner: game.winner,
        board: game.board,
      });
    }
  });

  socket.on('restart-game', async (data: { roomId: string; phoneNumber: string }) => {
    const { roomId, phoneNumber } = data;

    const result = await roomManager.restartGame(roomId, phoneNumber);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    const game = result.game;
    io.to(roomId).emit('restart', {
      board: game.board,
      currentTurn: game.currentTurn,
    });
  });

  socket.on('leave-room', async (
    data: { roomId: string; phoneNumber: string },
    acknowledge?: () => void
  ) => {
    const { roomId, phoneNumber } = data;
    const game = await roomManager.getActiveGame(roomId);
    const closedBy = game?.players[0] === phoneNumber ? 'Host' : 'Partner';

    // Notify the remaining player before any database work or disconnection.
    socket.to(roomId).emit('game-closed', { closedBy });
    socket.data.didLeave = true;
    acknowledge?.();
    socket.leave(roomId);

    await roomManager.deleteRoom(roomId);
  });

  socket.on('disconnect', () => {
    const { roomId, phoneNumber } = socket.data;
    if (!roomId || !phoneNumber || socket.data.didLeave) return;

    // Allow refreshes and short network interruptions without ending the game.
    setTimeout(async () => {
      const roomSocketIds = io.sockets.adapter.rooms.get(roomId) ?? new Set<string>();
      const hasReconnected = [...roomSocketIds].some((socketId) =>
        io.sockets.sockets.get(socketId)?.data.phoneNumber === phoneNumber
      );

      if (!hasReconnected) {
        await roomManager.removePlayer(roomId, phoneNumber);
        io.to(roomId).emit('player-left', { phoneNumber });
        setTimeout(() => roomManager.deleteRoom(roomId), 5000);
      }
    }, 15000);
  });
}