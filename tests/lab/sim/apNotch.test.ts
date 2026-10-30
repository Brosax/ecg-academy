/**
 * Phase-1 AP notch (source/apNotch.ts, tissue.notch): AP shape, exactness of the histogram synthesis against the direct
 * per-voxel sum, closure (Σc ≡ 0 → a uniform notch is invisible), sign (an epicardial notch points H outward through
 * the epicardium) and bit-identity without a notch.
 */
import { describe, expect, it } from 'vitest';
import { AP_VENTRICULAR, apValue } from '../../../src/lab/sim/conduction/ap';
import { buildApdField } from '../../../src/lab/sim/conduction/apd';
import { buildVentricularActivation } from '../../../src/lab/sim/conduction/graph';
import { DEFAULT_ENGINE_PARAMS } from '../../../src/lab/sim/conduction/params';
import { notchField } from '../../../src/lab/sim/scenarios/notch';
import type { NotchField, NotchShape } from '../../../src/lab/sim/source/apNotch';
import { apValueNotched, notchProfile, notchShapeOf, sanitizeNotch } from '../../../src/lab/sim/source/apNotch';
import { buildKernel, synthesizeDirect, synthesizeTemplate } from '../../../src/lab/sim/source/voxelEdl';
import { buildStubGeometry } from '../../../src/lab/sim/stub/stubGeometry';
import { COMP, TISSUE } from '../../../src/lab/sim/types';
import { slabGrid } from './helpers/syntheticGrid';

const AP = AP_VENTRICULAR;

describe('notched action potential', () => {
  const shape: NotchShape = { onsetMs: 6, onsetTauMs: 2.5, domeTauMs: 20, domeRecovery: 1 };
  it('depth 0 is the plain AP exactly', () => {
    for (let t = -20; t < 400; t += 7) expect(apValueNotched(t, 0, 250, AP, shape, 0)).toBe(apValue(t, 0, 250, AP));
  });
  it('spike and dome: a notch right after the upstroke, the dome back within 5 τ_dome', () => {
    const d = 0.4;
    let tMin = 0, vMin = Infinity;
    for (let t = 8; t < 60; t += 0.5) {
      const v = apValueNotched(t, 0, 250, AP, shape, d);
      if (v < vMin) [vMin, tMin] = [v, t];
    }
    expect(tMin).toBeLessThan(25);
    expect(apValue(tMin, 0, 250, AP) - vMin).toBeGreaterThan(0.6 * d);
    expect(Math.abs(apValueNotched(6 + 5 * 20 + 10, 0, 250, AP, shape, d) - apValue(116, 0, 250, AP))).toBeLessThan(0.01);
  });
  it('partial loss of the dome keeps the plateau depressed by (1 − r)·d until repolarization', () => {
    const lost = { ...shape, domeRecovery: 0.25 };
    expect(notchProfile(200, lost)).toBeCloseTo(0.75, 3);
    expect(apValue(200, 0, 300, AP) - apValueNotched(200, 0, 300, AP, lost, 0.4)).toBeCloseTo(0.3 * apValue(200, 0, 300, AP) / (1 - 0.15 * 200 / 200), 1);
    // repolarization time unchanged: both are ≈ 0 after ρ + 6 τr
    expect(Math.abs(apValueNotched(300 + 6 * AP.tauRepMs, 0, 300, AP, lost, 0.4))).toBeLessThan(0.01);
  });
  it('sanitizeNotch keeps every synthesis table bounded (τ_on ≤ τr/2, τ_dome ≥ τ_on, 0 ≤ r ≤ 1)', () => {
    const s = sanitizeNotch({ onsetMs: -3, onsetTauMs: 40, domeTauMs: 1, domeRecovery: 2 }, AP);
    expect(s.onsetMs).toBe(0);
    expect(s.onsetTauMs).toBe(AP.tauRepMs / 2);
    expect(s.domeTauMs).toBe(s.onsetTauMs);
    expect(s.domeRecovery).toBe(1);
  });
});

