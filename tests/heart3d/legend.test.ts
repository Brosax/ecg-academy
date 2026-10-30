import { describe, expect, it } from 'vitest';
import type { RegionStates } from '../../src/core/ecg';
import { LANGS } from '../../src/core/l10n';
import { REGIONS } from '../../src/core/regions';
import {
  conductionColor,
  infarctColor,
  myocardiumColor,
  paletteFromTokens,
  stateColor,
  STATE_PHASES,
  type HeartToken,
  type HighlightTag,
} from '../../src/heart3d/colors';
import { demoRegions } from '../../src/heart3d/dev/fixture';
import {
  anyConductionShown,
  capitalize,
  depolarizingPct,
  HIGHLIGHT_ORDER,
  isConductionId,
  labelName,
  legendItems,
  shownConduction,
  STATE_KEY,
  TAG_KEY,
  tagSwatch,
  tooltipLines,
} from '../../src/heart3d/legend';
import { heart3dEn, heart3dEs, heart3dZh, th3 } from '../../src/i18n/heart3d';

const LIGHT: Record<HeartToken, string> = {
  'heart-rest': '#c98f8a',
  'heart-bg': '#f3efe8',
  'c-atrial': '#c26a00',
  'c-qrs': '#b0179e',
  'c-repol': '#0f8a80',
  'c-conduction': '#a87900',
  'c-injury': '#d0312d',
  'c-highlight': '#ff7a00',
  fg: '#1f2328',
  'fg-faint': '#8a919c',
};
const P = paletteFromTokens((t) => LIGHT[t]);

describe('which conduction fibres are drawn', () => {
  it('all of them with showConduction', () => {
    expect(shownConduction(true, [], null)).toBe('all');
    expect(anyConductionShown('all')).toBe(true);
  });

  it('otherwise only emphasized or highlighted conduction ids (myocardial ids never count)', () => {
    const none = shownConduction(false, ['lv-mid-anterior'], demoRegions({ 'lv-apex': 'infarct' }));
    expect(anyConductionShown(none)).toBe(false);
    const s = shownConduction(false, ['his', 'lv-mid-anterior'], demoRegions({ rbb: 'block', 'rv-outflow': 'focus' }));
    expect(s).not.toBe('all');
    expect([...(s as ReadonlySet<string>)].sort()).toEqual(['his', 'rbb']);
    expect(anyConductionShown(s)).toBe(true);
  });

  it('classifies conduction ids', () => {
    expect(isConductionId('purkinje')).toBe(true);
    expect(isConductionId('lv-apex')).toBe(false);
    expect(isConductionId('aorta')).toBe(false);
  });
});

describe('legend', () => {
  it('with region states lists the activation colours exactly as the view draws them', () => {
    const items = legendItems(demoRegions(), false, P);
    expect(items.map((i) => i.key)).toEqual(['legendRest', 'legendAtrial', 'legendQrs', 'legendPlateau', 'legendRepol']);
    expect(items[0].color).toEqual(stateColor(0, 'ventricle', P));
    expect(items[1].color).toEqual(stateColor(0.8, 'atria', P));
    expect(items[3].color).toEqual(stateColor(1, 'ventricle', P));
  });

  it('anatomy only (no states): no activation colours, just the myocardium', () => {
    const items = legendItems(null, false, P);
    expect(items.map((i) => i.key)).toEqual(['legendMyocardium']);
    expect(items[0].color).toEqual(P.rest);
    expect(legendItems(null, true, P).map((i) => i.key)).toEqual(['legendMyocardium', 'legendConduction']);
  });

  it('adds the conduction system and every highlight once, in a fixed order, with the right shape', () => {
    const r: RegionStates = demoRegions({
      'rv-outflow': 'focus',
      'lv-basal-inferolateral': 'pathway',
      'lv-mid-anterior': 'infarct',
      'lv-apical-anterior': 'infarct',
      'lv-basal-anterior': 'ischemia',
    });
    const items = legendItems(r, true, P);
    const keys = items.map((i) => i.key);
    expect(keys.slice(5)).toEqual(['legendConduction', 'tagInfarct', 'tagIschemia', 'tagPathway', 'tagFocus']);
    const by = Object.fromEntries(items.map((i) => [i.key, i]));
    expect(by.legendConduction.shape).toBe('line');
    expect(by.legendConduction.color).toEqual(conductionColor(1, false, P));
    expect(by.tagPathway.shape).toBe('line');
    expect(by.tagFocus.shape).toBe('ring');
    expect(by.tagInfarct.shape).toBe('box');
    expect(by.tagInfarct.color).toEqual(infarctColor(P));
  });

  it('covers every highlight tag with a UI string', () => {
    const tags = Object.keys(TAG_KEY) as HighlightTag[];
    expect([...HIGHLIGHT_ORDER].sort()).toEqual([...tags].sort());
    for (const t of tags) {
      expect(heart3dZh[TAG_KEY[t]]).toBeTruthy();
      expect(tagSwatch(t, P).every((x) => x >= 0 && x <= 1)).toBe(true);
    }
    expect(tagSwatch('focus', P)).toEqual(P.highlight);
    expect(tagSwatch('pathway', P)).toEqual(P.conduction);
  });

  it('a blocked conduction fibre is keyed as the grey fibre the view draws; a blocked wall as a greyed box', () => {
    const fibre = legendItems(demoRegions({ rbb: 'block' }), true, P).find((i) => i.key === 'tagBlock')!;
    expect(fibre.shape).toBe('line');
    expect(fibre.color).toEqual(conductionColor(1, true, P));
    expect(fibre.color).toEqual(conductionColor(0, true, P)); // grey whatever the activation
    const wall = legendItems(demoRegions({ 'lv-mid-anterior': 'block' }), false, P).find((i) => i.key === 'tagBlock')!;
    expect(wall.shape).toBe('box');
    expect(wall.color).toEqual(myocardiumColor(0, 'ventricle', 'block', P));
  });

  it('capitalizes the lower-case tooltip phrases for legend rows', () => {
    expect(capitalize('infarct zone')).toBe('Infarct zone');
    expect(capitalize('zona de isquemia')).toBe('Zona de isquemia');
    expect(capitalize('梗死区')).toBe('梗死区');
    expect(capitalize('')).toBe('');
  });
});

