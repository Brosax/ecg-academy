/**
 * Ventricular fibrillation / torsades de pointes source: a closed-form phase field of scroll waves in the ventricular
 * myocardium — the ventricular twin of the AF rotor field (source/afField.ts), with the same packed layout and math.
 *
 * Each rotor i is a scroll wave whose filament is the line through its core c_i along n_i = e1_i × e2_i:
 *   θ(p, t) = ψ_i(t) − k_i·|p − c_i(t)| − atan2((p − c_i)·e2_i, (p − c_i)·e1_i),   ψ_i(t) = ω_i·t + ψ0_i (mod 2π)
 * and every point fires when θ wraps: τ = (θ mod 2π)/ω_i − δ is the time since its local upstroke, s = AP(τ).
 *   VF  — several rotors, each owning the ventricular tissue nearest to its anchor (static Voronoi partition: the borders
 *         read as lines of functional block); transmural filaments (n = the wall's transmural direction at the anchor),
 *         meandering cores, incommensurate cycle lengths → an irregular, never-repeating-looking sum. ω·L = 2π·integer
 *         and the meander runs whole turns per L, so the field is exactly periodic in the loop length L.
 *   TdP — one rotor whose filament PRECESSES: n turns slowly about a fixed body axis m (default anteroposterior), so the
 *         plane in which the activation (and the heart vector) rotates turns with it. A limb lead whose axis lies in the
 *         plane ⊥ m sees the rotating vector edge-on twice per precession turn: the complexes shrink to a node and come
 *         back with the opposite polarity — the "twisting of the points". The rotor runs in episodes (runs): the first
 *         wave is the R-on-T trigger beat from the ectopic focus; a point joins the rotor at its first wrap after it has
 *         recovered (from the trigger beat or from the preceding sinus beat), so tissue still repolarizing when the
 *         trigger arrives blocks it (unidirectional block in the dispersion of repolarization) and is entered later by the
 *         re-entrant wave. After the run length D no new upstroke is accepted; every point completes its last AP.
 *
 * One source: the ECG uses H_V(t) = −gain·Σ c_v·s_v(t) with s from this formula (kernel voxels merged into ≈4.5 mm patches
 * whose Σc is the sum of their voxels' c, so Σc ≡ 0 still holds); the GPU colours and moves the ventricles with the same
 * formula from the same packed numbers (packFrame → uniforms uVf / uVfRun, GLSL twin hvVfTau / hvVfState in
 * view3d/shaders/chunks.ts). Rotor slots use the AF layout (afTauPacked is the CPU twin of both GLSL functions).
 * Fibrillating myocardium: short APD (ρ ≈ 0.5–0.6·CL, τr ≈ 15–20 ms), so every point repolarizes within its cycle.
 */
import type { Pose, SourceKernel, Vec3, VoxelGrid } from '../types';
import { TISSUE } from '../types';
import { AF_STRIDE, AF_UPSTROKE_MS, afAp, afTauPacked } from './afField';

/** Rotors supported by the GPU uniform block (TdP uses slot 0 for "now" and slot 1 for the frame at the run end). */
export const VF_MAX_ROTORS = 6;
/** Floats per rotor (5 × vec4, same layout as the AF field). */
export const VF_STRIDE = AF_STRIDE;
/** Phase wrap → local upstroke delay (ms), as in the AF field. */
export const VF_UPSTROKE_MS = AF_UPSTROKE_MS;
/** Offset of the 2-vec4 header (uVfRun) after the rotor slots in a packed ventricular frame. */
export const VF_HEADER_OFFSET = VF_STRIDE * VF_MAX_ROTORS;
export const VF_FRAME_FLOATS = VF_HEADER_OFFSET + 8;
/** A new upstroke is accepted once the previous AP has decayed to the level of an upstroke foot: ρ + 4·τr. */
export const VF_RECOVERY_TAU = 4;
/** Header mode (uVfRun[1].w): continuous field (VF) or run-gated rotor (TdP episode). */
export const VF_MODE = { Continuous: 1, Run: 2 } as const;

export const VF_TAU_UP = 2.5;
export const VF_SLOPE = 0.3;
const TWO_PI = 2 * Math.PI;
const PATCH_VOXELS = 3;
const KNOT_MS = 20;

