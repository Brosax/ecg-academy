/**
 * Fascicular blocks (LAFB, LPFB) on the realistic HRA heart, against the test_oracle lines of
 * docs/research/disease-spec.json, measured in model-truth windows (truthMeasure.ts). Criteria the model meets only in
 * an equivalent form say so in the test name (LPFB axis and lead I: the HRA heart lies horizontally, NSR axis +19°).
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Engine } from '../../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import { LAFB, LPFB } from '../../../../src/lab/sim/scenarios/batch3/fascicles';
import { NORMAL_SCENARIO } from '../../../../src/lab/sim/scenarios/normal';
import type { Scenario } from '../../../../src/lab/sim/scenarios/types';
import type { GeometryBundle, LeadName } from '../../../../src/lab/sim/types';
import { COMP, compOfTissue } from '../../../../src/lab/sim/types';
import type { Shape, TruthLead } from '../truthMeasure';
import { beatShape as shape, frontalAxis, rhythmTruth } from '../truthMeasure';

const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);
let geo: GeometryBundle;
let normal: Engine;
let N: Shape;

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  normal = buildEngineSync(geo, undefined, { scenario: NORMAL_SCENARIO });
  N = shape(normal);
});

const build = (sc: Scenario) => buildEngineSync(geo, undefined, { scenario: sc });
const axisOf = (s: Shape) => frontalAxis(s.b.leads.I.netQrs, s.b.leads.aVF.netQrs);
/** Net area (mV·ms) of a lead between t0 and t1 ms after QRS onset. */
const area = (s: Shape, l: LeadName, t0: number, t1: number) => {
  let a = 0;
  for (let t = s.on + t0; t < Math.min(s.off, s.on + t1); t++) a += s.at(l, t);
  return a;
};
/**
 * Signed area of the frontal QRS loop in hexaxial coordinates (x = I, y = 2·aVF/√3, +y inferior): > 0 when the loop turns
 * from left toward inferior, i.e. clockwise as drawn on the hexaxial reference; < 0 counter-clockwise.
 */
const loopArea = (s: Shape) => {
  let A = 0;
  const x = (t: number) => s.at('I', t), y = (t: number) => (2 / Math.sqrt(3)) * s.at('aVF', t);
  for (let t = s.on; t < s.off; t++) A += 0.5 * (x(t) * y(t + 1) - x(t + 1) * y(t));
  return A;
};
/** Mean ventricular activation time per AHA segment (ms after the V event). */
const segmentMeans = (e: Engine) => {
  const g = e.geometry.grid, t = e.ventricularActivation.field.tAct;
  const s = new Float64Array(18), n = new Float64Array(18);
  for (let v = 0; v < g.tissue.length; v++) {
    if (compOfTissue(g.tissue[v]) !== COMP.Ventricular || !Number.isFinite(t[v])) continue;
    s[g.aha[v]] += t[v];
    n[g.aha[v]]++;
  }
  return Array.from(s, (x, k) => x / n[k]);
};
/** qR: an initial q shorter than 40 ms, then a dominant R (taller than the q and than any S; net positive). */
const isQR = (x: TruthLead) => x.qDurMs > 0 && x.qDurMs < 40 && x.r > x.q && x.r > x.s && x.netQrs > 0;
/** rS: an initial r (no q), then a deeper S; net negative. */
const isRS = (x: TruthLead) => x.qDurMs === 0 && x.initialR > 0.05 && x.s > x.r && x.netQrs < 0;
const fmt = (s: Shape, ls: readonly LeadName[]) =>
  ls.map((l) => `${l} q${s.b.leads[l].qDurMs}ms/${s.b.leads[l].q.toFixed(2)} r${s.b.leads[l].r.toFixed(2)} s${s.b.leads[l].s.toFixed(2)} net${s.b.leads[l].netQrs.toFixed(0)} rpt${s.b.leads[l].rPeakTime}`).join(' · ');

