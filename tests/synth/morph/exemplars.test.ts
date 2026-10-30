/**
 * Teaching exemplars after the 2026-10-29 lesson review (docs/review/defects-2026-10-29.md, section B and A2/A6/A14/
 * A16): each test measures, with the independent oracle (or the truth where the item is a truth item), the criterion
 * the lessons teach on the exemplar that teaches it. Thresholds: docs/curriculum/criteria.md (current values). The T3
 * hallmarks in tests/synth/oracle/criteria/* carry the per-scenario criteria on seeds 1–3; this file adds what needs
 * the supplemental leads, comparisons between scenarios, engine-level rules and more seeds.
 */
import { describe, expect, it } from 'vitest';
import type { StdLead } from '../../../src/core/leads';
import { STD_LEADS } from '../../../src/core/leads';
import { generate, scenarios, type SynthRequest } from '../../../src/synth';
import { massNormal } from '../../../src/synth/heart/anatomy';
import { resolveWhere } from '../../../src/synth/heart/territories';
import { posteriorFar } from '../../../src/synth/morph/injury';
import { deriveFindings, type LeadAmps } from '../../../src/synth/truth/findings';
import { measure, type Measurement } from '../oracle/measure';

const SEEDS = [1, 2, 3, 4, 5];

function wired(req: SynthRequest): { leads: Readonly<Record<string, Float32Array>>; m: Measurement; fs: number; truth: NonNullable<ReturnType<typeof generate>['ecg']['truth']> } {
  const r = generate(req);
  return { leads: r.ecg.signal.leads as unknown as Readonly<Record<string, Float32Array>>, m: measure(r.ecg.signal.leads, r.ecg.signal.fs), fs: r.ecg.signal.fs, truth: r.ecg.truth! };
}

/** J-point level (mV, against the PR segment) of any recorded lead, averaged over the oracle's dominant beats. */
function jOf(w: ReturnType<typeof wired>, lead: string, afterJMs = 0): number {
  const x = w.leads[lead];
  const k = (ms: number): number => Math.round((ms * w.fs) / 1000);
  let s = 0;
  for (const b of w.m.dominant) {
    const pr = (x[b.qrsOn - k(30)] + x[b.qrsOn - k(20)] + x[b.qrsOn - k(10)]) / 3;
    s += x[b.qrsOff + k(afterJMs)] - pr;
  }
  return s / w.m.dominant.length;
}

/** Mean level (mV, against the PR segment) of the last third of the T wave (J + 40 ms → truth T end, last 20 ms
 *  excluded) of the middle beat: positive when the T ends upright. */
function terminalT(w: ReturnType<typeof wired>, lead: string): number {
  const b = w.truth.beats[Math.floor(w.truth.beats.length / 2)];
  const x = w.leads[lead];
  const at = (ms: number): number => x[Math.round((ms * w.fs) / 1000)];
  const pr = (at(b.qrsOn - 30) + at(b.qrsOn - 20) + at(b.qrsOn - 10)) / 3;
  const a = b.j + 40, z = b.tOff;
  let s = 0, n = 0;
  for (let t = a + (2 * (z - a)) / 3; t <= z - 20; t += 2) {
    s += at(t) - pr;
    n++;
  }
  return s / Math.max(1, n);
}
/** Ginzton's ST/T ratio in a lead (oracle J level over the T peak, both against the PR segment). */
const stOverT = (m: Measurement, l: StdLead): number => m.feats[l].j / Math.max(1e-6, m.feats[l].t);

const qrsAmp = (m: Measurement, l: StdLead): number => Math.max(m.feats[l].r, m.feats[l].r2, -m.feats[l].s, -m.feats[l].q);
const tOverQrs = (m: Measurement, l: StdLead): number => m.feats[l].tMax / Math.max(1e-6, qrsAmp(m, l));
const mm = (mv: number): number => mv * 10;

