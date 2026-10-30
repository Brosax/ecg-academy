/** Seeded PRNG (mulberry32) and a few distributions. No Math.random anywhere in this prototype. */

export type Rng = {
  next(): number; // uniform [0, 1)
  uniform(a: number, b: number): number;
  normal(): number; // standard normal (Box-Muller)
  pick<T>(xs: readonly T[]): T;
};

export function makeRng(seed: number): Rng {
  let s = (seed >>> 0) ^ 0x9e3779b9;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  return {
    next,
    uniform: (a, b) => a + (b - a) * next(),
    normal: () => {
      if (spare !== null) {
        const v = spare;
        spare = null;
        return v;
      }
      let u = 0;
      while (u <= 1e-12) u = next();
      const v = next();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    },
    pick: (xs) => xs[Math.floor(next() * xs.length)] as (typeof xs)[number],
  };
}

/** Derive an independent stream for a named sub-process so adding one random draw never shifts another stream. */
export function subRng(seed: number, label: string): Rng {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
  return makeRng(h >>> 0);
}
