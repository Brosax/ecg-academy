/**
 * Superposes beat templates (heart-local H) along the rhythm's event list and outputs Frank H_A, H_V.
 * Superposition is exact because a voxel never carries two overlapping action potentials (refractoriness).
 */
import { localToFrankMatrix } from '../frame';
import type { AfLoop } from '../source/afField';
import type { LocalSource } from '../source/vfDriver';
import type { BeatEvent, BeatTemplate, HeartVectorStream, Mat3, Pose, RhythmGenerator, Vec3 } from '../types';
import { COMP } from '../types';

export type TemplateLookup = (ev: Extract<BeatEvent, { kind: 'A' | 'V' }>) => BeatTemplate | null;

export class TemplateStream implements HeartVectorStream {
  readonly fsHz: number;
  private M: Mat3;
  /** Longest template span seen (ms) — bounds the backward event scan. */
  private maxSpanMs = 1500;
  /** Steady (diastolic) injury vectors, heart-local frame, mV — present at all times (between beats too). */
  private dcA: Vec3 = [0, 0, 0];
  private dcV: Vec3 = [0, 0, 0];
  /** Continuous (non-beat) atrial source, e.g. the AF rotor field: one exactly periodic loop, heart-local mV. */
  private loopA: AfLoop | null = null;
  /** Continuous (non-beat) ventricular source, e.g. the VF / torsades scroll-wave field (source/vfDriver.ts). */
  private srcV: LocalSource | null = null;
  private scratchV = new Float64Array(0);

  constructor(
    private readonly rhythm: RhythmGenerator,
    private readonly lookup: TemplateLookup,
    pose: Pose,
    fsHz = 1000,
  ) {
    this.fsHz = fsHz;
    this.M = localToFrankMatrix(pose);
  }

  setPose(pose: Pose): void {
    this.M = localToFrankMatrix(pose);
  }

  setSteadyVectors(dcA: Vec3, dcV: Vec3): void {
    this.dcA = dcA;
    this.dcV = dcV;
  }

  setContinuousAtrial(loop: AfLoop | null): void {
    this.loopA = loop;
  }

  /** Heart-local ventricular field source added on top of the ventricular beat templates (null = none). */
  setContinuousVentricular(src: LocalSource | null): void {
    this.srcV = src;
  }

  sample(t0Ms: number, n: number, outA: Float32Array, outV: Float32Array): void {
    const M0 = this.M;
    const fillDc = (out: Float32Array, d: Vec3) => {
      if (d[0] === 0 && d[1] === 0 && d[2] === 0) return void out.fill(0, 0, 3 * n);
      const x = M0[0] * d[0] + M0[1] * d[1] + M0[2] * d[2];
      const y = M0[3] * d[0] + M0[4] * d[1] + M0[5] * d[2];
      const z = M0[6] * d[0] + M0[7] * d[1] + M0[8] * d[2];
      for (let i = 0; i < n; i++) {
        out[3 * i] = x;
        out[3 * i + 1] = y;
        out[3 * i + 2] = z;
      }
    };
    fillDc(outA, this.dcA);
    fillDc(outV, this.dcV);
    const dt = 1000 / this.fsHz;
    if (this.loopA) this.addLoop(this.loopA, t0Ms, n, dt, outA);
    if (this.srcV) this.addLocal(this.srcV, t0Ms, n, dt, outV);
    const t1Ms = t0Ms + n * dt;
    const events = this.rhythm.eventsUntil(t1Ms);
    const M = this.M;
    for (let e = events.length - 1; e >= 0; e--) {
      const ev = events[e];
      if (ev.tMs + this.maxSpanMs < t0Ms - 2000) break; // events are time-ordered per compartment; generous margin
      if (ev.kind === 'block' || ev.tMs > t1Ms) continue;
      const tpl = this.lookup(ev);
      if (!tpl) continue;
      const span = (tpl.n * 1000) / tpl.fsHz;
      if (span > this.maxSpanMs) this.maxSpanMs = span;
      const start = ev.tMs + tpl.t0Ms;
      if (start + span < t0Ms || start > t1Ms) continue;
      const out = tpl.comp === COMP.Atrial ? outA : outV;
      const H = tpl.H;
      const k = tpl.fsHz / 1000;
      for (let i = 0; i < n; i++) {
        const x = (t0Ms + i * dt - start) * k;
        if (x < 0 || x > tpl.n - 1) continue;
        const i0 = Math.floor(x);
        const f = x - i0;
        const i1 = Math.min(i0 + 1, tpl.n - 1);
        const hx = H[i0 * 3] * (1 - f) + H[i1 * 3] * f;
        const hy = H[i0 * 3 + 1] * (1 - f) + H[i1 * 3 + 1] * f;
        const hz = H[i0 * 3 + 2] * (1 - f) + H[i1 * 3 + 2] * f;
        out[i * 3] += M[0] * hx + M[1] * hy + M[2] * hz;
        out[i * 3 + 1] += M[3] * hx + M[4] * hy + M[5] * hz;
        out[i * 3 + 2] += M[6] * hx + M[7] * hy + M[8] * hz;
      }
    }
  }

  private addLocal(src: LocalSource, t0Ms: number, n: number, dt: number, out: Float32Array): void {
    if (this.scratchV.length < 3 * n) this.scratchV = new Float64Array(3 * n);
    const h = this.scratchV;
    h.fill(0, 0, 3 * n);
    src(t0Ms, n, dt, h);
    const M = this.M;
    for (let i = 0; i < n; i++) {
      const hx = h[3 * i], hy = h[3 * i + 1], hz = h[3 * i + 2];
      out[i * 3] += M[0] * hx + M[1] * hy + M[2] * hz;
      out[i * 3 + 1] += M[3] * hx + M[4] * hy + M[5] * hz;
      out[i * 3 + 2] += M[6] * hx + M[7] * hy + M[8] * hz;
    }
  }

  private addLoop(lp: AfLoop, t0Ms: number, n: number, dt: number, out: Float32Array): void {
    const M = this.M, H = lp.H, k = lp.fsHz / 1000, L = lp.periodMs;
    for (let i = 0; i < n; i++) {
      const t = t0Ms + i * dt;
      const x = (t - L * Math.floor(t / L)) * k;
      const i0 = Math.min(lp.n - 1, Math.floor(x));
      const i1 = i0 + 1 === lp.n ? 0 : i0 + 1;
      const f = x - i0;
      const hx = H[i0 * 3] * (1 - f) + H[i1 * 3] * f;
      const hy = H[i0 * 3 + 1] * (1 - f) + H[i1 * 3 + 1] * f;
      const hz = H[i0 * 3 + 2] * (1 - f) + H[i1 * 3 + 2] * f;
      out[i * 3] += M[0] * hx + M[1] * hy + M[2] * hz;
      out[i * 3 + 1] += M[3] * hx + M[4] * hy + M[5] * hz;
      out[i * 3 + 2] += M[6] * hx + M[7] * hy + M[8] * hz;
    }
  }
}
