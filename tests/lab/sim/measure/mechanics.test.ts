/**
 * Phase-3 mechanics: rate-scaled valve times (truth.ts ventricularTimes), the beat-to-beat volume model and the kick /
 * cannon classification (src/sim/measure/mechanics.ts), the engine's cycle truth for PVCs and dissociated rhythms, and
 * the Wiggers curves that read them (src/ecg/wiggers.ts) on the realistic HRA heart.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { cycleStart } from '../../../../src/lab/ecg/sampler';
import { WIGGERS, wiggersModel } from '../../../../src/lab/ecg/wiggers';
import type { Engine } from '../../../../src/lab/sim/engine';
import { buildEngineSync } from '../../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../../src/lab/sim/geometry/hra/load';
import {
  atrialEvents, contractility, fillShares, fillVolumeMl, passiveFillMl, restitution, VOLUME, volumeOf,
} from '../../../../src/lab/sim/measure/mechanics';
import { atrialSystoleOf, buildCycleTruth, MECH, RATE, ventricularTimes } from '../../../../src/lab/sim/measure/truth';
import { ATRIAL_FIBRILLATION, COMPLETE_HEART_BLOCK, MONOMORPHIC_VT, PREMATURE_VENTRICULAR_CONTRACTION } from '../../../../src/lab/sim/scenarios/library';
import type { BeatEvent, BeatTemplate, CycleTruth, GeometryBundle } from '../../../../src/lab/sim/types';

const ASSET = new URL('../../../../src/lab/assets/heart-hra.bin', import.meta.url);

describe('rate laws (truth.ts)', () => {
  it('reproduce the 75/min constants exactly at RR 800 ms (T end 354 ms after QRS onset, the normal heart)', () => {
    const t = ventricularTimes(1000, 1354, 800);
    expect(t.mvClose - 1000).toBe(MECH.ventricularEmdMs);
    expect(t.avOpen - t.mvClose).toBe(MECH.ivctMs);
    expect(t.avClose).toBe(1354 + MECH.aorticCloseAfterTEndMs);
    expect(t.mvOpen - t.avClose).toBeCloseTo(MECH.ivrtMs, 9);
  });

  it('aortic closure is capped by Weissler QS2 = 546 − 2.1·HR: at 150/min it comes 231 ms after QRS onset, before T end', () => {
    const t = ventricularTimes(0, 305, 400);
    expect(t.avClose).toBeCloseTo(RATE.qs2Ms - RATE.qs2PerBpm * 150, 9);
    expect(t.avClose).toBeLessThan(305);
    // a long QT at 75/min also closes before T end (negative electromechanical window, as in long-QT syndrome)
    expect(ventricularTimes(0, 480, 800).avClose).toBeCloseTo(388.5, 9);
    // IVRT shortens 2 % per 10/min, within 55–115 ms; ejection never shorter than 80 ms
    expect(t.mvOpen - t.avClose).toBeCloseTo(MECH.ivrtMs * (1 - 0.02 * 7.5), 9);
    const fast = ventricularTimes(0, 250, 250);
    expect(fast.avClose - fast.avOpen).toBeGreaterThanOrEqual(RATE.minEjectionMs);
    expect(fast.mvOpen - fast.avClose).toBeGreaterThanOrEqual(RATE.ivrtMinMs);
  });

  it('filling window at 150/min ≈ 120 ms (it was none with the fixed 75/min intervals)', () => {
    const a = ventricularTimes(0, 305, 400), b = ventricularTimes(400, 705, 400);
    expect(b.mvClose - a.mvOpen).toBeGreaterThan(100);
    expect(b.mvClose - a.mvOpen).toBeLessThan(140);
  });

  it('atrial systole fits the atrial cycle (flutter waves ≈ 200 ms apart)', () => {
    expect(atrialSystoleOf(0, 800)).toEqual({ t0: MECH.atrialEmdMs, t1: MECH.atrialEmdMs + MECH.atrialSystoleMs });
    const f = atrialSystoleOf(0, 200);
    expect(f.t1 - f.t0).toBeCloseTo(0.55 * 200, 9);
  });
});

describe('volume model (mechanics.ts)', () => {
  it('the reference beat (filling 373 ms with a kick, steady RR) is the textbook 120 / 50 / 70 mL', () => {
    expect(fillVolumeMl(VOLUME.refFillMs, true)).toBeCloseTo(VOLUME.svRefMl, 9);
    expect(contractility(800, 800)).toBe(1);
    expect(fillVolumeMl(VOLUME.refFillMs, true) + VOLUME.esvMl).toBeCloseTo(WIGGERS.edvMl, 9);
  });

  it('passive filling rises steeply over the first ≈ 300 ms, then only slowly (diastasis)', () => {
    expect(passiveFillMl(0)).toBe(0);
    expect(passiveFillMl(-20)).toBe(0);
    const p = [50, 100, 200, 400, 800, 1200].map(passiveFillMl);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThan(p[i - 1]);
    // slope early ≫ slope late
    expect((p[1] - p[0]) / 50).toBeGreaterThan(10 * ((p[5] - p[4]) / 400));
  });

  it('kick share grows with rate (Klabunde: up to ≈ 40 % at fast rates) and shares sum to 1', () => {
    const slow = fillShares(fillVolumeMl(900, true), 600, true), ref = fillShares(VOLUME.svRefMl, 130, true), fast = fillShares(fillVolumeMl(120, true), 0, true);
    for (const s of [slow, ref, fast]) expect(s.rapid + s.diastasis + s.kick).toBeCloseTo(1, 12);
    expect(ref.kick).toBeCloseTo(0.2, 9);
    expect(slow.kick).toBeLessThan(ref.kick);
    expect(fast.kick).toBeGreaterThan(ref.kick);
    expect(fillShares(50, 100, false).kick).toBe(0);
  });

  it('restitution: a premature beat is weaker, the beat after a short interval stronger (post-extrasystolic potentiation)', () => {
    expect(restitution(300)).toBeLessThan(restitution(800));
    expect(restitution(1600) - restitution(800)).toBeLessThan(0.01);
    expect(contractility(440, 800)).toBeLessThan(0.95);
    expect(contractility(1160, 440)).toBeGreaterThan(1.05);
  });
});

// ---------------------------------------------------------------- hand-built truths

const tpl = (onMs: number, offMs: number, repolEndMs: number): BeatTemplate =>
  ({ truth: { onMs, offMs, repolOnMs: Math.round(0.55 * repolEndMs), repolEndMs } }) as unknown as BeatTemplate;

/** V-anchored cycles (QRS onsets), each with the rate laws and the previous / next beat's mitral events. */
function vCycles(qrs: readonly number[], atrialPOns: readonly number[] = [], qt = 400): CycleTruth[] {
  const v = (i: number): Extract<BeatEvent, { kind: 'V' }> => ({
    kind: 'V', id: i, tMs: qrs[i], variant: 'n', rrPrevMs: i > 0 ? qrs[i] - qrs[i - 1] : 800, apdScale: 1, fromA: null,
  });
  const times = (i: number) => (i >= 0 && i < qrs.length ? ventricularTimes(qrs[i], qrs[i] + qt, v(i).rrPrevMs) : null);
  return qrs.map((q, i) =>
    buildCycleTruth({
      a: null, aTpl: null, v: v(i), vTpl: tpl(0, 90, qt), nextStartMs: qrs[i + 1] ?? null,
      nextMvCloseMs: times(i + 1)?.mvClose ?? null, prevMvOpenMs: times(i - 1)?.mvOpen ?? null,
      atrial: atrialPOns.filter((p) => p >= q && p < (qrs[i + 1] ?? q + 800)).map((p) => ({ pOnMs: p, aaMs: 800 })),
      rrMs: 800,
    }),
  );
}

