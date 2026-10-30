import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../../src/app/store';
import { caseLayout, caseNumber, decimal, degOrDash, numOrDash, patientLine, SHEET_RATIO, signed, stadiumKey } from '../../src/real/format';
import { tr } from '../../src/i18n/real';
import { LruCache } from '../../src/real/lru';

describe('display helpers', () => {
  it('pads case numbers to three digits', () => {
    expect(caseNumber(7)).toBe('007');
    expect(caseNumber(300)).toBe('300');
  });

  it('prints decimals in the notation of each language', () => {
    expect(decimal(1.254, 2, 'en')).toBe('1.25');
    expect(decimal(1.254, 2, 'zh')).toBe('1.25');
    expect(decimal(1.254, 2, 'es')).toBe('1,25');
    expect(decimal(12345.6, 1, 'en')).toBe('12345.6'); // no grouping
  });

  it('prints signed numbers and degrees with a true minus sign', () => {
    expect(signed(12)).toBe('+12');
    expect(signed(-8.4)).toBe('−8');
    expect(signed(0.2)).toBe('0');
    expect(numOrDash(null)).toBe('—');
    expect(numOrDash(-30)).toBe('−30');
    expect(numOrDash(84.6)).toBe('85');
    expect(degOrDash(39)).toBe('+39°');
    expect(degOrDash(-45)).toBe('−45°');
    expect(degOrDash(0)).toBe('0°');
    expect(degOrDash(null)).toBe('—');
  });

  it('maps the PTB-XL infarction stadium to a label key', () => {
    expect(stadiumKey(null)).toBeNull();
    expect(stadiumKey('Stadium I')).toBe('stadiumI');
    expect(stadiumKey('Stadium I-II')).toBe('stadiumI_II');
    expect(stadiumKey('Stadium II')).toBe('stadiumII');
    expect(stadiumKey('Stadium II-III')).toBe('stadiumII_III');
    expect(stadiumKey('Stadium III')).toBe('stadiumIII');
    expect(stadiumKey('unknown')).toBe('stadiumUnknown');
  });

  it('shows only sex and age before the reveal, in every language', () => {
    expect(patientLine({ sex: 'F', age: 63 }, 'en')).toBe('female, 63 y');
    expect(patientLine({ sex: 'M', age: 45 }, 'es')).toBe('varón, 45 años');
    expect(patientLine({ sex: 'F', age: 63 }, 'zh')).toBe('女，63 岁');
    expect(patientLine({ sex: null, age: null }, 'en')).toBe('sex unknown, age unknown');
  });

  it('opens every case on a 12-lead layout, with a placeholder shaped like that layout', () => {
    expect(caseLayout('3x4+1')).toBe('3x4+1');
    expect(caseLayout('3x4+3')).toBe('3x4+3');
    expect(caseLayout('6x2')).toBe('6x2');
    expect(caseLayout('12x1')).toBe('12x1');
    expect(caseLayout('single')).toBe('3x4+1');
    expect(caseLayout('strip')).toBe('3x4+1');
    for (const l of LAYOUTS) expect(SHEET_RATIO[l]).toBeGreaterThan(0.5);
    // taller layouts are narrower
    expect(SHEET_RATIO['12x1']).toBeLessThan(SHEET_RATIO['6x2']);
    expect(SHEET_RATIO['6x2']).toBeLessThan(SHEET_RATIO['3x4+1']);
  });

  it('has every UI string in the three languages', () => {
    for (const key of ['title', 'blindMode', 'reveal', 'measTitle', 'refNote', 'caseOfDay', 'clearConfirm', 'openAtlas', 'qtcFormula', 'refSaid', 'normSuperseded', 'loadErrorUnsupported', 'openCaseDx', 'caliperAmp', 'youCompatible'] as const) {
      const zh = tr.in('zh', key), en = tr.in('en', key), es = tr.in('es', key);
      expect(zh && en && es, key).toBeTruthy();
      expect(zh).not.toBe(key);
    }
  });
});

describe('LruCache', () => {
  it('evicts the least recently used entry', () => {
    const c = new LruCache<number, string>(2);
    c.set(1, 'a');
    c.set(2, 'b');
    expect(c.get(1)).toBe('a'); // 1 is now most recent
    c.set(3, 'c'); // evicts 2
    expect(c.has(2)).toBe(false);
    expect(c.keys()).toEqual([1, 3]);
    c.set(1, 'A'); // refresh
    c.set(4, 'd'); // evicts 3
    expect(c.keys()).toEqual([1, 4]);
    expect(c.get(1)).toBe('A');
    expect(c.size).toBe(2);
    expect(c.delete(4)).toBe(true);
    expect(c.get(4)).toBeUndefined();
  });

  it('rejects a zero capacity', () => {
    expect(() => new LruCache(0)).toThrow();
  });
});
