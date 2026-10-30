/**
 * The real-case library model: cases built from the bundle meta (src/data/real/ptbxl-meta.json), blind case numbering,
 * filters, case of the day and seeded random picks. Pure (no DOM) — tested in tests/real.
 */
import type { FindingId } from '../core/findings';
import { FINDINGS } from '../core/findings';
import { createRng } from '../core/rng';
import type { RealCaseMeta, RealLibrary, RealReference } from './api';
import { attribution } from './attribution';
import type { SignalFormat } from './decode';
import { categoriesOf, mapScpToFindings, relatedFindings, SCP, type CaseCategory } from './scp';
import rawMetaJson from '../data/real/ptbxl-meta.json';

/** One record of ptbxl-meta.json as written by scripts/data/build-real-bundle.mjs. */
export interface RawRecord {
  readonly id: number;
  readonly cls: string;
  readonly codes: Readonly<Record<string, number>>;
  readonly age: number | null;
  readonly sex: string | null;
  readonly heartAxis: string | null;
  readonly infarctionStadium: string | null;
  readonly extraBeats: string | null;
  readonly pacemaker: string | null;
  readonly ref: Readonly<Record<string, number | null>>;
  readonly offset: number;
  readonly length: number;
}

export interface RawBundleMeta extends SignalFormat {
  readonly source: string;
  readonly changes: string;
  readonly records: readonly RawRecord[];
}

export const rawMeta = rawMetaJson as unknown as RawBundleMeta;

/** A case as the app uses it (a superset of the public RealCaseMeta). */
export interface RealCase extends RealCaseMeta {
  /** 1-based case number in the blind order (a fixed seeded shuffle, so neighbours do not share a diagnosis) */
  readonly num: number;
  /** library categories (filters) */
  readonly categories: readonly CaseCategory[];
  /** category of the teaching class */
  readonly primary: CaseCategory;
  /** atlas pages worth comparing (not findings) */
  readonly related: readonly FindingId[];
  /** byte range of the compressed record inside ptbxl-signals.bin */
  readonly offset: number;
  readonly length: number;
}

const CASE_ORDER_SEED = 'ptbxl-case-order-v1';

const num = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function toRef(r: Readonly<Record<string, number | null>>): RealReference {
  return {
    hrBpm: num(r.hrBpm),
    atrialRateBpm: num(r.atrialRateBpm),
    rrMs: num(r.rrMs),
    prMs: num(r.prMs),
    pDurMs: num(r.pDurMs),
    qrsMs: num(r.qrsMs),
    qtMs: num(r.qtMs),
    qtcBazettMs: num(r.qtcBazettMs),
    qtcFridericiaMs: num(r.qtcFridericiaMs),
    qtcFraminghamMs: num(r.qtcFraminghamMs),
    pAxisDeg: num(r.pAxisDeg),
    qrsAxisDeg: num(r.qrsAxisDeg),
    tAxisDeg: num(r.tAxisDeg),
  };
}

/** Build the case list (sorted by blind case number). Deterministic. */
export function buildCases(meta: RawBundleMeta): RealCase[] {
  const ids = meta.records.map((r) => r.id).sort((a, b) => a - b);
  const order = createRng(CASE_ORDER_SEED).shuffle(ids);
  const numOf = new Map(order.map((id, i) => [id, i + 1]));
  const cases = meta.records.map((r): RealCase => {
    const findings = mapScpToFindings(r.codes, r.infarctionStadium);
    return {
      id: r.id,
      cls: r.cls,
      codes: r.codes,
      findings,
      age: r.age,
      sex: r.sex === 'M' || r.sex === 'F' ? r.sex : null,
      heartAxis: r.heartAxis,
      infarctionStadium: r.infarctionStadium,
      ref: toRef(r.ref),
      num: numOf.get(r.id) ?? 0,
      categories: categoriesOf(r.codes, r.cls),
      primary: SCP[r.cls]?.category ?? 'other',
      related: relatedFindings(r.codes, findings),
      offset: r.offset,
      length: r.length,
    };
  });
  return cases.sort((a, b) => a.num - b.num);
}

let cached: { cases: RealCase[]; byId: Map<number, RealCase> } | null = null;

function lib() {
  if (!cached) {
    const cases = buildCases(rawMeta);
    cached = { cases, byId: new Map(cases.map((c) => [c.id, c])) };
  }
  return cached;
}

/** All cases in blind case-number order. */
export function getCases(): readonly RealCase[] {
  return lib().cases;
}

export function getCase(id: number): RealCase | undefined {
  return lib().byId.get(id);
}

/** Public library object (contract). */
export function getLibrary(): RealLibrary {
  return { cases: lib().cases, attribution };
}

/** Cases whose mapped findings include `id` (for atlas "real examples" and lesson "real" blocks), in case order. */
export function casesWithFinding(id: FindingId): readonly RealCase[] {
  return lib().cases.filter((c) => c.findings.includes(id));
}

// ── filters ───────────────────────────────────────────────────────────────────────────────────────────────────────

