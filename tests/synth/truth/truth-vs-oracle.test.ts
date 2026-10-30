/**
 * T2 truth vs signal (DECISION §8.2): every scenario (and variant) × 5 seeds, the independent oracle re-measures the
 * clean delivered ECG and must agree with the model truth: HR ±2 bpm, PR ±10 ms, QRS ±8 ms, QT ±15 ms, QRS axis ±5°,
 * P and T axes ±10°, per-beat QRS onset ±8 ms for ≥ 95 % of beats, beat count exact, visible atrial events exact,
 * ST at J+60 ±0.03 mV in every lead. Truth that the oracle cannot measure FAILS unless the scenario declares
 * `intervals: 'not-applicable'` (VF, PMVT, torsades, ventricular flutter, asystole).
 *
 * Techniques by rhythm (chosen from the scenario's declared rhythm, never from truth values): flutter — the QRS is read
 * on the F-subtracted signal (fSubtractedQrs) and the atrial rate from the sawtooth cycle; AV dissociation — P waves are
 * counted on the QRST-subtracted residual (residualPWaves); fibrillation — no countable atrial events.
 *
 * Rhythm techniques (synth-rhythm, M3; gates unchanged): scenarios declaring `intervals: 'not-applicable'` (VF,
 * polymorphic VT, ventricular flutter, asystole) are graded on their rhythm criteria (T3), not on a detected rate;
 * flutter T axis and atrial rate are read on the F-cancelled signal (cancelFlutter); the T axis is not compared where
 * atrial waves lie on most T waves (atrial tachycardia, AVRT, atypical AVNRT: no cancellation exists for a P′ that is
 * phase-locked to the QRS); a beat's own retrograde P′ counts as its P (junctional rhythm), and a P that begins before
 * the previous T end (P′ on the T, premature P′) is outside the oracle's P search and is not compared.
 */
import { describe, expect, it } from 'vitest';
import { scenarios } from '../../../src/synth';
import { SILENT_NOISE } from '../../../src/synth/chain/chain';
import { allCases, gen } from '../helpers';
import { t2Violations as violations } from '../oracle/tiers';

const SEEDS = [1, 2, 3, 4, 5];

describe('truth vs oracle (T2)', () => {
  for (const c of allCases()) {
    const def = scenarios().find((d) => d.id === c.id)!;
    const declared = c.variant ? (def.variants?.[c.variant]?.findings ?? def.findings) : def.findings;
    it(`${c.name} × seeds 1–5`, () => {
      const all: string[] = [];
      for (const seed of SEEDS) {
        // T2 reads the clean signal (DECISION §8.2): an artefact scenario (or the myopotentials of pacemaker
        // oversensing) is compared on its noise-free twin — same heart, placement and filters; the artefact itself is
        // graded by the scenario's T3 criteria and tests/synth/catalogue/technical.test.ts
        const r = gen({ scenario: c.id, variant: c.variant, seed, recording: { noise: SILENT_NOISE } });
        for (const v of violations(r, declared, def.intervals !== 'not-applicable')) all.push(`seed ${seed}: ${v}`);
      }
      expect(all).toEqual([]);
    });
  }
});
