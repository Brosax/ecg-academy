/**
 * r5 — Premature beats (PAC, blocked PAC, PJC, PVC) and aberrancy (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `pac-criteria`, `aberrancy-vs-pvc`, `pvc-criteria`, `pvc-origin`,
 * `pvc-grouping-lown` (current values), plus the "Missing in the book" items under ventricular-arrhythmias:
 * PVC risk features (burden >=10%, short-coupled <300 ms) and outflow-tract localisation.
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
  id: 'r5',
  stage: 'R',
  order: 5,
  title: l('期前收缩（房性、房性未下传、交界性、室性）与差异性传导', 'Premature beats (PAC, blocked PAC, PJC, PVC) and aberrancy', 'Extrasístoles (auriculares, auriculares bloqueadas, de la unión y ventriculares) y aberrancia'),
  summary: l(
    '期前收缩按来源分类：房早带提前而形态不同的 P′，极早时未下传或差异性传导；交界性早搏带逆行 P′；室早宽大、无相关 P 波、联律固定、完全代偿间歇。又宽又早的搏动先找 P′——差异性传导是最常被读成室早的替身。',
    'Premature beats are classified by origin: a PAC carries an early P′ of a different shape — blocked or aberrant when very early; a PJC a retrograde P′; a PVC is wide, has no related P wave, fixed coupling and a fully compensatory pause. With any wide early beat, hunt for the P′ first — aberrancy is the impostor most often read as a PVC.',
    'Las extrasístoles se clasifican por su origen: la auricular lleva una P′ precoz de morfología distinta (bloqueada o aberrante si es muy precoz); la de la unión, una P′ retrógrada; la ventricular es ancha, sin onda P relacionada, con acoplamiento fijo y pausa compensatoria completa. Ante cualquier latido ancho y prematuro, busca primero la P′: la aberrancia es la suplantadora que más veces se lee como extrasístole ventricular.',
  ),
  objectives: [
    l(
      '用三个问题（有无 P′ 及其形态、QRS 宽度、间歇类型）把提前的搏动分为房早、交界性早搏或室早。',
      'Sort any premature beat into PAC, PJC or PVC with three questions: is there a P′ and what shape, how wide is the QRS, and what kind of pause follows.',
      'Clasificar cualquier extrasístole en auricular, de la unión o ventricular con tres preguntas: ¿hay P′ y con qué morfología?, ¿qué anchura tiene el QRS? y ¿qué tipo de pausa sigue?',
    ),
    l(
      '解释极早房早的两种结局：未下传（P′ 落在 T 波上）与差异性传导（右束支阻滞形，Ashman 长–短周期）。',
      'Explain the two fates of a very early PAC: blocked (the P′ lands on the T wave) and aberrant (RBBB-shaped, Ashman long–short cycle).',
      'Explicar los dos destinos de una extrasístole auricular muy precoz: bloqueada (la P′ cae sobre la onda T) y aberrante (morfología de bloqueo de rama derecha, ciclo largo–corto de Ashman).',
    ),
    l(
      '用联律间期、代偿间歇与 V1 形态分析室早并定位其起源；使用二联律/三联律/成对与 NSVT 等术语及风险特征（负荷 ≥10%、短联律 <300 ms）。',
      'Analyse a PVC with its coupling interval, compensatory pause and V1 shape to localise the origin; use the grouping terms (bigeminy, trigeminy, couplet, NSVT) and the risk features (burden ≥10 %, short coupling <300 ms).',
      'Analizar una extrasístole ventricular por su acoplamiento, pausa compensatoria y morfología en V1 para localizar el origen; usar los términos de agrupación (bigeminismo, trigeminismo, pareja, TVNS) y los rasgos de riesgo (carga ≥10 %, acoplamiento corto <300 ms).',
    ),
    l(
      '识破未下传房早二联律造成的“窦性心动过缓”假象。',
      'See through blocked-PAC bigeminy masquerading as sinus bradycardia.',
      'Desenmascarar el bigeminismo auricular bloqueado que simula una bradicardia sinusal.',
    ),
  ],
  minutes: 15,
  competencies: ['C9', 'C6'],
  findings: ['pac', 'pac-blocked', 'pjc', 'pvc', 'ventricular-bigeminy', 'aberrant-conduction'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('ventricular-bigeminy', 481),
      view: STRIP,
      question: l(
        '这条节律条上每隔一个搏动就有一个宽大、提前的 QRS。它们是什么，和窦性搏动是什么关系？先想好你的判断再往下看。',
        'Every other beat on this strip is wide and early. What are they, and how do they relate to the sinus beats? Commit to an answer before reading on.',
        'En esta tira, un sí y un no, cada segundo latido es ancho y prematuro. ¿Qué son y cómo se relacionan con los latidos sinusales? Decide tu respuesta antes de continuar.',
      ),
      reveal: l(
        '它们是**室性早搏（PVC），呈二联律**：每个窦性搏动后紧跟一个提前、宽大（≥120 ms）、束支阻滞形的 QRS，前面没有相关的 P 波，联律间期固定，随后是**完全性代偿间歇**——窦房结在室早下方照常放电，P 波埋在宽大的 QRS/T 里。宽大而提前的搏动先想室早，但本课要往下走三层：它的三个室上性“表亲”（房早、未下传房早、交界性早搏），以及最危险的替身——差异性传导。',
        'They are **PVCs in bigeminy**: after each sinus beat comes a premature, wide (≥120 ms) bundle-branch-block-shaped QRS with no related P wave before it, a fixed coupling interval, and then a **fully compensatory pause** — the sinus node keeps firing underneath, its P buried in the wide QRS/T. When a beat is wide and early, think PVC first — but this lesson goes three layers deeper: its supraventricular cousins (PAC, blocked PAC, PJC) and its most dangerous impostor, aberrant conduction.',
        'Son **extrasístoles ventriculares en bigeminismo**: tras cada latido sinusal llega un QRS prematuro y ancho (≥120 ms) con morfología de bloqueo de rama, sin onda P relacionada delante, con acoplamiento fijo y seguido de una **pausa compensatoria completa**: el nodo sinusal sigue disparando por debajo, con su P enterrada en el QRS/T ancho. Ante un latido ancho y prematuro, piensa primero en la extrasístole ventricular, pero esta lección baja tres niveles más: sus primas supraventriculares (extrasístole auricular, bloqueada y de la unión) y su suplantador más peligroso, la conducción aberrante.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('pvc', 482),
      showConduction: true,
      emphasize: ['rv-outflow'],
      caption: l(
        '跟着光标看这个室早的来源：右心室流出道——特发性室早最常见的部位。激动从流出道进入心室，先激动右室、后激动左室，所以 V1 呈左束支阻滞形（主波向下），II、III、aVF 呈高 R（电轴下偏）。窦性搏动仍来自窦房结：宽大提前的 QRS 不经过心房，代偿间歇因此“完全”。',
        'Follow the cursor to the source of this PVC: the right ventricular outflow tract, the commonest site of idiopathic PVCs. Activation enters the ventricles from the outflow tract — right ventricle first, left ventricle second — so V1 looks LBBB-shaped (dominant S) and II, III and aVF show tall R waves (inferior axis). The sinus beats still come from the sinus node: a wide premature QRS never touches the atria, which is why the pause is "compensatory".',
        'Sigue el cursor hasta el origen de esta extrasístole ventricular: el tracto de salida del ventrículo derecho, la localización más frecuente de las extrasístoles idiopáticas. La activación entra en los ventrículos desde el tracto de salida (primero el ventrículo derecho, después el izquierdo), de modo que V1 adopta morfología de bloqueo de rama izquierda (S dominante) y II, III y aVF muestran R altas (eje inferior). Los latidos sinusales siguen naciendo en el nodo sinusal: un QRS ancho y prematuro no toca las aurículas, y por eso la pausa es «compensatoria».',
      ),
    },
    {
      kind: 'text',
      title: l('提前的搏动：三个问题定位', 'A premature beat: three questions', 'Un latido prematuro: tres preguntas'),
      body: l(
        '期前收缩 = 提前出现（对照 r2：逸搏是**晚**到，期前收缩是**早**到）。看到提前的搏动，问三个问题：\n- 它前面有 P′ 吗？有、且形态与窦性不同 → **房早（PAC）**；有但倒置（II、III、aVF 负向）、紧贴 QRS 或落在其后 → **交界性早搏（PJC）**；没有 → **室早（PVC）**。\n- QRS 宽吗？房早与交界性早搏通常窄（除非差异性传导）；室早 ≥120 ms、束支阻滞形。\n- 间歇是哪一种？房早多为**不完全代偿**（窦房结被重整）；室早多为**完全代偿**（窦房结不受干扰）。\n三个答案合起来，几乎每个提前的搏动都能归位。',
        'A premature beat arrives early (contrast r2: an escape beat is **late**, ectopy is **early**). Three questions sort them out:\n- Is there a P′ before it? Yes, with a shape different from sinus → **PAC**; yes but inverted (negative in II, III, aVF) hugging the QRS or just after it → **PJC**; none → **PVC**.\n- Is the QRS wide? PACs and PJCs are usually narrow (unless conducted with aberrancy); a PVC is ≥120 ms and bundle-branch-block-shaped.\n- What kind of pause follows? A PAC usually leaves a **less-than-compensatory** pause (the sinus node is reset); a PVC a **fully compensatory** one (the sinus node is untouched).\nTaken together, the three answers place nearly every premature beat.',
        'Una extrasístole llega pronto (contraste con r2: el latido de escape es **tardío**, la extrasístole es **precoz**). Tres preguntas las ordenan:\n- ¿Hay una P′ delante? Sí, con morfología distinta de la sinusal → **extrasístole auricular**; sí, pero invertida (negativa en II, III, aVF), pegada al QRS o justo después → **extrasístole de la unión**; no la hay → **extrasístole ventricular**.\n- ¿El QRS es ancho? Las auriculares y las de la unión suelen ser estrechas (salvo conducción aberrante); la ventricular mide ≥120 ms con morfología de bloqueo de rama.\n- ¿Qué tipo de pausa sigue? La extrasístole auricular deja habitualmente una pausa **menos que compensatoria** (el nodo sinusal se reinicia); la ventricular, una **pausa compensatoria completa** (el nodo sinusal no se inmuta).\nJuntas, las tres respuestas sitúan casi cualquier extrasístole.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pac', 483),
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'pr' }],
      caption: l(
        '房早：P′ 比预期的窦性 P 提前出现，且形态不同（本例灶位于左房下部，P′ 在 II 倒置）。本例 P′R 与窦性 PR 几乎相同（约 155 ms）；P′ 来得更早时，它会遇上尚在恢复的房室结，P′R 随之延长。QRS 与窦性相同：下传正常。随后的间歇**短于完全代偿**：P′ 重整了窦房结，下一个窦性 P 从 P′ 重新计时。',
        'A PAC: the P′ arrives earlier than the expected sinus P and looks different (this focus sits in the lower left atrium, so the P′ is negative in II). Here the P′R is about the same as the sinus PR (about 155 ms); a P′ that comes earlier meets an AV node still recovering, and its P′R lengthens. The QRS is identical to sinus: conduction is normal. The pause that follows is **less than compensatory**: the P′ resets the sinus node, which restarts its clock from the P′.',
        'Una extrasístole auricular: la P′ llega antes de lo esperado y tiene otra morfología (este foco está en la aurícula izquierda inferior, así que la P′ es negativa en II). Aquí el P′R es casi igual al PR sinusal (unos 155 ms); una P′ más precoz encuentra el nodo AV aún en recuperación y su P′R se alarga. El QRS es idéntico al sinusal: conducción normal. La pausa que sigue es **menos que compensatoria**: la P′ reinicia el nodo sinusal, que vuelve a cronometrar desde ella.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pjc', 488),
      view: STRIP,
      marks: [{ auto: 'p' }],
      caption: l(
        '交界性早搏：QRS 窄、提前、形态似窦性；QRS 前没有 P 波。这里的**逆行 P′** 紧跟在 QRS 之后出现——在 II 导联的 ST 段起始处是一个小小的负向波（约 0.5 mm），窦性搏动没有它（逆行 P′ 在 II 倒置，因为心房被自下而上地激动）。逆行 P′ 有三个位置：QRS 之前（P′R <120 ms）、埋在 QRS 里（最常见）、或紧跟在 QRS 之后、落在 ST 段内（本例）。看不见 P′ 时别放弃：把提前搏动的 QRS 末端和 ST 段与窦性搏动逐一对比。',
        'A PJC: the QRS is narrow, early and similar to sinus; no P wave precedes it. Here the **retrograde P′** comes just after the QRS — in lead II a small negative wave (about 0.5 mm) at the start of the ST segment that the sinus beats do not have (a retrograde P′ is negative in II because the atria are activated from below upwards). The retrograde P′ can occupy one of three places: before the QRS (P′R <120 ms), hidden inside it (most often), or just after it in the ST segment (as here). If you see none, do not give up: compare the end of the early QRS and its ST segment with the sinus beats.',
        'Una extrasístole de la unión: el QRS es estrecho, precoz y parecido al sinusal; no le precede ninguna onda P. Aquí la **P′ retrógrada** aparece justo después del QRS: en la derivación II, una pequeña onda negativa (unos 0,5 mm) al comienzo del segmento ST que los latidos sinusales no tienen (la P′ retrógrada es negativa en II porque las aurículas se activan de abajo hacia arriba). La P′ retrógrada puede ocupar tres posiciones: antes del QRS (P′R <120 ms), oculta dentro de él (lo más frecuente) o justo después, en el segmento ST (como aquí). Si no la ves, no te rindas: compara el final del QRS precoz y su segmento ST con los latidos sinusales.',
      ),
    },
    {
      kind: 'criteria',
      title: l('期前收缩与差异性传导：标准', 'Premature beats and aberrancy: the criteria', 'Extrasístoles y aberrancia: los criterios'),
      items: [
        {
          label: l('房早（PAC）', 'PAC', 'Extrasístole auricular'),
          value: l(
            '提前的 P′，形态与窦性不同；P′R 正常或延长；QRS 通常与窦性相同，过早时可差异性传导（多呈右束支阻滞形）或未下传；间歇通常**不完全代偿**（窦房结被重整）',
            'Premature P′ differing in shape from sinus; P′R normal or prolonged; QRS usually identical to sinus, but aberrant (usually RBBB-shaped) or non-conducted when very premature; the pause is usually **less than compensatory** (the sinus node is reset)',
            'P′ prematura con morfología distinta de la sinusal; P′R normal o prolongado; QRS habitualmente idéntico al sinusal, aunque puede ser aberrante (con morfología de bloqueo de rama derecha) o no conducida si es muy precoz; la pausa suele ser **menos que compensatoria** (el nodo sinusal se reinicia)',
          ),
        },
        {
          label: l('未下传房早', 'Blocked PAC', 'Extrasístole auricular bloqueada'),
          value: l(
            '极早的 P′ 落在前一 T 波上，房室结仍处于不应期 → 无 QRS，只留一个“不明”间歇；必须在 T 波上找到 P′ 才能解释停搏',
            'A very early P′ lands on the previous T wave and finds the AV node refractory → no QRS, only an "unexplained" pause; the P′ must be found on the T before the pause can be explained',
            'Una P′ muy precoz cae sobre la onda T previa y encuentra el nodo AV refractario → no hay QRS, solo una pausa «inexplicada»; hay que encontrar la P′ sobre la T para poder explicar la pausa',
          ),
        },
        {
          label: l('交界性早搏（PJC）', 'PJC', 'Extrasístole de la unión'),
          value: l(
            '提前的窄 QRS，形态似窦性；逆行 P′（II、III、aVF 倒置）位于 QRS 之前（P′R <120 ms）、其中或其后（ST 段内）',
            'Premature narrow QRS similar to sinus; a retrograde P′ (negative in II, III, aVF) before the QRS (P′R <120 ms), hidden inside it, or just after it in the ST segment',
            'QRS estrecho y precoz, parecido al sinusal; P′ retrógrada (negativa en II, III, aVF) antes del QRS (P′R <120 ms), oculta en él o justo después, en el segmento ST',
          ),
        },
        {
          label: l('室早（PVC）', 'PVC', 'Extrasístole ventricular'),
          value: l(
            '提前的 QRS 通常 ≥120 ms、束支阻滞形，其前无相关 P′；继发性 ST-T 与主波方向相反；联律间期固定（变异性 >80 ms 伴融合波与共同间期 → 考虑室性并行心律）；间歇通常完全代偿',
            'Premature QRS usually ≥120 ms with a bundle-branch-block-like shape, not preceded by a related P′; secondary ST-T opposite to the main QRS deflection; fixed coupling interval (variation >80 ms plus fusion beats and a common interectopic denominator suggests parasystole); the pause is usually fully compensatory',
            'QRS prematuro habitualmente ≥120 ms con morfología de bloqueo de rama, sin P′ relacionada delante; ST-T secundario opuesto a la deflexión principal del QRS; intervalo de acoplamiento fijo (variación >80 ms con latidos de fusión y un denominador interectópico común sugiere parasistolia); la pausa suele ser compensatoria completa',
          ),
        },
        {
          label: l('起源（V1 形态）', 'Origin (V1 shape)', 'Origen (morfología en V1)'),
          value: l(
            '右束支阻滞形 V1 → 左室（或分支）起源；左束支阻滞形 V1 → 右室或室间隔/左室流出道/主动脉瓣窦；左束支阻滞形 + 电轴下偏 → 流出道起源：胸前移行 ≤V2 提示主动脉瓣窦/LVOT，≥V4 提示 RVOT',
            'RBBB-like V1 → left ventricular (or fascicular) origin; LBBB-like V1 → right ventricle or septum / LV outflow tract / aortic cusps; LBBB-like with inferior axis → outflow tract: precordial transition at or before V2 points to an aortic cusp or LVOT, at V4 or later to the RVOT',
            'V1 con morfología de bloqueo de rama derecha → origen en el ventrículo izquierdo (o fascicular); V1 con morfología de rama izquierda → ventrículo derecho o septo / tracto de salida del VI / válvulas aórticas; morfología de rama izquierda con eje inferior → tracto de salida: la transición precordial en V2 o antes apunta a valva aórtica/TSVI, y en V4 o después a TSVD',
          ),
        },
        {
          label: l('分组与 NSVT', 'Grouping and NSVT', 'Agrupación y TVNS'),
          value: l(
            '保留二联律、三联律、成对等描述性术语；连续 ≥3 个室性搏动且 >100 次/分 = 非持续性室速（“三连律”已是 NSVT）；不用 Lown 分级，改用负荷、单形/多形、联律间期及有无 NSVT 来描述',
            'Keep the descriptive terms bigeminy, trigeminy and couplet; three or more consecutive ventricular beats at >100/min = non-sustained VT (a "triplet" already counts as NSVT); instead of Lown grades, describe ectopy by burden, mono- vs polymorphic shape, coupling interval and the presence of NSVT',
            'Consérvense los términos descriptivos bigeminismo, trigeminismo y pareja; tres o más latidos ventriculares consecutivos a >100 lpm = taquicardia ventricular no sostenida (un «triplete» ya es TVNS); en lugar de los grados de Lown, describir el ectopismo por carga, mono- o polimorfismo, intervalo de acoplamiento y presencia de TVNS',
          ),
        },
        {
          label: l('风险特征', 'Risk features', 'Rasgos de riesgo'),
          value: l(
            'Holter 负荷 ≥10% 且左室射血分数不明原因减低 → 警惕 PVC 诱导的心肌病；其他高危特征：短联律 <300 ms（R-on-T）、QRS >150–160 ms、非流出道起源、多形性、运动时增多',
            'A Holter burden ≥10 % with an unexplained fall in LVEF → suspect PVC-induced cardiomyopathy; other higher-risk features: short coupling <300 ms (R-on-T), QRS >150-160 ms, non-outflow-tract origin, polymorphic PVCs, and an increase on exercise',
            'Una carga en el Holter ≥10 % con caída inexplicada de la FEVI → sospechar miocardiopatía inducida por extrasístoles; otros rasgos de mayor riesgo: acoplamiento corto <300 ms (R-on-T), QRS >150-160 ms, origen no del tracto de salida, extrasístoles polimórficas y aumento con el ejercicio',
          ),
        },
      ],
      source:
        'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332; Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720; Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307',
    },
    {
      kind: 'worked',
      title: l('在 T 波上找到它：未下传房早', 'Find it on the T: the blocked PAC', 'Encuéntrala en la T: la extrasístole auricular bloqueada'),
      ecg: synth('pac-blocked', 484),
      view: STRIP,
      steps: [
        {
          title: l('先看间歇', 'Start with the pause', 'Empieza por la pausa'),
          body: l(
            'RR 突然拉长——一个“停搏”。别急着写窦性停搏或房室传导阻滞（复习 r1、r3）：先把分规卡在一个 PP 上，沿节律条走一遍。',
            'The RR suddenly stretches — a "pause". Do not jump to sinus arrest or AV block (revision of r1 and r3): set the calipers on one PP and walk them along the strip first.',
            'El RR se alarga de golpe: una «pausa». No saltes a la parada sinusal ni al bloqueo AV (repaso de r1 y r3): ajusta primero el compás a un PP y recorre la tira.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('T 波变形了', 'The T wave has changed shape', 'La onda T ha cambiado'),
          body: l(
            '停搏前的那个 T 与其他 T 不一样——更高、有切迹或“长了个角”。那不全是 T：是 **T + 提前藏进去的 P′**。逐搏比较 T 的形态。',
            'The T just before the pause does not look like the others — taller, notched, or with a "horn". That is not all T wave: it is the **T plus an early P′ hidden on it**. Compare the T shapes beat by beat.',
            'La T justo antes de la pausa no se parece a las demás: más alta, mellada o «con un cuerno». No es solo onda T: es la **T más una P′ precoz escondida sobre ella**. Compara las morfologías de las T latido a latido.',
          ),
          marks: [{ auto: 't' }],
        },
        {
          title: l('P′ 到时，门还关着', 'The P′ arrives while the door is still shut', 'La P′ llega con la puerta aún cerrada'),
          body: l(
            '这个 P′ 距前一个窦性 P 仅约 365 ms（基础 PP 约 830 ms），落在前一次搏动的不应期内：心房除极了，房室结拒绝下传 → 没有 QRS。未下传房早的“证据”就是**只有 P′、没有 QRS**。',
            'This P′ comes only about 365 ms after the previous sinus P (the basic PP is about 830 ms) and falls inside the refractory period of the previous beat: the atria depolarise, the AV node refuses to conduct → no QRS. The signature of a blocked PAC is **a P′ with no QRS to follow**.',
            'Esta P′ llega solo unos 365 ms después de la P sinusal previa (el PP basal es de unos 830 ms) y cae dentro del periodo refractario del latido previo: las aurículas se despolarizan, el nodo AV se niega a conducir → no hay QRS. La firma de la extrasístole auricular bloqueada es **una P′ sin QRS que la siga**.',
          ),
          marks: [{ auto: 'blocked-p' }],
        },
        {
          title: l('下诊断，并和两个假象告别', 'Make the diagnosis, and rule out the two mimics', 'Haz el diagnóstico y descarta los dos simulacros'),
          body: l(
            '诊断：**未下传房早**。与二度房室传导阻滞的差别：那里的 P **按时**出现（PP 恒定），这里的关键 P′ 是**提前**的；与窦性停搏的差别：这里能找到那个 P′（它就藏在 T 上）。机制是心房“太早”，不是传导系统“太病”——治疗思路随之不同。',
            'Diagnosis: **blocked PAC**. Unlike second-degree AV block, where the P arrives **on time** (constant PP), the decisive P′ here is **early**; unlike sinus arrest, the P′ can be found — hidden on the T. The mechanism is an atrium firing too early, not a diseased conduction system, and management follows from that.',
            'Diagnóstico: **extrasístole auricular bloqueada**. A diferencia del bloqueo AV de segundo grado, donde la P llega **a su hora** (PP constante), aquí la P′ decisiva es **precoz**; y a diferencia de la parada sinusal, la P′ se puede encontrar, oculta sobre la T. El mecanismo es una aurícula que dispara demasiado pronto, no un sistema de conducción enfermo, y el manejo se deriva de eso.',
          ),
          marks: [{ auto: 'p' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('pac-blocked', 485, undefined, 'bigeminy'),
      view: STRIP,
      marks: [{ auto: 'blocked-p' }],
      caption: l(
        '现在每个窦性搏动后面都跟着一个藏在 T 波上的未下传 P′——**未下传房早二联律**。乍看是“约 46 次/分的窦性心动过缓”，但数一数 T 波：每个 T 波上都骑着一个 P′，**心房实际每分钟激动约 95 次**，而每一个 P′ 都没能下传。处理思路完全不同：这种假性窦缓要找的是房早的诱因，而不是评估起搏器。任何“窦缓”条图，先把 T 波数一遍。',
        'Now every sinus beat is followed by a blocked P′ hidden on the T wave — **blocked-PAC bigeminy**. At first glance it reads as "sinus bradycardia at about 46/min", but count the T waves: each one carries a P′, so **the atria actually fire about 95 times a minute** — and every P′ fails to conduct. The management is entirely different: this pseudo-bradycardia asks why the atria are irritable, not whether the patient needs a pacemaker. On any "slow sinus" strip, count the T waves first.',
        'Ahora cada latido sinusal va seguido de una P′ bloqueada oculta en la onda T: **bigeminismo auricular bloqueado**. A primera vista parece una «bradicardia sinusal a unos 46 lpm», pero cuenta las ondas T: cada una lleva una P′, así que **las aurículas se activan en realidad unas 95 veces por minuto**, y ninguna P′ logra conducir. El manejo es totalmente distinto: esta pseudobradicardia obliga a buscar por qué las aurículas están irritables, no si el paciente necesita un marcapasos. Ante cualquier tira con «sinusal lenta», cuenta primero las ondas T.',
      ),
    },
    {
      kind: 'text',
      title: l('又宽又早：差异性传导还是室早？', 'Wide and early: aberrancy or PVC?', 'Ancho y precoz: ¿aberrancia o extrasístole ventricular?'),
      body: l(
        '一个提前的宽 QRS 只有两条来路：室上性冲动遇上尚未恢复的束支（**差异性传导**），或心室自己的灶（**PVC**）。倾向差异性传导：\n- 宽 QRS 前**有提前的 P′**（最可靠的征象）；\n- V1 呈三相 **rSR′**，V6 呈 qRs；\n- **起始向量**与窦性下传搏动相同；\n- 其后间歇**不完全代偿**；\n- Ashman 长–短序列（长周期后跟短周期——长周期把束支不应期拉长）支持差异性传导，但**不能证明**它。\n倾向 PVC：无 P′、联律间期固定、V1 呈单相 R/qR 或不典型左束支阻滞形、其后**完全代偿间歇**。注意：“同向性”是宽 QRS 心动过速鉴别室速的标准，不用于单个早搏。',
        'A premature wide QRS has only two explanations: a supraventricular impulse that met a bundle branch still refractory (**aberrancy**), or a ventricular focus (**PVC**). Favour aberrancy:\n- a **premature P′ precedes** the wide QRS (the most reliable sign);\n- V1 shows a triphasic **rSR′**, V6 a qRs;\n- the **initial vector matches** the conducted sinus beats;\n- the pause after it is **less than compensatory**;\n- an Ashman long-short sequence (a long cycle followed by a short one — the long cycle lengthens the bundle refractoriness) supports aberrancy but **does not prove it**.\nFavour PVC: no P′, fixed coupling, a monophasic R or qR in V1 or an atypical LBBB shape, and a **fully compensatory pause** after it. Note: "concordance" is a criterion for VT in wide-QRS tachycardia, not a single-beat test.',
        'Un QRS ancho y prematuro solo admite dos explicaciones: un impulso supraventricular que encuentra una rama aún refractaria (**aberrancia**) o un foco ventricular (**extrasístole ventricular**). A favor de la aberrancia:\n- una **P′ prematura precede** al QRS ancho (el signo más fiable);\n- V1 muestra un **rSR′** trifásico y V6 un qRs;\n- el **vector inicial coincide** con el de los latidos sinusales conducidos;\n- la pausa posterior es **menos que compensatoria**;\n- una secuencia larga-corta de Ashman (un ciclo largo seguido de uno corto: el ciclo largo alarga el periodo refractario de la rama) apoya la aberrancia, pero **no la demuestra**.\nA favor de la extrasístole ventricular: sin P′, acoplamiento fijo, R monofásica o qR en V1 o morfología atípica de bloqueo de rama izquierda, y **pausa compensatoria completa** tras ella. Ojo: la «concordancia» es un criterio de TV en la taquicardia de QRS ancho, no una prueba de un solo latido.',
      ),
    },
    {
      kind: 'contrast',
      title: l('两个提前的宽 QRS：谁带着 P′？', 'Two premature wide QRS: which one carries a P′?', 'Dos QRS anchos y precoces: ¿cuál trae una P′?'),
      view: STRIP,
      left: {
        ecg: synth('pac-aberrant', 486),
        caption: l('宽 QRS 前有提前的 P′；QRS 右束支阻滞形；间歇不完全代偿——差异性传导', 'A premature P′ before the wide QRS; RBBB shape; less-than-compensatory pause — aberrancy', 'Una P′ prematura delante del QRS ancho; morfología de bloqueo de rama derecha; pausa menos que compensatoria: aberrancia'),
        marks: [{ auto: 'p' }],
      },
      right: {
        ecg: synth('pvc', 487),
        caption: l('无 P′；联律固定；其后完全代偿间歇，窦性 P 埋在宽 QRS 里——右室流出道室早', 'No P′; fixed coupling; a fully compensatory pause after it, the sinus P buried in the wide QRS — RV outflow-tract PVC', 'Sin P′; acoplamiento fijo; pausa compensatoria completa después, con la P sinusal enterrada en el QRS ancho: extrasístole del tracto de salida del VD'),
        marks: [{ auto: 'qrs' }],
      },
      point: l(
        '左：早到的 P′ 遇上没缓过来的右束支 → QRS 增宽，但**机制是室上性的**：找 P′、看 V1 的三相 rSR′、量间歇是否短于完全代偿。右：没有 P′——宽 QRS 自己就是起源，联律固定、代偿完全。把左图叫成室早是本课最常见的错误（当它升级成宽 QRS 心动过速时也最危险）：**宽 ≠ 室性**。',
        'Left: an early P′ meets a right bundle branch that has not recovered → the QRS widens, but **the mechanism is supraventricular**: look for the P′, the triphasic rSR′ in V1, and a pause short of full compensation. Right: no P′ — the wide QRS is its own origin, with fixed coupling and full compensation. Calling the left tracing a PVC is this lesson\'s commonest error (and the most dangerous one when it later escalates into a wide-QRS tachycardia): **wide does not mean ventricular**.',
        'Izquierda: una P′ precoz encuentra una rama derecha que no se ha recuperado → el QRS se ensancha, pero **el mecanismo es supraventricular**: busca la P′, el rSR′ trifásico en V1 y una pausa que se queda corta de la compensación completa. Derecha: no hay P′; el QRS ancho es su propio origen, con acoplamiento fijo y compensación completa. Llamar extrasístole ventricular al trazado izquierdo es el error más común de esta lección (y el más peligroso si después escala a una taquicardia de QRS ancho): **ancho no significa ventricular**.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pvc-patterns', 489, undefined, 'multifocal'),
      view: STRIP,
      marks: [{ auto: 'qrs' }],
      caption: l(
        '描述室早的“分组语言”：本例呈三联律模式，且**多源**——两种形态的宽 QRS 交替出现（一个来自右室流出道，一个来自左室侧壁）。术语：二联律 = 每第 2 个搏动；三联律 = 每第 3 个；成对 = 连续两个；**连续 ≥3 个且 >100 次/分 = 非持续性室速**（“三连律”已计入 NSVT）。量化靠 Holter：负荷 ≥10% 伴不明原因 EF 减低要警惕 PVC 诱导的心肌病；联律 <300 ms 为高危。',
        'The "grouping language" of ventricular ectopy: this example runs in a trigeminal pattern and is **multifocal** — two QRS shapes alternate (one from the RV outflow tract, one from the LV lateral wall). The terms: bigeminy = every second beat; trigeminy = every third; a couplet = two in a row; **three or more consecutive at >100/min = non-sustained VT** (a "triplet" already counts as NSVT). Quantify with a Holter: a burden ≥10 % with an unexplained fall in EF raises suspicion of PVC-induced cardiomyopathy, and coupling <300 ms is high-risk.',
        'El «lenguaje de agrupación» del ectopismo ventricular: este ejemplo sigue un patrón trigeminal y es **multifocal**: alternan dos morfologías de QRS (una del tracto de salida del VD y otra de la pared lateral del VI). Los términos: bigeminismo = cada segundo latido; trigeminismo = cada tercero; pareja = dos seguidos; **tres o más consecutivos a >100 lpm = taquicardia ventricular no sostenida** (un «triplete» ya cuenta como TVNS). Cuantifica con un Holter: una carga ≥10 % con caída inexplicada de la FEVI debe hacer sospechar miocardiopatía inducida por extrasístoles, y un acoplamiento <300 ms es de alto riesgo.',
      ),
    },
    { kind: 'check', item: { family: 'ectopy', seed: 3 } },
    { kind: 'check', item: { family: 'ectopy', seed: 33 } },
    { kind: 'check', item: { family: 'ectopy', seed: 15 } },
    { kind: 'drill', families: ['ectopy'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [2466, 14276, 13033],
      caption: l(
        '两份房性、一份室性期前收缩（PTB-XL 真实病例）。逐个分析提前的搏动：P′ 在哪里、QRS 多宽、联律固定吗、间歇是哪一种——**先想好结论再揭晓**。',
        'Two atrial and one ventricular premature beat (real PTB-XL cases). Analyse each early beat: where is the P′, how wide is the QRS, is the coupling fixed, and what kind of pause follows — **commit to a conclusion before you reveal**.',
        'Dos extrasístoles auriculares y una ventricular (casos reales de PTB-XL). Analiza cada latido precoz: dónde está la P′, qué anchura tiene el QRS, si el acoplamiento es fijo y qué tipo de pausa sigue: **decide tu conclusión antes de mirar la solución**.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把未下传房早二联律当“窦性心动过缓”去做起搏器评估：先数 T 波——心房的激动频率常常正常甚至偏快，每隔一个心房波就是一个藏在 T 上的 P′。',
          'Working up blocked-PAC bigeminy as "sinus bradycardia" for a pacemaker: count the T waves first — the atria are often firing at a normal or fast rate, with every second atrial wave a P′ hidden on the T.',
          'Estudiar el bigeminismo auricular bloqueado como «bradicardia sinusal» para un marcapasos: cuenta antes las ondas T; las aurículas suelen activarse a una frecuencia normal o rápida, y una de cada dos ondas auriculares es una P′ oculta en la T.',
        ),
        l(
          '把差异性传导叫成室早（乃至室速）：宽 ≠ 室性——先找 P′、看 V1 的 rSR′、比起始向量与间歇。',
          'Calling aberrancy a PVC (or VT): wide does not mean ventricular — look for the P′, the rSR′ in V1, the initial vector and the pause.',
          'Llamar aberrancia a la extrasístole ventricular (o a una TV): ancho no significa ventricular; busca la P′, el rSR′ en V1, el vector inicial y la pausa.',
        ),
        l(
          '把代偿间歇的逻辑用反：房早多为不完全代偿（窦房结被重整），室早多为完全代偿——间歇本身就是分类证据。',
          'Reversing the compensatory-pause logic: a PAC usually leaves a less-than-compensatory pause (sinus node reset), a PVC a fully compensatory one — the pause itself is class evidence.',
          'Invertir la lógica de la pausa compensatoria: la extrasístole auricular suele dejar una pausa menos que compensatoria (nodo sinusal reiniciado) y la ventricular una completa: la propia pausa es evidencia de clasificación.',
        ),
        l(
          '每见一个房早就安排全套检查：偶发房早极其常见——先问诱因（咖啡、酒精、应激、睡眠不足、电解质、缺氧、甲状腺）与症状，再决定是否需要更多检查。',
          'Ordering a full work-up for every PAC: occasional PACs are extremely common — ask about triggers (coffee, alcohol, stress, sleep debt, electrolytes, hypoxia, thyroid) and symptoms first, and only then decide whether more testing is needed.',
          'Pedir un estudio completo por cada extrasístole auricular: las esporádicas son muy frecuentes; pregunta primero por los desencadenantes (café, alcohol, estrés, falta de sueño, electrolitos, hipoxia, tiroides) y por los síntomas, y solo después decide si hacen falta más pruebas.',
        ),
        l(
          '一见 R-on-T 就报“猝死风险”：单纯骑在 T 上并不等于危险——风险取决于联律间期（<300 ms）、QT 与基础病变（在缺血与长 QT 中才真正要紧）。',
          'Reporting "sudden-death risk" at the sight of any R-on-T: riding the T wave alone is not danger — risk depends on the coupling interval (<300 ms), the QT and the substrate (it truly matters in ischaemia and long QT).',
          'Avisar de «riesgo de muerte súbita» ante cualquier R-on-T: cabalgar la onda T por sí solo no es peligroso; el riesgo depende del acoplamiento (<300 ms), del QT y del sustrato (importa de verdad en la isquemia y el QT largo).',
        ),
        l(
          '因为“看得见 P 波”就把交界性早搏当房早：看极性——逆行 P′ 在 II、III、aVF 倒置，且 P′R <120 ms 或落在 QRS 之后。',
          'Reading a PJC as a PAC because "a P wave is visible": check its polarity — a retrograde P′ is negative in II, III and aVF, with a P′R <120 ms or sitting after the QRS.',
          'Leer una extrasístole de la unión como auricular porque «se ve una P»: mira la polaridad; la P′ retrógrada es negativa en II, III y aVF, con un P′R <120 ms o situada tras el QRS.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '提前的搏动按来源分：房早 = 提前、形态不同的 P′（P′R 正常或延长）；交界性早搏 = 逆行 P′（前/中/后）；室早 = 宽 ≥120 ms、束支阻滞形、其前无相关 P′。',
          'Premature beats by origin: PAC = an early P′ of different shape (P′R normal or long); PJC = a retrograde P′ (before, inside or after the QRS); PVC = ≥120 ms, bundle-branch-shaped, no related P′ before it.',
          'Extrasístoles por origen: auricular = P′ precoz de morfología distinta (P′R normal o largo); de la unión = P′ retrógrada (antes, dentro o después del QRS); ventricular = ≥120 ms, con morfología de bloqueo de rama y sin P′ relacionada delante.',
        ),
        l(
          '极早的房早两种结局：未下传（P′ 藏在 T 波上，只留间歇）或差异性传导（右束支阻滞形，Ashman 长–短周期）。',
          'A very early PAC has two fates: blocked (the P′ hides on the T wave, leaving only a pause) or aberrant (RBBB-shaped, Ashman long-short cycle).',
          'Una extrasístole auricular muy precoz tiene dos destinos: bloqueada (la P′ se oculta en la onda T y solo queda una pausa) o aberrante (morfología de bloqueo de rama derecha, ciclo largo-corto de Ashman).',
        ),
        l(
          '室早：联律固定、完全代偿间歇、窦性 P 照常行进；V1 形态定位——右束支阻滞形 → 左室，左束支阻滞形 → 右室/间隔，左束支阻滞形 + 电轴下偏 → 流出道（移行 ≤V2 主动脉瓣窦/LVOT，≥V4 RVOT）。',
          'PVC: fixed coupling, a fully compensatory pause, the sinus P marching on; V1 shape localises it — RBBB-like → LV, LBBB-like → RV or septum, LBBB-like with inferior axis → outflow tract (transition at or before V2, aortic cusp/LVOT; at V4 or later, RVOT).',
          'Extrasístole ventricular: acoplamiento fijo, pausa compensatoria completa y P sinusal que sigue su marcha; la morfología en V1 la localiza: tipo bloqueo de rama derecha → VI; tipo rama izquierda → VD o septo; tipo rama izquierda con eje inferior → tracto de salida (transición en V2 o antes, valva aórtica/TSVI; en V4 o después, TSVD).',
        ),
        l(
          '连续 ≥3 个室性搏动且 >100 次/分 = NSVT；描述室早用负荷（≥10% + EF 不明原因减低 → PVC 诱导心肌病）、单形/多形与联律间期（<300 ms 高危），不用 Lown 分级。',
          'Three or more consecutive ventricular beats at >100/min = NSVT; describe PVCs by burden (≥10 % plus an unexplained fall in EF → PVC-induced cardiomyopathy), mono- vs polymorphic shape and coupling interval (<300 ms high risk), not by Lown grades.',
          'Tres o más latidos ventriculares consecutivos a >100 lpm = TVNS; describe las extrasístoles ventriculares por carga (≥10 % más caída inexplicada de la FEVI → miocardiopatía inducida por extrasístoles), mono- o polimorfismo y acoplamiento (<300 ms de alto riesgo), no por grados de Lown.',
        ),
        l(
          '又宽又早的搏动：前面有 P′、V1 呈 rSR′、起始向量同窦性、间歇不完全代偿 → 差异性传导；无 P′、联律固定、完全代偿 → 室早。',
          'A wide early beat: a preceding P′, rSR′ in V1, the initial vector as in sinus and a less-than-compensatory pause → aberrancy; no P′, fixed coupling, full compensation → PVC.',
          'Un latido ancho y precoz: P′ precedente, rSR′ en V1, vector inicial como el sinusal y pausa menos que compensatoria → aberrancia; sin P′, acoplamiento fijo y compensación completa → extrasístole ventricular.',
        ),
      ],
    },
  ],
  sources: [
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307',
    'Castellano et al. 2004',
  ],
};

export default lesson;
