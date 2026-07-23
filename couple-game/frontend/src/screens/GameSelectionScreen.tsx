interface GameSelectionScreenProps {
  onCreateGame: () => void;
}

export function GameSelectionScreen({ onCreateGame }: GameSelectionScreenProps) {
  return (
    <div className="screen game-selection-screen">
      <div className="game-selection-content">
        <h1 className="title">Choose a Game</h1>
        <p className="subtitle">Select a game to play with your partner</p>

        <div className="game-cards">
          <button className="game-card" onClick={onCreateGame}>
            <div className="game-card-icon">❌⭕</div>
            <div className="game-card-title">Tic Tac Toe</div>
            <div className="game-card-desc">Classic 3×3 fun</div>
          </button>
        </div>
      </div>
    </div>
  );
}