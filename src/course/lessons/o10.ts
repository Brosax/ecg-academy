/**
 * O10 — Artefacts and filters (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md "Technical artefacts" (arrhythmia mimics, finding the faulty electrode),
 * "Baseline wander", "Mains (AC) interference", "Recording chain — Filter bandwidth" (Kligfield 2007, Knight 1999).
 *
 * Tracings (checked against the model truth, tests/course/lessons-o.test.ts): one normal heart (the technical base)
 * recorded with one recording fault each — EMG on the LA electrode (`muscle-tremor`: I, III, aVL; II clean), a 5-Hz
 * tremor on LL (`muscle-tremor-parkinsonian`: II, III, aVF; I clean), motion on RA (`motion-artefact`: I, II, aVR,
 * pseudo-VT; III clean), respiratory wander and 50-Hz mains; the monitor filter is applied through the request
 * (`recording.filter`, technical.ts header) to a normal heart: J ≈ 1 mm low in V4–V6. PTB-XL's curated subset has no
 * record flagged for noise or electrode problems: no real block.
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import { FILTER_PRESETS, type DialId, type FilterSpec, type NoiseSpec } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
/** The bedside-monitor bandwidth (= FILTER_PRESETS.monitor: 0.5–40 Hz, causal, 50-Hz notch). */
const MONITOR: FilterSpec = { highpassHz: 0.5, lowpassHz: 40, notchHz: 50, phase: 'causal' };
const STRIP = { layout: 'strip', lead: 'II' } as const;
/** One normal heart (72/min) recorded with one fault: only the recording changes. */
const recorded = (seed: number, noise?: NoiseSpec): EcgSource => ({
  kind: 'synth',
  req: { scenario: 'normal', seed, dials: { rate: 72 }, ...(noise ? { recording: { noise } } : {}) },
});

/** Which electrode is moving? The two-noisy-leads rule on a pseudo-VT. */
const electrodeCheck: Item = {
  id: 'o10:which-electrode',
  family: 'artefacts',
  competency: 'C12',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '监护仪报警“室速”，患者却在床上和你说话，正在用右手挠背。看 12 导联：伪差来自哪个电极？',
    'The monitor alarms "VT" while the patient chats with you, scratching his back with his right hand. Look at the 12 leads: which electrode is the artefact coming from?',
    'El monitor salta con "TV" mientras el paciente charla contigo rascándose la espalda con la mano derecha. Mira las 12 derivaciones: ¿de qué electrodo viene el artefacto?',
  ),
  ecg: synth('motion-artefact', 1592),
  view: { layout: '3x4+1' },
  explanation: l(
    '右上肢（RA）电极。I（= LA − RA）和 II（= LL − RA）都乱，III（= LL − LA）没有用到 RA，所以干净；以该电极命名的 aVR 和 I、II 一样乱。胸前导联也有一点（Wilson 中心电端里有 RA 的三分之一）。在 III 里，真正的窄 QRS 按原来的 RR 规律地走过去——这是伪差，不是室速。别电击一个在说话的人。',
    'The right-arm (RA) electrode. Lead I (= LA − RA) and lead II (= LL − RA) are both disturbed, lead III (= LL − LA) does not use RA and stays clean, and aVR, named after that electrode, swings as widely as I and II. The chest leads carry a little of it too (Wilson’s central terminal contains a third of RA). In lead III the real narrow QRS complexes march through at the same RR — this is artefact, not VT. Do not shock someone who is talking to you.',
    'El electrodo del brazo derecho (RA). I (= LA − RA) y II (= LL − RA) están alteradas, III (= LL − LA) no usa RA y queda limpia, y aVR, que lleva el nombre de ese electrodo, oscila tanto como I y II. Las precordiales también llevan algo (el terminal central de Wilson contiene un tercio de RA). En III los QRS estrechos reales desfilan con el mismo RR: es artefacto, no TV. No descargues a alguien que está hablando contigo.',
  ),
  findings: [],
  key: {
    options: [
      { id: 'ra', label: l('右上肢（RA）电极', 'Right-arm (RA) electrode', 'Electrodo del brazo derecho (RA)') },
      { id: 'la', label: l('左上肢（LA）电极', 'Left-arm (LA) electrode', 'Electrodo del brazo izquierdo (LA)') },
      { id: 'll', label: l('左下肢（LL）电极', 'Left-leg (LL) electrode', 'Electrodo de la pierna izquierda (LL)') },
      { id: 'vt', label: l('不是伪差：这是室速', 'Not artefact: this is VT', 'No es artefacto: es una TV') },
    ],
    correct: 'ra',
  },
};

