// dev: grid of notch depths over RV regions for Brugada: maximise V1/V2 J+20 vs |ST| elsewhere
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADS } from '../leadfield.ts';
const base = CONDITIONS['brugada-type1'];
const lv = [0, 0.1, 0.2, 0.3];
const res: [number, string][] = [];
for (const a of lv) for (const b of lv) for (const c of lv) for (const d of [0, 0.1, 0.2]) {
  const regions: Record<string, unknown> = {};
  const set = (id: string, x: number) => { if (x > 0) regions[id] = { notchOut: { depth: x, d1: 0, d2: 280 }, dApdOut: 15 }; };
  set('rv_free', a); set('rv_ant', b); set('rvot', c); set('rv_apex', d);
  if (!Object.keys(regions).length) continue;
  const sim = simulate({ ...base, regions } as any, { fs: 500, durationS: 2.5, seed: 1 });
  const bt = sim.truth.beats[1];
  const st: Record<string, number> = {};
  for (const l of LEADS) {
    const x = sim.leads[l];
    const i0 = Math.round((bt.qrsOnMs - 15) / 2), i1 = Math.round((bt.qrsOffMs + 30) / 2);
    st[l] = (x[i1] - x[i0]) * 10;
  }
  // reference: the normal heart's ST at the same point
  const v12 = Math.min(st.V1, st.V2);
  const other = Math.max(...['I', 'II', 'III', 'aVL', 'aVF', 'V4', 'V5', 'V6'].map((l) => Math.abs(st[l])));
  res.push([v12 / Math.max(0.3, other), `free ${a} ant ${b} rvot ${c} apex ${d}: V1 ${st.V1.toFixed(1)} V2 ${st.V2.toFixed(1)} V3 ${st.V3.toFixed(1)} other max ${other.toFixed(1)} (V5 ${st.V5.toFixed(1)} V6 ${st.V6.toFixed(1)} I ${st.I.toFixed(1)} III ${st.III.toFixed(1)})`]);
}
res.sort((x, y) => y[0] - x[0]);
for (const r of res.slice(0, 12)) console.log(r[0].toFixed(2), r[1]);
