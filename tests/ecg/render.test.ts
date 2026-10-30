/**
 * Runs the whole drawing pipeline (render.ts → draw.ts) on a stub 2D context in node: every layout, overlay, mark,
 * pin and tool must draw without throwing, and a 10 s 12-lead at 500 Hz must stay cheap (decimated path size).
 */
import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../../src/app/store';
import type { EcgMark, EcgPin } from '../../src/ecg/api';
import { placeWaveLabels, stPanels, waveLabelPx, type DrawEnv } from '../../src/ecg/draw';
import { computeSheet, type Frame } from '../../src/ecg/layout';
import { renderBase, renderOverlay, type BaseOptions, type OverlayState } from '../../src/ecg/render';
import { TOKENS, type Palette, type Token } from '../../src/ecg/theme';
import { fixtureEcg, opts } from './fixtures';

function stubCtx(): { ctx: CanvasRenderingContext2D; calls: Map<string, number> } {
  const calls = new Map<string, number>();
  const state: Record<string | symbol, unknown> = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'measureText') return (s: string) => ({ width: s.length * 7 });
      return (..._args: unknown[]) => {
        const name = String(k);
        calls.set(name, (calls.get(name) ?? 0) + 1);
      };
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const pal = Object.fromEntries(TOKENS.map((t) => [t, '#123456'])) as Record<Token, string> as Palette;

const ecg = fixtureEcg({ uWave: true, st: [-0.05, 0.2, 0.02] });
const ecg20 = fixtureEcg({ durationMs: 20000, rrJitterMs: 100 });
const truth = ecg.truth;
if (!truth) throw new Error('fixture without truth');
const b = truth.beats[1];
const marks: readonly EcgMark[] = [
  { kind: 'bracket', lead: 'II', t0: b.pOn ?? 0, t1: b.qrsOn, color: 'atrial', label: { zh: 'PR', en: 'PR', es: 'PR' } },
  { kind: 'region', lead: 'all', t0: b.qrsOn, t1: b.qrsOff, color: 'qrs' },
  { kind: 'wave', lead: 'V1', t: b.tOff - 80, label: 'T' },
  { kind: 'hline', lead: 'V5', mv: 0, label: 'baseline' },
  { kind: 'arrow', lead: 'III', t: b.j + 60, mv: 0.2, color: 'injury', label: 'J+60' },
  { kind: 'lead', lead: 'aVL', color: 'highlight', label: 'lateral' },
];
const pins: readonly EcgPin[] = [
  { lead: 'II', tMs: b.qrsOn + 40, tone: 'answer' },
  { lead: 'aVR', tMs: b.qrsOn + 40, tone: 'wrong' },
];
const base: BaseOptions = { marks, highlightLeads: ['V2'], pins, waveLabels: true, intervals: true, stMarkers: true };

describe('render pipeline on a stub context', () => {
  for (const layout of LAYOUTS)
    for (const cabrera of [false, true])
      it(`${layout}${cabrera ? ' (Cabrera)' : ''}: base and overlay draw`, () => {
        const src = layout === 'strip' ? ecg20 : ecg;
        const s = computeSheet(src.signal, opts({ layout, cabrera, chestHalfGain: cabrera, brackets: true, waveLabels: true }));
        const w = 1200, ppm = w / s.widthMm, h = Math.ceil(s.heightMm * ppm);
        const f: Frame = { pxPerMm: ppm, ox: 0, oy: 0 };
        const { ctx, calls } = stubCtx();
        const e: DrawEnv = { ctx, f, dpr: 1, pal, lang: 'es' };
        renderBase(e, s, src, base, null, w, h);
        expect(calls.get('stroke') ?? 0).toBeGreaterThan(3);
        expect(calls.get('fillText') ?? 0).toBeGreaterThan(s.panels.length - 1);
        const p = s.panels[0];
        const st: OverlayState = {
          hoverPanel: 0,
          hoverTint: true,
          cursor: (p.t0 + p.t1) / 2,
          focus: { panel: 0, t: p.t0 + 100 },
          showFocus: true,
          cal: { panel: 0, t0: p.t0 + 200, t1: p.t0 + 900, mv0: 0, mv1: 1 },
          calMode: 'time',
          march: true,
          active: 2,
          cross: { panel: 0, t: p.t0 + 300 },
          lens: { x: 200, y: 40 },
        };
        renderOverlay(e, s, src, st, w, h);
        renderOverlay(e, s, src, { ...st, calMode: 'amplitude', march: false, lens: null }, w, h);
        expect(calls.get('clip') ?? 0).toBe(1);
      });

  it('missing leads are reported, not drawn', () => {
    const s = computeSheet(ecg.signal, opts({ layout: 'single', lead: 'V4R' }));
    const { ctx, calls } = stubCtx();
    renderBase({ ctx, f: { pxPerMm: 4, ox: 0, oy: 0 }, dpr: 1, pal, lang: 'zh' }, s, ecg, base, null, 1100, 300);
    expect(calls.get('strokeText') ?? 0).toBeGreaterThan(0);
  });

  it('a 10 s 12-lead at 500 Hz: decimated path and fast redraw', () => {
    const s = computeSheet(ecg.signal, opts({ layout: '12x1' }));
    const w = 1000, ppm = w / s.widthMm, h = Math.ceil(s.heightMm * ppm);
    const { ctx, calls } = stubCtx();
    const e: DrawEnv = { ctx, f: { pxPerMm: ppm, ox: 0, oy: 0 }, dpr: 1, pal, lang: 'en' };
    const plain: BaseOptions = { marks: [], highlightLeads: [], pins: [], waveLabels: false, intervals: false, stMarkers: false };
    renderBase(e, s, ecg, plain, null, w, h);
    // 12 × 5000 samples on ~940 device columns each → about 2 points per column, not 5000 per lead
    const lineTo = calls.get('lineTo') ?? 0;
    expect(lineTo).toBeLessThan(12 * 2 * 1000 + 2000);
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) renderBase(e, s, ecg, base, null, w, h);
    expect((performance.now() - t0) / 10).toBeLessThan(25);
  });
});

