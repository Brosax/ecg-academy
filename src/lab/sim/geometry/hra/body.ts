/**
 * Realistic body surface for the electrodes view: HRA 3D Reference Organ "Skin, Male" v1.3 (Visible Human Male,
 * CC BY 4.0) — the same body frame as the HRA heart, so the heart sits where it belongs without manual registration.
 *
 * Bake time (Node): buildBodyModel() moves the skin into the app frame (cm, origin = the heart's local origin, i.e.
 * the ventricular centroid; app axes = body axes) and places the 10 electrodes and the precordial landmark lines on
 * the skin from horizontal cross-sections:
 *   - 5th intercostal level = height of the cardiac apex (apex beat: 5th ICS, midclavicular line); 4th ICS 2.3 cm higher.
 *   - Sternal midline = body midline; V1/V2 2.5 cm right/left of it at the 4th ICS.
 *   - Midclavicular line ≈ the apex, clamped to 8–11 cm left of the midline; V4 there at the 5th ICS; V3 halfway V2–V4.
 *   - V6 = lateral point of the torso contour at mid-depth of the chest, V4 level (mid-axillary line); V5 halfway
 *     between V4 and V6 by angle (anterior axillary line).
 *   - Limb electrodes on the wrists and ankles.
 * These are estimates from body proportions (the HRA has no male ribs), stated as such in the UI.
 * Runtime: decodeBodyModel() / loadHraBody() read the compact gzip asset src/assets/body-hra.bin.
 */
import { computeNormals } from '../surfaceNets';
import type { BodyGuideId, BodyModel, ElectrodeId, ModelCredit, Vec3 } from '../../types';
import { readGlbMeshes, weldMesh } from './glb';

export const SKIN_FILE = '3d-vh-m-skin.glb';

export const SKIN_CREDIT: ModelCredit = {
  title: 'HRA 3D Reference Organ — Skin, Male (VH_M_Skin) v1.3',
  authors: 'Browne K, Schlehlein H (Human Reference Atlas, HuBMAP); Visible Human Male data, NLM',
  url: 'https://doi.org/10.48539/HBM527.FMBB.748',
  license: 'CC BY 4.0',
};

const ICS_SPACING_CM = 2.3;
const STERNAL_BORDER_CM = 2.5;
/** Torso half-width cap: points farther from the midline belong to the arms (cm). */
const TORSO_HALF_WIDTH_CM = 21;

interface Seg {
  readonly a: readonly [number, number];
  readonly b: readonly [number, number];
}

/** Cross-section loops of a triangle mesh with the plane y = h, as closed polylines in (x, z). */
function sliceLoops(P: Float32Array, I: Uint32Array, h: number): [number, number][][] {
  const edgeKey = (i: number, j: number) => (i < j ? i * 2_000_003 + j : j * 2_000_003 + i);
  const cut = (i: number, j: number): [number, number] => {
    const yi = P[3 * i + 1], yj = P[3 * j + 1];
    const t = (h - yi) / (yj - yi);
    return [P[3 * i] + t * (P[3 * j] - P[3 * i]), P[3 * i + 2] + t * (P[3 * j + 2] - P[3 * i + 2])];
  };
  // adjacency between crossing edges (each triangle that crosses links two of its edges)
  const next = new Map<number, number[]>();
  const point = new Map<number, [number, number]>();
  const link = (k1: number, k2: number) => {
    (next.get(k1) ?? next.set(k1, []).get(k1)!).push(k2);
    (next.get(k2) ?? next.set(k2, []).get(k2)!).push(k1);
  };
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    const above = v.map((i) => P[3 * i + 1] > h);
    if (above[0] === above[1] && above[1] === above[2]) continue;
    const ks: number[] = [];
    for (let e = 0; e < 3; e++) {
      const i = v[e], j = v[(e + 1) % 3];
      if (above[e] === above[(e + 1) % 3]) continue;
      const k = edgeKey(i, j);
      if (!point.has(k)) point.set(k, cut(i, j));
      ks.push(k);
    }
    if (ks.length === 2) link(ks[0], ks[1]);
  }
  const seen = new Set<number>();
  const loops: [number, number][][] = [];
  for (const k0 of point.keys()) {
    if (seen.has(k0)) continue;
    const loop: [number, number][] = [];
    let prev = -1, cur = k0;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      loop.push(point.get(cur)!);
      const nb = next.get(cur) ?? [];
      const nxt = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur;
      cur = nxt;
    }
    if (loop.length >= 8) loops.push(loop);
  }
  return loops;
}

