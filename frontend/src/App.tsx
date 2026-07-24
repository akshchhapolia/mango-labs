import { useState } from 'react';
import { useGame } from './hooks/useGame';
import HomeScreen from './pages/HomeScreen';
import WaitingScreen from './pages/WaitingScreen';
import GameScreen from './pages/GameScreen';
import ResultScreen from './pages/ResultScreen';
import ClosedScreen from './pages/ClosedScreen';

export default function App() {
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(() => {
    const parts = window.location.pathname.split('/');
    return parts[1] === 'join' && parts[2] ? parts[2] : null;
  });

  const {
    role,
    displayName,
    setDisplayName,
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
    closedByName,
    handleCreateRoom,
    handleJoinRoom,
    handleMakeMove,
    handleRestart,
    handleExit,
    handleReturnHome,
    copyInviteLink,
  } = useGame();

  const handlePrimaryAction = async () => {
    if (pendingRoomId) {
      const joined = await handleJoinRoom(pendingRoomId);
      if (joined) {
        sessionStorage.removeItem('pendingRoomId');
        setPendingRoomId(null);
        window.history.replaceState({}, '', '/');
      }
      return;
    }
    await handleCreateRoom();
  };

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          displayName={displayName}
          setDisplayName={setDisplayName}
          pendingRoomId={pendingRoomId}
          role={role}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          onCreateRoom={handlePrimaryAction}
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
          phoneNumber={phoneNumber}
          players={gameState.players}
          playerNames={gameState.playerNames}
          onCellClick={handleMakeMove}
          onExit={handleExit}
        />
      )}


      {screen === 'closed' && (
        <ClosedScreen
          closedByName={closedByName}
          onReturnHome={handleReturnHome}
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