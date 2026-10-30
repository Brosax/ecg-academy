/**
 * t1 — Regular narrow-QRS tachycardia: sinus, AVNRT, AVRT, focal AT, 2:1 flutter (docs/PLAN.md §3, stage T).
 * Criteria: docs/curriculum/criteria.md `svt-definition`, `avnrt`, `atrial-tachycardia`, `flutter-criteria` (current
 * values) and the missing-book bullets: narrow-QRS tachycardia RP/PR algorithm, orthodromic AVRT criteria, vagal
 * manoeuvres / adenosine diagnostic response, flutter with 2:1 conduction.
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
const STRIP_V1 = { layout: 'strip', lead: 'V1' } as const;

const lesson: Lesson = {
  id: 't1',
  stage: 'T',
  order: 1,
  title: l(
    '规则的窄 QRS 心动过速（窦性、AVNRT、AVRT、局灶性房速、2:1 心房扑动）',
    'Regular narrow-QRS tachycardia (sinus, AVNRT, AVRT, focal AT, 2:1 flutter)',
    'Taquicardia regular de QRS estrecho (sinusal, TRIN, TRAV, taquicardia auricular focal, flutter 2:1)',
  ),
  summary: l(
    '一条规则的窄 QRS 心动过速不是诊断，而是一道分类题：先在 II、III、aVF、V1 找心房活动，再问 P′ 落在 QRS 之前、之中还是之后——RP/PR 算法把 AVNRT、AVRT、房速、2:1 房扑和窦速分开，迷走手法与腺苷既是治疗也是诊断试验。',
    'A regular narrow-QRS tachycardia is a classification problem, not a diagnosis: find the atrial activity in II, III, aVF and V1 first, then ask where the P′ sits — before, inside or after the QRS. The RP/PR algorithm separates AVNRT, AVRT, focal AT, 2:1 flutter and sinus tachycardia, and vagal manoeuvres and adenosine are treatment and diagnostic test at once.',
    'Una taquicardia regular de QRS estrecho es un problema de clasificación, no un diagnóstico: busca primero la actividad auricular en II, III, aVF y V1 y pregúntate dónde está la P′ (antes, dentro o después del QRS). El algoritmo RP/PR separa la TRIN, la TRAV, la taquicardia auricular focal, el flutter 2:1 y la taquicardia sinusal, y las maniobras vagales y la adenosina son a la vez tratamiento y prueba diagnóstica.',
  ),
  objectives: [
    l(
      '说出 SVT 的现行定义（机制涉及希氏束或以上组织；包括房扑与多源性房速，不包括房颤；AVRT 虽用及心室仍属 SVT）。',
      'State the current definition of SVT (a mechanism involving the His bundle or above; flutter and MAT included, AF excluded; AVRT is SVT although its circuit uses ventricular tissue).',
      'Enunciar la definición vigente de TSV (mecanismo que implica al His o por encima; incluye el flutter y la TAM, excluye la FA; la TRAV es una TSV aunque su circuito use el ventrículo).',
    ),
    l(
      '对任何规则的窄 QRS 心动过速走一遍 RP/PR 算法：找 P′，判断它相对 QRS 的位置。',
      'Run the RP/PR algorithm on any regular narrow-QRS tachycardia: find the P′ and decide where it sits relative to the QRS.',
      'Aplicar el algoritmo RP/PR a cualquier taquicardia regular de QRS estrecho: busca la P′ y decide dónde se sitúa respecto al QRS.',
    ),
    l(
      '识别典型 AVNRT（P′ 隐没或成 V1 假性 r′、II/III/aVF 假性 S）与顺向型 AVRT（P′ 在 ST 段内，RP < PR 且约 ≥ 90 ms）。',
      'Recognise typical AVNRT (P′ hidden, or pseudo-r′ in V1 and pseudo-S in II/III/aVF) and orthodromic AVRT (P′ in the ST segment, RP < PR and about >=90 ms).',
      'Reconocer la TRIN típica (P′ oculta o pseudo-r′ en V1 y pseudo-S en II/III/aVF) y la TRAV ortodrómica (P′ en el segmento ST, RP < PR y unos >=90 ms).',
    ),
    l(
      '解读迷走手法与腺苷的诊断性反应，并坚持在用药时同步记录 12 导联心电图。',
      'Interpret the diagnostic responses to vagal manoeuvres and adenosine, and insist on a running 12-lead ECG while the drug is given.',
      'Interpretar las respuestas diagnósticas a las maniobras vagales y la adenosina, y exigir un ECG de 12 derivaciones grabando mientras se administra el fármaco.',
    ),
  ],
  minutes: 16,
  competencies: ['C9', 'C3'],
  findings: ['sinus-tachycardia', 'avnrt', 'avrt', 'atrial-tachycardia', 'atrial-flutter'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('avnrt', 601),
      view: STRIP,
      question: l(
        '34 岁女性，20 分钟前突发心悸，“像敲鼓一样”，无胸痛、无晕厥。这条 II 导联节律条：节律是什么？你第一步做什么？先写下你的判断。',
        'A 34-year-old woman: palpitations that started suddenly 20 minutes ago, "like a drum", no chest pain, no syncope. This lead II strip: what is the rhythm, and what is your first step? Commit to an answer.',
        'Mujer de 34 años: palpitaciones que empezaron de forma brusca hace 20 minutos, "como un tambor", sin dolor torácico ni síncope. En esta tira de derivación II: ¿qué ritmo es y cuál es tu primera actuación? Decide una respuesta antes de continuar.',
      ),
      reveal: l(
        '约 **176 次/分、规则、QRS 窄**，看不到明确的 P 波。一条规则的窄 QRS 心动过速本身几乎不会立即危及生命——但它背后有好几种机制，处理和根治各不相同，而**体表心电图常常能直接给出答案**。第一步：确认血流动力学稳定、记录 12 导联，然后一边想一边做**迷走神经刺激法**（改良 Valsalva，心电图一直在记录）——本课教你如何系统地分类。',
        'About **176/min, regular, narrow QRS**, with no clear P waves. A regular narrow-QRS tachycardia is almost never immediately dangerous in itself — but it has several mechanisms with different treatments and cures, and the **surface ECG can often settle it directly**. First step: confirm she is haemodynamically stable, record a 12-lead, then start **vagal manoeuvres** (modified Valsalva) while you think, with the ECG running — this lesson teaches you to classify it systematically.',
        'Unos **176 lpm, regular, QRS estrecho**, sin ondas P claras. Una taquicardia regular de QRS estrecho casi nunca es peligrosa por sí misma, pero tiene varios mecanismos con tratamientos y curas distintas, y el **ECG de superficie a menudo decide la cuestión**. Primer paso: comprueba que está estable hemodinámicamente, registra un ECG de 12 derivaciones e inicia las **maniobras vagales** (Valsalva modificada) mientras piensas, con el ECG grabando; esta lección te enseña a clasificarla de forma sistemática.',
      ),
    },
    {
      kind: 'text',
      title: l('先定义词，再分两步走', 'Define the word first, then two steps', 'Define primero la palabra, luego dos pasos'),
      body: l(
        '**SVT（室上性心动过速）**现行定义：静息时心房和/或心室率 > 100 次/分、**机制涉及希氏束或以上组织**的心动过速。**心房扑动和多源性房速包括在内**；房颤按惯例排除（有自己的指南）；**AVRT 也算 SVT**，尽管它的环路用到了心室。连续 ≥ 3 搏即称一阵心动过速。\n判读分两步：\n- **第一步：规则还是不规则？**不规则 → 房颤、多源性房速或比例不固定的房扑/房速（下一课，t2）。\n- **第二步（本课）：规则的窄 QRS 心动过速 → 找心房活动。**在 II、III、aVF 和 V1 里找 P′，要一条够长的节律条；P′ 最常藏的地方是 QRS 终末部和 T 波里。\n找到（或确认找不到）P′ 后，问它相对 QRS 在哪里：\n- **看不见 P′，或 P′ 就在 QRS 终末端**（V1 假性 r′，II/III/aVF 假性 S）⇒ 典型 AVNRT。\n- **短 RP：P′ 在 ST 段内，RP < PR**（体表约 90 ms 为界）⇒ 顺向型 AVRT（或长 PR 的房速）。\n- **长 RP：RP > PR** ⇒ 房速、非典型 AVNRT、PJRT、窦性心动过速。\n- **P′ 比 QRS 多** ⇒ 房速或房扑（不依赖房室结）。',
        '**SVT** is currently defined as a tachycardia (atrial and/or ventricular rate > 100/min at rest) whose **mechanism involves tissue from the His bundle or above**. **Atrial flutter and MAT are included**; AF is conventionally excluded (it has its own guidelines); **AVRT is SVT** even though its circuit uses the ventricle. >= 3 consecutive beats is the working threshold for calling a run a tachycardia.\nReading it is two steps:\n- **Step 1: regular or irregular?** Irregular -> AF, MAT, or flutter / AT with variable block (next lesson, t2).\n- **Step 2 (this lesson): a regular narrow-QRS tachycardia -> find the atrial activity.** Hunt for the P′ in II, III, aVF and V1, on a long enough strip; where it hides most often is the QRS end and the T wave.\nOnce you have found it (or established it is not visible), ask where it sits relative to the QRS:\n- **No visible P′, or a P′ right at the QRS end** (pseudo-r′ in V1, pseudo-S in II/III/aVF) -> typical AVNRT.\n- **Short RP: P′ in the ST segment, RP < PR** (about 90 ms on the surface ECG is the cut-off) -> orthodromic AVRT (or AT with a long PR).\n- **Long RP: RP > PR** -> AT, atypical AVNRT, PJRT, sinus tachycardia.\n- **More P′ than QRS** -> AT or flutter (AV-node-independent).',
        '**La TSV** se define hoy como una taquicardia (frecuencia auricular y/o ventricular > 100 lpm en reposo) cuyo **mecanismo implica tejido del His o por encima**. **El flutter auricular y la TAM están incluidos**; la FA se excluye por convención (tiene sus propias guías); **la TRAV es una TSV** aunque su circuito use el ventrículo. >= 3 latidos consecutivos es el umbral habitual para llamar salva a una taquicardia.\nLa lectura son dos pasos:\n- **Paso 1: ¿regular o irregular?** Irregular -> FA, TAM o flutter/TA con conducción variable (próxima lección, t2).\n- **Paso 2 (esta lección): taquicardia regular de QRS estrecho -> busca la actividad auricular.** Caza la P′ en II, III, aVF y V1, en una tira lo bastante larga; donde más se esconde es en el final del QRS y dentro de la onda T.\nCuando la hayas encontrado (o hayas comprobado que no se ve), pregúntate dónde está respecto al QRS:\n- **P′ no visible, o justo al final del QRS** (pseudo-r′ en V1, pseudo-S en II/III/aVF) -> TRIN típica.\n- **RP corto: P′ en el segmento ST, RP < PR** (unos 90 ms en el ECG de superficie como corte) -> TRAV ortodrómica (o TA con PR largo).\n- **RP largo: RP > PR** -> TA, TRIN atípica, PJRT, taquicardia sinusal.\n- **Más P′ que QRS** -> TA o flutter (independiente del nodo AV).',
      ),
    },
    {
      kind: 'criteria',
      title: l('规则的窄 QRS 心动过速：判读要点', 'Regular narrow-QRS tachycardia: reading values', 'Taquicardia regular de QRS estrecho: valores de lectura'),
      items: [
        {
          label: l('SVT 定义', 'SVT definition', 'Definición de TSV'),
          value: l('静息 > 100 次/分，机制涉及希氏束或以上；包括房扑与多源性房速；房颤除外；AVRT 属 SVT', '> 100/min at rest, mechanism at the His bundle or above; flutter and MAT included; AF excluded; AVRT is SVT', '> 100 lpm en reposo, mecanismo en el His o por encima; flutter y TAM incluidos; FA excluida; la TRAV es TSV'),
        },
        {
          label: l('典型 AVNRT（慢-快型）', 'Typical (slow-fast) AVNRT', 'TRIN típica (lenta-rápida)'),
          value: l('突发突止；140–220 次/分；P′ 隐于 QRS 或居其终末（V1 假性 r′，II/III/aVF 假性 S）；可见时 RP < 90 ms 支持 AVNRT', 'Abrupt onset and offset; 140-220/min; P′ hidden in the QRS or at its end (pseudo-r′ in V1, pseudo-S in II/III/aVF); when visible, RP < 90 ms favours AVNRT', 'Inicio y fin bruscos; 140-220 lpm; P′ oculta en el QRS o en su final (pseudo-r′ en V1, pseudo-S en II/III/aVF); si es visible, RP < 90 ms favorece la TRIN'),
        },
        {
          label: l('顺向型 AVRT', 'Orthodromic AVRT', 'TRAV ortodrómica'),
          value: l('150 至 > 220 次/分；P′ 在 QRS 后的 ST-T 内，RP 恒定、约 ≥ 90 ms 且 < 半个心动周期；ST 压低与 QRS 电交替常见', '150 to > 220/min; retrograde P′ after the QRS in the ST-T, constant RP about >= 90 ms and < half the cycle; ST depression and QRS alternans common', '150 a > 220 lpm; P′ retrógrada tras el QRS en el ST-T, RP constante de unos >= 90 ms y < medio ciclo; depresión del ST y alternancia del QRS frecuentes'),
        },
        {
          label: l('局灶性房速', 'Focal atrial tachycardia', 'Taquicardia auricular focal'),
          value: l('规则房率 ≥ 100（常 100–250）次/分；P′ 异于窦性、之间有等电位线；多为长 RP；出现房室阻断而心动过速不停 ⇒ 反对 AVNRT/AVRT；温醒/冷却现象 ⇒ 自律性焦点', 'Organized atrial rhythm >= 100 (usually 100-250)/min; P′ different from sinus with an isoelectric baseline; usually long RP; AV block without stopping the tachycardia argues against AVNRT/AVRT; warm-up and cool-down suggest an automatic focus', 'Ritmo auricular organizado >= 100 (habitualmente 100-250) lpm; P′ distinta de la sinusal con línea isoeléctrica entre ellas; normalmente RP largo; el bloqueo AV sin detener la taquicardia va contra TRIN/TRAV; calentamiento y enfriamiento sugieren un foco automático'),
        },
        {
          label: l('2:1 心房扑动', 'Atrial flutter with 2:1 conduction', 'Flutter auricular con conducción 2:1'),
          value: l('未治疗时心室率约 150 次/分；II/III/aVF 锯齿状 F 波（250–330 次/分）无等电位线、V1 直立——第二个 F 常藏在 T 波里', 'Untreated ventricular rate about 150/min; sawtooth F waves (250-330/min) with no isoelectric baseline in II/III/aVF, positive in V1 — the second F often hides inside the T wave', 'Frecuencia ventricular sin tratamiento de unos 150 lpm; ondas F en diente de sierra (250-330 lpm) sin línea isoeléctrica en II/III/aVF, positivas en V1: la segunda F suele esconderse dentro de la onda T'),
        },
        {
          label: l('迷走手法 / 腺苷疗效', 'Vagal manoeuvres / adenosine efficacy', 'Maniobras vagales / eficacia de la adenosina'),
          value: l('迷走手法终止 AVNRT 仅 19–54%（改良 Valsalva 约 43%）；腺苷终止大多数发作', 'Vagal manoeuvres terminate AVNRT in only 19-54% (modified Valsalva about 43%); adenosine terminates most episodes', 'Las maniobras vagales terminan la TRIN solo en el 19-54% (Valsalva modificado, unos 43%); la adenosina termina la mayoría de los episodios'),
        },
      ],
      source:
        'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720; Page RL et al. 2015 ACC/AHA/HRS Guideline for the management of adult patients with supraventricular tachycardia. Circulation 2016;133:e506-e574',
    },
    {
      kind: 'figure',
      figure: { id: 'decision-tree', params: { tree: 'narrow-tachy' } },
      caption: l(
        '把整条决策树走一遍：规则吗 → 窄吗 → P′ 在哪里 → P′ 比 QRS 多吗。以后每条规则的窄 QRS 心动过速都按这条路读。',
        'Walk the whole decision tree: regular? -> narrow? -> where is the P′? -> more P′ than QRS? Read every regular narrow-QRS tachycardia along this path from now on.',
        'Recorre todo el árbol de decisión: ¿regular? -> ¿estrecho? -> ¿dónde está la P′? -> ¿más P′ que QRS? Lee desde ahora toda taquicardia regular de QRS estrecho siguiendo este camino.',
      ),
    },
    {
      kind: 'worked',
      title: l('RP 分析：一条 190 次/分的窄 QRS 心动过速', 'RP analysis: a 190/min narrow-QRS tachycardia', 'Análisis del RP: una taquicardia de QRS estrecho a 190 lpm'),
      ecg: synth('avrt', 602),
      steps: [
        {
          title: l('规则吗？窄吗？', 'Regular? Narrow?', '¿Regular? ¿Estrecho?'),
          body: l(
            '分规量 RR：恒定（这里 RR ≈ 316 ms，约 190 次/分），QRS 窄（< 120 ms）。规则 + 窄 ⇒ 进入 P′ 搜索。',
            'March the RR with calipers: constant (here RR is about 316 ms, roughly 190/min) and the QRS is narrow (< 120 ms). Regular + narrow -> go hunting for the P′.',
            'Mide el RR con el compás: constante (aquí unos 316 ms, cerca de 190 lpm) y QRS estrecho (< 120 ms). Regular + estrecho: pasa a buscar la P′.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
          highlightLeads: ['II'],
        },
        {
          title: l('在 II、III、aVF 和 V1 里找 P′', 'Hunt the P′ in II, III, aVF and V1', 'Caza la P′ en II, III, aVF y V1'),
          body: l(
            '逐个导联看 QRS 之后的 ST 段：I 和 aVL 里有一个小而清晰的**负向**波，III、aVF 里同一时刻是一个小的**正向**驼峰；II 导联里它几乎是等电位的、混在 T 波升支里——只看 II 会漏掉它。它每搏位置相同：**逆行 P′**。',
            'Look at the ST segment after each QRS, lead by lead: in I and aVL there is a small, crisp **negative** deflection, and at the same instant a small **positive** hump in III and aVF; in II it is nearly isoelectric and melts into the T upstroke — read II alone and you miss it. It sits identically every beat: a **retrograde P′**.',
            'Mira el segmento ST tras cada QRS, derivación por derivación: en I y aVL hay una pequeña deflexión **negativa** nítida y, en el mismo instante, una pequeña joroba **positiva** en III y aVF; en II es casi isoeléctrica y se funde con la rama ascendente de la T: si lees solo II, se te escapa. Ocupa el mismo lugar en cada latido: una **P′ retrógrada**.',
          ),
          marks: [{ auto: 'p', lead: 'I', label: l('P′', 'P′', 'P′') }, { auto: 'p', lead: 'aVL', label: l('P′', 'P′', 'P′') }],
          highlightLeads: ['I', 'aVL', 'III', 'aVF'],
        },
        {
          title: l('P′ 相对 QRS 在哪里？', 'Where is the P′ relative to the QRS?', '¿Dónde está la P′ respecto al QRS?'),
          body: l(
            'P′ 在 QRS **之后**、ST 段之内——不是在 QRS 前面（窦性/房速），也不是埋在 QRS 终末（典型 AVNRT）。这是**短 RP**分支。',
            'The P′ is **after** the QRS, inside the ST segment — not in front of the QRS (sinus / AT) and not buried in the QRS end (typical AVNRT). This is the **short-RP** branch.',
            'La P′ está **después** del QRS, dentro del segmento ST: no delante del QRS (sinusal / TA) ni enterrada en el final del QRS (TRIN típica). Esta es la rama de **RP corto**.',
          ),
          marks: [{ auto: 'qrs', lead: 'I' }, { auto: 'p', lead: 'I', label: l('P′', 'P′', 'P′') }],
          view: { layout: 'strip', lead: 'I' },
        },
        {
          title: l('量 RP′ 与 P′R', 'Measure RP′ against P′R', 'Mide el RP′ frente al P′R'),
          body: l(
            'RP′（QRS 起点至 P′ 起点）≈ 115 ms，P′R（P′ 至下一个 QRS）≈ 200 ms：**RP < PR，且 RP > 90 ms** ⇒ **顺向型 AVRT**（若 P′ 可见而 RP < 90 ms，则更支持 AVNRT）。旁路在左侧游离壁：心房从左向右逆行激动，所以 P′ 在 I、aVL 倒置、下壁直立（P′ 极向随旁路位置而变）。支持征象：ST 段压低、QRS 电交替在 AVRT 中常见。终止后必看基础窦性 ECG：显性旁路见 δ 波，隐性旁路则完全正常。',
            'The RP′ (QRS onset to P′ onset) is about 115 ms and the P′R (P′ to the next QRS) about 200 ms: **RP < PR, and RP > 90 ms** -> **orthodromic AVRT** (a visible P′ with RP < 90 ms would favour AVNRT). The pathway is left free-wall: the atria are activated retrogradely from left to right, so the P′ is negative in I and aVL and upright inferiorly (polarity follows the pathway site). Supporting signs: ST depression and QRS alternans are common in AVRT. After termination, always look at the baseline sinus ECG: a manifest pathway shows a delta wave; a concealed one looks completely normal.',
            'El RP′ (inicio del QRS al inicio de la P′) ronda 115 ms y el P′R (P′ al siguiente QRS) unos 200 ms: **RP < PR y RP > 90 ms** -> **TRAV ortodrómica** (una P′ visible con RP < 90 ms favorecería la TRIN). La vía es de pared libre izquierda: las aurículas se activan de forma retrógrada de izquierda a derecha, de modo que la P′ es negativa en I y aVL y positiva en las inferiores (la polaridad sigue la localización de la vía). Signos de apoyo: la depresión del ST y la alternancia del QRS son frecuentes en la TRAV. Tras la terminación, mira siempre el ECG sinusal basal: una vía manifiesta muestra onda delta; una oculta parece completamente normal.',
          ),
          marks: [{ auto: 'qrs', lead: 'I' }, { auto: 'p', lead: 'I', label: l('P′', 'P′', 'P′') }, { auto: 'rr' }],
          view: { layout: 'strip', lead: 'I', calipers: true },
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('P′ 藏在哪里：AVNRT 对 AVRT', 'Where the P′ hides: AVNRT vs AVRT', 'Dónde se esconde la P′: TRIN frente a TRAV'),
      view: STRIP,
      left: {
        ecg: synth('avnrt', 603),
        caption: l('AVNRT，176 次/分：P′ 埋在 QRS 里——II 导联呈假性 S', 'AVNRT, 176/min: the P′ is buried in the QRS — a pseudo-S here in II', 'TRIN, 176 lpm: la P′ está enterrada en el QRS; aquí en II hace un pseudo-S'),
        marks: [{ auto: 'p', label: l('P′（假性 S）', "P′ (pseudo-S)", 'P′ (pseudo-S)') }],
      },
      right: {
        ecg: synth('avrt', 604),
        caption: l('AVRT，190 次/分：P′ 与 QRS 分开，落在 ST 段上', 'AVRT, 190/min: the P′ is separate from the QRS, landing on the ST segment', 'TRAV, 190 lpm: la P′ está separada del QRS y cae sobre el segmento ST'),
        marks: [{ auto: 'p', label: l('P′', 'P′', 'P′') }],
      },
      point: l(
        '同是规则的窄 QRS 心动过速，**一个时间差分出两个诊断**：典型 AVNRT 的环路几乎不出房室结，心房回波与 QRS 几乎同时发生，P′ 看不见或只在 QRS 终末端露头（V1 假性 r′、下壁导联假性 S），可见时 RP < 90 ms；顺向型 AVRT 的冲动必须先激动心室、再经旁路折返心房，P′ 落在 ST 段，RP ≥ 90 ms 而短于半个 RR。',
        'Two regular narrow-QRS tachycardias, and **one timing difference makes two diagnoses**: the typical AVNRT circuit barely leaves the AV node, so the atrial echo is nearly simultaneous with the QRS — the P′ is invisible or peeks only at the QRS end (pseudo-r′ in V1, pseudo-S inferiorly), with RP < 90 ms when visible; in orthodromic AVRT the impulse must first activate the ventricle and return through the pathway, so the P′ lands in the ST segment with RP >= 90 ms but less than half the RR.',
        'Dos taquicardias regulares de QRS estrecho y **una diferencia de tiempos da dos diagnósticos**: el circuito de la TRIN típica apenas sale del nodo AV, de modo que el eco auricular es casi simultáneo al QRS (la P′ es invisible o asoma solo al final del QRS: pseudo-r′ en V1, pseudo-S en las derivaciones inferiores), con RP < 90 ms cuando se ve; en la TRAV ortodrómica el impulso debe activar primero el ventrículo y volver por la vía, así que la P′ cae en el segmento ST, con RP >= 90 ms pero menor que medio RR.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('avnrt', 605),
      view: STRIP_V1,
      marks: [{ auto: 'p', lead: 'V1', label: l('P′（假性 r′）', 'P′ (pseudo-r′)', 'P′ (pseudo-r′)') }],
      caption: l(
        '同一份 AVNRT，换看 V1：逆行 P′ 落在 QRS 终末——先在 S 波升支上留下切迹，再越过基线约半毫米，形成一个小的终末正向波：**假性 r′**（不是右束支阻滞的 r′，QRS 并不宽）。与基础窦性 ECG 对比，这个终末变形会消失——这正是它的价值。假性 r′/假性 S 特异度很高（91–100%）但敏感度低：像这里这样不到 1 mm 时很容易漏看，没有它也不能排除 AVNRT——II 导联的假性 S 是另一条线索。',
        'The same AVNRT, now in V1: the retrograde P′ falls on the QRS end — it notches the upstroke of the S and then rises about half a millimetre above the baseline as a small terminal positive deflection: a **pseudo-r′** (not a bundle-branch r′: the QRS is not wide). Compare with the baseline sinus ECG and the terminal distortion vanishes — which is exactly its value. The pseudo-r′ / pseudo-S is highly specific (91-100%) but not sensitive: under 1 mm, as here, it is easy to miss, and its absence does not rule AVNRT out — the pseudo-S in II is the other clue.',
        'La misma TRIN, ahora en V1: la P′ retrógrada cae sobre el final del QRS; deja una muesca en la rama ascendente de la S y después sube alrededor de medio milímetro por encima de la línea de base como una pequeña deflexión terminal positiva: un **pseudo-r′** (no es la r′ de un bloqueo de rama: el QRS no es ancho). Compárala con el ECG sinusal basal y la deformación terminal desaparece: ahí está su valor. El pseudo-r′ / pseudo-S es muy específico (91-100%) pero poco sensible: con menos de 1 mm, como aquí, es fácil pasarlo por alto, y su ausencia no descarta la TRIN; el pseudo-S en II es la otra pista.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('atrial-tachycardia', 606, undefined, 'block'),
      view: STRIP,
      marks: [
        { auto: 'p', label: l('P′（下传）', "P′ (conducted)", 'P′ (conducida)') },
        { auto: 'blocked-p' },
      ],
      caption: l(
        '房速伴 2:1 房室传导：心房焦点约 180 次/分，**每两个 P′ 只有一个下传**，被阻断的 P′ 正好藏在前面那个 T 波里——心室率约 90 次/分。**P′ 比 QRS 多** ⇒ 心动过速不依赖房室结（房速或房扑）。下传的 P′ 异于窦性（此焦点在左上肺静脉：下壁及 V1 直立、I 与 aVL 倒置）。腺苷或迷走手法加重房室阻滞、暴露全部 P′，而心动过速依旧——诊断即成。',
        'Atrial tachycardia with 2:1 AV conduction: the atrial focus fires at about 180/min and **only every second P′ conducts**; the blocked P′ hides exactly in the previous T wave, so the ventricular rate is about 90/min. **More P′ than QRS** -> the tachycardia does not need the AV node (AT or flutter). The conducted P′ is unlike sinus (this focus is in the left superior pulmonary vein: upright inferiorly and in V1, negative in I and aVL). Adenosine or vagal manoeuvres increase the AV block and uncover all the P′ while the tachycardia continues — and there is the diagnosis.',
        'Taquicardia auricular con conducción AV 2:1: el foco auricular dispara a unos 180 lpm y **solo conduce una de cada dos P′**; la P′ bloqueada se esconde justo en la onda T previa, de modo que la frecuencia ventricular ronda 90 lpm. **Más P′ que QRS**: la taquicardia no depende del nodo AV (TA o flutter). La P′ conducida no es sinusal (el foco está en la vena pulmonar superior izquierda: positiva en las inferiores y en V1, negativa en I y aVL). La adenosina o las maniobras vagales aumentan el bloqueo AV y destapan todas las P′ mientras la taquicardia sigue: ahí está el diagnóstico.',
      ),
    },
    {
      kind: 'contrast',
      title: l('长 RP：P′ 的方向与形态定方向', 'Long RP: P′ polarity and shape point the way', 'RP largo: la polaridad y la forma de la P′ orientan'),
      view: STRIP,
      left: {
        ecg: synth('avnrt', 607, undefined, 'atypical'),
        caption: l('非典型（快-慢型）AVNRT，150 次/分：RP 长，P′ 在 II 倒置', 'Atypical (fast-slow) AVNRT, 150/min: long RP with the P′ negative in II', 'TRIN atípica (rápida-lenta), 150 lpm: RP largo con la P′ negativa en II'),
        marks: [{ auto: 'p', label: l('P′', 'P′', 'P′') }, { auto: 'pr' }],
      },
      right: {
        ecg: synth('sinus-tachycardia', 608, { rate: 130 }),
        caption: l('窦性心动过速，130 次/分：RP 长，但 P 波在 II 直立、形态同窦性', 'Sinus tachycardia, 130/min: long RP too, but the P is upright in II and sinus-shaped', 'Taquicardia sinusal, 130 lpm: RP largo también, pero la P es positiva en II y de morfología sinusal'),
        marks: [{ auto: 'p' }, { auto: 'pr' }],
      },
      point: l(
        '长 RP（RP > PR）分支的鉴别：房速、非典型 AVNRT、PJRT、窦性心动过速。**P′ 的方向和形态是钥匙**：II、III、aVF 深倒的 P′ 是逆行或低位起源（PJRT、非典型 AVNRT、低位房速），且非典型 AVNRT 常呈 P′-QRS 一前一后紧贴；而**直立、窦性形态的 P** 说明是窦性心动过速——起病渐进、心率随诱因波动，报告写完后要接着问“为什么”（发热、疼痛、出血、缺氧、甲亢、肺栓塞……）。',
        'The long-RP branch (RP > PR) differential: AT, atypical AVNRT, PJRT, sinus tachycardia. **The polarity and shape of the P′ are the key**: a P′ deeply negative in II, III and aVF is retrograde or from a low focus (PJRT, atypical AVNRT, low atrial AT), and in atypical AVNRT each P′ clings to the QRS that follows it; an **upright, sinus-shaped P** means sinus tachycardia — gradual onset, a rate that drifts with the provocation, and once your report says it, the next word is "why" (fever, pain, bleeding, hypoxia, hyperthyroidism, pulmonary embolism...).',
        'El diferencial de la rama de RP largo (RP > PR): TA, TRIN atípica, PJRT y taquicardia sinusal. **La polaridad y la forma de la P′ son la clave**: una P′ profundamente negativa en II, III y aVF es retrógrada o de un foco bajo (PJRT, TRIN atípica, TA baja), y en la TRIN atípica cada P′ se pega al QRS que la sigue; una **P positiva y de morfología sinusal** indica taquicardia sinusal: inicio gradual, frecuencia que oscila con el estímulo y, tras escribirla en el informe, la palabra siguiente es "por qué" (fiebre, dolor, sangrado, hipoxia, hipertiroidismo, tromboembolia pulmonar...).',
      ),
    },
    {
      kind: 'text',
      title: l('迷走手法与腺苷：治疗即诊断', 'Vagal manoeuvres and adenosine: the treatment is the test', 'Maniobras vagales y adenosina: el tratamiento es la prueba'),
      body: l(
        '对血流动力学稳定的规则窄 QRS 心动过速，迷走手法和腺苷既是终止手段，也是**诊断试验**——但必须**全程记录 12 导联**：\n- **终止时最后一个事件是 P′**（逆行 P′ 未下传）⇒ 依赖房室结的心动过速：AVNRT 或 AVRT，房速可能性很小；以 QRS 结束则没有鉴别价值。\n- **出现房室阻滞而房性快速心律失常继续**（P′/F 波暴露出来）⇒ 房速或房扑——它们不需要房室结。\n- **逐渐减慢再逐渐加快** ⇒ 窦性心动过速或自律性房速。\n- 用药前先看 δ 波：**预激时腺苷可诱发快心室率的房颤**（见 t4）。\nAVNRT 与 AVRT 的其他判别点：AVNRT 任何年龄、基础 ECG 正常；AVRT 更年轻、基础 ECG 可见预激；QRS 电交替与 ST 压低更多见于 AVRT；P′ 可见时 90 ms 的 RP 界值最实用。',
        'In a haemodynamically stable regular narrow-QRS tachycardia, vagal manoeuvres and adenosine are both termination and **diagnostic test** — but a **12-lead must be running throughout**:\n- **Termination with the last event a P′** (a retrograde P′ that is not conducted) -> an AV-node-dependent tachycardia: AVNRT or AVRT, and AT is very unlikely; ending on a QRS does not discriminate.\n- **AV block appears while the atrial tachyarrhythmia continues** (the P′ / F waves uncovered) -> AT or flutter — they do not need the AV node.\n- **Gradual slowing and then re-acceleration** -> sinus tachycardia or automatic AT.\n- Look for a delta wave before giving the drug: **in pre-excitation adenosine can precipitate AF with a fast ventricular response** (see t4).\nOther AVNRT-vs-AVRT discriminators: AVNRT at any age with a normal baseline ECG; AVRT in younger patients, the baseline ECG may show pre-excitation; QRS alternans and ST depression favour AVRT; and when the P′ is visible, the 90 ms RP cut-off is the most useful single sign.',
        'En una taquicardia regular de QRS estrecho hemodinámicamente estable, las maniobras vagales y la adenosina son a la vez terminación y **prueba diagnóstica**, pero debe haber un **ECG de 12 derivaciones grabando todo el tiempo**:\n- **Terminación con la P′ como último evento** (una P′ retrógrada que no conduce) -> taquicardia dependiente del nodo AV: TRIN o TRAV, y la TA es muy improbable; terminar en un QRS no discrimina.\n- **Aparece bloqueo AV mientras la taquiarritmia auricular sigue** (las P′ / ondas F quedan al descubierto) -> TA o flutter: no necesitan el nodo AV.\n- **Enlentecimiento gradual y reaceleración** -> taquicardia sinusal o TA automática.\n- Busca la onda delta antes de administrarla: **con preexcitación la adenosina puede precipitar una FA con respuesta ventricular rápida** (ver t4).\nOtros criterios TRIN frente a TRAV: la TRIN a cualquier edad con ECG basal normal; la TRAV en pacientes más jóvenes, con posible preexcitación en el ECG basal; la alternancia del QRS y la depresión del ST favorecen la TRAV; y cuando la P′ es visible, el corte de RP en 90 ms es el signo aislado más útil.',
      ),
    },
    { kind: 'check', item: { family: 'narrow-tachy', seed: 7 } },
    { kind: 'check', item: { family: 'narrow-tachy', seed: 17 } },
    { kind: 'check', item: { family: 'narrow-tachy', seed: 6 } },
    { kind: 'drill', families: ['narrow-tachy'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [1919, 8461, 2051],
      caption: l(
        '三份真实心电图，PTB-XL 心脏病学家标注为阵发性室上性心动过速。先别看标签：在 II、III、aVF 和 V1 找 P′，走一遍 RP/PR 算法，对每份**先承诺一个机制**（AVNRT？AVRT？房速？）再揭晓。',
        'Three real tracings the PTB-XL cardiologists labelled paroxysmal supraventricular tachycardia. Ignore the label for now: find the P′ in II, III, aVF and V1, run the RP/PR algorithm, and **commit to one mechanism per tracing** (AVNRT? AVRT? AT?) before the reveal.',
        'Tres ECG reales que los cardiólogos de PTB-XL etiquetaron como taquicardia supraventricular paroxística. Ignora la etiqueta por ahora: busca la P′ en II, III, aVF y V1, aplica el algoritmo RP/PR y **comprométete con un mecanismo en cada trazado** (¿TRIN? ¿TRAV? ¿TA?) antes de la revelación.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把每条规则的窄 QRS 心动过速都写成“SVT”就收工：SVT 是一个家族，不是机制——不做 RP 这一步，终止后你仍然不知道该消融哪里。',
          'Writing "SVT" on every regular narrow-QRS tachycardia and stopping there: SVT is a family, not a mechanism — without the RP step you still do not know what to ablate after it terminates.',
          'Escribir "TSV" en toda taquicardia regular de QRS estrecho y quedarse ahí: la TSV es una familia, no un mecanismo; sin el paso del RP, tras terminarla seguirás sin saber qué hay que ablacionar.',
        ),
        l(
          '漏看 V1 的假性 r′ 和 II/III/aVF 的假性 S——和基础窦性 ECG 一比，它们就消失，这正是识别 AVNRT 的线索。',
          'Missing the pseudo-r′ in V1 and the pseudo-S in II/III/aVF — compare with the baseline sinus ECG and they vanish, which is precisely the clue to AVNRT.',
          'No ver el pseudo-r′ en V1 ni el pseudo-S en II/III/aVF: compáralos con el ECG sinusal basal y desaparecen, que es justo la pista de la TRIN.',
        ),
        l(
          '约 150 次/分的规则心动过速读成窦速或“SVT”了事——先找第二个 F 波：它在 T 波里、在 V1 上（房扑 2:1）。',
          'Reading a regular tachycardia at about 150/min as sinus tachycardia or plain "SVT" — hunt the second F wave first: inside the T wave, and in V1 (flutter with 2:1 conduction).',
          'Leer una taquicardia regular de unos 150 lpm como taquicardia sinusal o una "TSV" sin más: busca antes la segunda onda F, dentro de la T y en V1 (flutter con conducción 2:1).',
        ),
        l(
          '给腺苷时没有同步记录 12 导联：终止瞬间（最后一个事件是 P′ 还是 QRS？）和一过性房室阻滞的全部诊断信息都会丢失。',
          'Giving adenosine without a running 12-lead: the moment of termination (was the last event a P′ or a QRS?) and any transient AV block — all the diagnostic information — are lost.',
          'Administrar adenosina sin un ECG de 12 derivaciones grabando: se pierden el instante de la terminación (¿el último evento fue una P′ o un QRS?), el bloqueo AV transitorio y toda la información diagnóstica.',
        ),
        l(
          '心动过速终止后不看基础 ECG：显性旁路（WPW 图形）会改变处理与风险评估（t4）；AVRT 终止后第一条窦性心律就是你的答案。',
          'Not checking the baseline ECG after termination: a manifest pathway (WPW pattern) changes management and risk assessment (t4); the first sinus beat after an AVRT stops is your answer.',
          'No mirar el ECG basal tras la terminación: una vía manifiesta (patrón WPW) cambia el manejo y la estratificación de riesgo (t4); el primer latido sinusal tras detenerse una TRAV es tu respuesta.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '规则的窄 QRS 心动过速：先在 II、III、aVF、V1 找心房活动，再问 P′ 相对 QRS 在哪里。',
          'Regular narrow-QRS tachycardia: find the atrial activity in II, III, aVF and V1 first, then ask where the P′ sits relative to the QRS.',
          'Taquicardia regular de QRS estrecho: busca primero la actividad auricular en II, III, aVF y V1 y pregunta después dónde está la P′ respecto al QRS.',
        ),
        l(
          'P′ 看不见或在 QRS 终末端（假性 r′/假性 S）⇒ 典型 AVNRT；P′ 独立在 ST 段内、RP < PR（约 ≥ 90 ms）⇒ 顺向型 AVRT。',
          'P′ invisible or at the QRS end (pseudo-r′ / pseudo-S) -> typical AVNRT; P′ separate, in the ST segment with RP < PR (about >= 90 ms) -> orthodromic AVRT.',
          'P′ invisible o al final del QRS (pseudo-r′ / pseudo-S) -> TRIN típica; P′ separada, en el segmento ST con RP < PR (unos >= 90 ms) -> TRAV ortodrómica.',
        ),
        l(
          '长 RP（RP > PR）⇒ 房速、非典型 AVNRT、PJRT 或窦速——看 P′ 的方向与形态；P′ 比 QRS 多 ⇒ 房速或房扑（2:1 房扑：约 150 次/分，第二个 F 藏在 T 里）。',
          'Long RP (RP > PR) -> AT, atypical AVNRT, PJRT or sinus tachycardia — read the P′ polarity and shape; more P′ than QRS -> AT or flutter (2:1 flutter: about 150/min, the second F hidden in the T).',
          'RP largo (RP > PR) -> TA, TRIN atípica, PJRT o taquicardia sinusal: lee la polaridad y la forma de la P′; más P′ que QRS -> TA o flutter (flutter 2:1: unos 150 lpm, la segunda F escondida en la T).',
        ),
        l(
          '迷走手法与腺苷是诊断试验：终止且最后一个事件是 P′ ⇒ 依赖房室结；出现阻滞而房律不停 ⇒ 房速/房扑——全程记录 12 导联，终止后检查基础 ECG。',
          'Vagal manoeuvres and adenosine are diagnostic tests: termination with a final P′ -> AV-node-dependent; block with the atrial rhythm persisting -> AT/flutter — record a 12-lead throughout and check the baseline ECG afterwards.',
          'Las maniobras vagales y la adenosina son pruebas diagnósticas: terminación con una P′ final -> dependencia del nodo AV; bloqueo con el ritmo auricular persistente -> TA/flutter: graba un ECG de 12 derivaciones todo el tiempo y revisa el ECG basal después.',
        ),
      ],
    },
  ],
  sources: [
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    'Page RL et al. 2015 ACC/AHA/HRS Guideline for the management of adult patients with supraventricular tachycardia. Circulation 2016;133:e506-e574',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
