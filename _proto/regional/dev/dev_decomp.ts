// dev: far-field dipole contributions per region at chosen times of one beat (app frame x L, y sup, z ant; ×GAIN_V)
import { simulate } from '../synth.ts';
import { LEADSYS } from '../model.ts';
const GAIN_V = LEADSYS.gainV;
import { CONDITIONS } from '../conditions.ts';
import { apValue, apTauEff } from '../membrane.ts';
const id = process.argv[2] ?? 'normal';
const bi = Number(process.argv[3] ?? 3);
const times = (process.argv[4] ?? '10,20,30,40,50,60,70').split(',').map(Number);
const sim = simulate(CONDITIONS[id], { fs: 500, durationS: 10, seed: 1 });
const b = sim.truth.beats[bi];
const h = sim.heart;
for (const tt of times) {
  const t = b.qrsOnMs + tt;
  const rows: [string, number[]][] = [];
  const tot = [0, 0, 0];
  for (let k = 0; k < h.vregions.length; k++) {
    const r = h.vregions[k];
    const v = [0, 0, 0];
    for (const ev of sim.vEvents) {
      if (ev.face >> 1 !== k) continue;
      if (t < ev.p.t0 || t > ev.p.t0 + 1500) continue;
      const s = apValue(ev.p, t, apTauEff(ev.p));
      const a = (ev.face & 1) === 0 ? r.aIn : r.aOut;
      const rim = r.aRim;
      for (let j = 0; j < 3; j++) v[j] += -GAIN_V * (a[j] + rim[j] / 2) * s * 10;
    }
    for (let j = 0; j < 3; j++) tot[j] += v[j];
    rows.push([r.id, v]);
  }
  rows.sort((x, y) => Math.hypot(...y[1]) - Math.hypot(...x[1]));
  console.log(`t=${tt} total (x L, y sup, z ant, mm) ${tot.map((x) => x.toFixed(1)).join(', ')}`);
  console.log('   ' + rows.slice(0, 22).map(([n, v]) => `${n}(${v.map((x) => x.toFixed(1)).join(',')})`).join(' '));
}
