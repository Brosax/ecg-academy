// dbg_lb.ts — LBBB variants defined in code (LV retrograde Purkinje engagement, regional CV): prints the lateral QRS
// and T, V1, QRS duration, and writes out/dbg/<name>.json for rendering (dev)
// usage: node dbg_lb.ts '{"name":"l1","retro":10,"lvV":0.8,"septV":1}' ...
import { CONDITIONS } from './conditions.ts';
import { defaultParams, sel } from './model.ts';
import { SF } from './geom.ts';
import { generate, LEADS } from './synth.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = new URL('./out/dbg/', import.meta.url); mkdirSync(OUT, { recursive: true });
for (const a of process.argv.slice(2)) {
  const sp = JSON.parse(a);
  CONDITIONS.tmp = { rhythm: 'tmp', params: () => {
    const p = defaultParams(); p.fasc.lsf = null; p.fasc.laf = null; p.fasc.lpf = null;
    if (sp.retro !== undefined) { p.pmjRetro = sp.retro; p.retroRV = false; p.retroLV = true; }
    if (sp.lvV) p.mods.push({ sel: sel.lv, vScale: sp.lvV });
    if (sp.septV) p.mods.push({ sel: (s, i) => ((s.g.sf[i] & SF.SEPTAL) ? 1 : 0), vScale: sp.septV });
    if (sp.vPurk) p.vPurk = sp.vPurk;
    return p; } };
  const r = generate('tmp', { fs: 1000, durationS: 2.4, seed: 1 });
  const b = r.truth.beats[1]; const k0 = Math.round(b.qrsOnMs), k1 = Math.round(b.qrsOffMs), kt = Math.round(b.tOffMs);
  const L = r.leads as unknown as Record<string, Float32Array>;
  const f = (nm: string) => { const x = L[nm], base = x[k0 - 3]; let R = 0, S = 0, T = 0; for (let k = k0; k <= k1; k++) { R = Math.max(R, x[k] - base); S = Math.min(S, x[k] - base); } for (let k = k1 + 40; k < kt; k++) if (Math.abs(x[k] - base) > Math.abs(T)) T = x[k] - base; return `${nm} ${(R * 10).toFixed(1)}/${(S * 10).toFixed(1)} T${(T * 10).toFixed(1)}`; };
  console.log(`${sp.name}: QRS ${(b.qrsOffMs - b.qrsOnMs).toFixed(0)} axis ${r.truth.qrsAxisDeg.toFixed(0)} | ${['I', 'aVL', 'V1', 'V2', 'V5', 'V6'].map(f).join(' | ')}`);
  const g10 = generate('tmp', { fs: 500, durationS: 10, seed: 1 });
  const leads: Record<string, number[]> = {}; for (const l of LEADS) leads[l] = Array.from(g10.leads[l], (v) => Math.round(v * 1e5) / 1e5);
  writeFileSync(new URL(sp.name + '.json', OUT), JSON.stringify({ fs: 500, title: sp.name, leads }));
}
