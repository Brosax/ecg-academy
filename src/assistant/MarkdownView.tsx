/** Renders the assistant's Markdown (src/assistant/markdown.ts) as VNodes — never through innerHTML. */
import type { ComponentChildren } from 'preact';
import { parseMarkdown, type Inline, type MdBlock } from './markdown';

type HeadingTag = 'h3' | 'h4' | 'h5' | 'h6';

function inlines(list: readonly Inline[]): ComponentChildren {
  return list.map((x, i) => {
    switch (x.t) {
      case 'text':
        return x.s;
      case 'strong':
        return <strong key={i}>{x.s}</strong>;
      case 'em':
        return <em key={i}>{x.s}</em>;
      case 'code':
        return <code key={i}>{x.s}</code>;
    }
  });
}

function block(b: MdBlock, i: number): ComponentChildren {
  switch (b.kind) {
    case 'p':
      return <p key={i}>{inlines(b.inline)}</p>;
    case 'h': {
      // the panel's own title is an h2: the reply's headings start at h3
      const Tag = `h${Math.min(6, b.level + 2)}` as HeadingTag;
      return <Tag key={i}>{inlines(b.inline)}</Tag>;
    }
    case 'ul':
      return (
        <ul key={i}>
          {b.items.map((it, j) => (
            <li key={j}>{inlines(it)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={i} start={b.start}>
          {b.items.map((it, j) => (
            <li key={j}>{inlines(it)}</li>
          ))}
        </ol>
      );
    case 'code':
      return (
        <pre key={i}>
          <code>{b.text}</code>
        </pre>
      );
    case 'table':
      return (
        <table key={i}>
          <thead>
            <tr>
              {b.head.map((c, j) => (
                <th key={j}>{inlines(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r, j) => (
              <tr key={j}>
                {r.map((c, k) => (
                  <td key={k}>{inlines(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'hr':
      return <hr key={i} />;
  }
}

export function Markdown(props: { readonly text: string }) {
  return <div class="ai-md">{parseMarkdown(props.text).map(block)}</div>;
}
