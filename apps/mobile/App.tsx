import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  scoreForWordLength,
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

async function loadStoredLocale(): Promise<Locale> {
  try {
    const raw = await AsyncStorage.getItem(LANG_KEY);
    if (raw === 'en' || raw === 'es') return raw;
  } catch {
    /* ignore */
  }
  return 'en';
}

async function loadTimedBest(locale: Locale, duration: number): Promise<{ score: number; wordCount: number } | null> {
  try {
    const key = getStorageKeys(locale).timedBest(duration);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as { score: number; wordCount: number };
    if (typeof data.score !== 'number' || typeof data.wordCount !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

async function saveTimedBest(locale: Locale, duration: number, score: number, wordCount: number): Promise<void> {
  try {
    const key = getStorageKeys(locale).timedBest(duration);
    await AsyncStorage.setItem(key, JSON.stringify({ score, wordCount }));
  } catch {
    /* ignore */
  }
}

async function loadDailyPuzzle(locale: Locale): Promise<{ puzzle: Puzzle; date: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKeys(locale).daily);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date: string; puzzle: Puzzle };
    if (!data.date || !data.puzzle?.letters || !Array.isArray(data.puzzle.validWords)) return null;
    return { puzzle: data.puzzle, date: data.date };
  } catch {
    return null;
  }
}

async function saveDailyPuzzle(locale: Locale, date: string, puzzle: Puzzle): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKeys(locale).daily, JSON.stringify({ date, puzzle }));
  } catch {
    /* ignore */
  }
}

async function loadDailyProgress(locale: Locale, date: string): Promise<DailyProgressState | null> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKeys(locale).progress);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date: string; foundWords: string[]; score: number };
    if (data.date !== date || !Array.isArray(data.foundWords)) return null;
    return { foundWords: data.foundWords, score: data.score ?? 0 };
  } catch {
    return null;
  }
}

async function saveDailyProgress(locale: Locale, date: string, state: DailyProgressState): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKeys(locale).progress, JSON.stringify({ date, ...state }));
  } catch {
    /* ignore */
  }
}

async function loadStreak(locale: Locale): Promise<StreakState | null> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKeys(locale).streak);
    if (!raw) return null;
    const data = JSON.parse(raw) as StreakState;
    if (!data.lastPlayedDate || typeof data.streakCount !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

async function saveStreak(locale: Locale, state: StreakState): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKeys(locale).streak, JSON.stringify(state));
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

