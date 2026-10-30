/**
 * Compact binary form of the baked HRA GeometryBundle (before gzip). Layout, little-endian:
 *   "HRA1" | u32 headerBytes | header JSON (UTF-8) | padding to 4 | sections in header.sections order
 * Quantization (header.q): positions Int16 at 1/128 mm around the local origin; indices and vertex→voxel ids as
 * zigzag-delta varints; grid: tissue / chamber / aha / region raw bytes, wallDepth and apexBase Uint8 (/255),
 * transDir octahedral Int8×2, sdfMm Int8 (1/16 mm, ±7.9 mm). Mesh and overlay normals are recomputed at load from the
 * quantized positions (deterministic), so decode(encode(x)) is a fixed point: encode(decode(b)) === b.
 */
import { crc32 } from '../../calibrate/png';
import type { ChamberAxis, ConductionPath, GeometryBundle, Mat3, ModelCredit, OverlayMesh, StructureId, ValveGeom, Vec3 } from '../../types';
import { vertexNormals } from './mesh';

export const HRA_MAGIC = 'HRA1';
const SDF_SCALE = 16;
export const Q_STEP_MM = 1 / 128;

interface Header {
  readonly version: 1;
  readonly hash: string;
  readonly source: 'hra';
  readonly dims: readonly [number, number, number];
  readonly hMm: number;
  readonly originMm: Vec3;
  readonly pose: { readonly R: Mat3; readonly tCm: Vec3 };
  readonly chambers: readonly ChamberAxis[];
  readonly paths: readonly ConductionPath[];
  readonly valves: readonly ValveGeom[];
  readonly landmarks: Partial<Record<StructureId, Vec3>>;
  readonly credits: readonly ModelCredit[];
  readonly q: { readonly center: Vec3; readonly step: number };
  readonly mesh: { readonly nVert: number; readonly nIndex: number };
  readonly overlays: readonly { readonly id: string; readonly kind: OverlayMesh['kind']; readonly nVert: number; readonly nIndex: number }[];
  readonly sections: readonly { readonly name: string; readonly bytes: number }[];
}

// ---------------------------------------------------------------- primitives

class Writer {
  private buf = new Uint8Array(1 << 20);
  length = 0;
  private ensure(n: number) {
    if (this.length + n <= this.buf.length) return;
    let cap = this.buf.length;
    while (cap < this.length + n) cap *= 2;
    const b = new Uint8Array(cap);
    b.set(this.buf.subarray(0, this.length));
    this.buf = b;
  }
  bytes(b: Uint8Array) {
    this.ensure(b.length);
    this.buf.set(b, this.length);
    this.length += b.length;
  }
  varint(x: number) {
    this.ensure(5);
    let v = x >>> 0;
    while (v >= 0x80) {
      this.buf[this.length++] = (v & 0x7f) | 0x80;
      v >>>= 7;
    }
    this.buf[this.length++] = v;
  }
  result(): Uint8Array {
    return this.buf.slice(0, this.length);
  }
}

const zigzag = (x: number) => ((x << 1) ^ (x >> 31)) >>> 0;
const unzigzag = (u: number) => (u >>> 1) ^ -(u & 1);

function encodeDeltaVarint(a: ArrayLike<number>): Uint8Array {
  const w = new Writer();
  let prev = 0;
  for (let i = 0; i < a.length; i++) {
    w.varint(zigzag(a[i] - prev));
    prev = a[i];
  }
  return w.result();
}

function decodeDeltaVarint(b: Uint8Array, n: number): Uint32Array {
  const out = new Uint32Array(n);
  let p = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    let shift = 0, u = 0, byte = 0;
    do {
      byte = b[p++];
      u |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    prev += unzigzag(u >>> 0);
    out[i] = prev;
  }
  return out;
}

function quantizePositions(p: ArrayLike<number>, c: Vec3, step: number): Uint8Array {
  const q = new Int16Array(p.length);
  for (let i = 0; i < p.length; i++) q[i] = Math.max(-32767, Math.min(32767, Math.round((p[i] - c[i % 3]) / step)));
  return new Uint8Array(q.buffer);
}

