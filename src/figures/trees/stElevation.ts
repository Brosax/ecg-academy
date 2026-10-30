/**
 * ST elevation: acute coronary occlusion (STEMI) versus its mimics — pericarditis, early repolarization, LVH, LBBB /
 * paced rhythm, Brugada pattern, LV aneurysm, and aVR elevation with diffuse ST depression.
 *
 * Sources (criteria only; text is original):
 * - Thygesen K et al. Fourth Universal Definition of Myocardial Infarction (2018). Circulation 2018;138:e618-51
 *   (new ST elevation at the J point in 2 contiguous leads: ≥ 1 mm in all leads other than V2–V3; in V2–V3 ≥ 2 mm in
 *   men ≥ 40 y, ≥ 2.5 mm in men < 40 y, ≥ 1.5 mm in women).
 * - Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-826
 *   (BBB/paced rhythm with ongoing ischaemic symptoms managed like STEMI; aVR elevation with multilead ST depression).
 * - Sgarbossa EB et al. N Engl J Med 1996;334:481-7; Smith SW et al. Diagnosis of ST-elevation myocardial infarction
 *   in the presence of left bundle branch block with the ST-elevation to S-wave ratio in a modified Sgarbossa rule.
 *   Ann Emerg Med 2012;60:766-76 (discordant STE ≥ 25 % of the preceding S depth).
 * - Armstrong EJ et al. Am J Cardiol 2012;110:977-83 (STE/QRS ratio ≥ 25 % for STEMI in LVH).
 * - Adler Y et al. 2015 ESC Guidelines for the diagnosis and management of pericardial diseases. Eur Heart J
 *   2015;36:2921-64 (widespread concave STE with PR depression).
 * - Antzelevitch C et al. J-Wave syndromes expert consensus conference report. Heart Rhythm 2016;13:e295-324, and
 *   Zeppenfeld K et al. 2022 ESC VA/SCD guidelines (Brugada type 1: coved STE ≥ 2 mm with negative T in ≥ 1 right
 *   precordial lead in the 2nd–4th ICS).
 * - Macfarlane PW et al. The early repolarization pattern: a consensus paper. J Am Coll Cardiol 2015;66:470-7 (J-point
 *   notch or slur, peak ≥ 0.1 mV, in ≥ 2 contiguous leads excluding V1–V3, i.e. inferior and/or lateral leads; QRS <
 *   120 ms). The modest ST elevation in V2–V3 of healthy young men is a normal variant, covered by the higher UDMI
 *   thresholds there.
 * - Klein LR, Shroff GR, Beeman W, Smith SW. Am J Emerg Med 2015;33:786-90 (T/QRS ratio > 0.36 in any of V1–V4 favours
 *   acute anterior STEMI over LV aneurysm).
 */
import { l } from '../../core/l10n';
import type { DecisionTree } from './types';

