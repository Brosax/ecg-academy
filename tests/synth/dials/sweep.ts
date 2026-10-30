/**
 * T5 dial sweeps (DECISION §8.2): for one scenario, one dial value (or one drawn dial set) and one seed —
 *  1. T1–T3 still pass on the dialled ECG (T2 on its noise-free twin, as in tests/synth/truth);
 *  2. the dial is realised: forward / analytic dials within their exactness (natural jitter on: lobe edges ≤ 3 ms),
 *     solves within their residual, statistics reported as realised;
 *  3. other truths move only by the declared couplings (src/synth/dials/dials.ts), compared with the undialled
 *     ECG of the same seed.
 * Shared by tests/synth/dials/sweep-*.test.ts (a fixed subset) and scripts/synth/sweep.ts (the whole matrix).
 */
import type { DialId, ScenarioDef, SynthRequest, SynthResult } from '../../../src/synth';
import { generate } from '../../../src/synth';
import { SILENT_NOISE } from '../../../src/synth/chain/chain';
import { DIALS } from '../../../src/synth/dials/dials';
import { drillRanges } from '../../../src/synth/dials/ranges';
import { t1Max, t2Violations, t3Failures } from '../oracle/tiers';

const angle = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);

/** Tolerances of the realised value (truth vs requested / applied), natural jitter on. */
export const REALISED = {
  /** bpm; sinus HRV (respiratory modulation) moves the mean of a 10 s strip */
  rate: 2.5,
  /** ms; HRV changes the AV-node recovery beat to beat (decremental conduction) */
  pr: 4,
  /** ms; jitter widens the first lobe and shifts the later ones by ≤ 3 ms */
  qrs: 4,
  /** ms (QTc Fridericia); the JT law is anchored at the base QRS and the strip's RR */
  qtc: 12,
  /** ° between the truth axis and the solve's reported axis; and between the request and the solve */
  axis: 2,
  axisSolve: 1,
  pAxis: 3,
  pAxisSolve: 2,
  /** mV in the injury's reference lead */
  st: 0.03,
} as const;

export interface SweepResult {
  readonly fails: readonly string[];
}

const reqOf = (def: ScenarioDef, seed: number, dials?: SynthRequest['dials']): SynthRequest => ({ scenario: def.id, seed, ...(dials ? { dials } : {}) });

/** The value of a rate dial as the truth reports it: the atrial (sinus / ectopic) rate, else the ventricular rate. */
function realisedRate(def: ScenarioDef, r: SynthResult): number | null {
  const k = def.source.rhythm.kind;
  const t = r.ecg.truth!;
  if (k === 'sinus' || k === 'atrial-ectopic' || k === 'atrial-tachycardia') return t.atrialRateBpm;
  return t.hrBpm;
}

/** Couplings (DECISION §7): what a dial may change besides its own truth. Each entry: truth field, tolerance. */
type Field = 'hr' | 'pr' | 'qrs' | 'qt' | 'axis';
const UNCHANGED: Readonly<Partial<Record<DialId, readonly (readonly [Field, number])[]>>> = {
  // rate: the JT follows the rate law (QT changes), the AV node may lengthen the PR at faster rates
  rate: [['qrs', 1], ['axis', 2]],
  pr: [['hr', 1], ['qrs', 1], ['qt', 1], ['axis', 1]],
  // qrs: the QT grows by the same ms (checked separately), the axis stays
  qrs: [['hr', 1], ['pr', 1], ['axis', 3]],
  qtc: [['hr', 1], ['pr', 1], ['qrs', 1], ['axis', 1]],
  axis: [['hr', 1], ['pr', 1], ['qrs', 1], ['qt', 1]],
  pAxis: [['hr', 1], ['pr', 1], ['qrs', 1], ['qt', 1], ['axis', 1]],
  st: [['hr', 1], ['pr', 1], ['qrs', 1]],
  tAmp: [['hr', 1], ['pr', 1], ['qrs', 1], ['axis', 1]],
  voltage: [['hr', 0.01], ['pr', 0.01], ['qrs', 0.01], ['qt', 0.01], ['axis', 0.5]],
  hrv: [['qrs', 1], ['axis', 2]],
  fCoarseness: [['hr', 0.5], ['qrs', 1], ['axis', 2]],
  conductionRatio: [['qrs', 1], ['axis', 2]],
  ventricularResponse: [['qrs', 1], ['axis', 3]],
  noise: [['hr', 0], ['pr', 0], ['qrs', 0], ['qt', 0], ['axis', 0]],
};