function dequantizePositions(b: Uint8Array, c: Vec3, step: number): Float32Array {
  const q = new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const out = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) out[i] = c[i % 3] + q[i] * step;
  return out;
}

/** Octahedral encoding of unit vectors (zero vector → (0, 0) is decoded back to zero via a flag byte pair (−128,−128)). */
function octEncode(v: Float32Array): Uint8Array {
  const n = v.length / 3;
  const out = new Int8Array(2 * n);
  for (let i = 0; i < n; i++) {
    let x = v[3 * i], y = v[3 * i + 1];
    const z = v[3 * i + 2];
    const l1 = Math.abs(x) + Math.abs(y) + Math.abs(z);
    if (l1 < 1e-6) {
      out[2 * i] = -128;
      out[2 * i + 1] = -128;
      continue;
    }
    x /= l1;
    y /= l1;
    if (z < 0) {
      const ox = x;
      x = (1 - Math.abs(y)) * (ox >= 0 ? 1 : -1);
      y = (1 - Math.abs(ox)) * (y >= 0 ? 1 : -1);
    }
    out[2 * i] = Math.round(x * 127);
    out[2 * i + 1] = Math.round(y * 127);
  }
  return new Uint8Array(out.buffer);
}

function octDecode(b: Uint8Array): Float32Array {
  const q = new Int8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const n = q.length / 2;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    if (q[2 * i] === -128 && q[2 * i + 1] === -128) continue;
    let x = q[2 * i] / 127, y = q[2 * i + 1] / 127;
    const z = 1 - Math.abs(x) - Math.abs(y);
    if (z < 0) {
      const ox = x;
      x = (1 - Math.abs(y)) * (ox >= 0 ? 1 : -1);
      y = (1 - Math.abs(ox)) * (y >= 0 ? 1 : -1);
    }
    const l = Math.hypot(x, y, z) || 1;
    out[3 * i] = x / l;
    out[3 * i + 1] = y / l;
    out[3 * i + 2] = z / l;
  }
  return out;
}

const u8Of = (a: Float32Array, scale: number) => Uint8Array.from(a, (x) => Math.max(0, Math.min(255, Math.round(x * scale))));

// ---------------------------------------------------------------- encode / decode

export function encodeHraBundle(b: GeometryBundle): Uint8Array {
  const g = b.grid;
  // fixed quantization (data-independent, so re-encoding a decoded bundle is bit-identical): 1/128 mm, ±256 mm
  const center: Vec3 = [0, 0, 0];
  const step = Q_STEP_MM;
  for (const p of [b.mesh.position, ...(b.overlays ?? []).map((o) => o.position)])
    for (let i = 0; i < p.length; i++) if (Math.abs(p[i]) > 32767 * step) throw new Error('HRA asset: position outside the quantization range');
  const sections: { name: string; data: Uint8Array }[] = [
    { name: 'mesh.position', data: quantizePositions(b.mesh.position, center, step) },
    { name: 'mesh.index', data: encodeDeltaVarint(b.mesh.index) },
    { name: 'mesh.voxel', data: encodeDeltaVarint(b.mesh.voxel) },
  ];
  for (const o of b.overlays ?? []) {
    sections.push({ name: `overlay.${o.id}.position`, data: quantizePositions(o.position, center, step) });
    sections.push({ name: `overlay.${o.id}.index`, data: encodeDeltaVarint(o.index) });
  }
  sections.push(
    { name: 'grid.tissue', data: g.tissue },
    { name: 'grid.chamber', data: g.chamber },
    { name: 'grid.aha', data: g.aha },
    { name: 'grid.region', data: g.region },
    { name: 'grid.wallDepth', data: u8Of(g.wallDepth, 255) },
    { name: 'grid.apexBase', data: u8Of(g.apexBase, 255) },
    { name: 'grid.transDir', data: octEncode(g.transDir) },
    { name: 'grid.sdf', data: new Uint8Array(Int8Array.from(g.sdfMm, (x) => Math.max(-127, Math.min(127, Math.round(x * SDF_SCALE)))).buffer) },
  );
  const headerBase = {
    version: 1 as const,
    hash: '',
    source: 'hra' as const,
    dims: g.dims as [number, number, number],
    hMm: g.hMm,
    originMm: g.originMm,
    pose: b.pose,
    chambers: b.chambers,
    paths: b.paths,
    valves: b.valves,
    landmarks: b.landmarks,
    credits: b.credits ?? [],
    q: { center, step },
    mesh: { nVert: b.mesh.position.length / 3, nIndex: b.mesh.index.length },
    overlays: (b.overlays ?? []).map((o) => ({ id: o.id, kind: o.kind, nVert: o.position.length / 3, nIndex: o.index.length })),
    sections: sections.map((s) => ({ name: s.name, bytes: s.data.length })),
  };
  // content hash over the sections (stable across re-encodes of a decoded bundle)
  let crc = 0xffffffff;
  for (const s of sections) crc = crc32(s.data, crc);
  crc = crc32(new TextEncoder().encode(JSON.stringify({ ...headerBase, hash: '' })), crc);
  const header: Header = { ...headerBase, hash: `hra-m-v1.3-${((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')}` };
  const hb = new TextEncoder().encode(JSON.stringify(header));
  const pad = (4 - ((8 + hb.length) % 4)) % 4;
  const total = 8 + hb.length + pad + sections.reduce((s, x) => s + x.data.length, 0);
  const out = new Uint8Array(total);
  out.set(new TextEncoder().encode(HRA_MAGIC), 0);
  new DataView(out.buffer).setUint32(4, hb.length, true);
  out.set(hb, 8);
  let off = 8 + hb.length + pad;
  for (const s of sections) {
    out.set(s.data, off);
    off += s.data.length;
  }
  return out;
}

