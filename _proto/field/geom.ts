// geom.ts — coarse anatomical heart: voxelised analytic shells in a local heart frame, posed in the thorax.
//
// Local heart frame (mm): +x LV lateral (septum -> LV free wall), +y apex -> base, +z "anterior" in heart terms
// (the AHA anterior wall). Origin = centre of the LV ellipsoids.
// Body frame (mm): +x patient left, +y superior, +z anterior. Origin = midsagittal plane at the level of the 4th
// intercostal space, z = 0 at mid torso depth.

export type Vec3 = [number, number, number];

export const DOM = { V: 0, A: 1 } as const;
export const CH = { LV: 0, RV: 1, RA: 2, LA: 3 } as const;
// surface flags
export const SF = { LV_ENDO: 1, RV_ENDO: 2, EPI: 4, SEPTAL: 8, RVOT: 16, PURK: 32 } as const;

export interface GeomParams {
  h: number;
  lvEndoR: number; lvEndoL: number; lvEpiR: number; lvEpiL: number; yBase: number;
  rvC: Vec3; rvEpi: Vec3; rvWall: number; rvotP0Body: Vec3; rvotP1Body: Vec3; rvotR: number;
  raC: Vec3; raAx: Vec3; laC: Vec3; laAx: Vec3; atrialWall: number; avGap: number;
  svcR: number; ivcR: number;
  az: number; el: number; roll: number; apexBody: Vec3;
  purkAbMaxLV: number; purkAbMaxRV: number;
}

export const DEFAULT_GEOM: GeomParams = {
  h: 2.5,
  lvEndoR: 24, lvEndoL: 58, lvEpiR: 33, lvEpiL: 67, yBase: 22,
  rvC: [-18, 2, 0], rvEpi: [38, 60, 37], rvWall: 5, rvotP0Body: [-4, -13, 60], rvotP1Body: [16, 21, 52], rvotR: 14,
  raC: [-36, 40, 2], raAx: [26, 22, 23], laC: [4, 40, -8], laAx: [26, 21, 22], atrialWall: 4, avGap: 3,
  svcR: 9, ivcR: 11,
  az: 44, el: 26, roll: 0, apexBody: [68, -45, 66],
  purkAbMaxLV: 0.82, purkAbMaxRV: 0.78,
};

export interface Geom {
  p: GeomParams;
  n: number;
  h: number;
  pos: Float64Array;   // body mm (3n)
  loc: Float64Array;   // local mm (3n)
  nrm: Float64Array;   // local unit transmural (outward) direction (3n)
  dom: Uint8Array;     // DOM
  ch: Uint8Array;      // CH
  sf: Uint8Array;      // SF bit flags
  tm: Float32Array;    // 0 endo .. 1 epi
  ab: Float32Array;    // 0 apex .. 1 base (>1 RVOT)
  th: Float32Array;    // angle around long axis, degrees: 0 lateral, 90 anterior, 180 septal, -90 inferior
  nb26: { start: Int32Array; idx: Int32Array; len: Float32Array };
  nb6: { start: Int32Array; idx: Int32Array };
  // insulated boundary faces (myocardium abutting the fibrous AV ring / valve annuli): body positions of the virtual
  // neighbour across each such face. The lead weights treat them as no-flux boundaries (no double layer there).
  ins: { start: Int32Array; pos: Float64Array };
  R: number[];         // 3x3 local->body, row-major
  cLV: Vec3;           // body position of local origin
  bodyToLocalDir(v: Vec3): Vec3;
  localToBody(v: Vec3): Vec3;
  nearest(localPt: Vec3, filter: (i: number) => boolean): number;
}

function norm(v: Vec3): Vec3 { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a: Vec3, b: Vec3): Vec3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

export function poseFrame(p: GeomParams): { R: number[]; cLV: Vec3 } {
  const d2r = Math.PI / 180;
  const el = p.el * d2r, az = p.az * d2r;
  const a: Vec3 = [Math.cos(el) * Math.sin(az), -Math.sin(el), Math.cos(el) * Math.cos(az)]; // apex direction
  const yL: Vec3 = [-a[0], -a[1], -a[2]];
  const up: Vec3 = [0, 1, 0];
  const ua = dot(up, a);
  let zL = norm([up[0] - ua * a[0], up[1] - ua * a[1], up[2] - ua * a[2]]);
  let xL = norm(cross(yL, zL));
  // roll about the long axis
  const r = p.roll * d2r, cr = Math.cos(r), sr = Math.sin(r);
  const x2: Vec3 = [cr * xL[0] + sr * zL[0], cr * xL[1] + sr * zL[1], cr * xL[2] + sr * zL[2]];
  const z2: Vec3 = [-sr * xL[0] + cr * zL[0], -sr * xL[1] + cr * zL[1], -sr * xL[2] + cr * zL[2]];
  xL = x2; zL = z2;
  // R maps local -> body: body = cLV + R * local ; columns xL, yL, zL
  const R = [xL[0], yL[0], zL[0], xL[1], yL[1], zL[1], xL[2], yL[2], zL[2]];
  const cLV: Vec3 = [p.apexBody[0] - p.lvEpiL * a[0], p.apexBody[1] - p.lvEpiL * a[1], p.apexBody[2] - p.lvEpiL * a[2]];
  return { R, cLV };
}

