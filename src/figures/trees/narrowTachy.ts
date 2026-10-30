/**
 * Regular / irregular narrow-QRS tachycardia (QRS < 120 ms, rate > 100 /min).
 *
 * Sources (criteria only; text is original):
 * - Page RL et al. 2015 ACC/AHA/HRS Guideline for the Management of Adult Patients With Supraventricular Tachycardia.
 *   Circulation 2016;133:e506-74 (diagnostic algorithm for narrow-QRS tachycardia, RP/PR approach).
 * - Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular tachycardia.
 *   Eur Heart J 2020;41:655-720 (ECG differential diagnosis, adenosine / vagal manoeuvres as diagnostic tools).
 * - RP < 70 ms favours typical AVNRT, RP ≥ 70 ms orthodromic AVRT: Kalbfleisch SJ et al. J Am Coll Cardiol
 *   1993;21:85-9 (the cut-off of the 2003 ACC/AHA/ESC SVT guidelines); the 2015 ACC/AHA/HRS algorithm places it at
 *   90 ms. The help text says so, so a learner who meets the other number is not confused.
 * - MAT = irregular atrial rhythm > 100 /min with ≥ 3 distinct P-wave morphologies: 2015 ACC/AHA/HRS guideline above
 *   (section on multifocal atrial tachycardia).
 * - Curriculum structure: Castellano C, Pérez de Juan MA, Attie F. Electrocardiografía Clínica, 2nd ed. Elsevier, 2004.
 */
import { l } from '../../core/l10n';
import type { DecisionTree } from './types';

