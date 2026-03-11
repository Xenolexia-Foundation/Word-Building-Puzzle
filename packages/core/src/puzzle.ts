import { getDictionary } from './dictionary.js';
import type { GeneratePuzzleOptions, Puzzle } from './types.js';

const DEFAULT_MIN_LETTERS = 6;
const DEFAULT_MAX_LETTERS = 8;
const DEFAULT_MIN_WORDS = 10;
const DEFAULT_MAX_WORDS = 20;

/** Simple seeded PRNG (mulberry32) for reproducible puzzles */
function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t ^ (t >>> 12));
    return ((t >>> 0) / 4294967296) as number;
  };
}

/** Hash a string to a number for use as seed */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Check if a word can be formed from the given letters (each letter used at most once).
 */
export function canFormWord(letters: string[], word: string): boolean {
  const pool = letters.map((c) => c.toLowerCase()).slice();
  const w = word.toLowerCase();
  for (let i = 0; i < w.length; i++) {
    const idx = pool.indexOf(w[i]);
    if (idx === -1) return false;
    pool.splice(idx, 1);
  }
  return true;
}

/**
 * Find all words in the dictionary that can be formed from the given letters.
 */
export function findValidWords(letters: string[]): string[] {
  const dict = getDictionary();
  const normalizedLetters = letters.map((c) => c.toLowerCase());
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of dict) {
    const w = entry.word;
    if (w.length < 2) continue;
    if (seen.has(w)) continue;
    if (canFormWord(normalizedLetters, w)) {
      seen.add(w);
      result.push(w);
    }
  }
  return result;
}

/**
 * Pick a random subset of size k from array (using seeded random).
 */
function pickSubset<T>(arr: T[], k: number, rng: () => number): T[] {
  const copy = arr.slice();
  for (let i = 0; i < k && i < copy.length; i++) {
    const j = i + Math.floor(rng() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, k);
}

/** Common letters for playable puzzles (more vowels) */
const LETTER_POOL = 'abcdefghijklmnopqrstuvwxyz';
const VOWELS = 'aeiou';

/**
 * Return the daily puzzle seed for the given date (YYYY-MM-DD in UTC).
 * Same seed for everyone on the same calendar day (UTC).
 */
export function getDailySeed(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Generate a puzzle: 6–8 letters with at least minWords valid words.
 * Uses optional seed for reproducibility (e.g. date for daily puzzle).
 */
export function generatePuzzle(options: GeneratePuzzleOptions = {}): Puzzle {
  const minLetters = options.minLetters ?? DEFAULT_MIN_LETTERS;
  const maxLetters = options.maxLetters ?? DEFAULT_MAX_LETTERS;
  const minWords = options.minWords ?? DEFAULT_MIN_WORDS;
  const maxWords = options.maxWords ?? DEFAULT_MAX_WORDS;
  const seedStr = options.seed ?? String(Date.now());
  const seedNum = hashString(seedStr);
  const rng = seededRandom(seedNum);

  const numLetters = minLetters + Math.floor(rng() * (maxLetters - minLetters + 1));
  const numVowels = Math.max(1, Math.floor(numLetters * 0.35) + Math.floor(rng() * 2));

  let letters: string[];
  let validWords: string[];

  const maxAttempts = 500;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const vowelCount = numVowels;
    const consonantCount = numLetters - vowelCount;
    const v = pickSubset(VOWELS.split(''), Math.min(vowelCount, VOWELS.length), rng);
    const cons = LETTER_POOL.split('').filter((c) => !VOWELS.includes(c));
    const c = pickSubset(cons, consonantCount, rng);
    letters = [...v, ...c];
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    validWords = findValidWords(letters);
    if (validWords.length >= minWords && validWords.length <= maxWords) {
      return { letters, validWords, seed: seedStr };
    }
  }

  validWords = findValidWords(letters!);
  return {
    letters: letters!,
    validWords,
    seed: seedStr,
  };
}
