/**
 * Beat-template cache keyed by (variant, RR_prev bucket). Templates hold H in the heart-LOCAL frame; the
 * TemplateStream applies the pose, so setPose never recomputes anything.
 * APD rate adaptation: APD × (bucketRR / RRref)^rateExp. SinusRhythm gives V events apdScale with the exact RR_prev,
 * so 3D colouring (exact scale) and the template (bucket centre) differ by ≤ ~1 % with 20 ms buckets — documented
 * trade-off for caching.
 */
import { apdScaleFor } from '../conduction/apd';
import type { NotchField } from '../source/apNotch';
import { synthesizeTemplate } from '../source/voxelEdl';
import type { ActivationField, ApParams, BeatEvent, BeatTemplate, SourceKernel } from '../types';

export interface TemplateSource {
  readonly kernel: SourceKernel;
  readonly field: ActivationField;
  readonly apdRefMs: Float32Array;
  readonly ap: ApParams;
  /** mV per mm². */
  readonly gain: number;
  /** Optional phase-1 AP notch (source/apNotch.ts; tissue.notch). */
  readonly notch?: NotchField | null;
}

export interface TemplateCacheOptions {
  readonly rrRefMs: number;
  readonly rateExp: number;
  readonly bucketMs: number;
  readonly fsHz: number;
  /** Max cached templates (oldest evicted). */
  readonly capacity?: number;
}

export class TemplateCache {
  private readonly cache = new Map<string, BeatTemplate>();
  /** Synthesis time of the last built template (ms) — reported by the engine. */
  lastBuildMs = 0;

  constructor(
    private readonly sources: ReadonlyMap<string, TemplateSource>,
    private readonly opt: TemplateCacheOptions,
  ) {}

  bucket(rrPrevMs: number): number {
    const b = this.opt.bucketMs;
    return Math.max(b, Math.round(rrPrevMs / b) * b);
  }

  apdScale(rrPrevMs: number): number {
    return apdScaleFor(this.bucket(rrPrevMs), this.opt.rrRefMs, this.opt.rateExp);
  }

  get(variant: string, rrPrevMs: number): BeatTemplate | null {
    const src = this.sources.get(variant);
    if (!src) return null;
    const rr = this.bucket(rrPrevMs);
    const key = `${variant}|${rr}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const t0 = performance.now();
    const { template } = synthesizeTemplate({
      key, kernel: src.kernel, tAct: src.field.tAct, apdRefMs: src.apdRefMs,
      apdScale: apdScaleFor(rr, this.opt.rrRefMs, this.opt.rateExp), ap: src.ap, gain: src.gain, fsHz: this.opt.fsHz,
      notch: src.notch,
    });
    this.lastBuildMs = performance.now() - t0;
    this.cache.set(key, template);
    const cap = this.opt.capacity ?? 256;
    if (this.cache.size > cap) this.cache.delete(this.cache.keys().next().value as string);
    return template;
  }

  /** TemplateStream lookup. */
  readonly lookup = (ev: Extract<BeatEvent, { kind: 'A' | 'V' }>): BeatTemplate | null => this.get(ev.variant, ev.rrPrevMs);

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}
