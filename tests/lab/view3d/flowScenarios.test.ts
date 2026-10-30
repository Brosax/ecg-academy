/**
 * Schematic blood flow (src/view3d/core/flowTiming.ts) on the realistic HRA heart across rhythm scenarios: the flow is
 * read from engine.cycleAt exactly as the scene does (FlowContextCache + VF / AF gates), 12 s per scenario at 2 ms.
 * Phase 3 closed the model gaps pinned here before: a PVC has its own cycle truth (and ejects when it comes after the
 * previous beat's mitral opening), the dissociated rhythms carry their atrial contractions (kick or cannon a wave),
 * stroke volume varies beat to beat (src/sim/measure/mechanics.ts), and the rate-scaled ejection / relaxation leave a
 * filling window at short RR — except for a beat whose QRS comes before the previous beat has relaxed, which gets no
 * filling and does not eject (the AF pulse deficit).
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { cycleStart } from '../../../src/lab/ecg/sampler';
import type { Engine } from '../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { ATRIAL_FLUTTER_TYPICAL } from '../../../src/lab/sim/scenarios/batch3/supraventricularReentry';
import { TORSADES_DE_POINTES, VENTRICULAR_FIBRILLATION } from '../../../src/lab/sim/scenarios/batch3/ventricularField';
import type { BeatVolume } from '../../../src/lab/sim/measure/mechanics';
import { volumeOf } from '../../../src/lab/sim/measure/mechanics';
import { MECH } from '../../../src/lab/sim/measure/truth';
import {
  ATRIAL_FIBRILLATION, COMPLETE_HEART_BLOCK, JUNCTIONAL_ESCAPE, MOBITZ_I_WENCKEBACH, MONOMORPHIC_VT,
  PREMATURE_VENTRICULAR_CONTRACTION, SINUS_TACHYCARDIA,
} from '../../../src/lab/sim/scenarios/library';
import { NORMAL_SCENARIO } from '../../../src/lab/sim/scenarios/normal';
import type { Scenario } from '../../../src/lab/sim/scenarios/types';
import { AF_MAX_ROTORS, AF_STRIDE } from '../../../src/lab/sim/source/afField';
import { vfFrameOf } from '../../../src/lab/sim/source/vfDriver';
import { VF_FRAME_FLOATS } from '../../../src/lab/sim/source/vfField';
import type { BeatEvent, CycleTruth, GeometryBundle, ValveId } from '../../../src/lab/sim/types';
import { VALVES } from '../../../src/lab/sim/types';
import { cometBlur, flowDashes } from '../../../src/lab/view3d/bloodFlow';
import { buildFlowPaths } from '../../../src/lab/view3d/core/flowPaths';
import type { FlowCaptionId } from '../../../src/lab/view3d/core/flowTypes';
import { FLOW_A, FLOW_Q, FLOW_STATE_LEN } from '../../../src/lab/view3d/core/flowTypes';
import { flowAt, flowCaption, FlowContextCache, leafletOpenness } from '../../../src/lab/view3d/core/flowTiming';
import { valveOpenness } from '../../../src/lab/view3d/core/valveMotion';

const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);
const T0 = 2000, T1 = 14000, DT = 2;
const MI = VALVES.indexOf('MITRAL'), TI = VALVES.indexOf('TRICUSPID'), AI = VALVES.indexOf('AORTIC'), PI = VALVES.indexOf('PULMONARY');
type VEv = Extract<BeatEvent, { kind: 'V' }>;

let geo: GeometryBundle;
beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
});

interface Trace {
  readonly ts: number[];
  readonly A: number[][];
  readonly Q: number[][];
  /** Leaflet openness as the scene feeds the jets (current cycle and the one before it, leafletOpenness). */
  readonly open: number[][];
  readonly vf: boolean[];
  readonly af: boolean[];
  readonly caps: FlowCaptionId[];
  readonly cycles: CycleTruth[];
  /** Kick spans in the mitral windows seen; empty mitral windows (opening ≥ next closure) by opening time. */
  kicks: number;
  readonly emptyFills: Set<number>;
  /** Cannon a waves (atrial contraction against shut AV valves) seen, by onset. */
  readonly cannons: Set<number>;
}

