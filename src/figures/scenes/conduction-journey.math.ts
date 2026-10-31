/**
 * Pure maths of the "conduction-journey" scene (lesson f1; spec docs/design/f-explainers.md §4.1). No Preact, no DOM.
 *
 * One source: the block's synthetic ECG (syn('normal', 111)). The timeline is phaseBeats(JOURNEY_PHASES, beat, 6) on
 * one chosen beat, so p maps linearly to ECG time t (the cursor bridge needs that). At every t the schematic heart is
 * read from the engine's own region states (ecg.regions.stateAt; the conduction nodes through statesFromRegions, the
 * chamber fills per region with the same code convention), the pen from lead II of the same signal, and every bracket
 * from the beat's fiducials. Without regions: timelineAt(truth, t); without an ECG: schematicTimeline('none') +
 * NORMAL_BEAT. Nothing is drawn per lead.
 *
 * The heart geometry is this scene's own (RA, LA, septum, free walls and a basal band, the partition the "septum →
 * free walls → bases" sequence needs); art/conductionArt.ts has not landed (README).
 */
import type { BeatMarks, Ecg } from '../../core/ecg';
import { sampleAt } from '../../core/ecg';
import type { RegionId } from '../../core/regions';
import { apPhaseAt, apValue, type ApPhase } from '../math/ap';
import { beatValue, NORMAL_BEAT } from '../math/beat';
import { schematicTimeline, stateAt, statesFromRegions, timelineAt, type NodeState, type Timeline as CondTimeline } from '../math/conduction';
import { clamp } from '../math/geom';
import { beatAt } from '../math/kors';
import { JOURNEY_PHASES, phaseBeats } from '../scene/phases';
import { fiducialTimes, revealed, seg, timeOfP, type BeatFiducials, type Fid, type Timeline } from '../scene/timeline';
import { windowMedian } from '../strip';
import { BEAT_IDS, type BeatId } from './conduction-journey.i18n';

export { BEAT_IDS, type BeatId };

/** Slow-motion factor of the journey (spec: phaseBeats(JOURNEY_PHASES, beat, 6), ≈ 4.6 s at 75 /min). */
export const SLOW = 6;

// ── heart geometry (heart-local units; frontal view, patient's right on screen left) ───────────────────────────────

const C = [168, 150] as const; // centre of the base (AV ring) — top of the septum
const U = [Math.cos((72 * Math.PI) / 180), Math.sin((72 * Math.PI) / 180)] as const; // base → apex
const V = [U[1], -U[0]] as const; // across: −1 = right ventricle side (screen left), +1 = left ventricle side
const LEN = 200;
const HALF = 125;

