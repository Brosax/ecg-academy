/**
 * Engine glue for the ventricular scroll-wave field (source/vfField.ts): one object answers, for any time t,
 *   - the ECG source: H_V contribution of the field, added by the TemplateStream on top of the beat templates,
 *   - the GPU frame: packed rotor slots + run header for the heart / slice shaders (engine.vfFrame → uVf, uVfRun),
 *   - whether the field drives the ventricles at t (cycle truth, responsible structures).
 * VF: one exactly periodic loop, always on; its source strength may decay from coarse to fine VF (the same factor dims
 * the 3D colour). TdP: one run per episode (rhythm/tdpRhythm.ts); each run's H_V is synthesized for the state of the
 * tissue when its trigger fires (the preceding beat's timing and APD scale) and cached.
 */
import type { TdpRun, TdpRhythm } from '../rhythm/tdpRhythm';
import type { ActivationField, ApdField, SourceKernel, StructureId, Vec3, VoxelGrid } from '../types';
import type { RunGate, VfSignal } from './vfField';
import { VF_HEADER_OFFSET, VF_MODE, VF_RECOVERY_TAU, VF_UPSTROKE_MS, VfModel } from './vfField';

/** Optional engine capability (SimEngine is a frozen contract): the packed ventricular field frame for the GPU. */
export interface VfFrameSource {
  /** Writes VF_FRAME_FLOATS floats (rotor slots + run header) for time t; returns the live rotor count (0 = off). */
  vfFrame(tMs: number, out: Float32Array): number;
}

/** engine.vfFrame when the engine has it, else 0 (field off). */
export function vfFrameOf(engine: object, tMs: number, out: Float32Array): number {
  const f = (engine as Partial<VfFrameSource>).vfFrame;
  return typeof f === 'function' ? f.call(engine, tMs, out) : 0;
}

/** Continuous source in the heart-local frame: accumulates 3·n samples (mV) from t0Ms at dtMs into out. */
export type LocalSource = (t0Ms: number, n: number, dtMs: number, out: Float64Array) => void;

/** Ventricular regions reported as responsible while the field drives the ventricles. */
export const VF_RESPONSIBLE: readonly StructureId[] = [
  'SEPTUM', 'LV_APEX', 'LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'RV_FREE', 'RV_APEX', 'RVOT',
];

export interface VfDriverInput {
  readonly model: VfModel;
  readonly grid: VoxelGrid;
  /** Weighted ventricular kernel and gain (mV/mm²) of the normal ventricular source. */
  readonly kernel: SourceKernel;
  readonly gain: number;
  /** Start of the scenario (coarse → fine decay origin). */
  readonly startMs: number;
  /** TdP: the episode rhythm and the fields a run is gated with. */
  readonly tdp?: {
    readonly rhythm: TdpRhythm;
    /** Slot 0 (sinus) and slot 1 (ectopic focus = trigger) activation fields. */
    readonly prevField: ActivationField;
    readonly triggerField: ActivationField;
    readonly apd: ApdField;
    readonly prevTauRepMs: number;
  };
}

export class VfDriver {
  readonly model: VfModel;
  private readonly loop: VfSignal | null = null;
  private readonly runs = new Map<string, VfSignal>();
  private readonly gainV: number;
  private readonly decay: { readonly fineFrac: number; readonly tauMs: number } | null;

  constructor(private readonly inp: VfDriverInput) {
    const m = inp.model;
    this.model = m;
    this.gainV = inp.gain * m.spec.amplitude;
    this.decay = m.spec.decay ?? null;
    if (inp.tdp) {
      // the rotor re-enters at the trigger site as soon as that site has recovered from the trigger beat
      const focus = focusPoint(inp.grid, inp.tdp.triggerField.tAct);
      m.alignWrap(0, focus, m.rhoMs(0) + VF_RECOVERY_TAU * m.tauRepMs + 5);
    } else {
      this.loop = m.buildLoop(inp.kernel, this.gainV, 500);
    }
  }

  /** From the trigger until every point of a run has recovered (ms). */
  get runSpanMs(): number {
    return this.model.runSpanMs(this.model.spec.episodes?.runMs ?? 0);
  }

  /** Source-strength factor of the fibrillating myocardium (coarse → fine VF); 1 without decay. */
  envelope(tMs: number): number {
    const d = this.decay;
    return d ? d.fineFrac + (1 - d.fineFrac) * Math.exp(-Math.max(0, tMs - this.inp.startMs) / d.tauMs) : 1;
  }

  /** The TdP run active at t (null for VF or between runs). */
  runAt(tMs: number): TdpRun | null {
    return this.inp.tdp ? this.inp.tdp.rhythm.runAt(tMs, VF_UPSTROKE_MS) : null;
  }

  /** Does the field drive the ventricles at t? */
  activeAt(tMs: number): boolean {
    return !this.inp.tdp || this.runAt(tMs) !== null;
  }

