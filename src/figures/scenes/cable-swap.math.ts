/**
 * Pure maths of the "cable-swap" scene (docs/design/f-explainers.md §4.8): the potential model of the limb cables,
 * hook-ups (which limb each cable is clipped to), the exact re-assembly of the twelve leads under a hook-up (the
 * formulas of src/synth/leads/assemble.ts, engine as oracle), the symbolic signature of a hook-up, the beats, the two
 * placement tables and frame(p): the scene as a function of time. No Preact, no DOM.
 *
 * Gauge: the engine's potentials are only known up to a common offset, so the recovered ones are expressed in the WCT
 * gauge (RA + LA + LL = 0): φ_RA = −(I + II)/3, φ_LA = φ_RA + I, φ_LL = φ_RA + II, φ_RL := φ_LL (both legs at one
 * potential), φ_Vk := Vk. A hook-up permutes which potential each cable carries; every lead follows by
 * Einthoven / Goldberger / Wilson, and the chest leads move only when Wilson's terminal changes: V′k = Vk − (WCT′ − WCT).
 */
import type { EcgSignal, EcgTruth, LeadSignals } from '../../core/ecg';
import { CHEST_LEADS, LIMB_LEADS } from '../../core/leads';
import { lerp } from '../math/geom';
import { beatAt, beatWindow } from '../math/kors';
import { compileBeats, easeInOut, local, revealed, seg, type BeatDef } from '../scene/timeline';
import { BEAT_IDS, type BeatId } from './cable-swap.i18n';

// ── cables and hook-ups ────────────────────────────────────────────────────────────────────────────────────────

export type Cable = 'RA' | 'LA' | 'LL' | 'RL';
export type Limb = Cable;
export type LimbLead = (typeof LIMB_LEADS)[number];
export type ChestLead = (typeof CHEST_LEADS)[number];
export const CABLES = ['RA', 'LA', 'LL', 'RL'] as const;
/** cable → the limb it is clipped to (same meaning as PlacementSpec.limbs of src/synth) */
export type Hookup = Readonly<Record<Cable, Limb>>;

export const HOOKUP_IDS = ['correct', 'laRa', 'laLl', 'raLl', 'raRl', 'laRl'] as const;
export type HookupId = (typeof HOOKUP_IDS)[number];
/** the five reversals of the signature table, in row order */
export const SWAP_IDS = ['laRa', 'laLl', 'raLl', 'raRl', 'laRl'] as const;
export type SwapId = (typeof SWAP_IDS)[number];

export const HOOKUPS: Readonly<Record<HookupId, Hookup>> = {
  correct: { RA: 'RA', LA: 'LA', LL: 'LL', RL: 'RL' },
  laRa: { RA: 'LA', LA: 'RA', LL: 'LL', RL: 'RL' },
  laLl: { RA: 'RA', LA: 'LL', LL: 'LA', RL: 'RL' },
  raLl: { RA: 'LL', LA: 'LA', LL: 'RA', RL: 'RL' },
  raRl: { RA: 'RL', LA: 'LA', LL: 'LL', RL: 'RA' },
  laRl: { RA: 'RA', LA: 'RL', LL: 'LL', RL: 'LA' },
};
/** the two cables each table row exchanges */
export const SWAP_PAIR: Readonly<Record<SwapId, readonly [Cable, Cable]>> = {
  laRa: ['LA', 'RA'], laLl: ['LA', 'LL'], raLl: ['RA', 'LL'], raRl: ['RA', 'RL'], laRl: ['LA', 'RL'],
};

export const hookupKey = (h: Hookup): string => CABLES.map((c) => h[c]).join('');
export const sameHookup = (a: Hookup, b: Hookup): boolean => hookupKey(a) === hookupKey(b);

/** Exchange the limbs the two cables sit on (the learner clicks two plugs). */
export function swapCables(h: Hookup, a: Cable, b: Cable): Hookup {
  if (a === b) return h;
  return { ...h, [a]: h[b], [b]: h[a] };
}

/** The preset this hook-up is, or null (a double swap). */
export function hookupId(h: Hookup): HookupId | null {
  return HOOKUP_IDS.find((id) => sameHookup(HOOKUPS[id], h)) ?? null;
}

/** True when the three recording cables still cover RA, LA and LL (no cable on a leg twice): WCT unchanged. */
export function wctUnchanged(h: Hookup): boolean {
  const s = new Set([h.RA, h.LA, h.LL].map((l) => (l === 'RL' ? 'LL' : l)));
  return s.size === 3;
}

// ── potentials and exact re-assembly ───────────────────────────────────────────────────────────────────────────

