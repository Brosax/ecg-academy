/**
 * Pure maths of the "triangle-to-wheel" scene (lesson f3; spec docs/design/f-explainers.md §4.4): the electrode
 * potential algebra, the derived lead geometry (triangle sides and Goldberger bisectors sliding into the hexaxial
 * wheel), the scene's windowed source, the two placement tables and frame(p): the scene as a function of time.
 * No Preact, no DOM.
 *
 * One source: the block's ECG. φ_RA, φ_LA, φ_LL are recovered from the recorded I and II in the WCT gauge
 * (φ_RA + φ_LA + φ_LL = 0): φ_RA = −(I + II)/3, φ_LA = φ_RA + I, φ_LL = φ_RA + II. Every limb lead on screen is
 * re-assembled from these three numbers (Einthoven / Goldberger) and equals the recorded lead to Float32 precision
 * (tested). In this equilateral model a frontal vector v gives φ_e = v·u_e / √3, so I, II, III are unit-axis
 * projections and aVR, aVL, aVF = 1.5 × the WCT-referenced limb potential = 0.866 × a unit projection (one note,
 * tsn('scModel')).
 *
 * The potential helpers below mirror spec §2.12 (math/einthoven.ts, not landed yet); they belong there once it exists.
 */
import type { BeatMarks, EcgSignal } from '../../core/ecg';
import { CABRERA_LIMB, LIMB_ANGLE_DEG, LIMB_LEADS } from '../../core/leads';
import { angleOf, clamp, lerp, unit } from '../math/geom';
import { beatAt, beatWindow } from '../math/kors';
import { beatIndexAt, local, revealed, seg, tween, type Beat, type BeatDef } from '../scene/timeline';
import { BEAT_IDS, type BeatId } from './triangle-to-wheel.i18n';

export type { BeatId };
export type LimbLead = (typeof LIMB_LEADS)[number];
export type Electrode = 'RA' | 'LA' | 'LL';
export type Vec2 = readonly [number, number];
export const ELECTRODES = ['RA', 'LA', 'LL'] as const;
export const SIDES = ['I', 'II', 'III'] as const;
export const AUGMENTED = ['aVR', 'aVL', 'aVF'] as const;
const SQRT3 = Math.sqrt(3);

// ── the potential algebra (equilateral model) ──────────────────────────────────────────────────────────────────

/** Frontal angle of each electrode seen from the centre of the triangle (screen y down, +90° = inferior). */
export const ELECTRODE_DEG: Readonly<Record<Electrode, number>> = { RA: -150, LA: -30, LL: 90 };
export const ELECTRODE_UNIT: Readonly<Record<Electrode, Vec2>> = { RA: unit(-150), LA: unit(-30), LL: unit(90) };

/** The leads as electrode differences: + pole minus the average of the − poles. */
export const LEAD_POLES: Readonly<Record<LimbLead, { readonly pos: Electrode; readonly neg: readonly Electrode[] }>> = {
  I: { pos: 'LA', neg: ['RA'] },
  II: { pos: 'LL', neg: ['RA'] },
  III: { pos: 'LL', neg: ['LA'] },
  aVR: { pos: 'RA', neg: ['LA', 'LL'] },
  aVL: { pos: 'LA', neg: ['RA', 'LL'] },
  aVF: { pos: 'LL', neg: ['RA', 'LA'] },
};

const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];

/** Electrode potentials (WCT gauge) of a frontal vector: φ_e = v·u_e / √3. */
export function potentialsOfVector(v: Vec2): Record<Electrode, number> {
  return { RA: dot(v, ELECTRODE_UNIT.RA) / SQRT3, LA: dot(v, ELECTRODE_UNIT.LA) / SQRT3, LL: dot(v, ELECTRODE_UNIT.LL) / SQRT3 };
}

/** The six limb leads of three electrode potentials (Einthoven / Goldberger, exact). */
export function leadsOfPotentials(phi: Readonly<Record<Electrode, number>>): Record<LimbLead, number> {
  const out = {} as Record<LimbLead, number>;
  for (const l of LIMB_LEADS) {
    const { pos, neg } = LEAD_POLES[l];
    out[l] = phi[pos] - neg.reduce((s, e) => s + phi[e], 0) / neg.length;
  }
  return out;
}

