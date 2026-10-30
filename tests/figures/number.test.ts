import { describe, expect, it } from 'vitest';
import { finalNumber, formatFixed, formatSigned, liveNumber, parseTyped } from '../../src/figures/math/number';

describe('typed numeric input', () => {
  it('parses dots and Spanish decimal commas; empty or junk is not a number', () => {
    expect(parseTyped('450')).toBe(450);
    expect(parseTyped(' 450,5 ')).toBe(450.5);
    expect(parseTyped('0.75')).toBe(0.75);
    expect(parseTyped('')).toBeNull();
    expect(parseTyped('   ')).toBeNull();
    expect(parseTyped('abc')).toBeNull();
  });

  it('while typing, commits only in-range values (typing "450" with min 200 passes through "4" and "45")', () => {
    expect(liveNumber('4', 200, 700)).toBeNull();
    expect(liveNumber('45', 200, 700)).toBeNull();
    expect(liveNumber('450', 200, 700)).toBe(450);
    expect(liveNumber('7000', 200, 700)).toBeNull();
    expect(liveNumber('', 200, 700)).toBeNull();
    expect(liveNumber('200', 200, 700)).toBe(200);
    expect(liveNumber('700', 200, 700)).toBe(700);
  });

  it('on leaving the field, clamps to the range or keeps the previous value', () => {
    expect(finalNumber('4', 200, 700, 380)).toBe(200);
    expect(finalNumber('7000', 200, 700, 380)).toBe(700);
    expect(finalNumber('', 200, 700, 380)).toBe(380);
    expect(finalNumber('x', 200, 700, 380)).toBe(380);
    expect(finalNumber('455', 200, 700, 380)).toBe(455);
  });
});

describe('number display', () => {
  it('uses the decimal comma in Spanish and a true minus sign', () => {
    expect(formatFixed(0.04, 2, 'en')).toBe('0.04');
    expect(formatFixed(0.04, 2, 'zh')).toBe('0.04');
    expect(formatFixed(0.04, 2, 'es')).toBe('0,04');
    expect(formatFixed(-30, 0, 'en')).toBe('−30');
    expect(formatFixed(-2.5, 1, 'es')).toBe('−2,5');
  });

  it('never shows a signed zero', () => {
    expect(formatFixed(-0.004, 2, 'en')).toBe('0.00');
    expect(formatSigned(0.004, 2, 'en')).toBe('0.00');
    expect(formatSigned(-0, 0, 'en')).toBe('0');
  });

  it('adds an explicit plus to positive values (axis angles)', () => {
    expect(formatSigned(60, 0, 'en')).toBe('+60');
    expect(formatSigned(-30, 0, 'en')).toBe('−30');
    expect(formatSigned(0.75, 2, 'es')).toBe('+0,75');
  });
});
