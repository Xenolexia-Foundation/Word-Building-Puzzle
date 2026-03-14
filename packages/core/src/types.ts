/**
 * Copyright (C) 2016-2026 Husain Alamri (H4n) and Xenolexia Foundation.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See LICENSE.
 */

/**
 * Dictionary entry for a single word.
 * Used for validation and meaning lookup.
 * Outline alignment: "definition" = translation; optional example = example.
 */
export interface DictionaryEntry {
  /** Normalized word (lowercase, for lookup) */
  word: string;
  /** Definition or translation (outline: definition) */
  translation: string;
  /** Optional example sentence */
  example?: string;
}

/**
 * In-memory dictionary: array of entries.
 * Can be loaded from JSON or SQLite.
 */
export type Dictionary = DictionaryEntry[];

/**
 * Result of generating a puzzle: letters and the set of valid words (internal use).
 * Outline alignment: "dateSeed" = seed (e.g. YYYY-MM-DD for daily puzzle).
 */
export interface Puzzle {
  /** Letters the user can use (6–8) */
  letters: string[];
  /** All valid words formable from these letters (for validation) */
  validWords: string[];
  /** Date seed used to generate this puzzle (e.g. YYYY-MM-DD; outline: dateSeed) */
  seed: string;
}

/**
 * Options for the puzzle generator.
 */
export interface GeneratePuzzleOptions {
  /** Min/max number of letters */
  minLetters?: number;
  maxLetters?: number;
  /** Target range for number of valid words */
  minWords?: number;
  maxWords?: number;
  /** Optional seed for reproducibility (e.g. "2025-03-11" for daily) */
  seed?: string;
}

/**
 * Result of validating a submitted word (Phase 2).
 */
export type ValidateWordResult =
  | { ok: true; points: number }
  | { ok: false; reason: 'already_found' }
  | { ok: false; reason: 'not_in_puzzle' };

/**
 * Progress for a single day (Phase 5).
 */
export interface DailyProgressState {
  foundWords: string[];
  score: number;
}

/**
 * Streak state: last played date (YYYY-MM-DD) and consecutive days count.
 */
export interface StreakState {
  lastPlayedDate: string;
  streakCount: number;
}
