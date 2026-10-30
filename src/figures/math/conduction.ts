/**
 * Activation timeline of the conduction-system schematic. Each element of the diagram gets an activation window
 * [t0, t1] (the wavefront travels along it during that window) or is marked blocked.
 *
 * Three sources, best first:
 * 1. ecg.regions (synthetic ECGs): the engine's own per-region state — mapped onto the diagram elements.
 * 2. ecg.truth beats: windows derived from the beat's fiducials (P onset/offset, QRS onset/offset, T) with typical
 *    conduction-system timing (His ≈ 45 ms before QRS onset, bundle branches ≈ 20 ms before, Purkinje at onset).
 * 3. No ECG: one schematic beat (NORMAL_BEAT marks) with the `block` parameter of the figure.
 */
import type { AtrialEvent, BeatMarks, EcgTruth } from '../../core/ecg';
import type { RegionId } from '../../core/regions';
import { clamp } from './geom';
import { atrialOnsets } from './ladder';

export const CONDUCTION_NODES = ['sa', 'atria', 'ap', 'av', 'his', 'rbb', 'lbb', 'laf', 'lpf', 'purkinje', 'septum', 'rv', 'lvAnt', 'lvPost'] as const;
export type CondNode = (typeof CONDUCTION_NODES)[number];
export type CondBlock = 'none' | 'av' | 'rbb' | 'lbb' | 'laf' | 'lpf' | 'accessory';

export interface Window {
  readonly t0: number;
  readonly t1: number;
}

export interface Timeline {
  /** activation windows (absent = not activated in this beat) */
  readonly act: Partial<Record<CondNode, Window>>;
  /** repolarization window of the ventricular myocardium (fades the colour) */
  readonly repol: Window | null;
  /** elements where the impulse stops (drawn with a block bar), with the fraction of the path reached */
  readonly blocked: Partial<Record<CondNode, number>>;
  readonly t0: number;
  readonly t1: number;
}

export interface BeatLike {
  readonly kind: BeatMarks['kind'];
  readonly pOn: number | null;
  readonly pOff: number | null;
  readonly qrsOn: number;
  readonly qrsOff: number;
  readonly tPeak: number | null;
  readonly tOff: number;
  readonly aberrant: boolean;
}

const CONDUCTED = new Set<BeatMarks['kind']>(['sinus', 'atrial', 'capture', 'fusion', 'paced-atrial']);

