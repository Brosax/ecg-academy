/**
 * Content text of the pages owned by src/app (home learning path, about page). Inline { zh, en, es } so a reviewer sees
 * all three languages together. Original wording; the textbook is cited, never paraphrased.
 */
import { l, type L10n } from '../core/l10n';

/**
 * The eight curriculum stages (docs/PLAN.md §3, final order). The course module owns units and lessons; this is the
 * overview shown on the home page only. Stage ids are stable.
 */
export const STAGE_IDS = ['F', 'S', 'R', 'T', 'I', 'H', 'O', 'X'] as const;
export type StageId = (typeof STAGE_IDS)[number];

export interface StageInfo {
  readonly id: StageId;
  /** position on the path as the learner reads it: 1 … 8 */
  readonly n: number;
  readonly name: L10n;
  readonly desc: L10n;
}

export const STAGES: readonly StageInfo[] = [
  {
    id: 'F',
    n: 1,
    name: l('基础', 'Foundations', 'Fundamentos'),
    desc: l(
      '从传导系统、电偶极子与向量到各导联体系：学会预测任一导联的波形方向，并在读图前先检查记录本身（走纸、定标、电极位置、信号质量）。',
      'From the conduction system, dipoles and vectors to the lead systems: predict the deflection in any lead, and check the recording itself (paper, calibration, electrodes, signal quality) before you read it.',
      'Del sistema de conducción, el dipolo y los vectores a los sistemas de derivaciones: predice la deflexión en cualquier derivación y comprueba el propio registro (papel, calibración, electrodos, calidad de la señal) antes de leerlo.',
    ),
  },
  {
    id: 'S',
    n: 2,
    name: l('系统读图与测量', 'Systematic reading & measurement', 'Lectura sistemática y medición'),
    desc: l(
      '一套约三分钟完成的固定读图顺序：心率、窦性心律、PR、QRS、QT 与 QTc、电轴、R 波递增、ST 段测量，以及不应误判为异常的正常变异。',
      'A fixed reading order you can finish in about three minutes: rate, sinus rhythm, PR, QRS, QT and QTc, axis, R-wave progression, measuring the ST segment, and the normal variants you must not over-call.',
      'Un orden de lectura fijo que puedes completar en unos tres minutos: frecuencia, ritmo sinusal, PR, QRS, QT y QTc, eje, progresión de la onda R, medición del segmento ST y las variantes normales que no deben sobrediagnosticarse.',
    ),
  },
  {
    id: 'R',
    n: 3,
    name: l('节律 I：缓慢心律、传导阻滞与期前收缩', 'Rhythm I: slow rhythms, blocks & ectopy', 'Ritmo I: bradicardias, bloqueos y extrasístoles'),
    desc: l(
      '找到心房活动并确定 P 波与 QRS 波群的关系：窦房结功能障碍、逸搏心律、房室传导阻滞、期前收缩、束支与分支阻滞，以及梯形图。',
      'Find the atrial activity and the P–QRS relationship: sinus node dysfunction, escape rhythms, AV blocks, premature beats, bundle branch and fascicular blocks, and ladder diagrams.',
      'Localiza la actividad auricular y la relación P–QRS: disfunción sinusal, ritmos de escape, bloqueos AV, extrasístoles, bloqueos de rama y hemibloqueos, y diagramas en escalera.',
    ),
  },
  {
    id: 'T',
    n: 4,
    name: l('节律 II：心动过速', 'Rhythm II: tachycardias', 'Ritmo II: taquicardias'),
    desc: l(
      '按 QRS 宽窄和节律是否规整为任何心动过速分类：窄 QRS 心动过速、心房颤动与心房扑动、心室预激、宽 QRS 心动过速（未证实前按室性心动过速处理），并在 10 秒内识别心脏骤停相关节律。',
      'Classify any tachycardia by QRS width and regularity: narrow-QRS tachycardias, atrial fibrillation and flutter, pre-excitation, wide-QRS tachycardia (VT until proven otherwise), and the arrest rhythms you must recognise in ten seconds.',
      'Clasifica cualquier taquicardia por la anchura del QRS y su regularidad: taquicardias de QRS estrecho, fibrilación y flutter auricular, preexcitación, taquicardia de QRS ancho (TV mientras no se demuestre lo contrario) y los ritmos de parada que hay que reconocer en diez segundos.',
    ),
  },
  {
    id: 'I',
    n: 5,
    name: l('心肌缺血与梗死', 'Ischaemia & infarction', 'Isquemia e infarto'),
    desc: l(
      '对每一份胸痛心电图作出判断：冠状动脉闭塞可能、不确定，还是非闭塞。正确测量 ST 段，定位罪犯血管，识别隐匿性闭塞和 STEMI 等同表现，并说出易混淆的情况。',
      'For every chest-pain ECG, commit to a decision: occlusion likely, indeterminate, or not occlusion. Measure the ST segment correctly, localise the culprit artery, catch subtle occlusion and the STEMI equivalents, and name the mimics.',
      'Ante cada ECG con dolor torácico, decide: oclusión probable, indeterminado o sin oclusión. Mide bien el segmento ST, localiza la arteria responsable, detecta la oclusión sutil y los equivalentes de IAMCEST y nombra los imitadores.',
    ),
  },
  {
    id: 'H',
    n: 6,
    name: l('心腔异常与猝死相关疾病', 'Chambers & sudden-death substrates', 'Cavidades y sustratos de muerte súbita'),
    desc: l(
      '心房异常、左心室与右心室肥厚、低电压、肥厚型心肌病、致心律失常性心肌病、长 QT 与短 QT、Brugada 图形以及运动员心电图：学会识别，并知道何时转诊。',
      'Atrial abnormality, left and right ventricular hypertrophy, low voltage, hypertrophic and arrhythmogenic cardiomyopathy, long and short QT, the Brugada pattern and the athlete’s ECG: what to recognise and when to refer.',
      'Anomalía auricular, hipertrofia ventricular izquierda y derecha, bajo voltaje, miocardiopatía hipertrófica y arritmogénica, QT largo y corto, patrón de Brugada y el ECG del deportista: qué reconocer y cuándo derivar.',
    ),
  },
  {
    id: 'O',
    n: 7,
    name: l('全身因素、药物、器械与技术问题', 'Systemic, drugs, devices & technique', 'Causas sistémicas, fármacos, dispositivos y técnica'),
    desc: l(
      '在归咎于心脏之前，先考虑电解质、药物、体温、心包疾病、肺栓塞、起搏器以及记录本身（导联接错、伪差、滤波），并认清计算机自动诊断的局限。',
      'Before blaming the heart, consider electrolytes, drugs, temperature, pericardial disease, pulmonary embolism, pacemakers and the recording itself (lead reversal, artefacts, filters), and the limits of computer interpretation.',
      'Antes de culpar al corazón, piensa en los electrolitos, los fármacos, la temperatura, la enfermedad pericárdica, la embolia pulmonar, el marcapasos y el propio registro (inversión de electrodos, artefactos, filtros), y en los límites de la interpretación automática.',
    ),
  },
  {
    id: 'X',
    n: 8,
    name: l('综合读图', 'Integration', 'Integración'),
    desc: l(
      '在时间压力下阅读未经挑选的真实心电图：写出包含紧急程度和下一步处理的结构化报告，10 秒急诊分诊，并认真回顾自己的错误。',
      'Read unselected real ECGs against the clock: a structured report with urgency and next step, ten-second emergency triage, and an honest review of your own errors.',
      'Lee ECG reales no seleccionados y con el tiempo limitado: informe estructurado con la urgencia y el paso siguiente, triaje urgente en diez segundos y revisión sincera de tus propios errores.',
    ),
  },
];

