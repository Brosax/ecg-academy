/**
 * The AV node under atrial bombardment (AF). Impulses arrive when the atrial tissue at the AV-node site fires (local
 * upstrokes of the AF phase field, so the ventricular response follows the same atrial activity that makes the
 * f-waves). An impulse within the node's effective refractory period (ERP) after the last conducted one is blocked;
 * later ones conduct with a probability that ramps from 0 to 1 over spreadFrac·ERP (stochastic recovery). A blocked
 * impulse arriving after the ERP penetrates partially (concealed conduction) and pushes the recovery origin forward,
 * which lengthens the next RR. Conducted impulses pay a decremental AH that grows the earlier they arrive.
 * The ERP is chosen by bisection so the mean ventricular rate matches the target (the heart-rate slider in AF).
 * Deterministic: a seeded generator, append-only use.
 */
import type { AvnSpec } from '../source/afField';

/** Small, fast, seeded PRNG (mulberry32) → uniform [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Atrial impulse times at the AV node within one loop [0, periodMs), ascending; they repeat every periodMs. */
export interface AvnImpulses {
  readonly periodMs: number;
  readonly times: readonly number[];
}

interface State {
  tc: number;
  lastV: number | null;
}

function stepImpulse(t: number, s: State, erp: number, sp: AvnSpec, ahMs: number, rng: () => number): number | null {
  const r = t - s.tc;
  if (r < erp) return null;
  const p = Math.min(1, (r - erp) / Math.max(1, sp.spreadFrac * erp));
  if (rng() < p) {
    const tV = t + ahMs + sp.decrementMs * Math.exp(-(r - erp) / sp.decayMs);
    if (s.lastV !== null && tV - s.lastV < sp.minRrMs) return null;
    s.tc = t;
    s.lastV = tV;
    return tV;
  }
  s.tc += sp.concealFrac * (t - s.tc);
  return null;
}

const impulseAt = (imp: AvnImpulses, k: number): number => {
  const m = imp.times.length;
  return imp.times[((k % m) + m) % m] + Math.floor(k / m) * imp.periodMs;
};

/** ERP (ms) giving the target mean RR over a long simulated run (bisection; mean RR grows with the ERP). */
export function calibrateErp(imp: AvnImpulses, sp: AvnSpec, ahMs: number, targetRrMs: number, seed: number): number {
  const meanRr = (erp: number): number => {
    const rng = mulberry32(seed ^ 0x5bd1e995);
    const s: State = { tc: -1e9, lastV: null };
    let first: number | null = null, last = 0, count = 0;
    const span = 300000;
    for (let k = 0; ; k++) {
      const t = impulseAt(imp, k);
      if (t > span) break;
      const tV = stepImpulse(t, s, erp, sp, ahMs, rng);
      if (tV === null) continue;
      if (first === null) first = tV;
      last = tV;
      count++;
    }
    return count > 1 && first !== null ? (last - first) / (count - 1) : Infinity;
  };
  let lo = 60, hi = 3 * targetRrMs;
  for (let it = 0; it < 30; it++) {
    const mid = 0.5 * (lo + hi);
    if (meanRr(mid) < targetRrMs) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

export class AvnFilter {
  private erp: number;
  private k: number;
  private readonly s: State;
  private readonly rng: () => number;

  constructor(
    private readonly imp: AvnImpulses,
    private readonly sp: AvnSpec,
    private readonly ahMs: number,
    targetRrMs: number,
    startMs: number,
    private readonly seed: number,
  ) {
    this.erp = calibrateErp(imp, sp, ahMs, targetRrMs, seed);
    this.rng = mulberry32(seed);
    // first impulse at or after startMs; the node starts recovered
    const m = imp.times.length;
    let k = Math.floor(startMs / imp.periodMs) * m;
    while (impulseAt(imp, k) < startMs) k++;
    this.k = k;
    this.s = { tc: startMs - 2 * this.erp, lastV: null };
  }

  get erpMs(): number {
    return this.erp;
  }

  get nextImpulseMs(): number {
    return this.imp.times.length ? impulseAt(this.imp, this.k) : Infinity;
  }

  /** New target mean ventricular cycle (heart-rate slider in AF); applies to the impulses not yet processed. */
  retarget(targetRrMs: number): void {
    this.erp = calibrateErp(this.imp, this.sp, this.ahMs, targetRrMs, this.seed);
  }

  /** Processes the next impulse; returns the His activation time if it conducts. */
  step(): number | null {
    const t = impulseAt(this.imp, this.k++);
    return stepImpulse(t, this.s, this.erp, this.sp, this.ahMs, this.rng);
  }
}
