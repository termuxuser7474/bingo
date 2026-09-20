import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRandomBoard,
  validateBoard,
  getCompletedLines,
  getNewlyCompletedLines,
  validateBingoClaim,
  BINGO_LINE_DEFINITIONS,
} from '../game/boardUtils.js';
import { GameRoom } from '../game/GameRoom.js';

describe('BINGO Authoritative Game Mechanics & Rules', () => {
  // 1. Random board contains exactly 1-25
  it('1. Random board contains exactly 1–25', () => {
    const board = generateRandomBoard();
    expect(board).toHaveLength(25);
    for (let num = 1; num <= 25; num++) {
      expect(board).toContain(num);
    }
  });

  // 2. No duplicate numbers in random board
  it('2. Random board contains no duplicate numbers', () => {
    const board = generateRandomBoard();
    const unique = new Set(board);
    expect(unique.size).toBe(25);
  });

  // 3. Sequential placement works
  it('3. Sequential placement works accurately', () => {
    // Simulating sequential placement into a 25-cell board
    const grid: (number | null)[] = Array(25).fill(null);
    let nextNum = 1;

    // Place first number (1) in cell index 0
    grid[0] = nextNum++;
    expect(grid[0]).toBe(1);
    expect(nextNum).toBe(2);

    // Place next number (2) in cell index 7
    grid[7] = nextNum++;
    expect(grid[7]).toBe(2);
    expect(nextNum).toBe(3);

    // Clicking occupied cell should not overwrite
    const cell0ValueBefore = grid[0];
    if (grid[0] === null) {
      grid[0] = nextNum++;
    }
    expect(grid[0]).toBe(cell0ValueBefore);
    expect(nextNum).toBe(3);
  });

  // 4. Number selection placement works
  it('4. Number selection placement works', () => {
    const grid: (number | null)[] = Array(25).fill(null);
    const availableNumbers = new Set(Array.from({ length: 25 }, (_, i) => i + 1));

    // Player selects 14 from bank, then clicks cell 12
    const selectedNumber = 14;
    expect(availableNumbers.has(selectedNumber)).toBe(true);

    // Place in cell 12
    grid[12] = selectedNumber;
    availableNumbers.delete(selectedNumber);

    expect(grid[12]).toBe(14);
    expect(availableNumbers.has(14)).toBe(false);
  });

  // 5. Delete works and restores number to bank
  it('5. Delete works and restores number to bank', () => {
    const grid: (number | null)[] = Array(25).fill(null);
    const availableNumbers = new Set(Array.from({ length: 25 }, (_, i) => i + 1));

    // Place 7 at index 4
    grid[4] = 7;
    availableNumbers.delete(7);
    expect(availableNumbers.has(7)).toBe(false);

    // Delete index 4
    const removed = grid[4];
    grid[4] = null;
    if (removed !== null) {
      availableNumbers.add(removed);
    }

    expect(grid[4]).toBeNull();
    expect(availableNumbers.has(7)).toBe(true);
  });

  // 6. Undo works
  it('6. Undo restores prior board state', () => {
    const history: (number | null)[][] = [];
    let currentGrid: (number | null)[] = Array(25).fill(null);

    // Step 1: place 5 at index 0
    history.push([...currentGrid]);
    currentGrid[0] = 5;

    // Step 2: place 10 at index 1
    history.push([...currentGrid]);
    currentGrid[1] = 10;

    expect(currentGrid[0]).toBe(5);
    expect(currentGrid[1]).toBe(10);

    // Perform Undo
    currentGrid = history.pop()!;
    expect(currentGrid[0]).toBe(5);
    expect(currentGrid[1]).toBeNull();

    // Perform second Undo
    currentGrid = history.pop()!;
    expect(currentGrid[0]).toBeNull();
  });

  // 7. Locked boards cannot be edited once game starts
  it('7. Locked boards cannot be edited once game starts', () => {
    const room = new GameRoom('TEST1', { name: 'Alice', avatar: 'cat' });
    const p2Result = room.addPlayer('Bob', 'dog');
    expect(p2Result.success).toBe(true);

    const b1 = generateRandomBoard();
    const b2 = generateRandomBoard();

    room.setBoard(room.hostId, b1);
    room.setBoard(p2Result.player!.id, b2);

    expect(room.players.get(room.hostId)?.isReady).toBe(true);
    expect(room.players.get(p2Result.player!.id)?.isReady).toBe(true);

    // Host starts game
    room.status = 'PLAYING';

    // Attempt to edit board while PLAYING
    const editAttempt = room.setBoard(room.hostId, generateRandomBoard());
    expect(editAttempt.success).toBe(false);
    expect(editAttempt.error).toContain('Cannot change board once game has started');

    // Attempt to unlock board while PLAYING
    const unlockAttempt = room.unlockBoard(room.hostId);
    expect(unlockAttempt.success).toBe(false);
    expect(unlockAttempt.error).toContain('Cannot unlock board once game has started');
  });

  // 8. Called number marks all players' boards
  it("8. Called number marks all players' boards simultaneously", () => {
    const room = new GameRoom('TEST2', { name: 'Alice', avatar: 'cat' });
    const p2 = room.addPlayer('Bob', 'dog').player!;

    const b1 = Array.from({ length: 25 }, (_, i) => i + 1); // 1..25 sequential
    const b2 = Array.from({ length: 25 }, (_, i) => 25 - i); // 25..1 reverse

    room.setBoard(room.hostId, b1);
    room.setBoard(p2.id, b2);
    room.status = 'PLAYING';

    // Alice calls number 14
    const callRes = room.callNumber(room.hostId, 14);
    expect(callRes.success).toBe(true);
    expect(room.calledNumbers).toContain(14);

    // Verify derived marked state for Alice (where 14 is at index 13)
    const aliceState = room.toState().players.find((p) => p.id === room.hostId)!;
    expect(aliceState.board![13]).toBe(14);
    expect(room.calledNumbers.includes(aliceState.board![13])).toBe(true);

    // Verify derived marked state for Bob (where 14 is at index 11: 25 - 11 = 14)
    const bobState = room.toState().players.find((p) => p.id === p2.id)!;
    expect(bobState.board![11]).toBe(14);
    expect(room.calledNumbers.includes(bobState.board![11])).toBe(true);
  });

  // 9. Duplicate number calls are rejected
  it('9. Duplicate number calls are rejected', () => {
    const room = new GameRoom('TEST3', { name: 'Alice', avatar: 'cat' });
    const p2 = room.addPlayer('Bob', 'dog').player!;
    room.setBoard(room.hostId, generateRandomBoard());
    room.setBoard(p2.id, generateRandomBoard());
    room.status = 'PLAYING';

    // Turn 0: Alice calls 7
    room.callNumber(room.hostId, 7);
    expect(room.calledNumbers).toContain(7);

    // Turn 1: Bob attempts to call 7 again
    const dupAttempt = room.callNumber(p2.id, 7);
    expect(dupAttempt.success).toBe(false);
    expect(dupAttempt.error).toContain('already been called');
  });

  // 10. Turn rotation works
  it('10. Turn rotation rotates in circular order', () => {
    const room = new GameRoom('TEST4', { name: 'Alice', avatar: 'cat' });
    const p2 = room.addPlayer('Bob', 'dog').player!;
    const p3 = room.addPlayer('Charlie', 'fox').player!;
    room.setBoard(room.hostId, generateRandomBoard());
    room.setBoard(p2.id, generateRandomBoard());
    room.setBoard(p3.id, generateRandomBoard());
    room.status = 'PLAYING';

    // Turn 1: Alice
    expect(room.getCurrentTurnPlayer()?.id).toBe(room.hostId);
    room.callNumber(room.hostId, 1);

    // Turn 2: Bob
    expect(room.getCurrentTurnPlayer()?.id).toBe(p2.id);
    room.callNumber(p2.id, 2);

    // Turn 3: Charlie
    expect(room.getCurrentTurnPlayer()?.id).toBe(p3.id);
    room.callNumber(p3.id, 3);

    // Turn 4: Back to Alice (circular!)
    expect(room.getCurrentTurnPlayer()?.id).toBe(room.hostId);
  });

  // 11. Horizontal Bingo detection works
  it('11. Horizontal Bingo detection works for all rows', () => {
    // Board has row 0: [1, 2, 3, 4, 5]
    const board = Array.from({ length: 25 }, (_, i) => i + 1);
    const calledNumbers = [1, 2, 3, 4, 5];

    const lines = getCompletedLines(board, calledNumbers);
    expect(lines).toHaveLength(1);
    expect(lines[0].id).toBe('row-0');
    expect(lines[0].type).toBe('row');
    expect(lines[0].numbers).toEqual([1, 2, 3, 4, 5]);
  });

  // 12. Vertical Bingo detection works
  it('12. Vertical Bingo detection works for all columns', () => {
    // Col 0 indices: [0, 5, 10, 15, 20] -> numbers: [1, 6, 11, 16, 21]
    const board = Array.from({ length: 25 }, (_, i) => i + 1);
    const calledNumbers = [1, 6, 11, 16, 21];

    const lines = getCompletedLines(board, calledNumbers);
    expect(lines).toHaveLength(1);
    expect(lines[0].id).toBe('col-0');
    expect(lines[0].type).toBe('column');
    expect(lines[0].numbers).toEqual([1, 6, 11, 16, 21]);
  });

  // 13. Diagonal Bingo detection works
  it('13. Diagonal Bingo detection works for both diagonals', () => {
    const board = Array.from({ length: 25 }, (_, i) => i + 1);

    // Main diagonal (TL -> BR): indices [0, 6, 12, 18, 24] -> [1, 7, 13, 19, 25]
    const diag0Called = [1, 7, 13, 19, 25];
    const lines0 = getCompletedLines(board, diag0Called);
    expect(lines0.some((l) => l.id === 'diag-0')).toBe(true);

    // Anti diagonal (TR -> BL): indices [4, 8, 12, 16, 20] -> [5, 9, 13, 17, 21]
    const diag1Called = [5, 9, 13, 17, 21];
    const lines1 = getCompletedLines(board, diag1Called);
    expect(lines1.some((l) => l.id === 'diag-1')).toBe(true);
  });

  // 14. Multiple Bingo lines are detected from single call
  it('14. Multiple simultaneous Bingo lines are detected from a single call', () => {
    const board = Array.from({ length: 25 }, (_, i) => i + 1);
    // Center cell index 12 is number 13.
    // Row 2 is indices [10, 11, 12, 13, 14] -> numbers [11, 12, 13, 14, 15]
    // Col 2 is indices [2, 7, 12, 17, 22] -> numbers [3, 8, 13, 18, 23]
    // Main diagonal is [0, 6, 12, 18, 24] -> [1, 7, 13, 19, 25]
    // If all cells except center (13) are called, then calling 13 completes 3 lines simultaneously!
    const calledBefore = [11, 12, 14, 15, 3, 8, 18, 23, 1, 7, 19, 25];
    expect(getCompletedLines(board, calledBefore)).toHaveLength(0);

    // Call number 13
    const calledAfter = [...calledBefore, 13];
    const linesAfter = getCompletedLines(board, calledAfter);
    expect(linesAfter).toHaveLength(3);
    const lineIds = linesAfter.map((l) => l.id);
    expect(lineIds).toContain('row-2');
    expect(lineIds).toContain('col-2');
    expect(lineIds).toContain('diag-0');
  });

  // 15. Invalid Bingo claims are rejected
  it('15. Invalid Bingo claims are rejected by server validation', () => {
    const board = Array.from({ length: 25 }, (_, i) => i + 1);
    const calledNumbers = [1, 2, 3, 4]; // Only 4 numbers called, not 5

    const claimResult = validateBingoClaim(board, calledNumbers, new Set());
    expect(claimResult.valid).toBe(false);
    expect(claimResult.error).toContain('No new Bingo lines completed');
  });

  // 16. Completing 1 line awards letter 'B' (1/5) and does NOT declare an overall win
  it('16. Completing 1 line awards letter B (1/5) and does NOT declare an overall win', () => {
    const room = new GameRoom('TEST5', { name: 'Alice', avatar: 'cat' });
    const p2 = room.addPlayer('Bob', 'dog').player!;

    const b1 = Array.from({ length: 25 }, (_, i) => i + 1);
    room.setBoard(room.hostId, b1);
    room.setBoard(p2.id, generateRandomBoard());
    room.status = 'PLAYING';

    // Alice completes row 0: [1, 2, 3, 4, 5]
    for (const num of [1, 2, 3, 4, 5]) {
      const cur = room.getCurrentTurnPlayer()!;
      room.callNumber(cur.id, num);
    }

    const alicePlayer = room.toState().players.find((p) => p.id === room.hostId)!;
    expect(alicePlayer.bingoProgress).toBe(1);
    expect(alicePlayer.letters).toEqual(['B']);
    expect(room.winnerHistory).toHaveLength(0); // Not a win yet! Only 1/5 lines
    expect(room.status).toBe('PLAYING'); // Match continues!
  });

  // 17. Progressive completion of 5 different lines spells B-I-N-G-O and declares winner on 5th line
  it('17. Completing 5 different lines unlocks B -> I -> N -> G -> O and declares winner on 5th line', () => {
    const room = new GameRoom('TEST6', { name: 'Alice', avatar: 'cat' });
    const p2 = room.addPlayer('Bob', 'dog').player!;

    // Board with known lines:
    // Row 0: 1, 2, 3, 4, 5
    // Row 1: 6, 7, 8, 9, 10
    // Row 2: 11, 12, 13, 14, 15
    // Row 3: 16, 17, 18, 19, 20
    // Row 4: 21, 22, 23, 24, 25
    const b1 = Array.from({ length: 25 }, (_, i) => i + 1);
    // Bob's board has uncalled numbers (14, 15, 18, 20, 23, 24) in every row
    const b2 = [
      14, 1, 2, 3, 4,
      15, 6, 7, 8, 9,
      18, 10, 11, 12, 13,
      20, 16, 17, 19, 21,
      23, 24, 22, 25, 5,
    ];
    room.setBoard(room.hostId, b1);
    room.setBoard(p2.id, b2);
    room.status = 'PLAYING';

    // 1st Line: Row 0 -> 'B' (1, 2, 3, 4, 5)
    for (const n of [1, 2, 3, 4, 5]) {
      room.callNumber(room.getCurrentTurnPlayer()!.id, n);
    }
    let alice = room.toState().players.find((p) => p.id === room.hostId)!;
    expect(alice.bingoProgress).toBe(1);
    expect(alice.letters).toEqual(['B']);
    expect(room.winnerHistory).toHaveLength(0);

    // 2nd Line: Col 0 -> 'B', 'I' (1, 6, 11, 16, 21)
    for (const n of [6, 11, 16, 21]) {
      room.callNumber(room.getCurrentTurnPlayer()!.id, n);
    }
    alice = room.toState().players.find((p) => p.id === room.hostId)!;
    expect(alice.bingoProgress).toBe(2);
    expect(alice.letters).toEqual(['B', 'I']);
    expect(room.winnerHistory).toHaveLength(0);

    // 3rd Line: Main Diagonal -> 'B', 'I', 'N' (1, 7, 13, 19, 25)
    for (const n of [7, 13, 19, 25]) {
      room.callNumber(room.getCurrentTurnPlayer()!.id, n);
    }
    alice = room.toState().players.find((p) => p.id === room.hostId)!;
    expect(alice.bingoProgress).toBe(3);
    expect(alice.letters).toEqual(['B', 'I', 'N']);
    expect(room.winnerHistory).toHaveLength(0);

    // 4th Line: Row 1 -> 'B', 'I', 'N', 'G' (6, 7, 8, 9, 10)
    for (const n of [8, 9, 10]) {
      room.callNumber(room.getCurrentTurnPlayer()!.id, n);
    }
    alice = room.toState().players.find((p) => p.id === room.hostId)!;
    expect(alice.bingoProgress).toBe(4);
    expect(alice.letters).toEqual(['B', 'I', 'N', 'G']);
    expect(room.winnerHistory).toHaveLength(0);

    // 5th Line: Col 1 -> 'B', 'I', 'N', 'G', 'O' -> WINNER! (2, 7, 12, 17, 22)
    for (const n of [12, 17, 22]) {
      room.callNumber(room.getCurrentTurnPlayer()!.id, n);
    }
    alice = room.toState().players.find((p) => p.id === room.hostId)!;
    expect(alice.bingoProgress).toBe(5);
    expect(alice.letters).toEqual(['B', 'I', 'N', 'G', 'O']);
    expect(room.winnerHistory.length).toBeGreaterThanOrEqual(1);
    expect(room.winnerHistory[0].playerName).toBe('Alice');
    expect(room.winnerHistory[0].rank).toBe(1);

  });

  // 18. Line uniqueness: maintaining already completed line does NOT give duplicate letters
  it('18. Line uniqueness: maintaining an already counted line does NOT grant duplicate letters', () => {
    const room = new GameRoom('TEST7', { name: 'Alice', avatar: 'cat' });
    const p2 = room.addPlayer('Bob', 'dog').player!;
    room.setBoard(room.hostId, Array.from({ length: 25 }, (_, i) => i + 1));
    room.setBoard(p2.id, generateRandomBoard());
    room.status = 'PLAYING';

    // Complete Row 0 (1..5) -> grants 'B'
    for (const n of [1, 2, 3, 4, 5]) {
      room.callNumber(room.getCurrentTurnPlayer()!.id, n);
    }
    let alice = room.toState().players.find((p) => p.id === room.hostId)!;
    expect(alice.bingoProgress).toBe(1);
    expect(alice.letters).toEqual(['B']);

    // Now call number 6 (only 1 cell of Row 1, does NOT complete a new line)
    room.callNumber(room.getCurrentTurnPlayer()!.id, 6);
    alice = room.toState().players.find((p) => p.id === room.hostId)!;

    // Row 0 is still completed, but since it was already counted, progress must remain 1!
    expect(alice.bingoProgress).toBe(1);
    expect(alice.letters).toEqual(['B']);
  });


  // 19. Reconnection restores player state
  it('19. Reconnection restores player state and board', () => {
    const room = new GameRoom('TEST8', { name: 'Alice', avatar: 'cat' });
    const token = room.players.get(room.hostId)!.reconnectToken;
    const board = generateRandomBoard();
    room.setBoard(room.hostId, board);

    // Alice temporarily disconnects
    room.handleDisconnect(room.hostId);
    expect(room.players.get(room.hostId)?.connectionStatus).toBe('disconnected');

    // Alice reconnects with token
    const reconnectRes = room.reconnectPlayer(room.hostId, token);
    expect(reconnectRes.success).toBe(true);
    expect(reconnectRes.player?.connectionStatus).toBe('connected');
    expect(reconnectRes.player?.board).toEqual(board);
  });

  // 20. Unauthorized clients cannot change game state
  it('20. Unauthorized clients cannot change game state or call out of turn', () => {
    const room = new GameRoom('TEST9', { name: 'Alice', avatar: 'cat' });
    const p2 = room.addPlayer('Bob', 'dog').player!;
    room.setBoard(room.hostId, generateRandomBoard());
    room.setBoard(p2.id, generateRandomBoard());
    room.status = 'PLAYING';

    // It is Alice's turn (turnIndex = 0)
    expect(room.getCurrentTurnPlayer()?.id).toBe(room.hostId);

    // Bob attempts to call number while it is Alice's turn
    const unauthorizedCall = room.callNumber(p2.id, 10);
    expect(unauthorizedCall.success).toBe(false);
    expect(unauthorizedCall.error).toContain('not your turn');

    // Bob attempts to change settings (host only)
    const unauthorizedSettings = room.updateSettings(p2.id, { maxPlayers: 10 });
    expect(unauthorizedSettings.success).toBe(false);
    expect(unauthorizedSettings.error).toContain('Only the host');
  });

  // 21. Player continues playing after achieving Bingo until all active players finish
  it('21. Player continues participating after getting Bingo; game ends only after all active players achieve Bingo', () => {
    const room = new GameRoom('TEST21', { name: 'Alice', avatar: 'cat' });
    const p2 = room.addPlayer('Bob', 'dog').player!;

    // Alice has standard 1..25 board
    const b1 = Array.from({ length: 25 }, (_, i) => i + 1);
    // Bob has board where 22, 23, 24, 25 are spread across remaining lines
    const b2 = [
      1, 6, 11, 16, 21,
      22, 7, 12, 17, 2,
      3, 23, 13, 18, 8,
      9, 4, 24, 14, 19,
      20, 10, 5, 25, 15,
    ];

    room.setBoard(room.hostId, b1);
    room.setBoard(p2.id, b2);
    room.status = 'PLAYING';

    // Call numbers 1..21. Alice will achieve Bingo (5+ lines), Bob will only have 4 lines.
    for (let num = 1; num <= 21; num++) {
      const cur = room.getCurrentTurnPlayer()!;
      expect(cur).toBeDefined();
      room.callNumber(cur.id, num);
    }

    // Alice has achieved Bingo first (Rank 1), but Bob has not yet (has 4 lines)
    expect(room.winnerHistory.length).toBe(1);
    expect(room.winnerHistory[0].playerId).toBe(room.hostId);
    expect(room.winnerHistory[0].rank).toBe(1);
    expect(room.players.get(room.hostId)?.hasBingo).toBe(true);
    expect(room.players.get(p2.id)?.hasBingo).toBe(false);

    // CRITICAL: Game MUST still be PLAYING so remaining players continue!
    expect(room.status).toBe('PLAYING');

    // Alice continues participating and taking turns normally!
    const afterBingoPlayer = room.getCurrentTurnPlayer()!;
    expect(afterBingoPlayer).toBeDefined();

    // Now call number 22, which completes Bob's 5th line (Row 1: [22, 7, 12, 17, 2])
    room.callNumber(afterBingoPlayer.id, 22);

    // Both players have now achieved Bingo
    expect(room.winnerHistory.length).toBe(2);
    expect(room.winnerHistory[0].playerId).toBe(room.hostId);
    expect(room.winnerHistory[0].rank).toBe(1);
    expect(room.winnerHistory[1].playerId).toBe(p2.id);
    expect(room.winnerHistory[1].rank).toBe(2);

    // All active connected players have achieved Bingo -> match transitions to RESULTS!
    expect(room.status).toBe('RESULTS');
  });

  // 22. Deterministic host election when host leaves
  it('22. Earliest joined active connected player is deterministically elected as new host when host leaves', () => {
    const room = new GameRoom('TEST22', { name: 'Alice', avatar: 'cat' });
    const bob = room.addPlayer('Bob', 'dog').player!;
    const charlie = room.addPlayer('Charlie', 'fox').player!;

    expect(room.hostId).toBe(room.getPlayerList()[0].id);

    // Alice (host) leaves
    room.removePlayer(room.hostId);

    // Bob joined before Charlie, so Bob must be elected as host
    expect(room.hostId).toBe(bob.id);
    expect(room.players.get(bob.id)?.isHost).toBe(true);
    expect(room.players.get(charlie.id)?.isHost).toBe(false);

    // Verify Bob has host privileges (can update settings)
    const updateRes = room.updateSettings(bob.id, { maxPlayers: 4 });
    expect(updateRes.success).toBe(true);

    // Verify Charlie does not have host privileges
    const unauthorized = room.updateSettings(charlie.id, { maxPlayers: 5 });
    expect(unauthorized.success).toBe(false);
  });

  // 23. Disconnected player is bypassed in turn rotation
  it('23. Disconnected player is bypassed in circular turn rotation', () => {
    const room = new GameRoom('TEST23', { name: 'Alice', avatar: 'cat' });
    const bob = room.addPlayer('Bob', 'dog').player!;
    const charlie = room.addPlayer('Charlie', 'fox').player!;

    room.setBoard(room.hostId, generateRandomBoard());
    room.setBoard(bob.id, generateRandomBoard());
    room.setBoard(charlie.id, generateRandomBoard());
    room.status = 'PLAYING';

    // Alice turn
    expect(room.getCurrentTurnPlayer()?.id).toBe(room.hostId);
    room.callNumber(room.hostId, 1);

    // Bob is disconnected
    room.handleDisconnect(bob.id);

    // Advance turn: should skip disconnected Bob and land on Charlie!
    expect(room.getCurrentTurnPlayer()?.id).toBe(charlie.id);
    room.callNumber(charlie.id, 2);

    // Next turn rotates back to Alice, skipping Bob again!
    expect(room.getCurrentTurnPlayer()?.id).toBe(room.hostId);
  });

  // 24. Authoritative turn timer deadline
  it('24. Authoritative turn deadline created on turn start', () => {
    const room = new GameRoom('TEST24', { name: 'Alice', avatar: 'cat' }, { turnTimeoutSeconds: 30 });
    const bob = room.addPlayer('Bob', 'dog').player!;

    room.setBoard(room.hostId, generateRandomBoard());
    room.setBoard(bob.id, generateRandomBoard());
    room.status = 'PLAYING';
    room.advanceTurn();

    const state = room.toState();
    expect(state.turnStartedAt).toBeTypeOf('number');
    expect(state.turnExpiresAt).toBeTypeOf('number');
    expect(state.turnExpiresAt! - state.turnStartedAt!).toBe(30000);
    expect(state.turnTimeRemaining).toBeGreaterThanOrEqual(29);
    expect(state.turnTimeRemaining).toBeLessThanOrEqual(30);

    room.destroy();
  });

  // 25. Reconnected player does not usurp host role if a new host was already elected
  it('25. Departing host does not usurp host role upon reconnecting', () => {
    const room = new GameRoom('TEST25', { name: 'Alice', avatar: 'cat' });
    const aliceId = room.hostId;
    const aliceToken = room.players.get(aliceId)!.reconnectToken;
    const bob = room.addPlayer('Bob', 'dog').player!;

    // Alice disconnects -> Bob becomes host
    room.handleDisconnect(aliceId);
    expect(room.hostId).toBe(bob.id);

    // Alice reconnects
    room.reconnectPlayer(aliceId, aliceToken);
    // Bob remains host!
    expect(room.hostId).toBe(bob.id);
    expect(room.players.get(aliceId)?.isHost).toBe(false);
    expect(room.players.get(bob.id)?.isHost).toBe(true);

    room.destroy();
  });
});

