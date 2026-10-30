/**
 * AutoMark resolution (src/course/marks.ts) on a hand-built ECG with known fiducials and QRS morphologies.
 */
import { describe, expect, it } from 'vitest';
import type { EcgMark } from '../../src/ecg/api';
import type { LessonMark } from '../../src/course/api';
import {
  AUTO_MARK_KINDS,
  AUTO_MARK_KINDS_COMPLETE,
  defaultBeat,
  dominantKind,
  leadWindows,
  qrsWaves,
  resolveMarks,
  stLabel,
  tOnsetEstimate,
} from '../../src/course/marks';
import { FIRST_QRS_MS, FS, PR_MS, PVC_BEAT, QRS_MS, RR_MS, beatsTruth, realLikeEcg, testEcg } from './fixtures/ecg';

const ecg = testEcg();
const truth = ecg.truth!;
const qrsOn = (k: number) => FIRST_QRS_MS + k * RR_MS;
const one = (m: LessonMark, o = {}) => resolveMarks(ecg, [m], o);

describe('lead windows (mirror of the viewer layout)', () => {
  it('3×4+1: a lead shows one quarter page plus the rhythm strip when it is the rhythm lead', () => {
    expect(leadWindows('II', 10_000)).toEqual([
      [0, 2500],
      [0, 10_000],
    ]);
    expect(leadWindows('V1', 10_000)).toEqual([[5000, 7500]]);
    expect(leadWindows('V6', 10_000, { lead: 'V6' })).toEqual([
      [7500, 10_000],
      [0, 10_000],
    ]);
    expect(leadWindows('all', 10_000)).toHaveLength(13);
  });
  it('Cabrera order moves the limb leads between the first two columns', () => {
    expect(leadWindows('II', 10_000, { cabrera: true, lead: 'V1' })).toEqual([[2500, 5000]]);
    expect(leadWindows('aVL', 10_000, { cabrera: true })).toEqual([[0, 2500]]);
    expect(leadWindows('aVR', 10_000, { cabrera: true })).toEqual([[0, 2500]]);
    expect(defaultBeat(truth, 10_000, leadWindows('II', 10_000, { cabrera: true }))).toBe(4);
  });
  it('50 mm/s halves the page; 6×2 shows the first half page in every lead; single shows its window', () => {
    expect(leadWindows('aVL', 10_000, { speed: 50 })).toEqual([[1250, 2500]]);
    expect(leadWindows('V4', 10_000, { layout: '6x2' })).toEqual([[0, 5000]]);
    expect(leadWindows('V2', 10_000, { layout: 'single', lead: 'V2', window: [2000, 4000] })).toEqual([[2000, 4000]]);
    expect(leadWindows('V3', 10_000, { layout: 'single', lead: 'V2' })).toEqual([]);
  });
});

describe('default beat', () => {
  it('dominant kind ignores the aberrant PVC', () => {
    expect(dominantKind(truth.beats)).toBe('sinus');
  });
  it('without layout information: the dominant beat nearest the middle of the record', () => {
    const k = defaultBeat(truth, 10_000);
    expect(k).toBe(6);
    expect(k).not.toBe(PVC_BEAT);
  });
  it('a lead mark uses a beat that sits wholly inside that lead’s panel, centred', () => {
    expect(defaultBeat(truth, 10_000, leadWindows('II', 10_000))).toBe(1);
    expect(defaultBeat(truth, 10_000, leadWindows('V1', 10_000))).toBe(7);
    expect(defaultBeat(truth, 10_000, leadWindows('V2', 10_000, { layout: 'single', lead: 'V2', window: [2000, 4000] }))).toBe(3);
  });
  it('no beats → null', () => {
    expect(defaultBeat({ ...truth, beats: [] }, 10_000)).toBeNull();
  });
});

