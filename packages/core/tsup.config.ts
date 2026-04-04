/**
 * Bundle @xenolexia/dict + zod so CJS `dist/index.js` does not require() ESM-only packages.
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: ['@xenolexia/dict', 'zod'],
});
