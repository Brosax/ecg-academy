/**
 * i4 — Inferior and right ventricular infarction (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `rca-vs-cx`, `rv-infarction`, `posterior-mi`, `reciprocal-changes` (current
 * values) and the "Missing in the book" bullet "Supplemental leads" (V3R/V4R and V7–V9 placement and thresholds).
 * Extra leads: the local synth helper takes an optional extraLeads argument (the s3.ts helper does not), so V3R/V4R
 * can be shown and marked once the request records them.
 */
import { l } from '../../core/l10n';
import type { ExtraLead } from '../../core/leads';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (
  scenario: string,
  seed: number,
  dials?: Partial<Record<DialId, number>>,
  variant?: string,
  extraLeads?: readonly ExtraLead[],
): EcgSource => ({
  kind: 'synth',
  req: {
    scenario,
    seed,
    ...(variant ? { variant } : {}),
    ...(dials ? { dials } : {}),
    ...(extraLeads ? { extraLeads } : {}),
  },
});

const lesson: Lesson = {
  id: 'i4',
  stage: 'I',
  order: 4,
  title: l('下壁梗死与右心室梗死', 'Inferior and right ventricular infarction', 'Infarto inferior y del ventrículo derecho'),
  summary: l(
    '下壁 STEMI 从确认那一刻起就要回答三个问题：罪犯血管是 RCA 还是 LCx？右心室是否受累（V3R/V4R）？有没有后壁延伸（V1–V3 镜像性压低）？答案直接改变用药、补液与起搏准备。',
    'From the moment you confirm an inferior STEMI, three questions follow: RCA or LCx? Is the right ventricle involved (V3R/V4R)? Is there posterior extension (mirror ST depression in V1–V3)? The answers change the drugs, the fluids and the pacing readiness.',
    'Desde que confirmas un IAMCEST inferior siguen tres preguntas: ¿CD o Cx? ¿está afectado el ventrículo derecho (V3R/V4R)? ¿hay extensión posterior (descenso especular del ST en V1–V3)? Las respuestas cambian la medicación, el volumen y la preparación del marcapasos.',
  ),
  objectives: [
    l(
      '在下壁 STEMI 中鉴别 RCA 与 LCx：比较 III 与 II 的抬高幅度并检查 I 导联。',
      'Tell RCA from LCx in an inferior STEMI: compare the elevation in III and II and check lead I.',
      'Distinguir la CD de la Cx en un IAMCEST inferior: comparar la elevación en III y II y revisar la derivación I.',
    ),
    l(
      '说出何时记录 V3R/V4R 并应用右心室受累阈值（≥ 0.5 mm；< 30 岁男性 ≥ 1 mm）。',
      'Say when to record V3R/V4R and apply the RV-involvement threshold (≥ 0.5 mm; ≥ 1 mm in men < 30 y).',
      'Indicar cuándo registrar V3R/V4R y aplicar el umbral de afectación del VD (≥ 0,5 mm; ≥ 1 mm en varones < 30 años).',
    ),
    l(
      '识别后壁延伸（V1–V3 镜像性压低伴直立 T 波）并知道用 V7–V9 确认。',
      'Recognise posterior extension (mirror V1–V3 depression with an upright T) and confirm it with V7–V9.',
      'Reconocer la extensión posterior (descenso especular en V1–V3 con T positiva) y confirmarla con V7–V9.',
    ),
    l(
      '预见右心室梗死的处理要点：前负荷依赖与硝酸酯类、缓慢性心律与起搏准备。',
      'Anticipate the management points of RV infarction: preload dependence and nitrates, bradyarrhythmias and pacing readiness.',
      'Anticipar los puntos clave del manejo del infarto del VD: dependencia de la precarga y nitratos, bradiarritmias y preparación para marcapasos.',
    ),
  ],
  minutes: 15,
  competencies: ['C8'],
  findings: ['stemi-inferior', 'rv-infarction', 'stemi-posterior'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-inferior', 861),
      question: l(
        'ST 抬高见于 II、III、aVF：先停一下——在你认定“下壁 STEMI”之前，罪犯血管最可能是哪一支？接下来必须加做哪些导联？想好你的答案。',
        'ST elevation in II, III and aVF: stop — before you call it "inferior STEMI", which artery is the most likely culprit, and which leads must you record next? Commit to an answer.',
        'Elevación del ST en II, III y aVF: para; antes de etiquetarlo como «IAMCEST inferior», ¿cuál es la arteria responsable más probable y qué derivaciones hay que registrar a continuación? Decide tu respuesta.',
      ),
      reveal: l(
        '**ST↑ III > II，且 I、aVL 镜像性压低 ⇒ 最可能是 RCA**。但这个诊断只完成了一半：每个下壁 STEMI 都必须**立即记录右胸导联 V3R/V4R**（右心室受累会改变用药），并查看 V1–V3——压低伴直立 T 波提示后壁延伸，需要 V7–V9。本课把这三个问题练成下壁 STEMI 的固定流程。',
        '**ST elevation III > II with mirror depression in I and aVL ⇒ the RCA is most likely.** But that diagnosis is only half the job: every inferior STEMI needs the **right-sided leads V3R/V4R recorded at once** (RV involvement changes the drugs), plus a look at V1–V3 — depression with an upright T means posterior extension and a call for V7–V9. This lesson drills those three questions into a fixed routine.',
        '**Elevación del ST III > II con descenso especular en I y aVL ⇒ lo más probable es la coronaria derecha.** Pero ese diagnóstico es solo la mitad del trabajo: todo IAMCEST inferior necesita las **derivaciones derechas V3R/V4R de inmediato** (la afectación del VD cambia la medicación) y una mirada a V1–V3: un descenso con T positiva indica extensión posterior y pide V7–V9. Esta lección convierte esas tres preguntas en una rutina fija.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('rv-infarction', 862),
      emphasize: ['rv-basal', 'lv-basal-inferior', 'lv-mid-inferior'],
      caption: l(
        '在心脏上读这份下壁 STEMI：RCA 走行于右房室沟，先发出右心室缘支再绕到下壁——当闭塞位于**右心室支之前**，下壁与右心室游离壁（此处 rv-basal 亮起）一起缺血。右心室游离壁正对 V1 与右胸导联 V3R/V4R，所以它的损伤电流在那里表现为 ST 抬高。RCA 还发出房室结动脉：下壁 STEMI 出现缓慢心律时不必意外。',
        'Read this inferior STEMI on the heart: the RCA runs in the right AV groove and gives its RV marginal branches before reaching the inferior wall — when the occlusion sits **before the RV branches**, the inferior wall and the RV free wall (rv-basal lights up here) become ischaemic together. The RV free wall faces V1 and the right-sided leads V3R/V4R, so its injury current shows there as ST elevation. The RCA also gives the AV node artery: bradycardia in an inferior STEMI should be no surprise.',
        'Lee este IAMCEST inferior sobre el corazón: la coronaria derecha discurre por el surco auriculoventricular derecho y da sus ramas marginales del VD antes de llegar a la pared inferior; cuando la oclusión está **antes de las ramas del VD**, la pared inferior y la pared libre del VD (aquí se ilumina rv-basal) se isquemian juntas. La pared libre del VD mira a V1 y a las derivaciones derechas V3R/V4R, por eso su corriente de lesión se muestra allí como elevación del ST. La CD da también la arteria del nodo AV: la bradicardia en un IAMCEST inferior no debe sorprender.',
      ),
    },
    {
      kind: 'text',
      title: l('RCA 还是 LCx：两个读数', 'RCA or LCx: two readings', 'CD o Cx: dos lecturas'),
      body: l(
        '下壁由 RCA（约 90% 的心脏为右优势型）或 LCx 供血，两个读数把它们分开：\n- **III 与 II 谁更高**：III（+120°）比 II（+60°）更朝右。RCA 的损伤向量朝右下 ⇒ **ST↑ III > II**；LCx 的向量朝左下 ⇒ **ST↑ II ≥ III**。\n- **I 导联**：RCA ⇒ I（± aVL）镜像性 ST 压低；LCx ⇒ I 导联等电位，V5–V6 常同时抬高（aVL 仍可压低）。\n为什么要区分：只有 RCA 近段闭塞才累及右心室（V4R）；两支都可向后延伸；而 LCx 下壁梗死最响亮的线索可能就在侧壁或后壁导联。',
        'The inferior wall is fed by the RCA (about 90% of hearts are right-dominant) or by the LCx; two readings separate them:\n- **Which is taller, III or II?** III (+120°) looks further right than II (+60°). An RCA injury vector points right and down ⇒ **ST elevation III > II**; an LCx vector points left and down ⇒ **ST elevation II ≥ III**.\n- **Lead I**: RCA ⇒ mirror ST depression in I (± aVL); LCx ⇒ lead I isoelectric, and V5–V6 often elevate with it (aVL may stay depressed).\nWhy it matters: only a proximal RCA occlusion involves the right ventricle (V4R); both arteries can extend posteriorly; and in an LCx inferior MI the loudest clues may sit in the lateral or posterior leads.',
        'La pared inferior depende de la coronaria derecha (cerca del 90% de los corazones son de dominancia derecha) o de la circunfleja; dos lecturas las separan:\n- **¿Cuál está más elevada, III o II?** III (+120°) mira más a la derecha que II (+60°). El vector de lesión de la CD se dirige abajo y a la derecha ⇒ **elevación del ST III > II**; el de la Cx, abajo y a la izquierda ⇒ **elevación II ≥ III**.\n- **Derivación I**: CD ⇒ descenso especular del ST en I (± aVL); Cx ⇒ I isoeléctrica, y V5–V6 suelen elevarse con ella (aVL puede seguir descendida).\nPor qué importa: solo la oclusión proximal de la CD afecta al ventrículo derecho (V4R); ambas pueden extenderse hacia atrás; y en el infarto inferior por Cx las pistas más claras pueden estar en las derivaciones laterales o posteriores.',
      ),
    },
    {
      kind: 'criteria',
      title: l('下壁 STEMI：罪犯血管与附加导联', 'Inferior STEMI: culprit artery and extra leads', 'IAMCEST inferior: arteria responsable y derivaciones adicionales'),
      items: [
        {
          label: l('下壁 → RCA', 'Inferior → RCA', 'Inferior → CD'),
          value: l(
            'ST↑ III > II 伴 I（± aVL）ST↓；V1 抬高或 V4R 阳性 ⇒ 近端（右心室支之前）',
            'ST elevation III > II with ST depression in I (± aVL); V1 elevation or a positive V4R ⇒ proximal (before the RV branches)',
            'Elevación del ST III > II con descenso del ST en I (± aVL); elevación en V1 o V4R positivo ⇒ proximal (antes de las ramas del VD)',
          ),
        },
        {
          label: l('下壁 → LCx', 'Inferior → LCx', 'Inferior → Cx'),
          value: l(
            'ST↑ II ≥ III，I 导联等电位；V5–V6 常同时抬高（aVL 仍可压低）',
            'ST elevation II ≥ III with lead I isoelectric; V5–V6 often elevate too (aVL may stay depressed)',
            'Elevación del ST II ≥ III con I isoeléctrica; V5–V6 suelen elevarse también (aVL puede seguir descendida)',
          ),
        },
        {
          label: l('右心室受累（V3R/V4R）', 'RV involvement (V3R/V4R)', 'Afectación del VD (V3R/V4R)'),
          value: l(
            '每个下壁 STEMI 记录右胸导联：ST↑ ≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）；可伴 V1 抬高（有时 aVR ≥ 1 mm）；改变可短暂',
            'Record right-sided leads in every inferior STEMI: ST elevation ≥ 0.5 mm (≥ 1 mm in men < 30 y); V1 elevation (sometimes aVR ≥ 1 mm) can accompany it; the change can be transient',
            'Registra derivaciones derechas en todo IAMCEST inferior: elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 30 años); puede acompañarse de elevación en V1 (a veces aVR ≥ 1 mm); el cambio puede ser transitorio',
          ),
        },
        {
          label: l('后壁延伸（V7–V9）', 'Posterior extension (V7–V9)', 'Extensión posterior (V7–V9)'),
          value: l(
            'V1–V3 孤立性 ST↓ ≥ 0.5 mm 伴直立 T ⇒ 加做 V7–V9；ST↑ ≥ 0.5 mm（< 40 岁男性 ≥ 1 mm）证实',
            'Isolated ST depression ≥ 0.5 mm in V1–V3 with an upright T ⇒ record V7–V9; ST elevation ≥ 0.5 mm (≥ 1 mm in men < 40 y) confirms it',
            'Descenso aislado del ST ≥ 0,5 mm en V1–V3 con T positiva ⇒ registra V7–V9; la elevación ≥ 0,5 mm (≥ 1 mm en varones < 40 años) lo confirma',
          ),
        },
        {
          label: l('对应性改变（下壁 STEMI）', 'Reciprocal changes (inferior STEMI)', 'Cambios recíprocos (IAMCEST inferior)'),
          value: l(
            'I、aVL 镜像性 ST↓ 支持闭塞；合并后壁受累时 V1–V3 也压低',
            'Mirror ST depression in I and aVL supports occlusion; with posterior involvement V1–V3 depress too',
            'El descenso especular en I y aVL apoya la oclusión; con afectación posterior, V1–V3 descienden también',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826; Zehender M et al. Right ventricular infarction as an independent predictor of prognosis. N Engl J Med 1993;328:981-988',
    },
    {
      kind: 'worked',
      title: l('从 II、III、aVF 到 V4R：四步', 'From II, III, aVF to V4R in four steps', 'De II, III, aVF a V4R en cuatro pasos'),
      ecg: synth('rv-infarction', 863, undefined, undefined, ['V3R', 'V4R']),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('确认相邻组', 'Confirm the contiguous group', 'Confirma el grupo contiguo'),
          body: l(
            'II、III、aVF 的 J 点抬高（III 最高）：下壁相邻组 ⇒ **下壁 STEMI**。诊断到此只完成一半——继续问哪支动脉、有没有延伸。',
            'The J point is elevated in II, III and aVF (III the tallest): the inferior contiguous group ⇒ an **inferior STEMI**. Half done — keep asking which artery and which extension.',
            'El punto J está elevado en II, III y aVF (III la mayor): el grupo contiguo inferior ⇒ **IAMCEST inferior**. La mitad del trabajo está hecha: sigue preguntando qué arteria y qué extensión.',
          ),
          marks: [
            { auto: 'st', lead: 'III' },
            { auto: 'st', lead: 'II' },
            { auto: 'st', lead: 'aVF' },
          ],
          highlightLeads: ['II', 'III', 'aVF'],
        },
        {
          title: l('III 对比 II，再看 I', 'Compare III with II, then look at I', 'Compara III con II y mira I'),
          body: l(
            'ST↑ **III > II**，且 **I、aVL 镜像性压低**：损伤向量朝右下 ⇒ **RCA**。若是 II ≥ III 且 I 等电位，答案就是 LCx，侧壁导联会加入——这里不是。',
            'ST elevation **III > II** with **mirror depression in I and aVL**: the injury vector points right and down ⇒ **RCA**. Had it been II ≥ III with lead I isoelectric, the answer would be the LCx and the lateral leads would join in — not here.',
            'Elevación del ST **III > II** con **descenso especular en I y aVL**: el vector de lesión se dirige abajo y a la derecha ⇒ **coronaria derecha**. Si fuera II ≥ III con I isoeléctrica, la respuesta sería la Cx y se sumarían las laterales; aquí no.',
          ),
          marks: [
            { auto: 'st60', lead: 'III' },
            { auto: 'st60', lead: 'II' },
            { auto: 'st60', lead: 'I' },
          ],
          highlightLeads: ['I', 'II', 'III', 'aVL'],
        },
        {
          title: l('加做 V4R', 'Add V4R', 'Añade V4R'),
          body: l(
            'RCA 已定位，还要问闭塞在右心室支之前还是之后。V1 本身已抬高（正常 V1 的 ST 轻微压低或等电位）——这是右心室游离壁损伤的第一个线索。切到 V4R：**ST 抬高 ≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）= 右心室受累**。',
            'The RCA is named; now ask whether the occlusion sits before or after its RV branches. V1 itself is elevated (normally the ST in V1 is slightly depressed or isoelectric) — the first clue of RV free-wall injury. Switch to V4R: **ST elevation ≥ 0.5 mm (≥ 1 mm in men < 30 y) = right ventricular involvement**.',
            'La CD está identificada; ahora pregunta si la oclusión está antes o después de sus ramas para el VD. La propia V1 está elevada (normalmente el ST en V1 está ligeramente descendido o isoeléctrico): la primera pista de lesión de la pared libre del VD. Cambia a V4R: **elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 30 años) = afectación del ventrículo derecho**.',
          ),
          view: { layout: 'single', lead: 'V4R' },
          marks: [{ auto: 'st', lead: 'V4R' }],
        },
        {
          title: l('命名与行动', 'Name it and act', 'Nómbralo y actúa'),
          body: l(
            '**下壁 STEMI + 右心室受累 = 近段 RCA（右心室支之前）**。① 立即再灌注；② 右心室依赖前负荷——**硝酸酯类谨慎**，低血压先补液；③ 房室结动脉通常来自 RCA——准备应对窦缓、房室传导阻滞，甚至临时起搏。V4R 的改变可能短暂，别推迟记录。',
            '**Inferior STEMI + RV involvement = proximal RCA (before the RV branches)**. ① Reperfusion now; ② the right ventricle is preload-dependent — **be careful with nitrates**, fluids first for hypotension; ③ the AV node artery usually comes from the RCA — expect sinus bradycardia and AV block, and be ready to pace. V4R changes can be transient: do not delay the recording.',
            '**IAMCEST inferior + afectación del VD = CD proximal (antes de las ramas del VD)**. ① Reperfusión ya; ② el VD depende de la precarga: **cautela con los nitratos**, volumen primero si hay hipotensión; ③ la arteria del nodo AV suele nacer de la CD: espera bradicardia sinusal y bloqueo AV, y prepárate para marcapasos. Los cambios en V4R pueden ser transitorios: no retrases el registro.',
          ),
          view: { layout: '3x4+1' },
          highlightLeads: ['II', 'III', 'aVF'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('下壁 STEMI 的两个去向', 'Two destinations for an inferior STEMI', 'Dos destinos para un IAMCEST inferior'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('stemi-inferior', 864),
        caption: l('A：ST↑ III > II，I 导联 ST 压低 ⇒ RCA', 'A: ST elevation III > II with ST depression in I ⇒ RCA', 'A: elevación del ST III > II con descenso del ST en I ⇒ CD'),
        marks: [
          { auto: 'st', lead: 'III' },
          { auto: 'st', lead: 'II' },
          { auto: 'st', lead: 'I' },
        ],
      },
      right: {
        ecg: synth('stemi-inferior', 865, undefined, 'lcx'),
        caption: l('B：ST↑ II ≥ III，I 导联等电位 ⇒ LCx', 'B: ST elevation II ≥ III with lead I isoelectric ⇒ LCx', 'B: elevación del ST II ≥ III con I isoeléctrica ⇒ Cx'),
        marks: [
          { auto: 'st', lead: 'III' },
          { auto: 'st', lead: 'II' },
          { auto: 'st', lead: 'I' },
        ],
      },
      point: l(
        '两张都是下壁 STEMI，下一步却不同。A（RCA）：**现在就记录 V3R/V4R**——右心室受累意味着近段闭塞，硝酸酯类要谨慎，还要警惕缓慢性心律与房室传导阻滞（房室结动脉通常来自 RCA）。B（LCx）：右心室不受累（右心室支来自 RCA），但要细读 I/aVL、V5–V6，并想到后壁——LCx 的梗死向侧壁和背侧延伸。',
        'Both are inferior STEMIs, but the next step differs. A (RCA): **record V3R/V4R now** — RV involvement means a proximal occlusion, nitrates need caution, and bradyarrhythmias and AV block are on the watch list (the AV node artery usually comes from the RCA). B (LCx): the right ventricle is spared (the RV branches come from the RCA), but read I/aVL and V5–V6 carefully and think of the back — an LCx infarct extends lateral and posterior.',
        'Ambos son IAMCEST inferiores, pero el paso siguiente es distinto. A (CD): **registra V3R/V4R ahora**: la afectación del VD indica oclusión proximal, los nitratos exigen cautela y hay que vigilar bradiarritmias y bloqueo AV (la arteria del nodo AV suele nacer de la CD). B (Cx): el VD se libra (las ramas del VD nacen de la CD), pero lee con calma I/aVL y V5–V6 y piensa en la cara posterior: el infarto por Cx se extiende hacia el lateral y hacia atrás.',
      ),
    },
    {
      kind: 'text',
      title: l('右心室受累时的三个临床动作', 'Three clinical moves when the RV is involved', 'Tres acciones clínicas cuando afecta al VD'),
      body: l(
        '- **前负荷**：右心室梗死依赖足够的前负荷；硝酸酯类（以及利尿剂）可引起严重低血压。低血压而**肺部清晰**的病人先补液，再考虑升压药。\n- **预后**：右心室受累是下壁梗死预后不良的**独立预测因子**（Zehender 1993：更高的住院死亡率与并发症）——“下壁梗死是良性的”是个迷思。\n- **传导**：房室结动脉通常来自 RCA——窦缓、一度到三度房室传导阻滞都常见，可能需要临时起搏；传导阻滞多集中在最初 24 小时。\n- **时间窗**：V4R 的 ST 抬高可能只持续数小时——**胸痛还在时就记录**，别等。',
        '- **Preload**: an RV infarct depends on adequate preload; nitrates (and diuretics) can cause severe hypotension. A hypotensive patient with **clear lungs** needs fluids first, vasopressors second.\n- **Prognosis**: RV involvement is an **independent predictor** of poor outcome in inferior MI (Zehender 1993: higher in-hospital mortality and complications) — the "inferior MI is benign" idea is a myth.\n- **Conduction**: the AV node artery usually comes from the RCA — sinus bradycardia and first- to third-degree AV block are all common, temporary pacing may be needed, and blocks cluster in the first 24 hours.\n- **Time window**: V4R ST elevation can last only a few hours — **record it while the pain is still on**, not later.',
        '- **Precarga**: el infarto del VD depende de una precarga suficiente; los nitratos (y los diuréticos) pueden provocar hipotensión grave. Un paciente hipotenso con **campos pulmonares limpios** necesita primero volumen y después vasopresores.\n- **Pronóstico**: la afectación del VD es un **predictor independiente** de mal pronóstico en el infarto inferior (Zehender 1993: mayor mortalidad y complicaciones hospitalarias): la idea de que «el infarto inferior es benigno» es un mito.\n- **Conducción**: la arteria del nodo AV suele nacer de la CD: la bradicardia sinusal y los bloqueos AV de primer a tercer grado son frecuentes, puede necesitarse marcapasos temporal, y los bloqueos se concentran en las primeras 24 horas.\n- **Ventana temporal**: la elevación del ST en V4R puede durar solo unas horas: **regístrala mientras dura el dolor**, no después.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('stemi-inferior', 866, undefined, 'posterior'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3'] },
      marks: [
        { auto: 'st', lead: 'II' },
        { auto: 'st', lead: 'III' },
        { auto: 'st', lead: 'V2' },
        { auto: 't', lead: 'V2' },
      ],
      caption: l(
        '下壁 STEMI 的第二个延伸方向：除 II、III、aVF 抬高外，**V1–V4 呈水平型 ST 压低**，V3 最深（V3 的 T 波直立）——这不是“前壁缺血”，而是**后壁受累的镜像**（后壁背对 V1–V3）。再用本课的规则：这里 III > II，I、aVL 压低，V5–V6 不抬高——优势型 RCA 连同其后侧支一起闭塞：下后壁。此时加做 **V7–V9**：ST 抬高 ≥ 0.5 mm（< 40 岁男性 ≥ 1 mm）证实后壁闭塞；治疗上仍按 STEMI（第 i6 课深入讲解后壁）。',
        'The second direction an inferior STEMI extends: alongside the elevation in II, III and aVF, **V1–V4 show horizontal ST depression**, deepest in V3 (upright T in V3) — not "anterior ischaemia" but the **mirror of posterior involvement** (the posterior wall faces away from V1–V3). Apply this lesson\'s rule too: here III > II, I and aVL are depressed and V5–V6 are not elevated — a dominant RCA whose posterolateral branch also feeds the back wall: inferoposterior. Record **V7–V9**: ST elevation ≥ 0.5 mm (≥ 1 mm in men < 40 y) confirms posterior occlusion; it is still managed as a STEMI (lesson i6 goes deeper into the posterior wall).',
        'La segunda dirección de extensión del IAMCEST inferior: además de la elevación en II, III y aVF, **V1–V4 muestran descenso horizontal del ST**, máximo en V3 (T positiva en V3) — no es «isquemia anterior», sino la **imagen especular de la afectación posterior** (la pared posterior mira al lado opuesto de V1–V3). Aplica también la regla de esta lección: aquí III > II, I y aVL están descendidas y V5–V6 no se elevan: una CD dominante cuya rama posterolateral irriga también la cara posterior: inferoposterior. Registra entonces **V7–V9**: la elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 40 años) confirma la oclusión posterior; sigue tratándose como un IAMCEST (la lección i6 desarrolla la pared posterior).',
      ),
    },
    { kind: 'check', item: { family: 'territory', seed: 37 } },
    { kind: 'check', item: { family: 'territory', seed: 8 } },
    { kind: 'check', item: { family: 'occlusion', seed: 14 } },
    { kind: 'drill', families: ['territory', 'occlusion'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [6683, 15227, 17772],
      caption: l(
        '三份真实的下壁梗死：69 岁和 52 岁女性（数据库分期 II–III，陈旧）、63 岁男性（时期不明）。它们是 Q 波梗死，不是急性 STEMI：RCA/LCx 的 ST 规则和 V4R 只用于急性抬高，对陈旧梗死没有意义。这里练的是慢性版本：在 II、III、aVF 找病理性 Q 波（≥ 30 ms、≥ 1 mm），并说出“RCA（多数）或 LCx”；第三份再看 V1–V2——R 波偏高、T 波直立，可能是陈旧后壁梗死的 Q 波等价物（第 i6 课）。先想好答案再揭晓。',
        'Three real inferior infarcts: women of 69 and 52 (database stage II–III, old) and a man of 63 (age unknown). They are Q-wave infarcts, not acute STEMIs: the RCA/LCx ST rules and V4R belong to acute elevation and mean nothing in an old infarct. Practise the chronic version instead: find the pathological Q waves in II, III and aVF (≥ 30 ms and ≥ 1 mm) and name "RCA (most) or LCx"; in the third, look at V1–V2 as well — a prominent R with an upright T can be the Q-wave equivalent of an old posterior infarct (lesson i6). Commit to an answer, then reveal.',
        'Tres infartos inferiores reales: mujeres de 69 y 52 años (estadio II–III de la base de datos, antiguos) y un varón de 63 (antigüedad desconocida). Son infartos con onda Q, no IAMCEST agudos: las reglas CD/Cx del ST y la V4R pertenecen a la elevación aguda y no significan nada en un infarto antiguo. Practica la versión crónica: busca las ondas Q patológicas en II, III y aVF (≥ 30 ms y ≥ 1 mm) y di «CD (la mayoría) o Cx»; en el tercero mira además V1–V2: una R prominente con T positiva puede ser el equivalente de onda Q de un infarto posterior antiguo (lección i6). Decide tu respuesta y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '右胸导联从未记录：每个下壁 STEMI 都要加做 V3R/V4R，而且 ST 抬高可能只持续数小时——趁胸痛还在。',
          'The right-sided leads never recorded: every inferior STEMI needs V3R/V4R, and the ST elevation may last only hours — record while the pain is on.',
          'Las derivaciones derechas nunca se registran: todo IAMCEST inferior necesita V3R/V4R, y la elevación del ST puede durar solo unas horas: regístrala mientras dura el dolor.',
        ),
        l(
          '右心室梗死照给硝酸酯类：右心室依赖前负荷，硝酸酯可引起严重低血压——先看 V4R 和肺部。',
          'Giving nitrates despite an RV infarct: the RV is preload-dependent and nitrates can drop the pressure hard — check V4R and the lungs first.',
          'Dar nitratos pese a un infarto del VD: el VD depende de la precarga y los nitratos pueden provocar una hipotensión grave; mira primero V4R y los pulmones.',
        ),
        l(
          '相信“下壁梗死是良性的”：右心室受累与房室传导阻滞都是预后更差的独立标志。',
          'Trusting "inferior MI is benign": RV involvement and AV block are both independent markers of worse outcome.',
          'Creer que «el infarto inferior es benigno»: la afectación del VD y el bloqueo AV son marcadores independientes de peor pronóstico.',
        ),
        l(
          'LCx 下壁梗死只看 II、III、aVF：侧壁（I/aVL、V5–V6）与后壁（V7–V9）的线索被跳过。',
          'Reading only II, III and aVF in an LCx inferior MI: the lateral (I/aVL, V5–V6) and posterior (V7–V9) clues get skipped.',
          'Leer solo II, III y aVF en el infarto inferior por Cx: se saltan las pistas laterales (I/aVL, V5–V6) y posteriores (V7–V9).',
        ),
        l(
          '把 V1–V3 压低自动报告为“前壁缺血”：它是后壁的镜像，处理按 STEMI 而不是按缺血。',
          'Auto-calling V1–V3 depression "anterior ischaemia": it is the posterior mirror, and it is managed as a STEMI, not as ischaemia.',
          'Reportar de forma automática el descenso en V1–V3 como «isquemia anterior»: es la imagen especular posterior y se trata como un IAMCEST, no como isquemia.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '下壁 STEMI 先问哪支动脉：ST↑ III > II + ST↓ I ⇒ RCA；ST↑ II ≥ III、I 等电位 ⇒ LCx。',
          'Ask the artery first in an inferior STEMI: ST elevation III > II + ST depression in I ⇒ RCA; II ≥ III with I isoelectric ⇒ LCx.',
          'Pregunta primero la arteria en el IAMCEST inferior: elevación III > II + descenso en I ⇒ CD; II ≥ III con I isoeléctrica ⇒ Cx.',
        ),
        l(
          '每个下壁 STEMI 立即记录 V3R/V4R：ST↑ ≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）= 右心室受累 = 近段 RCA。',
          'Record V3R/V4R at once in every inferior STEMI: ST elevation ≥ 0.5 mm (≥ 1 mm in men < 30 y) = RV involvement = proximal RCA.',
          'Registra V3R/V4R de inmediato en todo IAMCEST inferior: elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 30 años) = afectación del VD = CD proximal.',
        ),
        l(
          '右心室梗死依赖前负荷：硝酸酯谨慎、低血压先补液；房室结动脉通常来自 RCA——准备应对传导阻滞。',
          'An RV infarct is preload-dependent: nitrates with care, fluids first for hypotension; the AV node artery usually comes from the RCA — be ready for block.',
          'El infarto del VD depende de la precarga: nitratos con cautela y volumen primero si hay hipotensión; la arteria del nodo AV suele nacer de la CD: prepárate para el bloqueo.',
        ),
        l(
          'V1–V3 压低 + 直立 T = 后壁镜像：加做 V7–V9（≥ 0.5 mm，< 40 岁男性 ≥ 1 mm），按 STEMI 处理。',
          'V1–V3 depression + upright T = posterior mirror: add V7–V9 (≥ 0.5 mm; ≥ 1 mm in men < 40 y) and manage as a STEMI.',
          'Descenso en V1–V3 + T positiva = imagen especular posterior: añade V7–V9 (≥ 0,5 mm; ≥ 1 mm en varones < 40 años) y trátalo como IAMCEST.',
        ),
        l(
          '下壁不等于低危：右心室受累与传导阻滞抬高死亡率，识别它们会改变处理。',
          'Inferior does not mean low risk: RV involvement and conduction block raise mortality, and recognising them changes management.',
          'Inferior no significa bajo riesgo: la afectación del VD y el bloqueo AV aumentan la mortalidad, y reconocerlos cambia el manejo.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Zehender M et al. Right ventricular infarction as an independent predictor of prognosis. N Engl J Med 1993;328:981-988',
    'Castellano et al. 2004',
  ],
};

export default lesson;