/** Point of the ventricular mass: s 0 = base … 1 = apex, w −1 (RV edge) … +1 (LV edge). */
export function vpt(s: number, w: number): readonly [number, number] {
  const hw = HALF * Math.sqrt(Math.max(0, 1 - s * s));
  return [C[0] + U[0] * s * LEN + V[0] * w * hw, C[1] + U[1] * s * LEN + V[1] * w * hw];
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const pathOf = (pts: readonly (readonly [number, number])[], close: boolean) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('') + (close ? 'Z' : '');

/** Polygon of the patch s ∈ [s0, s1] × w ∈ [w0, w1] (edges sampled so the walls follow the curved outline). */
function patch(s0: number, s1: number, w0: number, w1: number): string {
  const pts: Array<readonly [number, number]> = [];
  const n = 16;
  for (let i = 0; i <= n; i++) pts.push(vpt(s0 + ((s1 - s0) * i) / n, w0));
  for (let i = 1; i <= 6; i++) pts.push(vpt(s1, w0 + ((w1 - w0) * i) / 6));
  for (let i = n - 1; i >= 0; i--) pts.push(vpt(s0 + ((s1 - s0) * i) / n, w1));
  for (let i = 5; i >= 1; i--) pts.push(vpt(s0, w0 + ((w1 - w0) * i) / 6));
  return pathOf(pts, true);
}

/** A wire through (s, w) waypoints, straight in (s, w) space (so it bends with the wall). */
function wire(...way: ReadonlyArray<readonly [number, number]>): string {
  const pts: Array<readonly [number, number]> = [];
  for (let k = 0; k + 1 < way.length; k++) {
    const [s0, w0] = way[k];
    const [s1, w1] = way[k + 1];
    for (let i = k ? 1 : 0; i <= 8; i++) pts.push(vpt(s0 + ((s1 - s0) * i) / 8, w0 + ((w1 - w0) * i) / 8));
  }
  return pathOf(pts, false);
}

const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;

type Pt = readonly [number, number];
export type Anchor = 'start' | 'middle' | 'end';
export const NAME_IDS = ['ra', 'la', 'rv', 'lv', 'sa', 'av', 'his'] as const;
export type NameId = (typeof NAME_IDS)[number];

export const CHAMBERS = ['ra', 'la', 'sep', 'rv', 'lv', 'base'] as const;
export type Chamber = (typeof CHAMBERS)[number];
export const WIRES = ['atrial', 'his', 'rbb', 'lbb', 'laf', 'lpf', 'purk'] as const;
export type Wire = (typeof WIRES)[number];

const SEP_W = 0.12;
const BASE_S = 0.2;
const SA = [128, 84] as const;
const AV = [160, 140] as const;
const HIS_END: readonly [number, number] = [0.13, 0];

export const HEART = {
  outline: patch(0, 1, -1, 1),
  avRing: pathOf([vpt(0, -1.04), vpt(0, 1.04)], false),
  chamber: {
    ra: ellipse(100, 128, 56, 50),
    la: ellipse(228, 82, 60, 40),
    sep: patch(0, 1, -SEP_W, SEP_W),
    rv: patch(BASE_S, 1, -1, -SEP_W),
    lv: patch(BASE_S, 1, SEP_W, 1),
    base: patch(0, BASE_S, -1, -SEP_W) + patch(0, BASE_S, SEP_W, 1),
  } satisfies Record<Chamber, string>,
  /**
   * Each wire is a list of single-subpath strings: a pathLength=1 dash restarts on every subpath, so a multi-subpath d
   * would light each branch at its own share of the total length, ahead of the engine's activation. One RevealPath per
   * entry, all driven by the same reveal fraction.
   */
  wire: {
    atrial: [
      `M${SA[0]} ${SA[1]}C140 104 150 122 ${AV[0]} ${AV[1]}`,
      `M${SA[0]} ${SA[1]}C112 110 128 134 ${AV[0]} ${AV[1]}`,
      `M${SA[0]} ${SA[1]}C160 70 200 66 250 78`,
    ],
    his: [pathOf([AV, vpt(HIS_END[0], HIS_END[1])], false)],
    rbb: [wire(HIS_END, [0.2, -0.1], [0.72, -0.1], [0.8, -0.55])],
    lbb: [wire(HIS_END, [0.2, 0.12])],
    laf: [wire([0.2, 0.12], [0.33, 0.7])],
    lpf: [wire([0.2, 0.12], [0.7, 0.5])],
    purk: [
      wire([0.33, 0.7], [0.6, 0.88]),
      wire([0.7, 0.5], [0.93, 0.15]),
      wire([0.8, -0.55], [0.5, -0.88]),
      wire([0.8, -0.55], [0.93, -0.1]),
      wire([0.33, 0.7], [0.15, 0.9]),
    ],
  } satisfies Record<Wire, readonly string[]>,
  sa: SA,
  av: AV,
  /** name labels: anchor point and text-anchor (the His label sits left of the bundle, clear of the AV speed chip) */
  names: {
    ra: { at: [86, 122] as const, anchor: 'middle' },
    la: { at: [236, 78] as const, anchor: 'middle' },
    rv: { at: vpt(0.55, -0.6), anchor: 'middle' },
    lv: { at: vpt(0.55, 0.62), anchor: 'middle' },
    sa: { at: [128, 66] as const, anchor: 'middle' },
    av: { at: [184, 132] as const, anchor: 'start' },
    his: { at: [160, 188] as const, anchor: 'end' },
  } satisfies Record<NameId, { readonly at: Pt; readonly anchor: Anchor }>,
  /** where each strip label's leader points */
  target: {
    p: [164, 104] as const,
    pr: AV,
    qrs: vpt(0.45, 0),
    // ST and T point at the left ventricular free wall, beside its name (the leader never ends on a label)
    st: vpt(0.42, 0.85),
    t: vpt(0.68, 0.8),
  },
  /** pacemaker ladder: chip rows (heart-local y) and the structure each row points at */
  ladder: { x: -58, header: 58, rows: [{ y: 84, to: SA }, { y: 140, to: AV }, { y: 300, to: vpt(0.72, -0.62) }] },
  chipAv: [238, 152] as const,
  chipHis: vpt(0.36, 0.4),
} as const;

// ── label boxes (shared by the component and the overlap test) ─────────────────────────────────────────────────────

/** Estimated advance width of an 11 px label (CJK glyphs are full-width). */
export const textW = (s: string) => [...s].reduce((n, ch) => n + (/[　-鿿＀-￯]/.test(ch) ? 11.5 : 6.6), 0);

export interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}
/** Box of an 11 px text at (x, baseline y): conservative ascent 11, descent 3. */
export function textBox(x: number, y: number, text: string, anchor: Anchor): Box {
  const w = textW(text);
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { x0, y0: y - 11, x1: x0 + w, y1: y + 3 };
}
/** Box of a speed / rate chip centred on (x, y), or starting at x. */
export function chipBox(x: number, y: number, text: string, start = false): Box {
  const w = textW(text) + 14;
  const x0 = start ? x : x - w / 2;
  return { x0, y0: y - 10, x1: x0 + w, y1: y + 10 };
}

