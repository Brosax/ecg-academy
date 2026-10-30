/**
 * The systematic reading checklist (docs/PLAN.md §3 stage S, lesson s1; critic.json: the six-step method extended to a
 * structured read — quality and placement first, a "never-miss" screen before the summary, the computer statement
 * last). Values agree with docs/curriculum/criteria.md. Content text, inline L10n. Pure data — tested in tests/tools.
 */
import { l, type L10n } from '../core/l10n';

export const STEP_IDS = [
  'quality',
  'rate',
  'rhythm',
  'pr',
  'qrs',
  'qt',
  'axis',
  'morphology',
  'compare',
  'never-miss',
  'summary',
  'computer',
] as const;
export type StepId = (typeof STEP_IDS)[number];

export interface ChecklistStep {
  readonly id: StepId;
  readonly title: L10n;
  /** what to do, in order */
  readonly check: readonly L10n[];
  /** the normal answer (adult) */
  readonly normal?: L10n;
  /** findings that change the urgency */
  readonly flags?: readonly L10n[];
  /** PLAN §3 lesson ids */
  readonly lessons: readonly string[];
}

export const CHECKLIST: readonly ChecklistStep[] = [
  {
    id: 'quality',
    title: l('记录质量、定标与电极位置', 'Recording quality, calibration and lead placement', 'Calidad del registro, calibración y colocación de electrodos'),
    check: [
      l('核对患者、日期和时间。', 'Check the patient, date and time.', 'Comprueba el paciente, la fecha y la hora.'),
      l('定标脉冲10 mm（10 mm/mV），走纸25 mm/s；注意胸导联半增益（阶梯形脉冲）。', 'Calibration pulse 10 mm (10 mm/mV) and 25 mm/s; watch for half gain on the chest leads (stepped pulse).', 'Pulso de calibración de 10 mm (10 mm/mV) y 25 mm/s; atención a la media ganancia en precordiales (pulso escalonado).'),
      l('滤波：诊断模式（0.05–150 Hz），而非监护模式。', 'Filter: diagnostic mode (0.05–150 Hz), not monitor mode.', 'Filtro: modo diagnóstico (0,05–150 Hz), no modo monitor.'),
      l('电极位置：Ⅰ、Ⅱ导联P波直立，aVR倒置；胸导联R波逐渐增高。', 'Placement: P upright in I and II, negative in aVR; R growing across the chest leads.', 'Colocación: P positiva en I y II, negativa en aVR; R creciente en las precordiales.'),
      l('伪差：基线漂移、肌电、交流电干扰。', 'Artefact: baseline wander, muscle tremor, mains interference.', 'Artefactos: oscilación de la línea de base, temblor muscular, interferencia de la red.'),
    ],
    normal: l('标准定标与走纸、诊断滤波、电极位置正确、无明显伪差。', 'Standard gain and speed, diagnostic filter, correct placement, no significant artefact.', 'Ganancia y velocidad estándar, filtro diagnóstico, colocación correcta, sin artefactos relevantes.'),
    flags: [
      l('Ⅰ导联P波倒置 → 先排除上肢电极反接。', 'Negative P in lead I → exclude arm-electrode reversal first.', 'P negativa en I → descarta primero la inversión de los electrodos de los brazos.'),
      l('“室速”而患者神志清楚 → 先查伪差。', '“VT” in a conscious, well patient → look for artefact.', '«TV» en un paciente consciente y estable → busca artefacto.'),
    ],
    lessons: ['f4', 'f5', 'f6'],
  },
  {
    id: 'rate',
    title: l('心率', 'Rate', 'Frecuencia'),
    check: [
      l('规则心律：300 ÷ 大格数，或1500 ÷ 小格数。', 'Regular rhythm: 300 ÷ large squares, or 1500 ÷ small squares.', 'Ritmo regular: 300 ÷ cuadros grandes, o 1500 ÷ cuadros pequeños.'),
      l('不规则心律：10秒内QRS个数 × 6。', 'Irregular rhythm: QRS complexes in 10 s × 6.', 'Ritmo irregular: complejos QRS en 10 s × 6.'),
      l('P波与QRS频率不同时分别计算心房率和心室率。', 'If P and QRS rates differ, count atrial and ventricular rates separately.', 'Si las frecuencias de P y QRS difieren, cuenta por separado la auricular y la ventricular.'),
    ],
    normal: l('60–100次/分（指南50–100次/分）', '60–100 bpm (guideline 50–100 bpm)', '60–100 lpm (guía: 50–100 lpm)'),
    flags: [l('<40次/分或>150次/分，尤其伴症状。', '< 40 or > 150 bpm, especially with symptoms.', '< 40 o > 150 lpm, sobre todo con síntomas.')],
    lessons: ['s2'],
  },
  {
    id: 'rhythm',
    title: l('节律', 'Rhythm', 'Ritmo'),
    check: [
      l('有无P波？Ⅰ、Ⅱ、aVF直立 → 窦性。', 'Are there P waves? Upright in I, II and aVF → sinus.', '¿Hay ondas P? Positivas en I, II y aVF → sinusal.'),
      l('每个P波后有QRS吗？每个QRS前有P波吗？', 'Is every P followed by a QRS, and every QRS preceded by a P?', '¿Cada P va seguida de un QRS y cada QRS precedido de una P?'),
      l('规则、规律性不规则还是绝对不规则？', 'Regular, regularly irregular or irregularly irregular?', '¿Regular, irregular con patrón o irregularmente irregular?'),
      l('有疑问时画梯形图。', 'When in doubt, draw a ladder diagram.', 'Si dudas, dibuja un diagrama en escalera.'),
    ],
    normal: l('窦性心律：P波电轴0°至+75°，PP规则。', 'Sinus rhythm: P axis 0° to +75°, regular PP.', 'Ritmo sinusal: eje de la P de 0° a +75°, PP regular.'),
    flags: [
      l('规则的宽QRS心动过速 → 按室速处理，除非证实为其他。', 'Regular wide-complex tachycardia → treat as VT unless proven otherwise.', 'Taquicardia regular de complejo ancho → trátala como TV salvo prueba en contra.'),
      l('不规则的宽QRS快速心律 → 想到预激伴房颤。', 'Irregular, wide and fast → think of pre-excited AF.', 'Irregular, ancha y rápida → piensa en FA preexcitada.'),
    ],
    lessons: ['s3', 'r1', 'r8'],
  },
  {
    id: 'pr',
    title: l('PR间期', 'PR interval', 'Intervalo PR'),
    check: [
      l('从最早的P波起点量到最早的QRS起点。', 'Measure from the earliest P onset to the earliest QRS onset.', 'Mide desde el inicio más precoz de la P hasta el inicio más precoz del QRS.'),
      l('PR是否恒定？逐渐延长？有未下传的P波？', 'Is the PR constant, lengthening, or are some P waves not conducted?', '¿El PR es constante, se alarga o hay P no conducidas?'),
    ],
    normal: l('120–200 ms', '120–200 ms', '120–200 ms'),
    flags: [
      l('PR<120 ms伴δ波 → 心室预激。', 'PR < 120 ms with a delta wave → pre-excitation.', 'PR < 120 ms con onda delta → preexcitación.'),
      l('P波未下传而PR不变（Mobitz Ⅱ）或连续≥2个不下传 → 高度阻滞。', 'Dropped P with a constant PR (Mobitz II) or ≥ 2 consecutive dropped P waves → high-grade block.', 'P bloqueada con PR constante (Mobitz II) o ≥ 2 P bloqueadas seguidas → bloqueo avanzado.'),
    ],
    lessons: ['s4', 'r3', 'r4', 't4'],
  },
  {
    id: 'qrs',
    title: l('QRS时限', 'QRS duration', 'Duración del QRS'),
    check: [
      l('取同步导联中最早起点到最晚终点。', 'Take the earliest onset to the latest offset across simultaneous leads.', 'Toma desde el inicio más precoz hasta el final más tardío en derivaciones simultáneas.'),
      l('增宽时：束支阻滞？室性或起搏心律？预激？高钾或钠通道阻滞？', 'If wide: bundle branch block? Ventricular or paced rhythm? Pre-excitation? Hyperkalaemia or sodium-channel blockade?', 'Si es ancho: ¿bloqueo de rama? ¿Ritmo ventricular o de marcapasos? ¿Preexcitación? ¿Hiperpotasemia o bloqueo de canales de sodio?'),
    ],
    normal: l('<110 ms（多为80–100 ms）', '< 110 ms (usually 80–100 ms)', '< 110 ms (habitualmente 80–100 ms)'),
    flags: [l('新出现的宽QRS伴心动过缓或低血压 → 立即查血钾。', 'New wide QRS with bradycardia or hypotension → check potassium now.', 'QRS ancho nuevo con bradicardia o hipotensión → determina el potasio ya.')],
    lessons: ['s4', 'r6', 'r7'],
  },
  {
    id: 'qt',
    title: l('QT与QTc', 'QT and QTc', 'QT y QTc'),
    check: [
      l('在QT最长的导联用切线法测量，不含U波。', 'Measure with the tangent method in the lead with the longest QT, leaving out the U wave.', 'Mide con el método de la tangente en la derivación con el QT más largo, sin la onda U.'),
      l('用Fridericia或Framingham校正（心率快时不用Bazett）。', 'Correct with Fridericia or Framingham (avoid Bazett at fast rates).', 'Corrige con Fridericia o Framingham (evita Bazett a frecuencias rápidas).'),
      l('QRS≥120 ms时用JT或校正方法。', 'With QRS ≥ 120 ms use the JT interval or an adjusted method.', 'Con QRS ≥ 120 ms usa el JT o un método ajustado.'),
    ],
    normal: l('QTc男性<450 ms，女性<460 ms，且>390 ms', 'QTc < 450 ms (men), < 460 ms (women), and > 390 ms', 'QTc < 450 ms (varones), < 460 ms (mujeres), y > 390 ms'),
    flags: [l('QTc>500 ms或较基线延长>60 ms → 尖端扭转风险。', 'QTc > 500 ms or a rise > 60 ms → risk of torsades.', 'QTc > 500 ms o aumento > 60 ms → riesgo de torsade.')],
    lessons: ['s4', 'h7'],
  },
  {
    id: 'axis',
    title: l('额面电轴', 'Frontal axis', 'Eje frontal'),
    check: [
      l('Ⅰ和aVF导联QRS净方向 → 象限。', 'Net QRS in I and aVF → quadrant.', 'QRS neto en I y aVF → cuadrante.'),
      l('Ⅰ正、aVF负时看Ⅱ导联：正 = 正常，负 = 左偏。', 'I positive, aVF negative → look at II: positive = normal, negative = left deviation.', 'I positiva y aVF negativa → mira II: positiva = normal, negativa = desviación izquierda.'),
      l('等电位导联的垂直方向即为电轴。', 'The axis is perpendicular to the most equiphasic limb lead.', 'El eje es perpendicular a la derivación de los miembros más isodifásica.'),
    ],
    normal: l('−30°至+90°', '−30° to +90°', '−30° a +90°'),
    flags: [l('宽QRS心动过速伴“无人区”电轴 → 室速。', 'Wide-complex tachycardia with a northwest axis → VT.', 'Taquicardia de complejo ancho con eje en «tierra de nadie» → TV.')],
    lessons: ['s5'],
  },
  {
    id: 'morphology',
    title: l('P、QRS、ST、T、U形态', 'P, QRS, ST, T and U morphology', 'Morfología de P, QRS, ST, T y U'),
    check: [
      l('P波：Ⅱ导联时限和振幅、V1终末部（心房异常、房间阻滞）。', 'P: duration and height in II, terminal part in V1 (atrial abnormality, interatrial block).', 'P: duración y altura en II, parte terminal en V1 (anomalía auricular, bloqueo interauricular).'),
      l('QRS：电压（肥厚、低电压）、病理性Q波、R波递增与移行区、δ波、ε波。', 'QRS: voltage (hypertrophy, low voltage), pathological Q waves, R progression and transition, delta or epsilon waves.', 'QRS: voltaje (hipertrofia, bajo voltaje), ondas Q patológicas, progresión de R y transición, ondas delta o épsilon.'),
      l('ST：以PR段为基线在J点测量；对照按性别和年龄的阈值，找对应性改变。', 'ST: measure at the J point against the PR baseline; compare with sex- and age-specific thresholds; look for reciprocity.', 'ST: mide en el punto J respecto al PR; compara con los umbrales por sexo y edad; busca cambios recíprocos.'),
      l('T波：应直立处倒置？高尖？超急性（宽大饱满）？', 'T: inverted where it should be upright? Peaked? Hyperacute (broad, bulky)?', 'T: ¿negativa donde debería ser positiva? ¿Picuda? ¿Hiperaguda (ancha, voluminosa)?'),
      l('U波：明显或倒置？', 'U: prominent or inverted?', 'U: ¿prominente o negativa?'),
    ],
    normal: l('ST在基线；T波在Ⅰ、Ⅱ、V3–V6直立，aVR倒置。', 'ST at the baseline; T upright in I, II and V3–V6, inverted in aVR.', 'ST en la línea de base; T positiva en I, II y V3–V6, negativa en aVR.'),
    lessons: ['s6', 's7', 'h1', 'h2', 'i1'],
  },
  {
    id: 'compare',
    title: l('与既往心电图比较', 'Compare with a previous ECG', 'Compara con un ECG previo'),
    check: [
      l('有无新出现的Q波、ST-T改变、传导异常或电轴变化？', 'Any new Q waves, ST–T change, conduction defect or axis shift?', '¿Ondas Q, cambios del ST-T, trastornos de conducción o cambios del eje nuevos?'),
      l('症状持续时15–30分钟内复查心电图。', 'With ongoing symptoms, repeat the ECG within 15–30 minutes.', 'Con síntomas persistentes, repite el ECG en 15–30 minutos.'),
    ],
    lessons: ['i7', 'i9'],
  },
  {
    id: 'never-miss',
    title: l('不可漏诊筛查', '“Never-miss” screen', 'Cribado de lo que no puede pasarse por alto'),
    check: [
      l('急性冠脉闭塞及其等同表现（后壁、de Winter、超急性T波、Sgarbossa阳性、aVR抬高伴广泛压低）。', 'Acute coronary occlusion and its equivalents (posterior, de Winter, hyperacute T, positive Sgarbossa, aVR elevation with diffuse depression).', 'Oclusión coronaria aguda y sus equivalentes (posterior, De Winter, T hiperaguda, Sgarbossa positivo, elevación en aVR con descenso difuso).'),
      l('高钾血症。', 'Hyperkalaemia.', 'Hiperpotasemia.'),
      l('长QT。', 'Long QT.', 'QT largo.'),
      l('心室预激。', 'Pre-excitation.', 'Preexcitación.'),
      l('Brugada 1型图形。', 'Brugada type 1 pattern.', 'Patrón de Brugada tipo 1.'),
      l('高度或完全性房室传导阻滞。', 'High-grade or complete AV block.', 'Bloqueo AV avanzado o completo.'),
      l('室性心动过速。', 'Ventricular tachycardia.', 'Taquicardia ventricular.'),
    ],
    lessons: ['x3', 'i7', 'o1'],
  },
  {
    id: 'summary',
    title: l('总结与紧急程度', 'Summary and urgency', 'Resumen y urgencia'),
    check: [
      l('写出结构化报告：节律、心率、间期、电轴、形态异常。', 'Write a structured report: rhythm, rate, intervals, axis, morphology.', 'Redacta un informe estructurado: ritmo, frecuencia, intervalos, eje, morfología.'),
      l('给出解释、紧急程度和下一步（复查、加做导联、化验、会诊）。', 'Add the interpretation, the urgency and the next step (repeat, extra leads, tests, referral).', 'Añade la interpretación, la urgencia y el siguiente paso (repetir, derivaciones adicionales, pruebas, interconsulta).'),
    ],
    lessons: ['x1'],
  },
  {
    id: 'computer',
    title: l('最后才看机器判读', 'Only now read the computer statement', 'Solo ahora lee el informe automático'),
    check: [
      l('与自己的判读比较；不一致时回到心电图本身。', 'Compare it with your own reading; where they disagree, go back to the tracing.', 'Compáralo con tu lectura; si no coinciden, vuelve al trazado.'),
      l('机器常错：房颤与伪差、起搏、STEMI过度或漏诊、QT测量。', 'Machines often err on AF versus artefact, pacing, STEMI over- and under-calls and QT measurement.', 'Las máquinas fallan a menudo con FA frente a artefacto, marcapasos, IAMCEST de más o de menos y medición del QT.'),
    ],
    lessons: ['o12'],
  },
];
