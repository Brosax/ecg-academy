/**
 * Per-voxel anatomy fields derived from the voxelised heart (anatomical frame A):
 *   - LV / RV / septum and LA / RA split from cavity distance transforms (robust at fillets and insertions),
 *   - insulation safety net (no atrial voxel within 2.5 voxels of ventricular myocardium),
 *   - wallDepth (two-sided distance), transDir (= ∇wallDepth), apexBase, AHA 17 segments, region labels.
 * Hot loops use module-local constants (see grid.ts on imported bindings under Vitest).
 */
import type { StructureId, Vec3 } from '../types';
import { CHAMBER, STRUCTURE_NONE, STRUCTURES, TISSUE } from '../types';
import type { HeartLayout } from './chambers';
import type { Box } from './edt';
import { Edt } from './edt';
import type { VoxelData } from './grid';
import { PART } from './grid';

const T_OUT = TISSUE.Out, T_BLOOD = TISSUE.Blood, T_LV = TISSUE.LV, T_RV = TISSUE.RV, T_SEP = TISSUE.Septum;
const T_LA = TISSUE.LA, T_RA = TISSUE.RA, T_RING = TISSUE.Ring;
const C_NONE = CHAMBER.None, C_LV = CHAMBER.LV, C_RV = CHAMBER.RV, C_LA = CHAMBER.LA, C_RA = CHAMBER.RA;
const P_BAND = PART.Band, P_LAA = PART.LAA, P_RAA = PART.RAA, P_PVSLEEVE = PART.PVSleeve, P_OUTFLOW = PART.Outflow;
const NONE = STRUCTURE_NONE;

/** Distances (voxel units) to each cavity and to the outside (Out or vessel lumen); Infinity where not needed. */
export interface CavityDistances {
  readonly lv: Float32Array;
  readonly rv: Float32Array;
  readonly la: Float32Array;
  readonly ra: Float32Array;
  readonly out: Float32Array;
}

/** Margin (voxels) around each cavity's box within which its distance is computed (walls + septum ≤ 11 mm). */
const EDT_MARGIN = 8;

export function cavityDistances(vox: VoxelData): CavityDistances {
  const [nx, ny, nz] = vox.dims;
  const N = nx * ny * nz;
  const { tissue, chamber } = vox;
  const mLv = new Uint8Array(N), mRv = new Uint8Array(N), mLa = new Uint8Array(N), mRa = new Uint8Array(N);
  const mOut = new Uint8Array(N);
  // boxes: cavities (+ margin) and myocardium (+ margin, for the outside distance)
  const bb = [mLv, mRv, mLa, mRa, mOut].map(() => [nx, ny, nz, -1, -1, -1]);
  const grow = (b: number[], i: number, j: number, k: number) => {
    if (i < b[0]) b[0] = i;
    if (j < b[1]) b[1] = j;
    if (k < b[2]) b[2] = k;
    if (i > b[3]) b[3] = i;
    if (j > b[4]) b[4] = j;
    if (k > b[5]) b[5] = k;
  };
  for (let k = 0, v = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, v++) {
        const t = tissue[v];
        if (t === T_BLOOD) {
          const c = chamber[v];
          if (c === C_LV) { mLv[v] = 1; grow(bb[0], i, j, k); }
          else if (c === C_RV) { mRv[v] = 1; grow(bb[1], i, j, k); }
          else if (c === C_LA) { mLa[v] = 1; grow(bb[2], i, j, k); }
          else if (c === C_RA) { mRa[v] = 1; grow(bb[3], i, j, k); }
          else mOut[v] = 1;
        } else if (t === T_OUT) mOut[v] = 1;
        else if (t === T_LV || t === T_LA) grow(bb[4], i, j, k);
      }
  const box = (b: number[]): Box => [
    Math.max(0, b[0] - EDT_MARGIN), Math.max(0, b[1] - EDT_MARGIN), Math.max(0, b[2] - EDT_MARGIN),
    Math.min(nx - 1, b[3] + EDT_MARGIN), Math.min(ny - 1, b[4] + EDT_MARGIN), Math.min(nz - 1, b[5] + EDT_MARGIN),
  ];
  const edt = new Edt(vox.dims);
  const lv = new Float32Array(N), rv = new Float32Array(N), la = new Float32Array(N), ra = new Float32Array(N);
  const out = new Float32Array(N);
  edt.run(mLv, lv, box(bb[0]));
  edt.run(mRv, rv, box(bb[1]));
  edt.run(mLa, la, box(bb[2]));
  edt.run(mRa, ra, box(bb[3]));
  edt.run(mOut, out, box(bb[4]));
  return { lv, rv, la, ra, out };
}

