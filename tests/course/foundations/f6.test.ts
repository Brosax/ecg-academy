import { describe, expect, it } from 'vitest';
import type { EcgSignal } from '../../../src/core/ecg';
import { HOOKUPS } from '../../../src/figures/scenes/cable-swap.math';
import { displaySamples, inspectRecording } from '../../../src/course/foundations/f6.math';

function signal(): EcgSignal {
  const n = 1200;
  const I = Float32Array.from({ length: n }, (_, i) => Math.sin(i * .04));
  const II = Float32Array.from({ length: n }, (_, i) => .6 * Math.sin(i * .04) + .3 * Math.cos(i * .06));
  return { fs: 250, durationMs: n * 4, leads: {
    I, II, III: Float32Array.from(I, (v, i) => II[i] - v),
    aVR: Float32Array.from(I, (v, i) => -(v + II[i]) / 2),
    aVL: Float32Array.from(I, (v, i) => v - II[i] / 2),
    aVF: Float32Array.from(II, (v, i) => v - I[i] / 2),
    V1: I.slice(), V2: I.slice(), V3: I.slice(), V4: II.slice(), V5: II.slice(), V6: II.slice(),
  } };
}

describe('foundations recording fault experiments', () => {
  it('swaps electrode potentials, inverting I while preserving chest leads and record duration', () => {
    const ecg = signal(); const original = inspectRecording(ecg, HOOKUPS.correct); const swapped = inspectRecording(ecg, HOOKUPS.laRa);
    expect(original.durationMs).toBe(2400);
    for (let i = 0; i < original.leads.I.length; i++) {
      expect(swapped.leads.I[i]).toBeCloseTo(-original.leads.I[i], 6);
      expect(swapped.leads.V1[i]).toBe(original.leads.V1[i]);
      expect(swapped.leads.II[i]).toBeCloseTo(swapped.leads.I[i] + swapped.leads.III[i], 6);
    }
  });
  it('LL noise spares I, affects II and III equally, and preserves all lead identities', () => {
    const ecg = signal(); const clean = inspectRecording(ecg, HOOKUPS.correct);
    const noisy = inspectRecording(ecg, HOOKUPS.correct, { electrode: 'LL', type: 'tremor', amplitude: .22 });
    let changed = false;
    for (let i = 0; i < clean.leads.I.length; i++) {
      expect(noisy.leads.I[i]).toBeCloseTo(clean.leads.I[i], 6);
      const deltaII = noisy.leads.II[i] - clean.leads.II[i];
      const deltaIII = noisy.leads.III[i] - clean.leads.III[i];
      expect(deltaII).toBeCloseTo(deltaIII, 6);
      expect(noisy.leads.II[i]).toBeCloseTo(noisy.leads.I[i] + noisy.leads.III[i], 6);
      expect(noisy.leads.aVR[i] + noisy.leads.aVL[i] + noisy.leads.aVF[i]).toBeCloseTo(0, 6);
      changed ||= Math.abs(deltaII) > .01;
    }
    expect(changed).toBe(true);
  });
  it('zero amplitude restores the clean signal and drawing preserves extrema', () => {
    const ecg = signal(); const clean = inspectRecording(ecg, HOOKUPS.correct);
    const zero = inspectRecording(ecg, HOOKUPS.correct, { electrode: 'RA', type: 'wander', amplitude: 0 });
    for (const id of ['I', 'II', 'V1'] as const) {
      for (let i = 0; i < clean.leads[id].length; i++) expect(zero.leads[id][i]).toBeCloseTo(clean.leads[id][i], 6);
      const drawn = displaySamples(clean, id, 80);
      expect(Math.max(...drawn)).toBe(Math.max(...clean.leads[id]));
      expect(Math.min(...drawn)).toBe(Math.min(...clean.leads[id]));
    }
  });
});
