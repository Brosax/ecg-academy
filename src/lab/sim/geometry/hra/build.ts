/**
 * Bake pipeline (Node only): raw HRA GLBs → GeometryBundle (source 'hra').
 *   1. label in the body frame → heart-local frame from the data (heartFrame.ts)
 *   2. label again in the local frame (h = 1.5 mm), moderator band added as RV myocardium
 *   3. derived fields (fields.ts), render mesh + vertex voxels, overlays, valves, chamber axes
 *   4. conduction-system paths and landmarks on the real anatomy (conduction.ts)
 * The runtime never runs this: it decodes the baked asset (codec.ts / load.ts).
 */
import { add, mat3MulVec, mat3Transpose, normalize, scale, sub } from '../../frame';
import type { ChamberAxis, GeometryBundle, ValveGeom, Vec3, VoxelGrid } from '../../types';
import { CHAMBER, TISSUE, VALVES } from '../../types';
import { placeConduction, VoxelIndex } from './conduction';
import type { ConductionOutputs } from './conduction';
import { deriveFields } from './fields';
import type { FieldOutputs } from './fields';
import type { HeartFrame } from './heartFrame';
import { computeHeartFrame } from './heartFrame';
import type { Labelled } from './label';
import { labelHeart, PART } from './label';
import { HRA_CREDITS } from './parts';
import { heartMeshParts, mapVertexVoxels, overlayMeshes } from './renderMesh';
import { loadHraSource } from './source';
import { vertexNormals } from './mesh';
import type { Mesh } from './mesh';

export const HRA_GRID_MM = 1.5;

export interface BakeReport {
  readonly frame: HeartFrame;
  readonly apexLocal: Vec3;
  readonly labelStats: Record<string, number | string>;
  readonly fieldInfo: FieldOutputs['info'];
  readonly conductionPoints: ConductionOutputs['points'];
  /** LV papillary roots added by the bake (apical end → wall, local mm). */
  readonly papillaryRoots: Record<string, { from: Vec3; to: Vec3; lengthMm: number }>;
  readonly timingsMs: Record<string, number>;
}

export function buildHraGeometry(heartGlb: Uint8Array, vesselGlb: Uint8Array, hMm = HRA_GRID_MM): { bundle: GeometryBundle; report: BakeReport } {
  const T0 = performance.now();
  const timings: Record<string, number> = {};
  const lap = (k: string, t: number) => (timings[k] = Math.round(performance.now() - t));
  let t = performance.now();
  const src = loadHraSource(heartGlb, vesselGlb);
  lap('read', t);
  t = performance.now();
  const L0 = labelHeart(src, { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], o: [0, 0, 0] }, hMm);
  const frame = computeHeartFrame(L0);
  lap('frame', t);
  t = performance.now();
  const L = labelHeart(src, frame, hMm);
  lap('label', t);
  const toLocal = (p: Vec3): Vec3 => mat3MulVec(mat3Transpose(frame.R), sub(p, frame.o));
  const apexLocal = toLocal(frame.apexBody);

  // LV papillary roots, papillary attachment points and the moderator band (RV septum → base of the RV anterior
  // papillary muscle)
  const papRoots = addPapillaryRoots(L);
  const papBase = papillaryBases(L);
  addModeratorBand(L, papBase.rvAnterior);

  t = performance.now();
  const surfaces: Mesh[] = [
    ...Object.values(L.meshes.walls), ...L.meshes.papillary.map((p) => p.mesh),
    ...VALVES.map((v) => L.rings[v].band), ...L.meshes.vessels.map((v) => v.mesh),
  ];
  const laaDir = normalize(mat3MulVec(mat3Transpose(frame.R), normalize([0.55, 0.3, 0.78])));
  const fields = deriveFields({ L, apexMm: apexLocal, laaDir, surfaces });
  lap('fields', t);
  const grid = fields.grid;

  t = performance.now();
  const parts = heartMeshParts(src, L, frame);
  const position = Float32Array.from(parts.mesh.position);
  const index = Uint32Array.from(parts.mesh.index);
  const voxel = mapVertexVoxels(grid, L.part, position, parts.vclass);
  const normal = vertexNormals(position, index);
  const overlays = overlayMeshes(src, frame);
  lap('mesh', t);

  t = performance.now();
  const vessels = new Map(L.meshes.vessels.map((v) => [v.id, v.mesh]));
  const anteriorDir = normalize(mat3MulVec(mat3Transpose(frame.R), [0, 0, 1]));
  const papillary = Uint8Array.from(L.part, (p) => (p === PART.PapLV || p === PART.PapRV ? 1 : 0));
  const cond = placeConduction({ grid, rings: L.rings, vessels, papillaryBase: papBase, anteriorDir, papillary,
    lvApex: apexLocal, insertionsDeg: [fields.info.anteriorInsertionDeg, fields.info.inferiorInsertionDeg],
  });
  lap('conduction', t);

  const valves: ValveGeom[] = VALVES.map((id) => ({ id, centerMm: L.rings[id].centerMm, normal: L.rings[id].normal, radiusMm: L.rings[id].radiusMm }));
  const chambers = chamberAxes(grid, L, apexLocal);
  timings.total = Math.round(performance.now() - T0);
  const bundle: GeometryBundle = {
    source: 'hra',
    overlays,
    credits: HRA_CREDITS,
    grid,
    mesh: { position, normal, index, voxel },
    pose: { R: frame.R, tCm: [0, 0, 0] },
    chambers,
    paths: cond.paths,
    valves,
    landmarks: cond.landmarks,
    hash: '',
  };
  return {
    bundle,
    report: { frame, apexLocal, labelStats: L.stats, fieldInfo: fields.info, conductionPoints: cond.points, papillaryRoots: papRoots, timingsMs: timings },
  };
}

