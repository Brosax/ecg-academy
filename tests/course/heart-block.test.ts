/**
 * The lesson player's 3D-heart block (src/course/blocks.tsx HeartBlock, spec docs/design/f-explainers.md §3): one beat
 * of the block's synthetic ECG as six phases on the shared cursor, one ECG mark per phase (none for the sinus node),
 * phase middles inside their ECG wave, and the in-context Heart Lab link derived from the ECG's findings.
 */
import { describe, expect, it } from 'vitest';
import { HEART_PHASE_AUTO, heartLabHref, heartMarkPhase, heartPhaseMarks, heartPhaseTarget } from '../../src/course/blocks';
import { cardiacPhase, type CardiacPhase } from '../../src/heart3d/phase';
import { labLinks } from '../../src/course/lab';
import { LESSONS } from '../../src/course/lessons/index';
import { defaultBeat, resolveMarks } from '../../src/course/marks';
import type { FindingId } from '../../src/core/findings';
import type { EcgMark } from '../../src/ecg/api';
import { HEART_PHASES, phaseBeats } from '../../src/figures';
import { generate } from '../../src/synth';

const ecg = generate({ scenario: 'normal', seed: 111 }).ecg;
const truth = ecg.truth!;
const k = defaultBeat(truth, ecg.signal.durationMs)!;
const beat = truth.beats[k];
const tl = phaseBeats(HEART_PHASES, beat, 5);
const timeAt = (p: number) => tl.window![0] + (tl.window![1] - tl.window![0]) * p;
const ids = tl.beats.map((b) => b.id);
/** ECG time where prev / next / the phase bar land on phase `id` */
const mid = (id: string) => timeAt(heartPhaseTarget(tl.beats, tl.window!, ids.indexOf(id as (typeof ids)[number]), beat.tOff));
const heartPhaseAt = (ms: number): CardiacPhase => {
  const r = ecg.regions!;
  const s = new Float32Array(r.ids.length);
  r.stateAt(ms, s);
  return cardiacPhase(r.ids, s);
};

describe('HeartBlock timeline (one beat in slow motion)', () => {
  it('window = [pOn − 40, tOff + 60], ×5 clamped to 1.5–6 s, six phases sa … t', () => {
    expect(k).not.toBeNull();
    expect(tl.window).toEqual([beat.pOn! - 40, beat.tOff + 60]);
    expect(tl.durationMs).toBe(Math.max(1500, Math.min(6000, (beat.tOff + 100 - beat.pOn!) * 5)));
    expect(tl.beats.map((b) => b.id)).toEqual(['sa', 'p', 'pr', 'qrs', 'st', 't']);
  });

  it('each phase middle (where prev / next / the bar land) lies inside its own ECG interval', () => {
    expect(mid('sa')).toBeLessThan(beat.pOn!);
    expect(mid('p')).toBeGreaterThan(beat.pOn!);
    expect(mid('p')).toBeLessThan(beat.pOff!);
    expect(mid('pr')).toBeGreaterThan(beat.pOff!);
    expect(mid('pr')).toBeLessThan(beat.qrsOn);
    // reduced motion: Play lands in the middle of the QRS, as before the upgrade
    expect(Math.abs(mid('qrs') - (beat.qrsOn + beat.qrsOff) / 2)).toBeLessThan(1);
    expect(mid('st')).toBeGreaterThan(beat.qrsOff);
    expect(mid('t')).toBeGreaterThan(beat.tPeak ?? beat.qrsOff);
    expect(mid('t')).toBeLessThan(beat.tOff);
  });

  it('at every landing point the 3D heart says the same phase as the bar (its .h3d__phase sentence)', () => {
    const heart: Record<string, CardiacPhase> = { sa: 'rest', p: 'atrial', pr: 'av', qrs: 'qrs', st: 'st', t: 't' };
    for (const id of ids) expect([id, heartPhaseAt(mid(id))]).toEqual([id, heart[id]]);
  });
});

describe('HeartBlock landing points on the other heart blocks (h1 normal 70 bpm, h2 LVH)', () => {
  const heart: Record<string, CardiacPhase> = { sa: 'rest', p: 'atrial', pr: 'av', qrs: 'qrs', st: 'st', t: 't' };
  for (const req of [
    { scenario: 'normal', seed: 1202, dials: { rate: 70 } },
    { scenario: 'lvh', seed: 1222, dials: { rate: 72 } },
  ]) {
    it(`${req.scenario}/${req.seed}: the heart's phase matches the bar at every landing point`, () => {
      const e = generate(req).ecg;
      const tr = e.truth!;
      const kk = defaultBeat(tr, e.signal.durationMs)!;
      const bt = tr.beats[kk];
      const t2 = phaseBeats(HEART_PHASES, bt, 5);
      const r = e.regions!;
      const s = new Float32Array(r.ids.length);
      t2.beats.forEach((b, i) => {
        const ms = t2.window![0] + (t2.window![1] - t2.window![0]) * heartPhaseTarget(t2.beats, t2.window!, i, bt.tOff);
        r.stateAt(ms, s);
        expect([b.id, cardiacPhase(r.ids, s)]).toEqual([b.id, heart[b.id]]);
      });
    });
  }
});

