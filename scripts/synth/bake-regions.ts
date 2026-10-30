/**
 * Bakes src/synth/heart/regionGeom.gen.ts from prototype A's procedural heart (vendored in ./vendor, DECISION §2.1.1).
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/bake-regions.ts [--check]
 *
 * Output, per core RegionId (src/core/regions.ts, REGION_LIST order), in the Frank frame of src/synth (cm, +X patient
 * left, +Y inferior, +Z posterior, origin = ventricular centroid):
 *  - ventricular ids: mid-wall centroid, endocardial / epicardial face centroids, outward epicardial unit normal
 *    (septum: the RV-side face), relative mass (Σ ventricles = 1), geometric wall thickness, wall used for transmural
 *    conduction (A's NORMAL_WALL), long-axis level z (0 apex … 1 base), face radii; and the face adjacency graph
 *    (faces whose patches touch within 0.75 cm, A's buildVGraph rule) with the surface class of each edge;
 *  - atrial and conduction-system ids: centroids only.
 *
 * Mapping A → core (reviewed table): A's 17 LV ids map one-to-one onto the AHA segments. A's RV has five ids
 * (rv_apex, rv_ant, rv_free, rv_inf, rvot) while the core RV has four (rv-outflow, rv-basal, rv-mid, rv-apical):
 * rvot → rv-outflow, rv_apex → rv-apical, and the patches of rv_ant / rv_free / rv_inf are split by long-axis level at
 * RV_BASAL_Z (basal third of the RV body → rv-basal, the rest → rv-mid). Conduction-system centroids are placed on the
 * baked anatomy by rule (see CONDUCTION below); nothing in the physics uses them except the 3D state.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { add, buildHeart, dot, FACE, norm, scale, sub, unit, V_IDS, type AId, type V3 } from './vendor/regional-geometry';

const OUT = fileURLToPath(new URL('../../src/synth/heart/regionGeom.gen.ts', import.meta.url));
const RV_BASAL_Z = 0.72;

const LV_MAP: Readonly<Record<string, string>> = {
  b_ant: 'lv-basal-anterior', b_antsep: 'lv-basal-anteroseptal', b_infsep: 'lv-basal-inferoseptal', b_inf: 'lv-basal-inferior',
  b_inflat: 'lv-basal-inferolateral', b_antlat: 'lv-basal-anterolateral',
  m_ant: 'lv-mid-anterior', m_antsep: 'lv-mid-anteroseptal', m_infsep: 'lv-mid-inferoseptal', m_inf: 'lv-mid-inferior',
  m_inflat: 'lv-mid-inferolateral', m_antlat: 'lv-mid-anterolateral',
  a_ant: 'lv-apical-anterior', a_sep: 'lv-apical-septal', a_inf: 'lv-apical-inferior', a_lat: 'lv-apical-lateral', apex: 'lv-apex',
  rvot: 'rv-outflow', rv_apex: 'rv-apical',
};

/** A's NORMAL_WALL (cm) for transmural conduction (RV: compact layer only). */
const TM_WALL: Readonly<Record<string, number>> = {
  b_inflat: 0.98, m_inflat: 1.35, b_antlat: 1.5, m_antlat: 1.41, a_lat: 1.11,
  b_inf: 1.5, m_inf: 1.5, a_inf: 0.73, b_ant: 0.72, m_ant: 0.77, a_ant: 1.31, apex: 0.59,
  rv_apex: 0.24, rv_free: 0.24, rv_ant: 0.24, rv_inf: 0.24, rvot: 0.24,
};

export const VENT_ORDER = [
  'lv-basal-anterior', 'lv-basal-anteroseptal', 'lv-basal-inferoseptal', 'lv-basal-inferior', 'lv-basal-inferolateral',
  'lv-basal-anterolateral', 'lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-mid-inferoseptal', 'lv-mid-inferior',
  'lv-mid-inferolateral', 'lv-mid-anterolateral', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior',
  'lv-apical-lateral', 'lv-apex', 'rv-outflow', 'rv-basal', 'rv-mid', 'rv-apical',
] as const;

const heart = buildHeart();
const toFrank = (v: V3): V3 => [v[0], -v[1], -v[2]];
const zOf = (c: V3): number => 1 - dot(sub(c, heart.base), heart.eL) / heart.ho;

