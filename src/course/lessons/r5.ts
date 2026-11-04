/**
 * r5 — Premature beats (PAC, blocked PAC, PJC, PVC) and aberrancy (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `pac-criteria`, `aberrancy-vs-pvc`, `pvc-criteria`, `pvc-origin`,
 * `pvc-grouping-lown` (current values), plus the "Missing in the book" items under ventricular-arrhythmias:
 * PVC risk features (burden >=10%, short-coupled <300 ms) and outflow-tract localisation.
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
  id: 'r5',
  stage: 'R',
  order: 5,
  title: l('期前收缩（房性、房性未下传、交界性、室性）与差异性传导', 'Premature beats (PAC, blocked PAC, PJC, PVC) and aberrancy', 'Extrasístoles (auriculares, auriculares bloqueadas, de la unión y ventriculares) y aberrancia'),
  summary: l(
    '期前收缩按来源分类：房早带提前而形态不同的 P′，极早时未下传或差异性传导；交界性早搏带逆行 P′；室早宽大、无相关 P 波、联律固定、完全代偿间歇。又宽又早的搏动先找 P′——差异性传导是最常被读成室早的替身。',
    'Premature beats are classified by origin: a PAC carries an early P′ of a different shape — blocked or aberrant when very early; a PJC a retrograde P′; a PVC is wide, has no related P wave, fixed coupling and a fully compensatory pause. With any wide early beat, hunt for the P′ first — aberrancy is the impostor most often read as a PVC.',
    'Las extrasístoles se clasifican por su origen: la auricular lleva una P′ precoz de morfología distinta (bloqueada o aberrante si es muy precoz); la de la unión, una P′ retrógrada; la ventricular es ancha, sin onda P relacionada, con acoplamiento fijo y pausa compensatoria completa. Ante cualquier latido ancho y prematuro, busca primero la P′: la aberrancia es la suplantadora que más veces se lee como extrasístole ventricular.',
  ),
  objectives: [
    l(
      '用三个问题（有无 P′ 及其形态、QRS 宽度、间歇类型）把提前的搏动分为房早、交界性早搏或室早。',
      'Sort any premature beat into PAC, PJC or PVC with three questions: is there a P′ and what shape, how wide is the QRS, and what kind of pause follows.',
      'Clasificar cualquier extrasístole en auricular, de la unión o ventricular con tres preguntas: ¿hay P′ y con qué morfología?, ¿qué anchura tiene el QRS? y ¿qué tipo de pausa sigue?',
    ),
    l(
      '解释极早房早的两种结局：未下传（P′ 落在 T 波上）与差异性传导（右束支阻滞形，Ashman 长–短周期）。',
      'Explain the two fates of a very early PAC: blocked (the P′ lands on the T wave) and aberrant (RBBB-shaped, Ashman long–short cycle).',
      'Explicar los dos destinos de una extrasístole auricular muy precoz: bloqueada (la P′ cae sobre la onda T) y aberrante (morfología de bloqueo de rama derecha, ciclo largo–corto de Ashman).',
    ),
    l(
      '用联律间期、代偿间歇与 V1 形态分析室早并定位其起源；使用二联律/三联律/成对与 NSVT 等术语及风险特征（负荷 ≥10%、短联律 <300 ms）。',
      'Analyse a PVC with its coupling interval, compensatory pause and V1 shape to localise the origin; use the grouping terms (bigeminy, trigeminy, couplet, NSVT) and the risk features (burden ≥10 %, short coupling <300 ms).',
      'Analizar una extrasístole ventricular por su acoplamiento, pausa compensatoria y morfología en V1 para localizar el origen; usar los términos de agrupación (bigeminismo, trigeminismo, pareja, TVNS) y los rasgos de riesgo (carga ≥10 %, acoplamiento corto <300 ms).',
    ),
    l(
      '识破未下传房早二联律造成的“窦性心动过缓”假象。',
      'See through blocked-PAC bigeminy masquerading as sinus bradycardia.',
      'Desenmascarar el bigeminismo auricular bloqueado que simula una bradicardia sinusal.',
    ),
  ],
  minutes: 15,
  competencies: ['C9', 'C6'],
  findings: ['pac', 'pac-blocked', 'pjc', 'pvc', 'ventricular-bigeminy', 'aberrant-conduction'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('ventricular-bigeminy', 481),
      view: STRIP,
      question: l(
        '这条节律条上每隔一个搏动就有一个宽大、提前的 QRS。它们是什么，和窦性搏动是什么关系？先想好你的判断再往下看。',
        'Every other beat on this strip is wide and early. What are they, and how do they relate to the sinus beats? Commit to an answer before reading on.',
        'En esta tira, un sí y un no, cada segundo latido es ancho y prematuro. ¿Qué son y cómo se relacionan con los latidos sinusales? Decide tu respuesta antes de continuar.',
      ),
      reveal: l(
        '它们是**室性早搏（PVC），呈二联律**：每个窦性搏动后紧跟一个提前、宽大（≥120 ms）、束支阻滞形的 QRS，前面没有相关的 P 波，联律间期固定，随后是**完全性代偿间歇**——窦房结在室早下方照常放电，P 波埋在宽大的 QRS/T 里。宽大而提前的搏动先想室早，但本课要往下走三层：它的三个室上性“表亲”（房早、未下传房早、交界性早搏），以及最危险的替身——差异性传导。',
        'They are **PVCs in bigeminy**: after each sinus beat comes a premature, wide (≥120 ms) bundle-branch-block-shaped QRS with no related P wave before it, a fixed coupling interval, and then a **fully compensatory pause** — the sinus node keeps firing underneath, its P buried in the wide QRS/T. When a beat is wide and early, think PVC first — but this lesson goes three layers deeper: its supraventricular cousins (PAC, blocked PAC, PJC) and its most dangerous impostor, aberrant conduction.',
        'Son **extrasístoles ventriculares en bigeminismo**: tras cada latido sinusal llega un QRS prematuro y ancho (≥120 ms) con morfología de bloqueo de rama, sin onda P relacionada delante, con acoplamiento fijo y seguido de una **pausa compensatoria completa**: el nodo sinusal sigue disparando por debajo, con su P enterrada en el QRS/T ancho. Ante un latido ancho y prematuro, piensa primero en la extrasístole ventricular, pero esta lección baja tres niveles más: sus primas supraventriculares (extrasístole auricular, bloqueada y de la unión) y su suplantador más peligroso, la conducción aberrante.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('pvc', 482),
      showConduction: true,
      emphasize: ['rv-outflow'],
      caption: l(
        '这个室早起自右室流出道。激动先右室后左室：V1 主波向下（左束支阻滞形），II、III、aVF 高 R。这一个没有传到心房，窦房结照常放电。',
        'This PVC starts in the right ventricular outflow tract. The right ventricle fires first, then the left: V1 points down (LBBB-shaped) and II, III and aVF show tall R waves. This one does not reach the atria, so the sinus node keeps firing.',
        'Esta extrasístole nace en el tracto de salida del VD. Primero se activa el ventrículo derecho y después el izquierdo: V1 es negativo (morfología de bloqueo de rama izquierda) y II, III y aVF tienen R altas. Esta no llega a las aurículas, así que el nodo sinusal sigue disparando.',
      ),
    },
    {
      kind: 'film',
      title: l('提前的搏动：问三件事', 'A premature beat: ask three things', 'Un latido prematuro: tres preguntas'),
      view: STRIP,
      frames: [
        {
          label: l('房早', 'PAC', 'Extrasístole auricular'),
          ecg: synth('pac', 483),
          note: l('P′ 提前、形态不同（II 倒置）；P′R 约 155 ms，QRS 与窦性相同。其后间歇短于完全代偿。', 'The P′ comes early and looks different (negative in II); the P′R is about 155 ms and the QRS matches sinus. The pause after it is less than compensatory.', 'La P′ llega pronto y es distinta (negativa en II); el P′R mide unos 155 ms y el QRS es igual al sinusal. La pausa posterior es menos que compensatoria.'),
          marks: [{ auto: 'p', beat: 5 }, { auto: 'pr', beat: 5 }],
        },
        {
          label: l('交界性早搏', 'PJC', 'Extrasístole de la unión'),
          ecg: synth('pjc', 488),
          note: l('窄 QRS 提前，前面没有 P。和窦性搏动比，ST 起始处多了一个小负向波：逆行 P′。它也可在 QRS 前或埋在 QRS 里。', 'A narrow early QRS with no P before it. Compared with the sinus beats, a small negative wave sits at the start of the ST: a retrograde P′. It can also come before the QRS or hide inside it.', 'QRS estrecho y precoz sin P delante. Frente a los latidos sinusales, hay una pequeña onda negativa al inicio del ST: una P′ retrógrada. También puede ir antes del QRS u ocultarse en él.'),
          marks: [{ auto: 'st', beat: 5 }],
        },
        {
          label: l('室早', 'PVC', 'Extrasístole ventricular'),
          ecg: synth('pvc', 482),
          note: l('没有 P′，QRS 宽（约 175 ms）。窦性节律不受打扰：室早两侧的 R 相距约 2 个窦性周期，间歇完全代偿。', 'No P′ and a wide QRS (about 175 ms). The sinus rhythm is undisturbed: the R waves either side of the PVC are about two sinus cycles apart, a fully compensatory pause.', 'Sin P′ y QRS ancho (unos 175 ms). El ritmo sinusal no se altera: las R a ambos lados de la extrasístole distan unos dos ciclos sinusales, una pausa compensatoria completa.'),
          marks: [{ auto: 'qrs', beat: 5 }],
        },
      ],
      predict: {
        question: l('房早的 P′ 会重整窦房结。它后面的间歇比完全代偿……', 'A PAC resets the sinus node. Compared with a fully compensatory pause, the pause after it is…', 'Una extrasístole auricular reinicia el nodo sinusal. Frente a una pausa compensatoria completa, la pausa que la sigue es…'),
        options: [l('更短', 'Shorter', 'Más corta'), l('一样长', 'The same', 'Igual'), l('更长', 'Longer', 'Más larga')],
        answer: 0,
        ordered: true,
      },
      caption: l(
        '前面有没有 P′？QRS 宽不宽？间歇是否完全代偿？早到是期前收缩，晚到是逸搏（r2）。',
        'Is there a P′ before it? Is the QRS wide? Is the pause fully compensatory? Early means ectopy; late means escape (r2).',
        '¿Hay una P′ delante? ¿El QRS es ancho? ¿La pausa es compensatoria completa? Precoz es extrasístole; tardío, escape (r2).',
      ),
    },
    {
      kind: 'criteria',
      title: l('期前收缩与差异性传导：标准', 'Premature beats and aberrancy: the criteria', 'Extrasístoles y aberrancia: los criterios'),
      items: [
        {
          label: l('房早（PAC）', 'PAC', 'Extrasístole auricular'),
          value: l(
            '提前的 P′，形态与窦性不同；P′R 正常或延长；QRS 通常与窦性相同，过早时可差异性传导（多呈右束支阻滞形）或未下传；间歇通常**不完全代偿**（窦房结被重整）',
            'Premature P′ differing in shape from sinus; P′R normal or prolonged; QRS usually identical to sinus, but aberrant (usually RBBB-shaped) or non-conducted when very premature; the pause is usually **less than compensatory** (the sinus node is reset)',
            'P′ prematura con morfología distinta de la sinusal; P′R normal o prolongado; QRS habitualmente idéntico al sinusal, aunque puede ser aberrante (con morfología de bloqueo de rama derecha) o no conducida si es muy precoz; la pausa suele ser **menos que compensatoria** (el nodo sinusal se reinicia)',
          ),
        },
        {
          label: l('未下传房早', 'Blocked PAC', 'Extrasístole auricular bloqueada'),
          value: l(
            '极早的 P′ 落在前一 T 波上，房室结仍处于不应期 → 无 QRS，只留一个“不明”间歇；必须在 T 波上找到 P′ 才能解释停搏',
            'A very early P′ lands on the previous T wave and finds the AV node refractory → no QRS, only an "unexplained" pause; the P′ must be found on the T before the pause can be explained',
            'Una P′ muy precoz cae sobre la onda T previa y encuentra el nodo AV refractario → no hay QRS, solo una pausa «inexplicada»; hay que encontrar la P′ sobre la T para poder explicar la pausa',
          ),
        },
        {
          label: l('交界性早搏（PJC）', 'PJC', 'Extrasístole de la unión'),
          value: l(
            '提前的窄 QRS，形态似窦性；逆行 P′（II、III、aVF 倒置）位于 QRS 之前（P′R <120 ms）、其中或其后（ST 段内）',
            'Premature narrow QRS similar to sinus; a retrograde P′ (negative in II, III, aVF) before the QRS (P′R <120 ms), hidden inside it, or just after it in the ST segment',
            'QRS estrecho y precoz, parecido al sinusal; P′ retrógrada (negativa en II, III, aVF) antes del QRS (P′R <120 ms), oculta en él o justo después, en el segmento ST',
          ),
        },
        {
          label: l('室早（PVC）', 'PVC', 'Extrasístole ventricular'),
          value: l(
            '提前的 QRS 通常 ≥120 ms、束支阻滞形，其前无相关 P′；继发性 ST-T 与主波方向相反；联律间期固定（变异性 >80 ms 伴融合波与共同间期 → 考虑室性并行心律）；间歇通常完全代偿',
            'Premature QRS usually ≥120 ms with a bundle-branch-block-like shape, not preceded by a related P′; secondary ST-T opposite to the main QRS deflection; fixed coupling interval (variation >80 ms plus fusion beats and a common interectopic denominator suggests parasystole); the pause is usually fully compensatory',
            'QRS prematuro habitualmente ≥120 ms con morfología de bloqueo de rama, sin P′ relacionada delante; ST-T secundario opuesto a la deflexión principal del QRS; intervalo de acoplamiento fijo (variación >80 ms con latidos de fusión y un denominador interectópico común sugiere parasistolia); la pausa suele ser compensatoria completa',
          ),
        },
        {
          label: l('起源（V1 形态）', 'Origin (V1 shape)', 'Origen (morfología en V1)'),
          value: l(
            '右束支阻滞形 V1 → 左室（或分支）起源；左束支阻滞形 V1 → 右室或室间隔/左室流出道/主动脉瓣窦；左束支阻滞形 + 电轴下偏 → 流出道起源：胸前移行 ≤V2 提示主动脉瓣窦/LVOT，≥V4 提示 RVOT',
            'RBBB-like V1 → left ventricular (or fascicular) origin; LBBB-like V1 → right ventricle or septum / LV outflow tract / aortic cusps; LBBB-like with inferior axis → outflow tract: precordial transition at or before V2 points to an aortic cusp or LVOT, at V4 or later to the RVOT',
            'V1 con morfología de bloqueo de rama derecha → origen en el ventrículo izquierdo (o fascicular); V1 con morfología de rama izquierda → ventrículo derecho o septo / tracto de salida del VI / válvulas aórticas; morfología de rama izquierda con eje inferior → tracto de salida: la transición precordial en V2 o antes apunta a valva aórtica/TSVI, y en V4 o después a TSVD',
          ),
        },
        {
          label: l('分组与 NSVT', 'Grouping and NSVT', 'Agrupación y TVNS'),
          value: l(
            '保留二联律、三联律、成对等描述性术语；连续 ≥3 个室性搏动且 >100 次/分 = 非持续性室速（“三连律”已是 NSVT）；不用 Lown 分级，改用负荷、单形/多形、联律间期及有无 NSVT 来描述',
            'Keep the descriptive terms bigeminy, trigeminy and couplet; three or more consecutive ventricular beats at >100/min = non-sustained VT (a "triplet" already counts as NSVT); instead of Lown grades, describe ectopy by burden, mono- vs polymorphic shape, coupling interval and the presence of NSVT',
            'Consérvense los términos descriptivos bigeminismo, trigeminismo y pareja; tres o más latidos ventriculares consecutivos a >100 lpm = taquicardia ventricular no sostenida (un «triplete» ya es TVNS); en lugar de los grados de Lown, describir el ectopismo por carga, mono- o polimorfismo, intervalo de acoplamiento y presencia de TVNS',
          ),
        },
        {
          label: l('风险特征', 'Risk features', 'Rasgos de riesgo'),
          value: l(
            'Holter 负荷 ≥10% 且左室射血分数不明原因减低 → 警惕 PVC 诱导的心肌病；其他高危特征：短联律 <300 ms（R-on-T）、QRS >150–160 ms、非流出道起源、多形性、运动时增多',
            'A Holter burden ≥10 % with an unexplained fall in LVEF → suspect PVC-induced cardiomyopathy; other higher-risk features: short coupling <300 ms (R-on-T), QRS >150-160 ms, non-outflow-tract origin, polymorphic PVCs, and an increase on exercise',
            'Una carga en el Holter ≥10 % con caída inexplicada de la FEVI → sospechar miocardiopatía inducida por extrasístoles; otros rasgos de mayor riesgo: acoplamiento corto <300 ms (R-on-T), QRS >150-160 ms, origen no del tracto de salida, extrasístoles polimórficas y aumento con el ejercicio',
          ),
        },
        {
          label: l('单个宽而早的搏动：差异性传导还是室早', 'One wide early beat: aberrancy or PVC', 'Un latido ancho y precoz: aberrancia o extrasístole ventricular'),
          value: l(
            '倾向差异性传导：宽 QRS 前有提前的 P′（最可靠）、V1 三相 rSR′ 而 V6 qRs、起始向量同窦性、间歇不完全代偿；Ashman 长–短周期支持但不能证明。倾向室早：无 P′、联律固定、V1 单相 R 或 qR 或不典型左束支阻滞形、间歇完全代偿。“同向性”只用于宽 QRS 心动过速，不用于单个搏动',
            'Favour aberrancy: a premature P′ before the wide QRS (the most reliable sign), a triphasic rSR′ in V1 with qRs in V6, an initial vector matching the sinus beats, a less-than-compensatory pause; an Ashman long-short sequence supports it but does not prove it. Favour PVC: no P′, fixed coupling, a monophasic R or qR in V1 or an atypical LBBB shape, a fully compensatory pause. "Concordance" belongs to wide-QRS tachycardia, not to a single beat',
            'A favor de la aberrancia: una P′ prematura antes del QRS ancho (el signo más fiable), rSR′ trifásico en V1 con qRs en V6, vector inicial igual al de los latidos sinusales y pausa menos que compensatoria; una secuencia larga-corta de Ashman la apoya, pero no la demuestra. A favor de la extrasístole ventricular: sin P′, acoplamiento fijo, R monofásica o qR en V1 o morfología atípica de bloqueo de rama izquierda y pausa compensatoria completa. La «concordancia» es de la taquicardia de QRS ancho, no de un latido aislado',
          ),
        },
      ],
      source:
        'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720; Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307',
    },
    {
      kind: 'worked',
      title: l('在 T 波上找到它：未下传房早', 'Find it on the T: the blocked PAC', 'Encuéntrala en la T: la extrasístole auricular bloqueada'),
      ecg: synth('pac-blocked', 484),
      view: STRIP,
      steps: [
        {
          title: l('先看间歇', 'Start with the pause', 'Empieza por la pausa'),
          body: l(
            'RR 突然拉长——一个“停搏”。别急着写窦性停搏或房室传导阻滞（复习 r1、r3）：先把分规卡在一个 PP 上，沿节律条走一遍。',
            'The RR suddenly stretches — a "pause". Do not jump to sinus arrest or AV block (revision of r1 and r3): set the calipers on one PP and walk them along the strip first.',
            'El RR se alarga de golpe: una «pausa». No saltes a la parada sinusal ni al bloqueo AV (repaso de r1 y r3): ajusta primero el compás a un PP y recorre la tira.',
          ),
          marks: [{ auto: 'rr', beat: 4 }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('T 波变形了', 'The T wave has changed shape', 'La onda T ha cambiado'),
          body: l(
            '停搏前的那个 T 与其他 T 不一样——更高、有切迹或“长了个角”。那不全是 T：是 **T + 提前藏进去的 P′**。逐搏比较 T 的形态。',
            'The T just before the pause does not look like the others — taller, notched, or with a "horn". That is not all T wave: it is the **T plus an early P′ hidden on it**. Compare the T shapes beat by beat.',
            'La T justo antes de la pausa no se parece a las demás: más alta, mellada o «con un cuerno». No es solo onda T: es la **T más una P′ precoz escondida sobre ella**. Compara las morfologías de las T latido a latido.',
          ),
          marks: [{ auto: 't', beat: 4 }],
        },
        {
          title: l('P′ 到时，门还关着', 'The P′ arrives while the door is still shut', 'La P′ llega con la puerta aún cerrada'),
          body: l(
            '这个 P′ 距前一个窦性 P 仅约 365 ms（基础 PP 约 830 ms），落在前一次搏动的不应期内：心房除极了，房室结拒绝下传 → 没有 QRS。未下传房早的“证据”就是**只有 P′、没有 QRS**。',
            'This P′ comes only about 365 ms after the previous sinus P (the basic PP is about 830 ms) and falls inside the refractory period of the previous beat: the atria depolarise, the AV node refuses to conduct → no QRS. The signature of a blocked PAC is **a P′ with no QRS to follow**.',
            'Esta P′ llega solo unos 365 ms después de la P sinusal previa (el PP basal es de unos 830 ms) y cae dentro del periodo refractario del latido previo: las aurículas se despolarizan, el nodo AV se niega a conducir → no hay QRS. La firma de la extrasístole auricular bloqueada es **una P′ sin QRS que la siga**.',
          ),
          marks: [{ auto: 'blocked-p' }],
        },
        {
          title: l('下诊断，并和两个假象告别', 'Make the diagnosis, and rule out the two mimics', 'Haz el diagnóstico y descarta los dos simulacros'),
          body: l(
            '诊断：**未下传房早**。与二度房室传导阻滞的差别：那里的 P **按时**出现（PP 恒定），这里的关键 P′ 是**提前**的；与窦性停搏的差别：这里能找到那个 P′（它就藏在 T 上）。机制是心房“太早”，不是传导系统“太病”——治疗思路随之不同。',
            'Diagnosis: **blocked PAC**. Unlike second-degree AV block, where the P arrives **on time** (constant PP), the decisive P′ here is **early**; unlike sinus arrest, the P′ can be found — hidden on the T. The mechanism is an atrium firing too early, not a diseased conduction system, and management follows from that.',
            'Diagnóstico: **extrasístole auricular bloqueada**. A diferencia del bloqueo AV de segundo grado, donde la P llega **a su hora** (PP constante), aquí la P′ decisiva es **precoz**; y a diferencia de la parada sinusal, la P′ se puede encontrar, oculta sobre la T. El mecanismo es una aurícula que dispara demasiado pronto, no un sistema de conducción enfermo, y el manejo se deriva de eso.',
          ),
          marks: [{ auto: 'p', beat: 3 }, { auto: 'p', beat: 4 }, { auto: 'blocked-p' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
      ],
    },
    {
      kind: 'film',
      title: l('先数 T 波，再说出分组', 'Count the T waves, then name the grouping', 'Cuenta las ondas T y nombra la agrupación'),
      view: STRIP,
      frames: [
        {
          label: l('未下传房早二联律', 'Blocked PAC bigeminy', 'Bigeminismo auricular bloqueado'),
          ecg: synth('pac-blocked', 485, undefined, 'bigeminy'),
          note: l('看似约 46 次/分的窦缓，但每个 T 波上都骑着一个 P′：心房约 95 次/分，P′ 全部未下传。', 'It looks like sinus bradycardia at about 46/min, but every T wave carries a P′: the atria fire at about 95/min and no P′ conducts.', 'Parece una bradicardia sinusal a unos 46 lpm, pero cada onda T lleva una P′: las aurículas van a unos 95 lpm y ninguna P′ conduce.'),
          marks: [{ auto: 'blocked-p' }],
        },
        {
          label: l('室早二联律', 'Ventricular bigeminy', 'Bigeminismo ventricular'),
          ecg: synth('ventricular-bigeminy', 481),
          note: l('每个窦性搏动后跟一个宽而提前的 QRS：二联律。联律间期固定，约 480 ms。', 'Every sinus beat is followed by a wide early QRS: bigeminy. The coupling interval is fixed at about 480 ms.', 'Cada latido sinusal va seguido de un QRS ancho y precoz: bigeminismo. El acoplamiento es fijo, de unos 480 ms.'),
          marks: [{ auto: 'rr', beat: 1 }],
        },
        {
          label: l('多形三联律', 'Polymorphic trigeminy', 'Trigeminismo polimorfo'),
          ecg: synth('pvc-patterns', 489, undefined, 'multifocal'),
          note: l('每第 3 个搏动是室早，II 导联上两种宽 QRS 交替出现（一高一矮）：两种形态，多形三联律。', 'Every third beat is a PVC, and in lead II two wide QRS shapes alternate (one tall, one short): two shapes, polymorphic trigeminy.', 'Cada tercer latido es una extrasístole, y en II alternan dos QRS anchos (uno alto y otro bajo): dos morfologías, trigeminismo polimorfo.'),
          marks: [{ auto: 'qrs', beat: 2 }, { auto: 'qrs', beat: 5 }],
        },
        {
          label: l('成对', 'Couplet', 'Pareja'),
          ecg: synth('pvc-patterns', 490),
          note: l('连续两个室早 = 成对。再多一个（≥3 个、>100 次/分）就是非持续性室速。', 'Two PVCs in a row = a couplet. One more (≥3 at >100/min) is non-sustained VT.', 'Dos extrasístoles seguidas = una pareja. Una más (≥3 a >100 lpm) es una taquicardia ventricular no sostenida.'),
          marks: [{ auto: 'qrs', beat: 4 }, { auto: 'qrs', beat: 5 }],
        },
      ],
      predict: {
        question: l('节律条看似 46 次/分的窦缓，可每个 T 波都有切迹。心房实际多快？', 'A strip looks like sinus bradycardia at 46/min, yet every T wave is notched. How fast are the atria really?', 'Una tira parece una bradicardia sinusal a 46 lpm, pero todas las ondas T tienen una muesca. ¿A qué frecuencia van de verdad las aurículas?'),
        options: [l('约 30 次/分', 'About 30/min', 'Unos 30 lpm'), l('约 46 次/分', 'About 46/min', 'Unos 46 lpm'), l('约 95 次/分', 'About 95/min', 'Unos 95 lpm')],
        answer: 2,
        ordered: true,
      },
      caption: l(
        '任何“窦缓”先数 T 波。室早用描述性的话：二联律、三联律、成对、多形，不用 Lown 分级。',
        'On any "slow sinus" strip, count the T waves first. Describe PVCs in plain terms (bigeminy, trigeminy, couplet, polymorphic), not Lown grades.',
        'Ante cualquier «sinusal lenta», cuenta primero las ondas T. Describe las extrasístoles con términos llanos (bigeminismo, trigeminismo, pareja, polimorfas), no con grados de Lown.',
      ),
    },
    {
      kind: 'contrast',
      title: l('两个提前的宽 QRS：谁带着 P′？', 'Two premature wide QRS: which one carries a P′?', 'Dos QRS anchos y precoces: ¿cuál trae una P′?'),
      view: STRIP,
      left: {
        ecg: synth('pac-aberrant', 486),
        caption: l('宽 QRS 前有提前的 P′；QRS 右束支阻滞形；间歇不完全代偿——差异性传导', 'A premature P′ before the wide QRS; RBBB shape; less-than-compensatory pause — aberrancy', 'Una P′ prematura delante del QRS ancho; morfología de bloqueo de rama derecha; pausa menos que compensatoria: aberrancia'),
        marks: [{ auto: 'p', beat: 6 }],
      },
      right: {
        ecg: synth('pvc', 487),
        caption: l('无 P′；其后完全代偿间歇，窦性 P 埋在宽 QRS 里——右室流出道室早', 'No P′; a fully compensatory pause after it, the sinus P buried in the wide QRS — RV outflow-tract PVC', 'Sin P′; pausa compensatoria completa después, con la P sinusal enterrada en el QRS ancho: extrasístole del tracto de salida del VD'),
        marks: [{ auto: 'qrs', beat: 5 }],
      },
      point: l(
        '左：早到的 P′ 遇上没缓过来的右束支 → QRS 增宽，但**机制是室上性的**：找 P′、看 V1 的三相 rSR′、量间歇是否短于完全代偿。右：没有 P′——宽 QRS 自己就是起源，其后的间歇完全代偿。把左图叫成室早是本课最常见的错误（当它升级成宽 QRS 心动过速时也最危险）：**宽 ≠ 室性**。',
        'Left: an early P′ meets a right bundle branch that has not recovered → the QRS widens, but **the mechanism is supraventricular**: look for the P′, the triphasic rSR′ in V1, and a pause short of full compensation. Right: no P′ — the wide QRS is its own origin, and the pause after it is fully compensatory. Calling the left tracing a PVC is this lesson\'s commonest error (and the most dangerous one when it later escalates into a wide-QRS tachycardia): **wide does not mean ventricular**.',
        'Izquierda: una P′ precoz encuentra una rama derecha que no se ha recuperado → el QRS se ensancha, pero **el mecanismo es supraventricular**: busca la P′, el rSR′ trifásico en V1 y una pausa que se queda corta de la compensación completa. Derecha: no hay P′; el QRS ancho es su propio origen, y la pausa que lo sigue es compensatoria completa. Llamar extrasístole ventricular al trazado izquierdo es el error más común de esta lección (y el más peligroso si después escala a una taquicardia de QRS ancho): **ancho no significa ventricular**.',
      ),
    },
    { kind: 'check', item: { family: 'ectopy', seed: 3 } },
    { kind: 'check', item: { family: 'ectopy', seed: 33 } },
    { kind: 'check', item: { family: 'ectopy', seed: 15 } },
    { kind: 'drill', families: ['ectopy'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [2466, 14276, 13033],
      caption: l(
        '两份房性、一份室性期前收缩（PTB-XL 真实病例）。逐个分析提前的搏动：P′ 在哪里、QRS 多宽、联律固定吗、间歇是哪一种——**先想好结论再揭晓**。',
        'Two atrial and one ventricular premature beat (real PTB-XL cases). Analyse each early beat: where is the P′, how wide is the QRS, is the coupling fixed, and what kind of pause follows — **commit to a conclusion before you reveal**.',
        'Dos extrasístoles auriculares y una ventricular (casos reales de PTB-XL). Analiza cada latido precoz: dónde está la P′, qué anchura tiene el QRS, si el acoplamiento es fijo y qué tipo de pausa sigue: **decide tu conclusión antes de mirar la solución**.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把未下传房早二联律当“窦性心动过缓”去做起搏器评估：先数 T 波——心房的激动频率常常正常甚至偏快，每隔一个心房波就是一个藏在 T 上的 P′。',
          'Working up blocked-PAC bigeminy as "sinus bradycardia" for a pacemaker: count the T waves first — the atria are often firing at a normal or fast rate, with every second atrial wave a P′ hidden on the T.',
          'Estudiar el bigeminismo auricular bloqueado como «bradicardia sinusal» para un marcapasos: cuenta antes las ondas T; las aurículas suelen activarse a una frecuencia normal o rápida, y una de cada dos ondas auriculares es una P′ oculta en la T.',
        ),
        l(
          '把差异性传导叫成室早（乃至室速）：宽 ≠ 室性——先找 P′、看 V1 的 rSR′、比起始向量与间歇。',
          'Calling aberrancy a PVC (or VT): wide does not mean ventricular — look for the P′, the rSR′ in V1, the initial vector and the pause.',
          'Llamar aberrancia a la extrasístole ventricular (o a una TV): ancho no significa ventricular; busca la P′, el rSR′ en V1, el vector inicial y la pausa.',
        ),
        l(
          '把代偿间歇的逻辑用反：房早多为不完全代偿（窦房结被重整），室早多为完全代偿——间歇本身就是分类证据。',
          'Reversing the compensatory-pause logic: a PAC usually leaves a less-than-compensatory pause (sinus node reset), a PVC a fully compensatory one — the pause itself is class evidence.',
          'Invertir la lógica de la pausa compensatoria: la extrasístole auricular suele dejar una pausa menos que compensatoria (nodo sinusal reiniciado) y la ventricular una completa: la propia pausa es evidencia de clasificación.',
        ),
        l(
          '每见一个房早就安排全套检查：偶发房早极其常见——先问诱因（咖啡、酒精、应激、睡眠不足、电解质、缺氧、甲状腺）与症状，再决定是否需要更多检查。',
          'Ordering a full work-up for every PAC: occasional PACs are extremely common — ask about triggers (coffee, alcohol, stress, sleep debt, electrolytes, hypoxia, thyroid) and symptoms first, and only then decide whether more testing is needed.',
          'Pedir un estudio completo por cada extrasístole auricular: las esporádicas son muy frecuentes; pregunta primero por los desencadenantes (café, alcohol, estrés, falta de sueño, electrolitos, hipoxia, tiroides) y por los síntomas, y solo después decide si hacen falta más pruebas.',
        ),
        l(
          '一见 R-on-T 就报“猝死风险”：单纯骑在 T 上并不等于危险——风险取决于联律间期（<300 ms）、QT 与基础病变（在缺血与长 QT 中才真正要紧）。',
          'Reporting "sudden-death risk" at the sight of any R-on-T: riding the T wave alone is not danger — risk depends on the coupling interval (<300 ms), the QT and the substrate (it truly matters in ischaemia and long QT).',
          'Avisar de «riesgo de muerte súbita» ante cualquier R-on-T: cabalgar la onda T por sí solo no es peligroso; el riesgo depende del acoplamiento (<300 ms), del QT y del sustrato (importa de verdad en la isquemia y el QT largo).',
        ),
        l(
          '因为“看得见 P 波”就把交界性早搏当房早：看极性——逆行 P′ 在 II、III、aVF 倒置，且 P′R <120 ms 或落在 QRS 之后。',
          'Reading a PJC as a PAC because "a P wave is visible": check its polarity — a retrograde P′ is negative in II, III and aVF, with a P′R <120 ms or sitting after the QRS.',
          'Leer una extrasístole de la unión como auricular porque «se ve una P»: mira la polaridad; la P′ retrógrada es negativa en II, III y aVF, con un P′R <120 ms o situada tras el QRS.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '提前的搏动按来源分：房早 = 提前、形态不同的 P′（P′R 正常或延长）；交界性早搏 = 逆行 P′（前/中/后）；室早 = 宽 ≥120 ms、束支阻滞形、其前无相关 P′。',
          'Premature beats by origin: PAC = an early P′ of different shape (P′R normal or long); PJC = a retrograde P′ (before, inside or after the QRS); PVC = ≥120 ms, bundle-branch-shaped, no related P′ before it.',
          'Extrasístoles por origen: auricular = P′ precoz de morfología distinta (P′R normal o largo); de la unión = P′ retrógrada (antes, dentro o después del QRS); ventricular = ≥120 ms, con morfología de bloqueo de rama y sin P′ relacionada delante.',
        ),
        l(
          '极早的房早两种结局：未下传（P′ 藏在 T 波上，只留间歇）或差异性传导（右束支阻滞形，Ashman 长–短周期）。',
          'A very early PAC has two fates: blocked (the P′ hides on the T wave, leaving only a pause) or aberrant (RBBB-shaped, Ashman long-short cycle).',
          'Una extrasístole auricular muy precoz tiene dos destinos: bloqueada (la P′ se oculta en la onda T y solo queda una pausa) o aberrante (morfología de bloqueo de rama derecha, ciclo largo-corto de Ashman).',
        ),
        l(
          '室早：联律固定、完全代偿间歇、窦性 P 照常行进；V1 形态定位——右束支阻滞形 → 左室，左束支阻滞形 → 右室/间隔，左束支阻滞形 + 电轴下偏 → 流出道（移行 ≤V2 主动脉瓣窦/LVOT，≥V4 RVOT）。',
          'PVC: fixed coupling, a fully compensatory pause, the sinus P marching on; V1 shape localises it — RBBB-like → LV, LBBB-like → RV or septum, LBBB-like with inferior axis → outflow tract (transition at or before V2, aortic cusp/LVOT; at V4 or later, RVOT).',
          'Extrasístole ventricular: acoplamiento fijo, pausa compensatoria completa y P sinusal que sigue su marcha; la morfología en V1 la localiza: tipo bloqueo de rama derecha → VI; tipo rama izquierda → VD o septo; tipo rama izquierda con eje inferior → tracto de salida (transición en V2 o antes, valva aórtica/TSVI; en V4 o después, TSVD).',
        ),
        l(
          '连续 ≥3 个室性搏动且 >100 次/分 = NSVT；描述室早用负荷（≥10% + EF 不明原因减低 → PVC 诱导心肌病）、单形/多形与联律间期（<300 ms 高危），不用 Lown 分级。',
          'Three or more consecutive ventricular beats at >100/min = NSVT; describe PVCs by burden (≥10 % plus an unexplained fall in EF → PVC-induced cardiomyopathy), mono- vs polymorphic shape and coupling interval (<300 ms high risk), not by Lown grades.',
          'Tres o más latidos ventriculares consecutivos a >100 lpm = TVNS; describe las extrasístoles ventriculares por carga (≥10 % más caída inexplicada de la FEVI → miocardiopatía inducida por extrasístoles), mono- o polimorfismo y acoplamiento (<300 ms de alto riesgo), no por grados de Lown.',
        ),
        l(
          '又宽又早的搏动：前面有 P′、V1 呈 rSR′、起始向量同窦性、间歇不完全代偿 → 差异性传导；无 P′、联律固定、完全代偿 → 室早。',
          'A wide early beat: a preceding P′, rSR′ in V1, the initial vector as in sinus and a less-than-compensatory pause → aberrancy; no P′, fixed coupling, full compensation → PVC.',
          'Un latido ancho y precoz: P′ precedente, rSR′ en V1, vector inicial como el sinusal y pausa menos que compensatoria → aberrancia; sin P′, acoplamiento fijo y compensación completa → extrasístole ventricular.',
        ),
      ],
    },
  ],
  sources: [
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307',
    'Castellano et al. 2004',
  ],
};

export default lesson;
