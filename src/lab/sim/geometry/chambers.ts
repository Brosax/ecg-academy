/**
 * Procedural heart parameters and the derived anatomical layout.
 *
 * Everything here lives in the ANATOMICAL frame "A" (mm): the LV long axis is the y axis, y = 0 is the top of the
 * ventricular myocardium (AV plane), +y apex→base, +z anterior (RV side), +x LV lateral — the same axes as the local
 * frame. heart.ts re-centres the finished bundle so that the local origin is the ventricular centroid (types.ts).
 *
 * Dimensions: docs/research/lead-geometry-anatomy.md §6 (ASE/EACVI 2015, Lee 2015) and §8 (conduction system).
 * Positions of valves/vessels are stylised but keep the textbook arrangement seen from above (§"Unsourced"):
 * aortic valve central and anterior-right of the mitral, pulmonary valve anterior-left-superior, tricuspid right,
 * LA the most posterior chamber.
 */
import { add, cross, normalize, scale } from '../frame';
import type { Vec3 } from '../types';

export interface HeartParams {
  /** Voxel edge (mm). */
  readonly hMm: number;
  /** Empty voxels kept on every side of the tissue (surface nets needs ≥ 1; the task asks ≥ 3). */
  readonly marginVoxels: number;
  /** Render-mesh spacing = meshScale·h (the voxel grid stays at h); 1.25 keeps the mesh at 40–90k triangles. */
  readonly meshScale: number;
  /** Fibrous AV ring (insulating) thickness; rounded to whole voxel layers, at least 2. */
  readonly ringMm: number;

  /** LV end-diastolic internal radius: LVIDd 50.2 mm in men (ASE/EACVI 2015, §6a). */
  readonly lvCavityRadiusMm: number;
  /** AV plane → endocardial apex. Long axis mitral annulus → apex ≈ 8–9 cm (§"Unsourced"). */
  readonly lvCavityLengthMm: number;
  /** Equator of the cavity spheroid below the AV plane (> 0 narrows the base slightly). */
  readonly lvEquatorBelowAvMm: number;
  /** Wall at the spheroid equator; confocal shells thin it toward the apex (≈ 4 mm). ASE: 6–10 mm. */
  readonly lvWallMm: number;

  /** RV free wall: 3–5 mm, > 5 mm = hypertrophy (Rudski 2010, §6b). */
  readonly rvWallMm: number;
  /** Direction of the RV inflow sinus around the LV axis (deg, 0 = +x lateral, 90 = +z anterior). */
  readonly rvAngleDeg: number;
  /** RV body blob centre lies this far INSIDE the LV epicardial radius (the LV bulges into it → crescent). */
  readonly rvInsetMm: number;
  /** RV body cavity semi-axes at the base: radial (away from the LV), tangential, long (base → RV apex). */
  readonly rvRadialMm: number;
  readonly rvTangentialMm: number;
  readonly rvLengthMm: number;
  /** Tilt of the RV long axis toward the LV axis going apically (deg). */
  readonly rvTiltDeg: number;
  /** Inflow sinus under the tricuspid valve (semi-axis across); RV basal diameter 25–41 mm (ASE 2015, §6b). */
  readonly rvInflowRadiusMm: number;

  /** Atrial wall: ≥ 2 voxels (plan: ≥ 3 mm). */
  readonly atrialWallMm: number;
  readonly interatrialSeptumMm: number;
  /** Uniform scale of each atrial cavity (atrial enlargement scenarios). */
  readonly laScale: number;
  readonly raScale: number;

  readonly vesselWallMm: number;
  /** Ascending aorta ≈ 30 mm, main pulmonary artery ≈ 26 mm (Lee 2015, §6c). */
  readonly aortaRadiusMm: number;
  readonly pulmonaryTrunkRadiusMm: number;
  /** Great-vessel stub length (3–5 cm). */
  readonly vesselStubMm: number;

  /** Valve orifice radii: mitral ≈ 3 cm, tricuspid ≈ 3.5 cm across (§"Unsourced"); aortic annulus ≈ 23 mm. */
  readonly mitralRadiusMm: number;
  readonly tricuspidRadiusMm: number;
  readonly aorticRadiusMm: number;
  readonly pulmonaryRadiusMm: number;
}

export const DEFAULT_HEART_PARAMS: HeartParams = {
  hMm: 1.5,
  marginVoxels: 3,
  meshScale: 1.25,
  ringMm: 4.5,
  lvCavityRadiusMm: 25,
  lvCavityLengthMm: 80,
  lvEquatorBelowAvMm: 10,
  lvWallMm: 10,
  rvWallMm: 3.8,
  rvAngleDeg: 150,
  rvInsetMm: 14.5,
  rvRadialMm: 40,
  rvTangentialMm: 42,
  rvLengthMm: 72,
  rvTiltDeg: 4,
  rvInflowRadiusMm: 19.5,
  atrialWallMm: 3.3,
  interatrialSeptumMm: 4.5,
  laScale: 1,
  raScale: 1,
  vesselWallMm: 3.2,
  aortaRadiusMm: 15,
  pulmonaryTrunkRadiusMm: 13,
  vesselStubMm: 36,
  mitralRadiusMm: 15,
  tricuspidRadiusMm: 16.5,
  aorticRadiusMm: 11.5,
  pulmonaryRadiusMm: 12,
};

