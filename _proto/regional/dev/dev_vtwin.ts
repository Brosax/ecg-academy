// dev (review): activation windows of the VT beat (focus, no Purkinje), with an optional vcond patch
import { CONDITIONS } from '../conditions.ts';
import { buildHeart, DEFAULT_HEART } from '../geometry.ts';
import { buildVGraph, NORMAL_VCOND, vActivation } from '../conduction.ts';
import type { VConduction } from '../conduction.ts';
const id = process.argv[2] ?? 'vt';
const patch = JSON.parse(process.argv[3] ?? '{}');
const c = CONDITIONS[id];
const rh = c.rhythm as any;
const h = buildHeart({ ...DEFAULT_HEART, ...(c.heart ?? {}) });
const g = buildVGraph(h);
const base = { ...NORMAL_VCOND, ...(c.vcond ?? {}), ...patch, wall: { ...NORMAL_VCOND.wall, ...(c.vcond?.wall ?? {}), ...(patch.wall ?? {}) }, regionSpeed: { ...(c.vcond?.regionSpeed ?? {}), ...(patch.regionSpeed ?? {}) }, blocked: {}, branchDelay: {} } as VConduction;
const vc: VConduction = rh.kind === 'vt' ? { ...base, pmj: [], extra: [{ face: rh.origin, t: 0, h: rh.originH, at: rh.originAt }] } : base;
const w = vActivation(h, g, vc);
let mn = Infinity;
for (const x of w) mn = Math.min(mn, x.t0);
console.log('region      IN [t0,t1] via pred        OUT [t0,t1] via pred');
for (let k = 0; k < h.vregions.length; k++) {
  const a = w[2 * k], b = w[2 * k + 1];
  const nm = (i: number) => (i >= 0 ? g.nodes[i] : '-');
  console.log(`${h.vregions[k].id.padEnd(10)} ${(a.t0 - mn).toFixed(0).padStart(4)} ${(a.t1 - mn).toFixed(0).padStart(4)} ${a.via} ${nm(a.pred).padEnd(14)} ${(b.t0 - mn).toFixed(0).padStart(4)} ${(b.t1 - mn).toFixed(0).padStart(4)} ${b.via} ${nm(b.pred)}`);
}
