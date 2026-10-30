/**
 * Schematic blood-flow timing (血流示意) — pure. Flow is a function of sim time t only, timed from engine.cycleAt
 * (CycleTruth valve events and mech spans): the same truth that drives the valve leaflets (valveMotion.ts), the Wiggers
 * panel (src/ecg/wiggers.ts) and the NowStrip. No fluid mechanics, no per-disease code; nothing is written back.
 *
 * Per valve (VALVES order) a window [t0, t1) carries a cumulative advance A: 0 → 1 and an intensity q in 0..1:
 *   - semilunar: [openMs, closeMs) of one ejecting cycle (cut at the next opening if RR is that short), A =
 *     ejectedFrac(u); a non-ejecting beat (no filling, truth.ts) has no semilunar events and so no window;
 *   - AV: [opening of one valved cycle, closure of the next valved cycle) — tiles across cycle boundaries and dropped
 *     beats — with the Wiggers filling profile (wiggers.fillProfile): rapid filling over rapidFillMs, slow diastasis,
 *     a smoothstep kick per atrial contraction that lands while the valve is open (mechanics.atrialEvents; a cannon a
 *     wave against shut valves fills nothing), shares from the beat-to-beat volume model;
 *   - q = openness · dA/dt · window volume / reference peak flow: the volume is the beat's stroke volume (semilunar) or
 *     the next beat's filling, EDV(next) − ESV (AV), from src/sim/measure/mechanics.ts — the numbers the Wiggers panel
 *     shows. The reference beat (75/min, SV 70 mL) peaks at Q_REF_PEAK; bigger beats (complete heart block, post-PVC)
 *     up to 1, small ones (AF after a short RR) lower.
 * The Wiggers panel passes through the same knots (exact there) but its monotone cubic has zero slope at aortic and
 * mitral opening, where these shapes are fastest: in between the two differ by up to ≈ 0.11 (ejection) and ≈ 0.23
 * (rapid filling) of the stroke volume — a documented deviation from plan §8 (tests/view3d/flowTiming.test.ts).
 * Outside its windows a valve's A is 0 (≡ 1 modulo the integer dash advance of the display) and q = 0. The VF gate
 * (vfFrameOf > 0) or a null cycle hold everything still at A = 0 (stateless, so the dashes shift once at the gate's onset
 * and end); valveOpenness(id, undefined) rests AV-open and is never used.
 *
 * Usage per frame: ctx = cache.get(engine, t, rr) (recomputed only when the cycle identity changes), then
 * flowAt(ctx, t, gates, out) — allocation-free — and flowCaption(ctx, t, gates).
 */
import { cycleEnd, cycleStart } from '../../ecg/sampler';
import type { FillSegment } from '../../ecg/wiggers';
import { ejectedFrac, ejectedRate, fillProfile, kickSpansIn } from '../../ecg/wiggers';
import type { BeatVolume } from '../../sim/measure/mechanics';
import { atrialEvents, beatVolume, fillVolumeMl, MIN_FILL_MS, VOLUME, volumeOf } from '../../sim/measure/mechanics';
import type { CycleTruth, SimEngine, ValveEvents, ValveId } from '../../sim/types';
import { VALVES } from '../../sim/types';
import type { FlowCaptionId } from './flowTypes';
import { FLOW_A, FLOW_Q } from './flowTypes';
import { isSemilunar, valveOpenness } from './valveMotion';

export { leafletOpenness } from './valveMotion';

/** Dropped (valve-less) cycles skipped on each side when looking for the neighbouring valved cycles. */
export const FLOW_MAX_SKIP = 2;
/** Probe step / horizon (ms) for the next cycle: shorter than any cycle, longer than the slowest escape RR. */
const PROBE_STEP_MS = 50;
const PROBE_HORIZON_MS = 4000;
/** Sampling step (ms) for the peak-flow measurement of the reference windows. */
const Q_SAMPLE_MS = 1;
/** q of the reference beat's peak flow (headroom for bigger beats). */
export const Q_REF_PEAK = 0.8;
/** A cannon a wave is captioned for at least this long (its contraction lasts ≈ 110 ms: one chip tick would flash). */
const MIN_CANNON_CAPTION_MS = 250;

