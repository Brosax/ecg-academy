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
      kind: 'film',
      title: l('高钾阶梯', 'The hyperkalaemia ladder', 'La escalera de la hiperpotasemia'),
      frames: [
        {
          label: l('正常', 'Normal', 'Normal'),
          ecg: synth('normal', 1402, { rate: 82 }),
          note: l('起点：V3的T波圆钝，比R波矮。PR 160 ms，QRS约95 ms。', 'Starting point: in V3 the T is rounded and shorter than the R. PR 160 ms, QRS about 95 ms.', 'Punto de partida: en V3 la T es redondeada y más baja que la R. PR de 160 ms, QRS de unos 95 ms.'),
          marks: [{ auto: 't', lead: 'V3' }, { auto: 'pr', lead: 'II' }],
        },
        {
          label: l('T波高尖', 'Tented T', 'T picuda'),
          ecg: synth('hyperkalemia', 1402, { rate: 82 }),
          note: l('V3的T波成了窄底帐篷，比R波还高。PR约205 ms、QRS约115 ms，已开始拉长：越过了第一级。', 'In V3 the T is a narrow tent, taller than the R. The PR (about 205 ms) and QRS (about 115 ms) are already stretching: past the first rung.', 'En V3 la T es una tienda estrecha, más alta que la R. El PR (unos 205 ms) y el QRS (unos 115 ms) ya se alargan: pasado el primer peldaño.'),
          marks: [{ auto: 't', lead: 'V3' }, { auto: 'pr', lead: 'II' }, { auto: 'qrs', lead: 'V3' }],
        },
        {
          label: l('重度', 'Severe', 'Grave'),
          ecg: synth('hyperkalemia-severe', 1402, { rate: 62 }),
          note: l('重度：II导联的P波几乎消失，QRS约170 ms，T波直接从QRS里升起。再往上是正弦波，然后室颤或停搏。', 'Severe: the P in II has almost gone, the QRS is about 170 ms and the T rises straight out of it. Next comes the sine wave, then VF or asystole.', 'Grave: la P de II casi ha desaparecido, el QRS ronda los 170 ms y la T sale directamente de él. Después viene la onda sinusoidal y luego FV o asistolia.'),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'qrs', lead: 'V3' }],
        },
      ],
      predict: {
        question: l('T波高尖之后，血钾继续升高，接下来先变的是什么？', 'After the tented T, potassium keeps rising. What changes next?', 'Tras la T picuda, el potasio sigue subiendo. ¿Qué cambia después?'),
        options: [
          l('P波变平、PR延长、QRS增宽', 'The P flattens, the PR lengthens, the QRS widens', 'La P se aplana, el PR se alarga y el QRS se ensancha'),
          l('ST抬高并出现Q波', 'The ST rises and Q waves appear', 'El ST sube y aparecen ondas Q'),
          l('T波后出现高大的U波', 'A tall U wave appears after the T', 'Aparece una onda U alta tras la T'),
        ],
        answer: 0,
      },
      caption: l(
        '血钾一级级升高：先变T波，再变P波和PR，最后是QRS。每一级都是急症。',
        'Potassium rising, one rung at a time: the T first, then the P and PR, then the QRS. Every rung is an emergency.',
        'El potasio sube peldaño a peldaño: primero la T, luego la P y el PR, después el QRS. Cada peldaño es una urgencia.',
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
      kind: 'film',
      title: l('低钾：另一条路', 'Hypokalaemia: the other road', 'Hipopotasemia: el otro camino'),
      view: { layout: 'strip', lead: 'V2' },
      frames: [
        {
          label: l('正常', 'Normal', 'Normal'),
          ecg: synth('normal', 1404, { rate: 60 }),
          note: l('正常的V2：T波直立，几乎看不到U波。QT约410 ms。', 'Normal V2: an upright T and hardly any U. QT about 410 ms.', 'V2 normal: T positiva y casi sin U. QT de unos 410 ms.'),
          marks: [{ auto: 't', lead: 'V2' }, { auto: 'qt', lead: 'V2' }],
        },
        {
          label: l('低钾', 'Low potassium', 'Potasio bajo'),
          ecg: synth('hypokalemia', 1404, { rate: 60 }),
          note: l('低钾：T波只剩一半高，**U波**反而比T波高。量到T波终点，QT仍约410 ms：变长的是QU。', 'Low K: the T is half as tall and the **U** now stands above it. To the end of the T the QT is still about 410 ms: what grew is the QU.', 'K bajo: la T mide la mitad y la **U** ya la supera. Hasta el final de la T, el QT sigue en unos 410 ms: lo que crece es el QU.'),
          marks: [{ auto: 't', lead: 'V2' }, { auto: 'u', lead: 'V2' }, { auto: 'qt', lead: 'V2' }],
        },
      ],
      caption: l(
        '低钾使复极变慢：T波低平、U波高大，V2–V3最清楚。同时查血镁。',
        'Low potassium slows repolarisation: a flat T and a big U, clearest in V2–V3. Check magnesium as well.',
        'El potasio bajo enlentece la repolarización: T plana y U grande, más claras en V2–V3. Comprueba también el magnesio.',
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
      play: {
        dial: 'rate',
        from: 52,
        to: 68,
        notes: [
          { min: 52, max: 58, text: l('心率慢：V2的**U波**比T波高。QT量到T波终点是410–430 ms；量到U波终点会得到570–600 ms。', 'Slow: in V2 the **U** is taller than the T. To the end of the T the QT is 410–430 ms; to the end of the U you get 570–600 ms.', 'Lenta: en V2 la **U** es más alta que la T. Hasta el final de la T el QT mide 410–430 ms; hasta el final de la U salen 570–600 ms.') },
          { min: 59, max: 68, text: l('心率加快：舒张期缩短，U波逼近下一个P波。QT仍然量到T波终点：T加U是QU，不是长QT。', 'Faster: diastole shortens and the U closes in on the next P. Still stop the QT at the end of the T: T plus U is a QU, not a long QT.', 'Más rápida: la diástole se acorta y la U se acerca a la siguiente P. Sigue cerrando el QT al final de la T: T más U es un QU, no un QT largo.') },
        ],
      },
      predict: {
        question: l('心率从52加快到68次/分，U波会怎样？', 'Speed the rate from 52 to 68/min. Where does the U wave go?', 'Sube la frecuencia de 52 a 68 lpm. ¿Qué hace la onda U?'),
        options: [
          l('逼近下一个P波', 'It closes in on the next P', 'Se acerca a la siguiente P'),
          l('融进QRS里', 'It merges into the QRS', 'Se funde con el QRS'),
          l('完全消失', 'It disappears', 'Desaparece'),
        ],
        answer: 0,
      },
      caption: l(
        '在V2上加快心率，看U波逼近下一个P波。QT用切线法量到T波终点，不要量到U波。',
        'Speed up the rate in V2 and watch the U close in on the next P. Measure the QT to the end of the T (tangent method), never to the U.',
        'Acelera la frecuencia en V2 y mira cómo la U se acerca a la siguiente P. Mide el QT hasta el final de la T (método de la tangente), nunca hasta la U.',
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
        '两份真实心电图（PTB-XL），标注都与电解质有关。先自己读：找帐篷样T、看P波是否低平、量QRS宽度，或者找ST–T–U的改变；先想好你的判断，再揭晓标签。',
        'Two real tracings (PTB-XL), both labelled as electrolyte-related. Read them yourself first: hunt the tented T, check whether the P is flattening, measure the QRS — or look for the ST–T–U pattern; commit to an answer before the reveal.',
        'Dos trazados reales (PTB-XL), ambos etiquetados como relacionados con electrolitos. Léelos tú primero: busca la T en tienda de campaña, comprueba si la P se aplana, mide el QRS o busca el patrón ST–T–U; decide tu respuesta antes de ver la etiqueta.',
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
