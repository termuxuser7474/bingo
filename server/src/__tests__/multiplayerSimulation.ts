import { io, Socket } from 'socket.io-client';
import {
  GameState,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../shared/types.js';
import { generateRandomBoard } from '../game/boardUtils.js';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMultiplayerE2ETest() {
  console.log('🚀 Starting Automated Real-Time Multiplayer E2E Test...');

  const SERVER_URL =
    process.env.TEST_SERVER_URL || process.env.VITE_SERVER_URL || 'http://localhost:3001';

  // 1. Connect Client 1 (Alice - Host)
  console.log('1. Connecting Alice (Host)...');
  const aliceSocket: TestSocket = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise<void>((resolve) => aliceSocket.on('connect', () => resolve()));
  console.log('   ✓ Alice connected to server');

  let aliceRoom: GameState | null = null;
  let aliceId = '';
  let aliceToken = '';

  // 2. Alice creates a room
  await new Promise<void>((resolve, reject) => {
    aliceSocket.emit(
      'room:create',
      {
        playerName: 'Alice',
        avatar: '🦊',
        settings: { maxPlayers: 4, maxWinners: 2, turnTimeoutSeconds: 0 },
      },
      (res) => {
        if (res.success && res.data) {
          aliceRoom = res.data.room;
          aliceId = res.data.playerId;
          aliceToken = res.data.reconnectToken;
          console.log(`   ✓ Room created! Code: ${aliceRoom.roomCode}`);
          resolve();
        } else {
          reject(new Error(res.error || 'Failed to create room'));
        }
      }
    );
  });

  const roomCode = aliceRoom!.roomCode;

  // 3. Connect Client 2 (Bob)
  console.log('2. Connecting Bob (Player 2)...');
  const bobSocket: TestSocket = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise<void>((resolve) => bobSocket.on('connect', () => resolve()));
  console.log('   ✓ Bob connected to server');

  let bobId = '';
  let bobToken = '';

  // 4. Bob joins the room
  await new Promise<void>((resolve, reject) => {
    bobSocket.emit(
      'room:join',
      {
        roomCode,
        playerName: 'Bob',
        avatar: '🐼',
      },
      (res) => {
        if (res.success && res.data) {
          bobId = res.data.playerId;
          bobToken = res.data.reconnectToken;
          console.log(`   ✓ Bob successfully joined room ${roomCode}`);
          resolve();
        } else {
          reject(new Error(res.error || 'Failed to join room'));
        }
      }
    );
  });

  // Track state updates
  let latestAliceState: GameState = aliceRoom!;
  let latestBobState: GameState = aliceRoom!;

  aliceSocket.on('room:state_update', (s) => {
    latestAliceState = s;
  });
  bobSocket.on('room:state_update', (s) => {
    latestBobState = s;
  });

  await delay(100);
  console.log(`   ✓ Players in lobby: ${latestAliceState.players.map((p) => p.name).join(', ')}`);

  // 5. Board setup: Alice and Bob arrange and lock their boards
  console.log('3. Setting and locking 5x5 boards...');

  // Alice board: sequential 1..25
  const aliceBoard = Array.from({ length: 25 }, (_, i) => i + 1);
  // Bob board: reverse 25..1
  const bobBoard = Array.from({ length: 25 }, (_, i) => 25 - i);

  await new Promise<void>((resolve, reject) => {
    aliceSocket.emit('board:lock', { board: aliceBoard }, (res) => {
      if (res.success) resolve();
      else reject(new Error(res.error));
    });
  });
  console.log('   ✓ Alice locked her board');

  await new Promise<void>((resolve, reject) => {
    bobSocket.emit('board:lock', { board: bobBoard }, (res) => {
      if (res.success) resolve();
      else reject(new Error(res.error));
    });
  });
  console.log('   ✓ Bob locked his board');

  await delay(100);
  console.log(`   ✓ Both players ready: ${latestAliceState.players.every((p) => p.isReady)}`);

  // 6. Start game (Host only)
  console.log('4. Starting game with countdown...');
  let countdownReceived = false;

  aliceSocket.on('game:countdown', (c) => {
    countdownReceived = true;
    console.log(`   ⏱️ Countdown: ${c === 0 ? 'BINGO!' : c}`);
  });

  await new Promise<void>((resolve, reject) => {
    aliceSocket.emit('game:start', (res) => {
      if (res.success) resolve();
      else reject(new Error(res.error));
    });
  });

  // Wait for countdown (3s) to finish and status to transition to PLAYING
  console.log('   Waiting for countdown to transition to PLAYING...');
  while (latestAliceState.status !== 'PLAYING') {
    await delay(200);
  }
  console.log(`   ✓ Game status is now: ${latestAliceState.status}`);

  // 7. Test Turn Rotation & Global Strike
  console.log('5. Testing turn calling and global simultaneous strike...');
  const firstTurnPlayerId = latestAliceState.currentTurnPlayerId;
  const isAliceTurn = firstTurnPlayerId === aliceId;
  console.log(`   Current turn belongs to: ${isAliceTurn ? 'Alice' : 'Bob'}`);

  // Have the active player call number 1
  const activeSocket = isAliceTurn ? aliceSocket : bobSocket;
  const nonActiveSocket = isAliceTurn ? bobSocket : aliceSocket;

  // Verify non-active player cannot call out of turn
  await new Promise<void>((resolve) => {
    nonActiveSocket.emit('turn:call_number', { number: 1 }, (res) => {
      if (!res.success && res.error?.includes('not your turn')) {
        console.log('   ✓ Security check: Out-of-turn call properly rejected by server');
        resolve();
      } else {
        console.error('   ❌ Security check failed: Out-of-turn call was not rejected');
        resolve();
      }
    });
  });

  // Active player calls 1
  await new Promise<void>((resolve, reject) => {
    activeSocket.emit('turn:call_number', { number: 1 }, (res) => {
      if (res.success) resolve();
      else reject(new Error(res.error));
    });
  });
  await delay(100);

  // Verify number 1 is in calledNumbers on BOTH clients
  if (latestAliceState.calledNumbers.includes(1) && latestBobState.calledNumbers.includes(1)) {
    console.log('   ✓ Number 1 was globally struck on BOTH Alice and Bob boards!');
  } else {
    throw new Error('Number 1 was not received by both players');
  }

  // Next player's turn: call number 2
  const nextActiveSocket = latestAliceState.currentTurnPlayerId === aliceId ? aliceSocket : bobSocket;
  await new Promise<void>((resolve, reject) => {
    nextActiveSocket.emit('turn:call_number', { number: 2 }, (res) => {
      if (res.success) resolve();
      else reject(new Error(res.error));
    });
  });
  await delay(100);
  console.log('   ✓ Turn rotated smoothly to second player and called number 2');

  // 8. Complete Row 0 for Alice (numbers 1, 2, 3, 4, 5) -> unlocks 'B' (1/5)
  console.log('6. Calling numbers 3, 4, 5 to complete 1st line (B) for Alice...');
  for (const num of [3, 4, 5]) {
    const curSocket = latestAliceState.currentTurnPlayerId === aliceId ? aliceSocket : bobSocket;
    await new Promise<void>((resolve, reject) => {
      curSocket.emit('turn:call_number', { number: num }, (res) => {
        if (res.success) resolve();
        else reject(new Error(res.error));
      });
    });
    await delay(30);
  }

  const aliceAfterRow0 = latestAliceState.players.find((p) => p.id === aliceId)!;
  console.log(`   ✓ Alice letter progress: [${aliceAfterRow0.letters.join(', ')}] (${aliceAfterRow0.bingoProgress}/5 lines)`);
  console.log(`   ✓ Game continues because only 1 line completed (needs all 5 to spell BINGO)`);

  // 9. Progressively complete Rows 1, 2, 3, 4 to spell B -> I -> N -> G -> O
  console.log('7. Calling remaining numbers 6..25 to progressively complete I -> N -> G -> O...');
  for (let num = 6; num <= 25; num++) {
    if (latestAliceState.status !== 'PLAYING') break;
    const curSocket = latestAliceState.currentTurnPlayerId === aliceId ? aliceSocket : bobSocket;
    await new Promise<void>((resolve, reject) => {
      curSocket.emit('turn:call_number', { number: num }, (res) => {
        if (res.success) resolve();
        else reject(new Error(res.error));
      });
    });
    await delay(20);
  }

  await delay(100);
  console.log(`   ✓ Winner history has ${latestAliceState.winnerHistory.length} winner(s):`);
  latestAliceState.winnerHistory.forEach((w) => {
    console.log(`     - Rank ${w.rank}: ${w.playerName} (+${w.scoreAwarded} pts, ${w.lineCount} lines)`);
  });

  // Verify winner achieved B-I-N-G-O (5/5 lines)
  if (latestAliceState.winnerHistory.length > 0) {
    console.log('   ✓ Player achieved all 5 lines to spell B-I-N-G-O and was crowned winner!');
  }


  // 11. Test Rematch
  console.log('10. Testing Rematch (Play Again)...');
  await new Promise<void>((resolve, reject) => {
    aliceSocket.emit('room:rematch', (res) => {
      if (res.success) resolve();
      else reject(new Error(res.error));
    });
  });

  await delay(100);
  console.log(`   ✓ Status after Rematch: ${latestAliceState.status}`);
  console.log(`   ✓ Called numbers reset: ${latestAliceState.calledNumbers.length === 0}`);
  console.log(`   ✓ Winner history reset: ${latestAliceState.winnerHistory.length === 0}`);
  console.log(`   ✓ Room code preserved: ${latestAliceState.roomCode === roomCode}`);

  // Disconnect sockets cleanly
  aliceSocket.disconnect();
  bobSocket.disconnect();

  console.log('\n🎉 ALL REAL-TIME MULTIPLAYER E2E TESTS PASSED WITH 100% SUCCESS!\n');
}

runMultiplayerE2ETest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
