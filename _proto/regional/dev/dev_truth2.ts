// dev: QRS onset — measured vs first-activation truth and activated-fraction thresholds
import { simulate } from '../synth.ts';
import { CONDITIONS, BENCHMARK_IDS } from '../conditions.ts';
import { detectBeats } from '../measure.ts';
const th = [0.002, 0.005, 0.01, 0.02, 0.03];
for (const id of BENCHMARK_IDS) {
  const sim = simulate(CONDITIONS[id], { fs: 500, durationS: 10, seed: 1, trace: true });
  const mb = detectBeats(sim.leads, 500, { pWave: false });
  const d: number[][] = th.map(() => []), d0: number[] = [];
  sim.beats.forEach((b, k) => {
    const m = mb.find((x) => Math.abs(x.qrsOn - b.qrsOnMs) < 60);
    if (!m || b.qrsOnMs < 300 || b.tOffMs > 9800) return;
    const f = sim.fracs[k];
    d0.push(m.qrsOn - b.qrsOnMs);
    th.forEach((t, i) => { const j = f.act.findIndex((v) => v >= t); d[i].push(m.qrsOn - (f.t0 + j)); });
  });
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(`${id.padEnd(15)} meas − firstAct ${med(d0)} | ` + th.map((t, i) => `${t}: ${med(d[i])}`).join('  '));
}
