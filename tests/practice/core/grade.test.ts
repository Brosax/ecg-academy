import { describe, expect, it } from 'vitest';
import type { Item, ReportAnswer, ReportKey } from '../../../src/practice/api';
import { f1, finalizeGrade, gradeItem, gradeReport, HINT_FACTOR, OCCLUSION_SCORE, qtcOf, reportFields } from '../../../src/practice/core/grade';
import { axisCategory } from '../../../src/practice/core/truth';

const L0 = { zh: '题', en: 'q', es: 'p' };
const base = { id: 'x:classic:1', family: 'x', competency: 'C2' as const, difficulty: 'classic' as const, seed: 1, prompt: L0, ecg: { kind: 'real' as const, id: 1 }, explanation: L0, findings: [] };

const rate = (truthBpm: number, minTolBpm = 5, which: 'ventricular' | 'atrial' = 'ventricular'): Item => ({ ...base, kind: 'rate', key: { truthBpm, which, tolerancePct: 10, minTolBpm } });
const num = (value: number) => ({ kind: 'number' as const, value });

describe('rate grader', () => {
  it('±10 % at 60/min is ±6: edge in, just past is partial, past twice is wrong', () => {
    expect(gradeItem(rate(60), num(66)).verdict).toBe('correct');
    expect(gradeItem(rate(60), num(54)).verdict).toBe('correct');
    expect(gradeItem(rate(60), num(66.1)).verdict).toBe('partial');
    expect(gradeItem(rate(60), num(72)).score).toBe(0.5);
    expect(gradeItem(rate(60), num(72.1)).score).toBe(0);
  });
  it('the minimum of ±5 bpm applies at slow rates', () => {
    expect(gradeItem(rate(40), num(45)).score).toBe(1);
    expect(gradeItem(rate(40), num(45.2)).score).toBe(0.5);
  });
  it('irregular items widen the minimum to ±10 bpm', () => {
    expect(gradeItem(rate(80, 10), num(90)).score).toBe(1);
    expect(gradeItem(rate(80, 10), num(90.5)).score).toBe(0.5);
  });
  it('explains the specific error', () => {
    expect(gradeItem(rate(75), num(150)).feedback.en).toMatch(/twice/);
    expect(gradeItem(rate(75), num(375)).feedback.en).toMatch(/five times/);
    expect(gradeItem(rate(300, 5, 'atrial'), num(150)).feedback.en).toMatch(/ventricular rate/);
    expect(gradeItem(rate(80, 10), num(140)).feedback.en).toMatch(/irregular/);
  });
  it('rejects a missing answer', () => {
    expect(gradeItem(rate(60), num(Number.NaN)).score).toBe(0);
    expect(gradeItem(rate(60), { kind: 'choice', id: 'x' }).verdict).toBe('incorrect');
  });
});

describe('measure grader', () => {
  const qt: Item = {
    ...base,
    kind: 'measure',
    key: Object.assign({ what: 'qt' as const, truthMs: 400, toleranceMs: 30 }, {
      decoys: [{ ms: 300, feedback: { zh: '顶点', en: 'You measured to the T peak', es: 'pico' } }],
    }),
  };
  const pr: Item = { ...base, kind: 'measure', key: { what: 'pr', truthMs: 160, toleranceMs: 20 } };
  it('±20 ms edges for PR', () => {
    expect(gradeItem(pr, num(180)).score).toBe(1);
    expect(gradeItem(pr, num(140)).score).toBe(1);
    expect(gradeItem(pr, num(181)).score).toBe(0.5);
    expect(gradeItem(pr, num(200)).score).toBe(0.5);
    expect(gradeItem(pr, num(201)).score).toBe(0);
  });
  it('±30 ms edges for QT', () => {
    expect(gradeItem(qt, num(430)).score).toBe(1);
    expect(gradeItem(qt, num(431)).score).toBe(0.5);
  });
  it('names the landmark used: T peak decoy, else the direction', () => {
    expect(gradeItem(qt, num(305)).feedback.en).toMatch(/T peak/);
    expect(gradeItem(qt, num(480)).feedback.en).toMatch(/U wave/);
    expect(gradeItem(pr, num(100)).feedback.en).toMatch(/START of the P wave/);
  });
});

