/**
 * Minimal glTF 2.0 binary (GLB) reader — bake-time only (no dependencies). Reads the JSON and BIN chunks, accessors
 * (byteStride, every component type, normalized integers), POSITION / NORMAL / indices of TRIANGLES primitives and node
 * names; applies node transforms (matrix or TRS) so positions are in the scene frame.
 * `weldMesh` merges duplicate vertices (quantized position key) and drops degenerate / repeated faces.
 */

export interface GlbMesh {
  /** Node name (the HRA models put the anatomical name on the node). */
  readonly name: string;
  /** Scene-frame positions (glTF units, metres for HRA), 3 per vertex. */
  readonly position: Float64Array;
  readonly index: Uint32Array;
}

interface Accessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  normalized?: boolean;
  count: number;
  type: string;
}
interface BufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
}
interface Primitive {
  attributes: Record<string, number>;
  indices?: number;
  mode?: number;
}
interface Node {
  name?: string;
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}
interface Gltf {
  accessors: Accessor[];
  bufferViews: BufferView[];
  meshes: { primitives: Primitive[] }[];
  nodes: Node[];
  scenes?: { nodes: number[] }[];
  scene?: number;
}

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

export function parseGlb(data: Uint8Array): { json: Gltf; bin: DataView } {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('GLB: bad magic');
  if (dv.getUint32(4, true) !== 2) throw new Error('GLB: unsupported version');
  let off = 12;
  let json: Gltf | null = null;
  let bin: DataView | null = null;
  while (off + 8 <= data.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    const body = data.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(body)) as Gltf;
    else if (type === 0x004e4942) bin = new DataView(body.buffer, body.byteOffset, body.byteLength);
    off += 8 + len;
  }
  if (!json || !bin) throw new Error('GLB: missing JSON or BIN chunk');
  return { json, bin };
}

/** Reads an accessor into a Float64Array (count × components), honouring byteStride and normalization. */
export function readAccessor(json: Gltf, bin: DataView, index: number): { data: Float64Array; comps: number } {
  const a = json.accessors[index];
  const comps = COMPONENTS[a.type];
  if (!comps) throw new Error(`GLB: unsupported accessor type ${a.type}`);
  const out = new Float64Array(a.count * comps);
  if (a.bufferView === undefined) return { data: out, comps }; // all zeros (sparse not supported)
  const bv = json.bufferViews[a.bufferView];
  if (bv.buffer !== 0) throw new Error('GLB: external buffers are not supported');
  const size = BYTES[a.componentType];
  if (!size) throw new Error(`GLB: unsupported component type ${a.componentType}`);
  const stride = bv.byteStride ?? size * comps;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const norm = a.normalized === true;
  for (let i = 0; i < a.count; i++)
    for (let c = 0; c < comps; c++) {
      const o = base + i * stride + c * size;
      let x: number;
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
  return { data: out, comps };
}

type M4 = number[];
const IDENT: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Column-major 4×4 multiply (glTF convention). */
function mul(a: M4, b: M4): M4 {
  const r = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) for (let k = 0; k < 4; k++) r[c * 4 + rr] += a[k * 4 + rr] * b[c * 4 + k];
  return r;
}

