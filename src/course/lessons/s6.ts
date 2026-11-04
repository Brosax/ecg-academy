/**
 * S6 — The J point and measuring ST deviation (docs/PLAN.md §3, stage S).
 * Criteria: docs/curriculum/criteria.md `injury-st`, "STEMI — ST-elevation thresholds" (sex- and age-specific, at the J
 * point), "NSTE-ACS ischaemia — ST depression", "Supplemental leads", "Normal (male-pattern) ST elevation", `ap-ecg-map`,
 * "Recording chain — Filter bandwidth". Outdated (critic.json): one fixed millimetre threshold for everyone.
 * The engine's ST read-out (AutoMark `st60`, EcgTruth.stMv) is taken at J+60 ms; the criteria are stated at the J point.
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import { FILTER_PRESETS, type DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(dials ? { dials } : {}) },
});
/** anterior ST elevation at J+60 ≈ 3.0 mm (V2), 3.8 mm (V3), 2.2 mm (V4), 1.3 mm (V1); reciprocal 1.3 / 1.0 mm depression in III / aVF */
const ANTERIOR_REQ = { scenario: 'stemi-anterior', seed: 602, dials: { st: 0.3 } } as const;
const ANTERIOR: EcgSource = { kind: 'synth', req: ANTERIOR_REQ };
/** inferior ST elevation ≈ 2 mm (II, III, aVF; largest in III), reciprocal depression deepest in aVL */
const INFERIOR = synth('stemi-inferior', 603, { st: 0.25 });

const reciprocal: Item = {
  id: 's6:reciprocal-leads',
  family: 'territory',
  competency: 'C8',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '这份心电图 II、III、aVF 的 ST 段抬高。对应性（镜像）ST 压低最明显的是哪组导联？',
    'This ECG has ST elevation in II, III and aVF. Where is the reciprocal (mirror-image) ST depression clearest?',
    'Este ECG tiene elevación del ST en II, III y aVF. ¿Dónde se ve con más claridad el descenso recíproco (imagen especular) del ST?',
  ),
  ecg: synth('stemi-inferior', 606, { st: 0.25 }),
  explanation: l(
    'aVL（−30°）几乎正对着下壁导联（+60° 至 +120°）的反方向，所以下壁的损伤电流在 aVL 上表现为 ST 压低，I 导联也常常压低。这种对应性改变使急性闭塞的可能性更大。',
    'aVL (−30°) looks at the heart from almost opposite the inferior leads (+60° to +120°), so the inferior injury current shows up as ST depression in aVL, and often in I. Reciprocal change makes an acute occlusion more likely.',
    'aVL (−30°) mira el corazón casi desde el lado opuesto a las derivaciones inferiores (+60° a +120°), así que la corriente de lesión inferior aparece como descenso del ST en aVL, y a menudo en I. El cambio recíproco hace más probable una oclusión aguda.',
  ),
  findings: ['stemi-inferior', 'reciprocal-changes'],
  key: {
    options: [
      { id: 'avl', label: l('I 和 aVL', 'I and aVL', 'I y aVL') },
      { id: 'v1v2', label: l('V1 和 V2', 'V1 and V2', 'V1 y V2') },
      { id: 'v5v6', label: l('V5 和 V6', 'V5 and V6', 'V5 y V6') },
    ],
    correct: 'avl',
  },
};

