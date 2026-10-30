/**
 * S1 — The fixed reading order (docs/PLAN.md §3, stage S).
 * The structured read of docs/curriculum/critic.json (outdated "six-step method" → quality, calibration and placement
 * first; rate; rhythm; PR; QRS; QT/QTc; axis; morphology; prior ECG; context; never-miss screen; computer last).
 * Normal values: criteria.md `pr-normal`, `qrs-duration-normal`, `qtc-bazett`, `qrs-axis-adult`, `heart-rate-methods`.
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(dials ? { dials } : {}) },
});
/** the worked-example ECG: every interval set to a round, normal value */
const NORMAL_READ = synth('normal', 101, { rate: 75, pr: 160, qrs: 90, qtc: 410, axis: 60 });

const nextStep: Item = {
  id: 's1:next-step',
  family: 'report',
  competency: 'C11',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '你已经找到了窦性心动过速（约 120 次/分）。下一步做什么？',
    'You have found a sinus tachycardia of about 120/min. What is your next step?',
    'Has encontrado una taquicardia sinusal de unos 120 lpm. ¿Cuál es tu siguiente paso?',
  ),
  ecg: synth('sinus-tachycardia', 105, { rate: 120 }),
  explanation: l(
    '找到第一个异常就停下来，是漏诊最常见的原因（“满意即止”）。心动过速可以掩盖长 QT、缺血性 ST 改变或短 PR。把顺序走完，最后才看计算机诊断。',
    'Stopping once the first finding is found ("satisfaction of search") is the commonest cause of missed findings. A tachycardia can hide a long QT, an ischaemic ST change or a short PR. Finish the order, and read the computer statement last.',
    'Detenerse al encontrar el primer hallazgo ("satisfacción de búsqueda") es la causa más frecuente de hallazgos omitidos. Una taquicardia puede esconder un QT largo, un cambio isquémico del ST o un PR corto. Termina el orden y lee el informe automático al final.',
  ),
  findings: ['sinus-tachycardia'],
  key: {
    options: [
      { id: 'stop', label: l('报告窦性心动过速：主要发现已经找到', 'Report sinus tachycardia: the main finding is found', 'Informar taquicardia sinusal: ya está el hallazgo principal') },
      { id: 'continue', label: l('继续：PR、QRS、QT/QTc、电轴、形态，再做“不可漏诊”筛查', 'Carry on: PR, QRS, QT/QTc, axis, morphology, then the never-miss screen', 'Seguir: PR, QRS, QT/QTc, eje, morfología y después el cribado de lo que no se puede pasar por alto') },
      { id: 'computer', label: l('先看机器的自动诊断，看它还发现了什么', 'Read the machine statement to see what else it found', 'Leer el informe automático para ver qué más ha encontrado') },
    ],
    correct: 'continue',
  },
};

const firstStep: Item = {
  id: 's1:first-step',
  family: 'report',
  competency: 'C11',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l('拿到这份心电图，计算心率之前先做哪一步？', 'Before you work out the rate of this ECG, which step comes first?', 'Antes de calcular la frecuencia de este ECG, ¿qué paso va primero?'),
  ecg: synth('normal', 106),
  explanation: l(
    '先查记录：定标脉冲（10 mm/mV）、走纸速度（25 mm/s）、噪声和电极位置。半电压会让所有振幅变小，左右手电极接反会使 I 导联倒置——不先检查，后面每一步读的都是错误的信号。',
    'Check the recording first: calibration pulse (10 mm/mV), paper speed (25 mm/s), noise and electrode placement. Half gain shrinks every voltage and reversed arm cables invert lead I: skip this and every later step reads a wrong signal.',
    'Comprueba primero el registro: pulso de calibración (10 mm/mV), velocidad del papel (25 mm/s), ruido y colocación de los electrodos. Con media ganancia todos los voltajes se reducen y con los cables de los brazos invertidos la derivación I se invierte: si te lo saltas, cada paso posterior lee una señal errónea.',
  ),
  findings: [],
  key: {
    options: [
      { id: 'recording', label: l('检查定标、走纸速度和电极位置', 'Check calibration, paper speed and electrode placement', 'Comprobar calibración, velocidad del papel y colocación de electrodos') },
      { id: 'rhythm', label: l('判断是不是窦性心律', 'Decide whether the rhythm is sinus', 'Decidir si el ritmo es sinusal') },
      { id: 'axis', label: l('估计电轴', 'Estimate the axis', 'Estimar el eje') },
    ],
    correct: 'recording',
  },
};

