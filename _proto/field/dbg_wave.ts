// dbg_wave.ts — print a lead's samples (mm) through the QRS of beat 1 (dev). usage: node dbg_wave.ts <id> <lead,lead> ['<ovr>']
import { generate } from './synth.ts';
const id = process.argv[2]; const leads = (process.argv[3] || 'V1').split(',');
if (process.argv[4]) process.env.FIELD_OVR = process.argv[4];
const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
const b = r.truth.beats[1];
const k0 = Math.round(b.qrsOnMs / 2) - 3, k1 = Math.round(b.qrsOffMs / 2) + 10;
console.log('QRS', (b.qrsOffMs - b.qrsOnMs).toFixed(0), 'samples every 4 ms from onset-6ms');
for (const nm of leads) { const x = r.leads[nm as 'I']; const out: string[] = []; for (let k = k0; k <= k1; k += 2) out.push(((x[k] - x[k0]) * 10).toFixed(1)); console.log(nm.padEnd(4), out.join(' ')); }
