/**
 * Conduction-system paths and label landmarks placed on the REAL anatomy from landmarks of the labelled grid
 * (docs/research/lead-geometry-anatomy.md "conduction-system anatomy"; activation-physiology.md §1–2):
 *   SA        anterolateral SVC–RA junction, subepicardial, running down the terminal crest
 *   BACHMANN  anterior RA roof near the SVC → interatrial groove → anterior LA roof toward the appendage
 *   AVN       Koch's triangle: from between the coronary-sinus ostium and the septal tricuspid annulus up to its apex
 *   HIS       through the central fibrous body (between the tricuspid and aortic annuli) to the crest of the septum
 *   LBB       left septal subendocardium, fanning into LAF (high anterior paraseptal, toward the anterolateral
 *             papillary muscle), LSF (mid left septal surface) and LPF (posterior paraseptal, ≈ 1/3 apex → base,
 *             toward the posteromedial papillary muscle)
 *   RBB       right septal subendocardium → septal origin of the moderator band → base of the RV anterior papillary
 *             muscle (across the moderator band, which the bake voxelizes as RV myocardium)
 * Bundle points are snapped to subendocardial voxels and joined by geodesics over them (26-neighbour Dijkstra), so the
 * paths stay just under the intended endocardial surface.
 */
import type { ConductionPath, StructureId, Vec3, VoxelGrid } from '../../types';
import { CHAMBER, STRUCTURES, TISSUE } from '../../types';
import { add, dot, normalize, scale, sub } from '../../frame';
import type { ValveRing } from './label';
import type { Mesh } from './mesh';

export interface ConductionInputs {
  readonly grid: VoxelGrid;
  readonly rings: Readonly<Record<'MITRAL' | 'TRICUSPID' | 'AORTIC' | 'PULMONARY', ValveRing>>;
  /** Local-frame vessel meshes by id (SVC, IVC, CORONARY_SINUS…). */
  readonly vessels: ReadonlyMap<string, Mesh>;
  /** Papillary attachment points (local mm). */
  readonly papillaryBase: Readonly<Record<'lvAnterolateral' | 'lvPosteromedial' | 'rvAnterior', Vec3>>;
  /** Unit app-anterior direction in the local frame. */
  readonly anteriorDir: Vec3;
  /** LV apex (local mm) — the LV long axis is the local y line through it. */
  readonly lvApex: Vec3;
  /** Anterior and inferior RV insertion angles about the LV axis (deg, 0° = +x, 90° = +z). */
  readonly insertionsDeg: readonly [number, number];
  /** 1 where a voxel belongs to a papillary muscle or the moderator band (bundles run on the wall, not on them). */
  readonly papillary: Uint8Array;
}

export interface ConductionOutputs {
  readonly paths: ConductionPath[];
  readonly landmarks: Partial<Record<StructureId, Vec3>>;
  /** Named intermediate points (for tests and the report). */
  readonly points: Readonly<Record<string, Vec3>>;
}

type Pred = (v: number) => boolean;

