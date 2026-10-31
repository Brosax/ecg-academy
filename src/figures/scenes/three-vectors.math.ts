/**
 * Pure maths of the "three-vectors" scene (Three vectors, two windows: V1 and V6; lesson f2; spec
 * docs/design/f-explainers.md §4.3). No Preact, no DOM — tested in tests/figures/scenes/three-vectors.test.ts.
 *
 * One source. The scene is one schematic horizontal QRS loop: the four Gaussian components of `horizontalQrsLoop`
 * (math/projection.ts — septal −120°, the free-wall sweep around `mainDeg`, basal `mainDeg + 110°`), optionally plus
 * one late right-anterior component (the "late right vector"). Every chest lead is the projection of that loop on
 * PRECORDIAL_DEG times PRECORDIAL_GAIN (exactly what `horizontalComplexes` does). Nothing is drawn per lead.
 *
 * Loop time. The loop is sampled over u ∈ [0, U_SPAN] (U_SPAN = 4/3) so that a late component centred at u = 0.9 can
 * be broad and still return to baseline; `loopPoints` samples s ∈ [0, 1], so every component is rescaled
 * (centre / U_SPAN, width / U_SPAN; the sweep term is scale-free). With U_SPAN = 1 this is `horizontalQrsLoop`
 * exactly (tested). Schematic scale: u = 1 ↔ MS_PER_U = 90 ms (a normal QRS, criteria.md 80–100 ms).
 *
 * Section convention (projection.ts): seen from the feet, anterior = −y, 0° = patient's left, +90° = posterior.
 *
 * Deviations from spec §4.3 (recorded here; the spec / README entries belong to their owners):
 * - Drag range 20°…70° (default 40°), not ±40°. Inside it every narration is true of the drawn signal: V1 starts with
 *   r and has an S (rS; rSR′ / rSr′ with the late vector), V6 is qRs, one of V2–V5 is RS, the free walls point left
 *   and back (tested at every degree). Below 20° V1 turns RS (early transition, "toward V1 (r)" would be false);
 *   above 70° V1 picks up an r′ without the late vector.
 * - Slow motion ×16 (spec: ×8) while the pens draw: at ×8 the 90 ms QRS is drawn in ≈ 0.7 s, too fast to follow the
 *   drops; the transport chip shows the true factor (tested). The chip stays visible in every beat because the
 *   transport row must not change shape during playback.
 * - normalComponents() mirrors horizontalQrsLoop's table (equality tested) until projection.ts exports it.
 */
import { CHEST_LEADS } from '../../core/leads';
import { angleDiff, clamp, lerp, polyline, unit } from '../math/geom';
import {
  CHEST,
  DEFAULT_HORIZONTAL_DEG,
  HEART_CENTER,
  loopPoints,
  measureRS,
  PRECORDIAL_DEG,
  PRECORDIAL_GAIN,
  PRECORDIAL_SITES,
  projectLoop,
  rsTransition,
  type ChestLead,
  type LoopComponent,
  type RS,
  type Transition,
  type Vec2,
} from '../math/projection';
import { local as localOf, seg, type Beat, type BeatDef } from '../scene/timeline';
import { BEAT_IDS, type BeatId } from './three-vectors.i18n';

export type { BeatId };

// ── beats ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Nominal lengths (ms) of the five narration beats: 7 s in all. */
export const BEAT_MS: Readonly<Record<BeatId, number>> = { look: 1000, septum: 1400, walls: 1500, bases: 1500, row: 1600 };
export const BEATS: readonly BeatDef<BeatId>[] = BEAT_IDS.map((id) => ({ id, ms: BEAT_MS[id] }));

// ── the loop (one source) ──────────────────────────────────────────────────────────────────────────────────────

/** Default main (free-wall) direction and the drag range (20°…70°: see the deviations above). */
export const MAIN_DEFAULT = DEFAULT_HORIZONTAL_DEG;
export const MAIN_MIN = 20;
export const MAIN_MAX = 70;
const MAIN_MID = (MAIN_MIN + MAIN_MAX) / 2;
/** Clamp a direction to the drag range, to the nearer end when it points behind (so a drag never flips 20° ↔ 70°). */
export const clampMain = (d: number) => MAIN_MID + clamp(Math.round(angleDiff(d, MAIN_MID)), MAIN_MIN - MAIN_MID, MAIN_MAX - MAIN_MID);