function coreId(aId: AId, c: V3): string {
  const m = LV_MAP[aId];
  if (m) return m;
  return zOf(c) >= RV_BASAL_Z ? 'rv-basal' : 'rv-mid';
}

interface Acc {
  aIn: V3; aOut: V3; cIn: V3; cOut: V3; areaIn: number; areaOut: number; zA: number; tmW: number; tmA: number;
  ptsIn: V3[]; ptsOut: V3[];
}
const acc = new Map<string, Acc>();
for (const id of VENT_ORDER) acc.set(id, { aIn: [0, 0, 0], aOut: [0, 0, 0], cIn: [0, 0, 0], cOut: [0, 0, 0], areaIn: 0, areaOut: 0, zA: 0, tmW: 0, tmA: 0, ptsIn: [], ptsOut: [] });

for (const p of heart.patches) {
  const aId = V_IDS[p.region];
  const id = p.face === FACE.RIM && !LV_MAP[aId] ? 'rv-basal' : coreId(aId, p.c);
  const r = acc.get(id)!;
  const A = norm(p.a);
  if (p.face === FACE.IN) {
    r.aIn = add(r.aIn, p.a); r.cIn = add(r.cIn, scale(p.c, A)); r.areaIn += A; r.ptsIn.push(p.c);
  } else if (p.face === FACE.OUT) {
    r.aOut = add(r.aOut, p.a); r.cOut = add(r.cOut, scale(p.c, A)); r.areaOut += A; r.ptsOut.push(p.c);
    r.zA += A * zOf(p.c);
    r.tmW += A * (TM_WALL[aId] ?? 1.0); r.tmA += A;
  }
}

const isSept = (id: string): boolean => id.includes('septal');
const kindOf = (id: string): 'LV' | 'SEPT' | 'RV' => (id.startsWith('rv') ? 'RV' : isSept(id) ? 'SEPT' : 'LV');
const P = heart.params;

interface Row { id: string; kind: string; c: V3; cEndo: V3; cEpi: V3; n: V3; mass: number; wall: number; tmWall: number; z: number; rEndo: number; rEpi: number }
const rows: Row[] = [];
let massSum = 0;
for (const id of VENT_ORDER) {
  const r = acc.get(id)!;
  const cIn = scale(r.cIn, 1 / r.areaIn), cOut = scale(r.cOut, 1 / r.areaOut);
  const z = r.zA / r.areaOut;
  const kind = kindOf(id);
  const wall = kind === 'RV' ? P.rvWall : kind === 'SEPT' ? P.septWall : P.lvApexWall + (P.lvWall - P.lvApexWall) * Math.min(1, Math.min(1, z) * 1.6);
  const tmWall = kind === 'RV' ? 0.24 : kind === 'SEPT' ? P.septWall : r.tmW / r.tmA;
  const rad = (pts: V3[], c0: V3): number => Math.sqrt(pts.reduce((s, p) => s + norm(sub(p, c0)) ** 2, 0) / Math.max(1, pts.length));
  const mass = r.areaOut * wall;
  massSum += mass;
  rows.push({
    id, kind, c: toFrank(scale(add(cIn, cOut), 0.5)), cEndo: toFrank(cIn), cEpi: toFrank(cOut), n: toFrank(unit(r.aOut)),
    mass, wall, tmWall, z, rEndo: rad(r.ptsIn, cIn), rEpi: rad(r.ptsOut, cOut),
  });
}
for (const r of rows) r.mass /= massSum;

