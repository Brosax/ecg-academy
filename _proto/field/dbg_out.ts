// dbg_out.ts — generate one condition with optional dev overrides into out/dbg/<name>.json for rendering (dev)
// usage: node dbg_out.ts <id> <name> ['<FIELD_OVR json>'] ['<FIELD_COVR json>']
//        then: python -I ../harness/render.py out/dbg/<name>.json out/dbg/<name>
import { generate, LEADS } from './synth.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
const [id, name, ovr, covr] = process.argv.slice(2);
if (ovr) process.env.FIELD_OVR = ovr;
if (covr) process.env.FIELD_COVR = covr;
const OUT = new URL('./out/dbg/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const r = generate(id, { fs: 500, durationS: 10, seed: 1 });
const leads: Record<string, number[]> = {};
for (const l of LEADS) leads[l] = Array.from(r.leads[l], (v) => Math.round(v * 1e5) / 1e5);
writeFileSync(new URL(name + '.json', OUT), JSON.stringify({ fs: 500, title: name, leads }));
const t = r.truth;
console.log(`${name}: HR ${t.hrBpm.toFixed(0)} PR ${t.prMs === null ? '-' : t.prMs.toFixed(0)} QRS ${t.qrsMs.toFixed(0)} QT ${t.qtMs.toFixed(0)} axis ${t.qrsAxisDeg.toFixed(0)} beats ${t.beats.length}`);
