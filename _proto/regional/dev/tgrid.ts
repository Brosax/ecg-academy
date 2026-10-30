// dev (review): grid search of repolarisation parameters for one condition; scores T-wave smoothness — ST-T extrema
// (zigzag 0.3 mm, |v| ≥ 15 % of the T peak) beyond one per lobe of alternating sign are notches / humps —
// and prints T amplitudes of chosen leads. Usage: node dev/tgrid.ts <id> '<json array of patches>' [leads]
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';
import { LEADS } from '../leadfield.ts';
const [id, patchesS, leadsS] = process.argv.slice(2);
const show = (leadsS ?? 'I,II,III,aVL,V1,V2,V3,V4,V6').split(',');
export function notches(v: (t: number) => number, a: number, z: number): number {
  let big = 0;
  for (let t = a; t < z; t++) if (Math.abs(v(t)) > Math.abs(big)) big = v(t);
  // zigzag extrema (direction reversals of at least 0.3 mm), kept when |y| ≥ 15 % of the T peak
  const ext: number[] = [];
  let lastY = v(a), dir = 0;
  for (let t = a + 1; t < z; t++) {
    const y = v(t);
    if (dir >= 0 && y < lastY - 0.3) { if (dir > 0) ext.push(lastY); dir = -1; lastY = y; }
    else if (dir <= 0 && y > lastY + 0.3) { if (dir < 0) ext.push(lastY); dir = 1; lastY = y; }
    else if ((dir > 0 && y > lastY) || (dir < 0 && y < lastY)) lastY = y;
  }
  const sig = ext.filter((y) => Math.abs(y) >= 0.15 * Math.abs(big));
  let changes = 0;
  for (let i = 1; i < sig.length; i++) if (Math.sign(sig[i]) !== Math.sign(sig[i - 1])) changes++;
  // shoulders: on a monotone stretch the slope nearly stops (local minimum of |slope| < 20 % of the steepest slope)
  let smax = 0;
  const sl = (t: number) => (v(t + 3) - v(t - 3)) / 6;
  for (let t = a + 3; t < z - 3; t++) smax = Math.max(smax, Math.abs(sl(t)));
  let shoulders = 0;
  for (let t = a + 6; t < z - 6; t++) {
    const s0 = sl(t);
    if (Math.abs(v(t)) < 0.25 * Math.abs(big)) continue;
    if (Math.abs(s0) < Math.abs(sl(t - 1)) && Math.abs(s0) <= Math.abs(sl(t + 1)) && Math.abs(s0) < 0.2 * smax &&
      Math.sign(sl(t - 6)) === Math.sign(sl(t + 6)) && Math.abs(sl(t - 6)) > 0.3 * smax && Math.abs(sl(t + 6)) > 0.3 * smax) shoulders++;
  }
  return Math.max(0, sig.length - 1 - changes) + shoulders;
}
for (const patch of JSON.parse(patchesS)) {
  const c0 = CONDITIONS[id];
  const cond = { ...c0 } as any;
  for (const k of ['rhythm', 'vcond', 'vrep', 'regions', 'heart', 'atria']) if (patch[k]) cond[k] = { ...(c0 as any)[k], ...patch[k] };
if (patch['regions!']) cond.regions = patch['regions!']; // replace (not merge) the regional modifiers
  const sim = simulate(cond, { fs: 1000, durationS: 4, seed: 1 });
  const b = sim.truth.beats[1];
  let extra = 0;
  const amps: string[] = [];
  const bad: string[] = [];
  for (const l of LEADS) {
    const x = (sim.leads as any)[l] as Float32Array;
    let base = 0; for (let i = Math.round(b.qrsOnMs - 22); i < Math.round(b.qrsOnMs - 2); i++) base += x[i]; base /= 20;
    const v = (t: number) => (x[Math.round(t)] - base) * 10;
    const n = notches(v, Math.round(b.qrsOffMs + 30), Math.round(b.tOffMs + 80));
    let big = 0; for (let t = b.qrsOffMs + 30; t < b.tOffMs + 60; t++) if (Math.abs(v(t)) > Math.abs(big)) big = v(t);
    if (n > 0) { extra += n; bad.push(`${l}+${n}`); }
    if (show.includes(l)) amps.push(`${l} ${big.toFixed(1)}`);
  }
  const qtc = sim.truth.qtMs / Math.sqrt(60 / sim.truth.hrBpm);
  console.log(`notches ${String(extra).padStart(2)} QT ${sim.truth.qtMs} QTc ${qtc.toFixed(0)} | ${amps.join(' ')} | ${bad.join(' ')} | ${JSON.stringify(patch)}`);
}
