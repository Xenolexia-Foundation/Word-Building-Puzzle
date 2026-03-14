/**
 * Copyright (C) 2016-2026 Husain Alamri (H4n) and Xenolexia Foundation.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See LICENSE.
 */

import type { StreakState } from './types.js';

/**
 * Return the previous day in YYYY-MM-DD (UTC).
 */
export function getYesterday(today: string): string {
  const d = new Date(today + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * After the user plays today (submits a valid word), compute the new streak state.
 * - If lastPlayedDate is today: keep current streakCount.
 * - If lastPlayedDate is yesterday: increment streakCount.
 * - Otherwise: reset to 1.
 */
export function updateStreakAfterPlay(
  current: StreakState | null,
  today: string
): StreakState {
  const yesterday = getYesterday(today);
  if (!current) {
    return { lastPlayedDate: today, streakCount: 1 };
  }
  if (current.lastPlayedDate === today) {
    return current;
  }
  if (current.lastPlayedDate === yesterday) {
    return { lastPlayedDate: today, streakCount: current.streakCount + 1 };
  }
  return { lastPlayedDate: today, streakCount: 1 };
}

/**
 * Return the streak count to display (0 if not played today or never).
 * If lastPlayedDate is today, show streakCount; otherwise show 0 until they play.
 */
export function getDisplayStreak(current: StreakState | null, today: string): number {
  if (!current) return 0;
  return current.lastPlayedDate === today ? current.streakCount : 0;
}
