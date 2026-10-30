/**
 * Atlas search: one query matches finding names in all three languages (accent- and case-insensitive), abbreviations,
 * and entry definitions; filters by category and severity ("can't-miss" = critical); counts and siblings.
 */
import { describe, expect, it } from 'vitest';
import { FINDING_LIST, FINDINGS } from '../../src/core/findings';
import { categoryCounts, filterFindings, normalize, NO_ATLAS_FILTER, searchFindings, severityCounts, siblings } from '../../src/atlas/search';

const top = (q: string, n = 3) => searchFindings(q).slice(0, n);

describe('normalize', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalize('Aurícula  IZQUIERDA')).toBe('auricula izquierda');
    expect(normalize('ST–T «sobrecarga»')).toBe('st t sobrecarga');
    expect(normalize('Wolff-Parkinson-White')).toBe('wolff parkinson white');
    expect(normalize('左心室肥厚（LVH）')).toBe('左心室肥厚 lvh');
  });
});

describe('searchFindings', () => {
  it('empty query returns every finding in taxonomy order', () => {
    expect(searchFindings('')).toEqual(FINDING_LIST.map((d) => d.id));
    expect(searchFindings('   ')).toHaveLength(FINDING_LIST.length);
  });

  it('finds by Chinese name', () => {
    expect(top('左心室肥厚')[0]).toBe('lvh');
    expect(searchFindings('心房颤动')).toContain('atrial-fibrillation');
    expect(top('电轴左偏')[0]).toBe('lad');
  });

  it('finds by English name and abbreviation', () => {
    expect(top('LVH')[0]).toBe('lvh');
    expect(top('left axis deviation')[0]).toBe('lad');
    expect(searchFindings('torsades')[0]).toBe('torsades');
  });

  it('finds by Spanish name, with or without accents', () => {
    expect(top('hipertrofia ventricular izquierda')[0]).toBe('lvh');
    expect(searchFindings('anomalia auricular')).toEqual(expect.arrayContaining(['lae', 'rae']));
    expect(searchFindings('anomalía auricular izquierda')[0]).toBe('lae');
    expect(top('HVI')[0]).toBe('lvh');
  });

  it('matches older names kept as search aliases (but not as entry text)', () => {
    expect(searchFindings('P pulmonale')[0]).toBe('rae');
    expect(searchFindings('crecimiento auricular izquierdo')[0]).toBe('lae');
    expect(searchFindings('cubeta digitálica')[0]).toBe('digoxin-effect');
  });

  it('requires every token to match', () => {
    const r = searchFindings('bloqueo rama izquierda');
    expect(r[0]).toBe('lbbb');
    expect(r).not.toContain('rbbb');
  });

  it('ranks name matches above definition matches', () => {
    const r = searchFindings('alternans');
    expect(r[0]).toBe('electrical-alternans');
  });

  it('returns nothing for nonsense', () => {
    expect(searchFindings('xyzzy-qwerty')).toEqual([]);
  });
});

describe('filters', () => {
  it('category filter keeps only that category', () => {
    const ids = filterFindings({ ...NO_ATLAS_FILTER, category: 'axis' });
    expect(ids).toEqual(['axis-normal', 'lad', 'rad', 'extreme-axis']);
  });

  it("can't-miss filter keeps only critical findings", () => {
    const ids = filterFindings({ ...NO_ATLAS_FILTER, severity: 'critical' });
    expect(ids.length).toBeGreaterThan(10);
    expect(ids.every((id) => FINDINGS[id].severity === 'critical')).toBe(true);
    expect(ids).toContain('long-qt');
    expect(ids).toContain('vt-monomorphic');
  });

  it('combines query, category and severity', () => {
    const ids = filterFindings({ query: 'QT', category: 'repolarization', severity: 'critical' });
    expect(ids).toEqual(['long-qt']);
  });

  it('counts per category and per severity ignore their own dimension', () => {
    const f = { ...NO_ATLAS_FILTER, category: 'axis' as const, severity: 'critical' as const };
    const cats = categoryCounts(f);
    const sevs = severityCounts(f);
    expect(cats.all).toBe(FINDING_LIST.filter((d) => d.severity === 'critical').length);
    expect(sevs.all).toBe(4);
    expect(sevs.critical).toBe(0);
    expect(sevs.major).toBe(1);
  });
});

describe('siblings', () => {
  it('walks findings of the same category', () => {
    expect(siblings('lad')).toEqual({ prev: 'axis-normal', next: 'rad' });
    expect(siblings('axis-normal').prev).toBeNull();
    expect(siblings('extreme-axis').next).toBeNull();
  });
});
