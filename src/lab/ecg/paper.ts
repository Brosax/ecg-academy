/**
 * ECG paper geometry — pure (no DOM). Conventions from docs/research/tech-stack.md §8a: 25 mm/s, 10 mm/mV,
 * 1 mm minor / 5 mm major squares (0.04 s × 0.1 mV / 0.2 s × 0.5 mV); 12-lead report = 3 rows × 4 columns of 2.5 s
 * (I II III | aVR aVL aVF | V1 V2 V3 | V4 V5 V6) plus a 10 s lead-II rhythm strip ("3×4+1").
 * Screen px per mm is chosen to fit the container (CSS mm is not physical mm, §8 "Unsourced").
 */
import type { LeadName } from '../sim/types';

export const PAPER = {
  mmPerS: 25,
  mmPerMv: 10,
  minorMm: 1,
  majorMm: 5,
  /** Calibration pulse: 1 mV (10 mm) high, 0.2 s (5 mm) wide. */
  calMv: 1,
  calWidthMs: 200,
} as const;

export const mmPerMs = PAPER.mmPerS / 1000;
export const msToMm = (ms: number): number => ms * mmPerMs;
export const mmToMs = (mm: number): number => mm / mmPerMs;
export const mvToMm = (mv: number): number => mv * PAPER.mmPerMv;
export const mmToMv = (mm: number): number => mm / PAPER.mmPerMv;

/** Largest px/mm such that a widthMm × heightMm sheet fits a cssW × cssH box (0 for an empty box). */
export function fitPxPerMm(cssW: number, cssH: number, widthMm: number, heightMm: number): number {
  if (cssW <= 0 || widthMm <= 0) return 0;
  const byW = cssW / widthMm;
  if (cssH <= 0 || heightMm <= 0) return byW;
  return Math.min(byW, cssH / heightMm);
}

/**
 * Which grid levels are legible at this scale (device px per mm). Minor lines closer than 3 device px turn into a
 * flat tint (phone width ≈ 1.3 CSS px/mm), so they are dropped; major lines need ≥ 4 device px.
 */
export function gridLevels(pxPerMm: number, dpr: number): { minor: boolean; major: boolean } {
  const dev = pxPerMm * dpr;
  return { minor: dev * PAPER.minorMm >= 3, major: dev * PAPER.majorMm >= 4 };
}

/**
 * Grid line positions (device px, already offset by 0.5 for crisp 1-px lines) along one axis.
 * Lines sit at originPx + i·stepPx for every integer i that falls inside [0, lengthPx].
 * `major` flags every 5th line counted from the origin.
 */
export function gridLines(originPx: number, stepPx: number, lengthPx: number): { pos: number; major: boolean }[] {
  const out: { pos: number; major: boolean }[] = [];
  if (stepPx <= 0) return out;
  const iStart = Math.ceil((0 - originPx) / stepPx);
  const iEnd = Math.floor((lengthPx - originPx) / stepPx);
  for (let i = iStart; i <= iEnd; i++) {
    out.push({ pos: Math.round(originPx + i * stepPx) + 0.5, major: ((i % 5) + 5) % 5 === 0 });
  }
  return out;
}

// ---------------------------------------------------------------- 12-lead sheet layout (mm)

