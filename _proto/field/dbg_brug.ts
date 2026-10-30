// dbg_brug.ts — try Brugada RVOT/anterior-RV epicardial regions (dev)
import { CONDITIONS } from './conditions.ts';
import { defaultParams, angWin, smoothstep } from './model.ts';
import type { Sites } from './model.ts';
import { CH, SF } from './geom.ts';
import { generate } from './synth.ts';
for (const a of process.argv.slice(2)) {
  const sp = JSON.parse(a);
  const selF = (s: Sites, i: number) => {
    const g = s.g; const epi = smoothstep(sp.tm0 ?? 0.25, sp.tm1 ?? 0.6, g.tm[i]);
    if (g.sf[i] & SF.RVOT) return epi;
    if (g.ch[i] !== CH.RV) return 0;
    return (sp.w ?? 1) * epi * smoothstep(sp.ab0, sp.ab0 + 0.15, g.ab[i]) * angWin(g.th[i], sp.th0, sp.th1, 30);
  };
  CONDITIONS.tmp = { rhythm: 'tmp', params: () => { const p = defaultParams(); p.mods.push({ sel: selF, notch: sp.notch ?? 0.75, cls: 4, apdAdd: sp.apd ?? 55, vScale: sp.v ?? 0.5 }); return p; } };
  const r = generate('tmp', { fs: 500, durationS: 3, seed: 1 });
  const b = r.truth.beats[1]; const k0 = Math.round(b.qrsOnMs / 2) - 3, kj = Math.round(b.qrsOffMs / 2);
  console.log(a, 'QRS', (b.qrsOffMs - b.qrsOnMs).toFixed(0));
  for (const nm of ['V1', 'V2', 'V3', 'II', 'aVR']) { const x = r.leads[nm as 'I']; const o: string[] = []; for (let k = kj - 40; k < kj + 160; k += 10) o.push(((x[k] - x[k0]) * 10).toFixed(1)); console.log('  ', nm.padEnd(3), o.join(' ')); }
}
