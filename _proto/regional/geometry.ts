/**
 * Procedural heart geometry for the regional-dipole model.
 *
 * Ventricles: a truncated prolate-ellipsoid LV shell (endocardium, epicardium, basal rim) plus a crescent RV free-wall
 * shell (inner, outer, top rim) that wraps the septal side and funnels up into the outflow tract. Both shells are closed
 * surfaces, so the summed area vector of all patches is ~0 (checked), which is what makes the ST segment isoelectric.
 * Patches are tagged with one of 22 anatomical regions (AHA 17-segment LV + 5 RV) and a face: IN (endocardial side;
 * septum: LV side), OUT (epicardial side; septum: RV side) or RIM (basal ring, shares the mean state of IN/OUT).
 *
 * Atria: 7 regions (point sources with a propagation direction per activation; thin walls → wavefront dipoles).
 *
 * Frame: app body frame, cm, origin = ventricular centroid: +x patient left, +y superior, +z anterior.
 */
import type { V3 } from './vec.ts';
import { add, cross, dot, madd, norm, scale, sub, unit, DEG } from './vec.ts';

export interface HeartParams {
  /** Base→apex long-axis direction (body frame). */
  apexDir: V3;
  /** Approximate LV→RV (septal normal) direction; orthogonalised against apexDir. */
  septDir: V3;
  lvRin: number; // LV endocardial radius at the base equator (cm)
  lvHin: number; // LV endocardial length base plane → apex (cm)
  lvWall: number; // LV wall thickness at the equator (cm)
  lvApexWall: number; // LV wall thickness at the apex (cm)
  septWall: number; // septal thickness (cm) — only used for the transmural conduction time
  rvDepth: number; // max RV cavity depth (cm)
  rvWall: number; // RV free-wall thickness (cm)
  rvPhiDeg: number; // RV attachment half-angle around the septal direction (deg)
  rvTheta0Deg: number; // where the RV cavity closes toward the apex (θ, deg; 0 = LV apex)
  rvotExtDeg: number; // extension of the anterior RV free wall above the base plane (deg of θ beyond 90)
  shift: V3; // translation of the whole heart in the thorax (cm)
}

export const DEFAULT_HEART: HeartParams = {
  apexDir: [0.62, -0.5, 0.6],
  septDir: [-0.7, 0, 0.7],
  lvRin: 2.3,
  lvHin: 6.6,
  lvWall: 1.0,
  lvApexWall: 0.8,
  septWall: 1.0,
  rvDepth: 2.0,
  rvWall: 0.6,
  rvPhiDeg: 64,
  rvTheta0Deg: 22,
  rvotExtDeg: 26,
  shift: [0, 0, 0],
};

export const FACE = { IN: 0, OUT: 1, RIM: 2 } as const;

/** Body-frame direction in which the outflow tract rises above the base plane (in front of the aortic root). */
const RVOT_LIFT: V3 = unit([0.35, 0.25, 0.9]);

export interface Patch {
  c: V3; // centroid
  a: V3; // area vector (outward from myocardium), cm²
  region: number;
  face: number; // FACE.*
}

export type VKind = 'LV' | 'SEPT' | 'RV';

export interface VRegion {
  id: string;
  name: string;
  kind: VKind;
  /** Long-axis position 0 = apex … 1 = base (>1 above the base plane, RVOT). */
  z: number;
  /** Wall thickness (cm). */
  wall: number;
  cIn: V3;
  cOut: V3;
  c: V3;
  aIn: V3;
  aOut: V3;
  aRim: V3;
  areaIn: number;
  areaOut: number;
}

export interface ARegion {
  id: string;
  name: string;
  c: V3;
  /** Size of the region along the propagation path (cm). */
  extent: number;
  /** Wavefront moment scale (wall thickness × front length, arbitrary units). */
  m: number;
}

export interface Heart {
  params: HeartParams;
  eL: V3; // base→apex
  eS: V3; // LV→RV
  eA: V3; // LV anterior wall direction
  patches: Patch[];
  vregions: VRegion[];
  aregions: ARegion[];
  /** Index lookup by id (ventricular then atrial; atrial indices offset by vregions.length). */
  index: Record<string, number>;
  closureResidual: V3;
  totalArea: number;
}

