/**
 * Where practice items get their ECGs: the synthetic engine (src/synth) and the real PTB-XL library (src/real), behind
 * a small dependency-injection seam so tests (and the period while the engine is being built) can supply a fake.
 *
 *   ecgOf(source)      resolves an EcgSource to an Ecg (synthetic: generate(); real: loadRealEcg()), cached
 *   synthOf(req)       the full SynthResult (generators also read `axisAmbiguous` / `applied`)
 *   peekEcg(source)    the Ecg when already resolved (synchronous; no placeholder flash)
 *   setPracticePorts   replace the synth and/or real port (tests); clears the cache
 *
 * The cache key of a synthetic request is a stable serialization of the request (not object identity), so the same
 * item opened twice never regenerates its tracing.
 */
import type { Ecg } from '../../core/ecg';
import type { FindingId } from '../../core/findings';
import type { Rng } from '../../core/rng';
import * as realMod from '../../real/index';
import type { RealCaseMeta } from '../../real/index';
import * as synthMod from '../../synth/index';
import type { Difficulty, DialId, ScenarioDef, ScenarioGroup, SynthRequest, SynthResult } from '../../synth/index';
import type { EcgSource } from '../api';

export interface SynthPort {
  generate(req: SynthRequest): SynthResult;
  scenarios(filter?: { readonly group?: ScenarioGroup; readonly finding?: FindingId }): readonly ScenarioDef[];
  drawDials(scenarioId: string, rng: Rng, difficulty: Difficulty): Readonly<Partial<Record<DialId, number>>>;
}

export interface RealPort {
  cases(): readonly RealCaseMeta[];
  load(id: number): Promise<Ecg>;
  /** findings the labels allow without asserting them (graded "consistent", never "wrong") */
  compatible(codes: Readonly<Record<string, number>>, stadium: string | null): readonly FindingId[];
}

const defaultSynth: SynthPort = {
  generate: (req) => synthMod.generate(req),
  scenarios: (filter) => synthMod.scenarios(filter),
  drawDials: (id, rng, d) => synthMod.drawDials(id, rng, d),
};

const defaultReal: RealPort = {
  cases: () => realMod.getLibrary().cases,
  load: (id) => realMod.loadRealEcg(id),
  compatible: (codes, stadium) => realMod.compatibleFindings(codes, stadium),
};

let synthPort: SynthPort = defaultSynth;
let realPort: RealPort = defaultReal;

export function ports(): { readonly synth: SynthPort; readonly real: RealPort } {
  return { synth: synthPort, real: realPort };
}

/** Replace the synth and/or real port (null restores the default). Clears the ECG cache. */
export function setPracticePorts(p: { readonly synth?: SynthPort | null; readonly real?: RealPort | null }): void {
  if (p.synth !== undefined) synthPort = p.synth ?? defaultSynth;
  if (p.real !== undefined) realPort = p.real ?? defaultReal;
  clearEcgCache();
}

// ── cache ────────────────────────────────────────────────────────────────────────────────────────────────────────
const CACHE_SIZE = 24;

/** Insertion-ordered Map used as a small LRU. */
class Lru<V> {
  private readonly m = new Map<string, V>();
  constructor(private readonly size: number) {}
  get(k: string): V | undefined {
    const v = this.m.get(k);
    if (v !== undefined) {
      this.m.delete(k);
      this.m.set(k, v);
    }
    return v;
  }
  set(k: string, v: V): void {
    this.m.delete(k);
    this.m.set(k, v);
    while (this.m.size > this.size) {
      const first = this.m.keys().next();
      if (first.done) break;
      this.m.delete(first.value);
    }
  }
  delete(k: string): void {
    this.m.delete(k);
  }
  clear(): void {
    this.m.clear();
  }
}

const pending = new Lru<Promise<SynthResult | Ecg>>(CACHE_SIZE);
const done = new Lru<SynthResult | Ecg>(CACHE_SIZE);

export function clearEcgCache(): void {
  pending.clear();
  done.clear();
}

/** JSON with sorted object keys (stable across property order). */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'undefined';
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}

export function sourceKey(s: EcgSource): string {
  return s.kind === 'synth' ? `synth:${stableStringify(s.req)}` : `real:${s.id}`;
}

const isSynthResult = (x: SynthResult | Ecg): x is SynthResult => 'ecg' in x && 'applied' in x;

/** The full synthetic result for a request (cached). Rejects when the engine throws. */
export function synthOf(req: SynthRequest): Promise<SynthResult> {
  const key = sourceKey({ kind: 'synth', req });
  const hit = pending.get(key);
  if (hit) return hit as Promise<SynthResult>;
  const port = synthPort;
  const p: Promise<SynthResult> = Promise.resolve().then(() => port.generate(req));
  pending.set(key, p);
  p.then(
    (r) => done.set(key, r),
    () => pending.delete(key),
  );
  return p;
}

/** Resolve an item's ECG (synthetic or real), cached. */
export function ecgOf(source: EcgSource): Promise<Ecg> {
  if (source.kind === 'synth') return synthOf(source.req).then((r) => r.ecg);
  const key = sourceKey(source);
  const hit = pending.get(key);
  if (hit) return hit as Promise<Ecg>;
  const p = realPort.load(source.id);
  pending.set(key, p);
  p.then(
    (e) => done.set(key, e),
    () => pending.delete(key),
  );
  return p;
}

/** The ECG of a source when it is already resolved (synchronous), else null. */
export function peekEcg(source: EcgSource): Ecg | null {
  const v = done.get(sourceKey(source));
  if (!v) return null;
  return isSynthResult(v) ? v.ecg : v;
}
