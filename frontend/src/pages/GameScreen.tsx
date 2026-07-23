import Board from '../components/Board';
import { Board as BoardType, PlayerSymbol } from '../types';

interface GameScreenProps {
  board: BoardType;
  currentTurn: PlayerSymbol;
  playerSymbol: PlayerSymbol;
  isHost: boolean;
  phoneNumber: string;
  players: string[];
  playerNames: Record<string, string>;
  onCellClick: (index: number) => void;
  onExit: () => void;
}

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function getWinningCombo(board: BoardType): number[] | null {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return combo;
    }
  }
  return null;
}

export default function GameScreen({
  board,
  currentTurn,
  playerSymbol,
  isHost,
  phoneNumber,
  players,
  playerNames,
  onCellClick,
  onExit,
}: GameScreenProps) {
  const isMyTurn = currentTurn === playerSymbol;
  const winningCombo = getWinningCombo(board);
  const hostName = playerNames[players[0]] || (isHost ? 'You' : 'Partner');
  const partnerName = playerNames[players[1]] || (isHost ? 'Partner' : 'You');

  return (
    <div className="screen game-screen">
      <div className="game-header">
        <div className="player-indicator">
          <span className="symbol-badge" data-symbol="X">X</span>
          <span className="player-label">{players[0] === phoneNumber ? 'You' : hostName}</span>
        </div>
        <div className="turn-indicator">
          {isMyTurn ? (
            <span className="your-turn">Your Turn</span>
          ) : (
            <span className="their-turn">Partner's Turn</span>
          )}
        </div>
        <div className="player-indicator">
          <span className="symbol-badge" data-symbol="O">O</span>
          <span className="player-label">{players[1] === phoneNumber ? 'You' : partnerName}</span>
        </div>
      </div>

      <Board
        board={board}
        onCellClick={onCellClick}
        disabled={!isMyTurn}
        winningCombo={winningCombo}
      />

      <button className="btn btn-secondary exit-btn" onClick={onExit}>
        Leave Game
      </button>
    </div>
  );
}