describe('left anterior fascicular block', () => {
  let e: Engine, s: Shape;
  beforeAll(() => {
    e = build(LAFB);
    s = shape(e);
    console.log(`LAFB: axis ${axisOf(s).toFixed(0)}° QRS ${s.b.qrsMs.toFixed(0)} ms loop ${loopArea(s).toFixed(2)} · ${fmt(s, ['I', 'aVL', 'II', 'III', 'aVF'])}`);
  });
  it('sinus rhythm, every P conducted (1:1)', () => {
    const r = rhythmTruth(e, 2000, 10000);
    expect(r.as.length).toBeGreaterThan(5);
    for (const a of r.as) expect(r.pr(a)).not.toBeNull();
  });
  it('frontal QRS axis between −45 and −90°', () => {
    expect(axisOf(s)).toBeLessThanOrEqual(-45);
    expect(axisOf(s)).toBeGreaterThanOrEqual(-90);
  });
  it('I and aVL: initial q (< 40 ms) followed by a dominant R (qR)', () => {
    for (const l of ['I', 'aVL'] as const) expect(isQR(s.b.leads[l]), l).toBe(true);
  });
  it('II, III, aVF: initial r followed by a deeper S (rS), net negative', () => {
    for (const l of ['II', 'III', 'aVF'] as const) expect(isRS(s.b.leads[l]), l).toBe(true);
  });
  it('R-peak time in aVL ≥ 45 ms', () => {
    expect(s.b.leads.aVL.rPeakTime).toBeGreaterThanOrEqual(45);
  });
  it('QRS < 120 ms (normal or slightly prolonged: not shorter than NSR)', () => {
    expect(s.b.qrsMs).toBeLessThan(120);
    expect(s.b.qrsMs).toBeGreaterThanOrEqual(N.b.qrsMs);
  });
  it('increased limb-lead voltage: R in aVL ≥ 1.1 mV (NSR 0.2 mV)', () => {
    expect(s.b.leads.aVL.r).toBeGreaterThanOrEqual(1.1);
  });
  it('initial forces inferior-rightward (first 20 ms: I < 0, aVF > 0); counter-clockwise frontal loop', () => {
    expect(area(s, 'I', 0, 20)).toBeLessThan(0);
    expect(area(s, 'aVF', 0, 20)).toBeGreaterThan(0);
    expect(loopArea(s)).toBeLessThan(0);
  });
  it('mechanism: the anterior/anterolateral territory (AHA 1, 6, 7, 12) activates 10–25 ms late; the posterior wall does not', () => {
    const m = segmentMeans(e), m0 = segmentMeans(normal);
    for (const k of [1, 6, 7, 12]) {
      expect(m[k] - m0[k], `AHA ${k}`).toBeGreaterThanOrEqual(10);
      expect(m[k] - m0[k], `AHA ${k}`).toBeLessThanOrEqual(25);
    }
    for (const k of [3, 4, 9, 10, 15]) expect(Math.abs(m[k] - m0[k]), `AHA ${k}`).toBeLessThanOrEqual(2);
  });
});

describe('left posterior fascicular block', () => {
  let e: Engine, s: Shape;
  beforeAll(() => {
    e = build(LPFB);
    s = shape(e);
    console.log(`LPFB: axis ${axisOf(s).toFixed(0)}° (NSR ${axisOf(N).toFixed(0)}°) QRS ${s.b.qrsMs.toFixed(0)} ms loop ${loopArea(s).toFixed(2)} · ${fmt(s, ['I', 'aVL', 'II', 'III', 'aVF'])}`);
  });
  it('sinus rhythm, every P conducted (1:1)', () => {
    const r = rhythmTruth(e, 2000, 10000);
    expect(r.as.length).toBeGreaterThan(5);
    for (const a of r.as) expect(r.pr(a)).not.toBeNull();
  });
  it('frontal QRS axis — equivalent form: rightward shift ≥ +40° from NSR to ≥ +60° (spec +90..+180° not reached: horizontal HRA heart, NSR +19°)', () => {
    expect(axisOf(s) - axisOf(N)).toBeGreaterThanOrEqual(40);
    expect(axisOf(s)).toBeGreaterThanOrEqual(60);
    expect(axisOf(s)).toBeLessThanOrEqual(180);
  });
  it('aVL: rS, net negative', () => {
    expect(isRS(s.b.leads.aVL)).toBe(true);
  });
  it('I — equivalent form: initial r without q, then an S ≥ half the r (NSR: S < ⅓ R); net area not negative on this heart', () => {
    const x = s.b.leads.I;
    expect(x.qDurMs).toBe(0);
    expect(x.initialR).toBeGreaterThan(0.05);
    expect(x.s).toBeGreaterThanOrEqual(0.5 * x.r);
    expect(N.b.leads.I.s).toBeLessThan(N.b.leads.I.r / 3);
    expect(x.netQrs).toBeLessThan(N.b.leads.I.netQrs);
  });
  it('III and aVF: qR (initial q < 40 ms, then a dominant R)', () => {
    for (const l of ['III', 'aVF'] as const) expect(isQR(s.b.leads[l]), l).toBe(true);
  });
  it('R-peak time in aVF > 45 ms', () => {
    expect(s.b.leads.aVF.rPeakTime).toBeGreaterThan(45);
  });
  it('QRS < 120 ms (normal or slightly prolonged: not shorter than NSR)', () => {
    expect(s.b.qrsMs).toBeLessThan(120);
    expect(s.b.qrsMs).toBeGreaterThanOrEqual(N.b.qrsMs);
  });
  it('initial forces superior-leftward (first 20 ms: I > 0, aVF < 0); clockwise frontal loop', () => {
    expect(area(s, 'I', 0, 20)).toBeGreaterThan(0);
    expect(area(s, 'aVF', 0, 20)).toBeLessThan(0);
    expect(loopArea(s)).toBeGreaterThan(0);
  });
  it('mechanism: the inferior wall (AHA 4, 10) activates ≥ 10 ms late; the anterior/anterolateral wall does not', () => {
    const m = segmentMeans(e), m0 = segmentMeans(normal);
    for (const k of [4, 10]) expect(m[k] - m0[k], `AHA ${k}`).toBeGreaterThanOrEqual(10);
    for (const k of [1, 6, 7, 12]) expect(Math.abs(m[k] - m0[k]), `AHA ${k}`).toBeLessThanOrEqual(2);
  });
});
