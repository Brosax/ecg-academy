/**
 * UI strings of the 3D heart (src/i18n/heart3d.ts): zh / en / es have the same keys, no empty strings and the same
 * {placeholders}; textbook terminology (Chinese 除极/复极 as in src/figures; Spanish "aurícula"/"auricular").
 */
import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../../src/core/l10n';
import { REGION_LIST } from '../../src/core/regions';
import { heart3dEn, heart3dEs, heart3dZh, th3 } from '../../src/i18n/heart3d';

const DICTS: Record<Lang, Readonly<Record<string, string>>> = { zh: heart3dZh, en: heart3dEn, es: heart3dEs };
const KEYS = Object.keys(heart3dZh) as (keyof typeof heart3dZh)[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('heart3d dictionary', () => {
  for (const lang of LANGS) {
    it(`${lang}: has exactly the zh keys and no empty strings`, () => {
      expect(Object.keys(DICTS[lang]).sort()).toEqual([...KEYS].sort());
      expect(Object.entries(DICTS[lang]).filter(([, v]) => v.trim() === '')).toEqual([]);
    });
  }

  it('placeholders agree across languages and are filled by the translator', () => {
    for (const k of KEYS) {
      const zh = placeholders(heart3dZh[k]);
      expect([k, placeholders(heart3dEn[k])]).toEqual([k, zh]);
      expect([k, placeholders(heart3dEs[k])]).toEqual([k, zh]);
    }
    for (const lang of LANGS) {
      const s = th3.in(lang, 'stateDepolarizing', { pct: 40 });
      expect(s).toContain('40');
      expect(s).not.toMatch(/\{\w+\}/);
    }
  });

  it('the translator returns the dictionary text (no fallback to the key)', () => {
    for (const lang of LANGS) for (const k of KEYS) if (!placeholders(DICTS[lang][k]).length) expect(th3.in(lang, k)).toBe(DICTS[lang][k]);
  });

  it('uses textbook ECG terminology', () => {
    // Chinese ECG texts say 除极 / 复极 (not the physiology register 去极化 / 复极化)
    for (const k of KEYS) expect(heart3dZh[k], k).not.toMatch(/去极|复极化/);
    expect(heart3dZh.phaseAtrial).toBe('心房除极 → P波');
    expect(heart3dZh.phaseQrs).toBe('心室除极 → QRS波群');
    expect(heart3dZh.phaseT).toBe('心室复极 → T波');
    // Spain Spanish: "auricular", "onda", "segmento", "complejo"; never the Latin-American "atrio/atrial"
    expect(heart3dEs.phaseAtrial).toBe('Despolarización auricular → onda P');
    expect(heart3dEs.phaseSt).toMatch(/segmento ST/);
    for (const k of KEYS) expect(heart3dEs[k], k).not.toMatch(/\batri(o|al)\b/i);
  });

  it('the short credit names the CC BY creators, licence and changes in every language', () => {
    for (const lang of LANGS) {
      const c = DICTS[lang].credit;
      expect(c, lang).toMatch(/Browne K/);
      expect(c, lang).toMatch(/Schlehlein H/);
      expect(c, lang).toMatch(/CC BY 4\.0/);
      expect(c, lang).toMatch(/v1\.3/);
    }
  });

  it('region names used for hover labels exist in all three languages', () => {
    for (const r of REGION_LIST) for (const lang of LANGS) expect(r.name[lang].trim(), `${r.id} ${lang}`).not.toBe('');
  });
});
