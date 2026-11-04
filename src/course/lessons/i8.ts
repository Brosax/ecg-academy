/**
 * i8 — Wellens, de Winter and aVR elevation with diffuse ST depression (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `diffuse-st-depression-avr` and the "Missing in the book" bullets
 * "Wellens pattern — T wave in the pain-free state" and "de Winter pattern — STEMI equivalent". Three
 * occlusion equivalents that hide behind an almost normal ECG; none of them is a classic STEMI.
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>, variant?: string): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(variant ? { variant } : {}), ...(dials ? { dials } : {}) },
});

const lesson: Lesson = {
  id: 'i8',
  stage: 'I',
  order: 8,
  title: l(
    'Wellens综合征、de Winter T波、aVR导联ST段抬高伴广泛ST段压低',
    'Wellens, de Winter and aVR elevation with diffuse ST depression',
    'Wellens, De Winter y elevación del ST en aVR con descenso difuso del ST',
  ),
  summary: l(
    '三种藏在“几乎正常”心电图后面的高危模式：Wellens（无痛间歇期 V2–V3 的 T 波改变，左前降支近段临界狭窄）、de Winter T波（按 STEMI 处理的左前降支近段急性闭塞）与 aVR 导联 ST 抬高伴广泛 ST 压低（多支血管或左主干病变）。',
    'Three high-risk patterns hiding behind an "almost normal" ECG: Wellens (V2–V3 T-wave changes in the pain-free state, critical proximal LAD), the de Winter T-wave pattern (an acute proximal LAD occlusion managed as STEMI) and ST elevation in aVR with diffuse ST depression (multivessel or left main disease).',
    'Tres patrones de alto riesgo que se esconden tras un ECG «casi normal»: Wellens (alteraciones de la T en V2–V3 en el intervalo sin dolor, estenosis crítica proximal de la descendente anterior), el patrón de De Winter (oclusión aguda proximal de la descendente anterior que se trata como IAMCEST) y la elevación del ST en aVR con descenso difuso del ST (enfermedad multivaso o del tronco común).',
  ),
  objectives: [
    l(
      '在无痛间歇期从 V2–V3 双向（A 型）或深而对称（B 型）的 T 波倒置认出 Wellens 综合征，并说出禁忌（负荷试验）与下一步（早期造影）。',
      'Recognise Wellens in the pain-free state — biphasic (type A) or deep symmetric (type B) T inversion in V2–V3 — and name the forbidden step (stress testing) and the next one (early angiography).',
      'Reconocer Wellens en el intervalo sin dolor — T bifásica (tipo A) o negativa profunda y simétrica (tipo B) en V2–V3 — e indicar el paso prohibido (prueba de esfuerzo) y el siguiente (coronariografía precoz).',
    ),
    l(
      '认出 de Winter T波：胸前导联 J 点处上斜型 ST 压低 >1 mm、融入高大对称的 T 波（± aVR 轻度抬高），并按 STEMI 处理。',
      'Recognise the de Winter pattern — upsloping ST depression >1 mm at the J point in the precordial leads running into tall symmetric T waves (± slight aVR elevation) — and manage it as a STEMI.',
      'Reconocer el patrón de De Winter — descenso ascendente del ST >1 mm en el punto J en las precordiales, que desemboca en ondas T altas y simétricas (± leve elevación en aVR) — y tratarlo como un IAMCEST.',
    ),
    l(
      '把 aVR 导联 ST 抬高（± V1）伴 ≥6 个下侧壁导联 ST 压低 ≥1 mm 判读为多支血管/左主干病变：高危，紧急侵入评估，而不是经典 STEMI。',
      'Read ST elevation in aVR (± V1) with ST depression ≥1 mm in ≥6 inferolateral leads as multivessel or left main disease: high risk, urgent invasive assessment, not a classic STEMI.',
      'Interpretar la elevación del ST en aVR (± V1) con descenso del ST ≥1 mm en ≥6 derivaciones inferolaterales como enfermedad multivaso o del tronco común: alto riesgo, valoración invasiva urgente, no un IAMCEST clásico.',
    ),
    l(
      '把这三种高危图形与“非特异性 ST-T 改变”以及其他部位的缺血性 T 波倒置区分开。',
      'Separate these three high-risk patterns from "nonspecific ST-T changes" and from ischaemic T inversion in other territories.',
      'Distinguir estos tres patrones de alto riesgo de los «cambios inespecíficos del ST-T» y de la T negativa isquémica de otros territorios.',
    ),
  ],
  minutes: 15,
  competencies: ['C8'],
  findings: ['wellens', 'de-winter', 'avr-elevation-diffuse-std'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('wellens', 941),
      view: { layout: '3x4+1', highlightLeads: ['V2', 'V3'] },
      question: l(
        '62 岁女性，今晨胸痛 30 分钟，现在疼痛完全缓解、自觉良好。这是她在无痛间歇期的心电图——看起来“几乎正常”。有哪件事是绝对不能做的？',
        'A 62-year-old woman had 30 minutes of chest pain this morning. The pain has gone and she feels well. This is her ECG in the pain-free interval — it looks "almost normal". What must you absolutely NOT do?',
        'Una mujer de 62 años tuvo 30 minutos de dolor torácico esta mañana. El dolor ha desaparecido y se encuentra bien. Este es su ECG en el intervalo sin dolor: parece «casi normal». ¿Qué es lo que NO debes hacer en ningún caso?',
      ),
      reveal: l(
        'V3 的 T 波先直立、终末倒置（双向），V2 的 T 波已经倒置——这是 **Wellens 综合征（A 型）**：左前降支近段临界狭窄。“现在不痛”不等于“低危”：**绝对不能做运动/负荷试验**（可诱发急性前壁闭塞），应安排**早期冠状动脉造影**。',
        'The T wave in V3 starts upright and ends inverted (biphasic), and in V2 it is already inverted — this is **Wellens syndrome (type A)**: a critical proximal LAD stenosis. "Pain-free now" does not mean "low risk": **never send this patient for an exercise test** (it can precipitate an acute anterior occlusion); arrange **early coronary angiography**.',
        'La onda T de V3 empieza positiva y termina negativa (bifásica), y en V2 ya es negativa: es el **síndrome de Wellens (tipo A)**, una estenosis crítica proximal de la descendente anterior. «Sin dolor ahora» no significa «bajo riesgo»: **no la envíes nunca a una prueba de esfuerzo** (puede desencadenar una oclusión anterior aguda); programa una **coronariografía precoz**.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('wellens', 941),
      emphasize: ['lv-mid-anteroseptal', 'lv-mid-anterior', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'],
      caption: l(
        '在心脏上读同一份图：**左前降支中远段供区**（前室间隔与前壁、延伸到心尖）亮起——狭窄很重，但此刻血管没有完全闭塞；缺血发作过后复极化仍被拉长，T 波变形，而 R 波保留、不出现 Q 波。',
        'Read the same tracing on the heart: the **mid-to-distal LAD territory** (anteroseptal and anterior wall, reaching the apex) lights up — the stenosis is severe but the artery is not fully occluded at this moment; after the ischaemic episode repolarisation stays prolonged, deforming the T wave while the R is preserved and no Q appears.',
        'Lee el mismo registro sobre el corazón: se ilumina el **territorio medio-distal de la descendente anterior** (pared anteroseptal y anterior, hasta el ápex); la estenosis es grave pero la arteria no está totalmente ocluida en este momento. Tras el episodio isquémico la repolarización sigue prolongada, deforma la onda T, la R se conserva y no aparece onda Q.',
      ),
    },
    {
      kind: 'criteria',
      title: l('三种高危图形：一眼标准', 'Three high-risk patterns at a glance', 'Tres patrones de alto riesgo de un vistazo'),
      items: [
        {
          label: l('Wellens（无痛间歇期）', 'Wellens (pain-free state)', 'Wellens (intervalo sin dolor)'),
          value: l(
            '心绞痛后无痛期：V2–V3 双向 T（A 型）或深而对称倒置 T（B 型），± V1–V6；R 保留、无 Q、ST 改变轻微——左前降支近段临界狭窄；禁负荷试验，早期造影',
            'Pain-free after angina: biphasic T (type A) or deep symmetric inverted T (type B) in V2–V3 (± V1–V6); preserved R, no Q, minimal ST change — critical proximal LAD; no stress test, early angiography',
            'Sin dolor tras una angina: T bifásica (tipo A) o negativa profunda y simétrica (tipo B) en V2–V3 (± V1–V6); R conservadas, sin Q, alteración mínima del ST: estenosis crítica proximal de la descendente anterior; sin prueba de esfuerzo, coronariografía precoz',
          ),
        },
        {
          label: l('de Winter T波', 'de Winter pattern', 'Patrón de De Winter'),
          value: l(
            '胸前导联 J 点上斜型 ST 压低 >1 mm，融入高大对称的 T 波，无胸前 ST 抬高，± aVR 轻度抬高——左前降支近段急性闭塞，按 STEMI 处理',
            'Upsloping ST depression >1 mm at the J point in the precordial leads running into tall symmetric T waves, no precordial elevation, ± slight aVR elevation — acute proximal LAD occlusion, manage as STEMI',
            'Descenso ascendente del ST >1 mm en el punto J en las precordiales, que desemboca en T altas y simétricas, sin elevación precordial, ± leve elevación en aVR: oclusión aguda proximal de la descendente anterior, tratar como IAMCEST',
          ),
        },
        {
          label: l('aVR 抬高伴广泛压低', 'aVR elevation with diffuse depression', 'Elevación en aVR con descenso difuso'),
          value: l(
            'ST 压低 ≥1 mm 见于 ≥6 个下侧壁导联 + aVR 抬高（± V1）——多支血管或左主干；紧急侵入评估，不是经典 STEMI',
            'ST depression ≥1 mm in ≥6 inferolateral leads + aVR elevation (± V1) — multivessel or left main; urgent invasive assessment, not a classic STEMI',
            'Descenso del ST ≥1 mm en ≥6 derivaciones inferolaterales + elevación en aVR (± V1): multivaso o tronco común; valoración invasiva urgente, no un IAMCEST clásico',
          ),
        },
        {
          label: l('aVR 与 V1 的比较', 'aVR versus V1', 'aVR frente a V1'),
          value: l(
            '早期研究中 aVR 抬高大于 V1 抬高更提示左主干（V1 抬高更大则提示 LAD 近段）；只是线索，不能据此诊断左主干闭塞。伴低血压或血流动力学不稳时风险极高',
            'In older studies aVR elevation larger than V1 elevation pointed to the left main (larger V1 elevation to the proximal LAD); a clue, not a diagnosis of left main occlusion. With hypotension or haemodynamic compromise the risk is extreme',
            'En estudios antiguos, una elevación en aVR mayor que en V1 orientaba al tronco común (una mayor en V1, a la DA proximal); es una pista, no el diagnóstico de oclusión del tronco. Con hipotensión o inestabilidad hemodinámica el riesgo es extremo',
          ),
        },
        {
          label: l('共同红线', 'The common red line', 'La línea roja común'),
          value: l(
            '三者在“几乎正常”的心电图上都可能被漏读：每份胸痛心电图都要主动搜寻它们，并做系列心电图（第 i7 课）；都不做负荷试验，也不靠肌钙蛋白来决定去向。',
            'All three risk being missed on an "almost normal" ECG: hunt for them actively on every chest-pain ECG and repeat serially (lesson i7); none of them gets a stress test, and none waits for troponin to decide the pathway.',
            'Los tres pueden pasarse por alto en un ECG «casi normal»: búscalos de forma activa en todo ECG por dolor torácico y repítelo en serie (lección i7); a ninguno se le hace prueba de esfuerzo y ninguno espera a la troponina para decidir la vía.',
          ),
        },
      ],
      source:
        'de Zwaan C et al. Am Heart J 1982;103:730-736; de Winter RJ et al. N Engl J Med 2008;359:2071-2073; Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    },
    {
      kind: 'film',
      title: l('藏在“几乎正常”心电图后的三种图形', 'Three patterns behind an almost normal ECG', 'Tres patrones tras un ECG casi normal'),
      view: { layout: '3x4+1' },
      frames: [
        {
          label: l('Wellens A 型', 'Wellens type A', 'Wellens tipo A'),
          ecg: synth('wellens', 941),
          note: l(
            '开头那份图：V3 的 T 波先直立后倒置，V2 的已倒置；ST 平，R 波保留，没有 Q 波。左前降支近段临界狭窄：不做负荷试验。',
            'The opening tracing: T in V3 up then down, in V2 already inverted; ST flat, R preserved, no Q. Critical proximal LAD: no stress test.',
            'El trazado inicial: T en V3 primero positiva y luego negativa, en V2 ya negativa; ST plano, R conservada, sin Q. DA proximal crítica: sin prueba de esfuerzo.',
          ),
          marks: [{ auto: 't', lead: 'V3' }],
        },
        {
          label: l('Wellens B 型', 'Wellens type B', 'Wellens tipo B'),
          ecg: synth('wellens', 943, undefined, 'b'),
          note: l(
            '倒置占了主导：V2–V3 深约 7 mm，并波及 V1 和 V4；R 波保留、ST 平。与 A 型意义相同。',
            'The inversion takes over: about 7 mm deep in V2–V3, reaching V1 and V4; R preserved, ST flat. Same message as type A.',
            'Domina la inversión: unos 7 mm de profundidad en V2–V3, que alcanza V1 y V4; R conservada, ST plano. El mismo mensaje que el tipo A.',
          ),
          marks: [{ auto: 't', lead: 'V3' }],
        },
        {
          label: l('de Winter T波', 'de Winter', 'De Winter'),
          ecg: synth('de-winter', 944),
          note: l(
            'V2–V4 的 J 点压低超过 2 mm，ST 上斜融入高大对称的 T 波，aVR 轻度抬高，胸前没有抬高：左前降支近段急性闭塞，按 STEMI 处理。',
            'J more than 2 mm down in V2–V4, the ST sloping up into tall symmetric T waves, aVR slightly up, no chest elevation: acute proximal LAD occlusion, treat as STEMI.',
            'J más de 2 mm por debajo en V2–V4, ST ascendente hacia T altas y simétricas, aVR algo elevada, sin elevación precordial: oclusión aguda de la DA proximal, tratar como IAMCEST.',
          ),
          marks: [{ auto: 'j', lead: 'V3' }, { auto: 't', lead: 'V3' }, { auto: 'j', lead: 'aVR' }],
        },
        {
          label: l('aVR + 广泛压低', 'aVR + diffuse depression', 'aVR + descenso difuso'),
          ecg: synth('avr-elevation-diffuse-std', 946, undefined, 'left-main'),
          note: l(
            '7 个导联压低 ≥ 1 mm（最深约 2.5 mm），aVR 和 V1 抬高约 1 mm：弥漫性心内膜下缺血，左主干或三支病变可能更大。',
            'Seven leads down ≥ 1 mm (deepest about 2.5 mm), aVR and V1 up about 1 mm: diffuse subendocardial ischaemia; left main or three-vessel disease more likely.',
            'Siete derivaciones con descenso ≥ 1 mm (máximo unos 2,5 mm), aVR y V1 elevadas alrededor de 1 mm: isquemia subendocárdica difusa; más probable el tronco común o tres vasos.',
          ),
          marks: [{ auto: 'j', lead: 'aVR' }, { auto: 'st60', lead: 'V4' }],
        },
      ],
      predict: {
        question: l(
          'B 型 Wellens 来自同一处左前降支狭窄。在胸前导联，倒置的 T 波会延伸到哪里？',
          'Wellens type B comes from the same LAD stenosis. Across the chest leads, how far will the inverted T reach?',
          'El Wellens tipo B nace de la misma estenosis de la DA. En las precordiales, ¿hasta dónde llegará la T negativa?',
        ),
        options: [
          l('只在 V2–V3', 'Only V2–V3', 'Solo V2–V3'),
          l('V1 到 V4', 'V1 to V4', 'De V1 a V4'),
          l('V1 到 V6', 'V1 to V6', 'De V1 a V6'),
        ],
        answer: 1,
        ordered: true,
      },
      caption: l(
        'Wellens 出现在疼痛缓解之后；de Winter 出现在疼痛持续时，而且图形常保持不变：等它“演变”就是等心肌坏死。',
        'Wellens shows up after the pain has gone; de Winter while it goes on, and it tends to stay static: waiting for it to "evolve" is waiting for muscle to die.',
        'Wellens aparece cuando el dolor ya ha cedido; De Winter mientras persiste, y suele quedarse estático: esperar a que «evolucione» es esperar a que muera músculo.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('avr-elevation-diffuse-std', 945),
      caption: l(
        '播放一个心动周期：整个左心室的内层都在缺血。总损伤矢量指向心底部和右侧，所以只有 aVR（± V1）抬高，其余 ≥ 6 个导联压低。',
        'Play one beat: the whole inner layer of the left ventricle is ischaemic. The overall injury vector points to the base and the right, so only aVR (± V1) rises while ≥ 6 leads fall.',
        'Reproduce un latido: toda la capa interna del ventrículo izquierdo está isquémica. El vector de lesión global apunta a la base y a la derecha, así que solo aVR (± V1) sube mientras ≥ 6 derivaciones bajan.',
      ),
    },
    {
      kind: 'worked',
      title: l('四步读法：数压低 → 看 aVR → 定性 → 定策', 'Four moves: count → aVR → name it → decide', 'Cuatro pasos: contar → aVR → nombrarlo → decidir'),
      ecg: synth('avr-elevation-diffuse-std', 945),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('逐导联数 ST 压低', 'Count the ST depression lead by lead', 'Cuenta el descenso del ST derivación por derivación'),
          body: l(
            'II、III、aVF 与 V2–V5——7 个导联压低 ≥1 mm（V6 较浅，I 几乎不压低）。“数数”本身就是诊断动作：达到 **≥6 个导联**就不再是区域性缺血。',
            'II, III, aVF and V2–V5 — seven leads depressed ≥1 mm (V6 less, I barely). Counting is itself a diagnostic act: once **≥6 leads** are involved it is no longer regional ischaemia.',
            'II, III, aVF y V2–V5: siete derivaciones con descenso ≥1 mm (V6, menos; I, apenas). Contar ya es un acto diagnóstico: con **≥6 derivaciones** deja de ser isquemia regional.',
          ),
          marks: [
            { auto: 'j', lead: 'V5' },
            { auto: 'st', lead: 'V5' },
          ],
          highlightLeads: ['II', 'III', 'aVF', 'V2', 'V3', 'V4', 'V5'],
        },
        {
          title: l('单独看 aVR（和 V1）', 'Look at aVR (and V1) on its own', 'Mira aVR (y V1) por separado'),
          body: l(
            '切到 aVR：J 点处 ST 抬高。aVR 从右肩朝向心底部，是这份图里唯一“面对”损伤总向量的导联——它的抬高与其余导联的压低是同一件事的两面。',
            'Switch to aVR: ST elevation at the J point. aVR faces the base of the heart from the right shoulder — the only lead "facing" the overall injury vector here; its elevation and everyone else\'s depression are two faces of the same event.',
            'Cambia a aVR: elevación del ST en el punto J. aVR mira la base del corazón desde el hombro derecho y es la única derivación «de frente» al vector de lesión global; su elevación y el descenso de las demás son las dos caras del mismo fenómeno.',
          ),
          view: { layout: 'single', lead: 'aVR' },
          marks: [{ auto: 'st', lead: 'aVR' }],
        },
        {
          title: l('是 STEMI 吗？不是——但风险更高', 'Is it a STEMI? No — and higher-risk', '¿Es un IAMCEST? No, y es de mayor riesgo'),
          body: l(
            '没有任何相邻导联组达到抬高阈值（单独 aVR 约 1 mm 不构成相邻组）：这不是经典 STEMI，走的也不是同一条再灌注路径。≥6 导联压低 + aVR 抬高 = 弥漫性心内膜下缺血，常见于**多支血管或左主干**病变——高危 NSTE-ACS。',
            'No contiguous lead group reaches the elevation thresholds (aVR alone, about 1 mm, is not a contiguous group): not a classic STEMI, and not the same reperfusion pathway. ≥6 leads depressed + aVR elevation = diffuse subendocardial ischaemia, often from **multivessel or left main** disease — high-risk NSTE-ACS.',
            'Ningún grupo de derivaciones contiguas alcanza los umbrales de elevación (aVR sola, con alrededor de 1 mm, no es un grupo contiguo): no es un IAMCEST clásico ni sigue la misma vía de reperfusión. ≥6 derivaciones con descenso + elevación en aVR = isquemia subendocárdica difusa, a menudo por enfermedad **multivaso o del tronco común**: SCASEST de alto riesgo.',
          ),
          highlightLeads: ['V1', 'V2', 'V3'],
        },
        {
          title: l('再细分并决定', 'Refine and decide', 'Refina y decide'),
          body: l(
            '这里 aVR 抬高约 1 mm，V1 反而压低。不要停在“左主干”这个词上：这是弥漫性心内膜下缺血，病因要靠造影（和床旁）回答。接下来看床旁：血压、心率、心律、灌注。不稳定 ⇒ **立即（<2 小时）侵入策略**；稳定 ⇒ 仍是高危，24 小时内早期侵入评估，配合系列心电图与肌钙蛋白。绝不能以“ST-T 非特异性改变”收场。',
            'Here aVR is up about 1 mm and V1 is depressed. Do not stop at the words "left main": this is diffuse subendocardial ischaemia, and its cause is answered by angiography (and the bedside). Now look at the bedside: blood pressure, rate, rhythm, perfusion. Unstable ⇒ **immediate (<2 h) invasive strategy**; stable ⇒ still high risk, early invasive assessment within 24 h, with serial ECGs and troponin. Never file it away as "nonspecific ST-T changes".',
            'Aquí aVR se eleva alrededor de 1 mm y V1 está descendida. No te quedes en la palabra «tronco común»: es isquemia subendocárdica difusa y su causa la responde la coronariografía (y la cabecera). Mira ahora a la cabecera: tensión, frecuencia, ritmo, perfusión. Inestable ⇒ estrategia invasiva **inmediata (<2 h)**; estable ⇒ sigue siendo de alto riesgo, valoración invasiva precoz en 24 h, con ECG seriados y troponina. Nunca lo cierres como «cambios inespecíficos del ST-T».',
          ),
          highlightLeads: ['aVR', 'V1'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('都是 T 波倒置：Wellens 还是演变期？', 'Both invert the T: Wellens or evolution?', 'Ambas invierten la T: ¿Wellens o evolución?'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('wellens', 947),
        caption: l(
          'A：无痛间歇期，V2–V3 深而对称/双向 T，R 保留、无 Q——左前降支近段临界狭窄（尚未闭塞）',
          'A: pain-free interval, deep symmetric or biphasic T in V2–V3, preserved R, no Q — critical proximal LAD stenosis (not yet occluded)',
          'A: intervalo sin dolor, T profunda y simétrica o bifásica en V2–V3, R conservadas, sin Q: estenosis crítica proximal de la descendente anterior (todavía no ocluida)',
        ),
        marks: [{ auto: 't', lead: 'V2' }],
      },
      right: {
        ecg: synth('t-inversion-ischemic', 948),
        caption: l(
          'B：侧壁（I、aVL、V5–V6）缺血性 T 波倒置，R 波高大——NSTE-ACS 的 T 波倒置标准，或侧壁梗死的演变/再灌注期',
          'B: ischaemic T inversion in the lateral leads (I, aVL, V5–V6) with tall R waves — the NSTE-ACS T-inversion criterion, or the evolving / reperfused phase of a lateral infarct',
          'B: T negativa isquémica en las laterales (I, aVL, V5–V6) con R altas: el criterio de T negativa del SCASEST, o la fase en evolución / reperfundida de un infarto lateral',
        ),
        marks: [{ auto: 't', lead: 'V6' }, { auto: 't', lead: 'aVL' }],
      },
      point: l(
        '两份图都是“T 波倒置”，含义却完全不同。**A（Wellens）**：患者此刻不痛，V2–V3 深而对称/双向 T、R 保留——血管还通着但存在临界狭窄，下一步是**早造影、禁负荷**。**B**：倒置在**侧壁导联**（I、aVL、V5–V6），R 波高大：这是 NSTE-ACS 的 T 波倒置标准（> 1 mm、R 波为主），提示回旋支/对角支区域缺血，或侧壁梗死的演变/再灌注期——由胸痛、肌钙蛋白和旧图决定，按 NSTE-ACS 做危险分层。同一形态，不同的部位与故事——形态从不脱离临床单独决定去向。',
        'Both tracings show "T inversion", but they mean different things. **A (Wellens)**: the patient is pain-free right now, deep symmetric or biphasic T in V2–V3 with preserved R — the artery is still open but critically stenosed; next step is **early angiography, no stress test**. **B**: the inversion sits in the **lateral leads** (I, aVL, V5–V6) over tall R waves: the NSTE-ACS T-inversion criterion (> 1 mm with a prominent R) — ischaemia in circumflex or diagonal territory, or the evolving / reperfused phase of a lateral infarct; pain, troponin and the old tracing decide, and it is risk-stratified on the NSTE-ACS pathway. Same shape, different territory and story — a shape never decides anything apart from its clinical context.',
        'Ambos registros muestran «T negativa», pero significan cosas distintas. **A (Wellens)**: el paciente está sin dolor en este momento, T profunda y simétrica o bifásica en V2–V3 con R conservadas; la arteria sigue abierta pero con estenosis crítica: el paso siguiente es **coronariografía precoz, sin prueba de esfuerzo**. **B**: la inversión está en las **derivaciones laterales** (I, aVL, V5–V6) sobre R altas: el criterio de T negativa del SCASEST (> 1 mm con R dominante), isquemia en territorio de la circunfleja o de una diagonal, o la fase en evolución / reperfundida de un infarto lateral; el dolor, la troponina y el ECG previo deciden, y se estratifica el riesgo por la vía del SCASEST. Misma forma, distinto territorio y distinta historia: la morfología nunca decide sola, sin su contexto clínico.',
      ),
    },
    { kind: 'check', item: { family: 'ischemia-patterns', seed: 50 } },
    { kind: 'check', item: { family: 'ischemia-patterns', seed: 4 } },
    { kind: 'check', item: { family: 'occlusion', seed: 2 } },
    { kind: 'drill', families: ['ischemia-patterns', 'occlusion'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [7952, 8842, 18159],
      caption: l(
        '三份真实心电图：46 岁女性（数据库：低电压伴非特异性 ST-T 改变）、83 岁男性与 77 岁女性（数据库：下壁 ST-T 改变，一份心率缓慢，一份节律不齐）。它们都不是今天的三种图形——用它们练习**排除**：V2–V3 的 T 波形态（Wellens），胸前导联 J 点压低接高大 T 波（de Winter），数压低导联并看 aVR（弥漫性心内膜下缺血）。每份先想好你的排除理由和真正看到的改变，再揭晓。',
        'Three real ECGs: a woman of 46 (database: low voltage with non-specific ST-T changes), a man of 83 and a woman of 77 (database: inferior ST-T changes, one slow, one irregular). None of them is one of today\'s three patterns — use them to practise **ruling out**: the T shape in V2–V3 (Wellens), J-point depression running into tall T waves in the chest leads (de Winter), the count of depressed leads plus aVR (diffuse subendocardial ischaemia). For each, decide why you rule them out and what you do see, then reveal.',
        'Tres ECG reales: una mujer de 46 años (base de datos: bajo voltaje con alteraciones inespecíficas del ST-T), un varón de 83 y una mujer de 77 (base de datos: alteraciones del ST-T inferiores, uno lento y otro irregular). Ninguno es uno de los tres patrones de hoy: úsalos para practicar el **descarte**: la forma de la T en V2–V3 (Wellens), el descenso del punto J que desemboca en T altas en las precordiales (De Winter), el recuento de derivaciones descendidas más aVR (isquemia subendocárdica difusa). En cada uno, decide por qué los descartas y qué ves en realidad, y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          'Wellens 患者被送去运动试验：可诱发急性前壁闭塞与恶性心律失常——这是本课最致命的错误。',
          'Sending a Wellens patient for an exercise test: it can precipitate an acute anterior occlusion and malignant arrhythmias — the most dangerous error in this lesson.',
          'Enviar a un paciente con Wellens a una prueba de esfuerzo: puede desencadenar una oclusión anterior aguda y arritmias malignas; es el error más grave de esta lección.',
        ),
        l(
          'de Winter T波被报告为“非特异性 ST-T 改变”：上斜型压低 + 高大对称 T 是 STEMI 等危症，直接进导管室。',
          'The de Winter pattern reported as "nonspecific ST-T changes": upsloping depression + tall symmetric T is a STEMI equivalent — straight to the cath lab.',
          'El patrón de De Winter informado como «cambios inespecíficos del ST-T»: el descenso ascendente con T altas y simétricas es un equivalente de IAMCEST, directamente a sala de hemodinámica.',
        ),
        l(
          '读图时跳过 aVR：它缩在角落，却是广泛压低时唯一抬高的导联——每份缺血心电图都要专门看它一眼。',
          'Skipping aVR when reading: it hides in the corner, yet it is the one elevated lead in diffuse depression — give it a deliberate look on every ischaemic ECG.',
          'Saltarse la aVR al leer: se esconde en la esquina, pero es la única derivación elevada en el descenso difuso; mírala expresamente en todo ECG isquémico.',
        ),
        l(
          '低血压患者被写成“复极异常/劳损”：广泛压低 + aVR 抬高 + 血流动力学不稳 = 左主干或多支病变，直到被排除为止。',
          'A hypotensive patient labelled "repolarisation abnormality / strain": diffuse depression + aVR elevation + haemodynamic compromise = left main or multivessel disease until proven otherwise.',
          'Un paciente hipotenso etiquetado de «alteración de la repolarización / sobrecarga»: descenso difuso + elevación en aVR + inestabilidad hemodinámica = tronco común o enfermedad multivaso hasta que se demuestre lo contrario.',
        ),
        l(
          '把 aVR 抬高伴广泛压低直接读成“左主干闭塞”：它是弥漫性心内膜下缺血，可来自多支或左主干狭窄，也可来自供需失衡（快速心律失常、低血压、贫血、重度主动脉瓣狭窄、左心室肥厚）。',
          'Reading aVR elevation with diffuse depression as "left main occlusion": it is diffuse subendocardial ischaemia, from multivessel or left-main stenosis or from a supply–demand mismatch (tachyarrhythmia, hypotension, anaemia, severe aortic stenosis, LVH).',
          'Leer la elevación en aVR con descenso difuso como «oclusión del tronco común»: es isquemia subendocárdica difusa, por estenosis multivaso o del tronco, o por desequilibrio entre aporte y demanda (taquiarritmia, hipotensión, anemia, estenosis aórtica grave, HVI).',
        ),
        l(
          '忘了对应性思维：aVR 的抬高不是孤立发现，而是广泛心内膜下损伤向量的镜像——与其余导联一起读，模式才成立。',
          'Forgetting reciprocal thinking: the aVR elevation is not an isolated finding but the mirror of the global subendocardial injury vector — read it together with the other leads and the pattern falls into place.',
          'Olvidar el pensamiento recíproco: la elevación en aVR no es un hallazgo aislado, sino el espejo del vector de lesión subendocárdica global; léela junto con las demás derivaciones y el patrón encaja.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'Wellens：心绞痛后无痛期 V2–V3 双向（A 型）或深而对称（B 型）T 波倒置，R 保留、无 Q——左前降支近段临界狭窄；禁负荷试验，早期造影。',
          'Wellens: pain-free after angina, biphasic (type A) or deep symmetric (type B) T inversion in V2–V3 with preserved R and no Q — critical proximal LAD; no stress test, early angiography.',
          'Wellens: sin dolor tras una angina, T bifásica (tipo A) o negativa profunda y simétrica (tipo B) en V2–V3 con R conservadas y sin Q: estenosis crítica proximal de la descendente anterior; sin prueba de esfuerzo, coronariografía precoz.',
        ),
        l(
          'de Winter T波：胸前导联 J 点上斜型压低 >1 mm 融入高大对称 T（± aVR 抬高）——左前降支近段急性闭塞，按 STEMI 处理；图形常保持静态。',
          'De Winter: upsloping J-point depression >1 mm in the precordial leads into tall symmetric T (± aVR elevation) — acute proximal LAD occlusion, managed as STEMI; the pattern tends to stay static.',
          'De Winter: descenso ascendente >1 mm en el punto J en las precordiales hacia T altas y simétricas (± elevación en aVR): oclusión aguda proximal de la descendente anterior, tratar como IAMCEST; el patrón suele ser estático.',
        ),
        l(
          '≥6 个下侧壁导联 ST 压低 ≥1 mm + aVR 抬高（± V1）= 多支血管/左主干的弥漫性心内膜下缺血：紧急侵入评估；aVR ≥ V1 更支持左主干。',
          'ST depression ≥1 mm in ≥6 inferolateral leads + aVR elevation (± V1) = diffuse subendocardial ischaemia of multivessel / left main disease: urgent invasive assessment; aVR ≥ V1 favours left main.',
          'Descenso del ST ≥1 mm en ≥6 derivaciones inferolaterales + elevación en aVR (± V1) = isquemia subendocárdica difusa por enfermedad multivaso / tronco común: valoración invasiva urgente; aVR ≥ V1 apoya el tronco común.',
        ),
        l(
          '三者都不符合“毫米数抬高”的思维：它们藏在几乎正常的心电图里——每份胸痛心电图都要主动搜寻这三种模式，仍有怀疑时 15–30 分钟复查。',
          'None of the three fits the "millimetres of elevation" mindset: they hide in near-normal ECGs — hunt for all three on every chest-pain ECG and repeat after 15–30 min if doubt remains.',
          'Ninguno de los tres encaja en la lógica de «milímetros de elevación»: se esconden en ECG casi normales; busca los tres en todo ECG por dolor torácico y repite a los 15–30 min si persiste la duda.',
        ),
        l(
          'T 波倒置要讲“故事”：无痛间歇期的 V2–V3 是 Wellens；梗死演变或再灌注后的倒置是另一回事——同一形态，不同处理。',
          'T inversion needs its story: V2–V3 in the pain-free interval is Wellens; inversion during infarct evolution or after reperfusion is something else — same shape, different management.',
          'La T negativa necesita su historia: V2–V3 en el intervalo sin dolor es Wellens; la negativización durante la evolución o tras la reperfusión es otra cosa: misma forma, distinto manejo.',
        ),
      ],
    },
  ],
  sources: [
    'de Zwaan C et al. Am Heart J 1982;103:730-736',
    'de Winter RJ et al. N Engl J Med 2008;359:2071-2073',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Castellano et al. 2004',
  ],
};

export default lesson;
