/**
 * h1 — Atrial abnormality and interatrial block (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md `atrial-timing`, `rae-criteria`, `lae-criteria`, `biatrial` (current values,
 * not the book column), plus the missing-in-book items: interatrial block (partial P >=120 ms; advanced adds a
 * biphasic +/− P in II/III/aVF, Bayés syndrome) and the Morris P-terminal force in V1 (>=0.04 mm·s).
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
  id: 'h1',
  stage: 'H',
  order: 1,
  title: l('心房异常与房间传导阻滞', 'Atrial abnormality and interatrial block', 'Anomalía auricular y bloqueo interauricular'),
  summary: l(
    'P 波就是心房自身的心电图：在 II 看振幅与时限，在 V1 看起始（右心房）与终末（左心房），据此命名右、左、双心房异常与房间传导阻滞——术语用“异常”，不用“扩大”。',
    'The P wave is the ECG of the atria themselves: read amplitude and duration in II and the initial (RA) and terminal (LA) parts in V1, then name right, left, biatrial abnormality or interatrial block — the word is "abnormality", not "enlargement".',
    'La onda P es el ECG de las propias aurículas: lee amplitud y duración en II y las porciones inicial (AD) y terminal (AI) en V1, y nombra después la anomalía auricular derecha, izquierda, biauricular o el bloqueo interauricular; la palabra es «anomalía», no «dilatación».',
  ),
  objectives: [
    l(
      '解释为什么 P 波前部代表右心房、终末部代表左心房，以及为什么 II 和 V1 是读心房的导联。',
      'Explain why the early P is the right atrium and the late P the left atrium, and why II and V1 are the leads that read them.',
      'Explicar por qué la parte inicial de la P corresponde a la aurícula derecha y la final a la izquierda, y por qué II y V1 son las derivaciones que las leen.',
    ),
    l(
      '应用右心房异常标准（II 导联 P >2.5 mm、V1 起始正向 >1.5 mm、时限正常）与左心房异常标准（P ≥120 ms、双峰间距 ≥40 ms、V1 终末电势 ≥0.04 mm·s）。',
      'Apply the right atrial abnormality criteria (P >2.5 mm in II, initial V1 positivity >1.5 mm, normal duration) and the left atrial abnormality criteria (P >=120 ms, interpeak notch >=40 ms, V1 P-terminal force >=0.04 mm·s).',
      'Aplicar los criterios de anomalía auricular derecha (P >2,5 mm en II, positividad inicial en V1 >1,5 mm, duración normal) y de anomalía auricular izquierda (P >=120 ms, muesca entre picos >=40 ms, fuerza terminal en V1 >=0,04 mm·s).',
    ),
    l(
      '在一份心电图上识别双心房异常：两组表现在同一个 P 波上。',
      'Recognise biatrial abnormality in one tracing: both sets of signs in the same P wave.',
      'Reconocer la anomalía biauricular en una misma gráfica: los dos conjuntos de signos sobre una sola onda P.',
    ),
    l(
      '区分部分型与高度型房间传导阻滞（P ≥120 ms；下壁导联正负双向 P 波），并说出其与房颤、卒中的联系（Bayés 综合征）。',
      'Distinguish partial from advanced interatrial block (P >=120 ms; biphasic +/− P in the inferior leads) and state its link to AF and stroke (Bayés syndrome).',
      'Distinguir el bloqueo interauricular parcial del avanzado (P >=120 ms; P bifásica +/− en las derivaciones inferiores) y citar su relación con la fibrilación auricular y el ictus (síndrome de Bayés).',
    ),
  ],
  minutes: 15,
  competencies: ['C7'],
  findings: ['lae', 'rae', 'biatrial-abnormality', 'interatrial-block'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('lae', 1201),
      view: { layout: '3x4+1', highlightLeads: ['II', 'V1'] },
      question: l(
        '先别读 QRS。只看 II 和 V1 的 P 波：心房在对你说什么？先想好你的判断再继续。',
        'Do not read a single QRS yet. Look only at the P waves in II and V1: what are the atria telling you? Commit to an answer.',
        'No leas todavía ningún QRS. Mira solo las ondas P en II y V1: ¿qué te dicen las aurículas? Decide una respuesta antes de continuar.',
      ),
      reveal: l(
        'II 导联的 P 波**宽大而有切迹**（两个峰，间距 ≥40 ms），V1 导联的 P 波以**宽的终末负向**收尾：**左心房异常**。P 波振幅不高——右心房很安静；这条信息说的是**时限**，不是高度。本课教你把这句话读得有章法：看哪个导联、量什么、叫什么名字。',
        'The P in II is **broad and notched** (two peaks, >=40 ms apart) and in V1 the P ends with a **wide terminal negative portion**: **left atrial abnormality**. The amplitude is not high — the right atrium is quiet; the message is **duration**, not height. This lesson teaches you to read that message methodically: which lead, which measurement, which name.',
        'La P de II es **ancha y con muesca** (dos picos separados >=40 ms) y en V1 la P termina con una **porción terminal negativa ancha**: **anomalía auricular izquierda**. La amplitud no es alta: la aurícula derecha está tranquila; el mensaje es la **duración**, no la altura. Esta lección te enseña a leer ese mensaje con método: qué derivación, qué medición y qué nombre.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('normal', 1202, { rate: 70 }),
      showConduction: true,
      emphasize: ['sa-node', 'ra', 'la'],
      caption: l(
        '窦房结在右心房上部放电：右心房先除极，大约构成 P 波的前三分之二；左心房约晚 20–30 ms 经 Bachmann 束开始除极，并完成 P 波的终末部——成人 P 波总时限 <120 ms。所以 **P 波前部 = 右心房，终末部 = 左心房**，而 V1 正对着这个先后次序：起始的正向部分是右心房（在前、朝向 V1），终末的负向部分是左心房（在后、背离 V1）。',
        'The sinus node fires high in the right atrium: the RA depolarises first and makes roughly the first two-thirds of the P; the LA starts about 20-30 ms later over Bachmann\'s bundle and finishes the wave — total adult P duration <120 ms. So the **early P = right atrium, late P = left atrium**, and V1 looks straight at that order: its initial positive part is the RA (anterior, towards V1) and its terminal negative part is the LA (posterior, away from V1).',
        'El nodo sinusal dispara en la parte alta de la aurícula derecha: la AD se despolariza primero y forma aproximadamente los dos primeros tercios de la P; la AI comienza unos 20-30 ms después por el haz de Bachmann y termina la onda; la duración P total del adulto es <120 ms. Así, la **parte inicial de la P = aurícula derecha y la parte final = aurícula izquierda**, y V1 mira de frente a ese orden: su porción inicial positiva es la AD (anterior, hacia V1) y su porción terminal negativa es la AI (posterior, alejándose de V1).',
      ),
    },
    {
      kind: 'text',
      title: l('读心房的两个导联：II 和 V1', 'The two leads that read the atria: II and V1', 'Las dos derivaciones que leen las aurículas: II y V1'),
      body: l(
        'P 波电轴约 +60°，几乎与 II 导联平行——**振幅和时限在 II 最清楚**。V1 位于心房右侧：右心房在前（朝向 V1），左心房在后（背离 V1），所以 V1 把 P 波拆成**起始正向（右心房）+ 终末负向（左心房）**两部分。\n- 高而不宽 → 想右心房；宽而不高 → 想左心房；又高又宽 → 双心房。\n- 报告写**“右/左/双心房异常”**：体表心电图分不清扩大、肥厚、负荷过重还是传导延迟，不要写 enlargement/overload/strain，也不要从 P 波推断压力负荷还是容量负荷。',
        'The P axis is about +60°, almost parallel to lead II — **amplitude and duration read best in II**. V1 sits to the right of the atria: the RA is anterior (towards V1), the LA posterior (away from V1), so V1 splits the P into an **initial positive (RA) + terminal negative (LA)**.\n- Tall but not wide -> think right atrium; wide but not tall -> think left atrium; tall and wide -> biatrial.\n- Write **"right/left/biatrial abnormality"** in the report: the surface ECG cannot separate enlargement from hypertrophy, overload or conduction delay — avoid "enlargement/overload/strain", and do not infer pressure from volume load.',
        'El eje de la P ronda los +60°, casi paralelo a la derivación II: la **amplitud y la duración se leen mejor en II**. V1 está a la derecha de las aurículas: la AD es anterior (hacia V1) y la AI posterior (se aleja de V1), así que V1 descompone la P en una **porción inicial positiva (AD) + una terminal negativa (AI)**.\n- Alta pero no ancha -> piensa en la aurícula derecha; ancha pero no alta -> en la izquierda; alta y ancha -> biauricular.\n- Escribe en el informe **«anomalía auricular derecha/izquierda/biauricular»**: el ECG de superficie no distingue dilatación de hipertrofia, sobrecarga ni retardo de conducción; evita «dilatación/sobrecarga/strain» y no infieras sobrecarga de presión frente a volumen.',
      ),
    },
    {
      kind: 'criteria',
      title: l('心房异常与房间传导阻滞标准', 'Criteria: atrial abnormality and interatrial block', 'Criterios: anomalía auricular y bloqueo interauricular'),
      items: [
        {
          label: l('右心房异常', 'Right atrial abnormality', 'Anomalía auricular derecha'),
          value: l(
            'II 导联 P >2.5 mm（或 III/aVF），常尖峰样；V1/V2 起始正向 >1.5 mm；P 电轴右偏（>+75°）；时限正常（<120 ms）',
            'P >2.5 mm in II (or III/aVF), typically peaked; initial positive P in V1/V2 >1.5 mm; rightward P axis (>+75 deg); normal duration (<120 ms)',
            'P >2,5 mm en II (o III/aVF), habitualmente picuda; positividad inicial en V1/V2 >1,5 mm; eje de la P desviado a la derecha (>+75°); duración normal (<120 ms)',
          ),
        },
        {
          label: l('左心房异常', 'Left atrial abnormality', 'Anomalía auricular izquierda'),
          value: l(
            'II 导联 P ≥120 ms；双峰/切迹，峰间距 ≥40 ms；V1 终末负向 ≥1 mm 且 ≥40 ms（终末电势 ≥0.04 mm·s）',
            'P >=120 ms in II; notched/bifid with interpeak >=40 ms; terminal negative P in V1 >=1 mm deep and >=40 ms (P-terminal force >=0.04 mm·s)',
            'P >=120 ms en II; con muesca (bífida) y picos separados >=40 ms; negatividad terminal en V1 >=1 mm y >=40 ms (fuerza terminal >=0,04 mm·s)',
          ),
        },
        {
          label: l('双心房异常', 'Biatrial abnormality', 'Anomalía biauricular'),
          value: l(
            '两组表现同时存在：II 导联 P >2.5 mm 且 ≥120 ms；或 V1 双向 P，起始正向 >1.5 mm 且终末负向 ≥1 mm、≥40 ms',
            'Both sets together: P in II >2.5 mm AND >=120 ms; or a biphasic V1 P with initial positive >1.5 mm AND terminal negative >=1 mm and >=40 ms',
            'Los dos conjuntos a la vez: P en II >2,5 mm Y >=120 ms; o P bifásica en V1 con positividad inicial >1,5 mm Y negatividad terminal >=1 mm y >=40 ms',
          ),
        },
        {
          label: l('房间传导阻滞（部分型）', 'Interatrial block, partial', 'Bloqueo interauricular parcial'),
          value: l('P ≥120 ms，下壁导联无正负双向', 'P >=120 ms without the biphasic inferior pattern', 'P >=120 ms sin el patrón bifásico inferior'),
        },
        {
          label: l('房间传导阻滞（高度型）', 'Interatrial block, advanced', 'Bloqueo interauricular avanzado'),
          value: l(
            'P ≥120 ms 且 II、III、aVF 呈正负双向（+/−）P 波；与房颤和卒中相关（Bayés 综合征）',
            'P >=120 ms with a biphasic (+/−) P in II, III and aVF; linked to AF and stroke (Bayés syndrome)',
            'P >=120 ms con P bifásica (+/−) en II, III y aVF; asociada a fibrilación auricular e ictus (síndrome de Bayés)',
          ),
        },
        {
          label: l('术语', 'Terminology', 'Terminología'),
          value: l(
            '写“心房异常”，不写“扩大/肥厚/劳损”；体表心电图无法区分这些机制',
            'Say "atrial abnormality", not "enlargement/hypertrophy/strain"; the surface ECG cannot separate these mechanisms',
            'Di «anomalía auricular», no «dilatación/hipertrofia/sobrecarga»; el ECG de superficie no separa estos mecanismos',
          ),
        },
      ],
      source:
        'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261; Morris JJ et al. Circulation 1964;29:242-252; Bayés de Luna A et al. J Electrocardiol 2012;45:445-451',
    },
    {
      kind: 'worked',
      title: l('规范测量 P 波：时限、切迹、终末电势', 'Measure the P properly: duration, notch, terminal force', 'Mide bien la P: duración, muesca y fuerza terminal'),
      ecg: synth('lae', 1203),
      view: { layout: '3x4+1', highlightLeads: ['II', 'V1'] },
      steps: [
        {
          title: l('II 导联：量时限', 'Lead II: measure the duration', 'Derivación II: mide la duración'),
          body: l(
            '把分规一脚放在 P 波起点（离开基线的第一下），另一脚放在 P 波回到基线处：约 150 ms，≥120 ms。没有自动标注替你量 P 波时限——分规走出来的数字才是你的证据。',
            'Put one caliper point on the P onset (the first stir off the baseline) and the other where the P returns to it: about 150 ms, >=120 ms. There is no auto-mark that measures P duration for you — the number you walk out with the calipers is the evidence.',
            'Apoya una punta del compás en el inicio de la P (la primera desviación de la línea de base) y la otra donde la P vuelve a ella: unos 150 ms, >=120 ms. No existe una marca automática que mida por ti la duración de la P: el número que obtienes con el compás es tu evidencia.',
          ),
          marks: [{ auto: 'p', lead: 'II' }],
          view: { layout: 'single', lead: 'II', calipers: true },
        },
        {
          title: l('看切迹', 'Look at the notch', 'Mira la muesca'),
          body: l(
            '宽大的 P 有两个峰：第一个是右心房，第二个是左心房。两个峰的间距 ≥40 ms——旧称“二尖瓣型 P 波”，现在的规范表述是**左心房异常**。',
            'The broad P has two peaks: the first is the right atrium, the second the left. The interpeak distance is >=40 ms — the old name was "P mitrale"; the modern statement is **left atrial abnormality**.',
            'La P ancha tiene dos picos: el primero es la aurícula derecha y el segundo la izquierda. La distancia entre picos es >=40 ms; el nombre antiguo era «P mitral» y la expresión actual es **anomalía auricular izquierda**.',
          ),
          marks: [{ auto: 'p', lead: 'II' }],
          highlightLeads: ['II'],
        },
        {
          title: l('V1 导联：终末电势', 'Lead V1: the terminal force', 'Derivación V1: la fuerza terminal'),
          body: l(
            'V1 里先是一个小的起始正向（右心房），随后是宽的终末负向（左心房）。量它的深度（mm）× 时间（s）：这里深约 1 mm（0.9 mm）、宽约 75 ms，0.9 × 0.075 ≈ 0.07 mm·s——明显超过 **P 波终末电势（PTF）≥0.04 mm·s**（Morris 指数）。注意算的是**乘积**：浅而宽也能达标；“≥1 mm 且 ≥40 ms”只是最常见的达标方式。即便如此，诊断仍靠三项证据合在一起，而不是只靠这一项。',
            'In V1 a small initial positive (right atrium) comes first, then a wide terminal negative (left atrium). Measure its depth (mm) x duration (s): here about 1 mm deep (0.9 mm) and about 75 ms wide, 0.9 x 0.075 ≈ 0.07 mm·s — well above the **P-terminal force threshold of 0.04 mm·s** (Morris index). It is the **product** that counts: a shallow but wide terminal P can qualify; "≥1 mm and ≥40 ms" is only the commonest way to get there. Even so, the diagnosis rests on the three signs together, not on this one alone.',
            'En V1 aparece primero una pequeña positividad inicial (aurícula derecha) y después una porción terminal negativa ancha (aurícula izquierda). Mide su profundidad (mm) x duración (s): aquí alrededor de 1 mm de profundidad (0,9 mm) y unos 75 ms de duración, 0,9 x 0,075 ≈ 0,07 mm·s, claramente por encima del umbral de la **fuerza terminal de la P (0,04 mm·s)** (índice de Morris). Lo que cuenta es el **producto**: una P terminal poco profunda pero ancha también puede cumplirlo; «≥1 mm y ≥40 ms» es solo la forma más habitual de llegar. Aun así, el diagnóstico se apoya en los tres signos juntos, no solo en este.',
          ),
          marks: [{ auto: 'p', lead: 'V1' }],
          view: { layout: 'single', lead: 'V1', calipers: true },
        },
        {
          title: l('下结论', 'State the conclusion', 'Formula la conclusión'),
          body: l(
            '时限约 150 ms + 双峰间距 ≥40 ms + V1 终末电势约 0.07 mm·s：**左心房异常**。QRS 完全正常——这个诊断只靠 P 波就成立；而且它还与房颤和卒中风险相关，值得在报告里单写一行。',
            'Duration about 150 ms + interpeak notch >=40 ms + V1 PTF about 0.07 mm·s: **left atrial abnormality**. The QRS is entirely normal — the diagnosis stands on the P alone; and because it also tracks with AF and stroke risk, it deserves its own line in the report.',
            'Duración de unos 150 ms + muesca entre picos >=40 ms + fuerza terminal en V1 de unos 0,07 mm·s: **anomalía auricular izquierda**. El QRS es totalmente normal: el diagnóstico se sostiene solo con la P y, como además se asocia con riesgo de fibrilación auricular e ictus, merece su propia línea en el informe.',
          ),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'V1' }],
          highlightLeads: ['II', 'V1'],
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('rae', 1204),
      view: { layout: '3x4+1', highlightLeads: ['II', 'V1', 'V2'] },
      marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'V1' }],
      caption: l(
        '右心房异常：II 导联的 P 波**高（>2.5 mm）、窄而尖**（旧称“肺型 P 波”），时限正常（<120 ms）；V1/V2 的**起始正向**部分 >1.5 mm。右心房的信号是**高度**——与左心房异常互为镜像。P 电轴常右偏（>+75°），在 I 导联变低甚至倒置。',
        'Right atrial abnormality: the P in II is **tall (>2.5 mm), narrow and peaked** (the old "P pulmonale") with a normal duration (<120 ms), and the **initial positive** part in V1/V2 exceeds 1.5 mm. The RA message is **height** — the mirror image of the LA pattern. The P axis is often rightward (>+75 deg), going flat or even negative in I.',
        'Anomalía auricular derecha: la P de II es **alta (>2,5 mm), estrecha y picuda** (la antigua «P pulmonar») con duración normal (<120 ms), y la porción **inicial positiva** en V1/V2 supera 1,5 mm. El mensaje de la AD es la **altura**: la imagen especular del patrón de la AI. El eje de la P suele desviarse a la derecha (>+75°) y aplanarse o invertirse en I.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('interatrial-block', 1205, undefined, 'advanced'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVF'] },
      marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'III' }],
      caption: l(
        '高度（晚期）房间传导阻滞：P 波宽（≥120 ms），**并且** II、III、aVF 的 P 波呈**正负双向（+/−）**——左心房除极如此之晚、方向向下，以至于 P 波以负向收尾。这是一种**传导障碍**（Bachmann 束），不只是心房大；它与房颤和卒中相关（Bayés 综合征 = 高度房间传导阻滞 + 房颤），应写进报告，随访时警惕房颤出现。',
        'Advanced interatrial block: the P is broad (>=120 ms) **and** in II, III and aVF it is **biphasic (+/−)** — the LA is activated so late and so inferiorly that the P ends negative. This is a **conduction disorder** (Bachmann\'s bundle), not merely a large atrium; it is linked to AF and stroke (Bayés syndrome = advanced interatrial block + AF). Name it in the report and watch for AF on follow-up.',
        'Bloqueo interauricular avanzado: la P es ancha (>=120 ms) **y** en II, III y aVF es **bifásica (+/−)**: la AI se despolariza tan tarde y hacia abajo que la P termina negativa. Es un **trastorno de conducción** (haz de Bachmann), no solo una aurícula grande; se asocia con fibrilación auricular e ictus (síndrome de Bayés = bloqueo interauricular avanzado + FA). Nómbralo en el informe y vigila la aparición de FA en el seguimiento.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('biatrial-abnormality', 1206),
      view: { layout: '3x4+1', highlightLeads: ['II', 'V1'] },
      marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'V1' }],
      caption: l(
        '双心房异常：两组表现在同一个 P 波上——II 导联的 P 波**又高（约 2.7 mm，>2.5 mm）又宽（约 140 ms，≥120 ms）**：仅凭 II 就满足标准。V1 是佐证：起始正向约 1.5 mm（右心房部分，正卡在 >1.5 mm 的界值上）后接宽的终末负向（深约 0.9 mm、宽约 70 ms，左心房部分，深度差一点到 ≥1 mm）——V1 那组标准是临界的，所以靠 II 下结论。发现任何一侧心房异常时，报告写完之前一定再查另一侧。',
        'Biatrial abnormality: both signatures in one P — in II the P is **both tall (about 2.7 mm, >2.5 mm) and broad (about 140 ms, >=120 ms)**: lead II alone meets the criterion. V1 is supportive: an initial positive of about 1.5 mm (the RA half, right on the >1.5 mm cut-off) followed by a wide terminal negative (about 0.9 mm deep and 70 ms long; the LA half, just short of >=1 mm) — the V1 version is borderline, so lead II carries the call. Whenever you find one atrial abnormality, check the other side before you close the report.',
        'Anomalía biauricular: las dos firmas en una misma P; en II la P es a la vez **alta (unos 2,7 mm, >2,5 mm) y ancha (unos 140 ms, >=120 ms)**: la derivación II por sí sola cumple el criterio. V1 lo apoya: una positividad inicial de unos 1,5 mm (la mitad derecha, justo en el umbral de >1,5 mm) seguida de una negatividad terminal ancha (unos 0,9 mm de profundidad y 70 ms; la mitad izquierda, algo por debajo de >=1 mm): la versión de V1 está en el límite, así que la conclusión la sostiene II. Cuando encuentres una anomalía de una aurícula, comprueba la otra antes de cerrar el informe.',
      ),
    },
    {
      kind: 'contrast',
      title: l('高还是宽？右心房对左心房', 'Tall or wide? Right atrium vs left atrium', '¿Alta o ancha? Aurícula derecha frente a izquierda'),
      view: STRIP,
      left: {
        ecg: synth('rae', 1207),
        caption: l('A：右心房异常——高、窄、尖的 P 波', 'A: right atrial abnormality — tall, narrow, peaked P', 'A: anomalía auricular derecha — P alta, estrecha y picuda'),
        marks: [{ auto: 'p' }],
      },
      right: {
        ecg: synth('lae', 1208),
        caption: l('B：左心房异常——宽大、有切迹的 P 波', 'B: left atrial abnormality — broad, notched P', 'B: anomalía auricular izquierda — P ancha y con muesca'),
        marks: [{ auto: 'p' }],
      },
      point: l(
        '两种心房说同一种语言、在同一个导联里。A：P 波**高而不宽**——振幅 >2.5 mm、时限正常：右心房异常。B：P 波**宽而不高**——≥120 ms、双峰：左心房异常。高 = 右；宽 = 左；又高又宽 = 双心房异常；宽 + 下壁导联正负双向 = 高度房间传导阻滞。',
        'Both atria speak in the same lead. A: the P is **tall but not wide** — amplitude >2.5 mm with a normal duration: right atrial abnormality. B: the P is **wide but not tall** — >=120 ms with two peaks: left atrial abnormality. Tall = right; wide = left; tall and wide = biatrial; wide with a +/− inferior P = advanced interatrial block.',
        'Ambas aurículas hablan en la misma derivación. A: la P es **alta pero no ancha** — amplitud >2,5 mm con duración normal: anomalía auricular derecha. B: la P es **ancha pero no alta** — >=120 ms con dos picos: anomalía auricular izquierda. Alta = derecha; ancha = izquierda; alta y ancha = biauricular; ancha con P bifásica (+/−) en las inferiores = bloqueo interauricular avanzado.',
      ),
    },
    { kind: 'check', item: { family: 'chambers', seed: 25 } },
    { kind: 'check', item: { family: 'chambers', seed: 2 } },
    { kind: 'check', item: { family: 'chambers-findings', seed: 22 } },
    { kind: 'drill', families: ['chambers', 'chambers-findings'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [6851, 12984, 15181],
      caption: l(
        '三份真实心电图：前两份为左心房异常，第三份为右心房异常。先读 II（高度、时限），再读 V1（起始正向、终末负向），先想好你的判读，然后再揭晓。',
        'Three real ECGs: the first two show left atrial abnormality and the third right atrial abnormality. Read II first (height, duration), then V1 (initial positive, terminal negative), decide your statements, and only then reveal.',
        'Tres ECG reales: los dos primeros muestran una anomalía auricular izquierda y el tercero una anomalía auricular derecha. Lee primero II (altura, duración) y después V1 (positividad inicial, negatividad terminal), decide tus conclusiones y solo entonces mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '只在 II 导联读 P 波（“二尖瓣型 P 波”），忘了 V1：V1 的 P 波终末电势常是左心房异常最敏感的证据。',
          'Reading the P only in lead II ("P mitrale") and forgetting V1: the V1 P-terminal force is often the most sensitive sign of left atrial abnormality.',
          'Leer la P solo en la derivación II («P mitral») y olvidar V1: la fuerza terminal de la P en V1 es a menudo el signo más sensible de anomalía auricular izquierda.',
        ),
        l(
          'P 波 ≥120 ms 只写“P 波增宽”：这是房间传导阻滞，要写出名字；若 II、III、aVF 的 P 波正负双向，则是高度型（Bayés 综合征，房颤与卒中风险）。',
          'Writing "just a broad P" for P >=120 ms: that is interatrial block — name it; if the P is biphasic (+/−) in II, III and aVF it is the advanced form (Bayés syndrome, AF and stroke risk).',
          'Escribir solo «P ancha» ante una P >=120 ms: eso es un bloqueo interauricular, ponle nombre; si la P es bifásica (+/−) en II, III y aVF, es la forma avanzada (síndrome de Bayés, riesgo de FA e ictus).',
        ),
        l(
          '瘦胸壁、年轻人的尖峰 P 波被直接判为右心房异常：振幅受胸壁厚度和增益影响——先查 V1 起始正向和 P 电轴再下结论。',
          'Calling a peaked P right atrial abnormality in a thin young chest: amplitude depends on chest wall and gain — check the V1 initial positivity and the P axis before you commit.',
          'Llamar anomalía auricular derecha a una P picuda en un tórax joven y delgado: la amplitud depende del tórax y de la ganancia; comprueba la positividad inicial en V1 y el eje de la P antes de decidir.',
        ),
        l(
          '双心房表现只报了一侧：又高又宽的 P（或 V1 同时有大起始正向和深终末负向）要写“双心房异常”，把两侧都写进去。',
          'Reporting a biatrial pattern as one side only: a P both tall and broad (or a V1 P with both a large initial positive and a deep terminal negative) must be reported as biatrial abnormality, naming both sides.',
          'Informar un patrón biauricular como de una sola aurícula: una P alta y ancha (o una P en V1 con positividad inicial grande y negatividad terminal profunda) debe informarse como anomalía biauricular, nombrando ambos lados.',
        ),
        l(
          '沿用“扩大/肥厚/劳损”这些旧词：规范术语是“心房异常”，心电图分不出背后的机制。',
          'Keeping the old words "enlargement/hypertrophy/strain": the preferred term is atrial abnormality — the ECG cannot tell the mechanism apart.',
          'Mantener las palabras antiguas «dilatación/hipertrofia/sobrecarga»: el término preferido es anomalía auricular; el ECG no distingue el mecanismo.',
        ),
        l(
          '在半增益或 5 mm/mV 记录上量 P 波振幅：振幅标准（2.5 mm、1.5 mm）默认 10 mm/mV——先确认增益。',
          'Measuring P amplitude on a half-gain or 5 mm/mV recording: the amplitude criteria (2.5 mm, 1.5 mm) assume 10 mm/mV — check the gain first.',
          'Medir la amplitud de la P en un registro a media ganancia o 5 mm/mV: los criterios de amplitud (2,5 mm, 1,5 mm) asumen 10 mm/mV; comprueba antes la ganancia.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '读心房用 **II 和 V1**：II 看振幅和时限，V1 看起始正向（右心房）和终末负向（左心房）。',
          'Read the atria in **II and V1**: II for amplitude and duration, V1 for the initial positive (RA) and terminal negative (LA) parts.',
          'Lee las aurículas en **II y V1**: II para amplitud y duración, V1 para la positividad inicial (AD) y la negatividad terminal (AI).',
        ),
        l(
          '高 = 右心房：II 导联 P >2.5 mm、时限正常（V1 起始正向 >1.5 mm）。宽 = 左心房：P ≥120 ms、峰间距 ≥40 ms、V1 终末电势 ≥0.04 mm·s。',
          'Tall = right atrium: P >2.5 mm in II with a normal duration (initial V1 positivity >1.5 mm). Wide = left atrium: P >=120 ms, interpeak >=40 ms, V1 P-terminal force >=0.04 mm·s.',
          'Alta = aurícula derecha: P >2,5 mm en II con duración normal (positividad inicial en V1 >1,5 mm). Ancha = aurícula izquierda: P >=120 ms, picos separados >=40 ms, fuerza terminal en V1 >=0,04 mm·s.',
        ),
        l(
          '两套表现同在一个 P 波上 = 双心房异常；发现一侧异常后，一定再查另一侧。',
          'Both sets of signs in one P wave = biatrial abnormality; once you find one side, always check the other.',
          'Los dos conjuntos de signos en una misma P = anomalía biauricular; al encontrar una aurícula, comprueba siempre la otra.',
        ),
        l(
          'P ≥120 ms 是房间传导阻滞；若 II、III、aVF 的 P 波正负双向（+/−），则为高度型——与房颤和卒中相关（Bayés 综合征）。',
          'P >=120 ms is interatrial block; with a biphasic (+/−) P in II, III and aVF it is the advanced form — linked to AF and stroke (Bayés syndrome).',
          'Una P >=120 ms es un bloqueo interauricular; si la P es bifásica (+/−) en II, III y aVF, es la forma avanzada, asociada a FA e ictus (síndrome de Bayés).',
        ),
        l(
          '术语写**心房异常**（atrial abnormality），不写“扩大/肥厚/劳损”：体表心电图只给出心房的综合信号，给不出机制。',
          'The word is **atrial abnormality**, not "enlargement/hypertrophy/strain": the surface ECG shows only the summed atrial signal, not the mechanism behind it.',
          'La palabra es **anomalía auricular**, no «dilatación/hipertrofia/sobrecarga»: el ECG de superficie solo muestra la señal auricular sumada, no el mecanismo.',
        ),
      ],
    },
  ],
  sources: [
    'Hancock EW et al. AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy. Circulation 2009;119:e251-e261',
    'Bayés de Luna A et al. J Electrocardiol 2012;45:445-451',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
