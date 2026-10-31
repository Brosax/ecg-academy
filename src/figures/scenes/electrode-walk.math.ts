/**
 * Pure maths of the "electrode-walk" scene (Placing V1–V6: count, level, then look; lesson f5; spec
 * docs/design/f-explainers.md §4.7). No Preact, no DOM: the beats, the torso art, the two placement tables, the
 * cable map (which cable sits on which site — the engine's PLACEMENT representation), the R/(R+S) measurement and
 * `frame(p, state)`, the scene as a function of time. Tested in tests/figures/scenes/electrode-walk.test.ts.
 *
 * One source: the six strips are the block ECG's own V1–V6 over one beat; a cable swap only permutes which source
 * lead each cell shows (bit for bit what the engine does for `recording.placement.chest`). Nothing is interpolated
 * between sites; between landings only the electrode moves.
 */
import type { BeatMarks, Ecg, EcgSignal } from '../../core/ecg';
import type { StdLead } from '../../core/leads';
import type { ChestCable } from '../../synth/api';
import { BACK, ELECTRODES, icsY, LINES, MIDLINE } from '../data/electrodes';
import { clamp, lerp } from '../math/geom';
import { beatWindow } from '../math/kors';
import { measureRS, rsTransition, type RS } from '../math/projection';
import { compileBeats, revealed, seg, type Beat, type BeatDef } from '../scene/timeline';
import { leadPath, windowMedian } from '../strip';
import { BEAT_IDS, type BeatId, type ElectrodeWalkKey } from './electrode-walk.i18n';

// ── beats ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** `extra` holds two ideas in sequence (V4R first, then V7–V9), so it gets as long as the other beats */
const MS: Readonly<Record<BeatId, number>> = { count: 1700, level: 1900, walk: 1900, swap: 1600, extra: 1700 };
export const BEATS: readonly BeatDef<BeatId>[] = BEAT_IDS.map((id) => ({ id, ms: MS[id] }));
export const TIMELINE_BEATS: readonly Beat<BeatId>[] = compileBeats(BEATS).beats;

// ── sites and torso art (front view units of data/electrodes.ts: 420 × 520, patient's right on screen left) ────

export type Pt = readonly [number, number];
export const CHEST_IDS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export const SITES: readonly Pt[] = CHEST_IDS.map((id) => [ELECTRODES[id].x, ELECTRODES[id].y] as const);
export const V4R: Pt = [ELECTRODES.V4R.x, ELECTRODES.V4R.y];
export const BACK_SITES: readonly Pt[] = (['V7', 'V8', 'V9'] as const).map((id) => [ELECTRODES[id].x, ELECTRODES[id].y] as const);
/** where the back electrodes slide in from (the flank edge of the inset) */
export const BACK_X0 = 84;
export const BACK_CROP = { x: 80, y: 140, w: 150, h: 150 } as const;

export const RIGHT_BORDER = MIDLINE - 22;
/** the sternal angle (angle of Louis): the 2nd rib joins the sternum here, half a space above the 2nd space */
export const STERNAL_ANGLE: Pt = [MIDLINE, icsY(2, MIDLINE) - 12];
export const SPACE = (n: 2 | 3 | 4 | 5 | 6): Pt => [RIGHT_BORDER, icsY(n, RIGHT_BORDER)];
export const CURSOR_START: Pt = [320, 130];
/** the recorder: six sockets V1…V6 just under the cropped torso */
export const RECORDER = { x: 126, y: 292, w: 178, h: 32 } as const;
export const SOCKET_Y = 312;
/** lower end of the MCL / AAL / MAL reference lines (their labels sit just below) */
export const LINE_Y0 = 150;
export const LINE_Y1 = 262;
export const socketX = (cable: number): number => 145 + 28 * cable;
export const LEVEL_X1 = LINES.malL + 12;
/** where V5 and V6 land when the 5th space is followed towards the axilla (the error the ghost shows) */
export const GHOST_SITES: readonly Pt[] = [LINES.aalL, LINES.malL].map((x) => [x, icsY(5, x)] as const);
/** the sloping 5th space from V4 to the mid-axillary line */
export const GHOST_PATH = `M${[LINES.mclL, 287, LINES.aalL, 317, LINES.malL].map((x) => `${x} ${icsY(5, x).toFixed(1)}`).join('L')}`;