describe('QTc grader', () => {
  const qtc = (formula: 'bazett' | 'fridericia' | 'framingham' | 'hodges'): Item => ({
    ...base,
    kind: 'qtc',
    key: { formula, qtMs: 360, rrMs: 640, truthMs: Math.round(qtcOf(formula, 360, 640)), toleranceMs: 30, given: true },
  });
  it('implements the four formulas', () => {
    expect(qtcOf('bazett', 400, 640)).toBeCloseTo(500, 6);
    expect(qtcOf('fridericia', 400, 1000)).toBeCloseTo(400, 6);
    expect(qtcOf('framingham', 400, 800)).toBeCloseTo(400 + 154 * 0.2, 6);
    expect(qtcOf('hodges', 400, 750)).toBeCloseTo(400 + 1.75 * 20, 6);
  });
  it('±30 ms edges', () => {
    const it0 = qtc('fridericia');
    const t = it0.kind === 'qtc' ? it0.key.truthMs : 0;
    expect(gradeItem(it0, num(t + 30)).score).toBe(1);
    expect(gradeItem(it0, num(t + 31)).score).toBe(0.5);
    expect(gradeItem(it0, num(t + 61)).score).toBe(0);
  });
  it('detects the wrong formula and the uncorrected QT', () => {
    const it0 = qtc('fridericia');
    expect(gradeItem(it0, num(qtcOf('bazett', 360, 640))).feedback.en).toMatch(/Bazett/);
    const slow: Item = { ...base, kind: 'qtc', key: { formula: 'bazett', qtMs: 480, rrMs: 1500, truthMs: Math.round(qtcOf('bazett', 480, 1500)), toleranceMs: 30, given: true } };
    expect(gradeItem(slow, num(480)).feedback.en).toMatch(/uncorrected/);
  });
});

describe('axis grader', () => {
  const deg = (truthDeg: number): Item => ({ ...base, kind: 'axis', key: { mode: 'degrees', truthDeg, fullDeg: 20, partialDeg: 30 } });
  const quad = (truthDeg: number): Item => ({ ...base, kind: 'axis', key: { mode: 'quadrant', truthDeg, fullDeg: 20, partialDeg: 30 } });
  it('full credit within ±20°, half within ±30°', () => {
    expect(gradeItem(deg(60), num(80)).score).toBe(1);
    expect(gradeItem(deg(60), num(80.5)).score).toBe(0.5);
    expect(gradeItem(deg(60), num(90)).score).toBe(0.5);
    expect(gradeItem(deg(60), num(90.5)).score).toBe(0);
  });
  it('wraps around ±180°', () => {
    expect(gradeItem(deg(170), num(-170)).score).toBe(1);
    expect(gradeItem(deg(-175), num(160)).score).toBe(0.5);
  });
  it('explains a reversed or perpendicular axis', () => {
    expect(gradeItem(deg(60), num(-120)).feedback.en).toMatch(/reversed/);
    expect(gradeItem(deg(60), num(-30)).feedback.en).toMatch(/90°/);
  });
  it('categories at the boundaries', () => {
    expect(axisCategory(-30)).toBe('axis-normal');
    expect(axisCategory(-30.5)).toBe('lad');
    expect(axisCategory(90)).toBe('axis-normal');
    expect(axisCategory(90.5)).toBe('rad');
    expect(axisCategory(-90)).toBe('lad');
    expect(axisCategory(-90.5)).toBe('extreme-axis');
    expect(axisCategory(180)).toBe('rad');
    expect(axisCategory(-179)).toBe('extreme-axis');
    expect(axisCategory(270)).toBe('lad');
  });
  it('quadrant mode grades the category (choice or a number)', () => {
    expect(gradeItem(quad(-60), { kind: 'choice', id: 'lad' }).score).toBe(1);
    expect(gradeItem(quad(-60), { kind: 'choice', id: 'axis-normal' }).score).toBe(0);
    expect(gradeItem(quad(-60), num(-50)).score).toBe(1);
  });
});

