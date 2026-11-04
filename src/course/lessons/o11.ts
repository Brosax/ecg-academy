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
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVF', 'V1', 'V6'] },
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
      kind: 'heart',
      ecg: synth('paced-vvi', 1602),
      showConduction: true,
      emphasize: ['rv-apical'],
      caption: l(
        '从右室心尖起搏：激动绕开传导系统，从右下方在心肌里慢慢爬行，于是QRS宽、像左束支阻滞、电轴向上；ST–T是继发改变。',
        'Paced from the RV apex, the wave bypasses the conduction system and crawls through muscle from the bottom right: a wide, LBBB-like QRS with a superior axis. The ST–T is secondary.',
        'Con estimulación desde el ápex del VD, el frente evita el sistema de conducción y avanza despacio por el músculo desde abajo a la derecha: QRS ancho, tipo bloqueo de rama izquierda, con eje superior. El ST-T es secundario.',
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
        {
          label: l('双室起搏：右室失夺获', 'Biventricular pacing: loss of RV capture', 'Estimulación biventricular: pérdida de captura del VD'),
          value: l('宽 QRS、类 RBBB（比双室同时夺获时更宽），I 导联 QS 或负向 = 只剩左室起搏，即右室失夺获', 'A wide RBBB-like QRS (wider than with both leads capturing) with QS or a negative lead I = LV-only pacing, i.e. loss of RV capture', 'QRS ancho tipo BRD (más ancho que con los dos electrodos capturando) con QS o negatividad en la derivación I = estimulación solo del VI, es decir, pérdida de captura del VD'),
        },
        {
          label: l('DDD 的算法', 'DDD algorithms', 'Algoritmos del DDD'),
          value: l(
            '四种状态（AP–VP、AP–VS、AS–VP、AS–VS）逐跳切换属正常；房性快速心律失常时自动模式转换为不跟踪模式（如 DDI）；室早后延长 PVARP，避免跟踪逆传 P 波；逆传 P 波被持续跟踪 = 起搏器介导的心动过速（接近上限频率的规则心室起搏心动过速，磁铁可终止）',
            'Four states (AP–VP, AP–VS, AS–VP, AS–VS) switching beat to beat is normal; atrial tachyarrhythmia triggers an automatic mode switch to a non-tracking mode (e.g. DDI); PVARP is extended after a PVC so a retrograde P is not tracked; retrograde P waves tracked again and again = pacemaker-mediated tachycardia (a regular ventricular-paced tachycardia near the upper rate, ended by a magnet)',
            'Cuatro estados (AP–VP, AP–VS, AS–VP, AS–VS) que cambian latido a latido es normal; una taquiarritmia auricular dispara el cambio automático a un modo sin seguimiento (p. ej., DDI); tras una EV se alarga el PVARP para no seguir una P retrógrada; P retrógradas seguidas una y otra vez = taquicardia mediada por marcapasos (taquicardia regular estimulada en el ventrículo cerca de la frecuencia máxima, que cede con un imán)',
          ),
        },
        {
          label: l('代谢与药物', 'Metabolic and drug effects', 'Efectos metabólicos y farmacológicos'),
          value: l(
            '高钾（典型为 K >7 mmol/L）和 IC 类药物使起搏 QRS 增宽、起搏钉到 QRS 的间期延长、阈值升高，直至传出阻滞或完全失夺获；起搏 QRS 突然宽于 200 ms：查血钾和用药（o1、o4）',
            'Hyperkalaemia (typically K >7 mmol/L) and class IC drugs widen the paced QRS, lengthen spike-to-QRS and raise thresholds up to exit block or complete loss of capture; a paced QRS suddenly wider than 200 ms: check potassium and the drug list (o1, o4)',
            'La hiperpotasemia (típicamente K >7 mmol/l) y los fármacos IC ensanchan el QRS estimulado, alargan el intervalo espícula-QRS y elevan el umbral hasta el bloqueo de salida o la pérdida completa de captura; un QRS estimulado de pronto más ancho de 200 ms: revisa el potasio y la medicación (o1, o4)',
          ),
        },
      ],
      source:
        'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Bernstein AD et al. Revised NASPE/BPEG generic code, PACE 2002;25:260-4; Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427-3520',
    },
    {
      kind: 'film',
      title: l('从起搏钉读出模式', 'Read the mode from the spikes', 'Lee el modo en las espículas'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'I', 'V1'] },
      frames: [
        {
          label: l('AAI', 'AAI', 'AAI'),
          ecg: synth('paced-aai', 1604),
          note: l('AAI，70次/分：起搏钉 → P波 → 患者自己的窄QRS（约95 ms）。夺获看心房。PR渐长就该升级为DDD。', 'AAI at 70/min: spike → P → the patient’s own narrow QRS (about 95 ms). Capture is checked in the atrium. A lengthening PR calls for DDD.', 'AAI a 70 lpm: espícula → P → el QRS estrecho propio (unos 95 ms). La captura se comprueba en la aurícula. Un PR que se alarga pide pasar a DDD.'),
          marks: [{ auto: 'pacing-spike' }, { auto: 'p' }],
        },
        {
          label: l('VVI', 'VVI', 'VVI'),
          ecg: synth('paced-vvi', 1602),
          note: l('VVI，60次/分：起搏钉 → 宽QRS（约160 ms），II、III、aVF为负，V1呈QS：右室心尖起搏。基线在颤动，自身节律是房颤。', 'VVI at 60/min: spike → wide QRS (about 160 ms), negative in II, III and aVF, QS in V1: RV apical pacing. The baseline quivers: the own rhythm is AF.', 'VVI a 60 lpm: espícula → QRS ancho (unos 160 ms), negativo en II, III y aVF, QS en V1: estimulación apical del VD. La línea de base tiembla: el ritmo propio es FA.'),
          marks: [{ auto: 'pacing-spike' }, { auto: 'qrs', lead: 'II' }],
        },
        {
          label: l('双极导线', 'Bipolar lead', 'Electrodo bipolar'),
          ecg: synth('paced-vvi', 1602, undefined, 'bipolar'),
          note: l('双极导线：起搏钉缩到约五分之一。没有钉不等于没起搏：看规则的类左束支阻滞宽QRS、电轴向上、频率等于程控下限（常为60或70次/分）、底下房颤或已知起搏器。', 'A bipolar lead: the spike shrinks to about a fifth. No visible spike does not mean no pacing: a regular, wide, LBBB-like QRS is a clue; add a superior axis, a rate exactly at the programmed lower rate (often 60 or 70/min), AF underneath or a known device.', 'Electrodo bipolar: la espícula se reduce a una quinta parte. No ver espícula no es no estimular: un QRS ancho, regular y tipo bloqueo de rama izquierda es una pista; súmale eje superior, una frecuencia igual a la frecuencia límite inferior programada (a menudo 60 o 70 lpm), FA de fondo o un dispositivo conocido.'),
          marks: [{ auto: 'pacing-spike' }],
        },
        {
          label: l('DDD：AP–VP', 'DDD: AP–VP', 'DDD: AP–VP'),
          ecg: synth('paced-ddd', 1613),
          note: l('DDD，AP–VP，64次/分：每跳两个起搏钉，第一个后有P，固定的房室延迟后第二个，再接宽QRS。', 'DDD, AP–VP at 64/min: two spikes per beat, a P after the first, the second after a fixed AV delay, then a wide QRS.', 'DDD, AP–VP a 64 lpm: dos espículas por latido, una P tras la primera y la segunda tras un retraso AV fijo, seguida de un QRS ancho.'),
          marks: [{ auto: 'pacing-spike' }, { auto: 'p' }],
        },
        {
          label: l('DDD：AS–VP', 'DDD: AS–VP', 'DDD: AS–VP'),
          ecg: synth('paced-ddd', 1613, undefined, 'tracking'),
          note: l('DDD，AS–VP：起搏器感知并跟踪患者自己的P波；每跳只有一个起搏钉，在每个P之后固定延迟出现。', 'DDD, AS–VP: the device senses and tracks the patient’s own P; one spike per beat, a fixed delay after each P.', 'DDD, AS–VP: el dispositivo detecta y sigue la P propia; una espícula por latido, con un retraso fijo tras cada P.'),
          marks: [{ auto: 'p' }, { auto: 'pacing-spike' }],
        },
        {
          label: l('双心室起搏', 'Biventricular (CRT)', 'Biventricular (TRC)'),
          ecg: synth('paced-biv', 1609),
          note: l('CRT：右室和左室导线同时起搏，QRS比单纯右室起搏窄（约135 ms对160 ms），I导联变成负的。', 'CRT: the RV and LV leads pace together; the QRS is narrower than RV pacing alone (about 135 vs 160 ms) and lead I turns negative.', 'TRC: los electrodos de VD y VI estimulan a la vez; el QRS es más estrecho que con el VD solo (unos 135 frente a 160 ms) y la derivación I se vuelve negativa.'),
          marks: [{ auto: 'pacing-spike' }, { auto: 'qrs', lead: 'I' }],
        },
      ],
      predict: {
        question: l('VVI：心室起搏、心室感知。每个起搏钉后面跟着什么？', 'VVI paces and senses the ventricle. What follows each spike?', 'VVI estimula y detecta el ventrículo. ¿Qué sigue a cada espícula?'),
        options: [l('宽QRS', 'A wide QRS', 'Un QRS ancho'), l('P波', 'A P wave', 'Una onda P'), l('窄QRS', 'A narrow QRS', 'Un QRS estrecho')],
        answer: 0,
      },
      caption: l(
        'NBG码告诉你该看到什么：第一位起搏哪个腔，第二位感知哪个腔，第三位怎样反应。起搏钉要在几个导联里找；夺获看起搏钉后面有没有P/QRS。',
        'The NBG code tells you what to expect: position I is the chamber paced, II the chamber sensed, III the response. Look for spikes in several leads; capture is the P/QRS after the spike.',
        'El código NBG dice qué esperar: la posición I es la cámara estimulada, la II la detectada y la III la respuesta. Busca las espículas en varias derivaciones; la captura es la P/QRS tras la espícula.',
      ),
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
            '沿节律条逐钉问：钉后有没有波？心房钉→P，心室钉→QRS——每一跳都有，**夺获正常**。若钉后没有 P/QRS、又不在不应期里，那就是失夺获（本课后面有例子）。',
            'Walk the strip spike by spike: is there a wave after it? Atrial spike→P, ventricular spike→QRS — present on every beat, so **capture is normal**. A spike followed by no P/QRS, outside the refractory period, would be failure to capture (examples further down this lesson).',
            'Recorre la tira espícula a espícula: ¿hay una onda después? Espícula auricular→P, espícula ventricular→QRS: está en cada latido, luego la **captura es normal**. Una espícula sin P ni QRS después, fuera del periodo refractario, sería un fallo de captura (hay ejemplos más adelante).',
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
      kind: 'contrast',
      title: l('钉之后发生了什么？', 'What happens after the spike?', '¿Qué ocurre tras la espícula?'),
      view: STRIP,
      left: {
        ecg: synth('pacing-failure-capture', 1606),
        caption: l('失夺获：钉后**空无一物**（不在不应期），交界性逸搏约 36 次/分在兜底', 'Failure to capture: **nothing** follows the spike (outside the refractory period); a junctional escape near 36/min holds the line', 'Fallo de captura: tras la espícula **no sigue nada** (fuera del periodo refractario); un escape de la unión a unas 36 lpm mantiene el tipo'),
        marks: [{ auto: 'pacing-spike' }, { auto: 'rr', beat: 4 }],
      },
      right: {
        ecg: synth('pacing-undersensing', 1607),
        caption: l('感知不足：自身 QRS 之后**仍然发钉**，计时器没有重置——设备“看不见”心室', 'Undersensing: spikes are delivered **after intrinsic QRS complexes** and the timer does not reset — the device does not "see" the ventricle', 'Infradetección: las espículas se emiten **tras los QRS propios** y el temporizador no se reinicia: el dispositivo no «ve» el ventrículo'),
        marks: [{ auto: 'pacing-spike' }, { auto: 'qrs', beat: 8 }],
      },
      point: l(
        '同一个动作——跟着钉往后看。钉后**没有** P/QRS（且不在不应期）= **失夺获**：查阈值与导线，也查血钾、药物和电池。钉落在**自身 QRS 之后**、间期不重置 = **感知不足**：查感知灵敏度；磁铁或非同步模式也会这样发钉，先问清病史。还有一个交叉细节：感知不足时落在自身 QRS 不应期里的钉不夺获，**不算**失夺获。',
        'One and the same manoeuvre — look after the spike. **No** P/QRS after it (and outside the refractory period) = **failure to capture**: check threshold and lead, and also potassium, drugs and battery. Spike falling **after an intrinsic QRS** with no interval reset = **undersensing**: check sensitivity; a magnet or asynchronous mode also paces like this, so ask first. One crossing detail: a spike from undersensing that lands in the refractory period of the intrinsic QRS and fails to capture is **not** a capture failure.',
        'Un mismo gesto: mira después de la espícula. **Ninguna** P ni QRS tras ella (y fuera del periodo refractario) = **fallo de captura**: revisa umbral y electrodo, y también potasio, fármacos y batería. Espícula que cae **tras un QRS propio** sin reinicio del intervalo = **infradetección**: revisa la sensibilidad; el imán o un modo asíncrono también estimulan así, así que pregunta antes. Un detalle cruzado: la espícula de una infradetección que cae en el periodo refractario del QRS propio y no captura **no** es un fallo de captura.',
      ),
    },
    {
      kind: 'film',
      title: l('起搏钉之后发生了什么？', 'What happens after each spike?', '¿Qué pasa tras cada espícula?'),
      view: { layout: 'strip', lead: 'II' },
      frames: [
        {
          label: l('正常', 'Working', 'Funciona'),
          ecg: synth('paced-vvi', 1610),
          note: l('每个起搏钉后都跟着宽QRS，起搏钉间距1000 ms = 下限频率60次/分。夺获、感知、频率都正常。', 'Every spike is followed by a wide QRS, and spike to spike is 1000 ms = the lower rate of 60/min. Capture, sensing and rate all normal.', 'Cada espícula va seguida de un QRS ancho y entre espículas hay 1000 ms = la frecuencia mínima de 60 lpm. Captura, detección y frecuencia normales.'),
          marks: [{ auto: 'pacing-spike' }, { auto: 'rr' }],
        },
        {
          label: l('不夺获', 'No capture', 'Sin captura'),
          ecg: synth('pacing-failure-capture', 1611),
          note: l('每第三个起搏钉后面什么都没有：起搏不夺获。约36次/分的交界性逸搏补上空档。', 'Every third spike has nothing after it: failure to capture. A junctional escape at about 36/min fills the gap.', 'Cada tercera espícula no va seguida de nada: fallo de captura. Un escape de la unión a unos 36 lpm rellena el hueco.'),
          marks: [{ auto: 'pacing-spike' }, { auto: 'rr', beat: 4 }],
        },
        {
          label: l('感知不足', 'Undersensing', 'Infradetección'),
          ecg: synth('pacing-undersensing', 1612),
          note: l('起搏钉紧跟在患者自己的QRS之后，计时也不重置：起搏器没“看见”心室——感知不足。', 'Spikes land right after the patient’s own QRS and the timer does not reset: the device does not see the ventricle. Undersensing.', 'Las espículas caen justo tras el QRS propio y el temporizador no se reinicia: el dispositivo no ve el ventrículo. Infradetección.'),
          marks: [{ auto: 'pacing-spike' }, { auto: 'qrs', beat: 9 }],
        },
        {
          label: l('感知过度', 'Oversensing', 'Sobredetección'),
          ecg: synth('pacing-oversensing', 1608),
          note: l('一个约2.6秒的停顿，既无起搏钉也无QRS，长于1秒的下限间期：感知过度。', 'A pause of about 2.6 s with no spike and no QRS, longer than the 1-s lower-rate interval: oversensing.', 'Una pausa de unos 2,6 s sin espícula ni QRS, más larga que el intervalo mínimo de 1 s: sobredetección.'),
          marks: [{ auto: 'rr', beat: 3 }],
        },
      ],
      predict: {
        question: l('一台工作正常的VVI，下限频率60次/分。起搏钉之间相隔多久？', 'A working VVI with a lower rate of 60/min. How far apart are its spikes?', 'Un VVI que funciona, con frecuencia mínima de 60 lpm. ¿Cuánto separa sus espículas?'),
        options: [l('600 ms', '600 ms', '600 ms'), l('1000 ms', '1000 ms', '1000 ms'), l('1500 ms', '1500 ms', '1500 ms')],
        answer: 1,
        ordered: true,
      },
      caption: l(
        '三项检查：夺获、感知、频率。DDD逐跳切换状态不算故障；间期看起来奇怪时，先想算法，再想故障。',
        'Three checks: capture, sensing, rate. A DDD switching state beat by beat is not a fault; when an interval looks odd, think algorithms before malfunction.',
        'Tres comprobaciones: captura, detección y frecuencia. Un DDD que cambia de estado latido a latido no falla; si un intervalo parece raro, piensa en algoritmos antes que en avería.',
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
        '三份真实起搏心电图。先对每一份跑一遍三项检查——夺获（钉后有无 P/QRS）、感知（有无碰撞、有无超过下限频率间期的长间歇）、频率（钉到钉等于多少）——先想好结论，再揭晓。真实图上的钉样信号常常小得几乎看不见：认不出钉时，类 LBBB 的宽 QRS 加规整的 RR 是起搏的线索，再看电轴是否偏上、频率是否正好等于程控的下限频率（常为 60 或 70 次/分）、底下是否房颤、是否已知植入了起搏器。',
        'Three real paced ECGs. Run the three-function check on each — capture (a P/QRS after every spike?), sensing (any collisions? any pause beyond the lower-rate interval?), rate (what is spike-to-spike?) — commit to your answers, then reveal. On real tracings the spike is often nearly invisible: when you cannot find one, an LBBB-like wide QRS with a regular RR is a clue to pacing; add a superior axis, a rate exactly at the programmed lower rate (often 60 or 70/min), AF underneath or a known device.',
        'Tres ECG reales con marcapasos. Aplica a cada uno la comprobación de tres funciones —captura (¿P/QRS tras cada espícula?), detección (¿choques? ¿alguna pausa más allá del intervalo de la frecuencia límite inferior?) y frecuencia (¿cuánto hay de espícula a espícula?)—, decide tus conclusiones y después mira la solución. En los trazados reales la espícula suele ser casi invisible: cuando no la encuentres, un QRS ancho tipo BRI con RR regular es una pista de estimulación; súmale el eje superior, una frecuencia igual a la frecuencia límite inferior programada (a menudo 60 o 70 lpm), una FA de fondo o un dispositivo conocido.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('把钉样信号的大小当成输出能量：双极起搏的钉本来就小到看不见，大小与夺获好坏无关。', 'Equating spike size with output: a bipolar spike is tiny or invisible by design — its size says nothing about capture.', 'Equiparar el tamaño de la espícula con la energía de salida: la espícula bipolar es pequeña o invisible por diseño; su tamaño no dice nada de la captura.'),
        l('伪融合波被当作感知不足：钉落在自身 QRS 上而没有改变它，是正常的时间巧合，不是故障。', 'Calling pseudofusion undersensing: a spike falling on an intrinsic QRS without changing it is a normal timing coincidence, not a malfunction.', 'Llamar infradetección a la pseudofusión: una espícula que cae sobre un QRS propio sin modificarlo es una coincidencia temporal normal, no un fallo.'),
        l('见到超过下限频率的长间歇就宣布“电池耗竭”，不先排除频率滞后、睡眠频率和减少右室起搏的算法。', 'Declaring "battery depletion" at a pause beyond the lower rate without first excluding rate hysteresis, sleep rates and RV-pacing-avoidance algorithms.', 'Declarar «agotamiento de la batería» ante una pausa superior a la frecuencia límite inferior sin excluir antes la histéresis de frecuencia, la frecuencia de reposo y los algoritmos que minimizan la estimulación del VD.'),
        l('用普通 ST 阈值判读起搏心律的 ST 段：右室起搏掩盖梗死的方式与 LBBB 相同，要用 Sgarbossa 型标准（i10）。', 'Reading ST in a paced rhythm with the usual thresholds: RV pacing hides infarction exactly as LBBB does — apply the Sgarbossa-type rules (i10).', 'Leer el ST de un ritmo estimulado con los umbrales habituales: la estimulación del VD oculta el infarto igual que el BRI; aplica las reglas tipo Sgarbossa (i10).'),
        l('只凭 V1 负向就判定左室失夺获：V1 的形态取决于左室导线的位置和 V1 电极的位置。CRT 那一帧 V1 是负的，但 I 导联转负、QRS 比单纯右室起搏窄，说明两根导线都在夺获。', 'Calling loss of LV capture from a negative V1 alone: V1 depends on the LV lead site and on where V1 sits. In the CRT frame V1 is negative, yet lead I turns negative and the QRS is narrower than with RV pacing alone, so both leads capture.', 'Diagnosticar pérdida de captura del VI solo porque V1 es negativa: V1 depende del sitio del electrodo del VI y de dónde esté V1. En el fotograma de TRC V1 es negativa, pero la derivación I se vuelve negativa y el QRS es más estrecho que con el VD solo: los dos electrodos capturan.'),
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
        l('CRT：V1 常主波向上；I 导联负向；变回 LBBB 样 = 左室失夺获。起搏心律中的急性梗死要用 Sgarbossa 型标准判读（i10）。', 'CRT: often a dominant R in V1; lead I negative; reversion to LBBB-like = loss of LV capture. Acute MI in a paced rhythm is read with the Sgarbossa-type rules (i10).', 'TRC: a menudo R dominante en V1; derivación I negativa; la reversión a un patrón tipo BRI = pérdida de captura del VI. El infarto agudo en ritmo estimulado se lee con las reglas tipo Sgarbossa (i10).'),
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
