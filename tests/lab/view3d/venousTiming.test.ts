/**
 * Venous inflow timing (src/view3d/core/venousTiming.ts): S wave over the semilunar (ejection) window, D wave over the
 * AV window's filling pieces, held in between; read from the same FlowContext as the valves, so it stops in VF with
 * no per-disease code. Synthetic windows pin the pairing and the profile; the HRA engine checks real rhythms.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Engine } from '../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { VENTRICULAR_FIBRILLATION } from '../../../src/lab/sim/scenarios/batch3/ventricularField';
import { ATRIAL_FIBRILLATION, COMPLETE_HEART_BLOCK } from '../../../src/lab/sim/scenarios/library';
import { NORMAL_SCENARIO } from '../../../src/lab/sim/scenarios/normal';
import type { Scenario } from '../../../src/lab/sim/scenarios/types';
import { AF_MAX_ROTORS, AF_STRIDE } from '../../../src/lab/sim/source/afField';
import { vfFrameOf } from '../../../src/lab/sim/source/vfDriver';
import { VF_FRAME_FLOATS } from '../../../src/lab/sim/source/vfField';
import type { ValveEvents, ValveId } from '../../../src/lab/sim/types';
import { VALVES } from '../../../src/lab/sim/types';
import type { FlowContext, FlowWindow } from '../../../src/lab/view3d/core/flowTiming';
import { FLOW_STILL, FlowContextCache } from '../../../src/lab/view3d/core/flowTiming';
import {
  VEN_A, VEN_Q, VENOUS_S_SHARE, VENOUS_STATE_LEN, VenousCache, venousAt, venousWindows,
} from '../../../src/lab/view3d/core/venousTiming';

const NO_GATES = { vf: false, af: false };

/** A minimal FlowWindow (only the fields venousTiming reads matter). */
function win(valve: ValveId, t0: number, t1: number, segs: FlowWindow['segs'] = []): FlowWindow {
  const ev: ValveEvents = { id: valve, openMs: t0, closeMs: t1 };
  return { valve, t0, t1, ev, segs, rapidMs: segs[0] ? segs[0].t1 - t0 : 0, kicks: [], volMl: 70, tDone: t1, qGain: 1 };
}

function ctxOf(windows: Partial<Record<ValveId, FlowWindow[]>>, cannons: { t0: number; t1: number }[] = []): FlowContext {
  return { key: 'test', still: false, dropped: false, windows: VALVES.map((v) => windows[v] ?? []), phases: [], emptyFills: [], cannons };
}

const at = (ctx: FlowContext, t: number, gates = NO_GATES) => {
  const out = new Float32Array(VENOUS_STATE_LEN);
  venousAt(ctx, new VenousCache().get(ctx), t, gates, out);
  return { aL: out[VEN_A], aR: out[VEN_A + 1], qL: out[VEN_Q], qR: out[VEN_Q + 1] };
};

