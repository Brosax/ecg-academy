/**
 * Bakes the realistic body surface (HRA Skin, Male v1.3) into src/assets/body-hra.bin, in the heart's app frame.
 *   BAKE=1 node node_modules/vitest/vitest.mjs run tests/bake/body.test.ts
 * Needs the raw CC BY 4.0 GLBs in assets/models/raw (gitignored; see assets/models/README.md). Skipped otherwise.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildBodyModel, decodeBodyModel, encodeBodyModel, loadHraBody, SKIN_FILE } from '../../../src/lab/sim/geometry/hra/body';
import { HRA_GRID_MM } from '../../../src/lab/sim/geometry/hra/build';
import { computeHeartFrame } from '../../../src/lab/sim/geometry/hra/heartFrame';
import { labelHeart } from '../../../src/lab/sim/geometry/hra/label';
import { HEART_FILE, VESSEL_FILE } from '../../../src/lab/sim/geometry/hra/parts';
import { loadHraSource } from '../../../src/lab/sim/geometry/hra/source';
import type { Vec3 } from '../../../src/lab/sim/types';

const RAW = new URL('../../../assets-raw/hra/', import.meta.url);
const ASSET = new URL('../../../src/lab/assets/body-hra.bin', import.meta.url);
const OUT = new URL('../../out/lab/hra/', import.meta.url);
const RUN = process.env.BAKE === '1' && [HEART_FILE, VESSEL_FILE, SKIN_FILE].every((f) => existsSync(new URL(f, RAW)));

describe.runIf(RUN)('bake HRA body', () => {
  it('builds, encodes and writes src/assets/body-hra.bin', async () => {
    // the heart frame exactly as the heart bake computes it (deterministic)
    const src = loadHraSource(readFileSync(new URL(HEART_FILE, RAW)), readFileSync(new URL(VESSEL_FILE, RAW)));
    const L0 = labelHeart(src, { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], o: [0, 0, 0] }, HRA_GRID_MM);
    const frame = computeHeartFrame(L0);
    const apexCm: Vec3 = [(frame.apexBody[0] - frame.o[0]) / 10, (frame.apexBody[1] - frame.o[1]) / 10, (frame.apexBody[2] - frame.o[2]) / 10];
    const body = buildBodyModel(readFileSync(new URL(SKIN_FILE, RAW)), frame.o, apexCm);
    const raw = encodeBodyModel(body);
    const gz = gzipSync(raw, { level: 9 });
    writeFileSync(ASSET, gz);
    const loaded = await loadHraBody(new Uint8Array(readFileSync(ASSET)));
    expect(loaded.skin.index.length).toBe(body.skin.index.length);
    let maxErr = 0;
    for (let i = 0; i < body.skin.position.length; i++) maxErr = Math.max(maxErr, Math.abs(body.skin.position[i] - loaded.skin.position[i]));
    expect(maxErr).toBeLessThan(0.01);
    expect(decodeBodyModel(raw).electrodes.V4.pos).toEqual(body.electrodes.V4.pos);
    mkdirSync(OUT, { recursive: true });
    writeFileSync(
      new URL('body-report.json', OUT),
      JSON.stringify({ originMm: frame.o, apexCm, gzipBytes: gz.length, rawBytes: raw.length, electrodes: body.electrodes, views: body.views, guides: body.guides.map((g) => [g.id, g.points.length]) }, null, 1),
    );
    console.log(`body asset ${(gz.length / 1024).toFixed(0)} KB gzip; V4 ${body.electrodes.V4.pos.map((x) => x.toFixed(1)).join(', ')}`);
  });
});
