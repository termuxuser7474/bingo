import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'bingo_db.json');

export interface RoomRecord {
  id: string;
  code: string; // indexed
  hostId: string;
  status: string;
  settingsJson: string;
  winnerHistoryJson: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerRecord {
  id: string;
  roomCode: string; // indexed
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  boardJson: string | null;
  score: number;
  bingoCount: number;
  claimedLinesJson: string; // JSON array of line IDs
  reconnectToken: string;
  connectionStatus: 'connected' | 'disconnected';
  lastSeen: number;
}

export interface CalledNumberRecord {
  roomCode: string;
  number: number;
  calledById: string;
  timestamp: number;
}

export interface BingoClaimRecord {
  roomCode: string;
  playerId: string;
  lineId: string;
  rank: number;
  scoreAwarded: number;
  timestamp: number;
}

export interface DatabaseSchema {
  rooms: Record<string, RoomRecord>; // Key: room code
  players: Record<string, PlayerRecord>; // Key: playerId
  playersByRoom: Record<string, string[]>; // Room code -> array of playerIds (indexed)
  calledNumbers: CalledNumberRecord[];
  bingoClaims: BingoClaimRecord[];
}

class BingoDatabase {
  private data: DatabaseSchema = {
    rooms: {},
    players: {},
    playersByRoom: {},
    calledNumbers: [],
    bingoClaims: [],
  };

  private isDirty = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.saveSync();
      }
    } catch (err) {
      console.warn('Could not load database file, initializing clean database in memory:', err);
      this.data = {
        rooms: {},
        players: {},
        playersByRoom: {},
        calledNumbers: [],
        bingoClaims: [],
      };
    }
  }

  private scheduleSave() {
    this.isDirty = true;
    if (!this.saveTimeout) {
      this.saveTimeout = setTimeout(() => {
        this.saveSync();
        this.saveTimeout = null;
      }, 500);
    }
  }

  public saveSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      this.isDirty = false;
    } catch (err) {
      console.error('Failed to write database to disk:', err);
    }
  }

  // Room methods
  public saveRoom(room: RoomRecord) {
    this.data.rooms[room.code] = { ...room, updatedAt: Date.now() };
    if (!this.data.playersByRoom[room.code]) {
      this.data.playersByRoom[room.code] = [];
    }
    this.scheduleSave();
  }

  public getRoomByCode(code: string): RoomRecord | null {
    return this.data.rooms[code.toUpperCase()] || null;
  }

  public deleteRoom(code: string) {
    const upper = code.toUpperCase();
    const playerIds = this.data.playersByRoom[upper] || [];
    for (const pid of playerIds) {
      delete this.data.players[pid];
    }
    delete this.data.playersByRoom[upper];
    delete this.data.rooms[upper];
    this.data.calledNumbers = this.data.calledNumbers.filter((c) => c.roomCode !== upper);
    this.data.bingoClaims = this.data.bingoClaims.filter((c) => c.roomCode !== upper);
    this.scheduleSave();
  }

  // Player methods
  public savePlayer(player: PlayerRecord) {
    const upperCode = player.roomCode.toUpperCase();
    this.data.players[player.id] = { ...player, roomCode: upperCode, lastSeen: Date.now() };

    if (!this.data.playersByRoom[upperCode]) {
      this.data.playersByRoom[upperCode] = [];
    }
    if (!this.data.playersByRoom[upperCode].includes(player.id)) {
      this.data.playersByRoom[upperCode].push(player.id);
    }

    this.scheduleSave();
  }

  public getPlayerById(playerId: string): PlayerRecord | null {
    return this.data.players[playerId] || null;
  }

  public getPlayersInRoom(roomCode: string): PlayerRecord[] {
    const upper = roomCode.toUpperCase();
    const ids = this.data.playersByRoom[upper] || [];
    return ids.map((id) => this.data.players[id]).filter(Boolean);
  }

  public removePlayer(playerId: string) {
    const player = this.data.players[playerId];
    if (player) {
      const upper = player.roomCode.toUpperCase();
      if (this.data.playersByRoom[upper]) {
        this.data.playersByRoom[upper] = this.data.playersByRoom[upper].filter((id) => id !== playerId);
      }
      delete this.data.players[playerId];
      this.scheduleSave();
    }
  }

  // Called Numbers
  public addCalledNumber(record: CalledNumberRecord) {
    record.roomCode = record.roomCode.toUpperCase();
    this.data.calledNumbers.push(record);
    this.scheduleSave();
  }

  public getCalledNumbers(roomCode: string): CalledNumberRecord[] {
    const upper = roomCode.toUpperCase();
    return this.data.calledNumbers.filter((c) => c.roomCode === upper);
  }

  public resetCalledNumbers(roomCode: string) {
    const upper = roomCode.toUpperCase();
    this.data.calledNumbers = this.data.calledNumbers.filter((c) => c.roomCode !== upper);
    this.scheduleSave();
  }

  // Bingo Claims
  public addBingoClaim(record: BingoClaimRecord) {
    record.roomCode = record.roomCode.toUpperCase();
    this.data.bingoClaims.push(record);
    this.scheduleSave();
  }

  public getBingoClaims(roomCode: string): BingoClaimRecord[] {
    const upper = roomCode.toUpperCase();
    return this.data.bingoClaims.filter((c) => c.roomCode === upper);
  }

  public resetBingoClaims(roomCode: string) {
    const upper = roomCode.toUpperCase();
    this.data.bingoClaims = this.data.bingoClaims.filter((c) => c.roomCode !== upper);
    this.scheduleSave();
  }
}

export const db = new BingoDatabase();
