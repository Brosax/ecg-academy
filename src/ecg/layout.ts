/**
 * Sheet geometry for every viewer layout — pure (no DOM), unit-tested.
 *
 * Everything is laid out in paper millimetres (x right, y down, origin at the sheet's top-left). Conventions:
 *  - The printable trace width is fixed (250 mm, like a real 12-lead page), so the speed changes how much time fits:
 *    3×4 columns are 2.5 s at 25 mm/s and 1.25 s at 50 mm/s; rhythm strips 10 s / 5 s.
 *  - Each row starts with a calibration-pulse zone; traces start on a major (5 mm) line and every baseline sits on a
 *    major line, so learners can count squares from the baseline.
 *  - Row height adapts to the amplitudes of the leads in that row at the row's gain (true mm/mV is never changed),
 *    snapped to whole major squares; tall artefacts are capped so one spike cannot blow up the sheet.
 *  - Cabrera: limb leads in the order aVL, I, −aVR, II, aVF, III; −aVR is aVR inverted (panel.invert) and labelled
 *    with a true minus sign. Picks and marks always speak the real lead ('aVR') and its true voltage.
 *  - 6×2 shows both columns over the same time window (limb leads left, chest leads right), so one beat lines up
 *    across all twelve leads.
 */
import type { EcgSignal } from '../core/ecg';
import type { Lead } from '../core/leads';
import type { LayoutId } from '../app/store';
import { calZoneMm, ceilMajor, mmToMs, msToMm, type Gain, type Speed } from './paper';

/** Trace width of a standard page, mm (10 s at 25 mm/s). */
export const PAGE_TRACE_MM = 250;
/** Right margin after the traces, mm. */
export const RIGHT_MARGIN_MM = 5;
/** Gap between the two 6×2 columns (the time restarts there), mm. */
export const COL_GAP_MM = 5;
/** Room kept under the bracket-host trace for the PR / QRS / QT brackets, mm. */
export const BRACKET_ROOM_MM = 15;
/**
 * Band kept free at the top of every row when ST markers are on: their read-out ("ST +1.0 mm (+0.10 mV)") follows the
 * lead label there and must not run into the tallest wave or its label.
 */
export const READOUT_BAND_MM = 5;
/** Amplitude beyond which a row stops growing (mm above or below the baseline). */
export const MAX_EXCURSION_MM = 35;
/** Shortest time span a panel may show (ms) — guards against empty records and inverted windows. */
export const MIN_SPAN_MS = 100;

export const MINUS = '−';

export interface LayoutOptions {
  readonly layout: LayoutId;
  readonly speed: Speed;
  readonly gain: Gain;
  readonly chestHalfGain: boolean;
  readonly cabrera: boolean;
  /** lead of 'single' / 'strip' and the rhythm strip of '3x4+1' */
  readonly lead: Lead;
  /** single / strip: the time window; other layouts: window[0] is the start of the sheet */
  readonly window: readonly [number, number] | null;
  /** reserve room under the bracket host for interval brackets */
  readonly brackets: boolean;
  /** reserve a little room above and below traces for wave labels */
  readonly waveLabels: boolean;
  /** reserve the read-out band at the top of each row (ST markers) */
  readonly stMarkers: boolean;
}

export interface DisplayLead {
  readonly lead: Lead;
  readonly invert: boolean;
  readonly label: string;
}

/**
 * cell   — one lead of a multi-lead grid (3×4 cells, 6×2, 12×1);
 * rhythm — a long rhythm strip under a 3×4 grid;
 * lead   — the only lead on the sheet ('single', or one row of 'strip').
 */
export type PanelKind = 'cell' | 'rhythm' | 'lead';

export interface Panel extends DisplayLead {
  readonly index: number;
  readonly kind: PanelKind;
  readonly row: number;
  readonly col: number;
  /** left edge of the trace area and its width (mm) */
  readonly xMm: number;
  readonly wMm: number;
  /** time (ms) at the left and right edges */
  readonly t0: number;
  readonly t1: number;
  readonly speed: Speed;
  /** effective gain (mm/mV) — half the sheet gain on chest leads when chest half gain is on */
  readonly gain: number;
  readonly chest: boolean;
  /** this panel carries the PR / QRS / QT brackets */
  readonly bracketHost: boolean;
}

export interface Row {
  readonly index: number;
  readonly topMm: number;
  readonly hMm: number;
  readonly baselineMm: number;
  /** calibration pulse step heights (mm): [10] plain, [10, 5] stepped (limb, then chest at half gain) */
  readonly cal: readonly number[];
  /** room reserved at the bottom of the row for brackets (mm) */
  readonly bracketMm: number;
}

