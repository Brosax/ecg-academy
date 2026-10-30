/**
 * Atrial macro-re-entry around the tricuspid annulus (typical atrial flutter) as a fastest-route activation field.
 *
 * Anatomy of the circuit (docs/research/disease-spec.json `atrial-flutter-typical`): the wave circulates in the right
 * atrium between two obstacles — the tricuspid annulus (inner boundary) and a posterior barrier made of the caval
 * orifices joined by the crista terminalis / intercaval functional line of block. Counterclockwise as seen from the
 * ventricular side (LAO view): up the septum, across the roof in front of the SVC, down the lateral wall, then through
 * the slow cavotricuspid isthmus (CTI, the floor between the annulus and the IVC) back to the septum. The left atrium
 * is a bystander, activated through its septal / Bachmann connections.
 *
 * One revolution = one activation field with t = 0 at a "cut" across the CTI exit (a half-plane through the annulus
 * axis, from the annulus to the IVC orifice). For the field computation the cut is a temporary unidirectional block:
 * the seeds sit on its forward face, the wave runs the whole circuit and arrives at its back face; a second pass carries
 * the arriving wave through the cut, and the time it re-excites the seed line is the cycle length CL. All times are then
 * taken modulo CL (every voxel activates exactly once per revolution, tAct ∈ [0, CL)), so beat templates repeated every
 * CL superpose into a seamless circulation — the ECG (sawtooth F waves), the 3D colouring and the slice all read this
 * one field. The crista line is a real (functional) block: its voxels are activated from their own side only, so the two
 * sides of the line show different times. CL is emergent: path length / conduction velocity, with the CTI slowed.
 *
 * Geometry inputs: the TRICUSPID valve (centre, normal, radius), the pose (body-inferior direction), and the caval
 * orifices (right-atrial voxels touching the IVC / SVC vessel plugs, assigned by the nearest IVC / SVC overlay vertex).
 * Lines of block are ≥ 3.4 mm thick: the 50-neighbour stencil jumps up to √5 voxels (3.35 mm at 1.5 mm voxels).
 */
import type { AtrialActivation, PathTiming } from './graph';
import { conductionParams } from './graph';
import type { EngineParams } from './params';
import { fastestRoute } from './fastestRoute';
import { nearestVoxel, polylineArc, voxelCenter } from './gridUtil';
import { buildCableLayer } from './purkinje';
import type { ActivationField, GeometryBundle, Seed, Vec3, VoxelGrid } from '../types';
import { COMP, TISSUE, compOfTissue } from '../types';

export interface AtrialCircuitSpec {
  /** Sense of rotation seen from the ventricular side (LAO view): 'ccw' = typical flutter, 'cw' = reverse typical. */
  readonly direction: 'ccw' | 'cw';
  /** Conduction-speed factor in the cavotricuspid isthmus (slow zone of the circuit). */
  readonly isthmusSpeed: number;
  /** Angular width (deg) of the isthmus lateral of the cut (the CTI exit), measured around the annulus axis. */
  readonly isthmusDeg: number;
  /** Thickness (mm) of the cut and of the crista line of block (≥ 3.4 mm, see the module comment). */
  readonly blockMm: number;
  /** How far (mm) from the IVC–SVC axis the crista line of block reaches (keeps it on the posterior wall). */
  readonly cristaReachMm: number;
  /** Lateral offset of the crista line from the caval centres, as a fraction of the smaller orifice radius (< 1). */
  readonly cristaLateralFrac: number;
}

/** A circuit activation: an ordinary atrial activation (tAct ∈ [0, CL)) plus the circuit's cycle length and parts. */
export interface CircuitActivation extends AtrialActivation {
  /** Revolution time = flutter cycle length (ms). */
  readonly cycleMs: number;
  /** Voxels of the crista / intercaval line of block. */
  readonly blockVoxels: Uint32Array;
  /** Voxels of the slow cavotricuspid isthmus. */
  readonly isthmusVoxels: Uint32Array;
  /** Seed voxels at the cut (CTI exit), activated at tAct ≈ 0. */
  readonly cutVoxels: Uint32Array;
  /** Annulus frame: centre, axis (RA → RV), body-inferior and septal in-plane directions (local mm). */
  readonly frame: { readonly c: Vec3; readonly n: Vec3; readonly eInf: Vec3; readonly eSep: Vec3; readonly ivc: Vec3 | null; readonly svc: Vec3 | null };
}

export const isCircuitActivation = (a: AtrialActivation): a is CircuitActivation => typeof (a as Partial<CircuitActivation>).cycleMs === 'number';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const normalize = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/**
 * Centres of the caval orifices: right-atrial voxels with a face neighbour in a vessel plug, assigned to the nearest
 * IVC / SVC overlay vertex (within 12 mm). Null when the geometry has no such overlays.
 */
