// dev: LBBB/normal windows under modified conduction constants. Usage: node dev_vc.ts <id> '<json VConduction overrides>'
import { CONDITIONS } from '../conditions.ts';
import { buildHeart, DEFAULT_HEART } from '../geometry.ts';
import { buildVGraph, NORMAL_VCOND, vActivation } from '../conduction.ts';
const id = process.argv[2] ?? 'lbbb';
const ov = JSON.parse(process.argv[3] ?? '{}');
const c = CONDITIONS[id];
const h = buildHeart({ ...DEFAULT_HEART, ...(c.heart ?? {}) });
const g = buildVGraph(h);
const w = vActivation(h, g, { ...NORMAL_VCOND, ...(c.vcond ?? {}), ...ov } as any);
let mn = Infinity, mx = -Infinity;
for (const x of w) { mn = Math.min(mn, x.t0); mx = Math.max(mx, x.t1); }
const rows: string[] = [];
for (let k = 0; k < h.vregions.length; k++) {
  const a = w[2 * k], b = w[2 * k + 1];
  rows.push(`${h.vregions[k].id.padEnd(9)} IN ${(a.t0 - mn).toFixed(0).padStart(4)}-${(a.t1 - mn).toFixed(0).padEnd(4)} OUT ${(b.t0 - mn).toFixed(0).padStart(4)}-${(b.t1 - mn).toFixed(0).padEnd(4)}${a.t0 < b.t0 ? '' : '  <-- epi first'}`);
}
console.log(rows.join('\n') + `\nspan ${(mx - mn).toFixed(0)} ms`);
