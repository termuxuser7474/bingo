export type RoomStatus =
  | 'LOBBY'
  | 'BOARD_SETUP'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'ROUND_COMPLETE'
  | 'GAME_COMPLETE'
  | 'RESULTS';

export type LineType = 'row' | 'column' | 'diagonal';

export interface BingoLine {
  id: string; // e.g. 'row-0', 'col-2', 'diag-0'
  type: LineType;
  index: number;
  cellIndices: number[]; // 5 indices from 0..24
  numbers: number[]; // 5 actual numbers on this player's board
}

export interface LineDefinition {
  id: string;
  type: LineType;
  index: number;
  cellIndices: number[];
}

export const BINGO_LINE_DEFINITIONS: LineDefinition[] = [
  // 5 Rows
  { id: 'row-0', type: 'row', index: 0, cellIndices: [0, 1, 2, 3, 4] },
  { id: 'row-1', type: 'row', index: 1, cellIndices: [5, 6, 7, 8, 9] },
  { id: 'row-2', type: 'row', index: 2, cellIndices: [10, 11, 12, 13, 14] },
  { id: 'row-3', type: 'row', index: 3, cellIndices: [15, 16, 17, 18, 19] },
  { id: 'row-4', type: 'row', index: 4, cellIndices: [20, 21, 22, 23, 24] },

  // 5 Columns
  { id: 'col-0', type: 'column', index: 0, cellIndices: [0, 5, 10, 15, 20] },
  { id: 'col-1', type: 'column', index: 1, cellIndices: [1, 6, 11, 16, 21] },
  { id: 'col-2', type: 'column', index: 2, cellIndices: [2, 7, 12, 17, 22] },
  { id: 'col-3', type: 'column', index: 3, cellIndices: [3, 8, 13, 18, 23] },
  { id: 'col-4', type: 'column', index: 4, cellIndices: [4, 9, 14, 19, 24] },

  // 2 Diagonals
  { id: 'diag-0', type: 'diagonal', index: 0, cellIndices: [0, 6, 12, 18, 24] }, // Top-left to bottom-right
  { id: 'diag-1', type: 'diagonal', index: 1, cellIndices: [4, 8, 12, 16, 20] }, // Top-right to bottom-left
];


export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;
export type BingoLetter = (typeof BINGO_LETTERS)[number];

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  board: number[] | null; // exactly 25 numbers (1-25)
  score: number;
  bingoCount: number; // number of completed lines (0..12)
  bingoProgress: number; // count of unique letters earned (0..5)
  letters: string[]; // unlocked letters: e.g. ['B', 'I', 'N']
  completedLineIds: string[]; // unique line IDs completed so far
  completedLines: BingoLine[];
  connectionStatus: 'connected' | 'disconnected';
  reconnectToken: string;
  joinedAt: number;
  bingoRank?: number;
  hasBingo?: boolean;
}


export interface WinnerRecord {
  playerId: string;
  playerName: string;
  avatar: string;
  rank: number; // 1 = 1st Bingo, 2 = 2nd Bingo, etc.
  lineCount: number;
  scoreAwarded: number;
  timestamp: number;
}

export interface ScoringConfig {
  first: number;
  second: number;
  third: number;
  subsequent: number;
}

export interface RoomSettings {
  maxPlayers: number;
  maxWinners: number;
  turnTimeoutSeconds: number; // 0 = unlimited
  soundEnabled: boolean;
  scoringConfig: ScoringConfig;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: Player[];
  turnIndex: number;
  currentTurnPlayerId: string | null;
  turnStartedAt: number | null;
  turnExpiresAt: number | null;
  turnTimeRemaining: number | null;
  calledNumbers: number[];
  lastCalledNumber: number | null;
  winnerHistory: WinnerRecord[];
  countdown: number | null;
  createdAt: number;
}

// Client-to-server socket events
export interface ClientToServerEvents {
  'room:create': (
    payload: {
      playerName: string;
      avatar: string;
      settings?: Partial<RoomSettings>;
    },
    callback: (response: { success: boolean; data?: { room: GameState; playerId: string; reconnectToken: string }; error?: string }) => void
  ) => void;

  'room:join': (
    payload: {
      roomCode: string;
      playerName: string;
      avatar: string;
    },
    callback: (response: { success: boolean; data?: { room: GameState; playerId: string; reconnectToken: string }; error?: string }) => void
  ) => void;

  'room:reconnect': (
    payload: {
      roomCode: string;
      playerId: string;
      reconnectToken: string;
    },
    callback: (response: { success: boolean; data?: { room: GameState; playerId: string }; error?: string }) => void
  ) => void;

  'room:update_settings': (
    payload: {
      settings: Partial<RoomSettings>;
    },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  'board:lock': (
    payload: {
      board: number[];
    },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  'board:unlock': (
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  'game:start': (
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  'turn:call_number': (
    payload: {
      number: number;
    },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  'bingo:claim': (
    payload: {
      lineId?: string;
    },
    callback: (response: { success: boolean; data?: { newLines: BingoLine[]; totalLines: number; rank?: number; scoreAwarded?: number }; error?: string }) => void
  ) => void;

  'room:rematch': (
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  'room:leave': () => void;
}

// Server-to-client socket events
export interface ServerToClientEvents {
  'room:state_update': (state: GameState) => void;
  'game:countdown': (count: number) => void;
  'number:called': (payload: { number: number; calledBy: { id: string; name: string }; nextPlayerId: string | null }) => void;
  'bingo:announced': (payload: {
    playerId: string;
    playerName: string;
    avatar: string;
    rank: number;
    totalLines: number;
    newLines: BingoLine[];
    scoreAwarded: number;
  }) => void;
  'game:completed': (payload: { winnerHistory: WinnerRecord[]; finalScores: { playerId: string; name: string; score: number; lines: number }[] }) => void;
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'notification:error': (message: string) => void;
}
