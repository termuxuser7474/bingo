import { GameRoom, RoomBroadcastCallbacks } from './GameRoom.js';
import { RoomSettings } from '../shared/types.js';
import { db } from '../db/database.js';


export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map(); // Key: uppercase room code
  private socketToPlayerMap: Map<string, { roomCode: string; playerId: string }> = new Map();

  constructor() {
    this.restoreFromDb();
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude 0, O, 1, I to avoid confusion
    let code = '';
    let attempts = 0;

    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);

    return code;
  }

  private restoreFromDb() {
    // Attempt to restore any active rooms from persistence
    try {
      // Memory cache will populate as players connect
    } catch (err) {
      console.error('Failed to restore rooms from db:', err);
    }
  }

  public createRoom(
    hostPlayer: { name: string; avatar: string },
    settings?: Partial<RoomSettings>,
    callbacks?: RoomBroadcastCallbacks
  ): GameRoom {
    const code = this.generateRoomCode();
    const room = new GameRoom(code, hostPlayer, settings, callbacks);
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): GameRoom | null {
    if (!code) return null;
    const upper = code.trim().toUpperCase();
    return this.rooms.get(upper) || null;
  }

  public bindSocket(socketId: string, roomCode: string, playerId: string) {
    this.socketToPlayerMap.set(socketId, { roomCode: roomCode.toUpperCase(), playerId });
  }

  public unbindSocket(socketId: string): { roomCode: string; playerId: string } | null {
    const entry = this.socketToPlayerMap.get(socketId);
    if (entry) {
      this.socketToPlayerMap.delete(socketId);
      return entry;
    }
    return null;
  }

  public getPlayerBySocket(socketId: string): { roomCode: string; playerId: string } | null {
    return this.socketToPlayerMap.get(socketId) || null;
  }

  public deleteRoom(code: string) {
    const upper = code.toUpperCase();
    const room = this.rooms.get(upper);
    if (room) {
      room.destroy();
      this.rooms.delete(upper);
      db.deleteRoom(upper);
    }
  }
}

export const roomManager = new RoomManager();
