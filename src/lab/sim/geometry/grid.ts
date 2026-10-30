/**
 * Analytic heart field and voxelisation (anatomical frame A, see chambers.ts).
 *
 * The rendered tissue is one SDF:  S = max( ∪ tissue hulls, −∪ cavities ).
 *   - LV: confocal spheroid shell (onion), clipped at the AV plane y = yV.
 *   - RV: body crescent blob ∪ inflow sinus (under the tricuspid) ∪ infundibulum round cone, onion wall rvWallMm; the RV
 *     cavity is clamped OUTSIDE the LV epicardial spheroid, so the septum is exactly the LV wall where the crescent
 *     touches it (never "ellipsoid minus ellipsoid").
 *   - Fibrous ring: slab yV < y < yA over the union of chamber footprints, pierced only by the mitral and tricuspid
 *     orifices (each clipped to both adjoining cavities), the LV outflow and the RV infundibulum.
 *   - Atria above yA: ellipsoid domes + appendages; the interatrial septum comes from a bisector of the two cavities;
 *     atrial cavities keep a wall's distance from the great vessels and atrial tissue keeps GAP_OT from the RVOT.
 *   - Great vessels and caval/pulmonary veins: open tube stubs (TISSUE.Vessel; proximal PV sleeves are LA myocardium).
 * Voxels get a provisional class here (ventricular → TISSUE.LV, atrial → TISSUE.LA); fields.ts splits LV / RV / septum
 * and LA / RA from distance transforms.
 *
 * Performance: hot code uses module-local constants only (imported bindings are getters under Vitest's SSR transform
 * and cost ~20× in tight loops); shapes far from an 8³ block are replaced by a lower bound; blocks whose coarse corner
 * samples prove them empty are filled without per-voxel sampling.
 */
import type { Vec3 } from '../types';
import { CHAMBER, TISSUE } from '../types';
import { add, normalize, scale, sub } from '../frame';
import type { HeartLayout } from './chambers';
import { Capsule, CappedCylinder, Ellipsoid, Plane, RoundCone } from './prims';

/** Sub-structure tags used for region labels (kept beside TISSUE). */
export const PART = {
  None: 0, Outflow: 1, Band: 2, LAA: 3, RAA: 4, PVSleeve: 5, Aorta: 6, Pulmonary: 7, Caval: 8, PulmVein: 9,
} as const;

const T_OUT = TISSUE.Out, T_BLOOD = TISSUE.Blood, T_LV = TISSUE.LV, T_LA = TISSUE.LA, T_RING = TISSUE.Ring;
const T_VESSEL = TISSUE.Vessel;
const C_NONE = CHAMBER.None, C_LV = CHAMBER.LV, C_RV = CHAMBER.RV, C_LA = CHAMBER.LA, C_RA = CHAMBER.RA;
const P_NONE = PART.None, P_OUTFLOW = PART.Outflow, P_BAND = PART.Band, P_LAA = PART.LAA, P_RAA = PART.RAA;
const P_PVSLEEVE = PART.PVSleeve, P_AORTA = PART.Aorta, P_PULM = PART.Pulmonary, P_CAVAL = PART.Caval, P_PV = PART.PulmVein;

/** IQ quadratic smooth min; k = maximal thickening (blends over |a − b| < 4k). Local copy (hot path). */
function smin(a: number, b: number, k: number): number {
  const kk = 4 * k;
  const h = kk - Math.abs(a - b);
  return h > 0 ? Math.min(a, b) - (h * h) / (4 * kk) : Math.min(a, b);
}
const smax = (a: number, b: number, k: number): number => -smin(-a, -b, k);

// Smooth-union widths (mm of maximal thickening).
const K_INS = 4; // LV/RV insertion fillet
const K_RV = 4; // RV body ∪ inflow sinus
const K_OT = 3; // RV body / infundibulum
const K_TIP = 3; // rounds the crescent tips of the RV cavity (avoids sub-voxel slivers)
const K_APP = 3; // atrial appendages
const K_ATR = 2; // LA ∪ RA outer
const K_VES = 2.5; // vessel–atrium junctions
/** Atrial tissue stays this far from the RVOT outer surface: ≥ 3 voxels of insulation (no atrial–ventricular contact). */
const GAP_OT = 6;
/** AV orifices stay this far inside both adjoining cavities, so the ring always rims them. */
const M_ORI = 1;
/** Cavities just below / above the ring are probed this far beyond the clip planes (clipping caps values there). */
const PROBE = 3;
/** Shapes farther than this from a block are replaced by a lower bound (≥ 4·kmax + largest offset → exact result). */
const CULL = 24;
const BLOCK = 4;
/** Lipschitz allowance of the composite SDF for the empty-block test (measured ≈ 1 away from the surface). */
const LIP = 1.3;

type Shape = Ellipsoid | RoundCone | CappedCylinder | Capsule;

