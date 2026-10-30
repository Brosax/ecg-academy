// dbg_bb.ts — one-line key metrics of normal / RBBB / LBBB for a list of shared-parameter overrides (dev):
//   normal: q in I, aVL, V6; initial r and terminal r' in V1; R II; QRS; axis
//   RBBB:   V1 r and R' (and R' width at half height), terminal S in I and V6 (depth, duration below -0.5 mm); QRS; axis
//   LBBB:   R in I, aVL, V6 (max), q in I/V6, V1 min; QRS; axis
// usage: node dbg_bb.ts '<ovr1>' '<ovr2>' ...   ('' = defaults). FIELD_COVR applies per condition: env RB_COVR, LB_COVR
import { generate } from './synth.ts';
type L = Record<string, Float32Array>;
function beat(id: string) {
  const r = generate(id, { fs: 1000, durationS: 2.4, seed: 1 });
  const b = r.truth.beats[1] ?? r.truth.beats[0];
  return { L: r.leads as unknown as L, k0: Math.round(b.qrsOnMs), k1: Math.round(b.qrsOffMs), qrs: b.qrsOffMs - b.qrsOnMs, ax: r.truth.qrsAxisDeg };
}
const mm = (x: number) => (x * 10).toFixed(1);
for (const o of process.argv.slice(2).length ? process.argv.slice(2) : ['']) {
  if (o) process.env.FIELD_OVR = o; else delete process.env.FIELD_OVR;
  const out: string[] = [];
  { delete process.env.FIELD_COVR; const n = beat('normal'); const v = (nm: string, k: number) => n.L[nm][k] - n.L[nm][n.k0 - 3];
    const q = (nm: string) => { let m = 0; for (let k = n.k0; k < n.k0 + 30; k++) { const x = v(nm, k); if (x > 0.03) break; m = Math.min(m, x); } return m; };
    let r1 = 0; for (let k = n.k0; k < n.k0 + 30; k++) r1 = Math.max(r1, v('V1', k)); let sk = n.k0; for (let k = n.k0; k < n.k1; k++) if (v('V1', k) < v('V1', sk)) sk = k; let rp = 0; for (let k = sk; k <= n.k1 + 5; k++) rp = Math.max(rp, v('V1', k));
    let rII = 0; for (let k = n.k0; k <= n.k1; k++) rII = Math.max(rII, v('II', k));
    out.push(`N q I/aVL/V6 ${mm(q('I'))}/${mm(q('aVL'))}/${mm(q('V6'))} V1 r ${mm(r1)} r' ${mm(rp)} RII ${mm(rII)} qrs ${n.qrs.toFixed(0)} ax ${n.ax.toFixed(0)}`); }
  { if (process.env.RB_COVR) process.env.FIELD_COVR = process.env.RB_COVR; else delete process.env.FIELD_COVR;
    const n = beat('rbbb'); const v = (nm: string, k: number) => n.L[nm][k] - n.L[nm][n.k0 - 3];
    let r1 = 0; for (let k = n.k0; k < n.k0 + 35; k++) r1 = Math.max(r1, v('V1', k));
    let sk = n.k0 + 20; for (let k = n.k0 + 20; k < n.k0 + 60; k++) if (v('V1', k) < v('V1', sk)) sk = k;
    let rp = 0, rk = sk; for (let k = sk; k <= n.k1 + 5; k++) if (v('V1', k) > rp) { rp = v('V1', k); rk = k; }
    let w = 0; for (let k = sk; k <= n.k1 + 10; k++) if (v('V1', k) > 0.5 * rp) w++;
    const S = (nm: string) => { let m = 0, d = 0; for (let k = n.k0 + Math.round(0.45 * n.qrs); k <= n.k1 + 5; k++) { const x = v(nm, k); m = Math.min(m, x); if (x < -0.05) d++; } return `${mm(m)}/${d}ms`; };
    out.push(`R V1 r ${mm(r1)} R' ${mm(rp)} w${w} S_I ${S('I')} S_V6 ${S('V6')} qrs ${n.qrs.toFixed(0)} ax ${n.ax.toFixed(0)}`); void rk; }
  { if (process.env.LB_COVR) process.env.FIELD_COVR = process.env.LB_COVR; else delete process.env.FIELD_COVR;
    const n = beat('lbbb'); const v = (nm: string, k: number) => n.L[nm][k] - n.L[nm][n.k0 - 3];
    const R = (nm: string) => { let m = 0; for (let k = n.k0; k <= n.k1; k++) m = Math.max(m, v(nm, k)); return m; };
    const q = (nm: string) => { let m = 0; for (let k = n.k0; k < n.k0 + 30; k++) { const x = v(nm, k); if (x > 0.03) break; m = Math.min(m, x); } return m; };
    let v1 = 0; for (let k = n.k0; k <= n.k1; k++) v1 = Math.min(v1, v('V1', k));
    out.push(`L R I/aVL/V6 ${mm(R('I'))}/${mm(R('aVL'))}/${mm(R('V6'))} q I/V6 ${mm(q('I'))}/${mm(q('V6'))} V1 ${mm(v1)} qrs ${n.qrs.toFixed(0)} ax ${n.ax.toFixed(0)}`); }
  console.log((o || 'default') + '\n  ' + out.join('\n  '));
}
