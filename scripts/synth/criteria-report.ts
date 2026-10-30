/**
 * Dev report: T3 textbook criteria (tests/synth/oracle/criteria) per scenario and seed, as the test runs them.
 *
 *   node --import ./scripts/synth/node-hooks.mjs scripts/synth/criteria-report.ts [id …] [--seeds 3]
 */
import { generate, scenarios } from '../../src/synth/index';
import { CRITERIA, GENERIC, GENERIC_IDS, VARIANT_CRITERIA, type CriterionCtx } from '../../tests/synth/oracle/criteria';
import { allCases } from '../../tests/synth/helpers';
import { measure } from '../../tests/synth/oracle/measure';

const args = process.argv.slice(2);
const si = args.indexOf('--seeds');
const nSeeds = si >= 0 ? Number(args[si + 1]) : 3;
const ids = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--seeds'));
let total = 0;
for (const c of allCases().filter((x) => !ids.length || ids.includes(x.id))) {
  const def = scenarios().find((d) => d.id === c.id)!;
  const sc = CRITERIA[c.id];
  if (!sc) {
    console.log(`${c.name}: NO CRITERIA`);
    continue;
  }
  const fails = new Map<string, string[]>();
  for (let seed = 1; seed <= nSeeds; seed++) {
    const r = generate({ scenario: c.id, variant: c.variant, seed });
    const leads = r.ecg.signal.leads;
    const ctx: CriterionCtx = { m: measure(leads, r.ecg.signal.fs), leads, fs: r.ecg.signal.fs, def };
    const add = (k: string, msg: string): void => {
      const l = fails.get(k) ?? [];
      l.push(`s${seed}: ${msg}`);
      fails.set(k, l);
    };
    for (const g of GENERIC_IDS) {
      if (sc.optOut?.[g]) continue;
      const msg = GENERIC[g](ctx);
      if (msg) add(`generic ${g}`, msg);
    }
    for (const h of [...sc.hallmarks, ...(c.variant ? (VARIANT_CRITERIA[c.id]?.[c.variant] ?? []) : [])]) {
      const msg = h.check(ctx);
      if (msg) add(h.id, msg);
    }
  }
  total += fails.size;
  console.log(`${fails.size ? '✗' : '✓'} ${c.name}`);
  for (const [k, v] of fails) console.log(`    [${k}] ${v[0]}${v.length > 1 ? `  (+${v.length - 1} seeds)` : ''}`);
}
console.log(`${total} failing criteria`);
