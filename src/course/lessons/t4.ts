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
        '播放一个心动周期：旁路所在的左室基底外侧（高亮）最先除极，早于其余心室，这就是 δ 波；随后经房室结下传的激动赶到：QRS 是两者的**融合波**。',
        'Play one beat: the basolateral left ventricle at the pathway (highlighted) depolarises first, before the rest of the ventricle: that is the delta wave. Then the front from the AV node arrives: the QRS is a **fusion** of the two.',
        'Reproduce un latido: el ventrículo izquierdo basolateral junto a la vía (resaltado) se despolariza primero, antes que el resto del ventrículo: esa es la onda delta. Después llega el frente que bajó por el nodo AV: el QRS es una **fusión** de los dos.',
      ),
    },
    {
      kind: 'film',
      title: l('预激是模仿高手', 'Pre-excitation, the great mimic', 'La preexcitación, gran imitadora'),
      view: { layout: '3x4+1' },
      frames: [
        {
          label: l('V1 高 R', 'Tall R in V1', 'R alta en V1'),
          ecg: synth('wpw', 661),
          note: l(
            'V1：QRS 又宽又以 R 为主，像右束支阻滞或后壁心梗。其实是经旁路最先激动的左室基底部。',
            'V1: a wide, mainly positive QRS that looks like RBBB or a posterior MI. It is the left base, activated first over the pathway.',
            'V1: un QRS ancho y predominantemente positivo que parece un bloqueo de rama derecha o un IAM posterior. Es la base izquierda, activada primero por la vía.',
          ),
          marks: [{ auto: 'delta', lead: 'V1' }],
        },
        {
          label: l('I 与 aVL', 'I and aVL', 'I y aVL'),
          ecg: synth('wpw', 661),
          note: l(
            'I、aVL：负向 δ 波写出一个 Q 波，像侧壁心梗。它是 δ 波，不是坏死。',
            'I and aVL: the negative delta writes a Q wave that looks like a lateral MI. It is the delta, not necrosis.',
            'I y aVL: la delta negativa dibuja una onda Q que parece un IAM lateral. Es la delta, no necrosis.',
          ),
          marks: [{ auto: 'delta', lead: 'I' }, { auto: 'delta', lead: 'aVL' }],
        },
        {
          label: l('ST–T', 'ST–T', 'ST-T'),
          ecg: synth('wpw', 661),
          note: l(
            'II、III、aVF 和 V1–V6：T 与 QRS 方向相反，像缺血。这是继发性改变。',
            'II, III, aVF and V1–V6: the T points opposite to the QRS and looks like ischaemia. It is a secondary change.',
            'II, III, aVF y V1-V6: la T va en sentido opuesto al QRS y parece isquemia. Es un cambio secundario.',
          ),
          marks: [{ auto: 't', lead: 'III' }, { auto: 't', lead: 'V4' }],
        },
        {
          label: l('电轴', 'Axis', 'Eje'),
          ecg: synth('wpw', 661),
          note: l('I 近乎等电位、aVF 直立：电轴看起来右偏。同样是预激造成的，别判读。', 'I nearly isoelectric, aVF upright: the axis looks rightward. Pre-excitation again, so do not interpret it.', 'I casi isoeléctrica y aVF positiva: el eje parece desviado a la derecha. Otra vez la preexcitación: no lo interpretes.'),
          marks: [{ auto: 'qrs', lead: 'I' }, { auto: 'qrs', lead: 'aVF' }],
        },
      ],
      predict: {
        question: l(
          'I 和 aVL 的 QRS 以负向 δ 波开始。粗看它像什么？',
          'In I and aVL the QRS starts with a negative delta wave. At a glance, what does that look like?',
          'En I y aVL el QRS empieza con una onda delta negativa. A primera vista, ¿a qué se parece?',
        ),
        options: [
          l('侧壁心梗的 Q 波', 'The Q waves of a lateral infarct', 'Las ondas Q de un infarto lateral'),
          l('左束支阻滞', 'Left bundle branch block', 'Un bloqueo de rama izquierda'),
          l('低电压', 'Low voltage', 'Bajo voltaje'),
        ],
        answer: 0,
      },
      caption: l(
        '开头那份预激心电图，四个陷阱。先确认有没有预激，再读其他一切：预激搏动上不诊断心梗、LVH、束支阻滞，也不判读电轴。',
        'The opening ECG, four traps. Settle whether there is pre-excitation before reading anything else: on pre-excited beats do not diagnose MI, LVH or bundle branch block, and do not read the axis.',
        'El ECG inicial, cuatro trampas. Decide primero si hay preexcitación antes de leer nada más: en latidos preexcitados no diagnostiques IAM, HVI ni bloqueo de rama, ni leas el eje.',
      ),
    },
    {
      kind: 'film',
      title: l('旁路在四种心律里', 'The pathway in four rhythms', 'La vía en cuatro ritmos'),
      view: { layout: '3x4+1' },
      frames: [
        {
          label: l('窦性：图形', 'Sinus: pattern', 'Sinusal: patrón'),
          ecg: synth('wpw', 664),
          note: l(
            'PR 约 115 ms、δ 波、QRS 约 120 ms：旁路画出的图形。没有心动过速 ⇒ 只是 WPW 图形。',
            'PR about 115 ms, a delta wave and a QRS of about 120 ms: the pathway draws the pattern. No tachycardia → only a WPW pattern.',
            'PR de unos 115 ms, onda delta y QRS de unos 120 ms: la vía dibuja el patrón. Sin taquicardia → solo es un patrón de WPW.',
          ),
          marks: [{ auto: 'pr' }, { auto: 'delta' }],
        },
        {
          label: l('顺向型 AVRT', 'Orthodromic AVRT', 'TRAV ortodrómica'),
          ecg: synth('avrt', 668),
          note: l(
            '经房室结下传、经旁路逆传 ⇒ QRS 窄而规则，约 190 次/分；P′ 落在 ST 段上，aVL 里一个小下凹。',
            'Down the AV node, back up the pathway → a narrow, regular QRS at about 190/min; the P′ sits on the ST segment, a small dip in aVL.',
            'Baja por el nodo AV y vuelve por la vía → QRS estrecho y regular a unos 190 lpm; la P′ cae sobre el segmento ST, con una pequeña deflexión negativa en aVL.',
          ),
          marks: [{ auto: 'p', lead: 'aVL', label: l('P′', 'P′', 'P′') }],
        },
        {
          label: l('逆向型 AVRT', 'Antidromic AVRT', 'TRAV antidrómica'),
          ecg: synth('avrt', 666, undefined, 'antidromic'),
          note: l(
            '经旁路下传、经房室结逆传 ⇒ QRS 完全预激，宽约 155 ms，规则，约 185 次/分。',
            'Down the pathway, back up the AV node → a fully pre-excited QRS about 155 ms wide, regular, at about 185/min.',
            'Baja por la vía y vuelve por el nodo AV → QRS totalmente preexcitado de unos 155 ms, regular, a unos 185 lpm.',
          ),
          marks: [{ auto: 'qrs' }],
        },
        {
          label: l('预激伴房颤', 'Pre-excited AF', 'FA preexcitada'),
          ecg: synth('preexcited-af', 667),
          note: l(
            '快（约 200 次/分）、宽、不规则，QRS 宽度逐搏变化，夹着几个较窄的搏动；两个宽搏动之间的最短 RR 约 225 ms（<250 ms）⇒ 高危。',
            'Fast (about 200/min), broad and irregular, with the QRS width changing beat to beat and a few narrower beats mixed in; the shortest RR between two wide beats is about 225 ms (< 250 ms) → high risk.',
            'Rápida (unos 200 lpm), ancha e irregular, con la anchura del QRS cambiando de latido en latido y algunos latidos más estrechos; el RR más corto entre dos latidos anchos es de unos 225 ms (< 250 ms) → alto riesgo.',
          ),
          marks: [{ auto: 'qrs', beat: 18 }, { auto: 'rr', beat: 17 }],
        },
      ],
      predict: {
        question: l(
          '逆向型 AVRT 的冲动经旁路下传到心室。它的 QRS 会是什么样？',
          'In antidromic AVRT the impulse reaches the ventricles down the pathway. What will its QRS look like?',
          'En la TRAV antidrómica el impulso llega a los ventrículos por la vía. ¿Cómo será su QRS?',
        ),
        options: [
          l('窄，和窦性一样', 'Narrow, like in sinus rhythm', 'Estrecho, como en ritmo sinusal'),
          l('完全预激，宽', 'Fully pre-excited and wide', 'Totalmente preexcitado y ancho'),
          l('完全不规则', 'Completely irregular', 'Totalmente irregular'),
        ],
        answer: 1,
      },
      caption: l(
        '四个不同的患者，旁路都在左侧游离壁。能前传的旁路在窦性心律时画出图形（顺向型那位的旁路是隐匿的，没有图形）；AVRT 时旁路构成环路，房颤时它放快速的心房冲动通过。图形 + 心动过速 = WPW 综合征。',
        'Four different patients, each with a left free-wall pathway. A pathway that conducts forward draws the pattern in sinus rhythm (the orthodromic patient’s is concealed: no pattern); in AVRT the pathway forms the circuit; in AF it lets the fast atrial impulses through. Pattern + tachycardia = WPW syndrome.',
        'Cuatro pacientes distintos, todos con una vía de pared libre izquierda. Una vía que conduce hacia delante dibuja el patrón en ritmo sinusal (la del paciente ortodrómico está oculta: no hay patrón); en la TRAV la vía forma el circuito; en la FA deja pasar los impulsos auriculares rápidos. Patrón + taquicardia = síndrome de WPW.',
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
        {
          label: l('隐匿性旁路', 'Concealed pathway', 'Vía oculta'),
          value: l('只能逆传：静息心电图完全正常，不与猝死相关，但可充当 AVRT 的逆传支', 'Conducts only retrogradely: the resting ECG is completely normal and it is not linked to sudden death, but it can be the retrograde limb of AVRT', 'Solo conduce de forma retrógrada: el ECG en reposo es completamente normal y no se asocia a muerte súbita, pero puede ser la rama retrógrada de una TRAV'),
        },
        {
          label: l('SVT 终止后的窦性心电图', 'The sinus ECG after an SVT', 'El ECG sinusal tras una TSV'),
          value: l(
            '见到预激 ⇒ 显性旁路，AVRT 可能；心电图正常不能排除隐匿性旁路（基线正常时依次为 AVNRT、隐匿性旁路 AVRT、局灶性房速，机制看心动过速心电图，t1）；孤立短 PR 无 δ 波对判断机制无价值',
            'Pre-excitation -> a manifest pathway, AVRT likely; a normal ECG does not exclude a concealed pathway (with a normal baseline: AVNRT, then AVRT over a concealed pathway, then focal AT; read the mechanism from the tachycardia ECG, t1); an isolated short PR without delta says nothing about the mechanism',
            'Preexcitación -> vía manifiesta, TRAV probable; un ECG normal no excluye una vía oculta (con línea de base normal: TRIN, luego TRAV por vía oculta, luego TA focal; el mecanismo se lee en el ECG de la taquicardia, t1); un PR corto aislado sin delta no dice nada del mecanismo',
          ),
        },
        {
          label: l('预激的模仿', 'What pre-excitation mimics', 'Lo que imita la preexcitación'),
          value: l(
            '负向 δ 波写出 Q/QS：下间隔旁路 ⇒ II、III、aVF 假“下壁心梗”，左侧旁路 ⇒ I、aVL 的 Q；左侧旁路 ⇒ V1 高 R，像后壁心梗或右束支阻滞；继发性 ST-T 像缺血',
            'A negative delta writes Q/QS complexes: an inferoparaseptal pathway fakes an inferior MI in II, III and aVF, a left-sided one a Q in I and aVL; a left-sided pathway gives a tall R in V1, like posterior MI or RBBB; the secondary ST-T looks like ischaemia',
            'Una delta negativa dibuja complejos Q/QS: una vía inferoparaseptal finge un IAM inferior en II, III y aVF, una izquierda una Q en I y aVL; una vía izquierda da una R alta en V1, como un IAM posterior o un bloqueo de rama derecha; el ST-T secundario parece isquemia',
          ),
        },
        {
          label: l('预激伴房颤：红线与处理', 'Pre-excited AF: the red line and the treatment', 'FA preexcitada: la línea roja y el tratamiento'),
          value: l(
            '禁用腺苷、维拉帕米/地尔硫卓、β 受体阻滞剂、地高辛、静脉胺碘酮（阻断房室结后前传全走旁路，可恶化为室颤）；不稳定 ⇒ 同步电复律；稳定 ⇒ 伊布利特或普鲁卡因胺（ESC 亦认可氟卡尼/普罗帕酮）；随后消融旁路',
            'No adenosine, verapamil/diltiazem, beta-blockers, digoxin or IV amiodarone (block the AV node and conduction falls on the pathway, which can degenerate into VF); unstable -> synchronised cardioversion; stable -> ibutilide or procainamide (flecainide/propafenone acceptable per ESC); then ablate the pathway',
            'Nada de adenosina, verapamilo/diltiacem, betabloqueantes, digoxina ni amiodarona intravenosa (al bloquear el nodo AV la conducción cae en la vía y puede degenerar en FV); inestable -> cardioversión sincronizada; estable -> ibutilida o procainamida (flecainida/propafenona aceptables según la ESC); después, ablación de la vía',
          ),
        },
        {
          label: l('无症状预激', 'Asymptomatic pre-excitation', 'Preexcitación asintomática'),
          value: l(
            '竞技运动员与高危职业者：建议电生理检查（含异丙肾上腺素，I 类）；其他无症状者应考虑（IIa）；有高危特征 ⇒ 消融',
            'Competitive athletes and high-risk occupations: EP study with isoprenaline recommended (Class I); other asymptomatic people: should be considered (IIa); high-risk features -> ablation',
            'Deportistas de competición y profesiones de alto riesgo: estudio electrofisiológico con isoprenalina recomendado (clase I); otras personas asintomáticas: debe considerarse (IIa); características de alto riesgo -> ablación',
          ),
        },
        {
          label: l('间歇性预激', 'Intermittent pre-excitation', 'Preexcitación intermitente'),
          value: l(
            'δ 波逐搏突然消失、PR 延长、QRS 正常化 ⇒ 旁路不应期长、风险较低（但 > 20% 的 ERP 仍 < 250 ms）；运动中逐渐消失不是同一征象（只是房室结传导增强）',
            'The delta vanishes abruptly from one beat to the next, the PR lengthens and the QRS normalises -> a long pathway refractory period and lower risk (yet > 20% still have an ERP < 250 ms); a gradual loss during exercise is not the same sign (only enhanced AV-nodal conduction)',
            'La delta desaparece de golpe de un latido a otro, el PR se alarga y el QRS se normaliza -> vía con período refractario largo y menor riesgo (aunque > 20% siguen con ERP < 250 ms); la pérdida gradual durante el esfuerzo no es el mismo signo (solo conducción AV nodal acelerada)',
          ),
        },
        {
          label: l('运动员筛查', 'Athlete screening', 'Cribado del deportista'),
          value: l(
            '预激（PR < 120 ms + δ 波 + QRS ≥ 120 ms）是异常发现，即使高水平运动员也需进一步评估；孤立短 PR 无 δ 波不是预激，无需检查',
            'Pre-excitation (PR < 120 ms + delta + QRS >= 120 ms) is an abnormal finding that needs work-up even in a highly trained athlete; an isolated short PR without delta is not pre-excitation and needs none',
            'La preexcitación (PR < 120 ms + delta + QRS >= 120 ms) es un hallazgo anormal que exige estudio incluso en un deportista muy entrenado; un PR corto aislado sin delta no es preexcitación y no requiere estudio',
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
        '两者 PR 都短，区别全在 QRS 起始：左有 δ 波（旁路提前激动心室）；右 QRS 窄而利落 = **房室结传导增强**，不是预激，也不叫 LGL。无症状者的短 PR 多为正常变异。',
        'Both have a short PR; the difference sits at the QRS onset. Left: a delta wave (the pathway activates the ventricle early). Right: a narrow, crisp QRS = **enhanced AV-nodal conduction**, not pre-excitation, and not "LGL". In someone without symptoms a short PR is usually a normal variant.',
        'Ambos tienen el PR corto; la diferencia está en el inicio del QRS. Izquierda: onda delta (la vía activa antes el ventrículo). Derecha: QRS estrecho y nítido = **conducción AV nodal acelerada**, no preexcitación ni «LGL». En una persona asintomática el PR corto suele ser una variante normal.',
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
        '三份真实的 WPW 图形（55–63 岁）。先测量 PR、在至少两个导联找 δ波、判断 QRS 宽度，想好你的报告，然后揭晓。注意：三份都没有心律失常标签，机器测量（12SL）也是每个 QRS 一个 P。PTB-XL 没有给出心动过速病史，所以你能报告的只是“图形”。预激程度各不相同：有一份机器测得 PR 140 ms——不是每份图形都会量出 <120 ms，要逐导联仔细量。',
        'Three real WPW patterns (ages 55-63). Measure the PR, find the delta in at least two leads, judge the QRS width and commit to your report — then reveal. Note: none of the three carries an arrhythmia label and the machine reading (12SL) counts one P per QRS. PTB-XL gives no history of tachycardia, so all you can report is the pattern. The degree of pre-excitation differs: in one the machine PR is 140 ms — not every pattern measures under 120 ms, so measure carefully, lead by lead.',
        'Tres patrones de WPW reales (55-63 años). Mide el PR, busca la delta en al menos dos derivaciones, valora la anchura del QRS y decide tu informe antes de mirar la solución. Fíjate: ninguno lleva una etiqueta de arritmia y la medición automática (12SL) cuenta una P por QRS. PTB-XL no da antecedentes de taquicardia, así que solo puedes informar el patrón. El grado de preexcitación varía: en uno la máquina mide un PR de 140 ms; no todos los patrones miden menos de 120 ms, así que mide con cuidado, derivación por derivación.',
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
