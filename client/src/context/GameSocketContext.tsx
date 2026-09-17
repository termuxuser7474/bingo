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

  const emitWithAck = useCallback(
    (event: any, payload?: any, timeoutMs = 6000): Promise<{ success: boolean; data?: any; error?: string }> => {
      const socket = socketRef.current;
      if (!socket) {
        return Promise.resolve({ success: false, error: 'Socket not initialized' });
      }
      if (!socket.connected) {
        return Promise.resolve({
          success: false,
          error: 'Game server is currently offline or unreachable. Please verify backend connection.',
        });
      }

      return new Promise((resolve) => {
        let hasResolved = false;
        const timer = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            resolve({
              success: false,
              error: 'Server response timed out. Please check your backend connection.',
            });
          }
        }, timeoutMs);

        const callback = (res: any) => {
          if (!hasResolved) {
            hasResolved = true;
            clearTimeout(timer);
            resolve(res || { success: false, error: 'Empty response from server' });
          }
        };

        if (payload !== undefined) {
          socket.emit(event, payload, callback);
        } else {
          socket.emit(event, callback);
        }
      });
    },
    []
  );

  const createRoom = useCallback(
    async (playerName: string, avatar: string, settings?: Partial<RoomSettings>): Promise<boolean> => {
      const res = await emitWithAck('room:create', { playerName, avatar, settings }, 6000);
      if (res.success && res.data) {
        setRoom(res.data.room);
        setPlayerId(res.data.playerId);
        setReconnectToken(res.data.reconnectToken);
        saveSession(res.data.room.roomCode, res.data.playerId, res.data.reconnectToken);
        soundManager.playClick();
        return true;
      } else {
        setErrorNotification(res.error || 'Failed to create room');
        return false;
      }
    },
    [emitWithAck, saveSession]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string, avatar: string): Promise<boolean> => {
      const res = await emitWithAck(
        'room:join',
        { roomCode: roomCode.trim().toUpperCase(), playerName, avatar },
        6000
      );
      if (res.success && res.data) {
        setRoom(res.data.room);
        setPlayerId(res.data.playerId);
        setReconnectToken(res.data.reconnectToken);
        saveSession(res.data.room.roomCode, res.data.playerId, res.data.reconnectToken);
        soundManager.playClick();
        return true;
      } else {
        setErrorNotification(res.error || 'Failed to join room');
        return false;
      }
    },
    [emitWithAck, saveSession]
  );

  const updateSettings = useCallback(
    async (settings: Partial<RoomSettings>): Promise<boolean> => {
      const res = await emitWithAck('room:update_settings', { settings }, 6000);
      if (!res.success) {
        setErrorNotification(res.error || 'Failed to update settings');
        return false;
      }
      return true;
    },
    [emitWithAck]
  );

  const lockBoard = useCallback(
    async (board: number[]): Promise<boolean> => {
      const res = await emitWithAck('board:lock', { board }, 6000);
      if (res.success) {
        soundManager.playClick();
        return true;
      } else {
        setErrorNotification(res.error || 'Failed to lock board');
        return false;
      }
    },
    [emitWithAck]
  );

  const unlockBoard = useCallback(async (): Promise<boolean> => {
    const res = await emitWithAck('board:unlock', undefined, 6000);
    if (res.success) {
      soundManager.playClick();
      return true;
    } else {
      setErrorNotification(res.error || 'Failed to unlock board');
      return false;
    }
  }, [emitWithAck]);

  const startGame = useCallback(async (): Promise<boolean> => {
    const res = await emitWithAck('game:start', undefined, 6000);
    if (res.success) {
      soundManager.playClick();
      return true;
    } else {
      setErrorNotification(res.error || 'Cannot start game');
      return false;
    }
  }, [emitWithAck]);

  const callNumber = useCallback(
    async (num: number): Promise<boolean> => {
      const res = await emitWithAck('turn:call_number', { number: num }, 6000);
      if (res.success) {
        return true;
      } else {
        setErrorNotification(res.error || 'Failed to call number');
        return false;
      }
    },
    [emitWithAck]
  );

  const claimBingo = useCallback(
    async (lineId?: string): Promise<boolean> => {
      const res = await emitWithAck('bingo:claim', { lineId }, 6000);
      if (res.success) {
        return true;
      } else {
        setErrorNotification(res.error || 'Bingo claim not accepted');
        return false;
      }
    },
    [emitWithAck]
  );

  const rematch = useCallback(async (): Promise<boolean> => {
    const res = await emitWithAck('room:rematch', undefined, 6000);
    if (res.success) {
      soundManager.playClick();
      return true;
    } else {
      setErrorNotification(res.error || 'Failed to trigger rematch');
      return false;
    }
  }, [emitWithAck]);

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
