/**
 * The finding taxonomy — one id per thing a reader can report on an ECG. It is the shared vocabulary of the synthetic
 * engine's truth, the real-ECG label mapping, practice items, lessons and the atlas.
 *
 * `critical` = a "can't-miss" finding (needs immediate action); `major` = clinically important; `minor` = descriptive /
 * benign; `normal` = normal or a normal variant. Names: Chinese = standard textbook terms; Spanish = Spain usage.
 */
import type { L10n } from './l10n';

export const FINDING_CATEGORIES = [
  'normal',
  'rhythm',
  'conduction',
  'axis',
  'chamber',
  'ischemia',
  'repolarization',
  'other',
  'technical',
] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

export type Severity = 'normal' | 'minor' | 'major' | 'critical';

export interface FindingDef {
  readonly id: string;
  readonly cat: FindingCategory;
  readonly severity: Severity;
  readonly name: L10n;
}

const f = (id: string, cat: FindingCategory, severity: Severity, zh: string, en: string, es: string) =>
  ({ id, cat, severity, name: { zh, en, es } }) as const;

export const FINDING_LIST = [
  // ── normal ─────────────────────────────────────────────────────────────────────────────────────────────────────
  f('normal-ecg', 'normal', 'normal', '正常心电图', 'Normal ECG', 'ECG normal'),

  // ── rhythm ─────────────────────────────────────────────────────────────────────────────────────────────────────
  f('sinus-rhythm', 'rhythm', 'normal', '窦性心律', 'Sinus rhythm', 'Ritmo sinusal'),
  f('sinus-bradycardia', 'rhythm', 'minor', '窦性心动过缓', 'Sinus bradycardia', 'Bradicardia sinusal'),
  f('sinus-tachycardia', 'rhythm', 'minor', '窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal'),
  f('sinus-arrhythmia', 'rhythm', 'normal', '窦性心律不齐', 'Sinus arrhythmia', 'Arritmia sinusal'),
  f('sinus-pause', 'rhythm', 'major', '窦性停搏', 'Sinus pause (arrest)', 'Pausa sinusal (paro sinusal)'),
  f('sa-exit-block', 'rhythm', 'major', '窦房传导阻滞', 'Sinoatrial exit block', 'Bloqueo sinoauricular'),
  f('sinus-node-dysfunction', 'rhythm', 'major', '窦房结功能障碍（慢快综合征）', 'Sinus node dysfunction (tachy–brady)', 'Disfunción sinusal (bradicardia-taquicardia)'),
  f('ectopic-atrial-rhythm', 'rhythm', 'minor', '房性异位心律', 'Ectopic atrial rhythm', 'Ritmo auricular ectópico'),
  f('wandering-atrial-pacemaker', 'rhythm', 'minor', '游走性心房起搏点', 'Wandering atrial pacemaker', 'Marcapasos auricular migratorio'),
  f('pac', 'rhythm', 'minor', '房性期前收缩', 'Premature atrial complex', 'Extrasístole auricular'),
  f('pac-blocked', 'rhythm', 'minor', '房性期前收缩未下传', 'Blocked (non-conducted) premature atrial complex', 'Extrasístole auricular bloqueada'),
  f('pjc', 'rhythm', 'minor', '交界性期前收缩', 'Premature junctional complex', 'Extrasístole de la unión'),
  f('pvc', 'rhythm', 'minor', '室性期前收缩', 'Premature ventricular complex', 'Extrasístole ventricular'),
  f('ventricular-bigeminy', 'rhythm', 'minor', '室性期前收缩二联律', 'Ventricular bigeminy', 'Bigeminismo ventricular'),
  f('ventricular-couplet', 'rhythm', 'major', '成对室性期前收缩', 'Ventricular couplet', 'Pareja de extrasístoles ventriculares'),
  f('junctional-escape-rhythm', 'rhythm', 'major', '交界性逸搏心律', 'Junctional escape rhythm', 'Ritmo de escape de la unión'),
  f('accelerated-junctional-rhythm', 'rhythm', 'minor', '加速性交界性心律', 'Accelerated junctional rhythm', 'Ritmo de la unión acelerado'),
  f('ventricular-escape-rhythm', 'rhythm', 'critical', '室性逸搏心律', 'Ventricular escape rhythm', 'Ritmo de escape ventricular'),
  f('aivr', 'rhythm', 'minor', '加速性室性自主心律', 'Accelerated idioventricular rhythm', 'Ritmo idioventricular acelerado'),
  f('atrial-tachycardia', 'rhythm', 'major', '房性心动过速', 'Focal atrial tachycardia', 'Taquicardia auricular focal'),
  f('mat', 'rhythm', 'major', '多源性房性心动过速', 'Multifocal atrial tachycardia', 'Taquicardia auricular multifocal'),
  f('atrial-fibrillation', 'rhythm', 'major', '心房颤动', 'Atrial fibrillation', 'Fibrilación auricular'),
  f('atrial-flutter', 'rhythm', 'major', '心房扑动', 'Atrial flutter', 'Flutter auricular'),
  f('svt', 'rhythm', 'major', '室上性心动过速', 'Supraventricular tachycardia', 'Taquicardia supraventricular'),
  f('avnrt', 'rhythm', 'major', '房室结折返性心动过速', 'AV nodal re-entrant tachycardia', 'Taquicardia por reentrada intranodal'),
  f('avrt', 'rhythm', 'major', '房室折返性心动过速', 'AV re-entrant tachycardia', 'Taquicardia por reentrada auriculoventricular'),
  f('vt-monomorphic', 'rhythm', 'critical', '单形性室性心动过速', 'Monomorphic ventricular tachycardia', 'Taquicardia ventricular monomorfa'),
  f('vt-polymorphic', 'rhythm', 'critical', '多形性室性心动过速', 'Polymorphic ventricular tachycardia', 'Taquicardia ventricular polimorfa'),
  f('torsades', 'rhythm', 'critical', '尖端扭转型室性心动过速', 'Torsades de pointes', 'Torsade de pointes'),
  f('ventricular-flutter', 'rhythm', 'critical', '心室扑动', 'Ventricular flutter', 'Flutter ventricular'),
  f('ventricular-fibrillation', 'rhythm', 'critical', '心室颤动', 'Ventricular fibrillation', 'Fibrilación ventricular'),
  f('asystole', 'rhythm', 'critical', '心室停搏', 'Asystole', 'Asistolia'),
  f('paced-rhythm', 'rhythm', 'minor', '起搏心律', 'Paced rhythm', 'Ritmo de marcapasos'),

  // ── conduction ─────────────────────────────────────────────────────────────────────────────────────────────────
  f('av-block-1', 'conduction', 'minor', '一度房室传导阻滞', 'First-degree AV block', 'Bloqueo AV de primer grado'),
  f('av-block-2-mobitz1', 'conduction', 'major', '二度Ⅰ型房室传导阻滞（文氏型）', 'Second-degree AV block, Mobitz I (Wenckebach)', 'Bloqueo AV de segundo grado Mobitz I (Wenckebach)'),
  f('av-block-2-mobitz2', 'conduction', 'critical', '二度Ⅱ型房室传导阻滞', 'Second-degree AV block, Mobitz II', 'Bloqueo AV de segundo grado Mobitz II'),
  f('av-block-2-2to1', 'conduction', 'major', '2:1房室传导阻滞', '2:1 AV block', 'Bloqueo AV 2:1'),
  f('av-block-high-grade', 'conduction', 'critical', '高度房室传导阻滞', 'High-grade AV block', 'Bloqueo AV avanzado'),
  f('av-block-3', 'conduction', 'critical', '三度（完全性）房室传导阻滞', 'Third-degree (complete) AV block', 'Bloqueo AV de tercer grado (completo)'),
  f('av-dissociation', 'conduction', 'major', '房室分离', 'AV dissociation', 'Disociación auriculoventricular'),
  f('rbbb', 'conduction', 'minor', '完全性右束支传导阻滞', 'Complete right bundle branch block', 'Bloqueo completo de rama derecha'),
  f('irbbb', 'conduction', 'minor', '不完全性右束支传导阻滞', 'Incomplete right bundle branch block', 'Bloqueo incompleto de rama derecha'),
  f('lbbb', 'conduction', 'major', '完全性左束支传导阻滞', 'Complete left bundle branch block', 'Bloqueo completo de rama izquierda'),
  f('ilbbb', 'conduction', 'minor', '不完全性左束支传导阻滞', 'Incomplete left bundle branch block', 'Bloqueo incompleto de rama izquierda'),
  f('lafb', 'conduction', 'minor', '左前分支阻滞', 'Left anterior fascicular block', 'Bloqueo fascicular anterior izquierdo'),
  f('lpfb', 'conduction', 'minor', '左后分支阻滞', 'Left posterior fascicular block', 'Bloqueo fascicular posterior izquierdo'),
  f('bifascicular-block', 'conduction', 'major', '双分支阻滞', 'Bifascicular block', 'Bloqueo bifascicular'),
  f('trifascicular-block', 'conduction', 'major', '三分支阻滞', 'Trifascicular block', 'Bloqueo trifascicular'),
  f('ivcd', 'conduction', 'minor', '非特异性室内传导延迟', 'Nonspecific intraventricular conduction delay', 'Trastorno inespecífico de la conducción intraventricular'),
  f('aberrant-conduction', 'conduction', 'minor', '室内差异性传导', 'Aberrant ventricular conduction', 'Conducción ventricular aberrante'),
  f('wpw', 'conduction', 'major', '心室预激（WPW 图形）', 'Ventricular pre-excitation (WPW pattern)', 'Preexcitación ventricular (patrón de Wolff-Parkinson-White)'),
  f('short-pr', 'conduction', 'minor', 'PR间期缩短', 'Short PR interval', 'PR corto'),

  // ── axis ───────────────────────────────────────────────────────────────────────────────────────────────────────
  f('axis-normal', 'axis', 'normal', '心电轴正常', 'Normal QRS axis', 'Eje del QRS normal'),
  f('lad', 'axis', 'minor', '心电轴左偏', 'Left axis deviation', 'Desviación del eje a la izquierda'),
  f('rad', 'axis', 'minor', '心电轴右偏', 'Right axis deviation', 'Desviación del eje a la derecha'),
  f('extreme-axis', 'axis', 'major', '心电轴极度偏移（无人区电轴）', 'Extreme axis deviation', 'Desviación extrema del eje'),

  // ── chambers & voltage ─────────────────────────────────────────────────────────────────────────────────────────
  f('lae', 'chamber', 'minor', '左心房异常（扩大）', 'Left atrial abnormality (enlargement)', 'Anomalía auricular izquierda'),
  f('rae', 'chamber', 'minor', '右心房异常（扩大）', 'Right atrial abnormality (enlargement)', 'Anomalía auricular derecha'),
  f('interatrial-block', 'chamber', 'minor', '房间传导阻滞', 'Interatrial block', 'Bloqueo interauricular'),
  f('biatrial-abnormality', 'chamber', 'minor', '双心房异常', 'Biatrial abnormality', 'Anomalía biauricular'),
  f('lvh', 'chamber', 'major', '左心室肥厚', 'Left ventricular hypertrophy', 'Hipertrofia ventricular izquierda'),
  f('lvh-strain', 'chamber', 'major', '左心室肥厚伴继发性ST-T改变', 'LVH with secondary ST–T abnormalities ("strain")', 'HVI con alteraciones secundarias del ST-T («sobrecarga»)'),
  f('rvh', 'chamber', 'major', '右心室肥厚', 'Right ventricular hypertrophy', 'Hipertrofia ventricular derecha'),
  f('biventricular-hypertrophy', 'chamber', 'major', '双心室肥厚', 'Biventricular hypertrophy', 'Hipertrofia biventricular'),
  f('low-voltage', 'chamber', 'minor', 'QRS低电压', 'Low QRS voltage', 'Bajo voltaje del QRS'),
  f('electrical-alternans', 'chamber', 'major', '电交替', 'Electrical alternans', 'Alternancia eléctrica'),
  f('poor-r-progression', 'chamber', 'minor', '胸导联R波递增不良', 'Poor R-wave progression', 'Mala progresión de la onda R'),

  // ── ischaemia & infarction ─────────────────────────────────────────────────────────────────────────────────────
  f('stemi-anterior', 'ischemia', 'critical', '急性前壁ST段抬高型心肌梗死', 'Acute anterior STEMI', 'IAMCEST anterior'),
  f('stemi-anteroseptal', 'ischemia', 'critical', '急性前间壁ST段抬高型心肌梗死', 'Acute anteroseptal STEMI', 'IAMCEST anteroseptal'),
  f('stemi-anterolateral', 'ischemia', 'critical', '急性前侧壁ST段抬高型心肌梗死', 'Acute anterolateral STEMI', 'IAMCEST anterolateral'),
  f('stemi-inferior', 'ischemia', 'critical', '急性下壁ST段抬高型心肌梗死', 'Acute inferior STEMI', 'IAMCEST inferior'),
  f('stemi-lateral', 'ischemia', 'critical', '急性侧壁ST段抬高型心肌梗死', 'Acute lateral STEMI', 'IAMCEST lateral'),
  f('stemi-high-lateral', 'ischemia', 'critical', '急性高侧壁ST段抬高型心肌梗死', 'Acute high lateral STEMI', 'IAMCEST lateral alto'),
  f('stemi-posterior', 'ischemia', 'critical', '急性后壁心肌梗死（STEMI 等危症）', 'Acute posterior MI (STEMI equivalent)', 'IAM posterior agudo (equivalente de IAMCEST)'),
  f('rv-infarction', 'ischemia', 'critical', '右心室梗死', 'Right ventricular infarction', 'Infarto del ventrículo derecho'),
  f('de-winter', 'ischemia', 'critical', 'de Winter T波', 'de Winter T-wave pattern', 'Patrón de De Winter'),
  f('wellens', 'ischemia', 'critical', 'Wellens 综合征', 'Wellens pattern', 'Patrón de Wellens'),
  f('avr-elevation-diffuse-std', 'ischemia', 'critical', 'aVR导联ST段抬高伴广泛ST段压低', 'ST elevation in aVR with diffuse ST depression', 'Elevación del ST en aVR con descenso difuso del ST'),
  f('hyperacute-t', 'ischemia', 'critical', '超急性期T波', 'Hyperacute T waves', 'Ondas T hiperagudas'),
  f('st-depression-ischemic', 'ischemia', 'major', '缺血性ST段压低', 'Ischaemic ST depression', 'Descenso isquémico del ST'),
  f('t-inversion-ischemic', 'ischemia', 'major', '缺血性T波倒置', 'Ischaemic T-wave inversion', 'Inversión isquémica de la onda T'),
  f('reciprocal-changes', 'ischemia', 'major', '对应性ST段改变', 'Reciprocal ST changes', 'Cambios recíprocos del ST (imagen en espejo)'),
  f('pathological-q', 'ischemia', 'major', '病理性Q波', 'Pathological Q waves', 'Ondas Q patológicas'),
  f('old-mi-anterior', 'ischemia', 'major', '陈旧性前壁心肌梗死', 'Old anterior myocardial infarction', 'Infarto antiguo de cara anterior'),
  f('old-mi-inferior', 'ischemia', 'major', '陈旧性下壁心肌梗死', 'Old inferior myocardial infarction', 'Infarto antiguo de cara inferior'),
  f('old-mi-lateral', 'ischemia', 'major', '陈旧性侧壁心肌梗死', 'Old lateral myocardial infarction', 'Infarto antiguo de cara lateral'),
  f('lv-aneurysm', 'ischemia', 'major', '左心室室壁瘤图形', 'Left ventricular aneurysm pattern', 'Patrón de aneurisma ventricular izquierdo'),
  f('sgarbossa-positive', 'ischemia', 'critical', 'Sgarbossa 标准阳性', 'Positive Sgarbossa criteria (MI with LBBB or pacing)', 'Criterios de Sgarbossa positivos (IAM con BRI o marcapasos)'),

  // ── repolarization ─────────────────────────────────────────────────────────────────────────────────────────────
  f('nonspecific-st-t', 'repolarization', 'minor', '非特异性ST-T改变', 'Nonspecific ST–T changes', 'Alteraciones inespecíficas del ST-T'),
  f('secondary-st-t', 'repolarization', 'minor', '继发性ST-T改变', 'Secondary ST–T changes', 'Alteraciones secundarias de la repolarización'),
  f('early-repolarization', 'repolarization', 'normal', '早期复极', 'Early repolarization pattern', 'Patrón de repolarización precoz'),
  f('long-qt', 'repolarization', 'critical', 'QT间期延长', 'Prolonged QT interval', 'QT prolongado'),
  f('short-qt', 'repolarization', 'major', 'QT间期缩短', 'Short QT interval', 'QT corto'),
  f('peaked-t', 'repolarization', 'major', 'T波高尖', 'Peaked T waves', 'Ondas T picudas'),
  f('u-waves', 'repolarization', 'minor', 'U波明显', 'Prominent U waves', 'Ondas U prominentes'),
  f('osborn-waves', 'repolarization', 'major', 'Osborn 波（J波）', 'Osborn (J) waves', 'Ondas J de Osborn'),
  f('digoxin-effect', 'repolarization', 'minor', '洋地黄效应', 'Digoxin effect', 'Efecto digitálico'),
  f('cerebral-t', 'repolarization', 'major', '脑型T波', 'Cerebral T waves', 'Ondas T cerebrales'),

  // ── other conditions ───────────────────────────────────────────────────────────────────────────────────────────
  f('hyperkalemia', 'other', 'critical', '高钾血症', 'Hyperkalaemia', 'Hiperpotasemia'),
  f('hypokalemia', 'other', 'major', '低钾血症', 'Hypokalaemia', 'Hipopotasemia'),
  f('hypercalcemia', 'other', 'major', '高钙血症', 'Hypercalcaemia', 'Hipercalcemia'),
  f('hypocalcemia', 'other', 'major', '低钙血症', 'Hypocalcaemia', 'Hipocalcemia'),
  f('hypothermia', 'other', 'critical', '低体温', 'Hypothermia', 'Hipotermia'),
  f('pericarditis', 'other', 'major', '急性心包炎', 'Acute pericarditis', 'Pericarditis aguda'),
  f('pericardial-effusion', 'other', 'major', '心包积液', 'Pericardial effusion', 'Derrame pericárdico'),
  f('pulmonary-embolism', 'other', 'critical', '急性肺栓塞（急性右心负荷）', 'Acute pulmonary embolism (acute RV strain)', 'Tromboembolismo pulmonar agudo (sobrecarga aguda del VD)'),
  f('brugada-type1', 'other', 'critical', 'Brugada 1型图形', 'Brugada type 1 pattern', 'Patrón de Brugada tipo 1'),
  f('brugada-type2', 'other', 'major', 'Brugada 2型图形', 'Brugada type 2 pattern', 'Patrón de Brugada tipo 2'),
  f('hcm', 'other', 'major', '肥厚型心肌病', 'Hypertrophic cardiomyopathy', 'Miocardiopatía hipertrófica'),
  f('apical-hcm', 'other', 'major', '心尖肥厚型心肌病', 'Apical hypertrophic cardiomyopathy', 'Miocardiopatía hipertrófica apical'),
  f('arvc', 'other', 'major', '致心律失常性右心室心肌病', 'Arrhythmogenic right ventricular cardiomyopathy', 'Miocardiopatía arritmogénica del ventrículo derecho'),
  f('epsilon-wave', 'other', 'major', 'ε波', 'Epsilon wave', 'Onda épsilon'),
  f('takotsubo', 'other', 'major', '应激性心肌病（Takotsubo）', 'Takotsubo syndrome', 'Síndrome de tako-tsubo'),
  f('na-channel-blockade', 'other', 'critical', '钠通道阻滞剂中毒（如三环类抗抑郁药）', 'Sodium-channel blocker toxicity (e.g. tricyclics)', 'Intoxicación por bloqueantes de canales de sodio (p. ej., tricíclicos)'),
  f('dextrocardia', 'other', 'minor', '右位心', 'Dextrocardia', 'Dextrocardia'),
  f('athlete-changes', 'other', 'normal', '运动员生理性心电图改变', 'Physiological athlete ECG changes', 'Cambios fisiológicos del ECG del deportista'),
  f('juvenile-t', 'other', 'normal', '幼年型T波', 'Persistent juvenile T-wave pattern', 'Patrón juvenil persistente de la onda T'),
  f('copd-pattern', 'other', 'minor', '慢性阻塞性肺疾病图形', 'COPD pattern', 'Patrón de EPOC'),
  f('pacing-failure-capture', 'other', 'critical', '起搏器失夺获', 'Pacemaker failure to capture', 'Fallo de captura del marcapasos'),
  f('pacing-undersensing', 'other', 'major', '起搏器感知不足', 'Pacemaker undersensing', 'Infradetección del marcapasos'),
  f('pacing-oversensing', 'other', 'critical', '起搏器感知过度', 'Pacemaker oversensing', 'Sobredetección del marcapasos'),

  // ── technical ──────────────────────────────────────────────────────────────────────────────────────────────────
  f('electrode-reversal-la-ra', 'technical', 'minor', '左右上肢电极反接', 'Left/right arm electrode reversal', 'Inversión de los electrodos de los brazos'),
  f('electrode-reversal-la-ll', 'technical', 'minor', '左上肢与左下肢电极反接', 'Left arm / left leg electrode reversal', 'Inversión de los electrodos de brazo izquierdo y pierna izquierda'),
  f('electrode-reversal-ra-ll', 'technical', 'minor', '右上肢与左下肢电极反接', 'Right arm / left leg electrode reversal', 'Inversión de los electrodos de brazo derecho y pierna izquierda'),
  f('precordial-misplacement', 'technical', 'minor', '胸导联电极位置错误', 'Precordial electrode misplacement', 'Colocación incorrecta de los electrodos precordiales'),
  f('baseline-wander', 'technical', 'minor', '基线漂移', 'Baseline wander', 'Oscilación de la línea de base'),
  f('muscle-tremor', 'technical', 'minor', '肌电干扰', 'Muscle tremor artefact', 'Artefacto por temblor muscular'),
  f('ac-interference', 'technical', 'minor', '交流电干扰', 'Mains (AC) interference', 'Interferencia de la corriente alterna'),
] as const;

export type FindingId = (typeof FINDING_LIST)[number]['id'];

export const FINDINGS: Readonly<Record<FindingId, FindingDef>> = Object.fromEntries(
  FINDING_LIST.map((d) => [d.id, d]),
) as Record<FindingId, FindingDef>;

export function isFindingId(s: string): s is FindingId {
  return s in FINDINGS;
}

export function findingsIn(cat: FindingCategory): FindingDef[] {
  return FINDING_LIST.filter((d) => d.cat === cat);
}
