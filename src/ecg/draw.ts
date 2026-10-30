/**
 * Canvas drawing of the sheet. Thin layer over the pure geometry (layout.ts), overlays (overlays.ts) and marks
 * (marks.ts). All drawing happens on unscaled device-px contexts so 1-px grid lines stay crisp; colours come from the
 * theme palette only.
 */
import type { Ecg, EcgSignal, EcgTruth } from '../core/ecg';
import { pick, type L10n, type Lang } from '../core/l10n';
import type { EcgMark, EcgPin } from './api';
import { caliperReadout, marchOut, type CaliperMode, type CaliperState } from './calipers';
import { decimatedCapacity, decimateMinMax, scratchBuf } from './decimate';
import { fmtNum } from './format';
import { inPanelTime, leadArray, rowOf, xOfT, yOfMv, type Frame, type Panel, type Row, type Sheet } from './layout';
import { highlightedPanels, markToken, marksByPanel, PIN_TOKEN, pinsByPanel } from './marks';
import {
  atrialLabels,
  beatLabels,
  beatsOverlapping,
  beatAtrial,
  intervalBrackets,
  overlayFlags,
  representativeBeat,
  stMeasure,
  stNotable,
  type WaveLabel,
} from './overlays';
import { calibrationPulseMm, gridLevels, gridLines } from './paper';
import { canvasFont, type Palette, type Token } from './theme';
import { sampleAt } from '../core/ecg';
import type { Lead } from '../core/leads';
import { BRACKET_ROOM_MM } from './layout';

export interface DrawEnv {
  readonly ctx: CanvasRenderingContext2D;
  readonly f: Frame;
  readonly dpr: number;
  readonly pal: Palette;
  readonly lang: Lang;
}

/** Device px of a sheet x / y (mm). */
export const DX = (e: Pick<DrawEnv, 'f' | 'dpr'>, xMm: number): number => (e.f.ox + xMm * e.f.pxPerMm) * e.dpr;
export const DY = (e: Pick<DrawEnv, 'f' | 'dpr'>, yMm: number): number => (e.f.oy + yMm * e.f.pxPerMm) * e.dpr;
/** Device px per mm. */
export const DPM = (e: Pick<DrawEnv, 'f' | 'dpr'>): number => e.f.pxPerMm * e.dpr;

/** Text size (CSS px) proportional to the paper, clamped to stay legible. */
export const textPx = (f: Frame, mm: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, mm * f.pxPerMm));

export const localize = (t: L10n | string | undefined, lang: Lang): string => (t === undefined ? '' : typeof t === 'string' ? t : pick(t, lang));

export function haloText(e: DrawEnv, s: string, x: number, y: number, color: string): void {
  const { ctx } = e;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * e.dpr;
  ctx.strokeStyle = e.pal['ecg-paper'];
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function withAlpha(ctx: CanvasRenderingContext2D, a: number, fn: () => void): void {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * a;
  fn();
  ctx.globalAlpha = prev;
}

// ───────────────────────────────────────────────────────────────────────────── paper

/** Paper and 1 mm / 5 mm grid aligned with the sheet origin, on a canvas of w × h device px. */
export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, f: Frame, dpr: number, pal: Palette): void {
  ctx.fillStyle = pal['ecg-paper'];
  ctx.fillRect(0, 0, w, h);
  const step = f.pxPerMm * dpr;
  const lv = gridLevels(f.pxPerMm, dpr);
  const xs = gridLines(f.ox * dpr, step, w), ys = gridLines(f.oy * dpr, step, h);
  if (lv.minor) {
    ctx.strokeStyle = pal['ecg-grid-minor'];
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const l of xs) if (!l.major) {
      ctx.moveTo(l.pos, 0);
      ctx.lineTo(l.pos, h);
    }
    for (const l of ys) if (!l.major) {
      ctx.moveTo(0, l.pos);
      ctx.lineTo(w, l.pos);
    }
    ctx.stroke();
  }
  if (lv.major) {
    const lw = dpr >= 2 ? 2 : 1;
    const adj = lw % 2 === 0 ? -0.5 : 0;
    ctx.strokeStyle = pal['ecg-grid-major'];
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (const l of xs) if (l.major) {
      ctx.moveTo(l.pos + adj, 0);
      ctx.lineTo(l.pos + adj, h);
    }
    for (const l of ys) if (l.major) {
      ctx.moveTo(0, l.pos + adj);
      ctx.lineTo(w, l.pos + adj);
    }
    ctx.stroke();
  }
}

