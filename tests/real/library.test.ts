import { describe, expect, it } from 'vitest';
import { FINDINGS, isFindingId } from '../../src/core/findings';
import { attribution } from '../../src/real/attribution';
import {
  buildCases,
  caseOfTheDay,
  casesWithFinding,
  categoryCounts,
  dateKey,
  filterCases,
  findingCounts,
  findingOptions,
  getCase,
  getCases,
  getLibrary,
  isFiltered,
  matchesFilter,
  navigationList,
  neighbours,
  NO_FILTER,
  randomCase,
  randomUnreadCase,
  rawMeta,
  type CaseFilter,
} from '../../src/real/library';
import { CASE_CATEGORIES } from '../../src/real/scp';

const cases = getCases();

describe('library', () => {
  it('holds the 300 curated cases with blind numbers 1..300', () => {
    expect(cases).toHaveLength(300);
    expect(cases.map((c) => c.num)).toEqual(Array.from({ length: 300 }, (_, i) => i + 1));
    expect(new Set(cases.map((c) => c.id)).size).toBe(300);
  });

  it('is deterministic (same blind order on every build)', () => {
    const again = buildCases(rawMeta);
    expect(again.map((c) => c.id)).toEqual(cases.map((c) => c.id));
  });

  it('does not order cases by diagnosis (blind order is shuffled)', () => {
    let sameNeighbour = 0;
    for (let i = 1; i < cases.length; i++) if (cases[i].cls === cases[i - 1].cls) sameNeighbour++;
    expect(sameNeighbour).toBeLessThan(30);
  });

  it('exposes the contract shape through getLibrary()', () => {
    const lib = getLibrary();
    expect(lib.cases).toHaveLength(300);
    for (const c of lib.cases) {
      expect(typeof c.id).toBe('number');
      expect(c.sex === 'M' || c.sex === 'F' || c.sex === null).toBe(true);
      expect(c.age === null || (Number.isInteger(c.age) && c.age >= 0 && c.age < 120)).toBe(true);
      for (const f of c.findings) expect(isFindingId(f)).toBe(true);
      for (const v of Object.values(c.ref)) expect(v === null || Number.isFinite(v)).toBe(true);
    }
    expect(getCase(cases[0].id)).toBe(cases[0]);
    expect(getCase(-1)).toBeUndefined();
  });

  it('carries the CC BY 4.0 attribution in three languages, with the changes made', () => {
    for (const lang of ['zh', 'en', 'es'] as const) {
      const t = getLibrary().attribution[lang];
      for (const s of ['PTB-XL', 'PTB-XL+', 'Wagner', 'Sci Data 2020;7:154', 'Strodthoff', 'Sci Data 2023;10:279', 'Goldberger', 'Circulation 2000', 'CC BY 4.0', '250 Hz', '5 µV']) {
        expect(t, `${lang}: ${s}`).toContain(s);
      }
    }
    expect(attribution.zh).toContain('修改');
    expect(attribution.es).toContain('Cambios');
  });

  it('lists real examples of a finding', () => {
    const lbbb = casesWithFinding('lbbb');
    expect(lbbb.length).toBeGreaterThanOrEqual(9);
    for (const c of lbbb) expect(c.findings).toContain('lbbb');
  });
});

describe('filters', () => {
  const none = new Set<number>();

  it('returns everything without a filter', () => {
    expect(filterCases(cases, NO_FILTER)).toHaveLength(300);
    expect(isFiltered(NO_FILTER)).toBe(false);
  });

  it('filters by category', () => {
    const counts = categoryCounts(cases);
    expect(counts.all).toBe(300);
    for (const cat of CASE_CATEGORIES) {
      const f: CaseFilter = { ...NO_FILTER, category: cat };
      const got = filterCases(cases, f, none);
      expect(got.length, cat).toBe(counts[cat]);
      expect(got.length, cat).toBeGreaterThan(0);
      for (const c of got) expect(c.categories).toContain(cat);
      expect(isFiltered(f)).toBe(true);
    }
    for (const c of cases) expect(c.categories.length).toBeGreaterThan(0);
  });

  it('filters by finding, and the finding counts agree', () => {
    const counts = findingCounts(cases);
    expect(counts.length).toBeGreaterThan(30);
    const order = Object.keys(FINDINGS);
    for (let i = 1; i < counts.length; i++) expect(order.indexOf(counts[i - 1].id)).toBeLessThan(order.indexOf(counts[i].id));
    for (const { id, n } of counts) {
      const got = filterCases(cases, { ...NO_FILTER, finding: id }, none);
      expect(got).toHaveLength(n);
      for (const c of got) expect(c.findings).toContain(id);
    }
  });

  it('combines category, finding and read status', () => {
    const read = new Set(cases.slice(0, 50).map((c) => c.id));
    const f: CaseFilter = { category: 'rhythm', finding: 'atrial-fibrillation', status: 'all' };
    const all = filterCases(cases, f, read);
    const unread = filterCases(cases, { ...f, status: 'unread' }, read);
    const done = filterCases(cases, { ...f, status: 'read' }, read);
    expect(all.length).toBeGreaterThan(0);
    expect(unread.length + done.length).toBe(all.length);
    for (const c of unread) expect(read.has(c.id)).toBe(false);
    for (const c of done) expect(read.has(c.id)).toBe(true);
    for (const c of all) expect(matchesFilter(c, f, read)).toBe(true);
    expect(filterCases(cases, { ...NO_FILTER, status: 'read' }, read)).toHaveLength(50);
  });

  it('offers only findings present under the other filters, keeping the selected one', () => {
    const inf: CaseFilter = { ...NO_FILTER, category: 'infarction' };
    const opts = findingOptions(cases, inf, none);
    const infCases = filterCases(cases, inf, none);
    for (const { id, n } of opts) expect(infCases.filter((c) => c.findings.includes(id))).toHaveLength(n);
    expect(opts.some((o) => o.id === 'pathological-q')).toBe(true);
    expect(opts.some((o) => o.id === 'lbbb')).toBe(false);
    const withSel = findingOptions(cases, { ...inf, finding: 'lbbb' }, none);
    expect(withSel.find((o) => o.id === 'lbbb')).toEqual({ id: 'lbbb', n: 0 });
    expect(withSel).toHaveLength(opts.length + 1);
    expect(findingOptions(cases, NO_FILTER, none)).toEqual(findingCounts(cases));
  });

  it('keeps blind order inside a filtered list', () => {
    const got = filterCases(cases, { ...NO_FILTER, category: 'conduction' });
    for (let i = 1; i < got.length; i++) expect(got[i].num).toBeGreaterThan(got[i - 1].num);
  });
});

