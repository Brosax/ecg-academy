/**
 * Module boundaries of the atlas and the tools page (CLAUDE.md): the Heart Lab has its own engine, so atlas pages only
 * link to it through src/lab/links.ts (no runtime imports) and never import lab internals; nothing imports _proto/.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FINDING_LIST } from '../../src/core/findings';
import { labHref } from '../../src/lab/links';

const root = fileURLToPath(new URL('../../src/', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

const sources = [...files(join(root, 'atlas')), ...files(join(root, 'tools'))].map((p) => ({ p, s: readFileSync(p, 'utf8') }));
const imports = (s: string) => [...s.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);

describe('atlas / tools boundaries', () => {
  it('reach the Heart Lab only through src/lab/links.ts', () => {
    const bad = sources.flatMap(({ p, s }) => imports(s).filter((i) => /(^|\/)lab(\/|$)/.test(i) && !/\/lab\/links$/.test(i)).map((i) => `${p}: ${i}`));
    expect(bad).toEqual([]);
  });

  it('never import _proto/', () => {
    expect(sources.filter(({ s }) => imports(s).some((i) => i.includes('_proto'))).map(({ p }) => p)).toEqual([]);
  });

  it('lab links are lab routes', () => {
    for (const d of FINDING_LIST) {
      const h = labHref(d.id);
      if (h) expect(h).toMatch(/^#\/lab\/[a-z0-9-]+$/);
    }
  });
});
