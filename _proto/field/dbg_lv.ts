// dbg_lv.ts — effective lead vectors (grad Z, body frame +x left +y up +z anterior) of the 12 leads at a few heart
// points, normalised to lead I at the LV centre (dev)
import { leadSystem, defaultTorso, leadVectorsAt, ELECTRODES } from './torso.ts';
import { poseFrame, DEFAULT_GEOM } from './geom.ts';
import { defaultParams } from './model.ts';
import type { Vec3 } from './geom.ts';
const p = defaultParams();
const { R, cLV } = poseFrame({ ...DEFAULT_GEOM, ...p.geom });
const toBody = (v: Vec3): Vec3 => [cLV[0] + R[0] * v[0] + R[1] * v[1] + R[2] * v[2], cLV[1] + R[3] * v[0] + R[4] * v[1] + R[5] * v[2], cLV[2] + R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
console.log('local axes in body frame: x(sept->lat)', [R[0], R[3], R[6]].map((v) => v.toFixed(2)).join(','), ' y(apex->base)', [R[1], R[4], R[7]].map((v) => v.toFixed(2)).join(','), ' z(ant wall)', [R[2], R[5], R[8]].map((v) => v.toFixed(2)).join(','));
const ls = leadSystem(defaultTorso());
const pts: Record<string, Vec3> = { 'LV centre': [0, 0, 0], 'LV lateral wall': [30, 0, 0], 'LV apex': [0, -60, 0], 'septum': [-28, 0, 0], 'RV free wall': [-52, -5, 10], 'LV base lat': [30, 15, 0] };
const idx = (e: string) => ELECTRODES.indexOf(e as typeof ELECTRODES[number]);
for (const [nm, loc] of Object.entries(pts)) {
  const b = toBody(loc); const g = leadVectorsAt(ls, b);
  const sub = (a: Vec3, c: Vec3, s = 1): Vec3 => [a[0] - s * c[0], a[1] - s * c[1], a[2] - s * c[2]];
  const wct: Vec3 = [0, 1, 2].map((c) => (g[idx('RA')][c] + g[idx('LA')][c] + g[idx('LL')][c]) / 3) as Vec3;
  const L: Record<string, Vec3> = { I: sub(g[idx('LA')], g[idx('RA')]), II: sub(g[idx('LL')], g[idx('RA')]), aVF: sub(g[idx('LL')], [0, 1, 2].map((c) => 0.5 * (g[idx('RA')][c] + g[idx('LA')][c])) as Vec3) };
  for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']) L[v] = sub(g[idx(v)], wct);
  console.log(`${nm} body ${b.map((v) => v.toFixed(0)).join(',')}`);
  for (const [ln, v] of Object.entries(L)) { const m = Math.hypot(...v); console.log(`  ${ln.padEnd(4)} |${(m).toFixed(0).padStart(6)}|  dir ${v.map((x) => (x / m).toFixed(2).padStart(6)).join('')}  az ${(Math.atan2(v[2], v[0]) * 180 / Math.PI).toFixed(0).padStart(5)} el ${(Math.atan2(v[1], Math.hypot(v[0], v[2])) * 180 / Math.PI).toFixed(0).padStart(4)}`); }
}