/** Max radial march (mm) when testing whether a ventricular voxel lies between the two cavities. */
const SEPTUM_MARCH_MM = 20;

/**
 * Final myocardial labels.
 * Ventricular voxel: SEPTUM iff it is "LV tissue between the cavities" — along the horizontal radial line through the
 * LV axis, the first non-myocardium inward is LV blood and the first outward is RV blood. This matches the RV insertion
 * points (cavity tips) that reference the AHA sectors; distance rules alone would extend the septum under the RV
 * free-wall junction. Otherwise the chamber of the nearer cavity (moderator band / papillary muscle always RV).
 * Atrial voxel: chamber of the nearer cavity.
 */
export function splitChambers(vox: VoxelData, d: CavityDistances): void {
  const { tissue, chamber, part } = vox;
  const [nx, ny, nz] = vox.dims;
  const h = vox.h, o = vox.originA;
  const dlv = d.lv, drv = d.rv, dla = d.la, dra = d.ra;
  const chamberIs = (v: number) => {
    // first non-ventricular voxel along the march: LV blood → 1, RV blood → 2, else 0; −1 to continue
    const t = tissue[v];
    if (t === T_LV) return -1;
    if (t === T_BLOOD) return chamber[v] === C_LV ? 1 : chamber[v] === C_RV ? 2 : 0;
    return 0;
  };
  const march = (x: number, y: number, z: number, ux: number, uz: number): number => {
    const j = Math.round((y - o[1]) / h);
    for (let s = 0.5 * h; s <= SEPTUM_MARCH_MM; s += 0.5 * h) {
      const i = Math.round((x + ux * s - o[0]) / h), k = Math.round((z + uz * s - o[2]) / h);
      if (i < 0 || k < 0 || i >= nx || k >= nz) return 0;
      const r = chamberIs(i + nx * (j + ny * k));
      if (r >= 0) return r;
    }
    return 0;
  };
  const isSeptal = (v: number): boolean => {
    const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
    const x = o[0] + i * h, y = o[1] + j * h, z = o[2] + k * h;
    const r = Math.sqrt(x * x + z * z);
    if (r < 1e-6) return false;
    const ux = x / r, uz = z / r;
    return march(x, y, z, -ux, -uz) === 1 && march(x, y, z, ux, uz) === 2;
  };
  // pass 1 decides septum on the provisional labels (all ventricular voxels are still T_LV)
  const sept = new Uint8Array(tissue.length);
  for (let v = 0; v < tissue.length; v++)
    if (tissue[v] === T_LV && part[v] !== P_BAND && drv[v] < SEPTUM_MARCH_MM / h && isSeptal(v)) sept[v] = 1;
  for (let v = 0; v < tissue.length; v++) {
    const t = tissue[v];
    if (t === T_LV) {
      const dl = dlv[v], dr = drv[v];
      if (part[v] === P_BAND) {
        tissue[v] = T_RV;
        chamber[v] = C_RV;
      } else if (sept[v]) {
        tissue[v] = T_SEP;
        chamber[v] = C_LV;
      } else if (dl <= dr) {
        tissue[v] = T_LV;
        chamber[v] = C_LV;
      } else {
        tissue[v] = T_RV;
        chamber[v] = C_RV;
      }
    } else if (t === T_LA) {
      const p = part[v];
      const isLa = p === P_LAA || p === P_PVSLEEVE ? true : p === P_RAA ? false : dla[v] <= dra[v];
      tissue[v] = isLa ? T_LA : T_RA;
      chamber[v] = isLa ? C_LA : C_RA;
    }
  }
}