  /** H_V of the field, heart-local (stream source). */
  readonly source: LocalSource = (t0, n, dt, out) => {
    if (this.loop) {
      const lp = this.loop, H = lp.H, k = lp.fsHz / 1000, L = lp.n / k;
      for (let i = 0; i < n; i++) {
        const t = t0 + i * dt;
        const x = (t - L * Math.floor(t / L)) * k;
        const i0 = Math.min(lp.n - 1, Math.floor(x));
        const i1 = i0 + 1 === lp.n ? 0 : i0 + 1;
        const f = x - i0, g = this.envelope(t);
        out[3 * i] += g * (H[3 * i0] * (1 - f) + H[3 * i1] * f);
        out[3 * i + 1] += g * (H[3 * i0 + 1] * (1 - f) + H[3 * i1 + 1] * f);
        out[3 * i + 2] += g * (H[3 * i0 + 2] * (1 - f) + H[3 * i1 + 2] * f);
      }
      return;
    }
    const td = this.inp.tdp!;
    const t1 = t0 + n * dt;
    const rs = td.rhythm.runsUntil(t1);
    for (let r = rs.length - 1; r >= 0; r--) {
      const run = rs[r];
      if (run.endMs < t0) break;
      if (run.tMs - VF_UPSTROKE_MS > t1) continue;
      const sig = this.runSignal(run);
      const k = sig.fsHz / 1000, H = sig.H;
      for (let i = 0; i < n; i++) {
        const x = (t0 + i * dt - run.tMs - sig.t0Ms) * k;
        if (x < 0 || x > sig.n - 1) continue;
        const i0 = Math.floor(x), f = x - i0, i1 = Math.min(i0 + 1, sig.n - 1);
        out[3 * i] += H[3 * i0] * (1 - f) + H[3 * i1] * f;
        out[3 * i + 1] += H[3 * i0 + 1] * (1 - f) + H[3 * i1 + 1] * f;
        out[3 * i + 2] += H[3 * i0 + 2] * (1 - f) + H[3 * i1 + 2] * f;
      }
    }
  };

  /** TdP: synthesizes the first run of the scenario (and the beat templates its timing needs) ahead of playback. */
  warm(): void {
    const td = this.inp.tdp;
    if (!td) return;
    // on a copy of the rhythm: generating ahead here would delay later rate changes by the same horizon
    const first = td.rhythm.previewRun();
    if (first) this.runSignal(first);
  }

  /** Run gate for a run (what the GPU receives in uVfRun, as grid fields for the CPU synthesis). */
  gateOf(run: TdpRun): RunGate {
    const td = this.inp.tdp!;
    return {
      tActPrev: td.prevField.tAct, tActTrigger: td.triggerField.tAct, apdRefMs: td.apd.apdRefMs,
      prevRelMs: run.prev.tMs - run.tMs, prevApdScale: run.prev.apdScale, prevTauRepMs: td.prevTauRepMs, runMs: run.runMs,
    };
  }

  /** H_V of one run (cached per preceding-beat state: same trigger coupling and APD scale → same run). */
  runSignal(run: TdpRun): VfSignal {
    const key = `${Math.round(run.prev.tMs - run.tMs)}|${run.prev.apdScale.toFixed(3)}|${run.runMs}`;
    let s = this.runs.get(key);
    if (!s) {
      s = this.model.buildRun(this.inp.kernel, this.gainV, this.gateOf(run));
      this.runs.set(key, s);
      if (this.runs.size > 8) this.runs.delete(this.runs.keys().next().value!);
    }
    return s;
  }

  /** Packed GPU frame for time t (VF_FRAME_FLOATS floats); returns the live rotor count, 0 when the field is off. */
  frame(tMs: number, out: Float32Array): number {
    const h = VF_HEADER_OFFSET;
    if (!this.inp.tdp) {
      const n = this.model.pack(tMs, out);
      out.fill(0, h, h + 8);
      out[h + 4] = VF_RECOVERY_TAU;
      out[h + 6] = this.envelope(tMs);
      out[h + 7] = VF_MODE.Continuous;
      return n;
    }
    const run = this.runAt(tMs);
    if (!run) return 0;
    const tRun = tMs - run.tMs;
    this.model.pack(tRun, out, 0);
    // slot 1: the same rotor at the run end (last accepted upstroke at every point for t > D)
    this.model.pack(run.runMs, out, 1);
    out[h] = tRun;
    out[h + 1] = run.runMs;
    out[h + 2] = run.prev.tMs - run.tMs;
    out[h + 3] = run.prev.apdScale;
    out[h + 4] = VF_RECOVERY_TAU;
    out[h + 5] = this.inp.tdp.prevTauRepMs;
    out[h + 6] = 1;
    out[h + 7] = VF_MODE.Run;
    return 1;
  }
}

/** Position (local mm) of the earliest-activated voxel of an ectopic field (its focus). */
function focusPoint(g: VoxelGrid, tAct: Float32Array): Vec3 {
  let best = -1, bt = Infinity;
  for (let v = 0; v < tAct.length; v++) if (tAct[v] < bt) {
    bt = tAct[v];
    best = v;
  }
  const [nx, ny] = g.dims;
  if (best < 0) return [0, 0, 0];
  return [g.originMm[0] + (best % nx) * g.hMm, g.originMm[1] + (Math.floor(best / nx) % ny) * g.hMm, g.originMm[2] + Math.floor(best / (nx * ny)) * g.hMm];
}