describe('venous windows (synthetic)', () => {
  // one beat: ejection 100–400, IVR, mitral open 480: rapid 480–600 (0.6), diastasis 600–700 (0.1), kick 700–800 (0.3)
  const mitral = win('MITRAL', 480, 850, [
    { kind: 'rapid', t0: 480, t1: 600, w: 0.6 },
    { kind: 'diastasis', t0: 600, t1: 700, w: 0.1 },
    { kind: 'kick', t0: 700, t1: 800, w: 0.3 },
  ]);
  const ctx = ctxOf({ AORTIC: [win('AORTIC', 100, 400)], MITRAL: [mitral] });

  it('pairs the ejection with the next filling: one window [ejection start, last non-kick piece end)', () => {
    const [w] = venousWindows(ctx, 'L');
    expect(venousWindows(ctx, 'L').length).toBe(1);
    expect([w.t0, w.t1]).toEqual([100, 700]);
    expect(w.wS).toBe(VENOUS_S_SHARE);
    expect(w.d.map((g) => g.kind)).toEqual(['rapid', 'diastasis']);
    expect(w.d.reduce((s, g) => s + g.w, 0)).toBeCloseTo(1, 12);
    // the other side has no windows here
    expect(venousWindows(ctx, 'R')).toEqual([]);
  });

  it('S during ejection, held through IVR, D from AV opening, then still through the atrial contraction', () => {
    expect(at(ctx, 100).aL).toBe(0);
    expect(at(ctx, 250).aL).toBeCloseTo(VENOUS_S_SHARE / 2, 5); // smoothstep midpoint
    expect(at(ctx, 250).qL).toBeGreaterThan(0.3);
    for (const t of [400, 440, 479]) {
      expect(at(ctx, t).aL).toBeCloseTo(VENOUS_S_SHARE, 5); // IVR: held, no flow
      expect(at(ctx, t).qL).toBe(0);
    }
    expect(at(ctx, 540).aL).toBeGreaterThan(VENOUS_S_SHARE);
    expect(at(ctx, 699).aL).toBeCloseTo(1, 2);
    // during the kick and after it: outside the window, A = 0 ≡ 1 (whole dashes), q = 0
    expect(at(ctx, 750)).toEqual({ aL: 0, aR: 0, qL: 0, qR: 0 });
    // monotone inside the window
    let last = -1;
    for (let t = 100; t < 700; t += 1) {
      const a = at(ctx, t).aL;
      expect(a).toBeGreaterThanOrEqual(last - 1e-7);
      last = a;
    }
  });

  it('a beat that does not eject: D alone; an ejection with no filling after it: S alone', () => {
    const dOnly = ctxOf({ TRICUSPID: [win('TRICUSPID', 500, 800, [{ kind: 'rapid', t0: 500, t1: 650, w: 1 }])] });
    expect(venousWindows(dOnly, 'R').map((w) => [w.t0, w.t1, w.wS, w.s])).toEqual([[500, 650, 0, null]]);
    expect(at(dOnly, 649.9).aR).toBeCloseTo(1, 3);
    const sOnly = ctxOf({ PULMONARY: [win('PULMONARY', 100, 380)] });
    expect(venousWindows(sOnly, 'R').map((w) => [w.t0, w.t1, w.wS])).toEqual([[100, 380, 1]]);
    expect(at(sOnly, 240).aR).toBeCloseTo(0.5, 5);
  });

  it('VF gate or no cycle: everything still; a cannon a wave: no forward intensity', () => {
    expect(at(ctx, 250, { vf: true, af: false })).toEqual({ aL: 0, aR: 0, qL: 0, qR: 0 });
    expect(at(FLOW_STILL, 250)).toEqual({ aL: 0, aR: 0, qL: 0, qR: 0 });
    const cannon = ctxOf({ AORTIC: [win('AORTIC', 100, 400)], MITRAL: [mitral] }, [{ t0: 200, t1: 310 }]);
    expect(at(cannon, 250).qL).toBe(0);
    expect(at(cannon, 250).aL).toBeCloseTo(at(ctx, 250).aL, 6);
  });
});

