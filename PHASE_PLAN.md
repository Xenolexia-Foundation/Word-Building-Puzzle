# Xenolexia — Word-Building Puzzle: Phase Plan

A phased roadmap from zero to MVP and beyond, aligned with your TypeScript stack and offline-first approach.

---

## Overview

| Phase | Focus | Outcome |
|-------|--------|---------|
| **Phase 0** | Setup & dictionary | Project scaffold + word data ready |
| **Phase 1** | Puzzle generator | 6–8 letter sets with 10–20 valid words |
| **Phase 2** | Word validation & scoring | Valid words, no duplicates, points by length |
| **Phase 3** | Meaning lookup | Translation + optional example after each word |
| **Phase 4** | Daily puzzle mode | One puzzle per day, date-seeded, same for all |
| **Phase 5** | Progress tracking | Words found, score, streaks |
| **Phase 6** | Simple UI | Tiles, input, word list, scoreboard |
| **Phase 7** | Polish & ship | Offline-first, testing, first release |
| **Phase 8** | Stretch | 8.1 Timed · 8.2 Leaderboards · 8.3 i18n · 8.4 Audio · 8.5 Hints |

---

## Phase 0: Project Setup & Dictionary

**Goal:** Repo, build pipeline, and a usable dictionary for the target language.

### Tasks

1. **Scaffold project**
   - React (or React Native) + TypeScript app (Vite or Create React App).
   - Optional: Node/Express if you want a future API; can start without it.
   - ESLint, Prettier, basic folder structure (`/src/components`, `/src/lib`, `/src/data`).

2. **Dictionary format & source**
   - Choose format: **JSON** (simpler) or **SQLite** (better for large lists).
   - For MVP: one target language; structure per entry, e.g.:
     - `word`, `definition`/`translation`, optional `example`.
   - Source: open word lists (e.g. Wiktionary dumps, existing JSON/SQLite word lists for your language).
   - Place file(s) under `/src/data` or `/public` and add types (e.g. `DictionaryEntry`).

3. **Dictionary loader**
   - Load dictionary at app init (or lazy-load).
   - Expose a small API: `getDictionary()`, `hasWord(word)`, `getEntry(word)` (for meanings later).
   - If SQLite: use `sql.js` or similar for in-browser SQLite; same API behind it.

### Deliverables

- [ ] App runs (dev server).
- [ ] Dictionary loaded and queryable (e.g. `hasWord`, `getEntry`).
- [ ] Types for dictionary entries.

### Duration (estimate)

**1–2 days**

---

## Phase 1: Puzzle Generator

**Goal:** Generate a set of 6–8 letters such that at least 10–20 valid words exist in the dictionary.

### Tasks

1. **Letter set representation**
   - Model a “letter set” (e.g. 6–8 characters, possibly with allowed multiplicities).
   - Decide rules: only unique letters, or allow repeats (e.g. two “E”s). MVP: 6–8 distinct letters is simpler.

2. **Word finder (solver)**
   - Given a set of letters, enumerate all substrings that are valid words (permutations/subset of letters).
   - Implement efficiently: e.g. iterate dictionary and check “can this word be formed from the set?” (frequency map or set inclusion).
   - Return list of valid words for a given set.

3. **Puzzle generator**
   - Randomly (or deterministically) pick letter sets; for each, run word finder.
   - Keep only sets that have between 10–20 (or your chosen range) valid words.
   - Optional: weight letter frequency (e.g. more vowels) for playability.
   - Expose: `generatePuzzle(options?)` → `{ letters: string[], validWords: string[] }` (validWords used internally for validation, not shown to user).

4. **Deterministic seed**
   - Make generator seed-based so that the same seed (e.g. date string) produces the same puzzle (for daily mode later).

### Deliverables

- [ ] `generatePuzzle(seed?)` returns letters + internal valid word set.
- [ ] Guarantee: at least 10–20 valid words per generated puzzle.
- [ ] Unit tests for word finder and generator (e.g. known letter set → known word count).

### Duration (estimate)

**2–4 days**

---

## Phase 2: Word Validation & Scoring