describe('ischaemia exemplars (B11–B21)', () => {
  it('B11 isolated posterior STEMI: V7–V9 ≥ 0.5 mm, maximal ST↓ in V1–V3, lateral leads < 0.5 mm (0.6 mm tolerance), upright terminal T', () => {
    for (const seed of SEEDS) {
      const w = wired({ scenario: 'stemi-posterior', variant: 'isolated', seed, extraLeads: ['V7', 'V8', 'V9'] });
      const back = (['V7', 'V8', 'V9'] as const).map((l) => jOf(w, l));
      const msg = `seed ${seed}: V7–V9 ${back.map((v) => v.toFixed(2)).join(' ')}; ${STD_LEADS.map((l) => `${l} ${w.m.feats[l].j.toFixed(2)}`).join(' ')}`;
      expect(back.every((v) => v >= 0.05), msg).toBe(true);
      for (const l of ['V1', 'V2', 'V3'] as const) expect(w.m.feats[l].j, msg).toBeLessThanOrEqual(-0.1);
      for (const l of ['I', 'aVL', 'V5'] as const) expect(Math.abs(w.m.feats[l].j), msg).toBeLessThanOrEqual(0.06);
      expect(Math.abs(w.m.feats.V6.j), msg).toBeLessThan(0.1);
      for (const l of ['II', 'III', 'aVF'] as const) expect(w.m.feats[l].j, msg).toBeLessThan(0.05);
      // the mirror ends in an upright T (2026-10-29 B11): T peak ≥ 1 mm in V1–V3, above the ST depth in V2–V3, and the
      // terminal third of the T above the baseline in V1
      for (const l of ['V1', 'V2', 'V3'] as const) expect(w.m.feats[l].tMax, `${msg} T ${l}`).toBeGreaterThanOrEqual(0.1);
      for (const l of ['V2', 'V3'] as const) expect(w.m.feats[l].tMax, `${msg} T ${l}`).toBeGreaterThanOrEqual(-w.m.feats[l].tMin);
      expect(terminalT(w, 'V1'), `${msg} terminal T V1`).toBeGreaterThanOrEqual(0.04);
      expect(w.truth.findings).toContain('stemi-posterior');
      expect(w.truth.findings).not.toContain('stemi-lateral');
    }
  });

  it('B11 posterolateral (base): the lateral injury reaches V5–V6 (≥ 0.1 mV in V6) and V1–V3 keep the mirror depression with an upright T in V2', () => {
    for (const seed of [1, 2, 3]) {
      const w = wired({ scenario: 'stemi-posterior', seed, extraLeads: ['V7', 'V8', 'V9'] });
      const msg = `seed ${seed}: ${STD_LEADS.map((l) => `${l} ${w.m.feats[l].j.toFixed(2)}`).join(' ')}`;
      expect(w.m.feats.V6.j, msg).toBeGreaterThanOrEqual(0.1);
      expect(Math.min(w.m.feats.V1.j, w.m.feats.V2.j), msg).toBeLessThanOrEqual(-0.1);
      expect(w.m.feats.V2.tMax, msg).toBeGreaterThanOrEqual(0.1);
      for (const l of ['V1', 'V2', 'V3'] as const) expect(w.m.feats[l].tMax, `${msg} T ${l}`).toBeGreaterThanOrEqual(0.1);
      for (const l of ['V2', 'V3'] as const) expect(w.m.feats[l].tMax, `${msg} T ${l}`).toBeGreaterThanOrEqual(-w.m.feats[l].tMin);
      expect(terminalT(w, 'V1'), `${msg} terminal T V1`).toBeGreaterThanOrEqual(0.04);
      expect((['V7', 'V8', 'V9'] as const).every((l) => jOf(w, l) >= 0.05), msg).toBe(true);
    }
  });

  it('B11 rule: only a posterobasal injury (normal facing the back) is rendered eccentric; every other catalogue injury keeps far = 1', () => {
    const posterior = new Set(['stemi-posterior', 'stemi-inferior', 'sgarbossa']);
    for (const d of scenarios()) {
      const sets = [d.source.injury ?? [], ...Object.values(d.variants ?? {}).map((v) => (v.patch.injury ?? []) as typeof d.source.injury)];
      for (const set of sets) for (const s of set ?? []) {
        if (s.layer === 'epicardial') continue;
        const far = posteriorFar(massNormal(resolveWhere(s.where)));
        if (!posterior.has(d.id)) expect(far, `${d.id} ${JSON.stringify(s.where)}`).toBe(1);
      }
    }
    expect(posteriorFar(massNormal(['lv-basal-inferolateral']))).toBe(0);
  });

  it('B13 / A16 culprit facts of stemi-inferior name the LCx for the lcx variant (II ≥ III, V5–V6 ST↑) and the RCA otherwise (III > II)', () => {
    const d = scenarios().find((x) => x.id === 'stemi-inferior')!;
    expect(d.facts?.culprit).toMatch(/lcx variant: LCx/);
    for (const seed of [1, 2, 3]) {
      const lcx = wired({ scenario: 'stemi-inferior', variant: 'lcx', seed });
      expect(lcx.m.feats.II.j, `lcx seed ${seed}`).toBeGreaterThanOrEqual(lcx.m.feats.III.j);
      const post = wired({ scenario: 'stemi-inferior', variant: 'posterior', seed });
      expect(post.m.feats.III.j, `posterior seed ${seed}`).toBeGreaterThan(post.m.feats.II.j);
    }
  });

  it('B14 first-diagonal STEMI ("South African flag"): ST↑ ≥ 1 mm in I, aVL, V2; V2 the precordial maximum, V3 lower, V4 < 1 mm; ST↓ III, aVF; V5–V6 below 1 mm', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'stemi-high-lateral', seed });
      const j = (l: StdLead): number => m.feats[l].j;
      const msg = `seed ${seed}: ${STD_LEADS.map((l) => `${l} ${j(l).toFixed(2)}`).join(' ')}`;
      expect(j('aVL'), msg).toBeGreaterThanOrEqual(0.1);
      expect(j('I'), msg).toBeGreaterThanOrEqual(0.1);
      expect(j('V2'), msg).toBeGreaterThanOrEqual(0.1);
      // V1 and V2 share the maximum (the anteroseptal share faces both): V2 within 0.02 mV of V1, above V3–V6
      expect(j('V2'), msg).toBeGreaterThanOrEqual(j('V1') - 0.02);
      for (const l of ['V3', 'V4', 'V5', 'V6'] as const) expect(j(l), msg).toBeLessThan(j('V2'));
      expect(j('V4'), msg).toBeLessThan(0.1);
      expect(j('III'), msg).toBeLessThanOrEqual(-0.1);
      expect(j('aVF'), msg).toBeLessThanOrEqual(-0.1);
      expect(Math.max(j('V5'), j('V6')), msg).toBeLessThan(0.1);
    }
  });

  it('B15 lateral STEMI: ST↑ ≈ 1 mm in I and aVL with V5–V6 ≥ 1 mm and the reciprocal depression inferior (III, aVF)', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'stemi-lateral', seed });
      const j = (l: StdLead): number => m.feats[l].j;
      const msg = `seed ${seed}: ${STD_LEADS.map((l) => `${l} ${j(l).toFixed(2)}`).join(' ')}`;
      expect(Math.min(j('I'), j('aVL')), msg).toBeGreaterThanOrEqual(0.09);
      expect(Math.min(j('V5'), j('V6')), msg).toBeGreaterThanOrEqual(0.1);
      expect(j('III'), msg).toBeLessThanOrEqual(-0.05);
      expect(j('aVF'), msg).toBeLessThan(0);
    }
  });

  it('B16 anteroseptal STEMI (woman): V1–V3 meet the thresholds (V2–V3 ≥ 1.5 mm, V1 ≥ 1 mm) with clear margins', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'stemi-anteroseptal', seed });
      expect(m.feats.V1.j, `seed ${seed}`).toBeGreaterThanOrEqual(0.12);
      expect(Math.min(m.feats.V2.j, m.feats.V3.j), `seed ${seed}`).toBeGreaterThanOrEqual(0.18);
    }
  });

  it('B17 proportionality: the subtle anterior occlusion has a bulkier T relative to the QRS in V2–V3 than early repolarisation', () => {
    for (const seed of [1, 2, 3]) {
      const sub = wired({ scenario: 'stemi-anterior-subtle', seed }).m;
      const erp = wired({ scenario: 'early-repolarization', seed }).m;
      for (const l of ['V2', 'V3'] as const) {
        expect(tOverQrs(sub, l), `seed ${seed} ${l}: subtle ${tOverQrs(sub, l).toFixed(2)} vs ERP ${tOverQrs(erp, l).toFixed(2)}`).toBeGreaterThanOrEqual(tOverQrs(erp, l) + 0.25);
        expect(tOverQrs(sub, l)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('B18 Wellens type B: deep (≥ 5 mm), symmetric T inversion in V2–V3 without an upright part; type A stays biphasic', () => {
    for (const seed of SEEDS) {
      const b = wired({ scenario: 'wellens', variant: 'b', seed }).m;
      for (const l of ['V2', 'V3'] as const) {
        expect(b.feats[l].tMin, `B seed ${seed} ${l}`).toBeLessThanOrEqual(-0.5);
        expect(b.feats[l].tMax, `B seed ${seed} ${l}`).toBeLessThan(0.1);
      }
      const a = wired({ scenario: 'wellens', seed }).m;
      expect(a.feats.V3.tMax > 0.05 && a.feats.V3.tMin < -0.02, `A seed ${seed} V3 ${a.feats.V3.tMin.toFixed(2)}/${a.feats.V3.tMax.toFixed(2)}`).toBe(true);
    }
  });

  it('B19 late takotsubo: deep (≥ 5 mm in V4–V5), widespread T inversion and QTc_F > 470 ms', () => {
    for (const seed of SEEDS) {
      const w = wired({ scenario: 'takotsubo', variant: 'late', seed });
      for (const l of ['V4', 'V5'] as const) expect(w.m.feats[l].tMin, `seed ${seed} ${l}`).toBeLessThanOrEqual(-0.5);
      expect((['V3', 'V6', 'I', 'II', 'aVF'] as const).every((l) => w.m.feats[l].tMin <= -0.2), `seed ${seed}`).toBe(true);
      expect(w.truth.qtcFridericiaMs).toBeGreaterThan(470);
      expect(w.truth.findings).toContain('long-qt');
    }
  });

  it('B20 Smith-modified Sgarbossa variant is clean: ST/S ≤ −0.25 in V2 and V3, no concordant ST elevation or depression', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'sgarbossa', variant: 'smith', seed });
      for (const l of ['V2', 'V3'] as const) expect(m.feats[l].j / m.feats[l].s, `seed ${seed} ${l}`).toBeLessThanOrEqual(-0.25);
      const up = STD_LEADS.filter((l) => m.feats[l].net > 0.1 && m.feats[l].j >= 0.1);
      const down = (['V1', 'V2', 'V3'] as const).filter((l) => m.feats[l].j <= -0.1);
      expect([...up, ...down], `seed ${seed}`).toEqual([]);
    }
  });

  it('B21 concordant-depression variant isolates Sgarbossa criterion 2: ST↓ ≥ 1 mm in V1–V3 and no concordant ST elevation', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'sgarbossa', variant: 'concordant-depression', seed });
      expect(Math.min(m.feats.V2.j, m.feats.V3.j), `seed ${seed}`).toBeLessThanOrEqual(-0.1);
      expect(STD_LEADS.filter((l) => m.feats[l].net > 0.1 && m.feats[l].j >= 0.1), `seed ${seed}`).toEqual([]);
    }
  });
});

