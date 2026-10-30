/**
 * Recording-chain artefacts and the chain's order of operations (DECISION §6.9): artefacts live on electrodes, so a lead
 * shows one only through the electrodes it uses ("finding the faulty electrode", criteria.md "Technical artefacts");
 * the mains common mode cancels and only the contact imbalance reaches the leads; every process has its own seeded
 * stream; a recording without noise and filters is exactly the clean assembly; truth is never changed.
 */
import { describe, expect, it } from 'vitest';
import { STD_LEADS, type StdLead } from '../../../src/core/leads';
import { createRng } from '../../../src/core/rng';
import { FILTER_PRESETS, type NoiseSpec, type RecordingSpec } from '../../../src/synth';
import { ARTEFACT_VISIBLE, DEFAULT_ADC, recordingChain, recordingForDifficulty, SILENT_NOISE } from '../../../src/synth/chain/chain';
import { electrodePotentials, render } from '../../../src/synth/kernel/render';
import { assemble } from '../../../src/synth/leads/assemble';
import { STANDARD_HOOKUP } from '../../../src/synth/leads/electrodes';
import { mergePatch } from '../../../src/synth/morph/compose';
import { maxAbsDiff, p2p } from '../helpers';
import { scheduleOf } from '../leads/harness';

const s = scheduleOf({ scenario: 'normal', seed: 3 });
const phi = electrodePotentials(render(s.kV, s.fs, s.n, 0));
const clean = assemble(phi, STANDARD_HOOKUP);
const rec = (noise: NoiseSpec, extra: Partial<RecordingSpec> = {}, seed = 7) => recordingChain(phi, STANDARD_HOOKUP, { noise, ...extra }, { fs: s.fs, rng: createRng(seed) });
const diff = (a: Float32Array, b: Float32Array): Float32Array => a.map((v, i) => v - b[i]);
const rms = (x: ArrayLike<number>): number => Math.sqrt(Array.from(x).reduce((t, v) => t + v * v, 0) / x.length);
const tone = (x: ArrayLike<number>, hz: number): number => {
  let re = 0, im = 0;
  for (let i = 0; i < x.length; i++) {
    re += x[i] * Math.cos((2 * Math.PI * hz * i) / s.fs);
    im -= x[i] * Math.sin((2 * Math.PI * hz * i) / s.fs);
  }
  return (2 * Math.hypot(re, im)) / x.length;
};

describe('chain basics', () => {
  it('without noise or filters the chain is exactly the clean assembly (bit-identical)', () => {
    const out = recordingChain(phi, STANDARD_HOOKUP, undefined).leads;
    for (const l of STD_LEADS) expect(out[l]).toEqual(clean[l]);
    const silent = recordingChain(phi, STANDARD_HOOKUP, { noise: SILENT_NOISE }).leads;
    for (const l of STD_LEADS) expect(silent[l]).toEqual(clean[l]);
  });
  it('without the sampling rate the chain delivers the clean recording (generate() before the wiring)', () => {
    const out = recordingChain(phi, STANDARD_HOOKUP, { noise: { wanderMv: 0.2 }, filter: FILTER_PRESETS.monitor, gain: 2 });
    expect(out.noiseMv).toBe(0);
    expect(maxAbsDiff(out.leads.II, clean.II.map((v) => 2 * v))).toBeLessThan(1e-6);
  });
  it('a gain error scales every lead', () => {
    const out = recordingChain(phi, STANDARD_HOOKUP, { gain: 0.5 }).leads;
    expect(maxAbsDiff(out.II, clean.II.map((v) => v / 2))).toBeLessThan(1e-6);
  });
  it('the same stream gives the same artefacts; another seed another realisation', () => {
    const a = rec({ wanderMv: 0.2, emgMv: 0.03 }).leads, b = rec({ wanderMv: 0.2, emgMv: 0.03 }).leads, c = rec({ wanderMv: 0.2, emgMv: 0.03 }, {}, 8).leads;
    expect(a.V2).toEqual(b.V2);
    expect(maxAbsDiff(a.V2, c.V2)).toBeGreaterThan(0.01);
  });
  it('each process has its own stream: adding mains does not change the wander realisation', () => {
    const w = diff(rec({ wanderMv: 0.2 }).leads.V3, clean.V3);
    const wm = diff(rec({ wanderMv: 0.2, mains: { mv: 0.2, hz: 50, imbalance: 0.3 } }).leads.V3, clean.V3);
    const m = diff(rec({ mains: { mv: 0.2, hz: 50, imbalance: 0.3 } }).leads.V3, clean.V3);
    expect(maxAbsDiff(wm, w.map((v, i) => v + m[i]))).toBeLessThan(1e-5);
  });
});

