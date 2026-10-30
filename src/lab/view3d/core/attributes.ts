/**
 * Per-vertex attributes for the heart mesh (GPU contract, src/view3d/gpuContract.ts), built from the SAME activation /
 * APD fields the ECG source uses — the 3D colouring can never disagree with the ECG.
 * Attributes are static; they are rebuilt only when engine.onChange fires.
 */
import { T_NEVER } from '../gpuContract';
import type { ActivationField, EngineFields, GeometryBundle, VoxelGrid } from '../../sim/types';
import { COMP, compOfTissue, isMyocardium } from '../../sim/types';

export interface HeartAttributes {
  readonly tAct0: Float32Array;
  readonly tAct1: Float32Array;
  readonly apdRef: Float32Array;
  readonly wallDepth: Float32Array;
  readonly tissue: Float32Array;
  readonly region: Float32Array;
  readonly aha: Float32Array;
}

/** Slot fields of the compartment a voxel belongs to (null slot → missing field). */
export function slotFields(fields: EngineFields, comp: number): readonly [ActivationField | null, ActivationField | null] {
  if (comp === COMP.Atrial) return fields.atrial;
  if (comp === COMP.Ventricular) return fields.ventricular;
  return [null, null];
}

const finiteOr = (x: number, fallback: number): number => (Number.isFinite(x) ? x : fallback);

/** tAct of a voxel in a slot field, or T_NEVER (unactivated, other compartment, no slot-1 field). */
export function voxelTAct(field: ActivationField | null, v: number): number {
  return field ? finiteOr(field.tAct[v], T_NEVER) : T_NEVER;
}

export function buildHeartAttributes(geo: GeometryBundle, fields: EngineFields): HeartAttributes {
  const g = geo.grid;
  const vox = geo.mesh.voxel;
  const n = vox.length;
  const out: HeartAttributes = {
    tAct0: new Float32Array(n),
    tAct1: new Float32Array(n),
    apdRef: new Float32Array(n),
    wallDepth: new Float32Array(n),
    tissue: new Float32Array(n),
    region: new Float32Array(n),
    aha: new Float32Array(n),
  };
  const apd = fields.apd.apdRefMs;
  for (let i = 0; i < n; i++) {
    const v = vox[i];
    const t = g.tissue[v];
    const [f0, f1] = slotFields(fields, compOfTissue(t));
    out.tAct0[i] = voxelTAct(f0, v);
    out.tAct1[i] = voxelTAct(f1, v);
    out.apdRef[i] = isMyocardium(t) ? finiteOr(apd[v], 0) : 0;
    out.wallDepth[i] = g.wallDepth[v];
    out.tissue[i] = t;
    out.region[i] = g.region[v];
    out.aha[i] = g.aha[v];
  }
  return out;
}

/**
 * Representative (median) activation time and APD per compartment. Used by the displacement field where the field
 * has no local value (deep blood pool, ring, vessels) and for the global base descent.
 */
export interface MechReference {
  readonly tActA: number;
  readonly tActV: number;
  readonly apdA: number;
  readonly apdV: number;
}

function median(xs: number[], fallback: number): number {
  if (xs.length === 0) return fallback;
  xs.sort((a, b) => a - b);
  return xs[xs.length >> 1];
}

export function mechReference(grid: VoxelGrid, fields: EngineFields): MechReference {
  const ta: number[] = [], tv: number[] = [], aa: number[] = [], av: number[] = [];
  const apd = fields.apd.apdRefMs;
  // Subsample: medians of ~1/7 of the voxels are indistinguishable and keep startup cheap on 100³ grids.
  for (let v = 0; v < grid.tissue.length; v += 7) {
    const c = compOfTissue(grid.tissue[v]);
    if (c === COMP.Atrial) {
      const t = fields.atrial[0].tAct[v];
      if (Number.isFinite(t)) ta.push(t);
      if (apd[v] > 0) aa.push(apd[v]);
    } else if (c === COMP.Ventricular) {
      const t = fields.ventricular[0].tAct[v];
      if (Number.isFinite(t)) tv.push(t);
      if (apd[v] > 0) av.push(apd[v]);
    }
  }
  return { tActA: median(ta, 50), tActV: median(tv, 50), apdA: median(aa, 200), apdV: median(av, 250) };
}
