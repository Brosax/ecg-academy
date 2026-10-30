/**
 * Cross-links from a practice item to the rest of the app (pure). After grading, "See it in the Heart Lab" opens the
 * lab scenario of the first finding the item trains that the lab can show — the lab's 3D heart explains WHY the
 * tracing looks the way it does. The lab is its own page (#/lab/<scenario>); its engine is never mixed into a practice
 * view (CLAUDE.md "Heart Lab"). src/lab/links.ts has no runtime imports, so this does not load the lab.
 */
import type { FindingId } from '../../core/findings';
import { labHref } from '../../lab/links';

/** Findings too generic to be worth a lab visit on their own. */
const GENERIC: readonly FindingId[] = ['normal-ecg', 'sinus-rhythm'];

export function labLinkOf(findings: readonly FindingId[]): { readonly finding: FindingId; readonly href: string } | null {
  for (const f of findings) {
    if (GENERIC.includes(f)) continue;
    const h = labHref(f);
    if (h) return { finding: f, href: h };
  }
  return null;
}
