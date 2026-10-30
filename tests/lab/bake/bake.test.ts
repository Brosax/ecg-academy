/**
 * Bakes the realistic HRA heart into src/assets/heart-hra.bin (gzip of the codec layout).
 *   BAKE=1 node node_modules/vitest/vitest.mjs run tests/bake
 * Needs the raw CC BY 4.0 GLBs in assets/models/raw (gitignored; see assets/models/README.md). Skipped otherwise.
 * Writes tests/out/hra/bake-report.json (frame, angles, volumes, timings, sizes).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { mat3MulVec, scale } from '../../../src/lab/sim/frame';
import { buildHraGeometry } from '../../../src/lab/sim/geometry/hra/build';
import { decodeHraBundle, encodeHraBundle } from '../../../src/lab/sim/geometry/hra/codec';
import { describeDirection } from '../../../src/lab/sim/geometry/hra/heartFrame';
import { loadHraGeometry } from '../../../src/lab/sim/geometry/hra/load';
import { HEART_FILE, VESSEL_FILE } from '../../../src/lab/sim/geometry/hra/parts';
import { CHAMBER, TISSUE } from '../../../src/lab/sim/types';
import { sameBundle } from '../sim/geometry/hra/sameBundle';

const RAW = new URL('../../../assets-raw/hra/', import.meta.url);
const ASSET = new URL('../../../src/lab/assets/heart-hra.bin', import.meta.url);
const OUT = new URL('../../out/lab/hra/', import.meta.url);
const RUN = process.env.BAKE === '1' && existsSync(new URL(HEART_FILE, RAW)) && existsSync(new URL(VESSEL_FILE, RAW));

describe.runIf(RUN)('bake HRA heart', () => {
  it('builds, encodes and writes src/assets/heart-hra.bin', async () => {
    const { bundle, report } = buildHraGeometry(readFileSync(new URL(HEART_FILE, RAW)), readFileSync(new URL(VESSEL_FILE, RAW)));
    const raw = encodeHraBundle(bundle);
    const decoded = decodeHraBundle(raw);
    // quantization error against the full-precision bake
    let wdErr = 0, abErr = 0, sdfErr = 0, posErr = 0;
    for (let v = 0; v < bundle.grid.tissue.length; v++) {
      wdErr = Math.max(wdErr, Math.abs(bundle.grid.wallDepth[v] - decoded.grid.wallDepth[v]));
      abErr = Math.max(abErr, Math.abs(bundle.grid.apexBase[v] - decoded.grid.apexBase[v]));
      sdfErr = Math.max(sdfErr, Math.abs(bundle.grid.sdfMm[v] - decoded.grid.sdfMm[v]));
    }
    for (let i = 0; i < bundle.mesh.position.length; i++) posErr = Math.max(posErr, Math.abs(bundle.mesh.position[i] - decoded.mesh.position[i]));
    expect(wdErr).toBeLessThanOrEqual(1 / 510 + 1e-6);
    expect(abErr).toBeLessThanOrEqual(1 / 510 + 1e-6);
    expect(sdfErr).toBeLessThanOrEqual(1 / 32 + 1e-6);
    expect(posErr).toBeLessThan(0.01);
    expect(Array.from(decoded.grid.tissue)).toEqual(Array.from(bundle.grid.tissue));

    const gz = gzipSync(raw, { level: 9 });
    mkdirSync(new URL('./', ASSET), { recursive: true });
    writeFileSync(ASSET, gz);
    // load round trip through the runtime loader (gunzip + decode) equals the bake output
    const loaded = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
    expect(loaded.hash).toBe(decoded.hash);
    expect(sameBundle(loaded, decoded)).toBe('');

    const g = decoded.grid;
    const vol = (pred: (v: number) => boolean) => {
      let n = 0;
      for (let v = 0; v < g.tissue.length; v++) if (pred(v)) n++;
      return +((n * g.hMm ** 3) / 1000).toFixed(1);
    };
    const apexApp = scale(mat3MulVec(decoded.pose.R, [0, 1, 0]), -1);
    const out = {
      hash: decoded.hash,
      sizes: { rawBytes: raw.length, gzipBytes: gz.length },
      grid: { dims: g.dims, hMm: g.hMm, originMm: g.originMm, voxels: g.tissue.length },
      mesh: { vertices: decoded.mesh.position.length / 3, triangles: decoded.mesh.index.length / 3 },
      overlays: decoded.overlays?.map((o) => ({ id: o.id, kind: o.kind, triangles: o.index.length / 3 })),
      frame: {
        poseR: decoded.pose.R,
        apexDirApp: describeDirection(apexApp),
        localX_app: describeDirection(mat3MulVec(decoded.pose.R, [1, 0, 0])),
        localZ_app: describeDirection(mat3MulVec(decoded.pose.R, [0, 0, 1])),
        originBodyMm: report.frame.o,
        apexBodyMm: report.frame.apexBody,
        baseBodyMm: report.frame.baseBody,
      },
      volumesMl: {
        bloodLV: vol((v) => g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.LV),
        bloodRV: vol((v) => g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.RV),
        bloodLA: vol((v) => g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.LA),
        bloodRA: vol((v) => g.tissue[v] === TISSUE.Blood && g.chamber[v] === CHAMBER.RA),
        LV: vol((v) => g.tissue[v] === TISSUE.LV), Septum: vol((v) => g.tissue[v] === TISSUE.Septum), RV: vol((v) => g.tissue[v] === TISSUE.RV),
        LA: vol((v) => g.tissue[v] === TISSUE.LA), RA: vol((v) => g.tissue[v] === TISSUE.RA),
        Ring: vol((v) => g.tissue[v] === TISSUE.Ring), Vessel: vol((v) => g.tissue[v] === TISSUE.Vessel),
      },
      quantization: { wdErr, abErr, sdfErr, posErr },
      labelStats: report.labelStats,
      fieldInfo: report.fieldInfo,
      conductionPoints: report.conductionPoints,
      valves: decoded.valves,
      chambers: decoded.chambers,
      timingsMs: report.timingsMs,
    };
    mkdirSync(OUT, { recursive: true });
    writeFileSync(new URL('bake-report.json', OUT), JSON.stringify(out, null, 1));
    console.log(JSON.stringify({ sizes: out.sizes, grid: out.grid, mesh: out.mesh, volumes: out.volumesMl, apex: out.frame.apexDirApp, timings: out.timingsMs }, null, 1));
    expect(gz.length).toBeLessThan(6 * 1024 * 1024);
  }, 300_000);
});
