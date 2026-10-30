/**
 * T1 lead system (DECISION §8.2): every scenario × 3 seeds obeys Einthoven / Goldberger on the delivered leads;
 * limb-cable permutations equal their algebraic expectation (Wilson's terminal is invariant, so the chest leads do not
 * move); a swap involving the neutral (RL) cable flattens one limb lead; chest swaps exchange traces exactly.
 */
import { describe, expect, it } from 'vitest';
import { CHEST_LEADS, STD_LEADS } from '../../../src/core/leads';
import { FILTER_PRESETS, generate, type PlacementSpec } from '../../../src/synth';
import { recordingChain } from '../../../src/synth/chain/chain';
import { applyFilter } from '../../../src/synth/chain/filters';
import { electrodePotentials, render } from '../../../src/synth/kernel/render';
import { assemble } from '../../../src/synth/leads/assemble';
import { STANDARD_HOOKUP } from '../../../src/synth/leads/electrodes';
import { allCases, gen, maxAbsDiff, p2p } from '../helpers';
import { scheduleOf } from './harness';

const TOL = 1e-6;

describe('Einthoven / Goldberger identities on the delivered leads', () => {
  for (const c of allCases()) {
    it(`${c.name} × seeds 1–3`, () => {
      for (const seed of [1, 2, 3]) {
        const L = gen({ scenario: c.id, variant: c.variant, seed }).ecg.signal.leads;
        // the leads are delivered as Float32: each stored sample carries a rounding error of ≤ ½ ulp (2⁻²⁴ relative), so
        // the identity residual is held to TOL plus the float32 rounding of the samples involved (it matters only on
        // the pacing stimuli, several mV high)
        let m = 0;
        for (let i = 0; i < L.I.length; i++) {
          const f32 = 2 ** -23 * (Math.abs(L.I[i]) + Math.abs(L.II[i]) + Math.abs(L.III[i]) + Math.abs(L.aVR[i]) + Math.abs(L.aVL[i]) + Math.abs(L.aVF[i]));
          m = Math.max(
            m,
            Math.abs(L.III[i] - (L.II[i] - L.I[i])) - f32,
            Math.abs(L.aVR[i] + (L.I[i] + L.II[i]) / 2) - f32,
            Math.abs(L.aVL[i] - (L.I[i] - L.II[i] / 2)) - f32,
            Math.abs(L.aVF[i] - (L.II[i] - L.I[i] / 2)) - f32,
          );
        }
        expect(m).toBeLessThanOrEqual(TOL);
      }
    });
  }
});