describe('QRS wave labelling', () => {
  const b = (k: number) => truth.beats[k];
  const labels = (lead: 'II' | 'V1' | 'V2' | 'aVR') => qrsWaves(ecg.signal.leads[lead], FS, b(1).qrsOn, b(1).qrsOff).map((w) => w.label);
  it('qRs, rS, rSR′ and QS', () => {
    expect(labels('II')).toEqual(['q', 'R', 's']);
    expect(labels('V1')).toEqual(['r', 'S']);
    expect(labels('V2')).toEqual(['r', 'S', 'R′']);
    expect(labels('aVR')).toEqual(['QS']);
  });
  it('wave times sit on the peaks', () => {
    const w = qrsWaves(ecg.signal.leads.II, FS, b(1).qrsOn, b(1).qrsOff);
    expect(w[1].t).toBeCloseTo(qrsOn(1) + 42, 0);
    expect(w[1].mv).toBeGreaterThan(1.1);
  });
  it('excursions under 0.05 mV are not waves; a flat lead has none', () => {
    const flat = new Float32Array(5000);
    expect(qrsWaves(flat, FS, 1000, 1100)).toEqual([]);
    const tiny = flat.map((_v, i) => (i > 510 && i < 520 ? 0.03 : 0));
    expect(qrsWaves(tiny, FS, 1000, 1100)).toEqual([]);
  });
});