export interface FlowGates {
  /** Ventricular scroll-wave field drives the ventricles (VF, torsades run): no effective output. */
  readonly vf: boolean;
  /** AF field drives the atria: no atrial kick (caption only). */
  readonly af: boolean;
}

/** Cycles around t. prev / next are the nearest cycles WITH valve events (dropped beats skipped, up to FLOW_MAX_SKIP). */
export interface FlowCycles {
  readonly prev: CycleTruth | null;
  /** engine.cycleAt(t); null in VF, during a torsades run, before the first beat. */
  readonly cur: CycleTruth | null;
  readonly next: CycleTruth | null;
  /** Valve-less (dropped) cycles between prev and next other than cur; their atrial kicks fill the AV windows. */
  readonly dropped?: readonly CycleTruth[];
  /**
   * Beat volumes of the valved cycles from their own history (mechanics.volumeOf; flowNeighbours fills it). Without
   * it the volumes come from these cycles alone.
   */
  readonly volumes?: ReadonlyMap<CycleTruth, BeatVolume>;
}

export interface FlowNeighbours extends FlowCycles {
  readonly dropped: readonly CycleTruth[];
  /** cur is engine.cycleAt(t) for t in [t0, t1) (t1 is exact when the next cycle exists; t0 = t1 when cur is null). */
  readonly t0: number;
  readonly t1: number;
  /** Cycle identity (prev.vId, cur.aId, cur.vId, next.vId): the context is recomputed only when it changes. */
  readonly key: string;
}

export interface FlowKick {
  readonly t0: number;
  readonly t1: number;
  /** Share of the window volume. */
  readonly w: number;
}

/** One valve-open interval with its advance profile. */
export interface FlowWindow {
  readonly valve: ValveId;
  readonly t0: number;
  readonly t1: number;
  /** Events whose openMs = t0 (the opening ramp of valveOpenness); synthetic when t0 is an rr fallback. */
  readonly ev: ValveEvents;
  /** AV only: the filling profile (rapid filling, diastasis pieces, kicks), shares of volMl. */
  readonly segs: readonly FillSegment[];
  /** AV only: rapid filling [t0, t0 + rapidMs); the kick spans with their shares. */
  readonly rapidMs: number;
  readonly kicks: readonly FlowKick[];
  /** Volume through the valve in this window (mL): the beat's stroke volume, or the next beat's filling. */
  readonly volMl: number;
  /** A reaches exactly 1 here (≤ t1). */
  readonly tDone: number;
  /** q per unit of openness · dA/dt: volMl / the reference peak flow of this valve type. */
  readonly qGain: number;
}

export type FlowPhaseId = 'ivc' | 'ejection' | 'ivr';

export interface FlowEmptyFill {
  readonly valve: ValveId;
  readonly openMs: number;
  readonly closeMs: number;
}

export interface FlowContext {
  readonly key: string;
  /** No cycle at t: everything still. */
  readonly still: boolean;
  /** The cycle at t is a non-conducted (dropped) beat: no valve events. */
  readonly dropped: boolean;
  /** Windows per valve, VALVES order, sorted by t0. */
  readonly windows: readonly (readonly FlowWindow[])[];
  /**
   * Left-heart isovolumic / ejection spans of the valved cycles in cycle order (caption). At short RR the fixed
   * isovolumic times make the previous beat's relaxation overlap the next beat's contraction: the newest cycle wins.
   */
  readonly phases: readonly { readonly id: FlowPhaseId; readonly t0: number; readonly t1: number }[];
  /**
   * AV windows that came out empty (the next beat's closure before this beat's opening): no filling, so that beat
   * does not eject (truth.ts) — the extreme pulse deficit (AF after a long–short RR, an early PVC). Audit.
   */
  readonly emptyFills: readonly FlowEmptyFill[];
  /** Atrial contractions against shut AV valves (cannon a waves) in these cycles. */
  readonly cannons: readonly { readonly t0: number; readonly t1: number }[];
}

