/**
 * Batch 3, I_to notch diseases (src/sim/scenarios/batch3/apNotch.ts) on the realistic HRA heart, against the
 * test_oracle lines of docs/research/disease-spec.json, measured in model-truth windows (truthMeasure.ts):
 * J point = truth QRS offset, baseline = PR level at QRS onset.
 * Left out (listed in the report): Brugada "high-ICS config: ST(J) in V1/V2 greater than at 4th ICS" — the lead model
 * has Dower lead vectors for the standard electrode positions only, so there is no 2nd/3rd-intercostal V1/V2.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Engine } from '../../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import { BRUGADA_TYPE_1, HYPOTHERMIA, HYPOTHERMIA_TEMPS, hypothermia } from '../../../../src/lab/sim/scenarios/batch3/apNotch';
import { NORMAL_SCENARIO } from '../../../../src/lab/sim/scenarios/normal';
import { selectVoxels } from '../../../../src/lab/sim/scenarios/tissue';
import type { Scenario } from '../../../../src/lab/sim/scenarios/types';
import type { GeometryBundle, LeadName } from '../../../../src/lab/sim/types';
import { LEADS } from '../../../../src/lab/sim/types';
import { pearson } from '../linalg';
import type { Shape } from '../truthMeasure';
import { beatShape as shape, qrsOf } from '../truthMeasure';

const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);
let geo: GeometryBundle;
let normal: Engine;
let N: Shape;

const build = (sc: Scenario) => buildEngineSync(geo, undefined, { scenario: sc });
/** The same scenario without its notch: the notch's own contribution is the difference (the synthesis is linear). */
const withoutNotch = (sc: Scenario): Scenario => ({ ...sc, tissue: { ...sc.tissue, notch: [] } });
const stJ = (s: Shape, l: LeadName) => s.at(l, s.off);

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  normal = build(NORMAL_SCENARIO);
  N = shape(normal);
});

describe('Brugada pattern type 1 (coved)', () => {
  let s: Shape, ctl: Shape, lead: LeadName;
  beforeAll(() => {
    s = shape(build(BRUGADA_TYPE_1));
    ctl = shape(build(withoutNotch(BRUGADA_TYPE_1)));
    lead = stJ(s, 'V2') >= stJ(s, 'V1') ? 'V2' : 'V1';
    console.log('Brugada ST(J): ' + LEADS.map((l) => `${l} ${stJ(s, l).toFixed(2)}`).join(' · '));
  });

  it('ST(J) ≥ 0.2 mV in V1 or V2', () => {
    expect(Math.max(stJ(s, 'V1'), stJ(s, 'V2'))).toBeGreaterThanOrEqual(0.2);
  });

  it('coved: in that lead the ST descends from J to the T nadir without a trough-then-rise (5-ms mean, tolerance 0.01 mV), and the T wave is net negative', () => {
    let tMin = s.off;
    for (let t = s.off; t <= s.tEnd; t++) if (s.at(lead, t) < s.at(lead, tMin)) tMin = t;
    const sm = (t: number) => (s.at(lead, t - 2) + s.at(lead, t - 1) + s.at(lead, t) + s.at(lead, t + 1) + s.at(lead, t + 2)) / 5;
    let lo = sm(s.off), rise = 0;
    for (let t = s.off; t <= tMin; t++) {
      lo = Math.min(lo, sm(t));
      rise = Math.max(rise, sm(t) - lo);
    }
    let area = 0;
    for (let t = s.tOn; t <= s.tEnd; t++) area += s.at(lead, t);
    console.log(`Brugada ${lead}: J ${stJ(s, lead).toFixed(2)} → nadir ${s.at(lead, tMin).toFixed(2)} mV at J+${tMin - s.off} ms, largest rise ${rise.toFixed(3)} mV, T area ${area.toFixed(0)} mV·ms`);
    expect(tMin - s.off).toBeGreaterThan(60); // the nadir is the T wave, not the end of the QRS
    expect(rise).toBeLessThan(0.01);
    expect(s.at(lead, tMin)).toBeLessThan(-0.1);
    expect(area).toBeLessThan(0);
    // V1 shows the same coved pattern
    expect(stJ(s, 'V1')).toBeGreaterThan(0.15);
    expect(s.t('V1').pk).toBeLessThan(0);
  });

  it('|ST(J)| < 0.1 mV in I, II, V4, V5, V6 (changes confined to the right precordial leads)', () => {
    for (const l of ['I', 'II', 'V4', 'V5', 'V6'] as const) expect(Math.abs(stJ(s, l)), l).toBeLessThan(0.1);
  });

  it('QRS < 120 ms; depolarization unchanged (QRS within 2 ms of NSR, correlation in V5 ≥ 0.95)', () => {
    expect(s.b.qrsMs).toBeLessThan(120);
    expect(Math.abs(s.b.qrsMs - N.b.qrsMs)).toBeLessThanOrEqual(2);
    expect(pearson(qrsOf(normal, s, 'V5'), qrsOf(normal, N, 'V5'))).toBeGreaterThan(0.95);
  });

  it('mechanism: the J elevation is the RV epicardial notch (≈ 0 without it); the negative T is the delayed RV epicardial repolarization, read from the shared APD field', () => {
    for (const l of ['V1', 'V2'] as const) {
      expect(Math.abs(stJ(ctl, l) - stJ(N, l)), l).toBeLessThan(0.05);
      expect(stJ(s, l) - stJ(ctl, l), l).toBeGreaterThan(0.15);
    }
    const e = build(BRUGADA_TYPE_1);
    const rvot = selectVoxels(geo.grid, { regions: ['RVOT'], layer: 'epicardial' });
    const endo = selectVoxels(geo.grid, { regions: ['RVOT'], layer: 'subendocardial' });
    const d = (v: number) => e.fields.apd.apdRefMs[v] - normal.fields.apd.apdRefMs[v];
    expect(d(rvot[0])).toBeCloseTo(60, 3);
    expect(d(endo[0])).toBe(0);
  });
});

