/**
 * §9.11 Pacing (group 'pacing'): AAI, VVI, DDD, biventricular pacing, failure to capture, undersensing, oversensing.
 * The device is a timing machine (rhythm/pacing.ts) over an underlying rhythm; the stimulus is a source (an
 * area-preserving impulse along the lead) seen through the one lead system; the paced activation comes from the
 * generated family of the lead-tip site (rhythm/fronts.ts: RV apex → LBBB-like with a superior axis; BiV → the RV and LV
 * fronts fused). Unipolar leads are used where the spike must be obvious on paper; the bipolar variant shows the small
 * modern spike. Hallmark criteria: tests/synth/oracle/criteria/pacing.ts.
 */
import { l } from '../../core/l10n';
import type { ScenarioDef } from '../api';
import { defineGroup } from './define';

/** Underlying sinus rhythm with complete infra-His block (every QRS must be paced). */
const SINUS_CHB = { rhythm: { kind: 'sinus', rateBpm: 74, hrv: 0.02 }, junction: { infraHis: { pattern: 'complete' } } } as const;

export const PACING_SCENARIOS: readonly ScenarioDef[] = defineGroup('pacing', [
  {
    id: 'paced-aai',
    group: 'pacing',
    findings: ['paced-rhythm'],
    patient: { sex: 'female', ageY: 76 },
    source: {
      rhythm: { kind: 'paced', mode: 'AAI', ventricularSite: 'rv-apex', lowerRateBpm: 70, avDelayMs: 160, bipolar: false, underlying: { kind: 'sinus', rateBpm: 46, hrv: 0.02 } },
      activation: { kind: 'conducted' },
    },
    dials: {},
    facts: { indication: 'sinus-node dysfunction with intact AV conduction', lead: 'right atrial appendage' },
    highlights: { ra: 'focus' },
  },
  {
    id: 'paced-vvi',
    group: 'pacing',
    findings: ['paced-rhythm', 'secondary-st-t', 'atrial-fibrillation'],
    patient: { sex: 'male', ageY: 81 },
    source: {
      rhythm: { kind: 'paced', mode: 'VVI', ventricularSite: 'rv-apex', lowerRateBpm: 60, avDelayMs: 160, bipolar: false, underlying: { kind: 'fibrillation', coarseness: 0.4, cycleMs: 160 } },
      activation: { kind: 'conducted' },
      // permanent AF with AV-nodal disease (ablated / complete nodal block): every QRS is paced
      junction: { completeNodal: true },
    },
    dials: {},
    variants: {
      bipolar: {
        label: l('双极起搏（小钉样信号）', 'bipolar lead (small spikes)', 'electrodo bipolar (espículas pequeñas)'),
        patch: { rhythm: { kind: 'paced', mode: 'VVI', ventricularSite: 'rv-apex', lowerRateBpm: 60, avDelayMs: 160, bipolar: true, underlying: { kind: 'fibrillation', coarseness: 0.4, cycleMs: 160 } } },
      },
    },
    facts: { lead: 'right ventricular apex' },
    highlights: { 'rv-apical': 'focus' },
  },
  {
    id: 'paced-ddd',
    group: 'pacing',
    findings: ['paced-rhythm', 'secondary-st-t'],
    patient: { sex: 'female', ageY: 73 },
    source: {
      // sinus bradycardia with complete AV block: atrial and ventricular pacing (AP–VP) at the lower rate
      rhythm: { kind: 'paced', mode: 'DDD', ventricularSite: 'rv-apex', lowerRateBpm: 64, avDelayMs: 170, bipolar: false, underlying: { kind: 'sinus', rateBpm: 48, hrv: 0.02 } },
      activation: { kind: 'conducted' },
      junction: { infraHis: { pattern: 'complete' } },
    },
    dials: {},
    variants: {
      tracking: {
        label: l('心房感知-心室起搏（窦性跟踪）', 'atrial sensing, ventricular pacing (sinus tracking)', 'detección auricular, estimulación ventricular (seguimiento sinusal)'),
        patch: { rhythm: { kind: 'paced', mode: 'DDD', ventricularSite: 'rv-apex', lowerRateBpm: 60, avDelayMs: 150, bipolar: false, underlying: { kind: 'sinus', rateBpm: 78, hrv: 0.02 } } },
      },
    },
    facts: { leads: 'right atrial appendage, right ventricular apex', avDelayMs: '170' },
    highlights: { ra: 'focus', 'rv-apical': 'focus' },
  },
  {
    id: 'paced-biv',
    group: 'pacing',
    findings: ['paced-rhythm', 'secondary-st-t'],
    patient: { sex: 'male', ageY: 68 },
    source: {
      // cardiac resynchronisation: sinus tracking with a short AV delay, RV apex and LV lateral (coronary sinus) leads
      rhythm: { kind: 'paced', mode: 'DDD', ventricularSite: 'biv', lowerRateBpm: 60, avDelayMs: 110, bipolar: false, underlying: { kind: 'sinus', rateBpm: 72, hrv: 0.02 } },
      activation: { kind: 'conducted', blocks: { lbb: 'complete' } },
    },
    dials: {},
    facts: { leads: 'right atrium, right ventricular apex, LV lateral branch of the coronary sinus' },
    highlights: { 'rv-apical': 'focus', 'lv-mid-anterolateral': 'focus' },
  },
  {
    id: 'pacing-failure-capture',
    group: 'pacing',
    findings: ['pacing-failure-capture', 'paced-rhythm'],
    patient: { sex: 'female', ageY: 85 },
    source: {
      rhythm: { kind: 'paced', mode: 'VVI', ventricularSite: 'rv-apex', lowerRateBpm: 60, avDelayMs: 160, bipolar: false, fault: 'no-capture', underlying: SINUS_CHB.rhythm },
      activation: { kind: 'conducted' },
      // complete AV block with a slow junctional escape: every third stimulus fails to capture
      junction: { completeNodal: true, escape: { level: 'junctional', rateBpm: 36 } },
    },
    dials: {},
    facts: { fault: 'loss of capture (every third stimulus)' },
    highlights: { 'rv-apical': 'focus' },
  },
  {
    id: 'pacing-undersensing',
    group: 'pacing',
    findings: ['pacing-undersensing', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 79 },
    source: {
      // the device does not see the native QRS complexes: fixed-rate stimuli march through the sinus rhythm
      rhythm: { kind: 'paced', mode: 'VVI', ventricularSite: 'rv-apex', lowerRateBpm: 60, avDelayMs: 160, bipolar: false, fault: 'undersensing', underlying: { kind: 'sinus', rateBpm: 78, hrv: 0.02 } },
      activation: { kind: 'conducted' },
    },
    dials: {},
    facts: { fault: 'ventricular undersensing' },
    highlights: { 'rv-apical': 'focus' },
  },
  {
    id: 'pacing-oversensing',
    group: 'pacing',
    findings: ['pacing-oversensing', 'paced-rhythm'],
    patient: { sex: 'female', ageY: 77 },
    source: {
      // complete AV block, no escape: a myopotential burst sensed as ventricular activity inhibits the device
      rhythm: { kind: 'paced', mode: 'VVI', ventricularSite: 'rv-apex', lowerRateBpm: 60, avDelayMs: 160, bipolar: false, fault: 'oversensing', underlying: SINUS_CHB.rhythm },
      activation: { kind: 'conducted' },
      junction: SINUS_CHB.junction,
    },
    dials: {},
    // the sensed windows are in truth.facts.oversensedMs; the visible EMG burst needs the recording chain to take them
    facts: { fault: 'myopotential oversensing (pectoral muscle)' },
    highlights: { 'rv-apical': 'focus' },
  },
]);
