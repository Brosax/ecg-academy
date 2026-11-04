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
        '播放一个心动周期：左束支被阻断，室间隔从右向左除极，激动在心肌内缓慢扩布：QRS 增宽，V1 深 S，侧壁宽钝 R 波。ST-T 与 QRS 主波反向，是这张底图的常态。',
        'Play one beat: the left bundle is blocked, the septum activates right to left and the impulse crawls through the muscle: a wide QRS, a deep S in V1, a broad slurred R laterally. ST–T opposite the QRS is normal for this baseline.',
        'Reproduce un latido: la rama izquierda está bloqueada, el tabique se activa de derecha a izquierda y el impulso avanza despacio por el músculo: QRS ancho, S profunda en V1, R ancha y empastada en las laterales. El ST–T opuesto al QRS es lo normal en este trazado.',
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
            'QRS 增宽（≥120 ms），I、V6 宽钝的 R 波，V1 呈深 S 波，无间隔 q 波——底图是完全性左束支传导阻滞，ST-T 与 QRS 主波反向属于预期。患者胸痛仍在持续：底图归底图，任务归任务。',
            'The QRS is wide (≥120 ms), I and V6 show broad slurred R waves, V1 a deep S, with no septal q — the baseline is complete LBBB, and ST-T discordant to the QRS is expected here. The chest pain is ongoing: the baseline is one thing, the task another.',
            'El QRS es ancho (≥120 ms), I y V6 muestran R anchas y empastadas, V1 una S profunda y no hay onda q septal: el trazado base es un BRI completo, y un ST-T discordante al QRS es lo esperado. El dolor torácico persiste; el trazado base es una cosa y la tarea otra.',
          ),
          marks: [{ auto: 'qrs', lead: 'V6' }],
          highlightLeads: ['I', 'V1', 'V6'],
        },
        {
          title: l('先扫同向改变（标准 1 和 2）', 'Scan for concordance first (criteria 1 and 2)', 'Busca primero la concordancia (criterios 1 y 2)'),
          body: l(
            '标准 1：逐个检查 QRS 主波向上的导联。I、aVL、V5–V6 没有 ST 抬高（I、V5–V6 按 LBBB 的预期反向压低，aVL 平）；过渡导联 V4 的 QRS 以正向 R′ 结束、总体向上，ST 只抬高约 0.5 mm——不到 1 mm，**标准 1 阴性**（过渡导联最容易被漏看，每次都要查）。标准 2：QRS 主波向下的 V1–V3 有没有 ST 压低 ≥1 mm？没有。两条同向标准都阴性——判读还没结束。',
            'Criterion 1: check every lead with a positive QRS. I, aVL and V5–V6 show no ST elevation (I and V5–V6 are depressed, as LBBB expects, and aVL is flat); in V4, the transitional lead, the QRS ends in a positive R′ and is net positive, but the ST is up only about 0.5 mm — under 1 mm: **criterion 1 negative** (the transitional lead is the easiest to miss, so check it every time). Criterion 2: is there ST depression ≥1 mm in V1–V3, where the QRS is negative? No. Both concordance criteria are negative — the reading is not over.',
            'Criterio 1: revisa cada derivación con QRS positivo. I, aVL y V5–V6 no muestran elevación del ST (I y V5–V6 descienden, como espera el BRI, y aVL queda plana); en V4, la derivación de transición, el QRS termina en una R′ positiva y es positivo en conjunto, pero el ST solo sube unos 0,5 mm, menos de 1 mm: **criterio 1 negativo** (la derivación de transición es la más fácil de pasar por alto: revísala siempre). Criterio 2: ¿hay descenso del ST ≥1 mm en V1–V3, donde el QRS es negativo? No. Los dos criterios de concordancia son negativos: la lectura no ha terminado.',
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
      kind: 'film',
      title: l('LBBB 与起搏心律：标准一条一条看', 'LBBB and pacing: the criteria one at a time', 'BRI y marcapasos: los criterios uno a uno'),
      view: { layout: '3x4+1' },
      frames: [
        {
          label: l('Smith 比值', 'Smith ratio', 'Cociente de Smith'),
          ecg: synth('sgarbossa', 981, undefined, 'smith'),
          note: l(
            '开头那份图：V1–V3 的 ST 与 QRS 反向，但抬高超过 S 波深度的四分之一：ST/S ≤ −0.25，阳性。',
            'The opening tracing: in V1–V3 the ST is opposite the QRS but rises more than a quarter of the S depth: ST/S ≤ −0.25, positive.',
            'El trazado inicial: en V1–V3 el ST va contra el QRS pero sube más de una cuarta parte de la S: ST/S ≤ −0,25, positivo.',
          ),
          marks: [{ auto: 's', lead: 'V3' }, { auto: 'j', lead: 'V3' }],
        },
        {
          label: l('标准 1', 'Criterion 1', 'Criterio 1'),
          ecg: synth('sgarbossa', 984),
          note: l(
            'V5–V6：R 波高大，ST 也向上抬高 1.4–1.8 mm：同向抬高，三条中最有力的一条。',
            'V5–V6: tall R waves and the ST up as well, 1.4–1.8 mm: concordant elevation, the strongest of the three.',
            'V5–V6: R altas y el ST también elevado, 1,4–1,8 mm: elevación concordante, el más potente de los tres.',
          ),
          marks: [{ auto: 'j', lead: 'V5' }, { auto: 'j', lead: 'V6' }],
        },
        {
          label: l('标准 2', 'Criterion 2', 'Criterio 2'),
          ecg: synth('sgarbossa', 985, undefined, 'concordant-depression'),
          note: l(
            'V2–V3：QRS 向下，ST 也向下压低超过 1 mm（V3 约 2.5 mm）：V1–V3 同向压低，后壁损伤的镜像。',
            'V2–V3: the QRS points down and the ST goes down too, more than 1 mm (V3 about 2.5 mm): concordant depression in V1–V3, the mirror of posterior injury.',
            'V2–V3: el QRS apunta abajo y el ST también baja más de 1 mm (V3 unos 2,5 mm): descenso concordante en V1–V3, el espejo de una lesión posterior.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }, { auto: 'j', lead: 'V3' }],
        },
        {
          label: l('心室起搏', 'Ventricular pacing', 'Marcapasos ventricular'),
          ecg: synth('paced-ddd', 986),
          note: l(
            '钉样信号后接宽 QRS（约 160 ms）：II、III、aVF 和 V1 呈 QS，T 波与 QRS 反向。“电学 LBBB”：用同样的规则读。',
            'A spike, then a wide QRS (about 160 ms): QS in II, III, aVF and V1, the T opposite the QRS. An "electronic LBBB": read it with the same rules.',
            'Una espícula y después un QRS ancho (unos 160 ms): QS en II, III, aVF y V1, la T opuesta al QRS. Un «BRI electrónico»: léelo con las mismas reglas.',
          ),
          marks: [{ auto: 'pacing-spike' }, { auto: 'qrs', lead: 'V1' }],
        },
      ],
      predict: {
        question: l('LBBB 时，哪一种 ST 改变从来不是“预期”的？', 'In LBBB, which ST change is never expected?', 'En el BRI, ¿qué cambio del ST nunca es esperable?'),
        options: [
          l('QRS 向上的导联 ST 抬高', 'ST elevation in a lead whose QRS points up', 'Elevación del ST en una derivación con QRS positivo'),
          l('V1–V3 深 S 波上的 ST 轻度抬高', 'Slight ST elevation over the deep S in V1–V3', 'Leve elevación del ST sobre la S profunda de V1–V3'),
          l('V5–V6 的 ST 压低', 'ST depression in V5–V6', 'Descenso del ST en V5–V6'),
        ],
        answer: 0,
      },
      caption: l(
        '任何一条阳性 + 缺血症状 ⇒ 按 STEMI 处理。三条全阴性而症状持续，同样按 STEMI 管理（ESC 2023）。',
        'Any criterion positive + ischaemic symptoms ⇒ manage as a STEMI. All three negative with symptoms still going on: manage as a STEMI all the same (ESC 2023).',
        'Cualquier criterio positivo + síntomas isquémicos ⇒ tratar como IAMCEST. Los tres negativos con síntomas persistentes: también como IAMCEST (ESC 2023).',
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
          'B：同样是 LBBB 底图，加上前壁损伤电流：V3 的抬高对 S 波深度而言过大（ST/S 约 −0.3，≤ −0.25）——改良 Sgarbossa 阳性',
          'B: also an LBBB baseline, plus an anterior injury current: the V3 elevation is far too large for the S depth (ST/S about −0.3, ≤ −0.25) — modified Sgarbossa positive',
          'B: también un BRI de base, más una corriente de lesión anterior: la elevación en V3 es demasiado grande para la profundidad de la S (ST/S en torno a −0,3, ≤ −0,25): Sgarbossa modificado positivo',
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
      kind: 'film',
      title: l('另两张宽或高的 QRS：RBBB 与 LVH', 'Two more wide or tall QRS: RBBB and LVH', 'Otros dos QRS anchos o altos: BRD e HVI'),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3', 'V5', 'V6'] },
      frames: [
        {
          label: l('右束支阻滞', 'RBBB', 'BRD'),
          ecg: synth('rbbb', 989),
          note: l(
            'V1 呈 rsR′，QRS 增宽；T 波在 V1–V2 倒置、V3 起直立：rsR′ 之后的预期改变。左心室除极不变，STEMI 阈值照常使用。',
            'rsR′ in V1 and a wide QRS; T inverted in V1–V2 and upright from V3: expected after an rsR′. The LV depolarises normally, so the usual STEMI thresholds apply.',
            'rsR′ en V1 y QRS ancho; T negativa en V1–V2 y positiva desde V3: lo esperable tras un rsR′. El VI se despolariza con normalidad: valen los umbrales habituales del IAMCEST.',
          ),
          marks: [{ auto: 'qrs', lead: 'V1' }, { auto: 't', lead: 'V1' }],
        },
        {
          label: l('左心室肥厚', 'LVH', 'HVI'),
          ecg: synth('lvh-strain', 990),
          note: l(
            'V1–V2 深 S 波上的抬高远不到 S 深度的四分之一；V5–V6 压低、T 倒置：继发改变，不是闭塞。',
            'The elevation over the deep S in V1–V2 is well under a quarter of the S depth; V5–V6 are down with inverted T waves: secondary change, not an occlusion.',
            'La elevación sobre la S profunda de V1–V2 queda muy por debajo de una cuarta parte de la S; V5–V6 descendidas con T negativas: cambio secundario, no oclusión.',
          ),
          marks: [{ auto: 's', lead: 'V2' }, { auto: 'j', lead: 'V2' }, { auto: 't', lead: 'V5' }],
        },
      ],
      caption: l(
        '新发 RBBB + 缺血症状常意味着大血管闭塞。LVH 的抬高达到 S 波的 25 %、变成凸面或为新发时，才怀疑叠加梗死。',
        'A new RBBB with ischaemic symptoms often means a large occluded artery. In LVH, suspect an added infarct only when the elevation reaches 25 % of the S, turns convex or is new.',
        'Un BRD nuevo con síntomas isquémicos suele indicar una gran arteria ocluida. En la HVI, sospecha un infarto añadido solo si la elevación llega al 25 % de la S, se vuelve convexa o es nueva.',
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
          '起搏心律按普通 UDMI 阈值读：右室起搏就是“电学 LBBB”，抬高与压低都要按 Sgarbossa 型标准判读。',
          'Reading a paced rhythm with the standard UDMI thresholds: right ventricular pacing is an "electronic LBBB"; judge its elevations and depressions with the Sgarbossa-type rules.',
          'Leer un ritmo de marcapasos con los umbrales habituales de la definición universal: la estimulación del ventrículo derecho es un «BRI electrónico»; valora sus elevaciones y descensos con las reglas tipo Sgarbossa.',
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
