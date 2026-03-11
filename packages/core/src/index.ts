export type {
  Dictionary,
  DictionaryEntry,
  DailyProgressState,
  GeneratePuzzleOptions,
  Puzzle,
  StreakState,
  ValidateWordResult,
} from './types.js';
export { setDictionary, getDictionary, hasWord, getEntry } from './dictionary.js';
export { sampleDictionary } from './data/sampleDictionary.js';
export { DICTIONARIES, SUPPORTED_LOCALES, dictionaryEn, dictionaryEs } from './data/dictionaries.js';
export type { Locale } from './data/dictionaries.js';
export {
  canFormWord,
  findValidWords,
  generatePuzzle,
  getDailySeed,
} from './puzzle.js';
export { scoreForWordLength, validateWord } from './validation.js';
export {
  getYesterday,
  getDisplayStreak,
  updateStreakAfterPlay,
} from './progress.js';
