/**
 * #/learn/:lessonId[/:step] — the lesson player. One block at a time (docs/PLAN.md §4), a step rail with deep links,
 * Back / Next (and ← → keys), progress written through the practice store (furthest step reached, done on finish),
 * previous / next lesson, estimated minutes, objectives and sources. A planned lesson shows "coming soon"; an unknown
 * id a not-found page — both with an h1 for the shell's focus management.
 *
 * The router's page key ignores the step, so step changes do not remount the page or move focus: the player keeps
 * focus on the control that changed the step (Next, a rail link) and only rescues focus that was inside the old block,
 * announces the new step, and scrolls back up when the step's top is out of view.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { go, href } from '../app/router';
import { FINDINGS, type FindingId } from '../core/findings';
import { lt } from '../i18n';
import { tc } from '../i18n/common';
import { tco } from '../i18n/course';
import { Badge, Button, Disclosure, Feedback, Icon, LinkButton } from '../ui';
import type { Lesson, StageDef } from './api';
import { blockKindLabel, blockLabel, BlockView } from './blocks';
import { plannedLesson } from './catalogue';
import { labLinks } from './lab';
import { getLessonProgress, progressTick, setLessonProgress } from './deps';
import { getLesson } from './lessons/index';
import { STAGE_DEFS } from './model';
import {
  clampStep,
  lessonCode,
  lessonNeighbours,
  nextLessonToContinue,
  progressAfterFinish,
  progressAfterVisit,
  resumeStep,
  stageOfLesson,
} from './stages';

export function LessonPage(props: { readonly id: string; readonly step?: number }) {
  const lesson = getLesson(props.id);
  if (lesson) return <LessonPlayer key={lesson.id} lesson={lesson} step={props.step} />;
  const planned = plannedLesson(props.id);
  if (planned) return <PlannedLesson id={planned.id} />;
  return <LessonNotFound id={props.id} />;
}

function BackLink() {
  return (
    <a class="crs-back" href={href({ name: 'learn' })}>
      <Icon name="prev" size={16} />
      {tco('backToCourse')}
    </a>
  );
}

function stageLine(stages: readonly StageDef[], id: string): string | null {
  const w = stageOfLesson(stages, id);
  return w ? tco('stageLine', { n: w.n, title: lt(w.stage.title) }) : null;
}

function LessonNotFound(props: { readonly id: string }) {
  return (
    <div class="app-page crs-page">
      <BackLink />
      <header class="app-pagehead">
        <h1>{tco('lessonNotFound')}</h1>
        <p>{tco('lessonNotFoundBody', { id: props.id })}</p>
      </header>
      <LinkButton href={href({ name: 'learn' })} icon="list">
        {tc('navLearn')}
      </LinkButton>
    </div>
  );
}

function PlannedLesson(props: { readonly id: string }) {
  const stages = STAGE_DEFS;
  const w = stageOfLesson(stages, props.id);
  const title = w ? lt(w.stage.lessons[w.index].title) : props.id;
  const next = nextLessonToContinue(stages, getLessonProgress);
  void progressTick();
  return (
    <div class="app-page crs-page">
      <BackLink />
      <header class="app-pagehead crs-lessonhead">
        {w && <p class="crs-kicker">{stageLine(stages, props.id)}</p>}
        <h1>
          <span class="crs-code">{lessonCode(props.id)}</span> {title}
        </h1>
        <p>
          <Badge tone="neutral">{tco('comingSoon')}</Badge>
        </p>
      </header>
      <div class="crs-empty">
        <Icon name="book" size={22} />
        <p>{tco('plannedTitle')}</p>
        <p class="app-muted">{tco('plannedBody', { code: lessonCode(props.id), title, n: w?.n ?? 1 })}</p>
      </div>
      <div class="crs-row">
        {next && (
          <LinkButton tone="primary" href={href({ name: 'lesson', id: next })} icon="book">
            {lessonCode(next)}
          </LinkButton>
        )}
        <LinkButton href={href({ name: 'learn' })} icon="list">
          {tc('navLearn')}
        </LinkButton>
        <LinkButton href={href({ name: 'practice' })} icon="target">
          {tco('goPractice')}
        </LinkButton>
      </div>
    </div>
  );
}

/** "See it in the Heart Lab": the lesson's findings the lab can show, as links (src/course/lab.ts). */
function LabLinks(props: { readonly findings: readonly FindingId[] }) {
  const links = labLinks(props.findings);
  if (links.length === 0) return null;
  return (
    <section class="crs-lab" aria-labelledby="crs-lab-h">
      <h2 class="crs-lab__title" id="crs-lab-h">
        <Icon name="heart" size={18} />
        {tco('labTitle')}
      </h2>
      <p class="crs-hint">{tco('labLead')}</p>
      <ul class="crs-chips">
        {links.map((x) => (
          <li key={x.href}>
            <a class="crs-lab__link" href={x.href}>
              {lt(FINDINGS[x.finding].name)}
              <Icon name="next" size={14} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Keys pressed here belong to the control, not to step navigation. */
const OWN_KEYS =
  'input, textarea, select, button[role="radio"], [contenteditable=""], [contenteditable="true"], [role="application"], [role="slider"], [role="radiogroup"], [role="tablist"], [role="listbox"], [role="menu"], [role="grid"]';

function ownsArrowKeys(t: EventTarget | null): boolean {
  return t instanceof Element && t.closest(OWN_KEYS) !== null;
}

/**
 * The player for one lesson object (LessonPage resolves the id; the dev harness plays the test fixture through it).
 * `step` is the 1-based step from the URL (undefined = resume where the learner left off).
 */
export function LessonPlayer(props: { readonly lesson: Lesson; readonly step?: number }) {
  const { lesson } = props;
  const n = lesson.blocks.length;
  void progressTick();
  const saved = getLessonProgress(lesson.id);
  // where to land without a step in the URL is decided once (progress writes must not move the learner)
  const [resume] = useState(() => resumeStep(getLessonProgress(lesson.id), n));
  const current = props.step === undefined ? resume : clampStep(props.step, null, n);
  const block = lesson.blocks[current - 1];
  const [finished, setFinished] = useState(false);
  const stages = STAGE_DEFS;
  const nb = lessonNeighbours(stages, lesson.id);
  const kicker = stageLine(stages, lesson.id);

  const topRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const railRef = useRef<HTMLOListElement>(null);

  const goStep = (k: number) => {
    const s = Math.max(1, Math.min(n, k));
    if (s !== current) go({ name: 'lesson', id: lesson.id, step: s });
  };
  const finish = () => {
    setLessonProgress(lesson.id, progressAfterFinish(n, Date.now()));
    setFinished(true);
  };

  // an out-of-range deep link is corrected in place
  useEffect(() => {
    if (props.step !== undefined && props.step !== current) go({ name: 'lesson', id: lesson.id, step: current }, true);
  }, [props.step, current]);

  // record the visit (furthest step reached)
  useEffect(() => {
    setLessonProgress(lesson.id, progressAfterVisit(getLessonProgress(lesson.id), current, Date.now()));
    if (current < n) setFinished(false);
  }, [lesson.id, current]);

  // step change: announce, rescue lost focus, bring the step back into view, keep the rail chip visible
  const first = useRef(true);
  useEffect(() => {
    railRef.current?.querySelector<HTMLElement>('[aria-current="step"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (first.current) {
      first.current = false;
      return;
    }
    const live = liveRef.current;
    if (live) live.textContent = tco('stepAnnounce', { i: current, n, label: blockLabel(block) });
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) headingRef.current?.focus({ preventScroll: true });
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
  }, [current]);

  // ← → between steps (not while a control that owns the arrow keys has focus)
  const nav = useRef({ current, n });
  nav.current = { current, n };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (ownsArrowKeys(e.target) || document.querySelector('dialog[open]')) return;
      const { current: c, n: total } = nav.current;
      const k = e.key === 'ArrowRight' ? c + 1 : c - 1;
      if (k < 1 || k > total) return;
      e.preventDefault();
      go({ name: 'lesson', id: lesson.id, step: k });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lesson.id]);

  const done = saved?.done ?? false;
  const furthest = Math.max(saved?.step ?? 0, current);
  const atEnd = current === n;

  return (
    <div class="app-page crs-page crs-lesson">
      <BackLink />
      <header class="app-pagehead crs-lessonhead">
        {kicker && <p class="crs-kicker">{kicker}</p>}
        <h1>
          <span class="crs-code">{lessonCode(lesson.id)}</span> {lt(lesson.title)}
        </h1>
        <p class="crs-lessonhead__meta">
          <span class="tabular">
            <Icon name="clock" size={16} />
            {tco('minutesApprox', { n: lesson.minutes })}
          </span>
          {done && <Badge tone="ok">{tco('lessonDoneBadge')}</Badge>}
        </p>
        <p>{lt(lesson.summary)}</p>
        {lesson.objectives.length > 0 && (
          <Disclosure summary={tco('objectives')}>
            <ul class="crs-objectives">
              {lesson.objectives.map((o, i) => (
                <li key={i}>{lt(o)}</li>
              ))}
            </ul>
          </Disclosure>
        )}
      </header>

      <div class="crs-player" ref={topRef}>
        <nav class="crs-railwrap" aria-label={tco('stepsAria')}>
          <ol class="crs-rail" ref={railRef}>
            {lesson.blocks.map((b, i) => {
              const k = i + 1;
              const label = tco('stepChip', { i: k, kind: blockKindLabel(b.kind) });
              return (
                <li key={k}>
                  <a
                    class={`crs-chip crs-chip--${b.kind}${k === current ? ' is-on' : ''}${k <= furthest ? ' is-seen' : ''}`}
                    href={href({ name: 'lesson', id: lesson.id, step: k })}
                    aria-current={k === current ? 'step' : undefined}
                    aria-label={label}
                    title={label}
                  >
                    <span class="tabular">{k}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <section class={`crs-block crs-block--${block.kind}`} aria-labelledby="crs-step-h">
          <p class="crs-block__count tabular">{tco('stepOf', { i: current, n })}</p>
          <h2 id="crs-step-h" class="crs-block__h" tabIndex={-1} ref={headingRef}>
            {blockLabel(block)}
          </h2>
          <div class="crs-block__body" key={current}>
            <BlockView block={block} lesson={lesson} index={current - 1} />
          </div>
        </section>

        <p class="crs-sr" aria-live="polite" ref={liveRef} />

        <div class="crs-stepnav">
          <Button icon="prev" class={current === 1 ? 'crs-invisible' : ''} aria-hidden={current === 1} tabIndex={current === 1 ? -1 : undefined} onClick={() => goStep(current - 1)}>
            {tc('back')}
          </Button>
          <span class="crs-hint crs-stepnav__keys">{tco('keysHint')}</span>
          {atEnd ? (
            <Button tone="primary" icon="check" onClick={finish}>
              {tco('finishLesson')}
            </Button>
          ) : (
            <Button tone="primary" onClick={() => goStep(current + 1)}>
              {tc('next')}
              <Icon name="next" size={16} />
            </Button>
          )}
        </div>

        {finished && atEnd && (
          <div class="crs-complete">
            <Feedback tone="ok" title={tco('lessonComplete')}>
              {tco('lessonCompleteBody')}
            </Feedback>
            <div class="crs-row">
              {nb.next && (
                <LinkButton tone="primary" href={href({ name: 'lesson', id: nb.next })} icon="book">
                  {`${tco('nextLesson')}: ${lessonCode(nb.next)}`}
                </LinkButton>
              )}
              <LinkButton href={href({ name: 'practice' })} icon="target">
                {tco('goPractice')}
              </LinkButton>
              <LinkButton href={href({ name: 'learn' })} icon="list">
                {tc('navLearn')}
              </LinkButton>
            </div>
          </div>
        )}
      </div>

      <footer class="crs-lessonfoot">
        <nav class="crs-lessonnav" aria-label={tco('lessonNavAria')}>
          {nb.prev ? (
            <a class="crs-lessonnav__link" href={href({ name: 'lesson', id: nb.prev })} rel="prev">
              <Icon name="prev" size={16} />
              <span>
                <span class="crs-lessonnav__dir">{tco('prevLesson')}</span>
                <span class="crs-lessonnav__name">
                  {lessonCode(nb.prev)} · {lt(getLesson(nb.prev)?.title ?? { zh: nb.prev, en: nb.prev, es: nb.prev })}
                </span>
              </span>
            </a>
          ) : (
            <span />
          )}
          {nb.next ? (
            <a class="crs-lessonnav__link crs-lessonnav__link--next" href={href({ name: 'lesson', id: nb.next })} rel="next">
              <span>
                <span class="crs-lessonnav__dir">{tco('nextLesson')}</span>
                <span class="crs-lessonnav__name">
                  {lessonCode(nb.next)} · {lt(getLesson(nb.next)?.title ?? { zh: nb.next, en: nb.next, es: nb.next })}
                </span>
              </span>
              <Icon name="next" size={16} />
            </a>
          ) : (
            <span />
          )}
        </nav>
        <LabLinks findings={lesson.findings} />
        {lesson.sources.length > 0 && (
          <Disclosure summary={tco('sources')}>
            <ul class="crs-sources">
              {lesson.sources.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Disclosure>
        )}
      </footer>
    </div>
  );
}
