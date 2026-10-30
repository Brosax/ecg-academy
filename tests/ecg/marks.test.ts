import { describe, expect, it } from 'vitest';
import type { EcgMark, EcgPin } from '../../src/ecg/api';
import { computeSheet } from '../../src/ecg/layout';
import { highlightedPanels, markInPanel, marksByPanel, markToken, pinsByPanel, MARK_TOKEN, PIN_TOKEN } from '../../src/ecg/marks';
import { fixtureEcg, opts } from './fixtures';

const ecg = fixtureEcg();
const sheet = computeSheet(ecg.signal, opts());

describe('marks on panels', () => {
  it('a lead-II mark appears in the II cell and the II rhythm strip', () => {
    const m: EcgMark = { kind: 'wave', lead: 'II', t: 1000, label: 'P' };
    const per = marksByPanel(sheet, [m]);
    const where = sheet.panels.filter((p) => per[p.index].length > 0).map((p) => `${p.lead}:${p.kind}`);
    expect(where).toEqual(['II:cell', 'II:rhythm']);
  });

  it("lead 'all' reaches every panel showing that time", () => {
    const m: EcgMark = { kind: 'region', lead: 'all', t0: 2400, t1: 2600, color: 'qrs' };
    const per = marksByPanel(sheet, [m]);
    // columns 1 and 2 (0–2.5 s and 2.5–5 s) of the three grid rows, plus the rhythm strip
    expect(sheet.panels.filter((p) => per[p.index].length).length).toBe(7);
  });

  it('time-bounded marks outside a panel are skipped; open hlines span the panel', () => {
    const v1 = sheet.panels.find((p) => p.lead === 'V1');
    expect(v1).toBeDefined();
    if (!v1) return;
    expect(markInPanel({ kind: 'bracket', lead: 'V1', t0: 100, t1: 900 }, v1)).toBe(false);
    expect(markInPanel({ kind: 'bracket', lead: 'V1', t0: 5100, t1: 5300 }, v1)).toBe(true);
    expect(markInPanel({ kind: 'bracket', lead: 'V1', t0: 7600, t1: 4900 }, v1)).toBe(true);
    expect(markInPanel({ kind: 'hline', lead: 'V1', mv: 0.1 }, v1)).toBe(true);
    expect(markInPanel({ kind: 'hline', lead: 'V1', mv: 0.1, t0: 0, t1: 1000 }, v1)).toBe(false);
    expect(markInPanel({ kind: 'arrow', lead: 'V1', t: 6000, mv: 1 }, v1)).toBe(true);
    expect(markInPanel({ kind: 'lead', lead: 'V1' }, v1)).toBe(true);
    expect(markInPanel({ kind: 'lead', lead: 'V2' }, v1)).toBe(false);
  });

  it('colour roles map to theme tokens', () => {
    expect(MARK_TOKEN).toEqual({
      atrial: 'c-atrial',
      qrs: 'c-qrs',
      repol: 'c-repol',
      injury: 'c-injury',
      vector: 'c-vector',
      highlight: 'c-highlight',
      ok: 'ok',
      err: 'err',
    });
    expect(markToken(undefined)).toBe('c-highlight');
    expect(PIN_TOKEN).toEqual({ answer: 'c-vector', correct: 'ok', wrong: 'err' });
  });
});

describe('highlights and pins', () => {
  it('highlightLeads and lead marks', () => {
    const hl = highlightedPanels(sheet, ['V1'], [{ kind: 'lead', lead: 'II', color: 'injury', label: { zh: '下壁', en: 'Inferior', es: 'Inferior' } }]);
    const desc = hl.map((h) => `${sheet.panels[h.panel].lead}:${sheet.panels[h.panel].kind}:${h.color}`);
    // sheet order: row 0 (I aVR V1 V4), row 1 (II …), …, rhythm strip
    expect(desc).toEqual(['V1:cell:c-highlight', 'II:cell:c-injury', 'II:rhythm:c-injury']);
  });

  it('pins land in every panel showing their lead at their time', () => {
    const pins: EcgPin[] = [
      { lead: 'II', tMs: 1000, tone: 'answer' },
      { lead: 'V5', tMs: 1000, tone: 'wrong' },
      { lead: 'V5', tMs: 8000, tone: 'correct' },
    ];
    const got = pinsByPanel(sheet, pins).map((x) => `${x.panel.lead}:${x.panel.kind}:${x.pin.tone}`);
    expect(got).toEqual(['II:cell:answer', 'II:rhythm:answer', 'V5:cell:correct']);
  });
});
