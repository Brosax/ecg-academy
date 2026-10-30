/**
 * EngineParams — every knob of the electrophysiology engine, with documented defaults.
 * Velocities in m/s (= mm/ms, the grid unit), times in ms. Numbers cite docs/research (AP = activation-physiology.md,
 * DM = dipole-model-design.md, LG = lead-geometry-anatomy.md). The calibrator (src/sim/calibrate) tunes ≈ 10 of them.
 * Defaults marked [cal] were refined by `npm run calibrate` on the STUB heart and rounded, keeping only values inside
 * the cited ranges; pose and gains are geometry-specific and must be recalibrated on the procedural heart.
 */
import type { ApParams, StructureId } from '../types';
import { AP_ATRIAL, AP_VENTRICULAR } from './ap';

export type Stencil = 26 | 50;

export interface EngineParams {
  /** Dijkstra neighbourhood: 50 (r² ≤ 5, mean path error ≈ 4.8 %) or 26 (≈ 8.9 %) — plan "Dijkstra". */
  readonly stencil: Stencil;

  // ---------------------------------------------------------------- atria
  /** Atrial working muscle 0.8–1.0 m/s (AP §3b; Ramanathan 2006). */
  readonly vAtrialMps: number;
  /** Bachmann's bundle > 1.7 m/s (AP §2c, Mouws 2018). Modelled as a cable along geometry.paths BACHMANN. */
  readonly vBachmannMps: number;
  /** Radius within which the Bachmann cable couples to atrial muscle (mm). */
  readonly bachmannCouplingMm: number;
  /** SA node → first atrial muscle (sinoatrial conduction), ms after the A event. */
  readonly saExitMs: number;

  // ---------------------------------------------------------------- AV node
  /** PR target at rrRefMs (ms); the AH delay is derived from it unless ahMs is set (PR 120–200, AP §2b). */
  readonly targetPrMs: number;
  /** Explicit AH (AVN entry → His) at rrRefMs; null = derive from targetPrMs. AH 50–120 ms (AP §2b). */
  readonly ahMs: number | null;
  /** AH ∝ (RR/RRref)^avExp so PR shortens with rate (plan "心率适应"). */
  readonly avExp: number;

  // ---------------------------------------------------------------- His–Purkinje
  /** His bundle, bundle branches and fascicles 1–2 m/s (AP §3b; cvphysiology ≈ 2 m/s). */
  readonly vBundleMps: number;
  /** Extra delay added at each fascicle terminal (calibration: anterior/posterior fascicle offsets). */
  readonly lafOffsetMs: number;
  readonly lpfOffsetMs: number;
  readonly lsfOffsetMs: number;
  /** Extra delay at the RBB terminal = LV–RV septal offset knob (Durrer: RV starts 5–10 ms after LV). [cal] 8 */
  readonly rbbOffsetMs: number;
  /** Purkinje layer 2–4 m/s (AP §3b, ten Tusscher 2008). */
  readonly vPurkinjeMps: number;
  /** Purkinje → muscle junction delay 5–10 ms (plan "浦肯野层"). */
  readonly pmjDelayMs: number;
  /** Muscle → Purkinje (retrograde) delay; Infinity = blocked (needed for BBB / PVC QRS width in round 2). */
  readonly retroDelayMs: number;
  /** Purkinje coverage: subendocardial voxels with apexBase ≤ extent (≈ 2/3 apical; plan "覆盖掩膜"). [cal] 0.75 */
  readonly purkinjeExtent: number;
  /** Regions never covered by Purkinje (RVOT, LV posterobasal; the apexBase cut removes the basal septum). */
  readonly purkinjeExclude: readonly StructureId[];

  // ---------------------------------------------------------------- ventricular muscle
  /** Along the wall 0.85 m/s (Boonstra 2022, DM §1). */
  readonly vMyoLongMps: number;
  /** Across the wall: Boonstra 0.34 m/s (2.5× slower); human 0.15–0.45 (AP §3). [cal] 0.25 */
  readonly vMyoTransMps: number;

