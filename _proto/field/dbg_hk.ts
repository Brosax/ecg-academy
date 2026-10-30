// dbg_hk.ts — hyperkalaemia variants defined in code (where the extra epicardial APD shortening applies, RV transmural
// gradient scaling); prints T per lead and writes out/dbg/<name>.json for rendering (dev)
// usage: node dbg_hk.ts '{"name":"h1","epiLVonly":true,"rvTm":0.3}' ...
import { CONDITIONS } from './conditions.ts';
import { generate, LEADS } from './synth.ts';
import { CH } from './geom.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { smoothstep } from './model.ts';
const OUT = new URL('./out/dbg/', import.meta.url); mkdirSync(OUT, { recursive: true });
const base = CONDITIONS.hyperk.params;
for (const a of process.argv.slice(2)) {
  const sp = JSON.parse(a);
  CONDITIONS.tmp = { rhythm: 'tmp', params: (s) => {
    const p = base(s);
    if (sp.epiLVonly) p.mods[1] = { ...p.mods[1], sel: (S, i) => (S.g.ch[i] === CH.LV ? smoothstep(0.2, 0.9, S.g.tm[i]) : 0) };
    if (sp.rvApd !== undefined) p.mods.push({ sel: (S, i) => (S.g.ch[i] === CH.RV ? smoothstep(0.3, 0.9, S.g.tm[i]) : 0), apdAdd: sp.rvApd });
    if (sp.ovr) Object.assign(p, sp.ovr);
    return p; } };
  const r = generate('tmp', { fs: 500, durationS: 10, seed: 1 });
  const b = r.truth.beats[2]; const k1 = Math.round(b.qrsOffMs / 2), kt = Math.round(b.tOffMs / 2), k0 = Math.round(b.qrsOnMs / 2);
  const row = ['I', 'II', 'III', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V6'].map((nm) => { const x = r.leads[nm as 'I']; const bs = x[k0 - 2]; let T = 0; for (let k = k1 + 20; k < kt; k++) if (Math.abs(x[k] - bs) > Math.abs(T)) T = x[k] - bs; return `${nm} ${(T * 10).toFixed(1)}`; });
  console.log(`${sp.name}: QT ${r.truth.qtMs.toFixed(0)} QRS ${r.truth.qrsMs.toFixed(0)} | ${row.join(' ')}`);
  const leads: Record<string, number[]> = {}; for (const l of LEADS) leads[l] = Array.from(r.leads[l], (x) => Math.round(x * 1e5) / 1e5);
  writeFileSync(new URL(sp.name + '.json', OUT), JSON.stringify({ fs: 500, title: sp.name, leads }));
}