export interface Potentials {
  readonly fs: number;
  readonly n: number;
  readonly RA: Float64Array;
  readonly LA: Float64Array;
  readonly LL: Float64Array;
  readonly V: Readonly<Record<ChestLead, Float32Array>>;
}

/** Electrode potentials in the WCT gauge, recovered from I and II (the chest leads are kept as they are). */
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
  const V = {} as Record<ChestLead, Float32Array>;
  for (const k of CHEST_LEADS) V[k] = sig.leads[k];
  return { fs: sig.fs, n, RA, LA, LL, V };
}

const limbOf = (phi: Potentials, l: Limb): Float64Array => (l === 'RL' ? phi.LL : phi[l]);

/** The twelve leads of a hook-up (Float32, mV): limb leads by Einthoven / Goldberger, V′k = Vk − (WCT′ − WCT). */
export function assembleHookup(phi: Potentials, hook: Hookup, from = 0, n = phi.n - from): LeadSignals {
  const r = limbOf(phi, hook.RA), l = limbOf(phi, hook.LA), f = limbOf(phi, hook.LL);
  const mk = () => new Float32Array(n);
  const out = { I: mk(), II: mk(), III: mk(), aVR: mk(), aVL: mk(), aVF: mk() };
  for (let j = 0; j < n; j++) {
    const i = j + from;
    const a = r[i], b = l[i], c = f[i];
    out.I[j] = b - a;
    out.II[j] = c - a;
    out.III[j] = c - b;
    out.aVR[j] = a - (b + c) / 2;
    out.aVL[j] = b - (a + c) / 2;
    out.aVF[j] = c - (a + b) / 2;
  }
  const V = {} as Record<ChestLead, Float32Array>;
  if (wctUnchanged(hook)) {
    // the same three potentials in another order: the terminal is the same average, the chest leads are untouched
    for (const k of CHEST_LEADS) V[k] = from === 0 && n === phi.n ? phi.V[k] : phi.V[k].slice(from, from + n);
  } else {
    for (const k of CHEST_LEADS) {
      const v = phi.V[k], x = mk();
      // WCT = 0 in this gauge, so the shift is WCT′ itself
      for (let j = 0; j < n; j++) {
        const i = j + from;
        x[j] = v[i] - (r[i] + l[i] + f[i]) / 3;
      }
      V[k] = x;
    }
  }
  return { ...out, ...V };
}

/** Peak-to-peak of a lead over a sample range (the flat-lead check). */
export function peakToPeak(x: ArrayLike<number>, from = 0, to = x.length): number {
  let lo = Infinity, hi = -Infinity;
  for (let i = from; i < to; i++) {
    if (x[i] < lo) lo = x[i];
    if (x[i] > hi) hi = x[i];
  }
  return hi - lo;
}

/** The window [t0, t1] (ms) of a hook-up as an EcgSignal of its own (time 0 = t0): what the strips draw. */
export function windowSignal(phi: Potentials, hook: Hookup, win: readonly [number, number]): EcgSignal {
  const from = Math.max(0, Math.floor((win[0] * phi.fs) / 1000));
  const n = Math.max(1, Math.min(phi.n - from, Math.ceil(((win[1] - win[0]) * phi.fs) / 1000) + 1));
  return { fs: phi.fs, durationMs: (n * 1000) / phi.fs, leads: assembleHookup(phi, hook, from, n) };
}

/** Standard gains (mm/mV), largest first; the strips use the largest one whose tallest deflection still fits. */
export const GAINS = [10, 5, 2.5, 1.25] as const;
/** 25 mm/s: one millimetre is 40 ms */
export const MS_PER_MM = 40;

/** Largest standard gain at which a peak-to-peak span `spanMv` fills at most `fill` of a box `boxH` tall. */
export function fitGain(spanMv: number, unitsPerMm: number, boxH: number, fill = 0.86): number {
  for (const g of GAINS) if (spanMv * g * unitsPerMm <= fill * boxH) return g;
  return GAINS[GAINS.length - 1];
}

/** [lowest, highest] of a lead relative to its median (the baseline leadPath draws at 0). */
export function leadSpan(sig: EcgSignal, l: LimbLead | ChestLead): readonly [number, number] {
  const x = sig.leads[l];
  if (!x || !x.length) return [0, 0];
  const s = Array.from(x).sort((a, b) => a - b);
  const med = s[s.length >> 1];
  return [s[0] - med, s[s.length - 1] - med];
}

/** Largest peak-to-peak span over a set of leads (what the gain must fit). */
export function maxSpan(sig: EcgSignal, leads: readonly (LimbLead | ChestLead)[]): number {
  return Math.max(0, ...leads.map((l) => leadSpan(sig, l)[1] - leadSpan(sig, l)[0]));
}

