import { dipoleWeights } from './dbg_util.ts';
// dbg_loop.ts — print the EDL heart vector H(t) (body x left, y up, z anterior) over the QRS (dev)
import { generate, lastInternals } from './synth.ts';
import { DOM } from './geom.ts';
const id = process.argv[2] || 'normal';
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const m = lastInternals!.model; const g = m.g; const a = m.acts!; const b = r.truth.beats[0];
const act = new Float64Array(g.n).fill(1e9);
for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOnMs + 300) act[i] = a.t[k] - b.qrsOnMs; }
const Wd = dipoleWeights(g);
for (let t = 0; t <= 100; t += 5) {
  const H = [0, 0, 0]; for (let i = 0; i < g.n; i++) if (act[i] <= t) for (let c = 0; c < 3; c++) H[c] += Wd[c][i];
  const mag = Math.hypot(...H);
  const el = Math.atan2(-H[1], Math.hypot(H[0], H[2])) * 180 / Math.PI; // + = inferior
  const az = Math.atan2(-H[2], H[0]) * 180 / Math.PI; // horizontal: 0 left, +90 posterior? (Frank-like: negative = anterior)
  console.log(String(t).padStart(3), 'x(L)', H[0].toFixed(0).padStart(6), 'y(U)', H[1].toFixed(0).padStart(6), 'z(A)', H[2].toFixed(0).padStart(6), ' |H|', mag.toFixed(0).padStart(5), ' frontal', (Math.atan2(-H[1], H[0]) * 180 / Math.PI).toFixed(0).padStart(5), ' horiz(+post)', az.toFixed(0).padStart(5), ' elev(+inf)', el.toFixed(0).padStart(4));
}