/** I, II, III = unit-axis projections; aVR, aVL, aVF = 0.866 × the unit projection (identities exact). */
export function limbLeadsOfVector(v: Vec2): Record<LimbLead, number> {
  return leadsOfPotentials(potentialsOfVector(v));
}

/** The exact inverse for the frontal plane: v = (I, (2·II − I)/√3). */
export function frontalVectorOfLeads(I: number, II: number): Vec2 {
  return [I, (2 * II - I) / SQRT3];
}

/** Direction of each lead axis, derived from the electrode geometry (not from a table): + pole − mean of − poles. */
export function derivedAxisDeg(l: LimbLead): number {
  const { pos, neg } = LEAD_POLES[l];
  const p = ELECTRODE_UNIT[pos];
  const m = neg.reduce<[number, number]>((s, e) => [s[0] + ELECTRODE_UNIT[e][0] / neg.length, s[1] + ELECTRODE_UNIT[e][1] / neg.length], [0, 0]);
  return angleOf(p[0] - m[0], p[1] - m[1]);
}

export interface Potentials {
  readonly fs: number;
  readonly n: number;
  readonly RA: Float64Array;
  readonly LA: Float64Array;
  readonly LL: Float64Array;
}

/** Electrode potentials in the WCT gauge recovered from the recorded I and II. */
export function potentialsFromSignal(sig: EcgSignal): Potentials {
  const I = sig.leads.I, II = sig.leads.II;
  const n = I.length;
  const RA = new Float64Array(n), LA = new Float64Array(n), LL = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = -(I[i] + II[i]) / 3;
    RA[i] = r;
    LA[i] = r + I[i];
    LL[i] = r + II[i];
  }
  return { fs: sig.fs, n, RA, LA, LL };
}

/** The six limb leads re-assembled from the potentials (Float32, mV) over samples [from, from + n). */
export function assembleLimbLeads(phi: Potentials, from = 0, n = phi.n - from): Record<LimbLead, Float32Array> {
  const out = {} as Record<LimbLead, Float32Array>;
  for (const l of LIMB_LEADS) out[l] = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    const i = j + from;
    const v = leadsOfPotentials({ RA: phi.RA[i], LA: phi.LA[i], LL: phi.LL[i] });
    for (const l of LIMB_LEADS) out[l][j] = v[l];
  }
  return out;
}

// ── the scene's source: one beat of the block's ECG ────────────────────────────────────────────────────────────

export interface Source {
  /** ECG window (ms) the instant u ∈ [0, 1] maps to */
  readonly win: readonly [number, number];
  readonly n: number;
  readonly phi: Readonly<Record<Electrode, Float64Array>>;
  readonly leads: Readonly<Record<LimbLead, Float32Array>>;
  /** PR-segment mean of each lead (a linear baseline, so the baselines obey II = I + III too) */
  readonly base: Readonly<Record<LimbLead, number>>;
  readonly vx: Float64Array;
  readonly vy: Float64Array;
  /** largest |v| over the beat, |φ| over the beat, |lead| over the beat (mV) */
  readonly vMax: number;
  readonly phiMax: number;
  readonly leadMax: number;
  /** instant of the largest QRS vector (fraction of the window): where the tour holds */
  readonly uStar: number;
  /** mean QRS vector (area over qrsOn…qrsOff) and its angle */
  readonly meanDeg: number;
  /** the whole record's potentials (a click on the 12-lead may pick any instant) and their PR baseline */
  readonly all: Potentials;
  readonly phiBase: Readonly<Record<Electrode, number>>;
}

export function chooseBeat(beats: readonly BeatMarks[]): number {
  return beatAt(beats, null);
}

