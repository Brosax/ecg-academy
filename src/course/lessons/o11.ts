/**
 * O11 — The paced ECG (docs/PLAN.md §3, stage O).
 * Criteria: docs/curriculum/criteria.md `paced-qrs`, `ddd-behaviour` (current values); pacemakers-devices
 * "Missing in the book" bullets: NBG code, pacing stimulus appearance, failure to capture, undersensing,
 * oversensing, fusion/pseudofusion, biventricular (CRT) morphology, acute MI in ventricular paced rhythm (Sgarbossa).
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
  id: 'o11',
  stage: 'O',
  order: 11,
  title: l('起搏心电图', 'The paced ECG', 'El ECG con marcapasos'),
  summary: l(
    '先认模式（NBG 编码告诉你应该看到什么），再认右室起搏的“电学 LBBB”，然后对每份起搏心电图做夺获、感知、频率三项检查——失夺获、感知不足、感知过度各有签名，融合波是正常现象。',
    'First name the mode (the NBG code tells you what to expect), then recognise the "electronic LBBB" of RV pacing, then run the three-function check — capture, sensing, rate — on every paced tracing: failure to capture, undersensing and oversensing each leave a signature, and fusion beats are normal.',
    'Primero identifica el modo (el código NBG te dice qué esperar), luego reconoce el «BRI electrónico» de la estimulación del ventrículo derecho y después aplica la comprobación de tres funciones —captura, detección, frecuencia— a todo ritmo estimulado: el fallo de captura, la infradetección y la sobredetección dejan cada uno su firma, y los latidos de fusión son normales.',
  ),
  objectives: [
    l('用 NBG 编码说出 VVI、AAI、DDD 各自“应该看到什么”。', 'Use the NBG code to state what you should see in VVI, AAI and DDD.', 'Usar el código NBG para decir qué debes ver en VVI, AAI y DDD.'),
    l('认出右室心尖起搏的 QRS 签名（类 LBBB、电轴偏上、V5–V6 可为负向）以及单极/双极钉样信号。', 'Recognise the RV apical paced-QRS signature (LBBB-like, superior axis, possibly negative V5–V6) and unipolar vs bipolar spikes.', 'Reconocer la firma del QRS estimulado desde el ápex del ventrículo derecho (tipo BRI, eje superior, V5-V6 puede ser negativa) y las espículas unipolares y bipolares.'),
    l('对任何起搏心电图跑一遍夺获、感知、频率三项检查，并命名失夺获、感知不足与感知过度。', 'Run the capture–sensing–rate check on any paced ECG and name failure to capture, undersensing and oversensing.', 'Aplicar la comprobación de captura, detección y frecuencia a cualquier ECG estimulado y nombrar el fallo de captura, la infradetección y la sobredetección.'),
    l('认出双室起搏（CRT）的形态，知道起搏心律中的急性梗死要用 Sgarbossa 型标准。', 'Recognise biventricular (CRT) morphology and know that acute MI in a paced rhythm needs Sgarbossa-type criteria.', 'Reconocer la morfología de la estimulación biventricular (TRC) y saber que el infarto agudo en ritmo estimulado exige criterios tipo Sgarbossa.'),
  ],
  minutes: 15,
  competencies: ['C10', 'C12'],
  findings: ['paced-rhythm', 'pacing-failure-capture', 'pacing-undersensing', 'pacing-oversensing'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('paced-vvi', 1601),
      view: STRIP,
      question: l(
        '钉样信号、宽大 QRS、类左束支阻滞的形态加上电轴偏上。电极在哪里？“机器工作正常吗”这个问题又该怎么回答？',
        'A spike, a wide QRS, an LBBB-like shape with a superior axis. Where is the lead — and how should you answer the question "is the device happy"?',
        'Una espícula, un QRS ancho, una morfología tipo bloqueo de rama izquierda con eje superior. ¿Dónde está el electrodo? Y ¿cómo responder a la pregunta de si el dispositivo funciona bien?',
      ),
      reveal: l(
        '电极在**右室心尖部**：起搏从那里出发，激动绕开传导系统“倒着”扩布——胸前导联类 LBBB，II、III、aVF 主波向下（电轴偏上）。但“正常吗”不能只看形态：起搏心电图要做**三项检查**——**夺获**（每个钉之后有没有 P/QRS）、**感知**（该抑制时抑制了吗？该起搏时起搏了吗？）、**频率**（钉到钉是否符合程控的下限频率）。本课就练这三步。',
        'The lead sits at the **right ventricular apex**: pacing starts there and activation spreads "backwards", bypassing the conduction system — an LBBB-like pattern in the chest leads with a main vector away from II, III and aVF (superior axis). But morphology alone cannot answer "is it happy": every paced ECG needs the **three-function check** — **capture** (is there a P/QRS after every spike?), **sensing** (does it inhibit and pace when it should?), **rate** (does spike-to-spike match the programmed lower rate?). This lesson drills exactly those three steps.',
        'El electrodo está en el **ápex del ventrículo derecho**: la estimulación nace ahí y la activación se propaga «al revés», saltándose el sistema de conducción: patrón tipo BRI en las precordiales, con el vector principal alejándose de II, III y aVF (eje superior). Pero la morfología por sí sola no responde a si funciona bien: todo ECG estimulado exige la **comprobación de tres funciones**: **captura** (¿hay P/QRS tras cada espícula?), **detección** (¿inhibe y estimula cuando debe?) y **frecuencia** (¿la espícula a espícula coincide con la frecuencia límite inferior programada?). Esta lección entrena esos tres pasos.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('paced-vvi', 1602),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVF', 'V1', 'V6'] },
      marks: [{ auto: 'pacing-spike' }, { auto: 'qrs', lead: 'II' }, { auto: 'qrs', lead: 'V6' }],
      caption: l(
        '右室心尖起搏的 12 导联签名：每个钉后一个宽 QRS（常 ≥140–180 ms）——**类 LBBB**。V1 呈 QS/rS，胸前导联大多主波向下，**连 V5–V6 也可以向下**；II、III、aVF 主波向下（电轴偏上）；基线是不规则的颤动波（这位患者的基础心律是房颤）。ST-T 与 QRS 反向是**继发性**改变——别按缺血阈值去读。',
        'The 12-lead signature of RV apical pacing: a wide QRS after every spike (typically ≥140–180 ms) — an **LBBB-like** pattern. QS/rS in V1, predominantly negative QRS across the chest leads, **including V5–V6**; main vector negative in II, III and aVF (superior axis); the baseline shows an irregular fibrillatory undulation (this patient\'s underlying rhythm is AF). The ST-T discordance is **secondary** — do not read it with ischaemia thresholds.',
        'La firma en 12 derivaciones de la estimulación del ápex del VD: un QRS ancho tras cada espícula (habitualmente ≥140-180 ms), un patrón **tipo BRI**. QS/rS en V1, QRS predominantemente negativo en las precordiales, **incluso en V5-V6**; vector principal negativo en II, III y aVF (eje superior); la línea de base muestra una ondulación fibrilatoria irregular (el ritmo de base de este paciente es una FA). La discordancia del ST-T es **secundaria**: no la leas con umbrales isquémicos.',
      ),
    },
    {
      kind: 'text',
      title: l('NBG 编码与钉样信号', 'The NBG code and the spike', 'El código NBG y la espícula'),
      body: l(
        '起搏器是一台时序机器，NBG（NASPE/BPEG）编码就是它的说明书：\n- **第 I 位**起搏心腔、**第 II 位**感知心腔（A=心房，V=心室，D=双腔，O=无）；**第 III 位**感知后反应（I=抑制，T=触发，D=双重，O=无）。\n于是：**AAI**（病窦、房室传导正常）= 钉→P→患者自己的窄 QRS；**VVI**（本课开头那份）= 钉→宽 QRS；**DDD** = 双腔，下一节有它的四种状态；**VOO/DOO**（磁铁试验）= 不感知、按固定频率起搏。\n钉样信号本身也要会读：**单极**起搏的钉大而醒目；**双极**的钉很小甚至看不见。数字心电图可能漏画、错画，或只是打一个注释标记——**多看几个导联**再下结论；夺获看的是钉后的 P/QRS，不是钉的形状。',
        'A pacemaker is a timing machine, and the NBG (NASPE/BPEG) code is its instruction sheet:\n- position **I** = chamber paced, position **II** = chamber sensed (A = atrium, V = ventricle, D = dual, O = none); position **III** = response to sensing (I = inhibited, T = triggered, D = dual, O = none).\nSo: **AAI** (sinus-node disease, intact AV conduction) = spike→P→the patient\'s own narrow QRS; **VVI** (the tracing that opened this lesson) = spike→wide QRS; **DDD** = dual chamber, with its four states in a moment; **VOO/DOO** (the magnet test) = no sensing, fixed-rate pacing.\nThe spike itself needs reading too: a **unipolar** spike is large and obvious; a **bipolar** spike is tiny or invisible. A digital electrocardiograph may miss spikes, insert them falsely, or merely annotate one — **check several leads** before concluding; capture is judged by the P/QRS after the spike, not by its shape.',
        'Un marcapasos es una máquina de tiempos y el código NBG (NASPE/BPEG) es su manual:\n- posición **I** = cámara estimulada, posición **II** = cámara detectada (A = aurícula, V = ventrículo, D = dual, O = ninguna); posición **III** = respuesta a la detección (I = inhibida, T = desencadenada, D = dual, O = ninguna).\nAsí: **AAI** (disfunción sinusal, conducción AV intacta) = espícula→P→QRS estrecho propio del paciente; **VVI** (el trazado que abrió la lección) = espícula→QRS ancho; **DDD** = doble cámara, con sus cuatro estados en un momento; **VOO/DOO** (la prueba con imán) = sin detección, estimulación a frecuencia fija.\nLa propia espícula también hay que saber leerla: la espícula **unipolar** es grande y llamativa; la **bipolar** es minúscula o invisible. Un electrocardiógrafo digital puede omitirla, insertarla por error o limitarse a anotarla: **mira varias derivaciones** antes de concluir; la captura se juzga por la P o el QRS que sigue a la espícula, no por su forma.',
      ),
    },
    {
      kind: 'criteria',
      title: l('起搏心电图判读卡', 'The paced-ECG reading card', 'La tarjeta de lectura del ECG estimulado'),
      items: [
        {
          label: l('NBG 编码', 'NBG code', 'Código NBG'),
          value: l('I 位=起搏心腔，II 位=感知心腔（A/V/D/O），III 位=反应（抑制/触发/双重/无）；VOO/DOO = 磁铁下的非同步模式', 'Position I = chamber paced, II = chamber sensed (A/V/D/O), III = response (inhibited/triggered/dual/none); VOO/DOO = the asynchronous magnet modes', 'Posición I = cámara estimulada, II = cámara detectada (A/V/D/O), III = respuesta (inhibida/desencadenada/dual/ninguna); VOO/DOO = los modos asíncronos con imán'),
        },
        {
          label: l('右室心尖起搏 QRS', 'RV apical paced QRS', 'QRS estimulado del ápex del VD'),
          value: l('钉后宽 QRS（常 ≥140–180 ms），类 LBBB：V1 呈 QS/rS，胸前大多主波向下（可含 V5–V6），电轴偏上（II/III/aVF 负），ST-T 与 QRS 反向', 'Spike then a wide QRS (typically ≥140–180 ms), LBBB-like: QS/rS in V1, predominantly negative precordials (may include V5–V6), superior axis (negative II/III/aVF), ST-T discordant to the QRS', 'Espícula y QRS ancho (habitualmente ≥140-180 ms), tipo BRI: QS/rS en V1, precordiales predominantemente negativas (pueden incluir V5-V6), eje superior (II/III/aVF negativas) y ST-T discordante al QRS'),
        },
        {
          label: l('刺激信号（钉）', 'Stimulus (spike)', 'Estímulo (espícula)'),
          value: l('单极 = 大钉；双极 = 小钉或看不见；数字机的钉可能只是注释——夺获看钉后的 P/QRS', 'Unipolar = large spike; bipolar = tiny or invisible; a digital machine\'s spike may be an annotation — judge capture by the P/QRS after it', 'Unipolar = espícula grande; bipolar = pequeña o invisible; la espícula de un aparato digital puede ser una anotación: la captura se juzga por la P o el QRS que sigue'),
        },
        {
          label: l('失夺获', 'Failure to capture', 'Fallo de captura'),
          value: l('不应期之外的钉后无 P（心房）/QRS（心室）；原因：阈值升高、导线脱位或断裂、高钾血症、药物、梗死/纤维化、电池耗竭', 'A spike outside the refractory period with no P (atrial) or QRS (ventricular) after it; causes: threshold rise, lead dislodgement or fracture, hyperkalaemia, drugs, infarct/fibrosis, battery depletion', 'Espícula fuera del periodo refractario sin P (auricular) ni QRS (ventricular) después; causas: elevación del umbral, desplazamiento o fractura del electrodo, hiperpotasemia, fármacos, infarto/fibrosis, agotamiento de la batería'),
        },
        {
          label: l('感知不足', 'Undersensing', 'Infradetección'),
          value: l('自身 P/QRS 后仍发钉、计时器不重置；先排除磁铁/非同步模式与不应期内的功能性感知不足', 'Spikes appear after intrinsic P/QRS and the intervals do not reset; first exclude magnet/asynchronous mode and functional undersensing inside blanking/refractory periods', 'Espículas tras la P o el QRS propios sin reinicio del temporizador; excluye antes el imán/el modo asíncrono y la infradetección funcional dentro de los periodos refractarios o de enmascaramiento'),
        },
        {
          label: l('感知过度 / 无输出', 'Oversensing / failure to output', 'Sobredetección / fallo de salida'),
          value: l('长于下限频率间期的间歇，无钉也无自身波；来源：肌电位、电磁干扰、T 波、远场信号、导线噪声；先排除频率滞后、睡眠频率', 'A pause longer than the lower-rate interval with no spike and no intrinsic beat; sources: myopotentials, EMI, T waves, far-field signals, lead noise; first exclude rate hysteresis and sleep rates', 'Pausa mayor que el intervalo de la frecuencia límite inferior sin espícula ni latido propio; fuentes: miopotenciales, interferencia electromagnética, ondas T, señales lejanas, ruido del electrodo; excluye antes la histéresis de frecuencia y la frecuencia de reposo'),
        },
        {
          label: l('融合 / 伪融合', 'Fusion / pseudofusion', 'Fusión / pseudofusión'),
          value: l('融合 = 起搏与自身波前共同塑形；伪融合 = 钉落在自身 QRS 上而不改变它；都是正常时间巧合，不是故障', 'Fusion = paced and intrinsic wavefronts share the QRS; pseudofusion = a spike lands on an intrinsic QRS without changing it; both are normal timing coincidences, not malfunctions', 'Fusión = los frentes estimulado y propio comparten el QRS; pseudofusión = una espícula cae sobre un QRS propio sin modificarlo; ambas son coincidencias temporales normales, no fallos'),
        },
        {
          label: l('双室起搏（CRT）', 'Biventricular pacing (CRT)', 'Estimulación biventricular (TRC)'),
          value: l('有效 CRT：V1 主波向上（类 RBBB）+ I 导联 QS/负向，QRS 比基线窄；变回 LBBB 样（V1 负、I 正、更宽）= 左室失夺获', 'Effective CRT: dominant R in V1 (RBBB-like) + QS/negative lead I, QRS narrower than baseline; reversion to LBBB-like (negative V1, positive I, wider) = loss of LV capture', 'TRC eficaz: R dominante en V1 (tipo BRD) + QS/negativa en la derivación I, QRS más estrecho que el basal; la reversión a un patrón tipo BRI (V1 negativa, I positiva, más ancho) = pérdida de captura del VI'),
        },
      ],
      source:
        'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Bernstein AD et al. Revised NASPE/BPEG generic code, PACE 2002;25:260-4; Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427-3520',
    },
    {
      kind: 'worked',
      title: l('三项检查：夺获、感知、频率', 'The three-function check: capture, sensing, rate', 'La comprobación de tres funciones: captura, detección, frecuencia'),
      ecg: synth('paced-ddd', 1603),
      view: STRIP,
      steps: [
        {
          title: l('先说模式', 'Name the mode first', 'Primero nombra el modo'),
          body: l(
            '一跳两钉：第一个钉后有 P，经过 AV 间期（约 170 ms）第二个钉，然后宽 QRS——**DDD，AP–VP**（房室顺序起搏）。设备接管了这位患者的窦性心动过缓 + 完全性房室传导阻滞。',
            'Two spikes per beat: the first is followed by a P, then after the AV delay (about 170 ms) the second spike and a wide QRS — **DDD, AP–VP** (AV sequential pacing). The device has taken over this patient\'s sinus bradycardia with complete AV block.',
            'Dos espículas por latido: la primera va seguida de una P y, tras el intervalo AV (unos 170 ms), la segunda espícula y un QRS ancho: **DDD, AP-VP** (estimulación secuencial auriculoventricular). El dispositivo ha tomado el relevo de la bradicardia sinusal con bloqueo AV completo de esta paciente.',
          ),
          marks: [{ auto: 'pacing-spike' }, { auto: 'p' }],
        },
        {
          title: l('夺获', 'Capture', 'Captura'),
          body: l(
            '沿节律条逐钉问：钉后有没有波？心房钉→P，心室钉→QRS——每一跳都有，**夺获正常**。若钉后没有 P/QRS、又不在不应期里，那就是失夺获（本课后面有真实例子）。',
            'Walk the strip spike by spike: is there a wave after it? Atrial spike→P, ventricular spike→QRS — present on every beat, so **capture is normal**. A spike followed by no P/QRS, outside the refractory period, would be failure to capture (real examples later in this lesson).',
            'Recorre la tira espícula a espícula: ¿hay una onda después? Espícula auricular→P, espícula ventricular→QRS: está en cada latido, luego la **captura es normal**. Una espícula sin P ni QRS después, fuera del periodo refractario, sería un fallo de captura (hay ejemplos reales más adelante).',
          ),
          marks: [{ auto: 'pacing-spike' }, { auto: 'qrs' }],
        },
        {
          title: l('感知', 'Sensing', 'Detección'),
          body: l(
            '设备“看见”心脏了吗？两种坏法，方向相反：自身 P/QRS 之后仍发钉、计时器不重置 = **感知不足**；长于下限频率间期的间歇里既无钉、也无自身波 = **感知过度**。这份图两样都没有：起搏按部就班，没有与自身心搏碰撞。',
            'Does the device "see" the heart? Two opposite failure modes: spikes after intrinsic P/QRS with no interval reset = **undersensing**; a pause longer than the lower-rate interval with neither a spike nor an intrinsic beat = **oversensing**. This tracing has neither: pacing marches on schedule and never collides with intrinsic beats.',
            '¿«Ve» el dispositivo el corazón? Dos modos de fallo opuestos: espículas tras la P o el QRS propios sin reinicio del temporizador = **infradetección**; una pausa mayor que el intervalo de la frecuencia límite inferior sin espícula ni latido propio = **sobredetección**. Este trazado no tiene ninguna de las dos: la estimulación sigue su pauta y nunca choca con los latidos propios.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('频率', 'Rate', 'Frecuencia'),
          body: l(
            '用分规量钉到钉（或 QRS 到 QRS）：约 940 ms = 64 次/分，等于程控的下限频率——**频率正常**。补充两点：磁铁会让设备转为非同步固定频率（VOO/DOO）；双腔跟踪模式下接近上限频率的规则心室起搏要想到起搏器介导性心动过速（PMT）。',
            'Measure spike-to-spike (or QRS-to-QRS) with calipers: about 940 ms = 64/min, exactly the programmed lower rate — **rate is normal**. Two extras: a magnet switches the device to asynchronous fixed-rate pacing (VOO/DOO); and a regular ventricular-paced tachycardia near the upper rate in a tracking mode suggests pacemaker-mediated tachycardia (PMT).',
            'Mide espícula a espícula (o QRS a QRS) con el compás: unos 940 ms = 64 lpm, justo la frecuencia límite inferior programada: la **frecuencia es normal**. Dos apuntes: el imán pasa el dispositivo a estimulación asíncrona a frecuencia fija (VOO/DOO); y una taquicardia estimulada ventricular regular cerca de la frecuencia máxima en modo de seguimiento sugiere una taquicardia mediada por marcapasos (TMP).',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('paced-aai', 1604),
      view: STRIP,
      marks: [{ auto: 'pacing-spike' }, { auto: 'p' }],
      caption: l(
        'AAI（窦房结功能障碍、房室传导正常）：钉→P→固定的 PR→**患者自己的窄 QRS**。夺获检查这次在**心房**：每个钉后必须有 P。PR 与 QRS 都不属于起搏器，但要顺带看：PR 逐渐延长或出现房室阻滞，是这台机器换成 DDD 的理由。',
        'AAI (sinus-node disease, intact AV conduction): spike→P→a constant PR→**the patient\'s own narrow QRS**. This time the capture check lives in the **atrium**: every spike must be followed by a P. The PR and the QRS are not the pacemaker\'s work, but watch them anyway: a lengthening PR or emerging AV block is this device\'s reason to be upgraded to DDD.',
        'AAI (disfunción sinusal, conducción AV intacta): espícula→P→PR fijo→**el QRS estrecho propio del paciente**. Esta vez la comprobación de captura vive en la **aurícula**: cada espícula debe ir seguida de una P. El PR y el QRS no son obra del marcapasos, pero vigílalos: un PR que se alarga o un bloqueo AV que aparece es la razón para cambiar este dispositivo a DDD.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('paced-vvi', 1605, undefined, 'bipolar'),
      view: STRIP,
      marks: [{ auto: 'pacing-spike' }],
      caption: l(
        '同一位 VVI 患者，换**双极**电极：钉小到几乎看不见（箭头所指处）。三件事不要做：别把钉小当成输出不足；别因“看不到钉”就否定起搏；别把数字心电图画的钉当实物——它可能漏画、错画或只是注释。看不到钉时，规律的宽 QRS 类 LBBB 图形加规整的 RR 本身就是起搏的证据。',
        'The same VVI patient with a **bipolar** lead: the spike shrinks to near-invisibility (where the mark points). Three things not to do: do not equate a small spike with low output; do not deny pacing because "there is no spike"; do not take a digital machine\'s printed spike as the real thing — it may be missed, falsely inserted or merely annotated. When no spike is visible, a regular LBBB-like wide-QRS rhythm with a regular RR is itself the evidence of pacing.',
        'El mismo paciente con VVI y un electrodo **bipolar**: la espícula se reduce hasta ser casi invisible (donde señala la marca). Tres cosas que no hay que hacer: no equipares espícula pequeña con salida insuficiente; no niegues la estimulación porque «no hay espícula»; no tomes la espícula impresa por el aparato digital como algo real, puede omitirla, insertarla por error o ser solo una anotación. Cuando no se ve espícula, un ritmo regular de QRS ancho tipo BRI con RR regular es en sí la prueba de la estimulación.',
      ),
    },
    {
      kind: 'contrast',
      title: l('钉之后发生了什么？', 'What happens after the spike?', '¿Qué ocurre tras la espícula?'),
      view: STRIP,
      left: {
        ecg: synth('pacing-failure-capture', 1606),
        caption: l('失夺获：钉后**空无一物**（不在不应期），交界性逸搏约 36 次/分在兜底', 'Failure to capture: **nothing** follows the spike (outside the refractory period); a junctional escape near 36/min holds the line', 'Fallo de captura: tras la espícula **no sigue nada** (fuera del periodo refractario); un escape de la unión a unas 36 lpm mantiene el tipo'),
        marks: [{ auto: 'pacing-spike' }],
      },
      right: {
        ecg: synth('pacing-undersensing', 1607),
        caption: l('感知不足：自身 QRS 之后**仍然发钉**，计时器没有重置——设备“看不见”心室', 'Undersensing: spikes are delivered **after intrinsic QRS complexes** and the timer does not reset — the device does not "see" the ventricle', 'Infradetección: las espículas se emiten **tras los QRS propios** y el temporizador no se reinicia: el dispositivo no «ve» el ventrículo'),
        marks: [{ auto: 'pacing-spike' }, { auto: 'qrs' }],
      },
      point: l(
        '同一个动作——跟着钉往后看。钉后**没有** P/QRS（且不在不应期）= **失夺获**：查阈值与导线，也查血钾、药物和电池。钉落在**自身 QRS 之后**、间期不重置 = **感知不足**：查感知灵敏度；磁铁或非同步模式也会这样发钉，先问清病史。还有一个交叉细节：感知不足时落在自身 QRS 不应期里的钉不夺获，**不算**失夺获。',
        'One and the same manoeuvre — look after the spike. **No** P/QRS after it (and outside the refractory period) = **failure to capture**: check threshold and lead, and also potassium, drugs and battery. Spike falling **after an intrinsic QRS** with no interval reset = **undersensing**: check sensitivity; a magnet or asynchronous mode also paces like this, so ask first. One crossing detail: a spike from undersensing that lands in the refractory period of the intrinsic QRS and fails to capture is **not** a capture failure.',
        'Un mismo gesto: mira después de la espícula. **Ninguna** P ni QRS tras ella (y fuera del periodo refractario) = **fallo de captura**: revisa umbral y electrodo, y también potasio, fármacos y batería. Espícula que cae **tras un QRS propio** sin reinicio del intervalo = **infradetección**: revisa la sensibilidad; el imán o un modo asíncrono también estimulan así, así que pregunta antes. Un detalle cruzado: la espícula de una infradetección que cae en el periodo refractario del QRS propio y no captura **no** es un fallo de captura.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pacing-oversensing', 1608),
      view: STRIP,
      marks: [{ auto: 'rr' }],
      caption: l(
        '完全性房室传导阻滞、VVI、下限频率 60：本该规整起搏，却出现了**长于下限频率间期**的间歇——既无钉，也无自身 QRS。设备把胸大肌的肌电位当成了心室活动而抑制了自己：**感知过度**。下诊断前先排除会“合法”拉长间期的正常功能：频率滞后、睡眠频率、减少右室起搏的算法。',
        'Complete AV block, VVI, lower rate 60: pacing should be regular, yet a pause **longer than the lower-rate interval** appears — no spike, no intrinsic QRS. The device mistook pectoral myopotentials for ventricular activity and inhibited itself: **oversensing**. Before diagnosing it, exclude the normal features that may "legally" lengthen intervals: rate hysteresis, sleep rates, RV-pacing-avoidance algorithms.',
        'Bloqueo AV completo, VVI, frecuencia límite inferior 60: la estimulación debería ser regular y, sin embargo, aparece una pausa **mayor que el intervalo de la frecuencia límite inferior**, sin espícula y sin QRS propio. El dispositivo confundió miopotenciales del pectoral con actividad ventricular y se inhibió: **sobredetección**. Antes de diagnosticarla, excluye las funciones normales que pueden alargar «legalmente» los intervalos: histéresis de frecuencia, frecuencia de reposo y algoritmos que minimizan la estimulación del VD.',
      ),
    },
    {
      kind: 'text',
      title: l('DDD 的四种工作状态', 'The four operating states of DDD', 'Los cuatro estados de funcionamiento del DDD'),
      body: l(
        'DDD = 双腔起搏、双腔感知、双重反应（感知后既可抑制也可触发）。每一跳都处于四种状态之一：\n- **AP–VP**：心房起搏 + 心室起搏（上一节那份图）；\n- **AP–VS**：心房起搏，房室传导下传，自身窄 QRS；\n- **AS–VP**：感知窦性 P，AV 间期后心室起搏（P 波跟踪）；\n- **AS–VS**：全程抑制，一个钉都看不到。\n所以 DDD 患者的图上可以逐跳切换形态，这不是故障。真正的“算法时刻”：心房快速心律失常时自动模式切换为不跟踪模式（如 DDI）；PVC 后自动延长 PVARP，防止逆行 P 被跟踪；逆行 P 波若被持续跟踪，就形成**起搏器介导性心动过速（PMT）**——接近上限频率的规则心室起搏，磁铁可终止。见到“奇怪的间期”先想算法，再想故障。',
        'DDD = dual-chamber pacing, dual-chamber sensing, dual response (sensing can both inhibit and trigger). Every beat sits in one of four states:\n- **AP–VP**: atrial pace + ventricular pace (the tracing in the worked example);\n- **AP–VS**: atrial pace, intrinsic conduction, a native narrow QRS;\n- **AS–VP**: a sensed sinus P, then a ventricular pace after the AV delay (P tracking);\n- **AS–VS**: fully inhibited, not a single spike to see.\nSo a DDD tracing can switch pattern beat by beat — that is not malfunction. The real "algorithm moments": atrial tachyarrhythmias trigger an automatic mode switch to a non-tracking mode (e.g. DDI); PVARP is extended after a PVC so a retrograde P is not tracked; and if retrograde P waves keep being tracked you get **pacemaker-mediated tachycardia (PMT)** — a regular ventricular-paced tachycardia near the upper rate, terminated by a magnet. When an interval looks odd, think algorithms before malfunction.',
        'DDD = estimación y detección bicamerales con respuesta dual (la detección puede inhibir y desencadenar). Cada latido está en uno de cuatro estados:\n- **AP-VP**: estimulación auricular + ventricular (el trazado del ejemplo resuelto);\n- **AP-VS**: estimulación auricular, conducción intrínseca, QRS estrecho propio;\n- **AS-VP**: P sinusal detectada y estimulación ventricular tras el intervalo AV (seguimiento de P);\n- **AS-VS**: inhibición completa, ni una sola espícula a la vista.\nAsí, un trazado DDD puede cambiar de patrón latido a latido, y eso no es un fallo. Los verdaderos «momentos de algoritmo»: las taquiarritmias auriculares provocan un cambio automático de modo a un modo sin seguimiento (p. ej., DDI); el periodo refractario auricular posventricular se prolonga tras una EVSC para no seguir una P retrógrada; y si las P retrógradas se siguen una tras otra aparece la **taquicardia mediada por marcapasos (TMP)**: una taquicardia estimulada ventricular regular cerca de la frecuencia máxima, que el imán corta. Ante un intervalo raro, piensa primero en algoritmos y luego en fallos.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('paced-biv', 1609),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'I'] },
      marks: [{ auto: 'pacing-spike' }, { auto: 'qrs', lead: 'V1' }, { auto: 'qrs', lead: 'I' }],
      caption: l(
        '双室起搏（CRT）：右室心尖 + 冠状静脉侧支的左室电极同时起搏，两个波前从两侧汇合——**V1 主波向上（类 RBBB）、I 导联 QS/负向**，QRS 比单纯右室起搏更窄。随访口诀：V1 转回负向、I 转回正向、QRS 变宽 = **左室失夺获**，CRT 已失效；QRS 宽而类 RBBB、I 呈 QS = 右室失夺获。',
        'Biventricular pacing (CRT): the RV apical lead and the LV lead on a coronary-vein branch pace together, and the two wavefronts fuse from both sides — **dominant R in V1 (RBBB-like), QS/negative lead I**, with a narrower QRS than RV pacing alone. The follow-up rule: V1 reverting to negative, I to positive, QRS widening = **loss of LV capture**, CRT is no longer working; a wide RBBB-like QRS with QS in I = loss of RV capture.',
        'Estimulación biventricular (TRC): el electrodo del ápex del VD y el del VI en una rama venosa coronaria estimulan a la vez y los dos frentes se funden desde ambos lados: **R dominante en V1 (tipo BRD) y QS/negativa en la derivación I**, con un QRS más estrecho que con la estimulación del VD sola. Regla de seguimiento: si la V1 vuelve a ser negativa, la I positiva y el QRS se ensancha, hay **pérdida de captura del VI** y la TRC ha dejado de funcionar; un QRS ancho tipo BRD con QS en I = pérdida de captura del VD.',
      ),
    },
    {
      kind: 'text',
      title: l('正常现象与危险时刻', 'Normal behaviours and danger moments', 'Conductas normales y momentos de peligro'),
      body: l(
        '- **融合波**：起搏与自身除极共同塑造 QRS，形态介于两者之间；**伪融合**：钉落在自身 QRS 上却没有改变它。两者都是自身频率接近起搏频率时的正常时间巧合，**不是故障**。\n- **心脏记忆**：长时间右室起搏后，自身心跳的 T 波可深倒置、方向跟随起搏时的 QRS 向量，貌似前壁缺血——用 o8 的 Shvilkin 标准区分。\n- **起搏心律中的急性梗死**：右室起搏掩盖梗死的方式与 LBBB 完全相同——用 **Sgarbossa 型标准**判读（任何导联同向抬高 ≥1 mm；V1–V3 同向压低 ≥1 mm，起搏心律中 V4–V6 也可计入；过度不一致的抬高用 ST/S 比值 ≤ −0.25 判断，见 i10）。缺血症状不缓解 → 直接走急诊 PCI 流程。\n- **代谢与药物**：高钾血症（典型 K >7）和 Ic 类药物会增宽起搏 QRS、延长刺激到 QRS 的间距、升高阈值，直至传出阻滞或完全失夺获——起搏 QRS 忽然超过 200 ms，先查血钾和用药（o1、o4）。',
        '- **Fusion beat**: paced and intrinsic depolarisation share the QRS, which lands between the two shapes; **pseudofusion**: the spike falls on an intrinsic QRS without changing it. Both are normal timing coincidences when the intrinsic rate is close to the pacing rate — **not malfunctions**.\n- **Cardiac memory**: after prolonged RV pacing, intrinsic beats can show deep T inversion following the paced QRS vector, mimicking anterior ischaemia — separate them with the Shvilkin criteria from o8.\n- **Acute MI in a paced rhythm**: RV pacing hides infarction exactly as LBBB does — apply the **Sgarbossa-type rules** (concordant ST elevation ≥1 mm in any lead; concordant ST depression ≥1 mm in V1–V3, and in paced rhythm V4–V6 may also count; excessively discordant elevation judged by an ST/S ratio ≤ −0.25 — see i10). Ischaemic symptoms that persist go straight to the primary-PCI pathway.\n- **Metabolic and drug effects**: hyperkalaemia (typically K >7) and class IC drugs widen the paced QRS, lengthen the stimulus-to-QRS interval and raise thresholds up to exit block or complete loss of capture — a paced QRS suddenly wider than 200 ms should send you to the potassium and the drug list (o1, o4).',
        '- **Latido de fusión**: la despolarización estimulada y la propia comparten el QRS, que queda entre las dos morfologías; **pseudofusión**: la espícula cae sobre un QRS propio sin modificarlo. Ambas son coincidencias temporales normales cuando la frecuencia propia se acerca a la de estimulación: **no son fallos**.\n- **Memoria cardiaca**: tras una estimulación prolongada del VD, los latidos propios pueden mostrar una T profundamente negativa que sigue el vector del QRS estimulado, simulando isquemia anterior: sepárala con los criterios de Shvilkin de o8.\n- **Infarto agudo en ritmo estimulado**: la estimulación del VD oculta el infarto igual que el BRI; aplica las **reglas tipo Sgarbossa** (elevación concordante del ST ≥1 mm en cualquier derivación; descenso concordante ≥1 mm en V1-V3, y en ritmo estimulado también pueden contar V4-V6; elevación discordante excesiva valorada con un cociente ST/S ≤ −0,25; véase i10). Si los síntomas isquémicos persisten, directamente a la vía de ICP primaria.\n- **Efectos metabólicos y farmacológicos**: la hiperpotasemia (típicamente K >7) y los fármacos de clase IC ensanchan el QRS estimulado, alargan el intervalo espícula-QRS y elevan los umbrales hasta el bloqueo de salida o la pérdida total de captura: un QRS estimulado que supere de golpe los 200 ms debe mandarte al potasio y a la lista de fármacos (o1, o4).',
      ),
    },
    { kind: 'check', item: { family: 'pacing', seed: 1 } },
    { kind: 'check', item: { family: 'pacing', seed: 3 } },
    { kind: 'check', item: { family: 'pacing', seed: 5 } },
    { kind: 'check', item: { family: 'pacing', seed: 2 } },
    { kind: 'drill', families: ['pacing'], count: 10, passScore: 0.85 },
    {
      kind: 'real',
      ids: [3990, 14963, 144],
      caption: l(
        '三份真实起搏心电图。先对每一份跑一遍三项检查——夺获（钉后有无 P/QRS）、感知（有无碰撞、有无超过下限频率间期的长间歇）、频率（钉到钉等于多少）——先想好结论，再揭晓。真实图上的钉样信号常常小得几乎看不见：认不出钉时，类 LBBB 的宽 QRS 加规整的 RR 本身就是起搏的证据。',
        'Three real paced ECGs. Run the three-function check on each — capture (a P/QRS after every spike?), sensing (any collisions? any pause beyond the lower-rate interval?), rate (what is spike-to-spike?) — commit to your answers, then reveal. On real tracings the spike is often nearly invisible: when you cannot find one, an LBBB-like wide QRS with a regular RR is itself the evidence of pacing.',
        'Tres ECG reales con marcapasos. Aplica a cada uno la comprobación de tres funciones —captura (¿P/QRS tras cada espícula?), detección (¿choques? ¿alguna pausa más allá del intervalo de la frecuencia límite inferior?) y frecuencia (¿cuánto hay de espícula a espícula?)—, decide tus conclusiones y después mira la solución. En los trazados reales la espícula suele ser casi invisible: cuando no la encuentres, un QRS ancho tipo BRI con RR regular es en sí la prueba de la estimulación.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('把钉样信号的大小当成输出能量：双极起搏的钉本来就小到看不见，大小与夺获好坏无关。', 'Equating spike size with output: a bipolar spike is tiny or invisible by design — its size says nothing about capture.', 'Equiparar el tamaño de la espícula con la energía de salida: la espícula bipolar es pequeña o invisible por diseño; su tamaño no dice nada de la captura.'),
        l('伪融合波被当作感知不足：钉落在自身 QRS 上而没有改变它，是正常的时间巧合，不是故障。', 'Calling pseudofusion undersensing: a spike falling on an intrinsic QRS without changing it is a normal timing coincidence, not a malfunction.', 'Llamar infradetección a la pseudofusión: una espícula que cae sobre un QRS propio sin modificarlo es una coincidencia temporal normal, no un fallo.'),
        l('见到超过下限频率的长间歇就宣布“电池耗竭”，不先排除频率滞后、睡眠频率和减少右室起搏的算法。', 'Declaring "battery depletion" at a pause beyond the lower rate without first excluding rate hysteresis, sleep rates and RV-pacing-avoidance algorithms.', 'Declarar «agotamiento de la batería» ante una pausa superior a la frecuencia límite inferior sin excluir antes la histéresis de frecuencia, la frecuencia de reposo y los algoritmos que minimizan la estimulación del VD.'),
        l('用普通 ST 阈值判读起搏心律的 ST 段：右室起搏掩盖梗死的方式与 LBBB 相同，要用 Sgarbossa 型标准（i10）。', 'Reading ST in a paced rhythm with the usual thresholds: RV pacing hides infarction exactly as LBBB does — apply the Sgarbossa-type rules (i10).', 'Leer el ST de un ritmo estimulado con los umbrales habituales: la estimulación del VD oculta el infarto igual que el BRI; aplica las reglas tipo Sgarbossa (i10).'),
        l('盲目相信图上的钉样信号：数字心电图可能漏画、错画，或只是加上注释——夺获要看钉后有没有 P/QRS，不是看钉本身。', 'Trusting the printed spike blindly: a digital electrocardiograph can miss or falsely insert spikes, or merely annotate one — capture is judged by the P/QRS after it, not by the spike.', 'Confiar a ciegas en la espícula impresa: un electrocardiógrafo digital puede omitirla, insertarla por error o limitarse a anotarla; la captura se juzga por la P o el QRS que sigue, no por la espícula.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('NBG 编码告诉你该看到什么：AAI = 钉→P→自身窄 QRS；VVI = 钉→宽 QRS；DDD = 四种状态（AP–VP、AP–VS、AS–VP、AS–VS），逐跳切换不是故障。', 'The NBG code tells you what to expect: AAI = spike→P→native narrow QRS; VVI = spike→wide QRS; DDD = four states (AP–VP, AP–VS, AS–VP, AS–VS) — beat-to-beat switching is not malfunction.', 'El código NBG te dice qué esperar: AAI = espícula→P→QRS estrecho propio; VVI = espícula→QRS ancho; DDD = cuatro estados (AP-VP, AP-VS, AS-VP, AS-VS): alternar de un latido a otro no es un fallo.'),
        l('右室心尖起搏 = “电学 LBBB”：宽 QRS、电轴偏上（II/III/aVF 负）、V1 呈 QS/rS，V5–V6 也可以负向；双极的钉可以小到看不见。', 'RV apical pacing = an "electronic LBBB": wide QRS, superior axis (negative II/III/aVF), QS/rS in V1, V5–V6 may also be negative; a bipolar spike can be invisible.', 'La estimulación del ápex del VD = un «BRI electrónico»: QRS ancho, eje superior (II/III/aVF negativas), QS/rS en V1, V5-V6 también puede ser negativa; la espícula bipolar puede ser invisible.'),
        l('三项检查：夺获（钉后必有 P/QRS，不应期内的例外不算失夺获）、感知（自身波后仍发钉 = 感知不足；长于下限频率间期的间歇无钉 = 感知过度）、频率（钉到钉 = 下限频率；磁铁 → 非同步）。', 'The three-function check: capture (a P/QRS after every spike — a spike inside the refractory period does not count as failure), sensing (spikes after intrinsic beats = undersensing; a pause beyond the lower-rate interval with no spike = oversensing), rate (spike-to-spike = the lower rate; magnet = asynchronous).', 'La comprobación de tres funciones: captura (P/QRS tras cada espícula; la espícula dentro del periodo refractario no cuenta como fallo), detección (espículas tras latidos propios = infradetección; pausa más allá del intervalo límite sin espícula = sobredetección) y frecuencia (espícula a espícula = frecuencia límite inferior; imán = asíncrono).'),
        l('融合波与伪融合波是正常现象；起搏后自身心跳的深倒 T 可能是心脏记忆（o8），不是缺血。', 'Fusion and pseudofusion beats are normal; deep T inversion in intrinsic beats after pacing may be cardiac memory (o8), not ischaemia.', 'Los latidos de fusión y pseudofusión son normales; la T profundamente negativa de los latidos propios tras la estimulación puede ser memoria cardiaca (o8), no isquemia.'),
        l('CRT：V1 主波向上 + I 导联负向；变回 LBBB 样 = 左室失夺获。起搏心律中的急性梗死要用 Sgarbossa 型标准判读（i10）。', 'CRT: dominant R in V1 + negative lead I; reversion to LBBB-like = loss of LV capture. Acute MI in a paced rhythm is read with the Sgarbossa-type rules (i10).', 'TRC: R dominante en V1 + derivación I negativa; la reversión a un patrón tipo BRI = pérdida de captura del VI. El infarto agudo en ritmo estimulado se lee con las reglas tipo Sgarbossa (i10).'),
      ],
    },
  ],
  sources: [
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427-3520',
    'Barold SS, Herweg B. Cardiol J 2011;18:476-486',
    'Castellano et al. 2004',
  ],
};

export default lesson;
