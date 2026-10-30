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
      kind: 'text',
      title: l('寒冷对心电图做了什么', 'What cold does to the ECG', 'Qué le hace el frío al ECG'),
      body: l(
        '体温下降让所有离子通道都变慢，于是心电图上“每样东西都拉长”：\n- **窦房结变慢**：窦性心动过缓（中度低温常 <50 次/分）；\n- **传导变慢**：PR 延长，QRS 增宽；\n- **复极变慢**：QT 延长；\n- **心外膜与心内膜的差异被放大**：左室心外膜在动作电位早期出现明显的“切迹”（瞬时外向电流），而心内膜没有——这个跨壁电压差在体表心电图上就是 **J 点的驼峰**，即 Osborn 波。体温越低，驼峰越大；复温后消失。\n**分级（WMS 2019）**：轻度 32–35 °C、中度 28–32 °C、重度 <28 °C。Osborn 波多在 32 °C 以下出现；房颤常见于中度；28 °C 以下室颤和停搏的风险陡增，粗暴搬动、插管等刺激都可能诱发室颤。',
        'Falling temperature slows every ion channel, so on the ECG "everything gets longer":\n- **the sinus node slows**: sinus bradycardia (often <50/min in moderate hypothermia);\n- **conduction slows**: a longer PR and a wider QRS;\n- **repolarisation slows**: a longer QT;\n- **the epicardium–endocardium difference is exaggerated**: the LV epicardium develops a prominent early "notch" in its action potential (the transient outward current) and the endocardium does not — that transmural voltage gradient is the **hump at the J point** on the surface ECG, the Osborn wave. The colder the patient, the bigger the hump; it disappears on rewarming.\n**Staging (WMS 2019)**: mild 32–35 °C, moderate 28–32 °C, severe <28 °C. Osborn waves usually appear below about 32 °C; AF is common in moderate hypothermia; below 28 °C the risk of VF and asystole rises steeply, and rough handling or procedures such as intubation can trigger VF.',
        'Al bajar la temperatura se enlentecen todos los canales iónicos, así que en el ECG "todo se alarga":\n- **el nodo sinusal se frena**: bradicardia sinusal (a menudo <50 lpm en la hipotermia moderada);\n- **la conducción se enlentece**: PR más largo y QRS más ancho;\n- **la repolarización se enlentece**: QT más largo;\n- **se exagera la diferencia entre epicardio y endocardio**: el epicardio del VI desarrolla una "muesca" precoz marcada en su potencial de acción (la corriente transitoria de salida) y el endocardio no; ese gradiente transmural es la **joroba del punto J** en el ECG de superficie, la onda de Osborn. Cuanto más frío, mayor la joroba; desaparece al recalentar.\n**Estadios (WMS 2019)**: leve 32–35 °C, moderada 28–32 °C, grave <28 °C. Las ondas de Osborn suelen aparecer por debajo de unos 32 °C; la FA es frecuente en la hipotermia moderada; por debajo de 28 °C el riesgo de FV y asistolia se dispara, y una movilización brusca o maniobras como la intubación pueden desencadenar una FV.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('hypothermia', 1482, { rate: 46 }),
      view: { layout: '3x4+1', highlightLeads: ['II', 'aVF', 'V4', 'V5', 'V6'] },
      marks: [
        { auto: 'j', lead: 'II', label: l('Osborn 波', 'Osborn wave', 'onda de Osborn') },
        { auto: 'j', lead: 'V5' },
        { auto: 'pr', lead: 'II' },
      ],
      caption: l(
        '全 12 导联：驼峰贴在每个 QRS 的末尾，II、III、aVF 和 V4–V6 最明显，aVR 里是它的倒影（向下的切迹）——分布在下壁与侧壁。再测间期：心率约 46 次/分，PR 约 230 ms，QRS 约 140 ms（量到驼峰结束处——驼峰是 QRS 的终末部分，J 点在它的末端），QTc（Fridericia）约 490 ms。每一样都“拉长”了——这就是低温。',
        'All 12 leads: the hump sits on the end of every QRS, clearest in II, III, aVF and V4–V6, with its mirror image (a downward notch) in aVR — an inferior and lateral distribution. Now measure: rate about 46/min, PR about 230 ms, QRS about 140 ms (measured to the end of the hump — the hump is the terminal part of the QRS, and the J point is where it ends), QTc (Fridericia) about 490 ms. Everything is "longer" — that is the cold.',
        'Las 12 derivaciones: la joroba está al final de cada QRS, más clara en II, III, aVF y V4–V6, con su imagen especular (una muesca hacia abajo) en aVR: distribución inferior y lateral. Ahora mide: frecuencia de unos 46 lpm, PR de unos 230 ms, QRS de unos 140 ms (medido hasta el final de la joroba: la joroba es la parte terminal del QRS y el punto J está donde termina), QTc (Fridericia) de unos 490 ms. Todo está "alargado": es el frío.',
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
      kind: 'text',
      title: l('J 波的几个来源', 'Where a J wave can come from', 'De dónde puede venir una onda J'),
      body: l(
        '同一个“驼峰”有几位候选者：\n- **低体温**：J 波较大、分布广（下壁+侧壁），伴心动过缓、PR/QRS/QT 全部延长与寒战伪差；\n- **早期复极**（s7、h8）：年轻健康人，心率正常，下壁或侧壁导联的 J 点切迹/顿挫，常伴凹面向上的 ST 抬高，QT 正常；\n- **高钙血症**（o2）：QT **短**（ST 段几乎消失），重度时偶见 J 样波；\n- **STEMI**：J 点抬高之后是持续抬高的 ST 段，分布在一个冠状动脉区域，并有对应性压低——它是“抬高的 ST 段”，不是“J 点上的小驼峰”。\n**上下文决定诊断**：体温、年龄、症状、用药、血钙。',
        'Several candidates make the same hump:\n- **hypothermia**: larger, widespread (inferior + lateral) J waves with bradycardia, a long PR, QRS and QT and shivering artefact;\n- **early repolarisation** (s7, h8): young and healthy, normal rate, a J notch or slur in inferior or lateral leads, often with concave ST elevation and a normal QT;\n- **hypercalcaemia** (o2): a **short** QT (almost no ST segment), with J-like waves only occasionally in severe cases;\n- **STEMI**: the J point is followed by a persistently elevated ST segment in one coronary territory with reciprocal depression — it is "an elevated ST segment", not "a small hump on the J point".\n**Context decides**: temperature, age, symptoms, drugs, calcium.',
        'Varios candidatos dibujan la misma joroba:\n- **hipotermia**: ondas J mayores y difusas (inferior y lateral) con bradicardia, PR, QRS y QT largos y artefacto por escalofríos;\n- **repolarización precoz** (s7, h8): joven y sano, frecuencia normal, muesca o empastamiento J en derivaciones inferiores o laterales, a menudo con ST elevado cóncavo y QT normal;\n- **hipercalcemia** (o2): QT **corto** (casi sin segmento ST), con ondas tipo J solo ocasionalmente en los casos graves;\n- **IAMCEST**: tras el punto J viene un ST persistentemente elevado en un territorio coronario, con descenso recíproco; es "un ST elevado", no "una pequeña joroba en el punto J".\n**El contexto decide**: temperatura, edad, síntomas, fármacos y calcio.',
      ),
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
      kind: 'contrast',
      title: l('QT 往哪边走：低温还是高钙？', 'Which way does the QT go: cold or calcium?', '¿Hacia dónde va el QT: frío o calcio?'),
      view: STRIP,
      left: {
        ecg: synth('hypothermia', 1488, { rate: 48 }),
        caption: l('低体温：QT 长（QTc 约 490 ms）', 'Hypothermia: long QT (QTc about 490 ms)', 'Hipotermia: QT largo (QTc de unos 490 ms)'),
        marks: [{ auto: 'qt', lead: 'II' }],
      },
      right: {
        ecg: synth('hypercalcemia', 1485),
        caption: l('高钙血症：QT 短（QTc 约 335 ms），T 紧贴 QRS', 'Hypercalcaemia: short QT (QTc about 335 ms), the T hugging the QRS', 'Hipercalcemia: QT corto (QTc de unos 335 ms), la T pegada al QRS'),
        marks: [{ auto: 'qt', lead: 'II' }],
      },
      point: l(
        '高钙偶尔也会在 J 点留下小切迹，但它和低温走的是**相反的方向**：高钙把 ST 段“拿走”、QT 变短；低温把一切拉长、QT 变长。这份高钙图上没有 J 波——常见情况——可 QT 已经说明了一切。看到 J 点驼峰时，量 QT：长 → 想冷；短 → 想钙。',
        'Hypercalcaemia can occasionally leave a small notch at the J point too, but it goes the **opposite way** from the cold: calcium takes the ST segment away and shortens the QT; the cold stretches everything and lengthens it. This hypercalcaemia tracing has no J wave at all — the usual case — yet the QT already tells the story. When you meet a J-point hump, measure the QT: long → think cold; short → think calcium.',
        'La hipercalcemia también puede dejar alguna vez una pequeña muesca en el punto J, pero va en **sentido contrario** al frío: el calcio quita el segmento ST y acorta el QT; el frío lo alarga todo, también el QT. Este trazado de hipercalcemia no tiene ninguna onda J (lo habitual) y aun así el QT lo dice todo. Ante una joroba en el punto J, mide el QT: largo → piensa en frío; corto → piensa en calcio.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('muscle-tremor', 1486),
      view: { layout: '3x4+1', highlightLeads: ['I', 'III', 'aVL', 'II'] },
      caption: l(
        '寒战的样子：快速、不规则的细小肌电干扰叠加在基线上（这里来自左上肢电极：I、III、aVL 最乱，II 干净）。它会掩盖 P 波、让人以为是房颤或房扑。真正的 QRS 仍按原来的 RR 规则地走过去，找干净的导联读节律（o10）。轻中度低温的患者常在寒战；重度低温时寒战反而停止。',
        'What shivering looks like: fast, irregular, fine muscle noise riding on the baseline (here from the left-arm electrode: worst in I, III and aVL, lead II clean). It can hide the P waves and pass for AF or flutter. The real QRS complexes still march through at the same RR; read the rhythm in the clean lead (o10). Patients with mild or moderate hypothermia often shiver; in severe hypothermia shivering stops.',
        'Así se ven los escalofríos: un ruido muscular fino, rápido e irregular sobre la línea de base (aquí del electrodo del brazo izquierdo: peor en I, III y aVL, con II limpia). Puede ocultar las P y pasar por FA o flutter. Los QRS reales siguen desfilando con el mismo RR; lee el ritmo en la derivación limpia (o10). En la hipotermia leve o moderada el paciente suele tiritar; en la grave el escalofrío desaparece.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('atrial-fibrillation', 1489, { fCoarseness: 0.4 }, 'slow'),
      view: STRIP,
      marks: [{ auto: 'rr', lead: 'II' }],
      caption: l(
        '缓慢心室率的心房颤动：没有 P 波，RR 绝对不规则，约 50 次/分。中度低温时房颤很常见，通常随复温自行转复——不需要抗心律失常药或电复律，也别急着用房室结阻滞药控制一个本来就慢的心室率。',
        'Atrial fibrillation with a slow ventricular response: no P waves, an irregularly irregular RR at about 50/min. AF is common in moderate hypothermia and usually reverts on its own with rewarming — it needs no antiarrhythmic or cardioversion, and an already slow ventricular rate needs no AV-nodal blocker.',
        'Fibrilación auricular con respuesta ventricular lenta: sin ondas P, RR irregularmente irregular a unas 50 lpm. La FA es frecuente en la hipotermia moderada y suele revertir sola al recalentar: no necesita antiarrítmicos ni cardioversión, y una frecuencia ventricular ya lenta no necesita frenadores del nodo AV.',
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
        l('寒战伪差读成房颤/房扑并给药：找干净导联，QRS 仍规则走过去。', 'Shivering artefact read as AF or flutter and treated: find the clean lead where the QRS still marches regularly.', 'Leer el artefacto por escalofríos como FA o flutter y tratarlo: busca la derivación limpia donde el QRS sigue desfilando regular.'),
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
