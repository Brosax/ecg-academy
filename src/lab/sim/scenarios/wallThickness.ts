/**
 * Hypertrophy / chamber enlargement of a scenario (tissue.hypertrophy, batch 3) → per-voxel factors for the source
 * kernel and the conduction graph. The voxel geometry itself is fixed (the HRA heart is not regenerated): a k-fold
 * thicker ventricular wall is mapped onto it as a transmural stretch —
 *   source      fronts running along the wall have a k-fold larger surface (source/hypertrophyKernel.ts, 'transmural')
 *   conduction  the transmural path is k-fold longer at the same tissue speed → transmural speed factor 1/k
 * so the thick wall needs longer to activate (later R peak in the facing leads) and its fronts outlast the opposite
 * chamber's (less cancellation, larger voltage) — the electrical consequences of the extra mass, from geometry alone.
 * Atrial selectors (enlargement, dilated thin walls) scale the atrial source isotropically; atrial conduction is left
 * to the atrial speed parameters. Activation and APD stay single fields shared by the ECG, the 3D view and the slice.
 */
import { buildHypertrophyKernel } from '../source/hypertrophyKernel';
import { buildKernel } from '../source/voxelEdl';
import type { SourceKernel, VoxelGrid } from '../types';
import { COMP } from '../types';
import { selectVoxels } from './tissue';
import type { RegionSelector, TissueSpec } from './types';

export interface HypertrophyFields {
  /** Ventricular wall-thickness factor per voxel (1 = unchanged), or null when no ventricular selector is given. */
  readonly ventricular: Float32Array | null;
  /** Atrial source factor per voxel, or null. */
  readonly atrial: Float32Array | null;
  /** Transmural speed factor per voxel (1 / thickness) for the ventricular conduction graph, or null. */
  readonly transScale: Float32Array | null;
}

const isAtrialSelector = (s: RegionSelector) => !!s.regions?.some((r) => r === 'RA' || r === 'LA' || r === 'LAA' || r === 'BACHMANN');

export function hypertrophyFields(g: VoxelGrid, spec: TissueSpec | undefined): HypertrophyFields | null {
  const list = spec?.hypertrophy ?? [];
  if (list.length === 0) return null;
  const n = g.tissue.length;
  let ventricular: Float32Array | null = null, atrial: Float32Array | null = null;
  for (const s of list) {
    if (!(s.factor > 0)) throw new Error(`tissue.hypertrophy: factor must be > 0 (got ${s.factor})`);
    const atr = isAtrialSelector(s);
    const k = atr ? (atrial ??= new Float32Array(n).fill(1)) : (ventricular ??= new Float32Array(n).fill(1));
    for (const v of selectVoxels(g, s, atr ? COMP.Atrial : COMP.Ventricular)) k[v] *= s.factor;
  }
  let transScale: Float32Array | null = null;
  if (ventricular) {
    transScale = new Float32Array(n);
    for (let v = 0; v < n; v++) transScale[v] = 1 / ventricular[v];
  }
  return { ventricular, atrial, transScale };
}

/** Source kernels with the hypertrophy factors applied (unweighted kernels where a compartment has none). */
export function hypertrophyKernels(g: VoxelGrid, f: HypertrophyFields): { readonly atrial: SourceKernel; readonly ventricular: SourceKernel } {
  return {
    atrial: f.atrial ? buildHypertrophyKernel(g, COMP.Atrial, f.atrial, 'isotropic') : buildKernel(g, COMP.Atrial),
    ventricular: f.ventricular ? buildHypertrophyKernel(g, COMP.Ventricular, f.ventricular, 'transmural') : buildKernel(g, COMP.Ventricular),
  };
}
