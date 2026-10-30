#!/usr/bin/env node
/**
 * Bakes the small 3D heart asset src/assets/heart.bin from the HRA 3D Reference Organ "Heart, Male" v1.3
 * (Browne K, Schlehlein H — Human Reference Atlas / HuBMAP, Visible Human male; CC BY 4.0,
 * https://doi.org/10.48539/HBM564.WKNG.249). Node only, no dependencies, deterministic (no randomness).
 *
 *   node scripts/bake-heart.mjs [--in assets-raw/hra/3d-vh-m-heart.glb] [--out src/assets/heart.bin] [--report file.json]
 *
 * Pipeline
 *   1. read the GLB (JSON + BIN chunks, node transforms), weld duplicate vertices; keep the five myocardial walls
 *      (LV, RV, interventricular septum, LA, RA), the four valve meshes (landmarks only) and the papillary muscles
 *      (landmarks only). The RA and LA meshes already carry the caval and pulmonary-vein orifices.
 *   2. heart frame from the meshes (body orientation is kept: +x patient left, +y superior, +z anterior, mm):
 *      origin = area centroid of the ventricular walls; base = mitral annulus centre; apex = LV vertex farthest from
 *      the mitral/aortic annulus plane on the ventricular side; long axis u = apex → base; septal direction s = from
 *      the LV long axis toward the septum centroid (⊥ u); anterior a = ±(s × u), the sign that points superior
 *      (the inferior wall faces the diaphragm).
 *   3. decimation by vertex clustering (key = part + cubic cell + dominant normal octant so both faces of a thin wall
 *      never merge), cell size bisected to land in the triangle budget; degenerate, duplicate and back-to-back
 *      triangles dropped; normals are recomputed at runtime from the decimated mesh.
 *   4. labels: every vertex gets a region (src/core/regions.ts ids): RA, LA; LV free wall and septum → AHA 17
 *      segments (long-axis level from the apex cap and thirds of the cavity length; circumferential sector from the
 *      septal direction: 60° sectors at basal/mid, 90° at apical); RV free wall → outflow tract (closer to the
 *      pulmonary than to the tricuspid annulus, upper half) or basal / mid / apical thirds.
 *   5. great-vessel stubs (procedural, not in the source model): ascending aorta and pulmonary trunk as short tubes
 *      on the aortic and pulmonary annuli, for orientation.
 *   6. conduction system placed by this project as anatomical polylines (not part of the HRA model): SA node at the
 *      anterolateral RA–SVC junction along the terminal crest, AV node in Koch's triangle, His bundle through the
 *      central fibrous body to the septal crest, left bundle on the left septal surface splitting into the anterior
 *      (→ anterolateral papillary muscle) and posterior (→ posteromedial papillary muscle) fascicles, right bundle down
 *      the right septal surface to the moderator band and the anterior papillary muscle of the RV, and a sparse
 *      Purkinje fan. Points are snapped to the endocardial surface of the full-resolution walls.
 *   7. encode (format below).
 *
 * Binary format "ECGH" v1 (little-endian; decoder: src/heart3d/format.ts)
 *   0   char[4]  magic "ECGH"
 *   4   u32      version (1)
 *   8   u32      J = byte length of the JSON header (UTF-8, space-padded to a multiple of 4)
 *   12  JSON     header: counts, bbox, label table, polyline table, frame, anchors, landmarks, credit, changes
 *   12+J body, every section padded to 4 bytes:
 *        positions  u16[3·V]   p = bbox.min + q / 65535 · (bbox.max − bbox.min)   (mm, app frame)
 *        labels     u8[V]      index into header.labels (RegionIds, then 'aorta', 'pulmonary-trunk')
 *        indices    u16[3·T]   (u32 when header.indexBits = 32), counter-clockwise = outward
 *        polyline   u16[3·P]   points of all polylines, same quantization; header.polylines[i] = {label, kind, start, count}
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ------------------------------------------------------------------------------------------------ constants

export const REGION_IDS = [
  'ra', 'la',
  'lv-basal-anterior', 'lv-basal-anteroseptal', 'lv-basal-inferoseptal', 'lv-basal-inferior', 'lv-basal-inferolateral', 'lv-basal-anterolateral',
  'lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-mid-inferoseptal', 'lv-mid-inferior', 'lv-mid-inferolateral', 'lv-mid-anterolateral',
  'lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apical-lateral', 'lv-apex',
  'rv-outflow', 'rv-basal', 'rv-mid', 'rv-apical',
  'sa-node', 'av-node', 'his', 'rbb', 'lbb', 'laf', 'lpf', 'purkinje',
];
export const EXTRA_LABELS = ['aorta', 'pulmonary-trunk'];
export const LABELS = [...REGION_IDS, ...EXTRA_LABELS];
const LI = Object.fromEntries(LABELS.map((id, i) => [id, i]));

export const CREDIT = {
  title: 'HRA 3D Reference Organ — Heart, Male (VH_M_Heart) v1.3',
  creators: 'Browne K, Schlehlein H (Human Reference Atlas, HuBMAP); Visible Human Project male data (NLM)',
  doi: 'https://doi.org/10.48539/HBM564.WKNG.249',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

export const CHANGES = [
  'Kept the five myocardial walls (left and right ventricles, interventricular septum, left and right atria); valve leaflets and papillary muscles are used only as landmarks and are not shipped.',
  'Welded duplicate vertices, moved the model to millimetres in a heart-centred frame (origin at the ventricular centroid, body orientation kept) and decimated it by vertex clustering to about 20,000 triangles.',
  'Labelled every vertex with an anatomical region (AHA 17-segment left ventricle, right-ventricular outflow tract and basal/mid/apical free wall, right and left atria).',
  'Added short procedural stubs of the ascending aorta and the pulmonary trunk on the valve annuli for orientation (not part of the source model).',
  'Added a schematic conduction system (sinus node, AV node, His bundle, bundle branches, fascicles, Purkinje fan) placed on the anatomy by this project (not part of the source model).',
];

const PART = { LV: 0, RV: 1, SEPTUM: 2, LA: 3, RA: 4 };
const WALL_NODES = {
  LV: 'VH_M_heart_left_ventricle',
  RV: 'VH_M_heart_right_ventricle',
  SEPTUM: 'VH_M_interventricular_septum',
  LA: 'VH_M_left_cardiac_atrium',
  RA: 'VH_M_right_cardiac_atrium',
};
const VALVE_NODES = { MITRAL: 'VH_M_mitral_valve', TRICUSPID: 'VH_M_tricuspid_valve', AORTIC: 'VH_M_aortic_valve', PULMONARY: 'VH_M_pulmonary_valve' };
const PAP_NODES = {
  lvAnterolateral: 'VH_M_papillary_muscle_of_heart_anterolateral',
  lvPosteromedial: 'VH_M_papillary_muscle_of_heart_posteromedial',
  rvAnterior: 'VH_M_papillary_muscle_of_heart_anterior',
};

// ------------------------------------------------------------------------------------------------ vector helpers

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const normalize = (a) => scale(a, 1 / (len(a) || 1));
const lerp = (a, b, t) => add(a, scale(sub(b, a), t));
const dist = (a, b) => len(sub(a, b));
const perp = (v, axis) => sub(v, scale(axis, dot(v, axis)));
const vAt = (P, i) => [P[3 * i], P[3 * i + 1], P[3 * i + 2]];

// ------------------------------------------------------------------------------------------------ GLB reader

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

export function parseGlb(data) {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('GLB: bad magic');
  if (dv.getUint32(4, true) !== 2) throw new Error('GLB: unsupported version');
  let off = 12, json = null, bin = null;
  while (off + 8 <= data.byteLength) {
    const n = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    const body = data.subarray(off + 8, off + 8 + n);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(body));
    else if (type === 0x004e4942) bin = new DataView(body.buffer, body.byteOffset, body.byteLength);
    off += 8 + n;
  }
  if (!json || !bin) throw new Error('GLB: missing JSON or BIN chunk');
  return { json, bin };
}

function readAccessor(json, bin, index) {
  const a = json.accessors[index];
  const comps = COMPONENTS[a.type];
  const out = new Float64Array(a.count * comps);
  if (a.bufferView === undefined) return out;
  const bv = json.bufferViews[a.bufferView];
  const size = BYTES[a.componentType];
  const stride = bv.byteStride ?? size * comps;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const norm = a.normalized === true;
  for (let i = 0; i < a.count; i++)
    for (let c = 0; c < comps; c++) {
      const o = base + i * stride + c * size;
      let x;
      switch (a.componentType) {
        case 5120: x = bin.getInt8(o); if (norm) x = Math.max(x / 127, -1); break;
        case 5121: x = bin.getUint8(o); if (norm) x /= 255; break;
        case 5122: x = bin.getInt16(o, true); if (norm) x = Math.max(x / 32767, -1); break;
        case 5123: x = bin.getUint16(o, true); if (norm) x /= 65535; break;
        case 5125: x = bin.getUint32(o, true); break;
        default: x = bin.getFloat32(o, true);
      }
      out[i * comps + c] = x;
    }
  return out;
}

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul4(a, b) {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) for (let k = 0; k < 4; k++) r[c * 4 + rr] += a[k * 4 + rr] * b[c * 4 + k];
  return r;
}
function localMatrix(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
  return [
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

/** Every TRIANGLES mesh node of the default scene in the scene frame (metres for HRA), by node name. */
export function readGlbMeshes(data) {
  const { json, bin } = parseGlb(data);
  const out = new Map();
  const roots = json.scenes?.[json.scene ?? 0]?.nodes ?? json.nodes.map((_, i) => i);
  const visit = (ni, parent) => {
    const n = json.nodes[ni];
    const m = mul4(parent, localMatrix(n));
    if (n.mesh !== undefined) {
      const pos = [], idx = [];
      for (const p of json.meshes[n.mesh].primitives) {
        if ((p.mode ?? 4) !== 4) continue;
        const P = readAccessor(json, bin, p.attributes.POSITION);
        const base = pos.length / 3;
        for (let i = 0; i < P.length; i += 3) {
          const x = P[i], y = P[i + 1], z = P[i + 2];
          pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        }
        if (p.indices !== undefined) {
          const I = readAccessor(json, bin, p.indices);
          for (let i = 0; i < I.length; i++) idx.push(base + I[i]);
        } else for (let i = 0; i < P.length / 3; i++) idx.push(base + i);
      }
      const det = m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
      if (det < 0) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
      out.set(n.name ?? `node${ni}`, { position: Float64Array.from(pos), index: Uint32Array.from(idx) });
    }
    for (const c of n.children ?? []) visit(c, m);
  };
  for (const r of roots) visit(r, IDENT);
  return out;
}

