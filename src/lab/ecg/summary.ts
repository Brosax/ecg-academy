/** Helpers shared by views: latest complete beat, accessible summaries, segment bands. */
import type { ThemeColors } from '../app/theme';
import type { Lang } from '../app/store';
import { te } from '../i18n/ecg';
import type { CycleTruth } from '../sim/types';
import { withAlpha } from './canvas';
import { fmtOpt } from './format';
import type { BeatAnalysis, EcgHub } from './sampler';
import { ECG_BAND } from './timeline';

/** Most recent cycle whose T wave has ended before t (so its measurement is complete on screen). */
export function latestCompleteCycle(hub: EcgHub, t: number, lookbackMs = 4000): CycleTruth | null {
  const cs = hub.cycles.range(t - lookbackMs, t);
  for (let i = cs.length - 1; i >= 0; i--) {
    const c = cs[i];
    if (c.tEnd !== null && c.tEnd + 40 <= t) return c;
  }
  return null;
}

export function beatSummary(lang: Lang, a: BeatAnalysis | null): string {
  if (!a) return te.in(lang, 'summary.none');
  const m = a.measured;
  return te.in(lang, 'summary.beat', {
    hr: fmtOpt(lang, a.rrMs ? 60000 / a.rrMs : null),
    pr: fmtOpt(lang, m.prMs),
    qrs: fmtOpt(lang, m.qrsMs),
    qt: fmtOpt(lang, m.qtMs),
  });
}

/**
 * Fills P / QRS / ST-T bands of the given cycles that intersect [t0, t1], mapped by xOf (device px), over a
 * vertical extent.
 */
export function drawBands(
  ctx: CanvasRenderingContext2D,
  cycles: readonly CycleTruth[],
  t0: number,
  t1: number,
  xOf: (t: number) => number,
  top: number,
  height: number,
  c: ThemeColors,
): void {
  for (const cy of cycles)
    for (const s of cy.segments) {
      const style = ECG_BAND[s.seg];
      if (!style) continue;
      const a = Math.max(s.t0, t0), b = Math.min(s.t1, t1);
      if (b <= a) continue;
      const xa = xOf(a), xb = xOf(b);
      withAlpha(ctx, style.alpha, () => {
        ctx.fillStyle = c[style.token];
        ctx.fillRect(xa, top, Math.max(1, xb - xa), height);
      });
    }
}
