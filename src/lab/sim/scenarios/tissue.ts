/**
 * Tissue modifications of a scenario, applied on the voxel grid (round 2).
 *
 * Necrosis relabels voxels TISSUE.Dead: activation skips them and the voxel-face kernel gains rim faces automatically,
 * so the scar removes its wavefront (Q waves) while Σc stays exactly 0.
 * Injury and voltage weights act on the source: per voxel the AP becomes r + (1 − ε − r)·s(t) (·g for gain). Hence
 *   template part   −gain · Σ (c_v·a_v)·s_v(t),   a_v = g_v·(1 − ε_v − r_v)
 *   steady part     H_dc = −gain · Σ c_v·g_v·r_v  (diastolic current of injury; present between beats)
 * At the plateau H = gain·Σ c·g·ε (systolic current) and the ST shift against the TQ baseline is gain·Σ c·g·(ε + r):
 * both currents point toward the injured surface (epicardial/transmural: outward; subendocardial: into the cavity).
 */
import type { SourceKernel, Vec3, VoxelGrid } from '../types';
import { COMP, STRUCTURES, TISSUE, compOfTissue } from '../types';
import type { RegionSelector, TissueSpec } from './types';

/**
 * RegionSelector.interleave membership of voxel v: lattice class c = (i + 2j + 3k) mod `of`, and the `keep` kept
 * classes are spread evenly over 0 … of−1 (c is kept iff ⌊(c+1)·keep/of⌋ > ⌊c·keep/of⌋). Along the grid axes the class
 * steps by 1, 2 and 3, so kept and skipped voxels alternate at the voxel scale on every surface — no stripes, and no
 * net dipole of the subset (tests/sim/scenarios/interleave.test.ts).
 */
export function interleaveKeeps(v: number, nx: number, ny: number, keep: number, of: number): boolean {
  const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
  const c = (i + 2 * j + 3 * k) % of;
  return Math.floor(((c + 1) * keep) / of) > Math.floor((c * keep) / of);
}

/** Voxels matching a selector (myocardium of the selector's compartment only). */
export function selectVoxels(g: VoxelGrid, sel: RegionSelector, comp: number = COMP.Ventricular): Uint32Array {
  const aha = sel.aha ? new Set(sel.aha) : null;
  const regions = sel.regions ? new Set(sel.regions.map((r) => STRUCTURES.indexOf(r))) : null;
  const il = sel.interleave;
  const [nx, ny] = g.dims;
  const out: number[] = [];
  for (let v = 0; v < g.tissue.length; v++) {
    if (compOfTissue(g.tissue[v]) !== comp) continue;
    const inAha = aha ? aha.has(g.aha[v]) : false;
    const inRegion = regions ? regions.has(g.region[v]) : false;
    if ((aha || regions) && !inAha && !inRegion) continue;
    const wd = g.wallDepth[v];
    // septum: wallDepth runs LV side (0) → RV side (1); treat its LV side as the endocardium of the LV territories
    if (sel.layer === 'subendocardial' && wd > 1 / 3) continue;
    if (sel.layer === 'epicardial' && wd < 2 / 3) continue;
    if (il && !interleaveKeeps(v, nx, ny, il.keep, il.of)) continue;
    out.push(v);
  }
  return Uint32Array.from(out);
}

const compOfSelector = (g: VoxelGrid, sel: RegionSelector): number => {
  if (sel.regions?.some((r) => r === 'RA' || r === 'LA' || r === 'LAA' || r === 'BACHMANN')) return COMP.Atrial;
  return COMP.Ventricular;
};

/** APD field with the scenario's regional APD changes applied (a copy; the input is not modified). */
export function applyApdChanges<T extends { readonly apdRefMs: Float32Array }>(g: VoxelGrid, apd: T, spec: TissueSpec | undefined): T {
  if (!spec?.apd?.length) return apd;
  const apdRefMs = Float32Array.from(apd.apdRefMs);
  for (const s of spec.apd) for (const v of selectVoxels(g, s, compOfSelector(g, s))) apdRefMs[v] += s.deltaMs;
  return { ...apd, apdRefMs };
}

/** Grid with necrotic voxels relabelled Dead (other fields shared, not copied). */
export function applyNecrosis(g: VoxelGrid, spec: TissueSpec | undefined): VoxelGrid {
  if (!spec?.dead?.length) return g;
  const tissue = Uint8Array.from(g.tissue);
  for (const sel of spec.dead) for (const v of selectVoxels(g, sel, compOfSelector(g, sel))) tissue[v] = TISSUE.Dead;
  return { ...g, tissue };
}

export interface SourceWeights {
  /** Per-voxel template amplitude a_v (grid-sized; 1 = unchanged). */
  readonly amplitude: Float32Array;
  /** Per-voxel resting offset r_v · g_v (grid-sized; 0 = unchanged). */
  readonly rest: Float32Array;
  readonly any: boolean;
}

export function sourceWeights(g: VoxelGrid, spec: TissueSpec | undefined): SourceWeights {
  const n = g.tissue.length;
  const gain = new Float32Array(n).fill(1);
  const eps = new Float32Array(n);
  const rest = new Float32Array(n);
  let any = false;
  for (const s of spec?.gain ?? []) for (const v of selectVoxels(g, s, compOfSelector(g, s))) {
    gain[v] *= s.factor;
    any = true;
  }
  for (const s of spec?.injury ?? []) for (const v of selectVoxels(g, s, compOfSelector(g, s))) {
    eps[v] = Math.max(eps[v], s.plateauDrop);
    rest[v] = Math.max(rest[v], s.restRise);
    any = true;
  }
  const amplitude = new Float32Array(n);
  const restOut = new Float32Array(n);
  for (let v = 0; v < n; v++) {
    amplitude[v] = gain[v] * (1 - eps[v] - rest[v]);
    restOut[v] = gain[v] * rest[v];
  }
  return { amplitude, rest: restOut, any };
}

/** Kernel with c_v scaled by the voxel amplitude (Σc' ≠ 0 is intended: that residual is the ST injury vector). */
export function weightKernel(k: SourceKernel, w: SourceWeights): SourceKernel {
  if (!w.any) return k;
  const c = new Float32Array(k.c.length);
  for (let q = 0; q < k.voxels.length; q++) {
    const a = w.amplitude[k.voxels[q]];
    c[3 * q] = k.c[3 * q] * a;
    c[3 * q + 1] = k.c[3 * q + 1] * a;
    c[3 * q + 2] = k.c[3 * q + 2] * a;
  }
  return { comp: k.comp, voxels: k.voxels, c };
}

/** Steady (diastolic) injury vector, heart-local frame, mV: −gain · Σ c_v·r_v. */
export function restVector(k: SourceKernel, w: SourceWeights, gain: number): Vec3 {
  let x = 0, y = 0, z = 0;
  if (!w.any) return [0, 0, 0];
  for (let q = 0; q < k.voxels.length; q++) {
    const r = w.rest[k.voxels[q]];
    if (r === 0) continue;
    x += k.c[3 * q] * r;
    y += k.c[3 * q + 1] * r;
    z += k.c[3 * q + 2] * r;
  }
  return [-gain * x, -gain * y, -gain * z];
}