// ── placements (wide / narrow), chosen at mount ────────────────────────────────────────────────────────────────

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface Placement {
  readonly id: 'wide' | 'narrow';
  readonly w: number;
  readonly h: number;
  readonly heart: { readonly x: number; readonly y: number; readonly s: number };
  readonly strip: Rect;
  readonly ap: Rect;
  /** the closing "wire = time · muscle = waves" line */
  readonly moral: { readonly x: number; readonly y: number; readonly anchor: 'start' | 'end' };
}

export const WIDE: Placement = {
  id: 'wide',
  w: 760,
  h: 440,
  heart: { x: 62, y: 34, s: 1 },
  strip: { x: 382, y: 40, w: 368, h: 250 },
  ap: { x: 630, y: 360, w: 120, h: 60 },
  moral: { x: 750, y: 30, anchor: 'end' },
};
/** Narrow: the moral sits bottom-left beside the AP inset, so the gutter right of the paper is free for the leaders. */
export const NARROW: Placement = {
  id: 'narrow',
  w: 420,
  h: 730,
  heart: { x: 76, y: 22, s: 0.85 },
  // ≤ 340 wide: even a width-limited (low-amplitude) paper leaves ≥ 40 units for the leader gutter on its right
  strip: { x: 22, y: 336, w: 340, h: 240 },
  ap: { x: 282, y: 648, w: 120, h: 60 },
  moral: { x: 22, y: 672, anchor: 'start' },
};

/** Placement for a stage width in CSS px (560 px breakpoint, spec §2.1). */
export function placementFor(widthPx: number): Placement {
  return widthPx > 0 && widthPx < 560 ? NARROW : WIDE;
}

/** Heart-local point → stage point. */
export function heartToStage(pl: Placement, pt: readonly [number, number]): readonly [number, number] {
  return [pl.heart.x + pt[0] * pl.heart.s, pl.heart.y + pt[1] * pl.heart.s];
}

export interface StripGeom {
  readonly x0: number;
  readonly y0: number;
  /** grid width (whole window at 25 mm/s) */
  readonly w: number;
  readonly h: number;
  /** user units per mm (the same horizontally and vertically: true paper, 25 mm/s and 10 mm/mV) */
  readonly mm: number;
  readonly baseY: number;
  readonly t0: number;
}

