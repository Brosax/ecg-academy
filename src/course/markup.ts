/**
 * Light markup for lesson text (src/course/api.ts `text` block): **bold**, *italic*, line breaks, "- " bullets and
 * blank-line paragraphs. Parsed into a tiny tree that Markup.tsx renders — never HTML, so lesson text cannot inject
 * markup. Unmatched markers stay literal. Pure; tested in tests/course/markup.test.ts.
 */

export type Inline =
  | { readonly t: 'text'; readonly s: string }
  | { readonly t: 'b'; readonly c: readonly Inline[] }
  | { readonly t: 'i'; readonly c: readonly Inline[] }
  | { readonly t: 'br' };

export type MarkupBlock = { readonly t: 'p'; readonly c: readonly Inline[] } | { readonly t: 'ul'; readonly items: readonly (readonly Inline[])[] };

const BULLET = /^\s*[-•]\s+/;

/** Index of the closing single '*' for an italic run starting after `from` (skips '**' pairs); -1 if none. */
function closingStar(s: string, from: number): number {
  for (let j = from; j < s.length; j++) {
    if (s[j] !== '*') continue;
    if (s[j + 1] === '*') {
      const k = s.indexOf('**', j + 2);
      if (k < 0) return -1;
      j = k + 1;
      continue;
    }
    if (j > from && s[j - 1] !== ' ') return j;
  }
  return -1;
}

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', s: buf });
    buf = '';
  };
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '\n') {
      flush();
      out.push({ t: 'br' });
      i++;
      continue;
    }
    if (ch === '*' && s[i + 1] === '*') {
      const j = s.indexOf('**', i + 2);
      if (j > i + 2) {
        flush();
        out.push({ t: 'b', c: parseInline(s.slice(i + 2, j)) });
        i = j + 2;
        continue;
      }
    } else if (ch === '*' && s[i + 1] !== undefined && s[i + 1] !== ' ') {
      const j = closingStar(s, i + 1);
      if (j > i + 1) {
        flush();
        out.push({ t: 'i', c: parseInline(s.slice(i + 1, j)) });
        i = j + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

/** Parse lesson text: paragraphs split on blank lines; consecutive "- " lines form a list; other lines break. */
export function parseMarkup(src: string): MarkupBlock[] {
  const out: MarkupBlock[] = [];
  const paras = src.replace(/\r\n?/g, '\n').split(/\n\s*\n/);
  for (const para of paras) {
    const lines = para.split('\n').filter((x, k, a) => !(x.trim() === '' && (k === 0 || k === a.length - 1)));
    let text: string[] = [];
    let items: Inline[][] = [];
    const flushText = () => {
      if (text.length) out.push({ t: 'p', c: parseInline(text.join('\n').trim()) });
      text = [];
    };
    const flushList = () => {
      if (items.length) out.push({ t: 'ul', items });
      items = [];
    };
    for (const line of lines) {
      if (BULLET.test(line)) {
        flushText();
        items.push(parseInline(line.replace(BULLET, '').trim()));
      } else if (items.length && /^\s{2,}\S/.test(line)) {
        // indented continuation of the previous bullet
        const last = items[items.length - 1];
        items[items.length - 1] = [...last, { t: 'br' }, ...parseInline(line.trim())];
      } else {
        flushList();
        if (line.trim() !== '') text.push(line);
      }
    }
    flushText();
    flushList();
  }
  return out;
}

/** Plain text of parsed markup (aria labels, length checks). */
export function plainText(src: string): string {
  const inl = (c: readonly Inline[]): string => c.map((x) => (x.t === 'text' ? x.s : x.t === 'br' ? ' ' : inl(x.c))).join('');
  return parseMarkup(src)
    .map((b) => (b.t === 'p' ? inl(b.c) : b.items.map(inl).join(' ')))
    .join(' ');
}

/** Markers that did not pair up (validator warning): an odd number of '**' or a stray '*'. */
export function unbalancedMarkers(src: string): boolean {
  const residue = (c: readonly Inline[]): boolean => c.some((x) => (x.t === 'text' ? x.s.includes('*') : x.t === 'br' ? false : residue(x.c)));
  return parseMarkup(src).some((b) => (b.t === 'p' ? residue(b.c) : b.items.some(residue)));
}
