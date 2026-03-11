import { useEffect, useState } from 'react';
import {
  setDictionary,
  sampleDictionary,
  generatePuzzle,
  getDailySeed,
  getEntry,
  validateWord,
  hasWord,
  getDisplayStreak,
  updateStreakAfterPlay,
  scoreForWordLength,
  type Puzzle,
  type DailyProgressState,
  type StreakState,
} from 'xenolexia-core';

const STORAGE_KEY = 'xenolexia-daily';
const PROGRESS_KEY = 'xenolexia-daily-progress';
const STREAK_KEY = 'xenolexia-streak';

function loadDailyPuzzle(): { puzzle: Puzzle; date: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date: string; puzzle: Puzzle };
    if (!data.date || !data.puzzle?.letters || !Array.isArray(data.puzzle.validWords)) return null;
    return { puzzle: data.puzzle, date: data.date };
  } catch {
    return null;
  }
}

function saveDailyPuzzle(date: string, puzzle: Puzzle): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, puzzle }));
  } catch {
    /* ignore */
  }
}

function loadDailyProgress(date: string): DailyProgressState | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date: string; foundWords: string[]; score: number };
    if (data.date !== date || !Array.isArray(data.foundWords)) return null;
    return { foundWords: data.foundWords, score: data.score ?? 0 };
  } catch {
    return null;
  }
}

function saveDailyProgress(date: string, state: DailyProgressState): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ date, ...state }));
  } catch {
    /* ignore */
  }
}

function loadStreak(): StreakState | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StreakState;
    if (!data.lastPlayedDate || typeof data.streakCount !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function saveStreak(state: StreakState): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

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

function App() {
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

  useEffect(() => {
    try {
      setDictionary(sampleDictionary);
      const today = getDailySeed();
      const stored = loadDailyPuzzle();
      if (stored && stored.date === today) {
        setPuzzle(stored.puzzle);
        const progress = loadDailyProgress(today);
        if (progress) {
          setFound(progress.foundWords);
          setScore(progress.score);
        }
      } else {
        const newPuzzle = generatePuzzle({ seed: today });
        saveDailyPuzzle(today, newPuzzle);
        setPuzzle(newPuzzle);
      }
      setStreak(loadStreak());
    } catch {
      const today = getDailySeed();
      const newPuzzle = generatePuzzle({ seed: today });
      setPuzzle(newPuzzle);
      setLoadError("Progress couldn't be loaded. Today's puzzle is ready.");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const word = input.trim().toLowerCase();
    setInput('');
    setMessage(null);
    setMeaningCard(null);
    if (!word || !puzzle) return;

    const result = validateWord(puzzle, word, found);
    if (result.ok) {
      const points = result.points;
      const today = getDailySeed();
      setScore((s) => s + points);
      const newFound = [...found, word].sort();
      setFound(newFound);
      saveDailyProgress(today, { foundWords: newFound, score: score + points });
      const newStreak = updateStreakAfterPlay(streak, today);
      setStreak(newStreak);
      saveStreak(newStreak);
      const entry = getEntry(word);
      setMeaningCard({
        word,
        translation: entry?.translation ?? null,
        example: entry?.example ?? null,
        points,
      });
      return;
    }
    if (result.reason === 'already_found') {
      setMessage('Already found');
      return;
    }
    setMessage(hasWord(word) ? 'Not formable from these letters' : 'Not in dictionary');
  };

  if (!puzzle) return <div className="loading">Loading…</div>;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Xenolexia</h1>
        <p className="subtitle">Word-building puzzle</p>
        <p className="daily-date">Today&apos;s puzzle · {formatPuzzleDate(puzzle.seed)}</p>
        {loadError && (
          <p className="load-error" role="alert">
            {loadError}
          </p>
        )}
      </header>

      <div className="scoreboard" role="group" aria-label="Game stats">
        <div className="stat">
          <span className="stat-value" aria-label={`Score ${score}`}>{score}</span>
          <span className="stat-label">Score</span>
        </div>
        <div className="stat">
          <span className="stat-value" aria-label={`${found.length} words found`}>{found.length}</span>
          <span className="stat-label">Words</span>
        </div>
        {getDisplayStreak(streak, puzzle.seed) > 0 && (
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
            <button
              type="button"
              className="meaning-dismiss"
              onClick={() => setMeaningCard(null)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      <section className="found-section" aria-label="Words found">
        <h2 className="found-heading">Found ({found.length})</h2>
        <ul className="found-list">
          {sortFoundWords(found).map((w) => (
            <li key={w} className="found-item">
              <span className="found-word">{w}</span>
              <span className="found-pts">+{scoreForWordLength(w.length)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
