/**
 * r8 — Ladder diagrams (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `mobitz-i`, `mobitz-ii`, `av-dissociation`, `pac-criteria`, `pvc-criteria`
 * (current values); ladder-construction rules after Lewis, as taught in Chou's Electrocardiography (Surawicz & Knilans).
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
  id: 'r8',
  stage: 'R',
  order: 8,
  title: l('梯形图', 'Ladder diagrams', 'Diagramas en escalera'),
  summary: l(
    '梯形图把纸上已有的东西画成图：A 层标 P 波，V 层标 QRS，中间 AV 层连线的斜率就是 PR——线停在 AV 层就是阻滞。它不产生新数据，但让文氏型、Mobitz II、未下传房早、房室分离与室早二联律的机制一目了然。',
    'A ladder diagram turns what is already on the paper into a picture: the A tier marks P waves, the V tier QRS, and the slope of the connecting line in the AV tier IS the PR — a line that stops in the AV tier is a block. It adds no new data, but it makes the mechanism of Wenckebach, Mobitz II, blocked PACs, AV dissociation and bigeminal PVCs visible at a glance.',
    'El diagrama en escalera convierte en dibujo lo que ya está en el papel: el nivel A marca las ondas P, el nivel V los QRS, y la pendiente de la línea de conexión en el nivel AV ES el PR —una línea que se detiene en el nivel AV es un bloqueo—. No aporta datos nuevos, pero hace visible de un vistazo el mecanismo del Wenckebach, el Mobitz II, la extrasístole auricular bloqueada, la disociación AV y el bigeminismo ventricular.',
  ),
  objectives: [
    l(
      '画一张 Lewis 梯形图：三层 A/AV/V，先按实测时间标出每个 P 和 QRS，再用带斜率的连线连接。',
      'Draw a Lewis laddergram: three tiers A/AV/V, mark every P and QRS at its measured time, then connect them with sloped lines.',
      'Dibujar un diagrama en escalera de Lewis: tres niveles A/AV/V, marcar cada P y cada QRS en su tiempo medido y unirlos con líneas de pendiente.',
    ),
    l(
      '把连线斜率读成传导时间，并识别停在 AV 层的线（阻滞）、自下而上的线（逆行激动）、V 层上相遇的两条线（融合）与分离中到达 V 的窦性线（夺获）。',
      'Read the line slope as conduction time, and recognise a line stopping in the AV tier (block), a line drawn upward from below (retrograde activation), two lines meeting on V (fusion) and a sinus line reaching V during dissociation (capture).',
      'Leer la pendiente de la línea como tiempo de conducción y reconocer una línea que se detiene en el nivel AV (bloqueo), una línea trazada hacia arriba desde abajo (activación retrógrada), dos líneas que se encuentran en V (fusión) y una línea sinusal que llega a V durante la disociación (captura).',
    ),
    l(
      '用梯形图证明机制：文氏型、Mobitz II 与未下传房早的鉴别；房室分离中的夺获；室早二联律的完全代偿间歇。',
      'Use ladders to prove mechanisms: Wenckebach vs Mobitz II vs a blocked PAC, captures in AV dissociation, and the fully compensatory pause of bigeminal PVCs.',
      'Usar el diagrama para demostrar mecanismos: Wenckebach frente a Mobitz II frente a extrasístole auricular bloqueada; capturas en la disociación AV; pausa compensatoria completa del bigeminismo ventricular.',
    ),
    l(
      '说出梯形图的能力边界：它不产生新数据——先量 PP 与 RR，再落笔。',
      'State the limits of the ladder: it adds no new data — measure the PP and RR before you draw.',
      'Señalar los límites del diagrama: no aporta datos nuevos; mide el PP y el RR antes de dibujar.',
    ),
  ],
  minutes: 14,
  competencies: ['C3', 'C11'],
  findings: ['pac-blocked', 'av-block-2-mobitz1', 'pvc', 'av-dissociation'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('pac-blocked', 541),
      view: STRIP,
      question: l(
        'T 波上藏着一个提前的 P′，后面没有 QRS。要证明这个 P′ 没有下传，不能只靠嘴说——把它画成梯形图。先在纸上画出你的版本，再往下看。',
        'An early P′ hides on the T wave, and no QRS follows it. To prove that this P′ did not conduct, do not just say it — draw it as a ladder diagram. Sketch your version on paper first, then read on.',
        'Una P′ precoz se esconde sobre la onda T y no le sigue ningún QRS. Para demostrar que esa P′ no condujo no basta con decirlo: dibújala en un diagrama en escalera. Haz tu versión en papel antes de continuar.',
      ),
      reveal: l(
        '梯形图上，这个 P′ 在 **A 层**留下一个提前的标记，却**没有任何连线到达 V 层**——线在 AV 层中途停住：房室结尚在不应期，激动被拦下。再核对两点：这个 P′ **提前**且形态与窦性 P 不同（起源不同）；下一个窦性 P 准时到达，PP 时钟没有乱。所以这不是房室传导阻滞，而是**未下传（被拦截的）房早**——梯形图把“没有线”变成了看得见的证据。',
        'On the ladder this P′ leaves an early mark in the **A tier** but **no line reaches the V tier** — the line stops halfway through the AV tier: the AV node was still refractory and the impulse was stopped. Check two more things: the P′ is **early** and differently shaped from the sinus P (a different origin), and the next sinus P arrives on time — the PP clock is undisturbed. So this is not AV block but a **blocked (intercepted) PAC** — the ladder turns "no line" into visible evidence.',
        'En el diagrama, esta P′ deja una marca precoz en el **nivel A** pero **ninguna línea llega al nivel V**: la línea se detiene a mitad del nivel AV; el nodo AV seguía en periodo refractario y el impulso se detuvo. Comprueba dos cosas más: la P′ es **precoz** y de morfología distinta a la P sinusal (otro origen), y la siguiente P sinusal llega puntual: el reloj del PP no se ha alterado. No es un bloqueo AV, sino una **extrasístole auricular bloqueada (interceptada)**: el diagrama convierte la ausencia de línea en una evidencia visible.',
      ),
    },
    {
      kind: 'text',
      title: l('三层、五种线条：梯形图的语法', 'Three tiers, five kinds of line: the grammar of a ladder', 'Tres niveles y cinco tipos de línea: la gramática del diagrama'),
      body: l(
        'Lewis 梯形图用三条横线分出两层间隙：\n- **A 层**（上线之上）标每个心房事件——P、P′ 或扑动/颤动波，放在它的起始时间上；\n- **V 层**（下线之下）标每个心室事件——QRS 的起始；\n- **AV 层**（两线之间）承载连线：**连线的斜率就是传导时间**——越平（越水平）PR 越长，越陡 PR 越短。\n五种基本线条：\n- **下传**：一条线从 A 层斜行到 V 层，斜率 = PR；\n- **阻滞**：线在 AV 层中途停住（短横杠）——一个未下传的 P；\n- **逆行**：线从下方**向上**画——交界区或室性激动逆传并除极心房（逆行 P′）；\n- **融合**：两条线（如窦性 + 室性）在 V 层相遇；\n- **夺获**：房室分离中，一条完整的窦性线穿过 AV 层到达 V（一个由窦性 P 下传、提前出现的 QRS；与室性心律竞争时它还会更窄）。\n一条规则高于一切：**先测量，后落笔**——每个标记都放在分规量出的时间上，而不是记忆放的位置。',
        'A Lewis ladder uses three horizontal lines to make two gaps:\n- the **A tier** (above the top line) marks every atrial event — P, P′ or flutter/fibrillation waves — placed at its onset time;\n- the **V tier** (below the bottom line) marks every ventricular event — the QRS onset;\n- the **AV tier** (in between) carries the connecting line: **the slope of that line IS the conduction time** — the flatter it lies, the longer the PR; the steeper, the shorter.\nFive basic lines:\n- **conducted**: a line runs slantwise from A down to V; its slope is the PR;\n- **blocked**: the line stops part-way across the AV tier (a short bar) — a non-conducted P;\n- **retrograde**: the line is drawn **upward** from below — a junctional or ventricular impulse activating the atria backwards (retrograde P′);\n- **fusion**: two lines (e.g. sinus + ventricular) meet on the V tier;\n- **capture**: during AV dissociation, one full sinus line crosses the AV tier and reaches V (an earlier QRS conducted from a sinus P; narrower too when the competing rhythm is ventricular).\nOne rule outranks the rest: **measure first, draw second** — every mark goes where the calipers say, not where memory puts it.',
        'El diagrama en escalera de Lewis usa tres líneas horizontales para crear dos espacios:\n- el **nivel A** (sobre la línea superior) marca cada evento auricular —P, P′ u ondas de aleteo/fibrilación— colocado en su tiempo de inicio;\n- el **nivel V** (bajo la línea inferior) marca cada evento ventricular —el inicio del QRS—;\n- el **nivel AV** (en medio) lleva la línea de conexión: **la pendiente de esa línea ES el tiempo de conducción**: cuanto más tendida, más largo el PR; cuanto más vertical, más corto.\nCinco líneas básicas:\n- **conducida**: una línea baja en diagonal de A a V; su pendiente es el PR;\n- **bloqueada**: la línea se detiene a mitad del nivel AV (una barra corta): una P no conducida;\n- **retrógrada**: la línea se dibuja **hacia arriba** desde abajo: un impulso de la unión o ventricular que activa las aurículas al revés (P′ retrógrada);\n- **fusión**: dos líneas (p. ej. sinusal + ventricular) se encuentran en el nivel V;\n- **captura**: durante una disociación AV, una línea sinusal completa cruza el nivel AV y llega a V (un QRS más precoz conducido desde una P sinusal; además más estrecho cuando compite con un ritmo ventricular).\nUna regla está por encima de las demás: **medir primero, dibujar después**: cada marca va donde señala el compás, no donde la pone la memoria.',
      ),
    },
    {
      kind: 'criteria',
      title: l('梯形图作图规则卡', 'Ladder construction rules card', 'Tarjeta de reglas para dibujar el diagrama'),
      items: [
        {
          label: l('三层', 'The three tiers', 'Los tres niveles'),
          value: l(
            '上线之上 = A 层（P、P′、F 波）；下线之下 = V 层（QRS 起始）；两线之间 = AV 层（连线）',
            'Above the top line = A tier (P, P′, F waves); below the bottom line = V tier (QRS onset); between them = the AV tier (the connecting line)',
            'Sobre la línea superior = nivel A (P, P′, ondas F); bajo la línea inferior = nivel V (inicio del QRS); entre ambas = nivel AV (la línea de conexión)',
          ),
        },
        {
          label: l('连线斜率', 'Line slope', 'Pendiente de la línea'),
          value: l(
            '斜率即传导时间：越平 = PR 越长；图上标注的数字就是 PR（ms）',
            'The slope is the conduction time: flatter = longer PR; the number printed on the line is the PR in ms',
            'La pendiente es el tiempo de conducción: más tendida = PR más largo; el número impreso en la línea es el PR en ms',
          ),
        },
        {
          label: l('未下传的 P', 'A non-conducted P', 'Una P no conducida'),
          value: l(
            '线在 AV 层中途停止（短横杠）——绝不画到 V 层',
            'The line stops part-way across the AV tier (a short bar) — it never reaches V',
            'La línea se detiene a mitad del nivel AV (una barra corta): nunca llega a V',
          ),
        },
        {
          label: l('自下而上的线', 'A line from below', 'Una línea desde abajo'),
          value: l(
            '交界性/室性激动的逆行房室传导：线从 V 层向上指向 A 层（逆行 P′）',
            'Retrograde VA conduction of a junctional or ventricular impulse: the line runs upward from V towards A (retrograde P′)',
            'Conducción AV retrógrada de un impulso de la unión o ventricular: la línea sube de V hacia A (P′ retrógrada)',
          ),
        },
        {
          label: l('融合与夺获', 'Fusion and capture', 'Fusión y captura'),
          value: l(
            '融合 = 两条线在 V 层相遇；夺获 = 房室分离中一条完整的窦性线到达 V 层',
            'Fusion = two lines meeting on the V tier; capture = during AV dissociation, one full sinus line reaching the V tier',
            'Fusión = dos líneas que se encuentran en el nivel V; captura = durante una disociación AV, una línea sinusal completa que llega al nivel V',
          ),
        },
        {
          label: l('作图顺序', 'Order of work', 'Orden de trabajo'),
          value: l(
            '第一步用分规量 PP 与 RR；第二步按实测时间标出所有 P 和 QRS；第三步才连线——没有测量就没有梯形图',
            'First march the PP and RR with calipers; second, mark every P and QRS at its measured time; only then connect — no measurement, no ladder',
            'Primero recorre el PP y el RR con el compás; después marca cada P y cada QRS en su tiempo medido; solo entonces conecta: sin medición no hay diagrama',
          ),
        },
      ],
      source:
        "Surawicz B, Knilans TK. Chou's Electrocardiography in Clinical Practice, 6th ed. 2008; Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332",
    },
    {
      kind: 'figure',
      figure: { id: 'laddergram', params: { maxBeats: 12 } },
      ecg: synth('av-block-2-mobitz1', 542),
      caption: l(
        '文氏型的梯形图：AV 层的连线**逐搏变平**（每个 PR 比上一个长，增量却越来越小），然后一条线在 AV 层停住——那个 P 未下传。间歇后第一条线最陡（PR 最短），且间歇 < 2×PP；最可靠的征象正是**间歇后第一条线比间歇前最后一条更陡**。QRS 窄：阻滞在房室结。跟着光标走一遍，读每条线上标注的 PR。',
        'The Wenckebach ladder: the AV-tier line **flattens beat by beat** (each PR longer than the last, the increments shrinking), then one line stops inside the AV tier — that P is not conducted. The first line after the pause is the steepest (the shortest PR), the pause is < 2×PP, and the most reliable sign is precisely that **the first line after the pause is steeper than the last one before it**. The QRS is narrow: the block is in the AV node. Follow the cursor and read the PR printed on each line.',
        'El diagrama del Wenckebach: la línea del nivel AV **se tiende latido a latido** (cada PR más largo que el anterior, con incrementos cada vez menores) y luego una línea se detiene dentro del nivel AV: esa P no conduce. La primera línea tras la pausa es la más vertical (el PR más corto), la pausa dura < 2×PP, y el signo más fiable es justamente que **la primera línea tras la pausa es más vertical que la última anterior**. El QRS es estrecho: el bloqueo está en el nodo AV. Sigue el cursor y lee el PR impreso en cada línea.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'laddergram', params: { maxBeats: 12 } },
      ecg: synth('av-block-2-mobitz2', 543),
      caption: l(
        'Mobitz II 的梯形图：每条下传的线**斜率完全相同**（PR 恒定），然后一条线在 AV 层中途停住——没有预告。QRS 宽（右束支阻滞形）：阻滞在希氏束以下，传导“全或无”。对比上一张图：**先读斜率的行为，再读停住的线**——先变平后停止 = Ⅰ 型；斜率不变而突然停止 = Ⅱ 型。这份图上没有文氏行为的任何痕迹。',
        'The Mobitz II ladder: every conducted line has **exactly the same slope** (a constant PR), then one line stops part-way across the AV tier — no warning. The QRS is wide (RBBB-shaped): the block is below the His bundle, conducting all-or-none. Compare with the ladder above: **read the slope behaviour first, the stopped line second** — flattening then a stop = type I; a sudden stop at an unchanged slope = type II. There is no trace of Wenckebach behaviour on this ladder.',
        'El diagrama del Mobitz II: todas las líneas conducidas tienen **exactamente la misma pendiente** (PR constante) y, de pronto, una línea se detiene a mitad del nivel AV, sin aviso. El QRS es ancho (morfología de bloqueo de rama derecha): el bloqueo está por debajo del haz de His, que conduce a todo o nada. Compáralo con el diagrama anterior: **lee primero el comportamiento de la pendiente y después la línea detenida**: se tiende y luego se detiene = tipo I; detención brusca con pendiente invariable = tipo II. En este diagrama no hay ni rastro de comportamiento Wenckebach.',
      ),
    },
    {
      kind: 'worked',
      title: l('动手画：5:4 文氏周期', 'Draw it yourself: a 5:4 Wenckebach cycle', 'Dibújalo tú: un ciclo de Wenckebach 5:4'),
      ecg: synth('av-block-2-mobitz1', 544, undefined, '5to4'),
      view: STRIP,
      steps: [
        {
          title: l('第一步：量，不要猜', 'Step 1: measure, do not guess', 'Paso 1: mide, no adivines'),
          body: l(
            '把分规卡在一个 PP 上，沿节律条走：P 波准时到达，窦性时钟没有乱。再量 RR：逐渐缩短，然后一个长间歇——先有数字，再谈机制。',
            'Set the calipers on one PP and walk them along the strip: the P waves arrive on time, the sinus clock is undisturbed. Then the RR: it shortens step by step, then one long pause — numbers first, mechanism second.',
            'Ajusta el compás a un PP y recórrelo por la tira: las ondas P llegan puntuales, el reloj sinusal no se altera. Después el RR: se acorta paso a paso y luego una pausa larga; primero los números, luego el mecanismo.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('第二步：标记 A 层', 'Step 2: populate the A tier', 'Paso 2: llena el nivel A'),
          body: l(
            '在每个 P 的起始处，于 A 层画一个标记——包括那个最终未下传的 P。每个周期五个 P、五个标记，间距相等。',
            'At the onset of every P, place a mark in the A tier — including the P that will turn out not to conduct. Five P waves per cycle, five marks, evenly spaced.',
            'En el inicio de cada P, coloca una marca en el nivel A, incluida la P que acabará sin conducir. Cinco ondas P por ciclo, cinco marcas, igualmente espaciadas.',
          ),
          marks: [{ auto: 'p' }],
        },
        {
          title: l('第三步：标记 V 层', 'Step 3: populate the V tier', 'Paso 3: llena el nivel V'),
          body: l(
            '在每个 QRS 的起始处，于 V 层画一个标记。每个周期只有四个 QRS——A 层五个标记对 V 层四个：一定有一个 P 没有到达。',
            'At the onset of every QRS, place a mark in the V tier. Each cycle has only four QRS complexes — five marks in A against four in V: one P never arrived.',
            'En el inicio de cada QRS, coloca una marca en el nivel V. Cada ciclo solo tiene cuatro QRS: cinco marcas en A frente a cuatro en V; una P no llegó.',
          ),
          marks: [{ auto: 'qrs' }],
        },
        {
          title: l('第四步：连线，读斜率', 'Step 4: connect and read the slopes', 'Paso 4: conecta y lee las pendientes'),
          body: l(
            '从每个 P 画斜线到它的 QRS：一条比一条平（PR 逐渐延长），最后那个 P 的线在 AV 层停住（短横杠）。间歇后第一条线回到最陡——PR 最短。**斜率就是 PR**：铅笔不必写出数字，图形自己会说话。',
            'Draw a slanting line from each P to its QRS: each flatter than the one before (the PR lengthens), until the last P’s line stops inside the AV tier (a short bar). The first line after the pause returns to the steepest slope — the shortest PR. **The slope is the PR**: the pencil need not write numbers, the picture speaks.',
            'Traza una línea inclinada de cada P a su QRS: cada una más tendida que la anterior (el PR se alarga), hasta que la línea de la última P se detiene dentro del nivel AV (una barra corta). La primera línea tras la pausa vuelve a ser la más vertical: el PR más corto. **La pendiente es el PR**: el lápiz no necesita escribir números, el dibujo habla solo.',
          ),
          marks: [{ auto: 'pr' }, { auto: 'blocked-p' }],
        },
        {
          title: l('第五步：从图上读出诊断', 'Step 5: read the diagnosis off the ladder', 'Paso 5: lee el diagnóstico en el diagrama'),
          body: l(
            '逐渐变平的斜率 + 一条停住的线 + 窄 QRS = 二度Ⅰ型（文氏型），5:4 周期，阻滞在房室结；间歇 < 2×PP，间歇后 PR 最短。一切都已画在图上——你只是把它读出来。',
            'Flattening slopes + one stopped line + a narrow QRS = second-degree type I (Wenckebach), a 5:4 cycle, blocked in the AV node; pause < 2×PP, shortest PR right after the pause. Everything was already drawn — you only read it out.',
            'Pendientes que se tienden + una línea detenida + QRS estrecho = bloqueo de segundo grado tipo I (Wenckebach), ciclo 5:4, bloqueado en el nodo AV; pausa < 2×PP y PR más corto justo después. Todo estaba ya dibujado: solo había que leerlo.',
          ),
        },
      ],
    },
    {
      kind: 'figure',
      figure: { id: 'laddergram', params: { maxBeats: 12 } },
      ecg: synth('av-dissociation', 545),
      caption: l(
        '房室分离的梯形图：**两列独立的列车**——A 层的窦性 P（60 次/分）按自己的时刻表前进，V 层的交界区激动（66 次/分）另开一列，彼此没有连线。当一个窦性 P 恰好赶上房室结可兴奋的窗口，一条完整的线穿过 AV 层到达 V——**夺获搏动**（提前出现的 QRS；此处交界性搏动本来就窄，所以形态不变）。分离只是描述，不是诊断；这里没有阻滞，只是下位起搏点更快。',
        'The AV dissociation ladder: **two independent trains** — the sinus P waves in the A tier (60/min) run on their own timetable while the junctional beats in the V tier (66/min) run another, with no lines joining them. When a sinus P happens to catch the AV node in an excitable window, one full line crosses the AV tier and reaches V — a **capture beat** (an earlier QRS; the junctional beats are already narrow here, so its shape does not change). Dissociation is a description, not a diagnosis; there is no block here, the subsidiary pacemaker is simply faster.',
        'El diagrama de la disociación AV: **dos trenes independientes**: las P sinusales del nivel A (60 lpm) corren con su propio horario mientras los latidos de la unión del nivel V (66 lpm) tiran de otro, sin líneas que los unan. Cuando una P sinusal coincide con una ventana excitable del nodo AV, una línea completa cruza el nivel AV y llega a V: un **latido de captura** (un QRS más precoz; aquí los latidos de la unión ya son estrechos, así que su morfología no cambia). La disociación es una descripción, no un diagnóstico; aquí no hay bloqueo: el marcapasos subsidiario es simplemente más rápido.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'laddergram', params: { maxBeats: 12 } },
      ecg: synth('ventricular-bigeminy', 546),
      caption: l(
        '室早二联律的梯形图：V 层每隔一个搏动就有一个**起自 V 层自身的标记**（点 = 异位起源），它前面没有任何来自 A 层的连线；窦性 P 照常在 A 层按时出现（藏在宽大 QRS/T 里）。量一量：每个室早后的长间歇恰好让下一个窦性 P 准时到达——**完全代偿间歇**，PP 时钟从未被重置。梯形图把“室早不打扰窦房结”画成了几何。',
        'The bigeminal-PVC ladder: every other mark in the V tier **originates in the V tier itself** (a dot = an ectopic origin), with no line reaching it from A; the sinus P waves keep appearing on time in the A tier (buried in the wide QRS/T). Measure it: the long pause after each PVC lets the next sinus P arrive exactly on schedule — a **fully compensatory pause**; the PP clock was never reset. The ladder turns "a PVC does not disturb the sinus node" into geometry.',
        'El diagrama del bigeminismo ventricular: una de cada dos marcas del nivel V **nace en el propio nivel V** (un punto = un origen ectópico), sin línea alguna que llegue desde A; las P sinusales siguen apareciendo puntualmente en el nivel A (enterradas en el QRS/T ancho). Mídelo: la pausa larga tras cada extrasístole deja que la siguiente P sinusal llegue exactamente a su hora: una **pausa compensatoria completa**; el reloj del PP no se ha reiniciado. El diagrama convierte «la extrasístole ventricular no molesta al nodo sinusal» en geometría.',
      ),
    },
    {
      kind: 'contrast',
      title: l('同样停住的线，不同的机制', 'The same stopped line, different mechanism', 'La misma línea detenida, distinto mecanismo'),
      view: STRIP,
      left: {
        ecg: synth('pac-blocked', 547),
        caption: l(
          '未下传房早：P′ 提前、形态不同；下一个窦性 P 准时到达',
          'Blocked PAC: the P′ is early and differently shaped; the next sinus P arrives on time',
          'Extrasístole auricular bloqueada: la P′ es precoz y de otra morfología; la siguiente P sinusal llega puntual',
        ),
        marks: [{ auto: 'blocked-p' }],
      },
      right: {
        ecg: synth('av-block-2-mobitz2', 548),
        caption: l(
          'Mobitz II：P 准时、形态同窦性；下传搏动 PR 恒定；QRS 宽',
          'Mobitz II: the P is on time and sinus-shaped; conducted beats have a constant PR; wide QRS',
          'Mobitz II: la P es puntual y de morfología sinusal; los latidos conducidos tienen PR constante; QRS ancho',
        ),
        marks: [{ auto: 'blocked-p' }],
      },
      point: l(
        '两张梯形图里都有一条停在 AV 层的线——但左图的标记**提前**且形态不同（异位 P′ 落在 T 波上，遇到的是生理性不应期），下一个窦性 P 准时到达；右图的标记**准时**、形态同窦性，下传搏动 PR 恒定、QRS 宽（希氏束下病变）。左图是伪阻滞，无需起搏器；右图排除可逆原因后不论症状均 I 类起搏。**先给 A 层的标记定性——提前还是准时、像谁的形态——再决定那条停住的线意味着什么。**',
        'Both ladders contain a line that stops in the AV tier — but on the left the mark is **early** and differently shaped (an ectopic P′ landing on the T wave, met by physiologic refractoriness), and the next sinus P arrives on time; on the right the mark is **on time** and sinus-shaped, with a constant PR on conducted beats and a wide QRS (infra-His disease). The left is pseudo-block and needs no pacemaker; the right is Class I pacing regardless of symptoms once reversible causes are excluded. **Characterise the A-tier mark first — early or on time, and whose shape — then decide what the stopped line means.**',
        'Ambos diagramas contienen una línea que se detiene en el nivel AV, pero a la izquierda la marca es **precoz** y de morfología distinta (una P′ ectópica que cae sobre la T y topa con un periodo refractario fisiológico) y la siguiente P sinusal llega puntual; a la derecha la marca es **puntual** y de morfología sinusal, con PR constante en los latidos conducidos y QRS ancho (enfermedad infrahisiana). Lo izquierdo es un pseudobloqueo y no necesita marcapasos; lo derecho es marcapasos clase I con o sin síntomas una vez excluidas las causas reversibles. **Caracteriza primero la marca del nivel A —¿precoz o puntual, y de qué morfología?— y decide después qué significa la línea detenida.**',
      ),
    },
    { kind: 'check', item: { family: 'p-qrs', seed: 6 } },
    { kind: 'check', item: { family: 'av-block', seed: 3 } },
    { kind: 'check', item: { family: 'ectopy', seed: 5 } },
    { kind: 'drill', families: ['p-qrs', 'av-block'], count: 10, passScore: 0.8 },
    {
      kind: 'real',
      ids: [19164, 861, 959],
      caption: l(
        '真实病例（PTB-XL）：一份二度房室传导阻滞、一份房性期前收缩、一份三度房室传导阻滞。**先在纸上为每份画出梯形图**——标 P、标 QRS、连线、读斜率——想好你的结论，然后揭晓核对。',
        'Real PTB-XL cases: one second-degree AV block, one PACs, one complete AV block. **Draw the ladder for each on paper first** — mark the P waves, mark the QRS complexes, connect, read the slopes — commit to your reading, then reveal and check.',
        'Casos reales de PTB-XL: un bloqueo AV de segundo grado, unas extrasístoles auriculares y un bloqueo AV completo. **Dibuja primero en papel el diagrama de cada uno** —marca las P, marca los QRS, conecta, lee las pendientes—, decide tu conclusión y compruébala después con la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把连线画穿未下传的 P′：未下传的 P 没有任何线到 V 层——线必须在 AV 层停住；画穿了，阻滞就从图上消失了。',
          'Drawing the connecting line through a blocked P′: a non-conducted P gets NO line to V — the line must stop inside the AV tier; draw it through and the block vanishes from the picture.',
          'Dibujar la línea de conexión a través de una P′ bloqueada: una P no conducida NO recibe línea hacia V; la línea debe detenerse dentro del nivel AV. Si la dibujas completa, el bloqueo desaparece del dibujo.',
        ),
        l(
          '忘了 AV 层的斜率就是 PR：斜率是数据——逐搏变平 = PR 逐渐延长；如果你的图上斜率不变而纸上 PR 在延长，那是你画错了，不是心脏错了。',
          'Forgetting that the AV-tier slope IS the PR: the slope is data — flattening beat by beat = a lengthening PR; if your ladder shows a constant slope while the strip shows a lengthening PR, your drawing is wrong, not the heart.',
          'Olvidar que la pendiente del nivel AV ES el PR: la pendiente es un dato; tenderse latido a latido = PR que se alarga. Si tu diagrama muestra una pendiente constante mientras la tira muestra un PR que se alarga, el error está en tu dibujo, no en el corazón.',
        ),
        l(
          '指望梯形图产生新数据：它只是把纸上已有的 P 与 QRS 组织成图——没有量出的 PP 与 RR，就没有可信的梯形图。',
          'Expecting the ladder to add new data: it only organises the P waves and QRS complexes already on the paper — without measured PP and RR intervals there is no trustworthy ladder.',
          'Esperar que el diagrama aporte datos nuevos: solo organiza las P y los QRS que ya están en el papel; sin un PP y un RR medidos no hay un diagrama fiable.',
        ),
        l(
          '凭记忆画图而不先测量：先用分规量 PP 与 RR、逐个标记，再连线——“大概齐”的梯形图比不画更危险。',
          'Drawing from memory instead of measuring first: march the PP and RR with calipers, mark every event, then connect — an approximate ladder is more dangerous than none.',
          'Dibujar de memoria en lugar de medir antes: recorre el PP y el RR con el compás, marca cada evento y después conecta; un diagrama aproximado es más peligroso que ninguno.',
        ),
        l(
          '分离时把每个 P 都连到最近的 QRS：分离的两列列车本无连线——只有计时证明能下传（PR 恒定或生理性）才画线；夺获搏动才配得上一条线，恰好同行的 P 不配。',
          'Connecting every P to the nearest QRS in dissociation: the two trains are unconnected by definition — draw a line only when the timing proves conduction (a constant or physiologic PR); a capture beat earns its line, a coincident P does not.',
          'Conectar cada P con el QRS más cercano en la disociación: los dos trenes están, por definición, sin conectar; dibuja una línea solo cuando el cronometraje demuestre conducción (PR constante o fisiológico). El latido de captura se gana su línea; una P que coincide, no.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '三层：A 层标 P/P′，V 层标 QRS，AV 层承载连线——斜率就是传导时间，越平 PR 越长。',
          'Three tiers: A for P/P′, V for QRS, and the AV tier carries the connecting line — its slope is the conduction time; the flatter, the longer the PR.',
          'Tres niveles: A para las P/P′, V para los QRS, y el nivel AV lleva la línea de conexión; su pendiente es el tiempo de conducción: cuanto más tendida, más largo el PR.',
        ),
        l(
          '停在 AV 层的线 = 阻滞：斜率先变平再停 = 文氏型；斜率不变突然停 = Mobitz II；提前而形态不同的 P′ 停住 = 未下传房早。',
          'A line stopping in the AV tier = block: flattening slopes then a stop = Wenckebach; a sudden stop at a constant slope = Mobitz II; an early, differently shaped P′ that stops = a blocked PAC.',
          'Una línea que se detiene en el nivel AV = bloqueo: pendientes que se tienden y luego se detienen = Wenckebach; detención brusca con pendiente constante = Mobitz II; una P′ precoz y de otra morfología que se detiene = extrasístole auricular bloqueada.',
        ),
        l(
          '自下而上的线 = 逆行心房激动；两条线在 V 层相遇 = 融合；房室分离中一条完整的窦性线到达 V = 夺获。',
          'A line drawn upward from below = retrograde atrial activation; two lines meeting on V = fusion; one full sinus line reaching V during dissociation = a capture.',
          'Una línea dibujada hacia arriba desde abajo = activación auricular retrógrada; dos líneas que se encuentran en V = fusión; una línea sinusal completa que llega a V durante la disociación = captura.',
        ),
        l(
          '梯形图不产生新数据：先量 PP 与 RR、逐个标记、再连线——它把证据组织成图，读图之前先读纸。',
          'The ladder adds no new data: measure the PP and RR, mark every event, then connect — it organises the evidence into a picture; read the paper before you read the picture.',
          'El diagrama no aporta datos nuevos: mide el PP y el RR, marca cada evento y después conecta; organiza la evidencia en un dibujo, pero lee el papel antes de leer el dibujo.',
        ),
      ],
    },
  ],
  sources: [
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    "Surawicz B, Knilans TK. Chou's Electrocardiography in Clinical Practice, 6th ed. 2008",
    'Castellano et al. 2004',
  ],
};

export default lesson;
