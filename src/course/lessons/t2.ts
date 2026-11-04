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
const STRIP_V1 = { layout: 'strip', lead: 'V1' } as const;

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
        '73岁男性，气促。没有P波，RR长短不一。你怎么证明这是心房颤动，而不是别的什么？先想好你的判断依据。',
        'A 73-year-old man, breathless. No P waves, and the RR intervals are all over the place. How do you prove this is atrial fibrillation and not something else? Commit to your evidence before the reveal.',
        'Un varón de 73 años, disneico. Sin ondas P y con intervalos RR caóticos. ¿Cómo demuestras que es fibrilación auricular y no otra cosa? Ten claras tus pruebas antes de la solución.',
      ),
      reveal: l(
        '两个发现定义房颤：**绝对不齐的RR**（房室传导完好时）加**无可辨认的重复P波**——只有大小、形状、间距都不等的f波。但这只是入口：诊断的记录要求（12导联或≥30秒单导联）、心室率透露的信息，以及五个能装成“房颤”的不规则节律，才是本课要练的东西。',
        'Two findings define AF: an **irregularly irregular RR** (with intact AV conduction) plus **no discernible repeating P waves** — only f waves of varying size, shape and spacing. But that is just the gate: the documentation rule (12-lead or ≥30 s single-lead), what the ventricular rate tells you, and five irregular rhythms that masquerade as "AF" are what this lesson drills.',
        'Dos hallazgos definen la FA: un RR **irregularmente irregular** (con conducción AV íntegra) y la **ausencia de ondas P que se repitan**: solo ondas f de tamaño, forma y distancia variables. Pero eso es solo la puerta: la regla de documentación (12 derivaciones o ≥30 s en una derivación), lo que dice la frecuencia ventricular y cinco ritmos irregulares que se disfrazan de «FA» son lo que entrena esta lección.',
      ),
    },
    {
      kind: 'film',
      title: l('五种不规则节律', 'Five irregular rhythms', 'Cinco ritmos irregulares'),
      view: STRIP,
      frames: [
        {
          label: l('房颤', 'AF', 'FA'),
          ecg: synth('atrial-fibrillation', 621, { fCoarseness: 0.55, ventricularResponse: 120 }),
          note: l('没有重复的 P，只有 f 波；RR 长短不一，找不到任何模式 ⇒ 房颤。', 'No repeating P, only f waves; the RR vary with no pattern at all → AF.', 'Ninguna P que se repita, solo ondas f; el RR varía sin patrón alguno → FA.'),
          marks: [{ auto: 'f-waves' }, { auto: 'rr', beat: 3 }],
        },
        {
          label: l('房扑不等比', 'Flutter, variable', 'Flutter variable'),
          ecg: synth('atrial-flutter', 622, undefined, 'variable'),
          note: l(
            '锯齿状 F 波；每个 RR 都是 F–F（约 200 ms）的整数倍 ⇒ 房扑不等比下传，不是房颤。',
            'Sawtooth F waves; every RR is a whole multiple of the F–F (about 200 ms) → flutter with variable block, not AF.',
            'Ondas F en diente de sierra; cada RR es un múltiplo entero del F–F (unos 200 ms) → flutter con conducción variable, no FA.',
          ),
          marks: [{ auto: 'f-waves' }, { auto: 'rr', beat: 7 }],
        },
        {
          label: l('房早', 'PACs', 'Extrasístoles auriculares'),
          ecg: synth('pac', 634, undefined, 'frequent'),
          note: l(
            '两个提前的搏动，P′ 在 II 倒置、不同于窦性 P；其后的间歇小于完全代偿 ⇒ 房早。',
            'Two early beats whose P′ is negative in II, unlike the sinus P; the pause after each is less than compensatory → PACs.',
            'Dos latidos precoces con una P′ negativa en II, distinta de la P sinusal; la pausa siguiente es menor que compensatoria → extrasístoles auriculares.',
          ),
          marks: [{ auto: 'p', beat: 1, label: l('P′', 'P′', 'P′') }],
        },
        {
          label: l('窦性心律不齐', 'Sinus arrhythmia', 'Arritmia sinusal'),
          ecg: synth('sinus-arrhythmia', 628, { rate: 72, hrv: 0.16 }),
          note: l(
            '同一个 P、同一个 PR；PP 随呼吸一阵长一阵短，没有提前的搏动 ⇒ 窦性心律不齐。',
            'The same P and the same PR; the PP lengthens and shortens in waves with breathing, and nothing comes early → sinus arrhythmia.',
            'La misma P y el mismo PR; el PP se alarga y se acorta en oleadas con la respiración y nada llega antes de tiempo → arritmia sinusal.',
          ),
          marks: [{ auto: 'p', beat: 3 }, { auto: 'rr', beat: 3 }],
        },
        {
          label: l('室性二联律', 'Bigeminy', 'Bigeminismo'),
          ecg: synth('ventricular-bigeminy', 627),
          note: l(
            '一个窦性搏动、一个提前的宽 QRS（其前无 P），长–短成对重复：“规则的不规则” ⇒ 室性二联律。',
            'One sinus beat, then an early wide QRS with no P before it; the long–short pair repeats: regularly irregular → ventricular bigeminy.',
            'Un latido sinusal y después un QRS ancho precoz sin P delante; el par largo-corto se repite: regularmente irregular → bigeminismo ventricular.',
          ),
          marks: [{ auto: 'qrs', beat: 6 }],
        },
      ],
      predict: {
        question: l(
          '房扑不等比下传时，心房一直按一个固定周期跳动。它的 RR 会是什么样？',
          'In flutter with variable block the atria keep one fixed cycle. What will its RR intervals look like?',
          'En el flutter con conducción variable las aurículas mantienen un ciclo fijo. ¿Cómo serán sus intervalos RR?',
        ),
        options: [
          l('完全随机，像房颤', 'Completely random, like AF', 'Totalmente aleatorios, como en la FA'),
          l('都是同一个短间期的整数倍', 'Whole multiples of one short interval', 'Múltiplos enteros de un intervalo corto'),
          l('全都相等', 'All equal', 'Todos iguales'),
        ],
        answer: 1,
      },
      caption: l(
        '“不规则”是入口，不是诊断。问两个问题：有没有心房活动？不规则里有没有模式？',
        '"Irregular" is a gate, not a diagnosis. Ask two questions: is there atrial activity? Is there a pattern in the irregularity?',
        '«Irregular» es una puerta, no un diagnóstico. Haz dos preguntas: ¿hay actividad auricular? ¿Hay un patrón en la irregularidad?',
      ),
    },
    {
      kind: 'live',
      scenario: 'atrial-fibrillation',
      seed: 629,
      dials: [{ id: 'fCoarseness' }],
      view: STRIP_V1,
      marks: [{ auto: 'f-waves', lead: 'V1' }],
      play: {
        dial: 'fCoarseness',
        from: 0.9,
        to: 0.2,
        notes: [
          {
            min: 0.7,
            max: 0.9,
            text: l(
              '粗大的 f 波：V1 里超过 1 mm，容易看见。但大小、形状、间距都不等，没有重复的 P。',
              'Coarse f waves: over 1 mm in V1 and easy to see. But they vary in size, shape and spacing: no repeating P.',
              'Ondas f gruesas: más de 1 mm en V1 y fáciles de ver. Pero varían de tamaño, forma y separación: ninguna P que se repita.',
            ),
          },
          { min: 0.46, max: 0.69, text: l('旋钮只改变 f 波：RR 一点没变。', 'The dial changes only the f waves: the RR stays exactly the same.', 'El mando solo cambia las ondas f: el RR no cambia nada.') },
          {
            min: 0.2,
            max: 0.45,
            text: l(
              '细小的 f 波：不到 1 mm，基线几乎是平的。诊断仍靠绝对不齐的 RR 和没有重复的 P。',
              'Fine f waves: under 1 mm, the baseline looks almost flat. The diagnosis still rests on the irregularly irregular RR and no repeating P.',
              'Ondas f finas: menos de 1 mm, la línea de base parece casi plana. El diagnóstico sigue apoyándose en el RR irregularmente irregular y en la ausencia de P que se repitan.',
            ),
          },
        ],
      },
      predict: {
        question: l(
          '如果 f 波小到几乎看不见，还靠什么诊断房颤？',
          'If the f waves shrink to almost nothing, what still proves AF?',
          'Si las ondas f se reducen casi a nada, ¿qué sigue demostrando la FA?',
        ),
        options: [
          l('什么也不靠：必须看见 f 波', 'Nothing: you need visible f waves', 'Nada: hacen falta ondas f visibles'),
          l('绝对不齐的 RR，加上没有重复的 P', 'The irregularly irregular RR with no repeating P', 'El RR irregularmente irregular sin P que se repitan'),
          l('心室率超过 100 次/分', 'A ventricular rate above 100/min', 'Una frecuencia ventricular de más de 100 lpm'),
        ],
        answer: 1,
      },
      caption: l(
        'V1 是看 f 波最好的导联。把 f 波从粗调到细，看看什么变了、什么没变。',
        'V1 is the best lead for f waves. Turn them from coarse to fine and watch what changes and what does not.',
        'V1 es la mejor derivación para las ondas f. Pásalas de gruesas a finas y mira qué cambia y qué no.',
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
        {
          label: l('游走性心房起搏点（对比）', 'Wandering atrial pacemaker (for contrast)', 'Marcapasos auricular migratorio (contraste)'),
          value: l('与 MAT 一样 ≥3 种 P′ 形态，但心率 < 100 次/分；多为良性', 'The same ≥3 P′ shapes as MAT but a rate < 100/min; usually benign', 'Las mismas ≥3 morfologías de P′ que la TAM pero con frecuencia < 100 lpm; casi siempre benigno'),
        },
        {
          label: l('P′ 的方向指向病灶', 'P′ polarity points to the focus', 'La polaridad de la P′ señala el foco'),
          value: l('II、III、aVF 倒置 ⇒ 低位起源；I、aVL 倒置 ⇒ 左房起源', 'Negative in II, III and aVF -> a low origin; negative in I and aVL -> left atrium', 'Negativa en II, III y aVF -> origen bajo; negativa en I y aVL -> aurícula izquierda'),
        },
      ],
      source: 'Van Gelder IC et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45:3314-3414',
    },
    {
      kind: 'film',
      title: l('心室率会说话', 'The ventricular rate speaks', 'La frecuencia ventricular habla'),
      view: STRIP,
      frames: [
        {
          label: l('未治疗', 'Untreated', 'Sin tratamiento'),
          ecg: synth('atrial-fibrillation', 621, { fCoarseness: 0.55, ventricularResponse: 120 }),
          note: l('约 133 次/分，绝对不齐：落在未治疗房颤常见的 100–180 次/分之内。', 'About 133/min and irregularly irregular: inside the usual untreated window of 100–180/min.', 'Unos 133 lpm e irregularmente irregular: dentro de la ventana habitual sin tratamiento, 100–180 lpm.'),
          marks: [{ auto: 'rr', beat: 3 }],
        },
        {
          label: l('慢', 'Slow', 'Lenta'),
          ecg: synth('atrial-fibrillation', 625, undefined, 'slow'),
          note: l(
            '约 45 次/分，仍绝对不齐：慢不改变诊断。如果没用减慢心率的药 ⇒ 房室传导本身有病。',
            'About 45/min and still irregularly irregular: slowness does not change the diagnosis. If no rate-slowing drugs → disease of the AV conduction itself.',
            'Unos 45 lpm y sigue irregularmente irregular: la lentitud no cambia el diagnóstico. Si no toma fármacos frenadores → enfermedad de la propia conducción AV.',
          ),
          marks: [{ auto: 'f-waves' }, { auto: 'rr', beat: 4 }],
        },
        {
          label: l('慢而规则', 'Slow and regular', 'Lenta y regular'),
          ecg: synth('af-regularised', 632),
          note: l(
            '约 44 次/分而且**规则**：f 波还在，心室却由逸搏驱动 ⇒ 完全房室阻滞，绝不是“控制良好”。',
            'About 44/min and **regular**: the f waves go on, but an escape rhythm drives the ventricles → complete AV block, never "well controlled".',
            'Unos 44 lpm y **regular**: las ondas f siguen, pero un ritmo de escape manda en los ventrículos → bloqueo AV completo, nunca «bien controlada».',
          ),
          marks: [{ auto: 'f-waves' }, { auto: 'rr' }],
        },
        {
          label: l('预激房颤', 'Pre-excited AF', 'FA preexcitada'),
          ecg: synth('preexcited-af', 633),
          note: l(
            '约 190 次/分、不规则，QRS 宽且逐搏变形；最短 RR 约 225 ms ⇒ 预激合并房颤，禁用房室结阻滞药。',
            'About 190/min, irregular, with wide QRS complexes that change beat to beat; shortest RR about 225 ms → pre-excited AF: no AV-nodal blockers.',
            'Unos 190 lpm, irregular, con QRS anchos que cambian de un latido a otro; RR más corto de unos 225 ms → FA preexcitada: nada de bloqueadores del nodo AV.',
          ),
          marks: [{ auto: 'qrs', beat: 24 }, { auto: 'rr', beat: 23 }],
        },
      ],
      predict: {
        question: l(
          '第 2 帧是房颤，约 45 次/分，患者没有用任何减慢心率的药。它的 RR 会怎样？',
          'Frame 2 is AF at about 45/min in a patient on no rate-slowing drugs. What will its RR do?',
          'El fotograma 2 es una FA a unos 45 lpm en un paciente sin fármacos frenadores. ¿Qué hará su RR?',
        ),
        options: [
          l('继续逐搏长短不一', 'Keep changing from beat to beat', 'Seguir cambiando de un latido a otro'),
          l('变得规则', 'Become regular', 'Volverse regular'),
          l('长短成对交替', 'Alternate long and short in pairs', 'Alternar largo y corto por parejas'),
        ],
        answer: 0,
      },
      caption: l('心室率不只是一个要控制的数字，它是诊断线索。', 'The ventricular rate is not just a number to control: it is a diagnostic clue.', 'La frecuencia ventricular no es solo una cifra que controlar: es una pista diagnóstica.'),
    },
    {
      kind: 'worked',
      title: l('真的绝对不齐吗？用分规走RR', 'Is it really irregularly irregular? March the RR', '¿De verdad es irregularmente irregular? Recorre el RR con el compás'),
      ecg: synth('atrial-flutter', 622, undefined, 'variable'),
      steps: [
        {
          title: l('第一步：量出每个RR', 'Step 1: measure every RR', 'Paso 1: mide cada RR'),
          body: l(
            '乍一看这也像“绝对不齐”。把分规卡在最短的RR上，沿节律条逐搏量出每个RR。',
            'At first glance this also passes for "irregularly irregular". Set your calipers to the shortest RR and walk down the strip, measuring every interval.',
            'A primera vista también pasa por «irregularmente irregular». Ajusta el compás al RR más corto y recorre la tira midiendo cada intervalo.',
          ),
          marks: [{ auto: 'rr', beat: 4 }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('第二步：找公约数', 'Step 2: look for a common denominator', 'Paso 2: busca un común denominador'),
          body: l(
            '每个RR都（±少许抖动）等于同一个短间期的整数倍——这个间期就是F–F（约200 ms，心房约300次/分）。真正的房颤没有这样的公约数。',
            'Every RR is (± a little jitter) a whole-number multiple of one short interval — that interval is the F–F (about 200 ms, an atrial rate near 300/min). True AF has no such common denominator.',
            'Cada RR es (± una pequeña oscilación) múltiplo entero de un intervalo corto: ese intervalo es el F–F (unos 200 ms, frecuencia auricular cercana a 300 lpm). La FA verdadera no tiene ese común denominador.',
          ),
          marks: [{ auto: 'rr', beat: 7 }],
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
          marks: [{ auto: 'rr', beat: 4 }],
        },
      ],
    },
    {
      kind: 'figure',
      figure: { id: 'laddergram', params: { maxBeats: 8 } },
      ecg: synth('atrial-flutter', 622, undefined, 'variable'),
      caption: l(
        '这条房扑的梯形图：心房层每 200 ms 一个 F，房室结只放过第 3、4 或 5 个，所以每个 RR 都是 F–F 的整数倍。',
        'The ladder of that flutter strip: an F wave every 200 ms in the atrial tier, and the AV node lets only every 3rd, 4th or 5th through, so every RR is a whole multiple of the F–F.',
        'La escalera de esa tira de flutter: una onda F cada 200 ms en el nivel auricular, y el nodo AV solo deja pasar una de cada 3, 4 o 5, así que cada RR es un múltiplo entero del F–F.',
      ),
    },
    {
      kind: 'contrast',
      title: l('好几种P′，还是没有P？', 'Several different P′ waves, or no P at all?', '¿Varias P′ distintas o ninguna P?'),
      view: STRIP,
      left: {
        ecg: synth('mat', 623),
        caption: l('74岁，慢阻肺急性加重', '74 years, acutely decompensated COPD', '74 años, EPOC descompensada'),
        marks: [
          { auto: 'p', beat: 3, label: l('P′', 'P′', 'P′') },
          { auto: 'p', beat: 4, label: l('另一种P′形态', 'another P′ shape', 'otra morfología de P′') },
          { auto: 'p', beat: 13, label: l('第三种P′形态', 'a third P′ shape', 'una tercera morfología de P′') },
        ],
      },
      right: {
        ecg: synth('atrial-fibrillation', 624),
        caption: l('73岁，气促', '73 years, breathless', '73 años, disneico'),
        marks: [{ auto: 'f-waves' }],
      },
      point: l(
        '左：**≥3 种 P′ 形态**，PR、PP 各不相同，P′ 之间回到等电位线，心房率 > 100 次/分 ⇒ 多源性房速：心房有组织，只是起搏点在换。右：**完全没有 P**，只有 f 波 ⇒ 房颤。MAT 的背景是严重肺病：治肺和缺氧。',
        'Left: **≥3 P′ shapes**, each with its own PR and PP, an isoelectric baseline between them and an atrial rate > 100/min → MAT: the atria are organized, only the pacemaker keeps changing. Right: **no P waves at all**, only f waves → AF. MAT belongs to severe lung disease: treat the lungs and the hypoxia.',
        'Izquierda: **≥3 morfologías de P′**, cada una con su PR y su PP, línea isoeléctrica entre ellas y frecuencia auricular > 100 lpm → TAM: las aurículas están organizadas, solo cambia el marcapasos. Derecha: **ninguna onda P**, solo ondas f → FA. La TAM acompaña a la enfermedad pulmonar grave: trata el pulmón y la hipoxia.',
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
          '房颤心室率慢而规则被写成“控制良好”：这是完全房室阻滞伴逸搏（地高辛中毒经典）——停用地高辛和其他减慢心率的药物，查血钾和地高辛浓度，再评估起搏。',
          'AF with a slow, regular rate reported as "well controlled": that is complete AV block with an escape (digoxin toxicity classic); stop digoxin and other rate-slowing drugs, check K⁺ and the digoxin level, then assess for pacing.',
          'Una FA lenta y regular informada como «bien controlada»: es un bloqueo AV completo con escape (clásico de intoxicación digoxínica); suspende la digoxina y los demás fármacos frenadores, mide el K⁺ y la digoxinemia, y después valora un marcapasos.',
        ),
        l(
          '伪差伪装成房颤：颤抖或松动的电极让基线毛糙——检查“f波”和RR的变化是否在每个导联一致出现。',
          'Artefact masquerading as AF: tremor or a loose electrode roughens the baseline — check that the "f waves" and the RR variation appear consistently in every lead.',
          'Artefactos disfrazados de FA: el temblor o un electrodo suelto ensucian la línea de base; comprueba que las «ondas f» y la variación del RR aparezcan de forma coherente en todas las derivaciones.',
        ),
        l(
          '很早的房早落在 T 波上未下传，节律看起来像窦性心动过缓：去 T 波里找 P′。',
          'A very early PAC that lands on the T wave and is blocked makes the rhythm look like sinus bradycardia: search the T waves for the P′.',
          'Una extrasístole auricular muy precoz que cae sobre la T y se bloquea hace que el ritmo parezca una bradicardia sinusal: busca la P′ dentro de las ondas T.',
        ),
        l(
          '用 6 秒 × 10 估二联律的心率：成对的搏动让结果忽高忽低——数满整条节律条，再除以时间。',
          'Estimating the rate of bigeminy as 6 s × 10: the pairs make the count jump; count every beat on the whole strip and divide by its length.',
          'Estimar la frecuencia de un bigeminismo con 6 s × 10: las parejas hacen saltar el recuento; cuenta todos los latidos de la tira y divide por su duración.',
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
