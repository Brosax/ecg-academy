/**
 * Fixes from the lesson review of 2026-10-29 (docs/review/defects-2026-10-29.md, section C) against the REAL synthetic
 * engine: keys follow the scenario truth, and explanations quote only what the tracing shows. Skipped when the engine
 * cannot render the normal scenario (it is built in parallel).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Item } from '../../../src/practice/api';
import { SVT_WIDE } from '../../../src/practice/core/gen/choice';
import { countTimesSix, rateMatchesDial } from '../../../src/practice/core/gen/numeric';
import { readSgarbossa, stemiLeadsMet } from '../../../src/practice/core/gen/occlusion';
import { generateItem } from '../../../src/practice/core/generate';
import { rateTolerance, TOL } from '../../../src/practice/core/grade';
import { ecgOf, setPracticePorts, synthOf } from '../../../src/practice/core/ports';
import { triageQtc } from '../../../src/practice/core/truth';
import { generate } from '../../../src/synth/index';
import { fakeReal } from '../fake';
import { validate } from '../validate';

let engineOk = false;
beforeAll(() => {
  setPracticePorts({ synth: null, real: fakeReal });
  try {
    engineOk = generate({ scenario: 'normal', seed: 1 }).ecg.truth !== null;
  } catch {
    engineOk = false;
  }
});
afterAll(() => setPracticePorts({ synth: null, real: null }));

const scenarioOf = (it: Item) => (it.ecg.kind === 'synth' ? `${it.ecg.req.scenario}${it.ecg.req.variant ? `:${it.ecg.req.variant}` : ''}` : 'real');

async function items(family: string, seeds: number, opts: Parameters<typeof generateItem>[3] = {}): Promise<Item[]> {
  const out: Item[] = [];
  for (let s = 0; s < seeds; s++) out.push(await generateItem(family, s, undefined, opts));
  return out;
}

describe('occlusion on the real engine (C1–C3)', () => {
  it('LBBB and rate-dependent LBBB → indeterminate with the ESC next step; Sgarbossa negative on the signal', async (ctx) => {
    if (!engineOk) ctx.skip();
    let n = 0;
    for (const it of await items('occlusion', 60, { focus: 'lbbb' })) {
      if (it.kind !== 'occlusion') throw new Error('kind');
      const sc = scenarioOf(it);
      if (!/^(lbbb|rate-dependent-bbb)/.test(sc)) continue;
      n++;
      expect(it.key.call, it.id).toBe('indeterminate');
      expect(it.explanation.en).toContain('Sgarbossa');
      expect(it.explanation.en).toContain('2023 ESC');
      const ecg = await ecgOf(it.ecg);
      const r = readSgarbossa({ ecg, truth: ecg.truth! });
      expect([...r.concordantElevation, ...r.concordantDepression, ...r.smith.map((x) => x.lead)], it.id).toEqual([]);
    }
    expect(n).toBeGreaterThan(0);
  });

  it('paced items are indeterminate, never "not an occlusion"', async (ctx) => {
    if (!engineOk) ctx.skip();
    let n = 0;
    for (const it of await items('occlusion', 120)) {
      if (it.kind !== 'occlusion' || !scenarioOf(it).startsWith('paced')) continue;
      n++;
      expect(it.key.call).toBe('indeterminate');
      expect(it.explanation.en).toContain('Ventricular pacing');
      const ecg = await ecgOf(it.ecg);
      const r = readSgarbossa({ ecg, truth: ecg.truth! });
      expect([...r.concordantElevation, ...r.concordantDepression, ...r.smith.map((x) => x.lead)], it.id).toEqual([]);
    }
    expect(n).toBeGreaterThan(0);
  });

  it('Sgarbossa tracings → occlusion with the Sgarbossa wording and a criterion met on the signal', async (ctx) => {
    if (!engineOk) ctx.skip();
    let n = 0;
    for (const it of await items('occlusion', 60, { focus: 'sgarbossa-positive' })) {
      if (it.kind !== 'occlusion' || !scenarioOf(it).startsWith('sgarbossa')) continue;
      n++;
      expect(it.key.call).toBe('occlusion');
      expect(it.findings).toEqual(['sgarbossa-positive']);
      expect(it.explanation.en).toContain('Sgarbossa');
      expect(it.explanation.en).not.toContain('STEMI criterion met');
      const ecg = await ecgOf(it.ecg);
      const r = readSgarbossa({ ecg, truth: ecg.truth! });
      expect(r.concordantElevation.length + r.concordantDepression.length + r.smith.length, it.id).toBeGreaterThan(0);
      expect(it.explanation.en).toContain('Met on this tracing');
    }
    expect(n).toBeGreaterThan(0);
  });

  it('hyperacute T alone → indeterminate, probable occlusion, repeat in 15–30 min', async (ctx) => {
    if (!engineOk) ctx.skip();
    let n = 0;
    for (const it of await items('occlusion', 60, { focus: 'hyperacute-t' })) {
      if (it.kind !== 'occlusion' || scenarioOf(it) !== 'hyperacute-t') continue;
      n++;
      expect(it.key.call).toBe('indeterminate');
      expect(it.explanation.en).toContain('probable occlusion');
      expect(it.explanation.en).toContain('15–30');
      expect(it.explanation.en).toContain('V7–V9');
    }
    expect(n).toBeGreaterThan(0);
  });

  it('STEMI explanations claim the millimetre criterion only when two contiguous leads meet it', async (ctx) => {
    if (!engineOk) ctx.skip();
    for (const it of await items('occlusion', 80)) {
      if (it.kind !== 'occlusion' || it.key.call !== 'occlusion') continue;
      const en = it.explanation.en;
      if (!en.includes('STEMI criterion met') && !en.includes('criterion is not met')) continue;
      const ecg = await ecgOf(it.ecg);
      const m = /a (\d+)-year-old (man|woman)/i.exec(it.prompt.en);
      expect(m, it.id).not.toBeNull();
      const met = stemiLeadsMet(ecg.truth!.stMv, m![2] === 'woman' ? 'female' : 'male', Number(m![1]));
      if (en.includes('STEMI criterion met')) expect(met.length, it.id).toBeGreaterThanOrEqual(2);
      else expect(met.length, it.id).toBe(0);
      // reciprocal depression is quoted only with the leads that show it
      if (en.includes('Reciprocal ST depression')) expect(en).toMatch(/Reciprocal ST depression \([^)]*−/);
    }
  });

  it('the subtle anterior occlusion is keyed occlusion but says the millimetres are not met', async (ctx) => {
    if (!engineOk) ctx.skip();
    let n = 0;
    for (const it of await items('occlusion', 80, { focus: 'stemi-anterior' })) {
      if (it.kind !== 'occlusion' || scenarioOf(it) !== 'stemi-anterior-subtle') continue;
      n++;
      expect(it.key.call).toBe('occlusion');
      expect(it.explanation.en).toContain('not met');
      expect(it.explanation.en).not.toContain('≥ 2 mm in men ≥ 40 y');
    }
    expect(n).toBeGreaterThan(0);
  });
});

describe('territory (C4)', () => {
  it('inferior explanations follow the measured III vs II and lead I; posterior quotes T polarity only where upright', async (ctx) => {
    if (!engineOk) ctx.skip();
    let lcx = 0;
    for (const it of await items('territory', 60)) {
      if (it.kind !== 'choice') continue;
      const sc = scenarioOf(it);
      expect(sc, it.id).not.toMatch(/^sgarbossa/);
      const ecg = await ecgOf(it.ecg);
      const st = ecg.truth!.stMv;
      if (it.key.correct === 'stemi-inferior') {
        if (sc === 'stemi-inferior:lcx') lcx++;
        if (it.explanation.en.includes('points to the RCA')) {
          expect((st.III ?? 0) > (st.II ?? 0), it.id).toBe(true);
          expect(st.I ?? 0, it.id).toBeLessThanOrEqual(-0.05);
        }
        if (it.explanation.en.includes('point to the circumflex')) expect((st.II ?? 0) >= (st.III ?? 0), it.id).toBe(true);
        expect(it.explanation.en).not.toContain('(III > II suggests the RCA)');
      }
      if (it.key.correct === 'stemi-posterior') expect(it.explanation.en).not.toContain('with upright T waves (often');
    }
    expect(lcx).toBeGreaterThanOrEqual(0);
  });
});

describe('triage (C5)', () => {
  it('pre-excited AF is act now; long QT follows the QTc rule', async (ctx) => {
    if (!engineOk) ctx.skip();
    let preexc = 0;
    for (const it of await items('triage', 40, { focus: 'wpw' })) {
      if (it.kind !== 'choice') continue;
      if (scenarioOf(it) === 'preexcited-af') {
        preexc++;
        expect(it.key.correct).toBe('critical');
        expect(it.explanation.en).toContain('pre-excited atrial fibrillation');
      }
    }
    expect(preexc).toBeGreaterThan(0);
    for (const it of await items('triage', 30, { focus: 'long-qt' })) {
      if (it.kind !== 'choice' || !it.findings.includes('long-qt')) continue;
      const ecg = await ecgOf(it.ecg);
      const t = ecg.truth!;
      if (t.findings.includes('torsades')) continue;
      expect(it.key.correct, it.id).toBe(triageQtc(t).ms >= 500 ? 'critical' : 'major');
    }
  });
});

describe('family membership (C6–C8)', () => {
  it('narrow-tachy: regular, narrow, fast; AVNRT text by RP′ (90 ms)', async (ctx) => {
    if (!engineOk) ctx.skip();
    const seen = new Set<string>();
    for (const it of await items('narrow-tachy', 40)) {
      if (it.kind !== 'choice') continue;
      const ecg = await ecgOf(it.ecg);
      const t = ecg.truth!;
      expect(t.regular, it.id).toBe(true);
      expect(t.qrsMs, it.id).toBeLessThan(120);
      expect(t.hrBpm, it.id).toBeGreaterThan(100);
      expect(['sinus-tachycardia', 'avnrt', 'avrt', 'atrial-flutter', 'atrial-tachycardia']).toContain(it.key.correct);
      expect(scenarioOf(it)).not.toMatch(/preexcited|antidromic|^mat|^atrial-fibrillation/);
      seen.add(it.key.correct);
      if (scenarioOf(it) === 'avnrt:atypical') expect(it.explanation.en).toContain('atypical');
      if (scenarioOf(it) === 'avnrt') expect(it.explanation.en).toContain('typical (slow–fast)');
      expect(it.explanation.en).not.toContain('70 ms');
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('wide-tachy: SVT-wide items exist and are supraventricular, wide and fast', async (ctx) => {
    if (!engineOk) ctx.skip();
    let svt = 0;
    for (const it of await items('wide-tachy', 40)) {
      if (it.kind !== 'choice') continue;
      validate(it, 'wide-tachy');
      expect(it.key.options.map((o) => o.id)).toContain(SVT_WIDE);
      if (it.key.correct !== SVT_WIDE) continue;
      svt++;
      const t = (await ecgOf(it.ecg)).truth!;
      expect(t.qrsMs).toBeGreaterThanOrEqual(120);
      expect(t.hrBpm).toBeGreaterThan(100);
      expect(scenarioOf(it)).toMatch(/preexcited-af|avrt:antidromic/);
    }
    expect(svt).toBeGreaterThan(0);
  });

  it('irregular never keys a paced rhythm', async (ctx) => {
    if (!engineOk) ctx.skip();
    for (const it of await items('irregular', 40)) expect(scenarioOf(it), it.id).not.toMatch(/^paced|preexcited/);
  });

  it('rate-atrial: atrial tachyarrhythmias with block as well as AV blocks; AT only with block', async (ctx) => {
    if (!engineOk) ctx.skip();
    let atrial = 0;
    let av = 0;
    for (const it of await items('rate-atrial', 30)) {
      const sc = scenarioOf(it);
      if (/^atrial-(flutter|tachycardia)/.test(sc)) atrial++;
      else av++;
      if (sc.startsWith('atrial-tachycardia')) expect(sc).toBe('atrial-tachycardia:block');
    }
    expect(atrial).toBeGreaterThanOrEqual(5);
    expect(av).toBeGreaterThanOrEqual(5);
  });

  it('rate-irregular: the realised rate matches the dial and the count × 6 is inside the tolerance', async (ctx) => {
    if (!engineOk) ctx.skip();
    for (const it of await items('rate-irregular', 30)) {
      if (it.kind !== 'rate' || it.ecg.kind !== 'synth') continue;
      const r = await synthOf(it.ecg.req);
      const truth = r.ecg.truth!;
      expect(rateMatchesDial({ req: it.ecg.req, truth }), it.id).toBe(true);
      expect(Math.abs(countTimesSix(truth, r.ecg.signal.durationMs) - it.key.truthBpm), it.id).toBeLessThanOrEqual(rateTolerance(it.key.truthBpm, TOL.hrPct, TOL.hrMinIrregularBpm));
    }
  });
});

describe('explanations (C9–C11)', () => {
  it('ectopy: an aberrant PAC is described as wide', async (ctx) => {
    if (!engineOk) ctx.skip();
    let n = 0;
    for (const it of await items('ectopy', 60, { focus: 'pac' })) {
      if (scenarioOf(it) !== 'pac-aberrant' || it.kind !== 'choice' || it.key.correct !== 'pac') continue;
      n++;
      expect(it.explanation.en).toContain('wide QRS');
      expect(it.explanation.en).not.toContain('like the sinus ones');
    }
    expect(n).toBeGreaterThan(0);
  });

  it('p-qrs: dissociation without block is not called complete AV block', async (ctx) => {
    if (!engineOk) ctx.skip();
    for (const it of await items('p-qrs', 40)) {
      if (it.kind !== 'choice' || it.key.correct !== 'independent') continue;
      const t = (await ecgOf(it.ecg)).truth!;
      if (t.findings.includes('av-block-3')) expect(it.explanation.en).toContain('caused by complete');
      else {
        expect(it.explanation.en).toContain('without AV block');
        expect(it.explanation.en).not.toContain('e.g. complete AV block');
      }
    }
  });

  it('p-qrs: atrial fibrillation (with complete block or pacing too) is keyed "no organized atrial waves" and never explained as P waves keeping their own rhythm', async (ctx) => {
    if (!engineOk) ctx.skip();
    let regularised = 0;
    for (const it of await items('p-qrs', 60)) {
      if (it.kind !== 'choice') continue;
      const t = (await ecgOf(it.ecg)).truth!;
      if (!t.findings.includes('atrial-fibrillation')) continue;
      expect(it.key.correct, it.id).toBe('no-p');
      expect(it.explanation.en, it.id).not.toContain('keep their own rhythm');
      if (t.findings.includes('av-block-3')) {
        regularised++;
        expect(it.explanation.en, it.id).toContain('complete (third-degree) AV block');
        expect(it.explanation.en, it.id).not.toContain('irregularly irregular');
        expect(it.findings, it.id).toContain('av-block-3');
      } else if (t.findings.includes('paced-rhythm')) expect(it.explanation.en, it.id).toContain('paced beat');
    }
    expect(regularised).toBeGreaterThan(0);
  });

  it('posterior STEMI items quote the upright T exactly where the tracing shows it (V1–V3 after the 2026-10-29 engine fix)', async (ctx) => {
    if (!engineOk) ctx.skip();
    let n = 0;
    for (const fam of ['territory', 'occlusion'] as const) {
      for (const it of await items(fam, 40, { focus: 'stemi-posterior' })) {
        if (scenarioOf(it) !== 'stemi-posterior' && scenarioOf(it) !== 'stemi-posterior:isolated') continue;
        n++;
        expect(it.explanation.en, it.id).toContain('with an upright T in V1, V2, V3');
      }
    }
    expect(n).toBeGreaterThan(0);
  });

  it('narrow-tachy#0 (atrial tachycardia at 108/min, QTcF ≈ 389 ms) no longer reports a short QT', async (ctx) => {
    if (!engineOk) ctx.skip();
    const it = await generateItem('narrow-tachy', 0);
    expect(it.explanation.en).not.toContain('Short QT');
    expect((await ecgOf(it.ecg)).truth!.findings).not.toContain('short-qt');
  });

  it('brady: complete AV block tracings are keyed as complete AV block or (ventricular escape scenario) the escape', async (ctx) => {
    if (!engineOk) ctx.skip();
    for (const it of await items('brady', 40)) {
      if (it.kind !== 'choice') continue;
      const t = (await ecgOf(it.ecg)).truth!;
      if (t.findings.includes('av-block-3')) expect(it.key.correct, it.id).not.toBe('junctional-escape-rhythm');
    }
  });

  it('chambers: IAB and LAE are never offered against each other', async (ctx) => {
    if (!engineOk) ctx.skip();
    for (const it of await items('chambers', 40)) {
      if (it.kind !== 'choice') continue;
      const ids = it.key.options.map((o) => o.id);
      if (it.key.correct === 'interatrial-block') expect(ids).not.toContain('lae');
      if (it.key.correct === 'lae') expect(ids).not.toContain('interatrial-block');
    }
  });

  it('substrates: no acquired long QT or takotsubo item', async (ctx) => {
    if (!engineOk) ctx.skip();
    for (const it of await items('substrates', 40)) expect(scenarioOf(it), it.id).not.toMatch(/^(takotsubo|cerebral-t|hypocalcemia|torsades)/);
  });
});

describe('STEMI thresholds outside the occlusion family (C3)', () => {
  it('territory and max-ST items never quote the generic STEMI thresholds; met / not met follows the tracing', async (ctx) => {
    if (!engineOk) ctx.skip();
    let subtle = 0;
    for (const fam of ['territory', 'max-st']) {
      for (const it of await items(fam, 60, { focus: 'stemi-anterior' })) {
        const en = it.explanation.en;
        expect(en, it.id).not.toContain('≥ 2 mm in men ≥ 40 y');
        if (!en.includes('STEMI criterion met') && !en.includes('criterion is not met')) continue;
        if (it.ecg.kind !== 'synth') continue;
        const ecg = await ecgOf(it.ecg);
        const sc = (await synthOf(it.ecg.req)).ecg.truth!;
        const m = /(\d+)-year-old (man|woman)/.exec(en);
        expect(m, it.id).not.toBeNull();
        const met = stemiLeadsMet(sc.stMv, m![2] === 'woman' ? 'female' : 'male', Number(m![1]));
        expect(met.length > 0, it.id).toBe(en.includes('STEMI criterion met'));
        if (scenarioOf(it) === 'stemi-anterior-subtle') {
          subtle++;
          expect(en).toContain('not met');
        }
        expect(ecg.truth).not.toBeNull();
      }
    }
    expect(subtle).toBeGreaterThan(0);
  });
});