/**
 * Electrical insulation safety net: atrial voxels closer than 2.5 voxels to ventricular myocardium become fibrous
 * ring, so atrial and ventricular myocardium can never touch (the His bundle is the only AV connection).
 * Returns the number of relabelled voxels (0 for the default anatomy).
 */
export function insulateAtria(vox: VoxelData): number {
  const [nx, ny, nz] = vox.dims;
  const { tissue, chamber } = vox;
  const offs: number[] = [];
  const R = 2;
  for (let dk = -R; dk <= R; dk++)
    for (let dj = -R; dj <= R; dj++)
      for (let di = -R; di <= R; di++) if (di * di + dj * dj + dk * dk < 6.25) offs.push(di + nx * (dj + ny * dk));
  const flip: number[] = [];
  for (let k = R; k < nz - R; k++)
    for (let j = R; j < ny - R; j++)
      for (let i = R; i < nx - R; i++) {
        const v = i + nx * (j + ny * k);
        const t = tissue[v];
        if (t !== T_LA && t !== T_RA) continue;
        for (let o = 0; o < offs.length; o++) {
          const tu = tissue[v + offs[o]];
          if (tu === T_LV || tu === T_RV || tu === T_SEP) {
            flip.push(v);
            break;
          }
        }
      }
  for (const v of flip) {
    tissue[v] = T_RING;
    chamber[v] = C_NONE;
  }
  return flip.length;
}

export interface WallFields {
  readonly wallDepth: Float32Array;
  readonly apexBase: Float32Array;
  readonly transDir: Float32Array;
}

export function wallFields(vox: VoxelData, d: CavityDistances, L: HeartLayout): WallFields {
  const [nx, ny, nz] = vox.dims;
  const N = nx * ny * nz;
  const { tissue, chamber } = vox;
  const wallDepth = new Float32Array(N);
  const apexBase = new Float32Array(N);
  const transDir = new Float32Array(3 * N);
  const h = vox.h;
  const yApex = L.yApexEpi, yV = L.yV, yA = L.yA;
  // Roof = top of the atrial dome, clamped to the highest voxel layer of that atrium (so the roof value is 1).
  let laTop = -Infinity, raTop = -Infinity;
  for (let k = 0, v = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, v++) {
        const t = tissue[v];
        if (t === T_LA) laTop = Math.max(laTop, j);
        else if (t === T_RA) raTop = Math.max(raTop, j);
      }
  const top = (jTop: number) => vox.originA[1] + jTop * h;
  const laRoof = Math.min(L.laCenter[1] + L.laSemi[1] + L.p.atrialWallMm, top(laTop));
  const raRoof = Math.min(L.raCenter[1] + L.raSemi[1] + L.p.atrialWallMm, top(raTop));
  const sx = 1, sy = nx, sz = nx * ny;
  const dlv = d.lv, drv = d.rv, dla = d.la, dra = d.ra, dout = d.out;

  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++) {
      const y = vox.originA[1] + j * h;
      const abV = Math.min(1, Math.max(0, (y - yApex) / (yV - yApex)));
      const abLA = Math.min(1, Math.max(0, (y - yA) / (laRoof - yA)));
      const abRA = Math.min(1, Math.max(0, (y - yA) / (raRoof - yA)));
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * k);
        const t = tissue[v];
        if (t === T_OUT) continue;
        const c = chamber[v];
        if (t === T_RING) { apexBase[v] = 1; continue; }
        if (c === C_LV || c === C_RV) apexBase[v] = abV;
        else if (c === C_LA) apexBase[v] = abLA;
        else if (c === C_RA) apexBase[v] = abRA;
        if (t === T_BLOOD || c === C_NONE) continue;
        // Endocardial (E) and epicardial (P, P2: min of both) distances. Septum: LV side → RV side. LV free wall: its
        // epicardial side is the outside (or the RV cavity — equal at the septal boundary, so wallDepth is continuous).
        // Atria: own cavity → outside or the other atrium (interatrial septum).
        let E: Float32Array, P: Float32Array, P2: Float32Array;
        if (t === T_SEP) { E = dlv; P = drv; P2 = drv; }
        else if (t === T_LV) { E = dlv; P = dout; P2 = drv; }
        else if (t === T_RV) { E = drv; P = dout; P2 = dout; }
        else if (t === T_LA) { E = dla; P = dout; P2 = dra; }
        else { E = dra; P = dout; P2 = dla; }
        const e = E[v], p = Math.min(P[v], P2[v]);
        if (!(e < Infinity) || !(p < Infinity)) {
          // outside a distance crop box (never for the default anatomy): neutral depth, radial-ish direction
          wallDepth[v] = 0.5;
          transDir[3 * v + 1] = 1;
          continue;
        }
        const w = (e - 0.5) / Math.max(1e-6, e + p - 1);
        wallDepth[v] = w < 0 ? 0 : w > 1 ? 1 : w;
        if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) continue;
        // ∇w ∝ p·∇e − e·∇p (quotient rule), central differences on the (everywhere-defined) distance fields
        const gex = E[v + sx] - E[v - sx], gey = E[v + sy] - E[v - sy], gez = E[v + sz] - E[v - sz];
        const gpx = Math.min(P[v + sx], P2[v + sx]) - Math.min(P[v - sx], P2[v - sx]);
        const gpy = Math.min(P[v + sy], P2[v + sy]) - Math.min(P[v - sy], P2[v - sy]);
        const gpz = Math.min(P[v + sz], P2[v + sz]) - Math.min(P[v - sz], P2[v - sz]);
        let gx = p * gex - e * gpx, gy = p * gey - e * gpy, gz = p * gez - e * gpz;
        let l = Math.sqrt(gx * gx + gy * gy + gz * gz);
        if (!(l > 1e-6) || !Number.isFinite(l)) {
          gx = Number.isFinite(gex) ? gex : 0; gy = Number.isFinite(gey) ? gey : 0; gz = Number.isFinite(gez) ? gez : 0;
          l = Math.sqrt(gx * gx + gy * gy + gz * gz);
          if (!(l > 1e-6)) { gx = 0; gy = 1; gz = 0; l = 1; }
        }
        transDir[3 * v] = gx / l;
        transDir[3 * v + 1] = gy / l;
        transDir[3 * v + 2] = gz / l;
      }
    }
  return { wallDepth, apexBase, transDir };
}

