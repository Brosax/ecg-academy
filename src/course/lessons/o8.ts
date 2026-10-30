/**
 * O8 — Deep T inversion that is not ischaemia: cerebral T, post-tachycardia T, cardiac memory, apical HCM
 * (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md T-wave rows, Shvilkin 2005 (cardiac memory vs LAD ischaemia), the Wellens
 * and HCM bullets (ESC 2023 ACS and cardiomyopathy guidelines).
 *
 * Tracings (checked against the model truth, tests/course/lessons-o.test.ts): `cerebral-t` = QTcF ≈ 560 ms with deep,
 * wide inversion deepest in V3–V5 (≈ 11–14 mm) and also in I, II, aVF; `cardiac-memory` = T inverted in III, aVF and
 * V1–V3 (deepest V1–V2 ≈ 7 mm) with upright T in I and aVL (all three Shvilkin signs); `wellens` type A = biphasic T
 * in V2–V3 with a normal QT; `apical-hcm` = giant T inversion in V4–V5 (≈ 10–13 mm) with deep S in V1–V3 and tall R
 * in V5–V6. The `takotsubo` late variant is not used (its T inversion is too shallow, reported).
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});

/** Cardiac memory vs its look-alikes, decided by the Shvilkin signs and the story. */
const memoryCheck: Item = {
  id: 'o8:cardiac-memory',
  family: 'systemic',
  competency: 'C8',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '74 岁女性，因窦房结功能障碍植入双腔起搏器；上周程控后起搏比例从约 90% 降到几乎为零。无胸痛、无气促，肌钙蛋白正常。今天的心电图如图（自身窦性心律）。最可能的解释是什么？',
    'A woman of 74 with a dual-chamber pacemaker for sinus-node disease; last week it was reprogrammed and ventricular pacing fell from about 90 % to almost none. No chest pain, no breathlessness, normal troponin. Today’s ECG (her own sinus rhythm) is shown. What is the most likely explanation?',
    'Mujer de 74 años con marcapasos bicameral por enfermedad del nodo sinusal; la semana pasada se reprogramó y la estimulación ventricular pasó de un 90 % a casi nada. Sin dolor torácico ni disnea, troponina normal. Este es su ECG de hoy (ritmo sinusal propio). ¿Cuál es la explicación más probable?',
  ),
  ecg: synth('cardiac-memory', 1549),
  view: { layout: '3x4+1', highlightLeads: ['I', 'aVL', 'III', 'V1', 'V2'] },
  explanation: l(
    '心脏记忆：数周的右室起搏后，自身搏动的 T 波仍“记着”起搏 QRS 的方向——III、aVF 和 V1–V3 倒置。Shvilkin 三条都满足：aVL 的 T 直立、I 的 T 直立、胸前最深的倒置（V1–V2 约 7 mm）比 III 更深——这一组合支持记忆而不是前降支缺血。肺栓塞也会让 V1–V3 和 III 倒置，但会有窦速、气促和右心负荷的临床；脑源性 T 波深、宽且 QT 显著延长。记忆性 T 会在数周到数月内自行恢复；肌钙蛋白正常、无症状时不需要导管检查，但要复查心电图确认它在恢复。',
    'Cardiac memory: after weeks of RV pacing, the T waves of intrinsic beats still "remember" the direction of the paced QRS — inverted in III, aVF and V1–V3. All three Shvilkin signs are met: upright T in aVL, upright T in I, and the deepest precordial inversion (about 7 mm in V1–V2) deeper than in III — a combination that favours memory over LAD ischaemia. PE can also invert V1–V3 and III, but comes with sinus tachycardia, breathlessness and an RV-strain story; cerebral T waves are deep, wide and come with a very long QT. Memory T waves resolve on their own over weeks to months; with a normal troponin and no symptoms no catheterisation is needed — but repeat the ECG to confirm the recovery.',
    'Memoria cardiaca: tras semanas de estimulación del VD, las T de los latidos propios siguen "recordando" la dirección del QRS estimulado: negativas en III, aVF y V1–V3. Se cumplen los tres signos de Shvilkin: T positiva en aVL, T positiva en I e inversión precordial máxima (unos 7 mm en V1–V2) más profunda que en III, una combinación que favorece la memoria frente a la isquemia de la DA. El TEP también invierte V1–V3 y III, pero con taquicardia sinusal, disnea y una historia de sobrecarga del VD; las T cerebrales son profundas, anchas y con un QT muy largo. Las T de memoria se resuelven solas en semanas o meses; con troponina normal y sin síntomas no hace falta un cateterismo, pero repite el ECG para confirmar la recuperación.',
  ),
  findings: ['nonspecific-st-t'],
  key: {
    options: [
      { id: 'memory', label: l('心脏记忆（起搏后 T 波倒置）', 'Cardiac memory (post-pacing T inversion)', 'Memoria cardiaca (inversión de la T tras la estimulación)') },
      { id: 'lad', label: l('前降支缺血，需紧急造影', 'LAD ischaemia needing urgent angiography', 'Isquemia de la DA que necesita coronariografía urgente') },
      { id: 'pe', label: l('急性肺栓塞', 'Acute pulmonary embolism', 'Tromboembolismo pulmonar agudo') },
      { id: 'cerebral', label: l('脑源性 T 波', 'Cerebral T waves', 'Ondas T cerebrales') },
    ],
    correct: 'memory',
  },
};

