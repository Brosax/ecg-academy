/**
 * Rhythm / timing defects of the 2026-10-29 lesson review (docs/review/defects-2026-10-29.md, section A): each test
 * proves one fix on the delivered tracing (independent oracle where a reader would look) or on the truth the graders
 * use. A1 pseudo-r′ of typical AVNRT, A3 beat-to-beat fusion of pre-excited AF, A4 clockwise flutter follows the
 * conductionRatio dial, A5 facts of the infra-His complete block, A7 slow AF follows the ventricularResponse dial, A8
 * torsades twists in lead II, A9 visible AV dissociation in the default VT, A10 asystole is not a ruler-straight line,
 * A11 frequent PACs, A12 PR dial of nodal 2:1 block, A13 PJC retrograde P′ after the QRS, A15 multifocal PVC facts.
 */
import { describe, expect, it } from 'vitest';
import type { StdLead } from '../../../src/core/leads';
import { generate } from '../../../src/synth';
import { gen } from '../helpers';
import { measure, residualPWaves } from '../oracle/measure';

const ms = (fs: number, v: number): number => Math.round((v * fs) / 1000);

/** V1 pseudo-r′ (oracle median beat): the positive peak after the S nadir up to 40 ms past the QRS end, above the
 *  TQ level and above the level 30 ms after it (a deflection, not a slope). */
function pseudoRPrime(scenario: string, variant: string | undefined, seed: number): number {
  const r = gen({ scenario, variant, seed });
  const m = measure(r.ecg.signal.leads, r.ecg.signal.fs);
  const x = m.median.V1, fs = m.fs;
  const base = x[Math.max(0, m.medianOn - ms(fs, 20))];
  let nad = m.medianOn;
  for (let i = m.medianOn; i <= m.medianOff + ms(fs, 10); i++) if (x[i] < x[nad]) nad = i;
  let pk = nad;
  for (let i = nad; i <= m.medianOff + ms(fs, 40); i++) if (x[i] > x[pk]) pk = i;
  return Math.min(x[pk] - base, x[pk] - x[Math.min(x.length - 1, pk + ms(fs, 30))]);
}

describe('A1 typical AVNRT: pseudo-r′ in V1 (fast-pathway retrograde P′ at the end of the QRS)', () => {
  it('V1 shows a visible terminal r′ (≥ 0.05 mV, about 0.5–1 mm) on seeds 1–5; absent in sinus rhythm, atypical AVNRT and a junctional rhythm', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = pseudoRPrime('avnrt', undefined, seed);
      expect(r, `seed ${seed}`).toBeGreaterThanOrEqual(0.05);
      expect(r, `seed ${seed}`).toBeLessThanOrEqual(0.1);
    }
    for (const seed of [1, 2, 3]) {
      for (const [id, v] of [['normal', undefined], ['avnrt', 'atypical'], ['junctional-escape-rhythm', 'hidden']] as const) {
        expect(pseudoRPrime(id, v, seed), `${id} ${v ?? ''}`).toBeLessThan(0.01);
      }
    }
  });
  it('pseudo-S in II and aVF and RP′ < 90 ms (criteria.md; truth: retrograde P′ onset 50–70 ms after the QRS onset)', () => {
    for (const seed of [1, 2, 3]) {
      const t = gen({ scenario: 'avnrt', seed }).ecg.truth!;
      const ps = t.atrial.filter((a) => a.kind === 'retrograde' && a.t > t.beats[1].qrsOn && a.t < t.beats[t.beats.length - 2].qrsOn);
      for (const a of ps) {
        const b = [...t.beats].reverse().find((x) => x.qrsOn <= a.t)!;
        expect(a.t - b.qrsOn).toBeGreaterThanOrEqual(50);
        expect(a.t - b.qrsOn).toBeLessThan(70);
      }
    }
  });
});

