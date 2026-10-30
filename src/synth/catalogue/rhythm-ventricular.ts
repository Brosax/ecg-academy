/**
 * §9.4 Ventricular ectopy and rhythms (group 'ventricular'). Ectopic and escape beats take their activation from the
 * origin (authored site set or the generated family of rhythm/fronts.ts); their T waves follow the gradient rule with
 * the documented electrotonic coupling (PVC 0.3, sustained VT 0.7: DECISION §9.4, §11). The sinus node keeps firing
 * under a PVC (compensatory pause) and under a VT (AV dissociation; capture and fusion beats when the junction lets an
 * impulse through). Polymorphic VT, torsades, ventricular flutter and fibrillation are renewal processes with no
 * measurable intervals; asystole has no ventricular activity at all.
 * Hallmark criteria: tests/synth/oracle/criteria/ventricular.ts.
 */
import { l } from '../../core/l10n';
import { defineGroup } from './define';

const SINUS = { kind: 'sinus', rateBpm: 74, hrv: 0.02 } as const;

export const VENTRICULAR_SCENARIOS = defineGroup('ventricular', [
  {
    id: 'vt-monomorphic',
    group: 'ventricular',
    findings: ['vt-monomorphic', 'av-dissociation'],
    patient: { sex: 'male', ageY: 66 },
    source: {
      // 150 /min (a common sustained-VT rate): the dissociated sinus P waves (80 /min) land in the ST–T of several
      // complexes per strip (≥ 3 visible on every seed); at the faster dial values most of them hide in the QRS-T
      rhythm: { kind: 'ventricular', origin: 'lv-inferior-scar', rateBpm: 150, sinusBpm: 80 },
      activation: { kind: 'conducted' },
      repol: { coupling: 0.7, gScale: 0.2, qtcMs: 440, tShape: { stMs: 0, riseFrac: 0.6 }, u: { ratio: 0 } },
    },
    dials: { rate: { min: 140, max: 200 } },
    variants: {
      // DECISION §11 / §12.2: at ≤ 160 /min the TQ opens and the dissociated sinus P waves become visible
      teaching: {
        label: l('教学版（可见分离的P波）', 'teaching (visible dissociated P waves)', 'docente (ondas P disociadas visibles)'),
        patch: { rhythm: { kind: 'ventricular', origin: 'lv-inferior-scar', rateBpm: 125, sinusBpm: 75 } },
      },
      // a sinus impulse that finds the junction and the ventricles excitable captures them (narrow) or fuses with the VT
      // beat (intermediate); incommensurate rates keep them sporadic (2–4 per strip), as recorded
      captures: {
        label: l('心室夺获与融合波', 'capture and fusion beats', 'latidos de captura y de fusión'),
        patch: { rhythm: { kind: 'ventricular', origin: 'lv-inferior-scar', rateBpm: 146, sinusBpm: 68, captures: true } },
      },
    },
    facts: { origin: 'LV inferior wall (scar)' },
    highlights: { 'lv-apical-inferior': 'focus', 'lv-mid-inferior': 'infarct' },
  },
  {
    id: 'pvc',
    group: 'ventricular',
    findings: ['sinus-rhythm', 'pvc'],
    patient: { sex: 'female', ageY: 45 },
    source: {
      rhythm: SINUS,
      ectopy: [{ kind: 'pvc', pattern: 'single', couplingMs: 470, origins: ['rvot-free'] }],
      activation: { kind: 'conducted' },
    },
    dials: { rate: { min: 62, max: 88 } },
    variants: {
      'lv-lateral': {
        label: l('左室侧壁起源（右束支阻滞形）', 'LV lateral origin (RBBB-like)', 'origen lateral del VI (morfología de BRD)'),
        patch: { ectopy: [{ kind: 'pvc', pattern: 'single', couplingMs: 450, origins: ['lv-lateral'] }] },
      },
      fascicular: {
        label: l('左后分支起源', 'left posterior fascicle origin', 'origen fascicular posterior'),
        patch: { ectopy: [{ kind: 'pvc', pattern: 'single', couplingMs: 460, origins: ['fascicular-posterior'] }] },
      },
    },
    facts: { origin: 'right ventricular outflow tract' },
    highlights: { 'rv-outflow': 'focus' },
  },
  {
    id: 'ventricular-bigeminy',
    group: 'ventricular',
    findings: ['sinus-rhythm', 'ventricular-bigeminy', 'pvc'],
    patient: { sex: 'male', ageY: 61 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 70, hrv: 0.015 },
      ectopy: [{ kind: 'pvc', pattern: 'bigeminy', couplingMs: 480, origins: ['lv-lateral'] }],
      activation: { kind: 'conducted' },
    },
    dials: { rate: { min: 60, max: 82 } },
    facts: { origin: 'LV lateral wall' },
    highlights: { 'lv-mid-anterolateral': 'focus' },
  },
  {
    id: 'pvc-patterns',
    group: 'ventricular',
    findings: ['sinus-rhythm', 'pvc', 'ventricular-couplet'],
    patient: { sex: 'male', ageY: 68 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 72, hrv: 0.015 },
      ectopy: [{ kind: 'pvc', pattern: 'couplet', couplingMs: 470, origins: ['rvot-free'] }],
      activation: { kind: 'conducted' },
    },
    dials: {},
    variants: {
      trigeminy: {
        label: l('室性早搏三联律', 'ventricular trigeminy', 'trigeminismo ventricular'),
        patch: { ectopy: [{ kind: 'pvc', pattern: 'trigeminy', couplingMs: 460, origins: ['rvot-free'] }] },
        findings: ['sinus-rhythm', 'pvc'],
      },
      multifocal: {
        label: l('多源性室性早搏', 'multifocal PVCs', 'extrasístoles ventriculares multifocales'),
        patch: { ectopy: [{ kind: 'pvc', pattern: 'trigeminy', couplingMs: 460, origins: ['rvot-free', 'lv-lateral'] }] },
        findings: ['sinus-rhythm', 'pvc'],
      },
    },
    facts: { origin: 'right ventricular outflow tract' },
    highlights: { 'rv-outflow': 'focus' },
  },
  {
    id: 'aivr',
    group: 'ventricular',
    findings: ['aivr', 'av-dissociation'],
    patient: { sex: 'male', ageY: 57 },
    source: {
      // accelerated focus competing with a sinus rhythm of similar rate: dissociation, captures and fusion beats
      rhythm: { kind: 'ventricular', origin: 'lv-lateral', rateBpm: 76, sinusBpm: 72, captures: true },
      activation: { kind: 'conducted' },
    },
    dials: {},
    facts: { origin: 'LV lateral wall', context: 'reperfusion after primary PCI' },
    highlights: { 'lv-mid-anterolateral': 'focus' },
  },
  {
    id: 'ventricular-escape-rhythm',
    group: 'ventricular',
    findings: ['ventricular-escape-rhythm', 'av-block-3', 'av-dissociation'],
    patient: { sex: 'female', ageY: 84 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 82, hrv: 0.02 },
      activation: { kind: 'conducted' },
      junction: { infraHis: { pattern: 'complete' }, escape: { level: 'ventricular', rateBpm: 32, origin: 'lv-apex' } },
    },
    dials: {},
    facts: { blockLevel: 'infra-His', escape: 'ventricular 32/min' },
    highlights: { his: 'block', 'lv-apex': 'focus' },
  },
  {
    id: 'vt-polymorphic',
    group: 'ventricular',
    findings: ['vt-polymorphic'],
    patient: { sex: 'male', ageY: 63 },
    source: { rhythm: { kind: 'polymorphic', rateBpm: 230, twistBeats: null }, activation: { kind: 'conducted' } },
    dials: {},
    intervals: 'not-applicable',
    facts: { context: 'acute ischaemia, normal QT before the run' },
  },
  {
    id: 'torsades',
    group: 'ventricular',
    findings: ['torsades', 'long-qt'],
    patient: { sex: 'female', ageY: 71 },
    source: {
      rhythm: { kind: 'polymorphic', rateBpm: 220, twistBeats: 8 },
      activation: { kind: 'conducted' },
      repol: { qtcMs: 570 },
    },
    dials: {},
    intervals: 'not-applicable',
    facts: { context: 'drug-induced long QT (QTc ≈ 570 ms in the sinus beats)' },
  },
  {
    id: 'ventricular-flutter',
    group: 'ventricular',
    findings: ['ventricular-flutter'],
    patient: { sex: 'male', ageY: 59 },
    source: { rhythm: { kind: 'vflutter', rateBpm: 300 }, activation: { kind: 'conducted' } },
    dials: {},
    intervals: 'not-applicable',
  },
  {
    id: 'ventricular-fibrillation',
    group: 'ventricular',
    findings: ['ventricular-fibrillation'],
    patient: { sex: 'male', ageY: 64 },
    source: { rhythm: { kind: 'vf', coarseness: 0.75 }, activation: { kind: 'conducted' } },
    dials: { fCoarseness: { min: 0.5, max: 1 } },
    variants: {
      fine: {
        label: l('细颤', 'fine VF', 'FV fina'),
        patch: { rhythm: { kind: 'vf', coarseness: 0.1 } },
      },
    },
    intervals: 'not-applicable',
  },
  {
    id: 'asystole',
    group: 'ventricular',
    findings: ['asystole'],
    patient: { sex: 'female', ageY: 80 },
    source: { rhythm: { kind: 'asystole', atrialBpm: null }, activation: { kind: 'conducted' } },
    // a recorded asystole is never a ruler-straight line: slight respiratory / electrode drift (wander below the
    // artefact threshold of chain.ts, so no technical finding), on both variants
    recording: { noise: { wanderMv: 0.05 } },
    dials: {},
    variants: {
      'p-wave': {
        label: l('P波性停搏（仅有P波）', 'P-wave asystole', 'asistolia con ondas P'),
        patch: { rhythm: { kind: 'asystole', atrialBpm: 52 } },
      },
    },
    intervals: 'not-applicable',
  },
]);
