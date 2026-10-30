/**
 * Blind measurements vs model truth on generated beats (plan "测量准确性": detected boundaries within 10 ms of
 * BeatTruth). Covers three heart rates and several parameter sets on the stub heart.
 */
import { describe, expect, it } from 'vitest';
import type { EngineParams } from '../../../../src/lab/sim/conduction/params';
import { buildEngineSync } from '../../../../src/lab/sim/engine';
import { measureEngineBeat } from '../../../../src/lab/sim/measure/beat';
import { measureBeat, tangentEnd } from '../../../../src/lab/sim/measure/measure';
import { buildStubGeometry } from '../../../../src/lab/sim/stub/stubGeometry';
import { LEADS } from '../../../../src/lab/sim/types';

const geo = buildStubGeometry(2);
const VARIANTS: Partial<EngineParams>[] = [
  {},
  { purkinjeExtent: 0.5, vMyoTransMps: 0.3 },
  { apVentricular: { tauUpMs: 2.5, tauRepMs: 18, plateauSlope: 0.1, lowpassHz: 150 } },
  { gAbMs: 65, gTmMs: 30, poseTiltDeg: -20, poseRollDeg: 15 },
];

describe('measureBeat vs model truth', () => {
  for (const params of VARIANTS) {
    it(`fiducials within 10 ms at 50 / 75 / 150 bpm: ${JSON.stringify(params)}`, () => {
      const e = buildEngineSync(geo, params);
      for (const bpm of [50, 75, 150]) {
        e.setHeartRate(bpm);
        const evs = e.rhythm.eventsUntil(0);
        const last = evs.length ? evs[evs.length - 1].tMs : 0;
        const mb = measureEngineBeat(e, last + 3 * (60000 / bpm) + 400, { ventricularOnlyLeads: bpm > 120 });
        const f = mb.m.fiducials, tr = mb.truth!;
        const errs = {
          pOn: f.pOn! - tr.pOn!, pOff: f.pOff! - tr.pOff!, qrsOn: f.qrsOn - tr.qrsOn!, qrsOff: f.qrsOff - tr.qrsOff!, tEnd: f.tEnd - tr.tEnd!,
        };
        for (const [k, d] of Object.entries(errs)) expect(Math.abs(d), `${k} @${bpm}`).toBeLessThanOrEqual(10);
        expect(mb.m.prMs).toBeCloseTo(f.qrsOn - f.pOn!, 9);
        expect(mb.m.qtcFridericiaMs).toBeCloseTo(mb.m.qtMs / Math.cbrt(60 / bpm), 0);
      }
    });
  }

  it('Einthoven-consistent axis and per-lead measures on a generated beat', () => {
    const e = buildEngineSync(geo);
    const mb = measureEngineBeat(e, 3000);
    const L = mb.m.leads;
    // I + III = II for net areas (linear measure)
    expect(L.I.netQrsArea + L.III.netQrsArea).toBeCloseTo(L.II.netQrsArea, 3);
    expect(L.aVR.netTArea + L.aVL.netTArea + L.aVF.netTArea).toBeCloseTo(0, 3);
    const axis = (Math.atan2((2 * L.aVF.netQrsArea) / Math.sqrt(3), L.I.netQrsArea) * 180) / Math.PI;
    expect(mb.m.axisQrsDeg).toBeCloseTo(axis, 9);
    for (const l of LEADS) {
      expect(L[l].rAmp).toBeGreaterThanOrEqual(0);
      expect(L[l].sAmp).toBeGreaterThanOrEqual(0);
      expect(L[l].qAmp === 0 || L[l].qAmp >= 0.03).toBe(true);
      expect(L[l].qDurMs).toBeLessThanOrEqual(40);
    }
    expect(mb.m.vcg.svgMvMs).toBeGreaterThan(0);
  });

  it('detects a synthetic q-R-s complex and a tangent T end', () => {
    const n = 600, fs = 1000;
    const data = new Float32Array(12 * n);
    const hV = new Float32Array(3 * n), hA = new Float32Array(3 * n);
    // H along +X only: QRS = q (−0.1) then R (+1) then s (−0.2), T = Gaussian
    for (let i = 0; i < n; i++) {
      const t = i;
      const qrs = -0.1 * Math.exp(-(((t - 105) / 4) ** 2)) + 1.0 * Math.exp(-(((t - 120) / 6) ** 2)) - 0.2 * Math.exp(-(((t - 138) / 5) ** 2));
      const T = 0.4 * Math.exp(-(((t - 350) / 40) ** 2));
      hV[3 * i] = qrs + T;
    }
    for (let l = 0; l < 12; l++) for (let i = 0; i < n; i++) data[l * n + i] = hV[3 * i] * (l === 0 ? 1 : 0.5);
    const m = measureBeat({ data, n, fsHz: fs, t0Ms: 0 }, { hA, hV }, { aMs: null, vMs: 60, rrMs: 800, endMs: 590 });
    expect(m.leads.I.qAmp).toBeGreaterThan(0.05);
    expect(m.leads.I.rAmp).toBeCloseTo(1, 1);
    expect(m.leads.I.sAmp).toBeGreaterThan(0.1);
    const te = tangentEnd(hV.filter((_, k) => k % 3 === 0), 0, 200, 590, 1);
    expect(te.valid).toBe(true);
    // Gaussian T: tangent at the inflection (μ + σ/√2) hits zero at μ + √2·σ
    expect(te.tEndIdx).toBeCloseTo(350 + Math.SQRT2 * 40, 0);
  });
});
