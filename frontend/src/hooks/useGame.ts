import { useState, useCallback, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';
import { createRoom, joinRoom as joinRoomApi } from '../services/api';
import { Board, PlayerSymbol, Screen, GameState } from '../types';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board: Board): PlayerSymbol | 'draw' | null {
  for (const [a, b, c] of WINNING_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as PlayerSymbol;
    }
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return null;
}

const STORAGE_KEY = 'couple_game_session';
const ROLE_KEY = 'couple_game_role';
type PlayerRole = 'host' | 'partner';

interface StoredSession {
  phoneNumber: string;
  displayName: string;
  roomId: string;
  isHost: boolean;
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage full or unavailable — ignore
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function useGame() {
  const [role, setRole] = useState<PlayerRole>(() => {
    const parts = window.location.pathname.split('/');
    if (parts[1] === 'join' && parts[2]) return 'partner';
    return localStorage.getItem(ROLE_KEY) === 'partner' ? 'partner' : 'host';
  });
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [roomId, setRoomId] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null),
    currentTurn: 'X',
    players: [],
    playerNames: {},
    status: 'WAITING',
    winner: null,
  });
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [closedByName, setClosedByName] = useState('');
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const playerSymbol: PlayerSymbol = isHost ? 'X' : 'O';

  const clearListeners = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  const setupSocketListeners = useCallback((rid: string, identityPhone = phoneNumber, identityName = displayName) => {
    // Clear any existing listeners first
    clearListeners();

    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit('join-room', { roomId: rid, phoneNumber: identityPhone, displayName: identityName });

    const listeners: (() => void)[] = [];

    const onPlayerJoined = () => {
      setGameState((prev) => ({ ...prev, status: 'PLAYING' }));
      setScreen('game');
    };
    socket.on('player-joined', onPlayerJoined);
    listeners.push(() => socket.off('player-joined', onPlayerJoined));

    const onMoveMade = (data: { board: Board; currentTurn: PlayerSymbol }) => {
      setGameState((prev) => ({
        ...prev,
        board: data.board,
        currentTurn: data.currentTurn,
      }));
    };
    socket.on('move-made', onMoveMade);
    listeners.push(() => socket.off('move-made', onMoveMade));

    const onGameOver = (data: { winner: PlayerSymbol | 'draw' | null; board: Board }) => {
      setGameState((prev) => ({
        ...prev,
        board: data.board,
        winner: data.winner,
      }));
      setScreen('result');
    };
    socket.on('game-over', onGameOver);
    listeners.push(() => socket.off('game-over', onGameOver));

    const onRestart = (data: { board: Board; currentTurn: PlayerSymbol }) => {
      setGameState((prev) => ({
        ...prev,
        board: data.board,
        currentTurn: data.currentTurn,
        status: 'PLAYING',
        winner: null,
      }));
      setScreen('game');
    };
    socket.on('restart', onRestart);
    listeners.push(() => socket.off('restart', onRestart));


    const resetAfterClosure = (name: string) => {
      clearSession();
      clearListeners();
      disconnectSocket();
      socketRef.current = null;
      setClosedByName(name);
      setScreen('closed');
      setRoomId('');
      setInviteLink('');
      setGameState({
        board: Array(9).fill(null),
        currentTurn: 'X',
        players: [],
        playerNames: {},
        status: 'WAITING',
        winner: null,
      });
      setError('');
    };

    const onGameClosed = (data: { closedByName: string }) => {
      resetAfterClosure(data.closedByName);
    };
    socket.on('game-closed', onGameClosed);
    listeners.push(() => socket.off('game-closed', onGameClosed));

    const onPlayerLeft = () => {
      resetAfterClosure('The other player');
    };
    socket.on('player-left', onPlayerLeft);
    listeners.push(() => socket.off('player-left', onPlayerLeft));

    const onError = (data: { message: string }) => {
      setError(data.message);
    };
    socket.on('error', onError);
    listeners.push(() => socket.off('error', onError));

    const onGameState = (data: {
      board: Board;
      currentTurn: PlayerSymbol;
      players: string[];
      playerNames: Record<string, string>;
      status: string;
      winner: PlayerSymbol | 'draw' | null;
    }) => {
      setGameState({
        board: data.board,
        currentTurn: data.currentTurn,
        players: data.players,
        playerNames: data.playerNames || {},
        status: data.status,
        winner: data.winner,
      });
      if (data.winner) {
        setScreen('result');
      } else if (data.status === 'PLAYING' && data.players.length === 2) {
        setScreen('game');
      }
    };
    socket.on('game-state', onGameState);
    listeners.push(() => socket.off('game-state', onGameState));

    cleanupRef.current = () => {
      listeners.forEach((fn) => fn());
    };
  }, [phoneNumber, displayName, clearListeners]);

  // Restore session on mount (reconnection after refresh)
  // Skip if the user opened an invite link (handled by App.tsx)
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const pendingRoomId = pathParts[1] === 'join' && pathParts[2] ? pathParts[2] : null;
    if (pendingRoomId) {
      // Invite link flow will take over — clear any stale session
      clearSession();
      return;
    }

    const session = loadSession();
    if (session) {
      setPhoneNumber(session.phoneNumber);
      setDisplayName(session.displayName || 'Player');
      setRoomId(session.roomId);
      setIsHost(session.isHost);
      setRole(session.isHost ? 'host' : 'partner');
      localStorage.setItem(ROLE_KEY, session.isHost ? 'host' : 'partner');
      if (session.isHost && screen === 'home') {
        setInviteLink(`${window.location.origin}/join/${session.roomId}`);
      }
      setupSocketListeners(session.roomId, session.phoneNumber, session.displayName || 'Player');
    }

    return () => {
      clearListeners();
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRoom = useCallback(async () => {
    if (!displayName.trim() || !phoneNumber.trim()) {
      setError('Please enter your name and phone number');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await createRoom(phoneNumber.trim(), displayName.trim());
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to create room');
        return;
      }

      const data = res.data;
      setRoomId(data.roomId);
      setInviteLink(data.inviteLink);
      setIsHost(true);
      setRole('host');
      localStorage.setItem(ROLE_KEY, 'host');
      saveSession({ phoneNumber: phoneNumber.trim(), displayName: displayName.trim(), roomId: data.roomId, isHost: true });
      setupSocketListeners(data.roomId);
      setScreen('waiting');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, displayName, setupSocketListeners]);

  const handleJoinRoom = useCallback(async (rid: string) => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return false;
    }
    setError('');
    setLoading(true);

    // Invited partners do not need to provide a phone number. A private,
    // room-scoped identifier is generated for gameplay and reconnection.
    const playerId = phoneNumber.trim() || `guest-${rid}-${crypto.randomUUID()}`;

    try {
      const res = await joinRoomApi(rid, playerId, displayName.trim());
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to join room');
        return false;
      }

      setPhoneNumber(playerId);
      setRoomId(rid);
      setIsHost(false);
      setRole('partner');
      localStorage.setItem(ROLE_KEY, 'partner');
      saveSession({ phoneNumber: playerId, displayName: displayName.trim(), roomId: rid, isHost: false });
      setupSocketListeners(rid, playerId, displayName.trim());
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, displayName, setupSocketListeners]);

  const handleMakeMove = useCallback((position: number) => {
    if (!socketRef.current || gameState.winner) return;
    if (gameState.currentTurn !== playerSymbol) return;
    if (gameState.board[position] !== null) return;

    socketRef.current.emit('make-move', { roomId, phoneNumber, position });
  }, [roomId, phoneNumber, gameState, playerSymbol]);

  const handleRestart = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('restart-game', { roomId, phoneNumber });
  }, [roomId, phoneNumber]);

  const handleExit = useCallback(() => {
    const socket = socketRef.current;
    const wasGuest = phoneNumber.startsWith('guest-');

    const resetLocalState = () => {
      socket?.off();
      socket?.disconnect();
      socketRef.current = null;
      disconnectSocket();
      clearListeners();
      clearSession();
      setScreen('home');
      if (wasGuest) {
        setPhoneNumber('');
        setDisplayName('');
      }
      setRoomId('');
      setInviteLink('');
      setGameState({
        board: Array(9).fill(null),
        currentTurn: 'X',
        players: [],
        playerNames: {},
        status: 'WAITING',
        winner: null,
      });
      setIsHost(false);
      setError('');
    };

    if (socket?.connected) {
      socket.emit('leave-room', { roomId, phoneNumber }, resetLocalState);
      setTimeout(resetLocalState, 1000);
    } else {
      resetLocalState();
    }
  }, [roomId, phoneNumber, clearListeners]);

  const handleReturnHome = useCallback(() => {
    const wasGuest = phoneNumber.startsWith('guest-');
    if (wasGuest) {
      setPhoneNumber('');
      setDisplayName('');
    }
    setClosedByName('');
    setIsHost(false);
    setError('');
    setScreen('home');
  }, [phoneNumber]);

  const copyInviteLink = useCallback(() => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  }, [inviteLink]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearListeners();
    };
  }, [clearListeners]);

  return {
    role,
    displayName,
    setDisplayName,
    phoneNumber,
    setPhoneNumber,
    roomId,
    screen,
    gameState,
    inviteLink,
    error,
    setError,
    isHost,
    playerSymbol,
    loading,
    closedByName,
    handleCreateRoom,
    handleJoinRoom,
    handleMakeMove,
    handleRestart,
    handleExit,
    handleReturnHome,
    copyInviteLink,
  };
}