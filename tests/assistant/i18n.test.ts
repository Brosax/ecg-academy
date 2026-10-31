/**
 * UI dictionary of the AI study assistant (src/i18n/assistant.ts): zh / en / es have the same keys, no empty strings and
 * the same {placeholders}; Chinese strings are Chinese; Spanish is not an English copy and uses Spain vocabulary. The
 * shell dictionary carries the settings-page section title and hint.
 */
import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../../src/core/l10n';
import { assistantEn, assistantEs, assistantZh, tai } from '../../src/i18n/assistant';
import { shellEn, shellEs, shellZh } from '../../src/i18n/shell';

type Dict = Readonly<Record<string, string>>;
const dicts: Record<Lang, Dict> = { zh: assistantZh, en: assistantEn, es: assistantEs };
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('assistant dictionary', () => {
  const keys = Object.keys(assistantZh).sort();

  it('zh has keys', () => expect(keys.length).toBeGreaterThan(40));

  for (const lang of LANGS) {
    it(`${lang} has exactly the zh keys and no empty strings`, () => {
      expect(Object.keys(dicts[lang]).sort()).toEqual(keys);
      expect(Object.entries(dicts[lang]).filter(([, v]) => typeof v !== 'string' || v.trim() === '')).toEqual([]);
    });
  }

  it('placeholders agree across languages', () => {
    for (const k of keys) {
      const zh = placeholders(assistantZh[k as keyof typeof assistantZh]);
      expect([k, placeholders(assistantEn[k as keyof typeof assistantEn])]).toEqual([k, zh]);
      expect([k, placeholders(assistantEs[k as keyof typeof assistantEs])]).toEqual([k, zh]);
    }
  });

  it('the translator returns the dictionary text in every language', () => {
    for (const lang of LANGS) {
      for (const k of keys as (keyof typeof assistantZh)[]) {
        if (placeholders(dicts[lang][k]).length === 0) expect(tai.in(lang, k)).toBe(dicts[lang][k]);
      }
    }
    expect(tai.in('zh', 'ctxLabel', { title: 'F1' })).toBe('当前页面：F1');
    expect(tai.in('es', 'testOk', { model: 'm' })).toBe('Conectado: m');
  });

  it('chinese strings are chinese and spanish strings are not english copies', () => {
    const cjk = /[一-鿿]/;
    expect(Object.entries(assistantZh).filter(([, v]) => !cjk.test(v))).toEqual([]);
    const sameAsEn = keys.filter((k) => {
      const key = k as keyof typeof assistantZh;
      return assistantEs[key] === assistantEn[key] && /[a-z]{4,}/i.test(assistantEn[key]);
    });
    expect(sameAsEn).toEqual([]);
  });

  it('uses Spain-Spanish vocabulary', () => {
    const es = Object.values(assistantEs).join('\n');
    expect(es).not.toMatch(/\bderivada\b|\bcomputadora\b/i);
    expect(es).toMatch(/bloqueo de rama/);
  });

  it('the shell dictionary has the settings-page section strings', () => {
    for (const d of [shellZh, shellEn, shellEs]) {
      expect(d.setAssistant.trim()).not.toBe('');
      expect(d.setAssistantHint.trim()).not.toBe('');
    }
  });
});
