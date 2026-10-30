/**
 * Composition (DECISION §6.3): scenario + variant patch → one SourceSpec; the validator rejects combinations without a
 * calibrated mechanism (with the reason). Fixed precedence (each stage sees only the previous output): rhythm →
 * junction (per-beat pattern) → activation pattern → substrate → conduction stretch → repolarisation → injury →
 * near-field extras → geometry → placement → recording chain (ventricular.ts, scheduler.ts, chain.ts).
 */
import type { FindingId } from '../../core/findings';
import type { DeepPartial, ScenarioDef, SourceSpec, VentOrigin } from '../api';
import { ECTOPIC_SITES, NORMAL_PATTERN, patternForBlocks, PREEXCITED_SITES } from './patterns';
import type { VentPatternInput } from './ventricular';

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Deep merge of a DeepPartial patch: objects merge, arrays and primitives replace, a rhythm of another kind replaces. */
export function mergePatch<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T;
  const b = base as Record<string, unknown>;
  const p = patch as Record<string, unknown>;
  if ('kind' in p && 'kind' in b && p.kind !== b.kind) return patch as T;
  const out: Record<string, unknown> = { ...b };
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) && isPlainObject(b[k]) ? mergePatch(b[k], v as never) : v;
  }
  return out as T;
}

export interface Resolved {
  readonly source: SourceSpec;
  readonly declared: readonly FindingId[];
}

export function resolveScenario(def: ScenarioDef, variant: string | undefined): Resolved {
  if (variant === undefined) return { source: def.source, declared: def.findings };
  const v = def.variants?.[variant];
  if (!v) throw new Error(`src/synth: scenario '${def.id}' has no variant '${variant}' (known: ${Object.keys(def.variants ?? {}).join(', ') || 'none'})`);
  const merged = mergePatch(def.source, v.patch);
  // an activation patch is a whole activation (a block set is one state: RBBB + LPFB must not keep the base's LAF block)
  const source = v.patch.activation
    ? { ...merged, activation: { kind: def.source.activation.kind, ...v.patch.activation } as SourceSpec['activation'] }
    : merged;
  return { source, declared: v.findings ?? def.findings };
}

/** The pattern of supraventricular-conducted beats. */
export function nativePattern(src: SourceSpec): { pattern: VentPatternInput; kind: 'conducted' | 'preexcited' } {
  const a = src.activation;
  if (a.kind === 'preexcited') {
    if (a.blocks && Object.values(a.blocks).some(Boolean)) throw new Error('src/synth: pre-excitation with a bundle-branch block is not calibrated');
    const site = PREEXCITED_SITES[a.pathway];
    if (!site) throw new Error(`src/synth: pathway site '${a.pathway}' needs the generated pre-excitation family (frontsynth, not calibrated yet)`);
    return { pattern: { key: site.id, lobes: site.lobes, activation: site.activation }, kind: 'preexcited' };
  }
  const p = patternForBlocks(a.blocks);
  if (!p) throw new Error(`src/synth: no calibrated activation pattern for blocks ${JSON.stringify(a.blocks ?? {})} yet (synth-morph)`);
  return { pattern: { key: p.id, lobes: p.lobes, activation: p.activation, plateauSlope: p.plateauSlope }, kind: 'conducted' };
}

export function ectopicPattern(origin: VentOrigin): VentPatternInput {
  const e = ECTOPIC_SITES[origin];
  if (!e) throw new Error(`src/synth: ventricular origin '${origin}' needs the generated ectopic family (frontsynth, not calibrated yet)`);
  return { key: e.id, lobes: e.lobes, activation: e.activation };
}

/** Validate a resolved source (throws with the reason). Builders throw for the finer cases they do not support. */
export function validateSource(src: SourceSpec): void {
  const r = src.rhythm;
  if (r.kind === 'sinus' && (r.rateBpm < 20 || r.rateBpm > 220)) throw new Error('src/synth: sinus rate outside 20–220/min');
  if (r.kind === 'flutter' && (r.cycleMs < 150 || r.cycleMs > 350)) throw new Error('src/synth: flutter cycle outside 150–350 ms');
  if (r.kind === 'fibrillation' && (r.cycleMs < 90 || r.cycleMs > 250)) throw new Error('src/synth: AF stream cycle outside 90–250 ms');
  if (src.activation.kind === 'preexcited' && !src.junction?.pathway) throw new Error('src/synth: a pre-excited activation needs junction.pathway');
  if (src.repol?.qtcMs !== undefined && (src.repol.qtcMs < 280 || src.repol.qtcMs > 700)) throw new Error('src/synth: QTc outside 280–700 ms');
  if ((src.substrate?.conduction ?? 1) < 0.7 || (src.substrate?.conduction ?? 1) > 2.6) throw new Error('src/synth: conduction factor outside 0.7–2.6');
}

/** Base QRS duration of the pattern a scenario uses for conducted beats (for the qrs dial). */
export function baseQrsMs(src: SourceSpec): number {
  const p = src.activation.kind === 'conducted' ? (patternForBlocks(src.activation.blocks) ?? NORMAL_PATTERN) : null;
  const lobes = p ? p.lobes : nativePattern(src).pattern.lobes;
  return Math.max(...lobes.map((l) => l.end)) - Math.min(...lobes.map((l) => l.on));
}
