// dbg_fsite.ts — flutter: activation time (ms after the circuit exit) of the atrial landmark sites, and the body
// position + time of the earliest / latest LA nodes in one cycle (dev)
// usage: node dbg_fsite.ts ['<FIELD_OVR>'] ['<FIELD_COVR>']
import { generate, lastInternals } from './synth.ts';
import { CH, DOM } from './geom.ts';
if (process.argv[2]) process.env.FIELD_OVR = process.argv[2];
if (process.argv[3]) process.env.FIELD_COVR = process.argv[3];
generate('aflutter', { fs: 500, durationS: 2, seed: 1 });
const m = lastInternals!.model; const a = m.acts!; const g = m.g;
let k = a.first[m.sites.FLUT]; while (k >= 0 && a.t[k] < 1000) k = a.next[k];
const t0 = a.t[k];
const after = (i: number) => { let q = a.first[i]; while (q >= 0 && a.t[q] < t0) q = a.next[q]; return q >= 0 ? a.t[q] - t0 : NaN; };
const P = (i: number) => [g.pos[3 * i], g.pos[3 * i + 1], g.pos[3 * i + 2]].map((v) => v.toFixed(0).padStart(4)).join('');
for (const [nm, i] of Object.entries(m.sites)) if (i >= 0 && i < g.n && g.dom[i] === DOM.A) console.log(`${nm.padEnd(6)} ${P(i)}  t ${after(i).toFixed(0)}`);
// LA activation order
const la: { i: number; t: number }[] = [];
for (let i = 0; i < g.n; i++) if (g.ch[i] === CH.LA) la.push({ i, t: after(i) });
la.sort((x, y) => x.t - y.t);
const q = (f: number) => la[Math.floor(f * (la.length - 1))];
for (const f of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) { const e = q(f); console.log(`LA q${(f * 100).toFixed(0).padStart(3)} t ${e.t.toFixed(0).padStart(4)} at ${P(e.i)}`); }
// mean LA body y of nodes per 20 ms
for (let t = 0; t < 200; t += 20) { const s = la.filter((e) => e.t >= t && e.t < t + 20); if (!s.length) continue; const my = s.reduce((acc, e) => acc + g.pos[3 * e.i + 1], 0) / s.length; console.log(`LA ${t}-${t + 20} ms: n ${s.length}, mean body y ${my.toFixed(0)}`); }
const ra = []; for (let i = 0; i < g.n; i++) if (g.ch[i] === CH.RA) ra.push({ i, t: after(i) });
for (let t = 0; t < 200; t += 20) { const s = ra.filter((e) => e.t >= t && e.t < t + 20); if (!s.length) continue; const my = s.reduce((acc, e) => acc + g.pos[3 * e.i + 1], 0) / s.length; const mx = s.reduce((acc, e) => acc + g.pos[3 * e.i], 0) / s.length; console.log(`RA ${t}-${t + 20} ms: n ${s.length}, mean body x ${mx.toFixed(0)} y ${my.toFixed(0)}`); }
