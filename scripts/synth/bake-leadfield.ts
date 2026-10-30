/**
 * Bakes src/synth/leads/leadTable.gen.ts: lead vectors of the chest/back surface from prototype C's BEM torso
 * (DECISION §2.2.1, §6.8). Dev-only (Node), never imported by src/.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/bake-leadfield.ts [--coarse] [--check]
 *
 * Method
 *  1. Volume conductor: C's homogeneous bounded torso and collocation BEM (`_proto/field/torso.ts`: solid-angle
 *     matrix with deflation, dense LU), on an elliptic cylinder fitted to the engine's electrode landmarks
 *     (src/synth/leads/torso.ts: half-width 16 cm, half-depth 9.5 cm, axis 2.5 cm right of and behind the ventricular
 *     centroid; trunk from the shoulder junctions, Y = −18 cm, to the leg junction, Y = +30 cm). Uniform 6° azimuth,
 *     1.25 cm rows over the chest (`--coarse`: 9°, 2 cm — the discretisation check).
 *  2. Reciprocity: for each electrode (Gaussian patch: chest 0.9 cm, arm junctions 3.8 cm, leg junction 5 cm) solve
 *     Aᵀc = w once; Z_e(x) = Σ cᵢ/|rᵢ − x| is the potential of a unit dipole field, and the electrode's lead vector at a
 *     source point is ∇Z_e there (central differences, 1 mm) — at the ventricular centroid (origin) and at the atrial
 *     centroid (ATRIAL_FIELD_LOC).
 *  3. Gauge: Wilson's central terminal (L ← L − (L_RA + L_LA + L_LL)/3), the gauge of the Dower rows.
 *  4. Torso correction: the 3×3 least-squares map M taking the BEM vectors to the published Dower rows (the nine
 *     standard electrodes and the six extra rows V3R–V5R, V7–V9: an empirical lead field). The table stores M·L_BEM;
 *     src/synth/leads/leadfield.ts adds a smooth radial-basis residual so that the published Dower rows are
 *     reproduced exactly at their sites.
 *  5. Grid: azimuth −100°…180° every 10°, height −12…24 cm every 2 cm (right mid-axillary line round the left side to
 *     the spine, 1st ICS to the iliac crests) — V3R–V5R, V7–V9, high / low placements, Mason–Likar sites.
 *
 * The report (also written into the generated header) compares the BEM vectors with Dower's extra rows (DECISION §13.1).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Vec3 } from '../../src/synth/api';
import { DOWER, DOWER_EXTRA } from '../../src/synth/leads/dower';
import { ATRIAL_FIELD_LOC, chestSurface, EXTRA_CHEST_SITES, MASON_LIKAR, STANDARD_POS, thetaOf, TORSO, type SurfacePoint } from '../../src/synth/leads/torso';

interface Mesh {
  tris: number[][];
  cen: Float64Array;
  area: Float64Array;
  nrm: Float64Array;
  n: number;
}
interface TorsoModule {
  bemMatrix(mesh: Mesh): Float64Array;
  luFactor(A: Float64Array, n: number): Int32Array;
  luSolveT(LU: Float64Array, piv: Int32Array, n: number, b: Float64Array): Float64Array;
  electrodeWeights(mesh: Mesh, pos: readonly [number, number, number], r: number): Float64Array;
}
// a runtime import keeps the prototype out of the type-checked program (it is not part of src/ or scripts/)
const C = (await import(new URL('../../_proto/field/torso.ts', import.meta.url).href)) as TorsoModule;

const OUT = fileURLToPath(new URL('../../src/synth/leads/leadTable.gen.ts', import.meta.url));
const args = process.argv.slice(2);
const coarse = args.includes('--coarse');
const check = args.includes('--check');

// ── body frame of the BEM (mm; x left, y up, z anterior; origin on the cylinder axis) ↔ Frank (cm) ─────────────────
const A_MM = TORSO.a * 10, B_MM = TORSO.b * 10;
const toBody = (p: Vec3): [number, number, number] => [10 * (p[0] - TORSO.xc), -10 * p[1], -10 * (p[2] - TORSO.zc)];
const surfBody = (s: SurfacePoint): [number, number, number] => {
  const t = (s.thetaDeg * Math.PI) / 180;
  return [A_MM * Math.sin(t), -10 * s.y, B_MM * Math.cos(t)];
};

// ── mesh (C's torsoMesh construction with uniform azimuth and chosen rows) ──────────────────────────────────────────
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
    let A = 0;
    const c = [0, 0, 0], nn = [0, 0, 0];
    const flat: number[] = [];
    for (const t of panels[i]) {
      const [a, nv] = triArea(t);
      A += a;
      for (let k = 0; k < 3; k++) {
        c[k] += (a * (t[k] + t[3 + k] + t[6 + k])) / 3;
        nn[k] += a * nv[k];
      }
      flat.push(...t);
    }
    tris.push(flat);
    area[i] = A;
    const nl = Math.hypot(nn[0], nn[1], nn[2]);
    for (let k = 0; k < 3; k++) {
      cen[3 * i + k] = c[k] / A;
      nrm[3 * i + k] = nn[k] / nl;
    }
  }
  return { tris, cen, area, nrm, n };
}
function cylinderMesh(stepDeg: number, rowMm: number): Mesh {
  const yTop = -10 * TORSO.top, yBot = -10 * TORSO.bottom;
  const phis: number[] = [];
  for (let a = 0; a < 360 - 1e-9; a += stepDeg) phis.push(a);
  const m = phis.length;
  const ys: number[] = [yBot, yBot + 25, yBot + 50];
  for (let y = yBot + 70; y < yTop - 25; y += rowMm) ys.push(y);
  ys.push(yTop - 12, yTop);
  const P = (phi: number, y: number, s = 1): number[] => {
    const r = (phi * Math.PI) / 180;
    return [s * A_MM * Math.sin(r), y, s * B_MM * Math.cos(r)];
  };
  const panels: number[][][] = [];
  for (let j = 0; j + 1 < ys.length; j++)
    for (let i = 0; i < m; i++) {
      const a = P(phis[i], ys[j]), b = P(phis[(i + 1) % m], ys[j]), c = P(phis[(i + 1) % m], ys[j + 1]), d = P(phis[i], ys[j + 1]);
      panels.push([[...a, ...b, ...c], [...a, ...c, ...d]]);
    }
  const rings = [1, 0.7, 0.4];
  for (const [y, up] of [[yTop, 1], [yBot, -1]] as const) {
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
  for (let i = 0; i < mesh.n; i++) {
    const cx = mesh.cen[3 * i], cy = mesh.cen[3 * i + 1], cz = mesh.cen[3 * i + 2];
    const out = Math.abs(cy - yTop) < 1e-6 ? mesh.nrm[3 * i + 1] : Math.abs(cy - yBot) < 1e-6 ? -mesh.nrm[3 * i + 1] : cx * mesh.nrm[3 * i] + cz * mesh.nrm[3 * i + 2];
    if (out <= 0) throw new Error(`bake-leadfield: panel ${i} has an inward normal`);
  }
  return mesh;
}

// ── BEM ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const t0 = Date.now();
const mesh = coarse ? cylinderMesh(9, 20) : cylinderMesh(6, 12.5);
console.log(`mesh: ${mesh.n} panels`);
const Amat = C.bemMatrix(mesh);
const piv = C.luFactor(Amat, mesh.n);
console.log(`BEM factorised in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const VENT_SRC = toBody([0, 0, 0]);
const ATR_SRC = toBody(ATRIAL_FIELD_LOC);

/** Reciprocal lead vectors (Frank axes, arbitrary common scale) of one electrode at the two source points. */
function leadVectors(pos: readonly [number, number, number], r: number): { v: Vec3; a: Vec3 } {
  const coef = C.luSolveT(Amat, piv, mesh.n, C.electrodeWeights(mesh, pos, r));
  const cen = mesh.cen;
  const Z = (x: number, y: number, z: number): number => {
    let s = 0;
    for (let i = 0; i < mesh.n; i++) s += coef[i] / Math.hypot(cen[3 * i] - x, cen[3 * i + 1] - y, cen[3 * i + 2] - z);
    return s;
  };
  const grad = (p: readonly number[]): Vec3 => {
    const d = 1;
    const gx = (Z(p[0] + d, p[1], p[2]) - Z(p[0] - d, p[1], p[2])) / (2 * d);
    const gy = (Z(p[0], p[1] + d, p[2]) - Z(p[0], p[1] - d, p[2])) / (2 * d);
    const gz = (Z(p[0], p[1], p[2] + d) - Z(p[0], p[1], p[2] - d)) / (2 * d);
    return [gx, -gy, -gz]; // body (x, y up, z anterior) → Frank (X, Y inferior, Z posterior)
  };
  return { v: grad(VENT_SRC), a: grad(ATR_SRC) };
}

