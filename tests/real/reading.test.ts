import { describe, expect, it } from 'vitest';
import type { CaliperMeasure } from '../../src/ecg/api';
import type { RealReference } from '../../src/real/api';
import { compatibleFindings, mapScpToFindings } from '../../src/real/scp';
import {
  axisClass,
  axisDiff,
  bpmFromMs,
  caliperReading,
  compareAxis,
  compareFindings,
  compareMeasurements,
  compareRhythm,
  computeQtc,
  EMPTY_READING,
  isBlankReading,
  loadReading,
  loadReadSet,
  normalizeAxis,
  parseNum,
  qtcBazett,
  qtcFridericia,
  sanitizeReading,
  saveReading,
  saveReadSet,
  type KeyValueStore,
  type Reading,
} from '../../src/real/reading';

const REF: RealReference = {
  hrBpm: 74,
  atrialRateBpm: 74,
  rrMs: 808,
  prMs: 146,
  pDurMs: 104,
  qrsMs: 84,
  qtMs: 402,
  qtcBazettMs: 446,
  qtcFridericiaMs: 431,
  qtcFraminghamMs: 426,
  pAxisDeg: 31,
  qrsAxisDeg: 39,
  tAxisDeg: 36,
};

const reading = (p: Partial<Reading>): Reading => ({ ...EMPTY_READING, ...p });

function memoryStore(): KeyValueStore & { readonly data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const fail = (): never => {
  throw new Error('storage blocked');
};
const brokenStore: KeyValueStore = { getItem: fail, setItem: fail, removeItem: fail };

describe('numbers and axes', () => {
  it('parses typed numbers leniently', () => {
    expect(parseNum('72')).toBe(72);
    expect(parseNum(' 72,5 ')).toBe(72.5);
    expect(parseNum('−30')).toBe(-30);
    expect(parseNum('+90')).toBe(90);
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('1e3')).toBeNull();
  });

  it('classifies the frontal QRS axis at the boundaries', () => {
    expect(axisClass(-30)).toBe('normal');
    expect(axisClass(90)).toBe('normal');
    expect(axisClass(-31)).toBe('lad');
    expect(axisClass(-90)).toBe('lad');
    expect(axisClass(91)).toBe('rad');
    expect(axisClass(180)).toBe('rad');
    expect(axisClass(-91)).toBe('extreme');
    expect(axisClass(270)).toBe('lad'); // = −90°
    expect(normalizeAxis(-180)).toBe(180);
    expect(axisDiff(170, -170)).toBe(-20);
    expect(axisDiff(-170, 170)).toBe(20);
  });

  it('computes rate and QTc (Bazett and Fridericia)', () => {
    expect(bpmFromMs(800)).toBe(75);
    expect(qtcBazett(400, 60)).toBeCloseTo(400, 6);
    expect(qtcBazett(360, 100)).toBeCloseTo(360 / Math.sqrt(0.6), 6);
    expect(qtcFridericia(400, 60)).toBeCloseTo(400, 6);
    expect(qtcFridericia(360, 100)).toBeCloseTo(360 / Math.cbrt(0.6), 6);
    // Bazett over-corrects at fast rates
    expect(qtcBazett(360, 100)).toBeGreaterThan(qtcFridericia(360, 100));
    expect(computeQtc('bazett', 360, 100)).toBe(qtcBazett(360, 100));
    expect(computeQtc('fridericia', 360, 100)).toBe(qtcFridericia(360, 100));
    // the 12SL values of the first record agree with both formulas (QT 402 ms, rate 74 bpm)
    expect(Math.round(qtcBazett(402, 74))).toBeCloseTo(446, -1);
    expect(Math.round(qtcFridericia(402, 74))).toBeCloseTo(431, -1);
  });
});

