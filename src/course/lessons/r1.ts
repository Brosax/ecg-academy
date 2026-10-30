/**
 * r1 — Sinus bradycardia and tachycardia, sinus pause, SA exit block and sinus node dysfunction (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `sinus-pause-types`, `sinus-pr-rate-rr`, `intrinsic-rates` (current values; plus the
 * missing-book items: bradycardia <50, significant pause >3 s, chronotropic incompetence, reversible causes).
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const STRIP = { layout: 'strip', lead: 'II' } as const;

const lesson: Lesson = {
  id: 'r1',
  stage: 'R',
  order: 1,
  title: l(
    '窦性心动过缓与过速、窦性停搏、窦房传导阻滞与窦房结功能障碍',
    'Sinus bradycardia and tachycardia, pauses, SA block and sinus node dysfunction',
    'Bradicardia y taquicardia sinusal, pausas, bloqueo sinoauricular y disfunción sinusal',
  ),
  summary: l(
    '窦房结的节律问题：过缓与过速的判读界值、用分规把窦性停搏与窦房传导阻滞区分开、认识慢快综合征，并明确只有症状与心动过缓相关时才考虑起搏。',
    'Rhythms of the sinus node: the reading thresholds for bradycardia and tachycardia, telling sinus arrest from SA exit block with calipers, recognising tachy–brady syndrome, and pacing only when symptoms correlate.',
    'Ritmos del nodo sinusal: umbrales de lectura de bradicardia y taquicardia, distinguir el paro sinusal del bloqueo sinoauricular con el compás, reconocer el síndrome bradicardia-taquicardia y marcar el paso solo cuando los síntomas se correlacionan.',
  ),
  objectives: [
    l(
      '说出窦性心动过缓的指南界值（<50 次/分）与报告惯例（<60 次/分），并判断一个慢的心率是否生理性。',
      'State the guideline threshold for sinus bradycardia (<50/min) and the reporting convention (<60/min), and judge when a slow rate is physiologic.',
      'Citar el umbral de la guía para la bradicardia sinusal (<50 lpm) y la convención de los informes (<60 lpm), y valorar cuándo una frecuencia lenta es fisiológica.',
    ),
    l(
      '用分规测量 PP 间期，区分窦性停搏、二度Ⅱ型窦房传导阻滞与Ⅰ型（文氏型）窦房阻滞。',
      'March the PP with calipers to separate sinus arrest, second-degree type II SA exit block and type I (Wenckebach) SA block.',
      'Medir el PP con el compás para distinguir el paro sinusal, el bloqueo sinoauricular de segundo grado tipo II y el tipo I (Wenckebach).',
    ),
    l(
      '识别慢快综合征：房性心动过速终止后的转换后间歇，>3 秒为有临床意义的长间歇。',
      'Recognise tachy–brady syndrome: the post-conversion pause after an atrial tachycardia, with >3 s the significant-pause threshold.',
      'Reconocer el síndrome bradicardia-taquicardia: la pausa posconversión tras una taquicardia auricular, siendo >3 s el umbral de pausa significativa.',
    ),
    l(
      '列出窦房结功能障碍的起搏指征（症状相关）和必须先排除的可逆原因。',
      'List when sinus node dysfunction warrants pacing (symptom correlation) and the reversible causes to exclude first.',
      'Enumerar cuándo la disfunción sinusal requiere marcapasos (correlación con síntomas) y las causas reversibles que hay que excluir antes.',
    ),
  ],
  minutes: 16,
  competencies: ['C3', 'C9'],
  findings: ['sinus-bradycardia', 'sinus-tachycardia', 'sinus-pause', 'sa-exit-block', 'sinus-node-dysfunction'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('sinus-pause', 401),
      view: STRIP,
      question: l(
        '节律条中部有一段长间歇。这里发生了什么？间歇里为什么连一个 P 波都没有？先写下你的判断。',
        'There is a long pause in the middle of this strip. What happened — and why is there not even a P wave in the gap? Commit to an answer.',
        'Hay una pausa larga en medio de esta tira. ¿Qué ha pasado y por qué no hay ni una onda P en el hueco? Decide una respuesta antes de continuar.',
      ),
      reveal: l(
        '**窦性停搏（sinus arrest）**。基础 PP ≈ 860 ms（70 次/分），而这段间歇约 2.85 秒 ≈ **3.3 个 PP——不是 PP 的整数倍**。窦房结本身没有放电，所以间歇里没有 P。如果间歇恰好是 PP 的整数倍，那就是另一个诊断——窦房传出阻滞；本课后面用分规来区分它们。',
        '**Sinus arrest.** The basic PP is about 860 ms (70/min), but the pause is about 2.85 s = **3.3 PP — not a multiple of the PP**. The sinus node itself failed to discharge, so there is no P in the gap. If the pause were an exact multiple of the PP, that would be a different diagnosis — SA exit block; later in this lesson the calipers will tell them apart.',
        '**Paro sinusal.** El PP basal mide unos 860 ms (70 lpm), pero la pausa dura unos 2,85 s = **3,3 PP: no es múltiplo del PP**. El propio nodo sinusal dejó de disparar, por eso no hay P en el hueco. Si la pausa fuera múltiplo exacto del PP, el diagnóstico sería otro: bloqueo de salida sinoauricular; más adelante en esta lección el compás los distinguirá.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('normal', 402, { rate: 72 }),
      showConduction: true,
      emphasize: ['sa-node'],
      caption: l(
        '窦房结位于右心房上部，固有频率 60–100 次/分，是全心最快的心律起搏点（房室交界区约 35–60 次/分，心室约 20–40 次/分），所以正常时它主导节律。当它停止放电、或放出的冲动传不出窦房交界区时，纸面上就出现一段沉默——这正是本课所有图形的共同出处。',
        'The sinus node sits high in the right atrium. Its intrinsic rate of 60–100/min is the fastest in the heart (the AV junction runs at about 35–60/min, the ventricles at 20–40/min), so it normally commands the rhythm. When it stops firing, or its impulse fails to exit the sinoatrial junction, the paper goes silent for a stretch — that is where every tracing in this lesson comes from.',
        'El nodo sinusal está en la parte alta de la aurícula derecha. Su frecuencia intrínseca de 60–100 lpm es la más rápida del corazón (la unión AV va a unos 35–60 lpm y los ventrículos a 20–40 lpm), así que normalmente manda el ritmo. Cuando deja de disparar, o su impulso no logra salir de la unión sinoauricular, el papel enmudece un tramo: de ahí salen todas las gráficas de esta lección.',
      ),
    },
    {
      kind: 'text',
      title: l('多慢算慢，多快算快', 'How slow is slow, how fast is fast', 'Cuánta lentitud es bradicardia y cuánta rapidez taquicardia'),
      body: l(
        '数字本身只是描述，患者才是问题所在：\n- 2018 年指南把**有临床意义的窦性心动过缓定为 <50 次/分**；心电图报告惯例仍写 <60。\n- 静息或睡眠时 40–50 次/分常为**生理性**；训练有素的运动员窦性心率 **≥30 次/分**属正常训练适应。\n- 窦性心动过速 **>100 次/分**同样只是描述：你的报告写下它之后，必须接着问“为什么”——发热、疼痛、出血、缺氧、贫血、甲亢、肺栓塞、焦虑、药物。\n- 没有与心率相关的症状，也没有可逆原因可寻时，先别急着下“病”的结论。',
        'The number is a description; the patient is the question:\n- The 2018 guideline defines **clinically significant sinus bradycardia as <50/min**; ECG reports still conventionally flag <60.\n- Rates of 40–50/min at rest or during sleep are often **physiologic**; in trained athletes a sinus rate **>=30/min** is a normal training adaptation.\n- Sinus tachycardia **>100/min** is equally a description: once your report says it, the next word must be “why” — fever, pain, bleeding, hypoxia, anaemia, hyperthyroidism, pulmonary embolism, anxiety, drugs.\n- Without symptoms that correlate with the rate, and without a reversible cause to look for, do not rush to call it disease.',
        'El número es una descripción; el paciente es la pregunta:\n- La guía de 2018 define la **bradicardia sinusal clínicamente significativa como <50 lpm**; los informes de ECG siguen marcando por convención <60.\n- Frecuencias de 40–50 lpm en reposo o durante el sueño suelen ser **fisiológicas**; en deportistas entrenados, una frecuencia sinusal **>=30 lpm** es una adaptación normal al entrenamiento.\n- La taquicardia sinusal **>100 lpm** es igualmente una descripción: tras escribirla en el informe, la palabra siguiente debe ser “por qué”: fiebre, dolor, sangrado, hipoxia, anemia, hipertiroidismo, tromboembolia pulmonar, ansiedad, fármacos.\n- Sin síntomas que se correlacionen con la frecuencia y sin una causa reversible que buscar, no corras a llamarlo enfermedad.',
      ),
    },
    {
      kind: 'criteria',
      title: l('窦房结节律：判读与处理界值', 'Sinus node rhythms: reading and action thresholds', 'Ritmos sinusales: umbrales de lectura y de actuación'),
      items: [
        {
          label: l('窦性心动过缓', 'Sinus bradycardia', 'Bradicardia sinusal'),
          value: l('<50 次/分有临床意义（2018 指南）；<60 为报告惯例；40–50 常为生理性；运动员 ≥30 正常', '<50/min clinically significant (2018 guideline); <60 the reporting convention; 40–50 often physiologic; >=30 normal in athletes', '<50 lpm clínicamente significativa (guía 2018); <60 la convención del informe; 40–50 a menudo fisiológica; >=30 normal en deportistas'),
        },
        { label: l('窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal'), value: l('>100 次/分——是描述，要找原因', '>100/min — a description; find the cause', '>100 lpm: una descripción; busca la causa') },
        { label: l('有临床意义的长间歇', 'Significant pause', 'Pausa significativa'), value: l('>3 秒（指南定义）', '>3 s (guideline definition)', '>3 s (definición de la guía)') },
        {
          label: l('二度Ⅱ型窦房传导阻滞', 'SA exit block, type II', 'Bloqueo sinoauricular tipo II'),
          value: l('间歇 ≈ 基本 PP 的整数倍（窦性心律不齐的容差内）', 'The pause is about an exact multiple of the basic PP (within sinus-arrhythmia tolerance)', 'La pausa es aproximadamente múltiplo exacto del PP basal (dentro de la tolerancia de la arritmia sinusal)'),
        },
        {
          label: l('Ⅰ型窦房阻滞（文氏型）', 'SA block, type I (Wenckebach)', 'Bloqueo sinoauricular tipo I (Wenckebach)'),
          value: l('PP 逐搏缩短，然后一个 < 2 × PP 的间歇，成组搏动', 'PP intervals progressively shorten, then a pause < 2 x PP, giving group beating', 'El PP se acorta de forma progresiva y luego una pausa < 2 x PP, con latidos agrupados'),
        },
        {
          label: l('窦性停搏', 'Sinus arrest', 'Paro sinusal'),
          value: l('间歇与 PP 无倍数关系；一度窦房阻滞体表不可见，三度与停搏无法区分', 'The pause bears no relation to the PP; first-degree SA block is invisible on the surface ECG; third-degree looks identical to arrest', 'La pausa no guarda relación con el PP; el bloqueo sinoauricular de primer grado es invisible en el ECG de superficie; el de tercer grado es indistinguible del paro'),
        },
        {
          label: l('变时功能不全', 'Chronotropic incompetence', 'Incompetencia cronotropa'),
          value: l('运动试验未能达到预期心率储备的 80%（预测最大心率 = 220 − 年龄）', 'Failure to reach 80% of the expected heart-rate reserve on exercise testing (predicted max HR = 220 - age)', 'No alcanzar el 80% de la reserva de frecuencia cardíaca esperada en la prueba de esfuerzo (FC máx. prevista = 220 − edad)'),
        },
        {
          label: l('起搏指征（窦房结功能障碍）', 'Pacing in sinus node dysfunction', 'Estimulación en la disfunción sinusal'),
          value: l('I 类：症状与心动过缓相关、或有症状的慢快综合征；无症状者起搏为 III 类（有害）', 'Class I: symptoms correlate with bradycardia, or symptomatic tachy–brady syndrome; pacing in asymptomatic SND is Class III (harm)', 'Clase I: los síntomas se correlacionan con bradicardia o síndrome bradicardia-taquicardia sintomático; estimular una disfunción sinusal asintomática es clase III (daño)'),
        },
        {
          label: l('先排除可逆原因', 'Exclude reversible causes first', 'Excluir primero las causas reversibles'),
          value: l('药物（β 受体阻滞剂、维拉帕米/地尔硫䓬、地高辛、抗心律失常药）、甲状腺功能减退、高钾血症、颅内压增高、睡眠呼吸暂停', 'Drugs (beta-blockers, verapamil/diltiazem, digoxin, antiarrhythmics), hypothyroidism, hyperkalaemia, raised intracranial pressure, sleep apnoea', 'Fármacos (betabloqueantes, verapamilo/diltiazem, digoxina, antiarrítmicos), hipotiroidismo, hiperpotasemia, hipertensión intracraneal, apnea del sueño'),
        },
      ],
      source: 'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    },
    {
      kind: 'worked',
      title: l('用分规量出窦房传导阻滞', 'March out the SA exit block', 'Medir el bloqueo sinoauricular con el compás'),
      ecg: synth('sa-exit-block', 403),
      view: STRIP,
      steps: [
        {
          title: l('找出所有 P 波', 'Find every P wave', 'Busca todas las ondas P'),
          body: l('每个 P 后都跟着 QRS，PR 恒定。基础 PP ≈ 790 ms（76 次/分）。', 'Every P is followed by a QRS, with a constant PR. The basic PP is about 790 ms (76/min).', 'Cada P va seguida de QRS, con PR constante. El PP basal mide unos 790 ms (76 lpm).'),
          marks: [{ auto: 'p' }],
          highlightLeads: ['II'],
        },
        {
          title: l('把分规卡在一个 PP 上，向前跨', 'Set the calipers to one PP and walk forward', 'Ajusta el compás a un PP y avanza'),
          body: l('一分规一格：P、P、P——第 4 个位置上本该出现的 P 不见了，只剩一段空白。', 'Step the calipers along the paper: P, P, P — at the 4th position the expected P is missing, leaving a blank.', 'Avanza el compás por el papel: P, P, P… en la 4.ª posición falta la P esperada y queda un hueco.'),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('间歇恰好是 2 × PP', 'The pause is exactly 2 x PP', 'La pausa mide exactamente 2 x PP'),
          body: l(
            '间歇 ≈ 1580 ms，正好两个 PP：**二度Ⅱ型窦房传导阻滞，4:3**。窦房结照常放电，只是那一次冲动没能传出窦房交界区——所以纸上看不到 P。',
            'The pause is about 1580 ms — exactly two PP: **second-degree type II SA exit block, 4:3**. The sinus node discharged on time; that one impulse simply failed to exit the sinoatrial junction — which is why no P appears on the paper.',
            'La pausa dura unos 1580 ms, exactamente dos PP: **bloqueo sinoauricular de segundo grado tipo II, 4:3**. El nodo sinusal disparó a tiempo; ese impulso simplemente no logró salir de la unión sinoauricular, y por eso no se ve P en el papel.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('间歇后的 P 准时回归', 'The first P after the pause returns on time', 'La primera P tras la pausa vuelve a tiempo'),
          body: l(
            '它与前面的 P 形态相同、按时出现，PP 规律没有被“重置”——这正是传出阻滞与窦性停搏的区别：停搏时下一个 P 何时来毫无规律。',
            'It has the same shape as the earlier P waves and arrives on schedule; the PP sequence was not “reset”. That is the difference from sinus arrest: after an arrest, the timing of the next P is anybody’s guess.',
            'Tiene la misma morfología que las P previas y llega a tiempo; la secuencia de PP no se “reinició”. Esa es la diferencia con el paro sinusal: tras un paro, cuándo vendrá la siguiente P es impredecible.',
          ),
          marks: [{ auto: 'p' }],
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'sinus-bradycardia',
      seed: 404,
      dials: [{ id: 'rate' }],
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'pr' }],
      caption: l(
        '把心率从 58 一路拉到 38：P 波形态和 PR 间期都不变，变的只有数字。所以“窦性心动过缓”本身不是处置指征——先看患者（清醒吗？乏力？晕厥？），再决定下一步。',
        'Slide the rate from 58 down to 38: the P shape and the PR never change, only the number does. So “sinus bradycardia” is not itself an instruction to act — look at the patient first (alert? fatigued? syncope?), then decide.',
        'Baja la frecuencia de 58 a 38: la morfología de la P y el PR no cambian; solo cambia el número. Así que la “bradicardia sinusal” no es por sí sola una orden de actuar: mira primero al paciente (¿alerta? ¿astenia? ¿síncope?) y decide después.',
      ),
    },
    {
      kind: 'contrast',
      title: l('停搏还是传出阻滞？让分规说话', 'Arrest or exit block? Let the calipers speak', '¿Paro sinusal o bloqueo de salida? Que hable el compás'),
      view: STRIP,
      left: {
        ecg: synth('sinus-pause', 405),
        caption: l('A：窦性停搏', 'A: sinus arrest', 'A: paro sinusal'),
        marks: [{ auto: 'rr' }],
      },
      right: {
        ecg: synth('sa-exit-block', 406),
        caption: l('B：二度Ⅱ型窦房传导阻滞', 'B: second-degree type II SA exit block', 'B: bloqueo sinoauricular de segundo grado tipo II'),
        marks: [{ auto: 'rr' }],
      },
      point: l(
        'A 的间歇 ≈ 3.3 × PP，与 PP 没有整数倍关系——窦房结停止了放电（停搏）。B 的间歇恰好 = 2 × PP——窦房结放了电，冲动没能传出（传出阻滞）。只看间歇的长短分不出来：必须用分规去量 PP 的倍数关系。',
        'In A the pause is about 3.3 x PP, no whole-number relation to the PP — the sinus node stopped discharging (arrest). In B the pause is exactly 2 x PP — the node discharged, but the impulse could not get out (exit block). You cannot tell them apart by the length of the pause alone: you must march the PP with calipers.',
        'En A la pausa mide unos 3,3 x PP, sin relación de múltiplo entero con el PP: el nodo sinusal dejó de disparar (paro). En B la pausa es exactamente 2 x PP: el nodo disparó, pero el impulso no pudo salir (bloqueo de salida). Por la duración de la pausa sola no se distinguen: hay que medir la relación con el PP con el compás.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('sa-exit-block', 407, undefined, 'type-1'),
      view: STRIP,
      marks: [{ auto: 'rr' }],
      caption: l(
        'Ⅰ型（文氏型）窦房阻滞：PP 逐搏**缩短**，然后一个 **< 2 × PP** 的间歇，周而复始、成组搏动。逻辑与房室的文氏现象相同，只是发生在窦房交界区——冲动的传出一次比一次费力，最后彻底传不出去。',
        'Type I (Wenckebach) SA block: the PP **shortens** beat by beat, then a pause **shorter than 2 x PP**, repeating in groups. The logic is the same as AV Wenckebach, only at the sinoatrial junction — exit gets progressively harder until one impulse fails altogether.',
        'Bloqueo sinoauricular tipo I (Wenckebach): el PP **se acorta** latido a latido y luego una pausa **menor de 2 x PP**, repitiéndose en grupos. La lógica es la de un Wenckebach AV, solo que en la unión sinoauricular: la salida cuesta cada vez más hasta que un impulso falla del todo.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('sinus-tachycardia', 408, { rate: 130 }),
      view: STRIP,
      marks: [{ auto: 'p' }],
      caption: l(
        '130 次/分：每个 QRS 前仍有窦性 P，PR 固定。>100 只是**描述**——报告里写下“窦性心动过速”之后，你的任务才开始：去找原因。',
        '130/min: a sinus P still precedes every QRS, at a constant PR. >100 is only a **description** — once your report says “sinus tachycardia”, your work has just begun: find the cause.',
        '130 lpm: sigue habiendo una P sinusal antes de cada QRS, con PR constante. Que sea >100 es solo una **descripción**: cuando el informe dice “taquicardia sinusal”, tu trabajo empieza entonces: busca la causa.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('sinus-node-dysfunction', 409),
      view: STRIP,
      caption: l(
        '慢快综合征：一阵房性心动过速突发突止，被“超速抑制”的窦房结恢复延迟——转换后间歇约 2.9 秒，紧贴着 >3 秒这条“有临床意义的长间歇”界值。若患者恰在此时晕厥，症状便与心动过缓对上了号；有症状的慢快综合征是起搏的 I 类指征（起搏后才能安全使用控制心率或节律的药物）。',
        'Tachy–brady syndrome: an atrial tachycardia starts and stops abruptly, and the overdrive-suppressed sinus node recovers late — the post-conversion pause here is about 2.9 s, brushing the >3 s threshold of a significant pause. If the patient blacks out exactly then, the symptom and the bradycardia have been caught together; symptomatic tachy–brady syndrome is a Class I indication for pacing (which is what finally allows safe rate- or rhythm-control drugs).',
        'Síndrome bradicardia-taquicardia: una taquicardia auricular empieza y cesa de golpe, y el nodo sinusal, sobreestimulado y suprimido, tarda en recuperarse: la pausa posconversión aquí es de unos 2,9 s, rozando el umbral de >3 s de pausa significativa. Si el paciente sufre un síncope justo en ese momento, el síntoma y la bradicardia quedan relacionados; el síndrome bradicardia-taquicardia sintomático es indicación de clase I para marcapasos (que es lo que permite al fin usar fármacos de control de frecuencia o del ritmo con seguridad).',
      ),
    },
    { kind: 'check', item: { family: 'sinus', seed: 17 } },
    { kind: 'check', item: { family: 'brady', seed: 3 } },
    { kind: 'check', item: { family: 'brady', seed: 37 } },
    { kind: 'drill', families: ['brady', 'sinus'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [13591, 4408, 2594],
      caption: l(
        '三份真实心电图：两份窦性心动过缓、一份窦性心动过速。先写下你的完整判读（心率、P 波、有没有其他发现），然后再揭晓。',
        'Three real ECGs: two sinus bradycardias and one sinus tachycardia. Write down your full read (rate, P waves, anything else) before you reveal.',
        'Tres ECG reales: dos bradicardias sinusales y una taquicardia sinusal. Escribe tu lectura completa (frecuencia, ondas P, cualquier otro hallazgo) antes de mirar la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '治数字不治患者：没有与心率相关的症状，慢的数字本身不是起搏指征。',
          'Treating the number, not the patient: without symptoms that correlate with the rate, a slow number is not a pacing indication.',
          'Tratar el número y no al paciente: sin síntomas que se correlacionen con la frecuencia, una cifra baja no es indicación de marcapasos.',
        ),
        l(
          '看见长间歇就写“窦性停搏”，从不拿分规量 PP：恰为整数倍的是Ⅱ型窦房传导阻滞。',
          'Writing “sinus arrest” for every long pause without marching the PP: an exact multiple means type II SA exit block.',
          'Escribir “paro sinusal” ante cualquier pausa larga sin medir el PP con el compás: un múltiplo exacto indica bloqueo sinoauricular tipo II.',
        ),
        l(
          '漏掉未下传房早这个长间歇原因：藏在 T 波上的提前 P′（r5 专门讲）。',
          'Missing blocked PACs as a cause of a long pause: the early P′ hides on the T wave (r5 covers this).',
          'Pasar por alto las extrasístoles auriculares bloqueadas como causa de una pausa larga: la P′ precoz se esconde en la onda T (se ve en r5).',
        ),
        l(
          '把运动员的窦性心动过缓过度转诊：无症状、≥30 次/分属正常训练适应。',
          'Over-referring athlete bradycardia: without symptoms, a rate >=30/min is a normal training adaptation.',
          'Derivar en exceso la bradicardia del deportista: sin síntomas, una frecuencia >=30 lpm es una adaptación normal al entrenamiento.',
        ),
        l(
          '给睡眠呼吸暂停的夜间心动过缓装起搏器，而不是去筛查和治疗呼吸暂停本身。',
          'Pacing the nocturnal bradycardia of sleep apnoea instead of screening for and treating the apnoea itself.',
          'Implantar un marcapasos por la bradicardia nocturna de la apnea del sueño en lugar de cribar y tratar la propia apnea.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '有临床意义的窦性心动过缓是 <50 次/分（指南），报告惯例 <60；40–50 常为生理性，运动员 ≥30 正常。',
          'Clinically significant sinus bradycardia is <50/min (guideline); reports conventionally flag <60. Rates of 40–50 are often physiologic, and >=30 is normal in athletes.',
          'La bradicardia sinusal clínicamente significativa es <50 lpm (guía); los informes marcan por convención <60. Frecuencias de 40–50 suelen ser fisiológicas y >=30 es normal en deportistas.',
        ),
        l(
          '窦性心动过速 >100 次/分是描述，不是诊断：写完就去问“为什么”。',
          'Sinus tachycardia >100/min is a description, not a diagnosis: once written, go ask “why”.',
          'La taquicardia sinusal >100 lpm es una descripción, no un diagnóstico: en cuanto la escribas, pregunta “por qué”.',
        ),
        l(
          '每一段长间歇都拿分规量 PP：不是整数倍 = 窦性停搏；恰好整数倍 = Ⅱ型窦房传导阻滞；PP 逐搏缩短后 < 2 × PP 的间歇 = Ⅰ型（文氏型）。',
          'March the PP for every long pause: not a multiple = sinus arrest; an exact multiple = type II SA exit block; PP shortening beat by beat into a pause < 2 x PP = type I (Wenckebach).',
          'Mide el PP con el compás en cada pausa larga: si no es múltiplo, paro sinusal; múltiplo exacto, bloqueo sinoauricular tipo II; PP que se acorta latido a latido hasta una pausa < 2 x PP, tipo I (Wenckebach).',
        ),
        l(
          '>3 秒是指南定义的有临床意义的长间歇；房速终止后的转换后间歇伴症状 = 慢快综合征。',
          'A pause >3 s is the guideline’s significant pause; a symptomatic post-conversion pause after atrial tachycardia = tachy–brady syndrome.',
          'Una pausa >3 s es la pausa significativa de la guía; una pausa posconversión sintomática tras una taquicardia auricular = síndrome bradicardia-taquicardia.',
        ),
        l(
          '起搏只在与症状相关时进行；无症状窦房结功能障碍起搏属 III 类（有害）。先排除可逆原因：药物、甲减、高钾、颅内压增高、睡眠呼吸暂停。',
          'Pace only when symptoms correlate; pacing asymptomatic sinus node dysfunction is Class III (harm). Exclude reversible causes first: drugs, hypothyroidism, hyperkalaemia, raised ICP, sleep apnoea.',
          'Estimula solo cuando los síntomas se correlacionan; estimular una disfunción sinusal asintomática es clase III (daño). Excluye antes las causas reversibles: fármacos, hipotiroidismo, hiperpotasemia, hipertensión intracraneal, apnea del sueño.',
        ),
      ],
    },
  ],
  sources: [
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Sharma S, Drezner JA et al. International Recommendations for Electrocardiographic Interpretation in Athletes. JACC 2017;69:1057-1075',
    'Castellano et al. 2004',
  ],
};

export default lesson;