/** Colour of each cable (IEC code: RA red, LA yellow, LL green, RL black), as theme tokens. */
export const CABLE_COLOR: Readonly<Record<Cable, string>> = { RA: 'var(--err)', LA: 'var(--c-atrial)', LL: 'var(--ok)', RL: 'var(--fg)' };

/** Colour of a table / tag cell: unchanged muted, inverted red, flat orange, moved blue. */
export function cellColor(text: string): string {
  if (text === '=') return 'var(--fg-muted)';
  if (text === '0') return 'var(--c-highlight)';
  return text.startsWith('−') ? 'var(--err)' : 'var(--c-vector)';
}

/** Table columns as fractions of its width: swap · six limb leads · V1–V6 · the tell-tale sign. */
export const TABLE_COLS = { swap: 0.14, lead: 0.09, v: 0.12 } as const;
/** x of a column's centre (lead k = 0…5, 'v'), or the left edge of the last column ('key'). */
export function tableX(pl: Placement, col: number | 'v' | 'key' | 'swap'): number {
  const x0 = pl.table[0], w = pl.tableW, c = TABLE_COLS;
  if (col === 'swap') return x0 + 2;
  if (col === 'v') return x0 + w * (c.swap + 6 * c.lead + c.v / 2);
  if (col === 'key') return x0 + w * (c.swap + 6 * c.lead + c.v) + 4;
  return x0 + w * (c.swap + c.lead * (col + 0.5));
}

// ── the signature: what each lead becomes, symbolically ────────────────────────────────────────────────────────

/** coefficients of each limb lead on (φ_RA, φ_LA, φ_LL) */
const COEF: Readonly<Record<LimbLead, readonly [number, number, number]>> = {
  I: [-1, 1, 0], II: [-1, 0, 1], III: [0, -1, 1], aVR: [1, -0.5, -0.5], aVL: [-0.5, 1, -0.5], aVF: [-0.5, -0.5, 1],
};
const LIMB_INDEX: Readonly<Record<Limb, number>> = { RA: 0, LA: 1, LL: 2, RL: 2 };

/** lead′ = k · from (from null and k 0: a flat line) */
export interface LeadDesc {
  readonly lead: LimbLead;
  readonly from: LimbLead | null;
  readonly k: number;
}

/** Express a coefficient vector over (RA, LA, LL) as k × one of the six limb leads (null when it is zero). */
function asLead(v: readonly [number, number, number]): { readonly from: LimbLead | null; readonly k: number } {
  const eps = 1e-9;
  if (Math.abs(v[0]) < eps && Math.abs(v[1]) < eps && Math.abs(v[2]) < eps) return { from: null, k: 0 };
  for (const L of LIMB_LEADS) {
    const c = COEF[L];
    const j = c.findIndex((x) => Math.abs(x) > eps);
    const k = v[j] / c[j];
    if (Math.abs(k) > eps && c.every((x, i) => Math.abs(x * k - v[i]) < eps)) return { from: L, k: Math.round(k * 1e6) / 1e6 };
  }
  return { from: null, k: Number.NaN };
}

/** What a limb lead records under a hook-up: the cables keep their names, the limbs change. */
export function leadUnderHookup(h: Hookup, lead: LimbLead): LeadDesc {
  const v: [number, number, number] = [0, 0, 0];
  const c = COEF[lead];
  (['RA', 'LA', 'LL'] as const).forEach((cable, i) => {
    v[LIMB_INDEX[h[cable]]] += c[i];
  });
  return { lead, ...asLead(v) };
}

/** WCT′ − WCT as k × a limb lead (V′k = Vk − that), or from null when the terminal is unchanged. */
export function chestShiftOf(h: Hookup): { readonly from: LimbLead | null; readonly k: number } {
  const v: [number, number, number] = [-1 / 3, -1 / 3, -1 / 3];
  for (const cable of ['RA', 'LA', 'LL'] as const) v[LIMB_INDEX[h[cable]]] += 1 / 3;
  return asLead(v);
}

export interface Signature {
  readonly per: Readonly<Record<LimbLead, LeadDesc>>;
  /** leads recorded with the opposite sign (a lead that lands on another lead inverted counts too) */
  readonly inverted: readonly LimbLead[];
  /** leads that trade places (each pair once) */
  readonly swapped: readonly (readonly [LimbLead, LimbLead])[];
  readonly flat: readonly LimbLead[];
  readonly same: readonly LimbLead[];
  readonly chestShift: boolean;
}

