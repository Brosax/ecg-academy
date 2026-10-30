/**
 * Mini Wiggers diagram curves — pure.
 *
 * MECHANICS ARE NOT SIMULATED. These are smooth parametric curves (monotone cubic through knots) whose only inputs are
 * the model's cycle truth (mitral closure, aortic opening/closure, mitral opening, atrial systoles;
 * src/sim/measure/truth.ts) and the beat-to-beat volumes derived from it (src/sim/measure/mechanics.ts, shared with
 * the blood-flow layer): EDV / ESV / SV per beat, atrial contractions classified as a kick (AV valves open) or a
 * cannon a wave (AV valves shut). Reference amplitudes are rounded textbook values: EDV 120 mL / ESV 50 mL (within
 * the ASE/EACVI 2015 male range 106 ± 22 / 41 ± 10 mL, docs/research/lead-geometry-anatomy.md §6a); LV systolic
 * ≈ 120 mmHg, aortic diastolic ≈ 80 mmHg, LA a/c/v waves 5–12 mmHg. The pulse pressure scales with the beat's stroke
 * volume and the aorta runs off exponentially in diastole (two-element Windkessel, τ fitted to 80 mmHg at 75/min),
 * so a long RR (complete heart block) widens the pulse pressure and a small beat (AF after a short RR, an early PVC)
 * barely lifts it — the pulse deficit (docs/research/haemodynamics.md §6). The caption in the UI says so too.
 */
import type { AtrialEvent, BeatVolume } from '../sim/measure/mechanics';
import { atrialEvents, beatVolume, fillShares, fillVolumeMl, historyOf, VOLUME, volumeOf } from '../sim/measure/mechanics';
import type { CycleTruth } from '../sim/types';

export const WIGGERS = {
  edvMl: 120,
  esvMl: 50,
  /** Fraction of the stroke volume refilled by the end of diastasis in the reference beat; the atrial kick supplies the rest. */
  diastasisFrac: 0.8,
  lvSysMmHg: 120,
  aoDiaMmHg: 80,
  /** LV end-diastolic pressure (reference beat); it rises 0.25 mmHg per mL of extra EDV. */
  lvEdpMmHg: 10,
  lvEdpPerMl: 0.25,
  /** LV pressure (and aortic) at aortic closure, and the incisura dip / dicrotic rebound. */
  acMmHg: 96,
  notchMmHg: 91,
  reboundMmHg: 95,
  laBaseMmHg: 6,
  laAPeakMmHg: 11,
  /** Atria contracting against shut AV valves (cannon a wave): schematic peak, about twice the normal a wave. */
  laCannonPeakMmHg: 20,
  laCPeakMmHg: 9,
  laXTroughMmHg: 3.5,
  laVPeakMmHg: 12,
  lvMinMmHg: 3,
  /** Aortic diastolic run-off time constant (ms): 95 → 80 mmHg over the 471 ms from rebound to the next opening at 75/min. */
  aoTauMs: 2738,
  /** A non-ejecting beat's isovolumic LV peak, as a fraction of the aortic pressure it fails to reach. */
  nonEjectingPeakFrac: 0.7,
} as const;

export interface Knot {
  readonly t: number;
  readonly v: number;
}

/** Fritsch–Carlson monotone cubic interpolation (no overshoot between knots, so pressures stay physical). */
export class MonotoneCurve {
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  private readonly ms: Float64Array;

  constructor(knots: readonly Knot[]) {
    const k = [...knots].sort((a, b) => a.t - b.t).filter((p, i, a) => i === 0 || p.t - a[i - 1].t > 1e-6);
    const n = k.length;
    this.xs = Float64Array.from(k, (p) => p.t);
    this.ys = Float64Array.from(k, (p) => p.v);
    this.ms = new Float64Array(n);
    if (n < 2) return;
    const d = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) d[i] = (this.ys[i + 1] - this.ys[i]) / (this.xs[i + 1] - this.xs[i]);
    this.ms[0] = d[0];
    this.ms[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) this.ms[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        this.ms[i] = 0;
        this.ms[i + 1] = 0;
        continue;
      }
      const a = this.ms[i] / d[i], b = this.ms[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        this.ms[i] = tau * a * d[i];
        this.ms[i + 1] = tau * b * d[i];
      }
    }
  }

  at(t: number): number {
    const { xs, ys, ms } = this;
    const n = xs.length;
    if (n === 0) return 0;
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= t) lo = mid;
      else hi = mid;
    }
    const h = xs[hi] - xs[lo], s = (t - xs[lo]) / h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[lo] + (s3 - 2 * s2 + s) * h * ms[lo] + (-2 * s3 + 3 * s2) * ys[hi] + (s3 - s2) * h * ms[hi];
  }
}

