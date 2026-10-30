/**
 * Hypokalaemia on the realistic HRA heart against the test_oracle lines of docs/research/disease-spec.json.
 *
 * T and U are measured in model-truth windows of the two repolarizing populations, not in the template truth: the
 * template's repolarization end now includes the late population (that is the QU interval). For a beat,
 *   on-time population (T): repolarized fraction 2 % → 95 % of its kernel surface   [tOn, tEnd]
 *   late population (U):    repolarized fraction 2 % → 95 % of its kernel surface   [uOn, uEnd]
 * (the same |c|-weighted rule as templateTruth). T peak = largest deflection in [tOn, uOn] (before the late cells start
 * to repolarize); U peak = largest positive value in [tEnd, uEnd] (after the T end, before the next P); T–U junction =
 * the lowest point between the two peaks. Amplitudes are read against the TP level before the beat's P wave; ST(J)
 * against the PR level (QRS onset), as in the other batches.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { PLATEAU_REF_MS, sanitizeAp } from '../../../../src/lab/sim/conduction/ap';
import type { Engine } from '../../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import { HYPOKALEMIA, HYPOKALEMIA_LATE, HYPOKALEMIA_LATE_DELTA_MS } from '../../../../src/lab/sim/scenarios/batch3/hypokalemia';
import { NORMAL_SCENARIO } from '../../../../src/lab/sim/scenarios/normal';
import { selectVoxels } from '../../../../src/lab/sim/scenarios/tissue';
import type { RegionSelector, Scenario } from '../../../../src/lab/sim/scenarios/types';
import { templateTruth } from '../../../../src/lab/sim/source/voxelEdl';
import type { BeatEvent, GeometryBundle, LeadName } from '../../../../src/lab/sim/types';
import { COMP, LEADS, compOfTissue } from '../../../../src/lab/sim/types';
import { pearson } from '../linalg';
import type { Shape } from '../truthMeasure';
import { beatShape, qrsOf } from '../truthMeasure';

const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);
type VEv = Extract<BeatEvent, { kind: 'V' }>;
type AEv = Extract<BeatEvent, { kind: 'A' }>;

let geo: GeometryBundle;
let normal: Engine;
let N: Shape;
let NT: Waves;

const build = (sc: Scenario) => buildEngineSync(geo, undefined, { scenario: sc });

/** Repolarization truth (ms rel. to the V event) of a subset of the ventricular kernel voxels. */
function subsetTruth(e: Engine, v: VEv, inSet: (vox: number) => boolean) {
  const k = e.kernels.ventricular, tAct = e.ventricularActivation.field.tAct, apd = e.fields.apd.apdRefMs;
  const scale = e.templates.apdScale(v.rrPrevMs);
  const idx: number[] = [], d: number[] = [], r: number[] = [], A: number[] = [];
  for (let q = 0; q < k.voxels.length; q++) {
    const vox = k.voxels[q];
    if (!inSet(vox) || !Number.isFinite(tAct[vox])) continue;
    const a = apd[vox] * scale;
    idx.push(q);
    d.push(tAct[vox]);
    r.push(tAct[vox] + a);
    A.push(a);
  }
  return templateTruth(
    { idx: Uint32Array.from(idx), d: Float64Array.from(d), r: Float64Array.from(r), A: Float64Array.from(A) },
    k, sanitizeAp(e.params.apVentricular),
  );
}

interface LeadWaves {
  /** Signed T peak and its time (ms from QRS onset). */
  readonly T: number;
  readonly tT: number;
  /** U peak (largest positive value after the T end) and its time. */
  readonly U: number;
  readonly tU: number;
  /** Lowest value between the T and U peaks. */
  readonly junction: number;
}

interface Waves {
  readonly s: Shape;
  /** Population windows, ms from QRS onset. */
  readonly tOn: number;
  readonly tEnd: number;
  readonly uOn: number;
  readonly uEnd: number;
  /** Next P onset, ms from QRS onset. */
  readonly nextP: number;
  readonly leads: Readonly<Record<LeadName, LeadWaves>>;
}

