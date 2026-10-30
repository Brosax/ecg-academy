/**
 * r6 — RBBB and LBBB (strict criteria) (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `bbb-qrs-cutoff`, `rbbb-complete`, `rbbb-incomplete`, `lbbb-complete`,
 * `lbbb-grades` (current values; plus the missing-book items: R-peak time cutoffs, LBBB ST-T concordance rules,
 * BBB in suspected ACS, strict LBBB / Strauss for CRT).
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const STRIP = { layout: 'strip', lead: 'II' } as const;
const V1_STRIP = { layout: 'strip', lead: 'V1' } as const;

const lesson: Lesson = {
  id: 'r6',
  stage: 'R',
  order: 6,
  title: l('右束支与左束支传导阻滞（严格标准）', 'RBBB and LBBB (strict criteria)', 'Bloqueo de rama derecha e izquierda (criterios estrictos)'),
  summary: l(
    '用严格标准诊断完全性右束支与左束支传导阻滞：QRS ≥120 ms 加上形态学与 R 波峰时间，让“哪一侧最晚除极”决定是哪条束支；同时分清不完全性阻滞与正常变异，并知道束支传导阻滞伴持续缺血性胸痛该走哪条路径。',
    'Diagnose complete RBBB and LBBB by strict criteria: QRS >=120 ms plus morphology and R-wave peak time, letting “which side depolarises last” pick the branch; separate incomplete block from a normal variant, and know the pathway for bundle branch block with ongoing ischaemic chest pain.',
    'Diagnosticar el bloqueo completo de rama derecha e izquierda con criterios estrictos: QRS >=120 ms más morfología y tiempo hasta la cima de la R, dejando que “qué lado se despolariza el último” elija la rama; distinguir el bloqueo incompleto de una variante normal y saber qué vía seguir ante un bloqueo de rama con dolor torácico isquémico persistente.',
  ),
  objectives: [
    l(
      '按严格标准诊断完全性右束支与左束支传导阻滞：QRS ≥120 ms、V1/V6 形态、R 波峰时间，QRS 全局测量。',
      'Diagnose complete RBBB and LBBB by strict criteria: QRS >=120 ms, the V1/V6 morphology, R-wave peak time, with the QRS measured globally.',
      'Diagnosticar el bloqueo completo de rama derecha e izquierda con criterios estrictos: QRS >=120 ms, morfología en V1/V6 y tiempo hasta la cima de la R, midiendo el QRS de forma global.',
    ),
    l(
      '用终末向量判断是哪条束支阻滞：问“哪一侧最晚除极？”——V1 的 R′ 对 V6 的宽 S。',
      'Use the terminal forces to decide which branch is blocked: ask “which side is late?” — the R′ in V1 against the broad S in V6.',
      'Usar las fuerzas terminales para decidir qué rama está bloqueada: pregunta “¿qué lado se despolariza el último?”; la R′ en V1 frente a la S ancha en V6.',
    ),
    l(
      '正确处理 110–119 ms 的不完全性阻滞带：rSr′ V1 而 QRS <110 ms 是正常变异，不是不完全性右束支传导阻滞。',
      'Handle the 110–119 ms incomplete band correctly: an rSr′ in V1 with QRS <110 ms is a normal variant, not incomplete RBBB.',
      'Manejar bien la franja incompleta de 110–119 ms: una rSr′ en V1 con QRS <110 ms es una variante normal, no un bloqueo incompleto de rama derecha.',
    ),
    l(
      '读懂 LBBB 的继发性 ST-T 而不误判为缺血，并知道束支传导阻滞（新发或已知）伴持续缺血性胸痛应启动 STEMI 等同路径。',
      'Read the secondary ST-T of LBBB without over-calling ischaemia, and know that bundle branch block (new or known) with ongoing ischaemic chest pain triggers the STEMI-equivalent pathway.',
      'Leer el ST-T secundario del BRI sin llamar isquemia por error, y saber que un bloqueo de rama (nuevo o conocido) con dolor torácico isquémico persistente activa la vía equivalente a STEMI.',
    ),
  ],
  minutes: 16,
  competencies: ['C6', 'C4'],
  findings: ['rbbb', 'lbbb'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('rbbb', 501),
      view: { layout: '3x4+1' },
      question: l(
        'QRS 增宽。除极的终末向量去了哪里——是哪条束支阻滞？先看 V1，再看 V6，写下你的判断。',
        'The QRS is wide. Where do the late depolarisation forces go — which branch is blocked? Look at V1 first, then V6, and commit to an answer.',
        'El QRS es ancho. ¿Hacia dónde van las fuerzas finales de despolarización y qué rama está bloqueada? Mira primero V1 y luego V6, y decide una respuesta.',
      ),
      reveal: l(
        '**右束支传导阻滞（RBBB）**。V1 呈 rsR′（“M 形”：小 r、一个降到基线以下的 s、再一个高大的 R′），I 与 V6 的 S 波宽钝、比 R 波结束得更晚：终末除极指向**右前**——右心室最后除极。室间隔与左心室照常先行除极（初始向量不变，所以电轴和 Q 波都保留），右心室只能等激动从左侧慢慢绕过来。QRS 全局测量 ≥120 ms。整个诊断就写在两处：V1 的 R′ 与 V6 的宽 S。',
        '**Right bundle branch block (RBBB).** V1 shows an rsR′ “M” shape (a small r, an s that dips below the baseline, then a tall R′) and the S in I and V6 is broad and slurred, outlasting the R: the late forces point **rightward and anterior** — the right ventricle depolarises last. The septum and left ventricle still activate normally first (the initial vectors are unchanged, which is why the axis and Q waves survive); the right ventricle must wait for the impulse to creep across from the left. The globally measured QRS is >=120 ms. The whole diagnosis sits in two places: the R′ in V1 and the broad S in V6.',
        '**Bloqueo de rama derecha (BRD).** V1 muestra una rsR′ en “M” (una r pequeña, una s que baja por debajo de la línea de base y una R′ alta) y la S de I y V6 es ancha y empastada, y termina más tarde que la R: las fuerzas finales se dirigen **a la derecha y adelante**; el ventrículo derecho se despolariza el último. El tabique y el ventrículo izquierdo siguen activándose primero con normalidad (los vectores iniciales no cambian, y por eso se conservan el eje y las ondas Q); el ventrículo derecho tiene que esperar a que el impulso llegue despacio desde la izquierda. El QRS medido de forma global es >=120 ms. Todo el diagnóstico está en dos sitios: la R′ de V1 y la S ancha de V6.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('rbbb', 502),
      showConduction: true,
      emphasize: ['rbb'],
      caption: l(
        '右束支是通向右心室的细长高速路。阻滞它：室间隔仍从左向右除极、左心室仍正常除极——**初始向量不变**；右心室最后才靠激动从左心室穿过心肌缓慢扩布除极，产生一个指向右前方的晚期向量。朝向右心室的 V1 记录到晚期的 R′，朝向左心室的 V6 记录到晚期的宽 S。',
        'The right bundle branch is the slim fast road to the right ventricle. Block it: the septum still depolarises left to right and the left ventricle activates normally — **the initial vectors are unchanged**; the right ventricle is depolarised last, slowly, by the impulse spreading through muscle from the left, giving a late force that points rightward and anterior. V1, facing the right ventricle, records the late R′; V6, facing the left ventricle, the late broad S.',
        'La rama derecha es la vía rápida y fina hacia el ventrículo derecho. Si se bloquea: el tabique se despolariza de izquierda a derecha y el ventrículo izquierdo se activa con normalidad — **los vectores iniciales no cambian** —; el ventrículo derecho se despolariza al final, despacio, por el impulso que se propaga desde el izquierdo a través del miocardio, y genera una fuerza tardía dirigida a la derecha y adelante. V1, mirando al ventrículo derecho, registra la R′ tardía; V6, mirando al izquierdo, la S ancha tardía.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('lbbb', 503),
      showConduction: true,
      emphasize: ['lbb'],
      caption: l(
        '左束支阻滞则从第一毫秒起就改变一切：室间隔改为从右向左除极——V5–V6、I 里正常的间隔 q 波**消失**；左心室最后靠激动从右心室扩布过来除极，终末向量指向左后。V1–V2 呈 QS 或 rS，I、aVL、V5–V6 呈宽大、有切迹或粗钝的 R。晚期力量属于左心室，所以 V6 只有 R、没有 S。',
        'Blocking the left bundle changes everything from the first millisecond: the septum depolarises right to left instead — the normal septal q in V5–V6 and I **disappears**; the left ventricle is activated last by spread from the right ventricle, so the terminal forces point leftward and posterior. V1–V2 show QS or rS; I, aVL and V5–V6 show a broad, notched or slurred R. The late forces belong to the left ventricle, so V6 has an R and no S.',
        'Bloquear la rama izquierda lo cambia todo desde el primer milisegundo: el tabique se despolariza de derecha a izquierda — la q septal normal de V5–V6 e I **desaparece** —; el ventrículo izquierdo se activa al final por propagación desde el derecho, de modo que las fuerzas terminales apuntan a la izquierda y atrás. V1–V2 muestran QS o rS; I, aVL y V5–V6 una R ancha, con muescas o empastada. Las fuerzas tardías pertenecen al ventrículo izquierdo, así que en V6 hay R y no hay S.',
      ),
    },
    {
      kind: 'criteria',
      title: l('完全性与不完全性束支传导阻滞：严格标准', 'Complete and incomplete bundle branch block: strict criteria', 'Bloqueo de rama completo e incompleto: criterios estrictos'),
      items: [
        {
          label: l('完全性阻滞的 QRS 界值', 'QRS cut-off for complete block', 'Umbral de QRS del bloqueo completo'),
          value: l(
            '成人 RBBB 或 LBBB：QRS ≥120 ms（用 ≥，不是 >）；从同步导联中最早的起点量到最晚的终点（全局测量）',
            'Adult RBBB or LBBB: QRS >=120 ms (use >=, not >); measure from the earliest onset to the latest offset across simultaneous leads (global measurement)',
            'BRD o BRI del adulto: QRS >=120 ms (usar >=, no >); medir del inicio más precoz al final más tardío entre las derivaciones simultáneas (medición global)',
          ),
        },
        {
          label: l('右束支阻滞——V1–V2', 'RBBB — V1–V2', 'BRD — V1–V2'),
          value: l(
            'rsr′、rsR′ 或 rSR′（R′ 通常比第一个 R 更宽）；少数呈宽大、常有切迹的 R；V1 若为单纯宽大 R，还需 V1 R 波峰 >50 ms',
            'rsr′, rsR′ or rSR′ (the R′ usually wider than the first R); a minority show a broad, often notched R; if V1 shows a pure dominant R, a V1 R-peak time >50 ms is also required',
            'rsr′, rsR′ o rSR′ (la R′ suele ser más ancha que la primera R); una minoría muestra una R ancha, a menudo con muescas; si V1 muestra una R dominante pura, se exige además un tiempo hasta la cima de la R en V1 >50 ms',
          ),
        },
        {
          label: l('RBBB——I 与 V6', 'RBBB — I and V6', 'BRD — I y V6'),
          value: l(
            'S 波 >40 ms、比 R 波更晚结束（宽而粗钝）；V5–V6 的 R 波峰时间正常',
            'The S wave lasts >40 ms and outlasts the R (broad and slurred); the R-peak time is normal in V5–V6',
            'La onda S dura >40 ms y termina más tarde que la R (ancha y empastada); el tiempo hasta la cima de la R es normal en V5–V6',
          ),
        },
        {
          label: l('RBBB——继发性 ST-T', 'RBBB — secondary ST-T', 'BRD — ST-T secundario'),
          value: l(
            '复极与终末向量方向相反：V1–V2 T 倒置、I 与 V6 T 直立——不要判为缺血',
            'Repolarisation runs opposite the terminal deflection: T inverted in V1–V2, upright in I and V6 — do not call it ischaemia',
            'La repolarización va en sentido opuesto a la deflexión terminal: T invertida en V1–V2, positiva en I y V6; no lo llames isquemia',
          ),
        },
        {
          label: l('左束支阻滞——I、aVL、V5–V6', 'LBBB — I, aVL, V5–V6', 'BRI — I, aVL, V5–V6'),
          value: l(
            '宽大、有切迹或粗钝的 R；I、V5、V6 **无 q 波**（aVL 的窄 q 可为正常）；V5–V6 偶可呈 RS（移行区移位）；V5–V6 R 波峰 >60 ms',
            'A broad R, notched or slurred; **no q wave** in I, V5, V6 (a narrow q in aVL can be normal); V5–V6 may occasionally show RS (displaced transition); R-peak time >60 ms in V5–V6',
            'R ancha, con muescas o empastada; **sin onda q** en I, V5, V6 (una q estrecha en aVL puede ser normal); V5–V6 puede mostrar en ocasiones RS (transición desplazada); tiempo hasta la cima de la R >60 ms en V5–V6',
          ),
        },
        {
          label: l('左束支阻滞——V1–V2', 'LBBB — V1–V2', 'BRI — V1–V2'),
          value: l(
            'QS 或 rS；V1–V3 有小 r 时 R 波峰时间正常',
            'QS or rS; when a small r is present in V1–V3, the R-peak time is normal',
            'QS o rS; cuando hay una r pequeña en V1–V3, el tiempo hasta la cima de la R es normal',
          ),
        },
        {
          label: l('LBBB——ST-T 与电轴', 'LBBB — ST-T and axis', 'BRI — ST-T y eje'),
          value: l(
            'ST-T 多与 QRS 主波反向；正向同向（直立 QRS 导联 T 直立）可为正常；负向 QRS 导联出现 ST 压低/T 倒置为异常。电轴**不是** LBBB 的诊断标准（可右偏、左偏或上偏）',
            'ST-T is usually discordant to the QRS; positive concordance (upright T where the QRS is upright) can be normal; ST depression or T inversion in negative-QRS leads is abnormal. The axis is **not** a diagnostic criterion for LBBB (it may shift right, left or superiorly)',
            'El ST-T suele ser discordante con el QRS; la concordancia positiva (T positiva donde el QRS es positivo) puede ser normal; el descenso del ST o la inversión de la T en derivaciones con QRS negativo son anormales. El eje **no** es criterio diagnóstico del BRI (puede desviarse a la derecha, a la izquierda o arriba)',
          ),
        },
        {
          label: l('不完全性阻滞（110–119 ms）', 'Incomplete block (110–119 ms)', 'Bloqueo incompleto (110–119 ms)'),
          value: l(
            '与完全性形态相同而 QRS 110–119 ms。rSr′ V1 而 QRS <110 ms 为常见正常变异，不应写成 iRBBB。不完全性 LBBB：110–119 ms 加 LVH 图形、V4–V6 R 波峰 >60 ms、I/V5/V6 无 q（旧的 I–II 度分级已废弃）',
            'Same morphology as the complete block with QRS 110–119 ms. An rSr′ in V1 with QRS <110 ms is a common normal variant and must not be labelled incomplete RBBB. Incomplete LBBB: 110–119 ms plus an LVH pattern, R-peak time >60 ms in V4–V6, and no q in I, V5, V6 (the old grades I–II are obsolete)',
            'Misma morfología que el bloqueo completo con QRS de 110–119 ms. Una rSr′ en V1 con QRS <110 ms es una variante normal frecuente y no debe llamarse BRD incompleto. BRI incompleto: 110–119 ms más patrón de HVI, tiempo hasta la cima de la R >60 ms en V4–V6 y sin q en I, V5, V6 (los antiguos grados I–II están en desuso)',
          ),
        },
        {
          label: l('严格 LBBB（Strauss，用于 CRT 筛选）', 'Strict LBBB (Strauss, for CRT selection)', 'BRI estricto (Strauss, para seleccionar CRT)'),
          value: l(
            '男性 QRS ≥140 ms、女性 ≥130 ms；V1、V2 均呈 QS 或 rS；V1、V2、V5、V6、I、aVL 中 ≥2 个导联 QRS 中部有切迹或粗钝。LBBB、QRS ≥150 ms、LVEF ≤35% 且优化药物治疗后仍有症状的心力衰竭患者，CRT 为 I 类指征',
            'QRS >=140 ms in men, >=130 ms in women; QS or rS in both V1 and V2; mid-QRS notching or slurring in >=2 of V1, V2, V5, V6, I, aVL. CRT is Class I with LBBB, QRS >=150 ms and LVEF <=35% in symptomatic heart failure despite optimal medical therapy',
            'QRS >=140 ms en varones, >=130 ms en mujeres; QS o rS en V1 y V2; muesca o empastamiento a mitad del QRS en >=2 de V1, V2, V5, V6, I, aVL. La TRC es indicación de clase I con BRI, QRS >=150 ms y FEVI <=35% en insuficiencia cardíaca sintomática pese al tratamiento médico óptimo',
          ),
        },
      ],
      source: 'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240; Strauss DG, Selvester RH, Wagner GS. Am J Cardiol 2011;107:927-934',
    },
    {
      kind: 'worked',
      title: l('逐条套用：一份 LBBB 的严格判读', 'Criterion by criterion: a strict read of an LBBB', 'Criterio a criterio: lectura estricta de un BRI'),
      ecg: synth('lbbb', 505),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('全局测量 QRS', 'Measure the QRS globally', 'Mide el QRS de forma global'),
          body: l(
            '不要只在 II 里量。取所有同步导联中最早的 QRS 起点与最晚的终点：这里 ≥120 ms——够“完全性”。',
            'Do not measure in lead II alone. Take the earliest QRS onset and the latest offset across all simultaneous leads: here >=120 ms — wide enough for “complete”.',
            'No midas solo en II. Toma el inicio más precoz y el final más tardío del QRS entre todas las derivaciones simultáneas: aquí >=120 ms, suficiente para “completo”.',
          ),
          marks: [{ auto: 'qrs' }],
          view: { layout: '3x4+1', calipers: true },
        },
        {
          title: l('V1–V2：QS 或 rS', 'V1–V2: QS or rS', 'V1–V2: QS o rS'),
          body: l(
            '右胸导联没有 R′、没有 rsR′——晚期力量不朝向右前。V1–V2 呈 QS 或 rS，是左心室最后除极的镜像。',
            'No R′, no rsR′ in the right precordial leads — the late forces do not point rightward and anterior. QS or rS in V1–V2 is the mirror image of a left ventricle depolarising last.',
            'Sin R′ ni rsR′ en las precordiales derechas: las fuerzas tardías no apuntan a la derecha y adelante. El QS o rS de V1–V2 es la imagen en espejo de un ventrículo izquierdo que se despolariza al final.',
          ),
          marks: [{ auto: 's', lead: 'V1' }],
          highlightLeads: ['V1', 'V2'],
        },
        {
          title: l('I、V5–V6：宽 R，没有 q', 'I, V5–V6: broad R, no q', 'I, V5–V6: R ancha, sin q'),
          body: l(
            '侧壁导联的 R 宽大、有切迹或粗钝，且 I、V5、V6 看不到 q——室间隔已改为从右向左除极，正常的间隔 q 消失（aVL 的窄 q 仍可为正常）。',
            'The lateral R is broad, notched or slurred, and no q is seen in I, V5 or V6 — the septum now depolarises right to left, so the normal septal q is gone (a narrow q in aVL can still be normal).',
            'La R lateral es ancha, con muescas o empastada, y no se ve q en I, V5 ni V6: el tabique se despolariza ahora de derecha a izquierda y la q septal normal desaparece (una q estrecha en aVL puede seguir siendo normal).',
          ),
          marks: [{ auto: 'r', lead: 'V6' }],
          highlightLeads: ['I', 'V5', 'V6'],
        },
        {
          title: l('R 波峰时间与继发性 ST-T', 'R-peak time and secondary ST-T', 'Tiempo hasta la cima de la R y ST-T secundario'),
          body: l(
            'V5–V6 从 QRS 起点到 R 顶点 >60 ms。T 与主波反向：V1–V3（负向 QRS）T 直立、V5–V6（直立 QRS）T 倒置——这是预期的反向，不是缺血。只有负向 QRS 导联上出现 ST 压低/T 倒置才算异常。',
            'From QRS onset to the R peak in V5–V6 is >60 ms. The T runs opposite the main deflection: upright in V1–V3 (negative QRS), inverted in V5–V6 (upright QRS) — the expected discordance, not ischaemia. Only ST depression or T inversion in negative-QRS leads counts as abnormal.',
            'Del inicio del QRS a la cima de la R en V5–V6 hay >60 ms. La T va en sentido opuesto a la deflexión principal: positiva en V1–V3 (QRS negativo), invertida en V5–V6 (QRS positivo); es la discordancia esperada, no isquemia. Solo el descenso del ST o la inversión de la T en derivaciones con QRS negativo cuenta como anormal.',
          ),
          marks: [{ auto: 'r', lead: 'V5' }, { auto: 't', lead: 'V6' }, { auto: 't', lead: 'V1' }],
          highlightLeads: ['V1', 'V6'],
        },
        {
          title: l('电轴不是判据；写出结论', 'The axis is not a criterion; write the statement', 'El eje no es criterio; escribe la conclusión'),
          body: l(
            'LBBB 可使电轴右偏、左偏或上偏，甚至随心率变化——所以电轴不属于 LBBB 的诊断标准，只照实描述。结论：窦性心律，完全性左束支传导阻滞，继发性 ST-T 改变。',
            'LBBB may shift the frontal axis rightward, leftward or superiorly, sometimes with rate — so the axis is not part of the LBBB criteria; report it descriptively. Statement: sinus rhythm, complete left bundle branch block, secondary ST-T changes.',
            'El BRI puede desviar el eje frontal hacia la derecha, la izquierda o arriba, a veces según la frecuencia: el eje no forma parte de los criterios del BRI; descríbelo tal cual. Conclusión: ritmo sinusal, bloqueo completo de rama izquierda, cambios ST-T secundarios.',
          ),
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'rbbb',
      seed: 506,
      dials: [{ id: 'qrs' }],
      view: V1_STRIP,
      marks: [{ auto: 'qrs' }],
      caption: l(
        '把 QRS 从 125 ms 拉到 160 ms：R′ 越来越宽，形态始终是 rsR′（M 形）——阻滞的都是同一条束支，只是右心室等得更久。注意这个旋钮最低只到 125 ms：同样形态而 QRS <120 ms 就叫不完全性，rSr′ 而 QRS <110 ms 则只是正常变异。',
        'Slide the QRS from 125 to 160 ms: the R′ grows wider and wider, but the shape stays an rsR′ “M” — the same branch is blocked; the right ventricle simply waits longer. Note that the dial bottoms out at 125 ms: the same shape with QRS <120 ms would be called incomplete, and an rSr′ under 110 ms only a normal variant.',
        'Mueve el QRS de 125 a 160 ms: la R′ se ensancha cada vez más, pero la morfología sigue siendo una rsR′ en “M”; está bloqueada la misma rama y el ventrículo derecho solo espera más. Fíjate en que el control no baja de 125 ms: la misma morfología con QRS <120 ms se llamaría incompleta, y una rSr′ por debajo de 110 ms solo una variante normal.',
      ),
    },
    {
      kind: 'contrast',
      title: l('哪一侧最晚？让终末向量说话', 'Which side is late? Let the terminal forces speak', '¿Qué lado es el último? Que hablen las fuerzas terminales'),
      view: V1_STRIP,
      left: {
        ecg: synth('rbbb', 507),
        caption: l('A：右束支阻滞——V1 rsR′（M 形）', 'A: RBBB — rsR′ (M shape) in V1', 'A: BRD — rsR′ (en M) en V1'),
        marks: [{ auto: 'qrs' }],
      },
      right: {
        ecg: synth('lbbb', 508),
        caption: l('B：左束支阻滞——V1 rS', 'B: LBBB — rS in V1', 'B: BRI — rS en V1'),
        marks: [{ auto: 'qrs' }],
      },
      point: l(
        '同样在 V1：A 的终末向量朝向电极——第二个 R（R′）；B 的终末向量背离电极——深 S。问一句“哪一侧最晚除极？”：A 右心室晚（RBBB），B 左心室晚（LBBB）。再到 V6 验证：A 有宽 S，B 只有宽 R、没有 q。',
        'Same lead V1: in A the terminal forces point at the electrode — a second R (R′); in B they point away from it — a deep S. Ask “which side depolarises last?”: in A the right ventricle (RBBB), in B the left ventricle (LBBB). Confirm in V6: A has a broad S; B has only a broad R with no q.',
        'En la misma derivación V1: en A las fuerzas terminales apuntan al electrodo — una segunda R (R′); en B se alejan de él — una S profunda. Pregunta “¿qué ventrículo se despolariza el último?”: en A el derecho (BRD), en B el izquierdo (BRI). Confírmalo en V6: A tiene una S ancha; B solo una R ancha, sin q.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('rate-dependent-bbb', 509),
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'qrs' }],
      caption: l(
        '频率依赖性（加速依赖性）LBBB：呼吸性窦性心律不齐里，当周期缩短到左束支不应期以下（吸气加快时），紧随其后的搏动就以 LBBB 形态下传；周期变长时又恢复正常。关键鉴别点：**宽的搏动前仍有窦性 P、PR 不变**——这是差异性传导，不是室性早搏（对照 r5 的“提前”逻辑）。',
        'Rate-dependent (acceleration-dependent) LBBB: within respiratory sinus arrhythmia, whenever the cycle shortens below the left bundle’s refractory period (the inspiratory acceleration), the beats that follow conduct with an LBBB pattern; longer cycles conduct normally. The key point: **the wide beats still follow a sinus P at an unchanged PR** — this is aberrancy, not PVCs (contrast the “premature” logic of r5).',
        'BRI dependiente de la frecuencia (dependiente de la aceleración): dentro de una arritmia sinusal respiratoria, cada vez que el ciclo se acorta por debajo del periodo refractario de la rama izquierda (con la aceleración inspiratoria), los latidos siguientes conducen con patrón de BRI; los ciclos largos conducen con normalidad. La clave: **los latidos anchos van precedidos de una P sinusal con el mismo PR**; es aberrancia, no extrasístoles ventriculares (contrasta con la lógica “prematura” de r5).',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('irbbb', 510),
      view: V1_STRIP,
      marks: [{ auto: 'qrs' }],
      caption: l(
        '不完全性右束支传导阻滞：与完全性完全相同的 rsR′ 形态，量一量——QRS 落在 110–119 ms 带（全局测量）。同样的 rSr′ 而 QRS <110 ms 只是常见的正常变异，不要写成 iRBBB。不完全性 LBBB 同理需要 110–119 ms，加上 LVH 图形、V4–V6 R 波峰 >60 ms 和 I/V5/V6 无 q。',
        'Incomplete right bundle branch block: exactly the same rsR′ shape as the complete block — measure it, and the QRS falls in the 110–119 ms band (globally). The same rSr′ with QRS <110 ms is only a common normal variant; do not report it as iRBBB. Incomplete LBBB likewise needs 110–119 ms, plus an LVH pattern, R-peak time >60 ms in V4–V6 and no q in I, V5, V6.',
        'Bloqueo incompleto de rama derecha: exactamente la misma morfología rsR′ que el bloqueo completo; mídelo y verás que el QRS cae en la franja de 110–119 ms (medición global). La misma rSr′ con QRS <110 ms es solo una variante normal frecuente; no la informes como BRD incompleto. El BRI incompleto exige igualmente 110–119 ms, más patrón de HVI, tiempo hasta la cima de la R >60 ms en V4–V6 y sin q en I, V5, V6.',
      ),
    },
    {
      kind: 'text',
      title: l('束支传导阻滞遇上胸痛：走哪条路径', 'Bundle branch block meets chest pain: which pathway', 'El bloqueo de rama se encuentra con el dolor torácico: qué vía elegir'),
      body: l(
        '束支传导阻滞本身不诊断心肌梗死，但伴胸痛时不许忽视：\n- 进行中、拟诊心肌缺血的症状 + 束支传导阻滞（LBBB 或 RBBB，新发或已知）→ 按 **STEMI 等同**处理，启动直接 PCI 路径（2023 ESC ACS）。\n- LBBB 会**掩盖 Q 波**、破坏电压标准，ST 段判读要靠 Sgarbossa 标准（在 i10 专门讲）。\n- RBBB 不掩盖病理性 Q 波——初始除极未受影响；急性心肌梗死中新发 RBBB 提示大面积（常为左前降支近段）受累。',
        'Bundle branch block alone does not diagnose myocardial infarction, but with chest pain it must not be ignored:\n- Ongoing symptoms suggestive of myocardial ischaemia + bundle branch block (LBBB or RBBB, new or previously known) → manage as a **STEMI equivalent** and activate the primary-PCI pathway (2023 ESC ACS).\n- LBBB **hides Q waves** and defeats voltage criteria; ST-segment reading needs the Sgarbossa criteria (taught in i10).\n- RBBB does not hide pathological Q waves — initial activation is untouched; new RBBB in acute MI signals extensive (often proximal LAD) involvement.',
        'El bloqueo de rama por sí solo no diagnostica infarto de miocardio, pero con dolor torácico no se puede ignorar:\n- Síntomas en curso sugestivos de isquemia miocárdica + bloqueo de rama (BRI o BRD, nuevo o conocido) → tratarlo como **equivalente a STEMI** y activar la vía de ICP primaria (ESC ACS 2023).\n- El BRI **oculta las ondas Q** e invalida los criterios de voltaje; la lectura del segmento ST exige los criterios de Sgarbossa (se tratan en i10).\n- El BRD no oculta las ondas Q patológicas: la activación inicial queda intacta; un BRD nuevo en el infarto agudo señala afectación extensa (a menudo de la DA proximal).',
      ),
    },
    { kind: 'check', item: { family: 'bundle-branch', seed: 15 } },
    { kind: 'check', item: { family: 'bundle-branch', seed: 11 } },
    { kind: 'check', item: { family: 'measure-qrs', seed: 7 } },
    { kind: 'drill', families: ['bundle-branch', 'measure-qrs'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [6282, 11103, 16100],
      caption: l(
        '三份真实心电图：两份 RBBB、一份 LBBB。先量 QRS（全局），看 V1 与 V6，写下“哪条束支、完全性还是不完全性”，然后揭晓。',
        'Three real ECGs: two RBBBs and one LBBB. Measure the QRS (globally), look at V1 and V6, commit to “which branch, complete or incomplete” — then reveal.',
        'Tres ECG reales: dos BRD y un BRI. Mide el QRS (de forma global), mira V1 y V6, decide “qué rama, completo o incompleto” y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'rSr′ V1 而 QRS <110 ms 被写成“不完全性右束支传导阻滞”：那是正常变异。',
          'Calling an rSr′ in V1 with QRS <110 ms “incomplete RBBB”: it is a normal variant.',
          'Llamar “BRD incompleto” a una rSr′ en V1 con QRS <110 ms: es una variante normal.',
        ),
        l(
          '把电轴当成 LBBB 的诊断标准：它不是——LBBB 可使电轴右偏、左偏或上偏。',
          'Treating the axis as an LBBB criterion: it is not — LBBB may shift the axis right, left or superiorly.',
          'Tratar el eje como criterio diagnóstico del BRI: no lo es; el BRI puede desviar el eje a la derecha, a la izquierda o arriba.',
        ),
        l(
          '把 LBBB 正常的反向 ST-T 误判为缺血；异常的只有负向 QRS 导联上的 ST 压低/T 倒置。',
          'Over-calling the normal discordant ST-T of LBBB as ischaemia; the abnormal finding is ST depression or T inversion in negative-QRS leads only.',
          'Llamar isquemia al ST-T discordante normal del BRI; lo anormal es solo el descenso del ST o la inversión de la T en derivaciones con QRS negativo.',
        ),
        l(
          '只在一个导联里量 QRS：应全局测量——最早的起点到最晚的终点。',
          'Measuring the QRS in a single lead: measure globally, from the earliest onset to the latest offset.',
          'Medir el QRS en una sola derivación: hay que medir de forma global, del inicio más precoz al final más tardío.',
        ),
        l(
          '把束支阻滞伴持续缺血性胸痛当作“陈旧改变”放过：无论新发还是已知，2023 ESC 都按 STEMI 处理，启动直接 PCI 路径（反过来，单凭“新发 LBBB”而无持续缺血症状，不再自动启动）。',
          'Dismissing bundle branch block with ongoing ischaemic chest pain as "old": new or known, the 2023 ESC guideline manages it like STEMI — activate the primary-PCI pathway (conversely, "new LBBB" without ongoing ischaemic symptoms is no longer an automatic activation).',
          'Descartar como «antiguo» un bloqueo de rama con dolor torácico isquémico persistente: sea nuevo o conocido, la guía ESC 2023 lo maneja como un STEMI; activa la vía de ICP primaria (a la inversa, un «BRI nuevo» sin síntomas isquémicos persistentes ya no activa la vía de forma automática).',
        ),
        l(
          '频率依赖性束支传导阻滞的宽 QRS 被当作室性早搏：每个宽搏动前都有窦性 P、PR 不变。',
          'Calling the wide beats of rate-dependent BBB PVCs: every wide beat follows a sinus P at an unchanged PR.',
          'Llamar extrasístoles ventriculares a los QRS anchos del bloqueo dependiente de la frecuencia: cada latido ancho sigue a una P sinusal con el mismo PR.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '完全性束支传导阻滞 = QRS ≥120 ms（全局测量）加束支形态；110–119 ms 为不完全性，rSr′ V1 而 QRS <110 ms 是正常变异。',
          'Complete bundle branch block = QRS >=120 ms (measured globally) plus the branch morphology; 110–119 ms is incomplete, and an rSr′ in V1 with QRS <110 ms a normal variant.',
          'El bloqueo de rama completo = QRS >=120 ms (medido de forma global) más la morfología de la rama; 110–119 ms es incompleto, y una rSr′ en V1 con QRS <110 ms una variante normal.',
        ),
        l(
          '问“哪一侧最晚除极”：V1 的 R′ 加 I/V6 的宽 S = RBBB；V1 的 QS/rS 加 I/V5–V6 无 q 的宽大切迹 R = LBBB。',
          'Ask “which side depolarises last”: R′ in V1 plus a broad S in I/V6 = RBBB; QS/rS in V1 plus a broad notched R with no q in I/V5–V6 = LBBB.',
          'Pregunta “qué lado se despolariza el último”: R′ en V1 más S ancha en I/V6 = BRD; QS/rS en V1 más R ancha con muescas y sin q en I/V5–V6 = BRI.',
        ),
        l(
          'R 波峰时间：RBBB V1 >50 ms；LBBB V5–V6 >60 ms（V1–V3 正常）。电轴不是 LBBB 的标准。',
          'R-peak time: >50 ms in V1 for RBBB; >60 ms in V5–V6 for LBBB (normal in V1–V3). The axis is not an LBBB criterion.',
          'Tiempo hasta la cima de la R: >50 ms en V1 en el BRD; >60 ms en V5–V6 en el BRI (normal en V1–V3). El eje no es criterio de BRI.',
        ),
        l(
          'LBBB 的 ST-T 通常与 QRS 反向：正向同向可为正常；负向 QRS 导联的 ST 压低/T 倒置才是异常。',
          'The ST-T of LBBB is usually discordant to the QRS: positive concordance can be normal; ST depression or T inversion in negative-QRS leads is the abnormal finding.',
          'El ST-T del BRI suele ser discordante con el QRS: la concordancia positiva puede ser normal; el descenso del ST o la inversión de la T en derivaciones con QRS negativo es lo anormal.',
        ),
        l(
          '新发或已知的束支传导阻滞 + 拟诊缺血的胸痛 = STEMI 等同，启动直接 PCI；LBBB 掩盖 Q 波并破坏电压标准。',
          'New or previously known bundle branch block + chest pain suggestive of ischaemia = a STEMI equivalent: activate primary PCI; LBBB hides Q waves and defeats voltage criteria.',
          'Bloqueo de rama nuevo o conocido + dolor torácico sugestivo de isquemia = equivalente a STEMI: activa la ICP primaria; el BRI oculta las ondas Q e invalida los criterios de voltaje.',
        ),
      ],
    },
  ],
  sources: [
    'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Strauss DG, Selvester RH, Wagner GS. Am J Cardiol 2011;107:927-934',
    'Castellano et al. 2004',
  ],
};

export default lesson;
