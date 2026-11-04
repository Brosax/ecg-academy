/**
 * i3 — Anterior occlusion (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `mi-territories` and `engelen-patterns` (current values), and the `ischaemia-t`
 * current value (hyperacute T waves as the earliest sign of occlusion, before ST elevation).
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
  id: 'i3',
  stage: 'I',
  order: 3,
  title: l('前壁闭塞', 'Anterior occlusion', 'Oclusión anterior'),
  summary: l(
    '前壁闭塞是一族诊断：从 V1–V2（室间隔）到 V1–V6 ± I/aVL（广泛前壁），罪犯血管都是 LAD，抬高的导联越多、闭塞越靠近近段。用轻量版 Engelen 线索估计闭塞水平，并把超急性期T波认作最早的信号。',
    'Anterior occlusion is a family of diagnoses: from V1–V2 (septal) to V1–V6 ± I/aVL (extensive anterior), all fed by the LAD — the more leads elevated, the more proximal the occlusion. Estimate the occlusion level with the light Engelen clues, and recognise the hyperacute T wave as the earliest sign.',
    'La oclusión anterior es una familia de diagnósticos: de V1–V2 (septal) a V1–V6 ± I/aVL (anterior extenso), todos dependientes de la DA; cuantas más derivaciones elevadas, más proximal es la oclusión. Estima el nivel de oclusión con las pistas ligeras de Engelen y reconoce la onda T hiperaguda como la señal más precoz.',
  ),
  objectives: [
    l(
      '按导联范围命名前壁家族：室间隔、前间壁、前壁/心尖、广泛前壁、前侧壁。',
      'Name the members of the anterior family by lead extent: septal, anteroseptal, anterior/apical, extensive anterior, anterolateral.',
      'Nombrar a los miembros de la familia anterior según la extensión: septal, anteroseptal, anterior/apical, anterior extenso y anterolateral.',
    ),
    l(
      '用轻量版 Engelen 线索（aVR/V1、下壁压低、I/aVL）估计 LAD 闭塞水平。',
      'Estimate the LAD occlusion level from the light Engelen clues (aVR/V1, inferior depression, I/aVL).',
      'Estimar el nivel de oclusión de la DA con las pistas ligeras de Engelen (aVR/V1, descenso inferior, I/aVL).',
    ),
    l(
      '把超急性期T波识别为闭塞最早的心电图信号，并说出下一步（复查心电图）。',
      'Recognise the hyperacute T wave as the earliest ECG sign of occlusion and state the next step (repeat the ECG).',
      'Reconocer la onda T hiperaguda como la señal electrocardiográfica más precoz de oclusión e indicar el paso siguiente (repetir el ECG).',
    ),
    l(
      '说出前壁心肌梗死的并发症谱与处理方向（再灌注，不等肌钙蛋白）。',
      'State the complication profile of anterior MI and the direction of management (reperfusion, without waiting for troponin).',
      'Citar el perfil de complicaciones del infarto anterior y la orientación del tratamiento (reperfusión, sin esperar la troponina).',
    ),
  ],
  minutes: 15,
  competencies: ['C8'],
  findings: ['stemi-anterior', 'stemi-anteroseptal', 'stemi-anterolateral', 'hyperacute-t'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-anterolateral', 841),
      question: l(
        '61岁男性，胸痛50分钟：V3–V6 与 I/aVL 的 ST 段一致抬高，III、aVF 压低。有多大范围的心肌处于危险之中？闭塞位于动脉的哪一段？先想好你的判断再继续。',
        'Man, 61, chest pain for 50 minutes: ST elevation together across V3–V6 and I/aVL, with depression in III and aVF. How much myocardium is at risk, and where along the artery is the occlusion? Commit to an answer before you continue.',
        'Varón de 61 años, dolor torácico de 50 minutos: elevación del ST en V3–V6 e I/aVL a la vez, con descenso en III y aVF. ¿Cuánto miocardio está en riesgo y en qué punto de la arteria está la oclusión? Decide tu respuesta antes de continuar.',
      ),
      reveal: l(
        'V3–V6 加 I、aVL——**前侧壁**：左心室前壁与侧壁一起受累，是 **LAD 加粗大对角支**的领地；I/aVL 抬高伴 III 压低（III > II）提示闭塞在第一对角支（D1）**之前**。危险心肌很大——只比 V1–V6 全部抬高的广泛前壁小一点。前壁闭塞不是一个诊断而是一族诊断：本课按导联范围给家族成员命名，用几个线索估计闭塞水平，并认识最早的信号——超急性期T波。',
        'V3–V6 plus I and aVL — **anterolateral**: the anterior and lateral walls of the left ventricle involved together, the territory of the **LAD with a large diagonal**; I/aVL elevation with depression in III (III > II) places the occlusion **before the first diagonal (D1)**. The myocardium at risk is large — second only to the extensive anterior pattern with all of V1–V6 elevated. Anterior occlusion is not one diagnosis but a family: this lesson names its members by lead extent, estimates the occlusion level from a few clues, and meets the earliest signal — the hyperacute T wave.',
        'V3–V6 más I y aVL: **anterolateral**; paredes anterior y lateral del ventrículo izquierdo a la vez, territorio de la **DA con una diagonal gruesa**; la elevación en I/aVL con descenso en III (III > II) sitúa la oclusión **antes de la primera diagonal (D1)**. La masa en riesgo es grande, solo por detrás del anterior extenso con todo V1–V6 elevado. La oclusión anterior no es un diagnóstico sino una familia: esta lección nombra a sus miembros según la extensión, estima el nivel de la oclusión con unas pistas y presenta la señal más precoz: la onda T hiperaguda.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('stemi-anterior', 842, { st: 0.3 }),
      emphasize: ['lv-basal-anterior', 'lv-basal-anteroseptal', 'lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'],
      caption: l(
        '播放一个心动周期：发亮的是 LAD 供血的节段——前壁、心尖与室间隔，约占左心室的一半。LAD 沿途发出间隔支（室间隔与传导系统）和对角支（前侧壁）：**闭塞越靠近近段，被一起攫取的领土越多**——导联范围正是在告诉你这件事。',
        'Play one beat: the lit segments are fed by the LAD — anterior wall, apex and septum, roughly half the left ventricle. Along its course the LAD gives septal branches (septum and conduction system) and diagonals (anterolateral wall): **the more proximal the occlusion, the more territory it claims** — and that is exactly what the lead extent is telling you.',
        'Reproduce un latido: los segmentos iluminados dependen de la DA —pared anterior, ápex y tabique—, cerca de la mitad del ventrículo izquierdo. A lo largo de su trayecto la DA da ramas septales (tabique y sistema de conducción) y diagonales (pared anterolateral): **cuanto más proximal es la oclusión, más territorio se lleva**, y eso es justo lo que te dice la extensión de las derivaciones.',
      ),
    },
    {
      kind: 'criteria',
      title: l('前壁家族：导联 ↔ 区域 ↔ 预后', 'The anterior family: leads ↔ territory ↔ prognosis', 'La familia anterior: derivaciones ↔ territorio ↔ pronóstico'),
      items: [
        {
          label: l('室间隔', 'Septal', 'Septal'),
          value: l('V1–V2 → LAD 间隔支', 'V1–V2 → LAD septal branches', 'V1–V2 → ramas septales de la DA'),
        },
        {
          label: l('前间壁', 'Anteroseptal', 'Anteroseptal'),
          value: l('V1–V4 → LAD（多在 D1 之后）', 'V1–V4 → LAD (usually after D1)', 'V1–V4 → DA (habitualmente tras D1)'),
        },
        {
          label: l('前壁（心尖）', 'Anterior (apical)', 'Anterior (apical)'),
          value: l('V3–V4 → LAD 中远段', 'V3–V4 → mid-to-distal LAD', 'V3–V4 → DA media y distal'),
        },
        {
          label: l('广泛前壁', 'Extensive anterior', 'Anterior extenso'),
          value: l('V1–V6 ± I/aVL → 近段 LAD；危险心肌最大', 'V1–V6 ± I/aVL → proximal LAD; the largest myocardium at risk', 'V1–V6 ± I/aVL → DA proximal; la mayor masa en riesgo'),
        },
        {
          label: l('前侧壁', 'Anterolateral', 'Anterolateral'),
          value: l('V3–V6 + I/aVL → LAD + 粗大对角支', 'V3–V6 + I/aVL → LAD + a large diagonal', 'V3–V6 + I/aVL → DA + diagonal gruesa'),
        },
        {
          label: l('高侧壁', 'High lateral', 'Lateral alto'),
          value: l('I、aVL → 第一对角支（D1）或 LCx/钝缘支', 'I, aVL → first diagonal (D1) or LCx/obtuse marginal', 'I, aVL → primera diagonal (D1) o Cx/marginal obtusa'),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    },
    {
      kind: 'worked',
      title: l('完整读一份前间壁 STEMI', 'Read an anteroseptal STEMI end to end', 'Leer de principio a fin un IAMCEST anteroseptal'),
      ecg: synth('stemi-anteroseptal', 843),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('找最大 ST 抬高', 'Find the greatest ST elevation', 'Busca la mayor elevación del ST'),
          body: l(
            '扫过全部导联：J 点抬高最明显处在 **V2**，V1–V3 连成一片（V4 不到 1 mm），V5–V6 与 I/aVL 不抬高。患者为 64 岁女性：V2–V3 界值 1.5 mm，两个导联都已超过。',
            'Sweep all the leads: the clearest J-point elevation is in **V2**, running V1–V3 as one strip (V4 under 1 mm), with V5–V6 and I/aVL not elevated. The patient is a woman of 64: the V2–V3 limit is 1.5 mm — exceeded in both leads.',
            'Recorre todas las derivaciones: la mayor elevación del punto J está en **V2**, de forma continua por V1–V3 (V4 por debajo de 1 mm), con V5–V6 e I/aVL sin elevar. La paciente es una mujer de 64 años: el límite en V2–V3 es 1,5 mm, superado en ambas.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }],
          highlightLeads: ['V1', 'V2', 'V3'],
        },
        {
          title: l('命名区域', 'Name the territory', 'Nombra el territorio'),
          body: l(
            '前壁相邻组的 V1–V3 抬高、V5–V6/I/aVL 不参与：**前间壁**——不是广泛前壁。',
            'V1–V3 of the anterior contiguous group are elevated, V5–V6/I/aVL take no part: **anteroseptal** — not extensive anterior.',
            'V1–V3, del grupo contiguo anterior, están elevadas y V5–V6/I/aVL no participan: **anteroseptal**, no anterior extenso.',
          ),
          highlightLeads: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'I', 'aVL'],
        },
        {
          title: l('估计闭塞水平', 'Estimate the occlusion level', 'Estima el nivel de la oclusión'),
          body: l(
            '看三个“水平线索”：aVR、V1 与下壁导联。本图 aVR 无抬高、下壁无显著压低——不像 S1/D1 之前的近段闭塞；结合前间壁整体受累，符合 **D1 之后的 LAD 闭塞**。',
            'Check the three "level clues": aVR, V1 and the inferior leads. Here aVR shows no elevation and the inferior leads no meaningful depression — unlike an occlusion proximal to S1/D1; with the whole anteroseptal territory involved, this fits an **LAD occlusion distal to D1**.',
            'Mira las tres «pistas de nivel»: aVR, V1 y las derivaciones inferiores. Aquí aVR no se eleva y las inferiores no muestran descenso significativo, a diferencia de una oclusión proximal a S1/D1; con todo el territorio anteroseptal afectado, encaja con una **oclusión de la DA distal a D1**.',
          ),
          marks: [{ auto: 'st', lead: 'III' }, { auto: 'st', lead: 'aVR' }],
          highlightLeads: ['aVR', 'V1', 'II', 'III'],
        },
        {
          title: l('危险与下一步', 'Risk and next step', 'Riesgo y paso siguiente'),
          body: l(
            '**前间壁 STEMI → LAD（D1 之后）**。前壁意味着大量心肌：属于心源性休克与室性心律失常风险最高的一类，立即启动再灌注（导管室、直接 PCI），不必等肌钙蛋白；全程心电监护。',
            '**Anteroseptal STEMI → LAD (distal to D1)**. An anterior territory means a large mass of muscle: among the highest-risk groups for cardiogenic shock and ventricular arrhythmias. Start reperfusion at once (cath lab, primary PCI) without waiting for troponin, with continuous ECG monitoring.',
            '**IAMCEST anteroseptal → DA (distal a D1)**. Un territorio anterior implica mucha masa muscular: de los grupos con mayor riesgo de shock cardiogénico y arritmias ventriculares. Inicia de inmediato la reperfusión (sala de hemodinámica, ICP primaria) sin esperar la troponina, con monitorización electrocardiográfica continua.',
          ),
          highlightLeads: ['V1', 'V2', 'V3', 'V4'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('V1–V4 还是 I/aVL？两支不同的动脉', 'V1–V4 or I, aVL? Two different arteries', '¿V1–V4 o I, aVL? Dos arterias distintas'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('stemi-anteroseptal', 844),
        caption: l('A：前间壁——V1–V3 抬高（LAD 主干，D1 之后）', 'A: anteroseptal — V1–V3 elevated (main LAD, distal to D1)', 'A: anteroseptal — V1–V3 elevadas (DA principal, distal a D1)'),
        marks: [{ auto: 'st60', lead: 'V2' }],
      },
      right: {
        ecg: synth('stemi-high-lateral', 845),
        caption: l(
          'B：高侧壁——I、aVL 抬高（aVL 约 2 mm），V2 也抬高（与 V1 相当；V3 较小，V4–V6 不到 1 mm）；III 压低约 3 mm 只是镜像',
          'B: high lateral — I and aVL elevated (aVL about 2 mm), V2 up as well (as much as V1; V3 less, V4–V6 under 1 mm); the depression of about 3 mm in III is only the mirror',
          'B: lateral alto — I y aVL elevadas (aVL unos 2 mm), también V2 (tanto como V1; V3 menos y V4–V6 por debajo de 1 mm); el descenso de unos 3 mm en III es solo la imagen especular',
        ),
        marks: [{ auto: 'st', lead: 'I' }, { auto: 'st', lead: 'aVL' }, { auto: 'st', lead: 'III' }],
      },
      point: l(
        'A 与 B 都抬高 V2–V3，区分它们的是 I 和 aVL：A 的 I、aVL 平坦——LAD 主干（D1 之后）的前间壁区域；B 的 I、aVL 抬高并带上 V2，III（± II/aVF）深度压低只是它的镜像，V4–V6 不到 1 mm——这是**第一对角支（D1）**闭塞的“南非国旗”征（第 i5 课）。把 B 读成“下壁缺血”（III 的偏移最大）就漏掉了一个闭塞；反过来，A 里 V5–V6/I/aVL 的加入才是 LAD 更近段或粗大对角支的标志。同样的相邻导联逻辑，指向两个不同的罪犯血管。',
        'Both A and B elevate V2–V3; what separates them is I and aVL. In A, I and aVL are flat — the anteroseptal territory of the main LAD beyond D1. In B, I and aVL are elevated together with V2, the deep ST depression in III (± II/aVF) is only the mirror and V4–V6 stay under 1 mm — the "South African flag" of a **first diagonal (D1)** occlusion (lesson i5). Reading B as "inferior ischaemia" (III carries its largest deflection) misses an occlusion; conversely, V5–V6/I/aVL joining A is what marks a more proximal LAD or a large diagonal. The same contiguity logic points to two different culprit arteries.',
        'A y B elevan V2–V3; lo que las separa son I y aVL. En A, I y aVL están planas: el territorio anteroseptal de la DA principal, distal a D1. En B, I y aVL se elevan junto con V2, el descenso profundo del ST en III (± II/aVF) es solo la imagen especular y V4–V6 quedan por debajo de 1 mm: la «bandera sudafricana» de una oclusión de la **primera diagonal (D1)** (lección i5). Leer B como «isquemia inferior» (III tiene su mayor desviación) deja pasar una oclusión; a la inversa, que en A se sumen V5–V6/I/aVL es lo que señala una DA más proximal o una diagonal gruesa. La misma lógica de contigüidad apunta a dos arterias responsables distintas.',
      ),
    },
    {
      kind: 'criteria',
      title: l('估计闭塞水平（轻量版 Engelen）', 'Estimating the occlusion level (Engelen, kept light)', 'Estimar el nivel de la oclusión (Engelen, en versión ligera)'),
      items: [
        {
          label: l('S1 与 D1 之前', 'Before S1 and D1', 'Antes de S1 y D1'),
          value: l(
            'ST↑ aVR ± V1（> 2 mm）+ 下壁 ST↓（III > II）± V5 → 近段 LAD：面积最大、预后最差',
            'ST elevation aVR ± V1 (> 2 mm) + inferior ST depression (III > II) ± V5 → proximal LAD: largest infarct, worst prognosis',
            'Elevación del ST en aVR ± V1 (> 2 mm) + descenso inferior (III > II) ± V5 → DA proximal: el mayor infarto y el peor pronóstico',
          ),
        },
        {
          label: l('D1 之前（S1 之后）', 'Before D1 (after S1)', 'Antes de D1 (tras S1)'),
          value: l(
            'ST↑ I/aVL + ST↓ III > II → 对角支近端，侧壁加入',
            'ST elevation I/aVL + ST depression III > II → proximal to the diagonal, the lateral wall joins',
            'Elevación del ST en I/aVL + descenso III > II → proximal a la diagonal; se suma la pared lateral',
          ),
        },
        {
          label: l('S1 与 D1 之后', 'Distal to both', 'Distal a ambas'),
          value: l(
            '下壁导联不受累 → 梗死较小（本课示例的类型）',
            'The inferior leads spared → a smaller infarct (the type in this lesson)',
            'Las derivaciones inferiores respetadas → un infarto más pequeño (el tipo de esta lección)',
          ),
        },
      ],
      source: 'Engelen DJ et al. J Am Coll Cardiol 1999;34:389-395',
    },
    {
      kind: 'live',
      scenario: 'stemi-anterior',
      seed: 846,
      dials: [{ id: 'st' }],
      marks: [{ auto: 'j', lead: 'V3' }, { auto: 'j', lead: 'V5' }, { auto: 'j', lead: 'III' }],
      play: {
        dial: 'st',
        from: 0.22,
        to: 0.45,
        notes: [
          {
            min: 0.22,
            max: 0.3,
            text: l(
              'J点：V3 2–3.5 mm，V5–V6不到1 mm。抬高停留在前壁导联。',
              'At J: V3 2–3.5 mm, V5–V6 under 1 mm. The elevation stays on the front-wall leads.',
              'En J: V3 2–3,5 mm, V5–V6 por debajo de 1 mm. La elevación se queda en las derivaciones de la pared anterior.',
            ),
          },
          {
            min: 0.31,
            max: 0.45,
            text: l(
              'V2–V4继续升高，III压得更深，V5–V6仍不到1 mm：电流更大，区域不变。',
              'V2–V4 keep growing and III sinks deeper, yet V5–V6 stay under 1 mm: more current, same territory.',
              'V2–V4 siguen creciendo y III baja más, pero V5–V6 siguen por debajo de 1 mm: más corriente, mismo territorio.',
            ),
          },
        ],
      },
      predict: {
        question: l('把损伤电流调到最大，V5–V6 会加入抬高吗？', 'Turn the injury current to its maximum. Will V5–V6 join the elevation?', 'Sube la corriente de lesión al máximo. ¿Se sumarán V5–V6 a la elevación?'),
        options: [
          l('不会：导联范围由区域决定', 'No: the territory sets the lead extent', 'No: el territorio fija la extensión'),
          l('会：电流越大，抬高的导联越多', 'Yes: more current lifts more leads', 'Sí: más corriente eleva más derivaciones'),
        ],
        answer: 0,
      },
      caption: l(
        '拖动损伤电流：看哪些导联在动，而不只是动了多少。',
        'Drag the injury current: watch which leads move, not only how far.',
        'Mueve la corriente de lesión: mira qué derivaciones se mueven, no solo cuánto.',
      ),
    },
    {
      kind: 'film',
      title: l('前壁闭塞：最早的信号与家族成员', 'Anterior occlusion: the earliest sign and the family', 'Oclusión anterior: la señal más precoz y la familia'),
      view: { layout: '3x4+1' },
      frames: [
        {
          label: l('超急性期T波', 'Hyperacute T', 'T hiperaguda'),
          ecg: synth('hyperacute-t', 847),
          note: l(
            'V2–V4的T波宽大、超过5 mm，J点仍不到1 mm；III的T波倒置。最早的信号：15–30分钟内复查。',
            'V2–V4: broad, bulky T waves over 5 mm while J stays under 1 mm; T inverted in III. The earliest sign: repeat the ECG in 15–30 min.',
            'V2–V4: T anchas y voluminosas de más de 5 mm con J por debajo de 1 mm; T negativa en III. La señal más precoz: repite el ECG en 15–30 min.',
          ),
          marks: [{ auto: 't', lead: 'V3' }, { auto: 't', lead: 'III' }],
        },
        {
          label: l('前间壁 V1–V3', 'Anteroseptal V1–V3', 'Anteroseptal V1–V3'),
          ecg: synth('stemi-anteroseptal', 848),
          note: l(
            'V1–V3抬高，V2最高，V4不到1 mm；V5–V6、I、aVL不抬高：前间壁 → D1之后的LAD。',
            'V1–V3 up, V2 highest, V4 under 1 mm; V5–V6, I and aVL not elevated: anteroseptal → LAD beyond D1.',
            'V1–V3 elevadas, máxima en V2, V4 por debajo de 1 mm; V5–V6, I y aVL sin elevar: anteroseptal → DA distal a D1.',
          ),
          marks: [{ auto: 'j', lead: 'V2' }, { auto: 'j', lead: 'V4' }],
        },
        {
          label: l('前间壁 V1–V4', 'Anteroseptal V1–V4', 'Anteroseptal V1–V4'),
          ecg: synth('stemi-anterior', 846, { st: 0.3 }),
          note: l(
            'V1–V4抬高，V3最高，II、III、aVF呈镜像：整个前间壁组 → LAD。',
            'V1–V4 up, most in V3, with a mirror in II, III and aVF: the whole anteroseptal group → LAD.',
            'V1–V4 elevadas, máxima en V3, con espejo en II, III y aVF: todo el grupo anteroseptal → DA.',
          ),
          marks: [{ auto: 'j', lead: 'V3' }, { auto: 'j', lead: 'III' }],
        },
        {
          label: l('前侧壁', 'Anterolateral', 'Anterolateral'),
          ecg: synth('stemi-anterolateral', 841),
          note: l(
            '开头那份图：V3–V6加I、aVL抬高，V1–V2没有；III压低。前侧壁 → LAD加粗大对角支。',
            'The opening tracing: V3–V6 plus I and aVL up, V1–V2 not; III down. Anterolateral → LAD with a large diagonal.',
            'El trazado inicial: V3–V6 más I y aVL elevadas, V1–V2 no; III descendida. Anterolateral → DA con una diagonal gruesa.',
          ),
          marks: [{ auto: 'j', lead: 'aVL' }, { auto: 'j', lead: 'V5' }],
        },
      ],
      caption: l(
        '抬高的导联越多、侧壁越早加入，闭塞越靠近近段，危险心肌越大。',
        'The more leads that rise, and the sooner the lateral leads join, the more proximal the occlusion and the more muscle at risk.',
        'Cuantas más derivaciones se elevan y antes se suman las laterales, más proximal es la oclusión y más músculo está en riesgo.',
      ),
    },
    { kind: 'check', item: { family: 'territory', seed: 2 } },
    { kind: 'check', item: { family: 'territory', seed: 6 } },
    { kind: 'check', item: { family: 'max-st', seed: 19 } },
    { kind: 'drill', families: ['territory', 'occlusion'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [15319, 16195, 5862],
      caption: l(
        '三份真实的前壁梗死（70、73、72 岁女性），数据库分期为 II–III 或 III：陈旧或演变中的梗死，不是急性 STEMI。没有可供决策的急性 ST 抬高，就用 Q 波（QS、R 波丢失）和 T 波定出范围：家族里的哪一员、哪支动脉？同一套导联组既能定位急性闭塞，也能定位它留下的瘢痕——但时期决定处理：陈旧梗死不是启动导管室的理由。先想好答案再揭晓。',
        'Three real anterior infarcts (women of 70, 73 and 72) staged II–III or III in the database: old or evolving infarcts, not acute STEMIs. With no acute ST elevation to act on, map the extent from the Q waves (QS, lost R) and the T waves: which member of the family, which artery? The same lead groups that localise an acute occlusion localise the scar it leaves — but the stage decides management: an old infarct is not a cath-lab activation. Commit to an answer, then reveal.',
        'Tres infartos anteriores reales (mujeres de 70, 73 y 72 años) con estadio II–III o III en la base de datos: infartos antiguos o en evolución, no IAMCEST agudos. Sin elevación aguda del ST sobre la que decidir, delimita la extensión por las ondas Q (QS, pérdida de R) y las T: ¿qué miembro de la familia, qué arteria? Los mismos grupos de derivaciones que localizan una oclusión aguda localizan la cicatriz que deja, pero el estadio decide el manejo: un infarto antiguo no es una activación de hemodinámica. Decide tu respuesta y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把广泛前壁叫成“前间壁”：V5–V6/I/aVL 没看，危险面积与近段闭塞的信息一起被低估。',
          'Calling an extensive anterior MI "anteroseptal": V5–V6/I/aVL are never checked, underestimating both the area at risk and the proximal occlusion.',
          'Llamar «anteroseptal» a un anterior extenso: no se miran V5–V6/I/aVL y se minusvalora a la vez el área en riesgo y la oclusión proximal.',
        ),
        l(
          'aVR/V1 抬高加下壁压低不被识别为 S1/D1 之前的近段 LAD 闭塞——最重的一型。',
          'ST elevation in aVR/V1 with inferior depression not recognised as an LAD occlusion proximal to S1/D1 — the heaviest subtype.',
          'No reconocer la elevación en aVR/V1 con descenso inferior como oclusión de la DA proximal a S1/D1, el subtipo más grave.',
        ),
        l(
          '超急性期T波被当作“正常变异”打发：宽底、与 QRS 不成比例的 T 是最早的信号，应复查心电图。',
          'Waving off hyperacute T waves as a "normal variant": a broad-based T disproportionate to the QRS is the earliest signal — repeat the ECG.',
          'Despachar las ondas T hiperagudas como «variante normal»: una T ancha desproporcionada al QRS es la señal más precoz; repite el ECG.',
        ),
        l(
          '高侧壁（I/aVL）梗死被读成“只有 II/III/aVF 的镜像压低”，真正的闭塞被漏掉。',
          'A high-lateral (I/aVL) infarct read as "only reciprocal depression in II/III/aVF", missing the occlusion itself.',
          'Leer un infarto lateral alto (I/aVL) como «solo descenso recíproco en II/III/aVF» y perder la oclusión real.',
        ),
        l(
          '命名止步于“前壁 STEMI”：范围（家族成员）与闭塞水平才是决定预后和沟通导管室的信息。',
          'Stopping the report at "anterior STEMI": the extent (which family member) and the occlusion level are what carry the prognosis and the conversation with the cath lab.',
          'Quedarse en «IAMCEST anterior»: la extensión (qué miembro de la familia) y el nivel de oclusión son lo que aporta el pronóstico y la comunicación con hemodinámica.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '前壁家族：V1–V2 室间隔；V1–V4 前间壁；V3–V4 前壁/心尖；V1–V6 ± I/aVL 广泛前壁；V3–V6 + I/aVL 前侧壁——罪犯血管都是 LAD（孤立高侧壁为 D1 或 LCx）。',
          'The anterior family: V1–V2 septal; V1–V4 anteroseptal; V3–V4 anterior/apical; V1–V6 ± I/aVL extensive anterior; V3–V6 + I/aVL anterolateral — the culprit is the LAD throughout (isolated high lateral: D1 or LCx).',
          'La familia anterior: V1–V2 septal; V1–V4 anteroseptal; V3–V4 anterior/apical; V1–V6 ± I/aVL anterior extenso; V3–V6 + I/aVL anterolateral: la responsable es siempre la DA (lateral alto aislado: D1 o Cx).',
        ),
        l(
          '闭塞水平：ST↑ aVR/V1 + 下壁 ST↓（III > II）⇒ S1/D1 之前（最重）；ST↑ I/aVL + ST↓ III > II ⇒ D1 之前；下壁不受累 ⇒ 较远端。',
          'Occlusion level: ST elevation aVR/V1 + inferior ST depression (III > II) ⇒ before S1/D1 (worst); ST elevation I/aVL + ST depression III > II ⇒ before D1; inferior leads spared ⇒ more distal.',
          'Nivel de oclusión: elevación en aVR/V1 + descenso inferior (III > II) ⇒ antes de S1/D1 (el peor); elevación en I/aVL + descenso III > II ⇒ antes de D1; inferiores respetadas ⇒ más distal.',
        ),
        l(
          '抬高的导联越多、侧壁越早加入，闭塞越靠近近段、危险心肌越大。',
          'The more leads elevated, and the earlier the lateral wall joins, the more proximal the occlusion and the larger the myocardium at risk.',
          'Cuantas más derivaciones elevadas y cuanto antes se suma la pared lateral, más proximal es la oclusión y mayor la masa en riesgo.',
        ),
        l(
          '超急性期T波（宽底、粗大、对称、与 QRS 不成比例，≥ 2 个相邻导联）可先于 ST 抬高出现：15–30 分钟内复查并对比旧图。',
          'Hyperacute T waves (broad-based, bulky, symmetric, disproportionate to the QRS, in ≥ 2 contiguous leads) can precede ST elevation: repeat within 15–30 minutes and compare with old tracings.',
          'Las ondas T hiperagudas (anchas de base, voluminosas, simétricas, desproporcionadas al QRS, en ≥ 2 derivaciones contiguas) pueden preceder a la elevación del ST: repite en 15–30 minutos y compara con trazados previos.',
        ),
        l(
          '前壁 = 各区域中最大的危险心肌：警惕心源性休克与室性心律失常；诊断成立即启动再灌注。',
          'Anterior = the largest myocardium at risk of any territory: watch for cardiogenic shock and ventricular arrhythmias; start reperfusion as soon as the diagnosis stands.',
          'Territorio anterior = la mayor masa en riesgo de todos: vigila el shock cardiogénico y las arritmias ventriculares; inicia la reperfusión en cuanto el diagnóstico está hecho.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Engelen DJ et al. J Am Coll Cardiol 1999;34:389-395',
    'Amsterdam EA et al. 2014 AHA/ACC Guideline for the Management of Patients With Non-ST-Elevation Acute Coronary Syndromes. J Am Coll Cardiol 2014;64:e139-e228',
    'Castellano et al. 2004',
  ],
};

export default lesson;