describe('cable placement', () => {
  const base = gen({ scenario: 'normal', seed: 4 }).ecg.signal.leads;
  const withPlacement = (placement: PlacementSpec) => gen({ scenario: 'normal', seed: 4, recording: { placement } }).ecg.signal.leads;

  it('LA ↔ RA: I inverted, II ↔ III, aVR ↔ aVL, aVF and chest leads unchanged', () => {
    const s = withPlacement({ limbs: { RA: 'LA', LA: 'RA' } });
    expect(maxAbsDiff(s.I, base.I.map((v) => -v))).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.II, base.III)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.III, base.II)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVR, base.aVL)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVL, base.aVR)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVF, base.aVF)).toBeLessThanOrEqual(TOL);
    for (const l of CHEST_LEADS) expect(maxAbsDiff(s[l], base[l])).toBeLessThanOrEqual(TOL);
  });

  it('LA ↔ LL: I ↔ II, III inverted, aVL ↔ aVF, aVR unchanged', () => {
    const s = withPlacement({ limbs: { LA: 'LL', LL: 'LA' } });
    expect(maxAbsDiff(s.I, base.II)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.II, base.I)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.III, base.III.map((v) => -v))).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVL, base.aVF)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVF, base.aVL)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVR, base.aVR)).toBeLessThanOrEqual(TOL);
    for (const l of CHEST_LEADS) expect(maxAbsDiff(s[l], base[l])).toBeLessThanOrEqual(TOL);
  });

  it('RA ↔ LL: II inverted, I ↔ −III, aVR ↔ aVF, aVL unchanged', () => {
    const s = withPlacement({ limbs: { RA: 'LL', LL: 'RA' } });
    expect(maxAbsDiff(s.II, base.II.map((v) => -v))).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.I, base.III.map((v) => -v))).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.III, base.I.map((v) => -v))).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVR, base.aVF)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVF, base.aVR)).toBeLessThanOrEqual(TOL);
    expect(maxAbsDiff(s.aVL, base.aVL)).toBeLessThanOrEqual(TOL);
  });

  it('a swap with the neutral cable flattens one limb lead (legs are equipotential)', () => {
    // RA cable on the right leg: II = Φ_LL − Φ_RL ≈ 0
    const s = withPlacement({ limbs: { RA: 'RL', RL: 'RA' } });
    expect(p2p(s.II)).toBeLessThan(0.05);
    expect(p2p(base.II)).toBeGreaterThan(0.5);
    // LA cable on the right leg: III = Φ_LL − Φ_RL ≈ 0
    const t = withPlacement({ limbs: { LA: 'RL', RL: 'LA' } });
    expect(p2p(t.III)).toBeLessThan(0.05);
  });

  it('chest swaps exchange traces exactly and touch nothing else', () => {
    const s = withPlacement({ chest: { V1: 'V2', V2: 'V1' } });
    expect(maxAbsDiff(s.V1, base.V2)).toBe(0);
    expect(maxAbsDiff(s.V2, base.V1)).toBe(0);
    for (const l of STD_LEADS) if (l !== 'V1' && l !== 'V2') expect(maxAbsDiff(s[l], base[l])).toBe(0);
  });

  it('a chest swap does not change the model intervals or the limb-lead axis', () => {
    const t0 = gen({ scenario: 'normal', seed: 4 }).ecg.truth!;
    const t1 = gen({ scenario: 'normal', seed: 4, recording: { placement: { chest: { V1: 'V2', V2: 'V1' } } } }).ecg.truth!;
    expect(t1.qrsMs).toBe(t0.qrsMs);
    expect(t1.axisDeg.qrs).toBe(t0.axisDeg.qrs);
  });

  // Mason–Likar moves the three limb electrodes onto the torso: the limb leads change; every chest lead changes by the
  // same waveform, the shift of Wilson's central terminal (the chest electrodes stay where they are).
  it('Mason–Likar changes the limb leads and shifts every chest lead by the same WCT waveform only', () => {
    const std = generate({ scenario: 'normal', seed: 4 }).ecg.signal.leads;
    const ml = generate({ scenario: 'normal', seed: 4, recording: { placement: { limbsOnTorso: true } } }).ecg.signal.leads;
    expect(Math.max(...(['I', 'II', 'aVF'] as const).map((l) => maxAbsDiff(ml[l], std[l])))).toBeGreaterThan(0.1);
    const dW = ml.V1.map((v, i) => v - std.V1[i]);
    for (const l of CHEST_LEADS) expect(maxAbsDiff(ml[l].map((v, i) => v - std[l][i]), dW), l).toBeLessThanOrEqual(1e-5);
    let m = 0;
    for (let i = 0; i < ml.I.length; i++) m = Math.max(m, Math.abs(ml.III[i] - (ml.II[i] - ml.I[i])), Math.abs(ml.aVF[i] - (ml.II[i] - ml.I[i] / 2)));
    expect(m).toBeLessThanOrEqual(TOL);
  });

  it('filtering the electrode potentials ≡ filtering the leads (≤ 1e-6 mV), causal and zero-phase', () => {
    const s = scheduleOf({ scenario: 'stemi-anterior', seed: 2 });
    const phi = electrodePotentials(render(s.kV, s.fs, s.n, 0));
    const clean = assemble(phi, STANDARD_HOOKUP);
    for (const filter of [FILTER_PRESETS.monitor, FILTER_PRESETS.diagnosticLinear]) {
      const out = recordingChain(phi, STANDARD_HOOKUP, { filter }, { fs: s.fs }).leads;
      for (const l of STD_LEADS) {
        const ref = applyFilter(Float64Array.from(clean[l]), filter, s.fs);
        expect(maxAbsDiff(out[l], ref), `${filter.phase} ${l}`).toBeLessThanOrEqual(1e-6);
      }
    }
  });
});
