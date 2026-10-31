/**
 * Pure maths of the "chest-ring" scene (docs/design/f-explainers.md §4.5): the beats, the chest-wall arc the electrode
 * walks on, the moving lead axis (`precordialAt`), the one-source computation (horizontalQrsLoop → six fixed sites +
 * the moving electrode, all against Wilson's central terminal) and `frame(p, state)`. No Preact, no DOM.
 *
 * Conventions: src/figures/math/projection.ts (transverse section, anterior = −y, 0° = patient's left, clockwise
 * positive, +90° = posterior). The WCT beat is symbolic (a label at the heart's electrical centre); the only animated
 * source is the loop.
 */
import { CHEST_LEADS, LIMB_ANGLE_DEG, LIMB_LEADS } from '../../core/leads';
import { angleDiff, angleOf, clamp, lerp, normDeg } from '../math/geom';
import {
  CHEST,
  DEFAULT_HORIZONTAL_DEG,
  HEART_CENTER,
  horizontalQrsLoop,
  measureRS,
  PRECORDIAL_DEG,
  PRECORDIAL_GAIN,
  PRECORDIAL_SITES,
  projectLoop,
  rsTransition,
  type ChestLead,
  type LimbLead,
  type RS,
  type Transition,
  type Vec2,
} from '../math/projection';
import { BEAT_IDS, type BeatId } from './chest-ring.i18n';

export type { BeatId };

// ── beats ──────────────────────────────────────────────────────────────────────────────────────────────────────

const BEAT_MS: Readonly<Record<BeatId, number>> = { wct: 1500, one: 1600, walk: 3200, transition: 1200, groups: 1000 };

/** The five narration beats (≈ 8.5 s). */
export const BEATS: readonly { readonly id: BeatId; readonly ms: number }[] = BEAT_IDS.map((id) => ({ id, ms: BEAT_MS[id] }));

/** Fractions of the timeline each beat occupies (the same tiling compileBeats produces). */
export const BEAT_RANGES: Readonly<Record<BeatId, readonly [number, number]>> = (() => {
  const total = BEATS.reduce((s, b) => s + b.ms, 0);
  const out = {} as Record<BeatId, readonly [number, number]>;
  let from = 0;
  BEATS.forEach((b, i) => {
    const to = i === BEATS.length - 1 ? 1 : from + b.ms / total;
    out[b.id] = [from, to];
    from = to;
  });
  return out;
})();

/** Local progress 0 … 1 of p inside a beat (0 before, 1 after). */
export function localOf(id: BeatId, p: number): number {
  const [a, b] = BEAT_RANGES[id];
  return clamp((p - a) / (b - a), 0, 1);
}

// ── the chest-wall arc and the moving lead ─────────────────────────────────────────────────────────────────────

/** Number of fixed sites minus one: s ∈ [0, SITES_MAX] walks V1 → V6. */
export const SITES_MAX = CHEST_LEADS.length - 1;

function wallY(x: number): number {
  return -CHEST.ry * Math.sqrt(Math.max(0, 1 - (x / CHEST.rx) ** 2));
}

/**
 * A point on the anterior chest wall between the fixed sites: s = k is exactly PRECORDIAL_SITES[Vk+1]; between two
 * sites x moves linearly and y stays on the wall of the section (the same construction as the sites).
 */
export function chestArcPoint(s: number): Vec2 {
  const t = clamp(s, 0, SITES_MAX);
  const k = Math.min(SITES_MAX - 1, Math.floor(t));
  const f = t - k;
  const a = PRECORDIAL_SITES[CHEST_LEADS[k]];
  const b = PRECORDIAL_SITES[CHEST_LEADS[k + 1]];
  if (f === 0) return a;
  if (f === 1) return b;
  const x = lerp(a[0], b[0], f);
  return [x, wallY(x)];
}

export interface MovingLead {
  /** direction of the lead axis from the heart's electrical centre (degrees) */
  readonly deg: number;
  /** recording gain ∝ 1 / distance to the centre, 1 at V3 */
  readonly gain: number;
  /** the electrode position on the section */
  readonly site: Vec2;
}

const dist = (p: Vec2) => Math.hypot(p[0] - HEART_CENTER[0], p[1] - HEART_CENTER[1]);
const REF_DIST = dist(PRECORDIAL_SITES.V3);

