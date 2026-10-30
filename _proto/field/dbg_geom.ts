// dbg_geom.ts — dump node counts and slice data for visual inspection (dev only)
import { buildGeom, CH, SF, DOM } from './geom.ts';
import { writeFileSync } from 'node:fs';

const t0 = performance.now();
const g = buildGeom();
console.log('nodes', g.n, 'build ms', (performance.now() - t0).toFixed(0));
const cnt: Record<string, number> = {};
for (let i = 0; i < g.n; i++) {
  const k = ['LV', 'RV', 'RA', 'LA'][g.ch[i]] + (g.sf[i] & SF.SEPTAL ? '-sept' : '') + (g.sf[i] & SF.RVOT ? '-rvot' : '');
  cnt[k] = (cnt[k] || 0) + 1;
}
console.log(cnt);
let purk = 0, lvendo = 0, rvendo = 0, epi = 0;
for (let i = 0; i < g.n; i++) { if (g.sf[i] & SF.PURK) purk++; if (g.sf[i] & SF.LV_ENDO) lvendo++; if (g.sf[i] & SF.RV_ENDO) rvendo++; if (g.sf[i] & SF.EPI) epi++; }
console.log({ purk, lvendo, rvendo, epi });
// RV wall layers: count RV nodes with tm<0.5 and >0.5
let rvIn = 0, rvOut = 0, rvotIn = 0, rvotOut = 0;
for (let i = 0; i < g.n; i++) if (g.ch[i] === CH.RV) { if (g.tm[i] < 0.5) rvIn++; else rvOut++; if (g.sf[i] & SF.RVOT) { if (g.tm[i] < 0.5) rvotIn++; else rvotOut++; } }
console.log({ rvIn, rvOut, rvotIn, rvotOut });
// atria/ventricle face adjacency check
let cross = 0;
for (let i = 0; i < g.n; i++) for (let e = g.nb6.start[i]; e < g.nb6.start[i + 1]; e++) if (g.dom[g.nb6.idx[e]] !== g.dom[i]) cross++;
console.log('cross-domain faces', cross);
const body = (pt: [number, number, number]) => g.localToBody(pt).map((v) => v.toFixed(0)).join(',');
console.log('cLV', g.cLV.map((v) => v.toFixed(0)), 'apex', body([0, -g.p.lvEpiL, 0]), 'base centre', body([0, g.p.yBase, 0]));
console.log('RV ant surface', body([-20, 0, 47]), 'RA c', body(g.p.raC), 'LA c', body(g.p.laC), 'RVOT top', body([-15, 44, 30]));
console.log('local x in body', g.R[0].toFixed(2), g.R[3].toFixed(2), g.R[6].toFixed(2), ' local z in body', g.R[2].toFixed(2), g.R[5].toFixed(2), g.R[8].toFixed(2));
const out = { n: g.n, loc: Array.from(g.loc, (v) => Math.round(v * 10) / 10), pos: Array.from(g.pos, (v) => Math.round(v)), ch: Array.from(g.ch), sf: Array.from(g.sf), tm: Array.from(g.tm, (v) => Math.round(v * 100) / 100), dom: Array.from(g.dom) };
writeFileSync(new URL('./cache/geom_dump.json', import.meta.url), JSON.stringify(out));
void DOM;
