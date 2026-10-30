/**
 * T9 bench (DECISION §8.2, §10), shared by scripts/synth/bench.ts (the report) and tests/synth/bench.test.ts (a ×5
 * margin gate: machines vary ×2, Node is a proxy for the browser main thread).
 */
import { performance } from 'node:perf_hooks';
import { createRng } from '../../src/core/rng';
import { drawDials, generate, scenarios, type SynthRequest } from '../../src/synth';

/** §10 budgets (ms; memory KB). */
export const BUDGET = {
  sinus: { median: 6, p95: 15 },
  worst: { median: 15, p95: 25 },
  monitor60s: 60,
  init: 30,
  solves: 2,
  stateAt: 0.05,
  exam50: 1000,
  memoryKb: 400,
} as const;

/** The worst configurations of §10: fibrillation, flutter, polymorphic rhythms, pre-excited AF — with 5 extra leads and
 *  the 'noisy' chain. */
export const WORST: readonly string[] = ['atrial-fibrillation', 'ventricular-fibrillation', 'atrial-flutter', 'torsades', 'preexcited-af'];

export interface Stat {
  readonly median: number;
  readonly p95: number;
}
export interface BenchResult {
  readonly scenarios: readonly (Stat & { readonly name: string })[];
  readonly sinus: Stat;
  readonly worst: Stat;
  readonly monitor60s: number;
  readonly init: number;
  readonly solves: number;
  readonly stateAt: number;
  readonly exam50: number;
  readonly memoryKb: number;
}

const quantile = (xs: readonly number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))];
};
const stat = (xs: readonly number[]): Stat => ({ median: quantile(xs, 0.5), p95: quantile(xs, 0.95) });

function times(req: SynthRequest, reps: number): number[] {
  generate(req);
  generate(req);
  const out: number[] = [];
  for (let k = 0; k < reps; k++) {
    const t0 = performance.now();
    generate({ ...req, seed: req.seed + k });
    out.push(performance.now() - t0);
  }
  return out;
}

/** cold cost of the first generate() in this process (registry, lead table, region graph, first pattern) */
let initMs: number | null = null;
export function measureInit(): number {
  if (initMs === null) {
    const t0 = performance.now();
    generate({ scenario: 'normal', seed: 1 });
    initMs = performance.now() - t0;
  }
  return initMs;
}

export function benchAll(opt: { reps?: number; ids?: readonly string[] } = {}): BenchResult {
  const init = measureInit();
  const reps = opt.reps ?? 20;
  const defs = scenarios().filter((d) => !opt.ids || opt.ids.includes(d.id));
  const per: (Stat & { name: string })[] = [];
  const sinusPool: number[] = [];
  for (const d of defs) {
    const ts = times({ scenario: d.id, seed: 1 }, reps);
    per.push({ name: d.id, ...stat(ts) });
    if (d.source.rhythm.kind === 'sinus' && !d.recording) sinusPool.push(...ts);
  }
  const worstPool: number[] = [];
  for (const id of WORST) worstPool.push(...times({ scenario: id, seed: 1, extraLeads: ['V3R', 'V4R', 'V7', 'V8', 'V9'], difficulty: 'noisy' }, Math.max(5, reps >> 1)));
  // 60 s monitor strip on the monitor filter
  generate({ scenario: 'normal', seed: 1, durationS: 60 });
  const t60 = performance.now();
  generate({ scenario: 'normal', seed: 2, durationS: 60, recording: { filter: { highpassHz: 0.5, lowpassHz: 40, notchHz: 50, phase: 'causal' } } });
  const monitor60s = performance.now() - t60;
  // dial solves of one drill item: the axis and P-axis solves are the only searches (the rest are closed forms)
  // (interleaved pairs, the median of the paired differences: robust to background load)
  const diffs: number[] = [];
  for (let k = 0; k < 15; k++) {
    const a0 = performance.now();
    generate({ scenario: 'normal', seed: 3 + k, dials: { rate: 70 } });
    const a1 = performance.now();
    generate({ scenario: 'normal', seed: 3 + k, dials: { rate: 70, axis: 60, pAxis: 40 } });
    diffs.push(performance.now() - a1 - (a1 - a0));
  }
  const solves = Math.max(0, quantile(diffs, 0.5));
  // stateAt: one frame of the 3D heart
  const ecg = generate({ scenario: 'stemi-anterior', seed: 1 }).ecg;
  const buf = new Float32Array(ecg.regions!.ids.length);
  const n = 20000;
  const ts0 = performance.now();
  for (let k = 0; k < n; k++) ecg.regions!.stateAt((k * 7919) % 10000, buf);
  const stateAt = (performance.now() - ts0) / n;
  // a 50-item exam set: 50 drawn items across the catalogue
  const all = scenarios();
  const rng = createRng('exam');
  const te = performance.now();
  for (let k = 0; k < 50; k++) {
    const d = all[(k * 37) % all.length];
    generate({ scenario: d.id, seed: 100 + k, dials: drawDials(d.id, rng.fork(k), 'classic') });
  }
  const exam50 = performance.now() - te;
  // memory: the delivered Float32 leads + the serialised truth
  const leads = Object.values(ecg.signal.leads) as Float32Array[];
  const memoryKb = (leads.reduce((s, x) => s + x.byteLength, 0) + JSON.stringify(ecg.truth).length) / 1024;
  return { scenarios: per, sinus: stat(sinusPool), worst: stat(worstPool), monitor60s, init, solves, stateAt, exam50, memoryKb };
}
