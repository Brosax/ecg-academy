/**
 * §9.3 Supraventricular tachycardias, flutter, fibrillation, pre-excitation (group 'svt'). M2 benchmarks: atrial
 * fibrillation, typical flutter with 4:1 conduction and WPW with a left lateral pathway. M3 (synth-rhythm): AVNRT
 * (junctional re-entry loop with the retrograde P′ at the end of the QRS), AVRT (orthodromic via the AV node and back
 * through a concealed pathway; antidromic fully pre-excited), pre-excited AF (per-beat fusion of the pathway and nodal
 * fronts), short PR without pre-excitation, and the flutter / AF variants.
 * The AV-node recovery is measured from the node's last exit (rhythm/junction.ts); flutter ratios use `erpForRatio`.
 * Hallmark criteria: tests/synth/oracle/criteria/svt.ts.
 */
import { l } from '../../core/l10n';
import { defineGroup } from './define';

/** AV node of the AF scenarios: jittered ERP and concealment give the irregularly irregular response. */
const AF_AVN = { ahMinMs: 80, ahExtMs: 60, tauMs: 70, erpMs: 330, jitter: 0.16, conceal: 0.35 } as const;
/** Flutter AV node: 4:1 at a 200 ms cycle (ERP between 3 and 4 atrial cycles after the conducted one). */
const FLUTTER_AVN = { ahMinMs: 170, ahExtMs: 40, tauMs: 70, erpMs: 640, jitter: 0, conceal: 0 } as const;
/** Concealed left lateral pathway (retrograde only: no pre-excitation in sinus rhythm). */
const CONCEALED_LL = { site: 'left-lateral', conductionMs: 116, erpMs: 260, antegrade: false, retrograde: true } as const;

