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
      kind: 'text',
      title: l('先复核，再签名', 'Over-read, then sign', 'Sobrelee, luego firma'),
      body: l(
        '现代心电图机几乎都会在图上打印一份自动判读。它有用——但规则只有一条：**每一条自动判读都必须经有资质的读者复核后才能签署**；未经复核的结论不能作为诊断进入病历。\n- 机器擅长的是**测量**：PR、QRS、QT 的全局测量又快又稳。\n- 机器做不到的是**把图形和患者联系起来**：它看不见胸痛，看不见地高辛，看不见三年前那张正常图。\n- 于是它的措辞充满对冲："非特异性 ST-T 改变……考虑缺血，建议结合临床"。翻译过来就是："侧壁的 T 波有点平，我不知道为什么。"\n复核不是客气地点头：自己按顺序读一遍图，逐条同意或反对，然后**签你自己的判读**。',
        'Modern electrocardiographs almost all print an automated interpretation on the tracing. It is useful — but there is one rule only: **every automated statement must be over-read by a qualified reader before it is signed**; an unover-read statement must not enter the chart as a diagnosis.\n- What the machine is good at is **measurement**: global PR, QRS and QT, fast and stable.\n- What it cannot do is **connect the tracing to the patient**: it cannot see the chest pain, the digoxin, or the normal ECG from three years ago.\n- So its wording hedges: "Non-specific ST-T changes… consider ischaemia, correlate clinically." Translated, that means: "The lateral T waves are a bit flat, and I do not know why."\nOver-reading is not a polite nod: read the tracing yourself in order, agree or disagree item by item, and **sign your own statement**.',
        'Los electrocardiógrafos modernos casi todos imprimen una interpretación automática en el trazado. Es útil, pero solo hay una regla: **toda interpretación automática debe revisarse mediante sobrelectura de un lector cualificado antes de firmarse**; una conclusión no revisada no debe entrar en la historia clínica como diagnóstico.\n- Lo que la máquina hace bien es **medir**: PR, QRS y QT globales, rápidos y estables.\n- Lo que no puede hacer es **relacionar el trazado con el paciente**: no ve el dolor torácico, ni la digoxina, ni el ECG normal de hace tres años.\n- Por eso su redacción se cubre: «Alteraciones inespecíficas del ST-T… valorar isquemia, correlacionar con la clínica». Traducido: «Las T laterales están algo planas y no sé por qué».\nLa sobrelectura no es un saludo de cortesía: lee tú el trazado en orden, muestra tu acuerdo o desacuerdo punto por punto y **firma tu propia conclusión**.',
      ),
    },
    {
      kind: 'text',
      title: l('自动化偏倚：为什么"知道"防不住', 'Automation bias: why knowing is not enough', 'Sesgo de automatización: por qué saber no basta'),
      body: l(
        '**自动化偏倚**是打印结论对读者的锚定：你的判读会向机器那行字漂移——而且这个引力对**知道该效应存在**的读者同样起作用。所以"我了解这个偏倚"不是防护，**流程才是**：\n- **先读后比**：盖住结论，按 s1 的固定顺序（记录 → 心率 → 节律 → PR → QRS → QT/QTc → 电轴 → 形态 → 比较与结论）读完并写下你的判读，然后才揭开机器那行字逐条对比。\n- **当作数据点**：机器判读像一位同事的意见——可能帮忙，也可能误导；它进你的报告要靠证据，不靠权威。\n- **记录分歧**：结论不同就写下你的和你的理由。病历上签名的是你，不是机器。\n反向的错误也存在：为了显得独立而刻意反驳机器。机器看的是同一条图——它对你错的时候，先弄清你漏了什么。',
        '**Automation bias** is the anchoring pull of a printed statement: your read drifts toward whatever the machine said — and the pull works on readers who **know the effect exists**. So "I know about this bias" is not protection; **the workflow is**:\n- **Read first, compare after**: cover the statement, finish the fixed s1 order (recording → rate → rhythm → PR → QRS → QT/QTc → axis → morphology → compare and conclude), write your read down, and only then uncover the machine\'s line and compare item by item.\n- **Treat it as a data point**: the machine statement is like a colleague\'s opinion — it may help or mislead; it earns its place in your report by evidence, not by authority.\n- **Document disagreement**: when your conclusions differ, write yours, with your reasons. The signature on the chart is yours, not the machine\'s.\nThe mirror error also exists: contradicting the machine just to seem independent. It reads the same tracing you do — when it is right and you were wrong, find out what you missed.',
        '**El sesgo de automatización** es el anclaje que ejerce una conclusión impresa: tu lectura deriva hacia lo que dijo la máquina, y esa fuerza actúa también en lectores que **saben que el efecto existe**. Por eso «yo conozco este sesgo» no protege; **protege el flujo de trabajo**:\n- **Leer primero, comparar después**: tapa la conclusión, termina el orden fijo de s1 (registro → frecuencia → ritmo → PR → QRS → QT/QTc → eje → morfología → comparar y concluir), anota tu lectura y solo entonces descubre la línea de la máquina y compárala punto por punto.\n- **Trátala como un dato más**: la interpretación de la máquina es como la opinión de un colega; puede ayudar o despistar, y entra en tu informe por evidencia, no por autoridad.\n- **Documenta el desacuerdo**: si las conclusiones difieren, escribe la tuya con tus razones. En la historia clínica firmas tú, no la máquina.\nTambién existe el error inverso: contradecir a la máquina para aparentar independencia. Ella lee el mismo trazado que tú; cuando acierta y tú te equivocas, averigua qué se te escapó.',
      ),
    },
    {
      kind: 'text',
      title: l('机器在哪里出错', 'Where the machine goes wrong', 'Dónde se equivoca la máquina'),
      body: l(
        '全部都要复核，但这三处要读两遍：\n- **节律**——机器最弱的地方：震颤伪差常被判成"心房颤动"（真正的 QRS 在下面按规则的 RR 行进，总有一个导联是干净的——o10）；起搏心律也常被误标（o11）。\n- **电极接反**——机器并不能可靠识别：左右手接反时 I 导联整体倒置，机器可能报"异常电轴"，而胸前导联其实正常（o9）。\n- **过度诊断的缺血**——"非特异性 ST-T 改变，考虑缺血"是最常见的对冲措辞，多数这类图并不是缺血。见到它要找原因：药物、电解质、过度通气、餐后状态、左室肥厚、束支阻滞的继发性改变——并**与既往心电图对比**后再下结论。',
        'Over-read everything, but read these three zones twice:\n- **Rhythm** — the machine\'s weakest ground: tremor artefact is often called "atrial fibrillation" (the real QRS complexes march through at a regular RR, and one lead is always clean — o10); paced rhythms are also frequently mislabelled (o11).\n- **Electrode reversals** — not recognised reliably: with the arms swapped, lead I is wholly inverted and the machine may report an "abnormal axis" while the chest leads are normal (o9).\n- **Over-called ischaemia** — "non-specific ST-T changes, consider ischaemia" is the commonest hedge, and most such tracings are not ischaemia. When you meet it, look for a reason: drugs, electrolytes, hyperventilation, the postprandial state, LVH, the secondary changes of bundle branch block — and **compare with an old ECG** before you commit.',
        'Revisa todo, pero estas tres zonas léelas dos veces:\n- **El ritmo**, el terreno más débil de la máquina: el artefacto de temblor suele leerse como «fibrilación auricular» (los QRS reales avanzan por debajo con RR regular y siempre hay una derivación limpia —o10—); los ritmos con marcapasos también se etiquetan mal a menudo (o11).\n- **La inversión de electrodos**, que la máquina no reconoce de forma fiable: con los brazos intercambiados, la derivación I queda invertida por completo y la máquina puede informar de un «eje anómalo» mientras las precordiales son normales (o9).\n- **La isquemia sobrediagnosticada**: «alteraciones inespecíficas del ST-T, valorar isquemia» es la fórmula de prudencia más frecuente, y la mayoría de esos trazados no son isquemia. Al encontrarla, busca un motivo: fármacos, electrolitos, hiperventilación, estado posprandial, HVI, los cambios secundarios del bloqueo de rama, y **compara con un ECG previo** antes de decidir.',
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
      kind: 'ecg',
      ecg: synth('normal', 1625),
      view: STRIP,
      marks: [{ auto: 'pr' }, { auto: 'qt' }],
      caption: l(
        '机器真正的长处是测量：它的 PR、QRS、QT 是**全局值**——从所有同步记录导联中最早的起点量到最晚的终点——因此系统性略长于你单导联的读数：这不是谁错了，是方法不同。拿来用，但照样复核：T 波终末低平或 U 波明显时，机器的 QT 取决于它把 T 终点定在哪里，你用切线法自己量一遍（h7）；房颤和伪差下的"平均间期"更要打折。',
        "The machine's real strength is measurement: its PR, QRS and QT are **global values** — measured from the earliest onset to the latest offset across all simultaneously recorded leads — so they run systematically slightly longer than your single-lead readings: that is method, not error. Use them, and over-read them anyway: when the T end is flat or a U wave is prominent, the machine's QT depends on where it decides the T ends — measure it yourself with the tangent method (h7); and its \"average intervals\" in AF or artefact deserve an extra discount.",
        'El punto fuerte real de la máquina es medir: sus PR, QRS y QT son **valores globales** —del inicio más precoz al final más tardío en todas las derivaciones registradas a la vez—, por lo que dan de forma sistemática algo más largos que tus lecturas en una sola derivación: es método, no error. Úsalos y, aun así, revísalos: cuando el final de la T es plano o hay una U prominente, el QT de la máquina depende de dónde decida que acaba la T; mídelo tú con el método de la tangente (h7), y sus «intervalos medios» en la FA o con artefactos merecen aún más descuento.',
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
        '两份真实心电图，机器的标注都落在"非特异性"一类里（一份非特异性 ST-T 改变、一份 T 波低平）。先自己完整读图——心率、节律、间期、电轴、形态——写下你的判读，然后才揭晓标签。你同意机器吗？不同意的地方，用你会写进病历的话说出来。',
        'Two real tracings whose machine labels both fall in the "non-specific" family (one non-specific ST-T change, one low T). Read each one fully yourself first — rate, rhythm, intervals, axis, morphology — write your statement, and only then reveal the labels. Do you agree with the machine? Where you do not, say it in the words you would put in the chart.',
        'Dos ECG reales cuyas etiquetas de máquina caen en la familia de lo «inespecífico» (una alteración inespecífica del ST-T y una T de bajo voltaje). Lee primero cada uno por tu cuenta —frecuencia, ritmo, intervalos, eje, morfología—, escribe tu conclusión y solo después descubre las etiquetas. ¿Estás de acuerdo con la máquina? Donde no lo estés, dilo con las palabras que pondrías en el informe.',
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