// ───────────────────────────────────────────────────────────────────────────── calibration, traces, labels

export function drawCalPulses(e: DrawEnv, s: Sheet): void {
  const { ctx } = e;
  ctx.strokeStyle = e.pal['ecg-trace'];
  ctx.lineWidth = Math.max(1, 1.3 * e.dpr);
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  for (const r of s.rows) {
    const pts = calibrationPulseMm(0, r.baselineMm, s.opts.speed, r.cal);
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(DX(e, x), DY(e, y)) : ctx.moveTo(DX(e, x), DY(e, y))));
  }
  ctx.stroke();
}

/** Appends one panel's trace to the current path (min/max-decimated per device column). */
export function pathPanel(e: DrawEnv, sig: EcgSignal, p: Panel, row: Row): boolean {
  const a = leadArray(sig, p.lead);
  if (!a || a.length < 2) return false;
  const fs = sig.fs;
  const i0 = Math.max(0, Math.ceil((p.t0 * fs) / 1000 - 1e-6));
  const i1 = Math.min(a.length - 1, Math.floor((p.t1 * fs) / 1000 + 1e-6));
  const n = i1 - i0 + 1;
  if (n < 2) return true;
  const x0 = DX(e, xOfT(p, (i0 * 1000) / fs));
  const dx = (1000 / fs) * (p.speed / 1000) * DPM(e);
  const y0 = DY(e, row.baselineMm);
  const sy = p.gain * DPM(e) * (p.invert ? -1 : 1);
  const out = scratchBuf(1, 2 * decimatedCapacity(n, dx) + 4);
  const m = decimateMinMax(a, i0, n, x0, dx, out);
  const { ctx } = e;
  if (m === 0) return true;
  ctx.moveTo(out[0], y0 - out[1] * sy);
  for (let i = 1; i < m; i++) ctx.lineTo(out[2 * i], y0 - out[2 * i + 1] * sy);
  return true;
}

export function drawTraces(e: DrawEnv, s: Sheet, sig: EcgSignal, missingText: (lead: Lead) => string): void {
  const { ctx } = e;
  ctx.strokeStyle = e.pal['ecg-trace'];
  ctx.lineWidth = Math.max(1, Math.min(1.6, 0.3 * e.f.pxPerMm) * e.dpr);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  const missing: Panel[] = [];
  for (const p of s.panels) if (!pathPanel(e, sig, p, rowOf(s, p))) missing.push(p);
  ctx.stroke();
  if (missing.length) {
    ctx.font = canvasFont(textPx(e.f, 3, 10, 13), e.dpr, 500);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const p of missing) haloText(e, missingText(p.lead), DX(e, p.xMm + 8), DY(e, rowOf(s, p).baselineMm), e.pal['ecg-trace-muted']);
  }
}

/** Lead-change ticks between columns, as on a printed 12-lead. */
export function drawSeparators(e: DrawEnv, s: Sheet): void {
  const { ctx } = e;
  ctx.strokeStyle = e.pal['ecg-trace'];
  ctx.lineWidth = Math.max(1, 1.3 * e.dpr);
  ctx.beginPath();
  for (const sep of s.separators) {
    const r = s.rows[sep.row];
    const x = Math.round(DX(e, sep.xMm)) + 0.5;
    ctx.moveTo(x, DY(e, r.baselineMm - 3));
    ctx.lineTo(x, DY(e, r.baselineMm + 3));
  }
  ctx.stroke();
}

/** Lead label sizes (CSS px). */
export const labelPx = (f: Frame): number => textPx(f, 3.4, 10.5, 15);