describe('resolveMarks', () => {
  it('interval brackets carry the measured value of that beat', () => {
    expect(one({ auto: 'pr' })).toEqual<EcgMark[]>([
      { kind: 'bracket', lead: 'II', t0: qrsOn(1) - PR_MS, t1: qrsOn(1), color: 'atrial', label: { zh: 'PR 160 ms', en: 'PR 160 ms', es: 'PR 160 ms' } },
    ]);
    const qrs = one({ auto: 'qrs', lead: 'V1' })[0];
    expect(qrs).toMatchObject({ kind: 'bracket', lead: 'V1', t0: qrsOn(7), t1: qrsOn(7) + QRS_MS });
    expect(one({ auto: 'qt' })[0]).toMatchObject({ t0: qrsOn(1), t1: qrsOn(1) + 400, color: 'repol' });
    expect(one({ auto: 'rr' })[0]).toMatchObject({ t0: qrsOn(1), t1: qrsOn(2), label: { en: 'RR 800 ms' } });
  });
  it('an explicit beat index wins (and an index out of range draws nothing)', () => {
    expect(one({ auto: 'qrs', beat: PVC_BEAT })[0]).toMatchObject({ t0: qrsOn(PVC_BEAT), t1: qrsOn(PVC_BEAT) + 150, label: { en: 'QRS 150 ms' } });
    expect(one({ auto: 'qrs', beat: 99 })).toEqual([]);
    expect(one({ auto: 'p', beat: PVC_BEAT })).toEqual([]);
  });
  it('regions: P, PR segment, ST (J → estimated T onset), T, U only when present, δ estimate', () => {
    const k = 1;
    const bk = truth.beats[k];
    expect(one({ auto: 'p' })[0]).toMatchObject({ kind: 'region', t0: bk.pOn, t1: bk.pOff, label: 'P' });
    expect(one({ auto: 'pr-segment' })[0]).toMatchObject({ kind: 'region', t0: bk.pOff, t1: bk.qrsOn });
    expect(one({ auto: 'st' })[0]).toMatchObject({ kind: 'region', t0: bk.j, t1: tOnsetEstimate(bk) });
    expect(tOnsetEstimate(bk)).toBe(bk.j + (300 - QRS_MS) / 2);
    expect(one({ auto: 't' })[0]).toMatchObject({ t0: tOnsetEstimate(bk), t1: bk.tOff, color: 'repol' });
    expect(one({ auto: 'u' })).toEqual([]);
    const d = one({ auto: 'delta' })[0];
    expect(d).toMatchObject({ kind: 'region', t0: bk.qrsOn });
    expect(d.kind === 'region' && d.t1 - d.t0).toBeGreaterThanOrEqual(20);
  });
  it('wave letters per lead; lead "all" expands morphology marks to the twelve leads', () => {
    expect(one({ auto: 'r', lead: 'V2' }).map((m) => (m.kind === 'wave' ? m.label : '?'))).toEqual(['r', 'R′']);
    expect(one({ auto: 's', lead: 'V2' }).map((m) => (m.kind === 'wave' ? m.label : '?'))).toEqual(['S']);
    expect(one({ auto: 'q', lead: 'aVR' }).map((m) => (m.kind === 'wave' ? m.label : '?'))).toEqual(['QS']);
    expect(one({ auto: 'q', lead: 'V1' })).toEqual([]);
    const allR = one({ auto: 'r', lead: 'all' });
    expect(new Set(allR.map((m) => m.lead)).size).toBe(11); // aVR is QS: no R
    expect(one({ auto: 'j', lead: 'all' })).toHaveLength(12);
  });
  it('st60: reference line at the PR level and an arrow at J+60 labelled from the truth (es with a decimal comma)', () => {
    const m = one({ auto: 'st60', lead: 'V3' });
    expect(m).toHaveLength(2);
    const [line, arrow] = m;
    expect(line).toMatchObject({ kind: 'hline', lead: 'V3' });
    expect(line.kind === 'hline' && Math.abs(line.mv)).toBeLessThan(0.02);
    expect(arrow).toMatchObject({ kind: 'arrow', lead: 'V3', t: qrsOn(7) + QRS_MS + 60 });
    expect(arrow.kind === 'arrow' && arrow.mv).toBeGreaterThan(0.15);
    expect(arrow.kind === 'arrow' && arrow.label).toEqual(stLabel(0.2));
    expect(stLabel(0.2)).toEqual({ zh: 'ST +2.0 mm (+0.20 mV)', en: 'ST +2.0 mm (+0.20 mV)', es: 'ST +2,0 mm (+0,20 mV)' });
    expect(stLabel(-0.05).en).toBe('ST −0.5 mm (−0.05 mV)');
  });
  it('blocked P waves come from the atrial events (P duration = median of the conducted P waves)', () => {
    const m = one({ auto: 'blocked-p' });
    const blocked = beatsTruth().atrial.filter((e) => e.conductedTo === null);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ kind: 'region', lead: 'II', t0: blocked[0].t, t1: blocked[0].t + 100 });
  });
  it('flutter / fibrillation waves and pacing spikes: none in a sinus record', () => {
    expect(one({ auto: 'f-waves' })).toEqual([]);
    expect(one({ auto: 'pacing-spike' })).toEqual([]);
  });
  it('colour and label overrides; wave labels localized with lang', () => {
    expect(one({ auto: 'qrs', color: 'err', label: { zh: '宽', en: 'wide', es: 'ancho' } })[0]).toMatchObject({ color: 'err', label: { en: 'wide' } });
    expect(one({ auto: 'j', lead: 'V1', label: { zh: 'J 点', en: 'J point', es: 'punto J' } }, { lang: 'es' })[0]).toMatchObject({ kind: 'wave', label: 'punto J' });
  });
  it('EcgMarks pass through; AutoMarks are dropped without truth (real ECGs)', () => {
    const explicit: EcgMark = { kind: 'lead', lead: 'V1', color: 'highlight' };
    expect(resolveMarks(realLikeEcg(), [explicit, { auto: 'qrs' }])).toEqual([explicit]);
    expect(resolveMarks(ecg, undefined)).toEqual([]);
  });
  it('every AutoMark kind is listed and resolves without throwing', () => {
    expect(AUTO_MARK_KINDS_COMPLETE).toBe(true);
    for (const auto of AUTO_MARK_KINDS) {
      expect(() => resolveMarks(ecg, [{ auto }, { auto, lead: 'all' }])).not.toThrow();
    }
  });
});
