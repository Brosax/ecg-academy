/**
 * r7 — Fascicular blocks, bifascicular block, alternating BBB and IVCD (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `lafb`, `lpfb`, `bifascicular`, `trifascicular` (current values; plus the
 * missing-book items: nonspecific IVCD, R-peak time cutoffs, alternating bundle branch block, bifascicular block
 * with syncope — EP study, HV >=70 ms).
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const TWELVE = { layout: '3x4+1' } as const;

const lesson: Lesson = {
  id: 'r7',
  stage: 'R',
  order: 7,
  title: l(
    '分支阻滞、双分支阻滞、交替性束支阻滞与室内传导延迟',
    'Fascicular blocks, bifascicular block, alternating BBB and IVCD',
    'Bloqueos fasciculares, bloqueo bifascicular, bloqueo de rama alternante y trastorno de la conducción intraventricular',
  ),
  summary: l(
    '左束支分成前后两个分支：单个分支阻滞表现为窄 QRS 加极端电轴——左前分支阻滞常见，左后分支阻滞是排除性诊断。右束支阻滞叠加分支阻滞即双分支阻滞；“三分支阻滞”一词应让位于按组成部分描述，只有二度Ⅱ型脱落或交替性束支阻滞才是三支病变的证据。',
    'The left bundle fans into an anterior and a posterior fascicle: a single fascicular block shows as a narrow QRS with an extreme axis — LAFB is common, LPFB a diagnosis of exclusion. RBBB on top of a fascicular block is bifascicular block; “trifascicular block” gives way to describing the components, and only Mobitz II drops or alternating BBB prove disease of all three fascicles.',
    'La rama izquierda se abre en un fascículo anterior y otro posterior: el bloqueo de un solo fascículo se ve como un QRS estrecho con un eje extremo — el bloqueo fascicular anterior es frecuente y el posterior un diagnóstico de exclusión. Un bloqueo de rama derecha añadido a un bloqueo fascicular es un bloqueo bifascicular; el término «bloqueo trifascicular» cede su sitio a describir los componentes, y solo los abandonos en Mobitz II o el bloqueo de rama alternante demuestran enfermedad de los tres fascículos.',
  ),
  objectives: [
    l(
      '用严格标准诊断左前分支阻滞：电轴 −45°…−90°、aVL 呈 qR、aVL R 波峰时间 ≥45 ms、QRS <120 ms，并讲清向量道理。',
      'Diagnose left anterior fascicular block by strict criteria: axis −45° to −90°, qR in aVL, R-peak time in aVL >=45 ms, QRS <120 ms, and explain the vector logic.',
      'Diagnosticar el bloqueo fascicular anterior izquierdo con criterios estrictos: eje de −45° a −90°, qR en aVL, tiempo hasta la cima de la R en aVL >=45 ms y QRS <120 ms, explicando la lógica vectorial.',
    ),
    l(
      '把左后分支阻滞当作排除性诊断：电轴 +90°…+180°、I/aVL 呈 rS、III/aVF 呈 qR，且先排除右室肥厚、侧壁心梗、垂直心、肺栓塞、肺气肿与导联接反。',
      'Treat left posterior fascicular block as a diagnosis of exclusion: axis +90° to +180°, rS in I/aVL, qR in III/aVF, after excluding RVH, lateral MI, a vertical heart, PE, emphysema and lead reversal.',
      'Tratar el bloqueo fascicular posterior izquierdo como un diagnóstico de exclusión: eje de +90° a +180°, rS en I/aVL y qR en III/aVF, tras excluir HVD, infarto lateral, corazón vertical, TEP, enfisema e inversión de derivaciones.',
    ),
    l(
      '识别双分支阻滞（右束支传导阻滞 + 左前/左后分支阻滞），用组成部分描述而非“三分支阻滞”，并知道真正的三支证据：二度Ⅱ型脱落与交替性束支阻滞（I 类起搏）。',
      'Recognise bifascicular block (RBBB + LAFB or LPFB), describe components instead of “trifascicular block”, and know the true three-fascicle evidence: Mobitz II drops and alternating BBB (Class I pacing).',
      'Reconocer el bloqueo bifascicular (bloqueo de rama derecha + bloqueo fascicular anterior o posterior izquierdo), describir los componentes en vez de decir «bloqueo trifascicular» y conocer la prueba real de los tres fascículos: abandonos en Mobitz II y bloqueo de rama alternante (estimulación clase I).',
    ),
    l(
      '给宽而无束支形态的 QRS 命名（非特异性室内传导延迟），并把双分支阻滞 + 不明原因晕厥引向电生理检查（HV ≥70 ms 起搏）。',
      'Name a wide QRS without bundle-branch morphology (nonspecific IVCD), and route bifascicular block with unexplained syncope to an EP study (pace if HV >=70 ms).',
      'Nombrar un QRS ancho sin morfología de rama (trastorno inespecífico de la conducción intraventricular) y encaminar el bloqueo bifascicular con síncope inexplicado al estudio electrofisiológico (estimulación si HV >=70 ms).',
    ),
  ],
  minutes: 16,
  competencies: ['C6', 'C5'],
  findings: ['lafb', 'lpfb', 'bifascicular-block', 'trifascicular-block', 'ivcd'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('lafb', 521, { axis: -60 }),
      view: TWELVE,
      question: l(
        'QRS 不宽，但 I 导联主波向上、aVF 主波深而向下——平均电轴约 −60°。窦性心律、QRS <120 ms，电轴怎么会被拉到这么左上？先定电轴，再看 aVL，写下你的解释。',
        'The QRS is not wide, but lead I is dominantly positive and aVF deeply negative — a mean axis of about −60°. Sinus rhythm, QRS <120 ms: how does the axis get pulled that far up and left? Plot the axis, then look at aVL, and commit to an explanation.',
        'El QRS no es ancho, pero la derivación I es claramente positiva y aVF profundamente negativa: un eje medio de unos −60°. Ritmo sinusal, QRS <120 ms: ¿cómo llega el eje a desviarse tanto arriba y a la izquierda? Traza el eje, mira aVL y decide una explicación.',
      ),
      reveal: l(
        '**左前分支阻滞（LAFB）**。左束支的两个分支里，前（上）分支没能下传：左心室改为从下后方的后分支起点除极——初始向量朝右下，aVL 留下一个**小 q**；激动再向上、向左爬过心室——终末向量朝左上，aVL 长出**高大的 R**，II、III、aVF 沦为**深 S**。分支之间有浦肯野纤维网相连，绕行只略微拖慢传导：QRS 仍 **<120 ms**。诊断压缩成三件事：电轴 −45°…−90°、aVL 呈 qR、aVL 的 R 波峰时间 ≥45 ms。',
        '**Left anterior fascicular block (LAFB).** Of the left bundle’s two fascicles, the anterior (superior) one fails to conduct: the left ventricle is activated from the posterior fascicle’s entry point below and behind — the initial forces point down and right, leaving a **small q** in aVL; activation then climbs up and to the left — terminal forces point up-left, growing a **tall R** in aVL and sinking II, III and aVF into **deep S** waves. The Purkinje network links the fascicles, so the detour only slightly slows conduction: the QRS stays **<120 ms**. The diagnosis compresses into three things: axis −45° to −90°, qR in aVL, and R-peak time in aVL >=45 ms.',
        '**Bloqueo fascicular anterior izquierdo (BFAI).** De los dos fascículos de la rama izquierda, el anterior (superior) deja de conducir: el ventrículo izquierdo se activa desde la entrada del fascículo posterior, abajo y atrás — las fuerzas iniciales se dirigen abajo y a la derecha y dejan una **q pequeña** en aVL; la activación asciende luego hacia arriba y a la izquierda — las fuerzas terminales dan una **R alta** en aVL y hunden II, III y aVF en **S profundas**. La red de Purkinje conecta ambos fascículos, así que el rodeo solo enlentece un poco la conducción: el QRS sigue siendo **<120 ms**. El diagnóstico se resume en tres cosas: eje de −45° a −90°, qR en aVL y tiempo hasta la cima de la R en aVL >=45 ms.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('lafb', 522, { axis: -60 }),
      showConduction: true,
      emphasize: ['lbb', 'laf', 'lpf'],
      caption: l(
        '三个分支就是后面所有命名的骨架：希氏束分为右束支和左束支，左束支随即展开成**前（上）分支**和**后（下）分支**。前分支细长、单支血供（前降支间隔支）——所以 LAFB 常见，孤立出现时多为良性退行性改变；后分支粗短、双重血供——单独的 LPFB 罕见，一旦要诊断，先想想别的病是不是更像。“右束支 + 左前 + 左后”，就是“双分支/三分支”语言里的那三支。',
        'Three fascicles are the skeleton of every name that follows: the His bundle splits into the right bundle branch and the left, and the left immediately fans into an **anterior (superior)** and a **posterior (inferior)** fascicle. The anterior one is long and slim with a single blood supply (LAD septal perforators) — which is why LAFB is common and, when isolated, usually a benign degenerative finding; the posterior one is thick and short with a dual supply — isolated LPFB is rare, and before calling it, ask whether something else fits better. Right bundle + anterior + posterior: those are the three fascicles of the “bi-/trifascicular” language.',
        'Los tres fascículos son el esqueleto de todos los nombres que siguen: el haz de His se divide en rama derecha e izquierda, y la izquierda se abre enseguida en un fascículo **anterior (superior)** y otro **posterior (inferior)**. El anterior es largo y fino, con un solo aporte sanguíneo (perforantes septales de la descendente anterior): por eso el BFAI es frecuente y, cuando está aislado, suele ser un hallazgo degenerativo benigno; el posterior es grueso y corto, con doble riego: el BFPI aislado es raro y, antes de diagnosticarlo, pregúntate si otra enfermedad encaja mejor. Rama derecha + anterior + posterior: esos son los tres fascículos del lenguaje “bi-/trifascicular”.',
      ),
    },
    {
      kind: 'worked',
      title: l('为什么 aVL 是 qR：LAFB 的向量算术', 'Why aVL is qR: the vector arithmetic of LAFB', 'Por qué aVL es qR: la aritmética vectorial del BFAI'),
      ecg: synth('lafb', 523, { axis: -60 }),
      view: TWELVE,
      steps: [
        {
          title: l('先量 QRS：窄是前提', 'First measure the QRS: narrow is the entry ticket', 'Primero mide el QRS: estrecho es el requisito'),
          body: l(
            '全局测量（最早的起点到最晚的终点）：这里 <120 ms。分支阻滞是**窄 QRS 的诊断**——宽了就先按 r6 的束支阻滞路径走。',
            'Measured globally (earliest onset to latest offset): here <120 ms. Fascicular block is a **narrow-QRS diagnosis** — if it is wide, first walk the r6 bundle-branch pathway.',
            'Medido de forma global (del inicio más precoz al final más tardío): aquí <120 ms. El bloqueo fascicular es un **diagnóstico de QRS estrecho**; si es ancho, recorre primero la vía de bloqueos de rama de r6.',
          ),
          marks: [{ auto: 'qrs' }],
          view: { layout: '3x4+1', calipers: true },
        },
        {
          title: l('定电轴：−45°…−90°', 'Plot the axis: −45° to −90°', 'Traza el eje: −45° a −90°'),
          body: l(
            'I 主波向上、aVF 主波向下，II、III、aVF 一律 rS：电轴约 −60°，落在 −45°…−90° 带内。注意门槛：−30°…−45° 只是中度左偏，**不够** LAFB。',
            'Lead I dominantly positive, aVF dominantly negative, and rS right across II, III and aVF: an axis of about −60°, inside the −45° to −90° band. Mind the threshold: −30° to −45° is only moderate left deviation and **not enough** for LAFB.',
            'I claramente positiva, aVF claramente negativa y rS en II, III y aVF: un eje de unos −60°, dentro de la franja de −45° a −90°. Cuidado con el umbral: −45° a −30° es solo una desviación izquierda moderada y **no basta** para el BFAI.',
          ),
          marks: [{ auto: 'r', lead: 'I' }, { auto: 's', lead: 'aVF' }],
          highlightLeads: ['I', 'aVF'],
        },
        {
          title: l('aVL：qR 且 R 波峰延迟', 'aVL: qR with a delayed R peak', 'aVL: qR con la cima de la R retrasada'),
          body: l(
            '小 q（初始向量朝右下、背离 aVL）接高大 R（终末向量朝左上、朝向 aVL）——qR。从 QRS 起点到 R 顶点 ≥45 ms：高侧壁最后才除极，R 爬得慢。',
            'A small q (initial forces down-right, away from aVL) followed by a tall R (terminal forces up-left, toward aVL) — qR. From QRS onset to the R peak takes >=45 ms: the high lateral wall depolarises last, so the R climbs slowly.',
            'Una q pequeña (fuerzas iniciales abajo-derecha, alejándose de aVL) seguida de una R alta (fuerzas terminales arriba-izquierda, hacia aVL): qR. Del inicio del QRS a la cima de la R hay >=45 ms: la pared lateral alta se despolariza la última y la R asciende despacio.',
          ),
          marks: [{ auto: 'q', lead: 'aVL' }, { auto: 'r', lead: 'aVL' }],
          highlightLeads: ['aVL'],
        },
        {
          title: l('哪些没变；写出结论', 'What stays intact; write the statement', 'Qué queda intacto; escribe la conclusión'),
          body: l(
            '初始间隔除极保留：V1 仍有小 r，V5–V6 的间隔 q 还在——这正是与 LBBB 的分界（r6）。胸前导联大致正常，继发性 T 改变轻微。结论：窦性心律，左前分支阻滞。附带一句：LAFB 本身抬高 aVL 的 R——别再拿 R aVL ≥11 mm 去判左室肥厚。',
            'Initial septal activation survives: V1 keeps its small r and V5–V6 keep the septal q — exactly the dividing line from LBBB (r6). The precordial leads are nearly normal and the secondary T changes are slight. Statement: sinus rhythm, left anterior fascicular block. One caveat: LAFB itself raises R in aVL — do not apply R aVL >=11 mm as an LVH criterion here.',
            'La activación septal inicial se conserva: V1 mantiene su r pequeña y V5–V6 la q septal — justo la línea divisoria con el BRI (r6). Las precordiales son casi normales y los cambios secundarios de la T, leves. Conclusión: ritmo sinusal, bloqueo fascicular anterior izquierdo. Una advertencia: el propio BFAI eleva la R de aVL; no apliques aquí R aVL >=11 mm como criterio de HVI.',
          ),
          marks: [{ auto: 'q', lead: 'V6' }],
          highlightLeads: ['V1', 'V6'],
        },
      ],
    },
    {
      kind: 'criteria',
      title: l('分支阻滞、双分支阻滞与 IVCD：现行标准', 'Fascicular, bifascicular and IVCD: current criteria', 'Bloqueos fasciculares, bifascicular y trastorno inespecífico: criterios actuales'),
      items: [
        {
          label: l('左前分支阻滞（LAFB）', 'Left anterior fascicular block (LAFB)', 'Bloqueo fascicular anterior izquierdo (BFAI)'),
          value: l(
            '电轴 −45°…−90°；aVL 呈 qR；aVL R 波峰时间 ≥45 ms；QRS <120 ms；II、III、aVF 呈 rS 为支持征象',
            'Axis −45° to −90°; qR in aVL; R-peak time in aVL >=45 ms; QRS <120 ms; rS in II, III, aVF is the supporting finding',
            'Eje de −45° a −90°; qR en aVL; tiempo hasta la cima de la R en aVL >=45 ms; QRS <120 ms; la rS en II, III y aVF es el hallazgo de apoyo',
          ),
        },
        {
          label: l('左后分支阻滞（LPFB）', 'Left posterior fascicular block (LPFB)', 'Bloqueo fascicular posterior izquierdo (BFPI)'),
          value: l(
            '电轴 +90°…+180°；I、aVL 呈 rS；III、aVF 呈 qR；QRS <120 ms——**排除性诊断**：先排除右室肥厚、侧壁心梗、垂直心/瘦长体型、急性右室负荷（肺栓塞）、肺气肿、肢体导联接反',
            'Axis +90° to +180°; rS in I and aVL; qR in III and aVF; QRS <120 ms — a **diagnosis of exclusion**: rule out RVH, lateral MI, a vertical heart or slender build, acute RV strain (PE), emphysema and limb-lead reversal first',
            'Eje de +90° a +180°; rS en I y aVL; qR en III y aVF; QRS <120 ms — **diagnóstico de exclusión**: descarta antes HVD, infarto lateral, corazón vertical o constitución delgada, sobrecarga aguda del VD (TEP), enfisema e inversión de derivaciones de extremidades',
          ),
        },
        {
          label: l('双分支阻滞', 'Bifascicular block', 'Bloqueo bifascicular'),
          value: l(
            'RBBB 形态 + 电轴 −45°…−90°（= RBBB + LAFB，常见组合；下壁宽 S、aVR 终末 R）；或 RBBB 形态 + 电轴 +90°…+180°（= RBBB + LPFB，除外其他右偏原因后）。多数起搏指南把完全性 LBBB 也计为双分支病变',
            'RBBB morphology with an axis −45° to −90° (= RBBB + LAFB, the usual combination; broad S inferiorly, terminal R in aVR); or RBBB morphology with an axis +90° to +180° (= RBBB + LPFB, after other causes of right axis deviation are excluded). Most pacing guidelines also count complete LBBB as a bifascicular lesion',
            'Morfología de BRD con eje de −45° a −90° (= BRD + BFAI, la combinación habitual; S ancha en inferiores, R terminal en aVR); o morfología de BRD con eje de +90° a +180° (= BRD + BFPI, tras excluir otras causas de desviación derecha). La mayoría de guías de estimulación también cuentan el BRI completo como lesión bifascicular',
          ),
        },
        {
          label: l('“三分支阻滞”一词', 'The word “trifascicular block”', 'El término «bloqueo trifascicular»'),
          value: l(
            '**不要**用于双分支阻滞 + PR >200 ms——按组成部分描述（“RBBB + LAFB + 一度房室传导阻滞”）；PR 延长通常在房室结，进展风险与单纯双分支阻滞相近。三支病变的证据：双分支阻滞 + 二度Ⅱ型脱落，或**交替性束支阻滞**（I 类起搏，即使无症状）',
            'Do **not** use it for bifascicular block + PR >200 ms — describe the components (“RBBB + LAFB + first-degree AV block”); the PR delay is usually AV-nodal and progression risk is close to bifascicular block alone. Evidence of three-fascicle disease: bifascicular block + Mobitz II drops, or **alternating BBB** (Class I pacing even without symptoms)',
            '**No** lo uses para el bloqueo bifascicular + PR >200 ms: describe los componentes («BRD + BFAI + bloqueo AV de primer grado»); el alargamiento del PR suele estar en el nodo AV y el riesgo de progresión es parecido al del bloqueo bifascicular aislado. Prueba de enfermedad de los tres fascículos: bloqueo bifascicular + abandonos en Mobitz II, o **bloqueo de rama alternante** (estimulación clase I aun sin síntomas)',
          ),
        },
        {
          label: l('R 波峰时间一览', 'R-peak time at a glance', 'Tiempo hasta la cima de la R, de un vistazo'),
          value: l(
            'RBBB：V1 >50 ms（V5–V6 正常）；LBBB：V5–V6 >60 ms（V1–V3 正常）；不完全性 LBBB：V4–V6 >60 ms；LAFB：aVL ≥45 ms',
            'RBBB: >50 ms in V1 (normal in V5–V6); LBBB: >60 ms in V5–V6 (normal in V1–V3); incomplete LBBB: >60 ms in V4–V6; LAFB: >=45 ms in aVL',
            'BRD: >50 ms en V1 (normal en V5–V6); BRI: >60 ms en V5–V6 (normal en V1–V3); BRI incompleto: >60 ms en V4–V6; BFAI: >=45 ms en aVL',
          ),
        },
        {
          label: l('非特异性室内传导延迟（IVCD）', 'Nonspecific intraventricular conduction delay (IVCD)', 'Trastorno inespecífico de la conducción intraventricular (TCIV)'),
          value: l(
            '成人 QRS >110 ms 而不符合 RBBB 或 LBBB 形态标准（V1 与 V6 定形态）；描述性诊断，不定位。运动员 IVCD ≥140 ms 为异常，需评估',
            'QRS >110 ms in adults that meets neither RBBB nor LBBB morphology criteria (V1 and V6 decide the shape); a descriptive statement, not a localisation. In athletes, IVCD >=140 ms is abnormal and needs evaluation',
            'QRS >110 ms en adultos que no cumple criterios morfológicos de BRD ni de BRI (V1 y V6 deciden la morfología); enunciado descriptivo, sin localización. En deportistas, un TCIV >=140 ms es anormal y requiere evaluación',
          ),
        },
      ],
      source:
        'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240; Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427-3520',
    },
    {
      kind: 'contrast',
      title: l('镜像对峙：前分支 vs 后分支', 'Mirror opponents: anterior vs posterior fascicle', 'Adversarios en espejo: fascículo anterior frente a posterior'),
      view: { layout: 'strip', lead: 'I' },
      left: {
        ecg: synth('lafb', 524, { axis: -60 }),
        caption: l('A：LAFB——I 导联 qR', 'A: LAFB — qR in lead I', 'A: BFAI — qR en la derivación I'),
        marks: [{ auto: 'r', lead: 'I' }],
      },
      right: {
        ecg: synth('lpfb', 525, { axis: 110 }),
        caption: l('B：LPFB——I 导联 rS', 'B: LPFB — rS in lead I', 'B: BFPI — rS en la derivación I'),
        marks: [{ auto: 's', lead: 'I' }],
      },
      point: l(
        '同一导联、互为镜像：A 电轴 −45°…−90°（aVL qR、II/III/aVF rS）；B 电轴 +90°…+180°（I/aVL rS、III/aVF qR），QRS 都 <120 ms。但两者地位完全不对称：LAFB 常见、可孤立存在；LPFB 罕见，是**排除性诊断**——右室肥厚、侧壁心梗、垂直心/瘦长体型、急性右室负荷（肺栓塞）、肺气肿、肢体导联接反，个个都比它常见。看到右偏 + rS I/aVL + qR III/aVF，先把这份清单走完再写 LPFB。',
        'Same lead, mirror images: A has an axis of −45° to −90° (qR in aVL, rS inferiorly); B an axis of +90° to +180° (rS in I/aVL, qR in III/aVF), both with QRS <120 ms. But their standing is utterly unequal: LAFB is common and can stand alone; LPFB is rare and a **diagnosis of exclusion** — RVH, lateral MI, a vertical heart or slender build, acute RV strain (PE), emphysema and limb-lead reversal are each more likely than it. When you see right axis + rS in I/aVL + qR in III/aVF, finish that list before writing LPFB.',
        'Misma derivación, imágenes en espejo: A tiene un eje de −45° a −90° (qR en aVL, rS en inferiores); B un eje de +90° a +180° (rS en I/aVL, qR en III y aVF), ambos con QRS <120 ms. Pero su estatura es del todo desigual: el BFAI es frecuente y puede presentarse aislado; el BFPI es raro y es un **diagnóstico de exclusión**: HVD, infarto lateral, corazón vertical o constitución delgada, sobrecarga aguda del VD (TEP), enfisema e inversión de derivaciones son cada uno más probable que él. Ante eje derecho + rS en I/aVL + qR en III/aVF, completa esa lista antes de escribir BFPI.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('bifascicular-block', 526),
      showConduction: true,
      emphasize: ['rbb', 'laf'],
      caption: l(
        '双分支阻滞（最常见的组合：RBBB + LAFB）。右束支断了，右心室最后除极——V1 出现 rsR′、I/V6 宽 S（r6 的内容）；同时前分支断了，左心室内部改为自下而上——肢体导联电轴 −45°…−90°。**胸前导联讲右束支的故事，肢体导联讲分支的故事**；三个分支里只剩后分支还在给左心室带路。',
        'Bifascicular block (the commonest combination: RBBB + LAFB). The right bundle is blocked, so the right ventricle depolarises last — rsR′ in V1, broad S in I/V6 (r6 material); and with the anterior fascicle also blocked, the left ventricle activates bottom-up — a frontal axis of −45° to −90°. **The precordial leads tell the right-bundle story, the limb leads tell the fascicular story**; of three fascicles, only the posterior one still leads the left ventricle.',
        'Bloqueo bifascicular (la combinación más frecuente: BRD + BFAI). La rama derecha está bloqueada y el ventrículo derecho se despolariza el último: rsR′ en V1, S ancha en I/V6 (tema de r6); y con el fascículo anterior también bloqueado, el ventrículo izquierdo se activa de abajo arriba: eje frontal de −45° a −90°. **Las precordiales cuentan la historia de la rama derecha y las extremidades la del fascículo**; de tres fascículos, solo el posterior sigue guiando al ventrículo izquierdo.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('bifascicular-block', 527, undefined, 'lpfb'),
      view: TWELVE,
      marks: [{ auto: 'qrs' }],
      caption: l(
        '少见的那一半：RBBB + LPFB。V1 仍是 rsR′，但肢体导联翻转——I/aVL 呈 rS、III/aVF 呈 qR、电轴右偏 +90°…+180°。LPFB 的排除规则在这里照用：先排除右偏的其他原因（右室肥厚、侧壁心梗、瘦长/垂直心、肺栓塞、肺气肿、导联接反），排除完毕才写“RBBB + LPFB”。QRS 全局测量 ≥120 ms（右束支那份宽度还在）。',
        'The uncommon half: RBBB + LPFB. V1 still shows rsR′, but the limb leads flip — rS in I/aVL, qR in III/aVF, right axis +90° to +180°. LPFB’s exclusion rule applies unchanged: rule out the other causes of right axis deviation (RVH, lateral MI, slender or vertical heart, PE, emphysema, lead reversal) before writing “RBBB + LPFB”. The globally measured QRS is >=120 ms (the right-bundle width is still there).',
        'La mitad infrecuente: BRD + BFPI. V1 sigue mostrando rsR′, pero las derivaciones de extremidades se invierten: rS en I/aVL, qR en III/aVF y eje derecho de +90° a +180°. La regla de exclusión del BFPI se aplica igual aquí: descarta las demás causas de desviación derecha (HVD, infarto lateral, corazón vertical o delgado, TEP, enfisema, inversión de derivaciones) antes de escribir «BRD + BFPI». El QRS medido de forma global es >=120 ms (conserva el ancho de la rama derecha).',
      ),
    },
    {
      kind: 'contrast',
      title: l('长 PR 不是第三支的证据', 'A long PR is not evidence of a third fascicle', 'Un PR largo no es prueba de un tercer fascículo'),
      view: TWELVE,
      left: {
        ecg: synth('trifascicular-block', 528, { pr: 260 }),
        caption: l(
          'A：RBBB + LAFB + 一度房室传导阻滞（旧称“三分支阻滞”）',
          'A: RBBB + LAFB + first-degree AV block (formerly “trifascicular block”)',
          'A: BRD + BFAI + bloqueo AV de primer grado (antes «bloqueo trifascicular»)',
        ),
        marks: [{ auto: 'pr' }],
      },
      right: {
        ecg: synth('trifascicular-block', 529, { pr: 260 }, 'mobitz2'),
        caption: l(
          'B：RBBB + LAFB + 二度Ⅱ型（希氏束下）——真正的三支病变',
          'B: RBBB + LAFB + Mobitz II (infra-His) — true three-fascicle disease',
          'B: BRD + BFAI + Mobitz II (infrahisiano): verdadera enfermedad de los tres fascículos',
        ),
        marks: [{ auto: 'pr' }, { auto: 'blocked-p' }],
      },
      point: l(
        '两份都是 RBBB + LAFB（V1 rsR′、I/V6 宽 S、电轴左偏），PR 都长。A 只是叠了一度房室传导阻滞——PR 延长几乎总在房室结，进展为完全阻滞的风险与单纯双分支阻滞相近：**按组成部分描述**，别用“三分支阻滞”。B 里一个按时到达的 P 突然不下传，而下传搏动的 PR 始终恒定——剩下的后分支间歇性失灵：这才是三支都有病的心电图证据，加上二度Ⅱ型本身就是 I 类起搏指征（r4）。交替性束支阻滞（同一份或连续心电图上 RBBB 与 LBBB 交替，或 RBBB+LAFB 与 RBBB+LPFB 交替）是另一种——同样 I 类，即使无症状。',
        'Both are RBBB + LAFB (rsR′ in V1, broad S in I/V6, left axis) with a long PR. A merely adds first-degree AV block — the PR delay is almost always in the AV node, and progression to complete block carries about the same risk as bifascicular block alone: **describe the components** and skip “trifascicular block”. In B an on-time P suddenly fails to conduct while the conducted PR stays constant — the surviving posterior fascicle is failing intermittently: this is ECG evidence of disease in all three fascicles, and Mobitz II on its own is already a Class I pacing indication (r4). Alternating BBB (RBBB and LBBB alternating on the same or successive ECGs, or RBBB+LAFB alternating with RBBB+LPFB) is the other kind — also Class I, even without symptoms.',
        'Ambos son BRD + BFAI (rsR′ en V1, S ancha en I/V6, eje izquierdo) con PR largo. A solo añade un bloqueo AV de primer grado: el alargamiento del PR está casi siempre en el nodo AV y la progresión a bloqueo completo tiene un riesgo parecido al del bloqueo bifascicular aislado; **describe los componentes** y evita «bloqueo trifascicular». En B una P que llega a su hora deja de conducir de golpe mientras el PR de las conducidas no cambia: el fascículo posterior que quedaba falla de forma intermitente. Esto sí es prueba electrocardiográfica de enfermedad de los tres fascículos, y el propio Mobitz II ya es indicación de estimulación clase I (r4). El bloqueo de rama alternante (BRD y BRI alternando en el mismo ECG o en ECG sucesivos, o BRD+BFAI alternando con BRD+BFPI) es la otra forma: también clase I, aun sin síntomas.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('ivcd', 530, { qrs: 124 }),
      view: TWELVE,
      marks: [{ auto: 'qrs' }],
      caption: l(
        'QRS 全局测量约 125 ms——但 V1 没有 rsR′（不是 RBBB），I、V5、V6 仍保留一个小的间隔 q 波（LBBB 时它会消失）：既不是 RBBB 也不是 LBBB → **非特异性室内传导延迟（IVCD）**：QRS >110 ms 而不符合任一束支形态。见于心肌病与心肌纤维化、药物（尤其 Ic 类抗心律失常药）、高钾血症。它是**描述**而不是**定位**——不像束支阻滞那样指向某一条分支。若 QRS 增宽同时 T 波高尖，先查血钾，再谈退行性传导系统病。',
        'The globally measured QRS is about 125 ms — but V1 has no rsR′ (not RBBB), and a small septal q survives in I, V5 and V6 (it disappears in LBBB): neither RBBB nor LBBB → **nonspecific intraventricular conduction delay (IVCD)**: QRS >110 ms matching neither bundle morphology. Seen with cardiomyopathy and myocardial fibrosis, drugs (especially class Ic antiarrhythmics) and hyperkalaemia. It is a **description**, not a **localisation** — unlike a bundle branch block it does not point to one branch. If the QRS is wide while the T waves are peaked, check the potassium before blaming degenerative conduction-system disease.',
        'El QRS medido de forma global es unos 125 ms, pero V1 no tiene rsR′ (no es BRD) y en I, V5 y V6 persiste una pequeña q septal (que desaparece en el BRI): no es BRD ni BRI → **trastorno inespecífico de la conducción intraventricular (TCIV)**: QRS >110 ms sin ninguna de las dos morfologías de rama. Se ve en miocardiopatías y fibrosis miocárdica, fármacos (sobre todo antiarrítmicos de clase Ic) e hiperpotasemia. Es una **descripción**, no una **localización**: a diferencia del bloqueo de rama, no señala una rama concreta. Si el QRS se ensancha con T apuntadas, mira primero la potasemia antes de culpar a la degeneración del sistema de conducción.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'decision-tree', params: { tree: 'bundle-branch' } },
      caption: l(
        '把 r6 与本课并成一条决策链：先全局量 QRS——<110 ms 正常带，110–119 ms 不完全带（r6），≥120 ms 看 V1/V6 定右/左束支；然后让**肢体导联的电轴**说话：左偏 −45°…−90° 加 aVL qR = 合并 LAFB；右偏 +90°…+180° 加 rS I/aVL、qR III/aVF = 想到 LPFB（先排除）；都不符合 = 非特异性 IVCD。',
        'Chain r6 and this lesson into one decision path: measure the QRS globally first — <110 ms normal, 110–119 ms the incomplete band (r6), >=120 ms decide right vs left branch from V1/V6; then let **the frontal axis of the limb leads** speak: left −45° to −90° with qR in aVL = add LAFB; right +90° to +180° with rS in I/aVL and qR in III/aVF = think LPFB (exclusions first); neither fits = nonspecific IVCD.',
        'Encadena r6 con esta lección en una sola vía de decisión: mide primero el QRS de forma global — <110 ms normal, 110–119 ms la franja incompleta (r6), >=120 ms decide rama derecha o izquierda con V1/V6; y deja luego que hable **el eje frontal de las extremidades**: −45° a −90° con qR en aVL = añade BFAI; +90° a +180° con rS en I/aVL y qR en III/aVF = piensa en el BFPI (exclusiones primero); si nada encaja = TCIV inespecífico.',
      ),
    },
    {
      kind: 'text',
      title: l('用词与处置：从“三分支”到起搏', 'Words and actions: from “trifascicular” to pacing', 'Palabras y decisiones: del «trifascicular» a la estimulación'),
      body: l(
        '- 不把“三分支阻滞”写在报告里指代双分支阻滞 + 长 PR：按组成部分描述；PR 延长通常在房室结，风险与单纯双分支阻滞相近。\n- 真正的三支证据只有两种心电图表现：双分支阻滞 + 二度Ⅱ型脱落（上文 B），或**交替性束支阻滞**——同一份或连续心电图上 RBBB 与 LBBB 交替（或 RBBB+LAFB 与 RBBB+LPFB 交替）：I 类起搏指征，即使无症状。\n- **无症状**的双分支阻滞（伴或不伴一度房室传导阻滞）不需要起搏。\n- **不明原因晕厥** + 双分支阻滞 → 电生理检查：HV 间期 ≥70 ms、递增心房起搏时出现二度/三度希氏束内或其下阻滞、或药物诱发试验异常 → 起搏（ESC 2021）。\n- 孤立 LAFB 在老年人中很常见，多为退行性改变——按发现记录，不必启动全套检查。',
        '- Never write “trifascicular block” to mean bifascicular block + long PR: describe the components; the PR delay is usually AV-nodal and the risk matches bifascicular block alone.\n- Only two ECG findings prove three-fascicle disease: bifascicular block + Mobitz II drops (B above), or **alternating bundle branch block** — RBBB and LBBB alternating on the same or successive tracings (or RBBB+LAFB alternating with RBBB+LPFB): a Class I pacing indication even without symptoms.\n- **Asymptomatic** bifascicular block, with or without first-degree AV block, needs no pacemaker.\n- **Unexplained syncope** + bifascicular block → EP study: pace if the HV interval is >=70 ms, if second- or third-degree intra- or infra-Hisian block appears during incremental atrial pacing, or if a pharmacological challenge is abnormal (ESC 2021).\n- Isolated LAFB is very common in the elderly and mostly degenerative — report it as a finding; do not launch a full work-up.',
        '- Nunca escribas «bloqueo trifascicular» para referirte al bloqueo bifascicular + PR largo: describe los componentes; el alargamiento del PR suele estar en el nodo AV y el riesgo es el del bloqueo bifascicular aislado.\n- Solo dos hallazgos electrocardiográficos demuestran enfermedad de los tres fascículos: bloqueo bifascicular + abandonos en Mobitz II (el B de arriba), o **bloqueo de rama alternante**: BRD y BRI alternando en el mismo ECG o en ECG sucesivos (o BRD+BFAI alternando con BRD+BFPI): indicación de estimulación clase I aun sin síntomas.\n- El bloqueo bifascicular **asintomático**, con o sin bloqueo AV de primer grado, no necesita marcapasos.\n- **Síncope inexplicado** + bloqueo bifascicular → estudio electrofisiológico: estimula si el intervalo HV es >=70 ms, si aparece bloqueo AV de segundo o tercer grado intra o infrahisiano con estimulación auricular progresiva, o si la provocación farmacológica es anormal (ESC 2021).\n- El BFAI aislado es muy frecuente en ancianos y en su mayoría degenerativo: infórmalo como hallazgo; no inicies un estudio completo.',
      ),
    },
    { kind: 'check', item: { family: 'bundle-branch', seed: 30 } },
    { kind: 'check', item: { family: 'bundle-branch', seed: 6 } },
    { kind: 'check', item: { family: 'axis-degrees', seed: 4 } },
    { kind: 'drill', families: ['bundle-branch', 'axis-degrees'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [18373, 9188, 3995],
      caption: l(
        '三份真实心电图：两份左前分支阻滞、一份非特异性室内传导延迟。先量 QRS、用 I 与 aVF 定电轴度数、再看 aVL 与 V1/V6，写下每份的诊断，然后揭晓。',
        'Three real ECGs: two left anterior fascicular blocks and one nonspecific IVCD. Measure the QRS, plot the axis in degrees from I and aVF, check aVL and V1/V6, commit to a diagnosis for each — then reveal.',
        'Tres ECG reales: dos bloqueos fasciculares anteriores izquierdos y un trastorno inespecífico de la conducción intraventricular. Mide el QRS, traza el eje en grados con I y aVF, revisa aVL y V1/V6, decide un diagnóstico para cada uno y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'LPFB 被过度诊断：没有先排除右室肥厚、侧壁心梗、垂直心/瘦长体型、肺栓塞、肺气肿与导联接反，就写了“LPFB”。',
          'LPFB over-called: writing “LPFB” before excluding RVH, lateral MI, a vertical heart or slender build, PE, emphysema and lead reversal.',
          'BFPI diagnosticado por exceso: escribir «BFPI» antes de excluir HVD, infarto lateral, corazón vertical o constitución delgada, TEP, enfisema e inversión de derivaciones.',
        ),
        l(
          '把 RBBB + LAFB + 长 PR 写成“三分支阻滞”：按组成部分描述——PR 延长通常在房室结。',
          'Writing “trifascicular block” for RBBB + LAFB + long PR: describe the components — the PR delay is usually AV-nodal.',
          'Escribir «bloqueo trifascicular» para BRD + BFAI + PR largo: describe los componentes; el alargamiento del PR suele estar en el nodo AV.',
        ),
        l(
          '在 LAFB 里用 R aVL ≥11 mm 判左室肥厚：前分支阻滞本身抬高 aVL 的 R，电压标准在此失灵。',
          'Applying R aVL >=11 mm as an LVH criterion inside LAFB: the fascicular block itself raises R in aVL, defeating voltage criteria.',
          'Aplicar R aVL >=11 mm como criterio de HVI en presencia de BFAI: el propio bloqueo fascicular eleva la R de aVL e invalida los criterios de voltaje.',
        ),
        l(
          '老年人孤立 LAFB 被送去全套检查：这常见且多为良性退行性改变。',
          'Sending isolated LAFB in the elderly for a full work-up: it is common and usually benign degenerative change.',
          'Enviar a un anciano con BFAI aislado a un estudio completo: es frecuente y en general un cambio degenerativo benigno.',
        ),
        l(
          'IVCD 伴 T 波高尖没查血钾：高钾血症能使 QRS 增宽——先治可逆原因。',
          'IVCD with peaked T waves left without a potassium check: hyperkalaemia widens the QRS — treat the reversible cause first.',
          'Un TCIV con T apuntadas sin control de potasio: la hiperpotasemia ensancha el QRS; trata primero la causa reversible.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'LAFB：电轴 −45°…−90°、aVL 呈 qR、aVL R 波峰时间 ≥45 ms、QRS <120 ms——窄 QRS 的诊断，由电轴决定。间隔除极保留（V5–V6 仍有 q），是与 LBBB 的分界。',
          'LAFB: axis −45° to −90°, qR in aVL, R-peak time in aVL >=45 ms, QRS <120 ms — a narrow-QRS diagnosis where the axis does the work. Septal activation is preserved (V5–V6 keep their q), the dividing line from LBBB.',
          'BFAI: eje de −45° a −90°, qR en aVL, tiempo hasta la cima de la R en aVL >=45 ms y QRS <120 ms: un diagnóstico de QRS estrecho donde el eje manda. La activación septal se conserva (V5–V6 mantienen la q), la frontera con el BRI.',
        ),
        l(
          'LPFB 是镜像（电轴 +90°…+180°、I/aVL rS、III/aVF qR）但更是排除性诊断：右室肥厚、侧壁心梗、垂直心/瘦长、肺栓塞、肺气肿、导联接反，先一个个排掉。',
          'LPFB is the mirror image (axis +90° to +180°, rS in I/aVL, qR in III/aVF) but above all a diagnosis of exclusion: RVH, lateral MI, vertical or slender heart, PE, emphysema, lead reversal — clear them one by one first.',
          'El BFPI es la imagen en espejo (eje de +90° a +180°, rS en I/aVL, qR en III y aVF), pero sobre todo un diagnóstico de exclusión: HVD, infarto lateral, corazón vertical o delgado, TEP, enfisema e inversión de derivaciones; descártalos uno a uno primero.',
        ),
        l(
          '双分支阻滞 = RBBB + LAFB（常见）或 + LPFB（先排除右偏原因）；起搏文件把完全性 LBBB 也算双分支病变。',
          'Bifascicular block = RBBB + LAFB (common) or + LPFB (after excluding other right-axis causes); pacing documents also count complete LBBB as a bifascicular lesion.',
          'Bloqueo bifascicular = BRD + BFAI (frecuente) o + BFPI (tras excluir otras causas de eje derecho); los documentos de estimulación también cuentan el BRI completo como lesión bifascicular.',
        ),
        l(
          '双分支阻滞 + 长 PR 不叫“三分支阻滞”——按组成部分描述；三支病变的证据是二度Ⅱ型脱落或交替性束支阻滞（I 类起搏，即使无症状）。',
          'Bifascicular block + long PR is not “trifascicular block” — describe the components; the evidence for three-fascicle disease is Mobitz II drops or alternating BBB (Class I pacing even without symptoms).',
          'El bloqueo bifascicular + PR largo no es «bloqueo trifascicular»: describe los componentes; la prueba de enfermedad de los tres fascículos son los abandonos en Mobitz II o el bloqueo de rama alternante (estimulación clase I aun sin síntomas).',
        ),
        l(
          'IVCD = QRS >110 ms 而无束支形态（描述而非定位；高尖 T 先查血钾）。无症状双分支阻滞不需起搏；不明原因晕厥 + 双分支阻滞 → 电生理检查，HV ≥70 ms → 起搏。',
          'IVCD = QRS >110 ms without bundle-branch morphology (a description, not a localisation; with peaked T waves check potassium first). Asymptomatic bifascicular block needs no pacemaker; unexplained syncope + bifascicular block → EP study, and HV >=70 ms → pace.',
          'TCIV = QRS >110 ms sin morfología de rama (descripción, no localización; con T apuntadas, controla primero la potasemia). El bloqueo bifascicular asintomático no necesita marcapasos; síncope inexplicado + bloqueo bifascicular → estudio electrofisiológico, y HV >=70 ms → estimulación.',
        ),
      ],
    },
  ],
  sources: [
    'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240',
    'Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427-3520',
    'Castellano et al. 2004',
  ],
};

export default lesson;
