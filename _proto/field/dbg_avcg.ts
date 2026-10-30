// dbg_avcg.ts — atrial dipole (body frame) through one flutter cycle: H = sum Wd_i * [activated within last 120 ms] (dev)
import { generate, lastInternals } from './synth.ts';
import { DOM, CH } from './geom.ts';
import { dipoleWeights } from './dbg_util.ts';
if (process.argv[2]) process.env.FIELD_OVR = process.argv[2];
generate(process.argv[3] || 'aflutter', { fs: 500, durationS: 2, seed: 1 });
const m = lastInternals!.model; const a = m.acts!; const g = m.g;
const Wd = dipoleWeights(g);
const ex: number[] = []; let k = a.first[m.sites.FLUT ?? m.sites.SA]; while (k >= 0) { ex.push(a.t[k]); k = a.next[k]; }
const t0 = ex[ex.length - 3], cl = ex[ex.length - 2] - t0;
console.log('cycle', cl.toFixed(0));
for (let t = 0; t <= cl; t += 10) {
  const H = [0, 0, 0]; const HR = [0, 0, 0];
  for (let i = 0; i < g.n; i++) {
    if (g.dom[i] !== DOM.A) continue;
    let kk = a.first[i]; let on = false;
    while (kk >= 0) { const dt = t0 + t - a.t[kk]; if (dt >= 0 && dt < 120) on = true; kk = a.next[kk]; }
    if (!on) continue;
    for (let c = 0; c < 3; c++) { H[c] += Wd[c][i]; if (g.ch[i] === CH.RA) HR[c] += Wd[c][i]; }
  }
  const II = 0.5 * H[0] - 0.866 * H[1];
  console.log(String(t).padStart(4), 'H', H.map((v) => v.toFixed(0).padStart(6)).join(''), ' RA', HR.map((v) => v.toFixed(0).padStart(6)).join(''), '  ~II', II.toFixed(0).padStart(6), ' LA', H.map((v, c) => (v - HR[c]).toFixed(0).padStart(6)).join(''));
}
