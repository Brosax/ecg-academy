/**
 * Procedural heart geometry — contract and anatomy checks (docs/research/lead-geometry-anatomy.md §5–§8).
 * One default build at module scope is shared by all checks; per-stage timings are logged (reported, not asserted
 * tightly: the plan treats performance as report-only).
 */
import { describe, expect, it } from 'vitest';
import { localDirToApp, localToApp } from '../../../../src/lab/sim/frame';
import { heartLayout, mergeParams } from '../../../../src/lab/sim/geometry/chambers';
import { voxelize } from '../../../../src/lab/sim/geometry/grid';
import { buildHeartGeometry, buildHeartGeometryAsync, buildHeartGeometryWithInfo, DEFAULT_HEART_PARAMS } from '../../../../src/lab/sim/geometry/heart';
import type { ConductionPath, GeometryBundle, RenderMesh, StructureId, Vec3, VoxelGrid } from '../../../../src/lab/sim/types';
import { CHAMBER, STRUCTURE_NONE, STRUCTURES, TISSUE, compOfTissue, COMP, isMyocardium } from '../../../../src/lab/sim/types';

const t0 = performance.now();
const { bundle, info } = buildHeartGeometryWithInfo();
const buildMs = performance.now() - t0;
const g = bundle.grid;
const [nx, ny, nz] = g.dims;
const N = nx * ny * nz;
const h = g.hMm;
const d = info.distances; // voxel units; cavity distances (independent of the LV/RV split)

const idx = (i: number, j: number, k: number) => i + nx * (j + ny * k);
const ijk = (v: number) => [v % nx, Math.floor(v / nx) % ny, Math.floor(v / (nx * ny))] as const;
const centre = (v: number): Vec3 => {
  const [i, j, k] = ijk(v);
  return [g.originMm[0] + i * h, g.originMm[1] + j * h, g.originMm[2] + k * h];
};
const voxelAt = (p: Vec3): number => {
  const i = Math.round((p[0] - g.originMm[0]) / h), j = Math.round((p[1] - g.originMm[1]) / h), k = Math.round((p[2] - g.originMm[2]) / h);
  return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : idx(i, j, k);
};
const isVent = (t: number) => t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum;
const isAtr = (t: number) => t === TISSUE.LA || t === TISSUE.RA;
const centroid = (pred: (v: number) => boolean): Vec3 => {
  let x = 0, y = 0, z = 0, n = 0;
  for (let v = 0; v < N; v++)
    if (pred(v)) {
      const c = centre(v);
      x += c[0]; y += c[1]; z += c[2]; n++;
    }
  return [x / n, y / n, z / n];
};