/** The moving chest lead at arc position s: angle from HEART_CENTER to chestArcPoint(s), gain ∝ 1 / distance. */
export function precordialAt(s: number): MovingLead {
  const site = chestArcPoint(s);
  return { deg: angleOf(site[0] - HEART_CENTER[0], site[1] - HEART_CENTER[1]), gain: REF_DIST / dist(site), site };
}

// ── one source → six cells + the moving electrode ─────────────────────────────────────────────────────────────

export const LOOP_N = 64;

export interface Source {
  /** direction of the loop's main (left-ventricular) component — the loop's parameter, not what the arrow shows */
  readonly mainDeg: number;
  /** direction of the loop's mean (area) vector, angleOf(Σx, Σy): the arrow, the read-out and the slider value */
  readonly meanDeg: number;
  /** the horizontal QRS loop (section units, amplitude 1) */
  readonly loop: readonly Vec2[];
  /** gain-scaled projection of the loop on each fixed lead, V1 … V6 */
  readonly traces: readonly (readonly number[])[];
  readonly rs: readonly RS[];
  readonly transition: Transition;
  /** largest |deflection| over the six cells (for a common vertical scale) */
  readonly maxAmp: number;
}

/** Everything that depends on the main vector only: recomputed on a drag or a Predict reveal, never per frame. */
export function computeSource(mainDeg: number): Source {
  const loop = horizontalQrsLoop(mainDeg, LOOP_N);
  const traces = CHEST_LEADS.map((l) => {
    const g = PRECORDIAL_GAIN[l];
    return projectLoop(loop, PRECORDIAL_DEG[l]).map((v) => v * g);
  });
  const rs = traces.map(measureRS);
  const maxAmp = Math.max(0.05, ...rs.map((m) => Math.max(m.r, m.s)));
  return { mainDeg, meanDeg: meanOfLoop(loop), loop, traces, rs, transition: rsTransition(rs), maxAmp };
}

/** Direction of a loop's mean (area) vector: the sum of its points. */
export function meanOfLoop(loop: readonly Vec2[]): number {
  let x = 0;
  let y = 0;
  for (const [a, b] of loop) {
    x += a;
    y += b;
  }
  return angleOf(x, y);
}

/** Mean-vector direction of horizontalQrsLoop(mainDeg). */
export const loopMeanDeg = (mainDeg: number): number => meanOfLoop(horizontalQrsLoop(mainDeg, LOOP_N));

/**
 * The loop parameter whose mean vector points at `meanDeg` (what a drag or an arrow key sets). The map main → mean is
 * monotone with the mean 13°–28° behind the main component, so the answer lies in [mean, mean + 45]: bisection.
 */
