import { describe, expect, it } from 'vitest';
import type { AppCommands } from '../../../src/lab/app/commands';
import { ISO_MV } from '../../../src/lab/explain';
import { tc } from '../../../src/lab/i18n/common';
import { answerText, applyShowPlan, explainAnswer } from '../../../src/lab/quiz/feedback';
import { ACTIVE_STRUCTURES, CALIPER_TOL_MS, generateQuiz, PROJ_MIN_H_MV, PROJ_MIN_SIGNED_MV } from '../../../src/lab/quiz/generators';
import { grade, showPlan } from '../../../src/lab/quiz/grade';
import { mulberry32 } from '../../../src/lab/quiz/rng';
import type { Question } from '../../../src/lab/quiz/types';
import { QUIZ_KINDS } from '../../../src/lab/quiz/types';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import { LEADS } from '../../../src/lab/sim/types';

const T_REF = 6000;

describe('seeded generation', () => {
  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });

  it('same seed + same engine state → identical quiz', () => {
    const q1 = generateQuiz(new StubEngine(), { seed: 7, tRef: T_REF });
    const q2 = generateQuiz(new StubEngine(), { seed: 7, tRef: T_REF });
    expect(q1).toEqual(q2);
    const q3 = generateQuiz(new StubEngine(), { seed: 8, tRef: T_REF });
    expect(q3).not.toEqual(q1);
  });

  it('asks two questions of every kind', () => {
    const q = generateQuiz(new StubEngine(), { seed: 3, tRef: T_REF });
    expect(q.length).toBe(10);
    for (const k of QUIZ_KINDS) expect(q.filter((x) => x.kind === k).length).toBe(2);
  });

  it('does not generate rhythm events far beyond tRef (a later heart-rate change must apply promptly)', () => {
    const e = new StubEngine();
    generateQuiz(e, { seed: 11, tRef: T_REF });
    const evs = e.rhythm.eventsUntil(0);
    expect(evs[evs.length - 1].tMs).toBeLessThan(T_REF + 2000 + 1000);
  });

  for (const bpm of [40, 150])
    it(`works at ${bpm} bpm`, () => {
      const e = new StubEngine();
      e.setHeartRate(bpm);
      expect(generateQuiz(e, { seed: 5, tRef: 9000 }).length).toBe(10);
    });
});

