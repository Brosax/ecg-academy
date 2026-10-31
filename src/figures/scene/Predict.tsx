/**
 * "Commit before reveal" (spec §2.7): a question with option chips; Reveal is enabled once an option is picked and
 * the tour is not playing (a tour in progress is never interrupted). The scene decides what the reveal animates
 * (usually a state change followed by playBeat) and shows the feedback in the narration box (narrationOverride).
 * Guesses are scene-local (no persistence).
 */
import { useState } from 'preact/hooks';
import { tsn } from './strings';

export type PredictPhase = 'ask' | 'picked' | 'revealed';

export interface PredictOption<K extends string = string> {
  readonly id: K;
  readonly label: string;
}

export function Predict<K extends string>(props: {
  readonly question: string;
  readonly options: readonly PredictOption<K>[];
  readonly correct: K | readonly K[];
  /** the tour is playing: Reveal stays disabled */
  readonly playing: boolean;
  /** called once per reveal with the pick and whether it was right; the scene animates and sets the feedback */
  readonly onReveal: (pick: K, ok: boolean) => void;
  /** called when the learner starts over (feedback cleared by the scene) */
  readonly onReset?: () => void;
}) {
  const [pick, setPick] = useState<K | null>(null);
  const [phase, setPhase] = useState<PredictPhase>('ask');
  const correct = (k: K) => (Array.isArray(props.correct) ? (props.correct as readonly K[]).includes(k) : props.correct === k);
  return (
    <div class="sc-predict" role="group" aria-label={tsn('scPredict')}>
      <span class="sc-predict__q">{props.question}</span>
      <span class="sc-predict__opts">
        {props.options.map((o) => {
          const tone = phase === 'revealed' ? (correct(o.id) ? 'is-ok' : o.id === pick ? 'is-err' : '') : o.id === pick ? 'is-picked' : '';
          return (
            <button type="button" class={`sc-chip sc-chip--opt ${tone}`} aria-pressed={o.id === pick} disabled={phase === 'revealed'} onClick={() => {
              setPick(o.id);
              setPhase('picked');
            }}>
              {o.label}
            </button>
          );
        })}
      </span>
      {phase === 'revealed' ? (
        <button type="button" class="fg-btn" onClick={() => {
          setPick(null);
          setPhase('ask');
          props.onReset?.();
        }}>
          {tsn('scTryAgain')}
        </button>
      ) : (
        <button type="button" class="fg-btn" disabled={pick == null || props.playing} onClick={() => {
          if (pick == null) return;
          setPhase('revealed');
          props.onReveal(pick, correct(pick));
        }}>
          {tsn('scReveal')}
        </button>
      )}
    </div>
  );
}
