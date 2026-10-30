// dbg_stemi.ts — sweep the ischaemic-territory modifier of the STEMI conditions; prints J / ST60 / T per lead and
// writes out/dbg/<name>.json for rendering (dev)
// usage: node dbg_stemi.ts '{"name":"a1","terr":"lad","rest":0.2,"amp":0.55,"apd":-45,"cls":3,"v":0.85}' ...
import { CONDITIONS, ladProx, rcaDom } from './conditions.ts';
import { defaultParams, angWin } from './model.ts';
import { CH } from './geom.ts';
import type { Sites } from './model.ts';
import { generate, LEADS } from './synth.ts';
import { fiducials, leadMeasures, LEAD_ORDER } from './measure.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = new URL('./out/dbg/', import.meta.url); mkdirSync(OUT, { recursive: true });
for (const a of process.argv.slice(2)) {
  const sp = JSON.parse(a);
  const rcaN = (s: Sites, i: number): number => { const g = s.g; if (g.ch[i] !== CH.LV && g.ch[i] !== CH.RV) return 0; return angWin(g.th[i], sp.th0 ?? -180, sp.th1 ?? -40, 30) * (g.ch[i] === CH.RV ? (sp.rvw ?? 0.5) : 1); };
  const base = sp.terr === 'rca' ? rcaDom : sp.terr === 'rcaN' ? rcaN : ladProx;
  const sel = (s: Sites, i: number) => base(s, i) * (sp.w ?? 1);
  CONDITIONS.tmp = { rhythm: 'tmp', params: () => { const p = defaultParams(); p.mods.push({ sel, rest: sp.rest, amp: sp.amp, apdAdd: sp.apd, cls: sp.cls ?? 3, vScale: sp.v ?? 0.85, ...(sp.extra ?? {}) }); return p; } };
  const r = generate('tmp', { fs: 500, durationS: 10, seed: 1 });
  const leads: Record<string, number[]> = {}; for (const l of LEADS) leads[l] = Array.from(r.leads[l], (v) => Math.round(v * 1e5) / 1e5);
  writeFileSync(new URL((sp.name ?? 'stemi') + '.json', OUT), JSON.stringify({ fs: 500, title: sp.name ?? 'stemi', leads }));
  const bs = r.truth.beats; const b = bs[2];
  const f = fiducials(r.leads, 500, b.qrsOnMs + 20, bs[1].qrsOnMs, bs[3].qrsOnMs);
  console.log(a, `QRS ${r.truth.qrsMs.toFixed(0)} QT ${r.truth.qtMs.toFixed(0)} axis ${r.truth.qrsAxisDeg.toFixed(0)}`);
  const row: string[] = [];
  for (const nm of LEAD_ORDER) { const m = leadMeasures(r.leads[nm as 'I'], 500, { ...f, qrsOn: b.qrsOnMs, qrsOff: b.qrsOffMs, tOff: b.tOffMs, pOn: b.pOnMs }); row.push(`${nm} R${(m.r * 10).toFixed(1)} J${(m.j * 10).toFixed(1)} T${(m.t * 10).toFixed(1)}`); }
  console.log('  ' + row.join(' | '));
}
