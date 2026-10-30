/**
 * Generated activation families (src/synth/rhythm/fronts.ts, DECISION §6.3): the two calibration references — RV-apex
 * pacing is LBBB-like with a superior axis; an LV lateral origin is RBBB-like with a negative lead I — plus the origin
 * table of the PVC criteria (RVOT: LBBB-like with an inferior axis; posterior fascicle: RBBB-like, left axis), the
 * fully pre-excited QRS width and the lobe budget. Leads are the Dower rows applied to the far-field heart vector.
 */
import { describe, expect, it } from 'vitest';
import type { VentOrigin } from '../../../src/synth/api';
import { lobeKernel } from '../../../src/synth/kernel/kernel';
import { render } from '../../../src/synth/kernel/render';
import { DOWER } from '../../../src/synth/leads/leadfield';
import { resolveLobe } from '../../../src/synth/morph/resolve';
import {
  BIV_INPUT, familyScale, fullPreexcitedPattern, generatedPattern, MAX_LOBES, ORIGIN_INPUT, PACING_INPUT,
} from '../../../src/synth/rhythm/fronts';

type Lead = 'I' | 'II' | 'III' | 'aVF' | 'V1' | 'V4' | 'V5' | 'V6';
/** Net deflection (max + min) and visible width (2 % of the peak magnitude) of a generated pattern. */
function leadsOf(lobes: readonly Parameters<typeof resolveLobe>[0][]): { net: Record<Lead, number>; widthMs: number } {
  const ks = lobes.map((l) => lobeKernel(resolveLobe(l, 'QRS', 'none'), 0, -1));
  const lo = Math.floor(Math.min(...ks.map((k) => k.s0))), hi = Math.ceil(Math.max(...ks.map((k) => k.s1)));
  const r = render(ks, 1000, hi - lo + 1, lo, 0);
  const proj = (v: readonly number[], i: number): number => v[0] * r.H[0][i] + v[1] * r.H[1][i] + v[2] * r.H[2][i];
  const lead = (l: Lead, i: number): number => {
    if (l === 'III') return proj(DOWER.II, i) - proj(DOWER.I, i);
    if (l === 'aVF') return proj(DOWER.II, i) - 0.5 * proj(DOWER.I, i);
    return proj(DOWER[l], i);
  };
  const net = {} as Record<Lead, number>;
  for (const l of ['I', 'II', 'III', 'aVF', 'V1', 'V4', 'V5', 'V6'] as const) {
    let mx = 0, mn = 0;
    for (let i = 0; i < r.n; i++) {
      mx = Math.max(mx, lead(l, i));
      mn = Math.min(mn, lead(l, i));
    }
    net[l] = mx + mn;
  }
  const mag = Array.from({ length: r.n }, (_, i) => Math.hypot(r.H[0][i], r.H[1][i], r.H[2][i]));
  const pk = Math.max(...mag);
  const a = mag.findIndex((m) => m >= 0.02 * pk), z = mag.length - 1 - [...mag].reverse().findIndex((m) => m >= 0.02 * pk);
  return { net, widthMs: z - a };
}
const origin = (o: Exclude<VentOrigin, 'junctional'>) => leadsOf(generatedPattern(`test:${o}`, ORIGIN_INPUT[o], o).lobes);