export function hookupSignature(h: Hookup): Signature {
  const per = {} as Record<LimbLead, LeadDesc>;
  for (const L of LIMB_LEADS) per[L] = leadUnderHookup(h, L);
  const inverted = LIMB_LEADS.filter((L) => per[L].k === -1);
  const flat = LIMB_LEADS.filter((L) => per[L].k === 0);
  const same = LIMB_LEADS.filter((L) => per[L].from === L && per[L].k === 1);
  const swapped: (readonly [LimbLead, LimbLead])[] = [];
  for (const L of LIMB_LEADS) {
    const d = per[L];
    if (d.from && d.from !== L && Math.abs(d.k) === 1 && per[d.from].from === L && LIMB_LEADS.indexOf(L) < LIMB_LEADS.indexOf(d.from)) swapped.push([L, d.from]);
  }
  return { per, inverted, swapped, flat, same, chestShift: !wctUnchanged(h) };
}

/** Short cell text: "=" same · "0" flat · "III" · "−I" · "III/2". */
export function descText(d: { readonly lead?: LimbLead; readonly from: LimbLead | null; readonly k: number }): string {
  if (d.from == null || d.k === 0) return '0';
  if (d.lead && d.from === d.lead && d.k === 1) return '=';
  const a = Math.abs(d.k);
  return `${d.k < 0 ? '−' : ''}${d.from}${a === 1 ? '' : `/${Math.round(1 / a)}`}`;
}

/** The V column of the table: "=" or "−II/3" (V′ = V − II/3). */
export function chestText(h: Hookup): string {
  const s = chestShiftOf(h);
  return s.from == null ? '=' : `${s.k < 0 ? '+' : '−'}${s.from}/${Math.round(1 / Math.abs(s.k))}`;
}

const site = (h: Hookup, c: Cable): string => h[c];

/** The formula beside a strip, written with the limbs the cables actually touch (compact: no spaces, narrow layout). */
export function formulaText(lead: LimbLead, h: Hookup, compact = false): string {
  const RA = site(h, 'RA'), LA = site(h, 'LA'), LL = site(h, 'LL');
  const m = compact ? '−' : ' − ';
  const base: Record<LimbLead, string> = {
    I: `${LA}${m}${RA}`, II: `${LL}${m}${RA}`, III: `${LL}${m}${LA}`,
    aVR: `${RA}${m}(${LA}+${LL})/2`, aVL: `${LA}${m}(${RA}+${LL})/2`, aVF: `${LL}${m}(${RA}+${LA})/2`,
  };
  const d = leadUnderHookup(h, lead);
  const res = d.from === lead && d.k === 1 ? '' : `${compact ? '=' : ' = '}${descText(d)}`;
  return `${compact ? '' : `${lead} = `}${base[lead]}${res}`;
}

// ── beats and the frame ────────────────────────────────────────────────────────────────────────────────────────

export const BEATS: readonly BeatDef<BeatId>[] = [
  { id: BEAT_IDS[0], ms: 2800 },
  { id: BEAT_IDS[1], ms: 2400 },
  { id: BEAT_IDS[2], ms: 1600 },
  { id: BEAT_IDS[3], ms: 2600 },
];
const TILED = compileBeats(BEATS).beats;
export const DURATION_MS = BEATS.reduce((s, b) => s + b.ms, 0);
/** opacity of the two table rows the tour never shows (they fill fully once tried) */
export const UNTRIED = 0.45;
/** wall-clock length of a learner's swap */
export const SWAP_MS = 700;

/** The window the strips show: the block's second beat (or the only one), as beatWindow defines it. */
export function sceneWindow(truth: EcgTruth, durationMs: number): readonly [number, number] | null {
  const k = beatAt(truth.beats, null);
  return k < 0 ? null : beatWindow(truth.beats[k], durationMs);
}

/**
 * Where the meters settle (fraction of the window): the R peak of lead II of the window's beat (the largest |II|
 * between qrsOn and qrsOff), so every end frame shows a reading. 0.5 without a beat.
 */
export function meterFiducial(phi: Potentials, truth: EcgTruth, win: readonly [number, number]): number {
  const k = beatAt(truth.beats, null);
  if (k < 0 || !(win[1] > win[0])) return 0.5;
  const b = truth.beats[k], at = (ms: number) => Math.max(0, Math.min(phi.n - 1, Math.round((ms * phi.fs) / 1000)));
  let best = at(b.qrsOn), top = -1;
  for (let i = at(b.qrsOn); i <= at(b.qrsOff); i++) {
    const v = Math.abs(phi.LL[i] - phi.RA[i]);
    if (v > top) (top = v), (best = i);
  }
  return Math.max(0, Math.min(1, ((best * 1000) / phi.fs - win[0]) / (win[1] - win[0])));
}