**Goal:** User can submit words; system validates, blocks duplicates, and awards points by length.

### Tasks

1. **Validation**
   - On submit: normalize input (trim, lowercase, optional diacritic handling).
   - Check word is in the puzzle’s valid word set (from Phase 1).
   - Reject duplicates (track “already found” words for the current puzzle).

2. **Scoring**
   - Define formula: e.g. points = f(length). Simple: 1 point per letter, or 2^length, or tiered (3–4 letters: 10, 5: 20, 6+: 40).
   - Persist score for current puzzle (in-memory for the session; Phase 5 will persist).

3. **Feedback**
   - Clear feedback: “Valid! +X points” vs “Invalid” vs “Already found.”
   - Optional: list which letters were used (for learning).

### Deliverables

- [ ] Submit word → valid/invalid/duplicate + points.
- [ ] Running score for the current puzzle.
- [ ] No duplicate credits for the same word.

### Duration (estimate)

**1–2 days**

---

## Phase 3: Meaning Lookup

**Goal:** After a correct word, show translation; optionally show an example sentence.

### Tasks

1. **Lookup**
   - Use `getEntry(word)` from Phase 0; display `definition`/`translation` in UI.
   - If dictionary has `example`, show it (optional for MVP).

2. **UI**
   - After “Valid! +X points”, show a small card or modal: word + meaning (+ optional example).
   - Dismiss and continue (e.g. “Next” or tap outside).

3. **Missing data**
   - If no definition for a word, show “No definition available” so the flow doesn’t break.

### Deliverables

- [ ] Every correct word shows translation (and optional example if present).
- [ ] Graceful handling of missing definitions.

### Duration (estimate)

**1 day**

---

## Phase 4: Daily Puzzle Mode

**Goal:** One puzzle per day; same puzzle for everyone, seeded by date.

### Tasks

1. **Date seed**
   - Derive seed from current date (e.g. `YYYY-MM-DD` or hashed value).
   - `generatePuzzle(seed)` from Phase 1 must be deterministic for this seed.

2. **Daily puzzle state**
   - At app load, if “today’s puzzle” not in state, generate it with date seed and store it (in-memory or localStorage).
   - If stored puzzle date < today, replace with new daily puzzle.
   - Optional: store yesterday’s puzzle for “play yesterday” feature later.

3. **UI**
   - Indicate “Today’s puzzle” and the date.
   - Optional: countdown to next day (optional for MVP).

### Deliverables

- [ ] One puzzle per calendar day.
- [ ] Same letters for all users on the same day.
- [ ] Puzzle resets at day boundary.

### Duration (estimate)

**1–2 days**

---

## Phase 5: Progress Tracking

**Goal:** Persist words found, score, and streaks (daily play).

### Tasks

1. **Persistence**
   - Use localStorage (or SQLite via sql.js) to store:
     - Per day: puzzle seed/letters, found words, score.
     - Streak: last played date, consecutive days count.
   - Define schema (e.g. `Progress` type and helpers).

2. **Words found**
   - Save found words for today’s puzzle so they persist across refresh.
   - Load on init and merge with current session.

3. **Score**
   - Store best/total score for the day (and optionally all-time).

4. **Streaks**
   - On day boundary: if user played yesterday, increment streak; if they missed a day, reset.
   - Display: “3-day streak” in UI.

### Deliverables

- [ ] Words found and score persist for the current day.
- [ ] Streak calculation and display.
- [ ] Data survives refresh and re-open.

### Duration (estimate)

**1–2 days**

---

## Phase 6: Simple UI

**Goal:** Letter tiles, input, word list, scoreboard — clean and usable.

### Tasks

1. **Letter tiles**
   - Display the 6–8 letters as tappable/clickable tiles.
   - Optional: tap to add to input, or type in field; either way, clear visual feedback.

2. **Input**
   - Input field or “build word” area (taps append to input, or type).
   - Submit on button or Enter.
   - Clear after submit.

3. **Word list**
   - List of found words (from progress); optional: show points per word.
   - Sorted (e.g. by length or time found).

4. **Scoreboard**
   - Current score, words found count, streak.
   - Optional: “Puzzle of [date]”.

