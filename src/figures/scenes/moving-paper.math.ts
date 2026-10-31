/**
 * Pure maths of the "moving-paper" scene (lesson f4; spec docs/design/f-explainers.md §4.6). No Preact, no DOM.
 *
 * Model. One source: lead II of the block's synthetic ECG. The pen is fixed; the paper moves under it. Paper speed v(τ)
 * and gain g(τ) are functions of RECORD time τ (the recording chain: the heart never changes). Ink laid at τ sits at
 * paper abscissa X(τ) = ∫ v (the integral, so ink already on the paper stays where it was laid when the speed changes)
 * and at height g(τ) · (II(τ) + pulse(τ)). Before `conn` the patient input is not yet connected (the machine prints
 * its calibration pulse first, as a real recorder does), afterwards the pen input is lead II plus any pulse.
 * The tour schedule changes speed / gain only on flat stretches (ST segment, TP segment) or while a T wave is drawn,
 * never during a pulse, so every pulse is exactly calibrationPulse(speed, gain).
 * The learner's toggles re-draw the WHOLE record at another scale: speed and gain are convex blends of "tour" and the
 * fixed settings (weights), morphed continuously; X stays the blend of the integrals, so the morph is a stretch of the
 * true signal, never an interpolated waveform.
 * p maps linearly to record time (timeOfP): speed and gain never enter the timeline.
 */
import { calibrationPulse, mmFromMs, mmFromMv, rrBracket } from '../math/paper';
import { timeOfP, type Beat, type BeatDef } from '../scene/timeline';
import { windowMedian } from '../strip';
import { BEAT_IDS, type BeatId } from './moving-paper.i18n';

export { BEAT_IDS, type BeatId };

// ── placement (two tables, one frame) ───────────────────────────────────────────────────────────────────────

export interface Layout {
  readonly id: 'wide' | 'narrow';
  /** viewBox (mm) */
  readonly w: number;
  readonly h: number;
  /** paper band (y, mm) */
  readonly pt: number;
  readonly pb: number;
  /** baseline (y, mm) */
  readonly base: number;
  /** the fixed pen (x, mm) */
  readonly pen: number;
  /** lever arm length per mm/mV (drawing only) */
  readonly lever: number;
  /** label font size (mm) */
  readonly fs: number;
  /** receipt cards: x of each, y of the top, size */
  readonly cardX: readonly [number, number, number];
  readonly cardY: number;
  readonly cardW: number;
  readonly cardH: number;
  /** receipt label: offset from the card's left / top, below the card in narrow */
  readonly lblDx: number;
  readonly lblDy: number;
  /** the speed / gain labels on the blank paper right of the pen */
  readonly penLabels: boolean;
}

export const WIDE: Layout = {
  id: 'wide', w: 80, h: 46, pt: 14, pb: 46, base: 36, pen: 160 / 3, lever: 0.9, fs: 1.4,
  cardX: [2, 28, 54], cardY: 1.2, cardW: 9, cardH: 11.2, lblDx: 10.4, lblDy: 4.6, penLabels: true,
};

export const NARROW: Layout = {
  id: 'narrow', w: 52, h: 56, pt: 18, pb: 56, base: 48, pen: 46, lever: 0.28, fs: 1.7,
  cardX: [1.5, 18.5, 35.5], cardY: 0.8, cardW: 9, cardH: 11.2, lblDx: 0, lblDy: 13.9, penLabels: false,
};

/** Placement table for a stage width (CSS px), chosen at mount, never during playback. */
export function placementFor(widthPx: number): Layout {
  return widthPx >= 560 ? WIDE : NARROW;
}

/** Receipts are drawn at half size (a card holds the 20 mm/mV pulse). */
export const RECEIPT_SCALE = 0.5;

/** Wall-clock slow motion of the tour (× record time). */
export const SLOW = 3;

/** Card each pulse's copy flies to: the fourth (standard, after the gain returns) lands on receipt 1 as a confirmation. */
export const CARD_OF = [0, 1, 2, 0] as const;

// ── smoothstep and its exact integral ───────────────────────────────────────────────────────────────────────

/** smoothstep of τ through [a, b] (0 before, 1 after) */
export function step(t: number, a: number, b: number): number {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const u = (t - a) / (b - a);
  return u * u * (3 - 2 * u);
}

