import { useState, useCallback } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { GameSelectionScreen } from './screens/GameSelectionScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import { connectSocket, disconnectSocket } from './socket';
import { createRoom, getRoom } from './api';

export type Screen =
  | { name: 'home' }
  | { name: 'game-selection' }
  | { name: 'waiting-room'; roomId: string; inviteLink: string; isHost: boolean; phoneNumber: string }
  | { name: 'game'; roomId: string; phoneNumber: string; isHost: boolean }
  | { name: 'result'; winner: string | null; draw: boolean; roomId: string; phoneNumber: string; isHost: boolean };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const handlePhoneSubmit = useCallback((phone: string) => {
    setPhoneNumber(phone);
    setScreen({ name: 'game-selection' });
  }, []);

  const handleCreateGame = useCallback(async () => {
    try {
      const { roomId, inviteLink } = await createRoom(phoneNumber);
      const socket = connectSocket();
      socket.emit('join-room', { roomId, phoneNumber });

      setScreen({ name: 'waiting-room', roomId, inviteLink, isHost: true, phoneNumber });
    } catch (err: any) {
      alert(err.message);
    }
  }, [phoneNumber]);

  const handleJoinRoom = useCallback(async (roomId: string) => {
    try {
      const room = await getRoom(roomId);
      if (!room || room.status === 'EXPIRED' || room.status === 'FINISHED') {
        alert('Room not found or expired');
        return;
      }

      const socket = connectSocket();
      socket.emit('join-room', { roomId, phoneNumber });

      if (room.status === 'WAITING') {
        setScreen({ name: 'waiting-room', roomId, inviteLink: '', isHost: false, phoneNumber });
      } else {
        setScreen({ name: 'game', roomId, phoneNumber, isHost: false });
      }
    } catch (err: any) {
      alert(err.message);
    }
  }, [phoneNumber]);

  const handleGameStart = useCallback((roomId: string, isHost: boolean) => {
    setScreen({ name: 'game', roomId, phoneNumber, isHost });
  }, [phoneNumber]);

  const handleGameOver = useCallback((winner: string | null, draw: boolean, roomId: string, isHost: boolean) => {
    setScreen({ name: 'result', winner, draw, roomId, phoneNumber, isHost });
  }, [phoneNumber]);

  const handlePlayAgain = useCallback((roomId: string, isHost: boolean) => {
    setScreen({ name: 'game', roomId, phoneNumber, isHost });
  }, [phoneNumber]);

  const handleExit = useCallback(() => {
    disconnectSocket();
    setPhoneNumber('');
    setScreen({ name: 'home' });
  }, []);

  switch (screen.name) {
    case 'home':
      return <HomeScreen onPhoneSubmit={handlePhoneSubmit} onJoinRoom={handleJoinRoom} />;
    case 'game-selection':
      return <GameSelectionPhoneNumber onCreateGame={handleCreateGame} />;
    case 'waiting-room':
      return (
        <WaitingRoomScreen
          roomId={screen.roomId}
          inviteLink={screen.inviteLink}
          isHost={screen.isHost}
          onGameStart={() => handleGameStart(screen.roomId, screen.isHost)}
          onExit={handleExit}
        />
      );
    case 'game':
      return (
        <GameScreen
          roomId={screen.roomId}
          phoneNumber={screen.phoneNumber}
          isHost={screen.isHost}
          onGameOver={(winner, draw) => handleGameOver(winner, draw, screen.roomId, screen.isHost)}
          onExit={handleExit}
        />
      );
    case 'result':
      return (
        <ResultScreen
          winner={screen.winner}
          draw={screen.draw}
          onPlayAgain={() => handlePlayAgain(screen.roomId, screen.isHost)}
          onExit={handleExit}
          phoneNumber={screen.phoneNumber}
        />
      );
  }
}

// Interim component while phone number is already set
function GameSelectionPhoneNumber({ onCreateGame }: { onCreateGame: () => void }) {
  return <GameSelectionScreen onCreateGame={onCreateGame} />;
}