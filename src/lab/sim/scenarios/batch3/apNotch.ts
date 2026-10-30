/**
 * Batch 3 — diseases of the transient outward current I_to: an epicardial phase-1 notch of the ventricular action
 * potential ("spike and dome", tissue.notch → source/apNotch.ts). I_to is dense in the epicardium and sparse in the
 * endocardium, so a notch opens a transmural voltage difference at the end of depolarization; the ECG shows it only
 * because the notched epicardial surface and the un-notched endocardial surface no longer cancel in
 * H = −gain·Σ c_v·s_v (one-source rule: nothing is drawn per lead).
 * The 3D colouring and the slice read the same activation and APD fields; they do not draw the notch itself.
 */
import { resolveParams } from '../../conduction/params';
import { defineScenario } from '../define';
import { NORMAL_PARAMS } from '../normal';
import type { Scenario } from '../types';

const sc = defineScenario;

/** The right-ventricular epicardium of the HRA heart, by region. */
const RV = ['RVOT', 'RV_FREE', 'RV_APEX'] as const;
/** The left-ventricular free wall (the septum is excluded: its "epicardial" third is the RV-facing septal surface). */
const LV_FREE = ['LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'LV_APEX'] as const;

/**
 * Brugada pattern type 1 (coved), repolarization hypothesis (Antzelevitch): I_to is largest in the right-ventricular
 * epicardium and largest of all in the outflow tract. An outward shift of currents (e.g. SCN5A loss of function)
 * deepens the epicardial notch and delays — and partly abolishes — the dome, while the endocardium keeps its plateau:
 *   - notch (tissue.notch): RVOT epicardium depth 0.14, apical and free-wall RV epicardium 0.10 / 0.055 of the AP
 *     excursion; the dome returns slowly (τ 100 ms) and only half of the notch recovers (partial loss of dome). The
 *     transmural difference points from the RV endocardium to its anterior epicardium → ST elevation at the J point in
 *     V1–V2 that slopes down as the dome slowly returns ("coved").
 *   - delayed dome (tissue.apd): the RV epicardium now repolarizes after the endocardium (RVOT +60 ms, rest of the RV
 *     epicardium +45 ms; normally the endocardium is ≈ 26 ms longer), reversing the transmural gradient → the coved ST
 *     runs into a negative T wave in V1–V2. The 3D colouring and the slice show this late epicardial repolarization.
 * Why the whole RV epicardium and not the RVOT alone: on the HRA heart the RVOT epicardium faces mostly upward (its
 * outer surface curves toward the pulmonary valve), so an RVOT-only notch is seen as an ST depression in II, III, aVF
 * by the single-dipole (Dower) leads. The anterior RV free wall faces the chest wall; graded RVOT > apex > free wall,
 * the summed notch points anteriorly and slightly to the right, as in the spec (−x, −y, +z), and stays within
 * ±0.1 mV of the baseline in I, II and V4–V6. The modest average depths reflect a notch averaged over large surfaces;
 * real Brugada notches are deep but patchy. Depolarization is unchanged (QRS 78 ms; no RBBB in this model).
 * Not modelled: high-intercostal-space electrode positions (the lead model has Dower vectors for the standard
 * positions only) and phase-2 re-entry / polymorphic VT.
 */
export const BRUGADA_TYPE_1 = sc({
  id: 'brugada-type-1',
  category: 'other',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  tissue: {
    notch: [
      { regions: ['RV_FREE'], layer: 'epicardial', depth: 0.055, domeTauMs: 100, domeRecovery: 0.5 },
      { regions: ['RV_APEX'], layer: 'epicardial', depth: 0.1, domeTauMs: 100, domeRecovery: 0.5 },
      { regions: ['RVOT'], layer: 'epicardial', depth: 0.14, domeTauMs: 100, domeRecovery: 0.5 },
    ],
    apd: [
      { regions: [...RV], layer: 'epicardial', deltaMs: 45 },
      { regions: ['RVOT'], layer: 'epicardial', deltaMs: 15 },
    ],
  },
  teach: { keyLeads: ['V1', 'V2', 'V3', 'II', 'V5'], highlight: ['RVOT', 'RV_FREE'] },
});

/** Core temperatures (°C) of the hypothermia stages used by the oracle tests and the teaching text. */
export const HYPOTHERMIA_TEMPS = { mild: 35, moderate: 30, severe: 26 } as const;

/** Q10 temperature factor relative to 37 °C: how much slower a process runs at tempC (≥ 1 below 37 °C). */
const slowing = (q10: number, tempC: number): number => Math.pow(q10, (37 - Math.min(37, tempC)) / 10);

/**
 * Hypothermia at a core temperature tempC (°C). Cold slows every rate process (Q10 factors relative to 37 °C):
 *   - sinus node automaticity, Q10 2.2 → sinus bradycardia (75 → 43 bpm at 30 °C);
 *   - conduction velocity (atria, His–Purkinje, ventricular muscle), Q10 1.6 → wider P and QRS; His–Purkinje junction
 *     delay longer by the same factor;
 *   - AV conduction, Q10 1.4 on the PR at the reference rate (160 → 202 ms at 30 °C; longer still at the slow rate);
 *   - repolarization: APD Q10 1.5, phase-3 time constant Q10 1.2 → long QT;
 *   - I_to: cold enhances the epicardial spike-and-dome notch (Yan & Antzelevitch 1996). Depth grows linearly below
 *     36 °C (0.35 × (36 − T)/10, capped at 0.42: 0.21 at 30 °C), its dome returns more slowly as it cools (τ 30 ms ×
 *     Q10 1.6: 42 ms at 30 °C; full recovery). The notch is in the left-ventricular free-wall epicardium and, at half
 *     depth, in the right-ventricular epicardium (spec: "mostly LV"; the septum is excluded because its "epicardial"
 *     third faces the RV cavity): the transmural difference at the end of the QRS points along the mean QRS axis
 *     (leftward-inferior) — a positive J (Osborn) wave in II and V3–V6, negative in aVR and V1, growing as the
 *     temperature falls. The LV epicardium finishes activating ≈ 30 ms before the late outflow tract ends the QRS, so the
 *     hump straddles the terminal QRS and the J point (R–ST junction), as the clinical Osborn wave does.
 * Shivering artefact is not cardiac and is not simulated; AF and ventricular arrhythmias of severe hypothermia neither.
 */
export function hypothermia(tempC: number): Scenario {
  const v = 1 / slowing(1.6, tempC);
  const p = resolveParams(NORMAL_PARAMS);
  const depth = Math.min(0.42, Math.max(0, (0.35 * (36 - tempC)) / 10));
  const domeTauMs = 30 * slowing(1.6, tempC);
  const rvF = 0.5;
  const notch = (regions: readonly (typeof LV_FREE[number] | typeof RV[number])[], d: number) =>
    ({ regions, layer: 'epicardial', depth: d, domeTauMs, domeRecovery: 1 }) as const;
  return sc({
    id: 'hypothermia',
    category: 'other',
    params: {
      vAtrialMps: p.vAtrialMps * v,
      vBachmannMps: p.vBachmannMps * v,
      vBundleMps: p.vBundleMps * v,
      vPurkinjeMps: p.vPurkinjeMps * v,
      vMyoLongMps: p.vMyoLongMps * v,
      vMyoTransMps: p.vMyoTransMps * v,
      pmjDelayMs: p.pmjDelayMs / v,
      targetPrMs: p.targetPrMs * slowing(1.4, tempC),
      apdRefMs: p.apdRefMs * slowing(1.5, tempC),
      apVentricular: { ...p.apVentricular, tauRepMs: p.apVentricular.tauRepMs * slowing(1.2, tempC) },
    },
    rhythm: { bpm: Math.round(75 / slowing(2.2, tempC)) },
    atrial: { main: { id: 'sinus' } },
    ventricular: { main: { id: 'normal' } },
    tissue: depth > 0 ? { notch: [notch(LV_FREE, depth), notch(RV, depth * rvF)] } : {},
    teach: { keyLeads: ['II', 'V3', 'V4', 'V5', 'V6', 'aVR'], highlight: [...LV_FREE] },
  });
}

/** Moderate hypothermia (30 °C): the library entry. */
export const HYPOTHERMIA = hypothermia(HYPOTHERMIA_TEMPS.moderate);