/** Episodes of torsades de pointes on a long-QT sinus rhythm (rhythm/tdpRhythm.ts). */
export interface TdpEpisodeSpec {
  /** Plain sinus beats at the start of each episode cycle (long QT visible). */
  readonly sinusBeats: number;
  /** Coupling of the isolated PVC after the preceding sinus QRS, as a fraction of the sinus RR ("short" cycle). */
  readonly pvcCouplingFrac: number;
  /** Coupling of the R-on-T trigger after the post-pause sinus beat: its T end (model truth) minus this (ms). */
  readonly triggerBeforeTEndMs: number;
  /** Run length D (ms): no new upstroke is accepted after D; then every point completes its last AP. */
  readonly runMs: number;
  /** Faster sinus rates suppress the pause-dependent episodes (overdrive suppression): none at or above this rate. */
  readonly suppressAtBpm: number;
}

export interface VfSpec {
  /** Rotor cycle lengths (ms). VF: several rotors (150–250 ms → 4–6.7 Hz); TdP: one (240–400 ms → 150–250/min). */
  readonly cycleMs: readonly number[];
  /** Conduction velocity (mm/ms) — sets the spiral pitch k = 2π / (cv·CL). */
  readonly cvMmPerMs: number;
  /** Meander radius of the cores (mm) and whole turns per loop. */
  readonly meanderMm: number;
  readonly meanderTurns: readonly number[];
  /** AP half-repolarization time as a fraction of the rotor's cycle length, and repolarization time constant (ms). */
  readonly apdFrac: number;
  readonly tauRepMs: number;
  /** Source strength relative to the normal ventricular gain. */
  readonly amplitude: number;
  /** Loop length (ms): the field is exactly periodic in it (VF loop; for TdP longer than a run). */
  readonly periodMs: number;
  /**
   * TdP: the filament precesses about a body axis (disease-spec frame: +x left, +y inferior, +z anterior), one turn per
   * periodMs (rounded to whole turns per loop). The filament starts along the heart's long axis.
   */
  readonly precession?: { readonly periodMs: number; readonly axis: Vec3 };
  /** Coarse → fine VF: the fibrillating myocardium's source strength decays to fineFrac with time constant tauMs. */
  readonly decay?: { readonly fineFrac: number; readonly tauMs: number };
  /** TdP: the rotor runs in episodes initiated by short–long–short sequences on a long-QT sinus rhythm. */
  readonly episodes?: TdpEpisodeSpec;
  readonly seed: number;
}

/** Periodic (VF) or finite (TdP run) H_V in the heart-local frame (mV), sampled at fsHz from t0Ms. */
export interface VfSignal {
  readonly fsHz: number;
  readonly n: number;
  readonly t0Ms: number;
  readonly H: Float32Array;
}

/** What a run needs to know about the tissue state when the trigger fires (grid-sized fields + the preceding beat). */
export interface RunGate {
  /** Activation of the preceding (sinus) beat, ms after its V event; +Infinity where not activated. */
  readonly tActPrev: Float32Array;
  /** Activation of the trigger beat from the ectopic focus, ms after the trigger; +Infinity where not reached. */
  readonly tActTrigger: Float32Array;
  readonly apdRefMs: Float32Array;
  /** Preceding beat: its V event relative to the trigger (ms, ≤ 0), APD scale and repolarization time constant. */
  readonly prevRelMs: number;
  readonly prevApdScale: number;
  readonly prevTauRepMs: number;
  readonly runMs: number;
}

/** Recovery of the preceding beat at a point: its repolarization time + 4·τr (ms after the trigger). */
export const prevRecovery = (g: Pick<RunGate, 'prevRelMs' | 'prevApdScale' | 'prevTauRepMs'>, tActPrev: number, apdRef: number): number =>
  Number.isFinite(tActPrev) ? g.prevRelMs + tActPrev + apdRef * g.prevApdScale + VF_RECOVERY_TAU * g.prevTauRepMs : -Infinity;

/**
 * Run gating at one point — CPU twin of the GLSL hvVfState run branch. Returns [first allowed wrap time g (ms after the
 * trigger), trigger upstroke a (or NaN when the trigger is blocked / does not reach the point)].
 */
export function runGateAt(g: RunGate, rho: number, tauRep: number, tActPrev: number, tActTrig: number, apdRef: number): [number, number] {
  const rec = prevRecovery(g, tActPrev, apdRef);
  const pvc = Number.isFinite(tActTrig) && tActTrig - VF_UPSTROKE_MS >= rec;
  const gate = pvc ? tActTrig + rho + VF_RECOVERY_TAU * tauRep : rec;
  return [Math.max(0, gate), pvc ? tActTrig : NaN];
}

/** Sentinel τ of vfStatePacked / GLSL hvVfState: the field does not drive the point (the beats apply). */
export const VF_NONE = -1e4;