describe('A3 pre-excited AF: fast, irregular, QRS width changing beat to beat', () => {
  it('seeds 1–5: rate > 170, shortest RR < 250 ms, RR CV > 10 %, QRS width CV > 12 %, ≥ 4 width classes and fused beats', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const t = gen({ scenario: 'preexcited-af', seed }).ecg.truth!;
      const w = t.beats.map((b) => b.qrsOff - b.qrsOn);
      const rr = t.beats.slice(1).map((b, i) => b.qrsOn - t.beats[i].qrsOn);
      const cv = (xs: number[]): number => {
        const m = xs.reduce((a, b) => a + b, 0) / xs.length;
        return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / m;
      };
      const fused = w.filter((x) => x >= 105 && x < 150).length;
      expect(t.hrBpm, `seed ${seed}`).toBeGreaterThan(170);
      expect(Math.min(...rr), `seed ${seed}`).toBeLessThan(250);
      expect(cv(rr), `seed ${seed}`).toBeGreaterThan(0.1);
      expect(cv(w), `seed ${seed} widths ${w.map((x) => x.toFixed(0)).join(' ')}`).toBeGreaterThan(0.12);
      expect(new Set(w.map((x) => Math.round(x / 10))).size, `seed ${seed}`).toBeGreaterThanOrEqual(4);
      expect(fused, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      // most complexes are still pre-excited (wide): the 'fast, broad, irregular' tracing
      expect(w.filter((x) => x >= 120).length / w.length, `seed ${seed}`).toBeGreaterThan(0.5);
    }
  });
});

describe('A4 clockwise flutter follows the conductionRatio dial', () => {
  it('2:1, 3:1, 4:1: ventricular rate = atrial / N ± 2 bpm, the dial reported', () => {
    for (const n of [2, 3, 4]) {
      const r = generate({ scenario: 'atrial-flutter', variant: 'clockwise', seed: 1, dials: { conductionRatio: n } });
      const t = r.ecg.truth!;
      expect(r.applied.conductionRatio).toBe(n);
      expect(Math.abs(t.hrBpm - t.atrialRateBpm! / n)).toBeLessThanOrEqual(2);
    }
    // without the dial the variant keeps the scenario's 4:1
    const t = gen({ scenario: 'atrial-flutter', variant: 'clockwise', seed: 1 }).ecg.truth!;
    expect(Math.abs(t.hrBpm - t.atrialRateBpm! / 4)).toBeLessThanOrEqual(2);
  });
});

describe('A5 / A15 facts follow the realised rhythm (a variant cannot keep a stale fact)', () => {
  it('complete AV block: nodal → junctional escape; infra-His → ventricular escape', () => {
    const nodal = gen({ scenario: 'av-block-3', seed: 1 }).ecg.truth!;
    expect(nodal.facts.blockLevel).toBe('AV node');
    expect(nodal.facts.escape).toBe('junctional 45/min');
    const ih = gen({ scenario: 'av-block-3', variant: 'infra-his', seed: 1 }).ecg.truth!;
    expect(ih.facts.blockLevel).toBe('infra-His');
    expect(ih.facts.escape).toBe('ventricular 34/min');
    expect(ih.beats.every((b) => b.kind === 'escape-ventricular')).toBe(true);
    expect(Math.abs(ih.hrBpm - 34)).toBeLessThan(2);
  });
  it('PVC origin facts: multifocal lists both origins; each single-origin variant names its own', () => {
    expect(gen({ scenario: 'pvc-patterns', variant: 'multifocal', seed: 1 }).ecg.truth!.facts.origin)
      .toBe('multifocal: right ventricular outflow tract + LV lateral wall');
    expect(gen({ scenario: 'pvc', variant: 'lv-lateral', seed: 1 }).ecg.truth!.facts.origin).toBe('LV lateral wall');
    expect(gen({ scenario: 'pvc', variant: 'fascicular', seed: 1 }).ecg.truth!.facts.origin).toBe('left posterior fascicle');
    expect(gen({ scenario: 'pvc', seed: 1 }).ecg.truth!.facts.origin).toBe('right ventricular outflow tract');
  });
  it('circuit / site facts of the variants: clockwise flutter, atypical AVNRT, left-atrial rhythm', () => {
    expect(gen({ scenario: 'atrial-flutter', variant: 'clockwise', seed: 1 }).ecg.truth!.facts.circuit).toMatch(/clockwise/);
    expect(gen({ scenario: 'atrial-flutter', variant: 'clockwise', seed: 1 }).ecg.truth!.facts.circuit).not.toMatch(/counter/);
    expect(gen({ scenario: 'avnrt', variant: 'atypical', seed: 1 }).ecg.truth!.facts.circuit).toBe('fast pathway antegrade, slow pathway retrograde');
    expect(gen({ scenario: 'ectopic-atrial-rhythm', variant: 'left-atrial', seed: 1 }).ecg.truth!.facts.site).toBe('left atrium (inferior)');
  });
});

