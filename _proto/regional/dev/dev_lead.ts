// dev: per-region contribution (mm) to one lead over a beat. Usage: node dev_lead.ts <id> <lead> [beat] [step] [patch json]
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
const id = process.argv[2] ?? 'normal';
const lead = process.argv[3] ?? 'V1';
const bi = Number(process.argv[4] ?? 3);
const step = Number(process.argv[5] ?? 10);
const fs = 500;
const patch = JSON.parse(process.argv[6] ?? '{}');
const cond = { ...CONDITIONS[id] } as any;
for (const k of ['rhythm', 'vcond', 'vrep', 'regions', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(CONDITIONS[id] as any)[k], ...patch[k] };
const sim = simulate(cond, { fs, durationS: 6, seed: 1, trace: true });
const h = sim.heart;
const coef: Record<string, number[]> = {
  I: [-1, 1, 0, 0, 0, 0, 0, 0, 0], II: [-1, 0, 1, 0, 0, 0, 0, 0, 0], III: [0, -1, 1, 0, 0, 0, 0, 0, 0],
  aVR: [1, -0.5, -0.5, 0, 0, 0, 0, 0, 0], aVL: [-0.5, 1, -0.5, 0, 0, 0, 0, 0, 0], aVF: [-0.5, -0.5, 1, 0, 0, 0, 0, 0, 0],
};
['V1', 'V2', 'V3', 'V4', 'V5', 'V6'].forEach((v, k) => { const c = [-1 / 3, -1 / 3, -1 / 3, 0, 0, 0, 0, 0, 0]; c[3 + k] = 1; coef[v] = c; });
const b = sim.truth.beats[bi];
console.log(`${id} ${lead} beat ${bi} qrs ${b.qrsOnMs}..${b.qrsOffMs} (${(b.qrsOffMs - b.qrsOnMs).toFixed(0)} ms) — per-region contribution, mm`);
const ids = h.vregions.map((r) => r.id);
console.log('  t  ' + ids.map((s) => s.replace('_', '').slice(0, 6).padStart(7)).join('') + '   total  lead');
const x = sim.leads[lead as keyof typeof sim.leads];
const i0 = Math.round((b.qrsOnMs - 10) * fs / 1000);
for (let tt = -10; tt <= b.qrsOffMs - b.qrsOnMs + 20; tt += step) {
  const i = Math.round((b.qrsOnMs + tt) * fs / 1000);
  let tot = 0;
  const per = sim.regPhi!.map((rows) => { let v = 0; for (let e = 0; e < 9; e++) v += coef[lead][e] * (rows[e][i] - rows[e][i0]); tot += v; return v * 10; });
  console.log(String(tt).padStart(4) + ' ' + per.map((v) => v.toFixed(1).padStart(7)).join('') + (tot * 10).toFixed(1).padStart(8) + ((x[i] - x[i0]) * 10).toFixed(1).padStart(6));
}