5. **Layout & responsiveness**
   - Works on mobile and desktop (React or React Native accordingly).
   - Basic accessibility (focus, labels).

### Deliverables

- [ ] Tiles, input, submit, word list, scoreboard.
- [ ] Readable, responsive layout.
- [ ] Meaning card after each correct word (from Phase 3).

### Duration (estimate)

**2–3 days**

---

## Phase 7: Polish & Ship (MVP Release)

**Goal:** Offline-first, stable, shippable first version.

### Tasks

1. **Offline-first**
   - Dictionary and app logic run without network.
   - If you add any API later, degrade gracefully when offline.
   - Optional: service worker + cache for PWA.

2. **Testing**
   - Critical path tests: puzzle generation, validation, scoring, daily seed.
   - Manual pass: full flow on a few devices.

3. **Error handling**
   - Load dictionary failure; invalid date; corrupt localStorage — show messages, don’t crash.

4. **Performance**
   - Lazy-load dictionary if large; ensure first interaction is fast.

5. **Release**
   - Build for web (and/or React Native build).
   - Deploy (Vercel/Netlify for web, or store for native).
   - Version and changelog (e.g. v0.1.0 MVP).

### Deliverables

- [ ] Works offline.
- [ ] Tested and stable.
- [ ] First deploy (web or app store).

### Duration (estimate)

**2–3 days**

---

## Phase 8: Stretch Features — Overview

After MVP, these can be tackled in any order. Suggested sequence: **8.1 → 8.2 → 8.3 → 8.4 → 8.5** (timed first, then leaderboards, i18n, audio, hints). Dependencies are noted per subphase.

| Subphase | Focus | Deps | Est. |
|----------|--------|------|------|
| **8.1** | Timed challenge mode | Phase 2, 5 | 2–3 days |
| **8.2** | Leaderboards | Backend, 8.1 optional | 3–5 days |
| **8.3** | Multiple languages | Phase 0 | 2–3 days |
| **8.4** | Audio pronunciation | Phase 3 | 1–2 days |
| **8.5** | Hints / power-ups | Phase 1, 6 | 1–2 days |

---

## Phase 8.1: Timed Challenge Mode

**Goal:** A separate mode where the user has a fixed time (e.g. 60s) to find as many words as possible from one puzzle. Score and words found are tracked for the session; optional local best.

### Tasks

1. **Mode selection**
   - Add a way to choose “Daily” vs “Timed” (e.g. tab, menu, or home screen).
   - Timed mode does not use the daily seed; generate a puzzle on demand (or reuse a fixed “challenge” seed per day for fairness).

2. **Timer logic**
   - Countdown from e.g. 60 seconds (configurable: 30 / 60 / 90).
   - On start: generate puzzle, start timer, clear found/score.
   - On expiry: stop input, show final score and word count, optionally “Play again” with new puzzle.
   - Pause/resume optional (e.g. pause when meaning card is open).

3. **Scoring & storage**
   - Reuse Phase 2 scoring; no streak in timed mode.
   - Persist “best timed score” (and/or best word count) in localStorage/AsyncStorage per duration (e.g. best 60s score). Phase 5 progress types can be extended or a separate key used.

4. **UI**
   - Prominent countdown (e.g. large timer, color change in last 10s).
   - “Start” / “Play again” CTA; after run: summary screen (score, words found, best).

### Deliverables

- [ ] Timed mode selectable; timer countdown; game ends when time runs out.
- [ ] Score and words found shown during and after run.
- [ ] Optional: local best score/count for timed mode.

### Duration (estimate)

**2–3 days**

---

## Phase 8.2: Leaderboards

**Goal:** Daily or all-time leaderboards so users can compare scores. Requires a backend (or serverless) and a way to identify users (anonymous ID or auth).

### Tasks

1. **Backend**
   - Add a small API (e.g. Node/Express or serverless): submit score (payload: date or “timed”, score, word count, optional user id / anonymous id).
   - Store entries in DB (e.g. PostgreSQL, SQLite, or Firebase). Schema: e.g. `(id, date|mode, score, word_count, user_id, created_at)`.
   - Endpoints: `POST /score`, `GET /leaderboard?date=YYYY-MM-DD` or `?mode=timed&duration=60`.

