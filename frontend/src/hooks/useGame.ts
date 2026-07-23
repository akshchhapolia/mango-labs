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

interface StoredSession {
  phoneNumber: string;
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [roomId, setRoomId] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null),
    currentTurn: 'X',
    players: [],
    status: 'WAITING',
    winner: null,
  });
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const playerSymbol: PlayerSymbol = isHost ? 'X' : 'O';

  const clearListeners = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  const setupSocketListeners = useCallback((rid: string) => {
    // Clear any existing listeners first
    clearListeners();

    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit('join-room', { roomId: rid, phoneNumber });

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

    const onPlayerLeft = () => {
      setError('Your partner left the game');
      clearSession();
      setScreen('home');
    };
    socket.on('player-left', onPlayerLeft);
    listeners.push(() => socket.off('player-left', onPlayerLeft));

    const onError = (data: { message: string }) => {
      setError(data.message);
      clearSession();
      setScreen('home');
    };
    socket.on('error', onError);
    listeners.push(() => socket.off('error', onError));

    const onGameState = (data: {
      board: Board;
      currentTurn: PlayerSymbol;
      players: string[];
      status: string;
      winner: PlayerSymbol | 'draw' | null;
    }) => {
      setGameState({
        board: data.board,
        currentTurn: data.currentTurn,
        players: data.players,
        status: data.status,
        winner: data.winner,
      });
      if (data.status === 'PLAYING' && data.players.length === 2) {
        setScreen('game');
      }
    };
    socket.on('game-state', onGameState);
    listeners.push(() => socket.off('game-state', onGameState));

    cleanupRef.current = () => {
      listeners.forEach((fn) => fn());
    };
  }, [phoneNumber, clearListeners]);

  // Restore session on mount (reconnection after refresh)
  // Skip if the user opened an invite link (handled by App.tsx)
  useEffect(() => {
    const pendingRoomId = sessionStorage.getItem('pendingRoomId');
    if (pendingRoomId) {
      // Invite link flow will take over — clear any stale session
      clearSession();
      return;
    }

    const session = loadSession();
    if (session) {
      setPhoneNumber(session.phoneNumber);
      setRoomId(session.roomId);
      setIsHost(session.isHost);
      if (session.isHost && screen === 'home') {
        setInviteLink(`${window.location.origin}/join/${session.roomId}`);
      }
      setupSocketListeners(session.roomId);
    }

    return () => {
      clearListeners();
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRoom = useCallback(async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await createRoom(phoneNumber.trim());
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to create room');
        return;
      }

      const data = res.data;
      setRoomId(data.roomId);
      setInviteLink(data.inviteLink);
      setIsHost(true);
      saveSession({ phoneNumber: phoneNumber.trim(), roomId: data.roomId, isHost: true });
      setupSocketListeners(data.roomId);
      setScreen('waiting');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, setupSocketListeners]);

  const handleJoinRoom = useCallback(async (rid: string) => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    setError('');
    setLoading(true);

    try {
      const res = await joinRoomApi(rid, phoneNumber.trim());
      if (!res.success || !res.data) {
        setError(res.error || 'Failed to join room');
        return false;
      }

      setRoomId(rid);
      setIsHost(false);
      saveSession({ phoneNumber: phoneNumber.trim(), roomId: rid, isHost: false });
      setupSocketListeners(rid);
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, setupSocketListeners]);

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
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId, phoneNumber });
      socketRef.current.off();
      socketRef.current.disconnect();
    }
    disconnectSocket();
    clearListeners();
    clearSession();
    setScreen('home');
    setRoomId('');
    setInviteLink('');
    setGameState({
      board: Array(9).fill(null),
      currentTurn: 'X',
      players: [],
      status: 'WAITING',
      winner: null,
    });
    setIsHost(false);
    setError('');
  }, [roomId, phoneNumber, clearListeners]);

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
    handleCreateRoom,
    handleJoinRoom,
    handleMakeMove,
    handleRestart,
    handleExit,
    copyInviteLink,
  };
}