/** ∫_{-∞}^{τ} step(s, a, b) ds — exact (u³ − u⁴/2 inside the ramp) */
export function stepIntegral(t: number, a: number, b: number): number {
  const L = b - a;
  if (t <= a) return 0;
  if (t >= b) return t - a - L / 2;
  const u = (t - a) / L;
  return L * (u * u * u - (u * u * u * u) / 2);
}

// ── the plan: every event of the tour in record ms, from the block's own fiducials ───────────────────────

export interface Iv {
  readonly on: number;
  readonly off: number;
}

/** What the plan reads from Ecg.truth.beats (BeatMarks). */
export interface PlanBeat {
  readonly pOn: number | null;
  readonly qrsOn: number;
  readonly qrsOff: number;
  readonly tOff: number;
}

export interface Plan {
  /** window [t0, t1] (ms of the record) */
  readonly t0: number;
  readonly t1: number;
  /** patient input connected (= ruler start = paper origin X = 0) */
  readonly conn: number;
  readonly rulerEnd: number;
  /** beat boundaries t0 … t1 (6 values) */
  readonly bounds: readonly number[];
  /** R-peak times of the six beats B1 … B6 */
  readonly r: readonly number[];
  /** QRS on / off of B1 … B6 (truth) */
  readonly qrs: readonly Iv[];
  /** RR of the three brackets (truth qrsOn differences): B1–B2, B3–B4, B5–B6 */
  readonly rrMs: readonly [number, number, number];
  /** the four calibration pulses: standard, 50 mm/s, 5 mm/mV, standard again (before B6) */
  readonly pulses: readonly [Iv, Iv, Iv, Iv];
  readonly accel: Iv;
  readonly decel: Iv;
  readonly gainDown: Iv;
  readonly gainUp: Iv;
  /** lead II, its sampling rate and the window's baseline */
  readonly ii: Float32Array;
  readonly fs: number;
  readonly baseMv: number;
}

/** Record time before R1 at which the window starts (pre-roll: pulse 1 with the patient input off). */
export const PRE_ROLL_MS = 900;
export const PULSE_MS = 200;

/** R-peak time: the largest |II − baseline| inside [qrsOn, qrsOff]. */
export function rPeakTime(x: Float32Array, fs: number, base: number, on: number, off: number): number {
  const i0 = Math.max(0, Math.floor((on * fs) / 1000));
  const i1 = Math.min(x.length - 1, Math.ceil((off * fs) / 1000));
  let best = i0;
  for (let i = i0; i <= i1; i++) if (Math.abs(x[i] - base) > Math.abs(x[best] - base)) best = i;
  return (best * 1000) / fs;
}

/**
 * The tour from the block's beats: the first beat with room for the pre-roll and five more after it. Returns null
 * when the record cannot hold the tour (too few beats, too fast a rate): the scene then stays "not ready".
 */
export function planFor(beats: readonly PlanBeat[], ii: Float32Array | undefined, fs: number, durationMs: number): Plan | null {
  if (!ii || beats.length < 6) return null;
  const base0 = windowMedian(ii, fs, 0, durationMs);
  for (let a = 0; a + 5 < beats.length; a++) {
    const bs = beats.slice(a, a + 6);
    const r = bs.map((b) => rPeakTime(ii, fs, base0, b.qrsOn, b.qrsOff));
    const t0 = r[0] - PRE_ROLL_MS;
    if (t0 < 0) continue;
    const t1 = bs[5].tOff + 80;
    if (t1 > durationMs) return null;
    const pOn = (k: number) => bs[k].pOn ?? bs[k].qrsOn - 160;
    const conn = r[0] - 400;
    const iv = (on: number, off: number): Iv => ({ on, off });
    const late = (k: number) => iv(pOn(k) - 6 - PULSE_MS, pOn(k) - 6);
    const pulses: [Iv, Iv, Iv, Iv] = [iv(t0 + 100, t0 + 100 + PULSE_MS), late(2), iv(pOn(4) - 10 - PULSE_MS, pOn(4) - 10), late(5)];
    // speed up and gain back on the flat TP (after T, before the pulse; at least 40 ms, reaching back into the T tail
    // when the TP is short): the rr beat keeps B2's whole T wave
    const ramp = (tOff: number, before: number) => iv(Math.min(tOff + 3, before - 40), before);
    const accel = ramp(bs[1].tOff, pulses[1].on - 6);
    const decel = iv(bs[3].qrsOff + 5, bs[3].qrsOff + 95);
    const gainDown = iv(decel.off, pulses[2].on - 10);
    const gainUp = ramp(bs[4].tOff, pulses[3].on - 8);
    const rulerEnd = conn + 1000;
    const bounds = [t0, conn, rulerEnd, accel.on, decel.on, t1];
    const order = [t0, pulses[0].off, conn, rulerEnd, r[1], accel.on, accel.off, pulses[1].on, pulses[1].off + 200, r[3], decel.on, gainDown.off, pulses[2].on, pulses[2].off + 200, r[4], gainUp.on, gainUp.off, pulses[3].on, r[5], t1];
    const ok = order.every((v, k) => k === 0 || v > order[k - 1] + 5) && pulses[3].off + 200 <= t1 && accel.off - accel.on >= 30 && gainUp.off - gainUp.on >= 30 && gainDown.off - gainDown.on >= 60;
    if (!ok) return null;
    return {
      t0, t1, conn, rulerEnd, bounds, r,
      qrs: bs.map((b) => iv(b.qrsOn, b.qrsOff)),
      rrMs: [bs[1].qrsOn - bs[0].qrsOn, bs[3].qrsOn - bs[2].qrsOn, bs[5].qrsOn - bs[4].qrsOn],
      pulses, accel, decel, gainDown, gainUp, ii, fs,
      baseMv: windowMedian(ii, fs, t0, t1),
    };
  }
  return null;
}