describe('choice grader', () => {
  const ch: Item = {
    ...base,
    kind: 'choice',
    key: { options: [{ id: 'av-block-2-mobitz2', label: L0 }, { id: 'av-block-2-mobitz1', label: L0 }], correct: 'av-block-2-mobitz2' },
  };
  it('scores and explains with both hallmarks', () => {
    expect(gradeItem(ch, { kind: 'choice', id: 'av-block-2-mobitz2' }).verdict).toBe('correct');
    const g = gradeItem(ch, { kind: 'choice', id: 'av-block-2-mobitz1' });
    expect(g.score).toBe(0);
    expect(g.feedback.en).toMatch(/lengthens beat by beat/);
    expect(g.feedback.en).toMatch(/the answer is/);
  });
  it('flags a missed critical finding', () => {
    expect(gradeItem(ch, { kind: 'choice', id: 'av-block-2-mobitz1' }).missedCritical).toBe(true);
    const tri: Item = { ...base, kind: 'choice', key: { options: [{ id: 'critical', label: L0 }, { id: 'routine', label: L0 }], correct: 'critical' } };
    expect(gradeItem(tri, { kind: 'choice', id: 'routine' }).missedCritical).toBe(true);
  });
});

describe('findings grader', () => {
  const fi: Item = { ...base, kind: 'findings', key: { options: ['lvh', 'lae', 'rvh', 'hyperkalemia', 'rbbb'], correct: ['lvh', 'hyperkalemia'] } };
  it('F1 of the selection', () => {
    expect(f1(['a', 'b'], ['a', 'b']).score).toBe(1);
    expect(f1([], []).score).toBe(1);
    expect(f1(['a'], ['a', 'b']).score).toBeCloseTo(2 / 3, 9);
    expect(f1(['a', 'c'], ['a', 'b']).score).toBeCloseTo(0.5, 9);
  });
  it('exact set is correct; misses and extras are named; a missed critical is flagged', () => {
    expect(gradeItem(fi, { kind: 'multi', ids: ['hyperkalemia', 'lvh'] }).verdict).toBe('correct');
    const g = gradeItem(fi, { kind: 'multi', ids: ['lvh', 'rvh'] });
    expect(g.verdict).toBe('partial');
    expect(g.feedback.en).toMatch(/Missed: Hyperkalaemia/);
    expect(g.feedback.en).toMatch(/Not on this tracing: Right ventricular hypertrophy/);
    expect(g.missedCritical).toBe(true);
  });
  it('ignores ids that were not offered', () => {
    expect(gradeItem(fi, { kind: 'multi', ids: ['lvh', 'hyperkalemia', 'wpw'] }).verdict).toBe('correct');
  });
});

describe('locate grader', () => {
  const one: Item = { ...base, kind: 'locate', key: { targets: [{ lead: 'any', t0: 100, t1: 200 }, { lead: 'V2', t0: 900, t1: 1000 }], need: 'one' } };
  const all: Item = { ...base, kind: 'locate', key: { targets: [{ lead: 'II', t0: 100, t1: 200 }, { lead: 'II', t0: 900, t1: 1000 }], need: 'all' } };
  it('one target: edges inclusive, lead must match unless any', () => {
    expect(gradeItem(one, { kind: 'picks', picks: [{ lead: 'I', tMs: 100 }] }).score).toBe(1);
    expect(gradeItem(one, { kind: 'picks', picks: [{ lead: 'I', tMs: 200 }] }).score).toBe(1);
    expect(gradeItem(one, { kind: 'picks', picks: [{ lead: 'I', tMs: 201 }] }).score).toBe(0);
    expect(gradeItem(one, { kind: 'picks', picks: [{ lead: 'V1', tMs: 950 }] }).score).toBe(0);
    expect(gradeItem(one, { kind: 'picks', picks: [{ lead: 'V2', tMs: 950 }] }).score).toBe(1);
    // the last pick is the answer
    expect(gradeItem(one, { kind: 'picks', picks: [{ lead: 'I', tMs: 150 }, { lead: 'I', tMs: 600 }] }).score).toBe(0);
  });
  it('all targets: extras cost half a target', () => {
    expect(gradeItem(all, { kind: 'picks', picks: [{ lead: 'II', tMs: 150 }, { lead: 'II', tMs: 950 }] }).verdict).toBe('correct');
    expect(gradeItem(all, { kind: 'picks', picks: [{ lead: 'II', tMs: 150 }] }).score).toBe(0.5);
    expect(gradeItem(all, { kind: 'picks', picks: [{ lead: 'II', tMs: 150 }, { lead: 'II', tMs: 950 }, { lead: 'II', tMs: 500 }] }).score).toBeCloseTo(0.75, 9);
    expect(gradeItem(all, { kind: 'picks', picks: [] }).score).toBe(0);
  });
});

