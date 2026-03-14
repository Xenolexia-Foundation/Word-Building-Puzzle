/**
 * Copyright (C) 2016-2026 Husain Alamri (H4n) and Xenolexia Foundation.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See LICENSE.
 */

import { useEffect, useState, useRef } from 'react';
import {
  setDictionary,
  DICTIONARIES,
  SUPPORTED_LOCALES,
  generatePuzzle,
  getDailySeed,
  getEntry,
  validateWord,
  hasWord,
  getDisplayStreak,
  updateStreakAfterPlay,
  scoreForWord,
  type Puzzle,
  type DailyProgressState,
  type StreakState,
  type Locale,
} from 'xenolexia-core';

const LANG_KEY = 'xenolexia-lang';

function getStorageKeys(locale: Locale) {
  return {
    daily: `xenolexia-daily-${locale}`,
    progress: `xenolexia-daily-progress-${locale}`,
    streak: `xenolexia-streak-${locale}`,
    timedBest: (duration: number) => `xenolexia-timed-best-${locale}-${duration}`,
  };
}

function loadStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw === 'en' || raw === 'es') return raw;
  } catch {
    /* ignore */
  }
  return 'en';
}

function loadTimedBest(locale: Locale, duration: number): { score: number; wordCount: number } | null {
  try {
    const key = getStorageKeys(locale).timedBest(duration);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as { score: number; wordCount: number };
    if (typeof data.score !== 'number' || typeof data.wordCount !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function saveTimedBest(locale: Locale, duration: number, score: number, wordCount: number): void {
  try {
    const key = getStorageKeys(locale).timedBest(duration);
    localStorage.setItem(key, JSON.stringify({ score, wordCount }));
  } catch {
    /* ignore */
  }
}

function loadDailyPuzzle(locale: Locale): { puzzle: Puzzle; date: string } | null {
  try {
    const raw = localStorage.getItem(getStorageKeys(locale).daily);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date: string; puzzle: Puzzle };
    if (!data.date || !data.puzzle?.letters || !Array.isArray(data.puzzle.validWords)) return null;
    return { puzzle: data.puzzle, date: data.date };
  } catch {
    return null;
  }
}

function saveDailyPuzzle(locale: Locale, date: string, puzzle: Puzzle): void {
  try {
    localStorage.setItem(getStorageKeys(locale).daily, JSON.stringify({ date, puzzle }));
  } catch {
    /* ignore */
  }
}

function loadDailyProgress(locale: Locale, date: string): DailyProgressState | null {
  try {
    const raw = localStorage.getItem(getStorageKeys(locale).progress);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date: string; foundWords: string[]; score: number };
    if (data.date !== date || !Array.isArray(data.foundWords)) return null;
    return { foundWords: data.foundWords, score: data.score ?? 0 };
  } catch {
    return null;
  }
}

function saveDailyProgress(locale: Locale, date: string, state: DailyProgressState): void {
  try {
    localStorage.setItem(getStorageKeys(locale).progress, JSON.stringify({ date, ...state }));
  } catch {
    /* ignore */
  }
}

function loadStreak(locale: Locale): StreakState | null {
  try {
    const raw = localStorage.getItem(getStorageKeys(locale).streak);
    if (!raw) return null;
    const data = JSON.parse(raw) as StreakState;
    if (!data.lastPlayedDate || typeof data.streakCount !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function saveStreak(locale: Locale, state: StreakState): void {
  try {
    localStorage.setItem(getStorageKeys(locale).streak, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const TIMED_DURATIONS = [30, 60, 90] as const;
type TimedDuration = (typeof TIMED_DURATIONS)[number];

type GameMode = 'daily' | 'timed';

function formatPuzzleDate(seed: string): string {
  return new Date(seed + 'T12:00:00Z').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Sort found words by length (longest first), then alphabetically */
function sortFoundWords(words: string[]): string[] {
  return [...words].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

const HINTS_PER_PUZZLE = 3;

function pickRandomHint(validWords: string[], found: string[]): string | null {
  const unfound = validWords.filter((w) => !found.includes(w));
  if (unfound.length === 0) return null;
  return unfound[Math.floor(Math.random() * unfound.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** TTS: speak word and optionally example using Web Speech API. No-op if unavailable. */
function speakWithTTS(word: string, example: string | null | undefined, locale: Locale): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const lang = locale === 'es' ? 'es-ES' : 'en-US';
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = lang;
  if (example?.trim()) {
    utter.onend = () => {
      const exUtter = new SpeechSynthesisUtterance(example.trim());
      exUtter.lang = lang;
      window.speechSynthesis.speak(exUtter);
    };
  }
  window.speechSynthesis.speak(utter);
}

function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

function App() {
  const [locale, setLocaleState] = useState<Locale>(() => loadStoredLocale());
  const [gameMode, setGameMode] = useState<GameMode>('daily');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [input, setInput] = useState('');
  const [found, setFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [meaningCard, setMeaningCard] = useState<{
    word: string;
    translation: string | null;
    example: string | null;
    points: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Timed mode state
  const [timedDuration, setTimedDuration] = useState<TimedDuration>(60);
  const [timedRunning, setTimedRunning] = useState(false);
  const [timedSecondsLeft, setTimedSecondsLeft] = useState(0);
  const [timedResult, setTimedResult] = useState<{ score: number; wordCount: number } | null>(null);
  const [showTimedSummary, setShowTimedSummary] = useState(false);
  const timedEndHandled = useRef(false);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LANG_KEY, newLocale);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (gameMode === 'timed') {
      setPuzzle(null);
      setShowTimedSummary(false);
      setTimedResult(null);
      setTimedRunning(false);
      timedEndHandled.current = false;
    }
  }, [gameMode]);

  useEffect(() => {
    if (gameMode !== 'daily') return;
    try {
      setDictionary(DICTIONARIES[locale]);
    } catch {
      setLoadError('Dictionary could not be loaded for this language.');
      setPuzzle(null);
      return;
    }
    try {
      const today = getDailySeed();
      const stored = loadDailyPuzzle(locale);
      if (stored && stored.date === today) {
        setPuzzle(stored.puzzle);
        const progress = loadDailyProgress(locale, today);
        if (progress) {
          setFound(progress.foundWords);
          setScore(progress.score);
        }
      } else {
        const newPuzzle = generatePuzzle({ seed: today });
        try {
          saveDailyPuzzle(locale, today, newPuzzle);
        } catch {
          setSaveError('Progress could not be saved. Storage may be full.');
        }
        setPuzzle(newPuzzle);
      }
      setStreak(loadStreak(locale));
      setLoadError(null);
    } catch {
      try {
        const today = getDailySeed();
        setPuzzle(generatePuzzle({ seed: today }));
      } catch {
        setLoadError('Could not start the puzzle. Please refresh.');
        return;
      }
      setLoadError("Progress couldn't be loaded (storage may be corrupted). Today's puzzle is ready.");
    }
  }, [gameMode, locale]);

  // Reset hint state when puzzle changes
  useEffect(() => {
    setHintWord(null);
    setHintsUsed(0);
  }, [puzzle?.seed]);

  // Countdown timer for timed mode
  useEffect(() => {
    if (!timedRunning || timedSecondsLeft <= 0) return;
    const id = setInterval(() => {
      setTimedSecondsLeft((s) => {
        if (s <= 1) {
          setTimedRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timedRunning, timedSecondsLeft]);

  // When timed run ends: set result, show summary, update best
  useEffect(() => {
    if (gameMode !== 'timed' || timedRunning || timedSecondsLeft > 0) return;
    if (timedEndHandled.current || !puzzle) return;
    timedEndHandled.current = true;
    setTimedResult({ score, wordCount: found.length });
    setShowTimedSummary(true);
    const best = loadTimedBest(locale, timedDuration);
    if (!best || score > best.score || (score === best.score && found.length > best.wordCount)) {
      saveTimedBest(locale, timedDuration, score, found.length);
    }
  }, [gameMode, timedRunning, timedSecondsLeft, puzzle, score, found.length, timedDuration, locale]);

  const startTimedRun = () => {
    setDictionary(DICTIONARIES[locale]);
    const newPuzzle = generatePuzzle({ seed: `timed-${Date.now()}` });
    setPuzzle(newPuzzle);
    setFound([]);
    setScore(0);
    setInput('');
    setMessage(null);
    setMeaningCard(null);
    setTimedSecondsLeft(timedDuration);
    setTimedRunning(true);
    setTimedResult(null);
    setShowTimedSummary(false);
    timedEndHandled.current = false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameMode === 'timed' && !timedRunning) return;
    if (gameMode === 'timed' && timedSecondsLeft <= 0) return;
    const word = input.trim().toLowerCase();
    setInput('');
    setMessage(null);
    setMeaningCard(null);
    setHintWord(null);
    if (!word || !puzzle) return;

    const result = validateWord(puzzle, word, found);
    if (result.ok) {
      const points = result.points;
      if (gameMode === 'daily') {
        const today = getDailySeed();
        setScore((s) => s + points);
        const newFound = [...found, word].sort();
        setFound(newFound);
        try {
          saveDailyProgress(locale, today, { foundWords: newFound, score: score + points });
          const newStreak = updateStreakAfterPlay(streak, today);
          setStreak(newStreak);
          saveStreak(locale, newStreak);
          setSaveError(null);
        } catch {
          setSaveError('Progress could not be saved. Storage may be full.');
        }
      } else {
        setScore((s) => s + points);
        setFound((f) => [...f, word].sort());
      }
      const entry = getEntry(word);
      setMeaningCard({
        word,
        translation: entry?.translation ?? null,
        example: entry?.example ?? null,
        points,
      });
      setHintWord(null);
      return;
    }
    if (result.reason === 'already_found') {
      setMessage('Already found');
      return;
    }
    setMessage(hasWord(word) ? 'Not formable from these letters' : 'Not in dictionary');
  };

  if (gameMode === 'timed' && !timedRunning && !showTimedSummary) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">Xenolexia</h1>
          <p className="subtitle">Word-building puzzle</p>
          <div className="lang-switcher" role="group" aria-label="Language">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                className={`lang-btn ${locale === loc ? 'lang-btn-active' : ''}`}
                onClick={() => setLocale(loc)}
              >
                {loc === 'en' ? 'English' : 'Español'}
              </button>
            ))}
          </div>
        </header>
        <div className="mode-tabs" role="tablist" aria-label="Game mode">
          <button type="button" role="tab" aria-selected={false} className="mode-tab" onClick={() => setGameMode('daily')}>
            Daily
          </button>
          <button type="button" role="tab" aria-selected={true} className="mode-tab mode-tab-active">
            Timed
          </button>
        </div>
        <section className="timed-start" aria-label="Timed challenge">
          <h2 className="timed-start-title">Timed challenge</h2>
          <p className="timed-start-desc">Find as many words as you can before time runs out.</p>
          <div className="timed-duration">
            <span className="timed-duration-label">Duration:</span>
            {TIMED_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`timed-duration-btn ${timedDuration === d ? 'timed-duration-btn-active' : ''}`}
                onClick={() => setTimedDuration(d)}
              >
                {d}s
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-start" onClick={startTimedRun}>
            Start
          </button>
        </section>
      </div>
    );
  }

  if (gameMode === 'timed' && showTimedSummary && timedResult) {
    const best = loadTimedBest(locale, timedDuration);
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">Xenolexia</h1>
          <p className="subtitle">Word-building puzzle</p>
          <div className="lang-switcher" role="group" aria-label="Language">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                className={`lang-btn ${locale === loc ? 'lang-btn-active' : ''}`}
                onClick={() => setLocale(loc)}
              >
                {loc === 'en' ? 'English' : 'Español'}
              </button>
            ))}
          </div>
        </header>
        <div className="mode-tabs" role="tablist" aria-label="Game mode">
          <button type="button" role="tab" aria-selected={false} className="mode-tab" onClick={() => setGameMode('daily')}>
            Daily
          </button>
          <button type="button" role="tab" aria-selected={true} className="mode-tab mode-tab-active">
            Timed
          </button>
        </div>
        <section className="timed-summary" aria-label="Timed run result">
          <h2 className="timed-summary-title">Time&apos;s up!</h2>
          <div className="timed-summary-stats">
            <div className="stat">
              <span className="stat-value">{timedResult.score}</span>
              <span className="stat-label">Score</span>
            </div>
            <div className="stat">
              <span className="stat-value">{timedResult.wordCount}</span>
              <span className="stat-label">Words</span>
            </div>
          </div>
          {best && (
            <p className="timed-summary-best">
              Best for {timedDuration}s: {best.score} pts, {best.wordCount} words
            </p>
          )}
          <button type="button" className="btn btn-start" onClick={startTimedRun}>
            Play again
          </button>
        </section>
      </div>
    );
  }

  if (!puzzle) {
    if (loadError) {
      return (
        <div className="app">
          <header className="app-header">
            <h1 className="app-title">Xenolexia</h1>
            <p className="subtitle">Word-building puzzle</p>
            <div className="lang-switcher" role="group" aria-label="Language">
              {SUPPORTED_LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={`lang-btn ${locale === loc ? 'lang-btn-active' : ''}`}
                  onClick={() => setLocale(loc)}
                >
                  {loc === 'en' ? 'English' : 'Español'}
                </button>
              ))}
            </div>
            <p className="load-error" role="alert">{loadError}</p>
          </header>
        </div>
      );
    }
    return <div className="loading">Loading…</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Xenolexia</h1>
        <p className="subtitle">Word-building puzzle</p>
        <div className="lang-switcher" role="group" aria-label="Language">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              className={`lang-btn ${locale === loc ? 'lang-btn-active' : ''}`}
              onClick={() => setLocale(loc)}
            >
              {loc === 'en' ? 'English' : 'Español'}
            </button>
          ))}
        </div>
        {gameMode === 'daily' && (
          <p className="daily-date">Today&apos;s puzzle · {formatPuzzleDate(puzzle.seed)}</p>
        )}
        {gameMode === 'timed' && timedRunning && (
          <p className="timed-timer" aria-live="polite" aria-atomic="true">
            {timedSecondsLeft}s
          </p>
        )}
        {loadError && (
          <p className="load-error" role="alert">
            {loadError}
          </p>
        )}
        {saveError && (
          <p className="save-error" role="alert">
            {saveError}
            <button
              type="button"
              className="save-error-dismiss"
              onClick={() => setSaveError(null)}
              aria-label="Dismiss save error"
            >
              Dismiss
            </button>
          </p>
        )}
      </header>

      <div className="mode-tabs" role="tablist" aria-label="Game mode">
        <button
          type="button"
          role="tab"
          aria-selected={gameMode === 'daily'}
          className={`mode-tab ${gameMode === 'daily' ? 'mode-tab-active' : ''}`}
          onClick={() => setGameMode('daily')}
        >
          Daily
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={gameMode === 'timed'}
          className={`mode-tab ${gameMode === 'timed' ? 'mode-tab-active' : ''}`}
          onClick={() => setGameMode('timed')}
        >
          Timed
        </button>
      </div>

      <div className="scoreboard" role="group" aria-label="Game stats">
        <div className="stat">
          <span className="stat-value" aria-label={`Score ${score}`}>{score}</span>
          <span className="stat-label">Score</span>
        </div>
        <div className="stat">
          <span className="stat-value" aria-label={`${found.length} words found`}>{found.length}</span>
          <span className="stat-label">Words</span>
        </div>
        {getDisplayStreak(streak, puzzle.seed) > 0 && gameMode === 'daily' && (
          <div className="stat stat-streak">
            <span className="stat-value" aria-label={`${getDisplayStreak(streak, puzzle.seed)} day streak`}>
              {getDisplayStreak(streak, puzzle.seed)}
            </span>
            <span className="stat-label">Day streak</span>
          </div>
        )}
      </div>

      <section className="tiles-section" aria-label="Letter tiles">
        <div className="tiles">
          {puzzle.letters.map((letter, i) => (
            <button
              key={i}
              type="button"
              className="tile"
              onClick={() => setInput((s) => s + letter)}
              aria-label={`Add letter ${letter.toUpperCase()}`}
            >
              {letter}
            </button>
          ))}
        </div>
        <div className="tiles-actions">
          <button
            type="button"
            className="btn btn-hint"
            onClick={() => {
              if (hintsUsed >= HINTS_PER_PUZZLE) {
                setMessage('No hints left.');
                return;
              }
              const word = pickRandomHint(puzzle.validWords, found);
              if (!word) {
                setMessage('No hints left.');
                return;
              }
              setHintWord(word);
              setHintsUsed((u) => u + 1);
              setMessage(null);
            }}
            disabled={hintsUsed >= HINTS_PER_PUZZLE || puzzle.validWords.every((w) => found.includes(w))}
            title={hintsUsed >= HINTS_PER_PUZZLE ? 'No hints left' : `Hint (${HINTS_PER_PUZZLE - hintsUsed} left)`}
          >
            Hint ({HINTS_PER_PUZZLE - hintsUsed} left)
          </button>
          <button
            type="button"
            className="btn btn-shuffle"
            onClick={() => setPuzzle({ ...puzzle, letters: shuffleArray(puzzle.letters) })}
            title="Shuffle letter order"
          >
            Shuffle
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="form" aria-label="Submit a word">
        <label htmlFor="word-input" className="visually-hidden">Type or tap letters to build a word</label>
        <input
          id="word-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or tap letters"
          className="input"
          autoComplete="off"
          aria-describedby="submit-hint"
        />
        <button type="submit" className="btn" id="submit-hint">
          Submit
        </button>
      </form>
      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`message ${message === 'Already found' || message.startsWith('Not ') ? 'error' : ''}`}
        >
          {message}
        </p>
      )}
      {hintWord && (
        <p role="status" aria-live="polite" className="message hint-reveal">
          Try: <strong>{hintWord}</strong>
        </p>
      )}
      {meaningCard && (
        <div
          className="meaning-overlay"
          role="dialog"
          aria-label="Word meaning"
          onClick={() => setMeaningCard(null)}
        >
          <div className="meaning-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="meaning-word">{meaningCard.word}</h2>
            <p className="meaning-translation">
              {meaningCard.translation ?? 'No definition available'}
            </p>
            {meaningCard.example ? (
              <p className="meaning-example">“{meaningCard.example}”</p>
            ) : null}
            <p className="meaning-points">+{meaningCard.points} pts</p>
            <div className="meaning-actions">
              {isTTSAvailable() && (
                <button
                  type="button"
                  className="meaning-speak"
                  onClick={() =>
                    speakWithTTS(meaningCard.word, meaningCard.example, locale)
                  }
                  aria-label="Speak word pronunciation"
                >
                  Speak
                </button>
              )}
              <button
                type="button"
                className="meaning-dismiss"
                onClick={() => setMeaningCard(null)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="found-section" aria-label="Words found">
        <h2 className="found-heading">Found ({found.length})</h2>
        <ul className="found-list">
          {sortFoundWords(found).map((w) => (
            <li key={w} className="found-item">
              <span className="found-word">{w}</span>
              <span className="found-pts">+{scoreForWord(w.length)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
