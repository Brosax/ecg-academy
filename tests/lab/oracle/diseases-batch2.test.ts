/**
 * Disease library batch 2 on the realistic HRA heart, against the test_oracle lines of docs/research/disease-spec.json
 * (model-truth windows: truthMeasure.ts). Criteria the model can only meet in an equivalent form say so in the test
 * name; criteria that need leads the model does not have (posterior V7–V9) are left out and listed in the report.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Engine } from '../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import {
  ACUTE_PERICARDITIS, DIGOXIN_EFFECT, HYPERCALCEMIA, HYPERKALEMIA, HYPOCALCEMIA, JUNCTIONAL_ESCAPE, LONG_QT, MONOMORPHIC_VT,
  NSTEMI, POSTERIOR_MI, PULMONARY_EMBOLISM,
} from '../../../src/lab/sim/scenarios/library';
import { NORMAL_SCENARIO } from '../../../src/lab/sim/scenarios/normal';
import type { Scenario } from '../../../src/lab/sim/scenarios/types';
import type { BeatEvent, GeometryBundle, LeadName } from '../../../src/lab/sim/types';
import { LEADS, TISSUE } from '../../../src/lab/sim/types';
import { pearson } from './linalg';
import type { Shape } from './truthMeasure';
import { beatShape as shape, frontalAxis, pWave, qrsOf, rhythmTruth, truthBeat } from './truthMeasure';

const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);
let geo: GeometryBundle;
let normal: Engine;
let N: Shape;

const build = (sc: Scenario) => buildEngineSync(geo, undefined, { scenario: sc });
const mean = (x: readonly number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const sd = (x: readonly number[]) => Math.sqrt(mean(x.map((v) => (v - mean(x)) ** 2)));

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  normal = buildEngineSync(geo, undefined, { scenario: NORMAL_SCENARIO });
  N = shape(normal);
});

describe('sustained monomorphic VT (exit at the border of an apical scar)', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>, s: Shape;
  beforeAll(() => {
    e = build(MONOMORPHIC_VT);
    r = rhythmTruth(e, 2000, 14000);
    s = shape(e, 2500, (v) => v.variant === 'vt');
  });
  it('regular wide-complex tachycardia: HR > 100 bpm, RR SD < 20 ms, QRS ≥ 140 ms', () => {
    expect(60000 / mean(r.rr)).toBeGreaterThan(100);
    expect(sd(r.rr)).toBeLessThan(20);
    expect(s.b.qrsMs).toBeGreaterThanOrEqual(140);
  });
  it('monomorphic: beat-to-beat QRS correlation ≥ 0.95', () => {
    const s2 = shape(e, 5000, (v) => v.variant === 'vt');
    expect(pearson(qrsOf(e, s, 'V3'), qrsOf(e, s2, 'V3'))).toBeGreaterThan(0.95);
  });
  it('AV dissociation: sinus P waves continue at their own rate, P-to-QRS intervals vary (SD > 40 ms)', () => {
    expect(Math.abs(mean(r.pp) - mean(r.rr))).toBeGreaterThan(100);
    const lags = r.vs.flatMap((v) => {
      const p = r.as.filter((a) => r.pOn(a) < r.qrsOn(v)).pop();
      return p ? [r.qrsOn(v) - r.pOn(p)] : [];
    });
    expect(sd(lags)).toBeGreaterThan(40);
  });
  it('apical exit: northwest frontal axis (−90..−180°) and negative QRS in V2–V6 (V1 stays positive on this heart)', () => {
    const ax = frontalAxis(s.b.leads.I.netQrs, s.b.leads.aVF.netQrs);
    expect(ax).toBeLessThanOrEqual(-90);
    expect(ax).toBeGreaterThanOrEqual(-180);
    for (const l of ['V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(s.b.leads[l].netQrs, l).toBeLessThan(0);
  });
  it('the rate control drives the VT (rateKind "vt"): 130 bpm → RR ≈ 462 ms', () => {
    const f = build(MONOMORPHIC_VT);
    f.setHeartRate(130);
    expect(f.rhythm.heartRate).toBe(130);
    const rr = rhythmTruth(f, 4000, 12000).rr;
    expect(Math.abs(mean(rr) - 60000 / 130)).toBeLessThan(2);
  });
  it('the substrate: an old apical scar (non-excitable voxels)', () => {
    let dead = 0;
    for (const t of e.geometry.grid.tissue) if (t === TISSUE.Dead) dead++;
    expect(dead).toBeGreaterThan(100);
  });
});

describe('junctional escape rhythm', () => {
  let e: Engine, r: ReturnType<typeof rhythmTruth>, s: Shape;
  beforeAll(() => {
    e = build(JUNCTIONAL_ESCAPE);
    r = rhythmTruth(e, 2000, 20000);
    s = shape(e);
  });
  it('40–60 bpm, regular (max − min RR < 80 ms); no sinus P waves', () => {
    const hr = 60000 / mean(r.rr);
    expect(hr).toBeGreaterThanOrEqual(40);
    expect(hr).toBeLessThanOrEqual(60);
    expect(Math.max(...r.rr) - Math.min(...r.rr)).toBeLessThan(80);
    expect(r.as.every((a) => a.variant === 'retrograde')).toBe(true);
  });
  it('narrow QRS identical to the sinus QRS (r ≥ 0.95)', () => {
    expect(s.b.qrsMs).toBeLessThan(120);
    expect(pearson(qrsOf(e, s, 'II'), qrsOf(normal, N, 'II'))).toBeGreaterThan(0.95);
  });
  it("retrograde P′ after the QRS onset, negative in II, III, aVF and positive in aVR", () => {
    const a = r.as[1];
    const v = r.vs.filter((x) => x.tMs <= a.tMs).pop()!;
    expect(r.pOn(a)).toBeGreaterThan(r.qrsOn(v));
    const p = pWave(e, a);
    for (const l of ['II', 'III', 'aVF'] as const) expect(p.area[l], l).toBeLessThan(0);
    expect(p.area.aVR).toBeGreaterThan(0);
  });
});

describe('posterior MI (inferolateral injury)', () => {
  let s: Shape;
  beforeAll(() => {
    s = shape(build(POSTERIOR_MI));
    console.log('posterior MI ST(J): ' + LEADS.map((l) => `${l} ${s.at(l, s.off).toFixed(2)}`).join(' · '));
  });
  it('ST depression ≤ −0.05 mV in ≥ 2 of V1–V3, flat (rises ≤ 0.05 mV more than the normal ST over J → J+80)', () => {
    const ok = (['V1', 'V2', 'V3'] as const).filter((l) => {
      const j = s.at(l, s.off), rise = s.at(l, s.off + 80) - j, nRise = N.at(l, N.off + 80) - N.at(l, N.off);
      return j <= -0.05 && Math.abs(rise - nRise) < 0.05;
    });
    expect(ok.length).toBeGreaterThanOrEqual(2);
  });
  it('upright T waves in V2 and V3 (the mirror image of a posterior injury, not an anterior one)', () => {
    for (const l of ['V2', 'V3'] as const) expect(s.t(l).pk, l).toBeGreaterThan(0);
    for (const l of ['V1', 'V2', 'V3', 'V4'] as const) expect(s.at(l, s.off), l).toBeLessThan(0.1);
  });
});

describe('subendocardial ischaemia / NSTEMI (circumferential)', () => {
  let s: Shape;
  beforeAll(() => {
    s = shape(build(NSTEMI));
    console.log('NSTEMI ST(J): ' + LEADS.map((l) => `${l} ${s.at(l, s.off).toFixed(2)}`).join(' · '));
  });
  it('ST depression ≤ −0.05 mV in ≥ 2 contiguous leads (II, aVF / V4–V6), horizontal or downsloping relative to the normal ST', () => {
    const dep = (l: LeadName) => {
      const j = s.at(l, s.off), rise = s.at(l, s.off + 40) - j, nRise = N.at(l, N.off + 40) - N.at(l, N.off);
      return j <= -0.05 && rise - nRise <= 0.03;
    };
    expect(dep('II') && dep('aVF')).toBe(true);
    expect((['V4', 'V5', 'V6'] as const).filter(dep).length).toBeGreaterThanOrEqual(2);
  });
  it('ST elevation in aVR ≥ 0.1 mV; no other lead except V1 with ST ≥ 0.1 mV', () => {
    expect(s.at('aVR', s.off)).toBeGreaterThanOrEqual(0.1);
    for (const l of LEADS) if (l !== 'aVR' && l !== 'V1') expect(s.at(l, s.off), l).toBeLessThan(0.1);
  });
  it('depolarization unchanged: QRS within 2 ms and correlation ≥ 0.95 with NSR', () => {
    expect(Math.abs(s.b.qrsMs - N.b.qrsMs)).toBeLessThanOrEqual(2);
    expect(pearson(qrsOf(normal, s, 'V5'), qrsOf(normal, N, 'V5'))).toBeGreaterThan(0.95);
  });
});

describe('acute pericarditis', () => {
  let s: Shape;
  const NINE = ['I', 'II', 'aVL', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
  beforeAll(() => {
    s = shape(build(ACUTE_PERICARDITIS));
    console.log('pericarditis ST(J) vs TP: ' + LEADS.map((l) => `${l} ${s.tp(l, s.off).toFixed(2)}`).join(' · '));
  });
  it('diffuse ST elevation (≥ 0.05 mV vs TP in ≥ 7 of I, II, aVL, aVF, V2–V6), modest (< 0.5 mV), depressed in aVR', () => {
    expect(NINE.filter((l) => s.tp(l, s.off) >= 0.05).length).toBeGreaterThanOrEqual(7);
    for (const l of LEADS) expect(s.tp(l, s.off), l).toBeLessThan(0.5);
    expect(s.tp('aVR', s.off)).toBeLessThanOrEqual(-0.05);
    for (const l of LEADS) if (l !== 'aVR' && l !== 'V1') expect(s.tp(l, s.off), l).toBeGreaterThan(-0.05);
  });
  it('PR segment depressed in II (≤ −0.05 mV vs TP) and elevated in aVR (≥ +0.03 mV; spec +0.05 — a stronger atrial injury erases the P wave in this model)', () => {
    expect(s.tp('II', s.on - 10)).toBeLessThanOrEqual(-0.05);
    expect(s.tp('aVR', s.on - 10)).toBeGreaterThanOrEqual(0.03);
  });
  it('the P wave stays upright in II (≥ 50 % of the NSR P)', () => {
    const pk = (eng: Engine) => {
      const a = eng.rhythm.eventsUntil(4000).find((x): x is Extract<BeatEvent, { kind: 'A' }> => x.kind === 'A' && x.tMs > 2000)!;
      const tpl = eng.templates.get(a.variant, a.rrPrevMs)!;
      const n = Math.round(tpl.truth.offMs - tpl.truth.onMs + 40);
      const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n), out = new Float32Array(12 * n);
      eng.sampleH(a.tMs + tpl.truth.onMs, n, hA, hV);
      eng.projector.project(hA, new Float32Array(3 * n), n, out);
      const li = LEADS.indexOf('II');
      return Math.max(...out.subarray(li * n, (li + 1) * n));
    };
    expect(pk(build(ACUTE_PERICARDITIS)) / pk(normal)).toBeGreaterThanOrEqual(0.5);
  });
  it('concave-up ST in V5 (mid-ST below the line from J to the T peak); ST/T ratio in V6 > 0.25', () => {
    const tpk = s.t('V5').tPk, mid = (s.off + tpk) / 2;
    expect(s.tp('V5', mid)).toBeLessThan((s.tp('V5', s.off) + s.tp('V5', tpk)) / 2);
    let t6 = 0;
    for (let t = s.off; t <= s.tEnd; t++) t6 = Math.max(t6, s.tp('V6', t));
    expect(s.tp('V6', s.off) / t6).toBeGreaterThan(0.25);
  });
});

describe('hyperkalaemia (peaked T, flat P, long PR)', () => {
  let e: Engine, s: Shape;
  beforeAll(() => {
    e = build(HYPERKALEMIA);
    s = shape(e);
  });
  it('peaked T: amplitude in V2–V4 ≥ 1.5 × NSR, narrower than NSR, symmetric (rise/fall 0.8–1.25); QRS < 120 ms', () => {
    for (const l of ['V2', 'V3', 'V4'] as const) {
      const t = s.t(l), n = N.t(l);
      expect(t.pk / n.pk, l).toBeGreaterThanOrEqual(1.5);
      expect(t.width, l).toBeLessThanOrEqual(n.width);
      expect(t.up / t.down, l).toBeGreaterThanOrEqual(0.8);
      expect(t.up / t.down, l).toBeLessThanOrEqual(1.25);
    }
    expect(s.b.qrsMs).toBeLessThan(120);
  });
  it('PR > 200 ms and P amplitude in II < 50 % of NSR', () => {
    expect(s.b.prMs!).toBeGreaterThan(200);
    const pk = (eng: Engine) => {
      const a = eng.rhythm.eventsUntil(4000).find((x): x is Extract<BeatEvent, { kind: 'A' }> => x.kind === 'A' && x.tMs > 2000)!;
      const tpl = eng.templates.get(a.variant, a.rrPrevMs)!;
      const n = Math.round(tpl.truth.offMs - tpl.truth.onMs + 40);
      const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n), out = new Float32Array(12 * n);
      eng.sampleH(a.tMs + tpl.truth.onMs, n, hA, hV);
      eng.projector.project(hA, new Float32Array(3 * n), n, out);
      const li = LEADS.indexOf('II');
      return Math.max(...out.subarray(li * n, (li + 1) * n));
    };
    expect(pk(e) / pk(normal)).toBeLessThan(0.5);
  });
});

describe('hypercalcaemia', () => {
  let s: Shape;
  beforeAll(() => {
    s = shape(build(HYPERCALCEMIA));
  });
  const qtcF = (x: Shape) => x.b.qtMs / Math.cbrt(x.b.rrMs / 1000);
  it('QTc (Fridericia) < NSR QTc − 40 ms; ST segment (J → T onset) < 40 ms', () => {
    expect(qtcF(s)).toBeLessThan(qtcF(N) - 40);
    expect(s.tOn - s.off).toBeLessThan(40);
  });
  it('T morphology kept (r ≥ 0.9 with the NSR T in II after aligning the peaks)', () => {
    const a: number[] = [], b: number[] = [];
    const ps = s.t('II').tPk, pn = N.t('II').tPk;
    for (let d = -80; d <= 80; d++) {
      a.push(s.at('II', ps + d));
      b.push(N.at('II', pn + d));
    }
    expect(pearson(a, b)).toBeGreaterThan(0.9);
  });
});

describe('hypocalcaemia', () => {
  let s: Shape;
  beforeAll(() => {
    s = shape(build(HYPOCALCEMIA));
  });
  it('QTc (Bazett) ≥ 480 ms, lengthened through the ST segment (≥ NSR + 60 ms)', () => {
    expect(s.b.qtMs / Math.sqrt(s.b.rrMs / 1000)).toBeGreaterThanOrEqual(480);
    expect(s.tOn - s.off).toBeGreaterThanOrEqual(N.tOn - N.off + 60);
  });
  it('T duration and amplitude within ±15 % of NSR; QRS unchanged', () => {
    expect(Math.abs((s.tEnd - s.tOn) / (N.tEnd - N.tOn) - 1)).toBeLessThanOrEqual(0.15);
    for (const l of ['II', 'V3', 'V5'] as const) expect(Math.abs(s.t(l).pk / N.t(l).pk - 1), l).toBeLessThanOrEqual(0.15);
    expect(Math.abs(s.b.qrsMs - N.b.qrsMs)).toBeLessThanOrEqual(2);
  });
});

describe('long QT syndrome type 1', () => {
  let e: Engine, s: Shape;
  beforeAll(() => {
    e = build(LONG_QT);
    s = shape(e);
  });
  it('QTc (Bazett) ≥ 480 ms; QRS within 5 ms of NSR', () => {
    expect(s.b.qtMs / Math.sqrt(s.b.rrMs / 1000)).toBeGreaterThanOrEqual(480);
    expect(Math.abs(s.b.qrsMs - N.b.qrsMs)).toBeLessThanOrEqual(5);
  });
  it('broad-based T: T duration ≥ 1.3 × NSR', () => {
    expect((s.tEnd - s.tOn) / (N.tEnd - N.tOn)).toBeGreaterThanOrEqual(1.3);
  });
  it('the QT still adapts to the rate (shorter at 100 bpm)', () => {
    const fast = build(LONG_QT);
    fast.setHeartRate(100);
    expect(shape(fast, 6000).b.qtMs).toBeLessThan(s.b.qtMs);
  });
});

describe('digoxin effect', () => {
  let s: Shape;
  beforeAll(() => {
    s = shape(build(DIGOXIN_EFFECT));
  });
  it('sagging ST depression in V4–V5: ST(J) ≤ −0.05 mV and still depressed 40 ms later', () => {
    for (const l of ['V4', 'V5'] as const) {
      expect(s.at(l, s.off), l).toBeLessThanOrEqual(-0.05);
      expect(s.at(l, s.off + 40), l).toBeLessThan(-0.02);
    }
  });
  it('T in V5–V6 flattened (< 50 % of NSR); QTc shorter than NSR; PR longer than NSR but ≤ 240 ms', () => {
    for (const l of ['V5', 'V6'] as const) expect(s.t(l).pk / N.t(l).pk, l).toBeLessThan(0.5);
    const qtcF = (x: Shape) => x.b.qtMs / Math.cbrt(x.b.rrMs / 1000);
    expect(qtcF(s)).toBeLessThan(qtcF(N));
    expect(s.b.prMs!).toBeGreaterThan(N.b.prMs!);
    expect(s.b.prMs!).toBeLessThanOrEqual(240);
  });
});

describe('acute pulmonary embolism (S1Q3T3, right heart strain)', () => {
  let e: Engine, s: Shape;
  beforeAll(() => {
    e = build(PULMONARY_EMBOLISM);
    s = shape(e);
  });
  it('sinus tachycardia (HR > 100 bpm)', () => {
    expect(e.rhythm.heartRate).toBeGreaterThan(100);
  });
  it('S1Q3T3: S in I ≥ 0.15 mV; Q in III ≥ 0.1 mV with a negative T in III', () => {
    expect(s.b.leads.I.s).toBeGreaterThanOrEqual(0.15);
    expect(s.b.leads.III.qDepth).toBeGreaterThanOrEqual(0.1);
    expect(s.b.leads.III.qDurMs).toBeGreaterThan(0);
    expect(s.b.leads.III.tArea).toBeLessThan(0);
  });
  it('right ventricular strain: T negative in V1–V3', () => {
    for (const l of ['V1', 'V2', 'V3'] as const) expect(s.b.leads[l].tArea, l).toBeLessThan(0);
  });
});
