/**
 * f5 — Electrode placement, colour codes, right-sided and posterior leads (stage F, docs/PLAN.md §3).
 * Criteria: docs/curriculum/criteria.md `precordial-positions`, `limb-electrode-colours`, `extra-chest-leads`,
 * `exercise-lead-system`, precordial misplacement / high right precordial leads / electrode placement in women /
 * patient preparation ("missing in the book").
 * Extra leads (V3R/V4R, V7–V9): the engine records them (SynthRequest.extraLeads) and the viewer offers them in its lead
 * picker, but they only matter on an infarction tracing — here they are taught with the electrodes figure and the UDMI
 * thresholds, and read on tracings in lessons i4 and i6. High V1–V2 placement is shown on the catalogue scenario
 * `precordial-misplacement-high` (negative P, tiny r, inverted T in V1; the engine draws no r′ there, so the text does
 * not claim one on that tracing).
 */
import type { Lesson } from '../api';
import { l } from '../../core/l10n';
import { choiceItem, PLACEMENT, SRC, syn } from './f-shared';

const lesson: Lesson = {
  id: 'f5',
  stage: 'F',
  order: 5,
  title: l('电极放置、颜色标识、右胸导联与后壁导联', 'Electrode placement, colour codes, right-sided and posterior leads', 'Colocación de los electrodos, código de colores, derivaciones derechas y posteriores'),
  summary: l(
    '每个电极放在哪里，怎样找体表标志，两套颜色标识，以及回答特定问题的附加导联。',
    'Where each electrode goes, how to find the landmarks, the two colour codes, and the extra leads that answer specific questions.',
    'Dónde va cada electrodo, cómo encontrar las referencias anatómicas, los dos códigos de colores y las derivaciones adicionales que responden a preguntas concretas.',
  ),
  objectives: [
    l('借助触诊找到的体表标志放置 V1–V6。', 'Place V1–V6 using palpated landmarks.', 'Colocar V1-V6 con referencias anatómicas palpadas.'),
    l('认识 IEC 和 AHA 两套颜色标识。', 'Know the IEC and AHA colour codes.', 'Conocer los códigos de colores IEC y AHA.'),
    l(
      '放置 V3R/V4R 和 V7–V9，并知道何时需要记录它们。',
      'Place V3R/V4R and V7–V9 and know when to record them.',
      'Colocar V3R/V4R y V7-V9 y saber cuándo registrarlas.',
    ),
    l(
      '识别胸导联电极放错或接错时心电图的变化。',
      'Recognise how chest-electrode errors change the tracing.',
      'Reconocer cómo cambian el trazado los errores de los electrodos precordiales.',
    ),
  ],
  minutes: 11,
  competencies: ['C1', 'C12'],
  findings: ['precordial-misplacement'],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 511, undefined, PLACEMENT.v2v3),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] },
      question: l(
        '从 V1 到 V6 追踪 R 波。它的变化符合胸导联电极的排列顺序吗？',
        'Follow the R wave from V1 to V6. Does it change the way the chest electrodes are laid out?',
        'Sigue la onda R de V1 a V6. ¿Cambia como cabría esperar según la disposición de los electrodos precordiales?',
      ),
      reveal: l(
        '不符合：R 波从 V1 到 V2 增高，到 V3 又变小，V4 再增高。相邻电极之间心脏不会这样变化——**V2 和 V3 的导线接反了**。R 波递增反映的是电极的位置，所以单个导联的“跳跃”首先要怀疑放置错误。',
        'No: R grows from V1 to V2, falls in V3 and grows again in V4. The heart does not do that between neighbouring electrodes — **the V2 and V3 cables are swapped**. R-wave progression follows electrode position, so an isolated “jump” in one lead is a placement error until proven otherwise.',
        'No: la R crece de V1 a V2, disminuye en V3 y vuelve a crecer en V4. El corazón no cambia así entre electrodos vecinos: **los cables de V2 y V3 están intercambiados**. La progresión de la R sigue la posición de los electrodos, así que un «salto» aislado en una derivación es un error de colocación mientras no se demuestre lo contrario.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'electrodes', params: { highlight: ['V1', 'V2', 'V4'] } },
      caption: l(
        '点击电极查看它的体表标志。从胸骨角（Louis 角）开始：它平第 2 肋。向下数到第 4 肋间隙放 V1、V2，再在锁骨中线第 5 肋间隙放 V4。',
        'Click an electrode to see its landmark. Start at the sternal angle (of Louis): it marks the 2nd rib. Count down to the 4th intercostal space for V1 and V2, then to the 5th space on the midclavicular line for V4.',
        'Haz clic en un electrodo para ver su referencia. Empieza en el ángulo esternal (de Louis): marca la 2.ª costilla. Baja hasta el 4.º espacio intercostal para V1 y V2, y hasta el 5.º espacio en la línea medioclavicular para V4.',
      ),
    },
    {
      kind: 'criteria',
      title: l('胸导联电极', 'Chest electrodes', 'Electrodos precordiales'),
      items: [
        { label: l('V1', 'V1', 'V1'), value: l('第 4 肋间隙，胸骨右缘', '4th intercostal space, right sternal border', '4.º espacio intercostal, borde esternal derecho') },
        { label: l('V2', 'V2', 'V2'), value: l('第 4 肋间隙，胸骨左缘', '4th intercostal space, left sternal border', '4.º espacio intercostal, borde esternal izquierdo') },
        { label: l('V3', 'V3', 'V3'), value: l('V2 与 V4 连线的中点', 'midway between V2 and V4', 'a medio camino entre V2 y V4') },
        { label: l('V4', 'V4', 'V4'), value: l('第 5 肋间隙，左锁骨中线', '5th intercostal space, left midclavicular line', '5.º espacio intercostal, línea medioclavicular izquierda') },
        { label: l('V5', 'V5', 'V5'), value: l('左腋前线，与 V4 同一水平', 'left anterior axillary line, at the level of V4', 'línea axilar anterior izquierda, a la altura de V4') },
        {
          label: l('V6', 'V6', 'V6'),
          value: l(
            '左腋中线，与 V4、V5 同一水平（不要沿第 5 肋间隙向外下走）',
            'left mid-axillary line, at the level of V4 and V5 (do not follow the 5th space round and down)',
            'línea axilar media izquierda, a la altura de V4 y V5 (no sigas el 5.º espacio hacia abajo)',
          ),
        },
        {
          label: l('女性', 'Women', 'Mujeres'),
          value: l('V4–V6 放在乳房下方的胸壁上，保持标准水平', 'V4–V6 on the chest wall under the breast, at the standard level', 'V4-V6 sobre la pared torácica, debajo de la mama, a la altura estándar'),
        },
      ],
      source:
        'Kligfield 2007 AHA/ACCF/HRS Part I (Circulation 2007;115:1306); SCST Clinical Guidelines by Consensus: Recording a standard 12-lead ECG (2017, rev. 2020)',
    },
    {
      kind: 'criteria',
      title: l('两套颜色标识', 'The two colour codes', 'Los dos códigos de colores'),
      items: [
        {
          label: l('IEC（欧洲、西班牙、中国）', 'IEC (Europe, Spain, China)', 'IEC (Europa, España, China)'),
          value: l(
            'RA 红 · LA 黄 · LL 绿 · RL 黑；C1–C6：红、黄、绿、棕、黑、紫',
            'RA red · LA yellow · LL green · RL black; C1–C6: red, yellow, green, brown, black, violet',
            'RA rojo · LA amarillo · LL verde · RL negro; C1-C6: rojo, amarillo, verde, marrón, negro, violeta',
          ),
        },
        {
          label: l('AHA（美国、加拿大）', 'AHA (USA, Canada)', 'AHA (EE. UU., Canadá)'),
          value: l(
            'RA 白 · LA 黑 · LL 红 · RL 绿；V1–V6：红、黄、绿、蓝、橙、紫',
            'RA white · LA black · LL red · RL green; V1–V6: red, yellow, green, blue, orange, purple',
            'RA blanco · LA negro · LL rojo · RL verde; V1-V6: rojo, amarillo, verde, azul, naranja, morado',
          ),
        },
        {
          label: l('肢体电极', 'Limb electrodes', 'Electrodos de los miembros'),
          value: l(
            '静息心电图放在四肢上；放在躯干上（Mason–Likar）用于运动试验，会改变电轴和下壁导联电压——必须在图上注明',
            'on the limbs for a resting ECG; torso placement (Mason–Likar) is for exercise testing and changes the axis and inferior voltages — write it on the tracing',
            'en los miembros para un ECG de reposo; la colocación en el tronco (Mason-Likar) es para la prueba de esfuerzo y cambia el eje y los voltajes inferiores: hay que anotarlo en el trazado',
          ),
        },
      ],
      source:
        'IEC 60601-2-25:2011 (IEC colour code); ANSI/AAMI EC53 (AHA colour code); Kligfield 2007 AHA/ACCF/HRS Part I; Fletcher GF et al. AHA exercise standards, Circulation 2013;128:873-934',
    },
    {
      kind: 'worked',
      title: l('胸导联顺序是否合理？', 'Does the chest sequence make sense?', '¿Tiene sentido la secuencia precordial?'),
      ecg: syn('normal', 512),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('V1：rS', 'V1: rS', 'V1: rS'),
          body: l(
            'V1 在胸骨右缘，正对右心室和室间隔：小 r 波、深 S 波。P 波在 V1 常为正负双向。',
            'V1 sits at the right sternal border, facing the right ventricle and septum: small r, deep S. P is often biphasic (+/−) in V1.',
            'V1 está en el borde esternal derecho, frente al ventrículo derecho y el tabique: r pequeña, S profunda. La P suele ser bifásica (+/−) en V1.',
          ),
          marks: [
            { auto: 'r', lead: 'V1' },
            { auto: 's', lead: 'V1' },
          ],
          highlightLeads: ['V1'],
        },
        {
          title: l('R 波逐步增高', 'R grows step by step', 'La R crece paso a paso'),
          body: l(
            '电极向左移动，越来越正对左心室：R 波一导一导地增高，S 波一导一导地变浅，没有跳跃。',
            'As the electrodes move left they face more of the left ventricle: R grows and S shrinks lead by lead, with no jumps.',
            'Al desplazarse a la izquierda, los electrodos miran cada vez más al ventrículo izquierdo: la R crece y la S disminuye derivación a derivación, sin saltos.',
          ),
          marks: [
            { auto: 'r', lead: 'V2' },
            { auto: 'r', lead: 'V3' },
            { auto: 'r', lead: 'V4' },
          ],
          highlightLeads: ['V2', 'V3', 'V4'],
        },
        {
          title: l('移行区', 'The transition', 'La transición'),
          body: l(
            'R ≈ S 的导联通常是 V3 或 V4。移行区明显提前或推后，先核对电极位置，再考虑心脏的原因。',
            'The lead where R ≈ S is usually V3 or V4. If the transition is clearly early or late, check the electrode positions before you look for a cardiac cause.',
            'La derivación con R ≈ S suele ser V3 o V4. Si la transición está claramente adelantada o retrasada, comprueba la posición de los electrodos antes de buscar una causa cardiaca.',
          ),
          highlightLeads: ['V3', 'V4'],
        },
        {
          title: l('V5–V6：qR，与 I 相似', 'V5–V6: qR, like lead I', 'V5-V6: qR, como la derivación I'),
          body: l(
            'V5、V6 从左侧看左心室，形态应与 I、aVL 相近：小 q 波、高 R 波。',
            'V5 and V6 look at the left ventricle from the side, so they should resemble I and aVL: small q, tall R.',
            'V5 y V6 miran al ventrículo izquierdo de lado, así que deben parecerse a I y aVL: q pequeña y R alta.',
          ),
          marks: [{ auto: 'r', lead: 'V6' }],
          highlightLeads: ['V5', 'V6', 'I', 'aVL'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('同一颗心脏，两种接线', 'One heart, two hook-ups', 'Un corazón, dos conexiones'),
      view: { layout: '3x4+1' },
      left: {
        ecg: syn('normal', 513),
        caption: l('记录 A', 'Recording A', 'Registro A'),
        marks: [
          { auto: 'r', lead: 'V1' },
          { auto: 'r', lead: 'V3' },
        ],
      },
      right: {
        ecg: syn('normal', 513, undefined, PLACEMENT.v1v3),
        caption: l('记录 B', 'Recording B', 'Registro B'),
        marks: [
          { auto: 'r', lead: 'V1' },
          { auto: 'r', lead: 'V3' },
        ],
      },
      point: l(
        '两份记录来自同一颗心脏：肢体导联完全相同。B 的 V1 出现高 R 波，而 V3 却是本该属于 V1 的 rS——V1 和 V3 的导线接反了。心脏疾病使相邻导联逐渐变化；导线接反则是整条波形互换。',
        'Both recordings come from the same heart: the limb leads are identical. In B, V1 shows a tall R while V3 shows the rS that belongs to V1 — the V1 and V3 cables are swapped. Heart disease changes neighbouring leads gradually; a cable swap exchanges whole traces.',
        'Los dos registros proceden del mismo corazón: las derivaciones de los miembros son idénticas. En B, V1 muestra una R alta y V3 el rS que corresponde a V1: los cables de V1 y V3 están intercambiados. La enfermedad cardiaca cambia las derivaciones vecinas de forma gradual; un intercambio de cables cambia trazados enteros.',
      ),
    },
    {
      kind: 'text',
      title: l('回答特定问题的附加导联', 'Extra leads for specific questions', 'Derivaciones adicionales para preguntas concretas'),
      body: l(
        '- **右胸导联**（V3R–V6R 与 V3–V6 左右对称；**V4R**：右侧第 5 肋间隙锁骨中线）：下壁梗死时寻找右心室受累。\n- **后壁导联** V7（腋后线）、V8（肩胛下角线）、V9（左脊柱旁），都与 V6 在同一水平：V1–V4 出现 ST 段压低时，观察下基底（“后”）壁。\n- 在普通 12 通道心电图机上，它们借用 V 导联的通道记录：**一定要在图上写明实际位置**。\n缺血与梗死阶段（第 i4、i6 课）会用到它们。',
        '- **Right-sided leads** (V3R–V6R mirror V3–V6; **V4R**: 5th right intercostal space, midclavicular line) look for right-ventricular involvement in an inferior infarction.\n- **Posterior leads** V7 (posterior axillary line), V8 (tip of the scapula) and V9 (left paravertebral border), all at the level of V6, look at the inferobasal (“posterior”) wall when V1–V4 show ST depression.\n- On a standard 12-channel machine they are recorded in the V-lead channels: **write the real position on the tracing**.\nThe ischaemia stage (lessons i4 and i6) uses them.',
        '- **Derivaciones derechas** (V3R-V6R son la imagen especular de V3-V6; **V4R**: 5.º espacio intercostal derecho, línea medioclavicular): buscan afectación del ventrículo derecho en un infarto inferior.\n- **Derivaciones posteriores** V7 (línea axilar posterior), V8 (punta de la escápula) y V9 (borde paravertebral izquierdo), todas a la altura de V6: miran la cara inferobasal («posterior») cuando V1-V4 muestran descenso del ST.\n- En un electrocardiógrafo estándar de 12 canales se registran en los canales de las V: **anota la posición real en el trazado**.\nLa etapa de isquemia (lecciones i4 e i6) las utiliza.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'electrodes', params: { showExtra: true, highlight: ['V4R', 'V7', 'V8', 'V9'] } },
      caption: l(
        '右胸导联和后壁导联的位置（右侧为背面观）。',
        'Right-sided and posterior positions (back view on the right).',
        'Posiciones de las derivaciones derechas y posteriores (vista posterior a la derecha).',
      ),
    },
    {
      kind: 'criteria',
      title: l('什么时候加做', 'When to add them', 'Cuándo añadirlas'),
      items: [
        {
          label: l('V3R/V4R：右心室受累', 'V3R/V4R: right-ventricular involvement', 'V3R/V4R: afectación del ventrículo derecho'),
          value: l('ST 段抬高 ≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）', 'ST elevation ≥ 0.5 mm (≥ 1 mm in men < 30 years)', 'ascenso del ST ≥ 0,5 mm (≥ 1 mm en varones < 30 años)'),
        },
        {
          label: l('V7–V9：后壁（下基底）梗死', 'V7–V9: posterior (inferobasal) infarction', 'V7-V9: infarto posterior (inferobasal)'),
          value: l('ST 段抬高 ≥ 0.5 mm（< 40 岁男性 ≥ 1 mm）', 'ST elevation ≥ 0.5 mm (≥ 1 mm in men < 40 years)', 'ascenso del ST ≥ 0,5 mm (≥ 1 mm en varones < 40 años)'),
        },
        {
          label: l('高位 V1–V2（第 2–3 肋间隙）', 'High V1–V2 (2nd–3rd space)', 'V1-V2 altas (2.º-3.er espacio)'),
          value: l(
            '只在有意寻找 Brugada 1 型图形时使用，并在图上注明',
            'only on purpose, to look for a Brugada type 1 pattern — and labelled on the tracing',
            'solo de forma deliberada, para buscar un patrón de Brugada tipo 1, y anotado en el trazado',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of MI, Eur Heart J 2019;40:237; Byrne RA et al. 2023 ESC ACS Guidelines, Eur Heart J 2023;44:3720; Zeppenfeld K et al. 2022 ESC VA/SCD Guidelines, Eur Heart J 2022;43:3997',
    },
    {
      kind: 'check',
      item: {
        inline: choiceItem({
          family: 'artefacts',
          competency: 'C12',
          seed: 51001,
          ecg: syn('normal', 514, undefined, PLACEMENT.v1v2),
          view: { layout: '3x4+1' },
          findings: ['precordial-misplacement'],
          prompt: l(
            '这位健康成人的胸导联有一处不合理。哪两根导线接反了？',
            'Something in the chest leads of this healthy adult does not fit. Which two cables were swapped?',
            'Algo no cuadra en las precordiales de este adulto sano. ¿Qué dos cables se intercambiaron?',
          ),
          hint: l('比较 V1 和 V2 的 r 波以及 P 波。', 'Compare the r wave and the P wave in V1 and V2.', 'Compara la onda r y la onda P de V1 y V2.'),
          options: [
            { id: 'v1v2', label: l('V1 和 V2', 'V1 and V2', 'V1 y V2') },
            { id: 'v3v4', label: l('V3 和 V4', 'V3 and V4', 'V3 y V4') },
            { id: 'v5v6', label: l('V5 和 V6', 'V5 and V6', 'V5 y V6') },
            { id: 'none', label: l('没有接反', 'None: the recording is correct', 'Ninguno: el registro es correcto') },
          ],
          correct: 'v1v2',
          explanation: l(
            'V1 的 r 波比 V2 的还大，V1 的 P 波直立而 V2 的 P 波却是双向的：这两条波形互换了位置。R 波应从 V1 到 V2 逐渐增大，V1 的 P 波常呈正负双向。纠正导线后重新记录。',
            'The r wave is larger in V1 than in V2, and P is upright in V1 but biphasic in V2: the two traces have changed places. R should grow from V1 to V2, and the biphasic P usually belongs to V1. Correct the cables and record again.',
            'La r es mayor en V1 que en V2, y la P es positiva en V1 pero bifásica en V2: los dos trazados han cambiado de sitio. La R debe crecer de V1 a V2, y la P bifásica suele corresponder a V1. Corrige los cables y repite el registro.',
          ),
        }),
      },
    },
    {
      kind: 'check',
      item: {
        inline: choiceItem({
          family: 'artefacts',
          competency: 'C12',
          seed: 51003,
          ecg: syn('precordial-misplacement-high', 515),
          view: { layout: '3x4+1' },
          findings: ['precordial-misplacement'],
          prompt: l(
            '45 岁健康男性。比较 V1、V2 与 V3 的 P 波、R 波和 T 波。最可能的解释是什么？',
            'A healthy 45-year-old man. Compare the P wave, the R wave and the T wave of V1 and V2 with those of V3. What is the most likely explanation?',
            'Varón sano de 45 años. Compara la onda P, la onda R y la onda T de V1 y V2 con las de V3. ¿Cuál es la explicación más probable?',
          ),
          hint: l('先看 V1 和 V2 的 P 波方向。', 'Look at the direction of the P wave in V1 and V2 first.', 'Mira primero la dirección de la onda P en V1 y V2.'),
          options: [
            { id: 'high', label: l('V1、V2 电极放得太高', 'V1 and V2 placed too high', 'V1 y V2 colocadas demasiado altas') },
            { id: 'mi', label: l('陈旧性前间壁梗死', 'Old anteroseptal infarction', 'Infarto anteroseptal antiguo') },
            { id: 'swap', label: l('V1 和 V2 导线接反', 'V1 and V2 cables swapped', 'Cables de V1 y V2 intercambiados') },
            { id: 'none', label: l('记录正确', 'Correct recording', 'Registro correcto') },
          ],
          correct: 'high',
          explanation: l(
            'V1 的 P 波倒置（V2 的 P 波几乎平坦），V1–V2 的 r 波很小、到 V3 突然变成正常的 R 波，V1 的 T 波倒置，而 V3–V6 和肢体导联都正常。电极放在第 2–3 肋间隙时，从上方观察心房和右心室流出道：P 波像 aVR 一样变为负向，r 波变小——R 波递增不良，类似陈旧性前间壁梗死（在另一些心脏上还会出现 rSr′ 或类似 Brugada 的 ST 段）。V1 的负向 P 波就是线索：从胸骨角重新找第 4 肋间隙，然后重新记录。',
            'The P wave is negative in V1 (and almost flat in V2), the r waves in V1–V2 are tiny with a sudden jump to a normal R in V3, and the T in V1 is inverted, while V3–V6 and the limb leads are normal. Electrodes in the 2nd–3rd intercostal space look at the atria and the right-ventricular outflow from above: the P wave turns negative, as in aVR, and the r shrinks — poor R progression that mimics an old anteroseptal infarct (on other hearts also an rSr′ or a Brugada-like ST). The negative P in V1 is the clue: find the 4th space again from the sternal angle and record again.',
            'La onda P es negativa en V1 (y casi plana en V2), las r de V1-V2 son diminutas y saltan de golpe a una R normal en V3, y la T de V1 es negativa, mientras que V3-V6 y las derivaciones de los miembros son normales. Los electrodos en el 2.º-3.er espacio intercostal miran las aurículas y el tracto de salida del ventrículo derecho desde arriba: la P se vuelve negativa, como en aVR, y la r disminuye; es una mala progresión de la R que imita un infarto anteroseptal antiguo (en otros corazones, también una rSr′ o un ST parecido al de Brugada). La P negativa en V1 es la pista: vuelve a localizar el 4.º espacio desde el ángulo esternal y repite el registro.',
          ),
        }),
      },
    },
    { kind: 'check', item: { family: 'leads', seed: 51002 } },
    { kind: 'drill', families: ['leads', 'paper', 'waves'], count: 6, passScore: 0.8 },
    {
      kind: 'real',
      ids: [19034, 2320],
      caption: l(
        '在真实患者身上检查胸导联顺序：从 V1 到 V5，R 波是否逐渐增高、S 波是否逐渐变浅？移行区在哪里？',
        'Check the chest-lead sequence on real patients: does R grow and S shrink steadily from V1 to V5? Where is the transition?',
        'Comprueba la secuencia precordial en pacientes reales: ¿crece la R y disminuye la S de forma progresiva de V1 a V5? ¿Dónde está la transición?',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'V1–V2 放得太高（第 2–3 肋间隙）：V1–V2 出现 rSr′、P 波和 T 波倒置，类似不完全性右束支传导阻滞或 Brugada 图形。',
          'V1–V2 placed too high (2nd–3rd space): rSr′ with negative P and T in V1–V2, mimicking incomplete RBBB or a Brugada pattern.',
          'V1-V2 demasiado altas (2.º-3.er espacio): rSr′ con P y T negativas en V1-V2, que imitan un bloqueo incompleto de rama derecha o un patrón de Brugada.',
        ),
        l(
          '把 V5–V6 沿第 5 肋间隙向下放：位置过低，侧壁电压随之改变。',
          'Following the 5th space downwards for V5–V6: they end up too low and the lateral voltages change.',
          'Seguir el 5.º espacio hacia abajo para V5-V6: quedan demasiado bajas y cambian los voltajes laterales.',
        ),
        l('把电极贴在乳房组织上，而不是乳房下方的胸壁上。', 'Placing electrodes on breast tissue instead of on the chest wall beneath it.', 'Colocar los electrodos sobre la mama en vez de en la pared torácica, debajo de ella.'),
        l(
          '静息心电图把肢体电极放在躯干上而不注明：电轴和下壁 R 波都会改变。',
          'Putting the limb electrodes on the torso for a resting ECG without saying so: the axis and the inferior R waves change.',
          'Poner los electrodos de los miembros en el tronco en un ECG de reposo sin indicarlo: cambian el eje y las R inferiores.',
        ),
        l(
          '比较前后两份心电图时忽略电极位置不同：“新出现”的改变可能只是电极移动了。',
          'Comparing serial ECGs recorded with different placement: a “new” change may just be a moved electrode.',
          'Comparar ECG seriados con distinta colocación: un cambio «nuevo» puede ser solo un electrodo desplazado.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '从胸骨角找到第 4 肋间隙：V1 在胸骨右缘，V2 在胸骨左缘；V4 在第 5 肋间隙锁骨中线；V5–V6 与 V4 同一水平。',
          'Find the 4th space from the sternal angle: V1 right and V2 left sternal border; V4 5th space midclavicular; V5–V6 at the level of V4.',
          'Busca el 4.º espacio desde el ángulo esternal: V1 en el borde esternal derecho y V2 en el izquierdo; V4 en el 5.º espacio medioclavicular; V5-V6 a la altura de V4.',
        ),
        l('IEC：RA 红、LA 黄、LL 绿、RL 黑；AHA：白、黑、红、绿。', 'IEC: RA red, LA yellow, LL green, RL black; AHA: white, black, red, green.', 'IEC: RA rojo, LA amarillo, LL verde, RL negro; AHA: blanco, negro, rojo, verde.'),
        l(
          'V4R 看右心室梗死，V7–V9 看后壁梗死：ST 段抬高 ≥ 0.5 mm。',
          'V4R for right-ventricular infarction, V7–V9 for posterior infarction: ST elevation ≥ 0.5 mm.',
          'V4R para el infarto del ventrículo derecho y V7-V9 para el posterior: ascenso del ST ≥ 0,5 mm.',
        ),
        l(
          'R 波递增在单个导联出现跳跃 → 先怀疑导线或电极放错。',
          'An isolated jump in R progression → suspect a cable or electrode error first.',
          'Un salto aislado en la progresión de la R → sospecha primero un error de cable o de electrodo.',
        ),
      ],
    },
  ],
  sources: [
    SRC.kligfield,
    'SCST Clinical Guidelines by Consensus: Recording a standard 12-lead electrocardiogram (2017, revised 2020)',
    'IEC 60601-2-25:2011; ANSI/AAMI EC53 (ECG cables and leadwires)',
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction (2018). Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Batchvarov VN, Malik M, Camm AJ. Incorrect electrode cable connection during electrocardiographic recording. Europace 2007;9:1081-1090',
    'Fletcher GF et al. Exercise standards for testing and training: a scientific statement from the AHA. Circulation 2013;128:873-934',
    SRC.book,
  ],
};

export default lesson;