function localMatrix(n: Node): M4 {
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

/** Every mesh node of the default scene, transformed to the scene frame (TRIANGLES primitives only, merged per node). */
export function readGlbMeshes(data: Uint8Array, filter?: (name: string) => boolean): GlbMesh[] {
  const { json, bin } = parseGlb(data);
  const out: GlbMesh[] = [];
  const roots = json.scenes?.[json.scene ?? 0]?.nodes ?? json.nodes.map((_, i) => i);
  const visit = (ni: number, parent: M4) => {
    const n = json.nodes[ni];
    const m = mul(parent, localMatrix(n));
    const name = n.name ?? `node${ni}`;
    if (n.mesh !== undefined && (!filter || filter(name))) {
      const pos: number[] = [], idx: number[] = [];
      for (const p of json.meshes[n.mesh].primitives) {
        if ((p.mode ?? 4) !== 4) continue;
        const P = readAccessor(json, bin, p.attributes.POSITION).data;
        const base = pos.length / 3;
        for (let i = 0; i < P.length; i += 3) {
          const x = P[i], y = P[i + 1], z = P[i + 2];
          pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        }
        if (p.indices !== undefined) {
          const I = readAccessor(json, bin, p.indices).data;
          for (let i = 0; i < I.length; i++) idx.push(base + I[i]);
        } else for (let i = 0; i < P.length / 3; i++) idx.push(base + i);
      }
      // negative-determinant transforms flip the winding
      const det = m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
      if (det < 0) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
      out.push({ name, position: Float64Array.from(pos), index: Uint32Array.from(idx) });
    }
    for (const c of n.children ?? []) visit(c, m);
  };
  for (const r of roots) visit(r, IDENT);
  return out;
}

/**
 * Welds vertices closer than `tol` (same quantized cell or a neighbouring one) and drops faces with repeated vertices,
 * near-zero area, or duplicates of an earlier face (same vertex set).
 */
export function weldMesh(m: GlbMesh, tol = 1e-6): GlbMesh & { readonly stats: { readonly vertsIn: number; readonly vertsOut: number; readonly facesIn: number; readonly facesOut: number } } {
  const P = m.position, n = P.length / 3;
  const inv = 1 / tol;
  const cells = new Map<string, number[]>();
  const remap = new Uint32Array(n);
  const pos: number[] = [];
  const key = (a: number, b: number, c: number) => `${a},${b},${c}`;
  for (let v = 0; v < n; v++) {
    const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    const cx = Math.round(x * inv), cy = Math.round(y * inv), cz = Math.round(z * inv);
    let found = -1;
    for (let dx = -1; dx <= 1 && found < 0; dx++)
      for (let dy = -1; dy <= 1 && found < 0; dy++)
        for (let dz = -1; dz <= 1 && found < 0; dz++) {
          const list = cells.get(key(cx + dx, cy + dy, cz + dz));
          if (!list) continue;
          for (const w of list) {
            if (Math.abs(pos[3 * w] - x) <= tol && Math.abs(pos[3 * w + 1] - y) <= tol && Math.abs(pos[3 * w + 2] - z) <= tol) {
              found = w;
              break;
            }
          }
        }
    if (found < 0) {
      found = pos.length / 3;
      pos.push(x, y, z);
      const k = key(cx, cy, cz);
      const list = cells.get(k);
      if (list) list.push(found);
      else cells.set(k, [found]);
    }
    remap[v] = found;
  }
  const idx: number[] = [];
  const seen = new Set<string>();
  const I = m.index;
  const minArea2 = (tol * tol) ** 2;
  for (let t = 0; t < I.length; t += 3) {
    const a = remap[I[t]], b = remap[I[t + 1]], c = remap[I[t + 2]];
    if (a === b || b === c || a === c) continue;
    const ux = pos[3 * b] - pos[3 * a], uy = pos[3 * b + 1] - pos[3 * a + 1], uz = pos[3 * b + 2] - pos[3 * a + 2];
    const vx = pos[3 * c] - pos[3 * a], vy = pos[3 * c + 1] - pos[3 * a + 1], vz = pos[3 * c + 2] - pos[3 * a + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz <= minArea2) continue;
    const s = [a, b, c].sort((p, q) => p - q).join(',');
    if (seen.has(s)) continue;
    seen.add(s);
    idx.push(a, b, c);
  }
  return {
    name: m.name,
    position: Float64Array.from(pos),
    index: Uint32Array.from(idx),
    stats: { vertsIn: n, vertsOut: pos.length / 3, facesIn: I.length / 3, facesOut: idx.length / 3 },
  };
}

/** Edge-manifoldness summary: open (1 face), manifold (2) and non-manifold (≥ 3) edges; connected components. */
export function meshTopology(m: GlbMesh): { open: number; manifold: number; nonManifold: number; components: number } {
  const edges = new Map<number, number>();
  const nv = m.position.length / 3;
  const I = m.index;
  const ek = (a: number, b: number) => (a < b ? a * nv + b : b * nv + a);
  for (let t = 0; t < I.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const k = ek(I[t + e], I[t + ((e + 1) % 3)]);
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  let open = 0, manifold = 0, nonManifold = 0;
  for (const c of edges.values()) {
    if (c === 1) open++;
    else if (c === 2) manifold++;
    else nonManifold++;
  }
  // union-find over vertices used by faces
  const parent = new Int32Array(nv).map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const used = new Uint8Array(nv);
  for (let t = 0; t < I.length; t += 3) {
    used[I[t]] = used[I[t + 1]] = used[I[t + 2]] = 1;
    const a = find(I[t]);
    parent[find(I[t + 1])] = a;
    parent[find(I[t + 2])] = a;
  }
  let components = 0;
  for (let v = 0; v < nv; v++) if (used[v] && find(v) === v) components++;
  return { open, manifold, nonManifold, components };
}
