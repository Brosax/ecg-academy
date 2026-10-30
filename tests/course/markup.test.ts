/**
 * Light markup of lesson text (src/course/markup.ts): **bold**, *italic*, line breaks, "- " bullets, paragraphs.
 */
import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkup, plainText, unbalancedMarkers } from '../../src/course/markup';

describe('inline markup', () => {
  it('bold, italic, nested, and line breaks', () => {
    expect(parseInline('a **b** c')).toEqual([{ t: 'text', s: 'a ' }, { t: 'b', c: [{ t: 'text', s: 'b' }] }, { t: 'text', s: ' c' }]);
    expect(parseInline('*x*')).toEqual([{ t: 'i', c: [{ t: 'text', s: 'x' }] }]);
    expect(parseInline('**bold *it* bold**')).toEqual([
      { t: 'b', c: [{ t: 'text', s: 'bold ' }, { t: 'i', c: [{ t: 'text', s: 'it' }] }, { t: 'text', s: ' bold' }] },
    ]);
    expect(parseInline('*a **b** c*')).toEqual([{ t: 'i', c: [{ t: 'text', s: 'a ' }, { t: 'b', c: [{ t: 'text', s: 'b' }] }, { t: 'text', s: ' c' }] }]);
    expect(parseInline('one\ntwo')).toEqual([{ t: 'text', s: 'one' }, { t: 'br' }, { t: 'text', s: 'two' }]);
  });
  it('unmatched or spaced markers stay literal (3 * 4, a lone **)', () => {
    expect(parseInline('3 * 4 = 12')).toEqual([{ t: 'text', s: '3 * 4 = 12' }]);
    expect(parseInline('**open')).toEqual([{ t: 'text', s: '**open' }]);
    expect(parseInline('QTc 是 **QT**校正值')).toEqual([{ t: 'text', s: 'QTc 是 ' }, { t: 'b', c: [{ t: 'text', s: 'QT' }] }, { t: 'text', s: '校正值' }]);
  });
});

describe('block markup', () => {
  it('paragraphs and bullet lists', () => {
    const src = 'Intro line\nsecond line\n\n- one\n- **two**\n\nEnd.';
    expect(parseMarkup(src)).toEqual([
      { t: 'p', c: [{ t: 'text', s: 'Intro line' }, { t: 'br' }, { t: 'text', s: 'second line' }] },
      { t: 'ul', items: [[{ t: 'text', s: 'one' }], [{ t: 'b', c: [{ t: 'text', s: 'two' }] }]] },
      { t: 'p', c: [{ t: 'text', s: 'End.' }] },
    ]);
  });
  it('a list directly after a line of text, and back to text', () => {
    expect(parseMarkup('Rules:\n- a\n- b\nAfter').map((b) => b.t)).toEqual(['p', 'ul', 'p']);
  });
  it('plain text and unbalanced-marker detection', () => {
    expect(plainText('**P** wave\n- one')).toBe('P wave one');
    expect(unbalancedMarkers('a **b** *c*')).toBe(false);
    expect(unbalancedMarkers('a **b')).toBe(true);
  });
});
