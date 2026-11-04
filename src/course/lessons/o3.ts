/**
 * O3 — Digoxin effect vs digoxin toxicity (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `digitalis-effect` row + "Digoxin toxicity — Arrhythmias" missing-book
 * bullet (Lavonas 2023), `regularized-AF` bullet under supraventricular-arrhythmias.
 *
 * Tracings (checked against the model truth, tests/course/lessons-o.test.ts): `digoxin-effect` draws a shallow sagging
 * ST (≈ 0.5–1 mm in V4–V6, deepening from J to J+60) with a low T, PR ≈ 190 ms and a QTc ≈ 390 ms (short-normal, not
 * long). The toxicity rhythms are their own scenarios (one source each), "regularised AF" included; the catalogue has
 * no bidirectional VT, so it lives in the criteria.
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const real = (id: number): EcgSource => ({ kind: 'real', id });

/** AT with 2:1 block in a nauseated patient on digoxin: the textbook toxic pairing. */
const atBlockCheck: Item = {
  id: 'o3:at-with-block',
  family: 'metabolic',
  competency: 'C9',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '81 岁女性，长期服用地高辛治疗心力衰竭，近两天恶心、看东西发黄，肌酐升高。看 II 与 V1：心室率约 90 次/分。这是什么节律？最合适的下一步是什么？',
    'A woman of 81 on long-term digoxin for heart failure, nauseated for two days, seeing yellow, creatinine up. Look at II and V1: the ventricular rate is about 90/min. What is the rhythm, and what is the best next step?',
    'Mujer de 81 años con digoxina crónica por insuficiencia cardiaca, con náuseas desde hace dos días, visión amarillenta y creatinina elevada. Mira II y V1: la frecuencia ventricular es de unos 90 lpm. ¿Qué ritmo es y cuál es el mejor paso siguiente?',
  ),
  ecg: synth('atrial-tachycardia', 1449, undefined, 'block'),
  view: { layout: '3x4+1', highlightLeads: ['II', 'V1'] },
  explanation: l(
    '房性心动过速伴 2:1 房室传导：心房约 180 次/分，每两个 P′ 只有一个下传（第二个 P′ 落在 QRS 之间或 T 波里），心室约 90 次/分。在服用地高辛、伴肾功能恶化和消化道/视觉症状的患者身上，这是**洋地黄中毒**的教科书组合——自律性升高（房速）+ 传导降低（阻滞）同时出现。停地高辛，查血药浓度、血钾、血镁和肾功能，持续监护；出现危及生命的心律失常、严重高钾或终末器官损害时给地高辛特异性 Fab。不要电复律，也不要再加一种房室结阻滞药。',
    'Atrial tachycardia with 2:1 AV conduction: atria at about 180/min, only every second P′ conducted (the other sits between the QRS complexes or in the T), ventricles at about 90/min. In a patient on digoxin with worsening renal function and gastrointestinal or visual symptoms this is the textbook pairing of **digoxin toxicity** — increased automaticity (the tachycardia) and depressed conduction (the block) at the same time. Stop digoxin; check the level, potassium, magnesium and renal function; monitor; give digoxin-specific Fab for a life-threatening arrhythmia, severe hyperkalaemia or end-organ damage. Do not cardiovert and do not add another AV-nodal blocker.',
    'Taquicardia auricular con conducción AV 2:1: aurículas a unos 180 lpm, solo se conduce una de cada dos P′ (la otra queda entre los QRS o dentro de la T), ventrículos a unos 90 lpm. En una paciente con digoxina, función renal empeorada y síntomas digestivos o visuales es la pareja clásica de la **intoxicación digitálica**: automaticidad aumentada (la taquicardia) y conducción deprimida (el bloqueo) a la vez. Suspende la digoxina; pide digoxinemia, potasio, magnesio y función renal; monitoriza; administra Fab antidigoxina ante una arritmia que amenace la vida, hiperpotasemia grave o daño de órgano. No cardioviertas ni añadas otro frenador del nodo AV.',
  ),
  findings: ['atrial-tachycardia'],
  key: {
    options: [
      { id: 'at-block', label: l('房速伴 2:1 阻滞：考虑洋地黄中毒', 'Atrial tachycardia with 2:1 block: think digoxin toxicity', 'Taquicardia auricular con bloqueo 2:1: piensa en intoxicación digitálica') },
      { id: 'sinus', label: l('窦性心律：继续原剂量', 'Sinus rhythm: continue the same dose', 'Ritmo sinusal: mantener la misma dosis') },
      { id: 'flutter', label: l('房扑 2:1：同步电复律', 'Atrial flutter 2:1: synchronised cardioversion', 'Flutter auricular 2:1: cardioversión sincronizada') },
      { id: 'effect', label: l('单纯洋地黄效应：无需处理', 'Digoxin effect only: no action needed', 'Solo efecto digitálico: no hace falta actuar') },
    ],
    correct: 'at-block',
  },
};

