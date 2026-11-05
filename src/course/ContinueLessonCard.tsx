/**
 * Home slot "continue lesson" (src/app/slots.ts → homeSlots.continueLesson): the learner's next lesson — the most
 * recently touched unfinished one, else the first ready lesson not done. Content only (h3, text, one link); the shell
 * draws the card frame.
 */
import { href } from '../app/router';
import { l } from '../core/l10n';
import { lt } from '../i18n';
import { tco } from '../i18n/course';
import { Icon } from '../ui';
import { getLessonProgress, progressTick } from './deps';
import { getLesson } from './lessons/index';
import { STAGE_DEFS } from './model';
import { lessonCode, lessonState, nextLessonToContinue, readyOrder, resumeStep } from './stages';
import { foundationChapters, foundationEntryStep, presentationProgress } from './foundations/presentation';

export function ContinueLessonCard() {
  void progressTick();
  const id = nextLessonToContinue(STAGE_DEFS, getLessonProgress);
  const lesson = id ? getLesson(id) : undefined;
  const anyReady = readyOrder(STAGE_DEFS).length > 0;

  let text: string;
  let action: { readonly href: string; readonly label: string };
  let frac: number | null = null;
  if (id && lesson) {
    const p = getLessonProgress(id);
    const n = lesson.blocks.length;
    const started = lessonState(p) === 'started';
    const step = foundationEntryStep(lesson, undefined, resumeStep(p, n));
    const code = lessonCode(id);
    const presentation = presentationProgress(lesson, p);
    text = started ? tco('contResume', { code, title: lt(lesson.title), i: presentation.index + 1, n: presentation.total }) : tco('contStart', { code, title: lt(lesson.title) });
    const chapter = foundationChapters(lesson)[presentation.index];
    if (started && chapter) text = `${code} · ${lt(lesson.title)} · ${lt(chapter.title)} (${lt(l('章节', 'Chapter', 'Capítulo'))} ${presentation.index + 1}/${presentation.total})`;
    action = { href: href({ name: 'lesson', id, step: started ? step : undefined }), label: started ? tco('contActionResume') : tco('contActionStart') };
    frac = presentation.fraction;
  } else {
    text = anyReady ? tco('contAllDone') : tco('contNoLessons');
    action = { href: href({ name: 'practice' }), label: tco('contActionPractice') };
  }

  return (
    <article class="crs-cont">
      <h3 class="crs-cont__title">
        <Icon name="book" />
        {tco('contTitle')}
      </h3>
      <p class="crs-cont__text">{text}</p>
      {frac !== null && (
        <span class="crs-cont__bar" aria-hidden="true">
          <span class="crs-cont__fill" style={{ width: `${Math.round(frac * 100)}%` }} />
        </span>
      )}
      <a class="crs-cont__action" href={action.href}>
        {action.label}
        <Icon name="next" size={16} />
      </a>
    </article>
  );
}
