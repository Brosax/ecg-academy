/**
 * Batch 3 — supraventricular re-entry on the realistic HRA heart, against the test_oracle lines of
 * docs/research/disease-spec.json (`atrial-flutter-typical`, `avnrt`), measured in model-truth windows (truthMeasure.ts).
 * Criteria the model can only meet in an equivalent form say so in the test name:
 *  - flutter "net negative / net positive" F waves: a circulating source has a cycle-mean of exactly 0 in every lead (each
 *    voxel fires once per cycle with the same action potential and Σc ≡ 0), so the polarity is read clinically — the
 *    dominant (deepest vs tallest) deflection about the cycle mean, on the atrial component (H_A) alone;
 *  - AVNRT "no atrial deflection 80–300 ms before the QRS": at 180/min the previous beat's P′ lies inside that window by
 *    construction, so it is tested as "no atrial activation starts there and no P precedes the QRS".
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { annulusAngle, isCircuitActivation } from '../../../../src/lab/sim/conduction/atrialCircuit';
import type { Engine } from '../../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import { ATRIAL_FLUTTER_TYPICAL, AVNRT } from '../../../../src/lab/sim/scenarios/batch3/supraventricularReentry';
import { NORMAL_SCENARIO } from '../../../../src/lab/sim/scenarios/normal';
import { ownsRate, rateKind } from '../../../../src/lab/sim/scenarios/rate';
import type { Scenario } from '../../../../src/lab/sim/scenarios/types';
import type { GeometryBundle, LeadName } from '../../../../src/lab/sim/types';
import { LEADS, TISSUE } from '../../../../src/lab/sim/types';
import { voxelCenter } from '../../../../src/lab/sim/conduction/gridUtil';
import { pearson } from '../linalg';
import type { Shape } from '../truthMeasure';
import { beatShape as shape, pWave, qrsOf, rhythmTruth } from '../truthMeasure';

const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);
let geo: GeometryBundle;
let normal: Engine;
let N: Shape;

const build = (sc: Scenario) => buildEngineSync(geo, undefined, { scenario: sc });
const mean = (x: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i];
  return s / x.length;
};
const sd = (x: readonly number[]) => Math.sqrt(mean(x.map((v) => (v - mean(x)) ** 2)));

/** The 12 leads of the atrial component alone (H_A projected, H_V = 0), n ms from t0. */
function atrialLeads(e: Engine, t0: number, n: number): (l: LeadName) => Float32Array {
  const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n), out = new Float32Array(12 * n);
  e.sampleH(t0, n, hA, hV);
  e.projector.project(hA, new Float32Array(3 * n), n, out);
  return (l) => out.subarray(LEADS.indexOf(l) * n, (LEADS.indexOf(l) + 1) * n);
}

/** All 12 leads (H_A + H_V), n ms from t0. */
function fullLeads(e: Engine, t0: number, n: number): (l: LeadName) => Float32Array {
  const out = new Float32Array(12 * n);
  e.sampleLeads(t0, n, out);
  return (l) => out.subarray(LEADS.indexOf(l) * n, (LEADS.indexOf(l) + 1) * n);
}

/** Fundamental period (ms): the first local maximum of the normalized autocorrelation (lags 100–400) within 5 % of the highest. */
function period(x: Float32Array): number {
  const m = mean(x);
  const rs: number[] = [];
  for (let lag = 100; lag <= 400; lag++) {
    let num = 0, d0 = 0, d1 = 0;
    for (let i = 0; i + lag < x.length; i++) {
      const a = x[i] - m, b = x[i + lag] - m;
      num += a * b;
      d0 += a * a;
      d1 += b * b;
    }
    rs.push(num / Math.sqrt(d0 * d1));
  }
  const top = Math.max(...rs);
  for (let i = 1; i < rs.length - 1; i++) if (rs[i] >= rs[i - 1] && rs[i] >= rs[i + 1] && rs[i] >= 0.95 * top) return 100 + i;
  return 100 + rs.indexOf(top);
}

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  normal = build(NORMAL_SCENARIO);
  N = shape(normal);
});