describe('notch synthesis', () => {
  const geo = buildStubGeometry(2);
  const va = buildVentricularActivation(geo, DEFAULT_ENGINE_PARAMS);
  const apdF = buildApdField(geo.grid, DEFAULT_ENGINE_PARAMS);
  const kv = buildKernel(geo.grid, COMP.Ventricular);
  const base = { key: 'x', kernel: kv, tAct: va.field.tAct, apdRefMs: apdF.apdRefMs, apdScale: 1, ap: AP, gain: 1e-3 };

  it('without a notch (absent or null) the template is bit-identical', () => {
    const a = synthesizeTemplate(base), b = synthesizeTemplate({ ...base, notch: null });
    expect(Array.from(b.raw)).toEqual(Array.from(a.raw));
    expect(Array.from(b.template.H)).toEqual(Array.from(a.template.H));
    expect(notchField(geo.grid, undefined)).toBeNull();
    expect(notchField(geo.grid, { notch: [] })).toBeNull();
  });

  // fast dome (τ < τr), slow dome (τ > τr), full and partial recovery, two RR scales
  const cases: [string, Parameters<typeof notchShapeOf>[0], number][] = [
    ['fast full dome', { depth: 0.5, domeTauMs: 15 }, 1],
    ['slow partial dome', { depth: 0.6, domeTauMs: 80, domeRecovery: 0.3 }, 1],
    ['τ_dome = τr', { depth: 0.4, domeTauMs: AP.tauRepMs, domeRecovery: 0.7 }, 0.8],
    ['loss of dome', { depth: 0.3, domeTauMs: 40, domeRecovery: 0 }, 0.8],
  ];
  for (const [name, spec, scale] of cases)
    it(`histogram synthesis = direct per-voxel sum (< 0.5 % of peak): ${name}`, () => {
      const notch = notchField(geo.grid, { notch: [{ regions: ['LV_LATERAL', 'LV_ANTERIOR', 'RVOT'], layer: 'epicardial', ...spec }] })!;
      let nNotched = 0;
      for (const v of kv.voxels) if (notch.cls[v]) nNotched++;
      expect(nNotched).toBeGreaterThan(50);
      const inp = { ...base, apdScale: scale, notch };
      const { template, raw } = synthesizeTemplate(inp);
      const direct = synthesizeDirect(inp, template.t0Ms, template.n);
      const plain = synthesizeDirect({ ...base, apdScale: scale }, template.t0Ms, template.n);
      let peak = 0, err = 0, dNotch = 0;
      for (let i = 0; i < raw.length; i++) {
        peak = Math.max(peak, Math.abs(direct[i]));
        err = Math.max(err, Math.abs(direct[i] - raw[i]));
        dNotch = Math.max(dNotch, Math.abs(direct[i] - plain[i]));
      }
      console.log(`${name}: notch effect ${((100 * dNotch) / peak).toFixed(1)} % of peak, synthesis error ${((100 * err) / peak).toFixed(3)} %`);
      expect(dNotch / peak).toBeGreaterThan(0.02); // the notch really changes H
      expect(err / peak).toBeLessThan(5e-3);
      const m = (i: number) => Math.hypot(template.H[3 * i], template.H[3 * i + 1], template.H[3 * i + 2]);
      expect(m(0) / peak).toBeLessThan(1e-3);
      expect(m(template.n - 1) / peak).toBeLessThan(1e-3);
    });

  it('a notch shared by every voxel with the same activation time is invisible (Σc ≡ 0)', () => {
    const g = slabGrid();
    const k = buildKernel(g, COMP.Ventricular);
    const tAct = new Float32Array(g.tissue.length).fill(Infinity);
    for (let v = 0; v < g.tissue.length; v++) if (g.tissue[v] === TISSUE.LV) tAct[v] = 10;
    const notch: NotchField = { cls: new Uint8Array(g.tissue.length).fill(1), depth: new Float32Array(g.tissue.length).fill(0.5), shapes: [notchShapeOf({ depth: 0.5, domeTauMs: 20 })] };
    const { raw } = synthesizeTemplate({ key: 'u', kernel: k, tAct, apdRefMs: new Float32Array(g.tissue.length).fill(250), apdScale: 1, ap: AP, gain: 1e-3, notch });
    let mx = 0;
    for (const x of raw) mx = Math.max(mx, Math.abs(x));
    expect(mx).toBeLessThan(1e-9);
  });

  it('an epicardial notch points H outward through the epicardium (+z on the slab): the J deflection', () => {
    const g = slabGrid();
    const k = buildKernel(g, COMP.Ventricular);
    const nz = g.dims[0] * g.dims[1];
    const tAct = new Float32Array(g.tissue.length).fill(Infinity);
    for (let v = 0; v < g.tissue.length; v++) if (g.tissue[v] === TISSUE.LV) tAct[v] = 5 + 3 * Math.floor(v / nz);
    const apd = new Float32Array(g.tissue.length).fill(250);
    const notch = notchField(g, { notch: [{ layer: 'epicardial', depth: 0.4, domeTauMs: 20 }] })!;
    const inp = { key: 'e', kernel: k, tAct, apdRefMs: apd, apdScale: 1, ap: AP, gain: 1e-3 };
    const a = synthesizeTemplate(inp).template, b = synthesizeTemplate({ ...inp, notch }).template;
    expect(b.t0Ms).toBe(a.t0Ms);
    let zMax = 0, xyMax = 0, tPk = 0;
    for (let i = 0; i < a.n; i++) {
      const dz = b.H[3 * i + 2] - a.H[3 * i + 2];
      if (dz > zMax) [zMax, tPk] = [dz, a.t0Ms + i];
      xyMax = Math.max(xyMax, Math.abs(b.H[3 * i] - a.H[3 * i]), Math.abs(b.H[3 * i + 1] - a.H[3 * i + 1]));
      expect(dz).toBeGreaterThan(-1e-6);
    }
    expect(zMax).toBeGreaterThan(0);
    expect(xyMax).toBeLessThan(1e-6 + 1e-3 * zMax);
    // the deflection follows the epicardial upstroke (last layer at 5 + 3·11 = 38 ms) by the notch onset
    expect(tPk).toBeGreaterThan(38);
    expect(tPk).toBeLessThan(38 + 30);
  });
});