/** Slow-motion factor of the pen in beat 1 (the strips draw the window over 70 % of that beat). */
export const penSlow = (windowMs: number): number => Math.round((0.7 * BEATS[0].ms) / windowMs);
/** The block cursor (ms of the record) for a meter position (window fraction). */
export const cursorMs = (win: readonly [number, number], t: number): number => Math.round(win[0] + t * (win[1] - win[0]));
/** Inverse of cursorMs, clamped to the window. */
export const cursorFrac = (win: readonly [number, number], ms: number): number => Math.max(0, Math.min(1, (ms - win[0]) / (win[1] - win[0])));

/** A plug travelling from one limb to another (f eased, 0 = still at `from`). */
export interface CableMove {
  readonly from: Limb;
  readonly to: Limb;
  readonly f: number;
}
/** A learner's swap in progress (f linear 0 … 1). */
export interface Manual {
  readonly from: Hookup;
  readonly to: Hookup;
  readonly f: number;
}

export interface Frame {
  /** the two exact signal states the strips crossfade between (xf 0 → A only, 1 → B only) */
  readonly hookA: Hookup;
  readonly hookB: Hookup;
  readonly xf: number;
  readonly cables: Readonly<Record<Cable, CableMove>>;
  /** fraction of each strip drawn (beat 1) */
  readonly reveal: number;
  /** where the meters (and the block cursor) read the potentials: fraction of the window; the pen in beat 1 until it
   *  reaches the fiducial, then held there (never runs backwards) */
  readonly meterT: number;
  readonly meterOp: number;
  readonly formulaOp: number;
  readonly rlOp: number;
  readonly cursorOp: number;
  readonly wctJoin: number;
  readonly wctLabelOp: number;
  readonly vCheckOp: number;
  readonly flatOp: number;
  readonly shiftOp: number;
  readonly rows: Readonly<Record<SwapId, number>>;
  readonly dextroOp: number;
}

const rest = (h: Hookup): Record<Cable, CableMove> => {
  const out = {} as Record<Cable, CableMove>;
  for (const c of CABLES) out[c] = { from: h[c], to: h[c], f: 1 };
  return out;
};

/** The hook-up the strips show at this frame. */
export const shownHookup = (fr: Pick<Frame, 'hookA' | 'hookB' | 'xf'>): Hookup => (fr.xf >= 0.5 ? fr.hookB : fr.hookA);

export function frame(p: number, manual: Manual | null = null, fid = 0.5): Frame {
  const l1 = local(TILED, 0, p), l2 = local(TILED, 1, p), l3 = local(TILED, 2, p), l4 = local(TILED, 3, p);
  const reveal = revealed(l1, 0.25, 0.95);
  const cursorOp = seg(l2, 0, 0.15);
  let hookA = HOOKUPS.correct, hookB = HOOKUPS.correct, xf = 0;
  let cables = rest(HOOKUPS.correct);
  if (p < TILED[1].to) {
    // beat 2: LA and RA cross; the strips crossfade at the crossing (≈ 300 ms)
    const f = seg(l2, 0.1, 0.6);
    hookB = HOOKUPS.laRa;
    xf = revealed(l2, 0.29, 0.41);
    cables = { ...cables, RA: { from: 'RA', to: 'LA', f }, LA: { from: 'LA', to: 'RA', f } };
  } else if (p < TILED[2].to) {
    hookB = HOOKUPS.laRa;
    xf = 1;
    cables = rest(HOOKUPS.laRa);
  } else if (l4 <= 0.3) {
    // beat 4a: the arm cables return
    const f = seg(l4, 0, 0.3);
    hookA = HOOKUPS.laRa;
    xf = revealed(l4, 0.09, 0.21);
    cables = { ...cables, RA: { from: 'LA', to: 'RA', f }, LA: { from: 'RA', to: 'LA', f } };
  } else {
    // beat 4b: RA and RL cross
    const f = seg(l4, 0.35, 0.75);
    hookB = HOOKUPS.raRl;
    xf = revealed(l4, 0.49, 0.61);
    cables = { ...cables, RA: { from: 'RA', to: 'RL', f }, RL: { from: 'RL', to: 'RA', f } };
  }
  const undo = 1 - seg(l4, 0, 0.3), undoFast = 1 - seg(l4, 0, 0.15);
  const late = seg(l4, 0.9, 1);
  const tour: Frame = {
    hookA, hookB, xf, cables, reveal,
    meterT: Math.min(reveal, fid),
    meterOp: seg(l1, 0.02, 0.2),
    formulaOp: seg(l1, 0.1, 0.3),
    rlOp: seg(l1, 0.75, 0.95),
    cursorOp,
    wctJoin: seg(l3, 0.05, 0.5) * undo,
    wctLabelOp: seg(l3, 0.4, 0.6) * undoFast,
    vCheckOp: seg(l3, 0.6, 0.85) * undoFast,
    flatOp: seg(l4, 0.62, 0.78),
    shiftOp: seg(l4, 0.68, 0.85),
    rows: { laRa: seg(l2, 0.6, 0.9), laLl: UNTRIED * late, raLl: UNTRIED * late, raRl: seg(l4, 0.72, 0.86), laRl: seg(l4, 0.84, 0.96) },
    dextroOp: late,
  };
  return manual ? composeManual(tour, manual) : tour;
}

