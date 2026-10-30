/**
 * Renders a standard 12-lead printout (3 × 4 sequential layout + lead II rhythm strip) on pink grid paper:
 * 25 mm/s, 10 mm/mV, 1 mV × 200 ms calibration pulse at the start of each row. Pure raster output (Raster), so the
 * calibration script can write a PNG to look at the morphology. Every trace is a slice of one 12-lead projection.
 */
import type { LeadName } from '../types';
import { LEADS } from '../types';
import { Raster } from './png';

export interface EcgPlotOptions {
  /** Pixels per mm. */
  readonly pxPerMm?: number;
  readonly title?: string;
  /** All four columns show the same time window (synchronous layout) instead of consecutive 2.5 s slices. */
  readonly sync?: boolean;
}

const PAPER: [number, number, number] = [255, 246, 246];
const MINOR: [number, number, number] = [250, 214, 214];
const MAJOR: [number, number, number] = [238, 160, 160];
const INK: [number, number, number] = [20, 20, 30];

/**
 * @param leads 12 × n samples (lead-major, LEADS order) at fsHz, covering ≥ 10 s.
 */
export function plot12Lead(leads: Float32Array, n: number, fsHz: number, opt: EcgPlotOptions = {}): Raster {
  const pm = opt.pxPerMm ?? 4;
  const rowMm = 30;
  const leftMm = 12;
  const W = Math.round((leftMm + 250 + 6) * pm);
  const topMm = opt.title ? 8 : 2;
  const H = Math.round((topMm + 4 * rowMm + 4) * pm);
  const r = new Raster(W, H, PAPER);
  // grid
  for (let mm = 0; mm * pm < W; mm++) {
    const x = mm * pm;
    r.vline(x, 0, H - 1, mm % 5 === 0 ? MAJOR : MINOR);
  }
  for (let mm = 0; mm * pm < H; mm++) {
    const y = mm * pm;
    r.hline(0, W - 1, y, mm % 5 === 0 ? MAJOR : MINOR);
  }
  if (opt.title) r.text(leftMm * pm, Math.round(1.5 * pm), opt.title.toUpperCase(), INK, 2);
  const lead = (l: LeadName) => leads.subarray(LEADS.indexOf(l) * n, (LEADS.indexOf(l) + 1) * n);
  const layout: LeadName[][] = [
    ['I', 'aVR', 'V1', 'V4'],
    ['II', 'aVL', 'V2', 'V5'],
    ['III', 'aVF', 'V3', 'V6'],
  ];
  const pxPerS = 25 * pm, pxPerMv = 10 * pm;
  const drawTrace = (sig: Float32Array, i0: number, i1: number, x0: number, yBase: number) => {
    let px = -1, py = -1;
    for (let i = i0; i < i1 && i < n; i++) {
      const x = x0 + ((i - i0) / fsHz) * pxPerS;
      const y = yBase - sig[i] * pxPerMv;
      if (px >= 0) r.line(px, py, x, y, INK, 2);
      px = x;
      py = y;
    }
  };
  const calPulse = (yBase: number) => {
    const x0 = 3 * pm, x1 = x0 + 5 * pm;
    r.line(1 * pm, yBase, x0, yBase, INK, 2);
    r.line(x0, yBase, x0, yBase - pxPerMv, INK, 2);
    r.line(x0, yBase - pxPerMv, x1, yBase - pxPerMv, INK, 2);
    r.line(x1, yBase - pxPerMv, x1, yBase, INK, 2);
    r.line(x1, yBase, leftMm * pm, yBase, INK, 2);
  };
  const seg = Math.round(2.5 * fsHz);
  for (let row = 0; row < 4; row++) {
    const yBase = (topMm + row * rowMm + 18) * pm;
    calPulse(yBase);
    if (row < 3) {
      for (let col = 0; col < 4; col++) {
        const l = layout[row][col];
        const x0 = (leftMm + col * 62.5) * pm;
        const i0 = opt.sync ? 0 : col * seg;
        drawTrace(lead(l), i0, i0 + seg, x0, yBase);
        if (col > 0) r.line(x0, yBase - 3 * pm, x0, yBase + 3 * pm, INK, 1);
        r.text(x0 + 2 * pm, yBase - 14 * pm, l, INK, 2);
      }
    } else {
      drawTrace(lead('II'), 0, 4 * seg, leftMm * pm, yBase);
      r.text((leftMm + 2) * pm, yBase - 14 * pm, 'II', INK, 2);
    }
  }
  return r;
}