/**
 * Ventricular field state at p from a packed frame (rotor slots + header) — the CPU twin of GLSL hvVfState, line by
 * line. tAct0 / tAct1 = the point's slot-0 / slot-1 activation (+Infinity or ≥ 1000 = none), apdRef = its APD.
 * out = [tau, rho, tauRep]; tau = VF_NONE where the field does not drive p.
 */
export function vfStatePacked(f: Float32Array | Float64Array, nRotors: number, p: Vec3, tAct0: number, tAct1: number, apdRef: number, out: Float64Array): void {
  const h = VF_HEADER_OFFSET, mode = f[h + 7];
  out[0] = VF_NONE;
  out[1] = 1;
  out[2] = 1;
  if (nRotors <= 0) return;
  if (mode > 1.5) {
    const VALID = 1000;
    const rho = f[3], tr = f[16];
    const rec = tAct0 < VALID ? f[h + 2] + tAct0 + apdRef * f[h + 3] + f[h + 4] * f[h + 5] : -1e9;
    const trig = tAct1 < VALID && tAct1 - VF_UPSTROKE_MS >= rec;
    const g = Math.max(trig ? tAct1 + rho + f[h + 4] * tr : rec, 0);
    const live = f[h] <= f[h + 1];
    const r = new Float64Array(3);
    afTauPacked(live ? f : f.subarray(VF_STRIDE), 1, p[0], p[1], p[2], r);
    const lw = (live ? f[h] : f[h + 1]) - r[0] - VF_UPSTROKE_MS;
    if (lw >= g) {
      out[0] = f[h] - lw - VF_UPSTROKE_MS;
      out[1] = r[1];
      out[2] = r[2];
    } else if (trig && f[h] >= tAct1 - VF_UPSTROKE_MS) {
      out[0] = f[h] - tAct1;
      out[1] = rho;
      out[2] = tr;
    }
  } else if (mode > 0.5) {
    afTauPacked(f, nRotors, p[0], p[1], p[2], out);
  }
}

/** Disease-spec direction (+x left, +y inferior, +z anterior) → heart-local unit vector for a pose. */
export function specDirToLocal(pose: Pose, v: Vec3): Vec3 {
  const a: Vec3 = [v[0], -v[1], v[2]]; // spec → app
  const R = pose.R; // local → app; inverse = transpose
  return normalize([R[0] * a[0] + R[3] * a[1] + R[6] * a[2], R[1] * a[0] + R[4] * a[1] + R[7] * a[2], R[2] * a[0] + R[5] * a[1] + R[8] * a[2]]);
}

export class VfModel {
  readonly n: number;
  readonly periodMs: number;
  readonly tauRepMs: number;
  /** Ventricular centroid (local mm). */
  readonly centroid: Vec3;
  private readonly anchor: Float64Array;
  private readonly e1: Float64Array;
  private readonly e2: Float64Array;
  private readonly omega: Float64Array;
  private readonly k: Float64Array;
  private readonly rho: Float64Array;
  private readonly turns: Float64Array;
  private readonly turnPhase: Float64Array;
  private readonly psi0: Float64Array;
  private readonly meanderMm: number;
  /** Precession axis (local, unit) and whole turns per loop; null without precession. */
  private readonly prec: { readonly m: Vec3; readonly turns: number } | null;
  private readonly frame = new Float64Array(VF_FRAME_FLOATS);

