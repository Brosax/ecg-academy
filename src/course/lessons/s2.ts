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
      kind: 'text',
      title: l('心电图纸就是一只钟', 'The paper is a clock', 'El papel es un reloj'),
      body: l(
        '标准走纸速度 25 mm/s 时：\n- 1 小格 = 1 mm = **40 ms**\n- 1 大格 = 5 mm = **200 ms**\n- 5 大格 = 1 s，1 分钟 = **300 大格 = 1500 小格**\n所以：心率（次/分）= 300 ÷ 大格数 = 1500 ÷ 小格数 = 60 000 ÷ RR（ms）。\n**先看走纸速度**：50 mm/s 时同样的数字要换成 600 和 3000。',
        'At the standard paper speed of 25 mm/s:\n- 1 small square = 1 mm = **40 ms**\n- 1 large square = 5 mm = **200 ms**\n- 5 large squares = 1 s, so one minute = **300 large = 1500 small squares**\nTherefore rate (/min) = 300 ÷ large squares = 1500 ÷ small squares = 60 000 ÷ RR (ms).\n**Check the paper speed first**: at 50 mm/s the constants become 600 and 3000.',
        'A la velocidad estándar de 25 mm/s:\n- 1 cuadro pequeño = 1 mm = **40 ms**\n- 1 cuadro grande = 5 mm = **200 ms**\n- 5 cuadros grandes = 1 s, así que un minuto = **300 grandes = 1500 pequeños**\nPor tanto, frecuencia (lpm) = 300 ÷ cuadros grandes = 1500 ÷ cuadros pequeños = 60 000 ÷ RR (ms).\n**Comprueba antes la velocidad del papel**: a 50 mm/s las constantes pasan a ser 600 y 3000.',
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
      scenario: 'normal',
      seed: 204,
      dials: [{ id: 'rate' }],
      view: STRIP,
      marks: [{ auto: 'rr' }],
      caption: l(
        '把心率从 60 拖到 100 次/分。接近 100 次/分时，差 1 个小格就差约 6 次/分——心率快时要数小格（1500 法）。',
        'Slide the rate from 60 to 100/min. Near 100/min, one small square changes the estimate by about 6/min: at fast rates, count small squares (the 1500 rule).',
        'Desliza la frecuencia de 60 a 100 lpm. Cerca de 100 lpm, un solo cuadro pequeño cambia la estimación en unos 6 lpm: con frecuencias rápidas, cuenta cuadros pequeños (regla de 1500).',
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
      kind: 'text',
      title: l('不规则节律：数，不要除', 'Irregular rhythm: count, do not divide', 'Ritmo irregular: cuenta, no dividas'),
      body: l(
        'RR 间期不等时（心房颤动、频发期前收缩、明显的窦性心律不齐），300 和 1500 法只描述了一个心动周期，而不是整个节律。\n- 数 10 秒节律条上全部 QRS 波群，乘以 6。\n- 不要在 3×4 排列的单列上数：每列只有 2.5 秒，漏数一个波群就差 24 次/分。\n- 需要时报告范围（例如最快和最慢的 RR 各相当于多少次/分）。',
        'When the RR intervals vary (atrial fibrillation, frequent ectopic beats, marked sinus arrhythmia), the 300 and 1500 rules describe one cycle, not the rhythm.\n- Count every QRS on the 10-s rhythm strip and multiply by 6.\n- Do not count on one column of the 3×4 sheet: it shows only 2.5 s, so one missed complex is an error of 24/min.\n- Give the range when it matters (the rates of the shortest and the longest RR).',
        'Cuando los intervalos RR varían (fibrilación auricular, extrasístoles frecuentes, arritmia sinusal marcada), las reglas de 300 y 1500 describen un ciclo, no el ritmo.\n- Cuenta todos los QRS de la tira de ritmo de 10 s y multiplica por 6.\n- No cuentes en una sola columna del formato 3×4: solo muestra 2,5 s y un complejo perdido supone un error de 24 lpm.\n- Da el intervalo si importa (las frecuencias del RR más corto y del más largo).',
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