/** A learner's swap replaces the tour's hook-ups and cable moves; its labels follow the crossfade. */
export function composeManual(fr: Frame, m: Manual): Frame {
  const f = easeInOut(m.f);
  const xf = revealed(m.f, 0.42, 0.58);
  const cables = {} as Record<Cable, CableMove>;
  for (const c of CABLES) cables[c] = { from: m.from[c], to: m.to[c], f };
  const op = Math.abs(2 * xf - 1);
  return { ...fr, hookA: m.from, hookB: m.to, xf, cables, flatOp: op, shiftOp: op, vCheckOp: op, wctJoin: 0, wctLabelOp: 0 };
}

// ── placement ──────────────────────────────────────────────────────────────────────────────────────────────────

export type Pt = readonly [number, number];
export interface Placement {
  readonly w: number;
  readonly h: number;
  readonly narrow: boolean;
  /** torso outline (original schematic, not to scale), drawn under `bodyT` */
  readonly body: readonly string[];
  readonly bodyT: string;
  readonly limbs: Readonly<Record<Limb, Pt>>;
  readonly sockets: Readonly<Record<Cable, Pt>>;
  /** x, y, w, h of the recorder box */
  readonly recorder: readonly [number, number, number, number];
  readonly wct: Pt;
  readonly meters: Readonly<Record<'RA' | 'LA' | 'LL', Pt>>;
  readonly lift: number;
  readonly strips: Readonly<Record<LimbLead, Pt>>;
  readonly stripW: number;
  readonly stripH: number;
  readonly vRow: Pt;
  readonly vW: number;
  readonly vH: number;
  readonly vGap: number;
  readonly table: Pt;
  readonly tableW: number;
  readonly rowH: number;
  readonly chip: Pt;
  readonly chipW: number;
  /** characters per line of the long labels (chip, V-row header) */
  readonly chars: number;
  /** where the RL note sits (beside the recorder) and its characters per line (it must stay left of the table) */
  readonly rlNote: Pt;
  readonly rlMax: number;
}

/** height of the closing chip (two lines) */
export const CHIP_H = 36;

const BODY = [
  'M115 6a16 16 0 1 0 0.01 0Z',
  'M86 44C60 50 48 70 46 100L46 182C46 216 70 236 115 236C160 236 184 216 184 182L184 100C182 70 170 50 144 44Z',
  'M48 70C34 90 26 120 22 150',
  'M182 70C196 90 204 120 208 150',
  'M92 234L80 286',
  'M138 234L150 286',
];

export const WIDE: Placement = {
  w: 760, h: 440, narrow: false, body: BODY, bodyT: '',
  limbs: { RA: [22, 154], LA: [208, 154], LL: [152, 290], RL: [78, 290] },
  sockets: { RA: [72, 320], LA: [98, 320], LL: [124, 320], RL: [150, 320] },
  recorder: [56, 320, 118, 62],
  wct: [115, 348],
  meters: { RA: [72, 398], LA: [106, 398], LL: [140, 398] },
  lift: 26,
  strips: { I: [244, 4], II: [416, 4], III: [588, 4], aVR: [244, 86], aVL: [416, 86], aVF: [588, 86] },
  stripW: 164, stripH: 62,
  vRow: [244, 184], vW: 80, vH: 54, vGap: 5.6,
  table: [244, 242], tableW: 508, rowH: 24,
  chip: [244, 402], chipW: 508,
  chars: 84,
  rlNote: [178, 332], rlMax: 7,
};

