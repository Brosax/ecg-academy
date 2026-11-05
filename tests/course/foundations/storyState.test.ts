import { describe, expect, it } from 'vitest';
import { l } from '../../../src/core/l10n';
import { attemptStorySegment, initialStoryState, visitStorySegment } from '../../../src/course/foundations/storyState';
import { canContinue } from '../../../src/course/foundations/clock';

const explanation = l('解释', 'Explanation', 'Explicación');

describe('segment visits and experiment feedback', () => {
  it('keeps the unlock when returning, without showing feedback for a reset illustration', () => {
    let state = initialStoryState();
    state = attemptStorySegment(state, { correct: true, text: explanation });
    expect(state.feedback?.correct).toBe(true);
    state = visitStorySegment(state, 1);
    expect(state.feedback).toBeNull();
    expect(canContinue(0, !!state.attempts[state.step])).toBe(false);
    state = visitStorySegment(state, 0);
    expect(state.feedback).toBeNull();
    expect(canContinue(0, !!state.attempts[state.step])).toBe(true);
  });

  it('an incorrect retry has current feedback and keeps all prior unlocks', () => {
    let state = attemptStorySegment(initialStoryState(), { correct: true, text: explanation });
    state = visitStorySegment(state, 1);
    state = attemptStorySegment(state, { correct: false, text: explanation });
    expect(state.feedback?.correct).toBe(false);
    expect(state.attempts[0]).toBe(true);
    expect(state.attempts[1]).toBe(true);
    expect(canContinue(.5, !!state.attempts[state.step])).toBe(true);
    state = visitStorySegment(state, 0);
    state = attemptStorySegment(state, { correct: false, text: explanation });
    expect(state.feedback?.correct).toBe(false);
    expect(state.attempts[1]).toBe(true);
  });
});
