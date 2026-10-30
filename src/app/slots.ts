/**
 * SLOTS — places in the shell that later modules fill. The shell renders a sensible default until a component (or a
 * value) is plugged in. Wire them in src/main.tsx, e.g.
 *
 *   import { ContinueLessonCard } from './course';
 *   homeSlots.continueLesson.value = ContinueLessonCard;
 *
 * so no feature module has to import shell internals. Home slots: the shell draws the card frame (border, padding,
 * fixed minimum height); the plugged-in component renders content only (an h3 title, text, one action link).
 */
import { signal } from '@preact/signals';
import type { ComponentType } from 'preact';

export const homeSlots = {
  /** "continue lesson" card on the home page (src/course: the learner's next lesson) */
  continueLesson: signal<ComponentType | null>(null),
  /** "reviews due today" card (src/practice: spaced-repetition queue) */
  reviewsDue: signal<ComponentType | null>(null),
  /** "real case of the day" card (src/real: a deterministic pick per calendar day) */
  caseOfDay: signal<ComponentType | null>(null),
  /** live ECG in the home hero (src/ecg + src/synth: a normal 12-lead); the paper explainer is shown until then */
  heroEcg: signal<ComponentType | null>(null),
};

/** Overall mastery 0..1 for the header progress ring (src/practice); null = no data yet (an icon is shown). */
export const overallProgress = signal<number | null>(null);

/** Progress data controls on the settings page (src/practice: export / import / reset). */
export const progressDataSlot = signal<ComponentType | null>(null);
