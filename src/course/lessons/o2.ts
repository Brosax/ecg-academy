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
      kind: 'text',
      title: l('钙管的是 ST 段', 'Calcium governs the ST segment', 'El calcio gobierna el segmento ST'),
      body: l(
        '动作电位 2 期（平台期）对应 ST 段，平台期的长短主要由钙电流决定：\n- **低钙血症**（慢性肾病、甲状旁腺或甲状腺手术后、维生素 D 缺乏、急性胰腺炎、大量输血）：ST 段延长且仍为等电位，T 波迟到但宽度正常 → **QT 延长**。除 QT 外图形可以很安静。\n- **高钙血症**（恶性肿瘤最常见，其次原发性甲状旁腺功能亢进）：ST 段缩短甚至消失，T 波几乎从 J 点直接起飞 → **QT 缩短**；重度高钙偶见类 Osborn（J）波。\n- 两种情况下 **T 波自身的宽度都大致正常**——QT 的变化由 ST 段驱动。这正是钙与钾、与药物的区别：钾改的是 T 波的形态（第 o1 课），药物改的常是 T 的宽度（第 h7 课）。',
        'Phase 2 of the action potential, the plateau, maps onto the ST segment, and plateau length is governed largely by calcium currents:\n- **Hypocalcaemia** (chronic kidney disease, post-parathyroid or post-thyroid surgery, vitamin D deficiency, acute pancreatitis, massive transfusion): a longer, still-isoelectric ST with a late but normal-width T → **long QT**. Apart from the QT the tracing can look very quiet.\n- **Hypercalcaemia** (malignancy first, primary hyperparathyroidism second): the ST shortens or disappears and the T takes off almost at the J point → **short QT**; Osborn (J)-like waves appear occasionally in severe cases.\n- In both, **the T wave itself keeps roughly its normal width** — the QT change is driven by the ST. That is the contrast with potassium, which reshapes the T (lesson o1), and with drugs, which usually widen it (lesson h7).',
        'La fase 2 del potencial de acción, la meseta, se corresponde con el segmento ST, y la duración de la meseta depende sobre todo de las corrientes de calcio:\n- **Hipocalcemia** (enfermedad renal crónica, cirugía paratiroidea o tiroidea, déficit de vitamina D, pancreatitis aguda, transfusión masiva): un ST más largo pero aún isoeléctrico, con una T tardía pero de anchura normal → **QT largo**. Salvo por el QT, el trazado puede ser muy tranquilo.\n- **Hipercalcemia** (primero las neoplasias, después el hiperparatiroidismo primario): el ST se acorta o desaparece y la T despega casi en el punto J → **QT corto**; en casos graves aparecen a veces ondas tipo Osborn (J).\n- En ambas, **la propia onda T conserva una anchura aproximadamente normal**: el cambio del QT lo impulsa el ST. Ese es el contraste con el potasio, que remodela la T (lección o1), y con los fármacos, que suelen ensancharla (lección h7).',
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
      kind: 'ecg',
      ecg: synth('hypercalcemia', 1427),
      view: STRIP,
      marks: [{ auto: 'j' }, { auto: 'qt' }],
      caption: l(
        '高钙血症：ST 段几乎不存在，T 波直接从 J 点起飞，QT 缩短（此处 QTc ≈ 335 ms）。T 的宽度仍正常——是起飞得早，不是飞得快。见于恶性肿瘤与高甲状旁腺素血症；重度时偶见类 Osborn 波。',
        'Hypercalcaemia: there is almost no ST segment, the T takes off straight from the J point and the QT is short (QTc ≈ 335 ms here). The T width is still normal — it takes off early, it does not fly faster. Seen with malignancy and hyperparathyroidism; Osborn-like waves occasionally in severe cases.',
        'Hipercalcemia: casi no hay segmento ST, la T despega directamente del punto J y el QT es corto (QTc ≈ 335 ms aquí). La anchura de la T sigue siendo normal: despega pronto, no vuela más rápido. Se ve en neoplasias e hiperparatiroidismo; a veces ondas tipo Osborn en casos graves.',
      ),
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
      kind: 'text',
      title: l('镁：看不见的电解质', 'Magnesium: the electrolyte you cannot see', 'Magnesio: el electrolito que no se ve'),
      body: l(
        '**低镁血症**在心电图上与低钾血症难以区分：T 波平坦或倒置、U 波显著（V2–V3 最清楚）、TdP 风险升高，且常与低钾同时存在（第 o1 课）。没有任何一段波形属于“镁”——镁没有自己的波。\n- 因此 **TdP 时经验性治疗**：静脉硫酸镁、纠正钾、停用延长 QT 的药物、必要时超速起搏——不必等血镁结果。\n- **高镁血症**（多为肾衰竭叠加含镁抗酸药/泻药）：窦性心动过缓、PR 延长直至 AV 传导阻滞，极高水平时 T 波尖耸；临床伴低血压与腱反射消失。',
        '**Hypomagnesaemia** is hard to separate from hypokalaemia on the ECG: flat or inverted T, prominent U (clearest in V2–V3), higher TdP risk, and it often travels with low potassium (lesson o1). No part of the trace belongs to magnesium — magnesium has no wave of its own.\n- So in **TdP you treat empirically**: IV magnesium sulphate, correct the potassium, stop QT-prolonging drugs, overdrive pacing if needed — without waiting for the serum level.\n- **Hypermagnesaemia** (usually renal failure plus magnesium-containing antacids or laxatives): sinus bradycardia, PR prolongation into AV block, peaked T at very high levels; clinically hypotension and absent tendon reflexes.',
        'La **hipomagnesemia** es difícil de separar de la hipopotasemia en el ECG: T plana o invertida, U prominente (más clara en V2–V3), mayor riesgo de TdP, y a menudo va junto con potasio bajo (lección o1). Ninguna parte del trazado pertenece al magnesio: el magnesio no tiene onda propia.\n- Por eso, en la **TdP se trata de forma empírica**: sulfato de magnesio intravenoso, corregir el potasio, retirar los fármacos que alargan el QT, estimulación rápida si hace falta, sin esperar el resultado sérico.\n- **Hipermagnesemia** (habitualmente insuficiencia renal más antiácidos o laxantes con magnesio): bradicardia sinusal, PR largo hasta bloqueo AV, T apuntada con niveles muy altos; clínicamente hipotensión y abolición de los reflejos osteotendinosos.',
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
      kind: 'text',
      title: l('长 QT 先问 ST，短 QT 想到钙与地高辛', 'A long QT: ask the ST first. A short QT: think calcium and digoxin', 'QT largo: pregunta primero al ST. QT corto: piensa en calcio y digoxina'),
      body: l(
        '看到 QT 异常，先定位是哪一段在变化：\n- **QT 长、ST 长、T 宽度正常** → 钙。**QT 长、T 变宽变形** → 药物、缺血、先天性长 QT（第 h7 课）。测量规矩不变：切线法量到 T 终点、不算 U 波、用最长导联，心率快时优先 Fridericia。\n- **QT 短**的两大鉴别是高钙血症与**洋地黄效应**：地高辛造成下斜型（鱼钩样/反钩状）ST 压低，在 R 波高的导联最清楚，伴 T 低平、QT 缩短、PR 略延长——这是药物暴露，不是中毒（第 o3 课）。勺状 ST 伴短 QT 与钙的分别，一量 QT、一看分布就清楚；不要把它报成缺血性 ST 压低。',
        'When the QT looks wrong, first locate which segment is doing the changing:\n- **Long QT with a long ST and a normal-width T** → calcium. **Long QT with a wide, distorted T** → drugs, ischaemia, congenital long QT (lesson h7). The measuring rules do not change: tangent method to the T end, U excluded, longest-QT lead, prefer Fridericia at fast rates.\n- The two big causes of a **short QT** are hypercalcaemia and **digitalis effect**: digoxin produces downsloping (“reverse-tick”, scooped) ST depression, clearest in leads with tall R waves, with a low T, a shortened QT and a mildly longer PR — drug exposure, not toxicity (lesson o3). Scooped ST with a short QT separates from calcium the moment you measure the QT and look at the distribution; do not report it as ischaemic ST depression.',
        'Cuando el QT parece anómalo, localiza primero qué segmento está cambiando:\n- **QT largo con ST largo y T de anchura normal** → calcio. **QT largo con T ancha y deformada** → fármacos, isquemia, QT largo congénito (lección h7). Las reglas de medición no cambian: método de la tangente hasta el final de la T, sin la U, en la derivación de QT más largo, y Fridericia si la frecuencia es alta.\n- Las dos grandes causas del **QT corto** son la hipercalcemia y el **efecto digitálico**: la digoxina produce un descenso del ST con pendiente descendente («en cuchara», en «gancho invertido»), más claro en derivaciones con R altas, con T baja, QT corto y PR algo más largo — exposición al fármaco, no intoxicación (lección o3). El ST en cuchara con QT corto se separa del calcio en cuanto mides el QT y miras la distribución; no lo informes como descenso isquémico del ST.',
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
