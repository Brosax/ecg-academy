/**
 * Shared helpers of the synth tests: the scenario × variant matrix and a per-file generation cache (each Vitest file
 * runs in its own worker, so the cache never leaks across files).
 */
import type { SynthRequest, SynthResult } from '../../src/synth';
import { generate, scenarios } from '../../src/synth';

export interface Case {
  readonly id: string;
  readonly variant: string | undefined;
  /** display name: id or id--variant */
  readonly name: string;
}

/** Every catalogue scenario and every variant of it. */
export function allCases(): Case[] {
  return scenarios().flatMap((d) => [undefined, ...Object.keys(d.variants ?? {})].map((v) => ({ id: d.id, variant: v, name: v ? `${d.id}--${v}` : d.id })));
}

const CACHE = new Map<string, SynthResult>();

/** generate() with a cache keyed by the request (requests in tests are plain JSON). */
export function gen(req: SynthRequest): SynthResult {
  const key = JSON.stringify(req);
  let r = CACHE.get(key);
  if (!r) {
    r = generate(req);
    CACHE.set(key, r);
  }
  return r;
}

export function maxAbsDiff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

export function p2p(a: ArrayLike<number>): number {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < a.length; i++) {
    lo = Math.min(lo, a[i]);
    hi = Math.max(hi, a[i]);
  }
  return hi - lo;
}

/** FNV-1a over 32-bit integers. */
export function fnv(ints: Iterable<number>, h = 2166136261): number {
  for (const v of ints) {
    let x = v | 0;
    for (let k = 0; k < 4; k++) {
      h ^= x & 0xff;
      h = Math.imul(h, 16777619) >>> 0;
      x >>>= 8;
    }
  }
  return h >>> 0;
}
