/**
 * The course's single doorway to the modules it plays (practice, synth, real, figures). Everything the lesson player
 * needs from another workstream goes through here, typed against the frozen contracts:
 *
 *  - src/practice/api.ts lists the functions and components src/practice/index.tsx exports (ItemPlayer, DrillRunner,
 *    ecgOf, generateItem, families, progress store …) only in a comment, and the practice module is built in parallel.
 *    `PracticeApi` below transcribes that list; the module namespace is read through it, so the course compiles and
 *    runs against the stub as well as the real engine. What the stub lacks degrades gracefully:
 *      ecgOf            → synth generate() / real loadRealEcg() directly (same result, no shared cache)
 *      lesson progress  → kept in memory for this session
 *      items, drills    → the block says "not available yet"
 *  - review cards: the contract has no way to enqueue a card; `scheduleReview` is the function the course asks the
 *    practice module for (contract request). It is called only when it exists.
 */
import { signal, type ReadonlySignal } from '@preact/signals';
import type { ComponentType } from 'preact';
import type { Ecg } from '../core/ecg';
import * as practiceModule from '../practice';
import type {
  CompetencyId,
  DrillFamily,
  DrillRunnerProps,
  EcgSource,
  Item,
  ItemPlayerProps,
  LessonProgress,
  Mastery,
} from '../practice/api';
import { FIGURE_IDS, TREE_IDS } from '../figures';
import { getCase, loadRealEcg, peekRealEcg, type RealCase } from '../real';
import { generate, scenarios, type Difficulty, type ScenarioDef, type SynthRequest, type SynthResult } from '../synth';
import { PLANNED_STAGE } from './catalogue';
import type { ValidateDeps } from './validate';

/** What src/practice/index.tsx exports (src/practice/api.ts, "components and functions exported …"). */
export interface PracticeApi {
  readonly ItemPlayer: ComponentType<ItemPlayerProps>;
  readonly DrillRunner: ComponentType<DrillRunnerProps>;
  families(): readonly DrillFamily[];
  getFamily(id: string): DrillFamily | undefined;
  generateItem(familyId: string, seed: number, difficulty?: Difficulty): Promise<Item>;
  ecgOf(source: EcgSource): Promise<Ecg>;
  masteryOf(c: CompetencyId): Mastery;
  /** exported by src/practice/index.tsx but not listed in the contract: used when present */
  masteryOfFamily?(id: string): Mastery;
  getLessonProgress(id: string): LessonProgress | null;
  setLessonProgress(id: string, p: LessonProgress): void;
  readonly progressVersion: ReadonlySignal<number>;
  /** PROPOSED (contract request): put review cards (`family` or `finding:<id>` keys) into the spaced-review queue. */
  scheduleReview?(keys: readonly string[], nowMs: number): void;
}

const P = practiceModule as unknown as Partial<PracticeApi>;

// ── ECG sources ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Stable cache key of an ECG source. */
export function sourceKey(src: EcgSource): string {
  return src.kind === 'real' ? `real:${src.id}` : `synth:${JSON.stringify(src.req)}`;
}

const CACHE_MAX = 24;
const ecgCache = new Map<string, Ecg>();

function remember(key: string, ecg: Ecg): Ecg {
  ecgCache.delete(key);
  ecgCache.set(key, ecg);
  while (ecgCache.size > CACHE_MAX) {
    const oldest = ecgCache.keys().next().value;
    if (oldest === undefined) break;
    ecgCache.delete(oldest);
  }
  return ecg;
}

/** Put an already-built ECG in the cache for a source (dev harness and tests: no engine needed). */
export function primeEcg(src: EcgSource, ecg: Ecg): void {
  remember(sourceKey(src), ecg);
}

/** An ECG already resolved in this session (synchronous: no placeholder flash when a step is revisited). */
export function peekEcg(src: EcgSource): Ecg | null {
  const hit = ecgCache.get(sourceKey(src));
  if (hit) return hit;
  return src.kind === 'real' ? peekRealEcg(src.id) : null;
}

/** Resolve an ECG source: practice's ecgOf when available, else synth / real directly. */
export async function loadEcg(src: EcgSource): Promise<Ecg> {
  const key = sourceKey(src);
  const hit = ecgCache.get(key);
  if (hit) return hit;
  let ecg: Ecg;
  if (typeof P.ecgOf === 'function') ecg = await P.ecgOf(src);
  else if (src.kind === 'real') ecg = await loadRealEcg(src.id);
  else ecg = (await Promise.resolve().then(() => generate(src.req))).ecg;
  return remember(key, ecg);
}

/** Synthesize directly (live blocks need `applied`, which ecgOf does not return). Throws when the engine cannot. */
export function synthesize(req: SynthRequest): SynthResult {
  return generate(req);
}

