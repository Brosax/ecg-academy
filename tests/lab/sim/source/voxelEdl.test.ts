import { describe, expect, it } from 'vitest';
import { AP_VENTRICULAR } from '../../../../src/lab/sim/conduction/ap';
import { buildApdField } from '../../../../src/lab/sim/conduction/apd';
import { fastestRoute } from '../../../../src/lab/sim/conduction/fastestRoute';
import { buildVentricularActivation } from '../../../../src/lab/sim/conduction/graph';
import { nearestVoxel } from '../../../../src/lab/sim/conduction/gridUtil';
import { DEFAULT_ENGINE_PARAMS } from '../../../../src/lab/sim/conduction/params';
import { buildKernel, gaussianLowpass, kernelAbsSum, kernelSum, synthesizeDirect, synthesizeTemplate } from '../../../../src/lab/sim/source/voxelEdl';
import { buildStubGeometry } from '../../../../src/lab/sim/stub/stubGeometry';
import type { SourceKernel } from '../../../../src/lab/sim/types';
import { COMP, TISSUE } from '../../../../src/lab/sim/types';
import { slabGrid } from '../helpers/syntheticGrid';

const relClosure = (k: SourceKernel) => {
  const s = kernelSum(k);
  return Math.hypot(s[0], s[1], s[2]) / kernelAbsSum(k);
};

describe('voxel-face EDL kernel', () => {
  it('Σ c_v ≡ 0 for both compartments (stub heart, h = 2 and 1.5 mm)', () => {
    for (const h of [2, 1.5]) {
      const g = buildStubGeometry(h).grid;
      for (const comp of [COMP.Atrial, COMP.Ventricular]) {
        const k = buildKernel(g, comp);
        expect(k.voxels.length).toBeGreaterThan(100);
        expect(relClosure(k)).toBeLessThan(1e-9);
      }
    }
  });

  it('only boundary voxels carry c, with outward normals', () => {
    const g = slabGrid();
    const k = buildKernel(g, COMP.Ventricular);
    for (let q = 0; q < k.voxels.length; q++) {
      const v = k.voxels[q];
      const kk = Math.floor(v / (g.dims[0] * g.dims[1]));
      const cz = k.c[3 * q + 2];
      if (kk === 4) expect(cz).toBeLessThan(0); // endocardial face points into the cavity (−z)
      if (kk === 11) expect(cz).toBeGreaterThan(0); // epicardial face points out (+z)
    }
    expect(relClosure(k)).toBeLessThan(1e-12);
  });
});

