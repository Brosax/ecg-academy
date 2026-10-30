/**
 * Recording-chain filters (DECISION §6.9 step 3): the presets meet their nominal cut-offs, start without a transient,
 * are linear, and the causal 0.5 Hz monitor high-pass distorts the ST segment of a STEMI heart while the diagnostic
 * presets keep it (criteria.md "Recording chain — Filter bandwidth", Kligfield 2007; lesson o10). Truth never changes.
 */
import { describe, expect, it } from 'vitest';
import { FILTER_PRESETS, generate, type FilterSpec } from '../../../src/synth';
import { applyFilter, filterStages, highpass1, lowpass2, magnitude, notch } from '../../../src/synth/chain/filters';
import { measure } from '../oracle/measure';

const FS = 500;
/** Combined magnitude of a preset (zero-phase: the forward and backward passes, |H|²). */
const presetMag = (spec: FilterSpec, f: number, fs = FS): number => {
  const m = magnitude(filterStages(spec, fs), f, fs);
  return spec.phase === 'zero' ? m * m : m;
};

describe('filter design', () => {
  it('first-order high-pass and Butterworth low-pass are −3 dB at their cut-offs; the notch removes 50 Hz only', () => {
    expect(magnitude([highpass1(0.5, FS)], 0.5, FS)).toBeCloseTo(Math.SQRT1_2, 4);
    expect(magnitude([lowpass2(40, FS)], 40, FS)).toBeCloseTo(Math.SQRT1_2, 4);
    const n = [notch(50, FS)];
    expect(magnitude(n, 50, FS)).toBeLessThan(1e-6);
    expect(magnitude(n, 45, FS)).toBeGreaterThan(0.9);
    expect(magnitude(n, 10, FS)).toBeGreaterThan(0.999);
  });
  it('the presets are −3 dB at their nominal frequencies (zero-phase: both passes together)', () => {
    expect(presetMag(FILTER_PRESETS.diagnostic, 0.05)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(presetMag(FILTER_PRESETS.diagnostic, 150)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(presetMag(FILTER_PRESETS.diagnosticLinear, 0.67)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(presetMag(FILTER_PRESETS.diagnosticLinear, 150)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(presetMag(FILTER_PRESETS.monitor, 0.5)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(presetMag(FILTER_PRESETS.monitor, 40)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(presetMag(FILTER_PRESETS.monitor, 50)).toBeLessThan(0.01);
    // pass band of the diagnostic preset: flat from 1 to 40 Hz within 2 %
    for (const f of [1, 5, 10, 20, 40]) expect(Math.abs(presetMag(FILTER_PRESETS.diagnostic, f) - 1), `${f} Hz`).toBeLessThan(0.02);
  });
  it('skips a low-pass above 0.45·fs (150 Hz at 250 Hz sampling: the samples are already band-limited)', () => {
    expect(filterStages(FILTER_PRESETS.diagnostic, 250).length).toBe(1);
    expect(filterStages(FILTER_PRESETS.diagnostic, 500).length).toBe(2);
  });
});

describe('filter behaviour', () => {
  it('starts without a transient: a constant input gives 0 after a high-pass and itself after a low-pass', () => {
    const x = new Float64Array(5000).fill(0.37);
    for (const spec of Object.values(FILTER_PRESETS)) {
      const y = applyFilter(x, spec, FS);
      const want = spec.highpassHz > 0 ? 0 : 0.37;
      for (const i of [0, 1, 10, 500, 4999]) expect(Math.abs(y[i] - want), `${spec.phase} ${spec.highpassHz} @${i}`).toBeLessThan(1e-9);
    }
  });
  it('is linear (LTI over the strip, warm-up included)', () => {
    const a = Float64Array.from({ length: 3000 }, (_, i) => Math.sin(i / 37) + 0.2 * Math.cos(i / 5));
    const b = Float64Array.from({ length: 3000 }, (_, i) => (i % 400 < 40 ? 1 : 0) + 0.001 * i);
    for (const spec of Object.values(FILTER_PRESETS)) {
      const ya = applyFilter(a, spec, FS), yb = applyFilter(b, spec, FS);
      const yab = applyFilter(Float64Array.from(a, (v, i) => 2 * v - 3 * b[i]), spec, FS);
      let d = 0;
      for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(yab[i] - (2 * ya[i] - 3 * yb[i])));
      expect(d).toBeLessThan(1e-9);
    }
  });
  it('does not modify its input', () => {
    const x = Float64Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10));
    const copy = Float64Array.from(x);
    applyFilter(x, FILTER_PRESETS.monitor, FS);
    expect(x).toEqual(copy);
  });
});

describe('monitor vs diagnostic filter on the same STEMI heart (lesson o10)', () => {
  const req = { scenario: 'stemi-anterior', seed: 1 } as const;
  const raw = generate(req);
  const diag = generate({ ...req, recording: { filter: FILTER_PRESETS.diagnostic } });
  const lin = generate({ ...req, recording: { filter: FILTER_PRESETS.diagnosticLinear } });
  const mon = generate({ ...req, recording: { filter: FILTER_PRESETS.monitor } });
  const st = (r: typeof diag, l: 'V1' | 'V2' | 'V3' | 'V4' | 'V5'): number => measure(r.ecg.signal.leads, FS).feats[l].st60;

  it('the diagnostic presets keep the ST at J+60 within 0.02 mV of the unfiltered recording', () => {
    for (const r of [diag, lin]) for (const l of ['V1', 'V2', 'V3', 'V4', 'V5'] as const) expect(Math.abs(st(r, l) - st(raw, l)), l).toBeLessThan(0.02);
  });
  it('the causal 0.5 Hz monitor high-pass moves the J point / ST by ≥ 0.05 mV (false ST elevation and depression)', () => {
    const md = measure(mon.ecg.signal.leads, FS), dd = measure(diag.ecg.signal.leads, FS);
    const leads = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'I', 'II'] as const;
    const up = Math.max(...leads.map((l) => md.feats[l].j - dd.feats[l].j));
    const down = Math.min(...leads.map((l) => md.feats[l].st60 - dd.feats[l].st60));
    expect(up).toBeGreaterThanOrEqual(0.05);
    expect(down).toBeLessThanOrEqual(-0.05);
  });
  it('truth is never changed by the chain', () => {
    expect(JSON.stringify(mon.ecg.truth)).toBe(JSON.stringify(diag.ecg.truth));
  });
});
