interface ClosedScreenProps {
  closedByName: string;
  onReturnHome: () => void;
}

export default function ClosedScreen({ closedByName, onReturnHome }: ClosedScreenProps) {
  return (
    <div className="screen result-screen">
      <div className="result-card">
        <div className="result-emoji">👋</div>
        <h2 className="result-text">Game Closed</h2>
        <p className="closed-message">{closedByName} closed the game.</p>
        <button className="btn btn-primary" onClick={onReturnHome}>
          Return Home
        </button>
      </div>
    </div>
  );
}