describe('ST marker panels', () => {
  it('every 3×4 cell carries ST markers, rhythm strips do not', () => {
    const s = computeSheet(ecg.signal, opts({ layout: '3x4+3' }));
    const st = stPanels(s, truth);
    expect(st.length).toBe(12);
    expect(st.every(({ panel }) => panel.kind === 'cell')).toBe(true);
    for (const { panel, beat } of st) {
      expect(truth.beats[beat].qrsOn).toBeGreaterThanOrEqual(panel.t0);
      expect(truth.beats[beat].tOff).toBeLessThanOrEqual(panel.t1);
    }
  });

  it('a wrapped strip measures once, on its first row', () => {
    const s = computeSheet(ecg20.signal, opts({ layout: 'strip' }));
    expect(s.rows.length).toBe(2);
    const st = stPanels(s, ecg20.truth ?? truth);
    expect(st.length).toBe(1);
    expect(st[0].panel.row).toBe(0);
  });
});

describe('wave label placement', () => {
  const labelsOf = (src: typeof ecg, layout: (typeof LAYOUTS)[number], gain: 5 | 10 | 20, ppm: number, dpr: number) => {
    const s = computeSheet(src.signal, opts({ layout, gain, waveLabels: true, brackets: true }));
    const { ctx } = stubCtx();
    const e: DrawEnv = { ctx, f: { pxPerMm: ppm, ox: 0, oy: 0 }, dpr, pal, lang: 'en' };
    return { s, e, placed: placeWaveLabels(e, s, src.signal, src.truth ?? truth) };
  };

  it('every label stays inside its own row (small sheets, every gain)', () => {
    let n = 0;
    for (const layout of ['3x4+1', '6x2', '12x1', 'strip'] as const)
      for (const gain of [5, 10, 20] as const)
        for (const [ppm, dpr] of [[2.2, 1], [2.2, 2], [4, 1]] as const) {
          const { s, e, placed } = labelsOf(layout === 'strip' ? ecg20 : ecg, layout, gain, ppm, dpr);
          const h = waveLabelPx(e.f) * dpr;
          for (const pl of placed) {
            const r = s.rows[s.panels[pl.panel].row];
            const top = r.topMm * ppm * dpr, bottom = (r.topMm + r.hMm - r.bracketMm) * ppm * dpr;
            expect(pl.y - h / 2).toBeGreaterThanOrEqual(top - 1e-6);
            expect(pl.y + h / 2).toBeLessThanOrEqual(bottom + 1e-6);
            n++;
          }
        }
    expect(n).toBeGreaterThan(500);
  });

  it('on a roomy sheet labels sit above upward and below downward deflections', () => {
    const { s, e, placed } = labelsOf(ecg, '12x1', 10, 6, 1);
    for (const pl of placed) {
      const p = s.panels[pl.panel];
      const yTrace = (s.rows[p.row].baselineMm - pl.label.mv * p.gain * (p.invert ? -1 : 1)) * e.f.pxPerMm;
      if (pl.label.up) expect(pl.y).toBeLessThan(yTrace);
      else expect(pl.y).toBeGreaterThan(yTrace);
    }
  });
});