export const ABOUT = {
  what: l(
    'ECG Academy（心电图读图学院）是一门面向医学生、护士和住院医师的心电图读图课程。它只有一个目标：让你能够独立、有条理、安全地读懂一份真实的 12 导联心电图。心电图始终是主角：先由你读图，再由课程讲解，然后通过无限的练习和真实病例巩固。',
    'ECG Academy is a course in reading electrocardiograms for medical students, nurses and residents. It has one goal: that you can read a real 12-lead ECG on your own — systematically, accurately and safely. The ECG is always at the centre: you read first, the lesson then explains, and you consolidate with unlimited practice and real cases.',
    'ECG Academy es un curso de lectura de electrocardiogramas para estudiantes de Medicina, enfermería y residentes. Tiene un único objetivo: que seas capaz de leer por ti mismo un ECG real de 12 derivaciones, de forma sistemática, precisa y segura. El ECG es siempre el protagonista: primero lees, después la lección explica y luego consolidas con práctica ilimitada y casos reales.',
  ),
  synth: l(
    '课程和练习中的模拟心电图由心脏电活动模型计算得出：同一个心脏源（激动与复极过程）通过同一套导联系统投影到全部 12 个导联。肢体导联严格符合 Einthoven 与 Goldberger 关系，胸导联以 Wilson 中心电端为参考。疾病只能通过改变心律、激动或复极模型、局部参数、电极位置或记录条件来体现——任何导联的波形都不会被单独绘制或修改。因此，用来评判你答案的心率、间期、电轴和诊断都直接来自模型本身，并与图上可以测量到的数值一致。',
    'The simulated ECGs in lessons and drills are computed from a model of the heart’s electrical activity: one cardiac source (activation and repolarization) projected through one lead system onto all 12 leads. Limb leads obey Einthoven’s and Goldberger’s relations exactly; chest leads are referenced to Wilson’s central terminal. A condition can only change the rhythm, the activation or repolarization model, regional properties, electrode positions or the recording chain — no lead is ever drawn or edited on its own. That is why the rate, intervals, axis and diagnosis used to grade your answers come from the model itself and agree with what you can measure on the tracing.',
    'Los ECG simulados de las lecciones y los ejercicios se calculan a partir de un modelo de la actividad eléctrica del corazón: una única fuente cardiaca (activación y repolarización) proyectada mediante un único sistema de derivaciones sobre las 12 derivaciones. Las derivaciones de los miembros cumplen exactamente las relaciones de Einthoven y Goldberger, y las precordiales se refieren al terminal central de Wilson. Una enfermedad solo puede modificar el ritmo, el modelo de activación o repolarización, las propiedades regionales, la posición de los electrodos o la cadena de registro; ninguna derivación se dibuja ni se retoca por separado. Por eso la frecuencia, los intervalos, el eje y el diagnóstico con los que se corrigen tus respuestas proceden del propio modelo y coinciden con lo que puedes medir en el trazado.',
  ),
  real: l(
    '真实心电图来自公开数据集 PTB-XL：由心脏病专家标注的 10 秒 12 导联临床记录。我们精选了 300 份记录（每位患者一份，无噪声标记），并显示 PTB-XL+ 中 GE 12SL 算法的参考测量值。真实病例的“答案”是心脏病专家的报告，而不是模型——这正是临床中读图的样子。',
    'The real ECGs come from PTB-XL, a public dataset of 10-second clinical 12-lead recordings annotated by cardiologists. We selected 300 records (one per patient, none flagged for noise) and show the reference measurements of the GE 12SL algorithm from PTB-XL+. For real cases the “answer” is the cardiologists’ report, not a model — which is what reading ECGs looks like in practice.',
    'Los ECG reales proceden de PTB-XL, un conjunto de datos público de registros clínicos de 12 derivaciones de 10 segundos anotados por cardiólogos. Seleccionamos 300 registros (uno por paciente y sin indicadores de ruido) y mostramos las mediciones de referencia del algoritmo GE 12SL de PTB-XL+. En los casos reales, la «respuesta» es el informe de los cardiólogos, no un modelo: así es leer un ECG en la práctica.',
  ),
  realChanges: l(
    '对原始数据的修改：从 500 Hz 降采样至 250 Hz（先低通滤波），量化为 5 µV；III、aVR、aVL、aVF 由 I 和 II 重新计算。',
    'Changes made to the data: resampled from 500 Hz to 250 Hz (after low-pass filtering) and quantized to 5 µV; leads III, aVR, aVL and aVF re-derived from I and II.',
    'Cambios realizados en los datos: remuestreo de 500 Hz a 250 Hz (tras un filtro paso bajo) y cuantificación a 5 µV; derivaciones III, aVR, aVL y aVF recalculadas a partir de I y II.',
  ),
  heart: l(
    '小型 3D 心脏基于 Human Reference Atlas（HuBMAP）的 3D 参考器官“男性心脏”v1.3，经简化后用于显示激动与复极过程。其上绘制的传导系统由本应用添加，并非 HRA 模型的一部分。它是辅助视图，只用来解释心电图为什么是这个样子。',
    'The small 3D heart is based on the Human Reference Atlas (HuBMAP) 3D Reference Organ “Heart, Male” v1.3, simplified to show activation and recovery. The conduction system drawn on it is added by this app and is not part of the HRA model. It is a secondary view, there only to explain why the ECG looks the way it does.',
    'El pequeño corazón 3D se basa en el órgano de referencia 3D «Heart, Male» v1.3 del Human Reference Atlas (HuBMAP), simplificado para mostrar la activación y la recuperación. El sistema de conducción dibujado sobre él lo añade esta aplicación y no forma parte del modelo del HRA. Es una vista secundaria: solo sirve para explicar por qué el ECG tiene ese aspecto.',
  ),
  book: l(
    '课程结构、诊断标准和术语参考了下列教科书。它仅作为课程参考：本应用中的文字、表格和插图均为原创。',
    'The curriculum structure, diagnostic criteria and terminology were checked against the textbook below. It is used as a curriculum reference only: all text, tables and figures in this app are original.',
    'La estructura del temario, los criterios diagnósticos y la terminología se han contrastado con el libro de texto siguiente. Se utiliza solo como referencia del temario: todos los textos, tablas y figuras de esta aplicación son originales.',
  ),
  dataLicence: l(
    'PTB-XL 与 PTB-XL+ 由 PhysioNet 发布，采用知识共享署名 4.0 国际许可协议（CC BY 4.0）。',
    'PTB-XL and PTB-XL+ are published on PhysioNet under the Creative Commons Attribution 4.0 International licence (CC BY 4.0).',
    'PTB-XL y PTB-XL+ se publican en PhysioNet con la licencia Creative Commons Atribución 4.0 Internacional (CC BY 4.0).',
  ),
  software: l(
    '使用 Preact、@preact/signals 和 three.js 构建（均为 MIT 许可）。',
    'Built with Preact, @preact/signals and three.js (all MIT licence).',
    'Desarrollado con Preact, @preact/signals y three.js (todos con licencia MIT).',
  ),
  disclaimer: l(
    '本应用仅用于教学，不能替代临床判断，不得用于诊断或治疗决策。模拟心电图来自简化模型，真实心电图的标注也可能有误。面对真实患者时，请遵循当地指南并咨询有经验的医生。',
    'This app is for education only. It does not replace clinical judgement and must not be used for diagnosis or treatment decisions. Simulated ECGs come from a simplified model, and the labels of real ECGs may contain errors. For real patients, follow local guidelines and consult an experienced clinician.',
    'Esta aplicación tiene fines exclusivamente docentes. No sustituye al juicio clínico y no debe utilizarse para tomar decisiones diagnósticas ni terapéuticas. Los ECG simulados proceden de un modelo simplificado y las etiquetas de los ECG reales pueden contener errores. Ante pacientes reales, sigue las guías locales y consulta a un profesional con experiencia.',
  ),
  privacy: l(
    '你的学习进度和设置只保存在本浏览器中，不会上传到任何服务器；应用运行时不加载任何外部资源。',
    'Your progress and settings are stored only in this browser and are never uploaded; the app loads no external resources while it runs.',
    'Tu progreso y tus ajustes se guardan solo en este navegador y nunca se envían a ningún servidor; la aplicación no carga recursos externos mientras funciona.',
  ),
} as const satisfies Readonly<Record<string, L10n>>;

