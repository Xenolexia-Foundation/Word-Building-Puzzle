import type { Dictionary, DictionaryEntry } from './types.js';

/** Default dictionary: loaded from bundled JSON. Call setDictionary to replace. */
let dictionary: Dictionary = [];

/**
 * Load dictionary from a Dictionary array (e.g. from JSON or SQLite).
 * Call this at app init. Pass the result of importing your dictionary JSON.
 */
export function setDictionary(entries: Dictionary): void {
  dictionary = entries.map((e) => ({
    word: normalizeWord(e.word),
    translation: e.translation,
    example: e.example,
  }));
}

/**
 * Get the full dictionary (read-only). Useful for puzzle generation.
 */
export function getDictionary(): ReadonlyArray<DictionaryEntry> {
  return dictionary;
}

/**
 * Check if a word exists in the dictionary.
 */
export function hasWord(word: string): boolean {
  const normalized = normalizeWord(word);
  return dictionary.some((e) => e.word === normalized);
}

/**
 * Get the dictionary entry for a word, or undefined if not found.
 */
export function getEntry(word: string): DictionaryEntry | undefined {
  const normalized = normalizeWord(word);
  return dictionary.find((e) => e.word === normalized);
}

function normalizeWord(w: string): string {
  return w.trim().toLowerCase();
}
