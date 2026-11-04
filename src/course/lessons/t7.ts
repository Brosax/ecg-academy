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
        {
          label: l('流程先于诊断', 'Algorithm before diagnosis', 'El algoritmo antes que el diagnóstico'),
          value: l('确认无反应、呼叫复苏团队、开始胸外按压、贴好电极片；按压质量决定存活率', 'Confirm unresponsiveness, call the arrest team, start compressions, attach the pads; compression quality drives survival', 'Confirma la falta de respuesta, activa el equipo, empieza las compresiones y coloca los electrodos adhesivos; la calidad de las compresiones determina la supervivencia'),
        },
        {
          label: l('室速：脉搏决定处理', 'VT: the pulse decides', 'TV: el pulso decide'),
          value: l(
            '无脉 ⇒ 除颤（与室颤同桶）；有脉而不稳定（低血压、胸痛、心衰、意识改变）⇒ 镇静下同步电复律；有脉且稳定 ⇒ 镇静风险低时镇静下同步电复律，或静脉抗心律失常药（普鲁卡因胺、胺碘酮）（t5）',
            'No pulse -> defibrillate (same bin as VF); a pulse with instability (hypotension, chest pain, heart failure, altered consciousness) -> synchronised cardioversion under sedation; a pulse and stable -> synchronised cardioversion under sedation when the sedation risk is low, or an IV antiarrhythmic (procainamide, amiodarone) (t5)',
            'Sin pulso -> desfibrilar (el mismo grupo que la FV); con pulso e inestable (hipotensión, dolor torácico, insuficiencia cardiaca, alteración de la conciencia) -> cardioversión sincronizada con sedación; con pulso y estable -> cardioversión sincronizada con sedación si el riesgo de la sedación es bajo, o un antiarrítmico intravenoso (procainamida, amiodarona) (t5)',
          ),
        },
        {
          label: l('骤停前：仍有脉搏', 'Peri-arrest: a pulse is still there', 'Periparada: todavía hay pulso'),
          value: l(
            '症状性严重心动过缓/完全性房室阻滞 ⇒ 阿托品，无效即经皮起搏（阻滞在房室结以下时阿托品常无效，直接起搏；长期方案见 r4）；低血压性 SVT ⇒ 同步电复律。原则：有组织的心动过速 + 不稳定 + 有脉 = 同步复律；无脉或无从同步（室颤、多形性室速）= 除颤',
            'Symptomatic severe bradycardia or complete AV block -> atropine, then transcutaneous pacing if it fails (below the AV node atropine often does nothing: go straight to pacing; long-term plan in r4); hypotensive SVT -> synchronised cardioversion. Rule: organised tachycardia + instability + a pulse = synchronised cardioversion; no pulse, or nothing to synchronise to (VF, polymorphic VT) = defibrillation',
            'Bradicardia grave sintomática o bloqueo AV completo -> atropina y, si fracasa, estimulación transcutánea (por debajo del nodo AV la atropina suele no hacer nada: ve directo a la estimulación; plan a largo plazo en r4); TSV hipotensa -> cardioversión sincronizada. Regla: taquicardia organizada + inestabilidad + pulso = cardioversión sincronizada; sin pulso, o sin nada a lo que sincronizar (FV, TV polimorfa) = desfibrilación',
          ),
        },
        {
          label: l('停搏中的起搏', 'Pacing in asystole', 'Estimulación en la asistolia'),
          value: l('P 波性停搏中起搏可能夺获心室（t6）；没有 P 波的停搏中起搏无效', 'In P-wave asystole pacing may capture the ventricles (t6); in asystole without P waves it does not work', 'En la asistolia con ondas P la estimulación puede capturar los ventrículos (t6); en la asistolia sin P no sirve'),
        },
        {
          label: l('ROSC 后：继续找原因', 'After ROSC: keep hunting the cause', 'Tras la RCE: sigue buscando la causa'),
          value: l(
            'VF/无脉性室速的背景常是冠脉闭塞：ST 段抬高或其他冠脉闭塞等同表现（i8、i10）都去导管室；复律成功不等于 4 H/4 T 结束（高钾、低氧、肺栓塞、出血逐项排除）；12 导联还可能显示长 QT、预激或 Brugada 图形；不再固定要求 32–36 °C',
            'The background of VF/pulseless VT is often a coronary occlusion: ST elevation or another occlusion-MI equivalent (i8, i10) goes to the cath lab; a successful shock does not close the 4 Hs and 4 Ts (rule out hyperkalaemia, hypoxia, pulmonary embolism and bleeding one by one); the 12-lead may also show a long QT, pre-excitation or a Brugada pattern; a fixed 32-36 °C target is no longer required',
            'El sustrato de la FV/TV sin pulso suele ser una oclusión coronaria: la elevación del ST u otro equivalente de oclusión coronaria (i8, i10) va a la sala de hemodinámica; una descarga eficaz no cierra las 4 H y 4 T (descarta una a una hiperpotasemia, hipoxia, tromboembolismo pulmonar y hemorragia); el ECG de 12 derivaciones también puede mostrar un QT largo, una preexcitación o un patrón de Brugada; ya no se exige un objetivo fijo de 32-36 °C',
          ),
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
        '两条都是骤停图形，第一步相反。左：**可电击**，除颤后立即恢复按压。右：**不可电击**，按压 + 肾上腺素 + 4 H/4 T；给停搏放电毫无益处，只会中断按压。报停搏前换一个导联、查增益：两个导联都平才算（**细颤**能装成直线）。',
        'Both are arrest tracings with opposite first actions. Left: **shockable**: defibrillate, then resume compressions at once. Right: **non-shockable**: compressions + adrenaline + the 4 Hs and 4 Ts; shocking asystole buys nothing and only interrupts compressions. Before you call asystole, change the lead and check the gain: flat in two leads, or it is not (**fine VF** can play a flat line).',
        'Ambos son trazados de parada con primeras actuaciones opuestas. Izquierda: **desfibrilable**: desfibrila y reanuda las compresiones de inmediato. Derecha: **no desfibrilable**: compresiones + adrenalina + 4 H y 4 T; una descarga sobre la asistolia no aporta nada y solo interrumpe las compresiones. Antes de llamarla asistolia, cambia de derivación y comprueba la ganancia: plana en dos derivaciones, o no lo es (la **FV fina** puede hacer de línea plana).',
      ),
    },
    {
      kind: 'film',
      title: l('脉搏决定处理', 'The pulse decides', 'El pulso decide'),
      view: STRIP,
      frames: [
        {
          label: l('室速', 'VT', 'TV'),
          ecg: synth('vt-monomorphic', 725),
          note: l(
            '宽、规则、约 150 次/分的室速。图上看不出有没有脉搏：无脉 ⇒ 除颤（同室颤）；有脉而不稳定 ⇒ 同步电复律。',
            'A wide, regular VT at about 150/min. The tracing cannot show whether there is a pulse: no pulse → defibrillate, as for VF; a pulse with instability → synchronised cardioversion.',
            'Una TV ancha y regular a unos 150 lpm. El trazado no muestra si hay pulso: sin pulso → desfibrila, como en la FV; con pulso e inestable → cardioversión sincronizada.',
          ),
          marks: [{ auto: 'qrs', label: l('宽 QRS', 'Wide QRS', 'QRS ancho') }, { auto: 'rr', label: l('RR 规则', 'Regular RR', 'RR regular') }],
        },
        {
          label: l('有组织的节律', 'Organised rhythm', 'Ritmo organizado'),
          ecg: synth('normal', 728, { rate: 70 }),
          note: l(
            '有组织的节律（这里是约 70 次/分的窦性）。摸不到脉搏，就是无脉性电活动：不可电击，按压 + 肾上腺素 + 4 H/4 T。',
            'An organised rhythm (here sinus at about 70/min). With no pulse it is PEA: non-shockable, so compressions + adrenaline + the 4 Hs and 4 Ts.',
            'Un ritmo organizado (aquí sinusal a unos 70 lpm). Sin pulso es una AESP: no desfibrilable; compresiones + adrenalina + 4 H y 4 T.',
          ),
          marks: [{ auto: 'p' }, { auto: 'qrs' }],
        },
      ],
      predict: {
        question: l(
          '骤停患者的监护仪上是约 70 次/分、看起来正常的窦性心律，但摸不到脉搏。归哪个桶？',
          'A patient in arrest: the monitor shows a normal-looking sinus rhythm at about 70/min, but there is no pulse. Which bin?',
          'Un paciente en parada: el monitor muestra un ritmo sinusal de aspecto normal a unos 70 lpm, pero no hay pulso. ¿En qué grupo va?',
        ),
        options: [l('可电击', 'Shockable', 'Desfibrilable'), l('不可电击', 'Non-shockable', 'No desfibrilable'), l('不是骤停', 'Not an arrest', 'No es una parada')],
        answer: 1,
      },
      caption: l('监护仪回答节律，手回答灌注。本课节律条均为合成：PTB-XL 静息心电图库里没有骤停心律。', 'The monitor answers the rhythm; your hands answer the perfusion. Every strip in this lesson is synthetic: the PTB-XL resting library holds no arrest rhythms.', 'El monitor responde del ritmo; las manos, de la perfusión. Todas las tiras de esta lección son sintéticas: la colección de reposo PTB-XL no contiene ritmos de parada.'),
    },
    {
      kind: 'heart',
      ecg: synth('av-block-3', 726, undefined, 'infra-his'),
      showConduction: true,
      emphasize: ['his', 'lv-apex'],
      caption: l(
        '完全性房室阻滞：窦性 P 约 78 次/分照常出现，没有一个传到心室；心室靠心尖部的宽大逸搏维持，约 34 次/分。离骤停一步之遥：现在就起搏，同时找原因（缺血、药物、高钾）。',
        'Complete AV block: the sinus P waves go on at about 78/min and none reaches the ventricles; a wide escape from the apex keeps them going at about 34/min. One step from arrest: pace now and hunt the cause (ischaemia, drugs, hyperkalaemia).',
        'Bloqueo AV completo: las P sinusales siguen a unos 78 lpm y ninguna llega a los ventrículos; un escape ancho desde el ápex los mantiene a unos 34 lpm. A un paso de la parada: estimula ya y busca la causa (isquemia, fármacos, hiperpotasemia).',
      ),
    },
    {
      kind: 'film',
      title: l('ROSC 后的 12 导联', 'The post-ROSC 12-lead', 'El ECG de 12 derivaciones tras la RCE'),
      view: { layout: '3x4+1' },
      frames: [
        {
          label: l('ST 抬高', 'ST elevation', 'Elevación del ST'),
          ecg: synth('stemi-anterior', 731),
          note: l('V1–V4 的 ST 段抬高 1–3.5 mm，II、III、aVF 压低 ⇒ 冠脉闭塞：直接去导管室。', 'ST elevation of 1–3.5 mm in V1–V4 with depression in II, III and aVF → coronary occlusion: straight to the cath lab.', 'Elevación del ST de 1-3,5 mm en V1-V4 con descenso en II, III y aVF → oclusión coronaria: directo a la sala de hemodinámica.'),
          marks: [{ auto: 'st', lead: 'V3' }],
        },
        {
          label: l('长 QT', 'Long QT', 'QT largo'),
          ecg: synth('long-qt', 731, { qtc: 520 }),
          note: l(
            'QT 约 505 ms，心率约 64 次/分（> 60，校正后只会更长）：已过 500 ms 的高危线。查药物与电解质，警惕尖端扭转（t6）。',
            'QT about 505 ms at about 64/min (above 60, so correction only lengthens it): past the 500 ms danger line. Check drugs and electrolytes; torsades is a risk (t6).',
            'QT de unos 505 ms a unos 64 lpm (más de 60, así que la corrección solo lo alarga): ya pasa la línea de peligro de 500 ms. Revisa fármacos y electrolitos; hay riesgo de torsade (t6).',
          ),
          marks: [{ auto: 'qt', lead: 'II' }],
        },
        {
          label: l('预激', 'Pre-excitation', 'Preexcitación'),
          ecg: synth('wpw', 731),
          note: l('PR 约 115 ms、δ 波、QRS 约 125 ms ⇒ 预激：经旁路下传的房颤可以恶化为室颤（t4）。', 'PR about 115 ms, a delta wave and a QRS of about 125 ms → pre-excitation: AF down the pathway can degenerate into VF (t4).', 'PR de unos 115 ms, onda delta y QRS de unos 125 ms → preexcitación: una FA por la vía puede degenerar en FV (t4).'),
          marks: [{ auto: 'delta', lead: 'II' }],
        },
        {
          label: l('Brugada 图形', 'Brugada pattern', 'Patrón de Brugada'),
          ecg: synth('brugada-type1', 731),
          note: l('V1–V2：穹窿形 ST 抬高约 3.5 mm（≥ 2 mm），下接倒置的 T ⇒ Brugada 1 型图形。', 'V1–V2: coved ST elevation of about 3.5 mm (≥ 2 mm) running into a negative T → type 1 Brugada pattern.', 'V1-V2: elevación del ST en cúpula de unos 3,5 mm (≥ 2 mm) que acaba en una T negativa → patrón de Brugada tipo 1.'),
          marks: [{ auto: 'st', lead: 'V1' }, { auto: 'st', lead: 'V2' }],
        },
      ],
      caption: l('自主循环一恢复就做 12 导联：这次骤停的原因可能就写在这张纸上。', 'Record a 12-lead as soon as circulation returns: the cause of this arrest may be written on it.', 'Registra un ECG de 12 derivaciones en cuanto vuelva la circulación: la causa de esta parada puede estar escrita en él.'),
    },
    { kind: 'check', item: { family: 'arrest', seed: 8 } },
    { kind: 'check', item: { family: 'arrest', seed: 13 } },
    { kind: 'check', item: { family: 'arrest', seed: 2 } },
    { kind: 'check', item: { family: 'wide-tachy', seed: 5 } },
    {
      kind: 'text',
      title: l('10 秒速读', 'The 10-second round', 'La ronda de 10 segundos'),
      body: l(
        '每条节律条**只给自己 10 秒**，出声数到十就作答：先说桶（**可电击 / 不可电击**），再说名字。答错时回到那条图，找出本该看到的那一个特征。',
        'Give yourself **10 seconds per strip**, counting aloud to ten, then answer: the bin first (**shockable / non-shockable**), then the name. When you miss one, go back to the strip and find the one feature you should have seen.',
        'Date **10 segundos por tira**, contando en voz alta hasta diez, y responde: primero el grupo (**desfibrilable / no desfibrilable**), después el nombre. Cuando falles, vuelve a la tira y busca el único rasgo que debías haber visto.',
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