export interface Separator {
  readonly row: number;
  readonly xMm: number;
}

export interface Sheet {
  readonly opts: LayoutOptions;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly calZoneMm: number;
  readonly rows: readonly Row[];
  readonly panels: readonly Panel[];
  readonly separators: readonly Separator[];
  /** overall time span on the sheet (ms) */
  readonly t0: number;
  readonly t1: number;
}

// ───────────────────────────────────────────────────────────────────────────── leads

const STD_LIMB: readonly Lead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const CABRERA: readonly Lead[] = ['aVL', 'I', 'aVR', 'II', 'aVF', 'III'];
const CHEST: readonly Lead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

export const isChest = (lead: Lead): boolean => lead.startsWith('V');

/** How a lead is shown: in Cabrera mode aVR is inverted and labelled −aVR. */
export function displayLead(lead: Lead, cabrera: boolean): DisplayLead {
  if (cabrera && lead === 'aVR') return { lead, invert: true, label: `${MINUS}aVR` };
  return { lead, invert: false, label: lead };
}

/** The six limb leads in display order (standard or Cabrera). */
export function limbOrder(cabrera: boolean): DisplayLead[] {
  return (cabrera ? CABRERA : STD_LIMB).map((l) => displayLead(l, cabrera));
}

/**
 * 3×4 grid rows. Column 1 holds limb leads 1–3, column 2 limb leads 4–6, columns 3–4 V1–V3 and V4–V6:
 * standard → I aVR V1 V4 / II aVL V2 V5 / III aVF V3 V6; Cabrera → aVL II V1 V4 / I aVF V2 V5 / −aVR III V3 V6.
 */
export function grid3x4(cabrera: boolean): DisplayLead[][] {
  const limb = limbOrder(cabrera);
  const ch = CHEST.map((l) => displayLead(l, cabrera));
  return [0, 1, 2].map((r) => [limb[r], limb[r + 3], ch[r], ch[r + 3]]);
}

// ───────────────────────────────────────────────────────────────────────────── signal access

export function leadArray(sig: EcgSignal, lead: Lead): Float32Array | null {
  return (sig.leads as Readonly<Partial<Record<Lead, Float32Array>>>)[lead] ?? null;
}

/** Max and min (mV) of a lead over [t0, t1] (0/0 when the lead is missing). */
export function leadExtent(sig: EcgSignal, lead: Lead, t0: number, t1: number): { max: number; min: number } {
  const a = leadArray(sig, lead);
  if (!a || a.length === 0) return { max: 0, min: 0 };
  const i0 = Math.max(0, Math.floor((t0 * sig.fs) / 1000));
  const i1 = Math.min(a.length - 1, Math.ceil((t1 * sig.fs) / 1000));
  let max = -Infinity, min = Infinity;
  for (let i = i0; i <= i1; i++) {
    const v = a[i];
    if (v > max) max = v;
    if (v < min) min = v;
  }
  return Number.isFinite(max) ? { max, min } : { max: 0, min: 0 };
}

// ───────────────────────────────────────────────────────────────────────────── layout

interface PanelDraft extends DisplayLead {
  readonly kind: PanelKind;
  readonly col: number;
  readonly xMm: number;
  readonly t0: number;
  readonly t1: number;
  readonly bracketHost: boolean;
}

function clampWindow(w: readonly [number, number] | null, dur: number): [number, number] {
  const total = Math.max(MIN_SPAN_MS, dur);
  let a = w ? Math.min(w[0], w[1]) : 0;
  let b = w ? Math.max(w[0], w[1]) : total;
  a = Math.max(0, Math.min(a, total - MIN_SPAN_MS));
  b = Math.max(a + MIN_SPAN_MS, Math.min(b, total));
  return [a, b];
}

/** Start of a multi-lead sheet and the time available after it. */
function sheetStart(o: LayoutOptions, dur: number): { start: number; avail: number } {
  const total = Math.max(MIN_SPAN_MS, dur);
  const start = Math.max(0, Math.min(o.window ? Math.min(o.window[0], o.window[1]) : 0, total - MIN_SPAN_MS));
  return { start, avail: total - start };
}

