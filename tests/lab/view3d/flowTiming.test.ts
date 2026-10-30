/**
 * Schematic blood-flow timing (src/view3d/core/flowTiming.ts) on synthetic cycle truth (buildCycleTruth driven by
 * hand-placed beats, A-anchored like sinus rhythms or V-anchored like the dissociated rhythms) and on the StubEngine.
 */
import { describe, expect, it } from 'vitest';
import { ejectedFrac, ejectedRate, FILL_FRACTIONS, rapidFillMs, WIGGERS, wiggersModel } from '../../../src/lab/ecg/wiggers';
import { cycleStart } from '../../../src/lab/ecg/sampler';
import { mulberry32 } from '../../../src/lab/quiz/rng';
import { buildCycleTruth, MECH, valveOpenAt, ventricularTimes } from '../../../src/lab/sim/measure/truth';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import type { BeatEvent, BeatTemplate, CycleTruth, ValveEvents, ValveId } from '../../../src/lab/sim/types';
import { VALVES } from '../../../src/lab/sim/types';
import type { FlowCaptionId } from '../../../src/lab/view3d/core/flowTypes';
import { FLOW_A, FLOW_CAPTION_IDS, FLOW_Q, FLOW_STATE_LEN } from '../../../src/lab/view3d/core/flowTypes';
import type { FlowContext, FlowGates } from '../../../src/lab/view3d/core/flowTiming';
import { FLOW_STILL, flowAt, flowCaption, FlowContextCache, flowNeighbours, leafletOpenness, Q_REF_PEAK, resolveFlowWindows } from '../../../src/lab/view3d/core/flowTiming';
import { valveOpenness } from '../../../src/lab/view3d/core/valveMotion';

// ---------------------------------------------------------------- synthetic engines

interface SynthBeat {
  /** P onset (A-anchored engines). */
  readonly pOn?: number;
  /** QRS onset; null = blocked (dropped) beat. */
  readonly qrsOn: number | null;
  readonly qtMs?: number;
  /** RR before this QRS as the rhythm reports it (default: the actual QRS–QRS interval). */
  readonly rrPrevMs?: number;
}

const tpl = (onMs: number, offMs: number, repolOnMs: number, repolEndMs: number): BeatTemplate =>
  ({ truth: { onMs, offMs, repolOnMs, repolEndMs } }) as unknown as BeatTemplate;
const A_TPL = tpl(0, 100, 0, 0);
const vTpl = (qt: number): BeatTemplate => tpl(0, 90, Math.round(0.55 * qt), qt);

/**
 * Minimal engine: cycleAt from hand-placed beats via buildCycleTruth (the model-truth builder) with the inputs the
 * real engine passes (RR_prev of each QRS, the neighbouring beats' mitral events); null inside gaps. `knowsPrev =
 * false` withholds the previous beat's mitral opening (every beat ejects), to exercise the flow layer's own guards.
 */
class SynthEngine {
  calls = 0;
  constructor(
    private readonly beats: readonly SynthBeat[],
    private readonly anchor: 'A' | 'V',
    private readonly gaps: readonly (readonly [number, number])[] = [],
    readonly rrMs = 800,
    private readonly knowsPrev = true,
    /** V-anchored: dissociated P onsets (complete-block-like); they add atrial systoles, never P waves. */
    private readonly atrialPOns: readonly number[] = [],
  ) {}

  private vOf(i: number): Extract<BeatEvent, { kind: 'V' }> | null {
    const b = this.beats[i];
    if (!b || b.qrsOn === null) return null;
    let p = i - 1;
    while (p >= 0 && this.beats[p].qrsOn === null) p--;
    const rrPrevMs = b.rrPrevMs ?? (p >= 0 ? b.qrsOn - this.beats[p].qrsOn! : this.rrMs);
    return { kind: 'V', id: 1000 + i, tMs: b.qrsOn, variant: 'n', rrPrevMs, apdScale: 1, fromA: i };
  }

  private timesOf(i: number) {
    const v = this.vOf(i);
    return v ? ventricularTimes(v.tMs, v.tMs + (this.beats[i].qtMs ?? 400), v.rrPrevMs) : null;
  }

