/**
 * Dev report: the oracle delineator on the 300 shipped PTB-XL records vs the GE 12SL reference (DECISION §8.1).
 * Prints per-class and overall median |Δ| for HR, PR, QRS, QT and the QRS axis, plus the worst records.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/oracle-real.ts [--class NORM] [--worst 10]
 */
import { performance } from 'node:perf_hooks';
import { angleDiffDeg, compareReal, type RealDelta } from '../../tests/synth/oracle/real-compare';
import { realRecords } from '../../tests/synth/oracle/real-data';

const args = process.argv.slice(2);
const ci = args.indexOf('--class');
const only = ci >= 0 ? args[ci + 1] : null;
const wi = args.indexOf('--worst');
const worstN = wi >= 0 ? Number(args[wi + 1]) : 8;

const med = (xs: number[]): number => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : NaN;
};
const t0 = performance.now();
const rows: RealDelta[] = [];
for (const r of realRecords()) {
  if (only && r.cls !== only) continue;
  rows.push(compareReal(r));
}
console.log(`${rows.length} records in ${(performance.now() - t0).toFixed(0)} ms`);
const keys = ['hr', 'pr', 'qrs', 'qt', 'axis'] as const;
const byClass = new Map<string, RealDelta[]>();
for (const d of rows) {
  const l = byClass.get(d.cls) ?? [];
  l.push(d);
  byClass.set(d.cls, l);
}
const sgn = (ds: RealDelta[], k: (typeof keys)[number]): string => med(ds.map((d) => d[k] ?? NaN)).toFixed(0);
const line = (name: string, ds: RealDelta[]): string =>
  `${name.padEnd(7)} n=${String(ds.length).padStart(3)}  ${keys.map((k) => `${k} ${med(ds.map((d) => Math.abs(d[k] ?? NaN))).toFixed(1).padStart(5)}`).join('  ')}  missingPR ${ds.filter((d) => d.prMissing).length}  signed: pr ${sgn(ds, "pr")} qrs ${sgn(ds, "qrs")} qt ${sgn(ds, "qt")}`;
console.log(line('ALL', rows));
for (const [c, ds] of [...byClass].sort()) console.log(line(c, ds));
for (const k of keys) {
  const w = [...rows].filter((d) => Number.isFinite(d[k] ?? NaN)).sort((a, b) => Math.abs(b[k]!) - Math.abs(a[k]!)).slice(0, worstN);
  console.log(`worst ${k}: ${w.map((d) => `${d.id}(${d.cls}) ${d[k]!.toFixed(0)}`).join(', ')}`);
}
void angleDiffDeg;