export function scenarioDef(id: string): ScenarioDef | undefined {
  return scenarioList().find((s) => s.id === id);
}

export function scenarioList(): readonly ScenarioDef[] {
  try {
    return scenarios();
  } catch {
    return [];
  }
}

export function realCase(id: number): RealCase | undefined {
  return getCase(id);
}

// ── practice items and drills ─────────────────────────────────────────────────────────────────────────────────────

export function itemPlayer(): ComponentType<ItemPlayerProps> | null {
  return typeof P.ItemPlayer === 'function' ? P.ItemPlayer : null;
}

export function drillRunner(): ComponentType<DrillRunnerProps> | null {
  return typeof P.DrillRunner === 'function' ? P.DrillRunner : null;
}

export function canGenerateItems(): boolean {
  return typeof P.generateItem === 'function';
}

export function generateItem(familyId: string, seed: number, difficulty?: Difficulty): Promise<Item> {
  if (typeof P.generateItem !== 'function') return Promise.reject(new Error('practice engine not available'));
  return P.generateItem(familyId, seed, difficulty);
}

/** Drill families, or null while the practice engine is not available. */
export function familyList(): readonly DrillFamily[] | null {
  if (typeof P.families !== 'function') return null;
  try {
    return P.families();
  } catch {
    return null;
  }
}

export function familyOf(id: string): DrillFamily | undefined {
  if (typeof P.getFamily === 'function') return P.getFamily(id);
  return familyList()?.find((f) => f.id === id);
}

export function masteryOf(c: CompetencyId): Mastery | null {
  if (typeof P.masteryOf !== 'function') return null;
  try {
    return P.masteryOf(c);
  } catch {
    return null;
  }
}

/** Mastery of one drill family when the practice module offers it (null otherwise). */
export function familyMastery(id: string): Mastery | null {
  if (typeof P.masteryOfFamily !== 'function') return null;
  try {
    return P.masteryOfFamily(id);
  } catch {
    return null;
  }
}

/**
 * The mastery a lesson drill shows: mean accuracy over the drilled families that have attempts; without family
 * mastery, the mean over their competencies. Null = no attempts yet.
 */
export function drillMastery(familyIds: readonly string[]): number | null {
  const mean = (xs: readonly (number | null | undefined)[]): number | null => {
    const ok = xs.filter((x): x is number => typeof x === 'number');
    return ok.length ? ok.reduce((a, x) => a + x, 0) / ok.length : null;
  };
  if (typeof P.masteryOfFamily === 'function') return mean(familyIds.map((f) => familyMastery(f)?.accuracy));
  const comps = [...new Set(familyIds.map((f) => familyOf(f)?.competency).filter((c): c is CompetencyId => c !== undefined))];
  return mean(comps.map((c) => masteryOf(c)?.accuracy));
}

// ── lesson progress (owned by src/practice; session memory until it is available) ────────────────────────────────

const memProgress = new Map<string, LessonProgress>();
const memVersion = signal(0);

/** Read inside a render to re-render on any progress write. */
export function progressTick(): number {
  const v = P.progressVersion;
  return memVersion.value + (v && typeof v === 'object' && 'value' in v ? v.value : 0);
}

export function getLessonProgress(id: string): LessonProgress | null {
  if (typeof P.getLessonProgress === 'function') {
    try {
      return P.getLessonProgress(id);
    } catch {
      return memProgress.get(id) ?? null;
    }
  }
  return memProgress.get(id) ?? null;
}

export function setLessonProgress(id: string, p: LessonProgress): void {
  if (typeof P.setLessonProgress === 'function') {
    try {
      P.setLessonProgress(id, p);
      return;
    } catch {
      /* fall through to session memory */
    }
  }
  memProgress.set(id, p);
  memVersion.value++;
}

// ── review cards ──────────────────────────────────────────────────────────────────────────────────────────────────

export function canScheduleReview(): boolean {
  return typeof P.scheduleReview === 'function';
}

/** Put review cards into the practice queue when the practice module offers it; returns whether it did. */
export function scheduleReview(keys: readonly string[], nowMs: number): boolean {
  if (typeof P.scheduleReview !== 'function' || keys.length === 0) return false;
  try {
    P.scheduleReview(keys, nowMs);
    return true;
  } catch {
    return false;
  }
}

// ── validation against the live catalogues ────────────────────────────────────────────────────────────────────────

/** Catalogues of the running app for validateLesson (tests/course/lessons.test.ts, dev checks). */
export function liveValidateDeps(fileId?: string): ValidateDeps {
  return {
    scenarios: scenarioList(),
    families: familyList(),
    getCase: (id) => getCase(id),
    figureIds: FIGURE_IDS,
    treeIds: TREE_IDS,
    plan: PLANNED_STAGE,
    fileId,
  };
}