/** Per-sample outputs and scratch (no allocation in the voxel loop). */
export class HeartField {
  readonly L: HeartLayout;
  private readonly shapes: Shape[] = [];
  /** Offset (wall) added to each shape when computing the tissue bounds; NaN = cavity-only shape (no bound). */
  private readonly boundPad: number[] = [];
  private readonly on: Uint8Array;
  private readonly far: Float64Array;
  /** Shape slots per group and whether any shape of the group is near the current block. */
  private readonly gVent: number[] = []; private readonly gAtr: number[] = []; private readonly gVes: number[] = [];
  private ventOn = true; private atrOn = true; private vesOn = true;
  private aoOn = true; private paOn = true; private cavOn = true; private pvOn = true;
  private readonly lvEpi: number; private readonly lvEndo: number; private readonly rvBody: number; private readonly rvIn: number;
  private readonly ot: number; private readonly lvotC: number; private readonly band: number; private readonly apm: number;
  private readonly la: number; private readonly ra: number; private readonly laa: number; private readonly raa: number;
  private readonly aoL: number; private readonly aoO: number; private readonly paL: number; private readonly paO: number;
  private readonly svcL: number; private readonly svcO: number; private readonly ivcL: number; private readonly ivcO: number;
  private readonly pvL0: number; private readonly pvO0: number; private readonly nPv: number;
  private readonly pvLen: number[] = [];
  // typed references → monomorphic calls in the hot path
  private readonly eLvEpi: Ellipsoid; private readonly eLvEndo: Ellipsoid; private readonly eRvBody: Ellipsoid;
  private readonly eRvIn: Ellipsoid; private readonly eLa: Ellipsoid; private readonly eRa: Ellipsoid;
  private readonly rOt: RoundCone; private readonly rLvot: RoundCone; private readonly rLaa: RoundCone;
  private readonly rRaa: RoundCone; private readonly rAoL: RoundCone; private readonly rAoO: RoundCone;
  private readonly rPaL: RoundCone; private readonly rPaO: RoundCone;
  private readonly kBand: Capsule; private readonly kApm: Capsule;
  private readonly cSvcL: CappedCylinder; private readonly cSvcO: CappedCylinder;
  private readonly cIvcL: CappedCylinder; private readonly cIvcO: CappedCylinder;
  private readonly cPvL: CappedCylinder[] = []; private readonly cPvO: CappedCylinder[] = [];
  private readonly pvPlane: Plane; private readonly aoPlane: Plane; private readonly aoTop: Plane; private readonly paTop: Plane;
  /** Moderator band (septum → anterior free wall) and anterior papillary muscle tip, frame A. */
  readonly bandA: Vec3; readonly bandB: Vec3; readonly apmTip: Vec3;
  private readonly tRV: number; private readonly tA: number; private readonly halfIAS: number;
  private readonly yV: number; private readonly yA: number;
  private readonly mvx: number; private readonly mvz: number; private readonly mvr: number;
  private readonly tvx: number; private readonly tvz: number; private readonly tvr: number;
  private readonly pvSleeve: number;

  // ---- sample outputs
  S = 0;
  tissue = 0;
  chamber = 0;
  part = 0;
  // ---- ventricular scratch
  lvO = 0; lvHull = 0; rvHull = 0; otHull = 0; ventHull = 0; lvCav = 0; rvCav = 0; rvI = 0; bandD = 0;
  // ---- atrial scratch
  laI = 0; raI = 0; aHull = 0; laCav = 0; raCav = 0; laaI = 0; raaI = 0;
  // ---- vessel scratch
  aoOv = 0; paOv = 0; vesHull = 0; vesLumen = 0; vesPart = 0; vesSleeve = false;