export function sourceOf(sig: EcgSignal, beat: BeatMarks): Source {
  const win = beatWindow(beat, sig.durationMs);
  const fs = sig.fs;
  const i0 = Math.max(0, Math.round((win[0] * fs) / 1000));
  const i1 = Math.min(sig.leads.I.length - 1, Math.round((win[1] * fs) / 1000));
  const n = i1 - i0 + 1;
  const all = potentialsFromSignal(sig);
  const leads = assembleLimbLeads(all, i0, n);
  const phi = { RA: all.RA.slice(i0, i0 + n), LA: all.LA.slice(i0, i0 + n), LL: all.LL.slice(i0, i0 + n) };
  const idx = (t: number) => clamp(Math.round((t * fs) / 1000) - i0, 0, n - 1);
  const b0 = idx(beat.qrsOn - 40), b1 = Math.max(b0 + 1, idx(beat.qrsOn - 10));
  const base = {} as Record<LimbLead, number>;
  for (const l of LIMB_LEADS) {
    let s = 0;
    for (let j = b0; j < b1; j++) s += leads[l][j];
    base[l] = s / (b1 - b0);
  }
  const vx = new Float64Array(n), vy = new Float64Array(n);
  let vMax = 1e-6, phiMax = 1e-6, leadMax = 1e-6;
  for (let j = 0; j < n; j++) {
    const [x, y] = frontalVectorOfLeads(leads.I[j] - base.I, leads.II[j] - base.II);
    vx[j] = x;
    vy[j] = y;
    vMax = Math.max(vMax, Math.hypot(x, y));
    for (const l of LIMB_LEADS) leadMax = Math.max(leadMax, Math.abs(leads[l][j] - base[l]));
  }
  const q0 = idx(beat.qrsOn), q1 = Math.max(q0 + 1, idx(beat.qrsOff));
  let mx = 0, my = 0, best = q0, bestM = -1;
  for (let j = q0; j <= q1; j++) {
    mx += vx[j];
    my += vy[j];
    const m = Math.hypot(vx[j], vy[j]);
    if (m > bestM) {
      bestM = m;
      best = j;
    }
  }
  const r0 = -(base.I + base.II) / 3;
  const phiBase = { RA: r0, LA: r0 + base.I, LL: r0 + base.II };
  for (let j = 0; j < n; j++) for (const e of ELECTRODES) phiMax = Math.max(phiMax, Math.abs(phi[e][j] - phiBase[e]));
  return { win, n, phi, leads, base, vx, vy, vMax, phiMax, leadMax, uStar: n > 1 ? best / (n - 1) : 0, meanDeg: angleOf(mx, my), all, phiBase };
}

/** Potentials, leads (baseline removed) and frontal vector at any instant of the record (ms), interpolated linearly. */
export function instantAt(s: Source, tMs: number): { phi: Record<Electrode, number>; leads: Record<LimbLead, number>; v: Vec2 } {
  const a = s.all;
  const x = clamp((tMs * a.fs) / 1000, 0, a.n - 1);
  const i = Math.max(0, Math.min(a.n - 2, Math.floor(x)));
  const r = x - i;
  const phi = {} as Record<Electrode, number>;
  for (const e of ELECTRODES) phi[e] = a[e][i] * (1 - r) + a[e][i + 1] * r - s.phiBase[e];
  const leads = leadsOfPotentials(phi);
  return { phi, leads, v: frontalVectorOfLeads(leads.I, leads.II) };
}

/** Sum of two windowed series (the I + III copy that lands on II). */
export function sumSeries(a: ArrayLike<number>, b: ArrayLike<number>): Float64Array {
  const out = new Float64Array(a.length);
  for (let j = 0; j < a.length; j++) out[j] = a[j] + b[j];
  return out;
}

/** Linear interpolation of a windowed series at instant u ∈ [0, 1] (linear, so every identity survives). */
export function at(x: ArrayLike<number>, u: number): number {
  const n = x.length;
  if (n === 0) return 0;
  const f = clamp(u, 0, 1) * (n - 1);
  const i = Math.min(n - 2, Math.floor(f));
  if (i < 0) return x[0];
  const r = f - i;
  return x[i] * (1 - r) + x[i + 1] * r;
}