/** Attachment point of each papillary muscle: centroid of its voxels touching non-papillary wall of its ventricle. */
function papillaryBases(L: Labelled): Record<'lvAnterolateral' | 'lvPosteromedial' | 'rvAnterior', Vec3> {
  const g = L.grid;
  const X = new VoxelIndex({ ...g, tissue: L.tissue } as unknown as VoxelGrid);
  const out = {} as Record<'lvAnterolateral' | 'lvPosteromedial' | 'rvAnterior', Vec3>;
  for (const key of ['lvAnterolateral', 'lvPosteromedial', 'rvAnterior'] as const) {
    const p = L.meshes.papillary.find((q) => q.key === key)!;
    const isWall = (v: number) => {
      const tt = L.tissue[v];
      return (tt === TISSUE.LV || tt === TISSUE.RV || tt === TISSUE.Septum) && L.part[v] !== PART.PapLV && L.part[v] !== PART.PapRV;
    };
    let s: Vec3 = [0, 0, 0], n = 0, best: Vec3 = [p.mesh.position[0], p.mesh.position[1], p.mesh.position[2]], bd = Infinity;
    for (let i = 0; i < p.mesh.position.length; i += 3) {
      const q: Vec3 = [p.mesh.position[i], p.mesh.position[i + 1], p.mesh.position[i + 2]];
      const v = X.nearest(q, isWall, 6);
      if (v < 0) continue;
      const d = Math.hypot(...sub(X.pos(v), q));
      if (d < bd) {
        bd = d;
        best = q;
      }
      if (d <= 2.5) {
        s = add(s, q);
        n++;
      }
    }
    out[key] = n ? scale(s, 1 / n) : best;
  }
  return out;
}

/**
 * Roots of the LV papillary muscles (geometry fix for calibration, 2026-10-08). In the voxelized HRA heart both LV
 * papillary muscles hang free in the cavity: their apical bodies are separated from the trabeculated wall by ≥ 3.7 mm
 * of blood and they touch the wall only near the base (apexBase ≈ 0.85). Their subendocardial Purkinje nodes then form
 * an island that no fascicle reaches (Purkinje edges span ≤ √5 voxels), so they activated last (60–90 ms after QRS
 * onset) and dominated the "last activated" set. Anatomically the papillary muscles arise from the apical–middle LV
 * wall and are among the first sites excited by the left fascicles (docs/research/activation-physiology.md §1).
 * Each LV muscle's apical end (centroid of its lowest 15 % of mesh vertices along the apex → base axis, local +y) is
 * joined to the nearest LV wall voxel facing LV blood by a 3 mm-radius root of LV myocardium across LV blood (the
 * trabecular attachment of a contracted heart; moderator-band style). Returns the root endpoints (bake report).
 */
