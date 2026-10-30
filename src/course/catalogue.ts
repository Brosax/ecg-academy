/**
 * The curriculum plan (docs/PLAN.md §3): eight stages and their 64 lessons in teaching order, with stable ids and
 * titles in zh / en / es. A lesson becomes 'ready' when its data file src/course/lessons/<id>.ts exists (stages.ts);
 * until then the course map lists it as "coming soon". Original wording; terminology follows the current guidelines
 * (docs/curriculum/criteria.md, critic.json): occlusion MI, "atrial abnormality", "fascicular block", Spain Spanish.
 */
import { l, type L10n } from '../core/l10n';
import type { StageId } from '../practice/api';

export interface PlannedLesson {
  readonly id: string;
  readonly title: L10n;
}

export interface StagePlan {
  readonly id: StageId;
  readonly title: L10n;
  readonly goal: L10n;
  readonly lessons: readonly PlannedLesson[];
}

const L = (id: string, zh: string, en: string, es: string): PlannedLesson => ({ id, title: l(zh, en, es) });

export const CURRICULUM: readonly StagePlan[] = [
  {
    id: 'F',
    title: l('基础', 'Foundations', 'Fundamentos'),
    goal: l(
      '由激动向量预测任一导联的波形方向；读图之前先检查记录本身。',
      'Predict the deflection in any lead from an activation vector, and check the recording before you read it.',
      'Predecir la deflexión en cualquier derivación a partir de un vector de activación y comprobar el registro antes de leerlo.',
    ),
    lessons: [
      L('f1', '传导系统：每一部分在心电图上画出什么', 'The conduction system and what each part draws', 'El sistema de conducción y lo que dibuja cada parte'),
      L('f2', '电偶极子与向量：波形为何向上、向下或呈双向', 'Dipoles and vectors: why a deflection is positive, negative or equiphasic', 'Dipolo y vector: por qué una deflexión es positiva, negativa o isodifásica'),
      L('f3', '导联体系：Einthoven、Goldberger 与 Wilson；六轴系统与水平面', 'The lead systems: Einthoven, Goldberger and Wilson; hexaxial and horizontal frames', 'Los sistemas de derivaciones: Einthoven, Goldberger y Wilson; sistema hexaxial y plano horizontal'),
      L('f4', '心电图纸、定标、走纸速度与滤波', 'Paper, calibration, speed and filters', 'Papel, calibración, velocidad y filtros'),
      L('f5', '电极放置、颜色标识、右胸导联与后壁导联', 'Electrode placement, colour codes, right-sided and posterior leads', 'Colocación de los electrodos, código de colores, derivaciones derechas y posteriores'),
      L('f6', '第一步：检查信号质量', 'Step 1: check the signal quality', 'Paso 1: comprobar la calidad de la señal'),
    ],
  },
  {
    id: 'S',
    title: l('系统读图与测量', 'Systematic reading & measurement', 'Lectura sistemática y medición'),
    goal: l(
      '用固定顺序在约三分钟内完成结构化读图，测量准确，不把正常判为异常。',
      'A structured read in a fixed order in about three minutes, accurate measurements, and no over-calling of normal.',
      'Una lectura estructurada en un orden fijo en unos tres minutos, mediciones exactas y sin sobrediagnosticar lo normal.',
    ),
    lessons: [
      L('s1', '固定的读图顺序', 'The fixed reading order', 'El orden de lectura fijo'),
      L('s2', '心率：300、1500 与 6 秒法', 'Heart rate: the 300, 1500 and 6-second methods', 'Frecuencia cardiaca: métodos de 300, 1500 y 6 segundos'),
      L('s3', '窦性心律与窦性心律不齐', 'Sinus rhythm and sinus arrhythmia', 'Ritmo sinusal y arritmia sinusal'),
      L('s4', '间期：PR、QRS、QT（切线法）、QTc 公式与界值', 'Intervals: PR, QRS, QT (tangent method), QTc formulas and limits', 'Intervalos: PR, QRS, QT (método de la tangente), fórmulas y límites del QTc'),
      L('s5', '额面电轴与 R 波递增', 'Frontal axis and R-wave progression', 'Eje frontal y progresión de la onda R'),
      L('s6', 'J 点与 ST 段偏移的测量', 'The J point and measuring ST deviation', 'El punto J y la medición de la desviación del ST'),
      L('s7', '正常变异：早期复极、幼年型 T 波、不完全性右束支传导阻滞、运动员与儿童', 'Normal variants: early repolarization, juvenile T waves, incomplete RBBB, athletes and children', 'Variantes normales: repolarización precoz, patrón juvenil de la onda T, bloqueo incompleto de rama derecha, deportistas y niños'),
    ],
  },
  {
    id: 'R',
    title: l('节律 I：缓慢心律、传导阻滞与期前收缩', 'Rhythm I: slow rhythms, blocks & ectopy', 'Ritmo I: bradicardias, bloqueos y extrasístoles'),
    goal: l(
      '找到心房活动，确定 P 波与 QRS 波群的关系，说出节律、起源部位与紧急程度；识别房室传导阻滞与束支传导阻滞。',
      'Find the atrial activity, establish the P–QRS relationship and name the rhythm, its site and its urgency; recognise AV and bundle branch blocks.',
      'Encontrar la actividad auricular, establecer la relación P–QRS y nombrar el ritmo, su origen y su urgencia; reconocer los bloqueos AV y de rama.',
    ),
    lessons: [
      L('r1', '窦性心动过缓与过速、窦性停搏、窦房传导阻滞与窦房结功能障碍', 'Sinus bradycardia and tachycardia, pauses, SA block and sinus node dysfunction', 'Bradicardia y taquicardia sinusal, pausas, bloqueo sinoauricular y disfunción sinusal'),
      L('r2', '逸搏与逸搏心律、房室分离', 'Escape beats and rhythms, AV dissociation', 'Latidos y ritmos de escape, disociación auriculoventricular'),
      L('r3', '一度房室传导阻滞与二度Ⅰ型（文氏型）', 'First-degree AV block and Mobitz I', 'Bloqueo AV de primer grado y Mobitz I'),
      L('r4', '二度Ⅱ型、2:1、高度与三度房室传导阻滞', 'Mobitz II, 2:1, high-grade and complete AV block', 'Mobitz II, bloqueo AV 2:1, avanzado y completo'),
      L('r5', '期前收缩（房性、房性未下传、交界性、室性）与差异性传导', 'Premature beats (PAC, blocked PAC, PJC, PVC) and aberrancy', 'Extrasístoles (auriculares, auriculares bloqueadas, de la unión y ventriculares) y aberrancia'),
      L('r6', '右束支与左束支传导阻滞（严格标准）', 'RBBB and LBBB (strict criteria)', 'Bloqueo de rama derecha e izquierda (criterios estrictos)'),
      L('r7', '分支阻滞、双分支阻滞、交替性束支阻滞与室内传导延迟', 'Fascicular blocks, bifascicular block, alternating BBB and IVCD', 'Bloqueos fasciculares, bloqueo bifascicular, bloqueo de rama alternante y trastorno de la conducción intraventricular'),
      L('r8', '梯形图', 'Ladder diagrams', 'Diagramas en escalera'),
    ],
  },
  {
    id: 'T',
    title: l('节律 II：心动过速', 'Rhythm II: tachycardias', 'Ritmo II: taquicardias'),
    goal: l(
      '按 QRS 宽窄与是否规整为任何心动过速分类；无法解释的宽 QRS 心动过速按室性心动过速处理；10 秒内识别心脏骤停前后节律。',
      'Classify any tachycardia by QRS width and regularity, treat an unexplained wide-complex tachycardia as VT, and recognise peri-arrest rhythms in ten seconds.',
      'Clasificar cualquier taquicardia por la anchura del QRS y su regularidad, tratar una taquicardia de QRS ancho no explicada como TV y reconocer los ritmos periparada en diez segundos.',
    ),
    lessons: [
      L('t1', '规则的窄 QRS 心动过速（窦性、AVNRT、AVRT、局灶性房速、2:1 心房扑动）', 'Regular narrow-QRS tachycardia (sinus, AVNRT, AVRT, focal AT, 2:1 flutter)', 'Taquicardia regular de QRS estrecho (sinusal, TRIN, TRAV, taquicardia auricular focal, flutter 2:1)'),
      L('t2', '不规则节律（心房颤动、不等比下传的心房扑动、多源性房速、频发期前收缩）', 'Irregular rhythms (AF, flutter with variable block, MAT, frequent ectopy)', 'Ritmos irregulares (fibrilación auricular, flutter con conducción variable, taquicardia auricular multifocal, extrasístoles frecuentes)'),
      L('t3', '心房扑动详解', 'Atrial flutter in depth', 'El flutter auricular en profundidad'),
      L('t4', '心室预激：WPW 图形与 WPW 综合征、预激伴心房颤动', 'Pre-excitation: WPW pattern vs syndrome, pre-excited AF', 'Preexcitación: patrón frente a síndrome de WPW, fibrilación auricular preexcitada'),
      L('t5', '宽 QRS 心动过速（房室分离、夺获与融合波、同向性、一个快速流程）', 'Wide-complex tachycardia (AV dissociation, capture and fusion beats, concordance, one fast algorithm)', 'Taquicardia de QRS ancho (disociación AV, latidos de captura y de fusión, concordancia, un algoritmo rápido)'),
      L('t6', '多形性室速、尖端扭转型室速、心室颤动、心室停搏、无脉性电活动及类似室速的伪差', 'Polymorphic VT, torsades, VF, asystole, PEA and artefact mimicking VT', 'TV polimorfa, torsade de pointes, FV, asistolia, AESP y artefactos que simulan una TV'),
      L('t7', '心脏骤停前后节律的识别与第一步处理', 'Peri-arrest rhythms and the first action', 'Ritmos periparada y la primera actuación'),
    ],
  },
  {
    id: 'I',
    title: l('心肌缺血与梗死', 'Ischaemia & infarction', 'Isquemia e infarto'),
    goal: l(
      '对每一份胸痛心电图作出判断：冠状动脉闭塞可能、不确定（复查、加做导联）或非闭塞（说出类似情况）；并定位罪犯血管。',
      'For every chest-pain ECG commit to occlusion likely, indeterminate (repeat, extra leads) or not occlusion (name the mimic), and localise the culprit.',
      'Ante cada ECG con dolor torácico, decidir: oclusión probable, indeterminado (repetir, derivaciones adicionales) o sin oclusión (nombrar el imitador), y localizar la arteria responsable.',
    ),
    lessons: [
      L('i1', 'ST 段测量、按性别与年龄的 UDMI 阈值、相邻导联与对应性改变', 'Measuring ST, UDMI thresholds by sex and age, contiguous leads and reciprocity', 'Medición del ST, umbrales de la definición universal por sexo y edad, derivaciones contiguas y cambios recíprocos'),
      L('i2', '供血区域与罪犯血管', 'Territories and the culprit artery', 'Territorios y arteria responsable'),
      L('i3', '前壁闭塞', 'Anterior occlusion', 'Oclusión anterior'),
      L('i4', '下壁梗死与右心室梗死', 'Inferior and right ventricular infarction', 'Infarto inferior y del ventrículo derecho'),
      L('i5', '侧壁与高侧壁梗死', 'Lateral and high lateral infarction', 'Infarto lateral y lateral alto'),
      L('i6', '后壁梗死（V1–V4 ST 段压低、V7–V9）', 'Posterior infarction (V1–V4 ST depression, V7–V9)', 'Infarto posterior (descenso del ST en V1–V4, V7–V9)'),
      L('i7', '隐匿性闭塞：超急性期 T 波、比例原则、QRS 终末部变形与系列心电图', 'Subtle occlusion: hyperacute T waves, proportionality, terminal QRS distortion, serial ECGs', 'Oclusión sutil: ondas T hiperagudas, proporcionalidad, distorsión terminal del QRS y ECG seriados'),
      L('i8', 'Wellens 综合征、de Winter T 波、aVR 导联 ST 段抬高伴广泛 ST 段压低', 'Wellens, de Winter and aVR elevation with diffuse ST depression', 'Wellens, De Winter y elevación del ST en aVR con descenso difuso del ST'),
      L('i9', '演变、Q 波、再灌注、陈旧性心肌梗死与左心室室壁瘤', 'Evolution, Q waves, reperfusion, old MI and LV aneurysm', 'Evolución, ondas Q, reperfusión, infarto antiguo y aneurisma del ventrículo izquierdo'),
      L('i10', '干扰因素：左束支传导阻滞与起搏（Sgarbossa、Smith 标准）、右束支传导阻滞、左心室肥厚', 'Confounders: LBBB and pacing (Sgarbossa, Smith), RBBB, LVH', 'Factores de confusión: bloqueo de rama izquierda y marcapasos (Sgarbossa, Smith), bloqueo de rama derecha, HVI'),
      L('i11', '类似心肌梗死的情况：心包炎、早期复极、室壁瘤、Brugada、高钾血症、应激性心肌病', 'Mimics: pericarditis, early repolarization, aneurysm, Brugada, hyperkalaemia, takotsubo', 'Imitadores: pericarditis, repolarización precoz, aneurisma, Brugada, hiperpotasemia, tako-tsubo'),
    ],
  },
  {
    id: 'H',
    title: l('心腔异常与猝死相关疾病', 'Chambers & sudden-death substrates', 'Cavidades y sustratos de muerte súbita'),
    goal: l(
      '识别结构性心脏病与离子通道病的心电图基础，并知道哪些需要转诊。',
      'Recognise the structural and channelopathy substrates of sudden death, and know what to refer.',
      'Reconocer los sustratos estructurales y las canalopatías que causan muerte súbita y saber qué derivar al especialista.',
    ),
    lessons: [
      L('h1', '心房异常与房间传导阻滞', 'Atrial abnormality and interatrial block', 'Anomalía auricular y bloqueo interauricular'),
      L('h2', '左心室肥厚（Sokolow-Lyon、Cornell、Peguero-Lo Presti 标准；继发性 ST-T 改变）', 'LVH (Sokolow-Lyon, Cornell, Peguero-Lo Presti; secondary ST–T changes)', 'HVI (Sokolow-Lyon, Cornell, Peguero-Lo Presti; alteraciones secundarias del ST-T)'),
      L('h3', '右心室肥厚与右心负荷过重', 'RVH and right heart strain', 'HVD y sobrecarga del corazón derecho'),
      L('h4', '低电压与浸润性心肌病', 'Low voltage and infiltrative disease', 'Bajo voltaje y enfermedad infiltrativa'),
      L('h5', '肥厚型心肌病（含心尖肥厚型）', 'Hypertrophic cardiomyopathy, including the apical form', 'Miocardiopatía hipertrófica, incluida la forma apical'),
      L('h6', '致心律失常性右心室心肌病', 'Arrhythmogenic right ventricular cardiomyopathy', 'Miocardiopatía arritmogénica del ventrículo derecho'),
      L('h7', '长 QT（先天性与药物性）与短 QT', 'Long QT (congenital and drug-induced) and short QT', 'QT largo (congénito y farmacológico) y QT corto'),
      L('h8', 'Brugada 综合征与早期复极综合征', 'Brugada and early repolarization syndrome', 'Síndrome de Brugada y síndrome de repolarización precoz'),
      L('h9', '运动员心电图（国际标准）', 'The athlete’s ECG (international criteria)', 'El ECG del deportista (criterios internacionales)'),
    ],
  },
  {
    id: 'O',
    title: l('全身因素、药物、器械与技术问题', 'Systemic, drugs, devices & technique', 'Causas sistémicas, fármacos, dispositivos y técnica'),
    goal: l(
      '在归咎于心脏之前，先用代谢、药物、体温、器械或记录本身来解释异常心电图。',
      'Explain an abnormal ECG by metabolism, drugs, temperature, devices or the recording before blaming the heart.',
      'Explicar un ECG anormal por el metabolismo, los fármacos, la temperatura, los dispositivos o el propio registro antes de culpar al corazón.',
    ),
    lessons: [
      L('o1', '血钾异常', 'Potassium', 'Potasio'),
      L('o2', '血钙与血镁异常', 'Calcium and magnesium', 'Calcio y magnesio'),
      L('o3', '洋地黄效应与洋地黄中毒', 'Digoxin effect vs toxicity', 'Efecto digitálico frente a intoxicación digitálica'),
      L('o4', '钠通道阻滞剂及其他药物', 'Sodium-channel blockers and other drugs', 'Bloqueantes de los canales de sodio y otros fármacos'),
      L('o5', '低体温', 'Hypothermia', 'Hipotermia'),
      L('o6', '肺栓塞', 'Pulmonary embolism', 'Tromboembolismo pulmonar'),
      L('o7', '心包炎、心包积液与心脏压塞', 'Pericarditis, effusion and tamponade', 'Pericarditis, derrame pericárdico y taponamiento'),
      L('o8', '非缺血性深倒 T 波（脑源性、心动过速后、心脏记忆）', 'Deep T inversion that is not ischaemia (cerebral, post-tachycardia, cardiac memory)', 'Inversión profunda de la onda T no isquémica (cerebral, postaquicardia, memoria cardiaca)'),
      L('o9', '导联接反、电极位置错误与右位心', 'Lead reversal, misplacement and dextrocardia', 'Inversión de electrodos, colocación incorrecta y dextrocardia'),
      L('o10', '伪差与滤波', 'Artefacts and filters', 'Artefactos y filtros'),
      L('o11', '起搏心电图', 'The paced ECG', 'El ECG con marcapasos'),
      L('o12', '计算机自动判读与自动化偏倚', 'Computer interpretation and automation bias', 'Interpretación automática y sesgo de automatización'),
    ],
  },
  {
    id: 'X',
    title: l('综合读图', 'Integration', 'Integración'),
    goal: l(
      '在时间压力下阅读未经挑选的真实心电图，写出包含紧急程度和下一步处理的结构化报告。',
      'Read unselected real ECGs under time pressure and write a structured report with the urgency and the next action.',
      'Leer ECG reales no seleccionados con tiempo limitado y redactar un informe estructurado con la urgencia y el paso siguiente.',
    ),
    lessons: [
      L('x1', '结构化报告', 'The structured report', 'El informe estructurado'),
      L('x2', '心电图门诊：按患病率抽取的真实心电图', 'ECG clinic: a prevalence-weighted stream of real ECGs', 'Consulta de ECG: una serie de ECG reales ponderada por prevalencia'),
      L('x3', '10 秒急诊分诊', 'Ten-second emergency triage', 'Triaje urgente en diez segundos'),
      L('x4', '信心校准与个人错误回顾', 'Confidence calibration and personal error review', 'Calibración de la confianza y revisión de los propios errores'),
    ],
  },
];

/** Every planned lesson id in teaching order. */
export const PLANNED_IDS: readonly string[] = CURRICULUM.flatMap((s) => s.lessons.map((x) => x.id));

/** Planned lesson id → stage. */
export const PLANNED_STAGE: ReadonlyMap<string, StageId> = new Map(CURRICULUM.flatMap((s) => s.lessons.map((x) => [x.id, s.id] as const)));

export function plannedLesson(id: string): (PlannedLesson & { readonly stage: StageId; readonly order: number }) | null {
  for (const s of CURRICULUM) {
    const i = s.lessons.findIndex((x) => x.id === id);
    if (i >= 0) return { ...s.lessons[i], stage: s.id, order: i + 1 };
  }
  return null;
}