/** Paper of the strip: square millimetres, the whole beat window and the signal's range fit inside the rect. */
export function stripGeom(r: Rect, window: readonly [number, number], range: readonly [number, number]): StripGeom {
  const dur = window[1] - window[0];
  const lo = Math.min(-0.2, range[0]) - 0.1;
  const hi = Math.max(0.3, range[1]) + 0.25;
  const mm = Math.min(r.w / (dur / 40), r.h / ((hi - lo) * 10));
  return { x0: r.x, y0: r.y, w: (dur / 40) * mm, h: r.h, mm, baseY: r.y + Math.min(r.h - 6, hi * 10 * mm), t0: window[0] };
}
export const stripX = (g: StripGeom, t: number) => g.x0 + ((t - g.t0) / 40) * g.mm;
export const stripY = (g: StripGeom, mv: number) => clamp(g.baseY - mv * 10 * g.mm, g.y0 + 1, g.y0 + g.h - 1);

/** The five strip labels in leader order: three on the paper (P, ST, T, left → right), two brackets under it. */
export const LEADERS = ['p', 'st', 't', 'pr', 'qrs'] as const;
export type LeaderId = (typeof LEADERS)[number];
const LANE = 8;

/** y of the lane an on-paper label's leader runs along, in the paper's top margin (above the R peak). */
export function laneY(pl: Placement, g: StripGeom, k: number): number {
  // the label nearest the gutter takes the lane nearest the trace, so no lane crosses another label's riser
  return g.y0 + 6 + LANE * (pl.id === 'wide' ? 2 - k : k);
}
/** x of the gutter column: wide, between heart and paper; narrow, right of the paper (one column per leader). */
export function gutterX(pl: Placement, g: StripGeom, k: number): number {
  return pl.id === 'wide' ? g.x0 - 8 : g.x0 + g.w + 8 + 7 * k;
}

/**
 * Route of a strip label's leader (stage units), drawn as the last layer: from the label's edge along a lane (or its
 * bracket row) into the gutter, then straight to the structure (`to`, a stage point). `from` is the top centre of an
 * on-paper label, or the outer end of a bracket (left end in wide, right end in narrow).
 */
export function leaderRoute(pl: Placement, g: StripGeom, id: LeaderId, from: Pt, to: Pt): Pt[] {
  const k = LEADERS.indexOf(id);
  const gx = gutterX(pl, g, k);
  if (k < 3) {
    const y = laneY(pl, g, k);
    return [from, [from[0], y], [gx, y], to];
  }
  return pl.id === 'wide' ? [from, [gx, from[1]], to] : [from, [gx, from[1]], [gx, g.y0 - 4], to];
}

// ── the source ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Heart state at one instant: chamber fills (depolarized, not yet recovered), repolarization tint, nodes, wires. */
export interface Anat {
  readonly fill: Readonly<Record<Chamber, number>>;
  readonly repol: Readonly<Record<Chamber, number>>;
  /** node glow (active, not yet recovered) */
  readonly sa: number;
  readonly av: number;
  /** wire reveal along its length (0 … 1) and opacity (1 − recovered) */
  readonly wire: Readonly<Record<Wire, number>>;
  readonly wireOp: Readonly<Record<Wire, number>>;
}

export interface JourneySource {
  readonly schematic: boolean;
  readonly beat: BeatFiducials;
  readonly fid: Readonly<Record<Fid, number>>;
  readonly timeline: Timeline<BeatId>;
  /** lead II at t (mV, relative to the window baseline — the strip's baseline) */
  readonly mv: (t: number) => number;
  /** [min, max] of lead II over the window */
  readonly range: readonly [number, number];
  readonly anat: (t: number) => Anat;
}

/** State code of one region (0 rest · (0,1) depolarizing · 1 depolarized · (1,2) repolarizing · 2 recovered). */
export function regionFill(c: number): number {
  return c <= 1 ? clamp(c, 0, 1) : clamp(2 - c, 0, 1);
}
/** Repolarization tint of one region: peaks half-way through recovery (the T wave). */
export function regionRepol(c: number): number {
  return c > 1 && c < 2 ? 4 * (c - 1) * (2 - c) : 0;
}

/** Scene chamber of an engine region (null: not a myocardial region drawn as a chamber). */
export function chamberOf(id: RegionId): Chamber | null {
  if (id === 'ra' || id === 'la') return id;
  if (id.includes('septal')) return 'sep';
  if (id === 'rv-basal' || id === 'rv-outflow' || id.startsWith('lv-basal-')) return 'base';
  if (id === 'rv-mid' || id === 'rv-apical') return 'rv';
  if (id.startsWith('lv-')) return 'lv';
  return null;
}

