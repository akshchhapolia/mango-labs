import { useEffect, useState } from 'react';
import { getSocket } from '../socket';

interface GameScreenProps {
  roomId: string;
  phoneNumber: string;
  isHost: boolean;
  onGameOver: (winner: string | null, draw: boolean) => void;
  onExit: () => void;
}

interface GameState {
  board: string[];
  currentTurn: 'X' | 'O';
  players: string[];
  winner: string | null;
  hostPhone: string;
}

export function GameScreen({ roomId, phoneNumber, isHost, onGameOver, onExit }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [mySymbol, setMySymbol] = useState<'X' | 'O' | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerLeft, setPlayerLeft] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const handleGameStarted = (data: { gameState: GameState }) => {
      const gs = data.gameState;
      setGameState(gs);
      const playerIndex = gs.players.indexOf(phoneNumber);
      const symbol = playerIndex === 0 ? 'X' : 'O';
      setMySymbol(symbol);
      setIsMyTurn(gs.currentTurn === symbol);
      setPlayerLeft(false);
    };

    const handleMoveMade = (data: { position: number; symbol: string; board: string[]; currentTurn: 'X' | 'O' }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, board: data.board, currentTurn: data.currentTurn };
        // Re-join the room if not already
        return updated;
      });
      setIsMyTurn(data.currentTurn === mySymbol);
    };

    const handleGameOver = (data: { winner: string | null; winnerPhone: string | null; draw?: boolean }) => {
      const isDraw = data.draw || false;
      onGameOver(data.winner, isDraw);
    };

    const handleGameRestarted = (data: { gameState: GameState }) => {
      const gs = data.gameState;
      setGameState(gs);
      const playerIndex = gs.players.indexOf(phoneNumber);
      const symbol = playerIndex === 0 ? 'X' : 'O';
      setMySymbol(symbol);
      setIsMyTurn(true);
      setPlayerLeft(false);
      setError(null);
    };

    const handlePlayerLeft = () => {
      setPlayerLeft(true);
    };

    const handleErrorMessage = (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    };

    socket.on('game-started', handleGameStarted);
    socket.on('move-made', handleMoveMade);
    socket.on('game-over', handleGameOver);
    socket.on('game-restarted', handleGameRestarted);
    socket.on('player-left', handlePlayerLeft);
    socket.on('error-message', handleErrorMessage);

    // If we already joined on the waiting room, the game-started will fire
    // But if we navigated here directly, we may need to re-join
    if (!gameState) {
      socket.emit('join-room', { roomId, phoneNumber });
    }

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('move-made', handleMoveMade);
      socket.off('game-over', handleGameOver);
      socket.off('game-restarted', handleGameRestarted);
      socket.off('player-left', handlePlayerLeft);
      socket.off('error-message', handleErrorMessage);
    };
  }, [roomId, phoneNumber, onGameOver, mySymbol]);

  const handleCellClick = (index: number) => {
    if (!isMyTurn || gameState?.winner) return;
    if (gameState?.board[index]) return;

    const socket = getSocket();
    socket.emit('make-move', { roomId, position: index });
  };

  const handleRestart = () => {
    const socket = getSocket();
    socket.emit('restart-game', { roomId });
  };

  const handleLeave = () => {
    const socket = getSocket();
    socket.emit('leave-room', { roomId });
    onExit();
  };

  const statusText = gameState?.winner
    ? `${gameState.winner === 'draw' ? "It's a Draw!" : `${gameState.winner} Wins!`}`
    : isMyTurn
    ? 'Your turn'
    : "Opponent's turn";

  return (
    <div className="screen game-screen">
      <div className="game-content">
        <div className="game-header">
          <div className="player-info">
            <span className="player-symbol">{mySymbol}</span>
            <span className="player-label">You</span>
          </div>
          <div className="game-status">
            <p className="status-text">{statusText}</p>
          </div>
          <div className="player-info opponent">
            <span className="player-symbol">{mySymbol === 'X' ? 'O' : 'X'}</span>
            <span className="player-label">Opponent</span>
          </div>
        </div>

        {playerLeft && (
          <div className="player-left-banner">
            Opponent left the game
          </div>
        )}

        {error && (
          <div className="error-banner">{error}</div>
        )}

        <div className="board">
          {gameState?.board.map((cell, index) => (
            <button
              key={index}
              className={`cell ${cell ? 'filled' : ''} ${isMyTurn && !cell && !gameState?.winner ? 'clickable' : ''}`}
              onClick={() => handleCellClick(index)}
              disabled={!!cell || !isMyTurn || !!gameState?.winner}
            >
              {cell && <span className={`cell-symbol ${cell === 'X' ? 'x' : 'o'}`}>{cell}</span>}
            </button>
          ))}
        </div>

        <div className="game-actions">
          <button className="btn btn-secondary" onClick={handleRestart}>
            Play Again
          </button>
          <button className="btn btn-link" onClick={handleLeave}>
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}