describe('chamber exemplars (B3–B10)', () => {
  it('B4 LVH (man): Sokolow–Lyon > 35 mm, Cornell > 28 mm and Peguero–Lo Presti ≥ 28 mm, on the signal and in the truth facts', () => {
    for (const id of ['lvh', 'lvh-strain']) {
      for (const seed of SEEDS) {
        const w = wired({ scenario: id, seed });
        const F = w.m.feats;
        const sok = mm(-F.V1.s + Math.max(F.V5.r, F.V6.r));
        const corn = mm(F.aVL.r - F.V3.s);
        const peg = mm(-Math.min(...STD_LEADS.map((l) => F[l].s)) - F.V4.s);
        const msg = `${id} seed ${seed}: Sokolow ${sok.toFixed(1)} Cornell ${corn.toFixed(1)} Peguero ${peg.toFixed(1)}`;
        expect(sok, msg).toBeGreaterThan(35);
        expect(corn, msg).toBeGreaterThan(28);
        expect(peg, msg).toBeGreaterThanOrEqual(28);
        expect(w.truth.facts.lvhVoltageCriteria, msg).toBe('sokolow-lyon cornell peguero-lo-presti');
        expect(w.m.axisDeg, msg).toBeGreaterThan(-30);
      }
    }
  });

  it('B5 LVH with strain: down-sloping ST↓ and asymmetric T inversion in V5–V6 and I / aVL', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'lvh-strain', seed });
      for (const l of ['V5', 'V6'] as const) {
        expect(m.feats[l].st60, `seed ${seed} ${l}`).toBeLessThan(m.feats[l].j);
        expect(m.feats[l].t, `seed ${seed} ${l}`).toBeLessThanOrEqual(-0.1);
      }
      expect(Math.min(m.feats.I.tMin, m.feats.aVL.tMin), `seed ${seed}`).toBeLessThanOrEqual(-0.15);
    }
  });

  it('B6 RVH: axis ≥ +110°, S ≥ 7 mm in V5 or V6, R in aVR; the strain variant adds ST↓ in V1–V2', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'rvh', seed });
      expect(m.axisDeg, `seed ${seed}`).toBeGreaterThanOrEqual(110);
      expect(Math.min(m.feats.V5.s, m.feats.V6.s), `seed ${seed}`).toBeLessThanOrEqual(-0.7);
      expect(m.feats.aVR.r, `seed ${seed}`).toBeGreaterThanOrEqual(0.2);
      const s = wired({ scenario: 'rvh', variant: 'strain', seed }).m;
      for (const l of ['V1', 'V2'] as const) expect(s.feats[l].st60, `strain seed ${seed} ${l}`).toBeLessThanOrEqual(-0.05);
    }
  });

  it('B7 COPD: lower limb-lead voltage (I, aVR, aVL < 5 mm; every limb lead < 7 mm), tall P, rightward axis, poor R', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'copd-pattern', seed });
      expect((['I', 'aVR', 'aVL'] as const).every((l) => m.feats[l].p2p < 0.5), `seed ${seed}`).toBe(true);
      expect(['I', 'II', 'III', 'aVR', 'aVL', 'aVF'].every((l) => m.feats[l as StdLead].p2p < 0.7), `seed ${seed}`).toBe(true);
      expect(m.axisDeg).toBeGreaterThan(90);
      expect(m.feats.V3.r).toBeLessThan(0.5);
    }
  });

  it('B8 biventricular hypertrophy: LVH voltage (Cornell, Peguero) with the RV signs and the LV force reaching V6', () => {
    for (const seed of SEEDS) {
      const w = wired({ scenario: 'biventricular-hypertrophy', seed });
      const F = w.m.feats;
      expect(w.truth.facts.lvhVoltageCriteria).toContain('cornell');
      expect(w.m.axisDeg, `seed ${seed}`).toBeGreaterThan(90);
      expect(F.V1.r, `seed ${seed}`).toBeGreaterThanOrEqual(-F.V1.s);
      expect(F.V6.r, `seed ${seed}`).toBeGreaterThanOrEqual(1.2);
      expect(Math.min(F.V5.s, F.V6.s), `seed ${seed}`).toBeLessThanOrEqual(-0.5);
    }
  });

  it('B10 electrical alternans: the QRS alternates (≥ 10 %) in ≥ 3 limb leads and ≥ 4 chest leads', () => {
    const r = generate({ scenario: 'electrical-alternans', seed: 1 });
    const t = r.ecg.truth!;
    const fs = r.ecg.signal.fs;
    const alternating = STD_LEADS.filter((l) => {
      const x = r.ecg.signal.leads[l];
      const a = t.beats.slice(1, -1).map((b) => {
        let lo = Infinity, hi = -Infinity;
        for (let ms = b.qrsOn; ms <= b.qrsOff; ms += 2) {
          const v = x[Math.round((ms * fs) / 1000)];
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        return hi - lo;
      });
      const mean = a.reduce((p, q) => p + q, 0) / a.length;
      const d = a.slice(1).map((v, i) => Math.abs(v - a[i]));
      return d.reduce((p, q) => p + q, 0) / d.length / mean >= 0.1;
    });
    expect(alternating.filter((l) => !l.startsWith('V')).length, alternating.join(' ')).toBeGreaterThanOrEqual(3);
    expect(alternating.filter((l) => l.startsWith('V')).length, alternating.join(' ')).toBeGreaterThanOrEqual(4);
  });
});

