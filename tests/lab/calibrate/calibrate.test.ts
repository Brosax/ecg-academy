/**
 * Headless calibration of the normal heart ON THE REALISTIC HRA GEOMETRY (gate G1): Nelder–Mead over the EngineParams
 * knobs (src/sim/calibrate) with the oracle loss (tests/oracle/normalOracles) plus calibration-only emphasis terms,
 * then writes
 *   tests/out/calibration.json      — best params, knob values, losses, oracle report
 *   tests/out/ecg-hra-calibration.png — 12-lead printout (3 × 4 + II rhythm strip, 25 mm/s, 10 mm/mV) of the best params
 *
 * Skipped by `npm test`. Runs with `npm run calibrate` (npm sets npm_lifecycle_event=calibrate) or CALIBRATE=1:
 *   CALIBRATE=1 node node_modules/vitest/vitest.mjs run tests/calibrate
 * Env: CALIBRATE_EVALS (per Nelder–Mead round, default 300), CALIBRATE_ROUNDS (restarts from the best, default 2),
 *      CALIBRATE_FROM = 'scenario' (default: start from NORMAL_SCENARIO.params) | 'defaults' (DEFAULT_ENGINE_PARAMS).
 *
 * Knob ranges are the cited physiological ranges (src/sim/conduction/params.ts, docs/research), and the pose is kept
 * within 15° of the data-derived anatomical pose of the baked heart (each Euler knob ±15° AND the total rotation
 * angle ≤ 15°, enforced by a penalty) so the 3D heart stays anatomically oriented in the torso.
 * The winning values are copied by hand (rounded) into src/sim/scenarios/normal.ts with a provenance comment.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { Knob } from '../../../src/lab/sim/calibrate/calibrate';
import { calibrate } from '../../../src/lab/sim/calibrate/calibrate';
import { plot12Lead } from '../../../src/lab/sim/calibrate/ecgPlot';
import { encodePng } from '../../../src/lab/sim/calibrate/png';
import type { EngineParams } from '../../../src/lab/sim/conduction/params';
import { DEFAULT_ENGINE_PARAMS } from '../../../src/lab/sim/conduction/params';
import { adjustPose, buildEngineSync } from '../../../src/lab/sim/engine';
import { mat3Mul, mat3Transpose } from '../../../src/lab/sim/frame';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { NORMAL_SCENARIO } from '../../../src/lab/sim/scenarios/normal';
import { buildKernel } from '../../../src/lab/sim/source/voxelEdl';
import type { GeometryBundle, LeadName, SimEngine } from '../../../src/lab/sim/types';
import { COMP } from '../../../src/lab/sim/types';
import type { OracleReport } from '../oracle/normalOracles';
import { formatOracleReport, oracleLoss, runNormalOracles } from '../oracle/normalOracles';

const RUN = process.env.CALIBRATE === '1' || process.env.npm_lifecycle_event === 'calibrate';
const OUT = new URL('../../out/lab/', import.meta.url);
const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);

/** Pose deltas are bounded by this (deg) — per Euler knob and as the total rotation angle. */
export const MAX_POSE_DEG = 15;

async function loadGeometry(): Promise<GeometryBundle> {
  return loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
}

const simple = (key: keyof EngineParams & string, lo: number, hi: number, step: number): Knob => ({
  key, lo, hi, step,
  read: (p) => p[key] as number,
  write: (p, v) => ({ ...p, [key]: v }),
});
const ap = (field: 'tauRepMs' | 'plateauSlope', lo: number, hi: number, step: number): Knob => ({
  key: field, lo, hi, step,
  read: (p) => p.apVentricular[field],
  write: (p, v, base) => ({ ...p, apVentricular: { ...(p.apVentricular ?? base.apVentricular), [field]: v } }),
});

