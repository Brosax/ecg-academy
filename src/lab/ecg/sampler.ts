/**
 * Shared ECG sampler. Twelve panels plus the rhythm strip, the detail view and the vector diagrams all read the same
 * engine; this hub caches engine.sampleLeads / sampleH in ring buffers on the engine's sample grid (1 kHz) so the
 * stream is computed once per frame, not once per panel. It also indexes cycle truth and memoizes per-beat analysis
 * (measured intervals, wave labels). Pure TypeScript — no DOM — so it is unit-tested in Node.
 *
 * Validity: the rhythm is append-only and setHeartRate only affects future beats, so cached past samples stay valid.
 * A beat generated after a fill can still reach a little into the past (templates start before their event, e.g.
 * −60 ms for the ventricular template), so every forward extension re-fills a trailing guard. engine.onChange
 * (scenario / pose switch) invalidates everything.
 */
import type { CycleTruth, LeadName, SimEngine } from '../sim/types';
import { LEADS } from '../sim/types';
import { labelLead, measureBeat } from './waveLabels';
import type { MeasuredBeat, WaveLabel } from './waveLabels';

/** Fills `n` samples starting at sample index k0, channel-major: out[ch * n + i]. */
export type FillFn = (k0: number, n: number, out: Float32Array) => void;

export class RingCache {
  readonly data: Float32Array;
  private lo = 0;
  private hi = 0;
  private empty = true;
  private scratch = new Float32Array(0);
  /** Number of samples computed so far (instrumentation for tests). */
  computed = 0;

  constructor(
    readonly channels: number,
    readonly capacity: number,
    private readonly fill: FillFn,
    /** Samples re-filled behind the high-water mark on every forward extension. */
    readonly guard = 250,
  ) {
    this.data = new Float32Array(channels * capacity);
  }

  /** Cached sample-index range [lo, hi), or null when empty. */
  get range(): readonly [number, number] | null {
    return this.empty ? null : [this.lo, this.hi];
  }

  invalidate(): void {
    this.empty = true;
  }

  has(k0: number, k1: number): boolean {
    return !this.empty && k0 >= this.lo && k1 <= this.hi;
  }

  /** Makes [k0, k1) available (clamped to the most recent `capacity` samples of the request). */
  ensure(k0: number, k1: number): void {
    k0 = Math.floor(k0);
    k1 = Math.ceil(k1);
    if (k1 <= k0) return;
    const C = this.capacity;
    if (k1 - k0 > C) k0 = k1 - C;
    if (this.empty || k1 < this.lo || k0 > this.hi) {
      this.compute(k0, k1);
      this.lo = k0;
      this.hi = k1;
      this.empty = false;
      return;
    }
    if (k1 > this.hi) {
      this.compute(Math.max(this.lo, this.hi - this.guard), k1);
      this.hi = k1;
      if (this.hi - this.lo > C) this.lo = this.hi - C;
    }
    if (k0 < this.lo) {
      if (this.hi - k0 > C) {
        this.compute(k0, k1);
        this.lo = k0;
        this.hi = k1;
      } else {
        this.compute(k0, this.lo);
        this.lo = k0;
      }
    }
  }

  private slot(k: number): number {
    const C = this.capacity;
    return ((k % C) + C) % C;
  }

  private compute(k0: number, k1: number): void {
    const n = k1 - k0;
    if (n <= 0) return;
    const need = this.channels * n;
    if (this.scratch.length < need) this.scratch = new Float32Array(need);
    const s = this.scratch.length === need ? this.scratch : this.scratch.subarray(0, need);
    this.fill(k0, n, s);
    this.computed += n;
    const C = this.capacity;
    for (let ch = 0; ch < this.channels; ch++) {
      const base = ch * C, src = ch * n;
      let j = this.slot(k0);
      for (let i = 0; i < n; i++) {
        this.data[base + j] = s[src + i];
        if (++j === C) j = 0;
      }
    }
  }

  /** Value of a cached sample (0 when not cached — callers ensure() first). */
  get(ch: number, k: number): number {
    if (this.empty || k < this.lo || k >= this.hi) return 0;
    return this.data[ch * this.capacity + this.slot(k)];
  }

  /** Copies n cached samples of one channel starting at k0 into out (uncached samples → 0). */
  copy(ch: number, k0: number, n: number, out: Float32Array, outOffset = 0): void {
    const C = this.capacity, base = ch * C;
    for (let i = 0; i < n; i++) {
      const k = k0 + i;
      out[outOffset + i] = this.empty || k < this.lo || k >= this.hi ? 0 : this.data[base + this.slot(k)];
    }
  }
}

// ---------------------------------------------------------------- cycle index

export const cycleStart = (c: CycleTruth): number => {
  let s = Infinity;
  for (const x of c.segments) s = Math.min(s, x.t0);
  return Number.isFinite(s) ? s : (c.pOn ?? c.qrsOn ?? 0);
};
/** End of a cycle = next P onset when known (TP end), else its last segment end. */
export const cycleEnd = (c: CycleTruth): number => {
  let e = -Infinity;
  for (const x of c.segments) e = Math.max(e, x.t1);
  return Number.isFinite(e) ? e : cycleStart(c);
};
export const isClosedCycle = (c: CycleTruth): boolean => c.segments.some((s) => s.seg === 'TP');
export const cycleKey = (c: CycleTruth): string => `${c.aId}|${c.vId}|${Math.round(cycleStart(c) * 10)}`;

