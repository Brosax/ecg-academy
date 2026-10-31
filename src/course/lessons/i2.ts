/**
 * i2 — Territories and the culprit artery (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `mi-territories`, `coronary-supply`, `rca-vs-cx`, `rv-infarction`,
 * `posterior-mi` and the "Missing in the book" bullet "Supplemental leads" (V3R/V4R, V7–V9 thresholds).
 * Extra leads: the local synth helper takes an optional extraLeads argument (the s3.ts helper does not), so V4R and
 * V8 can be shown and marked once the request records them.
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
const STRIP = { layout: 'strip', lead: 'II' } as const;

const lesson: Lesson = {
  id: 'i2',
  stage: 'I',
  order: 2,
  title: l('供血区域与罪犯血管', 'Territories and the culprit artery', 'Territorios y la arteria responsable'),
  summary: l(
    '抬高的导联组合不是口诀而是解剖：每面心壁由一支冠状动脉供血，LAD、RCA、LCx 各对应一组导联。本课建立“导联 → 心壁 → 罪犯血管”的地图，并练习下壁 STEMI 的 RCA/LCx 鉴别与附加导联。',
    'The group of elevated leads is anatomy, not a mnemonic: each wall of the heart is fed by one coronary artery, and LAD, RCA and LCx each map onto one group of leads. This lesson builds the map "leads → wall → culprit artery" and drills the RCA/LCx question and the extra leads in inferior STEMI.',
    'El grupo de derivaciones con elevación es anatomía, no una regla mnemotécnica: cada pared del corazón depende de una arteria coronaria, y la DA, la CD y la Cx se corresponden cada una con un grupo de derivaciones. Esta lección construye el mapa «derivaciones → pared → arteria responsable» y entrena la distinción CD/Cx y las derivaciones adicionales del IAMCEST inferior.',
  ),
  objectives: [
    l(
      '把 ST 抬高的相邻导联组对应到心壁：前壁、下壁、侧壁、后壁、右心室。',
      'Map a group of contiguous leads with ST elevation onto a wall of the heart: anterior, inferior, lateral, posterior, right ventricle.',
      'Relacionar un grupo de derivaciones contiguas con elevación del ST con una pared del corazón: anterior, inferior, lateral, posterior y ventrículo derecho.',
    ),
    l('在下壁 STEMI 中用 ST 形态鉴别 RCA 与 LCx。', 'Use the ST pattern to tell RCA from LCx in an inferior STEMI.', 'Distinguir la CD de la Cx en un IAMCEST inferior mediante el patrón del ST.'),
    l('说出何时记录 V3R/V4R 与 V7–V9，并记住其诊断阈值。', 'Say when to record V3R/V4R and V7–V9, and quote their thresholds.', 'Indicar cuándo registrar V3R/V4R y V7-V9 y citar sus umbrales diagnósticos.'),
    l('为一份 STEMI 说出“区域 + 罪犯血管”并决定下一步。', 'Name "territory + culprit artery" for a STEMI and decide the next step.', 'Nombrar «territorio + arteria responsable» de un IAMCEST y decidir el paso siguiente.'),
  ],
  minutes: 14,
  competencies: ['C8'],
  findings: ['stemi-anterior', 'stemi-inferior', 'stemi-lateral', 'stemi-posterior', 'rv-infarction'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-inferior', 821),
      view: STRIP,
      question: l(
        '一颗心脏、三支冠状动脉树。先只看这一条 II 导联：正在受伤的是哪面心壁？罪犯血管最可能是哪一支？下一步必须加做哪些导联？先想好你的答案。',
        'One heart, three coronary trees. From this single lead II: which wall is injuring? Which artery is the most likely culprit? And which leads must you record next? Commit to an answer.',
        'Un corazón, tres árboles coronarios. Con esta única derivación II: ¿qué pared está lesionándose? ¿Cuál es la arteria responsable más probable? ¿Y qué derivaciones hay que registrar a continuación? Decide tu respuesta antes de seguir.',
      ),
      reveal: l(
        'II 导联正对**下壁**：这里的 ST 抬高提示下壁损伤——单一导联不能诊断 STEMI，要在同组的 III、aVF 上确认（完整 12 导联上它们都抬高，I、aVL 呈镜像压低）。下壁几乎总由 **RCA** 供血（约 90% 的心脏由它发出后降支），**LCx** 是替代罪犯。而每个下壁 STEMI 都必须立即加做**右胸导联 V3R/V4R**——看完下一屏的地图你就知道为什么。',
        'Lead II faces the **inferior wall**: ST elevation here points to inferior injury — one lead never makes a STEMI, so confirm it in III and aVF, the same contiguous group (on the full 12 leads both are elevated and I/aVL show the mirror). The inferior wall is fed by the **RCA** in about 90% of hearts (it gives the posterior descending artery); the **LCx** is the alternative culprit. And every inferior STEMI needs the **right-sided leads V3R/V4R** recorded at once — the map on the next screen shows why.',
        'La derivación II mira a la **pared inferior**: la elevación del ST aquí indica lesión inferior; una sola derivación nunca basta para un IAMCEST, así que confírmalo en III y aVF, del mismo grupo contiguo (en las 12 derivaciones ambas están elevadas e I/aVL muestran el espejo). La pared inferior depende de la **coronaria derecha** en cerca del 90% de los corazones (de ella nace la descendente posterior); la **circunfleja** es la alternativa. Y en todo IAMCEST inferior hay que registrar de inmediato las **derivaciones derechas V3R/V4R**: el mapa de la siguiente pantalla explica por qué.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'territories' },
      caption: l(
        '点击每个供血区域：动脉（前位观）→ 心壁（短轴切面）→ 导联组。前降支 LAD 走行于前室间沟 → V1–V4；右冠状动脉 RCA 走行于右房室沟 → II、III、aVF；回旋支 LCx 走行于左房室沟 → I、aVL、V5–V6（以及背面的 V7–V9）。',
        'Tap each territory: artery (anterior view) → wall (short-axis slice) → lead group. The LAD runs in the anterior interventricular groove → V1–V4; the RCA in the right AV groove → II, III, aVF; the LCx in the left AV groove → I, aVL, V5–V6 (and V7–V9 around the back).',
        'Toca cada territorio: arteria (vista anterior) → pared (corte de eje corto) → grupo de derivaciones. La descendente anterior discurre por el surco interventricular anterior → V1-V4; la coronaria derecha, por el surco auriculoventricular derecho → II, III, aVF; la circunfleja, por el surco auriculoventricular izquierdo → I, aVL, V5-V6 (y V7-V9 por detrás).',
      ),
    },
    {
      kind: 'text',
      title: l('三支树，一面心壁一支', 'Three trees, one wall each', 'Tres árboles, una pared cada uno'),
      body: l(
        '- **LAD（前降支）**：前壁与室间隔 → V1–V4；近段闭塞可累及 V1–V6 ± I/aVL（广泛前壁）。\n- **RCA（右冠状动脉）**：下壁与右心室 → II、III、aVF、V3R/V4R（± V1）；约 90% 的心脏为右优势型（后降支来自 RCA）。\n- **LCx（回旋支）**：侧壁与后壁 → I、aVL、V5–V6、V7–V9；它面向“电安静”区，梗死常不典型或只表现为镜像。\n- RCA 还发出窦房结动脉（约 55%）与房室结动脉：下壁 STEMI 要警惕缓慢心律与房室传导阻滞（见第 i4 课）。',
        '- **LAD**: anterior wall and septum → V1–V4; a proximal occlusion can reach V1–V6 ± I/aVL (extensive anterior).\n- **RCA**: inferior wall and right ventricle → II, III, aVF, V3R/V4R (± V1); about 90% of hearts are right-dominant (the posterior descending artery comes from the RCA).\n- **LCx**: lateral and posterior walls → I, aVL, V5–V6, V7–V9; it faces electrically quiet territory, so its infarcts are often subtle or pure mirror images.\n- The RCA also gives the sinus node artery (about 55%) and the AV node artery: expect bradycardia and AV block in inferior STEMI (lesson i4).',
        '- **Descendente anterior (DA)**: pared anterior y tabique → V1-V4; una oclusión proximal puede alcanzar V1-V6 ± I/aVL (anterior extenso).\n- **Coronaria derecha (CD)**: pared inferior y ventrículo derecho → II, III, aVF, V3R/V4R (± V1); cerca del 90% de los corazones son de dominancia derecha (la descendente posterior nace de la CD).\n- **Circunfleja (Cx)**: paredes lateral y posterior → I, aVL, V5-V6, V7-V9; mira a territorio «eléctricamente silente», por lo que sus infartos son a menudo sutiles o pura imagen especular.\n- La CD da también la rama del nodo sinusal (≈55%) y la del nodo AV: espera bradicardia y bloqueo AV en el IAMCEST inferior (lección i4).',
      ),
    },
    {
      kind: 'criteria',
      title: l('区域 ↔ 导联 ↔ 动脉', 'Territory ↔ leads ↔ artery', 'Territorio ↔ derivaciones ↔ arteria'),
      items: [
        {
          label: l('前壁 / 前间壁', 'Anterior / anteroseptal', 'Anterior / anteroseptal'),
          value: l('V1–V4（室间隔 V1–V2）→ LAD', 'V1–V4 (septal V1–V2) → LAD', 'V1-V4 (septal V1-V2) → DA'),
        },
        {
          label: l('广泛前壁', 'Extensive anterior', 'Anterior extenso'),
          value: l('V1–V6 ± I/aVL → LAD 近段', 'V1–V6 ± I/aVL → proximal LAD', 'V1-V6 ± I/aVL → DA proximal'),
        },
        {
          label: l('下壁', 'Inferior', 'Inferior'),
          value: l('II、III、aVF → RCA（多数）或 LCx', 'II, III, aVF → RCA (most) or LCx', 'II, III, aVF → CD (la mayoría) o Cx'),
        },
        {
          label: l('侧壁', 'Lateral', 'Lateral'),
          value: l(
            'I、aVL（高侧壁）、V5–V6（低侧壁）→ LCx / 钝缘支',
            'I, aVL (high) and V5–V6 (low) → LCx / obtuse marginal',
            'I, aVL (alta) y V5-V6 (baja) → Cx / marginal obtusa',
          ),
        },
        {
          label: l('后壁', 'Posterior', 'Posterior'),
          value: l(
            'V1–V3 镜像性 ST 压低；V7–V9 直接抬高',
            'Mirror ST depression in V1–V3; direct elevation in V7–V9',
            'Descenso especular del ST en V1-V3; elevación directa en V7-V9',
          ),
        },
        {
          label: l('右心室', 'Right ventricle', 'Ventrículo derecho'),
          value: l(
            'V3R、V4R（± V1）→ RCA 近段（右心室支之前）',
            'V3R, V4R (± V1) → proximal RCA (before the RV branches)',
            'V3R, V4R (± V1) → CD proximal (antes de las ramas del VD)',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826; Bayés de Luna A et al. Circulation 2006;114:1755-1760',
    },
    {
      kind: 'worked',
      title: l('从导联到动脉：四步命名', 'From leads to artery: name it in four steps', 'De las derivaciones a la arteria: nómbrala en cuatro pasos'),
      ecg: synth('stemi-anteroseptal', 822),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('找最大 ST 抬高', 'Find the greatest ST elevation', 'Busca la mayor elevación del ST'),
          body: l(
            '在胸前导联找 J 点抬高最明显的导联（这里最高的是 V2）。',
            'Find the lead with the clearest J-point elevation among the chest leads (here the tallest is V2).',
            'Busca la derivación con mayor ascenso del punto J entre las precordiales (aquí la mayor es V2).',
          ),
          marks: [{ auto: 'st60', lead: 'V2' }],
          highlightLeads: ['V1', 'V2', 'V3', 'V4'],
        },
        {
          title: l('分组相邻导联', 'Group the contiguous leads', 'Agrupa las derivaciones contiguas'),
          body: l(
            'V1–V3 抬高（V4 仅约 0.5 mm）：前间壁组。患者为 64 岁女性，V2–V3 界值 1.5 mm：V2 约 2.5 mm、V3 约 2 mm，均超过。V5–V6 与 I/aVL 不在其中——不是广泛前壁。',
            'V1–V3 are elevated (V4 only about 0.5 mm): the anteroseptal group. The patient is a woman of 64, so the V2–V3 limit is 1.5 mm: V2 at about 2.5 mm and V3 at about 2 mm both exceed it. V5–V6 and I/aVL are spared — not an extensive anterior MI.',
            'V1-V3 están elevadas (V4 apenas 0,5 mm): el grupo anteroseptal. La paciente es una mujer de 64 años, así que el límite en V2-V3 es 1,5 mm: V2, con unos 2,5 mm, y V3, con unos 2 mm, lo superan. V5-V6 e I/aVL se libran: no es un anterior extenso.',
          ),
          highlightLeads: ['V1', 'V2', 'V3', 'V5', 'V6', 'I', 'aVL'],
        },
        {
          title: l('查镜像导联', 'Check the mirror leads', 'Mira las derivaciones especulares'),
          body: l(
            '下壁导联（II、III、aVF）可出现对应性压低——找到它更支持闭塞；即使轻微或缺如，定位仍以直接导联为准。',
            'The inferior leads (II, III, aVF) may show reciprocal depression — finding it supports occlusion; even when it is subtle or absent, localisation rests on the direct leads.',
            'Las derivaciones inferiores (II, III, aVF) pueden mostrar descenso recíproco: encontrarlo apoya la oclusión; aun siendo sutil o ausente, la localización se basa en las derivaciones directas.',
          ),
          marks: [{ auto: 'st', lead: 'II' }],
          highlightLeads: ['II', 'III', 'aVF'],
        },
        {
          title: l('命名并行动', 'Name it and act', 'Nómbralo y actúa'),
          body: l(
            '**前间壁 STEMI → LAD（间隔支区域）**。前壁意味着危险心肌面积大：立即按 STEMI 流程启动再灌注（导管室），不要等待。',
            '**Anteroseptal STEMI → LAD (septal branch territory)**. An anterior territory means a large myocardium at risk: start the reperfusion pathway (cath lab) now, without waiting.',
            '**IAMCEST anteroseptal → DA (territorio de las ramas septales)**. Un territorio anterior implica gran masa miocárdica en riesgo: activa ya la vía de reperfusión (sala de hemodinámica), sin esperar.',
          ),
          highlightLeads: ['V1', 'V2', 'V3', 'V4'],
        },
      ],
    },
    {
      kind: 'heart',
      ecg: synth('stemi-inferior', 823),
      emphasize: ['lv-mid-inferior', 'lv-basal-inferior'],
      caption: l(
        '同一张下壁 STEMI，换到心脏上读：播放一个心动周期，下壁节段亮起——RCA 走行的右房室沟就在这些节段旁边。II、III、aVF 从下方正对这面墙，所以损伤电流把它们的 ST 段抬起来。',
        'The same inferior STEMI, read on the heart: play one beat and the inferior segments light up — the RCA runs in the right AV groove beside them. II, III and aVF face this wall from below, so the injury current lifts their ST segments.',
        'El mismo IAMCEST inferior, leído sobre el corazón: reproduce un latido y se iluminan los segmentos inferiores; la CD discurre por el surco auriculoventricular derecho, a su lado. II, III y aVF miran a esa pared desde abajo, por eso la corriente de lesión eleva su segmento ST.',
      ),
    },
    {
      kind: 'contrast',
      title: l('下壁 STEMI：RCA 还是 LCx？', 'Inferior STEMI: RCA or LCx?', 'IAMCEST inferior: ¿CD o Cx?'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('stemi-inferior', 824),
        caption: l('A：ST↑ III > II，且 I 导联 ST 压低 → RCA', 'A: ST elevation III > II with ST depression in I → RCA', 'A: elevación del ST III > II con descenso del ST en I → CD'),
        marks: [
          { auto: 'st', lead: 'III' },
          { auto: 'st', lead: 'II' },
          { auto: 'st', lead: 'I' },
        ],
      },
      right: {
        ecg: synth('stemi-inferior', 825, undefined, 'lcx'),
        caption: l('B：ST↑ II ≥ III，I 导联等电位 → LCx（侧壁导联加入）', 'B: ST elevation II ≥ III with lead I isoelectric → LCx (the lateral leads join in)', 'B: elevación del ST II ≥ III con I isoeléctrica → Cx (se suman las derivaciones laterales)'),
        marks: [
          { auto: 'st', lead: 'III' },
          { auto: 'st', lead: 'II' },
          { auto: 'st', lead: 'I' },
        ],
      },
      point: l(
        'III 比 II 更指向右侧（+120° 对 +60°）：RCA 的损伤向量朝右下，所以 **III > II 且 I 导联压低**；LCx 的向量朝左下，所以 **II ≥ III 且 I 导联等电位**，V5–V6 常同时抬高（aVL 仍可压低）。A 提出右心室是否受累的问题（下一屏）；B 提醒：LCx 下壁梗死时侧壁导联不能漏看。',
        'III points further right than II (+120° vs +60°): an RCA injury vector aims right and down, so **III > II with depression in I**; an LCx vector aims left and down, so **II ≥ III with I isoelectric**, and V5–V6 often elevate too (aVL may stay depressed). A raises the question of RV involvement (next screen); B is the reminder not to skip the lateral leads in an LCx inferior MI.',
        'III mira más a la derecha que II (+120° frente a +60°): el vector de lesión de la CD se dirige abajo y a la derecha, de modo que **III > II con descenso en I**; el de la Cx, abajo y a la izquierda: **II ≥ III con I isoeléctrica**, y V5-V6 suelen elevarse también (aVL puede seguir descendida). A plantea la afectación del ventrículo derecho (siguiente pantalla); B recuerda que en el infarto inferior por Cx no hay que saltarse las laterales.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('rv-infarction', 826, undefined, undefined, ['V3R', 'V4R']),
      view: { layout: 'single', lead: 'V4R' },
      marks: [{ auto: 'st', lead: 'V4R' }],
      caption: l(
        '还是下壁 STEMI（II、III、aVF 抬高，V1 也高）。把导联切换到 V4R——右侧第 5 肋间隙锁骨中线，V4 的镜像。**ST 抬高 ≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）= 右心室受累**：近端 RCA。每个下壁 STEMI 都要记录这根导联。',
        'Still an inferior STEMI (elevation in II, III, aVF and V1 as well). Switch the lead picker to V4R — the 5th right intercostal space, midclavicular line, the mirror of V4. **ST elevation ≥ 0.5 mm (≥ 1 mm in men < 30 y) = right ventricular involvement**: proximal RCA. Record this lead in every inferior STEMI.',
        'Sigue siendo un IAMCEST inferior (elevación en II, III, aVF y también en V1). Cambia la derivación a V4R: 5.º espacio intercostal derecho, línea medioclavicular, la imagen especular de V4. **Elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 30 años) = afectación del ventrículo derecho**: CD proximal. Registra esta derivación en todo IAMCEST inferior.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('stemi-posterior', 827),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'I', 'aVL', 'V5', 'V6'] },
      marks: [{ auto: 'st', lead: 'V2' }],
      caption: l(
        '先只看胸前导联：V1–V2 呈水平型 ST **压低**，其后 T 波直立（V1–V3）。这不是“前壁缺血”——是**后壁闭塞的镜像**（后壁背对 V1–V3）。再看全图：V5–V6 也有抬高（约 1–1.5 mm），I、aVL 轻度抬高（不到 1 mm）——后侧壁 STEMI，罪犯血管多为 LCx。没有侧壁抬高时，V1–V3 孤立性压低就是唯一的线索 ⇒ 加做 V7–V9。下一屏从背面看同一位患者。',
        'Look at the chest leads first: V1–V2 show horizontal ST **depression** ending in upright T waves (V1–V3). This is not "anterior ischaemia" — it is the **mirror of a posterior occlusion** (the posterior wall faces away from V1–V3). Now the whole tracing: V5–V6 are elevated too (about 1–1.5 mm), with I and aVL slightly up (under 1 mm) — a posterolateral STEMI, usually the LCx. When the lateral leads are silent, isolated V1–V3 depression is the only clue ⇒ record V7–V9. The next screen looks at the same patient from behind.',
        'Mira primero las precordiales: V1-V2 muestran **descenso** horizontal del ST seguido de ondas T positivas (V1-V3). No es «isquemia anterior»: es la **imagen especular de una oclusión posterior** (la pared posterior mira al lado opuesto de V1-V3). Ahora el trazado completo: V5-V6 también están elevadas (unos 1-1,5 mm), con I y aVL algo elevadas (menos de 1 mm): IAMCEST posterolateral, habitualmente por la Cx. Cuando las laterales son silentes, el descenso aislado en V1-V3 es la única pista ⇒ registra V7-V9. La siguiente pantalla mira al mismo paciente por detrás.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('stemi-posterior', 827, undefined, undefined, ['V7', 'V8', 'V9']),
      view: { layout: 'single', lead: 'V8' },
      marks: [{ auto: 'st', lead: 'V8' }],
      caption: l(
        '同一位患者、同一次记录：V8（肩胛下角处，与 V6 同一水平）直接面向后壁——**ST 抬高 ≥ 0.5 mm（< 40 岁男性 ≥ 1 mm）证实后壁闭塞**，罪犯血管多为 LCx。后壁 STEMI 按 STEMI 处理（第 i6 课深入讲解）。',
        'Same patient, same recording: V8 (at the tip of the scapula, level with V6) faces the posterior wall directly — **ST elevation ≥ 0.5 mm (≥ 1 mm in men < 40 y) confirms a posterior occlusion**, usually the LCx. A posterior STEMI is managed as a STEMI (lesson i6 goes deeper).',
        'El mismo paciente, el mismo registro: V8 (en la punta de la escápula, a la altura de V6) mira de frente a la pared posterior: **elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 40 años) confirma la oclusión posterior**, habitualmente de la Cx. El IAMCEST posterior se trata como un IAMCEST (la lección i6 lo desarrolla).',
      ),
    },
    {
      kind: 'criteria',
      title: l('罪犯血管细化与附加导联', 'Refining the culprit, and the extra leads', 'Afinar la arteria responsable y las derivaciones adicionales'),
      items: [
        {
          label: l('下壁 → RCA', 'Inferior → RCA', 'Inferior → CD'),
          value: l(
            'ST↑ III > II 伴 I 导联 ST↓（V1 抬高或 V4R 阳性 ⇒ 近端）',
            'ST elevation III > II with ST depression in I (V1 elevation or a positive V4R ⇒ proximal)',
            'Elevación del ST III > II con descenso del ST en I (elevación en V1 o V4R positivo ⇒ proximal)',
          ),
        },
        {
          label: l('下壁 → LCx', 'Inferior → LCx', 'Inferior → Cx'),
          value: l(
            'ST↑ II ≥ III，I 导联等电位；侧壁导联常同时受累',
            'ST elevation II ≥ III with lead I isoelectric; the lateral leads often join',
            'Elevación del ST II ≥ III con I isoeléctrica; las laterales suelen sumarse',
          ),
        },
        {
          label: l('V4R（每个下壁 STEMI）', 'V4R (every inferior STEMI)', 'V4R (todo IAMCEST inferior)'),
          value: l(
            'ST↑ ≥ 0.5 mm（< 30 岁男性 ≥ 1 mm）= 右心室受累',
            'ST elevation ≥ 0.5 mm (≥ 1 mm in men < 30 y) = RV involvement',
            'Elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 30 años) = afectación del VD',
          ),
        },
        {
          label: l('V7–V9（V1–V3 孤立性 ST↓）', 'V7–V9 (isolated ST depression V1–V3)', 'V7-V9 (descenso aislado del ST en V1-V3)'),
          value: l(
            'ST↑ ≥ 0.5 mm（< 40 岁男性 ≥ 1 mm）= 后壁闭塞',
            'ST elevation ≥ 0.5 mm (≥ 1 mm in men < 40 y) = posterior occlusion',
            'Elevación del ST ≥ 0,5 mm (≥ 1 mm en varones < 40 años) = oclusión posterior',
          ),
        },
        {
          label: l('冠脉分布要点', 'Coronary supply facts', 'Datos de distribución coronaria'),
          value: l(
            '后降支来自 RCA 约 90%；窦房结动脉约 55%、房室结动脉通常来自 RCA',
            'PDA from the RCA in about 90%; the sinus node artery in about 55% and the AV node artery usually from the RCA',
            'Descendente posterior de la CD en ≈90%; la rama del nodo sinusal en ≈55% y la del nodo AV, habitualmente de la CD',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Wagner GS et al. AHA/ACCF/HRS Part VI: Acute ischemia/infarction. Circulation 2009;119:e262-e270; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    },
    { kind: 'check', item: { family: 'territory', seed: 4 } },
    { kind: 'check', item: { family: 'territory', seed: 16 } },
    { kind: 'check', item: { family: 'occlusion', seed: 17 } },
    { kind: 'drill', families: ['territory'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [16704, 2627, 13868],
      caption: l(
        '三份真实的陈旧或时期不明的梗死（PTB-XL 标注的是部位，不是急性）：81 岁女性（前壁）、45 岁男性（下壁）、66 岁男性（前侧壁）。这里没有可测量的急性 ST 抬高，所以用 Q 波和 T 波来定位——坏死心肌的 Q 波同样面向它的心壁。为每份定下“区域 + 最可能的血管”，再揭晓。注意：RCA/LCx 的 ST 规则只适用于急性抬高，陈旧下壁梗死只能说“RCA（多数）或 LCx”。',
        'Three real infarcts, old or of unknown age (the PTB-XL label names the wall, not an acute event): a woman of 81 (anterior), a man of 45 (inferior) and a man of 66 (anterolateral). There is no acute ST elevation to measure, so localise them by Q waves and T waves — the Q waves of dead myocardium face their wall just as the injury current did. Decide "territory + most likely artery" for each before revealing. Note: the RCA/LCx ST rules apply only to acute elevation; for an old inferior infarct you can only say "RCA (most) or LCx".',
        'Tres infartos reales, antiguos o de antigüedad desconocida (la etiqueta de PTB-XL nombra la pared, no un evento agudo): una mujer de 81 años (anterior), un varón de 45 (inferior) y un varón de 66 (anterolateral). No hay elevación aguda del ST que medir, así que localízalos por las ondas Q y T: las Q del miocardio necrosado miran a su pared igual que lo hacía la corriente de lesión. Decide «territorio + arteria más probable» en cada uno antes de mirar la solución. Ojo: las reglas CD/Cx del ST solo sirven para la elevación aguda; en un infarto inferior antiguo solo puedes decir «CD (la mayoría) o Cx».',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把导联分组当口诀背而不懂背后的解剖：图形稍有变化（或只见镜像改变）就认不出区域。',
          'Reciting lead groups as a mnemonic without the anatomy behind them: as soon as the pattern shifts (or shows only mirror changes), the territory is missed.',
          'Recitar los grupos de derivaciones como regla mnemotécnica sin la anatomía que los sostiene: en cuanto el patrón cambia (o solo hay imagen especular), se pierde el territorio.',
        ),
        l(
          '下壁 STEMI 不做 RCA/LCx 鉴别：不比较 III 与 II 谁更高，也不看 I 导联是否压低。',
          'Never attempting the RCA/LCx question in inferior STEMI: not comparing III with II, not checking lead I for depression.',
          'No plantearse la pregunta CD/Cx en el IAMCEST inferior: no comparar cuál está más elevada, III o II, ni mirar si la derivación I desciende.',
        ),
        l(
          'V4R 被遗忘：每个下壁 STEMI 都应记录右胸导联；ST 抬高 ≥ 0.5 mm 改变处理（右心室梗死依赖前负荷，硝酸酯类要谨慎）。',
          'V4R forgotten: every inferior STEMI needs the right-sided leads; ST elevation ≥ 0.5 mm changes management (RV infarction is preload-dependent — be careful with nitrates).',
          'V4R olvidada: todo IAMCEST inferior necesita las derivaciones derechas; una elevación del ST ≥ 0,5 mm cambia el manejo (el infarto del VD depende de la precarga: cautela con los nitratos).',
        ),
        l(
          '把 V1–V3 孤立性 ST 压低自动报告为“前壁心内膜下缺血”：先想到后壁镜像，记录 V7–V9。',
          'Auto-calling isolated V1–V3 ST depression "anterior subendocardial ischaemia": think of the posterior mirror first and record V7–V9.',
          'Reportar de forma automática el descenso aislado del ST en V1-V3 como «isquemia subendocárdica anterior»: piensa primero en la imagen especular posterior y registra V7-V9.',
        ),
        l(
          '过分相信“回旋支总是静默”：仔细阅读 I、aVL、V5–V6，并加做 V7–V9 再下结论。',
          'Over-trusting "the circumflex is always silent": read I, aVL and V5–V6 carefully and add V7–V9 before concluding.',
          'Confiar demasiado en que «la circunfleja siempre es silente»: revisa con calma I, aVL y V5-V6 y añade V7-V9 antes de concluir.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '导联 → 心壁 → 动脉：LAD → V1–V4（广泛时 V1–V6 ± I/aVL）；RCA → II、III、aVF；LCx → I、aVL、V5–V6（及后壁）。',
          'Leads → wall → artery: LAD → V1–V4 (V1–V6 ± I/aVL when extensive); RCA → II, III, aVF; LCx → I, aVL, V5–V6 (and the posterior wall).',
          'Derivaciones → pared → arteria: DA → V1-V4 (V1-V6 ± I/aVL si es extenso); CD → II, III, aVF; Cx → I, aVL, V5-V6 (y la pared posterior).',
        ),
        l(
          '下壁 STEMI：ST↑ III > II + ST↓ I ⇒ RCA；ST↑ II ≥ III、I 导联等电位 ⇒ LCx。',
          'Inferior STEMI: ST elevation III > II + ST depression in I ⇒ RCA; II ≥ III with I isoelectric ⇒ LCx.',
          'IAMCEST inferior: elevación III > II + descenso en I ⇒ CD; II ≥ III con I isoeléctrica ⇒ Cx.',
        ),
        l(
          '每个下壁 STEMI 记录 V3R/V4R：ST 抬高 ≥ 0.5 mm = 右心室受累（近端 RCA）。',
          'Record V3R/V4R in every inferior STEMI: ST elevation ≥ 0.5 mm = RV involvement (proximal RCA).',
          'Registra V3R/V4R en todo IAMCEST inferior: elevación del ST ≥ 0,5 mm = afectación del VD (CD proximal).',
        ),
        l(
          'V1–V3 孤立性 ST 压低 = 后壁镜像：V7–V9 抬高 ≥ 0.5 mm 证实，按 STEMI 处理。',
          'Isolated ST depression in V1–V3 = posterior mirror: elevation ≥ 0.5 mm in V7–V9 confirms it; manage as a STEMI.',
          'Descenso aislado del ST en V1-V3 = imagen especular posterior: elevación ≥ 0,5 mm en V7-V9 lo confirma; trátalo como IAMCEST.',
        ),
        l(
          '读图顺序：先命名区域，再命名罪犯血管，最后决定加做哪些导联。',
          'Reading order: name the territory first, then the culprit artery, then decide which extra leads to record.',
          'Orden de lectura: primero el territorio, luego la arteria responsable y al final qué derivaciones adicionales registrar.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Bayés de Luna A et al. Circulation 2006;114:1755-1760',
    'Castellano et al. 2004',
  ],
};

export default lesson;
