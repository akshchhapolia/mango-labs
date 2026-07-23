import { PlayerSymbol } from '../types';

interface CellProps {
  value: PlayerSymbol | null;
  index: number;
  onClick: (index: number) => void;
  disabled: boolean;
  isWinningCell: boolean;
}

const symbolColors: Record<string, string> = {
  X: '#ff6b6b',
  O: '#4ecdc4',
};

export default function Cell({ value, index, onClick, disabled, isWinningCell }: CellProps) {
  return (
    <button
      className={`cell ${value ? 'filled' : ''} ${isWinningCell ? 'winning' : ''}`}
      onClick={() => onClick(index)}
      disabled={disabled || value !== null}
      style={{ '--symbol-color': value ? symbolColors[value] : 'transparent' } as React.CSSProperties}
    >
      {value && (
        <span className={`symbol ${value === 'X' ? 'symbol-x' : 'symbol-o'}`}>
          {value}
        </span>
      )}
    </button>
  );
}