function addPapillaryRoots(L: Labelled): Record<string, { from: Vec3; to: Vec3; lengthMm: number }> {
  const g = L.grid;
  const [nx, ny, nz] = g.dims;
  const X = new VoxelIndex({ ...g, tissue: L.tissue } as unknown as VoxelGrid);
  const lvBlood = (v: number) => L.tissue[v] === TISSUE.Blood && L.chamber[v] === CHAMBER.LV;
  const isWall = (v: number) =>
    (L.tissue[v] === TISSUE.LV || L.tissue[v] === TISSUE.Septum) && L.part[v] !== PART.PapLV && X.hasNeighbour(v, lvBlood);
  const out: Record<string, { from: Vec3; to: Vec3; lengthMm: number }> = {};
  for (const p of L.meshes.papillary) {
    if (p.chamber !== CHAMBER.LV) continue;
    const P = p.mesh.position;
    const ys: number[] = [];
    for (let i = 1; i < P.length; i += 3) ys.push(P[i]);
    ys.sort((a, b) => a - b);
    const yCut = ys[Math.floor(0.15 * (ys.length - 1))];
    let a: Vec3 = [0, 0, 0], n = 0;
    for (let i = 0; i < P.length; i += 3) if (P[i + 1] <= yCut) {
      a = add(a, [P[i], P[i + 1], P[i + 2]]);
      n++;
    }
    if (!n) continue;
    a = scale(a, 1 / n);
    const w = X.nearest(a, isWall, 25);
    if (w < 0) continue;
    const b = X.pos(w), d = sub(b, a);
    const len = Math.hypot(d[0], d[1], d[2]);
    out[p.key] = { from: a, to: b, lengthMm: len };
    const r = 3;
    const steps = Math.max(1, Math.ceil(len / (0.5 * g.hMm)));
    const rv = Math.ceil(r / g.hMm);
    for (let s = 0; s <= steps; s++) {
      const c = add(a, scale(d, s / steps));
      const fi = Math.round((c[0] - g.originMm[0]) / g.hMm), fj = Math.round((c[1] - g.originMm[1]) / g.hMm), fk = Math.round((c[2] - g.originMm[2]) / g.hMm);
      for (let k = fk - rv; k <= fk + rv; k++)
        for (let j = fj - rv; j <= fj + rv; j++)
          for (let i = fi - rv; i <= fi + rv; i++) {
            if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
            const v = i + nx * (j + ny * k);
            if (!lvBlood(v)) continue;
            const q = X.pos(v);
            if (Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) > r) continue;
            L.tissue[v] = TISSUE.LV;
            L.chamber[v] = CHAMBER.LV;
            L.part[v] = PART.PapLV;
          }
    }
  }
  return out;
}

/** Voxelizes the moderator band (septomarginal trabecula, radius 2.2 mm) as RV myocardium across RV blood. */
function addModeratorBand(L: Labelled, apm: Vec3): void {
  const g = L.grid;
  const X = new VoxelIndex({ ...g, tissue: L.tissue } as unknown as VoxelGrid);
  const rvBlood = (v: number) => L.tissue[v] === TISSUE.Blood && L.chamber[v] === CHAMBER.RV;
  const s = X.nearest(apm, (v) => L.tissue[v] === TISSUE.Septum && X.hasNeighbour(v, rvBlood), 60);
  if (s < 0) return;
  const a = X.pos(s), d = sub(apm, a);
  const len = Math.hypot(d[0], d[1], d[2]);
  if (len < 3) return;
  const u = scale(d, 1 / len);
  const r = 2.2;
  const steps = Math.ceil(len / (0.5 * g.hMm));
  for (let i = 0; i <= steps; i++) {
    const c = add(a, scale(u, (len * i) / steps));
    const [nx, ny, nz] = g.dims;
    const fi = Math.round((c[0] - g.originMm[0]) / g.hMm), fj = Math.round((c[1] - g.originMm[1]) / g.hMm), fk = Math.round((c[2] - g.originMm[2]) / g.hMm);
    for (let k = fk - 2; k <= fk + 2; k++)
      for (let j = fj - 2; j <= fj + 2; j++)
        for (let ii = fi - 2; ii <= fi + 2; ii++) {
          if (ii < 0 || j < 0 || k < 0 || ii >= nx || j >= ny || k >= nz) continue;
          const v = ii + nx * (j + ny * k);
          if (!rvBlood(v)) continue;
          const p = X.pos(v);
          if (Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > r) continue;
          L.tissue[v] = TISSUE.RV;
          L.chamber[v] = CHAMBER.RV;
          L.part[v] = PART.PapRV;
        }
  }
}

