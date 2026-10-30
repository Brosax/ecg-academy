/**
 * Heart-local frame from the data (frame contract, types.ts / frame.ts):
 *   origin = ventricular myocardium centroid;
 *   +y = LV apex → base (base = mitral annulus centroid; apex = LV-wall vertex farthest from the mitral/aortic
 *        annulus plane on the ventricular side);
 *   +x = LV lateral = −(LV→RV cavity-centroid direction orthogonalised to y), so the RV lies at −x and the plane
 *        z = 0 contains both ventricles and both AV valves (the frozen four-chamber preset, normal +z);
 *   +z = x × y (anterior in the cardiac sense: the free surface of the RV outflow side).
 * pose.R maps local → body = app orientation (the HRA body frame is +x left, +y superior, +z anterior), tCm = 0.
 */
import { cross, dot, mat3FromColumns, normalize, scale, sub } from '../../frame';
import type { Mat3, Vec3 } from '../../types';
import { CHAMBER, TISSUE } from '../../types';
import type { Frame, Labelled } from './label';
import { pca } from './mesh';

export interface HeartFrame extends Frame {
  readonly apexBody: Vec3;
  readonly baseBody: Vec3;
  readonly lvCavityBody: Vec3;
  readonly rvCavityBody: Vec3;
}

/** `L` must be labelled in the body frame (identity rotation, zero origin), as the bake does. */
export function computeHeartFrame(L: Labelled): HeartFrame {
  const g = L.grid;
  const [nx, ny] = g.dims;
  const sums = new Map<string, [number, number, number, number]>();
  const add = (k: string, v: number) => {
    const s = sums.get(k) ?? [0, 0, 0, 0];
    s[0] += g.originMm[0] + (v % nx) * g.hMm;
    s[1] += g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm;
    s[2] += g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm;
    s[3]++;
    sums.set(k, s);
  };
  for (let v = 0; v < L.tissue.length; v++) {
    const t = L.tissue[v];
    if (t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum) add('vent', v);
    if (t === TISSUE.Blood && L.chamber[v] === CHAMBER.LV) add('lv', v);
    if (t === TISSUE.Blood && L.chamber[v] === CHAMBER.RV) add('rv', v);
  }
  const mean = (k: string): Vec3 => {
    const s = sums.get(k);
    if (!s || !s[3]) throw new Error(`HRA frame: no ${k} voxels`);
    return [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
  };
  const o = mean('vent'), lvC = mean('lv'), rvC = mean('rv');
  const base = L.rings.MITRAL.centerMm;
  // annulus plane through the mitral and aortic bands, oriented toward the LV cavity
  const pts = [...Array.from(L.rings.MITRAL.band.position), ...Array.from(L.rings.AORTIC.band.position)];
  const plane = pca(pts);
  let n = plane.vectors[0];
  if (dot(n, sub(lvC, plane.centroid)) < 0) n = scale(n, -1);
  const lv = L.meshes.walls.LV.position;
  let apex: Vec3 = lvC, best = -Infinity;
  for (let i = 0; i < lv.length; i += 3) {
    const p: Vec3 = [lv[i], lv[i + 1], lv[i + 2]];
    const d = dot(sub(p, plane.centroid), n);
    if (d > best) {
      best = d;
      apex = p;
    }
  }
  const y = normalize(sub(base, apex));
  const d = sub(rvC, lvC);
  const dPerp = sub(d, scale(y, dot(d, y)));
  const x = scale(normalize(dPerp), -1);
  const z = normalize(cross(x, y));
  const R: Mat3 = mat3FromColumns(x, y, z);
  return { R, o, apexBody: apex, baseBody: base, lvCavityBody: lvC, rvCavityBody: rvC };
}

/** Angles of a unit direction in the app frame (deg): left/right, superior/inferior, anterior/posterior components. */
export function describeDirection(v: Vec3): string {
  const az = (Math.atan2(v[0], v[2]) * 180) / Math.PI; // 0 = anterior, +90 = patient left
  const el = (Math.asin(Math.max(-1, Math.min(1, v[1]))) * 180) / Math.PI; // + = superior
  return `(${v.map((c) => c.toFixed(2)).join(', ')}) azimuth ${az.toFixed(0)}° from anterior toward left, elevation ${el.toFixed(0)}°`;
}
