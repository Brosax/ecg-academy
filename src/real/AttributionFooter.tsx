/**
 * Attribution for the real ECGs (CC BY 4.0: credit, licence link, changes made). Shown on every case page; the About page
 * may render it too (exported from index.tsx).
 */
import { lt } from '../i18n/index';
import { tr } from '../i18n/real';
import { ATTRIBUTION_CHANGES, ATTRIBUTION_LINKS, ATTRIBUTION_SOURCES } from './attribution';

export function AttributionFooter(props: { readonly ecgId?: number }) {
  return (
    <footer class="rl-attr">
      <h2 class="rl-attr__title">{tr('sourceTitle')}</h2>
      <p>{lt(ATTRIBUTION_SOURCES)}</p>
      <p>{lt(ATTRIBUTION_CHANGES)}</p>
      <p class="rl-attr__links">
        {props.ecgId != null && <span class="rl-attr__id tabular">{tr('ptbxlId', { id: props.ecgId })}</span>}
        {ATTRIBUTION_LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        ))}
      </p>
    </footer>
  );
}
