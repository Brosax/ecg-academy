/**
 * X3 — Ten-second emergency triage (docs/PLAN.md §3, stage X).
 * The triage bins (act now / review today / routine) are this course's assessment framework and match the `triage`
 * drill: act now = any finding of severity 'critical' in src/core/findings.ts (Brugada type 1 without symptoms is
 * same-day, TRIAGE_OVERRIDE); occlusion urgency per Byrne 2023, unstable bradycardia per Kusumoto 2019 (2018
 * ACC/AHA/HRS), arrest rhythms per Soar 2021 ERC ALS, long QT: act now only with QTc ≥ 500 ms or torsades / symptoms
 * such as syncope (AHA 2009 Part IV), otherwise review promptly (same day).
 *
 * ECGs: synthetic infra-His complete AV block (escape ≈ 34/min, QRS ≈ 150 ms, atrial ≈ 78/min), synthetic anterior
 * STEMI (92/min, ST ↑ ≈ 2.5–4.5 mm V2–V4, reciprocal ↓ II/III/aVF), severe hyperkalaemia (QRS ≈ 170 ms, no visible P,
 * peaked T in V3–V5), digoxin effect (PR ≈ 190 ms, sagging ST V4–V6). Real PTB-XL: 4408 (M77, sinus tachycardia
 * ≈ 130/min), 7688 (F86, complete AV block, ≈ 40/min, narrow escape), 19269 (F87, acute inferoposterior MI, stadium I),
 * 16151 (F87, complete AV block, ≈ 27/min, wide escape), 19505 (F43, sinus tachycardia ≈ 139/min, otherwise normal).
 */
import { l } from '../../core/l10n';
import type { EcgSource, Item } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});
const real = (id: number): EcgSource => ({ kind: 'real', id });
const STRIP = { layout: 'strip', lead: 'II' } as const;
const GRID = { layout: '3x4+1' } as const;

const BINS = [
  { id: 'critical', label: l('现在处理', 'Act now', 'Actuar ya') },
  { id: 'major', label: l('当天评估', 'Review today', 'Revisar hoy') },
  { id: 'routine', label: l('常规', 'Routine', 'Rutina') },
] as const;

/** Ten seconds on a real slow tracing: commit to a bin before the explanation. */
const slowReal: Item = {
  id: 'x3:bin-7688',
  family: 'triage',
  competency: 'C11',
  difficulty: 'classic',
  seed: 0,
  kind: 'choice',
  prompt: l(
    '十秒：86 岁女性的真实心电图，申请单没有临床信息。跑完十秒流程，选一个箱子。',
    'Ten seconds: a real ECG of an 86-year-old woman; the request slip gives no clinical details. Run the ten-second routine and pick a bin.',
    'Diez segundos: ECG real de una mujer de 86 años; la petición no aporta datos clínicos. Haz la rutina de diez segundos y elige una categoría.',
  ),
  ecg: real(7688),
  view: GRID,
  explanation: l(
    '**现在处理。** 第 0–3 秒就命中：心室率约 40 次/分，规则，QRS 窄——心脏科医师标注为**三度（完全性）房室传导阻滞**，窄 QRS 逸搏提示阻滞位于房室结/希氏束附近。患者此刻也许还稳定，但完全性阻滞属于“现在处理”：立即床旁评估（意识、血压、灌注），贴上除颤/起搏电极片，备好经皮起搏，持续监护，查药物（β 受体阻滞剂、地高辛）与钾。窄逸搏时阿托品可以一试；宽逸搏时通常无效（本课开头）。',
    '**Act now.** The routine hits in seconds 0–3: ventricular rate about 40/min, regular, narrow QRS — labelled by the cardiologists as **third-degree (complete) AV block**; a narrow escape points to a block at the level of the AV node or His bundle. The patient may be stable right now, but complete block belongs in the act-now bin: assess at the bedside at once (consciousness, blood pressure, perfusion), put the defibrillation/pacing pads on, have transcutaneous pacing ready, monitor continuously, check drugs (beta-blockers, digoxin) and potassium. Atropine is worth trying with a narrow escape; with a wide escape it usually fails (this lesson\'s hook).',
    '**Actuar ya.** La rutina acierta en los segundos 0-3: frecuencia ventricular de unas 40 lpm, regular, con QRS estrecho; los cardiólogos lo etiquetaron como **bloqueo AV de tercer grado (completo)**, y un escape estrecho sugiere un bloqueo a nivel del nodo AV o del His. Puede que la paciente esté estable ahora, pero el bloqueo completo va a la categoría de actuar ya: valoración inmediata a pie de cama (conciencia, presión arterial, perfusión), parches de desfibrilación/estimulación colocados, estimulación transcutánea preparada, monitorización continua y revisión de fármacos (betabloqueantes, digoxina) y del potasio. Con escape estrecho merece la pena probar atropina; con escape ancho suele fallar (el gancho de esta lección).',
  ),
  findings: ['av-block-3'],
  key: { options: BINS, correct: 'critical' },
};