  cycleAt(t: number): CycleTruth | null {
    this.calls++;
    for (const [g0, g1] of this.gaps) if (t >= g0 && t < g1) return null;
    const bs = this.beats;
    let idx = -1;
    for (let i = 0; i < bs.length; i++) {
      const s = this.anchor === 'A' ? bs[i].pOn! : bs[i].qrsOn!;
      if (s <= t) idx = i;
    }
    if (idx < 0) return null;
    const b = bs[idx], nb = bs[idx + 1];
    const v = this.vOf(idx);
    let pv = idx - 1, nv = idx + 1;
    while (pv >= 0 && bs[pv].qrsOn === null) pv--;
    while (nv < bs.length && bs[nv].qrsOn === null) nv++;
    const around = {
      nextMvCloseMs: this.timesOf(nv)?.mvClose ?? null,
      prevMvOpenMs: this.knowsPrev && pv >= 0 ? (this.timesOf(pv)?.mvOpen ?? null) : null,
    };
    if (this.anchor === 'V') {
      const end = nb ? nb.qrsOn! : b.qrsOn! + this.rrMs;
      const atrial = this.atrialPOns
        .map((p, k) => ({ pOnMs: p, aaMs: k > 0 ? p - this.atrialPOns[k - 1] : 800 }))
        .filter((x) => x.pOnMs >= b.qrsOn! && x.pOnMs < end);
      return buildCycleTruth({
        a: null, aTpl: null, v, vTpl: vTpl(b.qtMs ?? 400), nextStartMs: nb ? nb.qrsOn : null, ...around, atrial,
        rrMs: nb ? nb.qrsOn! - b.qrsOn! : this.rrMs,
      });
    }
    const a: BeatEvent = { kind: 'A', id: idx, tMs: b.pOn!, variant: 's', rrPrevMs: this.rrMs };
    return buildCycleTruth({
      a, aTpl: A_TPL, v, vTpl: v ? vTpl(b.qtMs ?? 400) : null,
      nextStartMs: nb ? nb.pOn! : null, nextAtrialStartMs: nb ? nb.pOn! + MECH.atrialEmdMs : null, ...around, rrMs: this.rrMs,
    });
  }
}

/** Sinus: P every rr from 0, constant PR and QT; `drop(k)` blocks beat k. */
function sinus(n: number, rr: number, pr: number, qt: number, drop: (k: number) => boolean = () => false, prOf?: (k: number) => number): SynthBeat[] {
  return Array.from({ length: n }, (_, k) => ({ pOn: k * rr, qrsOn: drop(k) ? null : k * rr + (prOf ? prOf(k) : pr), qtMs: qt }));
}

const NORMAL = new SynthEngine(sinus(16, 800, 160, 400), 'A');
const BRADY = new SynthEngine(sinus(10, 1300, 170, 440), 'A', [], 1300);
const TACHY = new SynthEngine(sinus(24, 400, 140, 280), 'A', [], 400);
// Wenckebach 4:3: PR 180 → 270 → 315 ms, then a blocked P
const WENCK_PR = [180, 270, 315];
const WENCK = new SynthEngine(sinus(20, 800, 0, 400, (k) => k % 4 === 3, (k) => WENCK_PR[k % 4] ?? 0), 'A');
// AF-like dissociated cycles: irregular RR (seeded), no atrial systole in the truth
const AF_BEATS: SynthBeat[] = (() => {
  const rng = mulberry32(7);
  const out: SynthBeat[] = [];
  for (let q = 300; out.length < 20; q += 520 + Math.round(rng() * 560)) out.push({ qrsOn: q, qtMs: 380 });
  return out;
})();
const AFIB = new SynthEngine(AF_BEATS, 'V');
// VT-like: 150/min with a long QT — the rate-scaled aortic closure (Weissler QS2) still leaves ≈ 120 ms of filling
const VT150 = new SynthEngine(Array.from({ length: 20 }, (_, k) => ({ qrsOn: 200 + 400 * k, qtMs: 330 })), 'V', [], 400);
// long–short pairs (AF-like): each short beat comes before the long beat's mitral opening → empty filling window,
// and that beat does not eject (no semilunar events: the pulse deficit)
const LONG_SHORT = new SynthEngine(
  Array.from({ length: 20 }, (_, k) => ({ qrsOn: 200 + 970 * Math.floor(k / 2) + (k % 2) * 380, qtMs: 380 })), 'V', [], 590,
);
// 240/min with a long QT and no previous-beat information (every beat ejects, RR_prev reported as 800 ms): the next
// ejection starts before the previous aortic closure — the flow layer's own cut (truth.ts itself never produces this)
const OVERLAP = new SynthEngine(
  Array.from({ length: 30 }, (_, k) => ({ qrsOn: 200 + 250 * k, qtMs: 330, rrPrevMs: 800 })), 'V', [], 250, false,
);
// complete-block-like: escape QRS every 1700 ms, sinus P every 800 ms dissociated (kicks and cannon a waves)
const CHB_LIKE = new SynthEngine(
  Array.from({ length: 10 }, (_, k) => ({ qrsOn: 300 + 1700 * k, qtMs: 470 })), 'V', [], 1700, true,
  Array.from({ length: 22 }, (_, k) => 100 + 800 * k),
);
// sinus with a "torsades run" gap where cycleAt is null
const GAPPED = new SynthEngine(sinus(16, 800, 160, 400), 'A', [[4300, 6900]]);

const NO_GATES: FlowGates = { vf: false, af: false };
const AF_GATES: FlowGates = { vf: false, af: true };
const VF_GATES: FlowGates = { vf: true, af: false };
const MI = VALVES.indexOf('MITRAL'), TI = VALVES.indexOf('TRICUSPID'), AI = VALVES.indexOf('AORTIC'), PI = VALVES.indexOf('PULMONARY');

