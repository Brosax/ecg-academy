/**
 * Group 'technical' (DECISION §9.12). Every scenario runs through the global tiers (T1–T3 — T2 on the noise-free twin
 * of an artefact scenario —, T7, catalogue); this file adds what those tiers cannot see:
 *  - the artefacts never change the truth, and the declared artefact finding is reported;
 *  - T6 noise robustness: the artefact scenarios and the 'noisy' difficulty, read by the oracle through a reader's
 *    filter (zero-phase 0.67–40 Hz + 50 Hz notch, median baseline), stay within HR ±3 bpm, PR / QRS ±15 ms, QT ±20 ms,
 *    axis ±10° of the truth;
 *  - contrasts on the same heart: Mason–Likar vs standard limb electrodes; LA/RA reversal vs dextrocardia.
 */
import { describe, expect, it } from 'vitest';
import type { LeadSignals } from '../../../src/core/ecg';
import { STD_LEADS } from '../../../src/core/leads';
import { FILTER_PRESETS, scenarios, type SynthResult } from '../../../src/synth';
import { SILENT_NOISE } from '../../../src/synth/chain/chain';
import { applyFilter } from '../../../src/synth/chain/filters';
import { TECHNICAL_SCENARIOS } from '../../../src/synth/catalogue/technical';
import { gen } from '../helpers';
import { TECHNICAL_CRITERIA } from '../oracle/criteria/technical';
import { measure, type Measurement } from '../oracle/measure';

const angle = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);

describe('technical catalogue', () => {
  it('every technical scenario is registered in group technical with its criteria', () => {
    const reg = new Set(scenarios({ group: 'technical' }).map((d) => d.id));
    expect([...reg].sort()).toEqual(TECHNICAL_SCENARIOS.map((d) => d.id).sort());
    for (const d of TECHNICAL_SCENARIOS) expect(TECHNICAL_CRITERIA[d.id], d.id).toBeDefined();
  });

  it('every reversal is the same heart recorded differently: intervals and rhythm truth equal the standard recording', () => {
    const ref = gen({ scenario: 'electrode-reversal-la-ra', seed: 2, recording: { placement: { limbs: { RA: 'RA', LA: 'LA' } } } }).ecg.truth!;
    for (const d of TECHNICAL_SCENARIOS) {
      const t = gen({ scenario: d.id, seed: 2 }).ecg.truth!;
      expect([t.hrBpm, t.prMs, t.qrsMs, t.qtMs], d.id).toEqual([ref.hrBpm, ref.prMs, ref.qrsMs, ref.qtMs]);
    }
  });
});

/** Truth vs oracle with the given gates; `m` measured by the caller. */
function gateFails(r: SynthResult, m: Measurement, g: { hr: number; pr: number; qrs: number; qt: number; axis: number }): string[] {
  const t = r.ecg.truth!;
  const out: string[] = [];
  const chk = (n: string, truth: number | null, o: number | null, gate: number, ang = false): void => {
    if (truth === null) return;
    if (o === null || !Number.isFinite(o)) return void out.push(`${n}: not measurable`);
    const d = ang ? angle(o, truth) : Math.abs(o - truth);
    if (d > gate) out.push(`${n}: truth ${truth.toFixed(1)} oracle ${o.toFixed(1)}`);
  };
  chk('HR', t.hrBpm, m.hrBpm, g.hr);
  chk('PR', t.prMs, m.prMs, g.pr);
  chk('QRS', t.qrsMs, m.qrsMs, g.qrs);
  chk('QT', t.qtMs, m.qtMs, g.qt);
  chk('axis', t.axisDeg.qrs, m.axisDeg, g.axis, true);
  return out;
}

/** The reader's filter for a noisy tracing: zero-phase 0.67–40 Hz with a 50 Hz notch. */
function readerView(L: LeadSignals, fs: number): LeadSignals {
  const spec = { highpassHz: 0.67, lowpassHz: 40, notchHz: 50, phase: 'zero' } as const;
  return Object.fromEntries(STD_LEADS.map((l) => [l, Float32Array.from(applyFilter(Float64Array.from(L[l]), spec, fs))])) as unknown as LeadSignals;
}

