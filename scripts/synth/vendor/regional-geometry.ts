/**
 * VENDORED (dev-only) copy of the procedural heart of prototype A (`_proto/regional/geometry.ts` + `vec.ts`), trimmed
 * to what `scripts/synth/bake-regions.ts` needs. Copied into the project so the bake does not import `_proto/` (and so
 * `tsc --noEmit`, which includes `scripts/`, never type-checks prototype code). Behaviour is unchanged; only imports,
 * a few type annotations and the atrial part's unused fields were adapted.
 *
 * Frame of THIS file (A's body frame): cm, +x patient left, +y superior, +z anterior, origin = ventricular centroid.
 * The bake converts to the Frank frame of src/synth (+X left, +Y inferior, +Z posterior): (x, −y, −z).
 */
export type V3 = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => scale(a, 1 / (norm(a) || 1));
export const madd = (a: V3, b: V3, s: number): V3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const DEG = Math.PI / 180;

export interface HeartParams {
  apexDir: V3;
  septDir: V3;
  lvRin: number;
  lvHin: number;
  lvWall: number;
  lvApexWall: number;
  septWall: number;
  rvDepth: number;
  rvWall: number;
  rvPhiDeg: number;
  rvTheta0Deg: number;
  rvotExtDeg: number;
  shift: V3;
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
const RVOT_LIFT: V3 = unit([0.35, 0.25, 0.9]);

export interface Patch {
  c: V3;
  a: V3;
  region: number;
  face: number;
}

export type VKind = 'LV' | 'SEPT' | 'RV';

export interface ARegion {
  id: string;
  c: V3;
}

export interface Heart {
  params: HeartParams;
  eL: V3;
  eS: V3;
  eA: V3;
  /** base-plane centre after centring (A's `Bw`) */
  base: V3;
  /** outer long-axis length (A's Ho) */
  ho: number;
  patches: Patch[];
  aregions: ARegion[];
  closureResidual: V3;
}

export const V_IDS = [
  'b_ant', 'b_antsep', 'b_infsep', 'b_inf', 'b_inflat', 'b_antlat',
  'm_ant', 'm_antsep', 'm_infsep', 'm_inf', 'm_inflat', 'm_antlat',
  'a_ant', 'a_sep', 'a_inf', 'a_lat', 'apex',
  'rv_apex', 'rv_ant', 'rv_free', 'rv_inf', 'rvot',
] as const;
export type AId = (typeof V_IDS)[number];

export const A_IDS = ['sa', 'ra_lat', 'ra_cti', 'ra_sep', 'bachmann', 'la_ant', 'la_post'] as const;

const A_OFFSETS: Record<string, V3> = {
  sa: [-2.8, 4.1, -0.3],
  ra_lat: [-4.3, 1.1, 0.2],
  ra_cti: [-2.3, -1.6, -0.3],
  ra_sep: [-0.8, 0.4, -1.8],
  bachmann: [0.2, 3.4, -1.3],
  la_ant: [3.7, 2.4, -1.8],
  la_post: [1.7, 1.1, -3.3],
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

  const TH: number[] = [];
  const seg = (a: number, b: number, n: number): void => {
    for (let i = 0; i < n; i++) TH.push(a + ((b - a) * i) / n);
  };
  seg(0, 20, 4); seg(20, 48.19, 6); seg(48.19, 70.53, 5); seg(70.53, 90, 5); TH.push(90);
  const NPH = 72;
  const PH = Array.from({ length: NPH + 1 }, (_, j) => -180 + (360 * j) / NPH);

  for (let i = 0; i < TH.length - 1; i++) {
    for (let j = 0; j < NPH; j++) {
      const t0 = TH[i] * DEG, t1 = TH[i + 1] * DEG, f0 = PH[j] * DEG, f1 = PH[j + 1] * DEG;
      const reg = vidx[lvRegion((TH[i] + TH[i + 1]) / 2, (PH[j] + PH[j + 1]) / 2)];
      for (const [face, H, R] of [[FACE.IN, Hi, Ri], [FACE.OUT, Ho, Ro]] as const) {
        const p00 = lvPt(t0, f0, H, R), p10 = lvPt(t1, f0, H, R), p11 = lvPt(t1, f1, H, R), p01 = lvPt(t0, f1, H, R);
        let a = quadArea(p00, p10, p11, p01);
        const c = quadCentre(p00, p10, p11, p01);
        const radial = sub(c, add(B, scale(eL, dot(sub(c, B), eL))));
        const outward = face === FACE.OUT ? radial : scale(radial, -1);
        const ref = norm(radial) > 1e-6 ? outward : face === FACE.OUT ? eL : scale(eL, -1);
        if (dot(a, ref) < 0) a = scale(a, -1);
        patches.push({ c, a, region: reg, face });
      }
    }
  }
  for (let j = 0; j < NPH; j++) {
    const f0 = PH[j] * DEG, f1 = PH[j + 1] * DEG;
    const reg = vidx[lvRegion(80, (PH[j] + PH[j + 1]) / 2)];
    const p00 = lvPt(Math.PI / 2, f0, Hi, Ri), p10 = lvPt(Math.PI / 2, f0, Ho, Ro), p11 = lvPt(Math.PI / 2, f1, Ho, Ro), p01 = lvPt(Math.PI / 2, f1, Hi, Ri);
    let a = quadArea(p00, p10, p11, p01);
    if (dot(a, eL) > 0) a = scale(a, -1);
    patches.push({ c: quadCentre(p00, p10, p11, p01), a, region: reg, face: FACE.RIM });
  }

  const phRv = p.rvPhiDeg, th0 = p.rvTheta0Deg;
  const topDeg = (phd: number): number => {
    const x = (phd - 4) / 76;
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
  for (let j = 0; j < NPR; j++) {
    const a0 = phR[j], a1 = phR[j + 1];
    const p00 = rvPt(thAt(1, a0), a0, false), p10 = rvPt(thAt(1, a0), a0, true), p11 = rvPt(thAt(1, a1), a1, true), p01 = rvPt(thAt(1, a1), a1, false);
    let a = quadArea(p00, p10, p11, p01);
    const c = quadCentre(p00, p10, p11, p01);
    if (norm(a) < 1e-9) continue;
    const thc = thAt(1, (a0 + a1) / 2);
    const dir = sub(rvPt(thc, (a0 + a1) / 2, false), rvPt(thc - 2, (a0 + a1) / 2, false));
    if (dot(a, dir) < 0) a = scale(a, -1);
    patches.push({ c, a, region: vidx[rvRegion(thc, (a0 + a1) / 2)], face: FACE.RIM });
  }

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
  let resid: V3 = [0, 0, 0];
  for (const q of patches) resid = add(resid, q.a);

  const aregions: ARegion[] = A_IDS.map((id) => {
    const o = A_OFFSETS[id];
    // default pose: offsets are already in the default frame (A builds them through its own default frame)
    const u = dot(o, eL), s = dot(o, eS), a = dot(o, eA);
    return { id, c: add(Bw, add(add(scale(eL, u), scale(eS, s)), scale(eA, a))) };
  });
  return { params: p, eL, eS, eA, base: Bw, ho: Ho, patches, aregions, closureResidual: resid };
}