const valved = (c: CycleTruth): boolean => c.valves.length > 0;
const evOf = (c: CycleTruth, id: ValveId): ValveEvents | undefined => c.valves.find((v) => v.id === id);
const clamp01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);

const EMPTY_WINDOWS: readonly (readonly FlowWindow[])[] = VALVES.map(() => []);

/** The context for "no cycle": all valves still. */
export const FLOW_STILL: FlowContext = { key: 'still', still: true, dropped: false, windows: EMPTY_WINDOWS, phases: [], emptyFills: [], cannons: [] };

/** Identity of a neighbourhood (prev.vId, cur.aId, cur.vId, next.vId). */
export const flowKey = (nb: FlowCycles): string =>
  nb.cur ? `${nb.prev?.vId ?? '-'}|${nb.cur.aId ?? '-'}|${nb.cur.vId ?? '-'}|${nb.next?.vId ?? '-'}` : 'still';

/** Bisects the null ↔ non-null switch of cycleAt between `a` and `b` (opposite states): the first time (< 1e-6 ms off)
 * that is in b's state, i.e. the null onset after a valid a, or the first valid time after a null a. */
function edgeOf(engine: Pick<SimEngine, 'cycleAt'>, a: number, b: number): number {
  const aOn = engine.cycleAt(a) !== null;
  let lo = a, hi = b;
  while (Math.abs(hi - lo) > 1e-6) {
    const mid = 0.5 * (lo + hi);
    if ((engine.cycleAt(mid) !== null) === aOn) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * First cycle starting after c, probed forward from `from` (cycleAt(from) is c) in steps shorter than any cycle.
 * Null when cycleAt turns null first (VF, torsades run): `t` is then that onset (< 1e-6 ms), else the probe time.
 */
function probeNext(engine: Pick<SimEngine, 'cycleAt'>, c: CycleTruth, from: number): { readonly c: CycleTruth | null; readonly t: number } {
  const s = cycleStart(c);
  let known = from;
  for (let t = from + PROBE_STEP_MS, end = Math.max(cycleEnd(c), from) + PROBE_HORIZON_MS; t <= end; t += PROBE_STEP_MS) {
    const n = engine.cycleAt(t);
    if (!n) return { c: null, t: edgeOf(engine, known, t) };
    if (cycleStart(n) > s) return { c: n, t };
    known = t;
  }
  return { c: null, t: known };
}

/**
 * prev / cur / next around tMs from engine.cycleAt, skipping up to FLOW_MAX_SKIP dropped (valve-less) cycles on each
 * side, plus the exact range [t0, t1) over which cur is the cycle (cut short by a null stretch: VF, torsades run).
 * Costs a few dozen cycleAt calls: call it when t leaves [t0, t1) (FlowContextCache does), not per frame.
 */
export function flowNeighbours(engine: Pick<SimEngine, 'cycleAt'>, tMs: number): FlowNeighbours {
  const cur = engine.cycleAt(tMs);
  if (!cur) return { prev: null, cur: null, next: null, dropped: [], t0: tMs, t1: tMs, key: 'still' };
  const s0 = cycleStart(cur);
  // back to cur's start unless cycleAt is null on the way (a torsades run ended inside this cycle)
  let t0 = s0;
  for (let known = tMs, t = tMs - PROBE_STEP_MS; known > s0; t -= PROBE_STEP_MS) {
    const tt = Math.max(t, s0);
    if (!engine.cycleAt(tt)) {
      t0 = edgeOf(engine, tt, known);
      break;
    }
    known = tt;
  }
  const before: CycleTruth[] = [], after: CycleTruth[] = [];
  let prev: CycleTruth | null = null;
  for (let s = s0, i = 0; i <= FLOW_MAX_SKIP; i++) {
    const c = engine.cycleAt(s - 1);
    if (!c || cycleStart(c) >= s) break;
    if (valved(c)) {
      prev = c;
      break;
    }
    before.unshift(c);
    s = cycleStart(c);
  }
  let next: CycleTruth | null = null;
  let t1 = Infinity;
  for (let last = cur, from = tMs, i = 0; i <= FLOW_MAX_SKIP; i++) {
    const p = probeNext(engine, last, from);
    if (i === 0) t1 = p.c ? cycleStart(p.c) : p.t;
    if (!p.c) break;
    if (valved(p.c)) {
      next = p.c;
      break;
    }
    after.push(p.c);
    last = p.c;
    from = p.t;
  }
  const ca = (t: number): CycleTruth | null => engine.cycleAt(t);
  const volumes = new Map<CycleTruth, BeatVolume>();
  for (const c of [prev, cur, next]) {
    const v = c ? volumeOf(ca, c) : null;
    if (c && v) volumes.set(c, v);
  }
  const nb = { prev, cur, next, dropped: [...before, ...after], volumes };
  return { ...nb, t0, t1, key: flowKey(nb) };
}

// ---------------------------------------------------------------- window profiles

let rateOut = 0;

/** A at t inside window w; the instantaneous dA/dt (per ms) is left in rateOut. */
function advanceAt(w: FlowWindow, t: number): number {
  if (t >= w.tDone) {
    rateOut = 0;
    return 1;
  }
  const dur = w.t1 - w.t0;
  if (isSemilunar(w.valve)) {
    const u = (t - w.t0) / dur;
    rateOut = ejectedRate(u) / dur;
    return ejectedFrac(u);
  }
  // as wiggers.fillAdvance, plus the rate: rapid 1 − (1 − s)², diastasis linear, kicks smoothstep
  let a = 0, r = 0;
  const gs = w.segs;
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i], L = g.t1 - g.t0, x = clamp01((t - g.t0) / L), inside = t >= g.t0 && t < g.t1;
    if (g.kind === 'rapid') {
      a += g.w * (1 - (1 - x) * (1 - x));
      if (inside) r += (g.w * 2 * (1 - x)) / L;
    } else if (g.kind === 'kick') {
      a += g.w * x * x * (3 - 2 * x);
      r += (g.w * 6 * x * (1 - x)) / L;
    } else {
      a += g.w * x;
      if (inside) r += g.w / L;
    }
  }
  rateOut = r;
  return a < 1 ? a : 1;
}