describe('heart geometry: build & contract', () => {
  it('reports per-stage timings', () => {
    const t = Object.fromEntries(Object.entries(info.timingsMs).map(([k, v]) => [k, Math.round(v)]));
    console.log(`[geometry] build ${Math.round(buildMs)} ms`, JSON.stringify(t), `grid ${g.dims.join('×')}`,
      `triangles ${bundle.mesh.index.length / 3}`, `sampled ${info.voxels.sampled}/${info.voxels.boxVoxels}`);
    expect(buildMs).toBeLessThan(20_000); // regression guard only; target ≤ 1.5 s (see summary)
  });

  it('grid: h = 1.5 mm, ≈100³ or fewer voxels, margin ≥ 3 empty voxels on every side', () => {
    expect(h).toBe(1.5);
    expect(N).toBeLessThanOrEqual(1_000_000);
    for (const [arr, len] of [[g.tissue, N], [g.chamber, N], [g.aha, N], [g.region, N], [g.wallDepth, N], [g.apexBase, N], [g.sdfMm, N], [g.transDir, 3 * N]] as const)
      expect(arr.length).toBe(len);
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const edge = Math.min(i, j, k, nx - 1 - i, ny - 1 - j, nz - 1 - k);
          if (edge < 3) expect(g.tissue[idx(i, j, k)]).toBe(TISSUE.Out);
        }
  });

  it('labels are consistent: tissue ⇔ sdf < 0, chambers, AHA only on LV/septum, regions valid, fields in range', () => {
    let bad = 0;
    for (let v = 0; v < N; v++) {
      const t = g.tissue[v], c = g.chamber[v];
      const solid = t !== TISSUE.Out && t !== TISSUE.Blood;
      if (solid !== g.sdfMm[v] < 0) bad++;
      if (t === TISSUE.LV || t === TISSUE.Septum) { if (c !== CHAMBER.LV) bad++; }
      else if (t === TISSUE.RV) { if (c !== CHAMBER.RV) bad++; }
      else if (t === TISSUE.LA) { if (c !== CHAMBER.LA) bad++; }
      else if (t === TISSUE.RA) { if (c !== CHAMBER.RA) bad++; }
      else if (t !== TISSUE.Blood && c !== CHAMBER.None) bad++;
      if ((g.aha[v] !== 0) !== (t === TISSUE.LV || t === TISSUE.Septum)) bad++;
      if (g.aha[v] > 17) bad++;
      if (g.region[v] !== STRUCTURE_NONE && g.region[v] >= STRUCTURES.length) bad++;
      if (isMyocardium(t) && g.region[v] === STRUCTURE_NONE) bad++;
      if (!(g.wallDepth[v] >= 0 && g.wallDepth[v] <= 1) || !(g.apexBase[v] >= 0 && g.apexBase[v] <= 1)) bad++;
      if (!Number.isFinite(g.sdfMm[v])) bad++;
    }
    expect(bad).toBe(0);
  });

  it('async build yields between stages, reports monotone progress and matches the sync build', async () => {
    const steps: [number, string][] = [];
    const b2 = await buildHeartGeometryAsync(undefined, (p, label) => steps.push([p, label]));
    expect(steps.length).toBeGreaterThan(5);
    for (let s = 1; s < steps.length; s++) expect(steps[s][0]).toBeGreaterThanOrEqual(steps[s - 1][0]);
    expect(steps[steps.length - 1][0]).toBe(1);
    expect(b2.hash).toBe(bundle.hash);
    expect(b2.grid.dims).toEqual(g.dims);
    expect(b2.mesh.index.length).toBe(bundle.mesh.index.length);
    let diff = 0;
    for (let v = 0; v < N; v++) if (b2.grid.tissue[v] !== g.tissue[v] || b2.grid.region[v] !== g.region[v]) diff++;
    expect(diff).toBe(0);
  });

  it('empty-block skipping in the voxeliser is lossless (coarse grid, compared with exhaustive sampling)', () => {
    const L = heartLayout(mergeParams({ hMm: 3 }));
    const run = (exhaustive: boolean) => {
      const gen = voxelize(L, { exhaustive });
      let r = gen.next();
      while (!r.done) r = gen.next();
      return r.value;
    };
    const a = run(false), b = run(true);
    expect(a.dims).toEqual(b.dims);
    let diff = 0;
    for (let v = 0; v < a.tissue.length; v++) if (a.tissue[v] !== b.tissue[v] || a.chamber[v] !== b.chamber[v]) diff++;
    expect(diff).toBe(0);
    expect(a.sampled).toBeLessThan(b.sampled);
  });

  it('hash encodes version + parameters (determinism: async = sync above; parameter change: LVH test below)', () => {
    expect(bundle.hash).toMatch(/^heart-v\d+:[0-9a-f]{8}$/);
    expect(DEFAULT_HEART_PARAMS.hMm).toBe(1.5);
    expect(info.params).toEqual(DEFAULT_HEART_PARAMS);
  });
});