// face adjacency (A's buildVGraph rule on the core faces): faces whose patches come within 0.75 cm
const faces: { v: number; face: 0 | 1; pts: V3[]; c: V3 }[] = [];
VENT_ORDER.forEach((id, v) => {
  const r = acc.get(id)!;
  faces.push({ v, face: 0, pts: r.ptsIn, c: scale(r.cIn, 1 / r.areaIn) }, { v, face: 1, pts: r.ptsOut, c: scale(r.cOut, 1 / r.areaOut) });
});
const surf = (f: { v: number; face: 0 | 1 }): 'IN' | 'RVIN' | 'EPI' => {
  const k = kindOf(VENT_ORDER[f.v]);
  if (k === 'SEPT') return f.face === 0 ? 'IN' : 'RVIN';
  if (k === 'RV') return f.face === 0 ? 'RVIN' : 'EPI';
  return f.face === 0 ? 'IN' : 'EPI';
};
const THR = 0.75;
const bc = faces.map((f) => scale(f.pts.reduce<V3>((s, p) => add(s, p), [0, 0, 0]), 1 / Math.max(1, f.pts.length)));
const br = faces.map((f, a) => f.pts.reduce((m, p) => Math.max(m, norm(sub(p, bc[a]))), 0));
const edges: [number, number, string, number][] = [];
for (let a = 0; a < faces.length; a++) {
  for (let b = a + 1; b < faces.length; b++) {
    if (faces[a].v === faces[b].v) continue; // transmural edges are implicit (same region)
    if (norm(sub(bc[a], bc[b])) > br[a] + br[b] + THR) continue;
    let near = false;
    outer: for (const p of faces[a].pts) for (const q of faces[b].pts) if (norm(sub(p, q)) <= THR) { near = true; break outer; }
    if (!near) continue;
    const sa = surf(faces[a]), sb = surf(faces[b]);
    edges.push([a, b, sa === sb ? sa : 'X', Math.round(norm(sub(faces[a].c, faces[b].c)) * 1000) / 1000]);
  }
}

// atria (A's 7 atrial regions → ra / la centroids) and conduction-system landmarks
const ar = (id: string): V3 => heart.aregions.find((x) => x.id === id)!.c;
const mean = (...vs: V3[]): V3 => scale(vs.reduce<V3>((s, v) => add(s, v), [0, 0, 0]), 1 / vs.length);
const row = (id: string): Row => rows.find((r) => r.id === id)!;
const RA = toFrank(mean(ar('sa'), ar('ra_lat'), ar('ra_cti'), ar('ra_sep')));
const LA = toFrank(mean(ar('la_ant'), ar('la_post'), ar('bachmann')));
/** Conduction-system landmarks (rule of thumb on the baked anatomy; 3D state only). */
const CONDUCTION: Record<string, V3> = {
  'sa-node': toFrank(ar('sa')),
  'av-node': mean(toFrank(ar('ra_sep')), row('lv-basal-inferoseptal').cEpi),
  his: mean(row('lv-basal-anteroseptal').c, row('lv-basal-inferoseptal').c),
  rbb: row('lv-mid-anteroseptal').cEpi,
  lbb: mean(row('lv-basal-anteroseptal').cEndo, row('lv-basal-inferoseptal').cEndo),
  laf: mean(row('lv-mid-anterior').cEndo, row('lv-mid-anterolateral').cEndo),
  lpf: mean(row('lv-mid-inferior').cEndo, row('lv-mid-inferolateral').cEndo),
  purkinje: mean(...rows.filter((r) => r.kind !== 'RV').map((r) => r.cEndo)),
};

