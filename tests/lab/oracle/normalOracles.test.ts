/**
 * Runs the normal-rhythm oracle harness on the real engine built on the crude STUB geometry and prints the report.
 * Hard oracles are expected to partially fail on the stub heart (it is not anatomical); only the harness is asserted.
 * The integrator gates on the procedural geometry.
 */
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/lab/sim/engine';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import { buildStubGeometry } from '../../../src/lab/sim/stub/stubGeometry';
import { formatOracleReport, oracleLoss, runNormalOracles } from './normalOracles';

describe('normal oracle harness', () => {
  it('runs on the real engine (stub geometry, h = 2 mm) and reports', async () => {
    const engine = await createEngine(buildStubGeometry(2), {}, undefined, { yieldBetweenStages: false });
    const hr0 = engine.rhythm.heartRate;
    const r = runNormalOracles(engine);
    console.log(`real engine on stub geometry\n${formatOracleReport(r)}\nloss ${oracleLoss(r).toFixed(2)}`);
    expect(r.hard.length).toBeGreaterThan(30);
    expect(r.soft.length).toBeGreaterThan(8);
    expect(r.hard.every((x) => typeof x.pass === 'boolean')).toBe(true);
    expect(Number.isFinite(oracleLoss(r))).toBe(true);
    // the restored rate applies from the next generated beat
    const evs = engine.rhythm.eventsUntil(0);
    engine.rhythm.eventsUntil(evs[evs.length - 1].tMs + 3000);
    expect(engine.rhythm.heartRate).toBe(hr0);
    // measurement sanity on a generated beat
    expect(r.beat.m.qrsMs).toBeGreaterThan(30);
    expect(r.slow!.m.prMs).toBeGreaterThan(r.fast!.m.prMs);
  });

  it('works on any SimEngine (Sameni stub)', () => {
    const r = runNormalOracles(new StubEngine(), { skipRateTest: true });
    console.log(`Sameni stub engine\n${formatOracleReport(r)}`);
    expect(r.hard.length).toBeGreaterThan(30);
  });
});
