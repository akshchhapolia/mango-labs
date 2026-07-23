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
    loading,
    handleCreateRoom,
    handleJoinRoom,
    handleMakeMove,
    handleRestart,
    handleExit,
    copyInviteLink,
  } = useGame();

  // Handle joining from invite link URL
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'join' && pathParts[2]) {
      const roomIdFromUrl = pathParts[2];
      if (phoneNumber) {
        handleJoinRoom(roomIdFromUrl);
      } else {
        sessionStorage.setItem('pendingRoomId', roomIdFromUrl);
      }
    }
  }, []);

  // Auto-join once phone is entered after receiving an invite link
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
          loading={loading}
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