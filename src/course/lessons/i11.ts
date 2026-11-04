/**
 * i11 — Mimics: pericarditis, early repolarization, aneurysm, Brugada, hyperkalaemia, takotsubo (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md "Missing in the book" bullet "STEMI mimics — differential diagnosis"
 * (ischemia-injury-infarction), the "rSr' in V1 / incomplete RBBB vs Brugada pattern" bullet (bundle-branch-fascicular-
 * blocks) and the "Hyperkalaemia — ECG progression" bullet (electrolytes-drugs-misc-conditions).
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
  id: 'i11',
  stage: 'I',
  order: 11,
  title: l(
    '类似心肌梗死的情况：心包炎、早期复极、室壁瘤、Brugada、高钾血症、应激性心肌病',
    'Mimics: pericarditis, early repolarization, aneurysm, Brugada, hyperkalaemia, takotsubo',
    'Imitadores: pericarditis, repolarización precoz, aneurisma, Brugada, hiperpotasemia y tako-tsubo',
  ),
  summary: l(
    'ST 段抬高不是 STEMI 的同义词：按阶梯过一遍模仿者——早期复极、心包炎、LVH/左束支传导阻滞、Brugada 1 型、高钾血症、takotsubo、陈旧室壁瘤——再让对应性压低、动态演变与供血区分布替你做决定。',
    'ST elevation is not a synonym for STEMI: walk the mimic ladder — early repolarization, pericarditis, LVH/LBBB, Brugada type 1, hyperkalaemia, takotsubo, old aneurysm — and let reciprocal depression, dynamic change and territorial distribution make the call.',
    'La elevación del ST no es sinónimo de IAMCEST: recorre la escalera de imitadores —repolarización precoz, pericarditis, HVI/BRI, Brugada tipo 1, hiperpotasemia, tako-tsubo, aneurisma antiguo— y deja que el descenso recíproco, el cambio dinámico y la distribución territorial decidan.',
  ),
  objectives: [
    l(
      '用三个问题（分布、PR 段、对应性压低）区分心包炎与 STEMI，并说出支持 STEMI 的五个征象。',
      'Separate pericarditis from STEMI with three questions (distribution, PR segment, reciprocal depression), and list the five signs that favour STEMI.',
      'Separar la pericarditis del IAMCEST con tres preguntas (distribución, segmento PR, descenso recíproco) y enumerar los cinco signos que favorecen el IAMCEST.',
    ),
    l(
      '按顺序说出高钾血症的心电图演进，识别它的假 STEMI 与类 Brugada 图形，并把纠正血钾放在肝素与导管室之前。',
      'Recite the ECG progression of hyperkalaemia, recognise its pseudo-STEMI and Brugada-like patterns, and put potassium correction before heparin and the cath lab.',
      'Enumerar la progresión electrocardiográfica de la hiperpotasemia, reconocer sus patrones de pseudo-IAMCEST y tipo Brugada, y anteponer la corrección del potasio a la heparina y la sala de hemodinámica.',
    ),
    l(
      '用 V1–V2 的穹窿形形态（≥2 mm + T 倒置）诊断 Brugada 1 型，并与 rSr\u2032/不完全性右束支传导阻滞鉴别（β 角、V6 的宽 S 波）。',
      'Diagnose Brugada type 1 from the coved V1–V2 morphology (≥2 mm + negative T) and tell it from rSr\u2032 / incomplete RBBB (β angle, wide S in V6).',
      'Diagnosticar el Brugada tipo 1 por la morfología en cúpula de V1–V2 (≥2 mm + T negativa) y distinguirlo del rSr\u2032 / bloqueo de rama derecho incompleto (ángulo β, S ancha en V6).',
    ),
    l(
      '描述 takotsubo 的急性期与晚期图形及其处置路径（先按 STEMI 处理，造影定论），并用 T/QRS 比例把陈旧室壁瘤与急性抬高分开。',
      'Describe the acute and late ECG phases of takotsubo and its pathway (STEMI management first, angiography decides), and use the T/QRS ratio to separate an old aneurysm from acute elevation.',
      'Describir las fases aguda y tardía del tako-tsubo y su vía (primero manejo como IAMCEST, decide la coronariografía), y usar el cociente T/QRS para separar un aneurisma antiguo de una elevación aguda.',
    ),
  ],
  minutes: 16,
  competencies: ['C8'],
  findings: ['pericarditis', 'early-repolarization', 'brugada-type1', 'hyperkalemia', 'takotsubo', 'lv-aneurysm'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('pericarditis', 1001),
      view: { layout: '3x4+1', highlightLeads: ['II', 'aVR', 'V5'] },
      question: l(
        '32 岁男性，尖锐胸痛 2 天，卧位与吸气时加重。多数导联 ST 抬高：是 STEMI 吗？先想好决定答案的三个问题，再定下你的答案。',
        'A 32-year-old man, two days of sharp chest pain, worse lying down and on inspiration. ST elevation in most leads: is this a STEMI? Name the three questions that decide it, then give your answer.',
        'Un varón de 32 años, dos días de dolor torácico punzante, peor en decúbito y con la inspiración. Elevación del ST en la mayoría de las derivaciones: ¿es un IAMCEST? Plantea las tres preguntas que lo deciden y después decide tu respuesta.',
      ),
      reveal: l(
        '三问：**分布**——抬高凹面向上，同时覆盖多个供血区（V2–V6 加肢体导联），不对应任何一支冠脉；**PR 段**——II、V4–V6 压低而 aVR 抬高（心房损伤电流的镜像）；**对应性压低**——除 aVR（常见于 V1）外没有。三条都指向**急性心包炎**，不是 STEMI。毫米数本身从来不能诊断 STEMI——先走这三问，这正是本课要练的反射。',
        'Three questions: **distribution** — the elevation is concave and covers several territories at once (V2–V6 plus limb leads), matching no single artery; **PR segment** — depressed in II and V4–V6, elevated in aVR (the mirror of an atrial injury current); **reciprocal depression** — none, except in aVR (and often V1). All three point to **acute pericarditis**, not STEMI. Millimetres alone never make a STEMI — run the three questions first, and that reflex is what this lesson trains.',
        'Tres preguntas: **distribución**: la elevación es cóncava y abarca varios territorios a la vez (V2–V6 más derivaciones de las extremidades), sin corresponder a una sola arteria; **segmento PR**: descendido en II y V4–V6, elevado en aVR (el espejo de una corriente de lesión auricular); **descenso recíproco**: ninguno, salvo en aVR (y a menudo V1). Las tres apuntan a **pericarditis aguda**, no a un IAMCEST. Los milímetros por sí solos nunca hacen un IAMCEST: pasa primero las tres preguntas, y ese reflejo es lo que entrena esta lección.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'decision-tree', params: { tree: 'st-elevation' } },
      caption: l(
        '每一份 ST 抬高都走一遍这棵树：先看 QRS（LBBB、起搏、LVH 转到第 I10 课的规则），再看形态与分布。',
        'Walk every ST elevation through this tree: the QRS first (LBBB, pacing and LVH branch to the rules of lesson I10), then the shape and the distribution.',
        'Pasa toda elevación del ST por este árbol: primero el QRS (BRI, marcapasos e HVI van a las reglas de la lección I10), después la forma y la distribución.',
      ),
    },
    {
      kind: 'criteria',
      title: l('STEMI 还是模仿者：鉴别卡', 'STEMI or mimic: the differential card', 'IAMCEST o imitador: la tarjeta diferencial'),
      items: [
        {
          label: l('急性心包炎', 'Acute pericarditis', 'Pericarditis aguda'),
          value: l(
            '广泛、凹面向上抬高；PR 压低伴 aVR PR 抬高；除 aVR/V1 外无对应性压低；无病理性 Q 波；以天–周演变（ST 先回落，T 后倒置）',
            'Widespread concave elevation; PR depression with PR elevation in aVR; no reciprocal depression except aVR/V1; no pathological Q waves; evolves over days to weeks (ST settles before T inverts)',
            'Elevación cóncava difusa; descenso del PR con PR elevado en aVR; sin descenso recíproco salvo aVR/V1; sin ondas Q patológicas; evoluciona en días-semanas (el ST se normaliza antes de que se invierta la T)',
          ),
        },
        {
          label: l('早期复极', 'Early repolarization', 'Repolarización precoz'),
          value: l(
            'J 点切迹或 QRS 终末顿挫（J 点 ≥1 mm，≥2 个相邻下壁/侧壁导联）；凹面抬高，年轻男性常见且与旧图一致；V2–V3 正常上限：男性 <40 岁 <2.5 mm、≥40 岁 <2 mm、女性 <1.5 mm',
            'A J-point notch or terminal QRS slur (J point ≥1 mm in ≥2 contiguous inferior/lateral leads); concave elevation, common in young men and unchanged on old tracings; normal V2–V3 limits: <2.5 mm men <40 y, <2 mm men ≥40 y, <1.5 mm women',
            'Muesca en el punto J o empastamiento terminal del QRS (punto J ≥1 mm en ≥2 derivaciones inferiores/laterales contiguas); elevación cóncava, frecuente en varones jóvenes y sin cambios en trazados antiguos; límites normales en V2–V3: <2,5 mm varones <40 años, <2 mm ≥40 años, <1,5 mm mujeres',
          ),
        },
        {
          label: l('高钾血症', 'Hyperkalaemia', 'Hiperpotasemia'),
          value: l(
            '窄基底、对称的"帐篷"T（V2–V4、II、III 最清楚）→ PR 延长、P 波低平消失 → QRS 增宽（可呈假 STEMI 或类 Brugada）→ 正弦波；心电图与血钾水平相关差——任何改变都是急症',
            'Narrow-based symmetric "tented" T (clearest in V2–V4, II, III) → PR prolongation with P flattening and loss → wide QRS (pseudo-STEMI or Brugada-like) → sine wave; the ECG tracks the serum K poorly — any change is an emergency',
            'T «acampada» simétrica de base estrecha (más clara en V2–V4, II, III) → PR largo con P plana y perdida → QRS ancho (pseudo-IAMCEST o tipo Brugada) → onda sinusoidal; el ECG correlaciona mal con el K sérico: cualquier cambio es una urgencia',
          ),
        },
        {
          label: l('Brugada 1 型', 'Brugada type 1', 'Brugada tipo 1'),
          value: l(
            'V1–V2 穹窿形 ST 抬高 ≥2 mm，下斜进入倒置 T 波（可上移至第 2–4 肋间记录）——唯一具诊断意义的型别；2 型（鞍形）不诊断；发热、高钾血症与钠通道阻滞剂可致表型复制',
            'Coved ST elevation ≥2 mm in V1–V2 descending into a negative T (recorded up to the 2nd–4th intercostal space) — the only diagnostic type; type 2 (saddleback) is not diagnostic; fever, hyperkalaemia and Na-channel blockers cause phenocopies',
            'Elevación del ST en cúpula ≥2 mm en V1–V2 que desciende hacia una T negativa (registrada hasta el 2.º–4.º espacio intercostal): el único tipo diagnóstico; el tipo 2 (en silla de montar) no lo es; fiebre, hiperpotasemia y bloqueantes del canal del Na producen fenocopias',
          ),
        },
        {
          label: l('Brugada 与 V1 的 rSr\u2032', 'Brugada versus rSr\u2032 in V1', 'Brugada frente al rSr\u2032 en V1'),
          value: l(
            'Brugada 的 r\u2032 宽而圆钝（β 角 > 58°）；束支阻滞的 r\u2032 窄而锐利，V6 有配套的宽 S 波（Brugada 无）；rSr\u2032 且 QRS <110 ms 属常见正常变异，不应写成不完全性右束支传导阻滞',
            'The Brugada r\u2032 is broad and rounded (β angle > 58°); the bundle-branch r\u2032 is narrow and sharp with a matching wide S in V6 (absent in Brugada); rSr\u2032 with QRS <110 ms is a common normal variant and should not be labelled incomplete RBBB',
            'La r\u2032 de Brugada es ancha y redondeada (ángulo β > 58°); la r\u2032 del bloqueo de rama es estrecha y afilada, con S ancha en V6 (ausente en Brugada); un rSr\u2032 con QRS <110 ms es una variante normal frecuente y no debe etiquetarse como bloqueo de rama derecho incompleto',
          ),
        },
        {
          label: l('应激性心肌病（Takotsubo）', 'Takotsubo', 'Tako-tsubo'),
          value: l(
            '老年女性 + 情绪或躯体应激；急性期 ST 抬高常超过单一供血区、对应性压低较少；数日后广泛深倒 T + QTc 延长，数周内渐恢复；心电图不能可靠区分 takotsubo 与 STEMI——需冠脉造影',
            'Older woman + emotional or physical stress; acute ST elevation often beyond one coronary territory with less reciprocal depression; days later deep widespread T inversion + QTc prolongation, resolving over weeks; the ECG cannot reliably tell takotsubo from STEMI — coronary angiography is needed',
            'Mujer mayor + estrés emocional o físico; elevación aguda del ST a menudo más allá de un territorio coronario con menos descenso recíproco; días después T negativas profundas y difusas + QTc largo, con resolución en semanas; el ECG no distingue de forma fiable el tako-tsubo del IAMCEST: se necesita coronariografía',
          ),
        },
        {
          label: l('陈旧室壁瘤', 'Old LV aneurysm', 'Aneurisma antiguo del VI'),
          value: l(
            '病理性 Q 波之上 ST 抬高持续 >4–6 周，T 波相对 QRS 小（V1–V4 任一导联 T/QRS 大则支持急性 STEMI）；用旧心电图、肌钙蛋白与超声心动图确认',
            'ST elevation persisting >4–6 weeks over pathological Q waves with a T small relative to the QRS (a large T/QRS in any of V1–V4 favours acute STEMI); confirm with an old ECG, troponin and echocardiography',
            'Elevación del ST persistente >4–6 semanas sobre ondas Q patológicas con una T pequeña respecto al QRS (un cociente T/QRS alto en cualquiera de V1–V4 favorece el IAMCEST agudo); confírmalo con un ECG antiguo, troponina y ecocardiografía',
          ),
        },
        {
          label: l('什么支持 STEMI', 'What favours STEMI', 'Qué favorece el IAMCEST'),
          value: l(
            '对应性压低；系列心电图上的动态演变；按单一供血区分布；QRS 终末部变形；临床风险高',
            'Reciprocal depression; dynamic change on serial ECGs; one-territory distribution; terminal QRS distortion; high clinical risk',
            'Descenso recíproco; cambios dinámicos en ECG seriados; distribución de un solo territorio; distorsión terminal del QRS; riesgo clínico alto',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Adler Y et al. 2015 ESC Guidelines on pericardial diseases. Eur Heart J 2015;36:2921-2964; Ghadri JR et al. InterTAK consensus. Eur Heart J 2018;39:2032-2046; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    },
    {
      kind: 'worked',
      title: l('走一遍 STEMI 核对单：takotsubo 在哪几行失分', 'Run the STEMI checklist: where takotsubo fails it', 'Recorre la lista del IAMCEST: dónde falla el tako-tsubo'),
      ecg: synth('takotsubo', 1002),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('先描述，后诊断', 'Describe first, diagnose later', 'Describe primero, diagnostica después'),
          body: l(
            '71 岁女性，严重情绪应激后 3 小时胸痛。V3–V6（面向心尖与中外侧壁的导联）ST 凹面向上抬高，I、aVL 和 II 也轻度抬高；V1 不抬高，aVR 压低；QRS 完好——R 波保留，无终末部变形。先把这些描述清楚，再去套标准。',
            'A 71-year-old woman, chest pain 3 hours after severe emotional stress. Concave ST elevation in V3–V6 (the leads facing the apex and mid lateral wall), with I, aVL and II slightly up too; V1 is not elevated and aVR is depressed; the QRS is intact — R waves preserved, no terminal distortion. Describe all that first, before you reach for any criteria.',
            'Una mujer de 71 años, dolor torácico 3 horas después de un estrés emocional intenso. Elevación cóncava del ST en V3–V6 (las derivaciones que miran el ápex y la pared lateral media), con I, aVL y II también algo elevadas; V1 no se eleva y aVR está descendida; el QRS está intacto: R conservadas, sin distorsión terminal. Describe todo esto antes de aplicar ningún criterio.',
          ),
          marks: [{ auto: 'st', lead: 'V4' }, { auto: 'st', lead: 'aVR' }],
          highlightLeads: ['V3', 'V4', 'V5', 'V6', 'V1', 'aVR'],
        },
        {
          title: l('核对单第一行：供血区', 'Checklist line 1: territory', 'Primera línea de la lista: territorio'),
          body: l(
            '把抬高的导联按供血区分组：V3–V6 指向 LAD 远段与心尖，I、aVL、II 的轻度抬高又伸向侧壁和下壁——比一支 LAD 分支通常覆盖的范围更广（虽然绕过心尖的长 LAD 也能做到）。同时 V1 不抬高、aVR 压低，这一组合在研究中更常见于 takotsubo。STEMI 的"单一供血区"一行开始失分。',
            'Group the elevated leads by supply: V3–V6 point to the distal LAD and apex, while the slight elevation in I, aVL and II reaches lateral and inferior — wider than one LAD branch usually covers (though a long LAD wrapping the apex can do it). Meanwhile V1 is not elevated and aVR is depressed, a combination that studies find more often in takotsubo. The STEMI line "one coronary territory" starts to fail.',
            'Agrupa las derivaciones con elevación por territorio: V3–V6 apuntan a la DA distal y al ápex, mientras la leve elevación en I, aVL y II llega a las paredes lateral e inferior: más de lo que suele abarcar una rama de la DA (aunque una DA larga que rodea el ápex puede hacerlo). A la vez, V1 no se eleva y aVR está descendida, una combinación que los estudios encuentran más a menudo en el tako-tsubo. La línea del IAMCEST «un solo territorio coronario» empieza a fallar.',
          ),
          marks: [{ auto: 'st', lead: 'V6' }, { auto: 'st', lead: 'II' }],
          highlightLeads: ['I', 'aVL', 'II', 'V5', 'V6'],
        },
        {
          title: l('核对单第二行：对应性', 'Checklist line 2: reciprocity', 'Segunda línea: reciprocidad'),
          body: l(
            '真正的前壁 STEMI 应在 II、III、aVF 出现镜像性压低；这里 III、aVF 接近等电位，II 反而轻度抬高。心尖球形变性的损伤向量指向心尖，缺乏可以产生镜像的"对侧壁"——第二行也失分。但记住：失分只是降低可能性，从不排除闭塞。',
            'A true anterior STEMI should mirror with depression in II, III and aVF; here III and aVF stay nearly isoelectric and II is slightly up, not down. The injury vector of apical ballooning points at the apex, with no "opposite wall" to generate a mirror — the second line fails too. But note: failing lines lower the probability; they never exclude occlusion.',
            'Un IAMCEST anterior verdadero debería espejarse con descenso en II, III y aVF; aquí III y aVF permanecen prácticamente isoeléctricas y II incluso sube un poco. El vector de lesión del ballooning apical apunta al ápex, sin «pared opuesta» que genere el espejo: también falla la segunda línea. Pero recuerda: fallar las líneas baja la probabilidad, nunca excluye la oclusión.',
          ),
          marks: [{ auto: 'st', lead: 'III' }],
          highlightLeads: ['II', 'III', 'aVF'],
        },
        {
          title: l('背景与处置', 'Context and action', 'Contexto y actuación'),
          body: l(
            '老年女性 + 应激 + 胸痛 + 肌钙蛋白升高：takotsubo 进入鉴别，但**心电图不能区分它与 STEMI**——初始处理留在 STEMI 路径，由造影定论（冠脉无梗阻 + 心尖球囊样变）。数日后进入晚期：T 波倒置 + QT 延长（下一图；典型者倒置广泛而深），数周内渐复；最初几天警惕 QT 相关的心律失常。',
            'Older woman + stress + chest pain + rising troponin: takotsubo joins the differential, but **the ECG cannot separate it from STEMI** — initial management stays on the STEMI pathway and angiography decides (unobstructed coronary arteries + apical ballooning). Days later comes the late phase: T inversion + QT prolongation (next tracing; typically the inversion is deep and widespread), resolving over weeks; watch for QT-driven arrhythmias in the first days.',
            'Mujer mayor + estrés + dolor torácico + troponina en ascenso: el tako-tsubo entra en el diferencial, pero **el ECG no puede separarlo del IAMCEST**; el manejo inicial sigue la vía del IAMCEST y la coronariografía decide (coronarias sin obstrucciones + ballooning apical). Días después llega la fase tardía: T negativas + QT largo (siguiente trazado; lo típico es una inversión profunda y difusa), con resolución en semanas; vigila las arritmias ligadas al QT en los primeros días.',
          ),
        },
      ],
    },
    {
      kind: 'film',
      title: l('Takotsubo：同一颗心，几天之后', 'Takotsubo: the same heart, days later', 'Tako-tsubo: el mismo corazón, días después'),
      view: { layout: '3x4+1', highlightLeads: ['V3', 'V4', 'V5', 'V6'] },
      frames: [
        {
          label: l('急性期', 'Acute', 'Fase aguda'),
          ecg: synth('takotsubo', 1002),
          note: l(
            '急性期：V3–V6 抬高（V4 最高，约 3 mm），V1 不抬高，aVR 压低，III、aVF 接近等电位。',
            'Acute: V3–V6 up (most in V4, about 3 mm), V1 not up, aVR down, III and aVF close to flat.',
            'Fase aguda: V3–V6 elevadas (máxima en V4, unos 3 mm), V1 sin elevar, aVR descendida, III y aVF casi isoeléctricas.',
          ),
          marks: [{ auto: 'j', lead: 'V4' }, { auto: 'j', lead: 'aVR' }],
        },
        {
          label: l('几天后', 'Days later', 'Días después'),
          ecg: synth('takotsubo', 1002, undefined, 'late'),
          note: l(
            '同一颗心，几天后：抬高消失；V3–V6 和 I 的 T 波深倒（V4–V5 约 11 mm），QT 约 480 ms。数周内恢复。',
            'Same heart, days later: the elevation has gone; deep T inversion in V3–V6 and I (about 11 mm in V4–V5), QT about 480 ms. It recovers over weeks.',
            'El mismo corazón, días después: la elevación ha desaparecido; T negativas profundas en V3–V6 e I (unos 11 mm en V4–V5), QT de unos 480 ms. Se recupera en semanas.',
          ),
          marks: [{ auto: 't', lead: 'V5' }, { auto: 'qt', lead: 'V5' }],
        },
      ],
      predict: {
        question: l(
          '几天后抬高消失。T 波倒置最深会在哪里？',
          'Days later the elevation has gone. Where will the T waves be inverted most deeply?',
          'Días después la elevación ha desaparecido. ¿Dónde serán más profundas las T negativas?',
        ),
        options: [l('V4–V5', 'V4–V5', 'V4–V5'), l('III 和 aVF', 'III and aVF', 'III y aVF'), l('V1–V2', 'V1–V2', 'V1–V2')],
        answer: 0,
      },
      caption: l(
        '心电图不能区分 takotsubo 与 STEMI：先走 STEMI 路径，由造影定论。最初几天警惕与长 QT 相关的心律失常。',
        'The ECG cannot tell takotsubo from a STEMI: start on the STEMI pathway and let angiography decide. In the first days, watch for arrhythmias of the long QT.',
        'El ECG no distingue el tako-tsubo de un IAMCEST: empieza por la vía del IAMCEST y deja que decida la coronariografía. En los primeros días, vigila las arritmias del QT largo.',
      ),
    },
    {
      kind: 'film',
      title: l('模仿者阶梯', 'The mimic ladder', 'La escalera de imitadores'),
      view: { layout: '3x4+1' },
      frames: [
        {
          label: l('心包炎', 'Pericarditis', 'Pericarditis'),
          ecg: synth('pericarditis', 1001),
          note: l(
            '开头那份图：凹面抬高跨过多个供血区，II 的 PR 压低、aVR 的 PR 抬高，除 aVR 外没有镜像压低。',
            'The opening tracing: concave elevation across several territories, PR down in II and up in aVR, no mirror except in aVR.',
            'El trazado inicial: elevación cóncava en varios territorios, PR descendido en II y elevado en aVR, sin espejo salvo en aVR.',
          ),
          marks: [{ auto: 'pr-segment', lead: 'II' }, { auto: 'pr-segment', lead: 'aVR' }],
        },
        {
          label: l('早期复极', 'Early repolarisation', 'Repolarización precoz'),
          ecg: synth('early-repolarization', 1004),
          note: l(
            'J 点带切迹，V1–V6 和 II、III、aVF 凹面抬高（下壁 1–2 mm），除 aVR 外没有镜像：无症状年轻人的变异。',
            'Notched J, concave elevation in V1–V6 and II, III, aVF (1–2 mm inferiorly), no mirror except aVR: a variant in a young, pain-free man.',
            'J con muesca, elevación cóncava en V1–V6 y II, III, aVF (1–2 mm en las inferiores), sin espejo salvo aVR: una variante en un joven sin dolor.',
          ),
          marks: [{ auto: 'j', lead: 'II' }, { auto: 'j', lead: 'V3' }],
        },
        {
          label: l('Brugada 1 型', 'Brugada type 1', 'Brugada tipo 1'),
          ecg: synth('brugada-type1', 1005),
          note: l(
            'V1–V2 穹窿形抬高 ≥ 2 mm，下斜进入倒置 T，V3 正常：通道病。危险在心律（猝死），要转诊评估，不是抗栓。',
            'Coved elevation ≥ 2 mm in V1–V2 sliding into a negative T, V3 normal: a channelopathy. The danger is the rhythm (sudden death): refer, no antithrombotics.',
            'Elevación en cúpula ≥ 2 mm en V1–V2 que cae a una T negativa, V3 normal: una canalopatía. El peligro es el ritmo (muerte súbita): deriva, sin antitrombóticos.',
          ),
          marks: [{ auto: 'j', lead: 'V1' }, { auto: 't', lead: 'V1' }],
        },
        {
          label: l('高钾血症', 'Hyperkalaemia', 'Hiperpotasemia'),
          ecg: synth('hyperkalemia', 1006),
          note: l(
            'V3–V5 窄基底的帐篷 T（V4 的 T 比 R 高），PR ≥ 200 ms，QRS 在上限附近：先查血钾。',
            'Narrow, tented T in V3–V5 (in V4 taller than the R), PR ≥ 200 ms, QRS near the upper limit: check the potassium first.',
            'T estrecha y picuda en V3–V5 (en V4 más alta que la R), PR ≥ 200 ms, QRS cerca del límite: pide primero la potasemia.',
          ),
          marks: [{ auto: 't', lead: 'V4' }, { auto: 'pr', lead: 'II' }],
        },
        {
          label: l('重度高钾', 'Severe hyperkalaemia', 'Hiperpotasemia grave'),
          ecg: synth('hyperkalemia-severe', 1007),
          note: l(
            'P 波消失，QRS 宽过 150 ms 并与 T 波融合：很像“大面积 STEMI”。先用钙剂、降钾，再谈导管室。',
            'No P waves, a QRS over 150 ms merging into the T: it can pass for a "huge STEMI". Calcium and potassium-lowering come before any cath lab.',
            'Sin ondas P, QRS de más de 150 ms fundido con la T: puede pasar por un «IAMCEST enorme». Calcio y bajar el potasio antes que la hemodinámica.',
          ),
          marks: [{ auto: 'qrs', lead: 'V2' }],
        },
        {
          label: l('陈旧室壁瘤', 'Old aneurysm', 'Aneurisma antiguo'),
          ecg: synth('lv-aneurysm', 1008),
          note: l(
            'V2–V3 有宽 Q 波，其上 ST 仍抬高，但 V1–V4 的 T 波相对 QRS 都很小：陈旧室壁瘤，不是新事件。',
            'Wide Q waves in V2–V3 with the ST still up, but T waves small for their QRS in V1–V4: an old aneurysm, not a new event.',
            'Ondas Q anchas en V2–V3 con el ST aún elevado, pero T pequeñas para su QRS en V1–V4: un aneurisma antiguo, no un evento nuevo.',
          ),
          marks: [{ auto: 'q', lead: 'V2' }, { auto: 't', lead: 'V2' }],
        },
      ],
      caption: l(
        '六份图都可能被当成闭塞，没有一份是急性闭塞。每一份先问三件事：分布、PR 段、对应性压低。',
        'Six tracings that can pass for an occlusion; none of them is one. For each, ask three things: distribution, PR segment, reciprocal depression.',
        'Seis trazados que pueden pasar por una oclusión y ninguno lo es. En cada uno, pregunta tres cosas: distribución, segmento PR y descenso recíproco.',
      ),
    },
    {
      kind: 'contrast',
      title: l('三个问题分开心包炎与前壁 STEMI', 'Three questions separate pericarditis from anterior STEMI', 'Tres preguntas separan la pericarditis del IAMCEST anterior'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('pericarditis', 1009),
        caption: l(
          'A：32 岁男性，胸痛随卧位与吸气加重',
          'A: man, 32, pain worse lying down and on inspiration',
          'A: varón de 32 años, dolor peor en decúbito y con la inspiración',
        ),
        marks: [{ auto: 'pr-segment', lead: 'II' }, { auto: 'pr-segment', lead: 'aVR' }],
      },
      right: {
        ecg: synth('stemi-anterior', 1010),
        caption: l(
          'B：58 岁男性，压榨性胸痛 40 分钟',
          'B: man, 58, 40 minutes of crushing chest pain',
          'B: varón de 58 años, 40 minutos de dolor torácico opresivo',
        ),
        marks: [{ auto: 'st', lead: 'V3' }, { auto: 'st', lead: 'III' }],
      },
      point: l(
        '**分布**：A 的抬高凹面向上、遍布多个供血区；B 的抬高锁定 V1–V4，一个 LAD 供血区。**PR 段**：A 在 II 压低、aVR 抬高（心房损伤）；B 的 PR 正常。再看对应性：A 除 aVR/V1 外没有镜像压低，B 在 II、III、aVF 有真正的**对应性压低**。三个问题、两条路径：A 用抗炎治疗（阿司匹林/NSAID + 秋水仙碱），B 进导管室。',
        '**Distribution**: in A the elevation is concave and spread across several territories; in B it is locked to V1–V4, one LAD territory. **PR segment**: A shows depression in II and elevation in aVR (atrial injury); the PR in B is normal. Then reciprocity: A has no mirror depression outside aVR/V1, while B shows true **reciprocal depression** in II, III and aVF. Three questions, two pathways: A gets anti-inflammatory treatment (aspirin/NSAID + colchicine), B goes to the cath lab.',
        '**Distribución**: en A la elevación es cóncava y repartida por varios territorios; en B está acotada a V1–V4, un territorio de la DA. **Segmento PR**: A muestra descenso en II y elevación en aVR (lesión auricular); el PR de B es normal. Y la reciprocidad: A no tiene descenso especular fuera de aVR/V1, mientras B muestra **descenso recíproco** verdadero en II, III y aVF. Tres preguntas, dos vías: A recibe tratamiento antiinflamatorio (ácido acetilsalicílico/AINE + colchicina) y B va a la sala de hemodinámica.',
      ),
    },
    { kind: 'check', item: { family: 'occlusion', seed: 24 } },
    { kind: 'check', item: { family: 'occlusion', seed: 13 } },
    { kind: 'check', item: { family: 'occlusion', seed: 10 } },
    { kind: 'drill', families: ['occlusion', 'compare-occlusion'], count: 10, passScore: 0.85 },
    {
      kind: 'real',
      ids: [8624, 16899, 5469],
      caption: l(
        '三份真实心电图：62 岁女性（陈旧室壁瘤图形）、67 岁女性（侧壁 T 波浅倒或低平）、39 岁男性（轻微 ST 抬高）。每份先想好判读再揭晓——走三问（分布、PR 段、对应性），再量 T/QRS 比例、看 T 波的宽窄。',
        'Three real tracings: a 62-year-old woman (an old aneurysm pattern), a 67-year-old woman (shallow lateral T inversion or flattening) and a 39-year-old man (subtle ST elevation). Commit on each before the reveal — run the three questions (distribution, PR segment, reciprocity), then the T/QRS proportion and the width of the T.',
        'Tres ECG reales: una mujer de 62 años (patrón de aneurisma antiguo), una mujer de 67 (T lateral poco negativa o aplanada) y un varón de 39 (elevación sutil del ST). Decide en cada uno antes de la solución: pasa las tres preguntas (distribución, segmento PR, reciprocidad), después el cociente T/QRS y la anchura de la T.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '为高钾血症激活导管室：宽 QRS"大面积抬高"里藏着窄基底帐篷 T——先查血钾！钙剂与降钾在肝素之前。',
          'Activating the cath lab for hyperkalaemia: a narrow-based tented T hides inside that "massive" wide-QRS elevation — check the potassium first! Calcium and potassium lowering come before heparin.',
          'Activar la sala de hemodinámica por una hiperpotasemia: una T acampada de base estrecha se esconde en esa elevación «masiva» con QRS ancho; ¡comprueba primero el potasio! El calcio y el descenso del K van antes que la heparina.',
        ),
        l(
          '把心包炎写成"广泛 STEMI"：抬高不按供血区、有 PR 压低（aVR 抬高）、除 aVR/V1 外无对应性压低——三条都在说"不是梗死"。',
          'Writing pericarditis up as a "diffuse STEMI": the elevation follows no territory, there is PR depression (elevation in aVR) and no reciprocal depression outside aVR/V1 — all three lines say "not an infarct".',
          'Escribir «IAMCEST difuso» ante una pericarditis: la elevación no sigue ningún territorio, hay descenso del PR (elevación en aVR) y no hay descenso recíproco fuera de aVR/V1: las tres líneas dicen «no es un infarto».',
        ),
        l(
          '把 Brugada 写成"不完全性右束支传导阻滞 + 损伤"：穹窿形 ≥2 mm 下斜进倒置 T 是 1 型；r\u2032 宽而圆钝（β 角 > 58°）、V6 无配套宽 S 波——它与 rSr\u2032 不是一回事。',
          'Calling Brugada "incomplete RBBB plus injury": coved ≥2 mm descending into a negative T is type 1; the r\u2032 is broad and rounded (β angle > 58°) with no matching wide S in V6 — it is not the same animal as rSr\u2032.',
          'Llamar al Brugada «bloqueo de rama derecho incompleto con lesión»: la cúpula ≥2 mm que desciende hacia una T negativa es el tipo 1; la r\u2032 es ancha y redondeada (ángulo β > 58°) sin S ancha en V6: no es lo mismo que un rSr\u2032.',
        ),
        l(
          '老年女性的 takotsubo 直接写"前壁 STEMI，完事"：初始处理确实按 STEMI 走，但造影常显示冠脉干净——心电图无法区分二者；别忘了后期的深倒 T 与长 QT。',
          'Writing "anterior STEMI, done" for takotsubo in an older woman: the initial management is indeed the STEMI pathway, but the angiogram often shows clean arteries — the ECG cannot tell the two apart; and do not forget the later deep T inversion with a long QT.',
          'Escribir «IAMCEST anterior, asunto cerrado» ante un tako-tsubo en una mujer mayor: el manejo inicial es efectivamente el del IAMCEST, pero la coronariografía suele mostrar arterias limpias; el ECG no distingue ambos, y no olvides las T negativas profundas y el QT largo de la fase tardía.',
        ),
        l(
          '过度信任有危险因素者的"早期复极"：早期复极属于年轻人、无疼痛、与旧图一致；新发抬高 + 胸痛 ⇒ 按闭塞处理，做系列心电图，别让标签代替判读。',
          'Over-trusting "early repolarization" in a patient with risk factors: early repolarization belongs to the young, the pain-free and the unchanged-on-old-tracings; new elevation + chest pain ⇒ manage as occlusion and take serial ECGs — do not let a label do the reading.',
          'Confiar demasiado en la «repolarización precoz» de un paciente con factores de riesgo: la repolarización precoz es de jóvenes, sin dolor e igual en trazados antiguos; elevación nueva + dolor torácico ⇒ manéjalo como oclusión y haz ECG seriados: no dejes que una etiqueta lea por ti.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'ST 抬高不等于 STEMI。先问三个问题：分布是否限于一个供血区、PR 段有无压低（aVR 抬高）、有无对应性压低。',
          'ST elevation is not STEMI. Ask three questions first: is the distribution limited to one territory, is the PR segment depressed (elevated in aVR), is there reciprocal depression?',
          'La elevación del ST no es un IAMCEST. Haz primero tres preguntas: ¿la distribución se limita a un territorio, hay descenso del PR (elevado en aVR), hay descenso recíproco?',
        ),
        l(
          '支持 STEMI 的五条：对应性压低、动态演变、单一供血区分布、QRS 终末部变形、临床风险高。',
          'Five signs favour STEMI: reciprocal depression, dynamic evolution, one-territory distribution, terminal QRS distortion, high clinical risk.',
          'Cinco signos favorecen el IAMCEST: descenso recíproco, evolución dinámica, distribución de un solo territorio, distorsión terminal del QRS y riesgo clínico alto.',
        ),
        l(
          '心包炎：广泛凹面抬高 + PR 压低（aVR 抬高）+ 除 aVR/V1 外无对应性压低，以天–周演变；处理是抗炎，不是再灌注。',
          'Pericarditis: widespread concave elevation + PR depression (elevation in aVR) + no reciprocal depression outside aVR/V1, evolving over days to weeks; treatment is anti-inflammatory, not reperfusion.',
          'Pericarditis: elevación cóncava difusa + descenso del PR (elevado en aVR) + sin descenso recíproco fuera de aVR/V1, con evolución en días-semanas; el tratamiento es antiinflamatorio, no de reperfusión.',
        ),
        l(
          '高钾血症是"治疗用错最贵"的模仿者：窄基底帐篷 T → P 消失 → 宽 QRS（假 STEMI/类 Brugada）→ 正弦波。先查钾、先治钾，再考虑导管室。',
          'Hyperkalaemia is the mimic with the costliest wrong treatment: narrow-based tented T → P loss → wide QRS (pseudo-STEMI / Brugada-like) → sine wave. Check and treat the potassium before any cath lab.',
          'La hiperpotasemia es el imitador cuyo tratamiento equivocado más cuesta: T acampada de base estrecha → pérdida de la P → QRS ancho (pseudo-IAMCEST / tipo Brugada) → onda sinusoidal. Comprueba y trata el potasio antes que cualquier sala de hemodinámica.',
        ),
        l(
          'Takotsubo 的抬高超过单一供血区、对应性压低少，但心电图不能与 STEMI 区分——先按 STEMI 处理、造影定论；陈旧室壁瘤靠 T/QRS 比例（T 小 ⇒ 陈旧）加旧图与肌钙蛋白。',
          'Takotsubo elevates beyond one territory with little reciprocity, yet the ECG cannot separate it from STEMI — manage as STEMI first and let angiography decide; an old aneurysm is read with the T/QRS ratio (a small T means old) plus old tracings and troponin.',
          'El tako-tsubo eleva más allá de un territorio con poca reciprocidad, pero el ECG no lo separa del IAMCEST: manéjalo primero como IAMCEST y que decida la coronariografía; el aneurisma antiguo se lee con el cociente T/QRS (una T pequeña significa antiguo) más los trazados viejos y la troponina.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Adler Y et al. 2015 ESC Guidelines on pericardial diseases. Eur Heart J 2015;36:2921-2964',
    'Ghadri JR et al. InterTAK consensus. Eur Heart J 2018;39:2032-2046',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Castellano et al. 2004',
  ],
};

export default lesson;
