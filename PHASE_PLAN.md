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
| **Phase 8+** | Stretch | Timed mode, leaderboards, i18n, audio, hints |

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

## Phase 8+: Stretch Features

After MVP, add in any order; below is a suggested order.

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
