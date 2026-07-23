import Board from '../components/Board';
import { Board as BoardType, PlayerSymbol } from '../types';
import { getWinningCombo } from './GameScreen';

interface ResultScreenProps {
  board: BoardType;
  winner: PlayerSymbol | 'draw' | null;
  isHost: boolean;
  onRestart: () => void;
  onExit: () => void;
}

export default function ResultScreen({
  board,
  winner,
  isHost,
  onRestart,
  onExit,
}: ResultScreenProps) {
  const winningCombo = getWinningCombo(board);
  let resultText: string;
  let resultEmoji: string;

  if (winner === 'draw') {
    resultText = "It's a Draw!";
    resultEmoji = '🤝';
  } else if (winner === 'X') {
    resultText = isHost ? 'You Win!' : 'Partner Wins!';
    resultEmoji = '🎉';
  } else {
    resultText = isHost ? 'Partner Wins!' : 'You Win!';
    resultEmoji = '🎉';
  }

  return (
    <div className="screen result-screen">
      <div className="result-card">
        <div className="result-emoji">{resultEmoji}</div>
        <h2 className="result-text">{resultText}</h2>

        <div className="final-board">
          <Board
            board={board}
            onCellClick={() => {}}
            disabled={true}
            winningCombo={winningCombo}
          />
        </div>

        <div className="result-actions">
          <button className="btn btn-primary" onClick={onRestart}>
            Play Again
          </button>
          <button className="btn btn-secondary" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}