export class VoxelIndex {
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  constructor(readonly g: VoxelGrid) {
    [this.nx, this.ny, this.nz] = g.dims;
  }
  pos(v: number): Vec3 {
    const { nx, ny, g } = this;
    return [g.originMm[0] + (v % nx) * g.hMm, g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm, g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm];
  }
  /** Nearest voxel satisfying pred within maxMm (cube scan, exact Euclidean). */
  nearest(p: Vec3, pred: Pred, maxMm = 40): number {
    const { nx, ny, nz, g } = this;
    const fi = (p[0] - g.originMm[0]) / g.hMm, fj = (p[1] - g.originMm[1]) / g.hMm, fk = (p[2] - g.originMm[2]) / g.hMm;
    const r = Math.ceil(maxMm / g.hMm);
    let best = -1, bd = Infinity;
    for (let k = Math.max(0, Math.floor(fk - r)); k <= Math.min(nz - 1, Math.ceil(fk + r)); k++)
      for (let j = Math.max(0, Math.floor(fj - r)); j <= Math.min(ny - 1, Math.ceil(fj + r)); j++)
        for (let i = Math.max(0, Math.floor(fi - r)); i <= Math.min(nx - 1, Math.ceil(fi + r)); i++) {
          const d = (i - fi) ** 2 + (j - fj) ** 2 + (k - fk) ** 2;
          if (d >= bd) continue;
          const v = i + nx * (j + ny * k);
          if (!pred(v)) continue;
          bd = d;
          best = v;
        }
    return best;
  }
  /** Voxel maximizing score among pred voxels within radius of p. */
  argmax(p: Vec3, radiusMm: number, pred: Pred, score: (q: Vec3) => number): number {
    const { nx, ny, nz, g } = this;
    const fi = (p[0] - g.originMm[0]) / g.hMm, fj = (p[1] - g.originMm[1]) / g.hMm, fk = (p[2] - g.originMm[2]) / g.hMm;
    const r = Math.ceil(radiusMm / g.hMm);
    let best = -1, bs = -Infinity;
    for (let k = Math.max(0, Math.floor(fk - r)); k <= Math.min(nz - 1, Math.ceil(fk + r)); k++)
      for (let j = Math.max(0, Math.floor(fj - r)); j <= Math.min(ny - 1, Math.ceil(fj + r)); j++)
        for (let i = Math.max(0, Math.floor(fi - r)); i <= Math.min(nx - 1, Math.ceil(fi + r)); i++) {
          if ((i - fi) ** 2 + (j - fj) ** 2 + (k - fk) ** 2 > r * r) continue;
          const v = i + nx * (j + ny * k);
          if (!pred(v)) continue;
          const s = score(this.pos(v));
          if (s > bs) {
            bs = s;
            best = v;
          }
        }
    return best;
  }
  hasNeighbour(v: number, pred: Pred): boolean {
    const { nx, ny, nz } = this;
    const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
    return (i > 0 && pred(v - 1)) || (i < nx - 1 && pred(v + 1)) || (j > 0 && pred(v - nx)) || (j < ny - 1 && pred(v + nx)) || (k > 0 && pred(v - nx * ny)) || (k < nz - 1 && pred(v + nx * ny));
  }
  /** Geodesic (26-neighbour Dijkstra) between two voxels over pred voxels; returns voxel list (empty if unreachable). */
  geodesic(a: number, b: number, pred: Pred): number[] {
    const { nx, ny, nz } = this;
    const dist = new Map<number, number>([[a, 0]]);
    const prev = new Map<number, number>();
    const heap: [number, number][] = [[0, a]];
    const push = (d: number, v: number) => {
      heap.push([d, v]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = (): [number, number] => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    while (heap.length) {
      const [d, v] = pop();
      if (d > (dist.get(v) ?? Infinity)) continue;
      if (v === b) break;
      const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
      for (let dk = -1; dk <= 1; dk++)
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            if (!di && !dj && !dk) continue;
            const ii = i + di, jj = j + dj, kk = k + dk;
            if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
            const w = ii + nx * (jj + ny * kk);
            if (!pred(w)) continue;
            const nd = d + Math.hypot(di, dj, dk);
            if (nd < (dist.get(w) ?? Infinity)) {
              dist.set(w, nd);
              prev.set(w, v);
              push(nd, w);
            }
          }
    }
    if (!dist.has(b)) return [];
    const out: number[] = [];
    for (let v: number | undefined = b; v !== undefined; v = prev.get(v)) out.push(v);
    return out.reverse();
  }
}

/** Smooths (moving average, ends fixed) and resamples a voxel path to points every ≈ stepMm. */
export function smoothPath(points: readonly Vec3[], stepMm = 3, passes = 3): Vec3[] {
  let p = points.map((q) => [q[0], q[1], q[2]] as Vec3);
  for (let s = 0; s < passes; s++)
    p = p.map((q, i) => (i === 0 || i === p.length - 1 ? q : scale(add(add(p[i - 1], q), p[i + 1]), 1 / 3)));
  if (p.length < 2) return p;
  const out: Vec3[] = [p[0]];
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    acc += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]);
    if (acc >= stepMm || i === p.length - 1) {
      out.push(p[i]);
      acc = 0;
    }
  }
  return out;
}

