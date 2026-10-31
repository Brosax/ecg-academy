/**
 * t3 — Atrial flutter in depth (docs/PLAN.md §3, stage T).
 * Criteria: docs/curriculum/criteria.md `flutter-criteria` (current values) and the missing-book bullets:
 * atrial flutter with 2:1 conduction / variable block recognition, vagal manoeuvres and adenosine diagnostic response.
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
const STRIP_V1 = { layout: 'strip', lead: 'V1' } as const;

const lesson: Lesson = {
  id: 't3',
  stage: 'T',
  order: 3,
  title: l('心房扑动详解', 'Atrial flutter in depth', 'El flutter auricular en profundidad'),
  summary: l(
    '心房扑动是绕三尖瓣环、经下腔静脉-三尖瓣峡部的大折返，房率约 300 次/分：II、III、aVF 负向锯齿状 F 波、无等电位线、V1 直立。读图的任务是找到 F 波并写出传导比例——任何约 150 次/分的规则窄 QRS 心动过速都要先找第二个 F。',
    'Atrial flutter is a macro-re-entry around the tricuspid annulus through the cavotricuspid isthmus at about 300/min: negative sawtooth F waves in II, III and aVF with no isoelectric baseline, positive in V1. The reading task is to find the F waves and state the conduction ratio — any regular narrow-QRS tachycardia at about 150/min deserves a hunt for the second F.',
    'El flutter auricular es una macroreentrada alrededor del anillo tricuspídeo a través del istmo cavotricuspídeo, a unos 300 lpm: ondas F en diente de sierra negativas en II, III y aVF sin línea isoeléctrica, positivas en V1. La tarea de lectura es encontrar las ondas F y expresar la proporción de conducción: toda taquicardia regular de QRS estrecho a unos 150 lpm merece una búsqueda de la segunda onda F.',
  ),
  objectives: [
    l(
      '描述典型（逆钟向、峡部依赖）房扑的环路与心电图特征：房率 250–330 次/分，II/III/aVF 负向锯齿 F 波、无等电位线，V1 直立；并说出顺钟向（反向典型）变异。',
      'Describe the circuit and ECG signature of typical (counter-clockwise, CTI-dependent) flutter: atrial rate 250-330/min, negative sawtooth F waves with no isoelectric baseline in II/III/aVF, positive in V1; and name the clockwise (reverse-typical) variant.',
      'Describir el circuito y la firma electrocardiográfica del flutter típico (antihorario, istmodependiente): frecuencia auricular de 250-330 lpm, ondas F en diente de sierra negativas sin línea isoeléctrica en II/III/aVF, positivas en V1; y nombrar la variante horaria (típico inverso).',
    ),
    l(
      '对任何约 150 次/分的规则窄 QRS 心动过速，在 II、III、aVF 和 V1 里搜第二个 F 波，用分规量 F–F 得出房率与传导比例。',
      'On any regular narrow-QRS tachycardia at about 150/min, search for the second F wave in II, III, aVF and V1, and measure the F–F with calipers to get the atrial rate and the conduction ratio.',
      'Ante cualquier taquicardia regular de QRS estrecho a unos 150 lpm, buscar la segunda onda F en II, III, aVF y V1 y medir el F–F con el compás para obtener la frecuencia auricular y la proporción de conducción.',
    ),
    l(
      '用 RR 是否聚集在恒定 F–F 的整数倍上，把比例不等的房扑与心房颤动区分开。',
      'Separate flutter with variable block from atrial fibrillation by whether the RR intervals cluster at multiples of a constant F–F.',
      'Distinguir el flutter con conducción variable de la fibrilación auricular según si los RR se agrupan en múltiplos de un F–F constante.',
    ),
    l(
      '说出迷走手法/腺苷对房扑的诊断性反应，以及 Ic 类药/胺碘酮致 1:1 下传伴宽 QRS 的急症。',
      'State the diagnostic response of flutter to vagal manoeuvres/adenosine, and the emergency of 1:1 conduction with a wide QRS after class IC drugs or amiodarone.',
      'Enunciar la respuesta diagnóstica del flutter a las maniobras vagales/adenosina y la urgencia de la conducción 1:1 con QRS ancho tras antiarrítmicos IC o amiodarona.',
    ),
  ],
  minutes: 15,
  competencies: ['C9', 'C2'],
  findings: ['atrial-flutter'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('atrial-flutter', 641, { conductionRatio: 2 }),
      view: STRIP,
      question: l(
        '69 岁男性，心悸、活动后气短 3 天。这条 II 导联节律条：规则、约 150 次/分、QRS 窄。第二个心房波在哪里？先想好你的判断，再往下读。',
        'A 69-year-old man, palpitations and exertional dyspnoea for 3 days. This lead II strip: regular, about 150/min, narrow QRS. Where is the second atrial wave? Commit to an answer before reading on.',
        'Varón de 69 años, palpitaciones y disnea de esfuerzo desde hace 3 días. Esta tira de derivación II: regular, unos 150 lpm, QRS estrecho. ¿Dónde está la segunda onda auricular? Decide una respuesta antes de seguir.',
      ),
      reveal: l(
        '**锯齿来了。** II 导联的基线不是平的：一串负向锯齿状 **F 波**，F–F ≈ 200 ms ⇒ **心房率约 300 次/分**。房室结每两个 F 只下传一个：**典型心房扑动，2:1 下传**。你看不见第二个 F，因为它恰好藏在 QRS–T 里。任何约 150 次/分的规则窄 QRS 心动过速，第一件事都是搜第二个 F。',
        '**There is the sawtooth.** The baseline in II is not flat: a train of negative sawtooth **F waves** with F–F about 200 ms, so an **atrial rate of about 300/min**. The AV node conducts only every second F: **typical atrial flutter with 2:1 conduction**. You cannot see the second F because it sits exactly inside the QRS–T. With any regular narrow-QRS tachycardia at about 150/min, the first job is to hunt the second F.',
        '**Ahí está el diente de sierra.** La línea de base en II no es plana: un tren de **ondas F** negativas en diente de sierra con un F–F de unos 200 ms, es decir, una **frecuencia auricular de unos 300 lpm**. El nodo AV conduce solo una de cada dos F: **flutter auricular típico con conducción 2:1**. La segunda F no se ve porque cae justo dentro del QRS–T. Ante cualquier taquicardia regular de QRS estrecho a unos 150 lpm, la primera tarea es buscar la segunda F.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('atrial-flutter', 642, { conductionRatio: 2 }),
      emphasize: ['ra', 'av-node'],
      showConduction: true,
      caption: l(
        '环路在右心房：激动绕三尖瓣环运行，每圈都穿过**下腔静脉-三尖瓣峡部（CTI）**。逆钟向、每圈约 200 ms ⇒ 心房率约 300 次/分。峡部是必经之路，所以一条经峡部的线性消融即可根治。房室结不应期约 300 ms，只能放过每两个 F 中的一个——心电图上就是 2:1 下传。',
        'The loop lives in the right atrium: the wavefront circles the tricuspid annulus and crosses the **cavotricuspid isthmus (CTI)** on every lap. Counter-clockwise, about 200 ms per lap, so an atrial rate of about 300/min. The isthmus is the obligate passage, which is why one ablation line across it is curative. The AV node, refractory for roughly 300 ms, lets through only one F in two — on the ECG that is 2:1 conduction.',
        'El circuito está en la aurícula derecha: el frente de excitación rodea el anillo tricuspídeo y cruza el **istmo cavotricuspídeo (ICT)** en cada vuelta. Antihorario, unos 200 ms por vuelta, es decir, una frecuencia auricular de unos 300 lpm. El istmo es el paso obligado, y por eso una sola línea de ablación a través de él es curativa. El nodo AV, refractario unos 300 ms, deja pasar solo una F de cada dos: en el ECG eso es una conducción 2:1.',
      ),
    },
    {
      kind: 'text',
      title: l('三个名字，一个峡部', 'Three names, one isthmus', 'Tres nombres, un istmo'),
      body: l(
        '心房扑动的核心是一个**大折返环**：激动绕三尖瓣环运行，必经**下腔静脉-三尖瓣峡部（CTI）**。\n- **典型房扑（逆钟向，峡部依赖）**：房率约 250–330 次/分（约 300）；II、III、aVF 呈**负向锯齿状 F 波**，波与波之间**没有等电位线**；V1 的 F 波**直立**。\n- **反向典型房扑（顺钟向，仍为峡部依赖）**：下壁导联 F 波**宽大直立**，V1 负向或双峰——同一个环、反着转，峡部消融同样根治。\n- **不典型房扑**：非峡部依赖的大折返（心房瘢痕、心脏外科术后等），形态不符合典型环路——**"不典型"不等于"下壁 F 波直立"**。\n心房约 300 次/分、房室结每两个 F 下传一个，心室率就落在约 150 次/分——这就是你最常见的房扑心电图。',
        'The core of atrial flutter is one **macro-re-entry loop**: the wavefront circles the tricuspid annulus and must cross the **cavotricuspid isthmus (CTI)**.\n- **Typical flutter (counter-clockwise, CTI-dependent)**: atrial rate about 250-330/min (about 300); **negative sawtooth F waves** in II, III and aVF with **no isoelectric baseline** between them; F **upright** in V1.\n- **Reverse-typical flutter (clockwise, still CTI-dependent)**: **broad positive** F waves in the inferior leads, negative or bifid in V1 — the same loop turning the other way, cured by the same isthmus line.\n- **Atypical flutter**: a non-CTI macro-re-entry (atrial scar, after cardiac surgery) whose morphology does not match the typical circuits — **"atypical" does not simply mean "positive F waves inferiorly"**.\nWith the atria near 300/min and the AV node passing every second F, the ventricles sit near 150/min — the flutter ECG you will meet most often.',
        'El núcleo del flutter auricular es una única **macroreentrada**: el frente rodea el anillo tricuspídeo y tiene que cruzar el **istmo cavotricuspídeo (ICT)**.\n- **Flutter típico (antihorario, istmodependiente)**: frecuencia auricular de unos 250-330 lpm (unas 300); **ondas F en diente de sierra negativas** en II, III y aVF, **sin línea isoeléctrica** entre ellas; F **positiva** en V1.\n- **Flutter típico inverso (horario, también istmodependiente)**: ondas F **anchas y positivas** en las derivaciones inferiores, negativas o bifásicas en V1: el mismo circuito girando al revés, curado con la misma línea en el istmo.\n- **Flutter atípico**: macroreentrada no istmodependiente (cicatriz auricular, poscirugía cardíaca) cuya morfología no encaja con los circuitos típicos; **"atípico" no significa simplemente "F positivas en las inferiores"**.\nCon las aurículas a unas 300 lpm y el nodo AV dejando pasar una F de cada dos, los ventrículos quedan en unos 150 lpm: el ECG de flutter que verás con más frecuencia.',
      ),
    },
    {
      kind: 'criteria',
      title: l('心房扑动：判读数值', 'Atrial flutter: reading values', 'Flutter auricular: valores de lectura'),
      items: [
        {
          label: l('典型（逆钟向，峡部依赖）', 'Typical (counter-clockwise, CTI-dependent)', 'Típico (antihorario, istmodependiente)'),
          value: l(
            '房率 250–330 次/分（约 300）；II/III/aVF 负向锯齿状 F 波、无等电位线；V1 F 波直立',
            'Atrial rate 250-330/min (about 300); negative sawtooth F waves, no isoelectric baseline in II/III/aVF; F upright in V1',
            'Frecuencia auricular 250-330 lpm (unas 300); ondas F en diente de sierra negativas, sin línea isoeléctrica en II/III/aVF; F positiva en V1',
          ),
        },
        {
          label: l('反向典型（顺钟向）', 'Reverse-typical (clockwise)', 'Típico inverso (horario)'),
          value: l(
            '下壁导联宽大直立 F 波；V1 负向或双峰；仍为峡部依赖',
            'Broad positive F waves in the inferior leads; negative or bifid in V1; still CTI-dependent',
            'Ondas F anchas y positivas en las derivaciones inferiores; negativas o bifásicas en V1; sigue istmodependiente',
          ),
        },
        {
          label: l('不典型房扑', 'Atypical flutter', 'Flutter atípico'),
          value: l('非峡部依赖的大折返（瘢痕、术后）——不等于"下壁 F 波直立"', 'A non-CTI macro-re-entry (scar, post-operative) — not the same as "positive inferior F waves"', 'Macroreentrada no istmodependiente (cicatriz, posquirúrgica): no equivale a "F positivas en las inferiores"'),
        },
        {
          label: l('未治疗 2:1 下传', 'Untreated 2:1 conduction', 'Conducción 2:1 sin tratamiento'),
          value: l('心室率约 150 次/分——规则的约 150 次/分窄 QRS 心动过速都要搜第二个 F', 'Ventricular rate about 150/min — search for the second F in any regular narrow-QRS tachycardia near 150/min', 'Frecuencia ventricular de unos 150 lpm: busca la segunda F en toda taquicardia regular de QRS estrecho cerca de 150 lpm'),
        },
        {
          label: l('比例不等下传', 'Variable block', 'Conducción variable'),
          value: l('不规则，但 RR 聚集在恒定 F–F 的整数倍；房颤的房波频率与形态均不定', 'Irregular, but the RR clusters at multiples of a constant F–F; in AF the atrial activity varies in rate and morphology', 'Irregular, pero los RR se agrupan en múltiplos de un F–F constante; en la FA la actividad auricular varía en frecuencia y morfología'),
        },
        {
          label: l('1:1 下传', '1:1 conduction', 'Conducción 1:1'),
          value: l(
            'Ic 类药或胺碘酮把房扑减慢到 < 200 次/分后可发生；常为宽 QRS、貌似室速——急症',
            'Can occur when class IC drugs or amiodarone slow flutter below 200/min; often wide-QRS, mimicking VT — an emergency',
            'Puede ocurrir cuando un antiarrítmico IC o la amiodarona enlentece el flutter por debajo de 200 lpm; a menudo con QRS ancho, simulando una TV: urgencia',
          ),
        },
      ],
      source:
        'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720; Page RL et al. 2015 ACC/AHA/HRS Guideline for the management of adult patients with supraventricular tachycardia. Circulation 2016;133:e506-e574',
    },
    {
      kind: 'worked',
      title: l('找 F 波：一条规则的 150 次/分', 'Hunting the F waves: a regular 150/min', 'Cazando las ondas F: una regular de 150 lpm'),
      ecg: synth('atrial-flutter', 643, { conductionRatio: 2 }),
      steps: [
        {
          title: l('规则吗？窄吗？', 'Regular? Narrow?', '¿Regular? ¿Estrecho?'),
          body: l(
            '分规量 RR：恒定，RR = 400 ms，即恰好 150 次/分；QRS 窄。规则 + 窄 + 约 150 次/分 ⇒ 进入 F 波搜索。',
            'March the RR with calipers: constant, RR = 400 ms, exactly 150/min; the QRS is narrow. Regular + narrow + about 150/min -> start the F-wave hunt.',
            'Recorre el RR con el compás: constante, RR = 400 ms, exactamente 150 lpm; el QRS es estrecho. Regular + estrecho + unos 150 lpm: comienza la búsqueda de las ondas F.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
          highlightLeads: ['II'],
        },
        {
          title: l('II 导联看基线：锯齿', 'Look at the baseline in II: sawtooth', 'Mira la línea de base en II: diente de sierra'),
          body: l(
            'QRS 之间的基线不是平的：一串负向锯齿波，波与波之间**没有等电位线**。分规量一下：F–F = 200 ms ⇒ **房率 300 次/分**。',
            'The baseline between QRS complexes is not flat: a train of negative sawtooth deflections with **no isoelectric line** between them. Measure with the calipers: F–F = 200 ms, so an **atrial rate of 300/min**.',
            'La línea de base entre los complejos QRS no es plana: un tren de deflexiones negativas en diente de sierra, **sin línea isoeléctrica** entre ellas. Mide con el compás: F–F = 200 ms, es decir, **frecuencia auricular de 300 lpm**.',
          ),
          marks: [{ auto: 'f-waves', label: l('F 波', 'F waves', 'ondas F') }],
          view: { layout: 'strip', lead: 'II', calipers: true },
          highlightLeads: ['II', 'III', 'aVF'],
        },
        {
          title: l('第二个 F 在哪里？', 'Where is the second F?', '¿Dónde está la segunda F?'),
          body: l(
            '两个下传的 F 之间还有一个 F：它藏在 **QRS–T 里**——你能看见的那个 F 搭在 T 波的降支上。每两个 F 一个 QRS：**2:1 下传**。所以"看不见"不等于"不存在"。',
            'Between two conducted F waves there is one more F: it hides **inside the QRS–T** — the one you can see rides on the descending limb of the T wave. One QRS per two F waves: **2:1 conduction**. "Not visible" does not mean "not there".',
            'Entre dos F conducidas hay una F más: se esconde **dentro del QRS–T**; la que sí ves cabalga sobre la rama descendente de la onda T. Un QRS por cada dos F: **conducción 2:1**. "No visible" no significa "inexistente".',
          ),
          marks: [{ auto: 'f-waves', label: l('F 波', 'F waves', 'ondas F') }, { auto: 'qrs' }, { auto: 't' }],
        },
        {
          title: l('V1 证实并收尾', 'Confirm in V1 and close', 'Confirma en V1 y cierra'),
          body: l(
            'V1 的 F 波**直立**、间距仍为 200 ms——负向下壁 + 直立 V1 = 逆钟向典型房扑。迷走手法或腺苷会把阻滞提到 4:1，两个 F 都站出来，而房扑照旧。诊断：**典型心房扑动，2:1 下传，心室率约 150 次/分**。',
            'In V1 the F waves are **upright**, still 200 ms apart — negative inferiorly + upright in V1 = counter-clockwise typical flutter. A vagal manoeuvre or adenosine would raise the block to 4:1 and let both F waves stand free while the flutter continues. Diagnosis: **typical atrial flutter with 2:1 conduction, ventricular rate about 150/min**.',
            'En V1 las ondas F son **positivas**, separadas todavía 200 ms: negativas en las inferiores + positivas en V1 = flutter típico antihorario. Una maniobra vagal o adenosina elevaría el bloqueo a 4:1 y dejaría las dos F a la vista mientras el flutter sigue. Diagnóstico: **flutter auricular típico con conducción 2:1, frecuencia ventricular de unos 150 lpm**.',
          ),
          marks: [{ auto: 'f-waves', lead: 'V1', label: l('F 波（V1 直立）', 'F waves (upright in V1)', 'ondas F (positivas en V1)') }],
          view: STRIP_V1,
          highlightLeads: ['V1'],
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'atrial-flutter',
      seed: 644,
      dials: [{ id: 'conductionRatio' }],
      view: STRIP,
      marks: [{ auto: 'f-waves' }],
      caption: l(
        '拖动传导比例 2 → 3 → 4：心室率一档一档地降——150 → 100 → 75 次/分——而**心房率始终约 300**。比例越大，落在 QRS–T 之外的 F 波越多，锯齿越清楚。诊断始终是同一个房扑，变的只是传导比例：所以报告要写比例，不能只写"房扑"。',
        'Drag the conduction ratio from 2 to 3 to 4: the ventricular rate steps down — 150, then 100, then 75/min — while the **atrial rate stays at about 300**. The higher the ratio, the more F waves fall outside the QRS–T and the clearer the sawtooth. The diagnosis is the same flutter throughout; only the ratio changes — which is why your report must state the ratio, not just "flutter".',
        'Arrastra la proporción de conducción de 2 a 3 y a 4: la frecuencia ventricular baja escalón a escalón —150, 100, 75 lpm— mientras la **frecuencia auricular se mantiene en unas 300**. Cuanto mayor la proporción, más ondas F caen fuera del QRS–T y más nítido el diente de sierra. El diagnóstico es el mismo flutter todo el tiempo; solo cambia la proporción, y por eso el informe debe indicarla: no basta con escribir "flutter".',
      ),
    },
    {
      kind: 'contrast',
      title: l('同样 75 次/分：4:1 房扑还是窦性？', 'The same 75/min: 4:1 flutter or sinus?', 'Los mismos 75 lpm: ¿flutter 4:1 o sinusal?'),
      view: STRIP,
      left: {
        ecg: synth('atrial-flutter', 645, { conductionRatio: 4 }),
        caption: l('4:1 房扑：心室 75 次/分，QRS 之间三个 F', '4:1 flutter: ventricles at 75/min, three F waves between QRS complexes', 'Flutter 4:1: ventrículos a 75 lpm, tres ondas F entre los QRS'),
        marks: [{ auto: 'f-waves', label: l('F 波', 'F waves', 'ondas F') }],
      },
      right: {
        ecg: synth('normal', 646, { rate: 75 }),
        caption: l('窦性心律，75 次/分', 'Sinus rhythm at 75/min', 'Ritmo sinusal a 75 lpm'),
        marks: [{ auto: 'p' }],
      },
      point: l(
        '心室率相同，心房真相完全不同：**左**每个 QRS 前有三个 F 波、锯齿相连、没有等电位线——房扑 4:1；**右**每个 QRS 前只有一个 P 波，P 前后有平坦的等电位线、PR 恒定。慢而不至于快的心动过速也可能是房扑：数心房波，别只数 QRS。',
        'Identical ventricular rate, completely different atrial truth: on the **left** three F waves precede every QRS, linked in a sawtooth with no isoelectric line — 4:1 flutter; on the **right** one P wave before every QRS, with a flat baseline around it and a constant PR. A flutter can hide at a harmless-looking rate: count the atrial waves, not just the QRS complexes.',
        'La misma frecuencia ventricular, una verdad auricular totalmente distinta: a la **izquierda** tres ondas F preceden cada QRS, encadenadas en diente de sierra sin línea isoeléctrica (flutter 4:1); a la **derecha** una sola P antes de cada QRS, con línea de base plana a su alrededor y PR constante. Un flutter puede esconderse tras una frecuencia inofensiva: cuenta las ondas auriculares, no solo los QRS.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('atrial-flutter', 648, undefined, 'clockwise'),
      view: STRIP,
      marks: [{ auto: 'f-waves', label: l('F 波（下壁直立）', 'F waves (positive inferiorly)', 'ondas F (positivas en las inferiores)') }],
      caption: l(
        '顺钟向（反向典型）房扑（本条约 4:1 下传）：下壁导联 F 波**宽大直立**而非负向锯齿，V1 负向或双峰——同一个峡部环路反着转。别因为"下壁 F 直立"就叫它不典型房扑：它仍是峡部依赖，峡部消融线照样根治。',
        'Clockwise (reverse-typical) flutter (about 4:1 conduction here): in the inferior leads the F waves are **broad and positive**, not negative sawtooth, and V1 is negative or bifid — the same isthmus loop turning the other way. Do not call it "atypical" just because the inferior F is upright: it is still CTI-dependent and the same isthmus ablation line cures it.',
        'Flutter horario (típico inverso; aquí con conducción de unos 4:1): en las derivaciones inferiores las ondas F son **anchas y positivas**, no un diente de sierra negativo, y V1 es negativa o bifásica: el mismo circuito del istmo girando al revés. No lo llames "atípico" solo porque la F inferior sea positiva: sigue istmodependiente y la misma línea de ablación en el istmo lo cura.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('atrial-flutter', 647, undefined, 'variable'),
      view: STRIP,
      marks: [{ auto: 'f-waves' }, { auto: 'rr' }],
      caption: l(
        '比例不等的房扑：RR 看着乱，但分规一卡就现原形——**每个 RR 都接近恒定 F–F（200 ms）的整数倍**（本条约 3 到 5 倍，房室传导时间的小差异让它不完全整齐）——心房的"钟"从未变过。房颤没有这口钟：房波频率与形态都在变（t2）。所以下一步是找 F，不是先写"房颤"。',
        'Flutter with variable block: the RR looks chaotic, but the calipers give it away — **every RR sits close to a multiple of the constant F–F (200 ms)** (three to five times on this strip; small differences in AV conduction time keep it from being exact) — the atrial "clock" never changes. AF has no such clock: its atrial activity varies in rate and morphology (t2). So the next step is to find the F waves, not to write "AF".',
        'Flutter con conducción variable: el RR parece caótico, pero el compás lo delata: **cada RR queda cerca de un múltiplo del F–F constante (200 ms)** (de tres a cinco veces en esta tira; pequeñas diferencias en el tiempo de conducción AV impiden que sea exacto): el "reloj" auricular no cambia nunca. La FA no tiene ese reloj: su actividad auricular varía en frecuencia y morfología (t2). Por eso el paso siguiente es buscar las ondas F, no escribir "FA".',
      ),
    },
    {
      kind: 'text',
      title: l('让 F 波显形，以及 1:1 急症', 'Unmasking the F waves — and the 1:1 emergency', 'Destapar las ondas F y la urgencia de la 1:1'),
      body: l(
        '**迷走手法与腺苷几乎从不终止房扑**——它们提高房室阻滞，把 F 波全部暴露出来。诊断反应要背下来：\n- **一过性房室阻滞而房性心动过速继续** ⇒ 房速或房扑（不依赖房室结）。\n- **终止且最后一个事件是 P′** ⇒ 依赖房室结的心动过速（AVNRT/AVRT，t1），房速可能性很小。\n- **逐渐减慢再加快** ⇒ 窦性心动过速或自律性房速。\n给药时**全程记录 12 导联**——反应只出现一次，错过就没了。\n**1:1 下传是急症**：Ic 类药（氟卡尼、普罗帕酮）或胺碘酮可把房扑减慢到 < 200 次/分，房室结便能每圈都下传——规则的、约 200 次/分以上的**宽 QRS** 心动过速（频率依赖性差异传导），貌似室速。正在服 Ic 类药的患者突然出现规则的极快宽 QRS 心动过速：先想到房扑 1:1。',
        '**Vagal manoeuvres and adenosine almost never terminate flutter** — they raise the AV block and uncover all the F waves. Learn the diagnostic responses by heart:\n- **Transient AV block with the atrial tachycardia continuing** -> AT or flutter (AV-node-independent).\n- **Termination with the last event a P′** -> an AV-node-dependent tachycardia (AVNRT/AVRT, t1); AT very unlikely.\n- **Gradual slowing and then re-acceleration** -> sinus tachycardia or automatic AT.\nKeep a **12-lead running while the drug goes in** — the response happens once; miss it and it is gone.\n**1:1 conduction is an emergency**: class IC drugs (flecainide, propafenone) or amiodarone can slow flutter below 200/min, and the AV node can then conduct every lap — a regular, very fast (about 200/min or more) **wide-QRS** tachycardia (rate-related aberrancy) that mimics VT. A patient on a class IC drug who suddenly develops a regular, extremely fast wide-QRS tachycardia: think flutter with 1:1 conduction first.',
        '**Las maniobras vagales y la adenosina casi nunca terminan el flutter**: aumentan el bloqueo AV y dejan todas las ondas F a la vista. Aprende de memoria las respuestas diagnósticas:\n- **Bloqueo AV transitorio con la taquicardia auricular persistente** -> TA o flutter (independiente del nodo AV).\n- **Terminación con la P′ como último evento** -> taquicardia dependiente del nodo AV (TRIN/TRAV, t1); la TA es muy improbable.\n- **Enlentecimiento gradual y reaceleración** -> taquicardia sinusal o TA automática.\nMantén un **ECG de 12 derivaciones grabando mientras se administra el fármaco**: la respuesta ocurre una sola vez y, si se pierde, se perdió.\n**La conducción 1:1 es una urgencia**: los antiarrítmicos IC (flecainida, propafenona) o la amiodarona pueden enlentecer el flutter por debajo de 200 lpm y el nodo AV puede entonces conducir cada vuelta: una taquicardia regular, muy rápida (unos 200 lpm o más) y de **QRS ancho** (aberrancia por frecuencia) que simula una TV. Un paciente con un antiarrítmico IC que presenta de golpe una taquicardia regular, rapidísima y de QRS ancho: piensa primero en un flutter con conducción 1:1.',
      ),
    },
    { kind: 'check', item: { family: 'narrow-tachy', seed: 9 } },
    { kind: 'check', item: { family: 'rate-atrial', seed: 26 } },
    { kind: 'check', item: { family: 'irregular', seed: 8 } },
    { kind: 'drill', families: ['narrow-tachy', 'irregular'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [7159, 2739, 2430],
      caption: l(
        '三份真实心电图，PTB-XL 心脏病学家均标注为 AFLT（心房扑动）。先别看标签：在 II、III、aVF 和 V1 找 F 波，量 F–F，对每份**先承诺**旋转方向与传导比例（顺钟向还是逆钟向？2:1、4:1 还是不等比？），再揭晓。两份约 140–150 次/分，一份不到 50 次/分——慢的那份，比例是多少？',
        'Three real tracings the PTB-XL cardiologists all labelled AFLT (atrial flutter). Ignore the label for now: find the F waves in II, III, aVF and V1, measure the F–F, and **commit** to the rotation and the conduction ratio for each (clockwise or counter-clockwise? 2:1, 4:1 or variable?) before the reveal. Two run at about 140-150/min and one below 50/min — what is the ratio of the slow one?',
        'Tres ECG reales que los cardiólogos de PTB-XL etiquetaron todos como AFLT (flutter auricular). Ignora la etiqueta por ahora: busca las ondas F en II, III, aVF y V1, mide el F–F y **comprométete** con el sentido de rotación y la proporción de conducción de cada uno (¿horario o antihorario? ¿2:1, 4:1 o variable?) antes de la revelación. Dos van a unos 140-150 lpm y uno por debajo de 50 lpm: ¿qué proporción tiene el lento?',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把约 150 次/分的规则窄 QRS 心动过速写成"SVT"了事——不搜 F 波，就会漏掉房扑这个可用一条消融线根治的诊断。',
          'Signing off a regular narrow-QRS tachycardia at about 150/min as plain "SVT" — without the F-wave search you miss flutter, a diagnosis one ablation line can cure.',
          'Cerrar una taquicardia regular de QRS estrecho a unos 150 lpm como "TSV" a secas: sin buscar las ondas F se escapa el flutter, un diagnóstico que una sola línea de ablación cura.',
        ),
        l(
          '把比例不等的房扑叫成房颤——房扑的 RR 聚集在恒定 F–F 的整数倍上；房颤的房波频率和形态都在变。',
          'Calling flutter with variable block "AF" — in flutter the RR intervals cluster at multiples of a constant F–F; in AF the atrial activity varies in rate and morphology.',
          'Llamar "FA" al flutter con conducción variable: en el flutter los RR se agrupan en múltiplos de un F–F constante; en la FA la actividad auricular varía en frecuencia y morfología.',
        ),
        l(
          '把 F 波当成 P 波——锯齿波之间没有等电位线；真正的 P 波前有 PR 段、形态圆钝，且一 P 一 QRS。',
          'Reading F waves as P waves — the sawtooth has no isoelectric baseline between deflections; a true P is rounded, followed by a PR segment, and there is exactly one P per QRS.',
          'Leer las ondas F como ondas P: el diente de sierra no tiene línea isoeléctrica entre deflexiones; una P verdadera es redondeada, va seguida de un segmento PR, y hay exactamente una P por QRS.',
        ),
        l(
          '漏掉 Ic 类药/胺碘酮后的 1:1 房扑：规则的极快宽 QRS 心动过速貌似室速——那是需要立即处理的急症。',
          'Missing flutter with 1:1 conduction after a class IC drug or amiodarone: a regular, extremely fast wide-QRS tachycardia mimicking VT — an emergency that needs immediate action.',
          'No reconocer el flutter con conducción 1:1 tras un antiarrítmico IC o amiodarona: una taquicardia regular, rapidísima y de QRS ancho que simula una TV; es una urgencia que exige actuación inmediata.',
        ),
        l(
          '见到下壁 F 波直立就叫"不典型房扑"——顺钟向（反向典型）房扑仍走峡部、峡部消融照样根治；"不典型"指非峡部依赖的瘢痕相关大折返。',
          'Calling every flutter with positive inferior F waves "atypical" — clockwise (reverse-typical) flutter still runs through the isthmus and is cured by the same line; "atypical" means a non-CTI, scar-related macro-re-entry.',
          'Llamar "flutter atípico" a todo flutter con F positivas en las inferiores: el flutter horario (típico inverso) sigue pasando por el istmo y se cura con la misma línea; "atípico" significa una macroreentrada no istmodependiente sobre cicatriz.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '典型房扑 = 峡部依赖、逆钟向大折返，房率 250–330 次/分：II/III/aVF 负向锯齿 F、无等电位线，V1 直立；顺钟向则下壁 F 宽大直立、V1 负向或双峰，仍为峡部依赖。',
          'Typical flutter = CTI-dependent counter-clockwise macro-re-entry at 250-330/min: negative sawtooth F with no isoelectric baseline in II/III/aVF, upright in V1; clockwise gives broad positive inferior F and negative/bifid V1, still CTI-dependent.',
          'Flutter típico = macroreentrada antihoraria istmodependiente a 250-330 lpm: F en diente de sierra negativo sin línea isoeléctrica en II/III/aVF, positiva en V1; el horario da F inferiores anchas y positivas con V1 negativa o bifásica, también istmodependiente.',
        ),
        l(
          '未治疗 2:1 下传 ⇒ 心室率约 150 次/分：任何规则的约 150 次/分窄 QRS 心动过速都要在 II、III、aVF、V1 搜第二个 F（常藏在 T 波里、V1 上）。',
          'Untreated 2:1 conduction gives a ventricular rate of about 150/min: in any regular narrow-QRS tachycardia near 150/min, hunt the second F in II, III, aVF and V1 (usually inside the T wave, and in V1).',
          'La conducción 2:1 sin tratamiento da una frecuencia ventricular de unos 150 lpm: en toda taquicardia regular de QRS estrecho cerca de 150 lpm, busca la segunda F en II, III, aVF y V1 (normalmente dentro de la onda T y en V1).',
        ),
        l(
          '报告要写传导比例：2:1/3:1/4:1 心室率不同，诊断相同；比例不等 ⇒ 不规则，但 RR 聚集在恒定 F–F（约 200 ms）的整数倍——这是它与房颤的分界。',
          'State the conduction ratio in your report: 2:1, 3:1 and 4:1 differ in ventricular rate but not in diagnosis; variable block is irregular, yet the RR clusters at multiples of the constant F–F (about 200 ms) — the line that separates it from AF.',
          'Indica la proporción de conducción en el informe: 2:1, 3:1 y 4:1 difieren en la frecuencia ventricular pero no en el diagnóstico; la conducción variable es irregular, pero los RR se agrupan en múltiplos del F–F constante (unos 200 ms): esa es la línea que la separa de la FA.',
        ),
        l(
          '迷走手法/腺苷提高阻滞、暴露 F 而不终止房扑（诊断反应）；Ic 类药/胺碘酮减慢房扑可致 1:1 下传、宽 QRS 貌似室速——急症。',
          'Vagal manoeuvres/adenosine raise the block and unmask the F waves without terminating flutter (the diagnostic response); class IC drugs/amiodarone can slow flutter into 1:1 conduction with a wide QRS mimicking VT — an emergency.',
          'Las maniobras vagales y la adenosina elevan el bloqueo y destapan las ondas F sin terminar el flutter (la respuesta diagnóstica); los antiarrítmicos IC y la amiodarona pueden enlentecer el flutter hasta una conducción 1:1 con QRS ancho que simula una TV: urgencia.',
        ),
      ],
    },
  ],
  sources: [
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    'Page RL et al. 2015 ACC/AHA/HRS Guideline for the management of adult patients with supraventricular tachycardia. Circulation 2016;133:e506-e574',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
