/**
 * Home: the promise, a live normal 12-lead in the hero (slot heroEcg, src/app/HeroEcg.tsx; the paper explainer until it
 * is plugged in), today's slots (continue lesson · reviews due · case of the day — src/course, src/practice, src/real
 * through src/app/slots.ts), the eight-stage learning path, and entry cards for Practice / Real cases / Atlas / Exam.
 */
import type { Signal } from '@preact/signals';
import type { ComponentType } from 'preact';
import { lt } from '../i18n';
import { tc } from '../i18n/common';
import { tsh } from '../i18n/shell';
import { Icon, LinkButton, type IconName } from '../ui';
import { STAGES } from './content';
import { PaperExplainer } from './PaperExplainer';
import { href } from './router';
import { SECTIONS } from './routes';
import { homeSlots } from './slots';
import './pages.css';

type ShellKey = Parameters<typeof tsh>[0];

const ENTRIES = [
  { id: 'practice', desc: 'entryPracticeDesc' },
  { id: 'cases', desc: 'entryCasesDesc' },
  { id: 'atlas', desc: 'entryAtlasDesc' },
  { id: 'exam', desc: 'entryExamDesc' },
] as const satisfies readonly { id: keyof typeof SECTIONS; desc: ShellKey }[];

export function HomePage() {
  const HeroEcg = homeSlots.heroEcg.value;
  return (
    <div class="app-page home">
      <section class="home-hero" aria-labelledby="home-title">
        <div class="home-hero__text">
          <p class="home-kicker">{tsh('homeKicker')}</p>
          <h1 id="home-title" class="home-title">
            {tsh('homeTitle')}
          </h1>
          <p class="home-lead">{tsh('homeLead')}</p>
          <div class="home-cta">
            <LinkButton href="#/learn" tone="primary" size="lg" icon="book">
              {tsh('homeStart')}
            </LinkButton>
            <LinkButton href="#/practice" size="lg" icon="target">
              {tsh('homeQuickDrill')}
            </LinkButton>
          </div>
        </div>
        {/* SLOT heroEcg: a live normal 12-lead from src/synth + src/ecg (HeroEcg) replaces the paper explainer */}
        <div class="home-hero__figure">{HeroEcg ? <HeroEcg /> : <PaperExplainer />}</div>
      </section>

      <section class="home-section" aria-labelledby="home-today">
        <h2 id="home-today" class="home-h2">
          {tsh('todayTitle')}
        </h2>
        <div class="home-today">
          <HomeSlot
            slot={homeSlots.continueLesson}
            name="continue-lesson"
            icon="book"
            title={tsh('slotContinueTitle')}
            text={tsh('slotContinueEmpty')}
            action={{ href: '#/learn', label: tsh('slotContinueAction') }}
          />
          <HomeSlot
            slot={homeSlots.reviewsDue}
            name="reviews-due"
            icon="refresh"
            title={tsh('slotReviewsTitle')}
            text={tsh('slotReviewsEmpty')}
            action={{ href: '#/practice', label: tsh('slotReviewsAction') }}
          />
          <HomeSlot
            slot={homeSlots.caseOfDay}
            name="case-of-the-day"
            icon="wave"
            title={tsh('slotCaseTitle')}
            text={tsh('slotCaseEmpty')}
            action={{ href: '#/cases', label: tsh('slotCaseAction') }}
          />
        </div>
      </section>

      <section class="home-section" aria-labelledby="home-path">
        <div class="home-section__head">
          <h2 id="home-path" class="home-h2">
            {tsh('pathTitle')}
          </h2>
          <p class="app-muted">{tsh('pathLead')}</p>
        </div>
        <ol class="home-path">
          {STAGES.map((s) => (
            <li>
              <a class="home-stage" href="#/learn">
                <span class="home-stage__top">
                  <span class="home-stage__badge" aria-hidden="true">
                    {s.id}
                  </span>
                  <span class="home-stage__meta">{tsh('stageLabel', { n: s.n })}</span>
                </span>
                <span class="home-stage__name">{lt(s.name)}</span>
                <span class="home-stage__desc">{lt(s.desc)}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section class="home-section" aria-labelledby="home-explore">
        <h2 id="home-explore" class="home-h2">
          {tsh('exploreTitle')}
        </h2>
        <ul class="home-entries">
          {ENTRIES.map((e) => {
            const s = SECTIONS[e.id];
            return (
              <li>
                <a class="home-entry" href={href(s.route)}>
                  <span class="home-entry__icon" aria-hidden="true">
                    <Icon name={s.icon} size={22} />
                  </span>
                  <span class="home-entry__title">
                    {tc(s.label)}
                    <Icon name="next" size={16} />
                  </span>
                  <span class="home-entry__desc">{tsh(e.desc)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** A home-page slot: the plugged-in module component, or a calm default card with a useful next step. */
function HomeSlot(props: {
  readonly slot: Signal<ComponentType | null>;
  readonly name: string;
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
  readonly action: { readonly href: string; readonly label: string };
}) {
  const Filled = props.slot.value;
  if (Filled) {
    return (
      <div class="home-slot" data-slot={props.name}>
        <Filled />
      </div>
    );
  }
  return (
    <article class="home-slot home-slot--default" data-slot={props.name}>
      <h3 class="home-slot__title">
        <Icon name={props.icon} />
        {props.title}
      </h3>
      <p class="home-slot__text">{props.text}</p>
      <a class="home-slot__action" href={props.action.href}>
        {props.action.label}
        <Icon name="next" size={16} />
      </a>
    </article>
  );
}
