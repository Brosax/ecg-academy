/**
 * Conduction-system polylines, label landmarks, valves and contraction axes (anatomical frame A; heart.ts shifts them
 * to the local frame). Positions follow docs/research/lead-geometry-anatomy.md §8:
 *   SA   crescent ≈ 15 mm, subepicardial at the SVC–RA junction along the terminal crest (Sánchez-Quintana 2005)
 *   AVN  apex of Koch's triangle: RA side of the central fibrous body, just above the ring near the tricuspid septal annulus
 *   HIS  through the central fibrous body (ring) to the crest of the muscular septum, then 1–3 mm along the crest
 *   LBB  left septal subendocardium, 10–15 mm, then anterior / posterior / septal fascicles
 *   RBB  1–2 mm under the right septal endocardium → moderator band → base of the anterior papillary muscle
 * Control points are snapped onto voxels of the intended tissue (e.g. septum voxels 6-adjacent to the LV cavity), so the
 * paths always sit on/just under the correct surface whatever the parameters.
 */
import type { ChamberAxis, ConductionPath, StructureId, ValveGeom, Vec3 } from '../types';
import { CHAMBER, STRUCTURES, TISSUE } from '../types';
import { add, normalize, scale, sub } from '../frame';
import type { HeartLayout } from './chambers';
import type { CavityDistances, Segmentation, WallFields } from './fields';
import { centroidA } from './fields';
import type { VoxelData } from './grid';
import { PART } from './grid';

export interface ConductionContext {
  readonly vox: VoxelData;
  readonly L: HeartLayout;
  readonly d: CavityDistances;
  readonly w: WallFields;
  readonly seg: Segmentation;
  readonly insertion: { readonly anterior: number; readonly inferior: number };
}

export interface ConductionResult {
  readonly paths: ConductionPath[];
  readonly landmarks: Partial<Record<StructureId, Vec3>>;
  readonly valves: ValveGeom[];
  readonly chambers: ChamberAxis[];
  /** Control points that found no voxel of the intended tissue within the search radius (should be empty). */
  readonly misses: string[];
}

type Pred = (v: number) => boolean;
const deg = Math.PI / 180;
const T_OUT = TISSUE.Out, T_BLOOD = TISSUE.Blood, T_LV = TISSUE.LV, T_RV = TISSUE.RV, T_SEP = TISSUE.Septum;
const T_LA = TISSUE.LA, T_RA = TISSUE.RA, T_RING = TISSUE.Ring;
const C_RV = CHAMBER.RV;
const P_BAND = PART.Band;

