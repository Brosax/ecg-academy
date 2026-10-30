import { describe, expect, it } from 'vitest';
import {
  angleDiff, clinicalAxisDeg, frontalDeg, frontalDir, HEXAXIAL_AXES, HEXAXIAL_DEG, hexaxialProjection, horizontalDeg, horizontalDir,
  horizontalProjection, leadDecomposition, nearestAxis, qrsAxes,
} from '../../../src/lab/ecg/axes';
import { getHub, leadIndex } from '../../../src/lab/ecg/sampler';
import { appToFrank } from '../../../src/lab/sim/frame';
import { dowerElectrodeField } from '../../../src/lab/sim/leads/electrodes';
import { makeProjector } from '../../../src/lab/sim/leads/projector';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import type { FrankVec } from '../../../src/lab/sim/types';

const proj = makeProjector(dowerElectrodeField());

describe('hexaxial geometry', () => {
  it('ideal angles (LITFL / lead-geometry §3c)', () => {
    expect(HEXAXIAL_DEG).toEqual({ I: 0, II: 60, III: 120, aVR: -150, aVL: -30, aVF: 90 });
  });
  it('+90° is inferior and drawn downward (screen y = Frank +Y)', () => {
    const [x, y] = frontalDir(90);
    expect(x).toBeCloseTo(0, 12);
    expect(y).toBeCloseTo(1, 12);
    expect(frontalDeg(appToFrank([0, -1, 0]))).toBeCloseTo(90, 9); // app −y = inferior
    expect(frontalDeg(appToFrank([1, 0, 0]))).toBeCloseTo(0, 9); // patient left
  });
  it('projection on an ideal axis', () => {
    const h = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3), 0.4];
    expect(hexaxialProjection(h, 'II')).toBeCloseTo(1, 12);
    expect(hexaxialProjection(h, 'aVL')).toBeCloseTo(0, 12); // perpendicular to II
    expect(hexaxialProjection(h, 'aVR')).toBeLessThan(0);
  });
  it('real Dower lead vectors sit at ≈ −20°, +78°, +107° (not 0/60/120)', () => {
    expect(frontalDeg(proj.leadVector('I'))).toBeCloseTo(-20.4, 0);
    expect(frontalDeg(proj.leadVector('II'))).toBeCloseTo(77.6, 0);
    expect(frontalDeg(proj.leadVector('III'))).toBeCloseTo(107, 0);
  });
  it('clinical axis atan2(2·aVF/√3, I) recovers the angle exactly for ideal leads', () => {
    for (const th of [-30, 0, 45, 60, 90, 120]) {
      const r = (th * Math.PI) / 180;
      const I = Math.cos(r), aVF = (Math.sqrt(3) / 2) * Math.sin(r);
      expect(clinicalAxisDeg(I, aVF)).toBeCloseTo(th, 9);
    }
  });
  it('with Dower leads the clinical axis exceeds the true frontal angle (≈ 25° around +30°, growing with the angle)', () => {
    const diffAt = (th: number) => {
      const r = (th * Math.PI) / 180;
      const H: FrankVec = [Math.cos(r), Math.sin(r), 0];
      const dotL = (l: 'I' | 'aVF') => {
        const L = proj.leadVector(l);
        return L[0] * H[0] + L[1] * H[1] + L[2] * H[2];
      };
      return angleDiff(clinicalAxisDeg(dotL('I'), dotL('aVF')), th);
    };
    let prev = -Infinity;
    for (const th of [15, 25, 30, 40]) {
      const d = diffAt(th);
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
    expect(diffAt(15)).toBeGreaterThan(8);
    expect(diffAt(30)).toBeGreaterThan(20);
    expect(diffAt(30)).toBeLessThan(30);
    expect(diffAt(40)).toBeLessThan(35);
  });
  it('clicking near a positive pole picks that lead', () => {
    expect(nearestAxis(58, HEXAXIAL_AXES, 15)).toBe('II');
    expect(nearestAxis(-155, HEXAXIAL_AXES, 15)).toBe('aVR');
    expect(nearestAxis(178, HEXAXIAL_AXES, 15)).toBeNull(); // negative pole of I: no lead
    expect(angleDiff(170, -170)).toBeCloseTo(-20, 12);
  });
});

describe('horizontal plane', () => {
  it('precordial Dower directions from +X toward anterior ≈ 119, 88, 55, 26, 4, −16°', () => {
    const want = [119, 88, 55, 26, 4, -16];
    (['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).forEach((l, i) => {
      expect(Math.abs(horizontalDeg(proj.leadVector(l)) - want[i])).toBeLessThan(1.5);
    });
  });
  it('anterior is drawn up: an anterior vector has screen y < 0', () => {
    const anterior = appToFrank([0, 0, 1]);
    expect(horizontalDeg(anterior)).toBeCloseTo(90, 9);
    expect(anterior[2]).toBeLessThan(0); // screen y = Frank Z → up
    const [x, z] = horizontalDir(90);
    expect(x).toBeCloseTo(0, 12);
    expect(z).toBeCloseTo(-1, 12);
  });
  it('projection uses the horizontal components only', () => {
    const L = proj.leadVector('V2');
    const h = [0, 5, -1];
    expect(horizontalProjection(h, L)).toBeCloseTo((-1 * L[2]) / Math.hypot(L[0], L[2]), 9);
  });
});

describe('voltage = |L| · (H · L̂)', () => {
  it('lead sensitivities: I ≈ 0.68, V3 ≈ 1.56', () => {
    expect(leadDecomposition([1, 0, 0], proj.leadVector('I')).sens).toBeCloseTo(0.677, 2);
    expect(leadDecomposition([1, 0, 0], proj.leadVector('V3')).sens).toBeCloseTo(1.555, 2);
  });
  it('the decomposition reproduces the projector output', () => {
    const h = [0.4, 0.9, -0.3];
    for (const l of ['I', 'aVL', 'V1', 'V5'] as const) {
      const out = new Float32Array(12);
      proj.project(new Float32Array(3), Float32Array.from(h), 1, out);
      expect(leadDecomposition(h, proj.leadVector(l)).voltage).toBeCloseTo(out[leadIndex(l)], 5);
    }
  });
});

describe('QRS axes of a stub beat', () => {
  it('clinical axis is normal and larger than the true frontal angle of mean H', () => {
    const eng = new StubEngine();
    const hub = getHub(eng);
    const c = hub.cycles.at(2100)!;
    const a = hub.beat(c);
    const m = a.measured;
    const i0 = Math.round((m.qrsOn! - a.t0) / a.dt), i1 = Math.round((m.qrsOff! - a.t0) / a.dt);
    const lead = (l: 'I' | 'aVF') => a.leads.subarray(leadIndex(l) * a.n, (leadIndex(l) + 1) * a.n);
    const b = i0 - 3;
    const ax = qrsAxes(a.H, lead('I'), lead('aVF'), i0, i1, {
      I: lead('I')[b], aVF: lead('aVF')[b], H: [a.H[3 * b], a.H[3 * b + 1], a.H[3 * b + 2]],
    });
    expect(ax.clinicalDeg).toBeGreaterThan(-30);
    expect(ax.clinicalDeg).toBeLessThan(90);
    expect(ax.diffDeg).toBeGreaterThan(0);
    expect(ax.diffDeg).toBeLessThan(40);
  });
});