const r3 = (v: V3): string => `[${v.map((x) => (Math.round(x * 1000) / 1000).toString()).join(', ')}]`;
const n4 = (x: number): string => (Math.round(x * 10000) / 10000).toString();
const lines: string[] = [];
lines.push('/**');
lines.push(' * GENERATED by scripts/synth/bake-regions.ts — do not edit by hand (re-run the script).');
lines.push(" * Input: prototype A's procedural heart (scripts/synth/vendor/regional-geometry.ts, DEFAULT_HEART), A's NORMAL_WALL;");
lines.push(` * mapping A → core RegionId reviewed in the script (RV body split at long-axis level ${RV_BASAL_Z}). Generated ${new Date().toISOString().slice(0, 10)}.`);
lines.push(' * Frame: Frank, cm (+X patient left, +Y inferior, +Z posterior), origin = ventricular centroid.');
lines.push(` * Closure residual of the patch surface: ${r3(heart.closureResidual.map((x) => Math.abs(x) < 1e-9 ? 0 : x) as V3)} cm².`);
lines.push(' */');
lines.push("import type { Vec3 } from '../api';");
lines.push('');
lines.push('/** Ventricular region order of the face graph (face index = 2·v + 0 endocardial / + 1 epicardial). */');
lines.push(`export const VENT_IDS = [\n  ${VENT_ORDER.map((s) => `'${s}'`).join(',\n  ')},\n] as const;`);
lines.push('');
lines.push('export interface VentGeomRow {');
lines.push("  readonly kind: 'LV' | 'SEPT' | 'RV';");
lines.push('  /** mid-wall centroid, endocardial and epicardial face centroids (cm) */');
lines.push('  readonly c: Vec3; readonly cEndo: Vec3; readonly cEpi: Vec3;');
lines.push('  /** outward epicardial unit normal (septum: toward the RV cavity) */');
lines.push('  readonly n: Vec3;');
lines.push('  /** relative mass (Σ over the 21 ventricular regions = 1) */');
lines.push('  readonly mass: number;');
lines.push('  /** geometric wall thickness and the wall crossed by transmural conduction (cm) */');
lines.push('  readonly wall: number; readonly tmWall: number;');
lines.push('  /** long-axis level: 0 apex … 1 base (> 1: above the base plane, RVOT) */');
lines.push('  readonly z: number;');
lines.push('  /** RMS radius of the endocardial / epicardial face (cm) */');
lines.push('  readonly rEndo: number; readonly rEpi: number;');
lines.push('}');
lines.push('');
lines.push('export const VENT_GEOM: readonly VentGeomRow[] = [');
for (const r of rows) {
  lines.push(`  { kind: '${r.kind}', c: ${r3(r.c)}, cEndo: ${r3(r.cEndo)}, cEpi: ${r3(r.cEpi)}, n: ${r3(r.n)}, mass: ${n4(r.mass)}, wall: ${n4(r.wall)}, tmWall: ${n4(r.tmWall)}, z: ${n4(r.z)}, rEndo: ${n4(r.rEndo)}, rEpi: ${n4(r.rEpi)} }, // ${r.id}`);
}
lines.push('];');
lines.push('');
lines.push("/** Face adjacency: [faceA, faceB, surface class ('IN' LV endocardium, 'RVIN' RV endocardium incl. RV septal side, 'EPI', 'X' mixed), centroid distance cm]. */");
lines.push("export const FACE_EDGES: readonly (readonly [number, number, 'IN' | 'RVIN' | 'EPI' | 'X', number])[] = [");
for (let i = 0; i < edges.length; i += 6) lines.push('  ' + edges.slice(i, i + 6).map((e) => `[${e[0]}, ${e[1]}, '${e[2]}', ${e[3]}]`).join(', ') + ',');
lines.push('];');
lines.push('');
lines.push('/** Atrial centroids (mean of A\'s atrial regions: RA = sinus node area, lateral wall, isthmus, low septum; LA = anterior, posterior wall, Bachmann). */');
lines.push(`export const ATRIAL_CENTROIDS = { ra: ${r3(RA)}, la: ${r3(LA)} } as const satisfies Record<string, Vec3>;`);
lines.push('');
lines.push('/** Conduction-system landmarks (rule of thumb on the baked anatomy, see the bake script); used by the 3D state only. */');
lines.push('export const CONDUCTION_CENTROIDS = {');
for (const [k, v] of Object.entries(CONDUCTION)) lines.push(`  '${k}': ${r3(v)},`);
lines.push('} as const satisfies Record<string, Vec3>;');
lines.push('');
const text = lines.join('\n');

if (process.argv.includes('--check')) {
  const cur = readFileSync(OUT, 'utf8').replace(/Generated \d{4}-\d{2}-\d{2}/, '');
  if (cur !== text.replace(/Generated \d{4}-\d{2}-\d{2}/, '')) {
    console.error('regionGeom.gen.ts is stale: re-run the bake');
    process.exitCode = 1;
  } else console.log('regionGeom.gen.ts is up to date');
} else {
  writeFileSync(OUT, text);
  console.log(`wrote ${OUT}: ${rows.length} ventricular regions, ${edges.length} face edges`);
  for (const r of rows) console.log(`  ${r.id.padEnd(26)} c ${r3(r.c).padEnd(26)} n ${r3(r.n).padEnd(24)} m ${r.mass.toFixed(3)} z ${r.z.toFixed(2)}`);
  console.log(`  RA ${r3(RA)}  LA ${r3(LA)}`);
}
