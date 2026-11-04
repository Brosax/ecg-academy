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
        'QRS 绕等电位线扭转 = **多形性室速**；只有当**窦性搏动的 QT 明显延长**时才叫**尖端扭转型室速**。先回到发作前的窦性搏动测 QT（用第一个窦性搏动——第二个的 T 波被室早打断了）——这里 QT 约 565 ms、QTc 约 570 ms（高危界值 >500 ms）：药物诱发的长 QT。处理：停用延长 QT 的药物、纠正低钾低镁、静脉硫酸镁；不稳定时电除颤（多形性室速无法同步）。它常自行终止，但可恶化为室颤。若 QT 正常，同样的图形更可能是缺血——处理完全不同，这是本课的核心。',
        'A QRS twisting around the isoelectric line = **polymorphic VT**; it is **torsades de pointes** only when the QT of the sinus beats is markedly prolonged. Go back to the sinus beats before the run and measure the QT (use the first sinus beat — the T of the second is cut short by the PVC) — here the QT is about 565 ms, a QTc of about 570 ms (high-risk threshold >500 ms): a drug-induced long QT. Management: stop the QT-prolonging drug, correct low K⁺ and Mg²⁺, give IV magnesium; defibrillate if unstable (polymorphic VT cannot be synchronised). It often self-terminates, but it can degenerate into VF. With a normal QT the same pattern is more likely ischaemic — and the management is completely different. That is the core of this lesson.',
        'Un QRS que gira alrededor de la línea isoeléctrica = **TV polimorfa**; solo es **torsade de pointes** si el QT de los latidos sinusales está muy prolongado. Vuelve a los latidos sinusales previos al episodio y mide el QT (usa el primer latido sinusal: la T del segundo queda cortada por la extrasístole): aquí el QT ronda 565 ms, un QTc de unos 570 ms (umbral de alto riesgo >500 ms), un QT largo farmacológico. Tratamiento: suspender el fármaco que alarga el QT, corregir K⁺ y Mg²⁺ bajos y dar sulfato de magnesio intravenoso; desfibrilar si hay inestabilidad (la TV polimorfa no se puede sincronizar). Suele autolimitarse, pero puede degenerar en FV. Con un QT normal, el mismo patrón sugiere isquemia y el tratamiento es completamente distinto: ese es el núcleo de esta lección.',
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
        {
          label: l('多形性室速：先问 QT', 'Polymorphic VT: ask the QT first', 'TV polimorfa: pregunta primero el QT'),
          value: l(
            'QRS 形态逐搏变化的室速。窦性搏动 QT 长 ⇒ 尖端扭转；QT 正常 ⇒ 多为急性缺血（或少见的短耦联特发性室颤）：再灌注与抗心律失常药，不是镁剂和起搏',
            'VT whose QRS shape changes beat to beat. A long QT in the sinus beats -> torsades; a normal QT -> usually acute ischaemia (or the rare short-coupled idiopathic VF): revascularisation and antiarrhythmics, not magnesium and pacing',
            'TV cuyo QRS cambia de morfología de latido en latido. QT largo en los latidos sinusales -> torsade; QT normal -> casi siempre isquemia aguda (o la rara FV idiopática de acoplamiento corto): reperfusión y antiarrítmicos, no magnesio ni estimulación',
          ),
        },
        {
          label: l('尖端扭转：处理', 'Torsades: management', 'Torsade: tratamiento'),
          value: l(
            '停用延长 QT 的药物，纠正低钾、低镁，静脉硫酸镁；停搏依赖性发作（短–长–短）用起搏或异丙肾上腺素提高心率；不稳定 ⇒ 电除颤（多形性室速无法同步）',
            'Stop the QT-prolonging drug, correct low K⁺ and Mg²⁺, give IV magnesium; for pause-dependent runs (short-long-short) raise the rate with pacing or isoprenaline; unstable -> defibrillate (polymorphic VT cannot be synchronised)',
            'Suspender el fármaco que alarga el QT, corregir K⁺ y Mg²⁺ bajos, magnesio intravenoso; en los episodios dependientes de pausa (corto-largo-corto), subir la frecuencia con estimulación o isoprenalina; inestable -> desfibrilar (la TV polimorfa no se puede sincronizar)',
          ),
        },
        {
          label: l('无脉性电活动（PEA）', 'Pulseless electrical activity (PEA)', 'Actividad eléctrica sin pulso (AESP)'),
          value: l(
            '心电图上有组织的电活动（任何形态）而摸不到脉搏：靠手诊断，不靠眼睛。不可电击：心肺复苏 + 肾上腺素 + 可逆原因（4 H：低氧、低血容量、低/高钾等代谢异常、低体温；4 T：冠脉血栓、肺栓塞、张力性气胸、心脏压塞；加上中毒）',
            'Organised electrical activity of any shape with no palpable pulse: diagnosed with the hands, not the eyes. Non-shockable: CPR + adrenaline + the reversible causes (4 Hs: hypoxia, hypovolaemia, hypo-/hyperkalaemia and other metabolic disorders, hypothermia; 4 Ts: coronary thrombosis, pulmonary thrombosis, tension pneumothorax, tamponade; plus toxins)',
            'Actividad eléctrica organizada de cualquier morfología sin pulso palpable: se diagnostica con las manos, no con los ojos. No desfibrilable: RCP + adrenalina + causas reversibles (4 H: hipoxia, hipovolemia, hipo/hiperpotasemia y otras alteraciones metabólicas, hipotermia; 4 T: trombosis coronaria, trombosis pulmonar, neumotórax a tensión, taponamiento; más los tóxicos)',
          ),
        },
        {
          label: l('伪差扮演室速', 'Artefact playing VT', 'El artefacto haciendo de TV'),
          value: l(
            '震颤（如帕金森 4–6 Hz）、寒战或拍打电极都能画出“室速”。三条线索：真 QRS 按原来的 RR 穿行；某些导联伪差最大，至少一个导联几乎干净；患者状态不变（Knight 1999）',
            'Tremor (e.g. Parkinsonian, 4-6 Hz), shivering or a tapped electrode can draw a "VT". Three clues: the true QRS march through at the underlying RR; the artefact is largest in some leads and nearly absent in at least one; the patient is unchanged (Knight 1999)',
            'El temblor (p. ej. parkinsoniano, 4-6 Hz), los escalofríos o un electrodo golpeado pueden dibujar una «TV». Tres pistas: los QRS verdaderos desfilan con el RR de base; el artefacto es máximo en unas derivaciones y casi inapreciable en al menos una; el paciente no cambia (Knight 1999)',
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
            '按振幅分**粗颤**与**细颤**。粗颤常见于骤停早期；细颤振幅低，越细越是晚期。只要看得出是室颤，分类不改变处理——两者都除颤。',
            'By amplitude: **coarse** or fine. Coarse VF is typical of early arrest; fine VF is low-amplitude and later. While you can see it is VF, the class does not change the management — both are defibrillated.',
            'Por amplitud: **gruesa** o fina. La FV gruesa es típica de la parada precoz; la fina es de baja amplitud y más tardía. Mientras se vea que es FV, la clase no cambia el tratamiento: ambas se desfibrilan.',
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
      play: {
        dial: 'fCoarseness',
        from: 1,
        to: 0.5,
        notes: [
          { min: 0.9, max: 1, text: l('粗颤：II 导联波幅约 2 mV（20 mm），形态、大小、间距都在变。', 'Coarse VF: waves of about 2 mV (20 mm) in II, changing in shape, size and spacing.', 'FV gruesa: ondas de unos 2 mV (20 mm) en II, que cambian de forma, tamaño y separación.') },
          {
            min: 0.5,
            max: 0.6,
            text: l('波幅降到约 1–1.3 mV，仍然杂乱：仍是室颤，仍可电击。', 'The waves fall to about 1–1.3 mV and stay chaotic: still VF, still shockable.', 'Las ondas bajan a unos 1-1,3 mV y siguen caóticas: sigue siendo FV y sigue siendo desfibrilable.'),
          },
        ],
      },
      caption: l(
        '把颤动调小：波变小，但始终杂乱无章。看得见的室颤，无论粗细，都要电击。真正的细颤比这里最小的还要小得多（见下一段影片）。',
        'Turn the fibrillation down: the waves shrink but stay chaotic. Visible VF, coarse or fine, is shocked. True fine VF is far smaller than the smallest setting here (see the next film).',
        'Baja la fibrilación: las ondas se reducen pero siguen caóticas. La FV visible, gruesa o fina, se desfibrila. La FV fina de verdad es mucho más pequeña que el mínimo de aquí (mira la película siguiente).',
      ),
    },
    {
      kind: 'contrast',
      title: l('都是多形性：哪一个是尖端扭转？', 'Both polymorphic: which one is torsades?', 'Ambas polimorfas: ¿cuál es la torsade?'),
      view: STRIP_V3,
      left: {
        ecg: synth('vt-polymorphic', 704),
        caption: l('急性缺血，窦性搏动 QT 正常', 'Acute ischaemia; sinus-beat QT normal', 'Isquemia aguda; QT sinusal normal'),
        marks: [{ auto: 'qt', beat: 0 }],
      },
      right: {
        ecg: synth('torsades', 705),
        caption: l('药物性长 QT（窦性 QT 约 565 ms）', 'Drug-induced long QT (sinus QT about 565 ms)', 'QT largo farmacológico (QT sinusal de unos 565 ms)'),
        marks: [{ auto: 'qt', beat: 0 }],
      },
      point: l(
        '两段都宽、都快、都在变形，但“多形性”只是描述，“尖端扭转”需要**长 QT** 支持。左：窦性搏动 QT 正常 ⇒ **缺血性多形性室速**：找闭塞的冠脉、再灌注；镁剂和起搏帮不了它。右：发作前窦性 QT 约 565 ms ⇒ **尖端扭转**：停 QT 药物、纠正钾镁、静脉镁剂。同样的图形，相反的处理：第一步永远是测窦性搏动的 QT。',
        'Both runs are wide, fast and changing shape, but "polymorphic" is a description, while "torsades" needs the **long QT**. Left: sinus beats with a normal QT → **ischaemic polymorphic VT**: find the occluded coronary artery and reperfuse; magnesium and pacing will not help. Right: a sinus QT of about 565 ms before the run → **torsades**: stop the QT drug, correct K⁺ and Mg²⁺, give IV magnesium. Same pattern, opposite management: the first step is always the QT of a sinus beat.',
        'Ambos episodios son anchos, rápidos y cambiantes, pero «polimorfa» es una descripción, mientras que «torsade» necesita el **QT largo**. Izquierda: latidos sinusales con QT normal → **TV polimorfa isquémica**: busca la coronaria ocluida y reperfunde; el magnesio y la estimulación no ayudan. Derecha: QT sinusal de unos 565 ms antes del episodio → **torsade**: suspende el fármaco, corrige K⁺ y Mg²⁺ y da magnesio intravenoso. Mismo patrón, tratamiento opuesto: el primer paso es siempre el QT de un latido sinusal.',
      ),
    },
    {
      kind: 'film',
      title: l('电击，还是不电击', 'Shock or no shock', 'Descarga o no'),
      view: STRIP,
      frames: [
        {
          label: l('室颤', 'VF', 'FV'),
          ecg: synth('ventricular-fibrillation', 702),
          note: l('形态、大小、间距都在变的杂乱波动，没有可测的 P、QRS 或 T ⇒ 室颤：可电击。', 'Chaotic waves changing in shape, size and spacing, with no P, QRS or T to measure → VF: shockable.', 'Ondas caóticas que cambian de forma, tamaño y separación, sin P, QRS ni T medibles → FV: desfibrilable.'),
        },
        {
          label: l('心室扑动', 'Ventricular flutter', 'Flutter ventricular'),
          ecg: synth('ventricular-flutter', 706),
          note: l(
            '规则的正弦波，约 300 次/分（周期约 200 ms），没有平线，QRS 与 T 分不开 ⇒ 心室扑动：可电击，按室颤处理。',
            'A regular sine wave at about 300/min (cycle about 200 ms), no flat line, QRS and T inseparable → ventricular flutter: shockable, treat as VF.',
            'Una onda sinusal regular a unos 300 lpm (ciclo de unos 200 ms), sin línea plana, QRS y T inseparables → flutter ventricular: desfibrilable, trátalo como FV.',
          ),
        },
        {
          label: l('细颤', 'Fine VF', 'FV fina'),
          ecg: synth('ventricular-fibrillation', 708, undefined, 'fine'),
          note: l(
            '波幅只有约 2 mm，在一个导联上可以冒充直线。换一个导联、查增益；真分不清时按停搏处理，继续按压。',
            'Waves of only about 2 mm that can pass for a flat line in one lead. Check a second lead and the gain; if you truly cannot tell, treat as asystole and keep compressing.',
            'Ondas de solo unos 2 mm que en una derivación pueden pasar por línea plana. Mira otra derivación y la ganancia; si de verdad no puedes distinguirla, trátala como asistolia y sigue comprimiendo.',
          ),
        },
        {
          label: l('P 波性停搏', 'P-wave asystole', 'Asistolia con P'),
          ecg: synth('asystole', 707, undefined, 'p-wave'),
          note: l(
            '窦性 P 约 52 次/分，没有一个后面跟着 QRS ⇒ P 波性停搏：不可电击。心肺复苏 + 肾上腺素，找原因；起搏可能夺获。',
            'Sinus P waves at about 52/min, not one followed by a QRS → P-wave asystole: non-shockable. CPR + adrenaline, look for the cause; pacing may capture.',
            'Ondas P sinusales a unos 52 lpm y ninguna seguida de QRS → asistolia con ondas P: no desfibrilable. RCP + adrenalina y busca la causa; la estimulación puede capturar.',
          ),
          marks: [{ auto: 'blocked-p' }],
        },
      ],
      predict: {
        question: l('心室扑动规则而有组织。它可以电击吗？', 'Ventricular flutter is regular and organised. Is it shockable?', 'El flutter ventricular es regular y organizado. ¿Es desfibrilable?'),
        options: [l('可以，按室颤处理', 'Yes, treat it as VF', 'Sí, trátalo como FV'), l('不可以，它有组织', 'No, it is organised', 'No, está organizado'), l('只能同步电复律', 'Only with a synchronised shock', 'Solo con descarga sincronizada')],
        answer: 0,
      },
      caption: l(
        '10 秒内叫出骤停节律：室颤与心室扑动可电击，停搏与无脉性电活动不可电击。本课节律条均为合成：PTB-XL 里没有骤停心律。',
        'Name the arrest rhythm within 10 seconds: VF and ventricular flutter are shockable; asystole and PEA are not. Every strip in this lesson is synthetic: PTB-XL holds no arrest rhythms.',
        'Nombra el ritmo de parada en 10 segundos: la FV y el flutter ventricular son desfibrilables; la asistolia y la AESP no. Todas las tiras de esta lección son sintéticas: PTB-XL no contiene ritmos de parada.',
      ),
    },
    {
      kind: 'film',
      title: l('伪差扮演室速', 'Artefact playing VT', 'El artefacto haciendo de TV'),
      view: { layout: 'strip', lead: 'II', calipers: true },
      frames: [
        {
          label: l('“室速”', '"VT"', '«TV»'),
          ecg: synth('motion-artefact', 709),
          note: l('II 导联约第 3–6 秒：一阵又快又宽的“室速”。', 'Lead II, from about 3 to 6 s: a burst of fast, wide "VT".', 'Derivación II, entre los 3 y los 6 s: una ráfaga de «TV» rápida y ancha.'),
        },
        {
          label: l('RR', 'The RR', 'El RR'),
          ecg: synth('motion-artefact', 709),
          note: l(
            '把伪差前的 RR（约 830 ms）往后走：每个窄的真 QRS 都准时出现在伪差里。',
            'Walk the RR from before the burst (about 830 ms) onwards: every narrow true QRS turns up on time inside the noise.',
            'Avanza con el RR previo a la ráfaga (unos 830 ms): cada QRS estrecho verdadero aparece a su hora dentro del ruido.',
          ),
          marks: [
            { auto: 'qrs', beat: 4, label: l('真 QRS', 'true QRS', 'QRS real') },
            { auto: 'qrs', beat: 5, label: l('真 QRS', 'true QRS', 'QRS real') },
            { auto: 'rr', beat: 4 },
          ],
        },
        {
          label: l('电极不动', 'Electrode still', 'Electrodo quieto'),
          ecg: { kind: 'synth', req: { scenario: 'motion-artefact', seed: 709, recording: { noise: { motion: { electrode: 'RA', tMs: 2600, durMs: 3600, mv: 0 } } } } },
          note: l('同一颗心，电极不动时：窦性心律从未中断，RR 一样。', 'The same heart with the electrode still: the sinus rhythm never stopped, with the same RR.', 'El mismo corazón con el electrodo quieto: el ritmo sinusal nunca se detuvo, con el mismo RR.'),
        },
      ],
      predict: {
        question: l(
          '这阵“室速”出现时，患者正在和你说话。你先做什么？',
          'During this "VT" the patient is talking to you. What do you do first?',
          'Durante esta «TV» el paciente está hablando contigo. ¿Qué haces primero?',
        ),
        options: [l('立即电击', 'Shock at once', 'Descarga inmediata'), l('用分规在伪差里找真 QRS', 'Look for the true QRS inside the noise with calipers', 'Buscar con el compás los QRS verdaderos dentro del ruido'), l('给胺碘酮', 'Give amiodarone', 'Dar amiodarona')],
        answer: 1,
      },
      caption: l(
        '真 QRS 按原来的 RR 穿行，患者如常 ⇒ 伪差。先看病人，再读节律条。',
        'The true QRS march through at the underlying RR and the patient is unchanged → artefact. Look at the patient before the strip.',
        'Los QRS verdaderos desfilan con el RR de base y el paciente está igual → artefacto. Mira al paciente antes que la tira.',
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
