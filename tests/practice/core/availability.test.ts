/**
 * Families offered only when the catalogue / case library can produce them; planners (adaptive mix, spaced review,
 * exam) never plan a drill that cannot be generated; and the fixes found by smoke-testing against the real engine
 * (contrast pairs, speed-round balance, decoys, triage of the Brugada pattern, Heart Lab links).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { FINDINGS, type FindingId } from '../../../src/core/findings';
import { COMPETENCIES, type CompetencyId, type Mastery } from '../../../src/practice/api';
import { examAllocation, examBlueprint, examCompetencies, planMixed, planReviews } from '../../../src/practice/core/adaptive';
import { decoysOf } from '../../../src/practice/core/extras';
import { FAMILY_SPECS, familyAvailable, getSpec } from '../../../src/practice/core/families';
import { availablePairs, scenariosFor } from '../../../src/practice/core/gen/compare';
import { resolvePool } from '../../../src/practice/core/gen/common';
import { generateItem } from '../../../src/practice/core/generate';
import { labLinkOf } from '../../../src/practice/core/links';
import { masteryFrom } from '../../../src/practice/core/mastery';
import { setPracticePorts } from '../../../src/practice/core/ports';
import { triageOf } from '../../../src/practice/core/truth';
import { emptyReal, fakeReal, fakeSynth, FAKE_SCENARIOS, subsetSynth } from '../fake';

/** The scenario ids of the real catalogue at its first milestone (2026-10-17). */
const EARLY = [
  'normal',
  'sinus-bradycardia',
  'sinus-tachycardia',
  'sinus-arrhythmia',
  'early-repolarization',
  'juvenile-t',
  'athlete',
  'irbbb',
  'atrial-fibrillation',
  'atrial-flutter',
  'wpw',
  'vt-monomorphic',
  'rbbb',
  'lbbb',
  'stemi-anterior',
  'stemi-inferior',
  'lvh-strain',
  'hyperkalemia',
  'brugada-type1',
];

const none = (): Mastery => masteryFrom([]);
const FINDINGS_SEVERITY = (f: FindingId): string => FINDINGS[f].severity;

afterEach(() => setPracticePorts({ synth: null, real: null }));

describe('familyAvailable', () => {
  it('offers every family with the full catalogue and the case library', () => {
    setPracticePorts({ synth: fakeSynth, real: fakeReal });
    const missing = FAMILY_SPECS.filter((s) => !familyAvailable(s)).map((s) => s.id);
    expect(missing).toEqual([]);
  });

  it('hides families whose pool is empty, single-answer choice families and real families without cases', () => {
    setPracticePorts({ synth: subsetSynth(EARLY), real: emptyReal });
    // empty pools today: AV blocks, ectopy, pacing, artefacts…
    for (const id of ['av-block', 'blocked-p', 'ectopy', 'pacing', 'artefacts', 'systemic', 'ischemia-patterns']) expect(familyAvailable(id), id).toBe(false);
    // the pool exists but offers a single answer (only LVH with strain among the chamber findings; only VT among WCT)
    expect(familyAvailable('chambers')).toBe(false);
    expect(familyAvailable('wide-tachy')).toBe(false);
    // two answers or more, or no answer universe at all
    for (const id of ['bundle-branch', 'territory', 'rate', 'measure-qt', 'axis-degrees', 'occlusion', 'report', 'spot', 'sinus']) expect(familyAvailable(id), id).toBe(true);
    for (const s of FAMILY_SPECS.filter((x) => x.source === 'real')) expect(familyAvailable(s), s.id).toBe(false);
    expect(familyAvailable('no-such-family')).toBe(false);
  });

  it('never claims a family whose pool is empty, and generation of such a family fails', async () => {
    setPracticePorts({ synth: subsetSynth(EARLY), real: fakeReal });
    for (const s of FAMILY_SPECS) {
      if (s.source !== 'synth' || !s.pool) continue;
      if (resolvePool(s.pool).length > 0) continue;
      expect(familyAvailable(s), s.id).toBe(false);
      await expect(generateItem(s.id, 1)).rejects.toThrow();
    }
  });

  it('every family it offers on the small catalogue generates', async () => {
    setPracticePorts({ synth: subsetSynth(EARLY), real: fakeReal });
    for (const s of FAMILY_SPECS.filter((x) => familyAvailable(x))) {
      for (const seed of [1, 2]) await expect(generateItem(s.id, seed, s.difficulties[0]), s.id).resolves.toBeDefined();
    }
  });
});

