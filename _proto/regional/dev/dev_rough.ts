// dev: QRS roughness — number of extrema (prominence ≥ 0.5 mm) inside the QRS summed over 12 leads, per condition
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADS } from '../leadfield.ts';
const ids = process.argv.slice(2);
for (const id of ids) {
  const sim = simulate(CONDITIONS[id], { fs: 1000, durationS: 4, seed: 1 });
  const b = sim.truth.beats[1];
  let tot = 0;
  for (const l of LEADS) {
    const x = sim.leads[l];
    const a = Math.round(b.qrsOnMs), z = Math.round(b.qrsOffMs);
    let last = x[a] * 10, dir = 0, cnt = 0;
    for (let i = a + 1; i <= z; i++) {
      const v = x[i] * 10;
      if (dir >= 0 && v < last - 0.5) { if (dir > 0) cnt++; dir = -1; last = v; }
      else if (dir <= 0 && v > last + 0.5) { if (dir < 0) cnt++; dir = 1; last = v; }
      else if ((dir >= 0 && v > last) || (dir <= 0 && v < last)) last = v;
    }
    tot += cnt;
  }
  console.log(`${id.padEnd(15)} extrema ${tot}  QRS ${sim.truth.qrsMs}`);
}