/** What the scene does each frame: cache.get → gates → flowAt / flowCaption. */
function trace(e: Engine, t0 = T0, t1 = T1, dt = DT): Trace {
  const cache = new FlowContextCache();
  const out = new Float32Array(FLOW_STATE_LEN), vfBuf = new Float32Array(VF_FRAME_FLOATS), afBuf = new Float32Array(AF_STRIDE * AF_MAX_ROTORS);
  const rr = 60000 / e.rhythm.heartRate;
  const tr: Trace = {
    ts: [], A: VALVES.map(() => []), Q: VALVES.map(() => []), open: VALVES.map(() => []), vf: [], af: [], caps: [], cycles: [], kicks: 0,
    emptyFills: new Set(), cannons: new Set(),
  };
  // windows are rebuilt per context: count each mitral window once, by its opening time
  const seenWin = new Set<number>();
  for (let t = t0; t < t1; t += dt) {
    const gates = { vf: vfFrameOf(e, t, vfBuf) > 0, af: e.afFrame(t, afBuf) > 0 };
    const ctx = cache.get(e, t, rr);
    for (const f of ctx.emptyFills) if (f.valve === 'MITRAL') tr.emptyFills.add(f.openMs);
    for (const k of ctx.cannons) tr.cannons.add(k.t0);
    for (const w of ctx.windows[MI]) {
      if (w.t0 > t || w.t1 <= t || seenWin.has(w.t0)) continue;
      seenWin.add(w.t0);
      tr.kicks += w.kicks.length;
    }
    flowAt(ctx, t, gates, out);
    const cur = e.cycleAt(t);
    // the scene's previous cycle: the one just before cur's start (HeartScene.cycleAt)
    const prev = cur && cycleStart(cur) > 1 ? e.cycleAt(cycleStart(cur) - 1) : null;
    if (cur && !tr.cycles.some((c) => cycleStart(c) === cycleStart(cur))) tr.cycles.push(cur);
    tr.ts.push(t);
    tr.vf.push(gates.vf);
    tr.af.push(gates.af);
    tr.caps.push(flowCaption(ctx, t, gates));
    for (let i = 0; i < 4; i++) {
      tr.A[i].push(out[FLOW_A + i]);
      tr.Q[i].push(out[FLOW_Q + i]);
      const id = VALVES[i];
      tr.open[i].push(leafletOpenness(id, prev?.valves.find((v) => v.id === id), cur?.valves.find((v) => v.id === id), t));
    }
  }
  return tr;
}

/** Beat volumes (mechanics.volumeOf) of the valved cycles seen. */
const volumesOf = (e: Engine, tr: Trace): BeatVolume[] =>
  tr.cycles.map((c) => volumeOf((t) => e.cycleAt(t), c)).filter((v): v is BeatVolume => v !== null);

/** Openness from the current cycle alone (what valves.ts draws). */
const valveOpennessCur = (cur: CycleTruth | null, id: ValveId, t: number): number => valveOpenness(id, cur?.valves.find((v) => v.id === id), t);

/** Start times of flow through valve i (q turns > 0). */
const onsets = (tr: Trace, i: number): number[] =>
  tr.ts.filter((_, k) => k > 0 && tr.Q[i][k] > 0 && tr.Q[i][k - 1] === 0);
const intervals = (xs: readonly number[]): number[] => xs.slice(1).map((x, k) => x - xs[k]);
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/** Report-only audit line: rate, ejection time, empty filling windows, kicks, leaflet/flow disagreement, captions. */
function audit(label: string, tr: Trace): void {
  const ao = intervals(onsets(tr, AI));
  const ej = tr.cycles.flatMap((c) => c.mech.filter((m) => m.phase === 'ejection').map((m) => m.t1 - m.t0));
  const aov = tr.cycles.flatMap((c) => c.valves.filter((v) => v.id === 'AORTIC'));
  const overlaps = aov.filter((a, k) => k + 1 < aov.length && a.closeMs > aov[k + 1].openMs).length;
  const nonEjecting = tr.cycles.filter((c) => c.valves.length > 0 && !c.valves.some((v) => v.id === 'AORTIC')).length;
  // jets (leafletOpenness) against the flow: 0 ms since the previous cycle is combined in (it was up to ≈ 1.4 s per
  // 12 s at 150/min from the current cycle alone; valves.ts still draws the leaflets from the current cycle only)
  let mism = 0;
  for (let k = 0; k < tr.ts.length; k++) if (tr.Q[AI][k] > 0 && tr.open[AI][k] === 0) mism += DT;
  const caps: Record<string, number> = {};
  for (const c of tr.caps) caps[c] = (caps[c] ?? 0) + DT;
  console.log(
    `${label}: aortic flow every ${mean(ao).toFixed(0)} ms (${ao.length} intervals), ejection ${mean(ej).toFixed(0)} ms ` +
      `(literature 281–293), empty mitral windows ${tr.emptyFills.size}, non-ejecting beats ${nonEjecting}, mitral kicks ${tr.kicks}, ` +
      `cannon a waves ${tr.cannons.size}, ejections cut by the next one ${overlaps}, aortic flow with the leaflet ` +
      `drawn shut ${mism} ms\n  captions (ms): ${JSON.stringify(caps)}`,
  );
}

