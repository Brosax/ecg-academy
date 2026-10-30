/**
 * Bake-time voxel labelling of the HRA heart in a given frame (body mm → frame axes R, origin o):
 *   tissue (TISSUE codes) and chamber (CHAMBER codes) on a regular grid of spacing h, plus the valve annulus geometry.
 *
 * Order (see the plan "变更记录 2026-10-08"):
 *   1. per-part inside masks (ray parity, 3-axis majority vote; open meshes hole-capped first)
 *   2. myocardium by priority Septum > LV > RV > LA > RA; papillary muscles → their ventricle's tissue
 *   3. valve annulus bands (valve-mesh vertices within ANNULUS_MM of a wall / its great vessel) → Ring; the leaflet
 *      bodies are not voxelized (the app animates its own leaflets from ValveGeom)
 *   4. cardiac vessels (great vessels, coronary arteries, cardiac veins) → Vessel where nothing else is
 *   5. orifice caps (a digital disk on each valve annulus plane) as temporary barriers; flood fill from the grid
 *      boundary; enclosed non-tissue voxels are blood; the cavity component reached from each cap side names the chamber
 *   6. clean-up: septal sandwich voxels → Septum, islands removed, walls thickened outward to ≥ 2 voxels, Ring inserted
 *      wherever an atrial voxel touches a ventricular one (electrical isolation; the His bundle is the only connection)
 */
import type { Mat3, ValveId, Vec3 } from '../../types';
import { CHAMBER, TISSUE, VALVES } from '../../types';
import { dot, normalize, scale, sub } from '../../frame';
import type { Mesh } from './mesh';
import { filterTriangles, pca, transformMesh } from './mesh';
import type { HraSource } from './source';
import type { GridSpec } from './voxelize';
import { closeMask, components6, edt2, floodFromBoundary, forNeighbours6, insideMask, removeIslands, shellMask } from './voxelize';

export interface Frame {
  /** Columns = frame axes expressed in the body frame. */
  readonly R: Mat3;
  /** Frame origin, body mm. */
  readonly o: Vec3;
}

export const ANNULUS_MM = 3;
/** Surface shell radius (× h) added to every part mask. */
const SHELL = 0.55;
/** Approximate lumen radius (mm) of the vessels that plug chamber openings; smaller vessels are solid already. */
const LUMEN_MM: Readonly<Record<string, number>> = {
  AORTA: 15, PULMONARY_TRUNK: 15, SVC: 12, IVC: 14, PV_RI: 9, PV_RS: 9, PV_LI: 9, PV_LS: 9, CORONARY_SINUS: 6,
};
/** Closing radius (voxels) of the flood barrier: seals gaps between parts of different models. */
const BARRIER_CLOSE_VOX = 3;
/** Closing radius (voxels) separating the cavity cores (chambers touching through millimetre gaps). */
const CORE_CLOSE_VOX = 2;

export interface ValveRing {
  readonly id: ValveId;
  readonly centerMm: Vec3;
  /** Forward-flow unit normal (AV valves: atrium → ventricle; semilunar: ventricle → artery). */
  readonly normal: Vec3;
  readonly radiusMm: number;
  /** Annulus band triangles (frame mm) — rendered as part of the heart and voxelized as Ring. */
  readonly band: Mesh;
}

export interface Labelled {
  readonly grid: GridSpec;
  readonly tissue: Uint8Array;
  readonly chamber: Uint8Array;
  /** Part provenance per voxel (PART codes) — used by the field / region code (papillary, annulus of which valve…). */
  readonly part: Uint8Array;
  readonly rings: Readonly<Record<ValveId, ValveRing>>;
  /** Meshes in the frame (render + analysis). */
  readonly meshes: {
    readonly walls: Readonly<Record<keyof HraSource['walls'], Mesh>>;
    readonly papillary: readonly { readonly key: string; readonly chamber: number; readonly mesh: Mesh }[];
    readonly vessels: readonly { readonly id: string; readonly mesh: Mesh }[];
  };
  readonly stats: Record<string, number | string>;
  /** Flood-filled exterior (debug). */
  readonly outside: Uint8Array;
  /** Cavity component label per voxel before cap conversion (debug). */
  readonly cavityLabel: Int32Array;
}

