// torso.ts — homogeneous bounded volume conductor (closed elliptic-cylinder torso) solved with a collocation BEM,
// used through reciprocity: for every electrode e we compute a reciprocal potential Z_e(x) at the heart nodes such that
// a current dipole p at x produces phi_e = p . grad Z_e(x). Then the interior-face EDL gives node weights W_e,n.
import type { Vec3, Geom } from './geom.ts';
import { DOM } from './geom.ts';

export interface Mesh {
  tris: number[][];           // per panel: list of triangles, each [ax,ay,az,bx,by,bz,cx,cy,cz] (mm), outward CCW
  cen: Float64Array;          // panel centroids (3N)
  area: Float64Array;         // panel areas (mm^2)
  nrm: Float64Array;          // outward normals
  n: number;
}

export const ELECTRODES = ['RA', 'LA', 'LL', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type Electrode = typeof ELECTRODES[number];

export interface TorsoParams {
  A: number; B: number; yTop: number; yBot: number;
  elec: Record<Electrode, { pos: Vec3; r: number }>;
}

// Elliptic cylinder torso: half-width A (x), half-depth B (z). Body frame: +x left, +y up, +z anterior (mm).
export function surfZ(p: TorsoParams, x: number): number { const u = Math.min(1, Math.abs(x) / p.A); return p.B * Math.sqrt(1 - u * u); }

export function defaultTorso(): TorsoParams {
  const A = 160, B = 112;
  const T: TorsoParams = { A, B, yTop: 180, yBot: -400, elec: {} as TorsoParams['elec'] };
  const front = (x: number, y: number, r = 9): { pos: Vec3; r: number } => ({ pos: [x, y, surfZ(T, x)], r });
  const v4x = 86, v4y = -30;
  T.elec = {
    RA: { pos: [-A, 135, 0], r: 38 },
    LA: { pos: [A, 135, 0], r: 38 },
    LL: { pos: [70, T.yBot, 0], r: 50 },
    V1: front(-27, 0),
    V2: front(27, 0),
    V3: front(0.5 * (27 + v4x), 0.5 * (0 + v4y)),
    V4: front(v4x, v4y),
    V5: front(126, v4y),
    V6: { pos: [A, v4y, 0], r: 9 },
  };
  return T;
}

function triArea(t: number[]): [number, Vec3] {
  const ux = t[3] - t[0], uy = t[4] - t[1], uz = t[5] - t[2];
  const vx = t[6] - t[0], vy = t[7] - t[1], vz = t[8] - t[2];
  const c: Vec3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(c[0], c[1], c[2]);
  return [0.5 * l, [c[0] / l, c[1] / l, c[2] / l]];
}

function buildMesh(panels: number[][][]): Mesh {
  const n = panels.length;
  const cen = new Float64Array(3 * n), area = new Float64Array(n), nrm = new Float64Array(3 * n);
  const tris: number[][] = [];
  for (let i = 0; i < n; i++) {
    const tl = panels[i];
    let A = 0; const c: Vec3 = [0, 0, 0]; const nn: Vec3 = [0, 0, 0];
    const flat: number[] = [];
    for (const t of tl) {
      const [a, nv] = triArea(t);
      A += a;
      for (let k = 0; k < 3; k++) { c[k] += a * (t[k] + t[3 + k] + t[6 + k]) / 3; nn[k] += a * nv[k]; }
      flat.push(...t);
    }
    tris.push(flat);
    area[i] = A;
    const nl = Math.hypot(nn[0], nn[1], nn[2]);
    for (let k = 0; k < 3; k++) { cen[3 * i + k] = c[k] / A; nrm[3 * i + k] = nn[k] / nl; }
  }
  return { tris, cen, area, nrm, n };
}

export function torsoMesh(p: TorsoParams): Mesh {
  // phi: 0 = front (z=+B), 90 = patient left (x=+A); dense on the anterior/left chest
  const phis: number[] = [];
  for (let a = -45; a < 118; a += 6) phis.push(a);
  for (let a = 118; a < 315; a += 14) phis.push(a);
  const m = phis.length;
  const ys: number[] = [p.yBot, -340, -280, -225, -180, -145];
  for (let y = -125; y <= 65; y += 15) ys.push(y);
  ys.push(95, 125, 155, p.yTop);
  const P = (phi: number, y: number, s = 1): number[] => { const r = phi * Math.PI / 180; return [s * p.A * Math.sin(r), y, s * p.B * Math.cos(r)]; };
  const panels: number[][][] = [];
  // lateral surface (outward normal); vertex order CCW seen from outside
  for (let j = 0; j + 1 < ys.length; j++) for (let i = 0; i < m; i++) {
    const a = P(phis[i], ys[j]), b = P(phis[(i + 1) % m], ys[j]), c = P(phis[(i + 1) % m], ys[j + 1]), d = P(phis[i], ys[j + 1]);
    // increasing phi goes from front toward +x; outward normal = (d-a) x (b-a)? choose order so normal points outward
    panels.push([[...a, ...b, ...c], [...a, ...c, ...d]]);
  }
  // caps with rings
  const rings = [1, 0.7, 0.4];
  for (const [y, up] of [[p.yTop, 1], [p.yBot, -1]] as const) {
    for (let r = 0; r < rings.length; r++) {
      const s0 = rings[r], s1 = rings[r + 1] ?? 0;
      for (let i = 0; i < m; i++) {
        const a = P(phis[i], y, s0), b = P(phis[(i + 1) % m], y, s0);
        if (s1 > 0) {
          const c = P(phis[(i + 1) % m], y, s1), d = P(phis[i], y, s1);
          panels.push(up > 0 ? [[...a, ...b, ...c], [...a, ...c, ...d]] : [[...a, ...c, ...b], [...a, ...d, ...c]]);
        } else {
          const c = [0, y, 0];
          panels.push(up > 0 ? [[...a, ...b, ...c]] : [[...a, ...c, ...b]]);
        }
      }
    }
  }
  const mesh = buildMesh(panels);
  // orientation check: normals must point away from the torso axis
  for (let i = 0; i < mesh.n; i++) {
    const cx = mesh.cen[3 * i], cy = mesh.cen[3 * i + 1], cz = mesh.cen[3 * i + 2];
    const out = Math.abs(cy - p.yTop) < 1e-6 ? mesh.nrm[3 * i + 1] : Math.abs(cy - p.yBot) < 1e-6 ? -mesh.nrm[3 * i + 1] : cx * mesh.nrm[3 * i] + cz * mesh.nrm[3 * i + 2];
    if (out <= 0) throw new Error('torso panel ' + i + ' has inward normal');
  }
  return mesh;
}

export function sphereMesh(R: number, nlat = 16, nlon = 32): Mesh {
  const panels: number[][][] = [];
  const P = (t: number, f: number): number[] => [R * Math.sin(t) * Math.cos(f), R * Math.sin(t) * Math.sin(f), R * Math.cos(t)];
  for (let i = 0; i < nlat; i++) for (let j = 0; j < nlon; j++) {
    const t0 = Math.PI * i / nlat, t1 = Math.PI * (i + 1) / nlat, f0 = 2 * Math.PI * j / nlon, f1 = 2 * Math.PI * (j + 1) / nlon;
    const a = P(t0, f0), b = P(t1, f0), c = P(t1, f1), d = P(t0, f1);
    if (i === 0) panels.push([[...a, ...b, ...c]]);
    else if (i === nlat - 1) panels.push([[...a, ...b, ...d]]);
    else panels.push([[...a, ...b, ...c], [...a, ...c, ...d]]);
  }
  return buildMesh(panels);
}

// signed solid angle of triangle (a,b,c) seen from point r (Van Oosterom & Strackee 1983)
function solidAngle(t: number[], o: number, rx: number, ry: number, rz: number): number {
  const ax = t[o] - rx, ay = t[o + 1] - ry, az = t[o + 2] - rz;
  const bx = t[o + 3] - rx, by = t[o + 4] - ry, bz = t[o + 5] - rz;
  const cx = t[o + 6] - rx, cy = t[o + 7] - ry, cz = t[o + 8] - rz;
  const la = Math.hypot(ax, ay, az), lb = Math.hypot(bx, by, bz), lc = Math.hypot(cx, cy, cz);
  const num = ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  const den = la * lb * lc + (ax * bx + ay * by + az * bz) * lc + (ax * cx + ay * cy + az * cz) * lb + (bx * cx + by * cy + bz * cz) * la;
  return 2 * Math.atan2(num, den);
}

// System matrix A = I - K + (1 a^T)/sum(a), K_ij = Omega_ij / (2 pi)
export function bemMatrix(mesh: Mesh): Float64Array {
  const n = mesh.n; const A = new Float64Array(n * n);
  let at = 0; for (let i = 0; i < n; i++) at += mesh.area[i];
  for (let i = 0; i < n; i++) {
    const rx = mesh.cen[3 * i], ry = mesh.cen[3 * i + 1], rz = mesh.cen[3 * i + 2];
    for (let j = 0; j < n; j++) {
      let om = 0;
      if (j !== i) { const t = mesh.tris[j]; for (let o = 0; o < t.length; o += 9) om += solidAngle(t, o, rx, ry, rz); }
      A[i * n + j] = (i === j ? 1 : 0) - om / (2 * Math.PI) + mesh.area[j] / at;
    }
  }
  return A;
}

// dense LU with partial pivoting (in place); returns pivot array
export function luFactor(A: Float64Array, n: number): Int32Array {
  const piv = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    let p = k, mx = Math.abs(A[k * n + k]);
    for (let i = k + 1; i < n; i++) { const v = Math.abs(A[i * n + k]); if (v > mx) { mx = v; p = i; } }
    piv[k] = p;
    if (p !== k) for (let j = 0; j < n; j++) { const t = A[k * n + j]; A[k * n + j] = A[p * n + j]; A[p * n + j] = t; }
    const d = A[k * n + k];
    for (let i = k + 1; i < n; i++) {
      const f = (A[i * n + k] /= d);
      if (f === 0) continue;
      const ri = i * n, rk = k * n;
      for (let j = k + 1; j < n; j++) A[ri + j] -= f * A[rk + j];
    }
  }
  return piv;
}
// solve A^T x = b using LU of A (PA = LU  =>  A^T = U^T L^T P)
export function luSolveT(LU: Float64Array, piv: Int32Array, n: number, b: Float64Array): Float64Array {
  const y = Float64Array.from(b);
  // U^T z = b
  for (let i = 0; i < n; i++) { let s = y[i]; for (let k = 0; k < i; k++) s -= LU[k * n + i] * y[k]; y[i] = s / LU[i * n + i]; }
  // L^T w = z
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= LU[k * n + i] * y[k]; y[i] = s; }
  // x = P^T w
  for (let k = n - 1; k >= 0; k--) { const p = piv[k]; if (p !== k) { const t = y[k]; y[k] = y[p]; y[p] = t; } }
  return y;
}
export function luSolve(LU: Float64Array, piv: Int32Array, n: number, b: Float64Array): Float64Array {
  const y = Float64Array.from(b);
  for (let k = 0; k < n; k++) { const p = piv[k]; if (p !== k) { const t = y[k]; y[k] = y[p]; y[p] = t; } }
  for (let i = 0; i < n; i++) { let s = y[i]; for (let k = 0; k < i; k++) s -= LU[i * n + k] * y[k]; y[i] = s; }
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= LU[i * n + k] * y[k]; y[i] = s / LU[i * n + i]; }
  return y;
}