/**
 * Caches closed cycles (next P known → immutable until onChange) so ranges can be enumerated without calling
 * engine.cycleAt per lead per frame (the stub's cycleAt is O(events)).
 */
export class CycleIndex {
  private closed: CycleTruth[] = [];
  calls = 0;

  constructor(private readonly cycleAt: (t: number) => CycleTruth | null, private readonly maxKept = 400) {}

  invalidate(): void {
    this.closed = [];
  }

  private find(t: number): CycleTruth | null {
    const a = this.closed;
    let lo = 0, hi = a.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = a[mid];
      if (t < cycleStart(c)) hi = mid - 1;
      else if (t >= cycleEnd(c)) lo = mid + 1;
      else return c;
    }
    return null;
  }

  private insert(c: CycleTruth): void {
    const a = this.closed, s = cycleStart(c);
    let i = a.length;
    while (i > 0 && cycleStart(a[i - 1]) > s) i--;
    if (i > 0 && cycleKey(a[i - 1]) === cycleKey(c)) return;
    a.splice(i, 0, c);
    if (a.length > this.maxKept) a.splice(0, a.length - this.maxKept);
  }

  /** Cycle covering t (engine semantics: the latest cycle whose start ≤ t). */
  at(t: number): CycleTruth | null {
    const hit = this.find(t);
    if (hit) return hit;
    this.calls++;
    const c = this.cycleAt(t);
    if (c && isClosedCycle(c)) this.insert(c);
    return c;
  }

  /** Cycles intersecting [t0, t1], in time order. */
  range(t0: number, t1: number): CycleTruth[] {
    const out: CycleTruth[] = [];
    const seen = new Set<string>();
    let t = t0;
    for (let guard = 0; t <= t1 && guard < 400; guard++) {
      const c = this.at(t);
      if (!c) {
        t += 20;
        continue;
      }
      const k = cycleKey(c);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
      const end = cycleEnd(c);
      t = isClosedCycle(c) && end > t ? end : Math.max(end + 1, t + 50);
    }
    return out;
  }

  /** Cycle immediately before / after c (null when unknown). */
  prev(c: CycleTruth): CycleTruth | null {
    const p = this.at(cycleStart(c) - 1);
    return p && cycleKey(p) !== cycleKey(c) ? p : null;
  }
  next(c: CycleTruth): CycleTruth | null {
    if (!isClosedCycle(c)) return null;
    const n = this.at(cycleEnd(c));
    return n && cycleKey(n) !== cycleKey(c) ? n : null;
  }
}

/**
 * RR interval for a cycle (ms): preceding QRS-to-QRS, else following, else P-to-P. Used for heart rate and QTc.
 */
export function rrOfCycle(c: CycleTruth, prev: CycleTruth | null, next: CycleTruth | null): number | null {
  if (c.qrsOn !== null && prev?.qrsOn != null) return c.qrsOn - prev.qrsOn;
  if (c.qrsOn !== null && next?.qrsOn != null) return next.qrsOn - c.qrsOn;
  const tp = c.segments.find((s) => s.seg === 'TP');
  return tp ? tp.t1 - cycleStart(c) : null;
}

// ---------------------------------------------------------------- per-beat analysis

export interface BeatAnalysis {
  readonly key: string;
  readonly truth: CycleTruth;
  /** Absolute time of sample 0, spacing, count. */
  readonly t0: number;
  readonly dt: number;
  readonly n: number;
  /** Total H (Frank, mV), 3·n interleaved. */
  readonly H: Float32Array;
  /** 12 leads, lead-major (LEADS order). */
  readonly leads: Float32Array;
  readonly measured: MeasuredBeat;
  /** RR (ms) used for rate and QTc; null when unknown. */
  readonly rrMs: number | null;
  labels(lead: LeadName): { labels: readonly WaveLabel[]; baseline: number };
  /** Lead value (nearest sample) at absolute time t. */
  value(lead: LeadName, t: number): number;
}

const LEAD_INDEX: Readonly<Record<LeadName, number>> = Object.fromEntries(LEADS.map((l, i) => [l, i])) as Record<LeadName, number>;
export const leadIndex = (l: LeadName): number => LEAD_INDEX[l];

