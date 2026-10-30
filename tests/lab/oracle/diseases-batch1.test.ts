/**
 * Disease library batch 1 on the realistic HRA heart, against the machine-checkable test_oracle lines of
 * docs/research/disease-spec.json (measured in model-truth windows: truthMeasure.ts). Where the model can only meet a
 * criterion in a documented, equivalent form, the test name says so.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Engine } from '../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import {
  ANTERIOR_STEMI, COMPLETE_HEART_BLOCK, FIRST_DEGREE_AV_BLOCK, LATERAL_STEMI, MOBITZ_I_WENCKEBACH, MOBITZ_II, OLD_MI_Q_WAVES,
  PREMATURE_ATRIAL_CONTRACTION, PREMATURE_VENTRICULAR_CONTRACTION, RBBB, SINUS_ARRHYTHMIA, SINUS_BRADYCARDIA,
  SINUS_TACHYCARDIA, WPW_LEFT_LATERAL,
} from '../../../src/lab/sim/scenarios/library';
import { NORMAL_SCENARIO } from '../../../src/lab/sim/scenarios/normal';
import type { Scenario } from '../../../src/lab/sim/scenarios/types';
import type { GeometryBundle, LeadName } from '../../../src/lab/sim/types';
import { LEADS, TISSUE } from '../../../src/lab/sim/types';
import { pearson } from './linalg';
import type { TruthBeat } from './truthMeasure';
import { frontalAxis, pWave, rhythmTruth, truthBeat } from './truthMeasure';

const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);
let geo: GeometryBundle;
let normal: Engine;
let bn: TruthBeat;

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  normal = buildEngineSync(geo, undefined, { scenario: NORMAL_SCENARIO });
  bn = truthBeat(normal, 3000);
});

const build = (sc: Scenario) => buildEngineSync(geo, undefined, { scenario: sc });
const mean = (x: readonly number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const sd = (x: readonly number[]) => Math.sqrt(mean(x.map((v) => (v - mean(x)) ** 2)));
const range = (x: readonly number[]) => Math.max(...x) - Math.min(...x);
const qtcF = (b: TruthBeat) => b.qtMs / Math.cbrt(b.rrMs / 1000);
/** One lead over the QRS window of a beat (for morphology correlation). */
function qrsTrace(e: Engine, b: TruthBeat, lead: LeadName): Float32Array {
  const tpl = e.templates.get(b.v.variant, b.v.rrPrevMs)!;
  const t0 = b.v.tMs + tpl.truth.onMs, n = Math.round(tpl.truth.offMs - tpl.truth.onMs);
  const out = new Float32Array(12 * n);
  e.sampleLeads(t0, n, out);
  const li = LEADS.indexOf(lead);
  return out.slice(li * n, (li + 1) * n);
}
/** Leads whose T area is opposite in sign to the net QRS area (secondary ST-T change). */
const discordantLeads = (b: TruthBeat) => LEADS.filter((l) => Math.sign(b.leads[l].netQrs) * Math.sign(b.leads[l].tArea) < 0).length;

describe('sinus bradycardia', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>, b: TruthBeat;
  beforeAll(() => {
    e = build(SINUS_BRADYCARDIA);
    r = rhythmTruth(e, 2000, 20000);
    b = truthBeat(e, 3000);
  });
  it('HR < 60 bpm, RR regular (max − min < 120 ms)', () => {
    expect(60000 / mean(r.rr)).toBeLessThan(60);
    expect(range(r.rr)).toBeLessThan(120);
  });
  it('every QRS preceded by a P with PR 120–200 ms; P positive in I, II, aVF (P axis 0..+90°; spec 0..+75°, the HRA sinus P axis is +84° as in normal rhythm)', () => {
    for (const a of r.as) {
      const pr = r.pr(a)!;
      expect(pr).toBeGreaterThanOrEqual(120);
      expect(pr).toBeLessThanOrEqual(200);
    }
    const p = pWave(e, r.as[0]);
    for (const l of ['I', 'II', 'aVF'] as const) expect(p.area[l], l).toBeGreaterThan(0);
    expect(p.axis).toBeGreaterThanOrEqual(0);
    expect(p.axis).toBeLessThanOrEqual(90);
  });
  it('QRS < 120 ms with sinus morphology; QTc (Fridericia) normal although the QT is longer', () => {
    expect(b.qrsMs).toBeLessThan(120);
    expect(pearson(qrsTrace(e, b, 'II'), qrsTrace(normal, bn, 'II'))).toBeGreaterThan(0.95);
    expect(b.qtMs).toBeGreaterThan(bn.qtMs);
    expect(qtcF(b)).toBeGreaterThan(350);
    expect(qtcF(b)).toBeLessThan(440);
  });
});

