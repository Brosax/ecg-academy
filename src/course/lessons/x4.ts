/**
 * X4 — Confidence calibration and personal error review (docs/PLAN.md §3, stage X).
 * The metacognition lesson: the three confidence levels (1 guess … 3 sure, Grade.confidence in src/practice/api.ts)
 * taught as action thresholds; overreading the machine statement per the "Computer interpretation — Overreading"
 * bullet of docs/curriculum/criteria.md (Schläpfer/Wellens); the error autopsy uses criteria.md `lafb` (current value,
 * Surawicz Part III). The learner's own data is what src/practice records and the Progress page draws: confidence on
 * lesson checks, full drills and the exam (not on the compact drills inside lessons), calibration bars against the ideal
 * 40/70/95 % (CONFIDENCE_EXPECTED), the "overconfident" warning (≥ 5 "sure" answers under 80 %), the critical-findings
 * tracker (secured = ≥ 3 attempts, last five ≥ 0.8, no missed-critical flag) and the Leitner queue (< 0.8 → box 1).
 * Real cases: 2084 (F16, sinus arrhythmia, 12SL 76/min), 10730 (F80, labelled LAFB, 12SL axis −39°: the
 * label-versus-criteria calibration example), 4078 (F69, sinus tachycardia ≈ 107/min, PACs), 17892 (F63, non-specific
 * ST–T), 18373 (F79, LAFB, axis −55°).
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const real = (id: number): EcgSource => ({ kind: 'real', id });
const STRIP = { layout: 'strip', lead: 'II' } as const;
const GRID = { layout: '3x4+1' } as const;

/** Which statement on a borderline real tracing has earned a 3? (PTB-XL 10730: label LAFB, 12SL axis −39°.) */
const borderlineAxis: Item = {
  id: 'x4:sure-statement-10730',
  family: 'axis-real',
  competency: 'C5',
  difficulty: 'borderline',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '真实病例：80 岁女性。I 与 aVL 高 R，II 以负向为主，III、aVF 深 S，QRS 约 94 ms。你只能给一句话打“信心 3”——选哪一句？',
    'A real case: an 80-year-old woman. Tall R in I and aVL, II mainly negative, deep S in III and aVF, QRS about 94 ms. You may give a confidence of 3 to one statement only — which one?',
    'Un caso real: mujer de 80 años. R alta en I y aVL, II predominantemente negativa, S profundas en III y aVF, QRS de unos 94 ms. Solo puedes dar confianza 3 a una afirmación: ¿a cuál?',
  ),
  ecg: real(10730),
  view: GRID,
  explanation: l(
    '电轴约 **−40°**（I 正、aVF 负、II 也是负向为主 → 超过 −30°；12SL 测得 −39°）。“电轴左偏约 −40°”是描述，量得出来，可以给 3。“左前分支阻滞”需要 **−45° 至 −90°**（Surawicz 2009），这里差一点——心脏科医师的标注写了 LAFB（旧标准“超过 −30°”就算），所以报告应写“电轴左偏约 −40°，按现行标准未达 LAFB”，对 LAFB 这一句只给 2：核对、复测、与旧图比较。“电轴正常”是错的：II 已经负向。**把信心挂在你量到的东西上，而不是挂在名字上。**',
    'The axis is about **−40°** (I positive, aVF negative, and II mainly negative too → beyond −30°; 12SL measured −39°). "Left axis deviation, about −40°" is a description you can measure — it earns a 3. "Left anterior fascicular block" needs **−45° to −90°** (Surawicz 2009), and this falls just short — the cardiologists\' label says LAFB (the older "beyond −30°" threshold), so the report should read "left axis deviation about −40°, LAFB criteria not met by current thresholds", with only a 2 on the LAFB line: check, re-measure, compare with old tracings. "Normal axis" is wrong: II is already negative. **Attach confidence to what you measured, not to a name.**',
    'El eje es de unos **−40°** (I positiva, aVF negativa y también II predominantemente negativa → más allá de −30°; el 12SL midió −39°). «Desviación izquierda del eje, de unos −40°» es una descripción que se puede medir: se gana un 3. «Bloqueo fascicular anterior izquierdo» exige **−45° a −90°** (Surawicz 2009), y aquí se queda justo corto; la etiqueta de los cardiólogos dice BFAI (con el umbral antiguo de «más allá de −30°»), así que el informe debe decir «desviación izquierda del eje de unos −40°, sin criterios actuales de BFAI», con solo un 2 en la línea del BFAI: comprobar, volver a medir y comparar con previos. «Eje normal» es erróneo: II ya es negativa. **Pon la confianza en lo que has medido, no en un nombre.**',
  ),
  findings: ['lad', 'lafb'],
  key: {
    options: [
      { id: 'lad', label: l('“电轴左偏，约 −40°”', '"Left axis deviation, about −40°"', '«Desviación izquierda del eje, de unos −40°»') },
      { id: 'lafb', label: l('“左前分支阻滞”', '"Left anterior fascicular block"', '«Bloqueo fascicular anterior izquierdo»') },
      { id: 'normal', label: l('“电轴正常”', '"Normal axis"', '«Eje normal»') },
    ],
    correct: 'lad',
  },
};