describe('venous inflow on the HRA heart', () => {
  const engines = new Map<string, Engine>();
  beforeAll(async () => {
    const geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url))));
    for (const sc of [NORMAL_SCENARIO, VENTRICULAR_FIBRILLATION, ATRIAL_FIBRILLATION, COMPLETE_HEART_BLOCK] as Scenario[]) engines.set(sc.id, buildEngineSync(geo, undefined, { scenario: sc }));
  });

  /** What the scene does per frame: context cache → gates → venousAt. */
  function trace(e: Engine, t0: number, t1: number, dt = 2) {
    const cache = new FlowContextCache(), ven = new VenousCache();
    const out = new Float32Array(VENOUS_STATE_LEN), vfBuf = new Float32Array(VF_FRAME_FLOATS), afBuf = new Float32Array(AF_STRIDE * AF_MAX_ROTORS);
    const rr = 60000 / e.rhythm.heartRate;
    const rows: { t: number; vf: boolean; a: number[]; q: number[]; ctx: FlowContext }[] = [];
    for (let t = t0; t < t1; t += dt) {
      const gates = { vf: vfFrameOf(e, t, vfBuf) > 0, af: e.afFrame(t, afBuf) > 0 };
      const ctx = cache.get(e, t, rr);
      venousAt(ctx, ven.get(ctx), t, gates, out);
      rows.push({ t, vf: gates.vf, a: [out[VEN_A], out[VEN_A + 1]], q: [out[VEN_Q], out[VEN_Q + 1]], ctx });
    }
    return rows;
  }

  it('normal sinus rhythm: both sides advance during ejection (S) and early filling (D), never during IVR', () => {
    const e = engines.get(NORMAL_SCENARIO.id)!;
    const rows = trace(e, 2000, 6000);
    let sMoves = 0, dMoves = 0, ivrMoves = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i], c = e.cycleAt(r.t);
      if (!c) continue;
      const ao = c.valves.find((v) => v.id === 'AORTIC'), mi = c.valves.find((v) => v.id === 'MITRAL');
      const moved = r.a[0] !== rows[i - 1].a[0] && r.a[0] > rows[i - 1].a[0];
      if (ao && r.t > ao.openMs + 20 && r.t < ao.closeMs - 20 && moved) sMoves++;
      if (mi && r.t > mi.openMs + 10 && r.t < mi.openMs + 80 && moved) dMoves++;
      if (ao && mi && r.t > ao.closeMs + 5 && r.t < mi.openMs - 5 && moved) ivrMoves++;
      for (const a of r.a) expect(a >= 0 && a <= 1).toBe(true);
      for (const q of r.q) expect(q >= 0 && q <= 1).toBe(true);
    }
    expect(sMoves).toBeGreaterThan(100);
    expect(dMoves).toBeGreaterThan(50);
    expect(ivrMoves).toBe(0);
    // S/D: at aortic closure the left side has advanced by the S share of the beat
    const t = 3000, c = e.cycleAt(t)!, ao = c.valves.find((v) => v.id === 'AORTIC')!;
    const ctx = new FlowContextCache().get(e, ao.closeMs + 5, 60000 / e.rhythm.heartRate);
    const out = new Float32Array(VENOUS_STATE_LEN);
    venousAt(ctx, new VenousCache().get(ctx), ao.closeMs + 5, NO_GATES, out);
    expect(out[VEN_A]).toBeCloseTo(VENOUS_S_SHARE, 2);
  });

  it('pure in time: scrubbing back to an instant gives the same state as playing up to it', () => {
    const e = engines.get(NORMAL_SCENARIO.id)!;
    const forward = trace(e, 2000, 4000, 7);
    const cache = new FlowContextCache(), ven = new VenousCache(), out = new Float32Array(VENOUS_STATE_LEN);
    for (const r of [...forward].reverse()) {
      const ctx = cache.get(e, r.t, 60000 / e.rhythm.heartRate);
      venousAt(ctx, ven.get(ctx), r.t, NO_GATES, out);
      expect([out[VEN_A], out[VEN_A + 1], out[VEN_Q], out[VEN_Q + 1]]).toEqual([...r.a, ...r.q].map(Math.fround));
    }
  });

  it('VF: the venous inflow stops by itself (no windows, no per-disease code)', () => {
    const rows = trace(engines.get(VENTRICULAR_FIBRILLATION.id)!, 3000, 9000, 5);
    const gated = rows.filter((r) => r.vf);
    expect(gated.length).toBeGreaterThan(200);
    for (const r of gated) expect([...r.a, ...r.q]).toEqual([0, 0, 0, 0]);
  });

  it('AF and complete heart block keep a venous inflow on both sides (S and D from their own windows)', () => {
    for (const id of [ATRIAL_FIBRILLATION.id, COMPLETE_HEART_BLOCK.id]) {
      const rows = trace(engines.get(id)!, 2000, 10000, 4);
      for (const side of [0, 1]) {
        const moving = rows.filter((r, i) => i > 0 && r.a[side] > rows[i - 1].a[side]).length;
        expect(moving, `${id} side ${side}`).toBeGreaterThan(rows.length * 0.15);
      }
    }
  });
});