/** Max over the window of openness · dA/dt (sampled). */
function peakRateOf(w: FlowWindow): number {
  let mx = 0;
  for (let t = w.t0; t < w.t1; t += Q_SAMPLE_MS) {
    advanceAt(w, t);
    mx = Math.max(mx, valveOpenness(w.valve, w.ev, t) * rateOut);
  }
  return mx;
}

/** Ejection window [openMs, closeMs) carrying volMl, cut at `endMs` when the next beat's ejection starts earlier. */
function semilunarRaw(id: ValveId, ev: ValveEvents, endMs: number, volMl: number): FlowWindow | null {
  const t1 = Math.min(ev.closeMs, endMs);
  if (!(t1 > ev.openMs)) return null;
  return { valve: id, t0: ev.openMs, t1, ev, segs: [], rapidMs: 0, kicks: [], volMl, tDone: t1, qGain: 0 };
}

/** AV filling window [O, C) carrying volMl with the Wiggers profile; kick spans are clipped to (O, C − 2). */
function avRaw(id: ValveId, O: number, C: number, ev: ValveEvents, kicks: readonly { t0: number; t1: number }[], volMl: number): FlowWindow {
  const segs = fillProfile(O, C, kickSpansIn(O, C, kicks), volMl);
  let tDone = O;
  for (const g of segs) if (g.w > 0) tDone = Math.max(tDone, g.t1);
  const ks = segs.filter((g) => g.kind === 'kick').map((g) => ({ t0: g.t0, t1: g.t1, w: g.w }));
  return { valve: id, t0: O, t1: C, ev, segs, rapidMs: segs[0].t1 - O, kicks: ks, volMl, tDone: Math.min(tDone, C), qGain: 0 };
}

