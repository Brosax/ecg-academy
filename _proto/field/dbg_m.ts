// dbg_m.ts — per-lead morphology table in mm (10 mm/mV) from the signals, beat chosen from truth (dev).
// usage: node dbg_m.ts <id> ['<ovr json>' ...]
import { generate } from './synth.ts';
import { fiducials, leadMeasures, LEAD_ORDER } from './measure.ts';
const id = process.argv[2] || 'normal';
const ovrs = process.argv.slice(3).length ? process.argv.slice(3) : [''];
for (const o of ovrs) {
  if (o) process.env.FIELD_OVR = o; else delete process.env.FIELD_OVR;
  const r = generate(id, { fs: 500, durationS: 4, seed: 1 });
  const bs = r.truth.beats; const bi = Math.min(2, bs.length - 1); const b = bs[bi];
  if (!b) { console.log('no beats'); continue; }
  const f = fiducials(r.leads, 500, b.qrsOnMs + 20, bi > 0 ? bs[bi - 1].qrsOnMs : null, bs[bi + 1] ? bs[bi + 1].qrsOnMs : null);
  const t = r.truth;
  console.log(`${id} ${o}\n truth HR ${t.hrBpm.toFixed(0)} PR ${t.prMs?.toFixed(0)} QRS ${t.qrsMs.toFixed(0)} QT ${t.qtMs.toFixed(0)} axis ${t.qrsAxisDeg.toFixed(0)} | meas PR ${f.pOn === null ? '-' : (f.qrsOn - f.pOn).toFixed(0)} QRS ${(f.qrsOff - f.qrsOn).toFixed(0)} QT ${(f.tOff - f.qrsOn).toFixed(0)}`);
  console.log(' lead     q     R     S    R\'   J   ST60    T     P    P-  RPT');
  for (const nm of LEAD_ORDER) {
    const m = leadMeasures(r.leads[nm as keyof typeof r.leads], 500, { ...f, qrsOn: b.qrsOnMs, qrsOff: b.qrsOffMs, tOff: b.tOffMs, pOn: b.pOnMs });
    const v = (x: number) => (x * 10).toFixed(1).padStart(5);
    console.log(` ${nm.padEnd(4)} ${v(m.q)} ${v(m.r)} ${v(m.s)} ${v(m.rp)} ${v(m.j)} ${v(m.st60)} ${v(m.t)} ${v(m.p)} ${v(m.pNeg)} ${m.rPeakTime.toFixed(0).padStart(4)}`);
  }
}
