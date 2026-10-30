/**
 * Atlas entries — category `technical` (cable reversal, electrode misplacement, artefacts). Schema and authoring rules:
 * src/atlas/schema.ts. Values: docs/curriculum/criteria.md (arm-cable-reversal, precordial-positions,
 * bipolar-limb-leads, einthoven-law) and critic.json (lead reversal beyond RA/LA; artefacts and the recording chain).
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry, UrgencySpec } from '../schema';

const REPEAT: UrgencySpec = {
  level: 'urgent',
  next: l(
    '解读前按正确的导线位置重新记录心电图；不要把这份记录当作真实图形与旧图比较。',
    'Repeat the ECG with the cables on the correct limbs before interpreting it, and do not compare this recording with old tracings as if it were real.',
    'Repite el ECG con los cables en los miembros correctos antes de interpretarlo, y no compares este registro con trazados antiguos como si fuera real.',
  ),
};

export const entries: readonly AtlasEntry[] = [
  // ── LA/RA reversal ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'electrode-reversal-la-ra',
    definition: l(
      '左右上肢导线互换：Ⅰ导联倒置，其余肢体导联互换，胸导联不变。',
      'Left- and right-arm cables swapped: lead I is mirrored and the other limb leads are exchanged, while the chest leads are unchanged.',
      'Cables de los brazos intercambiados: la derivación I se invierte y las demás derivaciones de los miembros se intercambian, mientras que las precordiales no cambian.',
    ),
    features: [
      l('Ⅰ导联完全倒置：P波、QRS和T波均为负向。', 'Lead I fully inverted: negative P, QRS and T.', 'Derivación I totalmente invertida: P, QRS y T negativos.'),
      l('aVR像正常的aVL（P波和QRS直立）：aVR与aVL互换。', 'aVR looks like a normal aVL (upright P and QRS): aVR and aVL are swapped.', 'aVR parece una aVL normal (P y QRS positivos): aVR y aVL están intercambiadas.'),
      l('Ⅱ与Ⅲ互换；aVF不变。', 'II and III are swapped; aVF is unchanged.', 'II y III están intercambiadas; aVF no cambia.'),
      l(
        '胸导联正常、R波递增正常——与右位心不同。',
        'The chest leads look normal, with normal R-wave progression — unlike dextrocardia.',
        'Las precordiales son normales, con progresión normal de la R, a diferencia de la dextrocardia.',
      ),
    ],
    criteria: [
      {
        label: l('特征', 'Signature', 'Firma'),
        value: l('Ⅰ倒置；Ⅱ↔Ⅲ；aVR↔aVL；aVF及V1–V6不变', 'I inverted; II ↔ III; aVR ↔ aVL; aVF and V1–V6 unchanged', 'I invertida; II ↔ III; aVR ↔ aVL; aVF y V1–V6 sin cambios'),
        source: 'Batchvarov 2007',
      },
      {
        label: l('关键线索', 'Key clue', 'Pista clave'),
        value: l('窦性心律时Ⅰ导联P波倒置而aVR导联P波直立', 'Negative P in I with an upright P in aVR during sinus rhythm', 'P negativa en I con P positiva en aVR en ritmo sinusal'),
        source: 'Batchvarov 2007; Kligfield 2007',
      },
    ],
    mechanism: l(
      'Ⅰ导联是左上肢电位减去右上肢电位，交换两根导线只会使其符号反转。其余肢体导联由同样三个电极组合而成，因而相应互换；胸导联以三个电极的平均电位为参考，不受影响。',
      'Lead I is the left-arm potential minus the right-arm potential, so swapping the two cables simply flips its sign. The other limb leads are combinations of the same three electrodes and are re-labelled accordingly, whereas the chest leads, referenced to the average of all three, do not change.',
      'La derivación I es el potencial del brazo izquierdo menos el del derecho, así que intercambiar ambos cables solo cambia su signo. Las demás derivaciones de los miembros son combinaciones de los mismos tres electrodos y se reasignan en consecuencia, mientras que las precordiales, referidas a la media de los tres, no cambian.',
    ),
    mimics: [
      {
        id: 'dextrocardia',
        discriminator: l(
          '右位心时Ⅰ导联也倒置，但R波自V1至V6递减；上肢反接时胸导联递增正常。',
          'In dextrocardia lead I is inverted too, but the R wave shrinks from V1 to V6; with arm reversal the chest leads progress normally.',
          'En la dextrocardia la derivación I también está invertida, pero la R disminuye de V1 a V6; con la inversión de los brazos las precordiales progresan con normalidad.',
        ),
        leads: ['I', 'V1', 'V6'],
      },
      {
        id: 'rad',
        discriminator: l('真正的电轴右偏Ⅰ导联P波仍直立。', 'True right axis deviation keeps an upright P wave in lead I.', 'La desviación real del eje a la derecha mantiene la P positiva en I.'),
        leads: ['I'],
      },
      {
        id: 'extreme-axis',
        discriminator: l(
          'Ⅰ导联P波倒置时出现的“无人区”电轴，在证实之前视为电极反接。',
          'An apparent northwest axis with a negative P in lead I is reversal until proven otherwise.',
          'Un eje aparente en «tierra de nadie» con P negativa en I es una inversión de electrodos mientras no se demuestre lo contrario.',
        ),
        leads: ['I', 'aVF'],
      },
      {
        id: 'old-mi-lateral',
        discriminator: l(
          'Ⅰ导联倒置伴Q波可像高侧壁梗死；Ⅰ导联P波倒置和aVR直立揭示电极反接。',
          'An inverted lead I with Q waves can look like a high lateral infarct; the negative P in I and the upright aVR give the reversal away.',
          'Una derivación I invertida con ondas Q puede parecer un infarto lateral alto; la P negativa en I y la aVR positiva delatan la inversión.',
        ),
        leads: ['I', 'aVL', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '未检查Ⅰ导联P波就解读电轴、“侧壁梗死”或“右位心”。',
        'Interpreting the axis, a “lateral infarct” or “dextrocardia” before checking the P wave in lead I.',
        'Interpretar el eje, un «infarto lateral» o una «dextrocardia» sin comprobar antes la onda P en I.',
      ),
      l('在脑中“纠正”导联标签而不重做心电图。', 'Correcting the labels in your head instead of repeating the recording.', 'Corregir mentalmente las etiquetas en lugar de repetir el registro.'),
    ],
    urgency: REPEAT,
    lessons: ['o9', 'f5'],
    sources: [REF.batchvarov2007, REF.kligfield2007, REF.scst2017],
    aka: ['LA/RA reversal', 'arm lead reversal', 'inversión de los brazos', '左右手反接', '上肢电极反接'],
    exemplar: {
      scenarios: ['electrode-reversal-la-ra'],
      leads: ['I', 'aVR', 'aVL'],
      fallback: {
        scenario: 'normal',
        recording: { placement: { limbs: { RA: 'LA', LA: 'RA' } } },
        label: l('正常心脏，左右上肢导线互换', 'Normal heart, LA and RA cables swapped', 'Corazón normal, cables LA y RA intercambiados'),
      },
    },
  },

  // ── LA/LL reversal ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'electrode-reversal-la-ll',
    definition: l(
      '左上肢与左下肢导线互换：Ⅰ与Ⅱ互换、Ⅲ倒置、aVL与aVF互换——一种隐匿的反接，可制造或掩盖“下壁梗死”。',
      'Left-arm and left-leg cables swapped: leads I and II exchange, III is inverted and aVL and aVF exchange — a subtle reversal that can create or hide an “inferior infarct”.',
      'Cables del brazo izquierdo y de la pierna izquierda intercambiados: I y II se intercambian, III se invierte y aVL y aVF se intercambian; una inversión sutil que puede crear u ocultar un «infarto inferior».',
    ),
    features: [
      l(
        'Ⅰ导联像Ⅱ导联、Ⅱ导联像Ⅰ导联；Ⅰ导联P波高于Ⅱ导联（正常时相反）。',
        'Lead I looks like lead II and vice versa; the P wave is taller in I than in II (normally the reverse).',
        'La derivación I parece la II y viceversa; la P es más alta en I que en II (lo normal es lo contrario).',
      ),
      l('Ⅲ导联倒置（P、QRS、T）。', 'Lead III is inverted (P, QRS and T).', 'La derivación III está invertida (P, QRS y T).'),
      l('aVL与aVF互换；aVR不变，胸导联正常。', 'aVL and aVF are swapped; aVR is unchanged and the chest leads are normal.', 'aVL y aVF están intercambiadas; aVR no cambia y las precordiales son normales.'),
      l(
        '与既往心电图比较：下壁Q波突然出现或消失时应怀疑。',
        'Compare with a previous ECG: an inferior Q wave that suddenly appears or disappears is suspicious.',
        'Compara con un ECG previo: una onda Q inferior que aparece o desaparece de repente es sospechosa.',
      ),
    ],
    criteria: [
      {
        label: l('特征', 'Signature', 'Firma'),
        value: l('Ⅰ↔Ⅱ；Ⅲ倒置；aVL↔aVF；aVR及V1–V6不变', 'I ↔ II; III inverted; aVL ↔ aVF; aVR and V1–V6 unchanged', 'I ↔ II; III invertida; aVL ↔ aVF; aVR y V1–V6 sin cambios'),
        source: 'Batchvarov 2007',
      },
      {
        label: l('线索', 'Clue', 'Pista'),
        value: l('Ⅰ导联P波大于Ⅱ导联；Ⅲ导联P波倒置', 'P in I larger than P in II; inverted P in III', 'P en I mayor que en II; P invertida en III'),
        source: 'Batchvarov 2007',
      },
    ],
    mechanism: l(
      '左上肢与左下肢互换，相当于交换Ⅰ、Ⅱ导联各自与右上肢配对的电极。两者之差Ⅲ导联因此反转，指向这两个肢体的加压导联也互换位置。',
      'Swapping the left arm with the left leg exchanges the two electrodes that leads I and II each pair with the right arm. Lead III, the difference between them, changes sign, and the augmented leads that look at those two limbs swap places.',
      'Intercambiar el brazo izquierdo con la pierna izquierda cambia los dos electrodos que las derivaciones I y II emparejan, cada una, con el brazo derecho. La derivación III, diferencia entre ambos, cambia de signo, y las derivaciones aumentadas que miran a esos dos miembros se intercambian.',
    ),
    mimics: [
      {
        id: 'old-mi-inferior',
        discriminator: l(
          'Ⅲ导联倒置可制造或消除下壁Q波；Ⅰ/Ⅱ导联P波大小颠倒且胸导联正常提示反接。',
          'An inverted III can create or remove an apparent inferior Q wave; the swapped P-wave sizes in I and II with normal chest leads point to reversal.',
          'Una III invertida puede crear o hacer desaparecer una onda Q inferior aparente; el tamaño invertido de la P en I y II con precordiales normales orienta a inversión.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
      {
        id: 'lad',
        discriminator: l(
          '两份心电图之间计算电轴改变而无其他变化，提示导线错误。',
          'A change in the computed axis between two ECGs without any other change suggests a cable error.',
          'Un cambio del eje calculado entre dos ECG sin ningún otro cambio sugiere un error de cables.',
        ),
        leads: ['I', 'II', 'aVF'],
      },
      {
        id: 'electrode-reversal-ra-ll',
        discriminator: l('右上肢/左下肢反接时倒置的是Ⅱ导联（而非Ⅲ），aVR与aVF互换。', 'In RA/LL reversal lead II (not III) is inverted and aVR and aVF swap.', 'En la inversión brazo derecho/pierna izquierda se invierte II (no III) y se intercambian aVR y aVF.'),
        leads: ['II', 'III', 'aVR'],
      },
    ],
    pitfalls: [
      l(
        '漏诊：这种反接看起来几乎正常——比较Ⅰ和Ⅱ导联的P波大小。',
        'Missing it: this reversal can look almost normal — compare the P-wave sizes in I and II.',
        'No detectarla: esta inversión puede parecer casi normal; compara el tamaño de la P en I y II.',
      ),
      l('不重做心电图就报告新出现或消失的下壁梗死。', 'Reporting a new or vanished inferior infarct without repeating the ECG.', 'Informar un infarto inferior nuevo o desaparecido sin repetir el ECG.'),
    ],
    urgency: REPEAT,
    lessons: ['o9', 'f5'],
    sources: [REF.batchvarov2007, REF.kligfield2007],
    aka: ['LA/LL reversal', 'inversión brazo izquierdo pierna izquierda', '左上肢左下肢反接'],
    exemplar: {
      scenarios: ['electrode-reversal-la-ll'],
      leads: ['I', 'II', 'III'],
      fallback: {
        scenario: 'normal',
        recording: { placement: { limbs: { LA: 'LL', LL: 'LA' } } },
        label: l('正常心脏，左上肢与左下肢导线互换', 'Normal heart, LA and LL cables swapped', 'Corazón normal, cables LA y LL intercambiados'),
      },
    },
  },

  // ── RA/LL reversal ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'electrode-reversal-ra-ll',
    definition: l(
      '右上肢与左下肢导线互换：Ⅱ导联倒置，Ⅰ与Ⅲ倒置后互换，aVR与aVF互换。',
      'Right-arm and left-leg cables swapped: lead II is inverted, I and III are inverted and exchanged, and aVR and aVF swap.',
      'Cables del brazo derecho y de la pierna izquierda intercambiados: II se invierte, I y III se invierten e intercambian, y aVR y aVF se intercambian.',
    ),
    features: [
      l('Ⅱ导联完全倒置（P、QRS、T均负向）。', 'Lead II fully inverted (negative P, QRS and T).', 'Derivación II totalmente invertida (P, QRS y T negativos).'),
      l('Ⅰ导联呈倒置的Ⅲ导联，反之亦然。', 'Lead I shows an inverted lead III and vice versa.', 'La derivación I muestra una III invertida y viceversa.'),
      l(
        'aVR与aVF互换：aVF像正常的aVR（全负向），aVR变为直立；aVL不变。',
        'aVR and aVF swap: aVF looks like a normal aVR (all negative) and aVR turns upright; aVL is unchanged.',
        'aVR y aVF se intercambian: aVF parece una aVR normal (todo negativo) y aVR se vuelve positiva; aVL no cambia.',
      ),
      l('胸导联正常。', 'The chest leads are normal.', 'Las precordiales son normales.'),
    ],
    criteria: [
      {
        label: l('特征', 'Signature', 'Firma'),
        value: l('Ⅱ倒置；Ⅰ = −Ⅲ，Ⅲ = −Ⅰ；aVR↔aVF；aVL及V1–V6不变', 'II inverted; I = −III and III = −I; aVR ↔ aVF; aVL and V1–V6 unchanged', 'II invertida; I = −III y III = −I; aVR ↔ aVF; aVL y V1–V6 sin cambios'),
        source: 'Batchvarov 2007',
      },
      {
        label: l('线索', 'Clue', 'Pista'),
        value: l('窦性心律时Ⅱ、aVF导联P波倒置而aVR导联P波直立', 'Negative P in II and aVF with an upright P in aVR during sinus rhythm', 'P negativa en II y aVF con P positiva en aVR en ritmo sinusal'),
        source: 'Batchvarov 2007',
      },
    ],
    mechanism: l(
      'Ⅱ导联测量左下肢相对右上肢的电位，交换这两个电极即使其符号反转。Ⅰ和Ⅲ导联各自失去一个正确电极而变成对方的倒置形式，指向这两个肢体的加压导联互换位置。',
      'Lead II measures the left leg against the right arm, so exchanging those two electrodes reverses its sign. Leads I and III each lose one correct electrode and take the inverted form of the other, and the augmented leads facing the two swapped limbs change places.',
      'La derivación II mide la pierna izquierda frente al brazo derecho, así que intercambiar esos dos electrodos invierte su signo. Las derivaciones I y III pierden cada una un electrodo correcto y adoptan la forma invertida de la otra, y las aumentadas que miran a esos dos miembros se intercambian.',
    ),
    mimics: [
      {
        id: 'ectopic-atrial-rhythm',
        discriminator: l(
          '低位心房起搏点只使Ⅱ、Ⅲ、aVF的P波倒置，QRS和T不变；右上肢/左下肢反接时Ⅱ导联P、QRS、T全部倒置且aVR直立。',
          'A low atrial focus inverts the P in II, III and aVF but leaves QRS and T as before; with RA/LL reversal P, QRS and T are all inverted in II and aVR turns upright.',
          'Un foco auricular bajo invierte la P en II, III y aVF pero deja QRS y T como estaban; con la inversión brazo derecho/pierna izquierda P, QRS y T se invierten en II y aVR se vuelve positiva.',
        ),
        leads: ['II', 'aVF', 'aVR'],
      },
      {
        id: 'old-mi-inferior',
        discriminator: l(
          '倒置的下壁波群可像下壁Q波和T波倒置；直立的aVR揭示反接。',
          'Inverted inferior complexes can mimic inferior Q waves and T inversion; the upright aVR gives the reversal away.',
          'Los complejos inferiores invertidos pueden simular ondas Q e inversión de la T inferiores; la aVR positiva delata la inversión.',
        ),
        leads: ['II', 'aVF', 'aVR'],
      },
      {
        id: 'extreme-axis',
        discriminator: l(
          'aVR导联P波直立时的“上方”电轴，在证实之前视为电极反接。',
          'An apparent superior axis with an upright P in aVR is reversal until proven otherwise.',
          'Un eje aparentemente superior con P positiva en aVR es una inversión de electrodos mientras no se demuestre lo contrario.',
        ),
        leads: ['I', 'aVF', 'aVR'],
      },
    ],
    pitfalls: [
      l('在aVR导联P波直立的心电图上诊断下壁梗死或低位房性心律。', 'Diagnosing an inferior infarct or a low atrial rhythm on an ECG with an upright P in aVR.', 'Diagnosticar un infarto inferior o un ritmo auricular bajo en un ECG con P positiva en aVR.'),
      l('不重做心电图。', 'Not repeating the ECG.', 'No repetir el ECG.'),
    ],
    urgency: REPEAT,
    lessons: ['o9', 'f5'],
    sources: [REF.batchvarov2007, REF.kligfield2007],
    aka: ['RA/LL reversal', 'inversión brazo derecho pierna izquierda', '右上肢左下肢反接'],
    exemplar: {
      scenarios: ['electrode-reversal-ra-ll'],
      leads: ['II', 'aVR', 'aVF'],
      fallback: {
        scenario: 'normal',
        recording: { placement: { limbs: { RA: 'LL', LL: 'RA' } } },
        label: l('正常心脏，右上肢与左下肢导线互换', 'Normal heart, RA and LL cables swapped', 'Corazón normal, cables RA y LL intercambiados'),
      },
    },
  },

  // ── precordial misplacement ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'precordial-misplacement',
    definition: l(
      '胸导联电极放错肋间或导线互换，扭曲R波递增，可类似梗死、Brugada图形或心房异常。',
      'Chest electrodes in the wrong interspace or with swapped cables, which distorts R-wave progression and can mimic infarction, a Brugada pattern or atrial abnormality.',
      'Electrodos precordiales en el espacio intercostal equivocado o con cables intercambiados, lo que distorsiona la progresión de la R y puede simular un infarto, un patrón de Brugada o una anomalía auricular.',
    ),
    features: [
      l(
        '导线互换：R波递增忽高忽低（如V2的R > V3 < V4），而心搏形态其余相同。',
        'Swapped cables: R-wave progression jumps up and down (e.g. R in V2 > V3 < V4) while the beats are otherwise identical.',
        'Cables intercambiados: la progresión de la R sube y baja (p. ej., R en V2 > V3 < V4) mientras los latidos son por lo demás idénticos.',
      ),
      l(
        'V1–V2放在第2–3肋间（过高）：V1呈rSr′，V1–V2 P波负向、T波倒置，R波变小——假性间隔梗死或假性Brugada。',
        'V1–V2 placed too high (2nd–3rd interspace): rSr′ in V1, negative P and inverted T in V1–V2, smaller R — a pseudo-septal infarct or pseudo-Brugada.',
        'V1–V2 demasiado altos (2.º–3.er espacio intercostal): rSr′ en V1, P negativa y T negativa en V1–V2, R más pequeña: seudoinfarto septal o seudo-Brugada.',
      ),
      l('V4–V6过低或过高会改变振幅和移行区。', 'V4–V6 placed too low or too high change amplitudes and the transition.', 'V4–V6 colocados demasiado bajos o altos cambian las amplitudes y la transición.'),
      l(
        '核对位置：V1/V2在胸骨两侧第4肋间，V4在第5肋间锁骨中线，V5–V6与V4在同一水平。',
        'Re-check placement: V1/V2 in the 4th interspace beside the sternum, V4 in the 5th interspace at the midclavicular line, V5–V6 on the same horizontal level as V4.',
        'Revisa la colocación: V1/V2 en el 4.º espacio intercostal junto al esternón, V4 en el 5.º en la línea medioclavicular, V5–V6 en el mismo plano horizontal que V4.',
      ),
    ],
    criteria: [
      {
        label: l('标准位置', 'Standard positions', 'Posiciones estándar'),
        value: l(
          'V1胸骨右缘第4肋间；V2胸骨左缘第4肋间；V3在两者中点；V4第5肋间锁骨中线；V5腋前线、V6腋中线，与V4同一水平',
          'V1 4th ICS right sternal border; V2 4th ICS left; V3 midway; V4 5th ICS midclavicular; V5 anterior axillary and V6 midaxillary at the V4 level',
          'V1 4.º EIC borde esternal derecho; V2 4.º EIC izquierdo; V3 en medio; V4 5.º EIC línea medioclavicular; V5 axilar anterior y V6 axilar media al nivel de V4',
        ),
        source: 'Kligfield 2007 (AHA Part I); SCST 2017',
      },
      {
        label: l('V1–V2过高的特征', 'High V1–V2 signature', 'Firma de V1–V2 altos'),
        value: l('V1–V2呈rSr′、P波终末负向、T波倒置', 'rSr′, terminal negative P and T inversion in V1–V2', 'rSr′, P terminal negativa y T negativa en V1–V2'),
        source: 'Kligfield 2007; SCST 2017',
      },
      {
        label: l('导线互换的特征', 'Swap signature', 'Firma del intercambio'),
        value: l('R波递增不单调，而其余波形相同', 'Non-monotonic R progression with otherwise identical complexes', 'Progresión de la R no monótona con complejos por lo demás idénticos'),
        source: 'Batchvarov 2007',
      },
    ],
    mechanism: l(
      '每个胸导联记录其所在部位相对于Wilson中心电端的电位，电极移位就改变了它所“看到”的内容：位置偏高时自上俯视心脏，记录到更多负向、类似右心房和流出道的电位。两根导线互换则整条波形互换，破坏R波逐渐增高的规律。',
      "Each chest lead records the potential at its own site relative to Wilson's central terminal, so moving an electrode changes what it sees: higher sites look down on the heart and record more negative, right-atrial and outflow-tract-like potentials. Swapping two cables exchanges two whole tracings, which breaks the smooth growth of the R wave.",
      'Cada derivación precordial registra el potencial de su propio punto respecto al terminal central de Wilson, así que mover un electrodo cambia lo que ve: los puntos más altos miran el corazón desde arriba y registran potenciales más negativos, parecidos a los de la aurícula derecha y el tracto de salida. Intercambiar dos cables intercambia dos trazados completos, lo que rompe el crecimiento gradual de la onda R.',
    ),
    mimics: [
      {
        id: 'brugada-type2',
        discriminator: l(
          '正常心脏V1–V2放高时出现的rSr′其r′窄且无≥2 mm的ST段抬高，放回第4肋间即恢复正常；真正的Brugada图形在高位导联上更明显。',
          'In a normal heart the rSr′ of high V1–V2 has a narrow r′ without ST elevation ≥ 2 mm and disappears at the 4th interspace; a true Brugada pattern becomes more obvious in the high leads.',
          'En un corazón normal la rSr′ de V1–V2 altos tiene una r′ estrecha sin elevación del ST ≥ 2 mm y desaparece en el 4.º espacio; un Brugada real se hace más evidente en las derivaciones altas.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'irbbb',
        discriminator: l(
          '不完全性右束支阻滞在V1正确放于第4肋间时仍保留rSr′，且Ⅰ、V6有终末顿挫S波。',
          'Incomplete RBBB keeps its rSr′ with V1 correctly in the 4th interspace and shows a terminal slurred S in I and V6.',
          'El bloqueo incompleto de rama derecha mantiene su rSr′ con V1 bien colocado en el 4.º espacio y muestra una S terminal empastada en I y V6.',
        ),
        leads: ['V1', 'I', 'V6'],
      },
      {
        id: 'old-mi-anterior',
        discriminator: l(
          '电极过高或错位造成的V1–V3低R或QS，按正确位置重做后恢复；陈旧性梗死不会恢复。',
          'Low R or QS in V1–V3 from high or misplaced electrodes recovers on a repeat with correct placement; an old infarct does not.',
          'La R baja o QS en V1–V3 por electrodos altos o mal colocados se normaliza al repetir con la colocación correcta; un infarto antiguo, no.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
      {
        id: 'lae',
        discriminator: l('V1过高可产生P波终末负向，但Ⅱ导联P波不宽。', 'A high V1 gives a negative terminal P without a broad P in II.', 'Un V1 alto da una P terminal negativa sin P ancha en II.'),
        leads: ['V1', 'II'],
      },
    ],
    pitfalls: [
      l(
        '不核对电极高度就根据V1–V2诊断间隔梗死、Brugada图形或左心房异常。',
        'Diagnosing a septal infarct, a Brugada pattern or left atrial abnormality from V1–V2 without checking electrode height.',
        'Diagnosticar un infarto septal, un patrón de Brugada o una anomalía auricular izquierda a partir de V1–V2 sin comprobar la altura de los electrodos.',
      ),
      l(
        '沿第5肋间向外上方放置V4–V6，而不是放在V4的水平线上。',
        'Placing V4–V6 along the 5th interspace as it curves upward instead of on the horizontal level of V4.',
        'Colocar V4–V6 siguiendo el 5.º espacio intercostal, que asciende lateralmente, en lugar de en el plano horizontal de V4.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '下结论前按标准位置重新放置电极（从胸骨角起数肋间）并重做心电图。',
        'Repeat the ECG with the electrodes at the standard positions (count interspaces from the sternal angle) before drawing conclusions.',
        'Repite el ECG con los electrodos en las posiciones estándar (cuenta los espacios desde el ángulo esternal) antes de sacar conclusiones.',
      ),
    },
    lessons: ['f5', 'o9'],
    sources: [REF.kligfield2007, REF.scst2017, REF.batchvarov2007],
    aka: ['misplaced chest leads', 'high V1', 'colocación incorrecta de precordiales', '胸导联位置错误'],
    exemplar: {
      scenarios: ['precordial-misplacement'],
      leads: ['V1', 'V2', 'V3'],
      fallback: {
        scenario: 'normal',
        recording: { placement: { chest: { V2: 'V3', V3: 'V2' } } },
        label: l('正常心脏，V2与V3导线互换', 'Normal heart, V2 and V3 cables swapped', 'Corazón normal, cables V2 y V3 intercambiados'),
      },
    },
  },

  // ── baseline wander ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'baseline-wander',
    definition: l(
      '基线缓慢上下漂移，多由呼吸、体动或电极接触不良引起，可造成假性ST改变。',
      'Slow up-and-down drift of the baseline, usually from breathing, movement or poor electrode contact, that can fake ST changes.',
      'Deriva lenta de la línea de base hacia arriba y abajo, habitualmente por la respiración, el movimiento o un mal contacto del electrodo, que puede simular cambios del ST.',
    ),
    features: [
      l('整条描记包括PR段和TP段在一个或数个心搏内缓慢升降。', 'The whole tracing, PR and TP segments included, rises and falls slowly over one or several beats.', 'Todo el trazado, incluidos los segmentos PR y TP, sube y baja lentamente a lo largo de uno o varios latidos.'),
      l('常随呼吸（每3–5秒一个周期）或体动变化。', 'Often follows breathing (a cycle every 3–5 s) or body movement.', 'A menudo sigue la respiración (un ciclo cada 3–5 s) o los movimientos.'),
      l('以同一心搏的PR段为基准测量ST，绝不以纸面网格线为基准。', 'Measure the ST against the PR segment of the same beat, never against the grid line.', 'Mide el ST respecto al segmento PR del mismo latido, nunca respecto a la línea de la cuadrícula.'),
      l(
        '从源头解决（皮肤准备、平静呼吸）；监护模式0.5 Hz滤波可去除漂移但会扭曲ST段。',
        'Fix it at the source (skin preparation, quiet breathing); a monitor-mode 0.5 Hz filter removes wander but distorts the ST.',
        'Corrígela en el origen (preparación de la piel, respiración tranquila); el filtro de 0,5 Hz del modo monitor elimina la deriva pero distorsiona el ST.',
      ),
    ],
    criteria: [
      {
        label: l('诊断带宽', 'Diagnostic bandwidth', 'Ancho de banda diagnóstico'),
        value: l('高通≤0.05 Hz（线性相位滤波可用0.67 Hz）；成人低通≥150 Hz', 'High-pass ≤ 0.05 Hz (or 0.67 Hz with a linear-phase filter); low-pass ≥ 150 Hz in adults', 'Paso alto ≤ 0,05 Hz (o 0,67 Hz con filtro de fase lineal); paso bajo ≥ 150 Hz en adultos'),
        source: 'Kligfield 2007 (AHA/ACCF/HRS Part I)',
      },
      {
        label: l('漂移频率', 'Wander frequency', 'Frecuencia de la deriva'),
        value: l('低于约1 Hz（呼吸约0.2–0.5 Hz）', 'Below about 1 Hz (breathing about 0.2–0.5 Hz)', 'Por debajo de 1 Hz aproximadamente (respiración, unos 0,2–0,5 Hz)'),
        source: 'Kligfield 2007 (filter section)',
      },
    ],
    mechanism: l(
      '呼吸、体动和皮肤-电极接触变化产生远大于心电信号自身低频成分的缓慢电压漂移。去除漂移的滤波器也会去掉部分缓慢的ST信号，所以诊断模式把高通截止频率设得很低。',
      "Breathing, movement and changes in skin–electrode contact create slow voltage drifts much larger than the ECG's own low-frequency content. Filters that remove them also remove part of the slow ST signal, which is why the diagnostic setting keeps the high-pass corner very low.",
      'La respiración, el movimiento y los cambios del contacto piel-electrodo generan derivas lentas de voltaje mucho mayores que el contenido de baja frecuencia del propio ECG. Los filtros que las eliminan también eliminan parte de la señal lenta del ST, por eso el modo diagnóstico mantiene muy baja la frecuencia de corte del paso alto.',
    ),
    mimics: [
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '漂移使PR段、TP段与ST段一起移动，以本搏PR段为基准测得的ST不变；真正的ST段压低在PR段平稳时逐搏持续存在。',
          'Wander moves the PR and TP segments together with the ST, so the ST measured against its own PR is unchanged; true ST depression persists beat after beat against a level PR.',
          'La deriva mueve los segmentos PR y TP junto con el ST, así que el ST medido respecto a su propio PR no cambia; un descenso real del ST persiste latido a latido frente a un PR estable.',
        ),
        leads: ['V5', 'V6'],
      },
      {
        id: 'electrical-alternans',
        discriminator: l(
          '呼吸性漂移在数个心搏内逐渐改变位置；电交替严格逐搏交替。',
          'Respiratory wander shifts position gradually over several beats; alternans flips strictly every other beat.',
          'La deriva respiratoria cambia de posición gradualmente a lo largo de varios latidos; la alternancia cambia estrictamente cada dos latidos.',
        ),
        leads: ['II'],
      },
      {
        id: 'stemi-inferior',
        discriminator: l(
          '随呼吸时有时无、且PR段同时移动的“ST段抬高”是基线漂移。',
          'An apparent ST elevation that comes and goes with breathing and moves the PR segment too is wander.',
          'Una aparente elevación del ST que va y viene con la respiración y mueve también el PR es deriva de la línea de base.',
        ),
        leads: ['II', 'III', 'aVF'],
      },
    ],
    pitfalls: [
      l('以网格线而不是同一心搏的PR段为基准测ST。', 'Measuring ST against the grid instead of the PR segment of the same beat.', 'Medir el ST respecto a la cuadrícula en lugar del PR del mismo latido.'),
      l('用监护滤波消除漂移后再从滤波后的图形读ST偏移。', 'Removing wander with the monitor filter and then reading ST deviation from the filtered tracing.', 'Eliminar la deriva con el filtro de monitor y luego leer el desplazamiento del ST en el trazado filtrado.'),
    ],
    lessons: ['f4', 'f6', 'o10'],
    sources: [REF.kligfield2007, REF.scst2017],
    aka: ['baseline drift', 'wander', 'oscilación de la línea de base', 'deriva de la línea de base', '基线漂移'],
    exemplar: { scenarios: ['baseline-wander'] },
  },

  // ── muscle tremor ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'muscle-tremor',
    definition: l(
      '骨骼肌产生的不规则高频干扰（帕金森震颤为4–7 Hz节律性振荡），出现在使用活动肢体电极的导联中。',
      'Irregular high-frequency noise (or a rhythmic 4–7 Hz oscillation in Parkinsonian tremor) from skeletal muscle, seen in the leads that use the active limb’s electrode.',
      'Ruido irregular de alta frecuencia (u oscilación rítmica de 4–7 Hz en el temblor parkinsoniano) del músculo esquelético, visible en las derivaciones que usan el electrodo del miembro activo.',
    ),
    features: [
      l('模糊、不规则、快速的基线干扰，掩盖P波并模糊ST段。', 'Fuzzy, irregular, fast baseline noise that hides P waves and blurs the ST.', 'Ruido de base borroso, irregular y rápido que oculta las ondas P y difumina el ST.'),
      l(
        '具有导联特异性：一侧上肢震颤出现在使用该电极的导联，不使用它的导联不受影响（如右上肢震颤时Ⅲ导联清晰）。',
        'It is lead-specific: tremor of one arm appears in the leads that use that electrode and spares the lead that does not (right-arm tremor spares lead III).',
        'Es específico de derivación: el temblor de un brazo aparece en las derivaciones que usan ese electrodo y respeta la que no lo usa (el temblor del brazo derecho respeta III).',
      ),
      l(
        '帕金森震颤（4–7 Hz）可像扑动波或颤动波；QRS仍以规则的窦性频率穿行其中。',
        'Parkinsonian tremor (4–7 Hz) can look like flutter or fibrillatory waves; the QRS complexes march through it at a regular sinus rate.',
        'El temblor parkinsoniano (4–7 Hz) puede parecer ondas de flutter o de fibrilación; los QRS lo atraviesan a una frecuencia sinusal regular.',
      ),
      l(
        '较大的运动伪差可像室速：寻找在“心动过速”中仍按时出现的正常QRS。',
        'Large movement artefact can mimic VT: look for normal QRS complexes continuing on time inside the “tachycardia”.',
        'Un artefacto de movimiento grande puede simular una TV: busca QRS normales que siguen apareciendo a su hora dentro de la «taquicardia».',
      ),
    ],
    criteria: [
      {
        label: l('导联分布', 'Lead pattern', 'Distribución por derivaciones'),
        value: l(
          '伪差见于使用受累电极的导联；不使用该电极的导联清晰（右上肢：Ⅲ清晰；左上肢：Ⅱ清晰；左下肢：Ⅰ清晰）',
          'Artefact in leads using the affected electrode; the lead not using it is clean (RA: III clean; LA: II clean; LL: I clean)',
          'Artefacto en las derivaciones que usan el electrodo afectado; la que no lo usa está limpia (BD: III limpia; BI: II limpia; PI: I limpia)',
        ),
        source: 'Kligfield 2007 (AHA Part I)',
      },
      {
        label: l('帕金森震颤', 'Parkinsonian tremor', 'Temblor parkinsoniano'),
        value: l('规则4–7 Hz振荡（每分钟240–420次），接近心房扑动频率', 'Regular 4–7 Hz oscillation (240–420 per minute), close to atrial flutter rates', 'Oscilación regular de 4–7 Hz (240–420 por minuto), cercana a la frecuencia del flutter auricular'),
        source: 'Kligfield 2007; Knight 1999',
      },
      {
        label: l('假性室速', 'Pseudo-VT', 'Seudo-TV'),
        value: l('伪差中可见按规则RR出现的窄QRS', 'Native narrow QRS complexes visible on the regular RR within the artefact', 'QRS estrechos propios visibles con el RR regular dentro del artefacto'),
        source: 'Knight 1999',
      },
    ],
    mechanism: l(
      '收缩的骨骼肌产生自身电活动，位于该肌肉上或附近的电极会把它与心电信号一同记录下来。由于每个肢体导联只使用三个肢体电极中的两个，干扰出现在包含活动肢体的导联中，而不包含该肢体的导联不受影响。',
      'Contracting skeletal muscle produces its own electrical activity, which any electrode on or near it picks up together with the cardiac signal. Because each limb lead uses only two of the three limb electrodes, the noise appears in the leads that include the active limb and spares the one that does not.',
      'El músculo esquelético que se contrae produce su propia actividad eléctrica, que cualquier electrodo situado sobre él o cerca recoge junto con la señal cardiaca. Como cada derivación de los miembros usa solo dos de los tres electrodos, el ruido aparece en las derivaciones que incluyen el miembro activo y respeta la que no lo incluye.',
    ),
    mimics: [
      {
        id: 'atrial-flutter',
        discriminator: l(
          '震颤波大小不一，只见于部分肢体导联，不含震颤肢体的导联清晰；扑动波形态一致、规则，在Ⅱ、Ⅲ、aVF和V1均可见。',
          'Tremor waves vary in size, appear only in some limb leads and spare the lead without the trembling limb; flutter waves are identical, regular and visible in II, III, aVF and V1.',
          'Las ondas de temblor varían de tamaño, aparecen solo en algunas derivaciones de los miembros y respetan la que no incluye el miembro tembloroso; las ondas de flutter son idénticas, regulares y visibles en II, III, aVF y V1.',
        ),
        leads: ['II', 'III', 'V1'],
      },
      {
        id: 'atrial-fibrillation',
        discriminator: l(
          '房颤时RR绝对不规则，所有导联均无P波；震颤时RR规则，清晰导联中可见P波。',
          'In AF the RR intervals are irregularly irregular and P waves are absent in every lead; with tremor the RR is regular and P waves are visible in the clean lead.',
          'En la FA los RR son irregularmente irregulares y no hay ondas P en ninguna derivación; con el temblor el RR es regular y la P se ve en la derivación limpia.',
        ),
        leads: ['III', 'V1'],
      },
      {
        id: 'vt-monomorphic',
        discriminator: l(
          '伪差“室速”中可见按时出现的自身QRS，患者情况良好；真正的室速中没有隐藏的正常心搏。',
          'Artefact “VT” has native QRS complexes marching through it on time and a patient who is well; true VT has no hidden normal beats.',
          'La «TV» por artefacto tiene QRS propios que la atraviesan a su hora y un paciente que está bien; una TV real no tiene latidos normales ocultos.',
        ),
        leads: ['II'],
      },
      {
        id: 'ventricular-fibrillation',
        discriminator: l(
          '神志清楚、能说话的患者不可能是室颤：先看患者，再查电极。',
          'A conscious, talking patient does not have VF: look at the patient, then at the electrodes.',
          'Un paciente consciente que habla no está en FV: mira al paciente y después los electrodos.',
        ),
        leads: ['II'],
      },
    ],
    pitfalls: [
      l(
        '只凭一个干扰导联诊断房颤或房扑，而不看清晰导联和RR规则性。',
        'Calling AF or flutter from one noisy lead without checking the clean lead and RR regularity.',
        'Diagnosticar FA o flutter por una sola derivación con ruido sin mirar la derivación limpia ni la regularidad del RR.',
      ),
      l(
        '把伪差当作室速处理（不必要的电击、药物、操作）：看患者，找按时出现的QRS。',
        'Treating artefact as VT (unnecessary shocks, drugs, procedures): look at the patient and for QRS complexes marching on time.',
        'Tratar un artefacto como TV (descargas, fármacos o procedimientos innecesarios): mira al paciente y busca los QRS que siguen a su hora.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '先看患者再看监护仪：情况良好时请患者放松、保暖、肢体放在支撑物上，然后重新记录。',
        'Look at the patient before the monitor: if well, ask them to relax, keep warm and rest the limbs on a support, then re-record.',
        'Mira al paciente antes que al monitor: si está bien, pídele que se relaje, abrígalo y apoya sus miembros, y vuelve a registrar.',
      ),
    },
    lessons: ['f6', 'o10'],
    sources: [REF.knight1999, REF.kligfield2007, REF.scst2017],
    aka: ['EMG', 'tremor', 'pseudo-flutter', 'pseudo-VT', 'temblor', 'artefacto muscular', '肌电干扰'],
    exemplar: { scenarios: ['muscle-tremor'], leads: ['I', 'II', 'III'] },
  },

  // ── mains (AC) interference ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'ac-interference',
    definition: l(
      '来自市电的规则50 Hz（欧洲、中国）或60 Hz（美洲）正弦振荡叠加在基线上，多因电极接触不良或附近设备所致。',
      'A regular 50 Hz (Europe, China) or 60 Hz (Americas) sine-wave oscillation on the baseline from mains electricity, usually from poor electrode contact or nearby equipment.',
      'Oscilación sinusoidal regular de 50 Hz (Europa, China) o 60 Hz (América) sobre la línea de base, procedente de la red eléctrica, habitualmente por mal contacto de un electrodo o por equipos cercanos.',
    ),
    features: [
      l('基线粗而毛糙但完全规则；25 mm/s时50 Hz为每毫米2个周期。', 'A thick, fuzzy but perfectly regular baseline; at 25 mm/s, 50 Hz is 2 cycles per millimetre.', 'Una línea de base gruesa y borrosa pero perfectamente regular; a 25 mm/s, 50 Hz son 2 ciclos por milímetro.'),
      l('出现在波群之间及波群上，电极贴附不良的导联更明显。', 'Present between and on the complexes, often worse in leads with a poorly attached electrode.', 'Presente entre los complejos y sobre ellos, a menudo peor en las derivaciones con un electrodo mal adherido.'),
      l('与肌电干扰不同，其振幅和频率均匀一致。', 'Unlike muscle noise it is uniform in amplitude and frequency.', 'A diferencia del ruido muscular, es uniforme en amplitud y frecuencia.'),
      l('改善接触和导线、远离设备；陷波滤波可去除。', 'Fix contact and cables and move away from equipment; a notch filter removes it.', 'Mejora el contacto y los cables y aléjate de los equipos; un filtro de muesca la elimina.'),
    ],
    criteria: [
      {
        label: l('频率', 'Frequency', 'Frecuencia'),
        value: l(
          '50 Hz（周期20 ms）或60 Hz（16.7 ms）；25 mm/s时每毫米2个（50 Hz）或2.4个（60 Hz）周期',
          '50 Hz (20 ms period) or 60 Hz (16.7 ms); at 25 mm/s 2 (50 Hz) or 2.4 (60 Hz) cycles per mm',
          '50 Hz (periodo de 20 ms) o 60 Hz (16,7 ms); a 25 mm/s, 2 (50 Hz) o 2,4 (60 Hz) ciclos por mm',
        ),
        source: 'Kligfield 2007 (AHA/ACCF/HRS Part I)',
      },
      {
        label: l('主要原因', 'Main cause', 'Causa principal'),
        value: l('电极间接触阻抗不平衡（皮肤接触不良）', 'Contact-impedance imbalance between electrodes (poor skin contact)', 'Desequilibrio de impedancia de contacto entre electrodos (mal contacto con la piel)'),
        source: 'Kligfield 2007 (AHA/ACCF/HRS Part I)',
      },
    ],
    mechanism: l(
      '电源线路会在患者和导线上耦合一个微小的交流电压，由于它在各电极上大小相同，放大器通常能将其抵消。当某一电极接触阻抗明显升高时，这种抵消失效，50或60 Hz信号便出现在描记图上。',
      'Mains wiring couples a small alternating voltage into the patient and the cables, which the amplifier normally cancels because it appears equally on every electrode. When one electrode has a much higher contact impedance the cancellation fails and the 50 or 60 Hz signal appears on the tracing.',
      'El cableado eléctrico induce un pequeño voltaje alterno en el paciente y los cables, que el amplificador suele cancelar porque aparece por igual en todos los electrodos. Cuando un electrodo tiene una impedancia de contacto mucho mayor, la cancelación falla y la señal de 50 o 60 Hz aparece en el trazado.',
    ),
    mimics: [
      {
        id: 'atrial-fibrillation',
        discriminator: l(
          '颤动波不规则且较慢（每秒约6–10个），RR绝对不规则；交流电干扰为每秒50–60次的完全规则振荡，其下P波和RR正常。',
          'Fibrillatory waves are irregular and slower (about 6–10 per second) with an irregularly irregular RR; mains interference is perfectly regular at 50–60 per second, with normal P waves and RR underneath.',
          'Las ondas de fibrilación son irregulares y más lentas (unas 6–10 por segundo), con RR irregularmente irregular; la interferencia de red es perfectamente regular, a 50–60 por segundo, con P y RR normales debajo.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'muscle-tremor',
        discriminator: l(
          '肌电干扰大小和时间不规则、呈阵发性；交流电干扰是恒定规则的正弦波。',
          'Muscle noise is irregular in size and timing and comes in bursts; mains interference is a constant, regular sine wave.',
          'El ruido muscular es irregular en tamaño y ritmo y aparece en ráfagas; la interferencia de red es una onda sinusoidal constante y regular.',
        ),
        leads: ['I', 'II'],
      },
    ],
    pitfalls: [
      l('打开所有滤波而不去改善电极接触。', 'Switching on every filter instead of fixing the electrode contact.', 'Activar todos los filtros en lugar de mejorar el contacto de los electrodos.'),
      l('在毛糙的基线中“读出”细颤波。', 'Reading fine fibrillatory waves into a fuzzy baseline.', 'Ver ondas de fibrilación finas en una línea de base borrosa.'),
    ],
    lessons: ['f4', 'o10'],
    sources: [REF.kligfield2007, REF.scst2017],
    aka: ['50 Hz', '60 Hz', 'mains hum', 'AC interference', 'interferencia de red', '交流电干扰', '工频干扰'],
    exemplar: { scenarios: ['ac-interference'], leads: ['I', 'II', 'III'] },
  },
];
