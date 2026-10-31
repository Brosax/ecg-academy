/**
 * The drill families: every competency C1–C12 (docs/PLAN.md §1) is trained by at least one synthetic family and the
 * measurement / reading competencies also by a real-ECG family (the top rung of the ladder classic → subtle → noisy →
 * borderline → real). Scenario pools are selectors resolved against the synth catalogue when an item is generated,
 * so families grow automatically with the catalogue.
 */
import type { FindingId } from '../../core/findings';
import { type CompetencyId, type DrillFamily, type StageId } from '../api';
import { makeAxis } from './gen/axis';
import { makeCalibration, makeFindingChoice, makeNormalOrAbnormal, makePqrsRelation, makeSinusOrNot, makeTriage, makeWideTachy } from './gen/choice';
import { ALL_DIFFICULTIES, PATTERN_DIFFICULTIES, REAL_DIFFICULTIES, realCases, scenarioFindings, specPool, variantAllowed, type FamilySpec, type PoolSel } from './gen/common';
import { availablePairs, makeCompare } from './gen/compare';
import { makeLocateBlockedP, makeLocateDelta, makeLocateLead, makeLocateMaxSt, makeLocateWave } from './gen/locate';
import { makeFindingsMulti } from './gen/multi';
import { makeMeasure, makeQtc, makeRate } from './gen/numeric';
import { makeOcclusion, OCCLUSION_POOL } from './gen/occlusion';
import { makeRealAxis, makeRealFindings, makeRealMeasure, makeRealRate, makeRealReport, makeRealRhythm, makeRealSpot, REAL_RHYTHMS } from './gen/real';
import { makeReportSynth } from './gen/report';
import { L } from './text';
import { OCCLUSION_FINDINGS } from './truth';

const F = (...ids: FindingId[]): PoolSel[] => ids.map((finding) => ({ finding }));
const G = (...groups: ('normal' | 'atrial' | 'svt' | 'ventricular' | 'av-block' | 'conduction' | 'ischemia' | 'chambers' | 'repolarization' | 'structural' | 'pacing' | 'technical')[]): PoolSel[] =>
  groups.map((group) => ({ group }));
const ALL_GROUPS = G('normal', 'atrial', 'svt', 'ventricular', 'av-block', 'conduction', 'ischemia', 'chambers', 'repolarization', 'structural', 'pacing', 'technical');

// option universes of the pattern families
const AV_BLOCKS: FindingId[] = ['av-block-1', 'av-block-2-mobitz1', 'av-block-2-mobitz2', 'av-block-2-2to1', 'av-block-high-grade', 'av-block-3'];
const BBB: FindingId[] = ['rbbb', 'irbbb', 'lbbb', 'ilbbb', 'lafb', 'lpfb', 'bifascicular-block', 'ivcd'];
const PREEXC: FindingId[] = ['wpw', 'short-pr', 'av-block-1', 'lbbb'];
// complete AV block is an option: on its tracings the escape rhythm is the consequence, not the diagnosis
const BRADY: FindingId[] = ['sinus-bradycardia', 'sinus-pause', 'sa-exit-block', 'junctional-escape-rhythm', 'ventricular-escape-rhythm', 'sinus-node-dysfunction', 'av-block-3'];
const ECTOPY: FindingId[] = ['pac', 'pac-blocked', 'pjc', 'pvc', 'ventricular-bigeminy', 'ventricular-couplet'];
// regular narrow-QRS tachycardias only (AF and MAT are irregular: the 'irregular' family; pre-excited ones are wide)
const NARROW: FindingId[] = ['sinus-tachycardia', 'avnrt', 'avrt', 'atrial-flutter', 'atrial-tachycardia'];
const IRREG: FindingId[] = ['atrial-fibrillation', 'atrial-flutter', 'mat', 'sinus-arrhythmia', 'wandering-atrial-pacemaker', 'pac'];
const WIDE: FindingId[] = ['vt-monomorphic', 'vt-polymorphic', 'torsades', 'ventricular-flutter', 'aivr'];
const ARREST: FindingId[] = ['ventricular-fibrillation', 'vt-monomorphic', 'vt-polymorphic', 'torsades', 'asystole', 'ventricular-flutter'];
const TERRITORY: FindingId[] = ['stemi-anterior', 'stemi-anteroseptal', 'stemi-anterolateral', 'stemi-inferior', 'stemi-lateral', 'stemi-high-lateral', 'stemi-posterior', 'rv-infarction'];
const ISCH_PATTERN: FindingId[] = ['wellens', 'de-winter', 'avr-elevation-diffuse-std', 'hyperacute-t', 'st-depression-ischemic', 't-inversion-ischemic', 'lv-aneurysm', 'old-mi-anterior', 'old-mi-inferior', 'old-mi-lateral'];
const CHAMBERS: FindingId[] = ['lvh', 'lvh-strain', 'rvh', 'biventricular-hypertrophy', 'lae', 'rae', 'biatrial-abnormality', 'interatrial-block', 'low-voltage'];
const SUBSTRATE: FindingId[] = ['brugada-type1', 'brugada-type2', 'long-qt', 'short-qt', 'hcm', 'apical-hcm', 'arvc', 'early-repolarization', 'athlete-changes'];
const METABOLIC: FindingId[] = ['hyperkalemia', 'hypokalemia', 'hypercalcemia', 'hypocalcemia', 'digoxin-effect', 'na-channel-blockade', 'hypothermia', 'long-qt'];
const SYSTEMIC: FindingId[] = ['pericarditis', 'pericardial-effusion', 'pulmonary-embolism', 'takotsubo', 'cerebral-t', 'electrical-alternans'];
const PACED: FindingId[] = ['paced-rhythm', 'pacing-failure-capture', 'pacing-undersensing', 'pacing-oversensing'];
const TECH: FindingId[] = ['electrode-reversal-la-ra', 'electrode-reversal-la-ll', 'electrode-reversal-ra-ll', 'precordial-misplacement', 'baseline-wander', 'muscle-tremor', 'ac-interference', 'dextrocardia'];