// ------------------------------------------------------------------------------------------------ mesh utilities

/** Merges vertices closer than tol (grid hash with neighbour search) and drops degenerate / duplicate faces. */
export function weldMesh(m, tol) {
  const P = m.position, n = P.length / 3, inv = 1 / tol;
  const cells = new Map(), remap = new Uint32Array(n), pos = [];
  for (let v = 0; v < n; v++) {
    const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    const cx = Math.round(x * inv), cy = Math.round(y * inv), cz = Math.round(z * inv);
    let found = -1;
    for (let dx = -1; dx <= 1 && found < 0; dx++)
      for (let dy = -1; dy <= 1 && found < 0; dy++)
        for (let dz = -1; dz <= 1 && found < 0; dz++) {
          const list = cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!list) continue;
          for (const w of list)
            if (Math.abs(pos[3 * w] - x) <= tol && Math.abs(pos[3 * w + 1] - y) <= tol && Math.abs(pos[3 * w + 2] - z) <= tol) {
              found = w;
              break;
            }
        }
    if (found < 0) {
      found = pos.length / 3;
      pos.push(x, y, z);
      const k = `${cx},${cy},${cz}`;
      const list = cells.get(k);
      if (list) list.push(found);
      else cells.set(k, [found]);
    }
    remap[v] = found;
  }
  const idx = cleanTriangles(Float64Array.from(pos), Array.from(m.index, (i) => remap[i]), tol * tol * 1e-6);
  return { position: Float64Array.from(pos), index: Uint32Array.from(idx) };
}

/** Drops triangles with repeated vertices, (near-)zero area, duplicates, and back-to-back pairs (same vertex set, opposite winding). */
function cleanTriangles(pos, idx, minArea2 = 1e-12) {
  const seen = new Map();
  const keep = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (a === b || b === c || a === c) continue;
    const n = cross(sub(vAt(pos, b), vAt(pos, a)), sub(vAt(pos, c), vAt(pos, a)));
    if (dot(n, n) <= minArea2) continue;
    const key = [a, b, c].sort((p, q) => p - q).join(',');
    // orientation parity: even permutation of the sorted triple = +1
    const s = [a, b, c];
    const m = s.indexOf(Math.min(a, b, c));
    const r = [s[m], s[(m + 1) % 3], s[(m + 2) % 3]];
    const parity = r[1] < r[2] ? 1 : -1;
    const prev = seen.get(key);
    if (prev === undefined) {
      seen.set(key, { parity, at: keep.length });
      keep.push([a, b, c]);
    } else if (prev.parity !== parity && keep[prev.at]) {
      keep[prev.at] = null; // back-to-back: both faces of a collapsed sliver — drop both
    }
  }
  const out = [];
  for (const k of keep) if (k) out.push(k[0], k[1], k[2]);
  return out;
}