describe('heart geometry: render mesh', () => {
  const m: RenderMesh = bundle.mesh;
  const nv = m.position.length / 3;

  it('is a closed, oriented 2-manifold (each edge in exactly two faces, opposite directions; vertex fans are discs)', () => {
    const dir = new Map<number, number>();
    for (let t = 0; t < m.index.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const a = m.index[t + e], b = m.index[t + ((e + 1) % 3)];
        dir.set(a * nv + b, (dir.get(a * nv + b) ?? 0) + 1);
      }
    let bad = 0;
    for (const [key, cnt] of dir) {
      const a = Math.floor(key / nv), b = key % nv;
      if (cnt !== 1 || dir.get(b * nv + a) !== 1) bad++;
    }
    expect(bad).toBe(0);
    // vertex links: following "next" around each vertex must visit all its faces in one cycle
    const next = new Map<number, number>();
    const deg = new Uint32Array(nv);
    const first = new Int32Array(nv).fill(-1);
    for (let t = 0; t < m.index.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const v = m.index[t + e], a = m.index[t + ((e + 1) % 3)], b = m.index[t + ((e + 2) % 3)];
        next.set(v * nv + a, b);
        deg[v]++;
        if (first[v] < 0) first[v] = a;
      }
    let badFan = 0;
    for (let v = 0; v < nv; v++) {
      if (deg[v] === 0) { badFan++; continue; }
      let a = first[v], steps = 0;
      do {
        const b = next.get(v * nv + a);
        if (b === undefined) { steps = -1; break; }
        a = b;
        steps++;
      } while (a !== first[v] && steps <= deg[v]);
      if (steps !== deg[v]) badFan++;
    }
    expect(badFan).toBe(0);
  });

  it('faces point outward (positive enclosed volume ≈ tissue volume) and has 40–90k triangles', () => {
    let vol = 0;
    const p = m.position;
    for (let t = 0; t < m.index.length; t += 3) {
      const a = m.index[t] * 3, b = m.index[t + 1] * 3, c = m.index[t + 2] * 3;
      vol += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6;
    }
    let tissueVox = 0;
    for (let v = 0; v < N; v++) if (g.sdfMm[v] < 0) tissueVox++;
    const tissueVol = tissueVox * h ** 3;
    expect(vol).toBeGreaterThan(0.85 * tissueVol);
    expect(vol).toBeLessThan(1.15 * tissueVol);
    const tris = m.index.length / 3;
    expect(tris).toBeGreaterThanOrEqual(40_000);
    expect(tris).toBeLessThanOrEqual(90_000);
  });

  it('normals are unit SDF gradients pointing outward; voxel = nearby tissue voxel', () => {
    let bad = 0, inward = 0;
    for (let q = 0; q < nv; q++) {
      const nxq = m.normal[3 * q], nyq = m.normal[3 * q + 1], nzq = m.normal[3 * q + 2];
      if (Math.abs(Math.hypot(nxq, nyq, nzq) - 1) > 1e-3) bad++;
      const vx = m.voxel[q];
      const t = g.tissue[vx];
      if (vx >= N || t === TISSUE.Out || t === TISSUE.Blood) bad++;
      const c = centre(vx);
      const dist = Math.hypot(c[0] - m.position[3 * q], c[1] - m.position[3 * q + 1], c[2] - m.position[3 * q + 2]);
      if (dist > 3 * h) bad++;
    }
    // the normal of each face should agree with its geometric normal
    for (let t = 0; t < m.index.length; t += 3) {
      const a = m.index[t], b = m.index[t + 1], c = m.index[t + 2];
      const P = (i: number, k: number) => m.position[3 * i + k];
      const e1 = [P(b, 0) - P(a, 0), P(b, 1) - P(a, 1), P(b, 2) - P(a, 2)];
      const e2 = [P(c, 0) - P(a, 0), P(c, 1) - P(a, 1), P(c, 2) - P(a, 2)];
      const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const vn = [0, 1, 2].map((k) => m.normal[3 * a + k] + m.normal[3 * b + k] + m.normal[3 * c + k]);
      if (fn[0] * vn[0] + fn[1] * vn[1] + fn[2] * vn[2] < 0) inward++;
    }
    expect(bad).toBe(0);
    expect(inward / (m.index.length / 3)).toBeLessThan(0.01);
  });
});

