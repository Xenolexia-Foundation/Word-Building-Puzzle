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

/** Rarity threshold: words of this length or more get a rarity bonus (longer = rarer). */
export const RARITY_LENGTH_THRESHOLD = 6;

/**
 * Extra points for "rare" (longer) words. 6 letters: +5, 7+: +10.
 * Implements "points by length or rarity" from the product outline.
 */
export function getRarityBonus(length: number): number {
  if (length < RARITY_LENGTH_THRESHOLD) return 0;
  return length >= 7 ? 10 : 5;
}

/**
 * Total points for a word: base (length tier) + rarity bonus.
 * Use this for display and for validateWord so awarded points match.
 */
export function scoreForWord(length: number): number {
  return scoreForWordLength(length) + getRarityBonus(length);
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
  const points = scoreForWord(normalized.length);
  return { ok: true, points };
}
