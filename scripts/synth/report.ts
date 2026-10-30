/**
 * Dev report: generate scenarios and print truth vs the independent oracle, per-lead features and timings.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/report.ts [id …] [--seed N] [--table] [--fs 500]
 */
import { performance } from 'node:perf_hooks';
import { STD_LEADS } from '../../src/core/leads';
import { generate, scenarios } from '../../src/synth/index';
import { measure } from '../../tests/synth/oracle/measure';

const args = process.argv.slice(2);
const opt = (k: string, d: number): number => {
  const i = args.indexOf(k);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const seed = opt('--seed', 1);
const fs = opt('--fs', 500) as 250 | 500 | 1000;
const table = args.includes('--table');
const ids = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const run = ids.length ? ids : scenarios().map((s) => s.id);
const mm = (v: number): string => (Math.round(v * 100) / 10).toFixed(1);

for (const id of run) {
  generate({ scenario: id, seed });
  const t0 = performance.now();
  const reps = 5;
  let res = generate({ scenario: id, seed, fs });
  for (let r = 1; r < reps; r++) res = generate({ scenario: id, seed, fs });
  const dt = (performance.now() - t0) / reps;
  const t = res.ecg.truth!;
  const m = measure(res.ecg.signal.leads, fs);
  const f = (x: number | null | undefined): string => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(0));
  console.log(`\n=== ${id}  (${dt.toFixed(1)} ms)  rhythm ${t.rhythm}  findings ${t.findings.join(', ')}`);
  console.log(`  HR ${f(t.hrBpm)}/${f(m.hrBpm)}  PR ${f(t.prMs)}/${f(m.prMs)}  QRS ${f(t.qrsMs)}/${f(m.qrsMs)}  QT ${f(t.qtMs)}/${f(m.qtMs)}  QTcF ${f(t.qtcFridericiaMs)}  axis ${f(t.axisDeg.qrs)}/${f(m.axisDeg)} (area ${f(m.axisAreaDeg)}${res.axisAmbiguous ? ' ambiguous' : ''})  P ${f(t.axisDeg.p)}/${f(m.pAxisDeg)}  T ${f(t.axisDeg.t)}/${f(m.tAxisDeg)}  beats ${t.beats.length}/${m.beats.length}  fused ${(m.fused * 100).toFixed(0)}%  RRcv ${(m.rrCv * 100).toFixed(1)}%`);
  if (table) {
    console.log('  lead    P+   P-    q     R     S    R2  RPT    J  ST60     T  Tasym  morph   stTruth');
    for (const l of STD_LEADS) {
      const x = m.feats[l];
      console.log(`  ${l.padEnd(4)} ${[x.p, x.pNeg, x.q, x.r, x.s, x.r2].map((v) => mm(v).padStart(5)).join(' ')} ${x.rPeakMs.toFixed(0).padStart(4)} ${[x.j, x.st60, x.t].map((v) => mm(v).padStart(5)).join(' ')}  ${x.tAsym.toFixed(2)}  ${x.morph.padEnd(7)} ${mm(t.stMv[l] ?? 0)}`);
    }
  }
}
