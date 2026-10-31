/**
 * Pure maths of the "vector-pen" scene (The heart vector is the pen; lesson f2; spec docs/design/f-explainers.md
 * §4.2). No Preact, no DOM — everything here is unit-tested in tests/figures/scenes/vector-pen.test.ts.
 *
 * One source. The whole scene is one schematic frontal loop: a heart vector v(s), s ∈ [0, 1] loop time, built from
 * four Gaussian components exactly as `loopPoints` (math/projection.ts) builds them — septal (+165°), main (around the
 * axis, sweeping 70°), basal (axis − 170°) and T (axis − 15°, broad). Every lead is the projection of that same loop on
 * the lead's unit axis (`projectLoop`, LIMB_ANGLE_DEG; II = I + III and aVR + aVL + aVF = 0 hold exactly).
 *
 * The direction the learner drags is the MEAN QRS vector (area vector of the QRS part of the loop). The septal and
 * basal components pull the area vector a few degrees off the main component, so `loopFor` solves (a short fixed-point
 * iteration on the sampled sum) for the main direction that puts the area vector exactly on `axisDeg`. A lead
 * perpendicular to the mean vector then records an exactly equiphasic QRS (net area 0), which is what the scene and
 * its Predict row teach.
 *
 * Deviation from the spec's "≈" values, recorded here: the T component is centred at 0.80 with width 0.10 (spec:
 * 0.78 / 0.12) so that the ST segment is flat between s = 0.45 and 0.60 (|v| < 0.05 of the R amplitude); with the
 * spec's values the T tail already reaches a third of its height at s = 0.6.
 */
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../../core/leads';
import { angleDiff, angleOf, clamp, gauss, normDeg, unit } from '../math/geom';
import { deflectionKind, type DeflectionKind, type LimbLead, type LoopComponent, loopPoints, projectLoop, type Vec2 } from '../math/projection';
import { beatIndexAt, compileBeats, local as localOf, seg, splitRange, tween, type BeatDef } from '../scene/timeline';
import { BEAT_IDS, type BeatId } from './vector-pen.i18n';

export type { BeatId } from './vector-pen.i18n';

// ── beats ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Nominal lengths (ms) of the five narration beats; ≈ 8.5 s in all. */
export const BEAT_MS: Readonly<Record<BeatId, number>> = { sum: 1500, drop: 1500, draw: 2000, turn: 2000, t: 1500 };
export const BEATS: readonly BeatDef<BeatId>[] = BEAT_IDS.map((id) => ({ id, ms: BEAT_MS[id] }));
/** The compiled timeline used by frame(); the component passes the same BEATS to useScene. */
export const TIMELINE = compileBeats(BEATS);

// ── the loop (one source) ──────────────────────────────────────────────────────────────────────────────────────

/** Samples per loop (≤ 96 by the scene contract). */
export const LOOP_N = 96;
/** Loop time where the QRS ends and the flat ST begins / ends. */
export const QRS_END_S = 0.5;
export const ST_END_S = 0.6;

export const SEPTAL = { deg: 165, amp: 0.18, center: 0.12, width: 0.022 } as const;
export const MAIN = { amp: 1, center: 0.25, width: 0.07, sweep: 70 } as const;
export const BASAL = { relDeg: -170, amp: 0.15, center: 0.38, width: 0.03 } as const;
export const T_COMP = { relDeg: -15, amp: 0.35, center: 0.8, width: 0.1 } as const;

/** The four components for a main direction `mainDeg` (the T and the basal vector are tied to the axis itself). */
export function loopComponents(axisDeg: number, mainDeg: number): LoopComponent[] {
  return [
    { deg: SEPTAL.deg, amp: SEPTAL.amp, center: SEPTAL.center, width: SEPTAL.width },
    { deg: mainDeg, amp: MAIN.amp, center: MAIN.center, width: MAIN.width, sweep: MAIN.sweep },
    { deg: axisDeg + BASAL.relDeg, amp: BASAL.amp, center: BASAL.center, width: BASAL.width },
    { deg: axisDeg + T_COMP.relDeg, amp: T_COMP.amp, center: T_COMP.center, width: T_COMP.width },
  ];
}

