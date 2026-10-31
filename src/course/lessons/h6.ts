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
        'QRS 不宽，所以这不是束支阻滞的**继发性**T波倒置；22 岁也早已过了"幼年型T波"的年龄（运动员只接受到 16 岁）。**致心律失常性右心室心肌病（ARVC）就在这份清单的最上面**：>14 岁、不伴完全性右束支阻滞的 V1–V3（或更广）T波倒置，是它的主要复极标准。再回头看 V1–V3 每个 QRS 的末端：紧贴 QRS 终点之后还有一个向上的小偏折——**ε波**，右心室最晚除极的那点心肌留下的签名。',
        'The QRS is not wide, so this is not the **secondary** T inversion of a bundle-branch block; and at 22 the patient is well past the age of a "juvenile pattern" (accepted in athletes only under 16). **Arrhythmogenic right ventricular cardiomyopathy sits at the top of that list**: T inversion in V1–V3 or beyond, without complete RBBB, over 14 years of age, is its major repolarisation criterion. Now look again at the end of every QRS in V1–V3: just after the QRS ends there is a small upward blip — the **epsilon wave**, the signature of the last myocardium in the right ventricle to depolarise.',
        'El QRS no es ancho, así que no se trata de la inversión de la T **secundaria** a un bloqueo de rama; y con 22 años el paciente ya ha dejado atrás la edad del «patrón juvenil» (en deportistas solo se acepta por debajo de los 16). **La miocardiopatía arritmogénica del ventrículo derecho encabeza esa lista**: la inversión de la T en V1-V3 o más allá, sin BRD completa, en mayores de 14 años, es su criterio mayor de repolarización. Vuelve ahora al final de cada QRS en V1-V3: justo después de que termina el QRS hay una pequeña deflexión positiva: la **onda épsilon**, la firma del último miocardio del ventrículo derecho en despolarizarse.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('arvc', 1302, { rate: 66 }),
      emphasize: ['rv-outflow', 'rv-basal', 'rv-apical'],
      showConduction: true,
      caption: l(
        '右心室的三个角——流出道、基底部（流入道）和心尖——构成"发育不良三角"。桥粒基因缺陷让心肌被纤维脂肪组织逐步取代，传导随之变慢：右胸导联的终末激动延长，少数患者还能在 QRS 之后记录到来自最晚除极区的小偏折（ε波）。病变并不止于右心室：左心室（尤其下侧壁）也会受累。',
        'The three corners of the right ventricle — outflow tract, base (inflow) and apex — form the "triangle of dysplasia". A desmosomal gene defect lets fibro-fatty tissue replace myocardium there, and conduction slows with it: terminal activation in the right precordial leads is prolonged, and in a minority of patients a small deflection from the latest-activated region can be recorded after the QRS (the epsilon wave). The disease does not stop at the right ventricle: the left ventricle (inferolateral wall especially) is involved too.',
        'Los tres ángulos del ventrículo derecho —tracto de salida, base (tracto de entrada) y ápex— forman el «triángulo de displasia». Un defecto genético desmosómico permite que tejido fibrograso sustituya al miocardio en esa zona y la conducción se enlentece: la activación terminal en las derivaciones precordiales derechas se prolonga y, en una minoría de pacientes, puede registrarse tras el QRS una pequeña deflexión procedente de la región de activación más tardía (la onda épsilon). La enfermedad no se limita al ventrículo derecho: el ventrículo izquierdo (sobre todo la pared inferolateral) también se afecta.',
      ),
    },
    {
      kind: 'text',
      title: l('一种病，三个心电图签名', 'One disease, three ECG signatures', 'Una enfermedad, tres firmas electrocardiográficas'),
      body: l(
        'ARVC 是遗传性桥粒疾病：心肌细胞间连接脆弱，右心室心肌被纤维脂肪组织取代。心电图从三个层面签名：\n- **除极**：右心室传导延迟——V1–V3 终末激动时间（TAD）≥55 ms；部分患者出现ε波，即 QRS 终点之后的小偏折；\n- **复极**：V1–V3 或更广的T波倒置，**不伴完全性右束支阻滞**（>14 岁，主要标准）；左心室受累时肢体导联可出现低电压；\n- **心律失常**：起源于右心室的室性早搏（PVC）或室速，呈左束支阻滞（LBBB）形态；电轴上偏提示流出道以外的右心室起源。\n临床面孔：年轻的运动员，运动诱发的心悸、晕厥，甚至猝死；家族中可能有青年猝死。2020 Padua 标准还补上了左心侧面——**左心室优势型**：下侧壁T波倒置 + 低电压，右胸导联可以几乎正常。',
        'ARVC is an inherited disease of the desmosomes: the links between myocytes are fragile and right ventricular myocardium is replaced by fibro-fatty tissue. The ECG signs it at three levels:\n- **Depolarisation**: delayed right ventricular conduction — terminal activation duration (TAD) ≥55 ms in V1–V3; in some patients an epsilon wave, a small deflection after the end of the QRS;\n- **Repolarisation**: T inversion in V1–V3 or beyond **without complete RBBB** (over 14 y, major criterion); with LV involvement the limb-lead voltage can be low;\n- **Arrhythmia**: PVCs or VT arising from the right ventricle, with LBBB morphology; a superior axis suggests an RV origin outside the outflow tract.\nThe clinical face: a young athlete with exercise-triggered palpitations, syncope, even sudden death; there may be sudden death at a young age in the family. The 2020 Padua criteria added the left-sided face — the **left-dominant form**: inferolateral T inversion plus low voltage, with right precordial leads that can look almost normal.',
        'La MAVD es una enfermedad hereditaria de los desmosomas: los enlaces entre los miocitos son frágiles y el miocardio del ventrículo derecho es sustituido por tejido fibrograso. El ECG la firma en tres planos:\n- **Despolarización**: conducción ventricular derecha enlentecida: tiempo de activación terminal (TAD) ≥55 ms en V1-V3; en algunos pacientes, una onda épsilon, una pequeña deflexión tras el final del QRS;\n- **Repolarización**: inversión de la T en V1-V3 o más allá **sin BRD completa** (mayores de 14 años, criterio mayor); con afectación del VI, el voltaje en las derivaciones de extremidades puede ser bajo;\n- **Arritmia**: EV o TV originados en el ventrículo derecho, con morfología de BRI; un eje superior sugiere un origen ventricular derecho fuera del tracto de salida.\nLa cara clínica: un deportista joven con palpitaciones, síncopes desencadenados por el ejercicio e incluso muerte súbita; puede haber muerte súbita juvenil en la familia. Los criterios de Padua 2020 añadieron la cara izquierda: la **forma de predominio izquierdo**: inversión de la T inferolateral más bajo voltaje, con derivaciones precordiales derechas casi normales.',
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
      kind: 'ecg',
      ecg: synth('arvc', 1304, { rate: 64 }),
      view: GRID,
      // the epsilon wave has no AutoMark: it is not one of the named waves — describe it and let the learner find it
      marks: [{ auto: 'qrs', lead: 'V1' }, { auto: 't', lead: 'V2' }],
      caption: l(
        'V1 的 QRS 括号是参照物：在它结束的地方逐跳细看——紧贴 QRS 终点之后有一个贴着基线的小偏折，就是**ε波**。自动标注画不出它（它不是 P/QRS/T 这样的命名波），这一项只能靠你的眼睛。第二条线索在 V2：**T波倒置**。窄 QRS + V1–V3 T波倒置 + ε波——三个签名凑齐了两个半。',
        'The QRS bracket in V1 is the reference: look beat by beat at where it ends — a small deflection riding the baseline just after the QRS finishes is the **epsilon wave**. The automatic marks cannot draw it (it is not one of the named waves like P, QRS or T); this one is for your eyes only. The second clue sits in V2: **T inversion**. Narrow QRS + T inversion V1–V3 + epsilon wave — two and a half of the three signatures together.',
        'El corchete del QRS en V1 sirve de referencia: mira latido a latido dónde termina; una pequeña deflexión sobre la línea de base justo después del QRS es la **onda épsilon**. Las marcas automáticas no pueden dibujarla (no es una de las ondas con nombre, como P, QRS o T); esta queda solo para tus ojos. La segunda pista está en V2: **inversión de la T**. QRS estrecho + inversión de la T en V1-V3 + onda épsilon: dos firmas y media de las tres.',
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
            '幼年型T波只在儿童期正常，运动员中接受到 16 岁为止；本例 29 岁，V1–V3 的T波倒置不能再用"幼年型"解释。反过来也要记准界值：ARVC 的T波倒置标准从 >14 岁起算。',
            'The juvenile T pattern is normal only in childhood, and in athletes it is accepted up to 16 years; at 29, T inversion in V1–V3 can no longer be filed as "juvenile". In the other direction, get the threshold right: the ARVC T-inversion criterion applies from over 14 years of age.',
            'El patrón juvenil de la T solo es normal en la infancia y en deportistas se acepta hasta los 16 años; a los 29, la inversión de la T en V1-V3 ya no puede etiquetarse de «juvenil». Y a la inversa, fija bien el umbral: el criterio de inversión de la T de la MAVD se aplica a partir de los 14 años.',
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
      title: l('ε波之后 vs r′波之内', 'After the QRS vs inside the QRS', 'Después del QRS frente a dentro del QRS'),
      view: GRID,
      left: {
        ecg: synth('arvc', 1306, { rate: 70 }),
        caption: l('ARVC：V1–V3 T波倒置，QRS 不宽，QRS 终点之后有小偏折（ε波）', 'ARVC: T inversion V1–V3, QRS not wide, a small deflection after the QRS ends (epsilon wave)', 'MAVD: inversión de la T en V1-V3, QRS no ancho, pequeña deflexión tras el final del QRS (onda épsilon)'),
        marks: [{ auto: 't', lead: 'V2' }],
      },
      right: {
        ecg: synth('irbbb', 1307, { rate: 72 }),
        caption: l('不完全性右束支阻滞：V1 呈 rSr′，QRS 仍 <120 ms（运动员的常见正常变异）', 'Incomplete RBBB: rSr′ in V1 with the QRS still <120 ms (a common normal variant in athletes)', 'Bloqueo incompleto de rama derecha: rSr′ en V1 con el QRS aún <120 ms (variante normal frecuente en deportistas)'),
        marks: [{ auto: 'qrs', lead: 'V1' }],
      },
      point: l(
        '两者都在右胸导联出现"晚到的右向力量"，区别在于它落在哪里。iRBBB：迟发的除极仍在 QRS **之内**完成——V1 出现第二个向上的 r′，QRS <120 ms，T波只是跟着 r′ 走。ARVC：没有 rSr′，QRS 本身不宽，T波倒置独立于任何束支阻滞，小偏折落在 QRS 终点**之后**——ε波。一句话：r′ 在 QRS 里，ε波在 QRS 外。',
        'Both show a "late rightward force" in the right precordial leads; what differs is where it lands. iRBBB: the late activation still finishes **inside** the QRS — a second upright r′ in V1, QRS <120 ms, and the T simply follows the r′. ARVC: no rSr′, the QRS itself is not wide, the T inversion stands independently of any bundle-branch block, and the small deflection lands **after** the QRS ends — the epsilon wave. One line: the r′ lives inside the QRS, the epsilon wave outside it.',
        'Ambos muestran una «fuerza derecha tardía» en las precordiales derechas; la diferencia es dónde acaba. BIRD: la activación tardía termina aún **dentro** del QRS: una segunda r′ positiva en V1, QRS <120 ms, y la T se limita a seguir a la r′. MAVD: sin rSr′, el QRS en sí no es ancho, la inversión de la T es independiente de cualquier bloqueo de rama y la pequeña deflexión cae **después** del final del QRS: la onda épsilon. En una frase: la r′ vive dentro del QRS, la épsilon fuera.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('arvc', 1308, { rate: 74 }),
      view: STRIP_V1,
      marks: [{ auto: 'qrs', lead: 'V1' }],
      caption: l(
        '10 秒的 V1，QRS 括号作参照：逐跳盯着每个 QRS 的终点看，紧跟其后的小偏折就是ε波。两点提醒：它只见于少数 ARVC 患者，**没有它什么也排除不了**；而且它很脆弱——低增益或滤波会把它抹平，纸速太慢时它被挤进 QRS 末端。这就是"纸到 QRS 为止"会漏掉它的原因。',
        'Ten seconds of V1 with the QRS bracket as reference: fix your eyes on the end of every QRS; the small deflection right after it is the epsilon wave. Two cautions: it appears in only a minority of ARVC patients, so **its absence excludes nothing**; and it is fragile — low gain or a filter smooths it away, and at slow paper speed it is squeezed into the QRS end. That is exactly why "reading to the end of the QRS" misses it.',
        'Diez segundos de V1 con el corchete del QRS como referencia: fija la vista en el final de cada QRS; la pequeña deflexión justo después es la onda épsilon. Dos avisos: solo aparece en una minoría de pacientes con MAVD, así que **su ausencia no excluye nada**; y es frágil: una ganancia baja o un filtro la borran y, con velocidad de registro lenta, se aprieta contra el final del QRS. Por eso «leer hasta el final del QRS» la pasa por alto.',
      ),
    },
    {
      kind: 'text',
      title: l('心电图提出问题，多指标给出诊断', 'The ECG asks the question; the work-up answers it', 'El ECG plantea la pregunta; el estudio la responde'),
      body: l(
        '当 12 导联提出 ARVC 这个问题，剩下的按清单走：\n- **病史与家族史**：运动相关晕厥、心悸、心律失常史；家族中 <40 岁的猝死。\n- **Holter**：24 h PVC >500 次；PVC/室速的 LBBB 形态——电轴上偏提示流出道以外的右心室起源，电轴下偏更常见于（常为良性的）流出道起源。\n- **影像**：超声心动图 + 心脏磁共振——右心室壁运动异常、变薄、脂肪浸润/延迟强化。\n- **家系筛查与遗传咨询**：桥粒基因（如 plakophilin-2）。\n- **运动与ICD**：评估期间停竞技运动；ICD 植入由专科团队按危险分层决定。\n- **别忘了左心室优势型**：下侧壁T波倒置 + 肢体导联低电压，而右胸导联近乎正常——同一疾病的左心面孔（Padua 2020）。\n心电图是入口，不是判决：诊断由多指标共同做出——**转诊**。',
        'Once the 12-lead raises the question of ARVC, the rest follows a checklist:\n- **History and family history**: exercise-related syncope, palpitations, arrhythmia; sudden death under 40 in the family.\n- **Holter**: >500 PVCs/24 h; LBBB morphology of PVCs/VT — a superior axis suggests an RV origin outside the outflow tract, an inferior axis is more typical of the (usually benign) outflow tract.\n- **Imaging**: echocardiogram + cardiac MRI — RV wall-motion abnormalities, thinning, fat infiltration / late gadolinium enhancement.\n- **Family screening and genetic counselling**: desmosomal genes (e.g. plakophilin-2).\n- **Sport and ICD**: competitive sport stops while the evaluation runs; ICD implantation is decided by the specialist team on risk strata.\n- **Do not forget the left-dominant form**: inferolateral T inversion + low limb voltage with near-normal right precordial leads — the left-sided face of the same disease (Padua 2020).\nThe ECG is the entrance, not the verdict: the diagnosis is made by multiple criteria together — **refer**.',
        'Cuando las 12 derivaciones plantean la pregunta de la MAVD, el resto sigue una lista:\n- **Anamnesis y antecedentes familiares**: síncopes relacionados con el ejercicio, palpitaciones, arritmias; muerte súbita antes de los 40 años en la familia.\n- **Holter**: >500 EV/24 h; morfología de BRI de los EV/TV: un eje superior sugiere un origen en el VD fuera del tracto de salida y un eje inferior es más típico del tracto de salida (habitualmente benigno).\n- **Imagen**: ecocardiograma + resonancia magnética cardíaca: anomalías de la contractilidad de la pared del VD, adelgazamiento, infiltración grasa / realce tardío.\n- **Cribado familiar y consejo genético**: genes desmosómicos (p. ej., plakofilina-2).\n- **Deporte y DAI**: retirada del deporte competitivo durante el estudio; el implante de DAI lo decide el equipo especializado según los estratos de riesgo.\n- **No olvides la forma de predominio izquierdo**: inversión de la T inferolateral + bajo voltaje en extremidades con precordiales derechas casi normales: la cara izquierda de la misma enfermedad (Padua 2020).\nEl ECG es la puerta de entrada, no la sentencia: el diagnóstico lo dan varios criterios juntos: **deriva**.',
      ),
    },
    { kind: 'check', item: { family: 'substrates', seed: 1 } },
    { kind: 'check', item: { family: 'substrates', seed: 38 } },
    { kind: 'drill', families: ['substrates', 'compare-substrate'], count: 8, passScore: 0.85 },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把 16 岁以上运动员 V1–V3 的T波倒置叫作"幼年型"：幼年型在运动员中只到 16 岁为止；成人 V1 的T波倒置可为正常、V2 偶见，延伸到 V3 或更远（>14 岁且无完全性右束支阻滞）就要按 ARVC 主要标准去评估。',
          'Calling T inversion V1–V3 "juvenile" in athletes over 16: the juvenile pattern runs only up to 16 years in athletes; in adults T inversion in V1 alone can be normal and in V2 is occasionally seen, but extending to V3 or beyond (over 14 y, no complete RBBB) demands work-up under the major ARVC criterion.',
          'Llamar «juvenil» a la inversión de la T en V1-V3 en deportistas mayores de 16 años: el patrón juvenil solo llega hasta los 16 años en deportistas; en adultos, la T negativa aislada en V1 puede ser normal y en V2 se ve en ocasiones, pero extenderse a V3 o más allá (mayor de 14 años, sin BRD completa) obliga a estudiarla como criterio mayor de MAVD.',
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
          '三种T波倒置一条线：看年龄（幼年型仅 <16 岁）和 QRS（右束支阻滞的继发性T波倒置必有宽 QRS/rSR′）；r′ 在 QRS 之内，ε波在 QRS 之外。',
          'Three T inversions, one line: check the age (juvenile only under 16) and the QRS (secondary T inversion of RBBB always has a wide QRS/rSR′); the r′ lives inside the QRS, the epsilon wave outside it.',
          'Tres inversiones de la T en una línea: comprueba la edad (juvenil solo por debajo de 16) y el QRS (la inversión secundaria de la BRD siempre tiene QRS ancho/rsR′); la r′ vive dentro del QRS y la épsilon, fuera.',
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
