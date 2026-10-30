/**
 * S4 — Intervals: PR, QRS, QT (tangent method), QTc formulas and limits (docs/PLAN.md §3, stage S).
 * Criteria: docs/curriculum/criteria.md `pr-normal`, `pr-limits-age-rate`, `qrs-duration-normal`, `qtc-bazett`,
 * `qt-max-table` (current values: sex-specific QTc limits, Fridericia/Framingham over Bazett), "Interval measurement —
 * global measurement", "QT interval — measurement technique", "Drug-induced QT prolongation".
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
/** the hook's fast heart: QT ≈ 325 ms, QTc ≈ 478 ms by Bazett and ≈ 420 ms by Fridericia */
const FAST = synth('sinus-tachycardia', 401, { rate: 130, qtc: 420 });
/** the same Fridericia QTc at 45/min: QT ≈ 462 ms, Bazett ≈ 400 ms */
const SLOW = synth('sinus-bradycardia', 402, { rate: 45, qtc: 420 });

const lesson: Lesson = {
  id: 's4',
  stage: 'S',
  order: 4,
  title: l('间期：PR、QRS、QT（切线法）、QTc 公式与界值', 'Intervals: PR, QRS, QT (tangent method), QTc formulas and limits', 'Intervalos: PR, QRS, QT (método de la tangente), fórmulas y límites del QTc'),
  summary: l(
    '准确测量 PR、QRS 和 QT，用切线法确定 T 波终点，用 Fridericia 或线性公式校正 QT，并按性别使用界值。',
    'Measure PR, QRS and QT accurately, find the end of the T wave with the tangent method, correct the QT with Fridericia or a linear formula, and apply sex-specific limits.',
    'Mide con exactitud el PR, el QRS y el QT, localiza el final de la T con el método de la tangente, corrige el QT con Fridericia o una fórmula lineal y aplica límites según el sexo.',
  ),
  objectives: [
    l('测量 PR、QRS 误差在 ±20 ms 内，QT 在 ±30 ms 内。', 'Measure PR and QRS within ±20 ms and QT within ±30 ms.', 'Medir el PR y el QRS con un error de ±20 ms y el QT de ±30 ms.'),
    l('用切线法确定 T 波终点，不把 U 波算进去。', 'Find the end of the T wave by the tangent method, leaving out the U wave.', 'Localizar el final de la T por el método de la tangente, sin incluir la onda U.'),
    l('选择合适的 QTc 公式，并使用按性别区分的界值。', 'Choose a suitable QTc formula and apply the sex-specific limits.', 'Elegir una fórmula de QTc adecuada y aplicar los límites según el sexo.'),
  ],
  minutes: 20,
  competencies: ['C4'],
  findings: ['av-block-1', 'long-qt', 'short-pr'],
  blocks: [
    {
      kind: 'hook',
      ecg: FAST,
      question: l(
        '一位 30 岁女性，发热，心率约 130 次/分。用 Bazett 公式算出的 QTc 约 478 ms。她的 QT 延长吗？',
        'A 30-year-old woman with fever, heart rate about 130/min. Bazett’s formula gives a QTc of about 478 ms. Is her QT prolonged?',
        'Mujer de 30 años con fiebre y frecuencia de unos 130 lpm. La fórmula de Bazett da un QTc de unos 478 ms. ¿Tiene el QT prolongado?',
      ),
      reveal: l(
        '很可能没有。QT 本身约 325 ms。心率快时 **Bazett 公式过度校正**：RR = 0.46 s 时 QT/√RR ≈ 478 ms。Fridericia 公式（QT/∛RR）≈ 420 ms，低于女性 460 ms 的界值。心率远离 60 次/分时，用 Fridericia 或线性公式（Framingham、Hodges）。',
        'Probably not. The QT itself is about 325 ms. At fast rates **Bazett over-corrects**: with RR = 0.46 s, QT/√RR ≈ 478 ms. Fridericia (QT/∛RR) gives about 420 ms, below the 460-ms limit for women. When the rate is far from 60/min, use Fridericia or a linear formula (Framingham, Hodges).',
        'Probablemente no. El QT en sí mide unos 325 ms. Con frecuencias rápidas **Bazett sobrecorrige**: con RR = 0,46 s, QT/√RR ≈ 478 ms. Fridericia (QT/∛RR) da unos 420 ms, por debajo del límite de 460 ms en mujeres. Cuando la frecuencia está lejos de 60 lpm, usa Fridericia o una fórmula lineal (Framingham, Hodges).',
      ),
    },
    {
      kind: 'text',
      title: l('间期从哪里量到哪里', 'Where intervals start and end', 'Dónde empiezan y terminan los intervalos'),
      body: l(
        '- **PR 间期**：P 波起点 → QRS 起点（q 或 R 波）。\n- **QRS 时限**：QRS 起点 → J 点（QRS 结束、ST 段开始处）。\n- **QT 间期**：QRS 起点 → T 波终点。\n在间期最长的导联上测量；更好的做法是从所有同步导联中最早的起点量到最晚的终点。心电图机就是这样“整体测量”的，所以机器值常比单导联手工测量略长。',
        '- **PR interval**: start of the P wave → start of the QRS (q or R).\n- **QRS duration**: start of the QRS → J point, where the QRS ends and the ST begins.\n- **QT interval**: start of the QRS → end of the T wave.\nMeasure in the lead where the interval is longest; better still, from the earliest onset in any lead to the latest offset in any lead. Machines measure globally across simultaneous leads, so their values are often a little longer than a single-lead hand measurement.',
        '- **Intervalo PR**: inicio de la onda P → inicio del QRS (q o R).\n- **Duración del QRS**: inicio del QRS → punto J, donde termina el QRS y empieza el ST.\n- **Intervalo QT**: inicio del QRS → final de la onda T.\nMide en la derivación donde el intervalo es más largo; mejor aún, desde el inicio más precoz en cualquier derivación hasta el final más tardío. Los equipos miden de forma global en derivaciones simultáneas, por eso sus valores suelen ser algo más largos que una medición manual en una sola derivación.',
      ),
    },
    {
      kind: 'worked',
      title: l('PR 与 QRS，一步步测量', 'PR and QRS, step by step', 'PR y QRS, paso a paso'),
      ecg: synth('normal', 402, { rate: 70, pr: 180, qrs: 95 }),
      view: STRIP,
      steps: [
        {
          title: l('P 波起点', 'Start of the P wave', 'Inicio de la onda P'),
          body: l('找到 P 波离开基线的第一个偏转，而不是 P 波的顶点。', 'Find where the P first leaves the baseline, not its peak.', 'Busca dónde se separa la P de la línea de base por primera vez, no su pico.'),
          marks: [{ auto: 'p' }],
        },
        {
          title: l('PR 间期', 'PR interval', 'Intervalo PR'),
          body: l(
            '量到 QRS 的第一个偏转（不论是 q 还是 R）：约 4.5 个小格 = **180 ms**。正常（≤ 200 ms）。',
            'Measure to the first deflection of the QRS, whether it is a q or an R: about 4.5 small squares = **180 ms**. Normal (≤ 200 ms).',
            'Mide hasta la primera deflexión del QRS, sea q o R: unos 4,5 cuadros pequeños = **180 ms**. Normal (≤ 200 ms).',
          ),
          marks: [{ auto: 'pr' }],
        },
        {
          title: l('PR 段不是 PR 间期', 'PR segment is not PR interval', 'El segmento PR no es el intervalo PR'),
          body: l(
            'P 波结束到 QRS 之间的平段是 PR 段。它是测量 ST 偏移的基线（第 S6 课），而不是 PR 间期。',
            'The flat stretch from the end of the P to the QRS is the PR segment. It is the baseline for ST measurement (lesson S6), not the PR interval.',
            'El tramo plano entre el final de la P y el QRS es el segmento PR. Es la línea de base para medir el ST (lección S6), no el intervalo PR.',
          ),
          marks: [{ auto: 'pr-segment' }],
        },
        {
          title: l('QRS 时限', 'QRS duration', 'Duración del QRS'),
          body: l(
            'QRS 起点到 J 点：约 2.5 个小格 ≈ **95 ms**，窄 QRS。如果某个导联的起点或终点落在等电位线上，就换一个导联：取最宽的 QRS。',
            'From QRS onset to the J point: about 2.5 small squares ≈ **95 ms**, narrow. If the start or end of the QRS is isoelectric in one lead, check another: take the widest QRS.',
            'Del inicio del QRS al punto J: unos 2,5 cuadros pequeños ≈ **95 ms**, estrecho. Si el inicio o el final del QRS es isoeléctrico en una derivación, mira otra: toma el QRS más ancho.',
          ),
          marks: [{ auto: 'qrs' }, { auto: 'j' }],
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'normal',
      seed: 403,
      dials: [{ id: 'pr' }, { id: 'qrs' }],
      view: { layout: 'strip', lead: 'II', calipers: true },
      marks: [{ auto: 'pr' }, { auto: 'qrs' }],
      caption: l(
        '随意设置 PR 和 QRS，用分规测量，再和读数比较。反复练习，直到误差在 20 ms（半个小格）以内。',
        'Set any PR and QRS, measure them with the calipers, then compare with the read-out. Practise until you are within 20 ms (half a small square).',
        'Elige un PR y un QRS cualesquiera, mídelos con el compás y compáralos con la lectura. Practica hasta que el error sea < 20 ms (medio cuadro pequeño).',
      ),
    },
    {
      kind: 'worked',
      title: l('用切线法测 QT', 'The QT by the tangent method', 'El QT por el método de la tangente'),
      ecg: synth('normal', 404, { rate: 60, qtc: 420 }),
      view: STRIP,
      steps: [
        {
          title: l('选导联', 'Choose the lead', 'Elige la derivación'),
          body: l('找 QT 最长的导联，通常是 II 或 V2–V5。', 'Look for the lead with the longest QT, often II or V2–V5.', 'Busca la derivación con el QT más largo, a menudo II o V2–V5.'),
          highlightLeads: ['II', 'V2', 'V3', 'V5'],
          view: { layout: '3x4+1' },
        },
        {
          title: l('找 T 波顶点和最陡的下降支', 'Find the T peak and its steepest downslope', 'Busca el pico de la T y su pendiente descendente más pronunciada'),
          body: l('T 波终点就在下降支上，所以先看下降支哪一段最陡。', 'The end of the T lies on its downslope, so first see where that slope is steepest.', 'El final de la T está en su rama descendente; mira primero dónde es más pronunciada.'),
          marks: [{ auto: 't' }],
        },
        {
          title: l('画切线', 'Draw the tangent', 'Traza la tangente'),
          body: l(
            '沿 T 波下降支最陡的部分画一条直线，它与基线（TP 段）的交点就是 T 波终点。这样可以避开缓慢的拖尾和 U 波。',
            'Draw a line along the steepest part of the T downslope. Where it crosses the baseline (the TP segment) is the end of the T wave. This ignores the slow tail and any U wave.',
            'Traza una recta sobre la parte más pronunciada de la rama descendente de la T. Donde corta la línea de base (segmento TP) está el final de la onda T. Así se evitan la cola lenta y la onda U.',
          ),
          marks: [{ auto: 't' }, { auto: 'qt' }],
        },
        {
          title: l('量 QT', 'Measure the QT', 'Mide el QT'),
          body: l(
            '从 QRS 起点到这个交点：约 10.5 个小格 ≈ **420 ms**。心率 60 次/分时 RR = 1 s，所有公式算出的 QTc 都等于 QT：420 ms，正常。',
            'From QRS onset to that crossing: about 10.5 small squares ≈ **420 ms**. At 60/min the RR is 1 s, so every formula gives QTc = QT = 420 ms: normal.',
            'Del inicio del QRS a ese cruce: unos 10,5 cuadros pequeños ≈ **420 ms**. A 60 lpm el RR es 1 s, así que todas las fórmulas dan QTc = QT = 420 ms: normal.',
          ),
          marks: [{ auto: 'qt' }, { auto: 'rr' }],
        },
      ],
    },
    {
      kind: 'text',
      title: l('按心率校正 QT', 'Correcting the QT for rate', 'Corregir el QT por la frecuencia'),
      body: l(
        '心率越快 QT 越短，所以要把 QT 校正到 60 次/分（RR = 1 s）：\n- **Bazett 公式**：QTc = QT ÷ √RR——心率快时过度校正，心率慢时校正不足\n- **Fridericia 公式**：QTc = QT ÷ ∛RR——在各种心率下都更稳定\n- **Framingham 公式**：QTc = QT + 154 × (1 − RR)\n- **Hodges 公式**：QTc = QT + 1.75 × (心率 − 60)\nQT 用 ms，RR 用秒。尤其在 60–90 次/分以外，优先用 Fridericia 或线性公式。QRS ≥ 120 ms 时改用 JT 间期或经 QRS 校正的 QT。',
        'The QT shortens as the rate rises, so it is corrected to a rate of 60/min (RR = 1 s):\n- **Bazett**: QTc = QT ÷ √RR. It over-corrects at fast rates and under-corrects at slow ones.\n- **Fridericia**: QTc = QT ÷ ∛RR. Steadier across rates.\n- **Framingham**: QTc = QT + 154 × (1 − RR)\n- **Hodges**: QTc = QT + 1.75 × (rate − 60)\nQT in ms, RR in seconds. Prefer Fridericia or a linear formula, especially outside 60–90/min. With a QRS ≥ 120 ms, use the JT interval or a QRS-adjusted QT.',
        'El QT se acorta al subir la frecuencia, por eso se corrige a 60 lpm (RR = 1 s):\n- **Bazett**: QTc = QT ÷ √RR. Sobrecorrige con frecuencias rápidas e infracorrige con las lentas.\n- **Fridericia**: QTc = QT ÷ ∛RR. Más estable en todo el rango.\n- **Framingham**: QTc = QT + 154 × (1 − RR)\n- **Hodges**: QTc = QT + 1,75 × (frecuencia − 60)\nQT en ms y RR en segundos. Prefiere Fridericia o una fórmula lineal, sobre todo fuera de 60–90 lpm. Con un QRS ≥ 120 ms, usa el intervalo JT o un QT ajustado por el QRS.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'qtc-calculator', params: {} },
      caption: l(
        '输入开头病例的数值：QT 325 ms、RR 460 ms。再试 QT 462 ms、RR 1330 ms（45 次/分）。看 Bazett 在两端如何偏离其他公式。',
        'Enter the hook’s values: QT 325 ms, RR 460 ms. Then try QT 462 ms, RR 1330 ms (45/min). Watch Bazett drift away from the other formulas at both ends.',
        'Introduce los valores del caso inicial: QT 325 ms, RR 460 ms. Después prueba QT 462 ms, RR 1330 ms (45 lpm). Observa cómo Bazett se separa de las demás fórmulas en ambos extremos.',
      ),
    },
    {
      kind: 'live',
      scenario: 'normal',
      seed: 405,
      dials: [{ id: 'rate' }, { id: 'qtc' }],
      view: STRIP,
      marks: [{ auto: 'qt' }, { auto: 'rr' }],
      caption: l(
        '提高心率：纸上的 QT 变短，而 QTc 读数停留在你设定的值——这正是校正要还原的东西。',
        'Raise the rate: the QT on the paper shortens while the QTc read-out stays where you set it. That is exactly what the correction undoes.',
        'Sube la frecuencia: el QT en el papel se acorta mientras la lectura del QTc se queda donde la pusiste. Eso es justo lo que deshace la corrección.',
      ),
    },
    {
      kind: 'criteria',
      title: l('成人间期界值', 'Adult interval limits', 'Límites de los intervalos en el adulto'),
      items: [
        {
          label: l('PR 间期', 'PR interval', 'Intervalo PR'),
          value: l('120–200 ms；> 200 ms 为一度房室传导阻滞；< 120 ms 为短 PR（找 δ 波）', '120–200 ms; > 200 ms first-degree AV block; < 120 ms short PR (look for a delta wave)', '120–200 ms; > 200 ms bloqueo AV de primer grado; < 120 ms PR corto (busca una onda delta)'),
        },
        {
          label: l('QRS 时限', 'QRS duration', 'Duración del QRS'),
          value: l('< 110 ms 正常；110–119 ms 不完全性束支阻滞或非特异性室内传导延迟；≥ 120 ms 完全性束支阻滞/宽 QRS', '< 110 ms normal; 110–119 ms incomplete bundle-branch block or non-specific intraventricular conduction delay; ≥ 120 ms complete block / wide QRS', '< 110 ms normal; 110–119 ms bloqueo de rama incompleto o trastorno inespecífico de la conducción intraventricular; ≥ 120 ms bloqueo completo / QRS ancho'),
        },
        { label: l('QTc 延长', 'Prolonged QTc', 'QTc prolongado'), value: l('男性 ≥ 450 ms，女性 ≥ 460 ms', '≥ 450 ms in men, ≥ 460 ms in women', '≥ 450 ms en varones, ≥ 460 ms en mujeres') },
        {
          label: l('QTc 高危', 'High-risk QTc', 'QTc de alto riesgo'),
          value: l('> 500 ms，或用药后升高 > 60 ms（尖端扭转型室速风险）', '> 500 ms, or a rise of > 60 ms on a drug (torsades de pointes risk)', '> 500 ms, o un aumento > 60 ms con un fármaco (riesgo de torsade de pointes)'),
        },
        { label: l('QTc 缩短', 'Short QTc', 'QTc corto'), value: l('≤ 390 ms（短 QT 综合征需 ≤ 360 ms 并有其他依据）', '≤ 390 ms (short QT syndrome needs ≤ 360 ms plus supporting features)', '≤ 390 ms (el síndrome de QT corto exige ≤ 360 ms y otros datos)') },
        { label: l('儿童', 'Children', 'Niños'), value: l('PR、QRS 更短：用年龄别界值', 'Shorter PR and QRS: use age-specific limits', 'PR y QRS más cortos: usa límites por edad') },
      ],
      source: 'Kusumoto FM et al. Circulation 2019;140:e382 (PR); Surawicz B et al. Circulation 2009;119:e235 (Part III, QRS); Rautaharju PM et al. Circulation 2009;119:e241 (Part IV, QT); Drew BJ et al. Circulation 2010;121:1047; Zeppenfeld K et al. Eur Heart J 2022;43:3997',
    },
    {
      kind: 'contrast',
      title: l('同一个 QTc，两种心率', 'One QTc, two rates', 'Un mismo QTc, dos frecuencias'),
      view: STRIP,
      left: { ecg: SLOW, caption: l('约 45 次/分', 'About 45/min', 'Unos 45 lpm'), marks: [{ auto: 'qt' }, { auto: 'rr' }] },
      right: { ecg: FAST, caption: l('约 130 次/分', 'About 130/min', 'Unos 130 lpm'), marks: [{ auto: 'qt' }, { auto: 'rr' }] },
      point: l(
        '两者的 Fridericia QTc 都约 420 ms。Bazett 给 A 约 400 ms，给 B 约 478 ms。45 次/分时 462 ms 的 QT 是正常的，130 次/分时 325 ms 的 QT 也是正常的。心率在两端时，用 Fridericia 或 Framingham。',
        'Both have a Fridericia QTc of about 420 ms. Bazett gives about 400 ms for A and about 478 ms for B. A QT of 462 ms at 45/min is normal, and so is a QT of 325 ms at 130/min. At both ends of the rate range, use Fridericia or Framingham.',
        'Ambos tienen un QTc de Fridericia de unos 420 ms. Bazett da unos 400 ms en A y unos 478 ms en B. Un QT de 462 ms a 45 lpm es normal, y también uno de 325 ms a 130 lpm. En ambos extremos de frecuencia, usa Fridericia o Framingham.',
      ),
    },
    { kind: 'check', item: { family: 'measure-pr', seed: 8 } },
    { kind: 'check', item: { family: 'measure-qrs', seed: 4 } },
    { kind: 'check', item: { family: 'measure-qt', seed: 3 } },
    { kind: 'check', item: { family: 'qtc', seed: 15 } },
    { kind: 'drill', families: ['measure-pr', 'measure-qrs', 'measure-qt', 'qtc'], count: 8, passScore: 0.8 },
    {
      kind: 'real',
      ids: [1101, 5199, 11916],
      caption: l(
        '自己测量 PR、QRS 和 QT，用 Fridericia（对照 Bazett）计算 QTc，再打开完整病例，与机器测量值比较。有一份正好落在一个上限上——它异常吗？另一份标注为“长 QT”：心率约 95 次/分时，用 Fridericia 计算这个标注还成立吗？',
        'Measure PR, QRS and QT yourself and compute the QTc with Fridericia (and Bazett for comparison). Then open the full case and compare with the machine’s measurements. One case sits exactly on an upper limit: is it abnormal? Another carries the label “long QT”: at about 95/min, does the label still hold with Fridericia?',
        'Mide tú mismo el PR, el QRS y el QT y calcula el QTc con Fridericia (y con Bazett para comparar). Después abre el caso completo y compáralo con las mediciones del equipo. Uno de ellos está justo en un límite superior: ¿es anormal? Otro lleva la etiqueta “QT largo”: a unos 95 lpm, ¿se mantiene la etiqueta con Fridericia?',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('把 PR 段当成 PR 间期来测。', 'Measuring the PR segment instead of the PR interval.', 'Medir el segmento PR en lugar del intervalo PR.'),
        l('在 QRS 起点或终点等电位的导联上测量，结果偏短：取最宽的导联。', 'Measuring the QRS in a lead where its start or end is isoelectric, so it looks shorter: take the widest lead.', 'Medir el QRS en una derivación donde su inicio o su final son isoeléctricos, por lo que parece más corto: toma la más ancha.'),
        l('把 U 波算进 QT。', 'Including the U wave in the QT.', 'Incluir la onda U en el QT.'),
        l('心率 120 次/分时用 Bazett，把正常 QT 叫作“延长”（或在 45 次/分时漏掉真正的长 QT）。', 'Using Bazett at 120/min and calling a normal QT “long”, or at 45/min and missing a long one.', 'Usar Bazett a 120 lpm y llamar “largo” a un QT normal, o a 45 lpm y pasar por alto uno largo.'),
        l('所有人用同一个 QTc 界值：男性 ≥ 450 ms，女性 ≥ 460 ms。', 'Applying one QTc limit to everyone: ≥ 450 ms in men, ≥ 460 ms in women.', 'Aplicar el mismo límite de QTc a todos: ≥ 450 ms en varones, ≥ 460 ms en mujeres.'),
        l('房颤时只在一个短 RR 后测 QT：应平均多个心搏。', 'In atrial fibrillation, measuring the QT after a single short RR: average several beats.', 'En la fibrilación auricular, medir el QT tras un único RR corto: promedia varios latidos.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('PR：P 波起点 → QRS 起点，120–200 ms。', 'PR: P onset → QRS onset, 120–200 ms.', 'PR: inicio de la P → inicio del QRS, 120–200 ms.'),
        l('QRS：起点 → J 点；< 110 ms 正常，≥ 120 ms 为宽 QRS。', 'QRS: onset → J point; < 110 ms normal, ≥ 120 ms wide.', 'QRS: inicio → punto J; < 110 ms normal, ≥ 120 ms ancho.'),
        l('QT：QRS 起点 → 切线法确定的 T 波终点；不含 U 波；取最长的导联。', 'QT: QRS onset → end of T by the tangent; leave out the U wave; use the longest lead.', 'QT: inicio del QRS → final de la T por la tangente; sin la onda U; en la derivación más larga.'),
        l('QTc 优先用 Fridericia/Framingham；男 ≥ 450、女 ≥ 460 ms 为延长；> 500 ms 高危。', 'QTc: prefer Fridericia or Framingham; prolonged at ≥ 450 ms (men) or ≥ 460 ms (women); > 500 ms is high risk.', 'QTc: prefiere Fridericia o Framingham; prolongado si ≥ 450 ms (varones) o ≥ 460 ms (mujeres); > 500 ms es de alto riesgo.'),
      ],
    },
  ],
  sources: [
    'Rautaharju PM et al. AHA/ACCF/HRS Part IV: The ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240',
    'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on bradycardia and cardiac conduction delay. Circulation 2019;140:e382-e482',
    'Drew BJ et al. Prevention of torsade de pointes in hospital settings: AHA/ACCF scientific statement. Circulation 2010;121:1047-1060',
    'Vandenberk B et al. Which QT correction formulae to use for QT monitoring? J Am Heart Assoc 2016;5:e003264',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Castellano et al. 2004',
  ],
};

export default lesson;
