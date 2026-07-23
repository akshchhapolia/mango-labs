import { Server, Socket } from 'socket.io';
import { roomManager } from '../services/roomManager';
import { MakeMoveData } from '../models/types';

export function setupGameHandlers(io: Server, socket: Socket): void {
  socket.on('join-room', async (data: { roomId: string; phoneNumber: string }) => {
    const { roomId, phoneNumber } = data;

    const existingGame = await roomManager.getActiveGame(roomId);
    const isReconnect = existingGame?.players.includes(phoneNumber) ?? false;

    const result = await roomManager.joinRoom(roomId, phoneNumber, isReconnect);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.phoneNumber = phoneNumber;

    if (!isReconnect) {
      socket.to(roomId).emit('player-joined', { phoneNumber });
    }

    const game = await roomManager.getActiveGame(roomId);
    if (game) {
      socket.emit('game-state', {
        board: game.board,
        currentTurn: game.currentTurn,
        players: game.players,
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

  socket.on('leave-room', async (data: { roomId: string; phoneNumber: string }) => {
    const { roomId, phoneNumber } = data;

    await roomManager.removePlayer(roomId, phoneNumber);
    socket.leave(roomId);

    socket.to(roomId).emit('player-left', { phoneNumber });

    setTimeout(() => {
      roomManager.deleteRoom(roomId);
    }, 5000);
  });

  socket.on('disconnect', () => {
    const { roomId, phoneNumber } = socket.data;
    if (!roomId || !phoneNumber) return;

    // Give the player a grace period to reconnect before removing them
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    const hasOtherSocket = roomSockets && roomSockets.size > 0;

    if (!hasOtherSocket) {
      const disconnectTimeout = setTimeout(async () => {
        const stillEmpty = io.sockets.adapter.rooms.get(roomId);
        if (!stillEmpty || stillEmpty.size === 0) {
          await roomManager.removePlayer(roomId, phoneNumber);
          socket.to(roomId).emit('player-left', { phoneNumber });
          setTimeout(() => roomManager.deleteRoom(roomId), 5000);
        }
      }, 15000);

      socket.data.disconnectTimeout = disconnectTimeout;
    } else {
      socket.to(roomId).emit('player-left', { phoneNumber });
    }
  });
}