const sc = (p: Pt, k: number, dx: number, dy: number): Pt => [Math.round(p[0] * k + dx), Math.round(p[1] * k + dy)];
const K = 0.78;
export const NARROW: Placement = {
  w: 420, h: 664, narrow: true,
  body: BODY,
  bodyT: `translate(4 0) scale(${K})`,
  limbs: { RA: sc(WIDE.limbs.RA, K, 4, 0), LA: sc(WIDE.limbs.LA, K, 4, 0), LL: sc(WIDE.limbs.LL, K, 4, 0), RL: sc(WIDE.limbs.RL, K, 4, 0) },
  sockets: { RA: [60, 250], LA: [82, 250], LL: [104, 250], RL: [126, 250] },
  recorder: [46, 250, 102, 54],
  wct: [97, 276],
  meters: { RA: [60, 318], LA: [94, 318], LL: [128, 318] },
  lift: 20,
  strips: { I: [196, 4], II: [310, 4], III: [196, 84], aVR: [310, 84], aVL: [196, 164], aVF: [310, 164] },
  stripW: 106, stripH: 62,
  vRow: [4, 386], vW: 64, vH: 50, vGap: 5.6,
  table: [4, 440], tableW: 412, rowH: 28,
  chip: [4, 624], chipW: 412,
  chars: 64,
  rlNote: [154, 266], rlMax: 12,
};

/** Where a plug is drawn: between its two limb slots, lifted on an arc while it travels. */
export function plugPos(m: CableMove, pl: Placement): Pt {
  const a = pl.limbs[m.from], b = pl.limbs[m.to];
  if (m.from === m.to) return a;
  return [lerp(a[0], b[0], m.f), lerp(a[1], b[1], m.f) - Math.sin(Math.PI * m.f) * pl.lift];
}

/** The cable path from a recorder socket to its plug (one smooth curve). */
export function cablePath(socket: Pt, plug: Pt): string {
  const [sx, sy] = socket, [px, py] = plug;
  return `M${sx} ${sy}C${sx} ${sy - 50} ${px} ${py + 40} ${px} ${py}`;
}

/** The limb a plug (visually) sits on at this frame: its destination once past the midpoint. */
export const plugLimb = (m: CableMove): Limb => (m.f >= 0.5 ? m.to : m.from);

/** The box [x, y, w, h] of a lead's strip: the 3 × 2 (narrow 2 × 3) limb grid or the thin V1–V6 row. */
export function stripBox(pl: Placement, l: LimbLead | ChestLead): readonly [number, number, number, number] {
  const k = (CHEST_LEADS as readonly string[]).indexOf(l);
  if (k < 0) return [...pl.strips[l as LimbLead], pl.stripW, pl.stripH];
  return [pl.vRow[0] + k * (pl.vW + pl.vGap), pl.vRow[1], pl.vW, pl.vH];
}

/** Paper scale of the strips: window length, user units per mm (25 mm/s) and the fitted gains (from the correct hook-up). */
export interface StripScale {
  readonly ms: number;
  readonly mmL: number;
  readonly mmV: number;
  readonly g: number;
  readonly gv: number;
}
export function stripScale(phi: Potentials, win: readonly [number, number], pl: Placement): StripScale {
  const ms = win[1] - win[0];
  const ref = windowSignal(phi, HOOKUPS.correct, win);
  const mmL = pl.stripW / (ms / MS_PER_MM), mmV = pl.vW / (ms / MS_PER_MM);
  return { ms, mmL, mmV, g: fitGain(maxSpan(ref, LIMB_LEADS), mmL, pl.stripH), gv: fitGain(maxSpan(ref, CHEST_LEADS), mmV, pl.vH) };
}

/** The path builder of src/figures/strip.tsx (`leadPath`), injected so this module stays free of Preact. */
export type LeadPathFn = (sig: EcgSignal, lead: LimbLead | ChestLead, t0: number, t1: number, toX: (t: number) => number, toY: (mv: number) => number, columns: number) => string;

/** The twelve strip paths of one exact re-assembly; each lead is centred on its own span (an offset, never a shape change). */
export function stripPaths(phi: Potentials, h: Hookup, win: readonly [number, number], pl: Placement, geo: StripScale, path: LeadPathFn): Record<LimbLead | ChestLead, string> {
  const ws = windowSignal(phi, h, win);
  const out = {} as Record<LimbLead | ChestLead, string>;
  for (const l of [...LIMB_LEADS, ...CHEST_LEADS]) {
    const [x, y, w, bh] = stripBox(pl, l);
    const v = l.startsWith('V'), u = v ? geo.mmV * geo.gv : geo.mmL * geo.g;
    const [lo, hi] = leadSpan(ws, l), mid = (lo + hi) / 2;
    out[l] = path(ws, l, 0, geo.ms, (tm) => x + (w * tm) / geo.ms, (mv) => y + bh / 2 - (mv - mid) * u, v ? 80 : 160);
  }
  return out;
}

