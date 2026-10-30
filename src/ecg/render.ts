/**
 * Frame composition: which draw.ts layers run, in which order, for the static sheet ("base") and the interactive layer
 * ("overlay"). DOM-free apart from the canvas context it is given, so node tests can run it on a stub context.
 *
 * base    = grid blit → lead highlights → region marks → calibration pulses → separator ticks → traces → lead labels →
 *           truth overlays (wave labels, interval brackets, ST markers) → other marks → pins
 * overlay = hover tint → cursor → calipers (+ march-out) → crosshair → keyboard focus → magnifier lens
 */
import type { Ecg } from '../core/ecg';
import type { Lang } from '../core/l10n';
import type { Lead } from '../core/leads';
import { te } from '../i18n/ecg';
import type { EcgMark, EcgPin } from './api';
import type { CaliperMode, CaliperState } from './calipers';
import {
  drawBrackets,
  drawCalipers,
  drawCalPulses,
  drawCrosshair,
  drawCursor,
  drawFocusPoint,
  drawGrid,
  drawHighlights,
  drawLeadLabels,
  drawMarks,
  drawPanelTint,
  drawPins,
  drawSeparators,
  drawStMarkers,
  drawTraces,
  drawWaveLabels,
  type DrawEnv,
} from './draw';
import { fmtNum } from './format';
import { mmX, mmY, panelAt, rowOf, type Frame, type Sheet } from './layout';
import { traceValue, type FocusPoint } from './interact';
import { canvasFont } from './theme';

export interface BaseOptions {
  readonly marks: readonly EcgMark[];
  readonly highlightLeads: readonly Lead[];
  readonly pins: readonly EcgPin[];
  readonly waveLabels: boolean;
  readonly intervals: boolean;
  readonly stMarkers: boolean;
}

const missingText = (lang: Lang) => (lead: Lead) => te.in(lang, 'noLead', { lead });

/** Draw the static sheet. `grid` is the pre-rendered paper (same size as the target); null draws it in place. */
export function renderBase(e: DrawEnv, s: Sheet, ecg: Ecg, o: BaseOptions, grid: CanvasImageSource | null, w: number, h: number): void {
  const { ctx } = e;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  if (grid) ctx.drawImage(grid, 0, 0);
  else drawGrid(ctx, w, h, e.f, e.dpr, e.pal);
  const emphasis = drawHighlights(e, s, o.highlightLeads, o.marks);
  const regions = o.marks.filter((m) => m.kind === 'region');
  const others = o.marks.filter((m) => m.kind !== 'region');
  drawMarks(e, s, ecg.signal, regions);
  drawCalPulses(e, s);
  drawSeparators(e, s);
  drawTraces(e, s, ecg.signal, missingText(e.lang));
  drawLeadLabels(e, s, emphasis);
  const truth = ecg.truth;
  if (truth && truth.beats.length > 0) {
    if (o.waveLabels) drawWaveLabels(e, s, ecg.signal, truth);
    if (o.intervals) drawBrackets(e, s, truth, (kind, ms) => `${kind} ${te.in(e.lang, 'roMs', { v: ms })}`);
    if (o.stMarkers) drawStMarkers(e, s, ecg.signal, truth, (mm, mv) => te.in(e.lang, 'stReadout', { mm, mv }));
  }
  drawMarks(e, s, ecg.signal, others);
  drawPins(e, s, ecg.signal, o.pins);
}

export interface OverlayState {
  /** panel under the pointer, tinted when clicking it does something */
  readonly hoverPanel: number | null;
  readonly hoverTint: boolean;
  readonly cursor: number | null;
  readonly focus: FocusPoint | null;
  readonly showFocus: boolean;
  readonly cal: CaliperState | null;
  readonly calMode: CaliperMode;
  readonly march: boolean;
  readonly active: number;
  /** crosshair at (panel, t) */
  readonly cross: FocusPoint | null;
  /** magnifier centre (CSS px) */
  readonly lens: { readonly x: number; readonly y: number } | null;
}

