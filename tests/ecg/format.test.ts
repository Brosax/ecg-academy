import { describe, expect, it } from 'vitest';
import { fmtNum, fmtOpt } from '../../src/ecg/format';

describe('read-out numbers', () => {
  it('uses the decimal comma in Spanish and a typographic minus', () => {
    expect(fmtNum('es', 1.5, 1)).toBe('1,5');
    expect(fmtNum('en', 1.5, 1)).toBe('1.5');
    expect(fmtNum('zh', 1.5, 1)).toBe('1.5');
    expect(fmtNum('en', -0.25, 2)).toBe('−0.25');
    expect(fmtNum('en', 0.3, 1, true)).toBe('+0.3');
    expect(fmtNum('es', -0.3, 1, true)).toBe('−0,3');
  });

  it('never shows −0 and has no grouping', () => {
    expect(fmtNum('en', -0.001, 2)).toBe('0.00');
    expect(fmtNum('en', -0.001, 2, true)).toBe('0.00');
    expect(fmtNum('en', 12345, 0)).toBe('12345');
    expect(fmtNum('en', Number.NaN)).toBe('—');
    expect(fmtOpt('en', null)).toBe('—');
    expect(fmtOpt('en', 80)).toBe('80');
  });
});