export type ValveEventKind = 'MC' | 'AO' | 'AC' | 'MO';

export interface WiggersModel {
  readonly lvp: MonotoneCurve;
  readonly aop: MonotoneCurve;
  readonly lap: MonotoneCurve;
  readonly lvv: MonotoneCurve;
  /** LA pressure wave letters ('a' also marks a cannon a wave; `atrial` says which). */
  readonly marks: readonly { readonly kind: 'a' | 'c' | 'v'; readonly t: number }[];
  /** Left-heart valve events (mitral closure ≈ S1, aortic closure ≈ S2). A non-ejecting beat has no AO / AC. */
  readonly events: readonly { readonly kind: ValveEventKind; readonly t: number }[];
  /** Atrial contractions of the cycles, classified kick / cannon (src/sim/measure/mechanics.ts). */
  readonly atrial: readonly AtrialEvent[];
  /** Volumes of the valved cycles, in time order. */
  readonly beats: readonly BeatVolume[];
}

interface Phases {
  mc: number | null;
  ao: number | null;
  ac: number | null;
  mo: number | null;
  /** Non-ejecting beat: end of its isovolumic contraction (the LV pressure peak, truth.ts). */
  peak: number | null;
}

function phasesOf(c: CycleTruth): Phases {
  const span = (p: string) => c.mech.find((m) => m.phase === p) ?? null;
  const mitral = c.valves.find((v) => v.id === 'MITRAL');
  const aortic = c.valves.find((v) => v.id === 'AORTIC');
  const ao = aortic?.openMs ?? span('ejection')?.t0 ?? null;
  return {
    mc: mitral?.closeMs ?? span('isovolumicContraction')?.t0 ?? null,
    ao,
    ac: aortic?.closeMs ?? span('ejection')?.t1 ?? null,
    mo: mitral?.openMs ?? span('filling')?.t0 ?? null,
    peak: ao === null ? (span('isovolumicContraction')?.t1 ?? null) : null,
  };
}

/** Earliest segment start (as sampler.cycleStart; kept local so this module stays independent of the sampler). */
function startOf(c: CycleTruth): number {
  let s = Infinity;
  for (const x of c.segments) s = Math.min(s, x.t0);
  return Number.isFinite(s) ? s : (c.pOn ?? c.qrsOn ?? 0);
}

const EJECT_EXP = 2.2;

/** Fraction of the stroke volume ejected after a fraction u of ejection: fast early, zero flow at closure. */
export const ejectedFrac = (u: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), EJECT_EXP);
/** d ejectedFrac / du (peak EJECT_EXP at opening, 0 at closure). */
export const ejectedRate = (u: number): number => EJECT_EXP * Math.pow(1 - Math.min(1, Math.max(0, u)), EJECT_EXP - 1);

/**
 * Shares of the reference beat's filling (75/min, kick present): rapid filling carries `rapid` (`rapidNoKick`
 * without an atrial kick, e.g. AF); the atrial kick carries `kick` (= 1 − WIGGERS.diastasisFrac). Beat by beat the
 * shares come from the volume model (fillShares, src/sim/measure/mechanics.ts) and stay close to these at 75/min.
 */
export const FILL_FRACTIONS = { rapid: 0.75, rapidNoKick: 0.95, kick: 0.2 } as const;

/** Duration of rapid filling (ms) after mitral opening `mo`: half the passive filling time, 40–160 ms. */
export const rapidFillMs = (mo: number, fillEnd: number): number => Math.max(40, Math.min(160, 0.5 * (fillEnd - mo)));

/** Atrial kick spans shorter than this after clipping are ignored. */
export const MIN_KICK_MS = 10;
/** A kick ends this long before AV closure. */
export const KICK_CLIP_MS = 2;
/** Passive filling end when no atrial kick precedes the closure: closure − 120 ms (sets the rapid-filling time). */
export const NO_KICK_FILL_END_MS = 120;

export interface FillSegment {
  readonly kind: 'rapid' | 'diastasis' | 'kick';
  readonly t0: number;
  readonly t1: number;
  /** Share of the window volume. */
  readonly w: number;
}

