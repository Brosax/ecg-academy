// dbg_amap.ts — dump atrial node positions (local frame) + first activation time + CTI flag for plotting (dev)
import { generate, lastInternals } from './synth.ts';
import { DOM, CH } from './geom.ts';
import { writeFileSync } from 'node:fs';
const id = process.argv[2] || 'aflutter';
if (process.argv[4]) process.env.FIELD_OVR = process.argv[4];
if (process.argv[6]) process.env.FIELD_COVR = process.argv[6];
generate(id, { fs: 500, durationS: 2, seed: 1 });
const m = lastInternals!.model; const a = m.acts!; const g = m.g;
// 'flut': start at the first flutter-circuit exit after 1000 ms
let tFrom = Number(process.argv[3] || '-3000');
if (process.argv[3] === 'flut') { let k = a.first[m.sites.FLUT]; while (k >= 0 && a.t[k] < 1000) k = a.next[k]; tFrom = a.t[k]; }
const act = new Float64Array(g.n).fill(NaN);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.A && a.t[k] >= tFrom && isNaN(act[i])) act[i] = a.t[k] - tFrom; }
const out = { loc: [] as number[], t: [] as number[], ch: [] as number[], sites: m.sites, raC: m.p.geom.raC, laC: m.p.geom.laC };
for (let i = 0; i < g.n; i++) if (g.dom[i] === DOM.A) { if (process.env.BODY) out.loc.push(g.pos[3 * i], g.pos[3 * i + 1], g.pos[3 * i + 2]); else out.loc.push(g.loc[3 * i], g.loc[3 * i + 1], g.loc[3 * i + 2]); out.t.push(isNaN(act[i]) ? -1 : act[i]); out.ch.push(g.ch[i] === CH.RA ? 0 : 1); }
writeFileSync(process.argv[5] || 'cache/amap.json', JSON.stringify(out));
console.log('sites', JSON.stringify({ FLUT: m.sites.FLUT, CTIL: m.sites.CTIL }), 'act FLUT', act[m.sites.FLUT], 'act CTIL', act[m.sites.CTIL]);
const ts = Array.from(act).filter((v, i) => g.dom[i] === DOM.A && !isNaN(v)); console.log('activated', ts.length, 'max', Math.max(...ts));
