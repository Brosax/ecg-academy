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
import type { DialId, FilterSpec } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
/** The bedside-monitor bandwidth (= FILTER_PRESETS.monitor: 0.5–40 Hz, causal, 50-Hz notch). */
const MONITOR: FilterSpec = { highpassHz: 0.5, lowpassHz: 40, notchHz: 50, phase: 'causal' };
const STRIP = { layout: 'strip', lead: 'II' } as const;

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
    '右上肢（RA）电极。I（= LA − RA）和 II（= LL − RA）都乱，III（= LL − LA）没有用到 RA，所以干净；以该电极命名的 aVR 最乱。胸前导联也有一点（Wilson 中心电端里有 RA 的三分之一）。在 III 里，真正的窄 QRS 按原来的 RR 规律地走过去——这是伪差，不是室速。别电击一个在说话的人。',
    'The right-arm (RA) electrode. Lead I (= LA − RA) and lead II (= LL − RA) are both disturbed, lead III (= LL − LA) does not use RA and stays clean, and aVR, named after that electrode, is the worst. The chest leads carry a little of it too (Wilson’s central terminal contains a third of RA). In lead III the real narrow QRS complexes march through at the same RR — this is artefact, not VT. Do not shock someone who is talking to you.',
    'El electrodo del brazo derecho (RA). I (= LA − RA) y II (= LL − RA) están alteradas, III (= LL − LA) no usa RA y queda limpia, y aVR, que lleva el nombre de ese electrodo, es la peor. Las precordiales también llevan algo (el terminal central de Wilson contiene un tercio de RA). En III los QRS estrechos reales desfilan con el mismo RR: es artefacto, no TV. No descargues a alguien que está hablando contigo.',
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
    'Descarta el registro antes de culpar al corazón: el temblor, los escalofríos y el movimiento se hacen pasar por FA, flutter o incluso TV, pero los QRS reales "desfilan" con el RR subyacente, al menos una derivación queda limpia y el paciente no encaja. Dos derivaciones de los miembros con ruido y una limpia señalan el electrodo defectuoso. El filtro de monitor (0,5–40 Hz) puede fingir u ocultar cambios del ST: lee el ST con el ancho de banda diagnóstico.',
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
        'Un paciente de 74 años con enfermedad de Parkinson; el monitor marca "¿flutter?": la derivación II parece un rizado pequeño y regular. Está consciente y con tensión normal. ¿Es una arritmia? ¿Cómo lo demuestras?',
      ),
      reveal: l(
        '不是。这是帕金森静止性震颤（约 5 Hz）产生的伪差。两条证据：**真实的 QRS 按固有的 RR 间期“走”过去**（用分规量），以及**总有至少一个导联干净**（伪差来自某个电极附近；这里 I 导联干净，因为震颤在左腿电极上）。把“貌似恶性的节律 + 患者安然无恙”当作伪差警号——误读曾导致不必要的抗凝、电复律甚至有创操作。',
        'No. This is artefact from a Parkinsonian rest tremor (about 5 Hz). Two proofs: **the real QRS complexes "march through" at the underlying RR** (measure with calipers), and **at least one lead stays clean** (the artefact lives near one electrode; here lead I is clean because the tremor is on the left-leg electrode). Treat "a malignant-looking rhythm + a perfectly well patient" as an artefact alarm — misreadings have led to needless anticoagulation, cardioversion and even invasive procedures.',
        'No. Es artefacto por temblor de reposo parkinsoniano (unos 5 Hz). Dos pruebas: **los QRS reales "desfilan" con el RR subyacente** (mídelo con el compás) y **al menos una derivación queda limpia** (el artefacto vive junto a un electrodo; aquí I está limpia porque el temblor está en el electrodo de la pierna izquierda). Considera "ritmo de aspecto maligno + paciente perfectamente bien" una alarma de artefacto: estas lecturas erróneas han llevado a anticoagulaciones, cardioversiones e incluso procedimientos invasivos innecesarios.',
      ),
    },
    {
      kind: 'text',
      title: l('伪差图谱', 'The artefact atlas', 'El atlas de los artefactos'),
      body: l(
        '常见伪差与对策：\n- **基线漂移**（呼吸、移动、出汗）：慢慢上下漂，胸前导联最明显，可掩盖或伪造 ST 偏移——重新备皮、让患者放松平躺；滤波只用零相位的高通，不要盲目提高截止频率；\n- **肌电/寒战/震颤**（帕金森约 4–6 Hz）：貌似房颤、房扑甚至室速——找“走过去”的 QRS 与干净导联；让患者手臂放松、垫在身体两侧，或把电极移到肢体近端；\n- **交流电干扰**（欧洲、中国 50 Hz，美国 60 Hz）：细密均匀的锯齿把基线“加粗”——先查皮肤接触与导线，陷波滤波只是补救；\n- **运动、拍打、刷牙、电极脱落**：可在几秒内造出“室速”“室颤”或“停搏”——**先看患者**。',
        'The common artefacts and their fixes:\n- **baseline wander** (breathing, movement, sweat): a slow up-and-down drift, worst in the chest leads, that can hide or fake ST shifts — re-prepare the skin, let the patient lie relaxed; filter only with a zero-phase high-pass, never by blindly raising the cut-off;\n- **muscle / shivering / tremor** (about 4–6 Hz in Parkinson’s): mimics AF, flutter, even VT — find the marching QRS and the clean lead; rest the arms by the sides, or move the electrodes to the proximal limbs;\n- **mains (AC) interference** (50 Hz in Europe and China, 60 Hz in the USA): a fine regular sawtooth that thickens the baseline — check the skin contact and the lead wires first; the notch filter is only the backup;\n- **motion, tapping, tooth-brushing, a loose electrode**: can conjure "VT", "VF" or "asystole" within seconds — **look at the patient**.',
        'Los artefactos frecuentes y sus soluciones:\n- **oscilación de la línea de base** (respiración, movimiento, sudor): una deriva lenta arriba y abajo, peor en las precordiales, que puede ocultar o fingir desviaciones del ST; repite la preparación de la piel y deja al paciente tumbado y relajado; filtra solo con un paso alto de fase cero, nunca subiendo a ciegas la frecuencia de corte;\n- **muscular / escalofríos / temblor** (unos 4–6 Hz en el Parkinson): simula FA, flutter e incluso TV; busca el QRS que desfila y la derivación limpia; apoya los brazos a los lados o lleva los electrodos a la raíz de los miembros;\n- **interferencia de la red eléctrica** (50 Hz en Europa y China, 60 Hz en EE. UU.): una sierra fina y regular que engrosa la línea de base; revisa primero el contacto con la piel y los cables; el filtro de muesca es solo el recurso;\n- **movimiento, golpecitos, cepillado de dientes, un electrodo suelto**: pueden fabricar una "TV", una "FV" o una "asistolia" en segundos: **mira al paciente**.',
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
          body: l('间距恒定、逐搏都对得上（约 830 ms，72 次/分）——伪差从不打乱真实的节律。房扑的 F 波与 QRS 有固定关系，而这里的波动和 QRS 毫无关系。', 'The spacing is constant and marches through beat after beat (about 830 ms, 72/min) — artefact never disturbs the true rhythm. Flutter waves keep a fixed relation to the QRS; this ripple has no relation to it at all.', 'La separación es constante y desfila latido a latido (unos 830 ms, 72 lpm): el artefacto nunca altera el ritmo real. Las ondas F del flutter mantienen una relación fija con el QRS; este rizado no tiene ninguna.'),
          marks: [{ auto: 'rr', lead: 'II' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('哪几个导联乱？', 'Which leads are noisy?', '¿Qué derivaciones tienen ruido?'),
          body: l('回到 12 导联：II、III、aVF 乱，**I 干净**；aVR 和 aVL 只带上一半的波动。II 和 III 共同用到的电极是左下肢（LL）；aVF（以“足”命名）最乱。结论：震颤在左腿电极上。', 'Back to the 12 leads: II, III and aVF are noisy, **lead I is clean**, and aVR and aVL carry only half of the ripple. The electrode that II and III share is the left leg (LL); aVF ("foot") is the worst. Conclusion: the tremor is on the left-leg electrode.', 'Vuelve a las 12 derivaciones: II, III y aVF tienen ruido, **I está limpia** y aVR y aVL solo llevan la mitad del rizado. El electrodo que comparten II y III es el de la pierna izquierda (LL); aVF ("pie") es la peor. Conclusión: el temblor está en el electrodo de la pierna izquierda.'),
          highlightLeads: ['II', 'III', 'aVF', 'I'],
        },
        {
          title: l('看患者，修记录', 'Look at the patient, fix the recording', 'Mira al paciente y arregla el registro'),
          body: l('患者状态与“房扑”矛盾——报告“窦性心律，左下肢电极震颤伪差”，不要开抗凝或复律。让腿放松、电极移到大腿近端，然后重做。', 'The patient contradicts "flutter" — report "sinus rhythm, tremor artefact on the left-leg electrode", and do not start anticoagulation or cardioversion. Let the leg relax, move the electrode to the upper thigh, and record again.', 'El paciente contradice el "flutter": informa "ritmo sinusal, artefacto por temblor en el electrodo de la pierna izquierda" y no inicies anticoagulación ni cardioversión. Relaja la pierna, sube el electrodo al muslo y repite el registro.'),
        },
      ],
    },
    {
      kind: 'text',
      title: l('为什么是“两个乱、一个干净”', 'Why "two noisy, one clean"', 'Por qué "dos con ruido y una limpia"'),
      body: l(
        '每个标准肢体导联只用两个电极：I = LA − RA，II = LL − RA，III = LL − LA。一个电极上的噪声只会进入用到它的两个导联，第三个导联不用它，所以干净：\n- **RA** 出问题 → I、II 乱，III 干净，aVR 最乱；\n- **LA** 出问题 → I、III 乱，II 干净，aVL 最乱；\n- **LL** 出问题 → II、III 乱，I 干净，aVF 最乱。\n胸前导联参考 Wilson 中心电端（RA、LA、LL 的平均），所以会带上约三分之一的肢体电极噪声，但通常较轻。右下肢（RL）是接地电极，它本身出问题时多表现为全导联的交流干扰。找到电极之后，修的是**那个电极**——而不是整台机器的滤波。',
        'Each standard limb lead uses only two electrodes: I = LA − RA, II = LL − RA, III = LL − LA. Noise on one electrode can only enter the two leads that use it; the third lead does not, so it stays clean:\n- trouble at **RA** → I and II noisy, III clean, aVR the worst;\n- trouble at **LA** → I and III noisy, II clean, aVL the worst;\n- trouble at **LL** → II and III noisy, I clean, aVF the worst.\nThe chest leads are referred to Wilson’s central terminal (the average of RA, LA and LL), so they pick up about a third of a limb electrode’s noise, usually less visibly. The right-leg (RL) electrode is the ground; when it fails, the usual result is mains interference in every lead. Once you have found the electrode, fix **that electrode** — not the filter of the whole machine.',
        'Cada derivación estándar de los miembros usa solo dos electrodos: I = LA − RA, II = LL − RA, III = LL − LA. El ruido de un electrodo solo entra en las dos derivaciones que lo usan; la tercera no lo usa y queda limpia:\n- problema en **RA** → ruido en I y II, III limpia, aVR la peor;\n- problema en **LA** → ruido en I y III, II limpia, aVL la peor;\n- problema en **LL** → ruido en II y III, I limpia, aVF la peor.\nLas precordiales se refieren al terminal central de Wilson (el promedio de RA, LA y LL), así que recogen alrededor de un tercio del ruido de un electrodo de los miembros, normalmente menos visible. El electrodo de la pierna derecha (RL) es la toma de tierra; cuando falla, lo habitual es una interferencia de red en todas las derivaciones. Cuando encuentres el electrodo, arregla **ese electrodo**, no el filtro de toda la máquina.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('muscle-tremor', 1583),
      view: { layout: '3x4+1', highlightLeads: ['I', 'III', 'aVL', 'II'] },
      caption: l(
        '肌电干扰在左上肢（LA）电极上：I、III、aVL 布满快速不规则的细小毛刺，**II 干净**，胸前导联只有一点点。在 II 里，P 波、QRS 和 T 波都完好——节律是正常的窦性心律。',
        'Muscle (EMG) noise on the left-arm (LA) electrode: I, III and aVL are covered in fast, irregular fine spikes, **lead II is clean**, and the chest leads carry only a trace. In lead II the P, QRS and T are intact — the rhythm is normal sinus.',
        'Ruido muscular en el electrodo del brazo izquierdo (LA): I, III y aVL están llenas de pequeñas espigas rápidas e irregulares, **II está limpia** y las precordiales apenas llevan un rastro. En II la P, el QRS y la T están intactos: el ritmo es sinusal normal.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('motion-artefact', 1587),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVR'] },
      caption: l(
        '运动伪差在右上肢（RA）电极上：约 3.5 秒的宽大、杂乱波形让 II 导联节律条看起来像室速。但 **III 导联干净**，窄 QRS 在里面按原来的 RR 继续走；I、II、aVR 乱，V1–V3 带上一些。患者在活动右臂。这正是 Knight 等报告的情形：伪差“室速”曾导致不必要的电击、导管检查甚至植入。',
        'Motion artefact on the right-arm (RA) electrode: about 3.5 s of wide, chaotic deflections make the lead-II rhythm strip look like VT. But **lead III is clean** and the narrow QRS complexes keep marching through it at the same RR; I, II and aVR are disturbed and V1–V3 pick some of it up. The patient was moving his right arm. Exactly the scenario Knight and colleagues reported: artefact "VT" has led to needless shocks, catheterisations and even device implants.',
        'Artefacto por movimiento en el electrodo del brazo derecho (RA): unos 3,5 s de deflexiones anchas y caóticas hacen que el registro de ritmo de II parezca una TV. Pero **III está limpia** y los QRS estrechos siguen desfilando por ella con el mismo RR; I, II y aVR están alteradas y V1–V3 recogen algo. El paciente movía el brazo derecho. Es justo lo que describieron Knight y colaboradores: "TV" de artefacto que acabó en descargas, cateterismos e incluso implantes innecesarios.',
      ),
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
        marks: [{ auto: 'rr', lead: 'II' }],
      },
      point: l(
        '两侧都“看不清 P 波”。左：基线上叠加的是规则的波动，但 QRS 一个接一个**等距**地走过去，P 波其实还在，另一个导联（I）会是干净的。右：基线本身在无规律地颤动（f 波），**RR 毫无规律**（t2）。先量 RR：规则的 RR 加上“房颤样”基线，首先想伪差。',
        'Neither side shows clear P waves. Left: a regular ripple rides on the baseline, but the QRS complexes march through at **equal** spacing, the P waves are actually still there, and another lead (I) will be clean. Right: the baseline itself fibrillates without order (f waves) and the **RR has no pattern at all** (t2). Measure the RR first: a regular RR under an "AF-looking" baseline means artefact until proven otherwise.',
        'Ningún lado muestra P claras. Izquierda: un rizado regular cabalga sobre la línea de base, pero los QRS desfilan con separación **igual**, las P en realidad siguen ahí y otra derivación (I) estará limpia. Derecha: la propia línea de base fibrila sin orden (ondas f) y **el RR no sigue ningún patrón** (t2). Mide primero el RR: un RR regular bajo una línea de base "de FA" es artefacto mientras no se demuestre lo contrario.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('baseline-wander', 1585),
      view: { layout: '3x4+1' },
      caption: l(
        '呼吸性基线漂移：胸前导联最重，整条线随呼吸缓慢起伏。它会掩盖或伪造 ST 压低——同一个 QRS 的 ST 可以一会儿在基线下、一会儿在基线上。读 ST 时要以紧邻的 PR/TP 段为参照；最好先修记录（备皮、放松、零相位滤波），再读 ST（f4、i1）。',
        'Respiratory baseline wander, worst in the chest leads: the whole line rises and falls slowly with breathing. It can hide or fake ST depression — the same QRS can have its ST below the baseline one moment and above it the next. Measure the ST against the adjacent PR/TP segment; better still, fix the recording (skin, relaxation, zero-phase filtering) before reading the ST (f4, i1).',
        'Oscilación respiratoria de la línea de base, peor en las precordiales: toda la línea sube y baja lentamente con la respiración. Puede ocultar o fingir descensos del ST: el mismo QRS puede tener el ST por debajo de la línea de base en un momento y por encima en el siguiente. Mide el ST respecto al PR/TP inmediato; mejor aún, arregla el registro (piel, relajación, filtro de fase cero) antes de leer el ST (f4, i1).',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('ac-interference', 1586),
      view: { layout: '3x4+1' },
      caption: l(
        '交流干扰：均匀的 50 Hz 细锯齿把基线“加粗”（每个大格里约 10 个小峰）。它出现在接触不好的电极所在的导联里。先查皮肤接触、电极凝胶和断线，再考虑陷波滤波——陷波也会削掉一点真实信号（f4）。',
        'Mains interference: a uniform 50-Hz fine sawtooth thickening the baseline (about 10 tiny peaks per large square). It shows in the leads that use the poorly contacting electrode. Check the skin contact, the electrode gel and the wires first; only then consider the notch filter — which also trims a little of the real signal (f4).',
        'Interferencia de red: una sierra fina y uniforme de 50 Hz que engrosa la línea de base (unos 10 picos diminutos por cuadro grande). Aparece en las derivaciones que usan el electrodo con mal contacto. Revisa primero el contacto, el gel y los cables; solo después piensa en el filtro de muesca, que también recorta algo de la señal real (f4).',
      ),
    },
    {
      kind: 'contrast',
      title: l('同一颗正常心脏，两种滤波', 'One normal heart, two filters', 'Un corazón normal, dos filtros'),
      view: { layout: '3x4+1', highlightLeads: ['V4', 'V5', 'V6'] },
      left: {
        ecg: synth('normal', 1590),
        caption: l('诊断档（0.05–150 Hz）：ST 段平贴基线', 'Diagnostic filter (0.05–150 Hz): the ST lies on the baseline', 'Filtro diagnóstico (0,05–150 Hz): el ST está sobre la línea de base'),
        marks: [{ auto: 'j', lead: 'V5' }],
      },
      right: {
        ecg: { kind: 'synth', req: { scenario: 'normal', seed: 1590, recording: { filter: MONITOR } } },
        caption: l('监护档（0.5–40 Hz）：V4–V6 的 J 点被拉低约 1 mm', 'Monitor filter (0.5–40 Hz): the J point in V4–V6 dragged about 1 mm down', 'Filtro de monitor (0,5–40 Hz): el punto J de V4–V6 arrastrado alrededor de 1 mm hacia abajo'),
        marks: [{ auto: 'j', lead: 'V5' }],
      },
      point: l(
        '同一颗正常的心脏、同样的心跳，只换了滤波。右边的 0.5 Hz 单向高通跟不上 QRS 之后缓慢的 ST–T，把 V4–V6 的 J 点拉到基线下约 1 mm，看起来像“侧壁 ST 压低”；aVR 和 V1 则被轻轻抬高。心脏没有变——变的是记录。从监护仪导出来的“12 导联”或节律条上读到 ST 改变，先看纸上印的滤波设置；有疑问就用诊断档重做（f4）。',
        'The same normal heart and the same beats; only the filter differs. On the right, the one-way 0.5-Hz high-pass cannot follow the slow ST–T after the QRS and drags the J point in V4–V6 about 1 mm below the baseline — it looks like "lateral ST depression" — while aVR and V1 are nudged up. The heart did not change; the recording did. When you read an ST change on a "12-lead" or rhythm strip printed from a monitor, check the filter setting printed on the page first, and when in doubt re-record in diagnostic mode (f4).',
        'El mismo corazón normal y los mismos latidos; solo cambia el filtro. A la derecha, el paso alto de 0,5 Hz en un solo sentido no sigue el ST-T lento que viene tras el QRS y arrastra el punto J de V4–V6 alrededor de 1 mm por debajo de la línea de base, de modo que parece un "descenso lateral del ST", mientras aVR y V1 suben un poco. El corazón no ha cambiado; el registro sí. Si lees un cambio del ST en un "12 derivaciones" o una tira impresos desde un monitor, mira primero el filtro impreso en la hoja y, si dudas, repite el registro en modo diagnóstico (f4).',
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
        l('坏电极三角：RA → I + II（aVR 最乱）；LA → I + III（aVL）；LL → II + III（aVF）。', 'The faulty-electrode triangle: RA → I + II (aVR worst); LA → I + III (aVL); LL → II + III (aVF).', 'El triángulo del electrodo defectuoso: RA → I + II (aVR la peor); LA → I + III (aVL); LL → II + III (aVF).'),
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
