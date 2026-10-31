/**
 * i18n completeness of the scene dictionaries: the runtime dict (src/figures/scene/strings.ts) and every
 * src/figures/scenes/<id>.i18n.ts found by glob (so a scene author's keys are covered without editing this file).
 * Checks: zh / en / es have the same keys and {placeholders}, no empty strings, every spec beat id has its beat_ key
 * (and BEAT_IDS matches the spec), title / aria / caption present, pq_* keys where the spec has a Predict row, and the
 * lesson-text gates of tests/course/lessons-f.test.ts (Chinese is Chinese, Spanish is not an English copy, decimal
 * comma in Spanish, no outdated terms) on all three tables.
 */
import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../../../src/core/l10n';
import { sceneEn, sceneEs, sceneZh, tsn } from '../../../src/figures/scene/strings';
import { SCENE_SPECS, type SceneI18nModule } from './spec';

type Dict = Readonly<Record<string, string>>;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const OUTDATED: Readonly<Record<Lang, RegExp>> = {
  zh: /半支阻滞|心房肥大|类本位曲折|病窦综合征|结性心律|劳损/,
  en: /intrinsicoid|hemiblock|sick sinus|nodal rhythm|\bPSVT\b|strain pattern|atrial enlargement|Lown/i,
  es: /hemibloqueo|crecimiento auricular|intrinsecoide|enfermedad del seno|sobrecarga sist[oó]lica|\bnodal\b|\batrios?\b|computadora|\bderivadas?\b/i,
};
const cjk = /[㐀-鿿]/;

function checkDict(name: string, d: Record<Lang, Dict>, latinOnlyZh: ReadonlySet<string> = new Set()) {
  const keys = Object.keys(d.zh).sort();
  it(`${name}: zh has keys; en / es have exactly the zh keys; no empty strings`, () => {
    expect(keys.length).toBeGreaterThan(0);
    for (const lang of LANGS) {
      expect(Object.keys(d[lang]).sort()).toEqual(keys);
      expect(Object.entries(d[lang]).filter(([, v]) => typeof v !== 'string' || v.trim() === '')).toEqual([]);
    }
  });
  it(`${name}: placeholders agree across languages`, () => {
    for (const k of keys) {
      expect([k, placeholders(d.en[k])]).toEqual([k, placeholders(d.zh[k])]);
      expect([k, placeholders(d.es[k])]).toEqual([k, placeholders(d.zh[k])]);
    }
  });
  it(`${name}: lesson-text gates (Chinese is Chinese, es is translated, decimal comma, current terms)`, () => {
    for (const k of keys) {
      const zh = d.zh[k];
      const en = d.en[k];
      const es = d.es[k];
      for (const lang of LANGS) expect(OUTDATED[lang].test(d[lang][k]), `${name}.${k}.${lang}: outdated term in "${d[lang][k]}"`).toBe(false);
      if (/[A-Za-z]{4,}/.test(en) && !latinOnlyZh.has(k)) expect(cjk.test(zh), `${name}.${k}.zh is not Chinese: "${zh}"`).toBe(true);
      if (/[a-z]{4,}\s+[a-z]{4,}/i.test(en)) expect(es, `${name}.${k}.es is not translated`).not.toBe(en);
      expect(/\d\.\d/.test(es), `${name}.${k}.es: Spanish uses a decimal comma: "${es}"`).toBe(false);
      expect(/\d,\d/.test(en), `${name}.${k}.en: English uses a decimal point: "${en}"`).toBe(false);
    }
  });
}

describe('scene runtime dictionary (scene)', () => {
  checkDict('scene', { zh: sceneZh, en: sceneEn, es: sceneEs }, new Set(['scBeatOf', 'scMs', 'scPct', 'scSlow', 'ph_his']));
  it('formats the transport read-outs in every language', () => {
    expect(tsn.in('en', 'scBeatOf', { i: 2, n: 6 })).toBe('2/6');
    expect(tsn.in('es', 'scMs', { ms: 345 })).toBe('345 ms');
    expect(tsn.in('zh', 'scGoBeat', { i: 3 })).toContain('3');
    expect(tsn.ns).toBe('scene');
  });
  it('uses Spain-Spanish vocabulary', () => {
    const es = Object.values(sceneEs).join('\n');
    expect(es).toMatch(/derivaci[oó]n/);
    expect(es).not.toMatch(/\bderivadas?\b/i);
  });
});

const modules = import.meta.glob('../../../src/figures/scenes/*.i18n.ts', { eager: true }) as Record<string, SceneI18nModule & Record<string, unknown>>;
const idOf = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.i18n\.ts$/, '');

describe('scene dictionaries (src/figures/scenes/*.i18n.ts)', () => {
  it('there is one i18n module per spec scene and no stray one', () => {
    expect(Object.keys(modules).map(idOf).sort()).toEqual(SCENE_SPECS.map((s) => s.id).sort());
  });

  for (const [path, mod] of Object.entries(modules)) {
    const id = idOf(path);
    const spec = SCENE_SPECS.find((s) => s.id === id);
    describe(id, () => {
      it('exports zh / en / es tables, BEAT_IDS equal to the spec, and a translator with namespace scene-<id>', () => {
        expect(spec, `${id} is a spec scene`).toBeDefined();
        expect(Array.isArray(mod.BEAT_IDS)).toBe(true);
        expect([...mod.BEAT_IDS]).toEqual([...spec!.beats]);
        const tr = Object.values(mod).find((v) => typeof v === 'function' && (v as { ns?: string }).ns === `scene-${id}`);
        expect(tr, `defineDict('scene-${id}', …) exported`).toBeDefined();
      });
      it('has title, aria, caption and a beat_ caption for every beat (and pq_* where the spec has a Predict row)', () => {
        for (const k of ['title', 'aria', 'caption']) expect(Object.keys(mod.zh), k).toContain(k);
        for (const b of spec?.beats ?? []) expect(Object.keys(mod.zh), `beat_${b}`).toContain(`beat_${b}`);
        if (spec?.predict) for (const k of ['pq_question', 'pq_ok', 'pq_wrong']) expect(Object.keys(mod.zh), k).toContain(k);
      });
      it('narration lengths stay within the spec limits (en ≤ 110 chars, zh ≤ 45, es ≤ 130)', () => {
        for (const b of spec?.beats ?? []) {
          expect(mod.en[`beat_${b}`].length, `en beat_${b}`).toBeLessThanOrEqual(110);
          expect(mod.zh[`beat_${b}`].length, `zh beat_${b}`).toBeLessThanOrEqual(45);
          expect(mod.es[`beat_${b}`].length, `es beat_${b}`).toBeLessThanOrEqual(130);
        }
      });
      checkDict(id, { zh: mod.zh, en: mod.en, es: mod.es });
    });
  }
});