describe('sinus tachycardia', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>, b: TruthBeat;
  beforeAll(() => {
    e = build(SINUS_TACHYCARDIA);
    r = rhythmTruth(e, 2000, 12000);
    b = truthBeat(e, 3000);
  });
  it('HR > 100 bpm, RR regular (max − min < 60 ms), PR ≥ 120 ms and shorter than at 75 bpm', () => {
    expect(60000 / mean(r.rr)).toBeGreaterThan(100);
    expect(range(r.rr)).toBeLessThan(60);
    for (const a of r.as) expect(r.pr(a)!).toBeGreaterThanOrEqual(120);
    expect(b.prMs!).toBeLessThan(bn.prMs!);
  });
  it('QRS < 120 ms with sinus morphology; QT shorter than in NSR, QTc (Fridericia) normal', () => {
    expect(b.qrsMs).toBeLessThan(120);
    expect(pearson(qrsTrace(e, b, 'II'), qrsTrace(normal, bn, 'II'))).toBeGreaterThan(0.95);
    expect(b.qtMs).toBeLessThan(bn.qtMs);
    expect(qtcF(b)).toBeGreaterThan(350);
    expect(qtcF(b)).toBeLessThan(440);
  });
});

describe('sinus arrhythmia', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>;
  beforeAll(() => {
    e = build(SINUS_ARRHYTHMIA);
    r = rhythmTruth(e, 2000, 18000);
  });
  it('PP range > 120 ms over ≥ 2 respiratory cycles, phasic with the 4 s breathing period (sine fit R² > 0.8)', () => {
    expect(range(r.pp)).toBeGreaterThan(120);
    const t = r.as.slice(1).map((a) => a.tMs), y = r.pp;
    // least squares y ≈ c + a·sin + b·cos at the respiratory frequency
    const w = (2 * Math.PI) / 4000;
    const X = t.map((ti) => [1, Math.sin(w * ti), Math.cos(w * ti)]);
    const A = [0, 1, 2].map((i) => [0, 1, 2].map((j) => X.reduce((s2, row) => s2 + row[i] * row[j], 0)));
    const B = [0, 1, 2].map((i) => X.reduce((s2, row, k) => s2 + row[i] * y[k], 0));
    // solve 3×3 (Cramer)
    const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(A);
    const coef = [0, 1, 2].map((c) => det(A.map((row, i) => row.map((v, j) => (j === c ? B[i] : v)))) / D);
    const fit = X.map((row) => row[0] * coef[0] + row[1] * coef[1] + row[2] * coef[2]);
    const ssRes = y.reduce((s2, v, k) => s2 + (v - fit[k]) ** 2, 0), ssTot = y.reduce((s2, v) => s2 + (v - mean(y)) ** 2, 0);
    expect(1 - ssRes / ssTot).toBeGreaterThan(0.8);
  });
  it('constant PR (SD < 10 ms) and identical P morphology (r ≥ 0.95)', () => {
    expect(sd(r.as.map((a) => r.pr(a)!))).toBeLessThan(10);
    const p0 = pWave(e, r.as[0]), p1 = pWave(e, r.as[5]);
    expect(pearson(LEADS.map((l) => p0.area[l]), LEADS.map((l) => p1.area[l]))).toBeGreaterThan(0.95);
  });
});

