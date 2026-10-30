/**
 * STUB geometry for parallel UI/3D development. Crude ellipsoid heart that fills every GeometryBundle field with
 * plausible values. The real procedural heart lives in src/sim/geometry (built by the sim workstream).
 * Local frame (mm): +y apex→base, +z anterior, +x LV lateral; RV sits at −x/+z of the septum.
 */
import { buildPose } from '../frame';
import { sdCapsule, sdEllipsoid, smin } from '../geometry/sdf';
import { computeNormals, surfaceNets } from '../geometry/surfaceNets';
import type { ChamberAxis, ConductionPath, GeometryBundle, StructureId, ValveGeom, Vec3, VoxelGrid } from '../types';
import { CHAMBER, STRUCTURE_NONE, STRUCTURES, TISSUE } from '../types';

const RING_Y0 = 38, RING_Y1 = 41;
const LV_C: Vec3 = [8, 0, -4];
const RV_C: Vec3 = [-12, 6, 9];
const LA_C: Vec3 = [10, 57, -14];
const RA_C: Vec3 = [-16, 56, 5];

const lvOuter = (x: number, y: number, z: number) => sdEllipsoid(x - LV_C[0], y - LV_C[1], z - LV_C[2], 27, 46, 27);
const lvCav = (x: number, y: number, z: number) => sdEllipsoid(x - LV_C[0], y - LV_C[1] - 5, z - LV_C[2], 18, 40, 18);
const rvOuter = (x: number, y: number, z: number) => sdEllipsoid(x - RV_C[0], y - RV_C[1], z - RV_C[2], 25, 40, 24);
const rvCav = (x: number, y: number, z: number) => sdEllipsoid(x - RV_C[0] + 1, y - RV_C[1] - 3, z - RV_C[2] - 1, 21.5, 36, 20.5);
const laOuter = (x: number, y: number, z: number) => sdEllipsoid(x - LA_C[0], y - LA_C[1], z - LA_C[2], 21, 17, 19);
const laCav = (x: number, y: number, z: number) => sdEllipsoid(x - LA_C[0], y - LA_C[1], z - LA_C[2], 17.5, 13.5, 15.5);
const raOuter = (x: number, y: number, z: number) => sdEllipsoid(x - RA_C[0], y - RA_C[1], z - RA_C[2], 21, 19, 19);
const raCav = (x: number, y: number, z: number) => sdEllipsoid(x - RA_C[0], y - RA_C[1], z - RA_C[2], 17.5, 15.5, 15.5);
const aorta = (x: number, y: number, z: number) => sdCapsule(x, y, z, 2, 36, 0, -2, 98, -10, 12.5);
const pulm = (x: number, y: number, z: number) => sdCapsule(x, y, z, -12, 40, 20, -4, 86, 6, 11.5);