function field(r: SynthResult, f: Field): number | null {
  const t = r.ecg.truth!;
  switch (f) {
    case 'hr': return t.hrBpm;
    case 'pr': return t.prMs;
    case 'qrs': return t.qrsMs;
    case 'qt': return t.qtMs;
    default: return t.axisDeg.qrs;
  }
}

/** T1–T3 of one dialled request (T2 on the noise-free twin). */
export function tierFails(def: ScenarioDef, req: SynthRequest, r: SynthResult = generate(req)): string[] {
  const out: string[] = [];
  const t1 = t1Max(r);
  if (t1 > 1e-6) out.push(`T1 identity residual ${t1.toExponential(1)}`);
  const twin = generate({ ...req, recording: { noise: SILENT_NOISE } });
  for (const v of t2Violations(twin, def.findings, def.intervals !== 'not-applicable')) out.push(`T2 ${v}`);
  for (const v of t3Failures(r, def, undefined)) out.push(`T3 ${v}`);
  return out;
}

/** One dial at one value: tiers, realisation, couplings. */
export function sweepDial(def: ScenarioDef, id: DialId, value: number, seed: number): string[] {
  const req = reqOf(def, seed, { [id]: value });
  const tag = `${def.id} ${id}=${value} seed ${seed}`;
  const r = generate(req);
  const out = tierFails(def, req, r).map((f) => `${tag}: ${f}`);
  const base = generate(reqOf(def, seed));
  const t = r.ecg.truth!;
  const a = r.applied;
  const bad = (msg: string): void => void out.push(`${tag}: ${msg}`);
  if (!DIALS[id].implemented) return out;
  if (a[id] === undefined) {
    bad(`dial not applied (applied: ${JSON.stringify(a)})`);
    return out;
  }
  // realisation
  switch (id) {
    case 'rate': {
      const v = realisedRate(def, r);
      if (v === null || Math.abs(v - value) > REALISED.rate) bad(`rate realised ${v?.toFixed(1)}`);
      break;
    }
    case 'pr':
      if (t.prMs === null || Math.abs(t.prMs - value) > REALISED.pr) bad(`PR realised ${t.prMs?.toFixed(1)}`);
      break;
    case 'qrs':
      if (Math.abs(t.qrsMs - value) > REALISED.qrs) bad(`QRS realised ${t.qrsMs.toFixed(1)}`);
      // the JT is anchored: the QT grows with the QRS
      if (Math.abs(t.qtMs - t.qrsMs - (base.ecg.truth!.qtMs - base.ecg.truth!.qrsMs)) > 3) bad(`JT moved by the qrs dial (${(t.qtMs - t.qrsMs).toFixed(1)} vs ${(base.ecg.truth!.qtMs - base.ecg.truth!.qrsMs).toFixed(1)})`);
      break;
    case 'qtc':
      if (Math.abs(t.qtcFridericiaMs - value) > REALISED.qtc) bad(`QTc realised ${t.qtcFridericiaMs.toFixed(1)}`);
      break;
    case 'axis':
      if (angle(t.axisDeg.qrs, a.axis!) > REALISED.axis) bad(`axis truth ${t.axisDeg.qrs.toFixed(1)} vs solved ${a.axis}`);
      if (angle(a.axis!, value) > REALISED.axisSolve) bad(`axis solve residual: solved ${a.axis}`);
      break;
    case 'pAxis':
      if (t.axisDeg.p === null || angle(t.axisDeg.p, a.pAxis!) > REALISED.pAxis) bad(`P axis truth ${t.axisDeg.p?.toFixed(1)} vs solved ${a.pAxis}`);
      if (angle(a.pAxis!, value) > REALISED.pAxisSolve) bad(`P-axis solve residual: solved ${a.pAxis}`);
      break;
    case 'st': {
      const ref = def.source.injury?.[0]?.ref ?? 'II';
      const v = t.stMv[ref];
      if (v === undefined || Math.abs(v - value) > REALISED.st) bad(`ST ${ref} realised ${v?.toFixed(3)}`);
      break;
    }
    case 'conductionRatio': {
      const ar = t.atrialRateBpm;
      if (ar === null || Math.abs(t.hrBpm - ar / value) > 2) bad(`conduction ${value}:1 realised HR ${t.hrBpm.toFixed(1)} atrial ${ar?.toFixed(1)}`);
      break;
    }
    case 'ventricularResponse':
      if (Math.abs(a.ventricularResponse! - Math.round(t.hrBpm * 10) / 10) > 1e-9) bad(`ventricularResponse reported ${a.ventricularResponse} vs HR ${t.hrBpm.toFixed(1)}`);
      break;
    default:
      if (a[id] !== value) bad(`applied ${a[id]} ≠ requested ${value}`);
  }
  // couplings
  for (const [f, tol] of UNCHANGED[id] ?? []) {
    const x = field(r, f), y = field(base, f);
    if (x === null || y === null) {
      if (x !== y) bad(`${f} became ${x === null ? 'unmeasured' : 'measured'}`);
      continue;
    }
    const d = f === 'axis' ? angle(x, y) : Math.abs(x - y);
    if (d > tol) bad(`coupling: ${f} moved by ${d.toFixed(2)} (${y.toFixed(1)} → ${x.toFixed(1)})`);
  }
  return out;
}