/** T and U of one beat; `late` = the late population's selector (none: the whole surface is the T population). */
function waves(e: Engine, late: RegionSelector | null, atMs = 3000): Waves {
  const s = beatShape(e, atMs);
  const v = s.b.v;
  const inLate = new Uint8Array(e.geometry.grid.tissue.length);
  if (late) for (const x of selectVoxels(e.geometry.grid, late)) inLate[x] = 1;
  const tw = subsetTruth(e, v, (x) => inLate[x] === 0);
  const uw = late ? subsetTruth(e, v, (x) => inLate[x] === 1) : tw;
  const a = e.rhythm.eventsUntil(v.tMs + 4000).find((x): x is AEv => x.kind === 'A' && x.tMs > v.tMs)!;
  const nextP = a.tMs + e.templates.get(a.variant, a.rrPrevMs)!.truth.onMs;
  const base = (s.pOn ?? s.on - 200) - 15;
  const t0 = Math.floor(base - 5), n = Math.ceil(nextP + 20 - t0);
  const out = new Float32Array(12 * n);
  e.sampleLeads(t0, n, out);
  const tp = (l: LeadName, t: number) => {
    const li = LEADS.indexOf(l);
    return out[li * n + Math.round(t - t0)] - out[li * n + Math.round(base - t0)];
  };
  const W = { tOn: v.tMs + tw.repolOnMs, tEnd: v.tMs + tw.repolEndMs, uOn: v.tMs + uw.repolOnMs, uEnd: v.tMs + uw.repolEndMs };
  const leads = {} as Record<LeadName, LeadWaves>;
  for (const l of LEADS) {
    let T = 0, tT = W.tOn;
    for (let t = Math.ceil(W.tOn); t <= (late ? W.uOn : W.tEnd); t++) if (Math.abs(tp(l, t)) > Math.abs(T)) {
      T = tp(l, t);
      tT = t;
    }
    let U = -Infinity, tU = W.tEnd;
    for (let t = Math.ceil(W.tEnd); t <= Math.min(W.uEnd, nextP); t++) if (tp(l, t) > U) {
      U = tp(l, t);
      tU = t;
    }
    let junction = Infinity;
    for (let t = Math.round(tT); t <= tU; t++) junction = Math.min(junction, tp(l, t));
    leads[l] = { T, tT: tT - s.on, U, tU: tU - s.on, junction };
  }
  const rel = (t: number) => t - s.on;
  return { s, tOn: rel(W.tOn), tEnd: rel(W.tEnd), uOn: rel(W.uOn), uEnd: rel(W.uEnd), nextP: rel(nextP), leads };
}

/** Highest point of the P wave in II (atrial source only). */
function pPeakII(e: Engine): number {
  const a = e.rhythm.eventsUntil(4000).find((x): x is AEv => x.kind === 'A' && x.tMs > 2000)!;
  const tpl = e.templates.get(a.variant, a.rrPrevMs)!;
  const n = Math.round(tpl.truth.offMs - tpl.truth.onMs + 40);
  const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n), out = new Float32Array(12 * n);
  e.sampleH(a.tMs + tpl.truth.onMs, n, hA, hV);
  e.projector.project(hA, new Float32Array(3 * n), n, out);
  const li = LEADS.indexOf('II');
  return Math.max(...out.subarray(li * n, (li + 1) * n));
}

const fmt = (w: Waves, ls: readonly LeadName[]) =>
  ls.map((l) => `${l} T ${w.leads[l].T.toFixed(2)} | junction ${w.leads[l].junction.toFixed(2)} | U ${w.leads[l].U.toFixed(2)} (U/T ${(w.leads[l].U / w.leads[l].T).toFixed(2)})`).join('\n');

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  normal = build(NORMAL_SCENARIO);
  N = beatShape(normal);
  NT = waves(normal, null);
});