  // ---------------------------------------------------------------- repolarization
  /** Mean ventricular APD (ρ − δ) at rrRefMs; in-vivo ARI 235 ms, per subject 200–260 (Ramanathan 2006, AP §4). [cal] 250 */
  readonly apdRefMs: number;
  /** Apex→base gradient (base longer), 40–65 ms (Ramanathan 42; Kloosterman best fit 65; AP §4b). [cal] 55 */
  readonly gAbMs: number;
  /** Transmural gradient (endo longer), 20–30 ms (Szathmary 25 LV / 20 RV; Kloosterman 30). */
  readonly gTmMs: number;
  /** LV − RV APD difference; disputed (Ramanathan +32, Kloosterman −8) → tunable, default 0. */
  readonly gLrMs: number;
  /** Atrial APD (ρ − δ, sigmoid midpoint), 150–250 ms. */
  readonly apdAtrialMs: number;
  /** Reference cycle length for APD / AH (ms). */
  readonly rrRefMs: number;
  /** APD × (RRprev/RRref)^rateExp. */
  readonly rateExp: number;

  // ---------------------------------------------------------------- AP templates
  readonly apVentricular: ApParams;
  readonly apAtrial: ApParams;

  // ---------------------------------------------------------------- source
  /** Ventricular EDL gain: H [mV] = gain · Σ wavefront area [mm²]; calibrate so peak |QRS| ≈ 1.4–2.5 mV. [cal, stub] */
  readonly gainMvPerMm2: number;
  /** Atrial gain multiplier (thin atrial walls; plan "心房增益补偿"); calibrate P(II) ≈ 0.1–0.2 mV. [cal, stub] */
  readonly atrialGainFactor: number;

  // ---------------------------------------------------------------- pose (applied on top of geometry.pose)
  /** Rotation about the heart's long axis (local +y, right-handed), deg. */
  readonly poseRollDeg: number;
  /** Frontal-plane tilt of the long axis (rotation about app +z, right-handed; + = apex moves toward patient left/up). */
  readonly poseTiltDeg: number;
  /** Horizontal rotation (about app +y, right-handed), deg. */
  readonly poseAzimuthDeg: number;

  // ---------------------------------------------------------------- rhythm
  readonly bpm: number;
  /** RR bucket width for the template cache (ms). */
  readonly rrBucketMs: number;
}

export const DEFAULT_ENGINE_PARAMS: EngineParams = {
  stencil: 50,

  vAtrialMps: 0.9,
  vBachmannMps: 1.8,
  bachmannCouplingMm: 4,
  saExitMs: 0,

  targetPrMs: 160,
  ahMs: null,
  avExp: 0.3,

  vBundleMps: 2.0,
  lafOffsetMs: 0,
  lpfOffsetMs: 0,
  lsfOffsetMs: 0,
  rbbOffsetMs: 8,
  vPurkinjeMps: 3.0,
  pmjDelayMs: 7,
  retroDelayMs: Infinity,
  purkinjeExtent: 0.75,
  purkinjeExclude: ['RVOT', 'LV_POSTEROBASAL'],

  vMyoLongMps: 0.85,
  vMyoTransMps: 0.25,

  apdRefMs: 250,
  gAbMs: 55,
  gTmMs: 25,
  gLrMs: 0,
  apdAtrialMs: 180,
  rrRefMs: 800,
  rateExp: 1 / 3,

  apVentricular: AP_VENTRICULAR,
  apAtrial: AP_ATRIAL,

  gainMvPerMm2: 1.1e-3,
  atrialGainFactor: 0.25,

  poseRollDeg: 0,
  poseTiltDeg: 0,
  poseAzimuthDeg: 0,

  bpm: 75,
  rrBucketMs: 20,
};

/** Shallow merge (nested ApParams objects are replaced, not merged). */
export function resolveParams(p?: Partial<EngineParams>): EngineParams {
  return { ...DEFAULT_ENGINE_PARAMS, ...(p ?? {}) };
}