  constructor(
    private readonly grid: VoxelGrid,
    readonly spec: VfSpec,
    /** Precession axis in the heart-local frame (the engine converts spec.precession.axis with the pose). */
    precessionAxisLocal?: Vec3,
  ) {
    const n = Math.max(1, Math.min(VF_MAX_ROTORS, spec.cycleMs.length));
    this.n = n;
    this.periodMs = spec.periodMs;
    this.tauRepMs = spec.tauRepMs;
    this.meanderMm = spec.meanderMm;
    this.anchor = new Float64Array(3 * n);
    this.e1 = new Float64Array(3 * n);
    this.e2 = new Float64Array(3 * n);
    this.omega = new Float64Array(n);
    this.k = new Float64Array(n);
    this.rho = new Float64Array(n);
    this.turns = new Float64Array(n);
    this.turnPhase = new Float64Array(n);
    this.psi0 = new Float64Array(n);
    const vent = ventricularPoints(grid);
    this.centroid = vent.centroid;
    const L = spec.periodMs;
    if (spec.precession && precessionAxisLocal) {
      const m = normalize(precessionAxisLocal);
      // filament starts along the long axis (local +y), projected into the plane ⊥ m; e2 = m stays fixed, so the
      // rotation plane span(e1, m) turns with the filament
      const y: Vec3 = [0, 1, 0];
      let n0 = normalize(sub(y, scale(m, dot(m, y))));
      if (norm(n0) < 0.5) n0 = normalize(cross(m, [1, 0, 0]));
      const e1 = normalize(cross(m, n0));
      for (let i = 0; i < n; i++) {
        this.anchor.set(vent.centroid, 3 * i);
        this.e1.set(e1, 3 * i);
        this.e2.set(m, 3 * i);
      }
      this.prec = { m, turns: Math.max(1, Math.round(L / spec.precession.periodMs)) };
    } else {
      const anchors = farthestPoints(vent.pts, n, atrialCentroid(grid));
      for (let i = 0; i < n; i++) {
        const a = anchors[i];
        // transmural filament: normal = the wall's transmural direction at the anchor voxel
        const td = grid.transDir;
        let nrm: Vec3 = normalize([td[3 * a.v], td[3 * a.v + 1], td[3 * a.v + 2]]);
        if (norm(nrm) < 0.5) nrm = normalize(sub(a.p, vent.centroid));
        const ref: Vec3 = Math.abs(nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        const u = normalize(cross(nrm, ref));
        const v = cross(nrm, u);
        const chir = i % 2 === 0 ? 1 : -1;
        this.anchor.set(a.p, 3 * i);
        this.e1.set(u, 3 * i);
        this.e2.set([v[0] * chir, v[1] * chir, v[2] * chir], 3 * i);
      }
      this.prec = null;
    }
    for (let i = 0; i < n; i++) {
      const cycles = Math.max(1, Math.round(L / spec.cycleMs[i]));
      const cl = L / cycles;
      this.omega[i] = (TWO_PI * cycles) / L;
      this.k[i] = TWO_PI / (spec.cvMmPerMs * cl);
      this.rho[i] = spec.apdFrac * cl;
      this.turns[i] = spec.meanderTurns[i % spec.meanderTurns.length] ?? 2;
      this.turnPhase[i] = ((spec.seed * 7919 + i * 2654435761) % 6283) / 1000;
    }
  }

  /** Rotor cycle length (ms) after rounding to an integer number of cycles per loop. */
  cycleMs(i: number): number {
    return TWO_PI / this.omega[i];
  }

  /** Half-repolarization time ρ of rotor i (ms). */
  rhoMs(i: number): number {
    return this.rho[i];
  }

  /** From the trigger until every point of a run of length D has completed its last AP (s < 0.1 %, ms). */
  runSpanMs(D: number): number {
    return D + this.rho[0] + 8 * this.tauRepMs + VF_UPSTROKE_MS;
  }

  /** Shifts rotor i's phase so that point p (local mm) fires (θ wraps) exactly at time tMs. */
  alignWrap(i: number, p: Vec3, tMs: number): void {
    this.psi0[i] = 0;
    this.pack(tMs, this.frame);
    const o = i * VF_STRIDE, f = this.frame;
    const dx = p[0] - f[o + 4], dy = p[1] - f[o + 5], dz = p[2] - f[o + 6];
    const th = f[o + 7] - f[o + 15] * Math.hypot(dx, dy, dz) - Math.atan2(dx * f[o + 12] + dy * f[o + 13] + dz * f[o + 14], dx * f[o + 8] + dy * f[o + 9] + dz * f[o + 10] + 1e-9);
    const p0 = -th;
    this.psi0[i] = p0 - TWO_PI * Math.floor(p0 / TWO_PI);
  }

  /** Writes the packed rotor slots for time t (float64 math; ψ reduced mod 2π) and returns the rotor count. */
  pack(tMs: number, out: Float32Array | Float64Array, slotOffset = 0): number {
    const L = this.periodMs;
    const tl = tMs - L * Math.floor(tMs / L);
    let c = 1, s = 0, m: Vec3 = [0, 0, 0];
    if (this.prec) {
      const phi = (TWO_PI * this.prec.turns * tl) / L;
      c = Math.cos(phi);
      s = Math.sin(phi);
      m = this.prec.m;
    }
    for (let i = 0; i < this.n; i++) {
      const o = (slotOffset + i) * VF_STRIDE, j = 3 * i;
      let e1: Vec3 = [this.e1[j], this.e1[j + 1], this.e1[j + 2]];
      let e2: Vec3 = [this.e2[j], this.e2[j + 1], this.e2[j + 2]];
      if (this.prec) {
        e1 = rotate(e1, m, c, s);
        e2 = rotate(e2, m, c, s);
      }
      const ang = (TWO_PI * this.turns[i] * tl) / L + this.turnPhase[i];
      const cx = Math.cos(ang) * this.meanderMm, sy = Math.sin(ang) * this.meanderMm;
      const psi = this.omega[i] * tl + this.psi0[i];
      out[o] = this.anchor[j];
      out[o + 1] = this.anchor[j + 1];
      out[o + 2] = this.anchor[j + 2];
      out[o + 3] = this.rho[i];
      out[o + 4] = this.anchor[j] + cx * e1[0] + sy * e2[0];
      out[o + 5] = this.anchor[j + 1] + cx * e1[1] + sy * e2[1];
      out[o + 6] = this.anchor[j + 2] + cx * e1[2] + sy * e2[2];
      out[o + 7] = psi - TWO_PI * Math.floor(psi / TWO_PI);
      out[o + 8] = e1[0];
      out[o + 9] = e1[1];
      out[o + 10] = e1[2];
      out[o + 11] = this.omega[i];
      out[o + 12] = e2[0];
      out[o + 13] = e2[1];
      out[o + 14] = e2[2];
      out[o + 15] = this.k[i];
      out[o + 16] = this.tauRepMs;
      out[o + 17] = VF_TAU_UP;
      out[o + 18] = VF_SLOPE;
      out[o + 19] = 0;
    }
    return this.n;
  }

  /** [tau, rho, tauRep] at point p (local mm) and time t — through the same packed frame the GPU receives. */
  tauAt(p: Vec3, tMs: number, out = new Float64Array(3)): Float64Array {
    this.pack(tMs, this.frame);
    afTauPacked(this.frame, this.n, p[0], p[1], p[2], out);
    return out;
  }

  /** s(t) at point p in the continuous field (VF). */
  apAt(p: Vec3, tMs: number): number {
    const r = this.tauAt(p, tMs);
    return afAp(r[0], r[1], VF_TAU_UP, r[2], VF_SLOPE);
  }

  /**
   * One loop of H_V (heart-local, mV) for the continuous field: H = −gain·Σ_patch c_patch·s_patch(t). Patches are cells
   * of 3³ voxels; the geometric phase term is evaluated at 20 ms knots and advanced linearly in between (as afField).
   */
  buildLoop(kernel: SourceKernel, gain: number, fsHz = 500): VfSignal {
    const patches = this.patches(kernel);
    const L = this.periodMs;
    const nS = Math.round((L * fsHz) / 1000);
    const H = new Float64Array(3 * nS);
    const luts = Array.from({ length: this.n }, (_, i) => this.lut(i, this.cycleMs(i)));
    const nK = Math.ceil(L / KNOT_MS);
    const frames = this.knotFrames(0, nK);
    const phiK = new Float64Array(nK + 1);
    const dt = 1000 / fsHz;
    for (let j = 0; j < patches.n; j++) {
      const cx = patches.c[3 * j], cy = patches.c[3 * j + 1], cz = patches.c[3 * j + 2];
      if (cx === 0 && cy === 0 && cz === 0) continue;
      const dom = this.domainOf(patches.p[3 * j], patches.p[3 * j + 1], patches.p[3 * j + 2]);
      this.geometricPhase(frames, nK, dom, patches.p, j, phiK);
      const w = this.omega[dom], lut = luts[dom], inv = 1 / (w * LUT_STEP);
      for (let kk = 0; kk < nK; kk++) {
        const s0 = Math.ceil((kk * KNOT_MS) / dt - 1e-9), s1 = Math.min(nS, Math.ceil(((kk + 1) * KNOT_MS) / dt - 1e-9));
        if (s0 >= s1) continue;
        const slope = (phiK[kk + 1] - phiK[kk]) / KNOT_MS;
        const t0 = s0 * dt;
        const th = w * t0 + this.psi0[dom] + phiK[kk] + slope * (t0 - kk * KNOT_MS);
        let ph = th - TWO_PI * Math.floor(th / TWO_PI);
        const dph = (w + slope) * dt;
        for (let s = s0; s < s1; s++) {
          const x = ph * inv;
          const i0 = x | 0;
          const sv = lut[i0] + (lut[i0 + 1] - lut[i0]) * (x - i0);
          H[3 * s] += cx * sv;
          H[3 * s + 1] += cy * sv;
          H[3 * s + 2] += cz * sv;
          ph += dph;
          if (ph >= TWO_PI) ph -= TWO_PI;
          else if (ph < 0) ph += TWO_PI;
        }
      }
    }
    const out = new Float32Array(3 * nS);
    for (let i = 0; i < out.length; i++) out[i] = -gain * H[i];
    return { fsHz, n: nS, t0Ms: 0, H: out };
  }

  /**
   * H_V of one run (rotor 0, heart-local mV) from δ before the trigger to the end of the last APs, in run time
   * (0 = trigger at the focus). Per patch (patch means of the gate fields), exactly the GLSL hvVfState rule:
   *   wrap gate g = max(0, trigger accepted ? a + ρ + 4τr : recovery of the preceding beat), trigger accepted iff
   *   a − δ ≥ recovery; last wrap w = t − (θ mod 2π)/ω (for t > D: the last wrap before D); the field AP applies when
   *   w ≥ g, else the trigger AP (t ≥ a − δ) when accepted, else nothing (the preceding beat's template carries it).
   */
  buildRun(kernel: SourceKernel, gain: number, gate: RunGate, fsHz = 500): VfSignal {
    const patches = this.patches(kernel, gate);
    const D = gate.runMs, rho = this.rho[0], tr = this.tauRepMs, w = this.omega[0], psi0 = this.psi0[0];
    const cl = this.cycleMs(0);
    const tStart = -VF_UPSTROKE_MS;
    const dt = 1000 / fsHz;
    const nS = Math.ceil((this.runSpanMs(D) - tStart) / dt) + 1;
    const H = new Float64Array(3 * nS);
    // AP lookup on x = τ + δ ∈ [0, CL + tail] (after D the last AP outlasts one cycle)
    const lut = this.lut(0, cl + rho + 8 * tr + VF_UPSTROKE_MS);
    const lutMax = lut.length - 2;
    const nK = Math.ceil((D - tStart) / KNOT_MS) + 1;
    const frames = this.knotFrames(tStart, nK);
    const phiK = new Float64Array(nK + 1);
    const invL = 1 / LUT_STEP;
    // samples with τ ≤ D follow the live phase; later ones keep the last wrap before D
    const sD = Math.min(nS, Math.floor((D - tStart) / dt + 1e-9) + 1);
    for (let j = 0; j < patches.n; j++) {
      const cx = patches.c[3 * j], cy = patches.c[3 * j + 1], cz = patches.c[3 * j + 2];
      if (cx === 0 && cy === 0 && cz === 0) continue;
      const [g, a] = runGateAt(gate, rho, tr, patches.tPrev[j], patches.tTrig[j], patches.apd[j]);
      const trig = a === a, aFoot = trig ? a - VF_UPSTROKE_MS : Infinity;
      this.geometricPhase(frames, nK, 0, patches.p, j, phiK);
      const sFirst = Math.max(0, Math.floor((Math.min(g, aFoot) - tStart) / dt));
      const add = (s: number, tau: number, lw: number): boolean => {
        let x = -1;
        if (lw >= g) x = tau - lw;
        else if (tau >= aFoot) x = tau - a + VF_UPSTROKE_MS;
        if (x < 0) return true;
        const q = x * invL;
        if (q >= lutMax) return false;
        const i0 = q | 0;
        const sv = lut[i0] + (lut[i0 + 1] - lut[i0]) * (q - i0);
        H[3 * s] += cx * sv;
        H[3 * s + 1] += cy * sv;
        H[3 * s + 2] += cz * sv;
        return true;
      };
      for (let kk = 0; kk < nK; kk++) {
        const ta = tStart + kk * KNOT_MS;
        const s0 = Math.max(sFirst, Math.ceil((ta - tStart) / dt - 1e-9)), s1 = Math.min(sD, Math.ceil((ta + KNOT_MS - tStart) / dt - 1e-9));
        if (s0 >= s1) continue;
        const slope = (phiK[kk + 1] - phiK[kk]) / KNOT_MS;
        const t0 = tStart + s0 * dt;
        const th = w * t0 + psi0 + phiK[kk] + slope * (t0 - ta);
        let ph = th - TWO_PI * Math.floor(th / TWO_PI);
        const dph = (w + slope) * dt;
        for (let s = s0; s < s1; s++) {
          const tau = tStart + s * dt;
          add(s, tau, tau - ph / w);
          ph += dph;
          if (ph >= TWO_PI) ph -= TWO_PI;
          else if (ph < 0) ph += TWO_PI;
        }
      }
      // last wrap before D (knot-interpolated phase at τ = D)
      const u = Math.min(nK - 1e-9, (D - tStart) / KNOT_MS), kD = Math.floor(u);
      const thD = w * D + psi0 + phiK[kD] + (phiK[kD + 1] - phiK[kD]) * (u - kD);
      const wD = D - (thD - TWO_PI * Math.floor(thD / TWO_PI)) / w;
      for (let s = Math.max(sD, sFirst); s < nS; s++) if (!add(s, tStart + s * dt, wD)) break;
    }
    const out = new Float32Array(3 * nS);
    for (let i = 0; i < out.length; i++) out[i] = -gain * H[i];
    return { fsHz, n: nS, t0Ms: tStart, H: out };
  }

  /** Rotor whose anchor is nearest to p (static Voronoi domain). */
  domainOf(px: number, py: number, pz: number): number {
    let best = 0, bd = Infinity;
    for (let i = 0; i < this.n; i++) {
      const dx = px - this.anchor[3 * i], dy = py - this.anchor[3 * i + 1], dz = pz - this.anchor[3 * i + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bd) {
        bd = d2;
        best = i;
      }
    }
    return best;
  }

  /** AP lookup of rotor i on x = τ + δ ∈ [0, span] at LUT_STEP. */
  private lut(i: number, span: number): Float64Array {
    const m = Math.ceil(span / LUT_STEP) + 2;
    const t = new Float64Array(m);
    for (let s = 0; s < m; s++) t[s] = afAp(s * LUT_STEP - VF_UPSTROKE_MS, this.rho[i], VF_TAU_UP, this.tauRepMs, VF_SLOPE);
    return t;
  }

  /** Packed frames at the knots t0 + kk·KNOT_MS, kk = 0…nK (shared by all patches). */
  private knotFrames(t0: number, nK: number): Float64Array {
    const FS = VF_STRIDE * VF_MAX_ROTORS;
    const frames = new Float64Array((nK + 1) * FS);
    for (let kk = 0; kk <= nK; kk++) this.pack(t0 + kk * KNOT_MS, frames.subarray(kk * FS, (kk + 1) * FS));
    return frames;
  }

  /** Geometric phase −k·r − α (α unwrapped across knots) of patch j in domain dom at every knot. */
  private geometricPhase(frames: Float64Array, nK: number, dom: number, pp: Float64Array, j: number, phiK: Float64Array): void {
    const FS = VF_STRIDE * VF_MAX_ROTORS;
    const px = pp[3 * j], py = pp[3 * j + 1], pz = pp[3 * j + 2];
    let prevA = 0, wind = 0;
    for (let kk = 0; kk <= nK; kk++) {
      const o = kk * FS + dom * VF_STRIDE;
      const dx = px - frames[o + 4], dy = py - frames[o + 5], dz = pz - frames[o + 6];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const a = Math.atan2(dx * frames[o + 12] + dy * frames[o + 13] + dz * frames[o + 14], dx * frames[o + 8] + dy * frames[o + 9] + dz * frames[o + 10] + 1e-9);
      if (kk > 0) {
        const d = a - prevA;
        if (d > Math.PI) wind -= TWO_PI;
        else if (d < -Math.PI) wind += TWO_PI;
      }
      prevA = a;
      phiK[kk] = -frames[o + 15] * r - (a + wind);
    }
  }

  /** Kernel voxels merged into 3³-voxel patches: Σc, mean position and (for runs) mean gate fields. */
  private patches(kernel: SourceKernel, gate?: RunGate) {
    const g = this.grid;
    const [nx, ny] = g.dims;
    const cells = new Map<number, number>();
    const pc: number[] = [], pp: number[] = [], pn: number[] = [];
    const sPrev: number[] = [], nPrev: number[] = [], sTrig: number[] = [], nTrig: number[] = [], sApd: number[] = [];
    for (let q = 0; q < kernel.voxels.length; q++) {
      const v = kernel.voxels[q];
      const x = v % nx, y = Math.floor(v / nx) % ny, z = Math.floor(v / (nx * ny));
      const key = Math.floor(x / PATCH_VOXELS) + 1000 * (Math.floor(y / PATCH_VOXELS) + 1000 * Math.floor(z / PATCH_VOXELS));
      let j = cells.get(key);
      if (j === undefined) {
        j = pn.length;
        cells.set(key, j);
        pc.push(0, 0, 0);
        pp.push(0, 0, 0);
        pn.push(0);
        sPrev.push(0);
        nPrev.push(0);
        sTrig.push(0);
        nTrig.push(0);
        sApd.push(0);
      }
      pc[3 * j] += kernel.c[3 * q];
      pc[3 * j + 1] += kernel.c[3 * q + 1];
      pc[3 * j + 2] += kernel.c[3 * q + 2];
      pp[3 * j] += g.originMm[0] + x * g.hMm;
      pp[3 * j + 1] += g.originMm[1] + y * g.hMm;
      pp[3 * j + 2] += g.originMm[2] + z * g.hMm;
      pn[j]++;
      if (gate) {
        const a = gate.tActPrev[v], b = gate.tActTrigger[v];
        if (Number.isFinite(a)) {
          sPrev[j] += a;
          nPrev[j]++;
        }
        if (Number.isFinite(b)) {
          sTrig[j] += b;
          nTrig[j]++;
        }
        sApd[j] += gate.apdRefMs[v];
      }
    }
    const n = pn.length;
    const p = new Float64Array(3 * n), tPrev = new Float64Array(n), tTrig = new Float64Array(n), apd = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      p[3 * j] = pp[3 * j] / pn[j];
      p[3 * j + 1] = pp[3 * j + 1] / pn[j];
      p[3 * j + 2] = pp[3 * j + 2] / pn[j];
      tPrev[j] = nPrev[j] ? sPrev[j] / nPrev[j] : Infinity;
      tTrig[j] = nTrig[j] ? sTrig[j] / nTrig[j] : Infinity;
      apd[j] = sApd[j] / pn[j];
    }
    return { n, c: Float64Array.from(pc), p, tPrev, tTrig, apd };
  }
}

