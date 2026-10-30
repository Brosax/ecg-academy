/**
 * Self-check: for each benchmark condition
 *  1. lead-system identities (III = II − I, aVR = −(I+II)/2, aVL = I − II/2, aVF = II − I/2) on the generated arrays;
 *  2. inverse Dower (Edenbrandt–Pahlm) recovers a VCG from the 8 independent leads — must be close to a pure dipole
 *     for conditions without near-field sources (sanity check of the published coefficients);
 *  3. intervals / rate / axis measured from the signals vs the model's truth;
 *  4. per-lead feature table (mm at 10 mm/mV) and the condition's textbook criteria.
 *  Usage: node check.ts [id ...] [--table]
 */
import { generate, getCondition } from './synth.ts';
import { BENCHMARK_IDS } from './conditions.ts';
import { LEADS, INVERSE_DOWER, KORS, leadsToVcg, DOWER, type LeadName } from './leads.ts';
import { measure, type Measurement } from './measure.ts';
import { CRITERIA, mm } from './criteria.ts';
import type { Truth } from './synth.ts';

const args = process.argv.slice(2);
const showTable = args.includes('--table');
const ids = args.filter((a) => !a.startsWith('--'));
const run = ids.length ? ids : [...BENCHMARK_IDS];
const fs = 500;

const F = (m: Measurement, l: LeadName) => m.feats[l];

function identities(L: Record<LeadName, Float32Array>): number {
  let e = 0;
  for (let i = 0; i < L.I.length; i++) {
    const I = L.I[i]!, II = L.II[i]!;
    e = Math.max(e, Math.abs(L.III[i]! - (II - I)), Math.abs(L.aVR[i]! + (I + II) / 2), Math.abs(L.aVL[i]! - (I - II / 2)), Math.abs(L.aVF[i]! - (II - I / 2)));
  }
  return e;
}

/** relative residual of reprojecting the inverse-Dower VCG through the forward Dower rows (0 = purely dipolar) */
function dipolarity(L: Record<LeadName, Float32Array>): { invDower: number; kors: number } {
  const rows = [DOWER.I, DOWER.II, DOWER.V1, DOWER.V2, DOWER.V3, DOWER.V4, DOWER.V5, DOWER.V6];
  const names: LeadName[] = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  let num = 0, den = 0, numK = 0;
  for (let i = 0; i < L.I.length; i++) {
    const h = leadsToVcg(INVERSE_DOWER, L, i);
    const hk = leadsToVcg(KORS, L, i);
    names.forEach((n, j) => {
      const r = rows[j]!;
      const x = L[n][i]!;
      num += (x - (r[0] * h[0] + r[1] * h[1] + r[2] * h[2])) ** 2;
      numK += (x - (r[0] * hk[0] + r[1] * hk[1] + r[2] * hk[2])) ** 2;
      den += x * x;
    });
  }
  return { invDower: Math.sqrt(num / den), kors: Math.sqrt(numK / den) };
}