  constructor(L: HeartLayout) {
    this.L = L;
    const p = L.p;
    this.tRV = p.rvWallMm;
    this.tA = p.atrialWallMm;
    this.halfIAS = 0.5 * p.interatrialSeptumMm;
    this.yV = L.yV;
    this.yA = L.yA;
    this.mvx = L.mitral.c[0]; this.mvz = L.mitral.c[2]; this.mvr = L.mitral.r;
    this.tvx = L.tricuspid.c[0]; this.tvz = L.tricuspid.c[2]; this.tvr = L.tricuspid.r;
    this.pvSleeve = L.pvSleeveMm;
    const w = p.vesselWallMm;
    const add_ = (s: Shape, pad: number) => {
      this.boundPad.push(pad);
      return this.shapes.push(s) - 1;
    };

    this.lvEpi = add_(new Ellipsoid([0, L.lvCenterY, 0], [L.lvRcE, L.lvLcE, L.lvRcE]), 0);
    this.lvEndo = add_(new Ellipsoid([0, L.lvCenterY, 0], [L.lvRc, L.lvLc, L.lvRc]), NaN);
    this.rvBody = add_(new Ellipsoid(L.rvCenter, L.rvSemi, L.rvAxR, L.rvAxL, L.rvAxT), this.tRV);
    this.rvIn = add_(new Ellipsoid(L.rvInflowCenter, L.rvInflowSemi, L.rvInflowAxR, [0, 1, 0], L.rvInflowAxT), this.tRV);
    this.ot = add_(new RoundCone(L.outflow.a, L.outflow.b, L.outflow.ra, L.outflow.rb), this.tRV);
    this.lvotC = add_(new RoundCone(L.lvot.a, L.lvot.b, L.lvot.ra, L.lvot.rb), NaN);
    this.pvPlane = new Plane(L.pulmonaryValve.c, L.pulmonaryValve.n);
    this.aoPlane = new Plane(L.aorticValve.c, L.aorticValve.n);

    // Moderator band: from the right septal surface (junction of mid/apical RV thirds) across the cavity to the
    // anterior free wall, where the anterior papillary muscle arises (§8; the RBB runs inside it).
    const body = this.shapes[this.rvBody];
    const rEpi = (y: number) => L.lvRcE * Math.sqrt(Math.max(0, 1 - ((y - L.lvCenterY) / L.lvLcE) ** 2));
    const ySept = L.yApexEpi + 0.5 * (L.yV - L.yApexEpi);
    const yWall = ySept - 6;
    const angS = (p.rvAngleDeg + 2) * (Math.PI / 180);
    const angW = (p.rvAngleDeg - 38) * (Math.PI / 180);
    this.bandA = [(rEpi(ySept) - 2) * Math.cos(angS), ySept, (rEpi(ySept) - 2) * Math.sin(angS)];
    let r = rEpi(yWall);
    while (r < 120 && body.d(r * Math.cos(angW), yWall, r * Math.sin(angW)) < 0) r += 0.25;
    this.bandB = [(r + 1.5) * Math.cos(angW), yWall, (r + 1.5) * Math.sin(angW)];
    const inward = normalize([-Math.cos(angW), 0.35, -Math.sin(angW)]);
    this.apmTip = add(this.bandB, scale(inward, 7));
    this.band = add_(new Capsule(this.bandA, this.bandB, 2.5), NaN);
    this.apm = add_(new Capsule(this.bandB, this.apmTip, 3.5), NaN);

    this.la = add_(new Ellipsoid(L.laCenter, L.laSemi), this.tA);
    this.ra = add_(new Ellipsoid(L.raCenter, L.raSemi), this.tA);
    this.laa = add_(new RoundCone(L.laa.a, L.laa.b, L.laa.ra, L.laa.rb), this.tA);
    this.raa = add_(new RoundCone(L.raa.a, L.raa.b, L.raa.ra, L.raa.rb), this.tA);

    const dir = (t: { a: Vec3; b: Vec3 }) => normalize(sub(t.b, t.a));
    const ext = (t: { a: Vec3; b: Vec3 }, mm: number): Vec3 => add(t.b, scale(dir(t), mm));
    const back = (t: { a: Vec3; b: Vec3 }, mm: number): Vec3 => add(t.a, scale(dir(t), -mm));
    // Lumens run past the stub end (open, cut vessels); the aortic/pulmonary outer walls start just below their valve.
    this.aoL = add_(new RoundCone(L.aorta.a, ext(L.aorta, 10), L.aorta.ra, L.aorta.rb + 0.4), NaN);
    this.aoO = add_(new RoundCone(back(L.aorta, 4), L.aorta.b, L.aorta.ra + w, L.aorta.rb + w), 0);
    this.aoTop = new Plane(L.aorta.b, dir(L.aorta));
    const pa = L.pulmonaryTrunk;
    this.paL = add_(new RoundCone(pa.a, ext(pa, 10), pa.ra, pa.rb + 0.4), NaN);
    this.paO = add_(new RoundCone(back(pa, 3), pa.b, pa.ra + w, pa.rb + w), 0);
    this.paTop = new Plane(pa.b, dir(pa));
    this.svcL = add_(new CappedCylinder(L.svc.a, ext(L.svc, 10), L.svc.ra), NaN);
    this.svcO = add_(new CappedCylinder(L.svc.a, L.svc.b, L.svc.ra + w), 0);
    this.ivcL = add_(new CappedCylinder(L.ivc.a, ext(L.ivc, 10), L.ivc.ra), NaN);
    this.ivcO = add_(new CappedCylinder(L.ivc.a, L.ivc.b, L.ivc.ra + w), 0);
    this.nPv = L.pulmonaryVeins.length;
    this.pvL0 = this.shapes.length;
    for (const v of L.pulmonaryVeins) add_(new CappedCylinder(v.a, ext(v, 10), v.ra), NaN);
    this.pvO0 = this.shapes.length;
    for (const v of L.pulmonaryVeins) {
      add_(new CappedCylinder(v.a, v.b, v.ra + w), 0);
      this.pvLen.push(Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1], v.b[2] - v.a[2]));
    }

    const sh = this.shapes;
    this.eLvEpi = sh[this.lvEpi] as Ellipsoid; this.eLvEndo = sh[this.lvEndo] as Ellipsoid;
    this.eRvBody = sh[this.rvBody] as Ellipsoid; this.eRvIn = sh[this.rvIn] as Ellipsoid;
    this.eLa = sh[this.la] as Ellipsoid; this.eRa = sh[this.ra] as Ellipsoid;
    this.rOt = sh[this.ot] as RoundCone; this.rLvot = sh[this.lvotC] as RoundCone;
    this.rLaa = sh[this.laa] as RoundCone; this.rRaa = sh[this.raa] as RoundCone;
    this.rAoL = sh[this.aoL] as RoundCone; this.rAoO = sh[this.aoO] as RoundCone;
    this.rPaL = sh[this.paL] as RoundCone; this.rPaO = sh[this.paO] as RoundCone;
    this.kBand = sh[this.band] as Capsule; this.kApm = sh[this.apm] as Capsule;
    this.cSvcL = sh[this.svcL] as CappedCylinder; this.cSvcO = sh[this.svcO] as CappedCylinder;
    this.cIvcL = sh[this.ivcL] as CappedCylinder; this.cIvcO = sh[this.ivcO] as CappedCylinder;
    for (let i = 0; i < this.nPv; i++) {
      this.cPvL.push(sh[this.pvL0 + i] as CappedCylinder);
      this.cPvO.push(sh[this.pvO0 + i] as CappedCylinder);
    }
    this.on = new Uint8Array(this.shapes.length).fill(1);
    this.far = new Float64Array(this.shapes.length);
    this.gVent.push(this.lvEpi, this.lvEndo, this.rvBody, this.rvIn, this.ot, this.lvotC, this.band, this.apm);
    this.gAtr.push(this.la, this.ra, this.laa, this.raa);
    for (let i = this.aoL; i < this.shapes.length; i++) this.gVes.push(i);
  }

  /** Box (frame A) containing all tissue: hull shapes + their walls + smooth-union growth + the crop margin. */
  bounds(): { lo: Vec3; hi: Vec3 } {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.shapes.length; i++) {
      const pad = this.boundPad[i];
      if (Number.isNaN(pad)) continue;
      const s = this.shapes[i];
      lo[0] = Math.min(lo[0], s.lx - pad); lo[1] = Math.min(lo[1], s.ly - pad); lo[2] = Math.min(lo[2], s.lz - pad);
      hi[0] = Math.max(hi[0], s.hx + pad); hi[1] = Math.max(hi[1], s.hy + pad); hi[2] = Math.max(hi[2], s.hz + pad);
    }
    const m = 5 + (this.L.p.marginVoxels + 1) * this.L.h;
    return { lo: [lo[0] - m, lo[1] - m, lo[2] - m], hi: [hi[0] + m, hi[1] + m, hi[2] + m] };
  }

  /** Enables only shapes near the box [lo, hi] (expanded by `pad` for projected samples). */
  cullTo(lx: number, ly: number, lz: number, hx: number, hy: number, hz: number, pad: number): void {
    for (let i = 0; i < this.shapes.length; i++) {
      const s = this.shapes[i];
      const dx = Math.max(s.lx - hx, 0, lx - s.hx);
      const dy = Math.max(s.ly - hy, 0, ly - s.hy);
      const dz = Math.max(s.lz - hz, 0, lz - s.hz);
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) - pad;
      this.on[i] = d > CULL ? 0 : 1;
      this.far[i] = d;
    }
    const on = this.on;
    const any = (g: number[]) => g.some((i) => on[i] === 1);
    this.ventOn = any(this.gVent);
    this.atrOn = any(this.gAtr);
    this.aoOn = on[this.aoL] === 1 || on[this.aoO] === 1;
    this.paOn = on[this.paL] === 1 || on[this.paO] === 1;
    this.cavOn = on[this.svcL] === 1 || on[this.svcO] === 1 || on[this.ivcL] === 1 || on[this.ivcO] === 1;
    let pv = false;
    for (let i = 0; i < this.nPv; i++) pv ||= on[this.pvL0 + i] === 1 || on[this.pvO0 + i] === 1;
    this.pvOn = pv;
    this.vesOn = this.aoOn || this.paOn || this.cavOn || this.pvOn;
  }
  /** Exact evaluation everywhere — for sampling at arbitrary points outside the voxel loop. */
  cullOff(): void {
    this.on.fill(1);
    this.ventOn = this.atrOn = this.vesOn = true;
    this.aoOn = this.paOn = this.cavOn = this.pvOn = true;
  }

  /**
   * Lower bound of S: the same smooth unions of the outer hulls as sample(), without the clip planes (which only
   * raise values) and without cavities (which only raise S). Cheap — used on the coarse corner lattice to prove
   * blocks empty.
   */
  outerBound(x: number, y: number, z: number): number {
    const tRV = this.tRV, tA = this.tA;
    const rvI = smin(this.eRvBody.d(x, y, z), this.eRvIn.d(x, y, z), K_RV);
    const vh = smin(smin(this.eLvEpi.d(x, y, z), rvI - tRV, K_INS), this.rOt.d(x, y, z) - tRV, K_OT);
    const la = smin(this.eLa.d(x, y, z), this.rLaa.d(x, y, z), K_APP);
    const ra = smin(this.eRa.d(x, y, z), this.rRaa.d(x, y, z), K_APP);
    const ah = smin(la - tA, ra - tA, K_ATR);
    let ves = Math.min(this.rAoO.d(x, y, z), this.rPaO.d(x, y, z), this.cSvcO.d(x, y, z), this.cIvcO.d(x, y, z));
    for (let i = 0; i < this.nPv; i++) ves = Math.min(ves, this.cPvO[i].d(x, y, z));
    return Math.min(vh, smin(ah, ves, K_VES));
  }

  private vE(s: Ellipsoid, i: number, x: number, y: number, z: number): number {
    return this.on[i] === 1 ? s.d(x, y, z) : this.far[i];
  }
  private vR(s: RoundCone, i: number, x: number, y: number, z: number): number {
    return this.on[i] === 1 ? s.d(x, y, z) : this.far[i];
  }
  private vC(s: CappedCylinder, i: number, x: number, y: number, z: number): number {
    return this.on[i] === 1 ? s.d(x, y, z) : this.far[i];
  }
  private vK(s: Capsule, i: number, x: number, y: number, z: number): number {
    return this.on[i] === 1 ? s.d(x, y, z) : this.far[i];
  }

  /** Ventricular hulls and cavities at p. */
  vent(x: number, y: number, z: number): void {
    if (!this.ventOn) {
      // every ventricular shape is > CULL away: values only need to be valid positive lower bounds
      this.lvO = this.rvI = this.lvHull = this.rvHull = this.otHull = this.ventHull = CULL;
      this.lvCav = this.rvCav = this.bandD = CULL;
      return;
    }
    const lvO = this.vE(this.eLvEpi, this.lvEpi, x, y, z);
    const lvI = this.vE(this.eLvEndo, this.lvEndo, x, y, z);
    const rvI = smin(this.vE(this.eRvBody, this.rvBody, x, y, z), this.vE(this.eRvIn, this.rvIn, x, y, z), K_RV);
    const otI = this.vR(this.rOt, this.ot, x, y, z);
    const otCap = this.pvPlane.d(x, y, z);
    const clipV = y - this.yV;
    const lvHull = Math.max(lvO, clipV);
    const rvHull = Math.max(rvI - this.tRV, clipV);
    const otHull = Math.max(otI - this.tRV, otCap);
    const bandD = Math.min(this.vK(this.kBand, this.band, x, y, z), this.vK(this.kApm, this.apm, x, y, z));
    // Clip after the smooth union: a blended pair of clipped shapes would otherwise bulge above the AV plane.
    let vh = Math.max(smin(lvHull, rvHull, K_INS), clipV);
    // Infundibulum fillet tapers to zero across the ring: above the AV plane the RVOT is a clean tube, so the atrial
    // exclusion distance (GAP_OT) from its surface holds exactly.
    const kOt = y <= this.yV ? K_OT : y >= this.yA ? 0 : (K_OT * (this.yA - y)) / (this.yA - this.yV);
    vh = kOt > 0 ? smin(vh, otHull, kOt) : Math.min(vh, otHull);
    vh = Math.min(vh, bandD);
    const lvot = Math.max(this.vR(this.rLvot, this.lvotC, x, y, z), this.aoPlane.d(x, y, z));
    const lvCav = Math.min(Math.max(lvI, clipV), lvot);
    const rvRaw = smin(Math.max(rvI, clipV), Math.max(otI, otCap), K_OT);
    // The RV cavity never enters the LV epicardial spheroid → septum = intact LV wall.
    const rvCav = Math.max(smax(rvRaw, -lvO, K_TIP), -bandD);
    this.lvO = lvO; this.rvI = rvI;
    this.lvHull = lvHull; this.rvHull = rvHull; this.otHull = otHull; this.ventHull = vh;
    this.lvCav = lvCav; this.rvCav = rvCav; this.bandD = bandD;
  }

  /** Great vessels and veins at p. */
  vessels(x: number, y: number, z: number): void {
    if (!this.vesOn) {
      this.aoOv = this.paOv = this.vesHull = this.vesLumen = CULL;
      this.vesPart = P_NONE;
      this.vesSleeve = false;
      return;
    }
    let hull = CULL, part: number = P_NONE, lumen = CULL, aoO = CULL, paO = CULL;
    if (this.aoOn) {
      const aoPl = this.aoPlane.d(x, y, z);
      lumen = Math.max(this.vR(this.rAoL, this.aoL, x, y, z), -aoPl);
      aoO = Math.max(this.vR(this.rAoO, this.aoO, x, y, z), -aoPl - 4, this.yV - y, this.aoTop.d(x, y, z));
      hull = aoO;
      part = P_AORTA;
    }
    if (this.paOn) {
      const pvPl = this.pvPlane.d(x, y, z);
      lumen = Math.min(lumen, Math.max(this.vR(this.rPaL, this.paL, x, y, z), -pvPl));
      paO = Math.max(this.vR(this.rPaO, this.paO, x, y, z), -pvPl - 3, this.paTop.d(x, y, z));
      if (paO < hull) { hull = paO; part = P_PULM; }
    }
    if (this.cavOn) {
      const svcO = this.vC(this.cSvcO, this.svcO, x, y, z), ivcO = this.vC(this.cIvcO, this.ivcO, x, y, z);
      if (svcO < hull) { hull = svcO; part = P_CAVAL; }
      if (ivcO < hull) { hull = ivcO; part = P_CAVAL; }
      lumen = Math.min(lumen, this.vC(this.cSvcL, this.svcL, x, y, z), this.vC(this.cIvcL, this.ivcL, x, y, z));
    }
    let sleeve = false;
    if (this.pvOn)
      for (let i = 0; i < this.nPv; i++) {
        const o = this.vC(this.cPvO[i], this.pvO0 + i, x, y, z);
        if (o < hull) {
          hull = o;
          part = P_PV;
          sleeve = this.cPvO[i].axial(x, y, z) * this.pvLen[i] < this.pvSleeve;
        }
        lumen = Math.min(lumen, this.vC(this.cPvL[i], this.pvL0 + i, x, y, z));
      }
    this.aoOv = aoO; this.paOv = paO;
    this.vesHull = hull; this.vesLumen = lumen; this.vesPart = part; this.vesSleeve = sleeve;
  }

  /** Atrial hulls and cavities at p; uses vessels() and vent() results at the same p. */
  atria(x: number, y: number, z: number): void {
    if (!this.atrOn) {
      this.laI = this.raI = this.aHull = this.laCav = this.raCav = this.laaI = this.raaI = CULL;
      return;
    }
    const tA = this.tA;
    const laI = this.vE(this.eLa, this.la, x, y, z), raI = this.vE(this.eRa, this.ra, x, y, z);
    const laaI = this.vR(this.rLaa, this.laa, x, y, z), raaI = this.vR(this.rRaa, this.raa, x, y, z);
    const laRaw = smin(laI, laaI, K_APP), raRaw = smin(raI, raaI, K_APP);
    const clipA = this.yA - y;
    const exclOT = this.otHull - GAP_OT;
    let hull = smin(laRaw - tA, raRaw - tA, K_ATR);
    hull = Math.max(hull, -exclOT, clipA);
    // Interatrial septum: bisector of the two cavities, interatrialSeptumMm thick.
    const b = 0.5 * (laRaw - raRaw);
    const excl = Math.min(this.aoOv, this.paOv, exclOT) - tA;
    this.laCav = Math.max(laRaw, b + this.halfIAS, -excl, clipA);
    this.raCav = Math.max(raRaw, -b + this.halfIAS, -excl, clipA);
    this.laI = laI; this.raI = raI; this.aHull = hull; this.laaI = laaI; this.raaI = raaI;
  }

  private setVentricular(): void {
    this.tissue = T_LV;
    if (this.bandD <= 0) this.part = P_BAND;
    else if (this.otHull < Math.min(this.lvHull, this.rvHull)) this.part = P_OUTFLOW;
  }
  private setVessel(): void {
    if (this.vesPart === P_PV && this.vesSleeve) {
      this.tissue = T_LA;
      this.part = P_PVSLEEVE;
    } else {
      this.tissue = T_VESSEL;
      this.part = this.vesPart;
    }
  }
  private setAtrial(): void {
    this.tissue = T_LA;
    if (this.laaI < this.laI && this.laaI < this.raI) this.part = P_LAA;
    else if (this.raaI < this.raI && this.raaI < this.laI) this.part = P_RAA;
  }

  /** Full classification at a voxel centre (frame A). */
  sample(x: number, y: number, z: number): void {
    const yV = this.yV, yA = this.yA;
    const slab = Math.max(yV - y, y - yA);
    let ori = Infinity, oriMitral = false;
    if (slab < 0) {
      // AV orifices: cylinders clipped to the cavities just below and just above the ring.
      const dmx = x - this.mvx, dmz = z - this.mvz, dtx = x - this.tvx, dtz = z - this.tvz;
      const cm = Math.sqrt(dmx * dmx + dmz * dmz) - this.mvr, ct = Math.sqrt(dtx * dtx + dtz * dtz) - this.tvr;
      if (cm < 3 || ct < 3) {
        this.vent(x, yV - PROBE, z);
        const lvB = this.lvCav, rvB = this.rvCav;
        this.vent(x, yA + PROBE, z);
        this.vessels(x, yA + PROBE, z);
        this.atria(x, yA + PROBE, z);
        const laA = this.laCav, raA = this.raCav;
        const mv = Math.max(cm, lvB + M_ORI, laA + M_ORI);
        const tv = Math.max(ct, rvB + M_ORI, raA + M_ORI);
        ori = Math.min(mv, tv);
        oriMitral = mv < tv;
      } else ori = Math.min(cm, ct); // ≥ 3 mm outside both cylinders: a lower bound, deep in ring tissue
    }
    this.vent(x, y, z);
    this.vessels(x, y, z);
    this.atria(x, y, z);

    const foot = Math.min(this.lvO, this.rvI - this.tRV, this.laI - this.tA, this.raI - this.tA);
    const ringHull = Math.max(slab, foot, -this.otHull);
    // Vessel–atrium fillets only above the ring (a blend reaching into the slab could seed atrial tissue there).
    const av = y > yA ? smin(this.aHull, this.vesHull, K_VES) : Math.min(this.aHull, this.vesHull);
    const hull = Math.min(this.ventHull, ringHull, av);
    const cav = Math.min(this.lvCav, this.rvCav, this.laCav, this.raCav, ori, this.vesLumen);
    const S = Math.max(hull, -cav);
    this.S = S;
    this.part = P_NONE;
    this.chamber = C_NONE;
    if (S < 0) {
      if (slab < 0 && this.otHull > 0) {
        // Inside the AV slab only fibrous ring (or a vessel passing outside the chamber footprint).
        if (this.vesHull <= 0 && ringHull > 0) {
          this.tissue = T_VESSEL;
          this.part = this.vesPart;
        } else this.tissue = T_RING;
      } else if (this.ventHull <= 0) this.setVentricular();
      else if (this.vesHull <= 0) this.setVessel();
      else if (this.aHull <= 0) this.setAtrial();
      else {
        // Smooth-union fillet: nearest component allowed in this zone (atrial tissue only above the ring).
        const a = y > yA ? this.aHull : Infinity;
        const m = Math.min(this.ventHull, this.vesHull, a);
        if (m === this.ventHull) this.setVentricular();
        else if (m === this.vesHull) this.setVessel();
        else this.setAtrial();
      }
    } else if (hull < 0 && cav < 0) {
      this.tissue = T_BLOOD;
      if (this.lvCav < 0) this.chamber = C_LV;
      else if (this.rvCav < 0) this.chamber = C_RV;
      else if (this.laCav < 0) this.chamber = C_LA;
      else if (this.raCav < 0) this.chamber = C_RA;
      else if (ori < 0) {
        const below = y < 0.5 * (yV + yA);
        this.chamber = oriMitral ? (below ? C_LV : C_LA) : below ? C_RV : C_RA;
      }
    } else this.tissue = T_OUT;
  }
}

