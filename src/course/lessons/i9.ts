/**
 * i9 — Evolution, Q waves, reperfusion, old MI and LV aneurysm (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `mi-time-course`, `pathological-q`, `reperfusion-markers`, `lv-aneurysm`
 * (current values) and the "Missing in the book" bullet "LV aneurysm vs acute STEMI — T/QRS amplitude ratio" (Klein).
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});

const lesson: Lesson = {
  id: 'i9',
  stage: 'I',
  order: 9,
  title: l(
    '演变、Q波、再灌注、陈旧性心肌梗死与左心室室壁瘤',
    'Evolution, Q waves, reperfusion, old MI and LV aneurysm',
    'Evolución, ondas Q, reperfusión, infarto antiguo y aneurisma ventricular izquierdo',
  ),
  summary: l(
    '心肌梗死在心电图上留下一条可读的时间线：超急性 T → ST 抬高 → Q 波与 T 倒置 → ST 回落而 Q 长存。给梗死断代靠 ST 和 T，而不是 Q 本身；用 T/QRS 振幅比把陈旧室壁瘤与急性 STEMI 分开。',
    'An infarct leaves a readable timeline on the ECG: hyperacute T → ST elevation → Q waves with T inversion → ST back to baseline while the Q persists. Date the infarct from the ST and T, not from the Q alone, and separate an old LV aneurysm from an acute STEMI with the T/QRS amplitude ratio.',
    'Un infarto deja en el ECG una cronología legible: T hiperaguda → elevación del ST → ondas Q con T negativa → ST normalizado mientras la Q persiste. Data el infarto por el ST y la T, no solo por la Q, y separa un aneurisma antiguo del IAMCEST agudo con el cociente de amplitudes T/QRS.',
  ),
  objectives: [
    l(
      '复述未再灌注 STEMI 的心电图时间线（分钟到数月），并把一份图形放到正确的阶段上：超急性、急性、演变期或陈旧期。',
      'Recite the ECG timeline of an unreperfused STEMI (minutes to months) and place a tracing in its correct phase: hyperacute, acute, evolving or old.',
      'Recitar la cronología del ECG de un IAMCEST sin reperfusión (de minutos a meses) y situar un registro en su fase correcta: hiperaguda, aguda, en evolución o antigua.',
    ),
    l(
      '应用 UDMI 病理性 Q 标准与 Q 波等危症（V1–V2 R ≥40 ms），并把它们与正常变异（V1 的 QS、间隔性小 q、III 的小 Q）区分开。',
      'Apply the UDMI pathological-Q criteria and the Q-wave equivalent (R ≥40 ms in V1-V2), and separate them from normal variants (QS in V1, the small septal q, a small Q in III).',
      'Aplicar los criterios de onda Q patológica de la definición universal y el equivalente de Q (R ≥40 ms en V1-V2), y distinguirlos de las variantes normales (QS en V1, la q septal pequeña, una Q pequeña en III).',
    ),
    l(
      '说出再灌注的图形标志，并识别溶栓失败：60–90 分钟 ST 回落 <50% ⇒ 挽救性 PCI。',
      'Name the ECG signs of reperfusion and recognise failed fibrinolysis: ST resolution <50% at 60-90 min ⇒ rescue PCI.',
      'Nombrar los signos electrocardiográficos de reperfusión y reconocer la fibrinólisis fallida: resolución del ST <50% a los 60-90 min ⇒ angioplastia de rescate.',
    ),
    l(
      '用 T/QRS 振幅比（V1–V4）、旧心电图与肌钙蛋白把左心室室壁瘤与急性前壁 STEMI 区分开。',
      'Separate an LV aneurysm from an acute anterior STEMI using the T/QRS amplitude ratio (V1-V4), old ECGs and troponin.',
      'Distinguir un aneurisma ventricular izquierdo de un IAMCEST anterior agudo con el cociente T/QRS (V1-V4), ECG antiguos y troponina.',
    ),
  ],
  minutes: 16,
  competencies: ['C8'],
  findings: ['pathological-q', 'old-mi-anterior', 'old-mi-inferior', 'lv-aneurysm'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-evolution', 961, undefined, 'old'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3'] },
      question: l(
        '68 岁男性，术前常规心电图，没有任何胸痛。V1–V3 里是什么？这里发生过什么——发生在什么时候？',
        'A 68-year-old man, a routine pre-operative ECG, no chest pain at all. What is sitting in V1-V3? What happened here — and when?',
        'Un varón de 68 años, ECG preoperatorio de rutina, sin ningún dolor torácico. ¿Qué hay en V1-V3? ¿Qué ocurrió aquí… y cuándo?',
      ),
      reveal: l(
        'V1–V3 呈 **QS 型**，ST 段已回到基线，T 波小而直立：一次**已经愈合的前壁心肌梗死**——事件发生在数天到数年之前。心电图此刻记录的是**瘢痕**，不是事件：Q 波一旦形成通常会终身保留。所以今天的任务是给梗死**断代**——读 ST 和 T，而不是只盯着 Q。',
        'V1-V3 show **QS complexes** with the ST back at baseline and small upright T waves: a **healed anterior myocardial infarction** — the event happened days to years ago. The ECG is recording the **scar**, not the event: once formed, Q waves usually stay for life. Today\'s task is therefore to **date** the infarct — read the ST and the T, not just the Q.',
        'V1-V3 muestran **complejos QS** con el ST de vuelta a la línea de base y ondas T pequeñas y positivas: un **infarto anterior ya cicatrizado**; el evento ocurrió hace días o años. El ECG registra ahora la **cicatriz**, no el evento: una vez formadas, las ondas Q suelen mantenerse de por vida. La tarea de hoy es, por tanto, **datar** el infarto: lee el ST y la T, no solo la Q.',
      ),
    },
    {
      kind: 'text',
      title: l('一条时间线：未再灌注 STEMI 的自然病程', 'One timeline: the natural history of an unreperfused STEMI', 'Una línea de tiempo: la historia natural de un IAMCEST sin reperfusión'),
      body: l(
        '- **分钟**：超急性 T 波——宽基底、粗大、对称，出现在 ST 抬高之前（复习第 i7 课）。\n- **分钟至数小时**：ST 段抬高（损伤电流）。\n- **约 1–12 小时**：R 波丢失，Q 波出现。\n- **数小时至数天**：T 波开始倒置——**此时 ST 仍抬高**。\n- **数天至约 2 周**：ST 段回落至基线（下壁梗死回落更快）。\n- **数周至数月**：T 波可恢复正常；**Q 波通常持续存在**。\n- 再灌注（自发或治疗）会打乱并压缩这条时间线：ST 迅速回落、T 提早倒置，甚至出现一过性 Q 波。',
        '- **Minutes**: hyperacute T waves — broad-based, bulky, symmetric, before any ST elevation (lesson i7).\n- **Minutes to hours**: ST elevation (the injury current).\n- **About 1-12 h**: R-wave loss; Q waves appear.\n- **Hours to days**: T inversion begins — **while the ST is still elevated**.\n- **Days to about 2 weeks**: the ST returns to baseline (sooner in inferior MI).\n- **Weeks to months**: the T may normalise; **the Q usually persists**.\n- Reperfusion (spontaneous or therapeutic) scrambles and shortens this timeline: rapid ST fall, early T inversion, even transient Q waves.',
        '- **Minutos**: ondas T hiperagudas, de base ancha, voluminosas y simétricas, antes de cualquier elevación del ST (lección i7).\n- **Minutos a horas**: elevación del ST (la corriente de lesión).\n- **Unas 1-12 h**: pérdida de la R y aparición de las ondas Q.\n- **Horas a días**: la T empieza a negativizarse **con el ST todavía elevado**.\n- **Días a unas 2 semanas**: el ST vuelve a la línea de base (antes en el infarto inferior).\n- **Semanas a meses**: la T puede normalizarse; **la Q suele persistir**.\n- La reperfusión (espontánea o terapéutica) altera y acorta esta línea de tiempo: caída rápida del ST, T negativa precoz e incluso ondas Q transitorias.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('stemi-evolution', 962, undefined, 'hyperacute'),
      view: { layout: 'single', lead: 'V2' },
      marks: [{ auto: 't', lead: 'V2' }],
      caption: l(
        '同一患者，三联图之一：胸痛 10 分钟。V2 只有一个**宽大、粗钝的 T 波**骑在小 QRS 上——ST 还没抬。数分钟内的最早信号。',
        'The same patient, panel 1 of 3: 10 minutes of chest pain. V2 shows only a **broad, bulky T wave** riding on a small QRS — the ST has not moved yet. The earliest sign, within minutes.',
        'El mismo paciente, panel 1 de 3: 10 minutos de dolor. En V2 solo hay una **onda T ancha y voluminosa** sobre un QRS pequeño; el ST aún no se ha elevado. El primer signo, en cuestión de minutos.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('stemi-evolution', 963),
      view: { layout: 'single', lead: 'V2' },
      marks: [
        { auto: 'j', lead: 'V2' },
        { auto: 'st', lead: 'V2' },
      ],
      caption: l(
        '三联图之二：数小时后。J 点处的 **ST 段已弓背抬高**，T 波“站”在抬高的 ST 之上——损伤电流全功率，QRS 尚未受损。',
        'Panel 2 of 3: hours later. The **ST is elevated** from the J point and the T stands on top of it — the injury current at full power, the QRS still intact.',
        'Panel 2 de 3: horas después. El **ST está elevado** desde el punto J y la T se apoya sobre él: la corriente de lesión a plena potencia, con el QRS todavía intacto.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('stemi-evolution', 964, undefined, 'evolving'),
      view: { layout: 'single', lead: 'V2' },
      marks: [
        { auto: 'q', lead: 'V2' },
        { auto: 't', lead: 'V2' },
      ],
      caption: l(
        '三联图之三：约 12–24 小时。R 波丢失、**Q 波出现**，T 波在 ST 仍抬高时开始倒置——坏死已发生，梗死正在“演变”。再往后就是本课开头的那幅：陈旧期，Q 波仍在、ST 已回落。',
        'Panel 3 of 3: about 12-24 h. The R is lost, **the Q has appeared**, and the T starts to invert while the ST is still up — necrosis has happened and the infarct is "evolving". After this comes the tracing that opened the lesson: the old phase, Q still there, ST back down.',
        'Panel 3 de 3: unas 12-24 h. La R se pierde, **aparece la Q** y la T empieza a negativizarse con el ST aún elevado: la necrosis ya ocurrió y el infarto está «en evolución». Después llega el registro que abría la lección: la fase antigua, con la Q presente y el ST normalizado.',
      ),
    },
    {
      kind: 'criteria',
      title: l('给梗死断代与病理性 Q：现行标准', 'Dating an infarct and the pathological Q: current criteria', 'Datado del infarto y onda Q patológica: criterios actuales'),
      items: [
        {
          label: l('时间线（未再灌注）', 'Timeline (unreperfused)', 'Cronología (sin reperfusión)'),
          value: l(
            '分钟：超急性 T → 分钟–小时：ST↑ → 约 1–12 h：R 丢失 + Q → 小时–天：ST 仍抬高时 T↓ → 天–约 2 周：ST 回落 → 周–月：T 可正常化，Q 持续',
            'Minutes: hyperacute T → minutes-hours: ST↑ → about 1-12 h: R loss + Q → hours-days: T↓ while ST still up → days-~2 weeks: ST back → weeks-months: T may normalise, Q persists',
            'Minutos: T hiperaguda → minutos-horas: elevación del ST → unas 1-12 h: pérdida de R + Q → horas-días: T negativa con el ST aún elevado → días-~2 semanas: ST normalizado → semanas-meses: la T puede normalizarse, la Q persiste',
          ),
        },
        {
          label: l('病理性 Q（V2–V3）', 'Pathological Q (V2-V3)', 'Onda Q patológica (V2-V3)'),
          value: l(
            '任何 Q 波 >20 ms，或 QS 型（无 LBBB/LVH/WPW）',
            'Any Q wave >20 ms, or a QS complex (no LBBB/LVH/WPW)',
            'Cualquier onda Q >20 ms, o un complejo QS (sin BRIHH/HVI/preexcitación)',
          ),
        },
        {
          label: l('病理性 Q（其他导联）', 'Pathological Q (other leads)', 'Onda Q patológica (otras derivaciones)'),
          value: l(
            'Q ≥30 ms 且 ≥1 mm，见于同一相邻导联组（I/aVL、V1–V6、II/III/aVF）的 ≥2 个导联，或 QS',
            'Q ≥30 ms and ≥1 mm in ≥2 leads of one contiguous group (I/aVL, V1-V6, II/III/aVF), or QS',
            'Q ≥30 ms y ≥1 mm en ≥2 derivaciones de un grupo contiguo (I/aVL, V1-V6, II/III/aVF), o QS',
          ),
        },
        {
          label: l('Q 波等危症（后壁）', 'Q-wave equivalent (posterior)', 'Equivalente de Q (posterior)'),
          value: l(
            'V1–V2 R ≥40 ms 伴 R/S ≥1、T 直立、无传导障碍 = 陈旧后壁/侧壁梗死',
            'R ≥40 ms in V1-V2 with R/S ≥1 and an upright T, no conduction defect = old posterior/lateral MI',
            'R ≥40 ms en V1-V2 con R/S ≥1 y T positiva, sin defecto de conducción = infarto antiguo posterior/lateral',
          ),
        },
        {
          label: l('正常变异（不要叫梗死）', 'Normal variants (do not call infarction)', 'Variantes normales (no las llames infarto)'),
          value: l(
            'V1 的 QS；I、aVL、aVF、V4–V6 的间隔性小 q（<30 ms 且 < R 的 25%）；电轴 −30°–0° 时 III 的 Q <30 ms 且 < R 的 25%',
            'QS in V1; a small septal q in I, aVL, aVF, V4-V6 (<30 ms and <25% of R); a Q in III <30 ms and <25% of R when the axis is −30° to 0°',
            'QS en V1; q septal pequeña en I, aVL, aVF, V4-V6 (<30 ms y <25% de la R); Q en III <30 ms y <25% de la R con eje de −30° a 0°',
          ),
        },
        {
          label: l('室壁瘤 vs 急性 STEMI', 'Aneurysm vs acute STEMI', 'Aneurisma vs IAMCEST agudo'),
          value: l(
            'Q 波上 ST↑ 持续 >4–6 周、T 相对 QRS 小 ⇒ 室壁瘤；V1–V4 任一导联 T/QRS 振幅比大 ⇒ 急性前壁 STEMI',
            'ST↑ persisting >4-6 weeks over Q waves with a T small relative to the QRS ⇒ aneurysm; a large T/QRS amplitude ratio in any of V1-V4 ⇒ acute anterior STEMI',
            'Elevación del ST >4-6 semanas sobre ondas Q con T pequeña respecto al QRS ⇒ aneurisma; un cociente T/QRS grande en cualquiera de V1-V4 ⇒ IAMCEST anterior agudo',
          ),
        },
        {
          label: l('溶栓失败', 'Failed fibrinolysis', 'Fibrinólisis fallida'),
          value: l(
            '60–90 分钟时最大抬高导联 ST 回落 <50% ⇒ 挽救性 PCI；完全 ≥70%，部分 30–70%，无 <30%',
            'ST resolution <50% (in the lead with the most elevation) at 60-90 min ⇒ rescue PCI; complete ≥70%, partial 30-70%, none <30%',
            'Resolución del ST <50% (en la derivación de mayor elevación) a los 60-90 min ⇒ angioplastia de rescate; completa ≥70%, parcial 30-70%, nula <30%',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Wagner GS et al. AHA/ACCF/HRS Part VI: Acute ischemia/infarction. Circulation 2009;119:e262-e270; Klein LR, Shroff GR, Beeman W, Smith SW. Am J Emerg Med 2015;33:786-790',
    },
    {
      kind: 'worked',
      title: l('给下壁梗死断代：四个问题', 'Dating an inferior infarct: four questions', 'Datando un infarto inferior: cuatro preguntas'),
      ecg: synth('old-mi', 965, undefined, 'inferior'),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('找 Q 波', 'Find the Q waves', 'Busca las ondas Q'),
          body: l(
            'II、III、aVF 都有 Q 波。先定位它们，再谈是否病理——顺序不能反。',
            'Q waves sit in II, III and aVF. Locate them first, then decide whether they are pathological — in that order.',
            'Hay ondas Q en II, III y aVF. Localízalas primero y decide después si son patológicas, en ese orden.',
          ),
          marks: [{ auto: 'q', lead: 'III' }],
          highlightLeads: ['II', 'III', 'aVF'],
        },
        {
          title: l('达到病理性标准了吗？', 'Do they meet the criteria?', '¿Cumplen los criterios?'),
          body: l(
            'II/III/aVF 是一个相邻组：II 的 Q 约 35 ms、深约 5 mm，III 与 aVF 是深 QS——II 与 aVF **两个**导联达标，标准满足（UDMI 不单独用 III 计数；单是 III 一个小 Q 可什么都不是，见正常变异）。顺带看电轴：约 −40°。下壁 Q 波把电轴拉向左上；下壁呈 Q/QS 而不是 rS 时，不要报成左前分支阻滞。',
            'II/III/aVF form one contiguous group: II has a Q of about 35 ms and about 5 mm deep, and III and aVF are deep QS complexes — **two** leads, II and aVF, qualify, so the criterion is met (UDMI does not count III on its own; a small Q in III alone can mean nothing at all, see the normal variants). Note the axis on the way: about −40°. Inferior Q waves drag the axis up and left; when the inferior leads show Q/QS rather than rS, do not call it left anterior fascicular block.',
            'II/III/aVF forman un grupo contiguo: II tiene una Q de unos 35 ms y unos 5 mm de profundidad, y III y aVF son QS profundos: **dos** derivaciones, II y aVF, cumplen, y el criterio está satisfecho (la UDMI no cuenta III por sí sola; una Q pequeña solo en III puede no significar nada, véanse las variantes normales). Fíjate de paso en el eje: unos −40°. Las Q inferiores desplazan el eje arriba y a la izquierda; si las inferiores muestran Q/QS y no rS, no lo informes como bloqueo fascicular anterior izquierdo.',
          ),
          marks: [{ auto: 'q', lead: 'II' }, { auto: 'q', lead: 'aVF' }],
          highlightLeads: ['II', 'III', 'aVF'],
        },
        {
          title: l('ST 和 T 怎么说？', 'What do the ST and T say?', '¿Qué dicen el ST y la T?'),
          body: l(
            'ST 段等电位，T 波直立。急性期 ST 会抬高；演变期 T 在 ST 仍抬高时倒置。这里 ST 已回落、T 已“安静”——**陈旧**。',
            'The ST is isoelectric and the T upright. In the acute phase the ST would be elevated; in the evolving phase the T inverts while the ST is still up. Here the ST is back and the T has "settled" — **old**.',
            'El ST es isoeléctrico y la T positiva. En la fase aguda el ST estaría elevado; en la evolución la T se negativiza con el ST aún alto. Aquí el ST se ha normalizado y la T se ha «calmado»: **antiguo**.',
          ),
          marks: [
            { auto: 'st', lead: 'III' },
            { auto: 't', lead: 'III' },
          ],
        },
        {
          title: l('报告与下一步', 'Report and next steps', 'Informe y pasos siguientes'),
          body: l(
            '报告“陈旧性下壁心肌梗死”。下一步：核对旧图（Q 是新的还是多年前的？）、超声心动图（室壁运动、有无室壁瘤）；若有任何症状或怀疑——**查肌钙蛋白**：陈旧的图形从不排除今天的新事件。',
            'Report "old inferior myocardial infarction". Next: compare old tracings (is this Q new, or years old?), echocardiography (wall motion, aneurysm?); and if there is any symptom or doubt — **measure troponin**: an old pattern never excludes a new event today.',
            'Reporta «infarto antiguo de cara inferior». Después: compara con ECG antiguos (¿esta Q es nueva o de hace años?), ecocardiograma (movimiento parietal, ¿aneurisma?); y si hay síntomas o dudas, **pide troponina**: un patrón antiguo nunca excluye un evento nuevo hoy.',
          ),
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('old-mi', 966, undefined, 'fragmented'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3', 'V4'] },
      marks: [{ auto: 'qrs', lead: 'V4' }],
      caption: l(
        '除了 Q 波（这里 V1–V3 呈 QS），还要找**碎裂 QRS**——RSR′ 型或额外的切迹（此处 V4 的 S 波之后多了一个 r′），代表激动绕行瘢痕的传导延迟。无束支阻滞时它是瘢痕的标志（支持性证据，不属于 UDMI 的 Q 波标准）；没有 Q 波时，它可能是唯一的线索。同一情景还有下壁、侧壁变体：Q（或碎裂）的位置跟着供血区走（第 i2 课的地图）。',
        'Beyond the Q waves (QS in V1-V3 here), look for **fragmented QRS** — an RSR′ pattern or extra notching (here an extra r′ after the S in V4) — conduction detouring around scar. Without a bundle-branch block it is a marker of scar (supportive evidence, not part of the UDMI Q-wave criteria); where Q waves are absent it may be the only clue. The same scenario has inferior and lateral variants: the Q (or the fragmentation) follows the perfusion map from lesson i2.',
        'Además de las ondas Q (aquí QS en V1-V3), busca el **QRS fragmentado** — un patrón RSR′ o muescas adicionales (aquí una r′ de más tras la S en V4) —: la conducción rodeando la cicatriz. Sin bloqueo de rama es un marcador de cicatriz (prueba de apoyo, no forma parte de los criterios de onda Q de la UDMI); si no hay ondas Q, puede ser la única pista. El mismo escenario tiene variantes inferior y lateral: la Q (o la fragmentación) sigue el mapa de perfusión de la lección i2.',
      ),
    },
    {
      kind: 'text',
      title: l('再灌注的信号：谁成功了，谁要挽救性 PCI', 'Signs of reperfusion: who succeeded, who needs rescue PCI', 'Signos de reperfusión: quién reperfundió y quién necesita angioplastia de rescate'),
      body: l(
        '- 溶栓后 **60–90 分钟复查心电图**，在抬高最明显的导联测 ST：回落 ≥70% = 完全；30–70% = 部分；<30% = 无。\n- **<50% ⇒ 溶栓失败 ⇒ 挽救性 PCI**——不要继续等。\n- 其他再灌注信号：胸痛缓解、**加速性室性自主心律（AIVR）**——良性的“血管已再开”信号（第 r2 课）、2 小时内 T 波终末部倒置。\n- 直接 PCI 后 ST 持续抬高提示微血管阻塞（无复流），预后较差。\n- 心肌顿抑可产生**一过性 Q 波**，再灌注后数天内消失——Q 波不等于永久瘢痕的保证。',
        '- **Repeat the ECG 60-90 min after fibrinolysis** and measure the ST in the lead with the most elevation: resolution ≥70% complete; 30-70% partial; <30% none.\n- **<50% ⇒ failed fibrinolysis ⇒ rescue PCI** — do not keep waiting.\n- Other reperfusion signs: pain relief, **accelerated idioventricular rhythm (AIVR)** — a benign "the artery has reopened" sign (lesson r2) — and early terminal T inversion within 2 h.\n- Persistent ST elevation after primary PCI suggests microvascular obstruction (no-reflow) and a worse prognosis.\n- Stunned myocardium can produce **transient Q waves** that vanish within days of reperfusion — a Q wave is not a guarantee of permanent scar.',
        '- **Repite el ECG 60-90 min tras la fibrinólisis** y mide el ST en la derivación de mayor elevación: resolución ≥70% completa; 30-70% parcial; <30% nula.\n- **<50% ⇒ fibrinólisis fallida ⇒ angioplastia de rescate**: no sigas esperando.\n- Otros signos de reperfusión: alivio del dolor, **ritmo idioventricular acelerado (RIVA)** — signo benigno de «la arteria se ha reabierto» (lección r2) — y negativización terminal precoz de la T en las primeras 2 h.\n- La elevación persistente del ST tras la ICP primaria sugiere obstrucción microvascular (no-reflow) y peor pronóstico.\n- El miocardio aturdido puede generar **ondas Q transitorias** que desaparecen en días tras la reperfusión: una onda Q no garantiza cicatriz permanente.',
      ),
    },
    {
      kind: 'text',
      title: l('左心室室壁瘤：留下来的是抬高的 ST', 'LV aneurysm: the ST elevation that stayed', 'Aneurisma ventricular izquierdo: la elevación del ST que no se fue'),
      body: l(
        '- 大面积透壁梗死（尤其前壁）愈合后，室壁可变成一个薄、瘢痕化的**反常运动囊**：收缩期向外膨出。\n- 囊的持续“损伤电流”让 **ST 抬高留在 Q 波之上**——超过 4–6 周，这就不再是急性事件。\n- 关键鉴别（Klein 2015）：**T/QRS 振幅比**。T 相对 QRS 小 ⇒ 陈旧室壁瘤；V1–V4 任一导联 T/QRS 大 ⇒ 急性前壁 STEMI。\n- 图形本身不激活导管室：先核对旧图、肌钙蛋白与超声心动图，再决定去向。',
        '- After a large transmural infarct heals (anterior especially), the wall can become a thin, scarred, **dyskinetic sac** that bulges outward in systole.\n- The sac\'s persistent "injury current" leaves the **ST elevation sitting on top of Q waves** — beyond 4-6 weeks this is no longer an acute event.\n- The key discriminator (Klein 2015): the **T/QRS amplitude ratio**. A T small relative to the QRS ⇒ an old aneurysm; a large T/QRS in any of V1-V4 ⇒ an acute anterior STEMI.\n- The pattern alone does not activate the cath lab: check old tracings, troponin and echocardiography before deciding the pathway.',
        '- Tras cicatrizar un infarto transmural extenso (sobre todo anterior), la pared puede convertirse en un **saco discinético**, fino y cicatricial, que se expande hacia fuera en sístole.\n- Su «corriente de lesión» persistente deja la **elevación del ST sobre las ondas Q**: pasadas 4-6 semanas ya no es un evento agudo.\n- El discriminador clave (Klein 2015): el **cociente de amplitudes T/QRS**. Una T pequeña respecto al QRS ⇒ aneurisma antiguo; un cociente T/QRS grande en cualquiera de V1-V4 ⇒ IAMCEST anterior agudo.\n- El patrón por sí solo no activa el laboratorio de hemodinámica: comprueba ECG antiguos, troponina y ecocardiografía antes de decidir la vía.',
      ),
    },
    {
      kind: 'contrast',
      title: l('同样 V1–V4 抬高：室壁瘤还是急性？', 'Same V1-V4 elevation: aneurysm or acute?', 'Misma elevación en V1-V4: ¿aneurisma o agudo?'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('lv-aneurysm', 967),
        caption: l(
          'A：QS 波之上 ST 抬高，T **小**、与 QRS 不成比例——陈旧室壁瘤（数月到数年前的前壁梗死）',
          'A: ST elevation on QS complexes with a T **small** and out of proportion to the QRS — an old aneurysm (anterior infarct months to years ago)',
          'A: elevación del ST sobre complejos QS con una T **pequeña** y desproporcionada al QRS: aneurisma antiguo (infarto anterior de hace meses o años)',
        ),
        marks: [
          { auto: 'q', lead: 'V2' },
          { auto: 'st', lead: 'V2' },
          { auto: 't', lead: 'V2' },
        ],
      },
      right: {
        ecg: synth('stemi-anterior', 968),
        caption: l(
          'B：ST 抬高伴**高大、成比例**的 T，QRS 尚完好——急性前壁 STEMI（事件正在发生）',
          'B: ST elevation with a **tall, proportionate** T and an intact QRS — an acute anterior STEMI (the event is happening now)',
          'B: elevación del ST con una T **alta y proporcionada** y un QRS intacto: IAMCEST anterior agudo (el evento está ocurriendo ahora)',
        ),
        marks: [
          { auto: 'st', lead: 'V2' },
          { auto: 't', lead: 'V2' },
        ],
      },
      point: l(
        '两份图都是“V1–V4 ST 抬高”。**A**：QS + 抬高的 ST + 相对 QRS 很小的 T（V1–V4 每个导联的 T/QRS 都小）——室壁瘤，事件早已过去。**B**：T 大、相对 QRS 成比例甚至更大——急性，事件在此时。同一个形态，不同的时间：比值把两者分开；但决定去向的是旧图 + 肌钙蛋白 + 超声，而不是任何单幅图形。',
        'Both tracings show "ST elevation in V1-V4". **A**: QS complexes + elevated ST + a T that is tiny relative to the QRS (a small T/QRS in every lead V1-V4) — an aneurysm; the event is long past. **B**: a large T, proportionate to the QRS or bigger — acute; the event is now. Same shape, different time: the ratio separates them; but the pathway is decided by old tracings + troponin + echo, never by a single tracing.',
        'Ambos registros muestran «elevación del ST en V1-V4». **A**: complejos QS + ST elevado + una T minúscula respecto al QRS (cociente T/QRS bajo en todas las derivaciones V1-V4): aneurisma; el evento pasó hace tiempo. **B**: T grande, proporcional al QRS o mayor: agudo; el evento es ahora. Misma forma, distinto tiempo: el cociente los separa; pero la vía la deciden los ECG antiguos, la troponina y el ecocardiograma, nunca un solo registro.',
      ),
    },
    { kind: 'check', item: { family: 'ischemia-patterns', seed: 31 } },
    { kind: 'check', item: { family: 'ischemia-patterns', seed: 8 } },
    { kind: 'check', item: { family: 'occlusion', seed: 71 } },
    { kind: 'drill', families: ['ischemia-patterns', 'occlusion'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [492, 518, 8636],
      caption: l(
        '三份真实心电图：79 岁女性与 76 岁男性（前间壁梗死：一份数据库分期为陈旧，一份时期不明）、75 岁女性（室壁瘤图形）。每份先定下判断：陈旧梗死、室壁瘤，还是急性事件？V1–V4 的 T/QRS 比值是多少？然后再揭晓。',
        'Three real tracings: a 79-year-old woman and a 76-year-old man (anteroseptal infarcts: one staged old in the database, one of unknown age) and a 75-year-old woman (an aneurysm pattern). For each, commit first: old infarct, aneurysm, or an acute event? What is the T/QRS ratio in V1-V4? Then reveal.',
        'Tres ECG reales: una mujer de 79 años y un varón de 76 (infartos anteroseptales: uno con estadio antiguo en la base de datos y otro de antigüedad desconocida) y una mujer de 75 (patrón de aneurisma). En cada uno, decide antes: ¿infarto antiguo, aneurisma o evento agudo? ¿Cuál es el cociente T/QRS en V1-V4? Después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'Q 波被当作“急性”来报：Q 只说明有瘢痕——给梗死断代靠 ST 和 T（ST 抬高 = 此刻；ST 已回落而 T 异常 = 演变期/陈旧）。',
          'Q waves reported as "acute": a Q only proves scar — date the infarct by the ST and T (ST up = now; ST back with abnormal T = evolving/old).',
          'Reportar las ondas Q como «agudas»: la Q solo demuestra cicatriz; data el infarto por el ST y la T (ST elevado = ahora; ST normalizado con T alterada = en evolución/antiguo).',
        ),
        l(
          '陈旧室壁瘤被当作急性 STEMI 再次激活导管室：Q 波上的 ST 抬高 + V1–V4 小 T/QRS 比值支持陈旧——先找旧图、查肌钙蛋白。',
          'An old aneurysm re-activating the cath lab as an acute STEMI: ST elevation over Q waves with a small T/QRS ratio in V1-V4 favours old — get the old tracings and a troponin first.',
          'Reactivar el laboratorio de hemodinámica por un aneurisma antiguo como si fuera un IAMCEST agudo: la elevación del ST sobre ondas Q con un cociente T/QRS bajo en V1-V4 apoya lo antiguo; busca antes los ECG previos y la troponina.',
        ),
        l(
          '碎裂 QRS 被当成“小切迹”略过：无束支阻滞时的 RSR′ 或额外切迹提示瘢痕（支持性证据，不是 UDMI 的 Q 波标准）。',
          'Fragmented QRS dismissed as "a little notch": RSR′ or extra notching without a bundle-branch block points to scar (supportive evidence, not a UDMI Q-wave criterion).',
          'El QRS fragmentado despachado como «una muesca»: RSR′ o muescas adicionales sin bloqueo de rama indican cicatriz (prueba de apoyo, no un criterio de onda Q de la UDMI).',
        ),
        l(
          '“图形看起来很陈旧”就不查肌钙蛋白：陈旧图形从不排除今天的新事件——有症状就查。',
          'Skipping troponin because "the ECG looks old": an old pattern never excludes a new event today — if there are symptoms, measure it.',
          'No pedir troponina porque «el ECG parece antiguo»: un patrón antiguo nunca excluye un evento nuevo hoy; si hay síntomas, pídela.',
        ),
        l(
          '忘了心肌顿抑的一过性 Q 波：再灌注后数天内可消失——Q 波不自动等于永久瘢痕。',
          'Forgetting the transient Q of stunned myocardium: it can disappear within days of reperfusion — a Q wave is not automatically a permanent scar.',
          'Olvidar la Q transitoria del miocardio aturdido: puede desaparecer en los días siguientes a la reperfusión; una onda Q no equivale automáticamente a cicatriz permanente.',
        ),
        l(
          '正常变异被叫作梗死：V1 的 QS、间隔性小 q、电轴左偏时 III 的小 Q——宽度、深度与相邻导联数都不达标。',
          'Normal variants called infarction: QS in V1, the small septal q, a small Q in III with a leftward axis — none meets the duration, depth or contiguous-lead requirements.',
          'Llamar infarto a las variantes normales: QS en V1, la q septal pequeña, una Q pequeña en III con eje izquierdo; ninguna cumple los requisitos de duración, profundidad ni derivaciones contiguas.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '时间线：分钟超急性 T → 分钟–小时 ST↑ → 约 1–12 h R 丢失 + Q → 小时–天 ST 仍抬高时 T↓ → 天–约 2 周 ST 回落 → 周–月 T 可正常化，Q 通常持续存在。',
          'Timeline: minutes hyperacute T → minutes-hours ST↑ → about 1-12 h R loss + Q → hours-days T↓ while ST is still up → days-~2 weeks ST back → weeks-months T may normalise, Q usually persists.',
          'Cronología: minutos, T hiperaguda → minutos-horas, elevación del ST → unas 1-12 h, pérdida de R + Q → horas-días, T negativa con el ST aún elevado → días-~2 semanas, ST normalizado → semanas-meses, la T puede normalizarse y la Q suele persistir.',
        ),
        l(
          '病理性 Q（UDMI）：V2–V3 任何 Q >20 ms 或 QS；其他导联 Q ≥30 ms 且 ≥1 mm 见于同一相邻组 ≥2 个导联；Q 波等危症 = V1–V2 R ≥40 ms 伴 R/S ≥1、T 直立。',
          'Pathological Q (UDMI): any Q >20 ms or QS in V2-V3; elsewhere Q ≥30 ms and ≥1 mm in ≥2 leads of one contiguous group; Q-wave equivalent = R ≥40 ms in V1-V2 with R/S ≥1 and an upright T.',
          'Onda Q patológica (definición universal): cualquier Q >20 ms o QS en V2-V3; en las demás derivaciones Q ≥30 ms y ≥1 mm en ≥2 derivaciones de un grupo contiguo; equivalente de Q = R ≥40 ms en V1-V2 con R/S ≥1 y T positiva.',
        ),
        l(
          '给梗死断代靠 ST 和 T，不靠 Q：ST 抬高 = 急性；ST 仍抬高 + T 倒置 = 演变期；ST 回落（T 可正常或倒置）+ Q = 陈旧。',
          'Date the infarct by the ST and T, not by the Q: ST up = acute; ST still up with T inversion = evolving; ST back (T normal or inverted) with Q = old.',
          'Data el infarto por el ST y la T, no por la Q: ST elevado = agudo; ST aún elevado con T negativa = en evolución; ST normalizado (T normal o negativa) con Q = antiguo.',
        ),
        l(
          '再灌注：溶栓后 60–90 分钟 ST 回落 <50%（最大抬高导联）= 溶栓失败 ⇒ 挽救性 PCI；AIVR 与 2 小时内 T 波终末倒置是再开通的良性信号。',
          'Reperfusion: ST resolution <50% at 60-90 min (lead with the most elevation) = failed fibrinolysis ⇒ rescue PCI; AIVR and terminal T inversion within 2 h are benign reopened-artery signs.',
          'Reperfusión: resolución del ST <50% a los 60-90 min (derivación de mayor elevación) = fibrinólisis fallida ⇒ angioplastia de rescate; el RIVA y la negativización terminal de la T en 2 h son signos benignos de arteria reabierta.',
        ),
        l(
          '室壁瘤：Q 波上 ST 抬高持续 >4–6 周、V1–V4 的 T/QRS 振幅比小 ⇒ 陈旧室壁瘤，不是急性 STEMI；用旧图、肌钙蛋白与超声确认，不要单凭图形激活导管室。',
          'Aneurysm: ST elevation over Q waves persisting >4-6 weeks with a small T/QRS amplitude ratio in V1-V4 ⇒ an old aneurysm, not an acute STEMI; confirm with old tracings, troponin and echo — a pattern alone never activates the cath lab.',
          'Aneurisma: elevación del ST sobre ondas Q de más de 4-6 semanas con un cociente T/QRS bajo en V1-V4 ⇒ aneurisma antiguo, no un IAMCEST agudo; confírmalo con ECG antiguos, troponina y ecocardiograma: un patrón por sí solo no activa el laboratorio de hemodinámica.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Wagner GS et al. AHA/ACCF/HRS Part VI: Acute ischemia/infarction. Circulation 2009;119:e262-e270',
    'Klein LR, Shroff GR, Beeman W, Smith SW. Am J Emerg Med 2015;33:786-790',
    'Castellano et al. 2004',
  ],
};

export default lesson;