describe('comparison with the 12SL reference', () => {
  it('reports differences against the tolerances (rate ±10 %, PR/QRS ±20 ms, QT/QTc ±30 ms, axis ±20°)', () => {
    const rows = compareMeasurements(reading({ rate: '80', pr: '170', qrs: '90', qt: '440', qtc: '470', qtcFormula: 'bazett', axisDeg: '60' }), REF);
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by.hr).toMatchObject({ ref: 74, mine: 80, diff: 6, tol: 7, verdict: 'ok' });
    expect(by.pr).toMatchObject({ diff: 24, verdict: 'off' });
    expect(by.qrs).toMatchObject({ diff: 6, verdict: 'ok' });
    expect(by.qt).toMatchObject({ diff: 38, verdict: 'off' });
    expect(by.qtcB).toMatchObject({ diff: 24, verdict: 'ok' });
    expect(by.axis).toMatchObject({ ref: 39, mine: 60, diff: 21, verdict: 'off' });
    expect(by.qtcF).toMatchObject({ ref: 431, mine: null, verdict: 'na' });
  });

  it("puts the learner's QTc in the row of the formula they chose (Fridericia by default)", () => {
    expect(EMPTY_READING.qtcFormula).toBe('fridericia');
    const byF = Object.fromEntries(compareMeasurements(reading({ qtc: '440' }), REF).map((r) => [r.key, r]));
    expect(byF.qtcF).toMatchObject({ ref: 431, mine: 440, diff: 9, tol: 30, verdict: 'ok' });
    expect(byF.qtcB).toMatchObject({ ref: 446, mine: null, diff: null, verdict: 'na' });
    const byB = Object.fromEntries(compareMeasurements(reading({ qtc: '440', qtcFormula: 'bazett' }), REF).map((r) => [r.key, r]));
    expect(byB.qtcB).toMatchObject({ mine: 440, diff: -6, verdict: 'ok' });
    expect(byB.qtcF).toMatchObject({ mine: null, verdict: 'na' });
  });

  it('accepts values exactly at the tolerance edge and handles missing references', () => {
    const rows = compareMeasurements(reading({ pr: '166', qrs: '64' }), { ...REF, qtMs: null });
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by.pr.verdict).toBe('ok');
    expect(by.qrs.verdict).toBe('ok');
    expect(by.qt).toMatchObject({ ref: null, diff: null, verdict: 'na' });
  });

  it('wraps axis differences around ±180°', () => {
    const rows = compareMeasurements(reading({ axisDeg: '-170' }), { ...REF, qrsAxisDeg: 175 });
    expect(rows.find((r) => r.key === 'axis')).toMatchObject({ diff: 15, verdict: 'ok' });
  });

  it('grades the rhythm, with partial credit inside the sinus and SVT families', () => {
    expect(compareRhythm('', ['sinus-rhythm']).verdict).toBe('unanswered');
    expect(compareRhythm('sinus-rhythm', ['sinus-rhythm', 'lbbb']).verdict).toBe('ok');
    expect(compareRhythm('sinus-rhythm', ['sinus-bradycardia']).verdict).toBe('partial');
    expect(compareRhythm('atrial-fibrillation', ['atrial-flutter']).verdict).toBe('wrong');
    expect(compareRhythm('svt', ['avnrt']).verdict).toBe('partial');
    expect(compareRhythm('sinus-rhythm', ['lbbb']).verdict).toBe('na');
    expect(compareRhythm('other', ['vt-monomorphic']).verdict).toBe('ok');
    expect(compareRhythm('other', ['sinus-rhythm']).verdict).toBe('wrong');
    expect(compareRhythm('paced-rhythm', ['paced-rhythm', 'pvc']).truth).toEqual(['paced-rhythm']);
  });

  it('grades the axis class against the 12SL axis', () => {
    expect(compareAxis('normal', 39).verdict).toBe('ok');
    expect(compareAxis('lad', 39)).toMatchObject({ verdict: 'wrong', truth: ['normal'] });
    expect(compareAxis('lad', null).verdict).toBe('na');
    expect(compareAxis('', -45).verdict).toBe('unanswered');
  });

  it('grades the class of typed degrees when no class was chosen', () => {
    expect(compareAxis('', -45, -50)).toMatchObject({ mine: 'lad', truth: ['lad'], verdict: 'ok' });
    expect(compareAxis('', 39, 120)).toMatchObject({ mine: 'rad', verdict: 'wrong' });
    // an explicit class wins over the typed degrees
    expect(compareAxis('normal', 39, 120)).toMatchObject({ mine: 'normal', verdict: 'ok' });
    expect(compareAxis('', 39, null).verdict).toBe('unanswered');
  });

  it('splits findings into found, missed and extra (the chosen rhythm counts)', () => {
    const r = reading({ rhythm: 'sinus-rhythm', findings: ['lbbb', 'lvh'] });
    expect(compareFindings(r, ['sinus-rhythm', 'lbbb', 'av-block-1'])).toEqual({
      hit: ['sinus-rhythm', 'lbbb'],
      missed: ['av-block-1'],
      extra: ['lvh'],
      compatible: [],
    });
    expect(compareFindings(reading({ rhythm: 'other' }), ['sinus-rhythm']).extra).toEqual([]);
  });

  it('judges axis findings against the 12SL axis (the labels never state the axis)', () => {
    // agrees with the 12SL axis (−50° = left axis deviation): found, not "extra"
    expect(compareFindings(reading({ findings: ['lafb', 'lad'] }), ['lafb'], -50)).toEqual({ hit: ['lafb', 'lad'], missed: [], extra: [], compatible: [] });
    // disagrees: listed as not in the labels
    expect(compareFindings(reading({ findings: ['rad'] }), ['lafb'], -50)).toEqual({ hit: [], missed: ['lafb'], extra: ['rad'], compatible: [] });
    expect(compareFindings(reading({ findings: ['axis-normal'] }), ['sinus-rhythm'], 39).hit).toEqual(['axis-normal']);
    // no reference axis: nothing to agree with
    expect(compareFindings(reading({ findings: ['lad'] }), [], null).extra).toEqual(['lad']);
    // an unstated axis is never "missed"
    expect(compareFindings(reading({}), ['sinus-rhythm'], -50).missed).toEqual(['sinus-rhythm']);
  });

  it('shows calls the labels allow without stating them as compatible, not as "not in the labels"', () => {
    // unstaged inferior MI: the labels assert Q waves only; an acute or an old call is consistent with them
    const truth = mapScpToFindings({ IMI: 100, SR: 0 }, 'unknown');
    const allowed = compatibleFindings({ IMI: 100, SR: 0 }, 'unknown');
    const fx = compareFindings(reading({ rhythm: 'sinus-rhythm', findings: ['stemi-inferior', 'lbbb'] }), truth, null, allowed);
    expect(fx.compatible).toEqual(['stemi-inferior']);
    expect(fx.extra).toEqual(['lbbb']);
    expect(fx.missed).toEqual(['pathological-q']);
    // with no allowed list nothing is compatible (the default)
    expect(compareFindings(reading({ findings: ['stemi-inferior'] }), truth).extra).toEqual(['stemi-inferior']);
  });

  it('counts a finding implied by a reported one as found (LVH with strain is LVH; old MI means Q waves)', () => {
    const lvh = compareFindings(reading({ findings: ['lvh-strain'] }), ['sinus-rhythm', 'lvh'], null, compatibleFindings({ LVH: 100, NDT: 100, SR: 0 }, null));
    expect(lvh).toEqual({ hit: ['lvh'], missed: ['sinus-rhythm'], extra: [], compatible: ['lvh-strain'] });
    const oldMi = compareFindings(reading({ findings: ['old-mi-inferior'] }), ['pathological-q', 'old-mi-inferior']);
    expect(oldMi).toEqual({ hit: ['pathological-q', 'old-mi-inferior'], missed: [], extra: [], compatible: [] });
    // the implication runs one way: Q waves alone are not an old MI
    expect(compareFindings(reading({ findings: ['pathological-q'] }), ['pathological-q', 'old-mi-inferior']).missed).toEqual(['old-mi-inferior']);
  });
});

