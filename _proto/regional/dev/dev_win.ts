// dev (review): activation windows of every face for a condition (+ optional vcond patch), sorted by region.
// Usage: node dev/dev_win.ts <id> ['<vcond patch json>']
import { CONDITIONS } from '../conditions.ts';
import { buildHeart, DEFAULT_HEART } from '../geometry.ts';
import { buildVGraph, NORMAL_VCOND, vActivation } from '../conduction.ts';
import type { VConduction } from '../conduction.ts';
const id = process.argv[2] ?? 'normal';
const patch = JSON.parse(process.argv[3] ?? '{}');
const c = CONDITIONS[id];
const v = { ...(c.vcond ?? {}), ...patch } as any;
const vc: VConduction = { ...NORMAL_VCOND, ...v, wall: { ...NORMAL_VCOND.wall, ...(v.wall ?? {}) }, regionSpeed: { ...(v.regionSpeed ?? {}) }, tmSpeed: { ...(v.tmSpeed ?? {}) }, blocked: { ...(v.blocked ?? {}) }, branchDelay: { ...(v.branchDelay ?? {}) }, extra: [...(v.extra ?? [])], pmj: v.pmj ?? NORMAL_VCOND.pmj };
const h = buildHeart({ ...DEFAULT_HEART, ...(c.heart ?? {}) });
const g = buildVGraph(h);
const w = vActivation(h, g, vc);
let mn = Infinity;
for (const x of w) mn = Math.min(mn, x.t0);
console.log('region      IN [t0,t1] via pred        OUT [t0,t1] via pred');
for (let k = 0; k < h.vregions.length; k++) {
  const a = w[2 * k], b = w[2 * k + 1];
  const nm = (i: number) => (i >= 0 ? g.nodes[i] : '-');
  console.log(`${h.vregions[k].id.padEnd(10)} ${(a.t0 - mn).toFixed(0).padStart(4)} ${(a.t1 - mn).toFixed(0).padStart(4)} ${a.via} ${nm(a.pred).padEnd(14)} ${(b.t0 - mn).toFixed(0).padStart(4)} ${(b.t1 - mn).toFixed(0).padStart(4)} ${b.via} ${nm(b.pred)}`);
}
