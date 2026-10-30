/**
 * TEST FIXTURE ONLY (not shipped, not registered): a short example lesson that uses every block kind once, written the
 * way lesson files in src/course/lessons/<id>.ts are written. The validator tests run it against fake catalogues.
 * Content: heart rate from the paper (criteria.md `heart-rate-methods`, `sinus-pr-rate-rr`).
 */
import type { Lesson } from '../../../src/course/api';
import { l } from '../../../src/core/l10n';

const synth = (scenario: string, seed: number, rate?: number) =>
  ({ kind: 'synth', req: { scenario, seed, ...(rate === undefined ? {} : { dials: { rate } }) } }) as const;
const normal = (seed: number, rate?: number) => synth('normal', seed, rate);

const lesson: Lesson = {
  id: 's2',
  stage: 'S',
  order: 2,
  title: l('心率：300、1500 与 6 秒法', 'Heart rate: the 300, 1500 and 6-second methods', 'Frecuencia cardiaca: métodos de 300, 1500 y 6 segundos'),
  summary: l(
    '在标准走纸速度下，用大格、小格或 6 秒计数法求出心室率。',
    'Get the ventricular rate from the paper at standard speed: large squares, small squares or a six-second count.',
    'Obtén la frecuencia ventricular en el papel a velocidad estándar: cuadros grandes, cuadros pequeños o recuento en seis segundos.',
  ),
  objectives: [
    l('规则节律：300 ÷ 两个 R 波之间的大格数。', 'Regular rhythm: 300 ÷ large squares between two R waves.', 'Ritmo regular: 300 ÷ cuadros grandes entre dos ondas R.'),
    l('不规则节律：数 6 秒内的 QRS 波群再乘以 10。', 'Irregular rhythm: count the QRS complexes in 6 s and multiply by 10.', 'Ritmo irregular: cuenta los complejos QRS en 6 s y multiplica por 10.'),
  ],
  minutes: 8,
  competencies: ['C2'],
  findings: ['sinus-bradycardia', 'sinus-tachycardia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('sinus-bradycardia', 11, 52),
      question: l('这份心电图的心率大约是多少？', 'Roughly what is the heart rate here?', '¿Cuál es, aproximadamente, la frecuencia cardiaca?'),
      reveal: l(
        '两个 R 波之间接近 6 个大格：300 ÷ 6 ≈ 50 次/分，为窦性心动过缓。',
        'Almost six large squares between R waves: 300 ÷ 6 ≈ 50/min, a sinus bradycardia.',
        'Casi seis cuadros grandes entre ondas R: 300 ÷ 6 ≈ 50 lpm, una bradicardia sinusal.',
      ),
    },
    {
      kind: 'text',
      title: l('为什么是 300', 'Why 300', 'Por qué 300'),
      body: l(
        '走纸速度 25 mm/s 时，一分钟有 **300 个大格**。\n- 规则节律：300 ÷ 大格数\n- 更精确：1500 ÷ 小格数',
        'At 25 mm/s one minute holds **300 large squares**.\n- Regular rhythm: 300 ÷ large squares\n- More precise: 1500 ÷ small squares',
        'A 25 mm/s, un minuto contiene **300 cuadros grandes**.\n- Ritmo regular: 300 ÷ cuadros grandes\n- Más preciso: 1500 ÷ cuadros pequeños',
      ),
    },
    {
      kind: 'ecg',
      ecg: normal(12),
      view: { layout: 'strip', lead: 'II' },
      marks: [{ auto: 'rr' }],
      caption: l('RR 间期就是一个心动周期。', 'The RR interval is one cardiac cycle.', 'El intervalo RR es un ciclo cardiaco.'),
    },
    {
      kind: 'live',
      scenario: 'normal',
      seed: 13,
      dials: [{ id: 'rate' }],
      caption: l('移动滑块，观察 RR 间期如何变化。', 'Move the slider and watch the RR interval change.', 'Mueve el control y observa cómo cambia el intervalo RR.'),
    },
    { kind: 'figure', figure: { id: 'rate-ruler', params: { method: '300' } }, ecg: normal(14) },
    {
      kind: 'heart',
      ecg: normal(15),
      showConduction: true,
      caption: l('每个 QRS 波群都对应一次心室激动。', 'Each QRS complex is one ventricular activation.', 'Cada complejo QRS es una activación ventricular.'),
    },
    {
      kind: 'criteria',
      title: l('心率', 'Heart rate', 'Frecuencia cardiaca'),
      items: [
        { label: l('窦性心动过缓', 'Sinus bradycardia', 'Bradicardia sinusal'), value: l('< 60 次/分', '< 60/min', '< 60 lpm') },
        { label: l('窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal'), value: l('> 100 次/分', '> 100/min', '> 100 lpm') },
      ],
      source: 'Kusumoto FM et al. 2018 ACC/AHA/HRS bradycardia guideline; Kligfield P et al. Circulation 2007;115:1306',
    },
    {
      kind: 'worked',
      title: l('一步步求心率', 'Rate, step by step', 'La frecuencia, paso a paso'),
      ecg: normal(16, 75),
      steps: [
        {
          title: l('找两个相邻的 R 波', 'Find two neighbouring R waves', 'Busca dos ondas R vecinas'),
          body: l('选一个落在粗线上的 R 波。', 'Pick an R wave that sits on a heavy line.', 'Elige una onda R que caiga sobre una línea gruesa.'),
          marks: [{ auto: 'r' }],
        },
        {
          title: l('数大格', 'Count large squares', 'Cuenta los cuadros grandes'),
          body: l('4 个大格：300 ÷ 4 = 75 次/分。', 'Four large squares: 300 ÷ 4 = 75/min.', 'Cuatro cuadros grandes: 300 ÷ 4 = 75 lpm.'),
          marks: [{ auto: 'rr' }],
          highlightLeads: ['II'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('慢还是快', 'Slow or fast', 'Lenta o rápida'),
      left: { ecg: synth('sinus-bradycardia', 17, 50), caption: l('约 50 次/分', 'About 50/min', 'Unos 50 lpm') },
      right: { ecg: synth('sinus-tachycardia', 18, 110), caption: l('约 110 次/分', 'About 110/min', 'Unos 110 lpm') },
      point: l('看 RR 间期占几个大格。', 'Look at how many large squares one RR spans.', 'Fíjate en cuántos cuadros grandes ocupa un RR.'),
    },
    { kind: 'check', item: { family: 'rate', seed: 21 } },
    { kind: 'drill', families: ['rate'], count: 5, passScore: 0.8 },
    {
      kind: 'real',
      ids: [1101],
      caption: l('在真实病例上用同样的方法。', 'Use the same method on a real patient.', 'Usa el mismo método en un paciente real.'),
    },
    {
      kind: 'pitfalls',
      items: [l('节律不规则时仍用 300 法。', 'Using the 300 rule on an irregular rhythm.', 'Usar la regla de 300 con un ritmo irregular.')],
    },
    {
      kind: 'summary',
      points: [
        l('300 ÷ 大格数。', '300 ÷ large squares.', '300 ÷ cuadros grandes.'),
        l('1500 ÷ 小格数。', '1500 ÷ small squares.', '1500 ÷ cuadros pequeños.'),
        l('不规则：6 秒内 QRS × 10。', 'Irregular: QRS in 6 s × 10.', 'Irregular: QRS en 6 s × 10.'),
      ],
    },
  ],
  sources: ['Kligfield P et al. Circulation 2007;115:1306-1324', 'Castellano et al. 2004'],
};

export default lesson;
