/**
 * T0 (DECISION §8.2): the lead field reproduces the forward Dower rows exactly at the standard sites (WCT gauge), the
 * near-field gain behaves as designed, and Wilson assembly is the WCT difference.
 */
import { describe, expect, it } from 'vitest';
import { STD_LEADS } from '../../../src/core/leads';
import type { Vec3 } from '../../../src/synth/api';
import { assemble, leadAt } from '../../../src/synth/leads/assemble';
import { COMPUTED_SITES, SITE_POS, STANDARD_HOOKUP } from '../../../src/synth/leads/electrodes';
import { DOWER, KAPPA, nearGain, SITE_LEAD_VECTOR } from '../../../src/synth/leads/leadfield';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

describe('Dower lead field at the standard sites', () => {
  it('limb electrodes reproduce the Dower I and II rows exactly (≤ 1e-9)', () => {
    const I = sub(SITE_LEAD_VECTOR.LA, SITE_LEAD_VECTOR.RA);
    const II = sub(SITE_LEAD_VECTOR.LL, SITE_LEAD_VECTOR.RA);
    for (let c = 0; c < 3; c++) {
      expect(Math.abs(I[c] - DOWER.I[c])).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(II[c] - DOWER.II[c])).toBeLessThanOrEqual(1e-9);
    }
  });
  it('is in the WCT gauge (Φ_RA + Φ_LA + Φ_LL = 0), so Wilson leads equal the Dower chest rows', () => {
    for (let c = 0; c < 3; c++) expect(Math.abs(SITE_LEAD_VECTOR.RA[c] + SITE_LEAD_VECTOR.LA[c] + SITE_LEAD_VECTOR.LL[c])).toBeLessThanOrEqual(1e-12);
    for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) for (let c = 0; c < 3; c++) expect(SITE_LEAD_VECTOR[v][c]).toBe(DOWER[v][c]);
  });
  it('κ makes a centred dipole reproduce |L_V2| at V2', () => {
    const p = SITE_POS.V2;
    const r = Math.hypot(...p);
    expect(KAPPA / r ** 2).toBeCloseTo(Math.hypot(...DOWER.V2), 9);
  });
});

describe('near-field gain', () => {
  it('vanishes for a far-field source at the origin (far = 1) and grows near the electrode', () => {
    const g0 = nearGain(SITE_POS.V2, [0, 0, 0], 1);
    for (const x of g0) expect(Math.abs(x)).toBeLessThan(1e-12);
    const near = Math.hypot(...nearGain(SITE_POS.V2, [-1, -0.5, -5], 1));
    const far = Math.hypot(...nearGain(SITE_POS.V6, [-1, -0.5, -5], 1));
    expect(near).toBeGreaterThan(5 * far);
  });
  it('is zero when β = 0 (pure Dower)', () => {
    for (const x of nearGain(SITE_POS.V1, [-2, -2, -5], 0, 0)) expect(Math.abs(x)).toBe(0);
  });
});

describe('assembly', () => {
  it('forms Einthoven / Goldberger / Wilson leads from site potentials', () => {
    const n = 5;
    const phi = Object.fromEntries(COMPUTED_SITES.map((s, i) => [s, Float64Array.from({ length: n }, (_, k) => Math.sin(i + k * 0.7) * (i + 1))])) as Record<(typeof COMPUTED_SITES)[number], Float64Array>;
    const L = assemble(phi, STANDARD_HOOKUP);
    for (let k = 0; k < n; k++) {
      const r = phi.RA[k], l = phi.LA[k], f = phi.LL[k];
      expect(L.I[k]).toBeCloseTo(l - r, 5);
      expect(L.aVR[k]).toBeCloseTo(r - (l + f) / 2, 5);
      expect(L.V4[k]).toBeCloseTo(phi.V4[k] - (r + l + f) / 3, 5);
      const p = Object.fromEntries(COMPUTED_SITES.map((s) => [s, phi[s][k]])) as Record<(typeof COMPUTED_SITES)[number], number>;
      for (const lead of STD_LEADS) expect(leadAt(lead, p, STANDARD_HOOKUP)).toBeCloseTo(L[lead][k], 5);
    }
  });
});
