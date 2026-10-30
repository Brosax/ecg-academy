/**
 * Fixes from the lesson review of 2026-10-29 (docs/review/defects-2026-10-29.md, section C), on the fake catalogue:
 * occlusion keys for LBBB / pacing / hyperacute T, triage overrides, distractor overlap, family membership (exclude
 * lists), and the strict topic filter of the metabolic / systemic / artefacts families (deterministic, backward
 * compatible ids).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EcgTruth } from '../../../src/core/ecg';
import type { FindingId } from '../../../src/core/findings';
import { createRng } from '../../../src/core/rng';
import { FAMILY_SPECS, familyAvailable, getSpec, topicsOf } from '../../../src/practice/core/families';
import { OVERLAPPING, pickDistractors, SVT_WIDE } from '../../../src/practice/core/gen/choice';
import { GenerationError, specPool, variantAllowed } from '../../../src/practice/core/gen/common';
import { countTimesSix, rateMatchesDial } from '../../../src/practice/core/gen/numeric';
import { stemiLeadsMet, stemiThresholdMv } from '../../../src/practice/core/gen/occlusion';
import { generateItem, parseItemId } from '../../../src/practice/core/generate';
import { HALLMARKS } from '../../../src/practice/core/hallmarks';
import { setPracticePorts } from '../../../src/practice/core/ports';
import { LONG_QT_ACT_NOW_MS, OCCLUSION_CONFOUNDERS, OCCLUSION_FINDINGS, OCCLUSION_MIMICS, occlusionCallOf, triageOf, triageQtc } from '../../../src/practice/core/truth';
import { fakeReal, fakeSynth } from '../fake';
import { validate } from '../validate';

beforeAll(() => setPracticePorts({ synth: fakeSynth, real: fakeReal }));
afterAll(() => setPracticePorts({ synth: null, real: null }));

describe('occlusion calls (C1–C3)', () => {
  it('LBBB and ventricular pacing are confounders, never "not an occlusion"', () => {
    for (const f of ['lbbb', 'paced-rhythm'] as const) {
      const c = occlusionCallOf([f, 'sinus-rhythm']);
      expect(c.call, f).toBe('indeterminate');
      expect(c.reason).toBe('confounder');
      expect(c.mimic).toBeNull();
    }
    expect(occlusionCallOf(['aberrant-conduction', 'lbbb', 'sinus-rhythm']).call).toBe('indeterminate');
    expect(OCCLUSION_MIMICS as readonly string[]).not.toContain('lbbb');
    expect(OCCLUSION_CONFOUNDERS as readonly string[]).toContain('lbbb');
  });

  it('Sgarbossa-positive LBBB is an occlusion, targeted as Sgarbossa, with the wall of its STEMI finding', () => {
    expect(occlusionCallOf(['sgarbossa-positive', 'lbbb', 'stemi-lateral', 'sinus-rhythm'])).toMatchObject({ call: 'occlusion', target: 'sgarbossa-positive', territory: 'lateral', reason: 'sgarbossa' });
    expect(occlusionCallOf(['sgarbossa-positive', 'lbbb', 'stemi-posterior'])).toMatchObject({ territory: 'posterior' });
    expect(occlusionCallOf(['sgarbossa-positive', 'lbbb', 'stemi-anterior'])).toMatchObject({ territory: 'anterior' });
  });

  it('hyperacute T alone is "probable occlusion" → indeterminate; with a STEMI finding it stays an occlusion', () => {
    expect(OCCLUSION_FINDINGS as readonly string[]).not.toContain('hyperacute-t');
    expect(occlusionCallOf(['hyperacute-t', 'sinus-rhythm'])).toMatchObject({ call: 'indeterminate', target: 'hyperacute-t', reason: 'probable' });
    expect(occlusionCallOf(['stemi-anterior', 'hyperacute-t', 'reciprocal-changes'])).toMatchObject({ call: 'occlusion', target: 'stemi-anterior', territory: 'anterior' });
  });

  it('the target follows the declared order (posterior scenario → posterior target and territory)', () => {
    expect(occlusionCallOf(['stemi-posterior', 'stemi-lateral', 'sinus-rhythm'])).toMatchObject({ target: 'stemi-posterior', territory: 'posterior' });
  });

  it('STEMI thresholds follow UDMI 2018 by sex and age, in two contiguous leads', () => {
    expect(stemiThresholdMv('V2', 'male', 52)).toBe(0.2);
    expect(stemiThresholdMv('V3', 'male', 35)).toBe(0.25);
    expect(stemiThresholdMv('V2', 'female', 70)).toBe(0.15);
    expect(stemiThresholdMv('II', 'female', 70)).toBe(0.1);
    // the stemi-anterior-subtle values of the review (V3 +1.3, V2 +1.1, V4 +0.8 mm) do not meet the criterion
    expect(stemiLeadsMet({ V2: 0.11, V3: 0.13, V4: 0.08 }, 'male', 52)).toEqual([]);
    expect(stemiLeadsMet({ V2: 0.25, V3: 0.3, V4: 0.08 }, 'male', 52).sort()).toEqual(['V2', 'V3']);
    // one lead alone is not enough; contiguous groups are aVL–I, II–aVF–III and V1–V6
    expect(stemiLeadsMet({ I: 0.12, aVL: 0.15 }, 'male', 60).sort()).toEqual(['I', 'aVL']);
    expect(stemiLeadsMet({ I: 0.12, aVR: -0.2 }, 'male', 60)).toEqual([]);
    expect(stemiLeadsMet({ III: 0.3 }, 'male', 60)).toEqual([]);
    expect(stemiLeadsMet({ II: 0.15, aVF: 0.2, III: 0.25 }, 'male', 60).sort()).toEqual(['II', 'III', 'aVF']);
  });

  it('occlusion items on LBBB key indeterminate with the ESC / Sgarbossa next step (fake catalogue)', async () => {
    let seen = 0;
    for (let s = 0; s < 120 && seen < 3; s++) {
      const it = await generateItem('occlusion', s, 'classic', { focus: 'lbbb' });
      if (it.kind !== 'occlusion') throw new Error('kind');
      if (it.findings[0] !== 'lbbb') continue;
      seen++;
      expect(it.key.call).toBe('indeterminate');
      expect(it.key.mimic).toBeUndefined();
      expect(it.explanation.en).toContain('Sgarbossa');
      expect(it.explanation.en).toContain('ESC');
      expect(it.explanation.es).toContain('Sgarbossa');
      expect(it.explanation.zh).toContain('Sgarbossa');
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('triage (C5)', () => {
  it('pre-excited AF is act-now although AF and WPW are each "major"', () => {
    expect(triageOf(['atrial-fibrillation', 'wpw'])).toBe('critical');
    expect(triageOf(['atrial-fibrillation'])).toBe('major');
    expect(triageOf(['wpw', 'short-pr', 'sinus-rhythm'])).toBe('major');
  });

  it('long QT is act-now only at QTc ≥ 500 ms (or with torsades)', () => {
    expect(LONG_QT_ACT_NOW_MS).toBe(500);
    expect(triageOf(['long-qt', 'sinus-rhythm'])).toBe('major');
    expect(triageOf(['long-qt', 'sinus-rhythm'], { qtcMs: 480 })).toBe('major');
    expect(triageOf(['long-qt', 'sinus-rhythm'], { qtcMs: 500 })).toBe('critical');
    expect(triageOf(['torsades', 'long-qt'], { qtcMs: 470 })).toBe('critical');
    expect(triageOf(['hypocalcemia', 'long-qt'], { qtcMs: 470 })).toBe('major');
    // unchanged behaviour elsewhere
    expect(triageOf(['brugada-type1', 'sinus-rhythm'])).toBe('major');
    expect(triageOf(['stemi-inferior'])).toBe('critical');
  });

  it('uses Fridericia above 90/min and Bazett otherwise', () => {
    const t = { hrBpm: 120, qtcBazettMs: 520, qtcFridericiaMs: 480 } as Pick<EcgTruth, 'hrBpm' | 'qtcBazettMs' | 'qtcFridericiaMs'>;
    expect(triageQtc(t)).toEqual({ ms: 480, formula: 'fridericia' });
    expect(triageQtc({ ...t, hrBpm: 70 })).toEqual({ ms: 520, formula: 'bazett' });
  });

  it('triage items on long-QT tracings follow the QTc rule', async () => {
    for (let s = 0; s < 40; s++) {
      const it = await generateItem('triage', s, 'classic', { focus: 'long-qt' });
      if (it.kind !== 'choice' || !it.findings.includes('long-qt')) continue;
      expect(['critical', 'major']).toContain(it.key.correct);
      expect(it.explanation.en).toMatch(/QTc ≈ \d+ ms/);
    }
  });
});

describe('family membership (C6–C11)', () => {
  const pool = (id: string) => specPool(getSpec(id)!).map((s) => s.id);

  it('narrow-tachy offers only regular narrow SVTs; irregular / wide rhythms are excluded', () => {
    const spec = getSpec('narrow-tachy')!;
    expect(spec.findings).toEqual(['sinus-tachycardia', 'avnrt', 'avrt', 'atrial-flutter', 'atrial-tachycardia']);
    expect(variantAllowed(spec)(['svt', 'avrt', 'wpw'])).toBe(false);
    expect(variantAllowed(spec)(['svt', 'avrt'])).toBe(true);
    expect(pool('narrow-tachy')).not.toContain('wpw');
  });

  it('irregular excludes paced rhythms and pre-excited AF', () => {
    expect(pool('irregular')).not.toContain('paced-vvi');
    expect(getSpec('irregular')!.exclude).toEqual(expect.arrayContaining(['paced-rhythm', 'wpw']));
  });

  it('territory and max-ST never draw an LBBB / paced tracing', () => {
    expect(pool('territory')).not.toContain('sgarbossa');
    expect(pool('max-st')).not.toContain('sgarbossa');
  });

  it('substrates exclude acquired long QT and torsades', () => {
    for (const id of ['takotsubo', 'cerebral-t', 'hypocalcemia', 'torsades']) expect(pool('substrates')).not.toContain(id);
    expect(pool('substrates')).toContain('long-qt');
  });

  it('brady offers complete AV block, so AV-block-3 tracings are not keyed "junctional escape"', async () => {
    expect(getSpec('brady')!.findings).toContain('av-block-3');
    for (let s = 0; s < 30; s++) {
      const it = await generateItem('brady', s, 'classic', { focus: 'av-block-3' });
      if (it.kind !== 'choice') continue;
      if (it.findings.includes('junctional-escape-rhythm')) {
        // a junctional-escape key is only allowed when the tracing has no complete AV block
        const opts = it.key.options.map((o) => o.id);
        expect(opts).not.toContain('av-block-3');
      }
    }
  });

  it('wide-tachy always offers "SVT with aberrancy or pre-excitation"', async () => {
    expect(getSpec('wide-tachy')!.findings).toEqual(expect.arrayContaining(['wpw', 'aberrant-conduction']));
    for (const s of [1, 2, 3, 4, 5, 6]) {
      const it = await generateItem('wide-tachy', s, 'classic');
      if (it.kind !== 'choice') throw new Error('kind');
      validate(it, 'wide-tachy');
      expect(it.key.options.map((o) => o.id)).toContain(SVT_WIDE);
      expect(it.key.options.map((o) => o.id)).toContain(it.key.correct);
      expect(new Set(it.key.options.map((o) => o.id)).size).toBe(it.key.options.length);
    }
  });

  it('LAE and interatrial block are never each other’s distractor (overlapping definitions)', () => {
    expect(OVERLAPPING['interatrial-block']).toContain('lae');
    const universe: FindingId[] = ['lvh', 'lvh-strain', 'rvh', 'biventricular-hypertrophy', 'lae', 'rae', 'biatrial-abnormality', 'interatrial-block', 'low-voltage'];
    for (let k = 0; k < 50; k++) {
      expect(pickDistractors(createRng(`d${k}`), 'interatrial-block', universe, [], 8)).not.toContain('lae');
      expect(pickDistractors(createRng(`e${k}`), 'lae', universe, [], 8)).not.toContain('interatrial-block');
    }
  });
});

describe('rate items (C8)', () => {
  it('reject draws whose realised rate ignores the dial; the count × 6 lands inside the tolerance', () => {
    const truth = { hrBpm: 37.9 } as EcgTruth;
    expect(rateMatchesDial({ req: { scenario: 'atrial-fibrillation', seed: 1, dials: { ventricularResponse: 75 } }, truth })).toBe(false);
    expect(rateMatchesDial({ req: { scenario: 'atrial-fibrillation', seed: 1, dials: { ventricularResponse: 40 } }, truth })).toBe(true);
    expect(rateMatchesDial({ req: { scenario: 'avnrt', seed: 1 }, truth })).toBe(true);
    expect(countTimesSix({ beats: new Array(7) } as unknown as EcgTruth, 10_000)).toBe(42);
  });

  it('rate-atrial draws atrial tachyarrhythmias and AV blocks', async () => {
    const kinds = new Set<string>();
    for (let s = 0; s < 24; s++) {
      const it = await generateItem('rate-atrial', s, 'classic');
      if (it.ecg.kind !== 'synth') continue;
      kinds.add(/av-block|escape/.test(it.ecg.req.scenario) ? 'av' : 'atrial');
    }
    expect(kinds).toEqual(new Set(['av', 'atrial']));
  });
});

describe('explanation text (C9–C11)', () => {
  it('hallmarks quote current criteria', () => {
    expect(HALLMARKS.avnrt?.en).toContain('RP′ < 90 ms');
    expect(HALLMARKS.avnrt?.en).not.toContain('70 ms');
    expect(HALLMARKS.avrt?.en).toContain('RP′ ≥ 90 ms');
    expect(HALLMARKS.lvh?.en).toContain('> 35 mm');
    expect(HALLMARKS.lvh?.en).not.toContain('≥ 35 mm');
    expect(HALLMARKS.lae?.en).not.toContain('deep, wide');
    expect(HALLMARKS.lae?.en).toContain('1 mm deep');
    expect(HALLMARKS['early-repolarization']?.en).not.toContain('concave');
    expect(HALLMARKS['early-repolarization']?.en).toContain('not required');
    expect(HALLMARKS['stemi-inferior']?.en).toContain('circumflex');
    for (const id of ['avnrt', 'avrt', 'lvh', 'lae', 'early-repolarization', 'stemi-inferior', 'stemi-posterior'] as const) {
      const h = HALLMARKS[id];
      expect(h?.zh.length, id).toBeGreaterThan(0);
      expect(h?.es.length, id).toBeGreaterThan(0);
    }
  });
});

describe('topic filter (C12)', () => {
  const TOPIC_FAMILIES = ['metabolic', 'systemic', 'artefacts'] as const;

  it('only the metabolic / systemic / artefacts families take a topic', () => {
    expect(FAMILY_SPECS.filter((s) => s.topics).map((s) => s.id).sort()).toEqual([...TOPIC_FAMILIES].sort());
    expect(topicsOf('rate')).toEqual([]);
    for (const id of TOPIC_FAMILIES) {
      expect(familyAvailable(id)).toBe(true);
      expect(topicsOf(id).length, id).toBeGreaterThanOrEqual(2);
      for (const t of topicsOf(id)) expect(getSpec(id)!.findings).toContain(t);
    }
  });

  it('every topic yields items about that topic, deterministic per seed, with a reproducible id', async () => {
    for (const fam of TOPIC_FAMILIES) {
      for (const topic of topicsOf(fam)) {
        for (const seed of [1, 7]) {
          const a = await generateItem(fam, seed, 'subtle', { topic });
          const b = await generateItem(fam, seed, 'subtle', { topic });
          expect(a).toEqual(b);
          validate(a, fam, topic);
          if (a.kind !== 'choice') throw new Error('kind');
          expect(a.key.correct, `${fam}/${topic}/${seed}`).toBe(topic);
          expect(a.id).toBe(`${fam}:subtle:${seed}:${topic}`);
          const p = parseItemId(a.id);
          expect(p).toEqual({ family: fam, difficulty: 'subtle', seed, topic });
          const c = await generateItem(p!.family, p!.seed, p!.difficulty, { topic: p!.topic });
          expect(c).toEqual(a);
        }
      }
    }
  });

  it('is backward compatible: without a topic the ids and items are unchanged in shape', async () => {
    const a = await generateItem('metabolic', 3, 'classic');
    expect(a.id).toBe('metabolic:classic:3');
    expect(parseItemId(a.id)).toEqual({ family: 'metabolic', difficulty: 'classic', seed: 3 });
    expect(await generateItem('metabolic', 3, 'classic', {})).toEqual(a);
  });

  it('fails loudly for a family without topics or a topic outside the family', async () => {
    await expect(generateItem('rate', 1, 'classic', { topic: 'hyperkalemia' })).rejects.toBeInstanceOf(GenerationError);
    await expect(generateItem('metabolic', 1, 'classic', { topic: 'pericarditis' })).rejects.toBeInstanceOf(GenerationError);
    expect(parseItemId('metabolic:classic:3:not-a-finding')).toBeNull();
  });
});