export interface Orifice {
  readonly c: Vec3;
  /** Mean distance of the rim voxels from the centre (mm). */
  readonly rMm: number;
}

export function cavalOrifices(geo: GeometryBundle): { ivc: Orifice | null; svc: Orifice | null } {
  const g = geo.grid;
  const [nx, ny, nz] = g.dims;
  const meshes = (['IVC', 'SVC'] as const).map((id) => geo.overlays?.find((o) => o.id === id) ?? null);
  const acc = [[0, 0, 0, 0], [0, 0, 0, 0]];
  const rims: Vec3[][] = [[], []];
  if (meshes.every((m) => !m)) return { ivc: null, svc: null };
  const steps = [1, -1, nx, -nx, nx * ny, -nx * ny];
  for (let v = 0; v < g.tissue.length; v++) {
    if (g.tissue[v] !== TISSUE.RA) continue;
    const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
    if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) continue;
    if (!steps.some((d) => g.tissue[v + d] === TISSUE.Vessel)) continue;
    const p = voxelCenter(g, v);
    let best = -1, bd = 144;
    meshes.forEach((m, mi) => {
      if (!m) return;
      for (let q = 0; q < m.position.length; q += 9) {
        const d2 = (m.position[q] - p[0]) ** 2 + (m.position[q + 1] - p[1]) ** 2 + (m.position[q + 2] - p[2]) ** 2;
        if (d2 < bd) {
          bd = d2;
          best = mi;
        }
      }
    });
    if (best < 0) continue;
    acc[best][0] += p[0];
    acc[best][1] += p[1];
    acc[best][2] += p[2];
    acc[best][3]++;
    rims[best].push(p);
  }
  const orifice = (k: number): Orifice | null => {
    const a = acc[k];
    if (a[3] === 0) return null;
    const c: Vec3 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
    const rMm = rims[k].reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]), 0) / rims[k].length;
    return { c, rMm };
  };
  return { ivc: orifice(0), svc: orifice(1) };
}

/** Annulus frame: c, n (RA → RV), eInf = body-inferior direction in the annulus plane, eSep = n × eInf (septal). */
export function annulusFrame(geo: GeometryBundle): { c: Vec3; n: Vec3; eInf: Vec3; eSep: Vec3; radiusMm: number } {
  const tv = geo.valves.find((v) => v.id === 'TRICUSPID');
  if (!tv) throw new Error('atrial circuit: the geometry has no tricuspid valve');
  const n = normalize(tv.normal);
  // local direction whose app image is body-inferior (app −y): −(row 1 of R)
  const R = geo.pose.R;
  const inf: Vec3 = [-R[3], -R[4], -R[5]];
  const eInf = normalize(sub(inf, scale(n, dot(inf, n))));
  // viewed from the ventricular side (looking along −n) with superior up, n × eInf points to the screen right = septum
  const eSep = cross(n, eInf);
  return { c: tv.centerMm, n, eInf, eSep, radiusMm: tv.radiusMm };
}

/** Angle (rad) of a point around the annulus axis: 0 = inferior, +π/2 = septal (counterclockwise in LAO = increasing). */
export const annulusAngle = (f: { c: Vec3; eInf: Vec3; eSep: Vec3 }, p: Vec3): number => {
  const d = sub(p, f.c);
  return Math.atan2(dot(d, f.eSep), dot(d, f.eInf));
};

const wrapPi = (a: number) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

