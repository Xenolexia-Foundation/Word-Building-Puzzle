# Xenolexia Mobile (React Native)

Run from **repository root**:

```bash
npm install
npm run build:core
cd apps/mobile && npx react-native start
```

In another terminal (from repo root):

```bash
cd apps/mobile && npx react-native run-android
# or
cd apps/mobile && npx react-native run-ios
```

## First-time native setup

If `android/` or `ios/` folders are missing, generate them with the React Native CLI from the repo root:

```bash
npx @react-native-community/cli@latest init XenolexiaMobile --directory apps/mobile --skip-git --pm npm
```

Then replace `apps/mobile/package.json` with the one from this repo (so the `xenolexia-core` workspace dependency is kept), run `npm install` from the repo root again, and copy any desired config (e.g. `metro.config.js`, `App.tsx`) back into `apps/mobile` if the CLI overwrote them.

Alternatively, create a new React Native app in a temp directory, then copy the `android` and `ios` folders into `apps/mobile`.
