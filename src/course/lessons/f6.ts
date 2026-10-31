/**
 * f6 — Step 1: check the signal quality (stage F, docs/PLAN.md §3).
 * Criteria: docs/curriculum/criteria.md `arm-cable-reversal`, other limb cable reversals, finding the faulty electrode,
 * technical artefacts mimicking arrhythmia, baseline wander, mains interference, computer interpretation
 * ("missing in the book" rows), outdated "six-step method" replaced by a structured read that starts with technical
 * quality (critic.json).
 * Taught by two scenes (docs/design/f-explainers.md §4.8–4.9, text policy §5): `cable-swap` carries the reversal
 * signatures and the "chest leads unchanged" discriminator; `noisy-electrode` carries the culprit-electrode rule and the
 * QRS marching through. The prose left here is the procedure (worked), the reference numbers (criteria) and the reads.
 * Reversals are the `normal` heart recorded through a wrong hook-up (one-source rule). Artefacts come from the technical
 * scenarios of the synth catalogue (noise on one named electrode, so the localisation rule can be read on the tracing):
 * `muscle-tremor` (EMG on the left arm) and `muscle-tremor-parkinsonian` (5-Hz tremor on the left leg, pseudo-flutter).
 * The noisy-electrode scene gets a clean `normal` recording (its noise is added in the scene, never doubled).
 */
import type { Lesson } from '../api';
import { l } from '../../core/l10n';
import { choiceItem, leadItem, OPT, PLACEMENT, SRC, syn } from './f-shared';