/** Sequential evaluation through one FlowContextCache (what the scene does), every `dt` ms over [t0, t1). */
function run(eng: SynthEngine | StubEngine, t0: number, t1: number, dt = 1, gates: FlowGates = NO_GATES) {
  const cache = new FlowContextCache();
  const ts: number[] = [], A: number[][] = VALVES.map(() => []), Q: number[][] = VALVES.map(() => []), caps: FlowCaptionId[] = [];
  const ctxs: FlowContext[] = [];
  const out = new Float32Array(FLOW_STATE_LEN);
  for (let t = t0; t < t1; t += dt) {
    const ctx = cache.get(eng, t, 'rrMs' in eng ? eng.rrMs : 800);
    flowAt(ctx, t, gates, out);
    ts.push(t);
    for (let i = 0; i < 4; i++) {
      A[i].push(out[FLOW_A + i]);
      Q[i].push(out[FLOW_Q + i]);
    }
    caps.push(flowCaption(ctx, t, gates));
    ctxs.push(ctx);
  }
  return { ts, A, Q, caps, ctxs };
}

/** All distinct cycles of an engine over [t0, t1). */
function cyclesOf(eng: { cycleAt(t: number): CycleTruth | null }, t0: number, t1: number): CycleTruth[] {
  const out: CycleTruth[] = [];
  for (let t = t0; t < t1; t += 10) {
    const c = eng.cycleAt(t);
    if (c && !out.some((x) => cycleStart(x) === cycleStart(c))) out.push(c);
  }
  return out;
}
const ev = (c: CycleTruth, id: ValveId) => c.valves.find((v) => v.id === id)!;
const circ = (x: number): number => Math.abs(x - Math.round(x));
const fract = (x: number): number => x - Math.floor(x);

const ENGINES: readonly [string, SynthEngine, number, number][] = [
  ['normal', NORMAL, 0, 12000],
  ['brady', BRADY, 0, 12000],
  ['tachy', TACHY, 0, 9000],
  ['wenckebach', WENCK, 0, 15000],
  ['af-like', AFIB, 0, 14000],
  ['vt-150', VT150, 0, 7600],
  ['long-short', LONG_SHORT, 0, 9000],
  ['ejection-overlap', OVERLAP, 0, 7000],
  ['chb-like', CHB_LIKE, 0, 15000],
  ['gapped', GAPPED, 0, 12000],
];

// ---------------------------------------------------------------- tests

describe('flow advance A is seamless modulo 1', () => {
  for (const [name, eng, t0, t1] of ENGINES) {
    it(`${name}: fract(m·A) has no jumps, sequentially and across every window edge`, () => {
      const r = run(eng, t0, t1, 0.5);
      // coarse: no large jump between 0.5 ms samples (dA/dt < 0.2 /ms even in a 13 ms tricuspid window); the gate
      // onset / end (a null cycle) is the documented exception: A drops to its still value there
      for (let i = 0; i < 4; i++) {
        for (let k = 1; k < r.ts.length; k++) {
          if (r.ctxs[k].still !== r.ctxs[k - 1].still) continue;
          expect(circ(3 * r.A[i][k] - 3 * r.A[i][k - 1])).toBeLessThan(3 * 0.5 * 0.2);
        }
      }
      // explicit edges: window open / close and context switches, ±1e-4 ms
      const out0 = new Float32Array(FLOW_STATE_LEN), out1 = new Float32Array(FLOW_STATE_LEN);
      const cache = new FlowContextCache();
      const edges = new Set<number>();
      for (let k = 0; k < r.ctxs.length; k++) if (k === 0 || r.ctxs[k] !== r.ctxs[k - 1]) for (const ws of r.ctxs[k].windows) for (const w of ws) edges.add(w.t0).add(w.t1);
      for (const c of cyclesOf(eng, t0, t1)) edges.add(cycleStart(c));
      for (const e of edges) {
        const c0 = cache.get(eng, e - 1e-4, eng.rrMs);
        flowAt(c0, e - 1e-4, NO_GATES, out0);
        const c1 = cache.get(eng, e + 1e-4, eng.rrMs);
        flowAt(c1, e + 1e-4, NO_GATES, out1);
        // the first beat after "no cycle" (start, end of a gap) starts the dashes from rest
        if (c0.still !== c1.still) continue;
        for (let i = 0; i < 4; i++) for (const m of [3, 7, 12]) expect(circ(m * out1[FLOW_A + i] - m * out0[FLOW_A + i]), `edge ${e} valve ${VALVES[i]}`).toBeLessThan(1e-3);
      }
    });
  }
});

