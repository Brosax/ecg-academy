import type { L10n } from '../../core/l10n';
import type { Ecg } from '../../core/ecg';

/** A short, manually started explanation, followed by an attempt (never a pass/fail gate). */
export interface StoryStep {
  readonly id: string;
  readonly title: L10n;
  readonly narration: L10n;
  readonly task: L10n;
  readonly durationMs?: number;
}

export interface StorySceneProps {
  readonly step: number;
  readonly progress: number;
  readonly attempted: boolean;
  readonly ecg?: Ecg;
  /** An attempt unlocks the next explanation even when it is incorrect. */
  readonly onAttempt: (correct: boolean, explanation: L10n) => void;
  /** Pause before manipulating the illustration. */
  readonly onManipulate: () => void;
}

export const smooth = (p: number, from = 0, to = 1): number => {
  const x = Math.max(0, Math.min(1, (p - from) / (to - from)));
  return x * x * (3 - 2 * x);
};
