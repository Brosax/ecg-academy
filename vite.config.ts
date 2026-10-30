/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Single-file build: no code splitting; scripts/inline-single-file.mjs inlines JS/CSS afterwards.
export default defineConfig({
  base: './',
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: {
      output: { codeSplitting: false },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/out/**', 'node_modules/**'],
    environment: 'node',
    testTimeout: 120_000,
    // engine builds on the realistic heart run in beforeAll hooks; parallel load can exceed the 10 s default
    hookTimeout: 120_000,
  },
});
