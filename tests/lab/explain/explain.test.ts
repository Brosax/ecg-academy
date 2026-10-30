import { describe, expect, it } from 'vitest';
import type { Lang } from '../../../src/lab/app/store';
import {
  captionSentence, captionSentences, contextSentence, deflectionOf, dirPhrase, directionsOf, explainLeadAt, explainLeadMorphology, explainSegment, ISO_MV, patternString,
  qrsRuns,
} from '../../../src/lab/explain';
import type { Deflection } from '../../../src/lab/explain';
import { te } from '../../../src/lab/i18n/explain';
import { en as explainEn } from '../../../src/lab/i18n/explain/en';
import { es as explainEs } from '../../../src/lab/i18n/explain/es';
import { zh as explainZh } from '../../../src/lab/i18n/explain/zh';
import { appToFrank } from '../../../src/lab/sim/frame';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import { LEADS, WAVE_SEGMENTS } from '../../../src/lab/sim/types';
import type { FrankVec, LeadName } from '../../../src/lab/sim/types';

const LANGS: readonly Lang[] = ['zh', 'en', 'es'];
const engine = new StubEngine();
const cycle = engine.cycleAt(1300)!;

/**
 * Independent computation: H_A, H_V from sampleH, the projector's atrial / ventricular rows (mA, mV — equal in the MVP
 * but allowed to differ later), and the displayed sample.
 */
function independent(lead: LeadName, t: number) {
  const a = new Float32Array(3), v = new Float32Array(3);
  engine.sampleH(t, 1, a, v);
  const H: FrankVec = [a[0] + v[0], a[1] + v[1], a[2] + v[2]];
  const i = LEADS.indexOf(lead) * 3, { mA, mV } = engine.projector;
  const dot = mA[i] * a[0] + mA[i + 1] * a[1] + mA[i + 2] * a[2] + mV[i] * v[0] + mV[i + 1] * v[1] + mV[i + 2] * v[2];
  const out = new Float32Array(12);
  engine.sampleLeads(t, 1, out);
  return { H, dot, shown: out[LEADS.indexOf(lead)] };
}

const WORD = { up: 'word.up', down: 'word.down', iso: 'word.iso' } as const;

describe('explainLeadAt — every lead × segment × language', () => {
  const instants: { seg: string; t: number }[] = [];
  for (const s of cycle.segments) for (const f of [0.1, 0.5, 0.9]) instants.push({ seg: s.seg, t: s.t0 + f * (s.t1 - s.t0) });

  it('covers all six segments of the stub cycle', () => {
    expect(new Set(instants.map((i) => i.seg))).toEqual(new Set(WAVE_SEGMENTS));
  });

  for (const lang of LANGS)
    it(`returns non-empty, sign-consistent text (${lang})`, () => {
      let checked = 0;
      for (const { seg, t } of instants)
        for (const lead of LEADS) {
          const ex = explainLeadAt(engine, lead, t, lang);
          const ind = independent(lead, t);
          expect(ex.text.length).toBeGreaterThan(40);
          expect(ex.segment).toBe(seg);
          // value quoted = the displayed sample = L_A·H_A + L_V·H_V
          expect(ex.valueMv).toBeCloseTo(ind.shown, 4);
          expect(ind.dot).toBeCloseTo(ind.shown, 4);
          if (Math.abs(Math.abs(ind.shown) - ISO_MV) > 1e-3) {
            expect(ex.deflection).toBe(deflectionOf(ind.dot));
            checked++;
          }
          // the sentence names exactly the computed deflection
          for (const d of ['up', 'down', 'iso'] as Deflection[]) {
            const w = te.in(lang, WORD[d]);
            if (d === ex.deflection) expect(ex.text).toContain(w);
            else expect(ex.text).not.toContain(w);
          }
          // direction words agree with the Frank components of H (+X left, +Y inferior, +Z posterior)
          for (const d of ex.hDirs) {
            const [x, y, z] = ind.H;
            const ok = { left: x > 0, right: x < 0, inferior: y > 0, superior: y < 0, posterior: z > 0, anterior: z < 0 }[d];
            expect(ok, `${lead} ${seg} ${d}`).toBe(true);
          }
          // wave names agree with the sign
          if (ex.wave && ex.wave !== 'P' && ex.wave !== 'T') {
            const positive = /^[Rr]/.test(ex.wave);
            expect(positive).toBe(ex.deflection === 'up');
          }
          if (ex.angleDeg !== null) expect(ex.angleDeg < 90).toBe(ind.dot > 0);
        }
      // 18 instants × 12 leads = 216, minus the few that sit within 1 µV of the threshold
      expect(checked).toBeGreaterThan(200);
    });

  it('describes the QRS phase from model timing', () => {
    const qrs = cycle.segments.find((s) => s.seg === 'QRS')!;
    expect(explainLeadAt(engine, 'V1', qrs.t0 + 2, 'en').qrsPart).toBe('early');
    expect(explainLeadAt(engine, 'V1', qrs.t0 + 2, 'en').text).toContain('septum');
    expect(explainLeadAt(engine, 'V1', qrs.t1 - 2, 'en').qrsPart).toBe('late');
  });
});

