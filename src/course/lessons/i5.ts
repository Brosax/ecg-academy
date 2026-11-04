/**
 * i5 — Lateral and high lateral infarction (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `mi-territories`, `reciprocal-changes` and the "Missing in the book" bullet
 * "First diagonal (D1) occlusion" (ST elevation I/aVL/V2 with ST depression in III — the 'South African flag' pattern).
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
  id: 'i5',
  stage: 'I',
  order: 5,
  title: l('侧壁与高侧壁梗死', 'Lateral and high lateral infarction', 'Infarto lateral y lateral alto'),
  summary: l(
    '侧壁 STEMI 抬高的幅度往往只有 1–2 mm，却来自回旋支或第一对角支的完全闭塞：I、aVL 是高侧壁，V5–V6 是低侧壁，二者相加是整个侧壁；侧壁抬高再加上 V3–V4 就是前侧壁（LAD 与粗大对角支）。本课练习识别这套“小振幅、大闭塞”的图形，包括第一对角支的“南非国旗”征。',
    'Lateral STEMIs often elevate by only 1–2 mm, yet they come from a complete occlusion of the LCx or the first diagonal: I and aVL are the high lateral wall, V5–V6 the low lateral wall, the two together are the whole lateral wall, and lateral elevation plus V3–V4 is the anterolateral territory (the LAD with a large diagonal). This lesson drills this family of "small amplitude, big occlusion" patterns, including the first-diagonal "South African flag" sign.',
    'Los IAMCEST laterales a menudo elevan solo 1-2 mm y, sin embargo, proceden de una oclusión completa de la circunfleja o de la primera diagonal: I y aVL son la pared lateral alta, V5-V6 la lateral baja, ambas juntas son toda la pared lateral, y la elevación lateral más V3-V4 es el territorio anterolateral (la DA con una diagonal grande). Esta lección entrena esta familia de patrones de «amplitud pequeña, oclusión grande», incluido el signo de la «bandera sudafricana» de la primera diagonal.',
  ),
  objectives: [
    l(
      '区分低侧壁（V5–V6）、高侧壁（I、aVL）与前侧壁（V3–V6 + I/aVL）图形，并为每一型命名罪犯血管。',
      'Separate low lateral (V5–V6), high lateral (I, aVL) and anterolateral (V3–V6 + I/aVL) patterns, and name the culprit artery for each.',
      'Distinguir los patrones lateral bajo (V5-V6), lateral alto (I, aVL) y anterolateral (V3-V6 + I/aVL), y nombrar la arteria responsable de cada uno.',
    ),
    l(
      '在 I、aVL 应用 1 mm 的 UDMI 阈值，并解释侧壁 STEMI 为什么容易被漏诊。',
      'Apply the 1 mm UDMI threshold in I and aVL, and explain why lateral STEMIs get missed.',
      'Aplicar el umbral de 1 mm de la definición universal en I y aVL y explicar por qué se pasan por alto los IAMCEST laterales.',
    ),
    l(
      '认出第一对角支（D1）闭塞图形：I、aVL、V2 抬高伴 III 导联对应性压低（“南非国旗”征）。',
      'Recognise the first diagonal (D1) occlusion pattern: elevation in I, aVL and V2 with reciprocal depression in III (the "South African flag" sign).',
      'Reconocer el patrón de oclusión de la primera diagonal (D1): elevación en I, aVL y V2 con descenso recíproco en III (signo de la «bandera sudafricana»).',
    ),
    l(
      '把 II、III、aVF 的 ST 压低读作侧壁损伤的镜像，而不是原发缺血事件。',
      'Read ST depression in II, III and aVF as the mirror of a lateral injury, not as the primary event.',
      'Interpretar el descenso del ST en II, III y aVF como la imagen especular de una lesión lateral, no como el evento primario.',
    ),
  ],
  minutes: 14,
  competencies: ['C8'],
  findings: ['stemi-lateral', 'stemi-high-lateral', 'stemi-anterolateral'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-high-lateral', 881),
      view: { layout: '3x4+1' },
      question: l(
        '胸痛 40 分钟。I 和 aVL 的 ST 抬高不过 1–2 mm，V1–V2 抬高约 1.5 mm（V3 约 1 mm，V4 不到 1 mm），V5–V6 平坦，III 压低约 3 mm：这是“小区域”，还是一次即将被漏掉的闭塞？想好你的判断和罪犯血管。',
        'Chest pain for 40 minutes. The ST elevation in I and aVL is only 1–2 mm, V1–V2 rise by about 1.5 mm (V3 about 1 mm, V4 under 1 mm), V5–V6 are flat, and III is depressed by about 3 mm: a tiny territory, or an occlusion about to be missed? Commit to a reading and a culprit artery.',
        'Dolor torácico de 40 minutos. La elevación del ST en I y aVL es de apenas 1-2 mm, V1-V2 suben unos 1,5 mm (V3 alrededor de 1 mm, V4 menos de 1 mm), V5-V6 están planas y III desciende unos 3 mm: ¿un territorio diminuto o una oclusión a punto de pasarse por alto? Decide tu lectura y la arteria responsable.',
      ),
      reveal: l(
        '这是**高侧壁 STEMI**：I、aVL 直接面向侧壁的上部。I、aVL 的阈值只有 **1 mm**（V2–V3 那套 2/2.5/1.5 mm 的性别年龄规则在这里不适用），所以振幅小绝不等于危险小。再看 III（± II、aVF）：那里约 3 mm 的 ST **压低**正是这股损伤电流的镜像——它支持闭塞，而不是另一个诊断。V2 也抬高（与 V1 相当），往 V3–V4 逐渐减小，V5–V6 平坦：罪犯血管是**第一对角支（D1，发自 LAD）**——这正是下文的“南非国旗”征；若 V2 不抬高，近段 LCx/钝缘支也有可能。',
        'This is a **high lateral STEMI**: I and aVL face the upper part of the lateral wall. The threshold in I and aVL is only **1 mm** (the 2/2.5/1.5 mm sex-and-age rules of V2–V3 do not apply here), so a small amplitude never means a small risk. Now look at III (± II, aVF): the ST **depression** of about 3 mm there is the mirror of the same injury current — it supports the occlusion, it is not a second diagnosis. V2 is elevated too (as much as V1), fading through V3–V4, while V5–V6 stay flat: the culprit is the **first diagonal branch (D1, from the LAD)** — the "South African flag" you will meet below; without V2, a proximal LCx / obtuse marginal would remain possible.',
        'Es un **IAMCEST lateral alto**: I y aVL miran a la parte alta de la pared lateral. El umbral en I y aVL es de solo **1 mm** (las reglas de 2/2,5/1,5 mm por sexo y edad de V2-V3 no se aplican aquí), de modo que una amplitud pequeña nunca significa un riesgo pequeño. Mira ahora III (± II, aVF): el **descenso** del ST de unos 3 mm ahí es la imagen especular de la misma corriente de lesión; apoya la oclusión, no es un segundo diagnóstico. V2 también se eleva (tanto como V1) y la elevación se va apagando en V3-V4, mientras V5-V6 siguen planas: la arteria responsable es la **primera diagonal (D1, de la DA)**, la «bandera sudafricana» que verás más abajo; sin V2, seguiría siendo posible una Cx proximal / marginal obtusa.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('stemi-lateral', 882),
      emphasize: ['lv-basal-anterolateral', 'lv-mid-anterolateral', 'lv-apical-lateral', 'lv-mid-inferolateral', 'lv-basal-inferolateral'],
      caption: l(
        '播放一个心动周期：侧壁节段亮起，回旋支绕过它们。V5–V6 从左侧、I 和 aVL 从左上方看这面墙；方向相反的 aVR、V1–V2 和 III 被**压低**。',
        'Play one beat: the lateral segments light up, with the LCx running around them. V5–V6 face this wall from the left, I and aVL from the upper left; aVR, V1–V2 and III look away and are **depressed**.',
        'Reproduce un latido: se iluminan los segmentos laterales, rodeados por la Cx. V5–V6 miran a esa pared desde la izquierda, I y aVL desde arriba a la izquierda; aVR, V1–V2 y III miran al lado contrario y quedan **descendidas**.',
      ),
    },
    {
      kind: 'live',
      scenario: 'stemi-high-lateral',
      seed: 881,
      dials: [{ id: 'st' }],
      view: { layout: '3x4+1' },
      marks: [{ auto: 'j', lead: 'I' }, { auto: 'j', lead: 'aVL' }, { auto: 'j', lead: 'III' }],
      play: {
        dial: 'st',
        from: 0.15,
        to: 0.28,
        notes: [
          {
            min: 0.15,
            max: 0.21,
            text: l(
              'J点：aVL 已过 1 mm，I 还不到；III 压低得比 aVL 抬高得还深。镜像比主犯更显眼。',
              'At J: aVL over 1 mm, I not yet; III is already deeper than aVL is high. The mirror is louder than the culprit.',
              'En J: aVL por encima de 1 mm, I todavía no; III ya baja más de lo que sube aVL. El espejo grita más que la culpable.',
            ),
          },
          {
            min: 0.22,
            max: 0.28,
            text: l(
              'I 和 aVL 都 ≥ 1 mm：两个相邻导联，高侧壁 STEMI。III 仍是最大的偏移，但它只是镜像。',
              'I and aVL both ≥ 1 mm: two contiguous leads, a high-lateral STEMI. III is still the biggest deflection, and still only the mirror.',
              'I y aVL ambas ≥ 1 mm: dos derivaciones contiguas, un IAMCEST lateral alto. III sigue siendo la mayor desviación y sigue siendo solo el espejo.',
            ),
          },
        ],
      },
      predict: {
        question: l('损伤电流变大时，哪个动得更多：aVL 的抬高，还是 III 的压低？', 'As the injury current grows, which moves more: aVL up or III down?', 'Al crecer la corriente de lesión, ¿qué se mueve más: aVL hacia arriba o III hacia abajo?'),
        options: [l('III 向下', 'III down', 'III hacia abajo'), l('aVL 向上', 'aVL up', 'aVL hacia arriba'), l('一样多', 'The same', 'Lo mismo')],
        answer: 0,
      },
      caption: l(
        '开头那份图，加一个损伤电流旋钮。在 I 和 aVL，**1 mm 就够**；III 的镜像总是动得更多。',
        'The opening tracing with an injury dial. In I and aVL **1 mm is enough**; the mirror in III always moves more.',
        'El trazado inicial con un mando de lesión. En I y aVL **basta con 1 mm**; el espejo de III siempre se mueve más.',
      ),
    },
    {
      kind: 'criteria',
      title: l('侧壁定位与阈值', 'Lateral localisation and thresholds', 'Localización lateral y umbrales'),
      items: [
        {
          label: l('低侧壁', 'Low lateral', 'Lateral bajo'),
          value: l('V5–V6（± I/aVL）→ LCx / 钝缘支', 'V5–V6 (± I/aVL) → LCx / obtuse marginal', 'V5-V6 (± I/aVL) → Cx / marginal obtusa'),
        },
        {
          label: l('高侧壁', 'High lateral', 'Lateral alto'),
          value: l('I、aVL → D1（第一对角支）或近段 LCx/OM', 'I, aVL → D1 (first diagonal) or proximal LCx/OM', 'I, aVL → D1 (primera diagonal) o Cx/MO proximal'),
        },
        {
          label: l('前侧壁', 'Anterolateral', 'Anterolateral'),
          value: l('V3–V6 + I/aVL → LAD（粗大对角支之前）', 'V3–V6 + I/aVL → LAD (before a large diagonal)', 'V3-V6 + I/aVL → DA (antes de una diagonal grande)'),
        },
        {
          label: l('I/aVL 的诊断阈值', 'Diagnostic threshold in I/aVL', 'Umbral diagnóstico en I/aVL'),
          value: l(
            'ST 抬高 ≥ 1 mm（男女相同；V2–V3 的 2/2.5/1.5 mm 规则不适用于肢体导联）',
            'ST elevation ≥ 1 mm (same for both sexes; the 2/2.5/1.5 mm rules of V2–V3 do not apply to limb leads)',
            'Elevación del ST ≥ 1 mm (igual en ambos sexos; las reglas de 2/2,5/1,5 mm de V2-V3 no se aplican a las derivaciones del plano frontal)',
          ),
        },
        {
          label: l('侧壁 STEMI 的镜像', 'Mirror of a lateral STEMI', 'Imagen especular del IAMCEST lateral'),
          value: l(
            'II、III、aVF 对应性 ST 压低（下壁 STEMI 则相反：I、aVL 压低）',
            'Reciprocal ST depression in II, III, aVF (the reverse of an inferior STEMI, which depresses I and aVL)',
            'Descenso recíproco del ST en II, III, aVF (lo contrario del IAMCEST inferior, que desciende I y aVL)',
          ),
        },
        {
          label: l('D1 闭塞（“南非国旗”征）', 'D1 occlusion ("South African flag")', 'Oclusión de D1 («bandera sudafricana»)'),
          value: l(
            'ST↑ I、aVL、V2 伴 ST↓ III（± II、aVF），V3–V6 相对不受累 ⇒ 中前壁/高侧壁，D1 或近段 LAD 病变',
            'ST elevation I, aVL, V2 with ST depression in III (± II, aVF), V3–V6 relatively spared ⇒ mid-anterior / high lateral, D1 or proximal LAD lesion',
            'Elevación del ST en I, aVL y V2 con descenso en III (± II, aVF), V3-V6 relativamente respetadas ⇒ anteromedio / lateral alto, lesión de D1 o DA proximal',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826; Bayés de Luna A et al. Circulation 2006;114:1755-1760',
    },
    {
      kind: 'worked',
      title: l('侧壁 STEMI：四步走', 'A lateral STEMI in four steps', 'Un IAMCEST lateral en cuatro pasos'),
      ecg: synth('stemi-lateral', 883),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('扫全部导联找抬高', 'Sweep all leads for elevation', 'Recorre todas las derivaciones buscando elevación'),
          body: l(
            'V5、V6 的 J 点最高（约 1.5–2 mm），I、aVL 也抬高（约 1 mm）——振幅都不大，但方向一致。先在 J 点测量，不要量到 ST 段中段。',
            'The J point is highest in V5 and V6 (about 1.5–2 mm), and I and aVL are up too (about 1 mm) — modest amplitudes, but all in the same direction. Measure at the J point, not mid-ST.',
            'El punto J es más alto en V5 y V6 (unos 1,5-2 mm), y I y aVL también están elevadas (alrededor de 1 mm): amplitudes modestas, pero todas en la misma dirección. Mide en el punto J, no en mitad del ST.',
          ),
          marks: [{ auto: 'j', lead: 'V6' }],
          highlightLeads: ['V5', 'V6', 'I', 'aVL'],
        },
        {
          title: l('分组成相邻导联', 'Group into contiguous leads', 'Agrupa en derivaciones contiguas'),
          body: l(
            'I、aVL、V5、V6 是一组连续的侧壁导联：V5、V6 两个相邻导联 ≥ 1 mm 已达标，I、aVL 约 1 mm 也达标——**侧壁 STEMI**（低侧壁为主，高侧壁一同加入）。V1–V3 不抬高（反而压低），所以不是前侧壁。',
            'I, aVL, V5 and V6 form one contiguous lateral group: V5 and V6, two contiguous leads ≥ 1 mm, already meet the criterion, and so do I and aVL at about 1 mm — a **lateral STEMI** (mainly low lateral, with the high lateral leads joining in). V1–V3 are not elevated (they are depressed), so it is not anterolateral.',
            'I, aVL, V5 y V6 forman un grupo lateral contiguo: V5 y V6, dos derivaciones contiguas ≥ 1 mm, ya cumplen el criterio, y también I y aVL con alrededor de 1 mm: **IAMCEST lateral** (sobre todo lateral bajo, con las laterales altas sumándose). V1-V3 no se elevan (están descendidas), así que no es anterolateral.',
          ),
          highlightLeads: ['I', 'aVL', 'V5', 'V6', 'V1', 'V2', 'V3', 'V4'],
        },
        {
          title: l('找镜像', 'Find the mirror', 'Busca la imagen especular'),
          body: l(
            '镜像在哪里？III 压低约 1 mm（aVF 约 0.5 mm，II 不压低），V1–V2 和 aVR 也压低（约 0.5–1 mm）。侧壁的损伤向量指向左方并略偏后，背离 III，也背离 V1–V2 与 aVR，所以镜像落在这两处。找到镜像支持这是闭塞（而非良性变异）。',
            'Where is the mirror? III is depressed by about 1 mm (aVF about 0.5 mm, II not at all), and V1–V2 and aVR are depressed too (about 0.5–1 mm). The lateral injury vector points left and slightly back, away from III and from V1–V2 and aVR, so the mirror lands in both places. Finding the mirror supports occlusion over a benign variant.',
            '¿Dónde está el espejo? III desciende alrededor de 1 mm (aVF unos 0,5 mm, II nada), y V1-V2 y aVR también descienden (unos 0,5-1 mm). El vector de lesión lateral apunta a la izquierda y algo hacia atrás, lejos de III y lejos de V1-V2 y aVR, así que el espejo aparece en ambos sitios. Encontrar el espejo apoya la oclusión frente a una variante benigna.',
          ),
          marks: [{ auto: 'st', lead: 'V1' }, { auto: 'st', lead: 'III' }],
          highlightLeads: ['V1', 'V2', 'aVR', 'III'],
        },
        {
          title: l('命名罪犯血管并行动', 'Name the culprit and act', 'Nombra la arteria responsable y actúa'),
          body: l(
            '**侧壁 STEMI → LCx / 钝缘支**（若仅 I、aVL 则为 D1 或近段 LCx/OM）。侧壁抬高 ≥ 1 mm 即达标——振幅小不是观望的理由：立即启动再灌注。',
            '**Lateral STEMI → LCx / obtuse marginal** (if only I and aVL are up: D1 or proximal LCx/OM). Elevation ≥ 1 mm meets the bar in these leads — a small amplitude is no reason to wait: activate reperfusion now.',
            '**IAMCEST lateral → Cx / marginal obtusa** (si solo se elevan I y aVL: D1 o Cx/MO proximal). Una elevación ≥ 1 mm ya cumple el umbral en estas derivaciones: una amplitud pequeña no es motivo para esperar; activa la reperfusión.',
          ),
          highlightLeads: ['V5', 'V6', 'I', 'aVL'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('高侧壁还是低侧壁？', 'High lateral or low lateral?', '¿Lateral alto o lateral bajo?'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('stemi-high-lateral', 884),
        caption: l(
          'A：I、aVL 抬高并带上 V2，V5–V6 平坦，III 镜像最深（约 3 mm）→ D1',
          'A: I and aVL elevated together with V2, V5–V6 flat, deepest mirror in III (about 3 mm) → D1',
          'A: I y aVL elevadas junto con V2, V5-V6 planas, espejo más profundo en III (unos 3 mm) → D1',
        ),
        marks: [
          { auto: 'st', lead: 'aVL' },
          { auto: 'st', lead: 'III' },
        ],
      },
      right: {
        ecg: synth('stemi-lateral', 885),
        caption: l('B：V5–V6 抬高 ± I/aVL → LCx / 钝缘支', 'B: V5–V6 elevated ± I/aVL → LCx / obtuse marginal', 'B: V5-V6 elevadas ± I/aVL → Cx / marginal obtusa'),
        marks: [
          { auto: 'st', lead: 'V6' },
          { auto: 'st', lead: 'III' },
        ],
      },
      point: l(
        '同一面侧壁，两套导联：A 的损伤位置**更高**（D1 供血的高前壁/高侧壁），所以朝左上看的 I、aVL 抬高（并带上 V2），V5–V6 平坦，III 导联镜像压低最深（约 3 mm，II、aVF 也压低）；B 的损伤**更低更靠后**（钝缘支区域），V5、V6 抬高最明显（约 2 mm），I/aVL 只有约 1 mm，III 的压低变浅（约 1 mm，II 不受累），镜像还延伸到 V1–V2。两幅图侧壁导联的抬高都只有 1–2.5 mm——在 I/aVL，**1 mm 就够**。读图时永远同时问两件事：哪几个导联在抬高？它们连成的是哪一侧、哪一层的侧壁？',
        'One lateral wall, two sets of leads: the injury in A sits **higher** (the high anterior / high lateral wall fed by D1), so I and aVL, which look up and left, elevate (together with V2), V5–V6 stay flat and lead III shows the deepest mirror (about 3 mm, with II and aVF); in B the injury is **lower and more posterior** (obtuse marginal territory), V5 and V6 elevate most (about 2 mm), I/aVL reach only about 1 mm, the depression in III is shallower (about 1 mm, II spared) and the mirror extends to V1–V2. Both tracings elevate the lateral leads by only 1–2.5 mm — in I and aVL, **1 mm is enough**. Always ask two things at once: which leads are elevated, and which side and level of the lateral wall do they string together?',
        'Una misma pared lateral, dos juegos de derivaciones: la lesión de A está **más alta** (la pared anterior alta / lateral alta irrigada por D1), así que I y aVL, que miran hacia arriba a la izquierda, se elevan (junto con V2), V5-V6 quedan planas y la III muestra el espejo más profundo (unos 3 mm, con II y aVF); en B la lesión está **más abajo y más atrás** (territorio de la marginal obtusa), V5 y V6 se elevan más (unos 2 mm), I/aVL llegan solo a 1 mm, el descenso de III es menor (alrededor de 1 mm, II respetada) y el espejo se extiende a V1-V2. Ambos trazados elevan las derivaciones laterales solo 1-2,5 mm: en I y aVL, **con 1 mm basta**. Pregúntate siempre dos cosas a la vez: ¿qué derivaciones se elevan y qué lado y nivel de la pared lateral unen?',
      ),
    },
    {
      kind: 'film',
      title: l('一面侧壁，三种图形', 'One lateral wall, three patterns', 'Una pared lateral, tres patrones'),
      view: { layout: '3x4+1' },
      frames: [
        {
          label: l('南非国旗', 'South African flag', 'Bandera sudafricana'),
          ecg: synth('stemi-high-lateral', 886),
          note: l(
            '三道条纹：I、aVL 抬高，III 压低，V2 抬高与 V1 相当。V3 较小，V4 不到 1 mm，V5–V6 平坦 → D1。',
            'Three stripes: I and aVL up, III down, V2 up as much as V1. V3 smaller, V4 under 1 mm, V5–V6 flat → D1.',
            'Tres franjas: I y aVL arriba, III abajo, V2 tan elevada como V1. V3 menor, V4 por debajo de 1 mm, V5–V6 planas → D1.',
          ),
          marks: [{ auto: 'j', lead: 'aVL' }, { auto: 'j', lead: 'III' }, { auto: 'j', lead: 'V2' }],
        },
        {
          label: l('低侧壁', 'Low lateral', 'Lateral bajo'),
          ecg: synth('stemi-lateral', 885),
          note: l(
            'V5–V6 抬高最多（1.5–2 mm），I、aVL 约 1 mm；III 约 1 mm 压低而 II 不受累，V1–V2 也压低 → LCx / 钝缘支。',
            'V5–V6 up most (1.5–2 mm), I and aVL about 1 mm; III about 1 mm down with II spared, V1–V2 down too → LCx / obtuse marginal.',
            'V5–V6 las más elevadas (1,5–2 mm), I y aVL alrededor de 1 mm; III baja 1 mm con II respetada, y V1–V2 también bajan → Cx / marginal obtusa.',
          ),
          marks: [{ auto: 'j', lead: 'V6' }, { auto: 'j', lead: 'III' }],
        },
        {
          label: l('前侧壁', 'Anterolateral', 'Anterolateral'),
          ecg: synth('stemi-anterolateral', 887),
          note: l(
            'V3–V6 加 I、aVL 一起抬高，III、aVF 压低：一次闭塞（LAD 在粗大对角支之前），一个诊断，不是两个梗死。',
            'V3–V6 plus I and aVL up together, III and aVF down: one occlusion (LAD before a large diagonal), one diagnosis, not two infarcts.',
            'V3–V6 más I y aVL elevadas a la vez, III y aVF descendidas: una oclusión (DA antes de una diagonal grande), un diagnóstico, no dos infartos.',
          ),
          marks: [{ auto: 'j', lead: 'V4' }, { auto: 'j', lead: 'aVL' }],
        },
      ],
      caption: l(
        '同一面墙的三个层面。国旗图形里若 V3–V4 比 V2 抬得还高，要想到近段 LAD（第 I3 课）。',
        'One wall at three levels. In a flag pattern, if V3–V4 rose more than V2, think of the proximal LAD instead (lesson I3).',
        'Una pared a tres niveles. En un patrón de bandera, si V3–V4 subieran más que V2, piensa más bien en la DA proximal (lección I3).',
      ),
    },
    { kind: 'check', item: { family: 'territory', seed: 27 } },
    { kind: 'check', item: { family: 'max-st', seed: 6 } },
    { kind: 'check', item: { family: 'territory', seed: 9 } },
    { kind: 'drill', families: ['territory', 'max-st'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [4712, 18198, 15755],
      caption: l(
        '三份真实的侧壁梗死，都不是急性 STEMI：63 岁男性（侧壁，时期不明）、62 岁男性（前间壁 + 侧壁，数据库分期 II，演变中）、68 岁男性（下侧壁，时期不明）。没有急性 ST 抬高可供决策，就练习定位它们留下的痕迹：I、aVL、V5–V6 的 Q 波或 R 波变小（侧壁的 Q 波最难看出），第二份 V2–V4 的 QS 与深倒 T 波，第三份再加上下壁导联。为每份定下“区域 + 最可能的血管”，再揭晓。',
        'Three real lateral infarcts, none of them an acute STEMI: a man of 63 (lateral, age unknown), a man of 62 (anteroseptal + lateral, database stage II, evolving) and a man of 68 (inferolateral, age unknown). With no acute ST elevation to act on, practise localising what they leave behind: Q waves or shrunken R waves in I, aVL and V5–V6 (lateral Q waves are the hardest to see), the QS waves and deep T inversion in V2–V4 of the second, and the inferior leads as well in the third. Decide "territory + most likely artery" for each, then reveal.',
        'Tres infartos laterales reales, ninguno un IAMCEST agudo: un varón de 63 años (lateral, antigüedad desconocida), uno de 62 (anteroseptal + lateral, estadio II de la base de datos, en evolución) y uno de 68 (inferolateral, antigüedad desconocida). Sin elevación aguda del ST sobre la que decidir, practica localizar la huella que dejan: ondas Q o R reducidas en I, aVL y V5-V6 (las Q laterales son las más difíciles de ver), las QS y la T negativa profunda en V2-V4 del segundo, y además las inferiores en el tercero. Decide «territorio + arteria más probable» en cada uno y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把 I、aVL 的抬高当作“aVL 噪声大、本来就不平整”：aVL 振幅小是常态，J 点处 ≥ 1 mm 就是异常——量了再下结论。',
          'Dismissing elevation in I and aVL as "aVL is noisy anyway": a low-amplitude aVL is the norm, and ≥ 1 mm at the J point is abnormal — measure before you conclude.',
          'Desestimar la elevación en I y aVL por pensar que «la aVL es una derivación ruidosa»: una aVL de baja amplitud es lo normal, y ≥ 1 mm en el punto J es anormal; mide antes de concluir.',
        ),
        l(
          '把 II、III、aVF 的对应性压低报告为“下壁缺血”这个主诊断：抬高在哪、梗死就在哪；压低是镜像。',
          'Reporting the reciprocal depression in II, III, aVF as the main diagnosis of "inferior ischaemia": the infarct lives where the elevation lives; the depression is the mirror.',
          'Reportar el descenso recíproco de II, III y aVF como diagnóstico principal de «isquemia inferior»: el infarto está donde está la elevación; el descenso es la imagen especular.',
        ),
        l(
          'I、aVL 抬高而 III 压低时，把 V2 的抬高叫作“早期复极”：它是南非国旗的第三道条纹（D1）。',
          'Calling V2 elevation "early repolarisation" while I and aVL are up and III is down: it is the third stripe of the South African flag (D1).',
          'Llamar «repolarización precoz» a la elevación de V2 cuando I y aVL suben y III baja: es la tercera franja de la bandera sudafricana (D1).',
        ),
        l(
          '把 V2–V3 的性别/年龄阈值（男性 2–2.5 mm、女性 1.5 mm）搬到 I、aVL 上用：那里男女都是 1 mm。',
          'Carrying the V2–V3 sex/age thresholds (2–2.5 mm men, 1.5 mm women) over to I and aVL: in those leads it is 1 mm for everyone.',
          'Trasladar los umbrales por sexo y edad de V2-V3 (2-2,5 mm en varones, 1,5 mm en mujeres) a I y aVL: en esas derivaciones es 1 mm para todos.',
        ),
        l(
          '把前侧壁 STEMI 拆成“前壁 + 侧壁”两个小梗死分别处理：V3–V6 + I/aVL 是一次闭塞、一个诊断、一条再灌注通路。',
          'Splitting an anterolateral STEMI into "anterior + lateral" as two small infarcts: V3–V6 + I/aVL is one occlusion, one diagnosis, one reperfusion pathway.',
          'Partir un IAMCEST anterolateral en «anterior + lateral» como dos infartos pequeños: V3-V6 + I/aVL es una oclusión, un diagnóstico y una vía de reperfusión.',
        ),
        l(
          '因为“只有两个导联”而把侧壁 STEMI 降级为“待观察”：I、aVL 的闭塞同样在杀人，导联数量不代表危险大小。',
          'Downgrading a lateral STEMI to "wait and see" because "it is only two leads": an occlusion behind I and aVL kills just the same — the number of leads says nothing about the size of the risk.',
          'Rebajar un IAMCEST lateral a «esperar y ver» porque «son solo dos derivaciones»: la oclusión detrás de I y aVL mata igual; el número de derivaciones no dice nada del tamaño del riesgo.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '侧壁三型：低侧壁 V5–V6（± I/aVL）→ LCx/钝缘支；高侧壁 I、aVL → D1 或近段 LCx/OM；前侧壁 V3–V6 + I/aVL → LAD（粗大对角支之前）。',
          'Three lateral patterns: low lateral V5–V6 (± I/aVL) → LCx/obtuse marginal; high lateral I, aVL → D1 or proximal LCx/OM; anterolateral V3–V6 + I/aVL → LAD (before a large diagonal).',
          'Tres patrones laterales: lateral bajo V5-V6 (± I/aVL) → Cx/marginal obtusa; lateral alto I, aVL → D1 o Cx/MO proximal; anterolateral V3-V6 + I/aVL → DA (antes de una diagonal grande).',
        ),
        l(
          'I、aVL 的阈值是 1 mm（男女相同）；侧壁 STEMI 振幅小是常态，量 J 点，不要量 ST 段中段。',
          'The threshold in I and aVL is 1 mm (both sexes); small amplitudes are the rule in lateral STEMI — measure at the J point, not mid-ST.',
          'El umbral en I y aVL es de 1 mm (en ambos sexos); las amplitudes pequeñas son la norma en el IAMCEST lateral: mide en el punto J, no en mitad del ST.',
        ),
        l(
          'D1 图形（“南非国旗”征）：ST↑ I、aVL、V2 + ST↓ III（± II、aVF），V3–V6 相对不受累 ⇒ 中前壁/高侧壁，D1 或近段 LAD 病变。',
          'The D1 pattern ("South African flag"): ST elevation I, aVL, V2 + ST depression in III (± II, aVF) with V3–V6 relatively spared ⇒ mid-anterior / high lateral, a D1 or proximal LAD lesion.',
          'El patrón de D1 («bandera sudafricana»): elevación del ST en I, aVL y V2 + descenso en III (± II, aVF) con V3-V6 respetadas ⇒ anteromedio / lateral alto, lesión de D1 o DA proximal.',
        ),
        l(
          'II、III、aVF 压低而 I、aVL 抬高 = 侧壁损伤的镜像；抬高（不是压低）的导联命名梗死区域。',
          'Depression in II, III, aVF with elevation in I, aVL = the mirror of a lateral injury; the elevated (not the depressed) leads name the infarct territory.',
          'Descenso en II, III y aVF con elevación en I y aVL = imagen especular de una lesión lateral; las derivaciones elevadas (no las descendidas) dan nombre al territorio.',
        ),
        l(
          'V3–V6 + I/aVL 一起抬高是一次前侧壁事件：不拆成两个诊断，立即再灌注。',
          'V3–V6 + I/aVL elevated together is one anterolateral event: do not split it into two diagnoses — immediate reperfusion.',
          'V3-V6 + I/aVL elevadas a la vez es un solo evento anterolateral: no lo partas en dos diagnósticos; reperfusión inmediata.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Bayés de Luna A et al. Circulation 2006;114:1755-1760',
    'Castellano et al. 2004',
  ],
};

export default lesson;