/** The heart vector at loop time s — the same formula as loopPoints (math/projection.ts), at any s. */
export function heartVectorOf(components: readonly LoopComponent[], s: number): Vec2 {
  let x = 0, y = 0;
  for (const c of components) {
    const a = c.amp * gauss(s, c.center, c.width);
    const phi = c.deg + (c.sweep ?? 0) * ((s - c.center) / (4 * c.width));
    const [ux, uy] = unit(phi);
    x += a * ux;
    y += a * uy;
  }
  return [x, y];
}

/** Loop time of sample i of LOOP_N. */
export const sOf = (i: number): number => i / (LOOP_N - 1);
/** Index of the last sample inside the QRS (s ≤ QRS_END_S). */
export const QRS_LAST_I = Math.floor(QRS_END_S * (LOOP_N - 1) + 1e-9);

function sumRange(points: readonly Vec2[], i0: number, i1: number): Vec2 {
  let x = 0, y = 0;
  for (let i = i0; i <= i1; i++) {
    x += points[i][0];
    y += points[i][1];
  }
  return [x, y];
}

export interface Loop {
  /** the mean QRS direction the learner set (degrees, (−180, 180]) */
  readonly axisDeg: number;
  /** direction of the main component after the correction for the septal and basal vectors */
  readonly mainDeg: number;
  readonly components: readonly LoopComponent[];
  /** LOOP_N samples of the loop (unit = the main component's amplitude) */
  readonly points: readonly Vec2[];
  /** area vector of the QRS samples (sum), exactly at axisDeg */
  readonly area: Vec2;
}

/**
 * The loop for a mean QRS direction: solves the main component's direction so that the sampled QRS area vector points
 * at `axisDeg` (fixed point on the angle error; the main component dominates, so three iterations leave < 1e-6°).
 */
export function loopFor(axisDeg: number): Loop {
  const a = normDeg(axisDeg);
  let mainDeg = a;
  let comps = loopComponents(a, mainDeg);
  let points = sample(comps);
  let area = sumRange(points, 0, QRS_LAST_I);
  for (let k = 0; k < 6; k++) {
    const err = angleDiff(a, angleOf(area[0], area[1]));
    if (Math.abs(err) < 1e-9) break;
    mainDeg += err;
    comps = loopComponents(a, mainDeg);
    points = sample(comps);
    area = sumRange(points, 0, QRS_LAST_I);
  }
  return { axisDeg: a, mainDeg, components: comps, points, area };
}

/** The sampled loop: loopPoints of math/projection.ts (s = i / (LOOP_N − 1), the same samples as sOf). */
const sample = (components: readonly LoopComponent[]): Vec2[] => loopPoints(components, LOOP_N);

/** Mean QRS direction of a sampled loop (degrees). */
export function meanQrsDeg(points: readonly Vec2[]): number {
  const [x, y] = sumRange(points, 0, QRS_LAST_I);
  return angleOf(x, y);
}

/** The scalar trace of the loop on an axis at `deg` (any angle, not only the six leads). */
export function traceOn(loop: Loop, deg: number): number[] {
  return projectLoop(loop.points, deg);
}

export interface Net {
  /** net QRS area (sum of the QRS samples) */
  readonly net: number;
  /** peak-to-peak of the QRS samples */
  readonly pp: number;
}

/** Net area and peak-to-peak of the QRS part of a trace. */
export function qrsNet(trace: readonly number[]): Net {
  let net = 0, lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= QRS_LAST_I; i++) {
    net += trace[i];
    if (trace[i] < lo) lo = trace[i];
    if (trace[i] > hi) hi = trace[i];
  }
  return { net, pp: hi - lo };
}

/** Net area of the T part of a trace (s > ST_END_S). */
export function tNet(trace: readonly number[]): number {
  let net = 0;
  for (let i = 0; i < trace.length; i++) if (sOf(i) > ST_END_S) net += trace[i];
  return net;
}

/** Direction of the T vector for a mean QRS direction. */
export const tVectorDeg = (axisDeg: number): number => normDeg(axisDeg + T_COMP.relDeg);