describe('premature atrial contraction', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>;
  beforeAll(() => {
    e = build(PREMATURE_ATRIAL_CONTRACTION);
    r = rhythmTruth(e, 2000, 14000);
  });
  it("P′ is early (PP′ < 0.85 × PP) with a different axis (> 30°: low-atrial focus, inverted in II, III, aVF); P′R ≥ 120 ms", () => {
    const i = r.as.findIndex((a, k) => k > 0 && a.variant === 'pac');
    const pac = r.as[i], before = r.as[i - 1];
    const basal = 60000 / e.rhythm.heartRate;
    expect(pac.tMs - before.tMs).toBeLessThan(0.85 * basal);
    const ps = pWave(e, before), pp = pWave(e, pac);
    expect(Math.abs(ps.axis - pp.axis)).toBeGreaterThan(30);
    for (const l of ['II', 'III', 'aVF'] as const) expect(pp.area[l], l).toBeLessThan(0);
    expect(r.pr(pac)!).toBeGreaterThanOrEqual(120);
  });
  it('the QRS after P′ is narrow with sinus morphology (r ≥ 0.95)', () => {
    const b = truthBeat(e, 2000, (v) => {
      const a = r.as.find((x) => x.id === v.fromA);
      return !!a && a.variant === 'pac';
    });
    expect(b.qrsMs).toBeLessThan(120);
    expect(pearson(qrsTrace(e, b, 'II'), qrsTrace(normal, bn, 'II'))).toBeGreaterThan(0.95);
  });
  it('non-compensatory pause: RR(pre) + RR(post) < 2 × RR − 40 ms', () => {
    const basal = 60000 / e.rhythm.heartRate;
    const k = r.vs.findIndex((v, j) => j > 0 && r.as.find((a) => a.id === v.fromA)?.variant === 'pac');
    const on = (j: number) => r.qrsOn(r.vs[j]);
    expect(on(k + 1) - on(k - 1)).toBeLessThan(2 * basal - 40);
  });
});

describe('premature ventricular contraction (RVOT)', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>, b: TruthBeat;
  beforeAll(() => {
    e = build(PREMATURE_VENTRICULAR_CONTRACTION);
    r = rhythmTruth(e, 2000, 14000);
    b = truthBeat(e, 2000, (v) => v.variant === 'pvc');
  });
  it('wide QRS (≥ 120 ms) not preceded by a premature P (no P onset 120–200 ms before it)', () => {
    expect(b.qrsMs).toBeGreaterThanOrEqual(120);
    const on = r.qrsOn(b.v);
    for (const a of r.as) {
      const d = on - r.pOn(a);
      expect(d >= 120 && d <= 200).toBe(false);
    }
  });
  it('T opposite to the dominant QRS deflection in ≥ 8 of 12 leads', () => {
    expect(discordantLeads(b)).toBeGreaterThanOrEqual(8);
  });
  it('fully compensatory pause: RR(pre) + RR(post) = 2 × RR ± 20 ms', () => {
    const basal = 60000 / e.rhythm.heartRate;
    const k = r.vs.findIndex((v, j) => j > 0 && v.variant === 'pvc');
    expect(Math.abs(r.qrsOn(r.vs[k + 1]) - r.qrsOn(r.vs[k - 1]) - 2 * basal)).toBeLessThanOrEqual(20);
  });
  it('RV outflow origin: V1 net negative; II, III, aVF positive; aVL and aVR negative', () => {
    expect(b.leads.V1.netQrs).toBeLessThan(0);
    for (const l of ['II', 'III', 'aVF'] as const) expect(b.leads[l].netQrs, l).toBeGreaterThan(0);
    for (const l of ['aVL', 'aVR'] as const) expect(b.leads[l].netQrs, l).toBeLessThan(0);
  });
});

describe('first-degree AV block', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>;
  beforeAll(() => {
    e = build(FIRST_DEGREE_AV_BLOCK);
    r = rhythmTruth(e, 2000, 14000);
  });
  it('PR > 200 ms on every beat (SD < 10 ms), P:QRS = 1:1', () => {
    const prs = r.as.map((a) => r.pr(a));
    for (const pr of prs) expect(pr).not.toBeNull();
    for (const pr of prs) expect(pr!).toBeGreaterThan(200);
    expect(sd(prs as number[])).toBeLessThan(10);
    expect(r.blocks.length).toBe(0);
  });
  it('QRS duration within 5 ms of NSR', () => {
    expect(Math.abs(truthBeat(e, 3000).qrsMs - bn.qrsMs)).toBeLessThanOrEqual(5);
  });
});