export function decodeHraBundle(bytes: Uint8Array): GeometryBundle {
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== HRA_MAGIC) throw new Error('HRA asset: bad magic');
  const hl = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + hl))) as Header;
  if (header.version !== 1) throw new Error(`HRA asset: unsupported version ${header.version}`);
  let off = 8 + hl + ((4 - ((8 + hl) % 4)) % 4);
  const sec = new Map<string, Uint8Array>();
  for (const s of header.sections) {
    sec.set(s.name, bytes.subarray(off, off + s.bytes));
    off += s.bytes;
  }
  const get = (name: string) => {
    const s = sec.get(name);
    if (!s) throw new Error(`HRA asset: missing section ${name}`);
    return s;
  };
  const { center, step } = header.q;
  const position = dequantizePositions(get('mesh.position'), center, step);
  const index = decodeDeltaVarint(get('mesh.index'), header.mesh.nIndex);
  const voxel = decodeDeltaVarint(get('mesh.voxel'), header.mesh.nVert);
  const overlays: OverlayMesh[] = header.overlays.map((o) => {
    const p = dequantizePositions(get(`overlay.${o.id}.position`), center, step);
    const i = decodeDeltaVarint(get(`overlay.${o.id}.index`), o.nIndex);
    return { id: o.id, kind: o.kind, position: p, normal: vertexNormals(p, i), index: i };
  });
  const N = header.dims[0] * header.dims[1] * header.dims[2];
  const copy = (name: string) => {
    const s = get(name);
    if (s.length !== N) throw new Error(`HRA asset: section ${name} has ${s.length} bytes, expected ${N}`);
    return s.slice();
  };
  const sdfQ = new Int8Array(copy('grid.sdf').buffer);
  const grid = {
    dims: header.dims,
    hMm: header.hMm,
    originMm: header.originMm,
    tissue: copy('grid.tissue'),
    chamber: copy('grid.chamber'),
    aha: copy('grid.aha'),
    region: copy('grid.region'),
    wallDepth: Float32Array.from(copy('grid.wallDepth'), (x) => x / 255),
    apexBase: Float32Array.from(copy('grid.apexBase'), (x) => x / 255),
    transDir: octDecode(get('grid.transDir')),
    sdfMm: Float32Array.from(sdfQ, (x) => x / SDF_SCALE),
  };
  return {
    source: 'hra',
    overlays,
    credits: header.credits,
    grid,
    mesh: { position, normal: vertexNormals(position, index), index, voxel },
    pose: header.pose,
    chambers: header.chambers,
    paths: header.paths,
    valves: header.valves,
    landmarks: header.landmarks,
    hash: header.hash,
  };
}
