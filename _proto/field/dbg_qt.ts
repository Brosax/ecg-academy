// dbg_qt.ts — compare candidate truth definitions of T end with the tangent measurement (dev)
import { generate, lastInternals } from './synth.ts';
import { DOM } from './geom.ts';
for (const id of process.argv.slice(2)) {
  const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
  const m = lastInternals!.model; const a = m.acts!; const g = m.g; const b = r.truth.beats[1];
  const rt: number[] = [];
  for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOffMs + 5) rt.push(a.t[k] + a.apd[k] - b.qrsOnMs); }
  rt.sort((x, y) => x - y); const q = (p: number) => rt[Math.floor(p * (rt.length - 1))];
  console.log(id.padEnd(16), 'truth', (b.tOffMs - b.qrsOnMs).toFixed(0), ' RT q50', q(0.5).toFixed(0), 'q90', q(0.9).toFixed(0), 'q95', q(0.95).toFixed(0), 'q98', q(0.98).toFixed(0), 'q995', q(0.995).toFixed(0));
}
