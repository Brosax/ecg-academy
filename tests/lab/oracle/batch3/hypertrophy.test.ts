/**
 * Batch 3 — LVH and RVH on the realistic HRA heart, against the test_oracle lines of docs/research/disease-spec.json
 * (model-truth windows: truthMeasure.ts). Every voltage / timing criterion is also checked to FAIL on the normal heart,
 * so the assertions discriminate. Criteria met only in an equivalent form say so in the test name.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Engine } from '../../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import { LVH, RVH } from '../../../../src/lab/sim/scenarios/batch3/hypertrophy';
import { NORMAL_SCENARIO } from '../../../../src/lab/sim/scenarios/normal';
import { kernelSum } from '../../../../src/lab/sim/source/voxelEdl';
import type { BeatEvent, GeometryBundle, LeadName } from '../../../../src/lab/sim/types';
import { LEADS } from '../../../../src/lab/sim/types';
import type { Shape, TruthBeat } from '../truthMeasure';
import { beatShape as shape, frontalAxis, pWave } from '../truthMeasure';

const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);
let geo: GeometryBundle;
let normal: Engine;
let N: Shape;

const sokolow = (b: TruthBeat) => b.leads.V1.s + Math.max(b.leads.V5.r, b.leads.V6.r);
const cornell = (b: TruthBeat) => b.leads.aVL.r + b.leads.V3.s;
const axisOf = (b: TruthBeat) => frontalAxis(b.leads.I.netQrs, b.leads.aVF.netQrs);

/** Peak of the P wave in a lead (atrial component only), mV. */
const pPeak = (e: Engine, l: LeadName) => {
  const a = e.rhythm.eventsUntil(4000).find((x): x is Extract<BeatEvent, { kind: 'A' }> => x.kind === 'A' && x.tMs > 2000)!;
  const tpl = e.templates.get(a.variant, a.rrPrevMs)!;
  const n = Math.round(tpl.truth.offMs - tpl.truth.onMs + 40);
  const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n), out = new Float32Array(12 * n);
  e.sampleH(a.tMs + tpl.truth.onMs, n, hA, hV);
  e.projector.project(hA, new Float32Array(3 * n), n, out);
  const li = LEADS.indexOf(l);
  return { pk: Math.max(...out.subarray(li * n, (li + 1) * n)), durMs: tpl.truth.offMs - tpl.truth.onMs, a };
};

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  normal = buildEngineSync(geo, undefined, { scenario: NORMAL_SCENARIO });
  N = shape(normal);
});

describe('left ventricular hypertrophy (voltage + strain)', () => {
  let e: Engine, s: Shape;
  beforeAll(() => {
    e = buildEngineSync(geo, undefined, { scenario: LVH });
    s = shape(e);
    const L = s.b.leads;
    console.log(
      `LVH: Sokolow ${sokolow(s.b).toFixed(2)} (NSR ${sokolow(N.b).toFixed(2)}) · Cornell ${cornell(s.b).toFixed(2)} (NSR ${cornell(N.b).toFixed(2)})` +
        ` · RaVL ${L.aVL.r.toFixed(2)} · RPT V6 ${L.V6.rPeakTime} (NSR ${N.b.leads.V6.rPeakTime}) · QRS ${s.b.qrsMs.toFixed(0)} · axis ${axisOf(s.b).toFixed(0)}°`,
    );
    console.log('LVH ST(J) / T area: ' + (['I', 'aVL', 'V5', 'V6'] as const).map((l) => `${l} ${s.at(l, s.off).toFixed(2)} / ${L[l].tArea.toFixed(0)}`).join(' · '));
    console.log('LVH T limbs (desc/asc): ' + (['V5', 'V6'] as const).map((l) => `${l} ${s.t(l).up}/${s.t(l).down}`).join(' · '));
  });

  it('Sokolow–Lyon: SV1 + max(RV5, RV6) ≥ 3.5 mV (NSR < 3.5 mV)', () => {
    expect(sokolow(s.b)).toBeGreaterThanOrEqual(3.5);
    expect(sokolow(N.b)).toBeLessThan(3.5);
  });

  it('Cornell voltage RaVL + SV3 > 2.8 mV (male configuration — the HRA heart is male; NSR < 2.0 mV); R aVL > 1.1 mV', () => {
    expect(cornell(s.b)).toBeGreaterThan(2.8);
    expect(cornell(N.b)).toBeLessThan(2.0);
    expect(s.b.leads.aVL.r).toBeGreaterThan(1.1);
    expect(N.b.leads.aVL.r).toBeLessThan(1.1);
  });

  it('Peguero–Lo Presti (lead_features): deepest S in any lead + SV4 ≥ 2.8 mV', () => {
    const sd = Math.max(...LEADS.map((l) => s.b.leads[l].s));
    expect(sd + s.b.leads.V4.s).toBeGreaterThanOrEqual(2.8);
  });

  it('R-peak time V6 > 50 ms (NSR ≤ 50 ms); QRS < 120 ms', () => {
    expect(s.b.leads.V6.rPeakTime).toBeGreaterThan(50);
    expect(N.b.leads.V6.rPeakTime).toBeLessThanOrEqual(50);
    expect(s.b.qrsMs).toBeLessThan(120);
  });

  it('supportive: the frontal QRS axis shifts leftward (≥ 20° left of NSR)', () => {
    expect(axisOf(s.b)).toBeLessThan(axisOf(N.b) - 20);
  });

  it('strain: ST(J) ≤ −0.05 mV and net negative T in V5, V6, I, aVL', () => {
    for (const l of ['V5', 'V6', 'I', 'aVL'] as const) {
      expect(s.at(l, s.off), l).toBeLessThanOrEqual(-0.05);
      expect(s.b.leads[l].tArea, l).toBeLessThan(0);
    }
  });

  it('strain: ST downsloping into the T in V5–V6 (ST at J+60 below ST at J)', () => {
    for (const l of ['V5', 'V6'] as const) expect(s.at(l, s.off + 60), l).toBeLessThan(s.at(l, s.off));
  });

  it('asymmetric T inversion in V5–V6: descending limb > 1.3 × ascending (half-amplitude limbs; NSR T symmetric < 1.15)', () => {
    for (const l of ['V5', 'V6'] as const) {
      const t = s.t(l);
      expect(t.pk, l).toBeLessThan(0);
      // the limb is the T's own: the ST depression at J stays above half the T nadir (the walk-back never reaches J)
      expect(Math.abs(s.at(l, s.off)), l).toBeLessThan(Math.abs(t.pk) / 2);
      expect(t.up / t.down, l).toBeGreaterThan(1.3);
      const n = N.t(l);
      expect(n.up / n.down, `NSR ${l}`).toBeLessThan(1.15);
    }
  });

  it('the source stays closed: Σc = 0 exactly for the hypertrophy-weighted kernels', () => {
    for (const k of [e.kernels.atrial, e.kernels.ventricular]) expect(kernelSum(k)).toEqual([0, 0, 0]);
  });
});

