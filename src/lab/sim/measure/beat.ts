/**
 * Samples one beat from any SimEngine and measures it (measure.ts). Used by tests, the oracle harness and the
 * calibrator. The rhythm events only define the window; fiducials are detected blind from the signals.
 */
import type { BeatEvent, CycleTruth, SimEngine } from '../types';
import type { BeatMeasurementEx } from './measure';
import { measureBeat } from './measure';

type AEvent = Extract<BeatEvent, { kind: 'A' }>;
type VEvent = Extract<BeatEvent, { kind: 'V' }>;

export interface MeasuredBeat {
  readonly m: BeatMeasurementEx;
  readonly a: AEvent | null;
  readonly v: VEvent;
  readonly truth: CycleTruth | null;
  /** Sampled window (absolute start, n samples at engine.fsHz). */
  readonly t0Ms: number;
  readonly n: number;
  readonly leads: Float32Array;
}

export interface MeasureOptions {
  /**
   * Leads from H_V only (P still measured from H_A). Used at fast rates where the next P wave rides on the T wave and
   * would bias the tangent T end.
   */
  readonly ventricularOnlyLeads?: boolean;
}

/** Measures the first V event at or after `atMs` (generating events as needed). */
export function measureEngineBeat(engine: SimEngine, atMs: number, opt: MeasureOptions = {}): MeasuredBeat {
  let evs = engine.rhythm.eventsUntil(atMs + 4000);
  const vs = evs.filter((e): e is VEvent => e.kind === 'V');
  let k = vs.findIndex((e) => e.tMs >= atMs);
  if (k < 0) throw new Error('no V event');
  if (k === 0) k = 1 < vs.length ? 1 : 0;
  const v = vs[k];
  const prevV = k > 0 ? vs[k - 1] : null;
  const nextV = vs[k + 1] ?? null;
  evs = engine.rhythm.eventsUntil(atMs + 4000);
  const a = v.fromA !== null ? (evs.find((e): e is AEvent => e.kind === 'A' && e.id === v.fromA) ?? null) : null;
  const rr = prevV ? v.tMs - prevV.tMs : 60000 / engine.rhythm.heartRate;
  const t0 = Math.floor((a ? a.tMs : v.tMs - 200) - 60);
  // The next QRS starts ≥ HV (~35 ms) after the next V event, so the T search can run up to just past it.
  const endMs = nextV ? nextV.tMs + 15 : v.tMs + rr;
  const fs = engine.fsHz;
  const n = Math.ceil(((endMs + 20 - t0) * fs) / 1000);
  const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n);
  engine.sampleH(t0, n, hA, hV);
  const leads = new Float32Array(12 * n);
  if (opt.ventricularOnlyLeads) engine.projector.project(new Float32Array(3 * n), hV, n, leads);
  else engine.projector.project(hA, hV, n, leads);
  const m = measureBeat({ data: leads, n, fsHz: fs, t0Ms: t0 }, { hA, hV }, { aMs: a ? a.tMs : null, vMs: v.tMs, rrMs: rr, endMs });
  const truth = a ? engine.cycleAt(a.tMs + 30) : engine.cycleAt(v.tMs + 50);
  return { m, a, v, truth, t0Ms: t0, n, leads };
}