describe('planners use available families only', () => {
  const ok = (id: string) => familyAvailable(id);

  it('adaptive mix', () => {
    setPracticePorts({ synth: subsetSynth(EARLY), real: emptyReal });
    for (const seed of [1, 2, 3, 4]) {
      const plan = planMixed({ seed, count: 16, mastery: none, due: [{ key: 'av-block', box: 1, due: 0 }, { key: 'finding:pvc', box: 2, due: 0 }, { key: 'rate', box: 1, due: 0 }] });
      expect(plan.length).toBe(16);
      for (const e of plan) expect(ok(e.family), e.family).toBe(true);
      // the due card whose drill exists is honoured; the others are not planned
      expect(plan.some((e) => e.card === 'rate')).toBe(true);
      expect(plan.some((e) => e.card === 'av-block' || e.card === 'finding:pvc')).toBe(false);
    }
  });

  it('adaptive mix uses real drills for a competency without any synthetic drill', () => {
    // a catalogue with only normal tracings: C8 (occlusion) can only come from real cases — none exist for C8 — while
    // C11 has real report / findings drills
    setPracticePorts({ synth: subsetSynth(['normal']), real: fakeReal });
    const plan = planMixed({ seed: 7, count: 30, mastery: none, due: [] });
    for (const e of plan) expect(ok(e.family), e.family).toBe(true);
    expect(plan.some((e) => getSpec(e.family)?.source === 'real')).toBe(true);
  });

  it('returns an empty plan when nothing is available', () => {
    setPracticePorts({ synth: subsetSynth([]), real: emptyReal });
    expect(planMixed({ seed: 1, count: 10, mastery: none, due: [{ key: 'rate', box: 1, due: 0 }] })).toEqual([]);
    expect(planReviews([{ key: 'rate', box: 1, due: 0 }], 1)).toEqual([]);
    expect(examBlueprint({ length: 20, includeReal: true, seed: 1 })).toEqual([]);
  });

  it('spaced review skips cards whose drill is unavailable but keeps the queue order', () => {
    setPracticePorts({ synth: subsetSynth(EARLY), real: emptyReal });
    const plan = planReviews(
      [
        { key: 'ectopy', box: 1, due: 0 },
        { key: 'finding:lbbb', box: 1, due: 0 },
        { key: 'qtc', box: 3, due: 0 },
      ],
      3,
    );
    expect(plan.map((e) => e.card).sort()).toEqual(['finding:lbbb', 'qtc']);
    expect(plan.find((e) => e.card === 'finding:lbbb')?.focus).toBe('lbbb');
  });

  it('exam: allocation over assessable competencies, full length, every entry generates', async () => {
    setPracticePorts({ synth: subsetSynth(EARLY), real: emptyReal });
    const comps = examCompetencies(false);
    // no artefact / lead-reversal scenario yet: C12 cannot be assessed; occlusion (C8) can
    expect(comps).not.toContain('C12');
    expect(comps).toContain('C8');
    const alloc = examAllocation(20, comps);
    expect(Object.values(alloc).reduce((a, b) => a + b, 0)).toBe(20);
    for (const c of COMPETENCIES) if (!comps.includes(c)) expect(alloc[c]).toBe(0);
    for (const c of comps) expect(alloc[c]).toBeGreaterThanOrEqual(1);
    const plan = examBlueprint({ length: 20, includeReal: false, seed: 11 });
    expect(plan.length).toBe(20);
    for (const e of plan) {
      expect(ok(e.family), e.family).toBe(true);
      await expect(generateItem(e.family, e.seed, e.difficulty)).resolves.toBeDefined();
    }
  });

  it('exam allocation keeps the double weight of the can’t-miss competencies', () => {
    const comps: CompetencyId[] = ['C1', 'C2', 'C8', 'C9'];
    const a = examAllocation(18, comps);
    expect(a.C8).toBeGreaterThan(a.C1);
    expect(a.C9).toBeGreaterThan(a.C2);
    expect(examAllocation(3, comps)).toMatchObject({ C8: 1, C9: 1 });
    expect(Object.values(examAllocation(0, comps)).every((n) => n === 0)).toBe(true);
  });
});

