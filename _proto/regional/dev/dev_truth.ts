// dev: compare signal-measured QRS offset / T end with the model's activation / repolarisation fraction thresholds
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { detectBeats } from '../measure.ts';
const ids = process.argv.slice(2);
const th = [0.9, 0.95, 0.97, 0.98, 0.99, 0.995];
for (const id of ids) {
  const sim = simulate(CONDITIONS[id], { fs: 500, durationS: 10, seed: 1, trace: true });
  const mb = detectBeats(sim.leads, 500, { pWave: false });
  const rowA: number[][] = th.map(() => []), rowR: number[][] = th.map(() => []), mq: number[] = [], mt: number[] = [];
  sim.beats.forEach((b, k) => {
    const m = mb.find((x) => Math.abs(x.qrsOn - (b.qrsOnMs + 3000)) < 60 || Math.abs(x.qrsOn - b.qrsOnMs) < 60);
    if (!m || b.qrsOnMs < 300 || b.tOffMs > 9800) return;
    const f = sim.fracs[k];
    th.forEach((t, i) => {
      const ja = f.act.findIndex((v) => v >= t), jr = f.rep.findIndex((v) => v >= t);
      rowA[i].push(f.t0 + ja - b.qrsOnMs); rowR[i].push(f.t0 + jr - b.qrsOnMs);
    });
    mq.push(m.qrsOff - m.qrsOn); mt.push(m.tOff - m.qrsOn);
  });
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(`${id}: measured QRS ${med(mq)} QT ${med(mt).toFixed(0)} | act ` + th.map((t, i) => `${t}:${med(rowA[i])}`).join(' ') + ' | rep ' + th.map((t, i) => `${t}:${med(rowR[i])}`).join(' '));
}
