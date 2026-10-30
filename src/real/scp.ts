/**
 * SCP-ECG statements used by PTB-XL (all 71 codes of scp_statements.csv) — translated names (zh / en / es), the library
 * category each one files a case under, and the mapping onto the app's finding taxonomy (src/core/findings.ts).
 *
 * Mapping principles (documented here because graders, the atlas and lessons rely on them):
 *
 * 1. Map only when confident. A statement whose meaning is broader than any single finding (e.g. 2AVB — the taxonomy only
 *    has Mobitz I / Mobitz II / 2:1 / high-grade; ABQRS; PRC(S)) is left unmapped; the translated SCP label still appears
 *    on the reveal, and `related` points the learner to atlas pages worth comparing.
 * 2. Likelihood (PTB-XL convention): diagnostic statements carry 15 / 35 / 50 / 80 / 100; form and rhythm statements
 *    carry 0 or 100, which is not a graded likelihood.
 *    A diagnostic statement is mapped when its likelihood is ≥ 80 (probable or definite). Likelihood 0 (not stated)
 *    counts only for NDT, NST_, DIG and LNGQT, which are both diagnostic and form statements and carry 0 when used as
 *    form statements; a purely diagnostic statement without a stated likelihood is not a confident label.
 *    Form and rhythm statements are always mapped.
 * 3. `kind` is single-valued: a statement flagged both diagnostic and form in the CSV is 'diagnostic'.
 * 4. Infarction statements (IMI, ASMI, AMI, ALMI, LMI, ILMI, IPLMI, IPMI, PMI) are not necessarily acute in PTB-XL. The
 *    record's infarction stadium separates them (German staging used by the PTB reports):
 *      - Stadium I / I-II (acute: ST elevation) → acute STEMI finding of that territory (reports of all four Stadium I
 *        records in the bundle describe acute ST elevation);
 *      - Stadium II-III / III (probably old / chronic) → old-MI finding of the territory + pathological Q waves;
 *      - Stadium II (evolving, days–weeks), 'unknown' or missing → pathological Q waves only: no claim about the age.
 *        Reports of several 'unknown' records say "possibly fresh" or describe ST elevation, so "old MI" would be a
 *        confident wrong claim. Posterior-only MI (PMI) shows no Q waves in the 12 standard leads → nothing unless acute.
 * 5. Morphology is never invented. ISC* ("ischaemic ST–T changes in … leads") and INJ* ("subendocardial injury in …
 *    leads") are territory statements whose reports mix ST depression, T-wave inversion and even ST elevation. They map
 *    to a morphology finding only together with the cardiologist's own form statement:
 *      STD_ + ischaemic statement → ischaemic ST depression (STD_ alone → non-specific ST–T change);
 *      INVT + ischaemic statement → ischaemic T-wave inversion (INVT alone → unmapped: could be secondary, juvenile…).
 * 6. QWAVE ("Q waves present") is not mapped to pathological Q: one record's report calls its Q waves septal (normal).
 *    VCLVH (voltage criteria only) and HVOLT are not LVH; the cardiologists chose not to diagnose LVH there.
 * 7. BIGU (bigeminy of unknown origin) → ventricular bigeminy only when PVC is present and PAC is not.
 * 8. NORM maps to 'normal-ecg' only when everything else the record maps to is sinus rhythm (any rate or regularity).
 *    PTB-XL sometimes pairs NORM with LPR, PAC/PVC, LVOLT or a non-specific ST–T statement; the label stays visible on
 *    the reveal, but such a tracing is not used as a "normal ECG" exemplar (atlas, lessons) and a learner who reports
 *    first-degree AV block is not told they "missed" a normal ECG.
 * 9. Library categories (the case filters) come from the teaching class, diagnostic statements and statements that map to
 *    a finding; a descriptive form statement that maps to nothing does not file a case on its own (see categoriesOf).
 *    NORM files a case under 'normal' only when it maps (rule 8).
 * 10. PTB-XL's heart_axis field (German axis types: 'LAD' = "Linkstyp", which is not left axis deviation in the AHA
 *    sense) is not mapped; the axis class shown on the reveal comes from the 12SL QRS axis.
 * 11. Compatible findings (compatibleFindings): what the labels allow without asserting it. Because rules 1–6 map
 *    conservatively, a learner's correct call can be more specific than the labels (ischaemic ST depression on an
 *    "ischaemic ST–T changes in anterolateral leads" record, Mobitz I on "second-degree AV block", an acute or old MI on
 *    an infarct of undetermined stage). Such a call is shown as consistent with the labels, never as "not in the
 *    labels". The side table COMPATIBLE lists these explicitly; `related` is not used, because it also holds
 *    differentials (e.g. LVOLT → pericardial effusion) that must not earn credit. Diagnostic statements labelled
 *    "possible" (likelihood 35–79) allow what they would map to. Guards (compatibleApplies): voltage or Q-wave
 *    statements allow LVH / pathological Q only when the record is not labelled NORM; "LVH with strain" needs a labelled
 *    ST–T statement; "non-specific" statements (NST_, STD_) never allow an ischaemic reading.
 */
