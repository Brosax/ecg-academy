/**
 * Seeded randomness (no Math.random anywhere in the app logic): every exercise is reproducible from its seed.
 * mulberry32 core + small helpers.
 */
export interface Rng {
  /** uniform [0, 1) */
  next(): number;
  /** uniform [a, b) */
  range(a: number, b: number): number;
  /** integer in [a, b] inclusive */
  int(a: number, b: number): number;
  /** standard normal (Box–Muller) */
  normal(mean?: number, sd?: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** derive an independent stream (e.g. one per beat or per lead) */
  fork(salt: number | string): Rng;
  readonly seed: number;
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  const s0 = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 0x9e3779b9;
  let a = s0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const rng: Rng = {
    seed: s0,
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    normal(mean = 0, sd = 1) {
      if (spare !== null) {
        const v = spare;
        spare = null;
        return mean + sd * v;
      }
      let u = 0, v = 0;
      while (u <= Number.EPSILON) u = next();
      v = next();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return mean + sd * r * Math.cos(2 * Math.PI * v);
    },
    pick: (items) => items[Math.floor(next() * items.length)],
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    fork: (salt) => createRng((s0 ^ (typeof salt === 'string' ? hashString(salt) : Math.imul(salt + 1, 0x85ebca6b))) >>> 0),
  };
  return rng;
}
