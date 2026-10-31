/**
 * O3 — Digoxin effect vs digoxin toxicity (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `digitalis-effect` row + "Digoxin toxicity — Arrhythmias" missing-book
 * bullet (Lavonas 2023), `regularized-AF` bullet under supraventricular-arrhythmias.
 *
 * Tracings (checked against the model truth, tests/course/lessons-o.test.ts): `digoxin-effect` draws a shallow sagging
 * ST (≈ 0.5–1 mm in V4–V6, deepening from J to J+60) with a low T, PR ≈ 190 ms and a QTc ≈ 390 ms (short-normal, not
 * long). The toxicity rhythms are their own scenarios (one source each); the catalogue has no bidirectional VT and no
 * AF with complete AV block ("regularised AF"), so both are taught in text and on the real case 1065 (slow AF on digoxin).
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
      kind: 'text',
      title: l('地高辛对心电图做了什么', 'What digoxin does to the ECG', 'Qué le hace la digoxina al ECG'),
      body: l(
        '地高辛抑制心肌细胞的钠钾泵，细胞内钙增多（正性肌力），同时：\n- **心室复极提前、平台期缩短**：ST 段从 J 点起就向下“垂”成一条弧线，T 波变低，QT 偏短——这就是“鱼钩样”的效应；\n- **迷走张力升高、房室结传导变慢**：PR 稍长，房颤时心室率下降——这是治疗作用；\n- **剂量过高时**，细胞内钙超载引起延迟后除极（自律性升高），而房室结被压得更狠（传导降低）——两件事同时出现，就是中毒节律的来源。\n所以读洋地黄心电图分两层：**ST–T 告诉你“在用药”，节律告诉你“是否中毒”。**',
        'Digoxin blocks the sodium–potassium pump of the myocyte, so intracellular calcium rises (the inotropic effect), and at the same time:\n- **ventricular repolarisation starts earlier and the plateau shortens**: from the J point the ST sags down in a curve, the T gets lower and the QT shorter — the "scooped" effect;\n- **vagal tone rises and AV-nodal conduction slows**: a slightly longer PR, and a slower ventricular rate in AF — the therapeutic action;\n- **at excess dose** calcium overload triggers delayed afterdepolarisations (more automaticity) while the AV node is pushed even harder (less conduction) — both at once, and that is where every toxic rhythm comes from.\nSo read a digoxin ECG in two layers: **the ST–T tells you "on the drug"; the rhythm tells you "toxic or not".**',
        'La digoxina bloquea la bomba de sodio-potasio del miocito, de modo que sube el calcio intracelular (el efecto inotrópico) y, a la vez:\n- **la repolarización ventricular empieza antes y la meseta se acorta**: desde el punto J el ST cae en curva, la T baja y el QT se acorta; es el efecto "en cuchara";\n- **aumenta el tono vagal y se enlentece la conducción por el nodo AV**: PR algo más largo y menor frecuencia ventricular en la FA; es la acción terapéutica;\n- **con dosis excesivas**, la sobrecarga de calcio desencadena pospotenciales tardíos (más automaticidad) mientras el nodo AV se frena todavía más (menos conducción): las dos cosas a la vez, y de ahí sale cada ritmo tóxico.\nAsí que lee un ECG con digoxina en dos capas: **el ST-T te dice "toma el fármaco"; el ritmo te dice "intoxicado o no".**',
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
      kind: 'ecg',
      ecg: synth('digoxin-effect', 1443),
      view: { layout: 'strip', lead: 'V5' },
      marks: [
        { auto: 'j', lead: 'V5' },
        { auto: 'st60', lead: 'V5' },
        { auto: 'qt', lead: 'V5' },
      ],
      caption: l(
        '放大看 V5：J 点只低约 0.5 mm，到 J+60 ms 更低（约 0.7 mm）——ST 段是**一路往下垂**的弧线，再“滑”进一个低平的 T 波，像反向的对勾。压低很浅，QT 不长（QTc 约 390 ms）。缺血性压低的形态正相反：多为水平或直线下斜、常更深。',
        'Zoom in on V5: the J point sits only about 0.5 mm low and the ST is lower still at J+60 ms (about 0.7 mm) — the segment **keeps sagging** in a curve and slides into a low T, like a reversed tick. The depression is shallow and the QT is not long (QTc about 390 ms). Ischaemic depression looks the other way round: usually horizontal or straight-downsloping, and often deeper.',
        'Amplía V5: el punto J está solo unos 0,5 mm por debajo y el ST cae todavía más a J+60 ms (unos 0,7 mm): el segmento **sigue cayendo** en curva y se desliza hacia una T baja, como un signo de verificación invertido. El descenso es poco profundo y el QT no es largo (QTc de unos 390 ms). El descenso isquémico es al revés: habitualmente horizontal o descendente rectilíneo, y a menudo más profundo.',
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
      kind: 'text',
      title: l('中毒的面孔', 'The faces of toxicity', 'Las caras de la intoxicación'),
      body: l(
        '中毒 = 自律性↑ + 传导↓。要认识的面孔：\n- **频发室早或室早二联律**（最常见）；\n- **房速伴房室阻滞**（教科书组合：快的心房、慢的心室）；\n- **加速性交界性心律**（房颤患者身上表现为心室率突然变规则）；\n- **“规整化”房颤**：房颤变得慢而绝对规则 = 完全性房室阻滞 + 交界性逸搏——绝不是“心室率控制得很好”；\n- **双向性室速**：QRS 电轴逐搏左右交替，几乎只见于洋地黄中毒（或罕见的遗传性离子通道病）；\n- **高度房室阻滞、严重窦缓或窦房阻滞**。\n急性大剂量中毒还会出现**高钾血症**（钠钾泵被抑制），它是预后不良的标志，也是使用 Fab 的指征之一。慢性中毒多发生在肾功能恶化、低钾或加用相互作用药物的老年人身上；血药浓度要在末次服药至少 6 小时后采血才可解读。',
        'Toxicity = ↑automaticity + ↓conduction. Learn its faces:\n- **frequent PVCs or ventricular bigeminy** (the commonest);\n- **atrial tachycardia with AV block** (the textbook pairing: fast atria, slow ventricles);\n- **accelerated junctional rhythm** (in a patient with AF it shows as a ventricular rate that suddenly turns regular);\n- **"regularised" AF**: AF becomes slow and perfectly regular = complete AV block + junctional escape — never "well controlled";\n- **bidirectional VT**: the QRS axis alternates beat to beat, almost only seen in digoxin toxicity (or rare inherited channelopathies);\n- **high-grade AV block, severe sinus bradycardia or SA block**.\nAcute large overdoses also cause **hyperkalaemia** (the pump is blocked) — a marker of a poor outcome and one of the indications for Fab. Chronic toxicity typically affects older patients whose renal function worsens, whose potassium falls or who start an interacting drug; a digoxin level is interpretable only when drawn at least 6 hours after the last dose.',
        'Intoxicación = ↑automaticidad + ↓conducción. Aprende sus caras:\n- **EV frecuentes o bigeminismo ventricular** (lo más común);\n- **taquicardia auricular con bloqueo AV** (la pareja clásica: aurículas rápidas, ventrículos lentos);\n- **ritmo de la unión acelerado** (en un paciente con FA aparece como una frecuencia ventricular que de pronto se vuelve regular);\n- **FA "regularizada"**: la FA se vuelve lenta y perfectamente regular = bloqueo AV completo + escape de la unión; nunca es "bien controlada";\n- **TV bidireccional**: el eje del QRS alterna latido a latido; casi exclusiva de la intoxicación digitálica (o de canalopatías hereditarias raras);\n- **bloqueo AV avanzado, bradicardia sinusal intensa o bloqueo sinoauricular**.\nLas sobredosis agudas importantes causan además **hiperpotasemia** (la bomba está bloqueada), marcador de mal pronóstico y una de las indicaciones del Fab. La intoxicación crónica afecta sobre todo a ancianos cuya función renal empeora, cuyo potasio baja o que empiezan un fármaco que interacciona; la digoxinemia solo es interpretable si se extrae al menos 6 horas después de la última dosis.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('atrial-tachycardia', 1449, undefined, 'block'),
      view: { layout: 'strip', lead: 'II' },
      marks: [{ auto: 'blocked-p', lead: 'II' }],
      caption: l(
        '房速伴 2:1 房室传导（II）：心房约 180 次/分，标记的是没有下传的 P′；心室约 90 次/分。服地高辛的患者出现这个图形，先想中毒——快的心房（自律性↑）配慢的心室（传导↓）。别把它读成窦速：每个 QRS 之间藏着第二个 P′——这里它骑在 T 波末端。',
        'Atrial tachycardia with 2:1 AV conduction (II): atria at about 180/min, the marks show the non-conducted P′ waves; ventricles at about 90/min. In a patient on digoxin this picture means toxicity until proven otherwise — fast atria (↑automaticity) with slow ventricles (↓conduction). Do not read it as sinus tachycardia: a second P′ hides between every pair of QRS complexes — here it rides on the end of the T.',
        'Taquicardia auricular con conducción AV 2:1 (II): aurículas a unos 180 lpm, las marcas señalan las P′ no conducidas; ventrículos a unos 90 lpm. En un paciente con digoxina, esta imagen es intoxicación mientras no se demuestre lo contrario: aurículas rápidas (↑automaticidad) con ventrículos lentos (↓conducción). No la leas como taquicardia sinusal: entre cada par de QRS se esconde una segunda P′; aquí cabalga sobre el final de la T.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('accelerated-junctional-rhythm', 1448),
      view: { layout: 'strip', lead: 'II' },
      marks: [{ auto: 'rr', lead: 'II' }],
      caption: l(
        '加速性交界性心律（II）：窄 QRS、规则、约 80 次/分，QRS 前没有窦性 P 波，逆行 P′ 跟在 QRS 之后。交界区的自律性被“点燃”了。服地高辛的房颤患者，心室率突然变得**规则**，常常就是这个节律（或完全性阻滞加逸搏）在接管。',
        'Accelerated junctional rhythm (II): narrow, regular QRS at about 80/min, no sinus P before the QRS, a retrograde P′ just after it. The junction’s automaticity has been switched on. In an AF patient on digoxin, a ventricular rate that suddenly turns **regular** is often this rhythm (or complete block with an escape) taking over.',
        'Ritmo de la unión acelerado (II): QRS estrecho y regular a unos 80 lpm, sin P sinusal delante y con una P′ retrógrada justo detrás. La automaticidad de la unión se ha encendido. En un paciente con FA y digoxina, una frecuencia ventricular que de pronto se vuelve **regular** suele ser este ritmo (o un bloqueo completo con escape) tomando el mando.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('av-block-3', 1450),
      view: { layout: 'strip', lead: 'II' },
      marks: [{ auto: 'rr', lead: 'II' }],
      caption: l(
        '完全性房室阻滞伴交界性逸搏（II）：P 波按自己的频率走，QRS 窄而绝对规则、约 45 次/分，两者无关。现在把心房换成房颤：f 波 + 绝对规则的慢 QRS——这就是“规整化”房颤。地高辛患者出现它，是中毒，需要停药、查电解质并监护。',
        'Complete AV block with a junctional escape (II): the P waves march at their own rate, the QRS is narrow and perfectly regular at about 45/min, and the two are unrelated. Now replace the atria with AF: f waves plus a slow, perfectly regular QRS — that is "regularised" AF. In a patient on digoxin it means toxicity: stop the drug, check the electrolytes, monitor.',
        'Bloqueo AV completo con escape de la unión (II): las P van a su propia frecuencia, el QRS es estrecho y perfectamente regular a unos 45 lpm, y no hay relación entre ambos. Ahora cambia las aurículas por una FA: ondas f más un QRS lento y perfectamente regular; eso es la FA "regularizada". En un paciente con digoxina significa intoxicación: suspende el fármaco, revisa los electrolitos y monitoriza.',
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