/** Bibliographic references (Vancouver style). Not translated: citations keep their original language. */
export const CITATIONS = {
  book: 'Castellano C, Pérez de Juan MA, Attie F. Electrocardiografía clínica. 2.ª ed. Madrid: Elsevier; 2004.',
  ptbxl: 'Wagner P, Strodthoff N, Bousseljot RD, et al. PTB-XL, a large publicly available electrocardiography dataset. Sci Data. 2020;7:154.',
  ptbxlPlus: 'Strodthoff N, Mehari T, Nagel C, et al. PTB-XL+, a comprehensive electrocardiographic feature dataset. Sci Data. 2023;10:279.',
  physionet:
    'Goldberger AL, Amaral LAN, Glass L, et al. PhysioBank, PhysioToolkit, and PhysioNet: components of a new research resource for complex physiologic signals. Circulation. 2000;101(23):e215–e220.',
  hra: 'Browne K, Schlehlein H. 3D Reference Organ: Heart, Male (VH_M_Heart), v1.3. Human Reference Atlas, HuBMAP; based on Visible Human Project male data (US National Library of Medicine).',
} as const;

export const LINKS = {
  ptbxl: 'https://physionet.org/content/ptb-xl/1.0.3/',
  ptbxlPlus: 'https://physionet.org/content/ptb-xl-plus/1.0.1/',
  hra: 'https://doi.org/10.48539/HBM564.WKNG.249',
  ccBy: 'https://creativecommons.org/licenses/by/4.0/',
} as const;