/** Timeline of one beat. `block` reshapes the ventricular part (aberrant beats default to an RBBB-like pattern). */
export function beatTimeline(b: BeatLike, block: CondBlock = 'none'): Timeline {
  const act: Partial<Record<CondNode, Window>> = {};
  const blocked: Partial<Record<CondNode, number>> = {};
  const on = b.qrsOn;
  const d = Math.max(60, b.qrsOff - b.qrsOn);
  const w = (t0: number, t1: number): Window => ({ t0, t1: Math.max(t0 + 1, t1) });

  const hasP = b.pOn != null && CONDUCTED.has(b.kind);
  if (hasP) {
    const pOn = b.pOn!;
    const pOff = b.pOff ?? pOn + 100;
    if (b.kind === 'sinus' || b.kind === 'capture' || b.kind === 'fusion') act.sa = w(pOn - 20, pOn);
    act.atria = w(pOn, pOff);
    act.av = w(pOn + 35, on - 45);
  }
  const ventricularOrigin = b.kind === 'ventricular' || b.kind === 'escape-ventricular' || b.kind === 'paced-ventricular';
  const junctional = b.kind === 'junctional' || b.kind === 'escape-junctional';
  if (junctional) act.av = w(on - 60, on - 45);

  const eff: CondBlock = block !== 'none' ? block : b.aberrant ? 'rbb' : 'none';

  if (ventricularOrigin) {
    // starts in the myocardium (shown as the LV free wall) and spreads cell to cell: slow, wide QRS
    act.lvPost = w(on, on + 0.55 * d);
    act.septum = w(on + 0.25 * d, on + 0.7 * d);
    act.lvAnt = w(on + 0.3 * d, on + 0.8 * d);
    act.rv = w(on + 0.45 * d, b.qrsOff);
  } else {
    act.his = w(on - 45, on - 22);
    act.rbb = w(on - 22, on);
    act.lbb = w(on - 22, on - 6);
    act.laf = w(on - 8, on + 8);
    act.lpf = w(on - 8, on + 8);
    act.purkinje = w(on - 4, on + 16);
    act.septum = w(on, on + 0.35 * d);
    act.lvAnt = w(on + 0.15 * d, on + 0.8 * d);
    act.lvPost = w(on + 0.15 * d, on + 0.8 * d);
    act.rv = w(on + 0.2 * d, on + 0.7 * d);
    switch (eff) {
      case 'rbb':
        blocked.rbb = 0.35;
        delete act.rbb;
        act.rv = w(on + 0.45 * d, b.qrsOff); // reached late, through the septum, cell to cell
        break;
      case 'lbb':
        blocked.lbb = 0.35;
        delete act.lbb;
        delete act.laf;
        delete act.lpf;
        act.septum = w(on, on + 0.4 * d); // septum activated from the right
        act.lvAnt = w(on + 0.4 * d, b.qrsOff);
        act.lvPost = w(on + 0.35 * d, b.qrsOff);
        act.rv = w(on + 0.05 * d, on + 0.45 * d);
        break;
      case 'laf':
        blocked.laf = 0.3;
        delete act.laf;
        act.lvAnt = w(on + 0.35 * d, b.qrsOff); // anterosuperior wall last → superior (left) axis
        break;
      case 'lpf':
        blocked.lpf = 0.3;
        delete act.lpf;
        act.lvPost = w(on + 0.35 * d, b.qrsOff); // posteroinferior wall last → inferior (right) axis
        break;
      case 'accessory':
        if (hasP) {
          const pOn = b.pOn!;
          // the pathway conducts just before the QRS; the pre-excited wall starts at QRS onset (the delta wave) and
          // spreads slowly, cell to cell
          act.ap = w(Math.max(pOn + 20, on - 40), on);
          act.lvPost = w(on, on + 0.8 * d);
        }
        break;
      default:
        break;
    }
  }
  const repol: Window = { t0: b.qrsOff + 20, t1: b.tOff };
  const t0 = Math.min(b.pOn ?? on - 60, on - 60) - 40;
  return { act, repol, blocked, t0, t1: b.tOff + 40 };
}

/**
 * Timeline of an atrial activation that does not reach the ventricles: a blocked P (AV block, blocked PAC) dies in the
 * AV node (block bar); fibrillatory / flutter waves are concealed in the node without a bar.
 */
export function blockedPTimeline(pOn: number, kind: AtrialEvent['kind'] = 'sinus'): Timeline {
  const act: Partial<Record<CondNode, Window>> = {};
  if (kind === 'sinus') act.sa = { t0: pOn - 20, t1: pOn };
  const fib = kind === 'fibrillation' || kind === 'flutter';
  act.atria = { t0: pOn, t1: pOn + (fib ? 40 : 100) };
  return { act, repol: null, blocked: fib || kind === 'retrograde' ? {} : { av: 0.5 }, t0: pOn - 40, t1: pOn + 300 };
}

type TruthLike = Pick<EcgTruth, 'beats' | 'atrial'>;

/** Start of a beat's activation sequence (sinus node for conducted beats, the ectopic focus otherwise). */
function beatStart(b: BeatLike): number {
  return b.pOn != null && CONDUCTED.has(b.kind) ? b.pOn - 20 : b.qrsOn - 60;
}

/**
 * Timeline for the cursor time t from a rhythm truth: the latest beat whose sequence has started, merged with a later
 * non-conducted atrial activation (its atria and AV-node part) when there is one. `block` overrides the ventricular
 * pattern (e.g. the lesson forces an RBBB drawing); null when t precedes everything.
 */
