/**
 * O5 — Hypothermia (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md "Hypothermia" missing-book bullet (Antzelevitch 2016, Dow 2019 WMS),
 * `osborn-waves` finding, Kusumoto 2019 for the bradycardia context.
 *
 * Tracings (checked against the model truth, tests/course/lessons-o.test.ts): `hypothermia` = sinus bradycardia
 * (rate dial 38–56/min), PR 230 ms, QRS ≈ 140 ms (the Osborn dome is its terminal part), QTcF ≈ 490 ms and a positive
 * J dome at the end of the QRS, clearest in II, aVF and V4–V6. The rate dial
 * changes the rate only, not the temperature: the lesson never claims the hump grows with it. PTB-XL has no
 * hypothermia label: no real block.
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const STRIP = { layout: 'strip', lead: 'II' } as const;

/** What to do with the cold patient's bradycardia. */
const coldActionCheck: Item = {
  id: 'o5:cold-bradycardia',
  family: 'metabolic',
  competency: 'C10',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '72 岁男性，夜里倒在雪地中，核心体温 29 °C，有自主循环，血压 90/50 mmHg。心电图如图。此时最合适的处理是哪一项？',
    'A man of 72 found lying in the snow overnight; core temperature 29 °C, with a pulse, blood pressure 90/50 mmHg. His ECG is shown. Which action fits best now?',
    'Varón de 72 años hallado de madrugada tendido en la nieve; temperatura central de 29 °C, con pulso y tensión arterial de 90/50 mmHg. Este es su ECG. ¿Qué actuación es la más adecuada ahora?',
  ),
  ecg: synth('hypothermia', 1487, { rate: 44 }),
  view: { layout: '3x4+1', highlightLeads: ['II', 'V5'] },
  explanation: l(
    '窦缓、PR 与 QT 延长、J 点驼峰（Osborn 波）——中度低体温的心电图。这里的心动过缓是**低温的生理后果**，不是需要药物或起搏的原发病：阿托品在低温心肌上基本无效，复温之前也不需要起搏（只有复温后心动过缓仍持续才考虑）。正确的做法是：轻柔搬动（粗暴操作可诱发室颤）、水平体位、主动复温、持续心电监护；节律和 J 波会随复温恢复。J 点的驼峰也不是 STEMI——不要启动导管室。',
    'Sinus bradycardia, long PR and QT, and a hump at the J point (Osborn waves) — the ECG of moderate hypothermia. The bradycardia is a **physiological consequence of the cold**, not a primary disease needing drugs or pacing: atropine barely works on cold myocardium, and pacing is not indicated before rewarming (only if the bradycardia persists once the patient is warm). The right move: gentle handling (rough movement can trigger VF), keep him horizontal, active rewarming and continuous monitoring; the rhythm and the J waves recover as he warms. And the J-point hump is not a STEMI — do not activate the cath lab.',
    'Bradicardia sinusal, PR y QT largos y una joroba en el punto J (ondas de Osborn): el ECG de una hipotermia moderada. La bradicardia es una **consecuencia fisiológica del frío**, no una enfermedad primaria que necesite fármacos o marcapasos: la atropina apenas actúa sobre el miocardio frío y la estimulación no está indicada antes de recalentar (solo si la bradicardia persiste con el paciente ya caliente). Lo correcto: movilización suave (los movimientos bruscos pueden provocar FV), posición horizontal, recalentamiento activo y monitorización continua; el ritmo y las ondas J se recuperan al calentarse. Y la joroba del punto J no es un IAMCEST: no actives la sala de hemodinámica.',
  ),
  findings: ['hypothermia', 'osborn-waves'],
  key: {
    options: [
      { id: 'rewarm', label: l('轻柔搬动、主动复温、持续监护', 'Gentle handling, active rewarming, continuous monitoring', 'Movilización suave, recalentamiento activo y monitorización continua') },
      { id: 'atropine', label: l('静脉阿托品治疗心动过缓', 'IV atropine for the bradycardia', 'Atropina IV para la bradicardia') },
      { id: 'pace', label: l('立即经皮起搏', 'Immediate transcutaneous pacing', 'Estimulación transcutánea inmediata') },
      { id: 'cath', label: l('J 点抬高：启动导管室', 'J-point elevation: activate the cath lab', 'Elevación del punto J: activar hemodinámica') },
    ],
    correct: 'rewarm',
  },
};