const OUT = 0, LVM = 1, RVM = 2, RAM = 3, LAM = 4, LVC = 5, RVC = 6, RAC = 7, LAC = 8;

export function buildGeom(p: GeomParams = DEFAULT_GEOM): Geom {
  const { R, cLV } = poseFrame(p);
  const toBodyDir = (v: Vec3): Vec3 => [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
  const toLocalDir = (v: Vec3): Vec3 => [R[0] * v[0] + R[3] * v[1] + R[6] * v[2], R[1] * v[0] + R[4] * v[1] + R[7] * v[2], R[2] * v[0] + R[5] * v[1] + R[8] * v[2]];
  const h = p.h;
  const x0 = -75, x1 = 55, y0 = -p.lvEpiL - 4, y1 = 72, z0 = -52, z1 = 58;
  const nx = Math.floor((x1 - x0) / h) + 1, ny = Math.floor((y1 - y0) / h) + 1, nz = Math.floor((z1 - z0) / h) + 1;
  const G = new Uint8Array(nx * ny * nz);
  const gi = (i: number, j: number, k: number) => (i * ny + j) * nz + k;

  const ell = (x: number, y: number, z: number, c: Vec3, ax: Vec3) => {
    const a = (x - c[0]) / ax[0], b = (y - c[1]) / ax[1], d = (z - c[2]) / ax[2];
    return a * a + b * b + d * d;
  };
  const rvEndoAx: Vec3 = [p.rvEpi[0] - p.rvWall, p.rvEpi[1] - p.rvWall, p.rvEpi[2] - p.rvWall];
  const w = p.atrialWall;
  const raEndoAx: Vec3 = [p.raAx[0] - w, p.raAx[1] - w, p.raAx[2] - w];
  const laEndoAx: Vec3 = [p.laAx[0] - w, p.laAx[1] - w, p.laAx[2] - w];
  const dSVC = norm(toLocalDir(norm(SVC_BODY)));
  const dIVC = norm(toLocalDir(norm(IVC_BODY)));
  const inHole = (x: number, y: number, z: number, c: Vec3, d: Vec3, r: number) => {
    const v: Vec3 = [x - c[0], y - c[1], z - c[2]];
    const s = dot(v, d);
    if (s <= 0) return false;
    const px = v[0] - s * d[0], py = v[1] - s * d[1], pz = v[2] - s * d[2];
    return px * px + py * py + pz * pz < r * r;
  };
  // RVOT tube (local), from P0 (inside RV body) to P1 (pulmonary valve, open end)
  const toLoc = (b: Vec3): Vec3 => toLocalDir([b[0] - cLV[0], b[1] - cLV[1], b[2] - cLV[2]]);
  const P0 = toLoc(p.rvotP0Body), P1 = toLoc(p.rvotP1Body);
  const tv: Vec3 = [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]];
  const tl2 = dot(tv, tv);
  const tube = (x: number, y: number, z: number): number => { // returns radial distance or Infinity if outside length
    const v: Vec3 = [x - P0[0], y - P0[1], z - P0[2]];
    const s = dot(v, tv) / tl2;
    if (s < 0 || s > 1) return Infinity;
    const px = v[0] - s * tv[0], py = v[1] - s * tv[1], pz = v[2] - s * tv[2];
    return Math.sqrt(px * px + py * py + pz * pz);
  };
  // interatrial septal plane
  const sepN = norm([p.laC[0] - p.raC[0], p.laC[1] - p.raC[1], p.laC[2] - p.raC[2]]);
  const sepM: Vec3 = [0.5 * (p.raC[0] + p.laC[0]), 0.5 * (p.raC[1] + p.laC[1]), 0.5 * (p.raC[2] + p.laC[2])];
  const sepHalf = 2.2;

  for (let i = 0; i < nx; i++) {
    const x = x0 + i * h;
    for (let j = 0; j < ny; j++) {
      const y = y0 + j * h;
      for (let k = 0; k < nz; k++) {
        const z = z0 + k * h;
        const rr = x * x + z * z;
        const fEpi = rr / (p.lvEpiR * p.lvEpiR) + (y * y) / (p.lvEpiL * p.lvEpiL);
        const fEndo = rr / (p.lvEndoR * p.lvEndoR) + (y * y) / (p.lvEndoL * p.lvEndoL);
        const belowBase = y <= p.yBase;
        const inLVepi = belowBase && fEpi <= 1;
        const inLVcav = belowBase && fEndo < 1;
        let lab = OUT;
        if (inLVcav) lab = LVC;
        else if (inLVepi) lab = LVM;
        else {
          const td = tube(x, y, z);
          const inRVepi = (belowBase && ell(x, y, z, p.rvC, p.rvEpi) <= 1) || td <= p.rvotR;
          const inRVcav = (belowBase && ell(x, y, z, p.rvC, rvEndoAx) < 1) || td < p.rvotR - p.rvWall;
          if (inRVepi && inRVcav) lab = RVC;
          else if (inRVepi) lab = RVM;
          else if (y >= p.yBase + p.avGap) {
            const sd = (x - sepM[0]) * sepN[0] + (y - sepM[1]) * sepN[1] + (z - sepM[2]) * sepN[2];
            const inRAe = ell(x, y, z, p.raC, p.raAx) <= 1 && sd <= sepHalf;
            const inLAe = ell(x, y, z, p.laC, p.laAx) <= 1 && sd >= -sepHalf;
            const inRAc = ell(x, y, z, p.raC, raEndoAx) < 1 && sd < -sepHalf;
            const inLAc = ell(x, y, z, p.laC, laEndoAx) < 1 && sd > sepHalf;
            if (inRAc) lab = RAC;
            else if (inLAc) lab = LAC;
            else if (inRAe || inLAe) {
              const hole = sd < 0 && (inHole(x, y, z, p.raC, dSVC, p.svcR) || inHole(x, y, z, p.raC, dIVC, p.ivcR));
              if (!hole) lab = sd < 0 ? RAM : LAM;
            }
          }
        }
        G[gi(i, j, k)] = lab;
      }
    }
  }
  // fibrous AV ring: remove atrial myocardium touching ventricular myocardium/cavity (26-neighbourhood)
  const isV = (l: number) => l === LVM || l === RVM || l === LVC || l === RVC;
  const isA = (l: number) => l === RAM || l === LAM;
  const kill: number[] = [];
  for (let i = 1; i < nx - 1; i++) for (let j = 1; j < ny - 1; j++) for (let k = 1; k < nz - 1; k++) {
    const l = G[gi(i, j, k)];
    if (!isA(l)) continue;
    let near = false;
    for (let di = -1; di <= 1 && !near; di++) for (let dj = -1; dj <= 1 && !near; dj++) for (let dk = -1; dk <= 1; dk++) {
      if (isV(G[gi(i + di, j + dj, k + dk)])) { near = true; break; }
    }
    if (near) kill.push(gi(i, j, k));
  }
  for (const q of kill) G[q] = OUT;

  // index myocardial voxels
  const idx = new Int32Array(nx * ny * nz).fill(-1);
  const list: number[] = [];
  for (let q = 0; q < G.length; q++) {
    const l = G[q];
    if (l === LVM || l === RVM || l === RAM || l === LAM) { idx[q] = list.length; list.push(q); }
  }
  // connected components per domain (6-connectivity); keep the largest per domain
  const isMyo = (l: number) => l === LVM || l === RVM || l === RAM || l === LAM;
  const domOf = (l: number) => (l === RAM || l === LAM ? DOM.A : DOM.V);
  const comp = new Int32Array(list.length).fill(-1);
  const compSize: number[] = [];
  const compDom: number[] = [];
  const off6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const unpack = (q: number): [number, number, number] => { const k = q % nz; const t = (q - k) / nz; const j = t % ny; const i = (t - j) / ny; return [i, j, k]; };
  for (let s = 0; s < list.length; s++) {
    if (comp[s] >= 0) continue;
    const c = compSize.length; let size = 0; const d = domOf(G[list[s]]);
    const stack = [s]; comp[s] = c;
    while (stack.length) {
      const u = stack.pop()!; size++;
      const [i, j, k] = unpack(list[u]);
      for (const o of off6) {
        const ii = i + o[0], jj = j + o[1], kk = k + o[2];
        if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
        const q = gi(ii, jj, kk); const v = idx[q];
        if (v < 0 || comp[v] >= 0 || domOf(G[q]) !== d) continue;
        comp[v] = c; stack.push(v);
      }
    }
    compSize.push(size); compDom.push(d);
  }
  const best = [-1, -1];
  for (let c = 0; c < compSize.length; c++) { const d = compDom[c]; if (best[d] < 0 || compSize[c] > compSize[best[d]]) best[d] = c; }
  const keep: number[] = [];
  for (let s = 0; s < list.length; s++) if (comp[s] === best[domOf(G[list[s]])]) keep.push(list[s]);
  idx.fill(-1);
  keep.forEach((q, s) => { idx[q] = s; });
  const n = keep.length;

  const pos = new Float64Array(3 * n), loc = new Float64Array(3 * n), nrm = new Float64Array(3 * n);
  const dom = new Uint8Array(n), ch = new Uint8Array(n), sf = new Uint8Array(n);
  const tm = new Float32Array(n), ab = new Float32Array(n), th = new Float32Array(n);
  const yApex = -p.lvEpiL;
  for (let s = 0; s < n; s++) {
    const q = keep[s]; const [i, j, k] = unpack(q);
    const x = x0 + i * h, y = y0 + j * h, z = z0 + k * h;
    loc[3 * s] = x; loc[3 * s + 1] = y; loc[3 * s + 2] = z;
    const b = toBodyDir([x, y, z]);
    pos[3 * s] = cLV[0] + b[0]; pos[3 * s + 1] = cLV[1] + b[1]; pos[3 * s + 2] = cLV[2] + b[2];
    const l = G[q];
    dom[s] = domOf(l);
    ch[s] = l === LVM ? CH.LV : l === RVM ? CH.RV : l === RAM ? CH.RA : CH.LA;
    ab[s] = (y - yApex) / (p.yBase - yApex);
    th[s] = Math.atan2(z, x) * 180 / Math.PI;
    let nv: Vec3;
    if (l === LVM) {
      const Rm = 0.5 * (p.lvEpiR + p.lvEndoR), Lm = 0.5 * (p.lvEpiL + p.lvEndoL);
      nv = norm([x / (Rm * Rm), y / (Lm * Lm), z / (Rm * Rm)]);
      const rr = x * x + z * z;
      const re = Math.sqrt(rr / (p.lvEndoR * p.lvEndoR) + (y * y) / (p.lvEndoL * p.lvEndoL));
      const ro = Math.sqrt(rr / (p.lvEpiR * p.lvEpiR) + (y * y) / (p.lvEpiL * p.lvEpiL));
      tm[s] = Math.min(1, Math.max(0, (1 - 1 / re) / (1 / ro - 1 / re)));
    } else if (l === RVM) {
      const c = p.rvC, a = p.rvEpi;
      nv = norm([(x - c[0]) / (a[0] * a[0]), (y - c[1]) / (a[1] * a[1]), (z - c[2]) / (a[2] * a[2])]);
      const re = Math.sqrt(ell(x, y, z, c, rvEndoAx)), ro = Math.sqrt(ell(x, y, z, c, p.rvEpi));
      tm[s] = Math.min(1, Math.max(0, (1 - 1 / re) / (1 / ro - 1 / re)));
    } else {
      const c = l === RAM ? p.raC : p.laC, a = l === RAM ? p.raAx : p.laAx;
      nv = norm([(x - c[0]) / (a[0] * a[0]), (y - c[1]) / (a[1] * a[1]), (z - c[2]) / (a[2] * a[2])]);
      tm[s] = 0.5;
    }
    nrm[3 * s] = nv[0]; nrm[3 * s + 1] = nv[1]; nrm[3 * s + 2] = nv[2];
    if (l === RVM && tube(x, y, z) <= p.rvotR + 1) sf[s] |= SF.RVOT;
    // surface flags from 6-neighbours
    for (const o of off6) {
      const ii = i + o[0], jj = j + o[1], kk = k + o[2];
      const lab = ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz ? OUT : G[gi(ii, jj, kk)];
      if (lab === LVC && l === LVM) sf[s] |= SF.LV_ENDO;
      if (lab === RVC && (l === LVM || l === RVM)) sf[s] |= SF.RV_ENDO;
      if ((l === LVM || l === RVM) && (lab === OUT || lab === RAM || lab === LAM || lab === RAC || lab === LAC)) sf[s] |= SF.EPI;
    }
  }
  // septum: LV myocardium whose outward radial ray hits the RV cavity
  for (let s = 0; s < n; s++) {
    if (ch[s] !== CH.LV) continue;
    const x = loc[3 * s], y = loc[3 * s + 1], z = loc[3 * s + 2];
    const rr = x * x + z * z;
    const ro = Math.sqrt(rr / (p.lvEpiR * p.lvEpiR) + (y * y) / (p.lvEpiL * p.lvEpiL));
    const f = 1 / ro + 3 / Math.hypot(x, y, z);
    const qx = x * f, qy = y * f, qz = z * f;
    if (qy <= p.yBase && ell(qx, qy, qz, p.rvC, rvEndoAx) < 1) sf[s] |= SF.SEPTAL;
  }
  // Purkinje eligibility
  for (let s = 0; s < n; s++) {
    if (dom[s] !== DOM.V) continue;
    if ((sf[s] & SF.LV_ENDO) && ab[s] < p.purkAbMaxLV) sf[s] |= SF.PURK;
    if ((sf[s] & SF.RV_ENDO) && !(sf[s] & SF.RVOT) && ab[s] < p.purkAbMaxRV) sf[s] |= SF.PURK;
  }
  // neighbours
  const s26: number[] = [], i26: number[] = [], l26: number[] = [];
  const s6: number[] = [], i6: number[] = [];
  for (let s = 0; s < n; s++) {
    const [i, j, k] = unpack(keep[s]);
    s26.push(i26.length); s6.push(i6.length);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) {
      if (!di && !dj && !dk) continue;
      const ii = i + di, jj = j + dj, kk = k + dk;
      if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
      const v = idx[gi(ii, jj, kk)];
      if (v < 0 || dom[v] !== dom[s]) continue;
      i26.push(v); l26.push(h * Math.sqrt(di * di + dj * dj + dk * dk));
      if (Math.abs(di) + Math.abs(dj) + Math.abs(dk) === 1) i6.push(v);
    }
  }
  s26.push(i26.length); s6.push(i6.length);
  // insulated faces: ventricular top faces cut by the base plane, the RVOT end at the pulmonary annulus, and the
  // atrial floor facing the AV ring
  const insS: number[] = [], insP: number[] = [];
  for (let s = 0; s < n; s++) {
    insS.push(insP.length / 3);
    const [i, j, k] = unpack(keep[s]);
    const x = x0 + i * h, y = y0 + j * h, z = z0 + k * h;
    for (const o of off6) {
      const ii = i + o[0], jj = j + o[1], kk = k + o[2];
      const inside = !(ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz);
      const v = inside ? idx[gi(ii, jj, kk)] : -1;
      if (v >= 0 && dom[v] === dom[s]) continue;
      const qx = x + o[0] * h, qy = y + o[1] * h, qz = z + o[2] * h;
      let insul = false;
      if (dom[s] === DOM.V) {
        if (o[1] === 1 && qy > p.yBase && tube(qx, qy, qz) > p.rvotR) insul = true;
        if (sf[s] & SF.RVOT) { const vv: Vec3 = [qx - P0[0], qy - P0[1], qz - P0[2]]; if (dot(vv, tv) / tl2 > 1) insul = true; }
      } else if (o[1] === -1 && qy < p.yBase + p.avGap + 2 * h) insul = true;
      if (insul) { const b = toBodyDir([qx, qy, qz]); insP.push(cLV[0] + b[0], cLV[1] + b[1], cLV[2] + b[2]); }
    }
  }
  insS.push(insP.length / 3);
  const geom: Geom = {
    p, n, h, pos, loc, nrm, dom, ch, sf, tm, ab, th,
    nb26: { start: Int32Array.from(s26), idx: Int32Array.from(i26), len: Float32Array.from(l26) },
    nb6: { start: Int32Array.from(s6), idx: Int32Array.from(i6) },
    ins: { start: Int32Array.from(insS), pos: Float64Array.from(insP) },
    R, cLV,
    bodyToLocalDir: toLocalDir,
    localToBody: (v: Vec3): Vec3 => { const b = toBodyDir(v); return [cLV[0] + b[0], cLV[1] + b[1], cLV[2] + b[2]]; },
    nearest(pt: Vec3, filter: (i: number) => boolean): number {
      let bi = -1, bd = Infinity;
      for (let s = 0; s < n; s++) {
        if (!filter(s)) continue;
        const dx = loc[3 * s] - pt[0], dy = loc[3 * s + 1] - pt[1], dz = loc[3 * s + 2] - pt[2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bd) { bd = d; bi = s; }
      }
      return bi;
    },
  };
  return geom;
}

export const SVC_BODY: Vec3 = [0.05, 1, -0.25];
export const IVC_BODY: Vec3 = [0.0, -1, -0.55];
export { norm, cross, dot };
