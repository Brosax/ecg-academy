/** The reply Markdown parser (src/assistant/markdown.ts): blocks, inline marks, streaming tolerance, link stripping. */
import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from '../../src/assistant/markdown';

const text = (s: string) => ({ t: 'text', s });

describe('parseInline', () => {
  it('splits bold, emphasis and code', () => {
    expect(parseInline('The **QRS** lasts `≥ 120 ms` in *complete* block')).toEqual([
      text('The '),
      { t: 'strong', s: 'QRS' },
      text(' lasts '),
      { t: 'code', s: '≥ 120 ms' },
      text(' in '),
      { t: 'em', s: 'complete' },
      text(' block'),
    ]);
  });
  it('leaves lone asterisks and unbalanced marks as text', () => {
    expect(parseInline('a * b * c')).toEqual([text('a * b * c')]);
    expect(parseInline('**unclosed')).toEqual([text('**unclosed')]);
  });
  it('keeps the text of links and images only', () => {
    expect(parseInline('see [the atlas](https://example.com) and ![alt](x.png)')).toEqual([text('see the atlas and alt')]);
  });
});

describe('parseMarkdown', () => {
  it('joins paragraph lines and separates paragraphs by blank lines', () => {
    expect(parseMarkdown('line one\nline two\n\nsecond')).toEqual([
      { kind: 'p', inline: [text('line one line two')] },
      { kind: 'p', inline: [text('second')] },
    ]);
  });

  it('parses headings, rules, bullet and numbered lists (with continuation lines)', () => {
    const blocks = parseMarkdown('### Criteria\n- QRS **≥ 120 ms**\n- rSR′ in V1\n  continued\n\n---\n\n2. second\n3. third');
    expect(blocks).toEqual([
      { kind: 'h', level: 3, inline: [text('Criteria')] },
      { kind: 'ul', items: [[text('QRS '), { t: 'strong', s: '≥ 120 ms' }], [text('rSR′ in V1 continued')]] },
      { kind: 'hr' },
      { kind: 'ol', start: 2, items: [[text('second')], [text('third')]] },
    ]);
  });

  it('parses pipe tables', () => {
    const blocks = parseMarkdown('| Lead | Finding |\n|---|:---:|\n| V1 | rSR′ |\n| V6 | wide S |\n\nafter');
    expect(blocks[0]).toEqual({
      kind: 'table',
      head: [[text('Lead')], [text('Finding')]],
      rows: [
        [[text('V1')], [text('rSR′')]],
        [[text('V6')], [text('wide S')]],
      ],
    });
    expect(blocks[1]).toEqual({ kind: 'p', inline: [text('after')] });
  });

  it('parses fenced code, also while the closing fence has not arrived yet (streaming)', () => {
    expect(parseMarkdown('```\nQTc = QT / RR^(1/3)\n```\nafter')).toEqual([
      { kind: 'code', text: 'QTc = QT / RR^(1/3)' },
      { kind: 'p', inline: [text('after')] },
    ]);
    expect(parseMarkdown('```\npartial')).toEqual([{ kind: 'code', text: 'partial' }]);
  });

  it('a bullet line containing a pipe is a list, not a table; CRLF input is fine', () => {
    const blocks = parseMarkdown('- a | b\r\n- c\r\n');
    expect(blocks).toEqual([{ kind: 'ul', items: [[text('a | b')], [text('c')]] }]);
  });

  it('empty input gives no blocks', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('\n\n')).toEqual([]);
  });
});
