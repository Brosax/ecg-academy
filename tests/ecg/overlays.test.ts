import { describe, expect, it } from 'vitest';
import { sampleAt } from '../../src/core/ecg';
import { leadArray } from '../../src/ecg/layout';
import { computeSheet } from '../../src/ecg/layout';
import { panelWaveLabels } from '../../src/ecg/draw';
import {
  atrialLabels,
  beatAtrial,
  atrialName,
  beatLabels,
  beatSpan,
  beatsInWindow,
  beatsOverlapping,
  dominantKind,
  humpPeak,
  intervalBrackets,
  isoBaseline,
  morphology,
  overlayFlags,
  qrsComponents,
  representativeBeat,
  stMeasure,
  stNotable,
} from '../../src/ecg/overlays';
import type { AtrialEvent, Ecg, EcgTruth } from '../../src/core/ecg';
import { fixtureEcg, handEcg, opts } from './fixtures';

const must = <T>(v: T | null | undefined): T => {
  if (v === null || v === undefined) throw new Error('missing');
  return v;
};

describe('representative beat', () => {
  const ecg = fixtureEcg({ uWave: true });
  const truth = must(ecg.truth);

  it('picks a dominant, fully visible beat away from the edge', () => {
    expect(dominantKind(truth)).toBe('sinus');
    const inside = beatsInWindow(truth, 0, 10000);
    expect(inside.length).toBe(truth.beats.length);
    expect(representativeBeat(truth, 0, 10000)).toBe(inside[1]);
    // a 2.5 s column holds two or three beats; the chosen one lies inside it
    const b = must(representativeBeat(truth, 2500, 5000));
    expect(truth.beats[b].qrsOn).toBeGreaterThan(2500);
    expect(truth.beats[b].tOff).toBeLessThan(5000);
    expect(representativeBeat(truth, 0, 100)).toBeNull();
  });

  it('interval brackets of the dominant beat equal the truth intervals', () => {
    const b = truth.beats[1];
    const br = intervalBrackets(b);
    expect(br.map((x) => x.kind)).toEqual(['PR', 'QRS', 'QT']);
    expect(br[0].ms).toBe(truth.prMs);
    expect(br[1].ms).toBe(truth.qrsMs);
    expect(br[2].ms).toBe(truth.qtMs);
    expect(br[0].color).toBe('c-conduction');
    expect(intervalBrackets({ ...b, pOn: null, pOff: null }).map((x) => x.kind)).toEqual(['QRS', 'QT']);
  });
});