const LUT_STEP = 0.25;

function ventricularPoints(g: VoxelGrid): { pts: { p: Vec3; v: number }[]; centroid: Vec3 } {
  const [nx, ny] = g.dims;
  const pts: { p: Vec3; v: number }[] = [];
  let sx = 0, sy = 0, sz = 0, m = 0;
  for (let v = 0; v < g.tissue.length; v++) {
    const t = g.tissue[v];
    if (t !== TISSUE.LV && t !== TISSUE.RV && t !== TISSUE.Septum) continue;
    const x = g.originMm[0] + (v % nx) * g.hMm, y = g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm;
    const z = g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm;
    sx += x;
    sy += y;
    sz += z;
    m++;
    if (m % 5 === 0) pts.push({ p: [x, y, z], v });
  }
  return { pts, centroid: m ? [sx / m, sy / m, sz / m] : [0, 0, 0] };
}

function atrialCentroid(g: VoxelGrid): Vec3 {
  const [nx, ny] = g.dims;
  let sx = 0, sy = 0, sz = 0, m = 0;
  for (let v = 0; v < g.tissue.length; v++) {
    if (g.tissue[v] !== TISSUE.LA && g.tissue[v] !== TISSUE.RA) continue;
    sx += g.originMm[0] + (v % nx) * g.hMm;
    sy += g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm;
    sz += g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm;
    m++;
  }
  return m ? [sx / m, sy / m, sz / m] : [0, 1e3, 0];
}

