/**
 * t6 — Polymorphic VT, torsades, VF, asystole, PEA and artefact mimicking VT (docs/PLAN.md §3, stage T).
 * Criteria: docs/curriculum/criteria.md `torsades`, `vt-criteria`, `pvc-criteria` (current values, not the book
 * values) plus the missing-book bullets "Polymorphic VT with normal QT", "Ventricular fibrillation — fine VF vs
 * asystole" and the artefact-mimicking-arrhythmia clue list under `basics-technique-leads-paper` (Knight 1999);
 * first actions per ERC adult advanced life support (2025, unchanged from 2021 for these points).
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
/** the twisting and the long sinus QT of the torsades scenario show best in V3 (since the 2026-10-29 engine fix the twist is clear in II too) */
const STRIP_V3 = { layout: 'strip', lead: 'V3' } as const;

const lesson: Lesson = {
  id: 't6',
  stage: 'T',
  order: 6,
  title: l(
    '多形性室速、尖端扭转型室速、心室颤动、心室停搏、无脉性电活动及类似室速的伪差',
    'Polymorphic VT, torsades, VF, asystole, PEA and artefact mimicking VT',
    'TV polimorfa, torsade de pointes, FV, asistolia, AESP y artefactos que simulan una TV',
  ),
  summary: l(
    '每一段多形性室速都要先在窦性搏动上测 QT：QT 明显延长才是尖端扭转型室速（停药、补钾镁、静脉镁剂），QT 正常则指向缺血。室颤与心室扑动立即除颤；停搏与无脉性电活动不可电击；伪差也能扮演室速——真正的 QRS 一直在穿行。',
    'Measure the QT on a sinus beat in every polymorphic VT: only marked QT prolongation makes it torsades (stop the drug, K⁺/Mg²⁺, IV magnesium); a normal QT points to ischaemia. VF and ventricular flutter get immediate defibrillation; asystole and PEA are non-shockable; and artefact can play VT while the real QRS complexes march through.',
    'Mide el QT en un latido sinusal ante toda TV polimorfa: solo un QT muy prolongado la convierte en torsade (suspender el fármaco, K⁺/Mg²⁺, magnesio intravenoso); un QT normal apunta a isquemia. La FV y el flutter ventricular se desfibrilan de inmediato; la asistolia y la AESP no se desfibrilan; y el artefacto puede hacer de TV mientras los QRS reales desfilan.',
  ),
  objectives: [
    l(
      '把尖端扭转型室速与 QT 正常的（缺血性）多形性室速区分开：在窦性搏动上测 QT，并说出两者不同的第一步处理。',
      'Separate torsades de pointes from polymorphic VT with a normal QT (ischaemic): measure the QT on the sinus beats and state the different first actions.',
      'Distinguir la torsade de pointes de la TV polimorfa con QT normal (isquémica): medir el QT en los latidos sinusales y citar las primeras actuaciones, que son distintas.',
    ),
    l(
      '识别心室颤动（粗颤与细颤）和心室扑动，并说出为什么两者都要立即除颤。',
      'Recognise ventricular fibrillation (coarse and fine) and ventricular flutter, and say why both get immediate defibrillation.',
      'Reconocer la fibrilación ventricular (gruesa y fina) y el flutter ventricular y explicar por qué ambos exigen desfibrilación inmediata.',
    ),
    l(
      '识别停搏（包括 P 波性停搏）与无脉性电活动为不可电击心律，并说出处理与 4 H/4 T。',
      'Recognise asystole (including P-wave asystole) and PEA as non-shockable rhythms, and state their management and the 4 Hs and 4 Ts.',
      'Reconocer la asistolia (también la que conserva ondas P) y la AESP como ritmos no desfibrilables y citar su tratamiento y las 4 H y 4 T.',
    ),
    l(
      '用三条线索（QRS 按原间期穿行、导联间差异、患者状态不变）识破伪差性“室速”。',
      'Unmask artefactual "VT" with the three clues: QRS complexes marching through, lead-to-lead differences, an unchanged patient.',
      'Desenmascarar la «TV» por artefacto con las tres pistas: QRS que desfilan, diferencias entre derivaciones y paciente sin cambios.',
    ),
  ],
  minutes: 15,
  competencies: ['C9', 'C10'],
  findings: ['vt-polymorphic', 'torsades', 'ventricular-flutter', 'ventricular-fibrillation', 'asystole'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('torsades', 701),
      view: STRIP_V3,
      question: l(
        '监护导联 V3：QRS 绕着基线扭转，约 220 次/分。“扭转”本身就够下诊断吗？你要先检查什么？想好你的判读。',
        'Monitor lead V3: the QRS complexes twist around the baseline at about 220/min. Is the twisting alone enough for the diagnosis — and what do you check first? Commit to your reading.',
        'Derivación V3 del monitor: los complejos QRS giran alrededor de la línea de base a unos 220 lpm. ¿Basta el giro para el diagnóstico? ¿Qué compruebas primero? Decide tu lectura.',
      ),
      reveal: l(
        'QRS 绕等电位线扭转 = **多形性室速**；只有当**窦性搏动的 QT 明显延长**时才叫**尖端扭转型室速**。先回到发作前的窦性搏动测 QT（用第一个窦性搏动——第二个的 T 波被室早打断了）——这里 QT 约 580 ms、QTc ≈ 570–590 ms（高危界值 >500 ms）：药物诱发的长 QT。处理：停用延长 QT 的药物、纠正低钾低镁、静脉硫酸镁；不稳定时电除颤（多形性室速无法同步）。它常自行终止，但可恶化为室颤。若 QT 正常，同样的图形更可能是缺血——处理完全不同，这是本课的核心。',
        'A QRS twisting around the isoelectric line = **polymorphic VT**; it is **torsades de pointes** only when the QT of the sinus beats is markedly prolonged. Go back to the sinus beats before the run and measure the QT (use the first sinus beat — the T of the second is cut short by the PVC) — here the QT is about 580 ms, a QTc of about 570-590 ms (high-risk threshold >500 ms): a drug-induced long QT. Management: stop the QT-prolonging drug, correct low K⁺ and Mg²⁺, give IV magnesium; defibrillate if unstable (polymorphic VT cannot be synchronised). It often self-terminates, but it can degenerate into VF. With a normal QT the same pattern is more likely ischaemic — and the management is completely different. That is the core of this lesson.',
        'Un QRS que gira alrededor de la línea isoeléctrica = **TV polimorfa**; solo es **torsade de pointes** si el QT de los latidos sinusales está muy prolongado. Vuelve a los latidos sinusales previos al episodio y mide el QT (usa el primer latido sinusal: la T del segundo queda cortada por la extrasístole): aquí el QT ronda 580 ms, un QTc de unos 570-590 ms (umbral de alto riesgo >500 ms), un QT largo farmacológico. Tratamiento: suspender el fármaco que alarga el QT, corregir K⁺ y Mg²⁺ bajos y dar sulfato de magnesio intravenoso; desfibrilar si hay inestabilidad (la TV polimorfa no se puede sincronizar). Suele autolimitarse, pero puede degenerar en FV. Con un QT normal, el mismo patrón sugiere isquemia y el tratamiento es completamente distinto: ese es el núcleo de esta lección.',
      ),
    },
    {
      kind: 'text',
      title: l('多形性室速：先问 QT', 'Polymorphic VT: ask about the QT first', 'TV polimorfa: pregunta primero por el QT'),
      body: l(
        '室速 = 连续 ≥3 个室性搏动且 >100 次/分（周长 <600 ms）；非持续性 <30 秒，持续性 >30 秒或因血流动力学不稳定提前终止。**多形性**室速 = QRS 形态逐搏变化。\n对每一段多形性室速问两件事：\n- **窦性搏动的 QT 长吗？** 长（QTc >500 ms，或用延长 QT 药物后较基线延长 ≥60 ms）⇒ **尖端扭转型室速**：QRS 振幅与极性绕等电位线扭转（约每 5–20 个搏动一个周期），约 160–240（可达 250）次/分，常伴 QT-U 畸形。典型发作是**停搏依赖性**的短–长–短序列：一个室早落在停搏后搏动 T/U 波的顶点附近（R-on-T）——因为 QT 很长，它的耦联间期并不短（常 400–600 ms）。处理：停 QT 药物、纠正低钾低镁、静脉镁剂；停搏依赖性发作用起搏或异丙肾上腺素提频。\n- **QT 正常吗？** ⇒ 多为**急性缺血**（或少见的短耦联特发性室颤）——处理是再灌注和抗心律失常药，**不是**镁剂和起搏。镁剂治不了它，还会耽误找到闭塞的冠脉。',
        'VT = three or more consecutive ventricular beats at >100/min (cycle length <600 ms); non-sustained VT stops within 30 s, sustained VT lasts >30 s or is terminated earlier for haemodynamic compromise. **Polymorphic** VT = a QRS morphology that changes beat to beat.\nAsk two questions of every polymorphic run:\n- **Is the QT of the sinus beats long?** Yes (QTc >500 ms, or a rise of >=60 ms from baseline on a QT-prolonging drug) => **torsades de pointes**: QRS amplitude and polarity twist around the isoelectric line (a full cycle every ~5-20 beats) at ~160-240 (up to 250)/min, often with QT-U distortion. The typical onset is **pause-dependent**: a short-long-short sequence with a PVC landing near the peak of the T/U wave of the post-pause beat (R-on-T) — because the QT is long, its coupling interval is not short (often 400-600 ms). Management: stop the QT drug, correct low K⁺ and Mg²⁺, give IV magnesium; for pause-dependent runs, speed the rate up with pacing or isoprenaline.\n- **Is the QT normal?** => think **acute ischaemia** (or the rare short-coupled idiopathic VF) — the treatment is revascularisation and antiarrhythmics, **not** magnesium and pacing. Magnesium will not fix it, and it delays finding the occluded coronary artery.',
        'TV = tres o más latidos ventriculares consecutivos a >100 lpm (ciclo <600 ms); la TV no sostenida cede en <30 s, la sostenida dura >30 s o se termina antes por inestabilidad hemodinámica. La **TV polimorfa** = una morfología de QRS que cambia de latido en latido.\nAnte cualquier episodio de TV polimorfa, dos preguntas:\n- **¿Está largo el QT de los latidos sinusales?** Sí (QTc >500 ms, o un alargamiento >=60 ms respecto de la línea de base con un fármaco que alarga el QT) => **torsade de pointes**: la amplitud y la polaridad del QRS giran alrededor de la línea isoeléctrica (un ciclo cada ~5-20 latidos) a ~160-240 (hasta 250) lpm, a menudo con distorsión QT-U. El inicio típico es **dependiente de pausa**: secuencia corto-largo-corto con una extrasístole que cae cerca de la cima de la onda T/U del latido pospausa (R sobre T); como el QT es largo, su acoplamiento no es corto (a menudo 400-600 ms). Tratamiento: suspender el fármaco, corregir K⁺ y Mg²⁺ bajos, magnesio intravenoso; en los episodios dependientes de pausa, acelerar con estimulación o isoprenalina.\n- **¿El QT es normal?** => piensa en **isquemia aguda** (o en la poco común FV idiopática de acoplamiento corto): el tratamiento es la reperfusión y los antiarrítmicos, **no** el magnesio ni la estimulación. El magnesio no la corrige y retrasa encontrar la arteria coronaria ocluida.',
      ),
    },
    {
      kind: 'criteria',
      title: l('数值卡：多形性室速与心室颤动', 'Numbers: polymorphic VT and ventricular fibrillation', 'Números: TV polimorfa y fibrilación ventricular'),
      items: [
        {
          label: l('尖端扭转型室速', 'Torsades de pointes', 'Torsade de pointes'),
          value: l(
            'QRS 振幅与极性绕等电位线扭转（约每 5–20 个搏动一个周期），约 160–240（可达 250）次/分；窦性搏动 QT 明显延长，常伴 QT-U 畸形',
            'QRS amplitude and polarity twist around the isoelectric line (a cycle every ~5-20 beats) at ~160-240 (up to 250)/min; markedly prolonged QT in the sinus beats, often with QT-U distortion',
            'La amplitud y la polaridad del QRS giran alrededor de la línea isoeléctrica (un ciclo cada ~5-20 latidos) a ~160-240 (hasta 250) lpm; QT muy prolongado en los latidos sinusales, a menudo con distorsión QT-U',
          ),
        },
        {
          label: l('高危 QTc', 'High-risk QTc', 'QTc de alto riesgo'),
          value: l(
            'QTc >500 ms，或用延长 QT 药物后较基线延长 ≥60 ms',
            'QTc >500 ms, or a rise of >=60 ms from baseline on a QT-prolonging drug',
            'QTc >500 ms, o un alargamiento >=60 ms respecto de la línea de base con un fármaco que alarga el QT',
          ),
        },
        {
          label: l('触发搏动（R-on-T）', 'The triggering beat (R-on-T)', 'El latido desencadenante (R sobre T)'),
          value: l(
            '停搏后搏动的 T（或 T/U）波顶点附近出现的室早；长 QT 时其耦联间期常为 400–600 ms——耦联 <300 ms 而 QT 正常提示另一种疾病（短耦联尖端扭转/特发性室颤）。室早本身 = 提前的宽 QRS（通常 ≥120 ms、束支阻滞形、其前无相关 P 波），伴与主波方向相反的继发性 ST-T',
            'A PVC landing near the peak of the T (or T/U) wave of the post-pause beat; with a long QT its coupling is often 400-600 ms — a coupling <300 ms with a normal QT points to a different disease (short-coupled torsades / idiopathic VF). The PVC itself = a premature wide QRS (usually >=120 ms, bundle-branch-block-like, with no related P before it) and secondary ST-T opposite to the main deflection',
            'Una extrasístole ventricular que cae cerca de la cima de la onda T (o T/U) del latido pospausa; con QT largo su acoplamiento suele ser de 400-600 ms; un acoplamiento <300 ms con QT normal apunta a otra entidad (torsade de acoplamiento corto / FV idiopática). La EV en sí = QRS ancho prematuro (habitualmente >=120 ms, tipo bloqueo de rama, sin P relacionada antes) con ST-T secundario opuesto a la deflexión principal',
          ),
        },
        {
          label: l('心室扑动', 'Ventricular flutter', 'Flutter ventricular'),
          value: l(
            '规则的单形正弦波，约 300 次/分（周长 ≈200 ms，变异 ≤约 30 ms），无等电位间期，QRS 与 T 无法分辨',
            'A regular monomorphic sine wave at about 300/min (cycle length ~200 ms, variability <=~30 ms), with no isoelectric interval and no separable QRS or T',
            'Onda sinusal monomorfa regular a unos 300 lpm (ciclo ~200 ms, variabilidad <=~30 ms), sin intervalo isoeléctrico y sin QRS ni T separables',
          ),
        },
        {
          label: l('心室颤动', 'Ventricular fibrillation', 'Fibrilación ventricular'),
          value: l(
            '通常 >300 次/分（周长 ≤180 ms），显著不规则：周长、形态与振幅都在变；分粗颤与细颤',
            'Usually >300/min (cycle length <=180 ms), grossly irregular: cycle length, morphology and amplitude all vary; coarse or fine',
            'Habitualmente >300 lpm (ciclo <=180 ms), groseramente irregular: varían el ciclo, la morfología y la amplitud; gruesa o fina',
          ),
        },
        {
          label: l('细颤与停搏', 'Fine VF vs asystole', 'FV fina frente a asistolia'),
          value: l(
            '细颤可酷似停搏：报“直线”前至少查两个导联，并确认增益与导联连接',
            'Fine VF can mimic asystole: before reporting a "flat line", check at least two leads and confirm the gain and lead connections',
            'La FV fina puede simular asistolia: antes de informar «línea plana», comprueba al menos dos derivaciones y confirma ganancia y conexiones',
          ),
        },
      ],
      source:
        'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307; Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    },
    {
      kind: 'worked',
      title: l('这条监护条：确认、分类、行动', 'This monitor strip: confirm, classify, act', 'Esta tira de monitor: confirma, clasifica, actúa'),
      ecg: synth('ventricular-fibrillation', 702),
      view: STRIP,
      steps: [
        {
          title: l('你看到什么？', 'What do you see?', '¿Qué ves?'),
          body: l(
            '没有任何可辨认的 P、QRS 或 T：只有形态、振幅和周长都在变的混乱波动——节律显著不规则，任何间期都无法测量。这是**心室颤动**。',
            'No identifiable P, QRS or T anywhere: only chaotic undulation with morphology, amplitude and cycle length all changing — a grossly irregular rhythm in which no interval can be measured. This is **ventricular fibrillation**.',
            'Ninguna P, QRS o T reconocible: solo oscilación caótica con morfología, amplitud y ciclo cambiantes; un ritmo groseramente irregular en el que no se puede medir ningún intervalo. Es una **fibrilación ventricular**.',
          ),
        },
        {
          title: l('粗还是细？', 'Coarse or fine?', '¿Gruesa o fina?'),
          body: l(
            '按振幅分**粗颤**与**细颤**。粗颤常见于骤停早期；细颤振幅低，越细越是晚期。分类不改变处理——两者都除颤。',
            'By amplitude: **coarse** or fine. Coarse VF is typical of early arrest; fine VF is low-amplitude and later. The class does not change the management — both are defibrillated.',
            'Por amplitud: **gruesa** o fina. La FV gruesa es típica de la parada precoz; la fina es de baja amplitud y más tardía. La clase no cambia el tratamiento: ambas se desfibrilan.',
          ),
        },
        {
          title: l('能电击吗？', 'Is it shockable?', '¿Es desfibrilable?'),
          body: l(
            '能——**可电击心律**：立即除颤，电击后立即恢复胸外按压，每 2 分钟一个周期，心律检查 ≤10 秒。第三次电击后给肾上腺素 1 mg 和胺碘酮 300 mg（ERC）。',
            'Yes — a **shockable rhythm**: defibrillate immediately, resume compressions immediately after the shock, cycles of 2 minutes, rhythm checks <=10 s. After the third shock give adrenaline 1 mg and amiodarone 300 mg (ERC).',
            'Sí: un **ritmo desfibrilable**. Desfibrila de inmediato, reanuda las compresiones justo después de la descarga, en ciclos de 2 minutos con comprobaciones del ritmo <=10 s. Tras la tercera descarga, adrenalina 1 mg y amiodarona 300 mg (ERC).',
          ),
        },
        {
          title: l('如果看起来几乎是直线？', 'And if it looks almost flat?', '¿Y si parece casi plana?'),
          body: l(
            '那可能是**细颤**。按 ERC：难以区分细颤与停搏时**按停搏处理**（不可电击），绝不为判读拖延按压——高质量心肺复苏和肾上腺素常把细颤变粗，变成可电击的图形。',
            'Then it may be **fine VF**. Per the ERC: when fine VF cannot be distinguished from asystole, **treat as asystole** (non-shockable) — and never delay compressions for a debate. Good CPR and adrenaline often coarsen fine VF into a shockable pattern.',
            'Entonces puede ser **FV fina**. Según el ERC: cuando no se puede distinguir la FV fina de la asistolia, **trátala como asistolia** (no desfibrilable), y nunca retrases las compresiones por debatir el ritmo; una RCP de calidad y la adrenalina a menudo engrosan la FV fina hasta hacerla desfibrilable.',
          ),
        },
      ],
    },
    {
      kind: 'live',
      scenario: 'ventricular-fibrillation',
      seed: 703,
      dials: [{ id: 'fCoarseness' }],
      view: STRIP,
      caption: l(
        '把颤动波从粗调到细：最细端的振幅低得可以冒充停搏。这就是为什么报告“停搏”之前要换一个导联、检查增益——两个导联都平坦才算。',
        'Turn the fibrillation from coarse to fine: at the finest end the amplitude is low enough to pass for asystole. That is why you change the lead and check the gain before reporting "asystole" — flat in two leads, or it is not.',
        'Pasa la fibrilación de gruesa a fina: en el extremo más fino la amplitud baja lo suficiente para pasar por asistolia. Por eso se cambia de derivación y se comprueba la ganancia antes de informar «asistolia»: plana en dos derivaciones, o no lo es.',
      ),
    },
    {
      kind: 'contrast',
      title: l('都是多形性：哪一个是尖端扭转？', 'Both polymorphic: which one is torsades?', 'Ambas polimorfas: ¿cuál es la torsade?'),
      view: STRIP_V3,
      left: {
        ecg: synth('vt-polymorphic', 704),
        caption: l('急性缺血，窦性搏动 QT 正常', 'Acute ischaemia; sinus-beat QT normal', 'Isquemia aguda; QT sinusal normal'),
      },
      right: {
        ecg: synth('torsades', 705),
        caption: l('药物性长 QT（窦性 QTc ≈ 570 ms）', 'Drug-induced long QT (sinus QTc ≈ 570 ms)', 'QT largo farmacológico (QTc sinusal ≈ 570 ms)'),
      },
      point: l(
        '两段都宽、都快、都在变形——但“多形性”只是描述，“尖端扭转”是**需要长 QT 支持**的诊断。左侧窦性搏动 QT 正常：**缺血性多形性室速**，去找闭塞的冠脉、再灌注、用抗心律失常药；镁剂和起搏帮不了它。右侧发作前的窦性 QTc ≈ 570 ms：**尖端扭转型室速**，停 QT 药物、纠正钾镁、静脉镁剂。同样的图形，相反的处理——所以第一步永远是测窦性搏动的 QT。',
        'Both runs are wide, fast and changing shape — but "polymorphic" is a description, while "torsades" is a diagnosis that **needs the long QT**. Left: sinus beats with a normal QT — **ischaemic polymorphic VT**: find the occluded coronary artery, reperfuse, use antiarrhythmics; magnesium and pacing will not help. Right: sinus beats before the run with QTc ≈ 570 ms — **torsades de pointes**: stop the QT drug, correct K⁺ and Mg²⁺, give IV magnesium. The same pattern, opposite management — so the first step is always to measure the QT of a sinus beat.',
        'Ambos episodios son anchos, rápidos y cambiantes, pero «polimorfa» es una descripción, mientras que «torsade» es un diagnóstico que **necesita el QT largo**. Izquierda: latidos sinusales con QT normal, **TV polimorfa isquémica**: busca la coronaria ocluida, reperfusiona y usa antiarrítmicos; el magnesio y la estimulación no la corrigen. Derecha: latidos sinusales previos con QTc ≈ 570 ms, **torsade de pointes**: suspende el fármaco que alarga el QT, corrige K⁺ y Mg²⁺ y da magnesio intravenoso. El mismo patrón, tratamiento opuesto: el primer paso es siempre medir el QT de un latido sinusal.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('ventricular-flutter', 706),
      view: STRIP,
      caption: l(
        '约 300 次/分、规则的正弦波：周长稳定（变异 ≤约 30 ms），没有等电位间期，QRS 与 T 分不开——**心室扑动**。血流动力学上它就是室颤的等价物：按**可电击**心律处理，立即除颤。',
        'A regular sine wave at about 300/min: a stable cycle length (variability <=~30 ms), no isoelectric interval, and no way to separate QRS from T — **ventricular flutter**. Haemodynamically it is the equivalent of VF: manage as **shockable** and defibrillate immediately.',
        'Onda sinusal regular a unos 300 lpm: ciclo estable (variabilidad <=~30 ms), sin intervalo isoeléctrico y sin forma de separar el QRS de la T: **flutter ventricular**. Hemodinámicamente equivale a la FV: trátalo como **desfibrilable** y desfibrila de inmediato.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('ventricular-fibrillation', 708, undefined, 'fine'),
      view: STRIP,
      caption: l(
        '**细颤**：振幅很低的波动，在一条导联上几乎可以当成“直线”。换一个导联、检查增益与导联连接——两个导联都平坦才能报停搏。能确认是室颤，它就是可电击心律；若真的分不清细颤与停搏，按停搏处理、继续按压。',
        '**Fine VF**: very low-amplitude undulation that on one lead can pass for a "flat line". Change the lead and check the gain and the lead connections — only report asystole when two leads are flat. If you are confident it is VF, it is shockable; if you truly cannot tell fine VF from asystole, treat it as asystole and keep compressing.',
        '**FV fina**: oscilación de amplitud muy baja que en una derivación puede pasar por «línea plana». Cambia de derivación y comprueba ganancia y conexiones: solo se informa asistolia cuando dos derivaciones son planas. Si estás seguro de que es FV, es desfibrilable; si de verdad no puedes distinguir la FV fina de la asistolia, trátala como asistolia y sigue comprimiendo.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('asystole', 707, undefined, 'p-wave'),
      view: STRIP,
      caption: l(
        '**P 波性停搏**：窦性 P 波按约 52 次/分排列，没有一个下传——心房在激动，心室不响应。起搏**可能**夺获心室，但它仍是不可电击心律：心肺复苏 + 肾上腺素 + 找原因；除颤没有地位。永远不要凭一条有噪声的导联诊断停搏。',
        '**P-wave asystole**: sinus P waves march at about 52/min and none of them conducts — the atria are working, the ventricles are not. Pacing **may** capture the ventricles, but this is still a non-shockable rhythm: CPR + adrenaline + look for causes; defibrillation has no role. Never diagnose asystole from one noisy lead.',
        '**Asistolia con ondas P**: las P sinusales marchan a unos 52 lpm y ninguna conduce; las aurículas trabajan, los ventrículos no responden. La estimulación **puede** capturar los ventrículos, pero sigue siendo un ritmo no desfibrilable: RCP + adrenalina + buscar causas; la desfibrilación no tiene papel. Nunca diagnostiques asistolia desde una sola derivación con ruido.',
      ),
    },
    {
      kind: 'text',
      title: l('无脉性电活动：心电图读不出来', 'PEA: the ECG cannot see it', 'AESP: el ECG no la ve'),
      body: l(
        '**无脉性电活动（PEA）** = 心电图上有组织的心电活动（任何形态——窦性、交界性、甚至宽而慢的“垂死”波形），但**没有脉搏**。诊断靠手不靠眼：“看起来有组织”绝不等于有灌注。\n处理：不可电击——心肺复苏 + 肾上腺素，同时寻找并治疗可逆原因（**4 H**：低氧、低血容量、低/高钾血症及其他代谢异常、低体温；**4 T**：冠脉血栓、肺血栓、张力性气胸、心脏压塞；再加上中毒）。\n注：本课的节律条都是合成的——PTB-XL 是静息 12 导联心电图库，没有室速、室颤或骤停心律；真实的骤停节律条来自监护仪和除颤器。',
        '**Pulseless electrical activity (PEA)** = organised electrical activity on the ECG (any morphology — sinus, junctional, even the wide, slow "dying heart" patterns) with **no pulse**. The diagnosis is made with your hands, not your eyes: "organised-looking" says nothing about perfusion.\nManagement: non-shockable — CPR + adrenaline while you find and treat the reversible causes (**4 Hs**: hypoxia, hypovolaemia, hypo-/hyperkalaemia and other metabolic disorders, hypothermia; **4 Ts**: coronary thrombosis, pulmonary thrombosis, tension pneumothorax, cardiac tamponade; add toxins).\nNote: every strip in this lesson is synthetic — PTB-XL is a library of resting 12-lead ECGs and holds no VT, VF or arrest rhythm; real arrest strips come from monitors and defibrillators.',
        '**Actividad eléctrica sin pulso (AESP)** = actividad eléctrica organizada en el ECG (cualquier morfología: sinusal, de la unión, incluso los patrones anchos y lentos del «corazón agonizante») **sin pulso**. El diagnóstico se hace con las manos, no con los ojos: que «parezca organizado» no dice nada de la perfusión.\nTratamiento: no desfibrilable — RCP + adrenalina mientras buscas y tratas las causas reversibles (**4 H**: hipoxia, hipovolemia, hipo/hiperpotasemia y otras alteraciones metabólicas, hipotermia; **4 T**: trombosis coronaria, trombosis pulmonar, neumotórax a tensión, taponamiento cardiaco; añade los tóxicos).\nNota: todas las tiras de esta lección son sintéticas; PTB-XL es una colección de ECG de 12 derivaciones en reposo y no contiene TV, FV ni ritmos de parada; las tiras reales de parada proceden de monitores y desfibriladores.',
      ),
    },
    {
      kind: 'text',
      title: l('伪差扮演室速：三条线索', 'Artefact playing VT: three clues', 'El artefacto haciendo de TV: tres pistas'),
      body: l(
        '震颤（如帕金森病，4–6 Hz）、寒战或电极被拍打，都能在监护上画出又快又宽的“室速”。Knight 的系列里，这类误读导致了不必要的气管插管、导管检查甚至电击。三条线索拆穿它：\n- **真正的 QRS 仍按原有的 RR 间期穿行**——用分规在伪差里把它们找出来；\n- **伪差在某些导联最大，至少有一个导联几乎干净**；\n- **患者的状态没有变化**（“250 次/分室速”而患者在和你说话）。\n先看病人，再读节律条。',
        'Tremor (e.g. Parkinsonian, 4-6 Hz), shivering or a tapped electrode can draw a fast, wide "VT" on the monitor. In Knight\'s series, misreads like these led to unnecessary intubation, catheterisation and even cardioversion. Three clues unmask it:\n- the **real QRS complexes keep marching through at the underlying RR interval** — find them with calipers inside the noise;\n- the **artefact is largest in some leads and nearly absent in at least one**;\n- the **patient\'s condition has not changed** ("VT at 250/min" while the patient is talking to you).\nLook at the patient before you read the strip.',
        'El temblor (p. ej. parkinsoniano, 4-6 Hz), los escalofríos o un electrodo golpeado pueden dibujar en el monitor una «TV» rápida y ancha. En la serie de Knight, lecturas así provocaron intubaciones, cateterismos y hasta descargas innecesarias. Tres pistas la desenmascaran:\n- los **verdaderos complejos QRS siguen desfilando con el intervalo RR subyacente**: búscalos con el compás dentro del ruido;\n- el **artefacto es máximo en algunas derivaciones y casi inapreciable en al menos una**;\n- **el estado del paciente no ha cambiado** («TV a 250 lpm» mientras el paciente te habla).\nMira al paciente antes de leer la tira.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('motion-artefact', 709),
      view: { layout: 'strip', lead: 'II', calipers: true },
      marks: [
        { auto: 'qrs', beat: 4, label: l('真 QRS', 'true QRS', 'QRS real') },
        { auto: 'qrs', beat: 5, label: l('真 QRS', 'true QRS', 'QRS real') },
        { auto: 'rr', beat: 4 },
      ],
      caption: l(
        '右上肢电极晃动：II 导联在约第 3–6 秒出现一阵又快又宽的“室速”。用分规卡住伪差前的 RR（约 830 ms）往后走：窄的真 QRS 每一个都准时出现在伪差里——窦性心律从未中断。12 导联上不经过右上肢电极的 III 导联是干净的。先看病人，再读节律条。',
        'A moving right-arm electrode: in II a fast, wide "VT" appears from about 3 to 6 s. Set the calipers on the RR before the burst (about 830 ms) and walk them on: every narrow true QRS turns up on time inside the noise — the sinus rhythm never stopped. On the 12-lead, lead III, which does not use the right-arm electrode, is clean. Look at the patient before you read the strip.',
        'Un electrodo del brazo derecho que se mueve: en II aparece entre los 3 y los 6 s una «TV» rápida y ancha. Ajusta el compás al RR previo a la ráfaga (unos 830 ms) y avanza: cada QRS estrecho verdadero aparece a su hora dentro del ruido; el ritmo sinusal nunca se detuvo. En el ECG de 12 derivaciones, III, que no usa el electrodo del brazo derecho, está limpia. Mira al paciente antes de leer la tira.',
      ),
    },
    { kind: 'check', item: { family: 'arrest', seed: 17 } },
    { kind: 'check', item: { family: 'arrest', seed: 5 } },
    { kind: 'check', item: { family: 'arrest', seed: 20 } },
    { kind: 'check', item: { family: 'arrest', seed: 6 } },
    { kind: 'drill', families: ['arrest'], count: 10, passScore: 0.85 },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把任何扭转的心动过速都叫“尖端扭转”——不先在窦性搏动上测 QT。',
          'Calling every twisting tachycardia "torsades" — without measuring the QT on a sinus beat first.',
          'Llamar «torsade» a cualquier taquicardia que gira, sin medir antes el QT en un latido sinusal.',
        ),
        l(
          '细颤读成停搏：报“直线”前至少查两个导联并确认增益。',
          'Reading fine VF as asystole: check at least two leads and the gain before reporting a flat line.',
          'Leer la FV fina como asistolia: comprueba al menos dos derivaciones y la ganancia antes de informar una línea plana.',
        ),
        l(
          '凭一条有噪声的导联诊断停搏。',
          'Diagnosing asystole from a single noisy lead.',
          'Diagnosticar asistolia desde una sola derivación con ruido.',
        ),
        l(
          '给伪差放电——QRS 在按原有间期穿行、另一个导联干净、患者状态如常。',
          'Delivering a shock for artefact — the QRS complexes march through at the underlying interval, another lead is clean and the patient is unchanged.',
          'Dar una descarga a un artefacto: los QRS desfilan con el intervalo subyacente, otra derivación está limpia y el paciente está igual.',
        ),
        l(
          'QT 正常的多形性室速也用镁剂——真正的病因（冠脉闭塞）被错过。',
          'Giving magnesium for polymorphic VT with a normal QT — while the actual cause, a coronary occlusion, is missed.',
          'Dar magnesio a una TV polimorfa con QT normal, mientras se pasa por alto la causa real: una oclusión coronaria.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '多形性室速的第一步是在窦性搏动上测 QT：QTc >500 ms（或用药后延长 ≥60 ms）⇒ 尖端扭转型室速（停 QT 药物、纠正钾镁、静脉镁剂）；QT 正常 ⇒ 缺血性多形性室速（再灌注，不是镁剂）。',
          'The first step in any polymorphic VT is to measure the QT on a sinus beat: QTc >500 ms (or a rise of >=60 ms on a drug) => torsades (stop the QT drug, correct K⁺/Mg²⁺, IV magnesium); a normal QT => ischaemic polymorphic VT (revascularisation, not magnesium).',
          'El primer paso ante una TV polimorfa es medir el QT en un latido sinusal: QTc >500 ms (o un alargamiento >=60 ms con un fármaco) => torsade (suspender el fármaco, corregir K⁺/Mg²⁺, magnesio intravenoso); QT normal => TV polimorfa isquémica (reperfusión, no magnesio).',
        ),
        l(
          '尖端扭转型室速：QRS 振幅与极性绕等电位线扭转（每 5–20 个搏动一个周期），约 160–250 次/分，长短短序列 + R-on-T 室早触发；常自行终止，但可蜕变为室颤。',
          'Torsades: QRS amplitude and polarity twist around the isoelectric line (a cycle every 5-20 beats) at ~160-250/min, triggered by a short-long-short sequence and an R-on-T PVC; often self-terminating, but it can degenerate into VF.',
          'Torsade: la amplitud y la polaridad del QRS giran alrededor de la línea isoeléctrica (un ciclo cada 5-20 latidos) a ~160-250 lpm, desencadenada por una secuencia corto-largo-corto y una EV con R sobre T; suele autolimitarse, pero puede degenerar en FV.',
        ),
        l(
          '室颤（>300 次/分、显著不规则）与心室扑动（≈300 次/分、正弦波）都是可电击心律：立即除颤 + 心肺复苏，肾上腺素在第三次电击后。',
          'VF (>300/min, grossly irregular) and ventricular flutter (~300/min, sine wave) are both shockable: immediate defibrillation + CPR, with adrenaline after the third shock.',
          'La FV (>300 lpm, groseramente irregular) y el flutter ventricular (~300 lpm, onda sinusal) son desfibrilables: desfibrilación inmediata + RCP, con adrenalina tras la tercera descarga.',
        ),
        l(
          '停搏（包括 P 波性停搏）与无脉性电活动不可电击：心肺复苏 + 肾上腺素 + 4 H/4 T；细颤酷似停搏——两个导联都平坦、增益合适才能下诊断。',
          'Asystole (including P-wave asystole) and PEA are non-shockable: CPR + adrenaline + the 4 Hs and 4 Ts; fine VF mimics asystole — flat in two leads with adequate gain before you call it.',
          'La asistolia (también la que conserva ondas P) y la AESP no se desfibrilan: RCP + adrenalina + 4 H y 4 T; la FV fina imita la asistolia: plana en dos derivaciones y con ganancia adecuada antes de diagnosticarla.',
        ),
        l(
          '伪差能扮演室速：真 QRS 按原有 RR 穿行、至少一个导联干净、患者状态不变——先看病人，再读节律条。',
          'Artefact can play VT: the real QRS complexes march through at the underlying RR, at least one lead is clean and the patient is unchanged — look at the patient before you read the strip.',
          'El artefacto puede hacer de TV: los QRS reales desfilan con el RR subyacente, al menos una derivación está limpia y el paciente no cambia; mira al paciente antes de leer la tira.',
        ),
      ],
    },
  ],
  sources: [
    'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Knight BP et al. Clinical consequences of electrocardiographic artifact mimicking ventricular tachycardia. N Engl J Med 1999;341:1270-1274',
    'European Resuscitation Council Guidelines 2025: Adult advanced life support. Resuscitation 2025;215(Suppl 1):110769',
    'Soar J et al. European Resuscitation Council Guidelines 2021: Adult advanced life support. Resuscitation 2021;161:115-151',
    'Drew BJ et al. Prevention of torsade de pointes in hospital settings: AHA/ACCF scientific statement. Circulation 2010;121:1047-1060',
    'Castellano et al. 2004',
  ],
};

export default lesson;
