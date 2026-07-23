import { Board as BoardType } from '../types';
import Cell from './Cell';

interface BoardProps {
  board: BoardType;
  onCellClick: (index: number) => void;
  disabled: boolean;
  winningCombo: number[] | null;
}

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export default function Board({ board, onCellClick, disabled, winningCombo }: BoardProps) {
  const comboToCheck = winningCombo ?? [];

  return (
    <div className="board">
      {board.map((cell, i) => (
        <Cell
          key={i}
          value={cell}
          index={i}
          onClick={onCellClick}
          disabled={disabled}
          isWinningCell={comboToCheck.includes(i)}
        />
      ))}
    </div>
  );
}