const onCylinder = (p: Vec3): SurfacePoint => ({ thetaDeg: thetaOf(p), y: p[1] });

// electrodes: limb junction patches, the six standard chest sites (projected), the Dower extra sites, Mason–Likar
const yBotBody = -10 * TORSO.bottom;
const LIMB = {
  RA: { pos: [-A_MM, -10 * STANDARD_POS.RA[1], 0] as [number, number, number], r: 38 },
  LA: { pos: [A_MM, -10 * STANDARD_POS.LA[1], 0] as [number, number, number], r: 38 },
  LL: { pos: [toBody(STANDARD_POS.LL)[0], yBotBody, toBody(STANDARD_POS.LL)[2]] as [number, number, number], r: 50 },
};
const STD_CHEST = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
const raw: Record<string, { v: Vec3; a: Vec3 }> = {};
for (const [k, e] of Object.entries(LIMB)) raw[k] = leadVectors(e.pos, e.r);
for (const k of STD_CHEST) raw[k] = leadVectors(surfBody(onCylinder(STANDARD_POS[k])), 9);
for (const [k, s] of Object.entries(EXTRA_CHEST_SITES)) raw[k] = leadVectors(surfBody(chestSurface(s)), 9);
for (const [k, s] of Object.entries(MASON_LIKAR)) raw[`${k}@ml`] = leadVectors(surfBody(s), 9);

