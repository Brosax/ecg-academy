import { describe, expect, it } from 'vitest';
import type { EcgSignal } from '../../src/core/ecg';
import { deriveLimbLeads, LIMB_ANGLE_DEG, LIMB_LEADS } from '../../src/core/leads';
import {
  axisFromNets,
  dominantBeats,
  isoelectricHint,
  limbNetAreas,
  mostIsoelectricLead,
  netArea,
  quadrantOf,
  quickAngle,
} from '../../src/figures/math/axis';

describe('quadrant method', () => {
  it('reads the quadrant from the signs of I and aVF', () => {
    expect(quadrantOf(5, 5)).toBe('normal');
    expect(quadrantOf(5, -5)).toBe('left');
    expect(quadrantOf(-5, 5)).toBe('right');
    expect(quadrantOf(-5, -5)).toBe('extreme');
    expect(quadrantOf(0, 0)).toBe('indeterminate');
    expect(quadrantOf(0, 5)).toBe('normal');
  });

  it('computes the exact angle with Goldberger scaling of aVF', () => {
    expect(axisFromNets(10, 0).deg).toBe(0);
    expect(axisFromNets(0, 10).deg).toBe(90);
    expect(axisFromNets(-10, 0).deg).toBe(180);
    expect(axisFromNets(-10, 0).cls).toBe('rad');
    // a +60° vector of unit size: I = 0.5, aVF = (√3/2)·sin 60° = 0.75
    expect(axisFromNets(0.5, 0.75).deg).toBeCloseTo(60, 1);
    expect(axisFromNets(0, 0).deg).toBeNull();
  });

  it('separates "left quadrant but normal" from LAD with lead II', () => {
    const mild = axisFromNets(10, -3);
    expect(mild.quadrant).toBe('left');
    expect(mild.cls).toBe('normal');
    expect(mild.netII).toBeGreaterThan(0);
    const lad = axisFromNets(10, -10);
    expect(lad.quadrant).toBe('left');
    expect(lad.cls).toBe('lad');
    expect(lad.netII).toBeLessThan(0);
    // II = 0 exactly at −30°
    const edge = axisFromNets(2, -1);
    expect(edge.netII).toBeCloseTo(0);
    expect(edge.deg).toBeCloseTo(-30, 1);
  });

  it('labels right and extreme quadrants', () => {
    expect(axisFromNets(-10, 10).cls).toBe('rad');
    expect(axisFromNets(-10, -10).cls).toBe('extreme');
    expect(axisFromNets(-10, -10).quadrant).toBe('extreme');
  });

  it('the bedside shortcut stays within ≈ 4° of the exact angle', () => {
    for (let d = -175; d <= 180; d += 5) {
      const r = (d * Math.PI) / 180;
      const I = Math.cos(r);
      const aVF = (Math.sqrt(3) / 2) * Math.sin(r);
      const exact = axisFromNets(I, aVF).deg!;
      expect(Math.abs(((exact - d + 540) % 360) - 180)).toBeLessThan(0.11);
      const q = quickAngle(I, aVF)!;
      expect(Math.abs(((q - d + 540) % 360) - 180)).toBeLessThan(4.2);
    }
  });
});

describe('isoelectric-lead method', () => {
  it('finds the perpendicular lead and the correct of its two normals', () => {
    const h = isoelectricHint(60);
    expect(h.lead).toBe('aVL');
    expect(h.candidates).toContain(60);
    expect(h.candidates).toContain(-120);
    expect(h.chosen).toBe(60);
    expect(isoelectricHint(-30).lead).toBe('II');
    expect(isoelectricHint(-30).chosen).toBe(-30);
    expect(isoelectricHint(0).lead).toBe('aVF');
    expect(isoelectricHint(150).chosen).toBe(150);
  });

  it('picks the smallest measured net QRS', () => {
    expect(mostIsoelectricLead({ I: 5, II: 8, III: 3, aVR: -6, aVL: 0.5, aVF: 6 })).toBe('aVL');
  });
});

describe('net QRS from an ECG', () => {
  const fs = 500;
  const durationMs = 2000;
  const n = (durationMs * fs) / 1000;

  /** limb leads of a dipole of angle `deg` whose magnitude is a triangle pulse between 400 and 480 ms */
  function makeSignal(deg: number, offset = 0): EcgSignal {
    const I = new Float32Array(n), II = new Float32Array(n);
    const r = (deg * Math.PI) / 180;
    for (let i = 0; i < n; i++) {
      const t = (i * 1000) / fs;
      const m = t >= 400 && t <= 480 ? 1 - Math.abs(t - 440) / 40 : 0;
      I[i] = m * Math.cos(r) + offset;
      II[i] = m * Math.cos(r - Math.PI / 3) + offset;
    }
    const d = deriveLimbLeads(I, II);
    const z = new Float32Array(n);
    return { fs, durationMs, leads: { I, II, ...d, V1: z, V2: z, V3: z, V4: z, V5: z, V6: z } };
  }

  it('integrates the net area against the pre-QRS baseline', () => {
    const sig = makeSignal(0, 0.3);
    // triangle of height 1 and base 80 ms → 40 mV·ms, baseline offset removed
    expect(netArea(sig.leads.I, fs, 395, 485)).toBeCloseTo(40, 0);
  });

  it('recovers the dipole angle from I and aVF areas', () => {
    for (const deg of [-60, -20, 45, 75, 130, -150]) {
      const sig = makeSignal(deg);
      const nets = limbNetAreas(sig, [[395, 485]]);
      const res = axisFromNets(nets.I, nets.aVF);
      expect(Math.abs(((res.deg! - deg + 540) % 360) - 180)).toBeLessThan(1);
      // the most isoelectric lead is the one closest to perpendicular
      const iso = mostIsoelectricLead(nets);
      const off = Math.abs(Math.abs(((deg - LIMB_ANGLE_DEG[iso] + 540) % 360) - 180) - 90);
      expect(off).toBeLessThanOrEqual(15);
      expect(LIMB_LEADS).toContain(iso);
    }
  });

  it('uses the dominant beat kind, excluding aberrant beats', () => {
    const b = (kind: 'sinus' | 'ventricular', aberrant = false) => ({
      kind,
      pOn: null,
      pOff: null,
      qrsOn: 0,
      qrsOff: 90,
      j: 90,
      tPeak: null,
      tOff: 400,
      uOff: null,
      aberrant,
    });
    const beats = [b('sinus'), b('ventricular'), b('sinus'), b('sinus', true), b('ventricular'), b('sinus')];
    const dom = dominantBeats(beats);
    expect(dom.length).toBe(3);
    expect(dom.every((x) => x.kind === 'sinus' && !x.aberrant)).toBe(true);
  });
});
