// dbg_terr.ts — try ischaemic territories (th window in degrees, ab range) and print ST levels (dev)
import { CONDITIONS } from './conditions.ts';
import { defaultParams, angWin, smoothstep } from './model.ts';
import type { Sites } from './model.ts';
import { CH } from './geom.ts';
import { generate } from './synth.ts';
import { LEAD_ORDER } from './measure.ts';
const specs = process.argv.slice(2).map((s) => JSON.parse(s));
for (const sp of specs) {
  const selF = (s: Sites, i: number) => {
    const g = s.g; if (g.ch[i] !== CH.LV && !(sp.rv && g.ch[i] === CH.RV)) return 0;
    const w = angWin(g.th[i], sp.th0, sp.th1, 30) * smoothstep(sp.ab0 ?? -1, (sp.ab0 ?? -1) + 0.1, g.ab[i]) * (1 - smoothstep(sp.ab1 ?? 2, (sp.ab1 ?? 2) + 0.1, g.ab[i]));
    const apex = sp.apex ? (sp.apexW ?? 1) * (1 - smoothstep(sp.apex, sp.apex + 0.15, g.ab[i])) * angWin(g.th[i], sp.ath0 ?? -180, sp.ath1 ?? 180, 40) : 0;
    return Math.max(w, apex) * (g.ch[i] === CH.RV ? (sp.rv ?? 0) : 1);
  };
  CONDITIONS.tmp = { rhythm: 'tmp', params: () => { const p = defaultParams(); p.mods.push({ sel: selF, rest: sp.rest ?? 0.2, amp: sp.amp ?? 0.55, apdAdd: -45, cls: 3, vScale: 0.85 }); return p; } };
  const r = generate('tmp', { fs: 500, durationS: 3, seed: 1 });
  const b = r.truth.beats[1];
  const k0 = Math.round(b.qrsOnMs / 2) - 3, kj = Math.round(b.qrsOffMs / 2), k60 = kj + 30;
  console.log(JSON.stringify(sp), 'QRS', (b.qrsOffMs - b.qrsOnMs).toFixed(0));
  console.log('  J/ST60/R: ' + LEAD_ORDER.map((nm) => { const x = r.leads[nm as keyof typeof r.leads]; let R = 0; for (let k = k0; k < kj; k++) R = Math.max(R, x[k] - x[k0]); return `${nm} ${((x[kj] - x[k0]) * 10).toFixed(1)}/${((x[k60] - x[k0]) * 10).toFixed(1)}/${(R * 10).toFixed(0)}`; }).join('  '));
}