describe('second-degree AV block, Mobitz I (Wenckebach 4:3)', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>;
  /** Groups of conducted PRs between dropped P waves. */
  let groups: { prs: number[]; rrs: number[] }[];
  beforeAll(() => {
    e = build(MOBITZ_I_WENCKEBACH);
    r = rhythmTruth(e, 2000, 30000);
    groups = [];
    let cur: { prs: number[]; vs: number[] } = { prs: [], vs: [] };
    for (const a of r.as) {
      const v = r.vOf(a);
      if (!v) {
        if (cur.prs.length) groups.push({ prs: cur.prs, rrs: cur.vs.slice(1).map((x, i) => x - cur.vs[i]) });
        cur = { prs: [], vs: [] };
      } else {
        cur.prs.push(r.pr(a)!);
        cur.vs.push(r.qrsOn(v));
      }
    }
    groups = groups.filter((g) => g.prs.length === 3);
  });
  it('constant PP; groups of 3 conducted P per 4 (4:3); each dropped P has no QRS within 600 ms', () => {
    expect(sd(r.pp)).toBeLessThan(20);
    expect(groups.length).toBeGreaterThanOrEqual(3);
    const dropped = r.as.filter((a) => !r.vOf(a));
    for (const a of dropped) expect(r.vs.some((v) => r.qrsOn(v) > a.tMs && r.qrsOn(v) < a.tMs + 600)).toBe(false);
    expect(dropped.length / r.as.length).toBeCloseTo(0.25, 1);
  });
  it('PR grows within each group, with the largest increment between beats 1 and 2; the PR after the pause is the shortest', () => {
    for (const g of groups) {
      expect(g.prs[1]).toBeGreaterThan(g.prs[0]);
      expect(g.prs[2]).toBeGreaterThan(g.prs[1]);
      expect(g.prs[1] - g.prs[0]).toBeGreaterThan(g.prs[2] - g.prs[1]);
      expect(g.prs[0]).toBe(Math.min(...g.prs));
    }
    expect(Math.abs(groups[1].prs[0] - groups[0].prs[0])).toBeLessThanOrEqual(10);
  });
  it('RR shortens within each group; the RR around the dropped beat < 2 × PP; QRS < 120 ms', () => {
    for (const g of groups) expect(g.rrs[1]).toBeLessThan(g.rrs[0]);
    const pp = mean(r.pp);
    expect(Math.max(...r.rr)).toBeLessThan(2 * pp);
    expect(truthBeat(e, 3000).qrsMs).toBeLessThan(120);
  });
});

describe('second-degree AV block, Mobitz II (4:3, infra-Hisian, RBBB background)', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>;
  beforeAll(() => {
    e = build(MOBITZ_II);
    r = rhythmTruth(e, 2000, 20000);
  });
  it('constant PR in conducted beats (max − min ≤ 10 ms); P waves without QRS, blocked below the His bundle', () => {
    const prs = r.as.map((a) => r.pr(a)).filter((x): x is number => x !== null);
    expect(range(prs)).toBeLessThanOrEqual(10);
    expect(r.as.some((a) => !r.vOf(a))).toBe(true);
    for (const bl of r.blocks) expect(bl.kind === 'block' && bl.site).toBe('His');
  });
  it('the RR spanning a dropped beat = 2 × PP ± 20 ms', () => {
    const pp = mean(r.pp);
    expect(Math.abs(Math.max(...r.rr) - 2 * pp)).toBeLessThanOrEqual(20);
  });
  it('conducted QRS ≥ 120 ms (bundle-branch disease below the His bundle)', () => {
    expect(truthBeat(e, 3000).qrsMs).toBeGreaterThanOrEqual(120);
  });
});

