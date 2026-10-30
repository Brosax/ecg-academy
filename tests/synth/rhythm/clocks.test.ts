/**
 * Rhythm clocks and ectopy plans (src/synth/rhythm/clocks.ts, ectopy.ts): the sinus node (rate, pauses, SA exit block
 * types, reset by an atrial depolarisation, a pause that survives an atrial run), the ectopic atrial clocks and the
 * PAC / PJC / PVC insertion patterns (criteria.md `sinus-pause-types`, `sick-sinus`, `pac-criteria`,
 * `pvc-grouping-lown`).
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import { atrialSiteClock, SACT_MS, SinusNode } from '../../../src/synth/rhythm/clocks';
import { EctopyPlan } from '../../../src/synth/rhythm/ectopy';
import type { EctopySpec } from '../../../src/synth/api';

const exits = (node: SinusNode, until: number): number[] => {
  const out: number[] = [];
  while (node.peek() < until) out.push(node.take().t);
  return out;
};
const diffs = (xs: readonly number[]): number[] => xs.slice(1).map((x, i) => x - xs[i]);

describe('sinus node', () => {
  it('fires at its rate (HRV off)', () => {
    const pp = diffs(exits(new SinusNode({ rateBpm: 75, hrv: 0 }, -4000, createRng(1)), 10000));
    for (const x of pp) expect(Math.abs(x - 800)).toBeLessThan(20);
  });

  it('respiratory sinus arrhythmia modulates the P–P cycle', () => {
    const pp = diffs(exits(new SinusNode({ rateBpm: 70, hrv: 0.08 }, -4000, createRng(2)), 10000));
    expect(Math.max(...pp) - Math.min(...pp)).toBeGreaterThan(120);
  });

  it('a scheduled pause (sinus arrest) is not a multiple of the cycle', () => {
    const pp = diffs(exits(new SinusNode({ rateBpm: 70, hrv: 0, pauses: [{ afterBeat: 4, ms: 2850 }] }, -4000, createRng(3)), 10000));
    expect(pp.some((x) => Math.abs(x - 2850) < 1)).toBe(true);
  });

  it('SA exit block type II: the pause is exactly two cycles', () => {
    const pp = diffs(exits(new SinusNode({ rateBpm: 76, hrv: 0, saBlock: { ratio: 4, type: 'II' } }, -4000, createRng(4)), 10000));
    const base = Math.min(...pp);
    const pauses = pp.filter((x) => x > 1.4 * base);
    expect(pauses.length).toBeGreaterThanOrEqual(2);
    for (const x of pauses) expect(Math.abs(x - 2 * base)).toBeLessThan(30);
  });

  it('SA exit block type I: P–P shortens before a pause shorter than two cycles', () => {
    const pp = diffs(exits(new SinusNode({ rateBpm: 76, hrv: 0, saBlock: { ratio: 4, type: 'I' } }, -4000, createRng(5)), 12000));
    const base = Math.min(...pp);
    const k = pp.findIndex((x, i) => i >= 2 && x > 1.4 * base);
    expect(k).toBeGreaterThanOrEqual(2);
    expect(pp[k - 1]).toBeLessThan(pp[k - 2]);
    expect(pp[k]).toBeLessThan(2 * pp[k - 1]);
  });

  it('an atrial depolarisation resets it: the next discharge one cycle plus the sinoatrial conduction time later', () => {
    const node = new SinusNode({ rateBpm: 60, hrv: 0 }, 0, createRng(6));
    while (node.peek() < 1000) node.take();
    const nominal = node.peek();
    node.reset(nominal - 400);
    expect(node.peek()).toBeCloseTo(nominal - 400 + SACT_MS + 1000, -1);
  });

  it('a pending pause survives a run of resets and is measured from the last one (overdrive suppression)', () => {
    const node = new SinusNode({ rateBpm: 54, hrv: 0, pauses: [{ afterBeat: 1, ms: 2900 }] }, 0, createRng(7));
    // take discharges until the one after strip index 1, whose successor is the pause
    let x = node.take();
    while (x.index < 1) x = node.take();
    const t1 = x.t;
    expect(node.peek()).toBeCloseTo(t1 + 2900, 3);
    // an atrial run of five impulses: each one re-arms the pause from itself
    const run = [t1 + 330, t1 + 660, t1 + 990, t1 + 1320, t1 + 1650];
    for (const t of run) node.reset(t);
    expect(node.peek()).toBeCloseTo(run[run.length - 1] + 2900, 3);
  });
});

describe('ectopic atrial clocks', () => {
  it('fixed: one site, regular', () => {
    const a = atrialSiteClock('fixed', ['low-ra'], 66, -4000, 10000, createRng(1));
    expect(new Set(a.map((x) => x.site))).toEqual(new Set(['low-ra']));
    const pp = diffs(a.map((x) => x.t));
    expect(Math.max(...pp) - Math.min(...pp)).toBeLessThan(60);
  });
  it('wandering: the pacemaker visits every site, a few beats each', () => {
    const a = atrialSiteClock('wandering', ['sinus', 'ra-septal', 'low-ra'], 68, -4000, 20000, createRng(2));
    expect(new Set(a.map((x) => x.site)).size).toBe(3);
  });
  it('multifocal: random sites with an irregular P–P (CV > 5 %)', () => {
    const a = atrialSiteClock('multifocal', ['sinus', 'left-pv', 'low-ra', 'la-superior'], 116, -4000, 10000, createRng(3));
    const pp = diffs(a.map((x) => x.t));
    const m = pp.reduce((s, x) => s + x, 0) / pp.length;
    const sd = Math.sqrt(pp.reduce((s, x) => s + (x - m) ** 2, 0) / pp.length);
    expect(sd / m).toBeGreaterThan(0.05);
    expect(new Set(a.map((x) => x.site)).size).toBeGreaterThanOrEqual(3);
  });
});

describe('ectopy plans', () => {
  const fires = (spec: EctopySpec, triggers: readonly number[]): number[] => {
    const plan = new EctopyPlan([spec], createRng(1));
    return triggers.flatMap((t) => plan.after(spec.kind === 'pac' ? 'p' : 'qrs', t).map((f) => f.t - t));
  };
  const beats = Array.from({ length: 14 }, (_, i) => -2000 + 850 * i);
  const pvc = (pattern: EctopySpec['pattern'], extra: Partial<EctopySpec> = {}): EctopySpec => ({ kind: 'pvc', pattern, couplingMs: 470, origins: ['rvot-free'], ...extra } as EctopySpec);

  it('bigeminy couples a PVC to every native complex', () => {
    expect(fires(pvc('bigeminy'), beats)).toHaveLength(beats.length);
  });
  it('trigeminy couples one to every second native complex', () => {
    expect(fires(pvc('trigeminy'), beats).length).toBe(Math.floor(beats.length / 2));
  });
  it('a couplet is two impulses one coupling interval apart, after 2.5 s', () => {
    const plan = new EctopyPlan([pvc('couplet')], createRng(1));
    const f = beats.map((t) => plan.after('qrs', t)).find((x) => x.length > 0)!;
    expect(f.map((x) => x.ordinal)).toEqual([0, 1]);
    expect(f[1].t - f[0].t).toBe(470);
    expect(f[0].t - 470).toBeGreaterThanOrEqual(2500);
  });
  it('a run fires runLength impulses once; a single fires once after 3.8 s', () => {
    expect(fires(pvc('run', { runLength: 6 }), beats)).toHaveLength(6);
    const plan = new EctopyPlan([pvc('single')], createRng(1));
    const at = beats.filter((t) => plan.after('qrs', t).length > 0);
    expect(at).toHaveLength(1);
    expect(at[0]).toBeGreaterThanOrEqual(3800);
  });
  it('multifocal origins alternate between the listed foci', () => {
    const plan = new EctopyPlan([{ kind: 'pvc', pattern: 'bigeminy', couplingMs: 460, origins: ['rvot-free', 'lv-lateral'] }], createRng(1));
    const o = beats.slice(0, 4).flatMap((t) => plan.after('qrs', t).map((f) => f.origin));
    expect(o).toEqual(['rvot-free', 'lv-lateral', 'rvot-free', 'lv-lateral']);
  });
  it('PACs couple to the P onset; PVCs to the QRS onset', () => {
    const plan = new EctopyPlan([{ kind: 'pac', pattern: 'bigeminy', couplingMs: 360, origins: ['high-ra'] }], createRng(1));
    expect(plan.has('p')).toBe(true);
    expect(plan.has('qrs')).toBe(false);
  });
});
