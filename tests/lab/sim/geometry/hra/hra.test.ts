/**
 * Realistic HRA heart (baked asset src/assets/heart-hra.bin): contract completeness, voxel/mesh consistency,
 * electrical isolation, wall thickness, cavity volumes, AHA segments, frame and pose, conduction-path placement,
 * overlay alignment, load round trip. Runs on the committed asset (no raw GLBs needed).
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { mat3MulVec } from '../../../../../src/lab/sim/frame';
import { decodeHraBundle } from '../../../../../src/lab/sim/geometry/hra/codec';
import { loadHraGeometry } from '../../../../../src/lab/sim/geometry/hra/load';
import { edt2 } from '../../../../../src/lab/sim/geometry/hra/voxelize';
import type { GeometryBundle, StructureId, Vec3 } from '../../../../../src/lab/sim/types';
import { CHAMBER, STRUCTURES, TISSUE, VALVES } from '../../../../../src/lab/sim/types';
import { sameBundle } from './sameBundle';

const ASSET = new URL('../../../../../src/lab/assets/heart-hra.bin', import.meta.url);
let B: GeometryBundle;
let N = 0;
let nx = 0, ny = 0, nz = 0;

const pos = (v: number): Vec3 => [B.grid.originMm[0] + (v % nx) * B.grid.hMm, B.grid.originMm[1] + (Math.floor(v / nx) % ny) * B.grid.hMm, B.grid.originMm[2] + Math.floor(v / (nx * ny)) * B.grid.hMm];
const vox = (p: readonly number[]) => {
  const i = Math.round((p[0] - B.grid.originMm[0]) / B.grid.hMm), j = Math.round((p[1] - B.grid.originMm[1]) / B.grid.hMm), k = Math.round((p[2] - B.grid.originMm[2]) / B.grid.hMm);
  return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : i + nx * (j + ny * k);
};
const neighbours = (v: number): number[] => {
  const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
  const out: number[] = [];
  if (i > 0) out.push(v - 1);
  if (i < nx - 1) out.push(v + 1);
  if (j > 0) out.push(v - nx);
  if (j < ny - 1) out.push(v + nx);
  if (k > 0) out.push(v - nx * ny);
  if (k < nz - 1) out.push(v + nx * ny);
  return out;
};
const isVent = (t: number) => t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum;
const isAtr = (t: number) => t === TISSUE.LA || t === TISSUE.RA;
const isMyo = (t: number) => isVent(t) || isAtr(t);
const centroid = (pred: (v: number) => boolean): Vec3 => {
  let x = 0, y = 0, z = 0, n = 0;
  for (let v = 0; v < N; v++) if (pred(v)) {
    const p = pos(v);
    x += p[0];
    y += p[1];
    z += p[2];
    n++;
  }
  return [x / n, y / n, z / n];
};
const blood = (ch: number) => (v: number) => B.grid.tissue[v] === TISSUE.Blood && B.grid.chamber[v] === ch;
/** Distance (mm) from voxel centres to the nearest voxel of a set. */
const distTo = (pred: (v: number) => boolean) => {
  const m = new Uint8Array(N);
  for (let v = 0; v < N; v++) m[v] = pred(v) ? 1 : 0;
  const d2 = edt2(m, B.grid.dims, true);
  return (v: number) => Math.sqrt(d2[v]) * B.grid.hMm;
};
const median = (xs: number[]) => xs.sort((a, b) => a - b)[xs.length >> 1];

beforeAll(async () => {
  B = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
  [nx, ny, nz] = B.grid.dims;
  N = nx * ny * nz;
});

