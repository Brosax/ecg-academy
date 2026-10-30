/**
 * #/practice — the drill hub: adaptive mix, spaced review and exam up top; then every family by stage (the learning
 * path) or by competency (with its mastery against the target).
 */
import { useState } from 'preact/hooks';
import { href } from '../../app/router';
import { tc } from '../../i18n/common';
import { lt } from '../../i18n/index';
import { tp } from '../../i18n/practice';
import { Badge, Icon, Tabs } from '../../ui/index';
import { COMPETENCIES, STAGES, type CompetencyId, type Mastery, type StageId } from '../api';
import { familiesFor, familiesInStage, familyAvailable } from '../core/families';
import type { FamilySpec } from '../core/gen/common';
import { MASTERY_TARGET } from '../core/mastery';
import { dueReviews, masteryOf, masteryOfFamily, progressVersion } from '../core/progress';

const TAB_KEY = 'ecg-academy:practice:hubTab:v1';

function loadTab(): 'stage' | 'competency' {
  try {
    return globalThis.localStorage?.getItem(TAB_KEY) === 'competency' ? 'competency' : 'stage';
  } catch {
    return 'stage';
  }
}

function saveTab(t: 'stage' | 'competency'): void {
  try {
    globalThis.localStorage?.setItem(TAB_KEY, t);
  } catch {
    /* session only */
  }
}

export const stageName = (s: StageId): string => tp(`stage${s}` as Parameters<typeof tp>[0]);
export const compName = (c: CompetencyId): string => tp(c);

export function MasteryBar(props: { readonly m: Mastery; readonly target?: number; readonly label: string }) {
  const acc = props.m.accuracy;
  const pct = acc === null ? 0 : Math.round(acc * 100);
  return (
    <div class="pr-mbar" role="meter" aria-label={props.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <span class="pr-mbar__track">
        <span class="pr-mbar__fill" style={{ width: `${pct}%` }} />
        {props.target !== undefined && <span class="pr-mbar__target" style={{ left: `${Math.round(props.target * 100)}%` }} />}
      </span>
      <span class="pr-mbar__txt tabular">{acc === null ? tp('notStarted') : `${pct} % · ${tp('attempts', { n: props.m.attempts })}`}</span>
    </div>
  );
}

function FamilyCard(props: { readonly spec: FamilySpec }) {
  const s = props.spec;
  const m = masteryOfFamily(s.id);
  if (!familyAvailable(s)) {
    // the drill stays visible on the learning path, but is not offered until the catalogue can produce it
    return (
      <div class="pr-fam is-unavailable" role="group" aria-label={`${lt(s.title)} — ${tp('drillSoon')}`} aria-disabled="true">
        <span class="pr-fam__top">
          <Badge tone="neutral">{s.competency}</Badge>
          {s.source === 'real' && <Badge tone="info">{tp('realLabel')}</Badge>}
        </span>
        <span class="pr-fam__title">{lt(s.title)}</span>
        <span class="pr-fam__desc">{lt(s.description)}</span>
        <span class="pr-fam__soon">{tp('drillSoon')}</span>
      </div>
    );
  }
  return (
    <a class="pr-fam" href={href({ name: 'drill', id: s.id })}>
      <span class="pr-fam__top">
        <Badge tone="neutral">{s.competency}</Badge>
        {s.source === 'real' && <Badge tone="info">{tp('realLabel')}</Badge>}
      </span>
      <span class="pr-fam__title">{lt(s.title)}</span>
      <span class="pr-fam__desc">{lt(s.description)}</span>
      <MasteryBar m={m} label={`${tp('mastery')} — ${lt(s.title)}`} />
    </a>
  );
}

export function PracticePage() {
  void progressVersion.value;
  const [tab, setTab] = useState<'stage' | 'competency'>(loadTab);
  const due = dueReviews(Date.now()).length;
  return (
    <div class="app-page pr-page">
      <header class="app-pagehead">
        <h1>{tc('navPractice')}</h1>
        <p>{tp('practiceLead')}</p>
      </header>

      <div class="pr-tiles">
        <a class="pr-tile pr-tile--main" href={href({ name: 'drill', id: 'mixed' })}>
          <Icon name="bolt" size={22} />
          <span class="pr-tile__title">{tp('mixTitle')}</span>
          <span class="pr-tile__text">{tp('mixText')}</span>
        </a>
        <a class="pr-tile" href={href({ name: 'drill', id: 'review' })}>
          <Icon name="refresh" size={22} />
          <span class="pr-tile__title">{tp('reviewTitle')}</span>
          <span class="pr-tile__text tabular">{due > 0 ? tp('reviewDue', { n: due }) : tp('reviewNone')}</span>
        </a>
        <a class="pr-tile" href={href({ name: 'exam' })}>
          <Icon name="clock" size={22} />
          <span class="pr-tile__title">{tc('navExam')}</span>
          <span class="pr-tile__text">{tp('examTile')}</span>
        </a>
      </div>

      <Tabs<'stage' | 'competency'>
        ariaLabel={tc('navPractice')}
        value={tab}
        tabs={[
          { id: 'stage', label: tp('byStage') },
          { id: 'competency', label: tp('byCompetency') },
        ]}
        onChange={(t) => {
          setTab(t);
          saveTab(t);
        }}
      />

      {tab === 'stage'
        ? STAGES.map((st) => {
            const fams = familiesInStage(st);
            if (fams.length === 0) return null;
            return (
              <section class="pr-group" key={st} aria-labelledby={`pr-st-${st}`}>
                <h2 id={`pr-st-${st}`} class="pr-group__title">
                  <span class="pr-stage-badge" aria-hidden="true">
                    {st}
                  </span>
                  {stageName(st)}
                </h2>
                <div class="pr-grid">
                  {fams.map((s) => (
                    <FamilyCard key={s.id} spec={s} />
                  ))}
                </div>
              </section>
            );
          })
        : COMPETENCIES.map((c) => (
            <section class="pr-group" key={c} aria-labelledby={`pr-c-${c}`}>
              <div class="pr-group__head">
                <h2 id={`pr-c-${c}`} class="pr-group__title">
                  <span class="pr-stage-badge" aria-hidden="true">
                    {c}
                  </span>
                  {compName(c)}
                </h2>
                <MasteryBar m={masteryOf(c)} target={MASTERY_TARGET[c]} label={`${tp('mastery')} — ${compName(c)}`} />
              </div>
              <div class="pr-grid">
                {familiesFor(c).map((s) => (
                  <FamilyCard key={s.id} spec={s} />
                ))}
              </div>
            </section>
          ))}
      <p class="app-muted pr-foot">{tp('sourceLine')}</p>
    </div>
  );
}