describe('artefacts are a recording matter', () => {
  for (const def of TECHNICAL_SCENARIOS.filter((d) => d.recording?.noise)) {
    it(`${def.id}: the truth equals the noise-free twin's and lists the declared findings × seeds 1–5`, () => {
      const fails: string[] = [];
      for (let seed = 1; seed <= 5; seed++) {
        const twin = gen({ scenario: def.id, seed, recording: { noise: SILENT_NOISE } });
        const noisy = gen({ scenario: def.id, seed });
        const strip = (r: SynthResult): string => JSON.stringify({ ...r.ecg.truth!, findings: [] });
        if (strip(noisy) !== strip(twin)) fails.push(`seed ${seed}: truth changed by the artefacts`);
        for (const f of def.findings) if (!noisy.ecg.truth!.findings.includes(f)) fails.push(`seed ${seed}: declared finding ${f} missing`);
      }
      expect(fails).toEqual([]);
    });
  }
});

describe('T6 noise robustness (reader filter + oracle)', () => {
  const T6 = { hr: 3, pr: 15, qrs: 15, qt: 20, axis: 10 } as const;
  // the rest-tremor mimic is in-band (5 Hz) on purpose: it is read in its spared lead (I), checked by its own criteria
  const noisy = TECHNICAL_SCENARIOS.filter((d) => d.recording?.noise && d.id !== 'muscle-tremor-parkinsonian');
  for (const def of noisy) {
    it(`${def.id} × seeds 1–5`, () => {
      const fails: string[] = [];
      for (let seed = 1; seed <= 5; seed++) {
        const r = gen({ scenario: def.id, seed });
        const m = measure(readerView(r.ecg.signal.leads, r.ecg.signal.fs), r.ecg.signal.fs, { baseline: 'median' });
        fails.push(...gateFails(r, m, T6).map((f) => `seed ${seed} ${f}`));
      }
      expect(fails).toEqual([]);
    });
  }
  // the 'noisy' difficulty over the catalogue: tests/synth/dials/noisy.test.ts
  for (const scenario of ['normal', 'stemi-anterior'] as const) {
    it(`difficulty 'noisy' on ${scenario} × seeds 1–5`, () => {
      const fails: string[] = [];
      for (let seed = 1; seed <= 5; seed++) {
        const r = gen({ scenario, seed, difficulty: 'noisy' });
        const m = measure(readerView(r.ecg.signal.leads, r.ecg.signal.fs), r.ecg.signal.fs, { baseline: 'median' });
        fails.push(...gateFails(r, m, T6).map((f) => `seed ${seed} ${f}`));
      }
      expect(fails).toEqual([]);
    });
  }
});

describe('contrasts on the same heart', () => {
  it('Mason–Likar vs standard limb electrodes: taller inferior R (≥ 10 % in II and aVF), axis not shifted leftward', () => {
    for (const seed of [1, 2, 3]) {
      const a = measure(gen({ scenario: 'limbs-on-torso', seed, recording: { placement: { limbsOnTorso: false } } }).ecg.signal.leads, 500);
      const b = measure(gen({ scenario: 'limbs-on-torso', seed }).ecg.signal.leads, 500);
      for (const l of ['II', 'aVF'] as const) expect(b.feats[l].r, `seed ${seed} ${l}`).toBeGreaterThan(1.1 * a.feats[l].r);
      expect(b.axisDeg - a.axisDeg, `seed ${seed}`).toBeGreaterThanOrEqual(-2);
    }
  });
  it('LA/RA reversal vs dextrocardia: both invert lead I, only dextrocardia reverses the chest R progression', () => {
    const rev = measure(gen({ scenario: 'electrode-reversal-la-ra', seed: 1 }).ecg.signal.leads, 500);
    expect(rev.feats.I.net).toBeLessThan(0);
    expect(rev.feats.V5.r).toBeGreaterThan(rev.feats.V1.r);
    if (!scenarios().some((d) => d.id === 'dextrocardia')) return; // synth-morph scenario
    const dex = measure(gen({ scenario: 'dextrocardia', seed: 1 }).ecg.signal.leads, 500);
    expect(dex.feats.I.net).toBeLessThan(0);
    expect(dex.feats.V5.r).toBeLessThan(dex.feats.V1.r + 0.3);
  });
});

describe('monitor filter on a technical heart is a recording change only', () => {
  it('the delivered ECG changes, the truth does not', () => {
    const a = gen({ scenario: 'precordial-misplacement', seed: 1 });
    const b = gen({ scenario: 'precordial-misplacement', seed: 1, recording: { filter: FILTER_PRESETS.monitor } });
    expect(JSON.stringify(b.ecg.truth)).toBe(JSON.stringify(a.ecg.truth));
    expect(b.ecg.signal.leads.V2).not.toEqual(a.ecg.signal.leads.V2);
  });
});
