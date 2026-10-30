/** Shared test helper: the shipped heart asset, decoded once per test file. */
import { readFileSync } from 'node:fs';
import { decodeHeart, type HeartAsset } from '../../src/heart3d/format';

export const HEART_BIN_URL = new URL('../../src/assets/heart.bin', import.meta.url);

let cached: HeartAsset | null = null;

export function heartBytes(): Uint8Array {
  return new Uint8Array(readFileSync(HEART_BIN_URL));
}

export function heart(): HeartAsset {
  cached ??= decodeHeart(heartBytes());
  return cached;
}
