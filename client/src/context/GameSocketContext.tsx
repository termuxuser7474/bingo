import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  GameState,
  Player,
  RoomSettings,
  BingoLine,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/game.js';
import { soundManager } from '../audio/soundManager.js';

interface BingoAnnouncement {
  playerId: string;
  playerName: string;
  avatar: string;
  rank: number;
  totalLines: number;
  newLines: BingoLine[];
  scoreAwarded: number;
}

interface GameContextType {
  isConnected: boolean;
  room: GameState | null;
  playerId: string | null;
  reconnectToken: string | null;
  myPlayer: Player | null;
  isHost: boolean;
  isMyTurn: boolean;
  countdown: number | null;
  announcement: BingoAnnouncement | null;
  errorNotification: string | null;
  createRoom: (playerName: string, avatar: string, settings?: Partial<RoomSettings>) => Promise<boolean>;
  joinRoom: (roomCode: string, playerName: string, avatar: string) => Promise<boolean>;
  updateSettings: (settings: Partial<RoomSettings>) => Promise<boolean>;
  lockBoard: (board: number[]) => Promise<boolean>;
  unlockBoard: () => Promise<boolean>;
  startGame: () => Promise<boolean>;
  callNumber: (num: number) => Promise<boolean>;
  claimBingo: (lineId?: string) => Promise<boolean>;
  rematch: () => Promise<boolean>;
  leaveRoom: () => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEY = 'bingo_active_session';

export const GameSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [reconnectToken, setReconnectToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<BingoAnnouncement | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Initialize socket
  useEffect(() => {
    // In dev: proxy handles /socket.io to localhost:3001
    // If VITE_SERVER_URL is provided (e.g. Vercel deployment pointing to Render/Railway), use it.
    // Otherwise falls back to window.location.origin.
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || undefined;
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('connect', () => {
      setIsConnected(true);

      // Check for saved session to auto-reconnect
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const session = JSON.parse(saved);
          if (session.roomCode && session.playerId && session.reconnectToken) {
            socket.emit(
              'room:reconnect',
              {
                roomCode: session.roomCode,
                playerId: session.playerId,
                reconnectToken: session.reconnectToken,
              },
              (res: { success: boolean; data?: { room: GameState; playerId: string }; error?: string }) => {
                if (res.success && res.data) {
                  setRoom(res.data.room);
                  setPlayerId(res.data.playerId);
                  setReconnectToken(session.reconnectToken);
                } else {
                  localStorage.removeItem(STORAGE_KEY);
                }
              }

            );
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room:state_update', (newRoomState) => {
      setRoom(newRoomState);
    });

    socket.on('game:countdown', (count) => {
      setCountdown(count);
      soundManager.playCountdownTick(count === 0);
      if (count === 0) {
        setTimeout(() => setCountdown(null), 1200);
      }
    });

    socket.on('number:called', (payload) => {
      soundManager.playStrike();
      // If next player is current user, play turn chime
      const currentPid = playerId;
      if (payload.nextPlayerId && payload.nextPlayerId === currentPid) {
        setTimeout(() => soundManager.playTurnChime(), 400);
      }
    });

    socket.on('bingo:announced', (payload) => {
      setAnnouncement(payload);
      soundManager.playBingoCelebration();
      setTimeout(() => {
        setAnnouncement(null);
      }, 5000);
    });

    socket.on('notification:error', (msg) => {
      setErrorNotification(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, [playerId]);

  const saveSession = useCallback((roomCode: string, pId: string, rToken: string) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ roomCode, playerId: pId, reconnectToken: rToken })
      );
    } catch {
      // ignore
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const createRoom = useCallback(
    async (playerName: string, avatar: string, settings?: Partial<RoomSettings>): Promise<boolean> => {
      const socket = socketRef.current;
      if (!socket) return false;

      return new Promise((resolve) => {
        socket.emit('room:create', { playerName, avatar, settings }, (res) => {
          if (res.success && res.data) {
            setRoom(res.data.room);
            setPlayerId(res.data.playerId);
            setReconnectToken(res.data.reconnectToken);
            saveSession(res.data.room.roomCode, res.data.playerId, res.data.reconnectToken);
            soundManager.playClick();
            resolve(true);
          } else {
            setErrorNotification(res.error || 'Failed to create room');
            resolve(false);
          }
        });
      });
    },
    [saveSession]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string, avatar: string): Promise<boolean> => {
      const socket = socketRef.current;
      if (!socket) return false;

      return new Promise((resolve) => {
        socket.emit('room:join', { roomCode: roomCode.trim().toUpperCase(), playerName, avatar }, (res) => {
          if (res.success && res.data) {
            setRoom(res.data.room);
            setPlayerId(res.data.playerId);
            setReconnectToken(res.data.reconnectToken);
            saveSession(res.data.room.roomCode, res.data.playerId, res.data.reconnectToken);
            soundManager.playClick();
            resolve(true);
          } else {
            setErrorNotification(res.error || 'Failed to join room');
            resolve(false);
          }
        });
      });
    },
    [saveSession]
  );

  const updateSettings = useCallback(async (settings: Partial<RoomSettings>): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit('room:update_settings', { settings }, (res) => {
        if (!res.success) {
          setErrorNotification(res.error || 'Failed to update settings');
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const lockBoard = useCallback(async (board: number[]): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit('board:lock', { board }, (res) => {
        if (res.success) {
          soundManager.playClick();
          resolve(true);
        } else {
          setErrorNotification(res.error || 'Failed to lock board');
          resolve(false);
        }
      });
    });
  }, []);

  const unlockBoard = useCallback(async (): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit('board:unlock', (res) => {
        if (res.success) {
          soundManager.playClick();
          resolve(true);
        } else {
          setErrorNotification(res.error || 'Failed to unlock board');
          resolve(false);
        }
      });
    });
  }, []);

  const startGame = useCallback(async (): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit('game:start', (res) => {
        if (res.success) {
          soundManager.playClick();
          resolve(true);
        } else {
          setErrorNotification(res.error || 'Cannot start game');
          resolve(false);
        }
      });
    });
  }, []);

  const callNumber = useCallback(async (num: number): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit('turn:call_number', { number: num }, (res) => {
        if (res.success) {
          resolve(true);
        } else {
          setErrorNotification(res.error || 'Failed to call number');
          resolve(false);
        }
      });
    });
  }, []);

  const claimBingo = useCallback(async (lineId?: string): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit('bingo:claim', { lineId }, (res) => {
        if (res.success) {
          resolve(true);
        } else {
          setErrorNotification(res.error || 'Bingo claim not accepted');
          resolve(false);
        }
      });
    });
  }, []);

  const rematch = useCallback(async (): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit('room:rematch', (res) => {
        if (res.success) {
          soundManager.playClick();
          resolve(true);
        } else {
          setErrorNotification(res.error || 'Failed to trigger rematch');
          resolve(false);
        }
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('room:leave');
    }
    clearSession();
    setRoom(null);
    setPlayerId(null);
    setReconnectToken(null);
  }, [clearSession]);

  const clearError = useCallback(() => {
    setErrorNotification(null);
  }, []);

  const myPlayer = room?.players.find((p) => p.id === playerId) || null;
  const isHost = myPlayer?.isHost ?? false;
  const isMyTurn = room?.currentTurnPlayerId === playerId;

  return (
    <GameContext.Provider
      value={{
        isConnected,
        room,
        playerId,
        reconnectToken,
        myPlayer,
        isHost,
        isMyTurn,
        countdown,
        announcement,
        errorNotification,
        createRoom,
        joinRoom,
        updateSettings,
        lockBoard,
        unlockBoard,
        startGame,
        callNumber,
        claimBingo,
        rematch,
        leaveRoom,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameSocketProvider');
  }
  return context;
};
