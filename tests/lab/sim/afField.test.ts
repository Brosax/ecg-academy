/**
 * AF rotor field: periodicity, repolarization within every cycle, the packed GPU frame (float32, as on the GPU) against
 * the float64 CPU evaluation, a seamless H_A loop, and the GLSL twin's layout constants.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { ATRIAL_FIBRILLATION } from '../../../src/lab/sim/scenarios/library';
import { AF_MAX_ROTORS, AF_STRIDE, AF_UPSTROKE_MS, AfModel, afAp, afTauPacked } from '../../../src/lab/sim/source/afField';
import { buildKernel } from '../../../src/lab/sim/source/voxelEdl';
import type { GeometryBundle, Vec3 } from '../../../src/lab/sim/types';
import { COMP, TISSUE } from '../../../src/lab/sim/types';
import { GLSL_BEATS } from '../../../src/lab/view3d/shaders/chunks';

let geo: GeometryBundle;
let m: AfModel;
const pts: Vec3[] = [];

beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url))));
  m = new AfModel(geo.grid, ATRIAL_FIBRILLATION.rhythm.af!);
  const g = geo.grid, [nx, ny] = g.dims;
  for (let v = 0, k = 0; v < g.tissue.length; v++) {
    if (g.tissue[v] !== TISSUE.LA && g.tissue[v] !== TISSUE.RA) continue;
    if (k++ % 97) continue;
    pts.push([g.originMm[0] + (v % nx) * g.hMm, g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm, g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm]);
  }
});

describe('AF rotor field', () => {
  it('places every rotor and rounds its cycle to an integer count per loop (100–172 ms)', () => {
    expect(m.n).toBe(5);
    for (let i = 0; i < m.n; i++) {
      const cl = m.cycleMs(i);
      expect(Math.abs(m.periodMs / cl - Math.round(m.periodMs / cl))).toBeLessThan(1e-9);
      expect(cl).toBeGreaterThan(100);
      expect(cl).toBeLessThan(172);
    }
  });

  it('is exactly periodic in the loop length', () => {
    for (const p of pts.slice(0, 40))
      for (const t of [123.4, 4567.8]) {
        const a = m.tauAt(p, t)[0], b = m.tauAt(p, t + m.periodMs)[0], c = m.tauAt(p, t + 3 * m.periodMs)[0];
        expect(Math.abs(a - b)).toBeLessThan(1e-6);
        expect(Math.abs(a - c)).toBeLessThan(1e-6);
      }
  });

  it('every point repolarizes within its cycle (s < 0.05 at both ends of the cycle, plateau > 0.8)', () => {
    const frame = new Float64Array(AF_STRIDE * AF_MAX_ROTORS);
    m.pack(0, frame);
    for (let i = 0; i < m.n; i++) {
      const rho = frame[i * AF_STRIDE + 3], tauRep = frame[i * AF_STRIDE + 16];
      expect(afAp(m.cycleMs(i) - AF_UPSTROKE_MS - 0.5, rho, 2.5, tauRep, 0.3)).toBeLessThan(0.05);
      expect(afAp(-AF_UPSTROKE_MS, rho, 2.5, tauRep, 0.3)).toBeLessThan(0.05);
      expect(afAp(rho / 2, rho, 2.5, tauRep, 0.3)).toBeGreaterThan(0.8);
    }
  });

  it('the packed frame in float32 (as the GPU gets it) gives the same local time as the float64 CPU path (|Δτ| < 0.1 ms)', () => {
    const f32 = new Float32Array(AF_STRIDE * AF_MAX_ROTORS), r32 = new Float64Array(3);
    let worst = 0, n = 0;
    for (const t of [10, 2500.5, 7777.7, 123456.7]) {
      const nr = m.pack(t, f32);
      for (const p of pts) {
        afTauPacked(f32, nr, p[0], p[1], p[2], r32);
        const d = Math.abs(r32[0] - m.tauAt(p, t)[0]);
        if (d > 50) continue; // the two sides of a phase wrap (θ within float eps of 2πk) — same instant, either side
        worst = Math.max(worst, d);
        n++;
      }
    }
    expect(n).toBeGreaterThan(100);
    expect(worst).toBeLessThan(0.1);
  });

  it('H_A loop: non-zero and seamless where it wraps', () => {
    const loop = m.buildLoop(buildKernel(geo.grid, COMP.Atrial), 1);
    let peak = 0, maxStep = 0;
    for (let i = 0; i < loop.n; i++) {
      const j = (i + 1) % loop.n;
      peak = Math.max(peak, Math.hypot(loop.H[3 * i], loop.H[3 * i + 1], loop.H[3 * i + 2]));
      if (j === 0) continue;
      maxStep = Math.max(maxStep, Math.hypot(loop.H[3 * j] - loop.H[3 * i], loop.H[3 * j + 1] - loop.H[3 * i + 1], loop.H[3 * j + 2] - loop.H[3 * i + 2]));
    }
    const e = 3 * (loop.n - 1);
    const seam = Math.hypot(loop.H[0] - loop.H[e], loop.H[1] - loop.H[e + 1], loop.H[2] - loop.H[e + 2]);
    expect(peak).toBeGreaterThan(0);
    expect(seam).toBeLessThanOrEqual(maxStep * 1.05);
  });

  it('the GLSL twin uses the same packed layout and constants', () => {
    expect(AF_STRIDE).toBe(5 * 4);
    expect(GLSL_BEATS).toContain(`uniform vec4 uAf[${AF_MAX_ROTORS * 5}]`);
    expect(GLSL_BEATS).toContain(`- ${AF_UPSTROKE_MS.toFixed(1)}`);
    // per rotor: (anchor, rho) (core, psi) (e1, omega) (e2, k) (tauRep, tauUp, slope, 0)
    for (const frag of [
      'uAf[i * 5].xyz',
      'uAf[o + 1].w - uAf[o + 3].w * length(d)',
      'atan(dot(d, uAf[o + 3].xyz), dot(d, uAf[o + 2].xyz) + 1e-9)',
      'ph / uAf[o + 2].w',
      'uAf[o].w, uAf[o + 4].x',
    ])
      expect(GLSL_BEATS).toContain(frag);
  });
});