/**
 * Anterior / inferior RV insertion angles (deg, atan2(z, x) about the LV axis): ends of the arc where RV cavity lies
 * just outside the LV epicardium at mid-ventricular height. The anterior one is the reference of the AHA sectors.
 */
export function rvInsertionDeg(vox: VoxelData, L: HeartLayout): { anterior: number; inferior: number } {
  const f = vox.field;
  const y = 0.5 * (L.yApexEndo + L.yV);
  const r = L.lvRcE * Math.sqrt(1 - ((y - L.lvCenterY) / L.lvLcE) ** 2) + 1.5;
  const n = 720;
  const hit = new Uint8Array(n);
  for (let s = 0; s < n; s++) {
    const a = (s / n) * 2 * Math.PI;
    f.sample(r * Math.cos(a), y, r * Math.sin(a));
    hit[s] = f.tissue === T_BLOOD && f.chamber === C_RV ? 1 : 0;
  }
  let best = 0, bestStart = 0;
  for (let s = 0; s < n; s++) {
    if (!hit[s] || hit[(s + n - 1) % n]) continue;
    let len = 0;
    while (len < n && hit[(s + len) % n]) len++;
    if (len > best) { best = len; bestStart = s; }
  }
  if (best === 0) throw new Error('heart geometry: no RV cavity around the LV at mid level');
  const anterior = (bestStart / n) * 360;
  return { anterior, inferior: anterior + (best / n) * 360 };
}

export interface Segmentation {
  readonly aha: Uint8Array;
  readonly region: Uint8Array;
  /** y (frame A) of the apical-cap boundary and of the apical/mid and mid/basal boundaries. */
  readonly levels: readonly [number, number, number];
}

const rid = (s: StructureId) => STRUCTURES.indexOf(s);
/** Apical 90° sectors starting at (insertion + 15°): septal, inferior, lateral, anterior. */
const APICAL = [14, 15, 16, 13] as const;

