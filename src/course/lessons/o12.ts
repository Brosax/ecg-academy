/**
 * o12 — Computer interpretation and automation bias (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `basics-technique-leads-paper` "Missing in the book" bullets
 * "Computer interpretation — Overreading" (Schläpfer & Wellens 2017; Kligfield Part I) and
 * "Interval measurement — global measurement and computer over-reading"; Part II diagnostic statement list.
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
  id: 'o12',
  stage: 'O',
  order: 12,
  title: l('计算机自动判读与自动化偏倚', 'Computer interpretation and automation bias', 'Interpretación automática y sesgo de automatización'),
  summary: l(
    '机器打印的判读是一个待检验的假设，不是可以照签的诊断：每份心电图都要人工复核——机器的错误集中在节律（伪差当房颤、起搏心律）、电极接反和过度诊断的缺血；打印出来的那行字会锚定你的读图，即使你知道这一效应也躲不开。先自己读，再对比，把机器判读当作又一个数据点，分歧写进病历。',
    'The printed interpretation is a hypothesis to test, not a diagnosis to sign: every ECG must be over-read by a qualified reader — machine errors cluster in rhythm (artefact called AF, paced rhythms), electrode reversals and over-called ischaemia — and a printed statement anchors your read even when you know about the effect. Read first, compare after, treat the statement as one more data point, and document disagreement.',
    'La interpretación impresa es una hipótesis que hay que comprobar, no un diagnóstico que firmar: todo ECG debe revisarse mediante sobrelectura de un lector cualificado —los errores de la máquina se concentran en el ritmo (artefacto llamado FA, ritmos con marcapasos), en la inversión de electrodos y en la isquemia sobrediagnosticada— y una conclusión impresa ancla tu lectura incluso cuando conoces el efecto. Lee primero, compara después, trata la interpretación como un dato más y documenta el desacuerdo.',
  ),
  objectives: [
    l(
      '说明为什么每一条自动判读都必须由有资质的读者复核，以及机器的错误集中在哪里。',
      'State why every automated statement must be over-read by a qualified reader, and where machine errors cluster.',
      'Explicar por qué toda interpretación automática debe revisarse mediante sobrelectura por un lector cualificado y dónde se concentran los errores de la máquina.',
    ),
    l(
      '在看到打印结论之前，先按 s1 的固定顺序完成自己的系统读图。',
      'Complete your own systematic read in the fixed s1 order before looking at the printed statement.',
      'Completar tu propia lectura sistemática en el orden fijo de s1 antes de mirar la interpretación impresa.',
    ),
    l(
      '定义自动化偏倚，并用固定流程防护：先读后比、把结论当数据点、记录分歧。',
      'Define automation bias and defend yourself with a fixed workflow: read first and compare after, treat the statement as a data point, document disagreement.',
      'Definir el sesgo de automatización y protegerte con un flujo fijo: leer primero y comparar después, tratar la conclusión como un dato más y documentar el desacuerdo.',
    ),
    l(
      '正确使用机器的长处（全局间期测量），并明白它为什么比单导联手工测量略长。',
      "Use the machine's strength (global interval measurement) and understand why it runs slightly longer than single-lead manual values.",
      'Aprovechar el punto fuerte de la máquina (la medición global de los intervalos) y entender por qué da valores algo más largos que la medición manual en una sola derivación.',
    ),
  ],
  minutes: 13,
  competencies: ['C11', 'C12'],
  findings: ['nonspecific-st-t', 'normal-ecg'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('nonspecific-st-t', 1621),
      view: { layout: '3x4+1', highlightLeads: ['I', 'aVL', 'V6'] },
      question: l(
        '机器在这份心电图顶端打印了一行字："非特异性 ST-T 改变，请考虑缺血。"先别管它——你自己把图读完：你的判读是什么？',
        'The machine printed a line at the top of this ECG: "Non-specific ST-T changes, consider ischaemia." Ignore it for a moment — read the tracing yourself first: what is YOUR statement?',
        'La máquina imprimió una línea encima de este ECG: «Alteraciones inespecíficas del ST-T, valorar isquemia». Ignórala un momento y lee primero el trazado tú: ¿cuál es TU conclusión?',
      ),
      reveal: l(
        '窦性心律约 72 次/分；PR、QRS、QT 和电轴都正常；没有 ST 抬高或压低，没有病理性 Q 波，没有对应改变；胸前 R 波递增正常。唯一"不教科书"的地方：**侧壁导联（I、aVL、V5–V6）的 T 波轻度低平**。对形态本身，仔细的读者和机器的结论其实一样——差别在"考虑缺血"这半句：它是**一个假设**，要拿患者的情况、用药、电解质和既往心电图去检验，而不是抄进诊断。**机器判读是假设，不是诊断**——本课讲的就是怎样使用它而不被它使用。',
        'Sinus rhythm at about 72/min; PR, QRS, QT and axis all normal; no ST elevation or depression, no pathological Q waves, no reciprocal change; normal R-wave progression. The only departure from textbook normal is **mildly flattened T waves in the lateral leads (I, aVL, V5–V6)**. On the morphology itself a careful reader agrees with the machine — the difference is the second half of its sentence, "consider ischaemia": that is **a hypothesis**, to be tested against the patient, the drugs, the electrolytes and the old ECGs, not a diagnosis to copy. **The machine statement is a hypothesis, not a diagnosis** — this lesson is about using it without being used by it.',
        'Ritmo sinusal a unos 72 lpm; PR, QRS, QT y eje normales; sin elevación ni descenso del ST, sin ondas Q patológicas, sin cambios recíprocos; progresión normal de la R. La única desviación de la normalidad de libro es una **T levemente aplanada en las derivaciones laterales (I, aVL, V5-V6)**. En la morfología, un lector cuidadoso coincide con la máquina; la diferencia está en la segunda mitad de su frase, «valorar isquemia»: eso es **una hipótesis**, que debe contrastarse con el paciente, los fármacos, los electrolitos y los ECG previos, no un diagnóstico para copiar. **La interpretación de la máquina es una hipótesis, no un diagnóstico**: esta lección trata de usarla sin que ella te use a ti.',
      ),
    },
    {
      kind: 'criteria',
      title: l('自动判读复核卡', 'The over-reading card', 'La tarjeta de sobrelectura'),
      items: [
        {
          label: l('复核义务', 'The over-reading duty', 'La obligación de sobrelectura'),
          value: l(
            '每条自动判读都必须经有资质的读者确认后才能签署；未复核的结论不能作为诊断进入病历',
            'Every automated statement must be confirmed by a qualified reader before it is signed; an unover-read statement must not enter the chart as a diagnosis',
            'Toda interpretación automática debe confirmarla un lector cualificado antes de firmarse; una conclusión no revisada no debe entrar en la historia clínica como diagnóstico',
          ),
        },
        {
          label: l('错误集中处', 'Where errors cluster', 'Dónde se concentran los errores'),
          value: l(
            '节律诊断（伪差当房颤、起搏心律）、电极接反（识别不可靠）、过度诊断的缺血（"非特异性 ST-T 改变"）',
            'Rhythm diagnosis (artefact called AF, paced rhythms), electrode reversals (not recognised reliably), over-called ischaemia ("non-specific ST-T changes")',
            'Diagnóstico del ritmo (artefacto llamado FA, ritmos estimulados), inversión de electrodos (no reconocida de forma fiable) e isquemia sobrediagnosticada («alteraciones inespecíficas del ST-T»)',
          ),
        },
        {
          label: l('自动化偏倚', 'Automation bias', 'Sesgo de automatización'),
          value: l(
            '打印的结论会锚定读者、改变判读——即使读者知道这一效应也照样起作用',
            'A printed statement anchors the reader and shifts the read — it works even on readers who know about the effect',
            'Una conclusión impresa ancla al lector y desvía su lectura: actúa incluso en quien conoce el efecto',
          ),
        },
        {
          label: l('防护流程', 'The protective workflow', 'El flujo protector'),
          value: l(
            '先自己读（固定顺序），后对比；把机器判读当作又一个数据点；分歧要记录',
            'Read yourself first (fixed order), compare after; treat the statement as one more data point; document disagreement',
            'Lee primero tú (orden fijo), compara después; trata la interpretación como un dato más; documenta el desacuerdo',
          ),
        },
        {
          label: l('全局间期测量', 'Global interval measurement', 'Medición global de los intervalos'),
          value: l(
            '机器的 PR/QRS/QT 取全导联最早起点到最晚终点，系统性地略长于单导联手工值；同样要复核',
            'Machine PR/QRS/QT run from the earliest onset to the latest offset across all leads, systematically longer than single-lead manual values; over-read them too',
            'El PR/QRS/QT de la máquina van del inicio más precoz al final más tardío en todas las derivaciones, sistemáticamente más largos que los valores manuales de una derivación; también deben revisarse',
          ),
        },
      ],
      source:
        'Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192; Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    },
    {
      kind: 'film',
      title: l('机器在哪里出错', 'Where a machine goes wrong', 'Dónde se equivoca la máquina'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'II', 'III', 'aVF'] },
      frames: [
        {
          label: l('“房扑？”', '“Flutter?”', '«¿Flúter?»'),
          ecg: { kind: 'synth', req: { scenario: 'normal', seed: 1626, dials: { rate: 72 }, recording: { noise: { tremor: { mv: 0.1, hz: 5, on: 'LL' } } } } },
          note: l('机器可能打印“心房扑动？”。但QRS按规则的RR走过去，I导联干净：是左腿的震颤（o10）。', 'A machine may print “atrial flutter?”. But the QRS marches at a regular RR and lead I is clean: a tremor on the left leg (o10).', 'Una máquina puede imprimir «¿flúter auricular?». Pero el QRS desfila con un RR regular y la I está limpia: un temblor en la pierna izquierda (o10).'),
          marks: [{ auto: 'rr', lead: 'I' }],
        },
        {
          label: l('“电轴右偏”', '“Right axis”', '«Eje derecho»'),
          ecg: { kind: 'synth', req: { scenario: 'normal', seed: 1626, dials: { rate: 72 }, recording: { placement: { limbs: { RA: 'LA', LA: 'RA' } } } } },
          note: l('机器可能打印“电轴右偏”。I导联完全倒置，V1–V6却正常：是上肢导线接反了（o9）。', 'A machine may print “right axis deviation”. Lead I is fully inverted while V1–V6 are normal: the arm cables are swapped (o9).', 'Una máquina puede imprimir «desviación del eje a la derecha». La I está del todo invertida y V1–V6 son normales: los cables de los brazos están cambiados (o9).'),
          marks: [{ auto: 'p', lead: 'I' }],
        },
        {
          label: l('“左束支阻滞”', '“LBBB”', '«Bloqueo de rama izquierda»'),
          ecg: synth('paced-vvi', 1628, undefined, 'bipolar'),
          note: l('机器可能打印“左束支阻滞”。找那个小起搏钉：规则、宽、像左束支阻滞、正好60次/分的QRS，是起搏（o11）。', 'A machine may print “LBBB”. Find the small spike: a regular, wide, LBBB-like QRS at exactly 60/min is pacing (o11).', 'Una máquina puede imprimir «bloqueo de rama izquierda». Busca la espícula pequeña: un QRS regular, ancho, tipo bloqueo de rama izquierda y a 60 lpm justos es estimulación (o11).'),
          marks: [{ auto: 'pacing-spike' }],
        },
        {
          label: l('“缺血？”', '“Ischaemia?”', '«¿Isquemia?»'),
          ecg: synth('nonspecific-st-t', 1629),
          note: l('机器可能打印“非特异性ST–T改变，考虑缺血”。只是侧壁T波低平，ST没有偏移：这是一个假设。查药物、电解质，找旧图。', 'A machine may print “non-specific ST–T changes, consider ischaemia”. Only the lateral T waves are flat, the ST is level: a hypothesis. Check drugs, electrolytes, an old ECG.', 'Una máquina puede imprimir «alteraciones inespecíficas del ST-T, valorar isquemia». Solo las T laterales están aplanadas y el ST no se desvía: una hipótesis. Revisa fármacos, electrolitos y un ECG previo.'),
          marks: [{ auto: 't', lead: 'V6' }, { auto: 't', lead: 'I' }],
        },
      ],
      predict: {
        question: l('机器打印“心房颤动”，但RR规则、有一个导联干净。最可能是什么？', 'A machine prints “atrial fibrillation”, yet the RR is regular and one lead is clean. What is it most likely to be?', 'Una máquina imprime «fibrilación auricular», pero el RR es regular y una derivación está limpia. ¿Qué es lo más probable?'),
        options: [l('伪差', 'Artefact', 'Artefacto'), l('房颤', 'Atrial fibrillation', 'Fibrilación auricular'), l('房扑', 'Atrial flutter', 'Flúter auricular')],
        answer: 0,
      },
      caption: l(
        '每份都要复核，节律、导线错误和“缺血”要读两遍。先自己读，再逐项对比，签你自己的结论。',
        'Over-read everything, and read rhythm, cable errors and “ischaemia” twice. Read it yourself first, then compare item by item and sign your own statement.',
        'Revisa todo, y lee dos veces el ritmo, los errores de cables y la «isquemia». Lee tú primero, compara punto por punto y firma tu propia conclusión.',
      ),
    },
    {
      kind: 'worked',
      title: l('自己先读：s1 顺序，然后对比机器', 'Read it yourself: the s1 order, then compare', 'Lee tú primero: el orden de s1 y después compara'),
      ecg: synth('nonspecific-st-t', 1622),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('记录、心率、节律', 'Recording, rate, rhythm', 'Registro, frecuencia, ritmo'),
          body: l(
            '定标、纸速、伪差都正常，10 秒记录完整。RR 规则（约 830 ms ≈ 72 次/分）；每个 QRS 前都有窦性形态的 P（I、II、aVF 直立，aVR 倒置）。第一步结论：**窦性心律，心率正常**。',
            'Calibration, paper speed and artefact are fine, and the 10-s record is complete. The RR is regular (about 830 ms ≈ 72/min); a sinus-shaped P precedes every QRS (upright in I, II and aVF, inverted in aVR). Step one: **sinus rhythm at a normal rate**.',
            'Calibración, velocidad del papel y artefactos correctos; el registro de 10 s está completo. El RR es regular (unos 830 ms ≈ 72 lpm); una P de morfología sinusal precede a cada QRS (positiva en I, II y aVF, negativa en aVR). Primer paso: **ritmo sinusal con frecuencia normal**.',
          ),
          marks: [{ auto: 'rr' }],
          view: STRIP,
        },
        {
          title: l('间期', 'The intervals', 'Los intervalos'),
          body: l(
            'PR、QRS、QT 都在正常范围内——这正是机器擅长的部分：它的全局测量值得直接拿来用（前提是你知道它们为什么常比你单导联量的略长）。第二步结论：**间期正常**。',
            'PR, QRS and QT all sit within normal limits — exactly the part the machine is good at: its global measurements are worth using directly (once you know why they often run slightly longer than your single-lead calipers). Step two: **intervals normal**.',
            'El PR, el QRS y el QT están dentro de los límites normales, justo la parte en la que la máquina es buena: sus mediciones globales merece la pena usarlas directamente (en cuanto sabes por qué suelen dar algo más largas que tus medidas en una sola derivación). Segundo paso: **intervalos normales**.',
          ),
          marks: [{ auto: 'pr' }, { auto: 'qrs' }, { auto: 'qt' }],
          view: STRIP,
        },
        {
          title: l('形态：那行字的家', 'Morphology: where the sentence lives', 'Morfología: donde vive esa frase'),
          body: l(
            '逐导联走：R 波递增正常，无病理性 Q 波，无 ST 抬高或压低，电压不达左室肥厚标准，T 波除 **I、aVL、V5–V6 轻度低平**外均直立正常。整句"非特异性 ST-T 改变"的全部物质基础就是这几个侧壁 T 波。第三步结论：**孤立性侧壁 T 波低平，非特异性**。',
            'Lead by lead: normal R progression, no pathological Q waves, no ST elevation or depression, no LVH voltage, and T waves upright and normal except for **mild flattening in I, aVL and V5–V6**. The entire substance of "non-specific ST-T changes" is those few lateral T waves. Step three: **isolated lateral T-wave flattening, non-specific**.',
            'Derivación a derivación: progresión de la R normal, sin ondas Q patológicas, sin elevación ni descenso del ST, sin voltajes de HVI y ondas T positivas y normales salvo un **aplanamiento leve en I, aVL y V5-V6**. Toda la sustancia de «alteraciones inespecíficas del ST-T» son esas pocas ondas T laterales. Tercer paso: **aplanamiento aislado de la T lateral, inespecífico**.',
          ),
          marks: [{ auto: 't', lead: 'aVL' }, { auto: 't', lead: 'V6' }],
          highlightLeads: ['I', 'aVL', 'V5', 'V6'],
          view: { layout: '3x4+1', highlightLeads: ['I', 'aVL', 'V5', 'V6'] },
        },
        {
          title: l('对比与结论', 'Compare and conclude', 'Compara y concluye'),
          body: l(
            '现在揭开机器那行字："非特异性 ST-T 改变，考虑缺血。"逐条对比：形态一致；"考虑缺血"是假设。你写下的应该是：窦性心律，间期与电轴正常，侧壁 T 波低平，非特异性——建议结合临床并**与既往心电图对比**。机器不能问患者、不能查血钾、不能调出三年前的图——**这些只能你来做**。这就是复核。',
            'Now uncover the line: "Non-specific ST-T changes, consider ischaemia." Compare item by item: the morphology agrees; "consider ischaemia" is the hypothesis. What you write is: sinus rhythm, normal intervals and axis, non-specific lateral T-wave flattening — correlate clinically and **compare with a previous ECG**. The machine cannot ask the patient, check the potassium or pull the tracing from three years ago — **only you can**. That is over-reading.',
            'Ahora descubre la línea: «Alteraciones inespecíficas del ST-T, valorar isquemia». Compara punto por punto: la morfología coincide; «valorar isquemia» es la hipótesis. Lo que tú escribes: ritmo sinusal, intervalos y eje normales, aplanamiento inespecífico de la T lateral; correlacionar con la clínica y **comparar con un ECG previo**. La máquina no puede interrogar al paciente, pedir la potasemia ni sacar el ECG de hace tres años: **eso solo puedes hacerlo tú**. Eso es la sobrelectura.',
          ),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('被标记的图与"正常"之间', 'Between flagged and "normal"', 'Entre lo marcado y «normal»'),
      view: { layout: '3x4+1', highlightLeads: ['I', 'aVL', 'V6'] },
      left: {
        ecg: synth('nonspecific-st-t', 1623),
        caption: l('机器："非特异性 ST-T 改变，考虑缺血"', 'Machine: "Non-specific ST-T changes, consider ischaemia"', 'Máquina: «Alteraciones inespecíficas del ST-T, valorar isquemia»'),
        marks: [{ auto: 't', lead: 'aVL' }],
      },
      right: {
        ecg: synth('normal', 1624),
        caption: l('机器："正常心电图"', 'Machine: "Normal ECG"', 'Máquina: «ECG normal»'),
        marks: [{ auto: 't', lead: 'aVL' }],
      },
      point: l(
        '两张图心率相同、间期相同、都没有 ST 偏移——差别只在侧壁 T 波那零点几毫米的振幅。单看图，这条界线确实划不开：这才是"非特异性"的本义。能划开它的是图以外的证据：症状、用药、电解质，以及最有力的——**既往心电图**。T 波低平是新出现的，还是十年一直如此？机器永远问不出这个问题。',
        'Same rate, same intervals, no ST shift in either — the difference is a fraction of a millimetre of T amplitude in the lateral leads. From the tracing alone that border genuinely cannot be drawn: that is what "non-specific" means. What draws it is evidence outside the tracing: symptoms, drugs, electrolytes and, most powerful of all, **an old ECG**. Is the flattening new, or has it looked like this for ten years? The machine can never ask that question.',
        'Misma frecuencia, mismos intervalos y sin desviación del ST en ninguna: la diferencia es una fracción de milímetro en la amplitud de la T lateral. Solo con el trazado, esa frontera no puede trazarse de verdad, y eso es lo que significa «inespecífico». Lo que la traza es la evidencia externa: síntomas, fármacos, electrolitos y, sobre todo, **un ECG previo**. ¿El aplanamiento es nuevo o lleva diez años igual? La máquina nunca puede hacer esa pregunta.',
      ),
    },
    {
      kind: 'film',
      title: l('用它的数字，再核对', 'Use its numbers, then check them', 'Usa sus números y luego compruébalos'),
      view: { layout: 'strip', lead: 'V2' },
      frames: [
        {
          label: l('T波终点清楚', 'Clear T end', 'Final de T nítido'),
          ecg: synth('normal', 1625, { rate: 60 }),
          note: l('T波终点清楚、没有U波：QT约405 ms，机器和你都容易量准。', 'A clear T end and no U: the QT is about 405 ms, easy to measure for a machine and for you.', 'Final de T nítido y sin U: el QT mide unos 405 ms, fácil de medir para la máquina y para ti.'),
          marks: [{ auto: 'qt' }],
        },
        {
          label: l('大U波', 'Big U wave', 'U grande'),
          ecg: synth('hypokalemia', 1625, { rate: 60 }),
          note: l('T波低平、U波高大：量到T波终点QT仍约405 ms，一直量到U波终点却约565 ms。机器可能这样量；自己用切线法量（h7）。', 'A flat T and a big U: to the end of the T the QT is still about 405 ms, run to the end of the U it reads about 565 ms. A machine may do that; measure it yourself with the tangent (h7).', 'T plana y U grande: hasta el final de la T el QT sigue en unos 405 ms; llevado hasta el final de la U marca unos 565 ms. Una máquina puede hacerlo; mídelo tú con la tangente (h7).'),
          marks: [{ auto: 't' }, { auto: 'u' }, { auto: 'qt' }],
        },
        {
          label: l('房颤', 'AF', 'FA'),
          ecg: synth('atrial-fibrillation', 1627),
          note: l('房颤约100次/分：RR从约350到1100 ms不等，用平均RR算出的一个QTc并不可靠。多量几个心搏。', 'AF at about 100/min: the RR runs from about 350 to 1100 ms, so one QTc from the average RR is shaky. Measure several beats.', 'FA a unos 100 lpm: el RR va de unos 350 a 1100 ms, así que un único QTc con el RR medio es poco fiable. Mide varios latidos.'),
          marks: [{ auto: 'rr' }],
        },
      ],
      predict: {
        question: l('低钾时U波很大。如果机器把QT量到U波终点，它的QT会怎样？', 'With low potassium the U wave is big. If a machine runs the QT to the end of the U, its QT will be…', 'Con potasio bajo la U es grande. Si una máquina lleva el QT hasta el final de la U, su QT será…'),
        options: [l('太长', 'Too long', 'Demasiado largo'), l('太短', 'Too short', 'Demasiado corto'), l('正确', 'Right', 'Correcto')],
        answer: 0,
      },
      caption: l(
        '机器的强项是测量：用它的PR、QRS和QT，但T波终点不清、U波显著或心律不齐时，自己再量一次。',
        'Measurement is the machine’s strength: use its PR, QRS and QT, but measure again yourself when the T end is unclear, the U is prominent or the rhythm is irregular.',
        'Medir es el punto fuerte de la máquina: usa su PR, QRS y QT, pero vuelve a medir tú cuando el final de la T no es claro, la U es prominente o el ritmo es irregular.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'qtc-calculator' },
      caption: l(
        '用切线法自己量出QT，再试各个公式：心率快或慢时它们相差很大，一个打印出来的QTc会把这点藏起来。',
        'Measure the QT yourself with the tangent method, then try each formula: at fast or slow rates they disagree, and one printed QTc hides that.',
        'Mide tú el QT con la tangente y prueba cada fórmula: con frecuencias rápidas o lentas discrepan, y un único QTc impreso lo oculta.',
      ),
    },
    { kind: 'check', item: { family: 'spot', seed: 4 } },
    { kind: 'check', item: { family: 'spot', seed: 11 } },
    { kind: 'check', item: { family: 'findings', seed: 3 } },
    { kind: 'drill', families: ['spot', 'spot-real'], count: 10, passScore: 0.8 },
    {
      kind: 'real',
      ids: [7947, 1579],
      caption: l(
        '两份真实心电图，机器的标注都落在"非特异性"一类里（一份非特异性 ST-T 改变、一份 T 波低平）。先自己完整读图——心率、节律、间期、电轴、形态——先想好你的判读，然后才揭晓标签。你同意机器吗？不同意的地方，用你会写进病历的话说出来。',
        'Two real tracings whose machine labels both fall in the "non-specific" family (one non-specific ST-T change, one low T). Read each one fully yourself first — rate, rhythm, intervals, axis, morphology — commit to your statement, and only then reveal the labels. Do you agree with the machine? Where you do not, say it in the words you would put in the chart.',
        'Dos ECG reales cuyas etiquetas de máquina caen en la familia de lo «inespecífico» (una alteración inespecífica del ST-T y una T de bajo voltaje). Lee primero cada uno por tu cuenta —frecuencia, ritmo, intervalos, eje, morfología—, decide tu conclusión y solo después descubre las etiquetas. ¿Estás de acuerdo con la máquina? Donde no lo estés, dilo con las palabras que pondrías en el informe.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '看都不看就签机器的判读：复核不是可选项，每条自动判读都必须经有资质的读者确认。',
          'Signing the machine statement unread: over-reading is not optional — every automated statement must be confirmed by a qualified reader.',
          'Firmar la interpretación de la máquina sin leerla: la sobrelectura no es opcional; toda interpretación automática debe confirmarla un lector cualificado.',
        ),
        l(
          '把"考虑缺血"当诊断抄进病历：这是对冲措辞，意思是"去结合临床"，不是"就是缺血"。',
          'Copying "consider ischaemia" into the chart as a diagnosis: it is a hedge meaning "correlate clinically", not "this is ischaemia".',
          'Copiar «valorar isquemia» en la historia como diagnóstico: es una fórmula de prudencia que significa «correlaciona con la clínica», no «esto es isquemia».',
        ),
        l(
          '机器说"房颤"就当房颤处理：震颤伪差的 QRS 按规则 RR 行进、总有一个干净导联（o10）；起搏心律也常被误标（o11）。',
          'Acting on a machine statement of "AF": in tremor artefact the QRS marches at a regular RR and one lead is always clean (o10); paced rhythms are also often mislabelled (o11).',
          'Actuar porque la máquina dice «FA»: en el artefacto de temblor los QRS avanzan con RR regular y siempre hay una derivación limpia (o10); los ritmos estimulados también se etiquetan mal a menudo (o11).',
        ),
        l(
          '为了显得独立而刻意反驳机器：机器对你错时，先弄清自己漏了什么——过度纠偏和盲从是同一个错误的两面。',
          'Contradicting the machine just to seem independent: when it is right and you were wrong, find out what you missed — over-correcting and blind trust are two faces of the same error.',
          'Contradecir a la máquina solo por aparentar independencia: cuando ella acierta y tú te equivocas, averigua qué se te escapó; corregir en exceso y confiar a ciegas son dos caras del mismo error.',
        ),
        l(
          '发现分歧却不说：不写下来的异议传不下去——下一个读者会把机器的结论当成事实。',
          'Staying silent about a disagreement: an objection that is not written down does not travel — the next reader inherits the machine statement as fact.',
          'Callarte un desacuerdo: una objeción que no se escribe no se transmite; el siguiente lector heredará la conclusión de la máquina como un hecho.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '机器判读是假设，不是诊断：每份心电图先自己读，再对比，然后签你自己的判读。',
          'The machine statement is a hypothesis, not a diagnosis: read every ECG yourself first, compare after, and sign your own interpretation.',
          'La interpretación de la máquina es una hipótesis, no un diagnóstico: lee primero cada ECG tú, compara después y firma tu propia conclusión.',
        ),
        l(
          '错误集中在三处：节律（伪差当房颤、起搏心律）、电极接反、过度诊断的缺血——这三处读两遍。',
          'Errors cluster in three places: rhythm (artefact called AF, paced rhythms), electrode reversals, and over-called ischaemia — read those twice.',
          'Los errores se concentran en tres puntos: el ritmo (artefacto llamado FA, ritmos estimulados), la inversión de electrodos y la isquemia sobrediagnosticada; léelos dos veces.',
        ),
        l(
          '自动化偏倚会锚定你的判读，即使你知道它存在；防它靠流程：先读后比、当数据点、记录分歧。',
          'Automation bias anchors your read even when you know it exists; the workflow defeats it: read first, compare after, treat it as a data point, document disagreement.',
          'El sesgo de automatización ancla tu lectura aunque sepas que existe; lo vence el flujo de trabajo: leer primero, comparar después, tratarla como un dato más y documentar el desacuerdo.',
        ),
        l(
          '机器的长处是测量：全局间期（最早起点到最晚终点）略长于单导联手工值——用它的数，也复核它的数。',
          "The machine's strength is measurement: global intervals (earliest onset to latest offset) run longer than single-lead manual values — use its numbers and over-read them too.",
          'El punto fuerte de la máquina es medir: los intervalos globales (del inicio más precoz al final más tardío) dan más largos que los manuales de una sola derivación; usa sus cifras y revísalas también.',
        ),
        l(
          '"非特异性 ST-T 改变"多数不是缺血：找原因（药物、电解质、过度通气、左室肥厚），并和既往心电图对比。',
          '"Non-specific ST-T changes" is mostly not ischaemia: look for a reason (drugs, electrolytes, hyperventilation, LVH) and compare with an old ECG.',
          'Las «alteraciones inespecíficas del ST-T» casi nunca son isquemia: busca un motivo (fármacos, electrolitos, hiperventilación, HVI) y compara con un ECG previo.',
        ),
      ],
    },
  ],
  sources: [
    'Schläpfer J, Wellens HJ. Computer-interpreted electrocardiograms. J Am Coll Cardiol 2017;70:1183-1192',
    'Kligfield P et al. AHA/ACCF/HRS Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
