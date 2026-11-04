/**
 * I7 — Subtle occlusion: hyperacute T waves, proportionality, terminal QRS distortion, serial ECGs (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `ischaemia-t` (current value), missing-book bullets "Acute chest pain ECG workflow",
 * "Subtle anterior occlusion vs early repolarisation", "Acute coronary occlusion without STEMI criteria".
 */
import { l } from '../../core/l10n';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (scenario: string, seed: number, dials?: Partial<Record<DialId, number>>): EcgSource => ({
  kind: 'synth',
  req: { scenario, seed, ...(dials ? { dials } : {}) },
});

const lesson: Lesson = {
  id: 'i7',
  stage: 'I',
  order: 7,
  title: l(
    '隐匿性闭塞：超急性期T波、比例原则、QRS终末部变形与系列心电图',
    'Subtle occlusion: hyperacute T waves, proportionality, terminal QRS distortion, serial ECGs',
    'Oclusión sutil: ondas T hiperagudas, proporcionalidad, distorsión terminal del QRS y ECG seriados',
  ),
  summary: l(
    '不是每一处闭塞都用毫米宣告自己：超急性期T波、T与QRS的比例失衡、QRS终末部变形和系列演变能揭示那些藏起来的闭塞。复查心电图、对比旧图，把难治或不稳定的NSTE-ACS当作<2小时的问题。',
    'Not every occlusion announces itself in millimetres: hyperacute T waves, an unbalanced T-to-QRS proportion, terminal QRS distortion and serial change expose the ones that hide. Repeat the ECG, compare with old tracings, and treat refractory or unstable NSTE-ACS as a <2-hour problem.',
    'No toda oclusión se anuncia en milímetros: las ondas T hiperagudas, una proporción T/QRS descompensada, la distorsión terminal del QRS y el cambio seriado descubren las que se esconden. Repite el ECG, compara con trazados previos y trata el SCASEST refractario o inestable como un problema de menos de 2 horas.',
  ),
  objectives: [
    l(
      '识别超急性期T波：宽底、粗大、对称、相对QRS过大、≥2个相邻导联。',
      'Recognise hyperacute T waves: broad-based, bulky, symmetric, large relative to the QRS, in ≥2 contiguous leads.',
      'Reconocer las ondas T hiperagudas: anchas de base, voluminosas, simétricas, grandes respecto al QRS, en ≥2 derivaciones contiguas.',
    ),
    l(
      '对界值附近的前壁心电图应用比例原则（T/QRS）与QRS终末部变形。',
      'Apply proportionality (T/QRS) and terminal QRS distortion to a borderline anterior ECG.',
      'Aplicar la proporcionalidad (T/QRS) y la distorsión terminal del QRS a un ECG anterior en el límite.',
    ),
    l(
      '执行胸痛心电图流程：10分钟内首份图，界值附近时15–30分钟复查，对比旧图。',
      'Run the chest-pain ECG workflow: first ECG within 10 min, repeat every 15–30 min when borderline, compare with old tracings.',
      'Aplicar el protocolo del ECG en el dolor torácico: primer ECG en 10 min, repetir cada 15–30 min si está en el límite y comparar con trazados previos.',
    ),
    l(
      '说出4变量公式的变量与地位，以及立即侵入性策略（<2小时）的触发条件。',
      'State the variables and the standing of the 4-variable formula, and the triggers for an immediate invasive strategy (<2 h).',
      'Citar las variables y el papel de la fórmula de 4 variables y los desencadenantes de la estrategia invasiva inmediata (<2 h).',
    ),
  ],
  minutes: 16,
  competencies: ['C8'],
  findings: ['hyperacute-t', 'stemi-anterior', 'st-depression-ischemic'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-anterior-subtle', 921),
      question: l(
        '52岁男性，胸痛30分钟。这份心电图离界值还差一点。表态：是闭塞吗？',
        'Man, 52, chest pain for 30 minutes. This ECG falls just short of the thresholds. Commit: is this an occlusion?',
        'Varón de 52 años, dolor torácico de 30 minutos. Este ECG se queda justo por debajo de los umbrales. Decídete: ¿es una oclusión?',
      ),
      reveal: l(
        'V2–V4的J点抬高只有约1 mm（V3最高）——52岁男性在V2–V3需要 **2 mm**：毫米数不够。但看仔细：T波**宽底、粗大、对称**，相对下面的QRS来说过大，II、III、aVF还有轻微的镜像性压低。界值附近的抬高 + 不成比例的T波 + 持续疼痛 = **很可能的闭塞**：按闭塞处理，15–30分钟内复查心电图，而不是放走患者。这正是本课要练的工具箱。',
        'The J point in V2–V4 is raised only about 1 mm (most in V3) — a 52-year-old man needs **2 mm** in V2–V3: the millimetres fall short. But look closer: the T waves are **broad-based, bulky and symmetric**, far too large for the QRS beneath them, and II, III and aVF carry a faint mirror-image depression. Borderline elevation + a disproportionate T + ongoing pain = **probable occlusion**: treat it as one, repeat the ECG in 15–30 minutes, and do not send the patient home. That is the toolkit this lesson drills.',
        'El punto J en V2–V4 está elevado solo alrededor de 1 mm (máximo en V3) —un varón de 52 años necesita **2 mm** en V2–V3: los milímetros no llegan. Pero mira mejor: las ondas T son **anchas de base, voluminosas y simétricas**, demasiado grandes para el QRS que las sostiene, y II, III y aVF muestran un descenso especular leve. Elevación en el límite + T desproporcionada + dolor persistente = **oclusión probable**: trátala como tal, repite el ECG en 15–30 minutos y no mandes al paciente a casa. Esa es la caja de herramientas de esta lección.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('stemi-anterior-subtle', 921),
      emphasize: ['lv-mid-anteroseptal', 'lv-mid-anterior', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'],
      caption: l(
        '播放开头那份图的一个心动周期：毫米数还不够，LAD 供血的前壁已经在受伤。亮起的节段正对 V2–V4，那里的 T 波粗大。',
        'Play one beat of the opening tracing: the millimetres fall short, yet the LAD wall is already injured. The lit segments face V2–V4, where the T waves are bulky.',
        'Reproduce un latido del trazado inicial: los milímetros no llegan, pero la pared de la DA ya está lesionada. Los segmentos iluminados miran a V2–V4, donde las T son voluminosas.',
      ),
    },
    {
      kind: 'film',
      title: l('把 T 波和它的 QRS 放在一起看', 'Read the T beside its QRS', 'Lee la T junto a su QRS'),
      frames: [
        {
          label: l('正常', 'Normal', 'Normal'),
          ecg: synth('normal', 929),
          note: l('正常：V3 的 T 波不到 R 波高度的一半。', 'Normal: in V3 the T is less than half the height of the R.', 'Normal: en V3 la T no llega a la mitad de la altura de la R.'),
          marks: [{ auto: 'r', lead: 'V3' }, { auto: 't', lead: 'V3' }],
        },
        {
          label: l('差一点到界值', 'Just short', 'Justo por debajo'),
          ecg: synth('stemi-anterior-subtle', 926),
          note: l(
            'V3 的 J 点约 1 mm，T 波比 R 波还高，III 的 T 波倒置。毫米不够，比例却不对。',
            'J in V3 about 1 mm, the T taller than the R, T inverted in III. Short of the millimetres, out of proportion.',
            'J en V3 de alrededor de 1 mm, T más alta que la R, T negativa en III. Faltan milímetros, sobra proporción.',
          ),
          marks: [{ auto: 'j', lead: 'V3' }, { auto: 't', lead: 'V3' }, { auto: 't', lead: 'III' }],
        },
        {
          label: l('超急性期T波', 'Hyperacute T', 'T hiperaguda'),
          ecg: synth('hyperacute-t', 922),
          note: l(
            'J 点不到 1 mm，V3 的 T 波却比 R 波高、底部宽；III 的 T 波倒置。T 波先到，ST 抬高后来。',
            'J under 1 mm, yet the T in V3 is taller than the R and broad-based; T inverted in III. The T arrives first, the ST later.',
            'J por debajo de 1 mm, pero la T de V3 es más alta que la R y de base ancha; T negativa en III. La T llega primero, el ST después.',
          ),
          marks: [{ auto: 'qrs', lead: 'V3' }, { auto: 't', lead: 'V3' }],
        },
        {
          label: l('高钾血症', 'Hyperkalaemia', 'Hiperpotasemia'),
          ecg: synth('hyperkalemia', 930),
          note: l(
            '也很高，但窄而尖、底部窄；PR 和 QRS 都变长。这时要查血钾，而不是叫它超急性期T波。',
            'Tall too, but narrow-based and tented, with a longer PR and a wider QRS. Check the potassium; do not call it hyperacute.',
            'También alta, pero estrecha y picuda, con un PR más largo y un QRS más ancho. Pide la potasemia; no la llames hiperaguda.',
          ),
          marks: [{ auto: 'pr', lead: 'II' }, { auto: 'qrs', lead: 'V3' }, { auto: 't', lead: 'V3' }],
        },
      ],
      caption: l(
        '单看一个波什么也证明不了：看 T 和下面的 QRS 成不成比例，再看 T 的形状。',
        'One wave alone proves nothing: check whether the T fits the QRS beneath it, then look at its shape.',
        'Una onda aislada no prueba nada: mira si la T guarda proporción con su QRS y después su forma.',
      ),
    },
    {
      kind: 'criteria',
      title: l('隐匿性闭塞工具箱', 'The subtle-occlusion toolkit', 'La caja de herramientas de la oclusión sutil'),
      items: [
        {
          label: l('超急性期T波', 'Hyperacute T wave', 'Onda T hiperaguda'),
          value: l('宽底、粗大、对称，相对QRS过大；≥2个相邻导联；可先于ST抬高出现', 'Broad-based, bulky, symmetric, large relative to the QRS; ≥2 contiguous leads; can precede ST elevation', 'Ancha de base, voluminosa, simétrica, grande respecto al QRS; ≥2 derivaciones contiguas; puede preceder a la elevación del ST'),
        },
        {
          label: l('比例原则', 'Proportionality', 'Proporcionalidad'),
          value: l('T相对QRS不成比例地大支持闭塞；小QRS上的巨大T波即为异常', 'A T disproportionately large for its QRS argues for occlusion; a huge T on a small QRS is abnormal', 'Una T desproporcionadamente grande para su QRS apoya la oclusión; una T enorme sobre un QRS pequeño es anormal'),
        },
        {
          label: l('QRS终末部变形', 'Terminal QRS distortion', 'Distorsión terminal del QRS'),
          value: l('V2–V3本应有的J波消失，QRS直接延续为ST段', 'Loss of the J wave in V2–V3 where one should be; the QRS runs straight into the ST', 'Desaparición de la onda J en V2–V3 donde debería estar; el QRS entra directo en el ST'),
        },
        {
          label: l('系列心电图', 'Serial ECGs', 'ECG seriados'),
          value: l('首份图 ≤ 10分钟（首次医疗接触）；不能确定时每15–30分钟复查，症状变化随时复查；对比旧图', 'First ECG ≤ 10 min from first medical contact; repeat every 15–30 min if non-diagnostic and with any symptom change; compare with old tracings', 'Primer ECG ≤ 10 min desde el contacto médico inicial; repetir cada 15–30 min si no es concluyente y ante cualquier cambio de síntomas; comparar con trazados previos'),
        },
        {
          label: l('4变量公式（辅助）', '4-variable formula (aid)', 'Fórmula de 4 variables (ayuda)'),
          value: l('变量：QTc、V4的R波振幅、V2的QRS振幅、V3 J+60的ST抬高；只作系列心电图与临床判断的补充', 'Variables: QTc, R amplitude in V4, QRS amplitude in V2, ST elevation at J+60 in V3; only a supplement to serial ECGs and clinical judgement', 'Variables: QTc, amplitud de R en V4, amplitud del QRS en V2, elevación del ST en J+60 en V3; solo un complemento del ECG seriado y del juicio clínico'),
        },
        {
          label: l('立即侵入性策略', 'Immediate invasive strategy', 'Estrategia invasiva inmediata'),
          value: l('NSTE-ACS伴难治性疼痛、血流动力学不稳定、危及生命的心律失常或动态心电图改变：<2小时', 'NSTE-ACS with refractory pain, haemodynamic instability, life-threatening arrhythmia or dynamic ECG changes: <2 h', 'SCASEST con dolor refractario, inestabilidad hemodinámica, arritmia que amenaza la vida o cambios dinámicos del ECG: <2 h'),
        },
        {
          label: l('不达STEMI标准的闭塞', 'Occlusion without STEMI criteria', 'Oclusión sin criterios de IAMCEST'),
          value: l(
            '超急性期T波；de Winter T波（第I8课）；V1–V3孤立性ST压低（后壁，第I6课）；细微的对应性改变。回旋支闭塞最常被漏掉',
            'Hyperacute T waves; de Winter T waves (lesson I8); isolated V1–V3 ST depression (posterior, lesson I6); subtle reciprocal change. Circumflex occlusions are missed most often',
            'Ondas T hiperagudas; ondas T de De Winter (lección I8); descenso aislado del ST en V1–V3 (posterior, lección I6); cambios recíprocos sutiles. Las oclusiones de la circunfleja son las que más se pasan por alto',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826; Driver BE et al. J Electrocardiol 2017;50:561-569; Smith SW et al. Am J Cardiol 2012;110:1696-1701',
    },
    {
      kind: 'worked',
      title: l('用形态、比例与病史构建病例', 'Build the case from shape, proportion and story', 'Construye el caso con morfología, proporción e historia'),
      ecg: synth('hyperacute-t', 923),
      steps: [
        {
          title: l('先听故事', 'Start with the story', 'Empieza por la historia'),
          body: l(
            '55岁男性，压榨性胸骨后疼痛20分钟，大汗。第一张图“几乎正常”。在放走他之前，逼自己再看一遍T波。',
            'Man, 55, crushing retrosternal pain for 20 minutes, sweating. The first tracing looks "almost normal". Before he goes home, force yourself to look again at the T waves.',
            'Varón de 55 años, dolor retroesternal opresivo de 20 minutos, sudoroso. El primer trazado parece "casi normal". Antes de mandarlo a casa, oblígate a mirar otra vez las ondas T.',
          ),
          marks: [{ auto: 't', lead: 'V3' }],
          highlightLeads: ['V2', 'V3', 'V4'],
        },
        {
          title: l('描述T波的形态', 'Describe the T shape', 'Describe la morfología de la T'),
          body: l(
            'V2–V4的T波**宽底、粗大、两支对称**——不是高钾血症那种窄而尖的帐篷状。形态本身就是信息。',
            'In V2–V4 the T waves are **broad-based, bulky and symmetric** — not the narrow, tented spike of hyperkalaemia. The shape alone carries information.',
            'En V2–V4 las ondas T son **anchas de base, voluminosas y simétricas**; no la espiga estrecha y en tienda de la hiperpotasemia. La morfología por sí sola aporta información.',
          ),
          marks: [{ auto: 't', lead: 'V2' }, { auto: 't', lead: 'V4' }],
          highlightLeads: ['V2', 'V4'],
        },
        {
          title: l('检查比例', 'Check the proportion', 'Comprueba la proporción'),
          body: l(
            '在V3把两个测量放在一起：QRS与T波。这里的T比R波还高，几乎与整个QRS（R + S）一样大——正常胸前导联的T要小得多。**相对QRS过大的T**，正是超急性期缺血的比例特征。',
            'Put the two measurements together in V3: QRS and T wave. Here the T is taller than the R and nearly as large as the whole QRS (R + S) — a normal precordial T is far smaller. **A T too large for its QRS** is the proportion signature of hyperacute ischaemia.',
            'Pon juntas las dos medidas en V3: QRS y onda T. Aquí la T es más alta que la R y casi tan grande como todo el QRS (R + S); una T precordial normal es mucho menor. **Una T demasiado grande para su QRS** es la firma proporcional de la isquemia hiperaguda.',
          ),
          marks: [{ auto: 'qrs', lead: 'V3' }, { auto: 't', lead: 'V3' }],
        },
        {
          title: l('再看ST段', 'Now the ST segment', 'Ahora el segmento ST'),
          body: l(
            'V2的J点和J+60抬高约0.5 mm——低于任何界值。这就是要点：**T波先来，ST抬高后到**。超急性期T波可以单独出现在完全闭塞的最早期。',
            'The J point and J+60 in V2 are raised by about 0.5 mm — below every threshold. That is the point: **the T wave arrives first, the ST elevation later**. Hyperacute T waves can stand alone in the earliest phase of a total occlusion.',
            'El punto J y el J+60 en V2 están elevados unos 0,5 mm: por debajo de cualquier umbral. Esa es la clave: **la onda T llega primero, la elevación del ST después**. Las T hiperagudas pueden presentarse solas en la fase más precoz de una oclusión total.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }, { auto: 'st60', lead: 'V2' }],
        },
        {
          title: l('承诺与行动', 'Commit and act', 'Decide y actúa'),
          body: l(
            '胸痛不缓解 + 超急性期T波 = **很可能的闭塞**：不放走，也不等它“长成”STEMI。15–30分钟内复查心电图、找旧图、持续监测；若疼痛难治、血流动力学不稳定或图形动态演变 ⇒ 立即侵入性策略（<2小时）。',
            'Unrelenting chest pain + hyperacute T waves = **probable occlusion**: no discharge, and no waiting for the pattern to "grow into" a STEMI. Repeat the ECG within 15–30 minutes, fetch the old tracing, keep the monitor on; refractory pain, haemodynamic instability or dynamic changes ⇒ immediate invasive strategy (<2 h).',
            'Dolor torácico persistente + T hiperagudas = **oclusión probable**: ni alta ni esperar a que el patrón "crezca" hasta un IAMCEST. Repite el ECG en 15–30 minutos, busca el trazado antiguo, mantiene la monitorización; dolor refractario, inestabilidad hemodinámica o cambios dinámicos ⇒ estrategia invasiva inmediata (<2 h).',
          ),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('界值附近的抬高：隐匿性闭塞还是早期复极？', 'Modest elevation: subtle occlusion or early repolarization?', 'Elevación modesta: ¿oclusión sutil o repolarización precoz?'),
      left: {
        ecg: synth('stemi-anterior-subtle', 924),
        caption: l('52岁男性，持续胸痛', 'Man, 52, ongoing chest pain', 'Varón de 52 años, dolor torácico persistente'),
        marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'st60', lead: 'III' }],
      },
      right: {
        ecg: synth('early-repolarization', 925, { st: 0.14 }),
        caption: l('24岁男性，无不适', 'Man, 24, no symptoms', 'Varón de 24 años, asintomático'),
        marks: [{ auto: 'st60', lead: 'V3' }, { auto: 'j', lead: 'II' }],
      },
      point: l(
        'A（闭塞）：抬高只有约1 mm，T波粗大对称，III、aVF有轻微镜像性压低、下壁T波低平，疼痛持续。B（早期复极）：ST从**带切迹的J点**呈**凹面向上**抬起，V2–V3甚至比A略高（约1.5 mm，仍低于24岁男性的2.5 mm），分布广（V1–V6加下壁导联的J点切迹），**没有对应性压低**（aVR除外），患者年轻且无疼痛。比例在这里有帮助：A 的 V2 中 T 波与整个 QRS 一样高（T/QRS 约 1），B 只有约一半；但到了 V3 两者接近（约 1.05 对 0.9），早期复极的 T 波也可以很大——所以单凭比例分不开这两份图，J点切迹、镜像、临床背景，尤其是复查的心电图，才能分开。拿不准时，把两组数字代进 **4变量公式**（QTc、V4的R波、V2的QRS振幅、V3的J+60抬高）：它是**辅助**——答案来自系列心电图和临床背景。',
        'A (occlusion): only about 1 mm of elevation, bulky symmetric T waves, a faint mirror in III/aVF with flattened inferior T waves, and ongoing pain. B (early repolarization): **concave** ST rising from a **notched J point**, in V2–V3 slightly higher than A (about 1.5 mm, still under the 2.5 mm limit for a man of 24), widespread (V1–V6 plus J-point notching in the inferior leads), **no reciprocal depression** (aVR apart), a young pain-free patient. Proportion helps here: in A the T in V2 is as tall as the whole QRS (T/QRS about 1), in B only about half of it; but in V3 the two come close (about 1.05 against 0.9) — T waves can be large in early repolarization too, so proportion alone does not separate these two tracings: the notched J, the mirror, the clinical story and above all the repeat ECG do. When in doubt, feed both sets of numbers to the **4-variable formula** (QTc, R in V4, QRS amplitude in V2, ST at J+60 in V3): it is an **aid** — the answer comes from serial ECGs and the clinical story.',
        'A (oclusión): solo alrededor de 1 mm de elevación, T voluminosas y simétricas, un espejo leve en III/aVF con T inferiores aplanadas, y dolor persistente. B (repolarización precoz): ST **cóncavo** que sube desde un **punto J con muesca**, en V2–V3 algo más alto que en A (unos 1,5 mm, aún por debajo del límite de 2,5 mm de un varón de 24 años), de distribución amplia (V1–V6 más muesca del punto J en las derivaciones inferiores), **sin descenso recíproco** (salvo aVR), paciente joven sin dolor. La proporción ayuda: en A la T de V2 es tan alta como todo el QRS (T/QRS de alrededor de 1) y en B apenas la mitad; pero en V3 ambos se acercan (unos 1,05 frente a 0,9): en la repolarización precoz las T también pueden ser grandes, así que la proporción por sí sola no separa estos dos trazados; lo hacen la muesca en J, el espejo, la clínica y, sobre todo, el ECG repetido. Ante la duda, introduce ambos juegos de números en la **fórmula de 4 variables** (QTc, R en V4, amplitud del QRS en V2, ST en J+60 en V3): es una **ayuda**; la respuesta viene de los ECG seriados y de la clínica.',
      ),
    },
    {
      kind: 'film',
      title: l('系列心电图：同一颗心，复查一次', 'Serial ECGs: the same heart, recorded again', 'ECG seriados: el mismo corazón, registrado de nuevo'),
      frames: [
        {
          label: l('首份心电图', 'First ECG', 'Primer ECG'),
          ecg: { kind: 'synth', req: { scenario: 'stemi-evolution', variant: 'hyperacute', seed: 928 } },
          note: l(
            'V2–V4 的 J 点不到 1 mm，但 V3 的 T 波几乎和 R 波一样高，III 的 T 波倒置。没过任何界值：15–30 分钟内复查。',
            'J under 1 mm in V2–V4, but the T in V3 is almost as tall as the R and T is inverted in III. No threshold met: repeat in 15–30 min.',
            'J por debajo de 1 mm en V2–V4, pero la T de V3 es casi tan alta como la R y la T de III es negativa. Ningún umbral: repite en 15–30 min.',
          ),
          marks: [{ auto: 'j', lead: 'V3' }, { auto: 't', lead: 'V3' }, { auto: 't', lead: 'III' }],
        },
        {
          label: l('复查心电图', 'Repeat ECG', 'ECG repetido'),
          ecg: synth('stemi-evolution', 928),
          note: l(
            '同一颗心：V2–V3 已 ≥ 2 mm（V3 约 3.5 mm），III 和 aVF 压低约 1 mm：前壁 STEMI。第一张定路径，第二张定诊断。',
            'Same heart: V2–V3 now ≥ 2 mm (V3 about 3.5 mm), III and aVF down about 1 mm: anterior STEMI. The first tracing set the pathway; the second settled it.',
            'El mismo corazón: V2–V3 ya ≥ 2 mm (V3 unos 3,5 mm), III y aVF descienden 1 mm: IAMCEST anterior. El primero marcó el circuito; el segundo lo zanjó.',
          ),
          marks: [{ auto: 'j', lead: 'V3' }, { auto: 'j', lead: 'III' }],
        },
      ],
      predict: {
        question: l(
          '首份心电图只有超急性期 T 波，疼痛还在。复查的心电图最可能出现什么？',
          'The first ECG shows only hyperacute T waves and the pain goes on. What will the repeat ECG most likely show?',
          'El primer ECG solo muestra T hiperagudas y el dolor sigue. ¿Qué mostrará con más probabilidad el ECG repetido?',
        ),
        options: [
          l('V2–V3 的 ST 抬高越过界值', 'ST elevation in V2–V3 past the threshold', 'Elevación del ST en V2–V3 por encima del umbral'),
          l('恢复正常', 'A normal ECG', 'Un ECG normal'),
          l('只剩下 Q 波', 'Only Q waves', 'Solo ondas Q'),
        ],
        answer: 0,
      },
      caption: l(
        '首份图在首次医疗接触 10 分钟内记录；不能确定而疼痛持续时，15–30 分钟内复查，症状变化时随时复查。',
        'The first ECG within 10 min of first medical contact; if it is non-diagnostic and the pain persists, repeat within 15–30 min and whenever symptoms change.',
        'El primer ECG en los 10 min desde el contacto médico inicial; si no es diagnóstico y el dolor persiste, repite en 15–30 min y siempre que cambien los síntomas.',
      ),
    },
    { kind: 'check', item: { family: 'occlusion', seed: 23 } },
    { kind: 'check', item: { family: 'occlusion', seed: 8 } },
    { kind: 'check', item: { family: 'ischemia-patterns', seed: 18 } },
    { kind: 'drill', families: ['occlusion', 'ischemia-patterns'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [5469, 17892],
      caption: l(
        '两份真实心电图，数据库都**没有**把它们判为闭塞：39岁男性（判读为正常——高电压、深S波上方V2–V3约2 mm的ST抬高，是年轻男性常见的正常图形）和63岁女性（非特异性ST改变，V1–V3轻度抬高）。用本课的工具逐一检查：V2–V4的J点与J+60对照性别年龄界值，T波与QRS的比例（这里T波坐在高大的QRS上），有没有镜像。两份图单凭心电图都不需要导管室——但如果患者胸痛仍在，正确的下一步依然是复查心电图并对比旧图。先想好结论再揭晓。',
        'Two real tracings that the database does **not** call an occlusion: a man of 39 (read as normal — about 2 mm of V2–V3 ST elevation above deep S waves with high voltage, the common normal pattern of young men) and a woman of 63 (non-specific ST changes, slight elevation in V1–V3). Run the toolkit on each: J point and J+60 in V2–V4 against the sex/age grid, the T-to-QRS proportion (here the T waves sit on large QRS complexes), and any mirror. On the ECG alone neither needs the cath lab — but if the patient still has pain, the right next step is still a repeat ECG and a comparison with the old one. Commit to a conclusion, then reveal.',
        'Dos trazados reales que la base de datos **no** considera oclusión: un varón de 39 años (informado como normal: unos 2 mm de elevación del ST en V2–V3 sobre ondas S profundas con alto voltaje, el patrón normal habitual del varón joven) y una mujer de 63 (alteraciones inespecíficas del ST, elevación leve en V1–V3). Pasa la caja de herramientas por cada uno: punto J y J+60 en V2–V4 frente a la rejilla sexo/edad, la proporción T/QRS (aquí las T se apoyan en QRS grandes) y si hay espejo. Por el ECG solo, ninguno necesita hemodinámica; pero si el paciente sigue con dolor, el paso correcto sigue siendo repetir el ECG y compararlo con el antiguo. Decide tu conclusión y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '心电图正常就写“无ACS”：超过三分之一的NSTE-ACS入院时心电图正常。',
          'Writing "no ACS" because the ECG is normal: more than a third of NSTE-ACS present with a normal ECG.',
          'Escribir "sin SCA" porque el ECG es normal: más de un tercio de los SCASEST se presentan con un ECG normal.',
        ),
        l(
          '只信一个时间点的一张图：界值附近的图必须15–30分钟内复查并对比旧图。',
          'Trusting a single tracing at a single time point: a borderline ECG demands a repeat in 15–30 minutes and a comparison with the old one.',
          'Confiar en un solo trazado en un solo momento: un ECG en el límite exige repetir en 15–30 minutos y comparar con el antiguo.',
        ),
        l(
          '公式崇拜：4变量公式是辅助，离开系列心电图和临床背景它什么都不是。',
          'Formula worship: the 4-variable formula is an aid; without serial ECGs and clinical context it is nothing.',
          'Fetichismo de la fórmula: la fórmula de 4 variables es una ayuda; sin ECG seriados y contexto clínico no es nada.',
        ),
        l(
          '把超急性期T波叫“高钾血症”却不查血钾、不看QRS宽度：高钾的T窄而尖，QRS会增宽。',
          'Calling hyperacute T waves "hyperkalaemia" without checking potassium or QRS width: the hyperkalaemic T is narrow and tented, and the QRS widens.',
          'Llamar "hiperpotasemia" a las T hiperagudas sin pedir la potasemia ni mirar el ancho del QRS: la T de la hiperpotasemia es estrecha y en tienda, y el QRS se ensancha.',
        ),
        l(
          '忽略肢体导联的细微线索：轻微的对应性压低和aVR的改变常是隐匿性闭塞仅有的朋友。',
          'Ignoring the faint limb-lead clues: subtle reciprocal depression and changes in aVR are often the only friends a hidden occlusion has.',
          'Ignorar las pistas leves de las derivaciones de las extremidades: un descenso recíproco sutil y los cambios en aVR son a menudo los únicos amigos de una oclusión oculta.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '超急性期T波 = 宽底、粗大、对称、相对QRS过大，≥2个相邻导联；是闭塞最早的征象，可先于ST抬高出现。',
          'Hyperacute T = broad-based, bulky, symmetric, large relative to the QRS, in ≥2 contiguous leads; the earliest sign of occlusion, it can precede ST elevation.',
          'T hiperaguda = ancha de base, voluminosa, simétrica, grande respecto al QRS, en ≥2 derivaciones contiguas; el signo más precoz de oclusión, puede preceder a la elevación del ST.',
        ),
        l(
          '比例原则：小QRS上的巨大T波即为异常；V2–V3本应有的J波消失提示QRS终末部变形。',
          'Proportionality: a huge T on a small QRS is abnormal; loss of the expected J wave in V2–V3 signals terminal QRS distortion.',
          'Proporcionalidad: una T enorme sobre un QRS pequeño es anormal; la pérdida de la onda J esperada en V2–V3 señala distorsión terminal del QRS.',
        ),
        l(
          '界值附近的毫米 + 不成比例的T波 + 镜像压低 + 持续疼痛 = 很可能的闭塞：15–30分钟内复查并对比旧图。',
          'Borderline millimetres + a disproportionate T + mirror depression + ongoing pain = probable occlusion: repeat within 15–30 min and compare with the old tracing.',
          'Milímetros en el límite + T desproporcionada + descenso especular + dolor persistente = oclusión probable: repite en 15–30 min y compara con el trazado antiguo.',
        ),
        l(
          '4变量公式（QTc、V4的R波、V2的QRS、V3 J+60的ST）是辅助，不替代系列心电图与临床判断。',
          'The 4-variable formula (QTc, R in V4, QRS in V2, ST at J+60 in V3) is an aid, not a replacement for serial ECGs and clinical judgement.',
          'La fórmula de 4 variables (QTc, R en V4, QRS en V2, ST en J+60 en V3) es una ayuda, no un sustituto del ECG seriado y del juicio clínico.',
        ),
        l(
          '毫米标准会漏掉闭塞（回旋支尤甚）；难治性疼痛、不稳定、危险心律失常或动态改变 ⇒ <2小时立即侵入；正常心电图绝不排除ACS。',
          'Millimetre criteria miss occlusions (the circumflex above all); refractory pain, instability, dangerous arrhythmia or dynamic change ⇒ immediate invasive <2 h; a normal ECG never rules out ACS.',
          'Los criterios en milímetros pierden oclusiones (la circunfleja sobre todo); dolor refractario, inestabilidad, arritmia peligrosa o cambio dinámico ⇒ invasiva inmediata <2 h; un ECG normal nunca excluye un SCA.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Driver BE et al. J Electrocardiol 2017;50:561-569',
    'Smith SW et al. Am J Cardiol 2012;110:1696-1701',
    'Castellano et al. 2004',
  ],
};

export default lesson;
