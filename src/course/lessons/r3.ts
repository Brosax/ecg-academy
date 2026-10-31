/**
 * r3 — First-degree AV block and Mobitz I (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `first-degree-avb`, `mobitz-i`, `wenckebach-arithmetic`, `pr-normal` (current
 * values; plus the missing-book items: pseudo-AV block mimics, vagally mediated AV block, athlete thresholds).
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
  id: 'r3',
  stage: 'R',
  order: 3,
  title: l('一度房室传导阻滞与二度Ⅰ型（文氏型）', 'First-degree AV block and Mobitz I', 'Bloqueo AV de primer grado y Mobitz I'),
  summary: l(
    '一度房室传导阻滞是 PR > 200 ms 而 1:1 下传——是“延迟”而非“阻断”；Mobitz I（文氏型）则是 PR 逐搏延长直至一个 P 落空，间歇后的第一个 PR 最短。',
    'First-degree AV block is a PR > 200 ms with 1:1 conduction — a delay, not a block; Mobitz I (Wenckebach) is a PR that lengthens beat by beat until a P is dropped, with the first PR after the pause the shortest.',
    'El bloqueo AV de primer grado es un PR > 200 ms con conducción 1:1: un retraso, no un bloqueo; el Mobitz I (Wenckebach) es un PR que se alarga latido a latido hasta que se pierde una P, y el primer PR tras la pausa es el más corto.',
  ),
  objectives: [
    l(
      '定义一度房室传导阻滞（PR > 200 ms、1:1 下传），并解释 2018 年指南为什么更愿意称之为“房室延迟”。',
      'Define first-degree AV block (PR > 200 ms, 1:1 conduction) and explain why the 2018 guideline prefers the name "AV delay".',
      'Definir el bloqueo AV de primer grado (PR > 200 ms, conducción 1:1) y explicar por qué la guía de 2018 prefiere llamarlo «retraso AV».',
    ),
    l(
      '识别 Mobitz I：单个未下传 P、其前后 PR 不恒定，间歇后第一个 PR 短于间歇前最后一个 PR；完成典型文氏算术（增量递减、RR 缩短、间歇 < 2×PP）。',
      'Recognise Mobitz I: a single non-conducted P, an inconstant PR around it, and a first PR after the pause shorter than the last PR before it; work the typical Wenckebach arithmetic (shrinking increments, shortening RR, pause < 2 x PP).',
      'Reconocer el Mobitz I: una P no conducida única, PR inconstante a su alrededor y un primer PR tras la pausa más corto que el último PR previo; y manejar la aritmética típica de Wenckebach (incrementos decrecientes, RR que se acorta, pausa < 2 x PP).',
    ),
    l(
      '诊断任何二度阻滞前先排除假性阻滞：未下传房早（P′ 藏于 T 波）与迷走性阻滞（窦性减慢伴 PR 延长）。',
      'Before calling any second-degree block, exclude the mimics: a blocked PAC (P′ hidden on the T wave) and vagal block (sinus slowing with PR lengthening).',
      'Antes de diagnosticar un bloqueo de segundo grado, excluye las imitaciones: una extrasístole auricular bloqueada (P′ oculta en la onda T) y el bloqueo vagal (enlentecimiento sinusal con PR largo).',
    ),
    l(
      '说出 Mobitz I 与一度阻滞的起搏立场：仅在症状明确归因时起搏，无症状为 III 类。',
      'State the pacing position for Mobitz I and first-degree block: pace only when symptoms are clearly attributable; asymptomatic is Class III.',
      'Citar la postura sobre estimación en el Mobitz I y el bloqueo de primer grado: marcapasos solo si los síntomas son claramente atribuibles; asintomático es clase III.',
    ),
  ],
  minutes: 15,
  competencies: ['C4', 'C6'],
  findings: ['av-block-1', 'av-block-2-mobitz1'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('av-block-2-mobitz1', 441),
      view: STRIP,
      question: l(
        '这条节律条上的搏动“成组”出现，每组末尾有一段落空。逐搏测量 PR 与 RR，想好你认为的机制。',
        'The beats on this strip come in groups, with a gap at the end of each group. Measure the PR and the RR beat by beat, then commit to the mechanism.',
        'Los latidos de esta tira aparecen «agrupados», con un vacío al final de cada grupo. Mide el PR y el RR latido a latido y decide cuál es el mecanismo.',
      ),
      reveal: l(
        'PR 逐搏延长（约 150 → 235 → 275 ms），直到一个 P 后面没有 QRS——**二度Ⅰ型（文氏型）房室传导阻滞，Mobitz I**。落空之后 PR 重新变短、周期重来，这就是“成组搏动”的来历。注意被阻断的 P 仍按时到达、形态正常——这是本课稍后鉴别真假阻滞的关键。',
        'The PR lengthens beat by beat (about 150 → 235 → 275 ms) until a P is left without a QRS — **second-degree AV block, Mobitz I (Wenckebach)**. After the dropped beat the PR resets short and the cycle restarts; that is where the group beating comes from. Note that the blocked P still arrives on time and looks normal — the key to separating true block from mimics later in this lesson.',
        'El PR se alarga latido a latido (unos 150 → 235 → 275 ms) hasta que una P se queda sin QRS: **bloqueo AV de segundo grado Mobitz I (Wenckebach)**. Tras el latido perdido el PR se reinicia corto y el ciclo recomienza; de ahí el agrupamiento de latidos. Fíjate en que la P bloqueada llega a tiempo y con morfología normal: esa es la clave para distinguir el bloqueo verdadero de sus imitaciones más adelante.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('av-block-1', 442),
      showConduction: true,
      emphasize: ['av-node'],
      caption: l(
        '播放几个心动周期。窦性 P 波正常出现，激动进入房室结后被明显拖慢——但**每个 P 最终都下传**，QRS 保持狭窄。PR 延长的部位几乎总在房室结（这里约 280 ms）：一度房室传导阻滞的本质是**延迟**，不是阻断。',
        'Play a few beats. Sinus P waves appear normally and the impulse is markedly slowed inside the AV node — but **every P eventually conducts**, and the QRS stays narrow. The delay almost always sits in the AV node (here about 280 ms): first-degree AV block is a **delay**, not an interruption.',
        'Reproduce unos latidos. Las ondas P sinusales aparecen con normalidad y el impulso se frena de forma llamativa dentro del nodo AV, pero **cada P acaba conduciendo** y el QRS sigue estrecho. El retraso casi siempre está en el nodo AV (aquí unos 280 ms): el bloqueo AV de primer grado es un **retraso**, no una interrupción.',
      ),
    },
    {
      kind: 'text',
      title: l('一度：延迟，不是阻滞', 'First degree: a delay, not a block', 'Primer grado: un retraso, no un bloqueo'),
      body: l(
        '- 成人 PR > 200 ms 且每个 P 都下传（1:1）＝一度房室传导阻滞；正常成人 PR 为 120–200 ms（从 P 波起点量到 QRS 或 R 波起点）。\n- 2018 年指南说更准确的名字是**房室延迟**：没有任何 P 波被“阻断”。\n- PR > 300 ms 且 QRS 窄 → 延迟基本在房室结；PR 极长时心房与心室几乎同时收缩，可出现假性起搏器综合征样症状——症状相关时起搏为 IIa。\n- 常见背景：迷走张力高（训练、睡眠）、药物（β 受体阻滞剂、地高辛、钙拮抗剂）、缺血或传导系统退行性变。\n- 报告写“窦性心律伴一度房室传导阻滞（房室延迟）”，然后去找原因。',
        '- PR > 200 ms in an adult with every P conducted (1:1) = first-degree AV block; the normal adult PR is 120-200 ms (from P onset to Q or R onset).\n- The 2018 guideline says the more accurate name is **AV delay**: no P wave is blocked at all.\n- PR > 300 ms with a narrow QRS → the delay is essentially in the AV node; with a very long PR the atria and ventricles contract almost together, which can cause pseudo-pacemaker-syndrome-like symptoms — pacing is Class IIa when symptoms correlate.\n- Common settings: high vagal tone (training, sleep), drugs (beta blockers, digoxin, calcium-channel blockers), ischaemia or degenerative conduction disease.\n- Report "sinus rhythm with first-degree AV block (AV delay)" — then go looking for the cause.',
        '- PR > 200 ms en un adulto con todas las P conducidas (1:1) = bloqueo AV de primer grado; el PR normal del adulto es 120-200 ms (del inicio de la P al del QRS o la R).\n- La guía de 2018 dice que el nombre más exacto es **retraso AV**: ninguna onda P se bloquea.\n- PR > 300 ms con QRS estrecho → el retraso está básicamente en el nodo AV; con un PR muy largo, aurículas y ventrículos se contraen casi a la vez y pueden aparecer síntomas de seudomarcapasos: estimular es clase IIa si los síntomas se correlacionan.\n- Contextos habituales: tono vagal alto (entrenamiento, sueño), fármacos (betabloqueantes, digoxina, antagonistas del calcio), isquemia o enfermedad degenerativa del sistema de conducción.\n- Informa de «ritmo sinusal con bloqueo AV de primer grado (retraso AV)» y después busca la causa.',
      ),
    },
    {
      kind: 'live',
      scenario: 'av-block-1',
      seed: 443,
      dials: [{ id: 'pr' }],
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'pr' }],
      caption: l(
        '拖动 PR 旋钮（220–360 ms）：间期可以拉得很长，但 P 与 QRS 始终保持 1:1——这就是“延迟”的含义。要叫“阻滞”，必须有 P 落空；那从下一个板块开始。',
        'Drag the PR dial (220-360 ms): the interval can stretch a long way, yet P and QRS stay 1:1 — that is what "delay" means. To say "block", a P must be dropped; that begins with the next block.',
        'Desliza el control del PR (220-360 ms): el intervalo puede estirarse mucho, pero P y QRS siguen 1:1: eso significa «retraso». Para hablar de «bloqueo» tiene que perderse una P; eso empieza en el siguiente bloque.',
      ),
    },
    {
      kind: 'criteria',
      title: l('一度与 Mobitz I：判读与处理', 'First degree and Mobitz I: reading and action', 'Primer grado y Mobitz I: lectura y actuación'),
      items: [
        {
          label: l('正常 PR（成人）', 'Normal PR (adult)', 'PR normal (adulto)'),
          value: l('120–200 ms，从 P 波起点量到 QRS 或 R 波起点', '120-200 ms, measured from P onset to Q or R onset', '120-200 ms, medido del inicio de la P al del QRS o la R'),
        },
        {
          label: l('一度房室传导阻滞', 'First-degree AV block', 'Bloqueo AV de primer grado'),
          value: l(
            'PR > 200 ms 且 1:1 下传——“房室延迟”；PR > 300 ms 且 QRS 窄 → 延迟在房室结；症状相关（假性起搏器综合征）时起搏 IIa',
            'PR > 200 ms with 1:1 conduction — an "AV delay"; PR > 300 ms with a narrow QRS → delay in the AV node; pacing Class IIa when symptoms correlate (pseudo-pacemaker syndrome)',
            'PR > 200 ms con conducción 1:1: un «retraso AV»; PR > 300 ms con QRS estrecho → retraso en el nodo AV; marcapasos clase IIa si hay correlación con síntomas (síndrome de seudomarcapasos)',
          ),
        },
        {
          label: l('Mobitz I（文氏型）', 'Mobitz I (Wenckebach)', 'Mobitz I (Wenckebach)'),
          value: l(
            'P 率恒定且 < 100 次/分；单个未下传 P，其前后 PR 不恒定；最可靠征象：间歇后第一个 PR 短于间歇前最后一个 PR',
            'Constant P rate < 100/min; a single non-conducted P with an inconstant PR before and after; most reliable sign: the first PR after the pause is shorter than the last PR before it',
            'Frecuencia de P constante < 100 lpm; una P no conducida única con PR inconstante antes y después; el signo más fiable: el primer PR tras la pausa es más corto que el último PR previo',
          ),
        },
        {
          label: l('典型文氏算术', 'Typical Wenckebach arithmetic', 'Aritmética de Wenckebach típica'),
          value: l(
            'PR 增量逐搏递减（第 2 搏增量最大）→ RR 逐搏缩短；间歇 = 2×PP − 总增量（例：PP 800、PR 120/280/400/480 → RR 960/920/880、间歇 1240 ms）',
            'PR increments shrink beat by beat (largest on the 2nd beat) → the RR shortens; pause = 2 x PP − total increment (e.g. PP 800, PR 120/280/400/480 → RR 960/920/880, pause 1240 ms)',
            'Los incrementos del PR disminuyen latido a latido (el mayor en el 2.º latido) → el RR se acorta; pausa = 2 x PP − incremento total (p. ej., PP 800, PR 120/280/400/480 → RR 960/920/880, pausa 1240 ms)',
          ),
        },
        {
          label: l('QRS 宽度与阻滞水平', 'QRS width and level', 'Anchura del QRS y nivel'),
          value: l(
            '窄 QRS → 几乎总在房室结（阿托品/运动可改善）；合并束支阻滞时可为希氏束下文氏；非典型序列常见，别只靠算术',
            'Narrow QRS → almost always the AV node (improves with atropine/exercise); with bundle-branch block an infranodal Wenckebach is possible; atypical sequences are common — do not rely on arithmetic alone',
            'QRS estrecho → casi siempre el nodo AV (mejora con atropina/ejercicio); con bloqueo de rama puede ser un Wenckebach infrahisiano; las secuencias atípicas son frecuentes: no te fíes solo de la aritmética',
          ),
        },
        {
          label: l('迷走性房室阻滞（夜间）', 'Vagal AV block (nocturnal)', 'Bloqueo AV vagal (nocturno)'),
          value: l(
            '窦性减慢与 PR 延长或落空同时出现，多在夜间或静息，活动后消失；本身不是起搏指征——筛查睡眠呼吸暂停',
            'Sinus slowing together with PR lengthening or a dropped beat, mostly at night or at rest, resolving with activity; not by itself a pacing indication — screen for sleep apnoea',
            'Enlentecimiento sinusal junto con PR largo o un latido perdido, sobre todo de noche o en reposo, que desaparece con la actividad; no es por sí solo indicación de marcapasos: descarta apnea del sueño',
          ),
        },
        {
          label: l('起搏立场', 'Pacing position', 'Postura sobre el marcapasos'),
          value: l(
            '一度与房室结水平 Mobitz I：仅在症状明确归因时起搏，无症状为 III 类；运动员 PR < 400 ms 属训练相关，≥ 400 ms 才需评估',
            'First-degree and AV-nodal Mobitz I: pace only when symptoms are clearly attributable, asymptomatic is Class III; in athletes a PR < 400 ms is training-related, >= 400 ms needs evaluation',
            'Primer grado y Mobitz I del nodo AV: marcapasos solo si los síntomas son claramente atribuibles, asintomático es clase III; en deportistas un PR < 400 ms es adaptación al entrenamiento y ≥ 400 ms requiere evaluación',
          ),
        },
      ],
      source:
        'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482; Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    },
    {
      kind: 'worked',
      title: l('文氏算术：一行一行算出来', 'Wenckebach arithmetic: work it line by line', 'Aritmética de Wenckebach: calcúlala línea a línea'),
      ecg: synth('av-block-2-mobitz1', 444),
      view: STRIP,
      steps: [
        {
          title: l('先找落空的 P', 'Find the dropped P first', 'Busca primero la P perdida'),
          body: l(
            '一个形态正常的 P 按时到达，后面却没有 QRS。这唯一的未下传 P 使它成为“二度”。',
            'A normal-looking P arrives on schedule but no QRS follows. That single non-conducted P is what makes this second degree.',
            'Una P de morfología normal llega a su hora pero no le sigue ningún QRS. Esa única P no conducida es lo que lo convierte en segundo grado.',
          ),
          marks: [{ auto: 'blocked-p' }],
        },
        {
          title: l('逐搏量 PR', 'Measure the PR beat by beat', 'Mide el PR latido a latido'),
          body: l(
            'PR 逐搏延长：约 150 → 235 → 275 ms。增量在缩小：约 85，再约 40 ms——最大的增量出现在第 2 搏。',
            'The PR lengthens beat by beat: about 150 → 235 → 275 ms. The increments shrink: about 85, then about 40 ms — the largest increment comes on the 2nd beat.',
            'El PR se alarga latido a latido: unos 150 → 235 → 275 ms. Los incrementos se reducen: unos 85 y luego unos 40 ms; el mayor incremento cae en el 2.º latido.',
          ),
          marks: [{ auto: 'pr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('RR 逐搏缩短', 'The RR shortens beat by beat', 'El RR se acorta latido a latido'),
          body: l(
            '每个 RR = PP + 该搏的 PR 增量。PP ≈ 800 ms，所以 RR ≈ 885 → 840 ms：因为增量在缩小，RR 在缩短——文氏周期里的“渐快”。',
            'Each RR = PP + that beat\'s PR increment. The PP is about 800 ms, so the RR runs about 885 → 840 ms: because the increments shrink, the RR shortens — the "quickening" inside a Wenckebach cycle.',
            'Cada RR = PP + el incremento del PR de ese latido. El PP es de unos 800 ms, así que el RR va de unos 885 → 840 ms: como los incrementos se reducen, el RR se acorta, la «aceleración» dentro del ciclo de Wenckebach.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('间歇与最可靠的征象', 'The pause, and the most reliable sign', 'La pausa y el signo más fiable'),
          body: l(
            '间歇 ≈ 2×PP − 总增量 ≈ 1600 − 130 = 1470 ms，**小于 2×PP**。间歇后第一个 PR（约 150 ms）明显短于间歇前最后一个 PR（约 275 ms）——这是 Mobitz I 最可靠的征象，在非典型序列中也成立。窄 QRS、P 率 < 100：**Mobitz I，房室结水平**。',
            'The pause is about 2 x PP − total increment ≈ 1600 − 130 = 1470 ms, **shorter than 2 x PP**. And the first PR after the pause (about 150 ms) is clearly shorter than the last PR before it (about 275 ms) — the most reliable sign of Mobitz I, valid even in atypical sequences. Narrow QRS, P rate < 100: **Mobitz I at the AV-node level**.',
            'La pausa es unos 2 x PP − incremento total ≈ 1600 − 130 = 1470 ms, **menor de 2 x PP**. Y el primer PR tras la pausa (unos 150 ms) es claramente más corto que el último PR previo (unos 275 ms): el signo más fiable del Mobitz I, válido incluso en secuencias atípicas. QRS estrecho y frecuencia de P < 100: **Mobitz I a nivel del nodo AV**.',
          ),
          marks: [{ auto: 'blocked-p' }, { auto: 'pr' }],
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('av-block-2-mobitz1', 445, undefined, '3to2'),
      view: STRIP,
      marks: [{ auto: 'blocked-p' }],
      caption: l(
        '**3:2 周期**：每 3 个 P 下传 2 个。文氏周期很短时，PR 渐进延长只有一步（约 150 → 260 ms）就落空——成组搏动变成“成对＋间歇”。周期越短，越要靠“间歇后 PR 变短”来辨认。',
        '**3:2 periods**: three P waves, two of them conducted. When the Wenckebach cycle is this short, the PR progression has only one step (about 150 → 260 ms) before the drop — the group beating becomes "pairs plus a pause". The shorter the cycle, the more you lean on "the PR shortens after the pause".',
        '**Ciclos 3:2**: tres ondas P, dos conducidas. Cuando el ciclo de Wenckebach es tan corto, la progresión del PR tiene un solo escalón (unos 150 → 260 ms) antes del latido perdido: el agrupamiento se vuelve «parejas más pausa». Cuanto más corto es el ciclo, más te apoyas en «el PR se acorta tras la pausa».',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('av-block-2-mobitz1', 446, undefined, '5to4'),
      view: STRIP,
      marks: [{ auto: 'pr' }],
      caption: l(
        '**5:4 周期**：周期更长（4 个连续 PR），增量更小、RR 的缩短也更细腻。非典型序列——增量不递减、RR 不缩短——在长周期中很常见，甚至可能过半；**最可靠的仍是“间歇后第一个 PR 最短”**，而不是完整算术。',
        '**5:4 periods**: a longer cycle (four consecutive PRs), smaller increments and a subtler RR shortening. Atypical sequences — increments that do not shrink, an RR that does not shorten — are common in long cycles and may even be the majority; **the reliable sign remains "the first PR after the pause is the shortest"**, not the full arithmetic.',
        '**Ciclos 5:4**: un ciclo más largo (cuatro PR consecutivos), incrementos más pequeños y acortamiento del RR más sutil. Las secuencias atípicas —incrementos que no disminuyen, RR que no se acorta— son frecuentes en los ciclos largos y pueden ser incluso la mayoría; **el signo fiable sigue siendo «el primer PR tras la pausa es el más corto»**, no la aritmética completa.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('athlete', 447, undefined, 'first-degree'),
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'pr' }],
      caption: l(
        '22 岁训练有素的运动员：窦性心动过缓伴 PR 延长（< 400 ms）且 1:1 下传——训练相关改变，**无需进一步评估**；PR ≥ 400 ms 才需要。记住这张图：一度阻滞常常是良性的，判读永远看背景。',
        'A 22-year-old trained athlete: sinus bradycardia with a prolonged PR (< 400 ms) and 1:1 conduction — a training-related finding that **needs no work-up**; only PR >= 400 ms does. Keep this tracing in mind: first-degree block is often benign; reading is always about context.',
        'Deportista entrenado de 22 años: bradicardia sinusal con PR prolongado (< 400 ms) y conducción 1:1, un hallazgo relacionado con el entrenamiento que **no requiere estudio**; solo un PR ≥ 400 ms lo exige. Recuerda este trazado: el bloqueo de primer grado suele ser benigno; leer es siempre cuestión de contexto.',
      ),
    },
    {
      kind: 'contrast',
      title: l('真文氏还是假性阻滞？', 'True Wenckebach or pseudo-block?', '¿Wenckebach verdadero o seudobloqueo?'),
      view: STRIP,
      left: {
        ecg: synth('av-block-2-mobitz1', 448),
        caption: l('A：Mobitz I——P 按时到达、形态一致', 'A: Mobitz I — the P waves arrive on time and look identical', 'A: Mobitz I: las P llegan a tiempo y son idénticas'),
        marks: [{ auto: 'blocked-p' }],
      },
      right: {
        ecg: synth('pac-blocked', 449),
        caption: l('B：未下传房早——P′ 提前、埋在 T 波上', 'B: blocked PAC — the P′ is early and buried on the T wave', 'B: extrasístole auricular bloqueada: la P′ es precoz y está enterrada en la T'),
        marks: [{ auto: 'blocked-p' }],
      },
      point: l(
        '两侧都有一个“没有 QRS 的 P”，但机制不同。A 的 P **按时到达、形态正常**，P 率恒定（< 100 次/分）——真文氏。B 的未下传 P′ **提前**出现、形态变形、骑在前一个 T 波上——**假性房室传导阻滞**：房早来得太早，房室结还处于不应期。诊断任何二度阻滞之前：确认 P 率恒定 < 100、P 波为窦性形态，并逐个对比 T 波形状，找出藏在里面的 P′。',
        'Both sides show "a P with no QRS", but the mechanisms differ. In A the P arrives **on time with a normal shape** and the P rate is constant (< 100/min) — true Wenckebach. In B the non-conducted P′ comes **early**, deformed, riding on the previous T wave — **pseudo-AV block**: the atrial extrasystole was so premature that the AV node was still refractory. Before diagnosing any second-degree block: confirm a constant P rate < 100 and sinus P morphology, and compare T-wave shapes one by one to find the P′ hiding inside.',
        'Ambos lados muestran «una P sin QRS», pero los mecanismos difieren. En A la P llega **a tiempo con morfología normal** y la frecuencia de P es constante (< 100 lpm): Wenckebach verdadero. En B la P′ no conducida aparece **precoz**, deformada, cabalgando sobre la T anterior: **seudobloqueo AV**; la extrasístole auricular fue tan precoz que el nodo AV seguía en refractoriedad. Antes de diagnosticar cualquier bloqueo de segundo grado: confirma una frecuencia de P constante < 100 y morfología sinusal, y compara las ondas T una a una para encontrar la P′ escondida.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'decision-tree', params: { tree: 'brady-av-block' } },
      caption: l(
        '决策树里今天的位置：心率慢 → 先看 P 与 QRS 的关系 → PR 延长且 1:1 ＝一度（延迟）；出现落空 → 读落空前后的 PR 行为：渐进延长后落空、间歇后又变短 ＝ Mobitz I；PR 恒定的“冷落空” ＝ Mobitz II（r4）。',
        'Where today sits in the decision tree: slow rate → first the P-QRS relationship → PR long with 1:1 = first degree (delay); a dropped beat → read the PR behaviour around it: progressive lengthening, the drop, then short again after the pause = Mobitz I; a cold drop with a constant PR = Mobitz II (r4).',
        'Dónde encaja lo de hoy en el árbol de decisión: frecuencia lenta → primero la relación P-QRS → PR largo con 1:1 = primer grado (retraso); un latido perdido → lee el comportamiento del PR a su alrededor: alargamiento progresivo, caída y PR corto de nuevo tras la pausa = Mobitz I; caída brusca con PR constante = Mobitz II (r4).',
      ),
    },
    { kind: 'check', item: { family: 'av-block', seed: 14 } },
    { kind: 'check', item: { family: 'av-block', seed: 11 } },
    { kind: 'check', item: { family: 'measure-pr', seed: 6 } },
    { kind: 'drill', families: ['av-block', 'measure-pr'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [20889, 9108, 19164],
      caption: l(
        '三份真实心电图（PTB-XL）：前两份（75 岁、83 岁男性）为一度房室传导阻滞；第三份（89 岁女性）标注为二度房室传导阻滞，但未注明分型——搏动成组出现。先在 II 导联测 PR；第三份请逐搏追踪每个间歇前后的 PR，自己判断是 Mobitz I 还是 Mobitz II。**先想好结论再揭晓**。',
        'Three real ECGs (PTB-XL): the first two (men aged 75 and 83) are first-degree AV block; the third (a woman of 89) is labelled second-degree AV block without a type — the beats come in groups. Measure the PR in lead II first; on the third, follow the PR beat by beat around each pause and decide for yourself whether it is Mobitz I or Mobitz II. **Commit to a conclusion before you reveal**.',
        'Tres ECG reales (PTB-XL): los dos primeros (varones de 75 y 83 años) son un bloqueo AV de primer grado; el tercero (mujer de 89) está etiquetado como bloqueo AV de segundo grado sin especificar el tipo: los latidos aparecen agrupados. Mide primero el PR en la derivación II; en el tercero, sigue el PR latido a latido alrededor de cada pausa y decide tú si es un Mobitz I o un Mobitz II. **Decide tu conclusión antes de mirar la solución**.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '落空一出现就报 Mobitz II：先追 PR 趋势——落空前 PR 渐进延长、落空后第一个 PR 变短 ＝ Mobitz I。',
          'Calling Mobitz II the moment a beat drops: march the PR trend first — progressive lengthening before the drop and a shorter first PR after it = Mobitz I.',
          'Diagnosticar Mobitz II en cuanto cae un latido: sigue primero la tendencia del PR: alargamiento progresivo antes de la caída y primer PR más corto después = Mobitz I.',
        ),
        l(
          '把未下传房早读成 Mobitz：假性阻滞的 P′ 提前、变形、常埋在 T 波上；真 Mobitz 的 P 按时到达、形态一致。',
          'Reading a blocked PAC as Mobitz: in pseudo-block the P′ is early, deformed and often buried on the T wave; in true Mobitz the P is on time and identical.',
          'Leer una extrasístole auricular bloqueada como Mobitz: en el seudobloqueo la P′ es precoz, deformada y a menudo está enterrada en la T; en el Mobitz verdadero la P llega a tiempo y es idéntica.',
        ),
        l(
          'P 率 > 100 次/分时下“二度阻滞”：Mobitz 的定义要求 P 率恒定且 < 100——更快的心房是房性心动过速伴阻滞。',
          'Diagnosing "second-degree block" with a P rate > 100/min: the Mobitz definitions require a constant P rate < 100 — a faster atrium is atrial tachycardia with block.',
          'Diagnosticar «bloqueo de segundo grado» con una frecuencia de P > 100 lpm: las definiciones de Mobitz exigen una frecuencia P constante < 100; una aurícula más rápida es una taquicardia auricular con bloqueo.',
        ),
        l(
          'PR > 200 ms 只写“阻滞”而不说“延迟”：一度没有 P 被阻断，命名要说清——这决定患者被如何随访。',
          'Writing just "block" for a PR > 200 ms without saying "delay": no P is blocked in first degree; name it precisely — it decides how the patient is followed up.',
          'Escribir solo «bloqueo» ante un PR > 200 ms sin decir «retraso»: en el primer grado no se bloquea ninguna P; nómbralo con precisión, porque determina el seguimiento del paciente.',
        ),
        l(
          '夜间迷走性房室阻滞被装起搏器：窦性减慢与 PR 延长或落空并存、活动后消失——先筛查睡眠呼吸暂停与药物。',
          'Pacing nocturnal vagal AV block: sinus slowing coexists with PR lengthening or a dropped beat and it resolves with activity — screen for sleep apnoea and drugs first.',
          'Implantar un marcapasos por un bloqueo AV vagal nocturno: el enlentecimiento sinusal coexiste con PR largo o un latido perdido y desaparece con la actividad: descarta primero apnea del sueño y fármacos.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '一度 ＝ PR > 200 ms 且每个 P 下传（1:1）——是**延迟**不是阻断；窄 QRS 且 PR > 300 ms 提示延迟在房室结。',
          'First degree = PR > 200 ms with every P conducted (1:1) — a **delay**, not an interruption; narrow QRS with PR > 300 ms points to the AV node.',
          'Primer grado = PR > 200 ms con todas las P conducidas (1:1): un **retraso**, no una interrupción; QRS estrecho con PR > 300 ms apunta al nodo AV.',
        ),
        l(
          'Mobitz I：单个未下传 P、前后 PR 不恒定；**间歇后第一个 PR 短于间歇前最后一个 PR** 是最可靠的征象。',
          'Mobitz I: a single non-conducted P with an inconstant PR around it; **the first PR after the pause shorter than the last PR before it** is the most reliable sign.',
          'Mobitz I: una P no conducida única con PR inconstante alrededor; **el primer PR tras la pausa más corto que el último previo** es el signo más fiable.',
        ),
        l(
          '典型文氏：增量递减 → RR 缩短、间歇 < 2×PP；窄 QRS → 房室结，阿托品/运动可改善；非典型序列常见，别只靠算术。',
          'Typical Wenckebach: shrinking increments → shortening RR, pause < 2 x PP; narrow QRS → AV node, improving with atropine/exercise; atypical sequences are common — do not rely on arithmetic alone.',
          'Wenckebach típico: incrementos decrecientes → RR que se acorta y pausa < 2 x PP; QRS estrecho → nodo AV, mejora con atropina/ejercicio; las secuencias atípicas son frecuentes: no te fíes solo de la aritmética.',
        ),
        l(
          '诊断二度前先排除假性阻滞：未下传房早（P′ 藏于 T、提前）与迷走性阻滞（窦缓＋PR 延长）；P 率须恒定 < 100。',
          'Before second degree, exclude pseudo-block: a blocked PAC (early P′ hidden on T) and vagal block (sinus slowing + PR lengthening); the P rate must be constant < 100.',
          'Antes del segundo grado, excluye el seudobloqueo: extrasístole auricular bloqueada (P′ precoz oculta en la T) y bloqueo vagal (enlentecimiento sinusal + PR largo); la frecuencia de P debe ser constante < 100.',
        ),
        l(
          '起搏：一度与房室结水平 Mobitz I 仅在症状明确归因时考虑，无症状为 III 类；运动员 PR < 400 ms 属训练相关。',
          'Pacing: first degree and AV-nodal Mobitz I are considered only when symptoms are clearly attributable, asymptomatic is Class III; in athletes a PR < 400 ms is training-related.',
          'Marcapasos: el primer grado y el Mobitz I del nodo AV solo se plantean si los síntomas son claramente atribuibles, asintomático es clase III; en deportistas un PR < 400 ms es adaptación al entrenamiento.',
        ),
      ],
    },
  ],
  sources: [
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
