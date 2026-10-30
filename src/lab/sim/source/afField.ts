/**
 * Atrial fibrillation source: a closed-form phase field of meandering rotors on the atrial walls.
 *
 * Each rotor i owns the atrial tissue nearest to its anchor (static Voronoi partition, so a point never switches rotor
 * and its transmembrane potential stays continuous; the partition borders read as lines of functional block). Inside
 * its domain the phase is a one-armed spiral around a core that meanders on a small circle in the wall's tangent plane:
 *   θ(p, t) = ψ_i(t) − k_i·|p − c_i(t)| − atan2((p − c_i)·e2_i, (p − c_i)·e1_i),   ψ_i(t) = ω_i·t (mod 2π)
 * and every point fires when θ wraps: τ = (θ mod 2π)/ω_i − δ is the time since its local upstroke, s = AP(τ).
 * ω_i·L = 2π·integer and the meander runs an integer number of turns per L, so the field is exactly periodic in L.
 *
 * One source: the ECG uses H_A(t) = −gain·Σ c_v·s_v(t) with s from this formula (kernel voxels merged into ≈4.5 mm
 * patches whose Σc is the sum of their voxels' c, so Σc ≡ 0 still holds); the GPU colours the atria with the same
 * formula from the same packed numbers (afPack → uniforms uAf, GLSL twin hvAfTau in view3d/shaders/chunks.ts).
 * Remodelled AF myocardium: short APD (ρ ≈ 0.5·CL, τr ≈ 15 ms), so every point repolarizes within its cycle.
 */
import { PLATEAU_REF_MS, sigmoid } from '../conduction/ap';
import type { SourceKernel, Vec3, VoxelGrid } from '../types';
import { TISSUE } from '../types';

/** Rotors supported by the GPU uniform block. */
export const AF_MAX_ROTORS = 6;
/** Floats per rotor in the packed frame (5 × vec4). */
export const AF_STRIDE = 20;
/** Phase wrap → local upstroke delay (ms): the wrap happens where s ≈ 0, so it never shows as a step. */
export const AF_UPSTROKE_MS = 10;
const TWO_PI = 2 * Math.PI;

export interface AfSpec {
  /** Rotor cycle lengths (ms), LA rotors first; 100–170 ms gives a dominant atrial frequency of 6–10 Hz. */
  readonly cycleMs: readonly number[];
  /** How many of the rotors sit in the left atrium (the rest in the right atrium). */
  readonly nLa: number;
  /** Conduction velocity (mm/ms) — sets the spiral pitch k = 2π / (cv·CL). */
  readonly cvMmPerMs: number;
  /** Meander radius of the rotor cores (mm) and turns per loop. */
  readonly meanderMm: number;
  readonly meanderTurns: readonly number[];
  /** AP half-repolarization time as a fraction of the rotor's cycle length, and repolarization time constant (ms). */
  readonly apdFrac: number;
  readonly tauRepMs: number;
  /** f-wave source strength relative to the sinus atrial gain (fine AF < coarse AF). */
  readonly amplitude: number;
  /** Loop length of the precomputed H_A (ms). */
  readonly periodMs: number;
  /** AV-node filter of the atrial bombardment (rhythm/avnFilter.ts). */
  readonly avn: AvnSpec;
  readonly seed: number;
}

export interface AvnSpec {
  /** Recovery beyond the effective refractory period over which conduction probability ramps 0 → 1, as × ERP. */
  readonly spreadFrac: number;
  /** Concealed conduction: a blocked impulse after the ERP moves the recovery origin this fraction toward itself. */
  readonly concealFrac: number;
  /** Decremental conduction: extra AH (ms) for an impulse right at the end of the ERP, decaying over decayMs. */
  readonly decrementMs: number;
  readonly decayMs: number;
  /** Shortest ventricular cycle the His–Purkinje system accepts (ms). */
  readonly minRrMs: number;
}

/** Periodic H_A loop in the heart-local frame (mV), sampled at fsHz. */
export interface AfLoop {
  readonly fsHz: number;
  readonly n: number;
  readonly periodMs: number;
  readonly H: Float32Array;
}