/** Bigeminy in a patient on digoxin with hypokalaemia: connect the rhythm to the drug. */
const bigeminyCheck: Item = {
  id: 'o3:bigeminy-on-digoxin',
  family: 'metabolic',
  competency: 'C9',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '76 岁男性，房颤转复后一直服用地高辛和袢利尿剂，血钾 3.1 mmol/L。今天的节律条如图。哪种解读最合适？',
    'A man of 76 on digoxin and a loop diuretic since his AF was converted; potassium 3.1 mmol/L. Today’s strip is shown. Which reading fits best?',
    'Varón de 76 años con digoxina y un diurético de asa desde que se le revirtió la FA; potasio 3,1 mmol/l. Este es el registro de hoy. ¿Qué interpretación encaja mejor?',
  ),
  ecg: synth('ventricular-bigeminy', 1447),
  view: { layout: 'strip', lead: 'II' },
  explanation: l(
    '室性早搏二联律：每个窦性搏动后跟一个提前出现的宽 QRS。它是洋地黄中毒**最常见**的表现，而低钾正是最强的诱发因素之一（低钾让地高辛更容易与钠钾泵结合）。这不是“良性早搏”：查地高辛浓度、补钾补镁、评估肾功能，必要时停药；出现室速或血流动力学不稳时给 Fab。',
    'Ventricular bigeminy: every sinus beat is followed by a premature wide QRS. It is the **commonest** face of digoxin toxicity, and hypokalaemia is one of its strongest facilitators (low potassium lets digoxin bind the sodium–potassium pump more easily). Not "benign ectopy": check the digoxin level, replace potassium and magnesium, assess renal function, hold the drug if needed; VT or haemodynamic compromise calls for Fab.',
    'Bigeminismo ventricular: cada latido sinusal va seguido de un QRS ancho y prematuro. Es la cara **más frecuente** de la intoxicación digitálica, y la hipopotasemia es uno de sus principales factores favorecedores (con el potasio bajo la digoxina se une con más facilidad a la bomba de sodio-potasio). No son "extrasístoles benignas": pide digoxinemia, repón potasio y magnesio, valora la función renal y suspende el fármaco si hace falta; una TV o la inestabilidad hemodinámica exigen Fab.',
  ),
  findings: ['ventricular-bigeminy'],
  key: {
    options: [
      { id: 'toxic', label: l('室早二联律：可能为洋地黄中毒，低钾在推波助澜', 'Ventricular bigeminy: possible digoxin toxicity, fuelled by the low potassium', 'Bigeminismo ventricular: posible intoxicación digitálica, favorecida por el potasio bajo') },
      { id: 'benign', label: l('良性室早，无需处理', 'Benign ectopy, nothing to do', 'Extrasístoles benignas, no hay que hacer nada') },
      { id: 'af', label: l('房颤复发', 'AF has come back', 'Recidiva de la FA') },
      { id: 'block', label: l('二度房室传导阻滞', 'Second-degree AV block', 'Bloqueo AV de segundo grado') },
    ],
    correct: 'toxic',
  },
};

