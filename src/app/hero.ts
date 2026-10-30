/**
 * The home hero's live ECG (pure part): which synthetic 12-lead it shows and the measurements it reveals. The tracing is
 * a normal ECG from src/synth — dials drawn from the scenario's normal ranges, so "another example" shows how much a
 * normal ECG can vary (rate, axis, PR, QTc) while staying normal. Seeded from the calendar date and an example counter:
 * the same day and counter always give the same tracing (no Math.random). The values shown come from the model's own
 * truth, which the synth oracle tests check against what is measurable on the signal.
 */
import type { LayoutId } from './store';
import type { EcgTruth } from '../core/ecg';
import { createRng } from '../core/rng';
import { drawDials, type SynthRequest } from '../synth';

export const HERO_SCENARIO = 'normal';

/** Local calendar date, YYYY-MM-DD (the hero changes once a day, like the case of the day). */
export function heroDay(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The synth request for example `n` (0, 1, 2 …) of a day. */
export function heroRequest(day: string, n: number): SynthRequest {
  const rng = createRng(`home-hero:${day}:${n}`);
  const dials = drawDials(HERO_SCENARIO, rng.fork('dials'), 'classic');
  return { scenario: HERO_SCENARIO, seed: rng.int(1, 0x7fffffff), dials, difficulty: 'classic', durationS: 10, fs: 500 };
}

/**
 * Measurements revealed under the tracing: intervals in whole ms (the same numbers the viewer's interval brackets
 * print), the axis to the nearest 5° (the precision a reader reports).
 */
export interface HeroFacts {
  readonly rateBpm: number;
  readonly prMs: number | null;
  readonly qrsMs: number;
  readonly qtMs: number;
  /** Fridericia (the app's default QTc formula) */
  readonly qtcMs: number;
  readonly axisDeg: number;
}

export function heroFacts(t: EcgTruth): HeroFacts {
  return {
    rateBpm: Math.round(t.hrBpm),
    prMs: t.prMs == null ? null : Math.round(t.prMs),
    qrsMs: Math.round(t.qrsMs),
    qtMs: Math.round(t.qtMs),
    qtcMs: Math.round(t.qtcFridericiaMs),
    axisDeg: Math.round(t.axisDeg.qrs / 5) * 5,
  };
}

/** Signed angle as written on an axis report: +60°, −30°, 0°. */
export function signedDeg(deg: number): string {
  if (deg === 0) return '0°';
  return `${deg > 0 ? '+' : '−'}${Math.abs(deg)}°`;
}

// ── paper size ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Sheets the hero uses: 3×4 + lead II rhythm strip (wide screens), 6×2 with two 5-s columns (phones). */
export type HeroLayout = Extract<LayoutId, '3x4+1' | '6x2'>;

/**
 * Lower bound of sheet height ÷ sheet width (mm/mm) for a normal 12-lead at 25 mm/s and 10 mm/mV, without and with
 * wave labels + interval brackets (src/ecg computeSheet reserves room for them; rows grow in 5 mm steps). Measured on
 * 112 hero ECGs: 3×4+1 0.358–0.415 / 0.472–0.566; 6×2 0.519–0.574 / 0.648–0.759. Each bound is one 5-mm row step
 * below the lowest value seen (tests/app/hero.test.ts checks the fit).
 */
const MIN_RATIO: Readonly<Record<HeroLayout, { readonly off: number; readonly on: number }>> = {
  '3x4+1': { off: 0.34, on: 0.45 },
  '6x2': { off: 0.5, on: 0.63 },
};
/** Ten seconds at 25 mm/s plus the calibration zone and margin (src/ecg: 265 mm for 3×4+1, 270 mm for 6×2). */
const SHEET_W_MM = 265;
/** Never draw the hero larger than the viewer's readable fit scale. */
const MAX_PX_PER_MM = 2.2;

/**
 * Paper height (CSS px) that lets the whole sheet fit a container `widthPx` wide: the viewer draws a fixed-height
 * sheet at height ÷ sheet-height px/mm, so a height of width × (lowest height/width ratio) never needs sideways
 * scrolling (a taller sheet is just drawn a little narrower, with empty paper on the right).
 */
export function heroPaperHeight(widthPx: number, layout: HeroLayout, labels: boolean): number {
  const w = Math.max(0, Math.min(widthPx, MAX_PX_PER_MM * SHEET_W_MM));
  const r = MIN_RATIO[layout][labels ? 'on' : 'off'];
  return Math.max(80, Math.floor(w * r));
}
