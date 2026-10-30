import { describe, expect, it } from 'vitest';
import { REGION_LIST } from '../../src/core/regions';
import { decodeHeart, HEART_MAGIC, VESSEL_LABELS } from '../../src/heart3d/format';
import { heart, heartBytes } from './asset';

describe('heart.bin decodes', () => {
  it('has the ECGH v1 header and consistent counts', () => {
    const a = heart();
    expect(a.header.format).toBe('ecg-academy-heart');
    expect(a.header.version).toBe(1);
    expect(a.header.units).toBe('mm');
    expect(a.positions.length).toBe(3 * a.header.counts.vertices);
    expect(a.labels.length).toBe(a.header.counts.vertices);
    expect(a.indices.length).toBe(3 * a.header.counts.triangles);
    const pts = a.polylines.reduce((s, p) => s + p.points.length / 3, 0);
    expect(pts).toBe(a.header.counts.polylinePoints);
  });

  it('stays within the triangle and size budget', () => {
    const a = heart();
    expect(a.header.counts.triangles).toBeGreaterThanOrEqual(15_000);
    expect(a.header.counts.triangles).toBeLessThanOrEqual(25_000);
    expect(heartBytes().byteLength).toBeLessThanOrEqual(400 * 1024);
  });

  it('labels every vertex with a known RegionId or a vessel stub', () => {
    const a = heart();
    const known = new Set<string>([...REGION_LIST.map((r) => r.id), ...VESSEL_LABELS]);
    for (const id of a.labelIds) expect(known.has(id)).toBe(true);
    expect(Math.max(...a.labels)).toBeLessThan(a.labelIds.length);
  });

  it('has finite positions inside the quantization box and valid indices', () => {
    const a = heart();
    const { min, max } = a.header.bbox;
    let outside = 0;
    for (let i = 0; i < a.positions.length; i++) {
      const d = i % 3;
      const x = a.positions[i];
      if (!Number.isFinite(x) || x < min[d] - 1e-3 || x > max[d] + 1e-3) outside++;
    }
    expect(outside).toBe(0);
    let maxIdx = 0;
    for (const i of a.indices) maxIdx = Math.max(maxIdx, i);
    expect(maxIdx).toBeLessThan(a.header.counts.vertices);
    // a real heart: roughly 8–16 cm across
    for (let d = 0; d < 3; d++) expect(max[d] - min[d]).toBeGreaterThan(60);
    for (let d = 0; d < 3; d++) expect(max[d] - min[d]).toBeLessThan(180);
  });

  it('carries the CC BY credit and the list of changes', () => {
    const { credit, changes } = heart().header;
    expect(credit.license).toBe('CC BY 4.0');
    expect(credit.doi).toBe('https://doi.org/10.48539/HBM564.WKNG.249');
    expect(credit.title).toMatch(/Heart, Male/);
    expect(changes.length).toBeGreaterThanOrEqual(3);
    expect(changes.join(' ')).toMatch(/conduction system/i);
  });

  it('rejects malformed files', () => {
    const bytes = heartBytes();
    const bad = bytes.slice();
    bad.set([0x58, 0x58, 0x58, 0x58], 0);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe(HEART_MAGIC);
    expect(() => decodeHeart(bad)).toThrow(/magic/);
    expect(() => decodeHeart(bytes.subarray(0, bytes.byteLength - 64))).toThrow(/truncated/);
    expect(() => decodeHeart(new Uint8Array(4))).toThrow(/truncated/);
    const v2 = bytes.slice();
    new DataView(v2.buffer).setUint32(4, 2, true);
    expect(() => decodeHeart(v2)).toThrow(/version/);
  });

  it('decodes from an unaligned view (byteOffset ≠ 0)', () => {
    const bytes = heartBytes();
    const padded = new Uint8Array(bytes.byteLength + 3);
    padded.set(bytes, 3);
    const a = decodeHeart(padded.subarray(3));
    expect(a.header.counts.vertices).toBe(heart().header.counts.vertices);
    expect(a.positions[5]).toBeCloseTo(heart().positions[5], 5);
  });
});