describe('explainLeadAt parts (causal chain on the homepage)', () => {
  const ts = cycle.segments.map((s) => (s.t0 + s.t1) / 2);
  for (const lang of LANGS)
    it(`regroups exactly the sentences, one group per step (${lang})`, () => {
      for (const t of ts)
        for (const lead of LEADS) {
          const ex = explainLeadAt(engine, lead, t, lang);
          const p = ex.parts;
          expect([...p.context, ...p.vector, ...p.axis, ...p.projection, ...p.result]).toEqual(ex.sentences);
          expect(p.vector).toHaveLength(1);
          expect(p.axis).toHaveLength(1);
          expect(p.result).toHaveLength(1);
          // the projection step quotes θ whenever there is a heart vector to project
          if (ex.angleDeg !== null) expect(p.projection.length).toBeGreaterThan(0);
          // the caption under the heart is the first context sentence, lead-independent
          expect(contextSentence(engine, t, lang)).toBe(p.context[0]);
        }
    });
});

describe('caption under the heart (cap.* = short ctx.*)', () => {
  const dicts: Record<Lang, Readonly<Record<string, string>>> = { zh: explainZh, en: explainEn, es: explainEs };

  it('has a cap.* key for every ctx.* key, in every language', () => {
    for (const lang of LANGS) {
      const keys = Object.keys(dicts[lang]);
      const ctx = keys.filter((k) => k.startsWith('ctx.'));
      expect(ctx.length).toBeGreaterThan(0);
      for (const k of ctx) expect(keys, `${lang}:${k}`).toContain(k.replace(/^ctx\./, 'cap.'));
      expect(keys.filter((k) => k.startsWith('cap.'))).toHaveLength(ctx.length);
    }
  });

  it('keeps every en / es caption within 110 characters', () => {
    for (const lang of ['en', 'es'] as const)
      for (const [k, v] of Object.entries(dicts[lang])) if (k.startsWith('cap.')) expect(v.length, `${lang}:${k}`).toBeLessThanOrEqual(110);
  });

  it('returns the cap.* sentence of the segment (P, PR, QRS) and keeps ctx.* as the long form', () => {
    const mid = (seg: string) => {
      const s = cycle.segments.find((x) => x.seg === seg)!;
      return (s.t0 + s.t1) / 2;
    };
    for (const lang of LANGS) {
      expect(captionSentence(engine, mid('P'), lang)).toBe(te.in(lang, 'cap.P'));
      expect(captionSentence(engine, mid('PR'), lang)).toBe(te.in(lang, 'cap.PR'));
      const qrs = (['cap.QRS.early', 'cap.QRS.mid', 'cap.QRS.late'] as const).map((k) => te.in(lang, k));
      expect(qrs).toContain(captionSentence(engine, mid('QRS'), lang));
      for (const seg of ['P', 'PR', 'QRS']) {
        const t = mid(seg);
        expect(captionSentences(engine, t, lang)).toEqual({ caption: captionSentence(engine, t, lang), context: contextSentence(engine, t, lang) });
      }
    }
  });
});

