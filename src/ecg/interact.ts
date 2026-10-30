/**
 * Viewer interaction logic — pure (no DOM), unit-tested. The DOM controller (view.ts) only translates events into
 * these calls and draws the result.
 *
 *  - Tools: calipers (time or amplitude mode, optional march-out), magnifier, crosshair; availability comes from
 *    props.tools (undefined = all available, false = none).
 *  - Keyboard focus point: a (panel, time) the learner moves with the arrow keys; Enter selects it (pick or cursor).
 *    ←/→ move it one small square (Shift: one large square) and continue into the next column of a 3×4 row;
 *    ↑/↓ move to the panel above / below at the same x (same time on every standard layout).
 *  - Calipers by keyboard: ←/→ nudge the active line(s) (4 ms, Shift one small square), Space switches the active line
 *    (1 → 2 → both), ↑/↓ move them to the panel above / below (time mode) or nudge the voltage lines (amplitude mode).
 *  - Calipers by pointer: drag a line to move it, the bar to move both, or drag anywhere on a panel to lay new ones.
 */
import { sampleAt, type EcgSignal } from '../core/ecg';
import type { Lang } from '../core/l10n';
import type { CaliperMeasure } from './api';
import { caliperReadout, defaultCalipers, moveMv, moveTime, mvStep, timeStep, type CaliperMode, type CaliperState } from './calipers';
import { fmtNum } from './format';
import { leadArray, mmX, mmY, mvOfY, pxX, pxY, rowOf, tOfX, xOfT, yOfMv, type Frame, type Panel, type Sheet } from './layout';
import { msPerSmallSquare } from './paper';

// ───────────────────────────────────────────────────────────────────────────── tools

export interface ToolAvail {
  readonly calipers: boolean;
  readonly magnifier: boolean;
  readonly crosshair: boolean;
}

export interface ToolState {
  readonly calipers: boolean;
  readonly amplitude: boolean;
  readonly march: boolean;
  readonly magnifier: boolean;
  readonly crosshair: boolean;
}

export const NO_TOOLS: ToolState = { calipers: false, amplitude: false, march: false, magnifier: false, crosshair: false };

export type ToolKey = keyof ToolState;

export function resolveTools(t: false | { readonly calipers?: boolean; readonly magnifier?: boolean; readonly crosshair?: boolean } | undefined): ToolAvail {
  if (t === false) return { calipers: false, magnifier: false, crosshair: false };
  return { calipers: t?.calipers ?? true, magnifier: t?.magnifier ?? true, crosshair: t?.crosshair ?? true };
}

export const anyTool = (a: ToolAvail): boolean => a.calipers || a.magnifier || a.crosshair;
export const anyToolOn = (s: ToolState): boolean => s.calipers || s.magnifier || s.crosshair;

/** Toggle one tool. Amplitude and march-out are caliper modes: switching one on also switches the calipers on. */
export function toggleTool(s: ToolState, key: ToolKey, avail: ToolAvail): ToolState {
  const capKey = key === 'amplitude' || key === 'march' ? 'calipers' : key;
  if (!avail[capKey]) return s;
  const on = !s[key];
  switch (key) {
    case 'calipers':
      return on ? { ...s, calipers: true } : { ...s, calipers: false, amplitude: false, march: false };
    case 'amplitude':
      return { ...s, calipers: s.calipers || on, amplitude: on, march: on ? false : s.march };
    case 'march':
      return { ...s, calipers: s.calipers || on, march: on, amplitude: on ? false : s.amplitude };
    default:
      return { ...s, [key]: on };
  }
}

/** Keep only available tools switched on. */
export function clampTools(s: ToolState, avail: ToolAvail): ToolState {
  return {
    calipers: s.calipers && avail.calipers,
    amplitude: s.amplitude && avail.calipers,
    march: s.march && avail.calipers,
    magnifier: s.magnifier && avail.magnifier,
    crosshair: s.crosshair && avail.crosshair,
  };
}

export const caliperMode = (s: ToolState): CaliperMode => (s.amplitude ? 'amplitude' : 'time');

// ───────────────────────────────────────────────────────────────────────────── focus point