2. **Identity**
   - Option A: Anonymous device/user id (UUID in localStorage; no login).
   - Option B: Simple auth (email+password or OAuth) to attach scores to an account.
   - Decide policy: one submission per user per day (or best of N for timed).

3. **App integration**
   - After daily puzzle or timed run, optionally “Submit to leaderboard” (if online).
   - Leaderboard screen or section: list top N (e.g. 10) with rank, score, words (and “You” highlighted if present). Handle offline: show “Submit when online” or cached last fetch.

4. **Privacy & rules**
   - Decide what is public (nickname, score, rank). Comply with any store/legal requirements (e.g. age, data disclosure).

### Deliverables

- [ ] Backend API to submit and fetch leaderboard entries.
- [ ] App can submit score (when online) and display a leaderboard list.
- [ ] Graceful degradation when offline (no crash; optional cached or “Try again later”).

### Duration (estimate)

**3–5 days** (depends on auth choice and hosting)

---

## Phase 8.3: Multiple Languages

**Goal:** Support more than one language: second (or Nth) dictionary and a language switcher. Same puzzle and validation logic; only the dictionary and UI language change.

### Tasks

1. **Dictionary format**
   - Ensure Phase 0 format is language-agnostic (already: `word`, `translation`, `example`).
   - Add one JSON (or SQLite) per language, e.g. `dictionary.en.json`, `dictionary.es.json`. Load only the active language to keep memory and startup time acceptable.

2. **Language state**
   - Persist “current language” in localStorage/AsyncStorage (e.g. `xenolexia-lang` = `"en"`).
   - At app init: read lang, load the corresponding dictionary, call `setDictionary(entries)`.

3. **Puzzle generator**
   - `generatePuzzle` already uses the in-memory dictionary; no change. Daily seed can stay global (one puzzle per day per app) or vary by language (one puzzle per day per language). Recommend: one puzzle per day per language so all English users share the same English puzzle.

4. **UI**
   - Language switcher (e.g. in header or settings): list of supported locales; on change, reload dictionary, optionally regenerate today’s puzzle for that language (or keep same seed and just swap dictionary so valid words change).
   - Optional: localize UI strings (e.g. “Score”, “Found”, “Submit”) via i18n (e.g. react-i18next, or a simple key→string map per lang).

### Deliverables

- [ ] At least two languages with separate dictionaries and a switcher.
- [ ] Daily puzzle (and progress) respects selected language; same seed per language per day.
- [ ] Optional: localized UI labels.

### Duration (estimate)

**2–3 days**

---

## Phase 8.4: Audio Pronunciation

**Goal:** After a correct word (or on demand), play audio for the word and optionally the example sentence. TTS (browser/device) or pre-recorded clips.

### Tasks

1. **TTS (text-to-speech)**
   - **Web/Electron:** Use Web Speech API `SpeechSynthesis` (or Electron’s equivalent) to speak `word` and optionally `example`. No extra assets; quality depends on device.
   - **React Native:** Use a TTS module (e.g. `react-native-tts` or expo-speech) to speak word/example.
   - Add a “Speak” or speaker icon on the meaning card (Phase 3); on press, call TTS with word, then example if present.

2. **Pre-recorded (optional)**
   - If you prefer human voice: record clips per word (or per common words), host as static files or in CDN, play via `<audio>` or RN sound API. Much more work; usually start with TTS.

3. **Settings**
   - Optional: “Pronunciation: on / off” or “Auto-play after correct word” so users can disable.

### Deliverables

- [ ] Play pronunciation (TTS or clip) for the word from the meaning card.
- [ ] Optional: play example sentence; optional setting to toggle audio.

### Duration (estimate)

**1–2 days**

---

## Phase 8.5: Hints / Power-ups

**Goal:** Help the user discover words: e.g. “Reveal one word” (show a random valid word they haven’t found) or “Shuffle tiles” (reorder letters). Can be limited per day or per puzzle to avoid trivializing the game.

### Tasks