export const SVT_SCENARIOS = defineGroup('svt', [
  {
    id: 'atrial-fibrillation',
    group: 'svt',
    findings: ['atrial-fibrillation'],
    patient: { sex: 'male', ageY: 72 },
    source: {
      rhythm: { kind: 'fibrillation', coarseness: 0.5, cycleMs: 150 },
      activation: { kind: 'conducted' },
      junction: { avn: AF_AVN },
    },
    // ventricularResponse: the mean ventricular rate (statistic, dials.ts › AF_RESPONSE_MAP); the rapid / slow variants
    // own the AV node, so the dial is not applied to them; drills draw a narrower range (dials/ranges.ts)
    dials: { fCoarseness: { min: 0.2, max: 0.9 }, ventricularResponse: { min: 60, max: 150 } },
    variants: {
      rapid: {
        label: l('快速心室率', 'rapid ventricular response', 'respuesta ventricular rápida'),
        patch: { junction: { avn: { ...AF_AVN, erpMs: 300, conceal: 0.25 } } },
      },
      slow: {
        label: l('缓慢心室率', 'slow ventricular response', 'respuesta ventricular lenta'),
        patch: { junction: { avn: { ...AF_AVN, erpMs: 860, conceal: 0.08, jitter: 0.05 } } },
      },
    },
  },
  {
    id: 'atrial-flutter',
    group: 'svt',
    findings: ['atrial-flutter'],
    patient: { sex: 'male', ageY: 69 },
    source: {
      rhythm: { kind: 'flutter', circuit: 'ccw', cycleMs: 200 },
      activation: { kind: 'conducted' },
      junction: { avn: FLUTTER_AVN },
    },
    // 2:1 – 4:1 for lessons; drills draw only the 4:1 base (dials/ranges.ts: the oracle cannot re-measure F waves
    // hidden in the QRS-T at 2:1 / 3:1, so those values are not T5-validated)
    dials: { conductionRatio: { min: 2, max: 4 } },
    variants: {
      clockwise: {
        label: l('顺钟向（反向典型）房扑', 'clockwise (reverse typical) flutter', 'flúter horario (típico inverso)'),
        // only the circuit and its cycle change: the AV node (4:1 at 200–210 ms cycles) and the conductionRatio dial stay
        // the scenario's (a patch that sets the rhythm kind or the node would own the dial: dials/solve.ts › variantOwns)
        patch: { rhythm: { circuit: 'cw', cycleMs: 210 } },
      },
      variable: {
        label: l('房室传导比例不等', 'variable AV conduction', 'conducción AV variable'),
        patch: { junction: { avn: { ...FLUTTER_AVN, erpMs: 580, jitter: 0.12, conceal: 0.25 } } },
      },
    },
    facts: { circuit: 'typical counter-clockwise (cavotricuspid isthmus)' },
  },
  {
    id: 'wpw',
    group: 'svt',
    findings: ['wpw', 'short-pr', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 21 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 72, hrv: 0.02 },
      activation: { kind: 'preexcited', pathway: 'left-lateral' },
      // pre-excitation shortens the APD dispersion that makes the normal primary gradient: the secondary T (opposite
      // to the delta and the pre-excited QRS) dominates, as in the classic tracing
      repol: { gScale: 0.2 },
      // PR 116: the whole P is inscribed, then the delta starts with no PR segment (P offset ≈ delta onset)
      junction: { pathway: { site: 'left-lateral', conductionMs: 116, erpMs: 280, antegrade: true, retrograde: true } },
    },
    dials: { rate: { min: 60, max: 95 } },
    facts: { pathway: 'left lateral' },
    highlights: { 'lv-basal-anterolateral': 'pathway' },
  },
  {
    id: 'avnrt',
    group: 'svt',
    findings: ['svt', 'avnrt'],
    patient: { sex: 'female', ageY: 34 },
    // the retrograde P′ leaves the septum into both atria at once (rhythm/atrialSites.ts 'fast-pathway'): a short,
    // tall P′ (atrial gain 1.4) whose end shows as a pseudo-r′ ≈ 0.6 mm in V1 and a pseudo-S in II, III and aVF; a
    // taller P′ merges with the QRS end (the delineated QRS widens by > 8 ms)
    source: { rhythm: { kind: 'avnrt', rateBpm: 176, form: 'typical' }, activation: { kind: 'conducted' }, atria: { gain: 1.4 } },
    dials: {},
    variants: {
      atypical: {
        label: l('非典型（快-慢型）', 'atypical (fast–slow)', 'atípica (rápida-lenta)'),
        // the slow-pathway exit (posterior septum) spreads like a low-atrial focus: the default P′ amplitude
        patch: { rhythm: { kind: 'avnrt', rateBpm: 150, form: 'atypical' }, atria: { gain: 1 } },
      },
    },
    facts: { circuit: 'slow pathway antegrade, fast pathway retrograde' },
    highlights: { 'av-node': 'focus' },
  },
  {
    id: 'avrt',
    group: 'svt',
    findings: ['svt', 'avrt'],
    patient: { sex: 'male', ageY: 26 },
    source: {
      rhythm: { kind: 'avrt', rateBpm: 190, form: 'orthodromic' },
      activation: { kind: 'conducted' },
      junction: { pathway: CONCEALED_LL },
    },
    dials: {},
    variants: {
      antidromic: {
        label: l('逆向型（完全预激）', 'antidromic (fully pre-excited)', 'antidrómica (preexcitación máxima)'),
        patch: {
          rhythm: { kind: 'avrt', rateBpm: 185, form: 'antidromic' },
          activation: { kind: 'preexcited', pathway: 'left-lateral' },
          // a sustained wide-complex tachycardia: VT-like electrotonic coupling (the scheduler) and a small primary
          // gradient, so the secondary T stays smaller than the fully pre-excited QRS
          repol: { qtcMs: 440, gScale: 0.2 },
          junction: { pathway: { ...CONCEALED_LL, antegrade: true } },
        },
        findings: ['svt', 'avrt', 'wpw'],
      },
    },
    facts: { pathway: 'left lateral (concealed)' },
    highlights: { 'lv-basal-anterolateral': 'pathway' },
  },
  {
    id: 'preexcited-af',
    group: 'svt',
    findings: ['atrial-fibrillation', 'wpw'],
    patient: { sex: 'male', ageY: 29 },
    source: {
      rhythm: { kind: 'fibrillation', coarseness: 0.45, cycleMs: 150 },
      activation: { kind: 'preexcited', pathway: 'left-lateral' },
      // QTc 380: at ≈ 200 /min the ventricular refractoriness (≈ T apex) lets the pathway's 235 ms ERP set the
      // shortest RR (< 250 ms, the high-risk sign)
      repol: { qtcMs: 380, gScale: 0.3 },
      // a pathway with a short refractory period conducts most wavelets; the node competes (fusion of varying degree,
      // some narrow beats): the irregular, broad, beat-to-beat changing tachycardia
      junction: { avn: { ...AF_AVN, erpMs: 280, conceal: 0.2 }, pathway: { site: 'left-lateral', conductionMs: 116, erpMs: 235, antegrade: true, retrograde: true } },
    },
    dials: {},
    // no dominant QRS and QT: the fusion of the two fronts changes beat to beat ("fast, broad, irregular"); the reader
    // reports the rhythm, the shortest RR and the changing width — graded by the hallmark criteria, not by intervals
    intervals: 'not-applicable',
    facts: { pathway: 'left lateral', risk: 'shortest pre-excited RR < 250 ms' },
    highlights: { 'lv-basal-anterolateral': 'pathway' },
  },
  {
    id: 'short-pr',
    group: 'svt',
    findings: ['short-pr', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 27 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 72, hrv: 0.02 },
      activation: { kind: 'conducted' },
      // enhanced AV-nodal conduction: short AH, no accessory pathway (no delta wave)
      junction: { avn: { ahMinMs: 35, ahExtMs: 50, tauMs: 70, erpMs: 260, jitter: 0, conceal: 0 } },
    },
    dials: { rate: { min: 60, max: 95 } },
    highlights: { 'av-node': 'focus' },
  },
]);
