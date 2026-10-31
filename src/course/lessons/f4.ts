/**
 * f4 — Paper, calibration, speed and filters (stage F, docs/PLAN.md §3).
 * Criteria: docs/curriculum/criteria.md `calibration-standard`, `paper-time-scale`, recording chain (filter bandwidth,
 * sampling rate), recording standard (paper speed, gain, grid, bandwidth), `heart-rate-methods`.
 * Taught by motion first (docs/design/f-explainers.md §4.6, §5): the `moving-paper` scene carries the grid, the
 * calibration pulse, 50 mm/s and half gain on the worked example's own heart; the old grid card and filter text are
 * cut (their numbers live in the scene's labels, worked step 1 (5 / 10 / 20 mm pulse), the summary (300 and 1500
 * rules, pacing spikes) and the three-row recording card; the stepped chest-lead pulse moved to pitfall 1). The
 * worked steps' squares assume the viewer's default 25 mm/s and 10 mm/mV, which step 1 says. Mains interference
 * belongs to f6's artefact table. The monitor-filter ST distortion is shown on one heart recorded twice (diagnostic
 * vs monitor filter, DECISION §9.12: "lesson only"); artefacts are drilled in lessons f6 and o10. Speed and gain
 * variants are trained by the practice family `paper`, which sets them per item.
 */
import type { Lesson } from '../api';
import { l } from '../../core/l10n';
import { MONITOR_FILTER, rec, SRC, syn } from './f-shared';

/** a regular 75/min sinus rhythm: RR = 800 ms (± a few ms of natural beat jitter) = four large squares at 25 mm/s */
const REGULAR_75 = { rate: 75, hrv: 0 } as const;

