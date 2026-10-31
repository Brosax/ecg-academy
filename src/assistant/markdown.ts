/**
 * A small Markdown parser for the assistant's replies: paragraphs, headings, bullet and numbered lists, fenced code,
 * pipe tables and rules; inline **bold**, *emphasis*, `code`; links keep their text only (the panel opens nothing
 * external). It produces a block tree that Markdown.tsx renders to VNodes — model output never reaches innerHTML.
 * Tolerant of streaming: an unclosed fence or table renders with what has arrived so far.
 */
export type Inline =
  | { readonly t: 'text'; readonly s: string }
  | { readonly t: 'strong'; readonly s: string }
  | { readonly t: 'em'; readonly s: string }
  | { readonly t: 'code'; readonly s: string };

export type MdBlock =
  | { readonly kind: 'p'; readonly inline: readonly Inline[] }
  | { readonly kind: 'h'; readonly level: number; readonly inline: readonly Inline[] }
  | { readonly kind: 'ul'; readonly items: readonly (readonly Inline[])[] }
  | { readonly kind: 'ol'; readonly start: number; readonly items: readonly (readonly Inline[])[] }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'table'; readonly head: readonly (readonly Inline[])[]; readonly rows: readonly (readonly Inline[])[][] }
  | { readonly kind: 'hr' };

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(\*(?!\s)[^*\n]+?(?<!\s)\*)/g;

/** `[text](url)` → text; bare URLs stay as text. */
function stripLinks(s: string): string {
  return s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
}

export function parseInline(src: string): Inline[] {
  const s = stripLinks(src);
  const out: Inline[] = [];
  let last = 0;
  for (const m of s.matchAll(INLINE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: 'text', s: s.slice(last, i) });
    if (m[1]) out.push({ t: 'code', s: m[1].slice(1, -1) });
    else if (m[2]) out.push({ t: 'strong', s: m[2].slice(2, -2) });
    else if (m[3]) out.push({ t: 'em', s: m[3].slice(1, -1) });
    last = i + m[0].length;
  }
  if (last < s.length) out.push({ t: 'text', s: s.slice(last) });
  return out;
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s{0,3}[-*•]\s+(.*)$/;
const ORDERED = /^\s{0,3}(\d{1,3})[.)]\s+(.*)$/;
const RULE = /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE = /^\s{0,3}(```|~~~)/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function tableCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

export function parseMarkdown(src: string): MdBlock[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  const flush = (): void => {
    if (para.length > 0) {
      blocks.push({ kind: 'p', inline: parseInline(para.join(' ')) });
      para = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fence = FENCE.exec(line);
    if (fence) {
      flush();
      const close = fence[1];
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(close)) code.push(lines[i++]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    const h = HEADING.exec(line);
    if (h) {
      flush();
      blocks.push({ kind: 'h', level: h[1].length, inline: parseInline(h[2]) });
      continue;
    }

    if (RULE.test(line)) {
      flush();
      blocks.push({ kind: 'hr' });
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && !BULLET.test(line) && !ORDERED.test(line)) {
      flush();
      const head = tableCells(line).map(parseInline);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') rows.push(tableCells(lines[i++]).map(parseInline));
      i--;
      blocks.push({ kind: 'table', head, rows });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flush();
      const items: string[] = [bullet[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const b = BULLET.exec(next);
        if (b) items.push(b[1]);
        else if (/^\s{2,}\S/.test(next) && !ORDERED.test(next)) items[items.length - 1] += ` ${next.trim()}`;
        else break;
        i++;
      }
      blocks.push({ kind: 'ul', items: items.map(parseInline) });
      continue;
    }

    const ordered = ORDERED.exec(line);
    if (ordered) {
      flush();
      const items: string[] = [ordered[2]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const o = ORDERED.exec(next);
        if (o) items.push(o[2]);
        else if (/^\s{2,}\S/.test(next) && !BULLET.test(next)) items[items.length - 1] += ` ${next.trim()}`;
        else break;
        i++;
      }
      blocks.push({ kind: 'ol', start: Number(ordered[1]), items: items.map(parseInline) });
      continue;
    }

    para.push(line.trim());
  }
  flush();
  return blocks;
}