describe('A7 slow AF follows the ventricularResponse dial inside its slow band', () => {
  const meanHr = (variant: string | undefined, v: number): { hr: number; applied: number | undefined } => {
    let s = 0, applied: number | undefined;
    for (let seed = 1; seed <= 8; seed++) {
      const r = gen({ scenario: 'atrial-fibrillation', variant, seed, dials: { ventricularResponse: v } });
      s += r.ecg.truth!.hrBpm;
      applied = r.applied.ventricularResponse;
      expect(r.applied.ventricularResponse).toBe(Math.round(r.ecg.truth!.hrBpm * 10) / 10);
    }
    return { hr: s / 8, applied };
  };
  it('slow: the mean rate follows the dial (40–55 /min), a request above the band gives the top of the slow band', () => {
    const a = meanHr('slow', 42), b = meanHr('slow', 50), c = meanHr('slow', 75);
    expect(a.applied).toBeDefined();
    expect(a.hr).toBeLessThan(b.hr);
    expect(Math.abs(a.hr - 42)).toBeLessThan(6);
    expect(Math.abs(b.hr - 50)).toBeLessThan(6);
    expect(c.hr).toBeLessThan(60);
  });
  it('rapid stays rapid (> 100 /min) and follows the dial inside its band', () => {
    const a = meanHr('rapid', 70), b = meanHr('rapid', 150);
    expect(a.hr).toBeGreaterThan(100);
    expect(b.hr).toBeGreaterThan(a.hr + 20);
  });
});

