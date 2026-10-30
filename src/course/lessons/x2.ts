/**
 * X2 — ECG clinic: a prevalence-weighted stream of real ECGs (docs/PLAN.md §3, stage X).
 * Prevalence thinking and computer overreading per the "Computer interpretation — Overreading" bullet of
 * docs/curriculum/criteria.md `basics-technique-leads-paper` (current value); athlete voltage per Drezner 2017 (h9).
 *
 * The stream (14 real PTB-XL tracings, only age and sex are known — no clinical vignettes are invented):
 *   normal 5 · 6271 (F60), 2320 (M64), 11459 (F18), 2594 (F58, sinus bradycardia), 14874 (M47, sinus arrhythmia)
 *   minor 4  · 6282 (M42, complete RBBB), 6727 (F28, first-degree AV block), 2466 (F73, PAC), 17835 (M76, PAC)
 *   major 4  · 19170 (M73, AF/flutter labels, ≈ 111/min), 2627 (M45, old inferior MI), 18776 (M35, LVH label),
 *              2739 (M89, atrial flutter ≈ 147/min)
 *   act now 1 · 12899 (F67, acute inferior STEMI, PTB-XL infarction stadium I)
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { Lesson } from '../api';

const real = (id: number): EcgSource => ({ kind: 'real', id });
const GRID = { layout: '3x4+1' } as const;

/** The hidden emergency of the stream: commit to a bin before the debrief. */
const hiddenStemi: Item = {
  id: 'x2:bin-12899',
  family: 'triage',
  competency: 'C8',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '门诊流第 7 份：67 岁女性，申请单上没有任何临床信息。前六份都不需要现在处理。按十步读完，然后选一个分诊箱。',
    'Tracing 7 of the stream: a 67-year-old woman; the request slip gives no clinical details. None of the six before it needed action now. Read it in ten steps, then pick a bin.',
    'ECG número 7 de la serie: mujer de 67 años; la petición no aporta datos clínicos. Ninguno de los seis anteriores exigía actuar ya. Léelo en diez pasos y elige una categoría.',
  ),
  ecg: real(12899),
  view: GRID,
  explanation: l(
    '**现在处理。** II、III、aVF 的 ST 段明显抬高（III 与 aVF 最高），aVL 与 I 镜像压低——**急性下壁 STEMI**（心脏科医师标注：下壁心梗，梗死分期 I＝急性期）。下壁组中两个相邻导联 ≥1 mm 即达标准，这里远超。空白的申请单不改变心电图：立即找到患者、问症状、启动再灌注流程，并加做右胸导联（V4R）找右心室受累。门诊流最危险的时刻，正是连续六份正常之后。',
    '**Act now.** Clear ST elevation in II, III and aVF (highest in III and aVF) with reciprocal depression in aVL and I — an **acute inferior STEMI** (cardiologists\' label: inferior MI, infarction stadium I = acute). Two contiguous inferior leads at ≥ 1 mm meet the criterion; this is far beyond it. An empty request slip does not change the tracing: find the patient now, ask about symptoms, activate the reperfusion pathway, and record right-sided leads (V4R) to look for RV involvement. The most dangerous moment in a clinic stream is right after six normals in a row.',
    '**Actuar ya.** Elevación clara del ST en II, III y aVF (máxima en III y aVF) con descenso recíproco en aVL e I: un **IAMCEST inferior agudo** (etiqueta de los cardiólogos: IAM inferior, estadio I = agudo). Dos derivaciones inferiores contiguas con ≥ 1 mm cumplen el criterio, y aquí se supera con creces. Una petición sin datos no cambia el ECG: localiza ya al paciente, pregunta por los síntomas, activa el circuito de reperfusión y registra derivaciones derechas (V4R) para buscar afectación del VD. El momento más peligroso de una serie de consulta es justo después de seis normales seguidos.',
  ),
  findings: ['stemi-inferior'],
  key: {
    options: [
      { id: 'critical', label: l('现在处理', 'Act now', 'Actuar ya') },
      { id: 'major', label: l('当天评估', 'Review today', 'Revisar hoy') },
      { id: 'routine', label: l('常规', 'Routine', 'Rutina') },
    ],
    correct: 'critical',
  },
};