const lesson: Lesson = {
  id: 'o8',
  stage: 'O',
  order: 8,
  title: l(
    '非缺血性深倒T波（脑源性、心动过速后、心脏记忆）',
    'Deep T inversion that is not ischaemia (cerebral, post-tachycardia, cardiac memory)',
    'Inversión profunda de la onda T no isquémica (cerebrales, postaquicardia, memoria cardiaca)',
  ),
  summary: l(
    '深倒 T 波不全是缺血：脑源性 T 波（蛛网膜下腔出血、QT 显著延长）、心动过速后 T 波、心脏记忆（起搏或间歇性束支阻滞之后 T 波记住了异常 QRS 的方向）、心尖肥厚型心肌病都会深倒。唯一不能漏的深倒 T 是 Wellens——无痛期的临界前降支病变。',
    'Not every deep inverted T is ischaemia: cerebral T waves (subarachnoid haemorrhage, a very long QT), post-tachycardia T waves, cardiac memory (after pacing or intermittent bundle-branch block the T remembers the abnormal QRS direction) and apical HCM all invert deeply. The one deep T you must not miss is Wellens — a critical LAD lesion in the pain-free state.',
    'No toda T negativa profunda es isquemia: las ondas T cerebrales (hemorragia subaracnoidea, QT muy largo), las T postaquicardia, la memoria cardiaca (tras estimulación o bloqueo de rama intermitente la T recuerda la dirección del QRS anómalo) y la miocardiopatía hipertrófica apical también se invierten mucho. La única que no puedes perderte es el patrón de Wellens: lesión crítica de la DA en fase sin dolor.',
  ),
  objectives: [
    l('列出深倒 T 波的非缺血性家族，并知道先排除 Wellens。', 'List the non-ischaemic family of deep T inversion, and know to exclude Wellens first.', 'Enumerar la familia no isquémica de la inversión profunda de la T y saber que primero hay que descartar Wellens.'),
    l('认识脑源性 T 波（神经事件 + QT 显著延长 + 深、宽、跨区域的倒置）。', 'Recognise cerebral T waves (neurological event + very long QT + deep, wide inversion across territories).', 'Reconocer las ondas T cerebrales (evento neurológico + QT muy largo + inversión profunda y ancha que cruza territorios).'),
    l('用 Shvilkin 标准把心脏记忆与前降支缺血分开。', 'Use the Shvilkin criteria to separate cardiac memory from LAD ischaemia.', 'Aplicar los criterios de Shvilkin para separar la memoria cardiaca de la isquemia de la DA.'),
    l('认出心尖肥厚型心肌病的巨大倒置 T（高电压 + V4–V5 最深 + 无胸痛）。', 'Recognise the giant inverted T of apical HCM (high voltage + deepest in V4–V5 + no chest pain).', 'Reconocer la T negativa gigante de la miocardiopatía hipertrófica apical (alto voltaje + máxima en V4–V5 + sin dolor torácico).'),
  ],
  minutes: 17,
  competencies: ['C10', 'C8'],
  findings: ['cerebral-t', 'wellens', 'apical-hcm', 't-inversion-ischemic', 'nonspecific-st-t'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('cerebral-t', 1541),
      view: { layout: '3x4+1', highlightLeads: ['V3', 'V4'] },
      question: l(
        '一位蛛网膜下腔出血的患者：V3–V5 的 T 波深倒、QT 很长。这是心肌梗死吗？',
        'A patient with subarachnoid haemorrhage: deeply inverted T waves in V3–V5 and a very long QT. Is this a myocardial infarction?',
        'Un paciente con hemorragia subaracnoidea: T profundamente negativas en V3–V5 y un QT muy largo. ¿Es un infarto?',
      ),
      reveal: l(
        '不是冠状动脉闭塞。这是**脑源性 T 波**：急性脑损伤引起的交感风暴让心室复极广泛而不均匀地延长——T 波又深又宽（这里 V3–V5 约 11–14 mm），跨越冠状动脉分区（I、II、aVF 也倒置），QTc 约 560 ms。肌钙蛋白可以轻度升高，超声可见可逆的室壁运动异常；神经事件好转后 T 波逐渐恢复。',
        'This is not a coronary occlusion. These are **cerebral T waves**: the sympathetic storm of an acute brain injury lengthens ventricular repolarisation widely and unevenly — deep, wide T waves (about 11–14 mm in V3–V5 here) crossing coronary territories (I, II and aVF are inverted too), with a QTc of about 560 ms. Troponin may rise a little and echo may show reversible wall-motion abnormalities; the T waves recover as the neurological event settles.',
        'No es una oclusión coronaria. Son **ondas T cerebrales**: la tormenta simpática de una lesión cerebral aguda alarga la repolarización ventricular de forma amplia y desigual; T profundas y anchas (aquí unos 11–14 mm en V3–V5) que cruzan territorios coronarios (I, II y aVF también son negativas), con un QTc de unos 560 ms. La troponina puede subir algo y la ecocardiografía puede mostrar alteraciones de la contractilidad reversibles; las T se recuperan al ceder el evento neurológico.',
      ),
    },
    {
      kind: 'text',
      title: l('深倒 T 波的非缺血家族', 'The non-ischaemic deep-T family', 'La familia no isquémica de la T negativa profunda'),
      body: l(
        '看到深倒 T 波先过一遍名单：\n- **Wellens**（i8）：无痛期，V2–V3 双相（先正后负）或深而对称的倒置，R 波保留、无 Q 波、ST 几乎不抬高——**唯一必须立刻行动的深倒 T**（临界前降支近端狭窄）；\n- **脑源性 T**：神经事件 + QT 显著延长 + 深、宽、跨区域的倒置；\n- **心动过速后 T**：室上速或室速终止后一过性倒置，数小时到数天恢复；\n- **心脏记忆**：起搏、间歇性左束支阻滞或预激之后，正常 QRS 的 T 波“记住”异常 QRS 的方向；\n- **心尖肥厚型心肌病**：高电压 + V4–V5 巨大倒置 T，无胸痛；\n- **应激性心肌病（Takotsubo）晚期**、**肺栓塞**（V1–V4 + III）、**幼年型 / 运动员变异**（s7）；\n- **继发性 T**（束支阻滞、左室肥厚，r6、h2）——QRS 本身就异常，别单独报 T。\n再强调一次：T 波倒置本身不诊断缺血，**组合与上下文**才诊断。',
        'Run the list whenever you see deep T inversion:\n- **Wellens** (i8): pain-free, biphasic (up then down) or deep symmetric inversion in V2–V3, preserved R waves, no Q, barely any ST elevation — **the one deep T that demands immediate action** (a critical proximal LAD stenosis);\n- **cerebral T**: neurological event + very long QT + deep, wide inversion across territories;\n- **post-tachycardia T**: transient inversion after SVT or VT ends, recovering over hours to days;\n- **cardiac memory**: after pacing, intermittent LBBB or pre-excitation, the T of the normal QRS "remembers" the abnormal QRS direction;\n- **apical HCM**: high voltage + giant T inversion in V4–V5, no chest pain;\n- **late takotsubo**, **pulmonary embolism** (V1–V4 + III), **juvenile / athlete variants** (s7);\n- **secondary T** (bundle-branch block, LVH — r6, h2): the QRS itself is abnormal; never report the T alone.\nAnd once more: T inversion alone does not diagnose ischaemia — **the combination and the context** do.',
        'Recorre la lista siempre que veas una T negativa profunda:\n- **Wellens** (i8): sin dolor, T bifásica (positiva y luego negativa) o profunda y simétrica en V2–V3, R conservadas, sin Q y casi sin elevación del ST: **la única T negativa que exige actuar ya** (estenosis crítica proximal de la DA);\n- **T cerebrales**: evento neurológico + QT muy largo + inversión profunda y ancha que cruza territorios;\n- **T postaquicardia**: inversión transitoria al terminar una TSV o una TV, que se recupera en horas o días;\n- **memoria cardiaca**: tras estimulación, BRI intermitente o preexcitación, la T del QRS normal "recuerda" la dirección del QRS anómalo;\n- **miocardiopatía hipertrófica apical**: alto voltaje + T negativa gigante en V4–V5, sin dolor torácico;\n- **tako-tsubo tardío**, **tromboembolismo pulmonar** (V1–V4 + III), **variantes juvenil y del deportista** (s7);\n- **T secundaria** (bloqueo de rama, HVI: r6, h2): el QRS ya es anómalo; nunca informes la T sola.\nY otra vez: la inversión de la T por sí sola no diagnostica isquemia; lo hacen **la combinación y el contexto**.',
      ),
    },
    {
      kind: 'criteria',
      title: l('深倒 T 波的鉴别', 'The deep-T differential', 'El diagnóstico diferencial de la T negativa profunda'),
      items: [
        { label: l('Wellens（不能漏）', 'Wellens (do not miss)', 'Wellens (no perderlo)'), value: l('无痛期 V2–V3（± V1–V6）双相或深对称倒置；R 保留、无 Q、ST 几乎不抬高；避免负荷试验，早期造影', 'Pain-free biphasic or deep symmetric inversion in V2–V3 (± V1–V6); preserved R, no Q, minimal ST elevation; avoid stress testing, early angiography', 'Sin dolor, bifásica o profunda y simétrica en V2–V3 (± V1–V6); R conservadas, sin Q, ST apenas elevado; evitar prueba de esfuerzo, coronariografía precoz') },
        { label: l('脑源性 T', 'Cerebral T', 'T cerebrales'), value: l('深、宽，常 ≥10 mm；QT 显著延长；跨区域（胸前为主）；神经事件', 'Deep and wide, often ≥10 mm; markedly long QT; across territories (mostly precordial); neurological event', 'Profundas y anchas, a menudo ≥10 mm; QT muy largo; cruzan territorios (sobre todo precordiales); evento neurológico') },
        { label: l('心脏记忆（Shvilkin）', 'Cardiac memory (Shvilkin)', 'Memoria cardiaca (Shvilkin)'), value: l('三条同时满足支持记忆：aVL 的 T 直立；I 的 T 直立或等电位；胸前最深倒置 > III 的倒置', 'All three favour memory: upright T in aVL; upright or isoelectric T in I; deepest precordial inversion > inversion in III', 'Los tres a la vez favorecen la memoria: T positiva en aVL; T positiva o isoeléctrica en I; inversión precordial máxima > inversión en III') },
        { label: l('心尖肥厚型心肌病', 'Apical HCM', 'Miocardiopatía hipertrófica apical'), value: l('巨大倒置 T（≥10 mm），V4–V5 最深；高电压；无胸痛、长期稳定；超声/磁共振确诊', 'Giant inverted T (≥10 mm), deepest in V4–V5; high voltage; no chest pain, stable over years; confirmed by echo or MRI', 'T negativa gigante (≥10 mm), máxima en V4–V5; alto voltaje; sin dolor, estable durante años; se confirma con ecocardiografía o resonancia') },
        { label: l('心动过速后 T', 'Post-tachycardia T', 'T postaquicardia'), value: l('心动过速终止后一过性倒置，自行恢复（仍需结合临床排除缺血）', 'Transient inversion after a tachycardia ends; resolves on its own (still exclude ischaemia clinically)', 'Inversión transitoria tras terminar la taquicardia; se recupera sola (aun así, descarta la isquemia clínicamente)') },
      ],
      source: 'Shvilkin A et al. Heart Rhythm 2005;2:1072-1078; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826; Arbelo E et al. 2023 ESC Guidelines for the management of cardiomyopathies. Eur Heart J 2023;44:3503-3626',
    },
    {
      kind: 'worked',
      title: l('读一份脑源性 T 波', 'Reading a cerebral T-wave ECG', 'Leer un ECG con ondas T cerebrales'),
      ecg: synth('cerebral-t', 1543),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('心率与节律', 'Rate and rhythm', 'Frecuencia y ritmo'),
          body: l('窦性心律约 68 次/分，PR 和 QRS 正常。QRS 正常这一点很重要：倒置的 T 不是束支阻滞或肥厚的继发改变。', 'Sinus rhythm at about 68/min with a normal PR and QRS. The normal QRS matters: these inverted T waves are not secondary to a bundle-branch block or hypertrophy.', 'Ritmo sinusal a unos 68 lpm con PR y QRS normales. Que el QRS sea normal importa: estas T negativas no son secundarias a un bloqueo de rama ni a una hipertrofia.'),
          marks: [{ auto: 'rr', lead: 'II' }, { auto: 'qrs', lead: 'II' }],
        },
        {
          title: l('量 QT', 'Measure the QT', 'Mide el QT'),
          body: l('在 T 最深、终点最清楚的导联用切线法：QT 约 535 ms，Fridericia 校正约 560 ms——显著延长。缺血性 T 倒置很少把 QT 拉到这么长；这是脑源性 T 的标志之一。QTc >500 ms 也意味着尖端扭转型室速风险：查钾、镁，停用延长 QT 的药物。', 'Use the tangent method in a lead where the T is deep and its end clear: QT about 535 ms, about 560 ms after Fridericia correction — markedly prolonged. Ischaemic T inversion rarely stretches the QT this far; it is one of the hallmarks of cerebral T waves. A QTc >500 ms also means torsades risk: check potassium and magnesium, stop QT-prolonging drugs.', 'Usa el método de la tangente en una derivación con T profunda y final claro: QT de unos 535 ms, unos 560 ms con Fridericia, muy prolongado. La inversión isquémica de la T rara vez alarga tanto el QT; es una de las señas de las ondas T cerebrales. Un QTc >500 ms implica además riesgo de torsades: revisa potasio y magnesio y retira los fármacos que alargan el QT.'),
          marks: [{ auto: 'qt', lead: 'V4' }],
        },
        {
          title: l('量深度、看分布', 'Measure the depth, map the distribution', 'Mide la profundidad y mira la distribución'),
          body: l('V3–V5 倒置约 11–14 mm，宽而略不对称；V2、V6 较浅；I、II、aVF 也倒置，aVR 直立。前壁、侧壁和下壁同时受累——不像一支冠状动脉的地图。', 'The inversion is about 11–14 mm in V3–V5, wide and slightly asymmetric; shallower in V2 and V6; I, II and aVF are inverted as well, aVR upright. Anterior, lateral and inferior at once — not the map of one coronary artery.', 'La inversión es de unos 11–14 mm en V3–V5, ancha y algo asimétrica; menor en V2 y V6; I, II y aVF también son negativas y aVR positiva. Anterior, lateral e inferior a la vez: no es el mapa de una arteria coronaria.'),
          marks: [{ auto: 't', lead: 'V4' }],
          highlightLeads: ['V3', 'V4', 'V5', 'I', 'II', 'aVF'],
        },
        {
          title: l('结合临床', 'Bring in the patient', 'Integra al paciente'),
          body: l('报告：窦性心律，广泛深倒 T 波，QTc 约 560 ms——在急性脑损伤的背景下符合脑源性 T 波。下一步：神经科处理优先；监护心律、纠正电解质；肌钙蛋白与超声评估心肌受累。不要因为“深倒 T”就给抗凝或把出血患者送去导管室——但如果没有神经事件，这份图就必须按缺血评估。', 'Report: sinus rhythm, widespread deep T inversion, QTc about 560 ms — in the setting of an acute brain injury, consistent with cerebral T waves. Next: the neurological problem comes first; monitor the rhythm and correct electrolytes; troponin and echo assess myocardial involvement. Do not anticoagulate a bleeding brain or send it to the cath lab just for "deep T waves" — but without a neurological event, this tracing must be worked up as ischaemia.', 'Informe: ritmo sinusal, inversión profunda y difusa de la T, QTc de unos 560 ms; en el contexto de una lesión cerebral aguda, compatible con ondas T cerebrales. Después: lo neurológico va primero; monitoriza el ritmo y corrige los electrolitos; la troponina y la ecocardiografía valoran la afectación miocárdica. No anticoagules un cerebro que sangra ni lo mandes a hemodinámica solo por unas "T profundas"; pero sin evento neurológico, este trazado debe estudiarse como isquemia.'),
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('cardiac-memory', 1542),
      view: { layout: '3x4+1', highlightLeads: ['I', 'aVL', 'III', 'V1', 'V2'] },
      marks: [{ auto: 't', lead: 'aVL' }, { auto: 't', lead: 'III' }, { auto: 't', lead: 'V1' }],
      caption: l(
        '起搏器患者恢复自身心律后：T 波在 III、aVF 和 V1–V3 倒置（V1–V2 最深，约 7 mm），QRS 正常——T 波“记住”了右室心尖起搏时 QRS 的方向。逐条核对 Shvilkin：aVL 的 T **直立** ✓，I 的 T **直立** ✓，胸前最深倒置（约 7 mm）**深于** III（约 4 mm）✓——三条都满足，支持心脏记忆而不是前降支缺血。',
        'A pacemaker patient back in her own rhythm: the T is inverted in III, aVF and V1–V3 (deepest in V1–V2, about 7 mm) with a normal QRS — the T "remembers" the QRS direction of RV apical pacing. Tick the Shvilkin signs one by one: T in aVL **upright** ✓, T in I **upright** ✓, the deepest precordial inversion (about 7 mm) **deeper** than in III (about 4 mm) ✓ — all three met, favouring cardiac memory over LAD ischaemia.',
        'Una paciente con marcapasos de vuelta a su ritmo propio: T negativa en III, aVF y V1–V3 (máxima en V1–V2, unos 7 mm) con QRS normal; la T "recuerda" la dirección del QRS de la estimulación apical del VD. Comprueba los signos de Shvilkin uno a uno: T en aVL **positiva** ✓, T en I **positiva** ✓, inversión precordial máxima (unos 7 mm) **mayor** que en III (unos 4 mm) ✓: se cumplen los tres, a favor de la memoria cardiaca frente a la isquemia de la DA.',
      ),
    },
    {
      kind: 'contrast',
      title: l('脑源性 T 还是 Wellens？', 'Cerebral T or Wellens?', '¿T cerebrales o Wellens?'),
      view: { layout: 'strip', lead: 'V3' },
      left: {
        ecg: synth('cerebral-t', 1543),
        caption: l('脑源性 T（V3）：深约 12 mm、宽，QTc 约 560 ms', 'Cerebral T (V3): about 12 mm deep and wide, QTc about 560 ms', 'T cerebrales (V3): unos 12 mm de profundidad y anchas, QTc de unos 560 ms'),
        marks: [{ auto: 't', lead: 'V3' }, { auto: 'qt', lead: 'V3' }],
      },
      right: {
        ecg: synth('wellens', 1544),
        caption: l('Wellens A 型（V3）：先正后负的双相 T，QT 正常', 'Wellens type A (V3): a biphasic T, up then down, normal QT', 'Wellens tipo A (V3): T bifásica, positiva y luego negativa, QT normal'),
        marks: [{ auto: 't', lead: 'V3' }, { auto: 'qt', lead: 'V3' }],
      },
      point: l(
        '两侧 V3 的 T 波都“异常”，但危险程度完全相反。左：深、宽、QT 显著延长，倒置跨越多个区域，神经事件当先——治脑。右：T 波只是先正后负的双相，QT 正常，R 波保留，**胸痛已经缓解**——这正是 Wellens 的陷阱：看起来不吓人，却是前降支临界狭窄，几天内可能闭塞。别做负荷试验，安排早期造影（i8）。',
        'Both V3 T waves are "abnormal", but the danger runs the opposite way. Left: deep, wide, a markedly long QT, inversion across several territories, a neurological event in front — treat the brain. Right: the T is only biphasic, up then down, the QT is normal, the R preserved and **the pain has already gone** — exactly the Wellens trap: it does not look frightening, yet it is a critical LAD stenosis that may occlude within days. No stress test; early angiography (i8).',
        'Las T de V3 son "anormales" en ambos lados, pero el peligro va en sentido contrario. Izquierda: profunda, ancha, QT muy largo, inversión en varios territorios y un evento neurológico por delante: trata el cerebro. Derecha: la T solo es bifásica, positiva y luego negativa, el QT es normal, la R se conserva y **el dolor ya ha cedido**: justo la trampa de Wellens; no asusta, pero es una estenosis crítica de la DA que puede ocluirse en días. Sin prueba de esfuerzo; coronariografía precoz (i8).',
      ),
    },
    {
      kind: 'contrast',
      title: l('巨大倒置 T：心尖肥厚还是 Wellens B 型？', 'Giant inverted T: apical HCM or Wellens type B?', 'T negativa gigante: ¿MCH apical o Wellens tipo B?'),
      view: { layout: '3x4+1', highlightLeads: ['V2', 'V3', 'V4', 'V5'] },
      left: {
        ecg: synth('apical-hcm', 1546),
        caption: l('心尖肥厚型心肌病：V4–V5 倒置约 10–13 mm，V1–V3 深 S、V5–V6 高 R，无胸痛', 'Apical HCM: inversion about 10–13 mm in V4–V5, deep S in V1–V3 and tall R in V5–V6, no chest pain', 'MCH apical: inversión de unos 10–13 mm en V4–V5, S profundas en V1–V3 y R altas en V5–V6, sin dolor torácico'),
        marks: [{ auto: 't', lead: 'V4' }],
      },
      right: {
        ecg: synth('wellens', 1545, undefined, 'b'),
        caption: l('Wellens B 型：V2–V3 深而对称的倒置约 7–8 mm（V1、V4 较浅），电压正常，胸痛刚缓解', 'Wellens type B: deep symmetric inversion of about 7–8 mm in V2–V3 (shallower in V1 and V4), normal voltage, chest pain just settled', 'Wellens tipo B: inversión profunda y simétrica de unos 7–8 mm en V2–V3 (menor en V1 y V4), voltaje normal, dolor torácico recién cedido'),
        marks: [{ auto: 't', lead: 'V3' }],
      },
      point: l(
        '左：倒置最深在 **V4–V5**，是“巨大”的（≥10 mm），同时 QRS 电压很高——心尖部心肌肥厚（Yamaguchi 型）。患者没有胸痛，旧图多年一样；超声或磁共振确诊。右：倒置在 **V2–V3**，深（约 7–8 mm）但不“巨大”，电压正常，背景是刚刚缓解的胸痛——前降支临界狭窄。分开它们的是三件事：最深的导联在哪里、QRS 电压、症状与旧图。',
        'Left: the deepest inversion is in **V4–V5** and it is "giant" (≥10 mm), together with very high QRS voltage — hypertrophy confined to the apex (Yamaguchi type). The patient has no chest pain and old ECGs look the same for years; echo or MRI confirms it. Right: the inversion sits in **V2–V3**, deep (about 7–8 mm) but not giant, with normal voltage, after chest pain that has just settled — a critical LAD stenosis. Three things split them: where the deepest lead is, the QRS voltage, and the symptoms with the old ECG.',
        'Izquierda: la inversión máxima está en **V4–V5** y es "gigante" (≥10 mm), junto a un voltaje del QRS muy alto: hipertrofia limitada a la punta (tipo Yamaguchi). El paciente no tiene dolor y los ECG previos son iguales desde hace años; la ecocardiografía o la resonancia lo confirman. Derecha: la inversión está en **V2–V3**, profunda (unos 7–8 mm) pero no gigante, con voltaje normal, tras un dolor torácico que acaba de ceder: estenosis crítica de la DA. Tres cosas los separan: dónde está la derivación más profunda, el voltaje del QRS y los síntomas con el ECG previo.',
      ),
    },
    { kind: 'check', item: { family: 'systemic', seed: 8 } },
    { kind: 'check', item: { inline: memoryCheck } },
    { kind: 'check', item: { family: 'ischemia-patterns', seed: 5 } },
    { kind: 'drill', families: ['systemic', 'ischemia-patterns'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [16899, 674, 4318],
      caption: l(
        '三份真实的 T 波倒置或低平心电图。逐份走名单：QRS 正常吗（继发性 T）？QT 多长？倒置在哪些导联、多深、对称吗？像一支冠状动脉的地图吗？先写下“缺血可能 / 非缺血可能 / 需要更多信息”和理由，再对照标注。',
        'Three real tracings with inverted or flattened T waves. Run the list on each: is the QRS normal (secondary T)? How long is the QT? Which leads are inverted, how deep, how symmetric? Does it look like the map of one coronary artery? Write "probably ischaemic / probably not / need more information" with your reason first, then compare with the labels.',
        'Tres ECG reales con T negativas o planas. Recorre la lista en cada uno: ¿es normal el QRS (T secundaria)? ¿Cuánto mide el QT? ¿Qué derivaciones están invertidas, cuánto y con qué simetría? ¿Parece el mapa de una arteria coronaria? Escribe primero "probablemente isquémica / probablemente no / necesito más datos" con tu razón y después compara con las etiquetas.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('把所有深倒 T 都收进“NSTEMI”。', 'Filing every deep inverted T under "NSTEMI".', 'Archivar toda T negativa profunda como "IAMSEST".'),
        l('起搏或 CRT 程控后的记忆性 T 倒置被当成新发缺血——先用 Shvilkin 三条，再结合肌钙蛋白与症状。', 'Post-pacing or post-CRT memory inversion read as new ischaemia — apply the three Shvilkin signs, then the troponin and the symptoms.', 'Leer la inversión de memoria tras programar un marcapasos o una TRC como isquemia nueva: aplica los tres signos de Shvilkin y después la troponina y los síntomas.'),
        l('无痛患者忘掉 Wellens（那是真正的前降支危机），还给他安排了负荷试验。', 'Forgetting Wellens in the pain-free patient (the real LAD emergency) and booking a stress test.', 'Olvidar Wellens en el paciente sin dolor (la verdadera urgencia de la DA) y pedirle una prueba de esfuerzo.'),
        l('把心尖肥厚型心肌病的巨大 T 当作急性冠脉综合征反复送导管室——看电压，找旧图。', 'Sending apical HCM’s giant T waves to the cath lab again and again as an acute coronary syndrome — look at the voltage, find the old ECG.', 'Enviar una y otra vez a hemodinámica las T gigantes de la MCH apical como síndrome coronario agudo: mira el voltaje y busca el ECG previo.'),
        l('神经科患者不做心电图，或看到脑源性 T 时漏量 QT（尖端扭转风险）。', 'No ECG on the neurology patient — or, on cerebral T waves, forgetting to measure the QT (torsades risk).', 'No hacer ECG al paciente neurológico, u olvidar medir el QT ante unas T cerebrales (riesgo de torsades).'),
        l('束支阻滞或肥厚患者的继发性 T 被单独报告为缺血。', 'Reporting the secondary T of bundle-branch block or hypertrophy alone as ischaemia.', 'Informar como isquemia la T secundaria de un bloqueo de rama o de una hipertrofia.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('深倒 T 有一个非缺血家族：脑源性、心动过速后、心脏记忆、心尖肥厚、变异、继发性——但先排除 Wellens。', 'Deep T inversion has a non-ischaemic family: cerebral, post-tachycardia, cardiac memory, apical HCM, variants, secondary — but exclude Wellens first.', 'La T negativa profunda tiene una familia no isquémica: cerebral, postaquicardia, memoria cardiaca, MCH apical, variantes y secundaria; pero descarta antes Wellens.'),
        l('脑源性 T = 神经事件 + QT 显著延长 + 深、宽、跨区域的倒置。', 'Cerebral T = neurological event + markedly long QT + deep, wide inversion across territories.', 'T cerebrales = evento neurológico + QT muy largo + inversión profunda y ancha que cruza territorios.'),
        l('心脏记忆：aVL 的 T 直立 + I 的 T 直立或等电位 + 胸前倒置深于 III → 支持记忆而非前降支缺血。', 'Cardiac memory: upright T in aVL + upright or flat T in I + precordial inversion deeper than in III → memory rather than LAD ischaemia.', 'Memoria cardiaca: T positiva en aVL + T positiva o plana en I + inversión precordial mayor que en III → memoria y no isquemia de la DA.'),
        l('心尖肥厚：V4–V5 巨大倒置 T + 高电压 + 无胸痛；Wellens：V2–V3、电压正常、胸痛刚缓解。', 'Apical HCM: giant inverted T in V4–V5 + high voltage + no chest pain; Wellens: V2–V3, normal voltage, chest pain just settled.', 'MCH apical: T negativa gigante en V4–V5 + alto voltaje + sin dolor; Wellens: V2–V3, voltaje normal y dolor recién cedido.'),
      ],
    },
  ],
  sources: [
    'Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    'Shvilkin A et al. Electrocardiographic differentiation of cardiac memory from ischemia. Heart Rhythm 2005;2:1072-1078',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Arbelo E et al. 2023 ESC Guidelines for the management of cardiomyopathies. Eur Heart J 2023;44:3503-3626',
    'Castellano et al. 2004',
  ],
};

export default lesson;
