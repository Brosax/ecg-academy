import { describe, expect, it } from 'vitest';
import { CHEST_LEADS, LIMB_ANGLE_DEG, LIMB_LEADS } from '../../src/core/leads';
import { angleDiff, angleOf, normDeg } from '../../src/figures/math/geom';
import {
  classifyAxis,
  DEFAULT_HORIZONTAL_DEG,
  deflectionKind,
  frontalQrsLoop,
  horizontalComplexes,
  measureRS,
  PRECORDIAL_DEG,
  PRECORDIAL_GAIN,
  projectFrontal,
  projectionPoint,
  projectLoop,
  rsTransition,
} from '../../src/figures/math/projection';

describe('geometry helpers', () => {
  it('normalises angles to (−180, 180]', () => {
    expect(normDeg(180)).toBe(180);
    expect(normDeg(-180)).toBe(180);
    expect(normDeg(270)).toBe(-90);
    expect(normDeg(-390)).toBe(-30);
    expect(Object.is(normDeg(-360), 0)).toBe(true);
    expect(angleDiff(-170, 170)).toBe(20);
    expect(angleOf(0, 1)).toBeCloseTo(90);
    expect(angleOf(-1, 0)).toBeCloseTo(180);
  });
});

describe('frontal (hexaxial) projection', () => {
  it('projects a +60° vector as the textbook example', () => {
    const p = projectFrontal(60);
    expect(p.II).toBeCloseTo(1);
    expect(p.I).toBeCloseTo(0.5);
    expect(p.III).toBeCloseTo(0.5);
    expect(p.aVF).toBeCloseTo(Math.sqrt(3) / 2);
    expect(p.aVL).toBeCloseTo(0);
    expect(p.aVR).toBeCloseTo(-Math.sqrt(3) / 2);
  });

  it('obeys Einthoven (I + III = II) and Goldberger (aVR + aVL + aVF = 0) for every angle', () => {
    for (let deg = -180; deg <= 180; deg += 7) {
      const p = projectFrontal(deg, 1.7);
      expect(p.I + p.III).toBeCloseTo(p.II, 10);
      expect(p.aVR + p.aVL + p.aVF).toBeCloseTo(0, 10);
    }
  });

  it('returns the foot of the perpendicular on a lead axis', () => {
    const [x, y] = projectionPoint(60, 2, 0);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    const [x2, y2] = projectionPoint(0, 1, 90);
    expect(x2).toBeCloseTo(0);
    expect(y2).toBeCloseTo(0);
  });

  it('classifies deflections: the perpendicular lead is equiphasic', () => {
    expect(deflectionKind(60, LIMB_ANGLE_DEG.aVL)).toBe('equiphasic');
    expect(deflectionKind(60, LIMB_ANGLE_DEG.II)).toBe('positive');
    expect(deflectionKind(60, LIMB_ANGLE_DEG.aVR)).toBe('negative');
    expect(deflectionKind(0, LIMB_ANGLE_DEG.aVF)).toBe('equiphasic');
    expect(deflectionKind(-60, LIMB_ANGLE_DEG.III)).toBe('negative');
  });

  it('classifies the axis with the AHA/ACCF/HRS edges', () => {
    expect(classifyAxis(-30)).toBe('normal');
    expect(classifyAxis(90)).toBe('normal');
    expect(classifyAxis(60)).toBe('normal');
    expect(classifyAxis(-31)).toBe('lad');
    expect(classifyAxis(-90)).toBe('lad');
    expect(classifyAxis(91)).toBe('rad');
    expect(classifyAxis(180)).toBe('rad');
    expect(classifyAxis(-180)).toBe('rad');
    expect(classifyAxis(-91)).toBe('extreme');
    expect(classifyAxis(-150)).toBe('extreme');
    expect(classifyAxis(300)).toBe('lad'); // 300° ≡ −60°
  });

  it('mini QRS loops: net area follows cos(axis − lead), zero on the perpendicular lead', () => {
    for (const axis of [-45, 0, 60, 110]) {
      const loop = frontalQrsLoop(axis, 129);
      const nets = LIMB_LEADS.map((l) => measureRS(projectLoop(loop, LIMB_ANGLE_DEG[l])).net);
      const scale = measureRS(projectLoop(loop, axis)).net;
      LIMB_LEADS.forEach((l, i) => {
        expect(nets[i] / scale).toBeCloseTo(Math.cos(((axis - LIMB_ANGLE_DEG[l]) * Math.PI) / 180), 6);
      });
    }
  });
});

describe('horizontal-plane projection', () => {
  it('orders the precordial axes from right-anterior (V1) to left-lateral (V6)', () => {
    const degs = CHEST_LEADS.map((l) => PRECORDIAL_DEG[l]);
    for (let i = 1; i < degs.length; i++) expect(degs[i]).toBeGreaterThan(degs[i - 1]);
    expect(PRECORDIAL_DEG.V1).toBeLessThan(-100); // anterior and to the right
    expect(PRECORDIAL_DEG.V1).toBeGreaterThan(-135);
    expect(Math.abs(PRECORDIAL_DEG.V6)).toBeLessThan(15); // almost straight to the left
  });

  it('gives the most proximal electrodes (V2–V4) the largest gain', () => {
    expect(PRECORDIAL_GAIN.V3).toBeCloseTo(1);
    expect(PRECORDIAL_GAIN.V6).toBeLessThan(PRECORDIAL_GAIN.V4);
    expect(PRECORDIAL_GAIN.V1).toBeLessThan(PRECORDIAL_GAIN.V2);
  });

  it('normal vector: rS in V1, qR in V6, transition in V3–V4', () => {
    const h = horizontalComplexes(DEFAULT_HORIZONTAL_DEG);
    const [v1, , , , , v6] = h.rs;
    expect(v1.r).toBeLessThan(v1.s);
    expect(v6.r).toBeGreaterThan(v6.s);
    expect(h.transition.cls).toBe('normal');
    expect(h.transition.firstIndex === 2 || h.transition.firstIndex === 3).toBe(true);
    // R grows from V1 to V4 and S shrinks from V2 to V6
    for (let i = 1; i <= 3; i++) expect(h.rs[i].r).toBeGreaterThan(h.rs[i - 1].r);
    for (let i = 2; i < 6; i++) expect(h.rs[i].s).toBeLessThan(h.rs[i - 1].s);
  });

  it('counter-clockwise rotation (anterior vector) gives an early transition, clockwise a late one', () => {
    expect(horizontalComplexes(-30).transition.cls).toBe('early');
    expect(horizontalComplexes(80).transition.cls).toBe('late');
  });

  it('rsTransition interpolates the 0.5 crossing', () => {
    const t = rsTransition([
      { r: 1, s: 3, net: 0 },
      { r: 1, s: 1.5, net: 0 },
      { r: 3, s: 1, net: 0 },
      { r: 4, s: 1, net: 0 },
    ]);
    expect(t.firstIndex).toBe(2);
    expect(t.crossing).not.toBeNull();
    expect(t.crossing!).toBeGreaterThan(1);
    expect(t.crossing!).toBeLessThan(2);
    expect(rsTransition([{ r: 0, s: 1, net: 0 }, { r: 0, s: 1, net: 0 }]).firstIndex).toBeNull();
  });
});
