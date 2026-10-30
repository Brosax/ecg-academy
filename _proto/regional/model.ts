/**
 * Condition description types + the global (condition-independent) model constants.
 * A condition may only set: rhythm, conduction (branches, velocities, extra sources), regional AP parameters,
 * geometry (heart params). The lead system (electrodes, β) is fixed for every condition.
 */
import type { HeartParams } from './geometry.ts';
import type { VConduction } from './conduction.ts';
import type { V3 } from './vec.ts';

/**
 * Lead-system constants (fixed for all conditions — properties of the body and the recording, calibrated once on the
 * normal beat). beta: near-field weight of the lead field; gainV / gainA: ventricular / atrial source strength (mV per
 * unit). Mutable only so dev tools can explore them.
 */
export const LEADSYS = { beta: 1.0, gainV: 0.071, gainA: 0.09 };

export interface VRep {
  apd0: number; // APD (ms) at RR 833 ms, mid-wall reference
  gAB: number; // APD apex→base gradient (ms per unit long-axis position, base longer)
  /** Fraction of gAB also applied inside each face (patch level along the long axis) — 0 = one APD per face. */
  gABin: number;
  dTM: { LV: number; RV: number; SEPT: number }; // APD(IN) − APD(OUT) (ms)
  dRV: number; // RV APD offset (ms)
  /** Regional APD offsets of the LV free wall (ms): anterior, lateral (incl. inferolateral), inferior, apical cap. */
  dGroup: { ANT: number; LAT: number; INF: number; APEX: number };
  tau: number; // phase-3 time constant (ms)
  plat: number; // plateau decline per 200 ms
  spread: number; // intra-region APD spread (ms)
  restExp: number; // APD ∝ RR^restExp
  /** Electrotonic APD–activation coupling: APD shortens by `couple` ms per ms of later activation (0…1). */
  couple: number;
}

export const NORMAL_VREP: VRep = {
  // calibrated once against textbook T amplitudes / QT (tuneT.ts): endocardium outlasts epicardium by ~34 ms, base
  // outlasts apex (+20 ms over the long axis), the lateral LV wall repolarises earliest, RV APD ~24 ms shorter than LV
  apd0: 276,
  gAB: 20,
  gABin: 0,
  dTM: { LV: 34, RV: 5.5, SEPT: 3.3 },
  dRV: -24,
  dGroup: { ANT: 5, LAT: -24, INF: -9, APEX: 0 },
  tau: 24,
  plat: 0,
  spread: 45,
  restExp: 0.36,
  couple: 0,
};

export interface RegionMod {
  amp?: number;
  ampIn?: number;
  ampOut?: number;
  dApd?: number;
  dApdIn?: number;
  dApdOut?: number;
  plat?: number;
  /** Plateau decline of one face only (endocardial / epicardial), e.g. a triangulated ischaemic subendocardial AP. */
  platIn?: number;
  platOut?: number;
  rest?: number;
  restIn?: number;
  restOut?: number;
  notchOut?: { depth: number; d1: number; d2: number };
  tau?: number;
  /** Phase-3 time constant of one face only. */
  tauIn?: number;
  tauOut?: number;
}

export interface AtrialParams {
  gain: number; // atrial source gain (relative)
  vScale: number; // atrial conduction velocity factor
  apd: number; // atrial APD at 833 ms (ms)
  tau: number;
  plat: number;
  dir0: V3; // initial (sinus-node) wavefront direction
  /** Wavefront direction per traversed edge 'from>to' (overrides the centroid-to-centroid direction). */
  dirs: Record<string, V3>;
}

export const NORMAL_ATRIA: AtrialParams = {
  gain: 1,
  vScale: 1.12,
  apd: 210,
  tau: 40,
  plat: 0.15,
  dir0: [0.15, -0.9, 0.45],
  // RA: down the crista terminalis and toward the appendage/septum (inferior, anterior, slightly leftward);
  // LA: leftward, inferior and posterior (Bachmann's bundle → appendage; septum → posterior wall)
  dirs: {
    'sa>ra_lat': [0.15, -0.9, 0.4], 'ra_lat>ra_cti': [0.4, -0.85, 0.3], 'sa>ra_sep': [0.7, -0.7, 0.0],
    'sa>bachmann': [0.95, -0.2, -0.15], 'bachmann>la_ant': [0.9, -0.4, -0.1], 'ra_sep>la_post': [0.75, -0.5, -0.4],
    'la_ant>la_post': [0.75, -0.5, -0.4],
  },
};