/** Kick spans clipped to (O, C − KICK_CLIP_MS), short ones dropped, overlapping ones merged; time order. */
export function kickSpansIn(O: number, C: number, kicks: readonly { readonly t0: number; readonly t1: number }[]): { t0: number; t1: number }[] {
  const out: { t0: number; t1: number }[] = [];
  for (const k of [...kicks].sort((x, y) => x.t0 - y.t0)) {
    const k0 = Math.max(k.t0, O), k1 = Math.min(k.t1, C - KICK_CLIP_MS);
    if (!(k1 > k0 + MIN_KICK_MS)) continue;
    const last = out[out.length - 1];
    if (last && k0 < last.t1) last.t1 = Math.max(last.t1, k1);
    else out.push({ t0: k0, t1: k1 });
  }
  return out;
}

/**
 * Filling window [O, C) carrying fillMl: rapid filling over rapidFillMs (ending by the first kick, or C − 120 ms
 * without one), slow diastasis over the rest of the window outside the kicks, and the atrial kicks; shares from the
 * volume model (fillShares). Shared by the Wiggers volume curve and the flow layer's AV windows.
 */
export function fillProfile(O: number, C: number, kicks: readonly { readonly t0: number; readonly t1: number }[], fillMl: number): FillSegment[] {
  const fillEnd = kicks.length ? kicks[0].t0 : C - NO_KICK_FILL_END_MS;
  const R = Math.min(rapidFillMs(O, fillEnd), C - O);
  // slivers (the KICK_CLIP_MS left after a kick that runs up to closure) carry nothing: the kick completes the window
  const pieces: { t0: number; t1: number }[] = [];
  let f0 = O + R;
  for (const k of kicks) {
    if (k.t0 - f0 > KICK_CLIP_MS) pieces.push({ t0: f0, t1: k.t0 });
    f0 = Math.max(f0, k.t1);
  }
  if (C - f0 > KICK_CLIP_MS) pieces.push({ t0: f0, t1: C });
  const dMs = pieces.reduce((s, x) => s + x.t1 - x.t0, 0);
  const sh = fillShares(fillMl, dMs, kicks.length > 0);
  // diastasis squeezed out (E and A fused at high rates): its share goes to rapid filling
  const wD = dMs >= 1 ? sh.diastasis : 0;
  const segs: FillSegment[] = [{ kind: 'rapid', t0: O, t1: O + R, w: sh.rapid + sh.diastasis - wD }];
  if (wD > 0) for (const x of pieces) segs.push({ kind: 'diastasis', t0: x.t0, t1: x.t1, w: (wD * (x.t1 - x.t0)) / dMs });
  for (const k of kicks) segs.push({ kind: 'kick', t0: k.t0, t1: k.t1, w: sh.kick / kicks.length });
  return segs.sort((x, y) => x.t0 - y.t0);
}

const clamp01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);

/** Cumulative share of a filling window at t (0 → 1): rapid 1 − (1 − s)², diastasis linear, kicks smoothstep. */
export function fillAdvance(segs: readonly FillSegment[], t: number): number {
  let a = 0;
  for (const g of segs) {
    const x = clamp01((t - g.t0) / (g.t1 - g.t0));
    a += g.w * (g.kind === 'rapid' ? 1 - (1 - x) * (1 - x) : g.kind === 'kick' ? x * x * (3 - 2 * x) : x);
  }
  return Math.min(1, a);
}

/**
 * Builds the curves for consecutive cycles (pass the previous and next cycle around the one on screen so the
 * diastolic segments at both ends are defined). `rrFallbackMs` extrapolates the next mitral closure / aortic opening
 * when unknown. With `cycleAt` the beat volumes come from each beat's own history (mechanics.volumeOf, the same
 * numbers the flow layer uses); without it, from the cycles given.
 */