/** Narration beats: lengths are the record spans, so p stays linear in record time. */
export function beatDefs(plan: Plan): BeatDef<BeatId>[] {
  return BEAT_IDS.map((id, k) => ({ id, ms: plan.bounds[k + 1] - plan.bounds[k] }));
}

// ── scale state: the tour or the learner's fixed settings, as convex weights ───────────────────────────────

export const SPEED_MODES = ['tour', 25, 50] as const;
export type SpeedMode = (typeof SPEED_MODES)[number];
export const GAIN_MODES = ['tour', 5, 10, 20] as const;
export type GainMode = (typeof GAIN_MODES)[number];

export interface Scale {
  /** weights over SPEED_MODES / GAIN_MODES (each sums to 1) */
  readonly sw: readonly number[];
  readonly gw: readonly number[];
}

export const TOUR: Scale = { sw: [1, 0, 0], gw: [1, 0, 0, 0] };

export function unit(n: number, k: number): number[] {
  return Array.from({ length: n }, (_, i) => (i === k ? 1 : 0));
}

/** Weights of a mode (a corner of the simplex). */
export function scaleOf(speed: SpeedMode, gain: GainMode): Scale {
  return { sw: unit(3, SPEED_MODES.indexOf(speed)), gw: unit(4, GAIN_MODES.indexOf(gain)) };
}

/** Blend from the current (possibly intermediate) weights toward a target corner: continuous under re-toggling. */
export function blend(from: readonly number[], to: readonly number[], f: number): number[] {
  return from.map((w, i) => w + (to[i] - w) * f);
}

export function tourSpeed(plan: Plan, t: number): number {
  return 25 + 25 * step(t, plan.accel.on, plan.accel.off) - 25 * step(t, plan.decel.on, plan.decel.off);
}

export function tourGain(plan: Plan, t: number): number {
  return 10 - 5 * step(t, plan.gainDown.on, plan.gainDown.off) + 5 * step(t, plan.gainUp.on, plan.gainUp.off);
}

/** Paper abscissa (mm) of the tour: ∫_{conn}^{τ} v / 1000, exact. */
export function tourX(plan: Plan, t: number): number {
  const F = (s: number) => 25 * s + 25 * stepIntegral(s, plan.accel.on, plan.accel.off) - 25 * stepIntegral(s, plan.decel.on, plan.decel.off);
  return (F(t) - F(plan.conn)) / 1000;
}

export function speedAt(plan: Plan, s: Scale, t: number): number {
  return s.sw[0] * tourSpeed(plan, t) + 25 * s.sw[1] + 50 * s.sw[2];
}

export function gainAt(plan: Plan, s: Scale, t: number): number {
  return s.gw[0] * tourGain(plan, t) + 5 * s.gw[1] + 10 * s.gw[2] + 20 * s.gw[3];
}