describe('QRS naming (hand-built leads)', () => {
  const ecg = handEcg();
  const truth = must(ecg.truth);
  const b = truth.beats[0];
  const names = (lead: 'II' | 'V1' | 'V2' | 'aVR', pol: 1 | -1 = 1) => {
    const a = must(leadArray(ecg.signal, lead));
    return morphology(qrsComponents(a, ecg.signal.fs, b.qrsOn, b.qrsOff, isoBaseline(a, ecg.signal.fs, b), pol));
  };

  it('names q/R/s, rS, QS and rSR′ with the 0.5 mV capital rule', () => {
    expect(names('II')).toBe('qRs');
    expect(names('V1')).toBe('rS');
    expect(names('aVR')).toBe('QS');
    expect(names('V2')).toBe('rSR′');
  });

  it('a trace running into an elevated or depressed ST segment is not named as an extra wave', () => {
    const fs = ecg.signal.fs;
    const base = must(leadArray(ecg.signal, 'II'));
    const shifted = (mv: number) => {
      const a = Float32Array.from(base);
      // injury current: the ST level ramps up from 385 ms and is fully displaced at the QRS end (400 ms)
      for (let i = 0; i < a.length; i++) {
        const t = (i * 1000) / fs;
        const k = t < 385 ? 0 : t < 400 ? (t - 385) / 15 : t < 600 ? 1 : 0;
        a[i] += mv * k;
      }
      return a;
    };
    for (const mv of [0.3, -0.3]) {
      const a = shifted(mv);
      expect(morphology(qrsComponents(a, fs, b.qrsOn, b.qrsOff, isoBaseline(a, fs, b)))).toBe('qRs');
    }
    // a real terminal wave (it peaks and returns before the QRS end) is still named
    expect(names('V2')).toBe('rSR′');
  });

  it('Brugada: the J-point elevation is labelled J where the J point is displaced, not named r′', () => {
    const fs = ecg.signal.fs;
    const v2 = Float32Array.from(must(leadArray(ecg.signal, 'V1')));
    // coved J-point / ST elevation ramping up in the last 15 ms of the QRS (rS + elevation)
    for (let i = 0; i < v2.length; i++) {
      const t = (i * 1000) / fs;
      v2[i] += t < 385 ? 0 : t < 400 ? (0.3 * (t - 385)) / 15 : t < 600 ? 0.3 * (1 - (t - 400) / 200) : 0;
    }
    const sig = { ...ecg.signal, leads: { ...ecg.signal.leads, V2: v2 } };
    const brugada = { ...truth, findings: ['brugada-type1'] as const };
    expect(overlayFlags(brugada).jWave).toBe(true);
    const labels = beatLabels(sig, brugada, 0, 'V2');
    expect(labels.map((l) => l.text)).toEqual(['P', 'r', 'S', 'J', 'T']);
    expect(must(labels.find((l) => l.tag === 'J')).t).toBe(b.j);
    // a lead with a flat J point gets no J
    expect(beatLabels(sig, brugada, 0, 'V1').some((l) => l.tag === 'J')).toBe(false);
  });

  it('names the inverted −aVR trace in its displayed polarity', () => {
    expect(names('aVR', -1)).toBe('R');
  });

  it('component peaks sit on the drawn deflection', () => {
    const a = must(leadArray(ecg.signal, 'II'));
    const c = qrsComponents(a, ecg.signal.fs, b.qrsOn, b.qrsOff, 0);
    const r = must(c.find((x) => x.tag === 'R'));
    expect(r.t).toBeCloseTo(350, 0);
    expect(r.mv).toBeCloseTo(sampleAt(a, ecg.signal.fs, r.t), 6);
    expect(r.amp).toBeGreaterThan(1.1);
  });

  it('beat labels: P, QRS parts and T at their extrema, coloured by role', () => {
    const labels = beatLabels(ecg.signal, truth, 0, 'II');
    expect(labels.map((l) => l.text)).toEqual(['P', 'q', 'R', 's', 'T']);
    const p = must(labels.find((l) => l.tag === 'P'));
    expect(p.t).toBeCloseTo(150, 0);
    expect(p.color).toBe('c-atrial');
    expect(p.up).toBe(true);
    const t = must(labels.find((l) => l.tag === 'T'));
    expect(t.t).toBeCloseTo(600, 0);
    expect(t.color).toBe('c-repol');
    expect(must(labels.find((l) => l.tag === 'R')).color).toBe('c-qrs');
    // the inverted −aVR panel: QS becomes an upright R, P and T point down
    const inv = beatLabels(ecg.signal, truth, 0, 'aVR', -1);
    expect(inv.map((l) => l.text)).toEqual(['P', 'R', 'T']);
    expect(must(inv.find((l) => l.tag === 'P')).up).toBe(false);
  });

  /** The hand ECG with one lead's samples changed by `add(t)` (mV). */
  const withAdded = (lead: 'II' | 'V1', add: (t: number) => number): Ecg => {
    const src = must(leadArray(ecg.signal, lead));
    const a = new Float32Array(src.length);
    for (let i = 0; i < a.length; i++) a[i] = src[i] + add((i * 1000) / ecg.signal.fs);
    return { ...ecg, signal: { ...ecg.signal, leads: { ...ecg.signal.leads, [lead]: a } } };
  };
  const g = (t: number, c: number, s: number, amp: number) => amp * Math.exp(-0.5 * ((t - c) / s) ** 2);

  it('U is a real hump after T end, never the T tail at T end', () => {
    // T end marked early (680 ms) while the T wave is still returning to the baseline: no U wave in the signal
    const early: EcgTruth = { ...truth, beats: [{ ...b, tOff: 680, uOff: 900 }] };
    expect(beatLabels(ecg.signal, early, 0, 'II').some((l) => l.tag === 'U')).toBe(false);
    // a 0.05 mV U wave at 790 ms is labelled on its own peak
    const withU = withAdded('II', (t) => g(t, 790, 30, 0.05));
    const u = must(beatLabels(withU.signal, early, 0, 'II').find((l) => l.tag === 'U'));
    expect(u.t).toBeGreaterThan(770);
    expect(u.t).toBeLessThan(800);
    expect(u.up).toBe(true);
  });

  it('a coved ST segment running down into a negative T: T is the negative T, not the ST', () => {
    // high take-off at the J point (V1, Brugada-like) descending into an inverted T at 600 ms
    const coved = withAdded('V1', (t) => g(t, 410, 40, 0.5) - g(t, 600, 45, 0.6)); // the shared T (+0.3) becomes −0.3
    const t = must(beatLabels(coved.signal, truth, 0, 'V1').find((l) => l.tag === 'T'));
    expect(t.t).toBeGreaterThan(560);
    expect(t.t).toBeLessThan(640);
    expect(t.up).toBe(false);
  });

  it('a depressed ST segment sloping back to the baseline has no T peak: no "T" on the ST segment', () => {
    const s01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    // reciprocal-type ST depression (−0.2 mV) recovering to the baseline by T end; the T wave is absorbed in it
    const dep = (t: number) => (t < 380 ? 0 : t < 420 ? -0.2 * s01((t - 380) / 40) : -0.2 * (1 - s01((t - 440) / 280)));
    const flat = withAdded('II', (t) => dep(t) - g(t, 600, 45, 0.3) + g(t, 600, 45, 0.04));
    expect(beatLabels(flat.signal, truth, 0, 'II').some((l) => l.tag === 'T')).toBe(false);
    // the same depression with a real T hump on top keeps its T label at the hump
    const hump = withAdded('II', (t) => dep(t));
    const tl = must(beatLabels(hump.signal, truth, 0, 'II').find((l) => l.tag === 'T'));
    expect(Math.abs(tl.t - 600)).toBeLessThan(40);
  });

  it('humpPeak ignores window edges and finds the furthest interior peak', () => {
    const a = new Float32Array([0, 0.5, 0.4, 0.3, 0.35, 0.2, -0.6, -0.1, 0]);
    expect(humpPeak(a, 1000, 0, 8, 0)).toEqual({ t: 6, mv: a[6] });
    // a monotonic tail has no hump
    expect(humpPeak(new Float32Array([0.5, 0.4, 0.3, 0.2, 0.1, 0.05]), 1000, 0, 5, 0)).toBeNull();
  });
});