describe('typical atrial flutter (counterclockwise, CTI-dependent), 2:1', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>, cl: number;
  beforeAll(() => {
    e = build(ATRIAL_FLUTTER_TYPICAL);
    r = rhythmTruth(e, 2000, 12000);
    cl = mean(r.pp);
    console.log(`flutter: CL ${cl.toFixed(1)} ms (${(60000 / cl).toFixed(0)}/min), RR ${mean(r.rr).toFixed(1)} ms, HR ${e.rhythm.heartRate.toFixed(1)}`);
  });

  it('one circuit revolution per flutter wave: cycle 200 ± 20 ms (≈ 300/min), and the atrial deflections in II and V1 repeat with that period', () => {
    expect(sd(r.pp)).toBeLessThan(0.5);
    expect(Math.abs(cl - 200)).toBeLessThanOrEqual(20);
    const A = atrialLeads(e, 3000, 2000);
    for (const l of ['II', 'V1'] as const) {
      const T = period(A(l));
      expect(Math.abs(T - 200), l).toBeLessThanOrEqual(20);
      expect(Math.abs(T - cl), l).toBeLessThanOrEqual(2);
    }
    expect(r.as.every((a) => a.variant === 'flutter')).toBe(true);
  });

  it('F waves: dominant deflection negative in II, III, aVF and positive in V1 (equivalent form of net polarity; cycle mean ≡ 0)', () => {
    const n = Math.round(4 * cl);
    const A = atrialLeads(e, 3000, n);
    const ex = (l: LeadName) => {
      const x = A(l), m = mean(x);
      let hi = -Infinity, lo = Infinity;
      for (const v of x) {
        hi = Math.max(hi, v);
        lo = Math.min(lo, v);
      }
      return { up: hi - m, dn: m - lo, mean: m, p2p: hi - lo };
    };
    const msg: string[] = [];
    for (const l of ['II', 'III', 'aVF'] as const) {
      const f = ex(l);
      msg.push(`${l} −${f.dn.toFixed(3)}/+${f.up.toFixed(3)}`);
      expect(f.dn / f.up, l).toBeGreaterThanOrEqual(1.3);
      expect(f.p2p, l).toBeGreaterThanOrEqual(0.1);
    }
    const v1 = ex('V1');
    msg.push(`V1 +${v1.up.toFixed(3)}/−${v1.dn.toFixed(3)}`);
    console.log('F-wave excursions about the cycle mean: ' + msg.join(' · '));
    expect(v1.up / v1.dn).toBeGreaterThanOrEqual(1.5);
    // the cycle mean of the atrial signal vanishes (no "net area" to read)
    for (const l of ['II', 'V1'] as const) expect(Math.abs(ex(l).mean), l).toBeLessThan(0.005);
  });

  it('2:1 conduction: ventricular rate = atrial rate / 2 ± 5 bpm (≈ 150/min), regular (max − min RR < 40 ms)', () => {
    const hr = 60000 / mean(r.rr);
    expect(Math.abs(hr - 60000 / cl / 2)).toBeLessThanOrEqual(5);
    expect(Math.max(...r.rr) - Math.min(...r.rr)).toBeLessThan(40);
    expect(r.blocks.length).toBeGreaterThan(0);
    expect(rateKind(ATRIAL_FLUTTER_TYPICAL)).toBe('meanVentricular');
    expect(ownsRate(ATRIAL_FLUTTER_TYPICAL)).toBe(true);
  });

  it('the rate control sets the AV ratio: 75/min → 4:1 (atrial/4 ± 5 bpm, regular); 120/min → variable 2:1/3:1 block (RR multiples of the cycle, mean on target)', () => {
    const f = build(ATRIAL_FLUTTER_TYPICAL);
    f.setHeartRate(75);
    const r4 = rhythmTruth(f, 4000, 14000);
    expect(Math.abs(60000 / mean(r4.rr) - 60000 / cl / 4)).toBeLessThanOrEqual(5);
    expect(Math.max(...r4.rr) - Math.min(...r4.rr)).toBeLessThan(40);
    const g = build(ATRIAL_FLUTTER_TYPICAL);
    g.setHeartRate(120);
    const rv = rhythmTruth(g, 4000, 14000);
    const ks = new Set(rv.rr.map((x) => Math.round(x / cl)));
    expect([...ks].sort()).toEqual([2, 3]);
    expect(Math.abs(60000 / mean(rv.rr) - 120)).toBeLessThan(3);
    expect(Math.abs(g.rhythm.heartRate - 120)).toBeLessThan(0.5);
  });

  it('narrow QRS (< 120 ms) with the sinus morphology: r ≥ 0.95 in II, V1, V5 (F waves superimposed)', () => {
    const s = shape(e, 3000);
    expect(s.b.qrsMs).toBeLessThan(120);
    for (const l of ['II', 'V1', 'V5'] as const) expect(pearson(qrsOf(e, s, l), qrsOf(normal, N, l)), l).toBeGreaterThanOrEqual(0.95);
  });

  it('no isoelectric baseline: in 4:1 every 80 ms window of lead II between T end and the next QRS changes by ≥ 0.04 mV', () => {
    const f = build(ATRIAL_FLUTTER_TYPICAL);
    f.setHeartRate(75);
    const s = shape(f, 6000);
    const next = rhythmTruth(f, s.b.v.tMs + 1, s.b.v.tMs + 2000).vs[0];
    const t1 = rhythmTruth(f, next.tMs - 1, next.tMs + 1).qrsOn(next);
    const t0 = s.tEnd;
    const x = fullLeads(f, t0, Math.round(t1 - t0))('II');
    expect(x.length).toBeGreaterThan(300);
    let flattest = Infinity;
    for (let i = 0; i + 80 < x.length; i++) {
      let hi = -Infinity, lo = Infinity;
      for (let k = i; k <= i + 80; k++) {
        hi = Math.max(hi, x[k]);
        lo = Math.min(lo, x[k]);
      }
      flattest = Math.min(flattest, hi - lo);
    }
    console.log(`flutter 4:1, lead II T end → QRS (${x.length} ms): flattest 80 ms window spans ${flattest.toFixed(3)} mV`);
    expect(flattest).toBeGreaterThanOrEqual(0.04);
  });

  it('the circuit: counterclockwise around the tricuspid annulus (LAO), slow cavotricuspid isthmus, passive left atrium', () => {
    const a = e.atrialActivation;
    expect(isCircuitActivation(a)).toBe(true);
    if (!isCircuitActivation(a)) return;
    const g = e.geometry.grid, f = a.frame, t = a.field.tAct;
    // ring of right-atrial wall next to the annulus: median activation time per 30° sector, starting at the CTI exit
    const phi0 = annulusAngle(f, f.ivc!);
    const sectors: number[][] = Array.from({ length: 12 }, () => []);
    const la: number[] = [];
    for (let v = 0; v < g.tissue.length; v++) {
      if (g.tissue[v] === TISSUE.LA && Number.isFinite(t[v])) la.push(t[v]);
      if (g.tissue[v] !== TISSUE.RA || !Number.isFinite(t[v])) continue;
      const p = voxelCenter(g, v);
      const depth = -((p[0] - f.c[0]) * f.n[0] + (p[1] - f.c[1]) * f.n[1] + (p[2] - f.c[2]) * f.n[2]);
      if (depth > 15) continue;
      let d = annulusAngle(f, p) - phi0;
      d -= 2 * Math.PI * Math.floor(d / (2 * Math.PI));
      sectors[Math.min(11, Math.floor(d / (Math.PI / 6)))].push(t[v]);
    }
    const med = sectors.map((s) => [...s].sort((x, y) => x - y)[Math.floor(s.length / 2)]);
    console.log('annulus ring, median activation per 30° from the CTI exit (ccw): ' + med.map((x) => x.toFixed(0)).join(' '));
    for (let i = 1; i < 12; i++) expect(med[i], `sector ${i}`).toBeGreaterThan(med[i - 1]);
    // the last 60° before the exit (the isthmus) takes ≥ 1.5× as long per degree as the rest of the ring
    const isthmusMsPerSector = (cl - med[10]) / 2, restMsPerSector = (med[10] - med[0]) / 10;
    expect(isthmusMsPerSector / restMsPerSector).toBeGreaterThanOrEqual(1.5);
    // left atrium: activated passively within the first ~60 % of the cycle, after the septum
    la.sort((x, y) => x - y);
    expect(la[0]).toBeGreaterThan(10);
    expect(la[la.length - 1]).toBeLessThan(0.6 * cl);
  });

  it('one source: with two GPU beat slots every atrial voxel resolves its phase of the circulation (3D = ECG field)', () => {
    const t = e.atrialActivation.field.tAct;
    for (const tm of [5000.3, 5123.7, 5250.1]) {
      const snap = e.activeBeats(tm);
      const [b0, b1] = snap.atrial;
      expect(b0 && b1).toBeTruthy();
      let unresolved = 0;
      for (let v = 0; v < t.length; v++) {
        if (!Number.isFinite(t[v])) continue;
        const tau = b0!.sinceMs >= t[v] ? b0!.sinceMs - t[v] : b1!.sinceMs - t[v];
        if (!(tau >= 0 && tau < cl + 1)) unresolved++;
      }
      expect(unresolved).toBe(0);
    }
  });
});

