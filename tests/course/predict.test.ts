import { describe, expect, it } from 'vitest';
import type { Prediction } from '../../src/course/api';
import { LESSONS } from '../../src/course/lessons/index';
import { optionOrder } from '../../src/course/predict';

const l = (en: string) => ({ zh: en, en, es: en });
const q = (question: string, n: number, ordered?: boolean): Prediction => ({
  question: l(question),
  options: Array.from({ length: n }, (_x, i) => l(`option ${i}`)),
  answer: 0,
  ...(ordered ? { ordered } : {}),
});

const predictions: Prediction[] = [...LESSONS.values()].flatMap((les) =>
  les.blocks.flatMap((b) => ((b.kind === 'live' || b.kind === 'film') && b.predict ? [b.predict] : [])),
);

describe('optionOrder', () => {
  it('shows a scale as written', () => {
    expect(optionOrder(q('How many large squares?', 4, true))).toEqual([0, 1, 2, 3]);
  });

  it('shows every option exactly once, the same way every time', () => {
    const p = q('What happens to the PR?', 4);
    const order = optionOrder(p);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(optionOrder(p)).toEqual(order);
  });

  it('keeps one order across languages (seeded by the English question)', () => {
    const p = q('What happens to the QRS?', 3);
    expect(optionOrder({ ...p, question: { ...p.question, zh: '会怎样？', es: '¿Qué pasa?' } })).toEqual(optionOrder(p));
  });

  it('across the course, the answer is not usually the first chip', () => {
    const shuffled = predictions.filter((p) => !p.ordered);
    const first = shuffled.filter((p) => optionOrder(p)[0] === p.answer).length;
    expect(shuffled.length).toBeGreaterThan(20);
    expect(first / shuffled.length).toBeLessThanOrEqual(0.5);
  });
});