export function buildStubGeometry(hMm = 2): GeometryBundle {
  const lo: Vec3 = [-52, -54, -46];
  const hi: Vec3 = [48, 106, 46];
  const dims: [number, number, number] = [
    Math.ceil((hi[0] - lo[0]) / hMm) + 1,
    Math.ceil((hi[1] - lo[1]) / hMm) + 1,
    Math.ceil((hi[2] - lo[2]) / hMm) + 1,
  ];
  const [nx, ny, nz] = dims;
  const N = nx * ny * nz;
  const tissue = new Uint8Array(N);
  const chamber = new Uint8Array(N);
  const aha = new Uint8Array(N);
  const region = new Uint8Array(N).fill(STRUCTURE_NONE);
  const wallDepth = new Float32Array(N);
  const apexBase = new Float32Array(N);
  const transDir = new Float32Array(3 * N);
  const sdfMm = new Float32Array(N);
  const rid = (s: StructureId) => STRUCTURES.indexOf(s);
  const yApex = LV_C[1] - 46, yBase = RING_Y0;

  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * k);
        const x = lo[0] + i * hMm, y = lo[1] + j * hMm, z = lo[2] + k * hMm;
        const below = y < RING_Y0, above = y > RING_Y1;
        const dLvO = lvOuter(x, y, z), dLvC = lvCav(x, y, z);
        const dRvO = rvOuter(x, y, z), dRvC = rvCav(x, y, z);
        const dLaO = laOuter(x, y, z), dLaC = laCav(x, y, z);
        const dRaO = raOuter(x, y, z), dRaC = raCav(x, y, z);
        const lvWall = Math.max(dLvO, -dLvC);
        const rvWall = Math.max(Math.max(dRvO, -dRvC), -dLvO + 0.5);
        const laWall = Math.max(dLaO, -dLaC), raWall = Math.max(dRaO, -dRaC);
        const ventWall = Math.max(Math.min(lvWall, rvWall), y - RING_Y0);
        const atrWall = Math.max(Math.min(laWall, raWall), RING_Y1 - y);
        const ring = Math.max(Math.max(RING_Y0 - y, y - RING_Y1), Math.min(dLvO, dRvO, dLaO, dRaO) - 1);
        const vessel = Math.max(Math.min(aorta(x, y, z), pulm(x, y, z)), RING_Y0 - 2 - y);
        sdfMm[v] = smin(Math.min(ventWall, atrWall, ring), vessel, 3);

        let t: number = TISSUE.Out;
        if (ring < 0 && !below && !above) t = TISSUE.Ring;
        else if (below && lvWall < 0) {
          t = dRvC < 6 && x < LV_C[0] - 6 ? TISSUE.Septum : TISSUE.LV;
          chamber[v] = CHAMBER.LV;
        } else if (below && rvWall < 0) {
          t = TISSUE.RV;
          chamber[v] = CHAMBER.RV;
        } else if (above && laWall < 0) {
          t = TISSUE.LA;
          chamber[v] = CHAMBER.LA;
        } else if (above && raWall < 0) {
          t = TISSUE.RA;
          chamber[v] = CHAMBER.RA;
        } else if (vessel < 0) t = TISSUE.Vessel;
        else if (below && dLvC < 0) {
          t = TISSUE.Blood;
          chamber[v] = CHAMBER.LV;
        } else if (below && dRvC < 0) {
          t = TISSUE.Blood;
          chamber[v] = CHAMBER.RV;
        } else if (above && dLaC < 0) {
          t = TISSUE.Blood;
          chamber[v] = CHAMBER.LA;
        } else if (above && dRaC < 0) {
          t = TISSUE.Blood;
          chamber[v] = CHAMBER.RA;
        }
        tissue[v] = t;

        if (t === TISSUE.LV || t === TISSUE.Septum || t === TISSUE.RV) {
          const ab = Math.min(1, Math.max(0, (y - yApex) / (yBase - yApex)));
          apexBase[v] = ab;
          if (t === TISSUE.RV) wallDepth[v] = Math.min(1, Math.max(0, dRvC / Math.max(1e-3, dRvC - dRvO)));
          else if (t === TISSUE.Septum) wallDepth[v] = Math.min(1, Math.max(0, dLvC / Math.max(1e-3, dLvC + dRvC)));
          else wallDepth[v] = Math.min(1, Math.max(0, dLvC / Math.max(1e-3, dLvC - dLvO)));
          const ang = (Math.atan2(z - LV_C[2], -(x - LV_C[0])) * 180) / Math.PI; // 0° = septal (−x), +90° = anterior
          if (t !== TISSUE.RV) {
            const sector6 = ((Math.round((90 - ang) / 60) % 6) + 6) % 6; // 0 anterior, then anteroseptal… (approximate)
            aha[v] = ab < 0.12 ? 17 : ab < 0.4 ? 13 + (Math.round((90 - ang) / 90 + 4) % 4) : ab < 0.7 ? 7 + sector6 : 1 + sector6;
          }
          region[v] =
            t === TISSUE.Septum ? rid('SEPTUM')
            : t === TISSUE.RV ? (ab < 0.3 ? rid('RV_APEX') : ab > 0.75 && z > RV_C[2] + 6 ? rid('RVOT') : rid('RV_FREE'))
            : ab < 0.25 ? rid('LV_APEX')
            : ab > 0.75 && z < LV_C[2] - 4 ? rid('LV_POSTEROBASAL')
            : z > LV_C[2] + 10 ? rid('LV_ANTERIOR')
            : z < LV_C[2] - 10 ? rid('LV_INFERIOR')
            : rid('LV_LATERAL');
        } else if (t === TISSUE.LA || t === TISSUE.RA) {
          apexBase[v] = Math.min(1, Math.max(0, (y - RING_Y1) / 34));
          const [dO, dC] = t === TISSUE.LA ? [dLaO, dLaC] : [dRaO, dRaC];
          wallDepth[v] = Math.min(1, Math.max(0, dC / Math.max(1e-3, dC - dO)));
          region[v] = t === TISSUE.RA ? rid('RA') : x > LA_C[0] + 12 && z > LA_C[2] ? rid('LAA') : rid('LA');
        } else if (t === TISSUE.Ring) region[v] = rid('AV_RING');
      }

  // transmural direction = ∇wallDepth (central differences within myocardium)
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v = i + nx * (j + ny * k);
        if (region[v] === STRUCTURE_NONE || tissue[v] === TISSUE.Ring) continue;
        const gx = wallDepth[v + 1] - wallDepth[v - 1];
        const gy = wallDepth[v + nx] - wallDepth[v - nx];
        const gz = wallDepth[v + nx * ny] - wallDepth[v - nx * ny];
        const l = Math.hypot(gx, gy, gz) || 1;
        transDir[3 * v] = gx / l;
        transDir[3 * v + 1] = gy / l;
        transDir[3 * v + 2] = gz / l;
      }

  const grid: VoxelGrid = { dims, hMm, originMm: lo, tissue, chamber, aha, region, wallDepth, apexBase, transDir, sdfMm };
  const sn = surfaceNets(sdfMm, dims, lo, hMm);
  const normal = computeNormals(sn.position, sn.index);
  const voxel = mapVerticesToVoxels(grid, sn.position);

  const chambers: ChamberAxis[] = [
    { chamber: CHAMBER.LV, centerMm: [LV_C[0], 0, LV_C[2]], axis: [0, -1, 0], radiusMm: 27, lengthMm: 84 },
    { chamber: CHAMBER.RV, centerMm: [RV_C[0], 6, RV_C[2]], axis: [0, -1, 0], radiusMm: 24, lengthMm: 70 },
    { chamber: CHAMBER.LA, centerMm: LA_C, axis: [0, 1, 0], radiusMm: 19, lengthMm: 34 },
    { chamber: CHAMBER.RA, centerMm: RA_C, axis: [0, 1, 0], radiusMm: 19, lengthMm: 36 },
  ];
  const SA: Vec3 = [-20, 72, 10], AVN: Vec3 = [-4, 42, 2], HIS: Vec3 = [-3, 36, 2];
  const paths: ConductionPath[] = [
    { id: 'BACHMANN', pointsMm: [SA, [-6, 70, 2], [8, 68, -6], [18, 64, -10]] },
    { id: 'AVN', pointsMm: [[-10, 50, 4], AVN] },
    { id: 'HIS', pointsMm: [AVN, HIS] },
    { id: 'LBB', pointsMm: [HIS, [-1, 26, -2]] },
    { id: 'LAF', pointsMm: [[-1, 26, -2], [2, 4, 8], [8, -20, 10]] },
    { id: 'LPF', pointsMm: [[-1, 26, -2], [2, 2, -14], [8, -22, -14]] },
    { id: 'LSF', pointsMm: [[-1, 26, -2], [-2, 0, -2], [0, -24, 0]] },
    { id: 'RBB', pointsMm: [HIS, [-7, 20, 6], [-10, -4, 10], [-16, -18, 14]] },
  ];
  const valves: ValveGeom[] = [
    { id: 'MITRAL', centerMm: [10, 39.5, -8], normal: [0, -1, 0], radiusMm: 14 },
    { id: 'TRICUSPID', centerMm: [-16, 39.5, 6], normal: [0, -1, 0], radiusMm: 16 },
    { id: 'AORTIC', centerMm: [2, 40, 0], normal: [0, 1, 0], radiusMm: 11 },
    { id: 'PULMONARY', centerMm: [-12, 44, 20], normal: [0, 1, 0], radiusMm: 11 },
  ];
  const landmarks: Partial<Record<StructureId, Vec3>> = {
    SA, AVN, HIS, LA: LA_C, RA: RA_C, LV_APEX: [LV_C[0], yApex + 4, LV_C[2]], SEPTUM: [-4, 0, 2], RVOT: [-12, 34, 22],
  };
  return { grid, mesh: { position: sn.position, normal, index: sn.index, voxel }, pose: buildPose(), chambers, paths, valves, landmarks, hash: 'stub-v1' };
}