// ── the small fronts of beat 1 (their sum is the mean vector) ─────────────────────────────────────────────────

/**
 * Sample windows of the main (free-wall) component's three fronts: early, middle, late. They partition the QRS samples
 * (0 … QRS_LAST_I), so the main component's whole QRS area is shared among them.
 */
export const FRONT_RANGES: readonly (readonly [number, number])[] = (() => {
  const cut = (s: number) => Math.floor(s * (LOOP_N - 1) + 1e-9);
  const c1 = cut(0.22), c2 = cut(0.28);
  return [[0, c1], [c1 + 1, c2], [c2 + 1, QRS_LAST_I]];
})();

/** Where each front starts on the faint LV outline (unit coordinates around the centre). */
export const FRONT_ORIGINS: readonly Vec2[] = [
  [0.1, -0.35], // septum, high
  [0.62, -0.12], // anterior free wall
  [0.55, 0.3], // apex
  [0.1, 0.62], // inferior wall
  [-0.4, 0.28], // base, posterior
];

export interface Front {
  /** vector of the front (unit = mean vector length) */
  readonly vx: number;
  readonly vy: number;
  readonly ox: number;
  readonly oy: number;
}

/**
 * The five fronts of beat 1, built per component of the one loop (QRS-sample area of each): the septal component
 * (+165°), the main component split into its three FRONT_RANGES windows, and the basal component (axis − 170°) with
 * the T component's tiny QRS-window tail folded in. Area is linear in the components, so the five sum exactly to the
 * loop's QRS area vector; they are normalised so that sum is the unit mean vector.
 */
export function fronts(loop: Loop): Front[] {
  const mag = Math.hypot(loop.area[0], loop.area[1]);
  const [sep, main, bas, tc] = loop.components;
  const pMain = sample([main]);
  const vecs: Vec2[] = [
    sumRange(sample([sep]), 0, QRS_LAST_I),
    ...FRONT_RANGES.map(([i0, i1]) => sumRange(pMain, i0, i1)),
    sumRange(sample([bas, tc]), 0, QRS_LAST_I),
  ];
  return vecs.map(([x, y], k) => ({ vx: x / mag, vy: y / mag, ox: FRONT_ORIGINS[k][0], oy: FRONT_ORIGINS[k][1] }));
}

// ── cells, snapping, angles ───────────────────────────────────────────────────────────────────────────────────

export interface CellDef {
  readonly label: string;
  readonly deg: number;
}

/** The three fixed cells of the tour. */
export const TOUR_CELLS: readonly CellDef[] = [
  { label: 'II', deg: LIMB_ANGLE_DEG.II },
  { label: 'aVL', deg: LIMB_ANGLE_DEG.aVL },
  { label: 'aVR', deg: LIMB_ANGLE_DEG.aVR },
];

/** Six cells: standard order, or the Cabrera sequence (aVL, I, −aVR, II, aVF, III) with aVR inverted. */
export function sixCells(cabrera: boolean): CellDef[] {
  if (!cabrera) return LIMB_LEADS.map((l) => ({ label: l, deg: LIMB_ANGLE_DEG[l] }));
  return [
    { label: 'aVL', deg: -30 },
    { label: 'I', deg: 0 },
    { label: '−aVR', deg: 30 },
    { label: 'II', deg: 60 },
    { label: 'aVF', deg: 90 },
    { label: 'III', deg: 120 },
  ];
}

/**
 * Deflection kind of a lead axis for the mean vector by angle alone (ISO_TOL of math/projection.ts). Used only for the
 * Predict row's answer key; every label drawn next to a complex uses kindOfTrace.
 */
export const kindOf = (axisDeg: number, leadDeg: number): DeflectionKind => deflectionKind(axisDeg, leadDeg);

/** |net| / Σ|v| of the QRS samples below which a drawn complex reads as equiphasic (R/S ≈ 0.6 … 1.7 on this loop). */
export const ISO_NET_RATIO = 0.2;

/**
 * Deflection kind of the complex a trace actually draws: equiphasic when the QRS net area is small against its total
 * absolute area, otherwise the sign of the net area. The net area is the mean vector's projection on the lead (area
 * is linear), so this also classifies the mean vector's shadow on that axis.
 */