describe('hypothermia (Osborn J waves)', () => {
  let s: Shape, ctl: Shape;
  beforeAll(() => {
    s = shape(build(HYPOTHERMIA));
    ctl = shape(build(withoutNotch(HYPOTHERMIA)));
    console.log(`hypothermia 30 °C: HR ${(60000 / s.b.rrMs).toFixed(0)} PR ${s.b.prMs?.toFixed(0)} QRS ${s.b.qrsMs.toFixed(0)} QT ${s.b.qtMs.toFixed(0)} | J: ` +
      LEADS.map((l) => `${l} ${stJ(s, l).toFixed(2)} (notch ${(stJ(s, l) - stJ(ctl, l)).toFixed(2)})`).join(' · '));
  });

  it('HR < 60 bpm (sinus bradycardia)', () => {
    expect(60000 / s.b.rrMs).toBeLessThan(60);
  });

  it('PR, QRS and QT each greater than the NSR values', () => {
    expect(s.b.prMs!).toBeGreaterThan(N.b.prMs!);
    expect(s.b.qrsMs).toBeGreaterThan(N.b.qrsMs);
    expect(s.b.qtMs).toBeGreaterThan(N.b.qtMs);
  });

  it('J-point positive deflection ≥ 0.1 mV in ≥ 2 of II, V3, V4, V5, V6 (moderate, 30 °C), and it is the notch (≥ 0.1 mV above the notch-free twin)', () => {
    const ok = (['II', 'V3', 'V4', 'V5', 'V6'] as const).filter((l) => stJ(s, l) >= 0.1 && stJ(s, l) - stJ(ctl, l) >= 0.1);
    expect(ok.length).toBeGreaterThanOrEqual(2);
  });

  it('J deflection negative in aVR (and in V1)', () => {
    expect(stJ(s, 'aVR')).toBeLessThan(0);
    expect(stJ(s, 'aVR') - stJ(ctl, 'aVR')).toBeLessThan(-0.05);
    expect(stJ(s, 'V1') - stJ(ctl, 'V1')).toBeLessThan(-0.05);
  });

  it('J-wave amplitude increases monotonically as the configured temperature falls (35 → 32 → 29 → 26 °C; builder hypothermia(tempC))', () => {
    const amp = [35, 32, 29, 26].map((T) => {
      const sc = hypothermia(T);
      const a = shape(build(sc)), c = shape(build(withoutNotch(sc)));
      const leads = ['V4', 'V5', 'V6'] as const;
      return {
        T,
        raw: leads.reduce((x, l) => x + stJ(a, l), 0) / 3,
        notch: leads.reduce((x, l) => x + stJ(a, l) - stJ(c, l), 0) / 3,
      };
    });
    console.log('hypothermia J (mean V4–V6, mV): ' + amp.map((x) => `${x.T} °C raw ${x.raw.toFixed(3)} notch ${x.notch.toFixed(3)}`).join(' · '));
    for (let i = 1; i < amp.length; i++) {
      expect(amp[i].notch).toBeGreaterThan(amp[i - 1].notch);
      expect(amp[i].raw).toBeGreaterThan(amp[i - 1].raw);
    }
    expect(HYPOTHERMIA_TEMPS.moderate).toBe(30);
  });
});
