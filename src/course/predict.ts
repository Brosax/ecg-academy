/**
 * Order of a prediction's options on screen. Authors write the answer wherever is natural (often first); unless the
 * options form a scale (`ordered`), the player shows them in a fixed order seeded by the English question, so every
 * language and every visit sees the same order and the answer's position gives nothing away. Pure; tested in
 * tests/course/predict.test.ts.
 */
import { createRng } from '../core/rng';
import type { Prediction } from './api';

/** indices into `p.options`, in display order */
export function optionOrder(p: Prediction): number[] {
  const ids = p.options.map((_o, i) => i);
  return p.ordered ? ids : createRng(`predict:${p.question.en}`).shuffle(ids);
}
