import type { L10n } from '../../core/l10n';

export interface StoryFeedback {
  readonly correct: boolean;
  readonly text: L10n;
}

export interface StoryState {
  readonly step: number;
  /** Unlocks survive revisiting a segment; its reset illustration does not retain old feedback. */
  readonly attempts: Readonly<Record<number, true>>;
  readonly feedback: StoryFeedback | null;
}

export const initialStoryState = (): StoryState => ({ step: 0, attempts: {}, feedback: null });

export function visitStorySegment(state: StoryState, step: number): StoryState {
  return { ...state, step, feedback: null };
}

export function attemptStorySegment(state: StoryState, feedback: StoryFeedback): StoryState {
  return { ...state, attempts: { ...state.attempts, [state.step]: true }, feedback };
}
