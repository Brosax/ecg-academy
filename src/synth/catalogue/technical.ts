/**
 * §9.12 Technical (group 'technical'): the heart is the normal base (same source as `normal`, so the same seed gives
 * the same heart); only the recording changes (RecordingSpec: placement, noise, filters — one-source rule).
 * Signatures: criteria.md "Electrode misplacement", "Other limb cable reversals", "Technical artefacts", "Mains (AC)
 * interference", "Baseline wander", `arm-cable-reversal`, `exercise-lead-system` (Batchvarov et al. Europace 2007;
 * Harrigan et al. J Emerg Med 2012; Knight et al. NEJM 1999; Kligfield et al. Circulation 2007).
 *
 * generate() renders every electrode site a recording uses (explicit chest sites, Mason–Likar, extra leads) and runs
 * the recording chain with the sampling rate and its own seeded stream, so placement and artefact scenarios are
 * ordinary catalogue entries (registered 2026-10-19, synth-finish).
 * The 0.5 Hz monitor-filter ST distortion is not a scenario (DECISION §9.12: lesson only): a lesson requests
 * `recording: { filter: FILTER_PRESETS.monitor }` on any ST scenario.
 */
import { l } from '../../core/l10n';
import type { DialRange, DialId, ScenarioDef, SourceSpec } from '../api';
import { defineGroup } from './define';

/** The normal base (catalogue/normal.ts › normal) with a well-visible normal P (≈ 0.17 mV in II, P axis ≈ +60°): limb
 *  reversals are read on P polarity, so every technical scenario records this one heart. */
const HEART: SourceSpec = { rhythm: { kind: 'sinus', rateBpm: 72, hrv: 0.02 }, activation: { kind: 'conducted' }, atria: { gain: 1.4, raScale: 1.2 } };
const PATIENT = { sex: 'male', ageY: 45 } as const;
/** Rate only: the truth of a placement scenario is the recorded (apparent) axis, so an axis dial could not be realised. */
const DIALS: Readonly<Partial<Record<DialId, DialRange>>> = { rate: { min: 60, max: 95 } };