export interface Tube {
  readonly a: Vec3;
  readonly b: Vec3;
  /** Lumen radius at a and b. */
  readonly ra: number;
  readonly rb: number;
}

/** Derived positions in the anatomical frame A (mm). */
export interface HeartLayout {
  readonly p: HeartParams;
  readonly h: number;
  /** Top of ventricular myocardium / bottom of the ring; bottom of atrial myocardium / top of the ring. */
  readonly yV: number;
  readonly yA: number;

  readonly lvCenterY: number;
  /** Cavity (rc, lc) and epicardium (rcE, lcE) semi-axes — confocal spheroids. */
  readonly lvRc: number;
  readonly lvLc: number;
  readonly lvRcE: number;
  readonly lvLcE: number;
  readonly yApexEpi: number;
  readonly yApexEndo: number;

  readonly rvCenter: Vec3;
  /** Orthonormal RV blob frame: radial, long (toward base), tangential. */
  readonly rvAxR: Vec3;
  readonly rvAxL: Vec3;
  readonly rvAxT: Vec3;
  readonly rvSemi: Vec3; // radial, long, tangential
  /** Inflow sinus ellipsoid (under the tricuspid valve): centre, semi-axes (radial, long, tangential), frame. */
  readonly rvInflowCenter: Vec3;
  readonly rvInflowSemi: Vec3;
  readonly rvInflowAxR: Vec3;
  readonly rvInflowAxT: Vec3;
  readonly outflow: Tube; // infundibulum cavity (RV body → pulmonary valve)
  readonly lvot: Tube; // LV outflow tract cavity (LV → aortic valve)

  readonly mitral: { readonly c: Vec3; readonly r: number };
  readonly tricuspid: { readonly c: Vec3; readonly r: number };
  readonly aorticValve: { readonly c: Vec3; readonly n: Vec3; readonly r: number };
  readonly pulmonaryValve: { readonly c: Vec3; readonly n: Vec3; readonly r: number };

  readonly aorta: Tube;
  readonly pulmonaryTrunk: Tube;

  readonly laCenter: Vec3;
  readonly laSemi: Vec3;
  readonly raCenter: Vec3;
  readonly raSemi: Vec3;
  readonly laa: Tube;
  readonly raa: Tube;
  /** RSPV, RIPV, LSPV, LIPV — lumen tubes starting inside the LA cavity. */
  readonly pulmonaryVeins: readonly Tube[];
  /** Myocardial sleeve length measured from each PV tube start (atrial tissue; PV ectopy source). */
  readonly pvSleeveMm: number;
  readonly svc: Tube;
  readonly ivc: Tube;
}

const deg = Math.PI / 180;
const polar = (angDeg: number, r: number, y: number): Vec3 => [r * Math.cos(angDeg * deg), y, r * Math.sin(angDeg * deg)];

export function mergeParams(params?: Partial<HeartParams>): HeartParams {
  return { ...DEFAULT_HEART_PARAMS, ...(params ?? {}) };
}

