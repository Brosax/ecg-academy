/**
 * Synthetic exemplars for atlas pages: which scenarios / variants show a finding, the reproducible request for each,
 * and a small result cache so revisiting a page (or switching language) never regenerates. The synth engine is passed
 * in, so the selection logic is pure and testable without the engine.
 */
import type { FindingId } from '../core/findings';
import { FINDINGS } from '../core/findings';
import type { L10n } from '../core/l10n';
import { hashString } from '../core/rng';
import type { RecordingSpec, ScenarioDef, SynthRequest, SynthResult } from '../synth/api';
import type { AtlasEntry } from './schema';

export interface ExemplarOption {
  /** stable key `${scenarioId}` or `${scenarioId}:${variant}` */
  readonly key: string;
  readonly scenario: string;
  readonly variant?: string;
  readonly label: L10n;
  /** recording-chain override (entry fallback for technical findings): same heart, different recording */
  readonly recording?: RecordingSpec;
}

/** Most chips shown for one finding (a page is not a scenario browser). */
export const MAX_OPTIONS = 8;

function scenarioLabel(s: ScenarioDef): L10n {
  const first = s.findings[0];
  return s.title ?? (first ? FINDINGS[first].name : { zh: s.id, en: s.id, es: s.id });
}

/**
 * Exemplar options for a finding: the entry's preferred scenarios first (when the catalogue has them), then every
 * scenario the catalogue lists for the finding; each scenario contributes its base form and its variants. A variant
 * whose declared findings exclude the finding is skipped (it would show something else).
 */
export function exemplarOptions(id: FindingId, entry: AtlasEntry | undefined, all: readonly ScenarioDef[], forFinding: readonly ScenarioDef[]): ExemplarOption[] {
  const byId = new Map(all.map((s) => [s.id, s]));
  const ordered: ScenarioDef[] = [];
  const add = (s: ScenarioDef | undefined) => {
    if (s && !ordered.some((x) => x.id === s.id)) ordered.push(s);
  };
  for (const sid of entry?.exemplar?.scenarios ?? []) add(byId.get(sid));
  for (const s of forFinding) add(s);

  const out: ExemplarOption[] = [];
  for (const s of ordered) {
    out.push({ key: s.id, scenario: s.id, label: scenarioLabel(s) });
    for (const [vid, v] of Object.entries(s.variants ?? {})) {
      if (v.findings && !v.findings.includes(id) && !s.findings.includes(id)) continue;
      out.push({ key: `${s.id}:${vid}`, scenario: s.id, variant: vid, label: v.label });
    }
    if (out.length >= MAX_OPTIONS) break;
  }
  // no catalogue scenario yet: the entry's recording-chain fallback (a technical finding shown on a normal heart)
  const fb = entry?.exemplar?.fallback;
  if (out.length === 0 && fb && byId.has(fb.scenario)) {
    out.push({ key: `${fb.scenario}~${id}`, scenario: fb.scenario, label: fb.label, recording: fb.recording });
  }
  // the entry may ask for a specific variant of its preferred scenario: put it first
  const pv = entry?.exemplar?.variant;
  if (pv) {
    const i = out.findIndex((o) => o.variant === pv);
    if (i > 0) out.unshift(...out.splice(i, 1));
  }
  return out.slice(0, MAX_OPTIONS);
}

/** Reproducible seed for the n-th example of an option on a finding page (n = 0, 1, 2 …). */
export function exemplarSeed(id: FindingId, optionKey: string, n: number): number {
  return (hashString(`atlas:${id}:${optionKey}`) + Math.imul(n, 0x9e3779b1)) >>> 0;
}

export function exemplarRequest(id: FindingId, opt: ExemplarOption, n: number, entry?: AtlasEntry): SynthRequest {
  const dials = entry?.exemplar?.dials;
  return {
    scenario: opt.scenario,
    ...(opt.variant ? { variant: opt.variant } : {}),
    seed: exemplarSeed(id, opt.key, n),
    ...(dials && opt.scenario === entry?.exemplar?.scenarios?.[0] ? { dials } : {}),
    ...(opt.recording ? { recording: opt.recording } : {}),
    durationS: 10,
  };
}

/** Outcome of one generation: the result, or the reason there is none. */
export type Generated = { readonly ok: true; readonly result: SynthResult } | { readonly ok: false; readonly error: string };

const CACHE_MAX = 16;
const cache = new Map<string, Generated>();

/** Generate (or reuse) a synthetic ECG; never throws — the engine may be unavailable or reject a request. */
export function generateCached(req: SynthRequest, generate: (r: SynthRequest) => SynthResult): Generated {
  const key = JSON.stringify(req);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  let out: Generated;
  try {
    out = { ok: true, result: generate(req) };
  } catch (e) {
    out = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  cache.set(key, out);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return out;
}

/** Peek without generating (used to render synchronously when the result is already known). */
export function peekCached(req: SynthRequest): Generated | undefined {
  return cache.get(JSON.stringify(req));
}
