# Xenolexia — Word-Building Puzzle

**v0.1.0** — A word-building puzzle game (Boggle/Wordscapes-style) with **Electron** (desktop) and **React Native** (mobile), sharing a TypeScript core. **Offline-first**: no network required; dictionary and logic run locally.

## Repo structure

- **`packages/core`** — Shared logic: dictionary, puzzle generator, validation, scoring, streak.
- **`apps/electron`** — Desktop app (Electron + React + Vite + TypeScript).
- **`apps/mobile`** — Mobile app (React Native + TypeScript).

## Prerequisites

- Node.js 18+
- npm

## Setup

From the **repository root**:

```bash
npm install
npm run build:core
```

## Run

### Desktop (Electron)

```bash
npm run dev:electron
```

Builds the Electron main process, starts Vite, then launches Electron. Or run the web UI only:

```bash
npm run dev -w apps/electron
```

Then open http://localhost:5173.

### Mobile (React Native)

See **`apps/mobile/README.md`** for first-time native setup (Android/iOS). Then from repo root:

```bash
npm run dev:mobile
```

In another terminal: `cd apps/mobile && npx react-native run-android` or `run-ios`.

## Build for production

- **Core:** `npm run build:core` (required before building apps).
- **Electron:** `npm run electron:build -w apps/electron` — produces installers in `apps/electron/release/` (NSIS on Windows, DMG on macOS, AppImage on Linux).
- **Mobile:** Standard React Native build (e.g. `cd apps/mobile && npx react-native run-android --mode=release`).

## Test

```bash
npm run test
```

Runs unit tests for `packages/core` (Vitest): daily seed, streak, validation, scoring, puzzle determinism.

## Offline & robustness

- **No network** — The app does not make any network requests. Dictionary and logic run locally; progress is stored in localStorage (Electron) or AsyncStorage (mobile).
- **Error handling** — Dictionary load failure, corrupt or full storage, and invalid data show clear messages and do not crash. Save failures show a dismissible banner; load failures show a message and (when possible) today’s puzzle anyway.
- **Performance** — If the dictionary grows large, consider lazy-loading or splitting dictionaries; the core supports `setDictionary` at any time. First paint remains fast with the bundled JSON dictionaries.
- **Accessibility** — Electron: ARIA labels, `role`, focus-visible outlines, and keyboard-friendly controls. Mobile: `accessibilityLabel` and `accessibilityRole` on interactive elements and alerts.

## Data model (outline alignment)

For alignment with the product outline:

- **Date seed** — The daily puzzle seed is `Puzzle.seed`, a string in `YYYY-MM-DD` (UTC). Same value for everyone on that calendar day; no server. Outline name: *dateSeed*.
- **Definition** — Each word’s definition is `DictionaryEntry.translation`; optional context is `DictionaryEntry.example`. Outline name: *definition*.

So: `Puzzle { letters, validWords, seed }` and `DictionaryEntry { word, translation, example? }` match the outline’s *Puzzle* and *WordEntry*.

## Outline MVP checklist

| Outline item | Status |
|--------------|--------|
| 6–8 letters shown | ✅ |
| Form words by tap/type | ✅ |
| Validate against local dictionary | ✅ |
| Points by length | ✅ |
| Local dictionary (e.g. words.json) | ✅ |
| Optional definitions (local) | ✅ |
| Daily puzzle, date-seeded, deterministic, no server | ✅ |
| Store streaks, scores, found words locally | ✅ |
| Points by rarity | ✅ |
| TTS pronunciation | ✅ |

## Phase plan

- **Phase 0–6** — Setup, dictionary, puzzle generator, validation, meaning lookup, daily puzzle, progress/streak, UI polish ✅  
- **Phase 7** — Polish & ship (tests, error handling, CHANGELOG, build) ✅  
- **Phase A** — Outline alignment & MVP sign-off ✅  
- **Phase B** — Rarity-based scoring ✅  
- **Phase C** — TTS pronunciation (Speak on meaning card) ✅  
- **Phase D** — Polish & robustness (error handling, offline, a11y) ✅  
- **Phase E** — Optional: async dictionary (SQLite-ready), expand-dictionary script, leaderboards docs ✅  

## Extending the app (Phase E)

- **Dictionary from SQLite** — Use `loadDictionary(async () => yourRows)` so the core stays agnostic; see **`docs/EXTENDING.md`**.
- **Larger dictionaries** — Extend `packages/core/src/data/dictionary.*.json` or run `npm run expand-dictionary -w xenolexia-core -- <dict.json> <words.txt> [out.json]` to merge a word list (new words get a placeholder definition).
- **Leaderboards** — Require a backend; suggested API and app integration are in **`docs/EXTENDING.md`** and **`PHASE_PLAN.md`** Phase 8.2.

See **`PHASE_PLAN.md`** for the full roadmap, **`OUTLINE_VS_IMPLEMENTATION.md`** for outline vs implementation and Phases A–E, **`docs/EXTENDING.md`** for Phase E details, and **`CHANGELOG.md`** for v0.1.0.
