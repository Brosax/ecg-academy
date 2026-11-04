/**
 * r2 — Escape beats and rhythms, AV dissociation (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `intrinsic-rates`, `escape-site`, `av-dissociation`,
 * `escape-idioventricular`, `aivr`, `junctional-rhythm` (current values).
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
  id: 'r2',
  stage: 'R',
  order: 2,
  title: l('逸搏与逸搏心律、房室分离', 'Escape beats and rhythms, AV dissociation', 'Latidos y ritmos de escape, disociación auriculoventricular'),
  summary: l(
    '当窦房结失职或房室传导中断时，下位起搏点会接管：交界区约 40–60 次/分、窄 QRS，心室 20–40 次/分、宽 QRS。逸搏总是迟到的，它的形态还能提示阻滞部位。',
    'When the sinus node fails or AV conduction breaks, a lower pacemaker takes over: the junction at about 40-60/min with a narrow QRS, the ventricles at 20-40/min with a wide one. Escapes are always late, and their shape points to the level of the block.',
    'Cuando el nodo sinusal falla o se interrumpe la conducción AV, un marcapasos inferior toma el relevo: la unión a unos 40-60 lpm con QRS estrecho y los ventrículos a 20-40 lpm con QRS ancho. Los escapes siempre son tardíos y su morfología orienta sobre el nivel del bloqueo.',
  ),
  objectives: [
    l(
      '说出心脏起搏点的等级及其固有频率（窦房结 60–100、房室交界区 35–60、心室 20–40 次/分）。',
      'State the pacemaker hierarchy and its intrinsic rates (sinus node 60-100, AV junction 35-60, ventricles 20-40/min).',
      'Citar la jerarquía de marcapasos y sus frecuencias intrínsecas (nodo sinusal 60-100, unión AV 35-60, ventrículos 20-40 lpm).',
    ),
    l(
      '区分交界性逸搏（窄、通常 40–60）与室性逸搏（宽、20–40），并用逸搏 QRS 形态判断阻滞水平。',
      'Tell a junctional escape (narrow, usually 40-60) from a ventricular escape (wide, 20-40), and use the escape QRS to localise the block.',
      'Distinguir un escape de la unión (estrecho, habitualmente 40-60) de un escape ventricular (ancho, 20-40) y usar el QRS de escape para localizar el bloqueo.',
    ),
    l(
      '把房室分离当作一种描述而非诊断，列出三种机制并找到心室夺获。',
      'Treat AV dissociation as a description, not a diagnosis; list its three mechanisms and find the capture beats.',
      'Tratar la disociación AV como una descripción, no un diagnóstico; citar sus tres mecanismos y hallar los latidos de captura.',
    ),
    l(
      '识别加速性室性自主心律（AIVR），并知道它通常无需抗心律失常治疗。',
      'Recognise accelerated idioventricular rhythm (AIVR) and know that it usually needs no antiarrhythmic treatment.',
      'Reconocer el ritmo idioventricular acelerado (RIVA) y saber que normalmente no necesita tratamiento antiarrítmico.',
    ),
  ],
  minutes: 16,
  competencies: ['C3', 'C9'],
  findings: ['junctional-escape-rhythm', 'ventricular-escape-rhythm', 'av-dissociation', 'accelerated-junctional-rhythm', 'aivr'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('junctional-escape-rhythm', 421),
      view: STRIP,
      question: l(
        '这条节律条上找不到直立的 P 波，心率 46 次/分。这个节律危险吗？先想好你的判断再往下看。',
        'No upright P wave anywhere on this strip, and the rate is 46/min. Is this rhythm dangerous? Commit to an answer before reading on.',
        'No se ve ninguna onda P positiva en esta tira y la frecuencia es de 46 lpm. ¿Es peligroso este ritmo? Decide tu respuesta antes de continuar.',
      ),
      reveal: l(
        '每个 QRS **之前**紧贴着一个**倒置的 P′**（II 导联，P′R 约 105 ms），心率 46 次/分、QRS 窄、RR 规则：**交界性逸搏心律**。它不是原发性心律失常，而是一支救援起搏点——上面（窦房结或传导）出了问题，房室交界区按自己的固有频率接管了心室。要问的不是“怎么压制它”，而是“上面为什么不来”。',
        'Every QRS is immediately preceded by an **inverted P′** (lead II, P′R about 105 ms); the rate is 46/min, the QRS narrow, the RR regular: a **junctional escape rhythm**. This is not a primary arrhythmia but a rescue pacemaker — something above (the sinus node or conduction) has failed, and the AV junction drives the ventricles at its own intrinsic rate. The question is not "how do I suppress it" but "why is nothing coming down".',
        'Cada QRS va precedido de forma inmediata por una **P′ negativa** (derivación II, P′R de unos 105 ms); la frecuencia es de 46 lpm, el QRS estrecho y el RR regular: **ritmo de escape de la unión**. No es una arritmia primaria sino un marcapasos de rescate: algo por encima (el nodo sinusal o la conducción) ha fallado y la unión AV lleva los ventrículos a su frecuencia intrínseca. La pregunta no es «cómo lo suprimo», sino «por qué no baja nada».',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('av-block-3', 422),
      showConduction: true,
      emphasize: ['av-node', 'his'],
      caption: l(
        '窦房结（60–100）平时压住下位起搏点。这里它仍按 78 次/分放电，但每个冲动都停在房室结；交界区（35–60）以 45 次/分接管，QRS 窄。心室自身只有 20–40，QRS 宽。',
        'The sinus node (60-100) normally keeps the lower pacemakers quiet. Here it still fires at 78/min, but every impulse stops in the AV node; the junction (35-60) takes over at 45/min with a narrow QRS. The ventricles alone manage 20-40, with a wide QRS.',
        'El nodo sinusal (60-100) mantiene callados a los marcapasos inferiores. Aquí sigue disparando a 78 lpm, pero cada impulso se detiene en el nodo AV; la unión (35-60) toma el relevo a 45 lpm con QRS estrecho. Los ventrículos solos dan 20-40, con QRS ancho.',
      ),
    },
    {
      kind: 'film',
      title: l('逸搏：总是迟到，宽窄说出阻滞水平', 'Escapes: always late, and the width names the level', 'Escapes: siempre tardíos, y la anchura dice el nivel'),
      view: STRIP,
      frames: [
        {
          label: l('交界性逸搏', 'Junctional escape', 'Escape de la unión'),
          ecg: synth('sinus-pause', 429, undefined, 'escape'),
          note: l('窦房结停了。交界区等满自己的周期（约 1.43 秒）才放电：窄 QRS，前面没有 P。逸搏总是迟到。', 'The sinus node stops. The junction waits out its own cycle (about 1.43 s) before firing: a narrow QRS with no P before it. Escapes are always late.', 'El nodo sinusal se detiene. La unión espera su propio ciclo (unos 1,43 s) antes de disparar: QRS estrecho sin P delante. Los escapes siempre llegan tarde.'),
          marks: [{ auto: 'rr', beat: 4 }],
        },
        {
          label: l('阻滞在房室结', 'Block in the AV node', 'Bloqueo en el nodo AV'),
          ecg: synth('av-block-3', 422),
          note: l('P 以 78 次/分规律穿行，一个也不下传。逸搏 45 次/分、QRS 窄：起搏点在束支分叉之上。', 'P waves march at 78/min and none conducts. The escape runs at 45/min with a narrow QRS: the pacemaker sits above the bundle-branch fork.', 'Las P desfilan a 78 lpm y ninguna conduce. El escape va a 45 lpm con QRS estrecho: el marcapasos está por encima de la bifurcación del haz.'),
          marks: [{ auto: 'blocked-p' }, { auto: 'qrs' }],
        },
        {
          label: l('阻滞在希氏束下', 'Block below the His', 'Bloqueo infrahisiano'),
          ecg: synth('av-block-3', 423, undefined, 'infra-his'),
          note: l('P 仍是 78 次/分、全部被阻断，但逸搏只有 34 次/分、QRS 宽：起搏点在心室，更慢、更不可靠。', 'The P waves still run at 78/min, all blocked, but the escape manages only 34/min with a wide QRS: a ventricular pacemaker, slower and less reliable.', 'Las P siguen a 78 lpm, todas bloqueadas, pero el escape solo da 34 lpm con QRS ancho: un marcapasos ventricular, más lento y menos fiable.'),
          marks: [{ auto: 'blocked-p' }, { auto: 'qrs' }],
        },
      ],
      predict: {
        question: l('阻滞从房室结移到希氏束以下，逸搏会怎样？', 'If the block moves from the AV node to below the His bundle, what happens to the escape?', 'Si el bloqueo pasa del nodo AV a debajo del haz de His, ¿qué le ocurre al escape?'),
        options: [l('更快、更窄', 'Faster and narrower', 'Más rápido y más estrecho'), l('更慢、更宽', 'Slower and wider', 'Más lento y más ancho'), l('频率和宽度都不变', 'Same rate, same width', 'Igual frecuencia e igual anchura')],
        answer: 1,
      },
      caption: l(
        '逸搏是迟到的救援：窄 → 起搏点在房室结/希氏束；宽而慢 → 在希氏束以下。永远不要抑制它。',
        'An escape is a late rescue: narrow → the pacemaker is in the AV node or His; wide and slow → below the His. Never suppress it.',
        'Un escape es un rescate tardío: estrecho → el marcapasos está en el nodo AV o el His; ancho y lento → por debajo del His. Nunca lo suprimas.',
      ),
    },
    {
      kind: 'criteria',
      title: l('固有频率、逸搏形态与处理原则', 'Intrinsic rates, escape shape and management', 'Frecuencias intrínsecas, morfología del escape y manejo'),
      items: [
        {
          label: l('起搏点等级（固有频率）', 'Pacemaker hierarchy (intrinsic rates)', 'Jerarquía de marcapasos (frecuencias intrínsecas)'),
          value: l(
            '窦房结 60–100 次/分；房室交界区 35–60；心室 20–40',
            'Sinus node 60-100/min; AV junction 35-60; ventricles 20-40',
            'Nodo sinusal 60-100 lpm; unión AV 35-60; ventrículos 20-40',
          ),
        },
        {
          label: l('交界性逸搏心律', 'Junctional escape rhythm', 'Ritmo de escape de la unión'),
          value: l(
            '通常 40–60 次/分，窄 QRS；逆行 P′（II、III、aVF 倒置）可在 QRS 前（P′R < 120 ms）、埋于 QRS 中或紧随 QRS 之后；也可表现为房室分离',
            'Usually 40-60/min, narrow QRS; a retrograde P′ (negative in II, III, aVF) before the QRS (P′R < 120 ms), hidden in it, or just after it; or AV dissociation',
            'Habitualmente 40-60 lpm, QRS estrecho; P′ retrógrada (negativa en II, III y aVF) antes del QRS (P′R < 120 ms), oculta en él o justo después; o disociación AV',
          ),
        },
        {
          label: l('室性逸搏（自主心律）', 'Ventricular escape (idioventricular rhythm)', 'Escape ventricular (ritmo idioventricular)'),
          value: l(
            '长间歇后迟发的宽 QRS，其前无下传的 P 波；20–40 次/分',
            'A late wide QRS after a long pause, with no conducted P before it; 20-40/min',
            'QRS ancho y tardío tras una pausa larga, sin P conducida previa; 20-40 lpm',
          ),
        },
        {
          label: l('逸搏形态定位阻滞水平', 'Escape shape localises the block', 'La morfología del escape localiza el bloqueo'),
          value: l(
            '窄 QRS 约 40–60 → 阻滞在房室结或希氏束；宽 QRS 约 20–40 → 希氏束下（成人获得性完全性阻滞最常见的部位）；左室起源呈右束支阻滞形，右室起源呈左束支阻滞形',
            'Narrow QRS at about 40-60 → block in the AV node or His bundle; wide QRS at about 20-40 → infra-His (the commonest site in acquired adult complete block); an LV focus looks like RBBB, an RV focus like LBBB',
            'QRS estrecho a unos 40-60 → bloqueo en el nodo AV o el haz de His; QRS ancho a unos 20-40 → infrahisiano (la localización más frecuente en el bloqueo completo adquirido del adulto); un foco del VI da morfología de BRD y uno del VD de BRI',
          ),
        },
        {
          label: l('AIVR（加速性室性自主心律）', 'AIVR (accelerated idioventricular rhythm)', 'RIVA (ritmo idioventricular acelerado)'),
          value: l(
            '≥ 3 个连续室性搏动，约 50–110 次/分（定义不一，40–120），与窦性心律竞争，常有融合波与夺获；再灌注后常见，多呈良性、自行终止',
            '≥ 3 consecutive ventricular beats at about 50-110/min (definitions vary, 40-120) competing with sinus rhythm, often with fusion and capture beats; common after reperfusion, usually benign and self-limited',
            '≥ 3 latidos ventriculares consecutivos a unos 50-110 lpm (las definiciones varían, 40-120) que compiten con el ritmo sinusal, a menudo con latidos de fusión y captura; frecuente tras la reperfusión, habitualmente benigno y autolimitado',
          ),
        },
        {
          label: l('处理原则', 'Management rule', 'Regla de manejo'),
          value: l(
            '永远不要抑制逸搏：治疗病因，有症状的心动过缓行起搏治疗；AIVR 无需抗心律失常药',
            'Never suppress an escape: treat the cause and pace symptomatic bradycardia; AIVR needs no antiarrhythmic',
            'Nunca suprimas un escape: trata la causa y estimula la bradicardia sintomática; el RIVA no necesita antiarrítmicos',
          ),
        },
        {
          label: l('房室分离', 'AV dissociation', 'Disociación AV'),
          value: l(
            '心房与心室各自独立活动；是描述，不是诊断。无阻滞时室率 ≥ 房率，有阻滞时房率更快',
            'Atria and ventricles beat independently; a description, not a diagnosis. Without block the ventricular rate equals or exceeds the atrial rate; with block the atria are faster',
            'Aurículas y ventrículos laten de forma independiente; una descripción, no un diagnóstico. Sin bloqueo, la frecuencia ventricular iguala o supera a la auricular; con bloqueo, las aurículas van más rápido',
          ),
        },
        {
          label: l('房室分离的三种机制', 'The three mechanisms of AV dissociation', 'Los tres mecanismos de la disociación AV'),
          value: l(
            '默认：窦房结减慢或停搏，逸搏接管；抢位：下位起搏点加速超过窦性（加速性交界性心律、AIVR、室速）；阻滞：二度或三度房室阻滞',
            'Default: the sinus node slows or stops and an escape takes over; usurpation: a lower pacemaker speeds past the sinus rate (accelerated junctional rhythm, AIVR, VT); block: second- or third-degree AV block',
            'Por defecto: el nodo sinusal se frena o se detiene y un escape toma el relevo; por usurpación: un marcapasos inferior supera al sinusal (ritmo de la unión acelerado, RIVA, TV); por bloqueo: bloqueo AV de segundo o tercer grado',
          ),
        },
        {
          label: l('夺获与融合波', 'Captures and fusion beats', 'Capturas y latidos de fusión'),
          value: l(
            '夺获：一个 P 恰好下传，QRS 提前（与室性心律竞争时更窄）；融合：两个起搏点同时除极心室，形态居中。分型：完全性、不完全性（有夺获）、等频性',
            'Capture: a P gets through and the QRS comes early (narrower when it competes with a ventricular rhythm); fusion: both pacemakers depolarise the ventricles together, giving an intermediate shape. Types: complete, incomplete (with captures), isorhythmic',
            'Captura: una P pasa y el QRS llega precoz (más estrecho si compite con un ritmo ventricular); fusión: ambos marcapasos despolarizan los ventrículos a la vez y dan una morfología intermedia. Tipos: completa, incompleta (con capturas), isorrítmica',
          ),
        },
      ],
      source:
        'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482; Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307; Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    },
    {
      kind: 'worked',
      title: l('读懂分离：让 P 波穿行', 'Reading dissociation: let the P waves march through', 'Leer la disociación: deja que las ondas P desfilen'),
      ecg: synth('av-dissociation', 425),
      view: STRIP,
      steps: [
        {
          title: l('先量室率', 'Measure the ventricular rate first', 'Mide primero la frecuencia ventricular'),
          body: l(
            '窄 QRS 以规则的 RR 前进（约 66 次/分），只被两个提前出现的 QRS 打断：这是一个规则的交界区起搏点，不是心房颤动。那两个提前的搏动留到第 3 步解释。',
            'The narrow QRS complexes march at a regular RR (about 66/min), interrupted only by two early beats: a regular junctional pacemaker, not atrial fibrillation. Step 3 explains the two early beats.',
            'Los QRS estrechos avanzan con un RR regular (unos 66 lpm), interrumpido solo por dos latidos precoces: un marcapasos de la unión regular, no una fibrilación auricular. El paso 3 explica esos dos latidos precoces.',
          ),
          marks: [{ auto: 'rr', beat: 6 }],
        },
        {
          title: l('找 P 波并测 PP', 'Find the P waves and march the PP', 'Busca las ondas P y recorre el PP'),
          body: l(
            '用分规沿整条搜索 P 波：它们也在规则地放电（60 次/分），但 PR 毫无规律——P 有时落在 QRS 前、有时埋在里面、有时骑在 T 波上。两套时钟各走各的。',
            'Sweep the strip with calipers for P waves: they fire regularly too (60/min), but the PR is random — a P sometimes precedes the QRS, sometimes hides in it, sometimes lands on the T wave. Two clocks running independently.',
            'Recorre la tira con el compás buscando ondas P: también se disparan de forma regular (60 lpm), pero el PR no sigue ningún patrón: la P a veces precede al QRS, a veces se oculta en él y a veces cae sobre la onda T. Dos relojes que marchan por su cuenta.',
          ),
          marks: [{ auto: 'blocked-p', label: l('P', 'P', 'P') }, { auto: 'p', beat: 5 }, { auto: 'p', beat: 10 }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('抓一个心室夺获', 'Catch a ventricular capture', 'Caza una captura ventricular'),
          body: l(
            '某个 QRS 会**提前**出现（形态与其余相同，因为交界性搏动本来就是窄的；只有与室性心律竞争时，夺获才会“变窄”）、前面紧贴一个能下传的 P（PR 正常）：窦性激动恰好找到房室结与心室都可兴奋的空档——**心室夺获**。有夺获＝“不完全性”分离，也证明房室传导并未完全中断。',
            'One QRS appears **early** (with the same shape as the rest — junctional beats are already narrow; a capture looks narrower only when it competes with a ventricular rhythm), with a conducting P just before it (a normal PR): a sinus impulse happened to find both the node and the ventricles excitable — a **ventricular capture**. A capture means the dissociation is "incomplete", and it proves conduction is not fully interrupted.',
            'Un QRS aparece **precoz** (con la misma morfología que los demás, porque los latidos de la unión ya son estrechos; la captura solo parece más estrecha cuando compite con un ritmo ventricular), con una P que conduce justo antes (PR normal): un impulso sinusal encontró excitables a la vez el nodo y los ventrículos: **captura ventricular**. Que haya capturas significa que la disociación es «incompleta» y demuestra que la conducción no está totalmente interrumpida.',
          ),
          marks: [{ auto: 'qrs', beat: 5 }],
        },
        {
          title: l('下机制结论', 'Name the mechanism', 'Ponle nombre al mecanismo'),
          body: l(
            '窦性 60、交界区 66：下位起搏点比窦房结略快——“抢位”机制，等频性分离伴夺获。报告要写机制，而不是只写“房室分离”四个字。',
            'Sinus 60, junction 66: the subsidiary pacemaker runs slightly faster than the sinus node — usurpation, isorhythmic dissociation with captures. Report the mechanism, not just the words "AV dissociation".',
            'Sinusal 60, unión 66: el marcapasos subsidiario va ligeramente más rápido que el sinusal: mecanismo por usurpación, disociación isorrítmica con capturas. Informa del mecanismo, no solo de la frase «disociación AV».',
          ),
        },
      ],
    },
    {
      kind: 'film',
      title: l('房室分离：说出机制', 'AV dissociation: name the mechanism', 'Disociación AV: nombra el mecanismo'),
      view: STRIP,
      frames: [
        {
          label: l('交界区抢位', 'Junction usurps', 'Usurpa la unión'),
          ecg: synth('accelerated-junctional-rhythm', 424, undefined, 'isorhythmic'),
          note: l('窦性约 70、交界区约 76：下位起搏点跑赢窦房结（抢位）。P 在 QRS 旁漂移，偶尔下传一个。', 'Sinus about 70, junction about 76: the lower pacemaker outruns the sinus node (usurpation). The P drifts around the QRS; now and then one conducts.', 'Sinusal unos 70, unión unos 76: el marcapasos inferior adelanta al sinusal (usurpación). La P se desliza junto al QRS y alguna conduce.'),
          marks: [{ auto: 'p', beat: 7 }, { auto: 'qrs', beat: 7 }],
        },
        {
          label: l('心室抢位（AIVR）', 'Ventricle usurps (AIVR)', 'Usurpa el ventrículo (RIVA)'),
          ecg: synth('aivr', 426),
          note: l('宽 QRS 约 76 次/分，略快于窦性 72：AIVR。找夺获（窄、提前）和融合波（宽度居中）。', 'Wide QRS at about 76/min, just faster than sinus at 72: AIVR. Find the capture (narrow, early) and the fusion beat (in-between width).', 'QRS ancho a unos 76 lpm, algo más rápido que el sinusal de 72: RIVA. Busca la captura (estrecha, precoz) y la fusión (anchura intermedia).'),
          marks: [{ auto: 'qrs', beat: 4, label: l('室性 QRS', 'Ventricular QRS', 'QRS ventricular') }],
        },
        {
          label: l('阻滞', 'Block', 'Bloqueo'),
          ecg: synth('av-block-3', 422),
          note: l('这次心房更快（78 对 45）：P 过不了房室结。阻滞型分离房率 > 室率；抢位时室率 ≥ 房率。', 'This time the atria are faster (78 vs 45): the P waves cannot cross the AV node. With block the atrial rate is higher; with usurpation the ventricles match or beat it.', 'Esta vez las aurículas van más rápido (78 frente a 45): las P no cruzan el nodo AV. Con bloqueo la frecuencia auricular es mayor; con usurpación los ventrículos la igualan o la superan.'),
          marks: [{ auto: 'blocked-p' }],
        },
      ],
      predict: {
        question: l('心房 78 次/分、心室 45 次/分，P 与 QRS 无关。是哪种机制？', 'Atria at 78/min, ventricles at 45/min, P waves unrelated to the QRS. Which mechanism?', 'Aurículas a 78 lpm, ventrículos a 45 lpm, P sin relación con el QRS. ¿Qué mecanismo?'),
        options: [l('默认（窦房结变慢）', 'Default (the sinus node slows)', 'Por defecto (el sinusal se frena)'), l('抢位（下位起搏点加速）', 'Usurpation (a lower pacemaker speeds up)', 'Usurpación (un marcapasos inferior se acelera)'), l('阻滞', 'Block', 'Bloqueo')],
        answer: 2,
      },
      caption: l(
        '“房室分离”只是描述。比较房率和室率，再写出机制：默认、抢位还是阻滞。加速性交界性心律见于地高辛中毒和心脏术后。',
        '"AV dissociation" is only a description. Compare the atrial and ventricular rates, then write the mechanism: default, usurpation or block. An accelerated junctional rhythm is seen in digoxin toxicity and after cardiac surgery.',
        '«Disociación AV» es solo una descripción. Compara las frecuencias auricular y ventricular y escribe el mecanismo: por defecto, usurpación o bloqueo. El ritmo de la unión acelerado se ve en la intoxicación digitálica y tras cirugía cardíaca.',
      ),
    },
    {
      kind: 'contrast',
      title: l('窄还是宽？交界性与室性逸搏', 'Narrow or wide? Junctional vs ventricular escape', '¿Estrecho o ancho? Escape de la unión frente a ventricular'),
      view: STRIP,
      left: {
        ecg: synth('junctional-escape-rhythm', 427),
        caption: l('交界性：约 46 次/分，窄 QRS', 'Junctional: about 46/min, narrow QRS', 'De la unión: unos 46 lpm, QRS estrecho'),
        marks: [{ auto: 'qrs', label: l('窄 QRS', 'Narrow QRS', 'QRS estrecho') }],
      },
      right: {
        ecg: synth('ventricular-escape-rhythm', 428),
        caption: l('室性：约 32 次/分，宽 QRS', 'Ventricular: about 32/min, wide QRS', 'Ventricular: unos 32 lpm, QRS ancho'),
        marks: [{ auto: 'qrs', label: l('宽 QRS', 'Wide QRS', 'QRS ancho') }],
      },
      point: l(
        '两边都没有下传的 P，都是“迟到”的逸搏。差别在频率与宽度：左图 46 次/分、窄 → 起搏点在束支分叉之上（房室结/希氏束），血流动力学通常尚可耐受；右图 32 次/分、宽 → 起搏点在心室内（希氏束下），更慢、更不可靠，起搏的适应证更强。**逸搏的宽度就是阻滞水平的标志。**',
        'Neither side has a conducted P; both are "late" escapes. The difference is rate and width: left 46/min and narrow → the pacemaker sits above the bundle-branch fork (AV node/His), usually haemodynamically tolerable; right 32/min and wide → the pacemaker is inside a ventricle (infra-His), slower and less reliable, a stronger case for pacing. **The width of the escape flags the level of the block.**',
        'En ninguno de los dos hay una P conducida; ambos son escapes «tardíos». La diferencia está en la frecuencia y la anchura: a la izquierda 46 lpm y estrecho → el marcapasos está por encima de la bifurcación del haz (nodo AV/His), habitualmente bien tolerado; a la derecha 32 lpm y ancho → el marcapasos está dentro de un ventrículo (infrahisiano), más lento y menos fiable, con mayor indicación de marcapasos. **La anchura del escape marca el nivel del bloqueo.**',
      ),
    },
    { kind: 'check', item: { family: 'brady', seed: 7 } },
    { kind: 'check', item: { family: 'p-qrs', seed: 5 } },
    { kind: 'drill', families: ['brady', 'p-qrs'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [4827, 16151, 959],
      caption: l(
        '三份都是完全性房室传导阻滞的真实心电图（PTB-XL）。先自己找穿行的 P 波、量逸搏频率与 QRS 宽度、判断阻滞水平，**先想好结论再揭晓**。',
        'Three real ECGs (PTB-XL), all complete AV block. Find the marching P waves, measure the escape rate and QRS width, and judge the level of the block — **commit to a conclusion before you reveal**.',
        'Tres ECG reales (PTB-XL), los tres con bloqueo AV completo. Busca las ondas P que desfilan, mide la frecuencia y la anchura del QRS de escape y valora el nivel del bloqueo: **decide tu conclusión antes de mirar la solución**.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把逸搏叫成室性期前收缩：逸搏**迟发**（长间歇之后），期前收缩**提前**——先问“早还是晚”。',
          'Calling an escape a PVC: escapes are **late** (after a long pause), premature beats are **early** — ask "early or late?" first.',
          'Llamar escape a una extrasístole ventricular: los escapes son **tardíos** (tras una pausa larga) y las extrasístoles **precoces**: pregunta primero «¿precoz o tardío?».',
        ),
        l(
          '把 AIVR 当室速治疗：约 50–110 次/分、与窦性竞争、有融合与夺获——观察即可；抗心律失常药可能打掉患者仅剩的起搏点。',
          'Treating AIVR as VT: about 50-110/min, competing with sinus, with fusion and captures — simply watch it; an antiarrhythmic may knock out the only pacemaker the patient has left.',
          'Tratar el RIVA como una TV: unos 50-110 lpm, compitiendo con el sinusal, con fusión y capturas: obsérvalo; un antiarrítmico puede eliminar el único marcapasos que le queda al paciente.',
        ),
        l(
          '把等频性房室分离读成“窦性心律”：P 就在 QRS 附近缓缓漂移，用分规测 PP 才不会漏。',
          'Reading isorhythmic dissociation as "sinus rhythm": the P drifts slowly around the QRS; march the PP with calipers and you will not miss it.',
          'Leer la disociación isorrítmica como «ritmo sinusal»: la P se desliza lentamente alrededor del QRS; recorre el PP con el compás y no se te escapará.',
        ),
        l(
          '忘了逸搏形态能定位阻滞水平：窄 → 房室结/希氏束，宽 → 希氏束下。',
          'Forgetting that the escape shape localises the block: narrow → AV node/His bundle, wide → infra-His.',
          'Olvidar que la morfología del escape localiza el bloqueo: estrecho → nodo AV/haz de His, ancho → infrahisiano.',
        ),
        l(
          '因为逸搏心律“规则、看起来稳定”而漏诊完全性房室阻滞：规则的是逸搏，不是房室传导——必须先找 P 波。',
          'Missing complete AV block because the escape is regular and "looks stable": it is the escape that is regular, not AV conduction — hunt for the P waves first.',
          'No diagnosticar un bloqueo AV completo porque el escape es regular y «parece estable»: lo regular es el escape, no la conducción AV: busca primero las ondas P.',
        ),
        l(
          '把再灌注后的 AIVR 当成再灌注失败：它不说明血管没开通，判断再灌注看 ST 段回落。',
          'Reading AIVR after reperfusion as a sign of failure: it does not mean reperfusion failed; judge reperfusion by ST resolution.',
          'Interpretar el RIVA tras la reperfusión como signo de fracaso: no significa que la reperfusión haya fracasado; la reperfusión se valora por la resolución del ST.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '逸搏 = 长间歇后下位起搏点的被动接管：交界区 35–60（通常 40–60）且窄，心室 20–40 且宽。',
          'An escape is a lower pacemaker taking over passively after a long pause: junction 35-60 (usually 40-60) and narrow, ventricle 20-40 and wide.',
          'Un escape es un marcapasos inferior que toma el relevo de forma pasiva tras una pausa larga: unión 35-60 (habitualmente 40-60) y estrecho, ventrículo 20-40 y ancho.',
        ),
        l(
          '逸搏 QRS 的宽度定位阻滞：窄 → 房室结/希氏束；宽 → 希氏束下（左室灶呈右束支阻滞形，右室灶呈左束支阻滞形）。',
          'The width of the escape QRS localises the block: narrow → AV node/His bundle; wide → infra-His (an LV focus is RBBB-shaped, an RV focus LBBB-shaped).',
          'La anchura del QRS de escape localiza el bloqueo: estrecho → nodo AV/haz de His; ancho → infrahisiano (un foco del VI tiene morfología de BRD y uno del VD de BRI).',
        ),
        l(
          '房室分离是描述不是诊断：默认、抢位或阻滞三选一并写进报告；找穿行的 P 波与夺获。',
          'AV dissociation is a description, not a diagnosis: choose default, usurpation or block and say so in the report; look for marching P waves and captures.',
          'La disociación AV es una descripción, no un diagnóstico: elige defecto, usurpación o bloqueo y dilo en el informe; busca ondas P que desfilan y capturas.',
        ),
        l(
          '永远不要抑制逸搏：治疗病因，有症状就起搏；AIVR 良性自限，无需抗心律失常药。',
          'Never suppress an escape: treat the cause and pace if symptomatic; AIVR is benign and self-limited and needs no antiarrhythmic.',
          'Nunca suprimas un escape: trata la causa y estimula si hay síntomas; el RIVA es benigno, autolimitado y no necesita antiarrítmicos.',
        ),
      ],
    },
  ],
  sources: [
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307',
    'Castellano et al. 2004',
  ],
};

export default lesson;