export function drawLeadLabels(e: DrawEnv, s: Sheet, emphasis: ReadonlyMap<number, Token>): void {
  const { ctx } = e;
  const px = labelPx(e.f);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const p of s.panels) {
    const r = rowOf(s, p);
    const tok = emphasis.get(p.index);
    ctx.font = canvasFont(px, e.dpr, tok ? 800 : 650);
    haloText(e, p.label, DX(e, p.xMm + 1), DY(e, r.topMm + 1), tok ? e.pal[tok] : e.pal['ecg-label']);
  }
}

/** Width (device px) of a panel's lead label, so read-outs can follow it. */
function labelWidth(e: DrawEnv, p: Panel): number {
  e.ctx.font = canvasFont(labelPx(e.f), e.dpr, 800);
  return e.ctx.measureText(p.label).width;
}

export function drawHighlights(e: DrawEnv, s: Sheet, highlightLeads: readonly Lead[], marks: readonly EcgMark[]): Map<number, Token> {
  const { ctx } = e;
  const out = new Map<number, Token>();
  for (const h of highlightedPanels(s, highlightLeads, marks)) {
    const p = s.panels[h.panel];
    const r = rowOf(s, p);
    const x = DX(e, p.xMm), y = DY(e, r.topMm), w = p.wMm * DPM(e), hh = (r.hMm - r.bracketMm) * DPM(e);
    const col = e.pal[h.color];
    withAlpha(ctx, 0.07, () => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, hh);
    });
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, 1.5 * e.dpr);
    ctx.strokeRect(x + 0.75 * e.dpr, y + 0.75 * e.dpr, w - 1.5 * e.dpr, hh - 1.5 * e.dpr);
    out.set(p.index, h.color);
    const label = localize(h.label, e.lang);
    if (label) {
      ctx.font = canvasFont(textPx(e.f, 2.8, 10, 13), e.dpr, 600);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      haloText(e, label, x + w - 4 * e.dpr, y + 3 * e.dpr, col);
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────── truth overlays

export interface OverlayOptions {
  readonly waveLabels: boolean;
  readonly intervals: boolean;
  readonly stMarkers: boolean;
}

type Rect = readonly [number, number, number, number];
const hits = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Wave labels of a panel: one representative beat in grid cells; every beat in rhythm strips and single-lead rows,
 * including the visible waves of a beat cut by the strip edge.
 */
export function panelWaveLabels(sig: EcgSignal, truth: EcgTruth, p: Panel): WaveLabel[] {
  const pol: 1 | -1 = p.invert ? -1 : 1;
  const flags = overlayFlags(truth);
  const inside = (l: WaveLabel) => l.t >= p.t0 && l.t <= p.t1;
  if (p.kind === 'cell') {
    const b = representativeBeat(truth, p.t0, p.t1);
    return b === null ? [] : beatLabels(sig, truth, b, p.lead, pol, flags).filter(inside);
  }
  const out: WaveLabel[] = [];
  for (const b of beatsOverlapping(truth, p.t0, p.t1)) out.push(...beatLabels(sig, truth, b, p.lead, pol, flags));
  out.push(...atrialLabels(sig, truth, p.lead, p.t0, p.t1, pol));
  return out.filter(inside);
}

/** Wave-label font size (CSS px). */
export const waveLabelPx = (f: Frame): number => textPx(f, 2.9, 9.5, 14);

export interface PlacedLabel {
  readonly panel: number;
  readonly label: WaveLabel;
  /** centre of the text (device px) */
  readonly x: number;
  readonly y: number;
}

/**
 * Where each wave label goes (device px): just above an upward deflection, just below a downward one, pushed further
 * out when it would cover an earlier label of the same panel, and always kept inside its own row — on a small or
 * low-gain sheet a label never lands on the neighbouring lead's trace. Needs the label font set on e.ctx.
 */
export function placeWaveLabels(e: DrawEnv, s: Sheet, sig: EcgSignal, truth: EcgTruth): PlacedLabel[] {
  const { ctx } = e;
  const hText = waveLabelPx(e.f) * e.dpr;
  const out: PlacedLabel[] = [];
  for (const p of s.panels) {
    const r = rowOf(s, p);
    const [top, bottom] = panelYs(e, r);
    const yMin = top + hText / 2, yMax = Math.max(yMin, bottom - hText / 2);
    const placed: Rect[] = [];
    for (const l of panelWaveLabels(sig, truth, p)) {
      const x = DX(e, xOfT(p, l.t));
      const y0 = DY(e, yOfMv(r, p, l.mv));
      const w = ctx.measureText(l.text).width + 2 * e.dpr;
      const dir = l.up ? -1 : 1;
      const at = (y: number): Rect => [x - w / 2, y - hText / 2, x + w / 2, y + hText / 2];
      let y = y0 + dir * (hText * 0.5 + 3 * e.dpr);
      for (let k = 0; k < 3 && placed.some((q) => hits(q, at(y))); k++) y += dir * hText;
      y = Math.max(yMin, Math.min(yMax, y));
      placed.push(at(y));
      out.push({ panel: p.index, label: l, x, y });
    }
  }
  return out;
}

export function drawWaveLabels(e: DrawEnv, s: Sheet, sig: EcgSignal, truth: EcgTruth): void {
  const { ctx } = e;
  ctx.font = canvasFont(waveLabelPx(e.f), e.dpr, 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const pl of placeWaveLabels(e, s, sig, truth)) haloText(e, pl.label.text, pl.x, pl.y, e.pal[pl.label.color]);
}

export function drawBrackets(e: DrawEnv, s: Sheet, truth: EcgTruth, label: (kind: string, ms: string) => string): void {
  const { ctx } = e;
  for (const p of s.panels) {
    if (!p.bracketHost) continue;
    const b = representativeBeat(truth, p.t0, p.t1);
    if (b === null) continue;
    const r = rowOf(s, p);
    const beat = truth.beats[b];
    const list = intervalBrackets(beat, beatAtrial(truth, b)?.kind ?? null);
    const top = r.topMm + r.hMm - BRACKET_ROOM_MM;
    const tick = 1.4 * DPM(e);
    ctx.font = canvasFont(textPx(e.f, 2.8, 10, 13), e.dpr, 650);
    ctx.textBaseline = 'middle';
    // faint guides from the trace down to the brackets at each fiducial
    const guides = new Set<number>();
    for (const br of list) {
      guides.add(br.t0);
      guides.add(br.t1);
    }
    ctx.strokeStyle = e.pal['ecg-label'];
    ctx.lineWidth = Math.max(1, e.dpr);
    ctx.setLineDash([2 * e.dpr, 3 * e.dpr]);
    withAlpha(ctx, 0.55, () => {
      ctx.beginPath();
      for (const t of guides) {
        const x = Math.round(DX(e, xOfT(p, t))) + 0.5;
        ctx.moveTo(x, DY(e, r.baselineMm + 1));
        ctx.lineTo(x, DY(e, top + 3.5 + 4 * (list.length - 1)));
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    list.forEach((br, k) => {
      const y = DY(e, top + 3.5 + 4 * k);
      const xa = DX(e, xOfT(p, br.t0)), xb = DX(e, xOfT(p, br.t1));
      const col = e.pal[br.color];
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, 1.5 * e.dpr);
      ctx.beginPath();
      ctx.moveTo(xa, y - tick);
      ctx.lineTo(xa, y);
      ctx.lineTo(xb, y);
      ctx.lineTo(xb, y - tick);
      ctx.stroke();
      const text = label(br.kind, fmtNum(e.lang, br.ms));
      const tw = ctx.measureText(text).width;
      const after = xb + 5 * e.dpr + tw < DX(e, p.xMm + p.wMm);
      ctx.textAlign = after ? 'left' : 'right';
      haloText(e, text, after ? xb + 5 * e.dpr : xa - 5 * e.dpr, y, col);
    });
  }
}

/** Panels that carry ST markers: every grid cell, and the first single-lead row holding a representative beat. */
export function stPanels(s: Sheet, truth: EcgTruth): { panel: Panel; beat: number }[] {
  const out: { panel: Panel; beat: number }[] = [];
  let leadDone = false;
  for (const p of s.panels) {
    if (p.kind === 'rhythm') continue;
    if (p.kind === 'lead' && leadDone) continue;
    const b = representativeBeat(truth, p.t0, p.t1);
    if (b === null) continue;
    if (p.kind === 'lead') leadDone = true;
    out.push({ panel: p, beat: b });
  }
  return out;
}

export function drawStMarkers(e: DrawEnv, s: Sheet, sig: EcgSignal, truth: EcgTruth, readout: (mm: string, mv: string) => string): void {
  const { ctx } = e;
  const px = textPx(e.f, 2.8, 9.5, 13);
  for (const { panel: p, beat } of stPanels(s, truth)) {
    const st = stMeasure(sig, truth, beat, p.lead);
    if (!st) continue;
    const r = rowOf(s, p);
    const shown = p.invert ? -st.stMv : st.stMv;
    const notable = stNotable(p.lead, st.stMv); // judged on the true lead (−aVR: aVR's own criteria)
    const col = notable ? e.pal['c-injury'] : e.pal['ecg-label'];
    const yBase = DY(e, yOfMv(r, p, st.baseline));
    const xJ = DX(e, xOfT(p, st.j)), x60 = DX(e, xOfT(p, st.j60));
    // isoelectric reference
    ctx.strokeStyle = e.pal['c-repol'];
    ctx.lineWidth = Math.max(1, e.dpr);
    ctx.setLineDash([3 * e.dpr, 2 * e.dpr]);
    ctx.beginPath();
    ctx.moveTo(DX(e, xOfT(p, Math.max(p.t0, truth.beats[beat].qrsOn - 50))), yBase);
    ctx.lineTo(x60 + 2 * DPM(e), yBase);
    ctx.stroke();
    ctx.setLineDash([]);
    // deviation at J+60
    const y60 = DY(e, yOfMv(r, p, st.j60Mv));
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, 1.6 * e.dpr);
    ctx.beginPath();
    ctx.moveTo(x60, yBase);
    ctx.lineTo(x60, y60);
    ctx.stroke();
    // J point (dot) and J+60 (ring)
    ctx.fillStyle = e.pal['c-injury'];
    ctx.beginPath();
    ctx.arc(xJ, DY(e, yOfMv(r, p, st.jMv)), 2.4 * e.dpr, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, 1.4 * e.dpr);
    ctx.beginPath();
    ctx.arc(x60, y60, 2.6 * e.dpr, 0, 2 * Math.PI);
    ctx.stroke();
    // read-out next to the lead label
    ctx.font = canvasFont(px, e.dpr, notable ? 750 : 600);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const text = readout(fmtNum(e.lang, shown * p.gain, 1, true), fmtNum(e.lang, shown, 2, true));
    haloText(e, text, DX(e, p.xMm + 1) + labelWidth(e, p) + 2 * DPM(e), DY(e, r.topMm + 1) + 1 * e.dpr, col);
  }
}

// ───────────────────────────────────────────────────────────────────────────── marks & pins

export function drawMarks(e: DrawEnv, s: Sheet, sig: EcgSignal, marks: readonly EcgMark[]): void {
  if (!marks.length) return;
  const { ctx } = e;
  const per = marksByPanel(s, marks);
  const fpx = textPx(e.f, 2.8, 10, 13);
  s.panels.forEach((p, i) => {
    const r = rowOf(s, p);
    const a = leadArray(sig, p.lead);
    const val = (t: number) => (a ? sampleAt(a, sig.fs, t) : 0);
    const clampT = (t: number) => Math.max(p.t0, Math.min(p.t1, t));
    const bottom = r.topMm + r.hMm - r.bracketMm;
    for (const m of per[i]) {
      if (m.kind === 'lead') continue;
      const col = e.pal[markToken(m.color)];
      ctx.font = canvasFont(fpx, e.dpr, 700);
      switch (m.kind) {
        case 'region': {
          const xa = DX(e, xOfT(p, clampT(m.t0))), xb = DX(e, xOfT(p, clampT(m.t1)));
          withAlpha(ctx, 0.16, () => {
            ctx.fillStyle = col;
            ctx.fillRect(xa, DY(e, r.topMm), xb - xa, (bottom - r.topMm) * DPM(e));
          });
          const label = localize(m.label, e.lang);
          if (label) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            haloText(e, label, (xa + xb) / 2, DY(e, bottom) - 2 * e.dpr, col);
          }
          break;
        }
        case 'bracket': {
          const xa = DX(e, xOfT(p, clampT(m.t0))), xb = DX(e, xOfT(p, clampT(m.t1)));
          const y = DY(e, bottom - 3.5);
          const tick = 1.4 * DPM(e);
          ctx.strokeStyle = col;
          ctx.lineWidth = Math.max(1, 1.6 * e.dpr);
          ctx.beginPath();
          ctx.moveTo(xa, y - tick);
          ctx.lineTo(xa, y);
          ctx.lineTo(xb, y);
          ctx.lineTo(xb, y - tick);
          ctx.stroke();
          const label = localize(m.label, e.lang);
          if (label) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            haloText(e, label, (xa + xb) / 2, y + 2 * e.dpr, col);
          }
          break;
        }
        case 'wave': {
          const v = val(m.t);
          const up = (p.invert ? -v : v) >= 0;
          const x = DX(e, xOfT(p, m.t)), y = DY(e, yOfMv(r, p, v));
          ctx.textAlign = 'center';
          ctx.textBaseline = up ? 'bottom' : 'top';
          haloText(e, m.label, x, y + (up ? -4 : 4) * e.dpr, col);
          break;
        }
        case 'hline': {
          const ta = m.t0 === undefined ? p.t0 : clampT(m.t0), tb = m.t1 === undefined ? p.t1 : clampT(m.t1);
          const y = Math.round(DY(e, yOfMv(r, p, m.mv))) + 0.5;
          ctx.strokeStyle = col;
          ctx.lineWidth = Math.max(1, 1.4 * e.dpr);
          ctx.setLineDash([5 * e.dpr, 3 * e.dpr]);
          ctx.beginPath();
          ctx.moveTo(DX(e, xOfT(p, ta)), y);
          ctx.lineTo(DX(e, xOfT(p, tb)), y);
          ctx.stroke();
          ctx.setLineDash([]);
          const label = localize(m.label, e.lang);
          if (label) {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            haloText(e, label, DX(e, xOfT(p, tb)), y - 2 * e.dpr, col);
          }
          break;
        }
        case 'arrow': {
          const x = DX(e, xOfT(p, m.t)), y = DY(e, yOfMv(r, p, m.mv));
          const up = (p.invert ? -m.mv : m.mv) >= 0;
          const len = 7 * DPM(e) * 0.8, dir = up ? -1 : 1;
          const ty = y + dir * len;
          ctx.strokeStyle = col;
          ctx.fillStyle = col;
          ctx.lineWidth = Math.max(1, 1.8 * e.dpr);
          ctx.beginPath();
          ctx.moveTo(x, ty);
          ctx.lineTo(x, y + dir * 3 * e.dpr);
          ctx.stroke();
          const hs = 4.5 * e.dpr;
          ctx.beginPath();
          ctx.moveTo(x, y + dir * 1.5 * e.dpr);
          ctx.lineTo(x - hs, y + dir * (1.5 * e.dpr + hs * 1.4));
          ctx.lineTo(x + hs, y + dir * (1.5 * e.dpr + hs * 1.4));
          ctx.closePath();
          ctx.fill();
          const label = localize(m.label, e.lang);
          if (label) {
            ctx.textAlign = 'center';
            ctx.textBaseline = up ? 'bottom' : 'top';
            haloText(e, label, x, ty + dir * 2 * e.dpr, col);
          }
          break;
        }
      }
    }
  });
}

