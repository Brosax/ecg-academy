/**
 * #/learn — the course map: eight stages (docs/PLAN.md §3) with every lesson. Ready lessons link to the player and
 * show the learner's progress; planned lessons stay visible, marked "coming soon", so the whole path is always clear.
 * Stage jumps scroll in place (buttons, never `#…` anchors — the hash belongs to the router).
 */
import { href } from '../app/router';
import { lt } from '../i18n';
import { tc } from '../i18n/common';
import { tco } from '../i18n/course';
import { Badge, Icon, LinkButton, ProgressRing } from '../ui';
import type { StageDef } from './api';
import { getLessonProgress, progressTick } from './deps';
import { getLesson } from './lessons/index';
import { STAGE_DEFS } from './model';
import { countDone, lessonCode, lessonFraction, lessonState, nextLessonToContinue } from './stages';

const stageAnchor = (id: string) => `crs-stage-${id}`;

/** Jump to a stage: instant scroll (no animation) and focus its heading for keyboard and screen-reader users. */
function scrollToStage(id: string): void {
  const el = globalThis.document?.getElementById(stageAnchor(id));
  if (!el) return;
  el.scrollIntoView({ block: 'start' });
  el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

export function LearnPage() {
  void progressTick();
  const stages = STAGE_DEFS;
  const counts = countDone(stages, getLessonProgress);
  const next = nextLessonToContinue(stages, getLessonProgress);
  const nextLesson = next ? getLesson(next) : undefined;
  const nextStarted = next ? lessonState(getLessonProgress(next)) === 'started' : false;
  const overall = counts.ready ? counts.done / counts.ready : 0;
  return (
    <div class="app-page crs-page crs-map">
      <header class="app-pagehead crs-maphead">
        <div class="crs-maphead__text">
          <h1>{tc('navLearn')}</h1>
          <p>{tco('mapLead')}</p>
        </div>
        <div class="crs-mapstats">
          <ProgressRing value={overall} size={48} label={tco('mapDone', { done: counts.done, ready: counts.ready })} />
          <div class="crs-mapstats__text">
            <span class="tabular">{counts.ready > 0 ? tco('mapDone', { done: counts.done, ready: counts.ready }) : tco('mapNoneReady')}</span>
            {counts.planned > 0 && counts.ready > 0 && <span class="app-muted tabular">{tco('mapPlanned', { n: counts.planned })}</span>}
          </div>
          {next && nextLesson && (
            <LinkButton tone="primary" href={href({ name: 'lesson', id: next })} icon="book">
              {tco(nextStarted ? 'mapContinue' : 'mapStart', { code: lessonCode(next), title: lt(nextLesson.title) })}
            </LinkButton>
          )}
        </div>
      </header>

      <nav class="crs-jump" aria-label={tco('mapJump')}>
        {stages.map((s, k) => (
          <button type="button" class="crs-jump__btn" key={s.id} onClick={() => scrollToStage(s.id)} title={`${tco('stageN', { n: k + 1 })} · ${lt(s.title)}`}>
            <span class="crs-jump__badge" aria-hidden="true">
              {s.id}
            </span>
            <span class="crs-jump__name">{lt(s.title)}</span>
          </button>
        ))}
      </nav>

      <ol class="crs-stages">
        {stages.map((s, k) => (
          <StageSection key={s.id} stage={s} n={k + 1} />
        ))}
      </ol>
    </div>
  );
}

function StageSection(props: { readonly stage: StageDef; readonly n: number }) {
  const s = props.stage;
  const ready = s.lessons.filter((x) => x.status === 'ready');
  const done = ready.filter((x) => getLessonProgress(x.id)?.done).length;
  const hId = `${stageAnchor(s.id)}-h`;
  return (
    <li class="crs-stage" id={stageAnchor(s.id)} aria-labelledby={hId}>
      <div class="crs-stage__head">
        <span class="crs-stage__badge" aria-hidden="true">
          {s.id}
        </span>
        <div class="crs-stage__titles">
          <p class="crs-stage__n">{tco('stageN', { n: props.n })}</p>
          <h2 class="crs-stage__title" id={hId} tabIndex={-1}>
            {lt(s.title)}
          </h2>
          <p class="crs-stage__goal">{lt(s.goal)}</p>
        </div>
        <span class="crs-stage__progress tabular">{ready.length ? tco('stageProgress', { done, ready: ready.length }) : tco('stageNoneReady')}</span>
      </div>
      <ol class="crs-lessons">
        {s.lessons.map((x) => (
          <li key={x.id}>{x.status === 'ready' ? <ReadyLesson id={x.id} /> : <PlannedLessonCard id={x.id} title={lt(x.title)} />}</li>
        ))}
      </ol>
    </li>
  );
}

function ReadyLesson(props: { readonly id: string }) {
  const lesson = getLesson(props.id);
  if (!lesson) return null;
  const p = getLessonProgress(props.id);
  const state = lessonState(p);
  const frac = lessonFraction(p, lesson.blocks.length);
  const code = lessonCode(props.id);
  return (
    <a class={`crs-lcard crs-lcard--${state}`} href={href({ name: 'lesson', id: props.id })}>
      <span class="crs-lcard__top">
        <span class="crs-lcard__code">{code}</span>
        <span class="crs-lcard__ring">
          {state === 'done' ? (
            <span class="crs-lcard__done" aria-hidden="true">
              <Icon name="check" size={18} />
            </span>
          ) : (
            <ProgressRing value={frac} size={28} label={tco('lessonProgressAria', { code, pct: Math.round(frac * 100) })} />
          )}
        </span>
      </span>
      <span class="crs-lcard__title">{lt(lesson.title)}</span>
      <span class="crs-lcard__meta">
        <span class="tabular">{tco('minutesApprox', { n: lesson.minutes })}</span>
        <span class={`crs-state crs-state--${state}`}>{tco(state === 'done' ? 'stateDone' : state === 'started' ? 'stateStarted' : 'stateNew')}</span>
      </span>
    </a>
  );
}

function PlannedLessonCard(props: { readonly id: string; readonly title: string }) {
  return (
    <div class="crs-lcard crs-lcard--planned" aria-disabled="true">
      <span class="crs-lcard__top">
        <span class="crs-lcard__code">{lessonCode(props.id)}</span>
        <Badge tone="neutral">{tco('comingSoon')}</Badge>
      </span>
      <span class="crs-lcard__title">{props.title}</span>
    </div>
  );
}
