import { describe, expect, it } from 'vitest';
import { AP_ATRIAL, AP_GLSL, AP_VENTRICULAR, apValue, MIN_TAU_UP_MS, PLATEAU_REF_MS, sanitizeAp } from '../../../../src/lab/sim/conduction/ap';
import { apdScaleFor, buildApdField, maxVentricularApd, transmuralDepth, ventricularApd } from '../../../../src/lab/sim/conduction/apd';
import { DEFAULT_ENGINE_PARAMS } from '../../../../src/lab/sim/conduction/params';
import { buildStubGeometry } from '../../../../src/lab/sim/stub/stubGeometry';
import { TISSUE } from '../../../../src/lab/sim/types';

describe('AP template', () => {
  it('has the documented shape', () => {
    const ap = AP_VENTRICULAR;
    expect(ap.tauUpMs).toBeGreaterThanOrEqual(MIN_TAU_UP_MS);
    expect(apValue(-30, 0, 250, ap)).toBeLessThan(1e-4);
    expect(apValue(0, 0, 250, ap)).toBeCloseTo(0.5, 3);
    expect(apValue(100, 0, 250, ap)).toBeCloseTo(1 - (ap.plateauSlope * 100) / PLATEAU_REF_MS, 2);
    expect(apValue(250, 0, 250, ap)).toBeCloseTo(0.5 * (1 - (ap.plateauSlope * 250) / PLATEAU_REF_MS), 3);
    expect(apValue(250 + 10 * ap.tauRepMs, 0, 250, ap)).toBeLessThan(1e-3);
  });
  it('atrial AP is triangular (slow repolarization 30–50 ms, steeper plateau decline)', () => {
    expect(AP_ATRIAL.tauRepMs).toBeGreaterThanOrEqual(30);
    expect(AP_ATRIAL.tauRepMs).toBeLessThanOrEqual(50);
    expect(AP_ATRIAL.plateauSlope).toBeGreaterThan(AP_VENTRICULAR.plateauSlope);
  });
  it('sanitize enforces τu ≥ 2.5 ms and τr > τu', () => {
    const s = sanitizeAp({ tauUpMs: 1, tauRepMs: 1, plateauSlope: 2, lowpassHz: 150 });
    expect(s.tauUpMs).toBe(2.5);
    expect(s.tauRepMs).toBeGreaterThan(s.tauUpMs);
    expect(s.plateauSlope).toBeLessThan(1);
  });
  it('exports the identical formula for the GPU', () => {
    expect(AP_GLSL).toContain('float apValue(');
    expect(AP_GLSL).toContain(PLATEAU_REF_MS.toFixed(1));
  });
});

describe('APD map', () => {
  const p = DEFAULT_ENGINE_PARAMS;
  it('longest ventricular APD stays ≈ 270–290 ms with centred gradients', () => {
    const geo = buildStubGeometry(2);
    const apd = buildApdField(geo.grid, p);
    let mx = 0, mn = Infinity, sum = 0, n = 0;
    for (let v = 0; v < apd.apdRefMs.length; v++) {
      const t = geo.grid.tissue[v];
      if (t !== TISSUE.LV && t !== TISSUE.RV && t !== TISSUE.Septum) continue;
      mx = Math.max(mx, apd.apdRefMs[v]);
      mn = Math.min(mn, apd.apdRefMs[v]);
      sum += apd.apdRefMs[v];
      n++;
    }
    expect(mx).toBeGreaterThanOrEqual(260);
    expect(mx).toBeLessThanOrEqual(290);
    expect(maxVentricularApd(p)).toBeLessThanOrEqual(290);
    expect(Math.abs(sum / n - p.apdRefMs)).toBeLessThan(25); // centred around APD_ref
    expect(mn).toBeGreaterThan(150);
    for (let v = 0; v < apd.apdRefMs.length; v++) {
      const t = geo.grid.tissue[v];
      if (t === TISSUE.LA || t === TISSUE.RA) {
        expect(apd.apdRefMs[v]).toBeGreaterThanOrEqual(150);
        expect(apd.apdRefMs[v]).toBeLessThanOrEqual(250);
      }
    }
  });
  it('septum is LV-like and measured from the nearest endocardium', () => {
    expect(transmuralDepth(TISSUE.Septum, 0.1)).toBeCloseTo(0.1, 6);
    expect(transmuralDepth(TISSUE.Septum, 0.9)).toBeCloseTo(0.1, 6);
    expect(ventricularApd(TISSUE.Septum, 0.5, 0.0, p)).toBeCloseTo(ventricularApd(TISSUE.Septum, 0.5, 1.0, p), 6);
    expect(ventricularApd(TISSUE.Septum, 0.5, 0.0, p)).toBeCloseTo(ventricularApd(TISSUE.LV, 0.5, 0.0, p), 6);
    // endocardium longer than epicardium, base longer than apex
    expect(ventricularApd(TISSUE.LV, 0.5, 0, p)).toBeGreaterThan(ventricularApd(TISSUE.LV, 0.5, 1, p));
    expect(ventricularApd(TISSUE.LV, 1, 0.5, p)).toBeGreaterThan(ventricularApd(TISSUE.LV, 0, 0.5, p));
  });
  it('rate adaptation follows (RR/RRref)^(1/3)', () => {
    expect(apdScaleFor(800, 800, 1 / 3)).toBe(1);
    expect(apdScaleFor(400, 800, 1 / 3)).toBeCloseTo(Math.cbrt(0.5), 9);
  });
});