/** Invariants every scenario must keep. */
function invariants(tr: Trace): void {
  for (let k = 0; k < tr.ts.length; k++) {
    for (let i = 0; i < 4; i++) {
      expect(tr.Q[i][k]).toBeGreaterThanOrEqual(0);
      expect(tr.Q[i][k]).toBeLessThanOrEqual(1);
      expect(tr.A[i][k]).toBeGreaterThanOrEqual(0);
      expect(tr.A[i][k]).toBeLessThanOrEqual(1);
    }
    // same side: the AV and the semilunar stream never flow together, and the leaflets are never both mostly open
    expect(tr.Q[MI][k] > 0 && tr.Q[AI][k] > 0, `left flow at ${tr.ts[k]}`).toBe(false);
    expect(tr.Q[TI][k] > 0 && tr.Q[PI][k] > 0, `right flow at ${tr.ts[k]}`).toBe(false);
    expect(tr.open[MI][k] > 0.5 && tr.open[AI][k] > 0.5, `left leaflets at ${tr.ts[k]}`).toBe(false);
    expect(tr.open[TI][k] > 0.5 && tr.open[PI][k] > 0.5, `right leaflets at ${tr.ts[k]}`).toBe(false);
    // a stream moves only through leaflets drawn open; no AV leaflet drawn open while its side ejects
    for (const i of [AI, PI]) if (tr.Q[i][k] > 0.05) expect(tr.open[i][k], `${VALVES[i]} leaflet at ${tr.ts[k]}`).toBeGreaterThan(0);
    expect(tr.open[MI][k] > 0.5 && tr.Q[AI][k] > 0.05, `mitral open during ejection at ${tr.ts[k]}`).toBe(false);
    expect(tr.open[TI][k] > 0.5 && tr.Q[PI][k] > 0.05, `tricuspid open during ejection at ${tr.ts[k]}`).toBe(false);
    if (tr.vf[k]) {
      for (let i = 0; i < 4; i++) expect(tr.Q[i][k]).toBe(0);
      expect(tr.caps[k]).toBe('noOutput');
    }
  }
}

/**
 * Comet travel per 60 Hz display frame at 1x playback, in dashes (m from the real HRA paths), measured as
 * bloodFlow.update does (A's 1 → 0 drop at a window edge continues the motion).
 */
function frameShifts(e: Engine, t0 = T0, t1 = T1): { readonly max: number[]; readonly fast: number; readonly frames: number } {
  const m = VALVES.map((id) => flowDashes(buildFlowPaths(geo).find((p) => p.valve === id)?.lengthMm ?? Number.NaN).m);
  const cache = new FlowContextCache();
  const out = new Float32Array(FLOW_STATE_LEN), vfBuf = new Float32Array(VF_FRAME_FLOATS), afBuf = new Float32Array(AF_STRIDE * AF_MAX_ROTORS);
  const rr = 60000 / e.rhythm.heartRate, prev = new Float32Array(4), max = [0, 0, 0, 0];
  let fast = 0, frames = 0;
  for (let t = t0; t < t1; t += 1000 / 60, frames++) {
    flowAt(cache.get(e, t, rr), t, { vf: vfFrameOf(e, t, vfBuf) > 0, af: e.afFrame(t, afBuf) > 0 }, out);
    for (let i = 0; i < 4; i++) {
      const a = out[FLOW_A + i];
      let da = a - prev[i];
      if (da < -0.5) da += 1;
      prev[i] = a;
      if (frames === 0) continue;
      const shift = m[i] * da;
      max[i] = Math.max(max[i], shift);
      // a point-sampled dash pattern aliases from half a dash per frame on (frozen or running backwards): the blur
      // must even it out there, at any intensity
      if (shift >= 0.5) {
        fast++;
        expect(cometBlur(shift), `${VALVES[i]} at ${t.toFixed(1)}: shift ${shift.toFixed(2)}`).toBe(1);
      }
    }
  }
  console.log(`  comet travel per 60 Hz frame (dashes, max): ${VALVES.map((v, i) => `${v} ${max[i].toFixed(2)} (m ${m[i]})`).join(', ')}; ${fast} fast path-frames of ${4 * frames}`);
  return { max, fast, frames };
}

