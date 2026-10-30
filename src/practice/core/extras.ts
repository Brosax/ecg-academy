/**
 * Local, optional extensions of the frozen item contract (src/practice/api.ts), carried as extra runtime properties
 * on objects the practice generators create. Course inline items never have them; every reader falls back cleanly.
 * (Requested as contract additions — see the workstream report.)
 *
 *  - measure keys: `decoys` — plausible wrong measurements of THIS tracing (QT to the T peak, PR segment …) so the
 *    grader can say exactly which landmark the learner used;
 *  - item views: `speed`, `gain`, `toolbar` — the paper settings an item is shown at (calibration / speed items), and
 *    whether the viewer toolbar is offered (hidden when it would reveal the answer).
 */
import type { L10n } from '../../core/l10n';
import type { Item, ItemView } from '../api';

export interface MeasureDecoy {
  readonly ms: number;
  readonly feedback: L10n;
}

export interface ViewExtras {
  readonly speed?: 25 | 50;
  readonly gain?: 5 | 10 | 20;
  readonly toolbar?: boolean;
}

export type ItemViewX = ItemView & ViewExtras;

export function decoysOf(item: Item): readonly MeasureDecoy[] {
  if (item.kind !== 'measure') return [];
  const d = (item.key as { readonly decoys?: unknown }).decoys;
  if (!Array.isArray(d)) return [];
  return d.filter((x): x is MeasureDecoy => !!x && typeof (x as MeasureDecoy).ms === 'number' && typeof (x as MeasureDecoy).feedback === 'object');
}

export function viewOf(item: Item): ItemViewX {
  return (item.view ?? {}) as ItemViewX;
}
