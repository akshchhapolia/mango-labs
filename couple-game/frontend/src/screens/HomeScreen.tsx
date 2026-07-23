import { useState } from 'react';

interface HomeScreenProps {
  onPhoneSubmit: (phone: string) => void;
  onJoinRoom: (roomId: string) => void;
}

export function HomeScreen({ onPhoneSubmit, onJoinRoom }: HomeScreenProps) {
  const [phone, setPhone] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [mode, setMode] = useState<'phone' | 'join'>('phone');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      onPhoneSubmit(phone.trim());
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      onJoinRoom(joinRoomId.trim());
    }
  };

  return (
    <div className="screen home-screen">
      <div className="home-content">
        <div className="logo">🎮</div>
        <h1 className="title">Couple Games</h1>
        <p className="subtitle">Play fun games together, anywhere!</p>

        {mode === 'phone' ? (
          <form onSubmit={handleSubmit} className="form">
            <label className="label">Enter your phone number</label>
            <input
              type="tel"
              className="input"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!phone.trim()}>
              Let's Play
            </button>
            <button type="button" className="btn btn-link" onClick={() => setMode('join')}>
              Have an invite code? Join a game
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="form">
            <label className="label">Enter room code</label>
            <input
              type="text"
              className="input"
              placeholder="Paste room code or link"
              value={joinRoomId}
              onChange={(e) => {
                // Extract room ID from full URL if pasted
                const val = e.target.value;
                const match = val.match(/\/join\/([a-f0-9-]+)/i);
                setJoinRoomId(match ? match[1] : val);
              }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!joinRoomId.trim()}>
              Join Game
            </button>
            <button type="button" className="btn btn-link" onClick={() => setMode('phone')}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}