const lesson: Lesson = {
  id: 'f4',
  stage: 'F',
  order: 4,
  title: l('心电图纸、定标、走纸速度与滤波', 'Paper, calibration, speed and filters', 'Papel, calibración, velocidad y filtros'),
  summary: l(
    '测量之前：先读走纸速度、定标脉冲和滤波设置。',
    'Before any measurement: read the speed, the calibration pulse and the filter.',
    'Antes de medir: lee la velocidad, el pulso de calibración y el filtro.',
  ),
  objectives: [
    l(
      '在 25 mm/s、10 mm/mV 下把格子换算成毫秒和毫伏。',
      'Convert squares into ms and mV at 25 mm/s and 10 mm/mV.',
      'Convertir cuadros en ms y mV a 25 mm/s y 10 mm/mV.',
    ),
    l(
      '从定标脉冲读出走纸速度和增益，并校正读数。',
      'Read speed and gain off the calibration pulse and correct for them.',
      'Leer la velocidad y la ganancia en el pulso de calibración y corregirlas.',
    ),
    l(
      '知道诊断滤波的设置，以及监护滤波为什么使 ST 段失真。',
      'Know the diagnostic filter and why a monitor filter distorts the ST segment.',
      'Conocer el filtro diagnóstico y por qué el de monitorización deforma el ST.',
    ),
  ],
  minutes: 9,
  competencies: ['C1', 'C2'],
  findings: [],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 411, REGULAR_75),
      view: { layout: 'strip', lead: 'II' },
      question: l(
        '不用任何工具：这里一个 RR 间期是多少毫秒？',
        'Without any tools: how long is one RR interval here, in milliseconds?',
        'Sin ninguna herramienta: ¿cuántos milisegundos dura aquí un intervalo RR?',
      ),
      reveal: l(
        '4 个大格。25 mm/s 时一个大格 = 200 ms，所以 RR = **800 ms**，心率 = 300 ÷ 4 = 75 次/分——前提是纸确实走 25 mm/s。',
        'Four large squares. At 25 mm/s a large square is 200 ms, so RR = **800 ms** and the rate is 300 ÷ 4 = 75/min — provided the paper really ran at 25 mm/s.',
        'Cuatro cuadros grandes. A 25 mm/s un cuadro grande son 200 ms, así que RR = **800 ms** y la frecuencia es 300 ÷ 4 = 75 lpm, siempre que el papel corriera de verdad a 25 mm/s.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'moving-paper' },
      ecg: syn('normal', 412, REGULAR_75),
      caption: l(
        '随时切换走纸速度和增益，或把滑块拖回去：波形会变宽变窄、变高变矮——留意 RR 的标注。每个定标脉冲都会在上方留下一张存根。',
        'Switch speed and gain at any moment, or drag the slider back: the waves stretch or shrink — watch the RR label. Each calibration pulse leaves a receipt above the paper.',
        'Cambia la velocidad y la ganancia cuando quieras, o arrastra el control hacia atrás: las ondas se estiran o se encogen; fíjate en la etiqueta del RR. Cada pulso de calibración deja un resguardo encima del papel.',
      ),
    },
    {
      kind: 'worked',
      title: l('从格子到数字', 'From squares to numbers', 'De los cuadros a los números'),
      ecg: syn('normal', 412, REGULAR_75),
      view: { layout: 'strip', lead: 'II', window: [0, 5000] },
      steps: [
        {
          title: l('先看定标脉冲', 'Check the pulse first', 'Primero, el pulso'),
          body: l(
            '在默认显示设置下，左边的方波高 10 mm、宽 5 mm（10 mm/mV、25 mm/s）；方波高 5 mm 表示半增益，高 20 mm 表示双倍增益。',
            'With the default viewer settings the pulse at the left edge is 10 mm tall and 5 mm wide (10 mm/mV, 25 mm/s); a 5-mm pulse means half gain, a 20-mm pulse double gain.',
            'Con los ajustes predeterminados del visor, el pulso de la izquierda mide 10 mm de alto y 5 mm de ancho (10 mm/mV, 25 mm/s); un pulso de 5 mm indica media ganancia, y uno de 20 mm, doble ganancia.',
          ),
        },
        {
          title: l('RR 与心率', 'RR and rate', 'RR y frecuencia'),
          body: l('4 个大格 → 800 ms → 300 ÷ 4 = 75 次/分。', '4 large squares → 800 ms → 300 ÷ 4 = 75/min.', '4 cuadros grandes → 800 ms → 300 ÷ 4 = 75 lpm.'),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('用分规核对', 'Check with the calipers', 'Compruébalo con el compás'),
          body: l(
            '用分规跨过一个 RR：读数显示毫秒、小格数和心率；II 导联的 R 波约高 10 mm = 1 mV。',
            'Span one RR with the calipers: the read-out gives ms, small squares and rate; the R in II is about 10 mm = 1 mV.',
            'Abarca un RR con el compás: la lectura da ms, cuadros pequeños y frecuencia; la R de II mide unos 10 mm = 1 mV.',
          ),
          view: { layout: 'strip', lead: 'II', window: [0, 5000], calipers: true },
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: syn('normal', 413),
      view: { layout: '3x4+1' },
      // beat 7 sits in the middle of the V1–V3 column (5–7.5 s) of this seed
      marks: [{ auto: 'qrs', lead: 'all', beat: 7 }],
      caption: l(
        '标准图共 10 s：3 × 4 排列，每列 2.5 s，下方是 10 s 的 II 导联节律条。被标出的心跳在四列中只出现在一列（以及节律条）中：不同列不是同时记录的。',
        'The standard sheet is 10 s: a 3 × 4 grid of 2.5-s columns over a 10-s lead II rhythm strip. The marked beat appears in only one of the four columns (and in the rhythm strip): different columns are not simultaneous.',
        'La hoja estándar dura 10 s: una cuadrícula de 3 × 4 con columnas de 2,5 s sobre una tira de ritmo de II de 10 s. El latido marcado aparece en una sola de las cuatro columnas (y en la tira de ritmo): las columnas no son simultáneas.',
      ),
    },
    {
      kind: 'contrast',
      title: l('同一颗心脏，两种滤波', 'One heart, two filters', 'Un corazón, dos filtros'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V5', 'V6'] },
      left: {
        ecg: syn('lvh', 423),
        caption: l('A：诊断滤波（0.05–150 Hz）', 'A: diagnostic filter (0.05–150 Hz)', 'A: filtro diagnóstico (0,05-150 Hz)'),
        marks: [{ auto: 'j', lead: 'V6' }],
      },
      right: {
        ecg: rec('lvh', 423, { filter: MONITOR_FILTER }),
        caption: l('B：监护滤波（0.5–40 Hz）', 'B: monitor filter (0.5–40 Hz)', 'B: filtro de monitorización (0,5-40 Hz)'),
        marks: [{ auto: 'j', lead: 'V6' }],
      },
      point: l(
        '同一颗肥厚的心脏，只换了滤波：B 中 V5–V6 的 J 点被拉低约 1–2 mm（V6 最深），V1–V3 的 ST 段抬高约 1–1.5 mm，QRS 也略变小。0.5 Hz 的单向高通滤波跟不上大 QRS 之后缓慢的平台期，所以这些看似左心室肥厚继发性 ST–T 改变或缺血的 ST 改变来自滤波，不在心脏里。判断 ST 段之前先看滤波设置，有疑问就用诊断模式重做。',
        'The same hypertrophied heart, only the filter differs: in B the J point of V5–V6 is dragged about 1–2 mm down (deepest in V6), the ST in V1–V3 rises about 1–1.5 mm and the QRS shrinks a little. A one-way 0.5-Hz high-pass cannot follow the slow plateau after a large QRS, so these ST changes, which mimic the secondary ST–T changes of LVH or ischaemia, come from the filter, not the heart. Read the filter before you judge the ST; when in doubt, record again in diagnostic mode.',
        'El mismo corazón hipertrófico; solo cambia el filtro: en B el punto J de V5-V6 baja unos 1-2 mm (más en V6), el ST de V1-V3 sube alrededor de 1-1,5 mm y el QRS se reduce un poco. Un filtro de paso alto de 0,5 Hz en un solo sentido no sigue la meseta lenta tras un QRS grande, así que esos cambios del ST, que imitan las alteraciones secundarias del ST–T de la HVI o una isquemia, vienen del filtro, no del corazón. Lee el filtro antes de valorar el ST; si dudas, repite el registro en modo diagnóstico.',
      ),
    },
    {
      kind: 'criteria',
      title: l('记录标准', 'Recording standards', 'Estándares de registro'),
      items: [
        {
          label: l('高通', 'High-pass', 'Paso alto'),
          value: l('0.05 Hz（零相位滤波可至 0.67 Hz）', '0.05 Hz (0.67 Hz only with zero-phase filters)', '0,05 Hz (0,67 Hz solo con filtros de fase cero)'),
        },
        {
          label: l('低通', 'Low-pass', 'Paso bajo'),
          value: l('成人 ≥ 150 Hz；儿童 ≥ 250 Hz', '≥ 150 Hz adults; ≥ 250 Hz children', '≥ 150 Hz adultos; ≥ 250 Hz niños'),
        },
        {
          label: l('采样率', 'Sampling', 'Muestreo'),
          value: l('≥ 500 次/秒', '≥ 500 samples/s', '≥ 500 muestras/s'),
        },
      ],
      source: 'Kligfield 2007 AHA/ACCF/HRS Part I (Circulation 2007;115:1306)',
    },
    { kind: 'check', item: { family: 'paper', seed: 41001 } },
    { kind: 'check', item: { family: 'measure-rr', seed: 41002 } },
    { kind: 'check', item: { family: 'paper', seed: 41003 } },
    { kind: 'drill', families: ['paper', 'measure-rr'], count: 6, passScore: 0.8 },
    {
      kind: 'real',
      ids: [8050, 7935],
      caption: l(
        '真实记录：找到定标脉冲，读出速度和增益，再把一个 RR 换算成心率。',
        'Real recordings: find the pulse, read speed and gain, then turn one RR into a rate.',
        'Registros reales: localiza el pulso, lee velocidad y ganancia y convierte un RR en frecuencia.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '不看定标脉冲就测量：半增益或阶梯形方波（只有胸导联半增益）会使肥厚的电压看起来“正常”。',
          'Measuring before checking the pulse: half gain, or a stepped pulse (half gain on the chest leads only), makes a hypertrophy voltage look “normal”.',
          'Medir sin mirar el pulso: la media ganancia, o un pulso escalonado (media ganancia solo en las precordiales), hace que un voltaje de hipertrofia parezca «normal».',
        ),
        l(
          '没注意 50 mm/s：间期显得长一倍，心率显得慢一半。',
          'Missing 50 mm/s: intervals look twice as long, the rate half as fast.',
          'No advertir los 50 mm/s: los intervalos parecen el doble y la frecuencia, la mitad.',
        ),
        l(
          '在监护滤波的图上判断 ST 段：先做诊断模式的 12 导联。',
          'Judging the ST on a monitor-filtered tracing: record a diagnostic 12-lead first.',
          'Valorar el ST en un trazado con filtro de monitorización: registra antes un ECG diagnóstico.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '先看走纸速度和定标脉冲：半增益时电压读数乘 2，50 mm/s 时时间读数减半。',
          'Read the speed and the pulse first: at half gain multiply voltages by 2, at 50 mm/s halve the times.',
          'Mira primero la velocidad y el pulso: con media ganancia multiplica los voltajes por 2; a 50 mm/s, divide los tiempos entre 2.',
        ),
        l(
          '25 mm/s：小格 40 ms，大格 200 ms；心率 = 300 ÷ 大格数（或 1500 ÷ 小格数）。',
          '25 mm/s: small square 40 ms, large square 200 ms; rate = 300 ÷ large squares (1500 ÷ small squares).',
          '25 mm/s: cuadro pequeño 40 ms, cuadro grande 200 ms; frecuencia = 300 ÷ cuadros grandes (1500 ÷ cuadros pequeños).',
        ),
        l('10 mm/mV：小格 0.1 mV，大格 0.5 mV。', '10 mm/mV: small square 0.1 mV, large square 0.5 mV.', '10 mm/mV: cuadro pequeño 0,1 mV, cuadro grande 0,5 mV.'),
        l(
          '诊断带宽 0.05–150 Hz；监护滤波会使 ST 段失真，并可能掩盖起搏钉样信号。',
          'Diagnostic bandwidth 0.05–150 Hz; monitor filters distort the ST segment and can hide pacing spikes.',
          'Ancho de banda diagnóstico 0,05-150 Hz; los filtros de monitorización deforman el ST y pueden ocultar las espigas del marcapasos.',
        ),
      ],
    },
  ],
  sources: [
    SRC.kligfield,
    'IEC 60601-2-25:2011. Medical electrical equipment, Part 2-25: Particular requirements for the basic safety and essential performance of electrocardiographs',
    'Mason JW et al. AHA/ACCF/HRS Recommendations Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    SRC.book,
  ],
};

export default lesson;
