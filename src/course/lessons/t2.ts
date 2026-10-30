/**
 * t2 — Irregular rhythms: AF, flutter with variable block, MAT, frequent ectopy (docs/PLAN.md §3, stage T).
 * Criteria: docs/curriculum/criteria.md `af-criteria`, `blocked-at-mat`, `flutter-criteria`, `pac-criteria` (current
 * values), plus the missing-book items on AF diagnostic documentation, regularized AF and focal AT P′ localisation.
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
  id: 't2',
  stage: 'T',
  order: 2,
  title: l(
    '不规则节律（心房颤动、不等比下传的心房扑动、多源性房速、频发期前收缩）',
    'Irregular rhythms (AF, flutter with variable block, MAT, frequent ectopy)',
    'Ritmos irregulares (FA, flutter con conducción variable, TAM, extrasístoles frecuentes)',
  ),
  summary: l(
    '不规则节律只有两个入口：找心房活动，找RR的模式。房颤=绝对不齐+无可辨认的P波；不等比房扑、多源性房速、频发房早、窦性心律不齐和室性二联律各有各的签名。',
    'An irregular rhythm is read through two gates: find the atrial activity, then find the pattern in the RR. AF is irregularly irregular with no discernible P waves; flutter with variable block, MAT, frequent PACs, sinus arrhythmia and bigeminy each leave a different signature.',
    'Un ritmo irregular se lee por dos puertas: busca la actividad auricular y luego el patrón del RR. La FA es irregularmente irregular sin ondas P discernibles; el flutter con conducción variable, la TAM, las extrasístoles auriculares frecuentes, la arritmia sinusal y el bigeminismo dejan firmas distintas.',
  ),
  objectives: [
    l(
      '用两个问题拆解任何不规则节律：有没有心房活动？RR的不规则有没有模式？',
      'Break down any irregular rhythm with two questions: is there atrial activity, and is there a pattern in the irregularity?',
      'Descompón cualquier ritmo irregular con dos preguntas: ¿hay actividad auricular y hay un patrón en la irregularidad?',
    ),
    l(
      '说出房颤的心电图标准，并按指南要求记录在案（12导联或≥30秒单导联）。',
      'State the ECG criteria for AF and document it the way the guideline requires (a 12-lead or ≥30 s of a single lead).',
      'Expresa los criterios electrocardiográficos de la FA y documéntala como exige la guía (12 derivaciones o ≥30 s en una derivación).',
    ),
    l(
      '把不等比下传的房扑、多源性房速、频发房早、窦性心律不齐和室性二联律与房颤区分开。',
      'Separate flutter with variable block, MAT, frequent PACs, sinus arrhythmia and ventricular bigeminy from AF.',
      'Distingue de la FA el flutter con conducción variable, la TAM, las extrasístoles auriculares frecuentes, la arritmia sinusal y el bigeminismo ventricular.',
    ),
    l(
      '从心室率读出危险信号：>250且宽而不规则（预激房颤）、无药而慢、慢而规则（完全房室阻滞）。',
      'Read the red flags in the ventricular rate: wide and irregular above 250 (pre-excited AF), slow without drugs, slow and regular (complete AV block).',
      'Lee las señales de alarma en la frecuencia ventricular: ancha e irregular por encima de 250 (FA preexcitada), lenta sin fármacos, lenta y regular (bloqueo AV completo).',
    ),
  ],
  minutes: 15,
  competencies: ['C9'],
  findings: ['atrial-fibrillation', 'atrial-flutter', 'mat', 'pac', 'sinus-arrhythmia'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('atrial-fibrillation', 621, { fCoarseness: 0.55, ventricularResponse: 120 }),
      view: STRIP,
      question: l(
        '73岁男性，气促。没有P波，RR长短不一。你怎么证明这是心房颤动，而不是别的什么？先写下你的判断依据。',
        'A 73-year-old man, breathless. No P waves, and the RR intervals are all over the place. How do you prove this is atrial fibrillation and not something else? Commit to your evidence before the reveal.',
        'Un varón de 73 años, disneico. Sin ondas P y con intervalos RR caóticos. ¿Cómo demuestras que es fibrilación auricular y no otra cosa? Anota tus pruebas antes de la solución.',
      ),
      reveal: l(
        '两个发现定义房颤：**绝对不齐的RR**（房室传导完好时）加**无可辨认的重复P波**——只有大小、形状、间距都不等的f波。但这只是入口：诊断的记录要求（12导联或≥30秒单导联）、心室率透露的信息，以及五个能装成“房颤”的不规则节律，才是本课要练的东西。',
        'Two findings define AF: an **irregularly irregular RR** (with intact AV conduction) plus **no discernible repeating P waves** — only f waves of varying size, shape and spacing. But that is just the gate: the documentation rule (12-lead or ≥30 s single-lead), what the ventricular rate tells you, and five irregular rhythms that masquerade as "AF" are what this lesson drills.',
        'Dos hallazgos definen la FA: un RR **irregularmente irregular** (con conducción AV íntegra) y la **ausencia de ondas P que se repitan**: solo ondas f de tamaño, forma y distancia variables. Pero eso es solo la puerta: la regla de documentación (12 derivaciones o ≥30 s en una derivación), lo que dice la frecuencia ventricular y cinco ritmos irregulares que se disfrazan de «FA» son lo que entrena esta lección.',
      ),
    },
    {
      kind: 'text',
      title: l('不规则≠房颤：先问两个问题', 'Irregular does not mean AF: ask two questions first', 'Irregular no significa FA: haz primero dos preguntas'),
      body: l(
        '“不规则”是个入口，不是诊断。问两个问题：\n- **有没有心房活动？**——P′波、锯齿状F波、f波，还是什么都没有？\n- **RR的不规则有没有模式？**——绝对无章、成组、随呼吸渐变，还是藏着倍数关系？\n六个答案对应六个节律：\n- 心房颤动：无P，f波，RR绝对不齐；\n- 房扑不等比下传：锯齿F波，RR聚在恒定F–F的整数倍上；\n- 多源性房速：≥3种P′形态，心房率>100次/分，P′之间有等电位线（同样的图形而心率<100次/分 = 游走性心房起搏点，多为良性）；\n- 频发房早：提前且形态不同的P′，其后间歇小于完全代偿（r5）；\n- 窦性心律不齐：同一个P、同一个PR，PP随呼吸平滑变化（s3）；\n- 室性二联律：一窦一室早，长-短循环——“规则的不规则”。',
        '"Irregular" is a gate, not a diagnosis. Ask two questions:\n- **Is there atrial activity?** — P′ waves, sawtooth F waves, f waves, or nothing at all?\n- **Is there a pattern in the irregularity?** — totally random, grouped, swinging with respiration, or hiding a set of multiples?\nSix answers match six rhythms:\n- atrial fibrillation: no P, f waves, irregularly irregular RR;\n- flutter with variable block: sawtooth F waves, RR clustering at multiples of a constant F–F;\n- MAT: ≥3 P′ morphologies, atrial rate >100/min, isoelectric baseline between P′ (the same picture below 100/min = wandering atrial pacemaker, usually benign);\n- frequent PACs: early P′ of a different shape, pause less than compensatory (r5);\n- sinus arrhythmia: the same P at the same PR, PP swinging smoothly with respiration (s3);\n- ventricular bigeminy: one sinus beat, one PVC, long-short repeating — a "regularly irregular" rhythm.',
        '«Irregular» es una puerta, no un diagnóstico. Haz dos preguntas:\n- **¿Hay actividad auricular?** — ¿ondas P′, ondas F en dientes de sierra, ondas f o nada?\n- **¿Hay un patrón en la irregularidad?** — ¿caótica del todo, agrupada, oscilando con la respiración o escondiendo múltiplos?\nSeis respuestas corresponden a seis ritmos:\n- fibrilación auricular: sin P, ondas f, RR irregularmente irregular;\n- flutter con conducción variable: ondas F en dientes de sierra, RR agrupados en múltiplos de un F–F constante;\n- TAM: ≥3 morfologías de P′, frecuencia auricular >100 lpm, línea isoeléctrica entre P′ (la misma imagen por debajo de 100 lpm = marcapasos auricular migratorio, casi siempre benigno);\n- extrasístoles auriculares frecuentes: P′ precoz de morfología distinta, pausa menor que compensatoria (r5);\n- arritmia sinusal: la misma P con el mismo PR, PP oscilando suavemente con la respiración (s3);\n- bigeminismo ventricular: un latido sinusal y una extrasístole ventricular, largo-corto que se repite: un ritmo «regularmente irregular».',
      ),
    },
    {
      kind: 'criteria',
      title: l('心房颤动：标准、记录与危险信号', 'Atrial fibrillation: criteria, documentation and red flags', 'Fibrilación auricular: criterios, documentación y señales de alarma'),
      items: [
        {
          label: l('心房活动', 'Atrial activity', 'Actividad auricular'),
          value: l(
            '无可辨认的重复P波；f波约350–600次/分，V1最清楚，可粗可细甚至几乎看不见',
            'No discernible repeating P waves; f waves ≈350–600/min, best seen in V1; may be coarse, fine or nearly invisible',
            'Sin ondas P que se repitan; ondas f ≈350–600/min, mejor vistas en V1; pueden ser gruesas, finas o casi invisibles',
          ),
        },
        {
          label: l('RR间期', 'RR intervals', 'Intervalos RR'),
          value: l('房室传导完好时绝对不齐', 'Irregularly irregular when AV conduction is intact', 'Irregularmente irregulares con conducción AV íntegra'),
        },
        {
          label: l('临床诊断的记录要求', 'Documentation for the clinical diagnosis', 'Documentación del diagnóstico clínico'),
          value: l(
            '标准12导联心电图，或≥30秒的单导联记录；设备检出的房性高频事件不等于临床房颤',
            'A standard 12-lead ECG, or a single-lead tracing of ≥30 s; device-detected atrial high-rate episodes are not clinical AF',
            'ECG estándar de 12 derivaciones o registro de ≥30 s en una derivación; los episodios auriculares de alta frecuencia detectados por dispositivo no son FA clínica',
          ),
        },
        {
          label: l('未治疗心室率', 'Untreated ventricular rate', 'Frecuencia ventricular sin tratamiento'),
          value: l('通常100–180次/分', 'Typically 100–180/min', 'Típicamente 100–180 lpm'),
        },
        {
          label: l('红旗：预激合并房颤', 'Red flag: pre-excited AF', 'Señal de alarma: FA preexcitada'),
          value: l(
            '常>250次/分、不规则、宽QRS且逐搏变形；最短预激RR ≤ 250 ms为高危通路（t4）——禁用房室结阻滞药',
            'Often >250/min, irregular, wide QRS changing beat to beat; shortest pre-excited RR ≤250 ms marks a high-risk pathway (t4) — AV-nodal blockers are contraindicated',
            'A menudo >250 lpm, irregular, QRS ancho que cambia de latido en latido; el RR preexcitado más corto ≤250 ms marca una vía de alto riesgo (t4): los bloqueadores del nodo AV están contraindicados',
          ),
        },
        {
          label: l('红旗：缓慢心室率', 'Red flag: slow ventricular rate', 'Señal de alarma: frecuencia ventricular lenta'),
          value: l(
            '未用减慢药物而<60次/分 ⇒ 房室传导病变；慢而**规则** ⇒ 完全房室阻滞伴逸搏，绝不是“控制良好”',
            'Slow without rate-slowing drugs ⇒ AV conduction disease; slow and **regular** ⇒ complete AV block with an escape, never "well controlled"',
            'Lenta sin fármacos frenadores ⇒ enfermedad de la conducción AV; lenta y **regular** ⇒ bloqueo AV completo con escape, nunca «bien controlada»',
          ),
        },
        {
          label: l('房扑不等比下传（对比）', 'Flutter with variable block (for contrast)', 'Flutter con conducción variable (contraste)'),
          value: l(
            '心房有恒定F–F周期（典型250–330次/分锯齿波），RR聚在其整数倍上；房颤没有这样的公约数',
            'The atria keep a constant F–F cycle (typical sawtooth 250–330/min) and the RR cluster at its multiples; AF has no such common denominator',
            'Las aurículas mantienen un ciclo F–F constante (dientes de sierra típicos de 250–330 lpm) y el RR se agrupa en sus múltiplos; la FA no tiene ese común denominador',
          ),
        },
        {
          label: l('多源性房速（对比）', 'MAT (for contrast)', 'TAM (contraste)'),
          value: l(
            '≥3种P′形态，心房率>100次/分，P′间有等电位线，PP/PR/RR均多变',
            '≥3 P′ morphologies, atrial rate >100/min, isoelectric baseline between P′, variable PP/PR/RR',
            '≥3 morfologías de P′, frecuencia auricular >100 lpm, línea isoeléctrica entre P′, PP/PR/RR variables',
          ),
        },
      ],
      source: 'Van Gelder IC et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45:3314-3414',
    },
    {
      kind: 'text',
      title: l('心室率本身会说话', 'The ventricular rate speaks for itself', 'La frecuencia ventricular habla por sí sola'),
      body: l(
        '心室率不是一个需要控制的数字，而是诊断线索：\n- 未治疗的房颤通常**100–180次/分**——房室结的不应期和隐匿传导决定了这个窗口；\n- **>250次/分、宽QRS、逐搏变形**的不规则心动过速是预激合并房颤：激动经旁路下传，腺苷、维拉帕米、地高辛都禁用（t4）；\n- 没用减慢药物却<60次/分：怀疑房室传导本身有病；\n- 慢而**规则**：这不是“控制满意”，而是完全房室阻滞伴逸搏心律——经典原因是地高辛中毒，处理是评估起搏，不是庆祝。',
        'The ventricular rate is not a number to control but a diagnostic clue:\n- untreated AF runs **100–180/min** — AV-nodal refractoriness and concealed conduction set that window;\n- an irregular tachycardia **above 250/min, wide, changing shape beat to beat** is pre-excited AF: the impulses come down an accessory pathway, and adenosine, verapamil and digoxin are all contraindicated (t4);\n- below 60/min with no rate-slowing drug on board: suspect disease of the AV conduction itself;\n- slow and **regular**: that is not "satisfactory control", it is complete AV block with an escape rhythm — classically digoxin toxicity; the answer is a pacing evaluation, not congratulations.',
        'La frecuencia ventricular no es una cifra que controlar, sino una pista diagnóstica:\n- la FA sin tratamiento va a **100–180 lpm**: la refractariedad y la conducción oculta del nodo AV fijan esa ventana;\n- una taquicardia irregular **por encima de 250 lpm, ancha y cambiando de forma latido a latido** es FA preexcitada: los impulsos bajan por una vía accesoria, y adenosina, verapamilo y digoxina están contraindicados (t4);\n- por debajo de 60 lpm sin fármacos frenadores: sospecha enfermedad de la propia conducción AV;\n- lenta y **regular**: no es «control satisfactorio», es un bloqueo AV completo con ritmo de escape — clásicamente intoxicación por digoxina; la respuesta es valorar un marcapasos, no felicitarse.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('atrial-fibrillation', 625, undefined, 'slow'),
      view: STRIP,
      marks: [{ auto: 'f-waves' }, { auto: 'rr' }],
      caption: l(
        '缓慢心室率的房颤（未用药）。RR仍然绝对不齐——慢不改变诊断。现在问三件事：真的没在用减慢心率的药吗？房室传导本身有没有病？如果哪天RR变**规则**了，那是逸搏心律接管（完全房室阻滞），一个全新的诊断。',
        'AF with a slow ventricular response (no drugs). The RR is still irregularly irregular — slowness does not change the diagnosis. Now ask three things: is the patient truly on no rate-slowing drug? is the AV conduction itself diseased? and if the RR ever becomes **regular**, an escape rhythm has taken over (complete AV block) — a completely new diagnosis.',
        'FA con respuesta ventricular lenta (sin fármacos). El RR sigue irregularmente irregular: la lentitud no cambia el diagnóstico. Pregúntate tres cosas: ¿no toma realmente fármacos que frenen la frecuencia? ¿está enferma la propia conducción AV? Y si algún día el RR se vuelve **regular**, un ritmo de escape ha tomado el mando (bloqueo AV completo): un diagnóstico completamente nuevo.',
      ),
    },
    {
      kind: 'worked',
      title: l('真的绝对不齐吗？用分规走RR', 'Is it really irregularly irregular? March the RR', '¿De verdad es irregularmente irregular? Recorre el RR con el compás'),
      ecg: synth('atrial-flutter', 622, undefined, 'variable'),
      steps: [
        {
          title: l('第一步：量出每个RR', 'Step 1: measure every RR', 'Paso 1: mide cada RR'),
          body: l(
            '乍一看这也像“绝对不齐”。把分规卡在最短的RR上，沿节律条逐搏记录每个RR。',
            'At first glance this also passes for "irregularly irregular". Set your calipers to the shortest RR and walk down the strip, writing down every interval.',
            'A primera vista también pasa por «irregularmente irregular». Ajusta el compás al RR más corto y recorre la tira anotando cada intervalo.',
          ),
          marks: [{ auto: 'rr' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('第二步：找公约数', 'Step 2: look for a common denominator', 'Paso 2: busca un común denominador'),
          body: l(
            '每个RR都（±少许抖动）等于同一个短间期的整数倍——这个间期就是F–F（约200 ms，心房约300次/分）。真正的房颤没有这样的公约数。',
            'Every RR is (± a little jitter) a whole-number multiple of one short interval — that interval is the F–F (about 200 ms, an atrial rate near 300/min). True AF has no such common denominator.',
            'Cada RR es (± una pequeña oscilación) múltiplo entero de un intervalo corto: ese intervalo es el F–F (unos 200 ms, frecuencia auricular cercana a 300 lpm). La FA verdadera no tiene ese común denominador.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('第三步：找到F波', 'Step 3: find the F waves', 'Paso 3: encuentra las ondas F'),
          body: l(
            'II、III、aVF里是连续的锯齿波，之间没有等电位线；V1更清楚。传导比例在3:1、4:1、5:1之间变换（本条没有2:1），所以RR不等——**有组织的不规则**。',
            'In II, III and aVF the baseline is continuous sawtooth with no isoelectric line; V1 shows it even better. The conduction ratio keeps changing between 3:1, 4:1 and 5:1 (no 2:1 on this strip), which is why the RR vary — an **organized irregularity**.',
            'En II, III y aVF la línea de base es un diente de sierra continuo sin línea isoeléctrica; en V1 se ve todavía mejor. La relación de conducción cambia entre 3:1, 4:1 y 5:1 (en esta tira no hay 2:1), y por eso varía el RR: una **irregularidad organizada**.',
          ),
          marks: [{ auto: 'f-waves' }],
        },
        {
          title: l('第四步：命名', 'Step 4: name it', 'Paso 4: nómbralo'),
          body: l(
            '房扑伴不等比房室传导——不是房颤。房扑的详细读法在t3；这里的教训是：**先在不规则里找出模式，再签报告**。',
            'Flutter with variable AV block — not AF. Flutter gets its own lesson (t3); the lesson here is: **find the pattern inside the irregularity before you sign the report**.',
            'Flutter con conducción AV variable — no FA. El flutter tiene su propia lección (t3); lo que cuenta aquí: **encuentra el patrón dentro de la irregularidad antes de firmar el informe**.',
          ),
          marks: [{ auto: 'rr' }],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('好几种P′，还是没有P？', 'Several different P′ waves, or no P at all?', '¿Varias P′ distintas o ninguna P?'),
      view: STRIP,
      left: {
        ecg: synth('mat', 623),
        caption: l('74岁，慢阻肺急性加重', '74 years, acutely decompensated COPD', '74 años, EPOC descompensada'),
        marks: [{ auto: 'p' }, { auto: 'p', beat: 3, label: l('另一种P′形态', 'another P′ shape', 'otra morfología de P′') }],
      },
      right: {
        ecg: synth('atrial-fibrillation', 624),
        caption: l('73岁，气促', '73 years, breathless', '73 años, disneico'),
        marks: [{ auto: 'f-waves' }],
      },
      point: l(
        '左：**≥3种P′形态**，各有各的PR和PP，P′之间回到等电位线，心房率>100次/分——多源性房速。心房是有组织的，只是起搏点在变换（P′极性还能指出病灶：II、III、aVF负向=低位起源，I、aVL负向=左房）。右：**完全没有P**，只有f波和绝对不齐的RR——房颤。左边的经典背景是严重肺病：治疗的是肺和缺氧；把MAT当房颤上地高辛是经典错误（地高辛中毒本身就会引起有组织的房速）。',
        'Left: **≥3 P′ morphologies**, each with its own PR and PP, an isoelectric baseline between them, atrial rate >100/min — multifocal atrial tachycardia. The atria are organized; only the pacemaker keeps changing (P′ polarity even points to the focus: negative in II, III, aVF = a low origin; negative in I, aVL = left atrium). Right: **no P waves at all**, only f waves and an irregularly irregular RR — AF. The classic setting on the left is severe lung disease: you treat the lungs and the hypoxia; treating MAT as AF with digoxin is the classic error (digoxin toxicity itself causes organized atrial tachycardia).',
        'Izquierda: **≥3 morfologías de P′**, cada una con su PR y su PP, línea isoeléctrica entre ellas y frecuencia auricular >100 lpm: taquicardia auricular multifocal. Las aurículas están organizadas; solo cambia el marcapasos (la polaridad de la P′ incluso señala el foco: negativa en II, III y aVF = origen bajo; negativa en I y aVL = aurícula izquierda). Derecha: **ninguna onda P**, solo ondas f y un RR irregularmente irregular: FA. El escenario clásico de la izquierda es la enfermedad pulmonar grave: se tratan el pulmón y la hipoxia; tratar la TAM como FA con digoxina es el error clásico (la propia intoxicación digoxínica causa taquicardias auriculares organizadas).',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('pac', 626, { rate: 76 }),
      view: STRIP,
      marks: [{ auto: 'p' }],
      caption: l(
        '一个房早就足以打破节律（本条只有一个；频发时整条都会显得“不规则”）。提前的P′形态与窦性P不同（这里起自左房下部：下壁导联倒置），其后的间歇小于完全代偿——窦房结被它重置了（r5）。当很早的房早落在T波上被挡住不下传时，节律看起来像窦性心动过缓：去T波里找P′。',
        'One PAC is enough to break the rhythm (there is a single one on this strip; when they are frequent the whole strip looks "irregular"). The early P′ differs in shape from the sinus P (here it comes from the low left atrium: negative in the inferior leads), and the pause after it is less than compensatory — the sinus node has been reset (r5). When a very early PAC lands on the T wave and is blocked, the rhythm looks like sinus bradycardia: go searching inside the T waves.',
        'Una sola extrasístole auricular basta para romper el ritmo (en esta tira hay una; cuando son frecuentes, toda la tira parece «irregular»). La P′ precoz tiene una morfología distinta de la P sinusal (aquí nace en la parte baja de la aurícula izquierda: negativa en las inferiores) y la pausa que sigue es menor que compensatoria: el nodo sinusal se ha reiniciado (r5). Cuando una extrasístole muy precoz cae sobre la onda T y se bloquea, el ritmo parece una bradicardia sinusal: busca la P′ dentro de las ondas T.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('ventricular-bigeminy', 627),
      view: STRIP,
      marks: [{ auto: 'qrs' }],
      caption: l(
        '“规则的不规则”：一个窦性搏动、一个提前的宽QRS（其前无相关P），长-短循环严格重复。这不是房颤——模式是周期性的。数心率时当心：6秒×10会被成对搏动带偏，逐搏数满整条再除以时间才可靠。',
        'A "regularly irregular" rhythm: one sinus beat, one premature wide QRS with no P related to it, the long-short pair repeating exactly. This is not AF — the pattern is periodic. Mind the rate, too: the 6-seconds-times-10 rule is misled by pairing; count every beat over the whole strip and divide by time.',
        'Un ritmo «regularmente irregular»: un latido sinusal, un QRS ancho precoz sin P relacionada, y el par largo-corto repitiéndose exacto. Esto no es FA: el patrón es periódico. Cuidado con la frecuencia: la regla de 6 s × 10 despista con el acoplamiento; cuenta todos los latidos de la tira y divide por el tiempo.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('sinus-arrhythmia', 628, { rate: 72, hrv: 0.16 }),
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'rr' }],
      caption: l(
        '复习s3：窦性心律不齐也让RR不等——但P波相同、PR相同，PP随呼吸平滑地摆动，没有提前的搏动，没有混乱的基线。与房颤的差别一句话：**一切都在渐变，没有任何东西提前**。',
        'Revision of s3: sinus arrhythmia also makes the RR vary — but the P is the same, the PR is the same, and the PP swings smoothly with respiration: no premature beats, no chaotic baseline. Against AF in one sentence: **everything changes gradually, nothing arrives early**.',
        'Repaso de s3: la arritmia sinusal también hace variar el RR, pero la P es la misma, el PR es el mismo y el PP oscila suavemente con la respiración: nada precoz, ninguna línea de base caótica. Frente a la FA en una frase: **todo cambia de forma gradual, nada llega antes de tiempo**.',
      ),
    },
    { kind: 'check', item: { family: 'irregular', seed: 13 } },
    { kind: 'check', item: { family: 'irregular', seed: 15 } },
    { kind: 'check', item: { family: 'rate-irregular', seed: 5 } },
    { kind: 'drill', families: ['irregular'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [14102, 12542, 4117],
      caption: l(
        '三份真实房颤。揭晓前先承诺：心室率多少（不规则节律用6秒×10计数，300法则在这里作废）；f波是粗是细（看V1）；下一步做什么——控制心室率还是抗凝，取决于临床而不只是心电图。一份约170次/分（未控制的典型窗口上限），一份只有约50次/分——问问自己：用药了吗？还是房室传导有病？还有一份来自39岁男性：房颤不看年龄。',
        'Three real atrial fibrillation tracings. Commit before the reveal: what is the ventricular rate (use the 6-seconds-times-10 count for irregular rhythms — the 300 rule is useless here); are the f waves coarse or fine (check V1); and what would you do next — rate control versus anticoagulation depends on the patient, not on the tracing alone. One runs at about 170/min (the top of the untreated window), one at only about 50/min — ask yourself: drugs, or AV conduction disease? And one comes from a 39-year-old man: AF does not check your age.',
        'Tres trazados reales de fibrilación auricular. Comprométete antes de la solución: ¿qué frecuencia ventricular tiene (usa el recuento de 6 s × 10 en ritmos irregulares; la regla del 300 aquí no sirve)? ¿Las ondas f son gruesas o finas (mira V1)? ¿Y qué harías después: el control de la frecuencia o la anticoagulación dependen del paciente, no solo del trazado. Uno va a unos 170 lpm (el techo de la ventana sin tratamiento), otro a solo unos 50 lpm: ¿fármacos o enfermedad de la conducción AV? Y otro es de un varón de 39 años: la FA no pregunta la edad.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '看五秒监护条就写“房颤”：既没搜P波，也不满足指南的记录要求（12导联或≥30秒单导联）。',
          'Writing "AF" off a five-second monitor glance: no P-wave search, and none of the documentation the guideline requires (12-lead or ≥30 s single-lead).',
          'Escribir «FA» tras cinco segundos de monitor: sin buscar ondas P y sin la documentación que exige la guía (12 derivaciones o ≥30 s en una derivación).',
        ),
        l(
          '把多源性房速叫成房颤并上地高辛：MAT的经典背景是严重肺病，而地高辛中毒本身就会引起有组织的房速——治肺，别治错药。',
          'Calling MAT "AF" and starting digoxin: MAT belongs to severe lung disease, and digoxin toxicity itself causes organized atrial tachycardia — treat the lungs, not with the wrong drug.',
          'Llamar «FA» a la TAM y empezar digoxina: la TAM pertenece a la enfermedad pulmonar grave y la propia intoxicación digoxínica causa taquicardias auriculares organizadas: trata el pulmón, no con el fármaco equivocado.',
        ),
        l(
          '“不规则就是房颤”：不等比下传的房扑被漏诊——用分规走RR，倍数关系自己会现形。',
          '"Irregular means AF": flutter with variable block gets missed — march the RR with calipers and the multiples reveal themselves.',
          '«Irregular significa FA»: el flutter con conducción variable pasa desapercibido; recorre el RR con el compás y los múltiplos se delatan solos.',
        ),
        l(
          '房颤心室率慢而规则被写成“控制良好”：这是完全房室阻滞伴逸搏（地高辛中毒经典），下一步是评估起搏。',
          'AF with a slow, regular rate reported as "well controlled": that is complete AV block with an escape (digoxin toxicity classic); the next step is a pacing evaluation.',
          'Una FA lenta y regular informada como «bien controlada»: es un bloqueo AV completo con escape (clásico de intoxicación digoxínica); el siguiente paso es valorar un marcapasos.',
        ),
        l(
          '伪差伪装成房颤：颤抖或松动的电极让基线毛糙——检查“f波”和RR的变化是否在每个导联一致出现。',
          'Artefact masquerading as AF: tremor or a loose electrode roughens the baseline — check that the "f waves" and the RR variation appear consistently in every lead.',
          'Artefactos disfrazados de FA: el temblor o un electrodo suelto descuelgan la línea de base; comprueba que las «ondas f» y la variación del RR aparezcan de forma coherente en todas las derivaciones.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '房颤 = 绝对不齐的RR + 无可辨认的重复P波；临床诊断要12导联或≥30秒单导联记录在案。',
          'AF = an irregularly irregular RR plus no discernible repeating P waves; the clinical diagnosis needs a 12-lead or a ≥30 s single-lead tracing on record.',
          'FA = RR irregularmente irregular sin ondas P que se repitan; el diagnóstico clínico exige un registro de 12 derivaciones o ≥30 s en una derivación.',
        ),
        l(
          '签字之前跑一遍鉴别：不等比房扑（RR=F–F的倍数）、MAT（≥3种P′）、频发房早（提前的P′+不完全代偿）、窦性心律不齐（同P渐变）、室性二联律（规则的不规则）。',
          'Run the differential before you sign: flutter with variable block (RR in F–F multiples), MAT (≥3 P′ shapes), frequent PACs (early P′ with a less-than-compensatory pause), sinus arrhythmia (same P, gradual), bigeminy (regular irregularity).',
          'Recorre el diagnóstico diferencial antes de firmar: flutter con conducción variable (RR en múltiplos del F–F), TAM (≥3 morfologías de P′), extrasístoles auriculares frecuentes (P′ precoz con pausa menor que compensatoria), arritmia sinusal (misma P, gradual) y bigeminismo (irregularidad regular).',
        ),
        l(
          '心室率是线索：未治疗100–180；>250且宽而不规则=预激房颤（禁用房室结阻滞药，t4）；无药而慢=房室传导病变；慢而规则=完全房室阻滞。',
          'The ventricular rate is a clue: 100–180 untreated; above 250, wide and irregular = pre-excited AF (no AV-nodal blockers, t4); slow without drugs = AV conduction disease; slow and regular = complete AV block.',
          'La frecuencia ventricular es una pista: 100–180 sin tratamiento; >250, ancha e irregular = FA preexcitada (sin bloqueadores del nodo AV, t4); lenta sin fármacos = enfermedad de la conducción AV; lenta y regular = bloqueo AV completo.',
        ),
        l(
          'MAT治肺和缺氧，不是地高辛；房扑的心房有恒定周期——峡部依赖的电路可经导管消融根治（t3）。',
          'MAT is treated by treating the lungs and the hypoxia, not with digoxin; flutter keeps a constant atrial cycle — the isthmus-dependent circuit is curable by catheter ablation (t3).',
          'La TAM se trata tratando el pulmón y la hipoxia, no con digoxina; el flutter mantiene un ciclo auricular constante: el circuito dependiente del istmo se cura con ablación por catéter (t3).',
        ),
      ],
    },
  ],
  sources: [
    'Van Gelder IC et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45:3314-3414',
    'Brugada J et al. 2019 ESC Guidelines for the management of patients with supraventricular arrhythmias. Eur Heart J 2020;41:655-720',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
