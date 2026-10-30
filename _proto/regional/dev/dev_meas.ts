// dev: measured vs truth fiducials per beat
import { generate } from '../synth.ts';
import { detectBeats } from '../measure.ts';
const id = process.argv[2] ?? 'vt';
const r = generate(id, { fs: 500, durationS: 10, seed: 1 });
const mb = detectBeats(r.leads, 500, { pWave: r.truth.prMs !== null });
for (const t of r.truth.beats.slice(0, 8)) {
  const m = mb.find((x) => Math.abs(x.qrsOn - t.qrsOnMs) < 60);
  console.log(`truth on ${t.qrsOnMs} off ${t.qrsOffMs} tOff ${t.tOffMs} | meas ${m ? `on ${m.qrsOn} off ${m.qrsOff} tOff ${m.tOff.toFixed(0)}` : '-'}`);
}