export default function App() {
  const [locale, setLocaleState] = useState<Locale>('en');
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
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  const [timedDuration, setTimedDuration] = useState<TimedDuration>(60);
  const [timedRunning, setTimedRunning] = useState(false);
  const [timedSecondsLeft, setTimedSecondsLeft] = useState(0);
  const [timedResult, setTimedResult] = useState<{ score: number; wordCount: number } | null>(null);
  const [showTimedSummary, setShowTimedSummary] = useState(false);
  const timedEndHandled = useRef(false);
  const [timedBest, setTimedBest] = useState<{ score: number; wordCount: number } | null>(null);

  useEffect(() => {
    loadStoredLocale().then(setLocaleState);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    AsyncStorage.setItem(LANG_KEY, newLocale).catch(() => {});
  };

  useEffect(() => {
    if (gameMode === 'timed') {
      setPuzzle(null);
      setShowTimedSummary(false);
      setTimedResult(null);
      setTimedRunning(false);
      timedEndHandled.current = false;
      return;
    }
    setDictionary(DICTIONARIES[locale]);
    let cancelled = false;
    (async () => {
      try {
        const today = getDailySeed();
        const stored = await loadDailyPuzzle(locale);
        if (cancelled) return;
        if (stored && stored.date === today) {
          setPuzzle(stored.puzzle);
          const progress = await loadDailyProgress(locale, today);
          if (!cancelled && progress) {
            setFound(progress.foundWords);
            setScore(progress.score);
          }
        } else {
          const newPuzzle = generatePuzzle({ seed: today });
          await saveDailyPuzzle(locale, today, newPuzzle);
          if (!cancelled) setPuzzle(newPuzzle);
        }
        const streakState = await loadStreak(locale);
        if (!cancelled) setStreak(streakState);
      } catch {
        if (cancelled) return;
        const today = getDailySeed();
        setPuzzle(generatePuzzle({ seed: today }));
        setLoadError("Progress couldn't be loaded. Today's puzzle is ready.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameMode, locale]);

  useEffect(() => {
    setHintWord(null);
    setHintsUsed(0);
  }, [puzzle?.seed]);

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

  useEffect(() => {
    if (gameMode !== 'timed' || timedRunning || timedSecondsLeft > 0) return;
    if (timedEndHandled.current || !puzzle) return;
    timedEndHandled.current = true;
    setTimedResult({ score, wordCount: found.length });
    setShowTimedSummary(true);
    loadTimedBest(locale, timedDuration).then((best) => {
      setTimedBest(best);
      if (!best || score > best.score || (score === best.score && found.length > best.wordCount)) {
        saveTimedBest(locale, timedDuration, score, found.length);
        setTimedBest({ score, wordCount: found.length });
      }
    });
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
    setTimedBest(null);
  };

  const handleSubmit = () => {
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
        saveDailyProgress(locale, today, { foundWords: newFound, score: score + points });
        const newStreak = updateStreakAfterPlay(streak, today);
        setStreak(newStreak);
        saveStreak(locale, newStreak);
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

  const addLetter = (letter: string) => setInput((s) => s + letter);

  if (gameMode === 'timed' && !timedRunning && !showTimedSummary) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Xenolexia</Text>
          <Text style={styles.subtitle}>Word-building puzzle</Text>
          <View style={styles.langSwitcher}>
            {SUPPORTED_LOCALES.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.langBtn, locale === loc && styles.langBtnActive]}
                onPress={() => setLocale(loc)}
              >
                <Text style={[styles.langBtnText, locale === loc && styles.langBtnTextActive]}>
                  {loc === 'en' ? 'English' : 'Español'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.modeTabs}>
          <TouchableOpacity style={[styles.modeTab, styles.modeTabInactive]} onPress={() => setGameMode('daily')}>
            <Text style={styles.modeTabText}>Daily</Text>
          </TouchableOpacity>
          <View style={[styles.modeTab, styles.modeTabActive]}>
            <Text style={styles.modeTabTextActive}>Timed</Text>
          </View>
        </View>
        <View style={styles.timedStart}>
          <Text style={styles.timedStartTitle}>Timed challenge</Text>
          <Text style={styles.timedStartDesc}>Find as many words as you can before time runs out.</Text>
          <View style={styles.timedDuration}>
            <Text style={styles.timedDurationLabel}>Duration:</Text>
            {TIMED_DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.timedDurationBtn, timedDuration === d && styles.timedDurationBtnActive]}
                onPress={() => setTimedDuration(d)}
              >
                <Text style={timedDuration === d ? styles.timedDurationBtnTextActive : styles.timedDurationBtnText}>
                  {d}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.btnStart} onPress={startTimedRun}>
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (gameMode === 'timed' && showTimedSummary && timedResult) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Xenolexia</Text>
          <Text style={styles.subtitle}>Word-building puzzle</Text>
          <View style={styles.langSwitcher}>
            {SUPPORTED_LOCALES.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.langBtn, locale === loc && styles.langBtnActive]}
                onPress={() => setLocale(loc)}
              >
                <Text style={[styles.langBtnText, locale === loc && styles.langBtnTextActive]}>
                  {loc === 'en' ? 'English' : 'Español'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.modeTabs}>
          <TouchableOpacity style={[styles.modeTab, styles.modeTabInactive]} onPress={() => setGameMode('daily')}>
            <Text style={styles.modeTabText}>Daily</Text>
          </TouchableOpacity>
          <View style={[styles.modeTab, styles.modeTabActive]}>
            <Text style={styles.modeTabTextActive}>Timed</Text>
          </View>
        </View>
        <View style={styles.timedSummary}>
          <Text style={styles.timedSummaryTitle}>Time&apos;s up!</Text>
          <View style={styles.timedSummaryStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{timedResult.score}</Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{timedResult.wordCount}</Text>
              <Text style={styles.statLabel}>Words</Text>
            </View>
          </View>
          {timedBest && (
            <Text style={styles.timedSummaryBest}>
              Best for {timedDuration}s: {timedBest.score} pts, {timedBest.wordCount} words
            </Text>
          )}
          <TouchableOpacity style={styles.btnStart} onPress={startTimedRun}>
            <Text style={styles.buttonText}>Play again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (!puzzle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel="Xenolexia word puzzle"
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Xenolexia</Text>
        <Text style={styles.subtitle}>Word-building puzzle</Text>
        <View style={styles.langSwitcher}>
          {SUPPORTED_LOCALES.map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[styles.langBtn, locale === loc && styles.langBtnActive]}
              onPress={() => setLocale(loc)}
            >
              <Text style={[styles.langBtnText, locale === loc && styles.langBtnTextActive]}>
                {loc === 'en' ? 'English' : 'Español'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {gameMode === 'daily' && (
          <Text style={styles.dailyDate}>
            Today&apos;s puzzle · {formatPuzzleDate(puzzle.seed)}
          </Text>
        )}
        {gameMode === 'timed' && timedRunning && (
          <Text style={styles.timedTimer}>{timedSecondsLeft}s</Text>
        )}
        {loadError ? (
          <Text style={styles.loadError} accessibilityRole="alert">{loadError}</Text>
        ) : null}
      </View>

      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, gameMode === 'daily' ? styles.modeTabActive : styles.modeTabInactive]}
          onPress={() => setGameMode('daily')}
        >
          <Text style={gameMode === 'daily' ? styles.modeTabTextActive : styles.modeTabText}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, gameMode === 'timed' ? styles.modeTabActive : styles.modeTabInactive]}
          onPress={() => setGameMode('timed')}
        >
          <Text style={gameMode === 'timed' ? styles.modeTabTextActive : styles.modeTabText}>Timed</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scoreboard} accessibilityLabel={`Score ${score}, ${found.length} words found`}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{score}</Text>
          <Text style={styles.statLabel}>Score</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{found.length}</Text>
          <Text style={styles.statLabel}>Words</Text>
        </View>
        {getDisplayStreak(streak, puzzle.seed) > 0 && gameMode === 'daily' && (
          <View style={[styles.stat, styles.statStreak]}>
            <Text style={[styles.statValue, styles.statStreakValue]}>{getDisplayStreak(streak, puzzle.seed)}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
        )}
      </View>

      <View style={styles.tilesSection} accessibilityLabel="Letter tiles">
        <View style={styles.tiles}>
          {puzzle.letters.map((letter, i) => (
            <TouchableOpacity
              key={i}
              style={styles.tile}
              onPress={() => addLetter(letter)}
              accessibilityLabel={`Add letter ${letter.toUpperCase()}`}
              accessibilityRole="button"
            >
              <Text style={styles.tileText}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tilesActions}>
          <TouchableOpacity
            style={[
              styles.btnHint,
              (hintsUsed >= HINTS_PER_PUZZLE || puzzle.validWords.every((w) => found.includes(w))) && styles.btnHintDisabled,
            ]}
            onPress={() => {
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
            accessibilityLabel={hintsUsed >= HINTS_PER_PUZZLE ? 'No hints left' : `Hint, ${HINTS_PER_PUZZLE - hintsUsed} left`}
            accessibilityRole="button"
          >
            <Text style={styles.btnHintText}>Hint ({HINTS_PER_PUZZLE - hintsUsed} left)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnShuffle}
            onPress={() => setPuzzle({ ...puzzle, letters: shuffleArray(puzzle.letters) })}
            accessibilityLabel="Shuffle letter order"
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Shuffle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type or tap letters"
          placeholderTextColor="#565f89"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Word input"
          accessibilityHint="Type a word or tap letter tiles"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          accessibilityLabel="Submit word"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {message ? (
        <Text
          style={[
            styles.message,
            (message === 'Already found' || message.startsWith('Not ')) && styles.messageError,
          ]}
        >
          {message}
        </Text>
      ) : null}
      {hintWord ? (
        <Text style={[styles.message, styles.hintReveal]}>
          Try: <Text style={styles.hintRevealWord}>{hintWord}</Text>
        </Text>
      ) : null}

      <Modal
        visible={!!meaningCard}
        transparent
        animationType="fade"
        onRequestClose={() => setMeaningCard(null)}
      >
        <TouchableOpacity
          style={styles.meaningOverlay}
          activeOpacity={1}
          onPress={() => setMeaningCard(null)}
        >
          <View style={styles.meaningCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.meaningWord}>
              {meaningCard?.word ?? ''}
            </Text>
            <Text style={styles.meaningTranslation}>
              {meaningCard?.translation ?? 'No definition available'}
            </Text>
            {meaningCard?.example ? (
              <Text style={styles.meaningExample}>"{meaningCard.example}"</Text>
            ) : null}
            <Text style={styles.meaningPoints}>+{meaningCard?.points ?? 0} pts</Text>
            <TouchableOpacity
              style={styles.meaningDismiss}
              onPress={() => setMeaningCard(null)}
            >
              <Text style={styles.meaningDismissText}>Next</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.foundSection} accessibilityLabel={`Words found: ${found.length}`}>
        <Text style={styles.foundTitle}>Found ({found.length})</Text>
        {sortFoundWords(found).map((item) => (
          <View key={item} style={styles.foundItemRow}>
            <Text style={styles.foundItem}>{item}</Text>
            <Text style={styles.foundPts}>+{scoreForWordLength(item.length)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#1a1b26',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1b26',
  },
  loading: {
    color: '#7aa2f7',
    fontSize: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7dcfff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#565f89',
    marginBottom: 4,
  },
  dailyDate: {
    fontSize: 13,
    color: '#565f89',
  },
  loadError: {
    marginTop: 6,
    fontSize: 12,
    color: '#e0af68',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  langSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#414868',
    backgroundColor: '#24283b',
  },
  langBtnActive: {
    backgroundColor: '#414868',
    borderColor: '#7aa2f7',
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#565f89',
  },
  langBtnTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7dcfff',
  },
  modeTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#414868',
    backgroundColor: '#24283b',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  modeTabInactive: {},
  modeTabActive: {
    backgroundColor: '#414868',
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#565f89',
  },
  modeTabTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7dcfff',
  },
  timedTimer: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '700',
    color: '#f7768e',
  },
  timedStart: {
    marginTop: 16,
    padding: 20,
    backgroundColor: '#24283b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#414868',
  },
  timedStartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7dcfff',
    marginBottom: 8,
  },
  timedStartDesc: {
    fontSize: 14,
    color: '#565f89',
    marginBottom: 20,
  },
  timedDuration: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  timedDurationLabel: {
    fontSize: 14,
    color: '#565f89',
    width: '100%',
  },
  timedDurationBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#414868',
  },
  timedDurationBtnActive: {
    borderColor: '#7aa2f7',
    backgroundColor: '#414868',
  },
  timedDurationBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c0caf5',
  },
  timedDurationBtnTextActive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7dcfff',
  },
  btnStart: {
    backgroundColor: '#7aa2f7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  timedSummary: {
    marginTop: 16,
    padding: 20,
    backgroundColor: '#24283b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#414868',
  },
  timedSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7dcfff',
    marginBottom: 16,
  },
  timedSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  timedSummaryBest: {
    fontSize: 13,
    color: '#9ece6a',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  stat: {
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#24283b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#414868',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7dcfff',
  },
  statLabel: {
    fontSize: 10,
    color: '#565f89',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statStreak: {
    borderColor: '#9ece6a',
  },
  statStreakValue: {
    color: '#9ece6a',
  },
  tilesSection: {
    marginBottom: 16,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tilesActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  btnHint: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#414868',
    borderWidth: 1,
    borderColor: '#565f89',
  },
  btnHintDisabled: {
    opacity: 0.5,
  },
  btnHintText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c0caf5',
  },
  btnShuffle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#7aa2f7',
  },
  tile: {
    width: 52,
    height: 52,
    backgroundColor: '#24283b',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#414868',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#c0caf5',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#24283b',
    borderWidth: 2,
    borderColor: '#414868',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#c0caf5',
  },
  button: {
    backgroundColor: '#7aa2f7',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1b26',
  },
  message: {
    fontSize: 14,
    color: '#9ece6a',
    marginBottom: 16,
    minHeight: 20,
  },
  messageError: {
    color: '#f7768e',
  },
  hintReveal: {
    color: '#7dcfff',
  },
  hintRevealWord: {
    fontWeight: '700',
  },
  foundSection: {
    backgroundColor: '#24283b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#414868',
    padding: 16,
    marginTop: 8,
  },
  foundTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7dcfff',
    marginBottom: 10,
  },
  foundItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingLeft: 4,
  },
  foundItem: {
    fontSize: 15,
    color: '#c0caf5',
    textTransform: 'capitalize',
  },
  foundPts: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ece6a',
  },
  meaningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  meaningCard: {
    backgroundColor: '#24283b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#414868',
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  meaningWord: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7dcfff',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  meaningTranslation: {
    fontSize: 16,
    color: '#c0caf5',
    lineHeight: 22,
    marginBottom: 8,
  },
  meaningExample: {
    fontSize: 14,
    color: '#565f89',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  meaningPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ece6a',
    marginBottom: 16,
  },
  meaningDismiss: {
    backgroundColor: '#7aa2f7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  meaningDismissText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1b26',
  },
});
