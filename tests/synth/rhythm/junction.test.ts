/**
 * AV junction (src/synth/rhythm/junction.ts): the decremental AV-node law and its solves, His–Purkinje block patterns,
 * bundle refractoriness (Ashman), the accessory pathway and retrograde concealment — the arithmetic every AV-block,
 * flutter and pre-excitation scenario rests on (criteria.md `mobitz-i`, `wenckebach-arithmetic`, `mobitz-ii`,
 * `fixed-variable-advanced-avb`, `rate-dependent-bbb`, `preexcited-af`).
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import {
  aberrancy, ahAt, AvNode, bundleErp, DEFAULT_JUNCTION, erpForRatio, HisPurkinje, Pathway, PATHWAY_ERP_JITTER, prAt, recoveryMin,
  resolveJunction, solveAhMin, solveWenckebach, steadyAh,
} from '../../../src/synth/rhythm/junction';
import type { JunctionSpec } from '../../../src/synth/api';

const WENCKEBACH = { ahMinMs: 60, ahExtMs: 150, tauMs: 240, jitter: 0, conceal: 0 } as const;

/** Offer a regular train of impulses to a node; returns the PR of each (null = blocked). */
function train(j: JunctionSpec, cycleMs: number, n: number): (number | null)[] {
  const node = new AvNode(j, createRng(1));
  const out: (number | null)[] = [];
  for (let k = 0; k < n; k++) {
    const d = node.offer(k * cycleMs);
    out.push(d.conducted ? j.intraAtrialMs + (d.hisAt - k * cycleMs) + j.hvMs : null);
  }
  return out;
}

describe('AV node: decremental conduction', () => {
  it('AH falls monotonically with the recovery time and equals ahMin when fully recovered', () => {
    const j = DEFAULT_JUNCTION;
    let prev = Infinity;
    for (let r = recoveryMin(j); r < recoveryMin(j) + 1000; r += 50) {
      const ah = ahAt(j, r);
      expect(ah).toBeLessThanOrEqual(prev);
      prev = ah;
    }
    expect(ahAt(j, 5000)).toBeCloseTo(j.avn.ahMinMs, 3);
    expect(prAt(j, 5000)).toBeCloseTo(j.intraAtrialMs + j.avn.ahMinMs + j.hvMs, 3);
  });

  it('solveAhMin realises a target PR in steady 1:1 conduction', () => {
    for (const [pr, cyc] of [[160, 800], [280, 880], [220, 1000]] as const) {
      const ahMin = solveAhMin(DEFAULT_JUNCTION, pr, cyc);
      const j = resolveJunction({ avn: { ...DEFAULT_JUNCTION.avn, ahMinMs: ahMin, erpMs: Math.max(ahMin + 50, 280) } });
      const ah = steadyAh(j, cyc);
      expect(ah).not.toBeNull();
      expect(j.intraAtrialMs + (ah as number) + j.hvMs).toBeCloseTo(pr, 0);
    }
  });

  it('rejects a junction whose ERP does not exceed ahMin', () => {
    expect(() => resolveJunction({ avn: { ...DEFAULT_JUNCTION.avn, ahMinMs: 300, erpMs: 280 } })).toThrow();
  });
});

describe('Wenckebach (Mobitz I) arithmetic', () => {
  for (const n of [3, 4, 5]) {
    it(`solveWenckebach gives ${n}:${n - 1} periods with shrinking PR increments at 75/min`, () => {
      const base = resolveJunction({ avn: { ...WENCKEBACH, erpMs: 600 } });
      const erp = solveWenckebach(base, 800, n);
      expect(erp).not.toBeNull();
      const prs = train(resolveJunction({ avn: { ...WENCKEBACH, erpMs: erp as number } }), 800, 6 * n);
      // after the first block, every period: n − 1 conducted beats then one blocked P
      const first = prs.indexOf(null);
      const period = prs.slice(first + 1, first + 1 + n);
      expect(period.slice(0, n - 1).every((x) => x !== null)).toBe(true);
      expect(period[n - 1]).toBeNull();
      const p = period.slice(0, n - 1) as number[];
      const inc = p.slice(1).map((x, i) => x - p[i]);
      // PR lengthens, the largest increment after the first conducted beat, the post-pause PR the shortest
      expect(inc.every((d) => d > 0)).toBe(true);
      for (let i = 1; i < inc.length; i++) expect(inc[i]).toBeLessThan(inc[i - 1]);
      expect(Math.min(...p)).toBe(p[0]);
      // every PR stays under 300 ms (the longest one remains readable before its QRS)
      expect(Math.max(...p)).toBeLessThan(300);
    });
  }
  it('the catalogue ERPs realise 4:3, 3:2 and 5:4 (src/synth/catalogue/av-block.ts)', () => {
    for (const [erp, n] of [[685, 4], [745, 3], [667, 5]] as const) {
      const prs = train(resolveJunction({ avn: { ...WENCKEBACH, erpMs: erp } }), 800, 40);
      const blocks = prs.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0);
      const runs = blocks.slice(1).map((b, i) => b - blocks[i]);
      expect(new Set(runs)).toEqual(new Set([n]));
    }
  });
});

