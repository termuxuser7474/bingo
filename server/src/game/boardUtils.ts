import { BingoLine, BINGO_LINE_DEFINITIONS, BINGO_LETTERS } from '../shared/types.js';

export { BINGO_LINE_DEFINITIONS, BINGO_LETTERS };

/**
 * Returns the array of Bingo letters (B, I, N, G, O) corresponding to unique completed line count.
 */
export function getBingoLetters(uniqueLineCount: number): string[] {
  const count = Math.max(0, Math.min(5, uniqueLineCount));
  return BINGO_LETTERS.slice(0, count);
}



/**
 * Generates a valid random 5x5 board containing numbers 1..25 using Fisher-Yates shuffle.
 */
export function generateRandomBoard(): number[] {
  const board: number[] = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = board.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = board[i];
    board[i] = board[j];
    board[j] = temp;
  }
  return board;
}

/**
 * Validates that a board has exactly 25 numbers, all within 1..25, and no duplicates.
 */
export function validateBoard(board: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(board)) {
    return { valid: false, error: 'Board must be an array' };
  }
  if (board.length !== 25) {
    return { valid: false, error: `Board must have exactly 25 cells, received ${board.length}` };
  }

  const set = new Set<number>();
  for (let i = 0; i < 25; i++) {
    const val = board[i];
    if (typeof val !== 'number' || !Number.isInteger(val)) {
      return { valid: false, error: `Cell at index ${i} is not a valid integer: ${val}` };
    }
    if (val < 1 || val > 25) {
      return { valid: false, error: `Cell at index ${i} has value ${val}, must be between 1 and 25` };
    }
    if (set.has(val)) {
      return { valid: false, error: `Duplicate number detected: ${val}` };
    }
    set.add(val);
  }

  return { valid: true };
}

/**
 * Returns all currently completed Bingo lines for a board given the called numbers.
 */
export function getCompletedLines(board: number[], calledNumbers: number[]): BingoLine[] {
  const calledSet = new Set(calledNumbers);
  const completed: BingoLine[] = [];

  for (const def of BINGO_LINE_DEFINITIONS) {
    const numbers = def.cellIndices.map((idx) => board[idx]);
    const isCompleted = numbers.every((num) => calledSet.has(num));

    if (isCompleted) {
      completed.push({
        id: def.id,
        type: def.type,
        index: def.index,
        cellIndices: [...def.cellIndices],
        numbers,
      });
    }
  }

  return completed;
}

/**
 * Returns lines that are completed on the board but have not yet been claimed.
 */
export function getNewlyCompletedLines(
  board: number[],
  calledNumbers: number[],
  claimedLineIds: Set<string> | string[]
): BingoLine[] {
  const claimedSet = claimedLineIds instanceof Set ? claimedLineIds : new Set(claimedLineIds);
  const allCompleted = getCompletedLines(board, calledNumbers);
  return allCompleted.filter((line) => !claimedSet.has(line.id));
}

/**
 * Server-authoritative validation for a Bingo claim.
 */
export function validateBingoClaim(
  board: number[],
  calledNumbers: number[],
  alreadyClaimedLineIds: Set<string> | string[],
  specificLineId?: string
): { valid: boolean; newLines: BingoLine[]; error?: string } {
  const validation = validateBoard(board);
  if (!validation.valid) {
    return { valid: false, newLines: [], error: validation.error };
  }

  const newLines = getNewlyCompletedLines(board, calledNumbers, alreadyClaimedLineIds);

  if (newLines.length === 0) {
    return {
      valid: false,
      newLines: [],
      error: 'No new Bingo lines completed with current called numbers',
    };
  }

  if (specificLineId) {
    const line = newLines.find((l) => l.id === specificLineId);
    if (!line) {
      return {
        valid: false,
        newLines: [],
        error: `Line ${specificLineId} is either already claimed or not fully completed`,
      };
    }
    return { valid: true, newLines: [line] };
  }

  return { valid: true, newLines };
}