/**
 * Reference peak flows (mL/ms) of the textbook beat on the normal heart at 75/min (tests/view3d/flowScenarios.test.ts
 * prints its timing): ejection 299 ms (aortic opening at QRS + 65, closure at QRS + 364) carrying 70 mL; filling over
 * 373 ms (mitral opening at QRS + 457 to the next closure) with the kick 233–343 ms after opening, carrying 70 mL.
 * That beat's q peaks at Q_REF_PEAK.
 */
const Q_REF = (() => {
  const s = semilunarRaw('AORTIC', { id: 'AORTIC', openMs: 0, closeMs: 299 }, Infinity, VOLUME.svRefMl)!;
  const av = avRaw('MITRAL', 0, 373, { id: 'MITRAL', openMs: 0, closeMs: -1 }, [{ t0: 233, t1: 343 }], VOLUME.svRefMl);
  return { semilunar: (peakRateOf(s) * s.volMl) / Q_REF_PEAK, av: (peakRateOf(av) * av.volMl) / Q_REF_PEAK };
})();

const withGain = (w: FlowWindow): FlowWindow => ({ ...w, qGain: w.volMl / (isSemilunar(w.valve) ? Q_REF.semilunar : Q_REF.av) });

function semilunarWindow(id: ValveId, ev: ValveEvents, endMs: number, volMl: number): FlowWindow | null {
  const w = semilunarRaw(id, ev, endMs, volMl);
  return w && withGain(w);
}

function avWindow(id: ValveId, O: number, C: number, ev: ValveEvents, kicks: readonly { t0: number; t1: number }[], volMl: number): FlowWindow {
  return withGain(avRaw(id, O, C, ev, kicks, volMl));
}

/**
 * Immutable flow context for one cycle neighbourhood (pure; compute once per identity, see FlowContextCache).
 * `rrFallbackMs` extrapolates an AV opening / closure when the neighbouring valved cycle is unknown.
 */