const loopArea = (L: readonly [number, number][]) => {
  let a = 0;
  for (let i = 0; i < L.length; i++) {
    const p = L[i], q = L[(i + 1) % L.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};

/** The torso loop at height h: the largest loop whose x-range contains the midline. */
function torsoLoop(P: Float32Array, I: Uint32Array, h: number, xMid: number): [number, number][] {
  const loops = sliceLoops(P, I, h).filter((L) => {
    let lo = Infinity, hi = -Infinity;
    for (const p of L) {
      lo = Math.min(lo, p[0]);
      hi = Math.max(hi, p[0]);
    }
    return lo < xMid && hi > xMid;
  });
  if (!loops.length) throw new Error(`no torso cross-section at y = ${h.toFixed(1)} cm`);
  return loops.reduce((a, b) => (Math.abs(loopArea(b)) > Math.abs(loopArea(a)) ? b : a));
}

/** Most anterior (max z) crossing of the loop with the vertical line x = X. */
function anteriorAt(L: readonly [number, number][], X: number): number {
  let best = -Infinity;
  for (let i = 0; i < L.length; i++) {
    const p = L[i], q = L[(i + 1) % L.length];
    if ((p[0] - X) * (q[0] - X) > 0 || p[0] === q[0]) continue;
    const t = (X - p[0]) / (q[0] - p[0]);
    best = Math.max(best, p[1] + t * (q[1] - p[1]));
  }
  if (best === -Infinity) throw new Error('vertical line misses the torso contour');
  return best;
}

const centroid = (L: readonly [number, number][]): [number, number] => {
  let x = 0, z = 0;
  for (const p of L) {
    x += p[0];
    z += p[1];
  }
  return [x / L.length, z / L.length];
};

/** Farthest crossing of the ray from c at angle θ (in the x–z plane) with the loop. */
function rayAt(L: readonly [number, number][], c: [number, number], theta: number): [number, number] {
  const dx = Math.cos(theta), dz = Math.sin(theta);
  let bestT = -1;
  for (let i = 0; i < L.length; i++) {
    const p = L[i], q = L[(i + 1) % L.length];
    const ex = q[0] - p[0], ez = q[1] - p[1];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((p[0] - c[0]) * ez - (p[1] - c[1]) * ex) / den;
    const u = ((p[0] - c[0]) * dz - (p[1] - c[1]) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) bestT = Math.max(bestT, t);
  }
  if (bestT < 0) throw new Error('ray misses the torso contour');
  return [c[0] + bestT * dx, c[1] + bestT * dz];
}

function nearestNormal(P: Float32Array, N: Float32Array, p: Vec3): Vec3 {
  let best = 0, bd = Infinity;
  for (let i = 0; i < P.length; i += 3) {
    const d = (P[i] - p[0]) ** 2 + (P[i + 1] - p[1]) ** 2 + (P[i + 2] - p[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return [N[best], N[best + 1], N[best + 2]];
}

/**
 * @param skinGlb   raw HRA skin GLB (metres, body frame)
 * @param originMm  heart local origin in body mm (the HRA heart frame origin)
 * @param apexCm    cardiac apex in the app frame (cm)
 */
export function buildBodyModel(skinGlb: Uint8Array, originMm: Vec3, apexCm: Vec3): BodyModel {
  const raw = readGlbMeshes(skinGlb, (n) => n.includes('skin'))[0];
  if (!raw) throw new Error('skin mesh not found');
  const welded = weldMesh(raw, 1e-7);
  const P = new Float32Array(welded.position.length);
  for (let i = 0; i < P.length; i += 3) {
    P[i] = (welded.position[i] * 1000 - originMm[0]) / 10;
    P[i + 1] = (welded.position[i + 1] * 1000 - originMm[1]) / 10;
    P[i + 2] = (welded.position[i + 2] * 1000 - originMm[2]) / 10;
  }
  const I = Uint32Array.from(welded.index);
  const N = computeNormals(P, I);

  const xMid = -originMm[0] / 10; // body midline x = 0 m
  const y5 = apexCm[1] + 0.5;
  const y4 = y5 + ICS_SPACING_CM;
  const xMcl = Math.min(xMid + 11, Math.max(xMid + 9, apexCm[0]));
  const on = (L: [number, number][], x: number, y: number): Vec3 => [x, y, anteriorAt(L, x)];
  const L4 = torsoLoop(P, I, y4, xMid);
  const L5 = torsoLoop(P, I, y5, xMid);
  const L35 = torsoLoop(P, I, (y4 + y5) / 2, xMid);
  const V1 = on(L4, xMid - STERNAL_BORDER_CM, y4);
  const V2 = on(L4, xMid + STERNAL_BORDER_CM, y4);
  const V4 = on(L5, xMcl, y5);
  const V3 = on(L35, (V2[0] + V4[0]) / 2, (y4 + y5) / 2);
  // Mid-axillary line. In the Visible Human the arms rest against the chest, so at the V4 level arm and trunk form one
  // merged cross-section. Find the highest level below V4 where the left arm is a separate contour; the trunk's lateral
  // edge there gives the mid-axillary line (x) and the chest's mid-depth (z).
  const lateral = (() => {
    for (let y = y5 - 1; y > y5 - 25; y -= 1) {
      const loops = sliceLoops(P, I, y);
      const trunk = loops.filter((L) => L.some((p) => p[0] < xMid) && L.some((p) => p[0] > xMid));
      if (!trunk.length) continue;
      const T = trunk.reduce((a, b) => (Math.abs(loopArea(b)) > Math.abs(loopArea(a)) ? b : a));
      let maxX = -Infinity;
      for (const p of T) maxX = Math.max(maxX, p[0]);
      if (maxX - xMid > TORSO_HALF_WIDTH_CM) continue; // still merged with the arm
      const c = centroid(T);
      const q = rayAt(T, c, 0);
      return { x: q[0], z: q[1], y };
    }
    throw new Error('no level with a separate left arm below V4');
  })();
  const V6: Vec3 = [lateral.x, y5, lateral.z];
  // anterior axillary line: three quarters of the way from the midclavicular to the mid-axillary line, on the
  // anterior chest surface
  const x5 = V4[0] + 0.75 * (lateral.x - V4[0]);
  const V5 = on(L5, x5, y5);

  // limbs: wrists ≈ 19 cm above the fingertips, ankles ≈ 8 cm above the soles; anterior-most skin point in the band
  let yMin = Infinity, yMax = -Infinity;
  for (let i = 1; i < P.length; i += 3) {
    yMin = Math.min(yMin, P[i]);
    yMax = Math.max(yMax, P[i]);
  }
  const bandPoint = (pick: (x: number) => boolean, level: (lo: number) => number, yLimit: number): Vec3 => {
    let lo = Infinity;
    for (let i = 0; i < P.length; i += 3) if (pick(P[i]) && P[i + 1] < yLimit) lo = Math.min(lo, P[i + 1]);
    const yb = level(lo);
    let best: Vec3 | null = null;
    for (let i = 0; i < P.length; i += 3) {
      if (!pick(P[i]) || Math.abs(P[i + 1] - yb) > 1.2) continue;
      if (!best || P[i + 2] > best[2]) best = [P[i], P[i + 1], P[i + 2]];
    }
    if (!best) throw new Error('limb electrode site not found');
    return best;
  };
  // arms: beyond the torso half-width and above the knees (the feet can stand wider than the trunk)
  const kneeY = yMin + 55;
  const armMinY = (side: 1 | -1) => {
    let lo = Infinity;
    for (let i = 0; i < P.length; i += 3) if (side * (P[i] - xMid) > TORSO_HALF_WIDTH_CM && P[i + 1] > kneeY) lo = Math.min(lo, P[i + 1]);
    return lo;
  };
  const armBand = (side: 1 | -1): Vec3 => {
    const yb = armMinY(side) + 19;
    let best: Vec3 | null = null;
    for (let i = 0; i < P.length; i += 3) {
      if (side * (P[i] - xMid) <= TORSO_HALF_WIDTH_CM || Math.abs(P[i + 1] - yb) > 1.2) continue;
      if (!best || P[i + 2] > best[2]) best = [P[i], P[i + 1], P[i + 2]];
    }
    if (!best) throw new Error('wrist site not found');
    return best;
  };
  const RA = armBand(-1);
  const LA = armBand(1);
  const RL = bandPoint((x) => x < xMid - 3 && x > xMid - 30, (lo) => lo + 8, kneeY);
  const LL = bandPoint((x) => x > xMid + 3 && x < xMid + 30, (lo) => lo + 8, kneeY);

  const sites: Record<ElectrodeId, Vec3> = { RA, LA, RL, LL, V1, V2, V3, V4, V5, V6 };
  const electrodes = {} as Record<ElectrodeId, { pos: Vec3; normal: Vec3 }>;
  for (const id of Object.keys(sites) as ElectrodeId[]) electrodes[id] = { pos: sites[id], normal: nearestNormal(P, N, sites[id]) };
  // V6 sits on the lateral chest wall under the resting arm: its nearest skin vertex may be the arm's inner surface
  electrodes.V6 = { pos: V6, normal: [1, 0, 0] };

  // landmark lines (slightly lifted off the skin)
  const lift = (p: Vec3): Vec3 => {
    const n = nearestNormal(P, N, p);
    return [p[0] + 0.15 * n[0], p[1] + 0.15 * n[1], p[2] + 0.15 * n[2]];
  };
  const vertical = (f: (L: [number, number][], y: number) => Vec3, ya: number, yb: number): Vec3[] => {
    const pts: Vec3[] = [];
    for (let y = ya; y <= yb + 1e-6; y += 1) {
      try {
        pts.push(lift(f(torsoLoop(P, I, y, xMid), y)));
      } catch {
        /* contour gap: skip this level */
      }
    }
    return pts;
  };
  const frontArc = (L: [number, number][], y: number): Vec3[] => {
    const pts: Vec3[] = [];
    for (let k = 0; k <= 30; k++) {
      const x = xMid - 5 + ((x5 - (xMid - 5)) * k) / 30;
      pts.push(lift([x, y, anteriorAt(L, x)]));
    }
    pts.push([lateral.x + 0.15, y, lateral.z]); // on to the mid-axillary line (under the resting arm)
    return pts;
  };
  const guides: { id: BodyGuideId; points: Vec3[] }[] = [
    { id: 'midsternal', points: vertical((L, y) => on(L, xMid, y), y5 - 6, y4 + 11) },
    { id: 'midclavicular', points: vertical((L, y) => on(L, xMcl, y), y5 - 7, y4 + 9) },
    { id: 'anteriorAxillary', points: vertical((L, y) => on(L, x5, y), y5 - 7, y4 + 5) },
    {
      id: 'midAxillary',
      points: Array.from({ length: 13 }, (_, k): Vec3 => [lateral.x + 0.15, y5 - 7 + k, lateral.z]),
    },
    { id: 'ics4', points: frontArc(L4, y4) },
    { id: 'ics5', points: frontArc(L5, y5) },
  ];

  // framing: chest view covers V1–V6 and the wrists; full view covers the whole body
  const chestPts: Vec3[] = [V1, V2, V3, V4, V5, V6, RA, LA, [0, 0, 0]];
  const cc: Vec3 = [xMid + 2, (y5 + RA[1]) / 2 + 4, 0];
  let r = 0;
  for (const p of chestPts) r = Math.max(r, Math.hypot(p[0] - cc[0], p[1] - cc[1], p[2] - cc[2]));
  const full = { center: [xMid, (yMin + yMax) / 2, 0] as Vec3, radius: (yMax - yMin) / 2 + 4 };
  return {
    skin: { position: P, normal: N, index: I },
    electrodes,
    guides,
    views: { chest: { center: cc, radius: r * 1.08 }, full },
    credit: SKIN_CREDIT,
  };
}

// ---------------------------------------------------------------- compact codec (gzip applied by the caller)

const MAGIC = 'BDY1';

export function encodeBodyModel(b: BodyModel): Uint8Array {
  const P = b.skin.position, N = b.skin.normal, I = b.skin.index;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], P[i + k]);
      hi[k] = Math.max(hi[k], P[i + k]);
    }
  const step = hi.map((h, k) => (h - lo[k]) / 65535 || 1);
  const header = JSON.stringify({ lo, step, nv: P.length / 3, ni: I.length, electrodes: b.electrodes, guides: b.guides, views: b.views, credit: b.credit });
  const hb = new TextEncoder().encode(header);
  const nv = P.length / 3;
  const size = 4 + 4 + hb.length + nv * 6 + nv * 3 + I.length * 4;
  const out = new Uint8Array(size + ((4 - (size % 4)) % 4));
  const dv = new DataView(out.buffer);
  out.set(new TextEncoder().encode(MAGIC), 0);
  dv.setUint32(4, hb.length, true);
  out.set(hb, 8);
  let o = 8 + hb.length;
  for (let i = 0; i < P.length; i++, o += 2) dv.setUint16(o, Math.round((P[i] - lo[i % 3]) / step[i % 3]), true);
  for (let i = 0; i < N.length; i++, o += 1) dv.setInt8(o, Math.max(-127, Math.min(127, Math.round(N[i] * 127))));
  // delta-coded indices compress far better under gzip
  let prev = 0;
  for (let i = 0; i < I.length; i++, o += 4) {
    dv.setInt32(o, I[i] - prev, true);
    prev = I[i];
  }
  return out.subarray(0, o);
}

export function decodeBodyModel(bytes: Uint8Array): BodyModel {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== MAGIC) throw new Error('not a body asset');
  const hl = dv.getUint32(4, true);
  const h = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + hl))) as {
    lo: number[]; step: number[]; nv: number; ni: number;
    electrodes: BodyModel['electrodes']; guides: BodyModel['guides']; views: BodyModel['views']; credit: ModelCredit;
  };
  let o = 8 + hl;
  const P = new Float32Array(h.nv * 3);
  for (let i = 0; i < P.length; i++, o += 2) P[i] = h.lo[i % 3] + dv.getUint16(o, true) * h.step[i % 3];
  const N = new Float32Array(h.nv * 3);
  for (let i = 0; i < N.length; i++, o += 1) N[i] = dv.getInt8(o) / 127;
  const I = new Uint32Array(h.ni);
  let prev = 0;
  for (let i = 0; i < I.length; i++, o += 4) {
    prev += dv.getInt32(o, true);
    I[i] = prev;
  }
  return { skin: { position: P, normal: N, index: I }, electrodes: h.electrodes, guides: h.guides, views: h.views, credit: h.credit };
}

async function gunzip(gz: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([gz as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Loads the baked body (base64 data URL inlined by Vite — decoded without fetch, which the Artifact CSP blocks). */
export async function loadHraBody(gz?: Uint8Array): Promise<BodyModel> {
  let packed = gz;
  if (!packed) {
    const { default: url } = await import('../../../assets/body-hra.bin?url&inline');
    const comma = url.indexOf(',');
    const bin = atob(url.slice(comma + 1));
    packed = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) packed[i] = bin.charCodeAt(i);
  }
  return decodeBodyModel(await gunzip(packed));
}