describe('answers agree with independent computations from the engine', () => {
  const e = new StubEngine();
  const all: Question[] = [];
  for (let seed = 1; seed <= 12; seed++) all.push(...generateQuiz(e, { seed, tRef: T_REF + seed * 137 }));

  it('segment: the answer is the truth window of that segment', () => {
    for (const q of all.filter((x) => x.kind === 'segment')) {
      if (q.kind !== 'segment') continue;
      const c = e.cycleAt(q.answer.t0 + 0.5)!;
      const s = c.segments.find((x) => x.seg === q.seg)!;
      expect([q.answer.t0, q.answer.t1]).toEqual([s.t0, s.t1]);
      expect(q.strip.t0).toBeLessThan(q.answer.t0);
      expect(q.strip.t1).toBeGreaterThan(q.answer.t1 - 1);
      expect(grade(q, { kind: 'segment', tMs: (s.t0 + s.t1) / 2 }).correct).toBe(true);
      expect(grade(q, { kind: 'segment', tMs: s.t1 + 30 }).correct).toBe(false);
    }
  });

  it('lead groups match the shared glossary', () => {
    for (const q of all.filter((x) => x.kind === 'leadGroup')) {
      if (q.kind !== 'leadGroup') continue;
      const label = tc.in('en', `leadgroup.${q.wall}`);
      const listed = label.slice(label.indexOf('(') + 1, label.indexOf(')')).split(',').map((s) => s.trim());
      expect([...q.answer].sort()).toEqual([...listed].sort());
      expect(grade(q, { kind: 'leadGroup', leads: [...q.answer].reverse() }).correct).toBe(true);
      expect(grade(q, { kind: 'leadGroup', leads: q.answer.slice(1) }).correct).toBe(false);
    }
  });

  it('projection: the answer is the sign of L·H at the marked instant', () => {
    const seen = new Set<string>();
    for (const q of all) {
      if (q.kind !== 'projection') continue;
      const a = new Float32Array(3), v = new Float32Array(3);
      e.sampleH(q.tMs, 1, a, v);
      const H = [a[0] + v[0], a[1] + v[1], a[2] + v[2]];
      // projector rows: atrial (mA) for H_A, ventricular (mV) for H_V
      const i = LEADS.indexOf(q.lead) * 3, { mA, mV } = e.projector;
      const dot = mA[i] * a[0] + mA[i + 1] * a[1] + mA[i + 2] * a[2] + mV[i] * v[0] + mV[i + 1] * v[1] + mV[i + 2] * v[2];
      expect(Math.hypot(H[0], H[1], H[2])).toBeGreaterThanOrEqual(PROJ_MIN_H_MV - 1e-6);
      expect(q.h[0]).toBeCloseTo(H[0], 5);
      if (q.answer === 'iso') expect(Math.abs(dot)).toBeLessThan(ISO_MV);
      else {
        expect(Math.sign(dot)).toBe(q.answer === 'pos' ? 1 : -1);
        expect(Math.abs(dot)).toBeGreaterThanOrEqual(PROJ_MIN_SIGNED_MV - 1e-6);
      }
      expect(q.strip.lead).not.toBe(q.lead);
      seen.add(q.answer);
      // feedback explanation states the same deflection
      expect(explainAnswer(e, q, { correct: true }, 'en').join(' ')).toContain(
        q.answer === 'pos' ? 'upward' : q.answer === 'neg' ? 'downward' : 'near-isoelectric',
      );
    }
    expect(seen.size).toBe(3);
  });

  it('structure: the answer is depolarizing (responsible, weight 1) and distractors are not active', () => {
    for (const q of all) {
      if (q.kind !== 'structure') continue;
      const resp = e.responsible(q.tMs);
      expect(resp.find((r) => r.id === q.answer)!.w).toBeGreaterThanOrEqual(0.99);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
      for (const o of q.options) {
        expect(ACTIVE_STRUCTURES).toContain(o);
        if (o !== q.answer) expect(resp.some((r) => r.id === o)).toBe(false);
      }
    }
  });

  it('calipers: PR = QRS onset − P onset, ±20 ms accepted', () => {
    for (const q of all) {
      if (q.kind !== 'calipers') continue;
      const c = e.cycleAt(q.pOn + 1)!;
      expect(q.answerMs).toBe(c.qrsOn! - c.pOn!);
      expect(q.toleranceMs).toBe(CALIPER_TOL_MS);
      expect(grade(q, { kind: 'calipers', t0: q.pOn, t1: q.qrsOn }).correct).toBe(true);
      expect(grade(q, { kind: 'calipers', t0: q.qrsOn + 15, t1: q.pOn }).correct).toBe(true);
      expect(grade(q, { kind: 'calipers', t0: q.pOn - 25, t1: q.qrsOn }).correct).toBe(false);
      const g = grade(q, { kind: 'calipers', t0: q.pOn, t1: q.qrsOn + 10 });
      expect(g.errorMs).toBeCloseTo(10, 6);
    }
  });

  it('every question has a localized answer and explanation in all languages', () => {
    for (const q of all.slice(0, 20))
      for (const lang of ['zh', 'en', 'es'] as const) {
        expect(answerText(q, lang).length).toBeGreaterThan(0);
        const ex = explainAnswer(e, q, grade(q, q.kind === 'calipers' ? { kind: 'calipers', t0: 0, t1: 150 } : { kind: 'segment', tMs: 0 }), lang);
        expect(ex.join('').length).toBeGreaterThan(20);
      }
  });
});

describe('show me in 3D', () => {
  it('seeks, highlights and cuts through AppCommands only', () => {
    const e = new StubEngine();
    const q = generateQuiz(e, { seed: 2, tRef: T_REF, kinds: ['structure'], count: 1 })[0];
    if (q.kind !== 'structure') throw new Error('expected a structure question');
    const calls: [string, unknown[]][] = [];
    const commands = new Proxy({} as AppCommands, { get: (_t, k) => (...a: unknown[]) => calls.push([String(k), a]) });
    applyShowPlan(showPlan(q), commands);
    expect(calls.map((c) => c[0])).toEqual(['pause', 'seek', 'setSlice', 'highlight']);
    expect(calls[1][1][0]).toBe(q.tMs);
    expect(calls[3][1][0]).toEqual([q.answer]);
    expect(LEADS.length).toBe(12);
  });
});
