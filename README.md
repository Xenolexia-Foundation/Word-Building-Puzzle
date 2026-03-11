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

## Phase plan

- **Phase 0–6** — Setup, dictionary, puzzle generator, validation, meaning lookup, daily puzzle, progress/streak, UI polish ✅  
- **Phase 7** — Polish & ship (tests, error handling, CHANGELOG, build) ✅  

See **`PHASE_PLAN.md`** for the full roadmap and **`CHANGELOG.md`** for v0.1.0.
# Word-Building-Puzzle
