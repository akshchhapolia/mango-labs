import { useState, useCallback, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';
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
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);

  const playerSymbol: PlayerSymbol = isHost ? 'X' : 'O';

  const startConnection = useCallback((rid: string, host: boolean) => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit('join-room', { roomId: rid, phoneNumber });

    socket.on('player-joined', () => {
      setGameState((prev) => ({ ...prev, status: 'PLAYING' }));
      setScreen('game');
    });

    socket.on('move-made', (data) => {
      setGameState((prev) => ({
        ...prev,
        board: data.board,
        currentTurn: data.currentTurn,
      }));
    });

    socket.on('game-over', (data) => {
      setGameState((prev) => ({
        ...prev,
        board: data.board,
        winner: data.winner,
      }));
      setScreen('result');
    });

    socket.on('restart', (data) => {
      setGameState((prev) => ({
        ...prev,
        board: data.board,
        currentTurn: data.currentTurn,
        status: 'PLAYING',
        winner: null,
      }));
      setScreen('game');
    });

    socket.on('player-left', () => {
      setError('Your partner left the game');
      setScreen('home');
    });

    socket.on('error', (data) => {
      setError(data.message);
    });

    socket.on('game-state', (data) => {
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
    });
  }, [phoneNumber]);

  const handleCreateRoom = useCallback(async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }
    setError('');
    setIsHost(true);

    const res = await fetch('/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPhone: phoneNumber }),
    });
    const data = await res.json();

    if (!data.success) {
      setError(data.error);
      return;
    }

    setRoomId(data.data.roomId);
    setInviteLink(data.data.inviteLink);
    startConnection(data.data.roomId, true);
    setScreen('waiting');
  }, [phoneNumber, startConnection]);

  const handleJoinRoom = useCallback(async (rid: string) => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    setError('');
    setIsHost(false);

    const res = await fetch(`/rooms/${rid}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await res.json();

    if (!data.success) {
      setError(data.error);
      return false;
    }

    setRoomId(rid);
    startConnection(rid, false);
    return true;
  }, [phoneNumber, startConnection]);

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
      socketRef.current.disconnect();
    }
    disconnectSocket();
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
  }, [roomId, phoneNumber]);

  const copyInviteLink = useCallback(() => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  }, [inviteLink]);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

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
    handleCreateRoom,
    handleJoinRoom,
    handleMakeMove,
    handleRestart,
    handleExit,
    copyInviteLink,
  };
}