/** Voxel provenance codes. */
export const PART = {
  None: 0, LV: 1, RV: 2, Septum: 3, LA: 4, RA: 5,
  PapRV: 6, PapLV: 7,
  RingMitral: 8, RingTricuspid: 9, RingAortic: 10, RingPulmonary: 11, RingInserted: 12,
  Vessel: 13, Cap: 14, Thickened: 15,
} as const;

const RING_PART: Record<ValveId, number> = { MITRAL: PART.RingMitral, TRICUSPID: PART.RingTricuspid, AORTIC: PART.RingAortic, PULMONARY: PART.RingPulmonary };

export function labelHeart(src: HraSource, frame: Frame, hMm: number, marginVox = 4): Labelled {
  const tf = (m: Mesh) => transformMesh(m, frame.R, frame.o);
  const walls = Object.fromEntries(Object.entries(src.walls).map(([k, m]) => [k, tf(m)])) as Record<keyof HraSource['walls'], Mesh>;
  const papillary = src.papillary.map((p) => ({ key: p.key, chamber: p.chamber, mesh: tf(p.mesh) }));
  const valves = Object.fromEntries(VALVES.map((v) => [v, tf(src.valves[v])])) as Record<ValveId, Mesh>;
  const vessels = src.vessels.map((v) => ({ id: v.spec.id, kind: v.spec.kind, mesh: tf(v.mesh) }));

  // ---------------------------------------------------------------- grid: tight bbox of the heart parts + margin
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const m of [...Object.values(walls), ...Object.values(valves), ...papillary.map((p) => p.mesh)])
    for (let i = 0; i < m.position.length; i += 3)
      for (let d = 0; d < 3; d++) {
        lo[d] = Math.min(lo[d], m.position[i + d]);
        hi[d] = Math.max(hi[d], m.position[i + d]);
      }
  const origin: [number, number, number] = [0, 1, 2].map((d) => Math.floor(lo[d] / hMm - marginVox) * hMm) as [number, number, number];
  const dims = [0, 1, 2].map((d) => Math.ceil((hi[d] - origin[d]) / hMm) + marginVox + 1) as [number, number, number];
  const grid: GridSpec = { dims, hMm, originMm: origin };
  const [nx, ny, nz] = dims;
  const N = nx * ny * nz;
  const vidx = (p: ArrayLike<number>, o = 0) => {
    const i = Math.round((p[o] - origin[0]) / hMm), j = Math.round((p[o + 1] - origin[1]) / hMm), k = Math.round((p[o + 2] - origin[2]) / hMm);
    return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : i + nx * (j + ny * k);
  };
  const center = (v: number): Vec3 => [origin[0] + (v % nx) * hMm, origin[1] + (Math.floor(v / nx) % ny) * hMm, origin[2] + Math.floor(v / (nx * ny)) * hMm];

  // ---------------------------------------------------------------- 1. part masks
  // walls: parity ∪ a thin surface shell (radius > h/2 blocks every 6-connected crossing, so thin or broken walls such
  // as the HRA right atrium stay tight)
  const solidOf = (m: Mesh) => {
    const a = insideMask(m, grid);
    const sh = shellMask(m, grid, SHELL * hMm);
    for (let q = 0; q < N; q++) a[q] |= sh[q];
    return a;
  };
  const mask = { LV: solidOf(walls.LV), RV: solidOf(walls.RV), SEPTUM: solidOf(walls.SEPTUM), LA: solidOf(walls.LA), RA: solidOf(walls.RA) };
  const papMask = papillary.map((p) => insideMask(p.mesh, grid));
  const inGrid = (m: Mesh) => {
    for (let i = 0; i < m.position.length; i += 3) if (vidx(m.position, i) >= 0) return true;
    return false;
  };
  const vesselMask = vessels.map((v) => {
    if (!inGrid(v.mesh)) return null;
    // the HRA vessels are thin hollow tube walls: parity alone leaves gaps, the surface shell makes them tight
    const wall = solidOf(v.mesh);
    // the HRA vessels are hollow tube walls: a closing with a ball wider than the lumen makes them solid plugs
    const r = LUMEN_MM[v.id];
    return r ? closeMask(wall, dims, Math.ceil(r / hMm) + 1) : wall;
  });

  // ---------------------------------------------------------------- 2. myocardium
  const tissue = new Uint8Array(N), chamber = new Uint8Array(N), part = new Uint8Array(N);
  const order: [keyof typeof mask, number, number][] = [
    ['RA', TISSUE.RA, PART.RA], ['LA', TISSUE.LA, PART.LA], ['RV', TISSUE.RV, PART.RV], ['LV', TISSUE.LV, PART.LV], ['SEPTUM', TISSUE.Septum, PART.Septum],
  ];
  for (const [k, t, p] of order) {
    const m = mask[k];
    for (let v = 0; v < N; v++) if (m[v]) {
      tissue[v] = t;
      part[v] = p;
    }
  }
  papillary.forEach((p, i) => {
    const m = papMask[i];
    const t = p.chamber === CHAMBER.LV ? TISSUE.LV : TISSUE.RV;
    for (let v = 0; v < N; v++) if (m[v] && tissue[v] === TISSUE.Out) {
      tissue[v] = t;
      part[v] = p.chamber === CHAMBER.LV ? PART.PapLV : PART.PapRV;
    }
  });

  // ---------------------------------------------------------------- 3. annulus bands → Ring
  // The valve meshes are leaflet funnels. The annulus = valve vertices near BOTH sides of the valve (atrium and
  // ventricle for AV valves, ventricle and artery for semilunar ones), then restricted to a slab around its PCA plane.
  const maskOf = (pred: (t: number, p: number) => boolean) => {
    const m = new Uint8Array(N);
    for (let v = 0; v < N; v++) m[v] = pred(tissue[v], part[v]) ? 1 : 0;
    return m;
  };
  const vesselId = (id: string) => vessels.findIndex((x) => x.id === id);
  const d2Of = (m: Uint8Array | null) => (m ? edt2(m, dims, true) : null);
  const dLA = d2Of(mask.LA), dRA = d2Of(mask.RA);
  const dLVs = d2Of(maskOf((t) => t === TISSUE.LV || t === TISSUE.Septum));
  const dRVs = d2Of(maskOf((t) => t === TISSUE.RV || t === TISSUE.Septum));
  const dAorta = d2Of(vesselMask[vesselId('AORTA')]), dPT = d2Of(vesselMask[vesselId('PULMONARY_TRUNK')]);
  const sides: Record<ValveId, readonly [Float64Array | null, Float64Array | null]> = {
    MITRAL: [dLA, dLVs], TRICUSPID: [dRA, dRVs], AORTIC: [dLVs, dAorta], PULMONARY: [dRVs, dPT],
  };
  const distTo = (d2: Float64Array | null, p: ArrayLike<number>, o: number) => {
    const v = vidx(p, o);
    return !d2 || v < 0 ? Infinity : Math.sqrt(d2[v]) * hMm;
  };
  const rings = {} as Record<ValveId, ValveRing>;
  for (const id of VALVES) rings[id] = { id, centerMm: [0, 0, 0], normal: [0, 1, 0], radiusMm: 0, band: { position: new Float64Array(0), index: new Uint32Array(0) } };
  for (const id of ['MITRAL', 'TRICUSPID'] as const) {
    const m = valves[id];
    const nv = m.position.length / 3;
    const isRing = new Uint8Array(nv);
    const [dA, dB] = sides[id];
    for (let i = 0; i < nv; i++) if (distTo(dA, m.position, 3 * i) <= ANNULUS_MM + 1 && distTo(dB, m.position, 3 * i) <= ANNULUS_MM + 2) isRing[i] = 1;
    // slab around the annulus plane (twice: the first plane is biased by leaflet bits lying against a wall)
    for (let it = 0; it < 2; it++) {
      const pts: number[] = [];
      for (let i = 0; i < nv; i++) if (isRing[i]) pts.push(m.position[3 * i], m.position[3 * i + 1], m.position[3 * i + 2]);
      if (pts.length < 9) break;
      const e = pca(pts);
      const n = e.vectors[0];
      for (let i = 0; i < nv; i++) {
        if (!isRing[i]) continue;
        const ax = (m.position[3 * i] - e.centroid[0]) * n[0] + (m.position[3 * i + 1] - e.centroid[1]) * n[1] + (m.position[3 * i + 2] - e.centroid[2]) * n[2];
        if (Math.abs(ax) > 6 - it) isRing[i] = 0;
      }
    }
    const band = filterTriangles(m, (x, y, z) => isRing[x] === 1 && isRing[y] === 1 && isRing[z] === 1);
    const e = pca(band.position);
    let n = e.vectors[0];
    // AV valves: the leaflets hang downstream (into the ventricle) of the annulus
    if (dot(n, sub(pca(m.position).centroid, e.centroid)) < 0) n = scale(n, -1);
    rings[id] = { id, centerMm: e.centroid, normal: normalize(n), radiusMm: meanRadius(band.position, e.centroid, n), band };
  }
  // semilunar valves (root sleeve + cusps): normal = direction of the artery leaving the valve; band = the radially
  // outer part (root wall / cusp attachments); annulus = its most upstream 4 mm.
  for (const id of ['AORTIC', 'PULMONARY'] as const) {
    const vm = vesselMask[vesselId(id === 'AORTIC' ? 'AORTA' : 'PULMONARY_TRUNK')];
    const m = valves[id];
    const c0 = pca(m.position).centroid;
    let n: Vec3 = rings[id].normal;
    if (vm) {
      const ps: Vec3[] = [];
      for (let v = 0; v < N; v++) {
        if (!vm[v]) continue;
        const p = center(v);
        const d = Math.hypot(p[0] - c0[0], p[1] - c0[1], p[2] - c0[2]);
        if (d >= 8 && d <= 24) ps.push(p);
      }
      if (ps.length) n = normalize(sub(centroidOf(ps), c0));
    }
    const nv = m.position.length / 3;
    const ax = new Float64Array(nv), rad = new Float64Array(nv);
    for (let i = 0; i < nv; i++) {
      const d: Vec3 = [m.position[3 * i] - c0[0], m.position[3 * i + 1] - c0[1], m.position[3 * i + 2] - c0[2]];
      ax[i] = dot(d, n);
      rad[i] = Math.hypot(d[0] - ax[i] * n[0], d[1] - ax[i] * n[1], d[2] - ax[i] * n[2]);
    }
    const rs = Array.from(rad).sort((x, y) => x - y);
    const rCut = 0.72 * rs[Math.floor(0.95 * (nv - 1))];
    let aMin = Infinity;
    for (let i = 0; i < nv; i++) if (rad[i] >= rCut) aMin = Math.min(aMin, ax[i]);
    const band = filterTriangles(m, (x, y, z) => rad[x] >= rCut && rad[y] >= rCut && rad[z] >= rCut);
    const basal: Vec3[] = [];
    for (let i = 0; i < nv; i++) if (rad[i] >= rCut && ax[i] <= aMin + 4) basal.push([m.position[3 * i], m.position[3 * i + 1], m.position[3 * i + 2]]);
    const cb = centroidOf(basal);
    rings[id] = { id, centerMm: cb, normal: n, radiusMm: meanRadius(basal.flat(), cb, n), band };
  }
  for (const id of VALVES) {
    const sh = shellMask(rings[id].band, grid, 0.9 * hMm);
    for (let v = 0; v < N; v++) {
      if (!sh[v]) continue;
      const t = tissue[v];
      if (t === TISSUE.Out || t === TISSUE.LA || t === TISSUE.RA) {
        tissue[v] = TISSUE.Ring;
        part[v] = RING_PART[id];
      }
    }
  }

  // ---------------------------------------------------------------- 4. vessels
  vesselMask.forEach((m) => {
    if (!m) return;
    for (let v = 0; v < N; v++) if (m[v] && tissue[v] === TISSUE.Out) {
      tissue[v] = TISSUE.Vessel;
      part[v] = PART.Vessel;
    }
  });

  // ---------------------------------------------------------------- 5. caps, flood fill, cavities
  // Caps are temporary barriers (only Out voxels become cap): a digital disk with the standard arithmetic thickness
  // (h·Σ|n_i|), which no 6-connected path can cross.
  const capOf = new Int16Array(N).fill(-1);
  const disk = (c: Vec3, n: Vec3, R: number, id: number) => {
    const thick = 0.5 * hMm * (Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2])) + 1e-6;
    const r = Math.ceil((R + hMm) / hMm);
    const ci = vidx(c);
    if (ci < 0) return;
    const i0 = ci % nx, j0 = Math.floor(ci / nx) % ny, k0 = Math.floor(ci / (nx * ny));
    for (let k = Math.max(0, k0 - r); k <= Math.min(nz - 1, k0 + r); k++)
      for (let j = Math.max(0, j0 - r); j <= Math.min(ny - 1, j0 + r); j++)
        for (let i = Math.max(0, i0 - r); i <= Math.min(nx - 1, i0 + r); i++) {
          const v = i + nx * (j + ny * k);
          const d = sub(center(v), c);
          const ax = dot(d, n);
          if (Math.abs(ax) > thick) continue;
          if (Math.hypot(d[0] - ax * n[0], d[1] - ax * n[1], d[2] - ax * n[2]) > R) continue;
          if (tissue[v] === TISSUE.Out && capOf[v] < 0) capOf[v] = id;
        }
  };
  VALVES.forEach((id, vi) => disk(rings[id].centerMm, rings[id].normal, rings[id].radiusMm + 4, vi));
  const passable = new Uint8Array(N);
  for (let v = 0; v < N; v++) passable[v] = tissue[v] === TISSUE.Out && capOf[v] < 0 ? 1 : 0;
  // flood barrier = tissue ∪ caps, closed to seal millimetre gaps between the heart and vessel models
  const barrier = closeMask(Uint8Array.from(passable, (x) => 1 - x), dims, BARRIER_CLOSE_VOX);
  const outside = floodFromBoundary(Uint8Array.from(barrier, (x) => 1 - x), dims);
  // cavity cores: enclosed and away from the closing zone, so millimetre gaps (e.g. LA ↔ LV outflow around the
  // mitral cap) do not merge chambers; the closing zone is assigned afterwards by geodesic growth from the cores
  const cavity = new Uint8Array(N);
  const barrierInt = closeMask(Uint8Array.from(passable, (x) => 1 - x), dims, CORE_CLOSE_VOX);
  for (let v = 0; v < N; v++) cavity[v] = passable[v] && !outside[v] && !barrierInt[v] ? 1 : 0;
  const comps = components6(cavity, dims);
  // seeds: step from each valve centre along ±normal until a cavity voxel is found
  const seedComp = (c: Vec3, dir: Vec3): number => {
    for (let st = 1.5; st < 20; st += 0.5) {
      const v = vidx([c[0] + dir[0] * st, c[1] + dir[1] * st, c[2] + dir[2] * st]);
      if (v >= 0 && cavity[v]) return comps.label[v];
    }
    return 0;
  };
  const compChamber = new Map<number, number>();
  const stats: Record<string, number | string> = {};
  const assign = (label: number, ch: number, name: string) => {
    if (label <= 0) stats[`seed_${name}`] = 'leak-or-missing';
    else if (!compChamber.has(label)) compChamber.set(label, ch);
    else if (compChamber.get(label) !== ch) stats[`seed_${name}`] = `merged-with-${compChamber.get(label)}`;
  };
  const rm = rings.MITRAL, rt = rings.TRICUSPID, ra = rings.AORTIC, rp = rings.PULMONARY;
  assign(seedComp(rm.centerMm, rm.normal), CHAMBER.LV, 'LV');
  assign(seedComp(rt.centerMm, rt.normal), CHAMBER.RV, 'RV');
  assign(seedComp(rm.centerMm, scale(rm.normal, -1)), CHAMBER.LA, 'LA');
  assign(seedComp(rt.centerMm, scale(rt.normal, -1)), CHAMBER.RA, 'RA');
  assign(seedComp(ra.centerMm, scale(ra.normal, -1)), CHAMBER.LV, 'LVOT');
  assign(seedComp(rp.centerMm, scale(rp.normal, -1)), CHAMBER.RV, 'RVOT');
  for (const [label, ch] of compChamber) stats[`cavity_${['', 'LA', 'RA', 'LV', 'RV'][ch]}_mL`] = +((comps.sizes[label] * hMm ** 3) / 1000).toFixed(1);
  stats.cavityComponents = comps.sizes.length - 1;
  const front: number[] = [];
  for (let v = 0; v < N; v++) {
    if (!cavity[v]) continue;
    const ch = compChamber.get(comps.label[v]);
    if (ch !== undefined) {
      tissue[v] = TISSUE.Blood;
      chamber[v] = ch;
      front.push(v);
    }
  }
  // geodesic growth into the rest of the enclosed space: unlimited where the voxel is deep inside (> BARRIER + 1
  // voxels from the exterior), bounded depth near the exterior so a gap in a wall cannot leak blood along crevices
  const dOut = edt2(outside, dims, true);
  const deep = (w: number) => dOut[w] > (BARRIER_CLOSE_VOX + 1) ** 2;
  const grow = (limit: number, pred: (w: number) => boolean) => {
    let cur = front.splice(0);
    const all: number[] = [];
    for (let depth = 0; depth < limit && cur.length; depth++) {
      const next: number[] = [];
      for (const v of cur)
        forNeighbours6(dims, v, (w) => {
          if (tissue[w] !== TISSUE.Out || !passable[w] || outside[w] || !pred(w)) return;
          tissue[w] = TISSUE.Blood;
          chamber[w] = chamber[v];
          next.push(w);
        });
      all.push(...next);
      cur = next;
    }
    return all;
  };
  const seeded = front.slice();
  const grown = grow(1e9, deep);
  front.push(...seeded, ...grown);
  grow(BARRIER_CLOSE_VOX + 2, () => true);
  // cap voxels that border a chamber become its blood (AV caps by annulus side; others by their blood neighbours)
  for (let pass = 0; pass < 2; pass++)
    for (let v = 0; v < N; v++) {
      const ci = capOf[v];
      if (ci < 0 || tissue[v] !== TISSUE.Out) continue;
      const cnt = [0, 0, 0, 0, 0];
      forNeighbours6(dims, v, (w) => {
        if (tissue[w] === TISSUE.Blood) cnt[chamber[w]]++;
      });
      let ch = 0;
      for (let c = 1; c <= 4; c++) if (cnt[c] > cnt[ch]) ch = c;
      if (!ch) continue;
      if (ci < 2) {
        const rg = rings[VALVES[ci]];
        const side = dot(sub(center(v), rg.centerMm), rg.normal);
        ch = ci === 0 ? (side >= 0 ? CHAMBER.LV : CHAMBER.LA) : side >= 0 ? CHAMBER.RV : CHAMBER.RA;
      }
      tissue[v] = TISSUE.Blood;
      chamber[v] = ch;
      part[v] = PART.Cap;
    }
  // unseeded enclosed space (crevices sealed by the closing, vessel lumens, the aortic root above its cap) stays Out
  let pocketVox = 0;
  for (let v = 0; v < N; v++) if (cavity[v] && tissue[v] === TISSUE.Out) pocketVox++;
  stats.unseeded_mL = +((pocketVox * hMm ** 3) / 1000).toFixed(2);
  for (let v = 0; v < N; v++) outside[v] = tissue[v] === TISSUE.Out && capOf[v] < 0 ? 1 : 0;

  // ---------------------------------------------------------------- 6. clean-up
  absorbSeptalSandwich(tissue, chamber, part, dims);
  removeTissueIslands(tissue, chamber, part, dims, stats);
  stats.thickened = 0;
  stats.ringInserted = 0;
  for (let it = 0; it < 4; it++) {
    const th = thickenWalls(tissue, chamber, part, dims);
    const ri = isolateAtria(tissue, chamber, part, dims);
    (stats.thickened as number) += th;
    (stats.ringInserted as number) += ri;
    if (!th && !ri) break;
  }
  for (let v = 0; v < N; v++) {
    const tt = tissue[v];
    if (tt === TISSUE.LV || tt === TISSUE.Septum) chamber[v] = CHAMBER.LV;
    else if (tt === TISSUE.RV) chamber[v] = CHAMBER.RV;
    else if (tt === TISSUE.LA) chamber[v] = CHAMBER.LA;
    else if (tt === TISSUE.RA) chamber[v] = CHAMBER.RA;
    else if (tt !== TISSUE.Blood) chamber[v] = CHAMBER.None;
  }
  return {
    grid, tissue, chamber, part, rings,
    meshes: { walls, papillary: papillary.map((p) => ({ key: p.key, chamber: p.chamber, mesh: p.mesh })), vessels: vessels.map((v) => ({ id: v.id, mesh: v.mesh })) },
    stats,
    outside,
    cavityLabel: comps.label,
  };
}