const ZERO = { ra: 0, la: 0, sep: 0, rv: 0, lv: 0, base: 0 } as const satisfies Record<Chamber, number>;
const NO_WIRE = { atrial: 0, his: 0, rbb: 0, lbb: 0, laf: 0, lpf: 0, purk: 0 } as const satisfies Record<Wire, number>;
export const REST: Anat = { fill: ZERO, repol: ZERO, sa: 0, av: 0, wire: NO_WIRE, wireOp: NO_WIRE };

/** A wire drawn from a node state: reveal = act until fully recovered (then 0, invisible), opacity = 1 − recovered. */
const reveal = (n: { readonly act: number; readonly recovered: number }) => (n.recovered >= 1 ? 0 : n.act);
const glow = (n: NodeState) => n.act * (1 - n.recovered);

function wiresFrom(nodes: Record<string, NodeState>, atrial: { readonly act: number; readonly recovered: number }) {
  const n = { atrial, his: nodes.his, rbb: nodes.rbb, lbb: nodes.lbb, laf: nodes.laf, lpf: nodes.lpf, purk: nodes.purkinje };
  const wire = {} as Record<Wire, number>;
  const wireOp = {} as Record<Wire, number>;
  for (const k of WIRES) {
    wire[k] = reveal(n[k]);
    wireOp[k] = 1 - n[k].recovered;
  }
  return { wire, wireOp };
}

/** Anatomy from the engine's region codes: nodes through statesFromRegions, chambers per region (regionFill). */
export function anatFromCodes(ids: readonly RegionId[], codes: ArrayLike<number>, highlights: Readonly<Partial<Record<RegionId, string>>> = {}): Anat {
  const nodes = statesFromRegions(ids, codes, highlights);
  const sumF = { ...ZERO } as Record<Chamber, number>;
  const sumR = { ...ZERO } as Record<Chamber, number>;
  const cnt = { ...ZERO } as Record<Chamber, number>;
  let raCode = 0;
  ids.forEach((id, i) => {
    const ch = chamberOf(id);
    const c = codes[i] ?? 0;
    if (id === 'ra') raCode = c;
    if (!ch) return;
    sumF[ch] += regionFill(c);
    sumR[ch] += regionRepol(c);
    cnt[ch] += 1;
  });
  const fill = {} as Record<Chamber, number>;
  const repol = {} as Record<Chamber, number>;
  for (const k of CHAMBERS) {
    fill[k] = cnt[k] ? sumF[k] / cnt[k] : 0;
    repol[k] = cnt[k] ? sumR[k] / cnt[k] : 0;
  }
  // the internodal / interatrial wires follow the right atrium (where the sinus impulse starts)
  const atrial = { act: raCode >= 1 ? 1 : Math.max(0, raCode), recovered: clamp(raCode - 1, 0, 1) };
  return { fill, repol, sa: glow(nodes.sa), av: glow(nodes.av), ...wiresFrom(nodes, atrial) };
}

/** Anatomy from a conduction timeline (no region states): RA leads LA, bases follow the free walls. */
export function anatFromTimeline(tl: CondTimeline | null, t: number): Anat {
  if (!tl) return REST;
  const s = stateAt(tl, t);
  const f = (n: NodeState) => n.act * (1 - n.recovered);
  const rp = (n: NodeState) => (n.act >= 1 ? 4 * n.recovered * (1 - n.recovered) : 0);
  const a = s.atria;
  const lvAct = (s.lvAnt.act + s.lvPost.act) / 2;
  const lvRec = (s.lvAnt.recovered + s.lvPost.recovered) / 2;
  const fill = {
    ra: clamp(a.act / 0.65, 0, 1) * (1 - a.recovered),
    la: clamp((a.act - 0.35) / 0.65, 0, 1) * (1 - a.recovered),
    sep: f(s.septum),
    rv: f(s.rv),
    lv: (f(s.lvAnt) + f(s.lvPost)) / 2,
    base: clamp((lvAct - 0.6) / 0.4, 0, 1) * (1 - lvRec),
  };
  const lvN: NodeState = { act: lvAct, recovered: lvRec, blockedAt: null };
  const repol = { ra: rp(a), la: rp(a), sep: rp(s.septum), rv: rp(s.rv), lv: rp(lvN), base: rp(lvN) };
  return { fill, repol, sa: glow(s.sa), av: glow(s.av), ...wiresFrom(s, { act: clamp(a.act / 0.5, 0, 1), recovered: a.recovered }) };
}