/** ECG time (ms) of instant u, and back. */
export const timeOfU = (s: Source, u: number) => s.win[0] + (s.win[1] - s.win[0]) * clamp(u, 0, 1);
export const uOfTime = (s: Source, t: number) => (s.win[1] > s.win[0] ? clamp((t - s.win[0]) / (s.win[1] - s.win[0]), 0, 1) : 0);

/** SVG path (local coordinates: x 0…w, baseline at y = 0, up = −) of a series minus a baseline; ≤ 300 points. */
export function tracePath(x: ArrayLike<number>, base: number, w: number, scale: number): string {
  const n = x.length;
  const step = Math.max(1, Math.ceil(n / 300));
  const r = (v: number) => Math.round(v * 10) / 10;
  let d = '';
  for (let j = 0; j < n; j += step) d += `${d ? 'L' : 'M'}${r((w * j) / Math.max(1, n - 1))} ${r(-(x[j] - base) * scale)}`;
  if ((n - 1) % step !== 0) d += `L${r(w)} ${r(-(x[n - 1] - base) * scale)}`;
  return d;
}

/** I + III − II at instant u (the identity read-out; 0 to Float32 precision). */
export function identityAt(s: Source, u: number): { I: number; II: number; III: number; d: number } {
  const I = at(s.leads.I, u) - s.base.I, II = at(s.leads.II, u) - s.base.II, III = at(s.leads.III, u) - s.base.III;
  return { I, II, III, d: I + III - II };
}

/**
 * The identity read-out, rounded to 0.01 mV: I and III rounded, II shown as their sum (within 0.01 mV of its own
 * rounding, since the law is exact), d = the unrounded I + III − II (0 to Float32 precision). −0 is normalised.
 */
export function readout(l: Readonly<Record<LimbLead, number>>): { I: number; III: number; II: number; d: number } {
  const r2 = (x: number) => Math.round(x * 100) / 100 || 0;
  const I = r2(l.I), III = r2(l.III);
  return { I, III, II: r2(I + III), d: r2(l.I + l.III - l.II) };
}

// ── rows: the six strips (default and Cabrera order) ───────────────────────────────────────────────────────────

export type RowId = LimbLead;
export const DEFAULT_ORDER: readonly RowId[] = LIMB_LEADS;
/** Cabrera order by the lead each row carries (aVR is shown inverted there). */
export const CABRERA_ORDER: readonly RowId[] = CABRERA_LIMB.map((l) => (l === '-aVR' ? 'aVR' : l)) as RowId[];
export const slotOf = (l: RowId, cabrera: boolean) => (cabrera ? CABRERA_ORDER : DEFAULT_ORDER).indexOf(l);

/** The perpendicular pairs (lead ⟂ lead), in the order they light. */
export const PAIRS: readonly (readonly [LimbLead, LimbLead])[] = [
  ['I', 'aVF'],
  ['II', 'aVL'],
  ['III', 'aVR'],
];
export const pairOf = (l: LimbLead) => PAIRS.findIndex((p) => p[0] === l || p[1] === l);
export const partnerOf = (l: LimbLead): LimbLead => {
  const p = PAIRS[pairOf(l)];
  return p[0] === l ? p[1] : p[0];
};
export const GROUPS = { inferior: ['II', 'III', 'aVF'], lateral: ['I', 'aVL'] } as const satisfies Record<string, readonly LimbLead[]>;
export const groupOf = (l: LimbLead): 'inferior' | 'lateral' | null =>
  (GROUPS.inferior as readonly string[]).includes(l) ? 'inferior' : (GROUPS.lateral as readonly string[]).includes(l) ? 'lateral' : null;

// ── placement tables ───────────────────────────────────────────────────────────────────────────────────────────

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface Placement {
  readonly kind: 'wide' | 'narrow';
  readonly w: number;
  readonly h: number;
  /** centre and circumradius of the triangle; the wheel radius is √3/2 · R (= half a side) */
  readonly cx: number;
  readonly cy: number;
  readonly R: number;
  readonly meters: Rect;
  readonly rows: Rect;
  readonly rowH: number;
  readonly font: number;
}