describe('hypokalaemia (severe: flat T, prominent U, ST depression, taller P, longer PR)', () => {
  let e: Engine, w: Waves;
  beforeAll(() => {
    e = build(HYPOKALEMIA);
    w = waves(e, HYPOKALEMIA_LATE);
    console.log(
      `hypokalaemia windows (ms from QRS onset): T ${w.tOn.toFixed(0)}–${w.tEnd.toFixed(0)}, U ${w.uOn.toFixed(0)}–${w.uEnd.toFixed(0)}, ` +
      `next P ${w.nextP.toFixed(0)}; QU (template truth) ${w.s.b.qtMs.toFixed(0)} vs NSR QT ${N.b.qtMs.toFixed(0)}\n` +
      fmt(w, ['II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']) + '\n' +
      'T / NSR T: ' + (['II', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).map((l) => `${l} ${(w.leads[l].T / NT.leads[l].T).toFixed(2)}`).join(' · ') + '\n' +
      'ST(J) vs PR (NSR): ' + LEADS.map((l) => `${l} ${w.s.at(l, w.s.off).toFixed(3)} (${N.at(l, N.off).toFixed(3)})`).join(' · '),
    );
  });

  it('U wave after the T end (95 % of the on-time source surface repolarized) and before the next P: ≥ 0.1 mV in V2 and V3', () => {
    for (const l of ['V2', 'V3'] as const) {
      expect(w.leads[l].U, l).toBeGreaterThanOrEqual(0.1);
      expect(w.leads[l].tU, l).toBeGreaterThan(w.tEnd);
    }
    // the late population has repolarized before the next P wave at 75 bpm
    expect(w.uEnd).toBeLessThan(w.nextP);
  });

  it('severe configuration: U amplitude > T amplitude in V2 or V3', () => {
    const ratio = (l: LeadName) => w.leads[l].U / w.leads[l].T;
    expect(Math.max(ratio('V2'), ratio('V3'))).toBeGreaterThan(1);
    expect(w.leads.V3.T).toBeGreaterThan(0);
  });

  it('separate deflections: two maxima with a T–U junction ≥ 0.05 mV below both in V2 and V3; U concordant with T', () => {
    for (const l of ['V2', 'V3'] as const) {
      const x = w.leads[l];
      expect(x.tU - x.tT, l).toBeGreaterThan(80);
      expect(Math.min(x.T, x.U) - x.junction, l).toBeGreaterThanOrEqual(0.05);
    }
    for (const l of ['II', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(Math.sign(w.leads[l].U), l).toBe(Math.sign(w.leads[l].T));
  });

  it('T amplitude in V4–V6 < 50 % of NSR (flattened T)', () => {
    for (const l of ['V4', 'V5', 'V6'] as const) {
      expect(w.leads[l].T / NT.leads[l].T, l).toBeLessThan(0.5);
      expect(w.leads[l].T, l).toBeGreaterThan(0);
    }
  });

  it('ST(J) ≤ −0.05 mV in ≥ 2 contiguous leads, each ≥ 0.015 mV below NSR (ST vector opposite the QRS)', () => {
    const dep = (l: LeadName) => w.s.at(l, w.s.off) <= -0.05 && w.s.at(l, w.s.off) <= N.at(l, N.off) - 0.015;
    const contiguous: readonly (readonly [LeadName, LeadName])[] = [
      ['aVL', 'I'], ['I', 'II'], ['II', 'aVF'], ['aVF', 'III'], ['V1', 'V2'], ['V2', 'V3'], ['V3', 'V4'], ['V4', 'V5'], ['V5', 'V6'],
    ];
    expect(contiguous.filter(([a, b]) => dep(a) && dep(b)).length).toBeGreaterThanOrEqual(1);
  });

  it('PR > NSR PR; P amplitude in II > NSR', () => {
    expect(w.s.b.prMs!).toBeGreaterThan(N.b.prMs!);
    expect(pPeakII(e)).toBeGreaterThan(pPeakII(normal));
  });

  it('apparent QT prolongation is really QU: the template repolarization end (QU) ≥ NSR QT + 120 ms, the T itself ends ≤ 40 ms later than NSR', () => {
    expect(w.s.b.qtMs).toBeGreaterThanOrEqual(N.b.qtMs + 120);
    expect(w.tEnd - NT.tEnd).toBeLessThanOrEqual(40);
    expect(w.tEnd - NT.tEnd).toBeGreaterThan(0);
  });

  it('depolarization unchanged: QRS within 2 ms of NSR, correlation ≥ 0.95 in V3', () => {
    expect(Math.abs(w.s.b.qrsMs - N.b.qrsMs)).toBeLessThanOrEqual(2);
    expect(pearson(qrsOf(e, w.s, 'V3'), qrsOf(normal, N, 'V3'))).toBeGreaterThan(0.95);
  });

  it('one source: the APD field the 3D view and the slice read holds the late population (≈ 70 % of the ventricular voxels, +160 ms)', () => {
    const g = e.geometry.grid, apd = e.fields.apd.apdRefMs, apdN = normal.fields.apd.apdRefMs;
    const late = new Uint8Array(g.tissue.length);
    for (const x of selectVoxels(g, HYPOKALEMIA_LATE)) late[x] = 1;
    let nV = 0, nLate = 0, bad = 0;
    const dRef = (HYPOKALEMIA.params.apdRefMs ?? 0) - (NORMAL_SCENARIO.params.apdRefMs ?? 0);
    for (let x = 0; x < g.tissue.length; x++) {
      if (compOfTissue(g.tissue[x]) !== COMP.Ventricular) continue;
      nV++;
      nLate += late[x];
      const expected = apdN[x] + dRef + (late[x] ? HYPOKALEMIA_LATE_DELTA_MS : 0);
      if (Math.abs(apd[x] - expected) > 0.01) bad++;
    }
    expect(bad).toBe(0);
    expect(Math.abs(nLate / nV - 0.7)).toBeLessThan(0.01);
  });

  it('the sagging plateau stays above rest until the last late cell repolarizes, even at 40 bpm', () => {
    const slope = HYPOKALEMIA.params.apVentricular!.plateauSlope;
    const scale = e.templates.apdScale(1500);
    let maxApd = 0;
    for (const x of selectVoxels(e.geometry.grid, HYPOKALEMIA_LATE)) maxApd = Math.max(maxApd, e.fields.apd.apdRefMs[x]);
    expect(1 - (slope * maxApd * scale) / PLATEAU_REF_MS).toBeGreaterThan(0);
  });
});

describe('hypokalaemia: rate and severity', () => {
  it('at 40 bpm the U is still a separate positive wave in V3 (≥ 0.1 mV); in this model it shrinks relative to T at slow rates (clinically it grows)', () => {
    const f = build(HYPOKALEMIA);
    f.setHeartRate(40);
    const w = waves(f, HYPOKALEMIA_LATE, 8000);
    console.log('hypokalaemia at 40 bpm:\n' + fmt(w, ['V2', 'V3']));
    const x = w.leads.V3;
    expect(x.U).toBeGreaterThanOrEqual(0.1);
    expect(Math.min(x.T, x.U) - x.junction).toBeGreaterThanOrEqual(0.03);
    expect(w.uEnd).toBeLessThan(w.nextP);
  });

  it('severity follows the size of the late population: 4/10 → smaller U/T and a taller T than 7/10', () => {
    const MODERATE: RegionSelector = { interleave: { keep: 4, of: 10 } };
    const sc: Scenario = { ...HYPOKALEMIA, tissue: { apd: [{ ...MODERATE, deltaMs: HYPOKALEMIA_LATE_DELTA_MS }] } };
    const m = waves(build(sc), MODERATE);
    const s = waves(build(HYPOKALEMIA), HYPOKALEMIA_LATE);
    console.log('hypokalaemia moderate (4/10):\n' + fmt(m, ['V2', 'V3']));
    for (const l of ['V2', 'V3'] as const) {
      expect(m.leads[l].U / m.leads[l].T, l).toBeLessThan(s.leads[l].U / s.leads[l].T);
      expect(m.leads[l].U / m.leads[l].T, l).toBeLessThan(1);
      expect(m.leads[l].T, l).toBeGreaterThan(s.leads[l].T);
      expect(m.leads[l].U, l).toBeGreaterThanOrEqual(0.1);
    }
  });
});