/** Draw the interactive layer on a transparent canvas of w × h device px. */
export function renderOverlay(e: DrawEnv, s: Sheet, ecg: Ecg, st: OverlayState, w: number, h: number): void {
  const { ctx } = e;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  if (st.hoverTint && st.hoverPanel !== null && s.panels[st.hoverPanel]) drawPanelTint(e, s, s.panels[st.hoverPanel], 'ecg-lead-highlight', 1);
  if (st.cursor !== null) drawCursor(e, s, st.cursor);
  if (st.cal) drawCalipers(e, s, { cal: st.cal, mode: st.calMode, march: st.march, active: st.active }, () => {});
  if (st.cross && s.panels[st.cross.panel]) {
    const p = s.panels[st.cross.panel];
    const v = traceValue(ecg.signal, p, st.cross.t);
    if (Number.isFinite(v)) drawCrosshair(e, s, p, st.cross.t, v);
  }
  if (st.showFocus && st.focus && s.panels[st.focus.panel]) drawFocusPoint(e, s, ecg.signal, s.panels[st.focus.panel], st.focus.t);
  if (st.lens) drawLens(e, s, ecg, st.lens.x, st.lens.y, w, h);
}

/** Magnifier zoom factor and radius (CSS px). */
export const LENS_ZOOM = 3;
export const LENS_RADIUS = 70;

/**
 * Magnifier: a circular lens re-rendering the paper and traces at LENS_ZOOM× (vector, so it stays sharp) around the
 * point (x, y) CSS px. The lens sits above the pointer (below it near the top edge) so it never hides the point.
 */
export function drawLens(e: DrawEnv, s: Sheet, ecg: Ecg, x: number, y: number, w: number, h: number): void {
  const { ctx, dpr } = e;
  const R = LENS_RADIUS * dpr;
  const px = x * dpr, py = y * dpr;
  const gap = 16 * dpr;
  const cx = Math.max(R + 2, Math.min(w - R - 2, px));
  const above = py - R - gap;
  const cy = above - R >= 0 ? above : Math.min(h - R - 2, py + R + gap);
  const xm = mmX(e.f, x), ym = mmY(e.f, y);
  const ppm = e.f.pxPerMm * LENS_ZOOM;
  const f: Frame = { pxPerMm: ppm, ox: cx / dpr - xm * ppm, oy: cy / dpr - ym * ppm };
  const z: DrawEnv = { ...e, f };
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.clip();
  drawGrid(ctx, w, h, f, dpr, e.pal);
  // only the panels the lens can reach
  const reachMm = (LENS_RADIUS / ppm) * 1.05;
  const near = s.panels.filter((p) => {
    const r = rowOf(s, p);
    return p.xMm - reachMm <= xm && xm <= p.xMm + p.wMm + reachMm && r.topMm - reachMm <= ym && ym <= r.topMm + r.hMm + reachMm;
  });
  drawCalPulses(z, s);
  drawTraces(z, { ...s, panels: near }, ecg.signal, () => '');
  ctx.restore();
  ctx.strokeStyle = e.pal['border-strong'];
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.stroke();
  // centre mark of the magnified point
  ctx.strokeStyle = e.pal['ecg-cursor'];
  ctx.lineWidth = Math.max(1, dpr);
  ctx.beginPath();
  ctx.moveTo(cx - 6 * dpr, cy);
  ctx.lineTo(cx + 6 * dpr, cy);
  ctx.moveTo(cx, cy - 6 * dpr);
  ctx.lineTo(cx, cy + 6 * dpr);
  ctx.stroke();
  // a small "3×" tag
  const tag = `${fmtNum(e.lang, LENS_ZOOM)}×`;
  ctx.font = canvasFont(11, dpr, 600);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = e.pal['ecg-label'];
  ctx.fillText(tag, cx, cy + R - 10 * dpr);
}

/** Panel index under a CSS-px point (used for the hover tint), or null. */
export function hoverPanelAt(s: Sheet, f: Frame, x: number, y: number): number | null {
  if (!(f.pxPerMm > 0)) return null;
  return panelAt(s, mmX(f, x), mmY(f, y))?.index ?? null;
}
