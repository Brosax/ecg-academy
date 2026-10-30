/**
 * T9 performance bench (DECISION §8.2, §10): warm median and p95 of generate() per scenario (10 s, 500 Hz, 12 leads,
 * clean chain), the worst configurations (AF, VF, flutter, torsades, pre-excited AF + 5 extra leads + the 'noisy'
 * chain), a 60 s monitor strip, module init, the dial solves of one drill item, RegionStates.stateAt, and the memory of
 * one ECG. Budgets are §10's (browser main thread, mid-range laptop); Node on a dev machine is a proxy (machines vary
 * ×2), so the Vitest test (tests/synth/bench.test.ts) asserts a ×5 margin only.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/bench.ts [id …] [--reps 20] [--json]
 */
import { performance } from 'node:perf_hooks';
import { benchAll, BUDGET } from '../../tests/synth/bench';

const args = process.argv.slice(2);
const ri = args.indexOf('--reps');
const reps = ri >= 0 ? Number(args[ri + 1]) : 20;
const ids = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--reps'));
const t0 = performance.now();
const r = benchAll({ reps, ids: ids.length ? ids : undefined });
if (args.includes('--json')) {
  console.log(JSON.stringify(r, null, 1));
} else {
  const f = (x: number): string => x.toFixed(2).padStart(7);
  console.log(`generate() per scenario (warm, ${reps} reps): median / p95 ms`);
  for (const s of r.scenarios) console.log(`  ${s.name.padEnd(40)} ${f(s.median)} ${f(s.p95)}${s.median > BUDGET.sinus.median ? '  > sinus budget' : ''}`);
  const line = (k: string, v: { median: number; p95: number }, b: { median: number; p95: number }): void =>
    console.log(`${k.padEnd(42)} ${f(v.median)} ${f(v.p95)}   budget ${b.median} / ${b.p95}${v.median > b.median || v.p95 > b.p95 ? '   OVER' : ''}`);
  console.log('');
  line('sinus family (all sinus scenarios pooled)', r.sinus, BUDGET.sinus);
  line('worst (AF/VF/flutter/TdP/pre-exc AF, extras, noisy)', r.worst, BUDGET.worst);
  console.log(`${'60 s monitor strip (normal)'.padEnd(42)} ${f(r.monitor60s)}           budget ${BUDGET.monitor60s}${r.monitor60s > BUDGET.monitor60s ? '   OVER' : ''}`);
  console.log(`${'module init (first generate, cold)'.padEnd(42)} ${f(r.init)}           budget ${BUDGET.init}${r.init > BUDGET.init ? '   OVER' : ''}`);
  console.log(`${'dial solves of one item (axis + pAxis)'.padEnd(42)} ${f(r.solves)}           budget ${BUDGET.solves}${r.solves > BUDGET.solves ? '   OVER' : ''}`);
  console.log(`${'stateAt (one frame)'.padEnd(42)} ${f(r.stateAt)}           budget ${BUDGET.stateAt}${r.stateAt > BUDGET.stateAt ? '   OVER' : ''}`);
  console.log(`${'50-item exam set'.padEnd(42)} ${f(r.exam50)}           budget ${BUDGET.exam50}${r.exam50 > BUDGET.exam50 ? '   OVER' : ''}`);
  console.log(`${'memory per ECG (KB, signal + truth)'.padEnd(42)} ${f(r.memoryKb)}           budget ${BUDGET.memoryKb}${r.memoryKb > BUDGET.memoryKb ? '   OVER' : ''}`);
  console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)} s)`);
}