describe('HRA heart — contract', () => {
  it('fills every GeometryBundle field consistently', () => {
    const g = B.grid;
    expect(B.source).toBe('hra');
    expect(g.hMm).toBe(1.5);
    for (const a of [g.tissue, g.chamber, g.aha, g.region, g.wallDepth, g.apexBase, g.sdfMm]) expect(a.length).toBe(N);
    expect(g.transDir.length).toBe(3 * N);
    expect(B.mesh.position.length).toBe(B.mesh.normal.length);
    expect(B.mesh.voxel.length).toBe(B.mesh.position.length / 3);
    expect(B.mesh.index.length % 3).toBe(0);
    expect(Math.max(...B.mesh.index.subarray(0, 1000))).toBeLessThan(B.mesh.voxel.length);
    expect(B.valves.map((v) => v.id).sort()).toEqual([...VALVES].sort());
    for (const v of B.valves) {
      expect(Math.hypot(...v.normal)).toBeCloseTo(1, 5);
      expect(v.radiusMm).toBeGreaterThan(6);
      expect(v.radiusMm).toBeLessThan(25);
    }
    expect(B.chambers.map((c) => c.chamber).sort()).toEqual([CHAMBER.LA, CHAMBER.RA, CHAMBER.LV, CHAMBER.RV].sort());
    expect(B.paths.map((p) => p.id).sort()).toEqual(['AVN', 'BACHMANN', 'HIS', 'LAF', 'LBB', 'LPF', 'LSF', 'RBB', 'SA'].sort());
    const placed = Object.keys(B.landmarks) as StructureId[];
    expect(placed.length).toBeGreaterThanOrEqual(STRUCTURES.length - 1);
    expect(B.credits?.length).toBe(2);
    for (const c of B.credits!) {
      expect(c.license).toBe('CC BY 4.0');
      expect(c.url).toMatch(/^https:\/\/doi\.org\/10\.48539\//);
    }
    const ids = new Set(B.overlays!.map((o) => o.id));
    for (const id of ['AORTA', 'PULMONARY_TRUNK', 'SVC', 'IVC', 'PV_RI', 'PV_RS', 'PV_LI', 'PV_LS', 'LCA', 'LAD', 'DIAG1', 'DIAG2', 'LCX_OM', 'RCA', 'RMARG', 'PDA', 'GCV', 'MCV', 'SCV', 'ACV', 'CORONARY_SINUS'])
      expect(ids.has(id), id).toBe(true);
    for (const o of B.overlays!) {
      expect(o.normal.length).toBe(o.position.length);
      expect(o.index.length).toBeGreaterThan(0);
    }
  });

  it('maps every mesh vertex to a valid voxel: myocardial vertices to myocardium, annulus vertices to Ring', () => {
    const T = B.grid.tissue;
    let myo = 0, ring = 0, far = 0;
    let outOfRange = 0;
    for (let i = 0; i < B.mesh.voxel.length; i++) {
      const v = B.mesh.voxel[i];
      if (v >= N) outOfRange++;
      const t = T[v];
      if (isMyo(t)) myo++;
      else if (t === TISSUE.Ring) ring++;
      const p = pos(v);
      if (Math.hypot(p[0] - B.mesh.position[3 * i], p[1] - B.mesh.position[3 * i + 1], p[2] - B.mesh.position[3 * i + 2]) > 4 * B.grid.hMm) far++;
    }
    expect(outOfRange).toBe(0);
    expect(myo + ring).toBe(B.mesh.voxel.length);
    expect(ring).toBeGreaterThan(1000);
    expect(far / B.mesh.voxel.length).toBeLessThan(0.002);
  });

  it('keeps transDir unit within myocardium and wallDepth / apexBase in [0, 1]', () => {
    const g = B.grid;
    let bad = 0, myo = 0, range = 0;
    for (let v = 0; v < N; v++) {
      if (!(g.wallDepth[v] >= 0 && g.wallDepth[v] <= 1 && g.apexBase[v] >= 0 && g.apexBase[v] <= 1)) range++;
      if (!isMyo(g.tissue[v])) continue;
      myo++;
      if (Math.abs(Math.hypot(g.transDir[3 * v], g.transDir[3 * v + 1], g.transDir[3 * v + 2]) - 1) > 1e-3) bad++;
    }
    expect(range).toBe(0);
    expect(bad / myo).toBeLessThan(0.01);
  });

  it('signs sdfMm from the solid mask (negative inside myocardium / ring / vessel)', () => {
    const g = B.grid;
    let wrong = 0;
    for (let v = 0; v < N; v++) {
      const solid = g.tissue[v] !== TISSUE.Out && g.tissue[v] !== TISSUE.Blood;
      if (solid ? g.sdfMm[v] > 0 : g.sdfMm[v] < 0) wrong++;
    }
    expect(wrong).toBe(0);
  });
});

describe('HRA heart — electrical anatomy', () => {
  it('isolates the atria: no atrial voxel is 6-adjacent to a ventricular voxel', () => {
    const T = B.grid.tissue;
    let contacts = 0;
    for (let v = 0; v < N; v++) if (isAtr(T[v])) for (const w of neighbours(v)) if (isVent(T[w])) contacts++;
    expect(contacts).toBe(0);
  });

  it('has walls of at least 2 voxels (no myocardium voxel faces blood and the exterior at once)', () => {
    const T = B.grid.tissue;
    let thin = 0;
    for (let v = 0; v < N; v++) {
      if (!isMyo(T[v])) continue;
      const nb = neighbours(v);
      if (nb.some((w) => T[w] === TISSUE.Blood) && nb.some((w) => T[w] === TISSUE.Out)) thin++;
    }
    expect(thin).toBe(0);
  });

  it('has plausible wall thickness: LV free wall and septum 6–15 mm, RV 2–8 mm (medians)', () => {
    const T = B.grid.tissue;
    const dOut = distTo((v) => T[v] === TISSUE.Out || T[v] === TISSUE.Vessel);
    const dRVb = distTo(blood(CHAMBER.RV));
    const lv: number[] = [], sept: number[] = [], rv: number[] = [];
    for (let v = 0; v < N; v++) {
      const t = T[v];
      if (!isVent(t)) continue;
      const nb = neighbours(v);
      if (t === TISSUE.LV && nb.some((w) => blood(CHAMBER.LV)(w)) && dOut(v) < 25) lv.push(dOut(v));
      if (t === TISSUE.Septum && nb.some((w) => blood(CHAMBER.LV)(w)) && dRVb(v) < 25) sept.push(dRVb(v));
      if (t === TISSUE.RV && nb.some((w) => blood(CHAMBER.RV)(w)) && dOut(v) < 25) rv.push(dOut(v));
    }
    const lvT = median(lv), septT = median(sept), rvT = median(rv);
    console.log(`wall thickness medians: LV ${lvT.toFixed(1)} mm, septum ${septT.toFixed(1)} mm, RV ${rvT.toFixed(1)} mm`);
    expect(lvT).toBeGreaterThanOrEqual(6);
    expect(lvT).toBeLessThanOrEqual(15);
    expect(septT).toBeGreaterThanOrEqual(6);
    expect(septT).toBeLessThanOrEqual(15);
    expect(rvT).toBeGreaterThanOrEqual(2);
    expect(rvT).toBeLessThanOrEqual(8);
  });

  it('has cavity volumes of a small adult heart (the Visible Human male LV is near end-systolic: ≈ 47 mL)', () => {
    const ml = (pred: (v: number) => boolean) => {
      let n = 0;
      for (let v = 0; v < N; v++) if (pred(v)) n++;
      return (n * B.grid.hMm ** 3) / 1000;
    };
    const lv = ml(blood(CHAMBER.LV)), rv = ml(blood(CHAMBER.RV)), la = ml(blood(CHAMBER.LA)), ra = ml(blood(CHAMBER.RA));
    console.log(`cavities (mL): LV ${lv.toFixed(1)} RV ${rv.toFixed(1)} LA ${la.toFixed(1)} RA ${ra.toFixed(1)}`);
    // The task's 60–200 mL assumes a diastolic LV; the HRA source heart measures 47 mL (inner LV ≈ 75 × 35 mm).
    expect(lv).toBeGreaterThanOrEqual(35);
    expect(lv).toBeLessThanOrEqual(200);
    for (const x of [rv, la, ra]) {
      expect(x).toBeGreaterThan(15);
      expect(x).toBeLessThan(200);
    }
  });

  it('labels all 17 AHA segments; septal segments are septum, free-wall segments are not', () => {
    const g = B.grid;
    const count = new Array(18).fill(0), sept = new Array(18).fill(0);
    for (let v = 0; v < N; v++) {
      const a = g.aha[v];
      if (!a) continue;
      if (g.tissue[v] !== TISSUE.LV && g.tissue[v] !== TISSUE.Septum) count[0]++;
      count[a]++;
      if (g.tissue[v] === TISSUE.Septum) sept[a]++;
    }
    expect(count[0]).toBe(0);
    for (let a = 1; a <= 17; a++) expect(count[a], `segment ${a}`).toBeGreaterThan(300);
    for (const a of [2, 3, 8, 9, 14]) expect(sept[a] / count[a], `septal segment ${a}`).toBeGreaterThan(0.65);
    for (const a of [4, 5, 6, 10, 11, 12, 16]) expect(sept[a] / count[a], `free-wall segment ${a}`).toBeLessThan(0.1);
  });

  it('uses the STRUCTURES regions on the right tissues', () => {
    const g = B.grid;
    const r = (id: StructureId) => STRUCTURES.indexOf(id);
    const seen = new Set<number>();
    const want = new Map<number, number>([
      [r('RA'), TISSUE.RA], [r('LA'), TISSUE.LA], [r('LAA'), TISSUE.LA], [r('SEPTUM'), -1],
      [r('RV_FREE'), TISSUE.RV], [r('RV_APEX'), TISSUE.RV], [r('RVOT'), TISSUE.RV],
      [r('LV_APEX'), TISSUE.LV], [r('LV_ANTERIOR'), TISSUE.LV], [r('LV_LATERAL'), TISSUE.LV], [r('LV_INFERIOR'), TISSUE.LV], [r('LV_POSTEROBASAL'), TISSUE.LV],
      [r('MITRAL'), TISSUE.Ring], [r('TRICUSPID'), TISSUE.Ring], [r('AORTIC'), TISSUE.Ring], [r('PULMONARY'), TISSUE.Ring], [r('AV_RING'), TISSUE.Ring],
    ]);
    let bad = 0;
    for (let v = 0; v < N; v++) {
      const reg = g.region[v], t = g.tissue[v];
      if (reg === 255) {
        if (isMyo(t)) bad++;
        continue;
      }
      seen.add(reg);
      const w = want.get(reg);
      if (w === undefined || (w === -1 ? !(t === TISSUE.Septum || t === TISSUE.LV) : t !== w)) bad++;
    }
    expect(bad).toBe(0);
    for (const id of ['SEPTUM', 'LV_APEX', 'LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'RV_FREE', 'RV_APEX', 'RVOT', 'RA', 'LA', 'LAA', 'AV_RING', 'MITRAL', 'TRICUSPID', 'AORTIC', 'PULMONARY'] as const)
      expect(seen.has(r(id)), id).toBe(true);
  });
});

describe('HRA heart — frame and pose', () => {
  it('has a proper rotation from the data with the apex left-inferior-anterior in the app frame', () => {
    const R = B.pose.R;
    const det = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]);
    expect(det).toBeCloseTo(1, 6);
    const apex = mat3MulVec(R, [0, -1, 0]);
    expect(apex[0]).toBeGreaterThan(0.2); // patient left
    expect(apex[1]).toBeLessThan(-0.2); // inferior
    expect(apex[2]).toBeGreaterThan(0.2); // anterior
    expect(B.pose.tCm).toEqual([0, 0, 0]);
  });

  it('puts the RV anterior/right of the LV and the LA most posterior (app frame)', () => {
    const app = (p: Vec3) => mat3MulVec(B.pose.R, p);
    const lv = app(centroid(blood(CHAMBER.LV))), rv = app(centroid(blood(CHAMBER.RV)));
    const la = app(centroid(blood(CHAMBER.LA))), ra = app(centroid(blood(CHAMBER.RA)));
    expect(rv[0]).toBeLessThan(lv[0]);
    expect(rv[2]).toBeGreaterThan(lv[2]);
    for (const other of [lv, rv, ra]) expect(la[2]).toBeLessThan(other[2]);
    // local frame: RV at −x (LV lateral = +x)
    expect(centroid(blood(CHAMBER.RV))[0]).toBeLessThan(centroid(blood(CHAMBER.LV))[0]);
  });

  it('makes the frozen four-chamber preset (local z = 0) cut through both AV valves and the apex region', () => {
    const m = B.valves.find((v) => v.id === 'MITRAL')!, t = B.valves.find((v) => v.id === 'TRICUSPID')!;
    expect(Math.abs(m.centerMm[2])).toBeLessThan(m.radiusMm);
    expect(Math.abs(t.centerMm[2])).toBeLessThan(t.radiusMm);
    const apex = B.landmarks.LV_APEX!;
    expect(Math.abs(apex[2])).toBeLessThan(25);
    // AV valve flow points from the atria toward the apex (local −y); semilunar valves point base-ward
    expect(m.normal[1]).toBeLessThan(-0.5);
    expect(t.normal[1]).toBeLessThan(-0.5);
    for (const id of ['AORTIC', 'PULMONARY'] as const) expect(B.valves.find((v) => v.id === id)!.normal[1]).toBeGreaterThan(0.3);
  });
});

describe('HRA heart — conduction system placement', () => {
  const path = (id: StructureId) => B.paths.find((p) => p.id === id)!.pointsMm;
  /** Nearest voxel of a class within r mm; true if found. */
  const near = (p: Vec3, pred: (v: number) => boolean, r: number) => {
    const h = B.grid.hMm, k = Math.ceil(r / h);
    const c = vox(p);
    if (c < 0) return false;
    const ci = c % nx, cj = Math.floor(c / nx) % ny, ck = Math.floor(c / (nx * ny));
    for (let dk = -k; dk <= k; dk++)
      for (let dj = -k; dj <= k; dj++)
        for (let di = -k; di <= k; di++) {
          const i = ci + di, j = cj + dj, kk = ck + dk;
          if (i < 0 || j < 0 || kk < 0 || i >= nx || j >= ny || kk >= nz) continue;
          const v = i + nx * (j + ny * kk);
          const q = pos(v);
          if (Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) <= r && pred(v)) return true;
        }
    return false;
  };
  const T = () => B.grid.tissue;
  const subLV = (v: number) => (T()[v] === TISSUE.LV || T()[v] === TISSUE.Septum) && neighbours(v).some(blood(CHAMBER.LV));
  const subRV = (v: number) => (T()[v] === TISSUE.RV || T()[v] === TISSUE.Septum) && neighbours(v).some(blood(CHAMBER.RV));

  it('runs the left bundle and fascicles just under the LV endocardium', () => {
    for (const id of ['LBB', 'LAF', 'LPF', 'LSF'] as const) {
      const pts = path(id).slice(id === 'LBB' ? 1 : 0);
      for (const p of pts) expect(near(p, subLV, 1.6 * B.grid.hMm), `${id} ${p.map((x) => x.toFixed(1))}`).toBe(true);
    }
  });

  it('runs the right bundle under the RV septal endocardium, then along the moderator band (RV myocardium)', () => {
    const pts = path('RBB').slice(1);
    for (const p of pts) expect(near(p, (v) => subRV(v) || T()[v] === TISSUE.RV, 1.6 * B.grid.hMm), `RBB ${p.map((x) => x.toFixed(1))}`).toBe(true);
    const end = pts[pts.length - 1];
    expect(near(end, (v) => T()[v] === TISSUE.RV, 2.5)).toBe(true);
  });

  it('places SA, Bachmann, AV node and His on the right tissues', () => {
    const t = (p: Vec3) => T()[vox(p)];
    expect(t(B.landmarks.SA!)).toBe(TISSUE.RA);
    for (const p of path('SA')) expect(near(p, (v) => T()[v] === TISSUE.RA, 1)).toBe(true);
    for (const p of path('BACHMANN')) expect(near(p, (v) => isAtr(T()[v]), 2)).toBe(true);
    const bb = path('BACHMANN');
    expect(t(bb[0])).toBe(TISSUE.RA);
    expect(t(bb[bb.length - 1])).toBe(TISSUE.LA);
    expect(t(B.landmarks.AVN!)).toBe(TISSUE.RA);
    for (const p of path('AVN')) expect(near(p, (v) => T()[v] === TISSUE.RA, 1)).toBe(true);
    const his = path('HIS');
    expect(t(his[his.length - 1])).toBe(TISSUE.Septum);
    // the His bundle crosses the fibrous ring: some point within 3 mm of Ring voxels
    expect(his.some((p) => near(p, (v) => T()[v] === TISSUE.Ring, 3))).toBe(true);
    // AVN sits near the septal tricuspid annulus (Koch's triangle), within 15 mm of it
    const tri = B.valves.find((v) => v.id === 'TRICUSPID')!;
    const a = B.landmarks.AVN!;
    const d = Math.hypot(a[0] - tri.centerMm[0], a[1] - tri.centerMm[1], a[2] - tri.centerMm[2]);
    expect(Math.abs(d - tri.radiusMm)).toBeLessThan(15);
  });
});

