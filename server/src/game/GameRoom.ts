import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  RoomSettings,
  RoomStatus,
  WinnerRecord,
  BingoLine,
  BINGO_LETTERS,
} from '../shared/types.js';


import {
  validateBoard,
  getCompletedLines,
  getNewlyCompletedLines,
  validateBingoClaim,
} from './boardUtils.js';
import { db } from '../db/database.js';

export interface RoomBroadcastCallbacks {
  onStateUpdate: (state: GameState) => void;
  onCountdown: (count: number) => void;
  onNumberCalled: (payload: {
    number: number;
    calledBy: { id: string; name: string };
    nextPlayerId: string | null;
  }) => void;
  onBingoAnnounced: (payload: {
    playerId: string;
    playerName: string;
    avatar: string;
    rank: number;
    totalLines: number;
    newLines: BingoLine[];
    scoreAwarded: number;
  }) => void;
  onGameCompleted: (payload: {
    winnerHistory: WinnerRecord[];
    finalScores: { playerId: string; name: string; score: number; lines: number }[];
  }) => void;
}

export class GameRoom {
  public id: string;
  public code: string;
  public hostId: string;
  public status: RoomStatus = 'LOBBY';
  public settings: RoomSettings;
  public players: Map<string, Player> = new Map();
  public turnIndex = 0;
  public calledNumbers: number[] = [];
  public lastCalledNumber: number | null = null;
  public winnerHistory: WinnerRecord[] = [];
  public createdAt: number;
  public turnStartedAt: number | null = null;
  public turnExpiresAt: number | null = null;
  private lastJoinTimestamp: number;

  private claimedLinesByPlayer: Map<string, Set<string>> = new Map();
  private turnTimer: NodeJS.Timeout | null = null;
  private turnSecondsLeft: number | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: RoomBroadcastCallbacks | null = null;

  constructor(
    code: string,
    hostPlayer: { id?: string; name: string; avatar: string; reconnectToken?: string },
    settings?: Partial<RoomSettings>,
    callbacks?: RoomBroadcastCallbacks
  ) {
    this.id = uuidv4();
    this.code = code.toUpperCase();
    this.createdAt = Date.now();
    this.lastJoinTimestamp = this.createdAt;
    this.callbacks = callbacks || null;

    this.settings = {
      maxPlayers: settings?.maxPlayers ?? 6,
      maxWinners: settings?.maxWinners ?? 3,
      turnTimeoutSeconds: settings?.turnTimeoutSeconds ?? 30,
      soundEnabled: settings?.soundEnabled ?? true,
      scoringConfig: settings?.scoringConfig ?? {
        first: 100,
        second: 75,
        third: 50,
        subsequent: 25,
      },
    };

    const hostId = hostPlayer.id || uuidv4();
    const token = hostPlayer.reconnectToken || uuidv4();
    this.hostId = hostId;

    const host: Player = {
      id: hostId,
      name: hostPlayer.name.trim(),
      avatar: hostPlayer.avatar,
      isHost: true,
      isReady: false,
      board: null,
      score: 0,
      bingoCount: 0,
      bingoProgress: 0,
      letters: [],
      completedLineIds: [],
      completedLines: [],
      connectionStatus: 'connected',
      reconnectToken: token,
      joinedAt: this.createdAt,
      hasBingo: false,
      bingoRank: undefined,
    };

    this.players.set(hostId, host);
    this.claimedLinesByPlayer.set(hostId, new Set());
    this.persist();
  }

  public setCallbacks(callbacks: RoomBroadcastCallbacks) {
    this.callbacks = callbacks;
  }

