import { describe, expect, it } from 'vitest';
import { FINDINGS } from '../../src/core/findings';
import { LANGS } from '../../src/core/l10n';
import { tc } from '../../src/i18n/common';
import { href, parseHash, type Route } from '../../src/app/router';
import { getCase, getCases } from '../../src/real';
import { SAMPLE_ROUTES } from './fixtures';
import {
  documentTitle,
  HEADER_NAV,
  isDevViewer,
  MENU_NAV,
  pageKey,
  pageLabel,
  ROUTE_NAMES,
  ROUTE_NAMES_COMPLETE,
  SECTION_IDS,
  SECTION_OF,
  SECTIONS,
  sectionOf,
  TAB_NAV,
} from '../../src/app/routes';

describe('router: href ↔ parseHash', () => {
  it('samples cover every route name', () => {
    expect(ROUTE_NAMES_COMPLETE).toBe(true);
    expect(new Set(SAMPLE_ROUTES.map((r) => r.name))).toEqual(new Set(ROUTE_NAMES));
  });

  it.each(SAMPLE_ROUTES.map((r) => [href(r), r] as const))('%s round-trips', (h, r) => {
    expect(h.startsWith('#/')).toBe(true);
    expect(parseHash(h)).toEqual(r);
    // stable: building the link again gives the same string
    expect(href(parseHash(h))).toBe(h);
  });

  it('parses the non-canonical forms a learner may type', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/learn/')).toEqual({ name: 'learn' });
    expect(parseHash('#/practice?seed=3')).toEqual({ name: 'practice' });
    expect(parseHash('#/cases/abc')).toEqual({ name: 'cases' });
    expect(parseHash('#/learn/f2/x')).toEqual({ name: 'lesson', id: 'f2' });
    expect(parseHash('#/whatever/else')).toEqual({ name: 'notfound', path: 'whatever/else' });
  });
});

describe('navigation sections', () => {
  it('every route has a section entry and sections point back to themselves', () => {
    expect(Object.keys(SECTION_OF).sort()).toEqual([...ROUTE_NAMES].sort());
    for (const id of SECTION_IDS) expect(sectionOf(SECTIONS[id].route)).toBe(id);
    expect(sectionOf({ name: 'lesson', id: 'f1' })).toBe('learn');
    expect(sectionOf({ name: 'case', id: 1 })).toBe('cases');
    expect(sectionOf({ name: 'notfound', path: 'x' })).toBeNull();
  });

  it('header shows Learn · Practice · Cases · Atlas · Exam · Tools (docs/PLAN.md §2)', () => {
    expect(HEADER_NAV).toEqual(['learn', 'practice', 'lab', 'cases', 'atlas', 'exam', 'tools']);
  });

  it('the phone menu reaches every section; the tab bar is a subset', () => {
    expect([...MENU_NAV].sort()).toEqual([...SECTION_IDS].sort());
    for (const id of TAB_NAV) expect(SECTION_IDS).toContain(id);
    expect(TAB_NAV.length).toBeLessThanOrEqual(5);
  });
});

describe('dev route', () => {
  it('recognises #/dev/viewer only', () => {
    expect(isDevViewer(parseHash('#/dev/viewer'))).toBe(true);
    expect(isDevViewer(parseHash('#/dev/viewer/'))).toBe(true);
    expect(isDevViewer(parseHash('#/dev/other'))).toBe(false);
    expect(isDevViewer({ name: 'home' })).toBe(false);
  });

  it('is an ordinary "not found" in production builds', () => {
    const r = parseHash('#/dev/viewer');
    expect(isDevViewer(r, false)).toBe(false);
    expect(isDevViewer(r, true)).toBe(true);
  });
});