describe('caliper read-out', () => {
  const m = (p: Partial<CaliperMeasure>): CaliperMeasure => ({ lead: 'II', t0: 100, t1: 900, dtMs: 800, ...p });

  it('reads a time measurement with its rate', () => {
    expect(caliperReading(m({}))).toEqual({ kind: 'time', ms: 800, bpm: 75 });
  });

  it('reads an amplitude measurement as |Δ mV| and never as a time interval', () => {
    const r = caliperReading(m({ mv0: 1.5, mv1: -0.25 }));
    expect(r?.kind).toBe('amplitude');
    expect(r?.kind === 'amplitude' ? r.mv : NaN).toBeCloseTo(1.75, 10);
  });

  it('ignores missing or empty measurements', () => {
    expect(caliperReading(null)).toBeNull();
    expect(caliperReading(m({ t1: 100, dtMs: 0 }))).toBeNull();
    expect(caliperReading(m({ dtMs: Number.NaN }))).toBeNull();
  });
});

describe('persistence', () => {
  it('saves, loads and removes a reading per case', () => {
    const s = memoryStore();
    const r = reading({ rate: '72', rhythm: 'sinus-rhythm', notes: 'LBBB?', findings: ['lbbb'] });
    expect(saveReading(7, r, s)).toBe(true);
    expect(loadReading(7, s)).toEqual(r);
    expect(loadReading(8, s)).toEqual(EMPTY_READING);
    expect(saveReading(7, EMPTY_READING, s)).toBe(true);
    expect(s.data.size).toBe(0);
    // a blank but revealed reading is kept (the case stays "revealed")
    saveReading(7, reading({ revealed: true }), s);
    expect(loadReading(7, s).revealed).toBe(true);
  });

  it('survives blocked or missing storage', () => {
    expect(saveReading(1, reading({ rate: '1' }), brokenStore)).toBe(false);
    expect(loadReading(1, brokenStore)).toEqual(EMPTY_READING);
    expect(saveReading(1, reading({ rate: '1' }), null)).toBe(false);
    expect(loadReading(1, null)).toEqual(EMPTY_READING);
    expect(loadReadSet(brokenStore).size).toBe(0);
    expect(saveReadSet(new Set([1]), brokenStore)).toBe(false);
  });

  it('sanitizes corrupt stored data', () => {
    expect(sanitizeReading(null)).toEqual(EMPTY_READING);
    expect(sanitizeReading('x')).toEqual(EMPTY_READING);
    const r = sanitizeReading({ rate: 72, rhythm: 'not-a-rhythm', axis: 'weird', findings: ['lbbb', 'nope', 'lbbb', 3], notes: 'ok', revealed: 'yes' });
    expect(r.rate).toBe('');
    expect(r.rhythm).toBe('');
    expect(r.axis).toBe('');
    expect(r.findings).toEqual(['lbbb']);
    expect(r.notes).toBe('ok');
    expect(r.revealed).toBe(false);
    expect(r.qtcFormula).toBe('fridericia');
    expect(sanitizeReading({ qtcFormula: 'bazett' }).qtcFormula).toBe('bazett');
    expect(sanitizeReading({ qtcFormula: 'hodges' }).qtcFormula).toBe('fridericia');
    const s = memoryStore();
    s.setItem('ecg-academy:real:reading:v1:5', '{not json');
    expect(loadReading(5, s)).toEqual(EMPTY_READING);
  });

  it('round-trips the set of read cases', () => {
    const s = memoryStore();
    saveReadSet(new Set([30, 2, 11]), s);
    expect([...loadReadSet(s)]).toEqual([2, 11, 30]);
    s.setItem('ecg-academy:real:read:v1', '[1, "x", 2.5, 4]');
    expect([...loadReadSet(s)]).toEqual([1, 4]);
  });

  it('knows a blank reading', () => {
    expect(isBlankReading(EMPTY_READING)).toBe(true);
    expect(isBlankReading(reading({ notes: '   ' }))).toBe(true);
    expect(isBlankReading(reading({ qt: '400' }))).toBe(false);
  });
});