/**
 * HRA knobs, by influence (plan "标定"), each range = the cited range of the parameter:
 * pose roll / tilt / azimuth (±15°), fascicle-terminal delays (≥ 0: extra Purkinje arborization delay; the RBB knob
 * keeps the original −5 … 20 ms septal-offset range), Purkinje mask extent, transmural velocity (human 0.15–0.45 m/s),
 * gain, APD_ref (200–260 ms per subject), G_ab (40–65), G_tm (20–30), plateau slope (Kloosterman 5–40 %),
 * repolarization time constant τr (unsourced; DM suggests 10–20, stub fit 26–28 → 16–30), atrial gain.
 */
export const HRA_KNOBS: readonly Knob[] = [
  simple('poseRollDeg', -MAX_POSE_DEG, MAX_POSE_DEG, 5),
  simple('poseTiltDeg', -MAX_POSE_DEG, MAX_POSE_DEG, 5),
  simple('poseAzimuthDeg', -MAX_POSE_DEG, MAX_POSE_DEG, 5),
  simple('lafOffsetMs', 0, 20, 3),
  simple('lpfOffsetMs', 0, 20, 3),
  simple('lsfOffsetMs', 0, 20, 3),
  simple('rbbOffsetMs', -5, 20, 3),
  simple('purkinjeExtent', 0.6, 0.9, 0.04),
  simple('vMyoTransMps', 0.25, 0.45, 0.04),
  simple('gainMvPerMm2', 4e-4, 2e-3, 1.2e-4),
  simple('apdRefMs', 200, 260, 8),
  simple('gAbMs', 40, 65, 6),
  simple('gTmMs', 20, 30, 3),
  ap('plateauSlope', 0.05, 0.4, 0.06),
  ap('tauRepMs', 16, 30, 3),
  simple('atrialGainFactor', 0.15, 0.6, 0.05),
];

