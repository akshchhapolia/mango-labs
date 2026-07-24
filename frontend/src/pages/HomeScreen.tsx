import { useState } from 'react';

interface HomeScreenProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  pendingRoomId: string | null;
  role: 'host' | 'partner';
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
  role,
  phoneNumber,
  setPhoneNumber,
  onCreateRoom,
  onJoinRoom,
  error,
  setError,
  loading,
}: HomeScreenProps) {
  const [joinId, setJoinId] = useState('');
  const [showJoin, setShowJoin] = useState(role === 'partner' && !pendingRoomId);

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
        {role === 'partner' && (
          <p className="invite-message">{pendingRoomId ? "You've been invited to play!" : 'Join a game as Partner'}</p>
        )}

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

        {role === 'host' && (
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
          {role === 'host' && (
            <button className="btn btn-primary" onClick={onCreateRoom} disabled={loading}>
              {loading ? 'Creating...' : 'Create a Game'}
            </button>
          )}

          {role === 'partner' && pendingRoomId && (
            <button className="btn btn-primary" onClick={onCreateRoom} disabled={loading}>
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          )}

          {role === 'host' && <button className="btn btn-secondary" onClick={() => setShowJoin(!showJoin)} disabled={loading}>
            {showJoin ? 'Cancel' : 'Join a Game'}
          </button>}

          {showJoin && !pendingRoomId && (
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