describe('heart geometry: walls, cavities, insulation', () => {
  /**
   * Rays (400, Fibonacci sphere) from a cavity point. A wall run starts where the ray leaves the cavity into
   * myocardium and ends where it reaches the outside or another chamber's blood; runs through ring / vessel tissue,
   * and folds where the ray re-enters the same blood space (non-convex crescent RV, appendages, PV ostia), are not
   * walls and are skipped. Returns the number of distinct myocardium voxels in each wall run.
   */
  const rayRuns = (start: Vec3, chamber: number): number[] => {
    const runs: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let s = 0; s < 400; s++) {
      const yy = 1 - (2 * (s + 0.5)) / 400, r = Math.sqrt(1 - yy * yy), th = golden * s;
      const dv: Vec3 = [Math.cos(th) * r, yy, Math.sin(th) * r];
      let inWall = false;
      const run = new Set<number>();
      for (let tt = 0; tt < 160; tt += 0.25) {
        const v = voxelAt([start[0] + dv[0] * tt, start[1] + dv[1] * tt, start[2] + dv[2] * tt]);
        if (v < 0) break;
        const t = g.tissue[v];
        if (!inWall) {
          if (t === TISSUE.Blood && g.chamber[v] === chamber) continue;
          if (!isMyocardium(t)) break; // orifice, vessel or ring: not a myocardial wall
          inWall = true;
        }
        if (isMyocardium(t)) run.add(v);
        else if (t === TISSUE.Out || (t === TISSUE.Blood && g.chamber[v] !== chamber && g.chamber[v] !== CHAMBER.None)) {
          runs.push(run.size);
          break;
        } else break; // ring / vessel / same blood space / lumen
      }
    }
    return runs;
  };
  const bloodPoint = (chamber: number): Vec3 => {
    // blood voxel deepest inside the cavity
    let best = -1, bestD = -1;
    for (let v = 0; v < N; v++) {
      if (g.tissue[v] !== TISSUE.Blood || g.chamber[v] !== chamber) continue;
      const s = g.sdfMm[v];
      if (s > bestD) { bestD = s; best = v; }
    }
    return centre(best);
  };

  for (const [name, ch] of [['LV', CHAMBER.LV], ['RV', CHAMBER.RV], ['LA', CHAMBER.LA], ['RA', CHAMBER.RA]] as const)
    it(`${name} walls are ≥ 2 voxels thick along rays from the cavity centre`, () => {
      const runs = rayRuns(bloodPoint(ch), ch);
      expect(runs.length).toBeGreaterThan(ch === CHAMBER.LV ? 250 : 80);
      const thin = runs.filter((n) => n < 2).length;
      expect(thin).toBe(0);
    });

  /** Local thickness from the two-sided distance at mid-wall voxels: (dEndo + dEpi − 1)·h. */
  const midWall = (pred: (v: number) => boolean, endo: Float32Array, epi: (v: number) => number) => {
    const out: number[] = [];
    for (let v = 0; v < N; v++) {
      if (!pred(v)) continue;
      const e = endo[v], p = epi(v);
      if (Math.abs(e - p) <= 0.75) out.push((e + p - 1) * h);
    }
    return out;
  };
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const midLv = (v: number) => g.apexBase[v] > 0.25 && g.apexBase[v] < 0.85;

  it('LV free wall and septum: mean thickness 7–11 mm; RV free wall 3–6 mm; LV apex ≥ 2 voxels', () => {
    const lvFree = midWall((v) => g.tissue[v] === TISSUE.LV && midLv(v), d.lv, (v) => Math.min(d.out[v], d.rv[v]));
    const septum = midWall((v) => g.tissue[v] === TISSUE.Septum && midLv(v), d.lv, (v) => d.rv[v]);
    const rvFree = midWall(
      (v) => g.tissue[v] === TISSUE.RV && g.region[v] === STRUCTURES.indexOf('RV_FREE') && d.out[v] < 6 && d.lv[v] > 8,
      d.rv, (v) => d.out[v]);
    console.log('[geometry] mean thickness mm: LV free', mean(lvFree).toFixed(1), 'septum', mean(septum).toFixed(1), 'RV free', mean(rvFree).toFixed(1));
    expect(lvFree.length).toBeGreaterThan(200);
    expect(septum.length).toBeGreaterThan(100);
    expect(rvFree.length).toBeGreaterThan(100);
    expect(mean(lvFree)).toBeGreaterThanOrEqual(7);
    expect(mean(lvFree)).toBeLessThanOrEqual(11);
    expect(mean(septum)).toBeGreaterThanOrEqual(7);
    expect(mean(septum)).toBeLessThanOrEqual(11);
    expect(mean(rvFree)).toBeGreaterThanOrEqual(3);
    expect(mean(rvFree)).toBeLessThanOrEqual(6);
    // apex: column under the cavity tip along −y
    const L = info.layout;
    const tipLocal: Vec3 = [-info.shiftA[0], L.yApexEndo - info.shiftA[1] - 0.5, -info.shiftA[2]];
    let n = 0;
    for (let s = 0; s < 20; s++) {
      const v = voxelAt([tipLocal[0], tipLocal[1] - s * h, tipLocal[2]]);
      if (v >= 0 && isVent(g.tissue[v])) n++;
    }
    expect(n).toBeGreaterThanOrEqual(2);
  });

  it('LV cavity 90–160 mL (end-diastole, ASE 2015: 106 ± 22 mL in men)', () => {
    let n = 0;
    for (let v = 0; v < N; v++) if (g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.LV) n++;
    const ml = (n * h ** 3) / 1000;
    expect(ml).toBeGreaterThanOrEqual(90);
    expect(ml).toBeLessThanOrEqual(160);
  });

  it('atrial and ventricular myocardium are never 6-adjacent (fibrous ring insulates; His is the only path)', () => {
    let touch = 0;
    for (let k = 0; k < nz - 1; k++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          const v = idx(i, j, k);
          const ca = compOfTissue(g.tissue[v]);
          if (ca === COMP.None) continue;
          for (const u of [v + 1, v + nx, v + nx * ny]) {
            const cb = compOfTissue(g.tissue[u]);
            if (cb !== COMP.None && cb !== ca) touch++;
          }
        }
    expect(touch).toBe(0);
    expect(info.relabelledAtrialVoxels).toBe(0); // insulation holds by construction, not by the safety net
  });

  it('ring separates the AV plane and the mitral / tricuspid orifices are open', () => {
    let ring = 0;
    for (let v = 0; v < N; v++) if (g.tissue[v] === TISSUE.Ring) ring++;
    expect(ring).toBeGreaterThan(1000);
    for (const id of ['MITRAL', 'TRICUSPID'] as const) {
      const valve = bundle.valves.find((x) => x.id === id)!;
      const v = voxelAt(valve.centerMm);
      expect(g.tissue[v]).toBe(TISSUE.Blood);
      // blood column through the ring at the valve centre
      for (let s = -3; s <= 3; s++) expect(g.tissue[voxelAt([valve.centerMm[0], valve.centerMm[1] + s * h, valve.centerMm[2]])]).toBe(TISSUE.Blood);
    }
  });

  it('wallDepth runs endocardium → epicardium (septum: LV side → RV side) and transDir is a unit vector in myocardium', () => {
    let endoSum = 0, endoN = 0, epiSum = 0, epiN = 0, sepL = 0, sepLN = 0, sepR = 0, sepRN = 0, badDir = 0;
    for (let v = 0; v < N; v++) {
      const t = g.tissue[v];
      if (!isMyocardium(t)) {
        if (g.transDir[3 * v] || g.transDir[3 * v + 1] || g.transDir[3 * v + 2]) badDir++;
        continue;
      }
      const l = Math.hypot(g.transDir[3 * v], g.transDir[3 * v + 1], g.transDir[3 * v + 2]);
      if (Math.abs(l - 1) > 1e-3) badDir++;
      if (t === TISSUE.LV && d.lv[v] < 1.5) { endoSum += g.wallDepth[v]; endoN++; }
      if (t === TISSUE.LV && d.out[v] < 1.5) { epiSum += g.wallDepth[v]; epiN++; }
      if (t === TISSUE.Septum && d.lv[v] < 1.5) { sepL += g.wallDepth[v]; sepLN++; }
      if (t === TISSUE.Septum && d.rv[v] < 1.5) { sepR += g.wallDepth[v]; sepRN++; }
    }
    expect(badDir).toBe(0);
    expect(endoSum / endoN).toBeLessThan(0.25);
    expect(epiSum / epiN).toBeGreaterThan(0.75);
    expect(sepL / sepLN).toBeLessThan(0.25);
    expect(sepR / sepRN).toBeGreaterThan(0.75);
    // transDir in the septum points LV → RV (toward the RV cavity, i.e. along −∇dRV)
    let agree = 0, total = 0;
    for (let v = 0; v < N; v++) {
      if (g.tissue[v] !== TISSUE.Septum) continue;
      const gx = d.rv[v + 1] - d.rv[v - 1], gy = d.rv[v + nx] - d.rv[v - nx], gz = d.rv[v + nx * ny] - d.rv[v - nx * ny];
      if (!Number.isFinite(gx + gy + gz)) continue;
      total++;
      if (g.transDir[3 * v] * gx + g.transDir[3 * v + 1] * gy + g.transDir[3 * v + 2] * gz < 0) agree++;
    }
    expect(agree / total).toBeGreaterThan(0.9);
  });

  it('apexBase: ventricles 0 at the apex → 1 at the AV plane; atria 0 at the ring → 1 at the roof', () => {
    let lo = 1, hi = 0, aLo = 1, aHi = 0;
    for (let v = 0; v < N; v++) {
      const t = g.tissue[v];
      if (isVent(t)) { lo = Math.min(lo, g.apexBase[v]); hi = Math.max(hi, g.apexBase[v]); }
      if (isAtr(t)) { aLo = Math.min(aLo, g.apexBase[v]); aHi = Math.max(aHi, g.apexBase[v]); }
    }
    expect(lo).toBeLessThan(0.03);
    expect(hi).toBe(1);
    expect(aLo).toBeLessThan(0.1);
    expect(aHi).toBe(1);
    // monotone in y along the LV axis
    const ax = -info.shiftA[0], az = -info.shiftA[2];
    let prev = -1;
    for (let j = 0; j < ny; j++) {
      const v = voxelAt([ax + 30, g.originMm[1] + j * h, az]);
      if (v < 0 || g.tissue[v] !== TISSUE.LV) continue;
      expect(g.apexBase[v]).toBeGreaterThanOrEqual(prev);
      prev = g.apexBase[v];
    }
  });
});