export function heartLayout(p: HeartParams): HeartLayout {
  const h = p.hMm;
  const yV = 0;
  const yA = yV + Math.max(2, Math.round(p.ringMm / h)) * h;

  // LV: confocal prolate spheroids → uniform-ish free wall that thins toward the apex (tanh μ ≈ 0.4).
  const lvRc = p.lvCavityRadiusMm;
  const lvLc = p.lvCavityLengthMm - p.lvEquatorBelowAvMm;
  const lvCenterY = yV - p.lvEquatorBelowAvMm;
  const focal2 = lvLc * lvLc - lvRc * lvRc;
  const lvRcE = lvRc + p.lvWallMm;
  const lvLcE = Math.sqrt(focal2 + lvRcE * lvRcE);

  // RV inflow/body blob: centre at the base, long axis tilted toward the LV apex.
  const th = p.rvAngleDeg * deg;
  const eR: Vec3 = [Math.cos(th), 0, Math.sin(th)];
  const eY: Vec3 = [0, 1, 0];
  const t = p.rvTiltDeg * deg;
  const rvAxL = normalize(add(scale(eY, Math.cos(t)), scale(eR, Math.sin(t))));
  const rvAxR = normalize(add(scale(eR, Math.cos(t)), scale(eY, -Math.sin(t))));
  const rvAxT = normalize(cross(rvAxL, rvAxR));
  const rvCenter: Vec3 = polar(p.rvAngleDeg, lvRcE - p.rvInsetMm, yV);

  // Valves at the base (seen from above: MV posterior-lateral, AoV central/anterior-right, TV right, PV anterior).
  const ringMid = (yV + yA) / 2;
  const mitral = { c: [10, ringMid, -6] as Vec3, r: p.mitralRadiusMm };
  const tricuspid = { c: polar(165, lvRcE + p.tricuspidRadiusMm + 1.5, ringMid), r: p.tricuspidRadiusMm };
  const aoN = normalize([-0.25, 0.96, 0.12]);
  const aorticValve = { c: [-12, yA + 1.5, 15] as Vec3, n: aoN, r: p.aorticRadiusMm };
  const otStart = polar(115, lvRcE + 10, -20);
  const tvDir = normalize([tricuspid.c[0], 0, tricuspid.c[2]]);
  const rvInflowCenter: Vec3 = [tricuspid.c[0], yV - 5, tricuspid.c[2]];
  const rvInflowSemi: Vec3 = [p.rvInflowRadiusMm, 22, p.rvInflowRadiusMm + 1.5];
  const rvInflowAxT = normalize(cross([0, 1, 0], tvDir));
  const pvC: Vec3 = [6, yA + 17.5, lvRcE + 7];
  const paDir = normalize([0.3, 0.85, -0.43]);
  const otDir = normalize([pvC[0] - otStart[0], pvC[1] - otStart[1], pvC[2] - otStart[2]]);
  const pulmonaryValve = { c: pvC, n: normalize(add(paDir, otDir)), r: p.pulmonaryRadiusMm };
  const outflow: Tube = { a: otStart, b: pvC, ra: p.pulmonaryRadiusMm + 2, rb: p.pulmonaryRadiusMm };
  const lvot: Tube = { a: [-6, yV - 16, 6], b: aorticValve.c, ra: p.aorticRadiusMm - 2.5, rb: p.aorticRadiusMm };

  const aorta: Tube = {
    a: aorticValve.c,
    b: add(aorticValve.c, scale(aoN, p.vesselStubMm)),
    ra: p.aorticRadiusMm + 1,
    rb: p.aortaRadiusMm,
  };
  const pulmonaryTrunk: Tube = {
    a: pvC,
    b: add(pvC, scale(paDir, p.vesselStubMm - 4)),
    ra: p.pulmonaryRadiusMm + 0.5,
    rb: p.pulmonaryTrunkRadiusMm,
  };

  // Atria: domes over the AV ring (cavity ellipsoids centred just above the ring so the floor is wide enough
  // for the AV orifices). LA posterior, RA right/anterior; the aortic root nestles in front of the septum.
  const laSemi: Vec3 = scale([25, 30, 18], p.laScale);
  const raSemi: Vec3 = scale([25, 28, 21], p.raScale);
  const laCenter: Vec3 = [0, yA + 1.5, -8];
  const raCenter: Vec3 = [-45, yA + 1.5, 12];
  const laa: Tube = { a: [19, yA + 16, 2], b: [33, yA + 18, 19], ra: 7.5, rb: 4.5 };
  const raa: Tube = { a: [-36, yA + 10, 25], b: [-29, yA + 14, 37], ra: 8.5, rb: 5 };
  const pv = (a: Vec3, d: Vec3, r: number): Tube => ({ a, b: add(a, scale(normalize(d), 26)), ra: r, rb: r });
  const pulmonaryVeins = [
    pv([-13, yA + 20, -15], [-0.45, 0.25, -0.86], 6.5),
    pv([-13, yA + 9, -17], [-0.5, -0.04, -0.86], 6.5),
    pv([15, yA + 20, -15], [0.5, 0.25, -0.83], 5.5),
    pv([15, yA + 9, -17], [0.55, -0.04, -0.83], 5.5),
  ];
  const svc: Tube = { a: [-46, yA + 16, 8], b: [-44, yA + 50, 4], ra: 9, rb: 9 };
  const ivc: Tube = { a: [-48, yA + 14, 2], b: [-52, yA + 9, -27], ra: 10, rb: 10 };

  return {
    p, h, yV, yA,
    lvCenterY, lvRc, lvLc, lvRcE, lvLcE,
    yApexEpi: lvCenterY - lvLcE,
    yApexEndo: lvCenterY - lvLc,
    rvCenter, rvAxR, rvAxL, rvAxT,
    rvSemi: [p.rvRadialMm, p.rvLengthMm, p.rvTangentialMm],
    rvInflowCenter, rvInflowSemi, rvInflowAxR: tvDir, rvInflowAxT,
    outflow, lvot,
    mitral, tricuspid, aorticValve, pulmonaryValve,
    aorta, pulmonaryTrunk,
    laCenter, laSemi, raCenter, raSemi, laa, raa,
    pulmonaryVeins, pvSleeveMm: 16,
    svc, ivc,
  };
}
