/**
 * Home slot "continue lesson" (src/app/slots.ts → homeSlots.continueLesson): the learner's next lesson — the most
 * recently touched unfinished one, else the first ready lesson not done. Content only (h3, text, one link); the shell
 * draws the card frame.
 */
import { href } from '../app/router';
import { lt } from '../i18n';
import { tco } from '../i18n/course';
import { Icon } from '../ui';
import { getLessonProgress, progressTick } from './deps';
import { getLesson } from './lessons/index';
import { STAGE_DEFS } from './model';
import { lessonCode, lessonFraction, lessonState, nextLessonToContinue, readyOrder, resumeStep } from './stages';

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
    const step = resumeStep(p, n);
    const code = lessonCode(id);
    text = started ? tco('contResume', { code, title: lt(lesson.title), i: step, n }) : tco('contStart', { code, title: lt(lesson.title) });
    action = { href: href({ name: 'lesson', id, step: started ? step : undefined }), label: started ? tco('contActionResume') : tco('contActionStart') };
    frac = lessonFraction(p, n);
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