export const SIGMA = 0.2;          // S/m torso conductivity
export const TAU = 8e-3;           // A/m equivalent double-layer strength for a full action potential (0.2 S/m x 40 mV)

// electrode sampling weights over panels
export function electrodeWeights(mesh: Mesh, pos: Vec3, r: number): Float64Array {
  const g = new Float64Array(mesh.n); let s = 0;
  for (let i = 0; i < mesh.n; i++) {
    const d2 = (mesh.cen[3 * i] - pos[0]) ** 2 + (mesh.cen[3 * i + 1] - pos[1]) ** 2 + (mesh.cen[3 * i + 2] - pos[2]) ** 2;
    const w = mesh.area[i] * Math.exp(-d2 / (2 * r * r));
    if (d2 < 9 * r * r) { g[i] = w; s += w; }
  }
  if (s === 0) { // nearest panel
    let bi = 0, bd = Infinity;
    for (let i = 0; i < mesh.n; i++) { const d2 = (mesh.cen[3 * i] - pos[0]) ** 2 + (mesh.cen[3 * i + 1] - pos[1]) ** 2 + (mesh.cen[3 * i + 2] - pos[2]) ** 2; if (d2 < bd) { bd = d2; bi = i; } }
    g[bi] = 1; s = 1;
  }
  for (let i = 0; i < mesh.n; i++) g[i] /= s;
  return g;
}

