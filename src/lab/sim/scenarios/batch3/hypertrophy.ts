/**
 * Batch 3 — ventricular hypertrophy (docs/research/disease-spec.json: lvh, rvh).
 *
 * Lever: tissue.hypertrophy (scenarios/wallThickness.ts). The HRA voxel geometry is fixed, so a k-fold thicker wall is
 * mapped onto it as a transmural stretch of the selected myocardium:
 *   - source: every voxel face carries the stretched face vector (k·I − (k − 1)·d dᵀ)·n·h² (d = transmural direction),
 *     i.e. fronts running along the wall (their surface spans the thickness) are k-fold larger, fronts crossing the
 *     wall keep their area; Σc ≡ 0 is kept exactly, so a uniformly depolarized heart still gives a flat ST
 *     (source/hypertrophyKernel.ts — a per-voxel `gain` would leave ±0.4–1.2 mV of spurious ST shift on this heart);
 *   - conduction: crossing the wall takes k-fold longer at unchanged tissue speed (transmural speed factor 1/k).
 * Nothing else is scaled: the larger voltage, the later R peak and the secondary ST-T change all follow from the thick
 * wall's fronts lasting longer and being cancelled less by the opposite ventricle. The wall is not drawn thicker in
 * 3D (the stretch lives in the source and the activation times, which the 3D colouring and the slice share).
 * The "strain" repolarization changes are regional APD / injury parameters on the same fields.
 */
import { defineScenario } from '../define';
import type { RegionSelector } from '../types';

const LV_WALL = {
  regions: ['LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL', 'LV_APEX', 'SEPTUM'],
} as const satisfies RegionSelector;
const RV_WALL = { regions: ['RV_FREE', 'RV_APEX', 'RVOT'] } as const satisfies RegionSelector;
/** Anterior, anterolateral, inferolateral and apical segments: the wall facing I, aVL, V5 and V6. */
const ANTEROLATERAL = [1, 5, 6, 7, 11, 12, 13, 16, 17];

/**
 * Left ventricular hypertrophy with "strain" (pressure overload, e.g. long-standing hypertension or aortic stenosis).
 * - Concentric hypertrophy: LV free wall and septum twice as thick (factor 2, e.g. 9 → 18 mm; spec "×1.5–2.0").
 *   Endocardium-to-epicardium activation of the LV now takes twice as long (R-peak time V6 35 → 55 ms) and the LV
 *   fronts outlast the RV's: SV1 + RV5/6 2.7 → 6.5 mV, RaVL + SV3 1.2 → 3.1 mV, axis +19° → −15° (leftward shift).
 *   QRS stays narrow (80 ms; the last regions to activate are the thin basal ones).
 * - Strain = relative subendocardial ischaemia of the thick anterolateral wall plus hypertrophic APD remodelling:
 *     subendocardium (inner third): mild current of injury (ε 0.15, r 0.05 → ST(J) −0.1…−0.2 mV in I, aVL, V5, V6) and
 *       ischaemic APD shortening (−60 ms; K-ATP opening) — the endocardium starts to repolarize during the ST segment;
 *     subepicardium (outer third): APD +40 ms (Ito down-regulation of hypertrophied myocytes).
 *   The transmural repolarization order reverses (endocardium first) → T opposite to the QRS in I, aVL, V5, V6 (and
 *   reciprocal ST elevation / tall T in V1–V3). The early, gradual endocardial repolarization makes the downsloping ST
 *   merge into the inverted T, while the late epicardial repolarization ends it quickly → asymmetric T.
 * - Not modelled: left atrial enlargement (P mitrale; optional in the spec): in this model the V1 P wave is already
 *   negative in sinus rhythm, so the P-terminal-force criterion would not discriminate.
 */
export const LVH = defineScenario({
  id: 'lvh',
  category: 'hypertrophy',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'lvh' } },
  tissue: {
    hypertrophy: [{ ...LV_WALL, factor: 2 }],
    injury: [{ aha: ANTEROLATERAL, layer: 'subendocardial', plateauDrop: 0.15, restRise: 0.05 }],
    apd: [
      { aha: ANTEROLATERAL, layer: 'subendocardial', deltaMs: -60 },
      { aha: ANTEROLATERAL, layer: 'epicardial', deltaMs: 40 },
    ],
  },
  teach: { keyLeads: ['V1', 'V5', 'V6', 'aVL', 'V3', 'I'], highlight: ['LV_LATERAL', 'LV_ANTERIOR', 'LV_APEX', 'SEPTUM'] },
});

/**
 * Right ventricular hypertrophy with RV strain and P pulmonale (pressure overload, e.g. pulmonary hypertension or
 * pulmonary stenosis).
 * - RV free wall, apex and outflow tract 2.5 times as thick (e.g. 4 → 10 mm; spec "×2–3"): the thick RV is activated
 *   late and its rightward-anterior fronts are no longer cancelled by the LV → dominant R in V1 (R ≈ 1.3 mV, R/S > 1,
 *   late R peak), deep S in V5–V6, right axis deviation (≈ +160°); QRS 83 ms.
 * - RV strain: the hypertrophied RV subepicardium and the RV side of the septum (selector layer "epicardial" = the
 *   RV-facing third of the septum) repolarize 80 ms later → T inversion in V1–V3. The inferior leads need the inferior
 *   wall as well: the RV's diaphragmatic wall is small on the HRA heart, so the adjacent inferior LV subepicardium
 *   (AHA 4, 10, 15) is included (+40 ms, as in the pulmonary-embolism scenario) → T inversion in III and aVF.
 * - P pulmonale: the dilated, hypertrophied right atrium is a 3-fold stronger atrial source (isotropic, per voxel face:
 *   no spurious atrial ST / PR-segment shift) → tall, narrow P in II (≈ 0.32 mV, duration unchanged, axis ≈ +90°).
 */
export const RVH = defineScenario({
  id: 'rvh',
  category: 'hypertrophy',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'rvh' } },
  tissue: {
    hypertrophy: [{ ...RV_WALL, factor: 2.5 }, { regions: ['RA'], factor: 3 }],
    apd: [
      { ...RV_WALL, layer: 'epicardial', deltaMs: 80 },
      { regions: ['SEPTUM'], layer: 'epicardial', deltaMs: 80 },
      { aha: [4, 10, 15], layer: 'epicardial', deltaMs: 40 },
    ],
  },
  teach: { keyLeads: ['V1', 'V2', 'V6', 'I', 'aVF', 'III', 'II'], highlight: ['RV_FREE', 'RVOT', 'RV_APEX', 'RA'] },
});