describe('wave labels from the dipole fixture', () => {
  it('normal beat with U wave', () => {
    const ecg = fixtureEcg({ uWave: true });
    const truth = must(ecg.truth);
    const tags = beatLabels(ecg.signal, truth, 1, 'II').map((l) => l.tag);
    expect(tags).toContain('P');
    expect(tags).toContain('R');
    expect(tags).toContain('T');
    expect(tags).toContain('U');
    expect(tags).not.toContain('delta');
    expect(tags).not.toContain('J');
    const r = must(beatLabels(ecg.signal, truth, 1, 'II').find((l) => l.tag === 'R'));
    expect(r.text).toBe('R');
  });

  it('ST elevation and its reciprocal depression add no primed waves', () => {
    for (const st of [[-0.08, 0.28, 0.02], [0.05, -0.02, 0.26]] as const) {
      const ecg = fixtureEcg({ st, hrBpm: 80 });
      const truth = must(ecg.truth);
      for (const lead of ['I', 'II', 'III', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
        const texts = beatLabels(ecg.signal, truth, 1, lead).map((l) => l.text);
        expect(texts.some((t) => t.includes('′'))).toBe(false);
      }
    }
  });

  it('δ only with pre-excitation, J only with an Osborn wave', () => {
    const wpw = fixtureEcg({ wpw: true });
    const tw = must(wpw.truth);
    expect(overlayFlags(tw)).toEqual({ delta: true, jWave: false });
    expect(beatLabels(wpw.signal, tw, 1, 'II').some((l) => l.tag === 'delta' && l.text === 'δ')).toBe(true);
    const os = fixtureEcg({ jWave: true, hrBpm: 50 });
    const to = must(os.truth);
    expect(overlayFlags(to).jWave).toBe(true);
    const j = must(beatLabels(os.signal, to, 1, 'II').find((l) => l.tag === 'J'));
    expect(j.t).toBeGreaterThan(to.beats[1].qrsOff - 6);
    expect(j.t).toBeLessThanOrEqual(to.beats[1].j);
    expect(j.color).toBe('c-injury');
  });

  it('blocked P waves are labelled on their own', () => {
    const ecg = fixtureEcg({ blockedEvery: 4, hrBpm: 84 });
    const truth = must(ecg.truth);
    const blocked = truth.atrial.filter((a) => a.conductedTo === null);
    expect(blocked.length).toBeGreaterThan(0);
    const labels = atrialLabels(ecg.signal, truth, 'II', 0, 10000);
    expect(labels.length).toBe(blocked.filter((a) => a.t + 100 <= 10000).length);
    for (const l of labels) {
      expect(l.tag).toBe('P');
      expect(l.beat).toBe(-1);
    }
  });
});

describe('ST markers', () => {
  it('J and J+60 with the truth ST deviation', () => {
    const ecg = fixtureEcg({ st: [-0.08, 0.28, 0.02], hrBpm: 80 });
    const truth = must(ecg.truth);
    for (const lead of ['II', 'III', 'aVF', 'aVL', 'V2'] as const) {
      const st = must(stMeasure(ecg.signal, truth, 1, lead));
      expect(st.fromTruth).toBe(true);
      expect(st.stMv).toBe(truth.stMv[lead]);
      expect(st.j60 - st.j).toBe(60);
      // the truth agrees with what is measurable on the signal
      expect(st.j60Mv - st.baseline).toBeCloseTo(must(truth.stMv[lead]), 2);
    }
    expect(must(truth.stMv.II)).toBeGreaterThan(0.1); // inferior elevation
    expect(must(truth.stMv.aVL)).toBeLessThan(-0.05); // reciprocal depression
  });

  it('notable deviations follow lead-specific thresholds (V2–V3 elevation 0.2 mV, depression 0.05 mV)', () => {
    expect(stNotable('V5', 0.1)).toBe(true);
    expect(stNotable('II', 0.08)).toBe(false);
    // up to 0.2 mV of ST elevation in V2–V3 is common in healthy hearts: not painted
    expect(stNotable('V2', 0.15)).toBe(false);
    expect(stNotable('V3', 0.2)).toBe(true);
    // depression counts from 0.05 mV (aVR included: −aVR panels are judged on aVR itself)
    expect(stNotable('aVL', -0.05)).toBe(true);
    expect(stNotable('V5', -0.04)).toBe(false);
    expect(stNotable('aVR', -0.1)).toBe(true);
  });

  it('falls back to the measured deviation when the truth has none', () => {
    const ecg = handEcg();
    const st = must(stMeasure(ecg.signal, must(ecg.truth), 0, 'II'));
    expect(st.fromTruth).toBe(false);
    expect(st.stMv).toBeCloseTo(st.j60Mv - st.baseline, 9);
  });
});

describe('atrial wave names', () => {
  const ecg = handEcg();
  const truth = must(ecg.truth);
  const withAtrial = (kind: AtrialEvent['kind']): EcgTruth => ({ ...truth, atrial: [{ t: 100, kind, conductedTo: 0, visible: true }] });

  it('sinus / paced P, ectopic and retrograde P′, flutter F, fibrillation unnamed', () => {
    expect(atrialName('sinus')).toEqual({ tag: 'P', text: 'P' });
    expect(atrialName('paced')).toEqual({ tag: 'P', text: 'P' });
    expect(atrialName(null)).toEqual({ tag: 'P', text: 'P' });
    expect(atrialName('ectopic')).toEqual({ tag: 'P', text: 'P′' });
    expect(atrialName('retrograde')).toEqual({ tag: 'P', text: 'P′' });
    expect(atrialName('flutter')).toEqual({ tag: 'F', text: 'F' });
    expect(atrialName('fibrillation')).toBeNull();
  });

  it('a conducted wave is named after the atrial event that conducted the beat', () => {
    const first = (t: EcgTruth) => beatLabels(ecg.signal, t, 0, 'II')[0];
    expect(first(truth).text).toBe('P');
    expect(first(withAtrial('ectopic')).text).toBe('P′');
    const f = first(withAtrial('flutter'));
    expect(f.tag).toBe('F');
    expect(f.text).toBe('F');
    expect(f.color).toBe('c-atrial');
    const af = beatLabels(ecg.signal, withAtrial('fibrillation'), 0, 'II');
    expect(af.some((l) => l.tag === 'P' || l.tag === 'F')).toBe(false);
    expect(af.map((l) => l.text)).toEqual(['q', 'R', 's', 'T']);
  });

  it('non-conducted ectopic waves are P′, fibrillatory waves are never labelled', () => {
    // the beat has no P of its own here (e.g. a junctional escape), so the wave at 100 ms is a blocked atrial wave
    const blocked = (kind: AtrialEvent['kind']): EcgTruth => ({
      ...truth,
      beats: [{ ...truth.beats[0], pOn: null, pOff: null }],
      atrial: [{ t: 100, kind, conductedTo: null, visible: true }],
    });
    expect(atrialLabels(ecg.signal, blocked('ectopic'), 'II', 0, 1200).map((l) => l.text)).toEqual(['P′']);
    expect(atrialLabels(ecg.signal, blocked('flutter'), 'II', 0, 1200).map((l) => l.text)).toEqual(['F']);
    expect(atrialLabels(ecg.signal, blocked('fibrillation'), 'II', 0, 1200)).toEqual([]);
  });

  it('a conducted wave whose beat has no P window is still labelled, once', () => {
    const s = computeSheet(ecg.signal, opts({ layout: 'single', lead: 'II' }));
    for (const [kind, text] of [['flutter', 'F'], ['sinus', 'P'], ['ectopic', 'P′']] as const) {
      const noWindow: EcgTruth = { ...truth, beats: [{ ...truth.beats[0], pOn: null, pOff: null }], atrial: [{ t: 100, kind, conductedTo: 0, visible: true }] };
      const atrial = panelWaveLabels(ecg.signal, noWindow, s.panels[0]).filter((l) => l.tag === 'P' || l.tag === 'F');
      expect(atrial.map((l) => l.text)).toEqual([text]);
    }
    // with a P window the beat labels its own P; atrialLabels adds nothing
    expect(atrialLabels(ecg.signal, { ...truth, atrial: [{ t: 100, kind: 'flutter', conductedTo: 0, visible: true }] }, 'II', 0, 1200)).toEqual([]);
  });

  it("a beat's own retrograde P′ (not conducted to the ventricles) is named P′ once, with its beat", () => {
    const junctional: EcgTruth = {
      ...truth,
      beats: [{ ...truth.beats[0], kind: 'junctional' }],
      atrial: [{ t: 100, kind: 'retrograde', conductedTo: null, visible: true }],
    };
    expect(beatAtrial(junctional, 0)?.kind).toBe('retrograde');
    expect(beatLabels(ecg.signal, junctional, 0, 'II')[0].text).toBe('P′');
    expect(atrialLabels(ecg.signal, junctional, 'II', 0, 1200)).toEqual([]);
    const s = computeSheet(ecg.signal, opts({ layout: 'single', lead: 'II' }));
    const atrialTexts = panelWaveLabels(ecg.signal, junctional, s.panels[0]).filter((l) => l.tag === 'P');
    expect(atrialTexts.map((l) => l.text)).toEqual(['P′']);
    // no atrial event at all: the beat's P is still a plain P
    expect(beatAtrial({ ...truth, atrial: [] }, 0)).toBeNull();
    expect(beatLabels(ecg.signal, { ...truth, atrial: [] }, 0, 'II')[0].text).toBe('P');
  });

  it('PR bracket only for a P wave that precedes and conducts the QRS', () => {
    const b = truth.beats[0];
    expect(intervalBrackets(b, 'sinus').map((x) => x.kind)).toEqual(['PR', 'QRS', 'QT']);
    expect(intervalBrackets(b, 'ectopic')[0].kind).toBe('PR');
    expect(intervalBrackets(b, 'flutter').map((x) => x.kind)).toEqual(['QRS', 'QT']);
    expect(intervalBrackets(b, 'fibrillation').map((x) => x.kind)).toEqual(['QRS', 'QT']);
    // junctional rhythm: a retrograde P′ just before the QRS keeps its short P′R
    const early = { ...b, pOn: b.qrsOn - 80, pOff: b.qrsOn - 20 };
    const pr = intervalBrackets(early, 'retrograde')[0];
    expect(pr.kind).toBe('PR');
    expect(pr.ms).toBe(80);
    // a retrograde P after the QRS never gives a (negative) PR
    const retro = { ...b, pOn: b.qrsOff + 20, pOff: b.qrsOff + 80 };
    expect(intervalBrackets(retro).map((x) => x.kind)).toEqual(['QRS', 'QT']);
    expect(intervalBrackets(retro, 'retrograde').map((x) => x.kind)).toEqual(['QRS', 'QT']);
    expect(beatSpan(retro)[0]).toBe(b.qrsOn);
  });
});

describe('beats cut by a strip edge', () => {
  const ecg = fixtureEcg({ hrBpm: 72 });
  const truth = must(ecg.truth);
  const b = truth.beats[2];

  it('overlap keeps a beat whose QRS is visible; the representative beat stays strictly inside', () => {
    const t0 = b.qrsOn - 10; // the window starts inside the PR segment: P wave cut off
    expect(beatsInWindow(truth, t0, t0 + 3000)).not.toContain(2);
    expect(beatsOverlapping(truth, t0, t0 + 3000)).toContain(2);
    expect(representativeBeat(truth, t0, t0 + 3000)).not.toBe(2);
  });

  it('a single-lead window starting mid-beat labels the visible QRS and T, not the hidden P', () => {
    const t0 = b.qrsOn - 10;
    const s = computeSheet(ecg.signal, opts({ layout: 'single', lead: 'II', window: [t0, t0 + 2000] }));
    const labels = panelWaveLabels(ecg.signal, truth, s.panels[0]);
    const ofBeat = labels.filter((l) => l.beat === 2).map((l) => l.tag);
    expect(ofBeat).toContain('R');
    expect(ofBeat).toContain('T');
    expect(ofBeat).not.toContain('P');
    for (const l of labels) {
      expect(l.t).toBeGreaterThanOrEqual(t0);
      expect(l.t).toBeLessThanOrEqual(t0 + 2000);
    }
  });
});
