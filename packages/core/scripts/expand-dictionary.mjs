#!/usr/bin/env node
/**
 * Merge a word list (one word per line) into an existing dictionary JSON.
 * New words get translation "(definition missing)" and no example.
 * Usage: node expand-dictionary.mjs <dictionary.json> <words.txt> [output.json]
 *   If output.json is omitted, writes to stdout.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node expand-dictionary.mjs <dictionary.json> <words.txt> [output.json]');
  process.exit(1);
}

const [dictPath, wordsPath, outPath] = args;
const dictAbs = resolve(process.cwd(), dictPath);
const wordsAbs = resolve(process.cwd(), wordsPath);

let entries;
try {
  const raw = readFileSync(dictAbs, 'utf8');
  entries = JSON.parse(raw);
  if (!Array.isArray(entries)) throw new Error('Dictionary JSON must be an array');
} catch (e) {
  console.error('Failed to read dictionary:', e.message);
  process.exit(1);
}

let wordList;
try {
  wordList = readFileSync(wordsAbs, 'utf8')
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);
} catch (e) {
  console.error('Failed to read word list:', e.message);
  process.exit(1);
}

const existing = new Set(entries.map((e) => (e.word || '').trim().toLowerCase()));
const placeholder = '(definition missing)';

for (const word of wordList) {
  if (!existing.has(word)) {
    existing.add(word);
    entries.push({ word, translation: placeholder });
  }
}

entries.sort((a, b) => (a.word || '').localeCompare(b.word || ''));

const out = JSON.stringify(entries, null, 2);

if (outPath) {
  try {
    writeFileSync(resolve(process.cwd(), outPath), out, 'utf8');
    console.error(`Wrote ${entries.length} entries to ${outPath}`);
  } catch (e) {
    console.error('Failed to write output:', e.message);
    process.exit(1);
  }
} else {
  console.log(out);
}