describe('artefacts live on electrodes', () => {
  it('baseline wander: slow (0.1–0.5 Hz) excursion ≥ 0.2 mV in the chest leads, smaller in the limb leads', () => {
    const out = rec({ wanderMv: 0.25 });
    const n = (l: StdLead): Float32Array => diff(out.leads[l], clean[l]);
    expect(Math.max(...(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).map((l) => p2p(n(l))))).toBeGreaterThanOrEqual(0.2);
    expect(p2p(n('II'))).toBeLessThan(p2p(n('V3')));
    // no fast content: sample-to-sample steps are tiny
    let step = 0;
    const x = n('V3');
    for (let i = 1; i < x.length; i++) step = Math.max(step, Math.abs(x[i] - x[i - 1]));
    expect(step).toBeLessThan(0.002);
    expect(out.artefacts).toContain('baseline-wander');
  });
  it('EMG on the left-arm electrode: I, III and aVL noisy, II untouched, aVR and aVF at half, chest leads at a third', () => {
    const out = rec({ emgMv: 0.05, emgOn: ['LA'] });
    const r = (l: StdLead): number => rms(diff(out.leads[l], clean[l]));
    expect(out.leads.II).toEqual(clean.II);
    for (const l of ['I', 'III', 'aVL'] as const) expect(r(l), l).toBeCloseTo(0.05, 3);
    for (const l of ['aVR', 'aVF'] as const) expect(r(l), l).toBeCloseTo(0.025, 3);
    for (const l of ['V1', 'V4'] as const) expect(r(l), l).toBeCloseTo(0.05 / 3, 3);
    expect(out.artefacts).toContain('muscle-tremor');
    expect(out.noiseMv).toBeCloseTo(0.05, 3);
  });
  it('rest tremor on the left leg: a 5 Hz oscillation in II, III and aVF, none in lead I', () => {
    const out = rec({ tremor: { mv: 0.1, hz: 5, on: 'LL' } });
    expect(out.leads.I).toEqual(clean.I);
    for (const l of ['II', 'III', 'aVF'] as const) {
      const n = diff(out.leads[l], clean[l]);
      expect(tone(n, 5), l).toBeGreaterThan(Math.max(tone(n, 3), tone(n, 8)));
    }
  });
  it('mains: the common mode cancels in every lead; only the contact imbalance reaches them; the notch removes it', () => {
    const balanced = rec({ mains: { mv: 0.5, hz: 50, imbalance: 0 } }).leads;
    for (const l of STD_LEADS) expect(maxAbsDiff(balanced[l], clean[l]), l).toBeLessThan(1e-6);
    const out = rec({ mains: { mv: 0.3, hz: 50, imbalance: 0.3 } });
    const a = Math.max(...STD_LEADS.map((l) => tone(diff(out.leads[l], clean[l]), 50)));
    expect(a).toBeGreaterThan(0.02);
    expect(a).toBeLessThanOrEqual(0.3 * 0.3 * 2 + 1e-6);
    expect(out.artefacts).toContain('ac-interference');
    const notched = rec({ mains: { mv: 0.3, hz: 50, imbalance: 0.3 } }, { filter: { highpassHz: 0.05, lowpassHz: 150, notchHz: 50, phase: 'causal' } });
    const ref = recordingChain(phi, STANDARD_HOOKUP, { filter: { highpassHz: 0.05, lowpassHz: 150, notchHz: 50, phase: 'causal' } }, { fs: s.fs }).leads;
    for (const l of STD_LEADS) expect(tone(diff(notched.leads[l], ref[l]), 50), l).toBeLessThan(0.002);
    expect(notched.artefacts).not.toContain('ac-interference');
  });
  it('electrode pop on V2: a step decaying over ≈ 250 ms in V2 only', () => {
    const out = rec({ pop: { electrode: 'V2', tMs: 4000, mv: 0.8 } }).leads;
    for (const l of STD_LEADS) if (l !== 'V2') expect(out[l], l).toEqual(clean[l]);
    const n = diff(out.V2, clean.V2);
    expect(n[2000]).toBeCloseTo(0.8, 4);
    expect(n[2125]).toBeCloseTo(0.8 * Math.exp(-1), 3);
    expect(n[1999]).toBe(0);
  });
  it('motion on the right arm: broad deflections ≥ 0.5 mV in I, II and aVR inside its window only; III untouched', () => {
    const out = rec({ motion: { electrode: 'RA', tMs: 3000, durMs: 3000, mv: 0.8 } }).leads;
    expect(out.III).toEqual(clean.III);
    const n = diff(out.II, clean.II);
    expect(p2p(n.subarray(1600, 2900))).toBeGreaterThan(0.5);
    expect(p2p(n.subarray(0, 1490))).toBe(0);
    expect(p2p(n.subarray(3010))).toBe(0);
  });
  it('lead-off on the left arm: I, III, aVL saturate the recorder; II keeps the heart', () => {
    const out = rec({ leadOff: 'LA' }).leads;
    const sat = (x: Float32Array): number => x.filter((v) => Math.abs(v) >= DEFAULT_ADC.rangeMv - 1e-6).length;
    expect(sat(out.I)).toBeGreaterThan(100);
    expect(maxAbsDiff(out.II, clean.II)).toBeLessThan(0.001);
  });
});

