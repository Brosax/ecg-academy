/**
 * t5 — Wide-complex tachycardia: VT vs the mimics (docs/PLAN.md §3, stage T).
 * Criteria: docs/curriculum/criteria.md `vt-criteria`, `vt-dissociation`, `wct-morphology`, `brugada-algorithm`
 * (current values) and the missing-book bullets: wide-QRS tachycardia discriminators (VT vs SVT with aberrancy /
 * pre-excitation), the aVR (Vereckei) algorithm, WCT mimics and the default rule, AV dissociation in wide-QRS
 * tachycardia, aberrancy vs VT under bundle-branch-fascicular-blocks.
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
  id: 't5',
  stage: 'T',
  order: 5,
  title: l(
    '宽QRS心动过速（房室分离、夺获与融合波、同向性、一个快速流程）',
    'Wide-complex tachycardia (AV dissociation, capture and fusion beats, concordance, one fast algorithm)',
    'Taquicardia de QRS ancho (disociación AV, latidos de captura y de fusión, concordancia, un algoritmo rápido)',
  ),
  summary: l(
    '原因不明的宽 QRS 心动过速在证明不是之前一律按室速处理：先找房室分离、夺获与融合波这些近乎确诊的证据，再用 QRS 宽度、电轴、同向性与 Brugada / Vereckei 流程佐证。血流动力学稳定不能排除室速，维拉帕米禁用。',
    'An unexplained wide-complex tachycardia is VT until proven otherwise: hunt first for the near-diagnostic evidence (AV dissociation, capture and fusion beats), then support the call with QRS width, axis, concordance and the Brugada / Vereckei algorithms. Haemodynamic stability never excludes VT, and verapamil is contraindicated.',
    'Una taquicardia de QRS ancho sin explicación es una TV hasta que se demuestre lo contrario: busca primero la evidencia casi diagnóstica (disociación AV, latidos de captura y de fusión) y refuerza la decisión con la anchura del QRS, el eje, la concordancia y los algoritmos de Brugada/Vereckei. La estabilidad hemodinámica nunca excluye la TV y el verapamilo está contraindicado.',
  ),
  objectives: [
    l(
      '说出室速的定义（≥ 3 个连续室性搏动 > 100 次/分；持续性 > 30 秒或因血流动力学不稳定提前终止；单形性 120–250 次/分、基本规则）与默认规则：原因不明的宽 QRS 心动过速按室速处理。',
      'State the definition of VT (>= 3 consecutive ventricular beats > 100/min; sustained > 30 s or terminated earlier for haemodynamic compromise; monomorphic 120-250/min, essentially regular) and the default rule: an unexplained wide-QRS tachycardia is managed as VT.',
      'Enunciar la definición de TV (>= 3 latidos ventriculares consecutivos > 100 lpm; sostenida > 30 s o terminada antes por inestabilidad hemodinámica; monomórfica a 120-250 lpm, esencialmente regular) y la regla por defecto: una taquicardia de QRS ancho sin explicación se trata como TV.',
    ),
    l(
      '找出并使用近乎确诊室速的证据：房室分离（用分规让 P 波走出来）、心室夺获（窄而准时）与室性融合波（形态居中），并知道它们的检出率（分离约见于一半室速，体表可见仅 20–30%）。',
      'Find and use the evidence that is near-diagnostic of VT: AV dissociation (march the P waves out with calipers), capture beats (narrow, on time) and fusion beats (intermediate shape), knowing how often each appears (dissociation in about half of VTs, visible on the surface ECG in only 20-30%).',
      'Encontrar y usar la evidencia casi diagnóstica de TV: disociación AV (haz caminar las ondas P con el compás), latidos de captura (estrechos y puntuales) y de fusión (morfología intermedia), sabiendo su frecuencia (disociación en la mitad de las TV, visible en superficie solo en el 20-30 %).',
    ),
    l(
      '应用支持室速的形态学标准：QRS > 140 ms（RBBB 样）/ > 160 ms（LBBB 样）、电轴 −90° 至 ±180°、胸导联同向性、与既往室早形态一致，并走通 Brugada 四步与 aVR（Vereckei）初始 R 波。',
      'Apply the morphology criteria favouring VT: QRS > 140 ms (RBBB-like) / > 160 ms (LBBB-like), axis -90 to +/-180 deg, precordial concordance, morphology identical to previously recorded PVCs, and run the Brugada 4 steps and the aVR (Vereckei) initial R.',
      'Aplicar los criterios morfológicos que favorecen la TV: QRS > 140 ms (tipo BRD) / > 160 ms (tipo BRI), eje de -90 a ±180°, concordancia precordial, morfología idéntica a EV previos, y recorrer los 4 pasos de Brugada y la R inicial en aVR (Vereckei).',
    ),
    l(
      '识别宽 QRS 心动过速的模仿者（差异性传导、预激性心动过速、起搏心律、伪差）并牢记红线：诊断未明的宽 QRS 心动过速禁用维拉帕米。',
      'Recognise the mimics of a wide-QRS tachycardia (aberrancy, pre-excited tachycardia, paced rhythm, artefact) and hold the red line: verapamil is contraindicated in any wide-complex tachycardia of unknown origin.',
      'Reconocer los imitadores de la taquicardia de QRS ancho (aberrancia, taquicardia preexcitada, ritmo de marcapasos, artefacto) y mantener la línea roja: el verapamilo está contraindicado en toda taquicardia de QRS ancho sin diagnóstico.',
    ),
  ],
  minutes: 15,
  competencies: ['C9'],
  findings: ['vt-monomorphic'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('vt-monomorphic', 681),
      view: { layout: '3x4+1' },
      question: l(
        '66 岁男性，陈旧性下壁心梗，今晨突发心悸来诊：血压 105/70 mmHg、意识清楚、肺部干净。12 导联心电图：QRS 宽、节律规则、约 150 次/分。在证明不是之前，这是什么？想好你的判读和第一步处理。',
        'A 66-year-old man with an old inferior myocardial infarction, in this morning with sudden palpitations: blood pressure 105/70 mmHg, fully alert, chest clear. The 12-lead ECG shows a wide QRS, a regular rhythm at about 150/min. What is this until proven otherwise? Commit to your reading and your first step.',
        'Varón de 66 años con un infarto inferior antiguo, llegado hoy por palpitaciones súbitas: tensión 105/70 mmHg, consciente y orientado, tórax limpio. El ECG de 12 derivaciones muestra QRS ancho, ritmo regular a unos 150 lpm. ¿Qué es esto hasta que se demuestre lo contrario? Decide tu lectura y tu primera actuación.',
      ),
      reveal: l(
        '**室性心动过速（VT）**——默认规则：原因不明的宽 QRS 心动过速，在证明不是之前**按室速处理**。约 80% 的宽 QRS 心动过速是室速，陈旧性心梗后比例更高，而**既往心梗或结构性心脏病是最强的临床预测因子**。他没有倒下，不代表这不是室速——室速常常血流动力学稳定；稳定性只决定在哪里、怎么治疗，不决定诊断。本课教你在体表心电图上找到证据：房室分离、夺获与融合波、同向性、四步流程。',
        '**Ventricular tachycardia** — the default rule: an unexplained wide-QRS tachycardia is **treated as VT until proven otherwise**. About 80% of wide-complex tachycardias are VT, more still after an old myocardial infarction, and **previous MI or structural heart disease is the strongest clinical predictor**. That he is not collapsed does not mean this is not VT — VT is often haemodynamically stable; stability decides where and how to treat, never what the rhythm is. This lesson teaches you to find the evidence on the surface ECG: AV dissociation, capture and fusion beats, concordance, and one fast algorithm.',
        '**Taquicardia ventricular**: la regla por defecto; una taquicardia de QRS ancho sin explicación **se trata como TV hasta que se demuestre lo contrario**. Alrededor del 80 % de las taquicardias de QRS ancho son TV, aún más tras un infarto antiguo, y **el infarto previo o la cardiopatía estructural son el predictor clínico más potente**. Que no esté mareado no significa que no sea TV: la TV suele ser hemodinámicamente estable; la estabilidad decide dónde y cómo tratar, nunca qué ritmo es. Esta lección te enseña a encontrar la evidencia en el ECG de superficie: disociación AV, latidos de captura y de fusión, concordancia y un algoritmo rápido.',
      ),
    },
    {
      kind: 'text',
      title: l('定义与默认规则', 'Definition and the default rule', 'Definición y regla por defecto'),
      body: l(
        '**室性心动过速（VT）**：≥ 3 个连续的室性搏动、频率 > 100 次/分（心动周期 < 600 ms）。**非持续性**在 30 秒内自行终止；**持续性** = 持续 > 30 秒，或因血流动力学不稳定而需提前终止。单形性室速常见 **120–250 次/分**（用抗心律失常药时可更慢），QRS 通常 ≥ 120 ms（分支性室速可 110–140 ms），节律**基本规则**、可有轻度周期变化（起始时尤然）。\n**默认规则**：宽 QRS 心动过速里室速最常见（约 80%，结构性心脏病中更高），误判的代价最大——室上速的药（维拉帕米！）打在室速上可诱发室颤。所以拿不准时**一律按室速处理**：不稳定 ⇒ 镇静下同步电复律；稳定 ⇒ 按室速用药，并**在心动过速时录一份 12 导联**（事后分析的价值极高）。',
        '**Ventricular tachycardia (VT)**: >= 3 consecutive ventricular beats at > 100/min (cycle length < 600 ms). **Non-sustained** VT stops by itself within 30 s; **sustained** VT lasts > 30 s, or has to be terminated earlier because of haemodynamic compromise. Monomorphic VT usually runs at **120-250/min** (slower on antiarrhythmics), the QRS is usually >= 120 ms (fascicular VT 110-140 ms), and the rhythm is **essentially regular** with small cycle-length variation, especially at onset.\n**The default rule**: VT is the commonest wide-complex tachycardia (about 80%, more with structural heart disease) and the costliest to miss — a supraventricular drug (verapamil!) thrown at VT can precipitate VF. So when in doubt, **treat as VT**: unstable -> synchronised cardioversion with sedation; stable -> VT treatment, and **record a 12-lead ECG during the tachycardia** (invaluable for later analysis).',
        '**Taquicardia ventricular (TV)**: >= 3 latidos ventriculares consecutivos a > 100 lpm (longitud de ciclo < 600 ms). La TV **no sostenida** se detiene sola antes de 30 s; la TV **sostenida** dura > 30 s o hay que terminarla antes por inestabilidad hemodinámica. La TV monomórfica suele ir a **120-250 lpm** (más lenta con antiarrítmicos), el QRS suele ser >= 120 ms (la TV fascicular puede medir 110-140 ms) y el ritmo es **esencialmente regular**, con pequeña variación del ciclo, sobre todo al inicio.\n**La regla por defecto**: la TV es la taquicardia de QRS ancho más frecuente (en torno al 80 %, más con cardiopatía estructural) y la más cara de pasar por alto: un fármaco supraventricular (¡verapamilo!) sobre una TV puede desencadenar una FV. Así que, ante la duda, **trátala como TV**: inestable -> cardioversión eléctrica sincronizada con sedación; estable -> tratamiento de la TV, y **graba un ECG de 12 derivaciones durante la taquicardia** (impagable para el análisis posterior).',
      ),
    },
    {
      kind: 'criteria',
      title: l('宽 QRS 心动过速：判读数值', 'Wide-complex tachycardia: reading values', 'Taquicardia de QRS ancho: valores de lectura'),
      items: [
        {
          label: l('室速定义', 'VT definition', 'Definición de TV'),
          value: l(
            '≥ 3 个连续室性搏动 > 100 次/分；持续性 > 30 秒或因血流动力学不稳定提前终止；单形性 120–250 次/分，节律基本规则（可有轻度变化）；QRS 通常 ≥ 120 ms',
            '>= 3 consecutive ventricular beats > 100/min; sustained > 30 s or terminated earlier for haemodynamic compromise; monomorphic 120-250/min, essentially regular (small variation possible); QRS usually >= 120 ms',
            '>= 3 latidos ventriculares consecutivos > 100 lpm; sostenida > 30 s o terminada antes por inestabilidad hemodinámica; monomórfica a 120-250 lpm, esencialmente regular (posible pequeña variación); QRS habitualmente >= 120 ms',
          ),
        },
        {
          label: l('房室分离', 'AV dissociation', 'Disociación AV'),
          value: l(
            '约见于一半室速，体表心电图可见者仅 20–30%；约三分之一为 1:1 或文氏型室房逆传（逆行 P′ 落在 QRS 后的 ST 段上）',
            'Present in about half of VTs but visible on the surface ECG in only 20-30%; about a third show 1:1 or Wenckebach retrograde VA conduction (a retrograde P′ on the ST segment after the QRS)',
            'Presente en la mitad de las TV, pero visible en el ECG de superficie solo en el 20-30 %; cerca de un tercio muestran conducción VA retrógrada 1:1 o en Wenckebach (P′ retrógrada sobre el segmento ST tras el QRS)',
          ),
        },
        {
          label: l('夺获与融合波', 'Capture and fusion beats', 'Latidos de captura y de fusión'),
          value: l(
            '夺获 = 窄而准时的正常下传 QRS；融合 = 形态介于窦性与室速 QRS 之间；两者近乎确诊室速，但少见，心率越快越难出现',
            'Capture = a narrow, on-time, normally conducted QRS; fusion = a QRS halfway between the sinus and the VT shape; both are near-diagnostic of VT but uncommon, and rarer the faster the rate',
            'Captura = QRS estrecho, puntual y conducido con normalidad; fusión = QRS intermedio entre el sinusal y el de la TV; ambos son casi diagnósticos de TV, pero poco frecuentes y más raros cuanto más rápida es la taquicardia',
          ),
        },
        {
          label: l('宽度与电轴', 'Width and axis', 'Anchura y eje'),
          value: l(
            'QRS > 140 ms（RBBB 样）或 > 160 ms（LBBB 样）支持室速；电轴 −90° 至 ±180°（“西北”）同样支持',
            'QRS > 140 ms (RBBB-like) or > 160 ms (LBBB-like) favours VT; so does an axis from -90 to +/-180 deg ("northwest")',
            'Un QRS > 140 ms (tipo BRD) o > 160 ms (tipo BRI) favorece la TV; también un eje de -90 a ±180° («noroeste»)',
          ),
        },
        {
          label: l('胸导联同向性', 'Precordial concordance', 'Concordancia precordial'),
          value: l(
            'V1–V6 的 QRS 全部向上或全部向下；负向同向性高度特异地指向室速；正向同向性也见于左后旁路的逆向型 AVRT',
            'All QRS complexes in V1-V6 upright or all negative; negative concordance is highly specific for VT; positive concordance also occurs with antidromic AVRT over a left-posterior pathway',
            'Todos los QRS de V1-V6 positivos o todos negativos; la concordancia negativa es muy específica de TV; la positiva también aparece en la TRAV antidrómica por una vía izquierda posterior',
          ),
        },
        {
          label: l('Brugada 四步（1991）', 'Brugada 4 steps (1991)', 'Brugada, 4 pasos (1991)'),
          value: l(
            '① V1–V6 均无 RS 波形 ⇒ 室速；② 任一胸导联 R 起点至 S 波最低点 > 100 ms ⇒ 室速；③ 房室分离 ⇒ 室速；④ V1/V2 与 V6 同时满足室速形态 ⇒ 室速，否则为差异性传导。LBBB 样时 V1–V2：r > 30 ms、起点至 S 谷 > 60 ms 或 S 降支有切迹 ⇒ 室速',
            '(1) no RS complex in any of V1-V6 -> VT; (2) R onset to S nadir > 100 ms in any precordial lead -> VT; (3) AV dissociation -> VT; (4) VT morphology criteria in both V1/V2 and V6 -> VT, otherwise SVT with aberrancy. LBBB-like in V1-V2: r > 30 ms, onset-to-S-nadir > 60 ms, or a notched S downstroke -> VT',
            '(1) sin complejo RS en ninguna de V1-V6 -> TV; (2) del inicio de la R al nadir de la S > 100 ms en alguna precordial -> TV; (3) disociación AV -> TV; (4) criterios morfológicos de TV en V1/V2 y en V6 a la vez -> TV; si no, TSV con aberrancia. Tipo BRI en V1-V2: r > 30 ms, inicio-nadir de la S > 60 ms o rama descendente de la S con muesca -> TV',
          ),
        },
        {
          label: l('aVR 单导联（Vereckei）', 'Lead aVR alone (Vereckei)', 'Solo aVR (Vereckei)'),
          value: l(
            'aVR 初始为主 R 波 ⇒ 室速；初始 r 或 q > 40 ms ⇒ 室速（还有降支切迹与 vi/vt ≤ 1 两步，第一二步最实用）',
            'An initial dominant R in aVR -> VT; an initial r or q > 40 ms -> VT (a notch on the descending limb and vi/vt <= 1 complete it; the first two steps are the practical ones)',
            'R inicial dominante en aVR -> TV; r o q inicial > 40 ms -> TV (lo completan la muesca en la rama descendente y vi/vt <= 1; los dos primeros pasos son los prácticos)',
          ),
        },
        {
          label: l('用药红线', 'The treatment red line', 'La línea roja terapéutica'),
          value: l(
            '诊断未明的宽 QRS 心动过速禁用维拉帕米（地尔硫卓同理）；不稳定 ⇒ 镇静下同步电复律；窦律时记录到的室早形态与心动过速一致 ⇒ 室速',
            'Verapamil is contraindicated in a wide-complex tachycardia of unknown origin (diltiazem likewise); unstable -> synchronised cardioversion with sedation; a tachycardia identical in shape to PVCs recorded in sinus rhythm is VT',
            'El verapamilo está contraindicado en la taquicardia de QRS ancho sin diagnóstico (el diltiacem igual); inestable -> cardioversión sincronizada con sedación; una taquicardia idéntica a EV registrados en ritmo sinusal es una TV',
          ),
        },
      ],
      source:
        'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307; Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    },
    {
      kind: 'worked',
      title: l('四步读这份宽 QRS 心动过速', 'Four steps through this wide-complex tachycardia', 'Cuatro pasos por esta taquicardia de QRS ancho'),
      ecg: synth('vt-monomorphic', 684, undefined, 'teaching'),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('宽吗？规则吗？多快？', 'Wide? Regular? How fast?', '¿Ancho? ¿Regular? ¿Cómo de rápida?'),
          body: l(
            '在最宽的导联量 QRS：约 160 ms（≥ 120 ms）。再量 RR：处处相等（约 480 ms ⇒ 约 125 次/分）。宽 + 规则 + 快 ⇒ 进入宽 QRS 心动过速流程。室速不一定很快：这一条只有 125 次/分。',
            'Measure the QRS in its widest lead: about 160 ms (>= 120 ms). Then the RR: equal throughout (about 480 ms => about 125/min). Wide + regular + fast -> enter the wide-complex tachycardia algorithm. VT need not be very fast: this one runs at only 125/min.',
            'Mide el QRS en la derivación más ancha: unos 160 ms (>= 120 ms). Luego el RR: igual en toda la tira (unos 480 ms => unos 125 lpm). Ancho + regular + rápido -> entra en el algoritmo de QRS ancho. La TV no tiene por qué ser muy rápida: esta va solo a 125 lpm.',
          ),
          marks: [{ auto: 'qrs' }, { auto: 'rr' }],
        },
        {
          title: l('胸导联走 Brugada 前两步', 'Brugada steps 1-2 in the chest leads', 'Brugada, pasos 1-2 en las precordiales'),
          body: l(
            '第 1 步：逐个看 V1–V6，找 RS 波形（R 后接 S）。全部六个导联都没有 RS（同向性是其极端）⇒ 室速。本图 V1–V4 都有 RS（V1–V3 宽大 R 波后接 S，V5–V6 为 QS），没有同向性——第 1 步阴性，继续。第 2 步：在 RS 最长的导联上量 R 起点到 S 波最低点：V1–V3 约 130 ms，> 100 ms ⇒ **室速**。室速经心肌间缓慢传导，宽而顿挫的 QRS 常让第 2 步直接阳性。',
            'Step 1: go lead by lead through V1-V6 looking for an RS complex (an R followed by an S). No RS in any of the six (concordance is the extreme case) -> VT. Here V1-V4 all have an RS (a broad R then an S in V1-V3; QS in V5-V6), so there is no concordance — step 1 is negative, go on. Step 2: in the lead with the longest RS, measure from R onset to the S nadir: about 130 ms in V1-V3, > 100 ms -> **VT**. VT spreads muscle to muscle, slowly, so a broad, slurred QRS often turns step 2 positive on its own.',
            'Paso 1: recorre V1-V6 derivación por derivación buscando un complejo RS (una R seguida de S). Sin RS en las seis (la concordancia es el caso extremo) -> TV. Aquí V1-V4 tienen RS (una R ancha seguida de S en V1-V3; QS en V5-V6), así que no hay concordancia: el paso 1 es negativo, sigue. Paso 2: en la derivación con el RS más largo, mide del inicio de la R al nadir de la S: unos 130 ms en V1-V3, > 100 ms -> **TV**. La TV se propaga de músculo a músculo, despacio, así que un QRS ancho y empastado suele hacer positivo el paso 2 por sí solo.',
          ),
          marks: [{ auto: 'qrs', lead: 'V2' }],
          highlightLeads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
        },
        {
          title: l('让 P 波自己走出来', 'Let the P waves march through', 'Deja que las ondas P avancen'),
          body: l(
            '窦房结并没有停：P 波以自己较慢的频率（约 75 次/分）穿过节律条，与 QRS 没有固定关系——**房室分离**，且室率 > 房率。这就是 Brugada 第 3 步，也是体表心电图上最特异的室速证据。用分规卡住 PP 走一遍：有的 P 落在 QRS 上，有的落在 T 上，有的刚好露出来。',
            'The sinus node has not stopped: P waves march through at their own slower rate (about 75/min) with no fixed relation to the QRS — **AV dissociation**, with the ventricular rate above the atrial. This is Brugada step 3, and the most specific evidence for VT on the surface ECG. Set the calipers on one PP and walk them along: some P waves land on the QRS, some on the T, a few surface cleanly.',
            'El nodo sinusal no se ha parado: las ondas P avanzan a su propia frecuencia, más lenta (unos 75 lpm), sin relación fija con el QRS: **disociación AV**, con la frecuencia ventricular por encima de la auricular. Es el paso 3 de Brugada y la evidencia más específica de TV en el ECG de superficie. Ajusta el compás a un PP y recorre la tira: algunas P caen sobre el QRS, otras sobre la T, algunas asoman limpias.',
          ),
          marks: [{ auto: 'blocked-p', label: l('分离的窦性 P', 'dissociated sinus P', 'P sinusal disociada') }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('佐证、结论与报告', 'Support, conclude, report', 'Apoyar, concluir, informar'),
          body: l(
            '再看三处：肢体导联定电轴——本图 I、II、aVF 都以负向为主，电轴约 −100°，落在“西北”区，支持室速；QRS 宽度——V1 正向（RBBB 样）且约 160 ms > 140 ms，支持室速；aVR 起始即为高大 R 波 ⇒ 室速（Vereckei 第 1 步）。若有旧图，对照窦律时的室早形态——完全一致即室速。结论：**单形性室速**，按室速处理；确保留下一份心动过速中的 12 导联。',
            'Three more places to look: the limb leads for the axis — here I, II and aVF are all mainly negative, an axis of about -100 deg, in the "northwest" quadrant, which supports VT; the QRS width — V1 is positive (RBBB-like) and about 160 ms, > 140 ms, which supports VT; and aVR starts with a dominant R -> VT (Vereckei step 1). If an old ECG exists, compare with the PVCs in sinus rhythm — an identical shape settles VT. Conclusion: **monomorphic VT**; manage as VT, and make sure a 12-lead during the tachycardia is kept.',
            'Tres miradas más: las derivaciones de miembros para el eje: aquí I, II y aVF son predominantemente negativas, eje de unos -100°, en el cuadrante «noroeste», lo que apoya la TV; la anchura del QRS: V1 positiva (tipo BRD) y unos 160 ms, > 140 ms, apoya la TV; y aVR empieza con una R dominante -> TV (Vereckei, paso 1). Si hay un ECG antiguo, compara con los EV en ritmo sinusal: una morfología idéntica decide que es TV. Conclusión: **TV monomórfica**; trátala como TV y asegúrate de conservar un ECG de 12 derivaciones durante la taquicardia.',
          ),
          marks: [{ auto: 'qrs', lead: 'aVR' }],
          highlightLeads: ['I', 'aVF', 'aVR'],
        },
      ],
    },
    {
      kind: 'figure',
      figure: { id: 'decision-tree', params: { tree: 'wide-tachy' } },
      caption: l(
        '把整棵树走一遍：规则吗 → 先找能证明室速的线索（分离、夺获、融合）→ 选 Brugada 或 aVR 流程；不规则的宽 QRS 心动过速走另一支。以后每一条都按这条路读。',
        'Walk the whole tree: regular? -> look first for clues that prove VT (dissociation, capture, fusion) -> choose Brugada or the aVR algorithm; an irregular wide-QRS tachycardia takes the other branch. Read every wide-complex tachycardia along this path from now on.',
        'Recorre todo el árbol: ¿regular? -> busca primero las pistas que demuestran TV (disociación, captura, fusión) -> elige Brugada o el algoritmo de aVR; la taquicardia de QRS ancho irregular va por la otra rama. Lee desde ahora toda taquicardia de QRS ancho por este camino.',
      ),
    },
    {
      kind: 'text',
      title: l('夺获、融合，以及“和旧图对照”', 'Capture, fusion, and "compare with the old ECG"', 'Captura, fusión y «comparar con el ECG antiguo»'),
      body: l(
        '房室分离时，偶尔有一个窦性冲动恰好赶上心室可激动：\n- **心室夺获**：一个**窄、准时**的 QRS——P 波经房室结正常下传，夹在两个室速搏动之间应到的位置上；\n- **室性融合波**：形态**介于**窦性 QRS 与室速 QRS 之间——两条波锋同时除极心室。\n两者**近乎确诊室速**，但都不常见，心率越快越难出现；见到一个就足够。\n另一条“免费”的证据是**与既往心电图对照**：窦性心律时记录的室早与现在的心动过速形态**完全一致 ⇒ 室速**（同一个出口）；既往束支阻滞与现在相同 ⇒ 支持室上速伴原有阻滞。所以报告之前先问一句：**有旧图吗？**',
        'During AV dissociation, an occasional sinus impulse finds the ventricles excitable:\n- a **capture beat**: a **narrow, on-time** QRS — a P conducted normally through the AV node, landing exactly where it was due between two VT beats;\n- a **fusion beat**: a QRS **halfway between** the sinus and the VT shape — both fronts depolarise the ventricle together.\nBoth are **near-diagnostic of VT**, but neither is common, and both get rarer the faster the rate; one is enough.\nThe other "free" piece of evidence is **the old ECG**: PVCs recorded in sinus rhythm with a shape **identical to the present tachycardia => VT** (the same exit); a bundle branch block identical to a previous one supports SVT with a pre-existing block. So before reporting, always ask: **is there an old tracing?**',
        'Durante la disociación AV, algún impulso sinusal ocasional encuentra los ventrículos excitables:\n- un **latido de captura**: un QRS **estrecho y puntual**, una P conducida con normalidad por el nodo AV que cae justo donde le tocaba entre dos latidos de TV;\n- un **latido de fusión**: un QRS **intermedio** entre el sinusal y el de la TV; ambos frentes despolarizan el ventrículo a la vez.\nAmbos son **casi diagnósticos de TV**, pero ninguno es frecuente, y más raros cuanto más rápida es la taquicardia; con uno basta.\nLa otra evidencia «gratis» es **el ECG antiguo**: unos EV registrados en ritmo sinusal con morfología **idéntica a la taquicardia actual => TV** (la misma salida); un bloqueo de rama idéntico al previo apoya una TSV con bloqueo preexistente. Así que, antes de informar, pregunta siempre: **¿hay un ECG antiguo?**',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('vt-monomorphic', 684, undefined, 'captures'),
      view: { layout: 'strip', lead: 'II', calipers: true },
      marks: [
        { auto: 'qrs', beat: 7, label: l('夺获', 'capture', 'captura') },
        { auto: 'qrs', beat: 9, label: l('融合', 'fusion', 'fusión') },
        { auto: 'qrs', beat: 22, label: l('夺获', 'capture', 'captura') },
      ],
      caption: l(
        '同一个室速，约 146 次/分，窦性约 68 次/分。II 导联里室速 QRS 宽而深倒；约第 3 秒和第 9 秒各有一个**窄、直立、稍提前**的 QRS——窦性 P 恰好赶上心室可激动：**心室夺获**。第一个夺获之后再隔一搏（约第 4 秒），有一搏形态介于两者之间：**融合波**。一个就足以确诊室速——但要在整条节律条里找，它们很少。',
        'The same VT at about 146/min, with the sinus node at about 68/min. In II the VT complexes are wide and deeply negative; at about 3 s and 9 s there is a **narrow, upright, slightly early** QRS — a sinus P found the ventricles excitable: a **capture beat**. Two beats after the first capture (at about 4 s) one complex has an intermediate shape: a **fusion beat**. One is enough to settle VT — but you have to search the whole strip; they are rare.',
        'La misma TV a unos 146 lpm, con el nodo sinusal a unos 68 lpm. En II los complejos de la TV son anchos y muy negativos; hacia los 3 s y los 9 s aparece un QRS **estrecho, positivo y algo adelantado**: una P sinusal encontró los ventrículos excitables, un **latido de captura**. Dos latidos después de la primera captura (hacia los 4 s), un complejo tiene una morfología intermedia: un **latido de fusión**. Con uno basta para decidir que es TV, pero hay que buscarlos en toda la tira: son escasos.',
      ),
    },
    {
      kind: 'text',
      title: l('四个模仿者与一条红线', 'Four mimics and one red line', 'Cuatro imitadores y una línea roja'),
      body: l(
        '宽 QRS 心动过速的模仿者：\n- **室上速伴差异性传导**：既有的或频率依赖的束支阻滞——V1 三相 rsR′、V6 qRs 支持它；典型束支阻滞形态支持差异性传导；\n- **预激性心动过速**（逆向型 AVRT，旁路前传）：完全预激、又宽又规则，形态学上与室速分不开。Steurer 提示室速：V4–V6 主波向下、V2–V6 呈 QR、或见房室分离；年轻人、窦律有 δ波 ⇒ 想到预激；\n- **起搏心律**：找起搏钉——小而尖，需要合适的增益与滤波才看得清；\n- **伪差**（Knight 1999）：真 QRS 以原来的 RR“穿过”伪差，总有某个导联干净，患者状态如常——**别为伪差电复律**。\n**红线**：诊断未明的宽 QRS 心动过速**禁用维拉帕米**（地尔硫卓同理）；不稳定 ⇒ 镇静下**同步电复律**；拿不准 ⇒ 按室速治疗。',
        'The mimics of a wide-QRS tachycardia:\n- **SVT with aberrancy**: a pre-existing or rate-dependent bundle branch block — a triphasic rsR′ in V1 with qRs in V6 supports it; a typical bundle-branch-block shape supports aberrancy;\n- **pre-excited tachycardia** (antidromic AVRT, antegrade over the pathway): fully pre-excited, wide and regular, indistinguishable from VT on morphology. Steurer tips for VT: mainly negative V4-V6, QR in V2-V6, or AV dissociation; a young patient or a delta wave in sinus rhythm points to pre-excitation;\n- **paced rhythm**: hunt for the pacing spikes — small and sharp, they need the right gain and filter settings;\n- **artefact** (Knight 1999): the true QRS complexes "march through" at the underlying RR, at least one lead stays clean, and the patient is unchanged — **never cardiovert an artefact**.\n**The red line**: verapamil is **contraindicated** in any wide-complex tachycardia of unknown origin (diltiazem likewise); unstable -> **synchronised cardioversion** with sedation; in doubt -> treat as VT.',
        'Los imitadores de la taquicardia de QRS ancho:\n- **TSV con aberrancia**: un bloqueo de rama preexistente o dependiente de la frecuencia; un rsR′ trifásico en V1 con qRs en V6 la apoya; una morfología típica de bloqueo de rama apoya la aberrancia;\n- **taquicardia preexcitada** (TRAV antidrómica, anterógrada por la vía): preexcitación máxima, ancha y regular, indistinguible de la TV por morfología. Pistas de Steurer para la TV: V4-V6 predominantemente negativas, QR en V2-V6 o disociación AV; paciente joven o delta en ritmo sinusal -> piensa en preexcitación;\n- **ritmo de marcapasos**: busca las espículas, pequeñas y puntiagudas; hacen falta la ganancia y el filtro adecuados;\n- **artefacto** (Knight 1999): los QRS verdaderos «avanzan» con el RR de base a través del artefacto, al menos una derivación queda limpia y el paciente está igual: **nunca cardioviertas un artefacto**.\n**La línea roja**: el verapamilo está **contraindicado** en toda taquicardia de QRS ancho sin diagnóstico (el diltiacem igual); inestable -> **cardioversión sincronizada** con sedación; ante la duda -> trátala como TV.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('preexcited-af', 685),
      view: { layout: 'strip', lead: 'II', calipers: true },
      caption: l(
        '现在**自己读**：节律规则吗？QRS 宽吗？宽度与形态逐搏变吗？用分规找出最短的 RR。想好判断再看对比卡——这是 t4 的老朋友**预激伴房颤**：快、宽、**不规则**、逐搏变化，最短 RR 可 < 250 ms；房室结阻滞剂禁用。不规则宽 QRS 心动过速走决策树的另一支。',
        'Now **read it yourself**: is the rhythm regular? Is the QRS wide? Do width and shape change beat to beat? Use the calipers to find the shortest RR. Decide your answer, then move on — this is the old friend from t4, **pre-excited AF**: fast, broad, **irregular**, changing beat to beat, shortest RR < 250 ms possible; AV-nodal blockers are contraindicated. An irregular wide-complex tachycardia takes the other branch of the tree.',
        'Ahora **léela tú**: ¿el ritmo es regular? ¿El QRS es ancho? ¿Cambian anchura y morfología de latido en latido? Usa el compás para hallar el RR más corto. Decide tu respuesta y continúa: es la vieja conocida de t4, la **FA preexcitada**: rápida, ancha, **irregular**, cambiante de latido en latido, con RR más corto posible < 250 ms; los bloqueadores del nodo AV están contraindicados. La taquicardia de QRS ancho irregular va por la otra rama del árbol.',
      ),
    },
    {
      kind: 'contrast',
      title: l('形态分不开时', 'When morphology cannot decide', 'Cuando la morfología no decide'),
      view: { layout: '3x4+1' },
      left: {
        ecg: synth('vt-monomorphic', 686),
        caption: l('66 岁，陈旧性下壁心梗', '66, old inferior MI', '66 años, IAM inferior antiguo'),
        marks: [{ auto: 'qrs' }],
      },
      right: {
        ecg: synth('avrt', 687, undefined, 'antidromic'),
        caption: l('26 岁，已知 WPW：逆向型 AVRT', '26, known WPW: antidromic AVRT', '26 años, WPW conocido: TRAV antidrómica'),
        marks: [{ auto: 'qrs' }],
      },
      point: l(
        '两条都是宽、规则的心动过速，形态学流程经常分不出逆向型 AVRT——它完全预激，模仿室速。真正把两者分开的是**病史**：结构性心脏病或陈旧性心梗 ⇒ 室速优先（最强预测因子）；年轻、窦律见 δ波 ⇒ 预激。Steurer 三条提示室速（V4–V6 负向、V2–V6 呈 QR、房室分离）有帮助——这一对图里它们正好起作用：室速的 V4–V6 以负向为主（V5–V6 呈 QS），逆向型 AVRT 的 V4–V6 为正向；但没有一条形态规则是完美的，病史仍然优先。拿不准时的处理完全一致：**按室速对待**——标签可以以后再改，治疗错误要命。',
        'Both are wide, regular tachycardias, and the morphology algorithms often cannot separate antidromic AVRT — fully pre-excited, it imitates VT. What separates them is the **history**: structural heart disease or an old MI points to VT (the strongest predictor); a young patient or a delta wave in sinus rhythm points to pre-excitation. The Steurer tips for VT (negative V4-V6, QR in V2-V6, AV dissociation) help, and on this pair they work: V4-V6 are predominantly negative in the VT (QS in V5-V6) and positive in the antidromic AVRT; but no morphology rule is perfect, and the history still comes first. And when in doubt the management is identical: **treat as VT** — the label can be corrected later; a treatment error can be fatal.',
        'Ambas son taquicardias anchas y regulares, y los algoritmos morfológicos a menudo no separan la TRAV antidrómica, que con preexcitación máxima imita a la TV. Lo que las separa es la **historia**: cardiopatía estructural o infarto antiguo -> TV (el predictor más potente); paciente joven o delta en ritmo sinusal -> preexcitación. Las pistas de Steurer para la TV (V4-V6 negativas, QR en V2-V6, disociación AV) ayudan, y en esta pareja funcionan: V4-V6 son predominantemente negativas en la TV (QS en V5-V6) y positivas en la TRAV antidrómica; pero ninguna regla morfológica es perfecta y la historia sigue siendo lo primero. Y ante la duda el tratamiento es idéntico: **trátala como TV**; la etiqueta se corrige después, el error terapéutico mata.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('ventricular-flutter', 688),
      view: { layout: 'strip', lead: 'II', calipers: true },
      caption: l(
        '当宽而规则的心动过速快到**约 300 次/分**、QRS 与 T 融成一个连续的正弦波、再无等电位线——**心室扑动**。这里不再做鉴别流程：用分规量一下周期（约 200 ms），然后直接进入除颤领域（t6）。',
        'When a wide, regular tachycardia accelerates to **about 300/min** and QRS and T merge into one continuous sine wave with no isoelectric line — **ventricular flutter**. No differential algorithm here: measure the cycle with the calipers (about 200 ms) and move straight to defibrillation territory (t6).',
        'Cuando una taquicardia ancha y regular alcanza **unos 300 lpm** y el QRS y la T se funden en una onda sinusoidal continua sin línea isoeléctrica: **flutter ventricular**. Aquí no hay algoritmo diferencial: mide el ciclo con el compás (unos 200 ms) y pasa directamente al terreno de la desfibrilación (t6).',
      ),
    },
    { kind: 'check', item: { family: 'wide-tachy', seed: 27 } },
    { kind: 'check', item: { family: 'wide-tachy', seed: 11 } },
    { kind: 'check', item: { family: 'wide-tachy', seed: 2 } },
    { kind: 'drill', families: ['wide-tachy'], count: 10, passScore: 0.85 },
    {
      kind: 'real',
      ids: [11889, 21804],
      caption: l(
        '两份真实心电图，先想好判读再揭晓。A：55 岁男性，窦性心律——短 PR、清楚的 δ波、QRS 很宽：这正是能造出逆向型 AVRT 和预激伴房颤（宽 QRS 心动过速的模仿者）的**底物**。B：87 岁女性，约 170 次/分、**不规则**的宽 QRS 心动过速：V1 呈 rsR′、I 与 V6 有宽 S 波——房颤伴右束支阻滞，即室上性心律伴束支阻滞这一模仿者；有旧图时，同样的束支阻滞形态会让你放心。PTB-XL 静息心电图库里没有室速——本课所有“室速长什么样”都来自合成模型；真实世界中，室速多见于有结构性心脏病的年长者。',
        'Two real tracings — commit to your reading before the reveal. A: a 55-year-old man in sinus rhythm — short PR, a clear delta wave and a very broad QRS: the exact **substrate** that can produce antidromic AVRT and pre-excited AF, two of the wide-complex mimics. B: an 87-year-old woman with an **irregular** wide-QRS tachycardia at about 170/min: rsR′ in V1 and a broad S in I and V6 — AF with right bundle branch block, the "SVT with bundle branch block" mimic; an old ECG with the same block would reassure you. The PTB-XL resting-ECG library holds no VT — every "what VT looks like" in this lesson comes from the synthetic model; in the real world VT usually belongs to older patients with structural heart disease.',
        'Dos ECG reales: decide tu lectura antes de mirar la solución. A: varón de 55 años en ritmo sinusal; PR corto, onda delta clara y QRS muy ancho: ese es justamente el **sustrato** capaz de producir una TRAV antidrómica y una FA preexcitada, dos de los imitadores de QRS ancho. B: mujer de 87 años con una taquicardia de QRS ancho **irregular** a unos 170 lpm: rsR′ en V1 y S ancha en I y V6, una FA con bloqueo de rama derecha, el imitador «TSV con bloqueo de rama»; un ECG antiguo con el mismo bloqueo te daría tranquilidad. La biblioteca de ECG de reposo de PTB-XL no contiene TV: todo el «cómo es una TV» de esta lección viene del modelo sintético; en el mundo real, la TV suele pertenecer a pacientes mayores con cardiopatía estructural.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '“血流动力学稳定，所以是室速不可能”——错。室速常常稳定；稳定性只决定在哪里、怎么治，不决定诊断。',
          '"Haemodynamically stable, so it cannot be VT" — wrong. VT is often stable; stability decides where and how to treat, not what the rhythm is.',
          '«Estable hemodinámicamente, luego no puede ser TV»: error. La TV suele ser estable; la estabilidad decide dónde y cómo tratar, no qué ritmo es.',
        ),
        l(
          '给诊断未明的宽 QRS 心动过速用维拉帕米或地尔硫卓——室速可因此蜕变为室颤。',
          'Giving verapamil or diltiazem for an undiagnosed wide-complex tachycardia — VT can degenerate into VF under them.',
          'Dar verapamilo o diltiacem en una taquicardia de QRS ancho sin diagnóstico: la TV puede degenerar en FV con ellos.',
        ),
        l(
          '只看一两个导联就报“同向性”——同向性要在 V1–V6 全部导联判断；且正向同向性也见于左后旁路的逆向型 AVRT。',
          'Calling "concordance" from one or two leads — concordance is judged across all of V1-V6; and positive concordance also occurs with antidromic AVRT over a left-posterior pathway.',
          'Informar «concordancia» mirando una o dos derivaciones: se valora en todo V1-V6; y la concordancia positiva también aparece en la TRAV antidrómica por una vía izquierda posterior.',
        ),
        l(
          '把伪差当室速电复律（Knight 1999）——真 QRS 以原来的 RR 穿过伪差，总有导联是干净的；先看患者，再看导联。',
          'Cardioverting artefact mistaken for VT (Knight 1999) — the true QRS complexes march through at the underlying RR and at least one lead stays clean; look at the patient before the leads.',
          'Cardiovertir un artefacto confundido con TV (Knight 1999): los QRS verdaderos avanzan con el RR de base y al menos una derivación queda limpia; mira primero al paciente y después a las derivaciones.',
        ),
        l(
          '忘了对照旧图：心动过速形态与既往室早完全一致 ⇒ 室速；与既往束支阻滞一致 ⇒ 支持室上速伴原有阻滞。',
          'Forgetting the old ECG: a tachycardia identical to previously recorded PVCs is VT; one identical to a previous bundle branch block supports SVT with a pre-existing block.',
          'Olvidar el ECG antiguo: una taquicardia idéntica a EV previos es una TV; idéntica a un bloqueo de rama previo, una TSV con bloqueo preexistente.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '原因不明的宽 QRS 心动过速 = 在证明不是之前按**室速**处理；既往心梗或结构性心脏病是最强临床预测因子；稳定不排除室速。',
          'An unexplained wide-complex tachycardia is **VT until proven otherwise**; previous MI or structural heart disease is the strongest clinical predictor; stability never excludes VT.',
          'Una taquicardia de QRS ancho sin explicación es **TV hasta que se demuestre lo contrario**; el infarto previo o la cardiopatía estructural son el predictor más potente; la estabilidad nunca excluye la TV.',
        ),
        l(
          '室速定义：≥ 3 个连续室性搏动 > 100 次/分；持续性 > 30 秒或需提前终止；单形性 120–250 次/分、基本规则、QRS 通常 ≥ 120 ms。',
          'VT definition: >= 3 consecutive ventricular beats > 100/min; sustained > 30 s or terminated earlier; monomorphic 120-250/min, essentially regular, QRS usually >= 120 ms.',
          'Definición de TV: >= 3 latidos ventriculares consecutivos > 100 lpm; sostenida > 30 s o terminada antes; monomórfica a 120-250 lpm, esencialmente regular, QRS habitualmente >= 120 ms.',
        ),
        l(
          '近乎确诊的证据：房室分离（约一半室速、体表可见 20–30%，用分规让 P 走出来）、心室夺获（窄而准时）、室性融合波（形态居中）。',
          'Near-diagnostic evidence: AV dissociation (about half of VTs, visible in 20-30% — march the P waves out with calipers), capture beats (narrow, on time) and fusion beats (intermediate shape).',
          'Evidencia casi diagnóstica: disociación AV (en la mitad de las TV, visible en el 20-30 %; haz caminar las P con el compás), latidos de captura (estrechos y puntuales) y de fusión (morfología intermedia).',
        ),
        l(
          '形态学佐证：QRS > 140/160 ms、西北电轴、胸导联同向性（负向高度特异）、与既往室早一致；流程用 Brugada 四步或 aVR 初始 R（Vereckei）。',
          'Morphological support: QRS > 140/160 ms, northwest axis, precordial concordance (negative highly specific), identical to old PVCs; run the Brugada 4 steps or the aVR initial R (Vereckei).',
          'Apoyo morfológico: QRS > 140/160 ms, eje noroeste, concordancia precordial (la negativa muy específica), idéntica a EV antiguos; aplica los 4 pasos de Brugada o la R inicial en aVR (Vereckei).',
        ),
        l(
          '模仿者：差异性传导、预激性心动过速、起搏心律、伪差；诊断未明禁用维拉帕米，不稳定即同步电复律，并一定留下心动过速中的 12 导联。',
          'The mimics: aberrancy, pre-excited tachycardia, paced rhythm, artefact; verapamil is contraindicated until the diagnosis is made, synchronised cardioversion if unstable, and always keep a 12-lead recorded during the tachycardia.',
          'Los imitadores: aberrancia, taquicardia preexcitada, ritmo de marcapasos y artefacto; verapamilo contraindicado sin diagnóstico, cardioversión sincronizada si hay inestabilidad y conserva siempre un ECG de 12 derivaciones durante la taquicardia.',
        ),
      ],
    },
  ],
  sources: [
    'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307',
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Knight BP et al. Clinical consequences of electrocardiographic artifact mimicking ventricular tachycardia. N Engl J Med 1999;341:1270-1274',
    'Castellano et al. 2004',
  ],
};

export default lesson;
