// dbg_meas.ts — quick per-lead table for one condition (dev). usage: node dbg_meas.ts <id> [--png]
import { generate } from './synth.ts';
import { fiducials, leadMeasures, LEAD_ORDER } from './measure.ts';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const id = process.argv[2] || 'normal';
const t = performance.now();
const r = generate(id, { fs: 500, durationS: 10, seed: 1 });
const ms = performance.now() - t;
const tr = r.truth;
const bs = tr.beats; const mid = bs[Math.floor(bs.length / 2)];
const ix = bs.indexOf(mid);
const f = fiducials(r.leads, 500, mid.qrsOnMs + 20, ix > 0 ? bs[ix - 1].qrsOnMs : null, ix + 1 < bs.length ? bs[ix + 1].qrsOnMs : null);
console.log(`${id}: ${ms.toFixed(0)} ms | truth HR ${tr.hrBpm.toFixed(0)} PR ${tr.prMs?.toFixed(0)} QRS ${tr.qrsMs.toFixed(0)} QT ${tr.qtMs.toFixed(0)} axis ${tr.qrsAxisDeg.toFixed(0)}`);
console.log(`measured beat: PR ${f.pOn === null ? '-' : (f.qrsOn - f.pOn).toFixed(0)} QRS ${(f.qrsOff - f.qrsOn).toFixed(0)} QT ${(f.tOff - f.qrsOn).toFixed(0)}  (truth beat: QRS ${(mid.qrsOffMs - mid.qrsOnMs).toFixed(0)} QT ${(mid.tOffMs - mid.qrsOnMs).toFixed(0)})`);
console.log('lead     P    Pneg   q      R     S     Rp    J    ST60    T    RpkT  area');
for (const nm of LEAD_ORDER) {
  const m = leadMeasures(r.leads[nm], 500, f);
  const mm = (v: number) => (v * 10).toFixed(1).padStart(6); // in mm at 10 mm/mV
  console.log(nm.padEnd(5), mm(m.p), mm(m.pNeg), mm(m.q), mm(m.r), mm(m.s), mm(m.rp), mm(m.j), mm(m.st60), mm(m.t), m.rPeakTime.toFixed(0).padStart(5), m.area.toFixed(0).padStart(6));
}
if (process.argv.includes('--png')) {
  const leads: Record<string, number[]> = {};
  for (const l of LEAD_ORDER) leads[l] = Array.from(r.leads[l as keyof typeof r.leads], (v) => Math.round(v * 1e5) / 1e5);
  const p = new URL('./out/' + id + '.json', import.meta.url);
  writeFileSync(p, JSON.stringify({ fs: 500, title: id, leads }));
  const dir = new URL('./out/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  execFileSync('python', ['-I', 'C:/Users/A511741/Desktop/Workspace/ECG Academy/_proto/harness/render.py', decodeURIComponent(dir) + id + '.json', decodeURIComponent(dir) + id]);
}