describe('explainSegment / explainLeadMorphology', () => {
  it('explains every segment in every language, with this beat’s timing', () => {
    for (const lang of LANGS)
      for (const seg of WAVE_SEGMENTS) {
        const ex = explainSegment(seg, lang, cycle);
        expect(ex.text.length).toBeGreaterThan(60);
        expect(ex.durationMs).not.toBeNull();
        expect(ex.sentences.length).toBeGreaterThanOrEqual(2);
      }
    // mechanics: ejection overlaps the ST segment
    expect(explainSegment('ST', 'en', cycle).mech).toContain('ejection');
  });

  it('measures P / QRS / T of each lead consistently with the projected trace', () => {
    for (const lang of LANGS)
      for (const lead of LEADS) {
        const m = explainLeadMorphology(engine, lead, cycle, lang);
        expect(m.text.length).toBeGreaterThan(40);
        expect(m.qrs).not.toBeNull();
        expect(m.qrs!.pattern.length).toBeGreaterThan(0);
        if (m.qrs!.main === 'pos') expect(m.qrs!.area).toBeGreaterThan(0);
        if (m.qrs!.main === 'neg') expect(m.qrs!.area).toBeLessThan(0);
        // mean-vector angle < 90° ⇔ positive net area (projection of the mean vector = mean of the projection)
        if (Math.abs(m.qrs!.area) > 1) expect(m.qrs!.angleDeg! < 90).toBe(m.qrs!.area > 0);
      }
    // aVR looks at the heart from the right shoulder: predominantly negative QRS
    expect(explainLeadMorphology(engine, 'aVR', cycle, 'en').qrs!.main).toBe('neg');
  });
});

describe('vocabulary', () => {
  it('names Frank directions (inferior = +Y) and agrees with lead behaviour', () => {
    expect(directionsOf([0, 1, 0])).toEqual(['inferior']);
    expect(directionsOf(appToFrank([0, -1, 0]))).toEqual(['inferior']);
    expect(directionsOf(appToFrank([0, 0, 1]))).toEqual(['anterior']);
    expect(directionsOf([1, 0.8, 0.5])).toEqual(['left', 'inferior', 'posterior']);
  });
  it('joins direction words per language', () => {
    const d = ['left', 'inferior', 'posterior'] as const;
    expect(dirPhrase('zh', d)).toBe('左下后方');
    expect(dirPhrase('en', d)).toBe('leftward, inferiorly and posteriorly');
    expect(dirPhrase('es', d)).toBe('hacia la izquierda, abajo y atrás');
  });
  it('labels QRS deflections (q, R, s / rS / QS)', () => {
    const seq = (...parts: [number, number][]) => parts.flatMap(([v, n]) => Array<number>(n).fill(v));
    expect(patternString(qrsRuns(seq([0, 2], [-0.1, 6], [1.2, 20], [-0.2, 8], [0, 3])))).toBe('qRs');
    expect(patternString(qrsRuns(seq([0.15, 6], [-1.1, 20])))).toBe('rS');
    expect(patternString(qrsRuns(seq([-0.4, 10], [-1.0, 10])))).toBe('QS');
    expect(patternString(qrsRuns(seq([0.5, 8], [-0.6, 8], [0.7, 8])))).toBe('RSR′');
    // a 1-sample blip is noise, not a wave
    expect(patternString(qrsRuns(seq([1, 10], [-0.5, 1], [1, 10])))).toBe('R');
  });
});
