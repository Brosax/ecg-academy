/**
 * f4 — Paper, calibration, speed and filters (stage F, docs/PLAN.md §3).
 * Criteria: docs/curriculum/criteria.md `calibration-standard`, `paper-time-scale`, recording chain (filter bandwidth,
 * sampling rate, mains interference), recording standard (paper speed, gain, grid, bandwidth), `heart-rate-methods`.
 * The monitor-filter ST distortion is shown on one heart recorded twice (diagnostic vs monitor filter, DECISION §9.12:
 * "lesson only"); artefacts are drilled in lessons f6 and o10. Speed and gain variants are trained by the practice
 * family `paper`, which sets them per item.
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
    '测量任何东西之前：先读走纸速度和定标脉冲，知道一个格子代表多少，知道这份图用的是哪种滤波。',
    'Before any measurement: read the speed and the calibration pulse, know what one square is worth, and know which filter made the tracing.',
    'Antes de medir nada: lee la velocidad y el pulso de calibración, conoce el valor de cada cuadro y qué filtro generó el trazado.',
  ),
  objectives: [
    l(
      '在 25 mm/s、10 mm/mV 条件下，把小格和大格换算成毫秒和毫伏。',
      'Convert small and large squares into ms and mV at 25 mm/s and 10 mm/mV.',
      'Convertir cuadros pequeños y grandes en ms y mV a 25 mm/s y 10 mm/mV.',
    ),
    l(
      '读定标脉冲，并对半增益或双倍增益进行校正。',
      'Read the calibration pulse and correct amplitudes for half or double gain.',
      'Leer el pulso de calibración y corregir las amplitudes cuando la ganancia es la mitad o el doble.',
    ),
    l(
      '识别 50 mm/s 走纸速度，并知道它对波形宽度和心率判断的影响。',
      'Recognise a 50 mm/s recording and what it does to widths and to the apparent rate.',
      'Reconocer un registro a 50 mm/s y lo que hace con las anchuras y con la frecuencia aparente.',
    ),
    l(
      '知道诊断用滤波的设置，以及监护模式滤波为什么会使 ST 段失真。',
      'Know the diagnostic filter settings and why monitor filters distort the ST segment.',
      'Conocer los ajustes del filtro diagnóstico y por qué los filtros de monitorización deforman el segmento ST.',
    ),
  ],
  minutes: 10,
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
        '4 个大格。在标准走纸速度 25 mm/s 下，一个大格（5 mm）是 200 ms，所以 RR = 4 × 200 = **800 ms**，心率 = 60 000 ÷ 800 = 75 次/分。心电图上所有时间都来自这个换算——前提是走纸速度确实是 25 mm/s。',
        'Four large squares. At the standard 25 mm/s one large square (5 mm) lasts 200 ms, so RR = 4 × 200 = **800 ms** and the rate is 60 000 ÷ 800 = 75/min. Every timing on the ECG comes from this conversion — provided the paper really ran at 25 mm/s.',
        'Cuatro cuadros grandes. A la velocidad estándar de 25 mm/s un cuadro grande (5 mm) dura 200 ms, así que RR = 4 × 200 = **800 ms** y la frecuencia es 60 000 ÷ 800 = 75 lpm. Todos los tiempos del ECG salen de esta conversión, siempre que el papel corriera de verdad a 25 mm/s.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'paper', params: { showCalibration: true } },
      caption: l(
        '切换走纸速度和增益。速度变，波形被拉宽或压窄；增益变，波形变高或变矮。定标脉冲（1 mV、持续 200 ms）跟着一起变，所以它总能告诉你这份图是怎样记录的。',
        'Switch the speed and the gain. Speed stretches or squeezes the complex; gain makes it taller or shorter. The calibration pulse (1 mV for 200 ms) changes with them, so it always tells you how the tracing was recorded.',
        'Cambia la velocidad y la ganancia. La velocidad estira o comprime el complejo; la ganancia lo hace más alto o más bajo. El pulso de calibración (1 mV durante 200 ms) cambia con ellos, así que siempre te dice cómo se registró el trazado.',
      ),
    },
    {
      kind: 'criteria',
      title: l('标准条件下的方格', 'The grid at standard settings', 'La cuadrícula con los ajustes estándar'),
      items: [
        {
          label: l('走纸速度 25 mm/s', 'Paper speed 25 mm/s', 'Velocidad del papel 25 mm/s'),
          value: l(
            '1 mm（小格）= 40 ms；5 mm（大格）= 200 ms；25 mm = 1 s；每分钟 300 个大格、1500 个小格',
            '1 mm (small square) = 40 ms; 5 mm (large square) = 200 ms; 25 mm = 1 s; 300 large and 1500 small squares per minute',
            '1 mm (cuadro pequeño) = 40 ms; 5 mm (cuadro grande) = 200 ms; 25 mm = 1 s; 300 cuadros grandes y 1500 pequeños por minuto',
          ),
        },
        {
          label: l('增益 10 mm/mV', 'Gain 10 mm/mV', 'Ganancia 10 mm/mV'),
          value: l('1 mm = 0.1 mV；5 mm = 0.5 mV', '1 mm = 0.1 mV; 5 mm = 0.5 mV', '1 mm = 0,1 mV; 5 mm = 0,5 mV'),
        },
        {
          label: l('定标脉冲', 'Calibration pulse', 'Pulso de calibración'),
          value: l(
            '1 mV：标准增益时高 10 mm；5 mm = 半增益；20 mm = 双倍增益；阶梯形脉冲 = 只有胸导联用半增益',
            '1 mV: 10 mm tall at standard gain; 5 mm = half gain; 20 mm = double gain; a stepped pulse = half gain on the chest leads only',
            '1 mV: 10 mm de alto con ganancia estándar; 5 mm = mitad de ganancia; 20 mm = doble ganancia; pulso escalonado = mitad de ganancia solo en las precordiales',
          ),
        },
        {
          label: l('走纸速度 50 mm/s', 'Paper speed 50 mm/s', 'Velocidad del papel 50 mm/s'),
          value: l('1 mm = 20 ms：波形宽一倍，心率看起来慢一半', '1 mm = 20 ms: complexes look twice as wide and the rate looks half as fast', '1 mm = 20 ms: los complejos parecen el doble de anchos y la frecuencia, la mitad'),
        },
        {
          label: l('标准 12 导联图', 'Standard 12-lead sheet', 'Hoja estándar de 12 derivaciones'),
          value: l(
            '10 s：3 × 4 排列，每个导联 2.5 s，下方另有 10 s 节律条',
            '10 s: a 3 × 4 grid with 2.5 s per lead, plus a 10-s rhythm strip',
            '10 s: cuadrícula de 3 × 4 con 2,5 s por derivación y una tira de ritmo de 10 s',
          ),
        },
      ],
      source: 'Kligfield P et al. AHA/ACCF/HRS Part I. Circulation 2007;115:1306-1324; IEC 60601-2-25:2011',
    },
    {
      kind: 'worked',
      title: l('从格子到数字', 'From squares to numbers', 'De los cuadros a los números'),
      ecg: syn('normal', 412, REGULAR_75),
      view: { layout: 'strip', lead: 'II', window: [0, 5000] },
      steps: [
        {
          title: l('先看定标脉冲', 'Check the pulse first', 'Primero, el pulso de calibración'),
          body: l(
            '条图最左边的脉冲高 10 mm、宽 5 mm：10 mm/mV、25 mm/s。只有确认了这一点，下面的换算才成立。',
            'At the left edge the pulse is 10 mm tall and 5 mm wide: 10 mm/mV and 25 mm/s. Only now do the conversions below hold.',
            'En el borde izquierdo el pulso mide 10 mm de alto y 5 mm de ancho: 10 mm/mV y 25 mm/s. Solo ahora valen las conversiones siguientes.',
          ),
        },
        {
          title: l('时间：RR 间期', 'Time: the RR interval', 'Tiempo: el intervalo RR'),
          body: l('20 mm = 4 个大格 → 800 ms → 75 次/分。', '20 mm = 4 large squares → 800 ms → 75/min.', '20 mm = 4 cuadros grandes → 800 ms → 75 lpm.'),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('时间：QRS 时限', 'Time: the QRS', 'Tiempo: el QRS'),
          body: l(
            '约 2 到 2½ 个小格 → 80–100 ms。短间期要数小格（每格 40 ms），或者用分规。',
            'About 2 to 2½ small squares → 80–100 ms. For short intervals count small squares (40 ms each) or use the calipers.',
            'Unos 2 a 2½ cuadros pequeños → 80-100 ms. Para intervalos cortos cuenta cuadros pequeños (40 ms cada uno) o usa el compás.',
          ),
          marks: [{ auto: 'qrs' }],
        },
        {
          title: l('电压：R 波', 'Voltage: the R wave', 'Voltaje: la onda R'),
          body: l(
            'II 导联的 R 波高约 10 个小格（10 mm）→ 在 10 mm/mV 时约 1 mV。若增益是 5 mm/mV，同一个 R 波只有 5 mm 高：增益减半，读数要加倍。',
            'The R wave in II rises about 10 small squares (10 mm) → about 1 mV at 10 mm/mV. At 5 mm/mV the same R would be 5 mm tall: halve the gain, double the reading.',
            'La R de II sube unos 10 cuadros pequeños (10 mm) → alrededor de 1 mV a 10 mm/mV. A 5 mm/mV la misma R mediría 5 mm: con media ganancia, duplica la lectura.',
          ),
          marks: [{ auto: 'r', lead: 'II' }],
        },
        {
          title: l('用分规核对', 'Check with the calipers', 'Compruébalo con el compás'),
          body: l(
            '打开工具栏，用分规跨过一个 RR 间期：读数会显示毫秒、小格数和心率。',
            'Open the toolbar and span one RR interval with the calipers: the read-out shows ms, small squares and the rate.',
            'Abre la barra de herramientas y abarca un intervalo RR con el compás: la lectura muestra ms, cuadros pequeños y frecuencia.',
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
        '标准 12 导联图：四列，每列 2.5 s。同一列的导联是同时记录的，不同列不是——V1 中的心跳和 I 导联中的不是同一个。被标出的心跳只出现在一列和下方的节律条中。底部的 II 导联节律条覆盖全部 10 s，用于判断节律和心率。',
        'The standard sheet: four columns of 2.5 s each. Leads in the same column are recorded at the same moment; leads in different columns are not — the beat in V1 is not the beat in lead I. The marked beat appears in one column and in the rhythm strip only. The lead II strip at the bottom covers all 10 s for rhythm and rate.',
        'La hoja estándar: cuatro columnas de 2,5 s. Las derivaciones de una misma columna se registran a la vez; las de columnas distintas, no: el latido de V1 no es el de la derivación I. El latido marcado aparece solo en una columna y en la tira de ritmo. La tira de II de abajo cubre los 10 s para el ritmo y la frecuencia.',
      ),
    },
    {
      kind: 'text',
      title: l('滤波：你看到图之前机器做了什么', 'Filters: what the machine did before you saw the tracing', 'Filtros: lo que hizo la máquina antes de que vieras el trazado'),
      body: l(
        '- **诊断模式**：高通 0.05 Hz（使用零相位滤波时可至 0.67 Hz），低通成人至少 150 Hz（儿童 250 Hz）。这样 ST 段和细小切迹才能真实保留。\n- **监护或“肌电”模式**（约 0.5–40 Hz）：基线更干净，但可造成假性 ST 段抬高或压低，使 QRS 波群变小，并可能掩盖起搏钉样信号。\n- **交流电干扰**是规则的细小振荡，50 Hz（西班牙、欧洲、中国）或 60 Hz（美国）：应改善电极接触，而不是只靠陷波滤波。\n评价 ST 段之前，先看图纸上印的滤波设置。',
        '- **Diagnostic mode**: high-pass 0.05 Hz (up to 0.67 Hz only with a zero-phase filter) and low-pass at least 150 Hz in adults (250 Hz in children). This keeps the ST segment and small notches true.\n- **Monitor or “muscle” mode** (about 0.5–40 Hz): a cleaner baseline, but it can create false ST elevation or depression, shrink the QRS and hide pacemaker spikes.\n- **Mains interference** is a fine regular oscillation at 50 Hz (Spain, Europe, China) or 60 Hz (USA): fix the electrode contact rather than relying on the notch filter.\nRead the filter setting printed on the sheet before you judge the ST segment.',
        '- **Modo diagnóstico**: paso alto 0,05 Hz (hasta 0,67 Hz solo con filtro de fase cero) y paso bajo de al menos 150 Hz en adultos (250 Hz en niños). Así se conservan fielmente el segmento ST y las muescas pequeñas.\n- **Modo monitor o «muscular»** (unos 0,5-40 Hz): una línea de base más limpia, pero puede crear falsos ascensos o descensos del ST, reducir el QRS y ocultar las espigas del marcapasos.\n- La **interferencia de la red eléctrica** es una oscilación fina y regular a 50 Hz (España, Europa, China) o 60 Hz (EE. UU.): mejora el contacto de los electrodos en vez de confiar solo en el filtro de muesca.\nAntes de valorar el ST, mira el filtro impreso en la hoja.',
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
        '同一颗心脏、同一次心跳，只换了滤波。这颗心脏的高电压是真的（左心室肥厚）；A 中 ST 段平贴基线。B 中，V5–V6 高大 R 波之后的 ST 段在 J 点被拉到基线下约 1–2 mm（V6 最深），V1–V3 的 ST 段被抬高约 1–1.5 mm，QRS 也略变小：真实的肥厚电压被滤波“加上”了假的继发性 ST–T 改变，看起来像左心室肥厚伴继发性 ST–T 改变或缺血。这些 ST 改变来自滤波，不在心脏里。0.5 Hz 的单向高通滤波跟不上大 QRS 之后缓慢的平台期。判断 ST 段之前先看滤波设置；有疑问就用诊断模式重做。',
        'The same heart and the same beats, only the filter differs. The tall voltages are real (this heart has LVH); in A the ST segment lies on the baseline. In B the ST after the tall R waves of V5–V6 is dragged about 1–2 mm below the baseline at the J point (deepest in V6), the ST in V1–V3 is lifted about 1–1.5 mm and the QRS is a little smaller: the filter has added a false secondary ST–T change to a real hypertrophy voltage, so it looks like LVH with secondary ST–T change, or ischaemia. Those ST changes come from the filter, not from the heart. A one-way 0.5-Hz high-pass filter cannot follow the slow plateau after a large QRS. Read the filter setting before you judge the ST; when in doubt, record again in diagnostic mode.',
        'El mismo corazón y los mismos latidos; solo cambia el filtro. Los voltajes altos son reales (este corazón tiene HVI); en A el ST está sobre la línea de base. En B el ST que sigue a las R altas de V5-V6 queda arrastrado unos 1-2 mm por debajo de la línea de base en el punto J (más en V6), el de V1-V3 sube alrededor de 1-1,5 mm y el QRS es algo menor: el filtro ha añadido una falsa alteración secundaria del ST-T a un voltaje de hipertrofia real, de modo que parece una HVI con alteración secundaria del ST-T, o una isquemia. Esos cambios del ST vienen del filtro, no del corazón. Un filtro de paso alto de 0,5 Hz en un solo sentido no sigue la meseta lenta que hay tras un QRS grande. Lee el filtro antes de valorar el ST; si dudas, repite el registro en modo diagnóstico.',
      ),
    },
    {
      kind: 'criteria',
      title: l('记录标准', 'Recording standards', 'Estándares de registro'),
      items: [
        {
          label: l('高通（低频截止）', 'High-pass (low-frequency cut-off)', 'Paso alto (corte de baja frecuencia)'),
          value: l('0.05 Hz；只有零相位（线性相位）数字滤波才可用到 0.67 Hz', '0.05 Hz; up to 0.67 Hz only with zero-phase (linear-phase) digital filters', '0,05 Hz; hasta 0,67 Hz solo con filtros digitales de fase cero (fase lineal)'),
        },
        {
          label: l('低通（高频截止）', 'Low-pass (high-frequency cut-off)', 'Paso bajo (corte de alta frecuencia)'),
          value: l('成人 ≥ 150 Hz；儿童 ≥ 250 Hz', '≥ 150 Hz in adults; ≥ 250 Hz in children', '≥ 150 Hz en adultos; ≥ 250 Hz en niños'),
        },
        {
          label: l('采样率', 'Sampling rate', 'Frecuencia de muestreo'),
          value: l('诊断用 12 导联 ≥ 500 次/秒', '≥ 500 samples/s for a diagnostic 12-lead ECG', '≥ 500 muestras/s para un ECG diagnóstico de 12 derivaciones'),
        },
        {
          label: l('监护滤波（约 0.5–40 Hz）', 'Monitor filter (about 0.5–40 Hz)', 'Filtro de monitorización (unos 0,5-40 Hz)'),
          value: l(
            '不能用于 ST 段诊断：使 ST 段失真、QRS 变小，可能掩盖起搏钉样信号',
            'not for ST diagnosis: distorts the ST segment, shrinks the QRS, may hide pacing spikes',
            'no sirve para diagnosticar el ST: lo deforma, reduce el QRS y puede ocultar las espigas de estimulación',
          ),
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
        '真实记录：找到定标脉冲，读出走纸速度和增益，再测量一个 RR 间期（毫秒）并换算成心率。',
        'Real recordings: find the calibration pulse, read speed and gain, then measure one RR interval in ms and turn it into a rate.',
        'Registros reales: localiza el pulso de calibración, lee la velocidad y la ganancia, mide un intervalo RR en ms y conviértelo en frecuencia.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '不看定标脉冲就测量：半增益记录会把肥厚的电压变成“正常”。',
          'Measuring before checking the pulse: a half-gain recording turns a hypertrophy voltage into a “normal” one.',
          'Medir sin mirar el pulso: un registro a media ganancia convierte un voltaje de hipertrofia en uno «normal».',
        ),
        l(
          '没注意 50 mm/s：每个间期都显得长一倍，心率显得慢一半。',
          'Missing a 50 mm/s recording: every interval looks twice as long and the rate half as fast.',
          'No advertir un registro a 50 mm/s: todos los intervalos parecen el doble de largos y la frecuencia, la mitad.',
        ),
        l(
          '在监护滤波的图上判断 ST 段改变：先做一份诊断模式的 12 导联心电图。',
          'Calling ST changes on a monitor-filtered tracing: record a diagnostic 12-lead ECG first.',
          'Diagnosticar cambios del ST en un trazado con filtro de monitorización: primero registra un ECG diagnóstico de 12 derivaciones.',
        ),
        l(
          '把不同列中的心跳当作同时发生来比较。',
          'Comparing beats in different columns as if they were simultaneous.',
          'Comparar latidos de columnas distintas como si fueran simultáneos.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('先看走纸速度和定标脉冲。', 'Check the speed and the calibration pulse first.', 'Mira primero la velocidad y el pulso de calibración.'),
        l('25 mm/s：小格 40 ms，大格 200 ms。', '25 mm/s: small square 40 ms, large square 200 ms.', '25 mm/s: cuadro pequeño 40 ms, cuadro grande 200 ms.'),
        l('10 mm/mV：小格 0.1 mV，大格 0.5 mV。', '10 mm/mV: small square 0.1 mV, large square 0.5 mV.', '10 mm/mV: cuadro pequeño 0,1 mV, cuadro grande 0,5 mV.'),
        l(
          '诊断带宽 0.05–150 Hz；监护滤波会使 ST 段失真。',
          'Diagnostic bandwidth 0.05–150 Hz; monitor filters distort the ST segment.',
          'Ancho de banda diagnóstico 0,05-150 Hz; los filtros de monitorización deforman el ST.',
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
