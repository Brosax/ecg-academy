// dbg_rb.ts — RBBB variants defined in code: retrograde RV Purkinje engagement delay, RV Purkinje speed, RV
// myocardial CV; prints V1 r / R' (and R' width above half height), I and V6 R / terminal S, axis, QRS, and writes
// out/dbg/<name>.json for rendering (dev)
// usage: node dbg_rb.ts '{"name":"r1","retro":8,"vPurkRV":0.8,"rvV":0.8}' ...
import { CONDITIONS } from './conditions.ts';
import { defaultParams, sel } from './model.ts';
import { generate, LEADS } from './synth.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = new URL('./out/dbg/', import.meta.url); mkdirSync(OUT, { recursive: true });
for (const a of process.argv.slice(2)) {
  const sp = JSON.parse(a);
  CONDITIONS.tmp = { rhythm: 'tmp', params: () => {
    const p = defaultParams(); p.fasc.rbb = null; p.retroLV = false;
    p.pmjRetro = sp.retro === undefined ? 8 : sp.retro;
    if (sp.vPurkRV) p.vPurkRV = sp.vPurkRV;
    if (sp.rvV) p.mods.push({ sel: sel.rv, vScale: sp.rvV });
    if (sp.ovr) Object.assign(p, sp.ovr);
    return p; } };
  const r = generate('tmp', { fs: 1000, durationS: 2.4, seed: 1 });
  const b = r.truth.beats[1]; const k0 = Math.round(b.qrsOnMs), k1 = Math.round(b.qrsOffMs);
  const L = r.leads as unknown as Record<string, Float32Array>;
  const v = (nm: string, k: number) => (L[nm][k] - L[nm][k0 - 3]) * 10;
  let r1 = 0; for (let k = k0; k < k0 + 35; k++) r1 = Math.max(r1, v('V1', k));
  let sk = k0 + 20; for (let k = k0 + 20; k < k0 + 60; k++) if (v('V1', k) < v('V1', sk)) sk = k;
  let rp = 0; for (let k = sk; k <= k1 + 5; k++) rp = Math.max(rp, v('V1', k));
  let w = 0; for (let k = sk; k <= k1 + 10; k++) if (v('V1', k) > 0.5 * rp) w++;
  const RS = (nm: string) => { let R = 0, S = 0; for (let k = k0; k <= k1; k++) { R = Math.max(R, v(nm, k)); if (k > k0 + 0.45 * (k1 - k0)) S = Math.min(S, v(nm, k)); } return `${R.toFixed(1)}/${S.toFixed(1)}`; };
  console.log(`${sp.name}: QRS ${(b.qrsOffMs - b.qrsOnMs).toFixed(0)} axis ${r.truth.qrsAxisDeg.toFixed(0)} | V1 r ${r1.toFixed(1)} R' ${rp.toFixed(1)} w${w} | I ${RS('I')} V6 ${RS('V6')} V2 ${RS('V2')}`);
  const g10 = generate('tmp', { fs: 500, durationS: 10, seed: 1 });
  const leads: Record<string, number[]> = {}; for (const l of LEADS) leads[l] = Array.from(g10.leads[l], (x) => Math.round(x * 1e5) / 1e5);
  writeFileSync(new URL(sp.name + '.json', OUT), JSON.stringify({ fs: 500, title: sp.name, leads }));
}