describe('fixes from the real-engine smoke run', () => {
  it('contrast pairs: the look-alike side never declares the pattern asked for', async () => {
    setPracticePorts({ synth: fakeSynth, real: fakeReal });
    // the WPW scenario declares a short PR too: it cannot be the "short PR only" tracing
    expect(scenariosFor('short-pr', 'wpw').map((s) => s.id)).toEqual(['short-pr']);
    setPracticePorts({ synth: subsetSynth(EARLY) });
    expect(availablePairs('conduction').some((p) => p.a === 'wpw')).toBe(false);
    setPracticePorts({ synth: subsetSynth([...EARLY, 'short-pr']) });
    expect(availablePairs('conduction').some((p) => p.a === 'wpw')).toBe(true);
    for (let seed = 1; seed <= 6; seed++) {
      const item = await generateItem('compare-conduction', seed);
      if (item.kind !== 'compare') throw new Error('kind');
      const other = item.key.correct === 'left' ? item.ecg2 : item.ecg;
      expect(other.kind === 'synth' && other.req.scenario).not.toBe('wpw');
    }
  });

  it('speed round: about half normal, never a minor-only tracing', async () => {
    setPracticePorts({ synth: fakeSynth, real: fakeReal });
    const minorOnly = new Set(
      FAKE_SCENARIOS.filter((s) => s.findings.every((f) => ['normal', 'minor'].includes(FINDINGS_SEVERITY(f))) && s.findings.some((f) => FINDINGS_SEVERITY(f) === 'minor')).map((s) => s.id),
    );
    let normal = 0;
    const N = 40;
    for (let seed = 1; seed <= N; seed++) {
      const item = await generateItem('spot', seed);
      if (item.kind !== 'choice') throw new Error('kind');
      if (item.key.correct === 'normal') normal++;
      expect(item.ecg.kind === 'synth' && minorOnly.has(item.ecg.req.scenario)).toBe(false);
    }
    expect(normal / N).toBeGreaterThan(0.3);
    expect(normal / N).toBeLessThan(0.7);
  });

  it('measurement decoys are plausible and distinguishable from the answer', async () => {
    setPracticePorts({ synth: fakeSynth, real: fakeReal });
    for (const fam of ['measure-pr', 'measure-qrs', 'measure-qt', 'measure-rr']) {
      for (let seed = 1; seed <= 8; seed++) {
        const item = await generateItem(fam, seed);
        if (item.kind !== 'measure') throw new Error('kind');
        for (const d of decoysOf(item)) {
          expect(d.ms).toBeGreaterThanOrEqual(20);
          expect(Math.abs(d.ms - item.key.truthMs)).toBeGreaterThan(item.key.toleranceMs);
        }
      }
    }
  });

  it('triage: a Brugada type 1 pattern alone is same-day review; with VT it is act-now', () => {
    expect(triageOf(['brugada-type1', 'sinus-rhythm'])).toBe('major');
    expect(triageOf(['brugada-type1', 'vt-monomorphic'])).toBe('critical');
    expect(triageOf(['stemi-inferior', 'reciprocal-changes'])).toBe('critical');
    expect(triageOf(['normal-ecg', 'sinus-rhythm'])).toBe('routine');
  });

  it('Heart Lab links: the first finding the lab can show, never the generic sinus rhythm', () => {
    expect(labLinkOf(['sinus-rhythm', 'lbbb'])).toEqual({ finding: 'lbbb', href: '#/lab/lbbb' });
    expect(labLinkOf(['normal-ecg', 'sinus-rhythm'])).toBeNull();
    expect(labLinkOf(['juvenile-t'])).toBeNull();
    expect(labLinkOf([])).toBeNull();
  });
});