describe('hover tooltip', () => {
  it('names regions from src/core/regions.ts and the vessel stubs from the dictionary, in every language', () => {
    for (const lang of LANGS) {
      expect(labelName('lv-mid-anterior', lang)).toBe(REGIONS['lv-mid-anterior'].name[lang]);
      expect(labelName('rbb', lang)).toBe(REGIONS.rbb.name[lang]);
    }
    expect(labelName('aorta', 'zh')).toBe(heart3dZh.aorta);
    expect(labelName('pulmonary-trunk', 'en')).toBe(heart3dEn.pulmonaryTrunk);
    expect(labelName('pulmonary-trunk', 'es')).toBe(heart3dEs.pulmonaryTrunk);
  });

  it('adds the state at the cursor under the name (with the activated percentage while depolarizing)', () => {
    expect(tooltipLines('lv-apex', 0.4, undefined, 'en')).toEqual([REGIONS['lv-apex'].name.en, 'depolarizing (40%)']);
    expect(tooltipLines('lv-apex', 0.4, undefined, 'es')).toEqual([REGIONS['lv-apex'].name.es, 'despolarizándose (40 %)']);
    expect(tooltipLines('ra', 0, undefined, 'zh')).toEqual([REGIONS.ra.name.zh, heart3dZh.stateRest]);
    expect(tooltipLines('ra', 2, undefined, 'en')[1]).toBe(heart3dEn.stateRest); // recovered = rest
    expect(tooltipLines('his', 1, undefined, 'en')[1]).toBe(heart3dEn.stateDepolarized);
    expect(tooltipLines('lv-apex', 1.5, undefined, 'en')[1]).toBe(heart3dEn.stateRepolarizing);
  });

  it('never shows "0 %" or "100 %" for a region that is still depolarizing', () => {
    expect(depolarizingPct(0.001)).toBe(1);
    expect(depolarizingPct(0.999)).toBe(99);
    expect(depolarizingPct(0.5)).toBe(50);
    expect(tooltipLines('lv-apex', 0.999, undefined, 'en')[1]).toBe('depolarizing (99%)');
  });

  it('adds the highlight tag, and nothing but the name when there is no state (anatomy only / no cursor)', () => {
    expect(tooltipLines('lv-mid-anterior', null, undefined, 'en')).toEqual([REGIONS['lv-mid-anterior'].name.en]);
    expect(tooltipLines('lv-mid-anterior', null, 'infarct', 'en')).toEqual([REGIONS['lv-mid-anterior'].name.en, heart3dEn.tagInfarct]);
    expect(tooltipLines('rbb', 0.3, 'block', 'zh')).toEqual([REGIONS.rbb.name.zh, th3.in('zh', 'stateDepolarizing', { pct: 30 }), heart3dZh.tagBlock]);
  });

  it('vessel stubs show only their name', () => {
    expect(tooltipLines('aorta', 0.5, 'infarct', 'en')).toEqual([heart3dEn.aorta]);
    expect(tooltipLines('pulmonary-trunk', null, undefined, 'zh')).toEqual([heart3dZh.pulmonaryTrunk]);
  });

  it('every state phase has a UI string and no placeholder leaks into the tooltip', () => {
    expect(Object.keys(STATE_KEY).sort()).toEqual([...STATE_PHASES].sort());
    for (const lang of LANGS)
      for (const s of [0, 0.37, 1, 1.6, 2])
        for (const line of tooltipLines('lv-mid-inferior', s, 'ischemia', lang)) {
          expect(line.trim(), `${lang} ${s}`).not.toBe('');
          expect(line, `${lang} ${s}`).not.toMatch(/\{\w+\}/);
        }
  });
});
