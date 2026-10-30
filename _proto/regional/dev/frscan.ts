// dev (review): flutter F–R interval scan — truth axis / QRS vs the signal-measured ones (measure.ts), per FR
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { detectBeats, qrsAxis } from '../measure.ts';
for (const fr of (process.argv[2] ?? '230,250,270,290,310').split(',').map(Number)) {
  const c0 = CONDITIONS.aflutter;
  const cond = { ...c0, rhythm: { ...(c0.rhythm as any), fr } } as any;
  const sim = simulate(cond, { fs: 500, durationS: 10, seed: 1 });
  const L = sim.leads as any;
  const mb = detectBeats(L, 500, { pWave: false });
  const ax: number[] = [], qrs: number[] = [], qt: number[] = [];
  for (const t of sim.truth.beats) { const m = mb.find((x) => Math.abs(x.qrsOn - t.qrsOnMs) < 40); if (m && t.qrsOnMs > 300 && t.tOffMs < 9800) { ax.push(qrsAxis(L, 500, m.qrsOn, m.qrsOff)); qrs.push(m.qrsOff - m.qrsOn); qt.push(m.tOff - m.qrsOn); } }
  const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  console.log(`FR ${fr}: truth axis ${sim.truth.qrsAxisDeg} meas ${med(ax).toFixed(0)} | QRS ${sim.truth.qrsMs} meas ${med(qrs).toFixed(0)} | QT ${sim.truth.qtMs} meas ${med(qt).toFixed(0)}`);
}