describe('heart geometry: AHA segments and regions', () => {
  it('every AHA segment 1–17 present with plausible size; septum lies in septal segments', () => {
    const cnt = new Array(18).fill(0);
    let lv = 0;
    for (let v = 0; v < N; v++) if (g.aha[v]) { cnt[g.aha[v]]++; lv++; }
    const frac = cnt.map((c) => c / lv);
    console.log('[geometry] AHA % ', frac.slice(1).map((f) => (100 * f).toFixed(1)).join(' '));
    for (let s = 1; s <= 17; s++) {
      expect(frac[s]).toBeGreaterThan(0.015);
      expect(frac[s]).toBeLessThan(0.13);
    }
    // The sectors are referenced to the mid-ventricular RV insertion; the basal RV (inflow + infundibulum) wraps a
    // little wider, so the check is strict at mid level and looser overall.
    let sep = 0, sepIn = 0, sepMid = 0, sepMidIn = 0;
    for (let v = 0; v < N; v++)
      if (g.tissue[v] === TISSUE.Septum && g.aha[v] !== 17) {
        const a = g.aha[v];
        sep++;
        if ([2, 3, 8, 9, 14].includes(a)) sepIn++;
        if (a >= 7 && a <= 12) {
          sepMid++;
          if (a === 8 || a === 9) sepMidIn++;
        }
      }
    expect(sepIn / sep).toBeGreaterThan(0.8);
    expect(sepMidIn / sepMid).toBeGreaterThan(0.85);
    // RV footprint on the LV ≈ 120° so septal sectors 2+3 match the septum
    const span = info.insertionDeg.inferior - info.insertionDeg.anterior;
    expect(span).toBeGreaterThan(100);
    expect(span).toBeLessThan(150);
  });

  it('all required region labels are present on the right tissue', () => {
    const need: Record<string, number[]> = {
      SEPTUM: [TISSUE.Septum], LV_APEX: [TISSUE.LV], LV_ANTERIOR: [TISSUE.LV], LV_LATERAL: [TISSUE.LV],
      LV_INFERIOR: [TISSUE.LV], LV_POSTEROBASAL: [TISSUE.LV], RV_FREE: [TISSUE.RV], RV_APEX: [TISSUE.RV], RVOT: [TISSUE.RV],
      RA: [TISSUE.RA], LA: [TISSUE.LA], LAA: [TISSUE.LA], AV_RING: [TISSUE.Ring],
    };
    for (const [name, tissues] of Object.entries(need)) {
      const r = STRUCTURES.indexOf(name as StructureId);
      let n = 0, wrong = 0;
      for (let v = 0; v < N; v++)
        if (g.region[v] === r) {
          n++;
          if (!tissues.includes(g.tissue[v])) wrong++;
        }
      expect(n, name).toBeGreaterThan(50);
      expect(wrong, name).toBe(0);
    }
  });
});