/**
 * Keyboard of the main-vector slider (WAI-ARIA slider): → / ↑ +5°, ← / ↓ −5°, Shift = 1°, PageUp / PageDown ±10°,
 * Home = MAIN_MIN, End = MAIN_MAX. Returns the new (clamped) angle, or null if the key is not handled.
 */
export function mainKey(e: { readonly key: string; readonly shiftKey: boolean }, deg: number): number | null {
  const step = e.shiftKey ? 1 : 5;
  const k = e.key;
  const v =
    k === 'ArrowRight' || k === 'ArrowUp' ? deg + step
    : k === 'ArrowLeft' || k === 'ArrowDown' ? deg - step
    : k === 'PageUp' ? deg + 10
    : k === 'PageDown' ? deg - 10
    : k === 'Home' ? MAIN_MIN
    : k === 'End' ? MAIN_MAX
    : null;
  return v == null ? null : clamp(Math.round(v), MAIN_MIN, MAIN_MAX);
}

/** Loop time sampled (u units; 1 = a normal QRS) and the number of samples (≤ 96). */
export const U_SPAN = 4 / 3;
export const LOOP_N = 86;
/** Schematic time scale: one loop-time unit = 90 ms. */
export const MS_PER_U = 90;
/** The pens start drawing a short flat lead-in before the QRS. */
export const U_LEFT = -0.18;
/** Loop time at the end of the septal and free-wall beats. */
export const U_SEPTUM_END = 0.25;
export const U_WALLS_END = 0.7;
/** Slow motion while the pens draw: wall-clock ms per ECG ms (constant pen speed in beats 2–4). */
export const SLOW = 16;

/** The four components of horizontalQrsLoop (projection.ts), mirrored so a fifth can join; equality is tested. */
export function normalComponents(mainDeg: number): LoopComponent[] {
  return [
    { deg: -120, amp: 0.24, center: 0.14, width: 0.06 },
    { deg: mainDeg - 85, amp: 0.6, center: 0.36, width: 0.08 },
    { deg: mainDeg, amp: 1, center: 0.55, width: 0.1, sweep: 40 },
    { deg: mainDeg + 110, amp: 0.2, center: 0.82, width: 0.06 },
  ];
}

/** The late right vector: right-anterior, amplitude 0.5, centre 0.9, broad (the RBBB-like terminal force). */
export const LATE: LoopComponent = { deg: -135, amp: 0.5, center: 0.9, width: 0.11 };

/**
 * The activation vectors as groups of components: 1 septal, 2 free walls (the early anterior-left component and the
 * main sweep together), 3 basal, 4 late right (when on). At every instant the loop point is the sum of the groups —
 * the arrows drawn tip-to-tail end on the loop.
 */
export const GROUPS = ['septal', 'walls', 'basal', 'late'] as const;
export type Group = (typeof GROUPS)[number];
const GROUP_OF: readonly Group[] = ['septal', 'walls', 'walls', 'basal', 'late'];

export function componentsFor(mainDeg: number, late: boolean): LoopComponent[] {
  return late ? [...normalComponents(mainDeg), LATE] : normalComponents(mainDeg);
}

/** Rescale components given in u units to loopPoints' s ∈ [0, 1] over a span of `span` u. */
export function rescale(cs: readonly LoopComponent[], span: number): LoopComponent[] {
  return cs.map((c) => ({ ...c, center: c.center / span, width: c.width / span }));
}

/** Loop time of sample i. */
export const uOf = (i: number) => (i * U_SPAN) / (LOOP_N - 1);

export type WaveName = string;
export interface Wave {
  readonly name: WaveName;
  /** sample index of the peak */
  readonly i: number;
  /** signed peak value */
  readonly v: number;
}

/**
 * Wave names from the trace itself (criteria.md qrs-naming): lobes = runs of one sign; R = first positive, Q before
 * it, S after it, R′ / S′ for later waves of the same polarity, QS when there is no positive wave; lowercase when the
 * wave is relatively small (< half of the lead's largest wave). Lobes under 8 % of that largest wave are ignored.
 */
