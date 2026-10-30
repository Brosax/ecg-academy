/**
 * Glossary completeness: every finding of the taxonomy and every glossary term of docs/curriculum/book-synthesis.json is
 * covered; all three languages are filled; outdated book wordings appear only as "replaces …"; search works in any
 * language.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FINDING_LIST } from '../../src/core/findings';
import { LANGS } from '../../src/core/l10n';
import { BANNED_TERMS } from '../../src/atlas/schema';
import { BOOK_TERMS, buildGlossary, searchGlossary } from '../../src/tools/glossary';

interface BookGlossaryTerm {
  readonly es: string;
  readonly en: string;
  readonly zh: string;
}

function bookGlossary(): BookGlossaryTerm[] {
  const raw = readFileSync(fileURLToPath(new URL('../../docs/curriculum/book-synthesis.json', import.meta.url)), 'utf8');
  return (JSON.parse(raw) as { glossary: BookGlossaryTerm[] }).glossary;
}

const rows = buildGlossary();

describe('glossary completeness', () => {
  it('has a row for every finding of the taxonomy', () => {
    const ids = new Set(rows.filter((r) => r.kind === 'finding').map((r) => r.finding));
    expect(FINDING_LIST.filter((d) => !ids.has(d.id)).map((d) => d.id)).toEqual([]);
  });

  it('covers every glossary term of the book synthesis exactly once', () => {
    const book = bookGlossary().map((t) => t.en);
    expect(book.length).toBeGreaterThan(50);
    const mapped = BOOK_TERMS.map((b) => b.book);
    expect(mapped.filter((t) => !book.includes(t))).toEqual([]);
    expect(book.filter((t) => !mapped.includes(t))).toEqual([]);
    expect(new Set(mapped).size).toBe(mapped.length);
  });

  it('every book term ends up in exactly one glossary row', () => {
    for (const b of BOOK_TERMS) {
      const holders = rows.filter((r) => r.book.includes(b.book));
      expect([b.book, holders.length]).toEqual([b.book, 1]);
    }
  });

  it('has unique keys and all three languages filled', () => {
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    for (const r of rows) {
      for (const l of LANGS) {
        expect([r.key, l, r.term[l].trim().length > 0]).toEqual([r.key, l, true]);
        if (r.replaces) expect(r.replaces[l].trim().length).toBeGreaterThan(0);
        if (r.note) expect(r.note[l].trim().length).toBeGreaterThan(0);
      }
      expect(r.term.zh).toMatch(/[一-鿿δ]/);
    }
  });

  it('uses current terminology; outdated wordings appear only as "replaces"', () => {
    const hits: string[] = [];
    for (const r of rows) for (const l of LANGS) for (const b of BANNED_TERMS) if (b.re.test(r.term[l])) hits.push(`${r.key}.${l}`);
    expect(hits).toEqual([]);
    const lafb = rows.find((r) => r.finding === 'lafb');
    expect(lafb?.replaces?.es).toMatch(/hemibloqueo/);
    expect(lafb?.term.es).toMatch(/bloqueo fascicular/i);
    const lae = rows.find((r) => r.finding === 'lae');
    expect(lae?.replaces?.es).toMatch(/crecimiento auricular/);
    expect(rows.find((r) => r.book.includes('intrinsicoid deflection'))?.term.en).toBe('R-wave peak time');
    expect(rows.find((r) => r.book.includes('sick sinus syndrome'))?.finding).toBe('sinus-node-dysfunction');
  });

  it('Spanish terms use Spain usage', () => {
    const es = rows.map((r) => r.term.es).join('\n');
    expect(es).toMatch(/derivación/);
    expect(es).toMatch(/aurícula|auricular/);
    expect(es).not.toMatch(/\bderivada\b/);
  });
});

describe('glossary search', () => {
  it('finds a term from any language, accent-insensitive', () => {
    expect(searchGlossary(rows, '导联').some((r) => r.key === 'term:lead')).toBe(true);
    expect(searchGlossary(rows, 'derivacion').some((r) => r.key === 'term:lead')).toBe(true);
    expect(searchGlossary(rows, 'wilson').map((r) => r.key)).toContain('term:wilson-central-terminal');
  });

  it('finds a current term by its replaced name', () => {
    expect(searchGlossary(rows, 'hemibloqueo anterior').map((r) => r.finding)).toContain('lafb');
    expect(searchGlossary(rows, 'intrinsicoid').map((r) => r.key)).toContain('term:intrinsicoid-deflection');
  });

  it('searches the notes too', () => {
    // the WPW note explains "pattern" vs "syndrome"
    expect(searchGlossary(rows, 'taquiarritmia').map((r) => r.key)).toContain('term:wpw-syndrome');
  });

  it('empty query returns everything', () => {
    expect(searchGlossary(rows, '')).toHaveLength(rows.length);
  });
});