/** Paper abscissa (mm) of the ink laid at τ; X(conn) = 0 (a heavy grid line). */
export function paperX(plan: Plan, s: Scale, t: number): number {
  const fixed = 25 * s.sw[1] + 50 * s.sw[2];
  return s.sw[0] * tourX(plan, t) + mmFromMs(t - plan.conn, fixed);
}

// ── the pen input ───────────────────────────────────────────────────────────────────────────────────────────

/** How long the input switch takes to settle (ms before `conn`), so the pen never steps on the flat TP. */
export const CONNECT_MS = 40;

/** Lead II (mV, baseline removed) at τ, linear interpolation; 0 before the input is connected. */
export function inputMv(plan: Plan, t: number): number {
  const w = step(t, plan.conn - CONNECT_MS, plan.conn);
  if (w === 0) return 0;
  const x = (t * plan.fs) / 1000;
  const i = Math.floor(x);
  const a = plan.ii[Math.max(0, Math.min(plan.ii.length - 1, i))];
  const b = plan.ii[Math.max(0, Math.min(plan.ii.length - 1, i + 1))];
  return w * (a + (b - a) * (x - i) - plan.baseMv);
}

export function pulseMv(plan: Plan, t: number): number {
  return plan.pulses.some((q) => t >= q.on && t < q.off) ? 1 : 0;
}

/** Height (mm above the baseline) of the ink laid at τ. */
export function inkMm(plan: Plan, s: Scale, t: number): number {
  return mmFromMv(inputMv(plan, t) + pulseMv(plan, t), gainAt(plan, s, t));
}

/**
 * The trace as an SVG path in PAPER coordinates (x = X(τ), y = base − height), decimated with a min/max pair per
 * column of `colMm` paper millimetres; the pulse edges are exact vertical segments. Rebuilt only when the scale changes.
 */
export function inkPath(plan: Plan, s: Scale, base: number, colMm = 0.35): string {
  const r = (v: number) => Math.round(v * 100) / 100;
  const pts: Array<readonly [number, number]> = [];
  const dt = 1000 / plan.fs;
  const edges = plan.pulses.flatMap((q) => [q.on, q.off]);
  let col = Number.NaN;
  let lo: [number, number, number] | null = null; // [x, y, order]
  let hi: [number, number, number] | null = null;
  let n = 0;
  const flush = () => {
    if (lo && hi) {
      const [a, b] = lo[2] <= hi[2] ? [lo, hi] : [hi, lo];
      pts.push([a[0], a[1]]);
      if (b !== a) pts.push([b[0], b[1]]);
    }
    lo = hi = null;
  };
  const add = (t: number, mm: number) => {
    const x = paperX(plan, s, t);
    const y = base - mm;
    const c = Math.floor(x / colMm);
    if (c !== col) {
      flush();
      col = c;
    }
    const p: [number, number, number] = [x, y, n++];
    if (!lo || y > lo[1]) lo = p;
    if (!hi || y < hi[1]) hi = p;
  };
  let e = 0;
  for (let t = plan.t0; t <= plan.t1 + 1e-9; t += dt) {
    while (e < edges.length && edges[e] <= t) {
      // exact vertical edge: the pen's value just before and just after the step
      const te = edges[e];
      flush();
      col = Number.NaN;
      const g = gainAt(plan, s, te);
      const v = inputMv(plan, te);
      const up = e % 2 === 0;
      pts.push([paperX(plan, s, te), base - mmFromMv(v + (up ? 0 : 1), g)]);
      pts.push([paperX(plan, s, te), base - mmFromMv(v + (up ? 1 : 0), g)]);
      e++;
    }
    add(t, inkMm(plan, s, t));
  }
  flush();
  return pts.map((q, i) => `${i ? 'L' : 'M'}${r(q[0])} ${r(q[1])}`).join('');
}

// ── read-outs ───────────────────────────────────────────────────────────────────────────────────────────────

export interface RrLabel {
  /** large squares spanned, ms per large square, the interval (truth, ms), the "300 rule" constant, rate */
  readonly n: number;
  readonly sq: number;
  readonly ms: number;
  readonly k: number;
  readonly bpm: number;
}

/** The arithmetic of an RR bracket at paper speed v: n large squares × (5000 / v) ms = RR; (12 v) ÷ n = rate. */
export function rrLabel(rrMs: number, v: number): RrLabel {
  const sq = 5000 / v;
  return { n: rrMs / sq, sq, ms: rrMs, k: 12 * v, bpm: 60000 / rrMs };
}

