/**
 * f1 — The conduction system and what each part draws (stage F, docs/PLAN.md §3).
 * Taught by motion (docs/design/f-explainers.md §4.1, §5): the 3D heart, then the conduction-journey scene, whose
 * narration, chips and end-frame labels carry the speeds, the action-potential map and the "what each part draws"
 * numbers; prose survives only in the hook, the what-ifs (PR dial, WPW contrast), the checks and the summary.
 * Criteria: docs/curriculum/criteria.md `ap-ecg-map`, `cell-response-types`, `atrial-repol-hidden`, `intrinsic-rates`,
 * `pr-normal`, `qrs-duration-normal`, `p-wave-normal`.
 */
import type { Lesson } from '../api';
import { l } from '../../core/l10n';
import { choiceItem, real, SRC, syn } from './f-shared';

const lesson: Lesson = {
  id: 'f1',
  stage: 'F',
  order: 1,
  title: l('传导系统：每一部分在心电图上画出什么', 'The conduction system and what each part draws', 'El sistema de conducción y lo que dibuja cada parte'),
  summary: l(
    '沿着一次心跳的传导路径走一遍，把心电图的每一段对应到心脏的一个部位。',
    'Follow one heartbeat along its conduction path and match every part of the tracing to a part of the heart.',
    'Sigue un latido por su vía de conducción y relaciona cada parte del trazado con una parte del corazón.',
  ),
  objectives: [
    l(
      '按顺序说出传导路径：窦房结 → 心房 → 房室结 → 希氏束 → 束支 → 浦肯野纤维 → 心室肌。',
      'Name the path in order: sinus node → atria → AV node → His bundle → bundle branches → Purkinje → ventricles.',
      'Nombrar la vía en orden: nodo sinusal → aurículas → nodo AV → haz de His → ramas → Purkinje → ventrículos.',
    ),
    l('把 P、PR、QRS、ST 和 T 对应到产生它们的电活动。', 'Match P, PR, QRS, ST and T to the event behind each.', 'Relacionar P, PR, QRS, ST y T con el fenómeno que produce cada uno.'),
    l(
      '解释为什么结区和希氏束–浦肯野系统在体表心电图上看不见。',
      'Explain why the nodes and the His–Purkinje system are invisible on the surface ECG.',
      'Explicar por qué los nodos y el sistema His-Purkinje no se ven en el ECG de superficie.',
    ),
    l(
      '预测传导路径某一段变慢、被绕过或中断时，心电图哪一部分改变。',
      'Predict which part of the tracing changes when part of the path slows, is bypassed or fails.',
      'Predecir qué parte del trazado cambia si un tramo de la vía se enlentece, se salta o falla.',
    ),
  ],
  minutes: 8,
  competencies: ['C1'],
  findings: ['normal-ecg', 'sinus-rhythm'],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 111),
      view: { layout: 'strip', lead: 'II' },
      question: l(
        '这是 II 导联。每一搏有五个结构依次激动：窦房结、心房、房室结、希氏束–浦肯野系统（希氏束及左右束支、浦肯野纤维）、心室。哪些画出了波？',
        'This is lead II. Each beat, five structures fire in turn: sinus node, atria, AV node, His–Purkinje system (the His bundle with its two bundle branches and the Purkinje fibres), ventricles. Which of them draw a wave?',
        'Esto es la derivación II. En cada latido se activan por orden cinco estructuras: nodo sinusal, aurículas, nodo AV, sistema His-Purkinje (el haz de His con sus dos ramas y las fibras de Purkinje) y ventrículos. ¿Cuáles dibujan una onda?',
      ),
      reveal: l(
        '只有**心肌**画出波：心房 → P 波，心室 → QRS 波群和 T 波。窦房结、房室结和希氏束–浦肯野系统细胞太少，只表现为**时间**：窦房结决定心率（P–P），房室结和希氏束–浦肯野系统形成平直的 PR 段。',
        'Only **muscle** draws waves: atria → P, ventricles → QRS and T. The sinus node, AV node and His–Purkinje system are too few cells to be seen at the skin; they show only as **timing**: the sinus node as the rate (P to P), the AV node and His–Purkinje as the flat PR segment.',
        'Solo el **músculo** dibuja ondas: aurículas → P; ventrículos → QRS y T. El nodo sinusal, el nodo AV y el sistema His-Purkinje tienen muy pocas células para verse en la piel; solo se notan como **tiempo**: el nodo sinusal, en la frecuencia (de P a P); el nodo AV y el His-Purkinje, en el segmento PR plano.',
      ),
    },
    {
      kind: 'heart',
      ecg: syn('normal', 111),
      showConduction: true,
      emphasize: ['sa-node', 'av-node', 'his', 'rbb', 'lbb', 'purkinje'],
      caption: l(
        '点击“慢放一个心动周期”，看光标经过每个波时心脏哪一部分亮起。',
        'Press “Play one beat in slow motion” and watch which part of the heart lights up as the cursor crosses each wave.',
        'Pulsa «Reproducir un latido a cámara lenta» y observa qué parte del corazón se ilumina cuando el cursor cruza cada onda.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'conduction-journey' },
      ecg: syn('normal', 111),
      caption: l(
        '这一搏进入视野时自动播放一次。点“重播”，或把滑块拖回 QRS 前的平直段，看此刻亮的是哪个结构。',
        'The beat plays once as it comes into view. Press Replay, or drag the slider back to the flat line before the QRS and find which structure is lit there.',
        'El latido se reproduce una vez al aparecer en pantalla. Pulsa «Repetir» o arrastra el control deslizante hasta la línea plana antes del QRS y mira qué estructura está encendida.',
      ),
    },
    {
      kind: 'live',
      scenario: 'normal',
      seed: 112,
      dials: [{ id: 'pr', label: l('房室结延迟（PR 间期）', 'AV-node delay (PR interval)', 'Retraso del nodo AV (intervalo PR)') }],
      view: { layout: 'strip', lead: 'II', window: [0, 5000] },
      // PR on the middle beat, QRS on the next one (two labels on one beat overlap)
      marks: [{ auto: 'pr' }, { auto: 'qrs', beat: 4 }],
      caption: l(
        '拖动房室结延迟：只有 PR 间期变长或变短，P 波和 QRS 波群形状不变。',
        'Drag the AV-node delay: only the PR interval stretches or shrinks; P and QRS keep their shape.',
        'Mueve el retraso del nodo AV: solo se alarga o se acorta el intervalo PR; la P y el QRS no cambian de forma.',
      ),
    },
    {
      kind: 'contrast',
      title: l('绕过闸门', 'Bypassing the gate', 'Saltarse la puerta'),
      view: { layout: 'strip', lead: 'II', window: [0, 5000] },
      left: {
        ecg: syn('normal', 114),
        caption: l('正常传导', 'Normal conduction', 'Conducción normal'),
        marks: [{ auto: 'pr' }, { auto: 'qrs', beat: 4 }],
      },
      right: {
        ecg: syn('wpw', 114),
        caption: l('另一位年轻人', 'Another young adult', 'Otro adulto joven'),
        marks: [{ auto: 'pr' }, { auto: 'delta', beat: 4 }],
      },
      point: l(
        'B 有一条旁路绕过房室结：PR 间期短（< 120 ms）。旁路先激动的那部分心室只能靠心肌之间缓慢传导，于是 QRS 起始顿挫（δ 波）、波群变宽。可见房室结延迟是 PR 间期的主体。',
        'In B an accessory pathway bypasses the AV node: the PR is short (< 120 ms). The part of the ventricle it reaches first is activated slowly, muscle to muscle, so the QRS starts with a slur (delta wave) and is wider. The AV-node delay is most of the PR.',
        'En B una vía accesoria se salta el nodo AV: el PR es corto (< 120 ms). La parte del ventrículo que alcanza primero se activa despacio, de célula a célula: el QRS empieza empastado (onda delta) y es más ancho. El retraso del nodo AV es la mayor parte del PR.',
      ),
    },
    {
      kind: 'check',
      item: {
        inline: choiceItem({
          family: 'waves',
          competency: 'C1',
          seed: 11001,
          ecg: syn('normal', 115),
          view: { layout: 'strip', lead: 'II', window: [0, 5000] },
          prompt: l(
            '从 P 波结束到 QRS 开始，基线是平的。这时冲动在哪里？',
            'From the end of P to the start of QRS the line is flat. Where is the impulse?',
            'Desde el final de la P hasta el inicio del QRS la línea es plana. ¿Dónde está el impulso?',
          ),
          options: [
            { id: 'av', label: l('正在通过房室结和希氏束–浦肯野系统', 'Crossing the AV node and the His–Purkinje system', 'Atravesando el nodo AV y el sistema His-Purkinje') },
            { id: 'rest', label: l('哪里也不在：心脏在休息', 'Nowhere: the heart is at rest', 'En ninguna parte: el corazón está en reposo') },
            { id: 'sa', label: l('还在窦房结里', 'Still inside the sinus node', 'Todavía dentro del nodo sinusal') },
            { id: 'vent', label: l('在心室肌里', 'In the ventricular muscle', 'En el miocardio ventricular') },
          ],
          correct: 'av',
          explanation: l(
            '冲动正在通过房室结和希氏束–浦肯野系统：细胞太少，画不出波。房室结变慢时，变长的就是这一段。',
            'It is crossing the AV node and His–Purkinje system: too few cells to draw a wave. When the AV node slows, this is the segment that lengthens.',
            'Está atravesando el nodo AV y el sistema His-Purkinje: muy pocas células para dibujar una onda. Si el nodo AV se enlentece, es este segmento el que se alarga.',
          ),
        }),
      },
    },
    {
      kind: 'check',
      item: {
        inline: choiceItem({
          family: 'waves',
          competency: 'C1',
          seed: 11002,
          ecg: syn('lbbb', 116),
          view: { layout: '3x4+1' },
          prompt: l(
            'P 波和 PR 间期正常，但 QRS 宽（≥ 120 ms）。传导路径哪一部分出了问题？',
            'The P wave and PR interval are normal, but the QRS is wide (≥ 120 ms). Which part of the path is failing?',
            'La onda P y el intervalo PR son normales, pero el QRS es ancho (≥ 120 ms). ¿Qué parte de la vía falla?',
          ),
          options: [
            { id: 'branch', label: l('一侧束支', 'One bundle branch', 'Una de las ramas') },
            { id: 'av', label: l('房室结', 'The AV node', 'El nodo AV') },
            { id: 'sa', label: l('窦房结', 'The sinus node', 'El nodo sinusal') },
            { id: 'atria', label: l('心房', 'The atria', 'Las aurículas') },
          ],
          correct: 'branch',
          explanation: l(
            'P 和 PR 正常，说明窦房结、心房和房室结没问题。宽 QRS 说明部分心室没走浦肯野系统，而是靠心肌之间缓慢传导——这里是左束支阻滞（第 r6 课）。',
            'A normal P and PR clear the sinus node, atria and AV node. A wide QRS means part of the ventricles was reached muscle to muscle instead of through Purkinje — here a left bundle branch block (lesson r6).',
            'Una P y un PR normales descartan el nodo sinusal, las aurículas y el nodo AV. Un QRS ancho indica que parte de los ventrículos se activó de célula a célula y no por Purkinje: aquí, un bloqueo de rama izquierda (lección r6).',
          ),
        }),
      },
    },
    { kind: 'check', item: { family: 'waves', seed: 11003 } },
    { kind: 'drill', families: ['waves'], count: 5, passScore: 0.8 },
    {
      kind: 'real',
      ids: [1101, 13683],
      caption: l(
        '真实患者：在每份心电图上找出 P、PR、QRS、ST 和 T，并说出每一段背后的电活动。',
        'Real patients: find P, PR, QRS, ST and T on each tracing and name the event behind each.',
        'Pacientes reales: localiza P, PR, QRS, ST y T en cada trazado y di qué fenómeno hay detrás de cada uno.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'P 波不是窦房结放电：放电看不见，P 波是心房肌除极。',
          'P is not the sinus node firing: that is invisible; P is atrial muscle depolarizing.',
          'La P no es la descarga del nodo sinusal, que no se ve: es la despolarización del miocardio auricular.',
        ),
        l(
          '平直的 PR 段和 ST 段不是“没有电活动”：PR 时冲动在传导，ST 时心室在平台期。',
          'Flat PR and ST segments are not “no activity”: during PR the impulse travels, during ST the ventricles are on their plateau.',
          'Los segmentos PR y ST planos no son «sin actividad»: en el PR el impulso viaja y en el ST los ventrículos están en meseta.',
        ),
        l(
          '不必寻找心房复极波（Ta 波）：它通常藏在 PR 段和 QRS 波群里。',
          'Don’t hunt for the atrial repolarization (Ta) wave: it normally hides in the PR segment and the QRS.',
          'No busques la onda de repolarización auricular (Ta): suele quedar oculta en el segmento PR y en el QRS.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '导线 = 时间，肌肉 = 波：心房 → P（< 120 ms），心室 → QRS 和 T。',
          'Wire = time, muscle = waves: atria → P (< 120 ms), ventricles → QRS and T.',
          'Cable = tiempo, músculo = ondas: aurículas → P (< 120 ms); ventrículos → QRS y T.',
        ),
        l(
          '房室结和希氏束–浦肯野系统只占时间——平直的 PR 段；PR 间期（P 起点 → QRS 起点）120–200 ms；房室结慢 → PR 长，被绕过 → PR 短。',
          'The AV node and His–Purkinje only take time — the flat PR segment; the PR interval (P onset → QRS onset) is 120–200 ms; slow AV node → long PR, bypassed → short PR.',
          'El nodo AV y el His-Purkinje solo ocupan tiempo (el segmento PR plano); el intervalo PR (inicio de la P → inicio del QRS) mide 120-200 ms; nodo AV lento → PR largo; saltado → PR corto.',
        ),
        l(
          '走浦肯野系统（2–4 m/s）→ QRS 窄（< 110 ms）；心肌之间传导（0.3–1 m/s）→ QRS 宽（束支阻滞 ≥ 120 ms）。',
          'Through Purkinje (2–4 m/s) → narrow QRS (< 110 ms); muscle to muscle (0.3–1 m/s) → wide QRS (≥ 120 ms in bundle branch block).',
          'Por Purkinje (2-4 m/s) → QRS estrecho (< 110 ms); de célula a célula (0,3-1 m/s) → QRS ancho (≥ 120 ms en el bloqueo de rama).',
        ),
        l(
          '固有频率：窦房结 60–100 次/分，交界区 35–60 次/分，心室 20–40 次/分。',
          'Intrinsic rates: sinus node 60–100/min, junction 35–60/min, ventricles 20–40/min.',
          'Frecuencias intrínsecas: nodo sinusal 60-100 lpm, unión AV 35-60 lpm, ventrículos 20-40 lpm.',
        ),
        l('动作电位：0 相 = QRS，2 相 = ST，3 相 = T。', 'Action potential: phase 0 = QRS, phase 2 = ST, phase 3 = T.', 'Potencial de acción: fase 0 = QRS, fase 2 = ST, fase 3 = T.'),
      ],
    },
  ],
  sources: [
    SRC.kligfield,
    'Nerbonne JM, Kass RS. Molecular physiology of cardiac repolarization. Physiol Rev 2005;85:1205-1253',
    'Mangoni ME, Nargeot J. Genesis and regulation of the heart automaticity. Physiol Rev 2008;88:919-982',
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    'Surawicz B et al. AHA/ACCF/HRS Recommendations Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240',
    'Hancock EW et al. AHA/ACCF/HRS Recommendations Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261',
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular tachycardia. Eur Heart J 2020;41:655-720',
    SRC.book,
  ],
};

export default lesson;
