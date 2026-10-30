import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/core/l10n';
import { caliperAnnouncement, keyHelp } from '../../src/ecg/help';
import { caliperNumbers, resolveTools } from '../../src/ecg/interact';
import { computeSheet } from '../../src/ecg/layout';
import { fixtureEcg, opts } from './fixtures';

const ALL = resolveTools(undefined);
const NONE = resolveTools(false);

describe('keyboard help for screen readers', () => {
  it('a static picture with a cursor describes only cursor movement', () => {
    const t = keyHelp('en', NONE, 'cursor');
    expect(t).toContain('time cursor');
    expect(t).not.toMatch(/\bcalipers\b|magnifier|crosshair|Enter/);
  });

  it('locate mode with every tool lists Enter, the tool keys and the caliper keys', () => {
    const t = keyHelp('en', ALL, 'pick');
    expect(t).toContain('Enter selects');
    expect(t).toContain('C calipers, A amplitude, R march out, M magnifier, X crosshair');
    expect(t).toContain('With the calipers on');
  });

  it('lists only the tools this instance offers', () => {
    const t = keyHelp('en', resolveTools({ calipers: false, crosshair: false }), 'none');
    expect(t).toContain('Tool keys: M magnifier;');
    expect(t).not.toContain('C calipers');
    expect(t).not.toContain('With the calipers on');
    expect(keyHelp('zh', resolveTools({ calipers: false }), 'none')).toContain('M 放大镜、X 十字线');
  });

  it('every language is complete (no placeholders left)', () => {
    for (const lang of LANGS)
      for (const mode of ['pick', 'cursor', 'none'] as const) {
        const t = keyHelp(lang, ALL, mode);
        expect(t.length).toBeGreaterThan(80);
        expect(t).not.toMatch(/[{}]/);
      }
    expect(keyHelp('es', ALL, 'pick')).toContain('Intro elige');
    expect(keyHelp('es', ALL, 'none')).toContain('C compás, A amplitud');
  });
});

describe('caliper announcements', () => {
  const sheet = computeSheet(fixtureEcg().signal, opts());
  const p = sheet.panels[12];
  const cal = (dt: number) => ({ panel: p.index, t0: p.t0 + 1000, t1: p.t0 + 1000 + dt, mv0: 0, mv1: 1.5 });

  it('an interval reads ms, small squares and the rate; a sub-cycle interval has no rate', () => {
    expect(caliperAnnouncement('en', caliperNumbers('en', sheet, cal(800), 'time'))).toBe('Calipers: 800 ms, 20.0 small squares, 75 bpm');
    expect(caliperAnnouncement('es', caliperNumbers('es', sheet, cal(40), 'time'))).toBe('Compás: 40 ms, 1,0 cuadrados pequeños');
    expect(caliperAnnouncement('zh', caliperNumbers('zh', sheet, cal(40), 'time'))).not.toMatch(/—|次\/分/);
  });

  it('amplitude mode reads mV and mm', () => {
    expect(caliperAnnouncement('en', caliperNumbers('en', sheet, cal(800), 'amplitude'))).toBe('Amplitude: 1.50 mV, 15.0 mm');
  });
});