/** QRS width in small squares at speed v. */
export function qrsSquares(qrsMs: number, v: number): number {
  return qrsMs / (1000 / v);
}

/** Pulse k as drawn (true mm), from the settings at its onset. */
export function pulseOf(plan: Plan, s: Scale, k: number): { readonly v: number; readonly g: number; readonly widthMm: number; readonly heightMm: number } {
  const t = plan.pulses[k].on;
  const v = speedAt(plan, s, t);
  const g = gainAt(plan, s, t);
  return { v, g, ...calibrationPulse(v, g, PULSE_MS) };
}

/** Number of calibration pulses that have fully passed the pen at τ. */
export function receiptsPassed(plan: Plan, t: number): number {
  return plan.pulses.filter((q) => t >= q.off).length;
}

// ── the frame ───────────────────────────────────────────────────────────────────────────────────────────────

export interface Bracket {
  /** paper x of both ends (x2 follows the pen while it grows) */
  readonly x1: number;
  readonly x2: number;
  /** the bracket line, the baselines of the arithmetic line and of the rate line, the tick ends: the blend of the
   * placement above the peaks and the one below the trace by `wDown` */
  readonly lineY: number;
  readonly y1: number;
  readonly y2: number;
  readonly tick0: number;
  readonly tick1: number;
  /** 0 = above the peaks, 1 = below the trace; the side of each gain corner, weighted like the gain (so a gain morph
   * slides the bracket from one side to the other, never cuts) */
  readonly wDown: number;
  /** wDown < 0.5 (informational: the drawing uses wDown) */
  readonly above: boolean;
  /** bracket / label opacity */
  readonly o: number;
  readonly lo: number;
  readonly label: RrLabel;
}

export interface QrsMark {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly o: number;
  readonly n: number;
  readonly ms: number;
}

export interface ReceiptFrame {
  /** 0 before the pulse passed, then the flight 0 → 1 (1 = resting in its card) */
  readonly fly: number;
  /** screen position (bottom-left of the pulse) and scale of the copy */
  readonly x: number;
  readonly y: number;
  readonly k: number;
  readonly v: number;
  readonly g: number;
  readonly widthMm: number;
  readonly heightMm: number;
  /** the dimension labels on the paper pulse */
  readonly dimO: number;
  /** paper x of the pulse onset */
  readonly px: number;
}

export interface Frame {
  readonly t: number;
  /** translate of the paper group (screen x of paper x = 0) */
  readonly shift: number;
  readonly penY: number;
  readonly leverMm: number;
  readonly v: number;
  readonly g: number;
  readonly receipts: readonly ReceiptFrame[];
  readonly passed: number;
  /** ruler ticks: paper x of each (26), labels' opacity (40 ms, 200 ms, 1 s), highlighted squares */
  readonly ticks: readonly number[];
  readonly rulerO: readonly [number, number, number];
  readonly sqO: readonly [number, number];
  readonly rr: readonly [Bracket, Bracket, Bracket];
  readonly qrs: readonly [QrsMark, QrsMark];
  /** "half gain: × 2" near R5 */
  readonly halfO: number;
  readonly halfX: number;
  readonly halfY: number;
}

const fade = (t: number, a: number, len: number) => step(t, a, a + len);