describe('complete heart block (ventricular escape)', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>;
  beforeAll(() => {
    e = build(COMPLETE_HEART_BLOCK);
    r = rhythmTruth(e, 2000, 40000);
  });
  it('PP and RR regular and independent; atrial rate > ventricular rate; no P conducts', () => {
    expect(sd(r.pp)).toBeLessThan(10);
    expect(sd(r.rr)).toBeLessThan(10);
    expect(mean(r.pp)).toBeLessThan(mean(r.rr));
    expect(r.vs.every((v) => v.fromA === null)).toBe(true);
  });
  it('P-to-QRS intervals vary (SD > 40 ms): no fixed AV relation', () => {
    const lags = r.vs.flatMap((v) => {
      const on = r.qrsOn(v);
      const prev = r.as.filter((a) => r.pOn(a) < on).pop();
      return prev ? [on - r.pOn(prev)] : [];
    });
    expect(sd(lags)).toBeGreaterThan(40);
  });
  it('ventricular escape: 20–40 bpm with QRS ≥ 120 ms', () => {
    const hr = 60000 / mean(r.rr);
    expect(hr).toBeGreaterThanOrEqual(20);
    expect(hr).toBeLessThanOrEqual(40);
    expect(truthBeat(e, 3000).qrsMs).toBeGreaterThanOrEqual(120);
  });
});

describe('right bundle branch block', () => {
  let b: TruthBeat;
  beforeAll(() => {
    b = truthBeat(build(RBBB), 3000);
  });
  it('QRS ≥ 120 ms', () => {
    expect(b.qrsMs).toBeGreaterThanOrEqual(120);
  });
  it("V1: two positive peaks (r then R′) with R′ > r; R-peak time > 50 ms", () => {
    const pk = b.leads.V1.peaks;
    expect(pk.length).toBeGreaterThanOrEqual(2);
    expect(pk[pk.length - 1][1]).toBeGreaterThan(pk[0][1]);
    expect(b.leads.V1.rPeakTime).toBeGreaterThan(50);
  });
  it('wide terminal S (> 40 ms) in I and V6; R-peak time in V6 < 45 ms; septal q kept in V6', () => {
    for (const l of ['I', 'V6'] as const) expect(b.leads[l].sDurMs, l).toBeGreaterThan(40);
    expect(b.leads.V6.rPeakTime).toBeLessThan(45);
    expect(b.leads.V6.qDurMs).toBeGreaterThan(0);
    expect(b.leads.V6.qDurMs).toBeLessThan(40);
  });
  it('secondary T inversion in V1', () => {
    expect(b.leads.V1.tArea).toBeLessThan(0);
  });
  it('frontal axis of the initial 60 ms (the unblocked part, how the axis is read in RBBB) within −30..+90°', () => {
    const ax = frontalAxis(b.leads.I.init60, b.leads.aVF.init60);
    expect(ax).toBeGreaterThanOrEqual(-30);
    expect(ax).toBeLessThanOrEqual(90);
  });
});

describe('WPW, left lateral accessory pathway', () => {
  let e: Engine, b: TruthBeat;
  beforeAll(() => {
    e = build(WPW_LEFT_LATERAL);
    b = truthBeat(e, 3000);
  });
  it('the 3D view sees the pre-excited beat as soon as the pathway activates (before the His event)', () => {
    const tAp = b.v.tMs + e.ventricularActivation.field.tMinMs;
    expect(tAp).toBeLessThan(b.v.tMs);
    const snap = e.activeBeats(tAp + 2);
    expect(snap.ventricular[0]?.eventId).toBe(b.v.id);
    expect(snap.ventricular[0]!.sinceMs).toBeLessThan(0);
  });
  it('short PR (< 120 ms) and QRS ≥ 110 ms', () => {
    expect(b.prMs!).toBeLessThan(120);
    expect(b.qrsMs).toBeGreaterThanOrEqual(110);
  });
  it('slurred delta: the steepest upstroke in the first 40 ms in V4–V6 < 50 % of the NSR one', () => {
    for (const l of ['V4', 'V5', 'V6'] as const) expect(b.leads[l].upSlope40 / bn.leads[l].upSlope40, l).toBeLessThan(0.5);
  });
  it('type A: V1 R/S > 1; delta positive in V1–V5; delta negative or isoelectric (mean |v| < 0.025 mV) in I or aVL', () => {
    expect(b.leads.V1.r / Math.max(1e-6, b.leads.V1.s)).toBeGreaterThan(1);
    for (const l of ['V1', 'V2', 'V3', 'V4', 'V5'] as const) expect(b.leads[l].init40, l).toBeGreaterThan(0);
    expect(Math.min(b.leads.I.init40, b.leads.aVL.init40)).toBeLessThanOrEqual(0.025 * 40);
  });
  it('secondary ST-T: T opposite to the dominant QRS in ≥ 6 leads', () => {
    expect(discordantLeads(b)).toBeGreaterThanOrEqual(6);
  });
});