export function drawPins(e: DrawEnv, s: Sheet, sig: EcgSignal, pins: readonly EcgPin[]): void {
  const { ctx } = e;
  for (const { panel: p, pin } of pinsByPanel(s, pins)) {
    const r = rowOf(s, p);
    const a = leadArray(sig, p.lead);
    const v = a ? sampleAt(a, sig.fs, pin.tMs) : 0;
    const x = DX(e, xOfT(p, pin.tMs)), y = DY(e, yOfMv(r, p, v));
    const col = e.pal[PIN_TOKEN[pin.tone]];
    const head = 5 * e.dpr, stem = 13 * e.dpr;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, 2 * e.dpr);
    ctx.beginPath();
    ctx.moveTo(x, y - 2 * e.dpr);
    ctx.lineTo(x, y - stem);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y - stem - head * 0.6, head, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = e.pal['ecg-paper'];
    ctx.lineWidth = Math.max(1, 1.5 * e.dpr);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, 1.6 * e.dpr);
    ctx.beginPath();
    ctx.arc(x, y, 3.2 * e.dpr, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

// ───────────────────────────────────────────────────────────────────────────── interactive layer

/** Vertical span (device px) of a panel's trace area (row without the bracket room). */
function panelYs(e: DrawEnv, r: Row): [number, number] {
  return [DY(e, r.topMm), DY(e, r.topMm + r.hMm - r.bracketMm)];
}

export function drawPanelTint(e: DrawEnv, s: Sheet, p: Panel, token: Token, alpha: number): void {
  const r = rowOf(s, p);
  const [y0, y1] = panelYs(e, r);
  withAlpha(e.ctx, alpha, () => {
    e.ctx.fillStyle = e.pal[token];
    e.ctx.fillRect(DX(e, p.xMm), y0, p.wMm * DPM(e), y1 - y0);
  });
}

/** The shared time cursor across every panel that shows time t. */
export function drawCursor(e: DrawEnv, s: Sheet, t: number): void {
  const { ctx } = e;
  ctx.strokeStyle = e.pal['ecg-cursor'];
  ctx.lineWidth = Math.max(1, 1.5 * e.dpr);
  ctx.beginPath();
  for (const p of s.panels) {
    if (!inPanelTime(p, t)) continue;
    const [y0, y1] = panelYs(e, rowOf(s, p));
    const x = DX(e, xOfT(p, t));
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
  }
  ctx.stroke();
}

/** Keyboard focus point: a ring on the trace and a faint line. */
export function drawFocusPoint(e: DrawEnv, s: Sheet, sig: Ecg['signal'], p: Panel, t: number): void {
  const { ctx } = e;
  const r = rowOf(s, p);
  const a = leadArray(sig, p.lead);
  const v = a ? sampleAt(a, sig.fs, t) : 0;
  const x = DX(e, xOfT(p, t)), y = DY(e, yOfMv(r, p, v));
  ctx.strokeStyle = e.pal['ecg-cursor'];
  ctx.lineWidth = Math.max(1, 2 * e.dpr);
  ctx.beginPath();
  ctx.arc(x, y, 5 * e.dpr, 0, 2 * Math.PI);
  ctx.stroke();
}

export interface CaliperDraw {
  readonly cal: CaliperState;
  readonly mode: CaliperMode;
  readonly march: boolean;
  /** active handle: 0, 1, 2 = both */
  readonly active: number;
}

/** Device-px x of the caliper lines in their panel. */
export function caliperXs(e: DrawEnv, s: Sheet, c: CaliperState): [number, number] | null {
  const p = s.panels[c.panel];
  if (!p) return null;
  return [DX(e, xOfT(p, c.t0)), DX(e, xOfT(p, c.t1))];
}

export function drawCalipers(e: DrawEnv, s: Sheet, d: CaliperDraw, text: (lines: readonly string[]) => void): void {
  const { ctx } = e;
  const p = s.panels[d.cal.panel];
  if (!p) return;
  const r = rowOf(s, p);
  const [y0, y1] = panelYs(e, r);
  const col = e.pal['ecg-caliper'];
  const c = d.cal;
  // ghost lines where the same times appear in other panels (e.g. all leads of a 12×1 sheet)
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1, e.dpr);
  ctx.setLineDash([3 * e.dpr, 3 * e.dpr]);
  withAlpha(ctx, 0.55, () => {
    ctx.beginPath();
    for (const q of s.panels) {
      if (q === p) continue;
      const [qa, qb] = panelYs(e, rowOf(s, q));
      for (const t of [c.t0, c.t1]) {
        if (!inPanelTime(q, t)) continue;
        const x = DX(e, xOfT(q, t));
        ctx.moveTo(x, qa);
        ctx.lineTo(x, qb);
      }
    }
    ctx.stroke();
  });
  // march-out repeats
  if (d.march && d.mode === 'time') {
    withAlpha(ctx, 0.75, () => {
      ctx.beginPath();
      for (const t of marchOut(c.t0, c.t1, p.t0, p.t1)) {
        const x = DX(e, xOfT(p, t));
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      ctx.stroke();
    });
  }
  ctx.setLineDash([]);
  if (d.mode === 'time') {
    const xa = DX(e, xOfT(p, c.t0)), xb = DX(e, xOfT(p, c.t1));
    [xa, xb].forEach((x, i) => {
      ctx.lineWidth = Math.max(1, (d.active === i || d.active === 2 ? 2.2 : 1.5) * e.dpr);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
      ctx.fillStyle = col;
      withAlpha(ctx, d.active === i || d.active === 2 ? 1 : 0.75, () => ctx.fillRect(x - 4 * e.dpr, y0, 8 * e.dpr, 10 * e.dpr));
    });
    // bridge (drag to move both)
    const yb = y0 + 5 * e.dpr;
    ctx.lineWidth = Math.max(1, (d.active === 2 ? 2.4 : 1.6) * e.dpr);
    ctx.beginPath();
    ctx.moveTo(xa, yb);
    ctx.lineTo(xb, yb);
    ctx.stroke();
  } else {
    const x0 = DX(e, p.xMm), x1 = DX(e, p.xMm + p.wMm);
    const ya = DY(e, yOfMv(r, p, c.mv0)), yb = DY(e, yOfMv(r, p, c.mv1));
    [ya, yb].forEach((y, i) => {
      ctx.lineWidth = Math.max(1, (d.active === i || d.active === 2 ? 2.2 : 1.5) * e.dpr);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.fillStyle = col;
      withAlpha(ctx, d.active === i || d.active === 2 ? 1 : 0.75, () => ctx.fillRect(x1 - 10 * e.dpr, y - 4 * e.dpr, 10 * e.dpr, 8 * e.dpr));
    });
    const xm = x1 - 5 * e.dpr;
    ctx.lineWidth = Math.max(1, (d.active === 2 ? 2.4 : 1.6) * e.dpr);
    ctx.beginPath();
    ctx.moveTo(xm, ya);
    ctx.lineTo(xm, yb);
    ctx.stroke();
  }
  const ro = caliperReadout(c, p.speed, p.gain);
  text(d.mode === 'time' ? [fmtNum(e.lang, ro.dtMs), fmtNum(e.lang, ro.squares, 1), ro.bpm === null ? '—' : fmtNum(e.lang, ro.bpm)] : [fmtNum(e.lang, ro.dMv, 2), fmtNum(e.lang, ro.dMm, 1)]);
}

/** Crosshair: vertical line through the panel, horizontal line at the trace value, dot on the trace. */
export function drawCrosshair(e: DrawEnv, s: Sheet, p: Panel, t: number, v: number): void {
  const { ctx } = e;
  const r = rowOf(s, p);
  const [y0, y1] = panelYs(e, r);
  const x = Math.round(DX(e, xOfT(p, t))) + 0.5, y = Math.round(DY(e, yOfMv(r, p, v))) + 0.5;
  ctx.strokeStyle = e.pal['ecg-cursor'];
  ctx.lineWidth = Math.max(1, e.dpr);
  withAlpha(ctx, 0.7, () => {
    ctx.setLineDash([4 * e.dpr, 3 * e.dpr]);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.moveTo(DX(e, p.xMm), y);
    ctx.lineTo(DX(e, p.xMm + p.wMm), y);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.fillStyle = e.pal['ecg-cursor'];
  ctx.beginPath();
  ctx.arc(x, y, 3 * e.dpr, 0, 2 * Math.PI);
  ctx.fill();
}