export function frame(p: number, plan: Plan, s: Scale, lay: Layout): Frame {
  const t = timeOfP([plan.t0, plan.t1], p);
  const X = (u: number) => paperX(plan, s, u);
  const xNow = X(t);
  const shift = lay.pen - xNow;
  const v = speedAt(plan, s, t);
  const g = gainAt(plan, s, t);
  const penY = lay.base - inkMm(plan, s, t);

  const receipts = plan.pulses.map((q, k) => {
    const pu = pulseOf(plan, s, k);
    const fly = t < q.off ? 0 : Math.max(1e-6, step(t, q.off, q.off + 200));
    const sx = shift + X(q.on);
    const tx = lay.cardX[CARD_OF[k]] + 2;
    const ty = lay.cardY + lay.cardH - 0.6;
    return {
      fly,
      x: sx + (tx - sx) * fly,
      y: lay.base + (ty - lay.base) * fly,
      k: 1 + (RECEIPT_SCALE - 1) * fly,
      v: pu.v, g: pu.g, widthMm: pu.widthMm, heightMm: pu.heightMm,
      dimO: fade(t, q.on, PULSE_MS),
      px: X(q.on),
    };
  });

  const ticks = Array.from({ length: 26 }, (_, k) => X(plan.conn + 40 * k));
  const rulerO: [number, number, number] = [fade(t, plan.conn + 40, 60), fade(t, plan.conn + 200, 60), fade(t, plan.conn + 1000 - 60, 60)];
  const sqOut = 1 - fade(t, plan.bounds[3], 200);
  const sqO: [number, number] = [fade(t, plan.conn + 40, 60) * sqOut, fade(t, plan.conn + 200, 60) * sqOut];

  const tm = lay.fs * 2.6;
  const band = lay.pb - lay.pt;
  // "× 2" sits centred over R5, clear of pulse 3's height label on its left (pulse 4 is on its right)
  const halfLift = (sc: Scale) => Math.max(inkMm(plan, sc, plan.r[4]) + 0.7, pulseOf(plan, sc, 2).heightMm + 0.7 + 1.75 * lay.fs);
  // shown only while R5 really was recorded below 10 mm/mV (a gain toggle re-draws it at another scale)
  const halfOn = (sc: Scale) => Math.min(1, Math.max(0, (10 - gainAt(plan, sc, plan.r[4])) / 5));
  const pair = (a: number, b: number, rr: number, on: number, out: number, clear?: (sc: Scale) => number): Bracket => {
    const ra = plan.r[a], rb = plan.r[b];
    // a pulse inside the interval (pulse 4 in R5–R6) counts as a peak, with its height label on top
    const inner = plan.pulses.filter((q) => q.on > ra && q.off < rb).map((q) => (q.on + q.off) / 2);
    const top = (sc: Scale) => {
      const h = (u: number) => inkMm(plan, sc, u);
      return lay.base - Math.max(h(ra), h(rb), 0, clear ? clear(sc) : 0, ...inner.map((u) => h(u) + 0.7 + lay.fs));
    };
    const bottom = (sc: Scale) => lay.base - Math.min(inkMm(plan, sc, plan.qrs[a].off - 20), inkMm(plan, sc, plan.qrs[b].off - 20), 0);
    // above: rrBracket's own rule, clamped so the label never leaves the band while it slides
    const upL = Math.max(top(s) - 1.8, lay.pt + 0.9 + 0.75 * tm);
    const dn = rrBracket(-Infinity, bottom(s) - lay.pt, band, tm).lineY + lay.pt;
    const dy1 = dn + 0.6 + 0.75 * lay.fs;
    const wDown = GAIN_MODES.reduce((acc, _, j) => {
      const c: Scale = { sw: s.sw, gw: unit(4, j) };
      return acc + (s.gw[j] ? s.gw[j] * (rrBracket(top(c) - lay.pt, bottom(c) - lay.pt, band, tm).above ? 0 : 1) : 0);
    }, 0);
    const mix = (u: number, d: number) => u + (d - u) * wDown;
    const vMid = speedAt(plan, s, (ra + rb) / 2);
    const gone = 1 - fade(t, out, 200);
    return {
      x1: X(ra), x2: X(Math.min(Math.max(t, ra), rb)),
      lineY: mix(upL, dn), y1: mix(upL - 0.6, dy1), y2: mix(upL - 0.6 - 1.15 * lay.fs, dy1 + 1.15 * lay.fs),
      tick0: mix(upL + 0.8, dn - 0.8), tick1: mix(upL - 0.8, dn + 0.8), wDown, above: wDown < 0.5,
      o: t < on ? 0 : fade(t, on, 80) * gone, lo: fade(t, rb, 50) * gone,
      label: rrLabel(rr, vMid),
    };
  };
  // each bracket holds until the next one starts growing (the last holds on the end frame)
  const rr: [Bracket, Bracket, Bracket] = [
    pair(0, 1, plan.rrMs[0], plan.rulerEnd, plan.r[2]),
    pair(2, 3, plan.rrMs[1], plan.r[2], plan.r[4]),
    pair(4, 5, plan.rrMs[2], plan.r[4], Infinity, (sc) => halfOn(sc) * (halfLift(sc) + lay.fs)),
  ];

  const mark = (k: number, on: number, out: number): QrsMark => {
    const q = plan.qrs[k];
    const vq = speedAt(plan, s, (q.on + q.off) / 2);
    const depth = Math.max(0, -Math.min(inkMm(plan, s, q.off - 20), inkMm(plan, s, q.off - 10)));
    return {
      x1: X(q.on), x2: X(q.off), y: lay.base + depth + 1.2,
      o: fade(t, on, 100) * (1 - fade(t, out, 200)),
      n: qrsSquares(q.off - q.on, vq), ms: q.off - q.on,
    };
  };
  const qrs: [QrsMark, QrsMark] = [mark(0, plan.rulerEnd, plan.r[2]), mark(5, plan.qrs[5].off, Infinity)];

  return {
    t, shift, penY, leverMm: g * lay.lever, v, g, receipts, passed: receiptsPassed(plan, t),
    ticks, rulerO, sqO, rr, qrs,
    halfO: fade(t, plan.r[4], 80) * halfOn(s),
    halfX: X(plan.r[4]),
    halfY: lay.base - halfLift(s),
  };
}