describe('occlusion grader', () => {
  const occ = (call: 'occlusion' | 'indeterminate' | 'not-occlusion', extra: object = {}): Item => ({
    ...base,
    kind: 'occlusion',
    key: { call, mimicOptions: ['pericarditis', 'early-repolarization', 'lbbb'], territoryOptions: [{ id: 'anterior', label: L0 }, { id: 'inferior', label: L0 }], ...extra },
  });
  const ans = (call: 'occlusion' | 'indeterminate' | 'not-occlusion', extra: object = {}) => ({ kind: 'occlusion' as const, call, ...extra });
  it('a missed occlusion scores 0 and is flagged; misses weigh more than false activations', () => {
    const miss = gradeItem(occ('occlusion', { territory: 'anterior' }), ans('not-occlusion', { mimic: 'pericarditis' }));
    expect(miss.score).toBe(0);
    expect(miss.missedCritical).toBe(true);
    const fa = gradeItem(occ('not-occlusion', { mimic: 'pericarditis' }), ans('occlusion', { territory: 'anterior' }));
    expect(fa.score).toBe(0.25);
    expect(fa.missedCritical).toBeUndefined();
    expect(miss.score).toBeLessThan(fa.score);
  });
  it('deferring an obvious occlusion is partial but still a missed critical', () => {
    const g = gradeItem(occ('occlusion', { territory: 'anterior' }), ans('indeterminate'));
    expect(g.score).toBe(OCCLUSION_SCORE.occlusion.indeterminate);
    expect(g.missedCritical).toBe(true);
  });
  it('"indeterminate" can be the right answer', () => {
    expect(gradeItem(occ('indeterminate'), ans('indeterminate')).score).toBe(1);
    expect(gradeItem(occ('indeterminate'), ans('occlusion')).score).toBe(0.5);
    expect(gradeItem(occ('indeterminate'), ans('not-occlusion')).score).toBe(0.25);
  });
  it('wrong territory or wrong mimic costs 0.25', () => {
    expect(gradeItem(occ('occlusion', { territory: 'anterior' }), ans('occlusion', { territory: 'inferior' })).score).toBe(0.75);
    expect(gradeItem(occ('occlusion', { territory: 'anterior' }), ans('occlusion', { territory: 'anterior' })).score).toBe(1);
    const wm = gradeItem(occ('not-occlusion', { mimic: 'pericarditis' }), ans('not-occlusion', { mimic: 'lbbb' }));
    expect(wm.score).toBe(0.75);
    expect(wm.feedback.en).toMatch(/Acute pericarditis/);
  });
  it('ordering: miss < false activation < wrong mimic < right call', () => {
    const s = [
      gradeItem(occ('occlusion', { territory: 'anterior' }), ans('not-occlusion')).score,
      gradeItem(occ('not-occlusion', { mimic: 'pericarditis' }), ans('occlusion')).score,
      gradeItem(occ('not-occlusion', { mimic: 'pericarditis' }), ans('not-occlusion', { mimic: 'lbbb' })).score,
      gradeItem(occ('not-occlusion', { mimic: 'pericarditis' }), ans('not-occlusion', { mimic: 'pericarditis' })).score,
    ];
    expect([...s].sort((a, b) => a - b)).toEqual(s);
    expect(new Set(s).size).toBe(4);
  });
});

