/**
 * The learner's progress store: attempts, spaced-review cards and lesson progress. Owned by src/practice; lessons write
 * through it. Persistence: localStorage (inside try/catch — private windows and blocked storage still work for the
 * session), one JSON document with a schema version; the same document is what export / import exchange.
 *
 * Corrupt data never breaks the app: an unreadable document is kept aside under `<key>:corrupt` and the learner starts
 * fresh; a readable document keeps every valid entry and drops the invalid ones. `progressVersion` bumps on every write
 * so components re-render, and the shell's header ring (src/app/slots.ts `overallProgress`) is kept in sync.
 */
import { signal, type ReadonlySignal } from '@preact/signals';
import { overallProgress } from '../../app/slots';
import { isFindingId, type FindingId } from '../../core/findings';
import { COMPETENCIES, type Attempt, type CompetencyId, type LessonProgress, type Mastery, type ReviewCard } from '../api';
import { cardKeys, masteryFrom, nextCard, overallFrom } from './mastery';

export const PROGRESS_KEY = 'ecg-academy:progress:v1';
export const PROGRESS_SCHEMA = 1;
/** Oldest attempts are dropped beyond this many (mastery reads the recent ones). */
export const MAX_ATTEMPTS = 5000;

interface State {
  attempts: Attempt[];
  cards: Map<string, ReviewCard>;
  lessons: Map<string, LessonProgress>;
}

export interface ProgressDocument {
  readonly app: 'ecg-academy';
  readonly kind: 'progress';
  readonly v: number;
  readonly attempts: readonly Attempt[];
  readonly cards: readonly ReviewCard[];
  readonly lessons: Readonly<Record<string, LessonProgress>>;
}

const version = signal(0);
/** Bumps on every write (components that read progress re-render). */
export const progressVersion: ReadonlySignal<number> = version;

let state: State | null = null;
let memo: { v: number; byComp: Map<CompetencyId, Mastery>; byFinding: Map<string, Mastery>; byFamily: Map<string, Mastery> } | null = null;

const empty = (): State => ({ attempts: [], cards: new Map(), lessons: new Map() });

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// ── validation ───────────────────────────────────────────────────────────────────────────────────────────────────
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function cleanAttempt(x: unknown): Attempt | null {
  if (!isObj(x)) return null;
  const { itemId, family, competency, findings, score, at, confidence, missedCritical } = x;
  if (typeof itemId !== 'string' || typeof family !== 'string' || !isNum(score) || !isNum(at)) return null;
  if (typeof competency !== 'string' || !(COMPETENCIES as readonly string[]).includes(competency)) return null;
  const fs: FindingId[] = Array.isArray(findings) ? findings.filter((f): f is FindingId => typeof f === 'string' && isFindingId(f)) : [];
  return {
    itemId,
    family,
    competency: competency as CompetencyId,
    findings: fs,
    score: Math.max(0, Math.min(1, score)),
    at,
    ...(confidence === 1 || confidence === 2 || confidence === 3 ? { confidence } : {}),
    ...(missedCritical === true ? { missedCritical: true } : {}),
  };
}

function cleanCard(x: unknown): ReviewCard | null {
  if (!isObj(x)) return null;
  const { key, box, due } = x;
  if (typeof key !== 'string' || !isNum(due)) return null;
  if (box !== 1 && box !== 2 && box !== 3 && box !== 4 && box !== 5) return null;
  return { key, box, due };
}

function cleanLesson(x: unknown): LessonProgress | null {
  if (!isObj(x)) return null;
  const { step, done, at } = x;
  if (!isNum(step) || step < 0 || typeof done !== 'boolean' || !isNum(at)) return null;
  return { step: Math.floor(step), done, at };
}

/** Parse a progress document; null when it is not one (wrong app/kind, unknown newer schema, unreadable). */
export function parseProgress(json: string): State | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isObj(raw) || raw.app !== 'ecg-academy' || raw.kind !== 'progress' || !isNum(raw.v)) return null;
  if (raw.v < 1 || raw.v > PROGRESS_SCHEMA) return null;
  if (!Array.isArray(raw.attempts)) return null;
  const s = empty();
  for (const a of raw.attempts) {
    const c = cleanAttempt(a);
    if (c) s.attempts.push(c);
  }
  s.attempts.sort((a, b) => a.at - b.at);
  if (s.attempts.length > MAX_ATTEMPTS) s.attempts = s.attempts.slice(-MAX_ATTEMPTS);
  if (Array.isArray(raw.cards)) {
    for (const c of raw.cards) {
      const k = cleanCard(c);
      if (k) s.cards.set(k.key, k);
    }
  }
  if (isObj(raw.lessons)) {
    for (const [id, p] of Object.entries(raw.lessons)) {
      const l = cleanLesson(p);
      if (l) s.lessons.set(id, l);
    }
  }
  return s;
}