  private persist() {
    db.saveRoom({
      id: this.id,
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      settingsJson: JSON.stringify(this.settings),
      winnerHistoryJson: JSON.stringify(this.winnerHistory),
      createdAt: this.createdAt,
      updatedAt: Date.now(),
    });

    for (const player of this.players.values()) {
      const claimed = Array.from(this.claimedLinesByPlayer.get(player.id) || []);
      db.savePlayer({
        id: player.id,
        roomCode: this.code,
        name: player.name,
        avatar: player.avatar,
        isHost: player.isHost,
        isReady: player.isReady,
        boardJson: player.board ? JSON.stringify(player.board) : null,
        score: player.score,
        bingoCount: player.bingoCount,
        claimedLinesJson: JSON.stringify(claimed),
        reconnectToken: player.reconnectToken,
        connectionStatus: player.connectionStatus,
        lastSeen: Date.now(),
      });
    }
  }

  public getPlayerList(): Player[] {
    return Array.from(this.players.values());
  }

  public getCurrentTurnPlayer(): Player | null {
    if (this.status !== 'PLAYING') return null;
    const playerList = this.getPlayerList();
    if (playerList.length === 0) return null;
    const safeIndex = this.turnIndex % playerList.length;
    return playerList[safeIndex] || null;
  }

  public toState(): GameState {
    const currentTurn = this.getCurrentTurnPlayer();
    const now = Date.now();
    const secondsLeft = this.turnExpiresAt ? Math.max(0, Math.ceil((this.turnExpiresAt - now) / 1000)) : null;

    return {
      roomId: this.id,
      roomCode: this.code,
      hostId: this.hostId,
      status: this.status,
      settings: { ...this.settings },
      players: this.getPlayerList().map((p) => {
        const completedLines = p.board ? getCompletedLines(p.board, this.calledNumbers) : [];
        const claimedSet = this.claimedLinesByPlayer.get(p.id) || new Set<string>();
        const uniqueCount = claimedSet.size;
        const progress = Math.min(5, uniqueCount);
        const winnerRec = this.winnerHistory.find((w) => w.playerId === p.id);

        return {
          ...p,
          isHost: p.id === this.hostId,
          bingoCount: uniqueCount,
          bingoProgress: progress,
          letters: BINGO_LETTERS.slice(0, progress),
          completedLineIds: Array.from(claimedSet),
          completedLines,
          hasBingo: progress >= 5 || !!winnerRec,
          bingoRank: winnerRec?.rank,
        };
      }),

      turnIndex: this.turnIndex,
      currentTurnPlayerId: currentTurn ? currentTurn.id : null,
      turnStartedAt: this.turnStartedAt,
      turnExpiresAt: this.turnExpiresAt,
      turnTimeRemaining: secondsLeft,
      calledNumbers: [...this.calledNumbers],
      lastCalledNumber: this.lastCalledNumber,
      winnerHistory: [...this.winnerHistory],
      countdown: null,
      createdAt: this.createdAt,
    };
  }

  public broadcastState() {
    this.persist();
    if (this.callbacks) {
      this.callbacks.onStateUpdate(this.toState());
    }
  }

