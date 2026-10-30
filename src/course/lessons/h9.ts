/**
 * h9 — The athlete's ECG (international criteria) (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md "Athlete's ECG — Normal vs abnormal findings" (the 2017 international
 * three-bin list), "Athlete's ECG — chamber-enlargement criteria", "Athlete's ECG — bradyarrhythmia /
 * AV-conduction thresholds" (rate <30, PR >=400 ms, Mobitz), "Conduction findings in athletes"
 * (bundle-branch-fascicular-blocks) and the `pr-limits-age-rate` row (athlete PR up to 399 ms = training
 * effect) — current values throughout. Real block: HVOLT 1626 and SBRAD 14918, read with the athlete grid,
 * which applies to trained patients.
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const GRID = { layout: '3x4+1' } as const;
const STRIP_II = { layout: 'strip', lead: 'II' } as const;

const lesson: Lesson = {
  id: 'h9',
  stage: 'H',
  order: 9,
  title: l('运动员心电图（国际标准）', 'The athlete\'s ECG (international criteria)', 'El ECG del deportista (criterios internacionales)'),
  summary: l(
    '2017 国际标准把运动员心电图的发现分为三档：训练相关（不需要检查）、边界（≥2 项才检查）与异常（需要评估）。孤立的电压标准、不完全性右束支阻滞、早期复极和 ≥30 次/分的窦性心动过缓都是训练生理；侧壁 T 波倒置或 ST 压低才是真正的疾病信号。',
    'The 2017 international criteria sort athlete ECG findings into three bins: training-related (no work-up), borderline (work-up only when two or more combine) and abnormal (needs evaluation). Isolated voltage criteria, incomplete RBBB, early repolarisation and sinus bradycardia down to 30/min are training physiology; lateral T-wave inversion or ST depression is the true disease signal.',
    'Los criterios internacionales de 2017 clasifican los hallazgos del ECG del deportista en tres grupos: relacionados con el entrenamiento (sin estudios), límites (estudio solo si se combinan dos o más) y anormales (requieren evaluación). Los criterios de voltaje aislados, el bloqueo incompleto de rama derecha, la repolarización precoz y la bradicardia sinusal hasta 30 lpm son fisiología del entrenamiento; la inversión de la onda T lateral o el descenso del ST son la verdadera señal de enfermedad.',
  ),
  objectives: [
    l(
      '用 2017 国际标准把运动员心电图的每一个发现分入三档：训练相关、边界（≥2 项）与异常。',
      'Sort every finding on an athlete ECG into the three bins of the 2017 international criteria: training-related, borderline (two or more) and abnormal.',
      'Clasificar cada hallazgo del ECG de un deportista en los tres grupos de los criterios internacionales de 2017: relacionado con el entrenamiento, límite (dos o más) y anormal.',
    ),
    l(
      '认出全部训练相关发现：窦性心动过缓 ≥30 次/分、窦性心律不齐、逸搏心律、一度房室传导阻滞（PR <400 ms）、运动后消失的 Mobitz I、不完全性右束支阻滞、孤立的电压标准、早期复极、<16 岁幼年型 T 波与黑人运动员 V1–V4 变异。',
      'Recognise the whole training-related group: sinus bradycardia >=30/min, sinus arrhythmia, escape rhythms, first-degree AV block (PR <400 ms), Mobitz I that resolves with exercise, incomplete RBBB, isolated voltage criteria, early repolarisation, juvenile T under 16 y and the Black-athlete V1-V4 variant.',
      'Reconocer todo el grupo relacionado con el entrenamiento: bradicardia sinusal >=30 lpm, arritmia sinusal, ritmos de escape, bloqueo AV de primer grado (PR <400 ms), Mobitz I que desaparece con el ejercicio, bloqueo incompleto de rama derecha, criterios de voltaje aislados, repolarización precoz, patrón T juvenil <16 años y la variante V1-V4 del deportista de raza negra.',
    ),
    l(
      '应用边界档规则：电轴左偏/右偏、左/右心房异常或完全性右束支阻滞单发不检查，≥2 项需要评估。',
      'Apply the borderline rule: left or right axis deviation, LA/RA abnormality or complete RBBB alone need no work-up; two or more warrant evaluation.',
      'Aplicar la regla del grupo límite: la desviación izquierda o derecha del eje, la anomalía auricular izquierda o derecha o el bloqueo completo de rama derecha aislados no exigen estudio; dos o más sí lo justifican.',
    ),
    l(
      '列出需要评估的异常发现——尤其是 ≥2 个相邻导联（aVR、III、V1 除外）T 波倒置 ≥1 mm 与 ST 压低 ≥0.5 mm——并知道下一步做什么。',
      'List the abnormal findings that need evaluation — above all T inversion >=1 mm in >=2 contiguous leads outside aVR, III and V1, and ST depression >=0.5 mm — and know what to do next.',
      'Enumerar los hallazgos anormales que requieren evaluación —sobre todo la inversión de T >=1 mm en >=2 derivaciones contiguas fuera de aVR, III y V1, y el descenso del ST >=0,5 mm— y saber qué hacer a continuación.',
    ),
  ],
  minutes: 15,
  competencies: ['C10', 'C12'],
  findings: ['athlete-changes', 'irbbb', 'early-repolarization', 'sinus-bradycardia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('athlete', 1361, { rate: 46 }),
      view: GRID,
      question: l(
        '22 岁竞技游泳运动员，赛前常规筛查。心率 46 次/分，胸导联电压达到肥厚标准，II 和 V5 的 QRS 终末带着 J 波切迹，V1 呈 rSr′。这些发现里，**哪些**需要心脏科医生？先逐项分档，再揭晓。',
        'A 22-year-old competitive swimmer, routine pre-season screening. Rate 46/min, precordial voltage meeting hypertrophy criteria, a notched J wave at the end of the QRS in II and V5, and an rSr′ in V1. Which of these findings needs a **cardiologist**? Sort each one before the reveal.',
        'Un nadador competitivo de 22 años, cribado habitual antes de la temporada. Frecuencia 46 lpm, voltaje precordial que cumple criterios de hipertrofia, una onda J con muesca al final del QRS en II y V5, y un rSr′ en V1. ¿Cuál de estos hallazgos necesita un **cardiólogo**? Clasifícalos uno a uno antes de ver la solución.',
      ),
      reveal: l(
        '一个都不需要。窦性心动过缓 46（≥30）、**孤立的** QRS 电压标准、V1 的 rSr′（不完全性右束支阻滞，QRS 不宽）、QRS 末端的 J 波切迹（伴约 1 mm 的 ST 抬高：早期复极）——2017 国际标准把这四项全部放进**训练相关**档：生理性适应，不需要任何检查。本课要学会的，恰恰是把这条轨迹与那条**需要**心脏科医生的轨迹区分开。',
        'None of them. Sinus bradycardia at 46 (>=30), **isolated** QRS voltage criteria, the rSr′ in V1 (incomplete RBBB, QRS not wide) and the notched J waves at the end of the QRS (with about 1 mm of ST elevation: early repolarisation) — the 2017 international criteria place all four in the **training-related** bin: physiological adaptation, no work-up of any kind. What this lesson teaches is exactly how to tell this tracing from the one that **does** need a cardiologist.',
        'Ninguno. Bradicardia sinusal a 46 (>=30), criterios de voltaje **aislados**, la rSr′ en V1 (bloqueo incompleto de rama derecha, QRS no ancho) y las ondas J con muesca al final del QRS (con alrededor de 1 mm de elevación del ST: repolarización precoz): los criterios internacionales de 2017 colocan los cuatro en el grupo **relacionado con el entrenamiento**: adaptación fisiológica, sin ningún estudio. Lo que enseña esta lección es precisamente distinguir esta tira de la que **sí** necesita un cardiólogo.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('athlete', 1362, { rate: 44 }),
      showConduction: true,
      emphasize: ['sa-node', 'av-node', 'rv-mid', 'lv-mid-anterolateral', 'lv-mid-inferolateral'],
      caption: l(
        '训练重塑的是整个心脏，而不只是心电图。播放一个心动周期：增厚的心室壁（左心室更甚）把 QRS 电压推高——**孤立的电压标准**由此而来；高迷走张力让窦房结放慢（窦性心动过缓、窦性心律不齐）、让房室结迟疑（一度房室传导阻滞、文氏现象），运动时迷走张力一撤退，它们随之消失。电极之下全是生理。',
        'Training remodels the whole heart, not just the ECG. Play one beat: thicker ventricular walls (the LV above all) push the QRS voltage up — that is where **isolated voltage criteria** come from; high vagal tone slows the sinus node (sinus bradycardia, sinus arrhythmia) and holds the AV node back (first-degree block, Wenckebach), and all of it vanishes as vagal tone withdraws with exercise. Under the electrodes, this is all physiology.',
        'El entrenamiento remodela todo el corazón, no solo el ECG. Reproduce un latido: unas paredes ventriculares más gruesas (sobre todo el VI) elevan el voltaje del QRS — de ahí los **criterios de voltaje aislados** —; el tono vagal alto frena el nodo sinusal (bradicardia y arritmia sinusal) y retarda el nodo AV (bloqueo de primer grado, Wenckebach), y todo desaparece cuando el tono vagal se retira con el ejercicio. Bajo los electrodos, esto es fisiología.',
      ),
    },
    {
      kind: 'text',
      title: l('三个桶：国际标准怎么分档', 'Three bins: how the international criteria sort', 'Tres grupos: cómo clasifican los criterios internacionales'),
      body: l(
        '2017 国际标准（Sharma/Drezner）把运动员心电图的**每一个**发现分进三个桶，每档的行动不同：\n- **训练相关（正常）**——生理适应，不需要任何检查：窦性心动过缓 ≥30 次/分、窦性心律不齐、房性或交界性逸搏心律、一度房室传导阻滞（PR <400 ms）、运动后消失的 Mobitz I、不完全性右束支阻滞、**孤立的** QRS 电压标准（左心室或右心室肥厚）、早期复极/ST 段抬高、<16 岁的幼年型 T 波（V1–V3 倒置）、黑人运动员 V1–V4 的 J 点抬高 + 凸面向上 ST + T 波倒置。\n- **边界**——单项不定性，**≥2 项**才需要检查：电轴左偏（−30° 至 −90°）、电轴右偏（>120°）、左/右心房异常、完全性右束支阻滞。\n- **异常**——提示基础心脏病，需要评估：≥2 个相邻导联（aVR、III、V1 除外）T 波倒置 ≥1 mm、ST 段压低 ≥0.5 mm、病理性 Q 波、完全性左束支阻滞、QRS ≥140 ms、ε 波、预激、QTc ≥470 ms（男）/≥480 ms（女）、Brugada 1 型、心率 <30 次/分、PR ≥400 ms、Mobitz II 或三度房室传导阻滞、每份图 ≥2 个室性期前收缩、房性快速性心律失常。\n注意：这套分档只适用于**经过训练的人**；同一份图放在久坐患者身上要按常规标准重新读。',
        'The 2017 international criteria (Sharma/Drezner) sort **every** finding on an athlete ECG into one of three bins, each with its own action:\n- **Training-related (normal)** — physiological adaptation, no work-up at all: sinus bradycardia >=30/min, sinus arrhythmia, ectopic atrial or junctional escape rhythm, first-degree AV block (PR <400 ms), Mobitz I that resolves with exercise, incomplete RBBB, **isolated** QRS voltage criteria for LVH or RVH, early repolarisation/ST elevation, juvenile T inversion in V1-V3 under 16 y, and the Black-athlete V1-V4 pattern of J-point elevation with convex ST and T inversion.\n- **Borderline** — neutral alone, work-up only when **two or more** combine: left axis deviation (-30° to -90°), right axis deviation (>120°), LA or RA abnormality, complete RBBB.\n- **Abnormal** — suggests underlying heart disease and needs evaluation: T inversion >=1 mm in >=2 contiguous leads outside aVR, III and V1; ST depression >=0.5 mm; pathological Q waves; complete LBBB; QRS >=140 ms; epsilon waves; pre-excitation; QTc >=470 ms (men) / >=480 ms (women); Brugada type 1; rate <30/min; PR >=400 ms; Mobitz II or third-degree AV block; >=2 PVCs per tracing; atrial tachyarrhythmias.\nNote: this grid applies to **trained people**; the same tracing in a sedentary patient is read by ordinary criteria.',
        'Los criterios internacionales de 2017 (Sharma/Drezner) clasifican **cada** hallazgo del ECG de un deportista en uno de tres grupos, cada uno con su acción:\n- **Relacionado con el entrenamiento (normal)**: adaptación fisiológica, sin ningún estudio: bradicardia sinusal >=30 lpm, arritmia sinusal, ritmo de escape auricular o de la unión, bloqueo AV de primer grado (PR <400 ms), Mobitz I que desaparece con el ejercicio, bloqueo incompleto de rama derecha, criterios de voltaje **aislados** de HVI o HVD, repolarización precoz/elevación del ST, inversión T juvenil en V1-V3 antes de los 16 años y el patrón V1-V4 del deportista de raza negra con elevación del punto J, ST convexo e inversión de la T.\n- **Límite**: neutro por sí solo, estudio solo si se combinan **dos o más**: desviación izquierda del eje (-30° a -90°), desviación derecha (>120°), anomalía auricular izquierda o derecha, bloqueo completo de rama derecha.\n- **Anormal**: sugiere cardiopatía y requiere evaluación: inversión de T >=1 mm en >=2 derivaciones contiguas fuera de aVR, III y V1; descenso del ST >=0,5 mm; ondas Q patológicas; bloqueo completo de rama izquierda; QRS >=140 ms; ondas épsilon; preexcitación; QTc >=470 ms (varones) / >=480 ms (mujeres); Brugada tipo 1; frecuencia <30 lpm; PR >=400 ms; Mobitz II o bloqueo AV de tercer grado; >=2 extrasístoles ventriculares por registro; taquiarritmias auriculares.\nOjo: esta clasificación solo se aplica a **personas entrenadas**; la misma tira en un paciente sedentario se lee con los criterios ordinarios.',
      ),
    },
    {
      kind: 'criteria',
      title: l('运动员心电图分档卡（2017 国际标准）', 'Athlete ECG sorting card (2017 international criteria)', 'Tarjeta de clasificación del ECG del deportista (criterios internacionales de 2017)'),
      items: [
        {
          label: l('训练相关（正常）', 'Training-related (normal)', 'Relacionado con el entrenamiento (normal)'),
          value: l(
            '窦性心动过缓 ≥30 次/分；窦性心律不齐；房性/交界性逸搏心律；一度房室传导阻滞（PR <400 ms）；运动后消失的 Mobitz I；不完全性右束支阻滞；孤立的 QRS 电压标准（LVH/RVH）；早期复极/ST 抬高；幼年型 T 波 V1–V3（<16 岁）；黑人运动员 V1–V4（J 点抬高 + 凸面 ST + T 倒置）——零检查',
            'Sinus bradycardia >=30/min; sinus arrhythmia; ectopic atrial/junctional escape rhythm; first-degree AV block (PR <400 ms); Mobitz I resolving with exercise; incomplete RBBB; isolated QRS voltage criteria (LVH/RVH); early repolarisation/ST elevation; juvenile T V1-V3 (<16 y); Black athletes V1-V4 (J-point elevation + convex ST + T inversion) — no work-up',
            'Bradicardia sinusal >=30 lpm; arritmia sinusal; ritmo de escape auricular/de la unión; bloqueo AV de primer grado (PR <400 ms); Mobitz I que cede con el ejercicio; bloqueo incompleto de rama derecha; criterios de voltaje aislados (HVI/HVD); repolarización precoz/elevación del ST; T juvenil en V1-V3 (<16 años); deportistas de raza negra V1-V4 (elevación del punto J + ST convexo + T negativa): sin estudio',
          ),
        },
        {
          label: l('边界（≥2 项才检查）', 'Borderline (work-up if two or more)', 'Límite (estudio si hay dos o más)'),
          value: l(
            '电轴左偏（−30° 至 −90°）；电轴右偏（>120°）；左心房异常；右心房异常；完全性右束支阻滞',
            'Left axis deviation (-30° to -90°); right axis deviation (>120°); LA abnormality; RA abnormality; complete RBBB',
            'Desviación izquierda del eje (-30° a -90°); desviación derecha (>120°); anomalía auricular izquierda; anomalía auricular derecha; bloqueo completo de rama derecha',
          ),
        },
        {
          label: l('异常：复极与 QRS', 'Abnormal: repolarisation and QRS', 'Anormal: repolarización y QRS'),
          value: l(
            'T 波倒置 ≥1 mm，≥2 个相邻导联（aVR、III、V1 除外，变异型除外）；ST 压低 ≥0.5 mm；病理性 Q 波；完全性左束支阻滞；QRS ≥140 ms；ε 波；预激；Brugada 1 型',
            'T inversion >=1 mm in >=2 contiguous leads (outside aVR, III, V1; variants excepted); ST depression >=0.5 mm; pathological Q; complete LBBB; QRS >=140 ms; epsilon wave; pre-excitation; Brugada type 1',
            'Inversión de T >=1 mm en >=2 derivaciones contiguas (fuera de aVR, III, V1; variantes exceptuadas); descenso del ST >=0,5 mm; onda Q patológica; bloqueo completo de rama izquierda; QRS >=140 ms; onda épsilon; preexcitación; Brugada tipo 1',
          ),
        },
        {
          label: l('异常：节律与间期', 'Abnormal: rhythm and intervals', 'Anormal: ritmo e intervalos'),
          value: l(
            '心率 <30 次/分（或停搏 ≥3 s）；PR ≥400 ms（儿童/青少年 ≥300 ms）；Mobitz II、高度或三度房室传导阻滞；QTc ≥470 ms（男）/≥480 ms（女）；每份图 ≥2 个室性期前收缩；房性快速性心律失常',
            'Rate <30/min (or pauses >=3 s); PR >=400 ms (>=300 ms in children/adolescents); Mobitz II, high-grade or third-degree AV block; QTc >=470 ms (men) / >=480 ms (women); >=2 PVCs per tracing; atrial tachyarrhythmias',
            'Frecuencia <30 lpm (o pausas >=3 s); PR >=400 ms (>=300 ms en niños/adolescentes); Mobitz II, bloqueo AV avanzado o de tercer grado; QTc >=470 ms (varones) / >=480 ms (mujeres); >=2 extrasístoles ventriculares por registro; taquiarritmias auriculares',
          ),
        },
        {
          label: l('适用范围', 'Who the grid applies to', 'A quién se aplica'),
          value: l(
            '只用于经过训练的运动员；同一份图在久坐患者中按常规标准读',
            'Trained athletes only; the same tracing in a sedentary patient is read by ordinary criteria',
            'Solo a deportistas entrenados; la misma tira en un paciente sedentario se lee con los criterios ordinarios',
          ),
        },
      ],
      source:
        'Sharma S, Drezner JA et al. International Recommendations for Electrocardiographic Interpretation in Athletes. JACC 2017;69:1057-1075; Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    },
    {
      kind: 'worked',
      title: l('逐行过卡：这份运动员心电图', 'Walking the grid: this athlete ECG', 'Recorriendo la clasificación: este ECG de deportista'),
      ecg: synth('athlete', 1363, { rate: 46 }),
      view: GRID,
      steps: [
        {
          title: l('心率与节律', 'Rate and rhythm', 'Frecuencia y ritmo'),
          body: l(
            'II 导联数 R 波、量 RR：约 46 次/分，每个 QRS 前都有直立的窦性 P 波。46 ≥ 30——**训练相关**。若 PP 平滑变化 >120 ms，那是窦性心律不齐，同一档。',
            'Count the R waves and measure the RR in II: about 46/min, an upright sinus P before every QRS. 46 is >=30 — **training-related**. If the PP varies smoothly by >120 ms, that is sinus arrhythmia, same bin.',
            'Cuenta las ondas R y mide el RR en II: unos 46 lpm, con una P sinusal positiva antes de cada QRS. 46 es >=30: **relacionado con el entrenamiento**. Si el PP varía de forma gradual >120 ms, es arritmia sinusal, mismo grupo.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('PR 间期', 'The PR interval', 'El intervalo PR'),
          body: l(
            '量 PR：约 160 ms。<200 ms 属正常；200–399 ms（一度房室传导阻滞）在运动员仍是训练相关——迷走张力使然；越过异常线要等 PR ≥400 ms。',
            'Measure the PR: about 160 ms. Under 200 ms is normal; 200-399 ms (first-degree AV block) is still training-related in an athlete — vagal tone; the abnormal line is not crossed until PR >=400 ms.',
            'Mide el PR: unos 160 ms. Por debajo de 200 ms es normal; 200-399 ms (bloqueo AV de primer grado) sigue siendo relacionado con el entrenamiento en un deportista — tono vagal —; la línea anormal no se cruza hasta un PR >=400 ms.',
          ),
          marks: [{ auto: 'pr', lead: 'II' }],
        },
        {
          title: l('QRS：宽度、电轴、V1', 'QRS: width, axis, V1', 'QRS: anchura, eje, V1'),
          body: l(
            'QRS 约 115 ms（<120 ms）、电轴正常（约 +5°）。V1 呈 rSr′——不完全性右束支阻滞，训练相关；QRS ≥140 ms 或完全性左束支阻滞才会掉进异常桶。',
            'QRS about 115 ms (<120 ms) with a normal axis (about +5°). V1 shows an rSr′ — incomplete RBBB, training-related; a QRS >=140 ms or a complete LBBB would drop into the abnormal bin.',
            'QRS de unos 115 ms (<120 ms) con eje normal (unos +5°). V1 muestra un rSr′: bloqueo incompleto de rama derecha, relacionado con el entrenamiento; un QRS >=140 ms o un bloqueo completo de rama izquierda caería en el grupo anormal.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }],
          view: { layout: 'strip', lead: 'V1' },
        },
        {
          title: l('电压：孤立地看', 'Voltage: isolated', 'Voltaje: aislado'),
          body: l(
            'V5 的 R（约 26 mm）加 V1 的 S（约 11 mm）约 37 mm，达到 Sokolow-Lyon 标准——只要**没有** T 波倒置、ST 压低或病理性 Q 波跟在后面，孤立的电压标准属于训练相关档，不需要超声心动图。',
            'The R in V5 (about 26 mm) plus the S in V1 (about 11 mm) make about 37 mm and meet Sokolow-Lyon — as long as **no** T inversion, ST depression or pathological Q wave follows it, isolated voltage criteria sit in the training-related bin and earn no echocardiogram.',
            'La R de V5 (unos 26 mm) más la S de V1 (unos 11 mm) suman unos 37 mm y cumplen Sokolow-Lyon: mientras **no** las siga una inversión de T, un descenso del ST u ondas Q patológicas, los criterios de voltaje aislados pertenecen al grupo relacionado con el entrenamiento y no justifican un ecocardiograma.',
          ),
          marks: [{ auto: 'r', lead: 'V5' }, { auto: 's', lead: 'V1' }],
          highlightLeads: ['V1', 'V5'],
          view: { layout: 'strip', lead: 'V5' },
        },
        {
          title: l('复极：判决在这里', 'Repolarisation: the verdict lives here', 'Repolarización: aquí está el veredicto'),
          body: l(
            'V5 的 QRS 末端有一个 J 波切迹，其后 ST 约抬高 1 mm、没有压低，T 波直立——早期复极，训练相关。T 波只在 V1（总是除外）和 V2（约 1.5 mm，单个导联）倒置，V3–V6 全部直立：没有"≥2 个相邻导联"。同一导联若出现 T 波倒置 ≥1 mm 并连续 ≥2 个导联（aVR、III、V1 除外），或 ST 压低 ≥0.5 mm：**异常档**，运动员身上首先想到肥厚型心肌病。',
            'A J-wave notch at the end of the QRS in V5, then an ST about 1 mm above the baseline with no depression, and an upright T — early repolarisation, training-related. The T is inverted only in V1 (always excluded) and V2 (about 1.5 mm, a single lead), and upright in V3–V6: no "≥2 contiguous leads". The same lead with T inversion >=1 mm across >=2 contiguous leads (aVR, III, V1 excluded), or ST depression >=0.5 mm: **abnormal bin**, and in an athlete hypertrophic cardiomyopathy comes first.',
            'Una muesca de onda J al final del QRS en V5, después un ST alrededor de 1 mm por encima de la línea de base sin descenso y una T positiva: repolarización precoz, relacionada con el entrenamiento. La T solo está invertida en V1 (siempre excluida) y en V2 (unos 1,5 mm, una sola derivación) y es positiva en V3-V6: no hay «≥2 derivaciones contiguas». La misma derivación con inversión de T >=1 mm en >=2 derivaciones contiguas (aVR, III, V1 excluidas) o descenso del ST >=0,5 mm: **grupo anormal**, y en un deportista la miocardiopatía hipertrófica es lo primero.',
          ),
          marks: [{ auto: 'j', lead: 'V5' }, { auto: 't', lead: 'V5' }],
          view: { layout: 'strip', lead: 'V5' },
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'athlete',
      seed: 1365,
      dials: [{ id: 'rate', label: l('心率', 'Heart rate', 'Frecuencia cardíaca') }],
      view: STRIP_II,
      marks: [{ auto: 'p' }, { auto: 'rr' }],
      caption: l(
        '把滑杆从 58 拉到 40：P 波与 QRS 的关系不变，只有 PP 在拉长。训练能把窦房结带去的地方离异常线还很远——那条线在 <30 次/分。心动过缓本身不产生症状；有症状才需要评估，起搏决定从来不由数字单独作出。',
        'Slide the rate from 58 down to 40: the P-to-QRS relationship never changes, only the PP lengthens. Training takes the sinus node nowhere near the abnormal line — that sits below 30/min. Bradycardia by itself produces no symptoms; evaluation follows symptoms, and a pacing decision is never made from a number alone.',
        'Desliza la frecuencia de 58 a 40: la relación P-QRS no cambia, solo se alarga el PP. El entrenamiento lleva al nodo sinusal muy lejos de la línea anormal, que está por debajo de 30 lpm. La bradicardia por sí sola no da síntomas; la evaluación sigue a los síntomas, y la decisión de marcapasos nunca se toma solo con un número.',
      ),
    },
    {
      kind: 'contrast',
      title: l('同一电压，两种 T 波', 'Same voltage, two different T waves', 'Mismo voltaje, dos ondas T distintas'),
      view: GRID,
      left: {
        ecg: synth('athlete', 1366, { rate: 48 }),
        caption: l(
          '运动员心脏：电压达标 + 下侧壁 QRS 末端 J 波切迹、ST 不压低、T 波直立——训练相关档',
          'Athlete heart: voltage criteria + inferolateral J-wave notches at the end of the QRS, no ST depression, upright T — training-related bin',
          'Corazón de deportista: criterios de voltaje + muescas de onda J inferolaterales al final del QRS, sin descenso del ST, T positiva: grupo relacionado con el entrenamiento',
        ),
        marks: [{ auto: 'j', lead: 'V5' }, { auto: 't', lead: 'V5' }],
      },
      right: {
        ecg: synth('hcm', 1367, { rate: 66 }, 'repolarization'),
        caption: l(
          '肥厚型心肌病：电压达标 + 侧壁 ST 压低、T 波倒置——异常档',
          'HCM: voltage criteria + lateral ST depression with T inversion — abnormal bin',
          'MCH: criterios de voltaje + descenso del ST lateral con T negativa: grupo anormal',
        ),
        marks: [{ auto: 'st', lead: 'V5' }, { auto: 't', lead: 'V5' }],
      },
      point: l(
        '两侧的电压可以一模一样——电压本身从不决定档位，决定档位的是 **T 波和 ST**：A 的 QRS 末端带 J 波切迹，ST 轻度抬高而不压低，以直立的 T 收尾；B 的侧壁 T 波倒置 ≥1 mm、ST 压低 ≥0.5 mm——在运动员身上，这就是需要心脏科的那条线，首先想肥厚型心肌病（其后是 ARVC、扩张型心肌病、心肌炎）。',
        'The voltage on the two sides can be identical — voltage alone never decides the bin; the **T wave and ST** do. Side A ends its QRS with a J-wave notch, keeps the ST slightly elevated (never depressed) and finishes with an upright T; side B shows lateral T inversion >=1 mm and ST depression >=0.5 mm — in an athlete that is the line that needs cardiology, with hypertrophic cardiomyopathy first (then ARVC, dilated cardiomyopathy, myocarditis).',
        'El voltaje de ambos lados puede ser idéntico: el voltaje por sí solo nunca decide el grupo; lo deciden **la onda T y el ST**. El lado A termina el QRS con una muesca de onda J, mantiene el ST algo elevado (nunca descendido) y acaba en una T positiva; el lado B muestra inversión de T lateral >=1 mm y descenso del ST >=0,5 mm — en un deportista esa es la línea que exige cardiología, con la miocardiopatía hipertrófica en primer lugar (después MAVD, miocardiopatía dilatada, miocarditis).',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('athlete', 1364, undefined, 'first-degree'),
      view: STRIP_II,
      marks: [{ auto: 'pr', lead: 'II' }],
      caption: l(
        '同一颗运动员心脏，PR 约 220 ms：一度房室传导阻滞。200–399 ms 全程都在训练相关档（迷走张力作用于房室结）；越线的是 PR ≥400 ms，以及 Mobitz II 和三度阻滞。儿童与青少年的线更低：≥300 ms。白天的 Mobitz I 若运动中不消失，同样需要评估。',
        'The same athlete heart with a PR of about 220 ms: first-degree AV block. The whole 200-399 ms range stays in the training-related bin (vagal tone at the AV node); the line is crossed at PR >=400 ms, and by Mobitz II and third-degree block. In children and adolescents the line is lower: >=300 ms. A daytime Mobitz I that fails to disappear with exercise also needs evaluation.',
        'El mismo corazón de deportista con un PR de unos 220 ms: bloqueo AV de primer grado. Todo el rango de 200-399 ms permanece en el grupo relacionado con el entrenamiento (tono vagal sobre el nodo AV); la línea se cruza con un PR >=400 ms, y con el Mobitz II y el bloqueo de tercer grado. En niños y adolescentes la línea es más baja: >=300 ms. Un Mobitz I diurno que no desaparece con el ejercicio también requiere evaluación.',
      ),
    },
    {
      kind: 'text',
      title: l('在异常线上方：合法的 T 波倒置', 'Above the abnormal line: legitimate T inversion', 'Por encima de la línea anormal: inversiones de T legítimas'),
      body: l(
        'T 波倒置是运动员心电图里最贵的一个发现——在把它叫异常之前，先过三个例外：\n- **幼年型 T 波**：<16 岁运动员 V1–V3 的 T 波倒置是正常延续（见 s7）。\n- **黑人运动员变异**：V1–V4 的 J 点抬高 + 凸面向上 ST + 继之 T 波倒置——被接受的正常变异，不是缺血。\n- **仅 V3 的双向 T 波**（先正后负）也被接受。\n例外之外、aVR/III/V1 之外，≥2 个相邻导联 T 波倒置 ≥1 mm 就是异常，要做超声心动图并进一步评估。\n另一处易混的边界：**孤立的短 PR**（无 δ 波）在无症状运动员不是预激，不需检查；预激 = PR <120 ms + δ 波 + QRS 增宽，属于异常档。',
        'T inversion is the most expensive finding on an athlete ECG — before labelling it abnormal, pass it through three exceptions:\n- **Juvenile T pattern**: T inversion in V1-V3 is a normal continuation in athletes under 16 y (see s7).\n- **The Black-athlete variant**: J-point elevation + convex ST in V1-V4 followed by T inversion — an accepted normal variant, not ischaemia.\n- **A biphasic T confined to V3** (positive then negative) is also accepted.\nBeyond these exceptions, outside aVR/III/V1, T inversion >=1 mm in >=2 contiguous leads is abnormal and earns an echocardiogram with further work-up.\nOne more border worth knowing: an **isolated short PR** (no delta wave) in an asymptomatic athlete is not pre-excitation and needs nothing; pre-excitation = PR <120 ms + a delta wave + a wide QRS, and it belongs to the abnormal bin.',
        'La inversión de la T es el hallazgo más caro del ECG de un deportista: antes de etiquetarla de anormal, pásala por tres excepciones:\n- **Patrón T juvenil**: la inversión de T en V1-V3 es una continuación normal en deportistas menores de 16 años (ver s7).\n- **La variante del deportista de raza negra**: elevación del punto J + ST convexo en V1-V4 seguidos de inversión de T: una variante normal aceptada, no isquemia.\n- **La T bifásica limitada a V3** (positiva y luego negativa) también se acepta.\nFuera de estas excepciones, fuera de aVR/III/V1, la inversión de T >=1 mm en >=2 derivaciones contiguas es anormal y exige ecocardiograma con más estudio.\nOtra frontera que conviene conocer: un **PR corto aislado** (sin onda delta) en un deportista asintomático no es preexcitación y no exige nada; preexcitación = PR <120 ms + onda delta + QRS ancho, y pertenece al grupo anormal.',
      ),
    },
    { kind: 'check', item: { family: 'substrates', seed: 7 } },
    { kind: 'check', item: { family: 'substrates', seed: 9 } },
    { kind: 'drill', families: ['substrates', 'spot'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [1626, 14918],
      caption: l(
        '两份真实 12 导联（PTB-XL），都来自 53 岁男性：一份高电压，一份窦性心动过缓（58 次/分）。先假设两位都是坚持训练的耐力运动者，用上面的三档卡逐项归档并**写下结论**，再揭晓。记住分档卡只对训练人群成立——揭晓会讨论：对训练者，孤立的高电压与 ≥30 次/分的心动过缓都落在训练相关档。',
        'Two real 12-leads (PTB-XL), both from 53-year-old men: one high-voltage, one sinus bradycardia at 58/min. Suppose both are committed endurance athletes: sort every finding with the three-bin card above and **commit in writing**, then reveal. Remember the card applies to trained people — the reveal discusses how, for a trained patient, isolated high voltage and a rate above 30 both land in the training-related bin.',
        'Dos ECG reales de 12 derivaciones (PTB-XL), ambos de varones de 53 años: uno con alto voltaje y otro con bradicardia sinusal a 58 lpm. Supón que ambos son deportistas de resistencia entrenados: clasifica cada hallazgo con la tarjeta de tres grupos y **escríbelo**, y después mira la solución. Recuerda que la tarjeta vale para personas entrenadas: la solución comenta cómo, en un paciente entrenado, el alto voltaje aislado y una frecuencia por encima de 30 caen en el grupo relacionado con el entrenamiento.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '给生理性心动过缓装起搏器或四处转诊：清醒、无症状、心率 ≥30 次/分且有训练背景——先做运动试验，迷走张力撤退后心率上得去；起搏要有症状相关，从不由数字单独决定。',
          'Pacing or endlessly referring physiological bradycardia: awake, asymptomatic, >=30/min with a training history — do an exercise test first; vagal withdrawal lifts the rate, and pacing needs symptom correlation, never a number alone.',
          'Marcapasos o derivaciones sin fin para una bradicardia fisiológica: despierto, asintomático, >=30 lpm con historia de entrenamiento: haz primero una prueba de esfuerzo; la retirada vagal sube la frecuencia, y el marcapasos exige correlación con síntomas, nunca un número a solas.',
        ),
        l(
          '孤立电压标准引发一次又一次超声：这是运动员最常见的“异常”，其实属于训练相关档；只有 T 波倒置、ST 压低、病理性 Q 波或症状才改变档位。',
          'Isolated voltage criteria triggering echo after echo: the commonest "abnormality" in athletes is training-related; only T inversion, ST depression, pathological Q waves or symptoms change the bin.',
          'Criterios de voltaje aislados desencadenando ecocardiograma tras ecocardiograma: la «anomalía» más frecuente del deportista pertenece al grupo relacionado con el entrenamiento; solo la inversión de T, el descenso del ST, las ondas Q patológicas o los síntomas cambian de grupo.',
        ),
        l(
          '把侧壁 T 波倒置写成“运动员心脏”：这正是最危险的反向错误——≥2 个相邻导联 T 波倒置 ≥1 mm（aVR、III、V1 除外）在运动员身上是异常，首先想肥厚型心肌病。',
          'Writing off lateral T inversion as "athlete heart": that is the opposite, and most dangerous, error — T inversion >=1 mm in >=2 contiguous leads (outside aVR, III, V1) is abnormal in an athlete, and HCM comes first.',
          'Justificar la inversión de T lateral como «corazón de deportista»: es el error contrario y más peligroso; la inversión de T >=1 mm en >=2 derivaciones contiguas (fuera de aVR, III, V1) es anormal en un deportista, y la MCH va primero.',
        ),
        l(
          '把黑人运动员 V1–V4 变异叫成缺血：J 点抬高 + 凸面 ST + T 倒置在该人群是被接受的正常变异；它止于 V4、不伴对应性压低，不该因此送去做冠脉造影。',
          'Calling the Black-athlete V1-V4 variant ischaemia: J-point elevation + convex ST + T inversion is an accepted normal variant in this population; it stops at V4, has no reciprocal depression, and should send no one to coronary angiography.',
          'Llamar isquemia a la variante V1-V4 del deportista de raza negra: la elevación del punto J + ST convexo + inversión de T es una variante normal aceptada en esta población; se detiene en V4, sin descenso recíproco, y no debe enviar a nadie a una coronariografía.',
        ),
        l(
          '把运动员的 Mobitz I 送去起搏：运动后消失的文氏阻滞是训练相关发现；起搏的领地从 Mobitz II、三度房室传导阻滞和 PR ≥400 ms 才开始。',
          'Sending athlete Mobitz I for pacing: Wenckebach that vanishes with exercise is a training-related finding; pacing territory starts at Mobitz II, third-degree block and PR >=400 ms.',
          'Enviar a un Mobitz I de deportista para marcapasos: el Wenckebach que desaparece con el ejercicio es un hallazgo relacionado con el entrenamiento; el territorio del marcapasos empieza en el Mobitz II, el bloqueo de tercer grado y el PR >=400 ms.',
        ),
        l(
          '把运动员分档卡套在久坐患者身上：这套放宽的界值只对训练人群成立；同样的电压或心动过缓出现在普通人身上，要按常规标准读。',
          'Applying the athlete grid to a sedentary patient: these relaxed limits hold only for trained people; the same voltage or bradycardia in a non-athlete is read by ordinary criteria.',
          'Aplicar la clasificación del deportista a un paciente sedentario: estos límites relajados solo valen para personas entrenadas; el mismo voltaje o bradicardia en un no deportista se lee con los criterios ordinarios.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '三档：训练相关（零检查）、边界（≥2 项才检查）、异常（需要评估）——2017 国际标准，只对训练人群适用。',
          'Three bins: training-related (no work-up), borderline (work-up only when two or more combine), abnormal (needs evaluation) — the 2017 international criteria, applicable to trained people only.',
          'Tres grupos: relacionado con el entrenamiento (sin estudio), límite (estudio solo si se combinan dos o más) y anormal (requiere evaluación): los criterios internacionales de 2017, aplicables solo a personas entrenadas.',
        ),
        l(
          '训练相关档：窦性心动过缓 ≥30 次/分、窦性心律不齐、逸搏心律、一度房室传导阻滞 PR <400 ms、运动后消失的 Mobitz I、不完全性右束支阻滞、孤立电压标准、早期复极、<16 岁幼年型 T 波、黑人运动员 V1–V4 变异。',
          'Training-related bin: sinus bradycardia >=30/min, sinus arrhythmia, escape rhythms, first-degree block with PR <400 ms, Mobitz I resolving with exercise, incomplete RBBB, isolated voltage criteria, early repolarisation, juvenile T under 16 y, the Black-athlete V1-V4 variant.',
          'Grupo relacionado con el entrenamiento: bradicardia sinusal >=30 lpm, arritmia sinusal, ritmos de escape, bloqueo de primer grado con PR <400 ms, Mobitz I que cede con el ejercicio, bloqueo incompleto de rama derecha, criterios de voltaje aislados, repolarización precoz, T juvenil <16 años y la variante V1-V4 del deportista de raza negra.',
        ),
        l(
          '判决在 T 波与 ST：≥2 个相邻导联（aVR、III、V1 除外）T 波倒置 ≥1 mm 或 ST 压低 ≥0.5 mm = 异常——想肥厚型心肌病；电压从不改变档位。',
          'The verdict lives in the T wave and ST: T inversion >=1 mm in >=2 contiguous leads (outside aVR, III, V1) or ST depression >=0.5 mm = abnormal — think HCM; voltage never changes the bin.',
          'El veredicto está en la onda T y el ST: inversión de T >=1 mm en >=2 derivaciones contiguas (fuera de aVR, III, V1) o descenso del ST >=0,5 mm = anormal: piensa en la MCH; el voltaje nunca cambia de grupo.',
        ),
        l(
          '异常档还包括：病理性 Q 波、完全性左束支阻滞、QRS ≥140 ms、ε 波、预激、QTc ≥470/480 ms、Brugada 1 型、心率 <30 次/分、PR ≥400 ms、Mobitz II/三度阻滞、≥2 个室性期前收缩、房性快速性心律失常。',
          'The abnormal bin also holds: pathological Q waves, complete LBBB, QRS >=140 ms, epsilon waves, pre-excitation, QTc >=470/480 ms, Brugada type 1, rate <30/min, PR >=400 ms, Mobitz II/third-degree block, >=2 PVCs, atrial tachyarrhythmias.',
          'El grupo anormal también incluye: ondas Q patológicas, bloqueo completo de rama izquierda, QRS >=140 ms, ondas épsilon, preexcitación, QTc >=470/480 ms, Brugada tipo 1, frecuencia <30 lpm, PR >=400 ms, Mobitz II/bloqueo de tercer grado, >=2 extrasístoles ventriculares, taquiarritmias auriculares.',
        ),
        l(
          '报警前先过例外：<16 岁幼年型 T 波、黑人运动员 V1–V4 变异、仅 V3 的双向 T 波；孤立的短 PR（无 δ 波）不是预激。',
          'Pass the exceptions before you alarm: juvenile T under 16 y, the Black-athlete V1-V4 pattern, a biphasic T confined to V3; an isolated short PR (no delta wave) is not pre-excitation.',
          'Pasa por las excepciones antes de alarmar: T juvenil <16 años, el patrón V1-V4 del deportista de raza negra, una T bifásica limitada a V3; un PR corto aislado (sin onda delta) no es preexcitación.',
        ),
      ],
    },
  ],
  sources: [
    'Sharma S, Drezner JA et al. International Recommendations for Electrocardiographic Interpretation in Athletes. JACC 2017;69:1057-1075',
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Castellano et al. 2004',
  ],
};

export default lesson;