const lesson: Lesson = {
  id: 'o3',
  stage: 'O',
  order: 3,
  title: l('洋地黄效应与洋地黄中毒', 'Digoxin effect vs toxicity', 'Efecto digitálico frente a intoxicación digitálica'),
  summary: l(
    '洋地黄效应（ST 段“鱼钩样”下垂、T 波低平、QT 偏短、PR 稍长）说明药物在起作用，不是中毒；中毒是心律失常：室早二联律、房速伴阻滞、加速性交界性心律、“规整化”房颤、双向性室速、高度房室阻滞。',
    'Digoxin effect (a sagging, scooped ST, a low T, a short-normal QT, a slightly longer PR) shows the drug is working, not that the patient is toxic; toxicity shows as arrhythmias: ventricular bigeminy, atrial tachycardia with block, accelerated junctional rhythm, "regularised" AF, bidirectional VT and high-grade AV block.',
    'El efecto digitálico (ST en cuchara, T baja, QT corto o en el límite bajo, PR algo largo) indica que el fármaco actúa, no que el paciente esté intoxicado; la intoxicación se manifiesta como arritmias: bigeminismo ventricular, taquicardia auricular con bloqueo, ritmo de la unión acelerado, FA "regularizada", TV bidireccional y bloqueo AV avanzado.',
  ),
  objectives: [
    l('识别洋地黄效应的 ST–T 形态（下垂的鱼钩样压低、T 波低平、QT 偏短）及其分布。', 'Recognise the ST–T shape of digoxin effect (sagging, scooped depression, low T, short-normal QT) and where it shows.', 'Reconocer la morfología del ST-T del efecto digitálico (descenso en cuchara, T baja, QT corto o normal bajo) y dónde aparece.'),
    l('列举洋地黄中毒的典型心律失常，并在节律条上认出它们。', 'List the classic digoxin-toxicity arrhythmias and recognise them on a strip.', 'Enumerar las arritmias clásicas de la intoxicación digitálica y reconocerlas en un registro.'),
    l('解释服用地高辛的房颤患者出现缓慢而“绝对规则”心室率的意义。', 'Explain what a slow, perfectly regular ventricular rate means in a patient with AF on digoxin.', 'Explicar qué significa una frecuencia ventricular lenta y perfectamente regular en un paciente con FA y digoxina.'),
    l('说出中毒的诱发因素（低钾、低镁、高钙、肾衰竭、相互作用）与处理（停药、纠正电解质、地高辛特异性 Fab）。', 'Name the facilitators of toxicity (low K, low Mg, high Ca, renal failure, interactions) and the treatment (stop the drug, correct electrolytes, digoxin-specific Fab).', 'Citar los factores que favorecen la intoxicación (K y Mg bajos, Ca alto, insuficiencia renal, interacciones) y el tratamiento (suspender, corregir electrolitos, Fab antidigoxina).'),
  ],
  minutes: 18,
  competencies: ['C10', 'C9'],
  findings: ['digoxin-effect', 'ventricular-bigeminy', 'atrial-tachycardia', 'accelerated-junctional-rhythm', 'av-block-3', 'hyperkalemia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('digoxin-effect', 1441),
      view: { layout: '3x4+1', highlightLeads: ['V4', 'V5', 'V6'] },
      question: l(
        '79 岁男性，服用地高辛控制心室率，今天来复诊，没有不适。V4–V6 的 ST 段轻度下垂、T 波低平。这位患者洋地黄中毒了吗？想好你的判断和理由。',
        'A man of 79 taking digoxin for rate control, at a routine visit and feeling well. In V4–V6 the ST segment sags slightly and the T is low. Is this patient digoxin-toxic? Decide your answer and your reason.',
        'Varón de 79 años que toma digoxina para controlar la frecuencia, en una revisión y sin molestias. En V4–V6 el ST cae ligeramente en cuchara y la T es baja. ¿Está intoxicado? Decide tu conclusión y tu razón.',
      ),
      reveal: l(
        '不是。这是**洋地黄效应**：治疗浓度下的药物作用。ST 段呈下垂的“鱼钩样”压低，在 R 波高大的导联（这里是 V4–V6、I、II）最清楚，T 波低平，QT 偏短（这里 QTc 约 390 ms），PR 稍长（约 190 ms）。效应只说明“药在起作用”，与中毒无关；中毒要看**节律**，而这里是规整的窦性心律、没有异位搏动、没有阻滞。',
        'No. This is **digoxin effect** — the drug working at therapeutic levels. The ST sags in a scooped curve, clearest in the leads with tall R waves (here V4–V6, I and II), the T is low, the QT is on the short side (QTc about 390 ms here) and the PR slightly long (about 190 ms). Effect shows exposure to the drug, not toxicity; toxicity is read in the **rhythm**, and here the rhythm is regular sinus with no ectopy and no block.',
        'No. Es el **efecto digitálico**: el fármaco actuando a concentraciones terapéuticas. El ST cae en una curva en cuchara, más clara en las derivaciones con R altas (aquí V4–V6, I y II), la T es baja, el QT tiende a corto (aquí QTc de unos 390 ms) y el PR es algo largo (unos 190 ms). El efecto indica exposición al fármaco, no intoxicación; la intoxicación se lee en el **ritmo**, y aquí el ritmo es sinusal regular, sin extrasístoles ni bloqueos.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('digoxin-effect', 1442),
      showConduction: true,
      emphasize: ['av-node', 'his'],
      caption: l(
        '洋地黄作用于房室结（提高迷走张力、减慢传导）：这就是 PR 轻度延长和房颤时心室率下降的原因。中毒时“减慢传导”变成阻滞，而升高的自律性产生异位搏动——两件事一起出现。',
        'Digoxin acts on the AV node (vagal tone, slower conduction): that is the mild PR prolongation and the rate control in AF. In toxicity the "slower conduction" becomes block while the enhanced automaticity produces ectopic beats — both at once.',
        'La digoxina actúa sobre el nodo AV (tono vagal, conducción más lenta): de ahí el PR algo largo y el control de la frecuencia en la FA. En la intoxicación la "conducción más lenta" se convierte en bloqueo y la automaticidad aumentada genera extrasístoles: ambas a la vez.',
      ),
    },
    {
      kind: 'film',
      title: l('用药之前与之后', 'Before and on the drug', 'Antes y con el fármaco'),
      view: { layout: 'strip', lead: 'V5' },
      frames: [
        {
          label: l('用药前', 'Before', 'Antes'),
          ecg: synth('normal', 1443, { rate: 68 }),
          note: l('V5，68次/分：ST平直，T波直立。PR 160 ms，QT约390 ms。', 'V5 at 68/min: a level ST and an upright T. PR 160 ms, QT about 390 ms.', 'V5 a 68 lpm: ST horizontal y T positiva. PR de 160 ms, QT de unos 390 ms.'),
          marks: [{ auto: 'j' }, { auto: 'pr' }, { auto: 'qt' }],
        },
        {
          label: l('地高辛', 'Digoxin', 'Digoxina'),
          ecg: synth('digoxin-effect', 1443, { rate: 68 }),
          note: l('J点低约0.7 mm，J+60更低（约1 mm）：ST一路下垂，滑进低平的T波。QT缩到约350 ms，PR 190 ms。', 'J about 0.7 mm low, lower still at J+60 (about 1 mm): the ST keeps sagging into a low T. QT down to about 350 ms, PR 190 ms.', 'J unos 0,7 mm por debajo y más aún a J+60 (alrededor de 1 mm): el ST sigue cayendo hacia una T baja. QT baja a unos 350 ms, PR de 190 ms.'),
          marks: [{ auto: 'j' }, { auto: 'st60' }, { auto: 'pr' }, { auto: 'qt' }],
        },
      ],
      predict: {
        question: l('地高辛缩短平台期（ST）。QT会怎样？', 'Digoxin shortens the plateau (the ST). What happens to the QT?', 'La digoxina acorta la meseta (el ST). ¿Qué le pasa al QT?'),
        options: [l('变短', 'It shortens', 'Se acorta'), l('变长', 'It lengthens', 'Se alarga'), l('不变', 'It stays the same', 'No cambia')],
        answer: 0,
      },
      caption: l(
        'ST–T说明“在用药”，不说明中毒。缺血性压低多为水平或直线下斜，且常更深。',
        'The ST–T says "on the drug", not "toxic". Ischaemic depression is usually horizontal or straight-downsloping, and often deeper.',
        'El ST-T dice «toma el fármaco», no «intoxicado». El descenso isquémico suele ser horizontal o descendente rectilíneo, y a menudo más profundo.',
      ),
    },
    {
      kind: 'criteria',
      title: l('洋地黄：效应与中毒', 'Digoxin: effect and toxicity', 'Digoxina: efecto e intoxicación'),
      items: [
        {
          label: l('效应：ST–T', 'Effect: ST–T', 'Efecto: ST-T'),
          value: l('下垂的鱼钩样 ST 压低（R 波高的导联最清楚）；T 低平、双相或倒置', 'Sagging, scooped ST depression (clearest in tall-R leads); low, biphasic or inverted T', 'Descenso del ST en cuchara (más claro con R altas); T baja, bifásica o negativa'),
        },
        { label: l('效应：间期', 'Effect: intervals', 'Efecto: intervalos'), value: l('QT 缩短或处于正常低限；± U 波明显；PR 轻度延长', 'Short or short-normal QT; ± prominent U; mild PR prolongation', 'QT corto o en el límite bajo; ± U prominente; PR algo largo') },
        {
          label: l('中毒：自律性↑', 'Toxicity: ↑automaticity', 'Intoxicación: ↑automaticidad'),
          value: l('频发室早、室早二联律（最常见）、房速（常伴阻滞）、加速性交界性心律、双向性室速', 'Frequent PVCs, ventricular bigeminy (commonest), atrial tachycardia (often with block), accelerated junctional rhythm, bidirectional VT', 'EV frecuentes, bigeminismo ventricular (lo más común), taquicardia auricular (a menudo con bloqueo), ritmo de la unión acelerado, TV bidireccional'),
        },
        {
          label: l('中毒：传导↓', 'Toxicity: ↓conduction', 'Intoxicación: ↓conducción'),
          value: l('“规整化”房颤（完全性房室阻滞 + 交界性逸搏）、高度房室阻滞、严重窦缓或窦房阻滞', '"Regularised" AF (complete AV block + junctional escape), high-grade AV block, severe sinus bradycardia or SA block', 'FA "regularizada" (bloqueo AV completo + escape de la unión), bloqueo AV avanzado, bradicardia sinusal intensa o bloqueo sinoauricular'),
        },
        {
          label: l('诱发因素', 'Facilitators', 'Factores favorecedores'),
          value: l('低钾、低镁、高钙、肾衰竭、高龄、药物相互作用（胺碘酮、维拉帕米、大环内酯类等）', 'Hypokalaemia, hypomagnesaemia, hypercalcaemia, renal failure, old age, interactions (amiodarone, verapamil, macrolides and others)', 'Hipopotasemia, hipomagnesemia, hipercalcemia, insuficiencia renal, edad avanzada, interacciones (amiodarona, verapamilo, macrólidos y otros)'),
        },
        {
          label: l('处理', 'Management', 'Tratamiento'),
          value: l('停药、纠正电解质、监护；危及生命的心律失常、急性中毒时的高钾或终末器官损害：地高辛特异性 Fab', 'Stop the drug, correct electrolytes, monitor; life-threatening arrhythmia, hyperkalaemia in acute poisoning or end-organ damage: digoxin-specific Fab', 'Suspender, corregir electrolitos y monitorizar; arritmia grave, hiperpotasemia en la intoxicación aguda o daño de órgano: Fab antidigoxina'),
        },
      ],
      source: 'Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250; Lavonas EJ et al. AHA 2023 Focused Update on poisoning-related cardiac arrest and toxicity. Circulation 2023;148:e149-e186',
    },
    {
      kind: 'worked',
      title: l('一位真实患者：房颤 + 地高辛，心室率 45', 'A real patient: AF on digoxin, ventricular rate 45', 'Un paciente real: FA con digoxina, frecuencia ventricular de 45'),
      ecg: real(1065),
      view: { layout: '3x4+1', calipers: true },
      steps: [
        {
          title: l('节律：有没有 P 波？', 'Rhythm: are there P waves?', 'Ritmo: ¿hay ondas P?'),
          body: l(
            '看 II 导联节律条：没有可辨认的 P 波，搏动之间的基线平坦或只有轻微的不规则——结合不规则的 RR，这是**心房颤动**。心室率很慢：10 秒内只有 7–8 个 QRS，约 45 次/分。',
            'Look at the lead-II rhythm strip: no identifiable P waves, and the baseline between beats is flat or only faintly irregular — with an irregular RR, this is **atrial fibrillation**. The ventricular rate is slow: only 7–8 QRS complexes in 10 s, about 45/min.',
            'Mira el registro de ritmo de II: no hay ondas P identificables y la línea de base entre latidos es plana o apenas irregular; con un RR irregular, es una **fibrilación auricular**. La frecuencia ventricular es lenta: solo 7–8 QRS en 10 s, unos 45 lpm.',
          ),
          highlightLeads: ['II'],
        },
        {
          title: l('用分规走 RR：规则还是不规则？', 'March the RR with calipers: regular or not?', 'Recorre el RR con el compás: ¿regular o no?'),
          body: l(
            '这是本课最关键的一步。RR 从约 1.1 秒到约 1.5 秒不等——**仍然绝对不规则**：房颤仍在经房室结下传，只是被压得很慢。如果 RR 变得**完全相等**，就说明心房与心室已经脱节：完全性房室阻滞加交界性逸搏，即“规整化”房颤——那是中毒，不是“控制得好”。',
            'This is the step that matters most. The RR runs from about 1.1 s to about 1.5 s — **still irregularly irregular**: the AF is still conducting through the AV node, just very slowly. Had the RR become **exactly equal**, atria and ventricles would have parted company: complete AV block with a junctional escape — "regularised" AF, which is toxicity, not "good control".',
            'Es el paso clave de la lección. El RR va de unos 1,1 s a unos 1,5 s: **sigue siendo irregularmente irregular**; la FA sigue conduciendo por el nodo AV, solo que muy despacio. Si el RR se hubiera vuelto **exactamente igual**, aurículas y ventrículos se habrían separado: bloqueo AV completo con escape de la unión, la FA "regularizada", que es intoxicación, no "buen control".',
          ),
        },
        {
          title: l('ST–T：药物的“签名”', 'ST–T: the drug’s signature', 'ST-T: la firma del fármaco'),
          body: l(
            '看 I、II、V5–V6：ST 段从 J 点起向下弧形下垂，再上升进入低平的 T——典型的鱼钩样**洋地黄效应**。它在 R 波高的导联最明显，不按冠状动脉分区分布。',
            'Look at I, II and V5–V6: from the J point the ST curves downwards and then climbs into a low T — the classic scooped **digoxin effect**. It is clearest where the R waves are tall and does not follow a coronary territory.',
            'Mira I, II y V5–V6: desde el punto J el ST se curva hacia abajo y luego sube hacia una T baja: el típico **efecto digitálico** en cuchara. Es más claro donde las R son altas y no sigue un territorio coronario.',
          ),
          highlightLeads: ['I', 'II', 'V5', 'V6'],
        },
        {
          title: l('结论与下一步', 'Conclusion and next step', 'Conclusión y paso siguiente'),
          body: l(
            '报告：心房颤动，心室率缓慢（约 45 次/分）、RR 仍不规则；洋地黄效应。目前没有中毒的节律证据，但 45 次/分对一位服地高辛的老年患者偏慢：问症状（乏力、头晕、恶心、视物发黄），查地高辛浓度、血钾、血镁和肾功能，考虑减量。**每次复诊都用分规走一遍 RR**——“越来越规则”是最早的警报之一。',
            'Report: atrial fibrillation with a slow ventricular response (about 45/min), RR still irregular; digoxin effect. No rhythm evidence of toxicity yet, but 45/min is slow for an elderly patient on digoxin: ask about symptoms (fatigue, dizziness, nausea, yellow vision), check the digoxin level, potassium, magnesium and renal function, and consider a lower dose. **March the RR at every visit** — "getting more regular" is one of the earliest alarms.',
            'Informe: fibrilación auricular con respuesta ventricular lenta (unos 45 lpm), RR todavía irregular; efecto digitálico. Todavía no hay datos de intoxicación en el ritmo, pero 45 lpm es lento para un anciano con digoxina: pregunta por síntomas (astenia, mareo, náuseas, visión amarillenta), pide digoxinemia, potasio, magnesio y función renal, y valora reducir la dosis. **Recorre el RR en cada revisión**: "cada vez más regular" es una de las primeras alarmas.',
          ),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('鱼钩还是缺血性压低？', 'Scoop or ischaemic depression?', '¿Cuchara o descenso isquémico?'),
      view: { layout: 'strip', lead: 'V5' },
      left: {
        ecg: synth('digoxin-effect', 1444),
        caption: l('洋地黄效应（V5）：浅、下垂、滑进低平的 T', 'Digoxin effect (V5): shallow, sagging, sliding into a low T', 'Efecto digitálico (V5): poco profundo, en cuchara, desliza hacia una T baja'),
        marks: [{ auto: 'st', lead: 'V5' }],
      },
      right: {
        ecg: synth('st-depression-ischemic', 1445),
        caption: l('缺血性 ST 压低（V5）：约 1 mm、水平、T 波直立', 'Ischaemic ST depression (V5): about 1 mm, horizontal, upright T', 'Descenso isquémico del ST (V5): alrededor de 1 mm, horizontal, T positiva'),
        marks: [{ auto: 'st', lead: 'V5' }],
      },
      point: l(
        '两侧 V5 都“ST 压低”，但形态不同。左：压低很浅（不到 1 mm），从 J 点到 J+60 ms **继续往下垂**，再弧形滑进低平的 T——药物。右：J 点已低约 1 mm，ST 段**水平**直到 T 波，T 仍直立——先想缺血（i1、i9）。两侧的 QTc 都在正常范围，所以别指望单凭 QT 分开它们：靠形态、分布、用药史和症状，再对比旧图。',
        'Both V5 strips show "ST depression", but the shapes differ. Left: shallow (under 1 mm), **still sagging** from J to J+60 ms and curving into a low T — the drug. Right: the J point is already about 1 mm down and the ST runs **horizontally** to an upright T — think ischaemia first (i1, i9). Both QTc values are in the normal range here, so do not rely on the QT alone: shape, distribution, the drug history and the symptoms separate them — and compare with an old tracing.',
        'Ambas tiras de V5 muestran "descenso del ST", pero con formas distintas. Izquierda: poco profundo (menos de 1 mm), **sigue cayendo** de J a J+60 ms y se curva hacia una T baja: el fármaco. Derecha: el punto J ya está alrededor de 1 mm abajo y el ST va **horizontal** hasta una T positiva: piensa primero en isquemia (i1, i9). Aquí los dos QTc son normales, así que no confíes solo en el QT: la forma, la distribución, la medicación y los síntomas los separan, y compara con un ECG previo.',
      ),
    },
    {
      kind: 'film',
      title: l('中毒的面孔', 'The faces of toxicity', 'Las caras de la intoxicación'),
      view: { layout: 'strip', lead: 'II' },
      frames: [
        {
          label: l('二联律', 'Bigeminy', 'Bigeminismo'),
          ecg: synth('ventricular-bigeminy', 1451),
          note: l('每隔一跳就是一个提前出现的宽大室早：室早二联律，最常见的中毒节律（自律性↑）。', 'Every other beat is an early, wide PVC: ventricular bigeminy, the commonest toxic rhythm (↑automaticity).', 'Un latido sí y otro no es una EV precoz y ancha: bigeminismo ventricular, el ritmo tóxico más frecuente (↑automaticidad).'),
          marks: [{ auto: 'rr' }],
        },
        {
          label: l('房速伴阻滞', 'AT with block', 'TA con bloqueo'),
          ecg: synth('atrial-tachycardia', 1452, undefined, 'block'),
          note: l('P′约180次/分，QRS约90次/分：每隔一个P′就被阻滞，藏在T波的上升支里。快的心房，慢的心室。', 'P′ waves at about 180/min, QRS at about 90/min: every second P′ is blocked, hidden in the upslope of the T. Fast atria, slow ventricles.', 'P′ a unos 180 lpm y QRS a unos 90 lpm: cada segunda P′ se bloquea, escondida en la rama ascendente de la T. Aurículas rápidas, ventrículos lentos.'),
          marks: [{ auto: 'blocked-p' }],
        },
        {
          label: l('加速性交界性', 'Accelerated junctional', 'Unión acelerada'),
          ecg: synth('accelerated-junctional-rhythm', 1448),
          note: l('窄QRS，规则，约80次/分，前面没有P波：交界区加快了。房颤患者心室率突然变规则，常是它。', 'Narrow, regular QRS at about 80/min with no P in front: the junction has sped up. In AF it shows as a rate that suddenly turns regular.', 'QRS estrecho y regular a unos 80 lpm, sin P delante: la unión se ha acelerado. En la FA aparece como una frecuencia que de pronto se regulariza.'),
          marks: [{ auto: 'rr' }],
        },
        {
          label: l('完全性阻滞', 'Complete block', 'Bloqueo completo'),
          ecg: synth('av-block-3', 1450),
          note: l('P波按自己的节奏走；QRS窄而绝对规则，约45次/分，与P无关：完全性房室阻滞（传导↓）。', 'P waves march on their own; the QRS is narrow and perfectly regular at about 45/min, unrelated to them: complete AV block (↓conduction).', 'Las P van a su ritmo; el QRS es estrecho y perfectamente regular a unos 45 lpm, sin relación con ellas: bloqueo AV completo (↓conducción).'),
          marks: [{ auto: 'rr' }],
        },
        {
          label: l('“规整化”房颤', 'Regularised AF', 'FA regularizada'),
          ecg: synth('af-regularised', 1450),
          note: l('f波在基线上抖动，QRS却慢而绝对规则（约45次/分）：房颤加完全性阻滞。这不是“控制得好”。', 'f waves on the baseline, yet the QRS is slow and perfectly regular (about 45/min): AF with complete block. This is not “good control”.', 'Ondas f en la línea de base, pero el QRS es lento y perfectamente regular (unos 45 lpm): FA con bloqueo completo. Esto no es «buen control».'),
          marks: [{ auto: 'rr' }, { auto: 'f-waves' }],
        },
      ],
      predict: {
        question: l('中毒 = 自律性↑ + 传导↓。最常见的中毒节律室早二联律，体现的是哪一半？', 'Toxicity = ↑automaticity + ↓conduction. Bigeminy, the commonest toxic rhythm, shows which half?', 'Intoxicación = ↑automaticidad + ↓conducción. El bigeminismo, el ritmo tóxico más frecuente, ¿qué mitad muestra?'),
        options: [l('自律性升高', 'More automaticity', 'Más automaticidad'), l('传导减慢', 'Less conduction', 'Menos conducción'), l('都不是', 'Neither', 'Ninguna')],
        answer: 0,
      },
      caption: l(
        '中毒看节律。服地高辛时出现这些节律，先当中毒处理：停药、查电解质、监护。',
        'Toxicity is read in the rhythm. On digoxin, treat any of these as toxicity until proven otherwise: stop it, check electrolytes, monitor.',
        'La intoxicación se lee en el ritmo. Con digoxina, cualquiera de estos es intoxicación mientras no se demuestre lo contrario: suspende, revisa electrolitos, monitoriza.',
      ),
    },
    { kind: 'check', item: { family: 'metabolic', seed: 26 } },
    { kind: 'check', item: { inline: atBlockCheck } },
    { kind: 'check', item: { inline: bigeminyCheck } },
    { kind: 'check', item: { family: 'metabolic', seed: 41 } },
    { kind: 'drill', families: ['metabolic', 'brady'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [15985, 7525, 19926],
      caption: l(
        '三份真实的洋地黄效应心电图（两份为房颤、一份为窦性心动过速）。逐份读：ST 形态和分布、QT 方向、节律——房颤的 RR 是否仍不规则？有没有异位搏动或阻滞？先判定“效应”还是“可能中毒”，再揭晓标注。',
        'Three real tracings labelled digitalis effect (two in AF, one in sinus tachycardia). Read each: ST shape and distribution, QT direction, rhythm — is the RR in AF still irregular? Any ectopy or block? Decide "effect" or "possible toxicity", then reveal the labels.',
        'Tres ECG reales etiquetados como efecto digitálico (dos en FA y uno en taquicardia sinusal). Lee cada uno: forma y distribución del ST, dirección del QT y ritmo: ¿sigue siendo irregular el RR de la FA? ¿Hay extrasístoles o bloqueos? Decide "efecto" o "posible intoxicación" y después mira las etiquetas.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('把效应当中毒处理：稳定的患者被停药甚至用解毒剂。', 'Treating effect as toxicity: a stable patient has the drug stopped or receives the antidote.', 'Tratar el efecto como intoxicación: a un paciente estable se le retira el fármaco o se le da el antídoto.'),
        l('“规整化”房颤写成“心室率控制良好”——不走 RR 就看不出来。', 'Writing "regularised" AF down as "well-controlled rate" — you only see it if you march the RR.', 'Anotar la FA "regularizada" como "frecuencia bien controlada": solo se ve si recorres el RR.'),
        l('服地高辛患者的室早二联律不联系中毒可能。', 'Failing to connect ventricular bigeminy with digoxin in a patient on the drug.', 'No relacionar el bigeminismo ventricular con la digoxina en quien la toma.'),
        l('房速伴 2:1 阻滞误读为窦速或房扑，然后电复律或再加一种房室结阻滞药。', 'Atrial tachycardia with 2:1 block misread as sinus tachycardia or flutter, then cardioverted or given another AV-nodal blocker.', 'Confundir la taquicardia auricular con bloqueo 2:1 con una taquicardia sinusal o un flutter y cardiovertirla o añadir otro frenador del nodo AV.'),
        l('只查地高辛浓度，不查钾、镁和肾功能；或在服药后不到 6 小时采血。', 'Checking the digoxin level but not potassium, magnesium and renal function — or drawing it less than 6 hours after a dose.', 'Pedir solo la digoxinemia y no el potasio, el magnesio ni la función renal, o extraerla antes de 6 horas tras la dosis.'),
        l('把浅而下垂的洋地黄 ST 报告为“缺血性 ST 压低”，或反过来用“他在吃地高辛”解释一份真正的缺血。', 'Reporting digoxin’s shallow sagging ST as "ischaemic ST depression" — or, the other way round, using "he is on digoxin" to explain away real ischaemia.', 'Informar el ST en cuchara de la digoxina como "descenso isquémico", o al revés, usar "toma digoxina" para justificar una isquemia real.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('鱼钩样下垂的 ST + T 低平 + QT 偏短 = 洋地黄效应，说明在用药，不说明中毒。', 'Sagging scooped ST + low T + short-normal QT = digoxin effect: it proves exposure, not toxicity.', 'ST en cuchara + T baja + QT corto o normal bajo = efecto digitálico: demuestra exposición, no intoxicación.'),
        l('中毒看节律：自律性↑ + 传导↓——室早二联律、房速伴阻滞、加速性交界性心律、双向性室速、高度阻滞。', 'Toxicity is read in the rhythm: ↑automaticity + ↓conduction — bigeminy, AT with block, accelerated junctional rhythm, bidirectional VT, high-grade block.', 'La intoxicación se lee en el ritmo: ↑automaticidad + ↓conducción: bigeminismo, TA con bloqueo, ritmo de la unión acelerado, TV bidireccional, bloqueo avanzado.'),
        l('房颤变慢且绝对规则 = 完全性房室阻滞 + 逸搏，不是“控制良好”：每次都用分规走 RR。', 'AF that turns slow and perfectly regular = complete AV block + escape, not "good control": march the RR every time.', 'FA lenta y perfectamente regular = bloqueo AV completo + escape, no "buen control": recorre el RR siempre.'),
        l('低钾、低镁、高钙、肾衰竭和相互作用药物放大中毒；危及生命时用地高辛特异性 Fab。', 'Low K, low Mg, high Ca, renal failure and interacting drugs amplify toxicity; life-threatening cases get digoxin-specific Fab.', 'K y Mg bajos, Ca alto, insuficiencia renal y fármacos que interaccionan amplifican la intoxicación; si amenaza la vida, Fab antidigoxina.'),
        l('效应会模仿缺血：形态（下垂 vs 水平）、分布、用药史和症状把两者分开。', 'Effect mimics ischaemia: shape (sagging vs horizontal), distribution, drug history and symptoms separate them.', 'El efecto imita a la isquemia: la forma (en cuchara frente a horizontal), la distribución, la medicación y los síntomas los separan.'),
      ],
    },
  ],
  sources: [
    'Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    'Lavonas EJ et al. AHA 2023 Focused Update on poisoning-related cardiac arrest and toxicity. Circulation 2023;148:e149-e186',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