const baseline: Item = {
  id: 's6:baseline',
  family: 'max-st',
  competency: 'C8',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l('测量 ST 偏移时，以什么作为基线？', 'What do you measure ST deviation against?', '¿Respecto a qué mides la desviación del ST?'),
  ecg: synth('normal', 607),
  explanation: l(
    '以 PR 段为基线（PR 段变形时用 TP 段），在 J 点测量 ST。S 波最低点和 T 波都不是基线：以它们为参照会凭空制造或掩盖 ST 偏移。',
    'Use the PR segment as the baseline (the TP segment if the PR segment is distorted) and measure the ST at the J point. Neither the bottom of the S wave nor the T wave is a baseline: measuring from them creates or hides ST shifts.',
    'Usa el segmento PR como línea de base (el TP si el PR está alterado) y mide el ST en el punto J. Ni el fondo de la onda S ni la onda T son una línea de base: medir desde ellos crea u oculta desviaciones del ST.',
  ),
  findings: [],
  key: {
    options: [
      { id: 'pr', label: l('PR 段（必要时用 TP 段）', 'The PR segment (or the TP segment)', 'El segmento PR (o el segmento TP)') },
      { id: 's', label: l('S 波的最低点', 'The lowest point of the S wave', 'El punto más bajo de la onda S') },
      { id: 't', label: l('T 波的顶点', 'The top of the T wave', 'El vértice de la onda T') },
    ],
    correct: 'pr',
  },
};