/** The V-row header: the WCT note with ✓, or the shift V′ = V − II/3 with its caveat. */
export function vRowText(h: Hookup, shiftNote: string, wctNote: string, sameNote: string): string {
  return wctUnchanged(h) ? `${wctNote}   ${sameNote}` : `V′ = V ${chestText(h).replace(/^([−+])/, '$1 ')} · ${shiftNote}`;
}

/** Decimals a gain needs when printed (10, 5 → 0; 2.5 → 1; 1.25 → 2). */
export const gainDigits = (g: number): number => (g % 1 ? ((g * 10) % 1 ? 2 : 1) : 0);

/** Characters per line of the closing chip (wraps to two lines above this). */
export const CHIP_CHARS = 64;

/** The potential (mV, WCT gauge) a recording cable carries at window fraction t: its limb's (RL ≡ LL). */
export function cableValue(phi: Potentials, h: Hookup, c: 'RA' | 'LA' | 'LL', win: readonly [number, number], t: number): number {
  const i = Math.max(0, Math.min(phi.n - 1, Math.round(((win[0] + t * (win[1] - win[0])) * phi.fs) / 1000)));
  return limbOf(phi, h[c])[i];
}

/** One text cell of the signature table. */
export interface Cell {
  readonly x: number;
  readonly text: string;
  readonly fill: string;
  readonly bold: boolean;
  readonly mid: boolean;
}
/**
 * The cells of a table row: swap · I … aVF (as descText of the signature) · V1–V6 (✓ or the shift) · the tell-tale
 * sign (`last`, a translated text). `id` null is the header row (`first` / `last` are the translated column titles).
 */
export function rowCells(pl: Placement, id: SwapId | null, first: string, last: string): Cell[] {
  const muted = 'var(--fg-muted)', fg = 'var(--fg)';
  const sig = id ? hookupSignature(HOOKUPS[id]) : null;
  const v = id ? chestText(HOOKUPS[id]) : 'V1–V6';
  const out: Cell[] = [{ x: tableX(pl, 'swap'), text: id ? SWAP_PAIR[id].join('↔') : first, fill: id ? fg : muted, bold: !!id, mid: false }];
  LIMB_LEADS.forEach((l, k) => {
    const text = sig ? descText(sig.per[l]) : l;
    out.push({ x: tableX(pl, k), text, fill: sig ? cellColor(text) : fg, bold: text !== '=', mid: true });
  });
  out.push({ x: tableX(pl, 'v'), text: id && v === '=' ? '✓' : v, fill: !id ? fg : v === '=' ? 'var(--ok)' : 'var(--c-highlight)', bold: true, mid: true });
  out.push({ x: tableX(pl, 'key'), text: last, fill: id ? fg : muted, bold: !!id, mid: false });
  return out;
}

/** Rows below this opacity are not yet on screen: not focusable, not clickable. */
export const ROW_LIVE = 0.3;
/** Opacity of a table row: the tour's fill, or full once the learner tried it. */
export const rowOpacity = (fr: Pick<Frame, 'rows'>, id: SwapId, tried: boolean): number => Math.max(fr.rows[id], tried ? 1 : 0);
/** The Predict question's answer: the lead LA ↔ LL inverts, from the signature (spec §4.8). */
export const PREDICT_LEAD = hookupSignature(HOOKUPS.laLl).inverted[0] as 'I' | 'II' | 'III';
/** Plug radius and the (invisible) hit radius around it: ≥ 24 px on a phone. */
export const PLUG_R = 14;
export const PLUG_HIT = 17;

/** Estimated width (user units, 11-unit font) of a label: CJK ≈ 11, Latin ≈ 5.6 per character. */
export const textWidth = (s: string): number => [...s].reduce((w, c) => w + (/[　-鿿＀-￯]/.test(c) ? 11 : 5.6), 0);
/** The long label when it fits on one line in `w`, else the short one. */
export const fitLabel = (long: string, short: string, w: number): string => (textWidth(long) <= w ? long : short);

/** Height (user units, clamped to ±16) of a potential meter's bar. */
export const meterBar = (mv: number): number => Math.max(-16, Math.min(16, mv * 14));

/** Where a limb site's name sits: outside the plug, above the hands, beside the feet. */
export function siteLabel(pl: Placement, l: Limb): { readonly x: number; readonly y: number; readonly anchor: 'start' | 'end' } {
  const right = l === 'RA' || l === 'RL';
  return { x: pl.limbs[l][0] + (right ? -15 : 15), y: pl.limbs[l][1] + (l[1] === 'A' ? -18 : 4), anchor: right ? 'end' : 'start' };
}

