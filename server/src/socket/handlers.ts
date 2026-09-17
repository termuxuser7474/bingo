import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomSettings,
} from '../shared/types.js';

import { roomManager } from '../game/RoomManager.js';
import { GameRoom } from '../game/GameRoom.js';

type CustomSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type CustomServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: CustomServer) {
  function attachRoomCallbacks(room: GameRoom) {
    room.setCallbacks({
      onStateUpdate: (state) => {
        io.to(`room:${room.code}`).emit('room:state_update', state);
      },
      onCountdown: (count) => {
        io.to(`room:${room.code}`).emit('game:countdown', count);
      },
      onNumberCalled: (payload) => {
        io.to(`room:${room.code}`).emit('number:called', payload);
      },
      onBingoAnnounced: (payload) => {
        io.to(`room:${room.code}`).emit('bingo:announced', payload);
      },
      onGameCompleted: (payload) => {
        io.to(`room:${room.code}`).emit('game:completed', payload);
      },
    });
  }

  io.on('connection', (socket: CustomSocket) => {
    // 1. Create Room
    socket.on('room:create', ({ playerName, avatar, settings }, callback) => {
      try {
        const room = roomManager.createRoom({ name: playerName, avatar }, settings);
        attachRoomCallbacks(room);

        const host = room.getPlayerList()[0];
        socket.join(`room:${room.code}`);
        roomManager.bindSocket(socket.id, room.code, host.id);

        callback({
          success: true,
          data: {
            room: room.toState(),
            playerId: host.id,
            reconnectToken: host.reconnectToken,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create room';
        callback({ success: false, error: message });
      }
    });

    // 2. Join Room
    socket.on('room:join', ({ roomCode, playerName, avatar }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          return callback({ success: false, error: 'Room does not exist' });
        }

        const result = room.addPlayer(playerName, avatar);
        if (!result.success || !result.player) {
          return callback({ success: false, error: result.error || 'Failed to join room' });
        }

        socket.join(`room:${room.code}`);
        roomManager.bindSocket(socket.id, room.code, result.player.id);

        socket.to(`room:${room.code}`).emit('player:joined', result.player);

        callback({
          success: true,
          data: {
            room: room.toState(),
            playerId: result.player.id,
            reconnectToken: result.player.reconnectToken,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to join room';
        callback({ success: false, error: message });
      }
    });

    // 3. Reconnect
    socket.on('room:reconnect', ({ roomCode, playerId, reconnectToken }, callback) => {
      try {
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          return callback({ success: false, error: 'Room not found' });
        }

        const result = room.reconnectPlayer(playerId, reconnectToken);
        if (!result.success || !result.player) {
          return callback({ success: false, error: result.error || 'Reconnect failed' });
        }

        socket.join(`room:${room.code}`);
        roomManager.bindSocket(socket.id, room.code, playerId);

        callback({
          success: true,
          data: {
            room: room.toState(),
            playerId,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Reconnect failed';
        callback({ success: false, error: message });
      }
    });

    // 4. Update Settings
    socket.on('room:update_settings', ({ settings }, callback) => {
      const binding = roomManager.getPlayerBySocket(socket.id);
      if (!binding) return callback({ success: false, error: 'Not in a room' });

      const room = roomManager.getRoom(binding.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const result = room.updateSettings(binding.playerId, settings);
      callback(result);
    });

    // 5. Lock Board
    socket.on('board:lock', ({ board }, callback) => {
      const binding = roomManager.getPlayerBySocket(socket.id);
      if (!binding) return callback({ success: false, error: 'Not in a room' });

      const room = roomManager.getRoom(binding.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const result = room.setBoard(binding.playerId, board);
      callback(result);
    });

    // 6. Unlock Board
    socket.on('board:unlock', (callback) => {
      const binding = roomManager.getPlayerBySocket(socket.id);
      if (!binding) return callback({ success: false, error: 'Not in a room' });

      const room = roomManager.getRoom(binding.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const result = room.unlockBoard(binding.playerId);
      callback(result);
    });

    // 7. Start Game
    socket.on('game:start', (callback) => {
      const binding = roomManager.getPlayerBySocket(socket.id);
      if (!binding) return callback({ success: false, error: 'Not in a room' });

      const room = roomManager.getRoom(binding.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const result = room.startGame(binding.playerId);
      callback(result);
    });

    // 8. Call Number
    socket.on('turn:call_number', ({ number }, callback) => {
      const binding = roomManager.getPlayerBySocket(socket.id);
      if (!binding) return callback({ success: false, error: 'Not in a room' });

      const room = roomManager.getRoom(binding.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const result = room.callNumber(binding.playerId, number);
      callback(result);
    });

    // 9. Claim Bingo
    socket.on('bingo:claim', ({ lineId }, callback) => {
      const binding = roomManager.getPlayerBySocket(socket.id);
      if (!binding) return callback({ success: false, error: 'Not in a room' });

      const room = roomManager.getRoom(binding.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const result = room.claimBingo(binding.playerId, lineId);
      callback(result);
    });

    // 10. Rematch
    socket.on('room:rematch', (callback) => {
      const binding = roomManager.getPlayerBySocket(socket.id);
      if (!binding) return callback({ success: false, error: 'Not in a room' });

      const room = roomManager.getRoom(binding.roomCode);
      if (!room) return callback({ success: false, error: 'Room not found' });

      const result = room.rematch(binding.playerId);
      callback(result);
    });

    // 11. Leave Room
    socket.on('room:leave', () => {
      const binding = roomManager.unbindSocket(socket.id);
      if (binding) {
        socket.leave(`room:${binding.roomCode}`);
        const room = roomManager.getRoom(binding.roomCode);
        if (room) {
          room.removePlayer(binding.playerId);
          socket.to(`room:${binding.roomCode}`).emit('player:left', binding.playerId);
        }
      }
    });

    // 12. Socket Disconnect
    socket.on('disconnect', () => {
      const binding = roomManager.unbindSocket(socket.id);
      if (binding) {
        const room = roomManager.getRoom(binding.roomCode);
        if (room) {
          room.handleDisconnect(binding.playerId);
        }
      }
    });
  });
}