describe('generated ventricular families (calibration references)', () => {
  it('the family scale is finite and positive; every pattern stays within the lobe budget', () => {
    expect(familyScale()).toBeGreaterThan(0);
    for (const o of Object.keys(ORIGIN_INPUT) as Exclude<VentOrigin, 'junctional'>[]) {
      expect(generatedPattern(`test:${o}`, ORIGIN_INPUT[o], o).lobes.length).toBeLessThanOrEqual(MAX_LOBES);
    }
  });

  it('RV-apex pacing: LBBB-like (negative V1, positive V6), superior axis (negative II, III, aVF), wide', () => {
    const p = leadsOf(generatedPattern('test:paced:rv-apex', PACING_INPUT['rv-apex'], 'rv-apex').lobes);
    expect(p.net.V1).toBeLessThan(0);
    expect(p.net.V6).toBeGreaterThan(0);
    expect(p.net.II).toBeLessThan(0);
    expect(p.net.III).toBeLessThan(0);
    expect(p.net.aVF).toBeLessThan(0);
    expect(p.widthMs).toBeGreaterThanOrEqual(130);
  });

  it('LV lateral origin: RBBB-like (dominant R in V1), negative lead I, wide', () => {
    const p = origin('lv-lateral');
    expect(p.net.V1).toBeGreaterThan(0);
    expect(p.net.I).toBeLessThan(0);
    expect(p.widthMs).toBeGreaterThanOrEqual(120);
  });

  it('RVOT origin: LBBB-like with an inferior axis', () => {
    for (const o of ['rvot-free', 'rvot-septal'] as const) {
      const p = origin(o);
      expect(p.net.V1, o).toBeLessThan(0);
      expect(p.net.II, o).toBeGreaterThan(0);
      expect(p.net.III, o).toBeGreaterThan(0);
    }
  });

  it('posterior fascicle: RBBB-like, left axis (negative aVF), narrower than a muscle origin', () => {
    const p = origin('fascicular-posterior');
    expect(p.net.V1).toBeGreaterThan(0);
    expect(p.net.aVF).toBeLessThan(0);
    expect(p.widthMs).toBeLessThan(origin('lv-lateral').widthMs);
  });

  it('ectopic and paced QRS start with a smooth upstroke: no early notch from the exit region (review A14)', () => {
    const inputs = [...Object.entries(ORIGIN_INPUT), ...Object.entries(PACING_INPUT).map(([k, v]) => [`paced:${k}`, v] as const)];
    // muscle origins (a point source); Purkinje-driven ones (fascicular, His, LBB area) start like a conducted QRS
    for (const [o, input] of inputs.filter(([, i]) => i.extra?.length)) {
      const lobes = generatedPattern(`test:smooth:${o}`, input, o).lobes;
      const ks = lobes.map((l) => lobeKernel(resolveLobe(l, 'QRS', 'none'), 0, -1));
      const lo = Math.floor(Math.min(...ks.map((k) => k.s0)));
      // every Dower lead: no notch — an early peak (first 30 ms) that falls back by > 0.05 mV and is then exceeded in the
      // same direction by the body of the QRS (the old exit lobe of the RVOT origin: 0.60 mV in II at 12 ms, 0.16 mV at
      // 36 ms, then the main R); a biphasic start (q then R, the transition lead) is not a notch
      const r2 = render(ks, 1000, 140, lo, 0);
      for (const [name, v] of Object.entries(DOWER)) {
        const x = Array.from({ length: 140 }, (_, k) => v[0] * r2.H[0][k] + v[1] * r2.H[1][k] + v[2] * r2.H[2][k]);
        // the first local maximum of |x| (an early peak), if it comes within the first 30 ms
        let kTop = -1;
        for (let k = 1; k < 30; k++) if (Math.abs(x[k]) > 0.02 && Math.abs(x[k]) >= Math.abs(x[k + 1]) && Math.abs(x[k]) >= Math.abs(x[k - 1])) {
          kTop = k;
          break;
        }
        if (kTop < 0) continue;
        const top = x[kTop];
        let notch = 0;
        const sg = Math.sign(top);
        let dip = Math.abs(top);
        for (let k = kTop; k < 140; k++) {
          if (Math.sign(x[k]) !== sg) break;
          dip = Math.min(dip, Math.abs(x[k]));
          if (Math.abs(x[k]) > Math.abs(top) && Math.abs(top) - dip > 0.05) {
            notch = Math.abs(top) - dip;
            break;
          }
        }
        expect(notch, `${o} ${name}`).toBe(0);
      }
    }
  });

  it('biventricular pacing is narrower than RV-apex pacing', () => {
    const rv = leadsOf(generatedPattern('test:paced:rv-apex', PACING_INPUT['rv-apex'], 'rv-apex').lobes);
    const biv = leadsOf(generatedPattern('test:paced:biv', BIV_INPUT, 'biv').lobes);
    expect(biv.widthMs).toBeLessThan(rv.widthMs);
  });

  it('maximal pre-excitation (left lateral pathway): 140–180 ms, RBBB-like V1, negative lead I, V4–V6 positive (Steurer)', () => {
    const p = leadsOf(fullPreexcitedPattern('left-lateral').lobes);
    expect(p.widthMs).toBeGreaterThanOrEqual(140);
    expect(p.widthMs).toBeLessThanOrEqual(180);
    expect(p.net.V1).toBeGreaterThan(0);
    expect(p.net.I).toBeLessThan(0);
    // the front enters at the AV ring and sweeps base → apex: no pre-excited QRS is predominantly negative in V4–V6
    for (const l of ['V4', 'V5', 'V6'] as const) expect(p.net[l], l).toBeGreaterThan(0);
  });
});
