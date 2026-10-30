/**
 * Derived voxel fields of the HRA heart (contract doc comments in types.ts VoxelGrid):
 *   wallDepth  two-sided distance ratio d_endo / (d_endo + d_epi) (0 endocardium … 1 epicardium); septum d_LV / (d_LV + d_RV)
 *   transDir   unit ∇wallDepth (central differences of the same ratio, evaluated with the voxel's own formula)
 *   apexBase   ventricles: LV apex → AV plane along the long axis (RV: its own apex → tricuspid plane);
 *              atria: AV annulus → roof along the inflow axis
 *   aha        17 segments around the LV long axis, reference = anterior RV insertion (Cerqueira 2002)
 *   region     STRUCTURES index (SEPTUM, LV_*, RV_*, RVOT, RA, LA, LAA, valve annuli, AV_RING)
 *   sdfMm      signed distance to the myocardium/ring/vessel surface: exact point–triangle distance in a narrow band
 *              (spatial hash of the real triangles), sign from the voxel mask, voxel EDT where they disagree, clamped.
 * Distances are measured between voxel centres with the boundary half a voxel out (d − h/2).
 */
import type { StructureId, Vec3, VoxelGrid } from '../../types';
import { CHAMBER, STRUCTURE_NONE, STRUCTURES, TISSUE } from '../../types';
import type { Labelled } from './label';
import { PART } from './label';
import type { Mesh } from './mesh';
import { components6, edt2, forNeighbours6, pointTriDist2 } from './voxelize';

export interface FieldInputs {
  readonly L: Labelled;
  /** LV apex, local mm. */
  readonly apexMm: Vec3;
  /** Unit local direction toward the left atrial appendage (app left-anterior-superior). */
  readonly laaDir: Vec3;
  /** Triangles of every voxelized surface (walls, papillary, annulus bands, vessels), local mm. */
  readonly surfaces: readonly Mesh[];
}

export interface FieldOutputs {
  readonly grid: VoxelGrid;
  readonly info: {
    readonly anteriorInsertionDeg: number;
    readonly inferiorInsertionDeg: number;
    readonly lvCavityApexAb: number;
    readonly rvApexY: number;
    readonly septalDir: Vec3;
  };
}

export const SDF_CLAMP_MM = 7.9;
const BAND_MM = 4;

const rid = (s: StructureId) => STRUCTURES.indexOf(s);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const wrap = (a: number) => {
  let x = a % 360;
  if (x < 0) x += 360;
  return x;
};