const lesson: Lesson = {
  id: 'x4',
  stage: 'X',
  order: 4,
  title: l('信心校准与个人错误回顾', 'Confidence calibration and personal error review', 'Calibración de la confianza y revisión de los propios errores'),
  summary: l(
    '最后一课不教新的判据，教的是知道自己不知道：信心 1–3 是行动阈值——3 敢独立行动、2 核对后行动、1 求助；校准 = 信心与准确率匹配，而个人错误台账按类型（没看见 / 命名错 / 紧急度错）把每次失误转成对弱项家族的再训练。',
    'The last lesson teaches no new criteria — it teaches knowing when you don\'t know: confidence 1–3 as action thresholds (3 act alone, 2 act after a check, 1 ask); calibration means confidence matching accuracy, and a personal error ledger turns every miss, logged by type (didn\'t see / misnamed / wrong urgency), into retraining of the weak family.',
    'La última lección no enseña criterios nuevos: enseña a saber cuándo no se sabe. La confianza 1-3 son umbrales de actuación (3 actuar solo, 2 actuar tras una comprobación, 1 pedir ayuda); calibrar es que la confianza coincida con la precisión, y un registro personal de errores convierte cada fallo, anotado por tipo (no visto / mal nombrado / urgencia equivocada), en reentrenamiento de la familia débil.',
  ),
  objectives: [
    l('把信心 1–3 用作行动阈值：独立行动 / 核对后行动 / 求助。', 'Use confidence 1–3 as action thresholds: act alone / act after a check / ask.', 'Usar la confianza 1-3 como umbrales de actuación: actuar solo / actuar tras una comprobación / pedir ayuda.'),
    l('解释为什么“漏掉关键发现 + 信心 3”是最坏格子，以及自动化偏差如何制造它。', 'Explain why a missed critical finding with confidence 3 is the worst cell, and how automation bias builds it.', 'Explicar por qué un hallazgo crítico perdido con confianza 3 es la casilla peor y cómo la crea el sesgo de automatización.'),
    l('按类型记录个人错误（没看见 / 命名错 / 紧急度错），并据此选择再训练的家族。', 'Log personal errors by type (didn\'t see / misnamed / wrong urgency) and choose the retraining family from the type.', 'Anotar los errores propios por tipo (no visto / mal nombrado / urgencia equivocada) y elegir con ese tipo la familia que hay que reentrenar.'),
    l('对一例经典的左前分支阻滞误读做“尸检”，定位错误发生在固定顺序的哪一步。', 'Autopsy a classic misread of left anterior fascicular block and locate the step of the fixed order where it happened.', 'Realizar la «autopsia» de una lectura errónea clásica de un bloqueo fascicular anterior izquierdo y localizar en qué paso del orden fijo ocurrió.'),
  ],
  minutes: 14,
  competencies: ['C11'],
  findings: ['sinus-tachycardia', 'lafb', 'nonspecific-st-t'],
  blocks: [
    {
      kind: 'hook',
      ecg: real(2084),
      view: GRID,
      question: l(
        '门诊筛查：16 岁女孩，无症状。你自己量了心率——约 75 次/分，随呼吸略有快慢——把 x1 的十步走完之后，你倾向于“这份图没有异常”。先写下报告；然后在往下翻之前回答最后一个问题：对这个“正常”，你的信心是 1、2 还是 3？',
        'Clinic screening: a 16-year-old girl, asymptomatic. You measured the rate yourself — about 75/min, speeding and slowing a little with breathing — and after walking the ten steps from x1 you lean towards "nothing wrong on this tracing". Write the report; then, before scrolling, answer one last question: how sure are you of that "normal" — 1, 2 or 3?',
        'Cribado en consulta: una chica de 16 años, asintomática. Has medido tú la frecuencia —unas 75 lpm, que se acelera y se frena un poco con la respiración— y tras recorrer los diez pasos de x1 te inclinas por «nada anormal en este ECG». Escribe el informe; y antes de continuar responde a una última pregunta: ¿cuánta confianza le das a ese «normal», 1, 2 o 3?',
      ),
      reveal: l(
        '无论你选了哪个数字——**从现在起这个数字是数据**。这门课的每次作答都可以附一个信心评分：1 = 猜测，2 = 比较有把握，3 = 有把握；**校准 = 信心与准确率随时间的匹配**。这份图确实正常（16 岁的呼吸性窦性心律不齐是正常现象，s3），而且患病率站在你这边（x2）。真正的问题在后面：给这份图打 3 的读者，往往也会给下一份 −60° 电轴的图打 3——**数字只有会动才有意义**。',
        'Whichever number you picked — **from now on that number is data**. Every answer in this course can carry a confidence rating: 1 = a guess, 2 = fairly sure, 3 = sure; **calibration = confidence matching accuracy over time**. This tracing is indeed normal (respiratory sinus arrhythmia at 16 is a normal finding, s3), and prevalence is on your side (x2). The real problem comes next: readers who rate this one a 3 often rate the next tracing, the one with a −60° axis, a 3 too — **a number only means something if it moves**.',
        'Sea cual sea el número que hayas elegido: **a partir de ahora ese número es un dato**. Cada respuesta de este curso puede llevar una puntuación de confianza: 1 = una suposición, 2 = bastante seguro, 3 = seguro; **calibrar = que la confianza coincida con la precisión a lo largo del tiempo**. Este ECG es, en efecto, normal (la arritmia sinusal respiratoria a los 16 años es normal, s3) y la prevalencia juega a tu favor (x2). El problema de verdad viene después: quien puntúa esto con un 3 suele puntuar también con un 3 el siguiente ECG, el del eje de −60° — **un número solo significa algo si se mueve**.',
      ),
    },
    {
      kind: 'text',
      title: l('三级信心，各自意味着什么', 'The three levels and what each should mean', 'Los tres niveles y qué significa cada uno'),
      body: l(
        '信心不是一个笼统的感觉，而是**行动阈值**：\n- **3 · 敢独立行动**：不看其他材料，我就在这份报告上签字，并按它行动。3 只留给“错了我会惊讶”的答案。\n- **2 · 核对后行动**：方向有了，但落笔之前要对照旧图、自己复测，或请第二位读者看一眼。\n- **1 · 需要求助**：这份图超出我今天的水平——把**问题具体化**（“电轴我不会分型”），然后上交，而不是笼统地说“不太确定”。\n信心是对**自己准确率的预测**，不是对努力的奖励。长期看：标 3 的答案几乎都该对；标 1 的答案常错——这没有关系，只要它们真的被核对或上交了。',
        'Confidence is not a vague feeling — it is an **action threshold**:\n- **3 · would act alone**: with no further material I would sign this report and act on it. Reserve 3 for answers whose being wrong would surprise you.\n- **2 · would act after a check**: I have the direction, but before committing I would compare with old tracings, re-measure myself, or have a second reader glance at it.\n- **1 · would ask**: this tracing is beyond me today — name the **specific** problem ("I cannot categorise this axis") and hand it over, rather than a vague "not sure".\nConfidence is a **prediction about your own accuracy**, not a reward for effort. Over time: answers marked 3 should nearly all be right; answers marked 1 will often be wrong — that is fine, provided they really do get checked or escalated.',
        'La confianza no es una sensación vaga: es un **umbral de actuación**:\n- **3 · actuaría solo**: sin más material, firmaría este informe y actuaría en consecuencia. Reserva el 3 para las respuestas cuyo error te sorprendería.\n- **2 · actuaría tras una comprobación**: tengo la orientación, pero antes de firmar compararía con ECG previos, volvería a medir yo mismo o pediría una segunda opinión.\n- **1 · pediría ayuda**: este ECG está hoy por encima de mi nivel — formula el **problema concreto** («no sé clasificar este eje») y pásalo, en lugar de un vago «no estoy seguro».\nLa confianza es una **predicción sobre la propia precisión**, no una recompensa al esfuerzo. Con el tiempo: las respuestas marcadas con 3 deberían ser casi todas correctas; las marcadas con 1 serán a menudo erróneas — y no pasa nada, siempre que de verdad se comprueben o se escalen.',
      ),
    },
    {
      kind: 'criteria',
      title: l('信心校准卡', 'The confidence-calibration card', 'La tarjeta de calibración de la confianza'),
      items: [
        {
          label: l('信心 3', 'Confidence 3', 'Confianza 3'),
          value: l('敢独立行动：签署并按此行动；“错了我会惊讶”', 'Would act alone: sign and act on it; "being wrong would surprise me"', 'Actuaría solo: firmaría y actuaría en consecuencia; «me sorprendería equivocarme»'),
        },
        {
          label: l('信心 2', 'Confidence 2', 'Confianza 2'),
          value: l('核对后行动：对照旧图、自己复测或第二位读者', 'Would act after a check: old tracings, own re-measurement or a second reader', 'Actuaría tras una comprobación: ECG previos, volver a medir uno mismo o un segundo lector'),
        },
        {
          label: l('信心 1', 'Confidence 1', 'Confianza 1'),
          value: l('求助：问题具体化后上交，而不是笼统的“不确定”', 'Would ask: hand it over with the specific question, not a vague "unsure"', 'Pediría ayuda: escalar con la pregunta concreta, no con un vago «no estoy seguro»'),
        },
        {
          label: l('校准', 'Calibration', 'Calibración'),
          value: l('信心与准确率随时间的匹配；好校准 = 错误集中在低信心区', 'Confidence matching accuracy over time; good calibration keeps the errors in the low-confidence zone', 'La confianza coincide con la precisión a lo largo del tiempo; una buena calibración concentra los errores en la zona de confianza baja'),
        },
        {
          label: l('最坏格子', 'The worst cell', 'La casilla peor'),
          value: l('关键发现漏掉 + 信心 3：没人复核，因为你自己就是“确认者”', 'A missed critical finding + confidence 3: nobody checks it, because you were the confirmer', 'Un hallazgo crítico perdido + confianza 3: nadie lo revisa, porque el que confirmaba eras tú'),
        },
        {
          label: l('错误三型', 'The three error types', 'Los tres tipos de error'),
          value: l('没看见 / 看见了但命名错 / 命名对了但紧急度错', 'Didn\'t see / saw but misnamed / named it but wrong urgency', 'No visto / visto pero mal nombrado / bien nombrado pero con urgencia equivocada'),
        },
      ],
      source:
        'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192',
    },
    {
      kind: 'text',
      title: l('过度自信致命，自信不足淹没系统', 'Over-confidence kills; under-confidence floods the system', 'El exceso de confianza mata; el defecto ahoga el sistema'),
      body: l(
        '- **过度自信在关键发现上致命**：漏掉进行中的闭塞还标 3，就是最坏格子——没有复核，因为你自己就是签署人。机器会推你一把：自动判读必须始终由有资质的读者复核，其错误集中在节律（伪差被判为房颤、起搏节律），也不能可靠识别电极接反——**照签机器报告，等于把自动化偏差写进病历**。\n- **自信不足同样有代价**：每份图都“不确定，请上级看”，第二位读者就成了瓶颈，紧急度信息消失，真正的“现在处理”淹没在噪声里。\n- 校准的正中位置是：**有把握处给 3，没把握处给 1，并且不确定要说得具体**——“电轴我不确定”可以训练，“我什么都不太确定”不能。',
        '- **Over-confidence kills at critical findings**: a missed ongoing occlusion rated 3 is the worst cell — there is no check, because you were the signer. The machine gives you a push: the automated statement must always be confirmed by a qualified reader; its errors cluster in rhythm (artefact called AF, pacemaker rhythms) and it does not recognise electrode reversals reliably — **signing the machine\'s statement unread writes automation bias straight into the record**.\n- **Under-confidence has a price too**: if every tracing is "not sure, someone senior please", the second reader becomes the bottleneck, urgency information disappears, and the genuine act-now cases drown in the noise.\n- The calibrated middle: **3 where you are sure, 1 where you are not — and the uncertainty must be specific**. "I\'m unsure about the axis" can be trained; "I\'m unsure about everything" cannot.',
        '- **El exceso de confianza mata en los hallazgos críticos**: una oclusión en curso pasada por alto y puntuada con 3 es la casilla peor — no hay revisión posible, porque el que firmaba eras tú. La máquina empuja en esa dirección: la interpretación automática debe confirmarla siempre un lector cualificado; sus errores se concentran en el ritmo (artefacto llamado FA, ritmos con marcapasos) y no reconoce con fiabilidad las inversiones de electrodos — **firmar el informe de la máquina sin revisarlo es escribir el sesgo de automatización en la historia clínica**.\n- **El defecto de confianza también cuesta**: si cada ECG es un «no estoy seguro, que lo vea alguien superior», el segundo lector se convierte en el cuello de botella, la información de urgencia desaparece y los verdaderos casos de actuar ya se ahogan en el ruido.\n- El punto medio calibrado: **3 donde estás seguro, 1 donde no lo estás, y la incertidumbre debe ser concreta**. «No estoy seguro del eje» se puede entrenar; «no estoy seguro de nada» no.',
      ),
    },
    {
      kind: 'worked',
      title: l('错误尸检：−60° 的电轴被叫成“正常变异”', 'Error autopsy: an axis of −60° called a "normal variant"', 'Autopsia del error: un eje de −60° llamado «variante normal»'),
      ecg: synth('lafb', 1861, { axis: -60 }),
      view: GRID,
      steps: [
        {
          title: l('尸检报告', 'The autopsy report', 'El informe de la autopsia'),
          body: l(
            '读者的报告只有一行：“电轴偏左，老年常见，正常变异”，信心 3。纸上的事实：电轴约 **−60°**（I、aVL 正向，II、III、aVF 深负向），aVL 呈 **qR**，II、III、aVF 呈 rS，QRS < 120 ms——**左前分支阻滞**，不是变异。',
            'The reader\'s report was one line: "leftward axis, common in the old, normal variant", confidence 3. The facts on the paper: axis about **−60°** (positive in I and aVL, deeply negative in II, III and aVF), **qR in aVL**, rS in II, III and aVF, QRS < 120 ms — **left anterior fascicular block**, not a variant.',
            'El informe del lector era una línea: «eje izquierdo, frecuente en ancianos, variante normal», confianza 3. Los hechos en el papel: eje de unos **−60°** (positivo en I y aVL, profundamente negativo en II, III y aVF), **qR en aVL**, rS en II, III y aVF, QRS < 120 ms: **bloqueo fascicular anterior izquierdo**, no una variante.',
          ),
          marks: [{ auto: 'qrs', lead: 'aVL', label: l('aVL 呈 qR', 'qR in aVL', 'qR en aVL') }],
          highlightLeads: ['I', 'aVL', 'II', 'III', 'aVF'],
        },
        {
          title: l('错误发生在哪一步？', 'At which step did it happen?', '¿En qué paso ocurrió?'),
          body: l(
            'x1 的固定顺序里，电轴是**第 5 步**——这一步怎么断的，只有两种可能：\n- **从没测过**：看完节律和形态就停笔，电轴栏是空的（流程缺口）；\n- **测出了 −60°，但不认识**：知道“偏左”，不知道 −45° 至 −90° 加 aVL 呈 qR、QRS < 120 ms 就是左前分支阻滞（知识缺口）。\n尸检要回答的正是这个：**断在哪一步，处方就开给哪一步**。',
            'In the fixed order from x1, the axis is **step 5** — and it can break in only two ways:\n- **never measured**: the rhythm and morphology were read, the pen went down, the axis line stayed empty (a process gap);\n- **measured −60° but not recognised**: the reader knew "leftward" but not that −45° to −90° with qR in aVL and QRS < 120 ms is left anterior fascicular block (a knowledge gap).\nThat is what the autopsy answers: **the step where it broke is the step the prescription is written for**.',
            'En el orden fijo de x1, el eje es el **paso 5**, y solo puede romperse de dos maneras:\n- **nunca medido**: se leyeron el ritmo y la morfología, se bajó el boli y la línea del eje quedó vacía (fallo de proceso);\n- **medido a −60° pero no reconocido**: el lector sabía que era «izquierdo», pero no que −45° a −90° con qR en aVL y QRS < 120 ms es un bloqueo fascicular anterior izquierdo (fallo de conocimiento).\nEso es lo que responde la autopsia: **el paso donde se rompió es el paso para el que se escribe la receta**.',
          ),
          highlightLeads: ['I', 'II', 'III'],
        },
        {
          title: l('按类型归档', 'File it by type', 'Archívalo por tipo'),
          body: l(
            '三种类型，三种处方：\n- **没看见** → 流程问题：重练固定顺序与十秒流程（x1、x3），让电轴永远被走到；\n- **看见了但命名错** → 知识问题：本例最可能就是它——回去重练电轴分型与分支阻滞的判据卡；\n- **命名对了但紧急度错** → 分诊问题：LAFB 被报成“现在处理”或三度阻滞被报成“常规”，重练 x3 的箱子。\n当时标的信心 3 是第二份证据：**你不知道自己不知道**——这正是台账要抓的缺口。',
            'Three types, three prescriptions:\n- **didn\'t see** → a process problem: retrain the fixed order and the ten-second routine (x1, x3) so the axis is always walked;\n- **saw but misnamed** → a knowledge problem: the likeliest file for this case — go back to the axis-category and fascicular-block criteria cards;\n- **named it but wrong urgency** → a triage problem: LAFB reported as "act now", or complete block as "routine" — retrain the bins from x3.\nThe confidence 3 given at the time is the second piece of evidence: **you did not know that you did not know** — exactly the gap the ledger exists to catch.',
            'Tres tipos, tres recetas:\n- **no visto** → problema de proceso: reentrenar el orden fijo y la rutina de diez segundos (x1, x3) para que el eje siempre se mida;\n- **visto pero mal nombrado** → problema de conocimiento: lo más probable en este caso; vuelve a las tarjetas de criterios de las categorías del eje y de los bloqueos fasciculares;\n- **bien nombrado pero con urgencia equivocada** → problema de triaje: un BFAI informado como «actuar ya» o un bloqueo completo como «rutina»; reentrenar las categorías de x3.\nLa confianza 3 de entonces es la segunda prueba: **no sabías que no sabías** — justo el hueco que el registro existe para cazar.',
          ),
        },
        {
          title: l('开出处方', 'Write the prescription', 'Escribe la receta'),
          body: l(
            '处方不是“下次小心”。处方是：**记一行账**（日期、这份图、漏了 LAFB、类型=命名错、当时信心 3），然后**再训练那个家族**——间隔复习会按发现与家族出卡，把电轴分型和分支阻滞重新推到你面前，直到命中。四周后重测同一家族：分数回来了，校准才算修好。',
            'The prescription is not "be more careful next time". It is: **one ledger line** (date, this tracing, missed LAFB, type = misnamed, confidence at the time = 3), then **retrain that family** — spaced review deals cards by finding and by family, and will push axis categories and fascicular blocks back in front of you until they hit. Re-test the same family a month later: the score comes back, and only then is the calibration fixed.',
            'La receta no es «la próxima vez, más cuidado». Es: **una línea en el registro** (fecha, este ECG, BFAI perdido, tipo = mal nombrado, confianza de entonces = 3) y después **reentrenar esa familia**: la repetición espaciada reparte tarjetas por hallazgo y por familia, y volverá a ponerte delante las categorías del eje y los bloqueos fasciculares hasta que aciertes. Repite la familia un mes después: cuando la nota vuelva, la calibración estará arreglada.',
          ),
        },
      ],
    },
    {
      kind: 'criteria',
      title: l('尸检用的判据：左前分支阻滞', 'The criteria the autopsy runs on: left anterior fascicular block', 'Los criterios de la autopsia: bloqueo fascicular anterior izquierdo'),
      items: [
        {
          label: l('额面 QRS 电轴', 'Frontal QRS axis', 'Eje frontal del QRS'),
          value: l('−45° 至 −90°（−30° 至 −45° 只是中度左偏，不足以诊断）', '−45° to −90° (−30° to −45° is only moderate LAD — not enough for the diagnosis)', '−45° a −90° (de −30° a −45° es solo una desviación izquierda moderada, insuficiente para el diagnóstico)'),
        },
        { label: l('aVL 形态', 'Morphology in aVL', 'Morfología en aVL'), value: l('qR', 'qR', 'qR') },
        { label: l('aVL R 波峰时间', 'R-wave peak time in aVL', 'Tiempo hasta la cúspide de R en aVL'), value: l('≥ 45 ms', '≥ 45 ms', '≥ 45 ms') },
        { label: l('QRS 时限', 'QRS duration', 'Duración del QRS'), value: l('< 120 ms', '< 120 ms', '< 120 ms') },
        {
          label: l('支持表现', 'Supporting finding', 'Hallazgo de apoyo'),
          value: l('II、III、aVF 呈 rS（由电轴推导而来）', 'rS in II, III and aVF (follows from the axis)', 'rS en II, III y aVF (se deduce del eje)'),
        },
      ],
      source: 'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240',
    },
    {
      kind: 'text',
      title: l('个人错误台账', 'The personal error ledger', 'El registro personal de errores'),
      body: l(
        '校准的修复工具是一个本子，不是一种心情。每次失误记**一行**：日期、哪份图、漏了什么、当时的信心、**类型**。\n- 类型决定处方：没看见 → 流程（固定顺序、十秒流程）；命名错 → 知识（对应的判据卡）；紧急度错 → 分诊（x3 的箱子）。\n- 本课程的间隔复习按**发现**和**家族**出卡——把弱项家族重新练起来，而不是笼统地“多读图”。\n- 信心一栏是校准数据：错 + 3 是危险组合（你不知道自己不知道），错 + 1 是正常学习。**“下次小心”不是计划；再训练弱项家族才是。**',
        'The repair tool for calibration is a notebook, not a mood. One **line** per miss: date, which tracing, what was missed, the confidence at the time, the **type**.\n- The type sets the prescription: didn\'t see → process (the fixed order, the ten-second routine); misnamed → knowledge (the matching criteria card); wrong urgency → triage (the bins from x3).\n- Spaced review in this course deals cards **by finding and by family** — put the weak family back into rotation instead of a vague "read more ECGs".\n- The confidence column is your calibration data: wrong + 3 is the dangerous combination (you did not know that you did not know); wrong + 1 is normal learning. **"Being careful next time" is not a plan; retraining the weak family is.**',
        'La herramienta para reparar la calibración es una libreta, no un estado de ánimo. Una **línea** por cada fallo: fecha, qué ECG, qué se perdió, la confianza de aquel momento y el **tipo**.\n- El tipo fija la receta: no visto → proceso (el orden fijo, la rutina de diez segundos); mal nombrado → conocimiento (la tarjeta de criterios correspondiente); urgencia equivocada → triaje (las categorías de x3).\n- La repetición espaciada de este curso reparte tarjetas **por hallazgo y por familia**: vuelve a rotar la familia débil en lugar de un vago «leer más ECG».\n- La columna de confianza son tus datos de calibración: error + 3 es la combinación peligrosa (no sabías que no sabías); error + 1 es aprendizaje normal. **«La próxima vez, más cuidado» no es un plan; reentrenar la familia débil sí lo es.**',
      ),
    },
    {
      kind: 'text',
      title: l('你自己的数据：进度页', 'Your own data: the Progress page', 'Tus propios datos: la página de Progreso'),
      body: l(
        '台账的一半已经由本应用替你记下。每道题都会记录：得分、日期、训练的发现、你选的信心，以及是否**漏掉了危急表现**。\n- **哪里会问信心**：课程里的每道检测题、练习页的完整训练、考试。课程内嵌的小训练不问——在那里，把信心说出口或写在纸上。\n- **信心校准图**：每个信心档一根柱子（你的实际正确率）和一条横线（理想值：猜测约 40%、比较确定约 70%、非常确定约 95%）。“非常确定”的柱子低于横线 = 过度自信；当你已有至少 5 次“非常确定”且正确率低于 80%，页面会直接提醒你。“猜的”柱子远高于 40% = 自信不足。\n- **危急表现追踪**：每个“不能漏诊”的表现，要至少练过 3 次、最近 5 次都 ≥80% 且没有漏诊标记，才算“已掌握”。漏掉危急表现的那一次（报告、找发现、闭塞判断、分诊题）会打上标记。\n- **复习队列**：任何一题低于 80%，它训练的发现（或家族）就进入第 1 盒，第二天到期；按时答对一次升一盒（1、2、4、8、16 天）。这就是“再训练弱项家族”的自动版。\n- 两张图要**一起读**：应用不会替你画出“漏诊 + 非常确定”那一格。看哪些危急表现还停在“学习中”，同时你的“非常确定”柱子偏低——那一行，就写进你的台账。',
        'Half of the ledger is already being kept for you by the app. Every answered item records the score, the date, the findings it trains, the confidence you chose, and whether you **missed a critical finding**.\n- **Where confidence is asked**: every check in a lesson, the full drills on the Practice page, and the exam. The short drills embedded in lessons do not ask — there, say your confidence out loud or write it down.\n- **The calibration chart**: one bar per confidence level (your actual accuracy) and one line (the ideal: about 40 % for "Guess", 70 % for "Fairly sure", 95 % for "Sure"). A "Sure" bar below its line means overconfidence; once you have at least five "Sure" answers with accuracy under 80 %, the page warns you outright. A "Guess" bar far above 40 % means underconfidence.\n- **The critical-findings tracker**: each can\'t-miss finding counts as "Secured" only after at least 3 attempts with the last five all ≥ 80 % and no missed-critical flag. The attempt where a critical finding was missed (report, findings, occlusion or triage items) carries the flag.\n- **The review queue**: any item under 80 % puts the finding it trains (or its family) into box 1, due the next day; each on-time pass moves it up a box (1, 2, 4, 8, 16 days). That is "retrain the weak family" done automatically.\n- Read the two panels **together**: the app does not draw the "missed critical + Sure" cell for you. Look for critical findings still marked "Learning" while your "Sure" bar sits low — that line goes into your ledger.',
        'La mitad del registro ya te la lleva la aplicación. Cada ejercicio contestado guarda la puntuación, la fecha, los hallazgos que entrena, la confianza elegida y si **se omitió un hallazgo crítico**.\n- **Dónde se pide la confianza**: en cada comprobación de una lección, en los entrenamientos completos de la página de Práctica y en el examen. Los entrenamientos cortos dentro de las lecciones no la piden: ahí, di tu confianza en voz alta o escríbela.\n- **El gráfico de calibración**: una barra por nivel de confianza (tu acierto real) y una línea (el ideal: en torno al 40 % para «Lo adivino», 70 % para «Bastante seguro» y 95 % para «Seguro»). Una barra de «Seguro» por debajo de su línea es exceso de confianza; en cuanto tengas al menos cinco respuestas «Seguro» con un acierto inferior al 80 %, la página te avisa directamente. Una barra de «Lo adivino» muy por encima del 40 % es defecto de confianza.\n- **El seguimiento de hallazgos críticos**: cada hallazgo que no se puede pasar por alto solo cuenta como «Dominado» tras al menos 3 intentos, con los cinco últimos ≥ 80 % y sin marca de omisión crítica. El intento en que se omitió un hallazgo crítico (ejercicios de informe, hallazgos, oclusión o triaje) lleva la marca.\n- **La cola de repaso**: cualquier ejercicio por debajo del 80 % pone el hallazgo que entrena (o su familia) en la caja 1, para el día siguiente; cada acierto a tiempo lo sube una caja (1, 2, 4, 8, 16 días). Es el «reentrenar la familia débil» hecho de forma automática.\n- Lee los dos paneles **juntos**: la aplicación no dibuja por ti la casilla «crítico omitido + Seguro». Busca los hallazgos críticos que siguen en «Aprendiendo» mientras tu barra de «Seguro» está baja: esa línea va a tu registro.',
      ),
    },
    {
      kind: 'contrast',
      title: l('同样是信心 3，两边的代价不同', 'Same confidence 3, different costs on each side', 'La misma confianza 3, costes distintos a cada lado'),
      view: GRID,
      left: {
        ecg: synth('normal', 1862),
        caption: l('门诊大多数图：风险是过度诊断', 'Most clinic tracings: the risk is over-calling', 'La mayoría de los ECG de consulta: el riesgo es sobrediagnosticar'),
      },
      right: {
        ecg: synth('lafb', 1863, { axis: -75 }),
        caption: l('同一条街的另一边：风险是漏掉分支阻滞', 'The other side of the same street: the risk is missing the fascicular block', 'La otra acera de la misma calle: el riesgo es pasar por alto el bloqueo fascicular'),
      },
      point: l(
        '最坏格子相同——**错 + 有把握**——方向相反。左边给 3 的过度诊断，会把一个健康人送进不必要的检查与焦虑（x2 患者们付的账）；右边给 3 的“正常变异”，会把传导疾病藏进病历。**两边的 3 都要挣来，但挣法不同**：左边靠把十步走完，右边靠亲自动手量电轴。同一格自信，左边几乎总是对的，右边只有测过才对——这正是校准要分辨的事。',
        'The worst cell is the same — **wrong + confident** — with opposite directions. A confident over-call on the left sends a healthy person into needless tests and anxiety (the bill x2\'s patients paid); a confident "normal variant" on the right files conduction disease away in the record. **The 3 has to be earned on both sides, but differently**: on the left, by walking all ten steps; on the right, by measuring the axis yourself. The same confidence is almost always right on the left and right only after measuring — and telling those apart is exactly what calibration is.',
        'La casilla peor es la misma — **error + confianza** — con direcciones opuestas. Un sobrediagnóstico confiado a la izquierda manda a una persona sana a pruebas y ansiedad innecesarias (la factura que pagaron los pacientes de x2); un «variante normal» confiado a la derecha archiva una enfermedad de conducción en la historia clínica. **El 3 hay que ganárselo en ambos lados, pero de forma distinta**: a la izquierda, recorriendo los diez pasos; a la derecha, midiendo tú mismo el eje. La misma confianza casi siempre acierta a la izquierda y solo acierta a la derecha después de medir — y distinguirlo es justo lo que es la calibración.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('sinus-tachycardia', 1864, { rate: 125 }),
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'rr' }],
      caption: l(
        '信心挂在**陈述**上，不挂在整份图上。“窦性心动过速，约 125 次/分，规则”可以是 3；“**为什么**快”从单份图上最多是 2——原因在患者身上，不在纸上。下面真实病例 4078（69 岁女性，约 107 次/分，夹有房性早搏）正是这个形状：节律本身可以放心命名，而“为什么”在你见到患者之前只配 1–2。会拆分信心的读者，报告既敢写又不过度。接下来的检测题会请你选信心档（它们会进入你的校准图）；在小训练与真实病例里，自己说出或写下信心——**每答一题都有意识地选一个信心档**，这个习惯就是本课的全部。',
        'Confidence attaches to **statements**, not to whole tracings. "Sinus tachycardia, about 125/min, regular" can be a 3; "**why** it is fast" is at best a 2 from a single tracing — the cause lives in the patient, not on the paper. Real case 4078 below (a 69-year-old woman, about 107/min with PACs) is exactly this shape: the rhythm itself can be named with confidence, while the "why" earns a 1–2 until you see the patient. A reader who splits confidence this way writes reports that are both bold and honest. The checks that follow ask for a confidence level (it goes into your calibration chart); in the short drill and the real cases, say or write it yourself — **choose a level deliberately on every single answer**: that habit is the whole lesson.',
        'La confianza se asigna a **afirmaciones**, no a ECG enteros. «Taquicardia sinusal, unas 125 lpm, regular» puede ser un 3; «**por qué** es rápida» es como mucho un 2 desde un solo ECG: la causa está en el paciente, no en el papel. El caso real 4078 de abajo (mujer de 69 años, unas 107 lpm con extrasístoles auriculares) tiene exactamente esta forma: al ritmo se le puede dar nombre con confianza, mientras que el «por qué» merece un 1-2 hasta que veas al paciente. Quien divide así la confianza escribe informes a la vez valientes y honestos. Las comprobaciones que siguen te piden un nivel de confianza (entra en tu gráfico de calibración); en el entrenamiento corto y en los casos reales, dilo o escríbelo tú: **elige un nivel de forma deliberada en cada respuesta**; ese hábito es toda la lección.',
      ),
    },
    { kind: 'check', item: { inline: borderlineAxis } },
    { kind: 'check', item: { family: 'triage', seed: 12 } },
    { kind: 'check', item: { family: 'findings', seed: 7 } },
    { kind: 'drill', families: ['triage', 'spot'], count: 10, passScore: 0.8 },
    {
      kind: 'real',
      ids: [4078, 17892, 18373],
      caption: l(
        '三份真实心电图：69 岁女性、63 岁女性、79 岁女性各一份——加上开头的 16 岁女孩（2084）和电轴 −40° 的那位 80 岁女性（10730），你的五行校准数据就齐了。**每份先写报告，再给每一句单独打信心 1–3，然后才揭晓**。第三份请特别量一量电轴，并和 10730 比较：哪一份达到了左前分支阻滞的标准？揭晓后对照命中与失误，把每一处失误按类型记下（没看见 / 命名错 / 紧急度错）：那几行就是你台账的开头，也是这门课留给你的家庭作业。',
        'Three real ECGs — a 69-year-old woman, a 63-year-old woman and a 79-year-old woman; with the 16-year-old girl from the hook (2084) and the 80-year-old woman with the −40° axis (10730), that makes five rows of calibration data. **Write the report on each, rate your confidence 1–3 on every statement, and only then reveal.** In the third, measure the axis with particular care and compare it with 10730: which of the two meets the criteria for left anterior fascicular block? Afterwards compare hits and misses, and log every miss by type (didn\'t see / misnamed / wrong urgency): those lines are the start of your ledger, and this course\'s homework.',
        'Tres ECG reales —una mujer de 69 años, una de 63 y una de 79—; con la chica de 16 años del inicio (2084) y la mujer de 80 años con el eje a −40° (10730) suman cinco filas de datos de calibración. **Escribe el informe de cada uno, puntúa tu confianza 1-3 en cada afirmación y solo entonces mira la solución.** En el tercero, mide el eje con especial cuidado y compáralo con el 10730: ¿cuál de los dos cumple los criterios de bloqueo fascicular anterior izquierdo? Después compara aciertos y fallos y anota cada fallo por tipo (no visto / mal nombrado / urgencia equivocada): esas líneas son el comienzo de tu registro y la tarea pendiente que te deja este curso.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('信心 3 当默认值：3 只留给“错了我会惊讶”的答案——一律标 3 等于没有校准。', 'Confidence 3 as the default: 3 is for answers whose being wrong would surprise you — a flat 3 is no calibration at all.', 'La confianza 3 como valor por defecto: el 3 es para las respuestas cuyo error te sorprendería; un 3 uniforme no es calibración.'),
        l('错误台账从未开始：失误只留在记忆里，四周后同样的错误再来一遍。', 'The ledger never started: the misses stay in memory, and four weeks later the same error repeats.', 'El registro nunca se empieza: los fallos quedan en la memoria y un mes después el mismo error se repite.'),
        l('失误记录不标类型：“读错了一张图”开不出处方——没看见、命名错、紧急度错的训练完全不同。', 'Misses logged without a type: "misread one tracing" supports no prescription — didn\'t-see, misnamed and wrong-urgency train completely differently.', 'Fallos anotados sin tipo: «leí mal un ECG» no permite receta — no visto, mal nombrado y urgencia equivocada se entrenan de forma muy distinta.'),
        l('校准只测一次：信心会漂移（疲劳、连错、连胜之后），隔一段时间要重新对表。', 'Calibration measured once: confidence drifts (fatigue, after a run of errors or of wins) — re-check the table from time to time.', 'Calibrar una sola vez: la confianza deriva (cansancio, tras una racha de errores o de aciertos); vuelve a comprobar la tabla de vez en cuando.'),
        l('“下次小心”当计划：小心是情绪不是训练——再训练弱项家族、重测，才叫计划。', '"Being careful" as the plan: care is a mood, not training — retraining the weak family and re-testing, that is a plan.', '«La próxima vez, más cuidado» como plan: el cuidado es un ánimo, no un entrenamiento; reentrenar la familia débil y volver a evaluarla, eso sí es un plan.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('信心 1–3 是行动阈值：3 = 敢独立行动，2 = 核对后行动，1 = 求助——它是对自己准确率的预测。', 'Confidence 1–3 are action thresholds: 3 = would act alone, 2 = would act after a check, 1 = would ask — a prediction about your own accuracy.', 'La confianza 1-3 son umbrales de actuación: 3 = actuaría solo, 2 = actuaría tras una comprobación, 1 = pediría ayuda; es una predicción sobre la propia precisión.'),
        l('校准 = 信心与准确率匹配；最坏格子是关键发现漏掉 + 信心 3，而照签机器报告（自动化偏差）是它最常见的入口。', 'Calibration = confidence matching accuracy; the worst cell is a missed critical finding + confidence 3, and signing the machine statement unread (automation bias) is its commonest door.', 'Calibración = la confianza coincide con la precisión; la casilla peor es un hallazgo crítico perdido + confianza 3, y firmar sin revisar la lectura automática (sesgo de automatización) es su puerta más frecuente.'),
        l('每次失误按类型记账——没看见 / 命名错 / 紧急度错——类型决定再训练的家族，“下次小心”不算计划。', 'Log every miss by type — didn\'t see / misnamed / wrong urgency — the type picks the family to retrain; "be careful next time" is not a plan.', 'Anota cada fallo por tipo — no visto / mal nombrado / urgencia equivocada —: el tipo elige la familia que hay que reentrenar; «más cuidado la próxima vez» no es un plan.'),
        l('LAFB 尸检的教训：−45° 至 −90° + aVL 呈 qR、QRS < 120 ms 不是“正常变异”——错误发生在电轴那一步，处方也开给那一步。', 'The LAFB autopsy lesson: −45° to −90° with qR in aVL and QRS < 120 ms is not a "normal variant" — the error happened at the axis step, and the prescription is written for that step.', 'La lección de la autopsia del BFAI: −45° a −90° con qR en aVL y QRS < 120 ms no es una «variante normal»; el error ocurrió en el paso del eje, y para ese paso se escribe la receta.'),
        l('信心挂在陈述上，不挂在整份图上：“窦性心动过速”可以是 3，“为什么快”只配 1–2。', 'Confidence attaches to statements, not whole tracings: "sinus tachycardia" can be a 3, "why it is fast" earns a 1–2.', 'La confianza se asigna a las afirmaciones, no al ECG entero: «taquicardia sinusal» puede ser un 3; «por qué es rápida» merece un 1-2.'),
      ],
    },
  ],
  sources: [
    'Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    'Castellano et al. 2004',
  ],
};

export default lesson;
