/**
 * Frontal axes of the truth (DECISION §6.10, criteria.md `axis-methods`).
 *
 * QRS axis: net-deflection method on the VENTRICULAR-ONLY clean limb leads (prototype C's rule: atrial activity, F/f
 * waves and a P that runs into the QRS must not move it): θ = atan2((2/√3)·net aVF, net I), net = largest positive +
 * largest negative deflection in the QRS window, averaged over the dominant beats. The area axis is computed too;
 * `ambiguous` when the two differ by > 15° or every limb lead is isodiphasic (indeterminate axis).
 * P axis: area method on the atrial-only P window; T axis: area method on the ventricular-only J → T-end window.
 * The ventricular-only and atrial-only leads come from separate renders of the two kernel sets (their sum is the
 * clean signal, so no extra work is spent).
 */
import type { LeadSignals } from '../../core/ecg';
import type { StdLead } from '../../core/leads';
import { angleDiff, hexaxialDeg } from '../frame';
import type { Kernel } from '../kernel/kernel';
import { electrodePotentials, render } from '../kernel/render';
import { assemble } from '../leads/assemble';
import type { Hookup } from '../leads/electrodes';

const LIMBS: readonly StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];

export interface Window {
  /** ms (sample 0 of the leads = 0 ms) */
  readonly a: number;
  readonly b: number;
}

function slice(x: Float32Array, w: Window, fs: number): Float32Array {
  const i0 = Math.max(0, Math.ceil((w.a * fs) / 1000)), i1 = Math.min(x.length - 1, Math.floor((w.b * fs) / 1000));
  return x.subarray(i0, Math.max(i0, i1 + 1));
}
const net = (xs: Float32Array): number => {
  let mx = 0, mn = 0;
  for (const v of xs) {
    if (v > mx) mx = v;
    if (v < mn) mn = v;
  }
  return mx + mn;
};
const area = (xs: Float32Array): number => {
  let s = 0;
  for (const v of xs) s += v;
  return s;
};

export interface QrsAxis {
  readonly netDeg: number;
  readonly areaDeg: number;
  readonly ambiguous: boolean;
}

/** QRS axis from ventricular-only leads over QRS windows. */
export function qrsAxisOf(vent: LeadSignals, windows: readonly Window[], fs: number): QrsAxis {
  let nI = 0, nF = 0, aI = 0, aF = 0;
  let allIso = windows.length > 0;
  for (const w of windows) {
    nI += net(slice(vent.I, w, fs));
    nF += net(slice(vent.aVF, w, fs));
    aI += area(slice(vent.I, w, fs));
    aF += area(slice(vent.aVF, w, fs));
    for (const l of LIMBS) {
      const xs = slice(vent[l], w, fs);
      let mx = 0, mn = 0;
      for (const v of xs) {
        if (v > mx) mx = v;
        if (v < mn) mn = v;
      }
      if (Math.abs(mx + mn) > 0.2 * (mx - mn)) allIso = false;
    }
  }
  const netDeg = hexaxialDeg(nI, nF);
  const areaDeg = hexaxialDeg(aI, aF);
  return { netDeg, areaDeg, ambiguous: allIso || Math.abs(angleDiff(netDeg, areaDeg)) > 15 };
}

/** Area axis over windows (P axis on atrial-only leads, T axis on ventricular-only leads); null when no area. */
export function areaAxisOf(leads: LeadSignals, windows: readonly Window[], fs: number): number | null {
  let aI = 0, aF = 0;
  for (const w of windows) {
    aI += area(slice(leads.I, w, fs));
    aF += area(slice(leads.aVF, w, fs));
  }
  if (Math.hypot(aI, aF) < 1e-9) return null;
  return hexaxialDeg(aI, aF);
}

/** Ventricular-only QRS axis of one beat's kernels (used by the axis dial solve: one small windowed render). */
export function beatQrsAxis(kernels: readonly Kernel[], qrsOn: number, qrsOff: number, fs: number, hook: Hookup, torsoGain = 1): number {
  const t0 = qrsOn - 4;
  const n = Math.ceil(((qrsOff - qrsOn + 8) * fs) / 1000) + 1;
  const leads = assemble(electrodePotentials(render(kernels, fs, n, t0), torsoGain), hook);
  return qrsAxisOf(leads, [{ a: 4, b: 4 + qrsOff - qrsOn }], fs).netDeg;
}