/** Nearest non-Out voxel per vertex (myocardium preferred), searching a 3-voxel neighbourhood. */
export function mapVerticesToVoxels(grid: VoxelGrid, position: Float32Array): Uint32Array {
  const [nx, ny, nz] = grid.dims;
  const out = new Uint32Array(position.length / 3);
  for (let p = 0; p < out.length; p++) {
    const fx = (position[3 * p] - grid.originMm[0]) / grid.hMm;
    const fy = (position[3 * p + 1] - grid.originMm[1]) / grid.hMm;
    const fz = (position[3 * p + 2] - grid.originMm[2]) / grid.hMm;
    let best = -1, bestD = Infinity, bestMyo = false;
    for (let dk = -2; dk <= 3; dk++)
      for (let dj = -2; dj <= 3; dj++)
        for (let di = -2; di <= 3; di++) {
          const i = Math.floor(fx) + di, j = Math.floor(fy) + dj, k = Math.floor(fz) + dk;
          if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
          const v = i + nx * (j + ny * k);
          const t = grid.tissue[v];
          if (t === TISSUE.Out || t === TISSUE.Blood) continue;
          const myo = t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum || t === TISSUE.LA || t === TISSUE.RA;
          const d = (i - fx) ** 2 + (j - fy) ** 2 + (k - fz) ** 2;
          if ((myo && !bestMyo) || (myo === bestMyo && d < bestD)) {
            best = v;
            bestD = d;
            bestMyo = myo;
          }
        }
    out[p] = best < 0 ? 0 : best;
  }
  return out;
}
