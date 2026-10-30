/**
 * Placement resolution and the electrode potentials of sites render.ts does not compute (DECISION §6.2, §6.8):
 * explicit chest sites, extra leads V3R/V4R/V7–V9, Mason–Likar. A standard site computed by sitePotentials equals
 * render.ts's own potential, so every site of the one lead system obeys the same rule.
 */
import { describe, expect, it } from 'vitest';
import { electrodePotentials, render } from '../../../src/synth/kernel/render';
import { assemble } from '../../../src/synth/leads/assemble';
import { COMPUTED_SITES, resolvePlacement, SITE_POS, STANDARD_HOOKUP } from '../../../src/synth/leads/electrodes';
import { SITE_LEAD_VECTOR } from '../../../src/synth/leads/leadfield';
import { hookupSitePotentials, sitePotentials } from '../../../src/synth/leads/sites';
import { scheduleOf } from './harness';

describe('resolvePlacement', () => {
  it('returns the standard hook-up for no placement and no extra leads', () => {
    expect(resolvePlacement(undefined)).toBe(STANDARD_HOOKUP);
  });
  it('maps an explicit standard chest site to its computed site (no extra potentials needed)', () => {
    const h = resolvePlacement({ chest: { V2: { ics: 4, line: 'sternal', side: 'L' }, V3: { ics: 4.5, line: 'parasternal', side: 'L' } } });
    expect(h.V2).toBe('V2');
    expect(h.V3).toBe('V3');
    expect(Object.keys(h.sites)).toEqual([]);
  });
  it('creates keyed sites for high chest electrodes, extra leads and Mason–Likar', () => {
    const h = resolvePlacement({ chest: { V1: { ics: 2, line: 'sternal', side: 'R' } }, limbsOnTorso: true }, ['V4R', 'V8', 'V4R']);
    expect(h.V1).toBe('chest:2:sternal:R');
    expect(h.RA).toBe('RA@ml');
    expect(h.LL).toBe('LL@ml');
    expect(h.extra).toEqual(['V4R', 'V8']);
    expect(Object.keys(h.sites).sort()).toEqual(['LA@ml', 'LL@ml', 'RA@ml', 'V4R', 'V8', 'chest:2:sternal:R']);
    // the high V1 sits 4.8 cm above the standard V1
    expect(h.sites['chest:2:sternal:R'].pos[1]).toBeCloseTo(SITE_POS.V1[1] - 4.8, 6);
  });
  it('keeps the neutral-cable rule: RL at its junction is the LL site', () => {
    const h = resolvePlacement({ limbs: { RA: 'RL', RL: 'RA' } });
    expect(h.RA).toBe('LL');
  });
  it('rejects impossible placements with a clear message', () => {
    expect(() => resolvePlacement({ limbs: { RA: 'LA' } })).toThrow(/four different limbs/);
    expect(() => resolvePlacement({ chest: { V1: { ics: 12, line: 'sternal', side: 'R' } } })).toThrow(/outside 1–9/);
    expect(() => resolvePlacement({ chest: { V1: { ics: 5, line: 'scapular', side: 'R' } } })).toThrow(/outside the baked lead table/);
  });
});

describe('site potentials', () => {
  const s = scheduleOf({ scenario: 'normal', seed: 2 });
  const r = render(s.kV, s.fs, s.n, 0);

  it('equal render.ts at the nine standard sites (same far field, same near-field rule)', () => {
    const ref = electrodePotentials(r, 1.1);
    const mine = sitePotentials(r, s.kV, COMPUTED_SITES.map((k) => ({ pos: SITE_POS[k], lv: SITE_LEAD_VECTOR[k] })), 1.1);
    COMPUTED_SITES.forEach((k, i) => {
      let d = 0;
      for (let j = 0; j < s.n; j++) d = Math.max(d, Math.abs(mine[i][j] - ref[k][j]));
      expect(d, k).toBeLessThanOrEqual(1e-12);
    });
  });

  it('extra leads are Wilson leads of their own electrodes and leave the twelve leads bit-identical', () => {
    const hook = resolvePlacement(undefined, ['V3R', 'V4R', 'V7', 'V8', 'V9']);
    const phi: Record<string, Float64Array> & ReturnType<typeof electrodePotentials> = { ...electrodePotentials(r), ...hookupSitePotentials(r, s.kV, hook) };
    const L = assemble(phi, hook);
    const S = assemble(electrodePotentials(r), STANDARD_HOOKUP);
    for (const l of ['I', 'II', 'V1', 'V6'] as const) expect(L[l]).toEqual(S[l]);
    for (const l of ['V3R', 'V4R', 'V7', 'V8', 'V9'] as const) {
      const x = L[l]!;
      expect(x.length).toBe(s.n);
      for (const j of [100, 1234, 4000]) expect(x[j]).toBeCloseTo(phi[l][j] - (phi.RA[j] + phi.LA[j] + phi.LL[j]) / 3, 5);
    }
  });

  it('refuses a hook-up whose sites were not computed, naming the function that computes them', () => {
    const hook = resolvePlacement({ limbsOnTorso: true });
    expect(() => assemble(electrodePotentials(r), hook)).toThrow(/hookupSitePotentials/);
  });
});
