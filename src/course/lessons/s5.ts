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
      kind: 'text',
      title: l('六轴系统，一句话一个导联', 'The hexaxial wheel, one line per lead', 'El sistema hexaxial, una línea por derivación'),
      body: l(
        '每个肢体导联从一个角度观察额面：I 0°、II +60°、aVF +90°、III +120°、aVL −30°、aVR −150°。\n- QRS 在指向平均向量的导联上最正；\n- 在与平均向量垂直的导联上呈等电位（正负相等）。\n互相垂直的导联对：I 与 aVF、II 与 aVL、III 与 aVR。',
        'Each limb lead views the frontal plane from one angle: I 0°, II +60°, aVF +90°, III +120°, aVL −30°, aVR −150°.\n- The QRS is most positive in the lead pointing along the mean vector;\n- it is equiphasic (as much up as down) in the lead at 90° to it.\nPerpendicular pairs: I and aVF, II and aVL, III and aVR.',
        'Cada derivación de miembros mira el plano frontal desde un ángulo: I 0°, II +60°, aVF +90°, III +120°, aVL −30°, aVR −150°.\n- El QRS es más positivo en la derivación que apunta en la dirección del vector medio;\n- es isodifásico (tanto hacia arriba como hacia abajo) en la derivación a 90° de él.\nParejas perpendiculares: I y aVF, II y aVL, III y aVR.',
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
      ],
      source: 'Surawicz B et al. AHA/ACCF/HRS Part III, Circulation 2009;119:e235; Mason JW et al. Part II, Circulation 2007;115:1325; Kligfield P et al. Part I, Circulation 2007;115:1306; Rijnbeek PR et al. Eur Heart J 2001;22:702',
    },
    {
      kind: 'text',
      title: l('两步法：先象限，再度数', 'Two steps: quadrant, then degrees', 'Dos pasos: cuadrante y después grados'),
      body: l(
        '**第一步——象限**（看 I 和 aVF 的 QRS 净方向）：\n- I 正、aVF 正：正常（0° 至 +90°）\n- I 正、aVF 负：看 II。II 正 → 正常（0° 至 −30°）；II 负 → 电轴左偏\n- I 负、aVF 正：电轴右偏\n- I 负、aVF 负：右上方（极度）电轴\n**第二步——度数**：找最接近等电位的肢体导联，电轴与它相差 90°，偏向与它垂直的那个导联呈正向的一侧。',
        '**Step 1, quadrant** (net QRS direction in I and aVF):\n- I + and aVF +: normal (0° to +90°)\n- I + and aVF −: check II. II + → normal (0° to −30°); II − → left axis deviation\n- I − and aVF +: right axis deviation\n- I − and aVF −: right superior (extreme) axis\n**Step 2, degrees**: find the most equiphasic limb lead. The axis lies 90° away from it, on the side where the perpendicular lead is positive.',
        '**Paso 1, cuadrante** (dirección neta del QRS en I y aVF):\n- I + y aVF +: normal (0° a +90°)\n- I + y aVF −: mira II. II + → normal (0° a −30°); II − → desviación a la izquierda\n- I − y aVF +: desviación a la derecha\n- I − y aVF −: eje superior derecho (extremo)\n**Paso 2, grados**: busca la derivación de miembros más isodifásica. El eje está a 90° de ella, hacia el lado en que la derivación perpendicular es positiva.',
      ),
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
      view: { layout: '6x2', highlightLeads: ['I', 'II', 'aVF', 'aVL'] },
      caption: l(
        '把电轴从 0° 转到 +80°。0° 时 aVF 接近等电位，+60° 左右是 aVL，越接近 +90° I 导联越小。等电位的导联总是与电轴相差 90°。',
        'Turn the axis from 0° to +80°. At 0° aVF is nearly equiphasic; around +60° it is aVL; and as you approach +90°, lead I shrinks. The equiphasic lead always sits 90° from the axis.',
        'Gira el eje de 0° a +80°. A 0° aVF es casi isodifásica; hacia +60° lo es aVL; y al acercarte a +90° la derivación I se hace pequeña. La derivación isodifásica siempre está a 90° del eje.',
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
      kind: 'text',
      title: l('胸导联：R 波递增', 'Chest leads: R-wave progression', 'Precordiales: progresión de la onda R'),
      body: l(
        '从 V1 到 V6，QRS 按可预测的方式变化：\n- V1–V2：小 r、深 S（rS）\n- V3–V4：R ≈ S——**移行区**\n- V5–V6：高 R，S 小或无，常有小的间隔 q 波（qRs）\n移行区提前（V1–V2）或推后（V5–V6）只是描述，不是诊断。R 波递增不良（V3 的 R ≤ 3 mm）原因很多——V1–V2 电极放置错误、左心室肥厚、陈旧性前壁梗死、肺部疾病——下结论前先检查电极位置。',
        'From V1 to V6 the QRS changes in a predictable way:\n- V1–V2: small r, deep S (rS)\n- V3–V4: R ≈ S, the **transition**\n- V5–V6: tall R, small or no S, often a small septal q (qRs)\nAn early transition (V1–V2) or a late one (V5–V6) is a description, not a diagnosis. Poor R-wave progression (R in V3 ≤ 3 mm) has many causes (misplaced V1–V2, LVH, an old anterior infarct, lung disease), so check the electrode placement before you read anything into it.',
        'De V1 a V6 el QRS cambia de forma predecible:\n- V1–V2: r pequeña y S profunda (rS)\n- V3–V4: R ≈ S, la **transición**\n- V5–V6: R alta, S pequeña o ausente, a menudo una q septal pequeña (qRs)\nUna transición precoz (V1–V2) o tardía (V5–V6) es una descripción, no un diagnóstico. La mala progresión de la R (R en V3 ≤ 3 mm) tiene muchas causas (V1–V2 mal colocadas, HVI, un infarto anterior antiguo, enfermedad pulmonar), así que comprueba la colocación de los electrodos antes de interpretarla.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('normal', 504),
      view: { layout: '6x2' },
      marks: [
        { auto: 'r', lead: 'V1' },
        { auto: 's', lead: 'V1' },
        { auto: 'r', lead: 'V4' },
        { auto: 's', lead: 'V4' },
        { auto: 'r', lead: 'V6' },
      ],
      caption: l(
        '正常递增：V1 呈 rS，R 波在 V3 附近超过 S 波，V6 呈 qR/qRs。',
        'Normal progression: rS in V1, the R overtakes the S around V3, qR or qRs in V6.',
        'Progresión normal: rS en V1, la R supera a la S hacia V3, qR o qRs en V6.',
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