export function mainForMean(meanDeg: number): number {
  let lo = meanDeg;
  let hi = meanDeg + 45;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (angleDiff(loopMeanDeg(mid), meanDeg) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Gain-scaled projection of a loop on the moving lead (what the walking electrode records at s). */
export function movingTrace(loop: readonly Vec2[], s: number): number[] {
  const m = precordialAt(s);
  return projectLoop(loop, m.deg).map((v) => v * m.gain);
}

/**
 * The cell that "lights" at the transition beat: the first lead with R ≥ S (what rsTransition classifies on), or null
 * if R < S in every lead. The R = S point itself lies between this cell and the previous one (`crossing`).
 */
export function transitionCell(t: Transition): number | null {
  return t.firstIndex;
}

/** The two cells either side of the R = S crossing (one cell when R ≥ S already in V1; empty when never). */
export function straddling(t: Transition): readonly number[] {
  if (t.crossing == null) return [];
  if (t.crossing <= 0) return [0];
  const k = Math.min(SITES_MAX - 1, Math.floor(t.crossing));
  return [k, k + 1];
}

/** Lead names where R = S ("V3–V4", "V1"), or null when R < S everywhere. */
export function whereOf(t: Transition): string | null {
  const c = straddling(t);
  return c.length === 0 ? null : c.map((k) => CHEST_LEADS[k]).join('–');
}

/** Every wording `whereOf` can return (to reserve the read-out's width). */
export const ALL_WHERE: readonly string[] = [CHEST_LEADS[0], ...CHEST_LEADS.slice(0, -1).map((l, k) => `${l}–${CHEST_LEADS[k + 1]}`)];

/** Lead-group tint of each ring cell (V1–V2 septal, V3–V4 anterior, V5–V6 lateral). */
export const CELL_GROUP = ['septal', 'septal', 'anterior', 'anterior', 'lateral', 'lateral'] as const;
export type CellGroup = (typeof CELL_GROUP)[number];

export const CHEST_LEAD_AT = (k: number): ChestLead => CHEST_LEADS[clamp(Math.round(k), 0, SITES_MAX)];

// ── frame ──────────────────────────────────────────────────────────────────────────────────────────────────────

export interface State {
  /** the main horizontal vector the learner set (degrees) */
  readonly mainDeg: number;
  /** a Predict reveal: the vector turns from → to during the transition beat (and holds after it) */
  readonly reveal?: { readonly from: number; readonly to: number } | null;
}

export interface Frame {
  /** limb wires drawn towards the junction, 0 … 1 */
  readonly wires: number;
  /** junction symbol + WCT label opacity */
  readonly wct: number;
  /** the moving electrode: opacity and arc position (0 = V1 … 5 = V6) */
  readonly electrode: number;
  readonly s: number;
  /** length fraction of the moving axis */
  readonly axis: number;
  /** mean vector + loop opacity */
  readonly vector: number;
  /** reveal fraction 0 … 1 of each ring cell's trace */
  readonly cells: readonly number[];
  /** the cell being drawn right now, −1 if none; `pen` is the loop time of the pen (0 … 1) inside that cell */
  readonly drawing: number;
  readonly pen: number;
  /** opacity of the pen (on from the first drawing to the end of the walk) */
  readonly penOn: number;
  /** "closer = larger" gain read-out */
  readonly gain: number;
  /** transition highlight, bracket and label */
  readonly transition: number;
  /** lead-group tints (ring + frontal inset) */
  readonly groups: number;
  /** effective main vector at this p (differs from state.mainDeg only once a Predict reveal turns it) */
  readonly deg: number;
}

const ease = (x: number) => {
  const f = clamp(x, 0, 1);
  return f * f * (3 - 2 * f);
};
const seg = (x: number, a: number, b: number) => (b <= a ? (x >= a ? 1 : 0) : ease((x - a) / (b - a)));
const lin = (x: number, a: number, b: number) => (b <= a ? (x >= a ? 1 : 0) : clamp((x - a) / (b - a), 0, 1));

/** Inside the walk beat each site-to-site leg takes 1/5 of the beat: glide for the first half, pause and draw after. */
export const WALK_GLIDE = 0.5;

/** The scene as a function of time: flat numbers only (the component maps them to transforms and attributes). */
export function frame(p: number, state: State): Frame {
  const uWct = localOf('wct', p);
  const uOne = localOf('one', p);
  const uWalk = localOf('walk', p);
  const uTr = localOf('transition', p);
  const uGr = localOf('groups', p);

  const cells: number[] = [lin(uOne, 0.5, 1), 0, 0, 0, 0, 0];
  let s = 0;
  let drawing = uOne >= 0.5 && uOne < 1 ? 0 : -1;
  let pen = cells[0];
  if (uWalk > 0) {
    const legs = SITES_MAX;
    const x = uWalk * legs;
    const k = Math.min(legs - 1, Math.floor(x));
    const u = x - k;
    for (let j = 1; j <= k; j++) cells[j] = 1;
    s = k + seg(u, 0, WALK_GLIDE);
    cells[k + 1] = lin(u, WALK_GLIDE, 1);
    if (uWalk < 1) {
      drawing = u >= WALK_GLIDE ? k + 1 : -1;
      pen = cells[k + 1];
    } else {
      drawing = -1;
      pen = 1;
    }
  }
  const r = state.reveal;
  const deg = r ? lerp(r.from, r.to, seg(uTr, 0.1, 0.8)) : state.mainDeg;
  return {
    wires: lin(uWct, 0, 0.55),
    wct: seg(uWct, 0.45, 0.85),
    electrode: seg(uOne, 0, 0.2),
    s,
    axis: seg(uOne, 0.1, 0.4),
    vector: seg(uOne, 0.3, 0.55),
    cells,
    drawing,
    pen,
    penOn: seg(uOne, 0.42, 0.5) * (1 - seg(uWalk, 0.96, 1)),
    gain: seg(uWalk, 0, 0.08),
    transition: seg(uTr, 0.1, 0.55),
    groups: seg(uGr, 0.1, 0.65),
    deg,
  };
}

/**
 * The flat drawn numbers of a frame, for continuity tests. `pen` and `drawing` are per-cell indices (the pen restarts
 * in each new cell, which is drawn from its own start); the visible pen position is `penPoint`, tested separately.
 */
export function flatten(f: Frame): number[] {
  return [f.wires, f.wct, f.electrode, f.s, f.axis, f.vector, ...f.cells, f.penOn, f.gain, f.transition, f.groups, f.deg];
}

// ── placement (two tables, one frame) ──────────────────────────────────────────────────────────────────────────

export interface Placement {
  readonly w: number;
  readonly h: number;
  /** section centre on screen and scale */
  readonly ox: number;
  readonly oy: number;
  readonly scale: number;
  /** centres of the six ring cells and the cell size */
  readonly cells: readonly Vec2[];
  readonly cellW: number;
  readonly cellH: number;
  /** where the septal / anterior / lateral group names sit (text-anchor `groupAnchor`) */
  readonly groupAt: readonly [Vec2, Vec2, Vec2];
  readonly groupAnchor: 'start' | 'middle';
  /** frontal inset centre and radius */
  readonly inset: Vec2;
  readonly insetR: number;
  /** where the RA, LA and LL wires come from */
  readonly wires: readonly [Vec2, Vec2, Vec2];
  /** the text panel: first baseline, characters per line before wrapping, baseline offsets of its six rows */
  readonly panel: Vec2;
  readonly panelChars: number;
  readonly panelRows: readonly number[];
  /** the inset's group legend (two lines) and its text-anchor */
  readonly legendAt: Vec2;
  readonly legendAnchor: 'middle' | 'end';
  /**
   * where the transition marker runs: 'ring' = along the ring of cells, pulled `markerPull` towards the section (off
   * the traces); 'gap' = through the gaps between the cells of a grid (the midpoints of consecutive cells)
   */
  readonly markerMode: 'ring' | 'gap';
  readonly markerPull: number;
}

const ringCells = (ox: number, oy: number, r: number, fromDeg: number, stepDeg: number): Vec2[] =>
  CHEST_LEADS.map((_, k) => {
    const a = ((fromDeg + stepDeg * k) * Math.PI) / 180;
    return [Math.round(ox + r * Math.cos(a)), Math.round(oy + r * Math.sin(a))];
  });

const WIDE_CELLS = ringCells(290, 240, 200, -150, 32);

export const WIDE: Placement = {
  w: 760,
  h: 440,
  ox: 290,
  oy: 240,
  scale: 0.85,
  cells: WIDE_CELLS,
  cellW: 96,
  cellH: 68,
  groupAt: [
    [112, 70],
    [506, 62],
    [531, 215],
  ],
  groupAnchor: 'middle',
  inset: [664, 318],
  insetR: 48,
  wires: [
    [176, 410],
    [420, 410],
    [312, 420],
  ],
  panel: [550, 30],
  panelChars: 32,
  panelRows: [0, 16, 50, 70, 92, 108],
  legendAt: [664, 404],
  legendAnchor: 'middle',
  markerMode: 'ring',
  markerPull: 46,
};

export const NARROW: Placement = {
  w: 420,
  h: 680,
  ox: 170,
  oy: 200,
  scale: 0.85,
  cells: [
    [150, 392],
    [322, 392],
    [150, 462],
    [322, 462],
    [150, 532],
    [322, 532],
  ],
  cellW: 156,
  cellH: 62,
  groupAt: [
    [8, 396],
    [8, 466],
    [8, 536],
  ],
  groupAnchor: 'start',
  inset: [366, 80],
  insetR: 36,
  wires: [
    [40, 326],
    [300, 326],
    [192, 334],
  ],
  panel: [12, 588],
  panelChars: 64,
  panelRows: [0, 16, 34, 52, 70, 86],
  legendAt: [412, 152],
  legendAnchor: 'end',
  markerMode: 'gap',
  markerPull: 0,
};

/** Breakpoint between the two placement tables (CSS px of the stage). */
export const NARROW_BELOW_PX = 560;

export const placementFor = (stagePx: number): Placement => (stagePx < NARROW_BELOW_PX ? NARROW : WIDE);

/** Screen position of the transition marker: between the cells on either side of the fractional crossing. */
export function markerAt(pl: Placement, crossing: number): Vec2 {
  const c = clamp(crossing, 0, SITES_MAX);
  const k = Math.min(SITES_MAX - 1, Math.floor(c));
  const f = c - k;
  const a = pl.cells[k];
  const b = pl.cells[k + 1];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
}

/** The marker on screen (continuous in the crossing): see Placement.markerMode. */
export function markerScreen(pl: Placement, crossing: number): Vec2 {
  if (pl.markerMode === 'gap') {
    const mid = (k: number): Vec2 => [(pl.cells[k][0] + pl.cells[k + 1][0]) / 2, (pl.cells[k][1] + pl.cells[k + 1][1]) / 2];
    const c = clamp(crossing - 0.5, 0, SITES_MAX - 1);
    const k = Math.min(SITES_MAX - 2, Math.floor(c));
    const a = mid(k);
    const b = mid(k + 1);
    return [lerp(a[0], b[0], c - k), lerp(a[1], b[1], c - k)];
  }
  const [x, y] = markerAt(pl, crossing);
  const d = Math.hypot(x - pl.ox, y - pl.oy) || 1;
  return [x - ((x - pl.ox) / d) * pl.markerPull, y - ((y - pl.oy) / d) * pl.markerPull];
}

// ── screen geometry (precomputed per placement / source; the component only maps it to SVG) ───────────────────

/** Mean-vector arrow length in section units (as HorizontalPlaneFigure). */
export const VLEN = 82;

export const toScreen = (pl: Placement, v: Vec2): Vec2 => [pl.ox + v[0] * pl.scale, pl.oy + v[1] * pl.scale];

/** The heart's electrical centre on screen: origin of every lead axis and the symbolic WCT junction. */
export const junction = (pl: Placement): Vec2 => toScreen(pl, HEART_CENTER);

/** A point at `len` section units from the heart centre in direction `deg`. */
export function fromCentre(pl: Placement, deg: number, len: number): Vec2 {
  const [x, y] = junction(pl);
  const a = (deg * Math.PI) / 180;
  return [x + Math.cos(a) * len * pl.scale, y + Math.sin(a) * len * pl.scale];
}

/** Where a fixed site's lead name sits: just outside the chest wall, along its lead axis. */
export function siteLabel(pl: Placement, k: number): Vec2 {
  const site = toScreen(pl, PRECORDIAL_SITES[CHEST_LEADS[k]]);
  const a = (PRECORDIAL_DEG[CHEST_LEADS[k]] * Math.PI) / 180;
  return [site[0] + Math.cos(a) * 15, site[1] + Math.sin(a) * 15 + 4];
}

/** The three limb wires: from their origin to the junction (quadratic curves). */
export function wirePaths(pl: Placement): string[] {
  const [jx, jy] = junction(pl);
  const r = (v: number) => Math.round(v * 10) / 10;
  return pl.wires.map(([x, y]) => `M${x} ${y}Q${x} ${r((y + jy) / 2)} ${r(jx)} ${r(jy)}`);
}

/** Inner geometry of a cell: the x range of its trace, the baseline and the vertical scale (shared by the six). */
export function cellGeom(pl: Placement, k: number, maxAmp: number): { x0: number; x1: number; base: number; scale: number } {
  const [cx, cy] = pl.cells[k];
  return { x0: cx - pl.cellW / 2 + 22, x1: cx + pl.cellW / 2 - 8, base: cy + 2, scale: (pl.cellH / 2 - 7) / maxAmp };
}

/** Screen point of trace k at loop time u ∈ [0, 1] (linear between samples). */
export function cellPoint(pl: Placement, src: Source, k: number, u: number): Vec2 {
  const g = cellGeom(pl, k, src.maxAmp);
  const tr = src.traces[k];
  const t = clamp(u, 0, 1);
  const x = t * (tr.length - 1);
  const i = Math.min(tr.length - 2, Math.floor(x));
  const v = lerp(tr[i], tr[i + 1], x - i);
  return [lerp(g.x0, g.x1, t), g.base - v * g.scale];
}

/** The six cell traces as SVG paths (revealed with pathLength = 1 + stroke-dasharray). */
export function cellPaths(pl: Placement, src: Source): string[] {
  return src.traces.map((tr, k) => {
    const g = cellGeom(pl, k, src.maxAmp);
    let d = '';
    tr.forEach((v, i) => {
      const x = lerp(g.x0, g.x1, i / (tr.length - 1));
      d += `${i ? 'L' : 'M'}${Math.round(x * 10) / 10} ${Math.round((g.base - v * g.scale) * 10) / 10}`;
    });
    return d;
  });
}

/**
 * Screen levels of the baseline, the R peak and the S nadir of cell k (the R / S brackets at the transition). The
 * bracket sits on the side of the cell away from the section, where the R = S marker never runs (it runs inside the
 * ring in the wide table and down the column gap in the narrow one). Ticks are ±TICK units wide.
 */
export function rsLevels(pl: Placement, src: Source, k: number): { base: number; r: number; s: number; x: number } {
  const g = cellGeom(pl, k, src.maxAmp);
  const left = pl.cells[k][0] < pl.ox;
  // left of the section: between the cell's border and its lead name (which starts 6 units in)
  return { base: g.base, r: g.base - src.rs[k].r * g.scale, s: g.base + src.rs[k].s * g.scale, x: left ? pl.cells[k][0] - pl.cellW / 2 + 3.25 : g.x1 + 4 };
}

/** Half-width of the bracket's ticks. */
export const TICK = 2.5;

/** The R = S pill's box around the marker (the component draws it at this size). */
export const PILL = { w: 40, h: 20 } as const;

/**
 * The visible pen on the ring: on the cell being drawn at its reveal point; while the electrode glides between two
 * sites it flies from the end of the finished cell to the start of the next one (continuous; tested).
 */
export function penPoint(pl: Placement, src: Source, f: Frame): Vec2 {
  if (f.drawing >= 0) return cellPoint(pl, src, f.drawing, f.pen);
  if (f.s >= SITES_MAX || f.cells[SITES_MAX] >= 1) return cellPoint(pl, src, SITES_MAX, 1);
  const k = Math.floor(f.s);
  if (f.cells[k] < 1) return cellPoint(pl, src, k, f.cells[k]);
  const a = cellPoint(pl, src, k, 1);
  const b = cellPoint(pl, src, k + 1, 0);
  const u = f.s - k;
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
}

/** The loop on screen (around the junction): the same loop the six cells are projections of. */
export function loopPath(pl: Placement, loop: readonly Vec2[]): string {
  const [jx, jy] = junction(pl);
  const k = VLEN * pl.scale;
  return loop.map(([x, y], i) => `${i ? 'L' : 'M'}${Math.round((jx + x * k) * 10) / 10} ${Math.round((jy + y * k) * 10) / 10}`).join('');
}

/** The loop point at loop time u on screen and its perpendicular foot on the lead axis `deg` (the "drop"). */
export function dropOnAxis(pl: Placement, loop: readonly Vec2[], u: number, deg: number): { pt: Vec2; foot: Vec2; v: number } {
  const x = clamp(u, 0, 1) * (loop.length - 1);
  const i = Math.min(loop.length - 2, Math.floor(x));
  const f = x - i;
  const lx = lerp(loop[i][0], loop[i + 1][0], f);
  const ly = lerp(loop[i][1], loop[i + 1][1], f);
  const a = (deg * Math.PI) / 180;
  const v = lx * Math.cos(a) + ly * Math.sin(a);
  const [jx, jy] = junction(pl);
  const k = VLEN * pl.scale;
  return { pt: [jx + lx * k, jy + ly * k], foot: [jx + Math.cos(a) * v * k, jy + Math.sin(a) * v * k], v };
}

// ── the frontal inset (lead groups) ────────────────────────────────────────────────────────────────────────────

export type LimbGroup = 'inferior' | 'highLateral' | 'none';
export const LIMB_GROUP: Readonly<Record<LimbLead, LimbGroup>> = { I: 'highLateral', II: 'inferior', III: 'inferior', aVR: 'none', aVL: 'highLateral', aVF: 'inferior' };

/** The six frontal axes of the inset: end point, label position and group. */
export function insetAxes(pl: Placement): { lead: LimbLead; end: Vec2; label: Vec2; group: LimbGroup }[] {
  const [cx, cy] = pl.inset;
  const r = pl.insetR;
  return LIMB_LEADS.map((lead) => {
    const a = (LIMB_ANGLE_DEG[lead] * Math.PI) / 180;
    return {
      lead,
      end: [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Vec2,
      label: [cx + Math.cos(a) * (r + 13), cy + Math.sin(a) * (r + 13) + 4] as Vec2,
      group: LIMB_GROUP[lead],
    };
  });
}

/** Token of each lead group's tint (tokens only; "lateral" has the same colour on the ring and in the inset). */
export const GROUP_TOKEN: Readonly<Record<CellGroup | 'inferior' | 'highLateral', string>> = {
  septal: 'var(--c-conduction)',
  anterior: 'var(--c-atrial)',
  lateral: 'var(--c-repol)',
  highLateral: 'var(--c-repol)',
  inferior: 'var(--c-injury)',
};

/**
 * The Predict reveal turns the loop clockwise to REVEAL_TO_DEG (main component 40° → 95°, the mean vector ≈ 14° → 77°):
 * the R = S point moves to just before V5 and R first overtakes S in V5 — a late (clockwise) transition.
 */
export const REVEAL_TURN_DEG = 55;
export const REVEAL_TO_DEG = DEFAULT_HORIZONTAL_DEG + REVEAL_TURN_DEG;

/** The reveal from the current loop parameter, turning the short way round. */
export const revealFrom = (mainDeg: number): { from: number; to: number } => ({ from: mainDeg, to: mainDeg + angleDiff(REVEAL_TO_DEG, mainDeg) });

/** Direction of the perpendicular to the mean vector on the anterior side (where the chest leads are, −y). */
export const perpDeg = (meanDeg: number): number => (Math.sin(((meanDeg - 90) * Math.PI) / 180) <= 0 ? normDeg(meanDeg - 90) : normDeg(meanDeg + 90));

/** End of the dashed perpendicular drawn at the transition beat: R = S in the lead whose axis lies along it. */
export const perpEnd = (pl: Placement, meanDeg: number): Vec2 => fromCentre(pl, perpDeg(meanDeg), VLEN);

/** Length (section units) of the dashed negative half of every lead axis: ≥ the longest drop of a loop point. */
export const NEG_LEN = 90;

/** Is a screen point on the section (where a pointer-down grabs the vector, never on a cell)? */
export function onSection(pl: Placement, x: number, y: number): boolean {
  const u = (x - pl.ox) / (CHEST.rx * pl.scale);
  const v = (y - pl.oy) / (CHEST.ry * pl.scale);
  return u * u + v * v <= 1.05;
}

/** Fixed lead axis k on screen: its electrode site, the end of its dashed negative half, and its label. */
export function axisGeom(pl: Placement, k: number): { site: Vec2; neg: Vec2; label: Vec2 } {
  return { site: toScreen(pl, PRECORDIAL_SITES[CHEST_LEADS[k]]), neg: fromCentre(pl, PRECORDIAL_DEG[CHEST_LEADS[k]] + 180, NEG_LEN), label: siteLabel(pl, k) };
}

/** The section's landmarks on screen (lungs, sternum, spine, heart outline), in section units scaled by the placement. */
export function sectionArt(pl: Placement): { lungs: readonly [number, number, number, number][]; sternum: readonly [number, number, number, number]; spine: readonly [number, number, number]; heart: readonly [number, number, number, number] } {
  const s = pl.scale;
  const [jx, jy] = junction(pl);
  return {
    lungs: [
      [pl.ox - 62 * s, pl.oy + 8 * s, 52 * s, 70 * s],
      [pl.ox + 74 * s, pl.oy + 14 * s, 46 * s, 64 * s],
    ],
    sternum: [pl.ox - 9 * s, pl.oy - CHEST.ry * s + 2, 18 * s, 14 * s],
    spine: [pl.ox, pl.oy + 80 * s, 13 * s],
    heart: [jx + 4, jy + 6, 48 * s, 34 * s],
  };
}