/** LV / RV voxels with no Out/Vessel voxel within 2 voxels that touch the septum and both cavities → Septum. */
function absorbSeptalSandwich(tissue: Uint8Array, chamber: Uint8Array, part: Uint8Array, dims: readonly number[]): void {
  const N = tissue.length;
  const nearOut = new Uint8Array(N);
  const outMask = new Uint8Array(N);
  for (let v = 0; v < N; v++) outMask[v] = tissue[v] === TISSUE.Out || tissue[v] === TISSUE.Vessel ? 1 : 0;
  const d2 = edt2(outMask, dims, true);
  for (let v = 0; v < N; v++) nearOut[v] = d2[v] <= 4 ? 1 : 0;
  // distance to LV and RV blood
  const lvB = new Uint8Array(N), rvB = new Uint8Array(N);
  for (let v = 0; v < N; v++) {
    lvB[v] = tissue[v] === TISSUE.Blood && chamber[v] === CHAMBER.LV ? 1 : 0;
    rvB[v] = tissue[v] === TISSUE.Blood && chamber[v] === CHAMBER.RV ? 1 : 0;
  }
  const dl = edt2(lvB, dims, true), dr = edt2(rvB, dims, true);
  const sep = new Uint8Array(N);
  for (let v = 0; v < N; v++) sep[v] = tissue[v] === TISSUE.Septum ? 1 : 0;
  const ds = edt2(sep, dims, true);
  for (let v = 0; v < N; v++) {
    const t = tissue[v];
    if (t !== TISSUE.LV && t !== TISSUE.RV) continue;
    if (nearOut[v] || part[v] === PART.PapLV || part[v] === PART.PapRV) continue;
    // between the two cavities: both within a septal thickness, and adjacent to the septum slab
    const a = Math.sqrt(dl[v]), b = Math.sqrt(dr[v]);
    if (ds[v] <= 2 && a + b <= 14) {
      tissue[v] = TISSUE.Septum;
      part[v] = PART.Septum;
    }
  }
}

