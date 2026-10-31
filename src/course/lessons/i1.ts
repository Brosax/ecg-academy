/**
 * I1 — Measuring ST, UDMI thresholds by sex and age, contiguous leads and reciprocity (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `injury-st`, `reciprocal-changes`, `ischaemia-t` (current values), missing-book
 * bullets "STEMI — ST-elevation thresholds", "NSTE-ACS ischaemia — ST depression / T inversion thresholds",
 * "Acute chest pain ECG workflow".
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(dials ? { dials } : {}) },
});

const lesson: Lesson = {
  id: 'i1',
  stage: 'I',
  order: 1,
  title: l(
    'ST段测量、按性别与年龄的UDMI阈值、相邻导联与对应性改变',
    'Measuring ST, UDMI thresholds by sex and age, contiguous leads and reciprocity',
    'Medición del ST, umbrales de la definición universal por sexo y edad, derivaciones contiguas y cambios recíprocos',
  ),
  summary: l(
    '在J点、以PR段为基线测量ST偏移，取抬高最明显的导联，套用UDMI按性别和年龄的界值，并要求相邻2个导联为新出现。镜像性压低支持急性闭塞；水平型压低或T波倒置则属于NSTE-ACS一侧。',
    'Measure ST deviation at the J point against the PR segment, take the lead with the most elevation, and apply the UDMI sex- and age-specific thresholds, requiring the change to be new in 2 contiguous leads. Mirror-image depression supports acute occlusion; horizontal depression or T inversion belongs to the NSTE-ACS side.',
    'Mide la desviación del ST en el punto J respecto al segmento PR, toma la derivación con mayor elevación y aplica los umbrales de la definición universal (UDMI) según sexo y edad, exigiendo que el cambio sea nuevo en 2 derivaciones contiguas. El descenso en espejo apoya la oclusión aguda; el descenso horizontal o la T negativa pertenecen al lado del SCASEST.',
  ),
  objectives: [
    l(
      '以PR段（必要时TP段）为基线，在J点、在抬高最明显的导联测量ST偏移。',
      'Measure ST deviation at the J point, against the PR (or TP) segment, in the lead with the greatest elevation.',
      'Medir la desviación del ST en el punto J, respecto al segmento PR (o TP), en la derivación con mayor elevación.',
    ),
    l(
      '套用UDMI阈值：V2–V3按性别和年龄，其余导联≥1 mm，且必须是相邻2个导联新出现。',
      'Apply the UDMI thresholds: sex and age specific in V2–V3, ≥1 mm elsewhere, and new in at least 2 contiguous leads.',
      'Aplicar los umbrales de la UDMI: según sexo y edad en V2–V3, ≥1 mm en las demás derivaciones, y nuevos en al menos 2 derivaciones contiguas.',
    ),
    l(
      '用对应性（镜像）ST压低来支持急性闭塞而不是酷似STEMI的变异。',
      'Use reciprocal (mirror-image) ST depression as evidence for acute occlusion rather than a STEMI mimic.',
      'Usar el descenso recíproco (en espejo) del ST como prueba de oclusión aguda frente a un imitador del IAMCEST.',
    ),
    l(
      '说出NSTE-ACS的缺血阈值，以及胸痛时何时复查心电图。',
      'State the NSTE-ACS ischaemia thresholds and when to repeat the ECG in chest pain.',
      'Citar los umbrales de isquemia del SCASEST y cuándo repetir el ECG en el dolor torácico.',
    ),
  ],
  minutes: 16,
  competencies: ['C8', 'C4'],
  findings: ['stemi-anterior', 'reciprocal-changes', 'st-depression-ischemic'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-anterior', 801, { st: 0.3 }),
      question: l(
        '58岁男性，胸痛40分钟：这是STEMI吗？先测量，再回答。',
        'Man, 58, chest pain for 40 minutes: is this a STEMI? Measure before you answer.',
        'Varón de 58 años, dolor torácico de 40 minutos: ¿es un IAMCEST? Mide antes de responder.',
      ),
      reveal: l(
        '是。相邻的 **V2–V4** J点抬高约2–3 mm（V3最高）——58岁男性在V2–V3的界值是 **2 mm**——同时 **II、III、aVF** 出现镜像性ST压低：符合急性前壁闭塞的标准，直接走再灌注流程，不必等肌钙蛋白。判读是可以拆成步骤的：本课把这些步骤练成习惯。',
        'Yes. The J point is raised about 2–3 mm (most in V3) across the contiguous leads **V2–V4** — the limit in V2–V3 for a 58-year-old man is **2 mm** — and **II, III and aVF** show mirror-image ST depression: this meets the criteria for an acute anterior occlusion. Go straight to reperfusion; do not wait for troponin. The reading can be broken into steps, and this lesson drills them into a habit.',
        'Sí. El punto J está elevado unos 2–3 mm (máximo en V3) en las derivaciones contiguas **V2–V4** —el límite en V2–V3 para un varón de 58 años es **2 mm**— y **II, III y aVF** muestran un descenso del ST en espejo: cumple los criterios de una oclusión anterior aguda. Directo a reperfusión; no esperes la troponina. La lectura se puede descomponer en pasos, y esta lección los convierte en costumbre.',
      ),
    },
    {
      kind: 'text',
      title: l('测量纪律（回顾S6）', 'Measurement discipline (recap of S6)', 'Disciplina de medición (repaso de S6)'),
      body: l(
        '界值只有在测量方法正确时才有意义：\n- **基线**：PR段；PR段变形时用TP段。\n- **J点**：QRS陡峭斜坡转为ST段之处；UDMI阈值定在J点。\n- **导联**：在**抬高最明显**的导联里测量（其他导联只用来确认相邻关系）。\n- **单位**：mm（标准增益下1 mm = 0.1 mV）。机器和本应用还给出J+60读数，在J点难定时很有用。\n量出数字之后，还要过三关：性别年龄网格、相邻导联、新出现。',
        'Thresholds only mean something when the measurement is disciplined:\n- **Baseline**: the PR segment; the TP segment if the PR is distorted.\n- **J point**: where the steep QRS slope turns into the ST; the UDMI thresholds are set at J.\n- **Lead**: measure in the lead with the **greatest elevation** (the others only confirm contiguity).\n- **Units**: mm (1 mm = 0.1 mV at standard gain). Machines and this app also give a J+60 read-out, useful when J is hard to pin down.\nAfter the number come three gates: the sex/age grid, contiguity, and newness.',
        'Los umbrales solo significan algo si la medición es disciplinada:\n- **Línea de base**: el segmento PR; el segmento TP si el PR está alterado.\n- **Punto J**: donde la pendiente pronunciada del QRS se convierte en ST; los umbrales de la UDMI se fijan en J.\n- **Derivación**: mide en la derivación con **mayor elevación** (las demás solo confirman la contigüidad).\n- **Unidades**: mm (1 mm = 0,1 mV con ganancia estándar). Los equipos y esta aplicación dan también la lectura de J+60, útil cuando J es difícil de precisar.\nTras el número llegan tres filtros: la rejilla sexo/edad, la contigüidad y la novedad.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('stemi-anterior', 802, { st: 0.3 }),
      emphasize: ['lv-mid-anteroseptal', 'lv-mid-anterior', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'],
      caption: l(
        '播放一个心动周期。发亮的节段由左前降支供血，正对着 **V2–V4**——相邻导联之所以相邻，是因为它们看的是相邻的心肌。损伤电流是一个矢量：指向V2–V4，同时也必然背向 II、III、aVF，于是在那些导联里“倒映”为ST压低：这就是对应性改变。',
        'Play one beat. The lit segments are supplied by the left anterior descending artery and face **V2–V4** — contiguous leads are contiguous because they look at neighbouring myocardium. The injury current is one vector: it points towards V2–V4 and therefore points away from II, III and aVF, where it is "reflected" as ST depression: that is reciprocity.',
        'Reproduce un latido. Los segmentos iluminados dependen de la descendente anterior y miran hacia **V2–V4**: las derivaciones contiguas son contiguas porque ven miocardio vecino. La corriente de lesión es un vector: apunta hacia V2–V4 y, por tanto, se aleja de II, III y aVF, donde se "refleja" como descenso del ST: eso es el cambio recíproco.',
      ),
    },
    {
      kind: 'criteria',
      title: l(
        'UDMI阈值：抬高、压低与相邻导联',
        'UDMI thresholds: elevation, depression and contiguity',
        'Umbrales de la UDMI: elevación, descenso y contigüidad',
      ),
      items: [
        {
          label: l('ST抬高（V2–V3以外）', 'ST elevation (outside V2–V3)', 'Elevación del ST (fuera de V2–V3)'),
          value: l('≥ 1 mm', '≥ 1 mm', '≥ 1 mm'),
        },
        {
          label: l('ST抬高（V2–V3）', 'ST elevation (V2–V3)', 'Elevación del ST (V2–V3)'),
          value: l(
            '≥ 40岁男性 ≥ 2 mm；< 40岁男性 ≥ 2.5 mm；女性（任何年龄）≥ 1.5 mm',
            '≥ 2 mm in men ≥ 40 y; ≥ 2.5 mm in men < 40 y; ≥ 1.5 mm in women of any age',
            '≥ 2 mm en varones ≥ 40 años; ≥ 2,5 mm en varones < 40 años; ≥ 1,5 mm en mujeres de cualquier edad',
          ),
        },
        {
          label: l('诊断要求', 'Diagnostic requirement', 'Requisito diagnóstico'),
          value: l(
            '新出现，在J点测量，≥ 2个相邻导联；以PR/TP段为基线；与旧图比较',
            'New, measured at the J point, in ≥ 2 contiguous leads; PR/TP baseline; compare with prior ECGs',
            'Nuevo, medido en el punto J, en ≥ 2 derivaciones contiguas; línea de base PR/TP; comparar con ECG previos',
          ),
        },
        {
          label: l('相邻导联组', 'Contiguous groups', 'Grupos contiguos'),
          value: l(
            'I/aVL/V5–V6（侧壁）；II/III/aVF（下壁）；V1–V6（前壁）',
            'I/aVL/V5–V6 (lateral); II/III/aVF (inferior); V1–V6 (anterior)',
            'I/aVL/V5–V6 (lateral); II/III/aVF (inferior); V1–V6 (anterior)',
          ),
        },
        {
          label: l('NSTE-ACS缺血（ST压低/T波倒置）', 'NSTE-ACS ischaemia (ST depression / T inversion)', 'Isquemia del SCASEST (descenso del ST / T negativa)'),
          value: l(
            '新出现的水平型或下斜型压低 ≥ 0.5 mm，和/或T波倒置 > 1 mm（R波为主或R/S > 1），均在2个相邻导联',
            'New horizontal or downsloping depression ≥ 0.5 mm, and/or T inversion > 1 mm (with a prominent R or R/S > 1), in 2 contiguous leads',
            'Descenso nuevo, horizontal o descendente, ≥ 0,5 mm, y/o T negativa > 1 mm (con R dominante o R/S > 1), en 2 derivaciones contiguas',
          ),
        },
        {
          label: l('适用条件', 'Conditions', 'Condiciones'),
          value: l('无左心室肥厚或左束支阻滞（第I10课另有一套标准）', 'No LVH or LBBB (a separate rulebook applies — lesson I10)', 'Sin HVI ni bloqueo de rama izquierda (otro manual se aplica: lección I10)'),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    },
    {
      kind: 'worked',
      title: l('在V3测量并套用网格（58岁男性）', 'Measure in V3 and apply the grid (man, 58)', 'Medir en V3 y aplicar la rejilla (varón de 58 años)'),
      ecg: synth('stemi-anterior', 803, { st: 0.3 }),
      steps: [
        {
          title: l('找抬高最明显的导联', 'Find the lead with the most elevation', 'Busca la derivación con mayor elevación'),
          body: l(
            '扫过V1–V6再扫肢体导联：V1约1 mm，V2约3 mm，**V3最高**，V4约2 mm。就在V3测。',
            'Sweep V1–V6, then the limb leads: about 1 mm in V1, 3 mm in V2, highest in **V3**, about 2 mm in V4. Measure in V3.',
            'Recorre V1–V6 y luego las derivaciones de las extremidades: unos 1 mm en V1, 3 mm en V2, la máxima en **V3**, unos 2 mm en V4. Mide en V3.',
          ),
          marks: [{ auto: 'st', lead: 'V3' }],
          highlightLeads: ['V2', 'V3', 'V4'],
        },
        {
          title: l('基线与J点', 'Baseline and J point', 'Línea de base y punto J'),
          body: l(
            '把P波与QRS之间的平段向右延长作为零线；S波上升支突然变平处就是J点。',
            'Extend the flat stretch between P and QRS to the right as your zero line; the J point is where the upstroke of the S suddenly flattens.',
            'Prolonga hacia la derecha el tramo plano entre la P y el QRS como línea cero; el punto J es donde la rama ascendente de la S se aplana de golpe.',
          ),
          marks: [{ auto: 'pr-segment', lead: 'V3' }, { auto: 'j', lead: 'V3' }],
          highlightLeads: ['V3'],
        },
        {
          title: l('测量并套用性别年龄网格', 'Measure and apply the sex/age grid', 'Mide y aplica la rejilla sexo/edad'),
          body: l(
            'V3的J点约 **3 mm**（J+60读数约4 mm）。网格：58岁男性属于 ≥ 40岁组，V2–V3界值 **2 mm** —— 已超过。同一份图放在 < 40岁男性（2.5 mm）或任何年龄女性（1.5 mm）身上，也依然达标。',
            'The J point in V3 sits about **3 mm** above the baseline (J+60 read-out about 4 mm). The grid: a 58-year-old man falls in the ≥ 40 group, limit **2 mm** in V2–V3 — exceeded. The same tracing would still qualify for a man < 40 (2.5 mm) or a woman of any age (1.5 mm).',
            'El punto J en V3 está unos **3 mm** por encima de la línea de base (lectura de J+60 unos 4 mm). La rejilla: un varón de 58 años entra en el grupo ≥ 40 años, límite **2 mm** en V2–V3: superado. El mismo trazado también cumpliría en un varón < 40 años (2,5 mm) o en una mujer de cualquier edad (1,5 mm).',
          ),
          marks: [{ auto: 'j', lead: 'V3' }, { auto: 'st60', lead: 'V3' }],
          highlightLeads: ['V3'],
        },
        {
          title: l('相邻导联与对应导联', 'Contiguous and reciprocal leads', 'Derivaciones contiguas y recíprocas'),
          body: l(
            'V2（约3 mm）和V4（约2 mm，界值1 mm）与V3同属前壁相邻组：**新出现、≥ 2个相邻导联、超过界值**——前壁STEMI。再看对侧：III和aVF压低约1 mm，同一个损伤矢量的背面。对应性改变支持急性闭塞而不是变异。下一步不是肌钙蛋白，而是再灌注。',
            'V2 (about 3 mm) and V4 (about 2 mm; limit 1 mm) share the anterior contiguous group with V3: **new, ≥ 2 contiguous leads, above threshold** — an anterior STEMI. Now the opposite side: III and aVF are depressed by about 1 mm, the back of the same injury vector. Reciprocity argues for acute occlusion, not a variant. The next step is reperfusion, not troponin.',
            'V2 (unos 3 mm) y V4 (unos 2 mm; límite 1 mm) comparten con V3 el grupo contiguo anterior: **nuevo, ≥ 2 derivaciones contiguas, por encima del umbral**: IAMCEST anterior. Mira ahora el lado opuesto: III y aVF descienden unos 1 mm, el reverso del mismo vector de lesión. La reciprocidad apoya la oclusión aguda, no una variante. El siguiente paso es la reperfusión, no la troponina.',
          ),
          marks: [{ auto: 'st60', lead: 'V2' }, { auto: 'st60', lead: 'V4' }, { auto: 'st60', lead: 'III' }, { auto: 'st60', lead: 'aVF' }],
          highlightLeads: ['V2', 'V3', 'V4', 'III', 'aVF'],
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'stemi-anterior',
      seed: 804,
      dials: [{ id: 'st' }],
      marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
      caption: l(
        '上下调动损伤电流：V3的读数升降，III按比例反向移动——一个矢量，两种投影。注意两件事：抬高和压低永远成对出现；即使把读数调到刚过界值，要回答的问题也不变——多大、哪些相邻导联、有没有镜像、是不是新出现。',
        'Move the injury current up and down: the reading in V3 rises and falls while III moves the opposite way in proportion — one vector, two projections. Notice two things: elevation and depression always travel as a pair; and even with the reading just above the threshold, the questions do not change — how much, in which contiguous leads, is there a mirror, is it new.',
        'Sube y baja la corriente de lesión: la lectura en V3 asciende y desciende mientras III se mueve en sentido contrario y en proporción: un vector, dos proyecciones. Fíjate en dos cosas: la elevación y el descenso siempre van emparejados; y aunque la lectura quede justo por encima del umbral, las preguntas no cambian: cuánto, en qué derivaciones contiguas, hay imagen en espejo, es nuevo.',
      ),
    },
    {
      kind: 'contrast',
      title: l('胸前导联ST抬高：早期复极还是闭塞？', 'Precordial ST elevation: early repolarization or occlusion?', 'Elevación del ST precordial: ¿repolarización precoz u oclusión?'),
      left: {
        ecg: synth('early-repolarization', 805),
        caption: l('24岁男性，无不适', 'Man, 24, no symptoms', 'Varón de 24 años, asintomático'),
        marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
      },
      right: {
        ecg: synth('stemi-anterior', 806, { st: 0.3 }),
        caption: l('58岁男性，胸痛40分钟', 'Man, 58, chest pain for 40 min', 'Varón de 58 años, dolor torácico de 40 minutos'),
        marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
      },
      point: l(
        'A：ST段从**带切迹的J点**呈**凹面向上**抬起，分布广（V2–V6加下壁导联的J点顿挫），V3低于 < 40岁男性2.5 mm的界值，而且**没有对应性压低**（aVR除外）：早期复极（第S7课）。注意：II、aVF的J点约1.5 mm，单看毫米数已“达标”——这正是阈值不能单独使用的原因：无症状、凹面、J点切迹、无镜像、与旧图相比稳定，才让它归为变异。B：抬高集中在V2–V4这个相邻组、远超界值，III/aVF有镜像压低：按急性闭塞处理。毫米数只是起点——形态、分布、对应性、临床背景和系列心电图一起拍板（第I7、I11课）。',
        'A: **concave** ST rising from a **notched J point**, widespread (V2–V6 plus J slurring in the inferior leads), in V3 below the 2.5-mm limit for a man < 40, and **no reciprocal depression** (aVR apart): early repolarization (lesson S7). Note that II and aVF reach about 1.5 mm at J — on millimetres alone they "meet" the rule, which is exactly why the threshold is never used alone: no symptoms, concave shape, notched J, no mirror and stability against old tracings are what make it a variant. B: the elevation is confined to the contiguous group V2–V4, well above the threshold, with mirror depression in III/aVF: treat as acute occlusion. Millimetres are only the start — shape, distribution, reciprocity, context and serial tracings decide together (lessons I7 and I11).',
        'A: ST **cóncavo** que sube desde un **punto J con muesca**, de distribución amplia (V2–V6 más empastamiento del punto J en las derivaciones inferiores), en V3 por debajo del límite de 2,5 mm del varón < 40 años, y **sin descenso recíproco** (salvo aVR): repolarización precoz (lección S7). Ojo: II y aVF llegan a 1,5 mm en J; solo por milímetros «cumplen» la regla, y por eso el umbral nunca se usa aislado: la ausencia de síntomas, la forma cóncava, la muesca en J, la falta de espejo y la estabilidad frente a ECG previos son lo que la clasifica como variante. B: la elevación se limita al grupo contiguo V2–V4, muy por encima del umbral, con descenso especular en III/aVF: trátalo como oclusión aguda. Los milímetros son solo el punto de partida: deciden juntos la forma, la distribución, la reciprocidad, el contexto y los ECG seriados (lecciones I7 e I11).',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('st-depression-ischemic', 807),
      marks: [{ auto: 'st60', lead: 'V5' }, { auto: 'st60', lead: 'V6' }],
      caption: l(
        '67岁女性，胸痛：V4–V6水平型ST压低约1 mm——侧壁相邻组里 ≥ 2个导联 ≥ 0.5 mm，这是 **NSTE-ACS的缺血阈值**（下斜型同样算，上斜型不算）。T波倒置 > 1 mm伴R波为主是同一条界的另一半。要点：压低本身不定位于透壁梗死——它是心内膜下缺血，或者是某处抬高的镜像。孤立的下壁压低要想到侧壁闭塞，V1–V3的孤立压低要想到后壁（第I5、I6课）。',
        'Woman, 67, chest pain: horizontal ST depression of about 1 mm in V4–V6 — ≥ 0.5 mm in ≥ 2 leads of the lateral contiguous group: the **NSTE-ACS ischaemia threshold** (downsloping counts too; upsloping does not). T inversion > 1 mm with a prominent R is the other half of the same rule. The point: depression by itself does not localise a transmural infarct — it is subendocardial ischaemia, or the mirror of an elevation somewhere else. Isolated inferior depression suggests a lateral occlusion, and isolated V1–V3 depression a posterior one (lessons I5 and I6).',
        'Mujer de 67 años, dolor torácico: descenso horizontal del ST de unos 1 mm en V4–V6 — ≥ 0,5 mm en ≥ 2 derivaciones del grupo contiguo lateral: el **umbral de isquemia del SCASEST** (el descendente también cuenta; el ascendente, no). La T negativa > 1 mm con R dominante es la otra mitad de la misma regla. La idea clave: el descenso por sí solo no localiza un infarto transmural; es isquemia subendocárdica o el espejo de una elevación en otro lugar. Un descenso inferior aislado sugiere oclusión lateral, y un descenso aislado en V1–V3, oclusión posterior (lecciones I5 e I6).',
      ),
    },
    {
      kind: 'text',
      title: l('急性胸痛的心电图流程', 'The ECG workflow in acute chest pain', 'El flujo del ECG en el dolor torácico agudo'),
      body: l(
        '- 首次医疗接触后 **10分钟内**记录12导联心电图。\n- 图形不能确定而疼痛持续或怀疑仍高时，**每15–30分钟复查**，症状变化时随时复查。\n- **找旧图对比**：“新出现”是标准的一部分——基线就有的抬高不是新发。\n- 超急性T波可能早于ST抬高出现（第I7课）。\n- **正常心电图绝不排除ACS**：超过三分之一的NSTE-ACS入院时心电图正常。ECG决定去向，肌钙蛋白决定诊断，两者互不替代。',
        '- Record a 12-lead ECG within **10 minutes** of first medical contact.\n- If it is non-diagnostic and pain persists or suspicion stays high, **repeat every 15–30 minutes**, and with any change in symptoms.\n- **Fetch the old tracing**: "new" is part of the criterion — elevation already present on the baseline is not new.\n- Hyperacute T waves can precede ST elevation (lesson I7).\n- **A normal ECG never rules out ACS**: more than a third of NSTE-ACS present with a normal ECG. The ECG decides the pathway, troponin the diagnosis; neither replaces the other.',
        '- Registra un ECG de 12 derivaciones en los primeros **10 minutos** desde el contacto médico inicial.\n- Si no es concluyente y el dolor persiste o la sospecha sigue siendo alta, **repite cada 15–30 minutos**, y ante cualquier cambio de síntomas.\n- **Busca el ECG antiguo**: "nuevo" es parte del criterio; una elevación ya presente en la línea de base no es nueva.\n- Las ondas T hiperagudas pueden preceder a la elevación del ST (lección I7).\n- **Un ECG normal nunca excluye un SCA**: más de un tercio de los SCASEST se presentan con un ECG normal. El ECG decide el circuito, la troponina el diagnóstico; ninguno sustituye al otro.',
      ),
    },
    { kind: 'check', item: { family: 'max-st', seed: 12 } },
    { kind: 'check', item: { family: 'max-st', seed: 4 } },
    { kind: 'check', item: { family: 'occlusion', seed: 0 } },
    { kind: 'drill', families: ['max-st', 'territory'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [15865, 3599],
      caption: l(
        '两份真实的前壁梗死（PTB-XL标注“前壁心肌梗死”，指部位而非急性）：52岁男性和84岁女性。用同样的步骤测量：PR段基线、J点、抬高最明显的导联、V2–V3的性别年龄界值（他2 mm，她1.5 mm）、相邻导联、对侧镜像。他：V1–V3呈QS，J点抬高约1–1.5 mm（J+60更高），没有镜像——V2–V3未达2 mm；QS上方持续的抬高可能是陈旧梗死（第I9课），梗死时期在数据库中未知，只有旧图和临床才能判断是否“新出现”。她：V1–V2呈QS，ST不抬高，心率112次/分时侧壁ST压低——陈旧前壁梗死（数据库分期II–III），不是STEMI。先想好你的结论，再看标注。',
        'Two real anterior infarcts (the PTB-XL label "anterior MI" names the wall, not an acute event): a 52-year-old man and an 84-year-old woman. Run the same steps: PR baseline, J point, lead with the most elevation, the V2–V3 sex/age grid (2 mm for him, 1.5 mm for her), contiguity, mirror. Him: QS waves in V1–V3, about 1–1.5 mm at the J point (more at J+60) and no mirror — below his 2-mm limit in V2–V3; persistent elevation over QS waves can be an old infarct (lesson I9), the age is unknown in the database, and only the old tracing and the clinical picture can say whether it is new. Her: QS in V1–V2, no ST elevation, lateral ST depression at 112/min — an older anterior infarct (database stage II–III), not a STEMI. Commit to a conclusion, then look at the labels.',
        'Dos infartos anteriores reales (la etiqueta de PTB-XL «infarto anterior» nombra la pared, no un evento agudo): un varón de 52 años y una mujer de 84. Aplica los mismos pasos: línea de base PR, punto J, derivación de mayor elevación, la rejilla sexo/edad de V2–V3 (2 mm para él, 1,5 mm para ella), contigüidad, imagen en espejo. Él: QS en V1–V3, unos 1–1,5 mm en el punto J (más en J+60) y sin espejo: por debajo de su límite de 2 mm en V2–V3; una elevación persistente sobre ondas QS puede ser un infarto antiguo (lección I9), la antigüedad no consta en la base de datos y solo el ECG previo y la clínica dicen si es nueva. Ella: QS en V1–V2, sin elevación del ST, descenso del ST lateral a 112 lpm: un infarto anterior antiguo (estadio II–III de la base de datos), no un IAMCEST. Decide tu conclusión y después mira las etiquetas.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '在ST段中部或T波上升支测量，而不是在J点。',
          'Measuring mid-ST or on the T upstroke instead of at the J point.',
          'Medir en mitad del ST o en la rama ascendente de la T en lugar de en el punto J.',
        ),
        l(
          '把1 mm界值到处套用：V2–V3的界值更高，且取决于性别和年龄。',
          'Applying the 1-mm threshold everywhere: the V2–V3 limits are higher and depend on sex and age.',
          'Aplicar el umbral de 1 mm en todas partes: los límites de V2–V3 son más altos y dependen del sexo y la edad.',
        ),
        l(
          '凭单一导联、或不在同一相邻组里的导联诊断STEMI。',
          'Calling a STEMI from a single lead, or from leads outside one contiguous group.',
          'Diagnosticar un IAMCEST por una sola derivación o por derivaciones fuera de un mismo grupo contiguo.',
        ),
        l(
          '不找旧心电图对比：“新出现”是标准的一部分。',
          'Not hunting down the prior ECG: "new" is part of the criterion.',
          'No buscar el ECG previo para comparar: "nuevo" es parte del criterio.',
        ),
        l(
          '有左心室肥厚或左束支阻滞时照套这些阈值，忘了标准的前提条件（第I10课）。',
          'Applying these thresholds despite LVH or LBBB, forgetting the small print of the criteria (lesson I10).',
          'Aplicar estos umbrales pese a HVI o bloqueo de rama izquierda, olvidando la letra pequeña de los criterios (lección I10).',
        ),
        l(
          '心电图正常就排除ACS：超过三分之一的NSTE-ACS入院时心电图正常。',
          'Ruling out ACS because the ECG is normal: more than a third of NSTE-ACS present with a normal ECG.',
          'Excluir un SCA porque el ECG es normal: más de un tercio de los SCASEST se presentan con un ECG normal.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '以PR/TP段为基线、在J点、在抬高最明显的导联测量。',
          'Measure at the J point, against the PR/TP baseline, in the lead with the greatest elevation.',
          'Mide en el punto J, sobre la línea de base PR/TP, en la derivación con mayor elevación.',
        ),
        l(
          'STEMI = 新出现、相邻2个导联超过界值：其余导联≥1 mm；V2–V3男 ≥ 40岁≥2 mm、男 < 40岁≥2.5 mm、女性≥1.5 mm；前提是无LVH/LBBB。',
          'STEMI = new, above threshold in 2 contiguous leads: ≥1 mm elsewhere; in V2–V3 ≥2 mm (men ≥40), ≥2.5 mm (men <40), ≥1.5 mm (women); assuming no LVH/LBBB.',
          'IAMCEST = nuevo, por encima del umbral en 2 derivaciones contiguas: ≥1 mm en las demás; en V2–V3 ≥2 mm (varones ≥40), ≥2,5 mm (varones <40), ≥1,5 mm (mujeres); suponiendo ausencia de HVI/BRI.',
        ),
        l(
          '相邻导联组：I/aVL/V5–V6、II/III/aVF、V1–V6；对侧的镜像性压低支持急性闭塞而不是酷似图形。',
          'Contiguous groups: I/aVL/V5–V6, II/III/aVF, V1–V6; mirror depression on the opposite side supports acute occlusion over a mimic.',
          'Grupos contiguos: I/aVL/V5–V6, II/III/aVF, V1–V6; el descenso especular del lado opuesto apoya la oclusión aguda frente a un imitador.',
        ),
        l(
          'NSTE-ACS缺血：水平型或下斜型压低 ≥ 0.5 mm或T波倒置 > 1 mm（R波为主），2个相邻导联；正常心电图不排除ACS——10分钟内记录，必要时15–30分钟复查。',
          'NSTE-ACS ischaemia: horizontal or downsloping depression ≥0.5 mm or T inversion >1 mm (prominent R) in 2 contiguous leads; a normal ECG does not rule out ACS — record within 10 min, repeat every 15–30 min if needed.',
          'Isquemia del SCASEST: descenso horizontal o descendente ≥0,5 mm o T negativa >1 mm (con R dominante) en 2 derivaciones contiguas; un ECG normal no excluye el SCA: registra en 10 minutos y repite cada 15–30 si hace falta.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Wagner GS et al. AHA/ACCF/HRS Part VI: Acute ischemia/infarction. Circulation 2009;119:e262-e270',
    'Castellano et al. 2004',
  ],
};

export default lesson;
