/**
 * tissue.notch → per-voxel phase-1 notch assignment (source/apNotch.ts). Ventricular myocardium only: the notch is the
 * ventricular I_to spike-and-dome (atrial I_to is not modelled). Entries apply in order and a later entry overrides an
 * earlier one on shared voxels, so a regional deeper notch can follow a general one.
 */
import type { NotchField } from '../source/apNotch';
import { notchShapeOf } from '../source/apNotch';
import type { VoxelGrid } from '../types';
import { COMP } from '../types';
import { selectVoxels } from './tissue';
import type { TissueSpec } from './types';

/** Grid-sized notch field of a scenario, or null when it has no notch (the synthesis then stays bit-identical). */
export function notchField(g: VoxelGrid, spec: TissueSpec | undefined): NotchField | null {
  const entries = spec?.notch ?? [];
  if (!entries.length) return null;
  if (entries.length > 255) throw new Error('tissue.notch: at most 255 entries');
  const n = g.tissue.length;
  const cls = new Uint8Array(n);
  const depth = new Float32Array(n);
  entries.forEach((e, i) => {
    const d = Math.min(0.9, Math.max(0, e.depth));
    for (const v of selectVoxels(g, e, COMP.Ventricular)) {
      cls[v] = i + 1;
      depth[v] = d;
    }
  });
  return { cls, depth, shapes: entries.map(notchShapeOf) };
}
