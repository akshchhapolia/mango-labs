import { useEffect } from 'react';
import { useGame } from './hooks/useGame';
import HomeScreen from './pages/HomeScreen';
import WaitingScreen from './pages/WaitingScreen';
import GameScreen from './pages/GameScreen';
import ResultScreen from './pages/ResultScreen';

export default function App() {
  const {
    phoneNumber,
    setPhoneNumber,
    screen,
    gameState,
    inviteLink,
    error,
    setError,
    playerSymbol,
    isHost,
    handleCreateRoom,
    handleJoinRoom,
    handleMakeMove,
    handleRestart,
    handleExit,
    copyInviteLink,
  } = useGame();

  // Handle joining from invite link
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'join' && pathParts[2]) {
      const roomIdFromUrl = pathParts[2];
      if (phoneNumber) {
        handleJoinRoom(roomIdFromUrl);
      } else {
        // Store the room ID and show the home screen first
        sessionStorage.setItem('pendingRoomId', roomIdFromUrl);
      }
    }
  }, []);

  // If there's a pending room join after phone number entry
  useEffect(() => {
    const pendingRoomId = sessionStorage.getItem('pendingRoomId');
    if (pendingRoomId && phoneNumber && screen === 'home') {
      sessionStorage.removeItem('pendingRoomId');
      handleJoinRoom(pendingRoomId);
    }
  }, [phoneNumber, screen, handleJoinRoom]);

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={error}
          setError={setError}
        />
      )}

      {screen === 'waiting' && (
        <WaitingScreen
          inviteLink={inviteLink}
          onCopy={copyInviteLink}
          onExit={handleExit}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          board={gameState.board}
          currentTurn={gameState.currentTurn}
          playerSymbol={playerSymbol}
          isHost={isHost}
          onCellClick={handleMakeMove}
          onExit={handleExit}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          board={gameState.board}
          winner={gameState.winner}
          isHost={isHost}
          onRestart={handleRestart}
          onExit={handleExit}
        />
      )}
    </div>
  );
}