const lesson: Lesson = {
  id: 's6',
  stage: 'S',
  order: 6,
  title: l('J 点与 ST 段偏移的测量', 'The J point and measuring ST deviation', 'El punto J y la medición de la desviación del ST'),
  summary: l(
    '以 PR 段为基线，在 J 点测量 ST 偏移，按性别和年龄使用界值，并在相邻导联和对应导联中寻找证据。',
    'Measure ST deviation at the J point against the PR segment, apply the sex- and age-specific thresholds, and look for support in contiguous and reciprocal leads.',
    'Mide la desviación del ST en el punto J respecto al segmento PR, aplica los umbrales según sexo y edad, y busca apoyo en derivaciones contiguas y recíprocas.',
  ),
  objectives: [
    l('找到基线（PR 段）和 J 点。', 'Find the baseline (PR segment) and the J point.', 'Localizar la línea de base (segmento PR) y el punto J.'),
    l('以毫米测量 ST 偏移，并使用按性别和年龄区分的界值。', 'Measure ST deviation in millimetres and apply the sex- and age-specific thresholds.', 'Medir la desviación del ST en milímetros y aplicar los umbrales según sexo y edad.'),
    l('识别相邻导联组和对应性改变。', 'Recognise contiguous lead groups and reciprocal change.', 'Reconocer los grupos de derivaciones contiguas y el cambio recíproco.'),
  ],
  minutes: 16,
  competencies: ['C8'],
  findings: ['stemi-inferior', 'stemi-anterior', 'reciprocal-changes', 'early-repolarization'],
  blocks: [
    {
      kind: 'hook',
      ecg: INFERIOR,
      question: l(
        'ST 段在哪些导联偏移、偏移多少？先说出导联名称再往下读。',
        'Where is the ST segment shifted, and by how much? Name the leads before you read on.',
        '¿En qué derivaciones está desplazado el ST y cuánto? Nombra las derivaciones antes de seguir leyendo.',
      ),
      reveal: l(
        '**II、III、aVF** 的 ST 段抬高约 2 mm（III 最高），**aVL** 和 I 的 ST 段压低。下壁导联互相相邻，每个都 ≥ 1 mm，对侧又有镜像改变：符合下壁闭塞的 ST 抬高标准。本课讲怎么测量；第 I1–I4 课再讲怎么解读。',
        'ST elevation of about 2 mm in **II, III and aVF** (largest in III), with ST depression in **aVL** and I. The inferior leads are contiguous, each is ≥ 1 mm, and the opposite side shows the mirror image: this meets the ST-elevation criteria for an inferior occlusion. This lesson is about measuring it; lessons I1–I4 interpret it.',
        'Elevación del ST de unos 2 mm en **II, III y aVF** (máxima en III), con descenso del ST en **aVL** y en I. Las derivaciones inferiores son contiguas, cada una ≥ 1 mm, y el lado opuesto muestra la imagen especular: cumple los criterios de elevación del ST de una oclusión inferior. Esta lección trata de cómo medirlo; las lecciones I1–I4 lo interpretan.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'action-potential', params: { cell: 'ventricular' } },
      ecg: synth('normal', 601, { rate: 60 }),
      caption: l(
        'ST 段对应心室动作电位的平台期（2 相）：所有细胞电位几乎相同，没有电流，ST 平贴基线。损伤在平台期造成电位差，ST 就上移或下移。',
        'The ST segment is the plateau (phase 2) of the ventricular action potential: every cell sits at about the same voltage, no current flows and the ST lies on the baseline. Injury creates a voltage difference during the plateau, and the ST moves.',
        'El segmento ST es la meseta (fase 2) del potencial de acción ventricular: todas las células están casi al mismo voltaje, no fluye corriente y el ST queda sobre la línea de base. La lesión crea una diferencia de voltaje en la meseta y el ST se desplaza.',
      ),
    },
    {
      kind: 'worked',
      title: l('一步步测量 ST（58 岁男性，胸痛）', 'Measuring the ST, step by step (man, 58, chest pain)', 'Medir el ST, paso a paso (varón de 58 años, dolor torácico)'),
      ecg: ANTERIOR,
      steps: [
        {
          title: l('基线：PR 段', 'Baseline: the PR segment', 'Línea de base: el segmento PR'),
          body: l(
            '在 V2 找到 P 与 QRS 之间的平段，把它向右延长：这就是零线。',
            'In V2, find the flat stretch between the P and the QRS and imagine it extended to the right: that is your zero line.',
            'En V2, localiza el tramo plano entre la P y el QRS e imagínalo prolongado hacia la derecha: esa es tu línea cero.',
          ),
          marks: [{ auto: 'pr-segment', lead: 'V2' }],
          highlightLeads: ['V2'],
        },
        {
          title: l('J 点', 'The J point', 'El punto J'),
          body: l('S 波陡峭的上升支转为 ST 段的地方。', 'Where the steep upstroke of the S wave turns into the ST segment.', 'Donde la rama ascendente pronunciada de la onda S se convierte en el segmento ST.'),
          marks: [{ auto: 'j', lead: 'V2' }],
          highlightLeads: ['V2'],
        },
        {
          title: l('在 J 点测量', 'Measure at the J point', 'Mide en el punto J'),
          body: l(
            'V2 的 J 点明显高于基线：J 点约 2.6 mm，J+60 读数 3.0 mm；V3 更高（J 点约 3.3 mm，读数 3.8 mm）。40 岁以上男性 V2–V3 的界值是 2 mm：已超过。',
            'In V2 the J point sits well above the baseline: about 2.6 mm at J and 3.0 mm on the J+60 read-out; V3 is higher still (about 3.3 mm at J, 3.8 mm on the read-out). The V2–V3 limit for a man aged 40 or over is 2 mm: exceeded.',
            'En V2 el punto J está claramente por encima de la línea de base: unos 2,6 mm en J y 3,0 mm en la lectura de J+60; V3 está aún más alto (unos 3,3 mm en J y 3,8 mm en la lectura). El límite de V2–V3 para un varón de 40 años o más es 2 mm: superado.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }, { auto: 'st60', lead: 'V2' }, { auto: 'st60', lead: 'V3' }],
          highlightLeads: ['V2', 'V3'],
        },
        {
          title: l('相邻导联', 'Contiguous leads', 'Derivaciones contiguas'),
          body: l(
            'ST 抬高出现在相邻的导联：V2–V4 明显（V4 读数 2.2 mm），V1 读数 1.3 mm。诊断标准要求 ≥ 2 个相邻导联。I 和 aVL 只有不到 1 mm 的抬高：达不到界值，但方向一致。',
            'The ST elevation sits in neighbouring leads: clearly in V2–V4 (V4 reads 2.2 mm) and in V1 (1.3 mm). The criteria need at least 2 contiguous leads. I and aVL rise by less than 1 mm: below the threshold, but pointing the same way.',
            'La elevación del ST aparece en derivaciones vecinas: claramente en V2–V4 (V4 marca 2,2 mm) y en V1 (1,3 mm). Los criterios exigen al menos 2 derivaciones contiguas. I y aVL suben menos de 1 mm: no llegan al umbral, pero van en la misma dirección.',
          ),
          marks: [{ auto: 'st60', lead: 'V4' }, { auto: 'st60', lead: 'V1' }],
          highlightLeads: ['V1', 'V2', 'V3', 'V4'],
        },
        {
          title: l('对应导联', 'Reciprocal leads', 'Derivaciones recíprocas'),
          body: l(
            'III 和 aVF 的 ST 段读数分别压低 1.3 mm 和 1.0 mm：同一个损伤电流从对侧看到的样子。对应性改变使急性闭塞的可能性更大。',
            'III and aVF read 1.3 and 1.0 mm of ST depression: the same injury current seen from the opposite side. Reciprocal change makes an acute occlusion more likely.',
            'III y aVF marcan un descenso del ST de 1,3 y 1,0 mm: la misma corriente de lesión vista desde el lado opuesto. El cambio recíproco hace más probable una oclusión aguda.',
          ),
          marks: [{ auto: 'st60', lead: 'III' }, { auto: 'st60', lead: 'aVF' }],
          highlightLeads: ['III', 'aVF'],
        },
      ],
    },
    {
      kind: 'criteria',
      title: l('ST 偏移界值（新出现，在 J 点，≥ 2 个相邻导联）', 'ST thresholds (new, at the J point, in ≥ 2 contiguous leads)', 'Umbrales del ST (nuevos, en el punto J, en ≥ 2 derivaciones contiguas)'),
      items: [
        {
          label: l('怎样测量', 'How to measure', 'Cómo medir'),
          value: l(
            '基线用 PR 段（变形时用 TP 段；心率快时 TP 段会消失）；在 J 点量 ST 与基线的垂直距离，标准增益下 1 mm = 0.1 mV；J 点难定时可参考 J 点后 60 ms（J+60）的读数',
            'Baseline: the PR segment (TP if the PR is distorted; at fast rates the TP disappears). Measure the vertical distance from the baseline at the J point, 1 mm = 0.1 mV at standard gain; the reading 60 ms after J (J+60) helps when J is hard to pin down',
            'Línea de base: el segmento PR (el TP si el PR está alterado; con frecuencias rápidas el TP desaparece). Mide la distancia vertical a la línea de base en el punto J, 1 mm = 0,1 mV con ganancia estándar; la lectura 60 ms después de J (J+60) ayuda cuando J es difícil de precisar',
          ),
        },
        {
          label: l('V2–V3 抬高', 'Elevation in V2–V3', 'Elevación en V2–V3'),
          value: l('≥ 40 岁男性 ≥ 2 mm；< 40 岁男性 ≥ 2.5 mm；女性（任何年龄）≥ 1.5 mm', '≥ 2 mm in men ≥ 40 y; ≥ 2.5 mm in men < 40 y; ≥ 1.5 mm in women of any age', '≥ 2 mm en varones ≥ 40 años; ≥ 2,5 mm en varones < 40 años; ≥ 1,5 mm en mujeres de cualquier edad'),
        },
        { label: l('其他导联抬高', 'Elevation in all other leads', 'Elevación en las demás derivaciones'), value: l('≥ 1 mm', '≥ 1 mm', '≥ 1 mm') },
        { label: l('V7–V9 抬高', 'Elevation in V7–V9', 'Elevación en V7–V9'), value: l('≥ 0.5 mm（< 40 岁男性 ≥ 1 mm）', '≥ 0.5 mm (≥ 1 mm in men < 40 y)', '≥ 0,5 mm (≥ 1 mm en varones < 40 años)') },
        { label: l('V3R–V4R 抬高', 'Elevation in V3R–V4R', 'Elevación en V3R–V4R'), value: l('≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）', '≥ 0.5 mm (≥ 1 mm in men < 30 y)', '≥ 0,5 mm (≥ 1 mm en varones < 30 años)') },
        { label: l('ST 压低', 'ST depression', 'Descenso del ST'), value: l('新出现的水平型或下斜型压低 ≥ 0.5 mm', 'New horizontal or downsloping depression ≥ 0.5 mm', 'Descenso nuevo, horizontal o descendente, ≥ 0,5 mm') },
        {
          label: l('相邻导联组', 'Contiguous groups', 'Grupos contiguos'),
          value: l('下壁 II、III、aVF；侧壁 I、aVL、V5、V6；前壁 V1–V6', 'Inferior II, III, aVF; lateral I, aVL, V5, V6; anterior V1–V6', 'Inferior II, III, aVF; lateral I, aVL, V5, V6; anterior V1–V6'),
        },
        {
          label: l('适用条件', 'Conditions', 'Condiciones'),
          value: l('无左心室肥厚或左束支阻滞；以 PR/TP 段为基线；与旧心电图比较', 'No LVH or LBBB; PR/TP baseline; compare with prior ECGs', 'Sin HVI ni BRI; línea de base PR/TP; comparar con ECG previos'),
        },
      ],
      source: 'Thygesen K et al. Fourth Universal Definition of MI, Eur Heart J 2019;40:237 (section 27); Byrne RA et al. 2023 ESC ACS Guidelines, Eur Heart J 2023;44:3720; Wagner GS et al. AHA/ACCF/HRS Part VI, Circulation 2009;119:e262',
    },
    {
      kind: 'live',
      scenario: 'stemi-anterior',
      seed: 604,
      dials: [{ id: 'st' }],
      marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
      play: {
        dial: 'st',
        from: 0.22,
        to: 0.45,
        notes: [
          { min: 0.22, max: 0.24, text: l('电流小：J+60 读数 V3 约 +3 mm，III 约 −1 mm。', 'Small current: on the J+60 read-out V3 is about +3 mm and III about −1 mm.', 'Corriente pequeña: en la lectura de J+60, V3 está en unos +3 mm y III en unos −1 mm.') },
          { min: 0.25, max: 0.42, text: l('V2–V4 每升高一点，III 和 aVF 就同步压低一点。', 'Every step up in V2–V4 comes with a step down in III and aVF.', 'Cada subida en V2–V4 llega con una bajada en III y aVF.') },
          { min: 0.43, max: 0.45, text: l('电流大：V3 约 +5–6 mm，III 约 −2 mm。一个电流，两个视角：对应性改变。', 'Big current: V3 about +5–6 mm, III about −2 mm. One current, two views: reciprocity.', 'Corriente grande: V3 en unos +5–6 mm y III en unos −2 mm. Una corriente, dos puntos de vista: reciprocidad.') },
        ],
      },
      predict: {
        question: l('加大前壁的损伤电流，III 导联的 ST 会怎样？', 'Turn up the anterior injury current. What does the ST in III do?', 'Aumenta la corriente de lesión anterior. ¿Qué hace el ST en III?'),
        options: [l('更低：压低加深', 'Falls further', 'Baja más'), l('也抬高', 'Rises too', 'También sube'), l('保持平坦', 'Stays flat', 'Se queda plano')],
        answer: 0,
      },
      caption: l(
        '加大损伤电流：V2–V4 的 ST 升高，III 和 aVF 按比例下降。读数取 J 点后 60 ms。',
        'Turn up the injury current: the ST rises in V2–V4 and falls in proportion in III and aVF. The read-out is taken 60 ms after J.',
        'Aumenta la corriente de lesión: el ST sube en V2–V4 y baja en proporción en III y aVF. La lectura se toma 60 ms después de J.',
      ),
    },
    {
      kind: 'contrast',
      title: l('胸导联 ST 抬高：变异还是闭塞？', 'Precordial ST elevation: variant or occlusion?', 'Elevación del ST precordial: ¿variante u oclusión?'),
      left: {
        ecg: synth('early-repolarization', 605),
        caption: l('24 岁男性，体检', 'Man, 24, routine check', 'Varón de 24 años, revisión'),
        marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
      },
      right: {
        ecg: ANTERIOR,
        caption: l('58 岁男性，胸痛', 'Man, 58, chest pain', 'Varón de 58 años, dolor torácico'),
        marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
      },
      point: l(
        'A：ST 段从有切迹或顿挫的 J 点呈凹面向上抬起；V2–V3 低于 40 岁以下男性 2.5 mm 的界值；下壁导联（以及 V4–V6）J 点处的 ST 抬高 1–1.7 mm；除 aVR 外没有对应性压低。这是正常变异（第 S7 课）——但请注意，光凭毫米数并不能定论。B：V2–V3 的 ST 抬高远超 40 岁以上男性 2 mm 的界值，并延伸到 V1 和 V4，III 和 aVF 有对应性压低：在被排除之前，按急性前壁闭塞处理。',
        'A: concave ST rising from a notched or slurred J point. In V2–V3 it stays under the 2.5-mm limit for a man under 40; in the inferior leads (and V4–V6) the ST at the J point reaches 1–1.7 mm. There is no reciprocal ST depression except in aVR. A normal variant (lesson S7), but note that millimetres alone did not settle it. B: ST elevation in V2–V3 well above the 2-mm limit for a man over 40, spreading to V1 and V4, with reciprocal depression in III and aVF: acute anterior occlusion until proven otherwise.',
        'A: ST cóncavo que sube desde un punto J con muesca o empastamiento. En V2–V3 queda por debajo del límite de 2,5 mm para un varón menor de 40 años; en las derivaciones inferiores (y en V4–V6) el ST en el punto J llega a 1-1,7 mm. No hay descenso recíproco salvo en aVR. Una variante normal (lección S7), pero fíjate en que los milímetros por sí solos no lo resolvían. B: elevación del ST en V2–V3 muy por encima del límite de 2 mm para un varón de más de 40 años, que se extiende a V1 y V4, con descenso recíproco en III y aVF: oclusión anterior aguda mientras no se demuestre lo contrario.',
      ),
    },
    {
      kind: 'film',
      title: l('界值是提示，不是诊断', 'Thresholds flag, they do not diagnose', 'Los umbrales alertan, no diagnostican'),
      frames: [
        {
          label: l('损伤', 'Injury', 'Lesión'),
          ecg: ANTERIOR,
          note: l('J 点处 V2–V4 抬高 1.9–3.3 mm，III 和 aVF 压低 1–1.2 mm：超过界值，又有对应性改变。损伤。', 'At J, V2–V4 are up 1.9–3.3 mm and III and aVF down 1–1.2 mm: over the limits, with reciprocity. Injury.', 'En J, V2–V4 suben 1,9–3,3 mm y III y aVF bajan 1–1,2 mm: por encima de los umbrales y con reciprocidad. Lesión.'),
          marks: [{ auto: 'j', lead: 'V3' }, { auto: 'j', lead: 'V4' }],
        },
        {
          label: l('监护滤波', 'Monitor filter', 'Filtro de monitor'),
          ecg: { kind: 'synth', req: { ...ANTERIOR_REQ, recording: { filter: FILTER_PRESETS.monitor } } },
          note: l('同一份心电图换成 0.5–40 Hz 监护滤波：J 点处 V4 从约 1.9 mm 降到约 0.6 mm，V3 从约 3.3 mm 降到约 2.1 mm。', 'The same ECG on a 0.5–40 Hz monitor filter: at J, V4 falls from about 1.9 to 0.6 mm and V3 from about 3.3 to 2.1 mm.', 'El mismo ECG con filtro de monitor de 0,5–40 Hz: en J, V4 baja de unos 1,9 a 0,6 mm y V3 de unos 3,3 a 2,1 mm.'),
          marks: [{ auto: 'j', lead: 'V3' }, { auto: 'j', lead: 'V4' }],
        },
        {
          label: l('左束支阻滞', 'LBBB', 'Bloqueo de rama izquierda'),
          ecg: synth('lbbb', 608),
          note: l(
            'V1–V2 的 ST 抬高 2–2.5 mm，超过界值，但不到前面 S 波的 1/4（QRS 约 150 ms）：按 Smith 规则不可疑（第 I10 课）。',
            'ST up 2–2.5 mm in V1–V2, over the limits, but under a quarter of the depth of the S before it (QRS about 150 ms): not suspicious by the Smith rule (lesson I10).',
            'ST elevado 2–2,5 mm en V1–V2, por encima de los umbrales, pero menos de un cuarto de la profundidad de la S que lo precede (QRS de unos 150 ms): no sospechoso según la regla de Smith (lección I10).',
          ),
          marks: [{ auto: 'j', lead: 'V1' }, { auto: 'j', lead: 'V2' }],
        },
        {
          label: l('超急性 T 波', 'Hyperacute T', 'T hiperaguda'),
          ecg: synth('stemi-anterior-subtle', 608),
          note: l('V2–V3 的 ST 只抬高 0.9–1.2 mm，低于 52 岁男性 2 mm 的界值，但 V3 的 T 波与 R 波等高：闭塞可藏在界值下（第 I7 课）。', 'ST only 0.9–1.2 mm up in V2–V3, under the 2-mm limit for a man of 52, yet the T in V3 is as tall as the R: an occlusion can hide below the line (lesson I7).', 'El ST solo sube 0,9–1,2 mm en V2–V3, por debajo del límite de 2 mm de un varón de 52 años, pero la T de V3 es tan alta como la R: una oclusión puede esconderse bajo el umbral (lección I7).'),
          marks: [{ auto: 't', lead: 'V3' }, { auto: 'r', lead: 'V3' }],
        },
      ],
      predict: {
        question: l('把同一份心电图换成监护滤波（0.5–40 Hz），测到的 ST 会变吗？', 'Put the same ECG through a monitor filter (0.5–40 Hz). Can the ST you measure change?', 'Pasa el mismo ECG por un filtro de monitor (0,5–40 Hz). ¿Puede cambiar el ST que mides?'),
        options: [l('会：滤波可以制造或掩盖 ST 偏移', 'Yes: a filter can create or hide ST shifts', 'Sí: el filtro puede crear u ocultar desviaciones del ST'), l('不会：滤波只去除噪声', 'No: a filter only removes noise', 'No: el filtro solo quita ruido')],
        answer: 0,
      },
      caption: l(
        '毫米数只是第一步。再看对应性改变、形态、与 QRS 的比例、记录方式和旧心电图。',
        'Millimetres are only the first step. Then check reciprocity, shape, proportion to the QRS, how it was recorded and the previous ECG.',
        'Los milímetros son solo el primer paso. Después mira la reciprocidad, la forma, la proporción con el QRS, cómo se registró y el ECG previo.',
      ),
    },
    { kind: 'check', item: { inline: baseline } },
    { kind: 'check', item: { family: 'max-st', seed: 2 } },
    { kind: 'check', item: { inline: reciprocal } },
    { kind: 'check', item: { family: 'max-st', seed: 12 } },
    { kind: 'drill', families: ['max-st'], count: 6, passScore: 0.8 },
    {
      kind: 'real',
      ids: [13683, 5469],
      caption: l(
        '两份都被心脏科医师判为正常（19 岁和 39 岁男性）。以 PR 段为基线，在 J 点测量 V2–V3 的 ST，套用 40 岁以下男性的界值（< 2.5 mm）。再看形态：凹面型、T 波高大、无对应性压低。如果测到等于或超过界值，下一步是临床情况和旧心电图，而不是贴标签。',
        'Both were read as normal by cardiologists (men aged 19 and 39). Measure the ST at the J point in V2–V3 against the PR segment and apply the limit for men under 40 (< 2.5 mm). Then look at the shape: concave, tall T waves, no reciprocal depression. If you find a value at or above the limit, the next step is the clinical picture and the previous ECG, not a label.',
        'Los cardiólogos informaron ambos como normales (varones de 19 y 39 años). Mide el ST en el punto J en V2–V3 respecto al segmento PR y aplica el límite de los varones menores de 40 años (< 2,5 mm). Después mira la forma: cóncava, ondas T altas, sin descenso recíproco. Si obtienes un valor igual o superior al límite, el siguiente paso es la clínica y el ECG previo, no una etiqueta.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('从 S 波最低点或漂移的基线开始测量。', 'Measuring from the bottom of the S wave or from a wandering baseline.', 'Medir desde el fondo de la onda S o desde una línea de base que oscila.'),
        l('在 T 波上升支而不是 J 点测量。', 'Measuring on the T upstroke instead of at the J point.', 'Medir en la rama ascendente de la T en lugar de en el punto J.'),
        l('所有人用同一个界值：V2–V3 的界值取决于性别和年龄。', 'One threshold for everyone: the V2–V3 limits depend on sex and age.', 'Un umbral único para todos: los límites de V2–V3 dependen del sexo y la edad.'),
        l('只凭一个导联、或不相邻的导联下结论。', 'Calling ST elevation from a single lead, or from leads that are not contiguous.', 'Diagnosticar elevación del ST por una sola derivación o por derivaciones no contiguas.'),
        l('忘了看对应导联。', 'Forgetting the reciprocal leads.', 'Olvidar las derivaciones recíprocas.'),
        l('在监护滤波（0.5–40 Hz）的图上读 ST：它会制造或掩盖 ST 偏移。', 'Reading the ST on a monitor-filtered (0.5–40 Hz) tracing: it can create or hide ST shifts.', 'Leer el ST en un trazado con filtro de monitorización (0,5–40 Hz): puede crear u ocultar desviaciones del ST.'),
        l('在左束支阻滞、起搏心律或左心室肥厚时直接套用这些界值（第 I10 课）。', 'Applying these thresholds unchanged with LBBB, a paced rhythm or LVH (lesson I10).', 'Aplicar estos umbrales sin más con BRI, ritmo de marcapasos o HVI (lección I10).'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('基线是 PR 段（必要时用 TP 段）；在 J 点测量。', 'The baseline is the PR segment (TP if needed); measure at the J point.', 'La línea de base es el segmento PR (TP si hace falta); mide en el punto J.'),
        l('ST 抬高：相邻 2 个导联 ≥ 1 mm；V2–V3 男 ≥ 40 岁 ≥ 2 mm、男 < 40 岁 ≥ 2.5 mm、女性 ≥ 1.5 mm。', 'ST elevation: ≥ 1 mm in 2 contiguous leads; in V2–V3 ≥ 2 mm (men ≥ 40), ≥ 2.5 mm (men < 40), ≥ 1.5 mm (women).', 'Elevación del ST: ≥ 1 mm en 2 derivaciones contiguas; en V2–V3 ≥ 2 mm (varones ≥ 40), ≥ 2,5 mm (varones < 40), ≥ 1,5 mm (mujeres).'),
        l('ST 压低：相邻 2 个导联水平型或下斜型 ≥ 0.5 mm。', 'ST depression: ≥ 0.5 mm, horizontal or downsloping, in 2 contiguous leads.', 'Descenso del ST: ≥ 0,5 mm, horizontal o descendente, en 2 derivaciones contiguas.'),
        l('寻找对应性改变并看形态：界值只是提示，不是诊断。', 'Look for reciprocity and shape: thresholds flag, they do not diagnose.', 'Busca la reciprocidad y mira la forma: los umbrales alertan, no diagnostican.'),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction (2018). Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Wagner GS et al. AHA/ACCF/HRS Part VI: Acute ischemia/infarction. Circulation 2009;119:e262-e270',
    'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    'Macfarlane PW et al. The early repolarization pattern: a consensus paper. J Am Coll Cardiol 2015;66:470-477',
    'Castellano et al. 2004',
  ],
};

export default lesson;
