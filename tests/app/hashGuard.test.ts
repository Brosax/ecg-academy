import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseHash } from '../../src/app/router';
import { repairHash } from '../../src/app/hashGuard';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('hash guard (undecodable addresses)', () => {
  it('leaves good hashes alone', () => {
    for (const h of ['', '#', '#/', '#/learn/f1/2', '#/practice/rate%3A12345', '#/learn/x%201%2F%C3%A9', '#/tools/qtc?x=%'])
      expect(repairHash(h)).toBeNull();
  });

  it('the router would throw on a truncated escape', () => {
    expect(() => parseHash('#/practice/rate%3')).toThrow(URIError);
    expect(() => parseHash('#/learn/%E0%A4%A')).toThrow(URIError);
  });

  it('makes only the broken segment literal, so the router parses it', () => {
    expect(repairHash('#/practice/rate%3')).toBe('#/practice/rate%253');
    expect(parseHash(repairHash('#/practice/rate%3') ?? '')).toEqual({ name: 'drill', id: 'rate%3' });
    // invalid UTF-8 (incomplete multi-byte sequence)
    expect(parseHash(repairHash('#/learn/%E0%A4%A/2') ?? '')).toEqual({ name: 'lesson', id: '%E0%A4%A', step: 2 });
    // a good segment keeps its escapes; the query is kept
    expect(repairHash('#/learn/a%20b/%ZZ?seed=1')).toBe('#/learn/a%20b/%25ZZ?seed=1');
    // a broken first segment is an ordinary "not found"
    expect(parseHash(repairHash('#/%') ?? '')).toEqual({ name: 'notfound', path: '%25' });
  });

  it('every repaired hash parses', () => {
    for (const h of ['#/%', '#/a/%', '#/cases/%FF', '#/atlas/%C3', '#%E0', '#/learn/%/%/%']) {
      const fixed = repairHash(h);
      expect(fixed).not.toBeNull();
      expect(() => parseHash(fixed ?? '')).not.toThrow();
      expect(repairHash(fixed ?? '')).toBeNull();
    }
  });

  it('is the first import of main.tsx and does not import the router', () => {
    const imports = [...read('../../src/main.tsx').matchAll(/^import\s.*?['"]([^'"]+)['"];?$/gm)].map((m) => m[1]);
    expect(imports[0]).toBe('./app/hashGuard');
    expect(read('../../src/app/hashGuard.ts')).not.toMatch(/^import\s/m);
  });
});