export function namedWaves(trace: readonly number[]): Wave[] {
  const max = Math.max(1e-9, ...trace.map(Math.abs));
  const lobes: { i: number; v: number }[] = [];
  let cur: { i: number; v: number } | null = null;
  for (let i = 0; i < trace.length; i++) {
    const v = trace[i];
    if (Math.abs(v) < 0.02 * max) {
      cur = null;
      continue;
    }
    if (cur && Math.sign(cur.v) === Math.sign(v)) {
      if (Math.abs(v) > Math.abs(cur.v)) (cur.i = i), (cur.v = v);
    } else lobes.push((cur = { i, v }));
  }
  const kept: { i: number; v: number }[] = [];
  for (const l of lobes.filter((l) => Math.abs(l.v) >= 0.08 * max)) {
    const last = kept[kept.length - 1];
    if (last && Math.sign(last.v) === Math.sign(l.v)) {
      if (Math.abs(l.v) > Math.abs(last.v)) (last.i = l.i), (last.v = l.v);
    } else kept.push({ ...l });
  }
  const big = Math.max(...kept.map((l) => Math.abs(l.v)));
  const anyPos = kept.some((l) => l.v > 0);
  let rCount = 0;
  let sCount = 0;
  return kept.map((l) => {
    let base: string;
    if (!anyPos) base = 'QS';
    else if (l.v > 0) base = 'R' + '′'.repeat(rCount++);
    else if (rCount === 0) base = 'Q';
    else base = 'S' + '′'.repeat(sCount++);
    const small = Math.abs(l.v) < 0.5 * big;
    return { name: small ? base.toLowerCase() : base, i: l.i, v: l.v };
  });
}

/**
 * Duration (ms, schematic scale) of the last run of samples with the given sign whose magnitude exceeds 2 % of the
 * trace's largest deflection — e.g. the terminal S of V6 (sign −1) or the R′ of V1 (sign +1); 0 if the trace does not
 * end with that sign.
 */
export function terminalMs(trace: readonly number[], sign: 1 | -1): number {
  const thr = 0.02 * Math.max(1e-9, ...trace.map(Math.abs));
  let end = trace.length - 1;
  while (end >= 0 && Math.abs(trace[end]) <= thr) end--;
  if (end < 0 || Math.sign(trace[end]) !== sign) return 0;
  let start = end;
  while (start > 0 && Math.sign(trace[start - 1]) === sign && Math.abs(trace[start - 1]) > thr) start--;
  return ((end - start + 1) * U_SPAN * MS_PER_U) / (LOOP_N - 1);
}

export const morphology = (ws: readonly Wave[]) => ws.map((w) => w.name).join('');

export interface Source {
  readonly mainDeg: number;
  readonly late: boolean;
  /** the horizontal QRS loop, LOOP_N samples over u ∈ [0, U_SPAN] (section units, amplitude ≈ 1) */
  readonly loop: readonly Vec2[];
  /** the loop of each activation group on the same samples (they sum to `loop`); empty for an absent group */
  readonly groups: Readonly<Record<Group, readonly Vec2[]>>;
  /** each present group's vector at its own peak and the sample index of that peak (the numbered arrows) */
  readonly stamps: readonly { readonly g: Group; readonly i: number; readonly v: Vec2 }[];
  /** gain-scaled projection of the loop on V1 … V6 */
  readonly traces: Readonly<Record<ChestLead, readonly number[]>>;
  readonly rs: readonly RS[];
  readonly transition: Transition;
  readonly waves: Readonly<Record<ChestLead, readonly Wave[]>>;
  /** cumulative arc length of the loop, normalised to 1 (trail reveal) */
  readonly arc: readonly number[];
}