/** Area-weighted vertex normals. */
export function vertexNormals(pos, idx) {
  const n = new Float64Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = 3 * idx[t], b = 3 * idx[t + 1], c = 3 * idx[t + 2];
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) {
      n[p] += nx;
      n[p + 1] += ny;
      n[p + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

function signedVolume(pos, idx) {
  let s = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = vAt(pos, idx[t]), b = vAt(pos, idx[t + 1]), c = vAt(pos, idx[t + 2]);
    s += dot(a, cross(b, c));
  }
  return s / 6;
}

/** Makes a closed mesh wind outward (positive signed volume). */
function outward(m) {
  if (signedVolume(m.position, m.index) >= 0) return m;
  const idx = Uint32Array.from(m.index);
  for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  return { position: m.position, index: idx };
}

function areaCentroid(meshes) {
  let s = [0, 0, 0], w = 0;
  for (const m of meshes)
    for (let t = 0; t < m.index.length; t += 3) {
      const a = vAt(m.position, m.index[t]), b = vAt(m.position, m.index[t + 1]), c = vAt(m.position, m.index[t + 2]);
      const ar = len(cross(sub(b, a), sub(c, a))) / 2;
      s = add(s, scale(add(add(a, b), c), ar / 3));
      w += ar;
    }
  return scale(s, 1 / w);
}

function centroid(P) {
  let x = 0, y = 0, z = 0;
  const n = P.length / 3;
  for (let i = 0; i < P.length; i += 3) {
    x += P[i];
    y += P[i + 1];
    z += P[i + 2];
  }
  return [x / n, y / n, z / n];
}

/** Symmetric 3×3 eigen-decomposition (Jacobi); eigenvalues ascending with unit eigenvectors. */
function eigSym3(c) {
  const a = [[c[0], c[1], c[2]], [c[1], c[3], c[4]], [c[2], c[4], c[5]]];
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < 2; p++) for (let q = p + 1; q < 3; q++) off += a[p][q] * a[p][q];
    if (off < 1e-24) break;
    for (let p = 0; p < 2; p++)
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
        for (let k = 0; k < 3; k++) {
          const x = a[k][p], y = a[k][q];
          a[k][p] = cs * x - sn * y;
          a[k][q] = sn * x + cs * y;
        }
        for (let k = 0; k < 3; k++) {
          const x = a[p][k], y = a[q][k];
          a[p][k] = cs * x - sn * y;
          a[q][k] = sn * x + cs * y;
        }
        for (let k = 0; k < 3; k++) {
          const x = v[k][p], y = v[k][q];
          v[k][p] = cs * x - sn * y;
          v[k][q] = sn * x + cs * y;
        }
      }
  }
  const order = [0, 1, 2].sort((i, j) => a[i][i] - a[j][j]);
  return { values: order.map((i) => a[i][i]), vectors: order.map((i) => [v[0][i], v[1][i], v[2][i]]) };
}

function pca(points) {
  const c = centroid(points);
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  const n = points.length / 3;
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i] - c[0], y = points[i + 1] - c[1], z = points[i + 2] - c[2];
    xx += x * x;
    xy += x * y;
    xz += x * z;
    yy += y * y;
    yz += y * z;
    zz += z * z;
  }
  return { centroid: c, ...eigSym3([xx / n, xy / n, xz / n, yy / n, yz / n, zz / n]) };
}

/** Uniform-grid point index for nearest-vertex queries. */
class PointIndex {
  constructor(pos, cellMm = 4) {
    this.pos = pos;
    this.h = cellMm;
    this.cells = new Map();
    for (let i = 0; i < pos.length / 3; i++) {
      const k = this.key(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
      const l = this.cells.get(k);
      if (l) l.push(i);
      else this.cells.set(k, [i]);
    }
  }
  key(x, y, z) {
    return `${Math.floor(x / this.h)},${Math.floor(y / this.h)},${Math.floor(z / this.h)}`;
  }
  /** Nearest vertex satisfying pred within maxMm (−1 if none). */
  nearest(p, pred = () => true, maxMm = 40) {
    const h = this.h, r = Math.ceil(maxMm / h);
    const ci = Math.floor(p[0] / h), cj = Math.floor(p[1] / h), ck = Math.floor(p[2] / h);
    let best = -1, bd = maxMm * maxMm;
    for (let ring = 0; ring <= r; ring++) {
      // early exit: everything in further rings is at least (ring − 1)·h away
      if (best >= 0 && ((ring - 1) * h) ** 2 > bd) break;
      for (let di = -ring; di <= ring; di++)
        for (let dj = -ring; dj <= ring; dj++)
          for (let dk = -ring; dk <= ring; dk++) {
            if (Math.max(Math.abs(di), Math.abs(dj), Math.abs(dk)) !== ring) continue;
            const l = this.cells.get(`${ci + di},${cj + dj},${ck + dk}`);
            if (!l) continue;
            for (const i of l) {
              const d = (this.pos[3 * i] - p[0]) ** 2 + (this.pos[3 * i + 1] - p[1]) ** 2 + (this.pos[3 * i + 2] - p[2]) ** 2;
              if (d < bd && pred(i)) {
                bd = d;
                best = i;
              }
            }
          }
    }
    return best;
  }
}

// ------------------------------------------------------------------------------------------------ source + frame

const M_TO_MM = 1000;

function loadSource(glb) {
  const nodes = readGlbMeshes(glb);
  const get = (name) => {
    const m = nodes.get(name);
    if (!m) throw new Error(`HRA heart: node ${name} not found`);
    const mm = { position: m.position.map((x) => x * M_TO_MM), index: m.index };
    return weldMesh(mm, 0.01);
  };
  const walls = Object.fromEntries(Object.entries(WALL_NODES).map(([k, n]) => [k, outward(get(n))]));
  const valves = Object.fromEntries(Object.entries(VALVE_NODES).map(([k, n]) => [k, get(n)]));
  const papillary = Object.fromEntries(Object.entries(PAP_NODES).map(([k, n]) => [k, get(n)]));
  return { walls, valves, papillary };
}

/** Valve-mesh vertices within bandMm of a wall mesh → annulus centre / normal / radius (normal oriented toward `toward`). */
function annulus(valve, walls, toward, bandMm = 3) {
  const pts = [];
  const idx = walls.map((w) => new PointIndex(w.position, 4));
  for (let i = 0; i < valve.position.length / 3; i++) {
    const p = vAt(valve.position, i);
    if (idx.some((ix, k) => ix.nearest(p, () => true, bandMm) >= 0 && walls[k])) pts.push(...p);
  }
  const P = pts.length >= 30 ? pts : Array.from(valve.position);
  const pc = pca(P);
  let n = pc.vectors[0];
  if (dot(n, sub(toward, pc.centroid)) < 0) n = scale(n, -1);
  const radii = [];
  for (let i = 0; i < P.length; i += 3) radii.push(len(perp(sub(vAt(P, i / 3), pc.centroid), n)));
  radii.sort((a, b) => a - b);
  return { center: pc.centroid, normal: n, radius: radii[Math.floor(radii.length * 0.75)], band: P };
}

/** Ring polyline of an annulus: for each angle, the band point farthest from the centre in that direction. */
function ringPolyline(ann, nPts = 40) {
  const n = ann.normal;
  const e1 = normalize(perp(Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], n));
  const e2 = cross(n, e1);
  const out = [];
  for (let k = 0; k < nPts; k++) {
    const th = (2 * Math.PI * k) / nPts;
    const d = add(scale(e1, Math.cos(th)), scale(e2, Math.sin(th)));
    let best = null, bs = -Infinity;
    for (let i = 0; i < ann.band.length; i += 3) {
      const q = sub(vAt(ann.band, i / 3), ann.center);
      const qp = perp(q, n);
      const r = len(qp);
      if (r < 1e-6) continue;
      const c = dot(qp, d) / r;
      if (c < Math.cos(Math.PI / nPts) * 0.98) continue;
      const s = r - 0.3 * Math.abs(dot(q, n));
      if (s > bs) {
        bs = s;
        best = add(ann.center, add(qp, scale(n, dot(q, n))));
      }
    }
    out.push(best ?? add(ann.center, scale(d, ann.radius)));
  }
  // light circular smoothing
  return out.map((p, i) => scale(add(add(out[(i + nPts - 1) % nPts], scale(p, 2)), out[(i + 1) % nPts]), 0.25));
}

