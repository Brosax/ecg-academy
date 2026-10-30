/**
 * Frontal QRS axis from the net QRS in leads I and aVF (the two orthogonal limb leads), the quadrant method and the
 * isoelectric-lead method. Net QRS can come from the learner (net amplitude R − |S| in mm) or from an ECG (net area of
 * the dominant QRS, mV·ms).
 *
 * I (0°) and aVF (+90°) are orthogonal, but in the Einthoven/Goldberger model the augmented leads record √3/2 of the
 * projection that a bipolar lead records (aVF = II − I/2 = (√3/2)·|v|·sin θ when I = |v|·cos θ). The exact angle is
 * therefore θ = atan2(2·aVF/√3, I). The common bedside shortcut atan(aVF / I) differs from it by at most ≈ 4°; the
 * figure shows the exact formula and mentions the shortcut.
 */
import type { BeatMarks, EcgSignal } from '../../core/ecg';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../core/leads';
import { angleDiff, angleOf } from './geom';
import { classifyAxis, type AxisClass, type LimbLead } from './projection';

/**
 * Quadrant from the signs of I and aVF.
 * - 'normal'  I+ aVF+  → 0° … +90°
 * - 'left'    I+ aVF−  → 0° … −90° (look at II: positive → still normal down to −30°, negative → LAD)
 * - 'right'   I− aVF+  → +90° … +180° (RAD)
 * - 'extreme' I− aVF−  → −90° … −180° (extreme / northwest)
 * - 'indeterminate' when both are (near) zero.
 */
export type Quadrant = 'normal' | 'left' | 'right' | 'extreme' | 'indeterminate';

export function quadrantOf(netI: number, netAvf: number, eps = 1e-9): Quadrant {
  if (Math.abs(netI) <= eps && Math.abs(netAvf) <= eps) return 'indeterminate';
  const iPos = netI >= -eps; // an isoelectric I sits on the ±90° border; we treat 0 as "not negative"
  const fPos = netAvf >= -eps;
  if (iPos && fPos) return 'normal';
  if (iPos && !fPos) return 'left';
  if (!iPos && fPos) return 'right';
  return 'extreme';
}

/** 2/√3: converts a recorded aVF amplitude to the projection length on the +90° axis (see above). */
export const AVF_SCALE = 2 / Math.sqrt(3);

/** The bedside shortcut atan(aVF / I) (no augmented-lead scaling), degrees, or null when both are zero. */
export function quickAngle(netI: number, netAvf: number): number | null {
  if (netI === 0 && netAvf === 0) return null;
  return Math.round(angleOf(netI, netAvf) * 10) / 10;
}

export interface AxisResult {
  /** degrees in (−180, 180], or null when indeterminate */
  readonly deg: number | null;
  readonly quadrant: Quadrant;
  readonly cls: AxisClass | null;
  /** net QRS expected in lead II (for the 'left' quadrant check), same units as the inputs */
  readonly netII: number;
}

export function axisFromNets(netI: number, netAvf: number): AxisResult {
  const quadrant = quadrantOf(netI, netAvf);
  // Einthoven/Goldberger: II = I + III and aVF = (II + III) / 2  ⇒  II = I/2 + aVF (recorded amplitudes)
  const netII = netI * 0.5 + netAvf;
  if (quadrant === 'indeterminate') return { deg: null, quadrant, cls: null, netII };
  const deg = Math.round(angleOf(netI, netAvf * AVF_SCALE) * 10) / 10;
  return { deg, quadrant, cls: classifyAxis(deg), netII };
}

export interface IsoHint {
  /** the limb lead most nearly perpendicular to the axis (records the most equiphasic QRS) */
  readonly lead: LimbLead;
  /** the two directions perpendicular to that lead */
  readonly candidates: readonly [number, number];
  /** the candidate closest to the axis */
  readonly chosen: number;
}

