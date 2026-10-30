/**
 * §9.6 Intraventricular conduction. Every scenario is an authored activation pattern (morph/patterns: rbbb, lbbb,
 * fascicular, bifascicular) selected by the branch blocks, or the normal pattern with a substrate change (IVCD:
 * conduction stretch + LV mass). The T is secondary (gradient rule) unless a primary change is declared.
 * Hallmark criteria: tests/synth/oracle/criteria/conduction.ts.
 *
 * Naming follows criteria.md `trifascicular`: bifascicular block plus a long PR is described by its components
 * ("RBBB + LAFB + first-degree AV block"), never as "trifascicular block"; the `trifascicular-block` finding is kept for
 * evidence of disease in the remaining fascicle actually seen on the ECG: the `mobitz2` variant (intermittent
 * infra-His block below the bifascicular block). Alternating bundle-branch block needs per-beat alternation of the
 * blocked branch, which the junction does not model (bundle refractoriness depends on the cycle, not on the beat
 * count).
 * Rate-dependent BBB: the bundle's refractory period (junction.bundleErp, synth-rhythm) is longer than the shortest
 * cycles of a respiratory sinus arrhythmia, so the block appears only in the beats that follow a short cycle.
 */
import { l } from '../../core/l10n';
import { defineGroup } from './define';

const SINUS = (rateBpm: number) => ({ kind: 'sinus', rateBpm, hrv: 0.02 }) as const;
const AVN = (ahMinMs: number) => ({ avn: { ahMinMs, ahExtMs: 60, tauMs: 70, erpMs: 280, jitter: 0, conceal: 0 } }) as const;