/**
 * AHA 17 segments (Cerqueira 2002): apical cap (17) = apex beyond the cavity tip; the rest of the LV split into equal
 * basal / mid / apical thirds; basal & mid in six 60° sectors, apical in four 90° sectors, all measured from the
 * anterior RV insertion (boundary 1|2) going through the septum.
 */
export function segment(vox: VoxelData, L: HeartLayout, w: WallFields, insertionDeg: number): Segmentation {
  const [nx, ny, nz] = vox.dims;
  const N = nx * ny * nz;
  const { tissue, part } = vox;
  const aha = new Uint8Array(N);
  const region = new Uint8Array(N).fill(NONE);
  const h = vox.h;
  // Cap: myocardium apical to the cavity tip plus a thin rim (≈ AHA "true apex").
  const yCap = L.yApexEndo + 0.07 * (L.yV - L.yApexEndo);
  const third = (L.yV - yCap) / 3;
  const yApMid = yCap + third, yMidBase = yCap + 2 * third;
  const ab = w.apexBase;
  let rvMinAb = 1;
  for (let v = 0; v < N; v++) if (tissue[v] === T_RV && ab[v] < rvMinAb) rvMinAb = ab[v];
  const rvApexAb = rvMinAb + (1 - rvMinAb) / 3;
  const ANT = rid('LV_ANTERIOR'), INF = rid('LV_INFERIOR'), LAT = rid('LV_LATERAL'), PB = rid('LV_POSTEROBASAL');
  const LVAPEX = rid('LV_APEX'), SEP = rid('SEPTUM'), RVOT = rid('RVOT'), RVAPEX = rid('RV_APEX'), RVFREE = rid('RV_FREE');
  const LA = rid('LA'), LAA = rid('LAA'), RA = rid('RA'), RING = rid('AV_RING');
  const byAha = [NONE, ANT, ANT, INF, INF, PB, LAT, ANT, ANT, INF, INF, LAT, LAT, ANT, ANT, INF, LAT, LVAPEX];
  const toDeg = 180 / Math.PI;

  for (let k = 0; k < nz; k++) {
    const z = vox.originA[2] + k * h;
    for (let j = 0; j < ny; j++) {
      const y = vox.originA[1] + j * h;
      for (let i = 0; i < nx; i++) {
        const v = i + nx * (j + ny * k);
        const t = tissue[v];
        if (t === T_LV || t === T_SEP) {
          const x = vox.originA[0] + i * h;
          let dlt = Math.atan2(z, x) * toDeg - insertionDeg;
          dlt = ((dlt % 360) + 360) % 360;
          let s: number;
          if (y < yCap) s = 17;
          else if (y < yApMid) s = APICAL[Math.floor(((dlt + 345) % 360) / 90)];
          else {
            const sec = ((1 + Math.floor(dlt / 60)) % 6) + 1; // 1..6
            s = y < yMidBase ? sec + 6 : sec;
          }
          aha[v] = s;
          region[v] = t === T_SEP ? SEP : byAha[s];
        } else if (t === T_RV) region[v] = part[v] === P_OUTFLOW ? RVOT : ab[v] < rvApexAb ? RVAPEX : RVFREE;
        else if (t === T_LA) region[v] = part[v] === P_LAA ? LAA : LA;
        else if (t === T_RA) region[v] = RA;
        else if (t === T_RING) region[v] = RING;
      }
    }
  }
  return { aha, region, levels: [yCap, yApMid, yMidBase] };
}

/** Centroid (frame A) of voxels where pred(v) holds. */
export function centroidA(vox: VoxelData, pred: (v: number) => boolean): Vec3 {
  const [nx, ny, nz] = vox.dims;
  let sx = 0, sy = 0, sz = 0, n = 0;
  for (let k = 0, v = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, v++) {
        if (!pred(v)) continue;
        sx += i; sy += j; sz += k; n++;
      }
  const h = vox.h, o = vox.originA;
  return n ? [o[0] + (h * sx) / n, o[1] + (h * sy) / n, o[2] + (h * sz) / n] : [NaN, NaN, NaN];
}