const centroid = (P: ArrayLike<number>, filter?: (x: number, y: number, z: number) => boolean): Vec3 | null => {
  let x = 0, y = 0, z = 0, n = 0;
  for (let i = 0; i < P.length; i += 3) {
    if (filter && !filter(P[i], P[i + 1], P[i + 2])) continue;
    x += P[i];
    y += P[i + 1];
    z += P[i + 2];
    n++;
  }
  return n ? [x / n, y / n, z / n] : null;
};

export function placeConduction(inp: ConductionInputs): ConductionOutputs {
  const g = inp.grid;
  const X = new VoxelIndex(g);
  const T = g.tissue, C = g.chamber;
  const isRA: Pred = (v) => T[v] === TISSUE.RA;
  const isLA: Pred = (v) => T[v] === TISSUE.LA;
  const isAtrial: Pred = (v) => T[v] === TISSUE.LA || T[v] === TISSUE.RA;
  const isOut: Pred = (v) => T[v] === TISSUE.Out || T[v] === TISSUE.Vessel;
  const bloodOf = (ch: number): Pred => (v) => T[v] === TISSUE.Blood && C[v] === ch;
  const epiRA: Pred = (v) => isRA(v) && X.hasNeighbour(v, isOut);
  const epiAtrial: Pred = (v) => isAtrial(v) && X.hasNeighbour(v, isOut);
  const endoRA: Pred = (v) => isRA(v) && X.hasNeighbour(v, bloodOf(CHAMBER.RA));
  const lvBlood = bloodOf(CHAMBER.LV), rvBlood = bloodOf(CHAMBER.RV);
  const isVent = (v: number) => T[v] === TISSUE.LV || T[v] === TISSUE.Septum || T[v] === TISSUE.RV;
  const pap = inp.papillary;
  const subLV: Pred = (v) => (T[v] === TISSUE.LV || T[v] === TISSUE.Septum) && !pap[v] && X.hasNeighbour(v, lvBlood);
  const subLVsept: Pred = (v) => T[v] === TISSUE.Septum && X.hasNeighbour(v, lvBlood);
  const subRVsept: Pred = (v) => T[v] === TISSUE.Septum && X.hasNeighbour(v, rvBlood);
  const subRV: Pred = (v) => isVent(v) && T[v] !== TISSUE.LV && !pap[v] && X.hasNeighbour(v, rvBlood);
  const P = (v: number) => X.pos(v);
  const R = inp.rings;
  const points: Record<string, Vec3> = {};

  // ---------------------------------------------------------------- atrial landmarks
  const nearRA = (m: Mesh | undefined, mm: number): Vec3 | null => {
    if (!m) return null;
    return centroid(m.position, (x, y, z) => {
      const v = X.nearest([x, y, z], isRA, mm);
      return v >= 0;
    });
  };
  const svc = nearRA(inp.vessels.get('SVC'), 4) ?? add(R.TRICUSPID.centerMm, scale(R.TRICUSPID.normal, -45));
  const ivc = nearRA(inp.vessels.get('IVC'), 4) ?? add(R.TRICUSPID.centerMm, scale(R.TRICUSPID.normal, -10));
  const cs = nearRA(inp.vessels.get('CORONARY_SINUS'), 4) ?? nearRA(inp.vessels.get('CORONARY_SINUS'), 10) ?? ivc;
  points.svcJunction = svc;
  points.ivcJunction = ivc;
  points.csOstium = cs;
  let raC: Vec3 = [0, 0, 0], laC: Vec3 = [0, 0, 0], nra = 0, nla = 0;
  for (let v = 0; v < T.length; v++) {
    if (T[v] === TISSUE.RA) {
      raC = add(raC, P(v));
      nra++;
    } else if (T[v] === TISSUE.LA) {
      laC = add(laC, P(v));
      nla++;
    }
  }
  raC = scale(raC, 1 / Math.max(1, nra));
  laC = scale(laC, 1 / Math.max(1, nla));
  // lateral RA direction: away from the LA, orthogonal to the SVC → IVC line, slightly anterior
  const cavalAxis = normalize(sub(ivc, svc));
  let lateral = sub(raC, laC);
  lateral = normalize(sub(lateral, scale(cavalAxis, dot(lateral, cavalAxis))));
  const lateralAnt = normalize(add(lateral, scale(inp.anteriorDir, 0.6)));
  const saV = X.argmax(svc, 14, epiRA, (q) => dot(sub(q, svc), lateralAnt) - 0.3 * Math.abs(dot(sub(q, svc), cavalAxis)));
  const SA = saV >= 0 ? P(saV) : svc;
  // SA node body along the terminal crest (lateral RA wall), ≈ 15 mm toward the IVC
  const saPath: Vec3[] = [SA];
  for (const t of [0.12, 0.24, 0.36]) {
    const q = add(add(SA, scale(sub(ivc, SA), t)), scale(lateral, 6));
    const v = X.nearest(q, epiRA, 15);
    if (v >= 0) saPath.push(P(v));
  }

  // Bachmann: RA anterior roof (medial to the SVC) → interatrial groove → anterior LA roof toward the appendage
  const roofUp = normalize(add(scale(R.MITRAL.normal, -0.5), scale(R.TRICUSPID.normal, -0.5)));
  const toLA = normalize(sub(laC, raC));
  const b0v = X.argmax(svc, 18, epiRA, (q) => dot(sub(q, svc), toLA) + 0.5 * dot(sub(q, svc), inp.anteriorDir) - 0.3 * Math.abs(dot(sub(q, svc), roofUp)));
  const B0 = b0v >= 0 ? P(b0v) : SA;
  let laaC: Vec3 | null = null;
  {
    let s: Vec3 = [0, 0, 0], n = 0;
    const laa = STRUCTURES.indexOf('LAA');
    for (let v = 0; v < T.length; v++) if (g.region[v] === laa) {
      s = add(s, P(v));
      n++;
    }
    if (n) laaC = scale(s, 1 / n);
  }
  const b3v = X.nearest(laaC ?? add(laC, scale(inp.anteriorDir, 15)), (v) => isLA(v) && g.region[v] !== STRUCTURES.indexOf('LAA') && X.hasNeighbour(v, isOut), 30);
  const B3 = b3v >= 0 ? P(b3v) : laC;
  const bach: Vec3[] = [B0];
  for (const t of [0.25, 0.5, 0.75]) {
    const q = add(add(B0, scale(sub(B3, B0), t)), scale(roofUp, 8 * Math.sin(Math.PI * t)));
    const v = X.nearest(q, epiAtrial, 20);
    if (v >= 0) bach.push(P(v));
  }
  bach.push(B3);

  // ---------------------------------------------------------------- AV junction
  const closestOn = (m: Mesh, p: Vec3): Vec3 => {
    let best: Vec3 = p, bd = Infinity;
    for (let i = 0; i < m.position.length; i += 3) {
      const d = (m.position[i] - p[0]) ** 2 + (m.position[i + 1] - p[1]) ** 2 + (m.position[i + 2] - p[2]) ** 2;
      if (d < bd) {
        bd = d;
        best = [m.position[i], m.position[i + 1], m.position[i + 2]];
      }
    }
    return best;
  };
  const pTA = closestOn(R.TRICUSPID.band, R.AORTIC.centerMm);
  const pAO = closestOn(R.AORTIC.band, R.TRICUSPID.centerMm);
  const cfb = scale(add(pTA, pAO), 0.5); // central fibrous body / membranous septum
  points.centralFibrousBody = cfb;
  // septal tricuspid annulus point nearest the CS ostium; Koch's triangle runs from there toward the CFB
  const pTS = closestOn(R.TRICUSPID.band, cs);
  const kochAt = (t: number) => {
    const q = add(scale(pTS, 1 - t), scale(cfb, t));
    const qq = add(q, scale(R.TRICUSPID.normal, -4)); // just on the atrial side of the annulus
    const v = X.nearest(qq, endoRA, 15);
    return v >= 0 ? P(v) : qq;
  };
  const avnStart = kochAt(0.35), AVN = kochAt(0.8);
  // crest of the muscular septum below the CFB
  const crestV = X.nearest(add(cfb, scale(R.TRICUSPID.normal, 3)), (v) => T[v] === TISSUE.Septum, 30);
  const H1 = crestV >= 0 ? P(crestV) : cfb;
  const his: Vec3[] = [AVN, scale(add(AVN, cfb), 0.5), cfb, H1];

  // ---------------------------------------------------------------- left bundle and fascicles
  const pathOn = (a: Vec3, b: Vec3, pred: Pred, maxMm = 25): Vec3[] => {
    const va = X.nearest(a, pred, maxMm), vb = X.nearest(b, pred, maxMm);
    if (va < 0 || vb < 0) return [a, b];
    const vox = X.geodesic(va, vb, pred);
    return vox.length ? smoothPath(vox.map(P)) : [P(va), P(vb)];
  };
  const L0 = X.nearest(H1, subLVsept, 25);
  const l0 = L0 >= 0 ? P(L0) : H1;
  const lbbEndTarget: Vec3 = [l0[0], l0[1] - 14, l0[2]];
  const lbb = [H1, ...pathOn(l0, lbbEndTarget, subLVsept)];
  const lb1 = lbb[lbb.length - 1];
  const yApexLV = minY(g, (v) => T[v] === TISSUE.LV);
  const yBase = R.MITRAL.centerMm[1];
  const yAt = (f: number) => yApexLV + f * (yBase - yApexLV);
  // Fascicle terminals by angle about the LV long axis (0° = +x, 90° = +z) and apex → base level (Durrer early
  // sites): LAF high anterior paraseptal (just anterior of the anterior RV insertion, ≈ 2/3 toward the base, the
  // anterolateral papillary muscle side), LSF mid left septal surface, LPF posterior paraseptal (just inferior of the
  // inferior RV insertion) at ≈ 1/3 apex → base, the posteromedial papillary muscle side.
  const [antDeg, infDeg] = inp.insertionsDeg;
  const ap = inp.lvApex;
  const lvLen = yBase - ap[1];
  const angleOf = (q: Vec3) => (((Math.atan2(q[2] - ap[2], q[0] - ap[0]) * 180) / Math.PI) % 360 + 360) % 360;
  const angDiff = (x: number, y: number) => Math.abs((((x - y) % 360) + 540) % 360 - 180);
  const septMid = antDeg + ((((infDeg - antDeg) % 360) + 360) % 360) / 2;
  const away = (from: number, by: number) => from + by * Math.sign((((from - septMid) % 360) + 540) % 360 - 180);
  const terminal = (deg: number, ab: number, pred: Pred): number => {
    let best = -1, bs = Infinity;
    for (let v = 0; v < T.length; v++) {
      if (!pred(v)) continue;
      const q = P(v);
      const f = (q[1] - ap[1]) / lvLen;
      if (Math.abs(f - ab) > 0.06) continue;
      const sc = angDiff(angleOf(q), deg) + 100 * Math.abs(f - ab);
      if (sc < bs) {
        bs = sc;
        best = v;
      }
    }
    return best;
  };
  const lafT = terminal(away(antDeg, 15), 0.68, subLV);
  const lsfT = terminal(septMid, 0.5, subLVsept);
  const lpfT = terminal(away(infDeg, 15), 0.36, subLV);
  const fall = (v: number, q: Vec3) => (v >= 0 ? P(v) : q);
  const lsf = pathOn(lb1, fall(lsfT, lb1), subLV);
  const laf = pathOn(lb1, fall(lafT, inp.papillaryBase.lvAnterolateral), subLV, 45);
  const lpf = pathOn(lb1, fall(lpfT, inp.papillaryBase.lvPosteromedial), subLV, 45);

  // ---------------------------------------------------------------- right bundle and moderator band
  const R0 = X.nearest(H1, subRVsept, 25);
  const apmR = inp.papillaryBase.rvAnterior;
  const mb0 = X.nearest(apmR, subRVsept, 60);
  const rbbSeptal = R0 >= 0 && mb0 >= 0 ? pathOn(P(R0), P(mb0), subRV) : [H1];
  const mbStart = rbbSeptal[rbbSeptal.length - 1];
  const band: Vec3[] = [];
  const mbLen = Math.hypot(...sub(apmR, mbStart));
  const nb = Math.max(1, Math.round(mbLen / 3));
  for (let i = 1; i <= nb; i++) band.push(add(mbStart, scale(sub(apmR, mbStart), i / nb)));
  const rbb = [H1, ...rbbSeptal, ...band];
  points.moderatorBandStart = mbStart;
  points.rvAnteriorPapillaryBase = apmR;

  const paths: ConductionPath[] = [
    { id: 'SA', pointsMm: saPath },
    { id: 'BACHMANN', pointsMm: bach },
    { id: 'AVN', pointsMm: [avnStart, AVN] },
    { id: 'HIS', pointsMm: his },
    { id: 'LBB', pointsMm: lbb },
    { id: 'LAF', pointsMm: laf },
    { id: 'LPF', pointsMm: lpf },
    { id: 'LSF', pointsMm: lsf },
    { id: 'RBB', pointsMm: rbb },
  ];
  const mid = (pts: readonly Vec3[]) => pts[Math.floor((pts.length - 1) / 2)];
  const landmarks: Partial<Record<StructureId, Vec3>> = {
    SA, AVN, HIS: H1, BACHMANN: mid(bach), LBB: mid(lbb), LAF: mid(laf), LPF: mid(lpf), LSF: mid(lsf), RBB: mid(rbb),
  };
  const pkLV = X.nearest([lb1[0], yAt(0.3), lb1[2]], subLV, 40);
  const pkRV = X.nearest([apmR[0], yAt(0.3), apmR[2]], subRV, 40);
  if (pkLV >= 0) landmarks.PURKINJE_LV = P(pkLV);
  if (pkRV >= 0) landmarks.PURKINJE_RV = P(pkRV);
  Object.assign(landmarks, regionAnchors(g, X));
  for (const id of ['MITRAL', 'TRICUSPID', 'AORTIC', 'PULMONARY'] as const) landmarks[id] = R[id].centerMm;
  landmarks.AV_RING = scale(add(R.MITRAL.centerMm, R.TRICUSPID.centerMm), 0.5);
  Object.assign(points, { SA, AVN, H1, B0, B3, lb1, pTA, pAO, pTS });
  return { paths, landmarks, points };
}

