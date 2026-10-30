/**
 * r4 — Mobitz II, 2:1, high-grade and complete AV block (docs/PLAN.md §3, stage R).
 * Criteria: docs/curriculum/criteria.md `mobitz-ii`, `fixed-variable-advanced-avb`, `complete-avb`, `escape-site`,
 * `av-dissociation`, `avb-exercise` (current values), plus the 2:1-localisation, ratio-notation,
 * pacing-regardless-of-symptoms, reversible-causes and unexplained-block-under-60 items.
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
  id: 'r4',
  stage: 'R',
  order: 4,
  title: l('二度Ⅱ型、2:1、高度与三度房室传导阻滞', 'Mobitz II, 2:1, high-grade and complete AV block', 'Mobitz II, bloqueo AV 2:1, avanzado y completo'),
  summary: l(
    'PR 恒定却突然脱落 P 波的是 Mobitz II——阻滞在希氏束以下，排除可逆原因后无论有无症状都要起搏。2:1 与高度阻滞靠线索定水平；三度阻滞则让 P 波穿行整个心动周期来证明。',
    'Mobitz II drops a P with a constant PR — the block is below the His bundle and, once reversible causes are excluded, warrants pacing regardless of symptoms. 2:1 and high-grade block are localised by clues; complete block is proven by letting the P waves march through the whole cycle.',
    'El Mobitz II pierde una P con un PR constante: el bloqueo está por debajo del haz de His y, excluidas las causas reversibles, requiere marcapasos haya o no síntomas. El bloqueo 2:1 y el avanzado se localizan por pistas; el bloqueo completo se demuestra dejando que las ondas P recorran todo el ciclo.',
  ),
  objectives: [
    l(
      '用“PR 恒定 + 突然脱落 P”识别 Mobitz II，说出其阻滞部位与通常的 QRS 宽度。',
      'Recognise Mobitz II by a constant PR with a sudden dropped P, and state its level and usual QRS width.',
      'Reconocer el Mobitz II por un PR constante con una P bloqueada de golpe y citar su nivel y la anchura habitual del QRS.',
    ),
    l(
      '用 QRS 宽度、PR 长短与运动/阿托品反应为 2:1 与高度房室传导阻滞定位。',
      'Localise 2:1 and high-grade AV block using QRS width, PR length and the response to exercise or atropine.',
      'Localizar el bloqueo AV 2:1 y el avanzado con la anchura del QRS, la duración del PR y la respuesta al ejercicio o la atropina.',
    ),
    l(
      '通过 P 波穿行所有时相、PR 随机、逸搏规则来证明三度（完全性）阻滞，并用逸搏形态定位。',
      'Prove third-degree (complete) block — P waves marching through all phases, random PR, a regular escape — and localise it from the escape shape.',
      'Demostrar el bloqueo de tercer grado (completo) —ondas P que recorren todas las fases, PR aleatorio, escape regular— y localizarlo por la morfología del escape.',
    ),
    l(
      '说出起搏指征（Mobitz II、高度、三度：不论症状）与必须先排除的可逆原因。',
      'State the pacing indications (Mobitz II, high-grade, complete: regardless of symptoms) and the reversible causes to exclude first.',
      'Citar las indicaciones de marcapasos (Mobitz II, avanzado y completo: con o sin síntomas) y las causas reversibles que hay que excluir antes.',
    ),
  ],
  minutes: 16,
  competencies: ['C6', 'C3'],
  findings: ['av-block-2-mobitz2', 'av-block-2-2to1', 'av-block-high-grade', 'av-block-3', 'av-dissociation'],
  blocks: [
    {
      kind: 'hook',
      ecg: synth('av-block-2-mobitz2', 461),
      view: STRIP,
      question: l(
        '每个下传搏动的 PR 一模一样，然后一个 P 冷不防被拦下。这和文氏型有什么不同？先写下你的判断再往下看。',
        'Every conducted beat has exactly the same PR, then a P is dropped cold. How does this differ from Wenckebach? Commit to an answer before reading on.',
        'Cada latido conducido tiene exactamente el mismo PR y, de pronto, una P se bloquea sin previo aviso. ¿En qué se diferencia del Wenckebach? Anota tu respuesta antes de continuar.',
      ),
      reveal: l(
        '脱落**前后**的 PR 都恒定：没有渐进延长，间歇后第一个 PR 也不缩短——这是 **Mobitz II（二度Ⅱ型）**，4:3 传导。阻滞位于**希氏束以下**，所以 QRS 通常增宽（本例伴右束支阻滞）：患病的组织“全或无”地下传。排除可逆原因后，**无论有无症状，永久起搏都是 I 类指征**——这正是它与文氏型最大的临床差别。',
        'The PR is constant **before and after** the dropped P: no progressive lengthening, and the first PR after the pause does not shorten — this is **Mobitz II (second-degree, type II)**, 4:3 conduction. The block sits **below the His bundle**, so the QRS is usually wide (here with RBBB): diseased tissue conducts all-or-none. Once reversible causes are excluded, **permanent pacing is Class I regardless of symptoms** — the biggest clinical difference from Wenckebach.',
        'El PR es constante **antes y después** de la P bloqueada: no hay alargamiento progresivo y el primer PR tras la pausa no se acorta: se trata de un **Mobitz II (bloqueo de segundo grado tipo II)**, conducción 4:3. El bloqueo está **por debajo del haz de His**, por lo que el QRS suele ser ancho (aquí con bloqueo de rama derecha): el tejido enfermo conduce a todo o nada. Excluidas las causas reversibles, **el marcapasos definitivo es clase I con o sin síntomas**, la mayor diferencia clínica con el Wenckebach.',
      ),
    },
    {
      kind: 'heart',
      ecg: synth('av-block-2-mobitz2', 462),
      showConduction: true,
      emphasize: ['his', 'rbb'],
      caption: l(
        '播放几个心动周期。窦房结规律放电（75 次/分），激动能到达希氏束，但在希氏束-浦肯野系统内被“全或无”地拦截：右束支已完全阻滞（QRS 增宽），每第 4 个 P 之后有一次下传失败。Mobitz II 从不提前打招呼——这正是它需要起搏器、而文氏型通常不需要的原因之一。',
        'Play a few beats. The sinus node fires regularly (75/min) and impulses reach the His bundle, but the His-Purkinje system blocks them all-or-none: the right bundle is already completely blocked (wide QRS) and every fourth P fails to get through. Mobitz II never warns in advance — one reason it earns a pacemaker while Wenckebach usually does not.',
        'Reproduce unos latidos. El nodo sinusal dispara de forma regular (75 lpm) y los impulsos llegan al haz de His, pero el sistema de His-Purkinje los bloquea a todo o nada: la rama derecha ya está bloqueada por completo (QRS ancho) y de cada cuatro P una deja de conducir. El Mobitz II nunca avisa con antelación, una de las razones por las que merece un marcapasos mientras que el Wenckebach normalmente no.',
      ),
    },
    {
      kind: 'criteria',
      title: l('下传失败：从 Mobitz II 到三度', 'Failed conduction: from Mobitz II to complete block', 'Conducción fallida: del Mobitz II al bloqueo completo'),
      items: [
        {
          label: l('Mobitz II（二度Ⅱ型）', 'Mobitz II (second-degree, type II)', 'Mobitz II (segundo grado, tipo II)'),
          value: l(
            'P 波频率恒定（<100 次/分），单个 P 未下传，脱落前后 PR 恒定；2:1 阻滞不纳入此定义；阻滞在希氏束以下，QRS 通常增宽（窄 QRS 提示位于希氏束内）',
            'Constant P rate (<100/min), a single non-conducted P, constant PR before and after the drop; 2:1 block is excluded from this definition; the block is infra-His, usually with a wide QRS (a narrow QRS implies an intra-Hisian site)',
            'Frecuencia de P constante (<100 lpm), una sola P no conducida, PR constante antes y después de la caída; el bloqueo 2:1 queda fuera de esta definición; el bloqueo es infrahisiano, habitualmente con QRS ancho (un QRS estrecho sugiere un bloqueo intrahisiano)',
          ),
        },
        {
          label: l('2:1 阻滞的定位线索', 'Localising clues in a 2:1 block', 'Pistas para localizar un bloqueo 2:1'),
          value: l(
            '仅凭 2:1 段无法分型。提示房室结：QRS 窄、PR 延长、条图他处有文氏周期、阿托品或运动后改善；提示希氏束下：QRS 宽或束支阻滞、PR 正常、运动或阿托品后恶化（仍不确定时行运动试验或电生理检查）',
            'The 2:1 stretch alone cannot be typed. Pointing to the AV node: narrow QRS, long PR, Wenckebach periods elsewhere on the strip, improvement with atropine or exercise; pointing infra-His: wide QRS or BBB, normal PR, worsening with exercise or atropine (exercise testing or EPS if still unclear)',
            'El tramo con 2:1 por sí solo no permite clasificarlo. A favor del nodo AV: QRS estrecho, PR largo, periodos de Wenckebach en otra parte de la tira, mejoría con atropina o ejercicio; a favor de infrahisiano: QRS ancho o bloqueo de rama, PR normal, empeoramiento con ejercicio o atropina (prueba de esfuerzo o estudio electrofisiológico si persiste la duda)',
          ),
        },
        {
          label: l('传导比例与高度阻滞', 'Conduction ratios and high-grade block', 'Ratios de conducción y bloqueo avanzado'),
          value: l(
            '比例按“P 波数 : QRS 数”书写（3:2 = 每 3 个 P 有 1 个未下传）；连续 ≥2 个 P 未下传且仍有部分传导 = 高度（进展性）房室传导阻滞（3:1、4:1……）',
            'Ratios are written as P waves : QRS complexes (3:2 = one P blocked in every three); ≥2 consecutive non-conducted P waves with some conduction preserved = high-grade (advanced) AV block (3:1, 4:1…)',
            'Los ratios se escriben como ondas P : complejos QRS (3:2 = una P bloqueada de cada tres); ≥2 ondas P consecutivas no conducidas conservando algo de conducción = bloqueo AV avanzado (3:1, 4:1…)',
          ),
        },
        {
          label: l('三度（完全性）阻滞', 'Third-degree (complete) block', 'Bloqueo de tercer grado (completo)'),
          value: l(
            '无任何房室传导证据：房室各自独立，房率 > 室率，PR 完全随机，逸搏节律规则；P 波须落在心动周期的所有时相（包括不应期之外）均不下传方可诊断',
            'No evidence of AV conduction: atria and ventricles independent, atrial rate > ventricular rate, PR random, escape rhythm regular; P waves must be seen falling at all points of the cycle — including outside the refractory period — without conducting',
            'Sin evidencia de conducción AV: aurículas y ventrículos independientes, frecuencia auricular > ventricular, PR aleatorio y ritmo de escape regular; deben verse ondas P cayendo en todas las fases del ciclo —también fuera del periodo refractario— sin conducir',
          ),
        },
        {
          label: l('逸搏定位阻滞水平', 'The escape localises the block', 'El escape localiza el bloqueo'),
          value: l(
            '窄 QRS 逸搏约 40–60 次/分 → 房室结或希氏束；宽 QRS 逸搏约 20–40 → 希氏束下（成人获得性完全性阻滞最常见部位）；左室灶呈右束支阻滞形，右室灶呈左束支阻滞形',
            'A narrow-QRS escape at about 40-60/min → AV node or His bundle; a wide-QRS escape at about 20-40 → infra-His (the commonest site in acquired adult complete block); an LV focus looks RBBB-shaped, an RV focus LBBB-shaped',
            'Escape con QRS estrecho a unos 40-60 lpm → nodo AV o haz de His; escape con QRS ancho a unos 20-40 → infrahisiano (la localización más frecuente en el bloqueo completo adquirido del adulto); un foco del VI da morfología de bloqueo de rama derecha y uno del VD de rama izquierda',
          ),
        },
        {
          label: l('运动试验的作用', 'What exercise testing adds', 'Qué aporta la prueba de esfuerzo'),
          value: l(
            '正常时运动使 PR 缩短；结性阻滞（文氏、结性 2:1）随交感兴奋而改善；希氏束下阻滞随心房率升高而恶化；运动中出现的二度/三度阻滞几乎均为希氏束下，需起搏',
            'Exercise normally shortens the PR; nodal block (Wenckebach, nodal 2:1) improves with sympathetic drive; infra-His block worsens as the atrial rate rises; second- or third-degree block appearing during exercise is almost always infra-His and warrants pacing',
            'El ejercicio acorta normalmente el PR; el bloqueo en el nodo AV (Wenckebach, 2:1 en el nodo AV) mejora con el estímulo simpático; el infrahisiano empeora al subir la frecuencia auricular; el bloqueo de segundo o tercer grado que aparece con el ejercicio casi siempre es infrahisiano y requiere marcapasos',
          ),
        },
        {
          label: l('起搏与可逆原因', 'Pacing and reversible causes', 'Marcapasos y causas reversibles'),
          value: l(
            '排除可逆原因后，获得性 Mobitz II、高度或三度阻滞：不论症状，永久起搏 I 类；交替性束支阻滞同样 I 类。先查：药物（β 受体阻滞剂、维拉帕米/地尔硫卓、地高辛、抗心律失常药）、高钾、缺血/梗死（下壁→结性、多为一过性；前壁→突然、宽逸搏）、莱姆病、睡眠呼吸暂停、甲状腺功能减退；<60 岁不明原因者还应查心脏结节病、心肌炎、淀粉样变、LMNA',
            'Once reversible causes are excluded, acquired Mobitz II, high-grade or third-degree block: permanent pacing Class I regardless of symptoms; alternating bundle-branch block likewise Class I. First exclude: drugs (beta-blockers, verapamil/diltiazem, digoxin, antiarrhythmics), hyperkalaemia, ischaemia/MI (inferior → nodal, usually transient; anterior → sudden, wide escape), Lyme disease, sleep apnoea, hypothyroidism; under about 60 with unexplained block, also look for cardiac sarcoidosis, myocarditis, amyloidosis, LMNA',
            'Excluidas las causas reversibles, el Mobitz II, el bloqueo avanzado o el de tercer grado adquiridos: marcapasos definitivo clase I con o sin síntomas; el bloqueo de rama alternante también es clase I. Excluye antes: fármacos (betabloqueantes, verapamilo/diltiazem, digoxina, antiarrítmicos), hiperpotasemia, isquemia/infarto (inferior → nodo AV, suele ser transitorio; anterior → brusco, escape ancho), enfermedad de Lyme, apnea del sueño, hipotiroidismo; en menores de unos 60 años sin causa, busca también sarcoidosis cardíaca, miocarditis, amiloidosis y LMNA',
          ),
        },
        {
          label: l('房颤伴慢而规则的室率', 'AF with a slow, regular ventricular rate', 'FA con frecuencia ventricular lenta y regular'),
          value: l(
            '提示完全性房室传导阻滞伴逸搏（经典原因：地高辛中毒与传导系统疾病）',
            'Means complete AV block with an escape (classic causes: digoxin toxicity and conduction-system disease)',
            'Indica bloqueo AV completo con escape (causas clásicas: intoxicación por digoxina y enfermedad del sistema de conducción)',
          ),
        },
      ],
      source:
        'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482; Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427-3520',
    },
    {
      kind: 'contrast',
      title: l('同为 2:1，部位不同', 'Same 2:1, different level', 'Mismo 2:1, distinto nivel'),
      view: STRIP,
      left: {
        ecg: synth('av-block-2-2to1', 463),
        caption: l('房率 84、室率 42：QRS 窄（PR 180 ms）→ 多为房室结', 'Atrial 84, ventricular 42: narrow QRS (PR 180 ms) → most likely the AV node', 'Auricular 84, ventricular 42: QRS estrecho (PR de 180 ms) → probablemente el nodo AV'),
        marks: [{ auto: 'blocked-p' }, { auto: 'pr' }],
      },
      right: {
        ecg: synth('av-block-2-2to1', 464, undefined, 'infra-his'),
        caption: l('QRS 宽（右束支阻滞形）、PR 正常 → 希氏束下', 'Wide QRS (RBBB-shaped), normal PR → infra-His', 'QRS ancho (morfología de bloqueo de rama derecha), PR normal → infrahisiano'),
        marks: [{ auto: 'blocked-p' }, { auto: 'qrs' }],
      },
      point: l(
        '两边传导比例都是 2:1，但 2:1 段本身不能分型——**看线索**：左图 QRS 窄，阻滞多在房室结（若 PR 延长或条上别处有文氏周期，就更有把握），通常暂不需起搏器；右图 QRS 宽、PR 正常，是希氏束下阻滞，按 Mobitz II 对待：排除可逆原因后起搏。报告要写比例加线索，别只写“2:1”。',
        'Both sides conduct 2:1, but the 2:1 stretch alone cannot be typed — **use the clues**: on the left a narrow QRS puts the block most likely at the AV node (a long PR or Wenckebach periods elsewhere on the strip would make it surer), usually not needing a pacemaker yet; on the right a wide QRS with a normal PR means infra-His disease, to be treated like Mobitz II: pace once reversible causes are excluded. Report the ratio plus the clues, not just "2:1".',
        'Ambos lados conducen 2:1, pero el tramo con 2:1 por sí solo no permite clasificarlo: **usa las pistas**: a la izquierda, un QRS estrecho sitúa el bloqueo probablemente en el nodo AV (un PR largo o periodos de Wenckebach en otra parte de la tira lo harían más seguro), que normalmente aún no necesita marcapasos; a la derecha, un QRS ancho con PR normal significa enfermedad infrahisiana, que se trata como un Mobitz II: marcapasos excluidas las causas reversibles. En el informe indica el ratio y las pistas, no solo «2:1».',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('av-block-high-grade', 465),
      view: STRIP,
      marks: [{ auto: 'blocked-p', label: l('连续两个未下传的 P', 'Two consecutive blocked P waves', 'Dos P consecutivas bloqueadas') }],
      caption: l(
        '心房约 96 次/分，却只有每第 3 个 P 下传（**3:1**）：连续 ≥2 个 P 被拦 = **高度（进展性）房室传导阻滞**。一个 30 次/分的交界区逸搏在“待命”——窦性再慢一点它就会接管。按 Mobitz II/三度的逻辑处理：排除可逆原因后，不论症状均 I 类起搏。',
        'The atria run at about 96/min yet only every third P conducts (**3:1**): ≥2 consecutive P waves blocked = **high-grade (advanced) AV block**. A junctional escape at 30/min waits in reserve — if the sinus slows any further it takes over. Manage it like Mobitz II or complete block: Class I pacing regardless of symptoms once reversible causes are excluded.',
        'Las aurículas van a unos 96 lpm y, aun así, solo conduce cada tercera P (**3:1**): ≥2 ondas P consecutivas bloqueadas = **bloqueo AV avanzado**. Un escape de la unión a 30 lpm queda «en espera»: si el sinusal se frena un poco más, toma el relevo. Manéjalo como un Mobitz II o un bloqueo completo: marcapasos clase I con o sin síntomas una vez excluidas las causas reversibles.',
      ),
    },
    {
      kind: 'worked',
      title: l('证明三度阻滞：让 P 波走完全程', 'Proving complete block: march the P through everything', 'Demostrar el bloqueo completo: recorre la P de principio a fin'),
      ecg: synth('av-block-3', 466),
      view: STRIP,
      steps: [
        {
          title: l('先量心室', 'Measure the ventricles first', 'Mide primero los ventrículos'),
          body: l(
            'RR 完全规则，约 45 次/分，QRS 窄：一个规则的交界区起搏点。规则不等于传导——继续往上找。',
            'The RR is perfectly regular at about 45/min with a narrow QRS: a regular junctional pacemaker. Regular is not the same as conducted — keep looking upstream.',
            'El RR es totalmente regular, unos 45 lpm, con QRS estrecho: un marcapasos de la unión regular. Regular no equivale a conducido: sigue buscando más arriba.',
          ),
          marks: [{ auto: 'rr' }],
        },
        {
          title: l('找到心房', 'Find the atria', 'Encuentra las aurículas'),
          body: l(
            '用分规沿整条节律条扫 P 波：窦性 P 规则放电（约 78 次/分），PP 恒定。两套节律各自为政。',
            'Sweep the whole strip with calipers for P waves: sinus P waves fire regularly (about 78/min) with a constant PP. Two rhythms, each minding its own business.',
            'Recorre toda la tira con el compás buscando ondas P: las P sinusales disparan de forma regular (unos 78 lpm) con un PP constante. Dos ritmos, cada uno a lo suyo.',
          ),
          marks: [{ auto: 'p' }],
          view: { layout: 'strip', lead: 'II', calipers: true },
        },
        {
          title: l('逐搏检验 PR', 'Test the PR beat by beat', 'Pon a prueba el PR latido a latido'),
          body: l(
            'PR 毫无规律：有的 P 落在 QRS 前（PR 长短不一）、有的埋进 QRS、有的骑在 T 波上——**连落在不应期之外的 P 也没有一个下传**。这才是“完全”的证据：不是 PR 长，而是根本没有传导。',
            'The PR is random: some P waves precede the QRS (at varying PRs), some are buried in it, some ride the T wave — **and even P waves falling well outside the refractory period do not conduct**. That is what "complete" means: not a long PR, but no conduction at all.',
            'El PR no sigue ningún patrón: algunas P preceden al QRS (con PR variables), otras se ocultan en él y otras cabalgan la onda T, **y ni siquiera las P que caen fuera del periodo refractario conducen**. Eso es lo «completo» del bloqueo: no un PR largo, sino ausencia total de conducción.',
          ),
          marks: [{ auto: 'blocked-p' }],
        },
        {
          title: l('用逸搏定位，然后处理', 'Localise with the escape, then act', 'Localiza por el escape y actúa'),
          body: l(
            '逸搏 45 次/分、窄 → 阻滞在房室结或希氏束（本例为房室结）。无论部位在哪，获得性三度阻滞在排除可逆原因后一律 I 类起搏——逸搏“规则、稳定”只是假象，它随时可能更慢或停顿。',
            'The escape is 45/min and narrow → the block is in the AV node or His bundle (here the AV node). Whatever the level, acquired complete block is Class I for pacing once reversible causes are excluded — a "regular, stable" escape is an illusion; it can slow further or stall at any time.',
            'El escape es de 45 lpm y estrecho → el bloqueo está en el nodo AV o el haz de His (aquí, el nodo AV). Sea cual sea el nivel, el bloqueo completo adquirido es clase I para marcapasos una vez excluidas las causas reversibles: un escape «regular y estable» es una ilusión; puede frenarse más o detenerse en cualquier momento.',
          ),
        },
        {
          title: l('没有 P 波时：房颤的表亲', 'When there are no P waves: the AF cousin', 'Cuando no hay ondas P: el primo con FA'),
          body: l(
            '若基线是房颤（无 P 波）而室率慢且**完全规则**——同一诊断：完全性房室传导阻滞伴逸搏，经典原因是地高辛中毒与传导系统疾病。房颤的 RR 绝对不齐；一旦变规则，说明激动根本不是穿过房室结来的。',
            'If the baseline is AF (no P waves) and the ventricular rate is slow and **perfectly regular**, it is the same diagnosis: complete AV block with an escape, classically from digoxin toxicity or conduction-system disease. AF is irregularly irregular; the moment it becomes regular, the impulses are no longer crossing the AV node.',
            'Si la línea de base es una FA (sin ondas P) y la frecuencia ventricular es lenta y **perfectamente regular**, es el mismo diagnóstico: bloqueo AV completo con escape, clásicamente por intoxicación por digoxina o enfermedad del sistema de conducción. La FA es irregularmente irregular; en cuanto se vuelve regular, los impulsos ya no cruzan el nodo AV.',
          ),
        },
      ],
    },
    {
      kind: 'ecg',
      ecg: synth('av-block-3', 467, undefined, 'infra-his'),
      view: STRIP,
      marks: [
        { auto: 'p', label: l('窦性 P，与 QRS 无关', 'Sinus P, unrelated to the QRS', 'P sinusal, independiente del QRS') },
        { auto: 'qrs', label: l('宽大室性逸搏（34 次/分）', 'Wide ventricular escape (34/min)', 'Escape ventricular ancho (34 lpm)') },
      ],
      caption: l(
        '同一诊断，另一个水平：这里阻滞在希氏束以下，逸搏来自心室（34 次/分、宽、左室心尖起源）。对照上一张：**逸搏的宽度就是阻滞水平的免费报告**——窄 40–60 → 房室结/希氏束；宽 20–40 → 希氏束下。宽逸搏更慢、更不可靠，起搏更紧急。',
        'Same diagnosis, different level: the block is now below the His bundle and the escape is ventricular (34/min, wide, from the LV apex). Compare with the previous tracing: **the width of the escape is a free report on the level of the block** — narrow at 40-60 → AV node/His; wide at 20-40 → infra-His. A wide escape is slower, less reliable, and more urgent to pace.',
        'Mismo diagnóstico, otro nivel: ahora el bloqueo está por debajo del haz de His y el escape es ventricular (34 lpm, ancho, del ápex del VI). Compáralo con el trazado anterior: **la anchura del escape es un informe gratuito del nivel del bloqueo**: estrecho a 40-60 → nodo AV/haz de His; ancho a 20-40 → infrahisiano. El escape ancho es más lento, menos fiable y más urgente de estimular.',
      ),
    },
    {
      kind: 'ecg',
      ecg: synth('av-dissociation', 468),
      view: STRIP,
      marks: [{ auto: 'p' }, { auto: 'qrs' }],
      caption: l(
        '注意：这条也是房室分离，但**没有阻滞**。窦性 60 次/分，交界区起搏点 66 次/分——下位起搏点加速“抢位”（等频性分离），P 在 QRS 周围缓缓漂移，**能下传的 P 会以夺获搏动的形式出现**（提前出现的 QRS，形态与交界性搏动相同）。与三度阻滞的区别：那里房率 > 室率、无一个 P 下传；这里室率 ≥ 房率、传导通路完好。房室分离是描述，完全性阻滞是诊断——写报告前先分清（见 r2）。',
        'Careful: this strip also shows AV dissociation, but **with no block**. Sinus 60/min, junctional pacemaker 66/min — a subsidiary pacemaker has accelerated and usurped the rhythm (isorhythmic dissociation); the P drifts slowly around the QRS, and **any P that can conduct shows up as a capture beat** (an earlier QRS, the same narrow shape as the junctional beats). The difference from complete block: there the atrial rate exceeds the ventricular rate and no P conducts; here the ventricular rate is ≥ the atrial rate and the pathway is intact. AV dissociation is a description, complete block is a diagnosis — separate them before you write the report (see r2).',
        'Cuidado: esta tira también muestra disociación AV, pero **sin bloqueo**. Sinusal 60 lpm, marcapasos de la unión 66 lpm: un marcapasos subsidiario se ha acelerado y usurpado el ritmo (disociación isorrítmica); la P se desliza lentamente alrededor del QRS y **toda P que pueda conducir aparece como latido de captura** (un QRS más precoz, con la misma morfología estrecha que los latidos de la unión). La diferencia con el bloqueo completo: allí la frecuencia auricular supera a la ventricular y ninguna P conduce; aquí la ventricular es ≥ que la auricular y la vía está intacta. La disociación AV es una descripción; el bloqueo completo, un diagnóstico: distínguelos antes de informar (ver r2).',
      ),
    },
    {
      kind: 'figure',
      figure: { id: 'decision-tree', params: { tree: 'brady-av-block' } },
      caption: l(
        '把本课装进决策树：心动过缓 → 有 P 波吗？→ P 与 QRS 的关系（比例、PR 行为）→ QRS 宽窄与逸搏形态 → 阻滞水平 → 处理。2:1 定不了型就走“线索”分支；完全性阻滞走“P 穿行全程”分支。',
        'Fit this lesson into the decision tree: bradycardia → are there P waves? → the P-QRS relationship (ratio, PR behaviour) → QRS width and escape shape → level of the block → management. A 2:1 you cannot type goes down the "clues" branch; complete block goes down the "P marching through everything" branch.',
        'Encaja esta lección en el árbol de decisión: bradicardia → ¿hay ondas P? → relación P-QRS (ratio, comportamiento del PR) → anchura del QRS y morfología del escape → nivel del bloqueo → manejo. Un 2:1 que no puedes clasificar baja por la rama de las «pistas»; el bloqueo completo, por la rama de «la P recorre todo el ciclo».',
      ),
    },
    {
      kind: 'contrast',
      title: l('文氏型 vs Mobitz II：五个问题分清', 'Wenckebach vs Mobitz II: five questions', 'Wenckebach frente a Mobitz II: cinco preguntas'),
      view: STRIP,
      left: {
        ecg: synth('av-block-2-mobitz1', 469),
        caption: l('PR 逐渐延长直至脱落；QRS 窄；阻滞在房室结', 'PR lengthens until a P drops; narrow QRS; block in the AV node', 'El PR se alarga hasta que cae una P; QRS estrecho; bloqueo en el nodo AV'),
        marks: [{ auto: 'pr' }],
      },
      right: {
        ecg: synth('av-block-2-mobitz2', 470),
        caption: l('PR 恒定、突然脱落；QRS 宽（右束支阻滞）；阻滞在希氏束下', 'Constant PR, sudden drop; wide QRS (RBBB); block below the His', 'PR constante, caída brusca; QRS ancho (bloqueo de rama derecha); bloqueo infrahisiano'),
        marks: [{ auto: 'pr' }],
      },
      point: l(
        '问五个问题。PR 行为：左图逐渐延长、间歇后第一个 PR 最短；右图纹丝不动。QRS：窄 vs 通常宽。水平：房室结 vs 希氏束下。运动反应：文氏型改善，Mobitz II 恶化。起搏：文氏型很少需要（仅症状性、难治性心动过缓），Mobitz II 排除可逆原因后不论症状均 I 类。**先看 PR 的行为，再写“Ⅱ型”**（复习 r3）。',
        'Ask five questions. PR behaviour: on the left it lengthens and the first PR after the pause is the shortest; on the right it never moves. QRS: narrow vs usually wide. Level: AV node vs infra-His. Response to exercise: Wenckebach improves, Mobitz II worsens. Pacing: Wenckebach rarely needs one (only symptomatic, refractory bradycardia), Mobitz II is Class I regardless of symptoms once reversible causes are gone. **Check the PR behaviour before you write "type II"** (revision of r3).',
        'Haz cinco preguntas. Comportamiento del PR: a la izquierda se alarga y el primer PR tras la pausa es el más corto; a la derecha no se mueve. QRS: estrecho frente a habitualmente ancho. Nivel: nodo AV frente a infrahisiano. Respuesta al ejercicio: el Wenckebach mejora, el Mobitz II empeora. Marcapasos: el Wenckebach rara vez lo necesita (solo bradicardia sintomática refractaria); el Mobitz II es clase I con o sin síntomas excluidas las causas reversibles. **Mira el comportamiento del PR antes de escribir «tipo II»** (repaso de r3).',
      ),
    },
    { kind: 'check', item: { family: 'av-block', seed: 4 } },
    { kind: 'check', item: { family: 'av-block', seed: 5 } },
    { kind: 'check', item: { family: 'av-block', seed: 13 } },
    { kind: 'check', item: { family: 'blocked-p', seed: 2 } },
    { kind: 'drill', families: ['av-block', 'blocked-p'], count: 10, passScore: 0.85 },
    {
      kind: 'real',
      ids: [19164, 4827, 16151],
      caption: l(
        '一份二度（89 岁女性，搏动成组）、两份三度（PTB-XL 真实病例：一份窄 QRS 逸搏，一份宽 QRS 慢逸搏）。先判定传导比例与 PR 行为、量 QRS 宽度与逸搏频率、给阻滞定位，**写下结论再揭晓**。',
        'One second-degree block (a woman of 89, grouped beating) and two complete blocks (real PTB-XL cases: one narrow escape, one slow wide escape). Decide the conduction ratio and PR behaviour, measure QRS width and escape rate, localise the block — **commit in writing before you reveal**.',
        'Un bloqueo de segundo grado (mujer de 89 años, latidos agrupados) y dos completos (casos reales de PTB-XL: uno con escape estrecho y otro con escape ancho y lento). Decide el ratio de conducción y el comportamiento del PR, mide la anchura del QRS y la frecuencia del escape y localiza el bloqueo: **escribe tu conclusión antes de mirar la solución**.',
      ),
    },
    {
      kind: 'pitfalls',
      items: [
        l(
          '只凭 2:1 段就写“Mobitz Ⅰ/Ⅱ”：2:1 本身不能分型——先看 QRS 宽度与 PR，再找他处有无文氏周期，仍不确定时行运动试验。',
          'Typing a 2:1 block from the 2:1 stretch alone: the ratio cannot be typed — check QRS width and PR first, look for Wenckebach periods elsewhere, and use exercise testing if still unsure.',
          'Clasificar un bloqueo 2:1 solo por el tramo con 2:1: ese ratio no permite clasificarlo: mira primero la anchura del QRS y el PR, busca periodos de Wenckebach en otra parte de la tira y, si persiste la duda, haz una prueba de esfuerzo.',
        ),
        l(
          'Mobitz II 在两次脱落之间“看起来很正常”：定义它的是那个突然脱落的 P，不是间期——PR 恒定 + 突然脱落就是 Ⅱ 型。',
          'Mobitz II looking innocent between drops: the sudden dropped P defines it, not the intervals — constant PR plus a cold drop IS type II.',
          'El Mobitz II parece inocente entre caídas: lo define la P bloqueada de golpe, no los intervalos: PR constante más caída brusca ES tipo II.',
        ),
        l(
          '没排除可逆原因就贴“传导系统疾病”的标签：药物、高钾、缺血、莱姆病、结节病……<60 岁不明原因的阻滞还要专门查浸润性/炎症性病因。',
          'Labelling "conduction disease" before excluding reversible causes: drugs, hyperkalaemia, ischaemia, Lyme, sarcoidosis… and in unexplained block under about 60, actively search for infiltrative or inflammatory disease.',
          'Etiquetar «enfermedad del sistema de conducción» antes de excluir causas reversibles: fármacos, hiperpotasemia, isquemia, Lyme, sarcoidosis… y en el bloqueo sin causa aparente en menores de unos 60 años, busca de forma activa enfermedad infiltrativa o inflamatoria.',
        ),
        l(
          '把逸搏的规则误读为“稳定”：规则的是逸搏起搏点，不是房室传导——完全性阻滞可以藏在一个平静规则的节律后面。',
          'Reading a regular escape as "stable": it is the escape pacemaker that is regular, not AV conduction — complete block can hide behind a calm, regular rhythm.',
          'Interpretar la regularidad del escape como «estabilidad»: lo regular es el marcapasos de escape, no la conducción AV: un bloqueo completo puede esconderse tras un ritmo tranquilo y regular.',
        ),
        l(
          '把房室分离当成完全性阻滞的同义词：分离只是描述——可来自逸搏、抢位或阻滞；只有房率 > 室率且无一 P 下传才是完全性阻滞。',
          'Treating AV dissociation as a synonym for complete block: dissociation is only a description — default, usurpation or block; complete block requires an atrial rate above the ventricular rate and not a single conducted P.',
          'Tratar la disociación AV como sinónimo de bloqueo completo: la disociación es solo una descripción (defecto, usurpación o bloqueo); el bloqueo completo exige frecuencia auricular mayor que la ventricular y ni una sola P conducida.',
        ),
      ],
    },
    {
      kind: 'summary',
      points: [
        l(
          'Mobitz II = PR 恒定 + 突然脱落 P：阻滞在希氏束下、QRS 通常宽；排除可逆原因后不论症状均 I 类起搏。',
          'Mobitz II = constant PR + a sudden dropped P: infra-His, usually wide QRS; Class I pacing regardless of symptoms once reversible causes are excluded.',
          'Mobitz II = PR constante + una P bloqueada de golpe: infrahisiano, habitualmente QRS ancho; marcapasos clase I con o sin síntomas excluidas las causas reversibles.',
        ),
        l(
          '2:1 不能单凭比例分型：窄 QRS/PR 长/他处文氏/运动后改善 → 结性；宽 QRS/PR 正常/运动后恶化 → 希氏束下。',
          'A 2:1 block cannot be typed from the ratio alone: narrow QRS/long PR/Wenckebach elsewhere/improves with exercise → nodal; wide QRS/normal PR/worsens → infra-His.',
          'Un bloqueo 2:1 no se clasifica solo por el ratio: QRS estrecho/PR largo/Wenckebach en otra parte/mejora con el ejercicio → nodo AV; QRS ancho/PR normal/empeora → infrahisiano.',
        ),
        l(
          '高度阻滞 = 连续 ≥2 个 P 未下传（3:1、4:1……）；比例按“P 波数 : QRS 数”书写。',
          'High-grade block = ≥2 consecutive blocked P waves (3:1, 4:1…); ratios are written as P waves : QRS complexes.',
          'Bloqueo avanzado = ≥2 ondas P consecutivas no conducidas (3:1, 4:1…); los ratios se escriben como ondas P : complejos QRS.',
        ),
        l(
          '三度阻滞靠“P 穿行所有时相、PR 随机、逸搏规则”证明；逸搏宽度定位：窄 40–60 → 结/希氏束，宽 20–40 → 希氏束下。',
          'Complete block is proven by P waves marching through all phases, a random PR and a regular escape; the escape width localises it: narrow 40-60 → node/His, wide 20-40 → infra-His.',
          'El bloqueo completo se demuestra con ondas P que recorren todas las fases, un PR aleatorio y un escape regular; la anchura del escape lo localiza: estrecho 40-60 → nodo/haz de His, ancho 20-40 → infrahisiano.',
        ),
        l(
          '房室分离 ≠ 完全性阻滞；房颤 + 慢而完全规则的室率 = 完全性阻滞伴逸搏（想想地高辛）。',
          'AV dissociation is not complete block; AF with a slow, perfectly regular ventricular rate IS complete block with an escape (think of digoxin).',
          'La disociación AV no es bloqueo completo; la FA con frecuencia ventricular lenta y perfectamente regular SÍ es bloqueo completo con escape (piensa en la digoxina).',
        ),
      ],
    },
  ],
  sources: [
    'Kusumoto FM et al. 2018 ACC/AHA/HRS Guideline on Bradycardia and Cardiac Conduction Delay. Circulation 2019;140:e382-e482',
    'Glikson M et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization therapy. Eur Heart J 2021;42:3427-3520',
    'Mason JW et al. AHA/ACCF/HRS Part II: Electrocardiography diagnostic statement list. Circulation 2007;115:1325-1332',
    'Castellano et al. 2004',
  ],
};

export default lesson;