const WHICH_RHYTHM = L('这是什么节律？', 'What is the rhythm?', '¿Cuál es el ritmo?');

function spec(s: Omit<FamilySpec, 'findings'> & { readonly findings?: readonly FindingId[] }): FamilySpec {
  return { findings: [], ...s };
}

export const FAMILY_SPECS: readonly FamilySpec[] = [
  // ── F: foundations (C1, C12) ───────────────────────────────────────────────────────────────────────────────────
  spec({
    id: 'waves',
    stage: 'F',
    competency: 'C1',
    kind: 'locate',
    title: L('识别P、QRS、T', 'Find P, QRS and T', 'Localiza P, QRS y T'),
    description: L('在心电图上点出指定的波。', 'Click the wave asked for on the tracing.', 'Haz clic en la onda que se pide en el trazado.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('sinus-bradycardia', 'av-block-1')],
    make: makeLocateWave(),
  }),
  spec({
    id: 'leads',
    stage: 'F',
    competency: 'C1',
    kind: 'locate',
    title: L('导联与六轴系统', 'Leads and the hexaxial system', 'Derivaciones y sistema hexaxial'),
    description: L('按电极位置或角度找出导联。', 'Find a lead by its electrode position or its angle.', 'Encuentra una derivación por la posición de su electrodo o por su ángulo.'),
    difficulties: ['classic'],
    source: 'synth',
    pool: G('normal'),
    make: makeLocateLead(),
  }),
  spec({
    id: 'paper',
    stage: 'F',
    competency: 'C1',
    kind: 'choice',
    title: L('走纸速度与增益', 'Paper speed and gain', 'Velocidad del papel y ganancia'),
    description: L('读图之前先看定标脉冲。', 'Check the calibration pulse before reading.', 'Comprueba el pulso de calibración antes de leer.'),
    difficulties: ['classic'],
    source: 'synth',
    pool: [...G('normal'), ...F('lvh')],
    make: makeCalibration(),
  }),
  spec({
    id: 'artefacts',
    stage: 'O',
    competency: 'C12',
    kind: 'choice',
    title: L('伪差与电极错接', 'Artefacts and lead reversal', 'Artefactos e inversión de electrodos'),
    description: L('先排除记录问题，再归咎于心脏。', 'Rule out the recording before blaming the heart.', 'Descarta el registro antes de culpar al corazón.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: [...G('technical'), ...F('dextrocardia')],
    findings: TECH,
    needs: TECH,
    topics: true,
    make: makeFindingChoice({ options: TECH, prompt: L('这份心电图的问题是什么？', 'What is the problem with this recording?', '¿Cuál es el problema de este registro?') }),
  }),
  spec({
    id: 'compare-technical',
    stage: 'O',
    competency: 'C12',
    kind: 'compare',
    title: L('对比：电极错接还是心脏？', 'Contrast: electrodes or heart?', 'Contraste: ¿electrodos o corazón?'),
    description: L('两份心电图并排比较。', 'Two tracings side by side.', 'Dos trazados lado a lado.'),
    difficulties: ['classic', 'subtle'],
    source: 'synth',
    findings: ['electrode-reversal-la-ra', 'muscle-tremor'],
    available: () => availablePairs('technical').length > 0,
    make: makeCompare('technical'),
  }),

  // ── S: systematic read & measurement (C2, C3, C4, C5, C11) ────────────────────────────────────────────────────
  spec({
    id: 'rate',
    stage: 'S',
    competency: 'C2',
    kind: 'rate',
    title: L('心率：规则节律', 'Heart rate: regular rhythms', 'Frecuencia: ritmos regulares'),
    description: L('300 / 1500法则。', 'The 300 and 1500 rules.', 'Las reglas de 300 y 1500.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('sinus-bradycardia', 'sinus-tachycardia', 'av-block-1', 'junctional-escape-rhythm', 'avnrt')],
    realTwin: 'rate-real',
    make: makeRate({ which: 'ventricular', regular: true }),
  }),
  spec({
    id: 'rate-irregular',
    stage: 'S',
    competency: 'C2',
    kind: 'rate',
    title: L('心率：不规则节律', 'Heart rate: irregular rhythms', 'Frecuencia: ritmos irregulares'),
    description: L('6秒×10（或10秒×6）计数法。', 'Count 6 s × 10 (or 10 s × 6).', 'Cuenta 6 s × 10 (o 10 s × 6).'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F('atrial-fibrillation', 'sinus-arrhythmia', 'mat', 'ventricular-bigeminy', 'pac'),
    realTwin: 'rate-real',
    make: makeRate({ which: 'ventricular', regular: false }),
  }),
  spec({
    id: 'rate-atrial',
    stage: 'R',
    competency: 'C2',
    kind: 'rate',
    title: L('心房率与心室率', 'Atrial versus ventricular rate', 'Frecuencia auricular frente a ventricular'),
    description: L('数出每一个心房波，包括被掩盖的。', 'Count every atrial wave, hidden ones included.', 'Cuenta todas las ondas auriculares, también las ocultas.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    // atrial tachyarrhythmias with block as often as AV blocks (classes balanced in makeRate)
    pool: F('atrial-flutter', 'atrial-tachycardia', 'av-block-2-2to1', 'av-block-3', 'av-block-high-grade', 'av-block-2-mobitz2', 'av-block-2-mobitz1'),
    make: makeRate({ which: 'atrial', variants: { 'atrial-tachycardia': ['block'] } }),
  }),
  spec({
    id: 'measure-pr',
    stage: 'S',
    competency: 'C4',
    kind: 'measure',
    title: L('测量PR间期', 'Measure the PR interval', 'Mide el intervalo PR'),
    description: L('分规从P波起点到QRS起点。', 'Calipers from P onset to QRS onset.', 'Compás desde el inicio de la P al inicio del QRS.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('av-block-1', 'short-pr', 'sinus-bradycardia', 'lae')],
    realTwin: 'measure-real',
    make: makeMeasure('pr'),
  }),
  spec({
    id: 'measure-qrs',
    stage: 'S',
    competency: 'C4',
    kind: 'measure',
    title: L('测量QRS时限', 'Measure the QRS duration', 'Mide la duración del QRS'),
    description: L('从最早起点到J点。', 'From the earliest onset to the J point.', 'Desde el inicio más precoz hasta el punto J.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('rbbb', 'lbbb', 'ivcd', 'irbbb', 'lafb', 'lvh')],
    realTwin: 'measure-real',
    make: makeMeasure('qrs'),
  }),
  spec({
    id: 'measure-qt',
    stage: 'S',
    competency: 'C4',
    kind: 'measure',
    title: L('测量QT间期', 'Measure the QT interval', 'Mide el intervalo QT'),
    description: L('切线法确定T波终点。', 'Tangent method for the T end.', 'Método de la tangente para el final de la T.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('long-qt', 'short-qt', 'hypocalcemia', 'hypercalcemia', 'sinus-bradycardia', 'hypokalemia')],
    realTwin: 'measure-real',
    make: makeMeasure('qt'),
  }),
  spec({
    id: 'measure-rr',
    stage: 'F',
    competency: 'C1',
    kind: 'measure',
    title: L('测量RR间期', 'Measure the RR interval', 'Mide el intervalo RR'),
    description: L('把格子换算成毫秒。', 'Turn squares into milliseconds.', 'Convierte cuadros en milisegundos.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('sinus-bradycardia', 'sinus-tachycardia')],
    make: makeMeasure('rr'),
  }),
  spec({
    id: 'qtc',
    stage: 'S',
    competency: 'C4',
    kind: 'qtc',
    title: L('计算QTc', 'Compute the QTc', 'Calcula el QTc'),
    description: L('Bazett、Fridericia、Framingham、Hodges公式。', 'Bazett, Fridericia, Framingham and Hodges.', 'Bazett, Fridericia, Framingham y Hodges.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('long-qt', 'short-qt', 'sinus-bradycardia', 'sinus-tachycardia', 'hypocalcemia', 'hypercalcemia')],
    findings: ['long-qt', 'short-qt'],
    make: makeQtc(),
  }),
  spec({
    id: 'axis-quadrant',
    stage: 'S',
    competency: 'C5',
    kind: 'axis',
    title: L('电轴：分类', 'Axis: the category', 'Eje: la categoría'),
    description: L('用I和aVF确定象限。', 'Find the quadrant from I and aVF.', 'Encuentra el cuadrante con I y aVF.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('lafb', 'lpfb', 'rvh', 'lvh', 'copd-pattern', 'bifascicular-block', 'pulmonary-embolism')],
    findings: ['lad', 'rad', 'extreme-axis', 'axis-normal'],
    realTwin: 'axis-real',
    make: makeAxis('quadrant'),
  }),
  spec({
    id: 'axis-degrees',
    stage: 'S',
    competency: 'C5',
    kind: 'axis',
    title: L('电轴：度数', 'Axis: in degrees', 'Eje: en grados'),
    description: L('找最接近等电位的导联。', 'Use the most equiphasic lead.', 'Usa la derivación más isodifásica.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal'), ...F('lafb', 'lpfb', 'rvh', 'lvh', 'copd-pattern', 'bifascicular-block')],
    findings: ['lad', 'rad', 'extreme-axis'],
    realTwin: 'axis-real',
    make: makeAxis('degrees'),
  }),
  spec({
    id: 'sinus',
    stage: 'S',
    competency: 'C3',
    kind: 'choice',
    title: L('窦性心律吗？', 'Sinus or not?', '¿Sinusal o no?'),
    description: L('每个QRS前都有窦性P波吗？', 'Is there a sinus P before every QRS?', '¿Hay una P sinusal antes de cada QRS?'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: [
      ...G('normal'),
      ...F('sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia', 'av-block-1', 'ectopic-atrial-rhythm', 'junctional-escape-rhythm', 'accelerated-junctional-rhythm', 'atrial-fibrillation', 'atrial-flutter', 'atrial-tachycardia', 'wandering-atrial-pacemaker'),
    ],
    findings: ['sinus-rhythm', 'ectopic-atrial-rhythm', 'junctional-escape-rhythm'],
    realTwin: 'rhythm-real',
    make: makeSinusOrNot(),
  }),
  spec({
    id: 'spot',
    stage: 'S',
    competency: 'C11',
    kind: 'choice',
    title: L('正常还是异常（快速轮）', 'Normal or abnormal (speed round)', '¿Normal o anormal? (ronda rápida)'),
    description: L('接受正常变异，不过度诊断。', 'Accept normal variants; do not over-call.', 'Acepta las variantes normales; no sobrediagnostiques.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: ALL_GROUPS,
    findings: ['normal-ecg', 'early-repolarization', 'juvenile-t', 'athlete-changes'],
    realTwin: 'spot-real',
    make: makeNormalOrAbnormal(),
  }),

  // ── R: rhythm I (C3, C6, C9) ───────────────────────────────────────────────────────────────────────────────────
  spec({
    id: 'p-qrs',
    stage: 'R',
    competency: 'C3',
    kind: 'choice',
    title: L('P波与QRS的关系', 'The P–QRS relationship', 'La relación P-QRS'),
    description: L('找出所有心房波，再看它们是否下传。', 'Find every atrial wave, then whether it conducts.', 'Encuentra cada onda auricular y mira si conduce.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: [...G('normal', 'av-block'), ...F('junctional-escape-rhythm', 'accelerated-junctional-rhythm', 'avnrt', 'avrt', 'atrial-fibrillation', 'ectopic-atrial-rhythm', 'sinus-bradycardia')],
    findings: ['av-block-2-mobitz1', 'av-block-2-mobitz2', 'av-block-3', 'av-dissociation', 'junctional-escape-rhythm', 'atrial-fibrillation'],
    make: makePqrsRelation(),
  }),
  spec({
    id: 'av-block',
    stage: 'R',
    competency: 'C6',
    kind: 'choice',
    title: L('房室传导阻滞', 'AV blocks', 'Bloqueos AV'),
    description: L('一度、文氏、莫氏Ⅱ型、2:1、高度、三度。', 'First degree, Wenckebach, Mobitz II, 2:1, high grade, complete.', 'Primer grado, Wenckebach, Mobitz II, 2:1, avanzado y completo.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: [...G('av-block'), ...F('ventricular-escape-rhythm', 'trifascicular-block')],
    findings: AV_BLOCKS,
    needs: AV_BLOCKS,
    make: makeFindingChoice({ options: AV_BLOCKS, prompt: L('这是哪一种房室传导阻滞？', 'Which AV block is this?', '¿Qué bloqueo AV es este?'), view: { calipers: true } }),
  }),
  spec({
    id: 'blocked-p',
    stage: 'R',
    competency: 'C6',
    kind: 'locate',
    title: L('找出未下传的P波', 'Find the blocked P wave', 'Encuentra la P bloqueada'),
    description: L('用分规“走”出PP间期。', 'March out the PP interval with calipers.', 'Recorre el intervalo PP con el compás.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F('av-block-2-mobitz1', 'av-block-2-mobitz2', 'av-block-2-2to1', 'av-block-high-grade', 'pac-blocked'),
    findings: ['av-block-2-mobitz1', 'av-block-2-mobitz2', 'av-block-2-2to1', 'av-block-high-grade', 'pac-blocked'],
    make: makeLocateBlockedP(),
  }),
  spec({
    id: 'bundle-branch',
    stage: 'R',
    competency: 'C6',
    kind: 'choice',
    title: L('束支与分支阻滞', 'Bundle-branch and fascicular blocks', 'Bloqueos de rama y fasciculares'),
    description: L('QRS宽度、V1和V6形态、电轴。', 'QRS width, V1 and V6 shapes, axis.', 'Anchura del QRS, morfología en V1 y V6 y eje.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: G('conduction'),
    findings: BBB,
    needs: BBB,
    make: makeFindingChoice({ options: BBB, prompt: L('这是哪一种室内传导异常？', 'Which intraventricular conduction disorder is this?', '¿Qué trastorno de la conducción intraventricular es este?') }),
  }),
  spec({
    id: 'ectopy',
    stage: 'R',
    competency: 'C9',
    kind: 'choice',
    title: L('期前收缩', 'Premature beats', 'Extrasístoles'),
    description: L('房性、交界性还是室性？', 'Atrial, junctional or ventricular?', '¿Auricular, de la unión o ventricular?'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...ECTOPY),
    findings: ECTOPY,
    needs: ECTOPY,
    make: makeFindingChoice({ options: ECTOPY, prompt: L('提前出现的搏动是什么？', 'What are the early beats?', '¿Qué son los latidos prematuros?') }),
  }),
  spec({
    id: 'brady',
    stage: 'R',
    competency: 'C9',
    kind: 'choice',
    title: L('缓慢性心律失常', 'Bradyarrhythmias', 'Bradiarritmias'),
    description: L('窦房结、房室传导，还是逸搏心律？', 'Sinus node, AV conduction or an escape rhythm?', '¿Nodo sinusal, conducción AV o ritmo de escape?'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...BRADY),
    findings: BRADY,
    needs: BRADY,
    make: makeFindingChoice({ options: BRADY, prompt: WHICH_RHYTHM }),
  }),

  // ── T: rhythm II (C6, C9) ──────────────────────────────────────────────────────────────────────────────────────
  spec({
    id: 'narrow-tachy',
    stage: 'T',
    competency: 'C9',
    kind: 'choice',
    title: L('窄QRS心动过速', 'Narrow-complex tachycardia', 'Taquicardia de QRS estrecho'),
    description: L('规则的窄QRS心动过速：心房波在哪里？RP′多长？', 'Regular narrow-QRS tachycardias: where are the atrial waves, how long is the RP′?', 'Taquicardias regulares de QRS estrecho: ¿dónde están las ondas auriculares y cuánto mide el RP′?'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...NARROW),
    exclude: ['wpw', 'atrial-fibrillation', 'mat'],
    findings: NARROW,
    realTwin: 'rhythm-real',
    needs: NARROW,
    make: makeFindingChoice({
      options: NARROW,
      prompt: WHICH_RHYTHM,
      accept: ({ truth }) => truth.regular && truth.qrsMs < 120 && truth.hrBpm > 100,
      // flutter as a tachycardia: 2:1 conduction (≈150/min); 3:1 and 4:1 are not tachycardias
      dials: (s, x) => (s.findings.includes('atrial-flutter') ? { ...x, conductionRatio: 2 } : x),
    }),
  }),
  spec({
    id: 'irregular',
    stage: 'T',
    competency: 'C9',
    kind: 'choice',
    title: L('不规则节律', 'Irregular rhythms', 'Ritmos irregulares'),
    description: L('房颤、房扑不等比下传、多源房速……', 'AF, flutter with variable block, MAT…', 'FA, flutter con conducción variable, TAM…'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...IRREG),
    // paced rhythms (VVI over AF), pre-excited AF and AF with complete block (regular escape) are not "irregular rhythm" questions
    exclude: ['paced-rhythm', 'wpw', 'av-block-3'],
    findings: IRREG,
    realTwin: 'rhythm-real',
    needs: IRREG,
    make: makeFindingChoice({ options: IRREG, prompt: WHICH_RHYTHM }),
  }),
  spec({
    id: 'wide-tachy',
    stage: 'T',
    competency: 'C9',
    kind: 'choice',
    title: L('宽QRS心动过速', 'Wide-complex tachycardia', 'Taquicardia de QRS ancho'),
    description: L('室速、差异性传导还是预激？原因不明时按室速处理。', 'VT, aberrancy or pre-excitation? Treat an unexplained one as VT.', '¿TV, aberrancia o preexcitación? Trata como TV la que no se explique.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    // ventricular rhythms + supraventricular tachycardias conducted wide (pre-excited, aberrant)
    pool: [...F(...WIDE), ...F('wpw', 'aberrant-conduction')],
    findings: [...WIDE, 'wpw', 'aberrant-conduction'],
    needs: WIDE,
    make: makeWideTachy({ options: WIDE, prompt: WHICH_RHYTHM }),
  }),
  spec({
    id: 'arrest',
    stage: 'T',
    competency: 'C9',
    kind: 'choice',
    title: L('心脏骤停相关节律', 'Peri-arrest rhythms', 'Ritmos periparada'),
    description: L('10秒内识别并行动。', 'Recognize and act within 10 seconds.', 'Reconoce y actúa en 10 segundos.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...ARREST),
    findings: ARREST,
    needs: ARREST,
    make: makeFindingChoice({ options: ARREST, prompt: L('监护仪上是什么节律？', 'What rhythm is on the monitor?', '¿Qué ritmo hay en el monitor?'), view: { layout: 'strip', lead: 'II' } }),
  }),
  spec({
    id: 'preexcitation',
    stage: 'T',
    competency: 'C6',
    kind: 'choice',
    title: L('心室预激', 'Pre-excitation', 'Preexcitación'),
    description: L('短PR + δ波 + 宽QRS。', 'Short PR + delta wave + wide QRS.', 'PR corto + onda delta + QRS ancho.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F('wpw', 'short-pr', 'av-block-1', 'lbbb'),
    findings: ['wpw', 'short-pr'],
    needs: PREEXC,
    make: makeFindingChoice({ options: PREEXC, prompt: L('PR和QRS起始部提示什么？', 'What do the PR and the QRS onset show?', '¿Qué muestran el PR y el inicio del QRS?') }),
  }),
  spec({
    id: 'delta',
    stage: 'T',
    competency: 'C6',
    kind: 'locate',
    title: L('找到δ波', 'Find the delta wave', 'Encuentra la onda delta'),
    description: L('QRS起始部的顿挫。', 'The slurred QRS onset.', 'El inicio empastado del QRS.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F('wpw'),
    findings: ['wpw'],
    make: makeLocateDelta(),
  }),
  spec({
    id: 'compare-conduction',
    stage: 'R',
    competency: 'C6',
    kind: 'compare',
    title: L('对比：传导异常', 'Contrast: conduction', 'Contraste: conducción'),
    description: L('莫氏Ⅰ型与Ⅱ型、预激与短PR……', 'Mobitz I vs II, WPW vs short PR…', 'Mobitz I frente a II, WPW frente a PR corto…'),
    difficulties: ['classic', 'subtle'],
    source: 'synth',
    findings: ['av-block-2-mobitz2', 'wpw', 'rbbb', 'lafb'],
    available: () => availablePairs('conduction').length > 0,
    make: makeCompare('conduction'),
  }),

  // ── I: ischaemia & infarction (C8) ─────────────────────────────────────────────────────────────────────────────
  spec({
    id: 'occlusion',
    stage: 'I',
    competency: 'C8',
    kind: 'occlusion',
    title: L('闭塞还是类似图形？', 'Occlusion or mimic?', '¿Oclusión o simulador?'),
    description: L('每份胸痛心电图都要做出判断。', 'Commit on every chest-pain ECG.', 'Decide en cada ECG de dolor torácico.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: OCCLUSION_POOL,
    findings: [...OCCLUSION_FINDINGS],
    make: makeOcclusion(),
  }),
  spec({
    id: 'territory',
    stage: 'I',
    competency: 'C8',
    kind: 'choice',
    title: L('梗死部位', 'Infarct territory', 'Territorio del infarto'),
    description: L('相邻导联组与对应性改变。', 'Contiguous lead groups and reciprocal change.', 'Grupos de derivaciones contiguas y cambios recíprocos.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...TERRITORY),
    // the territory of an MI through LBBB / pacing is not read from contiguous-lead ST elevation
    exclude: ['lbbb', 'paced-rhythm'],
    findings: TERRITORY,
    needs: TERRITORY,
    make: makeFindingChoice({ options: TERRITORY, prompt: L('这是哪个部位的急性心肌梗死？', 'Which territory is infarcting?', '¿Qué territorio se está infartando?') }),
  }),
  spec({
    id: 'max-st',
    stage: 'I',
    competency: 'C8',
    kind: 'locate',
    title: L('ST段抬高最明显的导联', 'Lead with the greatest ST elevation', 'Derivación con mayor elevación del ST'),
    description: L('以PR段为基线，J+60 ms测量。', 'PR segment as baseline, measured at J+60 ms.', 'Segmento PR como referencia, medido en J+60 ms.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...TERRITORY, 'pericarditis'),
    exclude: ['lbbb', 'paced-rhythm'],
    findings: TERRITORY,
    make: makeLocateMaxSt(),
  }),
  spec({
    id: 'ischemia-patterns',
    stage: 'I',
    competency: 'C8',
    kind: 'choice',
    title: L('缺血图形与陈旧梗死', 'Ischaemic patterns and old MI', 'Patrones isquémicos e infarto antiguo'),
    description: L('Wellens、de Winter、aVR抬高、超急性期T波……', 'Wellens, de Winter, aVR elevation, hyperacute T…', 'Wellens, De Winter, elevación en aVR, T hiperagudas…'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...ISCH_PATTERN),
    findings: ISCH_PATTERN,
    needs: ISCH_PATTERN,
    make: makeFindingChoice({ options: ISCH_PATTERN, prompt: L('这是哪一种缺血或梗死图形？', 'Which ischaemic or infarction pattern is this?', '¿Qué patrón isquémico o de infarto es este?') }),
  }),
  spec({
    id: 'compare-occlusion',
    stage: 'I',
    competency: 'C8',
    kind: 'compare',
    title: L('对比：闭塞与类似图形', 'Contrast: occlusion vs mimic', 'Contraste: oclusión frente a simulador'),
    description: L('同时看到病变和它的“模仿者”。', 'See the pattern beside its look-alike.', 'Mira el patrón junto a su imitador.'),
    difficulties: ['classic', 'subtle'],
    source: 'synth',
    findings: ['stemi-anterior', 'stemi-inferior', 'hyperacute-t', 'sgarbossa-positive'],
    available: () => availablePairs('occlusion').length > 0,
    make: makeCompare('occlusion'),
  }),

  // ── H: chambers & substrates (C7, C10) ─────────────────────────────────────────────────────────────────────────
  spec({
    id: 'chambers',
    stage: 'H',
    competency: 'C7',
    kind: 'choice',
    title: L('心房异常与心室肥厚', 'Atrial abnormality and hypertrophy', 'Anomalía auricular e hipertrofia'),
    description: L('用具名的标准判断。', 'Decide by named criteria.', 'Decide con criterios con nombre.'),
    difficulties: ALL_DIFFICULTIES,
    source: 'synth',
    pool: G('chambers'),
    findings: CHAMBERS,
    needs: CHAMBERS,
    make: makeFindingChoice({ options: CHAMBERS, prompt: L('主要的心腔表现是什么？', 'What is the main chamber finding?', '¿Cuál es el hallazgo principal de las cavidades?') }),
  }),
  spec({
    id: 'chambers-findings',
    stage: 'H',
    competency: 'C7',
    kind: 'findings',
    title: L('心腔表现（多选）', 'Chamber findings (select all)', 'Hallazgos de cavidades (selección múltiple)'),
    description: L('选出所有存在的表现。', 'Select every finding present.', 'Selecciona todos los hallazgos presentes.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: G('chambers'),
    findingsFromPool: true,
    make: makeFindingsMulti({ categories: ['chamber', 'axis', 'repolarization'], prompt: L('选出所有存在的表现。', 'Select every finding that is present.', 'Selecciona todos los hallazgos presentes.') }),
  }),
  spec({
    id: 'substrates',
    stage: 'H',
    competency: 'C10',
    kind: 'choice',
    title: L('猝死相关基质与正常变异', 'Sudden-death substrates and variants', 'Sustratos de muerte súbita y variantes'),
    description: L('Brugada、长/短QT、肥厚型心肌病、ARVC与运动员心电图。', 'Brugada, long/short QT, HCM, ARVC and the athlete ECG.', 'Brugada, QT largo/corto, MCH, MAVD y ECG del deportista.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...SUBSTRATE),
    // acquired QT prolongation (takotsubo, cerebral T, hypocalcaemia) and torsades itself are not "substrate" items
    exclude: ['takotsubo', 'cerebral-t', 'hypocalcemia', 'torsades'],
    findings: SUBSTRATE,
    needs: SUBSTRATE,
    make: makeFindingChoice({ options: SUBSTRATE, prompt: L('这份心电图提示什么？', 'What does this ECG suggest?', '¿Qué sugiere este ECG?') }),
  }),
  spec({
    id: 'compare-substrate',
    stage: 'H',
    competency: 'C10',
    kind: 'compare',
    title: L('对比：基质与正常', 'Contrast: substrate vs normal', 'Contraste: sustrato frente a normal'),
    description: L('Brugada与右束支阻滞、长QT与正常……', 'Brugada vs RBBB, long QT vs normal…', 'Brugada frente a BRD, QT largo frente a normal…'),
    difficulties: ['classic', 'subtle'],
    source: 'synth',
    findings: ['brugada-type1', 'long-qt', 'lvh'],
    available: () => availablePairs('substrate').length > 0,
    make: makeCompare('substrate'),
  }),

  // ── O: systemic, toxic, device (C10) ───────────────────────────────────────────────────────────────────────────
  spec({
    id: 'metabolic',
    stage: 'O',
    competency: 'C10',
    kind: 'choice',
    title: L('电解质、药物与体温', 'Electrolytes, drugs and temperature', 'Electrolitos, fármacos y temperatura'),
    description: L('先想代谢和药物，再归咎于心脏。', 'Think metabolism and drugs before blaming the heart.', 'Piensa en metabolismo y fármacos antes de culpar al corazón.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: [...G('repolarization'), ...F('hypothermia', 'na-channel-blockade')],
    findings: METABOLIC,
    needs: METABOLIC,
    topics: true,
    make: makeFindingChoice({ options: METABOLIC, prompt: L('最可能的原因是什么？', 'What is the most likely cause?', '¿Cuál es la causa más probable?') }),
  }),
  spec({
    id: 'systemic',
    stage: 'O',
    competency: 'C10',
    kind: 'choice',
    title: L('心包、肺栓塞与其他', 'Pericardium, PE and others', 'Pericardio, TEP y otros'),
    description: L('非缺血性的ST-T改变。', 'ST–T changes that are not ischaemic.', 'Cambios del ST-T no isquémicos.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: F(...SYSTEMIC),
    findings: SYSTEMIC,
    needs: SYSTEMIC,
    topics: true,
    make: makeFindingChoice({ options: SYSTEMIC, prompt: L('这份心电图提示什么？', 'What does this ECG suggest?', '¿Qué sugiere este ECG?') }),
  }),
  spec({
    id: 'pacing',
    stage: 'O',
    competency: 'C10',
    kind: 'choice',
    title: L('起搏心电图', 'The paced ECG', 'El ECG con marcapasos'),
    description: L('起搏、失夺获、感知不足、感知过度。', 'Pacing, failure to capture, under- and oversensing.', 'Estimulación, fallo de captura, infra- y sobredetección.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: G('pacing'),
    findings: PACED,
    needs: PACED,
    make: makeFindingChoice({ options: PACED, prompt: L('起搏器工作正常吗？', 'Is the pacemaker working properly?', '¿Funciona bien el marcapasos?'), view: { layout: '3x4+1' } }),
  }),

  // ── X: integration (C11, C8) ───────────────────────────────────────────────────────────────────────────────────
  spec({
    id: 'triage',
    stage: 'X',
    competency: 'C11',
    kind: 'choice',
    title: L('10秒分诊', '10-second triage', 'Triaje en 10 segundos'),
    description: L('立即处理、当天评估还是常规？', 'Act now, review today or routine?', '¿Actuar ya, revisar hoy o rutinario?'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: ALL_GROUPS,
    findingsFromPool: true,
    make: makeTriage(),
  }),
  spec({
    id: 'findings',
    stage: 'X',
    competency: 'C11',
    kind: 'findings',
    title: L('找出所有表现', 'Find every finding', 'Encuentra todos los hallazgos'),
    description: L('完整、系统地读图。', 'A complete, systematic read.', 'Una lectura completa y sistemática.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: ALL_GROUPS,
    findingsFromPool: true,
    realTwin: 'findings-real',
    make: makeFindingsMulti({
      categories: ['rhythm', 'conduction', 'axis', 'chamber', 'ischemia', 'repolarization', 'other'],
      prompt: L('选出所有存在的表现。', 'Select every finding that is present.', 'Selecciona todos los hallazgos presentes.'),
    }),
  }),
  spec({
    id: 'report',
    stage: 'X',
    competency: 'C11',
    kind: 'report',
    title: L('结构化报告', 'Structured report', 'Informe estructurado'),
    description: L('按固定顺序写出完整报告。', 'A complete report in the fixed order.', 'Un informe completo en el orden fijo.'),
    difficulties: PATTERN_DIFFICULTIES,
    source: 'synth',
    pool: ALL_GROUPS,
    findingsFromPool: true,
    realTwin: 'report-real',
    make: makeReportSynth(),
  }),

  // ── real ECGs (PTB-XL) ─────────────────────────────────────────────────────────────────────────────────────────
  spec({
    id: 'rate-real',
    stage: 'S',
    competency: 'C2',
    kind: 'rate',
    title: L('真实心电图：心率', 'Real ECGs: heart rate', 'ECG reales: frecuencia'),
    description: L('对照12SL参考值。', 'Against the 12SL reference.', 'Frente a la referencia 12SL.'),
    difficulties: REAL_DIFFICULTIES,
    source: 'real',
    make: makeRealRate(),
  }),
  spec({
    id: 'measure-real',
    stage: 'S',
    competency: 'C4',
    kind: 'measure',
    title: L('真实心电图：间期', 'Real ECGs: intervals', 'ECG reales: intervalos'),
    description: L('PR、QRS、QT对照12SL参考值。', 'PR, QRS and QT against the 12SL reference.', 'PR, QRS y QT frente a la referencia 12SL.'),
    difficulties: REAL_DIFFICULTIES,
    source: 'real',
    make: makeRealMeasure(),
  }),
  spec({
    id: 'axis-real',
    stage: 'S',
    competency: 'C5',
    kind: 'axis',
    title: L('真实心电图：电轴', 'Real ECGs: axis', 'ECG reales: eje'),
    description: L('分类与度数。', 'Category and degrees.', 'Categoría y grados.'),
    difficulties: REAL_DIFFICULTIES,
    source: 'real',
    findings: ['lad', 'rad'],
    make: makeRealAxis(),
  }),
  spec({
    id: 'spot-real',
    stage: 'X',
    competency: 'C11',
    kind: 'choice',
    title: L('真实心电图：正常还是异常', 'Real ECGs: normal or abnormal', 'ECG reales: ¿normal o anormal?'),
    description: L('真实病例的快速判断。', 'A speed round on real patients.', 'Ronda rápida con pacientes reales.'),
    difficulties: REAL_DIFFICULTIES,
    source: 'real',
    findings: ['normal-ecg'],
    make: makeRealSpot(),
  }),
  spec({
    id: 'rhythm-real',
    stage: 'X',
    competency: 'C9',
    kind: 'choice',
    title: L('真实心电图：节律', 'Real ECGs: rhythm', 'ECG reales: ritmo'),
    description: L('心脏科医师标注的节律。', 'Rhythms labelled by cardiologists.', 'Ritmos etiquetados por cardiólogos.'),
    difficulties: REAL_DIFFICULTIES,
    source: 'real',
    findings: REAL_RHYTHMS,
    make: makeRealRhythm(),
  }),
  spec({
    id: 'findings-real',
    stage: 'X',
    competency: 'C11',
    kind: 'findings',
    title: L('真实心电图：找出所有表现', 'Real ECGs: every finding', 'ECG reales: todos los hallazgos'),
    description: L('与心脏科医师的标注对比。', 'Compared with the cardiologists’ labels.', 'Comparado con las etiquetas de los cardiólogos.'),
    difficulties: REAL_DIFFICULTIES,
    source: 'real',
    make: makeRealFindings(),
  }),
  spec({
    id: 'report-real',
    stage: 'X',
    competency: 'C11',
    kind: 'report',
    title: L('真实心电图：结构化报告', 'Real ECGs: structured report', 'ECG reales: informe estructurado'),
    description: L('先完成报告选项，再看标注。', 'Fill in the report choices, then see the labels.', 'Completa las opciones del informe y después mira las etiquetas.'),
    difficulties: REAL_DIFFICULTIES,
    source: 'real',
    make: makeRealReport(),
  }),
];

const BY_ID = new Map(FAMILY_SPECS.map((s) => [s.id, s] as const));

export function getSpec(id: string): FamilySpec | undefined {
  return BY_ID.get(id);
}

/** Pool findings of a family at call time (empty while the synth catalogue is empty). */
function poolFindings(s: FamilySpec): FindingId[] {
  if (!s.pool) return [];
  try {
    const out = new Set<FindingId>();
    for (const sc of specPool(s)) for (const f of scenarioFindings(sc)) out.add(f);
    return [...out];
  } catch {
    return [];
  }
}

export function toDrillFamily(s: FamilySpec): DrillFamily {
  const findings = s.findingsFromPool ? [...new Set([...s.findings, ...poolFindings(s)])] : s.findings;
  return { id: s.id, stage: s.stage, competency: s.competency, kind: s.kind, title: s.title, description: s.description, difficulties: s.difficulties, findings };
}

export function families(): readonly DrillFamily[] {
  return FAMILY_SPECS.map(toDrillFamily);
}

export function getFamily(id: string): DrillFamily | undefined {
  const s = BY_ID.get(id);
  return s ? toDrillFamily(s) : undefined;
}

/**
 * Topics a family accepts as a strict filter (`generateItem(id, seed, d, { topic })`): its findings that some scenario in
 * its pool shows today. Empty for families without `topics` (and while the catalogue is empty).
 */
export function topicsOf(id: string): readonly FindingId[] {
  const s = BY_ID.get(id);
  if (!s || !s.topics) return [];
  try {
    const pool = specPool(s);
    return s.findings.filter((f) => pool.some((sc) => scenarioFindings(sc).includes(f)));
  } catch {
    return [];
  }
}

export function familiesFor(c: CompetencyId): readonly FamilySpec[] {
  return FAMILY_SPECS.filter((s) => s.competency === c);
}

export function familiesInStage(st: StageId): readonly FamilySpec[] {
  return FAMILY_SPECS.filter((s) => s.stage === st);
}

/** Families that can produce an item about a finding (spaced review of `finding:<id>` cards; atlas links). */
export function familiesTraining(f: FindingId): readonly FamilySpec[] {
  return FAMILY_SPECS.filter((s) => toDrillFamily(s).findings.includes(f));
}

/**
 * Whether a family can produce items with the current synthetic catalogue / real-case library — cheap (catalogue
 * look-ups only, no generation), so the hub, the adaptive mix, spaced review and the exam blueprint offer only drills
 * that work today and pick up new ones automatically as the catalogue grows.
 *  - real families: at least one curated case;
 *  - synthetic families: the pool resolves to at least one scenario; single-choice families over findings also need two
 *    different answers in the pool (`needs`); contrast families need one drawable pair (`available`).
 */
export function familyAvailable(idOrSpec: string | FamilySpec): boolean {
  const s = typeof idOrSpec === 'string' ? BY_ID.get(idOrSpec) : idOrSpec;
  if (!s) return false;
  try {
    if (s.available) return s.available();
    if (s.source === 'real') return realCases().length > 0;
    if (!s.pool) return true;
    const pool = specPool(s);
    if (pool.length === 0) return false;
    const keep = variantAllowed(s);
    const needs = s.needs;
    if (!needs || needs.length === 0) return true;
    // distinct answers: the first option each scenario (or variant) declares — what the generator will ask for
    const answers = new Set<FindingId>();
    const first = (fs: readonly FindingId[]) => fs.find((f) => needs.includes(f));
    for (const sc of pool) {
      const a = first(sc.findings);
      if (a) answers.add(a);
      for (const v of Object.values(sc.variants ?? {})) {
        if (!keep(v.findings)) continue;
        const b = first([...(v.findings ?? []), ...sc.findings]);
        if (b) answers.add(b);
      }
    }
    return answers.size >= Math.min(2, needs.length);
  } catch {
    return false;
  }
}
