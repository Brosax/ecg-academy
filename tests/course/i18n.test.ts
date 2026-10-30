/**
 * The course UI dictionary (src/i18n/course.ts): zh / en / es have the same keys, no empty strings, the same
 * {placeholders}; Chinese strings are Chinese; Spanish is Spain usage and not an English copy.
 */
import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../../src/core/l10n';
import { courseEn, courseEs, courseZh, tco } from '../../src/i18n/course';

type Dict = Readonly<Record<string, string>>;
const dicts: Record<Lang, Dict> = { zh: courseZh, en: courseEn, es: courseEs };
const keys = Object.keys(courseZh).sort();
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('course dictionary', () => {
  for (const lang of LANGS) {
    it(`${lang}: exactly the zh keys, no empty strings`, () => {
      expect(Object.keys(dicts[lang]).sort()).toEqual(keys);
      expect(Object.entries(dicts[lang]).filter(([, v]) => v.trim() === '')).toEqual([]);
    });
  }

  it('placeholders agree across languages', () => {
    for (const k of keys) {
      expect([k, placeholders(courseEn[k as keyof typeof courseEn])]).toEqual([k, placeholders(courseZh[k as keyof typeof courseZh])]);
      expect([k, placeholders(courseEs[k as keyof typeof courseEs])]).toEqual([k, placeholders(courseZh[k as keyof typeof courseZh])]);
    }
  });

  it('chinese strings contain Chinese; spanish strings are not English copies', () => {
    const cjk = /[㐀-鿿]/;
    const latinOnlyZh = new Set(['dialQtc', 'minutesApprox']);
    expect(Object.entries(courseZh).filter(([k, v]) => !latinOnlyZh.has(k) && !cjk.test(v))).toEqual([]);
    const same = keys.filter((k) => {
      const key = k as keyof typeof courseEn;
      return courseEs[key] === courseEn[key] && /[a-z]{4,}/i.test(courseEn[key]);
    });
    expect(same).toEqual([]);
  });

  it('uses Spain-Spanish ECG vocabulary', () => {
    const es = Object.values(courseEs).join('\n');
    expect(es).not.toMatch(/\bderivada\b/i);
    expect(es).not.toMatch(/\bcomputadora\b/i);
    expect(es).not.toMatch(/hemibloqueo/i);
  });

  it('the translator formats placeholders in every language', () => {
    expect(tco.in('en', 'stepOf', { i: 3, n: 12 })).toBe('Step 3 of 12');
    expect(tco.in('es', 'stepOf', { i: 3, n: 12 })).toBe('Paso 3 de 12');
    expect(tco.in('zh', 'stepOf', { i: 3, n: 12 })).toBe('第 3/12 步');
  });
});