/** One engine per scenario, built in the describe's own hook (keeps each hook well inside the timeout). */
function scenario(
  label: string,
  sc: Scenario,
  body: (get: () => { readonly e: Engine; readonly tr: Trace }) => void,
  t1 = T1,
  setup?: (e: Engine) => void,
): void {
  describe(label, () => {
    let e: Engine;
    let tr: Trace;
    beforeAll(() => {
      e = buildEngineSync(geo, undefined, { scenario: sc });
      setup?.(e);
      tr = trace(e, T0, t1);
      audit(label, tr);
    });
    it('keeps the flow invariants (bounds, no same-side overlap, still under the VF gate)', () => invariants(tr));
    body(() => ({ e, tr }));
  });
}

scenario('normal sinus', NORMAL_SCENARIO, (get) => {
  it('shows every diastolic sub-phase and both isovolumic freezes; aortic flow once per beat', () => {
    const { e, tr } = get();
    for (const c of ['ivc', 'ejection', 'ivr', 'rapidFill', 'diastasis', 'kick'] as const) expect(tr.caps).toContain(c);
    expect(tr.kicks).toBeGreaterThan(8);
    expect(mean(intervals(onsets(tr, AI)))).toBeCloseTo(60000 / e.rhythm.heartRate, -1);
    expect(tr.emptyFills.size).toBe(0);
  });

  it('the E-wave and early-ejection surges outrun half a dash per 60 Hz frame at 1x: the motion blur covers them', () => {
    const { max, fast } = frameShifts(get().e);
    // pinned so a change of m, of the dash length or of the advance profile shows up here
    expect(max[MI]).toBeGreaterThan(1.2);
    expect(max[MI]).toBeLessThan(2);
    expect(max[AI]).toBeGreaterThan(0.6);
    expect(max[AI]).toBeLessThan(1);
    expect(fast).toBeGreaterThan(0);
  });
});

scenario('sinus tachycardia', SINUS_TACHYCARDIA, (get) => {
  it('still fills every beat (no empty mitral window at 125/min) and keeps one ejection per beat', () => {
    const { e, tr } = get();
    expect(mean(intervals(onsets(tr, AI)))).toBeCloseTo(60000 / e.rhythm.heartRate, -1);
    expect(onsets(tr, MI).length).toBeGreaterThanOrEqual(onsets(tr, AI).length - 1);
    expect(tr.emptyFills.size).toBe(0);
  });

  it('rapid filling (40 ms at this rate) moves the mitral comets several dashes per 60 Hz frame: blurred even', () => {
    const { max } = frameShifts(get().e);
    expect(max[MI]).toBeGreaterThan(3.5);
    expect(max[MI]).toBeLessThan(5);
    expect(max[AI]).toBeGreaterThan(0.7);
    expect(max[AI]).toBeLessThan(1.2);
  });
});

