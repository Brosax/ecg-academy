import { describe, expect, it } from 'vitest';
import * as explainEn from '../../../src/lab/i18n/explain/en';
import * as explainEs from '../../../src/lab/i18n/explain/es';
import * as explainZh from '../../../src/lab/i18n/explain/zh';
import * as modesEn from '../../../src/lab/i18n/modes/en';
import * as modesEs from '../../../src/lab/i18n/modes/es';
import * as modesZh from '../../../src/lab/i18n/modes/zh';
import * as quizEn from '../../../src/lab/i18n/quiz/en';
import * as quizEs from '../../../src/lab/i18n/quiz/es';
import * as quizZh from '../../../src/lab/i18n/quiz/zh';
import * as shellEn from '../../../src/lab/i18n/shell/en';
import * as shellEs from '../../../src/lab/i18n/shell/es';
import * as shellZh from '../../../src/lab/i18n/shell/zh';
import * as tourEn from '../../../src/lab/i18n/tour/en';
import * as tourEs from '../../../src/lab/i18n/tour/es';
import * as tourZh from '../../../src/lab/i18n/tour/zh';
import * as view3dEn from '../../../src/lab/i18n/view3d/en';
import * as view3dEs from '../../../src/lab/i18n/view3d/es';
import * as view3dZh from '../../../src/lab/i18n/view3d/zh';

type Dict = Record<string, string>;
const MODULES: Record<string, [Dict, Dict, Dict]> = {
  explain: [explainZh.zh, explainEn.en, explainEs.es],
  modes: [modesZh.zh, modesEn.en, modesEs.es],
  quiz: [quizZh.zh, quizEn.en, quizEs.es],
  shell: [shellZh.zh, shellEn.en, shellEs.es],
  tour: [tourZh.zh, tourEn.en, tourEs.es],
  view3d: [view3dZh.zh, view3dEn.en, view3dEs.es],
};

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('module dictionaries (zh / en / es)', () => {
  for (const [name, [zh, en, es]] of Object.entries(MODULES))
    it(`${name}: same keys, no empty strings, same {placeholders}`, () => {
      const keys = Object.keys(zh).sort();
      expect(Object.keys(en).sort()).toEqual(keys);
      expect(Object.keys(es).sort()).toEqual(keys);
      for (const k of keys) {
        // separators ('list.sep', 'sentence.sep') are legitimately whitespace or empty
        if (!k.endsWith('.sep')) for (const d of [zh, en, es]) expect(d[k].trim().length, `${name}:${k}`).toBeGreaterThan(0);
        expect(params(en[k]), `${name}:${k} en`).toEqual(params(zh[k]));
        expect(params(es[k]), `${name}:${k} es`).toEqual(params(zh[k]));
      }
    });

  it('uses Spain-Spanish medical terms', () => {
    const all = Object.values(MODULES).flatMap(([, , es]) => Object.values(es)).join(' ');
    expect(all).toContain('aurícula');
    expect(all).toContain('derivación');
    for (const bad of ['atrio ', 'atrial ', 'electrocardiograma de 12 leads']) expect(all).not.toContain(bad);
  });
});
