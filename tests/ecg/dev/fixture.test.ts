import { describe, expect, it } from 'vitest';
import { sampleCount } from '../../../src/core/ecg';
import { STD_LEADS } from '../../../src/core/leads';
import { FIXTURE_PRESETS, makeFixtureEcg, type FixturePreset } from '../../../src/ecg/dev/fixture';

describe('dev fixture (one dipole source, one lead system)', () => {
  it('limb leads obey Einthoven and Goldberger exactly', () => {
    const e = makeFixtureEcg({ st: [0.05, 0.2, 0] });
    const L = e.signal.leads;
    for (let i = 0; i < L.I.length; i += 7) {
      expect(L.III[i]).toBeCloseTo(L.II[i] - L.I[i], 5);
      expect(L.aVR[i]).toBeCloseTo(-(L.I[i] + L.II[i]) / 2, 5);
      expect(L.aVL[i]).toBeCloseTo(L.I[i] - L.II[i] / 2, 5);
      expect(L.aVF[i]).toBeCloseTo(L.II[i] - L.I[i] / 2, 5);
      expect(L.I[i] + L.III[i] - L.II[i]).toBeCloseTo(0, 5);
    }
  });

  it('every lead has the declared length; extra leads on request', () => {
    const e = makeFixtureEcg({ durationMs: 8000, fs: 250, extraLeads: true });
    const n = sampleCount(e.signal);
    expect(n).toBe(2000);
    for (const l of STD_LEADS) expect(e.signal.leads[l].length).toBe(n);
    expect(e.signal.leads.V4R?.length).toBe(n);
  });

  it('truth comes from the model timing', () => {
    const e = makeFixtureEcg({ hrBpm: 60, prMs: 180 });
    const t = e.truth;
    expect(t).not.toBeNull();
    if (!t) return;
    expect(t.prMs).toBe(180);
    expect(t.hrBpm).toBe(60);
    for (const b of t.beats) {
      expect(b.pOn).not.toBeNull();
      expect(b.qrsOn - (b.pOn ?? 0)).toBe(180);
      expect(b.tOff).toBeGreaterThan(b.qrsOff);
    }
    expect(t.axisDeg.qrs).toBeGreaterThan(0);
    expect(t.axisDeg.qrs).toBeLessThan(90);
  });

  it('is reproducible from its seed', () => {
    const a = makeFixtureEcg({ rrJitterMs: 120, seed: 7 });
    const b = makeFixtureEcg({ rrJitterMs: 120, seed: 7 });
    const c = makeFixtureEcg({ rrJitterMs: 120, seed: 8 });
    expect(a.truth?.beats.map((x) => x.qrsOn)).toEqual(b.truth?.beats.map((x) => x.qrsOn));
    expect(a.truth?.beats.map((x) => x.qrsOn)).not.toEqual(c.truth?.beats.map((x) => x.qrsOn));
  });

  it('every preset builds', () => {
    for (const k of Object.keys(FIXTURE_PRESETS) as FixturePreset[]) {
      const e = makeFixtureEcg(FIXTURE_PRESETS[k]);
      expect(e.truth?.beats.length).toBeGreaterThan(3);
    }
  });
});
