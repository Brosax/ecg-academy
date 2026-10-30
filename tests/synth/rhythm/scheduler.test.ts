/**
 * Event scheduler and rhythm truth (src/synth/rhythm/scheduler.ts, src/synth/truth/truth.ts): the laddergram the truth
 * carries — atrial events, which complex each one conducted to, beat kinds — must describe what happened, so a viewer,
 * a laddergram figure and a grader can rely on it. Invariants over every rhythm scenario, then one mechanism per
 * scenario family (criteria.md rows in the test names).
 */
import { describe, expect, it } from 'vitest';
import type { EcgTruth } from '../../../src/core/ecg';
import { scenarios } from '../../../src/synth';
import { allCases, gen } from '../helpers';

const RHYTHM_GROUPS = new Set(['atrial', 'svt', 'ventricular', 'av-block', 'pacing']);
const truth = (id: string, variant?: string, seed = 1): EcgTruth => gen({ scenario: id, variant, seed }).ecg.truth!;
const P_KINDS = new Set(['sinus', 'ectopic', 'retrograde', 'paced']);

describe('laddergram invariants (every rhythm scenario and variant, seed 1)', () => {
  const cases = allCases().filter((c) => RHYTHM_GROUPS.has(scenarios().find((d) => d.id === c.id)!.group));
  for (const c of cases) {
    it(c.name, () => {
      const t = truth(c.id, c.variant);
      // complexes in time order, atrial events in time order
      for (let i = 1; i < t.beats.length; i++) expect(t.beats[i].qrsOn).toBeGreaterThan(t.beats[i - 1].qrsOn);
      for (let i = 1; i < t.atrial.length; i++) expect(t.atrial[i].t).toBeGreaterThanOrEqual(t.atrial[i - 1].t);
      // an atrial event conducts to an existing complex, before it; at most one P wave per complex (two fibrillatory
      // wavelets may share one: a fusion of the pathway and AV-nodal fronts in pre-excited AF)
      const used = new Set<number>();
      for (const a of t.atrial) {
        if (a.conductedTo === null) continue;
        expect(a.conductedTo).toBeGreaterThanOrEqual(0);
        expect(a.conductedTo).toBeLessThan(t.beats.length);
        if (a.kind !== 'fibrillation') {
          expect(used.has(a.conductedTo), `two P waves conduct to complex ${a.conductedTo}`).toBe(false);
          used.add(a.conductedTo);
        }
        const b = t.beats[a.conductedTo];
        expect(a.t).toBeLessThan(b.qrsOn);
        // the complex's P marks are the conducting wave (P waves; F / f waves are labelled from the atrial list)
        if (P_KINDS.has(a.kind)) expect(b.pOn).toBeCloseTo(a.t, 6);
      }
      // a P mark on a complex is an atrial event of the strip
      for (const b of t.beats) if (b.pOn !== null && b.pOn >= 0) expect(t.atrial.some((a) => Math.abs(a.t - b.pOn!) < 1e-6)).toBe(true);
    });
  }
});

