/**
 * h6 — Arrhythmogenic right ventricular cardiomyopathy (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md "arrhythmogenic (right ventricular) cardiomyopathy" bullet (Marcus 2010 Task
 * Force / Corrado 2020 Padua, current values), the athlete-ECG bullet (epsilon = abnormal) and the `t-juvenile-variant`
 * row. No real block: PTB-XL has no curated ARVC cases.
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const GRID = { layout: '3x4+1' } as const;
const STRIP_V1 = { layout: 'strip', lead: 'V1' } as const;
const ARVC = synth('arvc', 1304, { rate: 64 });

const lesson: Lesson = {
  id: 'h6',
  stage: 'H',
  order: 6,
  title: l('致心律失常性右心室心肌病', 'Arrhythmogenic right ventricular cardiomyopathy', 'Miocardiopatía arritmogénica del ventrículo derecho'),
  summary: l(
    '14 岁以上、不伴完全性右束支阻滞的 V1–V3（或更广）T波倒置，是致心律失常性右心室心肌病的主要心电图标准；再主动寻找ε波和终末激动时间 ≥55 ms，然后把病人转诊，而不是在 12 导联上结束。',
    'T-wave inversion in V1–V3 or beyond, without complete RBBB, in someone over 14 is the major ECG criterion of arrhythmogenic right ventricular cardiomyopathy; hunt the epsilon wave and a terminal activation duration ≥55 ms, then refer the patient instead of stopping at the 12-lead.',
    'La inversión de la onda T en V1-V3 o más allá, sin BRD completa, en mayores de 14 años es el criterio electrocardiográfico mayor de la miocardiopatía arritmogénica del ventrículo derecho; busca la onda épsilon y un tiempo de activación terminal ≥55 ms y deriva después al paciente, sin quedarte en las 12 derivaciones.',
  ),
  objectives: [
    l(
      '说出主要复极标准：>14 岁、不伴完全性右束支阻滞的 V1–V3（或更广）T波倒置。',
      'State the major repolarisation criterion: T inversion in V1–V3 or beyond, over 14 years of age, without complete RBBB.',
      'Exponer el criterio mayor de repolarización: inversión de la T en V1-V3 o más allá, en mayores de 14 años, sin BRD completa.',
    ),
    l(
      '找到并命名ε波，并在 V1–V3 测量终末激动时间（≥55 ms）。',
      'Find and name the epsilon wave, and measure terminal activation duration in V1–V3 (≥55 ms).',
      'Encontrar y nombrar la onda épsilon y medir el tiempo de activación terminal en V1-V3 (≥55 ms).',
    ),
    l(
      '把 ARVC 的T波倒置与幼年型T波（<16 岁运动员）和右束支阻滞的继发性T波倒置区分开。',
      'Separate the T inversion of ARVC from the juvenile pattern (athlete under 16) and from the secondary T inversion of RBBB.',
      'Distinguir la inversión de la T de la MAVD del patrón juvenil (deportista menor de 16 años) y de la inversión secundaria de la BRD.',
    ),
    l(
      '列出心电图之后的步骤：Holter（LBBB 形态 PVC/室速、电轴上偏）、超声与心脏磁共振、家系筛查、竞技运动限制、ICD 评估——转诊。',
      'List the steps after the ECG: Holter (LBBB-morphology PVCs/VT, superior axis), echo and cardiac MRI, family screening, stopping competitive sport, ICD evaluation — refer.',
      'Enumerar los pasos tras el ECG: Holter (EV/TV con morfología de BRI, eje superior), ecocardiograma y resonancia magnética cardíaca, cribado familiar, retirada del deporte competitivo, evaluación de DAI: derivar.',
    ),
  ],
  minutes: 15,
  competencies: ['C10'],
  findings: ['arvc', 'epsilon-wave', 'irbbb'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('arvc', 1301, { rate: 68 }),
      view: GRID,
      question: l(
        '22 岁竞技运动员，运动时心悸来查：V1–V3 的T波倒置，QRS 不宽，没有胸痛。你的鉴别清单上有哪些？想好前三项，再揭晓。',
        'A 22-year-old competitive athlete seen for palpitations on exertion: the T waves are inverted in V1–V3, the QRS is not wide, and there is no chest pain. What is on your list? Decide your top three, then reveal.',
        'Un deportista competitivo de 22 años consultado por palpitaciones al esfuerzo: las ondas T están invertidas en V1-V3, el QRS no es ancho y no hay dolor torácico. ¿Qué hay en tu lista? Decide tus tres primeras opciones y luego mira la solución.',
      ),
      reveal: l(
        'QRS 不宽，所以这不是束支阻滞的**继发性**T波倒置；22 岁也早已过了"幼年型T波"的年龄（运动员只在 16 岁以下才接受）。**致心律失常性右心室心肌病（ARVC）就在这份清单的最上面**：>14 岁、不伴完全性右束支阻滞的 V1–V3（或更广）T波倒置，是它的主要复极标准。再回头看 V1–V3 每个 QRS 的末端：紧贴 QRS 终点之后还有一个向上的小偏折——**ε波**，右心室最晚除极的那点心肌留下的签名。',
        'The QRS is not wide, so this is not the **secondary** T inversion of a bundle-branch block; and at 22 the patient is well past the age of a "juvenile pattern" (accepted in athletes only under 16). **Arrhythmogenic right ventricular cardiomyopathy sits at the top of that list**: T inversion in V1–V3 or beyond, without complete RBBB, over 14 years of age, is its major repolarisation criterion. Now look again at the end of every QRS in V1–V3: just after the QRS ends there is a small upward blip — the **epsilon wave**, the signature of the last myocardium in the right ventricle to depolarise.',
        'El QRS no es ancho, así que no se trata de la inversión de la T **secundaria** a un bloqueo de rama; y con 22 años el paciente ya ha dejado atrás la edad del «patrón juvenil» (en deportistas solo se acepta por debajo de los 16). **La miocardiopatía arritmogénica del ventrículo derecho encabeza esa lista**: la inversión de la T en V1-V3 o más allá, sin BRD completa, en mayores de 14 años, es su criterio mayor de repolarización. Vuelve ahora al final de cada QRS en V1-V3: justo después de que termina el QRS hay una pequeña deflexión positiva: la **onda épsilon**, la firma del último miocardio del ventrículo derecho en despolarizarse.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('arvc', 1302, { rate: 66 }),
      emphasize: ['rv-outflow', 'rv-basal'],
      showConduction: true,
      caption: l(
        'ARVC 多从高亮的右心室流出道和三尖瓣下（流入道）基底游离壁开始：桥粒缺陷让心肌被纤维脂肪取代，传导变慢，右胸导联的终末激动延长，少数人在 QRS 之后留下 ε 波。左心室也会受累。',
        'ARVC usually starts in the highlighted RV outflow tract and the basal free wall below the tricuspid valve (the inflow): a desmosomal defect lets fibro-fatty tissue replace myocardium, conduction slows, right precordial terminal activation lengthens and a minority show an epsilon wave after the QRS. The LV can be involved too.',
        'La MAVD suele empezar en el tracto de salida y en la pared libre basal bajo la tricúspide (la entrada) del VD, resaltados: un defecto desmosómico sustituye miocardio por tejido fibrograso, la conducción se enlentece, la activación terminal precordial derecha se alarga y una minoría muestra una onda épsilon tras el QRS. El VI también puede afectarse.',
      ),
    },
    {
      kind: 'criteria',
      title: l('ARVC 心电图标准（2010 工作组 / 2020 Padua）', 'ARVC ECG criteria (2010 Task Force / 2020 Padua)', 'Criterios ECG de la MAVD (Grupo de Trabajo 2010 / Padua 2020)'),
      items: [
        {
          label: l('T波倒置（复极）', 'T inversion (repolarisation)', 'Inversión de la T (repolarización)'),
          value: l(
            'V1–V3 或更广，>14 岁，不伴完全性右束支阻滞 —— 主要标准',
            'V1–V3 or beyond, over 14 y, without complete RBBB — major criterion',
            'V1-V3 o más allá, mayores de 14 años, sin BRD completa: criterio mayor',
          ),
        },
        {
          label: l('ε波（除极）', 'Epsilon wave (depolarisation)', 'Onda épsilon (despolarización)'),
          value: l(
            'QRS 终点之后 V1–V3 的小终末偏折；2010 工作组标准列为主要，2020 Padua 标准降为次要',
            'A small terminal deflection after the end of the QRS in V1–V3; major in the 2010 Task Force criteria, downgraded to minor in the 2020 Padua criteria',
            'Pequeña deflexión terminal tras el final del QRS en V1-V3; mayor en los criterios del Grupo de Trabajo 2010, reducida a menor en los criterios de Padua 2020',
          ),
        },
        {
          label: l('终末激动时间（TAD）', 'Terminal activation duration (TAD)', 'Tiempo de activación terminal (TAD)'),
          value: l(
            'V1–V3 自 S 波最低点到 QRS 终点（含ε波）≥55 ms，不伴完全性右束支阻滞——2010 工作组标准中的次要标准',
            'V1–V3, from the nadir of the S wave to the end of the QRS (including the epsilon wave) ≥55 ms, without complete RBBB — a minor criterion in the 2010 Task Force criteria',
            'V1-V3, desde el nadir de la onda S hasta el final del QRS (incluida la onda épsilon) ≥55 ms, sin BRD completa: criterio menor en los criterios del Grupo de Trabajo 2010',
          ),
        },
        {
          label: l('室性心律失常', 'Ventricular arrhythmias', 'Arritmias ventriculares'),
          value: l(
            'PVC / 室速呈 LBBB 形态：电轴上偏为主要（右心室非流出道起源），电轴下偏为次要；24 h PVC >500 次',
            'PVCs / VT with LBBB morphology: superior axis major (RV origin outside the outflow tract), inferior axis minor; >500 PVCs/24 h',
            'EV / TV con morfología de BRI: eje superior, mayor (origen en VD fuera del tracto de salida); eje inferior, menor; >500 EV/24 h',
          ),
        },
        {
          label: l('低电压与左心室型', 'Low voltage and the LV form', 'Bajo voltaje y forma izquierda'),
          value: l(
            '肢体导联低电压（<5 mm）是 Padua 2020 的左心室受累标准之一，并非常规表现；左心室优势型：下侧壁T波倒置 + 低电压',
            'Low limb-lead voltage (<5 mm) is one of the Padua 2020 criteria for LV involvement, not a routine finding; left-dominant form: inferolateral T inversion + low voltage',
            'El bajo voltaje en extremidades (<5 mm) es uno de los criterios de afectación del VI de Padua 2020, no un hallazgo habitual; forma de predominio izquierdo: inversión de la T inferolateral + bajo voltaje',
          ),
        },
        {
          label: l('运动员筛查中的位置', 'Where it sits in athlete screening', 'Su lugar en el cribado del deportista'),
          value: l(
            'ε波属于国际标准的"异常"栏：需要进一步评估，不是训练相关改变（T↓ V1–V3 仅 <16 岁才算幼年型）',
            'The epsilon wave sits in the "abnormal" bin of the international criteria: it needs work-up, it is not a training-related change (T↓ V1–V3 counts as juvenile only under 16 y)',
            'La onda épsilon pertenece al apartado «anormal» de los criterios internacionales: exige estudio, no es un cambio relacionado con el entrenamiento (la T negativa en V1-V3 solo cuenta como juvenil por debajo de los 16 años)',
          ),
        },
      ],
      source:
        'Marcus FI et al. Circulation 2010;121:1533-1541; Corrado D et al. Int J Cardiol 2020;319:106-110; Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    },
    {
      kind: 'film',
      title: l('三种 V1–V3 T 波倒置', 'Three T inversions in V1–V3', 'Tres inversiones de la T en V1-V3'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3'] },
      frames: [
        {
          label: l('幼年型', 'Juvenile', 'Juvenil'),
          ecg: synth('juvenile-t', 1309),
          note: l(
            'V1–V3 的 T 倒置，QRS 窄（约 95 ms），QRS 之后什么也没有：幼年型，运动员只在 16 岁以下算正常。',
            'T inverted in V1–V3, a narrow QRS (about 95 ms) and nothing after it: the juvenile pattern, normal in athletes only under 16.',
            'T negativa en V1-V3, QRS estrecho (unos 95 ms) y nada tras él: patrón juvenil, normal en deportistas solo por debajo de los 16 años.',
          ),
          marks: [{ auto: 't', lead: 'V2' }],
        },
        {
          label: l('右束支阻滞', 'RBBB', 'Bloqueo de rama derecha'),
          ecg: synth('rbbb', 1304, { rate: 64 }),
          note: l(
            'QRS 约 140 ms，V1 呈 rsR′：T 倒置跟着阻滞走（继发性）。ARVC 的 T 标准要求不伴完全性右束支阻滞。',
            'QRS about 140 ms with rsR′ in V1: the T inversion follows the block (secondary). The ARVC T criterion needs the absence of complete RBBB.',
            'QRS de unos 140 ms con rsR′ en V1: la inversión de la T sigue al bloqueo (secundaria). El criterio de la T de la MAVD exige que no haya BRD completa.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }],
        },
        {
          label: l('右室心肌病', 'ARVC', 'MAVD'),
          ecg: ARVC,
          note: l(
            'QRS 约 115 ms（<120），V1–V2 的 T 深倒约 7 mm，V3 也倒置：成人身上这是 ARVC 的主要标准。接着去 QRS 之后找。',
            'QRS about 115 ms (<120), T inverted about 7 mm in V1–V2 and in V3 too: in an adult this is the major ARVC criterion. Now hunt after the QRS.',
            'QRS de unos 115 ms (<120), T negativa de unos 7 mm en V1-V2 y también en V3: en un adulto es el criterio mayor de MAVD. Ahora busca tras el QRS.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }, { auto: 't', lead: 'V2' }],
        },
      ],
      predict: {
        question: l(
          '第 1 帧 V1–V3 的 T 倒置。读它的 QRS：有多宽？之后有什么？',
          'Frame 1 inverts the T in V1–V3. Read its QRS: how wide is it, and what follows it?',
          'El fotograma 1 invierte la T en V1-V3. Lee su QRS: ¿qué anchura tiene y qué lo sigue?',
        ),
        options: [
          l('<120 ms，之后什么也没有', 'Under 120 ms, nothing after it', 'Menos de 120 ms, nada después'),
          l('<120 ms，之后有一个小偏折', 'Under 120 ms, a small blip after it', 'Menos de 120 ms, una pequeña deflexión después'),
          l('≥120 ms，V1 呈 rsR′', '120 ms or more, with rsR′ in V1', '120 ms o más, con rsR′ en V1'),
        ],
        answer: 0,
      },
      caption: l(
        '一条线：先看年龄（幼年型仅 <16 岁），再看 QRS 宽度（右束支阻滞自带 T 倒置），最后去 QRS 之后找小偏折。',
        'One line: age first (juvenile only under 16), then the QRS width (RBBB brings its own T inversion), then hunt for the blip after the QRS.',
        'Una línea: primero la edad (juvenil solo por debajo de 16), después la anchura del QRS (el BRD trae su propia T negativa) y por último busca la pequeña deflexión tras el QRS.',
      ),
    },
    {
      kind: 'worked',
      title: l('三种T波倒置，一条决策线', 'Three T inversions, one decision line', 'Tres inversiones de la T, una línea de decisión'),
      ecg: synth('arvc', 1305, { rate: 72 }),
      view: GRID,
      steps: [
        {
          title: l('第一步：多大年龄？', 'Step 1: how old?', 'Paso 1: ¿qué edad tiene?'),
          body: l(
            '幼年型T波只在儿童期正常，运动员中只在 16 岁以下接受；本例 29 岁，V1–V3 的T波倒置不能再用"幼年型"解释。反过来也要记准界值：ARVC 的T波倒置标准从 >14 岁起算。',
            'The juvenile T pattern is normal only in childhood, and in athletes it is accepted only under 16 years; at 29, T inversion in V1–V3 can no longer be filed as "juvenile". In the other direction, get the threshold right: the ARVC T-inversion criterion applies from over 14 years of age.',
            'El patrón juvenil de la T solo es normal en la infancia y en deportistas solo se acepta por debajo de los 16 años; a los 29, la inversión de la T en V1-V3 ya no puede etiquetarse de «juvenil». Y a la inversa, fija bien el umbral: el criterio de inversión de la T de la MAVD se aplica a partir de los 14 años.',
          ),
        },
        {
          title: l('第二步：QRS 宽不宽？', 'Step 2: is the QRS wide?', 'Paso 2: ¿el QRS es ancho?'),
          body: l(
            '完全性右束支阻滞的继发性T波倒置一定伴随 ≥120 ms 的宽 QRS 和 rSR′ 形态；ARVC 的标准明确要求**不伴完全性右束支阻滞**。本图 QRS 不宽——T波倒置不是束支阻滞的继发改变。',
            'The secondary T inversion of complete RBBB always rides on a wide QRS ≥120 ms with an rSR′ shape; the ARVC criterion explicitly requires the **absence of complete RBBB**. Here the QRS is not wide — the T inversion is not secondary to a block.',
            'La inversión secundaria de la T de la BRD completa siempre cabalga sobre un QRS ancho ≥120 ms con morfología rsR′; el criterio de la MAVD exige expresamente la **ausencia de BRD completa**. Aquí el QRS no es ancho: la inversión de la T no es secundaria a un bloqueo.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }],
          highlightLeads: ['V1', 'V2', 'V3'],
        },
        {
          title: l('第三步：量终末激动，找ε波', 'Step 3: measure the terminal activation, hunt the epsilon', 'Paso 3: mide la activación terminal, busca la épsilon'),
          body: l(
            '在 V1–V3 从 S 波最低点量到 QRS 终点（把ε波也算进去）：≥55 ms 即终末激动时间延长（2010 标准中的次要标准）。再逐跳扫一遍 QRS 终点之后的小偏折。两项都不显眼——都要**主动**去找，否则一定漏。',
            'In V1–V3 measure from the nadir of the S wave to the end of the QRS (epsilon included): ≥55 ms counts as prolonged terminal activation (a minor criterion in 2010). Then scan beat by beat for the small deflection after the QRS ends. Neither finding shouts — both must be hunted **actively** or they are missed.',
            'En V1-V3 mide desde el nadir de la S hasta el final del QRS (épsilon incluida): ≥55 ms cuenta como activación terminal prolongada (criterio menor en 2010). Después explora latido a latido la pequeña deflexión tras el QRS. Ninguna de las dos grita: hay que buscarlas de forma **activa** o se pierden.',
          ),
          marks: [{ auto: 's', lead: 'V1' }, { auto: 'qrs', lead: 'V1' }],
          highlightLeads: ['V1', 'V2', 'V3'],
        },
        {
          title: l('第四步：下结论，然后行动', 'Step 4: conclude, then act', 'Paso 4: concluye y actúa'),
          body: l(
            '窄 QRS + V1–V3 T波倒置（>14 岁）+ ε波/终末激动延长：ARVC 的心电图标准成立。下一步不在 12 导联上：Holter（LBBB 形态 PVC、电轴上偏、24 h >500 次）、超声与心脏磁共振、家系筛查；评估期间停竞技运动，ICD 由专科团队按危险分层决定——**转诊**。',
            'Narrow QRS + T inversion V1–V3 (over 14 y) + epsilon wave / prolonged terminal activation: the ECG criteria for ARVC are met. The next steps are not on the 12-lead: Holter (LBBB-morphology PVCs, superior axis, >500/24 h), echo and cardiac MRI, family screening; competitive sport stops while the evaluation runs, and the ICD decision belongs to the specialist team by risk strata — **refer**.',
            'QRS estrecho + inversión de la T en V1-V3 (mayor de 14 años) + onda épsilon / activación terminal prolongada: los criterios ECG de la MAVD se cumplen. Los pasos siguientes no están en las 12 derivaciones: Holter (EV con morfología de BRI, eje superior, >500/24 h), ecocardiograma y resonancia magnética cardíaca, cribado familiar; retirada del deporte competitivo durante el estudio y la decisión del DAI por niveles de riesgo corresponde al equipo especializado: **deriva**.',
          ),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('ε波之后 vs R′波之内', 'After the QRS vs inside the QRS', 'Después del QRS frente a dentro del QRS'),
      view: GRID,
      left: {
        ecg: synth('arvc', 1306, { rate: 70 }),
        caption: l('ARVC：V1–V3 T波倒置，QRS 不宽，QRS 终点之后有小偏折（ε波）', 'ARVC: T inversion V1–V3, QRS not wide, a small deflection after the QRS ends (epsilon wave)', 'MAVD: inversión de la T en V1-V3, QRS no ancho, pequeña deflexión tras el final del QRS (onda épsilon)'),
        marks: [{ auto: 't', lead: 'V2' }],
      },
      right: {
        ecg: synth('irbbb', 1307, { rate: 72 }),
        caption: l('不完全性右束支阻滞：V1 呈 rSR′，QRS 仍 <120 ms（运动员的常见正常变异）', 'Incomplete RBBB: rSR′ in V1 with the QRS still <120 ms (a common normal variant in athletes)', 'Bloqueo incompleto de rama derecha: rSR′ en V1 con el QRS aún <120 ms (variante normal frecuente en deportistas)'),
        marks: [{ auto: 'qrs', lead: 'V1' }],
      },
      point: l(
        '两者都在右胸导联出现"晚到的右向力量"，区别在于它落在哪里。iRBBB：迟发的除极仍在 QRS **之内**完成——V1 出现第二个向上的 R′，QRS <120 ms，T波只是跟着 R′ 走。ARVC：QRS 本身不宽（末端至多一个很小的 r′），T波倒置独立于任何束支阻滞，小偏折落在 QRS 终点**之后**——ε波。一句话：R′ 在 QRS 里，ε波在 QRS 外。',
        'Both show a "late rightward force" in the right precordial leads; what differs is where it lands. iRBBB: the late activation still finishes **inside** the QRS — a second upright R′ in V1, QRS <120 ms, and the T simply follows the R′. ARVC: the QRS itself is not wide (at most a small terminal r′), the T inversion stands independently of any bundle-branch block, and the small deflection lands **after** the QRS ends — the epsilon wave. One line: the R′ lives inside the QRS, the epsilon wave outside it.',
        'Ambos muestran una «fuerza derecha tardía» en las precordiales derechas; la diferencia es dónde acaba. BIRD: la activación tardía termina aún **dentro** del QRS: una segunda R′ positiva en V1, QRS <120 ms, y la T se limita a seguir a la R′. MAVD: el QRS en sí no es ancho (como mucho, una r′ terminal pequeña), la inversión de la T es independiente de cualquier bloqueo de rama y la pequeña deflexión cae **después** del final del QRS: la onda épsilon. En una frase: la R′ vive dentro del QRS, la épsilon fuera.',
      ),
    },
    {
      kind: 'film',
      title: l('在 QRS 之内，还是之后？', 'Inside the QRS, or after it?', '¿Dentro del QRS o después?'),
      view: STRIP_V1,
      frames: [
        {
          label: l('ε 波', 'Epsilon wave', 'Onda épsilon'),
          ecg: ARVC,
          note: l(
            'QRS 括号结束后约 30 ms，基线上还有一个小偏折（约 0.7 mm）：ε 波。自动标注画不出它，只能靠你的眼睛。',
            'About 30 ms after the QRS bracket ends, a small blip (about 0.7 mm) still rides the baseline: the epsilon wave. No auto-mark draws it; only your eyes find it.',
            'Unos 30 ms después de que termine el corchete del QRS, una pequeña deflexión (unos 0,7 mm) sigue sobre la línea de base: la onda épsilon. Ninguna marca automática la dibuja; solo tus ojos.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }],
        },
        {
          label: l('R′ 波', 'R′ wave', 'Onda R′'),
          ecg: synth('irbbb', 1307, { rate: 72 }),
          note: l(
            '不完全性右束支阻滞：迟到的右向力量是括号**之内**的高 R′（约 7 mm），QRS 约 115 ms，之后什么也没有。',
            'Incomplete RBBB: the late right force is a tall R′ (about 7 mm) **inside** the bracket, QRS about 115 ms, and nothing after it.',
            'Bloqueo incompleto de rama derecha: la fuerza derecha tardía es una R′ alta (unos 7 mm) **dentro** del corchete, QRS de unos 115 ms, y nada después.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }],
        },
      ],
      predict: {
        question: l(
          '看这条 V1：QRS 结束到 T 波之间有什么？',
          'Look at this V1 strip: what lies between the end of the QRS and the T?',
          'Mira esta tira de V1: ¿qué hay entre el final del QRS y la T?',
        ),
        options: [
          l('什么也没有：基线平直', 'Nothing: a flat baseline', 'Nada: la línea de base es plana'),
          l('一个小偏折，不到 1 mm', 'A small blip, under 1 mm', 'Una pequeña deflexión, de menos de 1 mm'),
          l('一个约 5 mm 高的波', 'A wave about 5 mm tall', 'Una onda de unos 5 mm'),
        ],
        answer: 1,
        ordered: true,
      },
      caption: l(
        'R′ 在 QRS 里，ε 波在 QRS 外。ε 波只见于少数 ARVC，没有它什么也排除不了；低增益、滤波或慢纸速都会抹掉它。',
        'The R′ lives inside the QRS, the epsilon wave outside it. Epsilon appears in only a minority of ARVC, so its absence excludes nothing; low gain, filters or slow paper erase it.',
        'La R′ vive dentro del QRS y la épsilon, fuera. La épsilon solo aparece en una minoría de MAVD, así que su ausencia no excluye nada; la ganancia baja, los filtros o el papel lento la borran.',
      ),
    },
    { kind: 'check', item: { family: 'substrates', seed: 1 } },
    { kind: 'check', item: { family: 'substrates', seed: 38 } },
    { kind: 'drill', families: ['substrates', 'compare-substrate'], count: 8, passScore: 0.85 },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把 16 岁及以上运动员 V1–V3 的T波倒置叫作"幼年型"：幼年型在运动员中只限 16 岁以下；成人 V1 的T波倒置可为正常、V2 偶见，延伸到 V3 或更远（>14 岁且无完全性右束支阻滞）就要按 ARVC 主要标准去评估。',
          'Calling T inversion V1–V3 "juvenile" in athletes aged 16 or over: the juvenile pattern counts only under 16 years in athletes; in adults T inversion in V1 alone can be normal and in V2 is occasionally seen, but extending to V3 or beyond (over 14 y, no complete RBBB) demands work-up under the major ARVC criterion.',
          'Llamar «juvenil» a la inversión de la T en V1-V3 en deportistas de 16 años o más: el patrón juvenil solo cuenta por debajo de los 16 años en deportistas; en adultos, la T negativa aislada en V1 puede ser normal y en V2 se ve en ocasiones, pero extenderse a V3 o más allá (mayor de 14 años, sin BRD completa) obliga a estudiarla como criterio mayor de MAVD.',
        ),
        l(
          'ε波漏掉，因为"QRS 已经结束"：终末激动包括 S 波升支的延迟和 QRS 之后的小偏折；低增益、滤波或慢纸速都会把它抹掉——每一份疑似图都要主动扫一遍 QRS 终点之后。',
          'Missing the epsilon wave because "the QRS has finished": terminal activation includes the delayed S upstroke and the small deflection after the QRS; low gain, filters or slow paper speed all erase it — sweep past the end of the QRS actively in every suspect tracing.',
          'Perder la onda épsilon porque «el QRS ya ha terminado»: la activación terminal incluye el enlentecimiento de la rama ascendente de la S y la pequeña deflexión tras el QRS; la ganancia baja, los filtros o una velocidad de registro lenta la borran: explora activamente más allá del final del QRS en todo trazado sospechoso.',
        ),
        l(
          '把 ARVC 叫作"右心室肥厚"：方向反了——ARVC 是心肌被纤维脂肪**取代**，电压不高，若有变化反而偏低（左心室受累时肢体导联低电压）；用右心室肥厚标准去"验证"ARVC，既无意义还会假阴性。',
          'Calling ARVC "RVH": the direction is wrong — in ARVC myocardium is **replaced** by fibro-fatty tissue, voltage is low if anything (low limb-lead voltage when the LV is involved); "confirming" ARVC with RVH criteria is meaningless and often falsely negative.',
          'Llamar a la MAVD «HVD»: la dirección está equivocada; en la MAVD el miocardio es **sustituido** por tejido fibrograso y el voltaje, si acaso, es bajo (bajo voltaje en extremidades cuando se afecta el VI); «confirmar» la MAVD con criterios de HVD no tiene sentido y da falsos negativos.',
        ),
        l(
          '年轻运动员的孤立室性早搏不升级处理："良性早搏"的标签要看形态与负荷——LBBB 形态、电轴上偏、运动时增多或 24 h >500 次，都要走 Holter 与评估流程。',
          'Not escalating isolated PVCs in a young athlete: the "benign extrasystole" label depends on morphology and burden — LBBB morphology, superior axis, an increase on exercise or >500/24 h all call for Holter and a work-up.',
          'No escalar las extrasístoles ventriculares aisladas de un deportista joven: la etiqueta de «extrasístole benigna» depende de la morfología y la carga: morfología de BRI, eje superior, aumento con el ejercicio o >500/24 h exigen Holter y estudio.',
        ),
        l(
          '忘记左心室优势型：下侧壁T波倒置 + 肢体导联低电压，而右胸导联几乎正常——这是 Padua 2020 补上的左心标准；只盯 V1–V3 会把这种面孔放走。',
          'Forgetting the left-dominant form: inferolateral T inversion + low limb voltage with almost normal right precordial leads — the LV criteria Padua 2020 added; staring only at V1–V3 lets this face walk away.',
          'Olvidar la forma de predominio izquierdo: inversión de la T inferolateral + bajo voltaje en extremidades con precordiales derechas casi normales: los criterios izquierdos que Padua 2020 añadió; mirando solo V1-V3 esta cara se escapa.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '>14 岁、不伴完全性右束支阻滞的 V1–V3（或更广）T波倒置 = ARVC 的主要复极标准；左心室受累时可伴肢体导联低电压。',
          'T inversion in V1–V3 or beyond, over 14 years of age, without complete RBBB = the major repolarisation criterion of ARVC; low limb-lead voltage can accompany it when the LV is involved.',
          'La inversión de la T en V1-V3 o más allá, en mayores de 14 años y sin BRD completa, es el criterio mayor de repolarización de la MAVD; con afectación del VI puede acompañarla un bajo voltaje en extremidades.',
        ),
        l(
          'ε波 = QRS 终点之后 V1–V3 的小终末偏折（2010 工作组标准列为主要，2020 Padua 降为次要）；终末激动时间 ≥55 ms——两项都要主动去找。',
          'The epsilon wave = a small terminal deflection after the end of the QRS in V1–V3 (major in the 2010 Task Force criteria, downgraded to minor in Padua 2020); terminal activation duration ≥55 ms — both must be hunted actively.',
          'La onda épsilon = una pequeña deflexión terminal tras el final del QRS en V1-V3 (mayor en los criterios del Grupo de Trabajo 2010, reducida a menor en Padua 2020); tiempo de activación terminal ≥55 ms: hay que buscar ambos de forma activa.',
        ),
        l(
          '三种T波倒置一条线：看年龄（幼年型仅 <16 岁）和 QRS（右束支阻滞的继发性T波倒置必有宽 QRS/rSR′）；R′ 在 QRS 之内，ε波在 QRS 之外。',
          'Three T inversions, one line: check the age (juvenile only under 16) and the QRS (secondary T inversion of RBBB always has a wide QRS/rSR′); the R′ lives inside the QRS, the epsilon wave outside it.',
          'Tres inversiones de la T en una línea: comprueba la edad (juvenil solo por debajo de 16) y el QRS (la inversión secundaria de la BRD siempre tiene QRS ancho/rsR′); la R′ vive dentro del QRS y la épsilon, fuera.',
        ),
        l(
          '心电图是入口不是判决：Holter（LBBB 形态 PVC/室速、电轴上偏、>500 次/24 h）、超声与心脏磁共振、家系筛查、停竞技运动、ICD 按危险分层——转诊；并记住左心室优势型（下侧壁T↓ + 低电压）。',
          'The ECG is the entrance, not the verdict: Holter (LBBB-morphology PVCs/VT, superior axis, >500/24 h), echo and cardiac MRI, family screening, stopping competitive sport, ICD by risk strata — refer; and remember the left-dominant form (inferolateral T↓ + low voltage).',
          'El ECG es la puerta de entrada, no la sentencia: Holter (EV/TV con morfología de BRI, eje superior, >500/24 h), ecocardiograma y resonancia magnética cardíaca, cribado familiar, retirada del deporte competitivo, DAI según el riesgo: deriva; y recuerda la forma de predominio izquierdo (T negativa inferolateral + bajo voltaje).',
        ),
      ],
    },
  ],
  sources: [
    'Marcus FI et al. Circulation 2010;121:1533-1541',
    'Corrado D et al. Int J Cardiol 2020;319:106-110',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Castellano et al. 2004',
  ],
};

export default lesson;