/** Isoelectric-lead method: the axis is ±90° to the most equiphasic limb lead; the other leads pick the sign. */
export function isoelectricHint(axisDeg: number): IsoHint {
  let best: LimbLead = 'I';
  let bestScore = Infinity;
  for (const lead of LIMB_LEADS) {
    const score = Math.abs(Math.cos((axisDeg - LIMB_ANGLE_DEG[lead]) * (Math.PI / 180)));
    if (score < bestScore - 1e-12) {
      bestScore = score;
      best = lead;
    }
  }
  const a = angleDiff(LIMB_ANGLE_DEG[best] + 90, 0);
  const b = angleDiff(LIMB_ANGLE_DEG[best] - 90, 0);
  const chosen = Math.abs(angleDiff(axisDeg, a)) <= Math.abs(angleDiff(axisDeg, b)) ? a : b;
  return { lead: best, candidates: [a, b], chosen };
}

/** The limb lead whose measured net QRS is smallest relative to the largest one (the "most isoelectric" lead). */
export function mostIsoelectricLead(nets: Readonly<Record<LimbLead, number>>): LimbLead {
  let best: LimbLead = 'I';
  let bestAbs = Infinity;
  for (const lead of LIMB_LEADS) {
    const a = Math.abs(nets[lead]);
    if (a < bestAbs) {
      bestAbs = a;
      best = lead;
    }
  }
  return best;
}

// ── reading the net QRS from an ECG ─────────────────────────────────────────────────────────────────────────────────

/** Beats of the dominant kind (the most frequent kind among non-aberrant beats), for "dominant QRS" measurements. */
export function dominantBeats(beats: readonly BeatMarks[]): BeatMarks[] {
  const pool = beats.filter((b) => !b.aberrant);
  const src = pool.length ? pool : beats.slice();
  const counts = new Map<string, number>();
  for (const b of src) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
  let kind = '';
  let n = -1;
  for (const [k, c] of counts) {
    if (c > n) {
      n = c;
      kind = k;
    }
  }
  return src.filter((b) => b.kind === kind);
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Net QRS area (mV·ms) of one beat window in one lead: Σ (x − baseline)·dt over [qrsOn, qrsOff], baseline = median of
 * the 30 ms just before QRS onset (the end of the PR segment).
 */
export function netArea(x: Float32Array, fs: number, qrsOn: number, qrsOff: number): number {
  const dt = 1000 / fs;
  const i0 = Math.max(0, Math.round((qrsOn * fs) / 1000));
  const i1 = Math.min(x.length - 1, Math.round((qrsOff * fs) / 1000));
  const b0 = Math.max(0, Math.round(((qrsOn - 30) * fs) / 1000));
  const base: number[] = [];
  for (let i = b0; i <= i0; i++) base.push(x[i]);
  const bl = median(base);
  let a = 0;
  for (let i = i0; i <= i1; i++) a += (x[i] - bl) * dt;
  return a;
}

/** QRS windows to measure: dominant beats from truth, or windows around detected R peaks (real ECGs without marks). */
export function qrsWindows(beats: readonly BeatMarks[] | null, rPeaksMs: readonly number[]): Array<readonly [number, number]> {
  if (beats && beats.length) return dominantBeats(beats).map((b) => [b.qrsOn, b.qrsOff] as const);
  return rPeaksMs.map((t) => [t - 50, t + 50] as const);
}

/** Mean net QRS area of every limb lead over the given QRS windows. */
export function limbNetAreas(sig: EcgSignal, windows: ReadonlyArray<readonly [number, number]>): Record<LimbLead, number> {
  const out = {} as Record<LimbLead, number>;
  for (const lead of LIMB_LEADS) {
    const x = sig.leads[lead];
    let s = 0;
    for (const [a, b] of windows) s += netArea(x, sig.fs, a, b);
    out[lead] = windows.length ? s / windows.length : 0;
  }
  return out;
}