describe('A8 torsades twists in the strip lead II and in most leads', () => {
  it('in II the run waxes, wanes to a node and reverses polarity; ≥ 10 of 12 leads show both polarities', () => {
    for (const seed of [1, 2, 3]) {
      const r = gen({ scenario: 'torsades', seed });
      const t = r.ecg.truth!, L = r.ecg.signal.leads, fs = r.ecg.signal.fs;
      const run = t.beats.filter((b, i) => i > 0 && b.kind === 'ventricular' && b.qrsOn - t.beats[i - 1].qrsOn < 330);
      expect(run.length, `seed ${seed}`).toBeGreaterThanOrEqual(10);
      const cyc = 60000 / 220;
      const net = (l: StdLead, b: (typeof run)[number]): number => {
        let hi = -Infinity, lo = Infinity;
        for (let i = ms(fs, b.qrsOn); i < ms(fs, b.qrsOn + 0.5 * cyc); i++) {
          hi = Math.max(hi, L[l][i]);
          lo = Math.min(lo, L[l][i]);
        }
        return Math.abs(hi) > Math.abs(lo) ? hi : lo;
      };
      const ii = run.map((b) => net('II', b));
      const amp = ii.map(Math.abs);
      expect(Math.max(...amp) / Math.min(...amp), `seed ${seed} II ${ii.map((x) => x.toFixed(2)).join(' ')}`).toBeGreaterThanOrEqual(3);
      expect(Math.max(...amp), `seed ${seed}`).toBeGreaterThanOrEqual(0.5);
      expect(ii.some((x) => x > 0.3) && ii.some((x) => x < -0.3), `seed ${seed} II polarity`).toBe(true);
      const leads: StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
      const twisting = leads.filter((l) => {
        const xs = run.map((b) => net(l, b));
        const big = Math.max(...xs.map(Math.abs));
        return xs.some((x) => x > 0.4 * big) && xs.some((x) => x < -0.4 * big);
      });
      expect(twisting.length, `seed ${seed}: ${twisting.join(' ')}`).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('A9 default VT shows its AV dissociation', () => {
  it('seeds 1–5: ≥ 3 dissociated P waves visible (truth) and ≥ 1 re-measured by the oracle', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const r = gen({ scenario: 'vt-monomorphic', seed });
      const t = r.ecg.truth!;
      expect(t.hrBpm).toBeGreaterThanOrEqual(140);
      expect(t.atrial.filter((a) => a.visible).length, `seed ${seed}`).toBeGreaterThanOrEqual(3);
      expect(residualPWaves(r.ecg.signal.leads, measure(r.ecg.signal.leads, r.ecg.signal.fs)).length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('A10 asystole is a slightly drifting line, not a ruler-straight one', () => {
  it('both variants: II is not identically zero (SD ≥ 0.005 mV), stays below the artefact level, no QRS', () => {
    for (const variant of [undefined, 'p-wave']) {
      for (const seed of [1, 2]) {
        const r = gen({ scenario: 'asystole', variant, seed });
        const x = Array.from(r.ecg.signal.leads.II);
        const m = x.reduce((a, b) => a + b, 0) / x.length;
        const sd = Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / x.length);
        expect(sd).toBeGreaterThanOrEqual(0.005);
        expect(Math.max(...x) - Math.min(...x)).toBeLessThan(0.3);
        expect(r.ecg.truth!.beats.length).toBe(0);
        expect(r.ecg.truth!.findings).toEqual(['asystole']);
      }
    }
  });
});

describe('A11 frequent PACs', () => {
  it("variant 'frequent': ≥ 2 premature conducted P′ on every seed 1–10, each resetting the sinus node", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const t = gen({ scenario: 'pac', variant: 'frequent', seed }).ecg.truth!;
      expect(t.beats.filter((b) => b.kind === 'atrial').length, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      expect(t.rhythm).toBe('sinus-rhythm');
    }
  });
});

describe('A12 nodal 2:1 AV block realises the PR dial exactly', () => {
  it('PR 160–340: truth PR = dial (±1 ms), still 2:1, the dial reported', () => {
    for (const pr of [160, 220, 280, 340]) {
      for (const seed of [1, 2]) {
        const r = gen({ scenario: 'av-block-2-2to1', seed, dials: { pr } });
        const t = r.ecg.truth!;
        expect(r.applied.pr).toBe(pr);
        expect(Math.abs(t.prMs! - pr), `pr ${pr} seed ${seed}`).toBeLessThanOrEqual(1);
        expect(Math.abs(t.atrialRateBpm! / t.hrBpm - 2)).toBeLessThan(0.05);
      }
    }
  });
});

describe('A13 PJC: retrograde P′ just after the QRS', () => {
  it('seeds 1–3: the premature narrow complex has no P before it and its retrograde P′ starts 5–40 ms after its QRS end', () => {
    for (const seed of [1, 2, 3]) {
      const t = gen({ scenario: 'pjc', seed }).ecg.truth!;
      const j = t.beats.filter((b) => b.kind === 'junctional');
      expect(j.length).toBe(1);
      expect(j[0].pOn).not.toBeNull();
      expect(j[0].pOn! - j[0].qrsOff).toBeGreaterThanOrEqual(5);
      expect(j[0].pOn! - j[0].qrsOff).toBeLessThanOrEqual(40);
    }
    // seed 1: the P′ stands alone after the QRS and the truth marks it visible (on other seeds the next sinus discharge
    // may fall on it: atrial fusion)
    expect(gen({ scenario: 'pjc', seed: 1 }).ecg.truth!.atrial.find((a) => a.kind === 'retrograde')!.visible).toBe(true);
  });
});