export function kindOfTrace(trace: readonly number[]): DeflectionKind {
  const { net } = qrsNet(trace);
  let abs = 0;
  for (let i = 0; i <= QRS_LAST_I; i++) abs += Math.abs(trace[i]);
  if (abs <= 1e-12 || Math.abs(net) < ISO_NET_RATIO * abs) return 'equiphasic';
  return net > 0 ? 'positive' : 'negative';
}

/** Snap tolerance to the six lead axes (both poles → every multiple of 30°). */
export const SNAP_DEG = 5;

export function snapToAxes(deg: number, tol = SNAP_DEG): number {
  const d = normDeg(deg);
  const near = Math.round(d / 30) * 30;
  return Math.abs(angleDiff(d, near)) <= tol ? normDeg(near) : d;
}

/** Angle on the shortest arc from a to b at fraction f. */
export function tweenAngle(a: number, b: number, f: number): number {
  return normDeg(a + angleDiff(b, a) * f);
}

export const LEAD_OF = (lead: LimbLead): number => LIMB_ANGLE_DEG[lead];

// ── placement ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface Placement {
  readonly w: number;
  readonly h: number;
  readonly wheel: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly strip: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** cells: top-left of the first, size, gap; six-cell mode uses two rows of `h6` */
  readonly cells: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly gap: number; readonly h6: number };
  /** y of the rule chips under the three cells / under the two rows of six */
  readonly chipY: number;
  readonly chipY6: number;
}

export const PLACEMENT: Readonly<Record<'wide' | 'narrow', Placement>> = {
  wide: {
    w: 760,
    h: 420,
    wheel: { cx: 190, cy: 208, r: 140 },
    strip: { x: 400, y: 22, w: 350, h: 150 },
    cells: { x: 400, y: 196, w: 110, h: 96, gap: 10, h6: 82 },
    chipY: 306,
    chipY6: 380,
  },
  narrow: {
    w: 420,
    h: 690,
    wheel: { cx: 210, cy: 165, r: 128 },
    strip: { x: 20, y: 330, w: 380, h: 140 },
    cells: { x: 20, y: 486, w: 120, h: 96, gap: 10, h6: 74 },
    chipY: 596,
    chipY6: 652,
  },
};

/** Height of a rule chip (two lines of 10.5-unit text at most). */
export const CHIP_H = 30;
/** Characters per chip line before the label wraps (SvgLabel max). */
export const CHIP_MAX = 17;

/** The learner's stage is "narrow" below this CSS width. */
export const NARROW_BELOW_PX = 560;

/** Vector length (user units) for a unit vector on the wheel. */
export const vlenOf = (pl: Placement): number => pl.wheel.r * 0.78;
/** Strip: user units per unit of loop time, pen x, baseline y, units per trace unit (1 unit = 10 mm, mm = 5 units). */
export const MM = 5;
export const TRACE_SCALE = 10 * MM;
export const PX_PER_S = 32 * MM;
export const penX = (pl: Placement): number => pl.strip.x + Math.round((pl.strip.w * 2) / 3);
export const baseY = (pl: Placement): number => pl.strip.y + Math.round(pl.strip.h * 0.56);

// ── frame ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface SceneInput {
  readonly loop: Loop;
  /** the highlighted lead's axis (the strip's lead) */
  readonly leadDeg: number;
}

/** Per-frame numbers; everything the component draws is a transform or a path of these. */
export interface Frame {
  readonly beat: BeatId;
  /** instantaneous heart vector (polar; length in units of the mean vector) */
  readonly arrowDeg: number;
  readonly arrowLen: number;
  /** the dashed mean vector + its handle (0 while the solid arrow IS the mean vector) */
  readonly meanOn: number;
  /** beat 1: fronts slid from the wall to their head-to-tail chain (0 → 1), chain opacity */
  readonly chainF: number;
  readonly chainOn: number;
  /** the highlighted axis (degrees, continuous) */
  readonly axisDeg: number;
  /** perpendicular from the (instantaneous) tip to the highlighted axis and its shadow; beat 2's guide line to the pen */
  readonly dropOn: number;
  readonly guideOn: number;
  /** the mean vector's shadow on the rotating axis, coloured by its sign (beats 4–5) */
  readonly shadowOn: number;
  /** q / R / s letters on the strip (hidden while the axis is away from the strip's lead) */
  readonly lettersOn: number;
  /** loop time drawn so far (strip and trail), 0 before the pen starts */
  readonly s: number;
  /** signed projection the pen stands at (trace units) */
  readonly penValue: number;
  /** the pen moves without drawing */
  readonly penGlow: boolean;
  /** opacity of the three tour cells and of the rule chips */
  readonly cellOn: readonly [number, number, number];
  readonly chipsOn: number;
  /** the dashed T vector and its label */
  readonly tVecOn: number;
  readonly labelSumOn: number;
}

