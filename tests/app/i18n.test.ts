/**
 * UI dictionaries used by the shell: src/i18n/shell.ts (owned here) and src/i18n/common.ts (shared `tc`).
 * zh / en / es must have the same keys, no empty strings and the same {placeholders}.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../../src/core/l10n';
import { tc } from '../../src/i18n/common';
import { shellEn, shellEs, shellZh, tsh } from '../../src/i18n/shell';

type Dict = Readonly<Record<string, string>>;

/**
 * The raw common dictionaries are not exported (contract), so read them from the source: the three object literals
 * passed to defineDict('common', zh, en, es) are plain string maps, evaluated here as an array literal.
 */
function commonDicts(): Record<Lang, Dict> {
  const src = readFileSync(fileURLToPath(new URL('../../src/i18n/common.ts', import.meta.url)), 'utf8');
  const start = src.indexOf('defineDict(');
  const end = src.lastIndexOf(');');
  if (start < 0 || end < start) throw new Error('defineDict call not found in common.ts');
  const args = new Function(`return [${src.slice(start + 'defineDict('.length, end)}];`)() as [string, Dict, Dict, Dict];
  if (args[0] !== 'common') throw new Error('unexpected namespace in common.ts');
  return { zh: args[1], en: args[2], es: args[3] };
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function checkComplete(name: string, dicts: Record<Lang, Dict>) {
  const keys = Object.keys(dicts.zh).sort();
  it(`${name}: zh has keys`, () => expect(keys.length).toBeGreaterThan(0));
  for (const lang of LANGS) {
    it(`${name}: ${lang} has exactly the zh keys`, () => {
      expect(Object.keys(dicts[lang]).sort()).toEqual(keys);
    });
    it(`${name}: ${lang} has no empty strings`, () => {
      const empty = Object.entries(dicts[lang]).filter(([, v]) => typeof v !== 'string' || v.trim() === '');
      expect(empty).toEqual([]);
    });
  }
  it(`${name}: placeholders agree across languages`, () => {
    for (const k of keys) {
      const zh = placeholders(dicts.zh[k]);
      expect([k, placeholders(dicts.en[k])]).toEqual([k, zh]);
      expect([k, placeholders(dicts.es[k])]).toEqual([k, zh]);
    }
  });
}

describe('shell dictionary', () => {
  checkComplete('shell', { zh: shellZh, en: shellEn, es: shellEs });

  it('the translator returns the dictionary text (no fallback to the key)', () => {
    for (const lang of LANGS) {
      const d = lang === 'zh' ? shellZh : lang === 'en' ? shellEn : shellEs;
      for (const k of Object.keys(shellZh) as (keyof typeof shellZh)[]) {
        if (placeholders(d[k]).length === 0) expect(tsh.in(lang, k)).toBe(d[k]);
      }
    }
  });

  it('chinese strings are chinese and spanish strings are not english copies', () => {
    const cjk = /[一-鿿]/;
    const notChinese = Object.entries(shellZh).filter(([k, v]) => !cjk.test(v) && !/^layout\d/.test(k));
    expect(notChinese).toEqual([]);
    const sameWordInBoth = new Set(['setGeneral']); // "General" is correct in English and in Spanish
    const sameAsEn = Object.keys(shellZh).filter((k) => {
      const key = k as keyof typeof shellZh;
      return !sameWordInBoth.has(k) && shellEs[key] === shellEn[key] && /[a-z]{4,}/i.test(shellEn[key]);
    });
    expect(sameAsEn).toEqual([]);
  });

  it('uses Spain-Spanish ECG vocabulary', () => {
    const es = Object.values(shellEs).join('\n');
    expect(es).toMatch(/derivaci[oó]n/);
    expect(es).not.toMatch(/\bderivada\b/i);
    expect(es).not.toMatch(/\bcomputadora\b/i);
  });
});

describe('common dictionary (tc)', () => {
  const dicts = commonDicts();
  checkComplete('common', dicts);

  it('the parsed source matches the live translator', () => {
    for (const lang of LANGS) {
      for (const k of Object.keys(dicts.zh) as Parameters<typeof tc>[0][]) {
        if (placeholders(dicts[lang][k]).length === 0) expect(tc.in(lang, k)).toBe(dicts[lang][k]);
      }
    }
  });

  it('has every label the shell uses', () => {
    const used = ['appName', 'navHome', 'navLearn', 'navPractice', 'navCases', 'navAtlas', 'navExam', 'navTools', 'navProgress', 'navSettings', 'navAbout', 'language', 'themeLight', 'themeDark', 'notFound', 'speed', 'gain', 'layout'];
    for (const k of used) expect(Object.keys(dicts.zh)).toContain(k);
  });
});
