// dbg_atr.ts — atrial activation counts per 50 ms bin and AV-node log (dev). usage: node dbg_atr.ts <id> ['<ovr>']
import { generate, lastInternals } from './synth.ts';
import { DOM } from './geom.ts';
const id = process.argv[2] || 'aflutter';
if (process.argv[3]) process.env.FIELD_OVR = process.argv[3];
const r = generate(id, { fs: 500, durationS: 4, seed: 1 });
const m = lastInternals!.model; const a = m.acts!; const g = m.g;
const t0 = -m.p.preMs; const bins = new Int32Array(Math.ceil((4000 - t0) / 50));
let nA = 0; for (let i = 0; i < g.n; i++) if (g.dom[i] === DOM.A) nA++;
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.A) { const b = Math.floor((a.t[k] - t0) / 50); if (b >= 0 && b < bins.length) bins[b]++; } }
console.log('atrial nodes', nA, ' per-50ms activation counts from', t0);
console.log(Array.from(bins).map((v) => Math.round(100 * v / nA)).join(' '));
console.log('AVN', m.avnLog.slice(0, 30).map((e) => `${e.t.toFixed(0)}${e.conducted ? '*' : ''}`).join(' '));
console.log('beats', r.truth.beats.length, 'HR', r.truth.hrBpm.toFixed(0));