const BEAT_INDEX: Readonly<Record<BeatId, number>> = { sum: 0, drop: 1, draw: 2, turn: 3, t: 4 };

/** Legs of the axis tour in beat 4: lead → I → aVL → aVR, each weighted by its angular travel. */
export function turnLegs(leadDeg: number): { readonly stops: readonly number[]; readonly ranges: readonly (readonly [number, number])[] } {
  const stops = [leadDeg, 0, -30, -150];
  const weights = [1, 2, 3].map((k) => Math.abs(angleDiff(stops[k], stops[k - 1])));
  return { stops, ranges: splitRange(0, 1, weights.every((w) => w === 0) ? [1, 1, 1] : weights) };
}

/** The highlighted axis during beat 4 (local 0 … 1): signed travel along the legs (never the long way round). */
export function turnAxis(leadDeg: number, local: number): number {
  const { stops, ranges } = turnLegs(leadDeg);
  let a = stops[0];
  for (let k = 0; k < 3; k++) {
    const [r0, r1] = ranges[k];
    a = tween(stops[k], stops[k + 1], seg(local, r0, r1));
    if (local < r1) break;
  }
  return normDeg(a);
}

/** Local time in beat 4 at which the axis passes a cell's angle (null when the tour never reaches it). */
export function passTime(leadDeg: number, cellDeg: number): number | null {
  const { stops, ranges } = turnLegs(leadDeg);
  for (let k = 0; k < 3; k++) {
    const a = stops[k], b = stops[k + 1];
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (cellDeg >= lo - 1e-9 && cellDeg <= hi + 1e-9) {
      const [r0, r1] = ranges[k];
      const f = hi === lo ? 0 : Math.abs(cellDeg - a) / (hi - lo);
      return r0 + (r1 - r0) * f;
    }
  }
  return null;
}