export const TECHNICAL_SCENARIOS: readonly ScenarioDef[] = defineGroup('technical', [
  {
    id: 'electrode-reversal-la-ra',
    group: 'technical',
    findings: ['electrode-reversal-la-ra', 'sinus-rhythm'],
    patient: PATIENT,
    source: HEART,
    recording: { placement: { limbs: { RA: 'LA', LA: 'RA' } } },
    dials: DIALS,
    facts: { placement: 'LA and RA cables swapped', contrast: 'dextrocardia' },
  },
  {
    id: 'electrode-reversal-la-ll',
    group: 'technical',
    findings: ['electrode-reversal-la-ll', 'sinus-rhythm'],
    patient: PATIENT,
    source: HEART,
    recording: { placement: { limbs: { LA: 'LL', LL: 'LA' } } },
    dials: DIALS,
    facts: { placement: 'LA and LL cables swapped' },
  },
  {
    id: 'electrode-reversal-ra-ll',
    group: 'technical',
    findings: ['electrode-reversal-ra-ll', 'sinus-rhythm'],
    patient: PATIENT,
    source: HEART,
    recording: { placement: { limbs: { RA: 'LL', LL: 'RA' } } },
    dials: DIALS,
    facts: { placement: 'RA and LL cables swapped', mimics: 'inferior Q waves, low atrial rhythm' },
  },
  {
    // proposed FindingId 'electrode-reversal-rl' (DECISION §9.12) is not in src/core/findings.ts yet
    id: 'neutral-cable-reversal',
    group: 'technical',
    findings: ['sinus-rhythm'],
    title: l('左上肢与右下肢（中性）电极反接', 'Left arm / right leg (neutral) cable reversal', 'Inversión de los electrodos de brazo izquierdo y pierna derecha (neutro)'),
    patient: PATIENT,
    source: HEART,
    recording: { placement: { limbs: { LA: 'RL', RL: 'LA' } } },
    dials: DIALS,
    facts: { placement: 'LA cable on the right leg, RL (neutral) cable on the left arm', flatLead: 'III', technical: 'electrode-reversal-rl' },
  },
  {
    id: 'precordial-misplacement',
    group: 'technical',
    findings: ['precordial-misplacement', 'sinus-rhythm'],
    patient: PATIENT,
    source: HEART,
    recording: { placement: { chest: { V2: 'V3', V3: 'V2' } } },
    dials: DIALS,
    facts: { placement: 'V2 and V3 cables swapped' },
  },

  {
    id: 'precordial-misplacement-high',
    group: 'technical',
    findings: ['precordial-misplacement', 'sinus-rhythm'],
    title: l('V1–V2 电极位置过高（第 2 肋间）', 'High V1–V2 placement (2nd intercostal space)', 'Colocación alta de V1–V2 (2.º espacio intercostal)'),
    patient: PATIENT,
    source: HEART,
    recording: { placement: { chest: { V1: { ics: 2, line: 'sternal', side: 'R' }, V2: { ics: 2, line: 'sternal', side: 'L' } } } },
    dials: DIALS,
    // known deviation (2026-10-19): no terminal r′ (rSr′) in V1–V2. The normal base's terminal QRS force is almost
    // purely posterior (Frank Y ≈ −0.05 mV at 66–90 ms), so no anterior site sees it upright; an r′ needs a late
    // superior / RVOT lobe in the normal pattern (owner of morph/patterns/normal.ts), not a lead-field change
    facts: { placement: 'V1 and V2 in the 2nd intercostal space', mimics: 'poor R progression, anterior infarction', signs: 'negative P and inverted T in V1, small R in V2' },
  },
  {
    id: 'limbs-on-torso',
    group: 'technical',
    findings: ['sinus-rhythm'],
    title: l('肢体电极置于躯干（Mason–Likar）', 'Limb electrodes on the torso (Mason–Likar)', 'Electrodos de los miembros en el tronco (Mason-Likar)'),
    patient: PATIENT,
    source: HEART,
    recording: { placement: { limbsOnTorso: true } },
    dials: DIALS,
    facts: { placement: 'Mason–Likar: arm electrodes in the infraclavicular fossae, leg electrodes between costal margin and iliac crest' },
  },
  {
    id: 'baseline-wander',
    group: 'technical',
    findings: ['baseline-wander', 'sinus-rhythm'],
    patient: PATIENT,
    source: HEART,
    recording: { noise: { wanderMv: 0.25 } },
    dials: DIALS,
    facts: { artefact: 'respiratory baseline wander, largest in the chest leads' },
  },
  {
    id: 'muscle-tremor',
    group: 'technical',
    findings: ['muscle-tremor', 'sinus-rhythm'],
    patient: PATIENT,
    source: HEART,
    recording: { noise: { emgMv: 0.05, emgOn: ['LA'] } },
    dials: DIALS,
    facts: { artefact: 'muscle (EMG) noise on the left-arm electrode: I, III and aVL; lead II spared' },
  },
  {
    id: 'muscle-tremor-parkinsonian',
    group: 'technical',
    findings: ['muscle-tremor', 'sinus-rhythm'],
    title: l('帕金森震颤伪差（假性心房扑动）', 'Parkinsonian tremor artefact (pseudo-flutter)', 'Artefacto por temblor parkinsoniano (pseudoflúter)'),
    patient: { sex: 'male', ageY: 74 },
    source: HEART,
    recording: { noise: { tremor: { mv: 0.1, hz: 5, on: 'LL' } } },
    dials: { rate: { min: 60, max: 90 } },
    facts: { artefact: '5 Hz rest tremor on the left-leg electrode: II, III and aVF; lead I spared', mimics: 'atrial flutter' },
  },
  {
    id: 'ac-interference',
    group: 'technical',
    findings: ['ac-interference', 'sinus-rhythm'],
    patient: PATIENT,
    source: HEART,
    recording: { noise: { mains: { mv: 0.3, hz: 50, imbalance: 0.3 } } },
    dials: DIALS,
    facts: { artefact: '50 Hz mains interference from unequal electrode contact' },
  },
  {
    // proposed FindingId 'motion-artefact' (DECISION §9.12) is not in src/core/findings.ts yet
    id: 'motion-artefact',
    group: 'technical',
    findings: ['sinus-rhythm'],
    title: l('运动伪差（假性室性心动过速）', 'Motion artefact (pseudo-ventricular tachycardia)', 'Artefacto por movimiento (pseudotaquicardia ventricular)'),
    patient: PATIENT,
    source: HEART,
    recording: { noise: { motion: { electrode: 'RA', tMs: 2600, durMs: 3600, mv: 0.8 } } },
    dials: { rate: { min: 60, max: 90 } },
    facts: { artefact: 'right-arm electrode motion: I, II and aVR; lead III spared', mimics: 'ventricular tachycardia', technical: 'motion-artefact' },
  },
]);