scenario('sinus at 150/min (rate slider maximum)', NORMAL_SCENARIO, (get) => {
  it('every beat still fills (aortic closure at QRS + 231 ms, Weissler QS2) with a smaller stroke volume', () => {
    const { e, tr } = get();
    expect(mean(intervals(onsets(tr, AI)))).toBeCloseTo(400, -1);
    expect(tr.emptyFills.size).toBe(0);
    expect(onsets(tr, MI).length).toBeGreaterThanOrEqual(onsets(tr, AI).length - 1);
    const sv = volumesOf(e, tr).map((v) => v.svMl);
    expect(Math.min(...sv)).toBeGreaterThan(45);
    expect(Math.max(...sv)).toBeLessThan(60);
  });

  it('P on T: the next cycle begins while the previous beat still relaxes, and the AV leaflets stay drawn shut until its mitral opening', () => {
    const { e, tr } = get();
    // the current cycle alone would draw the mitral leaflets open there: the scenario does exercise leafletOpenness
    let overlap = 0;
    for (let k = 0; k < tr.ts.length; k++) {
      const t = tr.ts[k];
      if (valveOpennessCur(e.cycleAt(t), 'MITRAL', t) > 0.5 && tr.open[MI][k] === 0) overlap += DT;
    }
    expect(overlap).toBeGreaterThan(300);
  });
}, T1, (e) => e.setHeartRate(150));

scenario('atrial fibrillation', ATRIAL_FIBRILLATION, (get) => {
  it('no atrial kick, irregular ventricular rhythm, caption "no atrial kick"', () => {
    const { tr } = get();
    expect(tr.kicks).toBe(0);
    expect(tr.caps).toContain('noKickAf');
    expect(tr.caps).not.toContain('kick');
    const rr = intervals(onsets(tr, AI));
    const sd = Math.sqrt(mean(rr.map((x) => (x - mean(rr)) ** 2)));
    expect(rr.length).toBeGreaterThan(8);
    expect(sd).toBeGreaterThan(40);
  });

  it('short RR: the caption follows the newest beat (never "all valves shut" while a semilunar stream flows)', () => {
    const { tr } = get();
    for (let k = 0; k < tr.ts.length; k++) {
      if (tr.caps[k] !== 'ivc' && tr.caps[k] !== 'ivr') continue;
      expect(Math.max(tr.Q[AI][k], tr.Q[PI][k]), `${tr.caps[k]} at ${tr.ts[k]}`).toBeLessThanOrEqual(0.3);
    }
  });

  it('stroke volume follows the RR: small after a short RR, potentiated after a short–long pair, never an atrial kick', () => {
    const { e, tr } = get();
    const vols = volumesOf(e, tr).filter((v) => v.rr1Ms !== null && v.rr2Ms !== null);
    expect(vols.length).toBeGreaterThan(10);
    for (const v of vols) expect(v.kick).toBe(false);
    const short = vols.filter((v) => v.rr1Ms! < 450), long = vols.filter((v) => v.rr1Ms! > 600);
    expect(short.length).toBeGreaterThan(2);
    expect(long.length).toBeGreaterThan(2);
    expect(mean(short.map((v) => v.svMl))).toBeLessThan(mean(long.map((v) => v.svMl)) - 15);
    // a long interval after a short one: filling plus post-extrasystolic potentiation
    expect(vols.some((v) => v.rr1Ms! > 1.5 * v.rr2Ms! && v.contractility > 1.15)).toBe(true);
  });

  it('pulse deficit (phase 3 flip of the "no filling window" gap): only a beat whose QRS comes before the previous beat has relaxed gets no filling, and it does not eject', () => {
    const { e, tr } = get();
    const beats = tr.cycles.filter((c) => c.valves.length > 0);
    const nonEjecting = beats.filter((c) => !c.valves.some((v) => v.id === 'AORTIC'));
    expect(nonEjecting.length).toBeGreaterThan(0);
    // a minority of the beats: the radial pulse counts fewer beats than the ECG, not none
    expect(nonEjecting.length).toBeLessThan(0.35 * beats.length);
    for (const c of nonEjecting) {
      const prev = beats[beats.indexOf(c) - 1];
      if (!prev) continue;
      const mo = prev.valves.find((v) => v.id === 'MITRAL')!.openMs, mc = c.valves.find((v) => v.id === 'MITRAL')!.closeMs;
      expect(mc - mo, `beat at ${c.qrsOn}`).toBeLessThan(MECH.minFillMs);
      expect(c.qrsOn! - prev.qrsOn!).toBeLessThan(450);
      expect(volumeOf((t) => e.cycleAt(t), c)!.svMl).toBe(0);
      // no aortic flow from the previous beat's closure until this beat has relaxed
      const prevAc = prev.valves.find((v) => v.id === 'AORTIC')?.closeMs ?? c.qrsOn!;
      const cMo = c.valves.find((v) => v.id === 'MITRAL')!.openMs;
      for (let k = 0; k < tr.ts.length; k++) if (tr.ts[k] >= prevAc && tr.ts[k] < cMo) expect(tr.Q[AI][k], `t=${tr.ts[k]}`).toBe(0);
    }
    // and every empty filling window belongs to such a beat
    for (const o of tr.emptyFills) {
      expect(nonEjecting.some((c) => { const mc = c.valves.find((v) => v.id === 'MITRAL')!.closeMs; return mc <= o + MECH.minFillMs && mc > o - 500; }), `empty window at ${o}`).toBe(true);
    }
  });
});