/** Everything that depends on the interaction state: recomputed on a drag or a toggle, never per frame. */
export function computeSource(mainDeg: number, late: boolean): Source {
  const comps = rescale(componentsFor(mainDeg, late), U_SPAN);
  const loop = loopPoints(comps, LOOP_N);
  const groups = {} as Record<Group, Vec2[]>;
  const stamps: { g: Group; i: number; v: Vec2 }[] = [];
  for (const g of GROUPS) {
    const cs = comps.filter((_, k) => GROUP_OF[k] === g);
    groups[g] = cs.length ? loopPoints(cs, LOOP_N) : [];
    if (!cs.length) continue;
    let iMax = 0;
    groups[g].forEach((v, i) => {
      if (Math.hypot(...v) > Math.hypot(...groups[g][iMax])) iMax = i;
    });
    stamps.push({ g, i: iMax, v: groups[g][iMax] });
  }
  const traces = {} as Record<ChestLead, number[]>;
  const waves = {} as Record<ChestLead, Wave[]>;
  for (const l of CHEST_LEADS) {
    const gain = PRECORDIAL_GAIN[l];
    traces[l] = projectLoop(loop, PRECORDIAL_DEG[l]).map((v) => v * gain);
    waves[l] = namedWaves(traces[l]);
  }
  const rs = CHEST_LEADS.map((l) => measureRS(traces[l]));
  const arc = [0];
  for (let i = 1; i < loop.length; i++) arc.push(arc[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
  const total = arc[arc.length - 1] || 1;
  return { mainDeg, late, loop, groups, stamps, traces, rs, transition: rsTransition(rs), waves, arc: arc.map((a) => a / total) };
}

/** Piecewise-linear sample of a per-sample series at loop time u (the flat lead-in before u = 0 ramps from 0). */
function at(series: (i: number) => number, u: number): number {
  if (u <= U_LEFT) return 0;
  if (u <= 0) return lerp(0, series(0), (u - U_LEFT) / -U_LEFT);
  const x = clamp((u * (LOOP_N - 1)) / U_SPAN, 0, LOOP_N - 1);
  const k = Math.min(LOOP_N - 2, Math.floor(x));
  return lerp(series(k), series(k + 1), x - k);
}

const vecOf = (pts: readonly Vec2[], u: number): Vec2 => (pts.length ? [at((i) => pts[i][0], u), at((i) => pts[i][1], u)] : [0, 0]);
/** The heart vector at loop time u (on the drawn loop polyline). */
export const vectorAt = (src: Source, u: number): Vec2 => vecOf(src.loop, u);
/** The vectors of the present groups at loop time u, chained tip-to-tail from the heart centre (start, end). */
export function chainAt(src: Source, u: number): { readonly g: Group; readonly from: Vec2; readonly to: Vec2 }[] {
  let x = 0, y = 0;
  return GROUPS.filter((g) => src.groups[g].length).map((g) => {
    const [dx, dy] = vecOf(src.groups[g], u);
    const from: Vec2 = [x, y];
    x += dx;
    y += dy;
    return { g, from, to: [x, y] as Vec2 };
  });
}
/** A lead's pen value at loop time u (on the drawn trace polyline). */
export const traceAt = (src: Source, lead: ChestLead, u: number) => at((i) => src.traces[lead][i], u);
/** Signed unit projection of the heart vector on a lead axis (the drop's foot). */
export function dropAt(src: Source, lead: ChestLead, u: number): number {
  const [x, y] = vectorAt(src, u);
  const [ux, uy] = unit(PRECORDIAL_DEG[lead]);
  return x * ux + y * uy;
}
/** Fraction of the loop trail drawn at loop time u. */
export const arcAt = (src: Source, u: number) => (u <= 0 ? 0 : at((i) => src.arc[i], u));

// ── frame ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Beat-local windows where the pens draw: proportional to the loop time covered, so the pen speed is constant. */
export const DRAW_WINDOWS: Readonly<Record<'septum' | 'walls' | 'bases', readonly [number, number, number, number]>> = (() => {
  const w = (id: 'septum' | 'walls' | 'bases', u0: number, u1: number, start: number) => {
    const len = ((u1 - u0) * MS_PER_U * SLOW) / BEAT_MS[id];
    return [start, start + len, u0, u1] as const;
  };
  return { septum: w('septum', U_LEFT, U_SEPTUM_END, 0.1), walls: w('walls', U_SEPTUM_END, U_WALLS_END, 0.06), bases: w('bases', U_WALLS_END, U_SPAN, 0.05) };
})();

export const ROW_LEADS = ['V2', 'V3', 'V4', 'V5'] as const satisfies readonly ChestLead[];

export interface Frame {
  /** V1 / V6 axes grown from the heart centre (0 … 1) */
  readonly axes: number;
  /** electrode / axis labels */
  readonly axisLbl: number;
  /** loop time of the pens and the heart vector */
  readonly u: number;
  /** the pens are moving */
  readonly drawing: boolean;
  /** emphasis (1 = on, lower = dimmed) of the numbered arrows by group */
  readonly emph: Readonly<Record<Group, number>>;
  /** the loop is highlighted (end of the bases beat) */
  readonly loopHi: number;
  /** V2–V5 cells slid in (0 … 1 each) */
  readonly cells: readonly number[];
  /** transition mark and morphology labels of the row */
  readonly rowLbl: number;
  /** "same vectors, opposite windows" */
  readonly same: number;
}

export function frame(p: number, beats: readonly Beat<BeatId>[]): Frame {
  const idx = (id: BeatId) => beats.findIndex((b) => b.id === id);
  const L = (id: BeatId) => localOf(beats, idx(id), p);
  const s = (id: BeatId, a: number, b: number) => seg(L(id), a, b);
  let u = U_LEFT;
  let drawing = false;
  for (const id of ['septum', 'walls', 'bases'] as const) {
    const [a, b, u0, u1] = DRAW_WINDOWS[id];
    const x = L(id);
    if (x > a) u = lerp(u0, u1, clamp((x - a) / (b - a), 0, 1));
    if (x > a && x < b) drawing = true;
  }
  const back = s('row', 0, 0.3);
  const dimAfter = (id: BeatId) => 1 - 0.55 * s(id, 0, 0.25) * (1 - back);
  const emph = { septal: dimAfter('walls'), walls: dimAfter('bases'), basal: 1, late: 1 };
  return {
    axes: s('look', 0.05, 0.6),
    axisLbl: s('look', 0.45, 0.85),
    u,
    drawing,
    emph,
    loopHi: s('bases', 0.75, 1),
    cells: ROW_LEADS.map((_, k) => s('row', 0.05 + 0.1 * k, 0.4 + 0.1 * k)),
    rowLbl: s('row', 0.6, 0.85),
    same: s('row', 0.75, 1),
  };
}

/** Opacity of something that appears once the pens pass loop time u0 (an arrow stamp, a wave label). */
export const after = (u: number, u0: number, w = 0.05) => clamp((u - u0) / w, 0, 1);

// ── placement (two tables sharing one frame) ───────────────────────────────────────────────────────────────────

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface Placement {
  readonly w: number;
  readonly h: number;
  /** section centre and scale (screen px per section unit) */
  readonly ox: number;
  readonly oy: number;
  readonly s: number;
  /** screen px per unit of heart vector */
  readonly vlen: number;
  readonly v1: Rect;
  readonly v6: Rect;
  readonly row: Rect;
  /** px per trace unit in the strips and in the cells */
  readonly amp: number;
  readonly cellAmp: number;
  /** baselines of the arrow legend and of the closing sentence */
  readonly legY: number;
  readonly sameY: number;
}

export const PLACEMENT_WIDE: Placement = {
  w: 760, h: 430, ox: 190, oy: 222, s: 1.12, vlen: 110, legY: 386, sameY: 410,
  v1: { x: 392, y: 22, w: 356, h: 132 }, row: { x: 392, y: 164, w: 356, h: 102 }, v6: { x: 392, y: 276, w: 356, h: 132 },
  amp: 58, cellAmp: 34,
};
export const PLACEMENT_NARROW: Placement = {
  w: 420, h: 668, ox: 210, oy: 172, s: 1.1, vlen: 108, legY: 326, sameY: 344,
  v1: { x: 12, y: 356, w: 396, h: 102 }, row: { x: 12, y: 466, w: 396, h: 88 }, v6: { x: 12, y: 562, w: 396, h: 102 },
  amp: 40, cellAmp: 28,
};
export const placementFor = (widthPx: number): Placement => (widthPx < 560 ? PLACEMENT_NARROW : PLACEMENT_WIDE);

/** Strip x of loop time u (the strip shows u ∈ [U_LEFT − 0.04, U_SPAN + 0.08]). */
export function stripX(r: Rect, u: number): number {
  const a = U_LEFT - 0.04, b = U_SPAN + 0.08;
  return r.x + 8 + ((u - a) / (b - a)) * (r.w - 16);
}
export const stripBase = (r: Rect) => r.y + r.h / 2;

/** The strip path of one lead (flat lead-in, then the trace), in screen px. */
export function stripPath(src: Source, lead: ChestLead, r: Rect, amp: number): string {
  const y0 = stripBase(r);
  const pts: [number, number][] = [[stripX(r, U_LEFT), y0]];
  src.traces[lead].forEach((v, i) => pts.push([stripX(r, uOf(i)), y0 - v * amp]));
  return polyline(pts);
}

/** Cell k of the V2–V5 row. */
export function cellRect(pl: Placement, k: number): Rect {
  const w = pl.row.w / ROW_LEADS.length;
  return { x: pl.row.x + k * w, y: pl.row.y, w, h: pl.row.h };
}
export function cellPath(src: Source, lead: ChestLead, r: Rect, amp: number): string {
  const y0 = r.y + r.h * 0.48;
  return polyline(src.traces[lead].map((v, i) => [r.x + 6 + ((r.w - 12) * uOf(i)) / U_SPAN, y0 - v * amp] as [number, number]));
}

/** Section → screen. */
export const toScreen = (pl: Placement, p: Vec2): [number, number] => [pl.ox + p[0] * pl.s, pl.oy + p[1] * pl.s];
export const heartScreen = (pl: Placement) => toScreen(pl, HEART_CENTER);
/** Screen point of a heart vector v drawn from the heart centre. */
export function tipScreen(pl: Placement, v: Vec2): [number, number] {
  const [hx, hy] = heartScreen(pl);
  return [hx + v[0] * pl.vlen, hy + v[1] * pl.vlen];
}
/** Length of the drawn negative half-axis of V1 / V6 (heart-vector units): past the deepest drop over the range. */
export const NEG_AXIS_U = 1.08;
/** Length of the drawn positive half-axis of a lead (heart-vector units): from the heart centre to the electrode. */
export function posAxisU(pl: Placement, lead: ChestLead): number {
  const [hx, hy] = heartScreen(pl);
  const [x, y] = siteScreen(pl, lead);
  return Math.hypot(x - hx, y - hy) / pl.vlen;
}
/** Radius (px) of the transparent drag target around the heart: drags start only there, so the strips still scroll. */
export const hitRadius = (pl: Placement) => 1.15 * pl.vlen;
/** A press on the hit disc (screen px). It drags at once only within 24 px of the handle; elsewhere only after moving 6 px. */
export type Drag = { readonly x: number; readonly y: number; live: boolean };
export const dragStart = (p: readonly number[], handle: readonly number[]): Drag => ({ x: p[0], y: p[1], live: Math.hypot(p[0] - handle[0], p[1] - handle[1]) < 24 });
/** Whether the press is a drag by now (a tap that does not move never rewrites the main vector). */
export const dragLive = (d: Drag, p: readonly number[]) => d.live || Math.hypot(p[0] - d.x, p[1] - d.y) > 6;
/** Screen point at signed distance d (heart-vector units) along a lead axis. */
export function axisPoint(pl: Placement, lead: ChestLead, d: number): [number, number] {
  const [ux, uy] = unit(PRECORDIAL_DEG[lead]);
  return tipScreen(pl, [d * ux, d * uy]);
}
/** Direction of a chest lead axis (degrees). */
export const leadDeg = (lead: ChestLead) => PRECORDIAL_DEG[lead];
export const siteScreen = (pl: Placement, lead: ChestLead) => toScreen(pl, PRECORDIAL_SITES[lead]);
export const chestRadii = (pl: Placement) => [CHEST.rx * pl.s, CHEST.ry * pl.s] as const;

/** Loop path (screen px) and the closed loop (for the fill). */
export function loopPath(pl: Placement, src: Source): string {
  return polyline(src.loop.map((v) => tipScreen(pl, v)));
}

/** Half width of the transition mark (px). */
export const TR_HALF = 14;
export type Mark = { readonly x: number; readonly edge: -1 | 0 | 1 };
/**
 * Where the transition mark sits in the row (x px), from rsTransition's crossing (V1 = 0 … V6 = 5), or null. A
 * crossing outside V2–V5 (early: before V2; late: past V5) sits at that edge of the row, never over a lead whose R/S
 * says otherwise; `edge` says which (the label then points out of the row).
 */
export function transitionMark(pl: Placement, t: Transition): Mark | null {
  if (t.crossing == null) return null;
  const cw = pl.row.w / ROW_LEADS.length;
  const raw = pl.row.x + cw / 2 + (t.crossing - 1) * cw;
  return { x: clamp(raw, pl.row.x + TR_HALF, pl.row.x + pl.row.w - TR_HALF), edge: t.crossing < 1 ? -1 : t.crossing > 4 ? 1 : 0 };
}
export const transitionX = (pl: Placement, t: Transition) => transitionMark(pl, t)?.x ?? null;

/** The transition label: text (with an arrow out of the row for an out-of-row crossing), x and anchor, baseline. */
export function transitionLabel(pl: Placement, m: Mark, text: string): { readonly text: string; readonly x: number; readonly y: number; readonly anchor: 'start' | 'middle' | 'end' } {
  const y = pl.row.y + 15;
  if (m.edge < 0) return { text: `← ${text}`, x: pl.row.x + 4, y, anchor: 'start' };
  if (m.edge > 0) return { text: `${text} →`, x: pl.row.x + pl.row.w - 4, y, anchor: 'end' };
  const w = labelW(text) / 2;
  return { text, x: clamp(m.x, pl.row.x + w + 2, pl.row.x + pl.row.w - w - 2), y, anchor: 'middle' };
}
/** Baseline of a V2–V5 cell's lead name (bottom-left) and morphology (bottom-centre): the top band is the transition label's. */
export const cellLabelY = (r: Rect) => r.y + r.h - 6;

/** Estimated width (px) of an 11 px label: CJK ≈ 11 px, other characters ≈ 6.6 px. */
export const labelW = (text: string) => [...text].reduce((n, ch) => n + (/[　-鿿＀-￯]/.test(ch) ? 11 : 6.6), 0);
/** Estimated box [x0, y0, x1, y1] of an 11 px label at baseline y. */
export function labelBox(text: string, x: number, y: number, anchor: 'start' | 'middle' | 'end'): [number, number, number, number] {
  const w = labelW(text);
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return [x0, y - 9, x0 + w, y + 3];
}

/** Where R/S crosses, in notation: 'V3–V4' between two leads, 'V1' / 'V6' on a lead, '' when it never crosses. */
export function transitionText(t: Transition): string {
  if (t.crossing == null) return '';
  const k = Math.floor(t.crossing + 1e-9);
  if (k >= CHEST_LEADS.length - 1) return CHEST_LEADS[CHEST_LEADS.length - 1];
  return Math.abs(t.crossing - k) < 1e-9 ? CHEST_LEADS[k] : `${CHEST_LEADS[k]}–${CHEST_LEADS[k + 1]}`;
}
/** The computed outcome for assistive technology: 'V1 rS, V2 rS, …, V6 qRs' (notation, shared by all languages). */
export const leadsText = (src: Source) => CHEST_LEADS.map((l) => `${l} ${morphology(src.waves[l])}`).join(', ');

/** The terminal waves the late-vector narration names (V1's last wave, V6's last wave), exactly as the strips label them. */
export function lateEnds(src: Source): { readonly r: string; readonly s: string } {
  const w1 = src.waves.V1, w6 = src.waves.V6;
  return { r: w1[w1.length - 1]?.name ?? '', s: w6[w6.length - 1]?.name ?? '' };
}
/** The drag handle sits on arrow 2's tip; a pointer at angle a sets main = a + handleOffset, so the tip lands under it. */
export function handleOffset(src: Source): number {
  const [x, y] = src.stamps.find((s) => s.g === 'walls')!.v;
  return src.mainDeg - (Math.atan2(y, x) * 180) / Math.PI;
}
