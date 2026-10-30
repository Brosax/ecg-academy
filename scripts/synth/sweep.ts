/**
 * T5 dial sweep over the whole catalogue (DECISION §8.2): every scenario × every declared dial at {min, mid, max} and
 * drawDials at each difficulty, through T1–T3, the dial's realisation and its couplings (tests/synth/dials/sweep.ts).
 * The Vitest suite (tests/synth/dials/sweep-*.test.ts) runs the same checks on one seed; this script runs more.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/sweep.ts [id …] [--seeds 2] [--draws 3] [--af-map]
 *
 * --af-map re-measures the AF ventricular-response map (src/synth/dials/dials.ts › AF_RESPONSE_MAP).
 */
import { createRng } from '../../src/core/rng';
import { DIFFICULTIES, drawDials, generate, scenarios } from '../../src/synth/index';
import { mergePatch } from '../../src/synth/morph/compose';
import { scenarioById } from '../../src/synth/catalogue/index';
import { dialGrid, sweepDial, sweepDraw } from '../../tests/synth/dials/sweep';

const args = process.argv.slice(2);
const opt = (k: string, d: number): number => {
  const i = args.indexOf(k);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const ids = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));

if (args.includes('--af-map')) {
  // AF ventricular response vs AV-node ERP: 12 seeds × 10 s per ERP (the scenario's own node otherwise)
  const def = scenarioById('atrial-fibrillation') as { source: unknown };
  const base = def.source;
  for (const erp of [240, 270, 300, 330, 380, 440, 520]) {
    (def as { source: unknown }).source = mergePatch(base as never, { junction: { avn: { erpMs: erp } } } as never);
    const hrs: number[] = [];
    for (let s = 1; s <= 12; s++) hrs.push(generate({ scenario: 'atrial-fibrillation', seed: s }).ecg.truth!.hrBpm);
    const m = hrs.reduce((a, b) => a + b, 0) / hrs.length;
    const sd = Math.sqrt(hrs.reduce((a, b) => a + (b - m) ** 2, 0) / hrs.length);
    console.log(`ERP ${erp} ms → mean ${m.toFixed(1)} bpm (SD ${sd.toFixed(1)})`);
  }
  (def as { source: unknown }).source = base;
} else {
  const seeds = opt('--seeds', 1), draws = opt('--draws', 2);
  let n = 0, nf = 0;
  for (const def of scenarios()) {
    if (ids.length && !ids.includes(def.id)) continue;
    const fails: string[] = [];
    for (let seed = 1; seed <= seeds; seed++) for (const g of dialGrid(def)) {
      n++;
      fails.push(...sweepDial(def, g.id, g.value, seed));
    }
    for (const d of DIFFICULTIES) for (let k = 0; k < draws; k++) {
      n++;
      const dials = drawDials(def.id, createRng(`${def.id}:${d}:${k}`), d);
      if (Object.keys(dials).length) fails.push(...sweepDraw(def, dials, 1 + k, d));
    }
    nf += fails.length;
    console.log(`${fails.length ? 'FAIL' : 'ok  '} ${def.id}`);
    for (const f of fails) console.log(`     ${f}`);
  }
  console.log(`${n} cases, ${nf} failures`);
}