export function frame(p: number, input: SceneInput): Frame {
  const beats = TIMELINE.beats;
  const i = beatIndexAt(beats, p);
  const beat = beats[i].id;
  const L = localOf(beats, i, p);
  const { loop, leadDeg } = input;
  const axis = loop.axisDeg;
  const at = (b: BeatId) => BEAT_INDEX[b];
  const after = (b: BeatId) => i > at(b);

  // ── the arrow and the loop time ──
  let arrowDeg = axis, arrowLen = 1, s = 0, meanOn = 1, penGlow = false;
  let chainF = 1, chainOn = 0, labelSumOn = 0;
  if (beat === 'sum') {
    chainF = seg(L, 0.08, 0.5);
    arrowLen = seg(L, 0.5, 0.8);
    chainOn = 1 - seg(L, 0.8, 0.97);
    labelSumOn = seg(L, 0.75, 0.95);
    meanOn = 0;
  } else if (beat === 'drop') {
    meanOn = 0;
    labelSumOn = 1 - seg(L, 0, 0.25);
  } else if (beat === 'draw') {
    const f = seg(L, 0, 0.12);
    const sv = heartVectorOf(loop.components, 0);
    const [mx, my] = unit(axis);
    const x = tween(mx, sv[0], f), y = tween(my, sv[1], f);
    s = QRS_END_S * seg(L, 0.14, 1);
    if (s > 0) {
      const v = heartVectorOf(loop.components, s);
      arrowDeg = angleOf(v[0], v[1]);
      arrowLen = Math.hypot(v[0], v[1]);
    } else {
      arrowDeg = angleOf(x, y);
      arrowLen = Math.hypot(x, y);
    }
    meanOn = f;
    penGlow = L < 0.14;
  } else {
    s = beat === 'turn' ? QRS_END_S : tween(QRS_END_S, 1, seg(L, 0.35, 1));
    const v = heartVectorOf(loop.components, s);
    arrowDeg = angleOf(v[0], v[1]);
    arrowLen = Math.hypot(v[0], v[1]);
  }

  // ── the highlighted axis ──
  let axisDeg = leadDeg;
  if (beat === 'turn') axisDeg = turnAxis(leadDeg, L);
  else if (beat === 't') axisDeg = tweenAngle(-150, leadDeg, seg(L, 0, 0.35));

  // ── the drop (stays while the arrow draws), its guide (beat 2 only), the mean vector's shadow, the letters ──
  let dropOn = 0, guideOn = 0, shadowOn = 0, lettersOn = 0;
  if (beat === 'drop') {
    dropOn = seg(L, 0.05, 0.35);
    guideOn = seg(L, 0.35, 0.7);
  } else if (beat === 'draw') {
    dropOn = 1;
    guideOn = 1 - seg(L, 0, 0.12);
    lettersOn = seg(L, 0, 0.12);
  } else if (beat === 'turn') {
    dropOn = 1 - seg(L, 0, 0.1);
    shadowOn = seg(L, 0.04, 0.16);
    lettersOn = 1 - seg(L, 0, 0.1);
  } else if (beat === 't') {
    dropOn = seg(L, 0.3, 0.4) - seg(L, 0.9, 1);
    shadowOn = 1;
    lettersOn = seg(L, 0.25, 0.4);
  }

  // ── the pen ──
  const [ux, uy] = unit(axisDeg);
  const [ax, ay] = unit(arrowDeg);
  const proj = arrowLen * (ax * ux + ay * uy);
  const lift = beat === 'sum' ? 0 : beat === 'drop' ? seg(L, 0.35, 0.7) : 1;
  const penValue = proj * lift;
  if (beat === 'drop' && L > 0.35 && L < 0.7) penGlow = true;

  // ── cells and chips (beat 4), the T vector (beat 5) ──
  const cellOn: [number, number, number] = [0, 0, 0];
  if (beat === 'turn' || after('turn')) {
    const tl = beat === 'turn' ? L : 1;
    TOUR_CELLS.forEach((c, k) => {
      const tc = passTime(leadDeg, c.deg);
      const a = tc == null ? 0.88 : clamp(tc - 0.03, 0, 0.88);
      cellOn[k] = seg(tl, a, a + 0.12);
    });
  }
  const chipsOn = beat === 'turn' ? seg(L, 0.86, 1) : after('turn') ? 1 : 0;
  const tVecOn = beat === 't' ? seg(L, 0.5, 0.8) : 0;

  return { beat, arrowDeg, arrowLen, meanOn, chainF, chainOn, axisDeg, dropOn, guideOn, shadowOn, lettersOn, s, penValue, penGlow, cellOn, chipsOn, tVecOn, labelSumOn };
}

// ── path builders (pure strings; the component only places them) ──────────────────────────────────────────────

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * The strip trace up to loop time s, in paper coordinates (x = s × PX_PER_S, y = −value × TRACE_SCALE), with the last
 * point interpolated exactly at s. The component translates the paper so that x(s) sits under the fixed pen.
 */
export function stripPath(trace: readonly number[], s: number, end?: number): string {
  if (s <= 0) return '';
  let d = '';
  const n = trace.length;
  const sMax = Math.min(1, s);
  const k = Math.min(n - 1, Math.floor(sMax * (n - 1)));
  for (let i = 0; i <= k; i++) d += `${i === 0 ? 'M' : 'L'}${r2(sOf(i) * PX_PER_S)} ${r2(-trace[i] * TRACE_SCALE)}`;
  if (k < n - 1) {
    const f = (sMax - sOf(k)) * (n - 1);
    const v = end ?? tween(trace[k], trace[k + 1], f);
    d += `L${r2(sMax * PX_PER_S)} ${r2(-v * TRACE_SCALE)}`;
  }
  return d;
}