describe('mechanisms on the laddergram', () => {
  it('complete AV block: no atrial event conducts; junctional escape complexes (complete-avb)', () => {
    const t = truth('av-block-3');
    expect(t.atrial.every((a) => a.conductedTo === null)).toBe(true);
    expect(t.beats.every((b) => b.kind === 'escape-junctional')).toBe(true);
    expect(truth('av-block-3', 'infra-his').beats.every((b) => b.kind === 'escape-ventricular')).toBe(true);
  });

  it('2:1 block: every second sinus P conducts (fixed-variable-advanced-avb)', () => {
    const t = truth('av-block-2-2to1');
    const p = t.atrial.filter((a) => a.kind === 'sinus' && a.t > 200 && a.t < 9500);
    for (let i = 1; i < p.length; i++) expect(p[i].conductedTo === null).not.toBe(p[i - 1].conductedTo === null);
  });

  it('Mobitz I: within a group the PR lengthens; the blocked P conducts nowhere (mobitz-i)', () => {
    const t = truth('av-block-2-mobitz1');
    const blocked = t.atrial.filter((a) => a.kind === 'sinus' && a.conductedTo === null && a.t > 0 && a.t < 9000);
    expect(blocked.length).toBeGreaterThanOrEqual(2);
    const prs = t.beats.map((b) => (b.pOn !== null ? b.qrsOn - b.pOn : null));
    // after each blocked P the next PR is the shortest of its group
    for (const a of blocked) {
      const k = t.beats.findIndex((b) => b.qrsOn > a.t);
      if (k < 0 || k + 1 >= t.beats.length) continue;
      expect(prs[k]!).toBeLessThan(prs[k + 1]!);
    }
  });

  it('Mobitz II: the PR is constant before and after the blocked P (mobitz-ii)', () => {
    const t = truth('av-block-2-mobitz2');
    const prs = t.beats.filter((b) => b.pOn !== null).map((b) => b.qrsOn - b.pOn!);
    expect(Math.max(...prs) - Math.min(...prs)).toBeLessThan(2);
    expect(t.atrial.some((a) => a.kind === 'sinus' && a.conductedTo === null && a.t > 0 && a.t < 9000)).toBe(true);
  });

  it('PVC: a ventricular complex without a P; the sinus P that follows it is blocked (compensatory pause) (pvc-criteria)', () => {
    const t = truth('pvc');
    const k = t.beats.findIndex((b) => b.kind === 'ventricular');
    expect(k).toBeGreaterThan(0);
    expect(t.beats[k].pOn).toBeNull();
    const after = t.atrial.find((a) => a.kind === 'sinus' && a.t > t.beats[k].qrsOn - 150);
    expect(after?.conductedTo).toBeNull();
  });

  it('PAC: an ectopic P′ conducts a premature complex; a blocked PAC conducts nowhere (pac-criteria)', () => {
    const t = truth('pac');
    const ect = t.atrial.filter((a) => a.kind === 'ectopic');
    expect(ect.length).toBe(1);
    expect(t.beats[ect[0].conductedTo!].kind).toBe('atrial');
    const tb = truth('pac-blocked');
    expect(tb.atrial.filter((a) => a.kind === 'ectopic').every((a) => a.conductedTo === null)).toBe(true);
    const ta = truth('pac-aberrant');
    expect(ta.beats.filter((b) => b.aberrant)).toHaveLength(1);
  });

  it('junctional rhythm: junctional complexes with their own retrograde P′ before, inside or after the QRS (junctional-rhythm)', () => {
    for (const [v, before] of [[undefined, true], ['after', false]] as const) {
      const t = truth('junctional-escape-rhythm', v);
      expect(t.beats.every((b) => b.kind === 'junctional')).toBe(true);
      expect(t.atrial.every((a) => a.kind === 'retrograde' && a.conductedTo === null)).toBe(true);
      const own = t.beats.filter((b) => b.pOn !== null);
      expect(own.length).toBeGreaterThan(0);
      expect(own.every((b) => (b.pOn! < b.qrsOn) === before)).toBe(true);
    }
  });

  it('PJC: a premature junctional complex with a retrograde P′ (VA conduction)', () => {
    const t = truth('pjc');
    expect(t.beats.filter((b) => b.kind === 'junctional')).toHaveLength(1);
    expect(t.atrial.some((a) => a.kind === 'retrograde')).toBe(true);
  });

  it('VT: ventricular complexes, sinus P waves march through without conducting (vt-dissociation); captures and fusion in the variant', () => {
    const t = truth('vt-monomorphic');
    expect(t.beats.every((b) => b.kind === 'ventricular')).toBe(true);
    expect(t.atrial.every((a) => a.conductedTo === null)).toBe(true);
    const c = truth('vt-monomorphic', 'captures');
    expect(c.beats.some((b) => b.kind === 'capture')).toBe(true);
    expect(c.beats.some((b) => b.kind === 'fusion')).toBe(true);
  });

  it('flutter 4:1: one F wave in four conducts; AF: no P marks (flutter-criteria, af-criteria)', () => {
    const t = truth('atrial-flutter');
    const f = t.atrial.filter((a) => a.kind === 'flutter' && a.t > 300 && a.t < 9500);
    const cond = f.filter((a) => a.conductedTo !== null).length;
    expect(Math.abs(f.length / cond - 4)).toBeLessThan(0.6);
    const af = truth('atrial-fibrillation');
    expect(af.beats.every((b) => b.pOn === null)).toBe(true);
    expect(af.atrial.every((a) => a.kind === 'fibrillation')).toBe(true);
  });

  it('AVNRT: junctional complexes with a retrograde P′ right after the QRS (typical) or before the next one (atypical) (avnrt)', () => {
    const t = truth('avnrt');
    expect(t.beats.every((b) => b.kind === 'junctional')).toBe(true);
    const own = t.beats.filter((b) => b.pOn !== null);
    expect(own.every((b) => b.pOn! > b.qrsOn && b.pOn! - b.qrsOn < 70)).toBe(true);
    const a = truth('avnrt', 'atypical').beats.filter((b) => b.pOn !== null);
    expect(a.length).toBeGreaterThan(5);
    expect(a.every((b) => b.pOn! < b.qrsOn)).toBe(true);
  });

  it('orthodromic AVRT: the retrograde P′ follows each QRS by 70 ms or more, before half the cycle (orthodromic-avrt)', () => {
    const t = truth('avrt');
    const rr = t.beats[2].qrsOn - t.beats[1].qrsOn;
    const own = t.beats.filter((b) => b.pOn !== null);
    expect(own.length).toBeGreaterThan(5);
    for (const b of own) {
      expect(b.pOn! - b.qrsOn).toBeGreaterThanOrEqual(70);
      expect(b.pOn! - b.qrsOn).toBeLessThan(rr / 2);
    }
  });

  it('pacing: AAI paced P waves conduct; VVI paced complexes; DDD AV delay 170 ms from the atrial stimulus (ddd-behaviour)', () => {
    const aai = truth('paced-aai');
    expect(aai.atrial.filter((a) => a.kind === 'paced').every((a) => a.conductedTo !== null || a.t > 9700)).toBe(true);
    expect(aai.beats.every((b) => b.kind === 'paced-atrial')).toBe(true);
    expect(truth('paced-vvi').beats.every((b) => b.kind === 'paced-ventricular')).toBe(true);
    const ddd = truth('paced-ddd');
    // the paced QRS is timed from its stimulus; the paced P starts 4 ms after its own plus a few ms of visible onset
    for (const b of ddd.beats) {
      expect(b.qrsOn - b.pOn!).toBeGreaterThanOrEqual(170 - 12);
      expect(b.qrsOn - b.pOn!).toBeLessThanOrEqual(170 - 4);
    }
    expect(truth('paced-ddd', 'tracking').atrial.every((a) => a.kind === 'sinus')).toBe(true);
  });

  it('pacing faults are recorded: stimuli without capture, the oversensed windows', () => {
    expect(truth('pacing-failure-capture').facts.stimuli).toMatch(/[1-9] not captured/);
    expect(truth('pacing-oversensing').facts.oversensedMs).toMatch(/\d+–\d+/);
    const u = truth('pacing-undersensing');
    expect(u.beats.some((b) => b.kind === 'sinus')).toBe(true);
    expect(u.beats.some((b) => b.kind === 'paced-ventricular')).toBe(true);
  });

  it('VF, ventricular flutter and asystole carry no measurable intervals; asystole has no complex', () => {
    expect(truth('asystole').beats).toHaveLength(0);
    expect(truth('asystole').hrBpm).toBe(0);
    expect(truth('asystole', 'p-wave').atrial.filter((a) => a.kind === 'sinus').length).toBeGreaterThan(5);
    expect(truth('ventricular-fibrillation').prMs).toBeNull();
  });

  it('torsades: sinus lead-in with a long QT, then a ventricular run (torsades)', () => {
    const t = truth('torsades');
    expect(t.beats[0].kind).toBe('sinus');
    expect(t.beats.filter((b) => b.kind === 'ventricular').length).toBeGreaterThanOrEqual(10);
    expect(t.beats[0].tOff - t.beats[0].qrsOn).toBeGreaterThan(500);
  });

  it('sinus-node dysfunction: an atrial burst, then a pause ≥ 2 s (sick-sinus)', () => {
    const t = truth('sinus-node-dysfunction');
    const rr = t.beats.slice(1).map((b, i) => b.qrsOn - t.beats[i].qrsOn);
    expect(rr.some((x) => x < 400)).toBe(true);
    expect(Math.max(...rr)).toBeGreaterThanOrEqual(2000);
  });
});