describe('anterior STEMI (proximal LAD)', () => {
  let b: TruthBeat;
  beforeAll(() => {
    b = truthBeat(build(ANTERIOR_STEMI), 3000);
    console.log('anterior STEMI ST(J): ' + LEADS.map((l) => `${l} ${b.leads[l].stJ.toFixed(2)}`).join(' · '));
  });
  it('ST(J) ≥ 0.2 mV in V2 and V3, ≥ 0.1 mV in V4', () => {
    expect(b.leads.V2.stJ).toBeGreaterThanOrEqual(0.2);
    expect(b.leads.V3.stJ).toBeGreaterThanOrEqual(0.2);
    expect(b.leads.V4.stJ).toBeGreaterThanOrEqual(0.1);
  });
  it('proximal: ST(J) ≥ 0.1 mV in I and aVL; reciprocal depression in III or aVF (≤ −0.05 mV); no inferior elevation', () => {
    expect(b.leads.I.stJ).toBeGreaterThanOrEqual(0.1);
    expect(b.leads.aVL.stJ).toBeGreaterThanOrEqual(0.1);
    expect(Math.min(b.leads.III.stJ, b.leads.aVF.stJ)).toBeLessThanOrEqual(-0.05);
    for (const l of ['II', 'III', 'aVF'] as const) expect(b.leads[l].stJ, l).toBeLessThan(0.1);
  });
  it('depolarization unchanged (QRS within 2 ms of NSR)', () => {
    expect(Math.abs(b.qrsMs - bn.qrsMs)).toBeLessThanOrEqual(2);
  });
});

describe('lateral STEMI (circumflex / obtuse marginal)', () => {
  let b: TruthBeat;
  beforeAll(() => {
    b = truthBeat(build(LATERAL_STEMI), 3000);
    console.log('lateral STEMI ST(J): ' + LEADS.map((l) => `${l} ${b.leads[l].stJ.toFixed(2)}`).join(' · '));
  });
  it('ST(J) ≥ 0.1 mV in I, aVL, V5 and V6', () => {
    for (const l of ['I', 'aVL', 'V5', 'V6'] as const) expect(b.leads[l].stJ, l).toBeGreaterThanOrEqual(0.1);
  });
  it('reciprocal: ST(J) in III ≤ −0.05 mV and in aVF < 0; no elevation in V1–V3', () => {
    expect(b.leads.III.stJ).toBeLessThanOrEqual(-0.05);
    expect(b.leads.aVF.stJ).toBeLessThan(0);
    for (const l of ['V1', 'V2', 'V3'] as const) expect(b.leads[l].stJ, l).toBeLessThan(0.1);
  });
});

describe('old inferior MI (Q waves)', () => {
  let e: Engine, b: TruthBeat;
  beforeAll(() => {
    e = build(OLD_MI_Q_WAVES);
    b = truthBeat(e, 3000);
    console.log('old MI Q: ' + (['II', 'III', 'aVF'] as const).map((l) => `${l} ${b.leads[l].qDurMs} ms ${b.leads[l].qDepth.toFixed(2)} mV`).join(' · '));
  });
  it('the inferior scar is relabelled non-excitable tissue', () => {
    let dead = 0;
    for (const t of e.geometry.grid.tissue) if (t === TISSUE.Dead) dead++;
    expect(dead).toBeGreaterThan(500);
  });
  it('pathological Q (≥ 30 ms and ≥ 0.1 mV) in ≥ 2 of II, III, aVF', () => {
    const n = (['II', 'III', 'aVF'] as const).filter((l) => b.leads[l].qDurMs >= 30 && b.leads[l].qDepth >= 0.1).length;
    expect(n).toBeGreaterThanOrEqual(2);
  });
  it('no current of injury (|ST(J)| < 0.1 mV in II, III, aVF) and QRS < 120 ms', () => {
    for (const l of ['II', 'III', 'aVF'] as const) expect(Math.abs(b.leads[l].stJ), l).toBeLessThan(0.1);
    expect(b.qrsMs).toBeLessThan(120);
  });
});