describe('every heart block in the course', () => {
  const blocks = [...LESSONS.values()].flatMap((l) => l.blocks.flatMap((b, i) => (b.kind === 'heart' ? [{ at: `${l.id}[${i}]`, b }] : [])));
  it('there are heart blocks', () => expect(blocks.length).toBeGreaterThan(5));
  it('compiles a six-phase timeline with ordered landing points and a mark only on drawn phases', () => {
    for (const { at, b } of blocks) {
      if (b.ecg.kind !== 'synth') continue;
      const e = generate(b.ecg.req).ecg;
      const tr = e.truth!;
      const kk = defaultBeat(tr, e.signal.durationMs);
      expect(kk, at).not.toBeNull();
      const bt = tr.beats[kk!];
      const t2 = phaseBeats(HEART_PHASES, bt, 5);
      expect(t2.durationMs, at).toBeGreaterThanOrEqual(1500);
      expect(t2.durationMs, at).toBeLessThanOrEqual(6000);
      const ps = t2.beats.map((_, i) => heartPhaseTarget(t2.beats, t2.window!, i, bt.tOff));
      for (let i = 1; i < ps.length; i++) expect(ps[i], `${at} phase ${i}`).toBeGreaterThan(ps[i - 1]);
      for (let i = 0; i < ps.length; i++) expect(t2.beats[i].from <= ps[i] && ps[i] <= t2.beats[i].to, `${at} phase ${i}`).toBe(true);
    }
  });
});

describe('heartPhaseTarget', () => {
  const beats = [
    { id: 'a', from: 0, to: 0.5 },
    { id: 'b', from: 0.5, to: 1 },
  ];
  it('middle of the phase; out-of-range indices clamp; no beats → 0', () => {
    expect(heartPhaseTarget(beats, [0, 100], 0, 100)).toBe(0.25);
    expect(heartPhaseTarget(beats, [0, 100], -3, 100)).toBe(0.25);
    expect(heartPhaseTarget(beats, [0, 100], 9, 100)).toBe(0.75);
    expect(heartPhaseTarget([], [0, 100], 0, 100)).toBe(0);
  });
  it('the last phase is measured only to the end of the T wave', () => {
    expect(heartPhaseTarget(beats, [0, 100], 1, 80)).toBeCloseTo(0.65);
    // a tOff before the phase start never moves the target before it
    expect(heartPhaseTarget(beats, [0, 100], 1, 20)).toBe(0.5);
    expect(heartPhaseTarget(beats, null, 1, 80)).toBe(0.75);
  });
});

describe('heartMarkPhase', () => {
  it('no mark for the sinus node or once the T wave is over', () => {
    expect(heartMarkPhase('sa', 10, 100)).toBe('');
    expect(heartMarkPhase('t', 101, 100)).toBe('');
    expect(heartMarkPhase('t', 100, 100)).toBe('t');
    expect(heartMarkPhase('qrs', 500, 100)).toBe('qrs');
    expect(heartMarkPhase('', null, 100)).toBe('');
  });
});

describe('heartPhaseMarks', () => {
  it('the sinus node (and no phase) marks nothing', () => {
    expect(heartPhaseMarks('sa', 3)).toBeUndefined();
    expect(heartPhaseMarks('', 3)).toBeUndefined();
  });

  it('every other phase marks its own wave on lead II of the chosen beat, in the highlight colour', () => {
    expect(HEART_PHASE_AUTO).toEqual({ sa: null, p: 'p', pr: 'pr-segment', qrs: 'qrs', st: 'st', t: 't' });
    for (const id of ['p', 'pr', 'qrs', 'st', 't'] as const) {
      expect(heartPhaseMarks(id, k)).toEqual([{ auto: HEART_PHASE_AUTO[id], lead: 'II', beat: k, color: 'highlight' }]);
    }
  });

  it('resolves on the block ECG to one region / bracket around the phase middle', () => {
    for (const id of ['p', 'pr', 'qrs', 'st', 't'] as const) {
      const r = resolveMarks(ecg, heartPhaseMarks(id, k), { layout: '3x4+1' });
      expect(r.length, id).toBeGreaterThan(0);
      const m = r.find((x): x is Extract<EcgMark, { kind: 'region' | 'bracket' }> => x.kind === 'region' || x.kind === 'bracket');
      expect(m, id).toBeDefined();
      expect(m!.t0, id).toBeLessThanOrEqual(mid(id) + 1);
      expect(m!.t1, id).toBeGreaterThanOrEqual(mid(id) - 1);
    }
  });
});

describe('heartLabHref', () => {
  const table: Partial<Record<FindingId, string>> = { 'normal-ecg': '#/lab/nsr', 'sinus-rhythm': '#/lab/nsr', lvh: '#/lab/lvh' };
  const links = (fs: readonly FindingId[]) => labLinks(fs, (f) => table[f] ?? null, () => true);

  it('none without truth or without a lab finding', () => {
    expect(heartLabHref(undefined, links)).toBeNull();
    expect(heartLabHref({ rhythm: 'sinus-rhythm', findings: ['brugada-type1'] }, links)).toBeNull();
  });

  it('prefers the finding over the bare rhythm', () => {
    expect(heartLabHref({ rhythm: 'sinus-rhythm', findings: ['sinus-rhythm', 'lvh'] }, links)).toBe('#/lab/lvh');
    expect(heartLabHref({ rhythm: 'sinus-rhythm', findings: ['sinus-rhythm'] }, links)).toBe('#/lab/nsr');
  });

  it("the f1 heart (synthetic normal) links to the lab's normal sinus rhythm", () => {
    expect(heartLabHref(truth)).toBe('#/lab/normal-sinus-rhythm');
  });
});
