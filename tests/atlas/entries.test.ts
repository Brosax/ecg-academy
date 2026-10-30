/**
 * Every registered atlas entry validates against the schema (src/atlas/schema.ts): all three languages, valid mimic
 * finding ids, sources, lesson ids, urgency for critical findings, modern terminology. The categories owned by the
 * atlas workstream (normal, axis, chamber, repolarization, technical) are complete; other categories are optional
 * until their workstreams add entry files.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FINDING_LIST, FINDINGS, isFindingId, type FindingCategory } from '../../src/core/findings';
import { LANGS } from '../../src/core/l10n';
import { STD_LEADS, EXTRA_LEADS } from '../../src/core/leads';
import { allEntries, duplicateEntries, entryOf, entrySources } from '../../src/atlas/registry';
import { BANNED_TERMS, LESSON_IDS, URGENCIES, entryTexts, validateEntry, type AtlasEntry } from '../../src/atlas/schema';

const OWNED: readonly FindingCategory[] = ['normal', 'axis', 'chamber', 'repolarization', 'technical'];
const LEADS = new Set<string>([...STD_LEADS, ...EXTRA_LEADS]);

describe('atlas registry', () => {
  it('collects entries from src/atlas/entries/*.ts', () => {
    expect(allEntries().length).toBeGreaterThanOrEqual(33);
  });

  it('has no entry defined twice', () => {
    expect(duplicateEntries()).toEqual([]);
  });

  it('lists entries in taxonomy order', () => {
    const order = FINDING_LIST.map((d) => d.id as string);
    const idx = allEntries().map((e) => order.indexOf(e.id));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });

  for (const cat of OWNED) {
    it(`covers every finding of the "${cat}" category`, () => {
      const missing = FINDING_LIST.filter((d) => d.cat === cat && !entryOf(d.id)).map((d) => d.id);
      expect(missing).toEqual([]);
    });
  }

  it('keeps each entry in the file of its category (entries/<category>.ts)', () => {
    const wrong: string[] = [];
    for (const [id, path] of entrySources()) {
      const file = path.replace(/^.*\//, '').replace(/\.ts$/, '');
      // a shared file may hold several categories, but the owned categories live in their own files
      if (OWNED.includes(FINDINGS[id].cat) && file !== FINDINGS[id].cat) wrong.push(`${id} in ${file}`);
    }
    expect(wrong).toEqual([]);
  });
});

describe('every atlas entry validates', () => {
  for (const e of allEntries()) {
    it(`${e.id}`, () => {
      expect(validateEntry(e)).toEqual([]);
    });
  }
});

describe('entry details', () => {
  const entries: readonly AtlasEntry[] = allEntries();

  it('all three languages are non-empty everywhere', () => {
    const empty: string[] = [];
    for (const e of entries) for (const { path, t } of entryTexts(e)) for (const l of LANGS) if (!t[l]?.trim()) empty.push(`${e.id}.${path}.${l}`);
    expect(empty).toEqual([]);
  });

  it('mimics are valid finding ids, never the finding itself', () => {
    const bad: string[] = [];
    for (const e of entries) for (const m of e.mimics) if (!isFindingId(m.id) || m.id === e.id) bad.push(`${e.id} → ${m.id}`);
    expect(bad).toEqual([]);
  });

  it('every entry has at least two mimics with a discriminating feature', () => {
    const few = entries.filter((e) => e.mimics.length < 2).map((e) => e.id);
    expect(few).toEqual([]);
  });

  it('mimic and exemplar leads are real leads', () => {
    const bad: string[] = [];
    for (const e of entries) {
      for (const m of e.mimics) for (const lead of m.leads ?? []) if (!LEADS.has(lead)) bad.push(`${e.id}/${m.id}: ${lead}`);
      for (const lead of e.exemplar?.leads ?? []) if (!LEADS.has(lead)) bad.push(`${e.id}: ${lead}`);
    }
    expect(bad).toEqual([]);
  });

  it('criteria and entries carry sources', () => {
    const missing: string[] = [];
    for (const e of entries) {
      if (e.sources.length === 0) missing.push(e.id);
      e.criteria.forEach((c, i) => {
        if (!c.source.trim()) missing.push(`${e.id}.criteria[${i}]`);
      });
    }
    expect(missing).toEqual([]);
  });

  it('every criterion source names a reference listed in the entry sources', () => {
    // the short form ("Hancock 2009 (…)") must point at a full reference of the entry (first author's surname)
    const orphan: string[] = [];
    const surname = (s: string) => s.replace(/^[^A-Za-zÀ-ÿ]*/, '').split(/[\s,(;]/)[0].toLowerCase();
    for (const e of entries) {
      const full = e.sources.map((s) => s.toLowerCase());
      for (const c of e.criteria) {
        for (const part of c.source.split(/;/)) {
          const name = surname(part.trim());
          if (!name || ['esc', 'udmi', 'aha', 'acc'].includes(name)) continue;
          if (!full.some((s) => s.includes(name))) orphan.push(`${e.id}: "${part.trim()}"`);
        }
      }
    }
    expect(orphan).toEqual([]);
  });

  it('critical findings have an urgency statement', () => {
    const missing = entries.filter((e) => FINDINGS[e.id].severity === 'critical' && !e.urgency).map((e) => e.id);
    expect(missing).toEqual([]);
    for (const e of entries) if (e.urgency) expect(URGENCIES).toContain(e.urgency.level);
  });

  it('lessons are PLAN §3 lesson ids', () => {
    const bad: string[] = [];
    for (const e of entries) for (const id of e.lessons) if (!(LESSON_IDS as readonly string[]).includes(id)) bad.push(`${e.id}: ${id}`);
    expect(bad).toEqual([]);
  });

  it('uses no outdated terminology', () => {
    const hits: string[] = [];
    for (const e of entries)
      for (const { path, t } of entryTexts(e)) for (const l of LANGS) for (const b of BANNED_TERMS) if (b.re.test(t[l])) hits.push(`${e.id}.${path}.${l}`);
    expect(hits).toEqual([]);
  });

  it('Spanish uses Spain terminology for leads and atria', () => {
    const es = entries.flatMap((e) => entryTexts(e).map((x) => x.t.es)).join('\n');
    expect(es).toMatch(/derivaci[oó]n/);
    expect(es).toMatch(/aur[ií]cula/);
    expect(es).not.toMatch(/\bderivada\b/i);
    expect(es).not.toMatch(/hemibloqueo/i);
  });

  it('Spanish decimals use a comma', () => {
    const bad: string[] = [];
    for (const e of entries) for (const { path, t } of entryTexts(e)) if (/\d\.\d/.test(t.es)) bad.push(`${e.id}.${path}: ${t.es}`);
    expect(bad).toEqual([]);
  });

  it('Chinese prose contains Chinese text', () => {
    const bad: string[] = [];
    for (const e of entries) for (const { path, t, prose } of entryTexts(e)) if (prose && !/[一-鿿]/.test(t.zh)) bad.push(`${e.id}.${path}`);
    expect(bad).toEqual([]);
  });
});

