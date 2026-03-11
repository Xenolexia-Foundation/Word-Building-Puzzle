import React, { useEffect, useState } from 'react';
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

async function loadDailyPuzzle(): Promise<{ puzzle: Puzzle; date: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date: string; puzzle: Puzzle };
    if (!data.date || !data.puzzle?.letters || !Array.isArray(data.puzzle.validWords)) return null;
    return { puzzle: data.puzzle, date: data.date };
  } catch {
    return null;
  }
}

async function saveDailyPuzzle(date: string, puzzle: Puzzle): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date, puzzle }));
  } catch {
    /* ignore */
  }
}

async function loadDailyProgress(date: string): Promise<DailyProgressState | null> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { date: string; foundWords: string[]; score: number };
    if (data.date !== date || !Array.isArray(data.foundWords)) return null;
    return { foundWords: data.foundWords, score: data.score ?? 0 };
  } catch {
    return null;
  }
}

async function saveDailyProgress(date: string, state: DailyProgressState): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ date, ...state }));
  } catch {
    /* ignore */
  }
}

async function loadStreak(): Promise<StreakState | null> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StreakState;
    if (!data.lastPlayedDate || typeof data.streakCount !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

async function saveStreak(state: StreakState): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(state));
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

function sortFoundWords(words: string[]): string[] {
  return [...words].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export default function App() {
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
    setDictionary(sampleDictionary);
    let cancelled = false;
    (async () => {
      try {
        const today = getDailySeed();
        const stored = await loadDailyPuzzle();
        if (cancelled) return;
        if (stored && stored.date === today) {
          setPuzzle(stored.puzzle);
          const progress = await loadDailyProgress(today);
          if (!cancelled && progress) {
            setFound(progress.foundWords);
            setScore(progress.score);
          }
        } else {
          const newPuzzle = generatePuzzle({ seed: today });
          await saveDailyPuzzle(today, newPuzzle);
          if (!cancelled) setPuzzle(newPuzzle);
        }
        const streakState = await loadStreak();
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
  }, []);

  const handleSubmit = () => {
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

  const addLetter = (letter: string) => setInput((s) => s + letter);

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
        <Text style={styles.dailyDate}>
          Today&apos;s puzzle · {formatPuzzleDate(puzzle.seed)}
        </Text>
        {loadError ? (
          <Text style={styles.loadError} accessibilityRole="alert">{loadError}</Text>
        ) : null}
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
        {getDisplayStreak(streak, puzzle.seed) > 0 && (
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
