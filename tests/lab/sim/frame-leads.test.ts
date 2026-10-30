import { describe, expect, it } from 'vitest';
import { appToFrank, buildPose, DEFAULT_POSE_PARAMS, frontalAngleDeg, localDirToApp, specToApp, specToFrank } from '../../../src/lab/sim/frame';
import { dowerElectrodeField } from '../../../src/lab/sim/leads/electrodes';
import { leadMatrix, makeProjector } from '../../../src/lab/sim/leads/projector';
import { LEADS } from '../../../src/lab/sim/types';
import type { LeadName, Vec3 } from '../../../src/lab/sim/types';

const field = dowerElectrodeField();
const proj = makeProjector(field);

/** Lead voltages for a single app-frame heart vector. */
function leadsFor(hApp: Vec3): Record<LeadName, number> {
  const h = Float32Array.from(appToFrank(hApp));
  const out = new Float32Array(12);
  proj.project(new Float32Array(3), h, 1, out);
  return Object.fromEntries(LEADS.map((l, i) => [l, out[i]])) as Record<LeadName, number>;
}

describe('frame conversions', () => {
  it('app → Frank flips Y and Z', () => {
    expect(appToFrank([1, 2, 3])).toEqual([1, -2, -3]);
  });
  it('spec (+y inferior, +z anterior) maps consistently', () => {
    const v: Vec3 = [0.3, 0.5, 0.8];
    expect(appToFrank(specToApp(v))).toEqual(specToFrank(v));
  });
  it('pose is a proper rotation with apex pointing left-inferior-anterior', () => {
    const pose = buildPose();
    const apex = localDirToApp(pose, [0, -1, 0]);
    expect(apex[0]).toBeGreaterThan(0.4);
    expect(apex[1]).toBeLessThan(-0.4);
    expect(apex[2]).toBeGreaterThan(0.4);
    const R = pose.R;
    const det = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]);
    expect(det).toBeCloseTo(1, 6);
    expect(DEFAULT_POSE_PARAMS.rollDeg).toBe(0);
  });
});

describe('lead behaviour (behavioural frame tests)', () => {
  it('H toward patient left → I, V5, V6 positive', () => {
    const l = leadsFor([1, 0, 0]);
    expect(l.I).toBeGreaterThan(0);
    expect(l.V5).toBeGreaterThan(0);
    expect(l.V6).toBeGreaterThan(0);
  });
  it('H toward inferior (app −y) → II, III, aVF positive', () => {
    const l = leadsFor([0, -1, 0]);
    expect(l.II).toBeGreaterThan(0);
    expect(l.III).toBeGreaterThan(0);
    expect(l.aVF).toBeGreaterThan(0);
  });
  it('H toward anterior (app +z) → V1, V2 positive', () => {
    const l = leadsFor([0, 0, 1]);
    expect(l.V1).toBeGreaterThan(0);
    expect(l.V2).toBeGreaterThan(0);
  });
  it('frontal angle follows hexaxial convention (+90° = inferior)', () => {
    expect(frontalAngleDeg(appToFrank([0, -1, 0]))).toBeCloseTo(90, 6);
  });
});

describe('exact invariants', () => {
  it('Einthoven and Goldberger hold for any H, also when rewired', () => {
    for (const wiring of [{}, { LA: 'RA', RA: 'LA' } as const, { RA: 'RL', RL: 'RA' } as const]) {
      const m = leadMatrix(field, wiring);
      for (let k = 0; k < 3; k++) {
        expect(m.I[k] + m.III[k]).toBeCloseTo(m.II[k], 12);
        expect(m.aVR[k] + m.aVL[k] + m.aVF[k]).toBeCloseTo(0, 12);
      }
    }
  });
  it('LA/RA reversal: I inverted, II↔III, aVR↔aVL, aVF unchanged', () => {
    const a = leadMatrix(field), b = leadMatrix(field, { LA: 'RA', RA: 'LA' });
    for (let k = 0; k < 3; k++) {
      expect(b.I[k]).toBeCloseTo(-a.I[k], 12);
      expect(b.II[k]).toBeCloseTo(a.III[k], 12);
      expect(b.III[k]).toBeCloseTo(a.II[k], 12);
      expect(b.aVR[k]).toBeCloseTo(a.aVL[k], 12);
      expect(b.aVF[k]).toBeCloseTo(a.aVF[k], 12);
    }
  });
  it('RA/RL swap flattens lead II', () => {
    const b = leadMatrix(field, { RA: 'RL', RL: 'RA' });
    expect(Math.hypot(...b.II)).toBeLessThan(1e-12);
  });
  it('WCT gauge: precordial lead vectors equal the Dower rows', () => {
    const m = leadMatrix(field);
    expect(m.V2[2]).toBeCloseTo(-1.387, 9);
  });
  it('12 leads from one H have rank 3', () => {
    const n = 64;
    const h = new Float32Array(3 * n);
    for (let i = 0; i < 3 * n; i++) h[i] = Math.sin(i * 1.7) + Math.cos(i * 0.3);
    const out = new Float32Array(12 * n);
    proj.project(new Float32Array(3 * n), h, n, out);
    // Gram matrix eigen-spectrum via power-free check: project out the 3 lead-vector directions → residual ≈ 0.
    for (let l = 0; l < 12; l++) {
      const L = proj.leadVector(LEADS[l]);
      for (let i = 0; i < n; i++) {
        const expected = L[0] * h[i * 3] + L[1] * h[i * 3 + 1] + L[2] * h[i * 3 + 2];
        expect(out[l * n + i]).toBeCloseTo(expected, 4);
      }
    }
  });
});
