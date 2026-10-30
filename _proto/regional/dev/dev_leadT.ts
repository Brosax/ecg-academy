// dev: per-region contribution to one lead at times after QRS onset given as a list. Usage: node dev_leadT.ts id lead t1,t2,...
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
const [id, lead, ts] = [process.argv[2], process.argv[3], (process.argv[4] ?? '0').split(',').map(Number)];
const fs = 500;
const sim = simulate(CONDITIONS[id], { fs, durationS: 6, seed: 1, trace: true });
const coef: Record<string, number[]> = {
  I: [-1, 1, 0, 0, 0, 0, 0, 0, 0], II: [-1, 0, 1, 0, 0, 0, 0, 0, 0], III: [0, -1, 1, 0, 0, 0, 0, 0, 0],
  aVR: [1, -0.5, -0.5, 0, 0, 0, 0, 0, 0], aVL: [-0.5, 1, -0.5, 0, 0, 0, 0, 0, 0], aVF: [-0.5, -0.5, 1, 0, 0, 0, 0, 0, 0],
};
['V1', 'V2', 'V3', 'V4', 'V5', 'V6'].forEach((v, k) => { const c = [-1 / 3, -1 / 3, -1 / 3, 0, 0, 0, 0, 0, 0]; c[3 + k] = 1; coef[v] = c; });
const b = sim.truth.beats[3];
const i0 = Math.round((b.qrsOnMs - 10) * fs / 1000);
for (const tt of ts) {
  const i = Math.round((b.qrsOnMs + tt) * fs / 1000);
  const per = sim.regPhi!.map((rows, k) => { let v = 0; for (let e = 0; e < 9; e++) v += coef[lead][e] * (rows[e][i] - rows[e][i0]); return [sim.heart.vregions[k].id, v * 10] as [string, number]; });
  const tot = per.reduce((a, x) => a + x[1], 0);
  per.sort((a, c) => Math.abs(c[1]) - Math.abs(a[1]));
  console.log(`t=${tt} ${lead} total ${tot.toFixed(1)} mm: ` + per.slice(0, 10).map(([n, v]) => `${n} ${v.toFixed(1)}`).join(', '));
}
