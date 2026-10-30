import { describe, expect, it } from 'vitest';
import type { AtrialEvent, BeatMarks } from '../../src/core/ecg';
import { demoTruth, DEMO_RHYTHMS } from '../../src/figures/math/demo';
import { A_SPREAD, atrialOnsets, buildLadder } from '../../src/figures/math/ladder';

describe('laddergram layout from truth', () => {
  it('Wenckebach: AV lines lengthen, the 4th P is blocked with a bar in the AV tier', () => {
    const truth = demoTruth('wenckebach');
    const L = buildLadder(truth, { maxBeats: 7 });
    const ante = L.segments.filter((s) => s.kind === 'antegrade');
    const blocked = L.segments.filter((s) => s.kind === 'blocked');
    expect(ante.length).toBe(7);
    expect(blocked.length).toBe(2);
    // every AV line runs from the bottom of A (y = 1) to the top of V (y = 2) and ends at QRS onset
    for (const s of ante) {
      expect(s.y0).toBe(1);
      expect(s.y1).toBe(2);
      expect(truth.beats.some((b) => b.qrsOn === s.x1)).toBe(true);
    }
    // labels are the PR intervals, progressively longer within a cycle
    const prs = L.labels.map((l) => l.ms);
    expect(prs.slice(0, 3)).toEqual([180, 280, 320]);
    expect(prs[3]).toBe(180);
    // blocked impulses stop half-way through the AV tier, with a block mark there
    for (const s of blocked) {
      expect(s.y0).toBe(1);
      expect(s.y1).toBe(1.5);
      expect(L.marks.some((m) => m.kind === 'block' && m.t === s.x1 && m.y === 1.5)).toBe(true);
    }
    // the layout spans the shown beats
    expect(L.t0).toBeLessThan(truth.beats[0].pOn!);
    expect(L.t1).toBeGreaterThan(truth.beats[6].qrsOn);
  });

  it('complete AV block: no antegrade conduction, ventricular escape originates in the V tier', () => {
    const truth = demoTruth('complete');
    const L = buildLadder(truth);
    expect(L.segments.filter((s) => s.kind === 'antegrade').length).toBe(0);
    const origins = L.marks.filter((m) => m.kind === 'origin');
    expect(origins.length).toBe(truth.beats.length);
    for (const m of origins) {
      expect(m.y).toBeGreaterThan(2);
      expect(m.y).toBeLessThan(3);
    }
    // every shown P is drawn in the A tier and blocked
    expect(L.segments.filter((s) => s.kind === 'atrial').length).toBe(L.atrial.length);
    expect(L.segments.filter((s) => s.kind === 'blocked').length).toBe(L.atrial.length);
  });

  it('PVC: ventricular origin, and the hidden sinus P is blocked (concealed in the AV node)', () => {
    const truth = demoTruth('pvc');
    const L = buildLadder(truth);
    const pvc = truth.beats.findIndex((b) => b.kind === 'ventricular');
    expect(L.marks.some((m) => m.kind === 'origin' && m.t === truth.beats[pvc].qrsOn)).toBe(true);
    expect(L.segments.filter((s) => s.kind === 'blocked').length).toBe(1);
  });

  it('every demo rhythm lays out inside its time window and tiers', () => {
    for (const id of DEMO_RHYTHMS) {
      const L = buildLadder(demoTruth(id));
      expect(L.t1).toBeGreaterThan(L.t0);
      for (const s of L.segments) {
        for (const y of [s.y0, s.y1]) {
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('normalises atrial event times to P onset when t is the P peak', () => {
    const b = (pOn: number): BeatMarks => ({
      kind: 'sinus',
      pOn,
      pOff: pOn + 100,
      qrsOn: pOn + 200,
      qrsOff: pOn + 290,
      j: pOn + 290,
      tPeak: pOn + 470,
      tOff: pOn + 580,
      uOff: null,
      aberrant: false,
    });
    const beats = [b(100), b(1000)];
    const atrial: AtrialEvent[] = [
      { t: 150, kind: 'sinus', conductedTo: 0, visible: true },
      { t: 600, kind: 'sinus', conductedTo: null, visible: true },
      { t: 1050, kind: 'sinus', conductedTo: 1, visible: true },
    ];
    const on = atrialOnsets({ atrial, beats, prMs: 200 });
    expect(on).toEqual([100, 550, 1000]);
    const L = buildLadder({ atrial, beats, prMs: 200 });
    const blocked = L.segments.find((s) => s.kind === 'blocked')!;
    expect(blocked.x0).toBe(550 + A_SPREAD);
  });

  it('synthesises atrial events from P onsets when the truth has none', () => {
    const truth = demoTruth('sinus');
    const L = buildLadder({ ...truth, atrial: [] });
    expect(L.segments.filter((s) => s.kind === 'antegrade').length).toBe(L.beats.length);
  });
});
