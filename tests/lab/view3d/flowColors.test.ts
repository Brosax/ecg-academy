import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en as view3dEn } from '../../../src/lab/i18n/view3d/en';
import { es as view3dEs } from '../../../src/lab/i18n/view3d/es';
import { zh as view3dZh } from '../../../src/lab/i18n/view3d/zh';
import { FLOW_CAPTION_IDS } from '../../../src/lab/view3d/core/flowTypes';
import { FLOW_CAPTION_KEYS, FLOW_COLORS, FLOW_LEGEND, flowLegendRows, flowPaletteForBg } from '../../../src/lab/view3d/flowControls';
import { overlayColor } from '../../../src/lab/view3d/overlays';

/** Theme tokens straight from the lab's theme.css (scoped to .lab-root in ECG Academy), so the check follows the real --scene-bg / colour language. */
const CSS = readFileSync(fileURLToPath(new URL('../../../src/lab/app/theme.css', import.meta.url)), 'utf8');
function tokens(selector: string): Record<string, string> {
  const start = CSS.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const body = CSS.slice(start, CSS.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2].toLowerCase()]));
}
const THEMES = { light: tokens('.lab-root'), dark: tokens(":root[data-theme='dark'] .lab-root") } as const;

type Rgb = readonly [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as unknown as Rgb;
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linear = (hex: string): Rgb => rgb(hex).map(toLinear) as unknown as Rgb;
/** WCAG 2.x relative luminance and contrast ratio. */
const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(linear(a)), luminance(linear(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** CIELAB (D65) from linear sRGB, and the CIE76 colour difference. */
function lab([r, g, b]: Rgb): Rgb {
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const deltaE = (a: Rgb, b: Rgb) => {
  const p = lab(a), q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
/** Dichromat simulation in linear RGB (Viénot, Brettel & Mollon 1999). */
const DEUTAN = [[0.29275, 0.70725, 0], [0.29275, 0.70725, 0], [-0.02234, 0.02234, 1]] as const;
const PROTAN = [[0.11238, 0.88762, 0], [0.11238, 0.88762, 0], [0.00401, -0.00401, 1]] as const;
const simulate = (c: Rgb, m: typeof DEUTAN | typeof PROTAN): Rgb =>
  m.map((row) => Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2]))) as unknown as Rgb;

describe('blood-flow colours (flowControls.FLOW_COLORS)', () => {
  it('reads the scene backgrounds from theme.css', () => {
    expect(THEMES.light['scene-bg']).toBe('#f3efe8');
    expect(THEMES.dark['scene-bg']).toBe('#0b0e13');
  });

  for (const theme of ['light', 'dark'] as const) {
    const pal = FLOW_COLORS[theme], t = THEMES[theme];

    it(`${theme}: both tones are ≥ 3:1 against --scene-bg (non-text contrast)`, () => {
      for (const tone of ['rich', 'poor'] as const) expect(contrast(pal[tone], t['scene-bg']), tone).toBeGreaterThanOrEqual(3);
    });

    it(`${theme}: O2-rich and O2-poor stay far apart, also for deutan / protan vision`, () => {
      const a = linear(pal.rich), b = linear(pal.poor);
      expect(deltaE(a, b)).toBeGreaterThan(40);
      expect(deltaE(simulate(a, DEUTAN), simulate(b, DEUTAN))).toBeGreaterThan(40);
      expect(deltaE(simulate(a, PROTAN), simulate(b, PROTAN))).toBeGreaterThan(40);
    });

    it(`${theme}: neither tone can be mistaken for an electrical colour (QRS, vector, atrial, highlight…)`, () => {
      for (const tone of ['rich', 'poor'] as const)
        for (const tok of ['c-qrs', 'c-vector', 'c-atrial', 'c-repol', 'c-conduction', 'c-highlight', 'ecg-cursor'])
          expect(deltaE(linear(pal[tone]), linear(t[tok])), `${tone} vs --${tok}`).toBeGreaterThanOrEqual(15);
    });

    it(`${theme}: kept apart from the coronary-artery and cardiac-vein overlays`, () => {
      // same arterial / venous convention, so related on purpose; comet shape and position separate them further
      const coronary = overlayColor({ id: 'LAD', kind: 'coronaryArtery' });
      const vein = overlayColor({ id: 'CORONARY_SINUS', kind: 'cardiacVein' });
      expect(deltaE(linear(pal.rich), linear(coronary))).toBeGreaterThanOrEqual(8);
      expect(deltaE(linear(pal.poor), linear(vein))).toBeGreaterThanOrEqual(8);
    });
  }

  it('picks the palette from the --scene-bg value', () => {
    expect(flowPaletteForBg(THEMES.light['scene-bg'])).toBe(FLOW_COLORS.light);
    expect(flowPaletteForBg(` ${THEMES.dark['scene-bg']} `)).toBe(FLOW_COLORS.dark);
    expect(flowPaletteForBg('rgb(0 0 0)')).toBe(FLOW_COLORS.light);
  });
});

describe('blood-flow legend and caption keys', () => {
  const dicts = { zh: view3dZh, en: view3dEn, es: view3dEs } as Record<string, Record<string, string>>;

  it('every caption id has its view3d flow.now.<id> string in zh / en / es', () => {
    for (const id of FLOW_CAPTION_IDS) {
      expect(FLOW_CAPTION_KEYS[id]).toBe(`flow.now.${id}`);
      for (const [lang, d] of Object.entries(dicts)) expect(d[FLOW_CAPTION_KEYS[id]]?.trim(), `${lang}:${id}`).toBeTruthy();
    }
  });

  it('legend: one O2-rich row, one O2-poor row, swatch-less notes (one per stream look), venous waves, a cut-only note', () => {
    expect(FLOW_LEGEND.map((r) => r.tone)).toEqual(['rich', 'poor', null, null, null, null]);
    // the section note shows only while the cut is on; the colour rows, the look's note and the venous note always
    expect(FLOW_LEGEND.map((r) => r.cut === true)).toEqual([false, false, false, false, false, true]);
    for (const r of FLOW_LEGEND) for (const d of Object.values(dicts)) expect(d[r.key]?.trim()).toBeTruthy();
    const keys = (cut: boolean, style: 'comets' | 'cells') => flowLegendRows(cut, style).map((r) => r.key);
    expect(keys(false, 'comets')).toEqual(['legend.flowRich', 'legend.flowPoor', 'legend.flowNote', 'legend.flowVeins']);
    expect(keys(false, 'cells')).toEqual(['legend.flowRich', 'legend.flowPoor', 'legend.flowCells', 'legend.flowVeins']);
    expect(keys(true, 'comets')).toContain('legend.flowCut');
    // the colour rows name the veins and arteries the vessel streams follow
    expect(view3dEn['legend.flowRich']).toMatch(/pulmonary veins.*aorta/);
    expect(view3dEn['legend.flowPoor']).toMatch(/venae cavae.*pulmonary arteries/);
    expect(view3dEs['legend.flowPoor']).toMatch(/venas cavas.*aurícula derecha/);
  });
});