/**
 * Beat shown at p for this scene's transport (prev / next land on beat ENDS): p = beats[k].to is beat k, so the
 * end frame of every beat is reachable with prev / next, and the counter, the dots and the narration agree.
 * (Local stand-in until the runtime's beatIndexAt does this for seekTo 'end'.)
 */
export function navIndex(beats: readonly Beat[], p: number): number {
  const k = beats.findIndex((b) => p <= b.to + 1e-12);
  return k < 0 ? Math.max(0, beats.length - 1) : k;
}

/** Flatten a frame into numbers (continuity tests). */
export function frameNumbers(f: Frame): number[] {
  const out: number[] = [];
  const walk = (x: unknown) => {
    if (typeof x === 'number') out.push(x);
    else if (typeof x === 'boolean') out.push(x ? 1 : 0);
    else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') Object.values(x).forEach(walk);
  };
  walk(f);
  return out;
}

// ── formatting helpers (pure) ───────────────────────────────────────────────────────────────────────────────

/** Fewest decimals (0–2) that show x exactly; 2 otherwise (0.1, 0.05, 0.25, 1). */
export function digitsFor(x: number): number {
  for (let d = 0; d <= 2; d++) if (Math.abs(x * 10 ** d - Math.round(x * 10 ** d)) < 1e-6) return d;
  return 2;
}

/** Large squares shown on a bracket: whole when within 0.05 of an integer, else one decimal. */
export function squaresDigits(n: number): number {
  return Math.abs(n - Math.round(n)) < 0.05 ? 0 : 1;
}

/** RR shown on paper: to the nearest 10 ms (reading precision of the grid). */
export function rrShown(ms: number): number {
  return Math.round(ms / 10) * 10;
}

// ── static paths (pure) ─────────────────────────────────────────────────────────────────────────────────────

/** The ruler ticks (paper coords): each small square, taller every 5 mm, tallest at 0 and 25 mm (1 s at 25 mm/s). */
export function rulerPath(ticks: readonly number[], lay: Layout): string {
  return ticks.map((x, k) => `M${Math.round(x * 100) / 100} ${lay.pb}v${-(k % 25 === 0 ? 2.4 : k % 5 === 0 ? 1.6 : 0.9)}`).join('');
}

/** Heavy grid of a receipt card (half size: one large square = 2.5 mm), baseline-aligned. */
export function cardGridPath(x: number, lay: Layout): string {
  let d = '';
  for (let i = 2.5; i < lay.cardW; i += 2.5) d += `M${x + i} ${lay.cardY}v${lay.cardH}`;
  for (let j = lay.cardH - 0.6; j > 0; j -= 2.5) d += `M${x} ${lay.cardY + j}h${lay.cardW}`;
  return d;
}

/** Paper x range [left, right] (multiples of 5 mm) the grid must cover for every scale (the widest is 50 mm/s). */
export function gridExtent(plan: Plan | null, lay: Layout): readonly [number, number] {
  if (!plan) return [-Math.ceil(lay.pen / 5) * 5, Math.ceil((lay.w - lay.pen) / 5) * 5];
  const fast = scaleOf(50, 'tour');
  const left = Math.floor((paperX(plan, fast, plan.t0) - lay.pen) / 5) * 5 - 5;
  const right = Math.ceil((paperX(plan, fast, plan.t1) + lay.w - lay.pen) / 5) * 5 + 5;
  return [left, right];
}
