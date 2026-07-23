interface ResultScreenProps {
  winner: string | null;
  draw: boolean;
  phoneNumber: string;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function ResultScreen({ winner, draw, phoneNumber, onPlayAgain, onExit }: ResultScreenProps) {
  const isWinner = winner === phoneNumber;

  return (
    <div className="screen result-screen">
      <div className="result-content">
        {draw ? (
          <>
            <div className="result-icon">🤝</div>
            <h1 className="title">It's a Draw!</h1>
            <p className="subtitle">Well played! You both are evenly matched.</p>
          </>
        ) : isWinner ? (
          <>
            <div className="result-icon">🎉</div>
            <h1 className="title">You Win!</h1>
            <p className="subtitle">Congratulations! You crushed it!</p>
          </>
        ) : (
          <>
            <div className="result-icon">😅</div>
            <h1 className="title">You Lost</h1>
            <p className="subtitle">Better luck next time!</p>
          </>
        )}

        <div className="result-actions">
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="btn btn-link" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}