const lesson: Lesson = {
  id: 'f6',
  stage: 'F',
  order: 6,
  title: l('第一步：检查信号质量', 'Step 1: check the signal quality', 'Paso 1: comprobar la calidad de la señal'),
  summary: l(
    '判读前先用 30 秒检查记录：定标、导联齐全、基线干净、导线接对。不合格就重做。',
    'Spend 30 seconds on the recording first: calibration, all leads, a clean baseline, cables in place. If it fails, record again.',
    'Dedica primero 30 segundos al registro: calibración, todas las derivaciones, línea de base limpia y cables en su sitio. Si falla, repítelo.',
  ),
  objectives: [
    l('每次判读前先做固定的技术检查。', 'Run a fixed technical check before every read.', 'Hacer una comprobación técnica fija antes de cada lectura.'),
    l(
      '识别肢体导线反接，并与右位心区分。',
      'Spot a limb-cable reversal and tell it from dextrocardia.',
      'Reconocer una inversión de los cables de los miembros y distinguirla de la dextrocardia.',
    ),
    l(
      '根据带伪差的导联找出有问题的电极。',
      'Find the noisy electrode from the leads that carry the artefact.',
      'Localizar el electrodo con ruido por las derivaciones que muestran el artefacto.',
    ),
    l('有问题的记录要重做，而不是去解释。', 'Repeat a flawed recording instead of interpreting it.', 'Repetir un registro defectuoso en lugar de interpretarlo.'),
  ],
  minutes: 11,
  competencies: ['C12', 'C1'],
  findings: ['electrode-reversal-la-ra', 'electrode-reversal-la-ll', 'electrode-reversal-ra-ll', 'precordial-misplacement', 'muscle-tremor'],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 611, undefined, PLACEMENT.laRa),
      view: { layout: '3x4+1' },
      question: l(
        '35 岁健康男性，无症状。先看 I 导联和 aVR：你会把这份心电图签为正常吗？',
        'A healthy 35-year-old man without symptoms. Look at lead I and aVR first: would you sign this ECG as normal?',
        'Varón sano de 35 años, sin síntomas. Mira primero la derivación I y aVR: ¿firmarías este ECG como normal?',
      ),
      reveal: l(
        '还不能。I 导联完全倒置、aVR 直立，但 R 波仍从 V1 到 V4 增高：是**上肢导线接反**，不是右位心。纠正后重录。',
        'Not yet. Lead I is fully inverted and aVR upright, yet R still grows from V1 to V4: **the arm cables are reversed**, not dextrocardia. Fix them and record again.',
        'Todavía no. I está invertida por completo y aVR es positiva, pero la R sigue creciendo de V1 a V4: **están invertidos los cables de los brazos**, no es una dextrocardia. Corrígelos y repite el registro.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'cable-swap' },
      ecg: syn('normal', 611),
      caption: l(
        '亲手重现开头那份心电图：先点击 LA，再点击 RA，然后与下方接线正确的 12 导联对比。',
        'Rebuild the hook ECG yourself: click LA, then RA, and compare with the correct 12-lead below.',
        'Reconstruye tú mismo el ECG inicial: pulsa LA y después RA, y compáralo con el ECG de 12 derivaciones correcto de abajo.',
      ),
    },
    {
      kind: 'worked',
      title: l('在开头那份图上做 30 秒检查', 'The 30-second check on the hook ECG', 'La comprobación de 30 segundos en el ECG inicial'),
      ecg: syn('normal', 611, undefined, PLACEMENT.laRa),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('定标、走纸、导联', 'Calibration, speed, leads', 'Calibración, velocidad, derivaciones'),
          body: l(
            '定标脉冲 10 mm（1 mV）、25 mm/s，12 个导联齐全：继续。',
            'Calibration pulse 10 mm (1 mV), 25 mm/s, all 12 leads present: go on.',
            'Pulso de calibración de 10 mm (1 mV), 25 mm/s y las 12 derivaciones presentes: sigue.',
          ),
        },
        {
          title: l('基线', 'Baseline', 'Línea de base'),
          body: l(
            '各导联基线平稳，没有细小振荡、震颤或漂移：继续。',
            'The baseline is steady in every lead, with no buzz, tremor or drift: go on.',
            'La línea de base es estable en todas las derivaciones, sin interferencia, temblor ni deriva: sigue.',
          ),
        },
        {
          title: l('I 导联和 aVR', 'Lead I and aVR', 'La derivación I y aVR'),
          body: l(
            'I 导联 P、QRS、T 全部向下，aVR 的 P 和 QRS 向上：窦性心律时这是危险信号。',
            'P, QRS and T negative in I, P and QRS upright in aVR: a red flag in sinus rhythm.',
            'P, QRS y T negativas en I, P y QRS positivos en aVR: señal de alarma en ritmo sinusal.',
          ),
          marks: [
            { auto: 'p', lead: 'I' },
            { auto: 'p', lead: 'aVR' },
          ],
          highlightLeads: ['I', 'aVR'],
        },
        {
          title: l('胸导联：右位心吗？', 'V1–V6: dextrocardia?', 'V1–V6: ¿dextrocardia?'),
          body: l(
            'R 波从 V1 到 V4 增高；右位心时 R 波会向 V6 逐渐变小，所以这不是右位心。',
            'R grows from V1 to V4; in dextrocardia it would shrink toward V6, so this is not dextrocardia.',
            'La R crece de V1 a V4; en una dextrocardia disminuiría hacia V6, así que no es una dextrocardia.',
          ),
          marks: [
            { auto: 'r', lead: 'V1' },
            { auto: 'r', lead: 'V4' },
          ],
          highlightLeads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
        },
        {
          title: l('决定', 'Decide', 'Decisión'),
          body: l(
            '电极连接不合格：纠正上肢导线，重新记录后再判读。',
            'The hook-up fails the check: fix the arm cables and record again before you read on.',
            'La conexión no supera la comprobación: corrige los cables de los brazos y repite el registro antes de seguir leyendo.',
          ),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('哪个导联变成了直线？', 'Which lead went flat?', '¿Qué derivación quedó plana?'),
      view: { layout: '3x4+1' },
      left: {
        ecg: syn('normal', 612, undefined, PLACEMENT.raRl),
        caption: l('记录 A', 'Recording A', 'Registro A'),
        marks: [{ kind: 'lead', lead: 'II', color: 'err' }],
      },
      right: {
        ecg: syn('normal', 612, undefined, PLACEMENT.laRl),
        caption: l('记录 B', 'Recording B', 'Registro B'),
        marks: [{ kind: 'lead', lead: 'III', color: 'err' }],
      },
      point: l(
        'A：II 平直（RA 导线在右腿）。B：III 平直（LA 导线在右腿）。两腿电位相同：变平的导联指出该纠正的导线。',
        'A: II flat (RA cable on the right leg). B: III flat (LA cable on the right leg). Both legs share one potential: the flat lead names the cable to fix.',
        'A: II plana (cable RA en la pierna derecha). B: III plana (cable LA en la pierna derecha). Las piernas tienen el mismo potencial: la derivación plana indica qué cable corregir.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'noisy-electrode' },
      ecg: syn('normal', 618),
      caption: l(
        '先看完左腿的演示；再点击左臂电极，预测哪条肢体导联保持干净，然后按“揭晓”：最后一道练习会用到它。',
        'Watch the left-leg tour; then click the left-arm electrode, predict which limb lead stays clean, and press Reveal: you will need it in the last check.',
        'Mira el recorrido de la pierna izquierda; después pulsa el electrodo del brazo izquierdo, predice qué derivación de los miembros queda limpia y pulsa Mostrar: lo necesitarás en el último ejercicio.',
      ),
    },
    {
      kind: 'criteria',
      title: l('伪差特征', 'Artefact signatures', 'Rasgos de los artefactos'),
      items: [
        {
          label: l('细小、规则的振荡', 'Fine, regular buzz', 'Oscilación fina y regular'),
          value: l(
            '交流电干扰：50 Hz（西班牙、欧洲、中国）或 60 Hz（美国、部分拉丁美洲国家）；检查接触和导线',
            'mains: 50 Hz (Spain, Europe, China) or 60 Hz (USA, parts of Latin America); check contact and cables',
            'interferencia de la red eléctrica: 50 Hz (España, Europa, China) o 60 Hz (EE. UU., parte de Latinoamérica); revisa el contacto y los cables',
          ),
        },
        {
          label: l('4–6 Hz 节律性振荡', 'Rhythmic 4–6 Hz oscillation', 'Oscilación rítmica de 4–6 Hz'),
          value: l(
            '震颤：可类似心房扑动；QRS 按原 RR 间期照常出现',
            'tremor: can mimic flutter; the QRS complexes march through at the same RR',
            'temblor: puede imitar un flúter; los QRS siguen pasando con el mismo RR',
          ),
        },
        {
          label: l('随呼吸缓慢起伏', 'Slow drift with breathing', 'Deriva lenta con la respiración'),
          value: l(
            '基线漂移：可造成或掩盖 ST 偏移',
            'baseline wander: can create or hide ST deviation',
            'deriva de la línea de base: puede crear u ocultar desviaciones del ST',
          ),
        },
      ],
      source:
        'Kligfield 2007 AHA/ACCF/HRS Part I; Knight BP et al. N Engl J Med 1999;341:1270-1274; Baranchuk A et al. Crit Care Nurse 2009;29:67-73',
    },
    {
      kind: 'contrast',
      title: l('心房扑动还是震颤？', 'Flutter or tremor?', '¿Flúter o temblor?'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'III', 'aVF', 'V1'] },
      left: {
        ecg: syn('atrial-flutter', 616, { conductionRatio: 4 }),
        caption: l('A：69 岁男性', 'A: man, 69', 'A: varón de 69 años'),
      },
      right: {
        ecg: syn('muscle-tremor-parkinsonian', 617),
        caption: l('B：74 岁男性', 'B: man, 74', 'B: varón de 74 años'),
        marks: [{ auto: 'p', lead: 'I' }],
      },
      point: l(
        '两者在 II、III、aVF 都有约 300 次/分的锯齿波。A 是心房扑动：任何导联都没有 P 波，V1 也有 F 波，4:1 下传。B 是左腿震颤：I 导联干净，每个 QRS 前都有正常 P 波，所以是伪差。',
        'Both show a saw-tooth of about 300/min in II, III and aVF. A, flutter: no P wave anywhere; F waves also in V1, conducted 4:1. B, left-leg tremor: lead I is clean and shows a normal P before every QRS, so it is an artefact.',
        'Ambos muestran dientes de sierra a unos 300 lpm en II, III y aVF. A, flúter: no hay onda P en ninguna derivación; también hay ondas F en V1, con conducción 4:1. B, temblor de la pierna izquierda: I está limpia y muestra una P normal antes de cada QRS, así que es un artefacto.',
      ),
    },
    {
      kind: 'check',
      item: {
        inline: leadItem({
          family: 'artefacts',
          competency: 'C12',
          seed: 61001,
          ecg: syn('normal', 613, undefined, PLACEMENT.laRl),
          view: { layout: '3x4+1' },
          leads: ['III'],
          prompt: l(
            '有一个肢体导联几乎是直线。点击它，再想一想该纠正哪根导线。',
            'One limb lead is almost flat. Click it, then think which cable to fix.',
            'Una derivación de los miembros es casi plana. Haz clic en ella y piensa qué cable corregir.',
          ),
          explanation: l(
            'III（LL − LA）平直：LA 导线夹在右腿上，与 LL 电位相同。换回 LA 与 RL，重新记录。',
            'III (LL − LA) is flat: the LA cable sits on the right leg, at the same potential as LL. Swap LA and RL back and record again.',
            'III (LL − LA) es plana: el cable LA está en la pierna derecha, al mismo potencial que LL. Recoloca LA y RL y repite el registro.',
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
          seed: 61002,
          ecg: syn('normal', 614, undefined, PLACEMENT.raLl),
          view: { layout: '3x4+1' },
          findings: ['electrode-reversal-ra-ll'],
          prompt: l(
            '一位无症状的年轻人。看 II 和 aVR，再看 aVL 和胸导联。最可能的解释是什么？',
            'A young adult without symptoms. Look at II and aVR, then at aVL and the chest leads. What is most likely?',
            'Un adulto joven sin síntomas. Mira II y aVR, y después aVL y las precordiales. ¿Qué es lo más probable?',
          ),
          options: [
            { id: 'ra-ll', label: OPT.raLl },
            { id: 'la-ra', label: OPT.laRa },
            { id: 'inferior', label: l('陈旧性下壁梗死', 'Old inferior infarction', 'Infarto inferior antiguo') },
            { id: 'normal', label: OPT.normal },
          ],
          correct: 'ra-ll',
          explanation: l(
            'II、III、aVF 均为负向，II 的 P 波也倒置；aVR 直立，像正常的 aVF；aVL 与 V1–V6 正常：RA 与 LL 导线反接。陈旧性梗死不会使 P 波倒置，所以先查导线，再谈下壁 Q 波。',
            'II, III and aVF negative with P inverted in II too, aVR upright like a normal aVF, aVL and V1–V6 normal: RA and LL cables reversed. An old infarct does not flip the P wave, so check the cables before calling inferior Q waves.',
            'II, III y aVF negativas, con la P también invertida en II; aVR positiva como una aVF normal; aVL y V1–V6 normales: cables RA y LL invertidos. Una necrosis antigua no invierte la onda P, así que revisa los cables antes de hablar de ondas Q inferiores.',
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
          seed: 61003,
          ecg: syn('normal', 615, undefined, PLACEMENT.laLl),
          view: { layout: '3x4+1' },
          findings: ['electrode-reversal-la-ll'],
          prompt: l(
            '乍看没什么问题。比较 I 和 II 的 P 波，再看 III。最可能的是？',
            'Nothing looks dramatic. Compare the P waves in I and II, then look at III. What is most likely?',
            'Nada parece llamativo. Compara la P de I y II y mira después III. ¿Qué es lo más probable?',
          ),
          hint: l('窦性心律时，P 波通常在 II 导联比 I 导联大。', 'In sinus rhythm the P wave is normally larger in II than in I.', 'En ritmo sinusal la onda P suele ser mayor en II que en I.'),
          options: [
            { id: 'normal', label: OPT.normal },
            { id: 'la-ll', label: OPT.laLl },
            { id: 'la-ra', label: OPT.laRa },
            { id: 'ra-ll', label: OPT.raLl },
          ],
          correct: 'la-ll',
          explanation: l(
            'P 波 I 比 II 大，III 以负向为主：LA 与 LL 导线反接（I ↔ II，aVL ↔ aVF，III 倒置）。容易漏掉——查 P 波就能发现。',
            'P larger in I than in II, mainly negative in III: LA and LL cables reversed (I ↔ II, aVL ↔ aVF, III inverted). Easy to miss — the P-wave check catches it.',
            'P mayor en I que en II y sobre todo negativa en III: cables LA y LL invertidos (I ↔ II, aVL ↔ aVF, III invertida). Pasa desapercibida con facilidad; la comprobación de la P la detecta.',
          ),
        }),
      },
    },
    {
      kind: 'check',
      item: {
        inline: leadItem({
          family: 'artefacts',
          competency: 'C12',
          seed: 61004,
          ecg: syn('muscle-tremor', 618),
          view: { layout: '3x4+1' },
          findings: ['muscle-tremor'],
          leads: ['II'],
          prompt: l(
            '细小的噪声覆盖了部分导联。点击唯一干净的肢体导联，再说出该处理哪个电极。',
            'Fine noise covers some leads. Click the one clean limb lead, then name the electrode to fix.',
            'Un ruido fino cubre algunas derivaciones. Haz clic en la única de los miembros que está limpia y di qué electrodo corregir.',
          ),
          explanation: l(
            'II（LL − RA）是唯一不用 LA 电极的肢体导联，所以干净；I 和 III 带噪声，aVL 最明显。让左臂放松，重贴 LA 电极后重录。',
            'II (LL − RA) is the only limb lead without the LA electrode, so it is clean; I and III carry the noise, largest in aVL. Relax the left arm, re-attach the LA electrode, record again.',
            'II (LL − RA) es la única de los miembros sin el electrodo LA, por eso está limpia; I y III llevan el ruido, máximo en aVL. Relaja el brazo izquierdo, recoloca el electrodo LA y repite.',
          ),
        }),
      },
    },
    { kind: 'drill', families: ['artefacts', 'compare-technical', 'paper'], count: 6, passScore: 0.8 },
    {
      kind: 'real',
      ids: [1101, 21589],
      caption: l(
        '对这两份真实记录做 30 秒检查：都合格，这是常态，别“发明”问题。',
        'Run the 30-second check on these two real recordings. Both pass, as most do: do not invent problems.',
        'Haz la comprobación de 30 segundos en estos dos registros reales. Ambos la superan, como casi todos: no inventes problemas.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '相信机器诊断：上肢导线反接可能被打印成“电轴右偏”或“侧壁梗死”。',
          'Trusting the machine: an arm-cable reversal may print as “right axis deviation” or “lateral infarction”.',
          'Fiarse del informe automático: una inversión de los cables de los brazos puede salir como «desviación del eje a la derecha» o «infarto lateral».',
        ),
        l(
          '把震颤伪差当作心房扑动、心房颤动或室性心动过速：找照常“穿行”的 QRS 波群。',
          'Calling a tremor artefact flutter, fibrillation or VT: look for the QRS marching through.',
          'Llamar flúter, fibrilación o TV a un artefacto por temblor: busca los QRS que siguen pasando.',
        ),
        l(
          '用滤波“修好”噪声而不改善电极接触，或透过基线漂移判断 ST 段。',
          'Fixing noise with a filter instead of better electrode contact, or judging ST through baseline wander.',
          'Corregir el ruido con un filtro en lugar de mejorar el contacto, o valorar el ST sobre una línea de base que oscila.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '每次判读的第一步：定标 10 mm/mV、25 mm/s、12 个导联齐全、基线干净、电极位置合理。',
          'Step 1 of every read: calibration 10 mm/mV, 25 mm/s, all 12 leads, clean baseline, plausible placement.',
          'Paso 1 de toda lectura: calibración 10 mm/mV, 25 mm/s, las 12 derivaciones, línea de base limpia y colocación plausible.',
        ),
        l(
          'I 导联 P–QRS–T 全部倒置而胸导联正常（R 波从 V1 起增高，不向 V6 变小）= 上肢导线接反。',
          'Negative P, QRS and T in lead I with normal chest leads (R growing from V1, not shrinking toward V6) = arm cables reversed.',
          'P, QRS y T negativas en I con precordiales normales (la R crece desde V1, no disminuye hacia V6) = cables de los brazos invertidos.',
        ),
        l('某个肢体导联变成直线 = 中性线（RL）与一根上肢导线互换。', 'A flat limb lead = the neutral (RL) cable swapped with an arm cable.', 'Una derivación de los miembros plana = el cable neutro (RL) intercambiado con el de un brazo.'),
        l(
          '伪差出现在两个肢体导联而第三个没有 → 问题出在它们共用的电极。',
          'Artefact in two limb leads but not the third → their shared electrode is the culprit.',
          'Artefacto en dos derivaciones de los miembros pero no en la tercera → el culpable es su electrodo común.',
        ),
        l('检查不通过就重新记录，然后再判读。', 'If the check fails, repeat the ECG before you interpret it.', 'Si la comprobación falla, repite el ECG antes de interpretarlo.'),
      ],
    },
  ],
  sources: [
    SRC.kligfield,
    'Batchvarov VN, Malik M, Camm AJ. Incorrect electrode cable connection during electrocardiographic recording. Europace 2007;9:1081-1090',
    'Harrigan RA, Chan TC, Brady WJ. Electrocardiographic electrode misplacement, misconnection, and artifact. J Emerg Med 2012;43:1038-1044',
    'Aslanger E, Yalin K. Electromechanical association: a subtle electrocardiogram artifact. J Electrocardiol 2012;45:15-17',
    'Knight BP et al. Clinical consequences of electrocardiographic artifact mimicking ventricular tachycardia. N Engl J Med 1999;341:1270-1274',
    'Baranchuk A et al. Electrocardiography pitfalls and artifacts: the 10 commandments. Crit Care Nurse 2009;29:67-73',
    'Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms: benefits and limitations. J Am Coll Cardiol 2017;70:1183-1192',
    SRC.book,
  ],
};

export default lesson;