export function deriveFields(inp: FieldInputs): FieldOutputs {
  const { L, apexMm } = inp;
  const g = L.grid;
  const [nx, ny, nz] = g.dims;
  const N = nx * ny * nz;
  const h = g.hMm;
  const o = g.originMm;
  const T = L.tissue, C = L.chamber;
  const pos = (v: number): Vec3 => [o[0] + (v % nx) * h, o[1] + (Math.floor(v / nx) % ny) * h, o[2] + Math.floor(v / (nx * ny)) * h];

  // ---------------------------------------------------------------- distance fields (mm, boundary at half a voxel)
  const dist = (pred: (v: number) => boolean): Float32Array => {
    const m = new Uint8Array(N);
    for (let v = 0; v < N; v++) m[v] = pred(v) ? 1 : 0;
    const d2 = edt2(m, g.dims, true);
    const out = new Float32Array(N);
    for (let v = 0; v < N; v++) out[v] = Math.max(0, Math.sqrt(d2[v]) * h - 0.5 * h);
    return out;
  };
  const blood = (ch: number) => (v: number) => T[v] === TISSUE.Blood && C[v] === ch;
  const dLV = dist(blood(CHAMBER.LV)), dRV = dist(blood(CHAMBER.RV)), dLA = dist(blood(CHAMBER.LA)), dRA = dist(blood(CHAMBER.RA));
  const dEpi = dist((v) => T[v] === TISSUE.Out || T[v] === TISSUE.Vessel || T[v] === TISSUE.Dead);
  const ratio = (a: number, b: number) => (a + b > 1e-6 ? a / (a + b) : 0);
  const wdAt = (t: number, w: number): number => {
    switch (t) {
      case TISSUE.LV: return ratio(dLV[w], dEpi[w]);
      case TISSUE.RV: return ratio(dRV[w], dEpi[w]);
      case TISSUE.Septum: return ratio(dLV[w], dRV[w]);
      case TISSUE.LA: return ratio(dLA[w], dEpi[w]);
      case TISSUE.RA: return ratio(dRA[w], dEpi[w]);
      default: return 0;
    }
  };
  const wallDepth = new Float32Array(N), transDir = new Float32Array(3 * N);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * k);
        const t = T[v];
        if (t < TISSUE.LV || t > TISSUE.RA) continue;
        wallDepth[v] = clamp01(wdAt(t, v));
        const gx = i > 0 && i < nx - 1 ? wdAt(t, v + 1) - wdAt(t, v - 1) : 0;
        const gy = j > 0 && j < ny - 1 ? wdAt(t, v + nx) - wdAt(t, v - nx) : 0;
        const gz = k > 0 && k < nz - 1 ? wdAt(t, v + nx * ny) - wdAt(t, v - nx * ny) : 0;
        const l = Math.hypot(gx, gy, gz);
        if (l > 1e-9) {
          transDir[3 * v] = gx / l;
          transDir[3 * v + 1] = gy / l;
          transDir[3 * v + 2] = gz / l;
        }
      }

  // ---------------------------------------------------------------- apex → base
  const R = L.rings;
  const lvBaseY = R.MITRAL.centerMm[1];
  const lvLen = Math.max(1, lvBaseY - apexMm[1]);
  const abLV = (p: Vec3) => clamp01((p[1] - apexMm[1]) / lvLen);
  const rvY: number[] = [];
  for (let v = 0; v < N; v++) if (T[v] === TISSUE.RV) rvY.push(pos(v)[1]);
  rvY.sort((a, b) => a - b);
  const rvApexY = rvY.length ? rvY[Math.floor(0.01 * (rvY.length - 1))] : apexMm[1];
  const rvLen = Math.max(1, R.TRICUSPID.centerMm[1] - rvApexY);
  // atria: projection on the inflow axis (−valve normal, i.e. ventricle → atrium), normalized by the 98th percentile
  const atrialAxis = (ch: number) => {
    const ring = ch === CHAMBER.LA ? R.MITRAL : R.TRICUSPID;
    const a: Vec3 = [-ring.normal[0], -ring.normal[1], -ring.normal[2]];
    const proj: number[] = [];
    const tt = ch === CHAMBER.LA ? TISSUE.LA : TISSUE.RA;
    for (let v = 0; v < N; v++) if (T[v] === tt) {
      const p = pos(v);
      proj.push((p[0] - ring.centerMm[0]) * a[0] + (p[1] - ring.centerMm[1]) * a[1] + (p[2] - ring.centerMm[2]) * a[2]);
    }
    proj.sort((x, y) => x - y);
    return { c: ring.centerMm, a, len: Math.max(1, proj.length ? proj[Math.floor(0.98 * (proj.length - 1))] : 1) };
  };
  const axLA = atrialAxis(CHAMBER.LA), axRA = atrialAxis(CHAMBER.RA);
  const abAtrial = (ax: ReturnType<typeof atrialAxis>, p: Vec3) => clamp01(((p[0] - ax.c[0]) * ax.a[0] + (p[1] - ax.c[1]) * ax.a[1] + (p[2] - ax.c[2]) * ax.a[2]) / ax.len);
  const apexBase = new Float32Array(N);
  for (let v = 0; v < N; v++) {
    const t = T[v];
    if (t === TISSUE.LV || t === TISSUE.Septum) apexBase[v] = abLV(pos(v));
    else if (t === TISSUE.RV) apexBase[v] = clamp01((pos(v)[1] - rvApexY) / rvLen);
    else if (t === TISSUE.LA) apexBase[v] = abAtrial(axLA, pos(v));
    else if (t === TISSUE.RA) apexBase[v] = abAtrial(axRA, pos(v));
  }

  // ---------------------------------------------------------------- AHA 17 segments
  // angle about the LV long axis (local y through the apex), 0° = +x (lateral), 90° = +z (anterior)
  const angle = (p: Vec3) => wrap((Math.atan2(p[2] - apexMm[2], p[0] - apexMm[0]) * 180) / Math.PI);
  // RV insertions: LV/septal voxels adjacent to RV tissue and within 2 voxels of the exterior, mid-ventricle
  const nearOut = new Uint8Array(N);
  for (let v = 0; v < N; v++) nearOut[v] = dEpi[v] <= 1.5 * h ? 1 : 0;
  let sx = 0, sz = 0;
  const ins: { a: number; z: number }[] = [];
  for (let v = 0; v < N; v++) {
    const t = T[v];
    if (t === TISSUE.Septum) {
      const p = pos(v);
      sx += p[0] - apexMm[0];
      sz += p[2] - apexMm[2];
    }
    if ((t !== TISSUE.Septum && t !== TISSUE.LV) || !nearOut[v]) continue;
    const ab = apexBase[v];
    if (ab < 0.25 || ab > 0.8) continue;
    let touchRV = false;
    forNeighbours6(g.dims, v, (w) => {
      if (T[w] === TISSUE.RV) touchRV = true;
    });
    if (touchRV) ins.push({ a: angle(pos(v)), z: pos(v)[2] - apexMm[2] });
  }
  const septalDeg = wrap((Math.atan2(sz, sx) * 180) / Math.PI);
  const rel = (a: number) => wrap(a - septalDeg + 180) - 180; // −180…180 relative to the septal centre
  const ant = ins.filter((q) => rel(q.a) > 0 === (rel(90) > 0)).map((q) => rel(q.a));
  const inf = ins.filter((q) => rel(q.a) > 0 !== (rel(90) > 0)).map((q) => rel(q.a));
  const median = (xs: number[], fb: number) => (xs.length ? xs.sort((a, b) => a - b)[xs.length >> 1] : fb);
  // the anterior side is the one containing +z (90°)
  const antRel = median(ant, rel(90) > 0 ? 60 : -60), infRel = median(inf, rel(90) > 0 ? -60 : 60);
  const antDeg = wrap(antRel + septalDeg), infDeg = wrap(infRel + septalDeg);
  // walking from the anterior insertion through the septum: sign of rotation
  const sgn = antRel > 0 ? -1 : 1;
  const lvBloodAb: number[] = [];
  for (let v = 0; v < N; v++) if (T[v] === TISSUE.Blood && C[v] === CHAMBER.LV) lvBloodAb.push(abLV(pos(v)));
  lvBloodAb.sort((a, b) => a - b);
  const cavApex = lvBloodAb.length ? lvBloodAb[Math.floor(0.005 * (lvBloodAb.length - 1))] : 0.1;
  const third = (1 - cavApex) / 3;
  const aha = new Uint8Array(N);
  for (let v = 0; v < N; v++) {
    const t = T[v];
    if (t !== TISSUE.LV && t !== TISSUE.Septum) continue;
    const p = pos(v);
    const ab = apexBase[v];
    const phi = wrap(sgn * (angle(p) - antDeg)); // 0 at the anterior insertion, increasing through the septum
    if (ab < cavApex) aha[v] = 17;
    else if (ab < cavApex + third) aha[v] = [14, 15, 16, 13][Math.floor(wrap(phi - 15) / 90) % 4];
    else if (ab < cavApex + 2 * third) aha[v] = [8, 9, 10, 11, 12, 7][Math.floor(phi / 60) % 6];
    else aha[v] = [2, 3, 4, 5, 6, 1][Math.floor(phi / 60) % 6];
  }

  // ---------------------------------------------------------------- regions
  const region = new Uint8Array(N).fill(STRUCTURE_NONE);
  const pul = R.PULMONARY.centerMm, tri = R.TRICUSPID.centerMm;
  const laa = findAppendage(L, inp.laaDir);
  const ringRegion: Partial<Record<number, StructureId>> = {
    [PART.RingMitral]: 'MITRAL', [PART.RingTricuspid]: 'TRICUSPID', [PART.RingAortic]: 'AORTIC', [PART.RingPulmonary]: 'PULMONARY',
  };
  const lvRegion: Record<number, StructureId> = {
    1: 'LV_ANTERIOR', 7: 'LV_ANTERIOR', 2: 'SEPTUM', 8: 'SEPTUM', 3: 'SEPTUM', 9: 'SEPTUM', 4: 'LV_POSTEROBASAL', 5: 'LV_POSTEROBASAL',
    10: 'LV_INFERIOR', 11: 'LV_LATERAL', 6: 'LV_LATERAL', 12: 'LV_LATERAL', 13: 'LV_APEX', 14: 'LV_APEX', 15: 'LV_APEX', 16: 'LV_APEX', 17: 'LV_APEX',
  };
  for (let v = 0; v < N; v++) {
    const t = T[v];
    const p = pos(v);
    if (t === TISSUE.Septum) region[v] = rid('SEPTUM');
    else if (t === TISSUE.LV) region[v] = rid(lvRegion[aha[v]] ?? 'LV_LATERAL');
    else if (t === TISSUE.RV) {
      const dp = Math.hypot(p[0] - pul[0], p[1] - pul[1], p[2] - pul[2]);
      const dt = Math.hypot(p[0] - tri[0], p[1] - tri[1], p[2] - tri[2]);
      region[v] = apexBase[v] < 0.3 ? rid('RV_APEX') : dp < dt && dp < 32 ? rid('RVOT') : rid('RV_FREE');
    } else if (t === TISSUE.LA) region[v] = laa[v] ? rid('LAA') : rid('LA');
    else if (t === TISSUE.RA) region[v] = rid('RA');
    else if (t === TISSUE.Ring) region[v] = rid(ringRegion[L.part[v]] ?? 'AV_RING');
  }

  // ---------------------------------------------------------------- signed distance
  const sdfMm = signedDistance(L, inp.surfaces);

  const grid: VoxelGrid = {
    dims: g.dims, hMm: h, originMm: [o[0], o[1], o[2]],
    tissue: T, chamber: C, aha, region, wallDepth, apexBase, transDir, sdfMm,
  };
  // septal direction (unit, local) — the RV side of the LV axis
  const sl = Math.hypot(sx, sz) || 1;
  return {
    grid,
    info: { anteriorInsertionDeg: antDeg, inferiorInsertionDeg: infDeg, lvCavityApexAb: cavApex, rvApexY, septalDir: [sx / sl, 0, sz / sl] },
  };
}

