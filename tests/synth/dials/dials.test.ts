/**
 * Dials (DECISION §7): forward / analytic dials realise the request exactly (truth is read from the model, never
 * echoed), the solves reach their targets, statistics are reported as realised, a dial never overrides what a variant
 * is about, and drawDials follows the difficulty ladder (classic / subtle / noisy / borderline) around the exclusion
 * bands of each dial's thresholds. The catalogue-wide sweep (every scenario × dial × min/mid/max, T1–T3 + couplings)
 * is tests/synth/dials/sweep-*.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import { DIFFICULTIES, drawDials, generate, scenarios, type DialId } from '../../../src/synth';
import { AF_RESPONSE_MAP, DIALS, erpForVentricularResponse } from '../../../src/synth/dials/dials';
import { dialPlan } from '../../../src/synth/dials/draw';
import { drillRanges } from '../../../src/synth/dials/ranges';
import { afVariantBand, nodalRatio, variantOwns } from '../../../src/synth/dials/solve';

const g = (scenario: string, dials: Record<string, number>, extra: { jitter?: boolean; seed?: number; variant?: string } = {}) =>
  generate({ scenario, seed: extra.seed ?? 3, dials, jitter: extra.jitter ?? false, ...(extra.variant ? { variant: extra.variant } : {}) });

describe('forward and analytic dials (jitter off: exact)', () => {
  it('rate: the mean RR realises the requested rate (no HRV)', () => {
    const r = g('normal', { rate: 90, hrv: 0 });
    expect(Math.abs(r.ecg.truth!.hrBpm - 90)).toBeLessThan(1);
    expect(r.applied.rate).toBe(90);
  });
  it('rate on a junctional and a ventricular rhythm', () => {
    expect(Math.abs(g('accelerated-junctional-rhythm', { rate: 80 }).ecg.truth!.hrBpm - 80)).toBeLessThan(1);
    expect(Math.abs(g('vt-monomorphic', { rate: 160 }).ecg.truth!.hrBpm - 160)).toBeLessThan(1.5);
  });
  it('pr: the AV-node solve realises the PR exactly', () => {
    for (const pr of [130, 160, 190]) expect(Math.abs(g('normal', { pr, hrv: 0 }).ecg.truth!.prMs! - pr)).toBeLessThan(1);
    expect(Math.abs(g('av-block-1', { pr: 280 }).ecg.truth!.prMs! - 280)).toBeLessThan(2);
  });
  it('qrs: the conduction stretch realises the QRS and moves the QT by the same amount', () => {
    const base = g('normal', { hrv: 0 }).ecg.truth!;
    const wide = g('normal', { qrs: 102, hrv: 0 }).ecg.truth!;
    expect(Math.abs(wide.qrsMs - 102)).toBeLessThan(1);
    expect(Math.abs(wide.qtMs - base.qtMs - (wide.qrsMs - base.qrsMs))).toBeLessThan(2);
    expect(Math.abs(wide.axisDeg.qrs - base.axisDeg.qrs)).toBeLessThan(3);
  });
  it('qtc: the JT follows the Fridericia target', () => {
    const t = g('normal', { qtc: 425, hrv: 0 }).ecg.truth!;
    expect(Math.abs(t.qtcFridericiaMs - 425)).toBeLessThan(5);
  });
  it('axis: the heart rotation solve reaches the requested ventricular-only axis', () => {
    for (const axis of [10, 45, 75]) {
      const r = g('normal', { axis, hrv: 0 });
      expect(Math.abs((r.applied.axis ?? 999) - axis)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.ecg.truth!.axisDeg.qrs - axis)).toBeLessThanOrEqual(2);
    }
    const lafb = g('lafb', { axis: -65 });
    expect(Math.abs(lafb.ecg.truth!.axisDeg.qrs + 65)).toBeLessThanOrEqual(2);
  });
  it('pAxis: the sinus-P rotation solve reaches the requested atrial-only P axis; the QRS does not move', () => {
    const base = g('normal', {});
    for (const pAxis of [30, 45, 60]) {
      const r = g('normal', { pAxis });
      expect(Math.abs((r.applied.pAxis ?? 999) - pAxis)).toBeLessThanOrEqual(2);
      expect(Math.abs(r.ecg.truth!.axisDeg.p! - pAxis)).toBeLessThanOrEqual(3);
      expect(r.ecg.truth!.axisDeg.qrs).toBeCloseTo(base.ecg.truth!.axisDeg.qrs, 6);
      expect(r.ecg.truth!.qrsMs).toBe(base.ecg.truth!.qrsMs);
    }
  });
  it('st: the injury amplitude realises the ST in the reference lead', () => {
    const t = g('stemi-anterior', { st: 0.3, hrv: 0 }).ecg.truth!;
    expect(Math.abs(t.stMv.V2! - 0.3)).toBeLessThan(0.03);
    const inf = g('stemi-inferior', { st: 0.35 }).ecg.truth!;
    expect(Math.abs(inf.stMv.III! - 0.35)).toBeLessThan(0.03);
  });
  it('tAmp and voltage scale the T and the QRS', () => {
    const base = g('normal', {}).ecg.signal.leads;
    const low = g('normal', { voltage: 0.5 }).ecg.signal.leads;
    const p2p = (x: Float32Array) => Math.max(...x) - Math.min(...x);
    expect(p2p(low.V5) / p2p(base.V5)).toBeCloseTo(0.5, 2);
    // tAmp scales the primary gradient: the T in V4 shrinks (not exactly ½: the secondary T of the QRS stays)
    const tPeak = (x: Float32Array, t0: number) => Math.max(...x.subarray(Math.round(t0 / 2) + 60, Math.round(t0 / 2) + 220));
    const b0 = g('normal', {}).ecg, b1 = g('normal', { tAmp: 0.5 }).ecg;
    const on0 = b0.truth!.beats[3].qrsOn, on1 = b1.truth!.beats[3].qrsOn;
    const ratio = tPeak(b1.signal.leads.V4, on1) / tPeak(b0.signal.leads.V4, on0);
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.75);
  });
  it('conductionRatio: flutter conducts N:1 (AV-node ERP inside the N:1 window)', () => {
    for (const n of [2, 3, 4]) {
      const t = g('atrial-flutter', { conductionRatio: n }).ecg.truth!;
      expect(Math.abs(t.hrBpm - t.atrialRateBpm! / n)).toBeLessThan(2);
    }
  });
  it('dials outside the scenario range are clamped to it', () => {
    const r = g('normal', { rate: 300 });
    expect(r.applied.rate).toBe(scenarios().find((d) => d.id === 'normal')!.dials.rate!.max);
  });
});

describe('statistic dials report the realised value', () => {
  it('ventricularResponse: the AF node is set from the calibrated map; the realised mean rate is reported', () => {
    for (const k of [0, 1]) expect(AF_RESPONSE_MAP[k + 1][1]).toBeLessThan(AF_RESPONSE_MAP[k][1]);
    expect(erpForVentricularResponse(102.5)).toBeCloseTo(330, 6);
    const rates: number[] = [];
    for (const v of [65, 85, 105]) {
      let sum = 0;
      for (const seed of [1, 2, 3, 4]) {
        const r = generate({ scenario: 'atrial-fibrillation', seed, dials: { ventricularResponse: v } });
        expect(r.applied.ventricularResponse).toBe(Math.round(r.ecg.truth!.hrBpm * 10) / 10);
        sum += r.ecg.truth!.hrBpm;
      }
      rates.push(sum / 4);
      expect(Math.abs(sum / 4 - v)).toBeLessThan(15);
    }
    expect(rates[0]).toBeLessThan(rates[1]);
    expect(rates[1]).toBeLessThan(rates[2]);
  });
  it('noise: a recording layer — the truth does not move, the realised noise RMS is reported, wander becomes a finding', () => {
    const a = generate({ scenario: 'normal', seed: 2 }), b = generate({ scenario: 'normal', seed: 2, dials: { noise: 0.4 } });
    expect(b.applied.noise).toBeGreaterThan(0.05);
    expect(JSON.stringify({ ...b.ecg.truth!, findings: [] })).toBe(JSON.stringify({ ...a.ecg.truth!, findings: [] }));
    expect(b.ecg.truth!.findings).toContain('baseline-wander');
  });
  it('hrv: deeper respiratory modulation gives a larger realised PP range', () => {
    const pp = (h: number) => Number(generate({ scenario: 'sinus-arrhythmia', seed: 1, dials: { hrv: h } }).ecg.truth!.facts.ppRangeMs ?? 0);
    expect(pp(0.18)).toBeGreaterThan(pp(0.1));
  });
});

describe('a dial never overrides what a variant is about', () => {
  it('variantOwns maps each dial to the parameter it sets', () => {
    const avn = { ahMinMs: 80, ahExtMs: 60, tauMs: 70, erpMs: 500, jitter: 0, conceal: 0 };
    expect(variantOwns('conductionRatio', { junction: { avn } })).toBe(true);
    expect(variantOwns('rate', { rhythm: { kind: 'sinus', rateBpm: 50 } })).toBe(true);
    expect(variantOwns('rate', { junction: { avn } })).toBe(false);
    expect(variantOwns('st', { injury: [] })).toBe(true);
  });
  it('variable flutter stays variable and rapid AF stays rapid under the scenario dials', () => {
    const v = generate({ scenario: 'atrial-flutter', variant: 'variable', seed: 1, dials: { conductionRatio: 2 } });
    expect(v.applied.conductionRatio).toBeUndefined();
    const plain = generate({ scenario: 'atrial-flutter', variant: 'variable', seed: 1 });
    expect(v.ecg.signal.leads.II).toEqual(plain.ecg.signal.leads.II);
    const AF_NODE = { ahMinMs: 80, ahExtMs: 60, tauMs: 70, erpMs: 330, jitter: 0.16, conceal: 0.35 };
    // an AF variant that patches the node keeps its response class: the dial is realised inside the variant's band
    // (dials/solve.ts › afVariantBand), so a 70 /min request on the rapid variant gives the slowest rapid response
    const rapid = generate({ scenario: 'atrial-fibrillation', variant: 'rapid', seed: 1, dials: { ventricularResponse: 70 } });
    expect(rapid.applied.ventricularResponse).toBe(Math.round(rapid.ecg.truth!.hrBpm * 10) / 10);
    expect(rapid.ecg.truth!.hrBpm).toBeGreaterThan(100);
    expect(afVariantBand({ junction: { avn: { ...AF_NODE, erpMs: 300 } } })).toEqual({ min: 105, max: 160 });
    expect(afVariantBand({ junction: { avn: { ...AF_NODE, erpMs: 860 } } })).toEqual({ min: 40, max: 55 });
    expect(afVariantBand({ junction: { avn: { ...AF_NODE, erpMs: 380 } } })).toBeNull();
  });
  it('clockwise flutter keeps the conductionRatio dial (its patch changes only the circuit and the cycle)', () => {
    const v = generate({ scenario: 'atrial-flutter', variant: 'clockwise', seed: 1, dials: { conductionRatio: 2 } });
    expect(v.applied.conductionRatio).toBe(2);
  });
  it('pr dial in nodal N:1 block: the node recovers over N P–P cycles (nodalRatio)', () => {
    const j = { intraAtrialMs: 35, hvMs: 45, avn: { ahMinMs: 100, ahExtMs: 60, tauMs: 80, erpMs: 880, jitter: 0, conceal: 0 } };
    expect(nodalRatio(j, 60000 / 84)).toBe(2);
    expect(nodalRatio({ ...j, avn: { ...j.avn, erpMs: 280 } }, 60000 / 84)).toBe(1);
  });
});

describe('drawDials: the difficulty ladder', () => {
  const inBand = (def: ReturnType<typeof scenarios>[number], id: DialId, v: number): boolean =>
    DIALS[id].thresholds(def).some((t) => Math.abs(v - t) < DIALS[id].band(t) - 1e-9);

  it('drill ranges lie inside the scenario ranges (lessons may request the whole scenario range)', () => {
    for (const d of scenarios()) {
      const dr = drillRanges(d);
      for (const [id, r] of Object.entries(dr)) {
        const s = d.dials[id as DialId]!;
        expect(r.min, `${d.id} ${id}`).toBeGreaterThanOrEqual(s.min);
        expect(r.max, `${d.id} ${id}`).toBeLessThanOrEqual(s.max);
      }
    }
    expect(drillRanges(scenarios().find((d) => d.id === 'atrial-flutter')!).conductionRatio).toBeUndefined();
  });

  it('is seeded, stays inside the drill ranges and on each dial step', () => {
    for (const d of scenarios()) {
      for (const diff of DIFFICULTIES) {
        const a = drawDials(d.id, createRng(42), diff), b = drawDials(d.id, createRng(42), diff);
        expect(a).toEqual(b);
        for (const [k, v] of Object.entries(a)) {
          const range = drillRanges(d)[k as DialId]!;
          expect(v, `${d.id} ${k}`).toBeGreaterThanOrEqual(range.min);
          expect(v, `${d.id} ${k}`).toBeLessThanOrEqual(range.max);
        }
        for (const k of Object.keys(a)) expect(DIALS[k as DialId].implemented).toBe(true);
      }
    }
  });

  it('classic and subtle values avoid every exclusion band; noisy draws the classic values', () => {
    for (const d of scenarios()) {
      for (let k = 0; k < 6; k++) {
        const c = drawDials(d.id, createRng(k), 'classic'), s = drawDials(d.id, createRng(k), 'subtle'), n = drawDials(d.id, createRng(k), 'noisy');
        expect(n).toEqual(c);
        for (const x of [c, s]) for (const [id, v] of Object.entries(x)) {
          const allowedExists = dialPlan(d, id as DialId, drillRanges(d)[id as DialId]!, 'classic').from.some(([a, b]) => b > a);
          if (allowedExists) expect(inBand(d, id as DialId, v), `${d.id} ${id}=${v}`).toBe(false);
        }
      }
    }
  });

  it('subtle sits nearer the closest threshold than classic; borderline falls inside a band when one meets the range', () => {
    const near = (id: DialId, v: number, def: ReturnType<typeof scenarios>[number]) => Math.min(...DIALS[id].thresholds(def).map((t) => Math.abs(v - t)));
    const normal = scenarios().find((d) => d.id === 'normal')!;
    const stemi = scenarios().find((d) => d.id === 'stemi-anterior')!;
    const avb = scenarios().find((d) => d.id === 'av-block-1')!;
    for (let k = 0; k < 8; k++) {
      for (const [def, id] of [[stemi, 'st'], [avb, 'pr'], [normal, 'qtc']] as const) {
        const c = drawDials(def.id, createRng(k), 'classic')[id]!, s = drawDials(def.id, createRng(k), 'subtle')[id]!;
        expect(near(id, s, def), `${def.id} ${id} subtle ${s} classic ${c}`).toBeLessThanOrEqual(near(id, c, def) + 1e-9);
      }
      // normal PR 120–200: borderline draws a PR within 10 ms of 120 or 200 (the threshold the feedback teaches)
      const pr = drawDials('normal', createRng(k), 'borderline').pr!;
      expect(Math.min(Math.abs(pr - 120), Math.abs(pr - 200))).toBeLessThanOrEqual(10);
      // early repolarisation (st dial solved in V2, the inferior and lateral shares scale with it): near the 0.1 mV limit ± 0.03 mV
      const st = drawDials('early-repolarization', createRng(k), 'borderline').st!;
      expect(Math.abs(st - 0.1)).toBeLessThanOrEqual(0.03 + 1e-9);
    }
  });

  it('drawn dials generate valid ECGs at every difficulty', () => {
    const rng = createRng(7);
    for (const d of scenarios()) {
      for (const diff of DIFFICULTIES) {
        const dials = drawDials(d.id, rng.fork(`${d.id}:${diff}`), diff);
        const r = generate({ scenario: d.id, seed: 5, dials, difficulty: diff });
        expect(r.ecg.truth, `${d.id} ${diff}`).not.toBeNull();
      }
    }
  });
});

describe('difficulty in generate()', () => {
  it('classic, subtle and borderline record a clean chain; noisy adds noise without touching the truth', () => {
    const c = generate({ scenario: 'stemi-inferior', seed: 4 });
    for (const d of ['classic', 'subtle', 'borderline'] as const) expect(generate({ scenario: 'stemi-inferior', seed: 4, difficulty: d }).ecg.signal.leads.II).toEqual(c.ecg.signal.leads.II);
    const n = generate({ scenario: 'stemi-inferior', seed: 4, difficulty: 'noisy' });
    expect(n.ecg.signal.leads.II).not.toEqual(c.ecg.signal.leads.II);
    const strip = (t: object & { findings: readonly string[] }) => JSON.stringify({ ...t, findings: t.findings.filter((f) => !['baseline-wander', 'muscle-tremor', 'ac-interference'].includes(f)) });
    expect(strip(n.ecg.truth!)).toBe(strip(c.ecg.truth!));
  });
});
