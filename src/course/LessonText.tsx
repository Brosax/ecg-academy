/**
 * Renders lesson light markup (markup.ts) as elements — never as HTML, so lesson text cannot inject markup.
 */
import type { ComponentChildren } from 'preact';
import { parseMarkup, type Inline } from './markup';

function renderInline(c: readonly Inline[]): ComponentChildren[] {
  return c.map((x, i) => {
    switch (x.t) {
      case 'text':
        return x.s;
      case 'br':
        return <br key={i} />;
      case 'b':
        return <strong key={i}>{renderInline(x.c)}</strong>;
      case 'i':
        return <em key={i}>{renderInline(x.c)}</em>;
    }
  });
}

export function Markup(props: { readonly text: string; readonly class?: string }) {
  const blocks = parseMarkup(props.text);
  return (
    <div class={`crs-md ${props.class ?? ''}`}>
      {blocks.map((b, i) =>
        b.t === 'p' ? (
          <p key={i}>{renderInline(b.c)}</p>
        ) : (
          <ul key={i}>
            {b.items.map((it, k) => (
              <li key={k}>{renderInline(it)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
