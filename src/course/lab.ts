/**
 * Links from a lesson to the Heart Lab (CLAUDE.md "Heart Lab"): the lab's own voxel engine shows the mechanism of a
 * finding on a live 3D heart. The course never embeds the lab (two engines are never mixed in one view); it links to
 * `#/lab/<scenario>` through `labHref` (src/lab/links.ts — free of runtime imports, so linking loads no lab code).
 * A link is offered only while the shell routes it (parseHash does not return 'notfound'), so a lesson never points
 * at a missing page. Pure; tested in tests/course/lab.test.ts.
 */
import { parseHash } from '../app/router';
import type { FindingId } from '../core/findings';
import { labHref } from '../lab/links';

export interface LabLink {
  /** the first lesson finding that opens this lab scenario (its name labels the link) */
  readonly finding: FindingId;
  readonly href: string;
}

const routed = (h: string): boolean => parseHash(h).name !== 'notfound';

/** One link per lab scenario, in the lesson's finding order. */
export function labLinks(
  findings: readonly FindingId[],
  hrefOf: (f: FindingId) => string | null = labHref,
  isRouted: (href: string) => boolean = routed,
): LabLink[] {
  const seen = new Set<string>();
  const out: LabLink[] = [];
  for (const f of findings) {
    const h = hrefOf(f);
    if (!h || seen.has(h) || !isRouted(h)) continue;
    seen.add(h);
    out.push({ finding: f, href: h });
  }
  return out;
}