function toDocument(s: State): ProgressDocument {
  return {
    app: 'ecg-academy',
    kind: 'progress',
    v: PROGRESS_SCHEMA,
    attempts: s.attempts,
    cards: [...s.cards.values()],
    lessons: Object.fromEntries(s.lessons),
  };
}

// ── load / persist ───────────────────────────────────────────────────────────────────────────────────────────────
function load(): State {
  const st = storage();
  let raw: string | null = null;
  try {
    raw = st?.getItem(PROGRESS_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (!raw) return empty();
  const parsed = parseProgress(raw);
  if (parsed) return parsed;
  try {
    st?.setItem(`${PROGRESS_KEY}:corrupt`, raw);
    st?.removeItem(PROGRESS_KEY);
  } catch {
    /* nothing more we can do */
  }
  return empty();
}

function persist(s: State): void {
  try {
    storage()?.setItem(PROGRESS_KEY, JSON.stringify(toDocument(s)));
  } catch {
    /* storage full or blocked: progress lives for this session only */
  }
}

function syncOverall(): void {
  overallProgress.value = overallMastery();
}

function st(): State {
  if (!state) {
    state = load();
    memo = null;
    syncOverall();
  }
  return state;
}

function commit(): void {
  const s = st();
  persist(s);
  memo = null;
  version.value++;
  syncOverall();
}

/** Re-read the stored document (tests; another tab). */
export function reloadProgress(): void {
  state = null;
  memo = null;
  st();
  version.value++;
}

// ── writes ───────────────────────────────────────────────────────────────────────────────────────────────────────
export function recordAttempt(a: Attempt): void {
  const clean = cleanAttempt(a);
  if (!clean) return;
  const s = st();
  s.attempts.push(clean);
  if (s.attempts.length > MAX_ATTEMPTS) s.attempts.splice(0, s.attempts.length - MAX_ATTEMPTS);
  for (const key of cardKeys(clean)) {
    const next = nextCard(s.cards.get(key), key, clean.score, clean.at);
    if (next) s.cards.set(key, next);
    else s.cards.delete(key);
  }
  commit();
}

export function getLessonProgress(id: string): LessonProgress | null {
  return st().lessons.get(id) ?? null;
}

export function setLessonProgress(id: string, p: LessonProgress): void {
  const l = cleanLesson(p);
  if (!l) return;
  st().lessons.set(id, l);
  commit();
}

export function exportProgress(): string {
  return JSON.stringify(toDocument(st()), null, 1);
}

/** Replace the learner's progress with an exported document. Returns false (and changes nothing) when it is not one. */
export function importProgress(json: string): boolean {
  const parsed = parseProgress(json);
  if (!parsed) return false;
  state = parsed;
  commit();
  return true;
}

export function resetProgress(): void {
  state = empty();
  commit();
}

// ── reads ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function allAttempts(): readonly Attempt[] {
  return st().attempts;
}

export function allCards(): readonly ReviewCard[] {
  return [...st().cards.values()].sort((a, b) => a.due - b.due || a.key.localeCompare(b.key));
}

export function dueReviews(nowMs: number): readonly ReviewCard[] {
  return allCards().filter((c) => c.due <= nowMs);
}

function memoized() {
  const v = version.value;
  if (!memo || memo.v !== v) memo = { v, byComp: new Map(), byFinding: new Map(), byFamily: new Map() };
  return memo;
}

export function masteryOf(c: CompetencyId): Mastery {
  const m = memoized();
  let r = m.byComp.get(c);
  if (!r) {
    r = masteryFrom(st().attempts.filter((a) => a.competency === c).map((a) => a.score));
    m.byComp.set(c, r);
  }
  return r;
}

export function masteryOfFinding(id: FindingId): Mastery {
  const m = memoized();
  let r = m.byFinding.get(id);
  if (!r) {
    r = masteryFrom(st().attempts.filter((a) => a.findings.includes(id)).map((a) => a.score));
    m.byFinding.set(id, r);
  }
  return r;
}

export function masteryOfFamily(id: string): Mastery {
  const m = memoized();
  let r = m.byFamily.get(id);
  if (!r) {
    r = masteryFrom(st().attempts.filter((a) => a.family === id).map((a) => a.score));
    m.byFamily.set(id, r);
  }
  return r;
}

export function overallMastery(): number | null {
  return overallFrom(COMPETENCIES.map((c) => masteryOf(c)));
}
