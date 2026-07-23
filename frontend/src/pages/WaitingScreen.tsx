interface WaitingScreenProps {
  inviteLink: string;
  onCopy: () => void;
  onExit: () => void;
}

export default function WaitingScreen({ inviteLink, onCopy, onExit }: WaitingScreenProps) {
  return (
    <div className="screen waiting-screen">
      <div className="card">
        <div className="waiting-content">
          <div className="spinner" />
          <h2>Waiting for Partner...</h2>
          <p>Share the invite link below with your partner</p>

          <div className="invite-link-box">
            <input type="text" readOnly value={inviteLink} className="invite-input" />
            <button className="btn btn-accent" onClick={onCopy}>
              Copy
            </button>
          </div>

          <p className="hint-text">
            Your partner can also join with the Room ID: <strong>{inviteLink.split('/').pop()}</strong>
          </p>

          <button className="btn btn-secondary" onClick={onExit} style={{ marginTop: '1rem' }}>
            Cancel & Exit
          </button>
        </div>
      </div>
    </div>
  );
}