describe('lesson ids match docs/PLAN.md §3', () => {
  it('LESSON_IDS equals the ids listed in the curriculum table', () => {
    const plan = readFileSync(fileURLToPath(new URL('../../docs/PLAN.md', import.meta.url)), 'utf8');
    const s3 = plan.slice(plan.indexOf('## 3.'), plan.indexOf('## 4.'));
    const ids = [...s3.matchAll(/(?:^|[|·]\s*)([fsrtihox]\d{1,2}) /gm)].map((m) => m[1]);
    expect(new Set(ids)).toEqual(new Set(LESSON_IDS));
  });
});

describe('validator catches mistakes', () => {
  const good = allEntries().find((e) => e.id === 'lvh');
  if (!good) throw new Error('lvh entry missing');

  it('flags an invalid mimic id and a self-mimic', () => {
    const bad = { ...good, mimics: [...good.mimics, { id: 'not-a-finding' as never, discriminator: good.definition }, { id: 'lvh' as const, discriminator: good.definition }] };
    const p = validateEntry(bad);
    expect(p.some((x) => x.includes('not a FindingId'))).toBe(true);
    expect(p.some((x) => x.includes('own mimic'))).toBe(true);
  });

  it('flags a missing language, a banned term, a missing source and a one-sentence mechanism', () => {
    const bad: AtlasEntry = {
      ...good,
      definition: { ...good.definition, es: '' },
      pitfalls: [{ zh: '心房扩大', en: 'left atrial enlargement', es: 'crecimiento auricular izquierdo' }],
      criteria: [{ ...good.criteria[0], source: '' }],
      mechanism: { zh: '一句话。', en: 'One sentence only.', es: 'Solo una frase.' },
    };
    const p = validateEntry(bad);
    expect(p.some((x) => x.includes('definition'))).toBe(true);
    expect(p.some((x) => x.includes('outdated term'))).toBe(true);
    expect(p.some((x) => x.includes('needs a source'))).toBe(true);
    expect(p.some((x) => x.includes('two sentences'))).toBe(true);
  });

  it('flags a critical finding without urgency', () => {
    const lqt = allEntries().find((e) => e.id === 'long-qt');
    if (!lqt) throw new Error('long-qt entry missing');
    const { urgency: _u, ...rest } = lqt;
    expect(validateEntry(rest).some((x) => x.includes('urgency'))).toBe(true);
  });
});