/**
 * τ (ms since the local upstroke; −δ…CL−δ) and ρ (ms) at point p from a packed frame — the CPU twin of GLSL hvAfTau.
 * out = [tau, rho, tauRep].
 */
export function afTauPacked(data: Float32Array | Float64Array, n: number, px: number, py: number, pz: number, out: Float64Array): void {
  let best = 0, bd = Infinity;
  for (let i = 0; i < n; i++) {
    const o = i * AF_STRIDE;
    const dx = px - data[o], dy = py - data[o + 1], dz = pz - data[o + 2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bd) {
      bd = d2;
      best = i;
    }
  }
  const o = best * AF_STRIDE;
  const dx = px - data[o + 4], dy = py - data[o + 5], dz = pz - data[o + 6];
  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const x = dx * data[o + 8] + dy * data[o + 9] + dz * data[o + 10];
  const y = dx * data[o + 12] + dy * data[o + 13] + dz * data[o + 14];
  const th = data[o + 7] - data[o + 15] * r - Math.atan2(y, x + 1e-9);
  const ph = th - TWO_PI * Math.floor(th / TWO_PI);
  out[0] = ph / data[o + 11] - AF_UPSTROKE_MS;
  out[1] = data[o + 3];
  out[2] = data[o + 16];
}

/** AF action potential at τ ms after the upstroke (same template family as apValue, remodelled constants). */
export function afAp(tau: number, rho: number, tauUp: number, tauRep: number, slope: number): number {
  return sigmoid(tau / tauUp) * (1 - (slope * tau) / PLATEAU_REF_MS) * sigmoid(-(tau - rho) / tauRep);
}

const AF_TAU_UP = 2.5;
const AF_SLOPE = 0.3;
const PATCH_VOXELS = 3;
const KNOT_MS = 20;

export class AfModel {
  readonly n: number;
  readonly periodMs: number;
  readonly tauRepMs: number;
  private readonly anchor: Float64Array;
  private readonly e1: Float64Array;
  private readonly e2: Float64Array;
  private readonly omega: Float64Array;
  private readonly k: Float64Array;
  private readonly rho: Float64Array;
  private readonly turns: Float64Array;
  private readonly turnPhase: Float64Array;
  private readonly meanderMm: number;
  private readonly frame: Float64Array;