describe('heart geometry: pose and chamber arrangement (app frame)', () => {
  const app = (p: Vec3) => localToApp(bundle.pose, p);
  const lvC = centroid((v) => g.tissue[v] === TISSUE.LV || g.tissue[v] === TISSUE.Septum);
  const rvC = centroid((v) => g.tissue[v] === TISSUE.RV);
  const laC = centroid((v) => g.tissue[v] === TISSUE.LA || (g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.LA));
  const raC = centroid((v) => g.tissue[v] === TISSUE.RA || (g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.RA));

  it('local origin is the ventricular myocardial centroid (app origin)', () => {
    const c = centroid((v) => isVent(g.tissue[v]));
    for (let a = 0; a < 3; a++) expect(Math.abs(c[a])).toBeLessThan(0.5);
  });

  it('apex points left, inferior and anterior', () => {
    let apex = -1, yMin = Infinity;
    for (let v = 0; v < N; v++) if (isVent(g.tissue[v]) && centre(v)[1] < yMin) { yMin = centre(v)[1]; apex = v; }
    const a = app(centre(apex)); // relative to the app origin = ventricular centroid
    expect(a[0]).toBeGreaterThan(0);
    expect(a[1]).toBeLessThan(0);
    expect(a[2]).toBeGreaterThan(0);
    const dir = localDirToApp(bundle.pose, [0, -1, 0]);
    expect(dir[0]).toBeGreaterThan(0.4);
    expect(dir[1]).toBeLessThan(-0.4);
    expect(dir[2]).toBeGreaterThan(0.4);
  });

  it('RV centroid is anterior and to the right of the LV centroid; LA is the most posterior chamber', () => {
    const lv = app(lvC), rv = app(rvC), la = app(laC), ra = app(raC);
    expect(rv[0]).toBeLessThan(lv[0]);
    expect(rv[2]).toBeGreaterThan(lv[2]);
    expect(la[2]).toBeLessThan(Math.min(ra[2], lv[2], rv[2]));
    expect(ra[0]).toBeLessThan(la[0]); // RA right of LA
  });

  it('valves: four, unit forward-flow normals, plausible radii, centred in blood', () => {
    const r = Object.fromEntries(bundle.valves.map((v) => [v.id, v]));
    expect(Object.keys(r).sort()).toEqual(['AORTIC', 'MITRAL', 'PULMONARY', 'TRICUSPID']);
    expect(r.MITRAL.radiusMm).toBeCloseTo(15, 0);
    expect(r.TRICUSPID.radiusMm).toBeGreaterThan(15.5);
    expect(r.AORTIC.radiusMm).toBeGreaterThanOrEqual(11);
    expect(r.AORTIC.radiusMm).toBeLessThanOrEqual(12.5);
    expect(r.PULMONARY.radiusMm).toBeCloseTo(12, 0);
    for (const v of bundle.valves) {
      expect(Math.hypot(...v.normal)).toBeCloseTo(1, 5);
      expect(g.tissue[voxelAt(v.centerMm)]).toBe(TISSUE.Blood);
    }
    expect(r.MITRAL.normal[1]).toBeLessThan(-0.9); // atrium → ventricle
    expect(r.AORTIC.normal[1]).toBeGreaterThan(0.5); // ventricle → aorta
    expect(r.PULMONARY.normal[1]).toBeGreaterThan(0.5);
    // pulmonary valve anterior and superior to the aortic valve; aorta central
    expect(r.PULMONARY.centerMm[2]).toBeGreaterThan(r.AORTIC.centerMm[2]);
    expect(r.PULMONARY.centerMm[1]).toBeGreaterThan(r.AORTIC.centerMm[1]);
  });

  it('chamber axes: LA, RA, LV, RV with unit axes (ventricles base → apex, atria ring → roof)', () => {
    const byC = Object.fromEntries(bundle.chambers.map((c) => [c.chamber, c]));
    for (const c of [CHAMBER.LA, CHAMBER.RA, CHAMBER.LV, CHAMBER.RV]) {
      expect(byC[c]).toBeDefined();
      expect(Math.hypot(...byC[c].axis)).toBeCloseTo(1, 5);
      expect(byC[c].radiusMm).toBeGreaterThan(10);
      expect(byC[c].lengthMm).toBeGreaterThan(20);
    }
    expect(byC[CHAMBER.LV].axis[1]).toBeLessThan(-0.95);
    expect(byC[CHAMBER.RV].axis[1]).toBeLessThan(-0.9);
    expect(byC[CHAMBER.LA].axis[1]).toBeGreaterThan(0.95);
    expect(byC[CHAMBER.LV].lengthMm).toBeGreaterThanOrEqual(80);
    expect(byC[CHAMBER.LV].lengthMm).toBeLessThanOrEqual(92);
  });
});