export function computeFrame(src) {
  const { walls, valves } = src;
  const ventC = areaCentroid([walls.LV, walls.RV, walls.SEPTUM]);
  const lvC = centroid(walls.LV.position);
  const mitral = annulus(valves.MITRAL, [walls.LV, walls.LA], lvC);
  const aorticPts = Array.from(valves.AORTIC.position);
  const plane = pca([...mitral.band, ...aorticPts]);
  let pn = plane.vectors[0];
  if (dot(pn, sub(lvC, plane.centroid)) < 0) pn = scale(pn, -1);
  const lv = walls.LV.position;
  let apex = lvC, best = -Infinity;
  for (let i = 0; i < lv.length; i += 3) {
    const p = vAt(lv, i / 3);
    const d = dot(sub(p, plane.centroid), pn);
    if (d > best) {
      best = d;
      apex = p;
    }
  }
  const base = mitral.center;
  const u = normalize(sub(base, apex));
  const septC = areaCentroid([walls.SEPTUM]);
  const s = normalize(perp(sub(septC, apex), u));
  let a = normalize(cross(s, u));
  if (a[1] < 0) a = scale(a, -1);
  return { origin: ventC, apex, base, u, s, a, mitral };
}

// ------------------------------------------------------------------------------------------------ decimation

function octant(n) {
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
  if (ax >= ay && ax >= az) return n[0] >= 0 ? 0 : 1;
  if (ay >= az) return n[1] >= 0 ? 2 : 3;
  return n[2] >= 0 ? 4 : 5;
}

/** Vertex clustering of each part; returns merged arrays (positions, per-vertex part, cluster normals, indices). */
export function clusterParts(parts, cellMm) {
  const pos = [], nrm = [], part = [], idx = [];
  for (const { mesh, partId } of parts) {
    const N = vertexNormals(mesh.position, mesh.index);
    const nv = mesh.position.length / 3;
    const map = new Map(), remap = new Int32Array(nv);
    const acc = [];
    for (let v = 0; v < nv; v++) {
      const p = vAt(mesh.position, v), n = vAt(N, v);
      const k = `${Math.floor(p[0] / cellMm)},${Math.floor(p[1] / cellMm)},${Math.floor(p[2] / cellMm)},${octant(n)}`;
      let c = map.get(k);
      if (c === undefined) {
        c = acc.length;
        map.set(k, c);
        acc.push({ p: [0, 0, 0], n: [0, 0, 0], w: 0 });
      }
      const A = acc[c];
      A.p = add(A.p, p);
      A.n = add(A.n, n);
      A.w++;
      remap[v] = c;
    }
    const base = pos.length / 3;
    for (const A of acc) {
      pos.push(...scale(A.p, 1 / A.w));
      nrm.push(...normalize(A.n));
      part.push(partId);
    }
    for (let t = 0; t < mesh.index.length; t++) idx.push(base + remap[mesh.index[t]]);
  }
  const P = Float64Array.from(pos);
  const I = cleanTriangles(P, idx, 1e-8);
  // compact unused vertices
  const used = new Int32Array(P.length / 3).fill(-1);
  const cp = [], cn = [], cpart = [], ci = [];
  for (const v of I) {
    if (used[v] < 0) {
      used[v] = cp.length / 3;
      cp.push(P[3 * v], P[3 * v + 1], P[3 * v + 2]);
      cn.push(nrm[3 * v], nrm[3 * v + 1], nrm[3 * v + 2]);
      cpart.push(part[v]);
    }
    ci.push(used[v]);
  }
  return { position: Float64Array.from(cp), normal: Float64Array.from(cn), part: Uint8Array.from(cpart), index: Uint32Array.from(ci) };
}

function decimate(parts, targetTris) {
  let lo = 1, hi = 8, best = null;
  for (let it = 0; it < 18; it++) {
    const cell = (lo + hi) / 2;
    const r = clusterParts(parts, cell);
    const nt = r.index.length / 3;
    best = { ...r, cellMm: cell };
    if (Math.abs(nt - targetTris) < targetTris * 0.03) break;
    if (nt > targetTris) lo = cell;
    else hi = cell;
  }
  return best;
}

// ------------------------------------------------------------------------------------------------ labels

const LV_RING6 = ['anteroseptal', 'anterior', 'anterolateral', 'inferolateral', 'inferior', 'inferoseptal'];

/** Long-axis level and circumferential angle (deg, 0 = septal centre, + toward anterior) of a point. */
function lvCoords(p, F) {
  const r = sub(p, F.apex);
  const f = dot(r, F.u) / F.lenMm;
  const rr = perp(r, F.u);
  const th = (Math.atan2(dot(rr, F.a), dot(rr, F.s)) * 180) / Math.PI;
  return { f, th, radial: len(rr) };
}

function lvLevel(f, F) {
  if (f < F.fCap) return 'apex';
  const third = (1 - F.fCap) / 3;
  if (f < F.fCap + third) return 'apical';
  if (f < F.fCap + 2 * third) return 'mid';
  return 'basal';
}

function lvSegment(level, th, septum) {
  if (level === 'apex') return 'lv-apex';
  if (level === 'apical') {
    if (septum || Math.abs(th) < 45) return 'lv-apical-septal';
    if (th >= 45 && th < 135) return 'lv-apical-anterior';
    if (th <= -45 && th > -135) return 'lv-apical-inferior';
    return 'lv-apical-lateral';
  }
  let name;
  if (septum) name = th >= 0 ? 'anteroseptal' : 'inferoseptal';
  else {
    // sectors of 60° starting at the septal centre and going toward anterior
    const k = Math.floor((((th % 360) + 360) % 360) / 60); // 0..5 counter-clockwise from the septal centre
    name = LV_RING6[k];
  }
  return `lv-${level}-${name}`;
}

export function labelVertices(mesh, F, lm) {
  const n = mesh.position.length / 3;
  const labels = new Uint8Array(n);
  for (let v = 0; v < n; v++) {
    const p = vAt(mesh.position, v);
    const part = mesh.part[v];
    let id;
    if (part === PART.RA) id = 'ra';
    else if (part === PART.LA) id = 'la';
    else if (part === PART.LV || part === PART.SEPTUM) {
      const c = lvCoords(p, F);
      id = lvSegment(lvLevel(c.f, F), c.th, part === PART.SEPTUM);
    } else if (part === PART.RV) {
      const c = lvCoords(p, F);
      const third = (1 - F.fCap) / 3;
      const dP = dist(p, lm.pulmonary.center), dT = dist(p, lm.tricuspid.center);
      if (c.f > F.fCap + third * 1.5 && dP < dT * F.rvotRatio) id = 'rv-outflow';
      else if (c.f < F.fCap + third) id = 'rv-apical';
      else if (c.f < F.fCap + 2 * third) id = 'rv-mid';
      else id = 'rv-basal';
    } else id = 'aorta';
    labels[v] = LI[id];
  }
  return labels;
}