describe('fixed ratios (flutter, atrial tachycardia, high-grade block)', () => {
  for (const [cyc, n] of [[200, 4], [200, 2], [333, 2], [625, 3]] as const) {
    it(`erpForRatio gives exactly ${n}:1 at a ${cyc} ms atrial cycle`, () => {
      const j = resolveJunction({ avn: { ahMinMs: 100, ahExtMs: 60, tauMs: 80, erpMs: 400, jitter: 0, conceal: 0 } });
      const erp = erpForRatio(j, cyc, n);
      const prs = train(resolveJunction({ avn: { ...j.avn, erpMs: erp } }), cyc, 12 * n);
      const conducted = prs.map((x, i) => (x !== null ? i : -1)).filter((i) => i >= 0);
      const gaps = conducted.slice(1).map((c, i) => c - conducted[i]);
      expect(new Set(gaps)).toEqual(new Set([n]));
    });
  }
});

describe('His–Purkinje block', () => {
  const run = (ih: NonNullable<JunctionSpec['infraHis']>, n: number): boolean[] => {
    const hp = new HisPurkinje(resolveJunction({ infraHis: ih }), createRng(3));
    return Array.from({ length: n }, () => hp.conducts());
  };
  it('Mobitz II with a ratio blocks every N-th impulse, all-or-none', () => {
    expect(run({ pattern: 'mobitz2', ratio: 4 }, 12)).toEqual([true, true, true, false, true, true, true, false, true, true, true, false]);
  });
  it('fixed 2:1 conducts every other impulse; complete block conducts none', () => {
    expect(run({ pattern: 'fixed-ratio', ratio: 2 }, 6)).toEqual([true, false, true, false, true, false]);
    expect(run({ pattern: 'complete' }, 5).some(Boolean)).toBe(false);
  });
  it('rejects a non-integer ratio', () => {
    expect(() => resolveJunction({ infraHis: { pattern: 'mobitz2', ratio: 2.5 } })).toThrow();
  });
});

describe('bundle refractoriness (Ashman)', () => {
  const j = resolveJunction({ bundleErp: { rbbMs: 560, lbbMs: 330, slope: 0.35 } });
  it('a long cycle lengthens the bundle ERP; a short coupled beat after it is conducted with RBBB', () => {
    expect(bundleErp(560, 0.35, 1200)).toBeGreaterThan(bundleErp(560, 0.35, 800));
    expect(aberrancy(j, 440, 860)).toEqual({ rbb: true, lbb: false });
    expect(aberrancy(j, 850, 860)).toEqual({ rbb: false, lbb: false });
  });
  it('no bundle ERP declared: never aberrant', () => {
    expect(aberrancy(DEFAULT_JUNCTION, 300, 1500)).toEqual({ rbb: false, lbb: false });
  });
});

describe('accessory pathway', () => {
  const spec = { site: 'left-lateral', conductionMs: 116, erpMs: 235, antegrade: true, retrograde: true } as const;
  it('deterministic: conducts once per ERP', () => {
    const p = new Pathway(spec);
    expect(p.offer(0, 'antegrade')).toBe(true);
    expect(p.offer(200, 'antegrade')).toBe(false);
    expect(p.offer(240, 'antegrade')).toBe(true);
  });
  it('a concealed pathway (retrograde only) never conducts antegradely', () => {
    const p = new Pathway({ ...spec, antegrade: false });
    expect(p.offer(0, 'antegrade')).toBe(false);
    expect(p.offer(0, 'retrograde')).toBe(true);
  });
  it('under AF bombardment its refractoriness varies (jitter and concealment) but never undercuts 0.75 × ERP', () => {
    const p = new Pathway(spec, createRng(7));
    const acc: number[] = [];
    for (let t = 0; t < 20000; t += 37) if (p.offer(t, 'antegrade')) acc.push(t);
    const gaps = acc.slice(1).map((t, i) => t - acc[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(spec.erpMs * (1 - 2.5 * PATHWAY_ERP_JITTER) - 1);
    expect(new Set(gaps).size).toBeGreaterThan(3);
  });
});

describe('retrograde concealment', () => {
  it('a ventricular impulse that conceals into the node blocks the next sinus impulse (compensatory pause)', () => {
    const node = new AvNode(DEFAULT_JUNCTION, createRng(1));
    expect(node.offer(0).conducted).toBe(true);
    expect(node.retrograde(500, false)).toBeNull();
    expect(node.offer(560).conducted).toBe(false);
    expect(node.offer(1400).conducted).toBe(true);
  });
  it('with VA conduction the impulse crosses into the atria (retrograde P′)', () => {
    const node = new AvNode(DEFAULT_JUNCTION, createRng(1));
    expect(node.retrograde(1000, true)).not.toBeNull();
  });
  it('complete nodal block: nothing crosses either way', () => {
    const node = new AvNode(resolveJunction({ completeNodal: true }), createRng(1));
    expect(node.offer(0).conducted).toBe(false);
    expect(node.retrograde(500, true)).toBeNull();
  });
});
