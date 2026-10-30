// dev (review): evaluate a list of JSON patches for one condition and print compact morphology metrics per patch.
// Usage: node dev/sweep.ts <id> '<json array of patches>' [leads]
// Metrics per lead: notch = deepest dip between the two largest same-sign QRS peaks / smaller of them (1 = no notch),
// R / S (mm), J+40 (mm), T extremes (mm), late opposite-polarity T tail (mm).
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';

const [id, patchesS, leadsS] = process.argv.slice(2);
const patches: any[] = JSON.parse(patchesS ?? '[{}]');
const leads = (leadsS ?? 'I,aVL,V1,V2,V3,V5,V6').split(',');
const fs = 1000;
for (const patch of patches) {
  const c0 = CONDITIONS[id];
  const cond = { ...c0 } as any;
  for (const k of ['rhythm', 'vcond', 'vrep', 'regions', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(c0 as any)[k], ...patch[k] };
if (patch['regions!']) cond.regions = patch['regions!']; // replace (not merge) the regional modifiers
  if (patch.regionsAll) { cond.regions = { ...cond.regions }; for (const r of Object.keys(cond.regions)) cond.regions[r] = { ...cond.regions[r], ...patch.regionsAll }; }
  const sim = simulate(cond, { fs, durationS: 5, seed: 1 });
  const b = sim.truth.beats[2];
  const out: string[] = [];
  for (const l of leads) {
    const x = (sim.leads as any)[l] as Float32Array;
    let base = 0; for (let i = Math.round(b.qrsOnMs - 22); i < Math.round(b.qrsOnMs - 2); i++) base += x[i]; base /= 20;
    const v = (t: number) => (x[Math.round(t)] - base) * 10;
    let R = 0, S = 0, tR = 0;
    for (let t = b.qrsOnMs; t <= b.qrsOffMs; t++) { if (v(t) > R) { R = v(t); tR = t - b.qrsOnMs; } if (v(t) < S) S = v(t); }
    // local maxima above 30 % of R
    const pk: { t: number; v: number }[] = [];
    for (let t = b.qrsOnMs + 1; t < b.qrsOffMs; t++) if (v(t) > 0.3 * R && v(t) >= v(t - 1) && v(t) > v(t + 1)) pk.push({ t, v: v(t) });
    let notch = 1;
    if (pk.length >= 2) {
      pk.sort((p, q) => q.v - p.v);
      const [p1, p2] = [pk[0], pk[1]].sort((p, q) => p.t - q.t);
      let mn = Infinity; for (let t = p1.t; t <= p2.t; t++) mn = Math.min(mn, v(t));
      notch = mn / Math.min(p1.v, p2.v);
    }
    let tMax = -Infinity, tMin = Infinity, tMaxT = 0, tMinT = 0;
    for (let t = b.qrsOffMs + 60; t < b.tOffMs + 60; t++) { const y = v(t); if (y > tMax) { tMax = y; tMaxT = t; } if (y < tMin) { tMin = y; tMinT = t; } }
    const tail = Math.abs(tMax) > Math.abs(tMin) ? (tMinT > tMaxT ? tMin : 0) : (tMaxT > tMinT ? tMax : 0);
    const T = Math.abs(tMax) > Math.abs(tMin) ? tMax : tMin;
    // number of T-wave extrema (prominence 0.4 mm) between J+60 and T end + 40
    let nT = 0, lastY = v(b.qrsOffMs + 60);
    for (let t = b.qrsOffMs + 61; t < b.tOffMs + 40; t++) { const y = v(t); if (((y > v(t - 1) && y >= v(t + 1)) || (y < v(t - 1) && y <= v(t + 1))) && Math.abs(y - lastY) >= 0.4) { nT++; lastY = y; } }
    // half-height width (ms) of the largest-magnitude QRS deflection
    const big = R >= -S ? R : S;
    let tb = b.qrsOnMs; for (let t = b.qrsOnMs; t <= b.qrsOffMs; t++) if (Math.abs(v(t)) > Math.abs(v(tb))) tb = t;
    let ta = tb, tz = tb;
    while (ta > b.qrsOnMs - 20 && v(ta) / big > 0.5) ta--;
    while (tz < b.qrsOffMs + 20 && v(tz) / big > 0.5) tz++;
    out.push(`${l}: R${R.toFixed(1)}@${tR} S${S.toFixed(1)} w${tz - ta} n${notch.toFixed(2)} st${v(b.qrsOffMs + 40).toFixed(1)} T${T.toFixed(1)}/${nT} tail${tail.toFixed(1)}`);
  }
  console.log(`${JSON.stringify(patch)}\n  QRS ${sim.truth.qrsMs} QT ${sim.truth.qtMs} axis ${sim.truth.qrsAxisDeg} | ${out.join(' | ')}`);
}
