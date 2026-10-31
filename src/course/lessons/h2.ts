/**
 * h2 — Left ventricular hypertrophy: named voltage criteria and secondary ST–T (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md `lvh-axis-voltage`, `lvh-accuracy`, `romhilt-estes`, `lv-systolic-overload`,
 * `intrinsicoid-deflection` and the Cornell / Peguero-Lo Presti / demographic-modifier / conduction-defect bullets
 * under `atrial-enlargement-ventricular-hypertrophy` (current values, not the book's).
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

const lesson: Lesson = {
  id: 'h2',
  stage: 'H',
  order: 2,
  title: l(
    '左心室肥厚（Sokolow-Lyon、Cornell、Peguero-Lo Presti标准；继发性ST-T改变）',
    'LVH (Sokolow-Lyon, Cornell, Peguero-Lo Presti; secondary ST–T changes)',
    'HVI (Sokolow-Lyon, Cornell, Peguero-Lo Presti; alteraciones secundarias del ST-T)',
  ),
  summary: l(
    '用命名的电压标准（Sokolow-Lyon、R aVL、Cornell、Peguero-Lo Presti）和 Romhilt-Estes 计分诊断左心室肥厚，认识继发性ST-T改变；心电图正常并不能排除左心室肥厚。',
    'Diagnose LVH with the named voltage criteria (Sokolow-Lyon, R aVL, Cornell, Peguero-Lo Presti) and the Romhilt-Estes score, recognise the secondary ST–T abnormality, and remember that a normal ECG does not exclude LVH.',
    'Diagnosticar la HVI con los criterios de voltaje con nombre (Sokolow-Lyon, R aVL, Cornell, Peguero-Lo Presti) y la puntuación de Romhilt-Estes, reconocer la alteración secundaria del ST-T y recordar que un ECG normal no excluye la HVI.',
  ),
  objectives: [
    l(
      '在标准定准电压（10 mm/mV）下测量并相加，应用 Sokolow-Lyon、Cornell 电压和 Peguero-Lo Presti 标准。',
      'Apply Sokolow-Lyon, Cornell voltage and Peguero-Lo Presti by measuring and adding at standard gain (10 mm/mV).',
      'Aplicar Sokolow-Lyon, el voltaje de Cornell y Peguero-Lo Presti midiendo y sumando con la ganancia estándar (10 mm/mV).',
    ),
    l(
      '识别左心室肥厚的继发性ST-T改变，并用现用术语报告。',
      'Recognise the secondary ST–T abnormality of LVH and report it in current terminology.',
      'Reconocer la alteración secundaria del ST-T de la HVI e informarla con la terminología actual.',
    ),
    l(
      '说出心电图诊断左心室肥厚的准确度和电压的人口学修正因素。',
      'State the accuracy of the ECG for LVH and the demographic modifiers of QRS voltage.',
      'Indicar la exactitud del ECG para la HVI y los modificadores demográficos del voltaje del QRS.',
    ),
    l(
      '知道传导阻滞（左前分支阻滞、左/右束支阻滞）何时使电压标准失效。',
      'Know when conduction defects (LAFB, LBBB, RBBB) invalidate the voltage criteria.',
      'Saber cuándo los trastornos de conducción (BFAI, BRI, BRD) invalidan los criterios de voltaje.',
    ),
  ],
  minutes: 15,
  competencies: ['C7'],
  findings: ['lvh', 'lvh-strain'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('lvh-strain', 1221, { rate: 70 }),
      view: GRID,
      question: l(
        'V5–V6 的 R 波高、V1 的 S 波深，而 ST 段压低、T 波倒置的方向"不对"。你能说出哪些诊断标准？这个 ST-T 又该叫什么？',
        'Tall R in V5–V6, deep S in V1, and an ST–T that dips the wrong way. Which criteria can you name, and what is this ST–T?',
        'R alta en V5-V6, S profunda en V1 y un ST-T que se hunde en la dirección «equivocada». ¿Qué criterios puedes nombrar y qué es este ST-T?',
      ),
      reveal: l(
        '电压达到左心室肥厚标准：Sokolow-Lyon 约 38 mm（>35 mm，阳性）；Cornell 约 35 mm、Peguero-Lo Presti 约 40 mm，按男性界值也阳性——三条一致；实际工作中标准常不一致，一条阳性就够报告电压阳性。而 ST-T 是**继发性改变**：面向高 R 波的导联（I、aVL、V5–V6）ST 压低、T 不对称倒置，V1–V3 出现镜像的 ST 抬高。报告写"**左心室肥厚伴继发性ST-T改变**"——"劳损（strain）"一词已过时。',
        'The voltage meets LVH criteria: Sokolow-Lyon about 38 mm (>35 mm, positive); Cornell about 35 mm and Peguero-Lo Presti about 40 mm are positive even at the male cut-offs — all three agree here; in practice criteria often disagree, and one positive criterion is enough to call LVH voltage. The ST–T is a **secondary** change: ST depression with asymmetric T inversion in the leads facing the tall R (I, aVL, V5–V6), with the mirror image — ST elevation — in V1–V3. Report "**LVH with secondary ST–T abnormality**"; the word "strain" is out.',
        'El voltaje cumple criterios de HVI: Sokolow-Lyon de unos 38 mm (>35 mm, positivo); Cornell de unos 35 mm y Peguero-Lo Presti de unos 40 mm son positivos incluso con los umbrales masculinos: aquí coinciden los tres; en la práctica los criterios discrepan a menudo y basta uno positivo para informar voltaje de HVI. El ST-T es una alteración **secundaria**: descenso del ST con T invertida asimétrica en las derivaciones que miran a la R alta (I, aVL, V5-V6), con la imagen en espejo —elevación del ST— en V1-V3. Informa de «**HVI con alteración secundaria del ST-T**»; el término «sobrecarga» («strain») está en desuso.',
      ),
    },
    {
      kind: 'text',
      title: l('电压住在哪里', 'Where the voltage lives', 'Dónde vive el voltaje'),
      body: l(
        '左心室朝向左后方，正对 **V5–V6 和 aVL**：肥厚的心肌产生更大的除极向量，这些导联的 R 波随之增高。右胸导联（V1–V2）从"背面"看同一个向量，把它写成深 S 波。每条电压标准都是把两侧的数字相加：\n- Sokolow-Lyon：S V1 + R V5/V6 中较大者；\n- Cornell：S V3 + R aVL；\n- Peguero-Lo Presti：最深的 S（任何导联）+ S V4。\n测量前先确认定准电压：标准为 10 mm/mV，半电压会把一切减半。仅有电压阳性时报告"左心室肥厚"，ST-T 另行描述。',
        'The left ventricle points leftward and backward, straight at **V5–V6 and aVL**: hypertrophied muscle generates a larger depolarisation vector, and the R waves in those leads grow. The right precordial leads (V1–V2) see the same vector from "behind" and write it as a deep S. Every voltage criterion adds one number from each side:\n- Sokolow-Lyon: S V1 + the larger of R V5/V6;\n- Cornell: S V3 + R aVL;\n- Peguero-Lo Presti: the deepest S in any lead + S V4.\nCheck the calibration before measuring: standard gain is 10 mm/mV, and half gain halves everything. Voltage alone is reported as "LVH"; the ST–T is described separately.',
        'El ventrículo izquierdo se dirige hacia atrás y a la izquierda, justo hacia **V5-V6 y aVL**: el músculo hipertrofiado genera un vector de despolarización mayor y crece la R en esas derivaciones. Las derivaciones precordiales derechas (V1-V2) ven el mismo vector «desde detrás» y lo escriben como una S profunda. Cada criterio de voltaje suma un número de cada lado:\n- Sokolow-Lyon: S V1 + la mayor de R V5/V6;\n- Cornell: S V3 + R aVL;\n- Peguero-Lo Presti: la S más profunda de cualquier derivación + S V4.\nComprueba la calibración antes de medir: la ganancia estándar es 10 mm/mV y con la mitad de ganancia todo se reduce a la mitad. Solo el voltaje positivo se informa como «HVI»; el ST-T se describe aparte.',
      ),
    },
    {
      kind: 'criteria',
      title: l('左心室肥厚的命名标准', 'The named LVH criteria', 'Los criterios con nombre de la HVI'),
      items: [
        {
          label: l('Sokolow-Lyon（胸导联）', 'Sokolow-Lyon (precordial)', 'Sokolow-Lyon (precordiales)'),
          value: l(
            'S V1 + R V5 或 R V6 中较大者 >35 mm（>3.5 mV）',
            'S V1 + the larger of R V5 or R V6 >35 mm (>3.5 mV)',
            'S V1 + la mayor de R V5 o R V6 >35 mm (>3,5 mV)',
          ),
        },
        {
          label: l('R aVL（肢体导联）', 'R aVL (limb lead)', 'R aVL (derivación de extremidades)'),
          value: l(
            'R aVL ≥11 mm；Gubner（R I + S III >25 mm）特异性高、敏感度很低',
            'R aVL ≥11 mm; Gubner (R I + S III >25 mm) high specificity, very low sensitivity',
            'R aVL ≥11 mm; Gubner (R I + S III >25 mm) alta especificidad, sensibilidad muy baja',
          ),
        },
        {
          label: l('Cornell 电压', 'Cornell voltage', 'Voltaje de Cornell'),
          value: l('S V3 + R aVL >28 mm（男）/ >20 mm（女）', 'S V3 + R aVL >28 mm (men) / >20 mm (women)', 'S V3 + R aVL >28 mm (varones) / >20 mm (mujeres)'),
        },
        {
          label: l('Cornell 乘积', 'Cornell product', 'Producto de Cornell'),
          value: l(
            '（R aVL + S V3，女性再加 6 mm）× QRS 时限 >2440 mm·ms',
            '(R aVL + S V3, adding 6 mm in women) × QRS duration >2440 mm·ms',
            '(R aVL + S V3, sumando 6 mm en las mujeres) × duración del QRS >2440 mm·ms',
          ),
        },
        {
          label: l('Peguero-Lo Presti 标准', 'Peguero-Lo Presti', 'Peguero-Lo Presti'),
          value: l(
            '任何导联最深的 S + S V4 ≥28 mm（男）/ ≥23 mm（女）；电压标准中敏感度最高（约 45–62 %，特异度约 90 %）',
            'Deepest S in any lead + S V4 ≥28 mm (men) / ≥23 mm (women); the most sensitive of the voltage criteria (~45–62 % at ~90 % specificity)',
            'La S más profunda de cualquier derivación + S V4 ≥28 mm (varones) / ≥23 mm (mujeres); el más sensible de los criterios de voltaje (~45-62 % con ~90 % de especificidad)',
          ),
        },
        {
          label: l('Romhilt-Estes 计分', 'Romhilt-Estes score', 'Puntuación de Romhilt-Estes'),
          value: l(
            '电压（肢体导联 R 或 S ≥20 mm；S V1/V2 ≥30 mm；R V5/V6 ≥30 mm）3 分；与 QRS 主波相反的典型 ST-T 3 分（用洋地黄时 1 分）；左心房异常（V1 终末负向 P）3 分；电轴左偏 ≥−30° 2 分；QRS ≥90 ms 1 分；V5/V6 R 峰时间 ≥50 ms 1 分。满分 13 分：≥5 分 = 左心室肥厚，4 分 = 可能为左心室肥厚',
            'Voltage (largest limb R or S ≥20 mm; S V1/V2 ≥30 mm; R V5/V6 ≥30 mm) 3 pts; typical ST–T opposite the QRS 3 pts (1 pt on digitalis); LA abnormality (V1 terminal P negativity) 3 pts; left axis ≥−30° 2 pts; QRS ≥90 ms 1 pt; R-peak time V5/V6 ≥50 ms 1 pt. Max 13: ≥5 = LVH, 4 = probable LVH',
            'Voltaje (la mayor R o S en extremidades ≥20 mm; S V1/V2 ≥30 mm; R V5/V6 ≥30 mm) 3 puntos; ST-T típico opuesto al QRS 3 puntos (1 con digital); anomalía auricular izquierda (P terminal negativa en V1) 3 puntos; eje izquierdo ≥−30° 2 puntos; QRS ≥90 ms 1 punto; tiempo hasta la cúspide de la R en V5/V6 ≥50 ms 1 punto. Máximo 13: ≥5 = HVI, 4 = HVI probable',
          ),
        },
        {
          label: l('电轴左偏', 'Left axis deviation', 'Desviación izquierda del eje'),
          value: l(
            '电轴左偏 ≥−30° 不是左心室肥厚的电压标准——它在 Romhilt-Estes 中占 2 分，通常提示左前分支阻滞',
            'LAD ≥−30° is not an LVH voltage criterion — it scores 2 points in Romhilt-Estes and usually means LAFB',
            'La desviación izquierda ≥−30° no es un criterio de voltaje de HVI: puntúa 2 en Romhilt-Estes y suele indicar bloqueo fascicular anterior izquierdo',
          ),
        },
        {
          label: l('准确度', 'Accuracy', 'Exactitud'),
          value: l(
            '经典电压标准敏感度约 10–25 %、特异度约 85–99 %（对超声）；心电图正常不能排除左心室肥厚',
            'Classic voltage criteria: sensitivity ~10–25 %, specificity ~85–99 % vs echo; a normal ECG does not exclude LVH',
            'Criterios clásicos de voltaje: sensibilidad ~10-25 %, especificidad ~85-99 % frente al ecocardiograma; un ECG normal no excluye la HVI',
          ),
        },
      ],
      source:
        'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261; Peguero JG et al. J Am Coll Cardiol 2017;69:1694-1703; Romhilt DW, Estes EH. Am Heart J 1968;75:752-758',
    },
    {
      kind: 'heart',
      ecg: synth('lvh', 1222, { rate: 72 }),
      showConduction: true,
      emphasize: ['lv-basal-anterolateral', 'lv-mid-anterolateral', 'lv-apical-lateral', 'lv-apex', 'lv-mid-inferior', 'lv-mid-inferolateral'],
      caption: l(
        '播放一个心动周期。肥厚的左心室壁产生更强的除极向量，指向 V5–V6 和 aVL：R 波增高；同一向量背离右胸电极，被写成深 S 波。电压标准测量的正是这个向量的两端。',
        'Play one beat. The hypertrophied LV wall generates a stronger depolarisation vector aimed at V5–V6 and aVL: the R grows. The same vector points away from the right precordial electrodes and is written as a deep S. The voltage criteria measure the two ends of this vector.',
        'Reproduce un latido. La pared hipertrofiada del VI genera un vector de despolarización más intenso dirigido a V5-V6 y aVL: la R crece. El mismo vector se aleja de los electrodos precordiales derechos y se escribe como una S profunda. Los criterios de voltaje miden los dos extremos de este vector.',
      ),
    },
    {
      kind: 'worked',
      title: l('在一份图上跑完三条标准', 'Run all three criteria on one tracing', 'Aplica los tres criterios en un mismo trazado'),
      ecg: synth('lvh-strain', 1223, { rate: 76 }),
      view: GRID,
      steps: [
        {
          title: l('Sokolow-Lyon 标准', 'Sokolow-Lyon', 'Sokolow-Lyon'),
          body: l(
            '测 V1 的 S 波，再测 V5 和 V6 的 R 波并取较大者，相加。本图 S V1 约 21 mm，R V6 约 19 mm（比 V5 的约 10 mm 大），总和约 40 mm，>35 mm：阳性。',
            'Measure the S in V1, then the R in V5 and V6 and take the larger, and add. Here S V1 is about 21 mm and R V6 about 19 mm (larger than the 10 mm in V5): about 40 mm, >35 mm — positive.',
            'Mide la S en V1, después la R en V5 y V6, toma la mayor y súmalas. Aquí la S de V1 mide unos 21 mm y la R de V6 unos 19 mm (mayor que los 10 mm de V5): unos 40 mm, >35 mm: positivo.',
          ),
          marks: [{ auto: 's', lead: 'V1' }, { auto: 'r', lead: 'V5' }, { auto: 'r', lead: 'V6' }],
          highlightLeads: ['V1', 'V5', 'V6'],
        },
        {
          title: l('Cornell 电压', 'Cornell voltage', 'Voltaje de Cornell'),
          body: l(
            '测 V3 的 S 波（约 28 mm）和 aVL 的 R 波（约 7 mm）并相加：约 35 mm。这位患者是 67 岁男性，阈值 >28 mm——**阳性**（女性阈值 >20 mm，当然也阳性）。Cornell 是分性别的标准：若总和是 25 mm，女性阳性而男性阴性——先问性别再下笔。',
            'Measure S in V3 (about 28 mm) and R in aVL (about 7 mm) and add them: about 35 mm. This patient is a 67-year-old man, so the threshold is >28 mm — **positive** (and positive for a woman too, threshold >20 mm). Cornell is sex-specific: a sum of 25 mm would be positive in a woman but negative in a man, so ask the sex before you write.',
            'Mide la S en V3 (unos 28 mm) y la R en aVL (unos 7 mm) y súmalas: unos 35 mm. Este paciente es un varón de 67 años, así que el umbral es >28 mm: **positivo** (y también lo sería en una mujer, umbral >20 mm). Cornell es específico por sexo: una suma de 25 mm sería positiva en una mujer y negativa en un varón, así que pregunta el sexo antes de escribir.',
          ),
          marks: [{ auto: 's', lead: 'V3' }, { auto: 'r', lead: 'aVL' }],
          highlightLeads: ['V3', 'aVL'],
        },
        {
          title: l('Peguero-Lo Presti 标准', 'Peguero-Lo Presti', 'Peguero-Lo Presti'),
          body: l(
            '在全部 12 个导联中找最深的 S（通常在 V2–V3；本图在 V3，约 28 mm），加上 V4 的 S（约 13 mm）：约 41 mm。阈值 ≥28 mm（男）/ ≥23 mm（女）——这位男性**阳性**。它是敏感度最高的电压标准（约 45–62 %，特异度约 90 %），但敏感度高不等于每次都阳性。',
            'Find the deepest S among all 12 leads (usually V2–V3; here V3, about 28 mm) and add the S in V4 (about 13 mm): about 41 mm. Threshold ≥28 mm (men) / ≥23 mm (women) — **positive** in this man. It is the most sensitive of the voltage criteria (~45–62 % at ~90 % specificity), but more sensitive does not mean always positive.',
            'Busca la S más profunda de las 12 derivaciones (suele estar en V2-V3; aquí en V3, unos 28 mm) y súmale la S de V4 (unos 13 mm): unos 41 mm. Umbral ≥28 mm (varones) / ≥23 mm (mujeres): **positivo** en este varón. Es el criterio de voltaje más sensible (~45-62 % con ~90 % de especificidad), pero más sensible no significa siempre positivo.',
          ),
          marks: [{ auto: 's', lead: 'V3' }, { auto: 's', lead: 'V4' }],
          highlightLeads: ['V3', 'V4'],
        },
        {
          title: l('下结论，再读 ST-T', 'Conclude, then read the ST–T', 'Concluye y después lee el ST-T'),
          body: l(
            '三条都阳性：电压明确。实际工作中标准常常不一致——敏感度低，本来就不指望它们同时亮灯，只要一条阳性就报告"左心室肥厚"。再看 I、aVL、V5–V6 的 ST-T：J 点与 ST 下斜型压低，T 不对称倒置（降支慢、升支陡），与主波方向相反；V1–V3 是镜像的 ST 抬高和直立 T。这是**继发性ST-T改变**——完整报告："左心室肥厚伴继发性ST-T改变"。',
            'All three positive: the voltage is unequivocal. In practice the criteria often disagree — with sensitivities this low nobody expects them all to light up together — and a single positive voltage criterion is enough to report "LVH". Now read the ST–T in I, aVL, V5–V6: J-point and downsloping ST depression with an asymmetric inverted T (slow descent, abrupt return), opposite the dominant R; V1–V3 show the mirror — ST elevation with an upright T. This is a **secondary ST–T abnormality**; the full report reads "LVH with secondary ST–T abnormality".',
            'Los tres positivos: el voltaje es inequívoco. En la práctica los criterios discrepan a menudo —con sensibilidades tan bajas nadie espera que se enciendan todos a la vez— y basta un criterio de voltaje positivo para informar de «HVI». Ahora lee el ST-T en I, aVL, V5-V6: descenso del punto J y del ST con pendiente descendente y T invertida asimétrica (descenso lento, retorno brusco), opuesta a la R dominante; en V1-V3 la imagen en espejo: elevación del ST con T positiva. Es una **alteración secundaria del ST-T**; el informe completo: «HVI con alteración secundaria del ST-T».',
          ),
          marks: [{ auto: 'st', lead: 'V6' }, { auto: 't', lead: 'V6' }, { auto: 'st', lead: 'V1' }],
          highlightLeads: ['V6', 'V1'],
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('lvh-strain', 1224, { rate: 80 }),
      view: { layout: '3x4+1', highlightLeads: ['I', 'aVL', 'V6', 'V1'] },
      marks: [{ auto: 'j', lead: 'V6' }, { auto: 'st', lead: 'V6' }, { auto: 't', lead: 'V6' }, { auto: 'st', lead: 'V1' }],
      caption: l(
        '继发性ST-T改变的三个特征：与主波 R 方向**相反**；ST 压低伴 T 不对称倒置（降支缓、升支陡）；V1–V3 出现镜像 ST 抬高。它不是原发性（缺血性）改变，本身不等于冠心病，也不能据此推断压力负荷还是容量负荷——那超出了心电图能说的范围。',
        'Three features of the secondary ST–T abnormality: it points **opposite** the dominant R; ST depression with an asymmetric inverted T (gentle descent, steep return); and the mirror ST elevation in V1–V3. It is not a primary (ischaemic) change and by itself does not mean coronary disease — nor can you infer pressure vs volume load from it; that is beyond what the ECG can say.',
        'Tres rasgos de la alteración secundaria del ST-T: se dirige en sentido **opuesto** a la R dominante; descenso del ST con T invertida asimétrica (descenso suave, retorno abrupto); y la elevación del ST en espejo en V1-V3. No es una alteración primaria (isquémica) ni significa por sí sola cardiopatía isquémica, y tampoco permite deducir sobrecarga de presión frente a volumen: eso va más allá de lo que el ECG puede decir.',
      ),
    },
    {
      kind: 'text',
      title: l('敏感度、人群与传导阻滞', 'Sensitivity, demographics and conduction defects', 'Sensibilidad, demografía y trastornos de conducción'),
      body: l(
        '经典电压标准的敏感度只有约 10–25 %（特异度 85–99 %）：**心电图正常不能排除左心室肥厚**，超声才是裁判。\n电压还受人群影响：年轻人、男性、黑种人、胸壁薄者电压更高；女性、老年人、肥胖、COPD、心包积液时更低。Cornell 分性别设置阈值，35–40 岁以下仅凭电压诊断要谨慎。\n传导阻滞会破坏标准：**左前分支阻滞**时 I/aVL 的 R 波标准不可靠（改用 S III + 最大胸导联 R+S ≥30 mm 男 / ≥28 mm 女）；**左束支阻滞**时电压标准不可靠，诊断左心室肥厚要非常谨慎；**右束支阻滞**时标准敏感度下降。',
        'Classic voltage criteria are only ~10–25 % sensitive (specificity 85–99 %): **a normal ECG does not exclude LVH** — echo is the arbiter.\nVoltage also depends on the person: higher in young adults, men, Black individuals and thin chests; lower in women, older age, obesity, COPD and pericardial effusion. Cornell is sex-specific, and voltage-only LVH under ~35–40 y deserves caution.\nConduction defects break the criteria: with **LAFB**, R-wave criteria in I/aVL are unreliable (use S III + the largest precordial R+S, ≥30 mm men / ≥28 mm women); with **LBBB** voltage criteria are unreliable — diagnose LVH only with great caution; with **RBBB** the criteria lose sensitivity.',
        'Los criterios clásicos de voltaje tienen solo ~10-25 % de sensibilidad (especificidad 85-99 %): **un ECG normal no excluye la HVI**; el ecocardiograma es el árbitro.\nEl voltaje también depende de la persona: mayor en jóvenes, varones, personas negras y tórax delgado; menor en mujeres, edad avanzada, obesidad, EPOC y derrame pericárdico. Cornell es específico por sexo, y la «HVI solo por voltaje» antes de los ~35-40 años debe interpretarse con cautela.\nLos trastornos de conducción invalidan los criterios: con **bloqueo fascicular anterior izquierdo** los criterios de onda R en I/aVL no son fiables (usar S III + la mayor R+S precordial, ≥30 mm en varones / ≥28 mm en mujeres); con **bloqueo de rama izquierda** el voltaje no es fiable: diagnosticar HVI solo con gran cautela; con **bloqueo de rama derecha** los criterios pierden sensibilidad.',
      ),
    },
    {
      kind: 'contrast',
      title: l('只有电压，还是电压加 ST-T？', 'Voltage only, or voltage plus ST–T?', '¿Solo voltaje, o voltaje más ST-T?'),
      view: GRID,
      left: {
        ecg: synth('lvh', 1225, { rate: 62 }),
        caption: l('左心室肥厚（仅电压）：R 波高、S 波深，ST-T 正常', 'LVH (voltage only): tall R, deep S, normal ST–T', 'HVI (solo voltaje): R alta, S profunda, ST-T normal'),
        marks: [{ auto: 'r', lead: 'V5' }],
      },
      right: {
        ecg: synth('lvh-strain', 1226, { rate: 84 }),
        caption: l('左心室肥厚伴继发性ST-T改变：同样的电压，加上反向的 ST-T', 'LVH with secondary ST–T abnormality: same voltage, plus the reversed ST–T', 'HVI con alteración secundaria del ST-T: el mismo voltaje, más el ST-T invertido'),
        marks: [{ auto: 'st', lead: 'V5' }, { auto: 't', lead: 'V5' }],
      },
      point: l(
        '两侧的 Sokolow-Lyon 都阳性——电压标准无法区分它们，区别在 ST-T：左侧复极正常，报告"左心室肥厚"；右侧再加上"伴继发性ST-T改变"。这不是两个病，而是同一诊断的两个层级；伴继发性ST-T改变者超声证实的肥厚更多、预后也更差。',
        'Sokolow-Lyon is positive on both sides — the voltage criteria cannot tell them apart. The difference is the ST–T: on the left repolarisation is normal, so report "LVH"; on the right add "with secondary ST–T abnormality". These are not two diseases but two grades of one diagnosis; LVH with a secondary ST–T abnormality tracks more echo-confirmed hypertrophy and a worse prognosis.',
        'El Sokolow-Lyon es positivo en ambos lados: los criterios de voltaje no los distinguen. La diferencia está en el ST-T: a la izquierda la repolarización es normal, así que se informa «HVI»; a la derecha se añade «con alteración secundaria del ST-T». No son dos enfermedades sino dos grados de un mismo diagnóstico; la HVI con alteración secundaria del ST-T se asocia a más hipertrofia confirmada por ecocardiograma y a peor pronóstico.',
      ),
    },
    { kind: 'check', item: { family: 'chambers', seed: 13 } },
    { kind: 'check', item: { family: 'chambers', seed: 6 } },
    { kind: 'check', item: { family: 'chambers-findings', seed: 14 } },
    { kind: 'drill', families: ['chambers', 'chambers-findings'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [17830, 18776, 14300],
      caption: l(
        '三份真实的左心室肥厚心电图：76 岁女性、35 岁男性、73 岁女性。先确认定准电压，再逐份跑 Sokolow-Lyon、分性别的 Cornell 和 Peguero-Lo Presti，先想好你的报告，然后揭晓。35 岁那位记得：年轻人电压本来就高。',
        'Three real LVH tracings: a 76-year-old woman, a 35-year-old man and a 73-year-old woman. Check the calibration first, then run Sokolow-Lyon, sex-specific Cornell and Peguero-Lo Presti on each, commit to a report, then reveal. For the 35-year-old remember: voltage runs high in the young anyway.',
        'Tres trazados reales de HVI: una mujer de 76 años, un varón de 35 y una mujer de 73. Comprueba primero la calibración y aplica después Sokolow-Lyon, Cornell según el sexo y Peguero-Lo Presti en cada uno; decide tu informe y luego mira la solución. En el varón de 35 recuerda: en jóvenes el voltaje ya es alto de por sí.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '写"劳损（strain）"：现用术语是"左心室肥厚伴继发性ST-T改变"，而且不要从心电图推断压力还是容量负荷。',
          'Writing "strain": the current term is "LVH with secondary ST–T abnormality", and pressure vs volume load cannot be inferred from the ECG.',
          'Escribir «sobrecarga» («strain»): el término actual es «HVI con alteración secundaria del ST-T», y la sobrecarga de presión o de volumen no puede deducirse del ECG.',
        ),
        l(
          '一条标准阴性就当作排除：电压标准敏感度只有 10–25 %，心电图正常不能排除左心室肥厚。',
          'Treating one negative criterion as exclusion: voltage criteria are only 10–25 % sensitive; a normal ECG does not exclude LVH.',
          'Tratar un criterio negativo como exclusión: los criterios de voltaje tienen una sensibilidad del 10-25 %; un ECG normal no excluye la HVI.',
        ),
        l(
          '不看定准电压就测量：半电压（5 mm/mV）会把所有数字减半，标准全部"转阴"。',
          'Measuring without checking the calibration: half gain (5 mm/mV) halves every number and "negatives" all the criteria.',
          'Medir sin mirar la calibración: con media ganancia (5 mm/mV) todas las cifras se reducen a la mitad y los criterios «se niegan».',
        ),
        l(
          '在年轻人、胸壁薄或黑种人身上把单纯高电压读成左心室肥厚：这些人群电压本来就高；Cornell 分性别，35–40 岁以下仅凭电压要谨慎。',
          'Reading pure high voltage as LVH in a young, thin-chested or Black patient: voltage runs high in these groups; Cornell is sex-specific, and under ~35–40 y voltage alone deserves caution.',
          'Leer un voltaje alto aislado como HVI en un paciente joven, de tórax delgado o negro: el voltaje ya es alto en estos grupos; Cornell es específico por sexo y antes de los ~35-40 años el voltaje solo exige cautela.',
        ),
        l(
          '在左束支阻滞或左前分支阻滞里套用 Sokolow-Lyon：左前分支阻滞时 I/aVL 的 R 波标准不可靠（改用基于 S 波的标准），左束支阻滞时电压标准基本不可靠——诊断要非常谨慎。',
          'Applying Sokolow-Lyon inside LBBB or LAFB: with LAFB the R-wave criteria in I/aVL are unreliable (use S-wave-based criteria instead); with LBBB voltage criteria are largely unreliable — diagnose with great caution.',
          'Aplicar Sokolow-Lyon dentro de un bloqueo de rama izquierda o un bloqueo fascicular anterior izquierdo: con BFAI los criterios de onda R en I/aVL no son fiables (usar criterios basados en la S); con BRI el voltaje no es fiable en general: diagnosticar solo con gran cautela.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '命名标准：Sokolow-Lyon（S V1 + R V5/V6 较大者 >35 mm）、R aVL ≥11 mm、Cornell（S V3 + R aVL >28 男 / >20 女 mm）、Peguero-Lo Presti（最深 S + S V4 ≥28 男 / ≥23 女 mm，敏感度最高）。',
          'Named criteria: Sokolow-Lyon (S V1 + larger of R V5/V6 >35 mm), R aVL ≥11 mm, Cornell (S V3 + R aVL >28 mm men / >20 mm women), Peguero-Lo Presti (deepest S + S V4 ≥28 mm men / ≥23 mm women, the most sensitive).',
          'Criterios con nombre: Sokolow-Lyon (S V1 + la mayor de R V5/V6 >35 mm), R aVL ≥11 mm, Cornell (S V3 + R aVL >28 mm en varones / >20 mm en mujeres), Peguero-Lo Presti (la S más profunda + S V4 ≥28 mm en varones / ≥23 mm en mujeres, el más sensible).',
        ),
        l(
          'Romhilt-Estes 计分：电压 3 分、典型 ST-T 3 分（洋地黄时 1 分）、左心房异常 3 分、电轴左偏 2 分、QRS ≥90 ms 1 分、V5/V6 R 峰时间 ≥50 ms 1 分；≥5 分诊断左心室肥厚。',
          'Romhilt-Estes score: voltage 3, typical ST–T 3 (1 on digitalis), LA abnormality 3, LAD 2, QRS ≥90 ms 1, R-peak time V5/V6 ≥50 ms 1; ≥5 points diagnose LVH.',
          'Puntuación de Romhilt-Estes: voltaje 3, ST-T típico 3 (1 con digital), anomalía auricular izquierda 3, desviación izquierda del eje 2, QRS ≥90 ms 1, tiempo hasta la cúspide de la R en V5/V6 ≥50 ms 1; ≥5 puntos diagnostican HVI.',
        ),
        l(
          '继发性ST-T改变：与主波相反的不对称 ST 压低和 T 倒置（I、aVL、V5–V6），常伴 V1–V3 镜像 ST 抬高；报告"左心室肥厚伴继发性ST-T改变"，不说"劳损"。',
          'Secondary ST–T abnormality: asymmetric ST depression and T inversion opposite the dominant R (I, aVL, V5–V6), often with mirror ST elevation in V1–V3; report "LVH with secondary ST–T abnormality", not "strain".',
          'Alteración secundaria del ST-T: descenso asimétrico del ST e inversión de la T opuestos a la R dominante (I, aVL, V5-V6), a menudo con elevación del ST en espejo en V1-V3; se informa «HVI con alteración secundaria del ST-T», no «sobrecarga».',
        ),
        l(
          '电压标准敏感度仅 10–25 %：心电图正常不能排除左心室肥厚；电压随年龄、性别、体型和人群而变，左束支阻滞/左前分支阻滞时标准失效。',
          'Voltage criteria are only 10–25 % sensitive: a normal ECG does not exclude LVH; voltage shifts with age, sex, build and population, and the criteria fail in LBBB/LAFB.',
          'Los criterios de voltaje tienen solo un 10-25 % de sensibilidad: un ECG normal no excluye la HVI; el voltaje varía con la edad, el sexo, el hábito y la población, y los criterios fallan en el bloqueo de rama izquierda y el bloqueo fascicular anterior izquierdo.',
        ),
      ],
    },
  ],
  sources: [
    'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261',
    'Peguero JG et al. J Am Coll Cardiol 2017;69:1694-1703',
    'Romhilt DW, Estes EH. Am Heart J 1968;75:752-758',
    'Castellano et al. 2004',
  ],
};

export default lesson;