export function buildCircuitActivation(geo: GeometryBundle, p: EngineParams, id: string, spec: AtrialCircuitSpec): CircuitActivation {
  const g = geo.grid;
  const N = g.tissue.length;
  const fr = annulusFrame(geo);
  const { ivc, svc } = cavalOrifices(geo);
  const isAtrial = (v: number) => compOfTissue(g.tissue[v]) === COMP.Atrial;
  const sgn = spec.direction === 'ccw' ? 1 : -1;
  const half = spec.blockMm / 2;
  const h = g.hMm;

  // ---- the cut: half-plane through the annulus axis at the IVC's angle, from the annulus to the IVC centre
  const phiCut = ivc ? annulusAngle(fr, ivc.c) : (35 * Math.PI) / 180;
  const w: Vec3 = normalize([
    Math.cos(phiCut) * fr.eInf[0] + Math.sin(phiCut) * fr.eSep[0],
    Math.cos(phiCut) * fr.eInf[1] + Math.sin(phiCut) * fr.eSep[1],
    Math.cos(phiCut) * fr.eInf[2] + Math.sin(phiCut) * fr.eSep[2],
  ]);
  // forward normal of the cut: direction of increasing angle (ccw), reversed for cw
  const eFwd = scale(cross(fr.n, w), sgn);
  const depthIvc = ivc ? -dot(sub(ivc.c, fr.c), fr.n) : 30;
  const rIvc = ivc?.rMm ?? 8;
  const cutRole = new Int8Array(N); // 1 = cut slab, 2 = seed face (forward), 3 = back face
  const isthmus: number[] = [];
  const isthmusSpeed = new Float32Array(N).fill(1);
  const isthmusRad = (spec.isthmusDeg * Math.PI) / 180;
  for (let v = 0; v < N; v++) {
    if (g.tissue[v] !== TISSUE.RA) continue;
    const q = voxelCenter(g, v);
    const d = sub(q, fr.c);
    const depth = -dot(d, fr.n);
    if (depth > depthIvc + rIvc || depth < -6) continue;
    // isthmus: the channel between the annulus and the IVC orifice (whole rim), within isthmusDeg lateral of the cut
    // (the same anatomy for both directions: crossed last in counterclockwise flutter, first in clockwise flutter)
    const dphi = wrapPi(annulusAngle(fr, q) - phiCut);
    if (dphi <= 0 && dphi > -isthmusRad) {
      isthmus.push(v);
      isthmusSpeed[v] = spec.isthmusSpeed;
    }
    if (depth > depthIvc || dot(d, w) <= 0) continue;
    const s = dot(d, eFwd);
    if (Math.abs(s) <= half) cutRole[v] = 1;
    else if (s > half && s <= half + 1.5 * h) cutRole[v] = 2;
    else if (s < -half && s >= -half - 1.5 * h) cutRole[v] = 3;
  }

  // ---- the crista terminalis line of block along the lateral border of the caval orifices (the smooth intercaval wall,
  // sinus venarum, stays on the septal side); its ends lie inside the orifices so nothing passes around them
  const block = new Uint8Array(N);
  const side = new Int8Array(N);
  if (ivc && svc) {
    const axis = sub(svc.c, ivc.c);
    const len = Math.hypot(axis[0], axis[1], axis[2]);
    const u = scale(axis, 1 / len);
    let m = normalize(cross(u, fr.n));
    if (dot(m, fr.eSep) < 0) m = scale(m, -1); // m points septal
    const off = -spec.cristaLateralFrac * Math.min(ivc.rMm, svc.rMm);
    for (let v = 0; v < N; v++) {
      if (!isAtrial(v)) continue;
      const q = sub(voxelCenter(g, v), ivc.c);
      const t = dot(q, u);
      if (t < 0 || t > len) continue;
      const perp = sub(q, scale(u, t));
      if (Math.hypot(perp[0], perp[1], perp[2]) > spec.cristaReachMm) continue;
      const s = dot(q, m) - off;
      side[v] = s >= 0 ? 1 : -1;
      if (Math.abs(s) <= half) block[v] = 1;
    }
  }

  // ---- pass 1: from the seed face around the circuit (cut slab and crista line insulating)
  const tissue1 = Uint8Array.from(g.tissue);
  for (let v = 0; v < N; v++) if (cutRole[v] === 1 || block[v]) tissue1[v] = TISSUE.Ring;
  const grid1: VoxelGrid = { ...g, tissue: tissue1 };
  const bb = geo.paths.find((x) => x.id === 'BACHMANN' && x.pointsMm.length > 1) ?? null;
  const bachmann = bb
    ? buildCableLayer(g, bb.pointsMm, { comp: COMP.Atrial, vCableMps: p.vBachmannMps, couplingMm: p.bachmannCouplingMm, vCoupleMps: p.vAtrialMps })
    : null;
  const run = (grid: VoxelGrid, seeds: Seed[], layers: boolean) =>
    fastestRoute({
      grid, comp: COMP.Atrial, stencil: p.stencil, vLongMps: p.vAtrialMps, vTransMps: p.vAtrialMps, speedScale: isthmusSpeed, seeds,
      layers: layers && bachmann ? [bachmann] : [],
    });
  const seedVox: number[] = [];
  for (let v = 0; v < N; v++) if (cutRole[v] === 2) seedVox.push(v);
  let seeds: Seed[] = seedVox.map((v) => ({ voxel: v, tMs: 0 }));
  let r1 = run(grid1, seeds, true);
  // ---- pass 2: the arriving wave crosses the cut and re-excites the seed line → CL; seed times refined once
  const tissue2 = new Uint8Array(N);
  for (let v = 0; v < N; v++) if (cutRole[v] > 0) tissue2[v] = TISSUE.RA;
  const grid2: VoxelGrid = { ...g, tissue: tissue2 };
  let cl = Infinity;
  let r2 = r1;
  for (let it = 0; it < 2; it++) {
    const back: Seed[] = [];
    for (let v = 0; v < N; v++) if (cutRole[v] === 3 && Number.isFinite(r1.tAct[v])) back.push({ voxel: v, tMs: r1.tAct[v] });
    r2 = run(grid2, back, false);
    cl = Infinity;
    for (const v of seedVox) cl = Math.min(cl, r2.tAct[v]);
    if (!Number.isFinite(cl)) throw new Error('atrial circuit: the wave does not return to the cut');
    seeds = seedVox.map((v) => ({ voxel: v, tMs: Number.isFinite(r2.tAct[v]) ? r2.tAct[v] - cl : 0 }));
    r1 = run(grid1, seeds, true);
  }

  // ---- assemble: cut slab from pass 2, crista line from its own side, everything modulo CL
  const tAct = Float32Array.from(r1.tAct);
  for (let v = 0; v < N; v++) if (cutRole[v] === 1) tAct[v] = r2.tAct[v];
  fillFromOwnSide(g, tAct, block, side, p.vAtrialMps);
  let tMin = Infinity, tMax = -Infinity;
  for (let v = 0; v < N; v++) {
    let t = tAct[v];
    if (!Number.isFinite(t)) continue;
    t -= cl * Math.floor(t / cl);
    tAct[v] = t;
    tMin = Math.min(tMin, t);
    tMax = Math.max(tMax, t);
  }
  const field: ActivationField = { id, comp: COMP.Atrial, tAct, tMinMs: tMin, tMaxMs: tMax };

  const avnPoint = geo.landmarks.AVN ?? geo.landmarks.HIS ?? null;
  const avnVoxel = avnPoint ? nearestVoxel(g, avnPoint, (v) => isAtrial(v) && Number.isFinite(tAct[v]), 40).voxel : -1;
  const avnArrivalMs = avnVoxel >= 0 ? tAct[avnVoxel] : 0;
  const paths: PathTiming[] = [];
  const bachmannT = r1.layerT[0] ? Float32Array.from(r1.layerT[0], (t) => (Number.isFinite(t) ? t - cl * Math.floor(t / cl) : t)) : null;
  if (bachmann && bachmannT) {
    const t = Array.from(bachmannT);
    paths.push({ id: 'BACHMANN', pointsMm: bachmann.pointsMm, tMs: t, t0: Math.min(...t), t1: Math.max(...t), lengthMm: bachmann.arcMm[bachmann.arcMm.length - 1] });
  }
  const avn = geo.paths.find((x) => x.id === 'AVN' && x.pointsMm.length > 0);
  if (avn) paths.push({ id: 'AVN', pointsMm: avn.pointsMm, tMs: avn.pointsMm.map(() => avnArrivalMs), t0: avnArrivalMs, t1: avnArrivalMs, lengthMm: polylineArc(avn.pointsMm).length });
  const blockVoxels: number[] = [];
  for (let v = 0; v < N; v++) if (block[v]) blockVoxels.push(v);
  return {
    field,
    variant: { id, comp: COMP.Atrial, seeds, params: conductionParams(p) },
    saVoxel: -1,
    avnVoxel,
    avnArrivalMs,
    bachmann,
    bachmannT,
    paths,
    cycleMs: cl,
    blockVoxels: Uint32Array.from(blockVoxels),
    isthmusVoxels: Uint32Array.from(isthmus),
    cutVoxels: Uint32Array.from(seedVox),
    frame: { c: fr.c, n: fr.n, eInf: fr.eInf, eSep: fr.eSep, ivc: ivc?.c ?? null, svc: svc?.c ?? null },
  };
}

/**
 * Activation of the line-of-block voxels from their own side: each takes the earliest time of a non-block neighbour (or
 * an already filled block voxel) on the same side of the line, plus the travel time. The two halves of the line are
 * activated at different times — the block shows in the 3D colouring.
 */
function fillFromOwnSide(g: VoxelGrid, tAct: Float32Array, block: Uint8Array, side: Int8Array, vMps: number): void {
  const [nx, ny, nz] = g.dims;
  const h = g.hMm;
  const list: number[] = [];
  for (let v = 0; v < block.length; v++) if (block[v]) list.push(v);
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const v of list) {
      const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
      let best = tAct[v];
      for (let dk = -1; dk <= 1; dk++)
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            if (!di && !dj && !dk) continue;
            const ii = i + di, jj = j + dj, kk = k + dk;
            if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
            const w = v + di + nx * (dj + ny * dk);
            if (side[w] !== side[v] || !Number.isFinite(tAct[w])) continue;
            const t = tAct[w] + (h * Math.sqrt(di * di + dj * dj + dk * dk)) / vMps;
            if (t < best) best = t;
          }
      if (best < tAct[v]) {
        tAct[v] = best;
        changed = true;
      }
    }
    if (!changed) break;
  }
}
