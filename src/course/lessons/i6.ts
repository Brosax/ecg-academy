/**
 * i6 — Posterior infarction (V1–V4 ST depression, V7–V9) (docs/PLAN.md §3, stage I).
 * Criteria: docs/curriculum/criteria.md `posterior-mi`, `reciprocal-changes` and the "Missing in the book" bullets
 * "Supplemental leads" (V7–V9 placement and thresholds) and "Posterior STEMI equivalent" (isolated precordial ST
 * depression). Extra leads: the local synth helper takes an extraLeads argument, so V7–V9 can be shown and marked
 * once the request records them.
 */
import { l } from '../../core/l10n';
import type { ExtraLead } from '../../core/leads';
import type { EcgSource } from '../../practice/api';
import type { DialId } from '../../synth/api';
import type { Lesson } from '../api';

const synth = (
  scenario: string,
  seed: number,
  dials?: Partial<Record<DialId, number>>,
  variant?: string,
  extraLeads?: readonly ExtraLead[],
): EcgSource => ({
  kind: 'synth',
  req: {
    scenario,
    seed,
    ...(variant ? { variant } : {}),
    ...(dials ? { dials } : {}),
    ...(extraLeads ? { extraLeads } : {}),
  },
});

const lesson: Lesson = {
  id: 'i6',
  stage: 'I',
  order: 6,
  title: l('后壁梗死（V1–V4 ST段压低、V7–V9）', 'Posterior infarction (V1–V4 ST depression, V7–V9)', 'Infarto posterior (descenso del ST en V1–V4, V7–V9)'),
  summary: l(
    '后壁梗死在标准 12 导联上只表现为镜像：V1–V3（可延续至 V4）孤立性水平型 ST 压低、直立 T 波与高 R 波。加做 V7–V9 直接证实后壁闭塞，并按 STEMI 等危症处理。',
    'On the standard 12 leads a posterior infarct shows only its mirror: isolated horizontal ST depression in V1–V3 (extending to V4) with an upright T and a tall R. Record V7–V9 to confirm the posterior occlusion directly, and manage it as a STEMI equivalent.',
    'En las 12 derivaciones estándar, un infarto posterior solo muestra su imagen especular: descenso horizontal aislado del ST en V1–V3 (que puede llegar a V4) con T positiva y R alta. Registra V7–V9 para confirmar la oclusión posterior y trátala como un equivalente de IAMCEST.',
  ),
  objectives: [
    l(
      '从 V1–V3 孤立性水平型 ST 压低、直立 T 波与高 R 波认出急性后壁闭塞的镜像。',
      'Recognise the mirror of an acute posterior occlusion: isolated horizontal ST depression in V1–V3 with an upright T and a tall, growing R.',
      'Reconocer la imagen especular de una oclusión posterior aguda: descenso horizontal aislado del ST en V1–V3 con T positiva y R alta y creciente.',
    ),
    l(
      '说出 V7–V9 的电极位置与诊断阈值（ST 抬高 ≥0.5 mm，<40 岁男性 ≥1 mm），并据此确认后壁闭塞。',
      'Give the V7–V9 electrode positions and diagnostic threshold (ST elevation ≥0.5 mm, ≥1 mm in men <40 y) and use it to confirm a posterior occlusion.',
      'Indicar la posición de los electrodos V7–V9 y el umbral diagnóstico (elevación del ST ≥0,5 mm; ≥1 mm en varones <40 años) y usarlo para confirmar una oclusión posterior.',
    ),
    l(
      '把后壁 STEMI 与弥漫性心内膜下缺血（压低达 V4–V6）区分开。',
      'Separate a posterior STEMI from diffuse subendocardial ischaemia (depression reaching V4–V6).',
      'Distinguir un IAMCEST posterior de la isquemia subendocárdica difusa (descenso que alcanza V4–V6).',
    ),
    l(
      '认出陈旧性后壁梗死（V1–V2 高 R、R/S ≥1），并把急性后壁闭塞按 STEMI 处理。',
      'Recognise an old posterior MI (tall R in V1–V2, R/S ≥1) and manage an acute posterior occlusion as a STEMI.',
      'Reconocer un infarto posterior antiguo (R alta en V1–V2, R/S ≥1) y tratar la oclusión posterior aguda como un IAMCEST.',
    ),
  ],
  minutes: 14,
  competencies: ['C8'],
  findings: ['stemi-posterior', 'reciprocal-changes'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('stemi-posterior', 901),
      view: { layout: '3x4+1', highlightLeads: ['V1', 'V2', 'V3'] },
      question: l(
        '胸痛 40 分钟。先只看 V1–V3：V1–V2 呈水平型 ST 压低（V2 的 T 波直立），向 V3 逐渐消失。这是“前壁心内膜下缺血”吗？想好你的判读和下一步，再看其余导联。',
        '40 minutes of chest pain. Look at V1–V3 first: V1–V2 show horizontal ST depression (upright T in V2) that fades by V3. Is this "anterior subendocardial ischaemia"? Commit to a reading and a next step, then look at the other leads.',
        '40 minutos de dolor torácico. Mira primero V1–V3: V1–V2 muestran descenso horizontal del ST (T positiva en V2) que se desvanece en V3. ¿Es «isquemia subendocárdica anterior»? Decide tu interpretación y el paso siguiente, y después mira el resto de derivaciones.',
      ),
      reveal: l(
        '不是。V1–V3 从**前方**看心脏；受伤的是**后壁**，V1–V3 记录到的正是它的**镜像**：水平型 ST 压低、直立的 T 波（以后还会出现增高的 R 波）。这份图上 I、aVL、V5–V6 也抬高——后侧壁 STEMI，罪犯血管多为 LCx。但用手遮住侧壁导联：剩下的 V1–V2 压低，就是孤立性后壁闭塞在 12 导联上**唯一**的样子——这是 STEMI 等危症：加做 V7–V9、按 STEMI 处理，而不是“缺血”。',
        'No. V1–V3 look at the heart from the **front**; the injured wall is at the **back**, and V1–V3 record its **mirror image**: horizontal ST depression with an upright T (and, later, a growing R). On this tracing I, aVL and V5–V6 are elevated too — a posterolateral STEMI, usually the LCx. But cover the lateral leads with your hand: the V1–V2 depression that remains is **all** an isolated posterior occlusion shows on the 12 leads — a STEMI equivalent: record V7–V9 and manage it as a STEMI, not as "ischaemia".',
        'No. V1–V3 miran al corazón desde **delante**; la pared lesionada está **detrás**, y V1–V3 registran su **imagen especular**: descenso horizontal del ST con T positiva (y, más tarde, una R creciente). En este trazado I, aVL y V5–V6 también están elevadas: un IAMCEST posterolateral, habitualmente por la Cx. Pero tapa con la mano las laterales: el descenso en V1–V2 que queda es **todo** lo que una oclusión posterior aislada muestra en las 12 derivaciones; un equivalente de IAMCEST: registra V7–V9 y trátalo como IAMCEST, no como «isquemia».',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('stemi-posterior', 902),
      emphasize: ['lv-basal-inferolateral', 'lv-basal-anterolateral'],
      caption: l(
        '在心脏上读同一份图：播放一个心动周期，**后壁（左心室后基底部）**亮起——它背对 V1–V3、正对 V7–V9。损伤电流指向后方、背向 V1–V3，所以这些胸前导联记录到的是镜像：ST 压低而不是抬高。这里侧壁也受累，所以 I、aVL、V5–V6 记录到直接的抬高。',
        'Read the same tracing on the heart: play one beat and the **posterior wall (the posterobasal left ventricle)** lights up — it faces away from V1–V3 and straight towards V7–V9. The injury current points backwards, away from V1–V3, so those precordial leads record the mirror: ST depression instead of elevation. Here the lateral wall is involved as well, so I, aVL and V5–V6 show direct elevation.',
        'Lee el mismo registro sobre el corazón: reproduce un latido y se ilumina la **pared posterior (el ventrículo izquierdo posterobasal)**, que mira al lado opuesto de V1–V3 y de frente a V7–V9. La corriente de lesión se dirige hacia atrás, alejándose de V1–V3, de modo que esas precordiales registran la imagen especular: descenso del ST en lugar de elevación. Aquí también está afectada la pared lateral, por eso I, aVL y V5–V6 muestran elevación directa.',
      ),
    },
    {
      kind: 'text',
      title: l('为什么 12 导联上只有镜像', 'Why the 12 leads show only a mirror', 'Por qué las 12 derivaciones solo muestran un espejo'),
      body: l(
        '- 后壁（左心室后基底部）由 **LCx** 或 RCA 的后侧支供血；标准 12 导联没有一根直接面对它——只有加做 V7–V9 才能。\n- 面向缺血区的导联记录 ST 抬高；**背对**缺血区的导联记录**对应性（镜像）改变**（第 i1 课的同一物理）：后壁的 T 波倒置在 V1–V3 变成高大直立的 T，后壁的病理性 Q 变成高 R。\n- 镜像压低呈**水平型**，主要在 V1–V3（可延续到 V4）；伴随直立（终末部）T 波，随后 R 波增高。\n- 前壁 STEMI 的下壁压低是“额外证据”；后壁闭塞时，镜像却是 12 导联上**唯一**的征象——漏读它就漏掉了整个梗死。',
        '- The posterior wall (the posterobasal left ventricle) is fed by the **LCx** or posterolateral branches of the RCA; no standard lead faces it directly — you have to add V7–V9.\n- A lead facing the ischaemic zone records ST elevation; a lead **facing away** records **reciprocal (mirror) changes** (the same physics as in lesson i1): the posterior T-wave inversion becomes a tall upright T in V1–V3, and the posterior pathological Q becomes a tall R.\n- The mirror depression is **horizontal** and sits mainly in V1–V3 (it may reach V4), with an upright (terminal) T and, as the hours pass, a growing R.\n- In anterior STEMI the inferior depression is a bonus; in posterior occlusion the mirror is the **only** sign on the 12 leads — miss it and you miss the whole infarct.',
        '- La pared posterior (el ventrículo izquierdo posterobasal) depende de la **Cx** o de ramas posterolaterales de la CD; ninguna derivación estándar la mira de frente: hay que añadir V7–V9.\n- Una derivación que mira a la zona isquémica registra elevación del ST; la que mira **en sentido contrario** registra **cambios recíprocos (imagen especular)** (la misma física de la lección i1): la T negativa posterior se convierte en una T alta y positiva en V1–V3, y la Q patológica posterior, en una R alta.\n- El descenso especular es **horizontal** y se sitúa sobre todo en V1–V3 (puede llegar a V4), con una T positiva (terminal) y, con las horas, una R creciente.\n- En el IAMCEST anterior el descenso inferior es un dato añadido; en la oclusión posterior la imagen especular es **el único** signo en las 12 derivaciones: si la pasas por alto, te pierdes todo el infarto.',
      ),
    },
    {
      kind: 'criteria',
      title: l('后壁梗死：镜像、确认与处理', 'Posterior MI: mirror, confirmation, management', 'Infarto posterior: imagen especular, confirmación y manejo'),
      items: [
        {
          label: l('急性（镜像，V1–V3）', 'Acute (mirror, V1–V3)', 'Agudo (imagen especular, V1–V3)'),
          value: l(
            '孤立性水平型 ST 压低 ≥0.5 mm（最深常在 V2–V4），直立（终末部）T 波，R 波高大或逐渐增高',
            'Isolated horizontal ST depression ≥0.5 mm (often deepest in V2–V4), an upright (terminal) T and a tall or growing R',
            'Descenso horizontal aislado del ST ≥0,5 mm (a menudo máximo en V2–V4), T positiva (terminal) y R alta o creciente',
          ),
        },
        {
          label: l('确认（V7–V9）', 'Confirmation (V7–V9)', 'Confirmación (V7–V9)'),
          value: l(
            'ST 抬高 ≥0.5 mm（<40 岁男性 ≥1 mm）= 后壁闭塞',
            'ST elevation ≥0.5 mm (≥1 mm in men <40 y) = posterior occlusion',
            'Elevación del ST ≥0,5 mm (≥1 mm en varones <40 años) = oclusión posterior',
          ),
        },
        {
          label: l('V7–V9 电极位置', 'V7–V9 electrode positions', 'Posición de los electrodos V7–V9'),
          value: l(
            '与 V6 同一水平：V7 腋后线，V8 肩胛中线，V9 左脊柱旁线',
            'Level with V6: V7 posterior axillary line, V8 mid-scapular line, V9 left paravertebral line',
            'A la altura de V6: V7 línea axilar posterior, V8 línea escapular media, V9 línea paravertebral izquierda',
          ),
        },
        {
          label: l('陈旧性后壁', 'Old posterior MI', 'Infarto posterior antiguo'),
          value: l(
            'V1–V2 R ≥40 ms 且 R/S ≥1，T 直立（排除 RBBB、WPW、RVH）——后壁的 Q 波等价物',
            'R ≥40 ms in V1–V2 with R/S ≥1 and an upright T (no RBBB, WPW or RVH) — the posterior Q-wave equivalent',
            'R ≥40 ms en V1–V2 con R/S ≥1 y T positiva (sin BRD, WPW ni HVD): el equivalente posterior de la onda Q',
          ),
        },
        {
          label: l('罪犯血管', 'Culprit artery', 'Arteria responsable'),
          value: l(
            '多为 LCx（后侧支/钝缘支）；也见于下壁 STEMI 的后壁延伸（RCA 或 LCx）',
            'Usually the LCx (posterolateral / obtuse marginal); also as posterior extension of an inferior STEMI (RCA or LCx)',
            'Habitualmente la Cx (posterolateral / marginal obtusa); también como extensión posterior de un IAMCEST inferior (CD o Cx)',
          ),
        },
        {
          label: l('处理', 'Management', 'Manejo'),
          value: l(
            'STEMI 等危症：立即再灌注（导管室），不等肌钙蛋白；V1–V3 压低 + 直立 T + V7–V9 抬高高度提示后壁闭塞',
            'A STEMI equivalent: immediate reperfusion (cath lab), no waiting for troponin; V1–V3 depression + upright T + V7–V9 elevation is highly suggestive of posterior occlusion',
            'Equivalente de IAMCEST: reperfusión inmediata (sala de hemodinámica), sin esperar la troponina; descenso en V1–V3 + T positiva + elevación en V7–V9 sugiere fuertemente oclusión posterior',
          ),
        },
      ],
      source:
        'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269; Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826; Wagner GS et al. AHA/ACCF/HRS Part VI: Acute ischemia/infarction. Circulation 2009;119:e262-e270',
    },
    {
      kind: 'worked',
      title: l('三步读法：镜像 → 背面 → 决定', 'Read it in three moves: mirror → back → decision', 'Leerlo en tres pasos: espejo → dorso → decisión'),
      ecg: synth('stemi-posterior', 903, undefined, undefined, ['V7', 'V8', 'V9']),
      view: { layout: '3x4+1' },
      steps: [
        {
          title: l('先读镜像', 'Read the mirror first', 'Lee primero la imagen especular'),
          body: l(
            'V1–V2 呈水平型 ST 压低（各约 1.5 mm；≥0.5 mm 即达阈值），V3 约 1 mm，到 V4 已消失；V1–V3 的 T 波从压低的 ST 中升起、终末直立。压低在最右侧的胸前导联最深、向左逐渐变浅——这不是“前壁缺血”的形状。',
            'V1–V2 show horizontal ST depression (about 1.5 mm in each; ≥0.5 mm already meets the threshold), about 1 mm in V3 and gone by V4; in V1–V3 the T rises out of the depressed ST and ends upright. Depression that is deepest in the rightmost chest leads and fades leftwards is not the shape of "anterior ischaemia".',
            'V1–V2 muestran descenso horizontal del ST (unos 1,5 mm en cada una; ≥0,5 mm ya alcanza el umbral), alrededor de 1 mm en V3 y desaparecido en V4; en V1–V3 la T sale del ST descendido y termina positiva. Un descenso máximo en las precordiales más derechas que se atenúa hacia la izquierda no tiene el aspecto de una «isquemia anterior».',
          ),
          marks: [
            { auto: 'st', lead: 'V1' },
            { auto: 'st', lead: 'V2' },
            { auto: 't', lead: 'V2' },
          ],
          highlightLeads: ['V1', 'V2', 'V3'],
        },
        {
          title: l('扫一遍其余导联', 'Sweep the remaining leads', 'Recorre el resto de derivaciones'),
          body: l(
            '再扫其余导联：V5、V6 抬高约 1–1.5 mm，I、aVL 也轻度抬高（不到 1 mm）——侧壁也受累，这是**后侧壁** STEMI。II、III、aVF 不抬高（III 是镜像），所以不是下后壁。现在用手遮住侧壁导联：剩下的只有 V1–V2 的压低。LCx 的后壁供区“电安静”，孤立性后壁闭塞就是这个样子——直接征象可以少到零。',
            'Now sweep the rest: V5 and V6 are elevated by about 1–1.5 mm, and I and aVL slightly (just under 1 mm) — the lateral wall is involved too: a **posterolateral** STEMI. II, III and aVF are not elevated (III is a mirror), so it is not inferoposterior. Now cover the lateral leads with your hand: only the V1–V2 depression is left. The posterior territory of the LCx is electrically quiet, and that is exactly what an isolated posterior occlusion looks like — the direct signs can be zero.',
            'Recorre ahora el resto: V5 y V6 están elevadas unos 1–1,5 mm, e I y aVL algo menos (justo por debajo de 1 mm); la pared lateral también está afectada: un IAMCEST **posterolateral**. II, III y aVF no se elevan (III es espejo), así que no es inferoposterior. Tapa ahora con la mano las laterales: solo queda el descenso en V1–V2. El territorio posterior de la Cx es «eléctricamente silente», y así es exactamente una oclusión posterior aislada: los signos directos pueden ser cero.',
          ),
          highlightLeads: ['I', 'aVL', 'V5', 'V6', 'II', 'III', 'aVF'],
        },
        {
          title: l('加做 V7–V9', 'Record V7–V9', 'Registra V7–V9'),
          body: l(
            '与 V6 同一水平环绕到背部：V7 腋后线、V8 肩胛中线、V9 左脊柱旁线。切到 V8：J 点处 ST 抬高 ≥0.5 mm（<40 岁男性 ≥1 mm）——后壁闭塞得到直接证实。',
            'Wrap around the back level with V6: V7 posterior axillary line, V8 mid-scapular line, V9 left paravertebral line. Switch to V8: ST elevation at the J point ≥0.5 mm (≥1 mm in men <40 y) — the posterior occlusion is confirmed directly.',
            'Rodea la espalda a la altura de V6: V7 línea axilar posterior, V8 línea escapular media, V9 línea paravertebral izquierda. Cambia a V8: elevación del ST en el punto J ≥0,5 mm (≥1 mm en varones <40 años): la oclusión posterior queda confirmada de forma directa.',
          ),
          view: { layout: 'single', lead: 'V8' },
          marks: [{ auto: 'st', lead: 'V8' }],
        },
        {
          title: l('定名并启动流程', 'Name it and activate', 'Nómbralo y activa'),
          body: l(
            '**后侧壁 STEMI，罪犯血管多为 LCx/钝缘支**（没有侧壁抬高时，后壁部分本身就是 STEMI 等危症）。按 STEMI 处理：立即再灌注（导管室），不要等肌钙蛋白，也不要当作“NSTE 缺血”收入病房。后壁常与下壁并存——再看一眼 II、III、aVF，若受累则同时想到 V3R/V4R（第 i4 课）。',
            '**Posterolateral STEMI, usually the LCx / obtuse marginal** (without the lateral elevation, the posterior part alone is a STEMI equivalent). Manage as a STEMI: immediate reperfusion (cath lab), no waiting for troponin, no admission as "NSTEMI ischaemia". The posterior wall often joins the inferior wall — glance back at II, III and aVF; if they are involved, think V3R/V4R too (lesson i4).',
            '**IAMCEST posterolateral, habitualmente Cx / marginal obtusa** (sin la elevación lateral, la parte posterior sola ya es un equivalente de IAMCEST). Trátalo como IAMCEST: reperfusión inmediata (sala de hemodinámica), sin esperar la troponina ni ingresar al paciente como «isquemia de SCASEST». La pared posterior suele acompañar a la inferior: revisa II, III y aVF; si están afectadas, piensa también en V3R/V4R (lección i4).',
          ),
          highlightLeads: ['V7', 'V8', 'V9'],
        },
      ],
    },
    {
      kind: 'contrast',
      title: l('胸前 ST 压低：后壁镜像还是弥漫缺血？', 'Precordial ST depression: posterior mirror or diffuse ischaemia?', 'Descenso del ST precordial: ¿espejo posterior o isquemia difusa?'),
      view: { layout: '6x2' },
      left: {
        ecg: synth('stemi-posterior', 905),
        caption: l(
          'A：压低在右胸 V1–V2 最深、水平型，侧壁导联抬高——后（侧）壁镜像',
          'A: depression deepest in the right chest leads V1–V2, horizontal, with the lateral leads elevated — posterior(-lateral) mirror',
          'A: descenso máximo en las precordiales derechas V1–V2, horizontal, con las laterales elevadas: imagen especular posterior(lateral)',
        ),
        marks: [{ auto: 'st', lead: 'V1' }, { auto: 'st', lead: 'V6' }],
      },
      right: {
        ecg: synth('st-depression-ischemic', 906),
        caption: l(
          'B：压低在 V4–V6 与 I、aVL，V1–V2 不受累，没有任何导联抬高——心内膜下缺血',
          'B: depression in V4–V6 and I, aVL, with V1–V2 spared and no lead elevated — subendocardial ischaemia',
          'B: descenso difuso, que alcanza V4–V6 y las laterales, T plana o bifásica, sin R dominante: isquemia subendocárdica',
        ),
        marks: [{ auto: 'st', lead: 'V5' }],
      },
      point: l(
        '两份图都有胸前 ST 压低，但分布决定去向。A 的压低在**右胸导联（V1–V2）最深**、水平型，到 V4 已消失，而面对侧壁的导联抬高——后侧壁闭塞的镜像：加做 V7–V9 并按 STEMI 处理。B 的压低在**左胸导联 V4–V6**（以及 I、aVL），V1–V2 不受累，也没有任何导联抬高——心内膜下（NSTE）缺血，走另一条路径。压低越靠右胸、T 越直立、R 越高，越像后壁。',
        'Both tracings show precordial ST depression, but the distribution decides where they go. In A the depression is **deepest in the right chest leads (V1–V2)**, horizontal and gone by V4, while the leads facing the lateral wall are elevated — the mirror of a posterolateral occlusion: record V7–V9 and manage as a STEMI. In B the depression sits in the **left chest leads V4–V6** (and I, aVL), V1–V2 are spared and no lead is elevated — subendocardial (NSTE) ischaemia on a different pathway. The more right-precordial the depression, the more upright the T and the taller the R, the more it looks posterior.',
        'Ambos registros muestran descenso del ST precordial, pero la distribución decide el camino. En A el descenso es **máximo en las precordiales derechas (V1–V2)**, horizontal y desaparece en V4, mientras las derivaciones que miran a la pared lateral están elevadas: la imagen especular de una oclusión posterolateral; registra V7–V9 y trátalo como IAMCEST. En B el descenso está en las **precordiales izquierdas V4–V6** (y en I, aVL), V1–V2 se respetan y ninguna derivación se eleva: isquemia subendocárdica (SCASEST), otra vía. Cuanto más derecho-precordial sea el descenso, más positiva la T y más alta la R, más posterior parece.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('stemi-posterior', 904, undefined, 'evolved'),
      view: { layout: 'single', lead: 'V2' },
      marks: [
        { auto: 'r', lead: 'V2' },
        { auto: 't', lead: 'V2' },
      ],
      caption: l(
        '几天之后（已再灌注或自发再通）：V2 的 R 波已长过 S 波（R/S > 1），V1–V2 的 T 波直立，只残存轻微 ST 压低；侧壁的 R 波变小。增高的 R 是后壁**病理性 Q 波的镜像**——当 V1–V2 的 R ≥40 ms 且 R/S ≥1、T 直立时，就达到陈旧性后壁梗死的标准。与 RVH（电轴右偏、V5–V6 深 S）、RBBB（V1 呈 rsr′、QRS 增宽）、WPW（δ 波、PR 短）鉴别；排除之后，V1–V2 的高 R + R/S ≥1 + 直立 T 就是旧的后壁梗死。',
        'Days later (after reperfusion or spontaneous recanalisation): the R in V2 now outgrows the S (R/S > 1), the T in V1–V2 is upright with only slight residual ST depression, and the lateral R waves have shrunk. The growing R is the mirror of a posterior **pathological Q** — once the R in V1–V2 is ≥40 ms with R/S ≥1 and an upright T, it meets the criterion for an old posterior MI. Tell it from RVH (right axis, deep S in V5–V6), RBBB (rsr′ in V1, wide QRS) and WPW (delta wave, short PR); once excluded, a tall R + R/S ≥1 + upright T in V1–V2 is an old posterior infarct.',
        'Días después (reperfundido o recanalizado de forma espontánea): la R de V2 ya supera a la S (R/S > 1), la T de V1–V2 es positiva con solo un leve descenso residual del ST, y las R laterales se han reducido. La R creciente es la imagen especular de una **Q patológica posterior**: cuando la R de V1–V2 mide ≥40 ms con R/S ≥1 y T positiva, cumple el criterio de infarto posterior antiguo. Distinguirlo de la HVD (eje derecho, S profunda en V5–V6), del BRD (rsr′ en V1, QRS ancho) y del WPW (onda delta, PR corto); excluidos estos, una R alta + R/S ≥1 + T positiva en V1–V2 es un infarto posterior viejo.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('stemi-inferior', 907, undefined, 'posterior'),
      view: { layout: '3x4+1', highlightLeads: ['II', 'III', 'aVF', 'V1', 'V2', 'V3'] },
      marks: [
        { auto: 'st', lead: 'III' },
        { auto: 'st', lead: 'V2' },
      ],
      caption: l(
        '后壁梗死很少真正孤立：更常见的是与下壁梗死并存（RCA 或 LCx 可同时供应两个区域）。II、III、aVF 抬高 + V1–V3 压低 = **下后壁 STEMI**（这里 III > II、I 和 aVL 压低，V5–V6 不抬高：优势型 RCA 连同其后侧支）——V1–V3 压低既是后壁延伸的线索，也是下壁抬高的对应性改变。两条路都通向同一决定：再灌注，并加做 V3R/V4R 与 V7–V9。',
        'A posterior infarct is rarely truly isolated: more often it joins an inferior MI (the RCA or LCx can feed both regions). Elevation in II, III, aVF + depression in V1–V3 = an **inferoposterior STEMI** (here III > II, I and aVL are depressed and V5–V6 are not elevated: a dominant RCA with its posterolateral branch) — the V1–V3 depression is both the clue to posterior extension and the reciprocal change of the inferior elevation. Both readings lead to the same decision: reperfusion, and record V3R/V4R and V7–V9.',
        'Un infarto posterior rara vez es realmente aislado: lo habitual es que se sume a un infarto inferior (la CD o la Cx pueden irrigar ambas regiones). Elevación en II, III, aVF + descenso en V1–V3 = **IAMCEST inferoposterior** (aquí III > II, I y aVL están descendidas y V5–V6 no se elevan: una CD dominante con su rama posterolateral); el descenso en V1–V3 es a la vez la pista de la extensión posterior y el cambio recíproco de la elevación inferior. Ambas lecturas llevan a la misma decisión: reperfusión, y registrar V3R/V4R y V7–V9.',
      ),
    },
    { kind: 'check', item: { family: 'occlusion', seed: 27 } },
    { kind: 'check', item: { family: 'occlusion', seed: 18 } },
    { kind: 'check', item: { family: 'territory', seed: 17 } },
    { kind: 'drill', families: ['occlusion', 'territory'], count: 8, passScore: 0.85 },
    {
      kind: 'real',
      ids: [15059, 17772],
      caption: l(
        '两份真实心电图。81 岁男性：数据库标注为急性（分期 I）下后壁梗死，伴一度房室阻滞——找下壁导联的改变和胸前导联的 ST 压低，判断镜像在哪里、要不要加做 V7–V9。63 岁男性：时期不明的下壁 Q 波梗死，V2 的 R 波偏高——这是慢性的问题：它是否达到陈旧后壁梗死的 Q 波等价标准（R ≥40 ms、R/S ≥1、T 直立）？它不是 STEMI 等危症。先想好答案再揭晓。',
        'Two real ECGs. A man of 81: labelled an acute (stage I) inferoposterior MI in the database, with first-degree AV block — find the inferior changes and the precordial ST depression, decide where the mirror is and whether V7–V9 are needed. A man of 63: an inferior Q-wave infarct of unknown age with a prominent R in V2 — the chronic question: does it meet the Q-wave equivalent of an old posterior MI (R ≥40 ms, R/S ≥1, upright T)? It is not a STEMI equivalent. Commit to an answer, then reveal.',
        'Dos ECG reales. Un varón de 81 años: etiquetado en la base de datos como infarto inferoposterior agudo (estadio I), con bloqueo AV de primer grado; busca los cambios inferiores y el descenso del ST precordial, decide dónde está la imagen especular y si hacen falta V7–V9. Un varón de 63: infarto inferior con onda Q de antigüedad desconocida y una R prominente en V2; la pregunta crónica: ¿cumple el equivalente de onda Q del infarto posterior antiguo (R ≥40 ms, R/S ≥1, T positiva)? No es un equivalente de IAMCEST. Decide tu respuesta y después mira la solución.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '把 V1–V3 孤立性 ST 压低自动报告为“前壁心内膜下缺血”：先想到后壁镜像，加做 V7–V9。',
          'Auto-reporting isolated V1–V3 ST depression as "anterior subendocardial ischaemia": think of the posterior mirror first and record V7–V9.',
          'Reportar de forma automática el descenso aislado del ST en V1–V3 como «isquemia subendocárdica anterior»: piensa primero en la imagen especular posterior y registra V7–V9.',
        ),
        l(
          'V7–V9 被遗忘：只要 V1–V3 出现孤立性压低（以及每个下壁 STEMI）就应该记录这三根导联。',
          'V7–V9 never recorded: they belong to every isolated V1–V3 depression (and to every inferior STEMI).',
          'No registrar V7–V9: corresponden a todo descenso aislado en V1–V3 (y a todo IAMCEST inferior).',
        ),
        l(
          '陈旧性后壁梗死的高 R 被叫作“RVH”或“正常变异”：R ≥40 ms、R/S ≥1 加直立 T，在排除 RBBB、WPW、RVH 之后就是后壁的 Q 波等价物。',
          'The tall R of an old posterior MI called "RVH" or a "normal variant": R ≥40 ms with R/S ≥1 and an upright T, once RBBB, WPW and RVH are excluded, is the posterior Q-wave equivalent.',
          'La R alta del infarto posterior antiguo llamada «HVD» o «variante normal»: una R ≥40 ms con R/S ≥1 y T positiva, excluidos BRD, WPW y HVD, es el equivalente posterior de la onda Q.',
        ),
        l(
          '“才 0.5 mm，太小不说明问题”：0.5 mm 是 V1–V3 与 V7–V9 的正式阈值；压低越深、范围越大，后壁损伤越大。',
          '"Only 0.5 mm, too small to matter": 0.5 mm is the formal threshold for both V1–V3 and V7–V9; the deeper and wider the depression, the larger the posterior injury.',
          '«Solo 0,5 mm, demasiado poco para importar»: 0,5 mm es el umbral formal tanto en V1–V3 como en V7–V9; cuanto más profundo y extenso el descenso, mayor es la lesión posterior.',
        ),
        l(
          '后壁 STEMI 被放上“缺血 / 等肌钙蛋白”路径：它是 STEMI 等危症——立即再灌注。',
          'A posterior STEMI parked on the "ischaemia / wait for troponin" pathway: it is a STEMI equivalent — reperfusion now.',
          'Un IAMCEST posterior aparcado en la vía de «isquemia / esperar la troponina»: es un equivalente de IAMCEST: reperfusión inmediata.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'V1–V3 孤立性水平型 ST 压低 ≥0.5 mm + 直立 T + 高/增高 R = 后壁镜像，是 STEMI 等危症，不是“前壁缺血”。',
          'Isolated horizontal ST depression ≥0.5 mm in V1–V3 + upright T + tall or growing R = the posterior mirror: a STEMI equivalent, not "anterior ischaemia".',
          'Descenso horizontal aislado del ST ≥0,5 mm en V1–V3 + T positiva + R alta o creciente = imagen especular posterior: un equivalente de IAMCEST, no «isquemia anterior».',
        ),
        l(
          '确认靠 V7–V9（与 V6 同水平：腋后线、肩胛中线、左脊柱旁线）：ST 抬高 ≥0.5 mm（<40 岁男性 ≥1 mm）。',
          'Confirm with V7–V9 (level with V6: posterior axillary, mid-scapular, left paravertebral): ST elevation ≥0.5 mm (≥1 mm in men <40 y).',
          'Confirmar con V7–V9 (a la altura de V6: axilar posterior, escapular media, paravertebral izquierda): elevación del ST ≥0,5 mm (≥1 mm en varones <40 años).',
        ),
        l(
          '罪犯血管多为 LCx；后壁梗死常与下壁并存——再看 II、III、aVF，并想到 V3R/V4R。',
          'The culprit is usually the LCx; the posterior wall often joins the inferior wall — re-check II, III, aVF and think of V3R/V4R.',
          'La arteria responsable suele ser la Cx; la pared posterior acompaña a menudo a la inferior: revisa II, III y aVF y piensa en V3R/V4R.',
        ),
        l(
          '弥漫性压低（达 V4–V6、T 平坦/双向、无高 R）是心内膜下缺血，走 NSTE 路径——与后壁镜像分清。',
          'Diffuse depression (reaching V4–V6, flat or biphasic T, no tall R) is subendocardial ischaemia on the NSTE pathway — keep it apart from the posterior mirror.',
          'El descenso difuso (que llega a V4–V6, T plana o bifásica, sin R alta) es isquemia subendocárdica por la vía del SCASEST: no lo confundas con la imagen especular posterior.',
        ),
        l(
          '陈旧性后壁梗死：V1–V2 R ≥40 ms、R/S ≥1、T 直立（排除 RBBB、WPW、RVH）；急性后壁闭塞按 STEMI 立即再灌注。',
          'Old posterior MI: R ≥40 ms in V1–V2, R/S ≥1, upright T (exclude RBBB, WPW, RVH); an acute posterior occlusion gets immediate STEMI reperfusion.',
          'Infarto posterior antiguo: R ≥40 ms en V1–V2, R/S ≥1, T positiva (excluir BRD, WPW, HVD); la oclusión posterior aguda recibe reperfusión inmediata como IAMCEST.',
        ),
      ],
    },
  ],
  sources: [
    'Thygesen K et al. Fourth Universal Definition of Myocardial Infarction. Eur Heart J 2019;40:237-269',
    'Byrne RA et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J 2023;44:3720-3826',
    'Wagner GS et al. AHA/ACCF/HRS Part VI: Acute ischemia/infarction. Circulation 2009;119:e262-e270',
    'Castellano et al. 2004',
  ],
};

export default lesson;