const lesson: Lesson = {
  id: 's1',
  stage: 'S',
  order: 1,
  title: l('固定的读图顺序', 'The fixed reading order', 'El orden de lectura fijo'),
  summary: l(
    '每份心电图都用同一个顺序读：先查记录，再测量，再看形态，最后比较和下结论。顺序防止漏诊。',
    'Read every ECG in the same order: check the recording, measure, look at morphology, then compare and conclude. The order is what prevents omissions.',
    'Lee cada ECG en el mismo orden: comprueba el registro, mide, mira la morfología y después compara y concluye. El orden es lo que evita omisiones.',
  ),
  objectives: [
    l('按固定的九步顺序读一份 12 导联心电图。', 'Read a 12-lead ECG in a fixed nine-step order.', 'Leer un ECG de 12 derivaciones en un orden fijo de nueve pasos.'),
    l('即使心电图“看起来正常”，也测量每一个间期。', 'Measure every interval, even when the ECG “looks normal”.', 'Medir todos los intervalos, aunque el ECG “parezca normal”.'),
    l('结束前做“不可漏诊”筛查，最后才看计算机诊断。', 'Finish with the never-miss screen and read the computer statement last.', 'Terminar con el cribado de lo que no se puede pasar por alto y leer el informe automático al final.'),
  ],
  minutes: 14,
  competencies: ['C11'],
  findings: ['normal-ecg'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('wpw', 127),
      question: l(
        '给你一分钟：这份心电图正常吗？写下你的结论和理由。',
        'You have one minute. Is this ECG normal? Write your verdict and the reason.',
        'Tienes un minuto. ¿Es normal este ECG? Escribe tu conclusión y el motivo.',
      ),
      reveal: l(
        '不正常。心率和节律没有问题，但 **PR 间期短（约 115 ms，< 120 ms）**，QRS 起始部顿挫（δ 波），QRS 增宽（约 125 ms），V1 的 R 波明显（R ≥ S），II、III、aVF 和 V3–V6 的 T 波倒置：心室预激，T 波倒置是它的继发性复极改变。每次都测 PR 的人在第 4 步就找到原因，用一个诊断解释了所有异常；直接“看形态”的人常把倒置的 T 波读成缺血，把 V1 明显的 R 波读成后壁梗死或右束支阻滞。这正是固定顺序的意义。',
        'It is not. The rate and rhythm are fine, but the **PR is short (about 115 ms, < 120 ms)**, the QRS starts with a slurred upstroke (a delta wave) and is wide (about 125 ms), V1 has a prominent R wave (R ≥ S), and the T waves are inverted in II, III, aVF and V3–V6: ventricular pre-excitation, with the T inversion as its secondary repolarisation change. A reader who measures the PR every time finds the cause at step 4 and explains every abnormality with one diagnosis; a reader who jumps straight to “morphology” tends to call the inverted T waves ischaemia and the prominent R in V1 a posterior infarct or RBBB. That is what a fixed order is for.',
        'No lo es. La frecuencia y el ritmo son correctos, pero el **PR es corto (unos 115 ms, < 120 ms)**, el QRS empieza con un empastamiento (onda delta) y es ancho (unos 125 ms), V1 tiene una R prominente (R ≥ S) y las T son negativas en II, III, aVF y V3–V6: preexcitación ventricular, con la T negativa como alteración secundaria de la repolarización. Quien mide el PR siempre encuentra la causa en el paso 4 y explica todas las anomalías con un solo diagnóstico; quien salta directamente a la “morfología” suele llamar isquemia a las T negativas e infarto posterior o bloqueo de rama derecha a la R prominente de V1. Para eso sirve un orden fijo.',
      ),
    },
    {
      kind: 'text',
      title: l('为什么要固定顺序', 'Why a fixed order', 'Por qué un orden fijo'),
      body: l(
        '有经验的读图者把整体印象和清单结合起来，而清单防止的是**遗漏**：\n- 每个间期都测，即使心电图“看起来正常”；\n- 找到第一个异常后继续读（最常见的错误就是找到一个就停下）；\n- 最后才看计算机诊断，免得它先入为主。',
        'Experienced readers combine a quick overall impression with a checklist, and the checklist is what prevents **omissions**:\n- you measure every interval, even when the tracing “looks normal”;\n- you keep going after the first finding (the commonest error is to stop once something is found);\n- you read the computer statement last, so it cannot anchor your read.',
        'Los lectores con experiencia combinan una impresión global rápida con una lista de comprobación, y la lista es lo que evita las **omisiones**:\n- mides todos los intervalos, aunque el trazado “parezca normal”;\n- sigues después del primer hallazgo (el error más frecuente es parar en cuanto se encuentra algo);\n- lees el informe automático al final, para que no condicione tu lectura.',
      ),
    },
    {
      kind: 'criteria',
      title: l('读图顺序与正常值（成人）', 'The reading order and adult normal values', 'El orden de lectura y los valores normales del adulto'),
      items: [
        {
          label: l('1 记录', '1 Recording', '1 Registro'),
          value: l(
            '25 mm/s、10 mm/mV（看定标脉冲）、噪声、电极位置（I 导联全部倒置而 aVR 直立 → 怀疑左右手电极接反）',
            '25 mm/s, 10 mm/mV (check the pulse), noise, electrode placement (lead I all negative with an upright aVR → suspect reversed arm cables)',
            '25 mm/s, 10 mm/mV (mira el pulso), ruido, colocación de electrodos (I totalmente negativa con aVR positiva → sospecha inversión de los cables de los brazos)',
          ),
        },
        { label: l('2 心率', '2 Rate', '2 Frecuencia'), value: l('60–100 次/分', '60–100/min', '60–100 lpm') },
        {
          label: l('3 节律', '3 Rhythm', '3 Ritmo'),
          value: l('每个 QRS 前有窦性 P 波（I、II、aVF 直立，aVR 倒置）？规则吗？', 'A sinus P (upright in I, II, aVF; inverted in aVR) before every QRS? Regular?', '¿P sinusal (positiva en I, II, aVF; negativa en aVR) antes de cada QRS? ¿Regular?'),
        },
        { label: l('4 PR 间期', '4 PR interval', '4 Intervalo PR'), value: l('120–200 ms', '120–200 ms', '120–200 ms') },
        {
          label: l('5 QRS 时限', '5 QRS duration', '5 Duración del QRS'),
          value: l(
            '< 110 ms（110–119 不完全阻滞/室内传导延迟；≥ 120 宽 QRS）',
            '< 110 ms (110–119 incomplete block or intraventricular conduction delay; ≥ 120 wide)',
            '< 110 ms (110–119 bloqueo incompleto o trastorno de la conducción intraventricular; ≥ 120 ancho)',
          ),
        },
        { label: l('6 QT/QTc', '6 QT/QTc', '6 QT/QTc'), value: l('QTc：男 < 450 ms，女 < 460 ms', 'QTc < 450 ms in men, < 460 ms in women', 'QTc < 450 ms en varones, < 460 ms en mujeres') },
        { label: l('7 电轴', '7 Axis', '7 Eje'), value: l('−30° 至 +90°', '−30° to +90°', '−30° a +90°') },
        {
          label: l('8 形态', '8 Morphology', '8 Morfología'),
          value: l('P · QRS（Q 波、电压、R 波递增）· ST · T · U', 'P · QRS (Q waves, voltage, R progression) · ST · T · U', 'P · QRS (ondas Q, voltaje, progresión de R) · ST · T · U'),
        },
        {
          label: l('9 比较与结论', '9 Compare and conclude', '9 Comparar y concluir'),
          value: l('旧心电图 → 临床问题 → “不可漏诊”筛查 → 结论 → 最后才看计算机诊断', 'Prior ECG → clinical question → never-miss screen → conclusion → only then the computer statement', 'ECG previo → pregunta clínica → cribado de lo que no se puede pasar por alto → conclusión → solo entonces el informe automático'),
        },
      ],
      source: 'Kligfield P et al. Circulation 2007;115:1306 (Part I); Mason JW et al. Circulation 2007;115:1325 (Part II); Surawicz B et al. Circulation 2009;119:e235 (Part III); Rautaharju PM et al. Circulation 2009;119:e241 (Part IV); Sibbald M et al. Med Educ 2013;47:301',
    },
    {
      kind: 'worked',
      title: l('九步读完一份心电图', 'A complete read in nine steps', 'Una lectura completa en nueve pasos'),
      ecg: NORMAL_READ,
      steps: [
        {
          title: l('1 记录', '1 Recording', '1 Registro'),
          body: l(
            '定标脉冲 10 mm 高，走纸 25 mm/s，基线干净。I 导联的 P、QRS、T 都直立，aVR 倒置：没有左右手电极接反的迹象。',
            'The calibration pulse is 10 mm tall at 25 mm/s and the baseline is clean. Lead I has upright P, QRS and T, and aVR is negative: no sign of reversed arm cables.',
            'El pulso de calibración mide 10 mm a 25 mm/s y la línea de base está limpia. La derivación I tiene P, QRS y T positivas, y aVR es negativa: no hay signos de inversión de los cables de los brazos.',
          ),
          highlightLeads: ['I', 'aVR'],
        },
        {
          title: l('2 心率', '2 Rate', '2 Frecuencia'),
          body: l('RR = 4 个大格：300 ÷ 4 = 75 次/分。', 'RR = 4 large squares: 300 ÷ 4 = 75/min.', 'RR = 4 cuadros grandes: 300 ÷ 4 = 75 lpm.'),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('3 节律', '3 Rhythm', '3 Ritmo'),
          body: l(
            '每个 QRS 前都有 P 波，II 导联直立、aVR 倒置，节律规则：窦性心律。',
            'A P wave before every QRS, upright in II and inverted in aVR, regular: sinus rhythm.',
            'Una onda P antes de cada QRS, positiva en II y negativa en aVR, regular: ritmo sinusal.',
          ),
          marks: [{ auto: 'p' }],
          highlightLeads: ['II', 'aVR'],
        },
        {
          title: l('4 PR 间期', '4 PR interval', '4 Intervalo PR'),
          body: l('4 个小格 = 160 ms：正常（120–200 ms）。', '4 small squares = 160 ms: normal (120–200 ms).', '4 cuadros pequeños = 160 ms: normal (120–200 ms).'),
          marks: [{ auto: 'pr' }],
        },
        {
          title: l('5 QRS 时限', '5 QRS duration', '5 Duración del QRS'),
          body: l('略多于 2 个小格，约 90 ms：窄 QRS（< 110 ms）。', 'A little over 2 small squares, about 90 ms: narrow (< 110 ms).', 'Algo más de 2 cuadros pequeños, unos 90 ms: estrecho (< 110 ms).'),
          marks: [{ auto: 'qrs' }],
        },
        {
          title: l('6 QT/QTc', '6 QT/QTc', '6 QT/QTc'),
          body: l(
            '心率 75 次/分时 QT 约 380 ms；Fridericia 校正 QTc ≈ 410 ms：正常。',
            'At 75/min the QT is about 380 ms; the Fridericia QTc is about 410 ms: normal.',
            'A 75 lpm el QT mide unos 380 ms; el QTc de Fridericia es de unos 410 ms: normal.',
          ),
          marks: [{ auto: 'qt' }, { auto: 'rr' }],
        },
        {
          title: l('7 电轴', '7 Axis', '7 Eje'),
          body: l(
            'I 和 aVF 都向上：正常象限。肢体导联中 aVL 最接近等电位，所以电轴约 +60°。',
            'I and aVF are both positive: normal quadrant. aVL is the most equiphasic limb lead, so the axis is about +60°.',
            'I y aVF son positivas: cuadrante normal. aVL es la derivación de miembros más isodifásica, así que el eje está en torno a +60°.',
          ),
          highlightLeads: ['I', 'aVF', 'aVL'],
        },
        {
          title: l('8 形态', '8 Morphology', '8 Morfología'),
          body: l(
            'P 波形态正常；R 波从 V1 到 V5 逐渐增高，在 V3 附近超过 S 波（移行区）；ST 段位于基线；T 波与 QRS 主波方向一致，aVR 倒置。',
            'Normal P waves; the R wave grows from V1 to V5 and overtakes the S around V3 (the transition); ST segments on the baseline; T waves follow the main QRS direction and are inverted in aVR.',
            'Ondas P normales; la R crece de V1 a V5 y supera a la S hacia V3 (la transición); segmentos ST en la línea de base; las T siguen la dirección principal del QRS y son negativas en aVR.',
          ),
          highlightLeads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
        },
        {
          title: l('9 结论', '9 Conclusion', '9 Conclusión'),
          body: l(
            '窦性心律，75 次/分；PR 160 ms，QRS 90 ms，QTc 410 ms，电轴 +60°。“不可漏诊”筛查阴性。**正常心电图。**',
            'Sinus rhythm, 75/min; PR 160 ms, QRS 90 ms, QTc 410 ms, axis +60°. Never-miss screen negative. **Normal ECG.**',
            'Ritmo sinusal a 75 lpm; PR 160 ms, QRS 90 ms, QTc 410 ms, eje +60°. Cribado de lo que no se puede pasar por alto negativo. **ECG normal.**',
          ),
        },
      ],
    },
    {
      kind: 'text',
      title: l('签字之前：“不可漏诊”筛查', 'Before you sign: the never-miss screen', 'Antes de firmar: el cribado de lo que no se puede pasar por alto'),
      body: l(
        '下结论前问自己六个问题：\n- 有没有急性冠脉闭塞或其等同图形？\n- 有没有高钾血症？\n- QT 是否延长？\n- 有没有心室预激？\n- 有没有 Brugada 1 型图形？\n- 有没有高度房室传导阻滞？\n每一个都会改变今天的处理，后面各有专门的课。',
        'Ask six questions before you conclude:\n- an acute coronary occlusion or one of its equivalents?\n- hyperkalaemia?\n- a long QT?\n- pre-excitation?\n- a Brugada type 1 pattern?\n- high-grade AV block?\nEach one changes what happens today, and each has its own lesson later.',
        'Hazte seis preguntas antes de concluir:\n- ¿oclusión coronaria aguda o uno de sus equivalentes?\n- ¿hiperpotasemia?\n- ¿QT largo?\n- ¿preexcitación?\n- ¿patrón de Brugada tipo 1?\n- ¿bloqueo AV de alto grado?\nCada una cambia lo que se hace hoy, y cada una tiene su propia lección más adelante.',
      ),
    },
    {
      kind: 'contrast',
      title: l('把顺序走完', 'Finish the order', 'Termina el orden'),
      left: {
        ecg: synth('normal', 104, { rate: 75 }),
        caption: l('按顺序读：第 1–8 步', 'Read it in order: steps 1–8', 'Léelo en orden: pasos 1–8'),
      },
      right: {
        ecg: synth('hyperkalemia', 103),
        caption: l('按顺序读：第 1–8 步', 'Read it in order: steps 1–8', 'Léelo en orden: pasos 1–8'),
      },
      point: l(
        'B 在三步上不正常：PR 约 205 ms（第 4 步），QRS 约 115 ms（第 5 步），V3–V5 的 T 波高尖、基底窄，与 R 波一样高甚至更高（第 8 步）。单看每一项都不显眼，合在一起再经过“不可漏诊”筛查，就指向高钾血症——这是急症。在电轴之后就停下的人会漏掉它。',
        'B is abnormal at three steps: PR about 205 ms (step 4), QRS about 115 ms (step 5) and tall, narrow-based, peaked T waves in V3–V5, as tall as the R waves or taller (step 8). Each is subtle on its own; together, and with the never-miss screen, they point to hyperkalaemia, an emergency. A reader who stops after the axis misses it.',
        'B es anormal en tres pasos: PR de unos 205 ms (paso 4), QRS de unos 115 ms (paso 5) y ondas T altas, picudas y de base estrecha en V3–V5, tan altas como las R o más (paso 8). Cada uno es sutil por separado; juntos, y con el cribado final, apuntan a una hiperpotasemia, que es una urgencia. Quien se detiene tras el eje la pasa por alto.',
      ),
    },
    { kind: 'check', item: { inline: firstStep } },
    { kind: 'check', item: { inline: nextStep } },
    { kind: 'check', item: { family: 'spot', seed: 10 } },
    { kind: 'check', item: { family: 'spot', seed: 8 } },
    { kind: 'drill', families: ['spot'], count: 6, passScore: 0.8 },
    {
      kind: 'real',
      ids: [13683, 21589, 14918],
      caption: l(
        '三份真实心电图。揭晓标注之前，每份按九步写下一行一句的读图结果，争取每份约三分钟。',
        'Three real ECGs. Before you reveal the labels, write one line per step for each; aim for about three minutes per ECG.',
        'Tres ECG reales. Antes de ver las etiquetas, escribe una línea por paso para cada uno; intenta tardar unos tres minutos por ECG.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('找到第一个异常就停下。', 'Stopping at the first abnormality.', 'Detenerse en la primera anomalía.'),
        l('先看计算机诊断：它会先入为主，而它最常错在节律和电极错接上。', 'Reading the computer statement first: it anchors you, and it is most often wrong on rhythm and on electrode errors.', 'Leer primero el informe automático: condiciona la lectura, y se equivoca sobre todo en el ritmo y en los errores de electrodos.'),
        l('跳过第 1 步：电极接反或半电压会让正常的心脏看起来异常（反之亦然）。', 'Skipping step 1: reversed cables or half gain make a normal heart look abnormal, or the reverse.', 'Saltarse el paso 1: los cables invertidos o la media ganancia hacen que un corazón normal parezca anormal, o al revés.'),
        l('“目测”间期：短 PR、长 QT、115 ms 的 QRS 乍看都像正常。', '“Eyeballing” intervals: a short PR, a long QT or a QRS of 115 ms all look normal at a glance.', 'Calcular los intervalos “a ojo”: un PR corto, un QT largo o un QRS de 115 ms parecen normales a primera vista.'),
        l('不和旧心电图比较：很多发现是否紧急，取决于它是不是新出现的。', 'Not comparing with a previous ECG: whether a finding is new often decides whether it is urgent.', 'No comparar con un ECG previo: que un hallazgo sea nuevo a menudo decide si es urgente.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('每次同一顺序：记录 → 心率 → 节律 → PR → QRS → QT/QTc → 电轴 → 形态 → 比较与结论。', 'Same order every time: recording → rate → rhythm → PR → QRS → QT/QTc → axis → morphology → compare and conclude.', 'Siempre el mismo orden: registro → frecuencia → ritmo → PR → QRS → QT/QTc → eje → morfología → comparar y concluir.'),
        l('即使心电图“看起来正常”，也要测量每一个间期。', 'Measure every interval, even when the ECG “looks normal”.', 'Mide todos los intervalos, aunque el ECG “parezca normal”.'),
        l('找到第一个发现后继续读，最后做“不可漏诊”筛查。', 'Keep going after the first finding; finish with the never-miss screen.', 'Sigue después del primer hallazgo; termina con el cribado de lo que no se puede pasar por alto.'),
        l('计算机诊断最后才看。', 'Read the computer statement last.', 'Lee el informe automático al final.'),
      ],
    },
  ],
  sources: [
    'Kligfield P et al. AHA/ACCF/HRS Recommendations for the standardization and interpretation of the ECG, Part I. Circulation 2007;115:1306-1324',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Sibbald M et al. Checklists improve experts’ diagnostic decisions. Med Educ 2013;47:301-308',
    'Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms: benefits and limitations. J Am Coll Cardiol 2017;70:1183-1192',
    'Castellano et al. 2004',
  ],
};

export default lesson;
