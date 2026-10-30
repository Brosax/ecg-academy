/**
 * Venous inflow timing of the schematic blood-flow layer (血流示意) — pure, a function of sim time only. The venous
 * streams (core/vesselPaths.ts: venae cavae → RA, pulmonary veins → LA) are timed from the same FlowContext as the
 * valves (core/flowTiming.ts: engine.cycleAt valve events): no fluid mechanics, no per-disease code.
 *
 * Forward venous flow comes in two waves per beat (pulmonary-vein and caval Doppler; Nagueh et al., JASE 2016;
 * Appleton, Hatle & Popp, JACC 1987):
 *   S — during ventricular systole: the atrium relaxes and the AV ring is pulled toward the apex (x descent). Drawn over
 *       the side's semilunar window (ejection) with a smoothstep profile (peak mid-ejection);
 *   D — once the AV valve opens: the blood runs straight through the atrium into the ventricle (y descent). Drawn with
 *       the AV window's own filling profile (rapid filling, then diastasis), the atrial-kick pieces left out.
 * One venous window per beat, [semilunar opening, end of the AV window's last non-kick piece), carries a cumulative
 * advance A = W_S · S + (1 − W_S) · D, 0 → 1 (normal adults: S somewhat larger than D, S/D > 1). Each AV window pairs
 * with the latest unpaired semilunar window that opened after the previous AV window did; a beat that does not eject
 * (no semilunar window) gets D alone, a semilunar window with no AV window after it S alone. Between windows A = 0
 * (≡ 1 modulo the integer dash advance of the display), so the isovolumic gaps, the atrial contraction (its small
 * reversal Ar is not drawn) and VF / no cycle (no windows) hold the stream: the inflow stops by itself.
 * q (intensity) follows dA/dt, normalised so the textbook beat peaks at Q_REF_PEAK; it is 0 during a cannon a wave
 * (ctx.cannons: atria contracting against shut AV valves push blood back into the veins, not forward).
 */
import { fillProfile, kickSpansIn } from '../../ecg/wiggers';
import type { ValveId } from '../../sim/types';
import { VALVES } from '../../sim/types';
import type { FlowContext, FlowGates, FlowWindow } from './flowTiming';
import { Q_REF_PEAK } from './flowTiming';

/** Share of the beat's venous return carried by the S wave. */
export const VENOUS_S_SHARE = 0.58;

/** Venous state: A per side at VEN_A + side, q per side at VEN_Q + side (side 0 = L: pulmonary veins, 1 = R: cavae). */
export const VENOUS_STATE_LEN = 4;
export const VEN_A = 0;
export const VEN_Q = 2;
export const VENOUS_SIDES = ['L', 'R'] as const;
export type VenousSide = (typeof VENOUS_SIDES)[number];

const SIDE_VALVES: Readonly<Record<VenousSide, { readonly av: ValveId; readonly sl: ValveId }>> = {
  L: { av: 'MITRAL', sl: 'AORTIC' },
  R: { av: 'TRICUSPID', sl: 'PULMONARY' },
};

/** One venous window: S over [s0, s1) (when present) and D over the AV window's non-kick pieces. */
export interface VenousWindow {
  readonly t0: number;
  readonly t1: number;
  /** Semilunar (ejection) span, or null for a beat that does not eject. */
  readonly s: { readonly t0: number; readonly t1: number } | null;
  /** The AV window's non-kick filling pieces with their shares renormalised to sum 1 (empty: no D). */
  readonly d: readonly { readonly kind: 'rapid' | 'diastasis'; readonly t0: number; readonly t1: number; readonly w: number }[];
  /** Share of S in this window (W_S, 1 without D, 0 without S). */
  readonly wS: number;
}

/** Venous windows of one side, sorted by t0 (pure in the context). */
export function venousWindows(ctx: FlowContext, side: VenousSide): VenousWindow[] {
  const { av, sl } = SIDE_VALVES[side];
  const avW = ctx.windows[VALVES.indexOf(av)] ?? [], slW = ctx.windows[VALVES.indexOf(sl)] ?? [];
  const paired = new Set<FlowWindow>();
  const out: VenousWindow[] = [];
  const sOnly = (s: FlowWindow): VenousWindow => ({ t0: s.t0, t1: s.t1, s: { t0: s.t0, t1: s.t1 }, d: [], wS: 1 });
  let prevAv = -Infinity;
  for (const a of avW) {
    const pieces = a.segs.filter((g) => g.kind !== 'kick' && g.w > 0 && g.t1 > g.t0);
    const total = pieces.reduce((x, g) => x + g.w, 0);
    const d = total > 0 ? pieces.map((g) => ({ kind: g.kind as 'rapid' | 'diastasis', t0: g.t0, t1: g.t1, w: g.w / total })) : [];
    // the latest semilunar window opened after the previous AV window and before this one
    let s: FlowWindow | null = null;
    for (const w of slW) if (w.t0 >= prevAv && w.t0 < a.t0 && !paired.has(w)) s = w;
    for (const w of slW) if (w.t0 >= prevAv && w.t0 < a.t0 && !paired.has(w) && w !== s) {
      paired.add(w);
      out.push(sOnly(w));
    }
    prevAv = a.t0;
    if (s) paired.add(s);
    if (!s && !d.length) continue;
    const t1 = d.length ? Math.max(...d.map((g) => g.t1)) : s!.t1;
    out.push({ t0: s ? s.t0 : a.t0, t1, s: s ? { t0: s.t0, t1: s.t1 } : null, d, wS: !d.length ? 1 : s ? VENOUS_S_SHARE : 0 });
  }
  for (const w of slW) if (!paired.has(w) && w.t0 >= prevAv) out.push(sOnly(w));
  return out.sort((x, y) => x.t0 - y.t0);
}