const lesson: Lesson = {
  id: 'x2',
  stage: 'X',
  order: 2,
  title: l('心电图门诊：按患病率抽取的真实心电图', 'ECG clinic: a prevalence-weighted stream of real ECGs', 'Consulta de ECG: una serie de ECG reales ponderada por prevalencia'),
  summary: l(
    '一条未筛选的门诊心电图流：大多数图正常或接近正常——最常见错误是把正常变异过度诊断；而隐藏的闭塞、传导阻滞与失控节律，只能靠 x1 的固定顺序筛出来。',
    'An unselected clinic stream of real ECGs: most tracings are normal or near-normal — over-calling normal variants is the commonest error — while the hidden occlusions, blocks and uncontrolled rhythms are caught only by the fixed order from x1.',
    'Una serie de ECG reales de consulta sin seleccionar: la mayoría son normales o casi normales —sobrediagnosticar variantes normales es el error más frecuente— y las oclusiones, los bloqueos y los ritmos descontrolados ocultos solo se detectan con el orden fijo de x1.',
  ),
  objectives: [
    l('在未筛选的真实心电图流中，对每一份图按固定顺序完成完整报告。', 'Run the fixed-order report on every tracing of an unselected stream of real ECGs.', 'Aplicar el informe de orden fijo a cada ECG de una serie real sin seleccionar.'),
    l('用患病率校准预期：多数心电图正常或接近正常，避免过度诊断正常变异。', 'Calibrate expectations with prevalence: most ECGs are normal or near-normal; resist over-calling normal variants.', 'Calibrar las expectativas con la prevalencia: la mayoría de los ECG son normales o casi normales; evita sobrediagnosticar variantes normales.'),
    l('在一连串正常图之后，依然认出那一份需要“现在处理”的图。', 'Still recognise the one act-now tracing after a run of normals.', 'Seguir reconociendo el ECG de actuar ya después de una racha de normales.'),
    l('把机器判读当作待检验的假设，逐份复核后再签署。', 'Treat the machine statement as a hypothesis to test, over-reading every tracing before you sign.', 'Tratar la interpretación automática como una hipótesis que comprobar, revisando cada ECG antes de firmar.'),
  ],
  minutes: 22,
  competencies: ['C11', 'C9', 'C8'],
  findings: ['normal-ecg', 'atrial-fibrillation', 'rbbb', 'old-mi-inferior', 'stemi-inferior'],
  blocks: [
    {
      kind: 'hook',
      ecg: real(19170),
      view: GRID,
      question: l(
        '门诊流第 1 份：73 岁男性（申请单上没有临床信息）。先别往下翻：按 x1 的固定顺序写出你的完整报告，最后加一行紧急程度。',
        'Tracing 1 of the clinic stream: a 73-year-old man (the request slip gives no clinical details). Before scrolling: write your complete report in the fixed order from x1, ending with one line of urgency.',
        'ECG 1 de la serie de consulta: varón de 73 años (la petición no aporta datos clínicos). Antes de continuar: redacta tu informe completo en el orden fijo de x1 y cierra con una línea de urgencia.',
      ),
      reveal: l(
        '节律：任何导联都找不到规则的 P 波，基线是不规则的心房活动（II 导联局部像扑动波），RR 毫无规律——**不规则的房性快速心律失常，心室率约 110 次/分（未控制）**。心脏科医师同时标了心房扑动与心房颤动：粗颤与不等比下传的房扑在单份图上本就难分，而处理是同一条路——控制心室率、找诱因、评估抗凝。报告不止这一行：QRS 约 116 ms（临界增宽）、电轴约 −14°，ST 段仍要逐组读一遍。紧急程度：**当天评估**（无不稳定表现时）。',
        'Rhythm: no regular P wave in any lead, an irregular atrial baseline (flutter-like in places in II), RR intervals with no pattern at all — **an irregular atrial tachyarrhythmia with a ventricular response of about 110/min (uncontrolled)**. The cardiologists labelled both atrial flutter and atrial fibrillation: coarse AF and flutter with variable conduction are often hard to separate on one tracing, and the management path is the same — control the rate, look for a cause, assess the case for anticoagulation. The report is more than that line: QRS about 116 ms (borderline wide), axis about −14°, and the ST segments still have to be read group by group. Urgency: **review today** (in the absence of instability).',
        'Ritmo: ninguna derivación muestra ondas P regulares, la línea de base tiene una actividad auricular irregular (con aspecto de aleteo a ratos en II) y los RR no siguen ningún patrón: **una taquiarritmia auricular irregular con respuesta ventricular de unas 110 lpm (no controlada)**. Los cardiólogos etiquetaron a la vez aleteo y fibrilación auricular: una FA gruesa y un aleteo con conducción variable a menudo no se distinguen en un solo ECG, y el manejo es el mismo: controlar la frecuencia, buscar la causa y valorar la anticoagulación. El informe es más que esa línea: QRS de unos 116 ms (en el límite de ancho), eje de unos −14°, y los segmentos ST aún deben leerse por grupos. Urgencia: **revisar hoy** (si no hay inestabilidad).',
      ),
    },
    {
      kind: 'text',
      title: l('患病率思维：多数心电图没有急事', 'Prevalence thinking: most ECGs hold nothing urgent', 'Pensamiento en prevalencia: la mayoría de los ECG no esconden nada urgente'),
      body: l(
        '真实门诊不是考卷：心电图按患病率到来——**大多数正常或接近正常**，其余多为常见发现（窦性心动过缓、早搏、一度房室传导阻滞、束支阻滞、非特异性 ST–T）。今天这条流有 14 份真实图：**5 份正常、4 份次要发现、4 份重要发现、1 份需要现在处理**——真实门诊里正常的比例只会更高。\n- 读者最常见的错误是**把正常变异过度诊断**：早期复极被当作 STEMI、年轻人的电压被当作肥厚——代价是不必要的转诊、检查与焦虑。\n- 机器同样会错：自动判读必须始终由有资质的读者复核，其错误集中在节律（例如伪差被判为房颤、起搏心律），也不能可靠识别电极接反（o12）。\n- 而平凡之流中仍藏着闭塞、传导阻滞与失控节律——**x1 的固定顺序就是筛子**：每份图十步走完，任何发现都别想躲在“节律”那一行后面。',
        'A real clinic is not an exam: ECGs arrive by prevalence — **most are normal or near-normal**, and the rest are mostly common findings (sinus bradycardia, extrasystoles, first-degree AV block, bundle branch block, non-specific ST–T). Today\'s stream holds 14 real tracings: **5 normal, 4 minor, 4 major, 1 act-now** — in a real clinic the normal share is higher still.\n- The commonest reader error is **over-calling normal variants**: early repolarisation read as STEMI, young voltage read as hypertrophy — the cost is needless referral, testing and anxiety.\n- The machine errs too: the automated statement must always be confirmed by a qualified reader; its errors cluster in rhythm (artefact called AF, pacemaker rhythms) and it does not recognise electrode reversals reliably (o12).\n- And the ordinary stream still hides occlusions, blocks and uncontrolled rhythms — **the fixed order from x1 is the sieve**: ten steps on every tracing, so nothing hides behind the rhythm line.',
        'Una consulta real no es un examen: los ECG llegan según la prevalencia —**la mayoría son normales o casi normales**— y el resto son sobre todo hallazgos frecuentes (bradicardia sinusal, extrasístoles, bloqueo AV de primer grado, bloqueo de rama, ST–T inespecífico). La serie de hoy tiene 14 ECG reales: **5 normales, 4 con hallazgos menores, 4 mayores y 1 de actuar ya**; en una consulta real la proporción de normales es aún mayor.\n- El error más frecuente del lector es **sobrediagnosticar variantes normales**: una repolarización precoz leída como IAMCEST, un voltaje juvenil leído como hipertrofia; el coste son derivaciones a otros especialistas, pruebas y ansiedad innecesarias.\n- La máquina también se equivoca: la interpretación automática debe confirmarla siempre un lector cualificado; sus errores se concentran en el ritmo (artefacto llamado FA, ritmos con marcapasos) y no reconoce con fiabilidad las inversiones de electrodos (o12).\n- Y en la serie banal siguen escondiéndose oclusiones, bloqueos y ritmos descontrolados: **el orden fijo de x1 es el tamiz**, diez pasos en cada ECG, para que nada quede oculto tras la línea del ritmo.',
      ),
    },
    {
      kind: 'criteria',
      title: l('今天这条门诊流需要的判据', 'The criteria today\'s stream will ask for', 'Los criterios que esta serie de consulta va a pedir'),
      items: [
        {
          label: l('心房颤动', 'Atrial fibrillation', 'Fibrilación auricular'),
          value: l('无 P 波；RR 绝对不齐；未治疗时心室率常为 100–180 次/分', 'No P waves; irregularly irregular RR; untreated ventricular rate typically 100–180/min', 'Sin ondas P; RR irregularmente irregulares; frecuencia ventricular sin tratar típicamente 100–180 lpm'),
        },
        {
          label: l('房扑 2:1 的线索', 'The 2:1 flutter clue', 'La pista del aleteo 2:1'),
          value: l('规则窄 QRS 心动过速约 150 次/分 → 在 II/III/aVF 找锯齿波，心房率约 300', 'Regular narrow-complex tachycardia near 150/min → look for sawtooth in II/III/aVF, atrial rate about 300/min', 'Taquicardia regular de QRS estrecho a unas 150 lpm → busca el diente de sierra en II/III/aVF, frecuencia auricular unas 300 lpm'),
        },
        {
          label: l('完全性右束支传导阻滞', 'Complete right bundle branch block', 'Bloqueo completo de rama derecha'),
          value: l('QRS ≥120 ms；V1–V2 呈 rsr′/rsR′；I 与 V6 的 S 波宽于 R 波或 >40 ms', 'QRS ≥120 ms; rsr′/rsR′ in V1–V2; in I and V6 the S wave lasts longer than the R or >40 ms', 'QRS ≥120 ms; rsr′/rsR′ en V1–V2; en I y V6 la S dura más que la R o >40 ms'),
        },
        {
          label: l('急性下壁 STEMI', 'Acute inferior STEMI', 'IAMCEST inferior agudo'),
          value: l('II、III、aVF 中两个相邻导联 ST 抬高 ≥1 mm，常伴 I/aVL 镜像压低', 'ST elevation ≥1 mm in two contiguous leads of II, III and aVF, often with reciprocal depression in I/aVL', 'Elevación del ST ≥1 mm en dos derivaciones contiguas de II, III y aVF, a menudo con descenso recíproco en I/aVL'),
        },
        {
          label: l('陈旧性下壁心梗', 'Old inferior infarction', 'Infarto inferior antiguo'),
          value: l('II/III/aVF 组病理性 Q 波（≥30 ms 且 ≥1 mm，或 QS），ST 已回到基线', 'Pathological Q waves in the II/III/aVF group (≥30 ms and ≥1 mm, or QS), ST back on the baseline', 'Ondas Q patológicas en el grupo II/III/aVF (≥30 ms y ≥1 mm, o QS), con el ST de nuevo en la línea de base'),
        },
        {
          label: l('左心室肥厚电压（Sokolow-Lyon）', 'LVH voltage (Sokolow-Lyon)', 'Voltaje de HVI (Sokolow-Lyon)'),
          value: l('S(V1) + R(V5 或 V6 较大者) >35 mm；年轻运动员中孤立的电压标准属训练相关', 'S in V1 + the larger R of V5/V6 >35 mm; in young athletes, isolated voltage is training-related', 'S en V1 + la mayor R de V5/V6 >35 mm; en deportistas jóvenes, el voltaje aislado se relaciona con el entrenamiento'),
        },
        {
          label: l('房性早搏', 'Atrial extrasystole (PAC)', 'Extrasístole auricular'),
          value: l('提前出现、形态不同的 P 波，其后间歇非完全代偿', 'An early P wave of a different shape, followed by a less than fully compensatory pause', 'Una P precoz de morfología distinta, seguida de una pausa no totalmente compensadora'),
        },
      ],
      source:
        'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Surawicz B et al. AHA/ACCF/HRS Part III: Intraventricular conduction disturbances. Circulation 2009;119:e235-e240; Thygesen K et al. Fourth universal definition of myocardial infarction (2018). Eur Heart J 2019;40:237-269; Drezner JA et al. International recommendations for electrocardiographic interpretation in athletes. J Am Coll Cardiol 2017;69:1057-1075; Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192',
    },
    {
      kind: 'ecg',
      ecg: real(6282),
      view: GRID,
      caption: l(
        '门诊流第 2 份：42 岁男性。先别看任何提示——在纸上写下十步完整报告，然后往下读小结。',
        'Tracing 2: a 42-year-old man. No hints first — write the full ten-step report on paper, then read the debrief below.',
        'ECG 2: varón de 42 años. Primero sin pistas: escribe en papel el informe completo de diez pasos y luego lee el comentario.',
      ),
    },
    {
      kind: 'text',
      title: l('第 2 份小结：一条右束支，其余照读', 'Tracing 2 debrief: a right bundle, and everything else still read', 'ECG 2: una rama derecha, y todo lo demás se sigue leyendo'),
      body: l(
        '窦性心律约 76 次/分，PR 约 134 ms；QRS 约 154 ms，V1 呈 rsR′，I 与 V6 见宽钝 S 波，V1 T 波倒置（继发性改变）——**完全性右束支传导阻滞**。\n- 报告的其余九行照写：这份图没有急性 ST 事件；RBBB 不掩盖初始激动，Q 波依然可读。\n- 严重程度：次要；与旧图对比确认是否新发。**新发** RBBB 伴缺血症状才升级为“当天”甚至更高（x3）。\n- 门诊常见——正因如此，它不能劫持整份报告。',
        'Sinus rhythm at about 76/min, PR about 134 ms; QRS about 154 ms with an rsR′ in V1, broad slurred S waves in I and V6, and T inverted in V1 (a secondary change) — **complete right bundle branch block**.\n- The other nine lines of the report still get written: no acute ST event here; RBBB does not hide initial activation, so Q waves remain readable.\n- Severity: minor; compare with old tracings to see whether it is new. A **new** RBBB with ischaemic symptoms moves up to "today" or higher (x3).\n- Common in clinics — exactly why it must not hijack the whole report.',
        'Ritmo sinusal a unas 76 lpm, PR de unos 134 ms; QRS de unos 154 ms con rsR′ en V1, S anchas y empastadas en I y V6, y T invertida en V1 (cambio secundario): **bloqueo completo de rama derecha**.\n- Las otras nueve líneas del informe se escriben igual: aquí no hay evento ST agudo; el bloqueo de rama derecha no oculta la activación inicial, así que las ondas Q siguen legibles.\n- Gravedad: menor; compara con ECG previos para saber si es nuevo. Un bloqueo **nuevo** con síntomas isquémicos sube a «hoy» o más arriba (x3).\n- Es frecuente en consulta, y precisamente por eso no debe secuestrar todo el informe.',
      ),
    },
    {
      kind: 'real',
      ids: [6271, 2320, 11459],
      caption: l(
        '门诊流第 3–5 份：60 岁女性、64 岁男性、18 岁女性。这才是门诊的常态。每一份也要写满十行——“大概正常”不是报告；写出数字之后，“正常心电图”才算结论。',
        'Tracings 3–5: a 60-year-old woman, a 64-year-old man, an 18-year-old woman. This is what most of a clinic looks like. Each still gets all ten lines — "probably normal" is not a report; "normal ECG" becomes a conclusion only once the numbers are written.',
        'ECG 3 a 5: mujer de 60 años, varón de 64 y mujer de 18. Así es la mayor parte de una consulta. Cada uno lleva igualmente sus diez líneas: «probablemente normal» no es un informe; «ECG normal» solo es una conclusión cuando las cifras están escritas.',
      ),
    },
    {
      kind: 'ecg',
      ecg: real(2627),
      view: GRID,
      caption: l(
        '门诊流第 6 份：45 岁男性。节律看起来平淡无奇——**先写下完整报告再往下**：这份图里藏着一个节律步骤永远不会暴露的发现。',
        'Tracing 6: a 45-year-old man. The rhythm looks unremarkable — **write the full report before scrolling**: this tracing hides a finding the rhythm step will never surface.',
        'ECG 6: varón de 45 años. El ritmo parece anodino: **escribe el informe completo antes de continuar**; este ECG esconde un hallazgo que el paso del ritmo jamás revelará.',
      ),
    },
    {
      kind: 'worked',
      title: l('第 6 份全读：藏在普通图里的下壁心梗', 'Tracing 6, the full read: an inferior infarct hiding in an ordinary tracing', 'ECG 6, lectura completa: un infarto inferior escondido en un ECG banal'),
      ecg: real(2627),
      view: GRID,
      steps: [
        {
          title: l('记录、心率、节律', 'Recording, rate, rhythm', 'Registro, frecuencia, ritmo'),
          body: l(
            '"25 mm/s、10 mm/mV、伪差很小。窦性心律约 80 次/分（RR 轻度呼吸性变化——窦性心律不齐），PR 约 144 ms，QRS 约 88 ms，电轴约 0°。"——到这里一切普通。',
            '"25 mm/s, 10 mm/mV, minimal artefact. Sinus rhythm at about 80/min (mild respiratory RR variation — sinus arrhythmia), PR about 144 ms, QRS about 88 ms, axis about 0°." — So far, entirely ordinary.',
            '«25 mm/s, 10 mm/mV, artefacto mínimo. Ritmo sinusal a unas 80 lpm (leve variación respiratoria del RR: arritmia sinusal), PR de unos 144 ms, QRS de unos 88 ms, eje en torno a 0°». Hasta aquí, del todo banal.',
          ),
          highlightLeads: ['II'],
        },
        {
          title: l('形态步骤找到了它', 'The morphology step finds it', 'El paso de la morfología lo encuentra'),
          body: l(
            'III 导联见宽 Q 波，aVF 亦见 q 波；III、aVF 的 T 波低平或倒置，而 I、aVL 直立——**下壁导联组的病理性 Q 波**：这是梗死，不是正常变异（III 导联孤立的小 q 可见于正常人，但这里 Q 波宽而且累及 aVF）。',
            'Lead III shows a broad Q wave and aVF a q wave too; T is flat or inverted in III and aVF while I and aVL stay upright — **pathological Q waves in the inferior group**: this is infarction, not a variant (an isolated small q in III can be normal, but here the Q is broad and reaches aVF).',
            'La derivación III muestra una Q ancha y aVF también una q; la T está aplanada o invertida en III y aVF mientras I y aVL siguen positivas: **ondas Q patológicas en el grupo inferior**. Esto es un infarto, no una variante (una q pequeña aislada en III puede ser normal, pero aquí la Q es ancha y alcanza aVF).',
          ),
          highlightLeads: ['II', 'III', 'aVF', 'I', 'aVL'],
        },
        {
          title: l('ST 段回答“急性吗”', 'The ST segments answer "acute?"', 'El segmento ST responde: ¿agudo?'),
          body: l(
            'II、III、aVF 的 ST 段等电位，无镜像改变：**不是正在进行的闭塞**（心脏科医师标注：陈旧性下壁心梗）。若两个相邻下壁导联 ST 抬高 ≥1 mm 并伴 I/aVL 压低，那就是急性下壁 STEMI——立即行动。同一组导联，两种截然不同的紧迫度：下一份图就是这样。',
            'The ST segments in II, III and aVF are isoelectric with no reciprocal change: **no ongoing occlusion** (cardiologists\' label: old inferior MI). Had two contiguous inferior leads shown ST elevation ≥ 1 mm with depression in I/aVL, that would be an acute inferior STEMI — act now. The same lead group, two very different urgencies: the next tracing is exactly that.',
            'Los segmentos ST en II, III y aVF son isoeléctricos, sin cambios recíprocos: **no hay oclusión en curso** (etiqueta de los cardiólogos: IAM inferior antiguo). Si dos derivaciones inferiores contiguas mostraran elevación del ST ≥ 1 mm con descenso en I/aVL, sería un IAMCEST inferior agudo: actuar ya. El mismo grupo de derivaciones, dos urgencias opuestas: el siguiente ECG es justo eso.',
          ),
          highlightLeads: ['II', 'III', 'aVF'],
        },
        {
          title: l('按严重程度收尾', 'Ending in severity order', 'Cierre por orden de gravedad'),
          body: l(
            '"1. 下壁导联病理性 Q 波伴 T 波改变——**陈旧性下壁心肌梗死**（何时发生的？追问病史、调旧图、做超声）。2. 窦性心律不齐，正常。紧急程度：常规——今天不需要导管室，但梗死史与二级预防必须核查。"——平凡的节律，不平凡的发现。',
            '"1. Pathological Q waves with T-wave changes in the inferior leads — **old inferior myocardial infarction** (when? ask the patient, pull old tracings, order an echo). 2. Sinus arrhythmia, normal. Urgency: routine — no cath lab today, but the infarct history and secondary prevention must be checked." — An ordinary rhythm, a far from ordinary finding.',
            '«1. Ondas Q patológicas con alteración de la T en las derivaciones inferiores: **infarto de miocardio inferior antiguo** (¿cuándo? preguntar al paciente, recuperar ECG previos, solicitar un ecocardiograma). 2. Arritmia sinusal, normal. Urgencia: rutina; hoy no hace falta hemodinámica, pero hay que confirmar el infarto y revisar la prevención secundaria». Un ritmo banal, un hallazgo nada banal.',
          ),
        },
      ],
    },
    { kind: 'check', item: { inline: hiddenStemi } },
    {
      kind: 'contrast',
      title: l('同一组导联，相反的箱子', 'Same lead group, opposite bins', 'El mismo grupo de derivaciones, categorías opuestas'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVF', 'aVL'] },
      left: {
        ecg: real(2627),
        caption: l('第 6 份（45 岁男性）：下壁 Q 波，ST 在基线——陈旧性心梗，常规', 'Tracing 6 (man, 45): inferior Q waves, ST on the baseline — old MI, routine', 'ECG 6 (varón, 45 años): Q inferiores, ST en la línea de base; IAM antiguo, rutina'),
      },
      right: {
        ecg: real(12899),
        caption: l('第 7 份（67 岁女性）：下壁 ST 抬高，aVL 镜像压低——急性 STEMI，现在处理', 'Tracing 7 (woman, 67): inferior ST elevation, reciprocal depression in aVL — acute STEMI, act now', 'ECG 7 (mujer, 67 años): elevación del ST inferior, descenso recíproco en aVL; IAMCEST agudo, actuar ya'),
      },
      point: l(
        '两份图都是“下壁”，决定紧迫度的却是 **ST 段**，不是 Q 波，也不是申请单。左边：Q 波是已经发生的事，ST 回到基线，没有镜像——常规处理，查二级预防。右边：ST 弓背抬高，III 与 aVF 最高，aVL 反向压低——正在发生的事，每一分钟都在丢心肌。门诊流里，前一份的平静不能让你在后一份的 ST 上偷懒。',
        'Both tracings are "inferior", yet the urgency is set by the **ST segment** — not by the Q waves and not by the request slip. Left: the Q waves are something that already happened; the ST is back on the baseline with no reciprocal change — routine, check secondary prevention. Right: convex ST elevation, highest in III and aVF, with the mirror-image depression in aVL — something happening now, with myocardium lost every minute. In a clinic stream, the calm of the last tracing must not make you skip the ST of the next one.',
        'Los dos ECG son «inferiores», pero la urgencia la fija el **segmento ST**, no las ondas Q ni la petición. Izquierda: las Q son algo que ya ocurrió; el ST ha vuelto a la línea de base y no hay cambio recíproco: rutina y revisar la prevención secundaria. Derecha: elevación convexa del ST, máxima en III y aVF, con el descenso en espejo de aVL: algo que está ocurriendo ahora, con miocardio perdido cada minuto. En una serie de consulta, la calma del ECG anterior no puede hacer que te saltes el ST del siguiente.',
      ),
    },
    {
      kind: 'ecg',
      ecg: real(18776),
      view: GRID,
      caption: l(
        '门诊流第 8 份：35 岁男性。年轻人，胸前导联很高——正常还是疾病？**先写报告，再读下一段**。',
        'Tracing 8: a 35-year-old man. A young man with very tall chest leads — normal or disease? **Write the report first, then read the next block**.',
        'ECG 8: varón de 35 años. Un joven con precordiales muy altas: ¿normal o enfermedad? **Escribe primero el informe y luego lee el siguiente bloque**.',
      ),
    },
    {
      kind: 'text',
      title: l('第 8 份小结：电压、年龄与运动员标准', 'Tracing 8 debrief: voltage, age and the athlete criteria', 'ECG 8: voltaje, edad y los criterios del deportista'),
      body: l(
        '窦性心律约 53 次/分（窦性心动过缓）；S(V1) 约 16 mm + R(V5) 约 30 mm ≈ **Sokolow 46 mm > 35 mm**——电压标准阳性，心脏科医师也标注了“左心室肥厚”。ST 段等电位，侧壁 T 波直立，没有病理性 Q 波，QRS 约 100 ms。\n- 报告的描述层照实写：“**符合左心室肥厚的电压标准**，无继发性 ST–T 改变”。\n- 解读要看人：年轻、男性、胸壁薄者电压本来就高；若他是运动员，2017 国际运动员标准（h9）把**孤立的 QRS 电压标准**列为训练相关，无需进一步检查。电压标准的敏感度本就很低（约 10–25%）——单凭电压既不能确诊也不能排除肥厚。\n- 会改变结论的：侧壁 T 波倒置、ST 压低、病理性 Q 波、高血压或杂音、症状——出现任何一项都要做超声。\n- 把这份图写成“LVH，紧急转诊”是过度；写成“正常”是漏报。正确的报告**写出电压，再写出它在这个人身上的意义**。',
        'Sinus rhythm at about 53/min (sinus bradycardia); S in V1 about 16 mm + R in V5 about 30 mm ≈ **Sokolow 46 mm > 35 mm** — the voltage criterion is met, and the cardiologists labelled "LVH". The ST segments are isoelectric, lateral T waves upright, no pathological Q waves, QRS about 100 ms.\n- The descriptive layer of the report states it as it is: "**voltage criteria for LVH**, no secondary ST–T changes".\n- The interpretation depends on the person: voltage runs high anyway in young men with thin chests; if he is an athlete, the 2017 international athlete criteria (h9) classify **isolated QRS voltage** as training-related, with no work-up needed. Voltage criteria are insensitive anyway (about 10–25 %) — voltage alone neither proves nor excludes hypertrophy.\n- What would change the verdict: lateral T inversion, ST depression, pathological Q waves, hypertension or a murmur, symptoms — any one of these calls for an echo.\n- Writing this tracing up as "LVH, urgent referral" is over-calling; writing "normal" is under-reporting. The right report **states the voltage, then what it means in this person**.',
        'Ritmo sinusal a unas 53 lpm (bradicardia sinusal); S en V1 de unos 16 mm + R en V5 de unos 30 mm ≈ **Sokolow 46 mm > 35 mm**: se cumple el criterio de voltaje, y los cardiólogos etiquetaron «HVI». El ST es isoeléctrico, las T laterales son positivas, no hay ondas Q patológicas y el QRS mide unos 100 ms.\n- La capa descriptiva del informe lo dice tal cual: «**criterios de voltaje de HVI**, sin alteraciones secundarias del ST–T».\n- La interpretación depende de la persona: el voltaje ya es alto en varones jóvenes con tórax delgado; si es deportista, los criterios internacionales de 2017 (h9) consideran el **voltaje del QRS aislado** relacionado con el entrenamiento y sin necesidad de estudio. Además, los criterios de voltaje son poco sensibles (en torno al 10–25 %): el voltaje por sí solo ni demuestra ni descarta la hipertrofia.\n- Lo que cambiaría el veredicto: inversión de la T lateral, descenso del ST, ondas Q patológicas, hipertensión o un soplo, síntomas; cualquiera de ellos pide un ecocardiograma.\n- Informar este ECG como «HVI, derivación urgente» es sobrediagnosticar; escribir «normal» es omitir. El informe correcto **dice el voltaje y luego qué significa en esta persona**.',
      ),
    },
    {
      kind: 'real',
      ids: [2594, 14874, 6727],
      caption: l(
        '门诊流第 9–11 份：58 岁女性、47 岁男性、28 岁女性。慢一点的、呼吸起伏的、PR 长一点的——都是“正常或次要”。每份写十行，并给出精确的措辞：心动过缓有几次？PR 超过 200 ms 吗？窦性心律不齐是正常现象，不是发现。',
        'Tracings 9–11: a 58-year-old woman, a 47-year-old man, a 28-year-old woman. A slower one, one that breathes, one with a longer PR — all "normal or minor". Write ten lines each, with precise wording: how slow is the bradycardia? Is the PR over 200 ms? Sinus arrhythmia is normal, not a finding.',
        'ECG 9 a 11: mujer de 58 años, varón de 47 y mujer de 28. Uno algo lento, otro que respira, otro con un PR algo largo: todos «normales o menores». Escribe diez líneas para cada uno con palabras precisas: ¿a cuánto va la bradicardia? ¿Supera el PR los 200 ms? La arritmia sinusal es normal, no un hallazgo.',
      ),
    },
    { kind: 'check', item: { family: 'spot-real', seed: 3 } },
    { kind: 'check', item: { family: 'rhythm-real', seed: 4 } },
    { kind: 'check', item: { family: 'spot-real', seed: 7 } },
    { kind: 'drill', families: ['spot-real', 'findings-real'], count: 10, passScore: 0.8 },
    {
      kind: 'real',
      ids: [2739, 2466, 17835],
      caption: l(
        '门诊堆里剩下的三份：89 岁男性、73 岁女性、76 岁男性。每份先按十步写完整报告——快而规则的那份，先在 II/III/aVF 找锯齿波并数出心房率；另外两份，找一找提前且形态不同的 P 波，并量一量 PR。写完再揭晓。',
        'The last three in the clinic pile: an 89-year-old man, a 73-year-old woman, a 76-year-old man. Write the full ten-step report on each first — in the fast, regular one, hunt the sawtooth in II/III/aVF and count the atrial rate; in the other two, look for an early P wave of a different shape, and measure the PR. Reveal only after writing.',
        'Los tres últimos de la pila de consulta: varón de 89 años, mujer de 73 y varón de 76. Escribe primero el informe completo de diez pasos de cada uno: en el rápido y regular, busca el diente de sierra en II/III/aVF y cuenta la frecuencia auricular; en los otros dos, busca una P precoz de morfología distinta y mide el PR. Mira la solución solo después de escribir.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把正常变异过度诊断：早期复极当 STEMI、年轻人的电压当肥厚——门诊流奖励“报得出理由的良性”，惩罚过度诊断。',
          'Over-calling normal variants: early repolarisation as STEMI, young voltage as hypertrophy — the clinic stream rewards a benign call you can defend and punishes over-calling.',
          'Sobrediagnosticar variantes normales: repolarización precoz como IAMCEST, voltaje juvenil como hipertrofia; la serie de consulta premia lo benigno bien argumentado y castiga el exceso.',
        ),
        l(
          '一连串正常图之后的那份 STEMI 被漏掉：报完节律就停笔，ST 段从没看过——“前面都正常”成了借口。',
          'The STEMI after a run of normals missed: the rhythm named, the pen down, the ST segments never read — with "the others were all normal" as the excuse.',
          'El IAMCEST que llega tras una racha de normales se pierde: se nombra el ritmo, se baja el boli y el ST no se llega a mirar, con «los anteriores eran normales» como excusa.',
        ),
        l(
          '节律命名后不再读 QRS 与 ST——第 1 份的 QRS 116 ms 和第 6 份的 Q 波都藏在这条错误后面。',
          'Naming the rhythm and never reading the QRS or the ST — the 116 ms QRS of tracing 1 and the Q waves of tracing 6 both hide behind this error.',
          'Nombrar el ritmo y no seguir con el QRS ni el ST: los 116 ms del QRS del ECG 1 y las ondas Q del ECG 6 se esconden tras este error.',
        ),
        l(
          '只写“正常”而不写数字：五份正常图里，任何一份的 PR 或 QTc 都可能是第一个异常。',
          'Writing "normal" without the numbers: in five normal tracings, any one PR or QTc could have been the first abnormality.',
          'Escribir «normal» sin las cifras: en cinco ECG normales, cualquier PR o QTc podría haber sido la primera alteración.',
        ),
        l(
          '机器判读照抄进门诊病历：自动判读必须由有资质的读者复核，其错误集中在节律，且识别不了电极接反（o12）。',
          'Copying the machine statement into the clinic note: the automated statement must be confirmed by a qualified reader — its errors cluster in rhythm and it misses electrode reversals (o12).',
          'Copiar la interpretación automática en la historia clínica: la lectura automática debe confirmarla un lector cualificado; sus errores se concentran en el ritmo y no detecta las inversiones de electrodos (o12).',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '门诊心电图按患病率到来：多数正常或接近正常——先以此校准预期，再开始读。',
          'Clinic ECGs arrive by prevalence: most are normal or near-normal — calibrate to that before you start reading.',
          'Los ECG de consulta llegan según la prevalencia: la mayoría son normales o casi normales; calibra con eso antes de empezar a leer.',
        ),
        l(
          'x1 的固定顺序是筛子：每份图十步走完，从记录检查到紧急程度与下一步。',
          'The fixed order from x1 is the sieve: ten steps on every tracing, from the recording check to urgency and next action.',
          'El orden fijo de x1 es el tamiz: diez pasos en cada ECG, de la comprobación del registro a la urgencia y el siguiente paso.',
        ),
        l(
          '同一组导联，ST 定箱：下壁 Q 波 + ST 在基线是常规，下壁 ST 抬高 + 镜像压低是现在处理——申请单写什么都不改变它。',
          'Same lead group, the ST sets the bin: inferior Q waves with the ST on the baseline are routine; inferior ST elevation with a reciprocal change is act now — whatever the request slip says.',
          'Mismo grupo de derivaciones, el ST decide: Q inferiores con el ST en la línea de base son rutina; elevación del ST inferior con cambio recíproco es actuar ya, diga lo que diga la petición.',
        ),
        l(
          '过度诊断正常变异是最常见错误；电压之类的发现先如实描述，再结合这个人解读；机器判读必须逐份复核（o12）。',
          'Over-calling normal variants is the commonest error; describe findings such as voltage as they are, then interpret them in this person; the machine statement must be over-read on every tracing (o12).',
          'Sobrediagnosticar variantes normales es el error más frecuente; describe hallazgos como el voltaje tal cual y luego interprétalos en esa persona; la lectura automática debe revisarse ECG a ECG (o12).',
        ),
      ],
    },
  ],
  sources: [
    'Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Thygesen K et al. Fourth universal definition of myocardial infarction (2018). Eur Heart J 2019;40:237-269',
    'Drezner JA et al. International recommendations for electrocardiographic interpretation in athletes. J Am Coll Cardiol 2017;69:1057-1075',
    'Castellano et al. 2004',
  ],
};

export default lesson;
