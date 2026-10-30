/**
 * T0 (DECISION §8.2): frame conversions and seeded streams.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { angleDiff, apply, frankToView, hexaxialDeg, rotateAbout, rotationMatrix } from '../../src/synth/frame';

describe('hexaxial angles', () => {
  it('reads the classic net-deflection pairs', () => {
    expect(hexaxialDeg(1, 0)).toBeCloseTo(0, 9);
    expect(hexaxialDeg(0, 1)).toBeCloseTo(90, 9);
    expect(hexaxialDeg(-1, 0)).toBeCloseTo(180, 9);
    // a heart vector at +60° (lead II direction): I = cos 60°, aVF = (√3/2)·sin 60°
    const th = (60 * Math.PI) / 180;
    expect(hexaxialDeg(Math.cos(th), (Math.sqrt(3) / 2) * Math.sin(th))).toBeCloseTo(60, 9);
    expect(hexaxialDeg(1, -1e-12)).toBeLessThanOrEqual(0);
  });
  it('wraps angle differences into (−180, 180]', () => {
    expect(angleDiff(170, -170)).toBeCloseTo(-20, 9);
    expect(angleDiff(-170, 170)).toBeCloseTo(20, 9);
    expect(angleDiff(180, 0)).toBe(180);
  });
});

describe('rotations', () => {
  it('a positive frontal rotation turns +X (left) toward +Y (inferior)', () => {
    const v = apply(rotationMatrix(30), [1, 0, 0]);
    expect(v[0]).toBeCloseTo(Math.cos(Math.PI / 6), 9);
    expect(v[1]).toBeCloseTo(0.5, 9);
    expect(v[2]).toBeCloseTo(0, 9);
  });
  it('Rodrigues rotation preserves length and turns by the angle', () => {
    const v = rotateAbout([1, 2, 3], [0, 0, 1], 90);
    expect(v[0]).toBeCloseTo(-2, 9);
    expect(v[1]).toBeCloseTo(1, 9);
    expect(v[2]).toBeCloseTo(3, 9);
  });
  it('maps Frank to the 3D view frame (+y superior, +z anterior)', () => {
    expect(frankToView([1, 2, 3])).toEqual([1, -2, -3]);
  });
});

describe('seeded streams', () => {
  it('named forks are independent: extra draws in one stream never shift another', () => {
    const a = createRng(7), b = createRng(7);
    const fa = a.fork('af'), fb = b.fork('af');
    // stream 'sinus' of b draws many numbers first
    const s = b.fork('sinus');
    for (let i = 0; i < 100; i++) s.next();
    for (let i = 0; i < 10; i++) expect(fa.next()).toBe(fb.next());
  });
  it('the same seed gives the same sequence', () => {
    const a = createRng(123), b = createRng(123);
    for (let i = 0; i < 20; i++) expect(a.normal()).toBe(b.normal());
  });
});