export function timelineAt(truth: TruthLike, t: number, block: CondBlock = 'none'): Timeline | null {
  let bi = -1;
  truth.beats.forEach((b, i) => {
    if (beatStart(b) <= t) bi = i;
  });
  const onsets = truth.atrial.length ? atrialOnsets({ ...truth, prMs: null }) : [];
  let ai = -1;
  onsets.forEach((o, k) => {
    if (o <= t) ai = k;
  });
  const beat = bi >= 0 ? truth.beats[bi] : null;
  const tlV = beat ? beatTimeline(beat, block) : null;
  const ev = ai >= 0 ? truth.atrial[ai] : null;
  const evIsLater = ev != null && (!beat || onsets[ai] > (beat.pOn ?? beat.qrsOn - 60) + 1) && ev.conductedTo !== bi;
  if (!evIsLater || !ev) return tlV;
  if (ev.conductedTo != null && ev.conductedTo > bi && truth.beats[ev.conductedTo]) {
    // conducting to a later beat (very long PR): show that beat's atrial/AV part
    const fut = beatTimeline(truth.beats[ev.conductedTo], block);
    return merge(tlV, { act: pickAtrial(fut.act), repol: null, blocked: {}, t0: fut.t0, t1: fut.t1 });
  }
  return merge(tlV, blockedPTimeline(onsets[ai], ev.kind));
}

const ATRIAL_PART: readonly CondNode[] = ['sa', 'atria', 'av', 'ap'];

function pickAtrial(act: Partial<Record<CondNode, Window>>): Partial<Record<CondNode, Window>> {
  const out: Partial<Record<CondNode, Window>> = {};
  for (const k of ATRIAL_PART) if (act[k]) out[k] = act[k];
  return out;
}

/** Ventricular part from `v`, atrial part from `a`. */
function merge(v: Timeline | null, a: Timeline): Timeline {
  if (!v) return a;
  const act: Partial<Record<CondNode, Window>> = {};
  for (const id of CONDUCTION_NODES) {
    const src = ATRIAL_PART.includes(id) ? a.act[id] : v.act[id];
    if (src) act[id] = src;
  }
  const blocked: Partial<Record<CondNode, number>> = {};
  for (const id of CONDUCTION_NODES) {
    const src = ATRIAL_PART.includes(id) ? a.blocked[id] : v.blocked[id];
    if (src != null) blocked[id] = src;
  }
  return { act, repol: v.repol, blocked, t0: Math.min(v.t0, a.t0), t1: Math.max(v.t1, a.t1) };
}

/** The schematic beat used without an ECG (matches NORMAL_BEAT; short PR and delta wave for pre-excitation). */
export function schematicTimeline(block: CondBlock): Timeline {
  if (block === 'av') return { ...blockedPTimeline(0), t1: 520 };
  const wide = block === 'rbb' || block === 'lbb';
  const pre = block === 'accessory';
  const b: BeatLike = {
    kind: 'sinus',
    pOn: 0,
    pOff: 100,
    qrsOn: pre ? 100 : 160,
    qrsOff: wide ? 300 : pre ? 260 : 245,
    tPeak: wide ? 440 : 410,
    tOff: wide ? 540 : 500,
    aberrant: false,
  };
  const tl = beatTimeline(b, block);
  if (pre) {
    // the AV-node route still conducts and fuses with the pre-excited wave
    return { ...tl, act: { ...tl.act, av: { t0: 35, t1: 115 }, his: { t0: 115, t1: 138 } } };
  }
  return tl;
}

export interface NodeState {
  /** 0 = resting, 0…1 = front travelling, 1 = activated */
  readonly act: number;
  /** 0…1 recovery (ventricular myocardium only) */
  readonly recovered: number;
  /** blocked: fraction of the path the impulse reached */
  readonly blockedAt: number | null;
}