// AHA 17-segment ids (LV) + RV + atria. Order defines the region index.
export const V_IDS = [
  'b_ant', 'b_antsep', 'b_infsep', 'b_inf', 'b_inflat', 'b_antlat',
  'm_ant', 'm_antsep', 'm_infsep', 'm_inf', 'm_inflat', 'm_antlat',
  'a_ant', 'a_sep', 'a_inf', 'a_lat', 'apex',
  'rv_apex', 'rv_ant', 'rv_free', 'rv_inf', 'rvot',
] as const;

const V_NAMES: Record<string, string> = {
  b_ant: 'LV basal anterior', b_antsep: 'basal anteroseptal', b_infsep: 'basal inferoseptal', b_inf: 'LV basal inferior',
  b_inflat: 'LV basal inferolateral', b_antlat: 'LV basal anterolateral',
  m_ant: 'LV mid anterior', m_antsep: 'mid anteroseptal', m_infsep: 'mid inferoseptal', m_inf: 'LV mid inferior',
  m_inflat: 'LV mid inferolateral', m_antlat: 'LV mid anterolateral',
  a_ant: 'LV apical anterior', a_sep: 'apical septal', a_inf: 'LV apical inferior', a_lat: 'LV apical lateral', apex: 'LV apex',
  rv_apex: 'RV apical', rv_ant: 'RV anterior (paraseptal)', rv_free: 'RV free wall', rv_inf: 'RV inferior', rvot: 'RV outflow tract',
};

export const A_IDS = ['sa', 'ra_lat', 'ra_cti', 'ra_sep', 'bachmann', 'la_ant', 'la_post'] as const;
const A_NAMES: Record<string, string> = {
  sa: 'high RA (sinus node)', ra_lat: 'RA lateral wall', ra_cti: 'cavotricuspid isthmus', ra_sep: 'interatrial septum (low)',
  bachmann: "Bachmann's bundle / roof", la_ant: 'LA anterior wall + appendage', la_post: 'LA posterior wall',
};

/** Atrial centroids as body-frame offsets from the base-plane centre for the default pose (cm). */
const A_OFFSETS: Record<string, { o: V3; extent: number; m: number }> = {
  sa: { o: [-2.8, 4.1, -0.3], extent: 2.2, m: 0.9 },
  ra_lat: { o: [-4.3, 1.1, 0.2], extent: 3.2, m: 1.0 },
  ra_cti: { o: [-2.3, -1.6, -0.3], extent: 2.4, m: 0.6 },
  ra_sep: { o: [-0.8, 0.4, -1.8], extent: 2.6, m: 0.8 },
  bachmann: { o: [0.2, 3.4, -1.3], extent: 2.8, m: 0.8 },
  la_ant: { o: [3.7, 2.4, -1.8], extent: 3.2, m: 1.0 },
  la_post: { o: [1.7, 1.1, -3.3], extent: 3.4, m: 1.2 },
};

function lvRegion(thDeg: number, phDeg: number): string {
  if (thDeg < 20) return 'apex';
  if (thDeg < 48.19) {
    if (phDeg >= -45 && phDeg < 45) return 'a_sep';
    if (phDeg >= 45 && phDeg < 135) return 'a_ant';
    if (phDeg >= -135 && phDeg < -45) return 'a_inf';
    return 'a_lat';
  }
  const lvl = thDeg < 70.53 ? 'm_' : 'b_';
  let s: string;
  if (phDeg >= 0 && phDeg < 60) s = 'antsep';
  else if (phDeg >= 60 && phDeg < 120) s = 'ant';
  else if (phDeg >= 120) s = 'antlat';
  else if (phDeg >= -60) s = 'infsep';
  else if (phDeg >= -120) s = 'inf';
  else s = 'inflat';
  return lvl + s;
}

