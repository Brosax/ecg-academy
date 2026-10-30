/**
 * Anatomy-bound APD map (plan "APD"):
 *   APD_ref(v) = APD_ref + G_ab·(apexBase − 0.5) + G_tm·(endoNess − 0.5) + G_lr·(±0.5 for LV / RV)
 * Every gradient is centred, so the longest APD is APD_ref + (G_ab + G_tm + |G_lr|)/2 ≈ 270–290 ms with the defaults
 * (an uncentred map reaches ≈ 330 ms and QTc fails before calibration even starts).
 * Septum: treated as LV; its transmural coordinate is measured from the NEAREST endocardial surface
 * (wallDepth 0 = LV side … 1 = RV side → depth = min(wd, 1 − wd)), so both septal surfaces are "endocardium".
 * No M-cell layer (Opthof 2017, docs/research/activation-physiology.md §4). Atria: uniform triangular-AP APD.
 * The APD map is independent of activation order, so the ventricular gradient is too (Burger; DM "ventricular gradient").
 */
import type { ApdField, VoxelGrid } from '../types';
import { TISSUE } from '../types';

export interface ApdParams {
  readonly apdRefMs: number;
  readonly gAbMs: number;
  readonly gTmMs: number;
  readonly gLrMs: number;
  readonly apdAtrialMs: number;
  readonly rrRefMs: number;
  readonly rateExp: number;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** 0 = endocardium … 1 = epicardium, septum measured from the nearest endocardial surface (0 … 0.5). */
export function transmuralDepth(tissue: number, wallDepth: number): number {
  const wd = clamp01(wallDepth);
  return tissue === TISSUE.Septum ? Math.min(wd, 1 - wd) : wd;
}

export function ventricularApd(tissue: number, apexBase: number, wallDepth: number, p: ApdParams): number {
  const endoNess = 1 - transmuralDepth(tissue, wallDepth);
  const lr = tissue === TISSUE.RV ? -0.5 : 0.5;
  return p.apdRefMs + p.gAbMs * (clamp01(apexBase) - 0.5) + p.gTmMs * (endoNess - 0.5) + p.gLrMs * lr;
}

/** Upper bound of the ventricular APD map for given parameters. */
export const maxVentricularApd = (p: ApdParams): number => p.apdRefMs + (Math.abs(p.gAbMs) + Math.abs(p.gTmMs) + Math.abs(p.gLrMs)) / 2;

export function buildApdField(grid: VoxelGrid, p: ApdParams): ApdField {
  const { tissue, apexBase, wallDepth } = grid;
  const n = tissue.length;
  const apdRefMs = new Float32Array(n);
  const LV = TISSUE.LV, RV = TISSUE.RV, SEPT = TISSUE.Septum, LA = TISSUE.LA, RA = TISSUE.RA, atrial = p.apdAtrialMs;
  for (let v = 0; v < n; v++) {
    const t = tissue[v];
    if (t === LV || t === RV || t === SEPT) apdRefMs[v] = ventricularApd(t, apexBase[v], wallDepth[v], p);
    else if (t === LA || t === RA) apdRefMs[v] = atrial;
  }
  return { apdRefMs, rrRefMs: p.rrRefMs, rateExp: p.rateExp };
}

/** APD scale for a beat: (RRprev / RRref)^rateExp — the same expression SinusRhythm uses for V events. */
export const apdScaleFor = (rrPrevMs: number, rrRefMs: number, rateExp: number): number => Math.pow(rrPrevMs / rrRefMs, rateExp);
