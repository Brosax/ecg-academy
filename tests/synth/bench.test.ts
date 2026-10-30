/**
 * T9 performance (DECISION §8.2, §10): soft gate — Node on a CI or dev machine is a proxy for the browser main thread
 * and machines vary ×2, so the budgets are asserted with a ×5 margin only. Wall-clock timings are meaningless while
 * the rest of the suite runs in parallel workers, so the gate runs on request:
 *
 *   SYNTH_BENCH=1 npx vitest run tests/synth/bench.test.ts
 *
 * The full report (every scenario, warm median / p95) is scripts/synth/bench.ts; the measured numbers are recorded in
 * src/synth/README.md.
 */
import { describe, expect, it } from 'vitest';
import { benchAll, BUDGET, measureInit } from './bench';

const MARGIN = 5;

describe.runIf(!!process.env.SYNTH_BENCH)('performance budget (×5 margin)', () => {
  it('module init, generate() medians, 60 s strip, solves, stateAt, exam set and memory stay within 5 × §10', () => {
    const init = measureInit();
    const r = benchAll({ reps: 6, ids: ['normal', 'sinus-tachycardia', 'stemi-anterior', 'lbbb', 'atrial-fibrillation', 'pvc', 'paced-ddd'] });
    expect(init, 'module init').toBeLessThan(MARGIN * BUDGET.init);
    expect(r.sinus.median, 'sinus median').toBeLessThan(MARGIN * BUDGET.sinus.median);
    expect(r.worst.median, 'worst median').toBeLessThan(MARGIN * BUDGET.worst.median);
    expect(r.monitor60s, '60 s strip').toBeLessThan(MARGIN * BUDGET.monitor60s);
    expect(r.solves, 'dial solves').toBeLessThan(MARGIN * BUDGET.solves);
    expect(r.stateAt, 'stateAt').toBeLessThan(MARGIN * BUDGET.stateAt);
    expect(r.exam50, '50-item exam').toBeLessThan(MARGIN * BUDGET.exam50);
    expect(r.memoryKb, 'memory per ECG').toBeLessThan(BUDGET.memoryKb);
  }, 120_000);
});

describe('bench harness', () => {
  it('the budgets are DECISION §10', () => {
    expect(BUDGET.sinus).toEqual({ median: 6, p95: 15 });
    expect(BUDGET.worst).toEqual({ median: 15, p95: 25 });
    expect(BUDGET.memoryKb).toBe(400);
  });
});