export type Rhythm =
  | { kind: 'sinus'; hr: number; pr: number; rsa: number; ap?: { face: string; site: string; delay: number; h: number; at?: 'centre' | 'base' | 'apex' } }
  | { kind: 'flutter'; cl: number; ratio: number; fr: number; circuit?: Partial<FlutterCircuit> }
  | { kind: 'af'; meanRR: number; minRR: number; fCL: number; fGain: number }
  | { kind: 'vt'; rate: number; origin: string; originH: number; originAt?: 'centre' | 'base' | 'apex'; sinusHr: number };

/**
 * Macro-reentrant (typical) flutter circuit around the tricuspid annulus. Segments: 0 cavotricuspid isthmus → 1 septum
 * (ascending) → 2 roof → lateral wall → 3 lateral wall → isthmus. Clockwise flutter = `reverse: true`.
 */
export interface FlutterCircuit {
  /** Fraction of the cycle spent in each segment (CTI is the slow zone). */
  segFrac: [number, number, number, number];
  /** Wavefront size of each segment (thin isthmus, large septal / lateral walls). */
  segM: [number, number, number, number];
  /** Anterior offset (cm) of the descending limb (anterolateral RA free wall, in front of the region centroids). */
  latAnterior: number;
  /** LA activated passively from the CS ostium: wavefront direction (caudo-cranial, toward the appendage) and size. */
  laDir: V3;
  laM: number;
  /** Bachmann's bundle (roof → LA appendage) wavefront size. */
  bbM: number;
  /** Fraction of each segment's activation delay offset by APD shortening (small atrial T during flutter). */
  apdK: number;
  /** Reverse the direction of rotation (clockwise flutter). */
  reverse: boolean;
  /** Number of moving sub-sources around the circuit (multiple of 4). */
  subSources: number;
  /** Half-width of each sub-source's activation bump in units of the sub-source spacing (adjacent bumps overlap). */
  overlap: number;
}

// Review: the roof was crossed in 15 % of the cycle with the largest front (segM 2.0) → a 30 ms positive spike plus a
// notch inside every F wave in II / III / aVF (jagged, not a sawtooth). The roof now takes 30 % of the cycle (slow
// conduction around the upper end of the crista terminalis) with a smaller front, the lateral wall a slightly larger
// one; the anterior offset of the descending limb keeps the discrete positive F waves in V1.
export const TYPICAL_FLUTTER: FlutterCircuit = {
  segFrac: [0.26, 0.22, 0.3, 0.22],
  segM: [0.3, 1.6, 1.6, 0.8],
  latAnterior: 2.5,
  laDir: [0.3, 0.85, 0.55],
  laM: 2.0,
  bbM: 0.3,
  apdK: 0.95,
  reverse: false,
  subSources: 24,
  overlap: 1.4,
};

export interface Condition {
  id: string;
  rhythmLabel: string;
  heart?: Partial<HeartParams>;
  rhythm: Rhythm;
  vcond?: Partial<VConduction>;
  vrep?: Partial<VRep>;
  regions?: Record<string, RegionMod>;
  atria?: Partial<AtrialParams>;
}

/** LV free-wall group of a ventricular region id (for the regional APD map). */
export function apdGroup(id: string): 'ANT' | 'LAT' | 'INF' | 'APEX' | null {
  if (id === 'apex') return 'APEX';
  if (id.endsWith('lat')) return 'LAT';
  if (id.endsWith('_ant')) return 'ANT';
  if (id.endsWith('_inf')) return 'INF';
  return null;
}

/** Baseline APD (ms, at RR 833) of a region face from the normal APD map (before condition-specific offsets). */
export function baseApd(v: VRep, r: { id: string; kind: 'LV' | 'SEPT' | 'RV'; z: number }, inner: boolean): number {
  const g = apdGroup(r.id);
  return v.apd0 + v.gAB * (Math.min(r.z, 1.1) - 0.5) + (inner ? v.dTM[r.kind] : 0) + (r.kind === 'RV' ? v.dRV : 0) + (g ? v.dGroup[g] : 0);
}