// ------------------------------------------------------------------------------------------------ vessels (procedural stubs)

function tube(path, radius, seg = 18) {
  const pos = [], idx = [];
  let prevE1 = null;
  for (let i = 0; i < path.length; i++) {
    const t = normalize(sub(path[Math.min(path.length - 1, i + 1)], path[Math.max(0, i - 1)]));
    let e1 = prevE1 ? normalize(perp(prevE1, t)) : normalize(perp(Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], t));
    prevE1 = e1;
    const e2 = cross(t, e1);
    const r = typeof radius === 'function' ? radius(i / (path.length - 1)) : radius;
    for (let k = 0; k < seg; k++) {
      const th = (2 * Math.PI * k) / seg;
      pos.push(...add(path[i], add(scale(e1, r * Math.cos(th)), scale(e2, r * Math.sin(th)))));
    }
  }
  for (let i = 0; i + 1 < path.length; i++)
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k, b = i * seg + ((k + 1) % seg), c = (i + 1) * seg + k, d = (i + 1) * seg + ((k + 1) % seg);
      idx.push(a, b, d, a, d, c);
    }
  return { position: Float64Array.from(pos), index: Uint32Array.from(idx) };
}

/** Curved centreline from p0 along d0, bending toward d1, total length L (quadratic Bézier). */
function bentPath(p0, d0, d1, L, n = 8) {
  const c = add(p0, scale(d0, L * 0.5));
  const e = add(c, scale(normalize(d1), L * 0.5));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(add(add(scale(p0, (1 - t) ** 2), scale(c, 2 * t * (1 - t))), scale(e, t * t)));
  }
  return out;
}

/** Orientation outward of a tube (winding check against its centreline). */
function orientTube(m, path) {
  let s = 0;
  const N = vertexNormals(m.position, m.index);
  const nv = m.position.length / 3, seg = nv / path.length;
  for (let v = 0; v < nv; v++) s += dot(vAt(N, v), sub(vAt(m.position, v), path[Math.floor(v / seg)]));
  if (s >= 0) return m;
  const idx = Uint32Array.from(m.index);
  for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  return { position: m.position, index: idx };
}

// ------------------------------------------------------------------------------------------------ conduction system

/** Smooth (moving average, ends fixed) and resample a polyline every ≈ stepMm. */
function smoothResample(points, stepMm = 2.5, passes = 2) {
  let p = points.map((q) => q.slice());
  for (let s = 0; s < passes; s++) p = p.map((q, i) => (i === 0 || i === p.length - 1 ? q : scale(add(add(p[i - 1], q), p[i + 1]), 1 / 3)));
  const L = [0];
  for (let i = 1; i < p.length; i++) L.push(L[i - 1] + dist(p[i], p[i - 1]));
  const total = L[L.length - 1];
  const n = Math.max(1, Math.round(total / stepMm));
  const out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = (total * k) / n;
    while (j < p.length - 2 && L[j + 1] < s) j++;
    const t = L[j + 1] > L[j] ? (s - L[j]) / (L[j + 1] - L[j]) : 0;
    out.push(lerp(p[j], p[j + 1], Math.max(0, Math.min(1, t))));
  }
  return out;
}

/**
 * Snap a chain of waypoints onto a surface: sample the straight segments every ~2 mm, move each sample to the nearest
 * allowed vertex, lift it `liftMm` along that vertex normal (into the cavity for endocardial sets), then smooth.
 */
function surfacePath(waypoints, surf, pred, liftMm = 0.8, maxMm = 25) {
  const pts = [];
  for (let i = 0; i + 1 < waypoints.length; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    const n = Math.max(1, Math.ceil(dist(a, b) / 2));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const q = lerp(a, b, k / n);
      const v = surf.index.nearest(q, pred, maxMm);
      pts.push(v >= 0 ? add(vAt(surf.position, v), scale(vAt(surf.normal, v), liftMm)) : q);
    }
  }
  return smoothResample(pts, 2.5, 3);
}

