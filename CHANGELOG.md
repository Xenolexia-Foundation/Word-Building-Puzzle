# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - MVP (2025-03-11)

### Added

- **Core (xenolexia-core)**
  - Dictionary loader: `setDictionary`, `getDictionary`, `hasWord`, `getEntry`
  - Puzzle generator: `generatePuzzle` with configurable seed (daily puzzle)
  - Daily seed helper: `getDailySeed(date?)` (YYYY-MM-DD UTC)
  - Word validation: `validateWord`, `scoreForWordLength` (tiered points)
  - Progress/streak: `updateStreakAfterPlay`, `getDisplayStreak`, `getYesterday`
  - Sample dictionary (English, development)
- **Electron app**
  - Daily puzzle with localStorage persistence
  - Progress (found words, score) and streak persistence
  - Letter tiles, input, submit, word list with points, scoreboard
  - Meaning card after each correct word (translation + optional example)
  - Accessible UI (ARIA, focus-visible), error recovery banner
- **React Native app**
  - Same features with AsyncStorage and Modal
  - ScrollView layout, accessibility labels
  - Error recovery banner on load failure
- **Testing**
  - Vitest unit tests for core: daily seed, streak, validation, scoring, puzzle determinism
- **Docs**
  - README with setup, run, and build instructions
  - PHASE_PLAN.md roadmap

### Notes

- Offline-first: no network required; dictionary and logic run locally.
- One puzzle per day (UTC); same seed for all users on the same day.

[0.1.0]: https://github.com/your-org/xenolexia/releases/tag/v0.1.0