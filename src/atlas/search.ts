/**
 * Atlas search and filters: one query matches finding names in all three languages (whatever the UI language),
 * abbreviations / older names (`aka`), the id, and the entry's definition and key features. Accent- and
 * case-insensitive ("auricula" finds "aurícula"); Chinese matches by substring. Pure (no DOM) — tested in tests/atlas.
 */
import { FINDING_LIST, type FindingCategory, type FindingDef, type FindingId, type Severity } from '../core/findings';
import { LANGS, type L10n } from '../core/l10n';
import { entryOf } from './registry';
import type { AtlasEntry } from './schema';

/** Lower case, accents stripped, dashes / quotes / punctuation as spaces, whitespace collapsed. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\-_‐-―−'’"“”«»()（）[\]{}/\\,.;:!?¿¡、，。；：·•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const all = (t: L10n): string[] => LANGS.map((l) => t[l]);

interface Indexed {
  readonly id: FindingId;
  readonly names: readonly string[];
  readonly aka: readonly string[];
  readonly text: string;
}

function indexOne(d: FindingDef, e: AtlasEntry | undefined): Indexed {
  const names = all(d.name).map(normalize);
  const aka = [d.id.replace(/-/g, ' '), ...(e?.aka ?? [])].map(normalize);
  const text = e ? normalize([...all(e.definition), ...e.features.flatMap(all)].join(' ')) : '';
  return { id: d.id as FindingId, names, aka, text };
}

let INDEX: Indexed[] | null = null;
function index(): Indexed[] {
  if (!INDEX) INDEX = FINDING_LIST.map((d) => indexOne(d, entryOf(d.id)));
  return INDEX;
}

/** Score of one token against one finding (0 = no match). */
function tokenScore(x: Indexed, tok: string): number {
  let best = 0;
  for (const n of x.names) {
    if (n === tok) best = Math.max(best, 100);
    else if (n.startsWith(tok)) best = Math.max(best, 80);
    else if (n.split(' ').some((w) => w.startsWith(tok))) best = Math.max(best, 70);
    else if (n.includes(tok)) best = Math.max(best, 60);
  }
  for (const a of x.aka) {
    if (a === tok) best = Math.max(best, 90);
    else if (a.split(' ').some((w) => w.startsWith(tok))) best = Math.max(best, 50);
    else if (a.includes(tok)) best = Math.max(best, 40);
  }
  if (best === 0 && x.text.includes(tok)) best = 15;
  return best;
}

/**
 * Findings matching a query, best first (ties keep taxonomy order). Every whitespace-separated token must match
 * somewhere; the whole query matching a name counts more than its tokens. Empty query → all findings, taxonomy order.
 */
export function searchFindings(query: string): FindingId[] {
  const q = normalize(query);
  if (!q) return FINDING_LIST.map((d) => d.id as FindingId);
  const toks = q.split(' ').filter(Boolean);
  const scored: { id: FindingId; s: number; i: number }[] = [];
  index().forEach((x, i) => {
    let s = 0;
    for (const t of toks) {
      const ts = tokenScore(x, t);
      if (ts === 0) return;
      s += ts;
    }
    if (toks.length > 1) {
      const whole = tokenScore(x, q);
      if (whole >= 60) s += whole;
    }
    scored.push({ id: x.id, s, i });
  });
  return scored.sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.id);
}

export type SeverityFilter = Severity | 'all';

export interface AtlasFilter {
  readonly query: string;
  readonly category: FindingCategory | 'all';
  /** 'critical' = the "can't-miss" set */
  readonly severity: SeverityFilter;
}

export const NO_ATLAS_FILTER: AtlasFilter = { query: '', category: 'all', severity: 'all' };

const DEF = new Map<string, FindingDef>(FINDING_LIST.map((d) => [d.id, d]));

/** Apply query + category + severity. With a query the result is ranked; without, it is in taxonomy order. */
export function filterFindings(f: AtlasFilter): FindingId[] {
  return searchFindings(f.query).filter((id) => {
    const d = DEF.get(id);
    if (!d) return false;
    if (f.category !== 'all' && d.cat !== f.category) return false;
    if (f.severity !== 'all' && d.severity !== f.severity) return false;
    return true;
  });
}

/** Counts per category for the chips, under the query and severity filters (category ignored). */
export function categoryCounts(f: AtlasFilter): Record<FindingCategory | 'all', number> {
  const ids = filterFindings({ ...f, category: 'all' });
  const out = { all: ids.length } as Record<FindingCategory | 'all', number>;
  for (const d of FINDING_LIST) out[d.cat] = out[d.cat] ?? 0;
  for (const id of ids) {
    const d = DEF.get(id);
    if (d) out[d.cat]++;
  }
  return out;
}

/** Counts per severity under the query and category filters (severity ignored). */
export function severityCounts(f: AtlasFilter): Record<SeverityFilter, number> {
  const ids = filterFindings({ ...f, severity: 'all' });
  const out: Record<SeverityFilter, number> = { all: ids.length, critical: 0, major: 0, minor: 0, normal: 0 };
  for (const id of ids) {
    const d = DEF.get(id);
    if (d) out[d.severity]++;
  }
  return out;
}

/** Previous / next finding in taxonomy order within the same category (for the finding page). */
export function siblings(id: FindingId): { prev: FindingId | null; next: FindingId | null } {
  const d = DEF.get(id);
  if (!d) return { prev: null, next: null };
  const list = FINDING_LIST.filter((x) => x.cat === d.cat).map((x) => x.id as FindingId);
  const i = list.indexOf(id);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}