export interface FocusPoint {
  readonly panel: number;
  readonly t: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Where keyboard navigation starts: the cursor if a panel shows it (rhythm strip first), else the first panel's middle. */
export function initialFocus(s: Sheet, cursor: number | null): FocusPoint | null {
  if (s.panels.length === 0) return null;
  if (cursor !== null) {
    const showing = s.panels.filter((p) => cursor >= p.t0 && cursor <= p.t1);
    const p = showing.find((q) => q.kind === 'rhythm') ?? showing[0];
    if (p) return { panel: p.index, t: cursor };
  }
  const p = s.panels[0];
  return { panel: p.index, t: (p.t0 + p.t1) / 2 };
}

/**
 * Panel in the row above (dir −1) or below (+1) at the same sheet x — on every standard layout that is the same time
 * (3×4 columns sit over the matching part of the rhythm strip; 6×2 columns stack; strip rows continue the record).
 */
export function rowNeighbour(s: Sheet, from: FocusPoint, dir: -1 | 1): FocusPoint | null {
  const p = s.panels[from.panel];
  if (!p) return null;
  const x = xOfT(p, from.t);
  const row = p.row + dir;
  const cands = s.panels.filter((q) => q.row === row);
  if (cands.length === 0) return null;
  let best = cands[0], bd = Infinity;
  for (const q of cands) {
    const d = x < q.xMm ? q.xMm - x : x > q.xMm + q.wMm ? x - (q.xMm + q.wMm) : 0;
    if (d < bd) {
      best = q;
      bd = d;
    }
  }
  return { panel: best.index, t: clamp(tOfX(best, x), best.t0, best.t1) };
}

/** Move the focus point in time; past the panel edge it continues in the panel of the same row that shows that time. */
export function stepFocus(s: Sheet, f: FocusPoint, dt: number): FocusPoint {
  const p = s.panels[f.panel];
  if (!p) return f;
  const t = f.t + dt;
  if (t >= p.t0 && t <= p.t1) return { panel: p.index, t };
  const next = s.panels.find((q) => q.row === p.row && q !== p && t >= q.t0 && t <= q.t1 && (dt > 0 ? q.xMm > p.xMm : q.xMm < p.xMm));
  if (next) return { panel: next.index, t };
  return { panel: p.index, t: clamp(t, p.t0, p.t1) };
}

/**
 * Keep the keyboard point on its lead after the sheet changed (layout, speed, Cabrera…): the panel of the same lead
 * that shows the same time (a rhythm strip of that lead counts), else null — never the panel that merely took its index.
 */
export function reconcileFocus(prev: Sheet, next: Sheet, f: FocusPoint | null): FocusPoint | null {
  const was = f ? prev.panels[f.panel] : undefined;
  if (!f || !was) return null;
  const same = next.panels.filter((p) => p.lead === was.lead && f.t >= p.t0 && f.t <= p.t1);
  const p = same.find((q) => q.kind === was.kind) ?? same[0];
  return p ? { panel: p.index, t: f.t } : null;
}

/** Cursor step: one small square, Shift one large square. */
export const cursorStep = (speed: number, coarse: boolean): number => msPerSmallSquare(speed) * (coarse ? 5 : 1);

/** The panel new calipers go to: the focus panel, else the first rhythm strip, else the first panel. */
export function caliperHomePanel(s: Sheet, focus: FocusPoint | null): Panel | null {
  if (focus && s.panels[focus.panel]) return s.panels[focus.panel];
  return s.panels.find((p) => p.kind === 'rhythm') ?? s.panels[0] ?? null;
}

/**
 * Re-home calipers after the sheet changed (layout, speed…): keep them if their panel still shows their times. The two
 * lines may have been dragged past each other, so the test uses the earlier and the later line, not t0 / t1.
 */
export function reconcileCalipers(s: Sheet, c: CaliperState | null, lead: string | null): CaliperState | null {
  if (!c) return null;
  const lo = Math.min(c.t0, c.t1), hi = Math.max(c.t0, c.t1);
  const shows = (p: Panel) => lo >= p.t0 && hi <= p.t1;
  const same = s.panels.find((p) => p.lead === lead && shows(p));
  if (same) return { ...c, panel: same.index };
  const any = s.panels.find(shows);
  if (any) return { ...c, panel: any.index };
  const home = caliperHomePanel(s, null);
  return home ? { ...defaultCalipers(home.index, home.t0, home.t1), mv0: c.mv0, mv1: c.mv1 } : null;
}

// ───────────────────────────────────────────────────────────────────────────── pointer ↔ calipers

/** Caliper handle size in CSS px (grab tolerance and the drawn squares). */
export const HANDLE_TOL_PX = 7;
/** Bar offset from the panel top (time mode) or from the panel's right edge (amplitude mode), CSS px. */
export const BAR_OFFSET_PX = 5;

/** Which part of the calipers is under a CSS-px point: 0 / 1 = a line, 2 = the bar (moves both), −1 = none. */
export function caliperHandleAt(s: Sheet, f: Frame, c: CaliperState, mode: CaliperMode, x: number, y: number, tol = HANDLE_TOL_PX): -1 | 0 | 1 | 2 {
  const p = s.panels[c.panel];
  if (!p) return -1;
  const r = rowOf(s, p);
  const top = pxY(f, r.topMm), bottom = pxY(f, r.topMm + r.hMm - r.bracketMm);
  const left = pxX(f, p.xMm), right = pxX(f, p.xMm + p.wMm);
  if (y < top - tol || y > bottom + tol || x < left - tol || x > right + tol) return -1;
  if (mode === 'time') {
    const xa = pxX(f, xOfT(p, c.t0)), xb = pxX(f, xOfT(p, c.t1));
    const yb = top + BAR_OFFSET_PX;
    if (Math.abs(y - yb) <= tol && x > Math.min(xa, xb) + tol && x < Math.max(xa, xb) - tol) return 2;
    const da = Math.abs(x - xa), db = Math.abs(x - xb);
    if (Math.min(da, db) > tol) return -1;
    return da <= db ? 0 : 1;
  }
  const ya = pxY(f, yOfMv(r, p, c.mv0)), yb = pxY(f, yOfMv(r, p, c.mv1));
  const xb = right - BAR_OFFSET_PX;
  if (Math.abs(x - xb) <= tol && y > Math.min(ya, yb) + tol && y < Math.max(ya, yb) - tol) return 2;
  const da = Math.abs(y - ya), db = Math.abs(y - yb);
  if (Math.min(da, db) > tol) return -1;
  return da <= db ? 0 : 1;
}

/** Time and true voltage under a CSS-px point in a given panel (time clamped to the panel window). */
export function pointIn(s: Sheet, f: Frame, p: Panel, x: number, y: number): { t: number; mv: number } {
  const r = rowOf(s, p);
  return { t: clamp(tOfX(p, mmX(f, x)), p.t0, p.t1), mv: mvOfY(r, p, mmY(f, y)) };
}

/**
 * Drag result: `start` is the caliper state when the drag began and (x0, y0) / (x, y) the pointer then and now
 * (CSS px). Lines follow the pointer; the bar translates both lines.
 */
export function dragCalipers(
  s: Sheet,
  f: Frame,
  start: CaliperState,
  mode: CaliperMode,
  which: 0 | 1 | 2,
  x0: number,
  y0: number,
  x: number,
  y: number,
): CaliperState {
  const p = s.panels[start.panel];
  if (!p) return start;
  const a = pointIn(s, f, p, x0, y0), b = pointIn(s, f, p, x, y);
  if (mode === 'time') {
    if (which === 2) return moveTime(start, 'both', b.t - a.t, p.t0, p.t1);
    return which === 0 ? { ...start, t0: b.t } : { ...start, t1: b.t };
  }
  if (which === 2) return moveMv(start, 'both', b.mv - a.mv);
  return which === 0 ? { ...start, mv0: b.mv } : { ...start, mv1: b.mv };
}

/** New calipers laid by dragging across a panel from (x0, y0) to (x, y). */
export function layCalipers(s: Sheet, f: Frame, p: Panel, mode: CaliperMode, prev: CaliperState | null, x0: number, y0: number, x: number, y: number): CaliperState {
  const a = pointIn(s, f, p, x0, y0), b = pointIn(s, f, p, x, y);
  if (mode === 'time') return { panel: p.index, t0: a.t, t1: b.t, mv0: prev?.mv0 ?? 0, mv1: prev?.mv1 ?? 1 };
  const mid = (p.t0 + p.t1) / 2;
  return { panel: p.index, t0: prev?.t0 ?? mid - 200, t1: prev?.t1 ?? mid + 200, mv0: a.mv, mv1: b.mv };
}

/** What onCaliper reports. */
export function caliperMeasure(s: Sheet, c: CaliperState, mode: CaliperMode): CaliperMeasure {
  const p = s.panels[c.panel];
  const lo = Math.min(c.t0, c.t1), hi = Math.max(c.t0, c.t1);
  const base = { lead: p ? p.lead : null, t0: lo, t1: hi, dtMs: hi - lo };
  return mode === 'amplitude' ? { ...base, mv0: c.mv0, mv1: c.mv1 } : base;
}

// ───────────────────────────────────────────────────────────────────────────── keyboard

export interface KeyState {
  readonly tools: ToolState;
  readonly cal: CaliperState | null;
  /** active caliper handle: 0, 1, 2 = both */
  readonly active: 0 | 1 | 2;
  readonly focus: FocusPoint | null;
}

export interface KeyContext {
  readonly sheet: Sheet;
  readonly avail: ToolAvail;
  readonly cursor: number | null;
}

export interface KeyResult {
  readonly state: KeyState;
  /** the key was used (the caller prevents the default action) */
  readonly handled: boolean;
  /** the focus point was selected (Enter / Space): pick or set the cursor */
  readonly select?: FocusPoint;
  /** the focus point moved */
  readonly moved?: boolean;
  /** the calipers changed (report onCaliper) */
  readonly caliperChanged?: boolean;
}

const unhandled = (state: KeyState): KeyResult => ({ state, handled: false });

/** Apply one key press. Modifier combinations other than Shift are never handled (browser shortcuts stay intact). */
export function applyKey(ctx: KeyContext, st: KeyState, key: string, mods: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean }): KeyResult {
  if (mods.ctrl || mods.alt || mods.meta) return unhandled(st);
  const { sheet } = ctx;
  const focus = st.focus ?? initialFocus(sheet, ctx.cursor);
  const calOn = st.tools.calipers && st.cal !== null;
  const mode = caliperMode(st.tools);
  const toggle = (k: ToolKey): KeyResult => {
    const tools = toggleTool(st.tools, k, ctx.avail);
    if (tools === st.tools) return unhandled(st);
    let cal = st.cal;
    if (tools.calipers && !cal) {
      const home = caliperHomePanel(sheet, st.focus);
      cal = home ? defaultCalipers(home.index, home.t0, home.t1) : null;
    }
    return { state: { ...st, tools, cal }, handled: true, caliperChanged: tools.calipers && (cal !== st.cal || tools.amplitude !== st.tools.amplitude) };
  };
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowRight': {
      const sign = key === 'ArrowLeft' ? -1 : 1;
      if (calOn && mode === 'time' && st.cal) {
        const p = sheet.panels[st.cal.panel];
        if (!p) return unhandled(st);
        const which = st.active === 2 ? 'both' : st.active;
        const cal = moveTime(st.cal, which, sign * timeStep(p.speed, mods.shift), p.t0, p.t1);
        return { state: { ...st, cal }, handled: true, caliperChanged: true };
      }
      if (!focus) return unhandled(st);
      const p = sheet.panels[focus.panel];
      const next = stepFocus(sheet, focus, sign * cursorStep(p?.speed ?? 25, mods.shift));
      return { state: { ...st, focus: next }, handled: true, moved: true };
    }
    case 'ArrowUp':
    case 'ArrowDown': {
      const dir = key === 'ArrowUp' ? -1 : 1;
      if (calOn && st.cal) {
        const p = sheet.panels[st.cal.panel];
        if (!p) return unhandled(st);
        if (mode === 'amplitude') {
          const which = st.active === 2 ? 'both' : st.active;
          const cal = moveMv(st.cal, which, -dir * mvStep(p.gain, mods.shift));
          return { state: { ...st, cal }, handled: true, caliperChanged: true };
        }
        const a = rowNeighbour(sheet, { panel: p.index, t: st.cal.t0 }, dir);
        const b = rowNeighbour(sheet, { panel: p.index, t: st.cal.t1 }, dir);
        if (!a || !b || a.panel !== b.panel) return { state: st, handled: true };
        return { state: { ...st, cal: { ...st.cal, panel: a.panel, t0: a.t, t1: b.t } }, handled: true, caliperChanged: true };
      }
      if (!focus) return unhandled(st);
      const next = rowNeighbour(sheet, focus, dir) ?? focus;
      return { state: { ...st, focus: next }, handled: true, moved: true };
    }
    case 'Enter':
      if (!focus) return unhandled(st);
      return { state: { ...st, focus }, handled: true, select: focus };
    case ' ':
    case 'Spacebar':
      if (calOn) return { state: { ...st, active: ((st.active + 1) % 3) as 0 | 1 | 2 }, handled: true };
      if (!focus) return unhandled(st);
      return { state: { ...st, focus }, handled: true, select: focus };
    case 'c':
    case 'C':
      return toggle('calipers');
    case 'a':
    case 'A':
      return toggle('amplitude');
    case 'r':
    case 'R':
      return toggle('march');
    case 'm':
    case 'M':
      return toggle('magnifier');
    case 'x':
    case 'X':
      return toggle('crosshair');
    case 'Escape':
    case 'Esc':
      if (anyToolOn(st.tools) || st.cal) return { state: { ...st, tools: NO_TOOLS, cal: null, active: 2 }, handled: true };
      if (st.focus) return { state: { ...st, focus: null }, handled: true };
      return unhandled(st);
    default:
      return unhandled(st);
  }
}