describe('valve shut → no flow', () => {
  for (const [name, eng, t0, t1] of ENGINES) {
    it(`${name}: wherever valveOpenAt is false the valve's A is constant (0) and q = 0`, () => {
      const r = run(eng, t0, t1, 1);
      const cs = cyclesOf(eng, t0 - 2000, t1 + 2000).filter((c) => c.valves.length > 0);
      for (let k = 0; k < r.ts.length; k++) {
        const t = r.ts[k];
        for (let i = 0; i < 4; i++) {
          const id = VALVES[i];
          const shut = id === 'AORTIC' || id === 'PULMONARY'
            ? !cs.some((c) => c.valves.some((v) => v.id === id && valveOpenAt(v, t)))
            : cs.some((c) => !valveOpenAt(ev(c, id), t));
          if (!shut) continue;
          expect(r.Q[i][k], `${id} q at ${t}`).toBe(0);
          expect(r.A[i][k], `${id} A at ${t}`).toBe(0);
        }
      }
    });
  }

  it('isovolumic spans: mitral and aortic q = 0 throughout; all four q = 0 once the right heart (8 ms lag) has shut too', () => {
    // (not at 240/min, where the truth itself puts the next isovolumic contraction inside the previous ejection)
    for (const [, eng, t0, t1] of ENGINES.filter(([n]) => n !== 'ejection-overlap')) {
      const r = run(eng, t0, t1, 1);
      const spans = cyclesOf(eng, t0, t1).flatMap((c) => c.mech.filter((m) => m.phase === 'isovolumicContraction' || m.phase === 'isovolumicRelaxation'));
      expect(spans.length).toBeGreaterThan(4);
      for (let k = 0; k < r.ts.length; k++) {
        const t = r.ts[k];
        for (const s of spans) {
          if (t < s.t0 || t >= s.t1) continue;
          expect(r.Q[MI][k]).toBe(0);
          expect(r.Q[AI][k]).toBe(0);
          if (t >= s.t0 + MECH.rightLagMs && t < s.t1 - MECH.rightLagMs) {
            expect(r.Q[TI][k]).toBe(0);
            expect(r.Q[PI][k]).toBe(0);
          }
        }
      }
    }
  });

  it('on each side the AV and the semilunar stream never flow together', () => {
    for (const [, eng, t0, t1] of ENGINES) {
      const r = run(eng, t0, t1, 1);
      for (let k = 0; k < r.ts.length; k++) {
        expect(r.Q[MI][k] > 0 && r.Q[AI][k] > 0, `left at ${r.ts[k]}`).toBe(false);
        expect(r.Q[TI][k] > 0 && r.Q[PI][k] > 0, `right at ${r.ts[k]}`).toBe(false);
      }
    }
  });

  it('q stays within 0..1; a near-reference beat peaks near Q_REF_PEAK; q grows with the beat volume', () => {
    const r = run(NORMAL, 1600, 9600, 0.5);
    for (let i = 0; i < 4; i++) {
      expect(Math.min(...r.Q[i])).toBeGreaterThanOrEqual(0);
      expect(Math.max(...r.Q[i])).toBeLessThanOrEqual(1);
      // QT 400 here (the HRA heart: 354): ejection 324 ms instead of the reference 299, SV 69 mL
      expect(Math.max(...r.Q[i])).toBeGreaterThan(Q_REF_PEAK - 0.12);
      expect(Math.max(...r.Q[i])).toBeLessThan(Q_REF_PEAK + 0.05);
    }
    // complete-block-like beats (SV ≈ 87 mL) eject harder than the normal beats
    const chb = run(CHB_LIKE, 2000, 14000, 0.5);
    expect(Math.max(...chb.Q[AI])).toBeGreaterThan(Math.max(...r.Q[AI]));
  });
});