export function placeConduction(src, F, lm) {
  const W = src.walls;
  // full-resolution surfaces with normals (frame coordinates)
  const surf = (m) => {
    const normal = vertexNormals(m.position, m.index);
    return { position: m.position, normal, index: new PointIndex(m.position, 4) };
  };
  const S = { LV: surf(W.LV), RV: surf(W.RV), SEPTUM: surf(W.SEPTUM), RA: surf(W.RA) };
  const lvAxisPoint = (p) => add(F.apex, scale(F.u, dot(sub(p, F.apex), F.u)));
  // endocardial predicates (outward normals of the wall solids point into the cavities on the endocardium)
  const lvEndo = (i) => dot(vAt(S.LV.normal, i), sub(lvAxisPoint(vAt(S.LV.position, i)), vAt(S.LV.position, i))) > 0;
  const septLV = (i) => dot(vAt(S.SEPTUM.normal, i), F.s) < -0.3;
  const septRV = (i) => dot(vAt(S.SEPTUM.normal, i), F.s) > 0.3;
  const rvC = centroid(W.RV.position);
  const septC = areaCentroid([W.SEPTUM]);
  const rvEndo = (i) => dot(vAt(S.RV.normal, i), sub(septC, vAt(S.RV.position, i))) > 0;
  const raC = centroid(W.RA.position);
  const laC = centroid(W.LA.position);
  const raEpi = (i) => dot(vAt(S.RA.normal, i), sub(vAt(S.RA.position, i), raC)) > 0;
  const raEndo = (i) => !raEpi(i);
  const snap = (s, p, pred, lift = 0.8, maxMm = 40) => {
    const v = s.index.nearest(p, pred, maxMm);
    return v >= 0 ? add(vAt(s.position, v), scale(vAt(s.normal, v), lift)) : p;
  };

  // ---- sinus node: anterolateral RA–SVC junction, along the terminal crest (subepicardial)
  const raP = W.RA.position;
  let maxY = -Infinity;
  for (let i = 1; i < raP.length; i += 3) maxY = Math.max(maxY, raP[i]);
  const top = [];
  for (let i = 0; i < raP.length; i += 3) if (raP[i + 1] > maxY - 8) top.push(raP[i], raP[i + 1], raP[i + 2]);
  const svc = centroid(top); // SVC stub carried by the RA mesh
  const lateral = normalize(perp(sub(raC, laC), [0, 1, 0])); // RA lateral wall: away from the LA, horizontal
  const lateralAnt = normalize(add(lateral, [0, 0, 0.6]));
  const saTarget = add(add(svc, [0, -16, 0]), scale(lateralAnt, 10));
  const sa0 = snap(S.RA, saTarget, raEpi, 0.6);
  const crest = [sa0];
  for (const dy of [7, 14]) crest.push(snap(S.RA, add(add(sa0, [0, -dy, 0]), scale(lateral, 2)), raEpi, 0.6));
  const saPath = smoothResample(crest, 2.5, 1);

  // ---- AV junction: Koch's triangle apex next to the central fibrous body
  const tric = lm.tricuspid, aort = lm.aortic;
  const nearestOnRing = (ring, p) => ring.reduce((b, q) => (dist(q, p) < dist(b, p) ? q : b), ring[0]);
  const pTA = nearestOnRing(lm.tricuspidRing, aort.center);
  const pAT = nearestOnRing(lm.aorticBand, tric.center);
  const cfb = lerp(pTA, pAT, 0.5);
  // septal tricuspid annulus ≈ 12 mm posterior-inferior of pTA along the ring (toward the coronary-sinus ostium)
  const ringIdx = lm.tricuspidRing.indexOf(pTA);
  const nR = lm.tricuspidRing.length;
  const step = (k) => lm.tricuspidRing[(ringIdx + k + nR) % nR];
  // walk the ring toward posterior-inferior (lower y + z)
  const sgn = step(4)[1] + step(4)[2] < step(-4)[1] + step(-4)[2] ? 1 : -1;
  const pTS = step(sgn * 4);
  const atrialSide = (p, mm) => add(p, scale(tric.normal, -mm)); // tricuspid normal points RA → RV
  const avn0 = snap(S.RA, atrialSide(lerp(pTS, pTA, 0.2), 5), raEndo, 0.8, 30);
  const avn1 = snap(S.RA, atrialSide(lerp(pTS, pTA, 0.85), 4), raEndo, 0.8, 30);
  const avnPath = smoothResample([avn0, lerp(avn0, avn1, 0.5), avn1], 2, 0);

  // ---- His bundle: AV node → central fibrous body → crest of the muscular septum
  const septTop = (() => {
    // septum vertex nearest the CFB that lies on the crest (highest along u within 15 mm)
    let best = null, bs = -Infinity;
    const P = W.SEPTUM.position;
    for (let i = 0; i < P.length; i += 3) {
      const p = vAt(P, i / 3);
      const d = dist(p, cfb);
      if (d > 18) continue;
      const sc = -d;
      if (sc > bs) {
        bs = sc;
        best = p;
      }
    }
    return best ?? cfb;
  })();
  const hisEnd = add(septTop, scale(F.u, -4));
  const hisPath = smoothResample([avn1, cfb, hisEnd], 2, 1);

  // ---- left bundle: left septal surface, ≈ 12 mm down, then fascicles
  const lbbStart = snap(S.SEPTUM, hisEnd, septLV, 0.8, 30);
  const lbbEnd = snap(S.SEPTUM, add(lbbStart, scale(F.u, -14)), septLV, 0.8, 30);
  // starts exactly at the His end so the trunk and the left bundle form one continuous path
  const lbbPath = smoothResample([hisEnd, ...surfacePath([hisEnd, lbbStart, lbbEnd], S.SEPTUM, septLV)], 2.5, 1);
  const papBase = (m, s, pred) => snap(s, centroid(m.position), pred, 0.8, 60);
  // fascicle targets: papillary muscle bases on the LV endocardium
  const alpm = papBase(src.papillary.lvAnterolateral, S.LV, lvEndo);
  const pmpm = papBase(src.papillary.lvPosteromedial, S.LV, lvEndo);
  const lvWay = (a, b, k) => {
    // k + 1 evenly spaced waypoints from a to b (snapped to the LV endocardium, septal or free wall, by lvPath)
    const pts = [];
    for (let i = 0; i <= k; i++) pts.push(lerp(a, b, i / k));
    return pts;
  };
  const snapLV = (p) => {
    const a = S.SEPTUM.index.nearest(p, septLV, 30), b = S.LV.index.nearest(p, lvEndo, 30);
    const da = a >= 0 ? dist(vAt(S.SEPTUM.position, a), p) : Infinity, db = b >= 0 ? dist(vAt(S.LV.position, b), p) : Infinity;
    if (da === Infinity && db === Infinity) return p;
    return da <= db ? add(vAt(S.SEPTUM.position, a), scale(vAt(S.SEPTUM.normal, a), 0.8)) : add(vAt(S.LV.position, b), scale(vAt(S.LV.normal, b), 0.8));
  };
  const lvPath = (a, b, bulge) => {
    const pts = lvWay(a, b, Math.max(2, Math.ceil(dist(a, b) / 2))).map((q, i, arr) => {
      const t = i / (arr.length - 1);
      return add(q, scale(bulge, Math.sin(Math.PI * t)));
    });
    return smoothResample(pts.map(snapLV), 2.5, 3);
  };
  const lafPath = lvPath(lbbEnd, alpm, scale(F.a, 4));
  const lpfPath = lvPath(lbbEnd, pmpm, scale(F.a, -4));

  // ---- right bundle: right septal surface → moderator band → anterior papillary muscle of the RV
  const rbbStart = snap(S.SEPTUM, hisEnd, septRV, 0.8, 30);
  const apmR = papBase(src.papillary.rvAnterior, S.RV, rvEndo);
  // septal origin of the moderator band: right septal surface at ≈ 40 % of the cavity length from the apex
  const mbLevel = F.fCap + (1 - F.fCap) * 0.38;
  const lvl = (p) => dot(sub(p, F.apex), F.u) / F.lenMm;
  const mbSeptTarget = add(rbbStart, scale(F.u, (mbLevel - lvl(rbbStart)) * F.lenMm));
  const mb0 = snap(S.SEPTUM, add(mbSeptTarget, scale(sub(apmR, mbSeptTarget), 0.15)), septRV, 0.8, 40);
  const rbbSeptal = surfacePath([rbbStart, lerp(rbbStart, mb0, 0.5), mb0], S.SEPTUM, septRV);
  const band = [];
  for (let i = 1; i <= 6; i++) band.push(lerp(mb0, apmR, i / 6));
  const rbbPath = smoothResample([hisEnd, ...rbbSeptal, ...band], 2.5, 1);

  // ---- sparse Purkinje fan (deterministic): LV from the fascicles and the mid septum, RV from the moderator band
  const purk = [];
  const lvTargets = [];
  for (const [f, ths] of [[0.22, [-150, -90, -30, 30, 90, 150]], [0.48, [-120, -60, 0, 60, 120, 180]]]) {
    for (const th of ths) {
      const rad = (th * Math.PI) / 180;
      const dir = add(scale(F.s, Math.cos(rad)), scale(F.a, Math.sin(rad)));
      const onAxis = add(F.apex, scale(F.u, (F.fCap + (1 - F.fCap) * f) * F.lenMm));
      lvTargets.push(snapLV(add(onAxis, scale(dir, 30))));
    }
  }
  const lvSources = [...lafPath.slice(Math.floor(lafPath.length / 2)), ...lpfPath.slice(Math.floor(lpfPath.length / 2)), ...lbbPath];
  for (const t of lvTargets) {
    const s0 = lvSources.reduce((b, q) => (dist(q, t) < dist(b, t) ? q : b), lvSources[0]);
    const pts = lvPath(s0, t, [0, 0, 0]);
    // skip stubs: a fibre shorter than ~6 mm adds nothing visible
    if (pts.length >= 3) purk.push(pts);
  }
  const rvTargets = [];
  for (const [f, k] of [[0.2, 0], [0.45, 1], [0.45, -1], [0.7, 1], [0.7, -1]]) {
    const onAxis = add(F.apex, scale(F.u, (F.fCap + (1 - F.fCap) * f) * F.lenMm));
    const toRV = normalize(perp(sub(rvC, onAxis), F.u));
    const side = normalize(cross(F.u, toRV));
    rvTargets.push(snap(S.RV, add(add(onAxis, scale(toRV, 45)), scale(side, 18 * k)), rvEndo, 0.8, 50));
  }
  for (const t of rvTargets) {
    const pts = [apmR];
    const n = Math.max(2, Math.ceil(dist(apmR, t) / 2));
    for (let i = 1; i <= n; i++) pts.push(snap(S.RV, lerp(apmR, t, i / n), rvEndo, 0.8, 30));
    purk.push(smoothResample(pts, 2.5, 3));
  }

  const polylines = [
    { label: 'sa-node', kind: 'conduction', points: saPath },
    { label: 'av-node', kind: 'conduction', points: avnPath },
    { label: 'his', kind: 'conduction', points: hisPath },
    { label: 'lbb', kind: 'conduction', points: lbbPath },
    { label: 'laf', kind: 'conduction', points: lafPath },
    { label: 'lpf', kind: 'conduction', points: lpfPath },
    { label: 'rbb', kind: 'conduction', points: rbbPath },
    ...purk.map((points) => ({ label: 'purkinje', kind: 'conduction', points })),
  ];
  const landmarks = { svc, sa: sa0, avNode: avn1, centralFibrousBody: cfb, hisEnd, lbbEnd, moderatorBandSeptal: mb0, rvAnteriorPapillary: apmR, lvAnterolateralPapillary: alpm, lvPosteromedialPapillary: pmpm };
  return { polylines, landmarks };
}