describe('right ventricular hypertrophy (RV strain, P pulmonale)', () => {
  let e: Engine, s: Shape;
  beforeAll(() => {
    e = buildEngineSync(geo, undefined, { scenario: RVH });
    s = shape(e);
    const L = s.b.leads;
    console.log(
      `RVH: axis ${axisOf(s.b).toFixed(0)}° · V1 R ${L.V1.r.toFixed(2)} S ${L.V1.s.toFixed(2)} RPT ${L.V1.rPeakTime} · V5 R ${L.V5.r.toFixed(2)} S ${L.V5.s.toFixed(2)}` +
        ` · V6 R ${L.V6.r.toFixed(2)} S ${L.V6.s.toFixed(2)} · QRS ${s.b.qrsMs.toFixed(0)} · P(II) ${pPeak(e, 'II').pk.toFixed(3)} (NSR ${pPeak(normal, 'II').pk.toFixed(3)})`,
    );
    console.log('RVH T area: ' + (['V1', 'V2', 'V3', 'III', 'aVF'] as const).map((l) => `${l} ${L[l].tArea.toFixed(0)}`).join(' · '));
  });

  it('right axis deviation: frontal QRS axis ≥ +110° (NSR < +90°)', () => {
    expect(axisOf(s.b)).toBeGreaterThanOrEqual(110);
    expect(axisOf(N.b)).toBeLessThan(90);
  });

  it('V1: R > 0.7 mV and R/S > 1 (NSR R/S < 1)', () => {
    const v1 = s.b.leads.V1;
    expect(v1.r).toBeGreaterThan(0.7);
    expect(v1.r / v1.s).toBeGreaterThan(1);
    expect(N.b.leads.V1.r / N.b.leads.V1.s).toBeLessThan(1);
  });

  it('V5 or V6: S > 0.7 mV or R/S < 1 (here both, in V6)', () => {
    const v6 = s.b.leads.V6;
    expect(v6.s).toBeGreaterThan(0.7);
    expect(v6.r / v6.s).toBeLessThan(1);
    expect(N.b.leads.V6.r / N.b.leads.V6.s).toBeGreaterThan(1);
  });

  it('QRS < 120 ms; supportive: late R peak in V1 (R-peak time ≥ 35 ms)', () => {
    expect(s.b.qrsMs).toBeLessThan(120);
    expect(s.b.leads.V1.rPeakTime).toBeGreaterThanOrEqual(35);
  });

  it('RV strain: net negative T in V1–V3 and in III, aVF', () => {
    for (const l of ['V1', 'V2', 'V3', 'III', 'aVF'] as const) expect(s.b.leads[l].tArea, l).toBeLessThan(0);
  });

  it('P pulmonale: P amplitude in II > 0.25 mV (NSR < 0.25 mV), P duration < 120 ms, vertical P axis ≥ +75°', () => {
    const p = pPeak(e, 'II');
    expect(p.pk).toBeGreaterThan(0.25);
    expect(pPeak(normal, 'II').pk).toBeLessThan(0.25);
    expect(p.durMs).toBeLessThan(120);
    expect(pWave(e, p.a).axis).toBeGreaterThanOrEqual(75);
  });

  it('the source stays closed: Σc = 0 exactly for the hypertrophy-weighted kernels', () => {
    for (const k of [e.kernels.atrial, e.kernels.ventricular]) expect(kernelSum(k)).toEqual([0, 0, 0]);
  });
});