function rvRegion(thDeg: number, phDeg: number): string {
  if (thDeg < 48.19) return 'rv_apex';
  if (thDeg > 76 && phDeg > 14 && phDeg < 76) return 'rvot';
  if (phDeg > 28) return 'rv_ant';
  if (phDeg < -28) return 'rv_inf';
  return 'rv_free';
}

/** Vector area of a (possibly non-planar) quad p00,p10,p11,p01 = ½ (p11 − p00) × (p01 − p10). */
function quadArea(p00: V3, p10: V3, p11: V3, p01: V3): V3 {
  return scale(cross(sub(p11, p00), sub(p01, p10)), 0.5);
}
const quadCentre = (p00: V3, p10: V3, p11: V3, p01: V3): V3 => scale(add(add(p00, p10), add(p11, p01)), 0.25);

export function buildHeart(p: HeartParams = DEFAULT_HEART): Heart {
  const eL = unit(p.apexDir);
  const s0 = p.septDir;
  const eS = unit(sub(s0, scale(eL, dot(s0, eL))));
  const eA = unit(cross(eS, eL));
  const er = (ph: number): V3 => add(scale(eS, Math.cos(ph)), scale(eA, Math.sin(ph)));

  const Ri = p.lvRin, Hi = p.lvHin, Ro = p.lvRin + p.lvWall, Ho = p.lvHin + p.lvApexWall;
  const B: V3 = [0, 0, 0];
  const lvPt = (th: number, ph: number, H: number, R: number): V3 => add(add(B, scale(eL, H * Math.cos(th))), scale(er(ph), R * Math.sin(th)));

  const patches: Patch[] = [];
  const vidx: Record<string, number> = {};
  V_IDS.forEach((id, i) => (vidx[id] = i));

  // θ nodes aligned with the AHA level boundaries (20°, 48.19°, 70.53°)
  const TH: number[] = [];
  const seg = (a: number, b: number, n: number) => { for (let i = 0; i < n; i++) TH.push(a + ((b - a) * i) / n); };
  seg(0, 20, 4); seg(20, 48.19, 6); seg(48.19, 70.53, 5); seg(70.53, 90, 5); TH.push(90);
  const NPH = 72;
  const PH = Array.from({ length: NPH + 1 }, (_, j) => -180 + (360 * j) / NPH);

  // LV endo / epi
  for (let i = 0; i < TH.length - 1; i++) {
    for (let j = 0; j < NPH; j++) {
      const t0 = TH[i] * DEG, t1 = TH[i + 1] * DEG, f0 = PH[j] * DEG, f1 = PH[j + 1] * DEG;
      const reg = vidx[lvRegion((TH[i] + TH[i + 1]) / 2, (PH[j] + PH[j + 1]) / 2)];
      for (const [face, H, R] of [[FACE.IN, Hi, Ri], [FACE.OUT, Ho, Ro]] as const) {
        const p00 = lvPt(t0, f0, H, R), p10 = lvPt(t1, f0, H, R), p11 = lvPt(t1, f1, H, R), p01 = lvPt(t0, f1, H, R);
        let a = quadArea(p00, p10, p11, p01);
        const c = quadCentre(p00, p10, p11, p01);
        // outward from myocardium: epi → away from axis, endo → toward the cavity axis
        const radial = sub(c, add(B, scale(eL, dot(sub(c, B), eL))));
        const outward = face === FACE.OUT ? radial : scale(radial, -1);
        const ref = norm(radial) > 1e-6 ? outward : face === FACE.OUT ? eL : scale(eL, -1);
        if (dot(a, ref) < 0) a = scale(a, -1);
        patches.push({ c, a, region: reg, face });
      }
    }
  }
  // LV basal rim (annulus in the base plane), outward = −eL
  for (let j = 0; j < NPH; j++) {
    const f0 = PH[j] * DEG, f1 = PH[j + 1] * DEG;
    const reg = vidx[lvRegion(80, (PH[j] + PH[j + 1]) / 2)];
    const p00 = lvPt(Math.PI / 2, f0, Hi, Ri), p10 = lvPt(Math.PI / 2, f0, Ho, Ro), p11 = lvPt(Math.PI / 2, f1, Ho, Ro), p01 = lvPt(Math.PI / 2, f1, Hi, Ri);
    let a = quadArea(p00, p10, p11, p01);
    if (dot(a, eL) > 0) a = scale(a, -1);
    patches.push({ c: quadCentre(p00, p10, p11, p01), a, region: reg, face: FACE.RIM });
  }

  // RV free wall: crescent over φ ∈ [−φrv, φrv], θ ∈ [θ0, θtop(φ)]
  const phRv = p.rvPhiDeg, th0 = p.rvTheta0Deg;
  const topDeg = (phd: number): number => {
    const x = (phd - 4) / 76; // anterior sector 4°..80° funnels up into the RVOT
    return 90 + (x > 0 && x < 1 ? p.rvotExtDeg * Math.pow(Math.sin(Math.PI * x), 0.8) : 0);
  };
  const D = (thd: number, phd: number): number => {
    const g = Math.abs(phd) >= phRv ? 0 : Math.pow(Math.cos((Math.PI / 2) * (phd / phRv)), 0.6);
    const x = (thd - th0) / (90 - th0);
    const f = x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(Math.sin((Math.PI / 2) * x), 0.7);
    return p.rvDepth * g * f;
  };
  const tRv = (dd: number): number => p.rvWall * Math.min(1, dd / 0.6);
  const rvPt = (thd: number, phd: number, outer: boolean): V3 => {
    const th = thd * DEG;
    const dd = D(thd, phd);
    const rho = Ro * Math.sin(th) + dd + (outer ? tRv(dd) : 0);
    // above the base plane the outflow tract bends toward the anterior-superior-left (in front of the aortic root)
    const lift = thd > 90 ? (thd - 90) * 0.11 : 0;
    return add(add(add(B, scale(eL, Ho * Math.cos(th))), scale(er(phd * DEG), rho)), scale(RVOT_LIFT, lift));
  };
  const NV = 18, NPR = 40;
  const phR = Array.from({ length: NPR + 1 }, (_, j) => -phRv + (2 * phRv * j) / NPR);
  const thAt = (v: number, phd: number): number => th0 + v * (topDeg(phd) - th0);
  for (let i = 0; i < NV; i++) {
    for (let j = 0; j < NPR; j++) {
      const v0 = i / NV, v1 = (i + 1) / NV, a0 = phR[j], a1 = phR[j + 1];
      const thc = thAt((v0 + v1) / 2, (a0 + a1) / 2);
      const reg = vidx[rvRegion(thc, (a0 + a1) / 2)];
      for (const outer of [false, true]) {
        const p00 = rvPt(thAt(v0, a0), a0, outer), p10 = rvPt(thAt(v1, a0), a0, outer);
        const p11 = rvPt(thAt(v1, a1), a1, outer), p01 = rvPt(thAt(v0, a1), a1, outer);
        let a = quadArea(p00, p10, p11, p01);
        const c = quadCentre(p00, p10, p11, p01);
        const radial = sub(c, add(B, scale(eL, dot(sub(c, B), eL))));
        if (dot(a, outer ? radial : scale(radial, -1)) < 0) a = scale(a, -1);
        patches.push({ c, a, region: reg, face: outer ? FACE.OUT : FACE.IN });
      }
    }
  }
  // RV top rim (tricuspid / pulmonary end), outward ≈ along increasing θ
  for (let j = 0; j < NPR; j++) {
    const a0 = phR[j], a1 = phR[j + 1];
    const p00 = rvPt(thAt(1, a0), a0, false), p10 = rvPt(thAt(1, a0), a0, true), p11 = rvPt(thAt(1, a1), a1, true), p01 = rvPt(thAt(1, a1), a1, false);
    let a = quadArea(p00, p10, p11, p01);
    const c = quadCentre(p00, p10, p11, p01);
    if (norm(a) < 1e-9) continue;
    const thc = thAt(1, (a0 + a1) / 2);
    // direction of increasing θ along the wall (away from the cavity's closed end)
    const dir = sub(rvPt(thc, (a0 + a1) / 2, false), rvPt(thc - 2, (a0 + a1) / 2, false));
    if (dot(a, dir) < 0) a = scale(a, -1);
    patches.push({ c, a, region: vidx[rvRegion(thc, (a0 + a1) / 2)], face: FACE.RIM });
  }

  // centroid of the myocardium (wall-weighted patch centroids) → origin
  let wsum = 0;
  let cen: V3 = [0, 0, 0];
  for (const q of patches) {
    if (q.face === FACE.RIM) continue;
    const w = norm(q.a);
    cen = madd(cen, q.c, w);
    wsum += w;
  }
  cen = scale(cen, 1 / wsum);
  const off = sub(p.shift, cen);
  for (const q of patches) q.c = add(q.c, off);
  const Bw = add(B, off);

  // region aggregates
  const vregions: VRegion[] = V_IDS.map((id) => ({
    id, name: V_NAMES[id], kind: (id.includes('sep') ? 'SEPT' : id.startsWith('rv') ? 'RV' : 'LV') as VKind,
    z: 0, wall: 0, cIn: [0, 0, 0] as V3, cOut: [0, 0, 0] as V3, c: [0, 0, 0] as V3,
    aIn: [0, 0, 0] as V3, aOut: [0, 0, 0] as V3, aRim: [0, 0, 0] as V3, areaIn: 0, areaOut: 0,
  }));
  const zAcc = new Float64Array(V_IDS.length);
  let resid: V3 = [0, 0, 0];
  let total = 0;
  for (const q of patches) {
    const r = vregions[q.region];
    const A = norm(q.a);
    resid = add(resid, q.a);
    total += A;
    if (q.face === FACE.IN) { r.aIn = add(r.aIn, q.a); r.cIn = madd(r.cIn, q.c, A); r.areaIn += A; }
    else if (q.face === FACE.OUT) {
      r.aOut = add(r.aOut, q.a); r.cOut = madd(r.cOut, q.c, A); r.areaOut += A;
      zAcc[q.region] += A * (1 - dot(sub(q.c, Bw), eL) / Ho);
    } else r.aRim = add(r.aRim, q.a);
  }
  for (let k = 0; k < vregions.length; k++) {
    const r = vregions[k];
    r.cIn = scale(r.cIn, 1 / r.areaIn);
    r.cOut = scale(r.cOut, 1 / r.areaOut);
    r.c = scale(add(r.cIn, r.cOut), 0.5);
    r.z = zAcc[k] / r.areaOut;
    if (r.kind === 'RV') r.wall = p.rvWall;
    else if (r.kind === 'SEPT') r.wall = p.septWall;
    else {
      const zz = Math.min(1, r.z);
      r.wall = p.lvApexWall + (p.lvWall - p.lvApexWall) * Math.min(1, zz * 1.6);
    }
  }

  // atria: default-pose offsets → heart-frame coefficients → this pose
  const d = buildFrame(DEFAULT_HEART);
  const aregions: ARegion[] = A_IDS.map((id) => {
    const o = A_OFFSETS[id];
    const u = dot(o.o, d.eL), s = dot(o.o, d.eS), a = dot(o.o, d.eA);
    const pos = add(Bw, add(add(scale(eL, u), scale(eS, s)), scale(eA, a)));
    return { id, name: A_NAMES[id], c: pos, extent: o.extent, m: o.m };
  });

  const index: Record<string, number> = {};
  V_IDS.forEach((id, i) => (index[id] = i));
  A_IDS.forEach((id, i) => (index[id] = V_IDS.length + i));
  return { params: p, eL, eS, eA, patches, vregions, aregions, index, closureResidual: resid, totalArea: total };
}

function buildFrame(p: HeartParams): { eL: V3; eS: V3; eA: V3 } {
  const eL = unit(p.apexDir);
  const eS = unit(sub(p.septDir, scale(eL, dot(p.septDir, eL))));
  return { eL, eS, eA: unit(cross(eS, eL)) };
}