/** Deterministic farthest-point sampling, starting from the point farthest from `away` (the atria → near the apex). */
function farthestPoints(pts: readonly { p: Vec3; v: number }[], count: number, away: Vec3): { p: Vec3; v: number }[] {
  if (count <= 0 || pts.length === 0) return [];
  const d2 = (a: Vec3, b: Vec3) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let first = 0;
  for (let i = 1; i < pts.length; i++) if (d2(pts[i].p, away) > d2(pts[first].p, away)) first = i;
  const out = [pts[first]];
  const near = pts.map((q) => d2(q.p, pts[first].p));
  while (out.length < count) {
    let far = 0;
    for (let i = 1; i < pts.length; i++) if (near[i] > near[far]) far = i;
    out.push(pts[far]);
    for (let i = 0; i < pts.length; i++) near[i] = Math.min(near[i], d2(pts[i].p, pts[far].p));
  }
  return out;
}

/** Rotation of v about the unit axis m by the angle with cosine c and sine s (Rodrigues). */
function rotate(v: Vec3, m: Vec3, c: number, s: number): Vec3 {
  const k = dot(m, v) * (1 - c);
  const x = cross(m, v);
  return [v[0] * c + x[0] * s + m[0] * k, v[1] * c + x[1] * s + m[1] * k, v[2] * c + x[2] * s + m[2] * k];
}

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: Vec3): Vec3 => {
  const l = norm(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
