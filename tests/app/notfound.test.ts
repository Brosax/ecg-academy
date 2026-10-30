import { describe, expect, it } from 'vitest';
import { displayPath } from '../../src/app/NotFoundPage';

describe('not found: echoed address', () => {
  it('shows the path with one leading slash', () => {
    expect(displayPath('nope')).toBe('/nope');
    expect(displayPath('/nope')).toBe('/nope');
    expect(displayPath('//a/b')).toBe('/a/b');
    expect(displayPath('')).toBe('/');
  });

  it('truncates a long pasted address to a fixed maximum (with an ellipsis)', () => {
    const long = 'x'.repeat(500);
    const shown = displayPath(long);
    expect(shown.length).toBe(60);
    expect(shown.endsWith('…')).toBe(true);
    expect(displayPath('abcdef', 5)).toBe('/abc…');
    // exactly at the limit: unchanged
    expect(displayPath('x'.repeat(59))).toBe(`/${'x'.repeat(59)}`);
  });
});
