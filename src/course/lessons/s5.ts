/**
 * S5 — Frontal axis and R-wave progression (docs/PLAN.md §3, stage S).
 * Criteria: docs/curriculum/criteria.md `hexaxial-system`, `axis-methods`, `qrs-axis-adult` (current: −30° to +90°),
 * `heart-position` (describe the axis, not the "position" of the heart), `precordial-progression`, `paed-axis`,
 * "QRS axis categories". Deviated axes: real PTB-XL tracings (2686 normal −18°, 18373 LAD −55°, 9188 LAD −60°,
 * 7419 RAD +99°) and the synthetic fascicular-block scenarios `lafb` (axis dial −80…−50°) and `lpfb` (+100…+140°).
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(dials ? { dials } : {}) },
});
const real = (id: number): EcgSource => ({ kind: 'real', id });
/** the R-progression heart; the same request with V1–V2 two spaces high (the sites of `precordial-misplacement-high`) */
const PROGRESSION = { scenario: 'normal', seed: 504 } as const;
const V1V2_HIGH = { chest: { V1: { ics: 2, line: 'sternal', side: 'R' }, V2: { ics: 2, line: 'sternal', side: 'L' } } } as const;

const lesson: Lesson = {
  id: 's5',
  stage: 'S',
  order: 5,
  title: l('额面电轴与 R 波递增', 'Frontal axis and R-wave progression', 'Eje frontal y progresión de la onda R'),
  summary: l(
    '先用 I、aVF（必要时加 II）判断电轴象限，再用最接近等电位的肢体导联估计度数；在胸导联上看 R 波递增与移行区。',
    'Find the axis quadrant from I and aVF (and II when needed), then the degrees from the most equiphasic limb lead; across the chest leads, read the R-wave progression and the transition.',
    'Determina el cuadrante del eje con I y aVF (y II cuando haga falta), después los grados con la derivación de miembros más isodifásica; en las precordiales, valora la progresión de la R y la transición.',
  ),
  objectives: [
    l('100% 正确地判断电轴类别（正常、左偏、右偏、右上方）。', 'Classify the axis (normal, left, right, right superior) every time.', 'Clasificar el eje (normal, izquierdo, derecho, superior derecho) siempre sin error.'),
    l('估计电轴度数，误差在 ±20° 以内。', 'Estimate the axis within ±20°.', 'Estimar el eje con un error de ±20°.'),
    l('描述胸导联 R 波递增和移行区，不过度解读。', 'Describe R-wave progression and the transition zone without over-reading it.', 'Describir la progresión de la R y la zona de transición sin sobreinterpretarla.'),
  ],
  minutes: 17,
  competencies: ['C5'],
  findings: ['axis-normal', 'lad', 'rad', 'extreme-axis', 'poor-r-progression'],
  blocks: [
    {
      kind: 'hook',
      ecg: real(2686),
      question: l(
        '这份真实心电图的 I 导联向上、aVF 向下。电轴异常吗？先下结论再往下读。',
        'On this real ECG, lead I is positive and aVF is negative. Is the axis abnormal? Commit before you read on.',
        'En este ECG real, la derivación I es positiva y aVF negativa. ¿Es anormal el eje? Decide antes de seguir leyendo.',
      ),
      reveal: l(
        '不一定。I 向上、aVF 向下只说明电轴在 0° 到 −90° 之间。看 **II 导联**：这里它（略）向上，所以电轴在 −30° 以上——仍然正常（机器测得约 −20°）。只有 II 导联也向下，电轴才超过 −30°，即电轴左偏。',
        'Not necessarily. I positive with aVF negative only places the axis between 0° and −90°. Look at **lead II**: here it is (slightly) positive, so the axis lies above −30° and is still normal (the machine measured about −20°). Only when II is negative too is the axis beyond −30°: left axis deviation.',
        'No necesariamente. I positiva con aVF negativa solo sitúa el eje entre 0° y −90°. Mira la **derivación II**: aquí es (ligeramente) positiva, así que el eje está por encima de −30° y sigue siendo normal (el equipo midió unos −20°). Solo si II también es negativa el eje pasa de −30°: desviación del eje a la izquierda.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'hexaxial', params: { interactive: true, showProjections: true, quadrantMode: true } },
      caption: l(
        '绕着轮盘拖动向量，看 I 和 aVF 的正负：都为正 = 正常象限。再看 0° 到 −90° 之间由 II 导联决定的那一区。',
        'Drag the vector around the wheel. Watch the signs of I and aVF (both positive = normal quadrant), and watch lead II decide the zone between 0° and −90°.',
        'Arrastra el vector alrededor de la rueda. Observa los signos de I y aVF (ambos positivos = cuadrante normal) y cómo la derivación II decide la zona entre 0° y −90°.',
      ),
    },
    {
      kind: 'criteria',
      title: l('额面 QRS 电轴（成人）', 'Frontal QRS axis (adults)', 'Eje frontal del QRS (adultos)'),
      items: [
        { label: l('正常', 'Normal', 'Normal'), value: l('−30° 至 +90°', '−30° to +90°', '−30° a +90°') },
        { label: l('电轴左偏', 'Left axis deviation', 'Desviación del eje a la izquierda'), value: l('超过 −30°（−30° 至 −45° 中度；−45° 至 −90° 显著）', 'Beyond −30° (−30° to −45° moderate; −45° to −90° marked)', 'Más allá de −30° (−30° a −45° moderada; −45° a −90° marcada)') },
        { label: l('显著左偏 + aVL 呈 qR + QRS < 120 ms', 'Marked LAD + qR in aVL + QRS < 120 ms', 'Desviación marcada + qR en aVL + QRS < 120 ms'), value: l('提示左前分支阻滞', 'Suggests left anterior fascicular block', 'Sugiere bloqueo fascicular anterior izquierdo') },
        { label: l('电轴右偏', 'Right axis deviation', 'Desviación del eje a la derecha'), value: l('超过 +90°（+90° 至 +120° 中度；+120° 至 +180° 显著）', 'Beyond +90° (+90° to +120° moderate; +120° to +180° marked)', 'Más allá de +90° (+90° a +120° moderada; +120° a +180° marcada)') },
        { label: l('右上方（极度）电轴', 'Right superior (“extreme”) axis', 'Eje superior derecho (“extremo”)'), value: l('−90° 至 ±180°', '−90° to ±180°', '−90° a ±180°') },
        { label: l('不确定电轴', 'Indeterminate axis', 'Eje indeterminado'), value: l('所有肢体导联都呈等电位', 'All limb leads equiphasic', 'Todas las derivaciones de miembros isodifásicas') },
        { label: l('儿童', 'Children', 'Niños'), value: l('正常范围更偏右（新生儿可达约 +180°）：用年龄别界值', 'Normal range further right (up to about +180° in newborns): use age-specific limits', 'Rango normal más a la derecha (hasta unos +180° en el recién nacido): usa límites por edad') },
        { label: l('肢体导联角度', 'Limb-lead angles', 'Ángulos de las derivaciones de miembros'), value: l('I 0°、II +60°、aVF +90°、III +120°、aVL −30°、aVR −150°', 'I 0°, II +60°, aVF +90°, III +120°, aVL −30°, aVR −150°', 'I 0°, II +60°, aVF +90°, III +120°, aVL −30°, aVR −150°') },
        {
          label: l('互相垂直的导联', 'Perpendicular pairs', 'Parejas perpendiculares'),
          value: l(
            'I 与 aVF、II 与 aVL、III 与 aVR。电轴与最接近等电位的导联相差 90°；指向电轴的导联 QRS 最正',
            'I and aVF, II and aVL, III and aVR. The axis lies 90° from the most equiphasic lead; the QRS is most positive in the lead pointing along it',
            'I y aVF, II y aVL, III y aVR. El eje está a 90° de la derivación más isodifásica; el QRS es más positivo en la derivación que apunta hacia él',
          ),
        },
        {
          label: l('象限（I 与 aVF 的 QRS 净方向）', 'Quadrant (net QRS in I and aVF)', 'Cuadrante (QRS neto en I y aVF)'),
          value: l(
            'I+ aVF+ 正常；I+ aVF− 看 II（II+ 正常，II− 电轴左偏）；I− aVF+ 电轴右偏；I− aVF− 右上方电轴',
            'I+ aVF+ normal; I+ aVF− check II (II+ normal, II− left axis deviation); I− aVF+ right axis deviation; I− aVF− right superior axis',
            'I+ aVF+ normal; I+ aVF− mira II (II+ normal, II− desviación a la izquierda); I− aVF+ desviación a la derecha; I− aVF− eje superior derecho',
          ),
        },
        {
          label: l('胸导联 R 波递增', 'Chest-lead R-wave progression', 'Progresión de la R en las precordiales'),
          value: l(
            'V1–V2 呈 rS → V3–V4 移行（R ≈ S）→ V5–V6 高 R，常有小的间隔 q 波；移行提前（V1–V2）或推后（V5–V6）只是描述。R 波递增不良：V3 的 R ≤ 3 mm（原因：V1–V2 电极错位、左心室肥厚、陈旧性前壁梗死、肺部疾病）',
            'rS in V1–V2 → transition (R ≈ S) at V3–V4 → tall R in V5–V6, often with a small septal q; an early (V1–V2) or late (V5–V6) transition is a description. Poor progression: R in V3 ≤ 3 mm (causes: misplaced V1–V2, LVH, old anterior infarct, lung disease)',
            'rS en V1–V2 → transición (R ≈ S) en V3–V4 → R alta en V5–V6, a menudo con una q septal pequeña; una transición precoz (V1–V2) o tardía (V5–V6) es una descripción. Mala progresión: R en V3 ≤ 3 mm (causas: V1–V2 mal colocadas, HVI, infarto anterior antiguo, enfermedad pulmonar)',
          ),
        },
      ],
      source: 'Surawicz B et al. AHA/ACCF/HRS Part III, Circulation 2009;119:e235; Mason JW et al. Part II, Circulation 2007;115:1325; Kligfield P et al. Part I, Circulation 2007;115:1306; Rijnbeek PR et al. Eur Heart J 2001;22:702',
    },
    {
      kind: 'worked',
      title: l('两步求电轴', 'The axis in two steps', 'El eje en dos pasos'),
      ecg: synth('normal', 501, { axis: 30 }),
      steps: [
        {
          title: l('象限', 'Quadrant', 'Cuadrante'),
          body: l('I 和 aVF 的 QRS 都以正向为主：正常象限，0° 至 +90°。', 'The QRS is mainly positive in both I and aVF: normal quadrant, 0° to +90°.', 'El QRS es predominantemente positivo en I y en aVF: cuadrante normal, de 0° a +90°.'),
          highlightLeads: ['I', 'aVF'],
        },
        {
          title: l('最接近等电位的肢体导联', 'The most equiphasic limb lead', 'La derivación de miembros más isodifásica'),
          body: l('III 导联的 QRS 向上和向下大致相等：它与电轴垂直。', 'In lead III the QRS goes about as far up as down: it is perpendicular to the axis.', 'En la derivación III el QRS sube más o menos lo mismo que baja: es perpendicular al eje.'),
          highlightLeads: ['III'],
        },
        {
          title: l('取垂直方向', 'Go 90° away', 'Gira 90°'),
          body: l(
            'III 在 +120°，所以电轴是 +30° 或 −150°。I 和 II 都向上，因此电轴约 **+30°**：正常。',
            'III sits at +120°, so the axis is either +30° or −150°. I and II are both positive, so the axis is about **+30°**: normal.',
            'III está a +120°, así que el eje es +30° o −150°. I y II son positivas, de modo que el eje está en torno a **+30°**: normal.',
          ),
          highlightLeads: ['I', 'II', 'III'],
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'normal',
      seed: 502,
      dials: [{ id: 'axis' }],
      view: { layout: '6x2', highlightLeads: ['I', 'II', 'III', 'aVF', 'aVL'] },
      play: {
        dial: 'axis',
        from: 0,
        to: 80,
        notes: [
          { min: 0, max: 20, text: l('**aVF**（+90°）最接近等电位：电轴与它相差 90°，靠近 I 导联（0°）。', '**aVF** (+90°) is the most equiphasic: the axis lies 90° from it, close to lead I (0°).', '**aVF** (+90°) es la más isodifásica: el eje está a 90° de ella, cerca de la derivación I (0°).') },
          { min: 25, max: 50, text: l('现在 **III**（+120°）最接近等电位：相差 90°，电轴约 +30°。', 'Now **III** (+120°) is the most equiphasic: 90° away puts the axis around +30°.', 'Ahora **III** (+120°) es la más isodifásica: a 90° de ella, el eje está hacia +30°.') },
          { min: 55, max: 80, text: l('现在 **aVL**（−30°）最接近等电位：电轴约 +60°。接近 +90° 时 I 导联变小。', 'Now **aVL** (−30°) is the most equiphasic: the axis is around +60°. Near +90°, lead I shrinks.', 'Ahora **aVL** (−30°) es la más isodifásica: el eje está hacia +60°. Cerca de +90°, la derivación I se hace pequeña.') },
        ],
      },
      predict: {
        question: l('把电轴从 0° 转到 +80°。转到 +60° 左右时，哪个肢体导联最接近等电位？', 'Turn the axis from 0° to +80°. Near +60°, which limb lead goes equiphasic?', 'Gira el eje de 0° a +80°. Hacia +60°, ¿qué derivación de miembros se vuelve isodifásica?'),
        options: [l('aVL', 'aVL', 'aVL'), l('III', 'III', 'III'), l('aVF', 'aVF', 'aVF')],
        answer: 0,
      },
      caption: l(
        '等电位的导联总是与电轴相差 90°。看它从 aVF 换到 III，再换到 aVL。',
        'The equiphasic lead always sits 90° from the axis. Watch it move from aVF to III to aVL.',
        'La derivación isodifásica siempre está a 90° del eje. Mira cómo pasa de aVF a III y después a aVL.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'axis-calculator' },
      ecg: synth('normal', 503, { axis: 45 }),
      caption: l(
        '从图上读出 I 和 aVF 的 QRS 净振幅（R 减 S，单位 mm）并输入，计算器会画出电轴。与你的两步法估计比较。',
        'Read the net QRS (R minus S, in mm) of I and aVF from the tracing and enter them: the calculator draws the axis. Compare it with your two-step estimate.',
        'Lee en el trazado el QRS neto (R menos S, en mm) de I y aVF e introdúcelo: la calculadora dibuja el eje. Compáralo con tu estimación en dos pasos.',
      ),
    },
    {
      kind: 'contrast',
      title: l('aVF 向下：正常还是左偏？', 'aVF negative: normal or left deviation?', 'aVF negativa: ¿normal o desviación a la izquierda?'),
      left: {
        ecg: real(2686),
        caption: l('69 岁男性', 'Man, 69', 'Varón de 69 años'),
        marks: [{ kind: 'lead', lead: 'II', color: 'ok' }],
      },
      right: {
        ecg: real(18373),
        caption: l('79 岁女性', 'Woman, 79', 'Mujer de 79 años'),
        marks: [{ kind: 'lead', lead: 'II', color: 'err' }],
      },
      point: l(
        '两者 I 都向上、aVF 都向下。A 的 II 仍然向上：电轴在 −30° 以上（约 −20°），正常。B 的 II 也明显向下（rS）：电轴超过 −30°（约 −55°），电轴左偏。QRS 窄、aVL 呈 qR 的显著左偏提示左前分支阻滞（第 R7 课）。',
        'Both have lead I positive and aVF negative. In A, lead II is still positive: the axis is above −30° (about −20°), normal. In B, II is clearly negative too (rS): the axis is beyond −30° (about −55°), left axis deviation. Marked LAD with a narrow QRS and a qR in aVL suggests left anterior fascicular block (lesson R7).',
        'En ambos I es positiva y aVF negativa. En A, II sigue siendo positiva: el eje está por encima de −30° (unos −20°), normal. En B, II también es claramente negativa (rS): el eje pasa de −30° (unos −55°), desviación a la izquierda. Una desviación marcada con QRS estrecho y qR en aVL sugiere bloqueo fascicular anterior izquierdo (lección R7).',
      ),
    },
    {
      kind: 'contrast',
      title: l('左偏还是右偏：先看象限', 'Left or right: quadrant first', 'Izquierda o derecha: primero el cuadrante'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'aVF'] },
      left: {
        ecg: synth('lafb', 505, { axis: -60 }),
        caption: l('A：66 岁男性', 'A: man, 66', 'A: varón de 66 años'),
        marks: [{ kind: 'lead', lead: 'I', color: 'ok' }, { kind: 'lead', lead: 'aVF', color: 'err' }, { kind: 'lead', lead: 'II', color: 'err' }],
      },
      right: {
        ecg: synth('lpfb', 506, { axis: 115 }),
        caption: l('B：71 岁男性', 'B: man, 71', 'B: varón de 71 años'),
        marks: [{ kind: 'lead', lead: 'I', color: 'err' }, { kind: 'lead', lead: 'aVF', color: 'ok' }],
      },
      point: l(
        'A：I 向上，aVF 向下，II 也向下（rS）：电轴超过 −30°，约 −60°，显著左偏。B：I 向下（rS），aVF 向上：电轴右偏，约 +115°。两者 QRS 都窄（< 120 ms）。A 中 aVL 呈 qR，提示左前分支阻滞；B 中 I、aVL 呈 rS，III、aVF 呈 qR，只有排除右心室肥厚、侧壁梗死、肺部疾病和瘦长体型等原因后，才能考虑左后分支阻滞（第 R7 课）。',
        'A: I positive, aVF negative and II negative too (rS): the axis is beyond −30°, at about −60° — marked left axis deviation. B: I negative (rS) and aVF positive: right axis deviation, at about +115°. Both QRS complexes are narrow (< 120 ms). The qR in aVL of A suggests left anterior fascicular block; the rS in I and aVL with qR in III and aVF of B suggests left posterior fascicular block only once RVH, lateral infarction, lung disease and a slim build have been excluded (lesson R7).',
        'A: I positiva, aVF negativa y II también negativa (rS): el eje pasa de −30°, hacia −60°, desviación marcada a la izquierda. B: I negativa (rS) y aVF positiva: desviación a la derecha, hacia +115°. Ambos QRS son estrechos (< 120 ms). La qR en aVL de A sugiere bloqueo fascicular anterior izquierdo; la rS en I y aVL con qR en III y aVF de B solo sugiere bloqueo fascicular posterior izquierdo después de descartar HVD, infarto lateral, enfermedad pulmonar y una constitución delgada (lección R7).',
      ),
    },
    {
      kind: 'film',
      title: l('胸导联：R 波递增', 'Chest leads: R-wave progression', 'Precordiales: progresión de la onda R'),
      view: { layout: '6x2' },
      frames: [
        {
          label: l('正常', 'Normal', 'Normal'),
          ecg: { kind: 'synth', req: PROGRESSION },
          note: l('V1 呈 rS，R 波在 V3 超过 S 波（移行区），V6 呈 qR：正常递增。', 'rS in V1, the R overtakes the S at V3 (the transition), qR in V6: normal progression.', 'rS en V1, la R supera a la S en V3 (la transición), qR en V6: progresión normal.'),
          marks: [
            { auto: 'r', lead: 'V1' },
            { auto: 's', lead: 'V1' },
            { auto: 'r', lead: 'V3' },
            { auto: 's', lead: 'V3' },
            { auto: 'r', lead: 'V6' },
          ],
        },
        {
          label: l('R 波递增不良', 'Poor R progression', 'Mala progresión de R'),
          ecg: synth('poor-r-progression', 504),
          note: l('V3 的 R 波只有约 2 mm（≤ 3 mm），移行区推到 V4：R 波递增不良。这是描述，原因很多。', 'The R in V3 is only about 2 mm (≤ 3 mm) and the transition moves to V4: poor R-wave progression, a description with many causes.', 'La R en V3 mide solo unos 2 mm (≤ 3 mm) y la transición pasa a V4: mala progresión de la R, una descripción con muchas causas.'),
          marks: [{ auto: 'r', lead: 'V3' }],
        },
        {
          label: l('V1–V2 贴高了', 'V1–V2 too high', 'V1–V2 demasiado altas'),
          ecg: { kind: 'synth', req: { ...PROGRESSION, recording: { placement: V1V2_HIGH } } },
          note: l('同一颗心脏，V1–V2 贴在第 2 肋间：V2 的 r 波从约 3.5 mm 降到约 1 mm，V1 的 P 波变成倒置。先查电极位置。', 'Same heart, V1–V2 in the 2nd intercostal space: the r in V2 drops from about 3.5 to 1 mm and the P in V1 turns negative. Check placement first.', 'Mismo corazón, V1–V2 en el 2.º espacio intercostal: la r de V2 baja de unos 3,5 a 1 mm y la P de V1 se hace negativa. Comprueba antes la colocación.'),
          marks: [{ auto: 'r', lead: 'V2' }],
        },
      ],
      predict: {
        question: l('V1–V2 贴高了两个肋间（第 2 肋间）。它们的 r 波会怎样？', 'V1–V2 are stuck two spaces too high (2nd intercostal space). What happens to their r waves?', 'V1–V2 se colocan dos espacios demasiado altas (2.º espacio intercostal). ¿Qué les pasa a sus ondas r?'),
        options: [l('变小', 'They shrink', 'Se hacen más pequeñas'), l('变高', 'They grow', 'Crecen'), l('不变', 'Nothing', 'Nada')],
        answer: 0,
      },
      caption: l(
        '移行区提前或推后只是描述，不是诊断。判断 R 波递增不良之前，先查 V1–V3 的电极位置。',
        'An early or late transition is a description, not a diagnosis. Before calling poor R-wave progression, check where V1–V3 sit.',
        'Una transición precoz o tardía es una descripción, no un diagnóstico. Antes de hablar de mala progresión de la R, comprueba dónde están V1–V3.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'horizontal-plane', params: { interactive: true } },
      caption: l(
        '胸导联观察的是横面。转动向量：与它垂直的导联就是移行区（R = S）。',
        'The chest leads look at the horizontal plane. Rotate the vector: the lead at 90° to it shows the transition (R = S).',
        'Las precordiales miran el plano horizontal. Gira el vector: la derivación a 90° de él muestra la transición (R = S).',
      ),
    },
    { kind: 'check', item: { family: 'axis-degrees', seed: 9 } },
    { kind: 'check', item: { family: 'axis-real', seed: 23 } },
    { kind: 'check', item: { family: 'axis-real', seed: 6 } },
    { kind: 'drill', families: ['axis-quadrant', 'axis-degrees', 'axis-real'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [13683, 7419, 9188],
      caption: l(
        '先判断象限（I 和 aVF，必要时看 II），再用最接近等电位的肢体导联求度数。揭晓后到完整病例页与机器测得的电轴比较。其中一位 18 岁女性被标注为左后分支阻滞：这个诊断只能在排除电轴右偏的其他原因之后作出，而瘦高的年轻人电轴本来就可能接近 +100°。你会这样下结论吗？',
        'Quadrant first (I and aVF, then II if needed), then the degrees from the most equiphasic limb lead. After revealing, compare with the machine axis on the full case page. One 18-year-old woman is labelled left posterior fascicular block: that diagnosis is made only after other causes of right axis deviation are excluded, and a slim young adult can have an axis near +100° anyway. Would you call it?',
        'Primero el cuadrante (I y aVF, y II si hace falta), después los grados con la derivación de miembros más isodifásica. Tras ver la solución, compara con el eje del equipo en la página del caso. Una mujer de 18 años lleva la etiqueta de bloqueo fascicular posterior izquierdo: ese diagnóstico solo se hace tras descartar otras causas de desviación del eje a la derecha, y un adulto joven y delgado puede tener un eje cercano a +100°. ¿Lo dirías tú?',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('只因 aVF 向下就诊断电轴左偏：先看 II 导联。', 'Calling left axis deviation because aVF is negative: check lead II first.', 'Diagnosticar desviación a la izquierda porque aVF es negativa: mira antes la derivación II.'),
        l('忘了检查记录：左右手电极接反会使 I 导联倒置，造成假的电轴右偏。', 'Forgetting the recording check: reversed arm cables flip lead I and fake a right axis.', 'Olvidar la comprobación del registro: con los cables de los brazos invertidos la derivación I se invierte y simula un eje derecho.'),
        l('把最小的 QRS 当成等电位：小不等于正负相等。', 'Taking the smallest QRS as the equiphasic one: small is not the same as equally up and down.', 'Tomar el QRS más pequeño como el isodifásico: pequeño no es lo mismo que igual hacia arriba que hacia abajo.'),
        l('不考虑年龄和体型，就把儿童或瘦高年轻人的偏右电轴判为异常。', 'Calling a rightward axis abnormal in a child or a slim young adult without considering age and build.', 'Considerar anormal un eje desviado a la derecha en un niño o un adulto joven delgado sin tener en cuenta la edad y la constitución.'),
        l('把“垂直心”“横位心”当诊断：直接用度数描述电轴。', 'Using “vertical heart” or “horizontal heart” as a diagnosis: describe the axis in degrees instead.', 'Usar “corazón vertical” u “horizontal” como diagnóstico: describe el eje en grados.'),
        l('不查 V1–V3 电极位置就把 R 波递增不良当成陈旧梗死。', 'Reading poor R-wave progression as an old infarct without checking V1–V3 placement.', 'Interpretar la mala progresión de la R como un infarto antiguo sin comprobar la colocación de V1–V3.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('正常电轴：−30° 至 +90°。', 'Normal axis: −30° to +90°.', 'Eje normal: −30° a +90°.'),
        l('象限看 I 和 aVF；I 正 aVF 负时由 II 决定（II 正 = 正常）。', 'Quadrant from I and aVF; when I is positive and aVF negative, lead II decides (II positive = normal).', 'Cuadrante con I y aVF; si I es positiva y aVF negativa, decide II (II positiva = normal).'),
        l('度数：与最接近等电位的肢体导联相差 90°，偏向正向一侧。', 'Degrees: 90° from the most equiphasic limb lead, toward the positive side.', 'Grados: a 90° de la derivación de miembros más isodifásica, hacia el lado positivo.'),
        l('胸导联：V1 rS → V3–V4 移行 → V6 qR；判断 R 波递增不良前先查电极位置。', 'Chest leads: rS in V1 → transition at V3–V4 → qR in V6; check placement before calling poor R-wave progression.', 'Precordiales: rS en V1 → transición en V3–V4 → qR en V6; comprueba la colocación antes de hablar de mala progresión de la R.'),
      ],
    },
  ],
  sources: [
    'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    'Rijnbeek PR et al. New normal limits for the paediatric electrocardiogram. Eur Heart J 2001;22:702-711',
    'MacKenzie R. Poor R-wave progression. J Insur Med 2005;37:58-62',
    'Castellano et al. 2004',
  ],
};

export default lesson;
