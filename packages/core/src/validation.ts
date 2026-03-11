import type { Puzzle, ValidateWordResult } from './types.js';

/**
 * Points awarded by word length (tiered).
 * 3 letters: 10, 4: 15, 5: 25, 6: 40, 7+: 60.
 */
export function scoreForWordLength(length: number): number {
  if (length <= 0) return 0;
  if (length <= 3) return 10;
  if (length === 4) return 15;
  if (length === 5) return 25;
  if (length === 6) return 40;
  return 60;
}

/**
 * Normalize user input: trim, lowercase.
 */
function normalizeInput(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Validate a submitted word against the current puzzle and already-found list.
 * Returns result with ok/points or reason.
 */
export function validateWord(
  puzzle: Puzzle,
  word: string,
  foundWords: readonly string[]
): ValidateWordResult {
  const normalized = normalizeInput(word);
  if (!normalized) {
    return { ok: false, reason: 'not_in_puzzle' };
  }
  if (foundWords.includes(normalized)) {
    return { ok: false, reason: 'already_found' };
  }
  if (!puzzle.validWords.includes(normalized)) {
    return { ok: false, reason: 'not_in_puzzle' };
  }
  const points = scoreForWordLength(normalized.length);
  return { ok: true, points };
}
