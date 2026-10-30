/**
 * Bradycardia and AV block: P–QRS relationship, PR behaviour, dropped beats, AV dissociation.
 *
 * Sources (criteria only; text is original):
 * - Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on the Evaluation and Management of Patients With Bradycardia and
 *   Cardiac Conduction Delay. Circulation 2019;140:e382-482 (definitions of 1st-, 2nd- (Mobitz I/II, 2:1), high-grade and
 *   3rd-degree AV block; 2:1 block cannot be classified from the surface ECG alone).
 * - Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J
 *   2021;42:3427-520 (site of block, escape rhythms).
 * - Surawicz B et al. AHA/ACCF/HRS Recommendations for the Standardization and Interpretation of the ECG, Part III:
 *   intraventricular conduction disturbances. Circulation 2009;119:e235-40; Part II terminology (Mason JW et al.,
 *   Circulation 2007;115:1325-32): PR > 200 ms = 1st-degree AV block.
 * - Sinus bradycardia < 60 /min (AHA/ACCF/HRS 2009 terminology); the 2018 guideline uses < 50 /min.
 */
import { l } from '../../core/l10n';
import type { DecisionTree } from './types';

export const bradyAvBlockTree: DecisionTree = {
  id: 'brady-av-block',
  title: l('心动过缓与房室传导阻滞', 'Bradycardia and AV block', 'Bradicardia y bloqueo auriculoventricular'),
  intro: l(
    '心率慢或怀疑房室阻滞时：先找出每一个 P 波（看 II 和 V1，也要看 T 波里面），再描述每个 P 波与其后 QRS 的关系。',
    'Slow rhythm or suspected AV block: first find every P wave (look in II and V1, and inside the T waves), then describe how each P relates to the QRS that follows.',
    'Ritmo lento o sospecha de bloqueo AV: primero localiza todas las ondas P (en II y V1, y también dentro de las ondas T); después describe la relación de cada P con el QRS que la sigue.',
  ),
  root: 'relation',
  sources: [
    'Kusumoto FM et al. 2018 ACC/AHA/HRS bradycardia guideline. Circulation 2019;140:e382-482',
    'Glikson M et al. 2021 ESC pacing/CRT guidelines. Eur Heart J 2021;42:3427-520',
    'Surawicz B et al. AHA/ACCF/HRS 2009, Part III. Circulation 2009;119:e235-40',
  ],
  nodes: {
    relation: {
      kind: 'question',
      text: l('找出所有 P 波。它们与 QRS 波群是什么关系？', 'Find all the P waves. How do they relate to the QRS complexes?', 'Localiza todas las ondas P. ¿Qué relación tienen con los complejos QRS?'),
      help: l(
        '用分规"走" P–P 间期：规律的 P 波常藏在 QRS 或 T 波中，T 波顶部变形往往就是 P 波。',
        'March out the P–P interval with calipers: regular P waves often hide in a QRS or a T wave — a deformed T-wave peak is often a P wave.',
        'Marca el intervalo P–P con el compás: las ondas P regulares a menudo se esconden en un QRS o en una T; un vértice de T deformado suele ser una onda P.',
      ),
      options: [
        { label: l('每个 P 波后都有 QRS（1:1）', 'Every P is followed by a QRS (1:1)', 'Cada P va seguida de un QRS (1:1)'), next: 'pr' },
        { label: l('部分 P 波后没有 QRS（脱漏）', 'Some P waves are not followed by a QRS (dropped beats)', 'Algunas ondas P no van seguidas de QRS (latidos bloqueados)'), next: 'dropped' },
        { label: l('P 波与 QRS 无关（PR 随机变化）', 'P waves and QRS complexes are unrelated (the PR varies at random)', 'Las ondas P y los QRS no guardan relación (el PR varía al azar)'), next: 'dissoc' },
        { label: l('看不到 P 波', 'No P waves visible', 'No se ven ondas P'), next: 'noP' },
      ],
    },
    pr: {
      kind: 'question',
      text: l('1:1 下传。PR 间期是多少？', '1:1 conduction. What is the PR interval?', 'Conducción 1:1. ¿Cuánto mide el PR?'),
      help: l(
        '从 P 波起点量到 QRS 起点，在 PR 最长的导联测量（通常为 II）。',
        'Measure from P onset to QRS onset in the lead where it is longest (usually II).',
        'Mide desde el inicio de la P hasta el inicio del QRS en la derivación donde es más largo (habitualmente II).',
      ),
      options: [
        { label: l('> 200 ms，且固定', '> 200 ms, constant', '> 200 ms, constante'), next: 'av1' },
        { label: l('120–200 ms', '120–200 ms', '120–200 ms'), next: 'sinusBrady' },
        { label: l('< 120 ms', '< 120 ms', '< 120 ms'), next: 'shortPr' },
      ],
    },
    dropped: {
      kind: 'question',
      text: l('观察未下传 P 波前后的 PR 间期。', 'Look at the PR intervals around the non-conducted P wave.', 'Observa los intervalos PR alrededor de la onda P no conducida.'),
      help: l(
        '先确认未下传的 P 波是否按时出现。提前出现而未下传的 P 波是未下传的房性期前收缩，不是房室阻滞。',
        'First check that the non-conducted P arrives on time. A premature P that fails to conduct is a blocked PAC, not AV block.',
        'Comprueba primero que la P no conducida llega a su hora. Una P prematura que no se conduce es una extrasístole auricular bloqueada, no un bloqueo AV.',
      ),
      options: [
        {
          label: l('PR 逐搏延长，直到一个 P 波未下传；长间歇后的第一个 PR 最短', 'PR lengthens beat by beat until a P is not conducted; the first PR after the pause is the shortest', 'El PR se alarga latido a latido hasta que una P no se conduce; el primer PR tras la pausa es el más corto'),
          next: 'mobitz1',
        },
        {
          label: l('未下传 P 波前后的 PR 固定不变', 'The PR is constant before and after the non-conducted P', 'El PR es constante antes y después de la P no conducida'),
          next: 'mobitz2',
        },
        { label: l('恰好每隔一个 P 波下传一次（2:1）', 'Exactly every second P is conducted (2:1)', 'Se conduce exactamente una de cada dos P (2:1)'), next: 'twoToOne' },
        {
          label: l('连续 ≥ 2 个 P 波未下传，但仍有部分 P 波下传', 'Two or more consecutive P waves blocked, but some P waves still conduct', 'Dos o más ondas P seguidas bloqueadas, pero algunas P aún se conducen'),
          next: 'highGrade',
        },
        {
          label: l('未下传的 P 波是提前出现的（常使前面的 T 波变形）', 'The non-conducted P is premature (early, often deforming the preceding T wave)', 'La P no conducida es prematura (precoz, a menudo deforma la onda T previa)'),
          next: 'blockedPac',
        },
      ],
    },
    dissoc: {
      kind: 'question',
      text: l('比较心房率（P–P）与心室率（R–R）。', 'Compare the atrial rate (P–P) with the ventricular rate (R–R).', 'Compara la frecuencia auricular (P–P) con la ventricular (R–R).'),
      options: [
        {
          label: l('心房率快于心室率；P 波落在心动周期各个位置，却没有一个下传', 'Atria faster than ventricles; P waves land at every point of the cycle and none conducts', 'Aurículas más rápidas que ventrículos; las P caen en cualquier punto del ciclo y ninguna se conduce'),
          next: 'escape',
        },
        {
          label: l('心室率等于或快于心房率', 'Ventricular rate equal to or faster than the atrial rate', 'Frecuencia ventricular igual o mayor que la auricular'),
          next: 'avDissoc',
        },
      ],
    },
    escape: {
      kind: 'question',
      text: l('完全性房室阻滞：观察逸搏心律。其 QRS 宽度如何？', 'Complete AV block: look at the escape rhythm. How wide is its QRS?', 'Bloqueo AV completo: observa el ritmo de escape. ¿Qué anchura tiene su QRS?'),
      options: [
        { label: l('窄（< 120 ms），约 40–60 次/分', 'Narrow (< 120 ms), about 40–60 /min', 'Estrecho (< 120 ms), unos 40–60 lpm'), next: 'chbNarrow' },
        { label: l('宽（≥ 120 ms），约 20–40 次/分', 'Wide (≥ 120 ms), about 20–40 /min', 'Ancho (≥ 120 ms), unos 20–40 lpm'), next: 'chbWide' },
      ],
    },
    noP: {
      kind: 'question',
      text: l('没有 P 波：观察基线和 R–R 间期。', 'No P waves: look at the baseline and the R–R intervals.', 'Sin ondas P: observa la línea de base y los intervalos R–R.'),
      options: [
        { label: l('基线为颤动波，R–R 不规整', 'Fibrillatory baseline, irregular R–R', 'Línea de base fibrilatoria, R–R irregular'), next: 'afSlow' },
        { label: l('基线为颤动波，但 R–R 完全规整且缓慢', 'Fibrillatory baseline but perfectly regular, slow R–R', 'Línea de base fibrilatoria, pero R–R lento y perfectamente regular'), next: 'afChb' },
        { label: l('基线平直，节律规整，QRS 窄', 'Flat baseline, regular, narrow QRS', 'Línea de base plana, ritmo regular, QRS estrecho'), next: 'junctional' },
        { label: l('基线平直，节律规整，QRS 宽', 'Flat baseline, regular, wide QRS', 'Línea de base plana, ritmo regular, QRS ancho'), next: 'ventEscape' },
      ],
    },

    // ── leaves ────────────────────────────────────────────────────────────────────────────────────────────────────
    av1: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['av-block-1'],
      title: l('一度房室传导阻滞', 'First-degree AV block', 'Bloqueo auriculoventricular de primer grado'),
      text: l(
        '每个 P 波都能下传，但传导缓慢：PR > 200 ms 且固定。通常为房室结内延迟，本身不会造成心搏脱漏。',
        'Every P conducts, but slowly: PR > 200 ms and constant. Usually a delay inside the AV node; by itself it drops no beats.',
        'Todas las P se conducen, pero despacio: PR > 200 ms y constante. Suele ser un retraso dentro del nodo AV; por sí mismo no bloquea latidos.',
      ),
    },
    sinusBrady: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['sinus-bradycardia'],
      title: l('无房室阻滞：窦性心动过缓（若为窦性 P 波）', 'No AV block: sinus bradycardia (if the P waves are sinus)', 'Sin bloqueo AV: bradicardia sinusal (si las P son sinusales)'),
      text: l(
        'PR 正常且 1:1 下传。P 波正常、心率 < 60 次/分（部分指南用 < 50 次/分）即窦性心动过缓，见于运动员和睡眠时。若有长间歇，要考虑窦房结功能障碍（窦性停搏或窦房阻滞）。',
        'Normal PR with 1:1 conduction. Normal P waves at < 60 /min (some guidelines use < 50 /min) are sinus bradycardia — normal in athletes and during sleep. With pauses, think of sinus node dysfunction (sinus arrest or SA block).',
        'PR normal con conducción 1:1. Ondas P normales a < 60 lpm (algunas guías usan < 50 lpm) son bradicardia sinusal, normal en deportistas y durante el sueño. Si hay pausas, piensa en disfunción sinusal (paro sinusal o bloqueo sinoauricular).',
      ),
    },
    shortPr: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['short-pr', 'wpw'],
      title: l('PR 间期缩短（< 120 ms）', 'Short PR interval (< 120 ms)', 'Intervalo PR corto (< 120 ms)'),
      text: l(
        '寻找 delta 波（QRS 起始部顿挫、QRS 增宽）：预激（WPW 图形）。无 delta 波时，考虑低位房性或交界性节律（II、III、aVF 的 P 波倒置）或正常变异。',
        'Look for a delta wave (slurred QRS upstroke, wider QRS): pre-excitation (WPW pattern). Without a delta wave, consider a low atrial or junctional rhythm (P negative in II, III, aVF) or a normal variant.',
        'Busca una onda delta (empastamiento inicial del QRS, QRS más ancho): preexcitación (patrón de WPW). Sin onda delta, considera un ritmo auricular bajo o de la unión (P negativa en II, III, aVF) o una variante normal.',
      ),
    },
    mobitz1: {
      kind: 'leaf',
      tone: 'major',
      findings: ['av-block-2-mobitz1'],
      title: l('二度 I 型房室传导阻滞（文氏型）', 'Second-degree AV block, Mobitz I (Wenckebach)', 'Bloqueo AV de segundo grado Mobitz I (Wenckebach)'),
      text: l(
        'PR 逐渐延长直至一个 P 波受阻，然后周期重新开始；心搏成组出现，长间歇前 R–R 逐渐缩短。阻滞通常位于房室结，多为良性（迷走张力高、下壁心梗、药物）。',
        'Progressive PR prolongation until one P is blocked, then the cycle restarts: grouped beating, with R–R intervals that shorten before the pause. The block is usually in the AV node and often benign (high vagal tone, inferior MI, drugs).',
        'Prolongación progresiva del PR hasta que una P se bloquea y el ciclo vuelve a empezar: latidos agrupados, con R–R que se acortan antes de la pausa. El bloqueo suele estar en el nodo AV y a menudo es benigno (tono vagal alto, infarto inferior, fármacos).',
      ),
    },
    mobitz2: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['av-block-2-mobitz2'],
      title: l('二度 II 型房室传导阻滞（莫氏 II 型）', 'Second-degree AV block, Mobitz II', 'Bloqueo AV de segundo grado Mobitz II'),
      text: l(
        'P 波突然不能下传，其前后 PR 固定。阻滞多位于房室结以下（希氏–浦肯野系统），常伴宽 QRS，可突然进展为完全性阻滞：一般需评估起搏器植入。',
        'A P wave suddenly fails to conduct, with a constant PR before and after. The block is usually below the AV node (His–Purkinje system), often with a wide QRS, and can progress abruptly to complete block: pacemaker evaluation is generally needed.',
        'Una P deja de conducirse de forma súbita, con PR constante antes y después. El bloqueo suele estar por debajo del nodo AV (sistema His-Purkinje), a menudo con QRS ancho, y puede progresar bruscamente a bloqueo completo: en general requiere valorar un marcapasos.',
      ),
    },
    twoToOne: {
      kind: 'leaf',
      tone: 'major',
      findings: ['av-block-2-2to1'],
      title: l('2:1 房室传导阻滞', '2:1 AV block', 'Bloqueo AV 2:1'),
      text: l(
        '两个受阻 P 波之间只有一个下传心搏，无法看出 PR 是否会延长：单凭这段记录不能区分 I 型与 II 型。线索：QRS 窄、PR 长或其他时段出现文氏周期支持房室结水平；QRS 宽、PR 正常支持结下阻滞。',
        'With a single conducted beat between blocked P waves you cannot see whether the PR would lengthen, so Mobitz I and II cannot be separated from this strip. Clues: a narrow QRS, a long PR or Wenckebach periods elsewhere favour the AV node; a wide QRS with a normal PR favours an infranodal block.',
        'Con un solo latido conducido entre P bloqueadas no se puede ver si el PR se alargaría: con esta tira no es posible distinguir Mobitz I de Mobitz II. Pistas: QRS estrecho, PR largo o periodos de Wenckebach en otro momento apuntan al nodo AV; QRS ancho con PR normal apunta a un bloqueo infranodal.',
      ),
    },
    highGrade: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['av-block-high-grade'],
      title: l('高度房室传导阻滞', 'High-grade (advanced) AV block', 'Bloqueo AV avanzado (de alto grado)'),
      text: l(
        '连续 ≥ 2 个 P 波受阻（3:1、4:1…），而部分 P 波仍以固定 PR 下传。与完全性阻滞不同，仍保留部分房室传导。进展风险高。',
        'Two or more consecutive P waves are blocked (3:1, 4:1…) while some still conduct with a constant PR. Unlike complete block, some AV conduction remains. High risk of progression.',
        'Dos o más ondas P consecutivas bloqueadas (3:1, 4:1…) mientras algunas aún se conducen con PR constante. A diferencia del bloqueo completo, persiste algo de conducción AV. Alto riesgo de progresión.',
      ),
    },
    blockedPac: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['pac-blocked'],
      title: l('未下传的房性期前收缩（不是房室阻滞）', 'Blocked premature atrial complex (not AV block)', 'Extrasístole auricular bloqueada (no es un bloqueo AV)'),
      text: l(
        '提前出现、形态常异常的 P 波（藏在 T 波中或使其变形）到达房室结时，房室结仍处于不应期。其后的长间歇是"不明原因间歇"最常见的原因——一定要检查前面的 T 波。',
        'An early, often odd-looking P wave (hidden in or deforming the T wave) reaches the AV node while it is still refractory. The pause that follows is the commonest cause of an unexplained pause — always inspect the preceding T wave.',
        'Una onda P precoz, a menudo de morfología extraña (oculta en la T o deformándola), llega al nodo AV cuando aún está en periodo refractario. La pausa que sigue es la causa más frecuente de una pausa inexplicada: revisa siempre la onda T previa.',
      ),
    },
    chbNarrow: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['av-block-3', 'junctional-escape-rhythm'],
      title: l('三度（完全性）房室传导阻滞伴交界性逸搏', 'Complete (third-degree) AV block with a junctional escape', 'Bloqueo AV completo (de tercer grado) con escape de la unión'),
      text: l(
        '没有一个 P 波下传：心房与心室各自独立搏动，心房率更快。40–60 次/分的窄 QRS 逸搏提示阻滞位于房室结水平（如下壁心梗、药物）。',
        'No P wave conducts: atria and ventricles beat independently, the atria faster. A narrow escape at 40–60 /min suggests block at the AV-node level (e.g. inferior MI, drugs).',
        'Ninguna P se conduce: aurículas y ventrículos laten de forma independiente, las aurículas más rápido. Un escape estrecho a 40–60 lpm sugiere bloqueo en el nodo AV (p. ej., infarto inferior, fármacos).',
      ),
    },
    chbWide: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['av-block-3', 'ventricular-escape-rhythm'],
      title: l('三度（完全性）房室传导阻滞伴室性逸搏', 'Complete (third-degree) AV block with a ventricular escape', 'Bloqueo AV completo (de tercer grado) con escape ventricular'),
      text: l(
        '没有一个 P 波下传，靠缓慢的宽 QRS 逸搏心律（20–40 次/分）维持心室激动：阻滞在结下，逸搏不可靠。需紧急评估起搏。',
        'No P wave conducts, and a slow, wide escape rhythm (20–40 /min) keeps the ventricles going: the block is infranodal and the escape is unreliable. Urgent pacing evaluation.',
        'Ninguna P se conduce y un ritmo de escape lento y ancho (20–40 lpm) mantiene los ventrículos: el bloqueo es infranodal y el escape no es fiable. Valoración urgente de estimulación.',
      ),
    },
    avDissoc: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['av-dissociation'],
      title: l('房室分离（不一定是房室阻滞）', 'AV dissociation (not necessarily AV block)', 'Disociación AV (no necesariamente bloqueo AV)'),
      text: l(
        '次级起搏点（加速性交界性或室性自主心律）的频率等于或快于窦房结，P 波不能下传是因为心室已被激动（生理性不应期）。房室分离是一种描述而非诊断：要说出造成它的节律。',
        'A subsidiary pacemaker (accelerated junctional or idioventricular rhythm) runs as fast as or faster than the sinus node, so P waves fail to conduct because the ventricles have just been activated (physiological refractoriness). AV dissociation is a description, not a diagnosis: name the rhythm that causes it.',
        'Un marcapasos subsidiario (ritmo de la unión o idioventricular acelerado) va igual o más rápido que el nodo sinusal, y las P no se conducen porque los ventrículos acaban de activarse (refractariedad fisiológica). La disociación AV es una descripción, no un diagnóstico: nombra el ritmo que la causa.',
      ),
    },
    afSlow: {
      kind: 'leaf',
      tone: 'major',
      findings: ['atrial-fibrillation'],
      title: l('心房颤动伴缓慢心室率', 'Atrial fibrillation with a slow ventricular response', 'Fibrilación auricular con respuesta ventricular lenta'),
      text: l(
        'R–R 绝对不规整、无 P 波。心室率慢提示房室结病变或药物作用（β 受体阻滞剂、钙通道阻滞剂、地高辛）。',
        'Irregularly irregular R–R without P waves. A slow response suggests AV-nodal disease or drugs (beta-blockers, calcium-channel blockers, digoxin).',
        'R–R irregularmente irregular sin ondas P. Una respuesta lenta sugiere enfermedad del nodo AV o fármacos (betabloqueantes, antagonistas del calcio, digoxina).',
      ),
    },
    afChb: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['atrial-fibrillation', 'av-block-3'],
      title: l('心房颤动伴完全性房室阻滞', 'Atrial fibrillation with complete AV block', 'Fibrilación auricular con bloqueo AV completo'),
      text: l(
        '房颤时出现规整缓慢的心室律，说明没有颤动冲动下传：心室由交界性或室性逸搏控制。要考虑地高辛中毒。',
        'A regular, slow ventricular rhythm in atrial fibrillation means no fibrillatory impulse gets through: the ventricles follow a junctional or ventricular escape. Consider digoxin toxicity.',
        'Un ritmo ventricular lento y regular en fibrilación auricular indica que no pasa ningún impulso: los ventrículos siguen un escape de la unión o ventricular. Considera la intoxicación digitálica.',
      ),
    },
    junctional: {
      kind: 'leaf',
      tone: 'major',
      findings: ['junctional-escape-rhythm'],
      title: l('交界性逸搏心律', 'Junctional escape rhythm', 'Ritmo de escape de la unión'),
      text: l(
        '规整的窄 QRS，40–60 次/分，无 P 波（或逆行 P 波紧邻 QRS 前后，在 II、III、aVF 倒置）。在窦房结失灵（窦性停搏或窦房阻滞）时接管心律。',
        'Regular narrow QRS at 40–60 /min with no P waves (or retrograde P waves just before or after the QRS, negative in II, III, aVF). It takes over when the sinus node fails (sinus arrest or SA block).',
        'QRS estrecho y regular a 40–60 lpm sin ondas P (o con P retrógradas justo antes o después del QRS, negativas en II, III, aVF). Toma el mando cuando falla el nodo sinusal (paro sinusal o bloqueo sinoauricular).',
      ),
    },
    ventEscape: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['ventricular-escape-rhythm'],
      title: l('室性逸搏（心室自主）心律', 'Ventricular escape (idioventricular) rhythm', 'Ritmo de escape ventricular (idioventricular)'),
      text: l(
        '规整的宽 QRS，20–40 次/分，无 P 波：窦房结和房室交界区均失灵或被阻滞。血流动力学不可靠；也要想到高钾血症。',
        'Regular wide QRS at 20–40 /min without P waves: both the sinus node and the AV junction have failed or are blocked. Haemodynamically unreliable; also think of hyperkalaemia.',
        'QRS ancho y regular a 20–40 lpm sin ondas P: han fallado (o están bloqueados) tanto el nodo sinusal como la unión AV. Hemodinámicamente poco fiable; piensa también en hiperpotasemia.',
      ),
    },
  },
};
