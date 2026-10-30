/**
 * CSS isolation between the Heart Lab and ECG Academy (both ship in one bundle):
 *  - every lab rule is scoped under .lab-root (so lab CSS never styles the host);
 *  - no class, id or @keyframes name used by the lab is also used by the host's global CSS (so host CSS never styles
 *    lab elements). Re-run when the host gains CSS: a new collision fails here and is fixed by a `lab-` rename.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const LAB = join(SRC, 'lab');

function files(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files(p, out);
    else out.push(p);
  }
  return out;
}
const ALL = files(SRC);
const inLab = (f: string) => f.startsWith(LAB + sep);
const rel = (f: string) => relative(SRC, f).split(sep).join('/');
const read = (f: string) => readFileSync(f, 'utf8');

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

interface Rule {
  readonly selectors: readonly string[];
  readonly inKeyframes: boolean;
}

/** Selector lists of every style rule (recursing into @media / @container / @supports; @keyframes steps flagged). */
function rules(css: string): Rule[] {
  const out: Rule[] = [];
  const walk = (s: string, inKeyframes: boolean) => {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf('{', i);
      if (open < 0) return;
      const prelude = s.slice(i, open).replace(/^[\s;]+/, '').trim();
      let depth = 1, k = open + 1;
      while (k < s.length && depth > 0) {
        if (s[k] === '{') depth++;
        else if (s[k] === '}') depth--;
        k++;
      }
      const inner = s.slice(open + 1, k - 1);
      if (prelude.startsWith('@')) {
        if (/^@(media|container|supports|layer)\b/.test(prelude)) walk(inner, inKeyframes);
        else if (/^@(-webkit-)?keyframes\b/.test(prelude)) walk(inner, true);
      } else {
        out.push({ selectors: splitList(prelude), inKeyframes });
      }
      i = k;
    }
  };
  walk(stripComments(css), false);
  return out;
}

function splitList(sel: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const c of sel) {
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

const classesOf = (selector: string) => [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
const idsOf = (selector: string) => [...selector.replace(/\[[^\]]*\]/g, '').matchAll(/#(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
/** Class sets of each compound selector (pseudo-class arguments and attribute selectors dropped). */
function compoundsOf(selector: string): string[][] {
  let s = selector.replace(/\[[^\]]*\]/g, '');
  for (let prev = ''; prev !== s; ) {
    prev = s;
    s = s.replace(/\([^()]*\)/g, '');
  }
  return s.split(/[\s>+~]+/).map(classesOf).filter((c) => c.length > 0);
}
const keyframesOf = (css: string) => [...stripComments(css).matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)].map((m) => m[1]);

const labCss = ALL.filter((f) => inLab(f) && f.endsWith('.css'));
const hostCss = ALL.filter((f) => !inLab(f) && f.endsWith('.css'));
const labCode = ALL.filter((f) => inLab(f) && /\.tsx?$/.test(f) && !f.includes(`${sep}dev${sep}`));

describe('lab CSS is scoped under .lab-root', () => {
  it('finds the lab stylesheets', () => {
    expect(labCss.map(rel).sort()).toEqual(
      expect.arrayContaining(['lab/app/theme.css', 'lab/app/ui/layout.css', 'lab/app/ui/shell.css', 'lab/ecg/ecg.css', 'lab/view3d/view3d.css']),
    );
  });

  for (const f of labCss)
    it(rel(f), () => {
      const bad = rules(read(f))
        .filter((r) => !r.inKeyframes)
        .flatMap((r) => r.selectors)
        .filter((s) => !/^\.lab-root(?![\w-])/.test(s) && !/^:root\[data-theme='dark'\] \.lab-root(?![\w-])/.test(s));
      expect(bad).toEqual([]);
    });

  it('no lab rule targets html, body or :root on its own', () => {
    const sels = labCss.flatMap((f) => rules(read(f)).flatMap((r) => r.selectors));
    expect(sels.filter((s) => /(^|\s)(html|body)(\s|$|[.:[{])/.test(s) || /^:root\s*$/.test(s))).toEqual([]);
  });
});

describe('host CSS cannot reach lab elements', () => {
  /** every compound selector of the host CSS with its classes (an element matches it only if it has all of them) */
  const hostCompounds: { readonly classes: readonly string[]; readonly file: string }[] = [];
  const hostIds = new Set<string>();
  const hostKeyframes = new Set<string>();
  for (const f of hostCss) {
    const css = read(f);
    for (const r of rules(css))
      for (const s of r.selectors) {
        for (const classes of compoundsOf(s)) hostCompounds.push({ classes, file: rel(f) });
        for (const id of idsOf(s)) hostIds.add(id);
      }
    for (const k of keyframesOf(css)) hostKeyframes.add(k);
  }

  // classes the lab uses: its own CSS plus class / className strings in its components
  const labClasses = new Set<string>();
  for (const f of labCss) for (const r of rules(read(f))) for (const s of r.selectors) for (const c of classesOf(s)) labClasses.add(c);
  const labIds = new Set<string>();
  for (const f of labCode) {
    const code = read(f);
    for (const m of code.matchAll(/\b(?:class|className)\s*[=:]\s*\{?\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g))
      for (const w of m[2].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) if (/^-?[_a-zA-Z][\w-]*$/.test(w)) labClasses.add(w);
    for (const m of code.matchAll(/\bid\s*=\s*\{?\s*(['"])([\w-]+)\1/g)) labIds.add(m[2]);
  }

  it('the scan sees the host stylesheets and the lab classes', () => {
    expect(hostCss.length).toBeGreaterThan(0);
    expect(labClasses.has('lab-app')).toBe(true);
    expect(labClasses.has('hv-root')).toBe(true);
  });

  it('no host class selector can match a lab element', () => {
    // a compound like .pr-pair__ecg.is-answer needs every one of its classes, so a lab element carrying only is-answer is safe
    const hits = hostCompounds.filter((h) => h.classes.every((c) => labClasses.has(c))).map((h) => `.${h.classes.join('.')} (${h.file})`);
    expect([...new Set(hits)]).toEqual([]);
  });

  it('no id used by the lab is styled by the host or equals the host main landmark', () => {
    expect([...labIds].filter((id) => hostIds.has(id) || id === 'main' || id === 'app')).toEqual([]);
  });

  it('no @keyframes name is shared', () => {
    const lab = labCss.flatMap((f) => keyframesOf(read(f)));
    expect(lab.filter((k) => hostKeyframes.has(k))).toEqual([]);
  });
});