export interface VoxelData {
  readonly dims: [number, number, number];
  readonly h: number;
  /** Centre of voxel (0,0,0) in the anatomical frame A. */
  readonly originA: Vec3;
  readonly sdf: Float32Array;
  /** Provisional: TISSUE.LV = any ventricular myocardium, TISSUE.LA = any atrial myocardium. */
  readonly tissue: Uint8Array;
  /** Blood voxels only (myocardium chambers are set in fields.ts). */
  readonly chamber: Uint8Array;
  readonly part: Uint8Array;
  readonly field: HeartField;
  /** Voxels sampled exactly / voxels in the (uncropped) sampling box. */
  readonly sampled: number;
  readonly boxVoxels: number;
}

/**
 * Samples the field on an h-grid aligned so that voxel centres sit at y = yV ± (k + ½)h — the ring is then exactly
 * round(ring/h) whole layers. Generator: yields progress 0..1 between z-slabs of blocks.
 */
export function* voxelize(L: HeartLayout, opts: { exhaustive?: boolean } = {}): Generator<number, VoxelData> {
  const h = L.h;
  const field = new HeartField(L);
  const { lo, hi } = field.bounds();
  const align = (v: number, ref: number) => ref + h * (Math.floor((v - ref) / h) + 0.5);
  const o0: Vec3 = [align(lo[0], 0), align(lo[1], L.yV), align(lo[2], 0)];
  const nx0 = Math.ceil((hi[0] - o0[0]) / h) + 1;
  const ny0 = Math.ceil((hi[1] - o0[1]) / h) + 1;
  const nz0 = Math.ceil((hi[2] - o0[2]) / h) + 1;
  const N0 = nx0 * ny0 * nz0;
  const sdf0 = new Float32Array(N0);
  const tis0 = new Uint8Array(N0);
  const ch0 = new Uint8Array(N0);
  const part0 = new Uint8Array(N0);
  let i0 = nx0, j0 = ny0, k0 = nz0, i1 = -1, j1 = -1, k1 = -1;
  let sampled = 0;

  // Coarse corner lattice (every BLOCK voxels): proves blocks empty when every corner is far outside.
  const bx = Math.ceil(nx0 / BLOCK), by = Math.ceil(ny0 / BLOCK), bz = Math.ceil(nz0 / BLOCK);
  const cS = new Float64Array((bx + 1) * (by + 1) * (bz + 1));
  field.cullOff();
  for (let c = 0, kc = 0; kc <= bz; kc++)
    for (let jc = 0; jc <= by; jc++)
      for (let ic = 0; ic <= bx; ic++, c++) cS[c] = field.outerBound(o0[0] + ic * BLOCK * h, o0[1] + jc * BLOCK * h, o0[2] + kc * BLOCK * h);
  const empty = LIP * 0.5 * Math.sqrt(3) * BLOCK * h;
  const cIdx = (ic: number, jc: number, kc: number) => ic + (bx + 1) * (jc + (by + 1) * kc);
  const pad = L.yA - L.yV + PROBE + h; // orifice probes reach this far outside the block

  for (let kb = 0; kb < bz; kb++) {
    for (let jb = 0; jb < by; jb++)
      for (let ib = 0; ib < bx; ib++) {
        const ia = ib * BLOCK, ja = jb * BLOCK, ka = kb * BLOCK;
        const ie = Math.min(nx0, ia + BLOCK), je = Math.min(ny0, ja + BLOCK), ke = Math.min(nz0, ka + BLOCK);
        let allOut = !opts.exhaustive; // exhaustive: sample every voxel (tests check the skip is lossless)
        for (let q = 0; q < 8 && allOut; q++) {
          const c = cIdx(ib + (q & 1), jb + ((q >> 1) & 1), kb + ((q >> 2) & 1));
          if (cS[c] < empty) allOut = false;
        }
        if (allOut) {
          // Empty block: Out everywhere; SDF ≈ trilinear blend of the corner bounds (smooth, positive, far from tissue).
          const s000 = cS[cIdx(ib, jb, kb)], s100 = cS[cIdx(ib + 1, jb, kb)];
          const s010 = cS[cIdx(ib, jb + 1, kb)], s110 = cS[cIdx(ib + 1, jb + 1, kb)];
          const s001 = cS[cIdx(ib, jb, kb + 1)], s101 = cS[cIdx(ib + 1, jb, kb + 1)];
          const s011 = cS[cIdx(ib, jb + 1, kb + 1)], s111 = cS[cIdx(ib + 1, jb + 1, kb + 1)];
          for (let k = ka; k < ke; k++) {
            const fz = (k - ka) / BLOCK;
            for (let j = ja; j < je; j++) {
              const fy = (j - ja) / BLOCK;
              const a0 = s000 + (s010 - s000) * fy, a1 = s100 + (s110 - s100) * fy;
              const b0 = s001 + (s011 - s001) * fy, b1 = s101 + (s111 - s101) * fy;
              for (let i = ia; i < ie; i++) {
                const fx = (i - ia) / BLOCK;
                const lo_ = a0 + (a1 - a0) * fx, hi_ = b0 + (b1 - b0) * fx;
                sdf0[i + nx0 * (j + ny0 * k)] = lo_ + (hi_ - lo_) * fz;
              }
            }
          }
          continue; // tissue/chamber/part arrays are already 0 = Out / None
        }
        field.cullTo(
          o0[0] + ia * h, o0[1] + ja * h, o0[2] + ka * h,
          o0[0] + (ie - 1) * h, o0[1] + (je - 1) * h, o0[2] + (ke - 1) * h,
          pad,
        );
        sampled += (ie - ia) * (je - ja) * (ke - ka);
        for (let k = ka; k < ke; k++)
          for (let j = ja; j < je; j++)
            for (let i = ia; i < ie; i++) {
              field.sample(o0[0] + i * h, o0[1] + j * h, o0[2] + k * h);
              const v = i + nx0 * (j + ny0 * k);
              sdf0[v] = field.S;
              tis0[v] = field.tissue;
              ch0[v] = field.chamber;
              part0[v] = field.part;
              if (field.S < 0) {
                if (i < i0) i0 = i;
                if (i > i1) i1 = i;
                if (j < j0) j0 = j;
                if (j > j1) j1 = j;
                if (k < k0) k0 = k;
                if (k > k1) k1 = k;
              }
            }
      }
    if ((kb & 3) === 3 || kb === bz - 1) yield (kb + 1) / bz; // ~every 6 mm of z: enough for a loading bar
  }
  field.cullOff();

  // Crop to the tissue + margin.
  const m = L.p.marginVoxels;
  if (i0 - m < 0 || j0 - m < 0 || k0 - m < 0 || i1 + m >= nx0 || j1 + m >= ny0 || k1 + m >= nz0)
    throw new Error('heart geometry: tissue touches the sampling box — enlarge HeartField.bounds()');
  const ci = i0 - m, cj = j0 - m, ck = k0 - m;
  const nx = i1 - i0 + 1 + 2 * m, ny = j1 - j0 + 1 + 2 * m, nz = k1 - k0 + 1 + 2 * m;
  const N = nx * ny * nz;
  const sdf = new Float32Array(N), tissue = new Uint8Array(N), chamber = new Uint8Array(N), part = new Uint8Array(N);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++) {
      const src = ci + nx0 * (cj + j + ny0 * (ck + k));
      const dst = nx * (j + ny * k);
      sdf.set(sdf0.subarray(src, src + nx), dst);
      tissue.set(tis0.subarray(src, src + nx), dst);
      chamber.set(ch0.subarray(src, src + nx), dst);
      part.set(part0.subarray(src, src + nx), dst);
    }
  const originA: Vec3 = [o0[0] + ci * h, o0[1] + cj * h, o0[2] + ck * h];
  return { dims: [nx, ny, nz], h, originA, sdf, tissue, chamber, part, field, sampled, boxVoxels: N0 };
}