describe('kick or cannon a wave', () => {
  it('an atrial contraction peaking while the mitral valve is shut is a cannon a wave; in diastole a kick', () => {
    // QRS at 0 and 1700 (escape rhythm); P at 100 (systole) and 1200 (late diastole)
    const cs = vCycles([0, 1700, 3400], [100, 1200]);
    const ev = atrialEvents(cs);
    expect(ev.map((a) => a.kind)).toEqual(['cannon', 'kick']);
    // only the kick fills
    const ca = (t: number) => [...cs].reverse().find((c) => cycleStart(c) <= t) ?? null;
    expect(volumeOf(ca, cs[1])!.kick).toBe(true);
    expect(volumeOf(ca, cs[2])!.kick).toBe(false);
  });

  it('a QRS before the previous mitral opening: no filling, no semilunar events, SV 0', () => {
    const cs = vCycles([0, 800, 1180, 1980]);
    expect(cs[2].valves.map((v) => v.id)).toEqual(['MITRAL', 'TRICUSPID']);
    expect(cs[2].mech.map((m) => m.phase)).not.toContain('ejection');
    const ca = (t: number) => [...cs].reverse().find((c) => cycleStart(c) <= t) ?? null;
    const v = volumeOf(ca, cs[2])!;
    expect(v.ejecting).toBe(false);
    expect(v.svMl).toBe(0);
    expect(v.fillMs!).toBeLessThan(MECH.minFillMs);
    // the beat after it fills over the long pause (no kick here) and is potentiated
    const after = volumeOf(ca, cs[3])!;
    expect(after.contractility).toBeGreaterThan(1.1);
    expect(after.svMl).toBeGreaterThan(65);
  });
});