/** The loop trail on the wheel up to loop time s (centre 0,0; `scale` units per loop unit). */
export function trailPath(points: readonly Vec2[], s: number, scale: number): string {
  if (s <= 0) return '';
  let d = '';
  const n = points.length;
  const sMax = Math.min(1, s);
  const k = Math.min(n - 1, Math.floor(sMax * (n - 1)));
  for (let i = 0; i <= k; i++) d += `${i === 0 ? 'M' : 'L'}${r2(points[i][0] * scale)} ${r2(points[i][1] * scale)}`;
  if (k < n - 1) {
    const f = (sMax - sOf(k)) * (n - 1);
    d += `L${r2(tween(points[k][0], points[k + 1][0], f) * scale)} ${r2(tween(points[k][1], points[k + 1][1], f) * scale)}`;
  }
  return d;
}

/** A mini-complex path for a cell: a trace of the loop (traceOn on the cell's axis), fitted in a w × h box at (x, y). */
export function cellPath(tr: readonly number[], x: number, y: number, w: number, h: number): string {
  const base = y + h * 0.56;
  const sc = h * 0.3;
  let d = '';
  for (let i = 0; i < tr.length; i++) d += `${i === 0 ? 'M' : 'L'}${r2(x + 8 + ((w - 16) * i) / (tr.length - 1))} ${r2(base - tr[i] * sc)}`;
  return d;
}

/** Tail and head of front k in beat 1: slid from its wall origin to its place in the head-to-tail chain (f = chainF). */
export function frontSegment(fr: readonly Front[], k: number, f: number): { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } {
  let cx = 0, cy = 0;
  for (let j = 0; j < k; j++) {
    cx += fr[j].vx;
    cy += fr[j].vy;
  }
  const o = fr[k];
  const x0 = tween(o.ox, cx, f), y0 = tween(o.oy, cy, f);
  return { x0, y0, x1: x0 + o.vx, y1: y0 + o.vy };
}

/** A faint left-ventricle outline (unit coordinates, centre 0,0) the fronts start on. */
export const LV_OUTLINE: readonly Vec2[] = [
  [-0.2, -0.45], [0.2, -0.46], [0.5, -0.3], [0.68, -0.02], [0.6, 0.3], [0.38, 0.55], [0.08, 0.66], [-0.22, 0.56], [-0.45, 0.3], [-0.52, -0.05], [-0.42, -0.35],
];

/** Box of cell k: one row of three (tour) or two rows of three (six cells). */
export function cellRect(pl: Placement, k: number, six: boolean): { readonly x: number; readonly y: number; readonly w: number; readonly h: number } {
  const c = pl.cells;
  const col = k % 3, row = six ? Math.floor(k / 3) : 0;
  const h = six ? c.h6 : c.h;
  return { x: c.x + col * (c.w + c.gap), y: c.y + row * (h + c.gap), w: c.w, h };
}

export interface Letter {
  readonly i: number;
  readonly text: 'q' | 'R' | 's' | 'T';
  readonly v: number;
}

/**
 * Wave letters of a trace (positive QRS only, else none): q = the dip before R, R = the peak, s = the dip after it
 * (each only when it is at least 3 % of the peak), T = the extreme of the T part. Indices are samples of the loop.
 */
export function waveLetters(trace: readonly number[]): Letter[] {
  let iR = 0;
  for (let i = 0; i <= QRS_LAST_I; i++) if (trace[i] > trace[iR]) iR = i;
  const R = trace[iR];
  const out: Letter[] = [];
  if (R <= 0 || qrsNet(trace).net <= 0) return out;
  let iq = 0, is = iR;
  for (let i = 0; i < iR; i++) if (trace[i] < trace[iq]) iq = i;
  for (let i = iR; i <= QRS_LAST_I; i++) if (trace[i] < trace[is]) is = i;
  if (-trace[iq] > 0.03 * R) out.push({ i: iq, text: 'q', v: trace[iq] });
  out.push({ i: iR, text: 'R', v: R });
  if (-trace[is] > 0.03 * R) out.push({ i: is, text: 's', v: trace[is] });
  let iT = -1;
  for (let i = 0; i < trace.length; i++) if (sOf(i) > ST_END_S && (iT < 0 || Math.abs(trace[i]) > Math.abs(trace[iT]))) iT = i;
  if (iT >= 0) out.push({ i: iT, text: 'T', v: trace[iT] });
  return out;
}