function draftRows(o: LayoutOptions, dur: number, cal: number): PanelDraft[][] {
  const page = mmToMs(PAGE_TRACE_MM, o.speed);
  const d = (dl: DisplayLead, kind: PanelKind, col: number, xMm: number, t0: number, t1: number, bracketHost = false): PanelDraft => ({
    ...dl,
    kind,
    col,
    xMm,
    t0,
    t1,
    bracketHost,
  });
  switch (o.layout) {
    case '3x4+1':
    case '3x4+3': {
      const { start, avail } = sheetStart(o, dur);
      const span = Math.max(MIN_SPAN_MS, Math.min(page, avail));
      const colMs = span / 4;
      const colMm = msToMm(colMs, o.speed);
      const rows: PanelDraft[][] = grid3x4(o.cabrera).map((leads) =>
        leads.map((dl, c) => d(dl, 'cell', c, cal + c * colMm, start + c * colMs, start + (c + 1) * colMs)),
      );
      const rhythm: Lead[] = o.layout === '3x4+1' ? [o.lead] : ['II', 'V1', 'V5'];
      rhythm.forEach((l, i) => rows.push([d(displayLead(l, o.cabrera), 'rhythm', 0, cal, start, start + span, i === 0)]));
      return rows;
    }
    case '6x2': {
      const { start, avail } = sheetStart(o, dur);
      const span = Math.max(MIN_SPAN_MS, Math.min(page / 2, avail));
      const colMm = msToMm(span, o.speed);
      const limb = limbOrder(o.cabrera);
      return limb.map((dl, r) => [
        d(dl, 'cell', 0, cal, start, start + span, dl.lead === 'II'),
        d(displayLead(CHEST[r], o.cabrera), 'cell', 1, cal + colMm + COL_GAP_MM, start, start + span),
      ]);
    }
    case '12x1': {
      const { start, avail } = sheetStart(o, dur);
      const span = Math.max(MIN_SPAN_MS, Math.min(page, avail));
      const all = [...limbOrder(o.cabrera), ...CHEST.map((l) => displayLead(l, o.cabrera))];
      return all.map((dl) => [d(dl, 'cell', 0, cal, start, start + span, dl.lead === 'II')]);
    }
    case 'single': {
      const [a, b] = clampWindow(o.window, dur);
      return [[d(displayLead(o.lead, o.cabrera), 'lead', 0, cal, a, b, true)]];
    }
    case 'strip': {
      const [a, b] = clampWindow(o.window, dur);
      const rows: PanelDraft[][] = [];
      const dl = displayLead(o.lead, o.cabrera);
      for (let t = a, k = 0; t < b - 0.5; t += page, k++) rows.push([d(dl, 'lead', 0, cal, t, Math.min(b, t + page), k === 0)]);
      return rows;
    }
  }
}

/** Compute the whole sheet for a signal and the viewer options. */
export function computeSheet(sig: EcgSignal, o: LayoutOptions): Sheet {
  const cal = calZoneMm(o.speed);
  const drafts = draftRows(o, sig.durationMs, cal);
  const rows: Row[] = [];
  const panels: Panel[] = [];
  const separators: Separator[] = [];
  let y = 0;
  let maxRight = cal;
  let tMin = Infinity, tMax = -Infinity;
  drafts.forEach((rowDrafts, r) => {
    let up = 0, down = 0, hasLimb = false, hasChest = false, host = false;
    for (const p of rowDrafts) {
      const chest = isChest(p.lead);
      const g = chest && o.chestHalfGain ? o.gain / 2 : o.gain;
      if (chest) hasChest = true;
      else hasLimb = true;
      host ||= p.bracketHost && o.brackets;
      const e = leadExtent(sig, p.lead, p.t0, p.t1);
      const hi = p.invert ? -e.min : e.max;
      const lo = p.invert ? -e.max : e.min;
      up = Math.max(up, Math.min(MAX_EXCURSION_MM, Math.max(0, hi) * g));
      down = Math.max(down, Math.min(MAX_EXCURSION_MM, Math.max(0, -lo) * g));
    }
    const calSteps = !o.chestHalfGain || !hasChest ? [o.gain] : hasLimb ? [o.gain, o.gain / 2] : [o.gain / 2];
    const pad = (o.waveLabels ? 4 : 1.5) + (o.stMarkers ? READOUT_BAND_MM : 0);
    const above = ceilMajor(Math.max(up + pad, Math.max(...calSteps) + 2.5, 7.5));
    const below = ceilMajor(Math.max(down + pad, 5));
    const bracketMm = host ? BRACKET_ROOM_MM : 0;
    const row: Row = { index: r, topMm: y, hMm: above + below + bracketMm, baselineMm: y + above, cal: calSteps, bracketMm };
    rows.push(row);
    y += row.hMm;
    rowDrafts.forEach((p, i) => {
      const chest = isChest(p.lead);
      const wMm = msToMm(p.t1 - p.t0, o.speed);
      panels.push({
        index: panels.length,
        lead: p.lead,
        invert: p.invert,
        label: p.label,
        kind: p.kind,
        row: r,
        col: p.col,
        xMm: p.xMm,
        wMm,
        t0: p.t0,
        t1: p.t1,
        speed: o.speed,
        gain: chest && o.chestHalfGain ? o.gain / 2 : o.gain,
        chest,
        bracketHost: p.bracketHost && o.brackets,
      });
      if (i > 0) separators.push({ row: r, xMm: p.xMm });
      maxRight = Math.max(maxRight, p.xMm + wMm);
      tMin = Math.min(tMin, p.t0);
      tMax = Math.max(tMax, p.t1);
    });
  });
  return {
    opts: o,
    widthMm: maxRight + RIGHT_MARGIN_MM,
    heightMm: y,
    calZoneMm: cal,
    rows,
    panels,
    separators,
    t0: Number.isFinite(tMin) ? tMin : 0,
    t1: Number.isFinite(tMax) ? tMax : 0,
  };
}