scenario('atrial flutter 2:1', ATRIAL_FLUTTER_TYPICAL, (get) => {
  it('ventricular streams at the conducted rate (≈ 150/min); flutter waves contract the atria: kicks in diastole, cannon a waves in systole', () => {
    const { tr } = get();
    expect(mean(intervals(onsets(tr, AI)))).toBeGreaterThan(330);
    expect(mean(intervals(onsets(tr, AI)))).toBeLessThan(480);
    expect(tr.kicks).toBeGreaterThan(8);
    expect(tr.cannons.size).toBeGreaterThan(8);
    expect(tr.caps).toContain('cannon');
    expect(tr.caps).toContain('kick');
    // stable chip: no sliver (< 60 ms) of the interrupted phase right before or after a cannon caption (the IVC is a
    // whole 35 ms phase in every beat, not a sliver)
    const runs: { id: FlowCaptionId; ms: number }[] = [];
    for (const c of tr.caps) {
      if (runs.length && runs[runs.length - 1].id === c) runs[runs.length - 1].ms += DT;
      else runs.push({ id: c, ms: DT });
    }
    for (let i = 1; i + 1 < runs.length; i++) {
      if (runs[i].id === 'cannon' || runs[i].id === 'ivc') continue;
      if (runs[i + 1].id === 'cannon' || runs[i - 1].id === 'cannon') expect(runs[i].ms, `${runs[i].id} next to a cannon`).toBeGreaterThanOrEqual(60);
    }
  });
});

scenario('ventricular fibrillation', VENTRICULAR_FIBRILLATION, (get) => {
  it('everything still: all q = 0, caption "no effective output"', () => {
    const { tr } = get();
    expect(tr.vf.every(Boolean)).toBe(true);
    for (let i = 0; i < 4; i++) expect(tr.Q[i].every((x) => x === 0)).toBe(true);
    expect(new Set(tr.caps)).toEqual(new Set(['noOutput']));
  });
});

scenario('torsades de pointes', TORSADES_DE_POINTES, (get) => {
  it('flow stops during the run and resumes with the sinus beats', () => {
    const { tr } = get();
    const runMs = tr.vf.filter(Boolean).length * DT;
    expect(runMs).toBeGreaterThan(3000);
    for (let k = 0; k < tr.ts.length; k++) if (tr.vf[k]) for (let i = 0; i < 4; i++) expect(tr.Q[i][k]).toBe(0);
    // sinus beats outside the run eject
    expect(tr.Q[AI].some((q, k) => q > 0.5 && !tr.vf[k])).toBe(true);
  });
}, 20000);

scenario('complete heart block', COMPLETE_HEART_BLOCK, (get) => {
  it('aortic flow at the escape rate (≈ 35/min); the dissociated sinus P waves kick in diastole and hit shut valves in systole (cannon a waves)', () => {
    const { tr } = get();
    const rr = intervals(onsets(tr, AI));
    expect(rr.length).toBeGreaterThanOrEqual(4);
    expect(mean(rr)).toBeGreaterThan(60000 / 35 - 150);
    expect(mean(rr)).toBeLessThan(60000 / 35 + 150);
    expect(tr.kicks).toBeGreaterThan(3);
    expect(tr.cannons.size).toBeGreaterThan(2);
    expect(tr.caps).toContain('cannon');
  });

  it('the long filling time gives a large stroke volume (Frank–Starling), above the 70 mL of the normal beat', () => {
    const { e, tr } = get();
    const sv = volumesOf(e, tr).filter((v) => v.rr1Ms !== null).map((v) => v.svMl);
    expect(sv.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...sv)).toBeGreaterThan(80);
    expect(Math.max(...sv)).toBeLessThan(100);
  });
});

