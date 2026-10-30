/**
 * Batch 3 — supraventricular re-entry: typical atrial flutter (macro-re-entry in the right atrium) and AV-nodal re-entrant
 * tachycardia (micro-re-entry in the AV junction). Both change only the rhythm generator and the conduction graph
 * (CLAUDE.md one-source rule); every F wave, QRS and retrograde P′ is H(t) = −gain·Σ c_v·s_v(t) of the activation fields.
 */
import { AP_ATRIAL } from '../../conduction/ap';
import { defineScenario } from '../define';

/**
 * Typical atrial flutter (counterclockwise, cavotricuspid-isthmus dependent) with 2:1 AV conduction.
 *
 * Mechanism: macro-re-entry around the tricuspid annulus (conduction/atrialCircuit.ts). The circuit is bounded by the
 * annulus in front and, behind, by the caval orifices joined by the crista terminalis (functional line of block; the
 * smooth intercaval wall stays septal of it). Seen from the ventricles (LAO view) the wave runs counterclockwise: up
 * the septum, across the roof in front of the SVC, down the lateral wall and through the slow cavotricuspid isthmus
 * (CTI) back to the septum; the left atrium is activated passively from the septum and Bachmann's bundle, bottom-up.
 * The sawtooth F waves are the projection of this continuously rotating atrial source (no isoelectric baseline).
 *
 * Parameters:
 *  - isthmusSpeed 0.35: the CTI (60° sector upstream of the CTI exit, annulus → far rim of the IVC orifice) conducts at
 *    0.35 m/s against 1.0 m/s elsewhere — the slow zone of the circuit. It sets the emergent cycle length ≈ 200 ms
 *    (300/min) on the HRA heart; without it the circuit closes in ≈ 170 ms.
 *  - cristaLateralFrac 0.6, cristaReachMm 22, blockMm 4: the crista line runs 0.6 orifice radii lateral of the caval
 *    centres (ends inside both orifices), stays within 22 mm of the IVC–SVC axis (posterior wall only) and is 4 mm
 *    thick (the 50-neighbour stencil jumps up to 3.35 mm).
 *  - apdAtrialMs 180 → 130, apAtrial τr 35 → 30 ms (shortened atrial refractoriness of the flutter substrate): at the
 *    200 ms cycle the atrial APD scales to ≈ 82 ms (APD90 ≈ 150 ms → excitable gap ≈ 50 ms, a quarter of the cycle, as
 *    measured by resetting in typical flutter). Every voxel has repolarized (s < 0.02) before the wave returns, so the
 *    templates of successive revolutions do not overlap in a voxel; the atrial repolarization of one revolution then
 *    falls in the CTI phase and gives the slow downslope between the sharp deflections (no flat baseline). With the
 *    sinus-rhythm APD the repolarization lands later and leaves a ≈ 100 ms plateau in II.
 *  - rhythm.flutter.ratio 2: every second flutter wave reaches the His bundle (2:1 block → ≈ 150/min). The heart-rate
 *    control sets the mean ventricular rate through the ratio: 150 → 2:1, 100 → 3:1, 75 → 4:1; rates in between give
 *    a fixed variable-block pattern (rhythm/flutterAv.ts).
 */
export const ATRIAL_FLUTTER_TYPICAL = defineScenario({
  id: 'atrial-flutter-typical',
  category: 'supraventricular',
  params: { apdAtrialMs: 130, apAtrial: { ...AP_ATRIAL, tauRepMs: 30 } },
  rhythm: { flutter: { ratio: 2 } },
  atrial: {
    main: {
      id: 'flutter',
      circuit: { direction: 'ccw', isthmusSpeed: 0.35, isthmusDeg: 60, blockMm: 4, cristaReachMm: 22, cristaLateralFrac: 0.6 },
    },
  },
  ventricular: { main: { id: 'normal' } },
  // the circulating atria are the visual; the annulus the wave turns around and the filtering AV node are highlighted
  teach: { keyLeads: ['II', 'III', 'aVF', 'V1'], highlight: ['TRICUSPID', 'AVN'] },
});

/**
 * AV-nodal re-entrant tachycardia, typical slow–fast form, 180/min.
 *
 * Mechanism: dual AV-nodal pathways; the impulse goes down the slow pathway and returns up the fast pathway, so every
 * turn of the circuit (inside the AV junction, too small to resolve on the voxel grid) sends one impulse down the His
 * bundle and one retrogradely into the atria at almost the same time. Modelled with the junctional rhythm generator:
 * V events (His activation → normal narrow QRS) at the tachycardia rate, and for each a retrograde atrial activation
 * from the AV node (P′ negative in II, III, aVF).
 *
 * Parameters:
 *  - retroDelayMs 45: His activation → retrograde atrial activation at the low septum (AV-node site). The QRS starts
 *    ≈ 37 ms after His, so atria and ventricles start almost together (P′ onset ≈ 6 ms after the QRS onset, RP′ very
 *    short). The P′ (≈ 90 ms) is buried in the QRS except its end: its negative inferior phase deepens and prolongs the
 *    S in II, III, aVF (pseudo-S) and its terminal positive phase in V1 sits at the J point (pseudo-r′). With longer
 *    delays the P′ moves into the ST segment (atypical-looking, RP′ > 70 ms).
 *  - bpm 180 (cycle 333 ms ≈ slow-pathway + fast-pathway conduction). The rate control (labelled "SVT rate",
 *    rate.ts 'svt') shortens or lengthens the circuit's cycle; it only reaches 150/min (slider range 40–150).
 */
export const AVNRT = defineScenario({
  id: 'avnrt',
  category: 'supraventricular',
  rhythm: { junctional: { bpm: 180, retroVariant: 'retrograde', retroDelayMs: 45, reentry: true } },
  atrial: { main: { id: 'sinus' }, alt: { id: 'retrograde', origin: 'AVN' } },
  ventricular: { main: { id: 'normal' } },
  teach: { keyLeads: ['V1', 'II', 'III', 'aVF'], highlight: ['AVN', 'HIS'] },
});