export interface LeadSystem {
  mesh: Mesh;
  coef: Float64Array[];     // per electrode: c_e (N panels), Z_e(x) = sum c_i / (2 pi sigma |r_i - x|)
  Z(e: number, x: number, y: number, z: number): number;   // V/A, positions in mm
}

export function leadSystem(tp: TorsoParams): LeadSystem {
  const mesh = torsoMesh(tp);
  const A = bemMatrix(mesh);
  const piv = luFactor(A, mesh.n);
  const coef = ELECTRODES.map((e) => luSolveT(A, piv, mesh.n, electrodeWeights(mesh, tp.elec[e].pos, tp.elec[e].r)));
  const k = 1 / (2 * Math.PI * SIGMA) * 1000; // 1/r with r in mm -> per metre
  return {
    mesh, coef,
    Z(e: number, x: number, y: number, z: number): number {
      const c = coef[e]; const cen = mesh.cen; let s = 0;
      for (let i = 0; i < mesh.n; i++) {
        const dx = cen[3 * i] - x, dy = cen[3 * i + 1] - y, dz = cen[3 * i + 2] - z;
        s += c[i] / Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      return s * k;
    },
  };
}

// Node weights (V per unit normalised Vm) for every electrode: W_e,n = TAU * h * sum_{b in N6(n)} (Z_e(b) - Z_e(n))
// The sum runs over intracellularly coupled neighbours only. The right and left atrial walls touch along the
// interatrial septal plane but are not coupled there (they connect only through Bachmann's bundle, the coronary sinus
// and the fossa rim, which are explicit graph edges), so an RA/LA face is a no-flux boundary like the AV ring: a
// depolarised RA beside a resting LA is not a source across the septum.
export function nodeWeights(g: Geom, ls: LeadSystem): Float64Array[] {
  const n = g.n; const hm = g.h / 1000;
  const W: Float64Array[] = [];
  const coupled = (i: number, j: number) => g.dom[i] !== DOM.A || g.ch[i] === g.ch[j];
  for (let e = 0; e < ELECTRODES.length; e++) {
    const Zn = new Float64Array(n);
    for (let i = 0; i < n; i++) Zn[i] = ls.Z(e, g.pos[3 * i], g.pos[3 * i + 1], g.pos[3 * i + 2]);
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let q = g.nb6.start[i]; q < g.nb6.start[i + 1]; q++) { const j = g.nb6.idx[q]; if (coupled(i, j)) s += Zn[j] - Zn[i]; }
      w[i] = TAU * hm * s;
    }
    W.push(w);
  }
  return W;
}

// effective lead vectors (gradient of Z) at a body point, for diagnostics: returns per electrode grad Z (V/A per m)
export function leadVectorsAt(ls: LeadSystem, p: Vec3): Vec3[] {
  const d = 1.0; // mm
  return ELECTRODES.map((_, e) => {
    const gx = (ls.Z(e, p[0] + d, p[1], p[2]) - ls.Z(e, p[0] - d, p[1], p[2])) / (2 * d / 1000);
    const gy = (ls.Z(e, p[0], p[1] + d, p[2]) - ls.Z(e, p[0], p[1] - d, p[2])) / (2 * d / 1000);
    const gz = (ls.Z(e, p[0], p[1], p[2] + d) - ls.Z(e, p[0], p[1], p[2] - d)) / (2 * d / 1000);
    return [gx, gy, gz] as Vec3;
  });
}