// ------------------------------------------------------------------------------------------------ anchors

/** Per region: the vertex nearest the region centroid among those facing away from the heart centre (label / marker anchor). */
function regionAnchors(mesh, labels) {
  const N = vertexNormals(mesh.position, mesh.index);
  const out = {};
  for (let r = 0; r < LABELS.length; r++) {
    let c = [0, 0, 0], k = 0;
    for (let v = 0; v < labels.length; v++) if (labels[v] === r) {
      c = add(c, vAt(mesh.position, v));
      k++;
    }
    if (!k) continue;
    c = scale(c, 1 / k);
    let best = -1, bs = Infinity, bestAny = -1, ba = Infinity;
    for (let v = 0; v < labels.length; v++) {
      if (labels[v] !== r) continue;
      const p = vAt(mesh.position, v);
      const d = dist(p, c);
      if (d < ba) {
        ba = d;
        bestAny = v;
      }
      if (dot(vAt(N, v), p) <= 0) continue; // must face away from the origin (ventricular centroid)
      if (d < bs) {
        bs = d;
        best = v;
      }
    }
    const v = best >= 0 && bs < 25 ? best : bestAny;
    out[LABELS[r]] = { p: vAt(mesh.position, v).map(round3), n: vAt(N, v).map(round3) };
  }
  return out;
}

const round3 = (x) => Math.round(x * 1000) / 1000;
const r3v = (v) => v.map(round3);

// ------------------------------------------------------------------------------------------------ encoder

export function encode({ mesh, labels, polylines, header }) {
  const V = mesh.position.length / 3, T = mesh.index.length / 3;
  const all = [mesh.position];
  for (const pl of polylines) all.push(Float64Array.from(pl.points.flat()));
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const arr of all)
    for (let i = 0; i < arr.length; i += 3)
      for (let d = 0; d < 3; d++) {
        min[d] = Math.min(min[d], arr[i + d]);
        max[d] = Math.max(max[d], arr[i + d]);
      }
  for (let d = 0; d < 3; d++) {
    min[d] = Math.floor(min[d] - 1);
    max[d] = Math.ceil(max[d] + 1);
  }
  const q = (x, d) => Math.max(0, Math.min(65535, Math.round(((x - min[d]) / (max[d] - min[d])) * 65535)));
  let nPts = 0;
  const table = polylines.map((pl) => {
    const e = { label: pl.label, kind: pl.kind, start: nPts, count: pl.points.length };
    nPts += pl.points.length;
    return e;
  });
  const indexBits = V > 65535 ? 32 : 16;
  const json = {
    format: 'ecg-academy-heart',
    version: 1,
    units: 'mm',
    axes: '+x patient left, +y superior, +z anterior (body orientation); origin = ventricular centroid',
    counts: { vertices: V, triangles: T, polylinePoints: nPts },
    indexBits,
    bbox: { min, max },
    labels: LABELS,
    polylines: table,
    ...header,
  };
  let js = JSON.stringify(json);
  const enc = new TextEncoder();
  let jb = enc.encode(js);
  const pad4 = (n) => (n + 3) & ~3;
  const J = pad4(jb.length);
  const posBytes = pad4(V * 6), labBytes = pad4(V), idxBytes = pad4(T * 3 * (indexBits / 8)), plBytes = pad4(nPts * 6);
  const total = 12 + J + posBytes + labBytes + idxBytes + plBytes;
  const buf = new ArrayBuffer(total);
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  u8.set(enc.encode('ECGH'), 0);
  dv.setUint32(4, 1, true);
  dv.setUint32(8, J, true);
  u8.fill(0x20, 12, 12 + J);
  u8.set(jb, 12);
  let o = 12 + J;
  for (let i = 0; i < V * 3; i++) dv.setUint16(o + 2 * i, q(mesh.position[i], i % 3), true);
  o += posBytes;
  u8.set(labels, o);
  o += labBytes;
  for (let i = 0; i < T * 3; i++) {
    if (indexBits === 16) dv.setUint16(o + 2 * i, mesh.index[i], true);
    else dv.setUint32(o + 4 * i, mesh.index[i], true);
  }
  o += idxBytes;
  let k = 0;
  for (const pl of polylines)
    for (const p of pl.points) {
      for (let d = 0; d < 3; d++) dv.setUint16(o + 2 * (3 * k + d), q(p[d], d), true);
      k++;
    }
  return new Uint8Array(buf);
}

// ------------------------------------------------------------------------------------------------ bake

