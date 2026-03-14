/**
 * Copyright (C) 2016-2026 Husain Alamri (H4n) and Xenolexia Foundation.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See LICENSE.
 */

export type {
  Dictionary,
  DictionaryEntry,
  DailyProgressState,
  GeneratePuzzleOptions,
  Puzzle,
  StreakState,
  ValidateWordResult,
} from './types.js';
export {
  setDictionary,
  loadDictionary,
  getDictionary,
  hasWord,
  getEntry,
} from './dictionary.js';
export type { DictionarySource } from './dictionary.js';
export { sampleDictionary } from './data/sampleDictionary.js';
export { DICTIONARIES, SUPPORTED_LOCALES, dictionaryEn, dictionaryEs } from './data/dictionaries.js';
export type { Locale } from './data/dictionaries.js';
export {
  canFormWord,
  findValidWords,
  generatePuzzle,
  getDailySeed,
} from './puzzle.js';
export {
  scoreForWordLength,
  getRarityBonus,
  scoreForWord,
  RARITY_LENGTH_THRESHOLD,
  validateWord,
} from './validation.js';
export {
  getYesterday,
  getDisplayStreak,
  updateStreakAfterPlay,
} from './progress.js';
