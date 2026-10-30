/**
 * Disease library batch 3 — hypokalaemia (docs/research/disease-spec.json `hypokalemia`).
 */
import { defineScenario } from '../define';
import { NORMAL_PARAMS } from '../normal';
import type { RegionSelector } from '../types';

/**
 * The late-repolarizing population of HYPOKALEMIA: 7 of every 10 ventricular voxels, interleaved at the voxel scale
 * (RegionSelector.interleave), so every small patch of wall contains both populations. Exported for the oracle tests,
 * which measure the T and U waves in the repolarization windows of the two populations.
 */
export const HYPOKALEMIA_LATE: RegionSelector = { interleave: { keep: 7, of: 10 } };
/** Extra APD of the late population (ms, at RRref; scales with the rate like the rest of the APD). */
export const HYPOKALEMIA_LATE_DELTA_MS = 160;

/**
 * Hypokalaemia, severe (K⁺ ≈ 2.5 mmol/L): low potassium reduces the inward-rectifier and rapid delayed-rectifier
 * currents (IK1, IKr), so ventricular repolarization is longer and ends with a slow terminal phase.
 *
 * U wave — two-step repolarization. In every patch of wall 30 % of the tissue repolarizes on time (T wave) and 70 %
 * (HYPOKALEMIA_LATE, interleaved voxel by voxel) finishes 160 ms later while sitting on the sagging plateau; the
 * patch-averaged action potential therefore drops in phase 3 and then lingers on a slow tail that sags from ≈ 0.35 to
 * ≈ 0.15 of its amplitude before it ends — the voxel-scale form of the slow, IK1-dependent final repolarization. The
 * late cells repeat the same apex→base / endo→epi repolarization gradients later, so the U is a delayed, concordant
 * copy of the T (Ritsema van Eck, Kors & van Herpen, Cardiovasc Res 2005, explain the U wave by the same repolarization
 * gradients acting on a slow terminal phase). Because the late subset is spread evenly, its kernel sum Σc is ≈ 0
 * (0.6 % of Σ|c|): it has no net dipole of its own, only its own dispersion — a separate wave after the T with a T–U
 * junction between them. A localized late population (the spec's "subset of regions", e.g. the Purkinje-covered
 * subendocardium) was tried first: in a surface (EDL) source its uncancelled Σc gives a dipole that switches on as soon
 * as the surrounding wall repolarizes, i.e. during the T, so T and U fuse into one broad wave (RV subendocardium
 * +150–300 ms: a 1.3 mV shoulder in V2–V3 merged with the T).
 * The fraction sets the severity: U/T ≈ 0.4 at 4/10, ≈ 1.1 at 7/10 (U taller than a flattened T).
 *
 * Other changes (one parameter each):
 *  - apdRefMs 229 → 245: longer action potential of the on-time population (the T itself ends ≈ 15 ms later).
 *  - plateauSlope 0.196 → 0.36: lower, more steeply sagging plateau. Cells activated first have declined furthest
 *    when the QRS ends, so the ST vector points opposite to the QRS (ST(J) ≈ −0.05 mV in V3–V4) and the T is lower.
 *    0.36 keeps the plateau above rest until the latest late cell has repolarized even at 40 bpm (P(x) ≥ 0.02).
 *  - atrialGainFactor 0.256 → 0.28: taller P wave (P(II) ≈ 1.1 × NSR); kept modest because the stronger atrial
 *    repolarization (Ta) wave raises the PR segment and offsets the J-point depression.
 *  - PR 160 → 175 ms (slower AV-node conduction).
 * The 3D view and the slice read the same APD field: during the U the interleaved late cells are still depolarized.
 * The QT read off the ECG is the QU interval (≈ 520 ms): the "long QT" of hypokalaemia is T–U, not a longer T.
 */
export const HYPOKALEMIA = defineScenario({
  id: 'hypokalemia',
  category: 'electrolyte-drug-qt',
  params: {
    apdRefMs: 245,
    apVentricular: { ...NORMAL_PARAMS.apVentricular!, plateauSlope: 0.36 },
    atrialGainFactor: 0.28,
  },
  rhythm: { av: { mode: 'first-degree', prMs: 175 } },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  tissue: { apd: [{ ...HYPOKALEMIA_LATE, deltaMs: HYPOKALEMIA_LATE_DELTA_MS }] },
  // the late population is everywhere (interleaved), so no region is highlighted
  teach: { keyLeads: ['V2', 'V3', 'V4', 'II', 'V5'], highlight: [] },
});
