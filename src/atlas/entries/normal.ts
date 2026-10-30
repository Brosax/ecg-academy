/**
 * Atlas entries — category `normal`. Schema and authoring rules: src/atlas/schema.ts. Values: docs/curriculum/criteria.md.
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry } from '../schema';

export const entries: readonly AtlasEntry[] = [
  {
    id: 'normal-ecg',
    definition: l(
      '节律、心率、各间期、电轴及P-QRS-ST-T形态均在成人正常范围内（包括正常变异）的12导联心电图。',
      'A 12-lead ECG whose rhythm, rate, intervals, axis and P–QRS–ST–T morphology all lie within adult normal limits, normal variants included.',
      'ECG de 12 derivaciones cuyo ritmo, frecuencia, intervalos, eje y morfología P-QRS-ST-T están dentro de los límites normales del adulto, incluidas las variantes normales.',
    ),
    features: [
      l(
        '记录质量良好：标准定标（10 mm/mV，25 mm/s），无电极反接（P波在Ⅰ、Ⅱ导联直立，aVR导联倒置）。',
        'Good-quality recording: standard calibration (10 mm/mV, 25 mm/s) and no lead reversal (P upright in I and II, negative in aVR).',
        'Registro de buena calidad: calibración estándar (10 mm/mV, 25 mm/s) y sin inversión de electrodos (onda P positiva en I y II, negativa en aVR).',
      ),
      l(
        '窦性心律60–100次/分（50–100次/分亦可接受），每个P波后均有QRS波群，PR间期恒定于120–200 ms。',
        'Sinus rhythm at 60–100 bpm (50–100 acceptable); every P is followed by a QRS at a constant PR of 120–200 ms.',
        'Ritmo sinusal a 60–100 lpm (50–100 aceptable); cada onda P va seguida de un QRS con un PR constante de 120–200 ms.',
      ),
      l(
        'QRS窄（<110 ms），电轴−30°至+90°，R波自V1向V5逐渐增高，移行区在V3–V4。',
        'Narrow QRS (< 110 ms), axis between −30° and +90°, R wave growing from V1 to V5 with the transition at V3–V4.',
        'QRS estrecho (< 110 ms), eje entre −30° y +90° y onda R creciente de V1 a V5 con la transición en V3–V4.',
      ),
      l(
        'QTc男性<450 ms、女性<460 ms；ST段位于基线；T波与QRS主波同向（aVR倒置，Ⅲ和V1可变）。',
        'QTc below 450 ms (men) or 460 ms (women); ST at the baseline; T upright where the QRS is upright (inverted in aVR, variable in III and V1).',
        'QTc inferior a 450 ms (varones) o 460 ms (mujeres); ST en la línea de base; onda T positiva donde el QRS es positivo (negativa en aVR, variable en III y V1).',
      ),
    ],
    criteria: [
      {
        label: l('心率', 'Heart rate', 'Frecuencia cardiaca'),
        value: l('60–100次/分（指南正常范围50–100次/分）', '60–100 bpm (guideline normal range 50–100 bpm)', '60–100 lpm (rango normal de la guía: 50–100 lpm)'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS bradycardia guideline)',
      },
      {
        label: l('P波', 'P wave', 'Onda P'),
        value: l('时限<120 ms；Ⅱ导联振幅<2.5 mm；P电轴0°至+75°', 'Duration < 120 ms; amplitude < 2.5 mm in II; P axis 0° to +75°', 'Duración < 120 ms; amplitud < 2,5 mm en II; eje de la P de 0° a +75°'),
        source: 'Hancock 2009 (AHA/ACCF/HRS Part V)',
      },
      {
        label: l('PR间期', 'PR interval', 'Intervalo PR'),
        value: l('120–200 ms；>200 ms为一度房室传导阻滞', '120–200 ms; > 200 ms = first-degree AV block', '120–200 ms; > 200 ms = bloqueo AV de primer grado'),
        source: 'Kusumoto 2018 (ACC/AHA/HRS)',
      },
      {
        label: l('QRS时限', 'QRS duration', 'Duración del QRS'),
        value: l('<110 ms；110–119 ms为不完全性阻滞或室内传导延迟；≥120 ms为完全性束支传导阻滞', '< 110 ms; 110–119 ms = incomplete block or IVCD; ≥ 120 ms = complete bundle branch block', '< 110 ms; 110–119 ms = bloqueo incompleto o trastorno de la conducción intraventricular; ≥ 120 ms = bloqueo completo de rama'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
      {
        label: l('QTc', 'QTc', 'QTc'),
        value: l('男性<450 ms，女性<460 ms，且>390 ms', 'Men < 450 ms, women < 460 ms, and > 390 ms', 'Varones < 450 ms, mujeres < 460 ms, y > 390 ms'),
        source: 'Rautaharju 2009 (AHA/ACCF/HRS Part IV)',
      },
      {
        label: l('额面QRS电轴', 'Frontal QRS axis', 'Eje frontal del QRS'),
        value: l('−30°至+90°', '−30° to +90°', '−30° a +90°'),
        source: 'Surawicz 2009 (AHA/ACCF/HRS Part III)',
      },
    ],
    mechanism: l(
      '激动起源于窦房结，经心房传导、在房室结延搁后迅速经希氏束-浦肯野系统传布，因此P波、PR间期和窄QRS波群按固定顺序出现。复极由心外膜向心内膜进行，所以T波通常与QRS主波方向一致。',
      'Activation starts in the sinus node, crosses the atria, is delayed in the AV node and then spreads rapidly through the His–Purkinje system, so the P wave, the PR interval and a narrow QRS appear in a fixed order. Repolarization runs from epicardium to endocardium, which is why the T wave normally points the same way as the main QRS deflection.',
      'La activación nace en el nodo sinusal, recorre las aurículas, se retrasa en el nodo AV y se propaga rápidamente por el sistema His-Purkinje, de modo que la onda P, el intervalo PR y un QRS estrecho aparecen en un orden fijo. La repolarización avanza del epicardio al endocardio y por eso la onda T suele tener la misma polaridad que la deflexión principal del QRS.',
    ),
    mimics: [
      {
        id: 'early-repolarization',
        discriminator: l(
          '此处QRS干净地回到基线；早期复极在≥2个下壁或侧壁导联QRS终末出现≥0.1 mV的J点切迹或顿挫（仍属正常变异，但应写明）。',
          'Here the QRS ends cleanly at the baseline; in early repolarization a J-point notch or slur ≥ 0.1 mV appears in ≥ 2 inferior or lateral leads (still a normal variant, but worth naming).',
          'Aquí el QRS termina limpiamente en la línea de base; en la repolarización precoz aparece una muesca o empastamiento del punto J ≥ 0,1 mV en ≥ 2 derivaciones inferiores o laterales (sigue siendo una variante normal, pero conviene nombrarla).',
        ),
        leads: ['II', 'V4', 'V5'],
      },
      {
        id: 'juvenile-t',
        discriminator: l(
          '此处T波自V2起直立；幼年型T波在V1–V3倒置（16岁前正常，成人超过V2需进一步评估）。',
          'Here T is upright from V2 onwards; in the persistent juvenile pattern T is inverted in V1–V3 (normal before 16 years; beyond V2 in an adult it needs evaluation).',
          'Aquí la onda T es positiva desde V2; en el patrón juvenil persistente la T es negativa en V1–V3 (normal antes de los 16 años; más allá de V2 en un adulto requiere estudio).',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'long-qt',
        discriminator: l(
          '此处QTc在正常范围；长QT的心电图在测量并校正QT之前可能“看起来正常”（男性≥450 ms、女性≥460 ms即异常）。',
          'Here QTc is within limits; a long-QT tracing can look normal until the QT is measured and corrected (≥ 450 ms in men, ≥ 460 ms in women is abnormal).',
          'Aquí el QTc es normal; un QT largo puede parecer normal hasta que se mide y se corrige (≥ 450 ms en varones y ≥ 460 ms en mujeres es anormal).',
        ),
        leads: ['II', 'V5'],
      },
      {
        id: 'wpw',
        discriminator: l(
          '此处PR≥120 ms且QRS起始陡直；心室预激时PR<120 ms，QRS起始部有顿挫的δ波。',
          'Here PR ≥ 120 ms and the QRS starts sharply; in pre-excitation PR < 120 ms and a slurred delta wave starts the QRS.',
          'Aquí el PR es ≥ 120 ms y el QRS comienza de forma brusca; en la preexcitación el PR es < 120 ms y una onda delta empastada inicia el QRS.',
        ),
        leads: ['II', 'V4'],
      },
      {
        id: 'wellens',
        discriminator: l(
          '此处V2–V3的T波直立；Wellens图形为胸痛缓解后V2–V3 T波深而对称倒置或正负双向，提示LAD近段严重狭窄，看似“平静”。',
          'Here T is upright in V2–V3; in the Wellens pattern it is deeply and symmetrically inverted or biphasic in V2–V3 after the pain has settled — a critical LAD lesion that looks quiet.',
          'Aquí la onda T es positiva en V2–V3; en el patrón de Wellens es negativa, profunda y simétrica o bifásica en V2–V3 tras ceder el dolor: una lesión crítica de la DA que parece tranquila.',
        ),
        leads: ['V2', 'V3'],
      },
      {
        id: 'hyperacute-t',
        discriminator: l(
          '此处T波与QRS成比例；超急性期T波基底宽、饱满，相对QRS过大，出现在≥2个相邻导联，是冠脉闭塞的早期征象。',
          'Here T is proportionate to the QRS; hyperacute T waves are broad-based, bulky and large relative to the QRS in ≥ 2 contiguous leads — an early sign of coronary occlusion.',
          'Aquí la onda T es proporcionada al QRS; las ondas T hiperagudas son de base ancha, voluminosas y grandes en relación con el QRS en ≥ 2 derivaciones contiguas: un signo precoz de oclusión coronaria.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '未测量PR、QRS和QT就判为“正常”：一眼扫过会漏掉长QT、短PR伴δ波和一度房室传导阻滞。',
        'Calling “normal” without measuring PR, QRS and QT: a quick glance misses long QT, short PR with a delta wave and first-degree AV block.',
        'Informar «normal» sin medir PR, QRS y QT: un vistazo rápido pasa por alto un QT largo, un PR corto con onda delta o un bloqueo AV de primer grado.',
      ),
      l(
        '把正常变异（早期复极、V1–V2幼年型T波、不完全性右束支传导阻滞、窦性心律不齐、瘦高年轻人的高电压）误判为疾病。',
        'Over-calling normal variants (early repolarization, juvenile T in V1–V2, incomplete RBBB, sinus arrhythmia, tall voltages in thin young people) as disease.',
        'Considerar enfermedad lo que son variantes normales (repolarización precoz, T juvenil en V1–V2, bloqueo incompleto de rama derecha, arritmia sinusal, voltajes altos en jóvenes delgados).',
      ),
      l(
        '正常心电图不能排除心脏病：超过三分之一的非ST段抬高型急性冠脉综合征心电图正常，左心室肥厚、肺栓塞和心肌病也常无明显改变。',
        'A normal ECG does not exclude heart disease: more than a third of NSTE-ACS have a normal ECG, and LVH, pulmonary embolism and cardiomyopathy are often missed by it.',
        'Un ECG normal no descarta cardiopatía: más de un tercio de los SCASEST tienen un ECG normal, y la HVI, el tromboembolismo pulmonar o las miocardiopatías a menudo no se ven en él.',
      ),
    ],
    lessons: ['s1', 's2', 's3', 's4', 's5', 's7'],
    sources: [REF.kligfield2007, REF.mason2007, REF.surawicz2009, REF.rautaharju2009, REF.hancock2009, REF.kusumoto2018, REF.escAcs2023],
    aka: ['NORM', 'normal', 'ECG normal', '正常'],
    exemplar: { scenarios: ['normal'], layout: '3x4+1' },
  },
];
