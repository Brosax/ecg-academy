/**
 * O1 — Potassium: the hyperkalaemia ladder and the hypokalaemia ST–T–U (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `electrolytes-drugs-misc-conditions` missing-book bullets
 * "Hyperkalaemia — ECG progression" and "Hypokalaemia — ECG signs" (current values).
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(dials ? { dials } : {}) },
});
const STRIP = { layout: 'strip', lead: 'II' } as const;

const lesson: Lesson = {
  id: 'o1',
  stage: 'O',
  order: 1,
  title: l('血钾异常', 'Potassium', 'Potasio'),
  summary: l(
    '高钾血症沿“阶梯”推进：T波高尖 → PR延长、P波消失 → QRS增宽 → 正弦波，每一级都是急症。低钾血症反其道而行：ST压低、T低平、U波显著，T–U融合貌似长QT（实为QU），伴尖端扭转型室速与洋地黄中毒风险。',
    'Hyperkalaemia climbs a ladder — tented T waves, then PR prolongation and P loss, then QRS widening, then the sine wave — and every rung is an emergency. Hypokalaemia goes the other way: ST depression, a flat T and a prominent U that fuses with it into an apparent long QT (really a QU), with torsades and digoxin-toxicity risk.',
    'La hiperpotasemia sube por una escalera — ondas T picudas, luego PR prolongado y pérdida de la P, después ensanchamiento del QRS y la onda sinusoidal — y cada peldaño es una urgencia. La hipopotasemia va por el otro camino: descenso del ST, T plana y una U prominente que se fusiona con ella en un QT aparentemente largo (en realidad un QU), con riesgo de torsades e intoxicación digitálica.',
  ),
  objectives: [
    l(
      '按顺序说出高钾阶梯的四级，并在心电图上认出每一级。',
      'List the four rungs of the hyperkalaemia ladder in order and recognise each on a tracing.',
      'Enumerar en orden los cuatro peldaños de la escalera de la hiperpotasemia y reconocer cada uno en un trazado.',
    ),
    l(
      '把高钾的窄底帐篷样T波与闭塞的宽大超急性T波区分开。',
      'Tell the narrow-based tented T of hyperkalaemia from the broad, bulky hyperacute T of occlusion.',
      'Distinguir la T en tienda de campaña de base estrecha de la hiperpotasemia de la T hiperaguda ancha y voluminosa de la oclusión.',
    ),
    l(
      '认出低钾的ST压低、T低平与显著U波，并把T–U融合（QU）与真正的QT延长区分开。',
      'Recognise the ST depression, flat T and prominent U of hypokalaemia, and separate T–U fusion (a QU) from true QT prolongation.',
      'Reconocer el descenso del ST, la T plana y la U prominente de la hipopotasemia, y separar la fusión T–U (un QU) de un QT verdaderamente largo.',
    ),
    l(
      '说出高钾急症的处理顺序（钙剂→转移钾→排钾），以及低钾时查镁、警惕洋地黄中毒。',
      'State the order of hyperkalaemia treatment (calcium → shift K → remove K) and, in hypokalaemia, check magnesium and think of digoxin toxicity.',
      'Indicar el orden del tratamiento de la hiperpotasemia (calcio → trasladar K → eliminar K) y, en la hipopotasemia, comprobar el magnesio y pensar en la intoxicación digitálica.',
    ),
  ],
  minutes: 16,
  competencies: ['C10'],
  findings: ['hyperkalemia', 'hypokalemia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('hyperkalemia', 1401, { rate: 78 }),
      view: STRIP,
      question: l(
        '透析患者，乏力。II导联的T波又高又窄。你会先开哪项血检查？随着数值继续升高，P波和QRS会发生什么？',
        'A dialysis patient, weak. The T waves in lead II are tall and narrow. Which blood test do you order first — and what can happen to the P and the QRS as the value climbs?',
        'Un paciente en diálisis, con debilidad. Las ondas T de la derivación II son altas y estrechas. ¿Qué análisis pides primero? ¿Y qué le puede pasar a la P y al QRS si la cifra sigue subiendo?',
      ),
      reveal: l(
        '查**血钾**。高钾血症按大致顺序重塑心电图：T波高尖（窄底、对称）→ PR延长、P波低平直至消失 → QRS增宽、形态怪异（可伪装成STEMI或Brugada样图形）→ 正弦波 → 室颤或停搏。血钾数值与图形**相关性差**，所以**每一级都按急症处理**：先静脉给钙稳定心肌，再把钾移入细胞，最后把钾排出。本课要练的就是这把“阶梯”。',
        'Order **potassium**. Hyperkalaemia reshapes the ECG in a rough order: tented T waves (narrow-based, symmetric) → PR prolongation with P flattening, then P loss → a wide, bizarre QRS (it can mimic STEMI or a Brugada-like pattern) → the sine wave → VF or asystole. The number correlates **poorly** with the tracing, so **every rung is treated as an emergency**: IV calcium to stabilise the membrane first, then shift potassium into cells, then remove it. This lesson drills that ladder.',
        'Pide el **potasio**. La hiperpotasemia remodela el ECG en un orden aproximado: ondas T picudas (base estrecha, simétricas) → PR prolongado con aplanamiento de la P y luego desaparición → QRS ancho y bizarro (puede simular un IAMCEST o un patrón tipo Brugada) → onda sinusoidal → FV o asistolia. La cifra se correlaciona **mal** con el trazado, así que **cada peldaño se trata como urgencia**: calcio intravenoso para estabilizar la membrana, luego pasar el potasio al interior celular y por último eliminarlo. Esta lección entrena esa escalera.',
      ),
    },
    {
      kind: 'text',
      title: l('高钾阶梯', 'The hyperkalaemia ladder', 'La escalera de la hiperpotasemia'),
      body: l(
        '血钾升高时，心电图大致按固定顺序变化——**高钾阶梯**：\n- **T波高尖**：窄底、对称，呈“帐篷样”，V2–V4最清楚（II、III亦可见）；\n- **PR间期延长、P波低平直至消失**：心房除极被逐渐压制；\n- **QRS增宽**：形态怪异，可伪装成STEMI或Brugada样图形；\n- **正弦波**：QRS与T融合成一条连续起伏的曲线，随后可发展为心动过缓、高度房室传导阻滞、心室颤动或停搏。\n两条规则：血钾浓度与心电图形**相关性差**——血钾很高时图形可以接近正常，数值不高时也可以出现明显改变；因此**任何**提示高钾的心电图改变都是急症：静脉钙剂稳定心肌 → 胰岛素+葡萄糖把钾移入细胞 → 透析、利尿剂或钾结合剂排钾。',
        'As potassium climbs, the ECG changes in a rough, fixed order — the **hyperkalaemia ladder**:\n- **tented T waves**: narrow-based, symmetric "tents", clearest in V2–V4 (also II and III);\n- **PR prolongation, P flattening, then P loss**: atrial activation is progressively suppressed;\n- **QRS widening**: bizarre morphology, can masquerade as STEMI or a Brugada-like pattern;\n- **sine wave**: QRS and T merge into one undulating curve — then bradycardia, high-grade AV block, VF or asystole.\nTwo rules: serum K correlates **poorly** with the tracing — the ECG can look nearly normal at a dangerous level, and striking changes can appear at a modest one; and **any** ECG change of hyperkalaemia is an emergency: IV calcium to stabilise the myocardium → insulin with glucose to shift K into cells → dialysis, diuretics or potassium binders to remove it.',
        'A medida que el potasio sube, el ECG cambia en un orden aproximado y fijo — la **escalera de la hiperpotasemia**:\n- **ondas T picudas**: en "tienda de campaña", de base estrecha y simétricas, más claras en V2–V4 (también en II y III);\n- **PR prolongado, aplanamiento de la P y luego desaparición**: la activación auricular se amortigua progresivamente;\n- **ensanchamiento del QRS**: morfología bizarra, puede enmascararse como IAMCEST o patrón tipo Brugada;\n- **onda sinusoidal**: el QRS y la T se funden en una curva ondulante única — después bradicardia, bloqueo AV avanzado, fibrilación ventricular o asistolia.\nDos reglas: la potasemia se correlaciona **mal** con el trazado — el ECG puede ser casi normal con cifras peligrosas, y cambios llamativos pueden aparecer con valores discretos; y **cualquier** cambio electrocardiográfico de la hiperpotasemia es una urgencia: calcio intravenoso para estabilizar el miocardio → insulina con glucosa para trasladar el K al interior celular → diálisis, diuréticos o quelantes del potasio para eliminarlo.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('hyperkalemia', 1402, { rate: 82 }),
      marks: [
        { auto: 't', lead: 'V2' },
        { auto: 't', lead: 'V3' },
        { auto: 'qrs', lead: 'V2' },
      ],
      caption: l(
        'V2–V3的T波**高尖、对称、窄底**，像帐篷一样立在QRS之后。再量一下间期：PR约205 ms（已轻度延长），QRS约115 ms（接近120 ms上限）——阶梯已经越过第一级，P波与传导开始受累，这就是急症。窄的底部是与超急性期T波的关键区别（后者宽底、粗大，见下面对比）。',
        'In V2–V3 the T waves are **tall, symmetric and narrow-based**, a tent standing right after the QRS. Now measure: the PR is about 205 ms (already mildly long) and the QRS about 115 ms (close to the 120-ms limit) — the ladder is past its first rung, the P and conduction are starting to suffer, and that is an emergency. The narrow base is the key difference from a hyperacute T (broad-based and bulky — see the contrast below).',
        'En V2–V3 las ondas T son **picudas, simétricas y de base estrecha**, una tienda de campaña justo detrás del QRS. Ahora mide: el PR ronda los 205 ms (ya algo largo) y el QRS unos 115 ms (cerca del límite de 120 ms): la escalera ha pasado el primer peldaño, la P y la conducción empiezan a sufrir, y eso es una urgencia. La base estrecha es la diferencia clave frente a una T hiperaguda (ancha de base y voluminosa: mira el contraste más abajo).',
      ),
    },
    {
      kind: 'criteria',
      title: l('血钾：图形标准', 'Potassium: pattern criteria', 'Potasio: criterios de patrón'),
      items: [
        {
          label: l('高钾：T波', 'Hyperkalaemia: T wave', 'Hiperpotasemia: onda T'),
          value: l(
            '高尖、窄底、对称，呈“帐篷样”；V2–V4最清楚（II、III亦可见）',
            'Tall, narrow-based, symmetric "tented"; clearest in V2–V4 (also II, III)',
            'Picuda, de base estrecha, simétrica, en "tienda de campaña"; más clara en V2–V4 (también II, III)',
          ),
        },
        {
          label: l('高钾：PR与P波', 'Hyperkalaemia: PR and P', 'Hiperpotasemia: PR y P'),
          value: l('PR间期延长；P波低平，直至消失', 'PR prolongation; the P flattens, then disappears', 'PR prolongado; la P se aplana y luego desaparece'),
        },
        {
          label: l('高钾：QRS与终末', 'Hyperkalaemia: QRS and the end', 'Hiperpotasemia: QRS y final'),
          value: l(
            'QRS增宽、形态怪异，可伪装STEMI或Brugada样；随后正弦波、心动过缓、高度房室传导阻滞、室颤或停搏',
            'QRS widening, bizarre, can mimic STEMI or Brugada-like; then sine wave, bradycardia, high-grade AV block, VF or asystole',
            'QRS ancho, bizarro, puede simular IAMCEST o tipo Brugada; después onda sinusoidal, bradicardia, bloqueo AV avanzado, FV o asistolia',
          ),
        },
        {
          label: l('高钾：急症原则', 'Hyperkalaemia: emergency rule', 'Hiperpotasemia: regla de urgencia'),
          value: l(
            '血钾与图形相关性差（危险水平时图形可近正常）；任何改变都是急症：钙剂 → 转移钾 → 排钾',
            'Poor correlation with serum K (can look nearly normal at a dangerous level); any change is an emergency: calcium → shift K → remove K',
            'Mala correlación con la potasemia (puede ser casi normal con cifras peligrosas); cualquier cambio es urgencia: calcio → trasladar K → eliminar K',
          ),
        },
        {
          label: l('低钾：ST–T–U', 'Hypokalaemia: ST–T–U', 'Hipopotasemia: ST–T–U'),
          value: l(
            'ST压低、T低平或倒置、U波显著（V2–V3最清楚，常高于T）；T–U融合貌似长QT，实为QU；增加TdP与洋地黄中毒风险；常伴低镁血症',
            'ST depression, flat or inverted T, prominent U (best in V2–V3, often taller than the T); T–U fusion mimics long QT — it is a QU; raises TdP and digoxin-toxicity risk; usually with hypomagnesaemia',
            'Descenso del ST, T plana o invertida, U prominente (mejor en V2–V3, a menudo mayor que la T); la fusión T–U simula un QT largo — es un QU; aumenta el riesgo de TdP e intoxicación digitálica; suele acompañarse de hipomagnesemia',
          ),
        },
      ],
      source:
        'Clase CM et al. KDIGO Controversies Conference on potassium. Kidney Int 2020;97:42-62; Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    },
    {
      kind: 'worked',
      title: l('给血钾“定级”：读出严重程度', "'Date' the potassium: read the severity band", "'Fechar' el potasio: lee la banda de gravedad"),
      ecg: synth('hyperkalemia-severe', 1403, { rate: 62 }),
      steps: [
        {
          title: l('P波还在吗？', 'Is the P still there?', '¿Sigue la onda P?'),
          body: l(
            'II导联上几乎找不到P波——标记指示的位置只剩一条近于平直的线。心房除极几近消失：阶梯已过半程，PR无法测量，而“间期测不出”本身就是诊断线索。',
            'In lead II you can barely find a P — the mark points at what is left of it, a nearly flat line. Atrial activation is almost gone: the ladder is past half-way, the PR is unmeasurable, and "intervals you cannot measure" is itself the diagnostic clue.',
            'En la derivación II apenas encuentras una P: la marca señala lo que queda de ella, una línea casi plana. La activación auricular casi ha desaparecido: la escalera ha pasado la mitad, el PR no se puede medir, y "intervalos imposibles de medir" es en sí la pista diagnóstica.',
          ),
          marks: [{ auto: 'p', lead: 'II', label: l('P？', 'P?', '¿P?') }],
          highlightLeads: ['II'],
        },
        {
          title: l('QRS有多宽？', 'How wide is the QRS?', '¿Cómo de ancho es el QRS?'),
          body: l(
            '量QRS：远超120 ms，形态怪异。传导系统同样被抑制——这是重度带。',
            'Measure the QRS: far beyond 120 ms, bizarre in shape. The conduction system is depressed too — this is the severe band.',
            'Mide el QRS: muy por encima de 120 ms, de morfología bizarra. El sistema de conducción también está deprimido: esta es la banda grave.',
          ),
          marks: [{ auto: 'qrs' }],
        },
        {
          title: l('QRS与T之间还剩多少？', 'How much is left between QRS and T?', '¿Cuánto queda entre el QRS y la T?'),
          body: l(
            'T波直接从宽QRS里升起，两者几乎连成一体；量一下RR，看舒张期还剩多短。再高一步就是**正弦波**——从那里摔下去就是室颤或停搏。',
            'The T rises straight out of the wide QRS — the two are almost one; measure the RR and see how little diastole is left. One step higher is the **sine wave**, and falling off there means VF or asystole.',
            'La T se eleva directamente del QRS ancho — los dos son casi uno; mide el RR y mira cuánta diástole queda. Un peldaño más arriba está la **onda sinusoidal**, y caer desde ahí significa FV o asistolia.',
          ),
          marks: [{ auto: 't' }, { auto: 'rr' }],
        },
        {
          title: l('定级并行动', 'Date the band and act', 'Fecha la banda y actúa'),
          body: l(
            'P消失 + QRS重度增宽 + T融合 = **重度**：现在就给静脉钙剂，不必等化验回报；然后胰岛素+葡萄糖转移钾，再透析或钾结合剂排钾。把这份图当作化验结果出来之前的治疗指征。',
            'P gone + severely wide QRS + merging T = **severe**: give IV calcium now, without waiting for the laboratory; then insulin with glucose to shift potassium, then dialysis or binders to remove it. Treat this tracing as the treatment indication that precedes the lab result.',
            'P desaparecida + QRS muy ancho + T fusionada = **grave**: administra calcio intravenoso ahora, sin esperar al laboratorio; después insulina con glucosa para trasladar el potasio y luego diálisis o quelantes para eliminarlo. Trata este trazado como la indicación de tratamiento que precede al resultado del laboratorio.',
          ),
        },
      ],
    },
    {
      kind: 'text',
      title: l('低钾：另一条路', 'Hypokalaemia: the other road', 'Hipopotasemia: el otro camino'),
      body: l(
        '低钾血症的复极**变慢**而不是变快：\n- ST段轻度压低；\n- T波低平，甚至倒置；\n- **U波显著**，V2–V3最清楚，常常**比T波还高**；\n- T波与U波融合，QT看似延长——那其实是**QU间期**：测QT止于T波终点，把U波排除在外。\n低钾增加**尖端扭转型室速**和**洋地黄中毒**（o3）的风险，而且几乎总与**低镁血症**同行：补钾的同时查镁、补镁，两个离子都纠正才能压住TdP。',
        'In hypokalaemia repolarisation **slows** instead of speeding up:\n- slight ST depression;\n- a flat T, even inverted;\n- a **prominent U wave**, clearest in V2–V3, often **taller than the T**;\n- T and U fuse and the QT looks long — but that is a **QU interval**: measure the QT to the end of the T and leave the U out.\nLow potassium raises the risk of **torsades de pointes** and of **digoxin toxicity** (o3), and almost always travels with **hypomagnesaemia**: when you replace potassium, check and replace magnesium too — both ions must be corrected to hold TdP down.',
        'En la hipopotasemia la repolarización se **enlentece** en lugar de acelerarse:\n- descenso ligero del ST;\n- una T plana, incluso invertida;\n- una **onda U prominente**, más clara en V2–V3, a menudo **más alta que la T**;\n- la T y la U se funden y el QT parece largo — pero eso es un **intervalo QU**: mide el QT hasta el final de la T y deja fuera la U.\nEl potasio bajo aumenta el riesgo de **torsades de pointes** y de **intoxicación digitálica** (o3), y casi siempre va acompañado de **hipomagnesemia**: al reponer potasio, comprueba y repone también el magnesio; hay que corregir ambos iones para controlar la TdP.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('hypokalemia', 1404, { rate: 60 }),
      marks: [
        { auto: 'st', lead: 'V2' },
        { auto: 't', lead: 'V2' },
        { auto: 'u', lead: 'V2' },
      ],
      caption: l(
        'V2：ST轻度压低，T低平，U波比T波还高。QT测量用切线法止于**T波终点**——一直量到U波终点就成了“假性长QT”。同时查血镁；正在用洋地黄的病人，这幅图是中毒的预警（o3）。',
        'V2: slight ST depression, a flat T, and a U wave taller than the T. Measure the QT with the tangent method to the **end of the T** — run it to the end of the U and you have manufactured a "long QT". Check magnesium at the same time; in a patient on digoxin this tracing is a toxicity warning (o3).',
        'V2: descenso ligero del ST, T plana y una onda U más alta que la T. Mide el QT con el método de la tangente hasta el **final de la T**; si lo llevas hasta el final de la U habrás fabricado un "QT largo". Comprueba el magnesio a la vez; en un paciente con digital, este trazado es un aviso de intoxicación (o3).',
      ),
    },
    {
      kind: 'live',
      scenario: 'hypokalemia',
      seed: 1405,
      dials: [{ id: 'rate' }],
      view: { layout: 'strip', lead: 'V2' },
      marks: [
        { auto: 't', lead: 'V2' },
        { auto: 'u', lead: 'V2' },
      ],
      caption: l(
        '拖动心率（52–68次/分）：舒张期缩短，U波向下一个P波靠近。心率再快时T、U、P会融合成一段看似延长的复极——那时别把QU读成QT。',
        'Drag the rate (52–68/min): diastole shortens and the U wave closes in on the next P. At faster rates T, U and P fuse into what looks like one long repolarisation — do not read that QU as a QT.',
        'Mueve la frecuencia (52–68 lpm): la diástole se acorta y la U se acerca a la siguiente P. Con frecuencias mayores, T, U y P se funden en lo que parece una repolarización única y larga: no leas ese QU como un QT.',
      ),
    },
    {
      kind: 'contrast',
      title: l('窄底帐篷还是宽大超急性T', 'Narrow tent or bulky hyperacute T', 'Tienda estrecha o T hiperaguda voluminosa'),
      view: { layout: 'strip', lead: 'V3' },
      left: {
        ecg: synth('hyperkalemia', 1406, { rate: 75 }),
        caption: l('透析患者，乏力：窄底、对称的帐篷样T；PR已轻度延长，QRS处于上限，无对应性ST压低。', 'Dialysis patient, weak: narrow-based, symmetric tented T; PR already mildly long, QRS at the upper limit, no reciprocal ST depression.', 'Paciente en diálisis, con debilidad: T en tienda de campaña de base estrecha y simétrica; PR ya algo largo, QRS en el límite alto y sin descenso recíproco del ST.'),
        marks: [
          { auto: 't', lead: 'V3' },
          { auto: 'qrs', lead: 'V3' },
        ],
      },
      right: {
        ecg: synth('hyperacute-t', 1407),
        caption: l('55岁男性，胸痛20分钟（i7）：宽底、粗大的T骑在偏小的QRS上。', 'Man, 55, chest pain for 20 min (i7): a broad-based, bulky T riding a modest QRS.', 'Varón de 55 años, dolor torácico de 20 min (i7): una T ancha de base y voluminosa sobre un QRS discreto.'),
        marks: [
          { auto: 't', lead: 'V3' },
          { auto: 'qrs', lead: 'V3' },
        ],
      },
      point: l(
        '两者都“T波高大”，但形态与伴随完全不同。左：高钾的T**窄底、对称**，PR与QRS已开始被拉长，没有对应性ST压低，患者乏力而非胸痛——查血钾。右：闭塞的超急性T**宽底、粗大、相对QRS过大**（i7），伴胸痛、常伴演变——按闭塞处理。问三个问题：T的底有多宽？PR和QRS在被拉长吗？患者胸痛吗？',
        'Both have "tall T waves", but shape and company differ completely. Left: the hyperkalaemic T is **narrow-based and symmetric**, the PR and QRS already starting to stretch, no reciprocal ST depression, and the patient weak rather than in pain — order potassium. Right: the hyperacute T of occlusion is **broad-based, bulky, large for its QRS** (i7), with chest pain and usually evolution — treat as occlusion. Ask three questions: how wide is the base of the T? Are the PR and QRS stretching? Is the patient in pain?',
        'Ambos tienen "ondas T altas", pero la forma y la compañía difieren por completo. Izquierda: la T de la hiperpotasemia es **de base estrecha y simétrica**, con el PR y el QRS ya alargándose, sin descenso recíproco del ST, y el paciente está débil, no con dolor: pide el potasio. Derecha: la T hiperaguda de la oclusión es **ancha de base, voluminosa, grande para su QRS** (i7), con dolor torácico y habitualmente evolución: trátala como oclusión. Haz tres preguntas: ¿cómo de ancha es la base de la T? ¿Se están alargando el PR y el QRS? ¿Tiene dolor el paciente?',
      ),
    },
    { kind: 'check', item: { family: 'metabolic', seed: 21 } },
    { kind: 'check', item: { family: 'metabolic', seed: 3 } },
    { kind: 'check', item: { family: 'metabolic', seed: 7 } },
    { kind: 'drill', families: ['metabolic'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [16101, 3456],
      caption: l(
        '两份真实心电图（PTB-XL），标注都与电解质有关。先自己读：找帐篷样T、看P波是否低平、量QRS宽度，或者找ST–T–U的改变；写下你的判断，再揭晓标签。',
        'Two real tracings (PTB-XL), both labelled as electrolyte-related. Read them yourself first: hunt the tented T, check whether the P is flattening, measure the QRS — or look for the ST–T–U pattern; commit in writing before the reveal.',
        'Dos trazados reales (PTB-XL), ambos etiquetados como relacionados con electrolitos. Léelos tú primero: busca la T en tienda de campaña, comprueba si la P se aplana, mide el QRS o busca el patrón ST–T–U; comprométete por escrito antes de ver la etiqueta.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把高钾的帐篷样T波叫作“超急性期T波/STEMI”送去导管室——先看T的底宽、QRS与PR，再查血钾。',
          'Calling the tented T of hyperkalaemia a "hyperacute T STEMI" and shipping it to the cath lab — check the base width, the QRS and the PR first, then the potassium.',
          'Llamar "T hiperaguda/IAMCEST" a la T en tienda de campaña de la hiperpotasemia y enviarla al laboratorio de hemodinámica — mira antes la anchura de la base, el QRS y el PR, y después el potasio.',
        ),
        l(
          '血钾“正常”就放过危险图形：心电图与血钾相关性差，按图形而不是按化验单处理。',
          'A "normal" potassium dismissing a dangerous tracing: the ECG correlates poorly with serum K — treat the tracing, not the lab slip.',
          'Un potasio "normal" que archiva un trazado peligroso: el ECG se correlaciona mal con la potasemia; trata el trazado, no el volante del laboratorio.',
        ),
        l(
          '把低钾的U波读成长QT却不看V2–V3：T–U融合是QU，QT止于T波终点。',
          'Reading hypokalaemia\'s U waves as a long QT without looking at V2–V3: T–U fusion is a QU; the QT ends at the end of the T.',
          'Leer las ondas U de la hipopotasemia como un QT largo sin mirar V2–V3: la fusión T–U es un QU; el QT termina al final de la T.',
        ),
        l(
          '忘了镁：低钾几乎总与低镁同行，两个都要补，否则压不住TdP。',
          'Forgetting magnesium: hypokalaemia nearly always travels with hypomagnesaemia — replace both, or TdP will not stay down.',
          'Olvidar el magnesio: la hipopotasemia casi siempre va con hipomagnesemia; repone ambos o la TdP no se controlará.',
        ),
        l(
          '用“样本溶血”解释一份危险的心电图而延误处理：重抽血可以，先按图形治疗。',
          'A "haemolysed sample" excusing a dangerous ECG and delaying treatment: redraw the tube, but treat the tracing first.',
          'Una "muestra hemolizada" como excusa de un ECG peligroso que retrasa el tratamiento: vuelve a extraer la muestra, pero trata primero el trazado.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '高钾阶梯：T波高尖（V2–V4）→ PR延长、P波消失 → QRS增宽（可伪装STEMI或Brugada样）→ 正弦波 → 室颤或停搏。',
          'The hyperkalaemia ladder: tented T (V2–V4) → PR prolongation and P loss → QRS widening (pseudo-STEMI or Brugada-like) → sine wave → VF or asystole.',
          'La escalera de la hiperpotasemia: T picuda (V2–V4) → PR prolongado y pérdida de la P → QRS ancho (pseudo-IAMCEST o tipo Brugada) → onda sinusoidal → FV o asistolia.',
        ),
        l(
          '血钾与图形相关性差：任何高钾心电图改变都是急症——钙剂稳定、转移钾、再排钾。',
          'Serum K correlates poorly with the tracing: any hyperkalaemia ECG change is an emergency — calcium to stabilise, then shift K, then remove it.',
          'La potasemia se correlaciona mal con el trazado: cualquier cambio de hiperpotasemia es una urgencia — calcio para estabilizar, luego trasladar el K y eliminarlo.',
        ),
        l(
          '高钾的T窄底、对称，常伴PR与QRS逐渐延长、无对应性压低；闭塞的超急性T宽底粗大、相对QRS过大，伴胸痛（i7）。',
          'The hyperkalaemic T is narrow-based and symmetric, often with a stretching PR and QRS and no reciprocal depression; the hyperacute T of occlusion is broad-based, bulky, large for its QRS, and painful (i7).',
          'La T de la hiperpotasemia es de base estrecha y simétrica, a menudo con PR y QRS que se alargan y sin descenso recíproco; la T hiperaguda de la oclusión es ancha de base, voluminosa, grande para su QRS y dolorosa (i7).',
        ),
        l(
          '低钾：ST压低、T低平、U波显著（V2–V3，U可高于T）；T–U融合是QU，不是QT。',
          'Hypokalaemia: ST depression, flat T, prominent U (V2–V3, the U may exceed the T); T–U fusion is a QU, not a QT.',
          'Hipopotasemia: descenso del ST, T plana, U prominente (V2–V3, la U puede superar a la T); la fusión T–U es un QU, no un QT.',
        ),
        l(
          '低钾时查镁、警惕洋地黄中毒（o3）：TdP要两个离子一起纠正才压得住。',
          'In hypokalaemia check magnesium and think of digoxin toxicity (o3): torsades stays down only when both ions are corrected.',
          'En la hipopotasemia comprueba el magnesio y piensa en la intoxicación digitálica (o3): la torsades solo se controla corrigiendo ambos iones.',
        ),
      ],
    },
  ],
  sources: [
    'Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    'Clase CM et al. KDIGO Controversies Conference on potassium. Kidney Int 2020;97:42-62',
    'Lavonas EJ et al. AHA 2023 Focused Update on poisoning-related cardiac arrest and toxicity. Circulation 2023;148:e149-e186',
    'Castellano et al. 2004',
  ],
};

export default lesson;