export function analyseBeat(engine: SimEngine, truth: CycleTruth, rrMs: number | null): BeatAnalysis {
  const dt = 1000 / engine.fsHz;
  const s = cycleStart(truth);
  const e = Math.max(cycleEnd(truth), (truth.tEnd ?? cycleEnd(truth)) + 150);
  const k0 = Math.floor((s - 100) / dt), k1 = Math.ceil((e + 20) / dt);
  const n = Math.max(2, k1 - k0);
  const t0 = k0 * dt;
  const hA = new Float32Array(3 * n), hV = new Float32Array(3 * n);
  engine.sampleH(t0, n, hA, hV);
  const H = new Float32Array(3 * n);
  for (let i = 0; i < 3 * n; i++) H[i] = hA[i] + hV[i];
  const leads = new Float32Array(12 * n);
  engine.sampleLeads(t0, n, leads);
  const measured = measureBeat({ t0, dt, n, H }, truth);
  const labelMemo = new Map<LeadName, { labels: readonly WaveLabel[]; baseline: number }>();
  return {
    key: cycleKey(truth),
    truth,
    t0,
    dt,
    n,
    H,
    leads,
    measured,
    rrMs,
    labels(lead) {
      let r = labelMemo.get(lead);
      if (!r) {
        const li = LEAD_INDEX[lead];
        r = labelLead(leads.subarray(li * n, (li + 1) * n), t0, dt, truth, measured);
        labelMemo.set(lead, r);
      }
      return r;
    },
    value(lead, t) {
      const i = Math.max(0, Math.min(n - 1, Math.round((t - t0) / dt)));
      return leads[LEAD_INDEX[lead] * n + i];
    },
  };
}

// ---------------------------------------------------------------- hub

/** Ring capacity: 16.4 s at 1 kHz covers the 10 s strip plus the previous sweep. */
export const RING_SECONDS = 16.384;

export class EcgHub {
  readonly dt: number;
  readonly leads: RingCache;
  /** Total H = H_A + H_V (Frank X, Y, Z). */
  readonly h: RingCache;
  readonly cycles: CycleIndex;
  /** Bumped on every invalidation (scenario switch) so views can redraw engine-dependent static layers. */
  version = 0;
  private beats = new Map<string, { a: BeatAnalysis; closed: boolean; at: number }>();
  private scratchA = new Float32Array(0);
  private scratchV = new Float32Array(0);
  private readonly off: () => void;

  constructor(private readonly engine: SimEngine) {
    this.dt = 1000 / engine.fsHz;
    const cap = Math.round(RING_SECONDS * engine.fsHz);
    this.leads = new RingCache(12, cap, (k0, n, out) => engine.sampleLeads(k0 * this.dt, n, out));
    this.h = new RingCache(3, cap, (k0, n, out) => {
      if (this.scratchA.length < 3 * n) {
        this.scratchA = new Float32Array(3 * n);
        this.scratchV = new Float32Array(3 * n);
      }
      engine.sampleH(k0 * this.dt, n, this.scratchA, this.scratchV);
      const a = this.scratchA, v = this.scratchV;
      for (let i = 0; i < n; i++) {
        out[i] = a[3 * i] + v[3 * i];
        out[n + i] = a[3 * i + 1] + v[3 * i + 1];
        out[2 * n + i] = a[3 * i + 2] + v[3 * i + 2];
      }
    });
    this.cycles = new CycleIndex((t) => engine.cycleAt(t));
    this.off = engine.onChange(() => this.invalidate());
  }

  invalidate(): void {
    this.leads.invalidate();
    this.h.invalidate();
    this.cycles.invalidate();
    this.beats.clear();
    this.version++;
  }

  dispose(): void {
    this.off();
  }

  /** Sample index of time t (nearest). */
  k(t: number): number {
    return Math.round(t / this.dt);
  }

  /** Ensures leads for [t0, t1] (inclusive of the sample at t1). */
  ensureLeads(t0: number, t1: number): void {
    this.leads.ensure(Math.floor(t0 / this.dt), Math.floor(t1 / this.dt) + 1);
  }
  ensureH(t0: number, t1: number): void {
    this.h.ensure(Math.floor(t0 / this.dt), Math.floor(t1 / this.dt) + 1);
  }

  leadAt(lead: LeadName, t: number): number {
    const k = this.k(t);
    this.leads.ensure(k, k + 1);
    return this.leads.get(LEAD_INDEX[lead], k);
  }

  hAt(t: number): [number, number, number] {
    const k = this.k(t);
    this.h.ensure(k, k + 1);
    return [this.h.get(0, k), this.h.get(1, k), this.h.get(2, k)];
  }

  /** Per-beat analysis, memoized (closed cycles indefinitely, the open last cycle for 300 ms). */
  beat(c: CycleTruth): BeatAnalysis {
    const key = cycleKey(c);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const hit = this.beats.get(key);
    if (hit && (hit.closed || now - hit.at < 300)) return hit.a;
    const prev = this.cycles.prev(c), next = this.cycles.next(c);
    const a = analyseBeat(this.engine, c, rrOfCycle(c, prev, next));
    this.beats.delete(key);
    this.beats.set(key, { a, closed: isClosedCycle(c), at: now });
    if (this.beats.size > 32) this.beats.delete(this.beats.keys().next().value!);
    return a;
  }
}

const hubs = new WeakMap<SimEngine, EcgHub>();

/** One hub per engine, shared by every ECG view. */
export function getHub(engine: SimEngine): EcgHub {
  let h = hubs.get(engine);
  if (!h) {
    h = new EcgHub(engine);
    hubs.set(engine, h);
  }
  return h;
}
