/**
 * #/cases — browse the 300 real PTB-XL cases. Blind mode (default) shows only case number, sex and age, so the learner
 * reads before knowing the diagnosis. Filters: library category, finding, read status. "Case of the day" is
 * deterministic per calendar date; "Random case" is seeded (date + click count) and prefers cases not yet read.
 */
import { useMemo } from 'preact/hooks';
import type { FindingCategory, FindingId } from '../core/findings';
import { FINDING_CATEGORIES, FINDINGS } from '../core/findings';
import { go, href } from '../app/router';
import { lt } from '../i18n/index';
import { tr } from '../i18n/real';
import { Badge, Button, Icon, LinkButton, Segmented } from '../ui/index';
import { AttributionFooter } from './AttributionFooter';
import { caseNumber, CATEGORY_KEY, patientLine } from './format';
import {
  caseOfTheDay,
  categoryCounts,
  dateKey,
  filterCases,
  findingOptions,
  getCases,
  isFiltered,
  NO_FILTER,
  randomUnreadCase,
  type ReadStatus,
  type RealCase,
} from './library';
import { CASE_CATEGORIES, SCP, type CaseCategory } from './scp';
import { blind, filter, nextRandomSeed, readSet, setBlind } from './state';
import './real.css';

export function CasesPage() {
  const cases = getCases();
  const f = filter.value;
  const read = readSet.value;
  const isBlind = blind.value;
  const shown = useMemo(() => filterCases(cases, f, read), [cases, f, read]);
  const catCounts = useMemo(() => categoryCounts(cases), [cases]);
  const fCounts = useMemo(() => findingOptions(cases, f, read), [cases, f, read]);
  const today = dateKey(new Date());
  const cotd = caseOfTheDay(cases, today);

  const setFilter = (patch: Partial<typeof f>) => (filter.value = { ...filter.value, ...patch });
  const onRandom = () => {
    const pick = randomUnreadCase(shown, cases, read, nextRandomSeed(today));
    if (pick) go({ name: 'case', id: pick.id });
  };

  const findingGroups = FINDING_CATEGORIES.map((cat) => ({ cat, items: fCounts.filter((x) => FINDINGS[x.id].cat === cat) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div class="rl-page">
      <header class="rl-head">
        <div class="rl-head__text">
          <h1>{tr('title')}</h1>
          <p class="rl-muted">{tr('intro')}</p>
        </div>
        <div class="rl-head__actions">
          <LinkButton href={href({ name: 'case', id: cotd.id })} tone="primary" icon="flag">
            {tr('caseOfDay')} · <span class="tabular">{tr('caseNo', { n: caseNumber(cotd.num) })}</span>
          </LinkButton>
          <Button icon="refresh" onClick={onRandom}>
            {tr('randomCase')}
          </Button>
        </div>
      </header>

      <section class="rl-filters" aria-label={tr('filters')}>
        <div class="rl-filters__row">
          <span class="rl-label" id="rl-cat-label">
            {tr('filterCategory')}
          </span>
          <div class="rl-chips" role="radiogroup" aria-labelledby="rl-cat-label">
            {(['all', ...CASE_CATEGORIES] as const).map((cat: CaseCategory | 'all') => (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={f.category === cat}
                class={`rl-chip ${f.category === cat ? 'is-on' : ''}`}
                onClick={() => setFilter({ category: cat })}
              >
                {tr(CATEGORY_KEY[cat])}
                <span class="rl-chip__n tabular">{catCounts[cat]}</span>
              </button>
            ))}
          </div>
        </div>
        <div class="rl-filters__row rl-filters__row--wrap">
          <label class="rl-field-inline">
            <span class="rl-label">{tr('filterFinding')}</span>
            <select
              class="rl-select"
              value={f.finding}
              onChange={(e) => setFilter({ finding: e.currentTarget.value as FindingId | 'all' })}
            >
              <option value="all">{tr('allFindings')}</option>
              {findingGroups.map((g) => (
                <optgroup key={g.cat} label={tr(`fcat_${g.cat}` as `fcat_${FindingCategory}`)}>
                  {g.items.map((x) => (
                    <option key={x.id} value={x.id}>
                      {lt(FINDINGS[x.id].name)} ({x.n})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div class="rl-field-inline">
            <span class="rl-label" id="rl-status-label">
              {tr('filterStatus')}
            </span>
            <Segmented<ReadStatus>
              size="sm"
              ariaLabel={tr('filterStatus')}
              value={f.status}
              onChange={(v) => setFilter({ status: v })}
              options={[
                { value: 'all', label: tr('statusAll') },
                { value: 'unread', label: tr('statusUnread') },
                { value: 'read', label: tr('statusRead') },
              ]}
            />
          </div>
          <label class="rl-toggle" title={tr('blindHint')}>
            <input type="checkbox" checked={isBlind} onChange={(e) => setBlind(e.currentTarget.checked)} />
            <span>{tr('blindMode')}</span>
          </label>
        </div>
        <div class="rl-filters__row rl-filters__summary">
          <span class="rl-muted tabular" role="status" aria-live="polite">
            {tr('countShown', { n: shown.length, total: cases.length })}
          </span>
          {isFiltered(f) && (
            <Button size="sm" tone="ghost" icon="close" onClick={() => (filter.value = NO_FILTER)}>
              {tr('clearFilters')}
            </Button>
          )}
        </div>
      </section>

      {shown.length === 0 ? (
        <p class="rl-empty">{tr('noResults')}</p>
      ) : (
        <ul class="rl-grid" aria-label={tr('caseList')}>
          {shown.map((c) => (
            <li key={c.id}>
              <CaseCard c={c} blind={isBlind} read={read.has(c.id)} />
            </li>
          ))}
        </ul>
      )}

      <AttributionFooter />
    </div>
  );
}

function CaseCard(props: { readonly c: RealCase; readonly blind: boolean; readonly read: boolean }) {
  const { c } = props;
  const who = patientLine(c);
  const n = caseNumber(c.num);
  const cls = SCP[c.cls];
  const dx = cls ? lt(cls.name) : c.cls;
  const badges = c.findings.filter((id) => id !== 'sinus-rhythm').slice(0, 3);
  // the label replaces the card's text for screen readers: with blind mode off it must carry the diagnosis too
  const label = props.blind ? tr('openCase', { n, who }) : tr('openCaseDx', { n, who, dx: [dx, ...badges.map((id) => lt(FINDINGS[id].name))].join(', ') });
  return (
    <a class={`rl-card ${props.read ? 'is-read' : ''}`} href={href({ name: 'case', id: c.id })} aria-label={label}>
      <span class="rl-card__top">
        <span class="rl-card__num tabular">{tr('caseNo', { n })}</span>
        {props.read && (
          <span class="rl-card__read" title={tr('readBadge')}>
            <Icon name="check" size={16} label={tr('readBadge')} />
          </span>
        )}
      </span>
      <span class="rl-card__who">{who}</span>
      {!props.blind && (
        <span class="rl-card__dx">
          <span class="rl-card__cls">{dx}</span>
          <span class="rl-card__badges">
            {badges.map((id) => (
              <Badge key={id} tone={FINDINGS[id].severity}>
                {lt(FINDINGS[id].name)}
              </Badge>
            ))}
          </span>
        </span>
      )}
    </a>
  );
}
