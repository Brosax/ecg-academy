// dbg_fit3.ts — review re-fit (dev): coordinate search over the SHARED conduction-system parameters (fascicle timing
// and roots, Purkinje coverage and speeds, myocardial speeds, gain; the heart pose is kept) so that normal, complete
// RBBB and complete LBBB (each differing from normal only by its blocked bundle and its own condition parameters)
// match textbook morphology together. Compared with dbg_fit2 the targets add: septal q in I/aVL, small r and no r' in
// V1 (normal); small r, R' > r and broad, normal axis (RBBB). usage: node dbg_fit3.ts [sweeps] ['<start json>']
import { generate } from './synth.ts';
type P = Record<string, unknown>;
interface Spec { path: string; x: number; step: number; lo: number; hi: number; }
const specs: Spec[] = [
  { path: 'fasc.lsf', x: 36.5, step: 3, lo: 20, hi: 46 },
  { path: 'fasc.laf', x: 28, step: 3, lo: 20, hi: 46 },
  { path: 'fasc.lpf', x: 32.4, step: 3, lo: 20, hi: 46 },
  { path: 'fasc.rbb', x: 34.5, step: 3, lo: 24, hi: 50 },
  { path: 'roots.lafTh', x: 115, step: 12, lo: 50, hi: 160 },
  { path: 'roots.lafAb', x: 0.668, step: 0.08, lo: 0.3, hi: 0.85 },
  { path: 'roots.lpfTh', x: -107.5, step: 12, lo: -170, hi: -50 },
  { path: 'roots.lpfAb', x: 0.355, step: 0.08, lo: 0.15, hi: 0.7 },
  { path: 'purk.lvFree', x: 0.98, step: 0.05, lo: 0.55, hi: 0.98 },
  { path: 'purk.lvPost', x: 0.972, step: 0.05, lo: 0.4, hi: 0.98 },
  { path: 'purk.lvSept', x: 0.767, step: 0.06, lo: 0.3, hi: 0.98 },
  { path: 'purk.rvFree', x: 0.795, step: 0.05, lo: 0.45, hi: 1.0 },
  { path: 'purk.rvSept', x: 0.95, step: 0.06, lo: 0.3, hi: 1.0 },
  { path: 'vPurk', x: 1.196, step: 0.2, lo: 0.8, hi: 3 },
  { path: 'vPurkRV', x: 1.384, step: 0.2, lo: 0.6, hi: 3 },
  { path: 'vN', x: 0.33, step: 0.04, lo: 0.2, hi: 0.6 },
  { path: 'vT', x: 0.607, step: 0.06, lo: 0.4, hi: 0.9 },
  { path: 'mbDelay', x: 4, step: 3, lo: 0, hi: 20 },
  { path: 'gain', x: 0.739, step: 0.06, lo: 0.5, hi: 1.5 },
  { path: 'rbbRetro', x: 8, step: 4, lo: 2, hi: 40 },
];
if (process.env.FIT_SEPT) { const sp = specs.find((s) => s.path === 'purk.lvSept')!; sp.lo = 0.38; sp.hi = 0.6; sp.step = 0.04; }
if (process.argv[3]) { const st = JSON.parse(process.argv[3]); for (const s of specs) if (st[s.path] !== undefined) s.x = st[s.path]; }
function build(xs: number[]): { ovr: P; rb: number } {
  const o: P = {}; let rb = 8;
  specs.forEach((s, k) => {
    if (s.path === 'rbbRetro') { rb = xs[k]; return; }
    const parts = s.path.split('.'); let t = o as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) { t[parts[i]] ||= {}; t = t[parts[i]] as Record<string, unknown>; }
    t[parts[parts.length - 1]] = xs[k];
  });
  return { ovr: o, rb };
}
type L = Record<string, Float32Array>;
function beat(id: string) {
  const r = generate(id, { fs: 1000, durationS: 1.7, seed: 1 });
  const b = r.truth.beats[0]; if (!b) return null;
  const L = r.leads as unknown as L; const k0 = Math.round(b.qrsOnMs), k1 = Math.round(b.qrsOffMs);
  return { L, k0, k1, qrs: b.qrsOffMs - b.qrsOnMs, ax: r.truth.qrsAxisDeg, v: (nm: string, k: number) => (L[nm][k] - L[nm][k0 - 3]) * 10 };
}
const pen = (x: number, lo: number, hi: number, tol: number) => (x < lo ? ((lo - x) / tol) ** 2 : x > hi ? ((x - hi) / tol) ** 2 : 0);
function evalP(xs: number[]): { f: number; info: string } {
  const { ovr, rb } = build(xs);
  process.env.FIELD_OVR = JSON.stringify(ovr);
  let f = 0; const parts: string[] = [];
  // ---- normal
  delete process.env.FIELD_COVR;
  const n = beat('normal'); if (!n) return { f: 1e9, info: 'no beat' };
  const q = (b: NonNullable<ReturnType<typeof beat>>, nm: string) => { let m = 0; for (let k = b.k0; k < b.k0 + 30; k++) { const x = b.v(nm, k); if (x > 0.3) break; m = Math.min(m, x); } return m; };
  const R = (b: NonNullable<ReturnType<typeof beat>>, nm: string) => { let m = 0; for (let k = b.k0; k <= b.k1; k++) m = Math.max(m, b.v(nm, k)); return m; };
  const S = (b: NonNullable<ReturnType<typeof beat>>, nm: string) => { let m = 0; for (let k = b.k0; k <= b.k1; k++) m = Math.min(m, b.v(nm, k)); return m; };
  let r1 = 0; for (let k = n.k0; k < n.k0 + 30; k++) r1 = Math.max(r1, n.v('V1', k));
  let sk = n.k0; for (let k = n.k0; k <= n.k1; k++) if (n.v('V1', k) < n.v('V1', sk)) sk = k;
  let rp = 0; for (let k = sk; k <= n.k1 + 5; k++) rp = Math.max(rp, n.v('V1', k));
  const nq = [q(n, 'I'), q(n, 'aVL'), q(n, 'V6')];
  f += Number(process.env.FIT_WN || 1) * (pen(nq[0], -1.2, -0.3, 0.3) + pen(nq[1], -1.5, -0.3, 0.3) + pen(nq[2], -2.0, -0.4, 0.4));
  const WN = Number(process.env.FIT_WN || 1);
  f += WN * (pen(r1, 1.2, 4, 0.6) + pen(rp, 0, 0.4, 0.5));
  // physiology of the conduction system (env FIT_SEPT=1): the left septal surface is activated first, the RV septum
  // (right bundle) a few ms later
  if (process.env.FIT_SEPT) { const fa = (ovr.fasc as Record<string, number>); f += 10 * (pen(fa.lsf - fa.laf, -99, -2, 1) + pen(fa.lsf - fa.lpf, -99, -2, 1) + pen(fa.rbb - fa.lsf, 5, 12, 1)); }
  const tgt: [string, number, number, number][] = [['I', 5, 9, 1.2], ['II', 7, 13, 1.5], ['V4', 10, 20, 2], ['V5', 10, 18, 2], ['V6', 8, 15, 2]];
  for (const [nm, lo, hi, tol] of tgt) f += pen(R(n, nm), lo, hi, tol);
  f += pen(S(n, 'V2'), -18, -9, 2) + pen(S(n, 'I'), -1.5, 0, 0.5) + pen(S(n, 'V6'), -2, 0, 0.6);
  f += pen(n.qrs, 84, 96, 5) + pen(n.ax, 45, 75, 8);
  parts.push(`N q ${nq.map((x) => x.toFixed(1)).join('/')} V1 r ${r1.toFixed(1)} r' ${rp.toFixed(1)} R I/II/V5 ${R(n, 'I').toFixed(1)}/${R(n, 'II').toFixed(1)}/${R(n, 'V5').toFixed(1)} S I ${S(n, 'I').toFixed(1)} qrs ${n.qrs.toFixed(0)} ax ${n.ax.toFixed(0)}`);
  // ---- RBBB (its own retrograde RV Purkinje engagement delay)
  process.env.FIELD_COVR = JSON.stringify({ pmjRetro: rb });
  const r = beat('rbbb'); if (!r) return { f: 1e9, info: 'no rbbb' };
  let rr1 = 0; for (let k = r.k0; k < r.k0 + 35; k++) rr1 = Math.max(rr1, r.v('V1', k));
  let rsk = r.k0 + 20; for (let k = r.k0 + 20; k < r.k0 + 60; k++) if (r.v('V1', k) < r.v('V1', rsk)) rsk = k;
  let rrp = 0; for (let k = rsk; k <= r.k1 + 5; k++) rrp = Math.max(rrp, r.v('V1', k));
  let w = 0; for (let k = rsk; k <= r.k1 + 10; k++) if (r.v('V1', k) > 0.5 * rrp) w++;
  const tS = (nm: string) => { let m = 0, d = 0; for (let k = r.k0 + Math.round(0.45 * r.qrs); k <= r.k1 + 5; k++) { const x = r.v(nm, k); m = Math.min(m, x); if (x < -0.5) d++; } return [m, d]; };
  const sI = tS('I'), s6 = tS('V6');
  f += 1.5 * (pen(rr1, 1, 3.5, 0.6) + pen(rrp - 1.5 * rr1, 0, 99, 1) + pen(rrp, 6, 14, 1.5) + pen(w, 30, 80, 8) + pen(R(r, 'I'), 4, 10, 1)
    + pen(sI[0], -4, -1.5, 0.6) + pen(sI[1], 30, 80, 8) + pen(s6[0], -4, -1.5, 0.6) + pen(s6[1], 30, 80, 8) + pen(r.qrs, 128, 150, 6) + pen(r.ax, 20, 90, 12));
  parts.push(`R V1 r ${rr1.toFixed(1)} R' ${rrp.toFixed(1)} w${w} I R ${R(r, 'I').toFixed(1)} S ${sI[0].toFixed(1)}/${sI[1]} V6 S ${s6[0].toFixed(1)}/${s6[1]} qrs ${r.qrs.toFixed(0)} ax ${r.ax.toFixed(0)} retro ${rb.toFixed(0)}`);
  // ---- LBBB (its condition: left retrograde Purkinje engagement, LV CV 0.8)
  delete process.env.FIELD_COVR;
  const l = beat('lbbb'); if (!l) return { f: 1e9, info: 'no lbbb' };
  let lv1 = 0; for (let k = l.k0; k < l.k0 + 40; k++) lv1 = Math.max(lv1, l.v('V1', k));
  f += 1.5 * (pen(l.qrs, 140, 160, 6) + pen(lv1, 0, 1, 0.5) + pen(q(l, 'I'), -0.2, 0, 0.2) + pen(q(l, 'V6'), -0.2, 0, 0.2) + pen(R(l, 'I'), 6, 14, 1.5) + pen(R(l, 'V6'), 10, 20, 2) + pen(S(l, 'V2'), -30, -12, 3));
  parts.push(`L R I/V6 ${R(l, 'I').toFixed(1)}/${R(l, 'V6').toFixed(1)} q ${q(l, 'I').toFixed(1)}/${q(l, 'V6').toFixed(1)} V1 r ${lv1.toFixed(1)} S V2 ${S(l, 'V2').toFixed(1)} qrs ${l.qrs.toFixed(0)} ax ${l.ax.toFixed(0)}`);
  return { f, info: parts.join('\n    ') };
}
const xs = specs.map((s) => s.x);
let cur = evalP(xs);
console.log('start', cur.f.toFixed(2), '\n    ' + cur.info);
const sweeps = Number(process.argv[2] || 3);
for (let sw = 0; sw < sweeps; sw++) {
  for (let k = 0; k < specs.length; k++) {
    const s = specs[k];
    for (const dir of [1, -1]) {
      const old = xs[k]; xs[k] = Math.min(s.hi, Math.max(s.lo, old + dir * s.step));
      if (xs[k] === old) continue;
      const r = evalP(xs);
      if (r.f < cur.f) { cur = r; console.log(`  ${s.path} -> ${xs[k].toFixed(3)}  f ${cur.f.toFixed(2)}`); break; }
      xs[k] = old;
    }
  }
  for (const s of specs) s.step *= 0.75;
  console.log(`sweep ${sw} f ${cur.f.toFixed(2)}\n    ${cur.info}`);
  console.log('  params', JSON.stringify(Object.fromEntries(specs.map((s, k) => [s.path, +xs[k].toFixed(3)]))));
}
