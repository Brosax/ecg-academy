/**
 * t7 — Peri-arrest rhythms and the first action (docs/PLAN.md §3, stage T).
 * Criteria: docs/curriculum/criteria.md `vt-criteria`, `complete-avb`, `vflutter-vf` (current values; the "fine VF vs
 * asystole" bullet). First actions and drug timing per ERC adult advanced life support 2025 (no major change from
 * Soar 2021); post-ROSC temperature control per ERC-ESICM 2022 (fever prevention, not 32-36 °C).
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
  id: 't7',
  stage: 'T',
  order: 7,
  title: l(
    '心脏骤停前后节律的识别与第一步处理',
    'Peri-arrest rhythms and the first action',
    'Ritmos periparada y la primera actuación',
  ),
  summary: l(
    '骤停监护只问一个问题：可电击（心室颤动、无脉性室速——除颤）还是不可电击（心室停搏、无脉性电活动——按压 + 肾上腺素 + 4 H/4 T）。有脉搏的骤停前节律走另一条路：不稳定的有组织心动过速同步复律，严重心动过缓起搏；ROSC 后第一件事是 12 导联心电图。',
    'The arrest monitor asks one question: shockable (VF, pulseless VT — defibrillate) or non-shockable (asystole, PEA — compressions + adrenaline + the 4 Hs and 4 Ts). Peri-arrest rhythms with a pulse take another path: synchronised cardioversion for the unstable organised tachycardia, pacing for severe bradycardia — and after ROSC the first task is a 12-lead ECG.',
    'El monitor de la parada plantea una sola pregunta: ¿desfibrilable (FV, TV sin pulso: desfibrilar) o no desfibrilable (asistolia, AESP: compresiones + adrenalina + 4 H y 4 T)? Los ritmos periparada con pulso siguen otra vía: cardioversión sincronizada en la taquicardia organizada con inestabilidad, estimulación en la bradicardia grave; y tras la RCE, lo primero es un ECG de 12 derivaciones.',
  ),
  objectives: [
    l(
      '在 ≤10 秒的节律检查内把骤停心律分入可电击（心室颤动、无脉性室速）或不可电击（心室停搏、无脉性电活动）两桶，并说出各自的第一步处理。',
      'Sort an arrest rhythm into shockable (VF, pulseless VT) or non-shockable (asystole, PEA) within a rhythm check of 10 seconds or less, and state the first action for each bin.',
      'Clasificar un ritmo de parada en desfibrilable (FV, TV sin pulso) o no desfibrilable (asistolia, AESP) en una comprobación del ritmo de 10 segundos o menos y citar la primera actuación de cada grupo.',
    ),
    l(
      '说出可电击心律的除颤能量、肾上腺素与胺碘酮的时机，以及不可电击心律的 4 H/4 T。',
      'State the defibrillation energy, the timing of adrenaline and amiodarone in the shockable pathway, and the 4 Hs and 4 Ts of the non-shockable pathway.',
      'Citar la energía de desfibrilación y el momento de la adrenalina y la amiodarona en la vía desfibrilable, y las 4 H y 4 T de la vía no desfibrilable.',
    ),
    l(
      '把仍有脉搏的骤停前节律（持续室速、严重心动过缓/完全性房室传导阻滞、低血压性 SVT）与骤停心律区分开，并说出同步电复律、经皮起搏的适应场合。',
      'Separate the peri-arrest rhythms that still have a pulse (sustained VT, severe bradycardia or complete AV block, hypotensive SVT) from arrest rhythms, and say when synchronised cardioversion and transcutaneous pacing are the right first actions.',
      'Distinguir los ritmos periparada que aún tienen pulso (TV sostenida, bradicardia grave o bloqueo AV completo, TSV hipotensa) de los ritmos de parada e indicar cuándo corresponden la cardioversión sincronizada y la estimulación transcutánea.',
    ),
    l(
      '列出 ROSC 后的即刻步骤：立即 12 导联心电图（STEMI 进导管室）、继续查找病因、昏迷患者的体温控制（预防发热）。',
      'List the immediate post-ROSC steps: a 12-lead ECG at once (STEMI to the cath lab), continuing the cause hunt, and temperature control (fever prevention) for comatose patients.',
      'Enumerar los pasos inmediatos tras la RCE: ECG de 12 derivaciones de inmediato (SCACEST a la sala de hemodinámica), continuar la búsqueda de la causa y control de la temperatura (prevención de la fiebre) en el paciente en coma.',
    ),
  ],
  minutes: 12,
  competencies: ['C9', 'C11'],
  findings: ['ventricular-fibrillation', 'vt-monomorphic', 'asystole'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('asystole', 721),
      view: STRIP,
      question: l(
        '心脏骤停。监护导联 II，你有 10 秒：这是什么节律？接下来做的第一件事是什么？先想好你的判断再往下看。',
        'Cardiac arrest. Monitor lead II, and you have 10 seconds: what is the rhythm, and what is the first thing you do? Commit to your answer before reading on.',
        'Parada cardiaca. Derivación II del monitor y tienes 10 segundos: ¿qué ritmo es y cuál es lo primero que harías? Decide tu respuesta antes de seguir.',
      ),
      reveal: l(
        '一条近乎平坦的线：无 P、无 QRS、无 T——**心室停搏**。但在叫出它之前先自检两件事：换一个导联、看增益——**细颤**能在一根导联上装成直线，两个导联都平才报停搏。停搏**不可电击**：胸外按压 + 肾上腺素（1 mg，每 3–5 分钟）+ 找 4 H/4 T；除颤在这里没有任何地位。这 10 秒只需要回答一个问题：**可电击，还是不可电击**——本课练的就是这一问。',
        'A near-flat line: no P, no QRS, no T — **asystole**. But before you call it, two checks: change the lead and look at the gain — **fine VF** can play a flat line in one lead; flat in two leads before you report asystole. Asystole is **non-shockable**: chest compressions + adrenaline (1 mg every 3-5 min) + the 4 Hs and 4 Ts; defibrillation has no role here. These 10 seconds ask one question only — **shockable or non-shockable** — and that question is what this lesson drills.',
        'Una línea casi plana: sin P, sin QRS, sin T: **asistolia**. Pero antes de nombrarla, dos comprobaciones: cambia de derivación y mira la ganancia; la **FV fina** puede hacer de línea plana en una derivación, y solo se informa asistolia cuando dos derivaciones son planas. La asistolia **no se desfibrila**: compresiones torácicas + adrenalina (1 mg cada 3-5 min) + 4 H y 4 T; la desfibrilación no tiene ningún papel aquí. Estos 10 segundos solo plantean una pregunta — **¿desfibrilable o no desfibrilable?** — y entrenarla es el objeto de esta lección.',
      ),
    },
    {
      kind: 'text',
      title: l('先流程，后诊断：两个桶', 'Algorithm first, diagnosis second: two bins', 'Primero el algoritmo, después el diagnóstico: dos grupos'),
      body: l(
        '判读心脏骤停只问一件事：**可电击，还是不可电击？**流程先于诊断：确认无反应、呼叫复苏团队、开始胸外按压、贴好电极片。每 2 分钟一个按压周期，**节律检查 ≤10 秒**；电击与检查造成的按压中断保持 <5 秒——按压质量决定存活率。\n两个桶：\n- **可电击**：心室颤动（VF）与无脉性室速（pVT）——立即除颤 + 按压；\n- **不可电击**：心室停搏与无脉性电活动（PEA）——按压 + 肾上腺素 + 4 H/4 T。\n无脉性电活动不是眼睛的诊断，是手的诊断：图形可以完全有组织——没有脉搏就是 PEA，病因清单（4 H/4 T）从这里开始。\n本课的节律条都是合成的：PTB-XL 真实库只有静息 12 导联心电图，没有室速、室颤或骤停心律。',
        'Reading a cardiac arrest asks exactly one thing: **shockable or non-shockable?** The algorithm comes before the diagnosis: confirm unresponsiveness, call the arrest team, start compressions, attach the pads. Compress in 2-minute cycles and **check the rhythm for 10 seconds or less**, keeping every pause for a shock or a check under 5 s — compression quality drives survival.\nTwo bins:\n- **Shockable**: ventricular fibrillation (VF) and pulseless VT (pVT) — immediate defibrillation + compressions;\n- **Non-shockable**: asystole and pulseless electrical activity (PEA) — compressions + adrenaline + the 4 Hs and 4 Ts.\nPEA is not a diagnosis for your eyes but for your hands: the tracing can look perfectly organised — no pulse means PEA, and the cause list (4 Hs and 4 Ts) starts there.\nThe strips in this lesson are synthetic: the PTB-XL real library holds resting 12-lead ECGs only, with no VT, VF or arrest rhythm.',
        'Leer una parada cardiaca plantea una sola cosa: **¿desfibrilable o no desfibrilable?** El algoritmo va antes que el diagnóstico: confirma la falta de respuesta, activa el equipo, empieza las compresiones torácicas y coloca los electrodos adhesivos. Comprime en ciclos de 2 minutos y **comprueba el ritmo en 10 segundos o menos**, manteniendo toda pausa para descarga o comprobación por debajo de 5 s: la calidad de las compresiones determina la supervivencia.\nDos grupos:\n- **Desfibrilables**: fibrilación ventricular (FV) y TV sin pulso: desfibrilación inmediata + compresiones;\n- **No desfibrilables**: asistolia y actividad eléctrica sin pulso (AESP): compresiones + adrenalina + 4 H y 4 T.\nLa AESP no se diagnostica con los ojos sino con las manos: el trazado puede parecer perfectamente organizado; sin pulso es AESP, y desde ahí arranca la lista de causas (4 H y 4 T).\nLas tiras de esta lección son sintéticas: la colección real PTB-XL solo tiene ECG de 12 derivaciones en reposo, sin TV, FV ni ritmos de parada.',
      ),
    },
    {
      kind: 'criteria',
      title: l('数值卡：ERC 成人高级生命支持（2025）的第一步', 'Numbers: first actions per ERC adult advanced life support (2025)', 'Números: primeras actuaciones del soporte vital avanzado del ERC (2025)'),
      items: [
        {
          label: l('节律检查', 'Rhythm check', 'Comprobación del ritmo'),
          value: l('每 2 分钟按压周期一次，≤10 秒；电击与检查的按压中断 <5 秒', 'Once per 2-min compression cycle, 10 s or less; pauses for shocks and checks under 5 s', 'Una por ciclo de compresiones de 2 min, 10 s o menos; pausas para descargas y comprobaciones <5 s'),
        },
        {
          label: l('可电击心律', 'Shockable rhythms', 'Ritmos desfibrilables'),
          value: l('心室颤动与无脉性室速（心室扑动按室颤处理）：立即除颤，非同步', 'VF and pulseless VT (ventricular flutter treated as VF): immediate unsynchronised defibrillation', 'FV y TV sin pulso (el flutter ventricular se trata como FV): desfibrilación inmediata no sincronizada'),
        },
        {
          label: l('除颤能量', 'Defibrillation energy', 'Energía de desfibrilación'),
          value: l('双相波，首次 ≥150 J（按设备推荐剂量）；难治性室颤递增至 360 J', 'Biphasic, first shock 150 J or more (device-recommended dose); escalate up to 360 J for refractory VF', 'Bifásica, primera descarga ≥150 J (dosis recomendada del aparato); escalar hasta 360 J en la FV refractaria'),
        },
        {
          label: l('肾上腺素', 'Adrenaline', 'Adrenalina'),
          value: l('1 mg IV/IO，每 3–5 分钟；不可电击心律尽早给，可电击心律第 3 次电击后给', '1 mg IV/IO every 3-5 min; as early as possible in non-shockable rhythms, after the 3rd shock in shockable rhythms', '1 mg IV/IO cada 3-5 min; lo antes posible en los ritmos no desfibrilables y tras la tercera descarga en los desfibrilables'),
        },
        {
          label: l('胺碘酮', 'Amiodarone', 'Amiodarona'),
          value: l('第 3 次电击后 300 mg IV（第 5 次后可再给 150 mg）；无胺碘酮时用利多卡因', '300 mg IV after the 3rd shock (a further 150 mg after the 5th); lidocaine when amiodarone is unavailable', '300 mg IV tras la tercera descarga (otros 150 mg tras la quinta); lidocaína si no hay amiodarona'),
        },
        {
          label: l('不可电击心律', 'Non-shockable rhythms', 'Ritmos no desfibrilables'),
          value: l('心室停搏与 PEA：按压 + 肾上腺素 + 4 H/4 T；停搏须在 ≥2 个导联确认（细颤酷似停搏）', 'Asystole and PEA: compressions + adrenaline + the 4 Hs and 4 Ts; confirm asystole in 2 leads or more (fine VF mimics it)', 'Asistolia y AESP: compresiones + adrenalina + 4 H y 4 T; confirma la asistolia en ≥2 derivaciones (la FV fina la imita)'),
        },
        {
          label: l('ROSC 后', 'After ROSC', 'Tras la RCE'),
          value: l('立即 12 导联心电图（ST 段抬高 ⇒ 急诊导管室）；昏迷患者主动预防发热（>37.7 °C）至少 72 小时', '12-lead ECG immediately (ST elevation => emergency cath lab); in comatose patients actively prevent fever (> 37.7 °C) for at least 72 h', 'ECG de 12 derivaciones de inmediato (elevación del ST ⇒ sala de hemodinámica urgente); en el paciente en coma, prevenir activamente la fiebre (> 37,7 °C) durante al menos 72 h'),
        },
      ],
      source: 'European Resuscitation Council Guidelines 2025: Adult advanced life support. Resuscitation 2025;215(Suppl 1):110769; Sandroni C, Nolan JP et al. ERC-ESICM guidelines on temperature control after cardiac arrest in adults. Resuscitation 2022;172:229-236',
    },
    {
      kind: 'worked',
      title: l('10 秒演练：这条监护条', 'The 10-second drill: this monitor strip', 'El ejercicio de 10 segundos: esta tira de monitor'),
      ecg: synth('ventricular-fibrillation', 722, { fCoarseness: 0.9 }),
      view: STRIP,
      steps: [
        {
          title: l('0–3 秒：你看到什么？', 'Seconds 0-3: what do you see?', 'Segundos 0-3: ¿qué ves?'),
          body: l(
            '没有任何可辨认的 P、QRS 或 T：只有形态、振幅与周长都在变的混乱波动，一个间期也测不了。**心室颤动**，本条为粗颤——骤停早期常见的形态。',
            'No identifiable P, QRS or T anywhere: only chaotic undulation with morphology, amplitude and cycle length all changing, and no interval to measure. **Ventricular fibrillation**, coarse in this strip — the typical early-arrest picture.',
            'Ninguna P, QRS o T reconocible: solo oscilación caótica con morfología, amplitud y ciclo cambiantes, sin un solo intervalo medible. **Fibrilación ventricular**, gruesa en esta tira: el cuadro habitual de la parada precoz.',
          ),
        },
        {
          title: l('3–5 秒：可电击吗？', 'Seconds 3-5: is it shockable?', 'Segundos 3-5: ¿es desfibrilable?'),
          body: l(
            '可。VF 与无脉性室速共用同一个桶：**除颤**。这 10 秒里唯一要做的决定已经做完——不需要先鉴别 VF 与 pVT，两者处理相同。',
            'Yes. VF and pulseless VT share one bin: **defibrillation**. The only decision these 10 seconds ask for is already made — no need to separate VF from pVT first; the action is identical.',
            'Sí. La FV y la TV sin pulso comparten el mismo grupo: **desfibrilación**. La única decisión que piden estos 10 segundos ya está tomada: no hace falta distinguir antes la FV de la TV sin pulso, la actuación es idéntica.',
          ),
        },
        {
          title: l('5–8 秒：放电', 'Seconds 5-8: deliver the shock', 'Segundos 5-8: da la descarga'),
          body: l(
            '非同步除颤（VF 没有 QRS 可供同步）：双相波 ≥150 J，按设备推荐剂量。充电期间继续按压，只在放电的一刻停手。',
            'Unsynchronised shock (VF has no QRS to synchronise to): biphasic, 150 J or more at the device-recommended dose. Keep compressions while charging and pause only to deliver.',
            'Descarga no sincronizada (la FV no tiene QRS al que sincronizarse): bifásica, ≥150 J con la dosis recomendada del aparato. Mantén las compresiones mientras carga y detente solo en el momento de la descarga.',
          ),
        },
        {
          title: l('8–10 秒：放电之后', 'Seconds 8-10: after the shock', 'Segundos 8-10: después de la descarga'),
          body: l(
            '放电后**立即恢复按压**——不查脉搏、不等下一次节律分析；2 分钟周期后再查节律（≤10 秒）。第 3 次电击后加肾上腺素 1 mg 与胺碘酮 300 mg。',
            'After the shock, **resume compressions immediately** — no pulse check, no waiting for the next rhythm analysis; check the rhythm (10 s or less) after the next 2-min cycle. After the 3rd shock add adrenaline 1 mg and amiodarone 300 mg.',
            'Tras la descarga, **reanuda de inmediato las compresiones**: sin palpar pulso ni esperar el siguiente análisis; comprueba el ritmo (≤10 s) al terminar el próximo ciclo de 2 min. Tras la tercera descarga añade adrenalina 1 mg y amiodarona 300 mg.',
          ),
        },
        {
          title: l('按压期间：找原因', 'During compressions: hunt the cause', 'Durante las compresiones: busca la causa'),
          body: l(
            '4 H/4 T 与按压并行：缺氧与冠脉血栓最常见。可电击骤停的背景多为缺血——ROSC 后的 12 导联会替你把这条线收尾。',
            'Run the 4 Hs and 4 Ts in parallel with compressions: hypoxia and coronary thrombosis top the list. The background of a shockable arrest is usually ischaemia — the post-ROSC 12-lead will finish that thread for you.',
            'Las 4 H y 4 T corren en paralelo con las compresiones: la hipoxia y la trombosis coronaria encabezan la lista. El sustrato de una parada desfibrilable suele ser isquémico, y el ECG de 12 derivaciones tras la RCE cerrará ese hilo por ti.',
          ),
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('可电击还是不可电击：10 秒内分桶', 'Shockable or not: sort it in 10 seconds', '¿Desfibrilable o no? Clasifícalo en 10 segundos'),
      view: STRIP,
      left: {
        ecg: synth('ventricular-fibrillation', 723, { fCoarseness: 0.7 }),
        caption: l('心室颤动（粗颤）', 'Ventricular fibrillation (coarse)', 'Fibrilación ventricular (gruesa)'),
      },
      right: {
        ecg: synth('asystole', 724),
        caption: l('心室停搏（近于直线）', 'Asystole (near-flat line)', 'Asistolia (línea casi plana)'),
      },
      point: l(
        '两条都是骤停图形，第一步却相反。左：**可电击**——除颤 + 立即恢复按压。右：**不可电击**——按压 + 肾上腺素 + 4 H/4 T；给停搏放电不会带来任何好处，只会中断按压。报警之前先做两件事：换一个导联、检查增益——**细颤**能在一根导联上装成直线；两个导联都平，才报停搏。',
        'Both are arrest tracings with opposite first actions. Left: **shockable** — defibrillate and resume compressions at once. Right: **non-shockable** — compressions + adrenaline + the 4 Hs and 4 Ts; shocking asystole buys nothing and only interrupts compressions. Before you commit: change the lead and check the gain — **fine VF** can play a flat line in one lead; flat in two leads, or it is not asystole.',
        'Ambos son trazados de parada con primeras actuaciones opuestas. Izquierda: **desfibrilable**, desfibrila y reanuda las compresiones de inmediato. Derecha: **no desfibrilable**, compresiones + adrenalina + 4 H y 4 T; dar una descarga a la asistolia no aporta nada y solo interrumpe las compresiones. Antes de decidirte, dos cosas: cambia de derivación y comprueba la ganancia; la **FV fina** puede hacer de línea plana en una derivación, y solo si dos derivaciones son planas se informa asistolia.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('vt-monomorphic', 725),
      view: STRIP,
      marks: [
        { auto: 'qrs', label: l('宽 QRS', 'Wide QRS', 'QRS ancho') },
        { auto: 'rr', label: l('RR 规则', 'Regular RR', 'RR regular') },
      ],
      caption: l(
        '宽、规则、约 150 次/分：单形性室速（t5 的判读方法照用）。但**这份图本身分不出“有脉”与“无脉”**——脉搏决定处理：无脉 ⇒ 无脉性室速，**除颤**（与 VF 同桶）；有脉且不稳定 ⇒ **同步**电复律；有脉且稳定 ⇒ 静脉抗心律失常药并备好复律。监护仪回答节律，手回答灌注。',
        'Wide, regular, about 150/min: monomorphic VT (the reading tools of t5 apply unchanged). But **the tracing itself cannot tell "with pulse" from "pulseless"** — the pulse decides the action: no pulse => pulseless VT, **defibrillate** (same bin as VF); a pulse with instability => **synchronised** cardioversion; a pulse with stability => IV antiarrhythmics with cardioversion on standby. The monitor answers the rhythm; your hands answer the perfusion.',
        'Ancho, regular, unos 150 lpm: TV monomorfa (las herramientas de lectura de t5 sirven igual). Pero **el trazado por sí solo no distingue «con pulso» de «sin pulso»**: el pulso decide la actuación. Sin pulso ⇒ TV sin pulso, **desfibrila** (el mismo grupo que la FV); con pulso e inestable ⇒ **cardioversión sincronizada**; con pulso y estable ⇒ antiarrítmicos intravenosos con la cardioversión preparada. El monitor responde del ritmo; las manos, de la perfusión.',
      ),
    },
    {
      kind: 'text',
      title: l('骤停前一步：仍有脉搏的急症', 'One step from arrest: the emergencies that still have a pulse', 'A un paso de la parada: las urgencias que aún tienen pulso'),
      body: l(
        '三类“骤停前”节律还有脉搏，第一步不在除颤桶里：\n- **持续室速伴脉搏**：不稳定（低血压、胸痛、心衰、意识改变）⇒ 镇静后**同步**电复律；稳定 ⇒ 静脉抗心律失常药（胺碘酮或普鲁卡因胺）或镇静下择期同步复律，并随时准备复律——判读与用药见 t5。\n- **症状性严重心动过缓 / 完全性房室传导阻滞** ⇒ 阿托品；无效即**经皮起搏**（阻滞在房室结以下时阿托品常常无效——直接准备起搏），长期方案见 r4。\n- **低血压性 SVT** ⇒ 同步电复律。\n一条原则：**有组织的心动过速 + 不稳定 + 有脉搏 = 同步复律；无脉搏，或无从同步（VF、多形性室速）= 除颤。**',
        'Three "pre-arrest" rhythms still have a pulse, and the first action is not in the shock bin:\n- **Sustained VT with a pulse**: unstable (hypotension, chest pain, heart failure, altered consciousness) => **synchronised** cardioversion after sedation; stable => IV antiarrhythmics (amiodarone or procainamide) or elective synchronised cardioversion under sedation, with cardioversion ready — reading and drugs in t5.\n- **Symptomatic severe bradycardia or complete AV block** => atropine; if it fails, **transcutaneous pacing** (when the block is below the AV node, atropine often does nothing — go straight to pacing); the long-term plan in r4.\n- **Hypotensive SVT** => synchronised cardioversion.\nOne rule: **organised tachycardia + instability + a pulse = synchronised cardioversion; no pulse, or nothing to synchronise to (VF, polymorphic VT) = defibrillation.**',
        'Tres ritmos «periparada» conservan el pulso y su primera actuación no está en el grupo de la descarga:\n- **TV sostenida con pulso**: inestable (hipotensión, dolor torácico, insuficiencia cardiaca, alteración del nivel de conciencia) ⇒ **cardioversión sincronizada** con sedación; estable ⇒ antiarrítmicos intravenosos (amiodarona o procainamida) o cardioversión sincronizada programada con sedación, con la cardioversión lista — lectura y fármacos en t5.\n- **Bradicardia grave sintomática o bloqueo AV completo** ⇒ atropina; si fracasa, **estimulación transcutánea** (cuando el bloqueo es distal al nodo AV la atropina suele no hacer nada: ve directo a la estimulación); el plan a largo plazo, en r4.\n- **TSV hipotensa** ⇒ cardioversión sincronizada.\nUna regla: **taquicardia organizada + inestabilidad + pulso = cardioversión sincronizada; sin pulso, o sin nada a lo que sincronizar (FV, TV polimorfa) = desfibrilación.**',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('av-block-3', 726, undefined, 'infra-his'),
      view: STRIP,
      marks: [
        { auto: 'p', label: l('窦性 P，与 QRS 无关', 'Sinus P, unrelated to the QRS', 'P sinusal, independiente del QRS') },
        { auto: 'qrs', label: l('宽大室性逸搏（34 次/分）', 'Wide ventricular escape (34/min)', 'Escape ventricular ancho (34 lpm)') },
      ],
      caption: l(
        '宽大、规则、约 34 次/分的室性逸搏，窦性 P 按自己的节律穿行——完全性房室传导阻滞（希氏束下）。这还不是骤停，但是**一步之遥**：慢而宽的逸搏随时可能彻底停顿。第一步：阿托品对结下阻滞通常无效——**经皮起搏**现在就开始，同时找原因（缺血、药物、高钾……）。若真的走到停搏：按压 + 肾上腺素；起搏在 P 波性停搏尚可能夺获（t6），在无 P 波的停搏无效。',
        'A wide, regular ventricular escape at about 34/min while the sinus P waves march to their own schedule — complete AV block below the His bundle. This is not an arrest yet, but it is **one step away**: a slow, wide escape can fail at any moment. First action: atropine usually fails below the AV node — start **transcutaneous pacing** now and hunt the cause (ischaemia, drugs, hyperkalaemia…). If it does degenerate into arrest: compressions + adrenaline; pacing may still capture in P-wave asystole (t6) but not in asystole without P waves.',
        'Un escape ventricular ancho y regular a unos 34 lpm mientras las P sinusales desfilan a su propio ritmo: bloqueo AV completo por debajo del haz de His. Todavía no es una parada, pero está **a un paso**: un escape lento y ancho puede fallar en cualquier momento. Primera actuación: la atropina suele fracasar por debajo del nodo AV, así que inicia ya la **estimulación transcutánea** y busca la causa (isquemia, fármacos, hiperpotasemia…). Si degenera en parada: compresiones + adrenalina; la estimulación aún puede capturar en la asistolia con ondas P (t6), no en la asistolia sin P.',
      ),
    },
    {
      kind: 'text',
      title: l('ROSC 之后：别在终点前停下', 'After ROSC: do not stop at the finish line', 'Tras la RCE: no pares antes de la meta'),
      body: l(
        '自主循环恢复只是第一步：\n- **立即做 12 导联心电图**——骤停后 ST 段抬高（或其他冠脉闭塞等同表现，i8、i10）直接进导管室，别等患者“看起来好转”；VF/无脉性室速的背景常是冠脉闭塞。\n- **继续找病因**：复律成功不等于 4 H/4 T 结束——高钾、低氧、肺栓塞、出血都要在重症监护里逐项排除。\n- **昏迷患者的体温控制**：主动预防发热（>37.7 °C）至少 72 小时（不再固定要求 32–36 °C）。\n- 复苏后的 12 导联还可能揭示长 QT、预激或 Brugada 图形——下一次骤停的原因，也许就写在这一张纸上。',
        'Return of spontaneous circulation is only the first step:\n- **12-lead ECG immediately** — post-arrest ST elevation (or another occlusion-MI equivalent, i8 and i10) goes straight to the cath lab; do not wait for the patient to look better. The background of VF/pulseless VT is often a coronary occlusion.\n- **Keep hunting the cause**: a successful shock does not close the 4 Hs and 4 Ts — hyperkalaemia, hypoxia, pulmonary embolism and bleeding each get ruled out in intensive care.\n- **Temperature control for comatose patients**: actively prevent fever (> 37.7 °C) for at least 72 h (a fixed 32-36 °C target is no longer required).\n- The post-ROSC 12-lead can also reveal a long QT, pre-excitation or a Brugada pattern — the cause of the next arrest may be written on that very sheet.',
        'La recuperación de la circulación espontánea es solo el primer paso:\n- **ECG de 12 derivaciones de inmediato**: una elevación del ST tras la parada (u otro equivalente de oclusión coronaria, i8 e i10) va directa a la sala de hemodinámica; no esperes a que el paciente «mejore a simple vista». El sustrato de la FV/TV sin pulso suele ser una oclusión coronaria.\n- **Sigue buscando la causa**: una descarga eficaz no cierra las 4 H y 4 T; hiperpotasemia, hipoxia, tromboembolia pulmonar y hemorragia se descartan una a una en cuidados intensivos.\n- **Control de la temperatura en el paciente en coma**: prevenir activamente la fiebre (> 37,7 °C) durante al menos 72 h (ya no se exige un objetivo fijo de 32-36 °C).\n- El ECG tras la RCE también puede revelar un QT largo, una preexcitación o un patrón de Brugada: la causa de la próxima parada quizá esté escrita en esa misma hoja.',
      ),
    },
    { kind: 'check', item: { family: 'arrest', seed: 8 } },
    { kind: 'check', item: { family: 'arrest', seed: 13 } },
    { kind: 'check', item: { family: 'arrest', seed: 2 } },
    { kind: 'check', item: { family: 'wide-tachy', seed: 5 } },
    {
      kind: 'text',
      title: l('10 秒速读', 'The 10-second round', 'La ronda de 10 segundos'),
      body: l(
        '下面这一组按真实的节律检查来练：每条节律条**只给自己 10 秒**（出声数：一、二……十），时间到就作答——先说桶（**可电击 / 不可电击**），再说名字。答错的不要只看答案：回到那条图，找出你本该在 10 秒内看到的那一个特征（有没有可辨认的 QRS？规则吗？宽吗？两个导联都平吗？）。目标是全对，而且越来越快。',
        'Practise the next set as a real rhythm check: give yourself **10 seconds per strip** (count aloud: one, two... ten), then answer — the bin first (**shockable / non-shockable**), then the name. When you miss one, do not just read the answer: go back to the strip and find the single feature you should have seen within those 10 seconds (any identifiable QRS? regular? wide? flat in two leads?). The goal is every one right, and faster each time.',
        'Practica la siguiente serie como una comprobación del ritmo real: date **10 segundos por tira** (cuenta en voz alta: uno, dos... diez) y responde: primero el grupo (**desfibrilable / no desfibrilable**), después el nombre. Cuando falles, no te limites a leer la respuesta: vuelve a la tira y busca el único rasgo que debías haber visto en esos 10 segundos (¿hay QRS reconocibles? ¿regular? ¿ancho? ¿plana en dos derivaciones?). El objetivo es acertarlas todas, cada vez más rápido.',
      ),
    },
    { kind: 'drill', families: ['arrest'], count: 12, passScore: 0.9 },
    {
      kind: 'pitfalls',
      items: [
        l(
          '停下来争论节律——节律检查 ≤10 秒，按压中断越短越好；不确定细颤还是停搏时按停搏处理，别停止按压。',
          'Stopping compressions to debate the rhythm — the check is 10 seconds or less and interruptions must stay minimal; when fine VF cannot be told from asystole, treat as asystole and never stop compressions for the argument.',
          'Detener las compresiones para debatir el ritmo: la comprobación es de 10 segundos o menos y las interrupciones deben ser mínimas; cuando no se distingue la FV fina de la asistolia, trátala como asistolia y no interrumpas las compresiones por discutir.',
        ),
        l(
          '给心室停搏放电——电击对停搏毫无作用，却中断了按压。',
          'Defibrillating asystole — the shock does nothing for asystole and only interrupts compressions.',
          'Desfibrilar la asistolia: la descarga no aporta nada y solo interrumpe las compresiones.',
        ),
        l(
          '凭一条有噪声的导联诊断停搏——换导联、查增益，两个导联都平才报停搏（细颤的陷阱）。',
          'Calling asystole from one noisy lead — change the lead, check the gain, and report asystole only when two leads are flat (the fine-VF trap).',
          'Diagnosticar asistolia desde una sola derivación con ruido: cambia de derivación, comprueba la ganancia e informa asistolia solo cuando dos derivaciones son planas (la trampa de la FV fina).',
        ),
        l(
          'ROSC 后忘了 12 导联心电图——骤停后 STEMI 的导管室机会被错过。',
          'Forgetting the post-ROSC 12-lead ECG — the cath-lab window of a post-arrest STEMI is missed.',
          'Olvidar el ECG de 12 derivaciones tras la RCE: se pierde la ventana de sala de hemodinámica de un SCACEST posparada.',
        ),
        l(
          '只治监护仪不治病人——脉搏决定室速用除颤还是同步复律；有组织的图形也可以是无脉性电活动。',
          'Treating the monitor instead of the patient — the pulse decides whether VT gets defibrillation or synchronised cardioversion, and an organised tracing can still be PEA.',
          'Tratar el monitor y no al paciente: el pulso decide si la TV se desfibrila o se cardiovierte de forma sincronizada, y un trazado organizado puede ser una AESP.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          '节律检查 ≤10 秒，每 2 分钟一次：监护仪只问一个问题——可电击（心室颤动、无脉性室速）还是不可电击（心室停搏、无脉性电活动）。',
          'The rhythm check is 10 seconds or less, once per 2 minutes: the monitor asks one question only — shockable (VF, pulseless VT) or non-shockable (asystole, PEA).',
          'La comprobación del ritmo es de 10 segundos o menos, una vez cada 2 minutos: el monitor plantea una sola pregunta, ¿desfibrilable (FV, TV sin pulso) o no desfibrilable (asistolia, AESP)?',
        ),
        l(
          '可电击 ⇒ 立即非同步除颤（双相波 ≥150 J）+ 放电后立即按压；第 3 次电击后肾上腺素 1 mg 与胺碘酮 300 mg。',
          'Shockable => immediate unsynchronised defibrillation (biphasic, 150 J or more) + compressions straight after the shock; adrenaline 1 mg and amiodarone 300 mg after the 3rd shock.',
          'Desfibrilable ⇒ desfibrilación no sincronizada inmediata (bifásica, ≥150 J) + compresiones justo tras la descarga; adrenalina 1 mg y amiodarona 300 mg tras la tercera descarga.',
        ),
        l(
          '不可电击 ⇒ 按压 + 肾上腺素 1 mg 每 3–5 分钟 + 4 H/4 T；停搏须在两个导联确认——细颤酷似直线。',
          'Non-shockable => compressions + adrenaline 1 mg every 3-5 min + the 4 Hs and 4 Ts; confirm asystole in two leads — fine VF mimics a flat line.',
          'No desfibrilable ⇒ compresiones + adrenalina 1 mg cada 3-5 min + 4 H y 4 T; confirma la asistolia en dos derivaciones, la FV fina imita una línea plana.',
        ),
        l(
          '有脉搏的骤停前节律走另一条路：不稳定的有组织心动过速（室速、SVT）同步复律；严重心动过缓/完全性房室传导阻滞经皮起搏。',
          'Peri-arrest rhythms with a pulse take another path: synchronised cardioversion for the unstable organised tachycardia (VT, SVT); transcutaneous pacing for severe bradycardia or complete AV block.',
          'Los ritmos periparada con pulso siguen otra vía: cardioversión sincronizada en la taquicardia organizada con inestabilidad (TV, TSV); estimulación transcutánea en la bradicardia grave o el bloqueo AV completo.',
        ),
        l(
          'ROSC 后第一件事是 12 导联心电图（STEMI ⇒ 导管室），随后预防发热与继续查找病因。',
          'After ROSC the first task is a 12-lead ECG (STEMI => cath lab), followed by fever prevention and a continuing cause hunt.',
          'Tras la RCE, lo primero es un ECG de 12 derivaciones (SCACEST ⇒ sala de hemodinámica), seguido de la prevención de la fiebre y de la búsqueda continua de la causa.',
        ),
      ],
    },
  ],
  sources: [
    'European Resuscitation Council Guidelines 2025: Adult advanced life support. Resuscitation 2025;215(Suppl 1):110769',
    'Soar J et al. European Resuscitation Council Guidelines 2021: Adult advanced life support. Resuscitation 2021;161:115-151',
    'Sandroni C, Nolan JP et al. ERC-ESICM guidelines on temperature control after cardiac arrest in adults. Resuscitation 2022;172:229-236',
    'Al-Khatib SM et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation 2018;138:e272-e307',
    'Zeppenfeld K et al. 2022 ESC Guidelines for ventricular arrhythmias and the prevention of sudden cardiac death. Eur Heart J 2022;43:3997-4126',
    'Castellano et al. 2004',
  ],
};

export default lesson;
