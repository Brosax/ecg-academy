/**
 * t1 — Regular narrow-QRS tachycardia: sinus, AVNRT, AVRT, focal AT, 2:1 flutter (docs/PLAN.md §3, stage T).
 * Criteria: docs/curriculum/criteria.md `svt-definition`, `avnrt`, `atrial-tachycardia`, `flutter-criteria` (current
 * values) and the missing-book bullets: narrow-QRS tachycardia RP/PR algorithm, orthodromic AVRT criteria, vagal
 * manoeuvres / adenosine diagnostic response, flutter with 2:1 conduction.
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
const STRIP_V1 = { layout: 'strip', lead: 'V1' } as const;

const lesson: Lesson = {
  id: 't1',
  stage: 'T',
  order: 1,
  title: l(
    '规则的窄 QRS 心动过速（窦性、AVNRT、AVRT、局灶性房速、2:1 心房扑动）',
    'Regular narrow-QRS tachycardia (sinus, AVNRT, AVRT, focal AT, 2:1 flutter)',
    'Taquicardia regular de QRS estrecho (sinusal, TRIN, TRAV, taquicardia auricular focal, flutter 2:1)',
  ),
  summary: l(
    '一条规则的窄 QRS 心动过速不是诊断，而是一道分类题：先在 II、III、aVF、V1 找心房活动，再问 P′ 落在 QRS 之前、之中还是之后——RP/PR 算法把 AVNRT、AVRT、房速、2:1 房扑和窦速分开，迷走手法与腺苷既是治疗也是诊断试验。',
    'A regular narrow-QRS tachycardia is a classification problem, not a diagnosis: find the atrial activity in II, III, aVF and V1 first, then ask where the P′ sits — before, inside or after the QRS. The RP/PR algorithm separates AVNRT, AVRT, focal AT, 2:1 flutter and sinus tachycardia, and vagal manoeuvres and adenosine are treatment and diagnostic test at once.',
    'Una taquicardia regular de QRS estrecho es un problema de clasificación, no un diagnóstico: busca primero la actividad auricular en II, III, aVF y V1 y pregúntate dónde está la P′ (antes, dentro o después del QRS). El algoritmo RP/PR separa la TRIN, la TRAV, la taquicardia auricular focal, el flutter 2:1 y la taquicardia sinusal, y las maniobras vagales y la adenosina son a la vez tratamiento y prueba diagnóstica.',
  ),
  objectives: [
    l(
      '说出 SVT 的现行定义（机制涉及希氏束或以上组织；包括房扑与多源性房速，不包括房颤；AVRT 虽用及心室仍属 SVT）。',
      'State the current definition of SVT (a mechanism involving the His bundle or above; flutter and MAT included, AF excluded; AVRT is SVT although its circuit uses ventricular tissue).',
      'Enunciar la definición vigente de TSV (mecanismo que implica al His o por encima; incluye el flutter y la TAM, excluye la FA; la TRAV es una TSV aunque su circuito use el ventrículo).',
    ),
    l(
      '对任何规则的窄 QRS 心动过速走一遍 RP/PR 算法：找 P′，判断它相对 QRS 的位置。',
      'Run the RP/PR algorithm on any regular narrow-QRS tachycardia: find the P′ and decide where it sits relative to the QRS.',
      'Aplicar el algoritmo RP/PR a cualquier taquicardia regular de QRS estrecho: busca la P′ y decide dónde se sitúa respecto al QRS.',
    ),
    l(
      '识别典型 AVNRT（P′ 隐没或成 V1 假性 r′、II/III/aVF 假性 S）与顺向型 AVRT（P′ 在 ST 段内，RP < PR 且约 ≥ 90 ms）。',
      'Recognise typical AVNRT (P′ hidden, or pseudo-r′ in V1 and pseudo-S in II/III/aVF) and orthodromic AVRT (P′ in the ST segment, RP < PR and about >=90 ms).',
      'Reconocer la TRIN típica (P′ oculta o pseudo-r′ en V1 y pseudo-S en II/III/aVF) y la TRAV ortodrómica (P′ en el segmento ST, RP < PR y unos >=90 ms).',
    ),
    l(
      '解读迷走手法与腺苷的诊断性反应，并坚持在用药时同步记录 12 导联心电图。',
      'Interpret the diagnostic responses to vagal manoeuvres and adenosine, and insist on a running 12-lead ECG while the drug is given.',
      'Interpretar las respuestas diagnósticas a las maniobras vagales y la adenosina, y exigir un ECG de 12 derivaciones grabando mientras se administra el fármaco.',
    ),
  ],
  minutes: 16,
  competencies: ['C9', 'C3'],
  findings: ['sinus-tachycardia', 'avnrt', 'avrt', 'atrial-tachycardia', 'atrial-flutter'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('avnrt', 601),
      view: STRIP,
      question: l(
        '34 岁女性，20 分钟前突发心悸，“像敲鼓一样”，无胸痛、无晕厥。这条 II 导联节律条：节律是什么？你第一步做什么？先想好你的判断。',
        'A 34-year-old woman: palpitations that started suddenly 20 minutes ago, "like a drum", no chest pain, no syncope. This lead II strip: what is the rhythm, and what is your first step? Commit to an answer.',
        'Mujer de 34 años: palpitaciones que empezaron de forma brusca hace 20 minutos, "como un tambor", sin dolor torácico ni síncope. En esta tira de derivación II: ¿qué ritmo es y cuál es tu primera actuación? Decide una respuesta antes de continuar.',
      ),
      reveal: l(
        '约 **176 次/分、规则、QRS 窄**，看不到明确的 P 波。一条规则的窄 QRS 心动过速本身几乎不会立即危及生命——但它背后有好几种机制，处理和根治各不相同，而**体表心电图常常能直接给出答案**。第一步：确认血流动力学稳定、记录 12 导联，然后一边想一边做**迷走神经刺激法**（改良 Valsalva，心电图一直在记录）——本课教你如何系统地分类。',
        'About **176/min, regular, narrow QRS**, with no clear P waves. A regular narrow-QRS tachycardia is almost never immediately dangerous in itself — but it has several mechanisms with different treatments and cures, and the **surface ECG can often settle it directly**. First step: confirm she is haemodynamically stable, record a 12-lead, then start **vagal manoeuvres** (modified Valsalva) while you think, with the ECG running — this lesson teaches you to classify it systematically.',
        'Unos **176 lpm, regular, QRS estrecho**, sin ondas P claras. Una taquicardia regular de QRS estrecho casi nunca es peligrosa por sí misma, pero tiene varios mecanismos con tratamientos y curas distintas, y el **ECG de superficie a menudo decide la cuestión**. Primer paso: comprueba que está estable hemodinámicamente, registra un ECG de 12 derivaciones e inicia las **maniobras vagales** (Valsalva modificada) mientras piensas, con el ECG grabando; esta lección te enseña a clasificarla de forma sistemática.',
      ),
    },
    {
      kind: 'film',
      title: l('P′ 在哪里？', 'Where is the P′?', '¿Dónde está la P′?'),
      view: STRIP,
      frames: [
        {
          label: l('窦速', 'Sinus', 'Sinusal'),
          ecg: synth('sinus-tachycardia', 611, { rate: 120 }),
          note: l(
            '直立的 P 在每个 QRS **之前**，PR 约 150 ms，RP 比 PR 长：长 RP。窦性形态 ⇒ 窦性心动过速。',
            'An upright P **before** each QRS, PR about 150 ms, RP longer than PR: long RP. Sinus shape → sinus tachycardia.',
            'Una P positiva **antes** de cada QRS, PR de unos 150 ms y RP más largo que el PR: RP largo. Morfología sinusal → taquicardia sinusal.',
          ),
          marks: [{ auto: 'p' }, { auto: 'pr' }],
        },
        {
          label: l('房室结折返', 'AVNRT', 'TRIN'),
          ecg: synth('avnrt', 603),
          note: l(
            'QRS 前没有 P′。环路在房室结内，心房与心室同时激动：P′ 只在 QRS 终末留下一个**假性 S** ⇒ 典型 AVNRT。',
            'No P′ before the QRS. The circuit is inside the AV node and fires atria and ventricles together: the P′ leaves only a **pseudo-S** at the QRS end → typical AVNRT.',
            'No hay P′ antes del QRS. El circuito está dentro del nodo AV y activa aurículas y ventrículos a la vez: la P′ solo deja un **pseudo-S** al final del QRS → TRIN típica.',
          ),
          marks: [{ auto: 'p', label: l('P′（假性 S）', 'P′ (pseudo-S)', 'P′ (pseudo-S)') }],
        },
        {
          label: l('房室折返', 'AVRT', 'TRAV'),
          ecg: synth('avrt', 604),
          note: l(
            'P′ 与 QRS 分开，骑在 **ST 段**上：RP 约 115 ms，比 P′R 短 ⇒ 顺向型 AVRT。',
            'The P′ is separate from the QRS, riding on the **ST segment**: RP about 115 ms, shorter than the P′R → orthodromic AVRT.',
            'La P′ está separada del QRS, sobre el **segmento ST**: RP de unos 115 ms, más corto que el P′R → TRAV ortodrómica.',
          ),
          marks: [{ auto: 'p', label: l('P′', 'P′', 'P′') }],
        },
        {
          label: l('房速 2:1', 'AT 2:1', 'TA 2:1'),
          ecg: synth('atrial-tachycardia', 606, undefined, 'block'),
          note: l(
            '**P′ 比 QRS 多**：180 对 90 次/分，一个在 QRS 前，另一个藏在前一搏的 ST–T 上 ⇒ 房速或房扑，不依赖房室结。',
            '**More P′ than QRS**: 180 vs 90/min, one before each QRS and one hidden on the ST–T of the beat before → AT or flutter, independent of the AV node.',
            '**Más P′ que QRS**: 180 frente a 90 lpm, una antes de cada QRS y otra escondida en el ST-T del latido previo → TA o flutter, independiente del nodo AV.',
          ),
          marks: [{ auto: 'p', label: l('P′（下传）', 'P′ (conducted)', 'P′ (conducida)') }, { auto: 'blocked-p' }],
        },
      ],
      predict: {
        question: l(
          'AVNRT 的环路在房室结内，心房和心室几乎同时激动。它的 P′ 会在哪里？',
          'In AVNRT the circuit lies inside the AV node, so atria and ventricles are activated almost together. Where will its P′ be?',
          'En la TRIN el circuito está dentro del nodo AV, así que aurículas y ventrículos se activan casi a la vez. ¿Dónde estará su P′?',
        ),
        options: [
          l('在 QRS 之前', 'Before the QRS', 'Antes del QRS'),
          l('在 QRS 之中或终末', 'Inside the QRS or at its end', 'Dentro del QRS o en su final'),
          l('在 ST–T 中间', 'In the middle of the ST–T', 'En mitad del ST-T'),
        ],
        answer: 1,
      },
      caption: l(
        '规则的窄 QRS 心动过速：在 II、III、aVF、V1 找 P′，再看它在 QRS 之前、之中、之后，还是比 QRS 多。',
        'Regular narrow-QRS tachycardia: hunt the P′ in II, III, aVF and V1, then ask whether it sits before, inside or after the QRS, or outnumbers it.',
        'Taquicardia regular de QRS estrecho: busca la P′ en II, III, aVF y V1 y mira si está antes, dentro o después del QRS, o si hay más P′ que QRS.',
      ),
    },
    {
      kind: 'live',
      scenario: 'sinus-tachycardia',
      seed: 609,
      dials: [{ id: 'rate' }],
      view: STRIP,
      marks: [{ auto: 't', beat: 4 }, { auto: 'p', beat: 5 }],
      play: {
        dial: 'rate',
        from: 102,
        to: 150,
        notes: [
          {
            min: 102,
            max: 124,
            text: l(
              '前一个 T 结束后 P 才出现，两者分开。PR 约 150 ms，RP 更长。',
              'The P appears after the previous T has ended, clear of it. PR about 150 ms; the RP is longer.',
              'La P aparece cuando ya ha acabado la T anterior, separada de ella. PR de unos 150 ms; el RP es más largo.',
            ),
          },
          { min: 125, max: 133, text: l('P 紧贴在前一个 T 的末尾。', 'The P now starts right at the end of the previous T.', 'La P empieza ya justo al final de la T anterior.') },
          {
            min: 134,
            max: 150,
            text: l(
              'P 在前一个 T 结束前就开始：骑在 T 上，容易漏看。仍是每个 QRS 一个 P。',
              'The P starts before the previous T has ended: it rides on the T and is easy to miss. Still one P per QRS.',
              'La P empieza antes de que acabe la T anterior: cabalga sobre ella y es fácil pasarla por alto. Sigue habiendo una P por QRS.',
            ),
          },
        ],
      },
      predict: {
        question: l(
          '窦性心率从 102 升到 150 次/分，PR 几乎不变。P 波会移到哪里？',
          'The sinus rate climbs from 102 to 150/min while the PR stays about the same. Where does the P wave go?',
          'La frecuencia sinusal sube de 102 a 150 lpm y el PR apenas cambia. ¿Adónde se desplaza la onda P?',
        ),
        options: [l('进入 QRS', 'Into the QRS', 'Dentro del QRS'), l('爬上前一个 T 波', 'Onto the T wave before it', 'Sobre la onda T anterior'), l('消失', 'It disappears', 'Desaparece')],
        answer: 1,
      },
      caption: l(
        '心率越快，RR 越短，P 离前一个 T 越近。P′ 最常藏在 QRS 终末和 T 波里。',
        'The faster the rate, the shorter the RR and the closer the P comes to the T before it. A P′ hides most often at the QRS end and in the T wave.',
        'Cuanto más rápida la frecuencia, más corto el RR y más se acerca la P a la T anterior. La P′ se esconde sobre todo al final del QRS y dentro de la onda T.',
      ),
    },
    {
      kind: 'criteria',
      title: l('规则的窄 QRS 心动过速：判读要点', 'Regular narrow-QRS tachycardia: reading values', 'Taquicardia regular de QRS estrecho: valores de lectura'),
      items: [
        {
          label: l('SVT 定义', 'SVT definition', 'Definición de TSV'),
          value: l('静息 > 100 次/分，机制涉及希氏束或以上；包括房扑与多源性房速；房颤除外；AVRT 属 SVT', '> 100/min at rest, mechanism at the His bundle or above; flutter and MAT included; AF excluded; AVRT is SVT', '> 100 lpm en reposo, mecanismo en el His o por encima; flutter y TAM incluidos; FA excluida; la TRAV es TSV'),
        },
        {
          label: l('典型 AVNRT（慢-快型）', 'Typical (slow-fast) AVNRT', 'TRIN típica (lenta-rápida)'),
          value: l('突发突止；140–220 次/分；P′ 隐于 QRS 或居其终末（V1 假性 r′，II/III/aVF 假性 S）；可见时 RP < 90 ms 支持 AVNRT', 'Abrupt onset and offset; 140-220/min; P′ hidden in the QRS or at its end (pseudo-r′ in V1, pseudo-S in II/III/aVF); when visible, RP < 90 ms favours AVNRT', 'Inicio y fin bruscos; 140-220 lpm; P′ oculta en el QRS o en su final (pseudo-r′ en V1, pseudo-S en II/III/aVF); si es visible, RP < 90 ms favorece la TRIN'),
        },
        {
          label: l('顺向型 AVRT', 'Orthodromic AVRT', 'TRAV ortodrómica'),
          value: l('150 至 > 220 次/分；P′ 在 QRS 后的 ST-T 内，RP 恒定、约 ≥ 90 ms 且 < 半个心动周期；ST 压低与 QRS 电交替常见', '150 to > 220/min; retrograde P′ after the QRS in the ST-T, constant RP about >= 90 ms and < half the cycle; ST depression and QRS alternans common', '150 a > 220 lpm; P′ retrógrada tras el QRS en el ST-T, RP constante de unos >= 90 ms y < medio ciclo; depresión del ST y alternancia del QRS frecuentes'),
        },
        {
          label: l('局灶性房速', 'Focal atrial tachycardia', 'Taquicardia auricular focal'),
          value: l('规则房率 ≥ 100（常 100–250）次/分；P′ 异于窦性、之间有等电位线；多为长 RP；出现房室阻断而心动过速不停 ⇒ 反对 AVNRT/AVRT；温醒/冷却现象 ⇒ 自律性焦点', 'Organized atrial rhythm >= 100 (usually 100-250)/min; P′ different from sinus with an isoelectric baseline; usually long RP; AV block without stopping the tachycardia argues against AVNRT/AVRT; warm-up and cool-down suggest an automatic focus', 'Ritmo auricular organizado >= 100 (habitualmente 100-250) lpm; P′ distinta de la sinusal con línea isoeléctrica entre ellas; normalmente RP largo; el bloqueo AV sin detener la taquicardia va contra TRIN/TRAV; calentamiento y enfriamiento sugieren un foco automático'),
        },
        {
          label: l('2:1 心房扑动', 'Atrial flutter with 2:1 conduction', 'Flutter auricular con conducción 2:1'),
          value: l('未治疗时心室率约 150 次/分；II/III/aVF 锯齿状 F 波（250–330 次/分）无等电位线、V1 直立——第二个 F 常藏在 T 波里', 'Untreated ventricular rate about 150/min; sawtooth F waves (250-330/min) with no isoelectric baseline in II/III/aVF, positive in V1 — the second F often hides inside the T wave', 'Frecuencia ventricular sin tratamiento de unos 150 lpm; ondas F en diente de sierra (250-330 lpm) sin línea isoeléctrica en II/III/aVF, positivas en V1: la segunda F suele esconderse dentro de la onda T'),
        },
        {
          label: l('迷走手法 / 腺苷疗效', 'Vagal manoeuvres / adenosine efficacy', 'Maniobras vagales / eficacia de la adenosina'),
          value: l('迷走手法终止 AVNRT 仅 19–54%（改良 Valsalva 约 43%）；腺苷终止大多数发作', 'Vagal manoeuvres terminate AVNRT in only 19-54% (modified Valsalva about 43%); adenosine terminates most episodes', 'Las maniobras vagales terminan la TRIN solo en el 19-54% (Valsalva modificado, unos 43%); la adenosina termina la mayoría de los episodios'),
        },
        {
          label: l('一阵心动过速', 'A run of tachycardia', 'Salva de taquicardia'),
          value: l('连续 ≥ 3 搏、频率 > 100 次/分', '>= 3 consecutive beats at > 100/min', '>= 3 latidos consecutivos a > 100 lpm'),
        },
        {
          label: l('RP/PR 算法', 'The RP/PR algorithm', 'El algoritmo RP/PR'),
          value: l(
            'P′ 看不见或在 QRS 终末 ⇒ 典型 AVNRT；短 RP（P′ 在 ST 段，RP < PR）⇒ 顺向型 AVRT，或长 PR 的房速；长 RP（RP > PR）⇒ 房速、非典型 AVNRT、PJRT、窦速——看 P′ 方向与形态；P′ 比 QRS 多 ⇒ 房速或房扑',
            'P′ invisible or at the QRS end -> typical AVNRT; short RP (P′ in the ST segment, RP < PR) -> orthodromic AVRT, or AT with a long PR; long RP (RP > PR) -> AT, atypical AVNRT, PJRT, sinus tachycardia: read the P′ polarity and shape; more P′ than QRS -> AT or flutter',
            'P′ invisible o al final del QRS -> TRIN típica; RP corto (P′ en el segmento ST, RP < PR) -> TRAV ortodrómica, o TA con PR largo; RP largo (RP > PR) -> TA, TRIN atípica, PJRT, taquicardia sinusal: lee la polaridad y la forma de la P′; más P′ que QRS -> TA o flutter',
          ),
        },
        {
          label: l('假性 r′ / 假性 S', 'Pseudo-r′ / pseudo-S', 'Pseudo-r′ / pseudo-S'),
          value: l(
            '特异度 91–100%，敏感度低：与基础窦性 ECG 对比会消失；没有它不能排除 AVNRT',
            'Specificity 91-100% but low sensitivity: it vanishes on the baseline sinus ECG; its absence does not rule AVNRT out',
            'Especificidad del 91-100% pero baja sensibilidad: desaparece en el ECG sinusal basal; su ausencia no descarta la TRIN',
          ),
        },
        {
          label: l('AVNRT 对 AVRT：其他线索', 'AVNRT vs AVRT: other clues', 'TRIN frente a TRAV: otras pistas'),
          value: l(
            'AVNRT 见于任何年龄、基础 ECG 正常；AVRT 患者更年轻，基础 ECG 可见预激；QRS 电交替与 ST 压低更支持 AVRT',
            'AVNRT at any age with a normal baseline ECG; AVRT in younger patients, whose baseline ECG may show pre-excitation; QRS alternans and ST depression favour AVRT',
            'TRIN a cualquier edad con ECG basal normal; TRAV en pacientes más jóvenes, con posible preexcitación en el ECG basal; la alternancia del QRS y la depresión del ST favorecen la TRAV',
          ),
        },
        {
          label: l('迷走手法 / 腺苷的诊断性反应', 'Diagnostic response to vagal manoeuvres / adenosine', 'Respuesta diagnóstica a maniobras vagales / adenosina'),
          value: l(
            '终止且最后一个事件是 P′ ⇒ 依赖房室结（AVNRT/AVRT，房速可能性很小）；以 QRS 结束无鉴别价值；出现房室阻滞而房律继续 ⇒ 房速或房扑；逐渐减慢再加快 ⇒ 窦速或自律性房速；全程记录 12 导联',
            'Termination with a P′ as the last event -> AV-node-dependent (AVNRT/AVRT; AT very unlikely); ending on a QRS does not discriminate; AV block with the atrial rhythm continuing -> AT or flutter; gradual slowing then re-acceleration -> sinus tachycardia or automatic AT; record a 12-lead throughout',
            'Terminación con una P′ como último evento -> dependiente del nodo AV (TRIN/TRAV; TA muy improbable); terminar en un QRS no discrimina; bloqueo AV con el ritmo auricular persistente -> TA o flutter; enlentecimiento gradual y reaceleración -> taquicardia sinusal o TA automática; graba un ECG de 12 derivaciones todo el tiempo',
          ),
        },
        {
          label: l('P′ 的方向指向起源', 'P′ polarity points to the origin', 'La polaridad de la P′ señala el origen'),
          value: l(
            'I、aVL 倒置 ⇒ 左房起源（如左上肺静脉：下壁与 V1 直立）；II、III、aVF 倒置 ⇒ 低位或逆行起源',
            'Negative in I and aVL -> left atrial origin (e.g. the left superior pulmonary vein: upright inferiorly and in V1); negative in II, III and aVF -> a low or retrograde origin',
            'Negativa en I y aVL -> origen auricular izquierdo (p. ej. vena pulmonar superior izquierda: positiva en las inferiores y en V1); negativa en II, III y aVF -> origen bajo o retrógrado',
          ),
        },
      ],
      source:
        'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720; Page RL et al. 2015 ACC/AHA/HRS Guideline for the management of adult patients with supraventricular tachycardia. Circulation 2016;133:e506-e574',
    },
    {
      kind: 'figure',
      figure: { id: 'decision-tree', params: { tree: 'narrow-tachy' } },
      caption: l(
        '把整条决策树走一遍：规则吗 → 窄吗 → P′ 在哪里 → P′ 比 QRS 多吗。以后每条规则的窄 QRS 心动过速都按这条路读。',
        'Walk the whole decision tree: regular? -> narrow? -> where is the P′? -> more P′ than QRS? Read every regular narrow-QRS tachycardia along this path from now on.',
        'Recorre todo el árbol de decisión: ¿regular? -> ¿estrecho? -> ¿dónde está la P′? -> ¿más P′ que QRS? Lee desde ahora toda taquicardia regular de QRS estrecho siguiendo este camino.',
      ),
    },
    {
      kind: 'worked',
      title: l('RP 分析：一条 190 次/分的窄 QRS 心动过速', 'RP analysis: a 190/min narrow-QRS tachycardia', 'Análisis del RP: una taquicardia de QRS estrecho a 190 lpm'),
      ecg: synth('avrt', 602),
      steps: [
        {
          title: l('规则吗？窄吗？', 'Regular? Narrow?', '¿Regular? ¿Estrecho?'),
          body: l(
            '分规量 RR：恒定（这里 RR ≈ 316 ms，约 190 次/分），QRS 窄（< 120 ms）。规则 + 窄 ⇒ 进入 P′ 搜索。',
            'March the RR with calipers: constant (here RR is about 316 ms, roughly 190/min) and the QRS is narrow (< 120 ms). Regular + narrow -> go hunting for the P′.',
            'Mide el RR con el compás: constante (aquí unos 316 ms, cerca de 190 lpm) y QRS estrecho (< 120 ms). Regular + estrecho: pasa a buscar la P′.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
          highlightLeads: ['II'],
        },
        {
          title: l('在 II、III、aVF 和 V1 里找 P′', 'Hunt the P′ in II, III, aVF and V1', 'Caza la P′ en II, III, aVF y V1'),
          body: l(
            '逐个导联看 QRS 之后的 ST 段：I 和 aVL 里有一个小而清晰的**负向**波，III、aVF 里同一时刻是一个小的**正向**驼峰；II 导联里它骑在 T 波升支上，很容易漏看。它每搏位置相同：**逆行 P′**。',
            'Look at the ST segment after each QRS, lead by lead: in I and aVL there is a small, crisp **negative** deflection, and at the same instant a small **positive** hump in III and aVF; in II it rides on the T upstroke and is easy to miss. It sits identically every beat: a **retrograde P′**.',
            'Mira el segmento ST tras cada QRS, derivación por derivación: en I y aVL hay una pequeña deflexión **negativa** nítida y, en el mismo instante, una pequeña joroba **positiva** en III y aVF; en II cabalga sobre la rama ascendente de la T y es fácil que se te escape. Ocupa el mismo lugar en cada latido: una **P′ retrógrada**.',
          ),
          marks: [{ auto: 'p', lead: 'I', label: l('P′', 'P′', 'P′') }, { auto: 'p', lead: 'aVL', label: l('P′', 'P′', 'P′') }],
          highlightLeads: ['I', 'aVL', 'III', 'aVF'],
        },
        {
          title: l('P′ 相对 QRS 在哪里？', 'Where is the P′ relative to the QRS?', '¿Dónde está la P′ respecto al QRS?'),
          body: l(
            'P′ 在 QRS **之后**、ST 段之内——不是在 QRS 前面（窦性/房速），也不是埋在 QRS 终末（典型 AVNRT）。这是**短 RP**分支。',
            'The P′ is **after** the QRS, inside the ST segment — not in front of the QRS (sinus / AT) and not buried in the QRS end (typical AVNRT). This is the **short-RP** branch.',
            'La P′ está **después** del QRS, dentro del segmento ST: no delante del QRS (sinusal / TA) ni enterrada en el final del QRS (TRIN típica). Esta es la rama de **RP corto**.',
          ),
          marks: [{ auto: 'qrs', lead: 'I' }, { auto: 'p', lead: 'I', label: l('P′', 'P′', 'P′') }],
          view: { layout: 'strip', lead: 'I' },
        },
        {
          title: l('量 RP′ 与 P′R', 'Measure RP′ against P′R', 'Mide el RP′ frente al P′R'),
          body: l(
            'RP′（QRS 起点至 P′ 起点）≈ 115 ms，P′R（P′ 至下一个 QRS）≈ 200 ms：**RP < PR，且 RP > 90 ms** ⇒ **顺向型 AVRT**（若 P′ 可见而 RP < 90 ms，则更支持 AVNRT）。旁路在左侧游离壁，所以逆行 P′ 在 I、aVL 倒置、下壁直立（P′ 极向随旁路位置而变）。支持征象：ST 段压低、QRS 电交替在 AVRT 中常见。终止后必看基础窦性 ECG：显性旁路见 δ 波，隐性旁路则完全正常。',
            'The RP′ (QRS onset to P′ onset) is about 115 ms and the P′R (P′ to the next QRS) about 200 ms: **RP < PR, and RP > 90 ms** -> **orthodromic AVRT** (a visible P′ with RP < 90 ms would favour AVNRT). The pathway is left free-wall, so the retrograde P′ is negative in I and aVL and upright inferiorly (polarity follows the pathway site). Supporting signs: ST depression and QRS alternans are common in AVRT. After termination, always look at the baseline sinus ECG: a manifest pathway shows a delta wave; a concealed one looks completely normal.',
            'El RP′ (inicio del QRS al inicio de la P′) ronda 115 ms y el P′R (P′ al siguiente QRS) unos 200 ms: **RP < PR y RP > 90 ms** -> **TRAV ortodrómica** (una P′ visible con RP < 90 ms favorecería la TRIN). La vía es de pared libre izquierda, de modo que la P′ retrógrada es negativa en I y aVL y positiva en las inferiores (la polaridad sigue la localización de la vía). Signos de apoyo: la depresión del ST y la alternancia del QRS son frecuentes en la TRAV. Tras la terminación, mira siempre el ECG sinusal basal: una vía manifiesta muestra onda delta; una oculta parece completamente normal.',
          ),
          marks: [{ auto: 'qrs', lead: 'I' }, { auto: 'p', lead: 'I', label: l('P′', 'P′', 'P′') }, { auto: 'rr' }],
          view: { layout: 'strip', lead: 'I', calipers: true },
        },
      ],
    },
    {
      kind: 'heart',
      ecg: synth('avrt', 602),
      showConduction: true,
      emphasize: ['lv-basal-anterolateral'],
      caption: l(
        '顺向型 AVRT：拖动光标走一搏。心室先激动，约 115 ms 后心房才激动：冲动经旁路（高亮处）回到心房。这段回程把 P′ 推到 ST 段上。',
        'Orthodromic AVRT: move the cursor through one beat. The ventricles fire first and the atria about 115 ms later: the impulse returns to them through the pathway (highlighted). That return trip pushes the P′ onto the ST segment.',
        'TRAV ortodrómica: mueve el cursor a lo largo de un latido. Primero se activan los ventrículos y unos 115 ms después las aurículas: el impulso vuelve a ellas por la vía accesoria (resaltada). Ese viaje de vuelta lleva la P′ hasta el segmento ST.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('avnrt', 605),
      view: STRIP_V1,
      marks: [{ auto: 'p', lead: 'V1', label: l('P′（假性 r′）', 'P′ (pseudo-r′)', 'P′ (pseudo-r′)') }],
      caption: l(
        'AVNRT 换看 V1：P′ 落在 QRS 终末，越过基线约半毫米，成一个小的终末正向波：**假性 r′**（QRS 不宽，不是束支阻滞）。不到 1 mm，很容易漏看。',
        'AVNRT in V1: the P′ falls on the QRS end and rises about half a millimetre above the baseline as a small terminal positive wave, a **pseudo-r′** (the QRS is not wide: no bundle-branch block). Under 1 mm, it is easy to miss.',
        'TRIN en V1: la P′ cae al final del QRS y sube alrededor de medio milímetro sobre la línea de base como una pequeña onda terminal positiva, un **pseudo-r′** (el QRS no es ancho: no es un bloqueo de rama). Con menos de 1 mm, es fácil pasarlo por alto.',
      ),
    },
    {
      kind: 'live',
      scenario: 'atrial-flutter',
      seed: 609,
      dials: [{ id: 'conductionRatio' }],
      view: STRIP,
      marks: [{ auto: 'f-waves' }],
      play: {
        dial: 'conductionRatio',
        from: 2,
        to: 4,
        notes: [
          {
            min: 2,
            max: 2,
            text: l('2:1：QRS 150 次/分，规则。约一半 F 波藏在 QRS 和 T 里。', '2:1: QRS at 150/min, regular. About half the F waves hide in the QRS and the T.', '2:1: QRS a 150 lpm, regular. Cerca de la mitad de las ondas F se esconden en el QRS y la T.'),
          },
          { min: 3, max: 3, text: l('3:1：房室结多挡住一个 F，QRS 降到 100 次/分。', '3:1: the AV node blocks one more F; the QRS falls to 100/min.', '3:1: el nodo AV bloquea una F más; el QRS baja a 100 lpm.') },
          {
            min: 4,
            max: 4,
            text: l(
              '4:1：QRS 75 次/分，锯齿露了出来。心房仍是 300 次/分 ⇒ 房扑不需要房室结。',
              '4:1: QRS at 75/min and the sawtooth shows. The atria still beat at 300/min → flutter does not need the AV node.',
              '4:1: QRS a 75 lpm y aparece el diente de sierra. Las aurículas siguen a 300 lpm → el flutter no necesita el nodo AV.',
            ),
          },
        ],
      },
      predict: {
        question: l(
          '迷走手法或腺苷会减慢房室传导。如果这条 150 次/分的规则心动过速是 2:1 房扑，你会看到什么？',
          'Vagal manoeuvres or adenosine slow AV conduction. If this regular 150/min tachycardia is 2:1 flutter, what will you see?',
          'Las maniobras vagales o la adenosina enlentecen la conducción AV. Si esta taquicardia regular a 150 lpm es un flutter 2:1, ¿qué verás?',
        ),
        options: [l('突然终止', 'It stops abruptly', 'Se detiene de golpe'), l('QRS 变慢，F 波照样出现', 'The QRS slows and the F waves keep coming', 'El QRS se enlentece y las ondas F siguen'), l('毫无变化', 'Nothing changes', 'No cambia nada')],
        answer: 1,
      },
      caption: l(
        '把房室传导调慢，就像迷走手法或腺苷：心房节律照常 ⇒ 房扑或房速。用药时全程记录 12 导联。',
        'Slow AV conduction, as vagal manoeuvres or adenosine do: the atrial rhythm carries on → flutter or AT. Record a 12-lead throughout.',
        'Enlentece la conducción AV, como hacen las maniobras vagales o la adenosina: el ritmo auricular sigue → flutter o TA. Graba un ECG de 12 derivaciones todo el tiempo.',
      ),
    },
    {
      kind: 'contrast',
      title: l('长 RP：P′ 的方向与形态定方向', 'Long RP: P′ polarity and shape point the way', 'RP largo: la polaridad y la forma de la P′ orientan'),
      view: STRIP,
      left: {
        ecg: synth('avnrt', 607, undefined, 'atypical'),
        caption: l('非典型（快-慢型）AVNRT，150 次/分：RP 长，P′ 在 II 倒置', 'Atypical (fast-slow) AVNRT, 150/min: long RP with the P′ negative in II', 'TRIN atípica (rápida-lenta), 150 lpm: RP largo con la P′ negativa en II'),
        marks: [{ auto: 'p', label: l('P′', 'P′', 'P′') }, { auto: 'pr' }],
      },
      right: {
        ecg: synth('sinus-tachycardia', 608, { rate: 130 }),
        caption: l('窦性心动过速，130 次/分：RP 长，但 P 波在 II 直立、形态同窦性', 'Sinus tachycardia, 130/min: long RP too, but the P is upright in II and sinus-shaped', 'Taquicardia sinusal, 130 lpm: RP largo también, pero la P es positiva en II y de morfología sinusal'),
        marks: [{ auto: 'p' }, { auto: 'pr' }],
      },
      point: l(
        '两条都是长 RP（RP > PR），**P′ 的方向和形态**定诊断：II、III、aVF 深倒 ⇒ 逆行或低位起源（非典型 AVNRT、PJRT、低位房速）；直立、窦性形态 ⇒ 窦性心动过速，接着要问“为什么”（发热、疼痛、出血、缺氧、甲亢、肺栓塞……）。',
        'Both have a long RP (RP > PR); **the P′ polarity and shape** decide: deeply negative in II, III and aVF -> retrograde or low origin (atypical AVNRT, PJRT, low AT); upright and sinus-shaped -> sinus tachycardia, and then ask why (fever, pain, bleeding, hypoxia, hyperthyroidism, pulmonary embolism...).',
        'Las dos tienen RP largo (RP > PR); **la polaridad y la forma de la P′** deciden: profundamente negativa en II, III y aVF -> origen retrógrado o bajo (TRIN atípica, PJRT, TA baja); positiva y de morfología sinusal -> taquicardia sinusal, y después pregúntate por qué (fiebre, dolor, sangrado, hipoxia, hipertiroidismo, tromboembolia pulmonar...).',
      ),
    },
    { kind: 'check', item: { family: 'narrow-tachy', seed: 7 } },
    { kind: 'check', item: { family: 'narrow-tachy', seed: 17 } },
    { kind: 'check', item: { family: 'narrow-tachy', seed: 6 } },
    { kind: 'drill', families: ['narrow-tachy'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [1919, 8461, 2051],
      caption: l(
        '三份真实心电图，PTB-XL 心脏病学家标注为阵发性室上性心动过速。先别看标签：在 II、III、aVF 和 V1 找 P′，走一遍 RP/PR 算法，对每份**先承诺一个机制**（AVNRT？AVRT？房速？）再揭晓。',
        'Three real tracings the PTB-XL cardiologists labelled paroxysmal supraventricular tachycardia. Ignore the label for now: find the P′ in II, III, aVF and V1, run the RP/PR algorithm, and **commit to one mechanism per tracing** (AVNRT? AVRT? AT?) before the reveal.',
        'Tres ECG reales que los cardiólogos de PTB-XL etiquetaron como taquicardia supraventricular paroxística. Ignora la etiqueta por ahora: busca la P′ en II, III, aVF y V1, aplica el algoritmo RP/PR y **comprométete con un mecanismo en cada trazado** (¿TRIN? ¿TRAV? ¿TA?) antes de la revelación.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把每条规则的窄 QRS 心动过速都写成“SVT”就收工：SVT 是一个家族，不是机制——不做 RP 这一步，终止后你仍然不知道该消融哪里。',
          'Writing "SVT" on every regular narrow-QRS tachycardia and stopping there: SVT is a family, not a mechanism — without the RP step you still do not know what to ablate after it terminates.',
          'Escribir "TSV" en toda taquicardia regular de QRS estrecho y quedarse ahí: la TSV es una familia, no un mecanismo; sin el paso del RP, tras terminarla seguirás sin saber qué hay que ablacionar.',
        ),
        l(
          '漏看 V1 的假性 r′ 和 II/III/aVF 的假性 S——和基础窦性 ECG 一比，它们就消失，这正是识别 AVNRT 的线索。',
          'Missing the pseudo-r′ in V1 and the pseudo-S in II/III/aVF — compare with the baseline sinus ECG and they vanish, which is precisely the clue to AVNRT.',
          'No ver el pseudo-r′ en V1 ni el pseudo-S en II/III/aVF: compáralos con el ECG sinusal basal y desaparecen, que es justo la pista de la TRIN.',
        ),
        l(
          '约 150 次/分的规则心动过速读成窦速或“SVT”了事——先找第二个 F 波：它在 T 波里、在 V1 上（房扑 2:1）。',
          'Reading a regular tachycardia at about 150/min as sinus tachycardia or plain "SVT" — hunt the second F wave first: inside the T wave, and in V1 (flutter with 2:1 conduction).',
          'Leer una taquicardia regular de unos 150 lpm como taquicardia sinusal o una "TSV" sin más: busca antes la segunda onda F, dentro de la T y en V1 (flutter con conducción 2:1).',
        ),
        l(
          '给腺苷时没有同步记录 12 导联：终止瞬间（最后一个事件是 P′ 还是 QRS？）和一过性房室阻滞的全部诊断信息都会丢失。',
          'Giving adenosine without a running 12-lead: the moment of termination (was the last event a P′ or a QRS?) and any transient AV block — all the diagnostic information — are lost.',
          'Administrar adenosina sin un ECG de 12 derivaciones grabando: se pierden el instante de la terminación (¿el último evento fue una P′ o un QRS?), el bloqueo AV transitorio y toda la información diagnóstica.',
        ),
        l(
          '心动过速终止后不看基础 ECG：显性旁路（WPW 图形）会改变处理与风险评估（t4）；AVRT 终止后第一条窦性心律就是你的答案。',
          'Not checking the baseline ECG after termination: a manifest pathway (WPW pattern) changes management and risk assessment (t4); the first sinus beat after an AVRT stops is your answer.',
          'No mirar el ECG basal tras la terminación: una vía manifiesta (patrón WPW) cambia el manejo y la estratificación de riesgo (t4); el primer latido sinusal tras detenerse una TRAV es tu respuesta.',
        ),
        l(
          '不先排除预激就给腺苷：WPW 时它可诱发快心室率的房颤（见 t4）。',
          'Giving adenosine without first looking for pre-excitation: in WPW it can precipitate AF with a fast ventricular response (see t4).',
          'Administrar adenosina sin buscar antes la preexcitación: en el WPW puede precipitar una FA con respuesta ventricular rápida (ver t4).',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '规则的窄 QRS 心动过速：先在 II、III、aVF、V1 找心房活动，再问 P′ 相对 QRS 在哪里。',
          'Regular narrow-QRS tachycardia: find the atrial activity in II, III, aVF and V1 first, then ask where the P′ sits relative to the QRS.',
          'Taquicardia regular de QRS estrecho: busca primero la actividad auricular en II, III, aVF y V1 y pregunta después dónde está la P′ respecto al QRS.',
        ),
        l(
          'P′ 看不见或在 QRS 终末端（假性 r′/假性 S）⇒ 典型 AVNRT；P′ 独立在 ST 段内、RP < PR（约 ≥ 90 ms）⇒ 顺向型 AVRT。',
          'P′ invisible or at the QRS end (pseudo-r′ / pseudo-S) -> typical AVNRT; P′ separate, in the ST segment with RP < PR (about >= 90 ms) -> orthodromic AVRT.',
          'P′ invisible o al final del QRS (pseudo-r′ / pseudo-S) -> TRIN típica; P′ separada, en el segmento ST con RP < PR (unos >= 90 ms) -> TRAV ortodrómica.',
        ),
        l(
          '长 RP（RP > PR）⇒ 房速、非典型 AVNRT、PJRT 或窦速——看 P′ 的方向与形态；P′ 比 QRS 多 ⇒ 房速或房扑（2:1 房扑：约 150 次/分，第二个 F 藏在 T 里）。',
          'Long RP (RP > PR) -> AT, atypical AVNRT, PJRT or sinus tachycardia — read the P′ polarity and shape; more P′ than QRS -> AT or flutter (2:1 flutter: about 150/min, the second F hidden in the T).',
          'RP largo (RP > PR) -> TA, TRIN atípica, PJRT o taquicardia sinusal: lee la polaridad y la forma de la P′; más P′ que QRS -> TA o flutter (flutter 2:1: unos 150 lpm, la segunda F escondida en la T).',
        ),
        l(
          '迷走手法与腺苷是诊断试验：终止且最后一个事件是 P′ ⇒ 依赖房室结；出现阻滞而房律不停 ⇒ 房速/房扑——全程记录 12 导联，终止后检查基础 ECG。',
          'Vagal manoeuvres and adenosine are diagnostic tests: termination with a final P′ -> AV-node-dependent; block with the atrial rhythm persisting -> AT/flutter — record a 12-lead throughout and check the baseline ECG afterwards.',
          'Las maniobras vagales y la adenosina son pruebas diagnósticas: terminación con una P′ final -> dependencia del nodo AV; bloqueo con el ritmo auricular persistente -> TA/flutter: graba un ECG de 12 derivaciones todo el tiempo y revisa el ECG basal después.',
        ),
      ],
    },
  ],
  sources: [
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    'Page RL et al. 2015 ACC/AHA/HRS Guideline for the management of adult patients with supraventricular tachycardia. Circulation 2016;133:e506-e574',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
