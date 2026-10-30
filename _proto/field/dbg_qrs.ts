// dbg_qrs.ts — compact QRS morphology of one beat per lead for a few conditions under shared overrides: the QRS as a
// sequence of extrema (mm at 10 mm/mV, with their times in ms after QRS onset), plus QRS duration and axis (dev)
// usage: node dbg_qrs.ts '<FIELD_OVR or empty>' id1 id2 ...   (env LEADS=I,aVL,V1 to choose leads)
import { generate } from './synth.ts';
const ovr = process.argv[2]; if (ovr) process.env.FIELD_OVR = ovr;
const ids = process.argv.slice(3).length ? process.argv.slice(3) : ['normal', 'rbbb', 'lbbb'];
const leads = (process.env.LEADS || 'I,II,aVL,aVF,V1,V2,V4,V6').split(',');
for (const id of ids) {
  const r = generate(id, { fs: 1000, durationS: 2.4, seed: 1 });
  const b = r.truth.beats[1] ?? r.truth.beats[0];
  const k0 = Math.round(b.qrsOnMs), k1 = Math.round(b.qrsOffMs) + 10;
  console.log(`${id}: QRS ${(b.qrsOffMs - b.qrsOnMs).toFixed(0)} ms, axis ${r.truth.qrsAxisDeg.toFixed(0)}, QT ${r.truth.qtMs.toFixed(0)}`);
  for (const nm of leads) {
    const x = r.leads[nm as 'I']; const base = x[k0 - 3];
    // extrema with prominence > 0.3 mm
    const ex: string[] = []; let last = 0, lastK = k0, dir = 0;
    for (let k = k0; k <= k1; k++) {
      const v = (x[k] - base) * 10;
      if (dir >= 0 && v > last) { last = v; lastK = k; dir = 1; }
      else if (dir <= 0 && v < last) { last = v; lastK = k; dir = -1; }
      else if ((dir > 0 && last - v > 0.3) || (dir < 0 && v - last > 0.3)) { if (Math.abs(last) > 0.25) ex.push(`${last.toFixed(1)}@${lastK - k0}`); dir = -dir; last = v; lastK = k; }
    }
    if (Math.abs(last) > 0.25) ex.push(`${last.toFixed(1)}@${lastK - k0}`);
    console.log(`  ${nm.padEnd(4)} ${ex.join('  ')}`);
  }
}