describe('heart geometry: conduction system and landmarks', () => {
  const path = (id: StructureId): ConductionPath => {
    const p = bundle.paths.find((x) => x.id === id);
    if (!p) throw new Error(`missing path ${id}`);
    return p;
  };
  /** Point lies in (or within `tol` voxels of) a voxel satisfying pred. */
  const near = (p: Vec3, pred: (v: number) => boolean, tol = 1): boolean => {
    const c = voxelAt(p);
    if (c < 0) return false;
    const [ci, cj, ck] = ijk(c);
    for (let dk = -tol; dk <= tol; dk++)
      for (let dj = -tol; dj <= tol; dj++)
        for (let di = -tol; di <= tol; di++) {
          const i = ci + di, j = cj + dj, k = ck + dk;
          if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
          if (pred(idx(i, j, k))) return true;
        }
    return false;
  };
  const length = (p: ConductionPath) => {
    let s = 0;
    for (let q = 1; q < p.pointsMm.length; q++) s += Math.hypot(...([0, 1, 2].map((a) => p.pointsMm[q][a] - p.pointsMm[q - 1][a])) as [number, number, number]);
    return s;
  };
  const all = (id: StructureId, pred: (v: number) => boolean, tol = 1) => path(id).pointsMm.filter((p) => !near(p, pred, tol)).length;

  it('all nine paths exist with sensible lengths and no snapping misses', () => {
    for (const id of ['SA', 'BACHMANN', 'AVN', 'HIS', 'LBB', 'LAF', 'LPF', 'LSF', 'RBB'] as const) expect(path(id).pointsMm.length).toBeGreaterThanOrEqual(2);
    expect(info.conductionMisses).toEqual([]);
    expect(length(path('SA'))).toBeGreaterThan(8); // crescent 13.5 ± 2.5 mm
    expect(length(path('SA'))).toBeLessThan(30);
    expect(length(path('LBB'))).toBeGreaterThan(8); // trunk 10–15 mm
    expect(length(path('LBB'))).toBeLessThan(22);
    expect(length(path('BACHMANN'))).toBeGreaterThan(30);
  });

  it('SA and Bachmann lie in atrial myocardium (SA in the RA, subepicardial)', () => {
    expect(all('SA', (v) => g.tissue[v] === TISSUE.RA)).toBe(0);
    expect(all('SA', (v) => g.tissue[v] === TISSUE.RA && d.out[v] < 2.5)).toBe(0);
    expect(all('BACHMANN', (v) => isAtr(g.tissue[v]))).toBe(0);
    const b = path('BACHMANN').pointsMm;
    expect(g.tissue[voxelAt(b[0])]).toBe(TISSUE.RA);
    expect(g.tissue[voxelAt(b[b.length - 1])]).toBe(TISSUE.LA);
  });

  it('AVN sits in the RA just above the ring; His crosses the ring to the septal crest', () => {
    const avn = path('AVN').pointsMm;
    expect(all('AVN', (v) => g.tissue[v] === TISSUE.RA)).toBe(0);
    expect(near(avn[avn.length - 1], (v) => g.tissue[v] === TISSUE.Ring, 2)).toBe(true);
    const his = path('HIS').pointsMm;
    expect(g.tissue[voxelAt(his[0])]).toBe(TISSUE.RA);
    expect(his.some((p) => g.tissue[voxelAt(p)] === TISSUE.Ring)).toBe(true);
    expect(g.tissue[voxelAt(his[his.length - 1])]).toBe(TISSUE.Septum);
  });

  it('left bundle and fascicles run on the LEFT septal / LV endocardial surface; RBB on the RIGHT septal surface → moderator band', () => {
    const lvEndo = (v: number) => (g.tissue[v] === TISSUE.LV || g.tissue[v] === TISSUE.Septum) && d.lv[v] < 1.5;
    expect(all('LBB', (v) => g.tissue[v] === TISSUE.Septum && d.lv[v] < 1.5)).toBe(0);
    expect(all('LSF', (v) => g.tissue[v] === TISSUE.Septum && d.lv[v] < 1.5)).toBe(0);
    expect(all('LAF', lvEndo)).toBe(0);
    expect(all('LPF', lvEndo)).toBe(0);
    // fascicle ends: anterior → anterolateral region, posterior → inferior region
    const ahaAt = (p: Vec3) => {
      for (let s = 0; s < 4; s++) {
        const v = voxelAt(p);
        if (g.aha[v]) return g.aha[v];
      }
      return 0;
    };
    const lafEnd = path('LAF').pointsMm.at(-1)!, lpfEnd = path('LPF').pointsMm.at(-1)!;
    expect([1, 6, 7, 12, 13, 16]).toContain(ahaAt(lafEnd));
    expect([3, 4, 5, 9, 10, 11, 15]).toContain(ahaAt(lpfEnd));
    const rbb = path('RBB').pointsMm;
    const rightSeptal = (v: number) => g.tissue[v] === TISSUE.Septum && d.rv[v] < 1.5;
    const rvTissue = (v: number) => g.tissue[v] === TISSUE.RV;
    expect(rbb.filter((p) => !near(p, (v) => rightSeptal(v) || rvTissue(v))).length).toBe(0);
    expect(rbb.slice(1, 4).every((p) => near(p, rightSeptal))).toBe(true);
    expect(g.tissue[voxelAt(rbb[rbb.length - 1])]).toBe(TISSUE.RV); // anterior papillary muscle base
    // never on the wrong side
    expect(path('LBB').pointsMm.some((p) => near(p, (v) => g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.RV, 0))).toBe(false);
  });

  it('landmarks exist for every placeable structure and sit near the heart', () => {
    const ids: StructureId[] = ['SA', 'BACHMANN', 'AVN', 'HIS', 'LBB', 'LAF', 'LPF', 'LSF', 'RBB', 'LA', 'LAA', 'RA', 'SEPTUM',
      'LV_APEX', 'LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'RV_FREE', 'RV_APEX', 'RVOT',
      'MITRAL', 'TRICUSPID', 'AORTIC', 'PULMONARY', 'AV_RING', 'PURKINJE_LV', 'PURKINJE_RV'];
    for (const id of ids) {
      const p = bundle.landmarks[id];
      expect(p, id).toBeDefined();
      expect(Math.hypot(...p!)).toBeLessThan(110);
    }
    // epicardial anchors are just outside tissue
    for (const id of ['LV_LATERAL', 'LV_ANTERIOR', 'LV_INFERIOR', 'RV_FREE', 'RVOT', 'LA', 'RA', 'LV_APEX'] as const) {
      const v = voxelAt(bundle.landmarks[id]!);
      expect(g.tissue[v], id).toBe(TISSUE.Out);
      expect(g.sdfMm[v], id).toBeLessThan(5);
    }
  });
});

