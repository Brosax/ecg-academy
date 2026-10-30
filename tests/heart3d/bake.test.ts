/**
 * The shipped asset is reproducible: re-running scripts/bake-heart.mjs on the HRA source gives the same mesh, labels,
 * topology and conduction polylines (positions within two quantization steps, so a last-bit difference in Math.sin/cos
 * between Node versions cannot fail the check). Skipped when the raw GLB (assets-raw/, not shipped) is not present.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decodeHeart } from '../../src/heart3d/format';
import { heart } from './asset';

const root = fileURLToPath(new URL('../../', import.meta.url));
const glb = join(root, 'assets-raw/hra/3d-vh-m-heart.glb');

describe.skipIf(!existsSync(glb))('bake-heart.mjs', () => {
  it('reproduces src/assets/heart.bin', () => {
    const dir = mkdtempSync(join(tmpdir(), 'heart-bake-'));
    try {
      const out = join(dir, 'heart.bin');
      execFileSync(process.execPath, [join(root, 'scripts/bake-heart.mjs'), '--out', out], { cwd: root, stdio: 'pipe' });
      const fresh = decodeHeart(new Uint8Array(readFileSync(out)));
      const shipped = heart();
      expect(fresh.header.counts).toEqual(shipped.header.counts);
      expect(fresh.labelIds).toEqual(shipped.labelIds);
      expect(Buffer.compare(Buffer.from(fresh.labels), Buffer.from(shipped.labels))).toBe(0);
      expect(Array.from(fresh.indices)).toEqual(Array.from(shipped.indices));
      expect(fresh.polylines.map((p) => [p.label, p.points.length])).toEqual(shipped.polylines.map((p) => [p.label, p.points.length]));
      const { min, max } = shipped.header.bbox;
      const q = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 65535;
      let worst = 0;
      for (let i = 0; i < fresh.positions.length; i++) worst = Math.max(worst, Math.abs(fresh.positions[i] - shipped.positions[i]));
      expect(worst).toBeLessThanOrEqual(2 * q + 1e-4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