export const WIDE: Placement = { kind: 'wide', w: 760, h: 440, cx: 190, cy: 222, R: 128, meters: { x: 384, y: 6, w: 368, h: 64 }, rows: { x: 384, y: 98, w: 368, h: 338 }, rowH: 50, font: 12 };
export const NARROW: Placement = { kind: 'narrow', w: 420, h: 680, cx: 210, cy: 186, R: 110, meters: { x: 10, y: 334, w: 400, h: 64 }, rows: { x: 10, y: 426, w: 400, h: 252 }, rowH: 38, font: 12 };
export const placementFor = (cssWidth: number): Placement => (cssWidth < 560 ? NARROW : WIDE);
export const wheelR = (pl: Placement) => (pl.R * SQRT3) / 2;
export const rowY = (pl: Placement, slot: number) => pl.rows.y + (slot * (pl.rows.h - pl.rowH)) / 5;

export function electrodeAt(pl: Placement, e: Electrode): Vec2 {
  return [pl.cx + pl.R * ELECTRODE_UNIT[e][0], pl.cy + pl.R * ELECTRODE_UNIT[e][1]];
}

/** Tail (− end) and head (+ end) of a lead's arrow at this frame: on the triangle, then slid to the centre. */
export function axisSegment(pl: Placement, l: LimbLead, f: Frame): { tail: Vec2; head: Vec2 } {
  const { pos, neg } = LEAD_POLES[l];
  const H = electrodeAt(pl, pos);
  const pts = neg.map((e) => electrodeAt(pl, e));
  const T: Vec2 = [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
  const side = neg.length === 1;
  const grow = side ? f[`grow${l}` as 'growI'] : f.augGrow;
  const slide = side ? f.slide : f.augSlide;
  const len = Math.hypot(H[0] - T[0], H[1] - T[1]);
  const dir: Vec2 = [(H[0] - T[0]) / len, (H[1] - T[1]) / len];
  const half = lerp(len / 2, wheelR(pl), slide);
  const mid: Vec2 = [lerp((T[0] + H[0]) / 2, pl.cx, slide), lerp((T[1] + H[1]) / 2, pl.cy, slide)];
  const tail: Vec2 = [mid[0] - half * dir[0], mid[1] - half * dir[1]];
  const full = 2 * half * grow;
  return { tail, head: [tail[0] + full * dir[0], tail[1] + full * dir[1]] };
}

/** Schematic torso outline around the triangle (head, shoulders, hips), mirrored about the centre line. */
export function torsoPath(pl: Placement): string {
  const { cx, cy, R } = pl;
  const L: [number, number][] = [[-0.2, -1.12], [-0.24, -0.86], [-0.78, -0.8], [-1.14, -0.62], [-1.2, -0.2], [-0.98, 0.5], [-0.86, 1.1]];
  const r = (v: number) => Math.round(v * 10) / 10;
  const pt = (x: number, y: number) => `${r(cx + x * R)} ${r(cy + y * R)}`;
  const left = L.map(([x, y], i) => `${i ? 'L' : 'M'}${pt(x, y)}`).join('');
  const right = [...L].reverse().map(([x, y]) => `L${pt(-x, y)}`).join('');
  const head = `M${pt(0.24, -1.36)}A${r(0.24 * R)} ${r(0.24 * R)} 0 1 0 ${pt(-0.24, -1.36)}A${r(0.24 * R)} ${r(0.24 * R)} 0 1 0 ${pt(0.24, -1.36)}Z`;
  return `${left}${right}Z${head}`;
}

/**
 * stroke-dasharray (pathLength = 100) that dashes the negative half of an axis as the wheel forms: 8 dashes whose
 * gaps open continuously from 0 (solid side of the triangle) as `slide` goes 0 → 1; the positive half stays solid.
 */
export function halfDash(slide: number): string | undefined {
  if (!(slide > 1e-4)) return undefined;
  const g = 6.25 * 0.5 * clamp(slide, 0, 1);
  const a = 6.25 - g;
  return `${`${a.toFixed(3)} ${g.toFixed(3)} `.repeat(8)}50 100`;
}

export type Anchor = 'start' | 'middle' | 'end';
export interface AxisDraw {
  readonly tail: Vec2;
  readonly head: Vec2;
  readonly slide: number;
  readonly grow: number;
  readonly aug: boolean;
  /** formula label beside a triangle side (outside the triangle) */
  readonly sideAt: Vec2;
  readonly sideAnchor: Anchor;
  /** lead name: beside the arrow on the triangle, beyond the + pole on the wheel */
  readonly nameAt: Vec2;
  readonly nameOp: number;
  /** degree label of the + pole, inside the ring */
  readonly degAt: Vec2;
}

/** Everything the diagram draws for one lead at this frame (all derived from axisSegment). */
export function axisDraw(pl: Placement, l: LimbLead, f: Frame): AxisDraw {
  const aug = (AUGMENTED as readonly string[]).includes(l);
  const grow = aug ? f.augGrow : f[`grow${l}` as 'growI'];
  const slide = aug ? f.augSlide : f.slide;
  const { tail, head } = axisSegment(pl, l, f);
  const full = axisSegment(pl, l, { ...f, growI: 1, growII: 1, growIII: 1, augGrow: 1 });
  const len = Math.hypot(full.head[0] - full.tail[0], full.head[1] - full.tail[1]);
  const d: Vec2 = [(full.head[0] - full.tail[0]) / len, (full.head[1] - full.tail[1]) / len];
  const mid: Vec2 = [(full.tail[0] + full.head[0]) / 2, (full.tail[1] + full.head[1]) / 2];
  let n: Vec2 = [d[1], -d[0]];
  if (n[0] * (mid[0] - pl.cx) + n[1] * (mid[1] - pl.cy) < 0 || (aug && n[0] < 0)) n = [-n[0], -n[1]];
  const sideAt: Vec2 = [mid[0] + n[0] * 12, mid[1] + n[1] * 12];
  const sideAnchor: Anchor = n[0] < -0.3 ? 'end' : n[0] > 0.3 ? 'start' : 'middle';
  // an augmented name ends where its electrode's label was (that label fades out as the wheel forms)
  const off = aug ? 12 * (1 - slide) : 0;
  const far = aug ? (pl.R + 20) * slide : len / 2 + 16;
  const nameAt: Vec2 = [mid[0] + n[0] * off + d[0] * far, mid[1] + n[1] * off + d[1] * far];
  return { tail, head, slide, grow, aug, sideAt, sideAnchor, nameAt, nameOp: aug ? grow : slide, degAt: degLabelAt(pl, LIMB_ANGLE_DEG[l]) };
}

/** A degree label inside the ring, beside (not on) its axis. */
export function degLabelAt(pl: Placement, deg: number): Vec2 {
  const u = unit(deg), w = unit(deg + 90), r = wheelR(pl) - 17;
  return [pl.cx + r * u[0] + 9 * w[0], pl.cy + r * u[1] + 9 * w[1]];
}

/** Right-angle mark of perpendicular pair i at the centre (size grows with i so the three marks nest). */
export function pairMarkPath(pl: Placement, i: number): string {
  const [a, b] = PAIRS[i];
  const s = 9 + 5 * i, ua = unit(LIMB_ANGLE_DEG[a]), ub = unit(LIMB_ANGLE_DEG[b]);
  const p = (x: number, y: number) => `${(pl.cx + s * x).toFixed(1)} ${(pl.cy + s * y).toFixed(1)}`;
  return `M${p(ua[0], ua[1])}L${p(ua[0] + ub[0], ua[1] + ub[1])}L${p(ub[0], ub[1])}`;
}

// ── beats and frame(p) ─────────────────────────────────────────────────────────────────────────────────────────

const BEAT_MS: Readonly<Record<BeatId, number>> = { potentials: 4000, difference: 3600, law: 2600, slide: 1500, augment: 2200, project: 2400 };
export const BEATS: readonly BeatDef<BeatId>[] = BEAT_IDS.map((id) => ({ id, ms: BEAT_MS[id] }));
/** Slow-motion factor of the first sweep (the vector turning once through the beat) for a window of `spanMs`. */
export const sweepSlow = (spanMs: number) => (spanMs > 0 ? (BEAT_MS.potentials * 0.9) / spanMs : 1);

export interface FrameState {
  /** instant (fraction of the window) the tour holds on from beat 3 on */
  readonly uStar: number;
}

/** Everything that moves, as flat numbers in [0, 1] (u = the ECG instant as a fraction of the window). */
export interface Frame {
  readonly u: number;
  readonly fly: number;
  readonly torso: number;
  readonly vec: number;
  readonly meterRev: number;
  readonly wct: number;
  readonly growI: number;
  readonly growII: number;
  readonly growIII: number;
  readonly revI: number;
  readonly revII: number;
  readonly revIII: number;
  readonly fSides: number;
  readonly lift: number;
  readonly merge: number;
  readonly drop: number;
  readonly readout: number;
  readonly augSum: number;
  readonly ghost: number;
  readonly slide: number;
  readonly degA: number;
  readonly augGrow: number;
  readonly fAug: number;
  readonly augRows: number;
  readonly augSlide: number;
  readonly degB: number;
  readonly ring: number;
  readonly degC: number;
  readonly mean: number;
  readonly pair0: number;
  readonly pair1: number;
  readonly pair2: number;
  readonly hi0: number;
  readonly hi1: number;
  readonly hi2: number;
  readonly identity: number;
  /** the slow-motion tags of the two sweeps (beat 1, beat 2) */
  readonly slow1: number;
  readonly slow2: number;
}

const bump = (x: number, a: number, b: number) => Math.sin(Math.PI * revealed(x, a, b));

export function frame(p: number, beats: readonly Beat<BeatId>[], s: FrameState): Frame {
  const L = (k: number) => local(beats, k, p);
  const [l1, l2, l3, l4, l5, l6] = [0, 1, 2, 3, 4, 5].map(L);
  const k = beatIndexAt(beats, p);
  const lk = L(k);
  // the instant: sweeps in beats 1–2 (the pen flies back between sweeps), glides to the held instant in beat 3
  let u: number;
  if (k === 0) u = revealed(lk, 0.06, 0.96);
  else if (k === 1) u = lk < 0.06 ? 1 - seg(lk, 0, 0.06) : lk < 0.5 ? revealed(lk, 0.16, 0.5) : lk < 0.56 ? 1 - seg(lk, 0.5, 0.56) : revealed(lk, 0.66, 1);
  else if (k === 2) u = tween(1, s.uStar, seg(lk, 0.3, 0.5));
  else u = s.uStar;
  return {
    u,
    fly: bump(l2, 0, 0.06) + bump(l2, 0.5, 0.56),
    torso: 1 - 0.75 * seg(l2, 0, 0.2),
    vec: 1 - 0.6 * seg(l2, 0, 0.2),
    meterRev: revealed(l1, 0.06, 0.96),
    wct: seg(l1, 0.02, 0.15),
    growI: seg(l2, 0.06, 0.16),
    growII: seg(l2, 0.56, 0.66),
    growIII: seg(l2, 0.56, 0.66),
    revI: revealed(l2, 0.16, 0.5),
    revII: revealed(l2, 0.66, 1),
    revIII: revealed(l2, 0.66, 1),
    fSides: seg(l2, 0.08, 0.18) * (1 - seg(l4, 0, 0.2)),
    lift: seg(l3, 0, 0.25),
    merge: seg(l3, 0.25, 0.38),
    drop: seg(l3, 0.38, 0.55),
    // the read-out appears once the instant has reached the QRS peak (non-trivial numbers from its first frame)
    readout: seg(l3, 0.5, 0.6),
    augSum: seg(l3, 0.85, 1),
    ghost: 0.3 * seg(l4, 0, 0.25),
    slide: seg(l4, 0.1, 0.85),
    degA: seg(l4, 0.8, 1),
    augGrow: seg(l5, 0.05, 0.35),
    fAug: seg(l5, 0.15, 0.3),
    augRows: seg(l5, 0.3, 0.55),
    augSlide: seg(l5, 0.55, 0.92),
    degB: seg(l5, 0.85, 1),
    ring: seg(l6, 0, 0.25),
    degC: seg(l6, 0.05, 0.3),
    mean: seg(l6, 0.2, 0.4),
    pair0: seg(l6, 0.35, 0.47),
    pair1: seg(l6, 0.5, 0.62),
    pair2: seg(l6, 0.65, 0.77),
    hi0: bump(l6, 0.35, 0.5),
    hi1: bump(l6, 0.5, 0.65),
    hi2: bump(l6, 0.65, 0.8),
    identity: seg(l6, 0.82, 0.98),
    slow1: seg(l1, 0, 0.06) * (1 - seg(l2, 0, 0.06)),
    slow2: seg(l2, 0, 0.06) * (1 - seg(l3, 0, 0.1)),
  };
}

/** Strip reveal (clip fraction) and visibility of a row at this frame. */
export function rowReveal(f: Frame, l: LimbLead): number {
  return l === 'I' ? f.revI : l === 'II' ? f.revII : l === 'III' ? f.revIII : f.augRows;
}

/**
 * How a row is drawn: I, II, III are drawn by the pen (clip = reveal, pen at the instant u being swept); the
 * augmented rows are computed, not recorded, so they fade in whole (clip 1, opacity augRows) and never carry a pen.
 * pen = the instant (fraction of the window) the pen sits at, or null.
 */
export function rowDraw(f: Frame, l: LimbLead): { readonly clip: number; readonly op: number; readonly pen: number | null } {
  const rev = rowReveal(f, l);
  if ((AUGMENTED as readonly string[]).includes(l)) return { clip: 1, op: f.augRows, pen: null };
  return { clip: rev, op: 1, pen: rev > 0 && rev < 1 ? rev : null };
}

/** The mean QRS axis the scene labels: the engine's truth (the grading axis of this ECG), else the area vector. */
export function meanAxisDeg(s: Source, truth?: { readonly axisDeg: { readonly qrs: number } } | null): number {
  const q = truth?.axisDeg.qrs;
  return q != null && Number.isFinite(q) ? q : s.meanDeg;
}

/** Slow-motion factors of the two sweeps (beat 1 sweeps the window once, beat 2 twice), rounded, for a window of spanMs. */
export function slowFactors(spanMs: number): readonly [number, number] {
  const r = (x: number) => Math.max(1, Math.round(x));
  return [r(sweepSlow(spanMs)), r(spanMs > 0 ? (BEAT_MS.difference * 0.34) / spanMs : 1)];
}

/** Where a lead group's name sits on the wheel: inside its sector, between two of its axes. */
export function groupLabelAt(pl: Placement, g: 'inferior' | 'lateral'): Vec2 {
  const u = unit(g === 'inferior' ? 105 : -15), r = 0.7 * wheelR(pl);
  return [pl.cx + r * u[0], pl.cy + r * u[1]];
}

/** Degree label opacity of a lead's positive pole. */
export const degOf = (f: Frame, l: LimbLead) => ((SIDES as readonly string[]).includes(l) ? f.degA : f.degB);
export const pairMark = (f: Frame, i: number) => [f.pair0, f.pair1, f.pair2][i] ?? 0;
export const pairHi = (f: Frame, i: number) => [f.hi0, f.hi1, f.hi2][i] ?? 0;
/** The six negative-pole angles labelled in the last beat. */
export const NEG_POLE_DEG: readonly number[] = LIMB_LEADS.map((l) => angleOf(-Math.cos((LIMB_ANGLE_DEG[l] * Math.PI) / 180), -Math.sin((LIMB_ANGLE_DEG[l] * Math.PI) / 180)));