export function resolveFlowWindows(nb: FlowCycles, rrFallbackMs: number): FlowContext {
  const cur = nb.cur;
  if (!cur) return FLOW_STILL;
  const all = [nb.prev, ...(nb.dropped ?? []), cur, nb.next]
    .filter((c): c is CycleTruth => c !== null)
    .sort((x, y) => cycleStart(x) - cycleStart(y));
  // atrial contractions: kicks fill the AV windows, cannon a waves (AV valves shut) only get the caption
  const atrial = atrialEvents(all);
  const kicks = atrial.filter((a) => a.kind === 'kick');
  const cannons = atrial.filter((a) => a.kind === 'cannon').map((a) => ({ t0: a.t0, t1: a.t1 }));
  const vIdx = all.flatMap((c, i) => (valved(c) ? [i] : []));
  const emptyFills: FlowEmptyFill[] = [];
  const vols = new Map<number, BeatVolume | null>();
  const volOf = (i: number): BeatVolume | null => {
    if (!vols.has(i)) vols.set(i, nb.volumes?.get(all[i]) ?? beatVolume(all.slice(0, i + 1)));
    return vols.get(i)!;
  };
  /** Volume through an AV window from valved cycle a's opening to valved cycle b's closure (null: extrapolated). */
  const fillOf = (a: number | null, b: number | null, O: number, C: number): number => {
    const va = a === null ? null : volOf(a), vb = b === null ? null : volOf(b);
    if (va && vb) return Math.max(0, vb.edvMl - va.esvMl);
    return vb ? vb.fillMl : fillVolumeMl(C - O, kickSpansIn(O, C, kicks).length > 0);
  };

  const windows = VALVES.map((id): FlowWindow[] => {
    const out: FlowWindow[] = [];
    if (isSemilunar(id)) {
      for (let j = 0; j < vIdx.length; j++) {
        const ev = evOf(all[vIdx[j]], id), nx = j + 1 < vIdx.length ? evOf(all[vIdx[j + 1]], id) : undefined;
        const w = ev ? semilunarWindow(id, ev, nx ? nx.openMs : Infinity, volOf(vIdx[j])?.svMl ?? VOLUME.svRefMl) : null;
        if (w) out.push(w);
      }
      return out;
    }
    const push = (O: number, C: number, ev: ValveEvents, a: number | null, b: number | null): void => {
      // no filling is a property of the beat: when the mitral window between these cycles is empty, the tricuspid one
      // (8 ms wider on each side) is empty too
      const mo = a === null ? null : evOf(all[a], 'MITRAL'), mc = b === null ? null : evOf(all[b], 'MITRAL');
      const leftEmpty = !!mo && !!mc && mc.closeMs - mo.openMs < MIN_FILL_MS;
      if (C - O < MIN_FILL_MS || leftEmpty) emptyFills.push({ valve: id, openMs: O, closeMs: C });
      else out.push(avWindow(id, O, C, ev, kicks, fillOf(a, b, O, C)));
    };
    if (vIdx.length === 0) return out;
    const first = evOf(all[vIdx[0]], id), last = evOf(all[vIdx[vIdx.length - 1]], id);
    // before the first known valved cycle: opening extrapolated (1 + dropped cycles before it) RRs back
    if (!nb.prev && first) {
      const O = first.openMs - rrFallbackMs * (1 + vIdx[0]);
      push(O, first.closeMs, { id, openMs: O, closeMs: O }, null, vIdx[0]);
    }
    for (let j = 0; j + 1 < vIdx.length; j++) {
      const a = evOf(all[vIdx[j]], id), b = evOf(all[vIdx[j + 1]], id);
      if (a && b) push(a.openMs, b.closeMs, a, vIdx[j], vIdx[j + 1]);
    }
    // after the last known valved cycle: closure extrapolated (1 + dropped cycles after it) RRs ahead
    if (!nb.next && last) push(last.openMs, last.closeMs + rrFallbackMs * (all.length - vIdx[vIdx.length - 1]), last, vIdx[vIdx.length - 1], null);
    return out;
  });

  const phases: { id: FlowPhaseId; t0: number; t1: number }[] = [];
  for (const i of vIdx) {
    for (const m of all[i].mech) {
      const id = m.phase === 'isovolumicContraction' ? 'ivc' : m.phase === 'ejection' ? 'ejection' : m.phase === 'isovolumicRelaxation' ? 'ivr' : null;
      if (id && m.t1 > m.t0) phases.push({ id, t0: m.t0, t1: m.t1 });
    }
  }
  return { key: flowKey(nb), still: false, dropped: !valved(cur), windows, phases, emptyFills, cannons };
}

// ---------------------------------------------------------------- per frame

function windowAt(ws: readonly FlowWindow[], t: number): FlowWindow | null {
  for (let i = 0; i < ws.length; i++) if (t >= ws[i].t0 && t < ws[i].t1) return ws[i];
  return null;
}

/**
 * Writes A[4] at FLOW_A and q[4] at FLOW_Q (VALVES order) for time tMs. Allocation-free; pure in (ctx, tMs, gates).
 * Gated (VF / torsades run) or a still context: all A = 0, all q = 0.
 */
export function flowAt(ctx: FlowContext, tMs: number, gates: FlowGates, out: Float32Array): void {
  const off = gates.vf || ctx.still;
  for (let i = 0; i < VALVES.length; i++) {
    const w = off ? null : windowAt(ctx.windows[i], tMs);
    if (!w) {
      out[FLOW_A + i] = 0;
      out[FLOW_Q + i] = 0;
      continue;
    }
    out[FLOW_A + i] = advanceAt(w, tMs);
    out[FLOW_Q + i] = Math.min(1, valveOpenness(w.valve, w.ev, tMs) * rateOut * w.qGain);
  }
}

const MITRAL_IDX = VALVES.indexOf('MITRAL');
/**
 * Diastasis gaps shorter than this are captioned as the state before them (rapid filling up to the kick, the kick up
 * to valve closure): at 75/min the kick ends ≈ 30 ms before mitral closure, which would flash 'diastasis' for one
 * 100 ms chip tick per beat (stable-UI rule: no flicker in fast-changing text).
 */
