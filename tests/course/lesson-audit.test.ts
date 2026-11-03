/**
 * Measurement for docs/review/learn-by-doing-2026-11-04.md: per lesson, block counts by kind and zh characters of
 * prose. Runs only when asked: AUDIT_OUT=<file.json> npx vitest run tests/course/lesson-audit.test.ts
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { Block } from '../../src/course/api';
import { LESSONS } from '../../src/course/lessons/index';

const zh = (x: { readonly zh: string } | undefined) => (x ? x.zh.length : 0);

function prose(b: Block): number {
  switch (b.kind) {
    case 'text':
      return zh(b.title) + zh(b.body);
    case 'criteria':
      return b.items.reduce((n, i) => n + zh(i.label) + zh(i.value), 0);
    case 'pitfalls':
      return b.items.reduce((n, i) => n + zh(i), 0);
    case 'summary':
      return b.points.reduce((n, i) => n + zh(i), 0);
    default:
      return 0;
  }
}

it.skipIf(!process.env.AUDIT_OUT)('lesson audit', () => {
  const rows = [...LESSONS.values()]
    .sort((a, b) => a.stage.localeCompare(b.stage) || a.order - b.order)
    .map((les) => {
      const kinds: Record<string, number> = {};
      const proseZh: Record<string, number> = {};
      for (const b of les.blocks) {
        kinds[b.kind] = (kinds[b.kind] ?? 0) + 1;
        const n = prose(b);
        if (n) proseZh[b.kind] = (proseZh[b.kind] ?? 0) + n;
      }
      return { id: les.id, stage: les.stage, blocks: les.blocks.length, kinds, proseZh };
    });
  writeFileSync(process.env.AUDIT_OUT!, JSON.stringify(rows, null, 1));
});