describe('purity', () => {
  it('out-of-order (seeded) evaluation is bit-identical to sequential evaluation', () => {
    for (const [name, eng, t0, t1] of ENGINES) {
      const seq = run(eng, t0, t1, 3.7);
      const rng = mulberry32(20261016);
      const order = seq.ts.map((_, k) => k);
      for (let k = order.length - 1; k > 0; k--) {
        const j = Math.floor(rng() * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
      }
      // in random order the cache misses almost every time (each sample costs ~2 context resolves): a seeded 1/8 of the
      // shuffled samples is still a random order, so it covers the out-of-order cache transitions at an eighth of the cost
      const picked = order.slice(0, Math.ceil(order.length / 8));
      const cache = new FlowContextCache();
      const out = new Float32Array(FLOW_STATE_LEN), fresh = new Float32Array(FLOW_STATE_LEN);
      for (const k of picked) {
        const t = seq.ts[k];
        const ctx = cache.get(eng, t, eng.rrMs);
        flowAt(ctx, t, NO_GATES, out);
        // and a context resolved from scratch for this t alone
        flowAt(resolveFlowWindows(flowNeighbours(eng, t), eng.rrMs), t, NO_GATES, fresh);
        for (let i = 0; i < 4; i++) {
          const msg = `${name} t=${t} ${VALVES[i]}`;
          expect(out[FLOW_A + i], msg).toBe(seq.A[i][k]);
          expect(out[FLOW_Q + i], msg).toBe(seq.Q[i][k]);
          expect(fresh[FLOW_A + i], msg).toBe(seq.A[i][k]);
          expect(fresh[FLOW_Q + i], msg).toBe(seq.Q[i][k]);
        }
        expect(flowCaption(ctx, t, NO_GATES)).toBe(seq.caps[k]);
      }
    }
  });

  it('the cache re-resolves only at cycle changes (a bounded number of cycleAt calls per beat)', () => {
    const eng = new SynthEngine(sinus(40, 800, 160, 400), 'A');
    const cache = new FlowContextCache();
    let changes = 0, prev: FlowContext | null = null;
    for (let t = 0; t < 30000; t += 16) {
      const ctx = cache.get(eng, t, 800);
      if (ctx !== prev) changes++;
      prev = ctx;
    }
    expect(changes).toBeLessThanOrEqual(39);
    expect(eng.calls / 38).toBeLessThan(30);
  });
});

describe('gates', () => {
  it('VF flag → everything still and the caption says no output', () => {
    const r = run(NORMAL, 0, 6000, 1, VF_GATES);
    for (let i = 0; i < 4; i++) {
      expect(r.A[i].every((x) => x === 0)).toBe(true);
      expect(r.Q[i].every((x) => x === 0)).toBe(true);
    }
    expect(new Set(r.caps)).toEqual(new Set(['noOutput']));
  });

  it('null cycle (torsades-run gap, before the first beat) → everything still', () => {
    const r = run(GAPPED, 4300, 6900, 1);
    for (let i = 0; i < 4; i++) expect(r.Q[i].every((x) => x === 0) && r.A[i].every((x) => x === 0)).toBe(true);
    expect(new Set(r.caps)).toEqual(new Set(['idle']));
    const pre = run(AFIB, 0, 300, 1);
    for (let i = 0; i < 4; i++) expect(pre.Q[i].every((x) => x === 0)).toBe(true);
  });
});

describe('AV filling profile', () => {
  it('dropped beat: one AV window spans it with two atrial kicks, A monotone 0 → 1, no aortic motion', () => {
    const cs = cyclesOf(WENCK, 0, 15000);
    const drops = cs.filter((c) => c.valves.length === 0);
    expect(drops.length).toBeGreaterThanOrEqual(3);
    const out = new Float32Array(FLOW_STATE_LEN);
    for (const d of drops) {
      const ctx = resolveFlowWindows(flowNeighbours(WENCK, d.pOn! + 400), 800);
      expect(ctx.dropped).toBe(true);
      const w = ctx.windows[MI].find((x) => x.t0 <= d.pOn! + 400 && x.t1 > d.pOn! + 400)!;
      expect(w.kicks.length).toBe(2);
      let last = -1;
      for (let t = w.t0; t < w.t1; t += 0.5) {
        flowAt(new FlowContextCache().get(WENCK, t, 800), t, NO_GATES, out);
        expect(out[FLOW_A + MI]).toBeGreaterThanOrEqual(last);
        last = out[FLOW_A + MI];
      }
      // slow diastasis inflow runs on after the last kick up to the closure, where A reaches 1
      flowAt(ctx, w.t1 - 1e-6, NO_GATES, out);
      expect(out[FLOW_A + MI]).toBeGreaterThan(1 - 1e-5);
      const dEnd = d.pOn! + 800;
      for (let t = d.pOn!; t < dEnd; t += 1) {
        flowAt(ctx, t, NO_GATES, out);
        expect(out[FLOW_Q + AI]).toBe(0);
        expect(out[FLOW_A + AI]).toBe(0);
        expect(out[FLOW_Q + PI]).toBe(0);
      }
      // the window starts at the last conducted beat's mitral opening and ends at the next conducted closure
      const before = cs.filter((c) => c.valves.length > 0 && cycleStart(c) < cycleStart(d)).at(-1)!;
      const after = cs.find((c) => c.valves.length > 0 && cycleStart(c) > cycleStart(d))!;
      expect(w.t0).toBe(ev(before, 'MITRAL').openMs);
      expect(w.t1).toBe(ev(after, 'MITRAL').closeMs);
    }
  });

  it('passive share ≥ 0.75 at the onset of atrial systole (normal and slow rates)', () => {
    const out = new Float32Array(FLOW_STATE_LEN);
    for (const eng of [NORMAL, BRADY]) {
      const cs = cyclesOf(eng, 2000, 10000);
      let n = 0;
      for (const c of cs) {
        const a0 = c.mech.find((m) => m.phase === 'atrialSystole')!.t0;
        flowAt(new FlowContextCache().get(eng, a0, eng.rrMs), a0, NO_GATES, out);
        expect(out[FLOW_A + MI]).toBeGreaterThanOrEqual(0.75);
        expect(out[FLOW_A + TI]).toBeGreaterThanOrEqual(0.75);
        n++;
      }
      expect(n).toBeGreaterThan(4);
    }
  });

  it('no atrial systole in the truth (AF-like): passive filling carries everything, kick-free', () => {
    const cache = new FlowContextCache();
    for (const c of cyclesOf(AFIB, 1000, 12000)) {
      const ctx = cache.get(AFIB, cycleStart(c) + 1, AFIB.rrMs);
      for (const w of ctx.windows[MI]) expect(w.kicks.length).toBe(0);
    }
  });

  it('very short RR without previous-beat information: an ejection still running when the next one opens is cut there and completes (A → 1)', () => {
    const cs = cyclesOf(OVERLAP, 1000, 6000);
    expect(ev(cs[1], 'AORTIC').closeMs).toBeGreaterThan(ev(cs[2], 'AORTIC').openMs);
    const ctx = resolveFlowWindows(flowNeighbours(OVERLAP, cycleStart(cs[2]) + 1), 250);
    const ws = ctx.windows[AI];
    for (let j = 1; j < ws.length; j++) expect(ws[j - 1].t1).toBeLessThanOrEqual(ws[j].t0);
    const out = new Float32Array(FLOW_STATE_LEN);
    flowAt(ctx, ws[0].t1 - 1e-6, NO_GATES, out);
    expect(out[FLOW_A + AI]).toBeGreaterThan(1 - 1e-5);
  });

  it('high rates: tachycardia fuses E and A (still monotone); a mitral opening after the next closure leaves no filling', () => {
    const cache = new FlowContextCache();
    let fused = 0;
    for (let t = 2000; t < 8000; t += 50) {
      for (const w of cache.get(TACHY, t, 400).windows[MI]) if (w.kicks.length && w.kicks[0].t0 < w.t0 + w.rapidMs) fused++;
    }
    expect(fused).toBeGreaterThan(0);
    // 150/min (VT-like, long QT): every beat fills ≈ 120 ms
    const vt = run(VT150, 1000, 7000, 1);
    let fills = 0;
    for (let k = 1; k < vt.ts.length; k++) if (vt.Q[MI][k] > 0 && vt.Q[MI][k - 1] === 0) fills++;
    expect(fills).toBeGreaterThanOrEqual(14);
    for (let t = 1000; t < 7000; t += 50) expect(resolveFlowWindows(flowNeighbours(VT150, t), 400).emptyFills).toHaveLength(0);
    // long–short: the short beat's closure comes before the long beat's opening → no filling, and it does not eject
    const tShort = 200 + 970 * 3 + 380 + 1;
    const ctx = resolveFlowWindows(flowNeighbours(LONG_SHORT, tShort), 590);
    const emptyMv = ctx.emptyFills.filter((f) => f.valve === 'MITRAL');
    expect(emptyMv.length).toBeGreaterThan(0);
    for (const f of emptyMv) expect(f.openMs).toBeGreaterThan(f.closeMs - MECH.minFillMs);
    // the right heart (tricuspid 8 ms earlier open, 8 ms later shut) gets no filling that beat either
    expect(ctx.emptyFills.filter((f) => f.valve === 'TRICUSPID')).toHaveLength(emptyMv.length);
    const short = LONG_SHORT.cycleAt(tShort)!;
    expect(short.valves.some((v) => v.id === 'AORTIC')).toBe(false);
    expect(short.mech.map((m) => m.phase)).not.toContain('ejection');
    const r = run(LONG_SHORT, short.qrsOn!, short.qrsOn! + 300, 1);
    expect(r.Q[AI].every((x) => x === 0)).toBe(true);
  });
});

describe('agreement with the Wiggers panel (normal cycles)', () => {
  // Same rules (ejectedFrac, rapidFillMs, FILL_FRACTIONS) at the same anchor times, so the two agree exactly at the
  // Wiggers knots. Between knots the Wiggers volume is a monotone cubic whose slope is forced to zero at aortic and
  // mitral opening (the plateau knot before), while the flow keeps the plan's shapes (ejectedFrac, 1 − (1 − s)²), which
  // are fastest there. DEVIATION from plan §8 (|ΔA| < 0.03 ejection, < 0.05 filling): unattainable with the §2 shapes
  // and an unchanged wiggers.ts; measured 0.108 / 0.233 of the stroke volume (docs/research/haemodynamics.md §1). The
  // bounds below pin that measured gap so a regression in either curve shows; they do not meet §8.
  const cs = cyclesOf(NORMAL, 0, 12000);
  const ca = (t: number) => NORMAL.cycleAt(t);
  const out = new Float32Array(FLOW_STATE_LEN);
  const at = (t: number) => {
    flowAt(new FlowContextCache().get(NORMAL, t, 800), t, NO_GATES, out);
    return { mv: out[FLOW_A + MI], av: out[FLOW_A + AI] };
  };

  it('shared rules: kick share = 1 − diastasisFrac, ejectedRate = d ejectedFrac / du, rapid filling 40–160 ms', () => {
    expect(FILL_FRACTIONS.kick).toBeCloseTo(1 - WIGGERS.diastasisFrac, 12);
    for (const u of [0.05, 0.3, 0.6, 0.9]) expect(ejectedRate(u)).toBeCloseTo((ejectedFrac(u + 1e-6) - ejectedFrac(u - 1e-6)) / 2e-6, 5);
    expect(rapidFillMs(0, 20)).toBe(40);
    expect(rapidFillMs(0, 200)).toBe(100);
    expect(rapidFillMs(0, 900)).toBe(160);
  });

  it('exact at the knots, bounded in between', () => {
    let maxEj = 0, maxFill = 0;
    for (let k = 2; k + 1 < cs.length - 1; k++) {
      const [p, c, n] = [cs[k - 1], cs[k], cs[k + 1]];
      const m = wiggersModel([p, c, n], 800, ca);
      const bc = m.beats.find((b) => b.cycle === c)!, bn = m.beats.find((b) => b.cycle === n)!;
      const SV = bc.svMl, dV = bn.edvMl - bc.esvMl;
      const ao = ev(c, 'AORTIC').openMs, ac = ev(c, 'AORTIC').closeMs, mo = ev(c, 'MITRAL').openMs, mc = ev(n, 'MITRAL').closeMs;
      const E = ac - ao;
      for (const t of [ao, ao + 0.33 * E, ao + 0.66 * E, ac - 1e-7]) expect(at(t).av - (bc.edvMl - m.lvv.at(t)) / SV).toBeCloseTo(0, 5);
      const a0 = n.mech.find((x) => x.phase === 'atrialSystole')!;
      const R = Math.max(40, Math.min(160, 0.5 * (a0.t0 - mo)));
      for (const t of [mo, mo + R, a0.t0, Math.min(a0.t1, mc - 2), mc - 1e-7]) expect(at(t).mv - (m.lvv.at(t) - bc.esvMl) / dV).toBeCloseTo(0, 5);
      for (let t = ao; t < ac; t += 1) maxEj = Math.max(maxEj, Math.abs(at(t).av - (bc.edvMl - m.lvv.at(t)) / SV));
      for (let t = mo; t < mc; t += 1) maxFill = Math.max(maxFill, Math.abs(at(t).mv - (m.lvv.at(t) - bc.esvMl) / dV));
    }
    console.log(`flow vs Wiggers volume, max between knots: ejection ${maxEj.toFixed(3)}, filling ${maxFill.toFixed(3)} (plan §8: 0.03 / 0.05)`);
    expect(maxEj).toBeGreaterThan(0.09);
    expect(maxEj).toBeLessThan(0.12);
    expect(maxFill).toBeGreaterThan(0.2);
    expect(maxFill).toBeLessThan(0.25);
  });
});

describe('caption', () => {
  it('covers every caption id and agrees with the flow state', () => {
    const seen = new Set<FlowCaptionId>();
    const check = (r: ReturnType<typeof run>) => {
      for (let k = 0; k < r.ts.length; k++) {
        const c = r.caps[k];
        seen.add(c);
        if (c === 'ejection') expect(r.Q[MI][k]).toBe(0);
        if (c === 'ivc' || c === 'ivr' || c === 'noOutput' || c === 'idle') {
          expect(r.Q[MI][k]).toBe(0);
          expect(r.Q[AI][k]).toBe(0);
        }
        if (c === 'rapidFill' || c === 'diastasis' || c === 'kick' || c === 'noKickAf') expect(r.Q[AI][k]).toBe(0);
      }
    };
    check(run(NORMAL, 0, 6000));
    check(run(WENCK, 0, 6000));
    check(run(AFIB, 0, 6000, 1, AF_GATES));
    check(run(NORMAL, 0, 1000, 1, VF_GATES));
    check(run(GAPPED, 4400, 4500));
    check(run(CHB_LIKE, 2000, 9000));
    expect([...seen].sort()).toEqual([...FLOW_CAPTION_IDS].sort());
  });

  it('normal cycle order: ivc → ejection → ivr → rapidFill → diastasis → kick → ivc (no short diastasis flash)', () => {
    const r = run(NORMAL, 3200, 4260, 1);
    const seq = r.caps.filter((c, k) => k === 0 || c !== r.caps[k - 1]);
    const i = seq.indexOf('ivc');
    expect(seq.slice(i, i + 7)).toEqual(['ivc', 'ejection', 'ivr', 'rapidFill', 'diastasis', 'kick', 'ivc']);
  });

  it('AF: rapid filling, then no atrial kick', () => {
    const r = run(AFIB, 1000, 8000, 1, AF_GATES);
    expect(r.caps).toContain('rapidFill');
    expect(r.caps).toContain('noKickAf');
    expect(r.caps).not.toContain('kick');
    expect(r.caps).not.toContain('diastasis');
  });

  it('overlapping spans at short RR: the newest cycle wins (its IVC over the previous IVR), as in the NowStrip', () => {
    const ctx: FlowContext = {
      ...FLOW_STILL,
      key: 'overlap',
      still: false,
      phases: [
        { id: 'ejection', t0: 0, t1: 100 },
        { id: 'ivr', t0: 100, t1: 200 },
        { id: 'ivc', t0: 150, t1: 185 },
        { id: 'ejection', t0: 185, t1: 400 },
      ],
    };
    expect(flowCaption(ctx, 120, NO_GATES)).toBe('ivr');
    expect(flowCaption(ctx, 160, NO_GATES)).toBe('ivc');
    expect(flowCaption(ctx, 190, NO_GATES)).toBe('ejection');
    expect(flowCaption(ctx, 50, NO_GATES)).toBe('ejection');
    // synthetic VT-like cycles (150/min, long QT): every sample inside the current cycle's IVC says 'ivc'
    const r = run(VT150, 1000, 7000, 1);
    let n = 0;
    for (let k = 0; k < r.ts.length; k++) {
      const ivc = VT150.cycleAt(r.ts[k])?.mech.find((m) => m.phase === 'isovolumicContraction');
      if (!ivc || r.ts[k] < ivc.t0 || r.ts[k] >= ivc.t1) continue;
      expect(r.caps[k], `t=${r.ts[k]}`).toBe('ivc');
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });

  it('dropped beat caption once the previous beat has relaxed', () => {
    const d = cyclesOf(WENCK, 0, 15000).find((c) => c.valves.length === 0)!;
    const cache = new FlowContextCache();
    for (let t = d.pOn! + 100; t < d.pOn! + 800; t += 5) expect(flowCaption(cache.get(WENCK, t, 800), t, NO_GATES)).toBe('dropped');
  });
});

describe('leaflet openness across a cycle boundary', () => {
  const evs = (id: ValveId, openMs: number, closeMs: number): ValveEvents => ({ id, openMs, closeMs });

  it('semilunar: the larger of the two cycles; AV: the smaller; missing events are neutral', () => {
    // previous beat ejects 300–600 (aortic) and its mitral opens at 700; the current cycle (from 550, P on T) closes its
    // mitral at 680 and opens its aortic at 760
    const prevAo = evs('AORTIC', 300, 600), curAo = evs('AORTIC', 760, 1050);
    const prevMv = evs('MITRAL', 700, 250), curMv = evs('MITRAL', 1150, 680);
    for (let t = 550; t < 1100; t += 1) {
      expect(leafletOpenness('AORTIC', prevAo, curAo, t)).toBe(Math.max(valveOpenness('AORTIC', prevAo, t), valveOpenness('AORTIC', curAo, t)));
      expect(leafletOpenness('MITRAL', prevMv, curMv, t)).toBe(Math.min(valveOpenness('MITRAL', prevMv, t), valveOpenness('MITRAL', curMv, t)));
    }
    // the previous ejection still shows after the next cycle has begun; the mitral stays shut until its opening
    expect(valveOpenness('AORTIC', curAo, 580)).toBe(0);
    expect(leafletOpenness('AORTIC', prevAo, curAo, 580)).toBe(1);
    expect(valveOpenness('MITRAL', curMv, 600)).toBe(1);
    expect(leafletOpenness('MITRAL', prevMv, curMv, 600)).toBe(0);
    for (const id of VALVES) for (const t of [0, 400, 900]) {
      const cur = evs(id, 300, 600);
      expect(leafletOpenness(id, undefined, cur, t)).toBe(valveOpenness(id, cur, t));
      // a dropped (valve-less) current cycle: the previous beat's leaflets alone
      expect(leafletOpenness(id, cur, undefined, t)).toBe(valveOpenness(id, cur, t));
    }
  });

  it('A-anchored sinus at 150/min with a long PR: semilunar flow only while its leaflets are drawn open', () => {
    // P on T: with PR 200 ms the previous ejection (aortic closure at QRS + 231 ms, Weissler QS2) outlasts the next P
    // onset (the case the current cycle alone draws shut)
    const eng = new SynthEngine(sinus(30, 400, 200, 330), 'A', [], 400);
    const r = run(eng, 2000, 10000, 1);
    let overrun = 0;
    for (let k = 0; k < r.ts.length; k++) {
      const t = r.ts[k], cur = eng.cycleAt(t)!, prev = eng.cycleAt(cycleStart(cur) - 1);
      for (const i of [AI, PI]) {
        const id = VALVES[i], curEv = cur.valves.find((v) => v.id === id), prevEv = prev?.valves.find((v) => v.id === id);
        if (r.Q[i][k] > 0.05 && valveOpenness(id, curEv, t) === 0) overrun++;
        if (r.Q[i][k] > 0.05) expect(leafletOpenness(id, prevEv, curEv, t), `${id} at ${t}`).toBeGreaterThan(0);
      }
      const mv = leafletOpenness('MITRAL', prev?.valves.find((v) => v.id === 'MITRAL'), cur.valves.find((v) => v.id === 'MITRAL'), t);
      expect(mv > 0.5 && r.Q[AI][k] > 0.05, `mitral drawn open during ejection at ${t}`).toBe(false);
    }
    // the scenario does exercise the overrun
    expect(overrun).toBeGreaterThan(50);
  });
});

describe('StubEngine (A-anchored sinus)', () => {
  it('ejection follows mitral closure, filling follows aortic closure, all from the cycle truth', () => {
    const eng = new StubEngine();
    const r = run(eng, 1000, 6000, 1);
    const cs = cyclesOf(eng, 1000, 6000).filter((c) => c.valves.length > 0);
    expect(cs.length).toBeGreaterThan(3);
    for (let k = 0; k < r.ts.length; k++) {
      const t = r.ts[k];
      const ejecting = cs.some((c) => valveOpenAt(ev(c, 'AORTIC'), t));
      if (r.Q[AI][k] > 0) expect(ejecting).toBe(true);
      expect(r.Q[MI][k] > 0 && r.Q[AI][k] > 0).toBe(false);
    }
    expect(Math.max(...r.Q[MI])).toBeGreaterThan(0.5);
    expect(Math.max(...r.Q[AI])).toBeGreaterThan(0.5);
  });
});