const lesson: Lesson = {
  id: 'o10',
  stage: 'O',
  order: 10,
  title: l('伪差与滤波', 'Artefacts and filters', 'Artefactos y filtros'),
  summary: l(
    '先排除记录问题再归咎于心脏：震颤、寒战和运动伪差会伪装成房颤、房扑甚至室速，但真实的 QRS 会按原来的 RR“走”过去，总有某个导联干净，患者的状态也对不上。两个乱、一个干净的肢体导联指出坏电极。监护档滤波（0.5–40 Hz）会伪造或掩盖 ST 改变——读 ST 用诊断档。',
    'Rule out the recording before blaming the heart: tremor, shivering and motion artefact pass for AF, flutter or even VT, but the real QRS complexes "march through" at the underlying RR, at least one lead stays clean, and the patient does not fit. Two noisy limb leads and one clean one point to the faulty electrode. The monitor filter (0.5–40 Hz) can fake or hide ST changes — read the ST on the diagnostic bandwidth.',
    'Descarta el registro antes de culpar al corazón: el temblor, los escalofríos y el movimiento se hacen pasar por FA, flúter o incluso TV, pero los QRS reales "desfilan" con el RR subyacente, al menos una derivación queda limpia y el paciente no encaja. Dos derivaciones de los miembros con ruido y una limpia señalan el electrodo defectuoso. El filtro de monitor (0,5–40 Hz) puede fingir u ocultar cambios del ST: lee el ST con el ancho de banda diagnóstico.',
  ),
  objectives: [
    l('用“QRS 走过去 + 有干净导联 + 患者状态不符”识别伪装成心律失常的伪差。', 'Recognise arrhythmia-mimicking artefact by "QRS marching through + a clean lead + the patient does not fit".', 'Reconocer el artefacto que simula arritmias con "QRS desfilando + una derivación limpia + clínica discordante".'),
    l('用“两个乱、一个干净”的三角法则定位坏电极。', 'Locate the faulty electrode with the two-noisy, one-clean triangle rule.', 'Localizar el electrodo defectuoso con la regla del triángulo: dos con ruido y una limpia.'),
    l('认出基线漂移、交流干扰与肌电干扰，并说出修正方法。', 'Recognise baseline wander, mains interference and muscle artefact, and state the fixes.', 'Reconocer la oscilación de la línea de base, la interferencia de red y el artefacto muscular, y citar sus soluciones.'),
    l('知道监护档滤波会扭曲 ST 段、缩小 QRS、藏起起搏钉，读 ST 必须用诊断档。', 'Know that the monitor filter distorts the ST segment, shrinks the QRS and hides pacing spikes; reading the ST needs the diagnostic bandwidth.', 'Saber que el filtro de monitor distorsiona el ST, reduce el QRS y oculta las espículas; para leer el ST se necesita el ancho de banda diagnóstico.'),
  ],
  minutes: 17,
  competencies: ['C12'],
  findings: ['baseline-wander', 'muscle-tremor', 'ac-interference'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('muscle-tremor-parkinsonian', 1581),
      view: STRIP,
      question: l(
        '一位 74 岁帕金森病患者，监护仪提示“房扑？”——II 导联看起来全是规则的小波动。患者神志清楚、血压正常。这是心律失常吗？你如何证明？',
        'A 74-year-old with Parkinson’s disease; the monitor flags "flutter?" — lead II looks like regular small ripples. The patient is alert with a normal blood pressure. Is this an arrhythmia, and how would you prove it?',
        'Un paciente de 74 años con enfermedad de Parkinson; el monitor marca "¿flúter?": la derivación II parece un rizado pequeño y regular. Está consciente y con tensión normal. ¿Es una arritmia? ¿Cómo lo demuestras?',
      ),
      reveal: l(
        '不是。这是帕金森静止性震颤（约 5 Hz）产生的伪差。两条证据：**真实的 QRS 按固有的 RR 间期“走”过去**（用分规量），以及**总有至少一个导联干净**（伪差来自某个电极附近；这里 I 导联干净，因为震颤在左腿电极上）。把“貌似恶性的节律 + 患者安然无恙”当作伪差警号——误读曾导致不必要的抗凝、电复律甚至有创操作。',
        'No. This is artefact from a Parkinsonian rest tremor (about 5 Hz). Two proofs: **the real QRS complexes "march through" at the underlying RR** (measure with calipers), and **at least one lead stays clean** (the artefact lives near one electrode; here lead I is clean because the tremor is on the left-leg electrode). Treat "a malignant-looking rhythm + a perfectly well patient" as an artefact alarm — misreadings have led to needless anticoagulation, cardioversion and even invasive procedures.',
        'No. Es artefacto por temblor de reposo parkinsoniano (unos 5 Hz). Dos pruebas: **los QRS reales "desfilan" con el RR subyacente** (mídelo con el compás) y **al menos una derivación queda limpia** (el artefacto vive junto a un electrodo; aquí I está limpia porque el temblor está en el electrodo de la pierna izquierda). Considera "ritmo de aspecto maligno + paciente perfectamente bien" una alarma de artefacto: estas lecturas erróneas han llevado a anticoagulaciones, cardioversiones e incluso procedimientos invasivos innecesarios.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'noisy-electrode', params: { electrode: 'LA', noise: 'emg' } },
      ecg: recorded(1583),
      caption: l(
        'I、II、III各用两个电极。噪声在一个电极上：用它的两个导联和以它命名的加压导联满是噪声，另两个加压导联带一半，剩下一个导联干净。换个电极试试。',
        'Leads I, II and III each use two electrodes. Noise on one electrode fills the two that use it and the augmented lead named after it, half-fills the other two augmented leads and leaves one lead clean. Move it to another electrode.',
        'I, II y III usan dos electrodos cada una. El ruido de un electrodo llena las dos que lo usan y la aumentada que lleva su nombre, llega a la mitad a las otras dos aumentadas y deja una derivación limpia. Pásalo a otro electrodo.',
      ),
    },
    {
      kind: 'film',
      title: l('同一颗心，六种记录', 'One heart, six recordings', 'Un corazón, seis registros'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'III'] },
      frames: [
        {
          label: l('干净', 'Clean', 'Limpio'),
          ecg: recorded(1583),
          note: l('干净的记录：每个导联基线平直，窦性心律72次/分。', 'A clean recording: a flat baseline in every lead, sinus rhythm at 72/min.', 'Un registro limpio: línea de base plana en todas las derivaciones, ritmo sinusal a 72 lpm.'),
          marks: [{ auto: 'rr', lead: 'II' }],
        },
        {
          label: l('左臂肌电', 'EMG on LA', 'EMG en LA'),
          ecg: recorded(1583, { emgMv: 0.05, emgOn: ['LA'] }),
          note: l('左上肢电极有肌电干扰：I、III、aVL布满细快的毛刺，II干净；II里的P、QRS、T完好。', 'Muscle noise on the left-arm electrode: I, III and aVL covered in fast fine spikes, lead II clean; P, QRS and T intact in II.', 'Ruido muscular en el electrodo del brazo izquierdo: I, III y aVL llenas de espículas finas y rápidas, II limpia; P, QRS y T intactas en II.'),
        },
        {
          label: l('左腿震颤', 'Tremor on LL', 'Temblor en LL'),
          ecg: recorded(1583, { tremor: { mv: 0.1, hz: 5, on: 'LL' } }),
          note: l('左下肢5 Hz震颤：II、III、aVF像房扑一样起伏，I干净；QRS仍按原来的RR走过去。', 'A 5-Hz tremor on the left leg: II, III and aVF ripple like flutter, lead I clean; the QRS still marches at the same RR.', 'Temblor de 5 Hz en la pierna izquierda: II, III y aVF ondulan como un flúter, I limpia; el QRS sigue desfilando con el mismo RR.'),
          marks: [{ auto: 'rr', lead: 'II' }],
        },
        {
          label: l('基线漂移', 'Wander', 'Deriva'),
          ecg: recorded(1583, { wanderMv: 0.25 }),
          note: l('呼吸让基线缓慢上下漂移，胸导联最重：ST看起来时高时低。对着相邻的PR/TP段量ST。', 'Breathing makes the baseline drift slowly up and down, worst in the chest leads: the ST looks high one beat, low the next. Measure it against the nearby PR/TP.', 'La respiración hace que la línea de base suba y baje despacio, sobre todo en precordiales: el ST parece alto en un latido y bajo en otro. Mídelo contra el PR/TP vecino.'),
        },
        {
          label: l('50 Hz交流电', '50-Hz mains', 'Red de 50 Hz'),
          ecg: recorded(1583, { mains: { mv: 0.3, hz: 50, imbalance: 0.3 } }),
          note: l('50 Hz交流干扰：均匀的细锯齿让基线变粗，每个大格约10个小尖。', '50-Hz mains interference: a fine, even sawtooth that thickens the baseline, about 10 tiny peaks per large square.', 'Interferencia de red de 50 Hz: un serrado fino y regular que engrosa la línea de base, unos 10 picos por cuadro grande.'),
        },
        {
          label: l('右臂移动', 'Motion on RA', 'Movimiento en RA'),
          ecg: recorded(1583, { motion: { electrode: 'RA', tMs: 2600, durMs: 3600, mv: 0.8 } }),
          note: l('右臂在动：I、II、aVR出现约3.5秒的宽大乱波，像室速；III干净，窄QRS照常走过去。', 'The right arm moves: about 3.5 s of wide, wild swings in I, II and aVR that look like VT; III stays clean and the narrow QRS keeps marching.', 'El brazo derecho se mueve: unos 3,5 s de ondas anchas y caóticas en I, II y aVR que parecen una TV; III queda limpia y el QRS estrecho sigue desfilando.'),
          marks: [{ auto: 'rr', lead: 'III' }],
        },
      ],
      predict: {
        question: l('噪声在左上肢电极上。哪个肢体导联会保持干净？', 'The noise sits on the left-arm electrode. Which limb lead stays clean?', 'El ruido está en el electrodo del brazo izquierdo. ¿Qué derivación de miembros queda limpia?'),
        options: [l('II', 'II', 'II'), l('I', 'I', 'I'), l('III', 'III', 'III')],
        answer: 0,
      },
      caption: l(
        '只有记录变了。找出照常走过去的QRS和干净的导联，再看病人；修那个电极，而不是整台机器的滤波。',
        'Only the recording changed. Find the marching QRS and the clean lead, then look at the patient; fix that electrode, not the whole machine’s filter.',
        'Solo cambió el registro. Busca el QRS que sigue desfilando y la derivación limpia, y luego mira al paciente; arregla ese electrodo, no el filtro de toda la máquina.',
      ),
    },
    {
      kind: 'criteria',
      title: l('伪差识别工具箱', 'The artefact toolbox', 'La caja de herramientas del artefacto'),
      items: [
        { label: l('貌似心律失常的伪差', 'Arrhythmia-mimicking artefact', 'Artefacto que simula arritmia'), value: l('真实 QRS 按固有 RR 走过去；至少一个导联干净；患者状态不符', 'The real QRS marches through at the underlying RR; at least one lead is clean; the patient does not fit', 'Los QRS reales desfilan con el RR subyacente; al menos una derivación limpia; el paciente no encaja') },
        { label: l('坏电极三角法则', 'Faulty-electrode triangle', 'Triángulo del electrodo defectuoso'), value: l('RA 坏：I 和 II 乱、III 干净；LA 坏：I 和 III 乱、II 干净；LL 坏：II 和 III 乱、I 干净；以该电极命名的加压导联最乱', 'RA: I and II noisy, III clean; LA: I and III noisy, II clean; LL: II and III noisy, I clean; the augmented lead named after it is the worst', 'RA: ruido en I y II, III limpia; LA: ruido en I y III, II limpia; LL: ruido en II y III, I limpia; la aumentada que lleva su nombre es la peor') },
        { label: l('交流干扰', 'AC interference', 'Interferencia de red'), value: l('50 Hz（欧洲、中国）或 60 Hz（美国）细锯齿；先修皮肤接触与导线', '50 Hz (Europe, China) or 60 Hz (USA) fine sawtooth; fix skin contact and wires first', 'Sierra fina de 50 Hz (Europa, China) o 60 Hz (EE. UU.); arregla primero el contacto y los cables') },
        { label: l('基线漂移', 'Baseline wander', 'Oscilación de la línea de base'), value: l('呼吸相关的缓慢漂移，可伪造或掩盖 ST 偏移；备皮、放松、零相位高通滤波', 'Slow respiratory drift that can fake or hide ST shifts; skin preparation, relaxation, zero-phase high-pass filtering', 'Deriva respiratoria lenta que puede fingir u ocultar desviaciones del ST; preparación de la piel, relajación, paso alto de fase cero') },
        { label: l('滤波带宽', 'Filter bandwidth', 'Ancho de banda'), value: l('诊断档：0.05–150 Hz（成人；高通可到 0.67 Hz，但仅限零相位滤波）；监护档 0.5–40 Hz 会扭曲 ST、压低 QRS、藏起搏钉', 'Diagnostic: 0.05–150 Hz (adults; a 0.67-Hz high-pass only with zero-phase filtering); the 0.5–40 Hz monitor band distorts the ST, shrinks the QRS and hides spikes', 'Diagnóstico: 0,05–150 Hz (adultos; paso alto de 0,67 Hz solo con filtro de fase cero); la banda de monitor 0,5–40 Hz distorsiona el ST, reduce el QRS y oculta las espículas') },
        {
          label: l('胸导联与地线', 'Chest leads and the ground', 'Precordiales y tierra'),
          value: l(
            '胸导联以 Wilson 中心电端（RA、LA、LL 的平均）为参考，只分到一个肢体电极约三分之一的噪声；右腿（地线）电极失效时，通常所有导联都出现交流干扰',
            'Chest leads are referenced to Wilson’s central terminal (the mean of RA, LA and LL), so they get about a third of one limb electrode’s noise; a failing right-leg (ground) electrode usually brings mains interference into every lead',
            'Las precordiales se refieren al terminal central de Wilson (la media de RA, LA y LL), así que reciben un tercio del ruido de un electrodo de miembro; si falla el electrodo de la pierna derecha (tierra), suele aparecer interferencia de red en todas las derivaciones',
          ),
        },
      ],
      source: 'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324; Knight BP et al. N Engl J Med 1999;341:1270-1274; Baranchuk A et al. Crit Care Nurse 2009;29:67-73',
    },
    {
      kind: 'worked',
      title: l('证明是伪差，并找到那个电极', 'Prove the artefact, then find the electrode', 'Demuestra el artefacto y encuentra el electrodo'),
      ecg: synth('muscle-tremor-parkinsonian', 1582),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('找真 QRS', 'Find the real QRS', 'Encuentra el QRS real'),
          body: l('在波动下面辨认窄而尖的 QRS，标出几个，用分规量它们的间距。', 'Pick out the narrow, sharp QRS complexes under the ripple, mark a few, and measure their spacing with calipers.', 'Distingue los QRS estrechos y puntiagudos bajo el rizado, marca algunos y mide su separación con el compás.'),
          marks: [{ auto: 'qrs', lead: 'II' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('走 RR', 'March the RR', 'Recorre el RR'),
          body: l('间距恒定、逐搏都对得上（约 832 ms，72 次/分）——伪差从不打乱真实的节律。房扑的 F 波与 QRS 有固定关系，而这里的波动和 QRS 毫无关系。', 'The spacing is constant and marches through beat after beat (about 832 ms, 72/min) — artefact never disturbs the true rhythm. Flutter waves keep a fixed relation to the QRS; this ripple has no relation to it at all.', 'La separación es constante y desfila latido a latido (unos 832 ms, 72 lpm): el artefacto nunca altera el ritmo real. Las ondas F del flúter mantienen una relación fija con el QRS; este rizado no tiene ninguna.'),
          marks: [{ auto: 'rr', lead: 'II', beat: 1 }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('哪几个导联乱？', 'Which leads are noisy?', '¿Qué derivaciones tienen ruido?'),
          body: l('回到 12 导联：II、III、aVF 乱，**I 干净**；aVR 和 aVL 只带上一半的波动。II 和 III 共同用到的电极是左下肢（LL）；aVF（以“足”命名）和 II、III 一样乱。结论：震颤在左腿电极上。', 'Back to the 12 leads: II, III and aVF are noisy, **lead I is clean**, and aVR and aVL carry only half of the ripple. The electrode that II and III share is the left leg (LL); aVF ("foot") is as noisy as II and III. Conclusion: the tremor is on the left-leg electrode.', 'Vuelve a las 12 derivaciones: II, III y aVF tienen ruido, **I está limpia** y aVR y aVL solo llevan la mitad del rizado. El electrodo que comparten II y III es el de la pierna izquierda (LL); aVF ("pie") tiene tanto ruido como II y III. Conclusión: el temblor está en el electrodo de la pierna izquierda.'),
          highlightLeads: ['II', 'III', 'aVF', 'I'],
        },
        {
          title: l('看患者，修记录', 'Look at the patient, fix the recording', 'Mira al paciente y arregla el registro'),
          body: l('患者状态与“房扑”矛盾——报告“窦性心律，左下肢电极震颤伪差”，不要开抗凝或复律。让腿放松、电极移到大腿近端，然后重做。', 'The patient contradicts "flutter" — report "sinus rhythm, tremor artefact on the left-leg electrode", and do not start anticoagulation or cardioversion. Let the leg relax, move the electrode to the upper thigh, and record again.', 'El paciente contradice el "flúter": informa "ritmo sinusal, artefacto por temblor en el electrodo de la pierna izquierda" y no inicies anticoagulación ni cardioversión. Relaja la pierna, sube el electrodo al muslo y repite el registro.'),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('震颤伪差还是房颤？', 'Tremor artefact or AF?', '¿Artefacto de temblor o FA?'),
      view: STRIP,
      left: {
        ecg: synth('muscle-tremor-parkinsonian', 1584),
        caption: l('帕金森震颤伪差（II）：规则的 5 Hz 波动，RR 恒定', 'Parkinsonian tremor artefact (II): a regular 5-Hz ripple, a constant RR', 'Artefacto por temblor parkinsoniano (II): rizado regular de 5 Hz, RR constante'),
        marks: [{ auto: 'rr', lead: 'II' }],
      },
      right: {
        ecg: synth('atrial-fibrillation', 1585, { fCoarseness: 0.5, ventricularResponse: 110 }),
        caption: l('心房颤动（II）：不规则的 f 波，RR 绝对不规则', 'Atrial fibrillation (II): irregular f waves, an irregularly irregular RR', 'Fibrilación auricular (II): ondas f irregulares, RR irregularmente irregular'),
        marks: [{ auto: 'rr', lead: 'II', beat: 6 }, { auto: 'rr', lead: 'II', beat: 7 }],
      },
      point: l(
        '两侧都“看不清 P 波”。左：基线上叠加的是规则的波动，但 QRS 一个接一个**等距**地走过去，P 波其实还在，另一个导联（I）会是干净的。右：基线本身在无规律地颤动（f 波），**RR 毫无规律**（t2）。先量 RR：规则的 RR 加上“房颤样”基线，首先想伪差。',
        'Neither side shows clear P waves. Left: a regular ripple rides on the baseline, but the QRS complexes march through at **equal** spacing, the P waves are actually still there, and another lead (I) will be clean. Right: the baseline itself fibrillates without order (f waves) and the **RR has no pattern at all** (t2). Measure the RR first: a regular RR under an "AF-looking" baseline means artefact until proven otherwise.',
        'Ningún lado muestra P claras. Izquierda: un rizado regular cabalga sobre la línea de base, pero los QRS desfilan con separación **igual**, las P en realidad siguen ahí y otra derivación (I) estará limpia. Derecha: la propia línea de base fibrila sin orden (ondas f) y **el RR no sigue ningún patrón** (t2). Mide primero el RR: un RR regular bajo una línea de base "de FA" es artefacto mientras no se demuestre lo contrario.',
      ),
    },
    {
      kind: 'film',
      title: l('同一颗正常心脏，三种滤波', 'One normal heart, three filters', 'Un corazón normal, tres filtros'),
      view: { layout: '3x4+1', highlightLeads: ['V4', 'V5', 'V6'] },
      frames: [
        {
          label: l('诊断档', 'Diagnostic', 'Diagnóstico'),
          ecg: synth('normal', 1590),
          note: l('诊断档0.05–150 Hz：V4–V6的J点平贴基线。', 'Diagnostic band, 0.05–150 Hz: the J point in V4–V6 sits on the baseline.', 'Banda diagnóstica, 0,05–150 Hz: el punto J de V4–V6 está sobre la línea de base.'),
          marks: [{ auto: 'j', lead: 'V5' }],
        },
        {
          label: l('监护档', 'Monitor', 'Monitor'),
          ecg: { kind: 'synth', req: { scenario: 'normal', seed: 1590, recording: { filter: MONITOR } } },
          note: l('监护档0.5–40 Hz单向高通：同样的心跳，V4–V6的J点被拉到基线下约1 mm，像侧壁ST压低。', 'Monitor band, 0.5–40 Hz one-way high-pass: the same beats, but the J in V4–V6 is dragged about 1 mm below the baseline, like lateral ST depression.', 'Banda de monitor, paso alto de 0,5–40 Hz en un solo sentido: los mismos latidos, pero el J de V4–V6 baja alrededor de 1 mm, como un descenso lateral del ST.'),
          marks: [{ auto: 'j', lead: 'V5' }],
        },
        {
          label: l('零相位0.67 Hz', 'Zero-phase 0.67 Hz', 'Fase cero 0,67 Hz'),
          ecg: { kind: 'synth', req: { scenario: 'normal', seed: 1590, recording: { filter: FILTER_PRESETS.diagnosticLinear } } },
          note: l('0.67 Hz高通，但为零相位（双向）：J点回到基线。只有零相位才可以用这么高的截止频率。', 'A 0.67-Hz high-pass run zero-phase (both ways): the J point is back on the baseline. Only zero-phase filtering may use a cut-off this high.', 'Un paso alto de 0,67 Hz pero de fase cero (en ambos sentidos): el punto J vuelve a la línea de base. Solo el filtrado de fase cero admite un corte tan alto.'),
          marks: [{ auto: 'j', lead: 'V5' }],
        },
      ],
      predict: {
        question: l('把同一份正常心电图换成监护档（0.5–40 Hz），V5的J点会怎样？', 'Put the same normal ECG through the monitor band (0.5–40 Hz). What happens to the J point in V5?', 'Pasa el mismo ECG normal por la banda de monitor (0,5–40 Hz). ¿Qué le pasa al punto J de V5?'),
        options: [l('离开基线', 'It moves off the baseline', 'Se separa de la línea de base'), l('不变', 'It stays put', 'No cambia')],
        answer: 0,
      },
      caption: l(
        '心脏没变，变的是记录。从监护仪打印的ST改变，先看纸上的滤波设置；有疑问就用诊断档重做（f4）。陷波器也会削掉一点真实信号。',
        'The heart did not change; the recording did. Before trusting an ST change printed from a monitor, read the filter on the page, and re-record in diagnostic mode when in doubt (f4). The notch filter trims a little real signal too.',
        'El corazón no cambió; el registro sí. Antes de fiarte de un cambio del ST impreso desde un monitor, lee el filtro de la hoja y repite en modo diagnóstico si dudas (f4). El filtro de muesca también recorta algo de señal real.',
      ),
    },
    { kind: 'check', item: { inline: electrodeCheck } },
    { kind: 'check', item: { family: 'artefacts', seed: 2 } },
    { kind: 'check', item: { family: 'artefacts', seed: 9 } },
    { kind: 'check', item: { family: 'artefacts', seed: 14 } },
    { kind: 'drill', families: ['artefacts', 'compare-technical'], count: 8, passScore: 0.85 },
    {
      kind: 'pitfalls',
      items: [
        l('伪差“房颤”被抗凝或复律——RR 规则时先想伪差。', 'Artefact "AF" anticoagulated or cardioverted — a regular RR means artefact first.', 'Anticoagular o cardiovertir una "FA" de artefacto: un RR regular es primero artefacto.'),
        l('运动伪差“室速”电击了一个清醒、在说话的患者。', 'Shocking a conscious, talking patient for motion-artefact "VT".', 'Descargar a un paciente consciente que habla por una "TV" de artefacto de movimiento.'),
        l('用监护档滤波读 ST 段（ST 会被假性压低或抬高）。', 'Reading the ST on the monitor filter (false depression or elevation).', 'Leer el ST con el filtro de monitor (descensos o elevaciones falsos).'),
        l('信任陷波滤波而不修电极接触。', 'Trusting the notch filter instead of fixing the electrode.', 'Confiar en el filtro de muesca en lugar de arreglar el electrodo.'),
        l('把 V4–V6 的漂移当作缺血性压低。', 'Calling wander in V4–V6 ischaemic depression.', 'Llamar isquémico al descenso que es oscilación en V4–V6.'),
        l('只看一条节律条就下结论：伪差往往只在一两个导联里——总要看全 12 导联。', 'Concluding from a single rhythm strip: artefact often lives in only one or two leads — always look at all twelve.', 'Concluir con una sola tira de ritmo: el artefacto suele vivir en una o dos derivaciones; mira siempre las doce.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('伪装成心律失常的伪差三条证据：QRS 按原 RR 走过去、有干净导联、患者状态不符。', 'Three proofs of arrhythmia-mimicking artefact: the QRS marches through at the same RR, a clean lead exists, the patient does not fit.', 'Tres pruebas del artefacto que simula arritmias: el QRS desfila con el mismo RR, hay una derivación limpia y el paciente no encaja.'),
        l('坏电极三角：RA → I + II（aVR 同样乱）；LA → I + III（aVL 同样乱）；LL → II + III（aVF 同样乱）。', 'The faulty-electrode triangle: RA → I + II (aVR just as noisy); LA → I + III (aVL just as noisy); LL → II + III (aVF just as noisy).', 'El triángulo del electrodo defectuoso: RA → I + II (aVR igual de ruidosa); LA → I + III (aVL igual); LL → II + III (aVF igual).'),
        l('交流干扰先修接触；基线漂移先修记录；修的是电极，不是整台机器的滤波。', 'AC interference: fix the contact first; wander: fix the recording first; fix the electrode, not the whole machine’s filter.', 'Interferencia de red: primero el contacto; oscilación: primero el registro; arregla el electrodo, no el filtro de toda la máquina.'),
        l('读 ST 与起搏钉必须用诊断档滤波（0.05–150 Hz）；监护档能在正常心脏上造出约 1 mm 的 ST 压低。', 'ST segments and pacing spikes need the diagnostic bandwidth (0.05–150 Hz); the monitor filter can manufacture about 1 mm of ST depression on a normal heart.', 'El ST y las espículas exigen el ancho de banda diagnóstico (0,05–150 Hz); el filtro de monitor puede fabricar alrededor de 1 mm de descenso del ST en un corazón normal.'),
      ],
    },
  ],
  sources: [
    'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    'Knight BP et al. Clinical consequences of electrocardiographic artifact mimicking ventricular tachycardia. N Engl J Med 1999;341:1270-1274',
    'Baranchuk A et al. Electrocardiography pitfalls and artifacts: the 10 commandments. Crit Care Nurse 2009;29:67-73',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