export function stateAt(tl: Timeline, t: number): Record<CondNode, NodeState> {
  const out = {} as Record<CondNode, NodeState>;
  const rec = tl.repol ? clamp((t - tl.repol.t0) / (tl.repol.t1 - tl.repol.t0), 0, 1) : 0;
  for (const id of CONDUCTION_NODES) {
    const w = tl.act[id];
    const blk = tl.blocked[id];
    let act = 0;
    if (w) act = clamp((t - w.t0) / (w.t1 - w.t0), 0, 1);
    let blockedAt: number | null = null;
    if (blk != null) {
      // the impulse enters the blocked element shortly after its parent and stops part-way
      const parentEnd = id === 'av' ? (tl.act.atria?.t0 ?? 0) + 35 : (tl.act.his?.t1 ?? 0);
      act = Math.min(blk, clamp((t - parentEnd) / 30, 0, 1) * blk);
      blockedAt = blk;
    }
    const myo = id === 'septum' || id === 'rv' || id === 'lvAnt' || id === 'lvPost';
    const atrialSide = id === 'sa' || id === 'atria' || id === 'av' || id === 'ap';
    // atrial side recovers during the PR segment / QRS (the hidden atrial T wave); the ventricular conduction system
    // and myocardium recover with ventricular repolarization (the T wave)
    const aw = tl.act.atria;
    const recA = aw ? clamp((t - (aw.t1 + 60)) / 140, 0, 1) : 0;
    const recovered = act >= 1 || blk != null ? (atrialSide ? (id === 'av' && blk != null ? 0 : recA) : myo || tl.repol ? rec : 0) : 0;
    out[id] = { act, recovered, blockedAt };
  }
  return out;
}

// ── mapping from the synthetic engine's regions ─────────────────────────────────────────────────────────────────

/** Diagram element fed by each engine region (regions not listed are ignored). */
export function nodeForRegion(id: RegionId): CondNode | null {
  switch (id) {
    case 'sa-node':
      return 'sa';
    case 'ra':
    case 'la':
      return 'atria';
    case 'av-node':
      return 'av';
    case 'his':
    case 'rbb':
    case 'lbb':
    case 'laf':
    case 'lpf':
    case 'purkinje':
      return id;
    case 'lv-basal-anteroseptal':
    case 'lv-basal-inferoseptal':
    case 'lv-mid-anteroseptal':
    case 'lv-mid-inferoseptal':
    case 'lv-apical-septal':
      return 'septum';
    case 'lv-basal-anterior':
    case 'lv-basal-anterolateral':
    case 'lv-mid-anterior':
    case 'lv-mid-anterolateral':
    case 'lv-apical-anterior':
    case 'lv-apical-lateral':
    case 'lv-apex':
      return 'lvAnt';
    case 'lv-basal-inferior':
    case 'lv-basal-inferolateral':
    case 'lv-mid-inferior':
    case 'lv-mid-inferolateral':
    case 'lv-apical-inferior':
      return 'lvPost';
    case 'rv-outflow':
    case 'rv-basal':
    case 'rv-mid':
    case 'rv-apical':
      return 'rv';
    default:
      return null;
  }
}

/**
 * Aggregate region state codes (0 rest · (0,1) depolarizing · 1 depolarized · (1,2) repolarizing · 2 recovered) into
 * diagram states: act = mean of min(code, 1), recovered = mean of max(code − 1, 0). Recovered regions count as
 * activated in this beat. Regions tagged 'block' mark that element blocked.
 */
export function statesFromRegions(
  ids: readonly RegionId[],
  codes: ArrayLike<number>,
  highlights: Readonly<Partial<Record<RegionId, string>>> = {},
): Record<CondNode, NodeState> {
  const sumA = {} as Record<CondNode, number>;
  const sumR = {} as Record<CondNode, number>;
  const cnt = {} as Record<CondNode, number>;
  const blocked = new Set<CondNode>();
  ids.forEach((rid, i) => {
    const node = nodeForRegion(rid);
    if (!node) return;
    const c = codes[i] ?? 0;
    sumA[node] = (sumA[node] ?? 0) + Math.min(Math.max(c, 0), 1);
    sumR[node] = (sumR[node] ?? 0) + clamp(c - 1, 0, 1);
    cnt[node] = (cnt[node] ?? 0) + 1;
    if (highlights[rid] === 'block') blocked.add(node);
  });
  const out = {} as Record<CondNode, NodeState>;
  for (const id of CONDUCTION_NODES) {
    const n = cnt[id] ?? 0;
    const rec = n ? sumR[id] / n : 0;
    // a region that has recovered was activated in this beat
    const act = n ? Math.min(1, sumA[id] / n + rec) : 0;
    out[id] = { act, recovered: rec, blockedAt: blocked.has(id) ? 0.35 : null };
  }
  return out;
}