/** The min / mid / max values of a scenario's drill ranges (implemented dials; src/synth/dials/ranges.ts). */
export function dialGrid(def: ScenarioDef): { id: DialId; value: number }[] {
  const out: { id: DialId; value: number }[] = [];
  const ranges = drillRanges(def);
  for (const id of Object.keys(ranges).sort() as DialId[]) {
    const r = ranges[id];
    if (!r || !DIALS[id].implemented) continue;
    const step = DIALS[id].step;
    const q = (v: number): number => Number((Math.round(v / step) * step).toFixed(6));
    for (const v of [r.min, (r.min + r.max) / 2, r.max]) out.push({ id, value: id === 'conductionRatio' ? Math.round(v) : q(v) });
  }
  return out;
}

/** One drawn dial set (drawDials at a difficulty): tiers on the clean chain, truth unchanged by the noisy chain. */
export function sweepDraw(def: ScenarioDef, dials: SynthRequest['dials'], seed: number, difficulty: SynthRequest['difficulty']): string[] {
  const req: SynthRequest = { scenario: def.id, seed, dials };
  const tag = `${def.id} ${difficulty} ${JSON.stringify(dials)} seed ${seed}`;
  const out = tierFails(def, req).map((f) => `${tag}: ${f}`);
  if (difficulty === 'noisy') {
    const clean = generate(req), noisy = generate({ ...req, difficulty: 'noisy' });
    const strip = (x: SynthResult): string => JSON.stringify({ ...x.ecg.truth!, findings: x.ecg.truth!.findings.filter((f) => f !== 'baseline-wander' && f !== 'muscle-tremor' && f !== 'ac-interference') });
    if (strip(clean) !== strip(noisy)) out.push(`${tag}: the noisy chain changed the truth`);
  }
  return out;
}
