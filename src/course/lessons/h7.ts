/**
 * h7 — Long QT (congenital and drug-induced) and short QT (docs/PLAN.md §3, stage H).
 * Criteria: docs/curriculum/criteria.md `qtc-bazett`, `qt-max-table`, `qt-causes`, `torsades-causes` (current values),
 * plus the "Missing in the book" bullets on QT measurement / correction / thresholds and drug-induced QT prolongation
 * (torsade risk) under `rate-rhythm-intervals-axis`, and on congenital LQTS and short QT syndrome under
 * `electrolytes-drugs-misc-conditions`.
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
const GRID = { layout: '3x4+1' } as const;

const lesson: Lesson = {
  id: 'h7',
  stage: 'H',
  order: 7,
  title: l('长QT（先天性与药物性）与短QT', 'Long QT (congenital and drug-induced) and short QT', 'QT largo (congénito y farmacológico) y QT corto'),
  summary: l(
    'QT 从最早 QRS 起点量到 T 波终点：切线法、QT 最长的导联、剔除 U 波，再按心率校正并与性别阈值比较——≥450 ms（男）/≥460 ms（女）为延长，复查 ≥480 ms 诊断长QT综合征，>500 ms 或增幅 >60 ms 为尖端扭转型室速高危；短 QT ≤360 ms 加一项特征考虑短QT综合征，先排除高钙血症与地高辛。',
    'The QT runs from the earliest QRS onset to the T end: tangent method, longest-QT lead, U wave excluded, then corrected for rate and read against sex-specific thresholds — >=450 ms (men) / >=460 ms (women) is prolonged, >=480 ms on repeated ECGs diagnoses long QT syndrome, and >500 ms or a rise >60 ms means high torsade risk; a short QT <=360 ms with one more feature suggests short QT syndrome once hypercalcaemia and digoxin are excluded.',
    'El QT va del inicio más precoz del QRS al final de la T: método de la tangente, derivación con el QT más largo, onda U excluida, corregido después por frecuencia y comparado con umbrales por sexo —>=450 ms (varones) / >=460 ms (mujeres) es prolongado, >=480 ms en ECG repetidos diagnostica síndrome del QT largo y >500 ms o un aumento >60 ms implica alto riesgo de torsade—; un QT corto <=360 ms con otra característica sugiere síndrome del QT corto, tras excluir hipercalcemia y digoxina.',
  ),
  objectives: [
    l(
      '规范测量 QT（切线法定 T 终点、取 QT 最长导联、剔除 U 波），并选择正确的心率校正式——Bazett 的适用范围、Fridericia/Framingham/Hodges、宽 QRS 时用 JT。',
      'Measure the QT properly (tangent method for the T end, longest-QT lead, U wave excluded) and choose the right rate correction — where Bazett fails, Fridericia/Framingham/Hodges, and the JT interval for a wide QRS.',
      'Medir bien el QT (método de la tangente para el final de la T, derivación con el QT más largo, onda U excluida) y elegir la corrección por frecuencia adecuada: dónde falla Bazett, Fridericia/Framingham/Hodges y el intervalo JT con QRS ancho.',
    ),
    l(
      '套用阈值：≥450 ms（男）/≥460 ms（女）为延长；复查 QTc ≥480 ms 或 Schwartz 评分 >3 诊断 LQTS，≥460 ms 加不明原因晕厥也要考虑；>500 ms 或用药后增幅 >60 ms 为 TdP 高危；运动员转诊阈值 470/480 ms。',
      'Apply the thresholds: >=450 ms (men) / >=460 ms (women) is prolonged; QTc >=480 ms on repeated ECGs or a Schwartz score >3 diagnoses LQTS, and >=460 ms with unexplained syncope also qualifies; >500 ms or a rise >60 ms on a drug is high torsade risk; the athlete referral cuts are 470/480 ms.',
      'Aplicar los umbrales: >=450 ms (varones) / >=460 ms (mujeres) es prolongado; QTc >=480 ms en ECG repetidos o puntuación de Schwartz >3 diagnostica LQTS, y >=460 ms con síncope inexplicado también cuenta; >500 ms o un aumento >60 ms con un fármaco es alto riesgo de torsade; los umbrales de derivación del deportista son 470/480 ms.',
    ),
    l(
      '识别基因型 T 波形态（LQT1 宽大 T、LQT2 低平双峰 T、LQT3 长 ST 后迟发尖 T）与获得性长 QT 的叠加因素（药物清单、低钾低镁低钙、心动过缓、肾功能不全）。',
      'Recognise the genotype T shapes (broad-based T in LQT1, low notched T in LQT2, a late peaked T after a long ST in LQT3) and the stack behind acquired long QT (the drug list, low K/Mg/Ca, bradycardia, renal impairment).',
      'Reconocer las morfologías de la T por genotipo (T de base ancha en LQT1, T baja con muesca en LQT2, T tardía y apuntada tras un ST largo en LQT3) y la suma detrás del QT largo adquirido (la lista de fármacos, K/Mg/Ca bajos, bradicardia, insuficiencia renal).',
    ),
    l(
      '识别短 QT（≤360 ms 加一项特征，T 高尖对称、几乎无 ST 段），并先排除继发原因（高钙血症、地高辛、高钾、高热）。',
      'Recognise a short QT (<=360 ms plus one more feature, tall peaked symmetric T with almost no ST) and exclude the secondary causes first (hypercalcaemia, digoxin, hyperkalaemia, hyperthermia).',
      'Reconocer un QT corto (<=360 ms más otra característica, T alta, apuntada y simétrica, casi sin ST) y excluir antes las causas secundarias (hipercalcemia, digoxina, hiperpotasemia, hipertermia).',
    ),
  ],
  minutes: 15,
  competencies: ['C4', 'C10'],
  findings: ['long-qt', 'short-qt'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('long-qt', 1321, { rate: 60 }),
      view: STRIP,
      question: l(
        '19 岁女性，在泳池里游第二个来回时晕厥，被救上岸。节律是窦性，心率约 60 次/分。先把 QT 测对——想清楚你的测量方法和数值，再决定这是不是"年轻人的血管迷走性晕厥"。',
        'A 19-year-old woman fainted in the pool during her second length and was pulled out. The rhythm is sinus at about 60/min. Measure the QT properly first — be clear how you measured it and what number you got, and only then decide whether this is just "vasovagal syncope in a young woman".',
        'Una mujer de 19 años sufrió un síncope mientras nadaba su segundo largo en la piscina y tuvieron que sacarla del agua. El ritmo es sinusal a unos 60 lpm. Mide primero bien el QT —ten claro cómo lo has medido y la cifra— y solo después decide si esto es un simple «síncope vasovagal de una joven».',
      ),
      reveal: l(
        'QT 占了 RR 的一半以上——粗查已经报警；认真测量（最早 QRS 起点至 T 波终点，切线法，剔除 U 波）加心率校正后 QTc 约 **515 ms**——≥480 ms，重复心电图仍然如此 ⇒ **长QT综合征（LQTS）**，而且已过 500 ms 的高危线；游泳或运动中晕厥正是它的典型故事。T 波形态还能提示基因型：本图是基底很宽的 T，像 LQT1（游泳是 LQT1 的经典触发）；LQT1 宽大 T、LQT2 低平或有切迹的 T、LQT3 长 ST 段后的迟发尖 T——但形态只提示，诊断靠数值加临床（Schwartz 评分）。别把每一个年轻人的晕厥都归给迷走神经。',
        'The QT takes more than half of the RR — the quick screen already alarms. Proper measurement (earliest QRS onset to T end, tangent method, U excluded) with rate correction gives a QTc of about **515 ms** — >=480 ms, confirmed on repeated ECGs => **long QT syndrome (LQTS)**, and already past the 500 ms high-risk line; syncope while swimming or exercising is exactly its story. The T shape even hints at the genotype: this one is broad-based, like LQT1 (swimming is the classic LQT1 trigger); broad-based T in LQT1, a low or notched T in LQT2, a late peaked T after a long ST in LQT3 — but the shape only suggests; the diagnosis is numbers plus the clinical picture (Schwartz score). Do not file every young person\'s syncope under "vagal".',
        'El QT ocupa más de la mitad del RR: el cribado rápido ya avisa. La medición correcta (del inicio más precoz del QRS al final de la T, método de la tangente, U excluida) con la corrección por frecuencia da un QTc de unos **515 ms** —>=480 ms, confirmado en ECG repetidos— => **síndrome del QT largo (LQTS)**, y ya por encima de la línea de alto riesgo de 500 ms; un síncope nadando o haciendo ejercicio es justo su historia. La morfología de la T incluso sugiere el genotipo: esta es de base ancha, como en el LQT1 (la natación es su desencadenante clásico); T de base ancha en LQT1, T baja o con muesca en LQT2, T tardía y apuntada tras un ST largo en LQT3; pero la morfología solo sugiere, y el diagnóstico son cifras más clínica (puntuación de Schwartz). No archives todo síncope juvenil como «vagal».',
      ),
    },
    {
      kind: 'criteria',
      title: l('QT 与 QTc 的阈值', 'QT and QTc thresholds', 'Umbrales del QT y del QTc'),
      items: [
        {
          label: l('测量', 'Measurement', 'Medición'),
          value: l(
            '最早 QRS 起点 → T 波终点；切线法；QT 最长的导联；剔除 U 波',
            'Earliest QRS onset -> T end; tangent method; lead with the longest QT; U wave excluded',
            'Inicio más precoz del QRS -> final de la T; método de la tangente; derivación con el QT más largo; onda U excluida',
          ),
        },
        {
          label: l('延长', 'Prolonged', 'Prolongado'),
          value: l('QTc ≥450 ms（男）/ ≥460 ms（女）', 'QTc >=450 ms (men) / >=460 ms (women)', 'QTc >=450 ms (varones) / >=460 ms (mujeres)'),
        },
        {
          label: l('LQTS 诊断', 'LQTS diagnosis', 'Diagnóstico de LQTS'),
          value: l(
            '复查 12 导联 QTc ≥480 ms，或 Schwartz 评分 >3；≥460 ms 加不明原因晕厥时也要考虑',
            'QTc >=480 ms on repeated 12-lead ECGs, or a Schwartz score >3; also consider it at >=460 ms with unexplained syncope',
            'QTc >=480 ms en ECG de 12 derivaciones repetidos o puntuación de Schwartz >3; considéralo también con >=460 ms y síncope inexplicado',
          ),
        },
        {
          label: l('TdP 高危', 'High torsade risk', 'Alto riesgo de torsade'),
          value: l(
            'QTc >500 ms，或用药后较基线增加 >60 ms',
            'QTc >500 ms, or a rise >60 ms from baseline on a drug',
            'QTc >500 ms o un aumento >60 ms respecto a la basal con un fármaco',
          ),
        },
        {
          label: l('运动员', 'Athletes', 'Deportistas'),
          value: l('转诊阈值：QTc ≥470 ms（男）/ ≥480 ms（女）', 'Referral thresholds: QTc >=470 ms (men) / >=480 ms (women)', 'Umbrales de derivación: QTc >=470 ms (varones) / >=480 ms (mujeres)'),
        },
        {
          label: l('短 QT', 'Short QT', 'QT corto'),
          value: l(
            '≤390 ms（AHA 标准）；SQTS：≤360 ms 加一项特征（致病突变、SQTS 家族史、无结构病的 VT/VF 生还）；≤320 ms 单独考虑',
            '<=390 ms (AHA standard); SQTS: <=360 ms plus one feature (pathogenic mutation, family history of SQTS, survived VT/VF without structural disease); consider at <=320 ms',
            '<=390 ms (estándar AHA); SQTS: <=360 ms más una característica (mutación patogénica, historia familiar de SQTS, supervivencia a TV/FV sin cardiopatía estructural); considéralo desde <=320 ms',
          ),
        },
        {
          label: l('校正', 'Correction', 'Corrección'),
          value: l(
            'Bazett 仅在约 60 次/分附近可靠；优先 Fridericia / Framingham / Hodges（尤其 >90 次/分）；QRS ≥120 ms 用 JT',
            'Bazett only near 60/min; prefer Fridericia / Framingham / Hodges (above all >90/min); with QRS >=120 ms use JT',
            'Bazett solo cerca de 60 lpm; prefiere Fridericia / Framingham / Hodges (sobre todo >90 lpm); con QRS >=120 ms usa JT',
          ),
        },
      ],
      source:
        'Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250; Drew BJ et al. Prevention of torsade de pointes in hospital settings. Circulation 2010;121:1047-1060; Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    },
    {
      kind: 'worked',
      title: l('一步一步：测量、校正、下结论', 'Step by step: measure, correct, call', 'Paso a paso: medir, corregir, concluir'),
      ecg: synth('long-qt', 1322, { rate: 60 }),
      view: GRID,
      steps: [
        {
          title: l('选 QT 最长的导联', 'Pick the lead with the longest QT', 'Elige la derivación con el QT más largo'),
          body: l(
            '逐导联比较 T 波终点，取 QT 最长者——本图 II 与 V5 都宽，量 II。取单导联读数，不要取机器的平均值。',
            'Compare the T end lead by lead and take the longest QT — here II and V5 are both broad; measure II. One lead\'s reading, never the machine\'s averaged value.',
            'Compara el final de la T derivación por derivación y toma el QT más largo —aquí II y V5 son ambas anchas; mide II—. La lectura de una derivación, nunca el promedio de la máquina.',
          ),
          marks: [{ auto: 'qt', lead: 'II' }],
          highlightLeads: ['II', 'V5'],
        },
        {
          title: l('定点：QRS 起点与 T 终点', 'Set the points: QRS onset and T end', 'Fija los puntos: inicio del QRS y final de la T'),
          body: l(
            '起点取**最早**偏折的导联；T 终点用切线法——降支切线与基线的交点。T 波宽大时最容易把终点量晚，切线是唯一公平的裁判。',
            'The onset is the **earliest** deflection; for the T end use the tangent — where the downslope tangent meets the baseline. With a broad T it is easy to read the end too late; the tangent is the only fair judge.',
            'El inicio es la deflexión **más precoz**; para el final de la T usa la tangente: donde la tangente de la rama descendente corta la línea de base. Con una T ancha es fácil leer el final demasiado tarde; la tangente es el único juez justo.',
          ),
          marks: [{ auto: 'qrs', lead: 'II' }, { auto: 't', lead: 'II' }],
        },
        {
          title: l('量 RR，选公式', 'Measure the RR, choose the formula', 'Mide el RR y elige la fórmula'),
          body: l(
            'RR ≈ 1000 ms（60 次/分）时 Bazett 不改动 QT：QTc = QT/√1。心率一旦变快，Bazett 就系统性虚高——>90 次/分换 Fridericia 或 Framingham 再下结论。',
            'At RR ≈ 1000 ms (60/min) Bazett leaves the QT untouched: QTc = QT/√1. As soon as the rate rises Bazett inflates systematically — beyond 90/min re-run the call with Fridericia or Framingham.',
            'Con RR ≈ 1000 ms (60 lpm) el Bazett no toca el QT: QTc = QT/√1. En cuanto la frecuencia sube, el Bazett se infla de forma sistemática: por encima de 90 lpm repite la conclusión con Fridericia o Framingham.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('对照阈值下结论', 'Compare with the thresholds and conclude', 'Compara con los umbrales y concluye'),
          body: l(
            'QT 约 515 ms，RR 1000 ms，QTc 约 515 ms ⇒ **≥480 ms，复查后即诊断 LQTS**；而且已 >500 ms，进入 TdP 高危区。结论不止一个数字：查药单与电解质排除获得性原因，问家族史与触发场景（游泳、铃声、睡眠中发作），按 Schwartz 评分汇总并转诊——β 受体阻滞剂、避免 QT 药物、家系筛查。',
            'QT about 515 ms at an RR of 1000 ms gives a QTc of about 515 ms => **>=480 ms: with a repeat ECG this diagnoses LQTS**; and at >500 ms it already sits in the high-torsade-risk zone. The conclusion is more than a number: check the drug list and the electrolytes to exclude an acquired cause, ask about family history and triggers (swimming, doorbells, events in sleep), score it the Schwartz way and refer — beta-blocker, QT drugs off, family screening.',
            'Un QT de unos 515 ms con un RR de 1000 ms da un QTc de unos 515 ms => **>=480 ms: con un ECG repetido esto diagnostica LQTS**; y con >500 ms ya está en la zona de alto riesgo de torsade. La conclusión es más que una cifra: revisa la lista de fármacos y los electrolitos para excluir una causa adquirida, pregunta por historia familiar y desencadenantes (natación, timbres, eventos durante el sueño), puntúa según Schwartz y deriva: betabloqueante, sin fármacos que alargan el QT, cribado familiar.',
          ),
          marks: [{ auto: 'qt', lead: 'II', color: 'err' }],
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'long-qt',
      seed: 1323,
      dials: [
        { id: 'rate', label: l('心率', 'Rate', 'Frecuencia') },
        { id: 'qtc', label: l('QTc（Fridericia 法）', 'QTc (Fridericia)', 'QTc (Fridericia)') },
      ],
      view: STRIP,
      marks: [{ auto: 'qt' }],
      play: {
        dial: 'qtc',
        from: 490,
        to: 560,
        notes: [
          {
            min: 490,
            max: 495,
            text: l(
              'Fridericia QTc 490–495 ms：已延长（复查仍 ≥480 ms 即诊断 LQTS），还没过 500 ms。QT 已占 RR 的一半以上。',
              'Fridericia QTc 490–495 ms: prolonged (≥480 ms on repeat ECGs diagnoses LQTS), not yet past 500 ms. The QT already takes over half the RR.',
              'QTc de Fridericia de 490-495 ms: prolongado (≥480 ms en ECG repetidos diagnostica LQTS), aún sin pasar de 500 ms. El QT ya ocupa más de la mitad del RR.',
            ),
          },
          {
            min: 500,
            max: 560,
            text: l(
              'QTc 越过 500 ms：TdP 高危。若病人正在用延长 QT 的药物：停药，补钾补镁。',
              'QTc past 500 ms: high torsade risk. In a patient on a QT-prolonging drug: stop it, give K and Mg.',
              'QTc por encima de 500 ms: alto riesgo de torsade. Si el paciente toma un fármaco que alarga el QT: retíralo y administra K y Mg.',
            ),
          },
        ],
      },
      predict: {
        question: l('QTc 从 490 升到 560 ms。TdP 高危从哪里开始？', 'The QTc climbs from 490 to 560 ms. Where does high torsade risk begin?', 'El QTc sube de 490 a 560 ms. ¿Dónde empieza el alto riesgo de torsade?'),
        options: [l('超过 450 ms', 'Past 450 ms', 'Por encima de 450 ms'), l('超过 500 ms', 'Past 500 ms', 'Por encima de 500 ms'), l('超过 550 ms', 'Past 550 ms', 'Por encima de 550 ms')],
        answer: 1,
      },
      caption: l(
        '看 T 的终点随 QTc 后移。之后再动心率：Fridericia QTc 不变时，心率越快 QT 越短。',
        'Watch the T end move out as the QTc climbs. Then move the rate: at the same Fridericia QTc, a faster rate shortens the QT.',
        'Mira cómo el final de la T se aleja al subir el QTc. Mueve después la frecuencia: con el mismo QTc de Fridericia, a más frecuencia, QT más corto.',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'action-potential', params: { cell: 'ventricular' } },
      ecg: synth('long-qt', 1321, { rate: 60 }),
      caption: l(
        'QT 就是从体表看到的心室动作电位：平台期（2 相）是 ST 段，快速复极（3 相）是 T 波。平台期拉长，ST 变长（LQT3、低钙）；3 相变慢，T 变宽（LQT1）。',
        'The QT is the ventricular action potential seen from the skin: the plateau (phase 2) is the ST segment and fast repolarisation (phase 3) is the T. A longer plateau lengthens the ST (LQT3, low calcium); a slower phase 3 broadens the T (LQT1).',
        'El QT es el potencial de acción ventricular visto desde la piel: la meseta (fase 2) es el segmento ST y la repolarización rápida (fase 3) es la T. Una meseta más larga alarga el ST (LQT3, calcio bajo); una fase 3 más lenta ensancha la T (LQT1).',
      ),
    },
    {
      kind: 'contrast',
      title: l('宽 T 与迟发 T：LQT1 对 LQT3', 'Broad T vs late T: LQT1 against LQT3', 'T ancha frente a T tardía: LQT1 contra LQT3'),
      view: GRID,
      left: {
        ecg: synth('long-qt', 1324),
        caption: l('LQT1：T 波宽大、基底宽', 'LQT1: a broad-based T', 'LQT1: T de base ancha'),
        marks: [{ auto: 't', lead: 'II' }],
      },
      right: {
        ecg: synth('long-qt', 1325, undefined, 'lqt3'),
        caption: l('LQT3：ST 段长而平，T 迟发、窄而尖', 'LQT3: a long flat ST with a late, narrow, peaked T', 'LQT3: ST largo y plano con T tardía, estrecha y apuntada'),
        marks: [{ auto: 'st', lead: 'II' }, { auto: 't', lead: 'II' }],
      },
      point: l(
        '两种长法都让 QTc 越过阈值，但延长住的地方不同：LQT1 把整段复极拉宽——**宽基底的 T**；LQT3 把平台期拖长——**长 ST 之后才是一个不宽、只是迟到的 T**。LQT2 介于两者之间：T 低平、带切迹或双峰，也是药物最常模拟的形态。看形态改变不了阈值（≥480 ms 复查诊断），但能改变你追问的问题：游泳、铃声，还是睡梦中发作。',
        'Both ways of being long push the QTc past the threshold, but the length lives in different places: LQT1 widens the whole repolarisation — a **broad-based T**; LQT3 stretches the plateau — a **long ST followed by a T that is not broad, only late**. LQT2 sits between: a low, notched or bifid T — the shape drugs most often copy. The shape changes no threshold (>=480 ms repeated diagnoses), but it changes the questions you ask: swimming, doorbells, or events in sleep.',
        'Ambas formas de alargarse empujan el QTc más allá del umbral, pero la longitud vive en sitios distintos: el LQT1 ensancha toda la repolarización —una **T de base ancha**—; el LQT3 estira la meseta —un **ST largo seguido de una T que no es ancha, solo tardía**—. El LQT2 queda en medio: T baja, con muesca o bífida, la morfología que los fármacos más copian. La morfología no cambia ningún umbral (>=480 ms repetido diagnostica), pero cambia las preguntas: natación, timbres o eventos durante el sueño.',
      ),
    },
    {
      kind: 'film',
      title: l('同一个 QT，四种 T', 'One QT, four T waves', 'Un mismo QT, cuatro ondas T'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'V3'] },
      frames: [
        {
          label: l('LQT1 型', 'LQT1 type', 'Tipo LQT1'),
          ecg: synth('long-qt', 1332),
          note: l(
            '64 次/分时 QT 约 505 ms：T 波基底宽。运动、游泳是 LQT1 的典型诱因。',
            'QT about 505 ms at 64/min: a broad-based T. Exercise and swimming are the classic LQT1 triggers.',
            'QT de unos 505 ms a 64 lpm: T de base ancha. El ejercicio y la natación son los desencadenantes clásicos del LQT1.',
          ),
          marks: [{ auto: 'qt', lead: 'V3' }],
        },
        {
          label: l('LQT2 型', 'LQT2 type', 'Tipo LQT2'),
          ecg: synth('long-qt', 1332, undefined, 'lqt2'),
          note: l(
            'QT 不变；II 的 T 低平（约 1 mm），V3 的 T 有两个驼峰、相隔约 100 ms。第二个驼峰属于 T，量到它的终点。声音与惊吓诱发。',
            'Same QT; a low T in II (about 1 mm) and a bifid T in V3, humps about 100 ms apart. The second hump belongs to the T: measure to its end. Sounds and startles trigger it.',
            'Mismo QT; T baja en II (alrededor de 1 mm) y T bífida en V3, con jorobas separadas unos 100 ms. La segunda joroba es de la T: mide hasta su final. La desencadenan ruidos y sobresaltos.',
          ),
          marks: [{ auto: 't', lead: 'V3' }, { auto: 'qt', lead: 'V3' }],
        },
        {
          label: l('LQT3 型', 'LQT3 type', 'Tipo LQT3'),
          ecg: synth('long-qt', 1332, undefined, 'lqt3'),
          note: l(
            'QT 不变；ST 段长而平（约 290 ms），其后是迟发、窄而尖的 T。安静或睡眠中发作。',
            'Same QT; a long flat ST (about 290 ms), then a late, narrow, peaked T. Events come at rest or in sleep.',
            'Mismo QT; ST largo y plano (unos 290 ms) y después una T tardía, estrecha y apuntada. Los eventos llegan en reposo o durante el sueño.',
          ),
          marks: [{ auto: 'st', lead: 'V3' }, { auto: 't', lead: 'V3' }],
        },
        {
          label: l('药物', 'Drug', 'Fármaco'),
          ecg: synth('long-qt', 1332, undefined, 'drug'),
          note: l(
            'hERG 阻滞药物写出类 LQT2 的双峰 T，T 之后还跟着一个 U 波：QT 量到 T 的终点，不含 U。',
            'A hERG-blocking drug writes an LQT2-like bifid T, followed by a U wave after the T: measure the QT to the T end, U excluded.',
            'Un fármaco que bloquea el hERG escribe una T bífida como la del LQT2, seguida de una onda U tras la T: mide el QT hasta el final de la T, sin la U.',
          ),
          marks: [{ auto: 't', lead: 'V3' }, { auto: 'u', lead: 'V3' }],
        },
      ],
      caption: l(
        'T 的形态只提示基因型，药物和电解质会模仿它。诊断靠数值（复查 QTc ≥480 ms 或 Schwartz 评分）、家族史和基因。',
        'The T shape only hints at the genotype, and drugs and electrolytes copy it. The diagnosis rests on the numbers (QTc ≥480 ms on repeat or the Schwartz score), the family history and genetics.',
        'La forma de la T solo sugiere el genotipo, y los fármacos y los electrolitos la imitan. El diagnóstico se basa en las cifras (QTc ≥480 ms repetido o la puntuación de Schwartz), la historia familiar y la genética.',
      ),
    },
    {
      kind: 'contrast',
      title: l('假长 QT：U 波混进来了', 'The fake long QT: a U wave got in', 'El falso QT largo: se coló una onda U'),
      view: { layout: 'strip', lead: 'V2' },
      left: {
        ecg: synth('hypokalemia', 1326),
        caption: l('低钾血症：T 低平，U 波高大（V2 最清楚），T–U 融合', 'Hypokalaemia: a flat T, a tall U (clearest in V2), T–U fusion', 'Hipopotasemia: T plana, U alta (clarísima en V2), fusión T-U'),
        marks: [{ auto: 't', lead: 'V2' }, { auto: 'u', lead: 'V2' }],
      },
      right: {
        ecg: synth('long-qt', 1327),
        caption: l('真长 QT：T 本身宽大；若有 U，也在 T 终点之后', 'A true long QT: the T itself is broad; any U comes after the T end', 'Un QT largo real: la propia T es ancha; la U, si existe, llega después del final de la T'),
        marks: [{ auto: 'qt', lead: 'V2' }],
      },
      point: l(
        '左边量到的"T 终点"其实是 **U 的终点**——那是 QU 间期，不是 QT；低钾血症就这样伪装成长 QT（而它本身也能诱发真 TdP）。把切线卡在 T 波降支上：终点在 U 之前。两边的处理不同——左边补钾补镁，右边查药单、家族史和基因。',
        'On the left the "T end" you reach is really **the end of the U** — that is a QU interval, not a QT; this is how hypokalaemia dresses up as long QT (and it can itself trigger a true TdP). Set the tangent on the T downslope: the end lies before the U. The management differs too — K and Mg on the left; drug list, family history and genetics on the right.',
        'A la izquierda el «final de la T» que alcanzas es en realidad **el final de la U**: ese es un intervalo QU, no un QT; así se disfraza la hipopotasemia de QT largo (y por sí misma puede desencadenar una TdP verdadera). Apoya la tangente en la rama descendente de la T: el final está antes de la U. El manejo también difiere: K y Mg a la izquierda; lista de fármacos, historia familiar y genética a la derecha.',
      ),
    },
    {
      kind: 'contrast',
      title: l('长 QT 的两种住法：长 ST 与宽 T', 'Two addresses of a long QT: long ST vs broad T', 'Dos domicilios del QT largo: ST largo frente a T ancha'),
      view: { layout: 'strip', lead: 'II' },
      left: {
        ecg: synth('hypocalcemia', 1328),
        caption: l('低钙血症：ST 段长而平，T 宽度正常', 'Hypocalcaemia: a long flat ST with a normal-width T', 'Hipocalcemia: ST largo y plano con T de anchura normal'),
        marks: [{ auto: 'st', lead: 'II' }, { auto: 't', lead: 'II' }],
      },
      right: {
        ecg: synth('long-qt', 1329),
        caption: l('LQTS 或药物：T 波本身宽大', 'LQTS or a drug: the T wave itself is broad', 'LQTS o fármaco: la propia onda T es ancha'),
        marks: [{ auto: 't', lead: 'II' }],
      },
      point: l(
        'QT 同样延长，延长的"住处"不同：低钙拉长的是**平台期——ST 段**，T 宽度不变；通道病或药物拉宽的是**T 本身**。看一眼 QT 的重量压在哪，就把代谢原因与通道/药物原因分开：一边是查血钙，一边是查药单与基因。',
        'The QT is prolonged on both sides, but the length lives at a different address: hypocalcaemia stretches the **plateau — the ST segment** — and the T keeps its width; a channelopathy or a drug widens **the T itself**. One glance at where the QT carries its weight separates a metabolic cause from a channel or drug cause: a calcium level on one side, a drug list and genetics on the other.',
        'El QT está prolongado en ambos lados, pero la longitud vive en domicilios distintos: la hipocalcemia estira la **meseta —el segmento ST—** y la T conserva su anchura; una canalopatía o un fármaco ensanchan **la propia T**. Una mirada a dónde carga el peso el QT separa una causa metabólica de una canalopatía o una causa farmacológica: calcemia a un lado, lista de fármacos y genética al otro.',
      ),
    },
    {
      kind: 'contrast',
      title: l('复极的两端：短 QT 对长 QT', 'The two ends of repolarisation: short vs long QT', 'Los dos extremos de la repolarización: QT corto frente a QT largo'),
      view: GRID,
      left: {
        ecg: synth('short-qt', 1330),
        caption: l('短 QT：T 高尖对称，几乎没有 ST 段', 'Short QT: a tall, peaked, symmetric T with almost no ST', 'QT corto: T alta, apuntada y simétrica, casi sin ST'),
        marks: [{ auto: 'qt', lead: 'V5' }],
      },
      right: {
        ecg: synth('long-qt', 1331),
        caption: l('长 QT：T 宽大，QT 越过 RR 的一半', 'Long QT: a broad T, the QT past half the RR', 'QT largo: T ancha, el QT sobrepasa la mitad del RR'),
        marks: [{ auto: 'qt', lead: 'V5' }],
      },
      point: l(
        '左边同样要量：QTc **≤360 ms 加一项特征**（致病突变、SQTS 家族史、无结构心脏病 VT/VF 生还）诊断**短QT综合征（SQTS）**；**≤320 ms** 单独考虑。T 高尖、几乎无 ST 是它的签名，但先排除继发原因——高钙血症、地高辛（以及高钾、高热）。右边的阈值你已经掌握：≥450/≥460 ms 延长，≥480 ms 复查诊断 LQTS。',
        'The left side needs measuring too: QTc **<=360 ms plus one feature** (a pathogenic mutation, a family history of SQTS, survived VT/VF without structural disease) diagnoses **short QT syndrome (SQTS)**; **<=320 ms** stands alone. A tall peaked T with almost no ST is its signature, but exclude the secondary causes first — hypercalcaemia, digoxin (and hyperkalaemia, hyperthermia). The right side you already own: >=450/>=460 ms prolonged, >=480 ms repeated diagnoses LQTS.',
        'El lado izquierdo también se mide: QTc **<=360 ms más una característica** (mutación patogénica, historia familiar de SQTS, supervivencia a TV/FV sin cardiopatía estructural) diagnostica **síndrome del QT corto (SQTS)**; desde **<=320 ms** se considera solo. Una T alta y apuntada casi sin ST es su firma, pero excluye antes las causas secundarias: hipercalcemia, digoxina (y también hiperpotasemia, hipertermia). El lado derecho ya lo dominas: >=450/>=460 ms prolongado, >=480 ms repetido diagnostica LQTS.',
      ),
    },
    { kind: 'check', item: { family: 'qtc', seed: 3 } },
    { kind: 'check', item: { family: 'qtc', seed: 8 } },
    { kind: 'check', item: { family: 'measure-qt', seed: 4 } },
    { kind: 'drill', families: ['measure-qt', 'qtc'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [6479, 6515, 6310],
      caption: l(
        '三份被 PTB-XL 判读医生标注为"长 QT"的真实心电图：79 岁女性、75 岁女性、54 岁男性。先在 QT 最长的导联用切线法定 T 终点、剔除 U 波，量 RR、算 QTc（心率快时别只信 Bazett），对照性别阈值定下"延长/不延长"与你的下一步（药单？电解质？家族史？），然后揭晓。提醒：不是每个标签都经得起你的分规。',
        'Three real tracings that the PTB-XL reader labelled "long QT": a 79-year-old woman, a 75-year-old woman and a 54-year-old man. First set the T end by the tangent in the lead with the longest QT, leave the U out, measure the RR, compute the QTc (do not trust Bazett alone at a fast rate), and commit to "prolonged / not prolonged" against the sex-specific threshold, plus your next step (drug list? electrolytes? family history?), before the reveal. Fair warning: not every label survives your calipers.',
        'Tres trazados reales que el lector de PTB-XL etiquetó como «QT largo»: una mujer de 79 años, otra de 75 y un varón de 54. Fija primero el final de la T con la tangente en la derivación con el QT más largo, excluye la U, mide el RR, calcula el QTc (con frecuencia alta no te fíes solo de Bazett) y decide «prolongado / no prolongado» según el umbral de su sexo, junto con tu siguiente paso (¿lista de fármacos?, ¿electrolitos?, ¿historia familiar?), antes de la solución. Aviso: no todas las etiquetas sobreviven a tu compás.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '离 60 次/分远时只信 Bazett：>90 次/分它过度校正、读数偏高；心率慢时它校正不足、读数偏低，会把长 QT 藏起来——换 Fridericia 或 Framingham 再下结论。',
          'Trusting Bazett far from 60/min: beyond 90/min it over-corrects and reads high; at slow rates it under-corrects and reads low, which can hide a long QT — switch to Fridericia or Framingham before concluding.',
          'Fiarse solo de Bazett lejos de 60 lpm: por encima de 90 lpm sobrecorrige y da cifras altas; con frecuencias lentas infracorrige y da cifras bajas que pueden ocultar un QT largo; cambia a Fridericia o Framingham antes de concluir.',
        ),
        l(
          '把 U 波量进 QT：低钾血症的"长 QT"常是 QU 间期；T 终点用切线法定，终点在 U 之前。',
          'Measuring the U wave into the QT: the "long QT" of hypokalaemia is often a QU interval; set the T end by the tangent, before the U.',
          'Medir la onda U dentro del QT: el «QT largo» de la hipopotasemia suele ser un intervalo QU; fija el final de la T con la tangente, antes de la U.',
        ),
        l(
          'QRS ≥120 ms 时照读 QT：束支阻滞本身拉长 QT——改用 JT 间期或经 QRS 校正的 QT。',
          'Reading the raw QT when the QRS is >=120 ms: the bundle branch block itself lengthens it — use the JT interval or a QRS-adjusted QT.',
          'Leer el QT bruto con QRS >=120 ms: el bloqueo de rama por sí solo lo alarga; usa el intervalo JT o un QT ajustado al QRS.',
        ),
        l(
          '入院或开药时不查 QT 药单：Ia/III 类、大环内酯类、氟喹诺酮类、抗精神病药、美沙酮、昂丹司琼……再叠上低钾低镁与肾功能不全，TdP 就在病房里等着。',
          'Never checking the QT drug list on admission or on prescribing: class Ia/III, macrolides, fluoroquinolones, antipsychotics, methadone, ondansetron… stack low K and Mg with renal impairment and TdP waits on the ward.',
          'No repasar la lista de fármacos del QT al ingresar o al recetar: Ia/III, macrólidos, fluoroquinolonas, antipsicóticos, metadona, ondansetrón…; súmale K y Mg bajos con insuficiencia renal y la TdP espera en la planta.',
        ),
        l(
          '短 QT 被当作"健康的 T 波"：QTc ≤360 ms（≤320 ms 更甚）加 T 高尖、几乎无 ST，不是健康的签名——先排高钙血症与地高辛，再想 SQTS。',
          'A short QT waved off as "a healthy T wave": QTc <=360 ms (all the more at <=320 ms) with a tall peaked T and almost no ST is not a signature of health — exclude hypercalcaemia and digoxin first, then think SQTS.',
          'Un QT corto despachado como «onda T sana»: un QTc <=360 ms (más aún <=320 ms) con T alta y apuntada casi sin ST no es firma de salud; excluye antes hipercalcemia y digoxina, y piensa luego en SQTS.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'QT：最早 QRS 起点 → T 终点（切线法、QT 最长导联、剔除 U）；校正离开 60 次/分优先 Fridericia/Framingham/Hodges，QRS ≥120 ms 改用 JT。',
          'QT: earliest QRS onset -> T end (tangent, longest-QT lead, U excluded); away from 60/min prefer Fridericia/Framingham/Hodges, and with QRS >=120 ms switch to JT.',
          'QT: del inicio más precoz del QRS al final de la T (tangente, derivación del QT más largo, U excluida); lejos de 60 lpm prefiere Fridericia/Framingham/Hodges, y con QRS >=120 ms pasa a JT.',
        ),
        l(
          '阈值：≥450 ms（男）/≥460 ms（女）为延长；复查 QTc ≥480 ms 或 Schwartz 评分 >3 诊断 LQTS（≥460 ms 加不明原因晕厥要考虑）；>500 ms 或用药后增幅 >60 ms 为 TdP 高危。',
          'Thresholds: >=450 ms (men) / >=460 ms (women) is prolonged; QTc >=480 ms on repeat, or a Schwartz score >3, diagnoses LQTS (consider >=460 ms with unexplained syncope); >500 ms or a rise >60 ms on a drug is high torsade risk.',
          'Umbrales: >=450 ms (varones) / >=460 ms (mujeres) es prolongado; QTc >=480 ms repetido o puntuación de Schwartz >3 diagnostica LQTS (considera >=460 ms con síncope inexplicado); >500 ms o un aumento >60 ms con un fármaco es alto riesgo de torsade.',
        ),
        l(
          '基因型 T 形态：LQT1 宽大 T、LQT2 低平/双峰 T、LQT3 长 ST 加迟发尖 T——形态提示方向，数值加基因定诊。',
          'Genotype T shapes: broad-based T in LQT1, low/notched T in LQT2, long ST with a late peaked T in LQT3 — the shape points the way, numbers and genetics make the diagnosis.',
          'Morfologías por genotipo: T de base ancha en LQT1, T baja/bífida en LQT2, ST largo con T tardía y apuntada en LQT3: la morfología señala el camino; las cifras y la genética dan el diagnóstico.',
        ),
        l(
          '获得性长 QT：药单（Ia/III 类与常见非心脏药物）叠加低钾、低镁、低钙、心动过缓、肾功能不全、女性、心衰；TdP 常由短-长-短序列起始——开药前查清单和电解质。',
          'Acquired long QT: the drug list (class Ia/III and the common non-cardiac offenders) stacks with low K, Mg, Ca, bradycardia, renal impairment, female sex, heart failure; TdP usually starts with a short–long–short sequence — check the list and the electrolytes before the drug goes in.',
          'QT largo adquirido: la lista de fármacos (clases Ia/III y los no cardiacos habituales) se suma a K, Mg y Ca bajos, bradicardia, insuficiencia renal, sexo femenino e insuficiencia cardíaca; la TdP suele iniciar con una secuencia corto-largo-corto: revisa lista y electrolitos antes de administrar el fármaco.',
        ),
        l(
          '短 QT：≤360 ms 加一项特征诊断 SQTS（≤320 ms 单独考虑），T 高尖对称、几乎无 ST；先排除高钙血症与地高辛。',
          'Short QT: <=360 ms plus one feature diagnoses SQTS (consider <=320 ms on its own), with a tall peaked symmetric T and almost no ST; exclude hypercalcaemia and digoxin first.',
          'QT corto: <=360 ms más una característica diagnostica SQTS (considera <=320 ms por sí solo), con T alta, apuntada y simétrica casi sin ST; excluye antes hipercalcemia y digoxina.',
        ),
      ],
    },
  ],
  sources: [
    'Rautaharju PM et al. AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval. Circulation 2009;119:e241-e250',
    'Drew BJ et al. Prevention of torsade de pointes in hospital settings. Circulation 2010;121:1047-1060',
    'Priori SG et al. HRS/EHRA/APHRS expert consensus on inherited primary arrhythmia syndromes. Heart Rhythm 2013;10:1932-1963',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Castellano et al. 2004',
  ],
};

export default lesson;