/** Standard 3×4 arrangement; columns are I-group, aVR-group, V1-group, V4-group. */
export const GRID_3X4: readonly (readonly LeadName[])[] = [
  ['I', 'aVR', 'V1', 'V4'],
  ['II', 'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
];

export interface SheetCell {
  readonly lead: LeadName;
  readonly row: number;
  readonly col: number;
  /** Left edge of the trace area (mm). */
  readonly xMm: number;
  readonly wMm: number;
  /** Row top and the isoelectric baseline (mm, y grows downward). */
  readonly topMm: number;
  readonly baselineMm: number;
  readonly hMm: number;
}

export interface SheetLayout {
  readonly widthMm: number;
  readonly heightMm: number;
  /** Width reserved at the start of each row for the 1 mV calibration pulse. */
  readonly calMm: number;
  readonly cells: readonly SheetCell[];
  readonly rhythm: SheetCell;
  /** Duration of one column (ms). */
  readonly colMs: number;
  /** Duration of the rhythm strip (ms). */
  readonly rhythmMs: number;
}

export const SHEET = {
  colMs: 2500,
  rhythmMs: 10000,
  /** 1 mm margin + 5 mm pulse + 1 mm margin. */
  calMm: 7,
  rowMm: 30,
  /** Baseline 18 mm below the row top: room for +1.8 mV above and −1.2 mV below (R waves dominate). */
  baselineFromTopMm: 18,
  rightMarginMm: 2,
} as const;

export function sheetLayout(): SheetLayout {
  const colMm = msToMm(SHEET.colMs);
  const cells: SheetCell[] = [];
  GRID_3X4.forEach((leads, row) =>
    leads.forEach((lead, col) =>
      cells.push({
        lead,
        row,
        col,
        xMm: SHEET.calMm + col * colMm,
        wMm: colMm,
        topMm: row * SHEET.rowMm,
        baselineMm: row * SHEET.rowMm + SHEET.baselineFromTopMm,
        hMm: SHEET.rowMm,
      }),
    ),
  );
  const rhythm: SheetCell = {
    lead: 'II',
    row: 3,
    col: 0,
    xMm: SHEET.calMm,
    wMm: msToMm(SHEET.rhythmMs),
    topMm: 3 * SHEET.rowMm,
    baselineMm: 3 * SHEET.rowMm + SHEET.baselineFromTopMm,
    hMm: SHEET.rowMm,
  };
  return {
    widthMm: SHEET.calMm + 4 * colMm + SHEET.rightMarginMm,
    heightMm: 4 * SHEET.rowMm,
    calMm: SHEET.calMm,
    cells,
    rhythm,
    colMs: SHEET.colMs,
    rhythmMs: SHEET.rhythmMs,
  };
}

/** Cell (or the rhythm row) under a sheet point, or null. */
export function cellAt(layout: SheetLayout, xMm: number, yMm: number): SheetCell | null {
  for (const c of [...layout.cells, layout.rhythm]) {
    if (xMm >= c.xMm && xMm <= c.xMm + c.wMm && yMm >= c.topMm && yMm < c.topMm + c.hMm) return c;
  }
  return null;
}

/**
 * Calibration pulse polyline (mm) for a row: baseline → up 1 mV → 0.2 s plateau → down → baseline.
 * Starts 1 mm into the reserved area. `heightMm` = 1 mV at the strip's gain (10 mm at the standard 10 mm/mV).
 */
export function calibrationPulseMm(baselineMm: number, startXMm = 1, heightMm = mvToMm(PAPER.calMv)): [number, number][] {
  const w = msToMm(PAPER.calWidthMs);
  const h = heightMm;
  const x0 = startXMm, x1 = x0 + 1, x2 = x1 + w;
  return [
    [x0, baselineMm],
    [x1, baselineMm],
    [x1, baselineMm - h],
    [x2, baselineMm - h],
    [x2, baselineMm],
    [x2 + 1, baselineMm],
  ];
}

// ---------------------------------------------------------------- time mapping

/**
 * Monitor sweep: a window of `windowMs` is written left → right; the cursor sits at the current time; an eraser gap of
 * `gapMs` ahead of the cursor separates new data from the previous sweep (patent US5953018 "erase bar", §8a).
 * `phaseMs` shifts where sweeps start (sweeps begin at phase + k·window), so a strip zoomed to whole beats can start
 * each sweep just before a P wave and show complete beats at a fixed place.
 */
export interface Sweep {
  readonly windowMs: number;
  readonly gapMs: number;
  readonly t: number;
  /** Start of the current sweep. */
  readonly start: number;
  /** Cursor position as a fraction of the width. */
  readonly cursorFrac: number;
  /** Time spans to draw, with their fractional x offset: x = (τ − tOrigin) / windowMs. */
  readonly spans: readonly { readonly t0: number; readonly t1: number; readonly tOrigin: number }[];
}

export function sweep(t: number, windowMs: number, gapMs: number, phaseMs = 0): Sweep {
  const start = Math.floor((t - phaseMs) / windowMs) * windowMs + phaseMs;
  const cursorFrac = (t - start) / windowMs;
  const spans: { t0: number; t1: number; tOrigin: number }[] = [];
  if (t > start) spans.push({ t0: start, t1: t, tOrigin: start });
  const oldStart = t - windowMs + gapMs;
  if (oldStart < start) spans.push({ t0: oldStart, t1: start, tOrigin: start - windowMs });
  return { windowMs, gapMs, t, start, cursorFrac, spans };
}

/** Fraction of the width (0..1) at which absolute time τ is drawn, or null when τ is not visible. */
export function sweepFracOf(s: Sweep, tau: number): number | null {
  for (const sp of s.spans) if (tau >= sp.t0 && tau <= sp.t1) return (tau - sp.tOrigin) / s.windowMs;
  return null;
}

/** Absolute time under a fraction of the width, or null inside the eraser gap / beyond the data. */
export function sweepTimeAt(s: Sweep, frac: number): number | null {
  const tau0 = s.start + frac * s.windowMs;
  if (frac <= s.cursorFrac) return tau0 <= s.t ? tau0 : null;
  const tau1 = s.start - s.windowMs + frac * s.windowMs;
  return tau1 >= s.t - s.windowMs + s.gapMs ? tau1 : null;
}

/**
 * Clinical printout: the last 10 s ending at `anchor`; column c shows [anchor − 10 s + 2.5c s, +2.5 s).
 * Returns the start time of a column.
 */
export function clinicalColumnStart(anchor: number, col: number, colMs = SHEET.colMs, totalMs = SHEET.rhythmMs): number {
  return anchor - totalMs + col * colMs;
}

/** Column whose span holds τ in a clinical sheet anchored at `anchor`, or −1 when τ is outside the last 10 s. */
export function clinicalColumnOf(anchor: number, tau: number, colMs = SHEET.colMs, totalMs = SHEET.rhythmMs): number {
  const rel = tau - (anchor - totalMs);
  if (rel < 0 || rel > totalMs) return -1;
  return Math.min(Math.floor(rel / colMs), Math.round(totalMs / colMs) - 1);
}

/**
 * Snapshot anchor for the clinical layout. While playing it advances in whole columns (a fresh printout every 2.5 s);
 * when paused it stays put if the current time is already on the sheet (so clicking a trace does not move it) and
 * otherwise jumps to the current time.
 */
export function clinicalAnchor(prev: number | null, t: number, playing: boolean, colMs = SHEET.colMs, totalMs = SHEET.rhythmMs): number {
  if (playing) return Math.floor(t / colMs) * colMs;
  if (prev !== null && t > prev - totalMs && t <= prev) return prev;
  return t;
}