import type { FindingId } from '../core/findings';
import { FINDING_LIST } from '../core/findings';
import type { L10n } from '../core/l10n';
import type { ScpStatement } from './api';

/** Library categories used by the case browser filters (not the finding taxonomy's categories). */
export const CASE_CATEGORIES = ['normal', 'rhythm', 'conduction', 'hypertrophy', 'infarction', 'ischemia', 'other'] as const;
export type CaseCategory = (typeof CASE_CATEGORIES)[number];

interface MiSpec {
  /** findings when the record's stadium is acute (Stadium I / I-II) */
  readonly acute: readonly FindingId[];
  /** findings when the stadium says old (Stadium II-III / III) */
  readonly old: readonly FindingId[];
  /** does the statement imply Q waves / QS complexes in the standard 12 leads */
  readonly q: boolean;
}

export interface ScpDef extends ScpStatement {
  /** library category the statement files a case under; null = does not categorise (sinus rhythm) */
  readonly category: CaseCategory | null;
  /** findings when the statement is confidently present (context-free part of the mapping) */
  readonly findings: readonly FindingId[];
  /** infarction statement: findings depend on the infarction stadium (rule 4) */
  readonly mi?: MiSpec;
  /** atlas pages worth comparing (never counted as findings) */
  readonly related: readonly FindingId[];
}

type Kind = ScpStatement['kind'];

function s(
  code: string,
  kind: Kind,
  category: CaseCategory | null,
  name: L10n,
  findings: readonly FindingId[] = [],
  related: readonly FindingId[] = [],
  mi?: MiSpec,
): ScpDef {
  return mi ? { code, kind, category, name, findings, related, mi } : { code, kind, category, name, findings, related };
}
const n = (zh: string, en: string, es: string): L10n => ({ zh, en, es });

