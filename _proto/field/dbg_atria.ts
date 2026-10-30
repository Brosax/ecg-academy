// dbg_atria.ts — body-frame layout of the atria (x left, y up, z anterior; mm): chamber extents and centroids, and the
// positions of the atrial landmark sites used by the conduction graph (dev)
// usage: node dbg_atria.ts [id] ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { CONDITIONS } from './conditions.ts';
import { buildModel } from './model.ts';
import { CH } from './geom.ts';
const id = process.argv[2] || 'aflutter';
if (process.argv[3]) process.env.FIELD_OVR = process.argv[3];
const p = CONDITIONS[id].params(1);
if (process.argv[4]) { const o = JSON.parse(process.argv[4]); Object.assign(p, o); }
const m = buildModel(p, 1); const g = m.g;
const P = (i: number) => [g.pos[3 * i], g.pos[3 * i + 1], g.pos[3 * i + 2]].map((v) => v.toFixed(0).padStart(4)).join('');
for (const [nm, c] of [['RA', CH.RA], ['LA', CH.LA], ['LV', CH.LV], ['RV', CH.RV]] as const) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], s = [0, 0, 0]; let n = 0;
  for (let i = 0; i < g.n; i++) if (g.ch[i] === c) { n++; for (let k = 0; k < 3; k++) { const v = g.pos[3 * i + k]; lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); s[k] += v; } }
  console.log(`${nm} n ${String(n).padStart(5)}  centroid ${s.map((v) => (v / n).toFixed(0).padStart(4)).join('')}   x ${lo[0].toFixed(0)}..${hi[0].toFixed(0)}  y ${lo[1].toFixed(0)}..${hi[1].toFixed(0)}  z ${lo[2].toFixed(0)}..${hi[2].toFixed(0)}`);
}
for (const [k, v] of Object.entries(m.sites)) if (v >= 0 && v < g.n && g.dom[v] === 1) console.log(`site ${k.padEnd(6)} ${P(v)}  ch ${g.ch[v] === CH.RA ? 'RA' : 'LA'}`);