scenario('junctional escape rhythm', JUNCTIONAL_ESCAPE, (get) => {
  it('retrograde P′ after every QRS: the atria contract on shut AV valves each beat (regular cannon a waves), no kick', () => {
    const { tr } = get();
    expect(tr.cannons.size).toBeGreaterThanOrEqual(onsets(tr, AI).length - 1);
    expect(tr.kicks).toBe(0);
    expect(tr.caps).toContain('cannon');
    expect(tr.caps).not.toContain('kick');
  });
});

scenario('monomorphic VT', MONOMORPHIC_VT, (get) => {
  it('ejection at ≈ 150/min; every isovolumic contraction is captioned as such (newest cycle wins)', () => {
    const { e, tr } = get();
    expect(mean(intervals(onsets(tr, AI)))).toBeGreaterThan(360);
    expect(mean(intervals(onsets(tr, AI)))).toBeLessThan(440);
    expect(tr.caps).toContain('ivc');
    let n = 0;
    for (let k = 0; k < tr.ts.length; k++) {
      const ivc = e.cycleAt(tr.ts[k])?.mech.find((m) => m.phase === 'isovolumicContraction');
      if (!ivc || tr.ts[k] < ivc.t0 || tr.ts[k] >= ivc.t1) continue;
      expect(tr.caps[k], `t=${tr.ts[k]}`).toBe('ivc');
      n++;
    }
    expect(n).toBeGreaterThan(200);
  });

  it('phase 3 flip: the rate-scaled ejection and relaxation leave a filling window at 150/min — every beat fills', () => {
    const { tr } = get();
    expect(tr.emptyFills.size).toBe(0);
    expect(onsets(tr, MI).length).toBeGreaterThanOrEqual(onsets(tr, AI).length - 1);
  });

  it('AV dissociation: the sinus P waves kick some beats and not others, so the stroke volume alternates', () => {
    const { e, tr } = get();
    expect(tr.kicks).toBeGreaterThan(3);
    const vols = volumesOf(e, tr).filter((v) => v.rr1Ms !== null);
    const withKick = vols.filter((v) => v.kick), without = vols.filter((v) => !v.kick);
    expect(withKick.length).toBeGreaterThan(2);
    expect(without.length).toBeGreaterThan(2);
    expect(mean(withKick.map((v) => v.svMl)) - mean(without.map((v) => v.svMl))).toBeGreaterThan(10);
  });
});

scenario('Mobitz I (Wenckebach)', MOBITZ_I_WENCKEBACH, (get) => {
  it('dropped beat: no aortic flow over the whole non-conducted cycle while the ventricle keeps filling', () => {
    const { tr } = get();
    const drops = tr.cycles.filter((c) => c.vId === null && c.pOn !== null);
    expect(drops.length).toBeGreaterThanOrEqual(2);
    for (const d of drops) {
      const s = cycleStart(d), nx = tr.cycles.find((c) => cycleStart(c) > s);
      const tEnd = nx ? cycleStart(nx) : s + 800;
      let mitral = 0, dropped = 0;
      for (let k = 0; k < tr.ts.length; k++) {
        const t = tr.ts[k];
        if (t < s || t >= tEnd) continue;
        // the previous beat's ejection is over before the next P (PR ≤ 315 ms)
        expect(tr.Q[AI][k], `aortic at ${t}`).toBe(0);
        expect(tr.Q[PI][k], `pulmonary at ${t}`).toBe(0);
        if (tr.Q[MI][k] > 0) mitral++;
        if (tr.caps[k] === 'dropped') dropped++;
      }
      expect(mitral).toBeGreaterThan(0);
      expect(dropped).toBeGreaterThan(0);
    }
  });
});

/** PVC events of a trace window, with their cycle truth and the conducted beat after the pause. */
function pvcBeats(e: Engine): { readonly p: VEv; readonly c: CycleTruth; readonly post: CycleTruth }[] {
  return e.rhythm
    .eventsUntil(T1)
    .filter((x): x is VEv => x.kind === 'V' && x.fromA === null && x.tMs >= T0 && x.tMs + 1500 < T1)
    .map((p) => {
      const c = e.cycleAt(p.tMs + 20)!;
      let post = c;
      for (let t = cycleStart(c) + 50; cycleStart(post) === cycleStart(c) || post.valves.length === 0; t += 50) post = e.cycleAt(t)!;
      return { p, c, post };
    });
}

