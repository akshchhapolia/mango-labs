import { useState } from 'react';

interface HomeScreenProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  pendingRoomId: string | null;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  error: string;
  setError: (err: string) => void;
  loading: boolean;
}

export default function HomeScreen({
  displayName,
  setDisplayName,
  pendingRoomId,
  phoneNumber,
  setPhoneNumber,
  onCreateRoom,
  onJoinRoom,
  error,
  setError,
  loading,
}: HomeScreenProps) {
  const [joinId, setJoinId] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const handleJoin = () => {
    if (!joinId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    onJoinRoom(joinId.trim());
  };

  return (
    <div className="screen home-screen">
      <div className="logo-container">
        <div className="logo-heart">♥</div>
        <h1 className="app-title">Couple Games</h1>
        <p className="app-subtitle">Play Tic Tac Toe with your partner</p>
      </div>

      <div className="card">
        {pendingRoomId && <p className="invite-message">You've been invited to play!</p>}

        <label className="input-label">Your Name</label>
        <input
          type="text"
          className="phone-input"
          placeholder="Enter your name"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setError('');
          }}
        />

        {!pendingRoomId && (
          <>
            <label className="input-label input-label-spaced">Your Phone Number</label>
            <input
              type="tel"
              className="phone-input"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setError('');
              }}
            />
          </>
        )}

        {error && <p className="error-text">{error}</p>}

        <div className="button-group">
          <button className="btn btn-primary" onClick={onCreateRoom} disabled={loading}>
            {loading ? (pendingRoomId ? 'Joining...' : 'Creating...') : (pendingRoomId ? 'Join Game' : 'Create a Game')}
          </button>

          {!pendingRoomId && <button className="btn btn-secondary" onClick={() => setShowJoin(!showJoin)} disabled={loading}>
            {showJoin ? 'Cancel' : 'Join a Game'}
          </button>}

          {!pendingRoomId && showJoin && (
            <div className="join-input-group">
              <input
                type="text"
                className="room-input"
                placeholder="Enter Room ID"
                value={joinId}
                onChange={(e) => {
                  setJoinId(e.target.value);
                  setError('');
                }}
              />
              <button className="btn btn-accent" onClick={handleJoin} disabled={loading}>
                {loading ? 'Joining...' : 'Join'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}