/**
 * Copyright (C) 2016-2026 Husain Alamri (H4n) and Xenolexia Foundation.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See LICENSE.
 */

import type { Dictionary, DictionaryEntry } from './types.js';

/** Default dictionary: loaded from bundled JSON. Call setDictionary to replace. */
let dictionary: Dictionary = [];

/**
 * Source for dictionary data: sync array, sync getter, or async getter (e.g. from SQLite).
 * Used by loadDictionary() so apps can plug in async or SQLite-backed sources without core depending on them.
 */
export type DictionarySource =
  | Dictionary
  | (() => Dictionary)
  | (() => Promise<Dictionary>);

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
 * Load dictionary from a sync array, sync getter, or async getter (e.g. SQLite).
 * Use this when the source is async or when you want a single entry point for "dictionary from anywhere".
 * JSON default: setDictionary(DICTIONARIES[locale]). SQLite: loadDictionary(async () => loadFromSQLite()).
 */
export async function loadDictionary(source: DictionarySource): Promise<void> {
  if (Array.isArray(source)) {
    setDictionary(source);
    return;
  }
  const result = source();
  if (result instanceof Promise) {
    const entries = await result;
    setDictionary(entries);
    return;
  }
  setDictionary(result);
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