/**
 * Left atrial appendage: the LA protrusion toward `dir` (local unit vector of the app direction left-anterior-superior,
 * where the HRA appendage points): LA voxels (wall ∪ blood) within LAA_DEPTH_MM of the extreme projection, connected
 * to the extreme voxel; the mask covers the LA wall voxels of that pouch.
 */
export function findAppendage(L: Labelled, dir: Vec3): Uint8Array {
  const g = L.grid;
  const [nx, ny] = g.dims;
  const N = L.tissue.length;
  const proj = new Float32Array(N).fill(-Infinity);
  let best = -1;
  for (let v = 0; v < N; v++) {
    const t = L.tissue[v];
    if (t !== TISSUE.LA && !(t === TISSUE.Blood && L.chamber[v] === CHAMBER.LA)) continue;
    const x = g.originMm[0] + (v % nx) * g.hMm, y = g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm, z = g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm;
    proj[v] = x * dir[0] + y * dir[1] + z * dir[2];
    if (best < 0 || proj[v] > proj[best]) best = v;
  }
  const out = new Uint8Array(N);
  if (best < 0) return out;
  const cut = proj[best] - LAA_DEPTH_MM;
  const m = new Uint8Array(N);
  for (let v = 0; v < N; v++) m[v] = proj[v] >= cut ? 1 : 0;
  const { label } = components6(m, g.dims);
  for (let v = 0; v < N; v++) if (label[v] === label[best] && L.tissue[v] === TISSUE.LA) out[v] = 1;
  return out;
}

