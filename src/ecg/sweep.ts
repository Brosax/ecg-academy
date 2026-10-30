/**
 * Bedside-monitor sweep — pure. A window of `windowMs` is written left → right; the write head sits at the current time
 * and an erase bar of `gapMs` ahead of it separates the new sweep from the previous one.
 */

export interface Sweep {
  readonly windowMs: number;
  readonly gapMs: number;
  readonly t: number;
  /** start of the current sweep */
  readonly start: number;
  /** write head as a fraction of the width */
  readonly headFrac: number;
  /** time spans to draw; x fraction = (τ − tOrigin) / windowMs */
  readonly spans: readonly { readonly t0: number; readonly t1: number; readonly tOrigin: number }[];
}

export function sweep(t: number, windowMs: number, gapMs: number): Sweep {
  const tt = Math.max(0, t);
  const start = Math.floor(tt / windowMs) * windowMs;
  const headFrac = (tt - start) / windowMs;
  const spans: { t0: number; t1: number; tOrigin: number }[] = [];
  if (tt > start) spans.push({ t0: start, t1: tt, tOrigin: start });
  const oldStart = Math.max(0, tt - windowMs + gapMs);
  if (oldStart < start) spans.push({ t0: oldStart, t1: start, tOrigin: start - windowMs });
  return { windowMs, gapMs, t: tt, start, headFrac, spans };
}

/** Fraction of the width (0..1) at which time τ is drawn, or null when τ is not on screen. */
export function sweepFracOf(s: Sweep, tau: number): number | null {
  for (const sp of s.spans) if (tau >= sp.t0 && tau <= sp.t1) return (tau - sp.tOrigin) / s.windowMs;
  return null;
}

/** Time under a fraction of the width, or null inside the erase bar / where nothing was written yet. */
export function sweepTimeAt(s: Sweep, frac: number): number | null {
  const f = Math.max(0, Math.min(1, frac));
  if (f <= s.headFrac) return s.start + f * s.windowMs;
  const tOld = s.start - s.windowMs + f * s.windowMs;
  return tOld >= Math.max(0, s.t - s.windowMs + s.gapMs) && tOld >= 0 ? tOld : null;
}

/**
 * Time shown under reduced motion: the screen changes once per window (a full page) instead of sweeping — the page
 * holding t is shown complete (clamped to the record end).
 */
export function pagedTime(t: number, windowMs: number, durationMs: number): number {
  if (t >= durationMs) return durationMs;
  const end = (Math.floor(t / windowMs) + 1) * windowMs;
  return Math.min(durationMs, end - 1e-6);
}

/** Geometry of the monitor strip (paper mm): one lead, `windowMs` wide, baseline on a major line. */
export interface MonitorGeometry {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly baselineMm: number;
}

/**
 * Size the monitor strip for the whole record (the trace never leaves the screen as it sweeps): room above the
 * baseline for the largest positive deflection plus the label line, below for the largest negative one, both snapped
 * to whole 5 mm squares; tall artefacts are capped.
 */
export function monitorGeometry(maxMv: number, minMv: number, windowMs: number, speed: number, gain: number): MonitorGeometry {
  const cap = 35;
  const up = Math.min(cap, Math.max(0, maxMv) * gain);
  const down = Math.min(cap, Math.max(0, -minMv) * gain);
  const snap = (mm: number) => Math.ceil(mm / 5 - 1e-9) * 5 + 0;
  const above = snap(Math.max(up + 6, 10));
  const below = snap(Math.max(down + 2, 5));
  return { widthMm: (windowMs * speed) / 1000, heightMm: above + below, baselineMm: above };
}

/** Width (ms) of the erase bar ahead of the write head: about 3 % of the window, at least 120 ms. */
export const eraseGapMs = (windowMs: number): number => Math.max(120, Math.round(windowMs * 0.03));