describe('navigation', () => {
  it('walks a list with wrap-around', () => {
    const list = cases.slice(0, 5);
    expect(neighbours(list, list[0].id)).toEqual({ prev: list[4], next: list[1] });
    expect(neighbours(list, list[4].id)).toEqual({ prev: list[3], next: list[0] });
    expect(neighbours(list, -1)).toBeNull();
    expect(neighbours(list.slice(0, 1), list[0].id)).toBeNull();
  });

  it('keeps the current case in place when it no longer matches the filter', () => {
    const target = cases[10];
    const read = new Set<number>([target.id]); // just revealed → now "read"
    const list = navigationList(cases, { ...NO_FILTER, status: 'unread' }, read, target.id);
    expect(list).toHaveLength(300);
    expect(list[10]).toBe(target);
    const other = navigationList(cases, { ...NO_FILTER, category: 'normal' }, new Set(), target.id);
    expect(other.some((c) => c.id === target.id)).toBe(true);
    for (let i = 1; i < other.length; i++) expect(other[i].num).toBeGreaterThan(other[i - 1].num);
  });
});

describe('case of the day and random case', () => {
  it('formats the local calendar date', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 9, 16, 0, 0))).toBe('2026-10-16');
  });

  it('is deterministic per date (string or Date)', () => {
    const a = caseOfTheDay(cases, '2026-10-16');
    expect(caseOfTheDay(cases, '2026-10-16')).toBe(a);
    expect(caseOfTheDay(cases, new Date(2026, 9, 16, 8))).toBe(a);
    expect(caseOfTheDay(cases, new Date(2026, 9, 16, 22))).toBe(a);
    expect(caseOfTheDay(buildCases(rawMeta), '2026-10-16').id).toBe(a.id);
  });

  it('changes from day to day', () => {
    const ids = new Set<number>();
    for (let d = 1; d <= 30; d++) ids.add(caseOfTheDay(cases, `2026-11-${String(d).padStart(2, '0')}`).id);
    expect(ids.size).toBeGreaterThan(20);
  });

  it('rejects an empty library', () => {
    expect(() => caseOfTheDay([], '2026-10-16')).toThrow();
  });

  it('picks random cases reproducibly from a seed, avoiding the current case', () => {
    const a = randomCase(cases, '2026-10-16:1');
    expect(randomCase(cases, '2026-10-16:1')).toBe(a);
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) seen.add(randomCase(cases, `2026-10-16:${i}`)!.id);
    expect(seen.size).toBeGreaterThan(30);
    const two = cases.slice(0, 2);
    for (let i = 0; i < 10; i++) expect(randomCase(two, `s${i}`, two[0].id)).toBe(two[1]);
    expect(randomCase([], 'x')).toBeNull();
    expect(randomCase(cases.slice(0, 1), 'x', cases[0].id)).toBe(cases[0]);
  });

  it('prefers a case not yet read in the list on screen, falling back to the whole list or the library', () => {
    const shown = cases.slice(0, 10);
    const read = new Set(shown.slice(0, 9).map((c) => c.id));
    for (let i = 0; i < 10; i++) expect(randomUnreadCase(shown, cases, read, `d:${i}`)).toBe(shown[9]);
    // every case read: any case of the list
    const allRead = new Set(shown.map((c) => c.id));
    for (let i = 0; i < 10; i++) expect(shown).toContain(randomUnreadCase(shown, cases, allRead, `d:${i}`));
    // empty list (filters match nothing): the library, still unread first
    const pick = randomUnreadCase([], cases, read, 'd:0');
    expect(pick && !read.has(pick.id)).toBe(true);
    expect(randomUnreadCase(shown, cases, read, 'd:3')).toBe(randomUnreadCase(shown, cases, read, 'd:3'));
    expect(randomUnreadCase([], [], new Set(), 'x')).toBeNull();
  });
});
