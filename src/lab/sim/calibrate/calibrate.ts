/**
 * Headless calibration of the normal heart (plan "标定"): Nelder–Mead over ≈ 10 EngineParams knobs, ordered by
 * influence — pose roll / long-axis tilt, LV–RV septal offset, anterior–posterior fascicle offset, Purkinje mask
 * extent, transmural velocity, gain, APD_ref, G_ab, plateau slope (+ atrial gain for the P amplitude).
 * The loss is injected (oracle harness: hard violations × large weight + soft distances), keeping this module free
 * of test code. Deterministic: fixed start, fixed simplex, deterministic engine.
 */
import type { EngineParams } from '../conduction/params';
import { DEFAULT_ENGINE_PARAMS } from '../conduction/params';
import { nelderMead } from './nelderMead';

export interface Knob {
  readonly key: string;
  readonly lo: number;
  readonly hi: number;
  /** Initial simplex step. */
  readonly step: number;
  read(p: EngineParams): number;
  write(p: Partial<EngineParams>, v: number, base: EngineParams): Partial<EngineParams>;
}

const simple = (key: keyof EngineParams & string, lo: number, hi: number, step: number): Knob => ({
  key, lo, hi, step,
  read: (p) => p[key] as number,
  write: (p, v) => ({ ...p, [key]: v }),
});

export const CALIBRATION_KNOBS: readonly Knob[] = [
  simple('poseRollDeg', -45, 45, 12),
  simple('poseTiltDeg', -45, 45, 12),
  simple('rbbOffsetMs', -5, 20, 4),
  {
    key: 'antPostOffsetMs', lo: -20, hi: 20, step: 5,
    read: (p) => p.lafOffsetMs - p.lpfOffsetMs,
    write: (p, v, base) => {
      const mid = 0.5 * (base.lafOffsetMs + base.lpfOffsetMs);
      return { ...p, lafOffsetMs: mid + v / 2, lpfOffsetMs: mid - v / 2 };
    },
  },
  simple('purkinjeExtent', 0.4, 0.95, 0.1),
  simple('vMyoTransMps', 0.2, 0.5, 0.06),
  simple('gainMvPerMm2', 3e-4, 5e-3, 4e-4),
  simple('apdRefMs', 200, 285, 12),
  simple('gAbMs', 15, 80, 12),
  {
    key: 'plateauSlope', lo: 0, hi: 0.35, step: 0.06,
    read: (p) => p.apVentricular.plateauSlope,
    write: (p, v, base) => ({ ...p, apVentricular: { ...(p.apVentricular ?? base.apVentricular), plateauSlope: v } }),
  },
  simple('atrialGainFactor', 0.1, 1.5, 0.15),
];

export interface CalibrationEval {
  readonly loss: number;
  /** Anything worth keeping for the report (oracle summary…). */
  readonly info?: unknown;
}

export interface CalibrationOptions {
  readonly base?: Partial<EngineParams>;
  readonly knobs?: readonly Knob[];
  readonly maxEvals?: number;
  /** Synchronous (build with buildEngineSync). */
  readonly evaluate: (params: Partial<EngineParams>) => CalibrationEval;
  readonly log?: (msg: string) => void;
}

export interface CalibrationResult {
  readonly params: Partial<EngineParams>;
  readonly knobValues: Readonly<Record<string, number>>;
  readonly initialLoss: number;
  readonly finalLoss: number;
  readonly evals: number;
  readonly history: readonly number[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Maps a knob vector to an EngineParams patch (values clamped to the knob ranges). */
export function paramsFromKnobs(knobs: readonly Knob[], x: readonly number[], base: EngineParams, start: Partial<EngineParams> = {}): Partial<EngineParams> {
  let p: Partial<EngineParams> = { ...start };
  knobs.forEach((k, i) => (p = k.write(p, clamp(x[i], k.lo, k.hi), { ...base, ...p } as EngineParams)));
  return p;
}

export function calibrate(o: CalibrationOptions): CalibrationResult {
  const knobs = o.knobs ?? CALIBRATION_KNOBS;
  const base: EngineParams = { ...DEFAULT_ENGINE_PARAMS, ...(o.base ?? {}) };
  const x0 = knobs.map((k) => clamp(k.read(base), k.lo, k.hi));
  // Nelder–Mead in normalized units (each knob's step = 1) so one simplex scale suits all knobs.
  const toX = (u: readonly number[]) => u.map((v, i) => x0[i] + v * knobs[i].step);
  const cache = new Map<string, number>();
  const results: number[] = [];
  const evalSync = (u: readonly number[]): number => {
    const key = u.map((v) => v.toFixed(6)).join(',');
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const p = paramsFromKnobs(knobs, toX(u), base, o.base);
    const r = o.evaluate(p);
    cache.set(key, r.loss);
    results.push(r.loss);
    const xs = toX(u);
    o.log?.(`eval ${results.length}: loss ${r.loss.toFixed(3)}  ${knobs.map((k, i) => `${k.key}=${clamp(xs[i], k.lo, k.hi).toPrecision(4)}`).join(' ')}`);
    return r.loss;
  };
  const initialLoss = evalSync(knobs.map(() => 0));
  const nm = nelderMead(evalSync, knobs.map(() => 0), { steps: knobs.map(() => 1), maxEvals: o.maxEvals ?? 120, fTol: 1e-3 });
  const xBest = toX(nm.x).map((v, i) => clamp(v, knobs[i].lo, knobs[i].hi));
  return {
    params: paramsFromKnobs(knobs, xBest, base, o.base),
    knobValues: Object.fromEntries(knobs.map((k, i) => [k.key, xBest[i]])),
    initialLoss,
    finalLoss: nm.f,
    evals: results.length,
    history: results,
  };
}