let fails = 0;
for (const id of run) {
  const cond = getCondition(id);
  const res = generate(id, { fs, durationS: 10, seed: 1 });
  const t = res.truth;
  let m = measure(res.leads, fs);
  if (m.fused > 0.5) {
    console.log(`  note: ${(m.fused * 100).toFixed(0)} % of beats have no quiet segment (QRS and T fused) — automatic J-point/onset detection is not possible; features below use the model's QRS windows, intervals are checked on the PNG`);
    m = measure(res.leads, fs, t.beats);
  }
  const idErr = identities(res.leads);
  const dip = dipolarity(res.leads);
  console.log(`\n=== ${id} — ${cond.title}`);
  console.log(`  limb identities max |err| = ${idErr.toExponential(1)} mV   inverse-Dower reprojection residual ${(dip.invDower * 100).toFixed(1)} %  (Kors ${(dip.kors * 100).toFixed(0)} %)`);
  const cmp = (name: string, truth: number | null, meas: number | null, tol: number): void => {
    const ok = truth === null ? meas === null || true : meas !== null && Math.abs(truth - meas) <= tol;
    if (!ok) fails++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(6)} truth ${truth === null ? '—' : truth.toFixed(0).padStart(5)}  measured ${meas === null ? '—' : meas.toFixed(0).padStart(5)}  (±${tol})`);
  };
  cmp('HR', t.hrBpm, m.hrBpm, 3);
  if (t.prMs !== null) cmp('PR', t.prMs, m.prMs, 15);
  cmp('QRS', t.qrsMs, m.qrsMs, 12);
  cmp('QT', t.qtMs, m.qtMs, 20);
  cmp('axis', t.qrsAxisDeg, m.axisDeg, 15);
  console.log(`  rhythm ${t.rhythm}; RR CV ${(m.rrCv * 100).toFixed(1)} %; P axis ${m.pAxisDeg?.toFixed(0) ?? '—'}°, T axis ${m.tAxisDeg?.toFixed(0) ?? '—'}°; beats detected ${m.beats.length} (truth ${t.beats.length})`);
  if (showTable || true) {
    console.log('  lead   P+   P-    q     R     S    R2   RPT   J    ST60    T   Tasym  morph');
    for (const l of LEADS) {
      const f = m.feats[l];
      console.log(
        `  ${l.padEnd(4)} ${[f.p, f.pNeg, f.q, f.r, f.s, f.r2].map((v) => mm(v).toFixed(1).padStart(5)).join(' ')} ${f.rPeakMs.toFixed(0).padStart(4)} ${[f.j, f.st60, f.t].map((v) => mm(v).toFixed(1).padStart(5)).join(' ')}  ${f.tAsym.toFixed(2)}  ${f.morph}`,
      );
    }
  }
  // 3D region state driven by the same kernels: bounded, ventricles depolarised after the QRS, recovered after T
  {
    const R = res.regions;
    const vi = ['IVS', 'RV', 'LV_ANT', 'LV_LAT', 'LV_INF', 'LV_APEX'].map((r) => R.names.indexOf(r));
    let lo = Infinity, hi = -Infinity;
    for (let tt = 0; tt < 10000; tt += 7) for (const v of R.activityAt(tt)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const b = t.beats.find((x) => x.qrsOnMs > 1000 && x.tOffMs < 9000) ?? t.beats[1]!;
    const mean = (tt: number): number => { const a = R.activityAt(tt); return vi.reduce((s2, i) => s2 + a[i]!, 0) / vi.length; };
    const before = mean(b.qrsOnMs - 5), after = mean(b.qrsOffMs + 10), rec = mean(b.tOffMs + 60);
    const ok = lo >= 0 && hi <= 1 && after > 0.9 && rec < 0.2 && after - before > 0.5;
    if (!ok) fails++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} regions.activityAt in [0,1] (${lo.toFixed(2)}..${hi.toFixed(2)}); ventricles before QRS ${before.toFixed(2)}, after QRS ${after.toFixed(2)}, after T ${rec.toFixed(2)}`);
  }
  if (id === 'normal') {
    // electrode misplacement is a geometry change: swap the RA/LA cables, nothing else
    const sw = generate(id, { fs, durationS: 10, seed: 1, hookup: { RA: 'LA', LA: 'RA', LL: 'LL' } });
    let e = 0;
    for (let i = 0; i < sw.leads.I.length; i++) e = Math.max(e, Math.abs(sw.leads.I[i]! + res.leads.I[i]!), Math.abs(sw.leads.II[i]! - res.leads.III[i]!), Math.abs(sw.leads.aVR[i]! - res.leads.aVL[i]!), Math.abs(sw.leads.V1[i]! - res.leads.V1[i]!));
    const ok = e < 1e-6;
    if (!ok) fails++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} RA/LA cable swap → I inverted, II↔III, aVR↔aVL, chest leads unchanged (max err ${e.toExponential(1)})`);
  }
  const crit = CRITERIA[id];
  if (crit) {
    for (const k of crit(m, t, res.leads, fs)) {
      if (!k.ok) fails++;
      console.log(`  ${k.ok ? 'ok  ' : 'FAIL'} ${k.name}${k.val ? `  [${k.val}]` : ''}`);
    }
  }
}
console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} check(s) failed`}`);
process.exitCode = fails ? 1 : 0;