export function wiggersModel(cycles: readonly CycleTruth[], rrFallbackMs: number, cycleAt?: (tMs: number) => CycleTruth | null): WiggersModel {
  const W = WIGGERS;
  const cs = [...cycles].sort((x, y) => startOf(x) - startOf(y));
  const lvp: Knot[] = [], aop: Knot[] = [], lapV: Knot[] = [], lapA: Knot[] = [], lvv: Knot[] = [];
  const marks: { kind: 'a' | 'c' | 'v'; t: number }[] = [];
  const events: { kind: ValveEventKind; t: number }[] = [];

  // kick / cannon: classify against these cycles and the one before (its relaxation can overlap the first P)
  const before = cycleAt && cs.length ? cycleAt(startOf(cs[0]) - 1) : null;
  const ctx = before && !cs.includes(before) && startOf(before) < startOf(cs[0]) ? [before, ...cs] : cs;
  const own = new Set(cs.flatMap((c) => c.mech.filter((m) => m.phase === 'atrialSystole').map((m) => m.t0)));
  const atrial = atrialEvents(ctx).filter((a) => own.has(a.t0));
  const kicks = atrial.filter((a) => a.kind === 'kick');

  const ph = cs.map(phasesOf);
  const idx = cs.flatMap((c, i) => (ph[i].mc !== null && ph[i].mo !== null && c.qrsOn !== null ? [i] : []));
  const beats: BeatVolume[] = [];
  for (const i of idx) {
    const v = cycleAt ? volumeOf(cycleAt, cs[i]) : beatVolume(cs.slice(0, i + 1));
    if (v) beats.push(v);
  }
  const volOf = (i: number): BeatVolume | undefined => beats.find((b) => b.cycle === cs[i]);
  const edpOf = (edv: number): number => W.lvEdpMmHg + W.lvEdpPerMl * (edv - W.edvMl);

  // aortic run-off anchor (dicrotic rebound of the last ejection); the first opening sits at the reference 80 mmHg
  let runoff: { t: number; v: number } | null = null;
  const aoAt = (t: number): number => (runoff ? runoff.v * Math.exp(-(t - runoff.t) / W.aoTauMs) : W.aoDiaMmHg);
  const runoffKnots = (t1: number): void => {
    if (!runoff || !(t1 > runoff.t + 20)) return;
    for (const f of [0.25, 0.5, 0.75]) {
      const t = runoff.t + f * (t1 - runoff.t);
      aop.push({ t, v: aoAt(t) });
    }
  };

  idx.forEach((i, j) => {
    const p = ph[i], vol = volOf(i);
    if (!vol) return;
    const mc = p.mc!, mo = p.mo!;
    const edv = vol.edvMl, esv = vol.esvMl, sv = vol.svMl;
    const edp = edpOf(edv);
    // the first beat's own atrial kick (A-anchored cycle: its P precedes its QRS) tops the ventricle up to EDV
    if (j === 0 && vol.kick) {
      const k = kickSpansIn(-Infinity, mc, kicks.filter((a) => a.peak < mc)).at(-1);
      if (k) {
        lvv.push({ t: k.t0, v: edv - Math.min(VOLUME.kickMl, edv - esv) }, { t: k.t1, v: edv });
        lvp.push({ t: k.t0, v: W.laBaseMmHg - 1 }, { t: k.t1, v: edp });
      }
    }
    // isovolumic contraction: volume constant, pressure rises; c wave in the LA
    const ivcEnd = p.ao ?? p.peak ?? mc + 35;
    lvv.push({ t: mc, v: edv });
    lvp.push({ t: mc, v: edp + 1 });
    const cPk = mc + 0.5 * (ivcEnd - mc);
    lapV.push({ t: mc, v: W.laBaseMmHg + 1.5 }, { t: cPk, v: W.laCPeakMmHg });
    marks.push({ kind: 'c', t: cPk });
    events.push({ kind: 'MC', t: mc });
    if (p.ao !== null && p.ac !== null && vol.ejecting) {
      // ejection: LV ≈ aorta, peak in the first third; pulse pressure ∝ stroke volume; x′ descent then v-wave rise
      runoffKnots(p.ao);
      const aoDia = aoAt(p.ao);
      const pp = ((W.lvSysMmHg - W.aoDiaMmHg) * sv) / VOLUME.svRefMl, k = pp / (W.lvSysMmHg - W.aoDiaMmHg);
      const sys = aoDia + pp, acP = aoDia + 0.4 * pp;
      const E = p.ac - p.ao, u1 = 0.33, u2 = 0.66;
      lvv.push({ t: p.ao, v: edv }, { t: p.ao + u1 * E, v: edv - ejectedFrac(u1) * sv }, { t: p.ao + u2 * E, v: edv - ejectedFrac(u2) * sv }, { t: p.ac, v: esv });
      lvp.push({ t: p.ao, v: aoDia }, { t: p.ao + u1 * E, v: sys }, { t: p.ao + u2 * E, v: sys - 8 * k }, { t: p.ac, v: acP });
      aop.push(
        { t: p.ao, v: aoDia },
        { t: p.ao + u1 * E, v: sys - 3 * k },
        { t: p.ao + u2 * E, v: sys - 10 * k },
        { t: p.ac, v: acP },
        { t: p.ac + 12, v: acP - 5 * k },
        { t: p.ac + 30, v: acP - k },
      );
      runoff = { t: p.ac + 30, v: acP - k };
      lapV.push({ t: p.ao + 0.35 * E, v: W.laXTroughMmHg }, { t: p.ac, v: W.laVPeakMmHg - 2 });
      events.push({ kind: 'AO', t: p.ao }, { kind: 'AC', t: p.ac });
    } else {
      // no filling since the last beat: LV pressure peaks below the aortic pressure and falls; the aorta keeps running off
      const pk = p.peak ?? ivcEnd;
      lvp.push({ t: pk, v: W.nonEjectingPeakFrac * aoAt(pk) });
      lapV.push({ t: pk + 0.5 * (mo - pk), v: W.laXTroughMmHg + 1 });
    }
    // isovolumic relaxation: volume constant, LV pressure falls below the LA (v-wave peak) → mitral opening
    lvv.push({ t: mo, v: esv });
    lvp.push({ t: mo, v: W.laVPeakMmHg - 1 });
    lapV.push({ t: mo, v: W.laVPeakMmHg });
    marks.push({ kind: 'v', t: mo });
    events.push({ kind: 'MO', t: mo });
    // filling up to the next beat's mitral closure: rapid filling (y descent, LV suction minimum), diastasis, kicks
    const ni = idx[j + 1];
    const nextMc = ni !== undefined ? ph[ni].mc! : mc + rrFallbackMs;
    const spans = kickSpansIn(mo, nextMc, kicks);
    const nVol = ni !== undefined ? volOf(ni) : undefined;
    const edvNext = nVol ? nVol.edvMl : esv + fillVolumeMl(nextMc - mo, spans.length > 0);
    const dv = Math.max(0, edvNext - esv);
    if (nextMc - mo >= 2) {
      const segs = fillProfile(mo, nextMc, spans, dv);
      const R = segs[0].t1 - mo;
      lvp.push({ t: mo + 0.4 * R, v: W.lvMinMmHg }, { t: mo + R, v: W.lvMinMmHg + 1.5 });
      lapV.push({ t: mo + R, v: W.laBaseMmHg - 0.5 });
      const ts = [...new Set(segs.flatMap((g) => [g.t1]).concat([nextMc]))].filter((t) => t > mo && t <= nextMc).sort((x, y) => x - y);
      for (const t of ts) lvv.push({ t, v: esv + fillAdvance(segs, t) * dv });
      const edpN = edpOf(edvNext);
      spans.forEach((s, n) => {
        const last = n === spans.length - 1 && nextMc - s.t1 < 60;
        lvp.push({ t: s.t0, v: W.laBaseMmHg - 1 }, { t: s.t1, v: last ? edpN : W.laBaseMmHg });
      });
    }
    // aortic diastolic run-off towards the next opening (extrapolated one RR ahead after the last beat)
    if (ni === undefined) {
      const t1 = (p.ao ?? mc) + rrFallbackMs;
      runoffKnots(t1);
      if (runoff) aop.push({ t: t1, v: aoAt(t1) });
    }
  });

  // LA a waves: a kick is the normal a wave; a cannon a wave (AV valves shut) is about twice as tall. The ventricular
  // cycle's own LA knots inside a contraction give way to it.
  for (const a of atrial) {
    const cannon = a.kind === 'cannon';
    lapA.push(
      { t: a.t0, v: cannon ? W.laBaseMmHg + 1 : W.laBaseMmHg },
      { t: a.peak, v: cannon ? W.laCannonPeakMmHg : W.laAPeakMmHg },
      { t: a.t1, v: W.laBaseMmHg + 1.5 },
    );
    marks.push({ kind: 'a', t: a.peak });
  }
  const lap = [...lapV.filter((k) => !atrial.some((a) => k.t > a.t0 - 2 && k.t < a.t1 + 2)), ...lapA];

  return {
    lvp: new MonotoneCurve(lvp),
    aop: new MonotoneCurve(aop),
    lap: new MonotoneCurve(lap),
    lvv: new MonotoneCurve(lvv),
    marks: marks.sort((x, y) => x.t - y.t),
    events: events.sort((x, y) => x.t - y.t),
    atrial,
    beats,
  };
}
