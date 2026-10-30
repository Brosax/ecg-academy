// dbg_brug2.ts — Brugada substrate selected in body coordinates (RVOT + anterior RV free wall under V1-V2) (dev)
// usage: node dbg_brug2.ts '{"yLo":-20,"zLo":40,"xLo":-30,"xHi":40,"tm0":0.15,"tm1":0.5,"apd":70,"notch":0.95,"v":0.5,"rvot":1}' ...
import { CONDITIONS } from './conditions.ts';
import { defaultParams, smoothstep } from './model.ts';
import type { Sites } from './model.ts';
import { CH, SF } from './geom.ts';
import { generate } from './synth.ts';
for (const a of process.argv.slice(2)) {
  const sp = JSON.parse(a);
  let cnt = 0;
  const selF = (s: Sites, i: number) => {
    const g = s.g; if (g.ch[i] !== CH.RV) return 0;
    const epi = smoothstep(sp.tm0 ?? 0.15, sp.tm1 ?? 0.5, g.tm[i]);
    const x = g.pos[3 * i], y = g.pos[3 * i + 1], z = g.pos[3 * i + 2];
    const cap = 1 - smoothstep((sp.yHi ?? 999) - 8, sp.yHi ?? 999, y);
    if ((g.sf[i] & SF.RVOT) && (sp.rvot ?? 1)) return epi * cap;
    const w = cap * smoothstep(sp.yLo, sp.yLo + 8, y) * smoothstep(sp.zLo, sp.zLo + 8, z) * smoothstep(sp.xLo, sp.xLo + 8, x) * (1 - smoothstep(sp.xHi - 8, sp.xHi, x));
    if (w * epi > 0.5) cnt++;
    return w * epi;
  };
  CONDITIONS.tmp = { rhythm: 'tmp', params: () => { const p = defaultParams(); p.mods.push({ sel: selF, notch: sp.notch ?? 0.95, cls: 4, apdAdd: sp.apd ?? 70, vScale: sp.v ?? 0.5 }); return p; } };
  const r = generate('tmp', { fs: 500, durationS: 3, seed: 1 });
  const b = r.truth.beats[1]; const k0 = Math.round(b.qrsOnMs / 2) - 3, kj = Math.round(b.qrsOffMs / 2);
  console.log(a, 'QRS', (b.qrsOffMs - b.qrsOnMs).toFixed(0), 'extra nodes', cnt);
  for (const nm of ['V1', 'V2', 'V3', 'II', 'aVF']) { const x = r.leads[nm as 'I']; const o: string[] = []; for (let k = kj - 20; k < kj + 180; k += 10) o.push(((x[k] - x[k0]) * 10).toFixed(1).padStart(5)); console.log('  ', nm.padEnd(3), o.join('')); }
}