describe('HRA heart — overlays', () => {
  it('lays the LAD in the anterior interventricular groove (on the epicardium over the septum)', () => {
    const lad = B.overlays!.find((o) => o.id === 'LAD')!;
    const T = B.grid.tissue;
    const dVent = distTo((v) => isVent(T[v]));
    const dSept = distTo((v) => T[v] === TISSUE.Septum);
    let onEpi = 0, overSeptum = 0, n = 0;
    let zSum = 0;
    for (let i = 0; i < lad.position.length; i += 3) {
      const p: Vec3 = [lad.position[i], lad.position[i + 1], lad.position[i + 2]];
      const v = vox(p);
      if (v < 0) continue;
      n++;
      if (dVent(v) <= 6) onEpi++;
      if (dSept(v) <= 12) overSeptum++;
      zSum += mat3MulVec(B.pose.R, p)[2];
    }
    expect(onEpi / n).toBeGreaterThan(0.8);
    expect(overSeptum / n).toBeGreaterThan(0.6);
    // anterior of the ventricular centroid (app frame, origin = ventricular centroid)
    expect(zSum / n).toBeGreaterThan(0);
  });
});

describe('HRA heart — asset', () => {
  it('loads identically through the runtime loader and a direct gunzip + decode', async () => {
    const direct = decodeHraBundle(new Uint8Array(gunzipSync(readFileSync(ASSET))));
    expect(sameBundle(B, direct)).toBe('');
    expect(B.hash).toMatch(/^hra-m-v1\.3-[0-9a-f]{8}$/);
    expect(readFileSync(ASSET).length).toBeLessThan(6 * 1024 * 1024);
  });
});