export const stElevationTree: DecisionTree = {
  id: 'st-elevation',
  title: l('ST 段抬高的鉴别', 'ST elevation: STEMI or mimic?', 'Elevación del ST: ¿IAMCEST o imitador?'),
  intro: l(
    'ST 段抬高原因很多。先判断 QRS 本身能否解释它，再看分布和形态。急性冠状动脉闭塞是绝不能漏掉的诊断：拿不准时 15–30 分钟后复查心电图并比较。',
    'ST elevation has many causes. First decide whether the QRS itself explains it, then look at the distribution and shape. Acute coronary occlusion is the diagnosis you must not miss: when in doubt, repeat the ECG in 15–30 minutes and compare.',
    'La elevación del ST tiene muchas causas. Decide primero si el propio QRS la explica y después mira su distribución y su forma. La oclusión coronaria aguda es el diagnóstico que no se puede pasar por alto: ante la duda, repite el ECG a los 15–30 minutos y compara.',
  ),
  root: 'qrs',
  sources: [
    'Thygesen K et al. Fourth Universal Definition of MI. Circulation 2018;138:e618-51',
    'Byrne RA et al. 2023 ESC ACS guidelines. Eur Heart J 2023;44:3720-826',
    'Smith SW et al. Ann Emerg Med 2012;60:766-76 (modified Sgarbossa)',
    'Adler Y et al. 2015 ESC pericardial guidelines. Eur Heart J 2015;36:2921-64',
    'Antzelevitch C et al. J-wave syndromes consensus. Heart Rhythm 2016;13:e295-324',
    'Macfarlane PW et al. J Am Coll Cardiol 2015;66:470-7 (early repolarization)',
  ],
  nodes: {
    qrs: {
      kind: 'question',
      text: l('先看 QRS。哪一项最符合？', 'Look at the QRS first. Which fits best?', 'Mira primero el QRS. ¿Qué lo describe mejor?'),
      options: [
        {
          label: l('左束支阻滞或心室起搏（QRS ≥ 120 ms，ST–T 与 QRS 主波方向相反）', 'LBBB or ventricular paced rhythm (QRS ≥ 120 ms, ST–T opposite to the QRS)', 'BRI o ritmo de marcapasos ventricular (QRS ≥ 120 ms, ST–T opuesto al QRS)'),
          next: 'lbbb',
        },
        {
          label: l('左心室肥厚的高电压，V1–V3 有深 S 波', 'LVH voltage with deep S waves in V1–V3', 'Voltajes de HVI con ondas S profundas en V1–V3'),
          next: 'lvh',
        },
        {
          label: l('V1–V2 呈类 rSR′ 图形，ST 段自 J 点高位开始抬高', 'An rSR′-like pattern in V1–V2 with ST elevation starting high at the J point', 'Patrón tipo rSR′ en V1–V2 con elevación del ST que empieza alta en el punto J'),
          next: 'brugada',
        },
        { label: l('QRS 窄，电压正常', 'Narrow QRS with normal voltage', 'QRS estrecho con voltaje normal'), next: 'distribution' },
      ],
    },
    lbbb: {
      kind: 'question',
      text: l(
        '左束支阻滞 / 起搏：应用 Sgarbossa 标准（Smith 改良）。有无任何一项阳性？',
        'LBBB / paced: apply the Sgarbossa criteria (Smith-modified). Is any of them present?',
        'BRI / marcapasos: aplica los criterios de Sgarbossa (modificados por Smith). ¿Se cumple alguno?',
      ),
      help: l(
        '① QRS 主波向上的导联中同向性 ST 抬高 ≥ 1 mm；② V1–V3 同向性 ST 压低 ≥ 1 mm；③ 过度的反向 ST 抬高：≥ 前面 S 波深度的 25%（Smith），原标准为 ≥ 5 mm。',
        '1) Concordant ST elevation ≥ 1 mm in any lead with a positive QRS. 2) Concordant ST depression ≥ 1 mm in V1–V3. 3) Excessively discordant ST elevation: ≥ 25 % of the depth of the preceding S wave (Smith); the original criterion was ≥ 5 mm.',
        '1) Elevación concordante del ST ≥ 1 mm en alguna derivación con QRS positivo. 2) Descenso concordante del ST ≥ 1 mm en V1–V3. 3) Elevación discordante excesiva del ST: ≥ 25 % de la profundidad de la S precedente (Smith); el criterio original era ≥ 5 mm.',
      ),
      options: [
        { label: l('有，至少一项', 'Yes, at least one', 'Sí, al menos uno'), next: 'sgarbossa' },
        { label: l('没有', 'No', 'No'), next: 'lbbbSecondary' },
      ],
    },
    lvh: {
      kind: 'question',
      text: l(
        '左心室肥厚：V1–V3 的 ST 抬高是否与深 S 波成比例？',
        'LVH: is the ST elevation in V1–V3 in proportion to the deep S waves?',
        'HVI: ¿la elevación del ST en V1–V3 es proporcionada a las ondas S profundas?',
      ),
      help: l(
        '左心室肥厚时 ST 抬高与 QRS 方向相反，一般 < S 波深度的 25%，呈凹面向上，无对应性 ST 压低。不成比例、凸面向上、动态变化或出现新的对应性改变提示缺血。',
        'In LVH the ST elevation is discordant, usually < 25 % of the S-wave depth, concave, and without reciprocal ST depression. Disproportionate, convex or changing ST elevation, or new reciprocal changes, suggest ischaemia.',
        'En la HVI la elevación del ST es discordante, suele ser < 25 % de la profundidad de la S, cóncava y sin descenso recíproco. Una elevación desproporcionada, convexa o cambiante, o nuevos cambios recíprocos, sugieren isquemia.',
      ),
      options: [
        { label: l('成比例、凹面向上、稳定', 'Proportionate, concave, stable', 'Proporcionada, cóncava, estable'), next: 'lvhSecondary' },
        {
          label: l('不成比例、凸面向上、动态变化或有对应性压低', 'Disproportionate, convex, changing, or with reciprocal depression', 'Desproporcionada, convexa, cambiante o con descenso recíproco'),
          next: 'distribution',
        },
      ],
    },
    brugada: {
      kind: 'question',
      text: l(
        '观察 V1–V2（也可上移 1–2 个肋间记录）。ST 段是什么形态？',
        'Look at V1–V2 (also recorded one or two intercostal spaces higher). What is the ST shape?',
        'Observa V1–V2 (también registradas uno o dos espacios intercostales más arriba). ¿Qué forma tiene el ST?',
      ),
      options: [
        {
          label: l('穹窿型：J 点抬高 ≥ 2 mm，ST 段下斜，其后 T 波倒置', 'Coved: J point ≥ 2 mm, downsloping ST, then a negative T wave', 'En cúpula (coved): punto J ≥ 2 mm, ST descendente y después onda T negativa'),
          next: 'brugada1',
        },
        {
          label: l('马鞍型：ST 抬高 ≥ 0.5 mm，其后 T 波直立或低平', 'Saddleback: ST elevation ≥ 0.5 mm, then a positive or flat T wave', 'En silla de montar: elevación del ST ≥ 0,5 mm y después onda T positiva o plana'),
          next: 'brugada2',
        },
        {
          label: l('都不是——ST 抬高符合某一冠脉供血区', 'Neither — the ST elevation follows a coronary territory', 'Ninguna: la elevación del ST sigue un territorio coronario'),
          next: 'distribution',
        },
      ],
    },
    distribution: {
      kind: 'question',
      text: l('ST 抬高分布在哪里？伴随哪些改变？', 'Where is the ST elevation, and what comes with it?', '¿Dónde está la elevación del ST y qué la acompaña?'),
      help: l(
        '心梗 ST 抬高阈值（第四版心肌梗死全球定义）：相邻 2 个导联 J 点新出现抬高，V2–V3 以外的导联 ≥ 1 mm；V2–V3 中 ≥ 40 岁男性 ≥ 2 mm，< 40 岁男性 ≥ 2.5 mm，女性 ≥ 1.5 mm。',
        'STEMI thresholds (Fourth Universal Definition): new J-point elevation in 2 contiguous leads, ≥ 1 mm in all leads other than V2–V3; in V2–V3 ≥ 2 mm in men ≥ 40 y, ≥ 2.5 mm in men < 40 y and ≥ 1.5 mm in women.',
        'Umbrales de IAMCEST (cuarta definición universal): elevación nueva del punto J en 2 derivaciones contiguas, ≥ 1 mm en todas salvo V2–V3; en V2–V3 ≥ 2 mm en varones ≥ 40 años, ≥ 2,5 mm en varones < 40 años y ≥ 1,5 mm en mujeres.',
      ),
      options: [
        {
          label: l('局限于一个冠脉供血区（≥ 2 个相邻导联），常凸面向上，伴对应性 ST 压低', 'In one coronary territory (≥ 2 contiguous leads), often convex, with reciprocal ST depression', 'En un territorio coronario (≥ 2 derivaciones contiguas), a menudo convexa, con descenso recíproco del ST'),
          next: 'stemi',
        },
        {
          label: l('广泛（多数导联），凹面向上，伴 PR 段压低、aVR 中 PR 抬高；仅 aVR（± V1）有对应性改变', 'Widespread (most leads), concave, with PR depression and PR elevation in aVR; reciprocal change only in aVR (± V1)', 'Difusa (la mayoría de derivaciones), cóncava, con descenso del PR y elevación del PR en aVR; cambio recíproco solo en aVR (± V1)'),
          next: 'pericarditis',
        },
        {
          label: l(
            '轻度凹面向上抬高，T 波高大，下壁和/或侧壁导联常有 J 点切迹或顿挫；年轻人，随时间不变',
            'Small and concave, with tall T waves and often a J-point notch or slur in the inferior and/or lateral leads; young person, unchanged over time',
            'Pequeña y cóncava, con ondas T altas y a menudo muesca o empastamiento del punto J en las derivaciones inferiores y/o laterales; persona joven, sin cambios en el tiempo',
          ),
          next: 'earlyRepol',
        },
        {
          label: l('心梗数周后，V1–V4 持续 ST 抬高并有深 Q 或 QS 波', 'Persistent ST elevation with deep Q or QS waves in V1–V4, weeks after an infarction', 'Elevación persistente del ST con ondas Q o QS profundas en V1–V4, semanas después de un infarto'),
          next: 'aneurysm',
        },
        {
          label: l('aVR（± V1）ST 抬高，其他 ≥ 6 个导联 ST 压低', 'ST elevation in aVR (± V1) with ST depression in ≥ 6 other leads', 'Elevación del ST en aVR (± V1) con descenso del ST en ≥ 6 derivaciones'),
          next: 'avr',
        },
      ],
    },

    // ── leaves ────────────────────────────────────────────────────────────────────────────────────────────────────
    sgarbossa: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['sgarbossa-positive', 'lbbb'],
      title: l('左束支阻滞 / 起搏心律下的可能急性心梗', 'Probable acute MI despite LBBB / pacing', 'Probable infarto agudo pese al BRI / marcapasos'),
      text: l(
        'Sgarbossa/Smith 标准对左束支阻滞和心室起搏时的急性冠脉闭塞特异性高：按 STEMI 处理。即使不满足标准，有持续缺血症状的左束支阻滞患者也按 STEMI 处理（ESC 2023）。',
        'The Sgarbossa/Smith criteria are specific for acute coronary occlusion in LBBB and ventricular pacing: manage as STEMI. Even without the criteria, a patient with LBBB and ongoing ischaemic symptoms is managed like STEMI (ESC 2023).',
        'Los criterios de Sgarbossa/Smith son específicos de oclusión coronaria aguda con BRI o estimulación ventricular: trátalo como IAMCEST. Incluso sin criterios, un paciente con BRI y síntomas isquémicos persistentes se trata como IAMCEST (ESC 2023).',
      ),
    },
    lbbbSecondary: {
      kind: 'leaf',
      tone: 'major',
      findings: ['lbbb', 'secondary-st-t'],
      title: l('左束支阻滞 / 起搏的继发性 ST–T 改变', 'Secondary ST–T changes of LBBB / pacing', 'Alteraciones secundarias del ST–T por BRI / marcapasos'),
      text: l(
        'S 波深的导联（V1–V3）出现与之相反的 ST 抬高、QRS 主波向上的导联（I、aVL、V5–V6）出现 ST 压低，是预期的、成比例的改变。它们不能排除心梗：与旧图比较，症状持续时复查。',
        'Discordant ST elevation where the S is deep (V1–V3) and ST depression where the QRS is positive (I, aVL, V5–V6) are expected and proportionate. They do not rule out infarction: compare with an old ECG and repeat if symptoms persist.',
        'Una elevación discordante del ST donde la S es profunda (V1–V3) y un descenso del ST donde el QRS es positivo (I, aVL, V5–V6) son esperables y proporcionados. No descartan el infarto: compara con un ECG antiguo y repítelo si persisten los síntomas.',
      ),
    },
    lvhSecondary: {
      kind: 'leaf',
      tone: 'major',
      findings: ['lvh', 'lvh-strain'],
      title: l('左心室肥厚伴继发性复极改变', 'LVH with secondary repolarization changes', 'HVI con alteraciones secundarias de la repolarización'),
      text: l(
        'V1–V3 的反向 ST 抬高与深 S 波成比例，I、aVL、V5–V6 常有 ST 压低伴不对称 T 波倒置（"劳损"）。与既往心电图比较。',
        'Discordant ST elevation in V1–V3 in proportion to deep S waves, often with ST depression and asymmetric T inversion in I, aVL, V5–V6 ("strain"). Compare with previous ECGs.',
        'Elevación discordante del ST en V1–V3 proporcionada a las S profundas, a menudo con descenso del ST e inversión asimétrica de la T en I, aVL, V5–V6 ("sobrecarga"). Compara con ECG previos.',
      ),
    },
    brugada1: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['brugada-type1'],
      title: l('Brugada 1 型图形', 'Brugada pattern type 1', 'Patrón de Brugada tipo 1'),
      text: l(
        '≥ 1 个右胸导联（V1–V2，置于第 2–4 肋间）穹窿型 ST 抬高 ≥ 2 mm 伴 T 波倒置。自发性 1 型可诊断 Brugada 综合征；发热和某些药物可使其显现。转诊专科评估（猝死风险）。',
        'Coved ST elevation ≥ 2 mm with a negative T wave in ≥ 1 right precordial lead (V1–V2, placed in the 2nd–4th intercostal space). A spontaneous type 1 is diagnostic of Brugada syndrome; fever and some drugs can unmask it. Refer for specialist assessment (risk of sudden death).',
        'Elevación del ST en cúpula ≥ 2 mm con onda T negativa en ≥ 1 derivación precordial derecha (V1–V2, colocadas en el 2.º–4.º espacio intercostal). Un tipo 1 espontáneo es diagnóstico de síndrome de Brugada; la fiebre y algunos fármacos pueden desenmascararlo. Deriva al especialista (riesgo de muerte súbita).',
      ),
    },
    brugada2: {
      kind: 'leaf',
      tone: 'minor',
      findings: ['brugada-type2'],
      title: l('Brugada 2 型图形（马鞍型）——不能确诊', 'Brugada pattern type 2 (saddleback) — not diagnostic', 'Patrón de Brugada tipo 2 (silla de montar): no diagnóstico'),
      text: l(
        '马鞍型 ST 抬高伴 T 波直立，仅为提示。将 V1–V2 上移 1–2 个肋间复查；类似图形见于不完全性右束支阻滞、运动员、漏斗胸和致心律失常性右室心肌病。',
        'Saddleback ST elevation with a positive T wave is only suggestive. Repeat V1–V2 one or two intercostal spaces higher; look-alikes include incomplete RBBB, athletes, pectus excavatum and arrhythmogenic right ventricular cardiomyopathy.',
        'La elevación del ST en silla de montar con T positiva solo es sugestiva. Repite V1–V2 uno o dos espacios intercostales más arriba; se parecen el bloqueo incompleto de rama derecha, los deportistas, el pectus excavatum y la miocardiopatía arritmogénica del ventrículo derecho.',
      ),
    },
    stemi: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['stemi-anterior', 'stemi-inferior', 'stemi-lateral', 'reciprocal-changes'],
      title: l('急性 ST 段抬高型心肌梗死（急性冠脉闭塞）', 'Acute STEMI (acute coronary occlusion)', 'IAMCEST agudo (oclusión coronaria aguda)'),
      text: l(
        '局限于供血区的 ST 抬高伴对应性 ST 压低，在排除之前都是急性冠脉闭塞：立即启动再灌注流程。说出受累区域（见"冠脉供血区"图），并寻找右心室和后壁受累（V4R、V7–V9）。',
        'Territorial ST elevation with reciprocal ST depression is an acute coronary occlusion until proven otherwise: start the reperfusion pathway now. Name the territory (see the coronary territories figure) and look for right-ventricular and posterior extension (V4R, V7–V9).',
        'Una elevación del ST territorial con descenso recíproco es una oclusión coronaria aguda mientras no se demuestre lo contrario: activa ya el circuito de reperfusión. Nombra el territorio (ver la figura de territorios coronarios) y busca extensión al ventrículo derecho y posterior (V4R, V7–V9).',
      ),
    },
    pericarditis: {
      kind: 'leaf',
      tone: 'major',
      findings: ['pericarditis'],
      title: l('急性心包炎', 'Acute pericarditis', 'Pericarditis aguda'),
      text: l(
        '弥漫性凹面向上的 ST 抬高（不局限于一个供血区），PR 段压低，aVR 中 PR 抬高、ST 压低，无 Q 波，其他导联无对应性压低。数日内分期演变；ST 回到基线后 T 波才倒置。',
        'Diffuse concave ST elevation (not confined to one territory), PR-segment depression, PR elevation and ST depression in aVR, no Q waves and no reciprocal ST depression elsewhere. It evolves in stages over days; the ST returns to baseline before the T waves invert.',
        'Elevación difusa y cóncava del ST (no limitada a un territorio), descenso del segmento PR, elevación del PR y descenso del ST en aVR, sin ondas Q ni descensos recíprocos en otras derivaciones. Evoluciona por fases en días; el ST vuelve a la línea de base antes de que se inviertan las T.',
      ),
    },
    earlyRepol: {
      kind: 'leaf',
      tone: 'normal',
      findings: ['early-repolarization'],
      title: l('早期复极（良性变异）', 'Early repolarization (benign variant)', 'Repolarización precoz (variante benigna)'),
      text: l(
        '凹面向上的 ST 抬高伴高大 T 波，常有 J 点切迹或顿挫，多见于年轻人（尤其男性和运动员），复查无变化。严格地说，早期复极图形是指 ≥ 2 个相邻的下壁和/或侧壁导联出现 ≥ 1 mm 的 J 点切迹或顿挫（不包括 V1–V3）；健康年轻男性 V2–V3 的轻度 ST 抬高是正常变异，因此这两个导联的 STEMI 阈值更高。注意：超急性期前壁心梗可与之相似——寻找对应性改变、ST 段变直，并动态比较。',
        'Concave ST elevation with large T waves, often with a J-point notch or slur, in young — especially male and athletic — people, unchanged on repeat ECGs. Strictly, the early-repolarization pattern is a J-point notch or slur ≥ 1 mm in ≥ 2 contiguous inferior and/or lateral leads (V1–V3 are excluded); the modest ST elevation in V2–V3 of healthy young men is a normal variant, which is why the STEMI thresholds there are higher. Beware: a hyperacute anterior STEMI can look similar — look for reciprocal change and ST straightening, and compare over time.',
        'Elevación cóncava del ST con ondas T grandes, a menudo con muesca o empastamiento del punto J, en personas jóvenes (en especial varones y deportistas), sin cambios en ECG repetidos. En sentido estricto, el patrón de repolarización precoz es una muesca o empastamiento del punto J ≥ 1 mm en ≥ 2 derivaciones contiguas inferiores y/o laterales (se excluyen V1–V3); la discreta elevación del ST en V2–V3 de los varones jóvenes sanos es una variante normal, y por eso los umbrales de IAMCEST son más altos en esas derivaciones. Cuidado: un IAMCEST anterior hiperagudo puede parecerse; busca cambios recíprocos y rectificación del ST, y compara en el tiempo.',
      ),
    },
    aneurysm: {
      kind: 'leaf',
      tone: 'major',
      findings: ['lv-aneurysm', 'pathological-q'],
      title: l('左心室室壁瘤（陈旧性心梗）', 'Left ventricular aneurysm (old infarction)', 'Aneurisma ventricular izquierdo (infarto antiguo)'),
      text: l(
        '陈旧性（多为前壁）心梗后持续 ST 抬高，伴成形的 Q/QS 波。经验规则：V1–V4 任一导联 T 波/QRS 振幅比 > 0.36 时更支持急性 STEMI。与旧图比较。',
        'Persistent ST elevation with well-formed Q/QS waves after an old (usually anterior) infarction. Rule of thumb: a T/QRS amplitude ratio > 0.36 in any of V1–V4 favours acute STEMI instead. Compare with old ECGs.',
        'Elevación persistente del ST con ondas Q/QS bien formadas tras un infarto antiguo (habitualmente anterior). Regla práctica: un cociente de amplitud T/QRS > 0,36 en cualquiera de V1–V4 favorece, en cambio, un IAMCEST agudo. Compara con ECG antiguos.',
      ),
    },
    avr: {
      kind: 'leaf',
      tone: 'critical',
      findings: ['avr-elevation-diffuse-std'],
      title: l('aVR ST 抬高伴广泛 ST 压低', 'ST elevation in aVR with diffuse ST depression', 'Elevación del ST en aVR con descenso difuso del ST'),
      text: l(
        '广泛的心内膜下缺血：左主干或严重多支病变，或严重的供需失衡（如心动过速、贫血、低血压）。不是典型的 STEMI 图形，但风险高：需紧急评估。',
        'Widespread subendocardial ischaemia: left main or severe multivessel disease, or a severe supply–demand mismatch (e.g. tachycardia, anaemia, hypotension). Not a classic STEMI pattern, but high risk: urgent evaluation.',
        'Isquemia subendocárdica extensa: enfermedad del tronco común o multivaso grave, o un desequilibrio grave entre aporte y demanda (p. ej., taquicardia, anemia, hipotensión). No es un patrón clásico de IAMCEST, pero es de alto riesgo: valoración urgente.',
      ),
    },
  },
};
