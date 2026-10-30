/**
 * f1 — The conduction system and what each part draws (stage F, docs/PLAN.md §3).
 * Short and causal: only the physiology that explains the waves (critic.json learning path, stage 1).
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
      '按顺序说出传导路径：窦房结 → 心房 → 房室结 → 希氏束 → 左、右束支 → 浦肯野纤维 → 心室肌。',
      'Name the conduction path in order: sinus node → atria → AV node → His bundle → bundle branches → Purkinje network → ventricular muscle.',
      'Nombrar en orden la vía de conducción: nodo sinusal → aurículas → nodo AV → haz de His → ramas → red de Purkinje → miocardio ventricular.',
    ),
    l(
      '把 P 波、PR 段、QRS 波群、ST 段和 T 波对应到产生它们的电活动。',
      'Match the P wave, PR segment, QRS complex, ST segment and T wave to the electrical event behind each one.',
      'Relacionar la onda P, el segmento PR, el complejo QRS, el segmento ST y la onda T con el fenómeno eléctrico que los produce.',
    ),
    l(
      '解释为什么窦房结、房室结和希氏束–浦肯野系统本身在体表心电图上看不见。',
      'Explain why the sinus node, the AV node and the His–Purkinje system are themselves invisible on the surface ECG.',
      'Explicar por qué el nodo sinusal, el nodo AV y el sistema His-Purkinje no se ven por sí mismos en el ECG de superficie.',
    ),
    l(
      '预测传导路径的某一段变慢、被绕过或中断时，心电图的哪一部分会改变。',
      'Predict which part of the tracing changes when one part of the path slows down, is bypassed or fails.',
      'Predecir qué parte del trazado cambia cuando una parte de la vía se enlentece, se salta o falla.',
    ),
  ],
  minutes: 9,
  competencies: ['C1'],
  findings: ['normal-ecg', 'sinus-rhythm'],
  blocks: [
    {
      kind: 'hook',
      ecg: syn('normal', 111),
      view: { layout: 'strip', lead: 'II' },
      question: l(
        '这是一条 II 导联记录。每个心动周期里，五个结构依次激动：窦房结、心房、房室结、希氏束–浦肯野系统、心室。哪些结构画出了看得见的波，哪些什么也没画？',
        'This is lead II. In every cycle five structures fire in turn: sinus node, atria, AV node, His–Purkinje system, ventricles. Which of them draw a visible wave, and which draw nothing at all?',
        'Esto es la derivación II. En cada ciclo se activan por orden cinco estructuras: nodo sinusal, aurículas, nodo AV, sistema His-Purkinje y ventrículos. ¿Cuáles dibujan una onda visible y cuáles no dibujan nada?',
      ),
      reveal: l(
        '只有**心肌**画出波：心房肌产生 P 波，心室肌产生 QRS 波群和 T 波。窦房结、房室结和希氏束–浦肯野系统细胞太少，产生的电压在体表测不到。它们的工作只能从**时间**上看出来，例如 PR 段的长短。',
        'Only **muscle** draws waves: atrial muscle makes the P wave, ventricular muscle makes the QRS complex and the T wave. The sinus node, the AV node and the His–Purkinje system contain too few cells to produce a voltage you can see at the skin. You see their work only as **timing**, for example the length of the PR segment.',
        'Solo el **músculo** dibuja ondas: el miocardio auricular genera la onda P y el ventricular, el complejo QRS y la onda T. El nodo sinusal, el nodo AV y el sistema His-Purkinje tienen muy pocas células para generar un voltaje visible en la piel. Su trabajo solo se ve como **tiempo**, por ejemplo en la duración del segmento PR.',
      ),
    },
    {
      kind: 'heart',
      ecg: syn('normal', 111),
      showConduction: true,
      emphasize: ['sa-node', 'av-node', 'his', 'rbb', 'lbb', 'purkinje'],
      caption: l(
        '点击“慢放一个心动周期”：窦房结先发放（没有波），心房激动（P 波），冲动在房室结中等待（平直的 PR 段），然后希氏束–浦肯野系统在不到十分之一秒内把它送遍两个心室（QRS 波群）。',
        'Press “Play one beat in slow motion”: the sinus node fires (no wave), the atria activate (P wave), the impulse waits in the AV node (flat PR segment), then the His–Purkinje system delivers it to both ventricles in under a tenth of a second (QRS complex).',
        'Pulsa «Reproducir un latido a cámara lenta»: el nodo sinusal descarga (sin onda), las aurículas se activan (onda P), el impulso espera en el nodo AV (segmento PR plano) y el sistema His-Purkinje lo reparte por ambos ventrículos en menos de una décima de segundo (complejo QRS).',
      ),
    },
    {
      kind: 'text',
      title: l('快速的电缆，缓慢的闸门', 'Fast cables, a slow gate', 'Cables rápidos y una puerta lenta'),
      body: l(
        '各段传导速度相差很大，这个差别决定了心电图的形状：\n- **房室结**很慢（约 0.02–0.05 m/s）。它让心房先收缩完毕，占 PR 间期的大部分。\n- **希氏束–浦肯野纤维**很快（2–4 m/s）。它几乎同时到达整个心室内膜，所以正常 QRS 波群很窄。\n- **心肌细胞之间**的传导较慢（0.3–1 m/s）。激动一旦不能走浦肯野系统，QRS 波群就会变宽。',
        'Conduction speeds differ a lot, and that difference shapes the tracing:\n- The **AV node** is slow (about 0.02–0.05 m/s). It lets the atria finish contracting and takes up most of the PR interval.\n- The **His–Purkinje** network is fast (2–4 m/s). It reaches the inner wall of both ventricles almost at once, so a normal QRS is narrow.\n- **Muscle-to-muscle** spread is slower (0.3–1 m/s). When activation cannot use the Purkinje network, the QRS widens.',
        'Las velocidades de conducción son muy distintas, y esa diferencia da forma al trazado:\n- El **nodo AV** es lento (unos 0,02-0,05 m/s). Deja que las aurículas terminen de contraerse y ocupa la mayor parte del intervalo PR.\n- La red de **His-Purkinje** es rápida (2-4 m/s). Llega casi a la vez a la cara interna de ambos ventrículos, por eso el QRS normal es estrecho.\n- La propagación **de célula muscular a célula muscular** es más lenta (0,3-1 m/s). Cuando la activación no puede usar la red de Purkinje, el QRS se ensancha.',
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
        '拖动滑块改变房室结的延迟：只有 PR 间期变长或变短，P 波和 QRS 波群的形状都不变。延迟发生在一个“看不见”的结构里，所以只表现为时间。',
        'Drag the slider to change the AV-node delay: only the PR interval stretches or shrinks; the P wave and the QRS keep their shape. The delay happens in an “invisible” structure, so it shows only as time.',
        'Mueve el control para cambiar el retraso del nodo AV: solo se alarga o se acorta el intervalo PR; la onda P y el QRS conservan su forma. El retraso ocurre en una estructura «invisible», así que solo se ve como tiempo.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'action-potential', params: { cell: 'ventricular' } },
      ecg: syn('normal', 111),
      caption: l(
        '心室肌细胞的动作电位与体表心电图对齐：0 相对应 QRS 波群，1 相对应 J 点，2 相（平台期）对应 ST 段，3 相对应 T 波，4 相对应 TP 段。平台期所有心室细胞都处于除极状态，彼此没有电位差，所以 ST 段是平的。',
        'A ventricular action potential lined up with the surface ECG: phase 0 = QRS, phase 1 = J point, phase 2 (plateau) = ST segment, phase 3 = T wave, phase 4 = TP segment. During the plateau every ventricular cell is depolarized, so there is no voltage difference between regions — that is why the ST segment is flat.',
        'Potencial de acción ventricular alineado con el ECG de superficie: fase 0 = QRS, fase 1 = punto J, fase 2 (meseta) = segmento ST, fase 3 = onda T, fase 4 = segmento TP. Durante la meseta todas las células ventriculares están despolarizadas y no hay diferencia de potencial entre regiones: por eso el segmento ST es plano.',
      ),
    },
    {
      kind: 'criteria',
      title: l('每一部分画出什么', 'What each part draws', 'Qué dibuja cada parte'),
      items: [
        {
          label: l('窦房结', 'Sinus node', 'Nodo sinusal'),
          value: l(
            '没有自己的波；静息时发放 60–100 次/分（备用起搏点：交界区 35–60，心室 20–40）',
            'no wave of its own; fires at 60–100/min at rest (back-ups: junction 35–60, ventricles 20–40)',
            'sin onda propia; descarga a 60-100 lpm en reposo (marcapasos de reserva: unión AV 35-60, ventrículos 20-40)',
          ),
        },
        {
          label: l('心房肌除极', 'Atrial depolarization', 'Despolarización auricular'),
          value: l('P 波（成人时限 < 120 ms）', 'P wave (adult duration < 120 ms)', 'onda P (duración en el adulto < 120 ms)'),
        },
        {
          label: l('心房复极（Ta 波）', 'Atrial repolarization (Ta wave)', 'Repolarización auricular (onda Ta)'),
          value: l('方向与 P 波相反，通常隐没在 PR 段和 QRS 波群中', 'opposite to P; usually hidden in the PR segment and the QRS', 'de sentido opuesto a la P; suele quedar oculta en el segmento PR y en el QRS'),
        },
        {
          label: l('房室结与希氏束–浦肯野系统', 'AV node and His–Purkinje system', 'Nodo AV y sistema His-Purkinje'),
          value: l('无波形：平直的 PR 段；PR 间期 120–200 ms', 'silent: the flat PR segment; PR interval 120–200 ms', 'silenciosos: el segmento PR plano; intervalo PR 120-200 ms'),
        },
        {
          label: l('心室除极（0 相）', 'Ventricular depolarization (phase 0)', 'Despolarización ventricular (fase 0)'),
          value: l('QRS 波群（成人 < 110 ms）', 'QRS complex (adult < 110 ms)', 'complejo QRS (adulto < 110 ms)'),
        },
        {
          label: l('平台期（2 相）', 'Plateau (phase 2)', 'Meseta (fase 2)'),
          value: l('ST 段', 'ST segment', 'segmento ST'),
        },
        {
          label: l('心室复极（3 相）', 'Ventricular repolarization (phase 3)', 'Repolarización ventricular (fase 3)'),
          value: l('T 波', 'T wave', 'onda T'),
        },
      ],
      source:
        'Nerbonne JM, Kass RS. Physiol Rev 2005;85:1205-1253; Kusumoto FM et al. 2018 ACC/AHA/HRS bradycardia guideline (Circulation 2019;140:e382); Hancock EW et al. AHA/ACCF/HRS 2009 Part V (Circulation 2009;119:e251); Surawicz B et al. AHA/ACCF/HRS 2009 Part III (Circulation 2009;119:e235)',
    },
    {
      kind: 'worked',
      title: l('一次心跳，逐段看', 'One beat, part by part', 'Un latido, parte por parte'),
      ecg: syn('normal', 113),
      view: { layout: 'strip', lead: 'II', window: [0, 5000] },
      steps: [
        {
          title: l('P 波：心房', 'P wave: the atria', 'Onda P: las aurículas'),
          body: l(
            '窦性激动从右上向左下扩布到两个心房。在 II 导联，这个方向朝向正极，所以 P 波直立。心房肌量小，P 波低（< 2.5 mm）。',
            'The sinus impulse spreads over both atria from upper right to lower left. In lead II that direction heads toward the positive pole, so P is upright. Atrial mass is small, so P is low (< 2.5 mm).',
            'El impulso sinusal recorre ambas aurículas de arriba a la derecha hacia abajo a la izquierda. En II esa dirección va hacia el polo positivo, así que la P es positiva. La masa auricular es pequeña: la P es baja (< 2,5 mm).',
          ),
          marks: [{ auto: 'p' }],
        },
        {
          title: l('PR 段：房室结在工作', 'PR segment: the AV node at work', 'Segmento PR: el nodo AV trabajando'),
          body: l(
            '从 P 波结束到 QRS 起点，基线是平的，但传导并没有停：冲动正在通过房室结、希氏束和束支。这些细胞太少，画不出波。整个 PR 间期（P 波起点到 QRS 起点）为 120–200 ms。',
            'From the end of P to the start of QRS the line is flat, yet conduction is busy: the impulse is crossing the AV node, the His bundle and the bundle branches. These cells are too few to draw a wave. The whole PR interval (P onset to QRS onset) is 120–200 ms.',
            'Desde el final de la P hasta el inicio del QRS la línea es plana, pero la conducción no se detiene: el impulso atraviesa el nodo AV, el haz de His y las ramas. Son muy pocas células para dibujar una onda. El intervalo PR completo (inicio de la P a inicio del QRS) mide 120-200 ms.',
          ),
          marks: [{ auto: 'pr-segment' }],
        },
        {
          title: l('QRS：心室除极', 'QRS: the ventricles depolarize', 'QRS: los ventrículos se despolarizan'),
          body: l(
            '浦肯野网络几乎同时把冲动送到两个心室的内膜，激动再由内向外穿过心室壁。心肌量大、扩布快：波群高而窄。',
            'The Purkinje network hands the impulse to the inner wall of both ventricles almost at once; the wave then crosses the wall from inside out. Large mass, fast spread: a tall, narrow complex.',
            'La red de Purkinje entrega el impulso casi a la vez a la cara interna de ambos ventrículos; luego la activación cruza la pared de dentro afuera. Mucha masa y propagación rápida: un complejo alto y estrecho.',
          ),
          marks: [{ auto: 'qrs' }],
        },
        {
          title: l('ST 段：平台期', 'ST segment: the plateau', 'Segmento ST: la meseta'),
          body: l(
            '此时所有心室细胞都已除极，停留在平台期。各处之间没有电位差，所以 ST 段平直，与 PR 段处于同一水平。',
            'Every ventricular cell is now depolarized and holds its plateau. With no voltage difference between regions, the ST segment is flat and level with the PR segment.',
            'Ahora todas las células ventriculares están despolarizadas y mantienen su meseta. Sin diferencia de potencial entre regiones, el segmento ST es plano y está al nivel del segmento PR.',
          ),
          marks: [{ auto: 'st' }],
        },
        {
          title: l('T 波：恢复', 'T wave: recovery', 'Onda T: la recuperación'),
          body: l(
            '心室复极。复极比除极慢、也不那么同步，所以 T 波比 QRS 波群宽而低。心房复极也存在，但藏在 PR 段和 QRS 波群里。',
            'The ventricles repolarize. Recovery is slower and less synchronous than activation, so T is broader and lower than the QRS. Atrial repolarization exists too, but it hides inside the PR segment and the QRS.',
            'Los ventrículos se repolarizan. La recuperación es más lenta y menos sincrónica que la activación, así que la T es más ancha y más baja que el QRS. La repolarización auricular también existe, pero queda oculta en el segmento PR y en el QRS.',
          ),
          marks: [{ auto: 't' }],
        },
      ],
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
        '在 B 中，一条旁路直接连接心房和心室，冲动不必在房室结等待：PR 间期缩短（< 120 ms）。旁路先激动的那部分心室只能靠心肌之间慢慢传导，所以 QRS 起始部顿挫（δ 波），波群变宽。房室结的延迟就是 PR 间期的主体。',
        'In B an accessory pathway joins atrium and ventricle directly, so the impulse does not wait in the AV node: the PR interval is short (< 120 ms). The part of the ventricle reached through the pathway is activated muscle to muscle, slowly, so the QRS starts with a slur (the delta wave) and is wider. The AV-node delay is most of the PR interval.',
        'En B una vía accesoria une directamente aurícula y ventrículo, así que el impulso no espera en el nodo AV: el PR es corto (< 120 ms). La parte del ventrículo activada por la vía se activa de célula a célula, lentamente, por eso el QRS empieza con un empastamiento (onda delta) y es más ancho. El retraso del nodo AV es la mayor parte del intervalo PR.',
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
            '在每个 P 波结束到 QRS 波群开始之间，基线是平的。这时冲动在哪里？',
            'Between the end of each P wave and the start of the QRS the line is flat. Where is the impulse at that moment?',
            'Entre el final de cada onda P y el inicio del QRS la línea es plana. ¿Dónde está el impulso en ese momento?',
          ),
          options: [
            { id: 'av', label: l('正在通过房室结和希氏束–浦肯野系统', 'Crossing the AV node and the His–Purkinje system', 'Atravesando el nodo AV y el sistema His-Purkinje') },
            { id: 'rest', label: l('哪里也不在：心脏在休息', 'Nowhere: the heart is at rest', 'En ninguna parte: el corazón está en reposo') },
            { id: 'sa', label: l('还在窦房结里', 'Still inside the sinus node', 'Todavía dentro del nodo sinusal') },
            { id: 'vent', label: l('在心室肌里', 'In the ventricular muscle', 'En el miocardio ventricular') },
          ],
          correct: 'av',
          explanation: l(
            'PR 段平直，是因为房室结和希氏束–浦肯野系统细胞太少，产生的电压在体表看不到——并不是没有传导。房室结传导减慢时，变长的正是这一段。',
            'The PR segment is flat because the AV node and the His–Purkinje system are too small to produce a visible voltage — not because nothing is happening. When AV-node conduction slows, this is the segment that lengthens.',
            'El segmento PR es plano porque el nodo AV y el sistema His-Purkinje son demasiado pequeños para dar un voltaje visible, no porque no ocurra nada. Cuando la conducción del nodo AV se enlentece, es este segmento el que se alarga.',
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
            'P 波和 PR 间期正常，但 QRS 波群宽（≥ 120 ms）。传导路径的哪一部分没有正常工作？',
            'The P wave and the PR interval are normal, but the QRS is wide (≥ 120 ms). Which part of the conduction path is not working normally?',
            'La onda P y el intervalo PR son normales, pero el QRS es ancho (≥ 120 ms). ¿Qué parte de la vía de conducción no funciona con normalidad?',
          ),
          options: [
            { id: 'branch', label: l('一侧束支', 'One bundle branch', 'Una de las ramas') },
            { id: 'av', label: l('房室结', 'The AV node', 'El nodo AV') },
            { id: 'sa', label: l('窦房结', 'The sinus node', 'El nodo sinusal') },
            { id: 'atria', label: l('心房', 'The atria', 'Las aurículas') },
          ],
          correct: 'branch',
          explanation: l(
            'P 波和 PR 正常，说明窦房结、心房和房室结都正常。宽 QRS 说明心室有一部分没有通过快速的浦肯野系统，而是靠心肌之间缓慢传导——这里是左束支阻滞。束支阻滞在第 r6 课详细讲。',
            'A normal P and PR clear the sinus node, the atria and the AV node. A wide QRS means part of the ventricles was not reached through the fast Purkinje network but slowly, muscle to muscle — here a left bundle branch block. Bundle branch blocks are covered in lesson r6.',
            'Una P y un PR normales descartan el nodo sinusal, las aurículas y el nodo AV. Un QRS ancho indica que parte de los ventrículos no se activó por la red rápida de Purkinje, sino lentamente, de célula a célula: aquí, un bloqueo de rama izquierda. Los bloqueos de rama se tratan en la lección r6.',
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
        '换成真实患者：在每份心电图上找出 P 波、PR 段、QRS 波群、ST 段和 T 波，并说出每一段对应传导系统的哪一部分。',
        'Now real patients: on each tracing find the P wave, PR segment, QRS complex, ST segment and T wave, and say which part of the conduction path each one shows.',
        'Ahora, pacientes reales: en cada trazado localiza la onda P, el segmento PR, el complejo QRS, el segmento ST y la onda T, y di qué parte de la vía de conducción refleja cada uno.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '以为 P 波就是窦房结发放：窦房结的放电看不见，P 波是心房肌的除极。',
          'Thinking the P wave is the sinus node firing: the sinus discharge is invisible; P is atrial muscle depolarizing.',
          'Creer que la onda P es la descarga del nodo sinusal: esa descarga no se ve; la P es la despolarización del miocardio auricular.',
        ),
        l(
          '以为平直的 PR 段和 ST 段表示“没有电活动”：PR 段时冲动正在传导，ST 段时心室处于平台期。',
          'Reading the flat PR and ST segments as “no electrical activity”: during PR the impulse is travelling, during ST the ventricles are on their plateau.',
          'Leer los segmentos PR y ST planos como «sin actividad eléctrica»: durante el PR el impulso está viajando y durante el ST los ventrículos están en meseta.',
        ),
        l(
          '寻找心房复极波：Ta 波通常藏在 PR 段和 QRS 波群里，看不到它是正常的。',
          'Looking for the atrial repolarization wave: Ta usually hides inside the PR segment and the QRS — not seeing it is normal.',
          'Buscar la onda de repolarización auricular: la Ta suele quedar oculta en el segmento PR y en el QRS; no verla es lo normal.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('只有心肌画出波：心房 → P，心室 → QRS 和 T。', 'Only muscle draws waves: atria → P, ventricles → QRS and T.', 'Solo el músculo dibuja ondas: aurículas → P; ventrículos → QRS y T.'),
        l(
          '窦房结、房室结和希氏束–浦肯野系统只表现为时间，例如 PR 段。',
          'The sinus node, AV node and His–Purkinje system show only as timing, such as the PR segment.',
          'El nodo sinusal, el nodo AV y el sistema His-Purkinje solo se ven como tiempo, por ejemplo en el segmento PR.',
        ),
        l('房室结慢 → PR 长；绕过房室结 → PR 短。', 'Slow AV node → long PR; bypassed AV node → short PR.', 'Nodo AV lento → PR largo; nodo AV saltado → PR corto.'),
        l(
          '浦肯野系统快 → QRS 窄；不走浦肯野系统 → QRS 宽。',
          'Fast Purkinje network → narrow QRS; activation outside it → wide QRS.',
          'Red de Purkinje rápida → QRS estrecho; activación fuera de ella → QRS ancho.',
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
