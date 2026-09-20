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

export type ConnectionDiagnosticStatus = 'connecting' | 'connected' | 'unreachable' | 'failed';

export interface ConnectionDiagnostic {
  status: ConnectionDiagnosticStatus;
  detail: string;
  serverUrl: string;
}

interface GameContextType {
  isConnected: boolean;
  connectionDiagnostic: ConnectionDiagnostic;
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
  const [connectionDiagnostic, setConnectionDiagnostic] = useState<ConnectionDiagnostic>({
    status: 'connecting',
    detail: 'Initializing connection...',
    serverUrl: '',
  });
  const [room, setRoom] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [reconnectToken, setReconnectToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<BingoAnnouncement | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Initialize socket
  useEffect(() => {
    // Configure server URL from Vite environment variable (Render Web Service backend)
    // Production example: https://zyraforge-bingo-api.onrender.com
    // In local dev without VITE_SERVER_URL: falls back to window.location.origin (handled by dev proxy)
    const rawUrl = (import.meta as any).env?.VITE_SERVER_URL;
    const serverUrl =
      typeof rawUrl === 'string' && rawUrl.trim() !== ''
        ? rawUrl.trim().replace(/\/+$/, '')
        : undefined;

    const displayUrl = serverUrl || window.location.origin;

    console.log('[SOCKET] Connecting to:', displayUrl);
    setConnectionDiagnostic({
      status: 'connecting',
      detail: `Connecting to ${displayUrl}...`,
      serverUrl: displayUrl,
    });

    const checkBackendHealth = async (): Promise<boolean> => {
      try {
        const target = serverUrl ? `${serverUrl}/health` : '/health';
        const res = await fetch(target, { method: 'GET', mode: 'cors' });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          return data?.status === 'ok';
        }
        return false;
      } catch {
        return false;
      }
    };

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect_error', async (err) => {
      console.error('[SOCKET] Connection error:', err.message);
      setIsConnected(false);

      const isAlive = await checkBackendHealth();
      if (isAlive) {
        setConnectionDiagnostic({
          status: 'failed',
          detail: `HTTP /health is responding, but Socket.IO failed: ${err.message}. Check CORS or transport options.`,
          serverUrl: displayUrl,
        });
      } else {
        setConnectionDiagnostic({
          status: 'unreachable',
          detail: `Cannot reach backend server at ${displayUrl}. Check if Render Web Service is deployed and active.`,
          serverUrl: displayUrl,
        });
      }
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      setIsConnected(true);
      setErrorNotification(null);
      setConnectionDiagnostic({
        status: 'connected',
        detail: `Connected to ${displayUrl} (Socket ID: ${socket.id})`,
        serverUrl: displayUrl,
      });

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

    socket.on('disconnect', (reason) => {
      console.warn('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
      setConnectionDiagnostic({
        status: 'failed',
        detail: `Disconnected from server: ${reason}`,
        serverUrl: displayUrl,
      });
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
  const isHost = (room?.hostId && playerId) ? room.hostId === playerId : (myPlayer?.isHost ?? false);
  const isMyTurn = (room?.status === 'PLAYING' && room?.currentTurnPlayerId && playerId)
    ? room.currentTurnPlayerId === playerId
    : false;

  return (
    <GameContext.Provider
      value={{
        isConnected,
        connectionDiagnostic,
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