/** The beat the scene follows: a sinus beat with a P, its whole window inside the record, nearest the middle. */
export function pickBeat(beats: readonly BeatMarks[], durationMs: number): number {
  let best = -1;
  let bestD = Infinity;
  beats.forEach((b, i) => {
    if (b.kind !== 'sinus' || b.aberrant || b.pOn == null || b.pOff == null) return;
    const f = fiducialTimes(b);
    if (f.start < 0 || f.end > durationMs) return;
    const d = Math.abs((f.start + f.end) / 2 - durationMs / 2);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best >= 0 ? best : beatAt(beats, null);
}

function rangeOf(mv: (t: number) => number, a: number, b: number): readonly [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let t = a; t <= b; t += 2) {
    const v = mv(t);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return [lo, hi];
}

type EcgLike = Pick<Ecg, 'signal' | 'truth' | 'regions'>;

/** The scene's source from the block's ECG (null without beats: the scene then uses the schematic source). */
export function ecgSource(ecg: EcgLike): JourneySource | null {
  const truth = ecg.truth;
  if (!truth || truth.beats.length === 0) return null;
  const k = pickBeat(truth.beats, ecg.signal.durationMs);
  if (k < 0) return null;
  const beat = truth.beats[k];
  const timeline = phaseBeats(JOURNEY_PHASES, beat, SLOW);
  const fid = fiducialTimes(beat);
  const II = ecg.signal.leads.II;
  const fs = ecg.signal.fs;
  const base = windowMedian(II, fs, fid.start, fid.end);
  const mv = (t: number) => sampleAt(II, fs, t) - base;
  const regions = ecg.regions;
  let anat: (t: number) => Anat;
  if (regions) {
    const buf = new Float32Array(regions.ids.length);
    anat = (t) => {
      regions.stateAt(t, buf);
      return anatFromCodes(regions.ids, buf, regions.highlights);
    };
  } else anat = (t) => anatFromTimeline(timelineAt(truth, t), t);
  return { schematic: false, beat, fid, timeline, mv, range: rangeOf(mv, fid.start, fid.end), anat };
}

/** The schematic source (no ECG): schematicTimeline('none') + NORMAL_BEAT, the same beat ids. */
export function schematicSource(): JourneySource {
  const m = NORMAL_BEAT.marks;
  const beat: BeatFiducials = { pOn: m.pOn, pOff: m.pOff, qrsOn: m.qrsOn, qrsOff: m.qrsOff, tPeak: m.tPeak, tOff: m.tOff };
  const timeline = phaseBeats(JOURNEY_PHASES, beat, SLOW);
  const fid = fiducialTimes(beat);
  const tl = schematicTimeline('none');
  const mv = (t: number) => beatValue(NORMAL_BEAT, t);
  return { schematic: true, beat, fid, timeline, mv, range: rangeOf(mv, fid.start, fid.end), anat: (t) => anatFromTimeline(tl, t) };
}

// ── the action-potential inset ─────────────────────────────────────────────────────────────────────────────────

/**
 * Time on the schematic action potential (math/ap.ts, on NORMAL_BEAT: QRS 160–245, T peak 410, T end 500) of a record
 * time: piecewise linear through the beat's own QRS onset / offset, T peak and T end, so the upstroke falls inside the
 * real QRS, the plateau on the real ST and phase 3 on the real T.
 */
export function apTime(beat: BeatFiducials, t: number): number {
  const on = beat.qrsOn;
  const off = Math.max(on + 1, beat.qrsOff);
  const end = Math.max(off + 2, beat.tOff);
  const peak = clamp(beat.tPeak ?? (off + end) / 2, off + 1, end - 1);
  if (t <= on) return 160 + (t - on);
  if (t <= off) return 160 + ((t - on) * 85) / (off - on);
  if (t <= peak) return 245 + ((t - off) * 165) / (peak - off);
  if (t <= end) return 410 + ((t - peak) * 90) / (end - peak);
  return 500 + (t - end);
}

// ── the frame ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface Frame {
  /** record time (ms) and lead II at the pen (mV from the baseline) */
  readonly t: number;
  readonly mv: number;
  readonly anat: Anat;
  /** pen halo while the sinus node fires (nothing drawn yet) and the "too few cells" tag */
  readonly penGlow: number;
  /** stopwatch on the AV node (AV delay, linear) and its one expanding pulse */
  readonly avArc: number;
  /** label / chip / bracket opacities and bracket growth (0 … 1) */
  readonly lblP: number;
  readonly ladder: number;
  readonly chipAv: number;
  readonly prGrow: number;
  readonly lblPr: number;
  readonly chipHis: number;
  readonly qrsGrow: number;
  readonly lblQrs: number;
  readonly lblSt: number;
  readonly lblT: number;
  readonly moral: number;
  /** ventricular action potential at the pen */
  readonly apT: number;
  readonly apMv: number;
  readonly apPhase: ApPhase;
}

/** Entry of the impulse into the AV node (math/conduction.ts convention: P onset + 35 ms, before the His onset). */
export function avEntry(fid: Readonly<Record<Fid, number>>): number {
  return fid.pOn + Math.min(35, 0.5 * Math.max(0, fid.hisOn - fid.pOn));
}

/**
 * The scene at p: a function of the record time t = timeOfP(window, p) only (no beat index), so the end of beat k is
 * the start of beat k + 1 and every label lands complete on its beat's end.
 */
export function frame(p: number, src: JourneySource): Frame {
  const f = src.fid;
  const win = src.timeline.window ?? [f.start, f.end];
  const t = timeOfP(win, p);
  const pDur = f.pOff - f.pOn;
  const av0 = avEntry(f);
  const d = f.qrsOff - f.qrsOn;
  const st = f.tPeak - f.qrsOff;
  const tl = f.end - f.tPeak;
  const glowOn = seg(t, f.start, f.start + 10) * (1 - seg(t, f.pOn, f.pOn + 20));
  const lblP = seg(t, f.pOff - 0.3 * Math.max(1, pDur), f.pOff);
  const apT = apTime(src.beat, t);
  return {
    t,
    mv: src.mv(t),
    anat: src.anat(t),
    penGlow: glowOn,
    avArc: revealed(t, av0, f.hisOn),
    lblP,
    ladder: lblP,
    // the AV chip and the PR label belong to the av beat: they start at P offset, so the P end frame carries only P;
    // the stopwatch arc and the bracket growth keep the engine's AV-entry timing
    chipAv: seg(t, f.pOff, (f.pOff + f.hisOn) / 2),
    prGrow: seg(t, av0, f.hisOn),
    lblPr: seg(t, f.pOff, f.hisOn),
    chipHis: seg(t, f.hisOn, f.hisOn + 0.6 * (f.qrsOn - f.hisOn)),
    qrsGrow: revealed(t, f.qrsOn, f.qrsOff),
    lblQrs: seg(t, f.qrsOn + 0.6 * d, f.qrsOff),
    lblSt: seg(t, f.qrsOff + 0.15 * st, f.qrsOff + 0.5 * st),
    lblT: seg(t, f.tPeak, f.tPeak + 0.4 * tl),
    moral: seg(t, f.tPeak + 0.6 * tl, f.end),
    apT,
    apMv: apValue('ventricular', apT),
    apPhase: apPhaseAt('ventricular', apT),
  };
}

/** The five strip labels and their opacities in a frame (end-frame completeness: all five at 1). */
export function stripLabels(fr: Frame): Readonly<Record<'p' | 'pr' | 'qrs' | 'st' | 't', number>> {
  return { p: fr.lblP, pr: Math.min(fr.lblPr, fr.prGrow), qrs: Math.min(fr.lblQrs, fr.qrsGrow), st: fr.lblSt, t: fr.lblT };
}
