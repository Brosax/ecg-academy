import { dipoleWeights } from './dbg_util.ts';
// dbg_score.ts — one-line morphology summary per parameter override (dev). usage: node dbg_score.ts <id> '<ovr json>' ...
import { generate, lastInternals } from './synth.ts';
import { DOM } from './geom.ts';
const id = process.argv[2] || 'normal';
const ovrs = process.argv.slice(3).length ? process.argv.slice(3) : ['{}'];
for (const o of ovrs) {
  process.env.FIELD_OVR = o;
  const r = generate(id, { fs: 500, durationS: 3, seed: 1 });
  const L = r.leads; const b = r.truth.beats[0];
  const k0 = Math.round(b.qrsOnMs / 2), k1 = Math.round(b.qrsOffMs / 2), kt = Math.round(b.tOffMs / 2);
  const base = (x: Float32Array) => x[k0 - 2];
  const rs = (nm: keyof typeof L) => { const x = L[nm]; const b0 = base(x); let mx = 0, mn = 0, kmx = k0; for (let k = k0; k <= k1; k++) { const v = x[k] - b0; if (v > mx) { mx = v; kmx = k; } if (v < mn) mn = v; } let q = 0; for (let k = k0; k < kmx; k++) q = Math.min(q, x[k] - b0); let t = 0; for (let k = k1 + 40; k < kt; k++) { const v = x[k] - b0; if (Math.abs(v) > Math.abs(t)) t = v; } return `${(q * 10).toFixed(0)}/${(mx * 10).toFixed(0)}/${(mn * 10).toFixed(0)}|${(t * 10).toFixed(0)}`; };
  let sI = 0, sF = 0, tI = 0, tF = 0;
  for (let k = k0; k <= k1; k++) { sI += L.I[k] - base(L.I); sF += L.aVF[k] - base(L.aVF); }
  for (let k = k1; k <= kt; k++) { tI += L.I[k] - base(L.I); tF += L.aVF[k] - base(L.aVF); }
  const ax = Math.atan2(2 * sF / Math.sqrt(3), sI) * 180 / Math.PI;
  const tax = Math.atan2(2 * tF / Math.sqrt(3), tI) * 180 / Math.PI;
  // EDL dipole loop (torso independent): initial / peak / terminal magnitudes
  const m = lastInternals!.model; const g = m.g; const a = m.acts!;
  const act = new Float64Array(g.n).fill(1e9);
  for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < g.n && g.dom[i] === DOM.V && a.t[k] >= b.qrsOnMs - 5 && a.t[k] < b.qrsOnMs + 300) act[i] = a.t[k] - b.qrsOnMs; }
  const Wd = dipoleWeights(g);
  const Hm: number[] = []; const fr: number[] = [];
  for (let t = 0; t <= 100; t += 5) { const H = [0, 0, 0]; for (let i = 0; i < g.n; i++) if (act[i] <= t) for (let c = 0; c < 3; c++) H[c] += Wd[c][i]; Hm.push(Math.hypot(H[0], H[1], H[2])); fr.push(Math.atan2(-H[1], H[0]) * 180 / Math.PI); }
  const pk = Math.max(...Hm);
  console.log(`${o}\n  QRS ${(b.qrsOffMs - b.qrsOnMs).toFixed(0)} QT ${(b.tOffMs - b.qrsOnMs).toFixed(0)} PR ${b.pOnMs === null ? '-' : (b.qrsOnMs - b.pOnMs).toFixed(0)} axis ${ax.toFixed(0)} Taxis ${tax.toFixed(0)} | H% ${Hm.map((h) => Math.round(100 * h / pk)).join(' ')}\n  front ${fr.map((f) => f.toFixed(0)).join(' ')}`);
  // Kors regression VCG (mV): X left, Y inferior, Z posterior
  const kv = (k: number) => { const g2 = (nm: keyof typeof L) => L[nm][k] - base(L[nm]); const I = g2('I'), II = g2('II'), V1 = g2('V1'), V2 = g2('V2'), V3 = g2('V3'), V4 = g2('V4'), V5 = g2('V5'), V6 = g2('V6');
    return [0.38 * I - 0.07 * II - 0.13 * V1 + 0.05 * V2 - 0.01 * V3 + 0.14 * V4 + 0.06 * V5 + 0.54 * V6, -0.07 * I + 0.93 * II + 0.06 * V1 - 0.02 * V2 - 0.05 * V3 + 0.06 * V4 - 0.17 * V5 + 0.13 * V6, 0.11 * I - 0.23 * II - 0.43 * V1 - 0.06 * V2 - 0.14 * V3 - 0.20 * V4 - 0.11 * V5 + 0.31 * V6]; };
  const vmax = (a0: number, a1: number) => { let best = [0, 0, 0], bm = 0; for (let k = a0; k <= a1; k++) { const v = kv(k); const mm = Math.hypot(v[0], v[1], v[2]); if (mm > bm) { bm = mm; best = v; } } return { m: bm, el: Math.atan2(best[1], Math.hypot(best[0], best[2])) * 180 / Math.PI, az: Math.atan2(-best[2], best[0]) * 180 / Math.PI, v: best }; };
  const vq = vmax(k0, k1), vt = vmax(k1 + 20, kt);
  const ang = Math.acos((vq.v[0] * vt.v[0] + vq.v[1] * vt.v[1] + vq.v[2] * vt.v[2]) / (vq.m * vt.m)) * 180 / Math.PI;
  console.log(`  VCG(Kors) QRSmax ${vq.m.toFixed(2)} mV el ${vq.el.toFixed(0)} az ${vq.az.toFixed(0)} | Tmax ${vt.m.toFixed(2)} el ${vt.el.toFixed(0)} az ${vt.az.toFixed(0)} | QRS-T ${ang.toFixed(0)}  (normal: QRS 1.6-2.5 el~50 az -10..-30(post) ; T 0.6-0.8; angle 30-60)`);
  console.log('  q/R/S|T  ' + (['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).map((nm) => nm + ' ' + rs(nm)).join('  '));
}