// ───────────────────────────────────────────────────────────────────────────── read-outs

/** Trace value (true lead mV) of a panel's lead at t; NaN when the lead is missing. */
export function traceValue(sig: EcgSignal, p: Panel, t: number): number {
  const a = leadArray(sig, p.lead);
  return a ? sampleAt(a, sig.fs, t) : Number.NaN;
}

export interface CaliperNumbers {
  /** time mode: [ms, small squares, bpm ('—' without a rate)]; amplitude mode: [mV, mm] */
  readonly values: readonly string[];
  readonly mode: CaliperMode;
  /** time mode: the interval gives a rate */
  readonly rate: boolean;
}

export function caliperNumbers(lang: Lang, s: Sheet, c: CaliperState, mode: CaliperMode): CaliperNumbers {
  const p = s.panels[c.panel];
  const ro = caliperReadout(c, p?.speed ?? 25, p?.gain ?? 10);
  if (mode === 'time')
    return { mode, rate: ro.bpm !== null, values: [fmtNum(lang, ro.dtMs), fmtNum(lang, ro.squares, 1), ro.bpm === null ? '—' : fmtNum(lang, ro.bpm)] };
  return { mode, rate: false, values: [fmtNum(lang, ro.dMv, 2), fmtNum(lang, ro.dMm, 1)] };
}

// ───────────────────────────────────────────────────────────────────────────── keeping the keyboard point in view

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The box (CSS px, relative to the paper) that must be scrolled into view so the keyboard point (x, y) and a margin
 * around it are visible — the paper scrolls sideways inside the viewer on phones and calibrated screens, and a tall
 * sheet can run below the window. Clamped to the paper.
 */
export function revealRect(x: number, y: number, paperW: number, paperH: number, margin = 24): Rect {
  const cx = Math.max(0, Math.min(paperW, x)), cy = Math.max(0, Math.min(paperH, y));
  const left = Math.max(0, cx - margin), top = Math.max(0, cy - margin);
  return { left, top, width: Math.max(0, Math.min(paperW, cx + margin) - left), height: Math.max(0, Math.min(paperH, cy + margin) - top) };
}

/** Crosshair numbers: [t ms, mV]. */
export function crossNumbers(lang: Lang, t: number, mv: number): readonly [string, string] {
  return [fmtNum(lang, t), fmtNum(lang, mv, 2, true)];
}
