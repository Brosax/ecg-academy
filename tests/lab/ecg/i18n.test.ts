import { describe, expect, it } from 'vitest';
import { fmtNum } from '../../../src/lab/ecg/format';
import { en } from '../../../src/lab/i18n/ecg/en';
import { es } from '../../../src/lab/i18n/ecg/es';
import { te } from '../../../src/lab/i18n/ecg';
import { zh } from '../../../src/lab/i18n/ecg/zh';

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('ecg i18n', () => {
  it('every key is filled in zh, en and es with the same placeholders', () => {
    for (const k of Object.keys(zh) as (keyof typeof zh)[]) {
      for (const [name, d] of [['en', en], ['es', es]] as const) {
        expect(d[k], `${name}:${k}`).toBeTruthy();
        expect(d[k].trim().length, `${name}:${k}`).toBeGreaterThan(0);
        expect(params(d[k]), `${name}:${k}`).toEqual(params(zh[k]));
      }
    }
  });
  it('translator formats params per language', () => {
    expect(te.in('en', 'cal.dt', { dt: 800 })).toBe('Δt = 800 ms');
    expect(te.in('es', 'hover.readout', { lead: 'V1', t: '1,2', v: '0,5' })).toContain('Derivación V1');
  });
  it('the calibration-pulse caption is the bare unit in every language', () => {
    for (const lang of ['zh', 'en', 'es'] as const) expect(te.in(lang, 'paper.cal')).toBe('1 mV');
  });
  it('numbers use the Spanish decimal comma and a true minus sign', () => {
    expect(fmtNum('es', 0.68, 2)).toBe('0,68');
    expect(fmtNum('en', -0.5, 1)).toBe('−0.5');
    expect(fmtNum('zh', 62, 0, true)).toBe('+62');
    expect(fmtNum('en', -0.0001, 2)).toBe('0.00');
  });
});