describe('report grader', () => {
  const key: ReportKey = {
    rateBpm: 80,
    rhythm: 'sinus-rhythm',
    regular: true,
    prMs: 160,
    qrsMs: 140,
    qtcMs: 440,
    axisDeg: -60,
    findings: ['lbbb', 'av-block-2-mobitz2'],
    optional: ['secondary-st-t', 'lad'],
  };
  const perfect: ReportAnswer = { rateBpm: 80, rhythm: 'sinus-rhythm', regular: true, prMs: 160, qrsMs: 140, qtcMs: 440, axisDeg: -60, findings: ['lbbb', 'av-block-2-mobitz2'] };
  it('a perfect report scores 1 with every field ok', () => {
    const g = gradeReport(key, perfect);
    expect(g.score).toBe(1);
    expect(g.verdict).toBe('correct');
    expect(g.fields?.every((f) => f.ok)).toBe(true);
    expect(g.fields?.map((f) => f.field)).toEqual(['rate', 'rhythm', 'regular', 'pr', 'qrs', 'qtc', 'axis', 'findings']);
  });
  it('fields use the item tolerances', () => {
    const r = reportFields(key, { ...perfect, rateBpm: 88, prMs: 181, qtcMs: 470, axisDeg: -85 });
    const by = Object.fromEntries(r.map((f) => [f.field, f.credit]));
    expect(by.rate).toBe(1);
    expect(by.pr).toBe(0.5);
    expect(by.qtc).toBe(1);
    expect(by.axis).toBe(0.5);
  });
  it('optional findings are free; extra findings and misses cost; a missed critical is flagged', () => {
    expect(gradeReport(key, { ...perfect, findings: [...perfect.findings, 'secondary-st-t', 'lad'] }).score).toBe(1);
    expect(gradeReport(key, { ...perfect, findings: [...perfect.findings, 'lvh'] }).score).toBeLessThan(1);
    const g = gradeReport(key, { ...perfect, findings: ['lbbb'] });
    expect(g.missedCritical).toBe(true);
    expect(g.feedback.en).toMatch(/Mobitz II/);
  });
  it('null key fields are not graded; a sinus rhythm of the wrong rate class gets half', () => {
    const k2: ReportKey = { ...key, prMs: null, regular: null };
    expect(reportFields(k2, perfect).map((f) => f.field)).not.toContain('pr');
    expect(reportFields(k2, perfect).map((f) => f.field)).not.toContain('regular');
    const r = reportFields({ ...key, rhythm: 'sinus-bradycardia' }, perfect);
    expect(r.find((f) => f.field === 'rhythm')?.credit).toBe(0.5);
  });
  it('the report passes at 80 % (C11)', () => {
    const g = gradeReport(key, { ...perfect, rhythm: 'atrial-fibrillation' });
    expect(g.score).toBeCloseTo(1 - 2 / 10.5, 9);
    expect(g.verdict).toBe('correct');
    const h = gradeReport(key, { ...perfect, rhythm: null, findings: [] });
    expect(h.verdict).not.toBe('correct');
  });
  it('grades a report item through gradeItem', () => {
    const it0: Item = { ...base, kind: 'report', key };
    expect(gradeItem(it0, { kind: 'report', report: perfect }).score).toBe(1);
  });
});

describe('compare grader and finalizeGrade', () => {
  const cmp: Item = { ...base, findings: ['stemi-anterior'], kind: 'compare', ecg2: { kind: 'real', id: 2 }, key: { correct: 'left' } };
  it('compare', () => {
    expect(gradeItem(cmp, { kind: 'choice', id: 'left' }).score).toBe(1);
    const g = gradeItem(cmp, { kind: 'choice', id: 'right' });
    expect(g.score).toBe(0);
    expect(g.missedCritical).toBe(true);
  });
  it('the hint costs partial credit; confidence is stamped', () => {
    const g = finalizeGrade(gradeItem(cmp, { kind: 'choice', id: 'left' }), { usedHint: true, confidence: 3 });
    expect(g.score).toBe(HINT_FACTOR);
    expect(g.usedHint).toBe(true);
    expect(g.confidence).toBe(3);
    expect(finalizeGrade(g, {}).score).toBe(HINT_FACTOR);
  });
});