  constructor(
    private readonly grid: VoxelGrid,
    readonly spec: AfSpec,
  ) {
    const n = Math.min(AF_MAX_ROTORS, spec.cycleMs.length);
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
    this.frame = new Float64Array(AF_STRIDE * AF_MAX_ROTORS);
    const la = atrialPoints(grid, TISSUE.LA), ra = atrialPoints(grid, TISSUE.RA);
    const nLa = Math.max(0, Math.min(n, spec.nLa));
    const anchors = [
      ...farthestPoints(la.pts, nLa, ra.centroid),
      ...farthestPoints(ra.pts, n - nLa, la.centroid),
    ];
    for (let i = 0; i < n; i++) {
      const a = anchors[i];
      const cen = i < nLa ? la.centroid : ra.centroid;
      const nrm = normalize([a[0] - cen[0], a[1] - cen[1], a[2] - cen[2]]);
      const ref: Vec3 = Math.abs(nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = normalize(cross(nrm, ref));
      const v = cross(nrm, u);
      const chir = i % 2 === 0 ? 1 : -1;
      this.anchor.set(a, 3 * i);
      this.e1.set(u, 3 * i);
      this.e2.set([v[0] * chir, v[1] * chir, v[2] * chir], 3 * i);
      const cycles = Math.max(1, Math.round(spec.periodMs / spec.cycleMs[i]));
      const cl = spec.periodMs / cycles;
      this.omega[i] = (TWO_PI * cycles) / spec.periodMs;
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

  /** Writes the packed frame for time t (float64 math; ψ reduced mod 2π) and returns the rotor count. */
  pack(tMs: number, out: Float32Array | Float64Array): number {
    const L = this.periodMs;
    const tl = tMs - L * Math.floor(tMs / L);
    for (let i = 0; i < this.n; i++) {
      const o = i * AF_STRIDE, j = 3 * i;
      const ang = (TWO_PI * this.turns[i] * tl) / L + this.turnPhase[i];
      const cx = Math.cos(ang) * this.meanderMm, sy = Math.sin(ang) * this.meanderMm;
      const psi = this.omega[i] * tl;
      out[o] = this.anchor[j];
      out[o + 1] = this.anchor[j + 1];
      out[o + 2] = this.anchor[j + 2];
      out[o + 3] = this.rho[i];
      // the core meanders in the tangent plane (e2 carries the chirality sign; the circle is the same either way)
      out[o + 4] = this.anchor[j] + cx * this.e1[j] + sy * this.e2[j];
      out[o + 5] = this.anchor[j + 1] + cx * this.e1[j + 1] + sy * this.e2[j + 1];
      out[o + 6] = this.anchor[j + 2] + cx * this.e1[j + 2] + sy * this.e2[j + 2];
      out[o + 7] = psi - TWO_PI * Math.floor(psi / TWO_PI);
      out[o + 8] = this.e1[j];
      out[o + 9] = this.e1[j + 1];
      out[o + 10] = this.e1[j + 2];
      out[o + 11] = this.omega[i];
      out[o + 12] = this.e2[j];
      out[o + 13] = this.e2[j + 1];
      out[o + 14] = this.e2[j + 2];
      out[o + 15] = this.k[i];
      out[o + 16] = this.tauRepMs;
      out[o + 17] = AF_TAU_UP;
      out[o + 18] = AF_SLOPE;
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

  /** s(t) at point p — the transmembrane state behind both the ECG and the 3D colour. */
  apAt(p: Vec3, tMs: number): number {
    const r = this.tauAt(p, tMs);
    return afAp(r[0], r[1], AF_TAU_UP, r[2], AF_SLOPE);
  }

  /** Local upstroke times at p within one loop [0, L), ascending (atrial impulses reaching the AV node). */
  upstrokesAt(p: Vec3, stepMs = 0.5): number[] {
    const out: number[] = [];
    const r = new Float64Array(3);
    let prev = this.tauAt(p, -stepMs, r)[0];
    for (let t = 0; t < this.periodMs; t += stepMs) {
      const tau = this.tauAt(p, t, r)[0];
      if (prev < 0 && tau >= 0) out.push(t - (tau / Math.max(1e-6, tau - prev)) * stepMs);
      prev = tau;
    }
    return out;
  }

  /**
   * One loop of H_A (heart-local, mV): H = −gain·Σ_patch c_patch·s_patch(t). Patches are cells of 3³ voxels. The slow
   * geometric phase term (core meander) is evaluated at 20 ms knots; between knots θ is linear in t, so the phase is
   * advanced incrementally (ψ = ω·t exactly at every knot).
   */
  buildLoop(kernel: SourceKernel, gain: number, fsHz = 500): AfLoop {
    const g = this.grid;
    const [nx, ny] = g.dims;
    const cells = new Map<number, number>();
    const pc: number[] = [], pp: number[] = [], pn: number[] = [];
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
      }
      pc[3 * j] += kernel.c[3 * q];
      pc[3 * j + 1] += kernel.c[3 * q + 1];
      pc[3 * j + 2] += kernel.c[3 * q + 2];
      pp[3 * j] += g.originMm[0] + x * g.hMm;
      pp[3 * j + 1] += g.originMm[1] + y * g.hMm;
      pp[3 * j + 2] += g.originMm[2] + z * g.hMm;
      pn[j]++;
    }
    const nP = pn.length;
    const L = this.periodMs;
    const nS = Math.round((L * fsHz) / 1000);
    const dt = 1000 / fsHz;
    const nK = Math.ceil(L / KNOT_MS);
    const H = new Float64Array(3 * nS);
    // AP lookup per rotor on τ + δ ∈ [0, CL) at 0.25 ms
    const lutStep = 0.25;
    const luts = Array.from({ length: this.n }, (_, i) => {
      const m = Math.ceil(this.cycleMs(i) / lutStep) + 2;
      const t = new Float64Array(m);
      for (let s = 0; s < m; s++) t[s] = afAp(s * lutStep - AF_UPSTROKE_MS, this.rho[i], AF_TAU_UP, this.tauRepMs, AF_SLOPE);
      return t;
    });
    // packed frames at every knot (shared by all patches)
    const FS = AF_STRIDE * AF_MAX_ROTORS;
    const frames = new Float64Array((nK + 1) * FS);
    for (let kk = 0; kk <= nK; kk++) this.pack(kk * KNOT_MS, frames.subarray(kk * FS, (kk + 1) * FS));
    const phiK = new Float64Array(nK + 1);
    for (let j = 0; j < nP; j++) {
      const cx = pc[3 * j], cy = pc[3 * j + 1], cz = pc[3 * j + 2];
      if (cx === 0 && cy === 0 && cz === 0) continue;
      const px = pp[3 * j] / pn[j], py = pp[3 * j + 1] / pn[j], pz = pp[3 * j + 2] / pn[j];
      // static domain; geometric phase −k·r − α at the knots with α unwrapped
      const dom = this.domainOf(px, py, pz);
      let prevA = 0, wind = 0;
      for (let kk = 0; kk <= nK; kk++) {
        const o = kk * FS + dom * AF_STRIDE;
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
      const w = this.omega[dom], lut = luts[dom], inv = 1 / (w * lutStep);
      for (let kk = 0; kk < nK; kk++) {
        const s0 = Math.ceil((kk * KNOT_MS) / dt - 1e-9), s1 = Math.min(nS, Math.ceil(((kk + 1) * KNOT_MS) / dt - 1e-9));
        if (s0 >= s1) continue;
        const slope = (phiK[kk + 1] - phiK[kk]) / KNOT_MS;
        const t0 = s0 * dt;
        const th = w * t0 + phiK[kk] + slope * (t0 - kk * KNOT_MS);
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
    return { fsHz, n: nS, periodMs: L, H: out };
  }

  private domainOf(px: number, py: number, pz: number): number {
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
}

function atrialPoints(g: VoxelGrid, tissue: number): { pts: Vec3[]; centroid: Vec3 } {
  const [nx, ny] = g.dims;
  const pts: Vec3[] = [];
  let sx = 0, sy = 0, sz = 0, m = 0;
  for (let v = 0; v < g.tissue.length; v++) {
    if (g.tissue[v] !== tissue) continue;
    const x = g.originMm[0] + (v % nx) * g.hMm, y = g.originMm[1] + (Math.floor(v / nx) % ny) * g.hMm;
    const z = g.originMm[2] + Math.floor(v / (nx * ny)) * g.hMm;
    sx += x;
    sy += y;
    sz += z;
    m++;
    if (m % 5 === 0) pts.push([x, y, z]);
  }
  return { pts, centroid: m ? [sx / m, sy / m, sz / m] : [0, 0, 0] };
}

/** Deterministic farthest-point sampling, starting from the point farthest from `away` (the other atrium). */
function farthestPoints(pts: readonly Vec3[], count: number, away: Vec3): Vec3[] {
  if (count <= 0 || pts.length === 0) return [];
  const d2 = (a: Vec3, b: Vec3) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let first = 0;
  for (let i = 1; i < pts.length; i++) if (d2(pts[i], away) > d2(pts[first], away)) first = i;
  const out: Vec3[] = [pts[first]];
  const near = pts.map((p) => d2(p, pts[first]));
  while (out.length < count) {
    let far = 0;
    for (let i = 1; i < pts.length; i++) if (near[i] > near[far]) far = i;
    out.push(pts[far]);
    for (let i = 0; i < pts.length; i++) near[i] = Math.min(near[i], d2(pts[i], pts[far]));
  }
  return out;
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