/** Removes myocardium / ring / vessel islands < 30 voxels (→ Out, or Blood if surrounded by blood). */
function removeTissueIslands(tissue: Uint8Array, chamber: Uint8Array, part: Uint8Array, dims: readonly number[], stats: Record<string, number | string>): void {
  const N = tissue.length;
  let removed = 0;
  for (const t of [TISSUE.LV, TISSUE.RV, TISSUE.Septum, TISSUE.LA, TISSUE.RA]) {
    const m = new Uint8Array(N);
    for (let v = 0; v < N; v++) m[v] = tissue[v] === t ? 1 : 0;
    const keep = removeIslands(m, dims, 30);
    for (let v = 0; v < N; v++) {
      if (!m[v] || keep[v]) continue;
      // an island touching another myocardium voxel of the same compartment stays (e.g. papillary bits on the septum)
      let neighbourMyo = false;
      forNeighbours6(dims, v, (w) => {
        const u = tissue[w];
        if (u !== t && (u === TISSUE.LV || u === TISSUE.RV || u === TISSUE.Septum) === (t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum) && (u === TISSUE.LV || u === TISSUE.RV || u === TISSUE.Septum || u === TISSUE.LA || u === TISSUE.RA)) neighbourMyo = true;
      });
      if (neighbourMyo) continue;
      let blood = 0, ch = 0;
      forNeighbours6(dims, v, (w) => {
        if (tissue[w] === TISSUE.Blood) {
          blood++;
          ch = chamber[w];
        }
      });
      tissue[v] = blood >= 3 ? TISSUE.Blood : TISSUE.Out;
      chamber[v] = blood >= 3 ? ch : 0;
      part[v] = PART.None;
      removed++;
    }
  }
  stats.islandVoxelsRemoved = removed;
}

