/**
 * i10 — Confounders: LBBB and pacing (Sgarbossa, Smith), RBBB, LVH (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md "Missing in the book" bullets "MI with LBBB or ventricular pacing"
 * (Sgarbossa / Smith-modified / Barcelona) and "MI with RBBB", plus the `lvh-as-STEMI-mimic` row
 * (ST elevation ≥ 25 % of the S depth) in the atrial-enlargement-ventricular-hypertrophy section.
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
  id: 'i10',
  stage: 'I',
  order: 10,
  title: l(
    '干扰因素：左束支传导阻滞与起搏（Sgarbossa、Smith标准）、右束支传导阻滞、左心室肥厚',
    'Confounders: LBBB and pacing (Sgarbossa, Smith), RBBB, LVH',
    'Factores de confusión: bloqueo de rama izquierda y marcapasos (Sgarbossa, Smith), bloqueo de rama derecha, HVI',
  ),
  summary: l(
    '左束支传导阻滞与心室起搏让标准 STEMI 阈值失效，改用 Sgarbossa 标准（Smith 改良：同向改变与 ST/S 比值 ≤ −0.25）；右束支传导阻滞不掩盖抬高，照用标准阈值；左心室肥厚靠比例（ST ≥ S 波深度的 25 %）识别叠加的闭塞。',
    'LBBB and ventricular pacing invalidate the standard STEMI thresholds — read with the (Smith-modified) Sgarbossa criteria: concordant changes and an ST/S ratio ≤ −0.25. RBBB does not hide elevation, so the standard thresholds apply; with LVH, proportionality (ST ≥ 25 % of the S depth) flags a superimposed STEMI.',
    'El bloqueo de rama izquierda y la estimulación ventricular anulan los umbrales estándar de IAMCEST: léelos con los criterios de Sgarbossa (modificados por Smith), cambios concordantes y cociente ST/S ≤ −0,25. El bloqueo de rama derecha no oculta la elevación y se aplican los umbrales habituales; en la HVI, la proporcionalidad (ST ≥ 25 % de la S) delata un IAMCEST sobreañadido.',
  ),
  objectives: [
    l(
      '解释为什么 LBBB 与心室起搏使常规 STEMI 毫米阈值不可用，并按顺序应用 Sgarbossa 标准（含 Smith 改良的 ST/S ≤ −0.25）。',
      'Explain why LBBB and ventricular pacing make the standard STEMI millimetre thresholds unusable, and apply the Sgarbossa criteria in order (including Smith\'s ST/S ratio ≤ −0.25).',
      'Explicar por qué el BRI y la estimulación ventricular hacen inaplicables los umbrales milimétricos habituales del IAMCEST, y aplicar en orden los criterios de Sgarbossa (incluido el cociente ST/S ≤ −0,25 de Smith).',
    ),
    l(
      '把同一套判读扩展到心室起搏心律，并掌握路径底线：缺血症状持续时，不论标准阴性与否均按 STEMI 处理。',
      'Extend the same reading to a ventricularly paced rhythm, and own the pathway rule: with ongoing ischaemic symptoms, manage as STEMI whatever the criteria say.',
      'Extender la misma lectura al ritmo con estimulación ventricular y asumir la regla de la vía: con síntomas isquémicos persistentes se trata como IAMCEST, digan lo que digan los criterios.',
    ),
    l(
      '对 RBBB 直接使用标准 STEMI 阈值，区分 V1–V3 的继发性改变，并说出新发 RBBB 伴缺血症状的高危含义。',
      'Apply the standard STEMI thresholds directly to RBBB, separate the secondary V1–V3 changes, and state what new RBBB with ischaemic symptoms means for risk.',
      'Aplicar directamente los umbrales estándar de IAMCEST al BRD, distinguir los cambios secundarios de V1–V3 y expresar lo que implica un BRD nuevo con síntomas isquémicos.',
    ),
    l(
      '用比例原则（ST ≥ S 波深度的 25 %、凸面、新发）判断 LVH 之上是否叠加了急性闭塞。',
      'Use proportionality (ST ≥ 25 % of the S depth, convex, new) to decide whether an acute occlusion is superimposed on LVH.',
      'Usar la proporcionalidad (ST ≥ 25 % de la S, convexa, nueva) para decidir si sobre una HVI se ha sobreañadido una oclusión aguda.',
    ),
  ],
  minutes: 15,
  competencies: ['C8', 'C6'],
  findings: ['sgarbossa-positive', 'lbbb', 'rbbb', 'lvh'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('sgarbossa', 981, undefined, 'smith'),
      view: { layout: '3x4+1', highlightLeads: ['V2', 'V3', 'V4'] },
      question: l(
        '73 岁男性，胸痛持续 40 分钟，已知完全性左束支传导阻滞。这份心电图上还能诊断急性心肌梗死吗？先想好你的答案再往下读。',
        'A 73-year-old man with 40 minutes of chest pain and known complete LBBB. Can you diagnose an acute myocardial infarction on this ECG at all? Commit to an answer before reading on.',
        'Un varón de 73 años con 40 minutos de dolor torácico y un bloqueo completo de rama izquierda conocido. ¿Se puede diagnosticar un infarto agudo de miocardio en este ECG? Decide tu respuesta antes de continuar.',
      ),
      reveal: l(
        '能。LBBB 让常规毫米阈值失效，但没有让判读失效：看 V3——深 S 波之上约 3.5 mm 的 ST 抬高**大得不成比例**，超过 S 波深度（约 13 mm）的四分之一（ST/S 约 −0.28，≤ −0.25），V1、V2 也越过同一条线（V2 约 18 mm 深的 S 上抬高约 5 mm）。这是 **Smith 改良 Sgarbossa 标准**阳性——而且这里只有它阳性：没有任何导联出现同向抬高或同向压低，只看原始的同向标准就会漏掉。合起来：LBBB 之上的急性前壁闭塞。今天的课题：穿过干扰底图，把闭塞找出来。',
        'Yes. LBBB disables the usual millimetre thresholds, but not the diagnosis: look at V3 — about 3.5 mm of ST elevation sits on an S wave about 13 mm deep, **grossly disproportionate**: more than a quarter of the S depth (ST/S about −0.28, ≤ −0.25), and V1 and V2 cross the same line (V2: about 5 mm on an S about 18 mm deep). That is a positive **Smith-modified Sgarbossa criterion** — and here it is the only one: no lead shows concordant elevation or concordant depression, so the concordance criteria alone would have missed it. Together: an acute anterior occlusion on top of the LBBB. Today\'s task: find the occlusion through the confounder.',
        'Sí. El BRI anula los umbrales milimétricos habituales, pero no el diagnóstico: mira V3: unos 3,5 mm de elevación del ST sobre una S de unos 13 mm, **groseramente desproporcionada**, más de la cuarta parte de la profundidad de la S (ST/S en torno a −0,28, ≤ −0,25), y V1 y V2 cruzan la misma línea (V2: unos 5 mm sobre una S de unos 18 mm). Es un **criterio de Sgarbossa modificado por Smith** positivo, y aquí es el único: ninguna derivación muestra elevación ni descenso concordantes, así que los criterios de concordancia solos lo habrían pasado por alto. En conjunto: una oclusión anterior aguda sobre el BRI. La tarea de hoy: encontrar la oclusión a través del factor de confusión.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('lbbb', 982),
      showConduction: true,
      emphasize: ['lbb'],
      caption: l(
        '播放一个心动周期：左束支被阻断（传导系统中亮起的部分），室间隔从右向左除极，激动在心肌内缓慢扩布——QRS 增宽，V1 深 S、侧壁宽钝 R 波。ST 段与 T 波是继发改变，与 QRS 主波反向是这张底图的“标配”。先认识它，才能在它之上认出真正的损伤电流。',
        'Play one beat: the left bundle is blocked (lit in the conduction system), the septum activates right-to-left and the impulse crawls through working muscle — the QRS widens, V1 shows a deep S and the lateral leads a broad, slurred R. The ST segment and T wave are secondary changes, discordant to the QRS by design in this baseline. Know it first; only then can you recognise a true injury current on top of it.',
        'Reproduce un latido: la rama izquierda está bloqueada (la parte iluminada del sistema de conducción), el tabique se despolariza de derecha a izquierda y el impulso avanza despacio por el miocardio: el QRS se ensancha, V1 muestra una S profunda y las laterales una R ancha y empastada. El ST y la T son cambios secundarios, discordantes al QRS por diseño en este trazado base. Conócelo primero; solo entonces podrás reconocer encima una corriente de lesión verdadera.',
      ),
    },
    {
      kind: 'text',
      title: l('为什么这张图不能“照常读”', 'Why this tracing cannot be read the usual way', 'Por qué este registro no se puede leer como siempre'),
      body: l(
        '- 左束支传导阻滞（LBBB）与心室起搏同时改写**除极与复极**：除极顺序变了，ST 段与 T 波作为继发改变跟着 QRS 主波**反向**移动——V1–V3 的深 S 对应抬高，侧壁大 R 对应压低。这是阻滞在说话，不是缺血。\n- 因此常规 STEMI 毫米阈值在这里**不可用**：既会漏诊（真抬高被当作继发），也会误诊（继发抬高被判为梗死）。\n- 判读工具换成 **Sgarbossa 标准（Smith 改良）**：找“同向”改变（方向错得离谱）与“过度不一致”（比例错得离谱）。Barcelona 标准是同一思路的另一套工具。\n- 症状优先于波形：**束支阻滞或起搏心律的患者，只要缺血症状持续，就按 STEMI 管理**（ESC 2023）——心电图标准只用来把可能性推得更高，从不用来排除。',
        '- Left bundle branch block (LBBB) and ventricular pacing rewrite **depolarisation and repolarisation together**: the activation sequence changes, and the ST segment and T wave, as secondary changes, swing **opposite** the main QRS deflection — a deep S in V1–V3 comes with elevation, a tall lateral R with depression. That is the block speaking, not ischaemia.\n- The standard STEMI millimetre thresholds are therefore **unusable**: they miss real infarcts (dismissed as secondary) and invent false ones (secondary elevation called a STEMI).\n- The reading tool becomes the **(Smith-modified) Sgarbossa criteria**: hunt for *concordant* changes (wrong direction) and *excessively discordant* ones (wrong proportion). The Barcelona criteria are an alternative set built on the same idea.\n- Symptoms outrank waveform: **a patient with a bundle branch block or a paced rhythm and ongoing ischaemic symptoms is managed as STEMI** (ESC 2023) — the ECG criteria only push the probability higher; they never rule out.',
        '- El bloqueo de rama izquierda (BRI) y la estimulación ventricular reescriben **a la vez la despolarización y la repolarización**: cambia la secuencia de activación y el ST y la T, como cambios secundarios, se desvían **en sentido opuesto** a la deflexión principal del QRS; una S profunda en V1–V3 se acompaña de elevación y una R lateral alta, de descenso. Eso habla del bloqueo, no de isquemia.\n- Los umbrales milimétricos habituales del IAMCEST son por tanto **inaplicables**: pasan por alto infartos reales (tachados de secundarios) e inventan otros falsos (elevación secundaria llamada IAMCEST).\n- La herramienta de lectura pasa a ser los **criterios de Sgarbossa (modificados por Smith)**: buscar cambios *concordantes* (dirección equivocada) y *excesivamente discordantes* (proporción equivocada). Los criterios de Barcelona son una alternativa con la misma idea.\n- Los síntomas mandan sobre la morfología: **un paciente con bloqueo de rama o ritmo estimulado y síntomas isquémicos persistentes se maneja como IAMCEST** (ESC 2023); los criterios electrocardiográficos solo elevan aún más la probabilidad, nunca la descartan.',
      ),
    },
    {
      kind: 'criteria',
      title: l('Sgarbossa 标准（Smith 改良）：LBBB 与起搏心律中的心肌梗死', 'The (Smith-modified) Sgarbossa criteria: MI in LBBB and paced rhythm', 'Criterios de Sgarbossa (modificados por Smith): IAM en BRI y ritmo de marcapasos'),
      items: [
        {
          label: l('标准 1：同向 ST 抬高', 'Criterion 1: concordant ST elevation', 'Criterio 1: elevación concordante del ST'),
          value: l(
            '任一 QRS 主波向上的导联 ST 抬高 ≥1 mm（原评分 5 分——最有力的一条）',
            'ST elevation ≥1 mm in any lead whose QRS is positive (5 points in the original score — the strongest)',
            'Elevación del ST ≥1 mm en cualquier derivación con QRS positivo (5 puntos en la puntuación original: la más potente)',
          ),
        },
        {
          label: l('标准 2：V1–V3 同向 ST 压低', 'Criterion 2: concordant ST depression in V1–V3', 'Criterio 2: descenso concordante del ST en V1–V3'),
          value: l(
            'V1–V3（QRS 主波向下）ST 压低 ≥1 mm；起搏心律中 V4–V6 亦可计入（原评分 3 分）',
            'ST depression ≥1 mm in V1–V3 (negative QRS); in paced rhythm V4–V6 may also count (3 points in the original score)',
            'Descenso del ST ≥1 mm en V1–V3 (QRS negativo); en ritmo estimulado también cuentan V4–V6 (3 puntos en la puntuación original)',
          ),
        },
        {
          label: l('标准 3（原始 1996）：不一致抬高 ≥5 mm', 'Criterion 3 (original 1996): discordant elevation ≥5 mm', 'Criterio 3 (original de 1996): elevación discordante ≥5 mm'),
          value: l(
            'QRS 主波向下的导联 ST 抬高 ≥5 mm（原评分 2 分；不敏感——是否阳性取决于 QRS 振幅）',
            'ST elevation ≥5 mm in a lead with a negative QRS (2 points in the original score; insensitive — whether it is met depends on QRS amplitude)',
            'Elevación del ST ≥5 mm en una derivación con QRS negativo (2 puntos en la puntuación original; poco sensible: depende de la amplitud del QRS)',
          ),
        },
        {
          label: l('Smith 改良（2012）', 'Smith modification (2012)', 'Modificación de Smith (2012)'),
          value: l(
            '用 ST/S 比值 ≤ −0.25 取代标准 3：J 点抬高 ≥1 mm ÷ 同一导联 S 波深度；更敏感，特异性相近',
            'Replaces criterion 3 with an ST/S ratio ≤ −0.25: J-point elevation ≥1 mm ÷ depth of the S wave in the same lead; more sensitive with similar specificity',
            'Sustituye el criterio 3 por un cociente ST/S ≤ −0,25: elevación del punto J ≥1 mm ÷ profundidad de la onda S en la misma derivación; más sensible con especificidad similar',
          ),
        },
        {
          label: l('适用范围', 'Where they apply', 'Dónde se aplican'),
          value: l(
            'LBBB 与心室起搏（右室起搏 = “电学 LBBB”）；任何一条阳性 + 缺血症状 ⇒ 按 STEMI 处理',
            'LBBB and ventricular pacing (RV pacing = an electronic LBBB); any positive criterion + ischaemic symptoms ⇒ manage as STEMI',
            'BRI y estimulación ventricular (la estimulación del VD es un BRI «electrónico»); cualquier criterio positivo + síntomas isquémicos ⇒ tratar como IAMCEST',
          ),
        },
        {
          label: l('路径底线（ESC 2023）', 'The pathway bottom line (ESC 2023)', 'La regla de la vía (ESC 2023)'),
          value: l(
            '束支阻滞或起搏使心电图无法被准确评估：缺血症状持续的患者，不论标准阴性与否，均按 STEMI 管理',
            'A bundle branch block or paced rhythm prevents accurate ECG assessment: a patient with ongoing ischaemic symptoms is managed as STEMI regardless of the criteria',
            'Un bloqueo de rama o un ritmo de marcapasos impiden valorar el ECG con precisión: el paciente con síntomas isquémicos persistentes se maneja como IAMCEST con independencia de los criterios',
          ),
        },
      ],
      source:
        'Sgarbossa EB et al. N Engl J Med 1996;334:481-487; Smith SW et al. Ann Emerg Med 2012;60:766-776; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826; Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    },
    {
      kind: 'worked',
      title: l('四步走：确认底图 → 同向扫一遍 → 量比值 → 判读启动', 'Four steps: baseline → scan for concordance → measure the ratio → call it', 'Cuatro pasos: trazado base → buscar concordancia → medir el cociente → decidir'),
      ecg: synth('sgarbossa', 983, undefined, 'smith'),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('确认底图：这就是 LBBB', 'Confirm the baseline: this is LBBB', 'Confirma el trazado base: es un BRI'),
          body: l(
            'QRS 增宽（≥120 ms），I、V6 宽钝的 R 波，V1 呈深 S（rS 型），无间隔 q 波——底图是完全性左束支传导阻滞，ST-T 与 QRS 主波反向属于预期。患者胸痛仍在持续：底图归底图，任务归任务。',
            'The QRS is wide (≥120 ms), I and V6 show broad slurred R waves, V1 a deep S (rS), with no septal q — the baseline is complete LBBB, and ST-T discordant to the QRS is expected here. The chest pain is ongoing: the baseline is one thing, the task another.',
            'El QRS es ancho (≥120 ms), I y V6 muestran R anchas y empastadas, V1 una S profunda (rS) y no hay onda q septal: el trazado base es un BRI completo, y un ST-T discordante al QRS es lo esperado. El dolor torácico persiste; el trazado base es una cosa y la tarea otra.',
          ),
          marks: [{ auto: 'qrs', lead: 'V6' }],
          highlightLeads: ['I', 'V1', 'V6'],
        },
        {
          title: l('先扫同向改变（标准 1 和 2）', 'Scan for concordance first (criteria 1 and 2)', 'Busca primero la concordancia (criterios 1 y 2)'),
          body: l(
            '标准 1：逐个检查 QRS 主波向上的导联。I、aVL、V5–V6 没有 ST 抬高（按 LBBB 的预期反向压低）；过渡导联 V4 的 QRS 以正向 R′ 结束、总体向上，ST 只抬高约 0.5 mm——不到 1 mm，**标准 1 阴性**（过渡导联最容易被漏看，每次都要查）。标准 2：QRS 主波向下的 V1–V3 有没有 ST 压低 ≥1 mm？没有。两条同向标准都阴性——判读还没结束。',
            'Criterion 1: check every lead with a positive QRS. I, aVL and V5–V6 show no ST elevation (they are depressed, as LBBB expects); in V4, the transitional lead, the QRS ends in a positive R′ and is net positive, but the ST is up only about 0.5 mm — under 1 mm: **criterion 1 negative** (the transitional lead is the easiest to miss, so check it every time). Criterion 2: is there ST depression ≥1 mm in V1–V3, where the QRS is negative? No. Both concordance criteria are negative — the reading is not over.',
            'Criterio 1: revisa cada derivación con QRS positivo. I, aVL y V5–V6 no muestran elevación del ST (descienden, como espera el BRI); en V4, la derivación de transición, el QRS termina en una R′ positiva y es positivo en conjunto, pero el ST solo sube unos 0,5 mm, menos de 1 mm: **criterio 1 negativo** (la derivación de transición es la más fácil de pasar por alto: revísala siempre). Criterio 2: ¿hay descenso del ST ≥1 mm en V1–V3, donde el QRS es negativo? No. Los dos criterios de concordancia son negativos: la lectura no ha terminado.',
          ),
          marks: [
            { auto: 'st', lead: 'V4' },
            { auto: 'st', lead: 'V5' },
            { auto: 'st', lead: 'V2' },
          ],
          highlightLeads: ['I', 'aVL', 'V4', 'V5', 'V6', 'V1', 'V2', 'V3'],
        },
        {
          title: l('量比值：S 波深度对 J 点抬高', 'Measure the ratio: S depth against J-point elevation', 'Mide el cociente: profundidad de la S frente a la elevación del punto J'),
          body: l(
            '单独看 V3。量 S 波深度（到 TP 基线），再量 J 点抬高的毫米数。这里 J 点约 3.5 mm、S 波约 11.5 mm，ST/S 约 −0.3：抬高超过 S 波深度的四分之一（V1、V2 约 −0.27 和 −0.29，也越过这条线——其实一个导联达标就够）。Smith 改良正是把原始的“≥5 mm”换成了这个比例——同一个界值对深 S 和浅 S 都适用。',
            'Look at V3 alone. Measure the depth of the S wave (against the TP baseline), then the J-point elevation in millimetres. Here the J point is about 3.5 mm and the S about 11.5 mm, so the ST/S is about −0.3: the elevation exceeds a quarter of the S depth (V1 and V2, at about −0.27 and −0.29, cross the line too — although one lead meeting the ratio is enough). Smith\'s modification is exactly this ratio in place of the original "≥5 mm" — one threshold that works for deep and shallow S waves alike.',
            'Mira solo V3. Mide la profundidad de la onda S (sobre la línea de base TP) y después la elevación del punto J en milímetros. Aquí el punto J está a unos 3,5 mm y la S mide unos 11,5 mm, así que el cociente ST/S ronda −0,3: la elevación supera la cuarta parte de la S (V1 y V2, con unos −0,27 y −0,29, también la cruzan, aunque basta con que una derivación cumpla). La modificación de Smith es justo este cociente en lugar del «≥5 mm» original: un único umbral que sirve igual para ondas S profundas y superficiales.',
          ),
          marks: [
            { auto: 's', lead: 'V3' },
            { auto: 'j', lead: 'V3' },
            { auto: 'st60', lead: 'V3' },
          ],
          view: { layout: 'single', lead: 'V3' },
        },
        {
          title: l('判读并启动路径', 'Call it and start the pathway', 'Decide y activa la vía'),
          body: l(
            'V1–V3 的 ST/S ≤ −0.25（同向标准阴性）⇒ 改良 Sgarbossa 阳性：LBBB 之上的急性前壁闭塞——按 STEMI 处理，直接进导管室，不等肌钙蛋白。反方向也要记住：即使三条标准全阴性，只要缺血症状持续，ESC 2023 仍把这样的患者按 STEMI 管理。',
            'ST/S ≤ −0.25 in V1–V3 (concordance criteria negative) ⇒ modified Sgarbossa positive: an acute anterior occlusion on top of LBBB — manage as STEMI, straight to the cath lab, without waiting for troponin. And remember the reverse: even with all three criteria negative, ongoing ischaemic symptoms still put such a patient on the STEMI pathway (ESC 2023).',
            'ST/S ≤ −0,25 en V1–V3 (criterios de concordancia negativos) ⇒ Sgarbossa modificado positivo: oclusión anterior aguda sobre el BRI; trátalo como IAMCEST, directamente a sala de hemodinámica, sin esperar la troponina. Y recuerda el sentido inverso: aunque los tres criterios sean negativos, los síntomas isquémicos persistentes mantienen al paciente en la vía del IAMCEST (ESC 2023).',
          ),
          marks: [
            { auto: 'st', lead: 'V2' },
            { auto: 'st', lead: 'V3' },
            { auto: 'st', lead: 'V4' },
          ],
          highlightLeads: ['V1', 'V2', 'V3', 'V4'],
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('sgarbossa', 984),
      view: { layout: '3x4+1', highlightLeads: ['V5', 'V6'] },
      marks: [
        { auto: 'qrs', lead: 'V6' },
        { auto: 'st', lead: 'V6' },
      ],
      caption: l(
        '标准 1 的样子：V5–V6 的 QRS 主波向上（宽大 R 波），ST 却同向抬高 ≥1 mm——侧壁的损伤电流把 LBBB“应有”的继发性压低顶成了抬高。这是三条中最有力的一条（原评分 5 分），见到即可启动再灌注。',
        'What criterion 1 looks like: in V5–V6 the QRS is positive (broad R waves) and the ST is elevated ≥1 mm in the same direction — a lateral injury current has flipped the LBBB\'s "expected" secondary depression into elevation. This is the strongest of the three (5 points in the original score); seeing it is enough to activate reperfusion.',
        'Así se ve el criterio 1: en V5–V6 el QRS es positivo (R anchas) y el ST se eleva ≥1 mm en la misma dirección; una corriente de lesión lateral ha invertido en elevación el descenso secundario «esperado» del BRI. Es el más potente de los tres (5 puntos en la puntuación original), y verlo basta para activar la reperfusión.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('sgarbossa', 985, undefined, 'concordant-depression'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3'] },
      marks: [
        { auto: 'st', lead: 'V2' },
        { auto: 'st', lead: 'V3' },
      ],
      caption: l(
        '标准 2 的样子：V1–V3 的 QRS 主波向下，LBBB 本该给出“继发性抬高”，这里 V2 与 V3 却压低约 1.5–2.5 mm（同向压低 ≥1 mm；V1 约 0.5 mm）——后壁损伤电流的镜像（原评分 3 分）。QRS 向上的导联没有同向抬高（标准 1 阴性）：这份图单独展示标准 2，仅凭它就足以判为 LBBB 之上的后壁闭塞。',
        'What criterion 2 looks like: in V1–V3 the QRS is negative and LBBB should give "secondary elevation", yet V2 and V3 are depressed by about 1.5–2.5 mm (concordant depression ≥1 mm; V1 about 0.5 mm) — the mirror of a posterior injury current (3 points in the original score). No lead with a positive QRS shows concordant elevation (criterion 1 negative): this tracing isolates criterion 2, which on its own is enough to call a posterior occlusion on top of the LBBB.',
        'Así se ve el criterio 2: en V1–V3 el QRS es negativo y el BRI debería dar «elevación secundaria», pero V2 y V3 descienden unos 1,5-2,5 mm (descenso concordante ≥1 mm; V1 unos 0,5 mm): el espejo de una corriente de lesión posterior (3 puntos en la puntuación original). Ninguna derivación con QRS positivo muestra elevación concordante (criterio 1 negativo): este trazado aísla el criterio 2, que por sí solo basta para diagnosticar una oclusión posterior sobre el BRI.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('paced-ddd', 986),
      view: { layout: '3x4+1' },
      marks: [
        { auto: 'pacing-spike' },
        { auto: 'qrs', lead: 'V1' },
      ],
      caption: l(
        '心室起搏（DDD，房室顺序起搏）：钉样信号后紧跟宽大 QRS——右室心尖起搏产生“电学 LBBB”（胸前导联 QRS 以负向为主、电轴偏左上）。ST-T 同样与 QRS 反向，同样不能按普通阈值读：用 Sgarbossa 型标准判读（起搏心律中同向压低还可计入 V4–V6）。缺血症状持续时直接按 STEMI 处理。',
        'Ventricular pacing (DDD, atrio-ventricular sequential): each spike is followed by a wide QRS — right ventricular apical pacing creates an "electronic LBBB" (predominantly negative precordial QRS, superior-leftward axis). The ST-T is again discordant to the QRS and again cannot be read with the usual thresholds: apply the Sgarbossa-type rules (in paced rhythm concordant depression may also count in V4–V6). With ongoing ischaemic symptoms, straight to the STEMI pathway.',
        'Estimulación ventricular (DDD, secuencial auriculoventricular): cada espícula va seguida de un QRS ancho; la estimulación del ápex del ventrículo derecho crea un «BRI electrónico» (QRS precordial predominantemente negativo, eje superior-izquierdo). El ST-T vuelve a ser discordante al QRS y vuelve a no poder leerse con los umbrales habituales: aplica las reglas tipo Sgarbossa (en ritmo estimulado el descenso concordante también puede contar en V4–V6). Con síntomas isquémicos persistentes, directamente a la vía del IAMCEST.',
      ),
    },
    {
      kind: 'contrast',
      title: l('多“不一致”才算过分？', 'How discordant is too discordant?', '¿Cuánta discordancia es excesiva?'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('lbbb', 987),
        caption: l(
          'A：无并发症的 LBBB：V2–V3 深 S，继发性 ST 抬高存在但比例相称（约占 S 波深度的十分之一，ST/S 约 −0.1）',
          'A: uncomplicated LBBB: deep S in V2–V3 with secondary ST elevation that stays proportionate (roughly a tenth of the S depth, ST/S about −0.1)',
          'A: BRI sin complicaciones: S profunda en V2–V3 con elevación secundaria del ST pero proporcionada (aproximadamente una décima parte de la S, ST/S en torno a −0,1)',
        ),
        marks: [{ auto: 'st', lead: 'V3' }],
      },
      right: {
        ecg: synth('sgarbossa', 988, undefined, 'smith'),
        caption: l(
          'B：同一底图 + 前壁损伤电流：V3 的抬高对 S 波深度而言过大（ST/S 约 −0.3，≤ −0.25）——改良 Sgarbossa 阳性',
          'B: the same baseline + an anterior injury current: the V3 elevation is far too large for the S depth (ST/S about −0.3, ≤ −0.25) — modified Sgarbossa positive',
          'B: el mismo trazado base + corriente de lesión anterior: la elevación en V3 es demasiado grande para la profundidad de la S (ST/S en torno a −0,3, ≤ −0,25): Sgarbossa modificado positivo',
        ),
        marks: [{ auto: 'st', lead: 'V3' }],
      },
      point: l(
        '两份图的 ST 都与 QRS 主波**反向**——在 LBBB 里这本身是正常的。差别全在**比例**：A 的抬高约占 S 波深度的十分之一，B 超过四分之一。肉眼会错判它：量 S、量 J 点、算出比值，再下结论。',
        'In both tracings the ST is **opposite** the main QRS deflection — in LBBB that by itself is normal. The whole difference is **proportion**: in A the elevation is about a tenth of the S depth, in B more than a quarter. The eye will misjudge it: measure the S, measure the J point, compute the ratio, then commit.',
        'En ambos registros el ST es **opuesto** a la deflexión principal del QRS, y en el BRI eso en sí es normal. Toda la diferencia está en la **proporción**: en A la elevación es una décima parte de la S y en B supera la cuarta parte. El ojo la malvalora: mide la S, mide el punto J, calcula el cociente y entonces decide.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('rbbb', 989),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3'] },
      marks: [
        { auto: 'qrs', lead: 'V1' },
        { auto: 't', lead: 'V1' },
      ],
      caption: l(
        '右束支传导阻滞：V1 呈 rsR\u2032、QRS 增宽，但左心室除极顺序未变——ST 抬高不被掩盖，标准 STEMI 阈值照常适用。V1–V2 的 T 波倒置（可伴轻度 ST 压低）多为右室延迟复极的继发改变（rsR\u2032 之后本该如此），不要判为缺血。真正要警惕的是新发（或推测新发）RBBB + 缺血症状：常意味着闭塞的动脉（TIMI 0–2 级血流）与大范围梗死——高危，考虑即刻造影。',
        'Right bundle branch block: rsR\u2032 in V1 with a wide QRS, but LV activation is unchanged — ST elevation is not hidden and the standard STEMI thresholds apply as usual. The T inversion in V1–V2 (with or without slight ST depression) is mostly secondary to delayed right ventricular repolarisation (expected after an rsR\u2032), not ischaemia. What demands respect is a new (or presumed-new) RBBB with ischaemic symptoms: it often means an occluded artery (TIMI 0–2 flow) and a large infarct — high risk, consider immediate angiography.',
        'Bloqueo de rama derecha: rsR\u2032 en V1 con QRS ancho, pero la activación del ventrículo izquierdo no cambia; la elevación del ST no queda oculta y se aplican sin más los umbrales estándar de IAMCEST. La T negativa en V1–V2 (con o sin un leve descenso del ST) es en su mayoría secundaria a la repolarización ventricular derecha retardada (lo esperado tras una rsR\u2032), no isquemia. Lo que hay que respetar es un BRD nuevo (o presumiblemente nuevo) con síntomas isquémicos: suele significar una arteria ocluida (flujo TIMI 0–2) y un infarto extenso; alto riesgo, valora la coronariografía inmediata.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('lvh-strain', 990),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3', 'V5', 'V6'] },
      marks: [
        { auto: 's', lead: 'V2' },
        { auto: 'st', lead: 'V2' },
        { auto: 'st', lead: 'V5' },
      ],
      caption: l(
        '左心室肥厚伴继发性 ST-T 改变：V1–V3 的深 S 波带着“预期内”的不一致性 ST 抬高与直立 T 波，侧壁 V5–V6 则压低、T 倒置——这是最常见的假“前壁 STEMI”之一，不是闭塞。何时升级怀疑叠加梗死：ST 抬高 ≥ S 波深度的 25 %、形态凸面向上、或较既往为新发（V1–V4）。还是那句话：用比例，不用眼睛。',
        'Left ventricular hypertrophy with secondary ST-T (strain): the deep S waves in V1–V3 carry "expected" discordant ST elevation and upright T waves, while V5–V6 show depression and inverted T — one of the commonest fake "anterior STEMIs", not an occlusion. Escalate towards a superimposed infarct when the ST elevation is ≥25 % of the S depth, convex, or new compared with a previous tracing (V1–V4). Same rule as ever: use proportion, not the eye.',
        'Hipertrofia ventricular izquierda con ST-T secundario («sobrecarga»): las S profundas de V1–V3 llevan una elevación discordante del ST «esperada» con T positiva, mientras V5–V6 muestran descenso y T negativa; es uno de los falsos «IAMCEST anteriores» más frecuentes, no una oclusión. Escala hacia un infarto sobreañadido cuando la elevación del ST sea ≥25 % de la profundidad de la S, convexa o nueva respecto a un trazado previo (V1–V4). La misma regla de siempre: proporción, no el ojo.',
      ),
    },
    { kind: 'check', item: { family: 'occlusion', seed: 63 } },
    { kind: 'check', item: { family: 'occlusion', seed: 26 } },
    { kind: 'drill', families: ['occlusion', 'ischemia-patterns'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [16100, 3990, 17856],
      caption: l(
        '三份真实心电图：67 岁女性的完全性左束支传导阻滞、76 岁男性的起搏心律、73 岁男性的左心室肥厚。每份先想好判读——LBBB 与起搏图逐条过 Sgarbossa（改良）标准，LVH 图量 ST 对 S 的比例；全部想好再揭晓。',
        'Three real tracings: complete LBBB in a 67-year-old woman, a paced rhythm in a 76-year-old man, and LVH in a 73-year-old man. Commit on each before the reveal — run the (modified) Sgarbossa criteria line by line on the LBBB and paced tracings, and measure the ST-to-S proportion on the LVH one.',
        'Tres ECG reales: bloqueo completo de rama izquierda en una mujer de 67 años, ritmo de marcapasos en un varón de 76 e HVI en un varón de 73. Decide en cada uno antes de mirar la solución: pasa uno a uno los criterios de Sgarbossa (modificados) en el BRI y en el ritmo estimulado, y mide la proporción ST/S en la HVI.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '见到 LBBB 就写“无法诊断心肌梗死”：Sgarbossa（改良）标准正是为此而生——同向改变与 ST/S 比值把可能性推到足够高；且症状持续时按 STEMI 处理，与心电图无关。',
          'Writing "MI cannot be diagnosed" the moment you see LBBB: the (modified) Sgarbossa criteria exist precisely for this — concordant changes and the ST/S ratio push the probability high enough; and with ongoing symptoms the patient goes down the STEMI pathway regardless of the ECG.',
          'Escribir «no se puede diagnosticar infarto» al ver un BRI: los criterios de Sgarbossa (modificados) existen justo para eso; los cambios concordantes y el cociente ST/S elevan la probabilidad lo suficiente, y con síntomas persistentes el paciente sigue la vía del IAMCEST con independencia del ECG.',
        ),
        l(
          '只用 1996 年原始的“不一致抬高 ≥5 mm”：对深 S 波的患者它几乎从不阳性；换成 Smith 的 ST/S ≤ −0.25，同一界值对大小 QRS 都适用。',
          'Using only the original 1996 "discordant elevation ≥5 mm": in patients with deep S waves it is almost never positive; switch to Smith\'s ST/S ≤ −0.25, one threshold that works for large and small QRS complexes alike.',
          'Usar solo la «elevación discordante ≥5 mm» original de 1996: con ondas S profundas casi nunca se cumple; cámbiala por el cociente ST/S ≤ −0,25 de Smith, un único umbral que sirve igual con QRS grandes y pequeños.',
        ),
        l(
          '起搏心律按普通 UDMI 阈值读：右室起搏就是“电学 LBBB”，抬高与压低都要按 Sgarbossa 型标准判读（同向压低还可计入 V4–V6）。',
          'Reading a paced rhythm with the standard UDMI thresholds: right ventricular pacing is an "electronic LBBB"; judge its elevations and depressions with the Sgarbossa-type rules (concordant depression may also count in V4–V6).',
          'Leer un ritmo de marcapasos con los umbrales habituales de la definición universal: la estimulación del ventrículo derecho es un «BRI electrónico»; valora sus elevaciones y descensos con las reglas tipo Sgarbossa (el descenso concordante también puede contar en V4–V6).',
        ),
        l(
          'LVH 在 V1–V3 的不一致抬高直接判 STEMI：先量比例——≥ S 波深度的 25 %、凸面向上或新发才升级；否则它是肥厚的预期表现。',
          'Calling LVH\'s discordant V1–V3 elevation a STEMI outright: measure the proportion first — escalate only if it is ≥25 % of the S depth, convex or new; otherwise it is the expected face of hypertrophy.',
          'Llamar IAMCEST sin más a la elevación discordante en V1–V3 de la HVI: mide antes la proporción; escala solo si es ≥25 % de la profundidad de la S, convexa o nueva; si no, es la cara esperada de la hipertrofia.',
        ),
        l(
          '把 RBBB 在 V1–V3 的继发性 T 波倒置判为缺血：rsR\u2032 之后本该如此；RBBB 不掩盖真正的抬高——用标准阈值，别把继发改变读成原发性。',
          'Calling RBBB\'s secondary T inversion in V1–V3 ischaemia: after an rsR\u2032 it is expected; RBBB does not hide real elevation — apply the standard thresholds and do not read secondary changes as primary.',
          'Llamar isquemia a la T negativa secundaria del BRD en V1–V3: tras una rsR\u2032 es lo esperado; el BRD no oculta la elevación real: aplica los umbrales estándar y no leas como primarios los cambios secundarios.',
        ),
        l(
          'Sgarbossa 全阴性就“放行”：阴性不排除闭塞——缺血症状持续、血流不稳或系列心电图有动态变化，仍按 STEMI 立即处理。',
          '"Clearing" the patient because every Sgarbossa criterion is negative: negative does not exclude occlusion — ongoing ischaemic symptoms, haemodynamic instability or dynamic change on serial ECGs still demand an immediate STEMI response.',
          'Dar por cerrado el caso porque todos los criterios de Sgarbossa son negativos: lo negativo no excluye la oclusión; los síntomas isquémicos persistentes, la inestabilidad hemodinámica o los cambios dinámicos en ECG seriados siguen exigiendo una respuesta inmediata como IAMCEST.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'LBBB 与心室起搏使常规 STEMI 阈值失效：ST-T 与 QRS 主波反向是底图的一部分。判读用 Sgarbossa 标准——同向抬高 ≥1 mm（最有力）、V1–V3 同向压低 ≥1 mm、过度不一致（Smith：ST/S ≤ −0.25，取代原始的 ≥5 mm）。',
          'LBBB and ventricular pacing invalidate the standard STEMI thresholds: ST-T discordant to the QRS is part of the baseline. Read with the Sgarbossa criteria — concordant elevation ≥1 mm (strongest), concordant V1–V3 depression ≥1 mm, and excessive discordance (Smith: ST/S ≤ −0.25, replacing the original ≥5 mm).',
          'El BRI y la estimulación ventricular anulan los umbrales estándar de IAMCEST: un ST-T discordante al QRS forma parte del trazado base. Lee con los criterios de Sgarbossa: elevación concordante ≥1 mm (la más potente), descenso concordante en V1–V3 ≥1 mm y discordancia excesiva (Smith: ST/S ≤ −0,25, en lugar del ≥5 mm original).',
        ),
        l(
          '任何一条阳性 + 缺血症状 ⇒ 立即再灌注；全阴性而症状持续 ⇒ 仍按 STEMI 管理（ESC 2023）：束支阻滞或起搏使心电图无法被准确评估。',
          'Any positive criterion + ischaemic symptoms ⇒ immediate reperfusion; all negative with ongoing symptoms ⇒ still managed as STEMI (ESC 2023): a bundle branch block or paced rhythm prevents accurate ECG assessment.',
          'Cualquier criterio positivo + síntomas isquémicos ⇒ reperfusión inmediata; todos negativos con síntomas persistentes ⇒ igualmente manejado como IAMCEST (ESC 2023): el bloqueo de rama o el ritmo estimulado impiden valorar el ECG con precisión.',
        ),
        l(
          'RBBB 不掩盖 ST 抬高：左室除极未变，标准阈值照用；V1–V3 的 ST/T 改变可为继发；新发 RBBB + 缺血症状常提示闭塞的大血管——高危，考虑即刻造影。',
          'RBBB does not hide ST elevation: LV activation is unchanged, so the standard thresholds apply; V1–V3 ST/T changes may be secondary; new RBBB with ischaemic symptoms often means an occluded artery — high risk, consider immediate angiography.',
          'El BRD no oculta la elevación del ST: la activación del VI no cambia y se aplican los umbrales habituales; las alteraciones del ST/T en V1–V3 pueden ser secundarias; un BRD nuevo con síntomas isquémicos suele significar una arteria ocluida: alto riesgo, valora la coronariografía inmediata.',
        ),
        l(
          'LVH 是最常见的假“前壁 STEMI”之一：V1–V3 不一致抬高属于预期；ST ≥ S 波深度的 25 %、凸面或新发才怀疑叠加闭塞。',
          'LVH is one of the commonest fake "anterior STEMIs": discordant V1–V3 elevation is expected; suspect a superimposed occlusion only when the ST is ≥25 % of the S depth, convex, or new.',
          'La HVI es uno de los falsos «IAMCEST anteriores» más frecuentes: la elevación discordante en V1–V3 es esperable; sospecha una oclusión sobreañadida solo si el ST ≥25 % de la S, con morfología convexa o de nueva aparición.',
        ),
        l(
          '贯穿全课的技能是比例：量 S、量 J 点、算比值——LBBB、起搏与 LVH 三种底图上，“多大的抬高算过分”都靠分规回答，不靠眼睛。',
          'The skill running through the whole lesson is proportion: measure the S, measure the J point, compute the ratio — on LBBB, paced and LVH baselines alike, "how much elevation is too much" is answered by calipers, not by the eye.',
          'La destreza que atraviesa toda la lección es la proporción: mide la S, mide el punto J y calcula el cociente; sobre trazados con BRI, marcapasos o HVI, «cuánta elevación es demasiada» lo responde el compás, no el ojo.',
        ),
      ],
    },
  ],
  sources: [
    'Sgarbossa EB et al. N Engl J Med 1996;334:481-487',
    'Smith SW et al. Ann Emerg Med 2012;60:766-776',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Castellano et al. 2004',
  ],
};

export default lesson;
