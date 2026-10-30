/**
 * Decoder of the baked heart asset src/assets/heart.bin (written by scripts/bake-heart.mjs). Pure: no DOM, no three.js,
 * so it runs in Node tests and in the browser alike.
 *
 * Binary format "ECGH" v1 (little-endian; every body section padded to a multiple of 4 bytes)
 *   0     char[4]   magic "ECGH"
 *   4     u32       version (1)
 *   8     u32       J = byte length of the JSON header (UTF-8, space-padded to a multiple of 4)
 *   12    JSON      header (HeartHeader below): counts, quantization bbox, label table, polyline table, heart frame,
 *                   valve annuli, landmarks, per-region anchors, credit and the list of changes (CC BY)
 *   12+J  positions u16[3·V]  p = bbox.min + q / 65535 · (bbox.max − bbox.min)   (mm, app frame)
 *         labels    u8[V]     index into header.labels (the RegionIds of src/core/regions.ts, then 'aorta',
 *                             'pulmonary-trunk')
 *         indices   u16[3·T]  (u32 when header.indexBits = 32); counter-clockwise seen from outside
 *         polyline  u16[3·P]  all polyline points, same quantization; header.polylines[i] = {label, kind, start, count}
 *
 * App frame: millimetres, body orientation of the Visible Human male (+x patient left, +y superior, +z anterior),
 * origin = area centroid of the ventricular myocardium.
 */
import { REGIONS, type RegionId } from '../core/regions';

export const HEART_MAGIC = 'ECGH';
export const HEART_VERSION = 1;

/** Mesh labels besides the anatomical RegionIds: short procedural stubs of the great vessels (orientation only). */
export const VESSEL_LABELS = ['aorta', 'pulmonary-trunk'] as const;
export type VesselLabel = (typeof VESSEL_LABELS)[number];
export type HeartLabel = RegionId | VesselLabel;

export type Vec3 = readonly [number, number, number];

export interface HeartFrameInfo {
  /** LV apex (epicardial) and base (mitral annulus centre), mm */
  readonly apex: Vec3;
  readonly base: Vec3;
  /** unit long axis apex → base */
  readonly longAxis: Vec3;
  /** unit direction from the LV long axis toward the septum (⊥ long axis) */
  readonly septal: Vec3;
  /** unit direction toward the LV anterior wall (⊥ long axis and septal) */
  readonly anterior: Vec3;
  readonly lengthMm: number;
  readonly apexCapFraction: number;
  readonly sourceOriginBodyMm: Vec3;
}

export interface HeartAnchor {
  /** a surface point of the region (label / marker anchor) */
  readonly p: Vec3;
  /** outward unit normal there ([0,0,0] for conduction anchors) */
  readonly n: Vec3;
}

export interface HeartCreditInfo {
  readonly title: string;
  readonly creators: string;
  readonly doi: string;
  readonly license: string;
  readonly licenseUrl: string;
}

export interface HeartPolylineEntry {
  readonly label: string;
  /** 'conduction' (a RegionId of the conduction group) or 'ring' (valve annulus, landmark) */
  readonly kind: string;
  readonly start: number;
  readonly count: number;
}

export interface HeartHeader {
  readonly format: string;
  readonly version: number;
  readonly units: string;
  readonly axes: string;
  readonly counts: { readonly vertices: number; readonly triangles: number; readonly polylinePoints: number };
  readonly indexBits: 16 | 32;
  readonly bbox: { readonly min: Vec3; readonly max: Vec3 };
  readonly labels: readonly string[];
  readonly polylines: readonly HeartPolylineEntry[];
  readonly frame: HeartFrameInfo;
  readonly valves: Readonly<Record<string, { readonly center: Vec3; readonly normal: Vec3; readonly radius: number }>>;
  readonly landmarks: Readonly<Record<string, Vec3>>;
  readonly anchors: Readonly<Partial<Record<string, HeartAnchor>>>;
  readonly decimation: { readonly method: string; readonly cellMm: number };
  readonly credit: HeartCreditInfo;
  readonly changes: readonly string[];
}

export interface HeartPolyline {
  readonly label: string;
  readonly kind: string;
  /** xyz triples, mm */
  readonly points: Float32Array;
}

export interface HeartAsset {
  readonly header: HeartHeader;
  /** xyz triples, mm (app frame) */
  readonly positions: Float32Array;
  /** per vertex: index into labelIds */
  readonly labels: Uint8Array;
  /** label table (header.labels, validated) */
  readonly labelIds: readonly HeartLabel[];
  readonly indices: Uint16Array | Uint32Array;
  readonly polylines: readonly HeartPolyline[];
}

export function isHeartLabel(s: string): s is HeartLabel {
  return s in REGIONS || (VESSEL_LABELS as readonly string[]).includes(s);
}

const pad4 = (n: number): number => (n + 3) & ~3;

/** Decode heart.bin. Throws on a malformed or truncated file (the caller shows the fallback text). */
export function decodeHeart(bytes: Uint8Array): HeartAsset {
  if (bytes.byteLength < 12) throw new Error('heart.bin: truncated');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== HEART_MAGIC) throw new Error('heart.bin: bad magic');
  const version = dv.getUint32(4, true);
  if (version !== HEART_VERSION) throw new Error(`heart.bin: unsupported version ${version}`);
  const J = dv.getUint32(8, true);
  if (12 + J > bytes.byteLength) throw new Error('heart.bin: truncated header');
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + J))) as HeartHeader;
  const V = header.counts.vertices;
  const T = header.counts.triangles;
  const P = header.counts.polylinePoints;
  const ib = header.indexBits === 32 ? 4 : 2;
  const need = 12 + J + pad4(V * 6) + pad4(V) + pad4(T * 3 * ib) + pad4(P * 6);
  if (bytes.byteLength < need) throw new Error('heart.bin: truncated body');

  const labelIds = header.labels.map((s) => {
    if (!isHeartLabel(s)) throw new Error(`heart.bin: unknown label ${s}`);
    return s;
  });

  const { min, max } = header.bbox;
  const span = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const deq = (src: number, count: number): Float32Array => {
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      const d = i % 3;
      out[i] = min[d] + (dv.getUint16(src + 2 * i, true) / 65535) * span[d];
    }
    return out;
  };

  let o = 12 + J;
  const positions = deq(o, V);
  o += pad4(V * 6);
  const labels = bytes.slice(o, o + V);
  for (let v = 0; v < V; v++) if (labels[v] >= labelIds.length) throw new Error('heart.bin: label out of range');
  o += pad4(V);
  const indices = ib === 4 ? new Uint32Array(T * 3) : new Uint16Array(T * 3);
  for (let i = 0; i < T * 3; i++) {
    const x = ib === 4 ? dv.getUint32(o + 4 * i, true) : dv.getUint16(o + 2 * i, true);
    if (x >= V) throw new Error('heart.bin: index out of range');
    indices[i] = x;
  }
  o += pad4(T * 3 * ib);
  const allPts = deq(o, P);
  const polylines = header.polylines.map((e): HeartPolyline => {
    if (e.start + e.count > P) throw new Error('heart.bin: polyline out of range');
    return { label: e.label, kind: e.kind, points: allPts.slice(3 * e.start, 3 * (e.start + e.count)) };
  });
  return { header, positions, labels, labelIds, indices, polylines };
}
