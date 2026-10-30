// dbg_ident.ts — review check of the public interface: for every condition, Einthoven/Goldberger identities on the
// in-memory Float32 leads (not the rounded JSON), lead lengths, truth fields, and regions.activityAt ranges (dev)
import { generate, LEADS } from './synth.ts';
import { CONDITIONS } from './conditions.ts';
let worst = 0;
for (const id of Object.keys(CONDITIONS)) {
  const r = generate(id, { fs: 500, durationS: 10, seed: 1 });
  const L = r.leads; let e = 0;
  for (let k = 0; k < L.I.length; k++) {
    e = Math.max(e, Math.abs(L.III[k] - (L.II[k] - L.I[k])), Math.abs(L.aVR[k] + (L.I[k] + L.II[k]) / 2), Math.abs(L.aVL[k] - (L.I[k] - L.II[k] / 2)), Math.abs(L.aVF[k] - (L.II[k] - L.I[k] / 2)));
  }
  worst = Math.max(worst, e);
  const lens = new Set(LEADS.map((l) => L[l].length));
  const t = r.truth;
  let amin = 1, amax = 0; for (let tm = 0; tm < 10000; tm += 37) { const a = r.regions.activityAt(tm); for (const v of a) { amin = Math.min(amin, v); amax = Math.max(amax, v); } }
  console.log(`${id.padEnd(15)} identity max err ${e.toExponential(1)} mV | samples ${[...lens].join(',')} | HR ${t.hrBpm.toFixed(0)} PR ${t.prMs === null ? '-' : t.prMs.toFixed(0)} QRS ${t.qrsMs.toFixed(0)} QT ${t.qtMs.toFixed(0)} axis ${t.qrsAxisDeg.toFixed(0)} beats ${t.beats.length} | regions ${r.regions.names.length} activity ${amin.toFixed(2)}..${amax.toFixed(2)}`);
}
console.log('worst identity error (float32 leads):', worst.toExponential(2), 'mV');
