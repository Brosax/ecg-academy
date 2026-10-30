// dbg_af.ts — AF variants defined in code (drivers list): atrial-only f-wave size per lead (p2p and RMS over 4 s, mm)
// and out/dbg/<name>.json for rendering (dev)
// usage: node dbg_af.ts '{"name":"f1","drivers":[{"dir":[0.3,0.2,-1],"cl":145},{"dir":[-1,-0.2,0.3],"cl":165,"ra":true}]}' ...
import { CONDITIONS } from './conditions.ts';
import { generate, lastInternals, weightsFor, LEADS } from './synth.ts';
import { synthesize } from './ecg.ts';
import { DOM } from './geom.ts';
import { ELECTRODES } from './torso.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = new URL('./out/dbg/', import.meta.url); mkdirSync(OUT, { recursive: true });
const base = CONDITIONS.afib.params;
for (const a of process.argv.slice(2)) {
  const sp = JSON.parse(a);
  CONDITIONS.tmp = { rhythm: 'tmp', params: (s) => { const p = base(s); if (sp.drivers && p.rhythm.kind === 'af') p.rhythm.drivers = sp.drivers; if (sp.aAmp) p.aAmp = sp.aAmp; return p; } };
  const r = generate('tmp', { fs: 500, durationS: 10, seed: 1 });
  const leads: Record<string, number[]> = {}; for (const l of LEADS) leads[l] = Array.from(r.leads[l], (x) => Math.round(x * 1e5) / 1e5);
  writeFileSync(new URL(sp.name + '.json', OUT), JSON.stringify({ fs: 500, title: sp.name, leads }));
  const I = lastInternals!; const m = I.model; const g = m.g; const W = weightsFor(m);
  const tpl = { amp: m.amp, rest: m.rest, notch: m.notch, slope: m.slope, cls: m.cls };
  const phi = synthesize(m.acts!, m.nMyo, W.map((w) => w.map((v, i) => (g.dom[i] === DOM.A ? v : 0))), tpl, I.t0, I.phi[0].length, I.dt, 1000 * m.p.gain);
  const e = (nm: string) => ELECTRODES.indexOf(nm as typeof ELECTRODES[number]);
  const k0 = Math.round((2000 - I.t0) / I.dt), k1 = Math.round((6000 - I.t0) / I.dt);
  const row = ['II', 'III', 'aVF', 'I', 'V1', 'V2', 'V6'].map((nm) => {
    const v: number[] = [];
    for (let k = k0; k < k1; k++) { const RA = phi[e('RA')][k], LA = phi[e('LA')][k], LL = phi[e('LL')][k]; v.push(10 * (nm === 'II' ? LL - RA : nm === 'III' ? LL - LA : nm === 'aVF' ? LL - 0.5 * (RA + LA) : nm === 'I' ? LA - RA : phi[e(nm)][k] - (RA + LA + LL) / 3)); }
    const mean = v.reduce((s, x) => s + x, 0) / v.length; const rms = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
    // typical local p2p: median over 200 ms windows
    const p2: number[] = []; const w = Math.round(200 / I.dt); for (let k = 0; k + w < v.length; k += w) { let lo = 1e9, hi = -1e9; for (let q = k; q < k + w; q++) { lo = Math.min(lo, v[q]); hi = Math.max(hi, v[q]); } p2.push(hi - lo); }
    p2.sort((x, y) => x - y);
    return `${nm} p2p ${p2[p2.length >> 1].toFixed(1)} rms ${rms.toFixed(2)}`;
  });
  console.log(`${sp.name}: HR ${r.truth.hrBpm.toFixed(0)} | ${row.join(' | ')}`);
}