export function buildConduction(ctx: ConductionContext): ConductionResult {
  const { vox, L, d } = ctx;
  const [nx, ny, nz] = vox.dims;
  const h = vox.h;
  const o = vox.originA;
  const { tissue, part } = vox;
  const misses: string[] = [];

  const idx = (p: Vec3) => {
    const i = Math.round((p[0] - o[0]) / h), j = Math.round((p[1] - o[1]) / h), k = Math.round((p[2] - o[2]) / h);
    return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : i + nx * (j + ny * k);
  };
  const centre = (v: number): Vec3 => {
    const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
    return [o[0] + i * h, o[1] + j * h, o[2] + k * h];
  };
  /** Nearest voxel centre to p (within rMm) satisfying pred. */
  const snap = (p: Vec3, pred: Pred, label: string, rMm = 8): Vec3 => {
    const ci = Math.round((p[0] - o[0]) / h), cj = Math.round((p[1] - o[1]) / h), ck = Math.round((p[2] - o[2]) / h);
    const R = Math.ceil(rMm / h);
    let best = -1, bestD = Infinity;
    for (let dk = -R; dk <= R; dk++)
      for (let dj = -R; dj <= R; dj++)
        for (let di = -R; di <= R; di++) {
          const i = ci + di, j = cj + dj, k = ck + dk;
          if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
          const dd = (o[0] + i * h - p[0]) ** 2 + (o[1] + j * h - p[1]) ** 2 + (o[2] + k * h - p[2]) ** 2;
          if (dd >= bestD) continue;
          const v = i + nx * (j + ny * k);
          if (!pred(v)) continue;
          bestD = dd;
          best = v;
        }
    if (best < 0) {
      misses.push(label);
      return p;
    }
    return centre(best);
  };
  /** Densify control points (≤ 2 mm steps), snap every sample, light smoothing, drop duplicates. */
  const trace = (ctrl: readonly Vec3[], preds: readonly Pred[], label: string, rMm = 8): Vec3[] => {
    const raw: Vec3[] = [];
    for (let s = 0; s < ctrl.length - 1; s++) {
      const a = ctrl[s], b = ctrl[s + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const n = Math.max(1, Math.ceil(len / 2));
      for (let q = 0; q < n; q++) {
        const t = q / n;
        raw.push(snap([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])], preds[s], `${label}[${s}]`, rMm));
      }
    }
    raw.push(snap(ctrl[ctrl.length - 1], preds[preds.length - 1], `${label}[end]`, rMm));
    const out: Vec3[] = [];
    for (let q = 0; q < raw.length; q++) {
      const p = q === 0 || q === raw.length - 1
        ? raw[q]
        : (scale(add(add(raw[q - 1], raw[q + 1]), scale(raw[q], 2)), 0.25) as Vec3);
      const last = out[out.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) > 0.7) out.push(p);
    }
    return out;
  };

  // ---------------------------------------------------------------- predicates
  const dout = d.out, dlv = d.lv, drv = d.rv;
  const isRA: Pred = (v) => tissue[v] === T_RA;
  const isAtrial: Pred = (v) => tissue[v] === T_RA || tissue[v] === T_LA;
  const subEpiAtrial: Pred = (v) => isAtrial(v) && dout[v] < 2.5;
  const subEpiRA: Pred = (v) => isRA(v) && dout[v] < 2.5;
  const isRing: Pred = (v) => tissue[v] === T_RING;
  /** Ring voxel within n layers below (j−1 … j−n) / above (j+1 … j+n). */
  const ringBelow = (v: number, n: number) => {
    for (let s = 1; s <= n; s++) if (tissue[v - s * nx] === T_RING) return true;
    return false;
  };
  const ringAbove = (v: number, n: number) => {
    for (let s = 1; s <= n; s++) if (tissue[v + s * nx] === T_RING) return true;
    return false;
  };
  const raAboveRing: Pred = (v) => isRA(v) && ringBelow(v, 2);
  const septum: Pred = (v) => tissue[v] === T_SEP;
  const septumCrest: Pred = (v) => septum(v) && ringAbove(v, 3);
  const leftSeptal: Pred = (v) => septum(v) && dlv[v] < 1.5;
  const rightSeptal: Pred = (v) => septum(v) && drv[v] < 1.5;
  const lvSubendo: Pred = (v) => (tissue[v] === T_LV || tissue[v] === T_SEP) && dlv[v] < 1.5;
  const band: Pred = (v) => tissue[v] === T_RV && part[v] === P_BAND;

  // ---------------------------------------------------------------- geometry helpers
  const rEndo = (y: number) => L.lvRc * Math.sqrt(Math.max(0, 1 - ((y - L.lvCenterY) / L.lvLc) ** 2));
  const rEpi = (y: number) => L.lvRcE * Math.sqrt(Math.max(0, 1 - ((y - L.lvCenterY) / L.lvLcE) ** 2));
  const onLv = (angDeg: number, r: number, y: number): Vec3 => [r * Math.cos(angDeg * deg), y, r * Math.sin(angDeg * deg)];
  const ins = ctx.insertion;
  const phiSep = 0.5 * (ins.anterior + ins.inferior); // septal centre
  const phiAntLat = ins.anterior - 60; // AHA 1|6 boundary: anterolateral papillary muscle
  const phiPostMed = ins.anterior + 150; // centre of AHA 4/10: posteromedial papillary muscle
  const yLen = L.yV - L.yApexEndo;

  // ---------------------------------------------------------------- SA node & Bachmann
  const svcDir = normalize(sub(L.svc.b, L.svc.a));
  const yJunction = L.raCenter[1] + L.raSemi[1] * 0.92;
  const tJ = (yJunction - L.svc.a[1]) / svcDir[1];
  const svcAt = add(L.svc.a, scale(svcDir, tJ));
  const lat = normalize([-0.75, 0, 0.66]); // anterolateral side of the SVC (terminal crest)
  const svcR = L.svc.ra + L.p.vesselWallMm;
  const raPt = (dx: number, dy: number, dz: number): Vec3 => {
    const n = normalize([dx, dy, dz]);
    // point on the RA outer ellipsoid along n from its centre
    const s = 1 / Math.sqrt((n[0] / L.raSemi[0]) ** 2 + (n[1] / L.raSemi[1]) ** 2 + (n[2] / L.raSemi[2]) ** 2);
    return add(L.raCenter, scale(n, s + L.p.atrialWallMm * 0.5));
  };
  const sa = trace(
    [add(svcAt, scale(lat, svcR)), raPt(-0.55, 0.75, 0.45), raPt(-0.75, 0.5, 0.45), raPt(-0.85, 0.3, 0.42)],
    [subEpiRA, subEpiRA, subEpiRA],
    'SA',
  );
  const laPt = (dx: number, dy: number, dz: number): Vec3 => {
    const n = normalize([dx, dy, dz]);
    const s = 1 / Math.sqrt((n[0] / L.laSemi[0]) ** 2 + (n[1] / L.laSemi[1]) ** 2 + (n[2] / L.laSemi[2]) ** 2);
    return add(L.laCenter, scale(n, s + L.p.atrialWallMm * 0.5));
  };
  // Interatrial band: RA anterior roof near the SVC → over the roof, posterior to the aortic root → LA roof → LAA.
  const bachmann = trace(
    [raPt(0.15, 0.8, 0.6), raPt(0.6, 0.8, -0.1), laPt(-0.6, 0.8, 0.0), laPt(0.05, 0.9, 0.35), laPt(0.55, 0.6, 0.55)],
    [subEpiAtrial, subEpiAtrial, subEpiAtrial, subEpiAtrial],
    'BACHMANN',
    12,
  );

  // ---------------------------------------------------------------- AV node, His
  const tv = L.tricuspid.c;
  const toAxis = normalize([-tv[0], 0, -tv[2]]);
  const tvSeptalEdge = add([tv[0], 0, tv[2]], scale(toAxis, L.tricuspid.r));
  const avnTarget: Vec3 = [tvSeptalEdge[0] + 6 * toAxis[0], L.yA + h, tvSeptalEdge[2] + 6 * toAxis[2]];
  const avnPt = snap(avnTarget, raAboveRing, 'AVN', 14);
  const avnStart = snap(add(avnPt, [-6 * toAxis[0], 4, -6 * toAxis[2] - 3]), isRA, 'AVN[start]', 10);
  const avn = trace([avnStart, avnPt], [isRA], 'AVN');
  const ringPt = snap([avnPt[0] + 2 * toAxis[0], 0.5 * (L.yV + L.yA), avnPt[2] + 2 * toAxis[2]], isRing, 'HIS[ring]', 8);
  const crestAng = phiSep + 8; // crest beneath the membranous septum, toward the aortic root
  const crestTop = snap(onLv(crestAng, 0.5 * (rEndo(L.yV) + rEpi(L.yV)), L.yV - h), septumCrest, 'HIS[crest]', 10);
  const crestEnd = snap(onLv(crestAng - 8, 0.5 * (rEndo(L.yV - 4) + rEpi(L.yV - 4)), L.yV - 4), septum, 'HIS[end]', 8);
  const his = [avnPt, ringPt, crestTop, crestEnd];

  // ---------------------------------------------------------------- left bundle and fascicles (left septal surface)
  const yL0 = L.yV - 6, yL1 = L.yV - 0.17 * yLen; // trunk ≈ 13 mm
  const lbbEnd = snap(onLv(phiSep, rEndo(yL1), yL1), leftSeptal, 'LBB[end]');
  const lbb = trace([crestEnd, onLv(phiSep + 4, rEndo(yL0), yL0), lbbEnd], [leftSeptal, leftSeptal], 'LBB');
  const lvPt = (ang: number, frac: number) => {
    const y = L.yV - frac * yLen;
    return onLv(ang, rEndo(y), y);
  };
  const laf = trace(
    [lbbEnd, lvPt(phiSep - 30, 0.27), lvPt(phiAntLat + 45, 0.38), lvPt(phiAntLat + 10, 0.47), lvPt(phiAntLat, 0.52)],
    [lvSubendo, lvSubendo, lvSubendo, lvSubendo],
    'LAF',
  );
  const lpf = trace(
    [lbbEnd, lvPt(phiSep + 30, 0.3), lvPt(phiPostMed - 40, 0.42), lvPt(phiPostMed - 8, 0.52), lvPt(phiPostMed, 0.57)],
    [lvSubendo, lvSubendo, lvSubendo, lvSubendo],
    'LPF',
  );
  const lsf = trace([lbbEnd, lvPt(phiSep + 3, 0.35), lvPt(phiSep, 0.5)], [leftSeptal, leftSeptal], 'LSF');

  // ---------------------------------------------------------------- right bundle: septum → moderator band → APM
  const f = vox.field;
  const bandA = f.bandA, bandB = f.bandB;
  const rsPt = (ang: number, y: number) => onLv(ang, rEpi(y) + 0.5, y);
  const yR1 = L.yV - 0.25 * yLen;
  const rbb = trace(
    [crestEnd, rsPt(phiSep + 2, yR1), rsPt(phiSep, bandA[1] + 6), bandA, add(scale(add(bandA, bandB), 0.5), [0, 0, 0]), bandB],
    [rightSeptal, rightSeptal, rightSeptal, band, band],
    'RBB',
  );

  const paths: ConductionPath[] = [
    { id: 'SA', pointsMm: sa },
    { id: 'BACHMANN', pointsMm: bachmann },
    { id: 'AVN', pointsMm: avn },
    { id: 'HIS', pointsMm: his },
    { id: 'LBB', pointsMm: lbb },
    { id: 'LAF', pointsMm: laf },
    { id: 'LPF', pointsMm: lpf },
    { id: 'LSF', pointsMm: lsf },
    { id: 'RBB', pointsMm: rbb },
  ];

  // ---------------------------------------------------------------- valves
  const valves: ValveGeom[] = [
    { id: 'MITRAL', centerMm: L.mitral.c, normal: [0, -1, 0], radiusMm: L.mitral.r },
    { id: 'TRICUSPID', centerMm: L.tricuspid.c, normal: [0, -1, 0], radiusMm: L.tricuspid.r },
    { id: 'AORTIC', centerMm: L.aorticValve.c, normal: L.aorticValve.n, radiusMm: L.aorticValve.r },
    { id: 'PULMONARY', centerMm: L.pulmonaryValve.c, normal: L.pulmonaryValve.n, radiusMm: L.pulmonaryValve.r },
  ];

  // ---------------------------------------------------------------- landmarks (label anchors just outside the epicardium)
  const solid = (v: number) => v >= 0 && tissue[v] !== T_OUT && tissue[v] !== T_BLOOD;
  const surfaceAlong = (start: Vec3, dir: Vec3): Vec3 => {
    const n = normalize(dir);
    let lastSolid = -1;
    for (let s = 0; s <= 300; s++) if (solid(idx(add(start, scale(n, s * 0.5))))) lastSolid = s;
    return lastSolid < 0 ? start : add(start, scale(n, lastSolid * 0.5 + 2));
  };
  // region centroids in one pass
  const nReg = STRUCTURES.length;
  const acc = new Float64Array(4 * nReg);
  const region = ctx.seg.region;
  for (let k = 0, v = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, v++) {
        const r = region[v];
        if (r >= nReg) continue;
        acc[4 * r] += i; acc[4 * r + 1] += j; acc[4 * r + 2] += k; acc[4 * r + 3]++;
      }
  const regionCentroid = (s: StructureId): Vec3 => {
    const r = STRUCTURES.indexOf(s), n = acc[4 * r + 3];
    return n ? [o[0] + (h * acc[4 * r]) / n, o[1] + (h * acc[4 * r + 1]) / n, o[2] + (h * acc[4 * r + 2]) / n] : [NaN, NaN, NaN];
  };
  const regionAnchor = (s: StructureId, from: (c: Vec3) => Vec3): Vec3 | undefined => {
    const c = regionCentroid(s);
    if (!Number.isFinite(c[0])) return undefined;
    const s0 = from(c);
    return surfaceAlong(s0, sub(c, s0));
  };
  const fromLvAxis = (c: Vec3): Vec3 => [0, c[1], 0];
  const yMid = L.yV - 0.5 * yLen;
  const mid = (pts: readonly Vec3[]) => pts[Math.floor(pts.length / 2)];
  const landmarks: Partial<Record<StructureId, Vec3>> = {
    SA: mid(sa),
    BACHMANN: mid(bachmann),
    AVN: avnPt,
    HIS: mid(his),
    LBB: lbbEnd,
    LAF: laf[laf.length - 1],
    LPF: lpf[lpf.length - 1],
    LSF: lsf[lsf.length - 1],
    RBB: mid(rbb),
    PURKINJE_LV: lvPt(phiSep - 90, 0.75),
    PURKINJE_RV: bandB,
    SEPTUM: surfaceAlong([0, yMid, 0], [Math.cos(ins.anterior * deg), 0, Math.sin(ins.anterior * deg)]),
    LV_APEX: [0, L.yApexEpi - 2, 0],
    MITRAL: L.mitral.c,
    TRICUSPID: L.tricuspid.c,
    AORTIC: L.aorticValve.c,
    PULMONARY: L.pulmonaryValve.c,
    AV_RING: surfaceAlong([0, 0.5 * (L.yV + L.yA), 0], [1, 0, -0.3]),
  };
  for (const s of ['LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'RV_FREE', 'RV_APEX', 'RVOT'] as const) {
    const a = regionAnchor(s, fromLvAxis);
    if (a) landmarks[s] = a;
  }
  const la = regionAnchor('LA', () => L.laCenter);
  if (la) landmarks.LA = la;
  const laa = regionAnchor('LAA', () => L.laCenter);
  if (laa) landmarks.LAA = laa;
  const ra = regionAnchor('RA', () => L.raCenter);
  if (ra) landmarks.RA = ra;

  // ---------------------------------------------------------------- contraction axes (order LA, RA, LV, RV)
  const chamber = vox.chamber;
  const rvBlood = centroidA(vox, (v) => tissue[v] === T_BLOOD && chamber[v] === C_RV);
  let rvLow = L.yV;
  for (let k = 0, v = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, v++)
        if (tissue[v] === T_BLOOD && chamber[v] === C_RV) rvLow = Math.min(rvLow, o[1] + j * h);
  const chambers: ChamberAxis[] = [
    {
      chamber: CHAMBER.LA, centerMm: L.laCenter, axis: [0, 1, 0],
      radiusMm: 0.5 * (L.laSemi[0] + L.laSemi[2]) + L.p.atrialWallMm, lengthMm: L.laCenter[1] + L.laSemi[1] - L.yA,
    },
    {
      chamber: CHAMBER.RA, centerMm: L.raCenter, axis: [0, 1, 0],
      radiusMm: 0.5 * (L.raSemi[0] + L.raSemi[2]) + L.p.atrialWallMm, lengthMm: L.raCenter[1] + L.raSemi[1] - L.yA,
    },
    {
      chamber: CHAMBER.LV, centerMm: [0, L.yV - 0.5 * yLen, 0], axis: [0, -1, 0],
      radiusMm: L.lvRcE, lengthMm: L.yV - L.yApexEpi,
    },
    {
      chamber: CHAMBER.RV, centerMm: rvBlood, axis: scale(L.rvAxL, -1),
      radiusMm: L.p.rvRadialMm, lengthMm: L.yV - rvLow + L.p.rvWallMm,
    },
  ];

  return { paths, landmarks, valves, chambers, misses };
}