/** All 71 PTB-XL SCP statements, in scp_statements.csv order. */
export const SCP_LIST: readonly ScpDef[] = [
  // ── diagnostic (several are also form statements: NDT, NST_, DIG, LNGQT) ──────────────────────────────────────────
  s('NDT', 'diagnostic', 'ischemia', n('非诊断性T波异常', 'Non-diagnostic T-wave abnormalities', 'Alteraciones no diagnósticas de la onda T'), ['nonspecific-st-t']),
  s('NST_', 'diagnostic', 'ischemia', n('非特异性ST段改变', 'Non-specific ST changes', 'Alteraciones inespecíficas del segmento ST'), ['nonspecific-st-t']),
  s('DIG', 'diagnostic', 'other', n('洋地黄效应', 'Digitalis effect', 'Efecto digitálico'), ['digoxin-effect']),
  s('LNGQT', 'diagnostic', 'other', n('QT间期延长', 'Long QT interval', 'Intervalo QT prolongado'), ['long-qt']),
  s('NORM', 'diagnostic', 'normal', n('正常心电图', 'Normal ECG', 'ECG normal'), ['normal-ecg']),
  s('IMI', 'diagnostic', 'infarction', n('下壁心肌梗死', 'Inferior myocardial infarction', 'Infarto de miocardio inferior'), [], ['pathological-q'], {
    acute: ['stemi-inferior'],
    old: ['old-mi-inferior'],
    q: true,
  }),
  s('ASMI', 'diagnostic', 'infarction', n('前间壁心肌梗死', 'Anteroseptal myocardial infarction', 'Infarto de miocardio anteroseptal'), [], ['pathological-q'], {
    acute: ['stemi-anteroseptal'],
    old: ['old-mi-anterior'],
    q: true,
  }),
  s('LVH', 'diagnostic', 'hypertrophy', n('左心室肥厚', 'Left ventricular hypertrophy', 'Hipertrofia ventricular izquierda'), ['lvh'], ['lvh-strain']),
  s('LAFB', 'diagnostic', 'conduction', n('左前分支阻滞', 'Left anterior fascicular block', 'Hemibloqueo anterior izquierdo'), ['lafb'], ['lad']),
  s('ISC_', 'diagnostic', 'ischemia', n('非特异性缺血性ST-T改变', 'Non-specific ischaemic ST–T changes', 'Alteraciones isquémicas inespecíficas del ST-T'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('IRBBB', 'diagnostic', 'conduction', n('不完全性右束支传导阻滞', 'Incomplete right bundle branch block', 'Bloqueo incompleto de rama derecha'), ['irbbb'], ['rbbb']),
  s('1AVB', 'diagnostic', 'conduction', n('一度房室传导阻滞', 'First-degree AV block', 'Bloqueo AV de primer grado'), ['av-block-1']),
  s(
    'IVCD',
    'diagnostic',
    'conduction',
    n('非特异性室内传导阻滞', 'Non-specific intraventricular conduction disturbance', 'Trastorno inespecífico de la conducción intraventricular'),
    ['ivcd'],
  ),
  s('ISCAL', 'diagnostic', 'ischemia', n('前侧壁导联缺血性ST-T改变', 'Ischaemic ST–T changes in anterolateral leads', 'Alteraciones isquémicas del ST-T en derivaciones anterolaterales'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('CRBBB', 'diagnostic', 'conduction', n('完全性右束支传导阻滞', 'Complete right bundle branch block', 'Bloqueo completo de rama derecha'), ['rbbb'], ['irbbb']),
  s('CLBBB', 'diagnostic', 'conduction', n('完全性左束支传导阻滞', 'Complete left bundle branch block', 'Bloqueo completo de rama izquierda'), ['lbbb'], ['sgarbossa-positive']),
  s('ILMI', 'diagnostic', 'infarction', n('下侧壁心肌梗死', 'Inferolateral myocardial infarction', 'Infarto de miocardio inferolateral'), [], ['pathological-q'], {
    acute: ['stemi-inferior', 'stemi-lateral'],
    old: ['old-mi-inferior', 'old-mi-lateral'],
    q: true,
  }),
  s('LAO/LAE', 'diagnostic', 'hypertrophy', n('左心房负荷过重/扩大', 'Left atrial overload / enlargement', 'Sobrecarga o crecimiento auricular izquierdo'), ['lae']),
  s('AMI', 'diagnostic', 'infarction', n('前壁心肌梗死', 'Anterior myocardial infarction', 'Infarto de miocardio anterior'), [], ['pathological-q'], {
    acute: ['stemi-anterior'],
    old: ['old-mi-anterior'],
    q: true,
  }),
  s('ALMI', 'diagnostic', 'infarction', n('前侧壁心肌梗死', 'Anterolateral myocardial infarction', 'Infarto de miocardio anterolateral'), [], ['pathological-q'], {
    acute: ['stemi-anterolateral'],
    old: ['old-mi-anterior', 'old-mi-lateral'],
    q: true,
  }),
  s('ISCIN', 'diagnostic', 'ischemia', n('下壁导联缺血性ST-T改变', 'Ischaemic ST–T changes in inferior leads', 'Alteraciones isquémicas del ST-T en derivaciones inferiores'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('INJAS', 'diagnostic', 'ischemia', n('前间壁导联心内膜下损伤', 'Subendocardial injury in anteroseptal leads', 'Lesión subendocárdica en derivaciones anteroseptales'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('LMI', 'diagnostic', 'infarction', n('侧壁心肌梗死', 'Lateral myocardial infarction', 'Infarto de miocardio lateral'), [], ['pathological-q'], {
    acute: ['stemi-lateral'],
    old: ['old-mi-lateral'],
    q: true,
  }),
  s('ISCIL', 'diagnostic', 'ischemia', n('下侧壁导联缺血性ST-T改变', 'Ischaemic ST–T changes in inferolateral leads', 'Alteraciones isquémicas del ST-T en derivaciones inferolaterales'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('LPFB', 'diagnostic', 'conduction', n('左后分支阻滞', 'Left posterior fascicular block', 'Hemibloqueo posterior izquierdo'), ['lpfb'], ['rad']),
  s('ISCAS', 'diagnostic', 'ischemia', n('前间壁导联缺血性ST-T改变', 'Ischaemic ST–T changes in anteroseptal leads', 'Alteraciones isquémicas del ST-T en derivaciones anteroseptales'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('INJAL', 'diagnostic', 'ischemia', n('前侧壁导联心内膜下损伤', 'Subendocardial injury in anterolateral leads', 'Lesión subendocárdica en derivaciones anterolaterales'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('ISCLA', 'diagnostic', 'ischemia', n('侧壁导联缺血性ST-T改变', 'Ischaemic ST–T changes in lateral leads', 'Alteraciones isquémicas del ST-T en derivaciones laterales'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('RVH', 'diagnostic', 'hypertrophy', n('右心室肥厚', 'Right ventricular hypertrophy', 'Hipertrofia ventricular derecha'), ['rvh'], ['rad']),
  s('ANEUR', 'diagnostic', 'infarction', n('符合室壁瘤的ST-T改变', 'ST–T changes compatible with ventricular aneurysm', 'Alteraciones del ST-T compatibles con aneurisma ventricular'), [
    'lv-aneurysm',
  ]),
  s('RAO/RAE', 'diagnostic', 'hypertrophy', n('右心房负荷过重/扩大', 'Right atrial overload / enlargement', 'Sobrecarga o crecimiento auricular derecho'), ['rae']),
  s('EL', 'diagnostic', 'other', n('电解质紊乱或药物影响', 'Electrolyte disturbance or drug effect', 'Alteración electrolítica o efecto farmacológico'), [], [
    'hypokalemia',
    'hyperkalemia',
    'long-qt',
  ]),
  s('WPW', 'diagnostic', 'conduction', n('预激综合征（WPW综合征）', 'Wolff–Parkinson–White syndrome', 'Síndrome de Wolff-Parkinson-White'), ['wpw'], ['short-pr']),
  s('ILBBB', 'diagnostic', 'conduction', n('不完全性左束支传导阻滞', 'Incomplete left bundle branch block', 'Bloqueo incompleto de rama izquierda'), ['ilbbb'], ['lbbb']),
  s('IPLMI', 'diagnostic', 'infarction', n('下后侧壁心肌梗死', 'Inferoposterolateral myocardial infarction', 'Infarto de miocardio inferoposterolateral'), [], ['pathological-q'], {
    acute: ['stemi-inferior', 'stemi-posterior', 'stemi-lateral'],
    old: ['old-mi-inferior', 'old-mi-lateral'],
    q: true,
  }),
  s('ISCAN', 'diagnostic', 'ischemia', n('前壁导联缺血性ST-T改变', 'Ischaemic ST–T changes in anterior leads', 'Alteraciones isquémicas del ST-T en derivaciones anteriores'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('IPMI', 'diagnostic', 'infarction', n('下后壁心肌梗死', 'Inferoposterior myocardial infarction', 'Infarto de miocardio inferoposterior'), [], ['pathological-q'], {
    acute: ['stemi-inferior', 'stemi-posterior'],
    old: ['old-mi-inferior'],
    q: true,
  }),
  s('SEHYP', 'diagnostic', 'hypertrophy', n('室间隔肥厚', 'Septal hypertrophy', 'Hipertrofia septal'), [], ['hcm']),
  s('INJIN', 'diagnostic', 'ischemia', n('下壁导联心内膜下损伤', 'Subendocardial injury in inferior leads', 'Lesión subendocárdica en derivaciones inferiores'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('INJLA', 'diagnostic', 'ischemia', n('侧壁导联心内膜下损伤', 'Subendocardial injury in lateral leads', 'Lesión subendocárdica en derivaciones laterales'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('PMI', 'diagnostic', 'infarction', n('后壁心肌梗死', 'Posterior myocardial infarction', 'Infarto de miocardio posterior'), [], ['stemi-posterior'], {
    acute: ['stemi-posterior'],
    old: [],
    q: false,
  }),
  s('3AVB', 'diagnostic', 'conduction', n('三度（完全性）房室传导阻滞', 'Third-degree (complete) AV block', 'Bloqueo AV de tercer grado (completo)'), ['av-block-3'], [
    'av-dissociation',
  ]),
  s('INJIL', 'diagnostic', 'ischemia', n('下侧壁导联心内膜下损伤', 'Subendocardial injury in inferolateral leads', 'Lesión subendocárdica en derivaciones inferolaterales'), [], [
    'st-depression-ischemic',
    't-inversion-ischemic',
  ]),
  s('2AVB', 'diagnostic', 'conduction', n('二度房室传导阻滞', 'Second-degree AV block', 'Bloqueo AV de segundo grado'), [], [
    'av-block-2-mobitz1',
    'av-block-2-mobitz2',
    'av-block-2-2to1',
  ]),

  // ── form ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  s('ABQRS', 'form', 'other', n('QRS波群异常', 'Abnormal QRS', 'QRS anormal')),
  s('PVC', 'form', 'rhythm', n('室性期前收缩', 'Premature ventricular complex(es)', 'Extrasístoles ventriculares'), ['pvc']),
  s('STD_', 'form', 'ischemia', n('非特异性ST段压低', 'Non-specific ST depression', 'Descenso inespecífico del segmento ST'), [], ['st-depression-ischemic']),
  s(
    'VCLVH',
    'form',
    'hypertrophy',
    n('符合左心室肥厚的QRS电压标准', 'QRS voltage criteria for left ventricular hypertrophy', 'Criterios de voltaje del QRS de hipertrofia ventricular izquierda'),
    [],
    ['lvh'],
  ),
  s('QWAVE', 'form', 'infarction', n('存在Q波', 'Q waves present', 'Presencia de ondas Q'), [], ['pathological-q']),
  s('LOWT', 'form', 'ischemia', n('T波低平', 'Low-amplitude T waves', 'Ondas T de baja amplitud'), ['nonspecific-st-t']),
  s('NT_', 'form', 'ischemia', n('非特异性T波改变', 'Non-specific T-wave changes', 'Alteraciones inespecíficas de la onda T'), ['nonspecific-st-t']),
  s('PAC', 'form', 'rhythm', n('房性期前收缩', 'Premature atrial complex(es)', 'Extrasístoles auriculares'), ['pac']),
  s('LPR', 'form', 'conduction', n('PR间期延长', 'Prolonged PR interval', 'Intervalo PR prolongado'), ['av-block-1']),
  s('INVT', 'form', 'ischemia', n('T波倒置', 'Inverted T waves', 'Ondas T invertidas'), [], ['t-inversion-ischemic', 'secondary-st-t']),
  s(
    'LVOLT',
    'form',
    'other',
    n('肢体导联和胸导联QRS低电压', 'Low QRS voltage in the frontal and horizontal leads', 'Bajo voltaje del QRS en las derivaciones de los planos frontal y horizontal'),
    ['low-voltage'],
    ['pericardial-effusion'],
  ),
  s('HVOLT', 'form', 'hypertrophy', n('QRS高电压', 'High QRS voltage', 'Alto voltaje del QRS'), [], ['lvh']),
  s('TAB_', 'form', 'ischemia', n('T波异常', 'T-wave abnormality', 'Alteración de la onda T'), ['nonspecific-st-t']),
  s('STE_', 'form', 'ischemia', n('非特异性ST段抬高', 'Non-specific ST elevation', 'Elevación inespecífica del segmento ST'), [], ['early-repolarization', 'pericarditis']),
  s('PRC(S)', 'form', 'rhythm', n('期前收缩', 'Premature complex(es)', 'Extrasístoles'), [], ['pac', 'pvc']),

  // ── rhythm ───────────────────────────────────────────────────────────────────────────────────────────────────────
  s('SR', 'rhythm', null, n('窦性心律', 'Sinus rhythm', 'Ritmo sinusal'), ['sinus-rhythm']),
  s('AFIB', 'rhythm', 'rhythm', n('心房颤动', 'Atrial fibrillation', 'Fibrilación auricular'), ['atrial-fibrillation'], ['atrial-flutter']),
  s('STACH', 'rhythm', 'rhythm', n('窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal'), ['sinus-tachycardia']),
  s('SARRH', 'rhythm', 'rhythm', n('窦性心律不齐', 'Sinus arrhythmia', 'Arritmia sinusal'), ['sinus-arrhythmia']),
  s('SBRAD', 'rhythm', 'rhythm', n('窦性心动过缓', 'Sinus bradycardia', 'Bradicardia sinusal'), ['sinus-bradycardia']),
  s('PACE', 'rhythm', 'rhythm', n('人工起搏器功能正常', 'Normally functioning artificial pacemaker', 'Marcapasos artificial normofuncionante'), ['paced-rhythm']),
  s('SVARR', 'rhythm', 'rhythm', n('室上性心律失常', 'Supraventricular arrhythmia', 'Arritmia supraventricular'), [], ['pac', 'atrial-tachycardia']),
  s(
    'BIGU',
    'rhythm',
    'rhythm',
    n('二联律（室上性或室性来源）', 'Bigeminal pattern (supraventricular or ventricular origin)', 'Bigeminismo (de origen supraventricular o ventricular)'),
    [],
    ['ventricular-bigeminy'],
  ),
  s('AFLT', 'rhythm', 'rhythm', n('心房扑动', 'Atrial flutter', 'Flutter auricular'), ['atrial-flutter'], ['atrial-fibrillation']),
  s('SVTAC', 'rhythm', 'rhythm', n('室上性心动过速', 'Supraventricular tachycardia', 'Taquicardia supraventricular'), ['svt'], ['avnrt', 'avrt', 'atrial-tachycardia']),
  s('PSVT', 'rhythm', 'rhythm', n('阵发性室上性心动过速', 'Paroxysmal supraventricular tachycardia', 'Taquicardia supraventricular paroxística'), ['svt'], [
    'avnrt',
    'avrt',
    'atrial-tachycardia',
  ]),
  s(
    'TRIGU',
    'rhythm',
    'rhythm',
    n('三联律（室上性或室性来源）', 'Trigeminal pattern (supraventricular or ventricular origin)', 'Trigeminismo (de origen supraventricular o ventricular)'),
    [],
    ['pvc', 'pac'],
  ),
];

export const SCP: Readonly<Record<string, ScpDef>> = Object.fromEntries(SCP_LIST.map((d) => [d.code, d]));

/** Public list (contract shape: code, name, kind). */
export const scpStatements: readonly ScpStatement[] = SCP_LIST.map(({ code, name, kind }) => ({ code, name, kind }));

/** Statements whose presence makes ST depression / T inversion "ischaemic" (rule 5). */
const ISCHAEMIC_CONTEXT = ['ISC_', 'ISCAL', 'ISCIN', 'ISCIL', 'ISCAS', 'ISCLA', 'ISCAN', 'INJAS', 'INJAL', 'INJIN', 'INJLA', 'INJIL'] as const;

/** Minimum likelihood for a diagnostic statement to count (rule 2). */
export const MIN_LIKELIHOOD = 80;

/** Statements that are both diagnostic and form in scp_statements.csv: likelihood 0 = used as a form statement (rule 2). */
export const DIAGNOSTIC_AND_FORM: ReadonlySet<string> = new Set(['NDT', 'NST_', 'DIG', 'LNGQT']);

/** Is this statement confidently present (rule 2)? Unknown codes never are. */
export function isConfident(code: string, likelihood: number): boolean {
  const d = SCP[code];
  if (!d) return false;
  if (d.kind !== 'diagnostic') return true;
  if (likelihood === 0) return DIAGNOSTIC_AND_FORM.has(code);
  return likelihood >= MIN_LIKELIHOOD;
}

/** Findings compatible with a "normal ECG" label (rule 8): sinus rhythm at any rate or regularity. */
const NORMAL_COMPATIBLE: ReadonlySet<FindingId> = new Set<FindingId>([
  'normal-ecg',
  'sinus-rhythm',
  'sinus-bradycardia',
  'sinus-tachycardia',
  'sinus-arrhythmia',
]);

export type InfarctAge = 'acute' | 'evolving' | 'old' | 'unknown';

/** PTB-XL infarction_stadium → age class (rule 4). */
export function infarctAge(stadium: string | null | undefined): InfarctAge {
  switch ((stadium ?? '').trim()) {
    case 'Stadium I':
    case 'Stadium I-II':
      return 'acute';
    case 'Stadium II':
      return 'evolving';
    case 'Stadium II-III':
    case 'Stadium III':
      return 'old';
    default:
      return 'unknown';
  }
}

const FINDING_ORDER: ReadonlyMap<string, number> = new Map(FINDING_LIST.map((d, i) => [d.id, i]));

function sortFindings(ids: Iterable<FindingId>): FindingId[] {
  return [...new Set(ids)].sort((a, b) => (FINDING_ORDER.get(a) ?? 0) - (FINDING_ORDER.get(b) ?? 0));
}

/** Codes of a record that are confidently present (rule 2). */
export function confidentCodes(codes: Readonly<Record<string, number>>): string[] {
  return Object.entries(codes)
    .filter(([c, p]) => isConfident(c, p))
    .map(([c]) => c);
}

/**
 * What each confidently present statement of a record contributes to the app findings (rules 2, 4, 5, 7, 8), keyed by
 * SCP code. Statements that are not confidently present, or that map to nothing in this context, are absent.
 */
export function scpContributions(codes: Readonly<Record<string, number>>, stadium: string | null | undefined): Map<string, FindingId[]> {
  const present = new Set(confidentCodes(codes));
  const ischaemic = ISCHAEMIC_CONTEXT.some((c) => present.has(c));
  const age = infarctAge(stadium);
  const out = new Map<string, FindingId[]>();
  for (const code of present) {
    const d = SCP[code];
    const f: FindingId[] = [...d.findings];
    if (d.mi) {
      if (age === 'acute') f.push(...d.mi.acute);
      else {
        if (age === 'old') f.push(...d.mi.old);
        if (d.mi.q) f.push('pathological-q');
      }
    }
    // rule 5 — morphology statements made ischaemic by an ischaemic territory statement
    if (code === 'STD_') f.push(ischaemic ? 'st-depression-ischemic' : 'nonspecific-st-t');
    if (code === 'INVT' && ischaemic) f.push('t-inversion-ischemic');
    // rule 7 — bigeminy of ventricular origin
    if (code === 'BIGU' && present.has('PVC') && !present.has('PAC')) f.push('ventricular-bigeminy');
    if (f.length > 0) out.set(code, sortFindings(f));
  }
  // rule 8 — "normal ECG" only alongside sinus rhythm
  if (out.has('NORM')) {
    for (const [code, f] of out) {
      if (code !== 'NORM' && f.some((id) => !NORMAL_COMPATIBLE.has(id))) {
        out.delete('NORM');
        break;
      }
    }
  }
  return out;
}

/** Map one record's SCP statements (+ infarction stadium) onto app findings, sorted in taxonomy order. */
export function mapScpToFindings(codes: Readonly<Record<string, number>>, stadium: string | null | undefined): FindingId[] {
  return sortFindings([...scpContributions(codes, stadium).values()].flat());
}

/** Lowest likelihood at which a diagnostic statement still allows its findings (rule 11: "possible"). */
export const MIN_COMPATIBLE_LIKELIHOOD = 35;

const ISCHAEMIC_MORPHOLOGY: readonly FindingId[] = ['st-depression-ischemic', 't-inversion-ischemic'];

/**
 * Rule 11 — findings a statement allows without asserting them (more specific calls the labels are consistent with).
 * Infarct age (statements with `mi`) and the ischaemic territory statements are handled in compatibleFindings.
 */
export const COMPATIBLE: Readonly<Record<string, readonly FindingId[]>> = {
  '2AVB': ['av-block-2-mobitz1', 'av-block-2-mobitz2', 'av-block-2-2to1', 'av-block-high-grade'],
  '3AVB': ['av-dissociation'],
  WPW: ['short-pr'],
  LVH: ['lvh-strain'],
  VCLVH: ['lvh'],
  HVOLT: ['lvh'],
  SEHYP: ['lvh', 'hcm'],
  QWAVE: ['pathological-q'],
  INVT: ['t-inversion-ischemic', 'secondary-st-t', 'nonspecific-st-t'],
  EL: ['hypokalemia', 'hyperkalemia', 'hypocalcemia', 'hypercalcemia', 'long-qt', 'u-waves'],
  SVTAC: ['avnrt', 'avrt', 'atrial-tachycardia'],
  PSVT: ['avnrt', 'avrt', 'atrial-tachycardia'],
  SVARR: ['pac', 'ectopic-atrial-rhythm', 'wandering-atrial-pacemaker'],
  BIGU: ['ventricular-bigeminy'],
  TRIGU: ['pac', 'pvc'],
  'PRC(S)': ['pac', 'pvc'],
};
// Not listed on purpose: STD_ and NST_ say "non-specific" (an ischaemic reading contradicts them — e.g. digitalis
// ST depression), STE_ (early repolarisation or pericarditis are differentials, not readings of it).

/** Statements describing an ST–T abnormality (a labelled one is required before "LVH with strain" is compatible). */
const ST_T_STATEMENTS: readonly string[] = ['NDT', 'NST_', 'STD_', 'INVT', 'LOWT', 'NT_', 'TAB_', ...ISCHAEMIC_CONTEXT];

/** Conditions on COMPATIBLE entries, given the record's confidently present statements. */
function compatibleApplies(code: string, present: ReadonlySet<string>): boolean {
  switch (code) {
    case 'VCLVH':
    case 'HVOLT':
    case 'QWAVE':
      // voltage or Q waves on a tracing the cardiologists called normal are not LVH / infarct Q waves (rule 6)
      return !present.has('NORM');
    case 'LVH':
      return ST_T_STATEMENTS.some((c) => present.has(c));
    case 'INVT':
      // with an ischaemic statement the inversion is ischaemic (rule 5); other readings contradict it
      return !ISCHAEMIC_CONTEXT.some((c) => present.has(c));
    default:
      return true;
  }
}

/**
 * Findings the record's labels are consistent with but do not assert (rule 11), sorted in taxonomy order; never
 * includes a finding of mapScpToFindings. An infarct of undetermined stage allows both its acute and its old findings;
 * a stated stage allows only its own.
 */
export function compatibleFindings(codes: Readonly<Record<string, number>>, stadium: string | null | undefined): FindingId[] {
  const asserted = new Set(mapScpToFindings(codes, stadium));
  const present = new Set(confidentCodes(codes));
  const age = infarctAge(stadium);
  const out: FindingId[] = [];
  for (const [code, p] of Object.entries(codes)) {
    const d = SCP[code];
    if (!d) continue;
    const possible = d.kind === 'diagnostic' && p >= MIN_COMPATIBLE_LIKELIHOOD;
    if (!present.has(code) && !possible) continue;
    // a NORM superseded by other findings (rule 8) stays not normal: "normal ECG" is then extra, not compatible
    if (code === 'NORM') continue;
    out.push(...d.findings);
    if (compatibleApplies(code, present)) out.push(...(COMPATIBLE[code] ?? []));
    if (d.mi) {
      if (age !== 'old') out.push(...d.mi.acute);
      if (age !== 'acute') out.push(...d.mi.old);
      if (age !== 'acute' && d.mi.q) out.push('pathological-q');
    }
    if ((ISCHAEMIC_CONTEXT as readonly string[]).includes(code)) out.push(...ISCHAEMIC_MORPHOLOGY);
  }
  return sortFindings(out.filter((f) => !asserted.has(f)));
}

/** Atlas pages worth comparing for a record (never includes its mapped findings). */
export function relatedFindings(codes: Readonly<Record<string, number>>, mapped: readonly FindingId[]): FindingId[] {
  const have = new Set(mapped);
  const out: FindingId[] = [];
  for (const code of Object.keys(codes)) {
    const d = SCP[code];
    if (d) for (const f of d.related) if (!have.has(f)) out.push(f);
  }
  return sortFindings(out);
}

/**
 * Library categories of a record (rule 9): the category of every confidently present statement that is the record's
 * teaching class, is diagnostic, or maps to a finding. A purely descriptive form statement that maps to nothing (QWAVE,
 * HVOLT, VCLVH, STE_, ABQRS…) does not file a case on its own — a normal ECG with septal Q waves is not an infarction
 * case. NORM files a case under 'normal' only when it maps (rule 8). Empty → 'other'.
 */
export function categoriesOf(codes: Readonly<Record<string, number>>, cls?: string): CaseCategory[] {
  const mapped = scpContributions(codes, null);
  const set = new Set<CaseCategory>();
  for (const code of confidentCodes(codes)) {
    const d = SCP[code];
    if (!d.category) continue;
    if (code === 'NORM' && !mapped.has(code)) continue;
    if (code === cls || d.kind === 'diagnostic' || mapped.has(code)) set.add(d.category);
  }
  if (set.size === 0) set.add('other');
  return CASE_CATEGORIES.filter((c) => set.has(c));
}

/** One SCP statement of a record, as shown on the reveal. */
export interface CaseStatement {
  readonly code: string;
  /** null for a code missing from the table (never in the shipped bundle — guarded by the tests) */
  readonly def: ScpDef | null;
  readonly likelihood: number;
  /** counted towards the case's findings (rule 2) */
  readonly counted: boolean;
  /** NORM that does not count because the record maps to findings beyond sinus rhythm (rule 8) */
  readonly superseded: boolean;
  /** app findings this statement contributes in this record (rules 4, 5, 7, 8) */
  readonly findings: readonly FindingId[];
}

const KIND_ORDER: Readonly<Record<Kind, number>> = { diagnostic: 0, form: 1, rhythm: 2 };
const TABLE_ORDER: ReadonlyMap<string, number> = new Map(SCP_LIST.map((d, i) => [d.code, i]));

/** A record's statements for display: diagnostic first (most likely first), then form, then rhythm. */
export function caseStatements(codes: Readonly<Record<string, number>>, stadium: string | null | undefined): CaseStatement[] {
  const contrib = scpContributions(codes, stadium);
  return Object.entries(codes)
    .map(([code, p]): CaseStatement => {
      const counted = isConfident(code, p);
      return {
        code,
        def: SCP[code] ?? null,
        likelihood: p,
        counted,
        superseded: counted && code === 'NORM' && !contrib.has(code),
        findings: contrib.get(code) ?? [],
      };
    })
    .sort((a, b) => {
      const ka = a.def ? KIND_ORDER[a.def.kind] : 3;
      const kb = b.def ? KIND_ORDER[b.def.kind] : 3;
      if (ka !== kb) return ka - kb;
      if (ka === 0 && a.likelihood !== b.likelihood) return b.likelihood - a.likelihood;
      return (TABLE_ORDER.get(a.code) ?? 999) - (TABLE_ORDER.get(b.code) ?? 999);
    });
}

export type LikelihoodWord = 'definite' | 'probable' | 'possible' | 'unlikely';

/** Qualitative reading of a PTB-XL likelihood (diagnostic statements only; null for 0 = not stated). */
export function likelihoodWord(p: number): LikelihoodWord | null {
  if (p <= 0) return null;
  if (p >= 100) return 'definite';
  if (p >= 80) return 'probable';
  if (p >= 35) return 'possible';
  return 'unlikely';
}