export const narrowTachyTree: DecisionTree = {
  id: 'narrow-tachy',
  title: l('窄QRS波心动过速', 'Narrow-QRS tachycardia', 'Taquicardia de QRS estrecho'),
  intro: l(
    'QRS < 120 ms、心室率 > 100 次/分：几乎都起源于心室以上（室上性）。按顺序看：节律是否规整 → 心房活动 → RP 与 PR 的关系。患者血流动力学不稳定时先处理，再分析。',
    'QRS < 120 ms and rate > 100 /min: the rhythm almost always starts above the ventricles (supraventricular). Work in order: regularity → atrial activity → RP versus PR. If the patient is unstable, treat first and analyse later.',
    'QRS < 120 ms y frecuencia > 100 lpm: el ritmo casi siempre se origina por encima de los ventrículos (supraventricular). Sigue el orden: regularidad → actividad auricular → RP frente a PR. Si el paciente está inestable, primero se trata y después se analiza.',
  ),
  root: 'regular',
  sources: [
    'Page RL et al. 2015 ACC/AHA/HRS SVT guideline. Circulation 2016;133:e506-74',
    'Brugada J et al. 2019 ESC SVT guidelines. Eur Heart J 2020;41:655-720',
    'Kalbfleisch SJ et al. J Am Coll Cardiol 1993;21:85-9 (RP 70 ms)',
  ],
  nodes: {
    regular: {
      kind: 'question',
      text: l('心室节律（R–R 间期）是否规整？', 'Is the ventricular rhythm (R–R) regular?', '¿Es regular el ritmo ventricular (R–R)?'),
      help: l(
        '用分规在长条（II 导联）上逐一比较 R–R 间期。',
        'Walk the calipers along the rhythm strip (lead II) and compare every R–R interval.',
        'Desplaza el compás por la tira de ritmo (derivación II) y compara todos los intervalos R–R.',
      ),
      options: [
        { label: l('规整', 'Regular', 'Regular'), next: 'atrialReg' },
        { label: l('不规整', 'Irregular', 'Irregular'), next: 'atrialIrr' },
      ],
    },
    atrialIrr: {
      kind: 'question',
      text: l(
        '节律不规整：看到什么样的心房活动？（看 II、III、aVF 和 V1）',
        'Irregular: what atrial activity do you see? (look at II, III, aVF and V1)',
        'Irregular: ¿qué actividad auricular ves? (mira II, III, aVF y V1)',
      ),
      options: [
        {
          label: l('没有规则的 P 波；基线为杂乱的颤动波或几乎平直', 'No organised P waves; chaotic fibrillatory waves or an almost flat baseline', 'Sin ondas P organizadas; ondas fibrilatorias caóticas o línea de base casi plana'),
          next: 'af',
        },
        {
          label: l('规则的锯齿状扑动波，每个 QRS 前的扑动波数目不等', 'Regular saw-tooth flutter waves, a varying number before each QRS', 'Ondas de flutter regulares en dientes de sierra, en número variable antes de cada QRS'),
          next: 'flutterVar',
        },
        {
          label: l('清楚的 P 波，形态至少 3 种', 'Distinct P waves with at least 3 different shapes', 'Ondas P nítidas con al menos 3 morfologías distintas'),
          next: 'mat',
        },
        {
          label: l('只有一种 P 波形态，被提前的或未下传的 P 波打乱', 'One P shape, interrupted by premature or non-conducted P waves', 'Una sola morfología de P, interrumpida por ondas P prematuras o no conducidas'),
          next: 'stPac',
        },
      ],
    },
    atrialReg: {
      kind: 'question',
      text: l(
        '节律规整：在每个 QRS 之前、之中和之后寻找心房活动。看到什么？',
        'Regular: look for atrial activity before, inside and after each QRS. What do you see?',
        'Regular: busca actividad auricular antes, dentro y después de cada QRS. ¿Qué ves?',
      ),
      help: l(
        '心室率约 150 次/分的规整窄QRS心动过速，在排除之前都应考虑 2:1 下传的心房扑动——一个扑动波常藏在 QRS 或 T 波里。',
        'A regular narrow tachycardia at about 150 /min is atrial flutter with 2:1 conduction until proven otherwise — one flutter wave often hides in the QRS or the T wave.',
        'Una taquicardia regular de QRS estrecho a unos 150 lpm es un flutter auricular con conducción 2:1 mientras no se demuestre lo contrario: una onda F suele ocultarse en el QRS o en la onda T.',
      ),
      options: [
        {
          label: l('约 300 次/分的锯齿状扑动波（每个 QRS 对应 2 个）', 'Saw-tooth flutter waves at about 300 /min (two per QRS)', 'Ondas F en dientes de sierra a unos 300 lpm (dos por QRS)'),
          next: 'flutter21',
        },
        {
          label: l('看不到 P 波，或仅在 QRS 末尾见 V1 假性 r′ / 下壁导联假性 S 波', 'No P wave, or only a pseudo-r′ in V1 / pseudo-S in II, III, aVF at the end of the QRS', 'Sin onda P, o solo una pseudo-r′ en V1 / pseudo-S en II, III, aVF al final del QRS'),
          next: 'avnrt',
        },
        {
          label: l('有 P 波，且 P 波多于 QRS 波群', 'P waves visible, more P waves than QRS complexes', 'Ondas P visibles, más ondas P que complejos QRS'),
          next: 'atBlock',
        },
        { label: l('每个 QRS 对应一个 P 波（1:1）', 'One P wave for every QRS (1:1)', 'Una onda P por cada QRS (1:1)'), next: 'rp' },
      ],
    },
    rp: {
      kind: 'question',
      text: l(
        '1:1 关系：测量 RP（QRS 起点 → 其后的 P 波），并与 PR（P → 下一个 QRS）比较。',
        '1:1: measure RP (QRS onset → the following P) and compare it with PR (P → next QRS).',
        '1:1: mide el RP (inicio del QRS → la P siguiente) y compáralo con el PR (P → siguiente QRS).',
      ),
      help: l(
        '短 RP：P 波靠近前一个 QRS（RP < PR）。长 RP：P 波靠近后一个 QRS（RP > PR）。70 ms 界值（Kalbfleisch）只是参考：2015 年 ACC/AHA/HRS 流程用的是 90 ms，接近界值时不能单凭 RP 下结论。',
        'Short RP: the P sits closer to the preceding QRS (RP < PR). Long RP: the P sits closer to the next QRS (RP > PR). The 70 ms cut-off (Kalbfleisch) is a guide, not a rule: the 2015 ACC/AHA/HRS algorithm uses 90 ms, and a value near the cut-off does not decide on its own.',
        'RP corto: la P está más cerca del QRS anterior (RP < PR). RP largo: la P está más cerca del QRS siguiente (RP > PR). El punto de corte de 70 ms (Kalbfleisch) es orientativo: el algoritmo ACC/AHA/HRS de 2015 usa 90 ms, y un valor cercano al corte no decide por sí solo.',
      ),
      options: [
        {
          label: l('短 RP，且 RP < 70 ms（P 波位于 QRS 末尾或之内）', 'Short RP with RP < 70 ms (P at the end of or inside the QRS)', 'RP corto con RP < 70 ms (P al final del QRS o dentro de él)'),
          next: 'avnrt',
        },
        {
          label: l('短 RP，且 RP ≥ 70 ms（P 波位于 ST 段）', 'Short RP with RP ≥ 70 ms (P in the ST segment)', 'RP corto con RP ≥ 70 ms (P en el segmento ST)'),
          next: 'avrt',
        },
        { label: l('长 RP（RP > PR）', 'Long RP (RP > PR)', 'RP largo (RP > PR)'), next: 'longRp' },
      ],
    },
    longRp: {
      kind: 'question',
      text: l(
        '长 RP：P 波形态如何？心动过速是怎样开始的？',
        'Long RP: what do the P waves look like, and how did the tachycardia start?',
        'RP largo: ¿cómo son las ondas P y cómo empezó la taquicardia?',
      ),
      options: [
        {
          label: l('与窦性 P 波相同（I、II、aVF 直立），逐渐加快、逐渐减慢', 'Same as the sinus P (upright in I, II, aVF); gradual onset and offset', 'Igual que la P sinusal (positiva en I, II, aVF); inicio y final graduales'),
          next: 'sinusTach',
        },
        {
          label: l('与窦性 P 波不同（常在 II、III、aVF 倒置），突发突止', 'Different from the sinus P (often negative in II, III, aVF); abrupt onset', 'Distinta de la P sinusal (a menudo negativa en II, III, aVF); inicio brusco'),
          next: 'longRpSvt',
        },
      ],
    },

    // ── leaves ────────────────────────────────────────────────────────────────────────────────────────────────────
    af: {
      kind: 'leaf',
      tone: 'major',
      findings: ['atrial-fibrillation'],
      title: l('心房颤动', 'Atrial fibrillation', 'Fibrilación auricular'),
      text: l(
        'R–R 绝对不规整，无有序的心房活动。颤动波（f 波）在 V1 最明显，也可能细小到几乎看不见。评估心室率和临床情况，并考虑抗凝。',
        'Irregularly irregular R–R with no organised atrial activity. Fibrillatory (f) waves are best seen in V1 and may be so fine that the baseline looks flat. Assess the ventricular rate and the clinical context, and think about anticoagulation.',
        'R–R irregularmente irregular sin actividad auricular organizada. Las ondas f se ven mejor en V1 y pueden ser tan finas que la línea de base parece plana. Valora la frecuencia ventricular y el contexto clínico, y piensa en la anticoagulación.',
      ),
    },
    flutterVar: {
      kind: 'leaf',
      tone: 'major',
      findings: ['atrial-flutter'],
      title: l('心房扑动伴不等比例下传', 'Atrial flutter with variable AV conduction', 'Flutter auricular con conducción auriculoventricular variable'),
      text: l(
        '锯齿状 F 波（典型房扑在 II、III、aVF 呈负向，约 250–350 次/分），房室传导比例变化（2:1、3:1、4:1），因此 R–R 不规整，但常呈"成组"的规律。',
        'Saw-tooth F waves (typical flutter: negative in II, III, aVF, about 250–350 /min) with changing conduction ratios (2:1, 3:1, 4:1), so the R–R is irregular but often regular in groups.',
        'Ondas F en dientes de sierra (flutter típico: negativas en II, III, aVF, unos 250–350 lpm) con relaciones de conducción cambiantes (2:1, 3:1, 4:1): el R–R es irregular, pero a menudo regular por grupos.',
      ),
    },
    mat: {
      kind: 'leaf',
      tone: 'major',
      findings: ['mat'],
      title: l('多源性房性心动过速', 'Multifocal atrial tachycardia', 'Taquicardia auricular multifocal'),
      text: l(
        '心率 > 100 次/分，P 波形态 ≥ 3 种，PR 间期不等，P 波之间有等电位线。多见于严重肺部疾病，治疗以纠正病因为主。易误诊为心房颤动。',
        'Rate > 100 /min with ≥ 3 distinct P-wave shapes and varying PR intervals, with an isoelectric baseline between the P waves. Typical of severe lung disease; treat the cause. Easily mistaken for atrial fibrillation.',
        'Frecuencia > 100 lpm con ≥ 3 morfologías de onda P y PR variable, con línea isoeléctrica entre las ondas P. Típica de la enfermedad pulmonar grave; se trata la causa. Se confunde fácilmente con fibrilación auricular.',
      ),
    },
    stPac: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['sinus-tachycardia', 'pac'],
      title: l('窦性或房性心动过速伴期前收缩或不等比例下传', 'Sinus or atrial tachycardia with premature beats or variable block', 'Taquicardia sinusal o auricular con extrasístoles o bloqueo variable'),
      text: l(
        '只有一种基本 P 波形态，其间夹有房性期前收缩（提前出现、形态不同的 P 波）或未下传的 P 波。先确定基础节律，再描述多出或缺失的心搏。',
        'A single underlying P shape with premature atrial complexes (early, differently shaped P waves) or non-conducted P waves. Name the underlying rhythm first, then describe the extra or missing beats.',
        'Una morfología de P de base con extrasístoles auriculares (ondas P precoces y de distinta morfología) u ondas P no conducidas. Identifica primero el ritmo de base y después describe los latidos añadidos o ausentes.',
      ),
    },
    flutter21: {
      kind: 'leaf',
      tone: 'major',
      findings: ['atrial-flutter'],
      title: l('心房扑动 2:1 下传', 'Atrial flutter with 2:1 conduction', 'Flutter auricular con conducción 2:1'),
      text: l(
        '扑动波约 300 次/分，每隔一个下传一次，心室率约 150 次/分。一个 F 波常藏在 QRS 或 T 波中：仔细看 II、III、aVF 和 V1。迷走神经刺激或腺苷可短暂加重阻滞，使 F 波显露（用于诊断，而非治疗）。',
        'Flutter waves at about 300 /min, every second one conducted, giving a ventricular rate near 150 /min. One F wave often hides in the QRS or T wave: study II, III, aVF and V1. Vagal manoeuvres or adenosine briefly increase the block and unmask the F waves (diagnostic, not curative).',
        'Ondas F a unos 300 lpm, de las que se conduce una de cada dos: frecuencia ventricular cercana a 150 lpm. Una onda F suele ocultarse en el QRS o en la T: estudia II, III, aVF y V1. Las maniobras vagales o la adenosina aumentan brevemente el bloqueo y desenmascaran las ondas F (diagnóstico, no curativo).',
      ),
    },
    avnrt: {
      kind: 'leaf',
      tone: 'major',
      findings: ['avnrt'],
      title: l('典型房室结折返性心动过速（最可能）', 'Typical AV nodal re-entrant tachycardia (most likely)', 'Taquicardia por reentrada intranodal típica (lo más probable)'),
      text: l(
        '房室结内慢–快型折返：心房与心室几乎同时激动，逆行 P 波埋在 QRS 内，或在 V1 表现为假性 r′、在下壁导联表现为假性 S 波（RP < 70 ms）。交界性心动过速可有相同表现。',
        'Slow–fast re-entry inside the AV node: atria and ventricles are activated almost together, so the retrograde P is buried in the QRS or shows as a pseudo-r′ in V1 and a pseudo-S in the inferior leads (RP < 70 ms). Junctional tachycardia can look the same.',
        'Reentrada lenta-rápida dentro del nodo AV: aurículas y ventrículos se activan casi a la vez, de modo que la P retrógrada queda dentro del QRS o aparece como pseudo-r′ en V1 y pseudo-S en las derivaciones inferiores (RP < 70 ms). La taquicardia de la unión puede tener el mismo aspecto.',
      ),
    },
    avrt: {
      kind: 'leaf',
      tone: 'major',
      findings: ['avrt'],
      title: l('顺向型房室折返性心动过速（旁路参与）', 'Orthodromic AV re-entrant tachycardia (accessory pathway)', 'Taquicardia por reentrada auriculoventricular ortodrómica (vía accesoria)'),
      text: l(
        '经房室结前传、经旁路逆传：逆行 P 波位于 ST 段（RP ≥ 70 ms 但 < PR）。在窦性心律的心电图上寻找预激（PR 短、delta 波）；隐匿性旁路则无预激表现。长 PR 的房性心动过速可类似此图形。',
        'Down the AV node, back up an accessory pathway: the retrograde P falls in the ST segment (RP ≥ 70 ms but < PR). Look for pre-excitation (short PR, delta wave) on the sinus-rhythm ECG; a concealed pathway shows none. Atrial tachycardia with a long PR can mimic it.',
        'Conducción anterógrada por el nodo AV y retrógrada por una vía accesoria: la P retrógrada cae en el segmento ST (RP ≥ 70 ms pero < PR). Busca preexcitación (PR corto, onda delta) en el ECG en ritmo sinusal; una vía oculta no la muestra. Una taquicardia auricular con PR largo puede imitarla.',
      ),
    },
    atBlock: {
      kind: 'leaf',
      tone: 'major',
      findings: ['atrial-tachycardia'],
      title: l('房性心动过速（或心房扑动）伴房室传导阻滞', 'Atrial tachycardia (or flutter) with AV block', 'Taquicardia auricular (o flutter) con bloqueo auriculoventricular'),
      text: l(
        'P 波多于 QRS：心房主导节律，房室结只下传其中一部分（2:1、3:2…）。P 波之间有等电位线提示局灶性房速；基线持续波动提示房扑。房速伴阻滞时要想到洋地黄中毒。',
        'More P waves than QRS complexes: the atria drive the rhythm and the AV node conducts only some of them (2:1, 3:2…). Discrete P waves with an isoelectric baseline between them suggest focal atrial tachycardia; a continuously undulating baseline suggests flutter. Atrial tachycardia with block should raise the question of digoxin toxicity.',
        'Más ondas P que QRS: las aurículas mandan y el nodo AV conduce solo algunas (2:1, 3:2…). Ondas P separadas por línea isoeléctrica sugieren taquicardia auricular focal; una línea de base ondulante continua sugiere flutter. Una taquicardia auricular con bloqueo obliga a pensar en intoxicación digitálica.',
      ),
    },
    sinusTach: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['sinus-tachycardia'],
      title: l('窦性心动过速', 'Sinus tachycardia', 'Taquicardia sinusal'),
      text: l(
        'P 波正常（I、II 直立，aVR 倒置），每个 P 后跟 QRS，心率逐渐升降。它是一种反应而非原发性心律失常：寻找原因（发热、疼痛、低血容量、贫血、缺氧、肺栓塞、甲亢等）。',
        'Normal P waves (upright in I and II, negative in aVR), each followed by a QRS, with a rate that rises and falls gradually. It is a response, not a primary arrhythmia: look for the cause (fever, pain, hypovolaemia, anaemia, hypoxia, pulmonary embolism, thyrotoxicosis…).',
        'Ondas P normales (positivas en I y II, negativas en aVR), cada una seguida de QRS, con una frecuencia que sube y baja de forma gradual. Es una respuesta, no una arritmia primaria: busca la causa (fiebre, dolor, hipovolemia, anemia, hipoxia, embolia pulmonar, tirotoxicosis…).',
      ),
    },
    longRpSvt: {
      kind: 'leaf',
      tone: 'major',
      findings: ['atrial-tachycardia', 'svt'],
      title: l('长 RP 心动过速：局灶性房速、非典型房室结折返或 PJRT', 'Long-RP tachycardia: focal atrial tachycardia, atypical AVNRT or PJRT', 'Taquicardia de RP largo: taquicardia auricular focal, reentrada intranodal atípica o TRUP'),
      text: l(
        '每个 QRS 前有一个异常 P 波，RP > PR。局灶性房速的 P 波形态取决于起源部位；非典型（快–慢型）房室结折返和持续性交界区折返性心动过速（PJRT，慢传导旁路）在 II、III、aVF 中 P 波倒置。鉴别常需电生理检查。',
        'An abnormal P before each QRS with RP > PR. In focal atrial tachycardia the P shape depends on the focus; atypical (fast–slow) AVNRT and permanent junctional reciprocating tachycardia (PJRT, a slowly conducting accessory pathway) give negative P waves in II, III and aVF. Telling them apart often needs an electrophysiology study.',
        'Una P anómala antes de cada QRS con RP > PR. En la taquicardia auricular focal la morfología de la P depende del foco; la reentrada intranodal atípica (rápida-lenta) y la taquicardia reciprocante permanente de la unión (TRUP, vía accesoria de conducción lenta) dan ondas P negativas en II, III y aVF. Distinguirlas suele requerir un estudio electrofisiológico.',
      ),
    },
  },
};