// grid
const GRID = { theta0: -100, thetaStep: 10, nTheta: 29, y0: -12, yStep: 2, nY: 19 } as const;
const gridRaw: { v: Vec3; a: Vec3 }[] = [];
for (let iy = 0; iy < GRID.nY; iy++)
  for (let it = 0; it < GRID.nTheta; it++) gridRaw.push(leadVectors(surfBody({ thetaDeg: GRID.theta0 + it * GRID.thetaStep, y: GRID.y0 + iy * GRID.yStep }), 9));
console.log(`lead vectors computed in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// ── WCT gauge ──────────────────────────────────────────────────────────────────────────────────────────────────
const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const wct = (col: 'v' | 'a'): Vec3 => {
  const r = raw.RA[col], l = raw.LA[col], f = raw.LL[col];
  return [(r[0] + l[0] + f[0]) / 3, (r[1] + l[1] + f[1]) / 3, (r[2] + l[2] + f[2]) / 3];
};
const WV = wct('v'), WA = wct('a');
const gauge = (x: { v: Vec3; a: Vec3 }): { v: Vec3; a: Vec3 } => ({ v: sub3(x.v, WV), a: sub3(x.a, WA) });

// ── M: 3×3 least squares BEM → Dower ─────────────────────────────────────────────────────────────────────────────
const L_RA = DOWER.I.map((_, c) => -(DOWER.I[c] + DOWER.II[c]) / 3) as unknown as Vec3;
const DOWER_SITE: Record<string, Vec3> = {
  RA: L_RA,
  LA: [L_RA[0] + DOWER.I[0], L_RA[1] + DOWER.I[1], L_RA[2] + DOWER.I[2]],
  LL: [L_RA[0] + DOWER.II[0], L_RA[1] + DOWER.II[1], L_RA[2] + DOWER.II[2]],
  V1: DOWER.V1, V2: DOWER.V2, V3: DOWER.V3, V4: DOWER.V4, V5: DOWER.V5, V6: DOWER.V6,
  ...DOWER_EXTRA,
};
const STD9 = ['RA', 'LA', 'LL', ...STD_CHEST] as const;
const ALL15 = [...STD9, ...Object.keys(DOWER_EXTRA)];
function inv3(m: readonly number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), Cc = d * h - e * g;
  const det = a * A + b * B + c * Cc;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
/** M = (Σ D Bᵀ)(Σ B Bᵀ)⁻¹ over the given sites. */
function fitM(keys: readonly string[]): number[] {
  const DB = [0, 0, 0, 0, 0, 0, 0, 0, 0], BB = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const k of keys) {
    const B = gauge(raw[k]).v, D = DOWER_SITE[k];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      DB[3 * i + j] += D[i] * B[j];
      BB[3 * i + j] += B[i] * B[j];
    }
  }
  const BBi = inv3(BB);
  const M: number[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M.push(DB[3 * i] * BBi[j] + DB[3 * i + 1] * BBi[3 + j] + DB[3 * i + 2] * BBi[6 + j]);
  return M;
}
const applyM = (M: readonly number[], v: Vec3): Vec3 => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
const M9 = fitM(STD9);
const M = fitM(ALL15);
const mapped = (x: { v: Vec3; a: Vec3 }, m: readonly number[] = M): { v: Vec3; a: Vec3 } => {
  const g = gauge(x);
  return { v: applyM(m, g.v), a: applyM(m, g.a) };
};

// ── report ──────────────────────────────────────────────────────────────────────────────────────────────────────
const len = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const angle = (a: Vec3, b: Vec3): number => (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b))))) * 180) / Math.PI;
const f3 = (v: readonly number[]): string => `[${v.map((x) => x.toFixed(3)).join(', ')}]`;
const report: string[] = [];
const norm = Math.hypot(...M) / Math.sqrt(3);
report.push(`BEM ${mesh.n} panels${coarse ? ' (coarse)' : ''}.`);
report.push('Validation (DECISION §13.1): M fitted on the nine standard electrodes only; residual angle ° and |M·L_BEM| / |Dower|:');
for (const k of ALL15) {
  const m = mapped(raw[k], M9).v, d = DOWER_SITE[k];
  report.push(`  ${k.padEnd(4)} ${angle(m, d).toFixed(1).padStart(5)}°  ${(len(m) / len(d)).toFixed(2)}${k in DOWER_EXTRA ? `   BEM ${f3(m)}  Dower ${f3(d)}` : ''}`);
}
report.push(`Table map: M fitted on all 15 published rows (9 standard + 6 extra), M/|M| = ${f3(M.slice(0, 3).map((x) => x / norm))} ${f3(M.slice(3, 6).map((x) => x / norm))} ${f3(M.slice(6, 9).map((x) => x / norm))};`);
report.push('residual angle ° and magnitude ratio before the exact anchor blend:');
report.push(`  ${ALL15.map((k) => `${k} ${angle(mapped(raw[k]).v, DOWER_SITE[k]).toFixed(0)}°/${(len(mapped(raw[k]).v) / len(DOWER_SITE[k])).toFixed(2)}`).join('  ')}`);
report.push(`Mason–Likar sites (M·L_BEM): RA ${f3(mapped(raw['RA@ml']).v)}  LA ${f3(mapped(raw['LA@ml']).v)}  LL ${f3(mapped(raw['LL@ml']).v)}`);
console.log(report.join('\n'));

// ── output ─────────────────────────────────────────────────────────────────────────────────────────────────────
const r4 = (x: number): string => {
  const s = (Math.round(x * 1e4) / 1e4).toString();
  return s === '-0' ? '0' : s;
};
const flat = (col: 'v' | 'a'): string => {
  const rows: string[] = [];
  for (let iy = 0; iy < GRID.nY; iy++) {
    const cells: string[] = [];
    for (let it = 0; it < GRID.nTheta; it++) cells.push(mapped(gridRaw[iy * GRID.nTheta + it])[col].map(r4).join(','));
    rows.push(`  ${cells.join(', ')},`);
  }
  return rows.join('\n');
};
const sites = (col: 'v' | 'a', keys: readonly string[]): string => keys.map((k) => `  '${k}': [${mapped(raw[k])[col].map(r4).join(', ')}],`).join('\n');
const SITE_KEYS = [...ALL15, 'RA@ml', 'LA@ml', 'LL@ml', 'RL@ml'];
const body = `/**
 * GENERATED by scripts/synth/bake-leadfield.ts — do not edit by hand (re-run the script).
 * Inputs: prototype C's BEM torso (_proto/field/torso.ts: homogeneous bounded volume conductor, collocation BEM,
 * reciprocity) on the chest cylinder of src/synth/leads/torso.ts; forward Dower rows (US 5,711,304). Baked 2026-10-17.
 *
 * Contents: Wilson-gauge lead vectors (mV of electrode potential per mV of heart vector, Frank axes) of the chest/back
 * surface for a dipole at the ventricular centroid (VENT) and at the atrial centroid (ATRIAL), after the 3×3
 * least-squares torso map M (BEM → the 15 published Dower rows). Grid: azimuth θ = θ0 + i·Δθ (0° anterior
 * midline, + patient left), height Y = y0 + j·Δy (cm, Frank, + inferior); entry (j, i) at [3·(j·nTheta + i)].
 * src/synth/leads/leadfield.ts interpolates it and blends in the published Dower rows exactly at their sites.
 *
${report.map((l) => ` * ${l}`).join('\n')}
 */
export const LEAD_GRID = { theta0: ${GRID.theta0}, thetaStep: ${GRID.thetaStep}, nTheta: ${GRID.nTheta}, y0: ${GRID.y0}, yStep: ${GRID.yStep}, nY: ${GRID.nY} } as const;

/** Ventricular-centroid column (used by the engine). */
export const LEAD_TABLE_VENT: readonly number[] = [
${flat('v')}
];

/** Atrial-centroid column (validation only: atrial kernels keep the ventricular lead field plus their own near field). */
export const LEAD_TABLE_ATRIAL: readonly number[] = [
${flat('a')}
];

/** M·L_BEM at the named electrode sites (ventricular column): the validation targets of tests/synth/leads. */
export const BEM_AT_SITES: Readonly<Record<string, readonly [number, number, number]>> = {
${sites('v', SITE_KEYS)}
};
`;

if (check) {
  if (readFileSync(OUT, 'utf8') !== body) {
    console.error('leadTable.gen.ts is out of date: re-run scripts/synth/bake-leadfield.ts');
    process.exit(1);
  }
  console.log('leadTable.gen.ts is up to date');
} else {
  writeFileSync(OUT, body);
  console.log(`wrote ${OUT} (${(body.length / 1024).toFixed(1)} KB) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