describe('template synthesis', () => {
  const g = slabGrid();
  const k = buildKernel(g, COMP.Ventricular);
  const apd = new Float32Array(g.tissue.length).fill(250);
  const base = { key: 't', kernel: k, apdRefMs: apd, apdScale: 1, ap: AP_VENTRICULAR, gain: 1e-3 };

  it('uniform s ⇒ H = 0 (closed surface)', () => {
    const tAct = new Float32Array(g.tissue.length).fill(Infinity);
    for (let v = 0; v < g.tissue.length; v++) if (g.tissue[v] === TISSUE.LV) tAct[v] = 10;
    const { template, raw } = synthesizeTemplate({ ...base, tAct });
    let mx = 0;
    for (let i = 0; i < raw.length; i++) mx = Math.max(mx, Math.abs(raw[i]), Math.abs(template.H[i]));
    expect(mx).toBeLessThan(1e-9);
  });

  it('endocardium-first activation ⇒ H points endo → epi (+z) during depolarization', () => {
    const tAct = new Float32Array(g.tissue.length).fill(Infinity);
    for (let v = 0; v < g.tissue.length; v++) if (g.tissue[v] === TISSUE.LV) tAct[v] = 5 + 3 * Math.floor(v / (g.dims[0] * g.dims[1]));
    const { template } = synthesizeTemplate({ ...base, tAct });
    let peak = 0;
    for (let i = 0; i < template.n; i++) {
      const t = template.t0Ms + i;
      if (t < 20 || t > 45) continue; // front crossing the wall
      const [x, y, z] = [template.H[3 * i], template.H[3 * i + 1], template.H[3 * i + 2]];
      expect(z).toBeGreaterThan(0);
      expect(Math.abs(x) + Math.abs(y)).toBeLessThan(1e-6 + 1e-6 * Math.abs(z));
      peak = Math.max(peak, z);
    }
    expect(peak).toBeGreaterThan(0);
  });

  it('histogram/convolution synthesis matches direct per-voxel evaluation (< 0.5 % of peak)', () => {
    const geo = buildStubGeometry(2);
    const va = buildVentricularActivation(geo, DEFAULT_ENGINE_PARAMS);
    const apdF = buildApdField(geo.grid, DEFAULT_ENGINE_PARAMS);
    const kv = buildKernel(geo.grid, COMP.Ventricular);
    for (const scale of [1, 0.8]) {
      const inp = { key: 'x', kernel: kv, tAct: va.field.tAct, apdRefMs: apdF.apdRefMs, apdScale: scale, ap: AP_VENTRICULAR, gain: 1e-3 };
      const { template, raw } = synthesizeTemplate(inp);
      const direct = synthesizeDirect(inp, template.t0Ms, template.n);
      let peak = 0, err = 0;
      for (let i = 0; i < raw.length; i++) {
        peak = Math.max(peak, Math.abs(direct[i]));
        err = Math.max(err, Math.abs(direct[i] - raw[i]));
      }
      expect(err / peak).toBeLessThan(5e-3);
      // the template starts and ends at ≈ 0 so beats superpose without steps
      const m = (i: number) => Math.hypot(template.H[3 * i], template.H[3 * i + 1], template.H[3 * i + 2]);
      expect(m(0) / peak).toBeLessThan(1e-3);
      expect(m(template.n - 1) / peak).toBeLessThan(1e-3);
    }
  });

  it('ventricular gradient ∫H dt is unchanged (< 10 %) when only the seeds change (fixed APD map)', () => {
    const geo = buildStubGeometry(2);
    const p = DEFAULT_ENGINE_PARAMS;
    const apdF = buildApdField(geo.grid, p);
    const kv = buildKernel(geo.grid, COMP.Ventricular);
    const normal = buildVentricularActivation(geo, p).field.tAct;
    // ectopic (PVC-like) beat: a single seed at the LV apex, muscle conduction only
    const apex = nearestVoxel(geo.grid, geo.landmarks.LV_APEX!, (v) => geo.grid.tissue[v] === TISSUE.LV).voxel;
    const ectopic = fastestRoute({ grid: geo.grid, comp: COMP.Ventricular, stencil: 50, vLongMps: p.vMyoLongMps, vTransMps: p.vMyoTransMps, seeds: [{ voxel: apex, tMs: 0 }] }).tAct;
    const synth = (tAct: Float32Array) =>
      synthesizeTemplate({ key: 'g', kernel: kv, tAct, apdRefMs: apdF.apdRefMs, apdScale: 1, ap: p.apVentricular, gain: p.gainMvPerMm2 }).template;
    const G = (tpl: ReturnType<typeof synth>) => {
      const s = [0, 0, 0];
      for (let i = 0; i < tpl.n; i++) for (let c = 0; c < 3; c++) s[c] += tpl.H[3 * i + c];
      return s;
    };
    const t1 = synth(normal), t2 = synth(ectopic);
    // the two beats really differ: wider QRS and a different QRS area vector
    expect(t2.truth.offMs - t2.truth.onMs).toBeGreaterThan(t1.truth.offMs - t1.truth.onMs + 20);
    const qrsArea = (t: typeof t1) => {
      const s = [0, 0, 0];
      for (let i = 0; i < t.n; i++) if (t.t0Ms + i <= t.truth.offMs + 5) for (let c = 0; c < 3; c++) s[c] += t.H[3 * i + c];
      return s;
    };
    const q1 = qrsArea(t1), q2 = qrsArea(t2);
    expect(Math.hypot(q1[0] - q2[0], q1[1] - q2[1], q1[2] - q2[2])).toBeGreaterThan(0.2 * Math.hypot(...q1));
    const g1 = G(t1), g2 = G(t2);
    const d = Math.hypot(g1[0] - g2[0], g1[1] - g2[1], g1[2] - g2[2]) / Math.hypot(...g1);
    console.log(`|G| normal ${Math.hypot(...g1).toFixed(2)} mV·ms, ectopic ${Math.hypot(...g2).toFixed(2)}, relative change ${(100 * d).toFixed(3)} %`);
    expect(Math.hypot(...g1)).toBeGreaterThan(10);
    expect(d).toBeLessThan(0.1);
  });
});

describe('zero-phase low-pass', () => {
  it('has unit DC gain and a symmetric impulse response', () => {
    const n = 101;
    const x = new Float32Array(3 * n);
    x[3 * 50] = 1;
    x.fill(0.25, 3 * 0, 3 * 10); // DC segment (component x, y, z interleaved)
    const y = gaussianLowpass(x, n, 1000, 150);
    for (let d = 1; d < 6; d++) expect(y[3 * (50 + d)]).toBeCloseTo(y[3 * (50 - d)], 7);
    let s = 0;
    for (let i = 40; i < 61; i++) s += y[3 * i];
    expect(s).toBeCloseTo(1, 5);
  });
});
