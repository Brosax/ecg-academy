/**
 * Batch 3 — rhythms driven by a continuous ventricular scroll-wave field (source/vfField.ts): ventricular fibrillation
 * and torsades de pointes. Neither has ventricular beat events while the field runs; the ECG is still only
 * H_V = −gain·Σ c_v·s_v(t), with s_v from the same closed-form phase field that colours and moves the 3D ventricles.
 */
import { defineScenario } from '../define';
import { NORMAL_PARAMS } from '../normal';

const ALL_AHA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

/**
 * Ventricular fibrillation (coarse → fine). Five meandering scroll waves with transmural filaments, each owning the part
 * of the ventricles nearest to it (the static domain borders act as lines of functional block), cycle lengths
 * 160–230 ms (dominant frequency ≈ 4.5–6 Hz, 260–375/min) that are incommensurate, so the sum never settles into
 * complexes: no P, QRS or T, no isoelectric line. Fibrillating myocardium has a short APD (ρ = 0.55·CL, τr 16 ms).
 * CV 0.4 mm/ms (slowed conduction during VF). At the normal ventricular source strength this is coarse VF (≈ 1 mV
 * peak-to-peak in II); the strength decays to 0.25 with a 2-min time constant (ischaemic loss of excitability →
 * fine VF). The sinus node keeps firing (the atria are not part of the arrhythmia, early VF); its impulses meet
 * fibrillating ventricles and are concealed; the small P waves are lost in the fibrillatory waves.
 */
export const VENTRICULAR_FIBRILLATION = defineScenario({
  id: 'ventricular-fibrillation',
  category: 'ventricular',
  rhythm: {
    vf: {
      cycleMs: [175, 205, 190, 230, 160],
      cvMmPerMs: 0.4,
      meanderMm: 7,
      meanderTurns: [3, 5, 4, 2, 6],
      apdFrac: 0.55,
      tauRepMs: 16,
      amplitude: 1,
      periodMs: 12000,
      decay: { fineFrac: 0.25, tauMs: 120000 },
      seed: 11,
    },
  },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' } },
  // the chaotic ventricular colouring is the visual; nothing is highlighted
  teach: { keyLeads: ['II', 'V1', 'V5', 'aVR'], highlight: [] },
});

/**
 * Torsades de pointes on an acquired long QT (e.g. an IKr-blocking drug with hypokalaemia). Background: longer
 * ventricular APD (apdRef 229 → 330 ms) with a slow phase 3 (τr 35 ms) and extra prolongation of the subendocardium
 * (+45 ms, larger transmural dispersion of repolarization) → QTc > 500 ms at 60/min.
 * Episodes (rhythm/tdpRhythm.ts): four sinus beats → an isolated PVC from the focus just after the T wave → the next
 * sinus impulse is concealed (pause) → the post-pause beat (longer QT) → an R-on-T beat from the same focus 60 ms before
 * its T wave ends → a 6-s run: one scroll wave (CL 270 ms ≈ 222/min, CV 0.3 mm/ms) whose filament precesses about the
 * anteroposterior axis (one turn per 12 cycles) — the plane of the rotating heart vector turns, so the limb leads see
 * the complexes swell, shrink to a node every ~6 beats and return with the opposite polarity. Tissue still
 * repolarizing when the trigger arrives blocks it and is entered later by the re-entrant wave. After the run every
 * point completes its last AP and sinus conduction resumes. Source strength 0.4: the closed-form rotor activates the
 * ventricles more coherently than real re-entry, whose curved and partly blocked fronts cancel (1 would give 4–7 mV
 * complexes). Sinus rates ≥ 85/min suppress the episodes (no pause, shorter QT: why pacing / isoprenaline help).
 */
export const TORSADES_DE_POINTES = defineScenario({
  id: 'torsades-de-pointes',
  category: 'ventricular',
  params: { apdRefMs: 350, apVentricular: { ...NORMAL_PARAMS.apVentricular!, tauRepMs: 35 } },
  rhythm: {
    bpm: 60,
    vf: {
      cycleMs: [270],
      cvMmPerMs: 0.3,
      meanderMm: 6,
      meanderTurns: [40],
      apdFrac: 0.55,
      tauRepMs: 18,
      amplitude: 0.4,
      periodMs: 64800,
      precession: { periodMs: 3240, axis: [0, 0, 1] },
      episodes: { sinusBeats: 4, pvcCouplingFrac: 0.62, triggerBeforeTEndMs: 60, runMs: 6000, suppressAtBpm: 85 },
      seed: 5,
    },
  },
  atrial: { main: { id: 'sinus' } },
  ventricular: { main: { id: 'normal' }, alt: { id: 'tdp-focus', ectopic: { at: 'LV_ANTERIOR', layer: 'endo' } } },
  tissue: { apd: [{ aha: ALL_AHA, layer: 'subendocardial', deltaMs: 50 }, { regions: ['RV_FREE', 'RV_APEX', 'RVOT'], layer: 'subendocardial', deltaMs: 50 }] },
  teach: { keyLeads: ['II', 'III', 'aVF', 'V3', 'V5'], highlight: ['LV_ANTERIOR'] },
});