// ── small drawing helpers (pure strings / points; keep the component thin) ───────────────────────────────────

export type Pt = readonly [number, number];
/** The point at `len` user units from c in direction deg. */
export function polar(c: Pt, deg: number, len: number): Pt {
  const [ux, uy] = unit(deg);
  return [c[0] + len * ux, c[1] + len * uy];
}
/** A straight segment as an SVG path. */
export const lineD = (a: Pt, b: Pt): string => `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
/** The LV outline around c, `scale` units per unit. */
export const outlineD = (c: Pt, scale: number): string => `${LV_OUTLINE.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(c[0] + x * scale)} ${r2(c[1] + y * scale)}`).join('')}Z`;

/** Every point the component places for a frame (user units): the wheel's vectors, feet and labels, the pen. */
export interface Points {
  readonly C: Pt;
  readonly mean: Pt;
  /** tip of the instantaneous arrow, its signed projection on the axis and the foot of the perpendicular */
  readonly tip: Pt;
  readonly inst: number;
  readonly foot: Pt;
  /** foot of the mean vector on the highlighted axis */
  readonly shadow: Pt;
  readonly axisEnd: Pt;
  readonly axisNeg: Pt;
  readonly tDeg: number;
  readonly tTip: Pt;
  readonly meanLbl: Pt;
  readonly tLbl: Pt;
  /** text anchors that keep the two labels clear of their vectors */
  readonly meanAnchor: Anchor;
  readonly tAnchor: Anchor;
  readonly sumLbl: Pt;
  readonly instLbl: Pt;
  /** opacity of the instantaneous arrow (its head has no direction near zero length) */
  readonly arrowOp: number;
  readonly penX: number;
  readonly baseY: number;
  readonly penY: number;
  /** x translation of the paper (paper x = loop time × PX_PER_S) */
  readonly paperX: number;
}

export type Anchor = 'start' | 'middle' | 'end';
/** Anchor for a label pushed from its point in direction deg: away from the point, never across it. */
export const anchorFor = (deg: number): Anchor => {
  const c = Math.cos((deg * Math.PI) / 180);
  return c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
};

export function points(pl: Placement, f: Frame, axisDeg: number): Points {
  const W = pl.wheel, vl = vlenOf(pl);
  const C: Pt = [W.cx, W.cy];
  const cosd = (d: number) => Math.cos((d * Math.PI) / 180);
  const inst = f.arrowLen * cosd(f.arrowDeg - f.axisDeg);
  const foot = polar(C, f.axisDeg, inst * vl);
  const tDeg = tVectorDeg(axisDeg);
  const tTip = polar(C, tDeg, 0.55 * vl);
  const px = penX(pl), by = baseY(pl);
  return {
    C,
    mean: polar(C, axisDeg, vl),
    tip: polar(C, f.arrowDeg, f.arrowLen * vl),
    inst,
    foot,
    shadow: polar(C, f.axisDeg, cosd(axisDeg - f.axisDeg) * vl),
    axisEnd: polar(C, f.axisDeg, W.r),
    axisNeg: polar(C, f.axisDeg + 180, W.r),
    tDeg,
    tTip,
    meanLbl: polar(polar(C, axisDeg, 0.62 * vl), axisDeg + 90, 10),
    tLbl: polar(polar(tTip, tDeg, 6), tDeg - 90, 10),
    meanAnchor: anchorFor(axisDeg + 90),
    tAnchor: anchorFor(tDeg - 90),
    sumLbl: polar(C, axisDeg + 180, W.r * 0.3),
    instLbl: polar(foot, f.axisDeg - 90, 18),
    arrowOp: Math.min(1, f.arrowLen / 0.08),
    penX: px,
    baseY: by,
    penY: by - f.penValue * TRACE_SCALE,
    paperX: px - f.s * PX_PER_S,
  };
}