describe('page identity (focus moves on page change only)', () => {
  it('lesson steps and tools tabs keep the page key; other changes do not', () => {
    expect(pageKey({ name: 'lesson', id: 'f1', step: 1 })).toBe(pageKey({ name: 'lesson', id: 'f1', step: 2 }));
    expect(pageKey({ name: 'lesson', id: 'f1' })).not.toBe(pageKey({ name: 'lesson', id: 'f2' }));
    expect(pageKey({ name: 'tools', tab: 'qtc' })).toBe(pageKey({ name: 'tools' }));
    expect(pageKey({ name: 'case', id: 1 })).not.toBe(pageKey({ name: 'case', id: 2 }));
    expect(pageKey({ name: 'drill', id: 'a' })).not.toBe(pageKey({ name: 'drill', id: 'b' }));
  });

  it('distinct pages have distinct keys', () => {
    const keys = new Map<string, Route>();
    for (const r of SAMPLE_ROUTES) {
      const k = pageKey(r);
      const prev = keys.get(k);
      if (prev) expect(prev.name === r.name && (r.name === 'lesson' || r.name === 'tools' || r.name === 'lab')).toBe(true);
      keys.set(k, r);
    }
  });
});

describe('document title', () => {
  it('is non-empty and branded for every route in every language', () => {
    for (const lang of LANGS) {
      for (const r of SAMPLE_ROUTES) {
        const t = documentTitle(r, lang);
        expect(t.trim().length).toBeGreaterThan(0);
        expect(t).toContain('ECG Academy');
        expect(t).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('home shows the bilingual brand; pages lead with their own name', () => {
    expect(documentTitle({ name: 'home' }, 'zh')).toBe('ECG Academy · 心电图读图学院');
    expect(documentTitle({ name: 'home' }, 'en')).toBe('ECG Academy');
    expect(documentTitle({ name: 'settings' }, 'es')).toBe('Ajustes · ECG Academy');
    expect(documentTitle({ name: 'lesson', id: 'f1' }, 'en')).toBe('Lesson F1 · ECG Academy');
    expect(documentTitle({ name: 'notfound', path: 'x' }, 'zh')).toBe('页面不存在 · ECG Academy');
  });

  it('a real case is titled with its blind case number (as on the page), never with the PTB-XL record id', () => {
    const cases = getCases();
    expect(cases.length).toBeGreaterThan(0);
    for (const c of [cases[0], cases[cases.length - 1]]) {
      const n = String(c.num).padStart(3, '0');
      expect(documentTitle({ name: 'case', id: c.id }, 'en')).toBe(`Case ${n} · ECG Academy`);
      expect(pageLabel({ name: 'case', id: c.id }, 'zh')).toBe(`病例 ${n}`);
      expect(pageLabel({ name: 'case', id: c.id }, 'es')).toBe(`Caso ${n}`);
    }
  });

  it('an unknown case id falls back to the case library name', () => {
    const unknown = -1;
    expect(getCase(unknown)).toBeUndefined();
    for (const lang of LANGS) expect(pageLabel({ name: 'case', id: unknown }, lang)).toBe(tc.in(lang, 'navCases'));
  });

  it('a finding page is titled with the localized finding name; an unknown id falls back to the atlas', () => {
    for (const lang of LANGS) {
      expect(pageLabel({ name: 'finding', id: 'lbbb' }, lang)).toBe(FINDINGS.lbbb.name[lang]);
      expect(pageLabel({ name: 'finding', id: 'no-such-finding' }, lang)).toBe(tc.in(lang, 'navAtlas'));
    }
    expect(documentTitle({ name: 'finding', id: 'lbbb' }, 'es')).toBe(`${FINDINGS.lbbb.name.es} · ECG Academy`);
  });

  it('sub-pages use their section name; the dev viewer has its own title', () => {
    expect(pageLabel({ name: 'drill', id: 'rate:3' }, 'en')).toBe('Practice');
    expect(pageLabel({ name: 'tools', tab: 'qtc' }, 'zh')).toBe('工具');
    expect(pageLabel({ name: 'notfound', path: 'dev/viewer' }, 'en')).toBe('Viewer demo (dev)');
    expect(pageLabel({ name: 'home' }, 'en')).toBeNull();
  });
});
