/**
 * AutoMark resolution on real synthetic ECGs (src/synth generate): the brackets agree with the model truth, the default
 * beat sits inside the panel where the mark's lead is drawn, and morphology marks find the waves the engine drew.
 * (tests/course/marks.test.ts covers the same logic exactly on hand-built signals.)
 */
import { describe, expect, it } from 'vitest';
import type { AutoMark } from '../../src/course/api';
import { leadWindows, resolveMarks } from '../../src/course/marks';
import type { Ecg } from '../../src/core/ecg';
import type { EcgMark } from '../../src/ecg/api';
import { generate } from '../../src/synth';

const ecgOf = (scenario: string, seed: number): Ecg => generate({ scenario, seed }).ecg;
const span = (m: EcgMark): number => (m.kind === 'bracket' || m.kind === 'region' ? m.t1 - m.t0 : NaN);
const first = (ms: readonly EcgMark[], kind: EcgMark['kind']) => ms.find((m) => m.kind === kind);

describe('resolveMarks on a synthetic normal ECG', () => {
  const ecg = ecgOf('normal', 12);
  const truth = ecg.truth!;
  const dur = ecg.signal.durationMs;

  it('has truth with beats', () => {
    expect(truth.beats.length).toBeGreaterThan(5);
  });

  it('interval brackets equal the chosen beat’s own fiducials and agree with the truth intervals', () => {
    const marks: AutoMark[] = [{ auto: 'pr' }, { auto: 'qrs' }, { auto: 'qt' }, { auto: 'rr' }];
    const [pr, qrs, qt, rr] = marks.map((m) => resolveMarks(ecg, [m], { layout: '3x4+1' }));
    for (const r of [pr, qrs, qt, rr]) expect(r).toHaveLength(1);
    // the dominant beat's intervals are what truth reports (± one beat's natural variation)
    expect(Math.abs(span(pr[0]) - (truth.prMs ?? NaN))).toBeLessThanOrEqual(20);
    expect(Math.abs(span(qrs[0]) - truth.qrsMs)).toBeLessThanOrEqual(10);
    expect(Math.abs(span(qt[0]) - truth.qtMs)).toBeLessThanOrEqual(30);
    expect(Math.abs(span(rr[0]) - 60000 / truth.hrBpm)).toBeLessThanOrEqual(0.15 * (60000 / truth.hrBpm));
    // the bracket is a real beat of the record
    const qb = qrs[0] as Extract<EcgMark, { kind: 'bracket' }>;
    expect(truth.beats.some((b) => b.qrsOn === qb.t0 && b.qrsOff === qb.t1)).toBe(true);
  });

  it('a V1 mark uses a beat inside the V1 column of the 3×4 sheet', () => {
    const r = resolveMarks(ecg, [{ auto: 'qrs', lead: 'V1' }], { layout: '3x4+1' });
    expect(r).toHaveLength(1);
    const m = r[0] as Extract<EcgMark, { kind: 'bracket' }>;
    const col = leadWindows('V1', dur, { layout: '3x4+1' })[0];
    expect(m.t0).toBeGreaterThanOrEqual(col[0]);
    expect(m.t1).toBeLessThanOrEqual(col[1]);
  });

  it('wave labels: V1 has a small r and a deep S; II has a tall R', () => {
    const v1 = resolveMarks(ecg, [{ auto: 'r', lead: 'V1' }, { auto: 's', lead: 'V1' }], { layout: '3x4+1' });
    const labels = v1.map((m) => (m.kind === 'wave' ? m.label : '')).join(' ');
    expect(labels).toMatch(/r/);
    expect(labels).toMatch(/S/);
    const ii = resolveMarks(ecg, [{ auto: 'r', lead: 'II' }], { layout: '3x4+1' });
    expect(ii.some((m) => m.kind === 'wave' && m.label === 'R')).toBe(true);
  });

  it('a rhythm-strip layout centres the beat in the shown window', () => {
    const r = resolveMarks(ecg, [{ auto: 'pr', lead: 'II' }], { layout: 'strip', lead: 'II', window: [2000, 6000] });
    expect(r).toHaveLength(1);
    const m = r[0] as Extract<EcgMark, { kind: 'bracket' }>;
    expect(m.t0).toBeGreaterThanOrEqual(2000);
    expect(m.t1).toBeLessThanOrEqual(6000);
  });

  it('J+60 marker sits 60 ms after a real J point', () => {
    const r = resolveMarks(ecg, [{ auto: 'st60', lead: 'V2' }], { layout: '3x4+1' });
    const arrow = first(r, 'arrow') as Extract<EcgMark, { kind: 'arrow' }> | undefined;
    expect(arrow).toBeDefined();
    expect(truth.beats.some((b) => Math.abs(b.j + 60 - arrow!.t) < 1e-6)).toBe(true);
  });
});

describe('resolveMarks on a synthetic anterior STEMI', () => {
  it('the ST read-out in V2 reports the truth elevation', () => {
    const ecg = ecgOf('stemi-anterior', 3);
    const r = resolveMarks(ecg, [{ auto: 'st60', lead: 'V2' }], { layout: '3x4+1' });
    const arrow = first(r, 'arrow');
    expect(arrow?.kind).toBe('arrow');
    const st = ecg.truth!.stMv.V2 ?? 0;
    expect(st).toBeGreaterThan(0.1);
    const label = arrow && arrow.kind === 'arrow' && arrow.label && typeof arrow.label === 'object' ? arrow.label.en : '';
    expect(label).toContain(`+${(st * 10).toFixed(1)} mm`);
  });
});
