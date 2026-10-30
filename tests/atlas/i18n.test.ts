/**
 * UI dictionaries of the atlas and tools pages: zh / en / es have the same keys, no empty strings, the same
 * {placeholders}; Chinese strings are Chinese; Spanish is not a copy of English; lesson titles are complete.
 */
import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../../src/core/l10n';
import { FINDING_CATEGORIES } from '../../src/core/findings';
import { atlasEn, atlasEs, atlasZh, ta } from '../../src/i18n/atlas';
import { toolsEn, toolsEs, toolsZh, tt } from '../../src/i18n/tools';
import { LESSON_TITLES } from '../../src/atlas/lessons';
import { LESSON_IDS } from '../../src/atlas/schema';

type Dict = Readonly<Record<string, string>>;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function checkDict(name: string, dicts: Record<Lang, Dict>, notChinese: readonly string[], sameInEs: readonly string[]) {
  const keys = Object.keys(dicts.zh).sort();
  describe(`${name} dictionary`, () => {
    for (const lang of LANGS) {
      it(`${lang} has exactly the zh keys and no empty strings`, () => {
        expect(Object.keys(dicts[lang]).sort()).toEqual(keys);
        expect(Object.entries(dicts[lang]).filter(([, v]) => !v.trim())).toEqual([]);
      });
    }
    it('placeholders agree across languages', () => {
      for (const k of keys) {
        expect([k, placeholders(dicts.en[k])]).toEqual([k, placeholders(dicts.zh[k])]);
        expect([k, placeholders(dicts.es[k])]).toEqual([k, placeholders(dicts.zh[k])]);
      }
    });
    it('Chinese strings contain Chinese', () => {
      expect(keys.filter((k) => !/[一-鿿]/.test(dicts.zh[k]) && !notChinese.includes(k))).toEqual([]);
    });
    it('Spanish strings are not English copies', () => {
      expect(keys.filter((k) => dicts.es[k] === dicts.en[k] && /[a-z]{4,}/i.test(dicts.en[k]) && !sameInEs.includes(k))).toEqual([]);
    });
    it('Spanish uses Spain ECG vocabulary', () => {
      const es = Object.values(dicts.es).join('\n');
      expect(es).not.toMatch(/\bderivada\b|\bcomputadora\b|hemibloqueo/i);
    });
  });
}

checkDict('atlas', { zh: atlasZh, en: atlasEn, es: atlasEs }, ['patientLine'], ['cat_normal', 'sev_normal', 'badge_normal', 'patientLine']);
checkDict('tools', { zh: toolsZh, en: toolsEn, es: toolsEs }, [], ['nvColNormal', 'clNormal', 'glColAtlas']);

describe('translators', () => {
  it('return the dictionary text in each language', () => {
    expect(ta.in('en', 'title')).toBe('Pattern atlas');
    expect(ta.in('es', 'countShown', { n: 3, total: 9 })).toBe('3 de 9 hallazgos');
    expect(tt.in('zh', 'clStep', { n: 2 })).toBe('第2步');
  });

  it('every finding category has a label', () => {
    for (const c of FINDING_CATEGORIES) for (const lang of LANGS) expect(ta.in(lang, `cat_${c}`)).not.toBe(`cat_${c}`);
  });
});

describe('lesson titles', () => {
  it('cover every PLAN §3 lesson in zh / en / es', () => {
    expect(Object.keys(LESSON_TITLES).sort()).toEqual([...LESSON_IDS].sort());
    for (const id of LESSON_IDS) {
      const t = LESSON_TITLES[id];
      for (const lang of LANGS) expect([id, lang, t[lang].trim().length > 0]).toEqual([id, lang, true]);
      expect(t.zh).toMatch(/[一-鿿]/);
    }
  });
});
