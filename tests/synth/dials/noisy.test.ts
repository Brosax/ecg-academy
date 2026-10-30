/**
 * T6 noise robustness (DECISION §8.2) of the 'noisy' difficulty: diagnostic filter + respiratory wander 0.3 mV, EMG
 * 0.02 mV and 50 Hz mains on the electrodes.
 *  - Every scenario: the truth (the answer key) is exactly the truth of the clean recording — noise is a recording
 *    matter (the artefact findings baseline-wander / muscle-tremor / ac-interference may be added).
 *  - The tracing stays readable: read through a reader's filter (zero-phase 0.67–40 Hz, 50 Hz notch, median
 *    baseline), the oracle stays within HR ±3 bpm, PR / QRS ±15 ms, QT ±20 ms, axis ±10° in ≥ 90 % of 20 seeds and
 *    the hallmark criteria pass in ≥ 90 % — on the scenarios whose waves the clean-signal delineator can still separate
 *    under noise. Known limit (src/synth/README.md): the delineator is not noise-robust for flutter, fibrillation,
 *    VT, LBBB rate detection, Brugada and pre-excitation; those are covered by the truth-invariance check only.
 */
import { describe, expect, it } from 'vitest';
import type { LeadSignals } from '../../../src/core/ecg';
import { STD_LEADS } from '../../../src/core/leads';
import { generate, scenarios, type SynthResult } from '../../../src/synth';
import { applyFilter } from '../../../src/synth/chain/filters';
import { measure } from '../oracle/measure';
import { t3Failures } from '../oracle/tiers';

const ARTEFACTS = ['baseline-wander', 'muscle-tremor', 'ac-interference'];
const strip = (r: SynthResult): string => JSON.stringify({ ...r.ecg.truth!, findings: r.ecg.truth!.findings.filter((f) => !ARTEFACTS.includes(f)) });
const angle = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);

function readerView(L: LeadSignals, fs: number): LeadSignals {
  const spec = { highpassHz: 0.67, lowpassHz: 40, notchHz: 50, phase: 'zero' } as const;
  return Object.fromEntries(STD_LEADS.map((l) => [l, Float32Array.from(applyFilter(Float64Array.from(L[l]), spec, fs))])) as unknown as LeadSignals;
}

describe('noisy difficulty: the truth is the clean recording\'s', () => {
  it('every scenario and variant, seed 1', () => {
    const bad: string[] = [];
    for (const d of scenarios()) for (const v of [undefined, ...Object.keys(d.variants ?? {})]) {
      const req = { scenario: d.id, variant: v, seed: 1 };
      if (strip(generate(req)) !== strip(generate({ ...req, difficulty: 'noisy' }))) bad.push(v ? `${d.id}--${v}` : d.id);
    }
    expect(bad).toEqual([]);
  }, 300_000);
});

describe('noisy difficulty: readable through a reader filter (T6)', () => {
  for (const id of ['normal', 'rbbb', 'stemi-anterior', 'hyperkalemia', 'pericarditis', 'lvh']) {
    it(`${id} × seeds 1–20`, () => {
      const def = scenarios().find((d) => d.id === id)!;
      let gateFails = 0, critFails = 0;
      const msgs: string[] = [];
      for (let seed = 1; seed <= 20; seed++) {
        const r = generate({ scenario: id, seed, difficulty: 'noisy' });
        const L = readerView(r.ecg.signal.leads, r.ecg.signal.fs);
        const m = measure(L, r.ecg.signal.fs, { baseline: 'median' });
        const t = r.ecg.truth!;
        const f: string[] = [];
        const chk = (n: string, a: number | null, b: number | null, g: number, ang = false): void => {
          if (a === null) return;
          if (b === null || !Number.isFinite(b)) return void f.push(`${n} not measurable`);
          if ((ang ? angle(a, b) : Math.abs(a - b)) > g) f.push(`${n} ${a.toFixed(1)} vs ${b.toFixed(1)}`);
        };
        chk('HR', t.hrBpm, m.hrBpm, 3);
        chk('PR', t.prMs, m.prMs, 15);
        chk('QRS', t.qrsMs, m.qrsMs, 15);
        chk('QT', t.qtMs, m.qtMs, 20);
        chk('axis', t.axisDeg.qrs, m.axisDeg, 10, true);
        if (f.length) {
          gateFails++;
          msgs.push(`seed ${seed}: ${f.join(', ')}`);
        }
        const c = t3Failures({ ...r, ecg: { ...r.ecg, signal: { ...r.ecg.signal, leads: L } } }, def, undefined).filter((x) => !x.startsWith('[generic'));
        if (c.length) {
          critFails++;
          msgs.push(`seed ${seed}: ${c.join(' ; ')}`);
        }
      }
      expect(gateFails, msgs.join('\n')).toBeLessThanOrEqual(2);
      expect(critFails, msgs.join('\n')).toBeLessThanOrEqual(2);
    }, 120_000);
  }
});