export function bake(glb, { targetTris = 20000 } = {}) {
  const raw = loadSource(glb);
  const F0 = computeFrame(raw);
  // move everything into the app frame: body orientation, origin = ventricular centroid
  const o = F0.origin;
  const tr = (m) => {
    const p = new Float64Array(m.position.length);
    for (let i = 0; i < p.length; i += 3) {
      p[i] = m.position[i] - o[0];
      p[i + 1] = m.position[i + 1] - o[1];
      p[i + 2] = m.position[i + 2] - o[2];
    }
    return { position: p, index: m.index };
  };
  const src = {
    walls: Object.fromEntries(Object.entries(raw.walls).map(([k, m]) => [k, tr(m)])),
    valves: Object.fromEntries(Object.entries(raw.valves).map(([k, m]) => [k, tr(m)])),
    papillary: Object.fromEntries(Object.entries(raw.papillary).map(([k, m]) => [k, tr(m)])),
  };
  const apex = sub(F0.apex, o), base = sub(F0.base, o);
  const lenMm = dot(sub(base, apex), F0.u);
  // apex cap: myocardium beyond the end of the LV cavity (lowest endocardial point near the axis)
  const W = src.walls;
  const lvN = vertexNormals(W.LV.position, W.LV.index);
  let fEndo = Infinity;
  for (let i = 0; i < W.LV.position.length / 3; i++) {
    const p = vAt(W.LV.position, i), n = vAt(lvN, i);
    const r = sub(p, apex);
    if (len(perp(r, F0.u)) > 15 || dot(n, F0.u) < 0.5) continue;
    fEndo = Math.min(fEndo, dot(r, F0.u) / lenMm);
  }
  const fCap = Math.min(0.2, Math.max(0.06, Number.isFinite(fEndo) ? fEndo : 0.1));
  const F = { apex, base, u: F0.u, s: F0.s, a: F0.a, lenMm, fCap, rvotRatio: 0.9 };

  const lvC = centroid(W.LV.position), rvC = centroid(W.RV.position);
  const lm = {
    mitral: annulus(src.valves.MITRAL, [W.LV, W.LA], lvC),
    tricuspid: annulus(src.valves.TRICUSPID, [W.RV, W.RA], rvC),
    aortic: annulus(src.valves.AORTIC, [W.LV, W.SEPTUM], [0, 1000, 0]),
    pulmonary: annulus(src.valves.PULMONARY, [W.RV], [0, 1000, 0]),
  };
  // semilunar normals: ventricle → artery
  for (const [k, from] of [['aortic', lvC], ['pulmonary', rvC]]) if (dot(lm[k].normal, sub(lm[k].center, from)) < 0) lm[k].normal = scale(lm[k].normal, -1);
  lm.mitralRing = ringPolyline(lm.mitral);
  lm.tricuspidRing = ringPolyline(lm.tricuspid);
  lm.aorticBand = [];
  for (let i = 0; i < lm.aortic.band.length; i += 3) lm.aorticBand.push(vAt(lm.aortic.band, i / 3));

  // decimate the walls
  const parts = Object.entries(PART).map(([k, partId]) => ({ mesh: W[k], partId }));
  const vesselTris = 2 * 18 * 8 * 2;
  const dec = decimate(parts, targetTris - vesselTris);
  const labels0 = labelVertices(dec, F, lm);

  // procedural great-vessel stubs (labelled 'aorta' / 'pulmonary-trunk')
  const aoPath = bentPath(add(lm.aortic.center, scale(lm.aortic.normal, -2)), lm.aortic.normal, normalize([-0.35, 1, 0.1]), 30);
  const paPath = bentPath(add(lm.pulmonary.center, scale(lm.pulmonary.normal, -2)), lm.pulmonary.normal, normalize([0.35, 0.8, -0.6]), 26);
  const ao = orientTube(tube(aoPath, Math.max(10, Math.min(14, lm.aortic.radius))), aoPath);
  const pa = orientTube(tube(paPath, Math.max(10, Math.min(14, lm.pulmonary.radius))), paPath);
  const V0 = dec.position.length / 3;
  const pos = [...dec.position, ...ao.position, ...pa.position];
  const idx = [...dec.index, ...Array.from(ao.index, (i) => i + V0), ...Array.from(pa.index, (i) => i + V0 + ao.position.length / 3)];
  const labels = new Uint8Array(pos.length / 3);
  labels.set(labels0, 0);
  labels.fill(LI.aorta, V0, V0 + ao.position.length / 3);
  labels.fill(LI['pulmonary-trunk'], V0 + ao.position.length / 3);
  const mesh = { position: Float64Array.from(pos), index: Uint32Array.from(idx) };

  const cond = placeConduction(src, F, lm);
  const rings = [
    { label: 'mitral-annulus', kind: 'ring', points: [...lm.mitralRing, lm.mitralRing[0]] },
    { label: 'tricuspid-annulus', kind: 'ring', points: [...lm.tricuspidRing, lm.tricuspidRing[0]] },
  ];
  const polylines = [...cond.polylines, ...rings];
  const anchors = regionAnchors(mesh, labels);
  // conduction anchors: middle of the first polyline of each id
  for (const pl of cond.polylines) if (!anchors[pl.label]) anchors[pl.label] = { p: r3v(pl.points[Math.floor(pl.points.length / 2)]), n: [0, 0, 0] };

  const header = {
    frame: {
      apex: r3v(apex),
      base: r3v(base),
      longAxis: r3v(F.u),
      septal: r3v(F.s),
      anterior: r3v(F.a),
      lengthMm: round3(lenMm),
      apexCapFraction: round3(fCap),
      sourceOriginBodyMm: r3v(o),
    },
    valves: Object.fromEntries(['mitral', 'tricuspid', 'aortic', 'pulmonary'].map((k) => [k, { center: r3v(lm[k].center), normal: r3v(lm[k].normal), radius: round3(lm[k].radius) }])),
    landmarks: Object.fromEntries(Object.entries(cond.landmarks).map(([k, v]) => [k, r3v(v)])),
    anchors,
    decimation: { method: 'vertex clustering (part + cell + normal octant)', cellMm: round3(dec.cellMm) },
    credit: CREDIT,
    changes: CHANGES,
  };
  const bytes = encode({ mesh, labels, polylines, header });

  const counts = Object.fromEntries(LABELS.map((id) => [id, 0]));
  for (const l of labels) counts[LABELS[l]]++;
  const plCounts = {};
  for (const pl of polylines) plCounts[pl.label] = (plCounts[pl.label] ?? 0) + 1;
  const report = {
    bytes: bytes.length,
    vertices: mesh.position.length / 3,
    triangles: mesh.index.length / 3,
    cellMm: dec.cellMm,
    frame: header.frame,
    valves: header.valves,
    landmarks: header.landmarks,
    regionVertexCounts: counts,
    polylineCounts: plCounts,
  };
  const missing = REGION_IDS.filter((id) => !id.match(/^(sa-node|av-node|his|rbb|lbb|laf|lpf|purkinje)$/) && counts[id] === 0);
  const missingPl = ['sa-node', 'av-node', 'his', 'rbb', 'lbb', 'laf', 'lpf', 'purkinje'].filter((id) => !plCounts[id]);
  if (missing.length || missingPl.length) throw new Error(`bake: regions without vertices ${missing.join(', ')}; without polylines ${missingPl.join(', ')}`);
  return { bytes, report, debug: { mesh, labels, polylines, F, lm, src, cond } };
}

// ------------------------------------------------------------------------------------------------ CLI

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const input = resolve(root, arg('in', 'assets-raw/hra/3d-vh-m-heart.glb'));
  const output = resolve(root, arg('out', 'src/assets/heart.bin'));
  const t0 = Date.now();
  const { bytes, report } = bake(new Uint8Array(readFileSync(input)));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, bytes);
  const rep = arg('report', null);
  if (rep) writeFileSync(resolve(root, rep), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, landmarks: undefined, valves: undefined }, null, 1));
  console.log(`wrote ${output} (${(bytes.length / 1024).toFixed(1)} KB) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