describe('conduction and repolarisation exemplars (B1, B2, B22–B30)', () => {
  it('B1 complete RBBB: rsR′ in V1 — the s between r and R′ dips ≥ 1 mm below the baseline', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'rbbb', seed });
      const x = m.median.V1;
      const peaks: number[] = [];
      for (let i = m.medianOn + 1; i < m.medianOff; i++) if (x[i] > x[i - 1] && x[i] >= x[i + 1] && x[i] >= 0.05) peaks.push(i);
      expect(peaks.length, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      let s = Infinity;
      for (let i = peaks[0]; i <= peaks[peaks.length - 1]; i++) s = Math.min(s, x[i]);
      expect(s, `seed ${seed}`).toBeLessThanOrEqual(-0.1);
    }
  });

  it('B2 nonspecific IVCD: QRS ≥ 110 ms with septal q in I and V6, R-peak time < 60 ms in V5 or V6 (not LBBB), no R′ in V1 (not RBBB)', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'ivcd', seed });
      expect(m.qrsMs, `seed ${seed}`).toBeGreaterThanOrEqual(110);
      expect(Math.max(m.feats.I.q, m.feats.V6.q), `seed ${seed}`).toBeLessThanOrEqual(-0.04);
      expect(Math.min(m.feats.V5.rPeakMs, m.feats.V6.rPeakMs), `seed ${seed}`).toBeLessThan(60);
      expect(m.feats.V1.r2, `seed ${seed}`).toBeLessThan(0.05);
    }
  });

  it('B22 long-QT variants take the qtc dial (the bifid LQT2 / drug T ends at the requested QTc) and no rate patch', () => {
    const def = scenarios().find((d) => d.id === 'long-qt')!;
    for (const v of ['lqt2', 'lqt3', 'drug']) {
      const patch = def.variants![v].patch;
      expect(patch.repol?.qtcMs, v).toBeUndefined();
      expect(patch.rhythm, v).toBeUndefined();
      for (const q of [500, 540]) {
        const r = generate({ scenario: 'long-qt', variant: v, seed: 1, dials: { qtc: q } });
        expect(r.applied.qtc, `${v} ${q}`).toBe(q);
        expect(Math.abs(r.ecg.truth!.qtcFridericiaMs - q), `${v} ${q}: truth ${r.ecg.truth!.qtcFridericiaMs.toFixed(0)}`).toBeLessThanOrEqual(8);
        const m = measure(r.ecg.signal.leads, r.ecg.signal.fs);
        expect(Math.abs((m.qtMs ?? 0) - r.ecg.truth!.qtMs), `${v} ${q}: oracle QT ${m.qtMs} vs truth ${r.ecg.truth!.qtMs.toFixed(0)}`).toBeLessThanOrEqual(15);
      }
    }
  });

  it('B23 apical HCM: giant T inversion (≥ 10 mm) in each of V3, V4, V5', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'apical-hcm', seed });
      for (const l of ['V3', 'V4', 'V5'] as const) expect(m.feats[l].tMin, `seed ${seed} ${l}`).toBeLessThanOrEqual(-1.0);
    }
  });

  it('B27 digoxin effect: sagging ST ≈ 1 mm (≥ 0.7 mm) in V5–V6, visible in II, and a short QT (QTc_F < 390 ms)', () => {
    for (const seed of SEEDS) {
      const w = wired({ scenario: 'digoxin-effect', seed });
      for (const l of ['V5', 'V6'] as const) expect(w.m.feats[l].st60, `seed ${seed} ${l}`).toBeLessThanOrEqual(-0.07);
      expect(w.m.feats.II.st60, `seed ${seed} II`).toBeLessThanOrEqual(-0.02);
      expect(w.truth.qtcFridericiaMs).toBeLessThan(390);
    }
  });

  it('B28 hypothermia: the Osborn wave is a dome after the R, read as part of the QRS (truth and oracle agree within 8 ms)', () => {
    for (const seed of SEEDS) {
      const w = wired({ scenario: 'hypothermia', seed });
      const humps = (['II', 'aVF', 'V3', 'V4', 'V5', 'V6'] as const).filter((l) => w.m.feats[l].r2 >= 0.1);
      expect(humps.length, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      expect(w.truth.qrsMs, `seed ${seed}`).toBeGreaterThanOrEqual(125);
      expect(Math.abs(w.m.qrsMs - w.truth.qrsMs), `seed ${seed}: oracle ${w.m.qrsMs} truth ${w.truth.qrsMs}`).toBeLessThanOrEqual(8);
    }
    // the early-repolarisation notch (amp ≤ 0.3) keeps its width: the dome is proportional to the cold, not global
    const erp = generate({ scenario: 'early-repolarization', seed: 1 }).ecg.truth!;
    expect(erp.qrsMs).toBeLessThan(110);
  });

  it('B17 / A1 early repolarisation: V6 ST/T < 0.22 (not pericarditis) on seeds 1–5 and at both ends of the st dial; Jp ≥ 1 mm in II, aVF, V4, V5; T upright in I, II, V2–V6', () => {
    const def = scenarios().find((d) => d.id === 'early-repolarization')!;
    for (const seed of SEEDS) {
      for (const st of [undefined, def.dials.st!.min, def.dials.st!.max]) {
        const { m } = wired({ scenario: 'early-repolarization', seed, ...(st !== undefined ? { dials: { st } } : {}) });
        expect(stOverT(m, 'V6'), `seed ${seed} st ${st}: V6 J ${m.feats.V6.j.toFixed(3)} T ${m.feats.V6.t.toFixed(3)}`).toBeLessThan(0.22);
      }
      const { m } = wired({ scenario: 'early-repolarization', seed });
      for (const l of ['II', 'aVF', 'V4', 'V5'] as const) expect(Math.max(m.feats[l].j, m.feats[l].r2 > 0 && m.qrsMs - m.feats[l].rPeakMs <= 40 ? m.feats[l].r2 : 0), `seed ${seed} Jp ${l}`).toBeGreaterThanOrEqual(0.1);
      for (const l of ['I', 'II', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(m.feats[l].t, `seed ${seed} T ${l}`).toBeGreaterThan(0.1);
    }
  });

  it('A1 athlete (training-related early repolarisation): V6 ST/T < 0.22 on seeds 1–5', () => {
    for (const seed of SEEDS) {
      const { m } = wired({ scenario: 'athlete', seed });
      expect(stOverT(m, 'V6'), `seed ${seed}: V6 J ${m.feats.V6.j.toFixed(3)} T ${m.feats.V6.t.toFixed(3)}`).toBeLessThan(0.22);
    }
  });

  it('A2 the early-repolarisation st dial moves every share: II and V5–V6 J rise with the dial, not only V2', () => {
    const def = scenarios().find((d) => d.id === 'early-repolarization')!;
    for (const seed of [1, 2]) {
      const lo = wired({ scenario: 'early-repolarization', seed, dials: { st: def.dials.st!.min } }).m;
      const hi = wired({ scenario: 'early-repolarization', seed, dials: { st: def.dials.st!.max } }).m;
      for (const l of ['V2', 'II', 'V5', 'V6'] as const) expect(hi.feats[l].j - lo.feats[l].j, `seed ${seed} ${l}: ${lo.feats[l].j.toFixed(3)} → ${hi.feats[l].j.toFixed(3)}`).toBeGreaterThanOrEqual(0.04);
    }
  });

  it('A6 pericarditis: in II the ST elevation (J+60 vs TP) clearly exceeds the PR depression; V6 ST/T ≥ 0.25', () => {
    for (const seed of SEEDS) {
      const w = wired({ scenario: 'pericarditis', seed });
      const b = w.truth.beats[Math.floor(w.truth.beats.length / 2)];
      const x = w.leads.II;
      const at = (ms: number): number => x[Math.round((ms * w.fs) / 1000)];
      const tp = at(b.pOn! - 40);
      const st = at(b.j + 60) - tp;
      const pr = at((b.pOff! + b.qrsOn) / 2) - tp;
      expect(st, `seed ${seed}: ST ${st.toFixed(3)} PR ${pr.toFixed(3)}`).toBeGreaterThanOrEqual(0.14);
      expect(st, `seed ${seed}: ST ${st.toFixed(3)} PR ${pr.toFixed(3)}`).toBeGreaterThanOrEqual(-pr + 0.04);
      expect(stOverT(w.m, 'V6'), `seed ${seed}`).toBeGreaterThanOrEqual(0.25);
    }
  });

  it('B30 pericarditis: PR depression ≥ 1 mm in II against the TP level', () => {
    for (const seed of SEEDS) {
      const w = wired({ scenario: 'pericarditis', seed });
      const x = w.leads.II;
      const k = (ms: number): number => Math.round((ms * w.fs) / 1000);
      let d = 0;
      for (const b of w.m.dominant) {
        const tp = x[(b.pOn ?? b.qrsOn - k(200)) - k(30)];
        d += x[b.qrsOn - k(12)] - tp;
      }
      expect(d / w.m.dominant.length, `seed ${seed}`).toBeLessThanOrEqual(-0.1);
    }
  });
});

describe('derived findings (A6)', () => {
  it('no short-qt in atrial fibrillation at normal QT values (seeds 624, 625 of the review): the per-beat QTcF is graded', () => {
    for (const seed of [624, 625, 1, 2, 3]) {
      const t = generate({ scenario: 'atrial-fibrillation', seed }).ecg.truth!;
      expect(t.findings, `seed ${seed} QTcF ${t.qtcFridericiaMs.toFixed(0)}`).not.toContain('short-qt');
    }
    // the graded QTc of an irregular rhythm is the mean per-beat QTcF over the strip (criteria.md qtc-bazett: "in AF
    // average over about 10 beats"): seed 624 reports a median-QT / mean-RR QTcF below 390 yet grades normal
    const t624 = generate({ scenario: 'atrial-fibrillation', seed: 624 }).ecg.truth!;
    expect(t624.qtcFridericiaMs).toBeLessThan(390);
    // a QTcF graded short is short in any rhythm (no AF exclusion in deriveFindings)
    const amps = Object.fromEntries(STD_LEADS.map((l) => [l, { r: 1, s: -0.5 }])) as Record<StdLead, LeadAmps>;
    const base = { declared: [], hrBpm: 90, ppRangeMs: null, prMs: null, qrsMs: 90, qtcFridericiaMs: 385, axisDeg: 40, amps, sex: 'male' as const, ventricularRhythm: false };
    expect(deriveFindings({ ...base, rhythm: 'atrial-fibrillation' })).toContain('short-qt');
    expect(deriveFindings({ ...base, rhythm: 'sinus-rhythm', prMs: 150 })).toContain('short-qt');
    // above 100/min a borderline QTcF (≤ 390) is a rate-correction artefact: only the short-QT-syndrome limit (≤ 360)
    // is derived (README truth section)
    expect(deriveFindings({ ...base, hrBpm: 110, rhythm: 'atrial-fibrillation' })).not.toContain('short-qt');
    expect(deriveFindings({ ...base, hrBpm: 108, rhythm: 'atrial-tachycardia', prMs: 160 })).not.toContain('short-qt');
    expect(deriveFindings({ ...base, hrBpm: 110, qtcFridericiaMs: 350, rhythm: 'atrial-fibrillation' })).toContain('short-qt');
  });

  it('narrow-tachy#0 (atrial tachycardia 108/min, QTcF ≈ 389 ms) carries no short-qt; the short-qt scenario keeps it', () => {
    const at = generate({ scenario: 'atrial-tachycardia', seed: 2005756232, dials: {}, difficulty: 'classic' }).ecg.truth!;
    expect(at.findings).not.toContain('short-qt');
    for (const seed of [1, 2, 3]) expect(generate({ scenario: 'short-qt', seed }).ecg.truth!.findings).toContain('short-qt');
  });
});