const lesson: Lesson = {
  id: 'x3',
  stage: 'X',
  order: 3,
  title: l('10秒急诊分诊', 'Ten-second emergency triage', 'Triaje urgente en diez segundos'),
  summary: l(
    '十秒流程把阅读压缩成决策：心率 → 致命节律（快/慢/无）→ ST → 钾/T 形态 → 设备；任何一步命中即进“现在处理”箱，其余阅读在患者安全之后完成。',
    'The ten-second routine compresses reading into a decision: rate → deadly rhythm (fast/slow/absent) → ST → K/T shape → device; any hit goes straight into the act-now bin, and the rest of the reading waits until the patient is safe.',
    'La rutina de diez segundos convierte la lectura en una decisión: frecuencia → ritmo letal (rápido/lento/ausente) → ST → forma de K/T → dispositivo; cualquier acierto va directo a la categoría de actuar ya, y el resto de la lectura espera a que el paciente esté a salvo.',
  ),
  objectives: [
    l('对一份陌生心电图在十秒内说出分诊箱（现在处理/当天评估/常规）与第一动作。', 'Put an unfamiliar ECG into a triage bin (act now / review today / routine) with a first action, in ten seconds.', 'Clasificar un ECG desconocido en una categoría de triaje (actuar ya / revisar hoy / rutina) con una primera acción, en diez segundos.'),
    l('按固定顺序执行十秒流程：心率 → 致命节律 → ST → T 形状 → 起搏设备。', 'Run the ten-second routine in a fixed order: rate → deadly rhythm → ST → T shape → pacing device.', 'Ejecutar la rutina de diez segundos en orden fijo: frecuencia → ritmo letal → ST → forma de la T → dispositivo de estimulación.'),
    l('背出“现在处理”清单——与分诊训练评分所用的危急表现清单一致。', 'Recite the act-now list — the same list of critical findings the triage drill grades you on.', 'Recitar la lista de actuar ya: la misma lista de hallazgos críticos con la que se puntúa el entrenamiento de triaje.'),
    l('把分诊决策与完整阅读分开：先安全，后 x1 的十步报告。', 'Separate the triage decision from the full read: safety first, the ten-step report from x1 afterwards.', 'Separar la decisión de triaje de la lectura completa: primero la seguridad, después el informe de diez pasos de x1.'),
  ],
  minutes: 18,
  competencies: ['C11', 'C8'],
  findings: ['av-block-3', 'stemi-anterior', 'stemi-inferior', 'hyperkalemia', 'digoxin-effect'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('av-block-3', 1841, undefined, 'infra-his'),
      view: STRIP,
      question: l(
        '复苏湾。监护仪上只有这条节律，你只有十秒——先行动，后读图。一位七十多岁男性，晕厥后送入，意识模糊，收缩压 78。想好你的第一个动作。',
        'The resus bay. This strip is all you have on the monitor, and you have ten seconds — act now, read later. A man in his seventies, brought in after a syncope, drowsy, systolic pressure 78. Decide your FIRST action.',
        'Sala de reanimación. Esta tira es todo lo que hay en el monitor y tienes diez segundos: actuar ya, leer después. Un varón de setenta y tantos años, trasladado tras un síncope, somnoliento, tensión sistólica 78. Decide tu PRIMERA acción.',
      ),
      reveal: l(
        '约 34 次/分的**宽大室性逸搏**（QRS 约 150 ms），P 波约 78 次/分，与 QRS 各行其道——希氏束以下的**三度房室传导阻滞**，这个心室率撑不住灌注：不稳定心动过缓，**现在处理箱**。第一个动作不是把图读完，而是：贴上除颤/起搏电极片，启动**经皮起搏**（阿托品对希氏束以下的阻滞基本无效），同时找可逆原因。形态学细节等患者安全之后再读——那是 x1 的十步。',
        'A **wide ventricular escape** (QRS about 150 ms) at about 34/min, with P waves at about 78/min marching to their own drummer — **complete AV block below the His**, and this ventricular rate cannot maintain perfusion: unstable bradycardia, **act-now bin**. The first action is not to finish reading the tracing: put defibrillation/pacing pads on and start **transcutaneous pacing** (atropine rarely helps below the His) while you look for reversible causes. The morphological detail waits until the patient is safe — that is the ten-step read from x1.',
        'Un **escape ventricular ancho** (QRS de unos 150 ms) a unas 34 lpm, con ondas P a unas 78 lpm marchando a su aire: **bloqueo AV completo por debajo del His**, y esa frecuencia ventricular no mantiene la perfusión. Bradicardia inestable, **categoría de actuar ya**. La primera acción no es terminar de leer la tira: coloca los parches de desfibrilación/estimulación e inicia la **estimulación transcutánea** (la atropina rara vez ayuda por debajo del His) mientras buscas causas reversibles. La morfología espera a que el paciente esté a salvo: eso es la lectura de diez pasos de x1.',
      ),
    },
    {
      kind: 'text',
      title: l('三个分诊箱', 'The three triage bins', 'Las tres categorías de triaje'),
      body: l(
        '每份心电图报告的最后一行都是三个箱之一（x1 骨架的第 10 步）。“现在处理”就是本课程所有**危急**表现的清单——分诊训练正是按它评分：\n- **节律**：心室颤动、无脉或有脉的室性心动过速、尖端扭转、心搏停止（t6–t7）；室性逸搏心律。\n- **传导**：二度 II 型、高度与三度房室传导阻滞（r4、本课开头）。\n- **缺血**：任何部位的 STEMI 与等危症——后壁、右心室、de Winter、Wellens、超急性 T、aVR 抬高伴广泛 ST 压低、束支阻滞或起搏下 Sgarbossa 阳性（i3–i10）。\n- **全身与药物**：高钾血症（o1）、钠通道阻滞剂中毒（o4）、QTc ≥500 ms 或伴尖端扭转/晕厥等症状的长 QT（h7）、低体温（o5）、急性肺栓塞的右心负荷图形（o6）。\n- **设备**：起搏器失夺获或感知过度（o11）。预激合并心房颤动（t4）同样是急症：最短 RR <250 ms 时有室颤风险。\n**当天评估**：稳定患者的新发左束支或双分支阻滞、二度 I 型或 2:1 阻滞、心室率未控制的房颤/房扑/室上速、无症状的 Brugada 1 型、QTc 延长但 <500 ms 且无症状（及时复查：药物、血钾、血镁）、缺血性 ST 压低或 T 倒置而无进行中闭塞。**常规**：慢性稳定的发现——陈旧性心梗、慢性右束支阻滞、一度房室阻滞、无中毒征象的药物效应。\n箱子是本课程的评估框架，不是某一部指南的原始分类：闭塞参照 Byrne 2023，心动过缓参照 Kusumoto 2019，骤停参照 Soar 2021。',
        'The last line of every ECG report is one of three bins (step 10 of the skeleton from x1). "Act now" is simply this course\'s list of **critical** findings — the very list the triage drill grades you on:\n- **Rhythm**: VF, VT with or without a pulse, torsades, asystole (t6–t7); a ventricular escape rhythm.\n- **Conduction**: Mobitz II, high-grade and complete AV block (r4, this lesson\'s hook).\n- **Ischaemia**: STEMI in any territory and its equivalents — posterior, right ventricular, de Winter, Wellens, hyperacute T, aVR elevation with diffuse ST depression, positive Sgarbossa with LBBB or pacing (i3–i10).\n- **Systemic and drugs**: hyperkalaemia (o1), sodium-channel-blocker toxicity (o4), a QTc ≥ 500 ms or a long QT with torsades or symptoms such as syncope (h7), hypothermia (o5), the acute right-heart strain of pulmonary embolism (o6).\n- **Devices**: pacemaker failure to capture or oversensing (o11). Pre-excited atrial fibrillation (t4) is an emergency too: with a shortest RR < 250 ms it can degenerate into VF.\n**Review today**: in a stable patient, a new LBBB or bifascicular block, Mobitz I or 2:1 block, AF/flutter/SVT with an uncontrolled rate, an asymptomatic Brugada type 1, a prolonged QTc under 500 ms without symptoms (review promptly: drugs, potassium, magnesium), ischaemic ST depression or T inversion without an ongoing occlusion. **Routine**: chronic, stable findings — old infarction, chronic RBBB, first-degree AV block, a drug effect without signs of toxicity.\nThe bins are this course\'s assessment framework, not one guideline\'s taxonomy: occlusion per Byrne 2023, bradycardia per Kusumoto 2019, arrest per Soar 2021.',
        'La última línea de todo informe electrocardiográfico es una de tres categorías (paso 10 del esqueleto de x1). «Actuar ya» es, sin más, la lista de hallazgos **críticos** de este curso, la misma con la que se puntúa el entrenamiento de triaje:\n- **Ritmo**: FV, TV con o sin pulso, torsade de pointes, asistolia (t6-t7); ritmo de escape ventricular.\n- **Conducción**: bloqueo AV Mobitz II, avanzado y completo (r4, el gancho de esta lección).\n- **Isquemia**: IAMCEST de cualquier territorio y sus equivalentes: posterior, de ventrículo derecho, De Winter, Wellens, T hiperagudas, elevación en aVR con descenso difuso del ST, Sgarbossa positivo con BRI o marcapasos (i3-i10).\n- **Sistémico y fármacos**: hiperpotasemia (o1), intoxicación por bloqueantes del sodio (o4), QTc ≥ 500 ms o QT largo con torsade o síntomas como el síncope (h7), hipotermia (o5), la sobrecarga aguda del VD del tromboembolismo pulmonar (o6).\n- **Dispositivos**: fallo de captura o sobredetección del marcapasos (o11). La fibrilación auricular preexcitada (t4) también es una urgencia: con un RR mínimo < 250 ms puede degenerar en FV.\n**Revisar hoy**: en un paciente estable, BRI o bloqueo bifascicular nuevos, Mobitz I o bloqueo 2:1, FA/aleteo/TSV con frecuencia no controlada, Brugada tipo 1 asintomático, QTc prolongado pero < 500 ms y sin síntomas (revisión sin demora: fármacos, potasio, magnesio), descenso isquémico del ST o T invertida sin oclusión en curso. **Rutina**: hallazgos crónicos estables: infarto antiguo, bloqueo de rama derecha crónico, bloqueo AV de primer grado, efecto farmacológico sin signos de toxicidad.\nLas categorías son el marco de evaluación de este curso, no la taxonomía de una guía concreta: la oclusión según Byrne 2023, la bradicardia según Kusumoto 2019 y la parada según Soar 2021.',
      ),
    },
    {
      kind: 'criteria',
      title: l('分诊箱卡片', 'The triage-bin card', 'La tarjeta de triaje'),
      items: [
        {
          label: l('现在处理', 'Act now', 'Actuar ya'),
          value: l('骤停与室性节律 · 二度 II 型/高度/三度阻滞 · STEMI 及等危症 · 高钾 · 钠通道阻滞剂中毒 · QTc ≥500 ms 或长 QT 伴尖端扭转/晕厥 · 低体温 · 急性肺栓塞 · 起搏器失夺获/感知过度 · 预激房颤', 'Arrest and ventricular rhythms · Mobitz II / high-grade / complete block · STEMI and equivalents · hyperkalaemia · Na-channel-blocker toxicity · QTc ≥ 500 ms, or long QT with torsades / syncope · hypothermia · acute PE · pacing failure to capture / oversensing · pre-excited AF', 'Ritmos de parada y ventriculares · Mobitz II / avanzado / completo · IAMCEST y equivalentes · hiperpotasemia · intoxicación por bloqueantes del sodio · QTc ≥ 500 ms, o QT largo con torsade / síncope · hipotermia · TEP agudo · fallo de captura / sobredetección · FA preexcitada'),
        },
        {
          label: l('当天评估', 'Review today', 'Revisar hoy'),
          value: l('稳定患者：新发左束支/双分支阻滞 · 二度 I 型或 2:1 · 心室率未控制的房颤/房扑/室上速 · 无症状 Brugada 1 型 · QTc 延长但 <500 ms、无症状 · 缺血性 ST 压低/T 倒置', 'Stable patient: new LBBB / bifascicular block · Mobitz I or 2:1 · uncontrolled AF / flutter / SVT · asymptomatic Brugada type 1 · prolonged QTc < 500 ms without symptoms · ischaemic ST depression / T inversion', 'Paciente estable: BRI / bifascicular nuevos · Mobitz I o 2:1 · FA / aleteo / TSV no controladas · Brugada tipo 1 asintomático · QTc prolongado < 500 ms sin síntomas · descenso isquémico del ST / T invertida'),
        },
        {
          label: l('常规', 'Routine', 'Rutina'),
          value: l('慢性稳定发现：陈旧性心梗 · 慢性右束支阻滞 · 一度房室阻滞 · 无中毒征象的药物效应', 'Chronic stable findings: old infarction · chronic RBBB · first-degree AV block · drug effect without toxicity', 'Hallazgos crónicos estables: infarto antiguo · bloqueo de rama derecha crónico · bloqueo AV de primer grado · efecto farmacológico sin toxicidad'),
        },
        {
          label: l('判箱依据', 'What decides the bin', 'Qué decide la categoría'),
          value: l('患者的稳定性 + 节律/ST 的机制——不是心率数字，也不是图“多难看”', 'The patient\'s stability + the mechanism of the rhythm/ST — not the heart-rate number and not how odd the tracing looks', 'La estabilidad del paciente + el mecanismo del ritmo/ST, no el número de frecuencia ni el aspecto extraño del ECG'),
        },
        {
          label: l('十秒流程', 'The ten-second scan', 'El escaneo de diez segundos'),
          value: l('心率 → 致命（快/慢/无）→ ST → K/T 形态 → 设备', 'Rate → deadly (fast/slow/absent) → ST → K/T shape → device', 'Frecuencia → letal (rápido/lento/ausente) → ST → forma de K/T → dispositivo'),
        },
      ],
      source:
        'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826; Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482; Soar J et al. European Resuscitation Council Guidelines 2021: Adult advanced life support. Resuscitation 2021;161:115-151; Rautaharju PM et al. AHA/ACCF/HRS Part IV: The ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    },
    {
      kind: 'text',
      title: l('十秒流程', 'The ten-second routine', 'La rutina de diez segundos'),
      body: l(
        '每一步只回答一个问题：**这一步要不要把图放进“现在处理”箱？**\n- 秒 0–3 · 心率：RR 规则吗？快、慢、乱，还是停？低于 40 或高于 150 次/分，立刻往下追问原因。\n- 秒 3–5 · 致命节律：没有 QRS？宽而极快？P 与 QRS 脱节？心脏骤停节律与完全性阻滞在这一步拦截。\n- 秒 5–8 · ST：一组相邻导联抬高（找镜像），或广泛压低伴 aVR 抬高，或 V1–V3 压低（后壁）——进行中的闭塞。\n- 秒 8–10 · 形状与设备：T 高尖而窄（钾）、QRS 与 T 融合成正弦波、QTc ≥500 ms（或长 QT 伴尖端扭转、晕厥）、起搏信号后有没有夺获？\n任何一步答“是”：放下分规，先动手。全部答“否”：其余阅读照常进行——但你已经知道患者不在“现在处理”箱里。',
        'Each step answers exactly one question: **does this step put the tracing in the act-now bin?**\n- Seconds 0–3 · rate: is the RR regular? Fast, slow, chaotic, or absent? Below 40 or above 150/min, ask why straight away.\n- Seconds 3–5 · deadly rhythm: no QRS? Wide and very fast? P waves dissociated from the QRS? The arrest rhythms and complete block get caught here.\n- Seconds 5–8 · ST: elevation in a contiguous lead group (look for the mirror image), widespread depression with aVR elevation, or depression in V1–V3 (posterior) — ongoing occlusion.\n- Seconds 8–10 · shape and device: a tall, narrow, tented T (potassium), a QRS merging into a sine wave, a QTc ≥ 500 ms (or a long QT with torsades or syncope), a pacing spike with or without capture?\nA "yes" anywhere: put the calipers down and act. All "no": read on as usual — you already know the patient is not in the act-now bin.',
        'Cada paso responde a una sola pregunta: **¿este paso mete el ECG en la categoría de actuar ya?**\n- Segundos 0-3 · frecuencia: ¿el RR es regular? ¿Rápido, lento, caótico o ausente? Por debajo de 40 o por encima de 150 lpm, pregúntate el porqué de inmediato.\n- Segundos 3-5 · ritmo letal: ¿sin QRS? ¿Ancho y muy rápido? ¿Ondas P disociadas del QRS? Los ritmos de parada y el bloqueo completo se interceptan aquí.\n- Segundos 5-8 · ST: elevación en un grupo de derivaciones contiguas (busca la imagen especular), descenso difuso con elevación en aVR, o descenso en V1-V3 (posterior): oclusión en curso.\n- Segundos 8-10 · forma y dispositivo: una T picuda, estrecha y simétrica (potasio), un QRS que se fusiona en onda sinusoidal, un QTc ≥ 500 ms (o un QT largo con torsade o síncope), ¿una espícula de marcapasos con o sin captura?\nUn «sí» en cualquier paso: suelta el compás y actúa. Todo «no»: sigue leyendo con calma; ya sabes que el paciente no está en la categoría de actuar ya.',
      ),
    },
    {
      kind: 'worked',
      title: l('给十秒流程掐表：前壁 STEMI', 'Clocking the routine: an anterior STEMI', 'Cronometrando la rutina: un IAMCEST anterior'),
      ecg: synth('stemi-anterior', 1842, { rate: 92, st: 0.34 }),
      view: GRID,
      steps: [
        {
          title: l('第 0–3 秒 · 心率', 'Seconds 0–3 · rate', 'Segundos 0-3 · frecuencia'),
          body: l('"RR 规则，约 92 次/分——不快、不慢、不乱。"第一道筛就排除了骤停与不稳定心动过缓；继续。', '"Regular RR, about 92/min — not fast, not slow, not chaotic." The first sieve has already excluded arrest and unstable bradycardia; carry on.', '«RR regular, unas 92 lpm: ni rápido, ni lento, ni caótico». El primer tamiz ya ha excluido la parada y la bradicardia inestable; sigue.'),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('第 3–5 秒 · 致命节律？', 'Seconds 3–5 · deadly rhythm?', 'Segundos 3-5 · ¿ritmo letal?'),
          body: l('"每个 QRS 前有 P，QRS 不宽——不是室速，不是骤停节律，没有房室脱节。"第二道筛通过；还剩五秒，去看 ST。', '"A P before every QRS and a narrow QRS — not VT, not an arrest rhythm, no AV dissociation." Second sieve passed; five seconds left, go to the ST segments.', '«Una P antes de cada QRS y un QRS estrecho: no es una TV, ni un ritmo de parada, ni hay disociación AV». Segundo tamiz superado; quedan cinco segundos, pasa al ST.'),
          marks: [{ auto: 'qrs' }],
        },
        {
          title: l('第 5–8 秒 · ST', 'Seconds 5–8 · ST', 'Segundos 5-8 · ST'),
          body: l('"V2–V4 相邻导联 ST 抬高约 2.5–4.5 mm（V3 最高），II/III/aVF 镜像压低——**进行中的前壁闭塞：STEMI**（i3）。"第八秒，箱子确定：**现在处理——启动再灌注**。决策到此完成，剩下的秒数不再改变它。', '"ST elevation of about 2.5–4.5 mm across V2–V4 (highest in V3) with reciprocal depression in II/III/aVF — **ongoing anterior occlusion: STEMI** (i3)." At second eight the bin is set: **act now — activate reperfusion**. The decision is done; the remaining seconds will not change it.', '«Elevación del ST de unos 2,5-4,5 mm en V2-V4 (máxima en V3) con descenso recíproco en II/III/aVF: **oclusión anterior en curso: IAMCEST** (i3)». Al segundo ocho la categoría está fijada: **actuar ya, activar la reperfusión**. La decisión ya está tomada; los segundos restantes no la cambian.'),
          marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
          highlightLeads: ['V2', 'V3', 'V4', 'II', 'III', 'aVF'],
        },
        {
          title: l('第 8–10 秒及之后 · 安全后的阅读', 'Seconds 8–10 and after · the read that follows safety', 'Segundos 8-10 y después · la lectura que sigue a la seguridad'),
          body: l('最后两秒扫 T 形状（不窄不尖，不支持高钾）与起搏信号（无）。患者已在去导管室路上；x1 的十步报告照常补完——间期、电轴、对比旧图——每一条都还要写，只是不再决定第一动作。', 'The last two seconds sweep the T shape (not narrow and tented — against potassium) and the pacing signal (none). The patient is on the way to the cath lab; the ten-step report from x1 still gets written — intervals, axis, comparison with old tracings — every line of it, only now it no longer decides the first action.', 'Los dos últimos segundos barren la forma de la T (ni estrecha ni picuda: en contra del potasio) y la señal de estimulación (ninguna). El paciente va camino de hemodinámica; el informe de diez pasos de x1 se completa igual —intervalos, eje, comparación con previos—, cada línea sigue escrita, solo que ya no decide la primera acción.'),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('都异常，箱相反', 'Both abnormal, opposite bins', 'Ambos anormales, categorías opuestas'),
      view: STRIP,
      left: {
        ecg: real(4408),
        caption: l('真实病例：77 岁男性——窦性心动过速约 130 次/分，每个 QRS 前一个 P', 'Real case: a 77-year-old man — sinus tachycardia at about 130/min, a P before every QRS', 'Caso real: varón de 77 años; taquicardia sinusal a unas 130 lpm, una P antes de cada QRS'),
      },
      right: {
        ecg: synth('av-block-3', 1843, undefined, 'infra-his'),
        caption: l('三度房室传导阻滞（希氏束下），室性逸搏约 34 次/分', 'Complete AV block (infra-His), ventricular escape about 34/min', 'Bloqueo AV completo (infrahisiano), escape ventricular de unas 34 lpm'),
        marks: [{ auto: 'qrs', label: l('宽 QRS 逸搏', 'Wide escape QRS', 'QRS de escape ancho') }],
      },
      point: l(
        '两份都“异常”，箱子相反。左：快而规则、每个 QRS 前有 P——窦性心动过速是**症状**，治疗对象是它背后的原因（发热、疼痛、失血、脓毒症、缺氧、休克），不是节律本身；箱子由原因决定，心电图本身最多是“当天”。右：慢而宽，P 与 QRS 各行其道——直接进“现在处理”箱：电极片、起搏。**心率数字不定箱：患者的稳定状态与节律的机制才定箱。**',
        'Both are "abnormal"; the bins are opposite. Left: fast and regular with a P before every QRS — sinus tachycardia is a **symptom**, and the target of treatment is whatever drives it (fever, pain, blood loss, sepsis, hypoxia, shock), not the rhythm itself; the cause sets the bin, and the tracing on its own is at most "today". Right: slow and wide, P waves marching independently — straight into the act-now bin: pads on, pace. **The heart-rate number does not set the bin; the patient\'s stability and the mechanism of the rhythm do.**',
        'Ambos son «anormales» y las categorías son opuestas. Izquierda: rápido y regular con una P antes de cada QRS; la taquicardia sinusal es un **síntoma** y el objetivo del tratamiento es lo que la provoca (fiebre, dolor, hemorragia, sepsis, hipoxia, shock), no el ritmo en sí; la causa decide la categoría, y el ECG por sí solo como mucho es «hoy». Derecha: lento y ancho, con ondas P independientes; directo a la categoría de actuar ya: parches y estimulación. **El número de frecuencia no decide la categoría; la estabilidad del paciente y el mecanismo del ritmo sí.**',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('hyperkalemia-severe', 1844, { rate: 58 }),
      view: GRID,
      marks: [
        { auto: 'qrs', lead: 'V4', label: l('QRS 增宽', 'QRS widening', 'QRS ancho') },
        { auto: 't', lead: 'V4', label: l('高尖 T', 'Tented T', 'T picuda') },
      ],
      caption: l(
        '十秒流程的最后两秒：T 的形状。找不到 P，QRS 增宽到约 170 ms，V3–V5 的 T 高尖、底窄——QRS 与 T 正在融合，正弦波就在前方（重度高钾血症，o1）。**现在处理箱**：静脉钙剂稳定心肌、把钾移入细胞、促进排钾；这不是室速，电击不是答案。',
        'The last two seconds of the routine: the shape of the T. No P to be found, a QRS widened to about 170 ms, tall narrow-based peaked T waves in V3–V5 — the QRS and T are merging, and the sine wave lies just ahead (severe hyperkalaemia, o1). **Act-now bin**: intravenous calcium to stabilise the myocardium, shift potassium into cells, remove it; this is not VT, and a shock is not the answer.',
        'Los dos últimos segundos de la rutina: la forma de la T. No hay P que encontrar, el QRS se ha ensanchado hasta unos 170 ms y las T de V3-V5 son altas, picudas y de base estrecha: el QRS y la T se están fusionando y la onda sinusoidal está a la vuelta de la esquina (hiperpotasemia grave, o1). **Categoría de actuar ya**: calcio intravenoso para estabilizar el miocardio, pasar el potasio al interior celular y eliminarlo; esto no es una TV y la descarga no es la respuesta.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('digoxin-effect', 1845),
      view: GRID,
      marks: [{ auto: 'st', lead: 'V6' }],
      caption: l(
        '同一个扫描扫到药物形态：V4–V6 ST 段“鱼钩样”下垂、QT 偏短、PR 在正常上限（约 190 ms）——**洋地黄效应**（o3），不是缺血，也不是中毒。箱子：**常规**。会改箱的表现：严重心动过缓、新发传导阻滞、房速伴阻滞、频发室早——那是中毒谱，升到当天甚至现在处理。',
        'The same sweep catches drug shapes: a "fish-hook" sag of the ST segment in V4–V6, a shortish QT, a PR at the upper end of normal (about 190 ms) — **digoxin effect** (o3), not ischaemia and not toxicity. Bin: **routine**. What would move it: severe bradycardia, a new block, an atrial tachycardia with block, frequent ventricular ectopy — that is the toxicity spectrum, and it goes up to today or even act now.',
        'El mismo barrido detecta las formas farmacológicas: un descenso «en cubeta» del ST en V4-V6, un QT algo corto, un PR en el límite alto de la normalidad (unos 190 ms): **efecto digitálico** (o3), sin isquemia ni toxicidad. Categoría: **rutina**. Lo que la cambiaría: bradicardia grave, un bloqueo nuevo, una taquicardia auricular con bloqueo, extrasístoles ventriculares frecuentes; ese es el espectro tóxico, y sube a hoy o incluso a actuar ya.',
      ),
    },
    { kind: 'check', item: { inline: slowReal } },
    { kind: 'check', item: { family: 'triage', seed: 2 } },
    { kind: 'check', item: { family: 'triage', seed: 5 } },
    { kind: 'check', item: { family: 'triage', seed: 9 } },
    { kind: 'drill', families: ['triage'], count: 12, passScore: 0.9 },
    {
      kind: 'real',
      ids: [19269, 16151, 19505],
      caption: l(
        '三份真实心电图：87 岁女性、87 岁女性、43 岁女性——一份闭塞、一份慢得危险、一份快而良性。**每份只给十秒**：先说出分诊箱与第一动作，再揭晓对照标注与测量。提示：闭塞那份，除了下壁导联，也看看 V1–V3 的 ST 往哪个方向走。',
        'Three real ECGs: an 87-year-old woman, another 87-year-old woman, a 43-year-old woman — one occlusion, one dangerously slow, one fast and benign. **Ten seconds each**: commit to a bin and a first action before the reveal shows the labels and measurements. A hint: in the occlusion, look beyond the inferior leads at which way the ST goes in V1–V3.',
        'Tres ECG reales: mujer de 87 años, otra de 87 y una de 43: una oclusión, uno peligrosamente lento y uno rápido y benigno. **Diez segundos para cada uno**: decide la categoría y la primera acción antes de que la solución muestre las etiquetas y las mediciones. Una pista: en la oclusión, mira más allá de las inferiores hacia dónde va el ST en V1-V3.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l('患者正在崩溃，你还在量 PR——十秒流程没跑完就钻进了形态学细节。', 'The patient is crashing while you measure the PR — diving into morphological detail before the ten-second routine is done.', 'El paciente se está hundiendo mientras mides el PR: entrar en el detalle morfológico antes de terminar la rutina de diez segundos.'),
        l('“临界”图既不升级也不随访：箱子必须三选一，写进报告最后一行。', 'The "borderline" tracing neither escalated nor followed up: a bin must be chosen, one of three, in the report\'s last line.', 'El ECG «dudoso» ni se escala ni se sigue: hay que elegir una de las tres categorías y escribirla en la última línea del informe.'),
        l('高钾的正弦波被当作室速送去电击——先找 P、看 QRS 与 T 的融合（o1）。', 'Hyperkalaemia\'s sine wave treated as VT and shocked — look for the P and the QRS-to-T fusion first (o1).', 'La onda sinusoidal de la hiperpotasemia tratada como TV y desfibrilada: busca primero la P y la fusión QRS-T (o1).'),
        l('心率“还行”就跳过 P–QRS 关系：约 40 次/分的规则窄 QRS 也可能是完全性阻滞。', 'Skipping the P–QRS relationship because the rate looks "acceptable": a regular narrow QRS at about 40/min can still be complete block.', 'Saltarse la relación P-QRS porque la frecuencia parece «aceptable»: un QRS estrecho y regular a unas 40 lpm también puede ser un bloqueo completo.'),
        l('压力之下丢掉流程：越乱越要按顺序——心率 → 致命 → ST → K/T → 设备。', 'Abandoning the routine under pressure: the messier it gets, the stricter the order — rate → deadly → ST → K/T → device.', 'Abandonar la rutina bajo presión: cuanto mayor es el caos, más estricto el orden: frecuencia → letal → ST → K/T → dispositivo.'),
      ],
    },
    {
      kind: 'summary',
      points: [
        l('报告最后一行是三个箱之一：现在处理 / 当天评估 / 常规——由患者的稳定性与节律机制决定，不由图“多难看”决定。', 'The report\'s last line is one of three bins: act now / review today / routine — set by the patient\'s stability and the rhythm\'s mechanism, not by how odd the tracing looks.', 'La última línea del informe es una de tres categorías: actuar ya / revisar hoy / rutina; la fijan la estabilidad del paciente y el mecanismo del ritmo, no el aspecto extraño del ECG.'),
        l('十秒流程：心率 → 致命（快/慢/无）→ ST → K/T 形态 → 设备；任何一步命中即停——放下分规，先动手。', 'The ten-second routine: rate → deadly (fast/slow/absent) → ST → K/T shape → device; any hit stops it — calipers down, hands on the patient.', 'La rutina de diez segundos: frecuencia → letal (rápido/lento/ausente) → ST → forma de K/T → dispositivo; cualquier acierto la detiene: compás abajo y manos sobre el paciente.'),
        l('现在处理 = 全部危急表现：骤停与室性节律、高度/三度阻滞、STEMI 及等危症、高钾、钠通道阻滞剂、QTc ≥500 ms（或长 QT 伴尖端扭转/晕厥）、低体温、急性肺栓塞、起搏故障、预激房颤。', 'Act now = every critical finding: arrest and ventricular rhythms, high-grade / complete block, STEMI and equivalents, hyperkalaemia, Na-channel blockers, QTc ≥ 500 ms (or long QT with torsades / syncope), hypothermia, acute PE, pacing failure, pre-excited AF.', 'Actuar ya = todos los hallazgos críticos: ritmos de parada y ventriculares, bloqueo avanzado / completo, IAMCEST y equivalentes, hiperpotasemia, bloqueantes del sodio, QTc ≥ 500 ms (o QT largo con torsade / síncope), hipotermia, TEP agudo, fallo del marcapasos, FA preexcitada.'),
        l('快≠急、慢≠稳：4408 的窦速治病因，7688 与 16151 的完全性阻滞要电极片与起搏准备——心率数字不定箱。', 'Fast is not urgent and slow is not stable: 4408\'s sinus tachycardia gets its cause treated, the complete blocks of 7688 and 16151 get pads and pacing ready — the rate alone sets no bin.', 'Rápido no es urgente y lento no es estable: a la taquicardia sinusal del 4408 se le trata la causa; los bloqueos completos del 7688 y el 16151 reciben parches y estimulación preparada; la frecuencia por sí sola no decide la categoría.'),
        l('分诊不替代阅读：患者安全之后，x1 的十步报告照常完成。', 'Triage does not replace reading: once the patient is safe, the ten-step report from x1 is still written in full.', 'El triaje no sustituye a la lectura: cuando el paciente está a salvo, el informe de diez pasos de x1 se completa igual.'),
      ],
    },
  ],
  sources: [
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Soar J et al. European Resuscitation Council Guidelines 2021: Adult advanced life support. Resuscitation 2021;161:115-151',
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    'Rautaharju PM et al. AHA/ACCF/HRS Part IV: The ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    'Castellano et al. 2004',
  ],
};

export default lesson;