describe('filters inside the chain', () => {
  it('the monitor preset removes wander that the diagnostic preset keeps', () => {
    const d = rec({ wanderMv: 0.3 }, { filter: FILTER_PRESETS.diagnostic });
    const m = rec({ wanderMv: 0.3 }, { filter: FILTER_PRESETS.monitor });
    expect(d.artefacts).toContain('baseline-wander');
    expect(m.noiseMv).toBeLessThan(d.noiseMv);
  });
});

describe('difficulty presets (§6.9)', () => {
  it('classic, subtle and borderline record on a clean chain (DECISION §7); noisy adds the diagnostic filter, wander, EMG and mains', () => {
    for (const d of ['classic', 'subtle', 'borderline'] as const) expect(recordingForDifficulty(d)).toEqual({});
    const noisy = recordingForDifficulty('noisy');
    expect(noisy.filter).toEqual(FILTER_PRESETS.diagnostic);
    expect(noisy.noise?.wanderMv).toBe(0.3);
    expect(noisy.noise?.emgMv).toBe(0.02);
    expect(noisy.noise?.mains?.hz).toBe(50);
  });
  it('SILENT_NOISE merged over any artefact recording switches every process off', () => {
    const r = mergePatch<RecordingSpec>({ noise: { wanderMv: 0.3, emgMv: 0.05, mains: { mv: 0.3, hz: 50, imbalance: 0.3 }, motion: { electrode: 'RA', tMs: 0, durMs: 2000, mv: 1 } } }, { noise: SILENT_NOISE });
    const out = recordingChain(phi, STANDARD_HOOKUP, r, { fs: s.fs }).leads;
    for (const l of STD_LEADS) expect(out[l]).toEqual(clean[l]);
  });
  it('visibility thresholds are the §9.12 hallmarks', () => {
    expect(ARTEFACT_VISIBLE.wanderP2p).toBe(0.2);
    expect(ARTEFACT_VISIBLE.mainsP2p).toBe(0.02);
  });
});