const isMyo = (t: number) => t >= TISSUE.LV && t <= TISSUE.RA;

/**
 * Walls ≥ 2 voxels: a myocardium voxel facing blood and Out (6-adjacent) at once is a 1-voxel wall — its EDL faces
 * would cancel. Its Out neighbours become the same tissue (outward thickening; never into blood or ring). Repeated.
 */
export function thickenWalls(tissue: Uint8Array, chamber: Uint8Array, part: Uint8Array, dims: readonly number[]): number {
  let total = 0;
  for (let pass = 0; pass < 4; pass++) {
    const add: [number, number][] = [];
    for (let v = 0; v < tissue.length; v++) {
      const t = tissue[v];
      if (!isMyo(t)) continue;
      let blood = false;
      const outs: number[] = [];
      forNeighbours6(dims, v, (w) => {
        if (tissue[w] === TISSUE.Blood) blood = true;
        else if (tissue[w] === TISSUE.Out) outs.push(w);
      });
      if (blood && outs.length) for (const w of outs) add.push([w, t]);
    }
    if (!add.length) break;
    for (const [w, t] of add) {
      if (tissue[w] !== TISSUE.Out) continue;
      tissue[w] = t;
      chamber[w] = 0;
      part[w] = PART.Thickened;
      total++;
    }
  }
  return total;
}

