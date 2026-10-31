/**
 * f5 — Electrode placement, colour codes, right-sided and posterior leads (stage F, docs/PLAN.md §3).
 * Criteria: docs/curriculum/criteria.md `precordial-positions`, `limb-electrode-colours`, `extra-chest-leads`,
 * `exercise-lead-system`, precordial misplacement / high right precordial leads / electrode placement in women /
 * patient preparation ("missing in the book").
 * Text policy (docs/design/f-explainers.md §5): the `electrode-walk` scene carries the V1–V6 landmarks (incl. the
 * women label and the "along the space" error), the R/(R+S) staircase, the cable-swap jump and the V4R / V7–V9 sites;
 * the lesson keeps only the colour codes, the extra-lead thresholds and the reads on the 12-lead viewer.
 * Extra leads (V3R/V4R, V7–V9): the engine records them (SynthRequest.extraLeads) and the viewer offers them in its lead
 * picker, but they only matter on an infarction tracing — read on tracings in lessons i4 and i6. High V1–V2 placement
 * is shown on the catalogue scenario `precordial-misplacement-high` (negative P, tiny r, inverted T in V1; the engine
 * draws no r′ there, so the text does not claim one on that tracing).
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
    '每个电极放在哪里、两套颜色标识，以及何时加做附加导联。',
    'Where each electrode goes, the two colour codes, and when to add extra leads.',
    'Dónde va cada electrodo, los dos códigos de colores y cuándo añadir derivaciones adicionales.',
  ),
  objectives: [
    l('借助触诊找到的体表标志放置 V1–V6。', 'Place V1–V6 using palpated landmarks.', 'Colocar V1-V6 con referencias anatómicas palpadas.'),
    l('认识 IEC 和 AHA 两套颜色标识。', 'Know the IEC and AHA colour codes.', 'Conocer los códigos de colores IEC y AHA.'),
    l('放置 V3R/V4R 和 V7–V9，并知道何时需要记录它们。', 'Place V3R/V4R and V7–V9 and know when to record them.', 'Colocar V3R/V4R y V7-V9 y saber cuándo registrarlas.'),
    l('识别胸导联电极放错或接错时心电图的变化。', 'Recognise how chest-electrode errors change the tracing.', 'Reconocer cómo cambian el trazado los errores de los electrodos precordiales.'),
  ],
  minutes: 10,
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
        '不符合：R 波在 V2 增高、V3 变小、V4 又增高。心脏不会在相邻电极间这样跳变——**V2 和 V3 的导线接反了**。',
        'No: R grows in V2, falls in V3 and grows again in V4. The heart does not jump like that between neighbours — **the V2 and V3 cables are swapped**.',
        'No: la R crece en V2, baja en V3 y vuelve a crecer en V4. El corazón no salta así entre electrodos vecinos: **los cables de V2 y V3 están intercambiados**.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'electrode-walk' },
      ecg: syn('normal', 512),
      caption: l(
        '看完演示后，把一个胸导联电极拖到另一个电极的位置，交换两者的导线：R/(R+S) 阶梯被打乱（V5 ↔ V6 几乎不变，因为两者在同一水平）。下方的 12 导联心电图是同一颗心脏的正确记录。',
        'After the tour, drag a chest electrode onto another electrode’s site to swap their cables: the R/(R+S) staircase breaks (V5 ↔ V6 barely, since they share a level). The 12-lead below is this heart, correctly recorded.',
        'Tras el recorrido, arrastra un electrodo precordial al punto de otro para intercambiar sus cables: la escalera R/(R+S) se rompe (V5 ↔ V6 apenas, porque están al mismo nivel). El ECG de 12 derivaciones de abajo es este corazón bien registrado.',
      ),
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
          label: l('Mason–Likar（运动试验）', 'Mason–Likar (exercise)', 'Mason-Likar (prueba de esfuerzo)'),
          value: l(
            '上肢电极移到锁骨下窝，下肢电极移到肋缘与髂嵴之间的下躯干；电轴和下壁电压会改变——须在图上注明',
            'arm electrodes in the infraclavicular fossae, leg electrodes on the lower torso (costal margin to iliac crest); the axis and inferior voltages shift — write it on the tracing',
            'electrodos de los brazos en las fosas infraclaviculares y de las piernas en la parte baja del tronco (entre el reborde costal y la cresta ilíaca); cambian el eje y los voltajes inferiores: anótalo en el trazado',
          ),
        },
      ],
      source:
        'IEC 60601-2-25:2011 (IEC colour code); ANSI/AAMI EC53 (AHA colour code); Kligfield 2007 AHA/ACCF/HRS Part I; Fletcher GF et al. Circulation 2013;128:873 (Mason–Likar)',
    },
    {
      kind: 'worked',
      title: l('在 12 导联心电图上核对顺序', 'Check the sequence on the 12-lead', 'Comprueba la secuencia en el ECG de 12 derivaciones'),
      ecg: syn('normal', 512),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('找到移行区', 'Find the transition', 'Busca la transición'),
          body: l(
            'R 波从 V1 起逐导增高（V1 为 rS，P 波常正负双向）；R ≈ S 通常在 V3 或 V4。移行区提前或推后：先核对电极，再找心脏原因。',
            'R grows lead by lead from V1 (rS, often with a +/− P); R ≈ S usually in V3 or V4. Early or late transition: check the electrodes, then look for a cardiac cause.',
            'La R crece derivación a derivación desde V1 (rS, con P a menudo bifásica, +/−); R ≈ S suele estar en V3 o V4. Transición adelantada o retrasada: revisa los electrodos y después busca una causa cardiaca.',
          ),
          marks: [
            { auto: 'p', lead: 'V1' },
            { auto: 'r', lead: 'V1' },
            { auto: 'r', lead: 'V2' },
            { auto: 'r', lead: 'V3' },
            { auto: 'r', lead: 'V4' },
          ],
          highlightLeads: ['V1', 'V2', 'V3', 'V4'],
        },
        {
          title: l('V5–V6：qR，与 I 相似', 'V5–V6: qR, like lead I', 'V5-V6: qR, como la derivación I'),
          body: l(
            'V5、V6 从左侧看左心室，应与 I、aVL 相近：小 q 波、高 R 波。',
            'V5 and V6 look at the left ventricle from the side, so they resemble I and aVL: small q, tall R.',
            'V5 y V6 miran al ventrículo izquierdo de lado, así que se parecen a I y aVL: q pequeña y R alta.',
          ),
          marks: [
            { auto: 'q', lead: 'aVL' },
            { auto: 'r', lead: 'V6' },
          ],
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
        '同一颗心脏，肢体导联完全相同。B 的 V1 是高 R 波，V3 却是 V1 的 rS：V1 和 V3 接反了。疾病使相邻导联逐渐变化，接反则是整条波形互换。',
        'Same heart, identical limb leads. In B, V1 has a tall R and V3 the rS of V1: V1 and V3 are swapped. Disease changes neighbours gradually; a swap exchanges whole traces.',
        'Mismo corazón, mismas derivaciones de los miembros. En B, V1 tiene una R alta y V3 el rS de V1: V1 y V3 están intercambiados. La enfermedad cambia las vecinas de forma gradual; un intercambio cambia trazados enteros.',
      ),
    },
    {
      kind: 'criteria',
      title: l('什么时候加做', 'When to add them', 'Cuándo añadirlas'),
      items: [
        {
          label: l('下壁梗死时：V3R/V4R 看右心室', 'V3R/V4R: inferior infarction → right ventricle?', 'Infarto inferior: V3R/V4R para el ventrículo derecho'),
          value: l(
            'V3、V4 的右侧镜像（V4R：右侧第 5 肋间隙、锁骨中线）；ST 段抬高 ≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）',
            'mirror of V3/V4 (V4R: 5th right space, midclavicular line); ST elevation ≥ 0.5 mm (≥ 1 mm in men < 30 years)',
            'espejo de V3/V4 (V4R: 5.º espacio derecho, línea medioclavicular); ascenso del ST ≥ 0,5 mm (≥ 1 mm en varones < 30 años)',
          ),
        },
        {
          label: l('V1–V3 ST 段压低时：V7–V9 看后壁（下基底）', 'V7–V9: ST depression in V1–V3 → posterior (inferobasal) wall?', 'Descenso del ST en V1-V3: V7-V9 para la cara posterior (inferobasal)'),
          value: l(
            '与 V6 同一水平的腋后线 · 肩胛下角 · 左脊柱旁；ST 段抬高 ≥ 0.5 mm（< 40 岁男性 ≥ 1 mm）',
            'posterior axillary line · scapular tip · left paravertebral border, at V6’s level; ST elevation ≥ 0.5 mm (≥ 1 mm in men < 40 years)',
            'línea axilar posterior · punta de la escápula · borde paravertebral izquierdo, al nivel de V6; ascenso del ST ≥ 0,5 mm (≥ 1 mm en varones < 40 años)',
          ),
        },
        {
          label: l('高位 V1–V2（第 2–3 肋间隙）', 'High V1–V2 (2nd–3rd space)', 'V1-V2 altas (2.º-3.er espacio)'),
          value: l('只为寻找 Brugada 1 型而有意使用，并注明', 'only on purpose, to look for Brugada type 1 — and labelled', 'solo a propósito, para buscar un Brugada tipo 1, y anotado'),
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
            'V1 的 r 波比 V2 大，双向 P 波在 V2 而不在 V1：两条波形互换了。纠正导线后重新记录。',
            'r larger in V1 than in V2, biphasic P in V2 instead of V1: the traces changed places. Correct the cables and record again.',
            'r mayor en V1 que en V2 y P bifásica en V2 en vez de en V1: los trazados cambiaron de sitio. Corrige los cables y repite el registro.',
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
            '45 岁健康男性。比较 V1、V2 与 V3 的 P、R、T 波。最可能的解释是什么？',
            'A healthy 45-year-old man. Compare the P, R and T waves of V1 and V2 with those of V3. What is the most likely explanation?',
            'Varón sano de 45 años. Compara las ondas P, R y T de V1 y V2 con las de V3. ¿Cuál es la explicación más probable?',
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
            'V1 的 P 波和 T 波倒置，V1–V2 的 r 波很小，到 V3 突然出现正常 R 波。第 2–3 肋间隙的电极从上方看心房：P 波像 aVR 一样变负，r 波变小，酷似陈旧性前间壁梗死——但 V1 负向 P 波和正常的 V3–V6 揭穿了它。重新找到第 4 肋间隙再记录。',
            'Negative P and T in V1, tiny r in V1–V2, then a sudden normal R in V3. From the 2nd–3rd space the electrodes look down on the atria: P turns negative, as in aVR, and r shrinks — a fake old anteroseptal infarct, betrayed by the negative P in V1 and the normal V3–V6. Find the 4th space again and record.',
            'P y T negativas en V1, r diminutas en V1-V2 y una R normal de golpe en V3. Desde el 2.º-3.er espacio los electrodos miran las aurículas desde arriba: la P se vuelve negativa, como en aVR, y la r disminuye; parece un infarto anteroseptal antiguo, pero la delatan la P negativa en V1 y unas V3-V6 normales. Vuelve al 4.º espacio y repite el registro.',
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
        '真实患者：V1 → V6 是否平滑变化、没有跳变？R ≈ S 在哪里？',
        'Real patients: does V1 → V6 change smoothly, with no jump? Where is R ≈ S?',
        'Pacientes reales: ¿cambia V1 → V6 de forma suave, sin saltos? ¿Dónde está R ≈ S?',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'V1–V2 放得太高（第 2–3 肋间隙）：P 波变负、r 波变小或呈 rSr′，可类似前间壁梗死、不完全性右束支传导阻滞或 Brugada 图形。',
          'V1–V2 too high (2nd–3rd space): negative P, a small r or an rSr′, mimicking an anteroseptal infarct, incomplete RBBB or a Brugada pattern.',
          'V1-V2 demasiado altas (2.º-3.er espacio): P negativa, r pequeña o rSr′, que imitan un infarto anteroseptal, un bloqueo incompleto de rama derecha o un patrón de Brugada.',
        ),
        l(
          '静息心电图把肢体电极放在躯干上（Mason–Likar，用于运动试验）而不注明：电轴和下壁 R 波会改变。',
          'Torso limb electrodes (Mason–Likar, for exercise tests) on an unlabelled resting ECG: the axis and inferior R waves change.',
          'Electrodos de los miembros en el tronco (Mason-Likar, de la prueba de esfuerzo) en un ECG de reposo sin anotar: cambian el eje y las R inferiores.',
        ),
        l(
          '比较前后心电图时忽略电极位置不同：“新”改变可能只是电极移动了。',
          'Comparing serial ECGs recorded with different placement: a “new” change may just be a moved electrode.',
          'Comparar ECG seriados con distinta colocación: un cambio «nuevo» puede ser solo un electrodo desplazado.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '从胸骨角（第 2 肋）数起：V1、V2 在第 4 肋间隙胸骨两侧，V4 在第 5 肋间隙锁骨中线，V5–V6 与 V4 同一水平。',
          'Count from the sternal angle (2nd rib): V1–V2 in the 4th space beside the sternum, V4 in the 5th space midclavicular, V5–V6 at V4’s level.',
          'Cuenta desde el ángulo esternal (2.ª costilla): V1-V2 en el 4.º espacio junto al esternón, V4 en el 5.º espacio medioclavicular, V5-V6 al nivel de V4.',
        ),
        l('IEC：RA 红、LA 黄、LL 绿、RL 黑；AHA：白、黑、红、绿。', 'IEC: RA red, LA yellow, LL green, RL black; AHA: white, black, red, green.', 'IEC: RA rojo, LA amarillo, LL verde, RL negro; AHA: blanco, negro, rojo, verde.'),
        l(
          'V4R 看右心室，V7–V9 看后壁：ST 段抬高 ≥ 0.5 mm（年轻男性 ≥ 1 mm）；在图上写明实际位置。',
          'V4R for the right ventricle, V7–V9 for the posterior wall: ST elevation ≥ 0.5 mm (≥ 1 mm in young men); write the real position on the tracing.',
          'V4R para el ventrículo derecho y V7-V9 para la cara posterior: ascenso del ST ≥ 0,5 mm (≥ 1 mm en varones jóvenes); anota la posición real en el trazado.',
        ),
        l(
          'V1 → V6 序列中孤立的跳变 → 先怀疑导线或电极放错。',
          'An isolated jump in the V1 → V6 sequence → suspect a cable or electrode error first.',
          'Un salto aislado en la secuencia V1 → V6 → sospecha primero un error de cable o de electrodo.',
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