const MIN_CAPTION_GAP_MS = 60;

/** Caption id for the "blood now" chip at tMs. Pure. */
export function flowCaption(ctx: FlowContext, tMs: number, gates: FlowGates): FlowCaptionId {
  if (gates.vf) return 'noOutput';
  if (ctx.still) return 'idle';
  // atria contracting against shut AV valves: shown over the ventricular phase it interrupts, swallowing a sliver of
  // that phase shorter than MIN_CAPTION_GAP_MS on either side (flutter: ≈ 50 ms of ejection before each cannon)
  for (const k of ctx.cannons) {
    let c0 = k.t0, c1 = Math.max(k.t1, k.t0 + MIN_CANNON_CAPTION_MS);
    for (const p of ctx.phases) {
      if (k.t0 >= p.t0 && k.t0 < p.t1 && k.t0 - p.t0 < MIN_CAPTION_GAP_MS) c0 = Math.min(c0, p.t0);
      if (c1 > p.t0 && c1 < p.t1 && p.t1 - c1 < MIN_CAPTION_GAP_MS) c1 = p.t1;
    }
    if (tMs >= c0 && tMs < c1) return 'cannon';
  }
  // newest cycle first (as in the NowStrip): at high rates the previous IVR overlaps this beat's IVC / ejection
  for (let i = ctx.phases.length - 1; i >= 0; i--) {
    const p = ctx.phases[i];
    if (tMs >= p.t0 && tMs < p.t1) return p.id;
  }
  if (ctx.dropped) return 'dropped';
  const w = windowAt(ctx.windows[MITRAL_IDX], tMs);
  if (!w) return 'idle';
  // rapid filling first: at high rates the kick starts during it (E/A fusion) but the passive surge carries the volume
  const rapidEnd = w.t0 + w.rapidMs;
  if (tMs < rapidEnd) return 'rapidFill';
  let prevEnd = rapidEnd, prevId: FlowCaptionId = 'rapidFill';
  for (const k of w.kicks) {
    if (tMs < k.t0) return k.t0 - prevEnd < MIN_CAPTION_GAP_MS ? prevId : gates.af ? 'noKickAf' : 'diastasis';
    if (tMs < k.t1) return 'kick';
    prevEnd = k.t1;
    prevId = 'kick';
  }
  if (prevId === 'kick' && w.t1 - prevEnd < MIN_CAPTION_GAP_MS) return 'kick';
  return gates.af ? 'noKickAf' : 'diastasis';
}

/**
 * Per-scene cache: re-resolves the neighbourhood only when t leaves the current cycle's [t0, t1), and the context only
 * when its identity, the engine or rrFallbackMs changes. Call invalidate() on a scenario / engine change.
 */
export class FlowContextCache {
  private ctx: FlowContext = FLOW_STILL;
  private engine: object | null = null;
  private rr = NaN;
  private t0 = 1;
  private t1 = 0;

  get(engine: Pick<SimEngine, 'cycleAt'>, tMs: number, rrFallbackMs: number): FlowContext {
    const same = engine === this.engine && rrFallbackMs === this.rr;
    if (same && tMs >= this.t0 && tMs < this.t1) return this.ctx;
    this.engine = engine;
    this.rr = rrFallbackMs;
    // no cycle (VF, torsades run, before the first beat): re-query next frame, nothing allocated here
    if (!engine.cycleAt(tMs)) {
      this.ctx = FLOW_STILL;
      this.t0 = this.t1 = tMs;
      return FLOW_STILL;
    }
    const nb = flowNeighbours(engine, tMs);
    if (!same || nb.key !== this.ctx.key) this.ctx = resolveFlowWindows(nb, rrFallbackMs);
    this.t0 = nb.t0;
    this.t1 = nb.t1;
    return this.ctx;
  }

  invalidate(): void {
    this.engine = null;
    this.ctx = FLOW_STILL;
  }
}