export type ReadStatus = 'all' | 'unread' | 'read';

export interface CaseFilter {
  readonly category: CaseCategory | 'all';
  readonly finding: FindingId | 'all';
  readonly status: ReadStatus;
}

export const NO_FILTER: CaseFilter = { category: 'all', finding: 'all', status: 'all' };

export function isFiltered(f: CaseFilter): boolean {
  return f.category !== 'all' || f.finding !== 'all' || f.status !== 'all';
}

export function matchesFilter(c: RealCase, f: CaseFilter, read: ReadonlySet<number>): boolean {
  if (f.category !== 'all' && !c.categories.includes(f.category)) return false;
  if (f.finding !== 'all' && !c.findings.includes(f.finding)) return false;
  if (f.status === 'read' && !read.has(c.id)) return false;
  if (f.status === 'unread' && read.has(c.id)) return false;
  return true;
}

export function filterCases(cases: readonly RealCase[], f: CaseFilter, read: ReadonlySet<number> = new Set()): RealCase[] {
  return cases.filter((c) => matchesFilter(c, f, read));
}

/** Findings present in a set of cases with their counts, in taxonomy order. */
export function findingCounts(cases: readonly RealCase[]): { id: FindingId; n: number }[] {
  const m = new Map<FindingId, number>();
  for (const c of cases) for (const f of c.findings) m.set(f, (m.get(f) ?? 0) + 1);
  const order = Object.keys(FINDINGS);
  return [...m.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

/**
 * Options of the finding filter: findings present among the cases that match the other filters (category, status),
 * with counts; the selected finding stays listed (count 0) so the control never shows a value it does not offer.
 */
export function findingOptions(cases: readonly RealCase[], f: CaseFilter, read: ReadonlySet<number>): { id: FindingId; n: number }[] {
  const counts = findingCounts(filterCases(cases, { ...f, finding: 'all' }, read));
  if (f.finding !== 'all' && !counts.some((x) => x.id === f.finding)) {
    const order = Object.keys(FINDINGS);
    counts.push({ id: f.finding, n: 0 });
    counts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }
  return counts;
}

export function categoryCounts(cases: readonly RealCase[]): Record<CaseCategory | 'all', number> {
  const out: Record<CaseCategory | 'all', number> = { all: cases.length, normal: 0, rhythm: 0, conduction: 0, hypertrophy: 0, infarction: 0, ischemia: 0, other: 0 };
  for (const c of cases) for (const k of c.categories) out[k]++;
  return out;
}

// ── navigation, case of the day, random ───────────────────────────────────────────────────────────────────────────

/** Previous / next case in a list (wraps around); null when the list has fewer than two cases or lacks `id`. */
export function neighbours(list: readonly RealCase[], id: number): { prev: RealCase; next: RealCase } | null {
  const i = list.findIndex((c) => c.id === id);
  if (i < 0 || list.length < 2) return null;
  return { prev: list[(i - 1 + list.length) % list.length], next: list[(i + 1) % list.length] };
}

/**
 * The list "previous / next" walks on a case page: the library filtered as the learner left it, with the current case
 * kept in its place even when it no longer matches (e.g. it has just been read under an "unread" filter).
 */
export function navigationList(cases: readonly RealCase[], f: CaseFilter, read: ReadonlySet<number>, currentId: number): RealCase[] {
  const list = filterCases(cases, f, read);
  if (list.some((c) => c.id === currentId)) return list;
  const cur = cases.find((c) => c.id === currentId);
  if (!cur) return list;
  const at = list.findIndex((c) => c.num > cur.num);
  if (at < 0) list.push(cur);
  else list.splice(at, 0, cur);
  return list;
}

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The case of the day: deterministic for a calendar date (same date → same case for everyone). */
export function caseOfTheDay(cases: readonly RealCase[], date: Date | string): RealCase {
  if (cases.length === 0) throw new Error('caseOfTheDay: empty library');
  const key = typeof date === 'string' ? date : dateKey(date);
  return cases[createRng(`case-of-day:${key}`).int(0, cases.length - 1)];
}

/** A seeded random case (excluding `excludeId` when possible); null for an empty list. */
export function randomCase(cases: readonly RealCase[], seed: string, excludeId?: number): RealCase | null {
  const pool = cases.length > 1 && excludeId != null ? cases.filter((c) => c.id !== excludeId) : cases;
  if (pool.length === 0) return null;
  return pool[createRng(`random-case:${seed}`).int(0, pool.length - 1)];
}

/**
 * The "random case" button: a seeded pick among the cases the learner has not read yet in the list on screen (a fresh
 * tracing is worth more than one already revealed); the whole list when all are read, the library when the list is empty.
 */
export function randomUnreadCase(shown: readonly RealCase[], all: readonly RealCase[], read: ReadonlySet<number>, seed: string): RealCase | null {
  const base = shown.length > 0 ? shown : all;
  const unread = base.filter((c) => !read.has(c.id));
  return randomCase(unread.length > 0 ? unread : base, seed);
}
