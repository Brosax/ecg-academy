/**
 * Procedural heart → GeometryBundle (types.ts). Pipeline (one staged generator shared by the sync and async builds):
 *   layout → voxelise analytic SDF (tissue / cavities / parts) → cavity distance transforms → LV/RV/septum & LA/RA split
 *   + insulation safety net → wallDepth, transDir, apexBase → AHA 17 + regions → render mesh → conduction system,
 *   landmarks, valves, contraction axes → re-centre on the ventricular myocardium centroid (app origin, types.ts).
 * Progress labels are stable stage keys ('geometry.voxels', …) for the app to translate, not user-visible text.
 */
import { buildPose } from '../frame';
import type { ChamberAxis, ConductionPath, GeometryBundle, StructureId, ValveGeom, Vec3, VoxelGrid } from '../types';
import { TISSUE } from '../types';
import type { HeartLayout, HeartParams } from './chambers';
import { heartLayout, mergeParams } from './chambers';
import { buildConduction } from './conduction';
import type { CavityDistances, Segmentation, WallFields } from './fields';
import { cavityDistances, centroidA, insulateAtria, rvInsertionDeg, segment, splitChambers, wallFields } from './fields';
import type { VoxelData } from './grid';
import { voxelize } from './grid';
import { buildRenderMesh } from './mesh';

export type { HeartParams } from './chambers';
export { DEFAULT_HEART_PARAMS } from './chambers';

/** Bumped whenever the generated anatomy changes for the same parameters. */
export const GEOMETRY_VERSION = 'heart-v1';

export type ProgressFn = (p: number, label: string) => void;

/** Extra build information for tests, calibration and the integrator (anatomical frame A unless noted). */
export interface HeartBuildInfo {
  readonly params: HeartParams;
  readonly layout: HeartLayout;
  /** Local = A − shiftA (the ventricular myocardial centroid in frame A). */
  readonly shiftA: Vec3;
  readonly insertionDeg: { readonly anterior: number; readonly inferior: number };
  readonly levelsA: readonly [number, number, number];
  readonly relabelledAtrialVoxels: number;
  /** Render-mesh sample spacing and samples flipped by the topology repair. */
  readonly meshSpacingMm: number;
  readonly meshRepairedSamples: number;
  readonly conductionMisses: readonly string[];
  readonly timingsMs: Readonly<Record<string, number>>;
  readonly voxels: VoxelData;
  readonly distances: CavityDistances;
}

type Step = [progress: number, label: string];

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function* stages(params?: Partial<HeartParams>): Generator<Step, { bundle: GeometryBundle; info: HeartBuildInfo }> {
  const timings: Record<string, number> = {};
  let t0 = now();
  const lap = (k: string) => {
    const t = now();
    timings[k] = (timings[k] ?? 0) + (t - t0);
    t0 = t;
  };
  const P = mergeParams(params);
  const L = heartLayout(P);
  yield [0.02, 'geometry.layout'];
  t0 = now();

  const vg = voxelize(L);
  let r = vg.next();
  while (!r.done) {
    lap('voxels');
    yield [0.02 + 0.48 * r.value, 'geometry.voxels'];
    t0 = now();
    r = vg.next();
  }
  const vox = r.value;
  lap('voxels');

  const dist = cavityDistances(vox);
  lap('distance');
  yield [0.6, 'geometry.distance'];
  t0 = now();

  splitChambers(vox, dist);
  const relabelled = insulateAtria(vox);
  const wf: WallFields = wallFields(vox, dist, L);
  lap('walls');
  yield [0.7, 'geometry.walls'];
  t0 = now();

  const insertion = rvInsertionDeg(vox, L);
  const seg: Segmentation = segment(vox, L, wf, insertion.anterior);
  lap('segments');
  yield [0.75, 'geometry.segments'];
  t0 = now();

  // Re-centre: local origin = centroid of ventricular myocardium (app origin, types.ts).
  const T_LV = TISSUE.LV, T_RV = TISSUE.RV, T_SEP = TISSUE.Septum;
  const tis = vox.tissue;
  const c = centroidA(vox, (v) => {
    const t = tis[v];
    return t === T_LV || t === T_RV || t === T_SEP;
  });
  const shift: Vec3 = [round3(c[0]), round3(c[1]), round3(c[2])];
  const toLocal = (p: Vec3): Vec3 => [p[0] - shift[0], p[1] - shift[1], p[2] - shift[2]];
  const originMm = toLocal(vox.originA);
  const mb = buildRenderMesh(vox.sdf, vox.tissue, vox.dims, originMm, vox.h, P.meshScale);
  const mesh = mb.mesh;
  lap('mesh');
  yield [0.92, 'geometry.mesh'];
  t0 = now();

  const cs = buildConduction({ vox, L, d: dist, w: wf, seg, insertion });
  const paths: ConductionPath[] = cs.paths.map((p) => ({ id: p.id, pointsMm: p.pointsMm.map(toLocal) }));
  const valves: ValveGeom[] = cs.valves.map((v) => ({ ...v, centerMm: toLocal(v.centerMm) }));
  const chambers: ChamberAxis[] = cs.chambers.map((a) => ({ ...a, centerMm: toLocal(a.centerMm) }));
  const landmarks: Partial<Record<StructureId, Vec3>> = {};
  for (const [k, v] of Object.entries(cs.landmarks) as [StructureId, Vec3][]) landmarks[k] = toLocal(v);
  lap('conduction');

  const grid: VoxelGrid = {
    dims: vox.dims,
    hMm: vox.h,
    originMm,
    tissue: vox.tissue,
    chamber: vox.chamber,
    aha: seg.aha,
    region: seg.region,
    wallDepth: wf.wallDepth,
    apexBase: wf.apexBase,
    transDir: wf.transDir,
    sdfMm: vox.sdf,
  };
  const bundle: GeometryBundle = {
    grid, mesh, pose: buildPose(), chambers, paths, valves, landmarks,
    hash: `${GEOMETRY_VERSION}:${fnv1a(JSON.stringify(P))}`,
  };
  const info: HeartBuildInfo = {
    params: P, layout: L, shiftA: shift, insertionDeg: insertion, levelsA: seg.levels,
    relabelledAtrialVoxels: relabelled, meshSpacingMm: mb.meshSpacingMm, meshRepairedSamples: mb.repairedSamples,
    conductionMisses: cs.misses, timingsMs: timings, voxels: vox, distances: dist,
  };
  yield [1, 'geometry.ready'];
  return { bundle, info };
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Builds the heart and returns extra diagnostics (tests, calibration). */
export function buildHeartGeometryWithInfo(params?: Partial<HeartParams>): { bundle: GeometryBundle; info: HeartBuildInfo } {
  const g = stages(params);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}

export function buildHeartGeometry(params?: Partial<HeartParams>): GeometryBundle {
  return buildHeartGeometryWithInfo(params).bundle;
}

/** Same result as buildHeartGeometry; yields to the event loop (setTimeout 0) between stages so a loading bar can paint. */
export async function buildHeartGeometryAsync(
  params?: Partial<HeartParams>,
  onProgress?: ProgressFn,
): Promise<GeometryBundle> {
  const g = stages(params);
  let r = g.next();
  while (!r.done) {
    onProgress?.(r.value[0], r.value[1]);
    await new Promise<void>((res) => setTimeout(res, 0));
    r = g.next();
  }
  return r.value.bundle;
}
