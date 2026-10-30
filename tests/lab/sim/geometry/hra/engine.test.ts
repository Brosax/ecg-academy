/**
 * The real electrophysiology engine on the realistic HRA heart (default parameters, no calibration yet): the whole
 * myocardium activates from the placed conduction system, the EDL kernels close, and the normal-rhythm oracle report
 * is printed (calibration on this geometry is the next stage, so oracle passes are reported, not asserted).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cavityOnsets, terminalOnsets } from '../../../../../src/lab/sim/conduction/graph';
import { buildEngineSync } from '../../../../../src/lab/sim/engine';
import { loadHraGeometry } from '../../../../../src/lab/sim/geometry/hra/load';
import { kernelAbsSum, kernelSum } from '../../../../../src/lab/sim/source/voxelEdl';
import { COMP, compOfTissue } from '../../../../../src/lab/sim/types';
import { formatOracleReport, oracleLoss, runNormalOracles } from '../../../oracle/normalOracles';

const ASSET = new URL('../../../../../src/lab/assets/heart-hra.bin', import.meta.url);

describe('engine on the HRA heart', () => {
  it('activates every compartment from the placed conduction system and reports the normal oracles', async () => {
    const geo = await loadHraGeometry(undefined, new Uint8Array(readFileSync(ASSET)));
    const engine = buildEngineSync(geo);
    const g = geo.grid;
    let nA = 0, nV = 0, actA = 0, actV = 0;
    for (let v = 0; v < g.tissue.length; v++) {
      const c = compOfTissue(g.tissue[v]);
      if (c === COMP.Atrial) {
        nA++;
        if (Number.isFinite(engine.fields.atrial[0].tAct[v])) actA++;
      } else if (c === COMP.Ventricular) {
        nV++;
        if (Number.isFinite(engine.fields.ventricular[0].tAct[v])) actV++;
      }
    }
    expect(actA / nA).toBeGreaterThan(0.99);
    expect(actV / nV).toBeGreaterThan(0.99);
    for (const k of [engine.kernels.atrial, engine.kernels.ventricular]) {
      const s = kernelSum(k);
      expect(Math.hypot(...s) / kernelAbsSum(k)).toBeLessThan(1e-9);
    }
    // all four fascicle terminals seed the Purkinje layer close to where the paths end
    const va = engine.ventricularActivation;
    expect(va.terminals.map((t) => t.id).sort()).toEqual(['LAF', 'LPF', 'LSF', 'RBB']);
    for (const t of va.terminals) expect(t.snapMm).toBeLessThan(4);
    expect(engine.atrialActivation.avnArrivalMs).toBeGreaterThan(20);
    expect(engine.timing.ventricularSpanMs).toBeGreaterThan(50);
    expect(engine.timing.ventricularSpanMs).toBeLessThan(160);

    const r = runNormalOracles(engine);
    console.log(
      `real engine on the HRA heart (default params)\n${JSON.stringify(engine.stats)}\n` +
        `terminals ${JSON.stringify(terminalOnsets(va))} cavities ${JSON.stringify(cavityOnsets(va))}\n` +
        `${formatOracleReport(r)}\nloss ${oracleLoss(r).toFixed(2)}`,
    );
    expect(r.hard.length).toBeGreaterThan(30);
    expect(r.beat.m.qrsMs).toBeGreaterThan(60);
    expect(r.beat.m.qrsMs).toBeLessThan(130);
  });
});
