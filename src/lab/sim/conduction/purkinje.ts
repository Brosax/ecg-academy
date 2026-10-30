/**
 * Graph layers for the fastest-route solver:
 *  - Purkinje network: one node per covered subendocardial voxel (LV and RV endocardium incl. both septal surfaces),
 *    node↔node at vPurkinje (2–4 m/s) within the same cavity, node→its voxel after the PMJ delay (5–10 ms),
 *    voxel→node only if the retrograde delay is finite (default blocked). Coverage mask: apexBase ≤ extent (≈ apical
 *    2/3, which drops the basal septum) and no excluded regions (RVOT, LV posterobasal) — plan "浦肯野层".
 *  - Cable: a conduction-system polyline (Bachmann's bundle) resampled at ≈ h, conducting at vCable and coupled both
 *    ways to muscle voxels within a radius at the muscle speed. Geometry-agnostic: it does not rely on the atrial walls
 *    touching in the grid.
 */
import type { Comp, StructureId, Vec3, VoxelGrid } from '../types';
import { CHAMBER, STRUCTURES, compOfTissue } from '../types';
import type { GraphLayer } from './fastestRoute';
import { buildReverse, stencilOffsets, toCsr } from './fastestRoute';
import { resamplePolyline, subendocardium, voxelCenter, voxelsWithin } from './gridUtil';
import type { Stencil } from './params';

export interface PurkinjeLayer extends GraphLayer {
  /** Voxel under each node. */
  readonly voxel: Uint32Array;
  /** CHAMBER.LV / CHAMBER.RV per node. */
  readonly chamber: Uint8Array;
  /** Node index per grid voxel (−1 = not a Purkinje node). */
  readonly nodeOfVoxel: Int32Array;
  /** All subendocardial voxels (covered or not) and their cavity — used to snap fascicle terminals. */
  readonly subendo: { readonly voxel: Uint32Array; readonly chamber: Uint8Array };
}

export interface PurkinjeOptions {
  readonly extent: number;
  readonly exclude: readonly StructureId[];
  readonly stencil: Stencil;
  readonly vPurkinjeMps: number;
  readonly pmjDelayMs: number;
  readonly retroDelayMs: number;
  /** AHA segments without LV Purkinje coverage (LV-facing subendocardium only; fascicular block). */
  readonly excludeAha?: readonly number[];
}

export function buildPurkinjeLayer(g: VoxelGrid, o: PurkinjeOptions): PurkinjeLayer {
  const [nx, ny, nz] = g.dims;
  const N = nx * ny * nz;
  const sub = subendocardium(g);
  const excluded = new Set(o.exclude.map((s) => STRUCTURES.indexOf(s)));
  const exAha = o.excludeAha?.length ? new Set(o.excludeAha) : null;
  const nodeOfVoxel = new Int32Array(N).fill(-1);
  const vox: number[] = [], ch: number[] = [];
  for (let s = 0; s < sub.voxel.length; s++) {
    const v = sub.voxel[s];
    if (g.apexBase[v] > o.extent) continue;
    if (excluded.has(g.region[v])) continue;
    if (exAha && sub.chamber[s] === CHAMBER.LV && exAha.has(g.aha[v])) continue;
    nodeOfVoxel[v] = vox.length;
    vox.push(v);
    ch.push(sub.chamber[s]);
  }
  const voxel = Uint32Array.from(vox), chamber = Uint8Array.from(ch);
  const st = stencilOffsets(o.stencil);
  const h = g.hMm;
  const adj: { to: number; ms: number }[][] = [];
  const out: { to: number; ms: number }[][] = [];
  for (let n = 0; n < voxel.length; n++) {
    const v = voxel[n];
    const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
    const list: { to: number; ms: number }[] = [];
    for (let q = 0; q < st.length; q += 3) {
      const ii = i + st[q], jj = j + st[q + 1], kk = k + st[q + 2];
      if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
      const m = nodeOfVoxel[ii + nx * (jj + ny * kk)];
      if (m < 0 || chamber[m] !== chamber[n]) continue;
      list.push({ to: m, ms: (h * Math.hypot(st[q], st[q + 1], st[q + 2])) / o.vPurkinjeMps });
    }
    adj.push(list);
    out.push([{ to: v, ms: o.pmjDelayMs }]);
  }
  const a = toCsr(adj), b = toCsr(out);
  const rev = buildReverse(N, Array.from(voxel, (v, n) => ({ voxel: v, node: n, ms: o.retroDelayMs })));
  return {
    size: voxel.length,
    adjStart: a.start, adjNode: a.to, adjMs: a.ms,
    outStart: b.start, outVoxel: b.to, outMs: b.ms,
    inHead: rev?.inHead ?? null, inNext: rev?.inNext ?? null, inNode: rev?.inNode ?? null, inMs: rev?.inMs ?? null,
    voxel, chamber, nodeOfVoxel, subendo: sub,
  };
}

export interface CableLayer extends GraphLayer {
  readonly pointsMm: readonly Vec3[];
  /** Arc length (mm) per node. */
  readonly arcMm: readonly number[];
}

export interface CableOptions {
  readonly comp: Comp;
  readonly vCableMps: number;
  readonly couplingMm: number;
  readonly vCoupleMps: number;
}

export function buildCableLayer(g: VoxelGrid, polyline: readonly Vec3[], o: CableOptions): CableLayer {
  const { pts, arc } = resamplePolyline(polyline, g.hMm);
  const adj: { to: number; ms: number }[][] = pts.map(() => []);
  for (let n = 1; n < pts.length; n++) {
    const ms = (arc[n] - arc[n - 1]) / o.vCableMps;
    adj[n - 1].push({ to: n, ms });
    adj[n].push({ to: n - 1, ms });
  }
  const out: { to: number; ms: number }[][] = [];
  const rev: { voxel: number; node: number; ms: number }[] = [];
  pts.forEach((p, n) => {
    const list: { to: number; ms: number }[] = [];
    for (const v of voxelsWithin(g, p, o.couplingMm, (w) => compOfTissue(g.tissue[w]) === o.comp)) {
      const c = voxelCenter(g, v);
      const ms = Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]) / o.vCoupleMps;
      list.push({ to: v, ms });
      rev.push({ voxel: v, node: n, ms });
    }
    out.push(list);
  });
  const a = toCsr(adj), b = toCsr(out);
  const r = buildReverse(g.tissue.length, rev);
  return {
    size: pts.length,
    adjStart: a.start, adjNode: a.to, adjMs: a.ms,
    outStart: b.start, outVoxel: b.to, outMs: b.ms,
    inHead: r?.inHead ?? null, inNext: r?.inNext ?? null, inNode: r?.inNode ?? null, inMs: r?.inMs ?? null,
    pointsMm: pts, arcMm: arc,
  };
}

/** Purkinje chamber constant for a bundle: left fascicles → LV, RBB → RV. */
export const chamberOfBundle = (id: StructureId): number => (id === 'RBB' ? CHAMBER.RV : CHAMBER.LV);
