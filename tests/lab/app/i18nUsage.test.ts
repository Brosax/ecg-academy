import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { zh as modesZh } from '../../../src/lab/i18n/modes/zh';
import { zh as shellZh } from '../../../src/lab/i18n/shell/zh';

/** Keys built from a template literal at run time (`tm(\`dz.${id}\`)` …): their entries are not quoted in the source. */
const DYNAMIC_PREFIXES = ['dz.', 'dzcat.', 'sec.preset.', 'ld.group.', 'ld.desc.', 'shell.hr.kind.'] as const;

const SRC = fileURLToPath(new URL('../../../src/lab', import.meta.url));
const I18N = join(SRC, 'i18n');

function sources(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (p !== I18N) sources(p, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('module dictionaries carry no dead keys', () => {
  const code = sources(SRC)
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const quoted = (k: string) => [`'${k}'`, `"${k}"`, `\`${k}\``].some((q) => code.includes(q));

  for (const [name, dict] of Object.entries({ modes: modesZh, shell: shellZh }))
    it(`${name}: every key is used under src/ (outside src/i18n)`, () => {
      const dead = Object.keys(dict).filter((k) => !quoted(k) && !DYNAMIC_PREFIXES.some((p) => k.startsWith(p)));
      expect(dead, `unused ${name} keys`).toEqual([]);
    });
});