const lesson: Lesson = {
  id: 'o5',
  stage: 'O',
  order: 5,
  title: l('低体温', 'Hypothermia', 'Hipotermia'),
  summary: l(
    '低体温在 J 点画出 Osborn 波（下壁与侧壁最清楚，越冷越大），伴窦性心动过缓、PR/QRS/QT 全部延长、缓慢心房颤动和寒战伪差；约 28–30 °C 以下室颤风险陡增。心动过缓是低温的后果：治疗是轻柔搬动与复温，不是阿托品。',
    'Hypothermia draws Osborn (J) waves at the J point (clearest inferiorly and laterally, larger when colder), with sinus bradycardia, PR, QRS and QT all prolonged, AF with a slow response and shivering artefact; below about 28–30 °C the risk of VF rises steeply. The bradycardia is a consequence of the cold: the treatment is gentle handling and rewarming, not atropine.',
    'La hipotermia dibuja ondas J de Osborn en el punto J (más claras en cara inferior y lateral, mayores cuanto más frío), con bradicardia sinusal, PR, QRS y QT alargados, FA con respuesta lenta y artefacto por escalofríos; por debajo de unos 28–30 °C el riesgo de FV aumenta bruscamente. La bradicardia es consecuencia del frío: el tratamiento es la movilización suave y el recalentamiento, no la atropina.',
  ),
  objectives: [
    l('识别 Osborn（J）波及其分布。', 'Recognise the Osborn (J) wave and its distribution.', 'Reconocer la onda J de Osborn y su distribución.'),
    l('列出低体温的心电图全套改变，并用测量证实（心率、PR、QRS、QTc）。', 'List the full ECG ensemble of hypothermia and confirm it by measurement (rate, PR, QRS, QTc).', 'Enumerar el conjunto electrocardiográfico de la hipotermia y confirmarlo midiendo (frecuencia, PR, QRS, QTc).'),
    l('把 Osborn 波与早期复极、高钙血症和 STEMI 的 J 点改变区分开。', 'Separate Osborn waves from the J-point changes of early repolarisation, hypercalcaemia and STEMI.', 'Distinguir las ondas de Osborn de los cambios del punto J de la repolarización precoz, la hipercalcemia y el IAMCEST.'),
    l('知道低温患者的心动过缓与房颤要靠复温而不是药物处理，并且要轻柔搬动（28–30 °C 以下室颤风险）。', 'Know that the cold patient’s bradycardia and AF are treated by rewarming, not drugs, and that handling must be gentle (VF risk below 28–30 °C).', 'Saber que la bradicardia y la FA del paciente frío se tratan recalentando, no con fármacos, y que hay que manipularlo con suavidad (riesgo de FV por debajo de 28–30 °C).'),
  ],
  minutes: 15,
  competencies: ['C10', 'C2'],
  findings: ['hypothermia', 'osborn-waves', 'sinus-bradycardia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('hypothermia', 1481, { rate: 42 }),
      view: STRIP,
      question: l(
        '冬季野外发现一名昏迷患者：心率约 42 次/分，每个 QRS 结束时都多出一个小“驼峰”。这些驼峰是什么？接下来最怕出现什么节律？',
        'An unconscious patient found outdoors in winter: heart rate about 42/min, and every QRS ends with an extra small hump. What are the humps, and which rhythm do you fear next?',
        'Un paciente inconsciente hallado a la intemperie en invierno: frecuencia de unas 42 lpm y cada QRS termina con una pequeña joroba de más. ¿Qué son y qué ritmo temes a continuación?',
      ),
      reveal: l(
        'Osborn（J）波——低体温的标志：贴在 QRS 末尾、J 点上的正向驼峰，II、aVF 与 V4–V6 最清楚。全套还有：窦性心动过缓、PR/QRS/QT 延长，常见缓慢心房颤动。约 28–30 °C 以下室颤风险陡增——搬动要轻柔，赶紧复温。',
        'Osborn (J) waves — the signature of hypothermia: a positive hump stuck to the end of the QRS, at the J point, clearest in II, aVF and V4–V6. The full ensemble: sinus bradycardia, prolonged PR, QRS and QT, and often AF with a slow response. Below about 28–30 °C the VF risk rises steeply — handle gently and rewarm.',
        'Ondas J de Osborn, la firma de la hipotermia: una joroba positiva pegada al final del QRS, en el punto J, más clara en II, aVF y V4–V6. El conjunto completo: bradicardia sinusal, PR, QRS y QT largos y a menudo FA con respuesta lenta. Por debajo de unos 28–30 °C el riesgo de FV se dispara: manipúlalo con suavidad y recaliéntalo.',
      ),
    },
    {
      kind: 'film',
      title: l('慢，还是冷？', 'Slow, or cold?', '¿Lento o frío?'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'aVF', 'V5'] },
      frames: [
        {
          label: l('正常', 'Normal', 'Normal'),
          ecg: synth('normal', 1482, { rate: 75 }),
          note: l('正常体温，75次/分：PR 160 ms，QRS约95 ms，QT约380 ms。', 'Normal temperature at 75/min: PR 160 ms, QRS about 95 ms, QT about 380 ms.', 'Temperatura normal a 75 lpm: PR de 160 ms, QRS de unos 95 ms, QT de unos 380 ms.'),
          marks: [{ auto: 'pr', lead: 'II' }, { auto: 'qrs', lead: 'II' }, { auto: 'qt', lead: 'II' }],
        },
        {
          label: l('心动过缓', 'Bradycardia', 'Bradicardia'),
          ecg: synth('sinus-bradycardia', 1482, { rate: 46 }),
          note: l('只是慢到46次/分：PR和QRS不变，QT约445 ms只因心率慢。没有驼峰。', 'Only slowed to 46/min: PR and QRS unchanged, QT about 445 ms just because the rate is slow. No hump.', 'Solo más lento, a 46 lpm: PR y QRS sin cambios, QT de unos 445 ms solo por la frecuencia lenta. Sin joroba.'),
          marks: [{ auto: 'pr', lead: 'II' }, { auto: 'qrs', lead: 'II' }, { auto: 'qt', lead: 'II' }],
        },
        {
          label: l('低体温', 'Hypothermia', 'Hipotermia'),
          ecg: synth('hypothermia', 1482, { rate: 46 }),
          note: l('同样46次/分，但冷：PR约230 ms，QRS约140 ms（量到末尾的驼峰，即Osborn波），QT约540 ms。', 'Same 46/min, but cold: PR about 230 ms, QRS about 140 ms (to the end of its hump, the Osborn wave), QT about 540 ms.', 'Los mismos 46 lpm, pero frío: PR de unos 230 ms, QRS de unos 140 ms (hasta el final de su joroba, la onda de Osborn), QT de unos 540 ms.'),
          marks: [
            { auto: 'j', lead: 'II', label: l('Osborn 波', 'Osborn wave', 'onda de Osborn') },
            { auto: 'j', lead: 'V5' },
            { auto: 'pr', lead: 'II' },
            { auto: 'qt', lead: 'II' },
          ],
        },
      ],
      predict: {
        question: l('寒冷让所有离子通道变慢。同一心率下，PR、QRS和QT会怎样？', 'Cold slows every ion channel. At the same rate, what happens to the PR, QRS and QT?', 'El frío enlentece todos los canales iónicos. A la misma frecuencia, ¿qué les pasa al PR, el QRS y el QT?'),
        options: [l('三者都延长', 'All three lengthen', 'Los tres se alargan'), l('只有QT延长', 'Only the QT lengthens', 'Solo se alarga el QT'), l('三者都缩短', 'All three shorten', 'Los tres se acortan')],
        answer: 0,
      },
      caption: l(
        '同一心率下比较，才看得出哪些是冷造成的：PR、QRS、QT都延长，J点出现驼峰（多在约32 °C以下出现，越冷越大）。',
        'Compare at the same rate to see what the cold does: PR, QRS and QT all lengthen and a hump appears at J (usually below about 32 °C, bigger when colder).',
        'Compara a la misma frecuencia para ver lo que hace el frío: PR, QRS y QT se alargan y aparece una joroba en J (suele aparecer por debajo de unos 32 °C y crece con el frío).',
      ),
    },
    {
      kind: 'criteria',
      title: l('低体温心电图', 'The hypothermic ECG', 'El ECG hipotérmico'),
      items: [
        { label: l('Osborn（J）波', 'Osborn (J) waves', 'Ondas J de Osborn'), value: l('J 点处正向驼峰；II、III、aVF、V3–V6 最清楚；越冷越大，复温后消失', 'Positive hump at the J point; clearest in II, III, aVF, V3–V6; larger when colder, gone after rewarming', 'Joroba positiva en el punto J; más clara en II, III, aVF y V3–V6; mayor cuanto más frío, desaparece al recalentar') },
        { label: l('节律', 'Rhythm', 'Ritmo'), value: l('窦性心动过缓；常见缓慢心房颤动；交界性心律；终末为室颤或停搏', 'Sinus bradycardia; AF with a slow response is common; junctional rhythm; in the end VF or asystole', 'Bradicardia sinusal; FA con respuesta lenta frecuente; ritmo de la unión; al final FV o asistolia') },
        { label: l('间期', 'Intervals', 'Intervalos'), value: l('PR、QRS、QT 全部延长', 'PR, QRS and QT all prolonged', 'PR, QRS y QT alargados') },
        { label: l('伪差', 'Artefact', 'Artefacto'), value: l('寒战产生肌电伪差（可掩盖 P 波，貌似房颤/房扑，o10）', 'Shivering adds muscle artefact (it can hide P waves and mimic AF or flutter, o10)', 'Los escalofríos añaden artefacto muscular (puede ocultar las P y simular FA o flutter, o10)') },
        { label: l('分级（WMS 2019）', 'Staging (WMS 2019)', 'Estadios (WMS 2019)'), value: l('轻度 32–35 °C；中度 28–32 °C；重度 <28 °C', 'Mild 32–35 °C; moderate 28–32 °C; severe <28 °C', 'Leve 32–35 °C; moderada 28–32 °C; grave <28 °C') },
        { label: l('风险阈值', 'Risk threshold', 'Umbral de riesgo'), value: l('≈28–30 °C 以下室颤/停搏风险陡增；轻柔搬动；心动过缓与房颤靠复温纠正', 'Below ≈28–30 °C the VF/asystole risk rises steeply; handle gently; bradycardia and AF resolve with rewarming', 'Por debajo de ≈28–30 °C el riesgo de FV/asistolia se dispara; manipulación suave; la bradicardia y la FA ceden al recalentar') },
      ],
      source: 'Antzelevitch C et al. J-wave syndromes expert consensus. Heart Rhythm 2016;13:e295-e324; Dow J et al. Wilderness Medical Society guidelines for accidental hypothermia: 2019 update. Wilderness Environ Med 2019;30:S47-S69',
    },
    {
      kind: 'worked',
      title: l('读一张低温心电图', 'Reading a cold ECG', 'Leer un ECG frío'),
      ecg: synth('hypothermia', 1482, { rate: 46 }),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('心率与节律', 'Rate and rhythm', 'Frecuencia y ritmo'),
          body: l('先数心率（这里约 46 次/分），再判节律：每个 QRS 前有一个直立的 P，PR 固定——窦性心动过缓。如果看不到 P 而 RR 不规则，就是缓慢房颤；如果基线发毛，先想寒战伪差。', 'Count the rate first (about 46/min here), then name the rhythm: an upright P before every QRS with a fixed PR — sinus bradycardia. No P with an irregular RR would be slow AF; a fuzzy baseline should make you think of shivering artefact.', 'Cuenta primero la frecuencia (aquí unas 46 lpm) y nombra el ritmo: una P positiva delante de cada QRS con PR fijo: bradicardia sinusal. Sin P y con RR irregular sería una FA lenta; una línea de base "peluda" debe hacerte pensar en artefacto por escalofríos.'),
          marks: [{ auto: 'rr', lead: 'II' }, { auto: 'p', lead: 'II' }],
        },
        {
          title: l('量间期', 'Measure the intervals', 'Mide los intervalos'),
          body: l('PR 约 230 ms（一度房室传导阻滞），QRS 约 140 ms（含驼峰），QT 约 540 ms，按 Fridericia 校正约 490 ms。三个间期一起延长——这不是哪一处传导系统的病，而是“整颗心都冷了”。', 'PR about 230 ms (first-degree AV block), QRS about 140 ms (hump included), QT about 540 ms, about 490 ms after Fridericia correction. All three lengthen together — not a disease of one part of the conduction system but "the whole heart is cold".', 'PR de unos 230 ms (bloqueo AV de primer grado), QRS de unos 140 ms (joroba incluida), QT de unos 540 ms, unos 490 ms corregido con Fridericia. Los tres se alargan a la vez: no es una enfermedad de una parte del sistema de conducción, sino "todo el corazón está frío".'),
          marks: [{ auto: 'pr', lead: 'II' }, { auto: 'qt', lead: 'II' }],
        },
        {
          title: l('找到驼峰', 'Find the humps', 'Encuentra las jorobas'),
          body: l('J 点上的正向隆起，在 II、aVF 与 V4–V6 追着看；aVR 里是向下的倒影。注意它后面的 ST 段并没有抬高——这是 J 点的驼峰，不是损伤电流。', 'A positive hump on the J point; chase it in II, aVF and V4–V6; aVR shows it upside down. Note that the ST after it is not elevated — this is a hump at the J point, not an injury current.', 'Una joroba positiva sobre el punto J; síguela en II, aVF y V4–V6; en aVR aparece invertida. Fíjate en que el ST que sigue no está elevado: es una joroba del punto J, no una corriente de lesión.'),
          marks: [{ auto: 'j', lead: 'II' }, { auto: 'j', lead: 'V5' }],
          highlightLeads: ['II', 'aVF', 'V4', 'V5', 'V6'],
        },
        {
          title: l('下一个风险与处理', 'The next risk and the response', 'El siguiente riesgo y la actuación'),
          body: l('报告：窦性心动过缓、一度房室阻滞、QT 延长、Osborn 波——符合中度低体温。28–30 °C 以下是室颤高危：轻柔搬运、水平体位、按流程复温、持续监护。心动过缓不需要阿托品或起搏——随复温恢复，J 波也会消退。', 'Report: sinus bradycardia, first-degree AV block, long QT, Osborn waves — consistent with moderate hypothermia. Below 28–30 °C the VF risk is high: gentle transfer, keep horizontal, protocolised rewarming, continuous monitoring. The bradycardia needs neither atropine nor pacing — it recovers with rewarming, and the J waves fade.', 'Informe: bradicardia sinusal, bloqueo AV de primer grado, QT largo y ondas de Osborn, compatible con hipotermia moderada. Por debajo de 28–30 °C el riesgo de FV es alto: traslado suave, posición horizontal, recalentamiento protocolizado y monitorización continua. La bradicardia no necesita atropina ni marcapasos: se recupera al recalentar, y las ondas J se borran.'),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('Osborn 波还是早期复极？', 'Osborn waves or early repolarisation?', '¿Ondas de Osborn o repolarización precoz?'),
      view: STRIP,
      left: {
        ecg: synth('hypothermia', 1483, { rate: 44 }),
        caption: l('低体温（II）：约 44 次/分、PR 与 QT 长、QRS 末尾有驼峰', 'Hypothermia (II): about 44/min, long PR and QT, a hump at the end of the QRS', 'Hipotermia (II): unas 44 lpm, PR y QT largos, joroba al final del QRS'),
        marks: [{ auto: 'j', lead: 'II' }, { auto: 'qt', lead: 'II' }],
      },
      right: {
        ecg: synth('early-repolarization', 1484),
        caption: l('早期复极（II）：约 62 次/分、QT 正常、J 点约 1.5 mm 抬高并接续凹面 ST', 'Early repolarisation (II): about 62/min, normal QT, J point raised about 1.5 mm into a concave ST', 'Repolarización precoz (II): unas 62 lpm, QT normal, punto J elevado alrededor de 1,5 mm que sigue en un ST cóncavo'),
        marks: [{ auto: 'j', lead: 'II' }, { auto: 'qt', lead: 'II' }],
      },
      point: l(
        '两侧都有 J 点处的改变。左：心率慢、PR 和 QT 都长、驼峰贴在 QRS 末尾而 ST 并不抬高，临床是昏迷与寒冷。右：心率正常、QT 正常，J 点抬高并延续成凹面向上的 ST 段，是年轻健康人。J 波本身不诊断——**间期与体温**诊断。',
        'Both sides change at the J point. Left: slow rate, long PR and QT, a hump stuck to the end of the QRS with no ST elevation after it — and an unconscious, cold patient. Right: normal rate, normal QT, a raised J point continuing into a concave ST — a young, healthy person. The J wave alone diagnoses nothing — **the intervals and the temperature** do.',
        'Ambos lados cambian en el punto J. Izquierda: frecuencia lenta, PR y QT largos y una joroba pegada al final del QRS sin ST elevado detrás, en un paciente frío e inconsciente. Derecha: frecuencia normal, QT normal y un punto J elevado que continúa en un ST cóncavo, en una persona joven y sana. La onda J por sí sola no diagnostica: lo hacen **los intervalos y la temperatura**.',
      ),
    },
    {
      kind: 'film',
      title: l('J点驼峰从哪来？', 'Where does a J-point hump come from?', '¿De dónde sale una joroba en el punto J?'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVL'] },
      frames: [
        {
          label: l('低体温', 'Hypothermia', 'Hipotermia'),
          ecg: synth('hypothermia', 1488, { rate: 48 }),
          note: l('冷：QRS末尾有驼峰，之后ST平；48次/分时QT约530 ms，很长。', 'Cold: a hump at the end of the QRS, then a flat ST; at 48/min the QT is about 530 ms, long.', 'Frío: una joroba al final del QRS y luego un ST plano; a 48 lpm el QT mide unos 530 ms, largo.'),
          marks: [{ auto: 'j', lead: 'II' }, { auto: 'qt', lead: 'II' }],
        },
        {
          label: l('高钙', 'High calcium', 'Calcio alto'),
          ecg: synth('hypercalcemia', 1485),
          note: l('高钙：T波从J点直接升起，QT短（约310 ms）。偶有J点切迹，但QT走的是相反方向。', 'High calcium: the T takes off at J and the QT is short (about 310 ms). A J notch is rare, and the QT goes the other way.', 'Calcio alto: la T arranca en J y el QT es corto (unos 310 ms). Una muesca en J es rara, y el QT va en sentido contrario.'),
          marks: [{ auto: 'j', lead: 'II' }, { auto: 'qt', lead: 'II' }],
        },
        {
          label: l('下壁STEMI', 'Inferior STEMI', 'IAMCEST inferior'),
          ecg: synth('stemi-inferior', 1490),
          note: l('STEMI：不是驼峰，而是II、III、aVF持续抬高的ST段（III最高），aVL对应性压低。', 'STEMI: not a hump but an ST that stays raised in II, III and aVF (highest in III), with reciprocal depression in aVL.', 'IAMCEST: no es una joroba sino un ST que sigue elevado en II, III y aVF (más en III), con descenso recíproco en aVL.'),
          marks: [{ auto: 'st60', lead: 'III' }, { auto: 'st60', lead: 'aVL' }],
        },
      ],
      caption: l(
        'J点驼峰本身不诊断。先量QT、看ST，再结合体温、年龄、症状、用药和血钙。',
        'A J-point hump diagnoses nothing on its own. Measure the QT, look at the ST, then weigh temperature, age, symptoms, drugs and calcium.',
        'Una joroba en J no diagnostica nada por sí sola. Mide el QT, mira el ST y luego valora temperatura, edad, síntomas, fármacos y calcio.',
      ),
    },
    {
      kind: 'film',
      title: l('寒战与缓慢房颤', 'Shivering and slow AF', 'Escalofríos y FA lenta'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'III', 'aVL', 'II'] },
      frames: [
        {
          label: l('安静', 'Still', 'Quieto'),
          ecg: synth('hypothermia', 1486, { rate: 46 }),
          note: l('低体温、没有寒战：基线干净，P波和驼峰都看得清。', 'Hypothermic and not shivering: a clean baseline, the P waves and humps easy to see.', 'Hipotermia sin escalofríos: línea de base limpia, P y jorobas fáciles de ver.'),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'j', lead: 'II' }],
        },
        {
          label: l('寒战', 'Shivering', 'Escalofríos'),
          ecg: { kind: 'synth', req: { scenario: 'hypothermia', seed: 1486, dials: { rate: 46 }, recording: { noise: { emgMv: 0.05, emgOn: ['LA'] } } } },
          note: l('同一颗心，开始寒战：I、III、aVL布满细快的肌电干扰（左上肢电极），II仍干净。在II读节律。', 'Same heart, now shivering: fine, fast muscle noise in I, III and aVL (left-arm electrode), lead II still clean. Read the rhythm in II.', 'El mismo corazón, ahora con escalofríos: ruido muscular fino y rápido en I, III y aVL (electrodo del brazo izquierdo), con II limpia. Lee el ritmo en II.'),
        },
        {
          label: l('缓慢房颤', 'Slow AF', 'FA lenta'),
          ecg: synth('atrial-fibrillation', 1489, { fCoarseness: 0.4 }, 'slow'),
          note: l('没有P波，RR绝对不规则，约55次/分：缓慢房颤，中度低温时常见，复温后多自行转复。', 'No P waves, an irregularly irregular RR at about 55/min: slow AF, common in moderate hypothermia, usually gone after rewarming.', 'Sin P, RR irregularmente irregular a unos 55 lpm: FA lenta, frecuente en la hipotermia moderada; suele ceder al recalentar.'),
          marks: [{ auto: 'rr', lead: 'II', beat: 5 }],
        },
      ],
      caption: l(
        '寒战会掩盖P波，被当成房颤或房扑：找干净的导联（o10）。重度低温时寒战停止。缓慢房颤要复温，不要用药。',
        'Shivering can hide the P waves and pass for AF or flutter: find the clean lead (o10). In severe hypothermia shivering stops. Slow AF needs rewarming, not drugs.',
        'Los escalofríos ocultan las P y pasan por FA o flúter: busca la derivación limpia (o10). En la hipotermia grave dejan de aparecer. La FA lenta necesita recalentamiento, no fármacos.',
      ),
    },
    { kind: 'check', item: { family: 'metabolic', seed: 2 } },
    { kind: 'check', item: { inline: coldActionCheck } },
    { kind: 'check', item: { family: 'brady', seed: 19 } },
    { kind: 'check', item: { family: 'metabolic', seed: 1 } },
    { kind: 'drill', families: ['metabolic', 'brady'], count: 8, passScore: 0.85 },
    {
      kind: 'pitfalls',
      items: [
        l('把 Osborn 波当作 STEMI 的 ST 抬高：驼峰之后的 ST 并不抬高，也没有冠脉分布和对应性压低。', 'Reading Osborn waves as the ST elevation of a STEMI: the ST after the hump is not elevated, and there is no coronary distribution and no reciprocal depression.', 'Interpretar las ondas de Osborn como la elevación del ST de un IAMCEST: el ST tras la joroba no está elevado y no hay distribución coronaria ni descenso recíproco.'),
        l('给低温引起的心动过缓用阿托品或起搏：先复温。', 'Treating the bradycardia of hypothermia with atropine or pacing: rewarm first.', 'Tratar la bradicardia de la hipotermia con atropina o marcapasos: primero recalienta.'),
        l('缓慢房颤被当作原发性心律失常处理，忽略了体温。', 'Slow AF treated as a primary arrhythmia while the temperature is ignored.', 'Tratar la FA lenta como una arritmia primaria ignorando la temperatura.'),
        l('粗暴搬动重度低温患者，诱发室颤。', 'Handling a severely hypothermic patient roughly and triggering VF.', 'Movilizar con brusquedad a un paciente con hipotermia grave y desencadenar una FV.'),
        l('用 J 波大小当温度计：用体温计量核心体温。', 'Using J-wave size as a thermometer: measure the core temperature with a thermometer.', 'Usar el tamaño de la onda J como termómetro: mide la temperatura central con un termómetro.'),
        l('寒战伪差读成房颤/房扑并给药：找干净导联，QRS 仍规则走过去。', 'Shivering artefact read as AF or flutter and treated: find the clean lead where the QRS still marches regularly.', 'Leer el artefacto por escalofríos como FA o flúter y tratarlo: busca la derivación limpia donde el QRS sigue desfilando regular.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('Osborn（J）波 = J 点上的正向驼峰（下壁+侧壁），低体温的标志，越冷越大，复温后消失。', 'Osborn (J) waves = a positive hump on the J point (inferior + lateral), the signature of hypothermia, larger when colder, gone after rewarming.', 'Ondas J de Osborn = joroba positiva en el punto J (inferior y lateral), firma de la hipotermia, mayor cuanto más frío, desaparece al recalentar.'),
        l('全套改变：窦缓、PR/QRS/QT 全部延长、缓慢房颤、寒战伪差——“一切都拉长了”。', 'The full ensemble: sinus bradycardia, PR, QRS and QT all prolonged, slow AF, shivering artefact — "everything gets longer".', 'El conjunto: bradicardia sinusal, PR, QRS y QT alargados, FA lenta y artefacto por escalofríos: "todo se alarga".'),
        l('J 波的鉴别：早期复极（年轻、QT 正常、凹面 ST）、高钙（QT 短）、STEMI（抬高的 ST 段 + 对应性压低）。', 'J-wave differential: early repolarisation (young, normal QT, concave ST), hypercalcaemia (short QT), STEMI (an elevated ST segment with reciprocal depression).', 'Diagnóstico diferencial de la onda J: repolarización precoz (joven, QT normal, ST cóncavo), hipercalcemia (QT corto), IAMCEST (ST elevado con descenso recíproco).'),
        l('28–30 °C 以下室颤风险陡增：轻柔搬动、复温、监护；心动过缓和房颤随复温纠正，不靠药物。', 'Below 28–30 °C the VF risk rises steeply: gentle handling, rewarming, monitoring; bradycardia and AF correct with rewarming, not drugs.', 'Por debajo de 28–30 °C el riesgo de FV se dispara: movilización suave, recalentamiento y monitorización; la bradicardia y la FA se corrigen al recalentar, no con fármacos.'),
      ],
    },
  ],
  sources: [
    'Antzelevitch C et al. J-wave syndromes expert consensus conference report. Heart Rhythm 2016;13:e295-e324',
    'Dow J et al. Wilderness Medical Society clinical practice guidelines for the out-of-hospital evaluation and treatment of accidental hypothermia: 2019 update. Wilderness Environ Med 2019;30:S47-S69',
    'Lott C et al. European Resuscitation Council Guidelines 2021: cardiac arrest in special circumstances. Resuscitation 2021;161:152-219',
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    'Castellano et al. 2004',
  ],
};

export default lesson;
