/**
 * Dev tool: print the far-field heart vector (Frank X left, Y inferior, Z posterior) of one beat every 4 ms, from the
 * Dower-reconstructed leads (inverse Kors would also do; here we just print I, aVF, V2, V6 and the window).
 * Usage: node vcg.ts <id> [beatIndex]
 */
import { simulate } from '../synth.ts';
import { CONDITIONS } from '../conditions.ts';

const id = process.argv[2] ?? 'normal';
const bi = Number(process.argv[3] ?? 3);
const sim = simulate(CONDITIONS[id], { fs: 1000, durationS: 10, seed: 1 });
const b = sim.truth.beats[bi];
const L = sim.leads;
const step = 4;
console.log(`beat ${bi}: qrs ${b.qrsOnMs}..${b.qrsOffMs} tOff ${b.tOffMs}`);
console.log('  t(ms)    I     II    aVF   V1    V2    V3    V4    V5    V6  | Kors X(L) Y(inf) Z(post)  (mm)');
// Kors regression (Kors 1990): rows X, Y, Z over I, II, V1..V6
const K = [
  [0.38, -0.07, -0.13, 0.05, -0.01, 0.14, 0.06, 0.54],
  [-0.07, 0.93, 0.06, -0.02, -0.05, 0.06, -0.17, 0.13],
  [0.11, -0.23, -0.43, -0.06, -0.14, -0.2, -0.11, 0.31],
];
const ORD = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const from = Math.round(b.qrsOnMs - 20), to = Math.round(b.qrsOffMs + 20);
for (let t = from; t <= to; t += step) {
  const i = t; // fs 1000
  const f = (l: string) => (L[l as keyof typeof L][i] * 10).toFixed(1).padStart(6);
  const xyz = K.map((row) => row.reduce((s, k, j) => s + k * L[ORD[j] as keyof typeof L][i], 0) * 10);
  console.log(`  ${(t - b.qrsOnMs).toFixed(0).padStart(4)} ${f('I')}${f('II')}${f('aVF')}${f('V1')}${f('V2')}${f('V3')}${f('V4')}${f('V5')}${f('V6')}  | ${xyz.map((v) => v.toFixed(1).padStart(6)).join('')}`);
}