// ───────────────────────────────────────────────────────────────────────────── mapping (sheet mm)

export const xOfT = (p: Panel, t: number): number => p.xMm + msToMm(t - p.t0, p.speed);
export const tOfX = (p: Panel, xMm: number): number => p.t0 + mmToMs(xMm - p.xMm, p.speed);
/** y (mm) of a true lead voltage in a panel (inverted panels draw −v). */
export const yOfMv = (row: Row, p: Panel, mv: number): number => row.baselineMm - (p.invert ? -mv : mv) * p.gain;
/** True lead voltage (mV) at a y (mm) in a panel. */
export function mvOfY(row: Row, p: Panel, yMm: number): number {
  const d = (row.baselineMm - yMm) / p.gain;
  return p.invert ? -d : d;
}
export const rowOf = (s: Sheet, p: Panel): Row => s.rows[p.row];
export const inPanelTime = (p: Panel, t: number): boolean => t >= p.t0 && t <= p.t1;

/** Panel under a sheet point (mm), or null (calibration zone, gaps, margins). `slackMm` widens the x test. */
export function panelAt(s: Sheet, xMm: number, yMm: number, slackMm = 0): Panel | null {
  const row = s.rows.find((r) => yMm >= r.topMm && yMm < r.topMm + r.hMm);
  if (!row) return null;
  let best: Panel | null = null, bestD = Infinity;
  for (const p of s.panels) {
    if (p.row !== row.index) continue;
    const d = xMm < p.xMm ? p.xMm - xMm : xMm > p.xMm + p.wMm ? xMm - (p.xMm + p.wMm) : 0;
    if (d <= slackMm && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

/** Panels that show a lead ('all' = every panel) at time t (t omitted: any time). */
export function panelsFor(s: Sheet, lead: Lead | 'all', t?: number): Panel[] {
  return s.panels.filter((p) => (lead === 'all' || p.lead === lead) && (t === undefined || inPanelTime(p, t)));
}

// ───────────────────────────────────────────────────────────────────────────── screen frame (CSS px)

/** Placement of the sheet on screen: CSS px per mm and the CSS-px position of sheet mm (0, 0). */
export interface Frame {
  readonly pxPerMm: number;
  readonly ox: number;
  readonly oy: number;
}

export const pxX = (f: Frame, xMm: number): number => f.ox + xMm * f.pxPerMm;
export const pxY = (f: Frame, yMm: number): number => f.oy + yMm * f.pxPerMm;
export const mmX = (f: Frame, px: number): number => (px - f.ox) / f.pxPerMm;
export const mmY = (f: Frame, px: number): number => (px - f.oy) / f.pxPerMm;

export interface Hit {
  readonly panel: Panel;
  readonly row: Row;
  /** time under the point, clamped to the panel window (ms) */
  readonly tMs: number;
  /** true lead voltage at the pointer's height (mV) — not the trace value */
  readonly yMv: number;
}

/** Hit-test a CSS-px point (relative to the canvas). */
export function hitTest(s: Sheet, f: Frame, x: number, y: number, slackMm = 0): Hit | null {
  if (!(f.pxPerMm > 0)) return null;
  const xm = mmX(f, x), ym = mmY(f, y);
  const panel = panelAt(s, xm, ym, slackMm);
  if (!panel) return null;
  const row = s.rows[panel.row];
  const t = Math.max(panel.t0, Math.min(panel.t1, tOfX(panel, xm)));
  return { panel, row, tMs: t, yMv: mvOfY(row, panel, ym) };
}