function smooth(pts: readonly Pt[]): string {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
const HALF: readonly Pt[] = [[196, 30], [193, 60], [166, 76], [120, 88], [94, 104], [84, 136], [82, 200], [86, 262], [88, 288]];
const mirror = (p: Pt): Pt => [2 * MIDLINE - p[0], p[1]];
/** cropped torso (neck to the lower ribs; the frame zooms on the chest), drawn as one smooth outline */
export const TORSO_PATH = `${smooth(HALF)}L${mirror(HALF[HALF.length - 1]).join(' ')}${smooth([...HALF].reverse().map(mirror)).slice(1).replace(/^[\d.-]+ [\d.-]+/, '')}Z`;
export const STERNUM_PATH = 'M196 86L224 86L226 142L224 270Q210 282 196 270L194 142Z';
export const CLAVICLES = ['M194 86Q150 72 104 92', 'M226 86Q270 72 316 92'] as const;
export const HEART_PATH = 'M200 170C236 150 286 176 296 212C304 246 280 272 248 270C216 268 196 236 194 206C192 190 194 178 200 170Z';
/** the intercostal spaces 2–6 on both sides (they rise towards the axilla) */
export const RIB_PATHS: readonly string[] = ([2, 3, 4, 5, 6] as const).flatMap((n) => {
  const side = (xs: number[]) => `M${xs.map((x) => `${x} ${icsY(n, x).toFixed(1)}`).join('L')}`;
  const r: number[] = [], l: number[] = [];
  for (let x = 232; x <= 320; x += 8) r.push(x);
  for (let x = 188; x >= 100; x -= 8) l.push(x);
  return [side(r), side(l)];
});
export const SPINE_X = BACK.center;
/** back view (seen from behind, patient's left on screen left): flank, spine, the left scapula and V6's level */
export const BACK_PATH = 'M72 128C72 190 76 250 84 334L240 334L240 128Z';
export const SCAPULA_PATH = 'M118 142L178 152L150 208Z';

// ── placement tables (frame units) ─────────────────────────────────────────────────────────────────────────────

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export interface Layout {
  readonly w: number;
  readonly h: number;
  /** torso: frame = (x, y) + s × front-view units */
  readonly torso: { readonly x: number; readonly y: number; readonly s: number };
  /** back-view inset (frame rect) and its scale of BACK_CROP */
  readonly inset: Rect & { readonly s: number };
  readonly cells: readonly Rect[];
  readonly stair: Rect;
  readonly before: Rect;
  /** the closing summary line under the torso */
  readonly summary: Rect;
}
const grid = (x0: number, y0: number, cols: number, w: number, h: number, gx: number, gy: number): Rect[] =>
  [0, 1, 2, 3, 4, 5].map((k) => ({ x: x0 + (k % cols) * (w + gx), y: y0 + Math.floor(k / cols) * (h + gy), w, h }));
/**
 * Hit targets (README: ≥ 24 px). V2–V3 and V3–V4 are only ~22 torso units apart, so both tables zoom on the chest:
 * the wide table is used from a stage of NARROW_BELOW px up (≥ 600/760 of its size), the narrow one down to MIN_STAGE
 * px; at those smallest scales neighbouring sites are still ≥ HIT_PX apart, and the pointer picks the nearest live
 * site within HIT_R frame units (the r = HIT_R hit circles never overlap).
 */
export const NARROW_BELOW = 600;
export const MIN_STAGE = 320;
export const HIT_PX = 24;
export const HIT_R = 16;
/** a drop lands on the nearest site within this many torso units */
export const DROP_R = 34;
/** smallest CSS px per frame unit a layout is rendered at */
export const minScale = (L: Layout): number => (L.w > NARROW_BELOW ? NARROW_BELOW : MIN_STAGE) / L.w;
/** the layout for a stage width (CSS px), chosen at mount only */
export const layoutFor = (stagePx: number): Layout => LAYOUTS[stagePx < NARROW_BELOW ? 'narrow' : 'wide'];
export const LAYOUTS: Readonly<Record<'wide' | 'narrow', Layout>> = {
  wide: {
    w: 760, h: 440,
    // torso x 112 … 386, y 118 … 324 (chest, recorder) at 1.46×
    torso: { x: -163.52, y: -172.28, s: 1.46 },
    inset: { x: 290, y: 316, w: 86, h: 86, s: 86 / 150 },
    cells: grid(400, 8, 3, 112, 96, 8, 8),
    stair: { x: 400, y: 216, w: 352, h: 110 },
    before: { x: 400, y: 336, w: 352, h: 96 },
    summary: { x: 8, y: 318, w: 276, h: 40 },
  },
  narrow: {
    w: 420, h: 680,
    // torso x 108 … 388, y 118 … 324 at 1.5×
    torso: { x: -162, y: -177, s: 1.5 },
    inset: { x: 312, y: 282, w: 90, h: 90, s: 90 / 150 },
    cells: grid(8, 400, 3, 132, 90, 6, 6),
    stair: { x: 8, y: 594, w: 200, h: 84 },
    before: { x: 216, y: 594, w: 196, h: 84 },
    summary: { x: 8, y: 320, w: 292, h: 40 },
  },
};
/** a front-view point in frame units */
export const toFrame = (L: Layout, q: Pt): Pt => [L.torso.x + L.torso.s * q[0], L.torso.y + L.torso.s * q[1]];
/** a frame point back to front-view units (pointer → nearest site) */
export const fromFrame = (L: Layout, x: number, y: number): Pt => [(x - L.torso.x) / L.torso.s, (y - L.torso.y) / L.torso.s];
/** the SVG transform drawing BACK_CROP into the inset */
export const insetTransform = (L: Layout): string => `translate(${L.inset.x - BACK_CROP.x * L.inset.s} ${L.inset.y - BACK_CROP.y * L.inset.s}) scale(${L.inset.s})`;
/** a back-view point in frame units (inside the inset) */
export const backToFrame = (L: Layout, q: Pt): Pt => [L.inset.x + (q[0] - BACK_CROP.x) * L.inset.s, L.inset.y + (q[1] - BACK_CROP.y) * L.inset.s];

// ── the cells' paper: time at 25 mm/s, the largest standard gain (10 → 5 → 2,5 mm/mV) that fits every lead ──────

export interface CellScale {
  /** px per mm (time axis: 25 mm/s over the window) */
  readonly mm: number;
  /** mm per mV */
  readonly gain: number;
  /** baseline offset from the cell top (px) */
  readonly base: number;
}
/** highest and deepest excursion (mV, against the window median as leadPath draws them) of V1–V6 over the window */
export function extents(sig: EcgSignal, win: readonly [number, number], median: (x: Float32Array) => number): { up: number; down: number } {
  let up = 0, down = 0;
  const i0 = Math.max(0, Math.floor((win[0] * sig.fs) / 1000)), i1 = Math.ceil((win[1] * sig.fs) / 1000);
  for (const l of CHEST_IDS) {
    const x = sig.leads[l], b = median(x);
    for (let i = i0; i <= Math.min(i1, x.length - 1); i++) {
      up = Math.max(up, x[i] - b);
      down = Math.max(down, b - x[i]);
    }
  }
  return { up, down };
}
export function cellScale(r: Rect, winMs: number, ext: { up: number; down: number }): CellScale {
  const mm = r.w / ((winMs / 1000) * 25);
  const room = 0.88 * r.h;
  const gain = [10, 5, 2.5].find((g) => (ext.up + ext.down) * g * mm <= room) ?? 2.5;
  const span = (ext.up + ext.down) * gain * mm;
  return { mm, gain, base: (r.h - span) / 2 + ext.up * gain * mm };
}

// ── cable map: siteOf[cable] = the site index the cable is clipped to (the engine's chest placement) ────────────

export type CableMap = readonly number[];
export const IDENTITY: CableMap = [0, 1, 2, 3, 4, 5];
/** the cables at sites a and b exchange places (a drop of one electrode onto the other's site) */
export function swapSites(m: CableMap, a: number, b: number): CableMap {
  return m.map((s) => (s === a ? b : s === b ? a : s));
}
/** cableAt[site] = the cable clipped there (inverse of the map) */
export function cableAt(m: CableMap): number[] {
  const out = new Array<number>(m.length).fill(0);
  m.forEach((s, c) => { out[s] = c; });
  return out;
}
/** the source lead each cell (cable) records: cell V2 with its cable on the V3 site shows the V3 potential */
export function cellLeads(m: CableMap): StdLead[] {
  return m.map((s) => CHEST_IDS[s]);
}
/** the engine's `recording.placement.chest` for this map (only the moved cables) */
export function toPlacement(m: CableMap): Partial<Record<ChestCable, ChestCable>> {
  const out: Partial<Record<ChestCable, ChestCable>> = {};
  m.forEach((s, c) => { if (s !== c) out[CHEST_IDS[c]] = CHEST_IDS[s]; });
  return out;
}
export const isIdentity = (m: CableMap): boolean => m.every((s, c) => s === c);
export function mapFromParam(swap: 'none' | 'v2v3' | 'v1v3' | undefined): CableMap {
  return swap === 'v2v3' ? swapSites(IDENTITY, 1, 2) : swap === 'v1v3' ? swapSites(IDENTITY, 0, 2) : IDENTITY;
}
/**
 * The scripted tour (beats 1–4) always runs on the correct placement, whatever the learner has dragged: beat 4 crosses
 * the V2 and V3 cables of IDENTITY (DEMO), so the narration ("no jumps", "swap two and the staircase breaks") is true of
 * the picture for every learner map. The learner's map takes over at the end of beat 4 (Frame.tourOn).
 */
export const DEMO_PAIR: readonly [number, number] = [1, 2];
export const DEMO: CableMap = swapSites(IDENTITY, DEMO_PAIR[0], DEMO_PAIR[1]);
/** nearest standard site to a torso-unit point, within `max` units */
export function nearestSite(x: number, y: number, max = 30): number | null {
  let best: number | null = null, bd = max;
  SITES.forEach(([sx, sy], i) => {
    const d = Math.hypot(sx - x, sy - y);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

// ── the beat and the R/(R+S) staircase ─────────────────────────────────────────────────────────────────────────

/** the beat the cells show: the middle beat of the record (the lesson test's choice), else null */
export function pickBeat(ecg: Ecg): BeatMarks | null {
  const bs = ecg.truth?.beats ?? [];
  return bs.length ? bs[Math.floor(bs.length / 2)] : null;
}
/** R and S of one lead over [qrsOn, qrsOff] against the PR-segment baseline (mean of qrsOn − 70 … − 20 ms) */
export function rsOf(x: Float32Array, fs: number, qrsOn: number, qrsOff: number): RS {
  const idx = (t: number) => clamp(Math.round((t * fs) / 1000), 0, x.length - 1);
  let base = 0, n = 0;
  for (let i = idx(qrsOn - 70); i <= idx(qrsOn - 20); i++) { base += x[i]; n++; }
  base = n ? base / n : 0;
  const v: number[] = [];
  for (let i = idx(qrsOn); i <= idx(qrsOff); i++) v.push(x[i] - base);
  return measureRS(v);
}
/** R/(R+S) of the six source sites V1…V6 (0.5 for a lead without a QRS) */
export function siteRatios(sig: EcgSignal, b: BeatMarks): number[] {
  return [...rsTransition(CHEST_IDS.map((l) => rsOf(sig.leads[l], sig.fs, b.qrsOn, b.qrsOff))).ratios];
}
/** the ratios the six cells show under a cable map */
export const cellRatios = (site: readonly number[], m: CableMap): number[] => m.map((s) => site[s]);
/** first cell with R ≥ S (the transition), or null */
export function transitionIndex(r: readonly number[]): number | null {
  const k = r.findIndex((v) => v >= 0.5);
  return k < 0 ? null : k;
}
/** the normal staircase: R/(R+S) strictly rising V1 → V4 */
export const risesToV4 = (r: readonly number[]): boolean => r[1] > r[0] && r[2] > r[1] && r[3] > r[2];
/** cells k (V2 … V6) whose ratio falls clearly (> JUMP_TOL) below the previous one: the "jump" (V5 ≈ V6 is a plateau, not a jump) */
export const JUMP_TOL = 0.05;
export const jumps = (r: readonly number[]): number[] => [1, 2, 3, 4, 5].filter((k) => r[k] < r[k - 1] - JUMP_TOL);
/** the cells' time window (the cursor window of the timeline) */
export const cellWindow = (b: BeatMarks, durationMs: number): readonly [number, number] => beatWindow(b, durationMs);

// ── the scene as a function of time ────────────────────────────────────────────────────────────────────────────

export interface Mark { readonly x: number; readonly y: number; readonly on: number }
export interface Frame {
  readonly cursor: Pt;
  readonly cursorOn: number;
  readonly sternalOn: number;
  /** labels of the 2nd, 3rd, 4th and 5th spaces */
  readonly ics: readonly [number, number, number, number];
  /** the six electrodes (site order), positions in torso units, `on` = scale and opacity */
  readonly el: readonly Mark[];
  readonly ghost: Mark;
  readonly ghostLabelOn: number;
  readonly mcl: number;
  readonly aal: number;
  readonly mal: number;
  readonly level: number;
  readonly levelLabelOn: number;
  readonly underOn: number;
  /** per cell: strip reveal (linear), staircase bar rise, emphasis */
  readonly reveal: readonly number[];
  readonly bar: readonly number[];
  readonly hi: readonly number[];
  readonly transitionOn: number;
  /** emphasis of the two cells whose cables cross in beat 4 */
  readonly pairHi: number;
  /** the scripted V2/V3 crossing: cable geometry, then the exact exchange of the two traces (a crossfade) */
  readonly demoMix: number;
  readonly traceMix: number;
  readonly jumpOn: number;
  /** 1 while the scripted tour (IDENTITY → DEMO → IDENTITY) is drawn; fades to the learner's map at the end of beat 4 */
  readonly tourOn: number;
  readonly beforeOn: number;
  readonly insetOn: number;
  readonly v4r: Mark;
  readonly v4rLabelOn: number;
  readonly back: readonly Mark[];
  readonly backLabelOn: number;
  readonly chipsOn: number;
}
export interface SceneInput {
  /** the cell index of the transition the walk reveals (the correct placement's; null: none) */
  readonly transition: number | null;
}

type Stop = readonly [number, Pt];
/** eased travel through way-points (t, point) with holds where two stops share a point */
function along(l: number, stops: readonly Stop[]): Pt {
  if (l <= stops[0][0]) return stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, a] = stops[i], [t1, b] = stops[i + 1];
    if (l <= t1) {
      const f = seg(l, t0, t1);
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
    }
  }
  return stops[stops.length - 1][1];
}
const mix = (a: Pt, b: Pt, f: number): Pt => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
const u = (v: number) => clamp(v, 0, 1);

export function frame(p: number, s: SceneInput): Frame {
  const B = TIMELINE_BEATS;
  const L = (k: number) => (B[k].to <= B[k].from ? (p >= B[k].from ? 1 : 0) : u((p - B[k].from) / (B[k].to - B[k].from)));
  const l0 = L(0), l1 = L(1), l2 = L(2), l3 = L(3), l4 = L(4);
  const [V1, V2, V3, V4, V5, V6] = SITES;

  // the hand / recording electrode
  let cursor: Pt;
  if (p < B[1].from) cursor = along(l0, [[0, CURSOR_START], [0.22, STERNAL_ANGLE], [0.34, STERNAL_ANGLE], [0.48, SPACE(2)], [0.52, SPACE(2)], [0.64, SPACE(3)], [0.68, SPACE(3)], [0.8, V1], [1, V1]]);
  else if (p < B[2].from) cursor = along(l1, [[0, V1], [0.2, V4], [0.3, V4], [0.42, V3], [0.5, V3], [0.75, V1], [1, V1]]);
  else {
    const stops: Stop[] = [[0, V1]];
    for (let k = 1; k < 6; k++) stops.push([k / 6, SITES[k - 1]], [k / 6 + 0.07, SITES[k]]);
    stops.push([1, V6]);
    cursor = along(l2, stops);
  }
  const cursorOn = u(seg(l0, 0, 0.1) - seg(l3, 0, 0.25));

  const el: Mark[] = [
    { x: V1[0], y: V1[1], on: seg(l0, 0.78, 0.88) },
    { ...pt(mix(V1, V2, seg(l0, 0.86, 0.97))), on: seg(l0, 0.82, 0.92) },
    { x: V3[0], y: V3[1], on: seg(l1, 0.38, 0.48) },
    { x: V4[0], y: V4[1], on: seg(l1, 0.2, 0.3) },
    { ...pt(mix(V4, V5, seg(l1, 0.52, 0.68))), on: seg(l1, 0.48, 0.57) },
    { ...pt(mix(V5, V6, seg(l1, 0.7, 0.86))), on: seg(l1, 0.63, 0.72) },
  ];
  const gx = lerp(V4[0], V6[0], seg(l1, 0.52, 0.86));
  const gOn = seg(l1, 0.48, 0.57) * (1 - seg(l1, 0.9, 1));
  const ghost: Mark = { x: gx, y: icsY(5, gx), on: gOn };

  const reveal: number[] = [], bar: number[] = [], hi: number[] = [];
  for (let k = 0; k < 6; k++) {
    const a = k / 6;
    reveal.push(k === 0 ? revealed(l0, 0.82, 0.94) : k === 1 ? revealed(l0, 0.9, 1) : revealed(l2, a + 0.07, a + 0.15));
    bar.push(seg(l2, a + 0.07, a + 0.16));
    // every fade spans ≥ 0.09 of its beat (≥ ~170 ms): no flash
    const walkHi = seg(l2, a, a + 0.09) - seg(l2, Math.min(0.9, a + 0.1), Math.min(1, a + 0.19));
    hi.push(u(walkHi));
  }
  const ti = s.transition;
  const transitionOn = ti == null ? 0 : seg(l2, Math.min(0.9, ti / 6 + 0.14), Math.min(1, ti / 6 + 0.24));

  // beat 5, two ideas in turn: V4R slides across the chest (first half), then V7–V9 slide in on the back (second half)
  const back: Mark[] = BACK_SITES.map(([bx, by], k) => ({
    x: lerp(BACK_X0, bx, seg(l4, 0.52 + 0.1 * k, 0.72 + 0.1 * k)),
    y: by,
    on: seg(l4, 0.5 + 0.1 * k, 0.6 + 0.1 * k),
  }));

  return {
    cursor,
    cursorOn,
    sternalOn: seg(l0, 0.18, 0.28),
    ics: [seg(l0, 0.4, 0.5), seg(l0, 0.56, 0.66), seg(l0, 0.72, 0.82), seg(l1, 0.18, 0.28)],
    el,
    ghost,
    ghostLabelOn: gOn * seg(l1, 0.6, 0.69),
    mcl: seg(l1, 0.1, 0.2),
    aal: seg(l1, 0.5, 0.6),
    mal: seg(l1, 0.66, 0.76),
    level: revealed(l1, 0.3, 0.5),
    levelLabelOn: seg(l1, 0.45, 0.54),
    underOn: seg(l1, 0.85, 0.94),
    reveal,
    bar,
    hi,
    transitionOn,
    pairHi: u(seg(l3, 0, 0.11) - seg(l3, 0.85, 1)),
    demoMix: u(seg(l3, 0.08, 0.4) - seg(l3, 0.75, 1)),
    traceMix: u(seg(l3, 0.19, 0.3) - seg(l3, 0.79, 0.9)),
    jumpOn: u(seg(l3, 0.4, 0.55) - seg(l3, 0.78, 0.9)),
    tourOn: 1 - seg(l3, 0.89, 1),
    beforeOn: seg(l3, 0.55, 0.75),
    insetOn: seg(l4, 0.42, 0.54),
    v4r: { ...pt(mix(V4, V4R, seg(l4, 0.06, 0.36))), on: seg(l4, 0.02, 0.14) },
    v4rLabelOn: seg(l4, 0.32, 0.44),
    back,
    backLabelOn: seg(l4, 0.82, 0.94),
    chipsOn: seg(l4, 0.88, 1),
  };
}
const pt = (q: Pt) => ({ x: q[0], y: q[1] });

/** the socket x (torso units) of the cable on `site`: the learner's change prev → map and the tour's crossing, blended */
export function cableEndX(site: number, s: SwapMix, demoMix: number): number {
  const learner = lerp(socketX(cableAt(s.prev)[site]), socketX(cableAt(s.map)[site]), s.mx);
  const tour = lerp(socketX(site), socketX(cableAt(DEMO)[site]), demoMix);
  return lerp(learner, tour, s.tour);
}
/** a cable from a site to its socket (torso units) */
export function cablePath(x0: number, y0: number, x1: number): string {
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}C${x0.toFixed(1)} ${(y0 + 50).toFixed(1)} ${x1.toFixed(1)} ${SOCKET_Y - 45} ${x1.toFixed(1)} ${SOCKET_Y}`;
}

// ── the source the component reads (one beat of the block's ECG, measured once) ───────────────────────────────

export interface Source {
  readonly beat: BeatMarks;
  readonly win: readonly [number, number];
  /** R/(R+S) of the six sites V1…V6 (correct placement) */
  readonly site: readonly number[];
}
export function sourceOf(ecg: Ecg | undefined): Source | null {
  if (!ecg) return null;
  const beat = pickBeat(ecg);
  if (!beat) return null;
  return { beat, win: cellWindow(beat, ecg.signal.durationMs), site: siteRatios(ecg.signal, beat) };
}
/** the sample of one lead at time t (ms), linear between samples (the pen tip of a revealing strip) */
export function sampleAt(x: Float32Array, fs: number, t: number): number {
  const f = clamp((t * fs) / 1000, 0, x.length - 1);
  const i = Math.floor(f);
  return i + 1 < x.length ? lerp(x[i], x[i + 1], f - i) : x[i];
}

// ── what a cell / an electrode label / a bar shows while a swap is under way (exact states, crossfaded) ─────────

/**
 * The mix the component draws: two exact states blended — the learner's change prev → map (by `mx`) and the tour's
 * IDENTITY → DEMO crossing (by `tm`) — weighted by `tour` (Frame.tourOn). Every weight multiplies a true permutation.
 */
export interface SwapMix {
  readonly prev: CableMap;
  readonly map: CableMap;
  readonly mx: number;
  readonly tm: number;
  readonly tour: number;
}
/** the (up to four) exact cable maps on screen and their weights (sum 1) */
export function mixStates(s: SwapMix): Array<readonly [CableMap, number]> {
  return [
    [s.prev, (1 - s.mx) * (1 - s.tour)],
    [s.map, s.mx * (1 - s.tour)],
    [IDENTITY, (1 - s.tm) * s.tour],
    [DEMO, s.tm * s.tour],
  ];
}
function merged(pairs: ReadonlyArray<readonly [number, number]>, min: number): Array<readonly [number, number]> {
  const out = new Map<number, number>();
  for (const [k, w] of pairs) out.set(k, (out.get(k) ?? 0) + w);
  return [...out].filter(([, w]) => w > min);
}
/** source sites (with weights summing to 1) cell k shows: only true permutations of the block's traces */
export function cellLayers(k: number, s: SwapMix): Array<readonly [number, number]> {
  return merged(mixStates(s).map(([m, w]) => [m[k], w] as const), 0.002);
}
/** cable names (with weights) on the electrode at site `site` */
export function siteNames(site: number, s: SwapMix): Array<readonly [number, number]> {
  return merged(mixStates(s).map(([m, w]) => [cableAt(m)[site], w] as const), 0.01);
}
/** how much the electrode at `site` carries a foreign cable (0 … 1) */
export function siteWrong(site: number, s: SwapMix): number {
  return mixStates(s).reduce((a, [m, w]) => a + (cableAt(m)[site] !== site ? w : 0), 0);
}
/** the slot (0 … 5, fractional while sliding) the bar of cell k sits in: in the tour the two demo bars cross */
export function barSlot(k: number, s: SwapMix): number {
  const [c1, c2] = DEMO_PAIR;
  const tour = k === c1 ? lerp(c1, c2, s.tm) : k === c2 ? lerp(c2, c1, s.tm) : k;
  return lerp(k, tour, s.tour);
}
/** the height (R/(R+S)) of bar k: the learner's cell value, or in the tour the site's own value (the bar travels) */
export function barValue(k: number, s: SwapMix, site: readonly number[]): number {
  return lerp(lerp(site[s.prev[k]], site[s.map[k]], s.mx), site[k], s.tour);
}
/** red overlay of bar k: a jump of the learner's map, or (tour) of DEMO once `jumpOn` shows it */
export function barErr(k: number, s: SwapMix, site: readonly number[], jumpOn: number): number {
  const [c1, c2] = DEMO_PAIR;
  const slot = k === c1 ? c2 : k === c2 ? c1 : k;
  const has = (m: CableMap, c: number) => (jumps(cellRatios(site, m)).includes(c) ? 1 : 0);
  const learner = lerp(has(s.prev, k), has(s.map, k), s.mx);
  return u(lerp(learner, has(DEMO, slot) * jumpOn, s.tour));
}
/** opacity of the "jump" label of the main staircase */
export function jumpLabelOn(s: SwapMix, site: readonly number[], jumpOn: number): number {
  const any = (m: CableMap) => (jumps(cellRatios(site, m)).length ? 1 : 0);
  return u(lerp(lerp(any(s.prev), any(s.map), s.mx), any(DEMO) * jumpOn, s.tour));
}
/**
 * The dashed transition marker: x in cell slots (0 … 5) and opacity. Each state on screen has its own transition;
 * the marker tweens between them by their weights (never teleports) and fades where a state has none.
 */
export function transitionMark(s: SwapMix, site: readonly number[]): { readonly x: number; readonly on: number } {
  let x = 0, on = 0;
  for (const [m, w] of mixStates(s)) {
    const ti = transitionIndex(cellRatios(site, m));
    if (ti == null || w <= 0) continue;
    x += ti * w;
    on += w;
  }
  return on > 1e-9 ? { x: x / on, on: u(on) } : { x: 0, on: 0 };
}
/** what the live region says about a map: the leads where the sequence breaks and the transition lead */
export function mapSummary(m: CableMap, site: readonly number[]): { readonly jumps: string[]; readonly transition: string | null } {
  const r = cellRatios(site, m);
  const ti = transitionIndex(r);
  return { jumps: jumps(r).map((k) => CHEST_IDS[k]), transition: ti == null ? null : CHEST_IDS[ti] };
}

/** the 36 strips of a layout (cell rect × source lead) and the pen height of a revealing cell, once per source */
export interface Strips {
  readonly cs: CellScale;
  /** paths[cell][source site] */
  readonly paths: readonly (readonly string[])[];
  /** pen y (frame units) of cell k showing source site s at reveal fraction f */
  readonly pen: (k: number, s: number, f: number) => number;
}
export function buildStrips(sig: EcgSignal, win: readonly [number, number], L: Layout): Strips {
  const [t0, t1] = win;
  const med = (x: Float32Array) => windowMedian(x, sig.fs, t0, t1);
  const cs = cellScale(L.cells[0], t1 - t0, extents(sig, win, med));
  const toY = (r: Rect) => (mv: number) => r.y + cs.base - mv * cs.gain * cs.mm;
  const paths = L.cells.map((r) => CHEST_IDS.map((l) => leadPath(sig, l, t0, t1, (tm) => r.x + ((tm - t0) / (t1 - t0)) * r.w, toY(r), 150)));
  const base = CHEST_IDS.map((l) => med(sig.leads[l]));
  const pen = (k: number, s: number, f: number) => toY(L.cells[k])(sampleAt(sig.leads[CHEST_IDS[s]], sig.fs, t0 + f * (t1 - t0)) - base[s]);
  return { cs, paths, pen };
}

/** a static art path (token colours; stroke defaults to --fg-muted, fill to none) */
export interface ArtPath {
  readonly d: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly w?: number;
  readonly dash?: string;
  readonly o?: number;
}
const R = RECORDER;
/** the front view, cropped: outline, heart, intercostal spaces, sternum, clavicles, the recorder */
export const FRONT_ART: readonly ArtPath[] = [
  { d: TORSO_PATH, fill: 'var(--panel-2)', w: 1.4 },
  { d: HEART_PATH, fill: 'var(--c-qrs)', stroke: 'none', o: 0.1 },
  ...RIB_PATHS.map((d) => ({ d, stroke: 'var(--border-strong)' })),
  { d: STERNUM_PATH, fill: 'var(--panel-3)' },
  ...CLAVICLES.map((d) => ({ d, w: 2 })),
  { d: `M${R.x + 6} ${R.y}H${R.x + R.w - 6}Q${R.x + R.w} ${R.y} ${R.x + R.w} ${R.y + 6}V${R.y + R.h - 6}Q${R.x + R.w} ${R.y + R.h} ${R.x + R.w - 6} ${R.y + R.h}H${R.x + 6}Q${R.x} ${R.y + R.h} ${R.x} ${R.y + R.h - 6}V${R.y + 6}Q${R.x} ${R.y} ${R.x + 6} ${R.y}Z`, fill: 'var(--panel-2)', stroke: 'var(--border-strong)' },
];
/** the back view (inset): flank, scapula, spine and V6's level */
export const BACK_ART: readonly ArtPath[] = [
  { d: BACK_PATH, fill: 'var(--panel-2)' },
  { d: SCAPULA_PATH, fill: 'var(--panel-3)' },
  { d: `M${SPINE_X} 128V334`, w: 2 },
  { d: `M72 ${BACK.level}H240`, stroke: 'var(--c-highlight)', dash: '6 3' },
];

/** a landmark line in frame units (token stroke) */
export interface Seg { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly stroke: string; readonly w: number; readonly dash?: string; readonly o: number }
/** the sternal-angle mark, the MCL / AAL / MAL lines and the V4 level line (drawn out by `level`) */
export function landmarkLines(L: Layout, f: Frame): Seg[] {
  const P = (q: Pt) => toFrame(L, q);
  const sa = P(STERNAL_ANGLE), [v4x, v4y] = P(SITES[3]), hi = 'var(--c-highlight)';
  const y0 = P([0, LINE_Y0])[1], y1 = P([0, LINE_Y1])[1];
  return [
    { x1: sa[0] - 14, x2: sa[0] + 14, y1: sa[1], y2: sa[1], stroke: hi, w: 2.5, o: f.sternalOn },
    ...[LINES.mclL, LINES.aalL, LINES.malL].map((lx, i): Seg => ({ x1: P([lx, 0])[0], x2: P([lx, 0])[0], y1: y0, y2: y1, stroke: 'var(--fg-muted)', w: 1, dash: '2 3', o: [f.mcl, f.aal, f.mal][i] })),
    { x1: v4x, x2: lerp(v4x, P([LEVEL_X1, 0])[0], f.level), y1: v4y, y2: v4y, stroke: hi, w: 2, dash: '6 3', o: f.level > 0 ? 1 : 0 },
  ];
}
/** the electrode under a press (frame units): the nearest live site within HIT_R */
export function pickSite(L: Layout, x: number, y: number, el: readonly Mark[]): number | null {
  const q = fromFrame(L, x, y);
  const s = nearestSite(q[0], q[1], HIT_R / L.torso.s);
  return s != null && el[s].on > 0.5 ? s : null;
}
/** the site a dragged electrode is dropped on (frame units), or null */
export function dropSite(L: Layout, x: number, y: number): number | null {
  const q = fromFrame(L, x, y);
  return nearestSite(q[0], q[1], DROP_R);
}
/** frame position of an electrode: its site, plus the pointer's travel since the press while it is dragged */
export function dragPos(L: Layout, e: Mark, d: { readonly x: number; readonly y: number; readonly x0: number; readonly y0: number } | null): Pt {
  const q = toFrame(L, [e.x, e.y]);
  return d ? [q[0] + d.x - d.x0, q[1] + d.y - d.y0] : q;
}

/** an SVG label of the torso / inset (frame units): an i18n key or a literal (lead names), its anchor, class and opacity */
export interface Label {
  readonly x: number;
  readonly y: number;
  readonly key?: ElectrodeWalkKey;
  readonly text?: string;
  readonly a?: 'start' | 'middle' | 'end';
  /** fg-svg-text-- modifier */
  readonly c?: string;
  readonly fill?: string;
  readonly o: number;
  /** fades by CSS (the held ghost toggle) */
  readonly tr?: boolean;
}
/** every landmark label of the frame: they appear when relevant and are all held at p = 1 (except the ghost's) */
export function torsoLabels(L: Layout, f: Frame, ghostHeld: number): Label[] {
  const P = (q: Pt) => toFrame(L, q);
  const sa = P(STERNAL_ANGLE), v4 = P(SITES[3]), v4r = P([f.v4r.x, f.v4r.y]), g6 = P(GHOST_SITES[1]);
  const yLines = P([0, LINE_Y1])[1], I = L.inset, inj = 'var(--c-injury)';
  const out: Label[] = [
    { x: sa[0] + 18, y: sa[1] + 4, key: 'lbl_sternal', c: 'hi', o: f.sternalOn },
    ...([2, 3, 4] as const).map((n, i): Label => ({ x: P(SPACE(n))[0] - 14, y: P(SPACE(n))[1] + 4, key: `lbl_ics${n}`, a: 'end', c: 'muted', o: f.ics[i] })),
    { x: v4[0] - 4, y: v4[1] + 16, key: 'lbl_ics5', a: 'end', c: 'muted', o: f.ics[3] },
    ...(['lbl_mcl', 'lbl_aal', 'lbl_mal'] as const).map((key, i): Label => ({ x: P([[LINES.mclL, LINES.aalL, LINES.malL][i], 0])[0], y: yLines + 12 + 12 * i, key, a: 'middle', c: 'muted', o: [f.mcl, f.aal, f.mal][i] })),
    { x: P([LEVEL_X1, 0])[0] + 4, y: v4[1] + 4, key: 'lbl_level', c: 'hi', o: f.levelLabelOn },
    { x: P([LEVEL_X1, 0])[0], y: v4[1] + 30, key: 'lbl_breast', a: 'end', c: 'muted', o: f.underOn },
    { x: g6[0], y: g6[1] - 12, key: 'lbl_ghost', a: 'end', fill: 'var(--err)', o: Math.max(f.ghostLabelOn, ghostHeld), tr: true },
    { x: v4r[0], y: v4r[1] + 21, text: 'V4R', a: 'middle', c: 'strong', o: f.v4r.on * f.v4rLabelOn },
    { x: v4r[0], y: v4r[1] + 34, key: 'lbl_rv', a: 'middle', c: 'vector', o: f.chipsOn },
    { x: v4r[0], y: v4r[1] + 47, key: 'lbl_chip', a: 'middle', fill: inj, o: f.chipsOn },
    { x: I.x, y: I.y - 5, key: 'lbl_back', c: 'muted', o: f.insetOn },
    ...f.back.map((b, k): Label => {
      const q = backToFrame(L, [b.x, b.y]);
      return { x: q[0], y: q[1] - 9, text: `V${7 + k}`, a: 'middle', c: 'strong', o: b.on * f.backLabelOn };
    }),
    { x: I.x + I.w / 2, y: I.y + I.h + 13, key: 'lbl_post', a: 'middle', c: 'vector', o: f.chipsOn },
    { x: I.x + I.w / 2, y: I.y + I.h + 26, key: 'lbl_chip', a: 'middle', fill: inj, o: f.chipsOn },
    ...CHEST_IDS.map((text, c): Label => ({ x: P([socketX(c), 0])[0], y: P([0, SOCKET_Y + 5])[1], text, a: 'middle', c: 'strong', o: 1 })),
  ];
  return out;
}