/** Contraction axes (order irrelevant; the scene maps by chamber). */
function chamberAxes(g: VoxelGrid, L: Labelled, apex: Vec3): ChamberAxis[] {
  const X = new VoxelIndex(g);
  const T = g.tissue;
  const R = L.rings;
  const radial = (pred: (v: number) => boolean, c: Vec3, a: Vec3): number => {
    let s = 0, n = 0;
    for (let v = 0; v < T.length; v++) {
      if (!pred(v)) continue;
      const d = sub(X.pos(v), c);
      const ax = d[0] * a[0] + d[1] * a[1] + d[2] * a[2];
      s += Math.hypot(d[0] - ax * a[0], d[1] - ax * a[1], d[2] - ax * a[2]);
      n++;
    }
    return n ? s / n : 20;
  };
  const out: ChamberAxis[] = [];
  // ventricles: base → apex
  {
    const base = R.MITRAL.centerMm;
    const a = normalize(sub(apex, base));
    const len = Math.hypot(...sub(apex, base));
    const c = scale(add(apex, base), 0.5);
    const epi = (v: number) => (T[v] === TISSUE.LV || T[v] === TISSUE.Septum) && g.wallDepth[v] > 0.8 && Math.abs(g.apexBase[v] - 0.5) < 0.15;
    out.push({ chamber: CHAMBER.LV, centerMm: c, axis: a, radiusMm: radial(epi, c, a), lengthMm: len });
  }
  {
    let s: Vec3 = [0, 0, 0], n = 0;
    for (let v = 0; v < T.length; v++) if (T[v] === TISSUE.RV && g.apexBase[v] < 0.05) {
      s = add(s, X.pos(v));
      n++;
    }
    const rvApex = n ? scale(s, 1 / n) : apex;
    const base = R.TRICUSPID.centerMm;
    const a = normalize(sub(rvApex, base));
    const len = Math.hypot(...sub(rvApex, base));
    const c = scale(add(rvApex, base), 0.5);
    const epi = (v: number) => T[v] === TISSUE.RV && g.wallDepth[v] > 0.6;
    out.push({ chamber: CHAMBER.RV, centerMm: c, axis: a, radiusMm: radial(epi, c, a), lengthMm: len });
  }
  // atria: AV ring → roof
  for (const [ch, tt, ring] of [[CHAMBER.LA, TISSUE.LA, R.MITRAL], [CHAMBER.RA, TISSUE.RA, R.TRICUSPID]] as const) {
    const a: Vec3 = scale(ring.normal, -1);
    let s: Vec3 = [0, 0, 0], n = 0;
    const proj: number[] = [];
    for (let v = 0; v < T.length; v++) {
      if (T[v] !== tt) continue;
      const p = X.pos(v);
      s = add(s, p);
      n++;
      proj.push((p[0] - ring.centerMm[0]) * a[0] + (p[1] - ring.centerMm[1]) * a[1] + (p[2] - ring.centerMm[2]) * a[2]);
    }
    proj.sort((x, y) => x - y);
    const c = n ? scale(s, 1 / n) : ring.centerMm;
    const len = proj.length ? proj[Math.floor(0.98 * (proj.length - 1))] - proj[Math.floor(0.02 * (proj.length - 1))] : 30;
    out.push({ chamber: ch, centerMm: c, axis: a, radiusMm: radial((v) => T[v] === tt, c, a), lengthMm: Math.max(10, len) });
  }
  return out;
}