/** Total rotation angle (deg) of the adjusted pose relative to the baked anatomical pose. */
export function poseDeltaDeg(geo: GeometryBundle, p: Partial<EngineParams>): number {
  const q = { ...DEFAULT_ENGINE_PARAMS, ...p };
  const R1 = adjustPose(geo.pose, q).R;
  const D = mat3Mul(R1, mat3Transpose(geo.pose.R));
  const c = (D[0] + D[4] + D[8] - 1) / 2;
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/**
 * Calibration-only emphasis on top of oracleLoss (the oracle weights stay untouched): the soft morphology targets a
 * reader judges first (R progression, transition V3–V4, robust septal q, a visible P wave — P(II) 0.08–0.20 mV, so the atrial gain cannot be traded away), a margin on the fast-rate QTc (its QRS onset
 * is fragile at 150 bpm when the P wave abuts the V event), and the pose bound.
 */
export function emphasisLoss(r: OracleReport, poseDeg: number): number {
  const L = r.beat.m.leads;
  let s = 0;
  const pre: LeadName[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  const t = pre.indexOf((r.beat.m.transitionLead ?? 'V6') as LeadName);
  if (t < 2) s += 3 * (2 - t);
  else if (t > 3) s += 3 * (t - 3);
  for (let i = 1; i < 4; i++) {
    const d = L[pre[i]].rAmp - L[pre[i - 1]].rAmp;
    if (d < 0.05) s += Math.min(3, (0.05 - d) / 0.1);
  }
  const q = Math.max(L.I.qAmp, L.aVL.qAmp), q56 = Math.max(L.V5.qAmp, L.V6.qAmp);
  if (q < 0.06) s += (0.06 - q) / 0.01;
  if (q56 < 0.06) s += (0.06 - q56) / 0.01;
  const pII = L.II.pAmp;
  if (pII < 0.08) s += (0.08 - pII) / 0.01;
  else if (pII > 0.2) s += (pII - 0.2) / 0.01;
  const fast = r.fast?.m.qtcFridericiaMs ?? 0;
  if (fast > 425) s += (fast - 425) / 5;
  if (poseDeg > MAX_POSE_DEG) s += 50 + (10 * (poseDeg - MAX_POSE_DEG)) / 1;
  return s;
}

/** 10 s of steady 12-lead ECG at the engine's current rate (after settling). */
function tenSeconds(engine: SimEngine): Float32Array {
  const evs = engine.rhythm.eventsUntil(0);
  const t0 = (evs.length ? evs[evs.length - 1].tMs : 0) + 4000;
  const n = 10000;
  const out = new Float32Array(12 * n);
  engine.sampleLeads(t0, n, out);
  return out;
}

describe.skipIf(!RUN)('calibration on the HRA heart (normal sinus rhythm)', () => {
  it('runs Nelder–Mead and writes tests/out/calibration.json + ecg-hra-calibration.png', async () => {
    const maxEvals = Number(process.env.CALIBRATE_EVALS ?? 300);
    const rounds = Number(process.env.CALIBRATE_ROUNDS ?? 2);
    const geo = await loadGeometry();
    const kernels = { atrial: buildKernel(geo.grid, COMP.Atrial), ventricular: buildKernel(geo.grid, COMP.Ventricular) };
    const t0 = performance.now();
    const evaluate = (p: Partial<EngineParams>) => {
      const e = buildEngineSync(geo, p, { prep: { kernels } });
      const r = runNormalOracles(e);
      return { loss: oracleLoss(r) + emphasisLoss(r, poseDeltaDeg(geo, p)) };
    };
    let start: Partial<EngineParams> = process.env.CALIBRATE_FROM === 'defaults' ? {} : { ...NORMAL_SCENARIO.params };
    const initialLoss = evaluate(start).loss;
    let res = calibrate({ evaluate, maxEvals, knobs: HRA_KNOBS, base: start, log: (s) => console.log(s) });
    for (let k = 1; k < rounds; k++) {
      start = res.params;
      const next = calibrate({ evaluate, maxEvals, knobs: HRA_KNOBS, base: start, log: (s) => console.log(`[round ${k + 1}] ${s}`) });
      if (next.finalLoss <= res.finalLoss) res = next;
    }
    const engine = buildEngineSync(geo, res.params, { prep: { kernels } });
    const report = runNormalOracles(engine);
    const text = formatOracleReport(report);
    const poseDeg = poseDeltaDeg(geo, res.params);
    console.log(
      `calibration: loss ${initialLoss.toFixed(2)} → ${res.finalLoss.toFixed(2)} in ${((performance.now() - t0) / 1000).toFixed(1)} s, ` +
        `pose delta ${poseDeg.toFixed(1)}°\n${JSON.stringify(res.params)}\n${text}`,
    );

    mkdirSync(OUT, { recursive: true });
    writeFileSync(
      new URL('calibration.json', OUT),
      JSON.stringify(
        {
          geometry: { hash: geo.hash, hMm: geo.grid.hMm, dims: geo.grid.dims },
          initialLoss,
          finalLoss: res.finalLoss,
          oracleLoss: oracleLoss(report),
          poseDeltaDeg: poseDeg,
          knobs: res.knobValues,
          params: res.params,
          timing: engine.timing,
          stats: engine.stats,
          hard: report.hard,
          soft: report.soft,
          activation: report.activation,
          beat: { ...report.beat.m, leads: report.beat.m.leads },
        },
        (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v),
        2,
      ),
    );
    engine.setHeartRate(75);
    const leads = tenSeconds(engine);
    const img = plot12Lead(leads, 10000, 1000, { title: `HRA CALIBRATION 75 BPM  25 MM/S  10 MM/MV  ${geo.hash}` });
    writeFileSync(new URL('ecg-hra-calibration.png', OUT), encodePng(img.width, img.height, img.rgb, (x) => deflateSync(x)));
    expect(res.finalLoss).toBeLessThanOrEqual(initialLoss);
  }, 3_600_000);
});
