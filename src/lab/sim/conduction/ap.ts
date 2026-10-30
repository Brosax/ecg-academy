/**
 * Normalized transmembrane-potential (TMP) template, shared by the EDL source (CPU) and the 3D colouring (GPU):
 *
 *   s(t) = σ((t−δ)/τu) · (1 − a·(t−δ)/200 ms) · σ(−(t−ρ)/τr)
 *
 * δ = activation time, ρ = repolarization time (δ + APD·apdScale), a = plateau slope (fractional decline at 200 ms,
 * Kloosterman 2023: 5–40 %), τu = upstroke, τr = repolarization time constant. Logistic form after van Dam /
 * van Oosterom (docs/research/activation-physiology.md §4c). τu ≥ 2.5 ms together with the 150 Hz zero-phase low-pass
 * keeps the voxel staircase ripple ≈ 1 % (plan, "跨膜电位模板").
 *
 * view3d reads engine.fields.apVentricular / apAtrial and may use AP_GLSL so the shader evaluates the same function.
 */
import type { ApParams } from '../types';

/** Plateau slope reference time (ms): a = fractional decline after this long. */
export const PLATEAU_REF_MS = 200;
/** Lower bound on τu (ms) — sharper upstrokes alias on a 1–2 mm grid. */
export const MIN_TAU_UP_MS = 2.5;

/**
 * Ventricular AP: fast upstroke, plateau declining 15 % at 200 ms (Kloosterman 5–40 %; stub calibration ≈ 0.15),
 * repolarization sigmoid τr = 26 ms (phase 3 10→90 % ≈ 115 ms). τr is unsourced (DM "Unsourced": 10–20 ms suggested,
 * to be fitted to the T wave); on the stub heart τr ≈ 14 ms gave a T wave half as wide and twice as tall as normal
 * (T/QRS ≈ 0.9), τr ≈ 26–28 ms gives T/QRS ≈ 0.4–0.5.
 */
export const AP_VENTRICULAR: ApParams = { tauUpMs: 2.5, tauRepMs: 26, plateauSlope: 0.15, lowpassHz: 150 };
/** Atrial AP: triangular (steeper plateau decline, slow repolarization τr 30–50 ms). */
export const AP_ATRIAL: ApParams = { tauUpMs: 2.5, tauRepMs: 35, plateauSlope: 0.3, lowpassHz: 150 };

/** Numerically safe logistic. */
export function sigmoid(x: number): number {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Clamps a parameter set to the supported range (τu ≥ 2.5 ms, τr ≥ max(5, 1.5·τu) ms, 0 ≤ a < 0.95). */
export function sanitizeAp(ap: ApParams): ApParams {
  const tauUpMs = Math.max(MIN_TAU_UP_MS, ap.tauUpMs);
  return {
    tauUpMs,
    tauRepMs: Math.max(5, 1.5 * tauUpMs, ap.tauRepMs),
    plateauSlope: Math.min(0.95, Math.max(0, ap.plateauSlope)),
    lowpassHz: Math.max(20, ap.lowpassHz),
  };
}

/** s(t) for one voxel (before low-pass). */
export function apValue(tMs: number, tActMs: number, tRepMs: number, ap: ApParams): number {
  const x = tMs - tActMs;
  return sigmoid(x / ap.tauUpMs) * (1 - (ap.plateauSlope * x) / PLATEAU_REF_MS) * sigmoid(-(tMs - tRepMs) / ap.tauRepMs);
}

/**
 * GLSL twin of apValue (uniform names follow view3d/gpuContract: uApTauUp, uApTauRepV/A; slope passed explicitly).
 * Keep in sync with apValue — tests/sim/conduction/ap.test.ts checks the constant names appear here.
 */
export const AP_GLSL = /* glsl */ `
float apSigmoid(float x) { return 1.0 / (1.0 + exp(-clamp(x, -60.0, 60.0))); }
// s(t) = σ((t−δ)/τu)·(1 − a·(t−δ)/${PLATEAU_REF_MS.toFixed(1)})·σ(−(t−ρ)/τr)
float apValue(float t, float tAct, float tRep, float tauUp, float tauRep, float slope) {
  float x = t - tAct;
  return apSigmoid(x / tauUp) * (1.0 - slope * x / ${PLATEAU_REF_MS.toFixed(1)}) * apSigmoid(-(t - tRep) / tauRep);
}
`;
