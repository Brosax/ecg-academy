/**
 * #/atlas — the pattern atlas index: every finding of the taxonomy, searchable in zh / en / es at once, filtered by
 * category and severity ("can't-miss" = critical). Without a query the list is grouped by category in taxonomy order;
 * with a query it is ranked. Findings whose entries are not written yet still link to their page.
 */
import { useMemo } from 'preact/hooks';
import { href } from '../app/router';
import { FINDING_CATEGORIES, FINDINGS, type FindingCategory, type FindingId, type Severity } from '../core/findings';
import { LANGS, pick } from '../core/l10n';
import { lt } from '../i18n';
import { ta } from '../i18n/atlas';
import { store } from '../app/store';
import { Badge, Button, Icon } from '../ui';
import { entryOf } from './registry';
import { categoryCounts, filterFindings, severityCounts, type SeverityFilter } from './search';
import { atlasFilter, patchFilter } from './state';
import './atlas.css';

const SEVERITIES: readonly SeverityFilter[] = ['all', 'critical', 'major', 'minor', 'normal'];

type CatKey = `cat_${FindingCategory}`;
type SevKey = `sev_${Severity}`;

export const catLabel = (c: FindingCategory): string => ta(`cat_${c}` as CatKey);
export const sevLabel = (s: Severity): string => ta(`sev_${s}` as SevKey);
/** singular label for one finding's badge (the filter chips use the plural sevLabel) */
export const badgeLabel = (s: Severity): string => ta(`badge_${s}` as `badge_${Severity}`);

export function AtlasPage() {
  const f = atlasFilter.value;
  const lang = store.lang.value;
  const ids = useMemo(() => filterFindings(f), [f]);
  const cats = useMemo(() => categoryCounts(f), [f]);
  const sevs = useMemo(() => severityCounts(f), [f]);
  const total = Object.keys(FINDINGS).length;
  const grouped = !f.query.trim() && f.category === 'all';
  const filtered = f.query.trim() !== '' || f.category !== 'all' || f.severity !== 'all';

  return (
    <div class="at-page at-index">
      <header class="at-indexhead">
        <h1>{ta('title')}</h1>
        <p class="at-muted">{ta('intro')}</p>
      </header>

      <section class="at-filters" aria-label={ta('filterCategory')}>
        <label class="at-search">
          <span class="at-search__label">{ta('searchLabel')}</span>
          <span class="at-search__box">
            <Icon name="search" />
            <input
              type="search"
              value={f.query}
              placeholder={ta('searchPlaceholder')}
              onInput={(e) => patchFilter({ query: e.currentTarget.value })}
              autoComplete="off"
              spellcheck={false}
            />
          </span>
        </label>

        <div class="at-filters__row">
          <span class="at-label" id="at-cat-label">
            {ta('filterCategory')}
          </span>
          <div class="at-chips" role="radiogroup" aria-labelledby="at-cat-label">
            {(['all', ...FINDING_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={f.category === c}
                class={`at-chip ${f.category === c ? 'is-on' : ''}`}
                onClick={() => patchFilter({ category: c })}
              >
                {c === 'all' ? ta('catAll') : catLabel(c)}
                <span class="at-chip__n tabular">{cats[c] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div class="at-filters__row">
          <span class="at-label" id="at-sev-label">
            {ta('filterSeverity')}
          </span>
          <div class="at-chips" role="radiogroup" aria-labelledby="at-sev-label">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={f.severity === s}
                class={`at-chip at-chip--${s} ${f.severity === s ? 'is-on' : ''}`}
                title={s === 'critical' ? ta('cantMissHint') : undefined}
                onClick={() => patchFilter({ severity: s })}
              >
                {s === 'critical' && <Icon name="flag" size={15} />}
                {s === 'all' ? ta('sevAll') : sevLabel(s)}
                <span class="at-chip__n tabular">{sevs[s]}</span>
              </button>
            ))}
          </div>
        </div>

        <div class="at-filters__summary">
          <span class="at-muted tabular" role="status" aria-live="polite">
            {ta('countShown', { n: ids.length, total })}
          </span>
          {filtered && (
            <Button size="sm" tone="ghost" icon="close" onClick={() => patchFilter({ query: '', category: 'all', severity: 'all' })}>
              {ta('clearFilters')}
            </Button>
          )}
        </div>
      </section>

      {ids.length === 0 ? (
        <p class="at-empty">{ta('noResults')}</p>
      ) : grouped ? (
        FINDING_CATEGORIES.map((cat) => {
          const inCat = ids.filter((id) => FINDINGS[id].cat === cat);
          if (inCat.length === 0) return null;
          return (
            <section key={cat} class="at-group" aria-labelledby={`at-g-${cat}`}>
              <h2 id={`at-g-${cat}`} class="at-group__title">
                {catLabel(cat)} <span class="at-muted tabular">{inCat.length}</span>
              </h2>
              <ul class="at-grid" aria-label={catLabel(cat)}>
                {inCat.map((id) => (
                  <li key={id}>
                    <FindingCard id={id} lang={lang} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      ) : (
        <ul class="at-grid" aria-label={ta('resultsLabel')}>
          {ids.map((id) => (
            <li key={id}>
              <FindingCard id={id} lang={lang} showCategory />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FindingCard(props: { readonly id: FindingId; readonly lang: (typeof LANGS)[number]; readonly showCategory?: boolean }) {
  const d = FINDINGS[props.id];
  const e = entryOf(props.id);
  const others = LANGS.filter((l) => l !== props.lang).map((l) => pick(d.name, l));
  return (
    <a class={`at-card at-card--${d.severity} ${e ? '' : 'is-pending'}`} href={href({ name: 'finding', id: props.id })}>
      <span class="at-card__top">
        <span class="at-card__name">{lt(d.name)}</span>
        {d.severity === 'critical' && (
          <span class="at-card__flag" title={ta('cantMissHint')}>
            <Icon name="flag" size={16} label={ta('sev_critical')} />
          </span>
        )}
      </span>
      <span class="at-card__alt">
        {others.join(' · ')}
      </span>
      <span class="at-card__def">{e ? lt(e.definition) : ta('entryPending')}</span>
      <span class="at-card__meta">
        <Badge tone={d.severity}>{badgeLabel(d.severity)}</Badge>
        {props.showCategory && <span class="at-card__cat">{catLabel(d.cat)}</span>}
      </span>
    </a>
  );
}