1. **Reveal-one-word hint**
   - From Phase 1, puzzle has `validWords`; from Phase 5/state, you have `found`. Pick a random word in `validWords` that is not in `found`; show it (e.g. in a small toast or modal: “Try: **trace**”). If none left, show “No hints left.”
   - Optional: limit to 1–3 hints per puzzle (or per day); persist hint count in progress.

2. **Shuffle tiles**
   - Reorder `puzzle.letters` in state (random shuffle). Purely cosmetic; no change to valid words. Button “Shuffle” near the tiles.

3. **UI**
   - “Hint” and “Shuffle” buttons in the game area (Phase 6 UI). Ensure they don’t break layout on small screens.
   - Optional: cost or cooldown (e.g. “1 hint per puzzle”) and show remaining count.

### Deliverables

- [ ] “Reveal one word” hint: show an unfound valid word (with optional per-puzzle limit).
- [ ] “Shuffle” button to reorder letter tiles.
- [ ] Hints and shuffle integrated into Electron and React Native UIs.

### Duration (estimate)

**1–2 days**

---

## Phase 8: Dependency Summary

```
MVP (Phases 0–7)
    │
    ├── 8.1 Timed challenge  (Phase 2 scoring, Phase 5 storage)
    │
    ├── 8.2 Leaderboards     (new backend; 8.1 optional for timed leaderboard)
    │
    ├── 8.3 Multiple languages (Phase 0 dictionary format; one dict per lang)
    │
    ├── 8.4 Audio            (Phase 3 meaning card UI; TTS or clips)
    │
    └── 8.5 Hints            (Phase 1 validWords, Phase 6 UI)
```

---

## Phase 8+: Stretch Features (legacy summary)

After MVP, add in any order; see subphases 8.1–8.5 above for full breakdown.

| Feature | Description | Deps |
|--------|-------------|------|
| **Timed challenge** | e.g. 60s to find as many words as possible; separate mode from daily. | Phase 2 scoring, Phase 5 storage |
| **Leaderboards** | Daily or all-time; requires backend + auth or anonymous ID. | Backend (optional from MVP) |
| **Multiple languages** | Second dictionary + language switcher; same puzzle logic. | Phase 0 dictionary format |
| **Audio pronunciation** | TTS or pre-recorded clips for word/example. | Phase 3 meaning UI |
| **Hints / power-ups** | e.g. reveal one word, or shuffle tiles. | Phase 1 valid word set, Phase 6 UI |

---

## Dependency Graph (high level)

```
Phase 0 (Setup + Dictionary)
    ↓
Phase 1 (Puzzle Generator) ←── used by Phase 4 (Daily)
    ↓
Phase 2 (Validation + Scoring)
    ↓
Phase 3 (Meaning Lookup) ──→ Phase 6 (UI)
    ↓
Phase 4 (Daily Puzzle)
    ↓
Phase 5 (Progress) ──────────→ Phase 6 (UI)
    ↓
Phase 6 (Simple UI)
    ↓
Phase 7 (Polish & Ship)
```

---

## Suggested Timeline (single developer)

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 0. Setup & Dictionary | 1–2 days | ~2 days |
| 1. Puzzle Generator | 2–4 days | ~6 days |
| 2. Validation & Scoring | 1–2 days | ~8 days |
| 3. Meaning Lookup | 1 day | ~9 days |
| 4. Daily Puzzle | 1–2 days | ~11 days |
| 5. Progress Tracking | 1–2 days | ~13 days |
| 6. Simple UI | 2–3 days | ~16 days |
| 7. Polish & Ship | 2–3 days | ~19 days |

**Rough total: 3–4 weeks to MVP**, depending on dictionary size and UI polish.

---

## Tech Checklist (recap)

- **Frontend:** React + TypeScript (Vite); or React Native for mobile-first.
- **Storage:** localStorage for progress; dictionary as JSON or SQLite (sql.js).
- **Backend:** None for MVP (offline-first); add Node/Express later for leaderboards.
- **Dictionary:** One JSON/SQLite file per language with `word`, `translation`, optional `example`.

You can use this as a living document: check off deliverables as you go and adjust estimates based on your pace.