export const CONDUCTION_SCENARIOS = defineGroup('conduction', [
  {
    id: 'rbbb',
    group: 'conduction',
    findings: ['rbbb', 'secondary-st-t', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 64 },
    source: { rhythm: { kind: 'sinus', rateBpm: 70, hrv: 0.02 }, activation: { kind: 'conducted', blocks: { rbb: 'complete' } }, repol: { gScale: 0.72 } },
    dials: { rate: { min: 55, max: 95 }, pr: { min: 130, max: 200 }, qrs: { min: 125, max: 160 } },
    highlights: { rbb: 'block' },
  },
  {
    id: 'lbbb',
    group: 'conduction',
    findings: ['lbbb', 'secondary-st-t', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 71 },
    source: { rhythm: { kind: 'sinus', rateBpm: 68, hrv: 0.02 }, activation: { kind: 'conducted', blocks: { lbb: 'complete' } } },
    dials: { rate: { min: 55, max: 95 }, pr: { min: 140, max: 200 }, qrs: { min: 135, max: 170 } },
    highlights: { lbb: 'block' },
  },
  {
    id: 'ilbbb',
    group: 'conduction',
    findings: ['ilbbb', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 69 },
    source: {
      rhythm: SINUS(72),
      activation: { kind: 'conducted', blocks: { lbb: 'delay' } },
      // usually seen with LV hypertrophy (criteria.md lbbb-grades: "an LVH pattern")
      substrate: { lvMass: 1.2 },
    },
    dials: { rate: { min: 55, max: 95 }, pr: { min: 130, max: 200 } },
    highlights: { lbb: 'block' },
  },
  {
    id: 'lafb',
    group: 'conduction',
    findings: ['lafb', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 66 },
    // electrotonic coupling keeps the secondary T of a fascicular block small (PTB-XL+ LAFB: T axis near normal)
    source: { rhythm: SINUS(70), activation: { kind: 'conducted', blocks: { laf: 'complete' } }, repol: { coupling: 0.5, gScale: 0.7 } },
    dials: { rate: { min: 55, max: 95 }, pr: { min: 130, max: 200 }, axis: { min: -80, max: -50 } },
    highlights: { laf: 'block' },
  },
  {
    id: 'lpfb',
    group: 'conduction',
    findings: ['lpfb', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 71 },
    source: { rhythm: SINUS(68), activation: { kind: 'conducted', blocks: { lpf: 'complete' } }, repol: { coupling: 0.5, gScale: 0.7 } },
    dials: { rate: { min: 55, max: 95 }, pr: { min: 130, max: 200 }, axis: { min: 100, max: 140 } },
    facts: { exclusion: 'diagnosis of exclusion: RVH, lateral MI, vertical heart, acute RV strain, limb-lead reversal' },
    highlights: { lpf: 'block' },
  },
  {
    id: 'bifascicular-block',
    group: 'conduction',
    findings: ['bifascicular-block', 'rbbb', 'lafb', 'secondary-st-t', 'sinus-rhythm'],
    title: l('双分支阻滞（右束支传导阻滞 + 左前分支阻滞）', 'Bifascicular block (RBBB + LAFB)', 'Bloqueo bifascicular (bloqueo de rama derecha + bloqueo fascicular anterior izquierdo)'),
    patient: { sex: 'male', ageY: 74 },
    // older conduction-system disease: lower primary gradient (flatter lateral T) than the isolated-RBBB benchmark
    source: { rhythm: SINUS(72), activation: { kind: 'conducted', blocks: { rbb: 'complete', laf: 'complete' } }, repol: { gScale: 0.75, coupling: 0.35 } },
    dials: { rate: { min: 55, max: 95 }, pr: { min: 140, max: 200 } },
    variants: {
      lpfb: {
        label: l('右束支传导阻滞 + 左后分支阻滞', 'RBBB + LPFB', 'Bloqueo de rama derecha + bloqueo fascicular posterior izquierdo'),
        patch: { activation: { kind: 'conducted', blocks: { rbb: 'complete', lpf: 'complete' } }, repol: { gScale: 0.5, coupling: 0.4 } },
        findings: ['bifascicular-block', 'rbbb', 'lpfb', 'secondary-st-t', 'sinus-rhythm'],
      },
    },
    highlights: { rbb: 'block', laf: 'block' },
  },
  {
    id: 'trifascicular-block',
    group: 'conduction',
    // criteria.md `trifascicular`: describe the components; the PR prolongation is usually AV nodal
    findings: ['bifascicular-block', 'rbbb', 'lafb', 'av-block-1', 'secondary-st-t', 'sinus-rhythm'],
    title: l(
      '右束支传导阻滞 + 左前分支阻滞 + 一度房室传导阻滞（旧称“三分支阻滞”）',
      'RBBB + LAFB + first-degree AV block (formerly called "trifascicular block")',
      'Bloqueo de rama derecha + bloqueo fascicular anterior izquierdo + bloqueo AV de primer grado (antes llamado «bloqueo trifascicular»)',
    ),
    patient: { sex: 'female', ageY: 78 },
    source: {
      rhythm: SINUS(64),
      activation: { kind: 'conducted', blocks: { rbb: 'complete', laf: 'complete' } },
      junction: AVN(185),
      repol: { gScale: 0.75, coupling: 0.35 },
    },
    dials: { rate: { min: 50, max: 85 }, pr: { min: 230, max: 300 } },
    variants: {
      mobitz2: {
        label: l('伴二度 II 型房室传导阻滞（希氏束下）', 'with second-degree AV block, Mobitz II (infra-His)', 'con bloqueo AV de segundo grado Mobitz II (infrahisiano)'),
        // every 4th P blocked below the His bundle, the PR of the conducted beats unchanged: the remaining fascicle
        // fails intermittently — real evidence of disease in all three fascicles (a pacing indication)
        patch: { junction: { infraHis: { pattern: 'mobitz2', ratio: 4 } } },
        findings: ['trifascicular-block', 'bifascicular-block', 'rbbb', 'lafb', 'av-block-1', 'av-block-2-mobitz2', 'secondary-st-t', 'sinus-rhythm'],
      },
    },
    facts: { naming: 'describe each component (criteria.md trifascicular); "trifascicular" only with evidence that the remaining fascicle fails (Mobitz II variant, alternating BBB)' },
    highlights: { rbb: 'block', laf: 'block', 'av-node': 'block' },
  },
  {
    id: 'rate-dependent-bbb',
    group: 'conduction',
    findings: ['aberrant-conduction', 'lbbb', 'sinus-rhythm'],
    title: l('频率依赖性左束支传导阻滞', 'Rate-dependent (acceleration-dependent) left bundle branch block', 'Bloqueo de rama izquierda dependiente de la frecuencia'),
    patient: { sex: 'female', ageY: 73 },
    // respiratory sinus arrhythmia around 84/min; the left bundle's refractory period (690 ms) is longer than the
    // inspiratory cycles, so those beats are conducted with LBBB while the expiratory (longer) cycles conduct normally
    source: {
      rhythm: { kind: 'sinus', rateBpm: 84, hrv: 0.07 },
      activation: { kind: 'conducted' },
      junction: { bundleErp: { rbbMs: 300, lbbMs: 690, slope: 0 } },
    },
    dials: { rate: { min: 80, max: 88 } },
    facts: { mechanism: 'the block appears when the cycle shortens below the bundle refractory period (acceleration-dependent)', pitfall: 'the wide beats are not PVCs: each follows a sinus P with the same PR' },
    highlights: { lbb: 'block' },
  },
  {
    id: 'ivcd',
    group: 'conduction',
    findings: ['ivcd', 'sinus-rhythm'],
    title: l('非特异性室内传导延迟', 'Nonspecific intraventricular conduction delay', 'Trastorno inespecífico de la conducción intraventricular'),
    patient: { sex: 'male', ageY: 72 },
    source: {
      rhythm: SINUS(74),
      activation: { kind: 'conducted' },
      // slowed myocardial conduction (cardiomyopathy, drugs): every lobe stretched, no bundle-branch morphology
      // diffuse slowing of myocardial conduction, no bundle blocked: the septal activation and its q in I, aVL, V5–V6
      // are preserved and the R-peak time in V6 stays short (< 60 ms at the default width), so the wide QRS is neither
      // the R′ of RBBB nor the broad notched R of LBBB; a small border-zone fragment notches the inferior terminal QRS
      // (the mixed, nonspecific look). The qrs dial scales the conduction stretch exactly (no slowed region).
      substrate: { septum: 1.6, conduction: 1.3 },
      nearField: [{ kind: 'fragment', where: ['lv-basal-inferior', 'lv-mid-inferior', 'lv-basal-inferoseptal'], amp: 0.08 }],
    },
    dials: { rate: { min: 55, max: 95 }, qrs: { min: 112, max: 135 } },
  },
]);