describe('AV nodal re-entrant tachycardia (typical slow–fast)', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>, s: Shape;
  beforeAll(() => {
    e = build(AVNRT);
    r = rhythmTruth(e, 2000, 12000);
    s = shape(e, 3000);
  });

  it('regular narrow-complex tachycardia: 140 ≤ HR ≤ 280 bpm, RR SD < 10 ms; 1:1 (one retrograde P′ per QRS)', () => {
    const hr = 60000 / mean(r.rr);
    expect(hr).toBeGreaterThanOrEqual(140);
    expect(hr).toBeLessThanOrEqual(280);
    expect(sd(r.rr)).toBeLessThan(10);
    expect(Math.abs(r.as.length - r.vs.length)).toBeLessThanOrEqual(1);
    for (const v of r.vs.slice(0, -1)) expect(r.as.filter((a) => a.tMs >= v.tMs && a.tMs < v.tMs + 100).length).toBe(1);
    expect(r.as.every((a) => a.variant === 'retrograde')).toBe(true);
  });

  it('QRS < 120 ms; r ≥ 0.95 with the sinus QRS except its terminal 40 ms (II, V1, aVF)', () => {
    expect(s.b.qrsMs).toBeLessThan(120);
    const head = (x: number[]) => x.slice(0, Math.max(10, x.length - 40));
    for (const l of ['II', 'V1', 'aVF'] as const) expect(pearson(head(qrsOf(e, s, l)), head(qrsOf(normal, N, l))), l).toBeGreaterThanOrEqual(0.95);
  });

  it('retrograde P′: onset ≤ 90 ms after the QRS onset (and not before it), net negative in II, III, aVF', () => {
    const v = s.b.v;
    const a = r.as.find((x) => x.tMs >= v.tMs)!;
    const rp = r.pOn(a) - s.on;
    console.log(`AVNRT: P′ onset − QRS onset ${rp.toFixed(1)} ms`);
    expect(rp).toBeGreaterThanOrEqual(0);
    expect(rp).toBeLessThanOrEqual(90);
    const p = pWave(e, a);
    for (const l of ['II', 'III', 'aVF'] as const) expect(p.area[l], l).toBeLessThan(0);
    expect(p.area.aVR).toBeGreaterThan(0);
  });

  it('pseudo-r′ in V1 (terminal positive deflection at the J point, absent from the sinus QRS) and pseudo-S in II, III, aVF', () => {
    const d = (l: LeadName, k: number) => s.at(l, s.on + k) - N.at(l, N.on + k);
    const q = Math.round(s.off - s.on);
    let r1 = -Infinity, at = 0;
    for (let k = q - 10; k <= q + 10; k++) if (d('V1', k) > r1) [r1, at] = [d('V1', k), k];
    console.log(`AVNRT V1 − sinus V1 at the J point: +${r1.toFixed(3)} mV at QRS onset + ${at} ms (V1 there ${s.at('V1', s.on + at).toFixed(3)})`);
    expect(r1).toBeGreaterThanOrEqual(0.03);
    expect(s.at('V1', s.on + at)).toBeGreaterThan(0.02);
    for (const l of ['II', 'III', 'aVF'] as const) {
      let m = Infinity;
      for (let k = q - 25; k <= q; k++) m = Math.min(m, d(l, k));
      expect(m, l).toBeLessThanOrEqual(-0.05);
    }
  });

  it('no P before the QRS: no atrial activation starts 80–300 ms before a QRS onset; the atrial signal is < 0.03 mV in the 80 ms before it (equivalent form: the previous P′ lies in the 80–300 ms window at 180/min)', () => {
    for (const v of r.vs.slice(1)) {
      const on = r.qrsOn(v);
      expect(r.as.some((a) => r.pOn(a) > on - 300 && r.pOn(a) < on - 80)).toBe(false);
    }
    const on = s.on;
    const A = atrialLeads(e, on - 80, 80);
    let mx = 0;
    for (const l of LEADS) for (const x of A(l)) mx = Math.max(mx, Math.abs(x));
    expect(mx).toBeLessThan(0.03);
  });

  it('the rate control drives the re-entry ("SVT rate"): 150/min → RR 400 ms', () => {
    expect(rateKind(AVNRT)).toBe('svt');
    expect(ownsRate(AVNRT)).toBe(true);
    const f = build(AVNRT);
    f.setHeartRate(150);
    expect(Math.abs(mean(rhythmTruth(f, 4000, 10000).rr) - 400)).toBeLessThan(2);
  });
});