function minY(g: VoxelGrid, pred: Pred): number {
  const [nx, ny] = g.dims;
  let m = Infinity;
  for (let v = 0; v < g.tissue.length; v++) if (pred(v)) m = Math.min(m, g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm);
  return m;
}

function regionCentroid(g: VoxelGrid, pred: Pred): Vec3 | null {
  const [nx, ny] = g.dims;
  let x = 0, y = 0, z = 0, n = 0;
  for (let v = 0; v < g.tissue.length; v++) {
    if (!pred(v)) continue;
    x += g.originMm[0] + (v % nx) * g.hMm;
    y += g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm;
    z += g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm;
    n++;
  }
  return n ? [x / n, y / n, z / n] : null;
}

/** Label anchors for anatomical regions: the epicardial voxel (wallDepth ≥ 0.75) of the region nearest its centroid. */
function regionAnchors(g: VoxelGrid, X: VoxelIndex): Partial<Record<StructureId, Vec3>> {
  const out: Partial<Record<StructureId, Vec3>> = {};
  const ids: StructureId[] = ['RA', 'LA', 'LAA', 'SEPTUM', 'LV_APEX', 'LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'RV_FREE', 'RV_APEX', 'RVOT'];
  for (const id of ids) {
    const r = STRUCTURES.indexOf(id);
    if (r < 0) continue;
    const c = regionCentroid(g, (v) => g.region[v] === r);
    if (!c) continue;
    const epi = id === 'SEPTUM' ? (v: number) => g.region[v] === r : (v: number) => g.region[v] === r && g.wallDepth[v] >= 0.75;
    const v = X.nearest(c, epi, 80);
    out[id] = v >= 0 ? X.pos(v) : c;
  }
  return out;
}