// ---------------------------------------------------------------- the realistic heart

let geo: GeometryBundle;
beforeAll(async () => {
  geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
});

/** Distinct cycles of an engine over [t0, t1). */
function cyclesOf(e: Engine, t0: number, t1: number): CycleTruth[] {
  const out: CycleTruth[] = [];
  for (let t = t0; t < t1; t += 5) {
    const c = e.cycleAt(t);
    if (c && !out.some((x) => cycleStart(x) === cycleStart(c))) out.push(c);
  }
  return out;
}

describe('engine cycle truth and Wiggers curves (HRA heart)', () => {
  it('PVC: one cycle with the blocked sinus P (cannon a wave on the LA trace), no ejection at 75/min; the next beat is bigger', () => {
    const e = buildEngineSync(geo, undefined, { scenario: PREMATURE_VENTRICULAR_CONTRACTION });
    const ca = (t: number) => e.cycleAt(t);
    const cs = cyclesOf(e, 2000, 9000);
    const i = cs.findIndex((c) => c.vId !== null && c.pOn !== null && c.qrsOn! < c.pOn);
    expect(i).toBeGreaterThan(0);
    const [prev, pvc, post] = [cs[i - 1], cs[i], cs[i + 1]];
    expect(pvc.segments.map((s) => s.seg)).toEqual(['P', 'QRS', 'ST', 'T', 'TP']);
    expect(cycleStart(pvc)).toBe(pvc.qrsOn);
    // the beat before ends its TP at the PVC (the cycles tile)
    expect(prev.segments.find((s) => s.seg === 'TP')!.t1).toBe(pvc.qrsOn);
    const m = wiggersModel([prev, pvc, post], 800, ca);
    const a = m.atrial.find((x) => x.t0 > pvc.qrsOn!)!;
    expect(a.kind).toBe('cannon');
    expect(m.lap.at(a.peak)).toBeCloseTo(WIGGERS.laCannonPeakMmHg, 6);
    // no aortic opening for the PVC; the post-PVC beat ejects more than the reference (pulse pressure > 40 mmHg)
    expect(m.events.filter((x) => x.kind === 'AO' && x.t > pvc.qrsOn! && x.t < post.qrsOn!)).toHaveLength(0);
    const bp = m.beats.find((b) => b.cycle === post)!;
    expect(bp.svMl).toBeGreaterThan(85);
    const ao = post.valves.find((v) => v.id === 'AORTIC')!;
    let sys = 0;
    for (let t = ao.openMs; t < ao.closeMs; t += 2) sys = Math.max(sys, m.aop.at(t));
    expect(sys - m.aop.at(ao.openMs)).toBeGreaterThan(45);
  });

  it('complete heart block: large stroke volume, wide pulse pressure (long run-off), cannon a waves and kicks', () => {
    const e = buildEngineSync(geo, undefined, { scenario: COMPLETE_HEART_BLOCK });
    const ca = (t: number) => e.cycleAt(t);
    const cs = cyclesOf(e, 2000, 12000).filter((c) => c.valves.length > 0);
    // dissociated: atrial systoles in mech, never a P wave
    for (const c of cs) {
      expect(c.pOn).toBeNull();
      expect(c.segments.some((s) => s.seg === 'P' || s.seg === 'PR')).toBe(false);
    }
    const kinds = new Set(atrialEvents(cs).map((a) => a.kind));
    expect(kinds).toEqual(new Set(['kick', 'cannon']));
    const m = wiggersModel(cs.slice(1, 4), 1714, ca);
    const c = cs[2], ao = c.valves.find((v) => v.id === 'AORTIC')!;
    const dia = m.aop.at(ao.openMs);
    let sys = 0;
    for (let t = ao.openMs; t < ao.closeMs; t += 2) sys = Math.max(sys, m.aop.at(t));
    expect(dia).toBeLessThan(70);
    expect(sys - dia).toBeGreaterThan(45);
    expect(m.beats.find((b) => b.cycle === c)!.edvMl).toBeGreaterThan(130);
  });

  it('AF: a beat with no filling shows no aortic upstroke (pulse deficit); every beat has its own stroke volume', () => {
    const e = buildEngineSync(geo, undefined, { scenario: ATRIAL_FIBRILLATION });
    const ca = (t: number) => e.cycleAt(t);
    const cs = cyclesOf(e, 2000, 12000);
    const k = cs.findIndex((c, j) => j > 0 && j + 1 < cs.length && !c.valves.some((v) => v.id === 'AORTIC'));
    expect(k).toBeGreaterThan(0);
    const m = wiggersModel([cs[k - 1], cs[k], cs[k + 1]], 545, ca);
    const c = cs[k], mc = c.valves.find((v) => v.id === 'MITRAL')!;
    // LV pressure peaks below the aortic pressure; the aorta keeps falling through the non-ejecting beat
    for (let t = mc.closeMs; t < mc.openMs; t += 2) expect(m.lvp.at(t)).toBeLessThan(m.aop.at(t));
    expect(m.aop.at(mc.openMs)).toBeLessThan(m.aop.at(mc.closeMs));
    const sv = cs.map((x) => volumeOf(ca, x)?.svMl ?? NaN).filter(Number.isFinite);
    expect(new Set(sv.map((x) => Math.round(x))).size).toBeGreaterThan(5);
  });

  it('VT at 150/min: every cycle fills, the sinus P waves contract the atria without becoming P waves', () => {
    const e = buildEngineSync(geo, undefined, { scenario: MONOMORPHIC_VT });
    const cs = cyclesOf(e, 2000, 9000).filter((c) => c.valves.length > 0);
    for (let j = 1; j < cs.length; j++) {
      const mo = cs[j - 1].valves.find((v) => v.id === 'MITRAL')!.openMs, mc = cs[j].valves.find((v) => v.id === 'MITRAL')!.closeMs;
      expect(mc - mo).toBeGreaterThan(100);
      expect(cs[j].pOn).toBeNull();
    }
    expect(cs.some((c) => c.mech.some((x) => x.phase === 'atrialSystole'))).toBe(true);
  });
});
