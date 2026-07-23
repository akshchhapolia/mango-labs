import { Server, Socket } from 'socket.io';
import { getRoom, joinRoom, finishRoom, resetRoom } from '../services/roomService';
import {
  saveGameState,
  getGameState,
  deleteGameState,
  addPlayerToRoom,
  getRoomPlayers,
  removePlayerFromRoom,
  ActiveGame,
} from '../services/redis';
import {
  createBoard,
  isValidMove,
  isPlayerTurn,
  getPlayerSymbol,
  makeMove,
  checkWinner,
  checkDraw,
  getNextTurn,
} from '../services/gameEngine';

// Track which socket belongs to which room and player
const socketRoomMap = new Map<string, { roomId: string; phoneNumber: string }>();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join-room', async ({ roomId, phoneNumber }: { roomId: string; phoneNumber: string }) => {
      try {
        const room = await getRoom(roomId);
        if (!room) {
          socket.emit('error-message', { message: 'Room not found or expired' });
          return;
        }

        // Store mapping
        socketRoomMap.set(socket.id, { roomId, phoneNumber });
        socket.join(roomId);

        // Add player to Redis tracking
        await addPlayerToRoom(roomId, phoneNumber);

        const players = await getRoomPlayers(roomId);
        const isHost = phoneNumber === room.host_phone;

        // Notify the joining player
        socket.emit('room-joined', {
          roomId,
          hostPhone: room.host_phone,
          isHost,
          players,
          status: room.status,
        });

        // If there are 2 players, start the game
        if (players.length >= 2) {
          await joinRoom(roomId);

          const gameState: ActiveGame = {
            roomId,
            players: [room.host_phone, players.find((p) => p !== room.host_phone)!],
            board: createBoard(),
            currentTurn: 'X',
            winner: null,
            hostPhone: room.host_phone,
          };

          await saveGameState(gameState);

          // Notify all players in the room that the game has started
          io.to(roomId).emit('game-started', {
            gameState: {
              ...gameState,
              board: gameState.board,
            },
          });
        } else {
          // Only one player so far, broadcast that someone joined
          socket.to(roomId).emit('player-joined', {
            phoneNumber,
            players,
          });
        }
      } catch (err) {
        console.error('Error in join-room:', err);
        socket.emit('error-message', { message: 'Failed to join room' });
      }
    });

    socket.on('make-move', async ({ roomId, position }: { roomId: string; position: number }) => {
      try {
        const mapping = socketRoomMap.get(socket.id);
        if (!mapping || mapping.roomId !== roomId) {
          socket.emit('error-message', { message: 'Not in this room' });
          return;
        }

        const gameState = await getGameState(roomId);
        if (!gameState) {
          socket.emit('error-message', { message: 'Game not found' });
          return;
        }

        if (gameState.winner) {
          socket.emit('error-message', { message: 'Game is already over' });
          return;
        }

        // Validate move
        if (!isValidMove(gameState.board, position)) {
          socket.emit('error-message', { message: 'Invalid move' });
          return;
        }

        if (!isPlayerTurn(
          gameState.currentTurn,
          mapping.phoneNumber,
          gameState.players,
          gameState.hostPhone
        )) {
          socket.emit('error-message', { message: 'Not your turn' });
          return;
        }

        const symbol = getPlayerSymbol(mapping.phoneNumber, gameState.players, gameState.hostPhone);
        const newBoard = makeMove(gameState.board, position, symbol);
        const winner = checkWinner(newBoard);
        const draw = !winner && checkDraw(newBoard);

        const updatedGame: ActiveGame = {
          ...gameState,
          board: newBoard,
          currentTurn: winner || draw ? gameState.currentTurn : getNextTurn(gameState.currentTurn),
          winner: winner || (draw ? 'draw' : null),
        };

        await saveGameState(updatedGame);

        // Broadcast the move to all players in the room
        io.to(roomId).emit('move-made', {
          position,
          symbol,
          board: newBoard,
          currentTurn: updatedGame.currentTurn,
        });

        if (winner) {
          io.to(roomId).emit('game-over', {
            winner,
            winnerPhone: mapping.phoneNumber,
          });
          await finishRoom(roomId);
        } else if (draw) {
          io.to(roomId).emit('game-over', {
            winner: null,
            winnerPhone: null,
            draw: true,
          });
          await finishRoom(roomId);
        }
      } catch (err) {
        console.error('Error in make-move:', err);
        socket.emit('error-message', { message: 'Failed to make move' });
      }
    });

    socket.on('restart-game', async ({ roomId }: { roomId: string }) => {
      try {
        const mapping = socketRoomMap.get(socket.id);
        if (!mapping || mapping.roomId !== roomId) return;

        // Reset the room in DB
        await resetRoom(roomId);

        const gameState = await getGameState(roomId);
        if (gameState) {
          const newGameState: ActiveGame = {
            ...gameState,
            board: createBoard(),
            currentTurn: 'X',
            winner: null,
          };
          await saveGameState(newGameState);

          io.to(roomId).emit('game-restarted', {
            gameState: newGameState,
          });
        }
      } catch (err) {
        console.error('Error in restart-game:', err);
        socket.emit('error-message', { message: 'Failed to restart game' });
      }
    });

    socket.on('leave-room', async ({ roomId }: { roomId: string }) => {
      try {
        const mapping = socketRoomMap.get(socket.id);
        if (!mapping) return;

        socket.to(roomId).emit('player-left', {
          phoneNumber: mapping.phoneNumber,
        });

        await removePlayerFromRoom(roomId, mapping.phoneNumber);
        socket.leave(roomId);
        socketRoomMap.delete(socket.id);
      } catch (err) {
        console.error('Error in leave-room:', err);
      }
    });

    socket.on('disconnect', async () => {
      const mapping = socketRoomMap.get(socket.id);
      if (mapping) {
        socket.to(mapping.roomId).emit('player-left', {
          phoneNumber: mapping.phoneNumber,
        });
        await removePlayerFromRoom(mapping.roomId, mapping.phoneNumber);
        socketRoomMap.delete(socket.id);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}