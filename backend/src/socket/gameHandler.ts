import { Server, Socket } from 'socket.io';
import { roomManager } from '../services/roomManager';
import { MakeMoveData } from '../models/types';

export function setupGameHandlers(io: Server, socket: Socket): void {
  socket.on('join-room', (data: { roomId: string; phoneNumber: string }) => {
    const { roomId, phoneNumber } = data;

    // Check if this is a reconnection (player already in the game)
    const existingGame = roomManager.getActiveGame(roomId);
    const isReconnect = existingGame?.players.includes(phoneNumber) ?? false;

    const result = roomManager.joinRoom(roomId, phoneNumber, isReconnect);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.phoneNumber = phoneNumber;

    if (!isReconnect) {
      // New player joining — notify the host
      socket.to(roomId).emit('player-joined', { phoneNumber });
    }

    // Send current game state to the (re)joining player
    const game = roomManager.getActiveGame(roomId);
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

  socket.on('make-move', (data: MakeMoveData) => {
    const { roomId, phoneNumber, position } = data;

    const result = roomManager.makeMove(roomId, phoneNumber, position);
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    const game = result.game;
    const moveNumber = game.board.filter((cell) => cell !== null).length;

    // Broadcast the move to everyone in the room
    io.to(roomId).emit('move-made', {
      board: game.board,
      currentTurn: game.currentTurn,
      moveNumber,
    });

    // If game is over, emit game-over event
    if (game.winner) {
      io.to(roomId).emit('game-over', {
        winner: game.winner,
        board: game.board,
      });
    }
  });

  socket.on('restart-game', (data: { roomId: string; phoneNumber: string }) => {
    const { roomId, phoneNumber } = data;

    const result = roomManager.restartGame(roomId, phoneNumber);
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

  socket.on('leave-room', (data: { roomId: string; phoneNumber: string }) => {
    const { roomId, phoneNumber } = data;

    roomManager.removePlayer(roomId, phoneNumber);
    socket.leave(roomId);

    socket.to(roomId).emit('player-left', { phoneNumber });

    // Clean up empty rooms after a delay
    setTimeout(() => {
      roomManager.deleteRoom(roomId);
    }, 5000);
  });

  socket.on('disconnect', () => {
    const { roomId, phoneNumber } = socket.data;
    if (!roomId || !phoneNumber) return;

    // Give the player a grace period to reconnect before removing them
    const game = roomManager.getActiveGame(roomId);
    if (!game) return;

    // Check if any other socket in this room is still connected
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    const hasOtherSocket = roomSockets && roomSockets.size > 0;

    if (!hasOtherSocket) {
      // No sockets left in the room — wait a bit for reconnection
      const disconnectTimeout = setTimeout(() => {
        // Check if the player reconnected (socket data re-set by join-room)
        const stillEmpty = io.sockets.adapter.rooms.get(roomId);
        if (!stillEmpty || stillEmpty.size === 0) {
          roomManager.removePlayer(roomId, phoneNumber);
          socket.to(roomId).emit('player-left', { phoneNumber });
          setTimeout(() => roomManager.deleteRoom(roomId), 5000);
        }
      }, 15000);

      // Store the timeout so we can cancel it if the player reconnects
      socket.data.disconnectTimeout = disconnectTimeout;
    } else {
      // Another socket is still in the room (other player), just notify them
      socket.to(roomId).emit('player-left', { phoneNumber });
    }
  });
}