const LAA_DEPTH_MM = 16;

/** Spatial hash of triangles near the mask boundary → exact distance in a band; sign from the solid mask. */
export function signedDistance(L: Labelled, surfaces: readonly Mesh[]): Float32Array {
  const g = L.grid;
  const [nx, ny, nz] = g.dims;
  const N = nx * ny * nz;
  const h = g.hMm, o = g.originMm;
  const solid = new Uint8Array(N);
  for (let v = 0; v < N; v++) solid[v] = L.tissue[v] !== TISSUE.Out && L.tissue[v] !== TISSUE.Blood ? 1 : 0;
  // voxel distance to the opposite class, boundary half a voxel out
  const dIn = edt2(solid, g.dims, false), dOut = edt2(solid, g.dims, true);
  const dv = new Float32Array(N);
  for (let v = 0; v < N; v++) dv[v] = Math.sqrt(solid[v] ? dIn[v] : dOut[v]) * h - 0.5 * h;
  // keep only triangles within ~1 voxel of the mask boundary (buried or floating triangles would draw false outlines)
  const cell = BAND_MM;
  const hash = new Map<number, number[]>();
  const tris: number[] = [];
  const key = (a: number, b: number, c: number) => (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  for (const m of surfaces) {
    const P = m.position, I = m.index;
    for (let t = 0; t < I.length; t += 3) {
      const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
      const cx = (P[a] + P[b] + P[c]) / 3, cy = (P[a + 1] + P[b + 1] + P[c + 1]) / 3, cz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
      const i = Math.round((cx - o[0]) / h), j = Math.round((cy - o[1]) / h), k = Math.round((cz - o[2]) / h);
      if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
      if (Math.abs(dv[i + nx * (j + ny * k)]) > 1.0 * h) continue;
      const id = tris.length / 9;
      tris.push(P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], P[c], P[c + 1], P[c + 2]);
      const kk = key(Math.floor(cx / cell), Math.floor(cy / cell), Math.floor(cz / cell));
      const l = hash.get(kk);
      if (l) l.push(id);
      else hash.set(kk, [id]);
    }
  }
  const sdf = new Float32Array(N);
  const p = [0, 0, 0], A = [0, 0, 0], B = [0, 0, 0], Cc = [0, 0, 0];
  for (let v = 0; v < N; v++) {
    const sign = solid[v] ? -1 : 1;
    const vox = Math.max(0, dv[v]);
    let mag = vox;
    if (vox <= BAND_MM) {
      p[0] = o[0] + (v % nx) * h;
      p[1] = o[1] + (Math.floor(v / nx) % ny) * h;
      p[2] = o[2] + Math.floor(v / (nx * ny)) * h;
      const ci = Math.floor(p[0] / cell), cj = Math.floor(p[1] / cell), ck = Math.floor(p[2] / cell);
      let best = Infinity;
      for (let dk = -1; dk <= 1; dk++)
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const l = hash.get(key(ci + di, cj + dj, ck + dk));
            if (!l) continue;
            for (const id of l) {
              const q = 9 * id;
              A[0] = tris[q]; A[1] = tris[q + 1]; A[2] = tris[q + 2];
              B[0] = tris[q + 3]; B[1] = tris[q + 4]; B[2] = tris[q + 5];
              Cc[0] = tris[q + 6]; Cc[1] = tris[q + 7]; Cc[2] = tris[q + 8];
              const d2 = pointTriDist2(p, A, B, Cc);
              if (d2 < best) best = d2;
            }
          }
      const exact = Math.sqrt(best);
      // the edited mask (thickening, ring insertion, caps) may disagree with the raw surface: trust the voxel distance
      // when the two differ by more than a voxel
      if (Number.isFinite(exact) && Math.abs(exact - vox) <= h) mag = exact;
    }
    sdf[v] = sign * Math.min(SDF_CLAMP_MM, mag);
  }
  return sdf;
}
