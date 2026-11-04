/**
 * X4 — Confidence calibration and personal error review (docs/PLAN.md §3, stage X).
 * The metacognition lesson: the three confidence levels (1 guess … 3 sure, Grade.confidence in src/practice/api.ts)
 * taught as action thresholds; overreading the machine statement per the "Computer interpretation — Overreading"
 * bullet of docs/curriculum/criteria.md (Schläpfer/Wellens); the error autopsy uses criteria.md `lafb` (current value,
 * Surawicz Part III). The learner's own data is what src/practice records and the Progress page draws: confidence on
 * exam answers only (lesson checks and drills do not ask; there the learner rates it mentally), calibration bars against the ideal
 * 40/70/95 % (CONFIDENCE_EXPECTED), the "overconfident" warning (≥ 5 "sure" answers, < 80 % of them right), the critical-findings
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

/** The autopsy tracing (LAFB, −60°): the worked example, the axis calculator and the "misnamed" frame. */
const AUTOPSY = synth('lafb', 1861, { axis: -60 });
/** One sinus tachycardia, read statement by statement. */
const FAST = synth('sinus-tachycardia', 1864, { rate: 125 });

/** Which statement on a borderline real tracing has earned a 3? (PTB-XL 10730: label LAFB, 12SL axis −39°.) */
const borderlineAxis: Item = {
  id: 'x4:sure-statement-10730',
  family: 'axis-real',
  competency: 'C5',
  difficulty: 'borderline',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '真实病例：80 岁女性。QRS 在 I 与 aVL 以正向为主，在 II、III、aVF 以负向为主，QRS 约 94 ms。你只能给一句话打“信心 3”——选哪一句？',
    'A real case: an 80-year-old woman. QRS mainly positive in I and aVL, mainly negative in II, III and aVF, QRS about 94 ms. You may give a confidence of 3 to one statement only — which one?',
    'Un caso real: mujer de 80 años. QRS predominantemente positivo en I y aVL y negativo en II, III y aVF, QRS de unos 94 ms. Solo puedes dar confianza 3 a una afirmación: ¿a cuál?',
  ),
  ecg: real(10730),
  view: GRID,
  explanation: l(
    '电轴约 **−40°**（I 正、aVF 负、II 也是负向为主 → 超过 −30°；12SL 测得 −39°）。“电轴左偏约 −40°”是描述，量得出来，可以给 3。“左前分支阻滞”需要 **−45° 至 −90°**（Surawicz 2009），这里差一点——心脏科医师的标注是 LAFB，测得的电轴是 −39°，所以报告应写“电轴左偏约 −40°，按现行标准未达 LAFB”，对 LAFB 这一句只给 2：核对、复测、与旧图比较。“电轴正常”是错的：II 已经负向。**把信心挂在你量到的东西上，而不是挂在名字上。**',
    'The axis is about **−40°** (I positive, aVF negative, and II mainly negative too → beyond −30°; 12SL measured −39°). "Left axis deviation, about −40°" is a description you can measure — it earns a 3. "Left anterior fascicular block" needs **−45° to −90°** (Surawicz 2009), and this falls just short — the cardiologists\' label says LAFB and the measured axis is −39°, so the report should read "left axis deviation about −40°, LAFB criteria not met by current thresholds", with only a 2 on the LAFB line: check, re-measure, compare with old tracings. "Normal axis" is wrong: II is already negative. **Attach confidence to what you measured, not to a name.**',
    'El eje es de unos **−40°** (I positiva, aVF negativa y también II predominantemente negativa → más allá de −30°; el 12SL midió −39°). «Desviación izquierda del eje, de unos −40°» es una descripción que se puede medir: se gana un 3. «Bloqueo fascicular anterior izquierdo» exige **−45° a −90°** (Surawicz 2009), y aquí se queda justo corto; la etiqueta de los cardiólogos dice BFAI y el eje medido es de −39°, así que el informe debe decir «desviación izquierda del eje de unos −40°, sin criterios actuales de BFAI», con solo un 2 en la línea del BFAI: comprobar, volver a medir y comparar con previos. «Eje normal» es erróneo: II ya es negativa. **Pon la confianza en lo que has medido, no en un nombre.**',
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
        '门诊筛查：16 岁女孩，无症状。你自己量了心率——约 75 次/分，随呼吸略有快慢——把 x1 的十步走完之后，你倾向于“这份图没有异常”。先想好报告；然后在往下翻之前回答最后一个问题：对这个“正常”，你的信心是 1、2 还是 3？',
        'Clinic screening: a 16-year-old girl, asymptomatic. You measured the rate yourself — about 75/min, speeding and slowing a little with breathing — and after walking the ten steps from x1 you lean towards "nothing wrong on this tracing". Settle the report in your head; then, before scrolling, answer one last question: how sure are you of that "normal" — 1, 2 or 3?',
        'Cribado en consulta: una chica de 16 años, asintomática. Has medido tú la frecuencia —unas 75 lpm, que se acelera y se frena un poco con la respiración— y tras recorrer los diez pasos de x1 te inclinas por «nada anormal en este ECG». Decide el informe; y antes de continuar responde a una última pregunta: ¿cuánta confianza le das a ese «normal», 1, 2 o 3?',
      ),
      reveal: l(
        '无论你选了哪个数字——**从现在起这个数字是数据**。这门课里，考试的每次作答都会附一个信心评分（其他地方就在心里给自己打分）：1 = 猜测，2 = 比较有把握，3 = 有把握；**校准 = 信心与准确率随时间的匹配**。这份图确实正常（16 岁的呼吸性窦性心律不齐是正常现象，s3），而且患病率站在你这边（x2）。真正的问题在后面：给这份图打 3 的读者，往往也会给下一份 −60° 电轴的图打 3——**数字只有会动才有意义**。',
        'Whichever number you picked — **from now on that number is data**. In this course every exam answer carries a confidence rating (everywhere else, rate yourself in your head): 1 = a guess, 2 = fairly sure, 3 = sure; **calibration = confidence matching accuracy over time**. This tracing is indeed normal (respiratory sinus arrhythmia at 16 is a normal finding, s3), and prevalence is on your side (x2). The real problem comes next: readers who rate this one a 3 often rate the next tracing, the one with a −60° axis, a 3 too — **a number only means something if it moves**.',
        'Sea cual sea el número que hayas elegido: **a partir de ahora ese número es un dato**. En este curso, cada respuesta del examen lleva una puntuación de confianza (en todo lo demás, puntúate mentalmente): 1 = una suposición, 2 = bastante seguro, 3 = seguro; **calibrar = que la confianza coincida con la precisión a lo largo del tiempo**. Este ECG es, en efecto, normal (la arritmia sinusal respiratoria a los 16 años es normal, s3) y la prevalencia juega a tu favor (x2). El problema de verdad viene después: quien puntúa esto con un 3 suele puntuar también con un 3 el siguiente ECG, el del eje de −60° — **un número solo significa algo si se mueve**.',
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
        {
          label: l('台账的一行', 'One ledger line', 'Una línea del registro'),
          value: l(
            '日期 · 哪份图 · 漏了什么 · 当时的信心 · 类型；错 + 3 是危险组合，错 + 1 是正常学习',
            'Date · which tracing · what was missed · confidence at the time · type; wrong + 3 is the dangerous pair, wrong + 1 is normal learning',
            'Fecha · qué ECG · qué se perdió · confianza de entonces · tipo; error + 3 es la pareja peligrosa, error + 1 es aprendizaje normal',
          ),
        },
      ],
      source:
        'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192',
    },
    {
      kind: 'worked',
      title: l('错误尸检：−60° 的电轴被叫成“正常变异”', 'Error autopsy: an axis of −60° called a "normal variant"', 'Autopsia del error: un eje de −60° llamado «variante normal»'),
      ecg: AUTOPSY,
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
            'Tres tipos, tres recetas:\n- **no visto** → problema de proceso: reentrenar el orden fijo y el barrido de diez segundos (x1, x3) para que el eje siempre se mida;\n- **visto pero mal nombrado** → problema de conocimiento: lo más probable en este caso; vuelve a las tarjetas de criterios de las categorías del eje y de los bloqueos fasciculares;\n- **bien nombrado pero con urgencia equivocada** → problema de triaje: un BFAI informado como «actuar ya» o un bloqueo completo como «rutina»; reentrenar las categorías de x3.\nLa confianza 3 de entonces es la segunda prueba: **no sabías que no sabías** — justo el hueco que el registro existe para cazar.',
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
      kind: 'figure',
      figure: { id: 'axis-calculator' },
      ecg: AUTOPSY,
      caption: l(
        '亲手量尸检那份图：把 I 和 aVF 的 QRS 净值放到轮上。约 −60°，落在 −45° 至 −90° 之间。量过的“3”才算数。',
        'Measure the autopsy tracing yourself: put the net QRS of I and aVF on the wheel. About −60° lands between −45° and −90°. A 3 counts only once you have measured.',
        'Mide tú el ECG de la autopsia: lleva el QRS neto de I y aVF a la rueda. Unos −60° caen entre −45° y −90°. Un 3 solo cuenta cuando has medido.',
      ),
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
      kind: 'film',
      title: l('三种失误，三张处方', 'Three kinds of miss, three prescriptions', 'Tres tipos de fallo, tres recetas'),
      view: GRID,
      frames: [
        {
          label: l('没看见', 'Didn\'t see', 'No visto'),
          ecg: synth('long-qt', 1865, { qtc: 520 }),
          note: l(
            '报完节律就停笔，QT 从没量：约 510 ms，超过 RR 的一半。**没看见** → 重练固定顺序（x1）。',
            'Rhythm named, pen down, QT never measured: about 510 ms, more than half the RR. **Didn\'t see** → retrain the fixed order (x1).',
            'Ritmo nombrado, boli abajo, QT sin medir: unos 510 ms, más de la mitad del RR. **No visto** → reentrena el orden fijo (x1).',
          ),
          marks: [{ auto: 'qt' }, { auto: 'rr' }],
        },
        {
          label: l('命名错', 'Misnamed', 'Mal nombrado'),
          ecg: AUTOPSY,
          note: l(
            'I 正向，II、III、aVF 深负向，aVL 呈 qR：左前分支阻滞，却写成“正常变异”。**命名错** → 回到判据卡。',
            'I up, II, III and aVF deeply down, qR in aVL: LAFB, written up as "normal variant". **Misnamed** → back to the criteria card.',
            'I positiva, II, III y aVF muy negativas, qR en aVL: BFAI, informado como «variante normal». **Mal nombrado** → vuelve a la tarjeta de criterios.',
          ),
          marks: [{ auto: 'qrs', lead: 'aVL', label: l('aVL 呈 qR', 'qR in aVL', 'qR en aVL') }],
        },
        {
          label: l('紧急度错', 'Wrong urgency', 'Urgencia equivocada'),
          ecg: synth('av-block-3', 1866, undefined, 'infra-his'),
          note: l(
            'P 波自走，宽逸搏约 34 次/分：三度阻滞命名对了，却归到“常规”。**紧急度错** → 重练 x3 的箱子。',
            'P waves march on, a wide escape at about 34/min: complete block named right, then filed as "routine". **Wrong urgency** → retrain the bins from x3.',
            'Las P van a su ritmo, escape ancho a unas 34 lpm: bloqueo completo bien nombrado y archivado como «rutina». **Urgencia equivocada** → reentrena las categorías de x3.',
          ),
          marks: [{ auto: 'qrs' }],
        },
      ],
      predict: {
        question: l(
          '读者看到 I 正向、II、III、aVF 负向，写了“正常变异”。这是哪一型？',
          'A reader saw I up and II, III and aVF down, and wrote "normal variant". Which type of miss is that?',
          'Un lector vio I positiva y II, III y aVF negativas, y escribió «variante normal». ¿Qué tipo de fallo es?',
        ),
        options: [l('没看见', 'Didn\'t see', 'No visto'), l('命名错', 'Misnamed', 'Mal nombrado'), l('紧急度错', 'Wrong urgency', 'Urgencia equivocada')],
        answer: 1,
      },
      caption: l(
        '类型决定处方：没看见→流程，命名错→知识，紧急度错→分诊。“下次小心”不是处方；再训练那个家族才是。',
        'The type sets the prescription: didn\'t see → process, misnamed → knowledge, wrong urgency → triage. "Be careful next time" is not one; retraining that family is.',
        'El tipo fija la receta: no visto → proceso, mal nombrado → conocimiento, urgencia equivocada → triaje. «Más cuidado» no es una receta; reentrenar esa familia sí.',
      ),
    },
    {
      kind: 'criteria',
      title: l('你自己的数据：进度页', 'Your own data: the Progress page', 'Tus propios datos: la página de Progreso'),
      items: [
        {
          label: l('哪里问信心', 'Where confidence is asked', 'Dónde se pide la confianza'),
          value: l('只在考试；课内检测题和训练都不问，在心里给自己打 1–3', 'Only in the exam; lesson checks and drills do not ask, so rate yourself 1–3 in your head', 'Solo en el examen; las comprobaciones y los entrenamientos no la piden: puntúate 1-3 mentalmente'),
        },
        {
          label: l('信心校准图', 'The calibration chart', 'El gráfico de calibración'),
          value: l(
            '每档一根柱（你的正确率）对一条线（理想：猜的约 40%、比较确定约 70%、非常确定约 95%）；“非常确定”答满 5 次、其中答对的不到 80% 时，会提醒你过度自信',
            'One bar per level (your accuracy) against a line (the ideal: about 40 % Guess, 70 % Fairly sure, 95 % Sure); once you have five or more "Sure" answers and under 80 % of them are right, the overconfidence warning shows',
            'Una barra por nivel (tu acierto) frente a una línea (el ideal: en torno al 40 % Lo adivino, 70 % Bastante seguro, 95 % Seguro); cuando tienes cinco o más respuestas «Seguro» y aciertas menos del 80 % de ellas, aparece el aviso de exceso de confianza',
          ),
        },
        {
          label: l('怎么读柱子', 'Reading the bars', 'Cómo leer las barras'),
          value: l(
            '“非常确定”的柱子远低于横线 = 过度自信；“猜的”柱子远高于 40% = 自信不足',
            'A "Sure" bar well below its line = overconfidence; a "Guess" bar far above 40 % = underconfidence',
            'Una barra de «Seguro» muy por debajo de su línea = exceso de confianza; una barra de «Lo adivino» muy por encima del 40 % = defecto de confianza',
          ),
        },
        {
          label: l('危急表现追踪', 'The critical-findings tracker', 'El seguimiento de hallazgos críticos'),
          value: l('至少练 3 次、最近 5 次都 ≥ 80%、没有漏诊标记，才算“已掌握”', '"Secured" only after at least 3 attempts, the last five all ≥ 80 % and no missed-critical flag', '«Dominado» solo tras al menos 3 intentos, los cinco últimos ≥ 80 % y sin marca de omisión crítica'),
        },
        {
          label: l('复习队列', 'The review queue', 'La cola de repaso'),
          value: l('任何一题 < 80%：它训练的发现（或家族）进第 1 盒，第二天到期；按时答对升一盒（1、2、4、8、16 天）', 'Any item under 80 % puts the finding it trains (or its family) in box 1, due the next day; each on-time pass moves it up a box (1, 2, 4, 8, 16 days)', 'Cualquier ejercicio por debajo del 80 % pone su hallazgo (o su familia) en la caja 1, para el día siguiente; cada acierto a tiempo lo sube una caja (1, 2, 4, 8, 16 días)'),
        },
        {
          label: l('两张图一起读', 'Read both panels together', 'Lee los dos paneles juntos'),
          value: l('应用不画“漏诊 + 非常确定”那一格：仍在“学习中”的危急表现 + 偏低的“非常确定”柱，就是要记进台账的那一行', 'The app does not draw the "missed critical + Sure" cell: a critical finding still "Learning" while your "Sure" bar sits low is the line for your ledger', 'La aplicación no dibuja la casilla «crítico omitido + Seguro»: un hallazgo crítico aún en «Aprendiendo» con la barra de «Seguro» baja es la línea para tu registro'),
        },
      ],
      source: 'ECG Academy, Progress page (how this app records and schedules your answers)',
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
      kind: 'film',
      title: l('信心挂在每一句上', 'Confidence goes on each statement', 'La confianza va en cada afirmación'),
      view: STRIP,
      frames: [
        {
          label: l('节律', 'Rhythm', 'Ritmo'),
          ecg: FAST,
          note: l(
            '每个 QRS 前都有 P，II 导联直立：“窦性心动过速”是你看得见的，可以给 3。',
            'A P before every QRS, upright in II: "sinus tachycardia" is something you can see, so it can be a 3.',
            'Una P antes de cada QRS, positiva en II: «taquicardia sinusal» es algo que ves, así que puede ser un 3.',
          ),
          marks: [{ auto: 'p' }],
        },
        {
          label: l('心率', 'Rate', 'Frecuencia'),
          ecg: FAST,
          note: l(
            '每拍 RR 约 12 个小格（470–490 ms）：“约 125 次/分，规则”是量出来的，可以给 3。',
            'RR about 12 small squares (470–490 ms) on every beat: "about 125/min, regular" is measured, so it can be a 3.',
            'RR de unos 12 cuadros pequeños (470–490 ms) en cada latido: «unas 125 lpm, regular» está medido, así que puede ser un 3.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          label: l('原因', 'Cause', 'Causa'),
          ecg: FAST,
          note: l(
            '“为什么快？”原因在患者身上，不在纸上：见到患者之前最多给 2。',
            '"Why is it fast?" The cause lives in the patient, not on the paper: at most a 2 until you see the patient.',
            '«¿Por qué es rápida?» La causa está en el paciente, no en el papel: como mucho un 2 hasta que veas al paciente.',
          ),
        },
      ],
      predict: {
        question: l('这份报告里，哪部分可以给 3？', 'Which part of this report can carry a 3?', '¿Qué parte de este informe puede llevar un 3?'),
        options: [l('节律和心率', 'The rhythm and the rate', 'El ritmo y la frecuencia'), l('心动过速的原因', 'The cause of the tachycardia', 'La causa de la taquicardia'), l('两者都可以', 'Both', 'Las dos')],
        answer: 0,
      },
      caption: l(
        '信心挂在陈述上，不挂在整份图上。后面的检测题、训练和真实病例都不问信心：每答一题，在心里选一个 1–3。',
        'Confidence attaches to statements, not to whole tracings. The checks, drill and real cases that follow do not ask: choose a 1–3 in your head on every answer.',
        'La confianza se asigna a afirmaciones, no a ECG enteros. Las comprobaciones, el entrenamiento y los casos reales que siguen no la piden: elige mentalmente un 1-3 en cada respuesta.',
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
        '三份真实心电图：69 岁、63 岁、79 岁女性。每份先想好报告，在心里给每一句打 1–3，再揭晓。第三份量电轴，和 10730 比：哪一份够左前分支阻滞？失误按类型记进台账：这就是这门课的家庭作业。',
        'Three real ECGs: women of 69, 63 and 79. Work out the report, rate every statement 1–3 in your head, then reveal. In the third, measure the axis and compare it with 10730: which one meets the LAFB criteria? Log every miss by type: that is this course\'s homework.',
        'Tres ECG reales: mujeres de 69, 63 y 79 años. Elabora el informe, puntúa mentalmente cada afirmación de 1 a 3 y luego mira. En el tercero, mide el eje y compáralo con el 10730: ¿cuál cumple los criterios de BFAI? Anota cada fallo por tipo: esa es la tarea que te deja el curso.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('信心 3 当默认值：3 只留给“错了我会惊讶”的答案——一律标 3 等于没有校准。', 'Confidence 3 as the default: 3 is for answers whose being wrong would surprise you — a flat 3 is no calibration at all.', 'La confianza 3 como valor por defecto: el 3 es para las respuestas cuyo error te sorprendería; un 3 uniforme no es calibración.'),
        l(
          '自信不足：每份图都“不确定，请上级看”——第二位读者成了瓶颈，真正的“现在处理”淹没在噪声里。不确定要说具体：“电轴我不确定”可以训练。',
          'Under-confidence: every tracing "not sure, someone senior please" — the second reader becomes the bottleneck and the real act-now cases drown in the noise. Make the doubt specific: "unsure about the axis" can be trained.',
          'Defecto de confianza: cada ECG es un «no estoy seguro, que lo vea alguien superior»; el segundo lector se convierte en el cuello de botella y los verdaderos casos de actuar ya se ahogan en el ruido. Concreta la duda: «no estoy seguro del eje» se puede entrenar.',
        ),
        l(
          '照签机器报告：自动化偏差把机器的错误（集中在节律，也认不出电极接反）以你的信心 3 写进病历。',
          'Signing the machine statement unread: automation bias writes its errors (clustered in rhythm, blind to electrode reversals) into the record under your confidence 3.',
          'Firmar la lectura automática sin revisarla: el sesgo de automatización escribe sus errores (concentrados en el ritmo, ciegos a las inversiones de electrodos) en la historia con tu confianza 3.',
        ),
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
