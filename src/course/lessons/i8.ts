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
        'V2–V3 的 T 波先直立、终末倒置（双向）——这是 **Wellens 综合征（A 型）**：左前降支近段临界狭窄。“现在不痛”不等于“低危”：**绝对不能做运动/负荷试验**（可诱发急性前壁闭塞），应安排**早期冠状动脉造影**。',
        'The T waves in V2–V3 start upright and end inverted (biphasic) — this is **Wellens syndrome (type A)**: a critical proximal LAD stenosis. "Pain-free now" does not mean "low risk": **never send this patient for an exercise test** (it can precipitate an acute anterior occlusion); arrange **early coronary angiography**.',
        'Las ondas T de V2–V3 empiezan positivas y terminan negativas (bifásicas): es el **síndrome de Wellens (tipo A)**, una estenosis crítica proximal de la descendente anterior. «Sin dolor ahora» no significa «bajo riesgo»: **no la envíes nunca a una prueba de esfuerzo** (puede desencadenar una oclusión anterior aguda); programa una **coronariografía precoz**.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('wellens', 942),
      emphasize: ['lv-mid-anteroseptal', 'lv-mid-anterior', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'],
      caption: l(
        '在心脏上读同一份图：**左前降支中远段供区**（前室间隔与前壁、延伸到心尖）亮起——狭窄很重，但此刻血管没有完全闭塞；缺血发作过后复极化仍被拉长，T 波变形，而 R 波保留、不出现 Q 波。',
        'Read the same tracing on the heart: the **mid-to-distal LAD territory** (anteroseptal and anterior wall, reaching the apex) lights up — the stenosis is severe but the artery is not fully occluded at this moment; after the ischaemic episode repolarisation stays prolonged, deforming the T wave while the R is preserved and no Q appears.',
        'Lee el mismo registro sobre el corazón: se ilumina el **territorio medio-distal de la descendente anterior** (pared anteroseptal y anterior, hasta el ápex); la estenosis es grave pero la arteria no está totalmente ocluida en este momento. Tras el episodio isquémico la repolarización sigue prolongada, deforma la onda T, la R se conserva y no aparece onda Q.',
      ),
    },
    {
      kind: 'text',
      title: l('Wellens：不痛的时候最危险', 'Wellens: most dangerous when the pain has gone', 'Wellens: más peligroso cuando el dolor ha cesado'),
      body: l(
        '- 出现于**心绞痛发作后的无痛间歇期**——患者在急诊常“感觉良好”；肌钙蛋白正常或仅轻度升高（NSTE-ACS）。\n- **A 型**：V2–V3 双向 T 波（先直立后倒置）；**B 型**：深而对称的 T 波倒置。两型意义相同，B 型更常见、更醒目。\n- R 波保留、无 R 波递增不良，无病理性 Q 波，ST 段等电位或仅轻微抬高。\n- 机制：左前降支近段临界狭窄，血栓自溶或痉挛缓解后血管再通——狭窄仍在，随时可能完全闭塞。\n- 处理：**禁止负荷试验**；按高危 NSTE-ACS 安排早期侵入评估（造影）。狭窄不处理，大面积前壁梗死只是时间问题。',
        '- It appears in the **pain-free interval after an angina episode** — the patient often "feels well" in the emergency department; troponin is normal or only mildly raised (NSTE-ACS).\n- **Type A**: biphasic T in V2–V3 (upright then inverted). **Type B**: deep, symmetric T inversion. Both mean the same; type B is commoner and more striking.\n- R waves preserved with no poor progression, no pathological Q waves, ST isoelectric or minimally elevated.\n- Mechanism: a critical proximal LAD stenosis that has reopened (the clot has lysed or spasm has subsided) — the stenosis remains and can occlude completely at any time.\n- Management: **no stress testing**; arrange early invasive assessment (angiography) as high-risk NSTE-ACS. Left alone, a large anterior infarct is only a matter of time.',
        '- Aparece en el **intervalo sin dolor tras un episodio de angina**: el paciente a menudo «se encuentra bien» en urgencias; la troponina es normal o solo levemente elevada (SCASEST).\n- **Tipo A**: T bifásica en V2–V3 (positiva y después negativa). **Tipo B**: T negativa, profunda y simétrica. Ambas significan lo mismo; la B es más frecuente y más llamativa.\n- R conservadas sin mala progresión, sin ondas Q patológicas y ST isoeléctrico o con elevación mínima.\n- Mecanismo: estenosis crítica proximal de la descendente anterior que se ha reabierto (el trombo se ha lisado o el espasmo ha cedido); la estenosis persiste y puede ocluirse por completo en cualquier momento.\n- Manejo: **nada de pruebas de esfuerzo**; valoración invasiva precoz (coronariografía) como SCASEST de alto riesgo. Sin tratar, un infarto anterior extenso es cuestión de tiempo.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('wellens', 943, undefined, 'b'),
      view: { layout: 'single', lead: 'V3' },
      marks: [{ auto: 't', lead: 'V3' }],
      caption: l(
        '更深的 Wellens 变体：倒置部分占了主导——V2–V3 约 4 mm 深，并波及 V1 与 V4；R 波保留、无 Q 波、ST 等电位。教科书上的 B 型是整个 T 波深而对称地倒置；这里倒置前仍残留一个小的正向起始部。与 A 型传递完全相同的信息：左前降支近段临界狭窄——不负荷、早造影。',
        'A deeper Wellens variant: the inverted limb now dominates — about 4 mm deep in V2–V3 and reaching V1 and V4; R waves preserved, no Q waves, ST isoelectric. In the textbook type B the whole T is deeply and symmetrically inverted; here a small upright start still precedes the inversion. It carries exactly the same message as type A: critical proximal LAD — no stress test, early angiography.',
        'Una variante de Wellens más profunda: domina ya la rama negativa —unos 4 mm de profundidad en V2–V3, que alcanza V1 y V4—; R conservadas, sin ondas Q, ST isoeléctrico. En el tipo B de libro toda la T es negativa, profunda y simétrica; aquí aún precede a la inversión un pequeño inicio positivo. Transmite exactamente el mismo mensaje que el tipo A: estenosis crítica proximal de la descendente anterior; sin prueba de esfuerzo, coronariografía precoz.',
      ),
    },
    {
      kind: 'text',
      title: l('de Winter T波：不抬高的前壁闭塞', 'de Winter: the anterior occlusion that does not elevate', 'De Winter: la oclusión anterior que no eleva'),
      body: l(
        '- 胸前导联 **J 点处上斜型 ST 压低 >1 mm**：ST 段向上斜行，直接融入**高大而对称的 T 波**——没有 ST 抬高。\n- aVR 常有轻度抬高；与 Wellens 相反，患者通常**胸痛持续存在**（闭塞正在进行）。\n- 这是**左前降支近段急性闭塞**的 STEMI 等危症：直接启动再灌注（导管室），不要等肌钙蛋白，也不要“收住院观察”。\n- 图形常**保持静态**：系列心电图不会“演变”成典型 STEMI——等它演变，就是等心肌坏死。',
        '- **Upsloping ST depression >1 mm at the J point** in the precordial leads: the ST slopes upward and runs straight into **tall, symmetric T waves** — there is no ST elevation.\n- aVR often shows slight elevation; and unlike Wellens, the patient usually has **ongoing chest pain** (the occlusion is happening now).\n- This is a **STEMI equivalent of acute proximal LAD occlusion**: activate reperfusion (cath lab) — do not wait for troponin and do not "admit for observation".\n- The pattern tends to stay **static**: serial ECGs will not "evolve" into a classic STEMI — waiting for it to evolve is waiting for myocardium to die.',
        '- **Descenso ascendente del ST >1 mm en el punto J** en las derivaciones precordiales: el ST asciende en diagonal y desemboca directamente en **ondas T altas y simétricas**; no hay elevación del ST.\n- aVR suele mostrar una elevación ligera; y a diferencia de Wellens, el paciente suele tener **dolor torácico persistente** (la oclusión está ocurriendo ahora).\n- Es un **equivalente de IAMCEST por oclusión aguda proximal de la descendente anterior**: activa la reperfusión (sala de hemodinámica), sin esperar la troponina ni «ingresar para observación».\n- El patrón suele mantenerse **estático**: los ECG seriados no «evolucionarán» a un IAMCEST clásico; esperar esa evolución es esperar a que muera miocardio.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('de-winter', 944),
      view: { layout: 'single', lead: 'V3' },
      marks: [
        { auto: 'j', lead: 'V3' },
        { auto: 'st', lead: 'V3' },
        { auto: 't', lead: 'V3' },
      ],
      caption: l(
        'V3：J 点下移 >1 mm，ST 段上斜融入高大而对称的 T 波——de Winter T波。注意 T 波宽基底、对称，不是高钾血症那种尖窄的“帐篷状”T（该查血钾，但形态本身已经给出方向）。再看 aVR：轻度抬高。',
        'V3: the J point sits more than 1 mm down and the ST slopes up into a tall symmetric T — the de Winter pattern. Note the T is broad-based and symmetric, not the narrow tented T of hyperkalaemia (check the potassium, but the shape already points the way). Look again at aVR: slight elevation.',
        'V3: el punto J está más de 1 mm por debajo y el ST asciende hacia una T alta y simétrica: el patrón de De Winter. Fíjate en que la T es de base ancha y simétrica, no la T estrecha y en tienda de campaña de la hiperpotasemia (pide el potasio, pero la morfología ya orienta). Mira también aVR: elevación ligera.',
      ),
    },
    {
      kind: 'text',
      title: l('aVR 抬高 + 广泛压低：多支血管或左主干', 'aVR elevation + diffuse depression: multivessel or left main', 'Elevación en aVR + descenso difuso: multivaso o tronco común'),
      body: l(
        '- **≥6 个下侧壁导联**（I、II、III、aVL、aVF、V2–V6）水平型或下斜型 **ST 压低 ≥1 mm**，伴 **aVR 抬高**（± V1）。\n- 整个左心室心内膜下缺血，损伤向量指向心底部与右侧——aVR 从右肩“俯视”心底部，是唯一记录到抬高的导联。\n- 这是**弥漫性心内膜下缺血**，不是某一支血管的闭塞：病因可以是**多支血管病变或左主干（或同等）狭窄**，也可以是供需失衡（快速心律失常、低血压、贫血、重度主动脉瓣狭窄或左心室肥厚）。真正完全闭塞的左主干通常表现为休克或心脏骤停，而不是这张图。\n- 处理：**紧急侵入评估**（不稳定者 <2 小时）——它不是经典 STEMI，但风险更高；绝不能写成“非特异性 ST-T 改变”。',
        '- Horizontal or downsloping **ST depression ≥1 mm in ≥6 inferolateral leads** (I, II, III, aVL, aVF, V2–V6) with **ST elevation in aVR** (± V1).\n- The whole left ventricle is ischaemic subendocardially; the injury vector points towards the base and the right — aVR looks down at the heart base from the right shoulder and is the only lead recording elevation.\n- This is **diffuse subendocardial ischaemia**, not the occlusion of one artery: the cause may be **multivessel disease or left main (or equivalent) stenosis**, or a supply–demand mismatch (tachyarrhythmia, hypotension, anaemia, severe aortic stenosis or LVH). A truly occluded left main usually presents as shock or cardiac arrest, not as this tracing.\n- Management: **urgent invasive assessment** (within 2 h if unstable) — it is not a classic STEMI, but the risk is higher; never report it as "nonspecific ST-T changes".',
        '- Descenso del ST horizontal o descendente **≥1 mm en ≥6 derivaciones inferolaterales** (I, II, III, aVL, aVF, V2–V6) con **elevación del ST en aVR** (± V1).\n- Todo el ventrículo izquierdo está isquémico de forma subendocárdica y el vector de lesión se dirige hacia la base y hacia la derecha: aVR contempla la base desde el hombro derecho y es la única derivación que registra elevación.\n- Es **isquemia subendocárdica difusa**, no la oclusión de una arteria: la causa puede ser **enfermedad multivaso o estenosis del tronco común (o equivalente)**, o un desequilibrio entre aporte y demanda (taquiarritmia, hipotensión, anemia, estenosis aórtica grave o HVI). Un tronco común realmente ocluido suele presentarse como shock o parada cardiaca, no como este trazado.\n- Manejo: **valoración invasiva urgente** (<2 h si hay inestabilidad); no es un IAMCEST clásico, pero el riesgo es mayor, y nunca debe reportarse como «cambios inespecíficos del ST-T».',
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
      kind: 'worked',
      title: l('四步读法：数压低 → 看 aVR → 定性 → 定策', 'Four moves: count → aVR → name it → decide', 'Cuatro pasos: contar → aVR → nombrarlo → decidir'),
      ecg: synth('avr-elevation-diffuse-std', 945),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('逐导联数 ST 压低', 'Count the ST depression lead by lead', 'Cuenta el descenso del ST derivación por derivación'),
          body: l(
            'II、III、aVF 与 V2–V5——7 个导联压低 ≥1 mm（I、V6 较浅）。“数数”本身就是诊断动作：达到 **≥6 个导联**就不再是区域性缺血。',
            'II, III, aVF and V2–V5 — seven leads depressed ≥1 mm (I and V6 less). Counting is itself a diagnostic act: once **≥6 leads** are involved it is no longer regional ischaemia.',
            'II, III, aVF y V2–V5: siete derivaciones con descenso ≥1 mm (I y V6, menos). Contar ya es un acto diagnóstico: con **≥6 derivaciones** deja de ser isquemia regional.',
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
      kind: 'ecg',
      ecg: synth('avr-elevation-diffuse-std', 946, undefined, 'left-main'),
      view: { layout: '3x4+1', highlightLeads: ['aVR', 'V1', 'V4', 'V5'] },
      marks: [{ auto: 'st', lead: 'aVR' }, { auto: 'st', lead: 'V1' }, { auto: 'st', lead: 'V4' }],
      caption: l(
        '另一份更重的图：aVR 抬高约 1.2 mm，V1 也抬高约 1 mm，下侧壁压低更深（达 2.5 mm）。缺血范围越广、压低越深，左主干或三支病变的可能越大——但心电图只能提示，不能证明左主干；床旁不稳时属最高危，立即侵入策略。',
        'A heavier tracing: aVR is up about 1.2 mm, V1 about 1 mm as well, and the inferolateral depression is deeper (up to 2.5 mm). The wider and deeper the ischaemia, the likelier left main or three-vessel disease — but the ECG can only suggest the left main, never prove it; with an unstable patient this is the highest-risk group: immediate invasive strategy.',
        'Un trazado más grave: aVR se eleva unos 1,2 mm, V1 también alrededor de 1 mm, y el descenso inferolateral es más profundo (hasta 2,5 mm). Cuanto más extensa y profunda la isquemia, más probable el tronco común o la enfermedad de tres vasos; pero el ECG solo sugiere el tronco común, nunca lo demuestra; con un paciente inestable es el grupo de mayor riesgo: estrategia invasiva inmediata.',
      ),
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
          'El patrón de De Winter reportado como «cambios inespecíficos del ST-T»: el descenso ascendente con T altas y simétricas es un equivalente de IAMCEST, directamente a sala de hemodinámica.',
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
