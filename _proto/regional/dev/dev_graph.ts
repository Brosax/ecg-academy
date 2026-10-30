// dev: list graph edges touching RV faces
import { buildHeart, DEFAULT_HEART } from '../geometry.ts';
import { buildVGraph } from '../conduction.ts';
const h = buildHeart(DEFAULT_HEART);
const g = buildVGraph(h);
const filt = process.argv[2] ?? 'rv';
for (let a = 0; a < g.nodes.length; a++) {
  if (!g.nodes[a].startsWith(filt)) continue;
  console.log(g.nodes[a].padEnd(14), g.adj[a].map((e) => `${g.nodes[e.to]}(${e.type},${e.len.toFixed(1)})`).join(' '));
}
