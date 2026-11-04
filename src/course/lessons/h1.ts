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
/** the heart block's normal atria; the same request with V1–V2 two spaces high (2nd intercostal space) */
const NORMAL_REQ = { scenario: 'normal', seed: 1202, dials: { rate: 70 } } as const;
const NORMAL_P: EcgSource = { kind: 'synth', req: NORMAL_REQ };
const V1V2_HIGH = { chest: { V1: { ics: 2, line: 'sternal', side: 'R' }, V2: { ics: 2, line: 'sternal', side: 'L' } } } as const;
const LAE = synth('lae', 1203);

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
      ecg: NORMAL_P,
      showConduction: true,
      emphasize: ['sa-node', 'ra', 'la'],
      caption: l(
        '窦房结在右心房上部放电：右心房先除极，写出 P 波**前部**；左心房经 Bachmann 束随后除极，写出**终末部**。P 波沿 II 导联方向走，所以在 II 最清楚。',
        'The sinus node fires high in the right atrium: the RA depolarises first and writes the **early P**; the LA follows over Bachmann\'s bundle and writes the **end**. The P runs along lead II, so II shows it best.',
        'El nodo sinusal dispara en la parte alta de la aurícula derecha: la AD se despolariza primero y escribe el **inicio de la P**; la AI la sigue por el haz de Bachmann y escribe el **final**. La P avanza en la dirección de II, por eso II la muestra mejor.',
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
      ecg: LAE,
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
      kind: 'film',
      title: l('一个 P 波，两个心房', 'One P wave, two atria', 'Una onda P, dos aurículas'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'V1'] },
      frames: [
        {
          label: l('正常', 'Normal', 'Normal'),
          ecg: NORMAL_P,
          note: l(
            'II 导联 P 约 100 ms、不到 1 mm 高。V1 先正（右心房，朝向 V1）后负（左心房，在后方），两部分都很小。',
            'In II the P is about 100 ms and under 1 mm tall. V1 goes up (RA, towards V1) then down (LA, behind), both tiny.',
            'En II la P dura unos 100 ms y mide menos de 1 mm. V1 sube (AD, hacia V1) y luego baja (AI, detrás), ambas mínimas.',
          ),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'V1' }],
        },
        {
          label: l('右心房', 'Right atrium', 'Aurícula derecha'),
          ecg: synth('rae', 1204),
          note: l(
            'II 导联 P 高约 3 mm（>2.5 mm），时限仍约 100 ms；V1 起始正向约 1.6 mm（>1.5 mm）。**高 = 右心房**。',
            'The P in II is about 3 mm tall (>2.5 mm) yet still about 100 ms; initial V1 positive about 1.6 mm (>1.5 mm). **Tall = right atrium**.',
            'La P de II mide unos 3 mm (>2,5 mm) y sigue durando unos 100 ms; positividad inicial en V1 de unos 1,6 mm (>1,5 mm). **Alta = aurícula derecha**.',
          ),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'V1' }],
        },
        {
          label: l('左心房', 'Left atrium', 'Aurícula izquierda'),
          ecg: LAE,
          note: l(
            'II 导联 P 宽约 150 ms、有两个峰，高只有约 1.6 mm；V1 以宽的负向收尾。**宽 = 左心房**。',
            'The P in II is about 150 ms wide with two humps and only about 1.6 mm tall; V1 ends in a wide negative part. **Wide = left atrium**.',
            'La P de II dura unos 150 ms, tiene dos picos y solo mide unos 1,6 mm; V1 termina con una porción negativa ancha. **Ancha = aurícula izquierda**.',
          ),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'V1' }],
        },
        {
          label: l('双心房', 'Both atria', 'Ambas aurículas'),
          ecg: synth('biatrial-abnormality', 1206),
          note: l(
            'II 导联 P 又高（约 3 mm）又宽（约 140 ms）：双心房异常。V1 两部分都正卡在界值上，靠 II 下结论。',
            'The P in II is both tall (about 3 mm) and wide (about 140 ms): biatrial abnormality. Both V1 parts sit right on the cut-offs, so II makes the call.',
            'La P de II es alta (unos 3 mm) y ancha (unos 140 ms): anomalía biauricular. Las dos partes de V1 están justo en los umbrales, así que decide II.',
          ),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'V1' }],
        },
        {
          label: l('V1 贴高了', 'V1 too high', 'V1 demasiado alta'),
          ecg: { kind: 'synth', req: { ...NORMAL_P.req, recording: { placement: V1V2_HIGH } } },
          note: l(
            '与第 1 帧同一颗心脏，V1 贴到第 2 肋间：整个 P 波变成负向（约 0.3 mm）。这不是终末电势，先查电极位置。',
            'Same heart as frame 1, V1 in the 2nd intercostal space: the whole P in V1 turns negative (about 0.3 mm). This is not a terminal force: check the electrode.',
            'Mismo corazón que el fotograma 1, V1 en el 2.º espacio intercostal: toda la P de V1 se vuelve negativa (unos 0,3 mm). No es fuerza terminal: revisa el electrodo.',
          ),
          marks: [{ auto: 'p', lead: 'V1' }],
        },
      ],
      predict: {
        question: l(
          '心房先右后左除极。如果只有左心房变慢，II 导联的 P 波会怎样？',
          'The atria depolarise right first, left last. If only the left atrium is slow, what happens to the P in II?',
          'Las aurículas se despolarizan primero la derecha y después la izquierda. Si solo la izquierda va lenta, ¿qué le pasa a la P de II?',
        ),
        options: [l('变高', 'It gets taller', 'Se hace más alta'), l('变宽', 'It gets wider', 'Se hace más ancha'), l('倒置', 'It inverts', 'Se invierte')],
        answer: 1,
      },
      caption: l(
        '高 = 右，宽 = 左，又高又宽 = 双心房。II 看高度和时限，V1 看起始（右心房）和终末（左心房）。',
        'Tall = right, wide = left, tall and wide = both. Read height and duration in II, the start (RA) and the end (LA) in V1.',
        'Alta = derecha, ancha = izquierda, alta y ancha = ambas. Lee altura y duración en II, el inicio (AD) y el final (AI) en V1.',
      ),
    },
    {
      kind: 'film',
      title: l('房间传导阻滞：同一对心房，一条束', 'Interatrial block: the same atria, one bundle', 'Bloqueo interauricular: las mismas aurículas, un haz'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVF'] },
      frames: [
        {
          label: l('部分型', 'Partial', 'Parcial'),
          ecg: synth('interatrial-block', 1205),
          note: l(
            'P 约 145 ms（≥120 ms），II 和 aVF 仍直立：部分型房间传导阻滞。要写出名字，不只是“P 波增宽”。',
            'P about 145 ms (>=120 ms), still upright in II and aVF: partial interatrial block. Name it, not just "broad P".',
            'P de unos 145 ms (>=120 ms), aún positiva en II y aVF: bloqueo interauricular parcial. Ponle nombre, no solo «P ancha».',
          ),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'aVF' }],
        },
        {
          label: l('高度型', 'Advanced', 'Avanzado'),
          ecg: synth('interatrial-block', 1205, undefined, 'advanced'),
          note: l(
            '同一对心房，Bachmann 束完全阻滞：左心房改由下方向上激动，II、III、aVF 的 P 波先正后负（+/−）。',
            'Same atria, Bachmann\'s bundle fully blocked: the LA is now activated from below, so the P in II, III and aVF goes up then down (+/−).',
            'Mismas aurículas, haz de Bachmann bloqueado del todo: la AI se activa desde abajo y la P de II, III y aVF sube y luego baja (+/−).',
          ),
          marks: [{ auto: 'p', lead: 'II' }, { auto: 'p', lead: 'III' }],
        },
      ],
      caption: l(
        '高度型房间传导阻滞与房颤和卒中相关（Bayés 综合征）：写进报告，随访时警惕房颤。',
        'Advanced interatrial block is linked to AF and stroke (Bayés syndrome): put it in the report and watch for AF on follow-up.',
        'El bloqueo interauricular avanzado se asocia con fibrilación auricular e ictus (síndrome de Bayés): anótalo en el informe y vigila la FA en el seguimiento.',
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
          '把 V1 贴高后变负的 P 波当成左心房异常：整个 P 都是负的，不只是终末部；先查电极位置。',
          'Calling left atrial abnormality on a negative P from a V1 placed too high: the whole P is negative, not just its end; check the electrode first.',
          'Diagnosticar anomalía auricular izquierda por una P negativa en una V1 colocada demasiado alta: toda la P es negativa, no solo su final; revisa antes el electrodo.',
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
