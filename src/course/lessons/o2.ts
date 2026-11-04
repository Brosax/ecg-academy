/**
 * o2 — Calcium and magnesium (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `electrolytes-drugs-misc-conditions` "Calcium disorders — QT mechanism" and
 * "QT interval" bullets and the `digitalis-effect` row (current values; the book's short QT list is outdated).
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
  id: 'o2',
  stage: 'O',
  order: 2,
  title: l('血钙与血镁异常', 'Calcium and magnesium', 'Calcio y magnesio'),
  summary: l(
    '钙决定 ST 段的长短：低钙血症把 ST 拉长而 T 波宽度不变（QT 延长），高钙血症把 ST 缩短甚至抽掉（QT 缩短）。镁在心电图上没有自己的波形——低镁像低钾，TdP 时经验性补镁。',
    'Calcium sets the length of the ST segment: hypocalcaemia stretches it with a normal-width T (long QT); hypercalcaemia shortens or removes it (short QT). Magnesium has no ECG wave of its own — hypomagnesaemia mimics hypokalaemia, and TdP is treated with empirical magnesium.',
    'El calcio fija la duración del segmento ST: la hipocalcemia lo alarga con una T de anchura normal (QT largo) y la hipercalcemia lo acorta o lo elimina (QT corto). El magnesio no tiene onda propia en el ECG: la hipomagnesemia imita a la hipopotasemia y la TdP se trata con magnesio empírico.',
  ),
  objectives: [
    l('认识低钙血症：ST 段延长、T 波宽度正常所致的 QT 延长。', 'Recognise hypocalcaemia: a long QT produced by a lengthened ST with a normal-width T.', 'Reconocer la hipocalcemia: un QT largo producido por un ST alargado con una T de anchura normal.'),
    l('认识高钙血症：ST 段缩短或缺失、T 紧接 QRS 终末、QT 缩短。', 'Recognise hypercalcaemia: a short or absent ST with the T starting at the end of the QRS and a short QT.', 'Reconocer la hipercalcemia: ST corto o ausente, con la T comenzando al final del QRS y QT corto.'),
    l('说明镁的心电图足迹（与低钾同貌）以及 TdP 时经验性补镁的理由。', 'Explain magnesium’s ECG footprint (identical to hypokalaemia) and why TdP is treated with empirical magnesium.', 'Explicar la huella electrocardiográfica del magnesio (idéntica a la hipopotasemia) y por qué en la TdP se administra magnesio empírico.'),
    l('用 QT 的方向和分布把钙的 ST 改变与地高辛的勺状 ST 压低区分开。', 'Separate calcium ST changes from digoxin’s scooped ST depression using the direction of the QT and the distribution.', 'Separar los cambios del ST por calcio del descenso «en cuchara» de la digoxina usando la dirección del QT y la distribución.'),
  ],
  minutes: 14,
  competencies: ['C10', 'C4'],
  findings: ['hypercalcemia', 'hypocalcemia', 'long-qt'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('hypocalcemia', 1421),
      view: STRIP,
      question: l(
        '甲状腺术后三天复查心电图：ST 段一段一段地拉长，T 波迟迟不起飞。哪种离子出了问题？哪个间期真正延长了？',
        'Three days after thyroid surgery, a routine ECG: the ST segment stretches on and on and the T wave is late to take off. Which ion is out of line — and which interval actually lengthens?',
        'Tres días después de una cirugía tiroidea, un ECG de control: el segmento ST se alarga y se alarga y la onda T tarda en despegar. ¿Qué ión está alterado y qué intervalo se prolonga en realidad?',
      ),
      reveal: l(
        '低钙血症。钙作用于动作电位 2 期，对应心电图上的 **ST 段**：低钙把 ST 拉成一条长长的等电位线，**T 波本身的宽度不变**，QT 的延长全部由 ST 段贡献（甲状旁腺损伤是术后常见原因）。高钙正相反：ST 缩短甚至消失，QT 变短。',
        'Hypocalcaemia. Calcium acts on phase 2 of the action potential, which is the **ST segment** on the ECG: low calcium stretches the ST into a long flat line, **the T wave keeps its normal width**, and the whole QT gain comes from the ST (parathyroid injury is a classic post-operative cause). High calcium is the mirror image: the ST shortens or vanishes and the QT becomes short.',
        'Hipocalcemia. El calcio actúa en la fase 2 del potencial de acción, que es el **segmento ST** del ECG: el calcio bajo estira el ST en una línea isoeléctrica larga, **la onda T conserva su anchura normal** y toda la ganancia del QT viene del ST (la lesión paratiroidea es una causa clásica tras la cirugía). El calcio alto es la imagen especular: el ST se acorta o desaparece y el QT se acorta.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'action-potential', params: { cell: 'ventricular' } },
      ecg: synth('normal', 1427, { rate: 75 }),
      caption: l(
        'ST段就是心室动作电位的2期（平台期）。钙决定平台期有多长：低钙把它拉长，高钙把它缩短。',
        'The ST segment is phase 2 of the ventricular action potential, the plateau. Calcium sets how long it lasts: low calcium stretches it, high calcium shortens it.',
        'El segmento ST es la fase 2 del potencial de acción ventricular, la meseta. El calcio fija cuánto dura: el calcio bajo la alarga y el alto la acorta.',
      ),
    },
    {
      kind: 'film',
      title: l('同一心率，三种血钙', 'One rate, three calcium levels', 'Una frecuencia, tres niveles de calcio'),
      view: STRIP,
      frames: [
        {
          label: l('正常', 'Normal', 'Normal'),
          ecg: synth('normal', 1427, { rate: 75 }),
          note: l('正常，75次/分：ST段很短，接着就是T波。QT约380 ms。', 'Normal at 75/min: a short ST, then the T. QT about 380 ms.', 'Normal a 75 lpm: un ST corto y luego la T. QT de unos 380 ms.'),
          marks: [{ auto: 'st' }, { auto: 'qt' }],
        },
        {
          label: l('低钙', 'Low calcium', 'Calcio bajo'),
          ecg: synth('hypocalcemia', 1427, { rate: 75 }),
          note: l('低钙：平直的ST段一直延长，T波起得晚，但T波本身没有变宽。QT约470 ms。', 'Low Ca: the flat ST runs on and the T starts late, but the T itself is no wider. QT about 470 ms.', 'Calcio bajo: el ST plano se alarga y la T empieza tarde, pero la T no es más ancha. QT de unos 470 ms.'),
          marks: [{ auto: 'st' }, { auto: 'qt' }],
        },
        {
          label: l('高钙', 'High calcium', 'Calcio alto'),
          ecg: synth('hypercalcemia', 1427, { rate: 75 }),
          note: l('高钙：几乎没有ST段，T波从J点直接升起，宽度不变。QT约310 ms。', 'High Ca: almost no ST; the T takes off from the J point, no narrower than before. QT about 310 ms.', 'Calcio alto: casi no hay ST; la T arranca desde el punto J, sin estrecharse. QT de unos 310 ms.'),
          marks: [{ auto: 'j' }, { auto: 'qt' }],
        },
      ],
      predict: {
        question: l('钙改变的是QT里的哪一段？', 'Which part of the QT does calcium change?', '¿Qué parte del QT cambia el calcio?'),
        options: [l('ST段', 'The ST segment', 'El segmento ST'), l('T波的宽度', 'The width of the T', 'La anchura de la T'), l('QRS', 'The QRS', 'El QRS')],
        answer: 0,
      },
      caption: l(
        '钙决定ST段有多长。先问“ST去哪了？”，再读QT。高钙多见于肿瘤和原发性甲旁亢。',
        'Calcium sets how long the ST lasts. Ask “where did the ST go?”, then read the QT. High calcium: think cancer and primary hyperparathyroidism.',
        'El calcio fija cuánto dura el ST. Pregunta «¿dónde está el ST?» y luego lee el QT. Calcio alto: piensa en cáncer e hiperparatiroidismo primario.',
      ),
    },
    {
      kind: 'criteria',
      title: l('钙与镁：判读卡片', 'Calcium and magnesium: reading card', 'Calcio y magnesio: tarjeta de lectura'),
      items: [
        {
          label: l('低钙血症', 'Hypocalcaemia', 'Hipocalcemia'),
          value: l('ST 段延长、等电位，T 宽度正常 → QT 延长', 'Long isoelectric ST, normal-width T → long QT', 'ST largo e isoeléctrico, T de anchura normal → QT largo'),
        },
        {
          label: l('高钙血症', 'Hypercalcaemia', 'Hipercalcemia'),
          value: l('ST 短或缺失，T 紧接 QRS 终末 → QT 缩短；重度偶见类 J 波', 'Short or absent ST, T starting at the end of the QRS → short QT; J-like waves in severe cases', 'ST corto o ausente, T que comienza al final del QRS → QT corto; ondas tipo J en casos graves'),
        },
        {
          label: l('低镁血症', 'Hypomagnesaemia', 'Hipomagnesemia'),
          value: l('与低钾同貌：T 平坦/倒置、U 波显著、TdP 风险；镁本身在 ECG 上不可见', 'Same picture as hypokalaemia: flat or inverted T, prominent U, TdP risk; magnesium itself is invisible on the ECG', 'Igual que la hipopotasemia: T plana o invertida, U prominente, riesgo de TdP; el magnesio en sí es invisible en el ECG'),
        },
        {
          label: l('高镁血症', 'Hypermagnesaemia', 'Hipermagnesemia'),
          value: l('心动过缓、PR 延长直至 AV 传导阻滞，极高水平时 T 波尖耸', 'Bradycardia, PR prolongation into AV block, peaked T at very high levels', 'Bradicardia, PR largo hasta bloqueo AV, T apuntada con niveles muy altos'),
        },
        {
          label: l('QT 测量', 'QT measurement', 'Medición del QT'),
          value: l('QRS 最早起点到 T 最晚终点（切线法），不含 U 波，选 QT 最长的导联（常为 II 或 V5）', 'From the earliest QRS onset to the latest T end (tangent method), U wave excluded, in the lead with the longest QT (often II or V5)', 'Desde el inicio más precoz del QRS hasta el final más tardío de la T (método de la tangente), sin la U, en la derivación de QT más largo (a menudo II o V5)'),
        },
        {
          label: l('TdP 高危', 'High TdP risk', 'Riesgo alto de TdP'),
          value: l('QTc > 500 ms 或较基线增加 > 60 ms', 'QTc > 500 ms or a rise > 60 ms from baseline', 'QTc > 500 ms o un aumento > 60 ms respecto al basal'),
        },
      ],
      source:
        'Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250; Drew BJ et al. Prevention of torsade de pointes in hospital settings: AHA/ACCF scientific statement. Circulation 2010;121:1047-1060',
    },
    {
      kind: 'worked',
      title: l('量一量：QT 里 ST 占多少', 'Measure it: how much of the QT is ST', 'Mídelo: cuánto del QT es ST'),
      ecg: synth('hypocalcemia', 1424),
      view: STRIP,
      steps: [
        {
          title: l('找到 J 点', 'Find the J point', 'Localiza el punto J'),
          body: l('QRS 结束、ST 段开始的地方。从这里起跑道一直向右延伸。', 'Where the QRS ends and the ST begins. From here the runway runs on and on to the right.', 'Donde termina el QRS y empieza el ST. Desde aquí la pista se extiende hacia la derecha.'),
          marks: [{ auto: 'j' }],
          highlightLeads: ['II'],
        },
        {
          title: l('量 ST 段', 'Measure the ST segment', 'Mide el segmento ST'),
          body: l(
            'J 点到 T 波起点之间是一段长长的等电位线——低钙拉长的正是这一段，而不是别处。',
            'Between the J point and the start of the T lies a long isoelectric stretch — this, and nothing else, is what low calcium lengthens.',
            'Entre el punto J y el inicio de la T hay un tramo isoeléctrico largo: esto, y solo esto, es lo que alarga el calcio bajo.',
          ),
          marks: [{ auto: 'st' }],
        },
        {
          title: l('看 T 波的宽度', 'Check the width of the T', 'Comprueba la anchura de la T'),
          body: l(
            'T 波本身形态、宽度均正常。变宽的从来不是 T，而是它前面的跑道。',
            'The T wave itself is normal in shape and width. The T never widened — the runway in front of it did.',
            'La propia onda T es normal en forma y anchura. La T nunca se ensanchó: lo hizo la pista que tiene delante.',
          ),
          marks: [{ auto: 't' }],
        },
        {
          title: l('完整的 QT', 'The full QT', 'El QT completo'),
          body: l(
            'QRS 起点到 T 终点 = QT，此处 QTc ≈ 500 ms。把低钙列入长 QT 的鉴别：肾病、甲状旁腺问题、维生素 D 缺乏。',
            'QRS onset to T end = QT; the QTc here is ≈ 500 ms. Put hypocalcaemia on the long-QT differential: kidney disease, parathyroid problems, vitamin D deficiency.',
            'Inicio del QRS a final de la T = QT; el QTc aquí es ≈ 500 ms. Incluye la hipocalcemia en el diferencial del QT largo: enfermedad renal, problemas paratiroideos, déficit de vitamina D.',
          ),
          marks: [{ auto: 'qt' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('ST 去哪了？', 'Where did the ST go?', '¿Dónde está el ST?'),
      view: STRIP,
      left: {
        ecg: synth('hypocalcemia', 1428, { rate: 75 }),
        caption: l('低钙血症，II 导联', 'Hypocalcaemia, lead II', 'Hipocalcemia, derivación II'),
        marks: [{ auto: 'st' }, { auto: 'qt' }],
      },
      right: {
        ecg: synth('hypercalcemia', 1429, { rate: 75 }),
        caption: l('高钙血症，II 导联', 'Hypercalcaemia, lead II', 'Hipercalcemia, derivación II'),
        marks: [{ auto: 'j' }, { auto: 't' }],
      },
      point: l(
        '同为窦性、同为 75 次/分。左边：长长的等电位 ST 把 T 推迟，QT 延长——低钙。右边：ST 被抽走，T 紧贴 QRS 终末，QT 缩短——高钙。钙决定 T 波的起飞时机；问一句“ST 去哪了”，两者立刻分开。',
        'Both sinus, both 75/min. Left: a long isoelectric ST delays the T and lengthens the QT — low calcium. Right: the ST has been taken away, the T sits against the end of the QRS and the QT is short — high calcium. Calcium sets the T’s take-off time; ask “where did the ST go?” and the two separate at once.',
        'Ambos sinusales, ambos a 75 lpm. Izquierda: un ST isoeléctrico largo retrasa la T y alarga el QT — calcio bajo. Derecha: el ST se ha retirado, la T se pega al final del QRS y el QT es corto — calcio alto. El calcio fija el momento de despegue de la T; pregunta «¿dónde está el ST?» y los dos se separan al instante.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('hypokalemia', 1430),
      view: { layout: 'strip', lead: 'V2' },
      marks: [{ auto: 't' }, { auto: 'u' }],
      caption: l(
        'V2 导联：T 波低平，U 波比 T 还高。低镁血症的图形与此无法区分——这就是“看不见的电解质”。当 TdP 患者出现这样的 T–U 时，钾、镁一起查、一起补。',
        'Lead V2: a flat T wave and a U taller than the T. Hypomagnesaemia looks exactly like this — hence “the electrolyte you cannot see”. When a TdP patient shows a T–U like this, check and replace potassium and magnesium together.',
        'Derivación V2: T plana y una U más alta que la T. La hipomagnesemia es idéntica a esto: de ahí «el electrolito que no se ve». Si un paciente con TdP muestra esta T–U, comprobar y reponer potasio y magnesio juntos.',
      ),
    },
    {
      kind: 'film',
      title: l('QT变了：是哪一段在变？', 'The QT changed: which part moved?', 'El QT cambió: ¿qué parte se movió?'),
      view: { layout: 'strip', lead: 'V5' },
      frames: [
        {
          label: l('低钙', 'Low calcium', 'Calcio bajo'),
          ecg: synth('hypocalcemia', 1427, { rate: 75 }),
          note: l('QT长，多出来的都是ST段；T波本身不宽：想到钙。', 'Long QT, and the extra length is all ST; the T itself is not wide. Think calcium.', 'QT largo, y lo que sobra es todo ST; la T en sí no es ancha. Piensa en el calcio.'),
          marks: [{ auto: 'st' }, { auto: 'qt' }],
        },
        {
          label: l('药物', 'Drug', 'Fármaco'),
          ecg: synth('long-qt', 1427, { rate: 75 }, 'drug'),
          note: l('QT同样长（约480 ms），但这里T波低而宽：想到药物、缺血或先天性长QT（第h7课）。', 'Just as long (QT about 480 ms), but here the T is low and wide: think drugs, ischaemia or congenital long QT (lesson h7).', 'Igual de largo (QT de unos 480 ms), pero aquí la T es baja y ancha: piensa en fármacos, isquemia o QT largo congénito (lección h7).'),
          marks: [{ auto: 't' }, { auto: 'qt' }],
        },
        {
          label: l('高钙', 'High calcium', 'Calcio alto'),
          ecg: synth('hypercalcemia', 1427, { rate: 75 }),
          note: l('QT短，ST段没了：T波从J点开始。想到高钙。', 'Short QT and the ST is gone: the T starts at the J point. Think high calcium.', 'QT corto y sin ST: la T empieza en el punto J. Piensa en calcio alto.'),
          marks: [{ auto: 'j' }, { auto: 'qt' }],
        },
        {
          label: l('地高辛', 'Digoxin', 'Digoxina'),
          ecg: synth('digoxin-effect', 1427, { rate: 70 }),
          note: l('QT也缩短，但V5的ST像勺子一样凹到基线以下，T波低，PR 190 ms：地高辛效应（第o3课）。', 'A shorter QT too, but the ST in V5 sags below the line like a scoop, with a low T and a PR of 190 ms: digoxin effect (lesson o3).', 'También un QT más corto, pero el ST de V5 se hunde bajo la línea como una cuchara, con T baja y PR de 190 ms: efecto digitálico (lección o3).'),
          marks: [{ auto: 'st60' }, { auto: 'pr' }, { auto: 'qt' }],
        },
      ],
      predict: {
        question: l('两个长QT：一个长在ST段，一个长在T波。哪个指向钙？', 'Two long QTs: one from a long ST, one from a wide T. Which one points to calcium?', 'Dos QT largos: uno por un ST largo y otro por una T ancha. ¿Cuál apunta al calcio?'),
        options: [l('ST段长的那个', 'The long ST', 'El del ST largo'), l('T波宽的那个', 'The wide T', 'El de la T ancha')],
        answer: 0,
      },
      caption: l(
        '先找出是哪一段变了：ST段（钙）还是T波（药物、先天性）。QT短：想到高钙或地高辛。',
        'Before naming a cause, find which part moved: the ST (calcium) or the T (drugs, congenital). A short QT: high calcium or digoxin.',
        'Antes de poner una causa, busca qué parte se movió: el ST (calcio) o la T (fármacos, congénito). QT corto: calcio alto o digoxina.',
      ),
    },
    { kind: 'check', item: { family: 'metabolic', seed: 1 } },
    { kind: 'check', item: { family: 'metabolic', seed: 4 } },
    { kind: 'check', item: { family: 'measure-qt', seed: 2 } },
    { kind: 'drill', families: ['metabolic', 'measure-qt'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [17648, 19926, 15985],
      caption: l(
        '三份真实心电图：第一份来自一位电解质异常的患者，后两份是**洋地黄效应**——地高辛的勺状 ST 压低不要与钙的 ST 改变混淆。先读图并想好你的判断（QT 长还是短？ST 是等电位延长、缺失，还是下斜型压低？），再揭晓。',
        'Three real tracings: the first comes from a patient with an electrolyte disorder, the other two show **digitalis effect** — digoxin’s scooped ST must not be confused with calcium ST changes. Read and commit first (is the QT long or short? Is the ST a long flat line, absent, or downsloping and depressed?), then reveal.',
        'Tres trazados reales: el primero procede de un paciente con un trastorno electrolítico y los otros dos muestran **efecto digitálico**; el descenso del ST «en cuchara» de la digoxina no debe confundirse con los cambios del ST por calcio. Lee y comprométete primero (¿el QT es largo o corto? ¿El ST es una línea llana larga, ausente o descendente y deprimido?) y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'QT 延长一律归咎于 T 波变宽，其实低钙延长的 ST 段——先看 T 起飞前的那条跑道。',
          'Blaming every long QT on a wide T when hypocalcaemia is lengthening the ST — look at the runway before the T takes off.',
          'Atribuir todo QT largo a una T ancha cuando la hipocalcemia alarga el ST: mira la pista antes de que despegue la T.',
        ),
        l(
          '把地高辛的鱼钩样 ST 压低报成缺血性压低——QT 是短的，且分布在高 R 导联。',
          'Reporting digoxin’s reverse-tick ST depression as ischaemic — the QT is short and it sits in the tall-R leads.',
          'Informar el descenso del ST «en gancho» de la digoxina como isquémico: el QT es corto y ocupa las derivaciones con R altas.',
        ),
        l(
          '高钙的短 QT 伴尖 T 被叫成“高钾”——高钾的 T 高尖、基底窄（V2–V4）且 P 波常减小；高钙的 T 宽度正常、ST 几乎消失。',
          'Calling hypercalcaemia’s short QT with a peaked T “hyperkalaemia” — potassium’s T is tall and narrow-based (V2–V4) with a shrinking P; calcium’s T is normal-width with almost no ST.',
          'Llamar «hiperpotasemia» al QT corto con T apuntada de la hipercalcemia: la T del potasio es alta y de base estrecha (V2–V4) con una P que se borra; la T del calcio es de anchura normal y casi sin ST.',
        ),
        l(
          'TdP 时从不考虑镁——镁在心电图上没有自己的波，经验性补镁不必等化验。',
          'Never considering magnesium in TdP — magnesium has no wave of its own on the ECG, and empirical replacement does not wait for the lab.',
          'No considerar nunca el magnesio en la TdP: el magnesio no tiene onda propia en el ECG y la reposición empírica no espera al laboratorio.',
        ),
        l(
          '心率快时仍用 Bazett 校正 QT：它会高估 QTc，改用 Fridericia。',
          'Correcting a fast-rate QT with Bazett: it overestimates the QTc; use Fridericia.',
          'Corregir con Bazett un QT a frecuencia alta: sobrestima el QTc; usa Fridericia.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '钙决定 ST 段的长短：低钙 = ST 延长、T 宽度正常 → QT 长；高钙 = ST 短或缺失 → QT 短。',
          'Calcium sets the length of the ST: hypocalcaemia = long ST with a normal-width T → long QT; hypercalcaemia = short or absent ST → short QT.',
          'El calcio fija la duración del ST: hipocalcemia = ST largo con T de anchura normal → QT largo; hipercalcemia = ST corto o ausente → QT corto.',
        ),
        l(
          '分不清时问“ST 去哪了”，再看 QT 往哪个方向走。',
          'When unsure, ask “where did the ST go?” and check which way the QT moved.',
          'Si dudas, pregunta «¿dónde está el ST?» y mira hacia dónde se movió el QT.',
        ),
        l(
          '镁在心电图上不可见：低镁与低钾同貌（T 平、U 高、TdP），TdP 时钾镁一起经验性纠正。',
          'Magnesium is invisible on the ECG: hypomagnesaemia looks like hypokalaemia (flat T, tall U, TdP); in TdP correct potassium and magnesium empirically together.',
          'El magnesio es invisible en el ECG: la hipomagnesemia se parece a la hipopotasemia (T plana, U alta, TdP); en la TdP corrige potasio y magnesio de forma empírica.',
        ),
        l(
          '地高辛的勺状 ST 压低伴 QT 缩短、PR 略长——是药物效应，不是缺血，也不是中毒（第 o3 课）。',
          'Digoxin’s scooped ST comes with a short QT and a mildly long PR — drug effect, not ischaemia and not toxicity (lesson o3).',
          'El ST «en cuchara» de la digoxina viene con QT corto y PR algo largo: efecto del fármaco, no isquemia ni intoxicación (lección o3).',
        ),
        l(
          'QT/QTc 的测量规矩照旧：最长导联、切线法、不含 U；QTc > 500 ms 为 TdP 高危（第 h7 课）。',
          'The QT/QTc rules stand: longest-QT lead, tangent method, U excluded; QTc > 500 ms is high TdP risk (lesson h7).',
          'Las reglas del QT/QTC siguen: derivación de QT más largo, método de la tangente, sin la U; QTc > 500 ms es riesgo alto de TdP (lección h7).',
        ),
      ],
    },
  ],
  sources: [
    'Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    'Drew BJ et al. Prevention of torsade de pointes in hospital settings: AHA/ACCF scientific statement. Circulation 2010;121:1047-1060',
    'Castellano et al. 2004',
  ],
};

export default lesson;
