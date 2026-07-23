import { useEffect, useState } from 'react';
import { getSocket } from '../socket';

interface WaitingRoomScreenProps {
  roomId: string;
  inviteLink: string;
  isHost: boolean;
  onGameStart: () => void;
  onExit: () => void;
}

export function WaitingRoomScreen({ roomId, inviteLink, isHost, onGameStart, onExit }: WaitingRoomScreenProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const handleGameStarted = () => {
      onGameStart();
    };

    const handlePlayerJoined = () => {
      // Just a UI update — game hasn't started yet
    };

    socket.on('game-started', handleGameStarted);
    socket.on('player-joined', handlePlayerJoined);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('player-joined', handlePlayerJoined);
    };
  }, [onGameStart]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.querySelector('.invite-link-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Play Tic Tac Toe with me!',
          text: 'Let\'s play Tic Tac Toe on Couple Games!',
          url: inviteLink,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="screen waiting-room-screen">
      <div className="waiting-room-content">
        <h1 className="title">Waiting Room</h1>

        {isHost ? (
          <>
            <p className="subtitle">Share this link with your partner to play!</p>

            <div className="invite-link-box">
              <input
                className="input invite-link-input"
                value={inviteLink}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <div className="invite-actions">
                <button className="btn btn-secondary" onClick={handleCopyLink}>
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
                <button className="btn btn-primary" onClick={handleShare}>
                  Share
                </button>
              </div>
            </div>

            <div className="waiting-animation">
              <div className="spinner"></div>
              <p>Waiting for partner to join...</p>
            </div>
          </>
        ) : (
          <>
            <p className="subtitle">You've joined the game!</p>
            <div className="waiting-animation">
              <div className="spinner"></div>
              <p>Waiting for host to start the game...</p>
            </div>
          </>
        )}

        <button className="btn btn-link" onClick={onExit}>
          Leave Room
        </button>
      </div>
    </div>
  );
}