describe('heart geometry: parameters', () => {
  it('a coarser / hypertrophied variant still satisfies insulation and wall rules (LVH: thicker LV wall)', () => {
    const b: GeometryBundle = buildHeartGeometry({ hMm: 2, lvWallMm: 14 });
    const gg: VoxelGrid = b.grid;
    const [mx, my, mz] = gg.dims;
    let touch = 0, lv = 0;
    for (let k = 0; k < mz - 1; k++)
      for (let j = 0; j < my - 1; j++)
        for (let i = 0; i < mx - 1; i++) {
          const v = i + mx * (j + my * k);
          if (gg.tissue[v] === TISSUE.LV || gg.tissue[v] === TISSUE.Septum) lv++;
          const ca = compOfTissue(gg.tissue[v]);
          if (ca === COMP.None) continue;
          for (const u of [v + 1, v + mx, v + mx * my]) {
            const cb = compOfTissue(gg.tissue[u]);
            if (cb !== COMP.None && cb !== ca) touch++;
          }
        }
    expect(touch).toBe(0);
    let lvDefault = 0;
    for (let v = 0; v < N; v++) if (g.tissue[v] === TISSUE.LV || g.tissue[v] === TISSUE.Septum) lvDefault++;
    expect(lv * 8).toBeGreaterThan(lvDefault * h ** 3 * 1.2); // ≥ 20 % more LV myocardium (2 mm voxels = 8 mm³)
    expect(b.hash).not.toBe(bundle.hash);
  });
});