let rateOut = 0;

/** A at t inside window w (0..1); dA/dt (per ms) is left in rateOut. */
function venousAdvance(w: VenousWindow, t: number): number {
  let a = 0, r = 0;
  if (w.s && w.wS > 0) {
    const L = w.s.t1 - w.s.t0, x = Math.min(1, Math.max(0, (t - w.s.t0) / L));
    a += w.wS * x * x * (3 - 2 * x);
    if (t >= w.s.t0 && t < w.s.t1) r += (w.wS * 6 * x * (1 - x)) / L;
  }
  const wD = 1 - w.wS;
  for (const g of w.d) {
    const L = g.t1 - g.t0, x = Math.min(1, Math.max(0, (t - g.t0) / L)), inside = t >= g.t0 && t < g.t1;
    if (g.kind === 'rapid') {
      a += wD * g.w * (1 - (1 - x) * (1 - x));
      if (inside) r += (wD * g.w * 2 * (1 - x)) / L;
    } else {
      a += wD * g.w * x;
      if (inside) r += (wD * g.w) / L;
    }
  }
  rateOut = r;
  return a < 1 ? a : 1;
}

/**
 * Peak dA/dt of the textbook beat (75/min on the normal heart, the timing flowTiming's Q_REF uses): ejection 299 ms,
 * filling window of 373 ms with the kick 233–343 ms after opening.
 */
const VEN_REF_PEAK = (() => {
  const segs = fillProfile(0, 373, kickSpansIn(0, 373, [{ t0: 233, t1: 343 }]), 70);
  const pieces = segs.filter((g) => g.kind !== 'kick' && g.w > 0);
  const total = pieces.reduce((x, g) => x + g.w, 0);
  const w: VenousWindow = {
    t0: -400, t1: 373, s: { t0: -400, t1: -101 }, wS: VENOUS_S_SHARE,
    d: pieces.map((g) => ({ kind: g.kind as 'rapid' | 'diastasis', t0: g.t0, t1: g.t1, w: g.w / total })),
  };
  let mx = 0;
  for (let t = w.t0; t < w.t1; t += 1) {
    venousAdvance(w, t);
    mx = Math.max(mx, rateOut);
  }
  return mx;
})();

/** Per-context cache of the venous windows (recomputed only when the flow context object changes). */
export class VenousCache {
  private ctx: FlowContext | null = null;
  private wins: readonly (readonly VenousWindow[])[] = [[], []];
  get(ctx: FlowContext): readonly (readonly VenousWindow[])[] {
    if (ctx !== this.ctx) {
      this.ctx = ctx;
      this.wins = VENOUS_SIDES.map((s) => venousWindows(ctx, s));
    }
    return this.wins;
  }
}

/**
 * Writes A and q per side (VEN_A / VEN_Q + side index) for time tMs. Allocation-free with precomputed windows
 * (VenousCache); pure in (ctx, windows, tMs, gates). Gated (VF) or a still context: all zero.
 */
export function venousAt(ctx: FlowContext, wins: readonly (readonly VenousWindow[])[], tMs: number, gates: FlowGates, out: Float32Array): void {
  const off = gates.vf || ctx.still;
  let cannon = false;
  if (!off) for (const c of ctx.cannons) if (tMs >= c.t0 && tMs < c.t1) cannon = true;
  for (let i = 0; i < VENOUS_SIDES.length; i++) {
    out[VEN_A + i] = 0;
    out[VEN_Q + i] = 0;
    if (off) continue;
    const ws = wins[i];
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k];
      if (tMs < w.t0 || tMs >= w.t1) continue;
      out[VEN_A + i] = venousAdvance(w, tMs);
      out[VEN_Q + i] = cannon ? 0 : Math.min(1, (Q_REF_PEAK * rateOut) / VEN_REF_PEAK);
      break;
    }
  }
}
