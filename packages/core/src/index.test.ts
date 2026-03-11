import { describe, it, expect, beforeEach } from 'vitest';
import {
  setDictionary,
  sampleDictionary,
  getDailySeed,
  getYesterday,
  updateStreakAfterPlay,
  getDisplayStreak,
  validateWord,
  scoreForWordLength,
  generatePuzzle,
  canFormWord,
  findValidWords,
} from './index.js';

describe('getDailySeed', () => {
  it('returns YYYY-MM-DD for a given date', () => {
    const d = new Date('2025-03-11T15:00:00Z');
    expect(getDailySeed(d)).toBe('2025-03-11');
  });

  it('returns same seed for same calendar day regardless of time', () => {
    expect(getDailySeed(new Date('2025-03-11T00:00:00Z'))).toBe('2025-03-11');
    expect(getDailySeed(new Date('2025-03-11T23:59:59Z'))).toBe('2025-03-11');
  });
});

describe('getYesterday', () => {
  it('returns previous day in YYYY-MM-DD', () => {
    expect(getYesterday('2025-03-11')).toBe('2025-03-10');
    expect(getYesterday('2025-01-01')).toBe('2024-12-31');
  });
});

describe('updateStreakAfterPlay', () => {
  it('returns streak 1 when no current state', () => {
    const result = updateStreakAfterPlay(null, '2025-03-11');
    expect(result).toEqual({ lastPlayedDate: '2025-03-11', streakCount: 1 });
  });

  it('increments when last play was yesterday', () => {
    const result = updateStreakAfterPlay(
      { lastPlayedDate: '2025-03-10', streakCount: 3 },
      '2025-03-11'
    );
    expect(result).toEqual({ lastPlayedDate: '2025-03-11', streakCount: 4 });
  });

  it('keeps count when last play was today', () => {
    const current = { lastPlayedDate: '2025-03-11', streakCount: 2 };
    expect(updateStreakAfterPlay(current, '2025-03-11')).toBe(current);
  });

  it('resets to 1 when last play was before yesterday', () => {
    const result = updateStreakAfterPlay(
      { lastPlayedDate: '2025-03-08', streakCount: 5 },
      '2025-03-11'
    );
    expect(result).toEqual({ lastPlayedDate: '2025-03-11', streakCount: 1 });
  });
});

describe('getDisplayStreak', () => {
  it('returns 0 when no state', () => {
    expect(getDisplayStreak(null, '2025-03-11')).toBe(0);
  });

  it('returns streakCount when last play was today', () => {
    expect(getDisplayStreak({ lastPlayedDate: '2025-03-11', streakCount: 3 }, '2025-03-11')).toBe(3);
  });

  it('returns 0 when last play was not today', () => {
    expect(getDisplayStreak({ lastPlayedDate: '2025-03-10', streakCount: 3 }, '2025-03-11')).toBe(0);
  });
});

describe('scoreForWordLength', () => {
  it('returns tiered points by length', () => {
    expect(scoreForWordLength(0)).toBe(0);
    expect(scoreForWordLength(2)).toBe(10);
    expect(scoreForWordLength(3)).toBe(10);
    expect(scoreForWordLength(4)).toBe(15);
    expect(scoreForWordLength(5)).toBe(25);
    expect(scoreForWordLength(6)).toBe(40);
    expect(scoreForWordLength(7)).toBe(60);
    expect(scoreForWordLength(10)).toBe(60);
  });
});

describe('validateWord', () => {
  beforeEach(() => {
    setDictionary(sampleDictionary);
  });

  const puzzle = {
    letters: ['c', 'r', 'e', 'a', 't', 'e'],
    validWords: ['create', 'react', 'trace', 'care', 'are'],
    seed: '2025-03-11',
  };

  it('returns valid with points for a valid word', () => {
    const r = validateWord(puzzle, 'create', []);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.points).toBe(40); // 6 letters -> 40
  });

  it('returns already_found when word was already found', () => {
    const r = validateWord(puzzle, 'create', ['create']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('already_found');
  });

  it('returns not_in_puzzle when word not in valid set', () => {
    const r = validateWord(puzzle, 'xyz', []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_in_puzzle');
  });

  it('normalizes input (trim, lowercase)', () => {
    const r = validateWord(puzzle, '  CREATE  ', []);
    expect(r.ok).toBe(true);
  });

  it('returns not_in_puzzle for empty input', () => {
    const r = validateWord(puzzle, '   ', []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_in_puzzle');
  });
});

describe('canFormWord', () => {
  it('returns true when word can be formed from letters', () => {
    expect(canFormWord(['c', 'a', 't'], 'cat')).toBe(true);
    expect(canFormWord(['e', 'a', 'r', 't'], 'tear')).toBe(true);
  });

  it('returns false when letter missing', () => {
    expect(canFormWord(['c', 'a'], 'cat')).toBe(false);
  });

  it('returns false when letter used twice but only once in pool', () => {
    expect(canFormWord(['c', 'a', 't'], 'catty')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(canFormWord(['C', 'A', 'T'], 'cat')).toBe(true);
  });
});

describe('generatePuzzle', () => {
  beforeEach(() => {
    setDictionary(sampleDictionary);
  });

  it('returns puzzle with letters and validWords and seed', () => {
    const p = generatePuzzle({ seed: '2025-03-11' });
    expect(p.letters).toBeDefined();
    expect(Array.isArray(p.letters)).toBe(true);
    expect(p.letters.length).toBeGreaterThanOrEqual(6);
    expect(p.letters.length).toBeLessThanOrEqual(8);
    expect(p.validWords).toBeDefined();
    expect(Array.isArray(p.validWords)).toBe(true);
    expect(p.seed).toBe('2025-03-11');
  });

  it('is deterministic for same seed', () => {
    const a = generatePuzzle({ seed: 'fixed-seed-123' });
    const b = generatePuzzle({ seed: 'fixed-seed-123' });
    expect(a.letters).toEqual(b.letters);
    expect(a.validWords).toEqual(b.validWords);
  });

  it('validWords only contains words formable from letters', () => {
    const p = generatePuzzle({ seed: '2025-03-11' });
    const letters = p.letters.map((c) => c.toLowerCase());
    for (const w of p.validWords) {
      expect(canFormWord(letters, w)).toBe(true);
    }
  });
});

describe('findValidWords', () => {
  beforeEach(() => {
    setDictionary(sampleDictionary);
  });

  it('returns words formable from letters', () => {
    const words = findValidWords(['c', 'r', 'e', 'a', 't', 'e']);
    expect(words).toContain('create');
    expect(words).toContain('react');
    expect(words).toContain('care');
  });

  it('returns empty array when dictionary empty', () => {
    setDictionary([]);
    expect(findValidWords(['a', 'b', 'c'])).toEqual([]);
  });
});
