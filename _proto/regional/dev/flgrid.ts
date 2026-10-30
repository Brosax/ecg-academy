// dev (review): flutter circuit variants — F-wave extrema per cycle (zigzag 0.3 mm; a clean sawtooth has 2) in II / III /
// aVF / V1 measured in the T–Q stretches, plus min / max (mm). Usage: node dev/flgrid.ts '<json array of circuit patches>'
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
const patches = JSON.parse(process.argv[2] ?? '[{}]');
for (const cp of patches) {
  const c0 = CONDITIONS.aflutter;
  const cond = { ...c0, rhythm: { ...(c0.rhythm as any), circuit: cp } } as any;
  const sim = simulate(cond, { fs: 1000, durationS: 6, seed: 1 });
  const out: string[] = [];
  for (const l of ['II', 'III', 'aVF', 'V1']) {
    const x = (sim.leads as any)[l] as Float32Array;
    let ext = 0, cyc = 0, mn = 0, mx = 0;
    const bs = sim.truth.beats;
    for (let k = 0; k + 1 < bs.length; k++) {
      const a = Math.round(bs[k].tOffMs + 20), z = Math.round(bs[k + 1].qrsOnMs - 10);
      if (z - a < 200) continue;
      const vals: number[] = []; for (let t = a; t < z; t++) vals.push(x[t] * 10);
      const s = [...vals].sort((p, q) => p - q); const med = s[s.length >> 1];
      let lastY = vals[0] - med, dir = 0;
      for (const v0 of vals) { const y = v0 - med; mn = Math.min(mn, y); mx = Math.max(mx, y);
        if (dir >= 0 && y < lastY - 0.3) { if (dir > 0) ext++; dir = -1; lastY = y; }
        else if (dir <= 0 && y > lastY + 0.3) { if (dir < 0) ext++; dir = 1; lastY = y; }
        else if ((dir > 0 && y > lastY) || (dir < 0 && y < lastY)) lastY = y; }
      cyc += (z - a) / 200;
    }
    out.push(`${l} ext/cyc ${(ext / cyc).toFixed(1)} ${mn.toFixed(1)}/${mx.toFixed(1)}`);
  }
  console.log(`${out.join(' | ')}  QRS ${sim.truth.qrsMs} | ${JSON.stringify(cp)}`);
}