/** Converts every atrial voxel 6-adjacent to a ventricular voxel into Ring (the fibrous AV ring). */
export function isolateAtria(tissue: Uint8Array, chamber: Uint8Array, part: Uint8Array, dims: readonly number[]): number {
  const conv: number[] = [];
  for (let v = 0; v < tissue.length; v++) {
    const t = tissue[v];
    if (t !== TISSUE.LA && t !== TISSUE.RA) continue;
    let touch = false;
    forNeighbours6(dims, v, (w) => {
      const u = tissue[w];
      if (u === TISSUE.LV || u === TISSUE.RV || u === TISSUE.Septum) touch = true;
    });
    if (touch) conv.push(v);
  }
  for (const v of conv) {
    tissue[v] = TISSUE.Ring;
    chamber[v] = 0;
    part[v] = PART.RingInserted;
  }
  return conv.length;
}

function meanRadius(P: ArrayLike<number>, c: Vec3, n: Vec3): number {
  let r = 0;
  const k = P.length / 3;
  for (let i = 0; i < k; i++) {
    const d: Vec3 = [P[3 * i] - c[0], P[3 * i + 1] - c[1], P[3 * i + 2] - c[2]];
    const a = dot(d, n);
    r += Math.hypot(d[0] - a * n[0], d[1] - a * n[1], d[2] - a * n[2]);
  }
  return r / Math.max(1, k);
}

function centroidOf(ps: readonly Vec3[]): Vec3 {
  let x = 0, y = 0, z = 0;
  for (const p of ps) {
    x += p[0];
    y += p[1];
    z += p[2];
  }
  const n = Math.max(1, ps.length);
  return [x / n, y / n, z / n];
}