scenario('PVC (every 4th beat)', PREMATURE_VENTRICULAR_CONTRACTION, (get) => {
  it('phase 3 flip: each PVC has its own cycle truth (QRS, T, its isovolumic contraction and relaxation on the timeline)', () => {
    const { e } = get();
    const pv = pvcBeats(e);
    expect(pv.length).toBeGreaterThanOrEqual(2);
    for (const { p, c } of pv) {
      expect(c.vId, `PVC at ${p.tMs}`).toBe(p.id);
      expect(c.segments.map((s) => s.seg)).toEqual(expect.arrayContaining(['QRS', 'T']));
      expect(c.mech.map((m) => m.phase)).toEqual(expect.arrayContaining(['isovolumicContraction', 'isovolumicRelaxation']));
      expect(c.valves.map((v) => v.id)).toEqual(expect.arrayContaining(['MITRAL', 'TRICUSPID']));
    }
  });

  it('at 75/min the PVC (coupling 0.55) comes before the previous beat relaxed: no filling, so no ejection — a beat on the ECG without a pulse', () => {
    const { e, tr } = get();
    for (const { p, c } of pvcBeats(e)) {
      expect(c.valves.some((v) => v.id === 'AORTIC'), `PVC at ${p.tMs}`).toBe(false);
      expect(volumeOf((t) => e.cycleAt(t), c)!.svMl).toBe(0);
      for (let k = 0; k < tr.ts.length; k++) if (tr.ts[k] >= c.qrsOn! && tr.ts[k] < c.qrsOn! + 400) expect(tr.Q[AI][k]).toBe(0);
    }
  });

  it('the sinus P buried in the PVC contracts on shut valves (cannon a wave); the beat after the compensatory pause is bigger', () => {
    const { e, tr } = get();
    const ca = (t: number) => e.cycleAt(t);
    for (const { p, c, post } of pvcBeats(e)) {
      expect(c.aId, `PVC at ${p.tMs}`).not.toBeNull();
      const a0 = c.mech.find((m) => m.phase === 'atrialSystole')!.t0;
      expect(tr.cannons.has(a0)).toBe(true);
      const v = volumeOf(ca, post)!;
      expect(v.svMl).toBeGreaterThan(85);
      expect(v.contractility).toBeGreaterThan(1.05);
    }
  });
});

scenario('PVC with the sinus at 60/min', PREMATURE_VENTRICULAR_CONTRACTION, (get) => {
  it('a later PVC (after the previous mitral opening) fills a little and ejects a small stroke volume; interpolated, so the next sinus beat is short and the one after potentiated', () => {
    const { e, tr } = get();
    const ca = (t: number) => e.cycleAt(t);
    const pv = pvcBeats(e);
    expect(pv.length).toBeGreaterThanOrEqual(2);
    for (const { p, c, post } of pv) {
      const v = volumeOf(ca, c)!;
      expect(v.ejecting, `PVC at ${p.tMs}`).toBe(true);
      expect(v.svMl).toBeGreaterThan(5);
      expect(v.svMl).toBeLessThan(40);
      let q = 0;
      for (let k = 0; k < tr.ts.length; k++) if (tr.ts[k] >= c.qrsOn! && tr.ts[k] < c.qrsOn! + 400) q = Math.max(q, tr.Q[AI][k]);
      expect(q).toBeGreaterThan(0);
      // at 60/min the sinus P after the PVC still conducts (interpolated PVC, no compensatory pause): that beat follows
      // a short RR and fills less; the next one (a long RR after a short one) is potentiated
      const vp = volumeOf(ca, post)!;
      expect(post.aId).not.toBeNull();
      expect(vp.svMl).toBeGreaterThan(v.svMl);
      expect(vp.svMl).toBeLessThan(70);
      const after = e.cycleAt(cycleStart(post) + (vp.rr1Ms ?? 500) + 600)!;
      const va = volumeOf(ca, after)!;
      expect(va.contractility).toBeGreaterThan(1.05);
      expect(va.svMl).toBeGreaterThan(78);
    }
  });
}, T1, (e) => e.setHeartRate(60));
