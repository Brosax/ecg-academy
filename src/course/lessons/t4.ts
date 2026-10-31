/**
 * t4 — Pre-excitation: WPW pattern vs syndrome, pre-excited AF (docs/PLAN.md §3, stage T).
 * Criteria: docs/curriculum/criteria.md `wpw-criteria`, `lgl`, `post-svt-triage`, `preexcited-af`, `rodriguez-rule`
 * (current values) and the missing-book bullets: WPW pattern vs syndrome, the pseudo-infarct/pseudo-LVH
 * interpretation rule, intermittent pre-excitation and the exercise test, asymptomatic pre-excitation risk
 * stratification, pre-excitation in athletes, pre-excited AF recognition-to-action safety rule.
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

const lesson: Lesson = {
  id: 't4',
  stage: 'T',
  order: 4,
  title: l(
    '心室预激：WPW 图形与 WPW 综合征、预激伴心房颤动',
    'Pre-excitation: WPW pattern vs syndrome, pre-excited AF',
    'Preexcitación: patrón frente a síndrome de WPW, fibrilación auricular preexcitada',
  ),
  summary: l(
    '心室预激 = 心房激动经旁路提前激动心室：窦性心律 PR <120 ms、δ波、QRS >120 ms、继发性 ST-T。要把 WPW 图形与 WPW 综合征分开，不在预激搏动上诊断 MI、LVH 或束支阻滞，并记住预激伴房颤禁用一切房室结阻滞剂。',
    'Pre-excitation = atrial impulses reach the ventricle early over an accessory pathway: PR <120 ms in sinus rhythm, delta wave, QRS >120 ms, secondary ST-T. Separate the WPW pattern from the WPW syndrome, never diagnose MI, LVH or bundle branch block on pre-excited beats, and remember that every AV-nodal blocker is contraindicated in pre-excited AF.',
    'La preexcitación = los impulsos auriculares alcanzan el ventrículo antes por una vía accesoria: PR <120 ms en ritmo sinusal, onda delta, QRS >120 ms, ST-T secundario. Separa el patrón de WPW del síndrome de WPW, no diagnostiques IAM, HVI ni bloqueo de rama en latidos preexcitados y recuerda que en la FA preexcitada están contraindicados todos los bloqueadores del nodo AV.',
  ),
  objectives: [
    l(
      '说出 WPW 图形的成人标准（窦性心律 PR <120 ms、δ波、QRS >120 ms、与 δ/QRS 方向相反的继发性 ST-T），并区分图形与综合征。',
      'State the adult criteria of the WPW pattern (PR <120 ms in sinus rhythm, delta wave, QRS >120 ms, secondary ST-T opposite to the delta/QRS) and separate pattern from syndrome.',
      'Enunciar los criterios del patrón de WPW en adultos (PR <120 ms en ritmo sinusal, onda delta, QRS >120 ms, ST-T secundario opuesto a la delta/QRS) y distinguir patrón de síndrome.',
    ),
    l(
      '把短 PR 无 δ波（房室结传导增强）与预激分开，并弃用“LGL 综合征”一词。',
      'Separate a short PR without delta (enhanced AV-nodal conduction) from pre-excitation, and drop the label "LGL syndrome".',
      'Separar el PR corto sin delta (conducción AV nodal acelerada) de la preexcitación y abandonar el término «síndrome de LGL».',
    ),
    l(
      '识别预激伴心房颤动（快、宽、不规则、逐搏变化），说出禁用药物与正确处理路径。',
      'Recognise pre-excited AF (fast, broad, irregular, changing beat to beat) and state the contraindicated drugs and the correct management path.',
      'Reconocer la FA preexcitada (rápida, ancha, irregular, cambiante de latido en latido) y citar los fármacos contraindicados y la actuación correcta.',
    ),
    l(
      '在预激搏动上避免假性心梗、假性 LVH、假性束支阻滞的误诊，并对无症状预激——尤其竞技运动员——说出危险分层路径。',
      'Avoid the pseudo-infarct, pseudo-LVH and pseudo-bundle-branch-block misreads on pre-excited beats, and state the risk-stratification path for asymptomatic pre-excitation, especially in competitive athletes.',
      'Evitar en latidos preexcitados las lecturas erróneas de pseudoinfarto, pseudo-HVI y pseudobloqueo de rama, y conocer la estratificación de riesgo de la preexcitación asintomática, sobre todo en deportistas de competición.',
    ),
  ],
  minutes: 16,
  competencies: ['C6', 'C9'],
  findings: ['wpw', 'short-pr', 'atrial-fibrillation'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('wpw', 661),
      view: { layout: '3x4+1' },
      question: l(
        '21 岁竞技运动员，赛前筛查 12 导联心电图，报告写“PR 短、QRS 增宽、起始部顿挫”。这是什么？你又**不能**就此下哪些结论？先想好你的判读。',
        'A 21-year-old competitive athlete, pre-participation screening 12-lead ECG, reported as "short PR, wide QRS with a slurred onset". What is it — and which conclusions must you **not** draw from it? Commit to your reading first.',
        'Deportista de competición de 21 años, ECG de 12 derivaciones del cribado previo, informado como «PR corto, QRS ancho con inicio empastado». ¿Qué es y qué conclusiones **no** debes sacar de él? Decide tu lectura antes de continuar.',
      ),
      reveal: l(
        '**WPW 图形**：窦性 P 波正常，PR <120 ms，δ波把 QRS 起始部拖宽到 >120 ms，伴方向相反的继发性 ST-T——人群患病率约 0.15–0.25%。但有两个结论不能下：没有心动过速史，这只是**图形**，不是**综合征**；而且预激使 QRS 增宽、V1 出现高 R 波、ST-T 继发改变——**不能在这份图上诊断 LVH、束支阻滞或心梗**。本课教你认图形、辨危险，并记住一条用药红线。',
        '**WPW pattern**: a normal sinus P, PR <120 ms, a delta wave dragging the QRS onset out to >120 ms, with secondary ST-T changes pointing the opposite way — it is present in about 0.15-0.25% of the population. But two conclusions are off limits: without a tachyarrhythmia this is only a **pattern**, not a **syndrome**; and because pre-excitation widens the QRS, gives a tall R in V1 and changes the ST-T, you must **not diagnose LVH, bundle branch block or MI** on this tracing. This lesson teaches the pattern, the risk and one red line in treatment.',
        '**Patrón de WPW**: P sinusal normal, PR <120 ms, onda delta que empasta el inicio del QRS hasta >120 ms y cambios ST-T secundarios de dirección opuesta; lo presenta en torno al 0,15-0,25% de la población. Pero hay dos conclusiones prohibidas: sin taquiarritmia esto es solo un **patrón**, no un **síndrome**; y como la preexcitación ensancha el QRS, da una R alta en V1 y altera secundariamente el ST-T, **no debes diagnosticar HVI, bloqueo de rama o IAM** en esta imagen. Esta lección enseña el patrón, el riesgo y una línea roja del tratamiento.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('wpw', 662),
      showConduction: true,
      emphasize: ['la', 'av-node', 'lv-basal-anterolateral'],
      caption: l(
        '播放一个心动周期。房室旁路（Kent 束）从左房直接连到左室基底外侧，绕开房室结的生理性延迟：这部分心室**提前**除极，形成 δ波；随后经房室结下传的激动也抵达心室——QRS 是两条径路的**融合波**。旁路长在哪里，δ波的向量就指向哪里。',
        'Play one beat. The accessory pathway (bundle of Kent) runs from the left atrium straight to the basolateral left ventricle, bypassing the physiological delay of the AV node: that part of the ventricle depolarises **early**, making the delta wave; then the impulse that came through the AV node arrives too — the QRS is a **fusion** of the two fronts. Where the pathway sits decides where the delta vector points.',
        'Reproduce un latido. La vía accesoria (haz de Kent) va de la aurícula izquierda directamente al ventrículo izquierdo basolateral, saltándose el retraso fisiológico del nodo AV: esa parte del ventrículo se despolariza **antes**, creando la onda delta; después llega también el impulso que bajó por el nodo AV: el QRS es una **fusión** de los dos frentes. La situación de la vía decide hacia dónde apunta el vector de la delta.',
      ),
    },
    {
      kind: 'text',
      title: l('图形还是综合征？', 'Pattern or syndrome?', '¿Patrón o síndrome?'),
      body: l(
        '**WPW 图形** = 仅有心电图表现（短 PR、δ波、宽 QRS），无症状、无心动过速；人群患病率约 0.15–0.25%。\n**WPW 综合征** = 图形 + 有症状的心动过速（AVRT 或预激伴房颤）。\n**隐匿性旁路**只能逆传：静息心电图完全正常，也不与猝死相关——但能构成 AVRT 的逆传支。\nSVT 终止后再看窦性心电图（判读规则）：\n- 窦性心律见到预激 ⇒ 显性旁路，AVRT 可能（WPW 综合征）；\n- 心电图正常**不能**排除隐匿性旁路——基线正常时最常见机制依次为 AVNRT、隐匿性旁路 AVRT、局灶性房速；机制靠心动过速心电图判断（RP 间期、V1 假性 r′ 等，见 t1）；\n- 孤立短 PR 无 δ波对判断机制没有价值。',
        '**WPW pattern** = the ECG findings alone (short PR, delta, wide QRS) with no symptoms and no tachycardia; present in about 0.15-0.25% of the population.\n**WPW syndrome** = the pattern plus symptomatic tachycardia (AVRT or pre-excited AF).\nA **concealed pathway** conducts only retrogradely: the resting ECG is completely normal, and it is not linked to sudden death — but it can still be the retrograde limb of AVRT.\nReading the sinus ECG after an SVT has ended (triage rule):\n- pre-excitation in sinus rhythm => a manifest pathway, so AVRT is likely (WPW syndrome);\n- a normal ECG does **not** exclude a concealed pathway — with a normal baseline the commonest mechanisms are, in order, AVNRT, AVRT over a concealed pathway and focal AT; the mechanism is read from the tachycardia ECG itself (RP interval, pseudo-r\' in V1 and so on, t1);\n- an isolated short PR without delta has no value for deciding the mechanism.',
        '**Patrón de WPW** = solo los hallazgos electrocardiográficos (PR corto, delta, QRS ancho), sin síntomas ni taquicardia; lo presenta en torno al 0,15-0,25% de la población.\n**Síndrome de WPW** = el patrón más taquicardia sintomática (TRAV o FA preexcitada).\nUna **vía oculta** solo conduce de forma retrógrada: el ECG en reposo es completamente normal y no se relaciona con muerte súbita, pero puede ser la rama retrógrada de una TRAV.\nLectura del ECG sinusal tras una TSV (regla de clasificación):\n- preexcitación en ritmo sinusal => vía manifiesta, así que la TRAV es probable (síndrome de WPW);\n- un ECG normal **no** excluye una vía oculta; con una línea de base normal los mecanismos más frecuentes son, por orden, TRIN, TRAV por vía oculta y taquicardia auricular focal; el mecanismo se lee en el ECG de la propia taquicardia (intervalo RP, pseudo-r\' en V1, etc., t1);\n- un PR corto aislado sin delta no sirve para decidir el mecanismo.',
      ),
    },
    {
      kind: 'criteria',
      title: l('预激：判读数值', 'Pre-excitation: reading values', 'Preexcitación: valores de lectura'),
      items: [
        {
          label: l('WPW 图形（成人）', 'WPW pattern (adults)', 'Patrón de WPW (adultos)'),
          value: l(
            '窦性心律 PR <120 ms（儿童 <90 ms）；δ波（QRS 起始部顿挫）；QRS >120 ms（儿童 >90 ms，轻微预激可仅 100–120 ms）；继发性 ST-T 与 δ/QRS 主方向相反；P 波为正常窦性',
            'PR <120 ms in sinus rhythm (<90 ms in children); delta wave (slurred QRS onset); QRS >120 ms (>90 ms in children; minimal pre-excitation may give 100-120 ms); secondary ST-T opposite to the delta/QRS; the P is a normal sinus P',
            'PR <120 ms en ritmo sinusal (<90 ms en niños); onda delta (inicio del QRS empastado); QRS >120 ms (>90 ms en niños; la preexcitación mínima puede dar 100-120 ms); ST-T secundario opuesto a la delta/QRS; la P es sinusal normal',
          ),
        },
        {
          label: l('QT 与复极', 'QT and repolarisation', 'QT y repolarización'),
          value: l(
            'QT 不是诊断标准：QT 只因 QRS 增宽而显得长——复极用 JT 间期判断',
            'QT is NOT a criterion: the QT only looks long because the QRS is wider — judge repolarisation by the JT interval',
            'El QT NO es un criterio: solo parece largo porque el QRS es más ancho; valora la repolarización por el intervalo JT',
          ),
        },
        {
          label: l('短 PR 无 δ波', 'Short PR without delta', 'PR corto sin delta'),
          value: l(
            'PR <120 ms、P 电轴正常、QRS 窄、无 δ波 = 房室结传导增强：无症状者常为正常变异；不再称“LGL 综合征”（界值取 120 ms，不用 0.11 s）',
            'PR <120 ms with a normal P axis, narrow QRS and no delta = enhanced AV-nodal conduction: usually a normal variant in asymptomatic people; no longer called "LGL syndrome" (cut-off 120 ms, not 0.11 s)',
            'PR <120 ms con eje de la P normal, QRS estrecho y sin delta = conducción AV nodal acelerada: suele ser una variante normal en personas asintomáticas; ya no se llama «síndrome de LGL» (corte 120 ms, no 0,11 s)',
          ),
        },
        {
          label: l('δ波 + 正常 PR', 'Delta with a normal PR', 'Delta con PR normal'),
          value: l(
            'PR ≥120 ms 而 δ波可见：多见于左游离壁旁路（房内到达旁路的路径长）或缓慢传导的旁路',
            'A visible delta with a PR >=120 ms: seen mainly with left free-wall pathways (long intra-atrial travel to the pathway) or slowly conducting pathways',
            'Delta visible con PR >=120 ms: sobre todo con vías de pared libre izquierda (largo recorrido intraauricular hasta la vía) o vías de conducción lenta',
          ),
        },
        {
          label: l('预激伴房颤', 'Pre-excited AF', 'FA preexcitada'),
          value: l(
            '快、宽、不规则；QRS 宽度与形态逐搏变化（融合程度不同）；最短 RR 可 <250 ms，室率可 >250–300 次/分',
            'Fast, broad, irregular; QRS width and morphology change beat to beat (varying fusion); the shortest RR can be <250 ms with ventricular rates >250-300/min',
            'Rápida, ancha, irregular; la anchura y la morfología del QRS cambian de latido en latido (fusión variable); el RR más corto puede ser <250 ms con frecuencias ventriculares >250-300 lpm',
          ),
        },
        {
          label: l('高危特征', 'High-risk features', 'Características de alto riesgo'),
          value: l(
            '房颤中最短预激 RR（SPERRI）≤250 ms，或旁路有效不应期 ≤250 ms；多条旁路、可诱发 AVRT 同样高危',
            'Shortest pre-excited RR during AF (SPERRI) <=250 ms, or accessory-pathway ERP <=250 ms; multiple pathways and inducible AVRT are also high risk',
            'RR preexcitado más corto en FA (SPERRI) <=250 ms, o ERP de la vía <=250 ms; las vías múltiples y la TRAV inducible también son de alto riesgo',
          ),
        },
      ],
      source:
        'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240; Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    },
    {
      kind: 'worked',
      title: l('测 PR、找 δ波、说出诊断', 'Measure the PR, find the delta, name it', 'Mide el PR, encuentra la delta, ponle nombre'),
      ecg: synth('wpw', 663),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('PR 有多短？', 'How short is the PR?', '¿Cómo de corto es el PR?'),
          body: l(
            'II 导联：P 波形态正常、直立，QRS 起始紧随其后——PR ≈ 116 ms（<120 ms），几乎没有 PR 段。',
            'Lead II: a normal upright P wave, and the QRS onset comes right behind it — PR about 116 ms (<120 ms), with almost no PR segment.',
            'Derivación II: P positiva y normal, y el QRS empieza justo detrás: PR de unos 116 ms (<120 ms), casi sin segmento PR.',
          ),
          marks: [{ auto: 'pr' }],
          highlightLeads: ['II'],
        },
        {
          title: l('δ波在哪里？', 'Where is the delta wave?', '¿Dónde está la onda delta?'),
          body: l(
            'QRS 起始部爬行样的顿挫——那就是心室经旁路提前除极的部分。多看几个导联：δ波的方向和大小随导联变化。',
            'The slurred, crawling onset of the QRS — that is ventricle depolarising early over the pathway. Check several leads: the delta changes direction and size from lead to lead.',
            'El inicio empastado, reptante, del QRS: eso es el ventrículo despolarizándose antes por la vía. Mira varias derivaciones: la delta cambia de dirección y de tamaño de una a otra.',
          ),
          marks: [{ auto: 'delta' }],
          highlightLeads: ['II', 'V1'],
        },
        {
          title: l('QRS 多宽？ST-T 怎样？', 'How wide is the QRS? What about the ST-T?', '¿Cómo de ancho es el QRS? ¿Y el ST-T?'),
          body: l(
            'QRS >120 ms。ST-T 与预激向量方向相反（继发性改变）——不是缺血。QT 看起来长，只因 QRS 宽：复极请用 JT 判断。',
            'The QRS is >120 ms. The ST-T points opposite to the pre-excited forces (a secondary change) — not ischaemia. The QT looks long only because the QRS is wide: judge repolarisation by the JT.',
            'El QRS es >120 ms. El ST-T se opone a las fuerzas de preexcitación (un cambio secundario), no es isquemia. El QT parece largo solo porque el QRS es ancho: valora la repolarización por el JT.',
          ),
          marks: [{ auto: 'qrs' }, { auto: 't' }],
        },
        {
          title: l('说出诊断，再粗定位', 'Name it, then localise roughly', 'Ponle nombre y localiza a grandes rasgos'),
          body: l(
            '**WPW 图形**。快速定位：本图 V1 以 R 为主（R≥S）⇒ 左侧旁路；δ波在 I、aVL 负向，V5 近等电位、V6 负向 ⇒ 左侧游离壁（左侧壁）。快速规则只是提示，精确分区靠电生理。报告只写图形本身——MI、LVH、束支阻滞一概不下。',
            '**WPW pattern**. Quick localisation: here V1 is predominantly positive (R>=S) => a left-sided pathway; the delta is negative in I and aVL, nearly isoelectric in V5 and negative in V6 => a left free-wall (lateral) pathway. Quick rules are only a hint — precise mapping needs an EP study. Report the pattern itself: no MI, no LVH, no bundle branch block.',
            '**Patrón de WPW**. Localización rápida: aquí V1 es predominantemente positiva (R>=S) => vía izquierda; la delta es negativa en I y aVL, casi isoeléctrica en V5 y negativa en V6 => pared libre izquierda (lateral). Las reglas rápidas son solo una pista; el mapeo preciso exige estudio electrofisiológico. Informa el patrón en sí: ni IAM, ni HVI, ni bloqueo de rama.',
          ),
          marks: [{ auto: 'delta', lead: 'V1' }, { auto: 'delta', lead: 'aVL' }],
          highlightLeads: ['V1', 'I', 'aVL', 'V5', 'V6'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('δ波在，还是不在？', 'Is the delta there or not?', '¿Está la delta o no está?'),
      view: STRIP,
      left: {
        ecg: synth('wpw', 664),
        caption: l('WPW 图形：短 PR + δ波 + 宽 QRS', 'WPW pattern: short PR + delta + wide QRS', 'Patrón de WPW: PR corto + delta + QRS ancho'),
        marks: [{ auto: 'delta' }],
      },
      right: {
        ecg: synth('short-pr', 665),
        caption: l('短 PR：窄 QRS、无 δ波', 'Short PR: narrow QRS, no delta', 'PR corto: QRS estrecho, sin delta'),
        marks: [{ auto: 'pr' }],
      },
      point: l(
        '两者的 PR 都短，区别全在 QRS 起始部：左侧有 δ波（旁路提前除极心室），右侧 QRS 窄而利落——这是**房室结传导增强**，不是预激，也不叫 LGL。无症状者的短 PR 通常是正常变异；若发生 SVT，按机制分类（AVNRT、隐匿性旁路 AVRT、房速）。',
        'Both have a short PR; the whole difference sits at the QRS onset. Left: a delta wave (the pathway depolarises the ventricle early). Right: a narrow, crisp QRS — **enhanced AV-nodal conduction**, not pre-excitation, and not "LGL". In an asymptomatic person a short PR is usually a normal variant; if SVT occurs, classify it by mechanism (AVNRT, AVRT over a concealed pathway, focal AT).',
        'Ambos tienen el PR corto; toda la diferencia está en el inicio del QRS. Izquierda: onda delta (la vía despolariza el ventrículo antes). Derecha: QRS estrecho y nítido: **conducción AV nodal acelerada**, no preexcitación, ni «LGL». En una persona asintomática el PR corto suele ser una variante normal; si aparece una TSV, se clasifica por mecanismo (TRIN, TRAV por vía oculta, taquicardia auricular focal).',
      ),
    },
    {
      kind: 'text',
      title: l('预激是最好的模仿者', 'Pre-excitation is the best mimic', 'La preexcitación es la gran imitadora'),
      body: l(
        '负向 δ波会写出 Q/QS 波，酷似梗死：下（后）间隔旁路在 II、III、aVF 造出“下壁心梗”；左侧旁路在 V1 造出高 R 波，像后壁心梗或右束支阻滞；继发性 ST-T 改变又像缺血。δ波 + 正常 PR（≥120 ms）则多见于左游离壁或缓慢传导的旁路。\n**判读规则**：在（近乎）完全预激的搏动上**不要**诊断心梗、LVH、束支或分支阻滞，也**不要**判读电轴——先确认有无预激，再读其他一切。',
        'A negative delta writes Q/QS complexes that mimic infarction: an inferoparaseptal pathway fakes an "inferior MI" in II, III and aVF; a left-sided pathway gives a tall R in V1, mimicking posterior MI or RBBB; and the secondary ST-T changes mimic ischaemia. A delta with a normal PR (>=120 ms) points instead to a left free-wall or slowly conducting pathway.\n**The rule**: on (nearly) fully pre-excited beats do **not** diagnose MI, LVH, bundle branch or fascicular block, and do **not** interpret the axis — settle whether there is pre-excitation before reading anything else.',
        'Una delta negativa escribe complejos Q/QS que imitan el infarto: una vía inferoparaseptal finge un «IAM inferior» en II, III y aVF; una vía izquierda da una R alta en V1, como un IAM posterior o un bloqueo de rama derecha; y los cambios ST-T secundarios imitan la isquemia. Una delta con PR normal (>=120 ms) apunta más bien a una vía de pared libre izquierda o de conducción lenta.\n**La regla**: en latidos con preexcitación (casi) máxima **no** diagnostiques IAM, HVI, bloqueo de rama o de fascículo, **ni** interpretes el eje: decide primero si hay preexcitación antes de leer cualquier otra cosa.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('avrt', 666, undefined, 'antidromic'),
      view: STRIP,
      marks: [{ auto: 'qrs' }],
      caption: l(
        '这是让“图形”变成“综合征”的心律之一：**逆向型 AVRT**——环路经旁路前传、房室结逆传，QRS 完全预激，又宽又规则。更常见的是顺向型 AVRT（窄 QRS，t1 学过）。旁路在窦性心律画出图形，在心动过速里充当环路——这正是“图形 + 心动过速 = WPW 综合征”的含义。宽 QRS 鉴别见 t5。',
        'This is one of the rhythms that turn the "pattern" into a "syndrome": **antidromic AVRT** — the circuit travels antegrade over the pathway and retrograde through the AV node, so the QRS is fully pre-excited, wide and regular. The commonest is orthodromic AVRT (narrow QRS, t1). The pathway draws the pattern in sinus rhythm and forms the circuit in tachycardia — that is exactly what "pattern + tachyarrhythmia = WPW syndrome" means. The wide-QRS differential is t5.',
        'Este es uno de los ritmos que convierten el «patrón» en «síndrome»: la **TRAV antidrómica**; el circuito baja por la vía y sube por el nodo AV, de modo que el QRS está totalmente preexcitado, ancho y regular. La más frecuente es la TRAV ortodrómica (QRS estrecho, t1). La vía dibuja el patrón en ritmo sinusal y forma el circuito en la taquicardia: eso significa exactamente «patrón + taquiarritmia = síndrome de WPW». El diferencial de QRS ancho está en t5.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('preexcited-af', 667),
      view: { layout: 'strip', lead: 'II', calipers: true },
      caption: l(
        '现在**自己读**：节律规则吗？QRS 多宽？宽度逐搏变吗？用分规找出最短的 RR。想好你的判断，再看下一张卡。',
        'Now **read it yourself**: is the rhythm regular? How wide is the QRS? Does the width change beat to beat? Use the calipers to find the shortest RR. Decide your answer, then move to the next card.',
        'Ahora **léela tú**: ¿el ritmo es regular? ¿Cómo de ancho es el QRS? ¿Cambia la anchura de latido en latido? Usa el compás para buscar el RR más corto. Decide tu respuesta y pasa a la siguiente tarjeta.',
      ),
    },
    {
      kind: 'text',
      title: l('预激伴房颤：识别即行动', 'Pre-excited AF: recognition is action', 'FA preexcitada: reconocer es actuar'),
      body: l(
        '**快、宽、不规则**，QRS 宽度与形态会变（旁路与房室结以不同比例竞争下传）：多数搏动完全预激，夹杂着较窄的融合波甚至正常下传的窄 QRS——上一张图里你应该能找到它们。这就是预激伴房颤。颤动的心房经旁路猛冲，最短 RR 可 <250 ms，室率可 >250–300 次/分。\n**红线**：**禁用**腺苷、维拉帕米/地尔硫卓、β受体阻滞剂、地高辛和静脉胺碘酮——阻断房室结后，前传可能全落在旁路上，恶化为室颤。\n正确路径：血流动力学不稳定 ⇒ **同步电复律**；稳定 ⇒ **伊布利特或普鲁卡因胺**（ESC 亦认可氟卡尼/普罗帕酮）；随后**消融旁路**（既根治 AVRT，也封掉房颤的恶性通道）。',
        '**Fast, broad, irregular**, with QRS width and morphology that vary (the pathway and the AV node race to the ventricle in varying proportion): most beats fully pre-excited, mixed with narrower fusion beats or even a normally conducted narrow QRS — you should have found them on the previous strip. That is pre-excited AF. The fibrillating atria can pour down the pathway with a shortest RR <250 ms and rates >250-300/min.\n**The red line**: do **not** give adenosine, verapamil/diltiazem, beta-blockers, digoxin or IV amiodarone — block the AV node and all conduction may fall on the pathway, degenerating into VF.\nThe right path: haemodynamically unstable => **synchronised cardioversion**; stable => **ibutilide or procainamide** (flecainide/propafenone acceptable per ESC); then **ablate the pathway** (it cures AVRT and closes the dangerous route for AF).',
        '**Rápida, ancha, irregular**, con anchura y morfología del QRS variables (la vía y el nodo AV compiten por llegar al ventrículo en proporción variable): la mayoría de los latidos con preexcitación máxima, mezclados con latidos de fusión más estrechos o incluso algún QRS estrecho conducido con normalidad; deberías haberlos encontrado en la tira anterior. Eso es la FA preexcitada. Las aurículas fibrilantes pueden verterse por la vía con un RR más corto <250 ms y frecuencias >250-300 lpm.\n**La línea roja**: **no** administres adenosina, verapamilo/diltiacem, betabloqueantes, digoxina ni amiodarona intravenosa: al bloquear el nodo AV, toda la conducción puede caer en la vía y degenerar en FV.\nEl camino correcto: inestable hemodinámicamente => **cardioversión eléctrica sincronizada**; estable => **ibutilida o procainamida** (flecainida/propafenona aceptables según la ESC); después, **ablación de la vía** (cura la TRAV y cierra la ruta peligrosa de la FA).',
      ),
    },
    {
      kind: 'text',
      title: l('无症状预激怎么办？', 'What to do with asymptomatic pre-excitation', '¿Qué hacer con la preexcitación asintomática?'),
      body: l(
        '高危特征：**SPERRI ≤250 ms**（房颤中最短预激 RR）、**旁路 ERP ≤250 ms**、多条旁路、可诱发 AVRT。\n- **竞技运动员与高危职业者**：建议电生理检查（加异丙肾上腺素），I 类推荐；其他无症状者也应考虑（IIa）。\n- 检出高危特征 ⇒ **消融**。\n- **间歇性预激**（δ波突然逐搏消失、PR 延长、QRS 正常化）提示旁路不应期长、风险较低——但不完美：超过 20% 者 ERP 仍 <250 ms。**运动中逐渐消失不是同一征象**（那只是房室结传导增强）。\n- 运动员筛查：预激（PR <120 ms + δ波 + QRS ≥120 ms）是**异常**发现，即使在高训练水平运动员中也需进一步评估；无症状运动员孤立短 PR 无 δ波不是预激，无需进一步检查。',
        'High-risk features: **SPERRI <=250 ms** (shortest pre-excited RR during AF), **pathway ERP <=250 ms**, multiple pathways, inducible AVRT.\n- **Competitive athletes and people in high-risk occupations**: an EP study (with isoprenaline) is recommended, Class I; for other asymptomatic people it should be considered (IIa).\n- High-risk features found => **ablation**.\n- **Intermittent pre-excitation** (the delta vanishes abruptly from beat to beat, the PR lengthens and the QRS normalises) suggests a long pathway refractory period and lower risk — imperfectly: more than 20% of such patients still have an ERP <250 ms. **A gradual loss during exercise is NOT the same sign** (it only reflects enhanced AV-nodal conduction).\n- Athlete screening: pre-excitation (PR <120 ms + delta + QRS >=120 ms) is an **abnormal** finding that needs further evaluation even in a highly trained athlete; an isolated short PR without delta in an asymptomatic athlete is not pre-excitation and needs no work-up.',
        'Características de alto riesgo: **SPERRI <=250 ms** (RR preexcitado más corto en FA), **ERP de la vía <=250 ms**, vías múltiples, TRAV inducible.\n- **Deportistas de competición y personas en profesiones de alto riesgo**: se recomienda estudio electrofisiológico (con isoproterenol), clase I; en las demás personas asintomáticas debe considerarse (IIa).\n- Si se encuentran características de alto riesgo => **ablación**.\n- La **preexcitación intermitente** (la delta desaparece de forma brusca de un latido a otro, el PR se alarga y el QRS se normaliza) sugiere una vía con período refractario largo y menor riesgo, pero es imperfecta: más del 20% de esos pacientes sigue con ERP <250 ms. **La pérdida gradual en el esfuerzo NO es el mismo signo** (solo refleja conducción AV nodal acelerada).\n- Cribado del deportista: la preexcitación (PR <120 ms + delta + QRS >=120 ms) es un hallazgo **anormal** que exige evaluación incluso en un deportista muy entrenado; un PR corto aislado sin delta en un deportista asintomático no es preexcitación y no requiere más estudios.',
      ),
    },
    { kind: 'check', item: { family: 'preexcitation', seed: 1 } },
    { kind: 'check', item: { family: 'preexcitation', seed: 2 } },
    { kind: 'check', item: { family: 'delta', seed: 2 } },
    { kind: 'drill', families: ['preexcitation', 'delta'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [11889, 2145, 12559],
      caption: l(
        '三份真实的 WPW 图形（55–63 岁）。先测量 PR、在至少两个导联找 δ波、判断 QRS 宽度，想好你的报告，然后揭晓。注意：三份都是窦性心律，此刻并没有心律失常——所以它们是“图形”，不是“综合征”。预激程度各不相同：有一份的δ波很细微、PR 也不太短——不是每份图形都会量出 <120 ms，要逐导联仔细量。',
        'Three real WPW patterns (ages 55-63). Measure the PR, find the delta in at least two leads, judge the QRS width and commit to your report — then reveal. Note: all three are in sinus rhythm with no arrhythmia at this moment, so they are "patterns", not "syndromes". The degree of pre-excitation differs: in one the delta is subtle and the PR is not very short — not every pattern measures under 120 ms, so measure carefully, lead by lead.',
        'Tres patrones de WPW reales (55-63 años). Mide el PR, busca la delta en al menos dos derivaciones, valora la anchura del QRS y decide tu informe antes de mirar la solución. Fíjate: los tres están en ritmo sinusal y ahora mismo no hay arritmia, así que son «patrones», no «síndromes». El grado de preexcitación varía: en uno la delta es sutil y el PR no es muy corto; no todos los patrones miden menos de 120 ms, así que mide con cuidado, derivación por derivación.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把预激的宽 QRS、V1 高 R 读成束支阻滞或 LVH。',
          'Reading the pre-excited wide QRS or the tall R in V1 as bundle branch block or LVH.',
          'Leer el QRS ancho preexcitado o la R alta de V1 como bloqueo de rama o HVI.',
        ),
        l(
          '在负向 δ波造成的假性 Q 波上诊断心梗。',
          'Diagnosing MI on pseudo-Q waves created by a negative delta.',
          'Diagnosticar un IAM sobre pseudoondas Q creadas por una delta negativa.',
        ),
        l(
          '给预激伴房颤用腺苷或维拉帕米——可能诱发室颤。',
          'Giving adenosine or verapamil in pre-excited AF — it can precipitate VF.',
          'Dar adenosina o verapamilo en la FA preexcitada: puede precipitar una FV.',
        ),
        l(
          '还在用“LGL 综合征”一词：短 PR 无 δ波就叫短 PR / 房室结传导增强。',
          'Still using the label "LGL syndrome": a short PR without delta is simply short PR / enhanced AV-nodal conduction.',
          'Seguir usando el término «síndrome de LGL»: un PR corto sin delta es simplemente PR corto / conducción AV nodal acelerada.',
        ),
        l(
          '把竞技运动员的无症状预激当正常变异打发——它需要电生理评估。',
          'Dismissing asymptomatic pre-excitation in a competitive athlete as a normal variant — it needs EP evaluation.',
          'Despachar la preexcitación asintomática de un deportista de competición como variante normal: exige evaluación electrofisiológica.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'WPW 图形 = 窦性 PR <120 ms + δ波 + QRS >120 ms + 继发性 ST-T；只有出现心动过速（AVRT、预激伴房颤）才叫 WPW 综合征。',
          'WPW pattern = sinus PR <120 ms + delta wave + QRS >120 ms + secondary ST-T; it becomes the WPW syndrome only when a tachyarrhythmia appears (AVRT, pre-excited AF).',
          'Patrón de WPW = PR sinusal <120 ms + onda delta + QRS >120 ms + ST-T secundario; solo se habla de síndrome de WPW cuando aparece una taquiarritmia (TRAV, FA preexcitada).',
        ),
        l(
          '预激搏动上不诊断 MI、LVH、束支/分支阻滞，不判读电轴；复极看 JT。',
          'On pre-excited beats do not diagnose MI, LVH, bundle branch or fascicular block, and do not read the axis; judge repolarisation by the JT.',
          'En latidos preexcitados no diagnostiques IAM, HVI, bloqueo de rama o de fascículo, ni leas el eje; valora la repolarización por el JT.',
        ),
        l(
          '短 PR 无 δ波 = 房室结传导增强，不是预激，也不是 LGL；隐匿性旁路的心电图完全正常。',
          'Short PR without delta = enhanced AV-nodal conduction, not pre-excitation and not LGL; a concealed pathway gives a completely normal ECG.',
          'PR corto sin delta = conducción AV nodal acelerada, no preexcitación ni LGL; una vía oculta da un ECG completamente normal.',
        ),
        l(
          '快、宽、不规则、逐搏变化 = 预激伴房颤：禁用一切房室结阻滞剂；不稳定即同步电复律，稳定用伊布利特/普鲁卡因胺，然后消融旁路。',
          'Fast, broad, irregular, changing beat to beat = pre-excited AF: every AV-nodal blocker is contraindicated; synchronised cardioversion if unstable, ibutilide/procainamide if stable, then ablate the pathway.',
          'Rápida, ancha, irregular y cambiante de latido en latido = FA preexcitada: contraindicados todos los bloqueadores del nodo AV; cardioversión sincronizada si está inestable, ibutilida/procainamida si está estable y después ablación de la vía.',
        ),
        l(
          '无症状预激按危险分层：SPERRI ≤250 ms、ERP ≤250 ms、多条旁路、可诱发 AVRT 为高危；竞技运动员建议电生理检查，高危者消融。',
          'Risk-stratify asymptomatic pre-excitation: SPERRI <=250 ms, ERP <=250 ms, multiple pathways or inducible AVRT are high risk; competitive athletes should have an EP study, and ablation follows when high-risk features are found.',
          'Estratifica el riesgo de la preexcitación asintomática: SPERRI <=250 ms, ERP <=250 ms, vías múltiples o TRAV inducible son de alto riesgo; al deportista de competición se le ofrece estudio electrofisiológico y la ablación sigue si hay características de alto riesgo.',
        ),
      ],
    },
  ],
  sources: [
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    'Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240',
    'Sharma S, Drezner JA et al. International Recommendations for Electrocardiographic Interpretation in Athletes. JACC 2017;69:1057-1075',
    'Castellano et al. 2004',
  ],
};

export default lesson;
