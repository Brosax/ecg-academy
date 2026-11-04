/**
 * S2 — Heart rate: the 300, 1500 and 6-second methods (docs/PLAN.md §3, stage S).
 * Criteria: docs/curriculum/criteria.md `paper-time-scale`, `heart-rate-methods`, `sinus-pr-rate-rr`,
 * "Heart rate — small-square method", "Sinus node rhythms".
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
  id: 's2',
  stage: 'S',
  order: 2,
  title: l('心率：300、1500 与 6 秒法', 'Heart rate: the 300, 1500 and 6-second methods', 'Frecuencia cardiaca: métodos de 300, 1500 y 6 segundos'),
  summary: l(
    '先确认走纸速度，再用大格、小格或 10 秒计数求出心室率；节律不规则时只能计数。',
    'Confirm the paper speed, then get the ventricular rate from large squares, small squares or a 10-second count. When the rhythm is irregular, only counting works.',
    'Confirma la velocidad del papel y calcula la frecuencia ventricular con cuadros grandes, cuadros pequeños o un recuento de 10 segundos. Si el ritmo es irregular, solo sirve contar.',
  ),
  objectives: [
    l('规则节律：300 ÷ RR 间的大格数，或 1500 ÷ 小格数。', 'Regular rhythm: 300 ÷ large squares, or 1500 ÷ small squares, between two R waves.', 'Ritmo regular: 300 ÷ cuadros grandes, o 1500 ÷ cuadros pequeños, entre dos ondas R.'),
    l('不规则节律：数 10 秒内的 QRS 波群再乘以 6。', 'Irregular rhythm: count the QRS complexes in 10 s and multiply by 6.', 'Ritmo irregular: cuenta los complejos QRS de 10 s y multiplica por 6.'),
    l('在 ±10% 以内估算心率，并判断慢、正常还是快。', 'Estimate the rate within ±10 % and call it slow, normal or fast.', 'Estima la frecuencia con un error < 10 % y clasifícala como lenta, normal o rápida.'),
  ],
  minutes: 12,
  competencies: ['C2'],
  findings: ['sinus-bradycardia', 'sinus-tachycardia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('sinus-bradycardia', 201, { rate: 50 }),
      view: STRIP,
      question: l(
        '不用计算器，10 秒内估出这条 II 导联的心率。先想好你的数字。',
        'Without a calculator, estimate the heart rate on this lead II strip in 10 seconds. Commit to your number first.',
        'Sin calculadora, estima en 10 segundos la frecuencia de esta tira de la derivación II. Decide primero tu número.',
      ),
      reveal: l(
        '两个 R 波之间约 **6 个大格**：300 ÷ 6 = **50 次/分**。换成时间：RR ≈ 1.2 s = 1200 ms，60 000 ÷ 1200 = 50。每个 QRS 前都有窦性 P 波，心率 < 60 次/分：窦性心动过缓。',
        'About **6 large squares** separate the R waves: 300 ÷ 6 = **50/min**. In time units: RR ≈ 1.2 s = 1200 ms, and 60 000 ÷ 1200 = 50. A sinus P wave precedes every QRS and the rate is below 60/min: sinus bradycardia.',
        'Entre las ondas R hay unos **6 cuadros grandes**: 300 ÷ 6 = **50 lpm**. En tiempo: RR ≈ 1,2 s = 1200 ms, y 60 000 ÷ 1200 = 50. Cada QRS va precedido de una P sinusal y la frecuencia es < 60 lpm: bradicardia sinusal.',
      ),
    },
    {
      kind: 'live',
      scenario: 'normal',
      seed: 207,
      dials: [{ id: 'rate' }],
      view: STRIP,
      marks: [{ auto: 'rr' }],
      play: {
        dial: 'rate',
        from: 60,
        to: 100,
        notes: [
          { min: 60, max: 62, text: l('R 波相隔 **5 个大格** = 1 秒：300 ÷ 5 = **60 次/分**。', 'R waves **5 large squares** apart = 1 s: 300 ÷ 5 = **60/min**.', 'Ondas R a **5 cuadros grandes** = 1 s: 300 ÷ 5 = **60 lpm**.') },
          { min: 63, max: 72, text: l('下一个 R 落在两条粗线之间：改数小格，1500 ÷ 小格数。', 'The next R falls between heavy lines: count small squares, 1500 ÷ n.', 'La siguiente R cae entre líneas gruesas: cuenta cuadros pequeños, 1500 ÷ n.') },
          { min: 73, max: 77, text: l('相隔 **4 个大格**（800 ms）：300 ÷ 4 = **75 次/分**。', '**4 large squares** apart (800 ms): 300 ÷ 4 = **75/min**.', 'A **4 cuadros grandes** (800 ms): 300 ÷ 4 = **75 lpm**.') },
          { min: 78, max: 97, text: l('又落在粗线之间。1 小格 = 40 ms：用 1500 ÷ 小格数。', 'Between heavy lines again. 1 small square = 40 ms: use 1500 ÷ n.', 'De nuevo entre líneas gruesas. 1 cuadro pequeño = 40 ms: usa 1500 ÷ n.') },
          { min: 98, max: 100, text: l('相隔 **3 个大格**（600 ms）：300 ÷ 3 = **100 次/分**。', '**3 large squares** apart (600 ms): 300 ÷ 3 = **100/min**.', 'A **3 cuadros grandes** (600 ms): 300 ÷ 3 = **100 lpm**.') },
        ],
      },
      predict: {
        question: l('心率从 60 升到 100 次/分，两个 R 波之间会剩几个大格？', 'As the rate climbs from 60 to 100/min, how many large squares will separate the R waves?', 'Si la frecuencia sube de 60 a 100 lpm, ¿cuántos cuadros grandes separarán las ondas R?'),
        options: [l('2 个', '2', '2'), l('3 个', '3', '3'), l('4 个', '4', '4')],
        answer: 1,
        ordered: true,
      },
      caption: l(
        '纸就是一只钟：1 大格 = 200 ms，5 大格 = 1 秒。看 RR 随心率缩短，记住 300、150、100、75、60、50。',
        'The paper is a clock: 1 large square = 200 ms, 5 = 1 s. Watch the RR shrink as the rate rises; learn 300, 150, 100, 75, 60, 50.',
        'El papel es un reloj: 1 cuadro grande = 200 ms, 5 = 1 s. Mira cómo se acorta el RR al subir la frecuencia; memoriza 300, 150, 100, 75, 60, 50.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'rate-ruler', params: { method: '300' } },
      ecg: synth('normal', 202, { rate: 75 }),
      caption: l(
        '把一个 R 波放在粗线上，数到下一个 R 波：300、150、100、75、60、50……',
        'Put an R wave on a heavy line and read off where the next one falls: 300, 150, 100, 75, 60, 50…',
        'Coloca una onda R sobre una línea gruesa y mira dónde cae la siguiente: 300, 150, 100, 75, 60, 50…',
      ),
    },
    {
      kind: 'worked',
      title: l('规则节律：一步步求心率', 'Regular rhythm, step by step', 'Ritmo regular, paso a paso'),
      ecg: synth('normal', 203, { rate: 75 }),
      view: STRIP,
      steps: [
        {
          title: l('选一个落在粗线上的 R 波', 'Pick an R wave on a heavy line', 'Elige una onda R sobre una línea gruesa'),
          body: l(
            '用长的 II 导联节律条：R 波高而清楚。选一个顶点正好（或接近）落在粗线上的 R 波。',
            'Use the long lead II rhythm strip: its R waves are tall and clear. Choose one whose peak sits on, or close to, a heavy line.',
            'Usa la tira larga de la derivación II: sus ondas R son altas y nítidas. Elige una cuyo pico caiga sobre una línea gruesa o muy cerca.',
          ),
          marks: [{ auto: 'r' }],
        },
        {
          title: l('数到下一个 R 波的大格', 'Count large squares to the next R', 'Cuenta cuadros grandes hasta la siguiente R'),
          body: l(
            '下一个 R 波在第 **4 个**大格处：300 ÷ 4 = **75 次/分**。记住序列 300 – 150 – 100 – 75 – 60 – 50。',
            'The next R wave falls **4** large squares later: 300 ÷ 4 = **75/min**. Learn the sequence 300 – 150 – 100 – 75 – 60 – 50.',
            'La siguiente R cae **4** cuadros grandes después: 300 ÷ 4 = **75 lpm**. Aprende la secuencia 300 – 150 – 100 – 75 – 60 – 50.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('用小格精确', 'Refine with small squares', 'Afina con cuadros pequeños'),
          body: l(
            '同一个 RR 是 **20 个小格**：1500 ÷ 20 = 75 次/分。当下一个 R 波落在两条粗线之间时，用这个方法。',
            'The same RR spans **20 small squares**: 1500 ÷ 20 = 75/min. Use this whenever the next R falls between heavy lines.',
            'El mismo RR ocupa **20 cuadros pequeños**: 1500 ÷ 20 = 75 lpm. Úsalo cuando la siguiente R caiga entre dos líneas gruesas.',
          ),
          marks: [{ auto: 'rr' }, { auto: 'r' }],
        },
        {
          title: l('用 10 秒计数核对', 'Cross-check with a 10-second count', 'Comprueba con el recuento de 10 segundos'),
          body: l(
            '整条 10 秒节律条上有 12–13 个 QRS 波群，× 6 = 72–78 次/分。两种方法一致，这个数字才可信。',
            'The whole 10-s strip holds 12–13 QRS complexes; × 6 = 72–78/min. When two methods agree, you can trust the number.',
            'La tira completa de 10 s contiene 12–13 complejos QRS; × 6 = 72–78 lpm. Cuando dos métodos coinciden, el número es fiable.',
          ),
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'sinus-tachycardia',
      seed: 204,
      dials: [{ id: 'rate' }],
      view: STRIP,
      marks: [{ auto: 'rr' }],
      play: {
        dial: 'rate',
        from: 102,
        to: 150,
        notes: [
          { min: 102, max: 106, text: l('RR ≈ 14–15 小格：1500 ÷ 15 = 100。差 1 小格就差约 7 次/分。', 'RR ≈ 14–15 small squares: 1500 ÷ 15 = 100. One square off is about 7/min.', 'RR ≈ 14–15 cuadros pequeños: 1500 ÷ 15 = 100. Un cuadro de error son unos 7 lpm.') },
          { min: 107, max: 144, text: l('大格法只能说“100 到 150 之间”：数小格才准。', 'Large squares only say "between 100 and 150": count small squares.', 'Los cuadros grandes solo dicen «entre 100 y 150»: cuenta cuadros pequeños.') },
          { min: 145, max: 150, text: l('相隔 **2 个大格** = 10 小格：1500 ÷ 10 = **150 次/分**。', '**2 large squares** = 10 small apart: 1500 ÷ 10 = **150/min**.', 'A **2 cuadros grandes** = 10 pequeños: 1500 ÷ 10 = **150 lpm**.') },
        ],
      },
      caption: l(
        '心率越快，一个小格代表的心率差越大。快心率一律数小格（1500 法）。',
        'The faster the rate, the more one small square is worth. At fast rates always count small squares (the 1500 rule).',
        'Cuanto más rápida la frecuencia, más vale un cuadro pequeño. Con frecuencias rápidas cuenta siempre cuadros pequeños (regla de 1500).',
      ),
    },
    {
      kind: 'criteria',
      title: l('心率：方法与界值', 'Heart rate: methods and limits', 'Frecuencia cardiaca: métodos y límites'),
      items: [
        { label: l('规则节律（25 mm/s）', 'Regular rhythm (25 mm/s)', 'Ritmo regular (25 mm/s)'), value: l('300 ÷ 大格数，或 1500 ÷ 小格数', '300 ÷ large squares, or 1500 ÷ small squares', '300 ÷ cuadros grandes, o 1500 ÷ cuadros pequeños') },
        { label: l('任何节律，尤其不规则', 'Any rhythm, especially irregular', 'Cualquier ritmo, sobre todo irregular'), value: l('10 秒内 QRS 数 × 6（或 6 秒内 × 10）', 'QRS complexes in 10 s × 6 (or in 6 s × 10)', 'Complejos QRS en 10 s × 6 (o en 6 s × 10)') },
        { label: l('精确换算', 'Exact form', 'Forma exacta'), value: l('60 000 ÷ RR（ms）', '60 000 ÷ RR (ms)', '60 000 ÷ RR (ms)') },
        { label: l('走纸 50 mm/s', 'Paper at 50 mm/s', 'Papel a 50 mm/s'), value: l('600 ÷ 大格数，或 3000 ÷ 小格数', '600 ÷ large squares, or 3000 ÷ small squares', '600 ÷ cuadros grandes, o 3000 ÷ cuadros pequeños') },
        { label: l('静息窦性心率（心电图惯例）', 'Resting sinus rate (ECG convention)', 'Frecuencia sinusal en reposo (convención del ECG)'), value: l('60–100 次/分', '60–100/min', '60–100 lpm') },
        {
          label: l('窦性心动过缓', 'Sinus bradycardia', 'Bradicardia sinusal'),
          value: l('< 60 次/分（报告惯例）；< 50 次/分才有临床意义（2018 ACC/AHA/HRS）', '< 60/min (reporting convention); < 50/min is the clinically significant threshold (2018 ACC/AHA/HRS)', '< 60 lpm (convención del informe); < 50 lpm es el umbral clínicamente relevante (ACC/AHA/HRS 2018)'),
        },
        { label: l('窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal'), value: l('> 100 次/分', '> 100/min', '> 100 lpm') },
      ],
      source: 'Kligfield P et al. AHA/ACCF/HRS Part I, Circulation 2007;115:1306; Mason JW et al. Part II, Circulation 2007;115:1325; Kusumoto FM et al. 2018 ACC/AHA/HRS bradycardia guideline, Circulation 2019;140:e382',
    },
    {
      kind: 'contrast',
      title: l('选对方法', 'Choose the method', 'Elige el método'),
      view: STRIP,
      left: {
        ecg: synth('sinus-tachycardia', 205, { rate: 115 }),
        caption: l('II 导联，10 秒', 'Lead II, 10 s', 'Derivación II, 10 s'),
      },
      right: {
        ecg: synth('atrial-fibrillation', 206),
        caption: l('II 导联，10 秒', 'Lead II, 10 s', 'Derivación II, 10 s'),
      },
      point: l(
        'A 节律规则：任取一对 R 波，1500 ÷ 小格数都得到同一个答案（约 115 次/分）。B 没有两个 RR 间期相同，每一对 R 波都会给出不同的“心率”。B 只能数整条 10 秒节律条上的 QRS 波群再乘以 6。',
        'A is regular: 1500 ÷ small squares gives the same answer on any pair of R waves (about 115/min). In B no two RR intervals are equal, so every pair gives a different "rate". For B, count every QRS on the 10-s strip and multiply by 6.',
        'A es regular: 1500 ÷ cuadros pequeños da el mismo resultado con cualquier par de ondas R (unos 115 lpm). En B no hay dos intervalos RR iguales y cada par da una "frecuencia" distinta. En B, cuenta todos los QRS de la tira de 10 s y multiplica por 6.',
      ),
    },
    {
      kind: 'film',
      title: l('不规则节律：数，不要除', 'Irregular rhythm: count, do not divide', 'Ritmo irregular: cuenta, no dividas'),
      view: STRIP,
      frames: [
        {
          label: l('规则', 'Regular', 'Regular'),
          ecg: synth('sinus-tachycardia', 205, { rate: 115 }),
          note: l('每个 RR 都一样长：任取一对 R 波，1500 ÷ 小格数 ≈ 115 次/分。', 'Every RR is the same: any pair of R waves gives 1500 ÷ n ≈ 115/min.', 'Todos los RR son iguales: cualquier par de R da 1500 ÷ n ≈ 115 lpm.'),
          marks: [{ auto: 'rr' }],
        },
        {
          label: l('随呼吸变化', 'Breathing with', 'Varía con la respiración'),
          ecg: synth('sinus-arrhythmia', 208),
          note: l('RR 随呼吸忽长忽短：只量一对会偏，改数 10 秒内的 QRS × 6。', 'RR stretches and shrinks with breathing: one pair misleads, so count QRS in 10 s × 6.', 'El RR se alarga y acorta con la respiración: un par engaña; cuenta los QRS de 10 s × 6.'),
          // the shortest RR on the strip: the pair that misleads most
          marks: [{ auto: 'rr', beat: 9 }],
        },
        {
          label: l('完全不规则', 'Irregularly irregular', 'Irregularmente irregular'),
          ecg: synth('atrial-fibrillation', 206),
          note: l('没有两个 RR 相同：每对给出不同的“心率”。只能数整条 10 秒，再乘以 6。', 'No two RR alike: each pair gives a different "rate". Count the whole 10 s and multiply by 6.', 'No hay dos RR iguales: cada par da otra «frecuencia». Cuenta los 10 s enteros y multiplica por 6.'),
          // the shortest RR on the strip: its "rate" is far from the 10-s count
          marks: [{ auto: 'rr', beat: 16 }],
        },
      ],
      predict: {
        question: l('这三条里，哪几条可以用 300 或 1500 法？', 'Which of these three strips can you read with the 300 or 1500 rule?', '¿En cuáles de estas tres tiras sirve la regla de 300 o de 1500?'),
        options: [l('只有第 1 条', 'Only strip 1', 'Solo la 1'), l('第 1 和第 2 条', 'Strips 1 and 2', 'La 1 y la 2'), l('三条都可以', 'All three', 'Las tres')],
        answer: 0,
      },
      caption: l(
        '不规则就只数不除。别在 3×4 排列的 2.5 秒单列上数：漏一个波就差 24 次/分。',
        'Irregular means count, do not divide. Never count on a 2.5-s column of the 3×4 sheet: one missed beat is 24/min.',
        'Irregular significa contar, no dividir. No cuentes en una columna de 2,5 s del formato 3×4: un latido perdido son 24 lpm.',
      ),
    },
    { kind: 'check', item: { family: 'rate', seed: 4 } },
    { kind: 'check', item: { family: 'rate', seed: 3 } },
    { kind: 'check', item: { family: 'rate-irregular', seed: 2 } },
    { kind: 'drill', families: ['rate', 'rate-irregular'], count: 8, passScore: 0.8 },
    {
      kind: 'real',
      ids: [14918, 8931, 19505],
      caption: l(
        '三位真实患者。先用 300 法估算，再用 1500 法精确，最后用 10 秒计数核对，然后再揭晓标注。每个心率是慢、正常还是快？',
        'Three real patients. Estimate with 300, refine with 1500 and confirm with the 10-s count before you reveal the labels. Is each rate slow, normal or fast?',
        'Tres pacientes reales. Estima con 300, afina con 1500 y confirma con el recuento de 10 s antes de ver las etiquetas. ¿Cada frecuencia es lenta, normal o rápida?',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('节律不规则时仍用 300 ÷ 大格数。', 'Using 300 ÷ large squares on an irregular rhythm.', 'Usar 300 ÷ cuadros grandes con un ritmo irregular.'),
        l('没看走纸速度：50 mm/s 时心率看上去只有实际的一半。', 'Not checking the paper speed: at 50 mm/s the rate looks half of what it is.', 'No comprobar la velocidad del papel: a 50 mm/s la frecuencia parece la mitad de la real.'),
        l('在 3×4 排列的 2.5 秒单列上计数，而不是在 10 秒节律条上。', 'Counting on a 2.5-s column of the 3×4 sheet instead of the 10-s rhythm strip.', 'Contar en una columna de 2,5 s del formato 3×4 en lugar de en la tira de ritmo de 10 s.'),
        l('把高大的 T 波当成另一个 QRS 重复计数：在 QRS 明显的导联（如 II）上数。', 'Double-counting a tall T wave as another QRS: count in a lead with a dominant QRS, such as II.', 'Contar dos veces una T alta como si fuera otro QRS: cuenta en una derivación con QRS dominante, como II.'),
        l('把 50–59 次/分当成疾病：健康年轻人和睡眠中常见，结合临床再判断。', 'Treating 50–59/min as a disease: it is common in fit young people and during sleep; judge it with the clinical picture.', 'Tratar 50–59 lpm como una enfermedad: es frecuente en jóvenes en forma y durante el sueño; valóralo con la clínica.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('先确认走纸速度（25 mm/s）和定标。', 'Check the paper speed (25 mm/s) and calibration first.', 'Comprueba primero la velocidad del papel (25 mm/s) y la calibración.'),
        l('规则节律：300 ÷ 大格数，1500 ÷ 小格数。', 'Regular rhythm: 300 ÷ large squares, 1500 ÷ small squares.', 'Ritmo regular: 300 ÷ cuadros grandes, 1500 ÷ cuadros pequeños.'),
        l('不规则节律：10 秒内 QRS 数 × 6。', 'Irregular rhythm: QRS complexes in 10 s × 6.', 'Ritmo irregular: complejos QRS en 10 s × 6.'),
        l('60–100 次/分正常；< 60 慢、> 100 快（< 50 才有临床意义）。', '60–100/min is normal; < 60 slow, > 100 fast (< 50 is the clinically significant bradycardia).', '60–100 lpm es normal; < 60 lenta, > 100 rápida (< 50 es la bradicardia clínicamente relevante).'),
      ],
    },
  ],
  sources: [
    'Kligfield P et al. AHA/ACCF/HRS Recommendations for the standardization and interpretation of the ECG, Part I. Circulation 2007;115:1306-1324',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on the evaluation and management of patients with bradycardia and cardiac conduction delay. Circulation 2019;140:e382-e482',
    'Castellano et al. 2004',
  ],
};

export default lesson;