  /**
   * Deterministically elects a new host from remaining active players.
   * Rule: Earliest joined active connected player; tie-break by playerId.
   */
  public electNewHost(excludePlayerId?: string): boolean {
    const connected = Array.from(this.players.values()).filter(
      (p) => p.id !== excludePlayerId && p.connectionStatus === 'connected'
    );

    let nextHost: Player | undefined;

    if (connected.length > 0) {
      connected.sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || a.id.localeCompare(b.id));
      nextHost = connected[0];
    } else {
      const anyRemaining = Array.from(this.players.values()).filter((p) => p.id !== excludePlayerId);
      if (anyRemaining.length > 0) {
        anyRemaining.sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || a.id.localeCompare(b.id));
        nextHost = anyRemaining[0];
      }
    }

    if (nextHost) {
      this.hostId = nextHost.id;
      for (const p of this.players.values()) {
        p.isHost = p.id === this.hostId;
      }
      return true;
    }

    return false;
  }

  private getNextJoinTimestamp(): number {
    const now = Date.now();
    this.lastJoinTimestamp = Math.max(now, this.lastJoinTimestamp + 1);
    return this.lastJoinTimestamp;
  }

  // --- Player Management ---

  public addPlayer(name: string, avatar: string): { success: boolean; player?: Player; error?: string } {
    if (this.status !== 'LOBBY' && this.status !== 'BOARD_SETUP') {
      return { success: false, error: 'Game has already started' };
    }

    if (this.players.size >= this.settings.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 20) {
      return { success: false, error: 'Player name must be between 2 and 20 characters' };
    }

    const nameExists = Array.from(this.players.values()).some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      return { success: false, error: 'A player with this name is already in the room' };
    }

    const playerId = uuidv4();
    const reconnectToken = uuidv4();

    const newPlayer: Player = {
      id: playerId,
      name: trimmedName,
      avatar,
      isHost: false,
      isReady: false,
      board: null,
      score: 0,
      bingoCount: 0,
      bingoProgress: 0,
      letters: [],
      completedLineIds: [],
      completedLines: [],
      connectionStatus: 'connected',
      reconnectToken,
      joinedAt: this.getNextJoinTimestamp(),
      hasBingo: false,
      bingoRank: undefined,
    };

    this.players.set(playerId, newPlayer);
    this.claimedLinesByPlayer.set(playerId, new Set());
    this.broadcastState();

    return { success: true, player: newPlayer };
  }

  public reconnectPlayer(playerId: string, token: string): { success: boolean; player?: Player; error?: string } {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }
    if (player.reconnectToken !== token) {
      return { success: false, error: 'Invalid reconnect token' };
    }

    player.connectionStatus = 'connected';

    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    player.isHost = player.id === this.hostId;

    this.broadcastState();
    return { success: true, player };
  }

  public handleDisconnect(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    player.connectionStatus = 'disconnected';

    const wasHost = this.hostId === playerId;
    const wasCurrentTurn = this.status === 'PLAYING' && this.getCurrentTurnPlayer()?.id === playerId;

    if (wasHost) {
      this.electNewHost(playerId);
    }

    // Clear any previous disconnect timer for this player
    const prevTimer = this.disconnectTimers.get(playerId);
    if (prevTimer) {
      clearTimeout(prevTimer);
      this.disconnectTimers.delete(playerId);
    }

    if (this.status === 'LOBBY' || this.status === 'BOARD_SETUP') {
      const timer = setTimeout(() => {
        if (this.players.get(playerId)?.connectionStatus === 'disconnected') {
          this.removePlayer(playerId);
        }
      }, 30000);
      this.disconnectTimers.set(playerId, timer);
    } else if (this.status === 'PLAYING') {
      if (wasCurrentTurn) {
        this.advanceTurn();
      }
      this.checkGameCompletion();
    }

    this.broadcastState();
  }

  public removePlayer(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    const wasHost = this.hostId === playerId;
    const wasCurrentTurn = this.status === 'PLAYING' && this.getCurrentTurnPlayer()?.id === playerId;

    this.players.delete(playerId);
    this.claimedLinesByPlayer.delete(playerId);
    db.removePlayer(playerId);

    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    if (wasHost && this.players.size > 0) {
      this.electNewHost(playerId);
    }

    if (this.status === 'PLAYING') {
      if (wasCurrentTurn) {
        this.advanceTurn();
      }
      this.checkGameCompletion();
    }

    this.broadcastState();
  }

  public updateSettings(hostId: string, newSettings: Partial<RoomSettings>): { success: boolean; error?: string } {
    if (this.hostId !== hostId) {
      return { success: false, error: 'Only the host can change room settings' };
    }
    if (this.status !== 'LOBBY' && this.status !== 'BOARD_SETUP') {
      return { success: false, error: 'Cannot change settings once game has started' };
    }

    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    this.broadcastState();
    return { success: true };
  }

  // --- Board Setup & Readiness ---

  public setBoard(playerId: string, board: number[]): { success: boolean; error?: string } {
    if (this.status !== 'LOBBY' && this.status !== 'BOARD_SETUP') {
      return { success: false, error: 'Cannot change board once game has started' };
    }

    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const validation = validateBoard(board);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    player.board = [...board];
    player.isReady = true;

    // Transition room to BOARD_SETUP if currently in LOBBY
    if (this.status === 'LOBBY') {
      this.status = 'BOARD_SETUP';
    }

    this.broadcastState();
    return { success: true };
  }

  public unlockBoard(playerId: string): { success: boolean; error?: string } {
    if (this.status !== 'BOARD_SETUP' && this.status !== 'LOBBY') {
      return { success: false, error: 'Cannot unlock board once game has started' };
    }
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    player.isReady = false;
    this.broadcastState();
    return { success: true };
  }

  // --- Game Lifecycle ---

  public startGame(requesterId: string): { success: boolean; error?: string } {
    if (this.hostId !== requesterId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (this.players.size < 2) {
      return { success: false, error: 'At least 2 players are required to start the game' };
    }

    const allReady = Array.from(this.players.values()).every((p) => p.isReady && p.board !== null);
    if (!allReady) {
      return { success: false, error: 'All players must complete and lock their boards before starting' };
    }

    this.status = 'COUNTDOWN';
    this.broadcastState();

    let count = 3;
    if (this.callbacks) {
      this.callbacks.onCountdown(count);
    }

    this.countdownTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        if (this.callbacks) {
          this.callbacks.onCountdown(count);
        }
      } else {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
        if (this.callbacks) {
          this.callbacks.onCountdown(0); // 0 signifies "BINGO!"
        }
        this.startPlaying();
      }
    }, 1000);

    return { success: true };
  }

  private startPlaying() {
    this.status = 'PLAYING';
    this.turnIndex = 0;
    this.calledNumbers = [];
    this.lastCalledNumber = null;
    this.winnerHistory = [];
    this.claimedLinesByPlayer.clear();
    this.turnStartedAt = null;
    this.turnExpiresAt = null;
    this.turnSecondsLeft = null;

    for (const player of this.players.values()) {
      this.claimedLinesByPlayer.set(player.id, new Set());
      player.score = 0;
      player.bingoCount = 0;
      player.bingoProgress = 0;
      player.letters = [];
      player.completedLines = [];
      player.hasBingo = false;
      player.bingoRank = undefined;
    }

    db.resetCalledNumbers(this.code);
    db.resetBingoClaims(this.code);

    // Make sure initial turn index points to a connected player
    const playerList = this.getPlayerList();
    if (playerList.length > 0 && playerList[0].connectionStatus !== 'connected') {
      const firstConnected = playerList.findIndex((p) => p.connectionStatus === 'connected');
      if (firstConnected !== -1) {
        this.turnIndex = firstConnected;
      }
    }

    this.broadcastState();
    this.startTurnTimer();
  }

  private startTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    if (this.status !== 'PLAYING') {
      this.turnStartedAt = null;
      this.turnExpiresAt = null;
      this.turnSecondsLeft = null;
      return;
    }

    if (this.settings.turnTimeoutSeconds <= 0) {
      this.turnStartedAt = null;
      this.turnExpiresAt = null;
      this.turnSecondsLeft = null;
      return;
    }

    const timeoutSec = this.settings.turnTimeoutSeconds > 0 ? this.settings.turnTimeoutSeconds : 30;
    const now = Date.now();
    this.turnStartedAt = now;
    this.turnExpiresAt = now + timeoutSec * 1000;
    this.turnSecondsLeft = timeoutSec;

    this.turnTimer = setTimeout(() => {
      this.handleTurnTimeout();
    }, timeoutSec * 1000);
  }

  private handleTurnTimeout() {
    if (this.status !== 'PLAYING') return;

    // Pick a random uncalled number
    const calledSet = new Set(this.calledNumbers);
    const uncalled: number[] = [];
    for (let i = 1; i <= 25; i++) {
      if (!calledSet.has(i)) uncalled.push(i);
    }

    const currentTurn = this.getCurrentTurnPlayer();
    if (uncalled.length > 0 && currentTurn) {
      const randomNum = uncalled[Math.floor(Math.random() * uncalled.length)];
      this.callNumber(currentTurn.id, randomNum);
    } else if (uncalled.length === 0) {
      this.finishGame();
    } else {
      this.advanceTurn();
    }
  }

  public advanceTurn() {
    if (this.status !== 'PLAYING') return;

    const playerList = this.getPlayerList();
    if (playerList.length === 0) return;

    const connectedPlayers = playerList.filter((p) => p.connectionStatus === 'connected');
    if (connectedPlayers.length === 0) return;

    // Find next eligible player who is connected in circular order
    let nextIndex = (this.turnIndex + 1) % playerList.length;
    let attempts = 0;

    while (
      playerList[nextIndex].connectionStatus !== 'connected' &&
      attempts < playerList.length
    ) {
      nextIndex = (nextIndex + 1) % playerList.length;
      attempts++;
    }

    this.turnIndex = nextIndex;
    this.startTurnTimer();
    this.broadcastState();
  }

  /**
   * Evaluates if all active connected players have achieved Bingo, or if all numbers called.
   * If condition met, marks game as completed.
   */
  public checkGameCompletion(): boolean {
    if (this.status !== 'PLAYING') return false;

    const activePlayers = Array.from(this.players.values()).filter(
      (p) => p.connectionStatus === 'connected'
    );

    // If there are active connected players, game completes ONLY when all active connected players have achieved Bingo
    const allActiveHaveBingo =
      activePlayers.length > 0 &&
      activePlayers.every((p) => this.winnerHistory.some((w) => w.playerId === p.id));

    const all25Called = this.calledNumbers.length >= 25;

    if (allActiveHaveBingo || all25Called) {
      this.finishGame();
      return true;
    }

    return false;
  }

  // --- Core Gameplay: Number Calling ---

  public callNumber(playerId: string, number: number): { success: boolean; error?: string } {
    if (this.status !== 'PLAYING') {
      return { success: false, error: 'Game is not in PLAYING state' };
    }

    const currentTurn = this.getCurrentTurnPlayer();
    if (!currentTurn || currentTurn.id !== playerId) {
      return { success: false, error: 'It is not your turn to call a number' };
    }

    if (!Number.isInteger(number) || number < 1 || number > 25) {
      return { success: false, error: `Invalid number: ${number}. Must be between 1 and 25` };
    }

    if (this.calledNumbers.includes(number)) {
      return { success: false, error: `Number ${number} has already been called` };
    }

    // Server authoritative global strike:
    this.calledNumbers.push(number);
    this.lastCalledNumber = number;

    db.addCalledNumber({
      roomCode: this.code,
      number,
      calledById: playerId,
      timestamp: Date.now(),
    });

    // AUTOMATIC LINE DETECTION & B-I-N-G-O (5-LINE) PROGRESSION
    for (const p of this.players.values()) {
      if (!p.board) continue;
      const completedLines = getCompletedLines(p.board, this.calledNumbers);
      const claimedSet = this.claimedLinesByPlayer.get(p.id) || new Set<string>();

      // Filter only NEWLY completed lines not already counted
      const newLines = completedLines.filter((l) => !claimedSet.has(l.id));

      if (newLines.length > 0) {
        for (const line of newLines) {
          claimedSet.add(line.id);
        }
        this.claimedLinesByPlayer.set(p.id, claimedSet);

        const uniqueCount = claimedSet.size;
        p.bingoCount = uniqueCount;
        p.bingoProgress = Math.min(5, uniqueCount);
        p.letters = BINGO_LETTERS.slice(0, p.bingoProgress);
        p.completedLineIds = Array.from(claimedSet);
        p.completedLines = completedLines;

        // Points for newly completed lines
        p.score += newLines.length * 20;

        // WIN CONDITION: Exactly 5 UNIQUE completed lines spell B-I-N-G-O!
        if (p.bingoProgress >= 5) {
          const alreadyWon = this.winnerHistory.some((w) => w.playerId === p.id);
          if (!alreadyWon) {
            const rank = this.winnerHistory.length + 1;
            const cfg = this.settings.scoringConfig;
            let scoreAwarded = 0;
            if (rank === 1) scoreAwarded = cfg.first;
            else if (rank === 2) scoreAwarded = cfg.second;
            else if (rank === 3) scoreAwarded = cfg.third;
            else scoreAwarded = cfg.subsequent;

            p.score += scoreAwarded;
            p.hasBingo = true;
            p.bingoRank = rank;

            const record: WinnerRecord = {
              playerId: p.id,
              playerName: p.name,
              avatar: p.avatar,
              rank,
              lineCount: uniqueCount,
              scoreAwarded,
              timestamp: Date.now(),
            };

            this.winnerHistory.push(record);

            db.addBingoClaim({
              roomCode: this.code,
              playerId: p.id,
              lineId: Array.from(claimedSet).join(','),
              rank,
              scoreAwarded,
              timestamp: Date.now(),
            });

            if (this.callbacks) {
              this.callbacks.onBingoAnnounced({
                playerId: p.id,
                playerName: p.name,
                avatar: p.avatar,
                rank,
                totalLines: uniqueCount,
                newLines,
                scoreAwarded,
              });
            }
          }
        }
      }
    }

    // Check if all active connected players have completed Bingo or all 25 numbers called
    const isFinished = this.checkGameCompletion();
    if (isFinished) {
      return { success: true };
    }

    // Advance turn to next connected player
    const playerList = this.getPlayerList();
    let nextIndex = (this.turnIndex + 1) % playerList.length;
    let attempts = 0;
    while (
      playerList[nextIndex].connectionStatus !== 'connected' &&
      attempts < playerList.length
    ) {
      nextIndex = (nextIndex + 1) % playerList.length;
      attempts++;
    }
    this.turnIndex = nextIndex;
    const nextPlayer = playerList[nextIndex];

    if (this.callbacks) {
      this.callbacks.onNumberCalled({
        number,
        calledBy: { id: currentTurn.id, name: currentTurn.name },
        nextPlayerId: nextPlayer ? nextPlayer.id : null,
      });
    }

    this.startTurnTimer();
    this.broadcastState();

    return { success: true };
  }

  // --- Bingo Claim & Validation ---

  public claimBingo(
    playerId: string,
    specificLineId?: string
  ): {
    success: boolean;
    data?: { newLines: BingoLine[]; totalLines: number; rank?: number; scoreAwarded?: number };
    error?: string;
  } {
    if (this.status !== 'PLAYING') {
      return { success: false, error: 'Cannot claim Bingo when not in active gameplay' };
    }

    const player = this.players.get(playerId);
    if (!player || !player.board) {
      return { success: false, error: 'Player or board not found' };
    }

    const claimedSet = this.claimedLinesByPlayer.get(playerId) || new Set<string>();

    const validation = validateBingoClaim(
      player.board,
      this.calledNumbers,
      claimedSet,
      specificLineId
    );

    if (!validation.valid || validation.newLines.length === 0) {
      // If player already completed 5 lines and hasn't claimed win yet
      if (player.bingoProgress >= 5) {
        return {
          success: true,
          data: {
            newLines: [],
            totalLines: player.bingoCount,
            rank: this.winnerHistory.find((w) => w.playerId === playerId)?.rank,
            scoreAwarded: 0,
          },
        };
      }
      return { success: false, error: validation.error || 'No new Bingo lines completed' };
    }

    // Valid claim! Record each newly claimed line
    for (const line of validation.newLines) {
      claimedSet.add(line.id);
    }
    this.claimedLinesByPlayer.set(playerId, claimedSet);

    const totalLines = claimedSet.size;
    player.bingoCount = totalLines;
    player.bingoProgress = Math.min(5, totalLines);
    player.letters = BINGO_LETTERS.slice(0, player.bingoProgress);
    player.completedLineIds = Array.from(claimedSet);

    // WIN CONDITION: 5 UNIQUE LINES = B-I-N-G-O!
    let rank = 0;
    let scoreAwarded = 20 * validation.newLines.length;

    if (player.bingoProgress >= 5) {
      const alreadyWon = this.winnerHistory.some((w) => w.playerId === playerId);
      if (!alreadyWon) {
        rank = this.winnerHistory.length + 1;
        const cfg = this.settings.scoringConfig;
        if (rank === 1) scoreAwarded += cfg.first;
        else if (rank === 2) scoreAwarded += cfg.second;
        else if (rank === 3) scoreAwarded += cfg.third;
        else scoreAwarded += cfg.subsequent;

        player.score += scoreAwarded;
        player.hasBingo = true;
        player.bingoRank = rank;

        const record: WinnerRecord = {
          playerId: player.id,
          playerName: player.name,
          avatar: player.avatar,
          rank,
          lineCount: totalLines,
          scoreAwarded,
          timestamp: Date.now(),
        };

        this.winnerHistory.push(record);

        db.addBingoClaim({
          roomCode: this.code,
          playerId: player.id,
          lineId: Array.from(claimedSet).join(','),
          rank,
          scoreAwarded,
          timestamp: Date.now(),
        });

        if (this.callbacks) {
          this.callbacks.onBingoAnnounced({
            playerId: player.id,
            playerName: player.name,
            avatar: player.avatar,
            rank,
            totalLines,
            newLines: validation.newLines,
            scoreAwarded,
          });
        }
      }
    } else {
      player.score += scoreAwarded;
    }

    this.broadcastState();
    this.checkGameCompletion();

    return {
      success: true,
      data: {
        newLines: validation.newLines,
        totalLines,
        rank: rank > 0 ? rank : undefined,
        scoreAwarded,
      },
    };
  }

  public finishGame() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    this.turnStartedAt = null;
    this.turnExpiresAt = null;
    this.turnSecondsLeft = null;
    this.status = 'RESULTS';

    const finalScores = Array.from(this.players.values()).map((p) => ({
      playerId: p.id,
      name: p.name,
      score: p.score,
      lines: p.bingoCount,
    }));

    if (this.callbacks) {
      this.callbacks.onGameCompleted({
        winnerHistory: [...this.winnerHistory],
        finalScores,
      });
    }

    this.broadcastState();
  }

  // --- Rematch / Play Again ---

  public rematch(requesterId: string): { success: boolean; error?: string } {
    const player = this.players.get(requesterId);
    if (!player) return { success: false, error: 'Player not found' };

    // Reset boards, called numbers, claims, and return to BOARD_SETUP
    this.status = 'BOARD_SETUP';
    this.calledNumbers = [];
    this.lastCalledNumber = null;
    this.winnerHistory = [];
    this.claimedLinesByPlayer.clear();
    this.turnIndex = 0;
    this.turnStartedAt = null;
    this.turnExpiresAt = null;
    this.turnSecondsLeft = null;

    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    for (const p of this.players.values()) {
      p.board = null;
      p.isReady = false;
      p.bingoCount = 0;
      p.bingoProgress = 0;
      p.letters = [];
      p.completedLines = [];
      p.completedLineIds = [];
      p.hasBingo = false;
      p.bingoRank = undefined;
      this.claimedLinesByPlayer.set(p.id, new Set());
    }

    db.resetCalledNumbers(this.code);
    db.resetBingoClaims(this.code);

    this.broadcastState();
    return { success: true };
  }

  public destroy() {
    if (this.turnTimer) clearInterval(this.turnTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
  }
}
