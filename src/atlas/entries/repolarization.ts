/**
 * Atlas entries — category `repolarization` (ST segment, T and U waves, QT). Schema and authoring rules:
 * src/atlas/schema.ts. Values: docs/curriculum/criteria.md (qtc-bazett, qt-max-table, qt-causes, early-repolarization,
 * digitalis-effect, st-t-u-normal, ischaemia-t) and the sources cited per criterion.
 */
import { l } from '../../core/l10n';
import { REF } from '../refs';
import type { AtlasEntry } from '../schema';

export const entries: readonly AtlasEntry[] = [
  // ── nonspecific ST–T changes ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'nonspecific-st-t',
    definition: l(
      '轻微的ST或T波改变（T波低平或轻度倒置、ST段压低<0.5 mm），未达到缺血或特定病因的诊断标准。',
      'Minor ST or T changes (flat or slightly inverted T, ST depression < 0.5 mm) that meet no criteria for ischaemia or a specific cause.',
      'Cambios menores del ST o de la T (T aplanada o ligeramente negativa, descenso del ST < 0,5 mm) que no cumplen criterios de isquemia ni de una causa concreta.',
    ),
    features: [
      l(
        '在T波本应直立的导联（Ⅰ、Ⅱ、V4–V6）T波低平（±1 mm内）或轻度倒置。',
        'T flat (within ±1 mm) or minimally inverted in leads where it should be upright (I, II, V4–V6).',
        'T aplanada (dentro de ±1 mm) o mínimamente negativa en derivaciones donde debería ser positiva (I, II, V4–V6).',
      ),
      l('ST段压低（如有）<0.5 mm。', 'ST depression, if any, < 0.5 mm.', 'Descenso del ST, si lo hay, < 0,5 mm.'),
      l('无对应性改变、不符合冠脉分布、复查无演变。', 'No reciprocal pattern, no coronary territory, no evolution on a repeat ECG.', 'Sin patrón recíproco, sin territorio coronario y sin evolución en un ECG repetido.'),
      l(
        '下结论前先找原因：药物（地高辛）、电解质、左心室肥厚、过度通气、体位。',
        'Look for a cause before labelling: drugs (digoxin), electrolytes, LVH, hyperventilation, posture.',
        'Busca una causa antes de etiquetar: fármacos (digoxina), electrolitos, HVI, hiperventilación, postura.',
      ),
    ],
    criteria: [
      {
        label: l('低于缺血标准', 'Below ischaemic thresholds', 'Por debajo de los umbrales isquémicos'),
        value: l(
          'ST段压低<0.5 mm；T波倒置≤1 mm（缺血标准：≥2个相邻导联新出现ST压低≥0.5 mm，或R波为主导联T倒置>1 mm）',
          'ST depression < 0.5 mm; T inversion ≤ 1 mm (ischaemic: new ST depression ≥ 0.5 mm in ≥ 2 contiguous leads, or T inversion > 1 mm with prominent R)',
          'Descenso del ST < 0,5 mm; inversión de la T ≤ 1 mm (isquémico: descenso nuevo del ST ≥ 0,5 mm en ≥ 2 derivaciones contiguas, o T negativa > 1 mm con R prominente)',
        ),
        source: 'UDMI 2018 (Fourth Universal Definition of MI)',
      },
      {
        label: l('T波低平', 'Flat T', 'T aplanada'),
        value: l('在通常直立的导联中振幅介于−1与+1 mm之间', 'Amplitude between −1 and +1 mm in leads where T is normally upright', 'Amplitud entre −1 y +1 mm en derivaciones donde la T suele ser positiva'),
        source: 'Rautaharju 2009 (AHA Part IV); Mason 2007 (AHA Part II)',
      },
    ],
    mechanism: l(
      '多种原因（交感张力、药物、电解质、体位、轻度肥厚）引起的复极梯度细微变化可使T波低平或轻度倒置。由于良性和病理性原因大量重叠，这种改变本身诊断价值有限，必须结合临床判读。',
      'Small changes in the repolarization gradient from many causes (sympathetic tone, drugs, electrolytes, posture, mild hypertrophy) flatten or slightly invert the T wave. Because benign and pathological causes overlap so much, the change itself carries little diagnostic weight and must be read in context.',
      'Pequeños cambios del gradiente de repolarización por muchas causas (tono simpático, fármacos, electrolitos, postura, hipertrofia leve) aplanan o invierten ligeramente la onda T. Como las causas benignas y patológicas se solapan tanto, el cambio en sí tiene poco peso diagnóstico y debe interpretarse en su contexto.',
    ),
    mimics: [
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '缺血性ST段压低≥0.5 mm，呈水平或下斜型，见于≥2个相邻导联，常随症状动态变化；非特异性改变低于这些阈值。',
          'Ischaemic ST depression is ≥ 0.5 mm, horizontal or downsloping, in ≥ 2 contiguous leads and often dynamic with symptoms; nonspecific changes stay below these thresholds.',
          'El descenso isquémico del ST es ≥ 0,5 mm, horizontal o descendente, en ≥ 2 derivaciones contiguas y a menudo dinámico con los síntomas; los cambios inespecíficos quedan por debajo de esos umbrales.',
        ),
        leads: ['V4', 'V5', 'V6'],
      },
      {
        id: 't-inversion-ischemic',
        discriminator: l(
          '缺血性T波倒置>1 mm，见于R波为主的≥2个相邻导联，常对称。',
          'Ischaemic T inversion is > 1 mm, in ≥ 2 contiguous leads with a prominent R, and often symmetric.',
          'La inversión isquémica de la T es > 1 mm, en ≥ 2 derivaciones contiguas con R prominente, y a menudo simétrica.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
      {
        id: 'wellens',
        discriminator: l(
          '胸痛患者V2–V3 T波深倒或正负双向是Wellens图形，而非非特异性改变。',
          'In a patient with chest pain, deep or biphasic T waves in V2–V3 are the Wellens pattern, not a nonspecific change.',
          'En un paciente con dolor torácico, las T profundas o bifásicas en V2–V3 son el patrón de Wellens, no un cambio inespecífico.',
        ),
        leads: ['V2', 'V3'],
      },
      {
        id: 'hypokalemia',
        discriminator: l(
          'T波低平伴明显U波和“QT延长”提示低钾血症。',
          'A flat T with prominent U waves and an apparently long QT suggests hypokalaemia.',
          'Una T aplanada con ondas U prominentes y un QT aparentemente largo sugiere hipopotasemia.',
        ),
        leads: ['V2', 'V3'],
      },
      {
        id: 'digoxin-effect',
        discriminator: l(
          '服用地高辛者ST段呈下垂“鱼钩样”伴QT缩短。',
          'In a patient on digoxin the ST sags in a scooped curve with a short QT.',
          'En un paciente que toma digoxina el ST desciende en forma de cubeta con QT corto.',
        ),
        leads: ['V5', 'V6'],
      },
    ],
    pitfalls: [
      l(
        '胸痛患者出现动态或区域性改变时仍以“非特异性”作为保险的结论——应复查心电图。',
        'Using “nonspecific” as a safe label for a change that is dynamic or regional in a patient with chest pain — repeat the ECG.',
        'Usar «inespecífico» como etiqueta segura para un cambio dinámico o regional en un paciente con dolor torácico: repite el ECG.',
      ),
      l(
        '过度解读Ⅲ、aVL或V1导联的T波低平——这些导联T波低平或倒置可以正常。',
        'Over-reading T flattening in III, aVL or V1, where a flat or negative T can be normal.',
        'Sobreinterpretar el aplanamiento de la T en III, aVL o V1, donde una T plana o negativa puede ser normal.',
      ),
    ],
    lessons: ['s7', 'i1'],
    sources: [REF.rautaharju2009, REF.mason2007, REF.udmi2018],
    aka: ['NSSTT', 'nonspecific ST-T', 'alteraciones inespecíficas de la repolarización', '非特异性ST-T'],
    exemplar: { scenarios: ['nonspecific-st-t'], leads: ['I', 'aVL', 'V5', 'V6'] },
  },

  // ── secondary ST–T changes ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'secondary-st-t',
    definition: l(
      '由异常除极（束支传导阻滞、预激、心室起搏或异位搏动、肥厚）引起，方向与QRS主波或终末部相反的ST-T改变。',
      'ST–T changes caused by abnormal depolarization (bundle branch block, pre-excitation, ventricular pacing or ectopy, hypertrophy) that point opposite the main or terminal QRS deflection.',
      'Alteraciones del ST-T causadas por una despolarización anómala (bloqueo de rama, preexcitación, estimulación o ectopia ventricular, hipertrofia) que se dirigen en sentido opuesto a la deflexión principal o terminal del QRS.',
    ),
    features: [
      l(
        '先找到异常的QRS：宽（束支阻滞、起搏、室性搏动）、预激或电压很高。',
        'First find the abnormal QRS: wide (BBB, pacing, ventricular beat), pre-excited or very tall.',
        'Encuentra primero el QRS anómalo: ancho (bloqueo de rama, marcapasos, latido ventricular), preexcitado o muy alto.',
      ),
      l(
        'ST和T背离QRS终末部（不一致）：高R之后ST压低、T倒置；深S之后ST抬高、T直立。',
        'ST and T point away from the terminal QRS deflection (discordance): ST down and T inverted after a tall R; ST up and T upright after a deep S.',
        'El ST y la T se alejan de la deflexión terminal del QRS (discordancia): ST descendido y T negativa tras una R alta; ST elevado y T positiva tras una S profunda.',
      ),
      l('ST偏移大小与QRS成比例：QRS越大，不一致的偏移越大。', 'The size of the ST shift is proportional to the QRS: bigger complexes, bigger discordant shifts.', 'La magnitud del desplazamiento del ST es proporcional al QRS: complejos mayores, desplazamientos discordantes mayores.'),
      l(
        '与QRS同向（一致）的ST偏移不是继发性改变，提示缺血。',
        'ST deviation in the same direction as the QRS (concordant) is not secondary and suggests ischaemia.',
        'Un desplazamiento del ST en la misma dirección que el QRS (concordante) no es secundario y sugiere isquemia.',
      ),
    ],
    criteria: [
      {
        label: l('预期的不一致', 'Expected discordance', 'Discordancia esperada'),
        value: l(
          '束支阻滞、起搏、预激和左心室肥厚时ST-T与QRS终末部方向相反',
          'ST–T opposite the terminal QRS deflection in BBB, pacing, pre-excitation and LVH',
          'ST-T opuesto a la deflexión terminal del QRS en bloqueo de rama, marcapasos, preexcitación e HVI',
        ),
        source: 'Surawicz 2009 (Part III); Rautaharju 2009 (Part IV)',
      },
      {
        label: l('左束支阻滞/起搏：一致性ST抬高', 'LBBB / pacing: concordant ST elevation', 'BRI / marcapasos: elevación concordante del ST'),
        value: l('QRS正向导联ST抬高≥1 mm为异常（Sgarbossa）', '≥ 1 mm in a lead with a positive QRS = abnormal (Sgarbossa)', '≥ 1 mm en una derivación con QRS positivo = anormal (Sgarbossa)'),
        source: 'Sgarbossa 1996; ESC ACS 2023',
      },
      {
        label: l('过度不一致的ST抬高', 'Excessively discordant ST elevation', 'Elevación del ST excesivamente discordante'),
        value: l('ST/S比值≤−0.25（Smith改良Sgarbossa）为异常', 'ST/S ratio ≤ −0.25 (Smith-modified Sgarbossa) = abnormal', 'Cociente ST/S ≤ −0,25 (Sgarbossa modificado de Smith) = anormal'),
        source: 'Smith 2012',
      },
    ],
    mechanism: l(
      '心室按异常顺序除极时也按同样顺序复极，最后激动的区域最后恢复，复极向量背离这些区域。由此产生的ST-T改变与QRS呈镜像，不需要其他疾病来解释。',
      'When the ventricles depolarize in an abnormal sequence they also repolarize in that sequence, so the regions activated last recover last and the repolarization vector points away from them. The resulting ST–T change mirrors the QRS and needs no other disease to explain it.',
      'Cuando los ventrículos se despolarizan en una secuencia anómala también se repolarizan en esa secuencia, de modo que las regiones activadas al final se recuperan al final y el vector de repolarización se aleja de ellas. El cambio del ST-T resultante es la imagen especular del QRS y no necesita otra enfermedad que lo explique.',
    ),
    mimics: [
      {
        id: 'sgarbossa-positive',
        discriminator: l(
          '继发性改变为不一致且成比例；一致性ST抬高≥1 mm、V1–V3一致性ST压低≥1 mm或不成比例的不一致抬高，提示左束支阻滞或起搏时的冠脉闭塞。',
          'Secondary changes are discordant and proportionate; concordant ST elevation ≥ 1 mm, concordant ST depression ≥ 1 mm in V1–V3 or disproportionate discordant elevation suggests occlusion with LBBB or pacing.',
          'Los cambios secundarios son discordantes y proporcionados; una elevación concordante ≥ 1 mm, un descenso concordante ≥ 1 mm en V1–V3 o una elevación discordante desproporcionada sugieren oclusión con BRI o marcapasos.',
        ),
        leads: ['V1', 'V2', 'V3', 'V5', 'V6'],
      },
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '原发性缺血性ST段压低见于QRS正常的导联，或与QRS同向。',
          'Primary ischaemic ST depression occurs with a normal QRS, or in the same direction as the QRS.',
          'El descenso isquémico primario del ST aparece con un QRS normal o en la misma dirección que el QRS.',
        ),
        leads: ['V4', 'V5', 'V6'],
      },
      {
        id: 't-inversion-ischemic',
        discriminator: l(
          '右束支阻滞时V1–V3 T波倒置是预期的继发性改变；缺血性T波倒置出现在QRS正常的导联。',
          'In RBBB, T inversion in V1–V3 is an expected secondary change; ischaemic T inversion appears in leads with a normal QRS.',
          'En el bloqueo de rama derecha la T negativa en V1–V3 es un cambio secundario esperado; la inversión isquémica aparece en derivaciones con QRS normal.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
    ],
    pitfalls: [
      l(
        '把左束支阻滞或起搏的不一致性ST抬高当作STEMI——或忽视真正的一致性改变。',
        'Labelling the discordant ST elevation of LBBB or pacing as STEMI — or ignoring a truly concordant change.',
        'Etiquetar como IAMCEST la elevación discordante del ST del BRI o del marcapasos, o ignorar un cambio realmente concordante.',
      ),
      l(
        '把右束支阻滞V1–V3的T波倒置称为“前壁缺血”。',
        'Calling the T inversion in V1–V3 of RBBB “anterior ischaemia”.',
        'Llamar «isquemia anterior» a la T negativa de V1–V3 del bloqueo de rama derecha.',
      ),
      l(
        '忘记间歇性传导异常或起搏停止后可留下“记忆性T波”。',
        'Forgetting that intermittent block or pacing can leave “memory” T waves after normal conduction returns.',
        'Olvidar que un bloqueo intermitente o la estimulación pueden dejar ondas T de «memoria» cuando vuelve la conducción normal.',
      ),
    ],
    lessons: ['r6', 'i10', 'o11'],
    sources: [REF.surawicz2009, REF.rautaharju2009, REF.sgarbossa1996, REF.smith2012, REF.escAcs2023],
    aka: ['secondary repolarization', 'discordance', 'alteraciones secundarias de la repolarización', '继发性复极改变'],
    exemplar: { scenarios: ['lbbb'], leads: ['V1', 'V5', 'V6'] },
  },

  // ── early repolarization pattern ─────────────────────────────────────────────────────────────────────────────────
  {
    id: 'early-repolarization',
    definition: l(
      '≥2个相邻下壁和/或侧壁导联QRS终末出现≥0.1 mV的J点切迹或顿挫，通常是良性的正常变异。',
      'A J-point notch or slur ≥ 0.1 mV at the end of the QRS in ≥ 2 contiguous inferior and/or lateral leads, usually a benign normal variant.',
      'Muesca o empastamiento del punto J ≥ 0,1 mV al final del QRS en ≥ 2 derivaciones contiguas inferiores y/o laterales, habitualmente una variante normal benigna.',
    ),
    features: [
      l(
        '看高R波下降支末端的QRS终点：切迹（小驼峰）或顿挫（平滑的肩部）。',
        'Look at the end of the QRS on the downslope of a tall R: a notch (small hump) or a slur (smooth shoulder).',
        'Mira el final del QRS en la rama descendente de una R alta: una muesca (pequeña joroba) o un empastamiento (hombro suave).',
      ),
      l(
        '切迹/顿挫顶点（Jp）≥0.1 mV，见于≥2个相邻下壁（Ⅱ、Ⅲ、aVF）或侧壁（Ⅰ、aVL、V4–V6）导联。',
        'Peak of the notch or slur (Jp) ≥ 0.1 mV in ≥ 2 contiguous inferior (II, III, aVF) or lateral (I, aVL, V4–V6) leads.',
        'Pico de la muesca o del empastamiento (Jp) ≥ 0,1 mV en ≥ 2 derivaciones contiguas inferiores (II, III, aVF) o laterales (I, aVL, V4–V6).',
      ),
      l(
        '常伴凹面向上的轻度ST段抬高和高T波，见于年轻、健康、多为男性者；QRS<120 ms。',
        'Usually mild, concave ST elevation with tall T waves in young, fit, often male people; QRS < 120 ms.',
        'Suele acompañarse de una elevación leve y cóncava del ST con T altas en personas jóvenes, en forma, a menudo varones; QRS < 120 ms.',
      ),
      l(
        '高危特征：Jp≥0.2 mV、下壁或广泛分布、J点后ST段水平或下斜。',
        'Higher-risk features: Jp ≥ 0.2 mV, inferior or global distribution, horizontal or descending ST after the J point.',
        'Rasgos de mayor riesgo: Jp ≥ 0,2 mV, distribución inferior o global, ST horizontal o descendente tras el punto J.',
      ),
    ],
    criteria: [
      {
        label: l('早期复极图形', 'Early repolarization pattern', 'Patrón de repolarización precoz'),
        value: l(
          '≥2个相邻下壁和/或侧壁导联Jp≥0.1 mV（不含V1–V3），QRS<120 ms；不要求ST段抬高',
          'Jp ≥ 0.1 mV in ≥ 2 contiguous inferior and/or lateral leads (V1–V3 excluded), QRS < 120 ms; ST elevation not required',
          'Jp ≥ 0,1 mV en ≥ 2 derivaciones contiguas inferiores y/o laterales (excluidas V1–V3), QRS < 120 ms; no se exige elevación del ST',
        ),
        source: 'Macfarlane 2015 (consensus)',
      },
      {
        label: l('V2–V3正常ST抬高上限', 'Normal ST elevation in V2–V3 (upper limits)', 'Elevación normal del ST en V2–V3 (límites)'),
        value: l('男性<40岁<2.5 mm；男性≥40岁<2 mm；女性<1.5 mm', '< 2.5 mm men < 40 y; < 2 mm men ≥ 40 y; < 1.5 mm women', '< 2,5 mm varones < 40 años; < 2 mm varones ≥ 40 años; < 1,5 mm mujeres'),
        source: 'Macfarlane 2015; UDMI 2018',
      },
      {
        label: l('高危特征', 'Higher-risk features', 'Rasgos de mayor riesgo'),
        value: l('Jp≥0.2 mV；下壁或广泛；ST水平/下斜', 'Jp ≥ 0.2 mV; inferior or global; horizontal or descending ST', 'Jp ≥ 0,2 mV; inferior o global; ST horizontal o descendente'),
        source: 'Antzelevitch 2016; ESC VA/SCD 2022',
      },
      {
        label: l('早期复极综合征', 'Early repolarization syndrome', 'Síndrome de repolarización precoz'),
        value: l('不明原因室颤/多形性室速复苏者出现早期复极图形', 'ERP in a patient resuscitated from unexplained VF or polymorphic VT', 'Patrón de repolarización precoz en un paciente reanimado de una FV o TV polimorfa sin causa'),
        source: 'ESC VA/SCD 2022',
      },
    ],
    mechanism: l(
      '心外膜较强的瞬时外向钾电流使该处动作电位早期出现切迹，而心内膜无此切迹。除极末期这一跨壁电压梯度在体表表现为J波或顿挫以及轻度抬高的ST段。',
      'A prominent transient outward potassium current in the epicardium creates an early notch in its action potential that the endocardium lacks. That transmural voltage gradient at the end of depolarization appears on the surface as a J wave or slur and a slightly raised ST segment.',
      'Una corriente transitoria de salida de potasio prominente en el epicardio crea una muesca precoz en su potencial de acción que el endocardio no tiene. Ese gradiente transmural de voltaje al final de la despolarización aparece en la superficie como una onda J o un empastamiento y un segmento ST algo elevado.',
    ),
    mimics: [
      {
        id: 'stemi-anterior',
        discriminator: l(
          '早期复极稳定，有J点切迹、ST凹面向上且T波与QRS成比例；闭塞时ST抬高伴对应性压低、QRS终末变形、T波饱满或连续心电图演变。',
          'Early repolarization is stable, with a J notch, concave ST and T proportional to the QRS; occlusion gives ST elevation with reciprocal depression, terminal QRS distortion, bulky T waves or evolution on serial ECGs.',
          'La repolarización precoz es estable, con muesca J, ST cóncavo y T proporcionada al QRS; la oclusión da elevación del ST con descenso recíproco, distorsión terminal del QRS, T voluminosas o evolución en ECG seriados.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
      {
        id: 'pericarditis',
        discriminator: l(
          '心包炎为广泛ST段抬高伴PR段压低、aVR导联ST压低，并有演变；早期复极无PR段压低且保持稳定。',
          'Pericarditis gives diffuse ST elevation with PR depression and ST depression in aVR, and it evolves; early repolarization has no PR depression and stays stable.',
          'La pericarditis produce elevación difusa del ST con descenso del PR y descenso del ST en aVR, y evoluciona; la repolarización precoz no tiene descenso del PR y se mantiene estable.',
        ),
        leads: ['II', 'aVR', 'V5', 'V6'],
      },
      {
        id: 'brugada-type1',
        discriminator: l(
          'Brugada 1型位于V1–V2，ST段穹窿样抬高并下降至倒置T波；早期复极位于下侧壁，不含V1–V3。',
          'Brugada type 1 is in V1–V2, with coved ST elevation descending into a negative T; early repolarization is inferolateral and excludes V1–V3.',
          'El Brugada tipo 1 está en V1–V2, con elevación del ST en cúpula que desciende hacia una T negativa; la repolarización precoz es inferolateral y excluye V1–V3.',
        ),
        leads: ['V1', 'V2'],
      },
      {
        id: 'osborn-waves',
        discriminator: l(
          '低体温Osborn波伴心动过缓、长QT和寒战伪差，其大小随体温下降而增加。',
          'Hypothermic Osborn waves come with bradycardia, a long QT and shivering artefact, and grow as temperature falls.',
          'Las ondas de Osborn de la hipotermia se acompañan de bradicardia, QT largo y artefacto por escalofríos, y crecen al bajar la temperatura.',
        ),
        leads: ['II', 'V4', 'V5'],
      },
    ],
    pitfalls: [
      l(
        '把隐匿的前壁闭塞当作“早期复极”而放过——这是年轻患者漏诊LAD闭塞最常见的原因；与既往心电图比较并复查。',
        'Dismissing a subtle anterior occlusion as early repolarization — the commonest reason a LAD occlusion is missed in young patients; compare with prior ECGs and repeat.',
        'Descartar una oclusión anterior sutil como repolarización precoz: es la causa más frecuente de que se pase por alto una oclusión de la DA en pacientes jóvenes; compara con ECG previos y repite.',
      ),
      l(
        '把V1–V3的ST段抬高称为早期复极；定义不包括V1–V3（考虑Brugada、正常男性型或闭塞）。',
        'Calling ST elevation in V1–V3 early repolarization; the definition excludes V1–V3 (think of Brugada, the normal male pattern or occlusion).',
        'Llamar repolarización precoz a la elevación del ST en V1–V3; la definición excluye V1–V3 (piensa en Brugada, el patrón masculino normal o una oclusión).',
      ),
      l(
        '让健康运动员恐慌：无症状且无高危特征的早期复极无需进一步检查。',
        'Alarming a healthy athlete: early repolarization without symptoms or high-risk features needs no work-up.',
        'Alarmar a un deportista sano: la repolarización precoz sin síntomas ni rasgos de riesgo no requiere estudio.',
      ),
    ],
    lessons: ['s7', 'h8', 'i11'],
    sources: [REF.macfarlane2015, REF.antzelevitch2016, REF.escVa2022, REF.udmi2018, REF.sharma2017],
    aka: ['ERP', 'BER', 'benign early repolarization', 'J wave', 'repolarización precoz', '早复极', 'J波'],
    exemplar: { scenarios: ['early-repolarization'], leads: ['II', 'III', 'aVF', 'V4', 'V5', 'V6'] },
  },

  // ── long QT ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'long-qt',
    definition: l(
      '心率校正后的QT间期达到或超过性别特异的上限（男性≥450 ms，女性≥460 ms），是尖端扭转型室速的基质。',
      'A rate-corrected QT interval at or above the sex-specific upper limit (≥ 450 ms in men, ≥ 460 ms in women), the substrate of torsades de pointes.',
      'Intervalo QT corregido igual o superior al límite superior específico del sexo (≥ 450 ms en varones, ≥ 460 ms en mujeres), sustrato de la torsade de pointes.',
    ),
    features: [
      l(
        '在QT最长的导联（常为Ⅱ或V2–V5）从最早QRS起点量到T波终点（切线法），不包括U波。',
        'Measure QT from the earliest QRS onset to the end of T (tangent method) in the lead with the longest QT, usually II or V2–V5; leave out the U wave.',
        'Mide el QT desde el inicio más precoz del QRS hasta el final de la T (método de la tangente) en la derivación con el QT más largo, habitualmente II o V2–V5; excluye la onda U.',
      ),
      l(
        '用Fridericia或Framingham公式校正心率（Bazett在心率快时校正过度）。',
        'Correct for rate with Fridericia or Framingham (Bazett over-corrects at fast rates).',
        'Corrige por la frecuencia con Fridericia o Framingham (Bazett sobrecorrige a frecuencias rápidas).',
      ),
      l(
        '快速筛查：心率60–100次/分时QT超过RR间期的一半即应怀疑。',
        'Quick screen: at 60–100 bpm a QT longer than half the RR interval is suspicious.',
        'Cribado rápido: a 60–100 lpm, un QT mayor que la mitad del RR es sospechoso.',
      ),
      l(
        '看T波形态和病因：宽T（LQT1）、低平切迹T（LQT2）、长而平的ST段伴晚T（LQT3、低钙）、巨大倒置T（脑源性）；核查药物和电解质。',
        'Look at the T wave and the cause: broad T (LQT1), low notched T (LQT2), long flat ST with a late T (LQT3, hypocalcaemia), giant T inversion (cerebral); review drugs and electrolytes.',
        'Mira la onda T y la causa: T ancha (LQT1), T baja y mellada (LQT2), ST largo y plano con T tardía (LQT3, hipocalcemia), T negativa gigante (cerebral); revisa fármacos y electrolitos.',
      ),
    ],
    criteria: [
      {
        label: l('QTc延长', 'Prolonged QTc', 'QTc prolongado'),
        value: l('男性≥450 ms，女性≥460 ms', '≥ 450 ms men, ≥ 460 ms women', '≥ 450 ms en varones, ≥ 460 ms en mujeres'),
        source: 'Rautaharju 2009 (AHA/ACCF/HRS Part IV)',
      },
      {
        label: l('尖端扭转高风险', 'High risk of torsades', 'Alto riesgo de torsade'),
        value: l('QTc>500 ms，或用药后较基线延长>60 ms', 'QTc > 500 ms, or a rise > 60 ms from baseline on a drug', 'QTc > 500 ms, o aumento > 60 ms respecto a la basal con un fármaco'),
        source: 'Drew 2010 (AHA/ACCF scientific statement)',
      },
      {
        label: l('先天性长QT综合征', 'Congenital long QT syndrome', 'Síndrome de QT largo congénito'),
        value: l(
          '多次心电图QTc≥480 ms，或评分>3；有心律失常性晕厥时QTc≥460 ms（排除继发原因）',
          'QTc ≥ 480 ms on repeated ECGs, or LQTS score > 3; QTc ≥ 460 ms with arrhythmic syncope (no secondary cause)',
          'QTc ≥ 480 ms en ECG repetidos, o puntuación de SQTL > 3; QTc ≥ 460 ms con síncope arrítmico (sin causa secundaria)',
        ),
        source: 'Zeppenfeld 2022 (ESC VA/SCD)',
      },
      {
        label: l('宽QRS时', 'With a wide QRS', 'Con QRS ancho'),
        value: l('QRS≥120 ms时用JT间期或QRS校正的QT', 'With QRS ≥ 120 ms use the JT interval or a QRS-adjusted QT', 'Con QRS ≥ 120 ms usa el intervalo JT o un QT ajustado por el QRS'),
        source: 'Rautaharju 2009 (AHA/ACCF/HRS Part IV)',
      },
    ],
    mechanism: l(
      'QT延长意味着心室动作电位时程延长，原因是复极钾电流减少或晚钠电流、钙电流增加，可由基因、药物、电解质紊乱、心动过缓或脑损伤引起。复极延长且不均一使早期后除极触发折返，表现为尖端扭转型室性心动过速。',
      'A longer QT means longer ventricular action potentials, from less repolarizing potassium current or more late sodium or calcium current, caused by genes, drugs, electrolytes, bradycardia or brain injury. Prolonged and uneven repolarization lets early afterdepolarizations trigger re-entry, which appears as torsades de pointes.',
      'Un QT más largo significa potenciales de acción ventriculares más largos, por menos corriente repolarizante de potasio o más corriente tardía de sodio o de calcio, a causa de genes, fármacos, electrolitos, bradicardia o lesión cerebral. Una repolarización prolongada y heterogénea permite que los pospotenciales precoces desencadenen reentradas, que se manifiestan como torsade de pointes.',
    ),
    mimics: [
      {
        id: 'u-waves',
        discriminator: l(
          '与T波融合的明显U波可被误认为长QT；应量到T波终点（切线法）而非U波终点——但大U波伴低平T波本身提示低钾。',
          'A prominent U wave fused with the T can be mistaken for a long QT; measure to the end of T (tangent), not of U — though a large U with a flat T itself suggests hypokalaemia.',
          'Una onda U prominente fusionada con la T puede confundirse con un QT largo; mide hasta el final de la T (tangente), no de la U, aunque una U grande con T aplanada ya sugiere hipopotasemia.',
        ),
        leads: ['V2', 'V3'],
      },
      {
        id: 'hypocalcemia',
        discriminator: l(
          '低钙血症通过延长平直的ST段使QT延长，T波形态正常；药物性或先天性长QT通常改变T波形态。',
          'Hypocalcaemia lengthens the QT through a long flat ST with a normal T; drug-induced or congenital long QT usually changes the T wave itself.',
          'La hipocalcemia alarga el QT mediante un ST largo y plano con T normal; el QT largo farmacológico o congénito suele cambiar la propia onda T.',
        ),
        leads: ['II', 'V5'],
      },
      {
        id: 'cerebral-t',
        discriminator: l(
          '脑型T波在颅内急症后出现，QT极长伴胸导联巨大宽倒置T波。',
          'Cerebral T waves pair a very long QT with giant, broad precordial T inversion after an intracranial event.',
          'Las ondas T cerebrales combinan un QT muy largo con T negativas gigantes y anchas en precordiales tras un evento intracraneal.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '相信机器测得的QTc：T波低平、U波、房颤或束支阻滞时算法常误测——自己测量。',
        'Trusting the machine QTc: algorithms mis-measure with flat T, U waves, AF or BBB — measure it yourself.',
        'Fiarse del QTc de la máquina: los algoritmos miden mal con T aplanada, ondas U, FA o bloqueo de rama; mídelo tú.',
      ),
      l(
        '心率快时用Bazett公式会高估QTc（假性长QT）——改用Fridericia或Framingham。',
        'Using Bazett at fast rates, which overestimates QTc (false long QT) — use Fridericia or Framingham.',
        'Usar Bazett a frecuencias rápidas, que sobrestima el QTc (falso QT largo): usa Fridericia o Framingham.',
      ),
      l(
        '把U波计入QT，或在看不清T波终点的导联测量。',
        'Including the U wave in the QT, or measuring in a lead where the end of T cannot be seen.',
        'Incluir la onda U en el QT o medir en una derivación donde no se ve el final de la T.',
      ),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        'QTc>500 ms或延长>60 ms时：停用延长QT的药物，检查并纠正血钾和血镁，持续心电监护；发生尖端扭转时立即静脉注射镁剂，血流动力学不稳定时除颤。',
        'If QTc > 500 ms or rising > 60 ms: stop QT-prolonging drugs, check and correct potassium and magnesium, and monitor the rhythm; torsades needs immediate IV magnesium, and defibrillation if unstable.',
        'Si el QTc > 500 ms o aumenta > 60 ms: suspende los fármacos que alargan el QT, determina y corrige potasio y magnesio y monitoriza el ritmo; la torsade requiere magnesio IV inmediato y desfibrilación si hay inestabilidad.',
      ),
    },
    lessons: ['s4', 'h7', 't6'],
    sources: [REF.rautaharju2009, REF.drew2010, REF.escVa2022],
    aka: ['LQT', 'LQTS', 'long QT', 'QT largo', 'QT延长', '长QT'],
    exemplar: { scenarios: ['long-qt'], leads: ['II', 'V2', 'V5'] },
  },

  // ── short QT ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'short-qt',
    definition: l(
      '心率校正后的QT间期异常缩短（AHA标准≤390 ms）；QTc≤360 ms且有支持证据时考虑短QT综合征。',
      'An abnormally short rate-corrected QT (≤ 390 ms by the AHA standard); short QT syndrome is considered at ≤ 360 ms with supporting features.',
      'QT corregido anormalmente corto (≤ 390 ms según el estándar de la AHA); se considera síndrome de QT corto con ≤ 360 ms y datos de apoyo.',
    ),
    features: [
      l(
        'QT相对心率偏短，等电位ST段很短或缺如：T波几乎紧接J点开始。',
        'QT short for the rate with little or no isoelectric ST segment: the T starts almost at the J point.',
        'QT corto para la frecuencia con poco o ningún segmento ST isoeléctrico: la T empieza casi en el punto J.',
      ),
      l('T波常高、窄、对称，尤以胸导联明显。', 'T waves often tall, narrow and symmetric, especially in the precordial leads.', 'Ondas T a menudo altas, estrechas y simétricas, sobre todo en precordiales.'),
      l('先找继发原因：高钙血症、地高辛、发热、酸中毒、高钾血症。', 'Look for secondary causes first: hypercalcaemia, digoxin, hyperthermia, acidosis, hyperkalaemia.', 'Busca primero causas secundarias: hipercalcemia, digoxina, hipertermia, acidosis, hiperpotasemia.'),
      l(
        '若无继发原因，考虑先天性短QT综合征：询问晕厥、家族猝死、年轻时心房颤动。',
        'If none, think of congenital short QT syndrome: ask about syncope, sudden death in the family and atrial fibrillation at a young age.',
        'Si no hay ninguna, piensa en un síndrome de QT corto congénito: pregunta por síncopes, muerte súbita familiar y fibrilación auricular en edad joven.',
      ),
    ],
    criteria: [
      {
        label: l('QTc缩短', 'Short QTc', 'QTc corto'),
        value: l('≤390 ms', '≤ 390 ms', '≤ 390 ms'),
        source: 'Rautaharju 2009 (AHA/ACCF/HRS Part IV)',
      },
      {
        label: l('短QT综合征', 'Short QT syndrome', 'Síndrome de QT corto'),
        value: l(
          'QTc≤360 ms加致病变异、家族史或室速/室颤幸存；QTc≤320 ms时应考虑',
          'QTc ≤ 360 ms plus a pathogenic variant, family history or survived VT/VF; considered at QTc ≤ 320 ms',
          'QTc ≤ 360 ms más una variante patogénica, antecedentes familiares o TV/FV recuperada; se considera con QTc ≤ 320 ms',
        ),
        source: 'Zeppenfeld 2022 (ESC VA/SCD)',
      },
      {
        label: l('校正公式', 'Correction formula', 'Fórmula de corrección'),
        value: l('用Fridericia或Framingham；心率慢时Bazett校正不足（QTc假性缩短）', 'Use Fridericia or Framingham; at slow rates Bazett gives an artificially short QTc', 'Usa Fridericia o Framingham; a frecuencias lentas Bazett da un QTc artificialmente corto'),
        source: 'Rautaharju 2009 (AHA/ACCF/HRS Part IV)',
      },
    ],
    mechanism: l(
      '钾通道功能增强（先天性）或高钙、地高辛、发热、酸中毒使复极加快，动作电位平台期缩短。短而不均一的不应期有利于折返，因此先天性短QT综合征有发生心房颤动和心室颤动的风险。',
      'Faster repolarization from gain-of-function potassium channels (congenital) or from high calcium, digoxin, heat or acidosis shortens the action potential plateau. A short and uneven refractory period favours re-entry, so the congenital form carries a risk of atrial and ventricular fibrillation.',
      'Una repolarización más rápida por canales de potasio con ganancia de función (forma congénita) o por calcio alto, digoxina, calor o acidosis acorta la meseta del potencial de acción. Un periodo refractario corto y heterogéneo favorece la reentrada, por lo que la forma congénita conlleva riesgo de fibrilación auricular y ventricular.',
    ),
    mimics: [
      {
        id: 'hypercalcemia',
        discriminator: l(
          '高钙血症通过缩短ST段使QT缩短，T波形态正常；检查血钙。',
          'Hypercalcaemia shortens the QT by shortening the ST segment while the T keeps a normal shape; check serum calcium.',
          'La hipercalcemia acorta el QT acortando el segmento ST mientras la T mantiene una forma normal; determina el calcio sérico.',
        ),
        leads: ['II', 'V2'],
      },
      {
        id: 'digoxin-effect',
        discriminator: l('地高辛使QT缩短，伴“鱼钩样”ST段压低和T波低平。', 'Digoxin shortens the QT with a scooped ST depression and a low T.', 'La digoxina acorta el QT con un descenso del ST en cubeta y una T baja.'),
        leads: ['V5', 'V6'],
      },
      {
        id: 'peaked-t',
        discriminator: l(
          '高钾血症也有高窄T波，但QT正常或轻度缩短，并随病情进展出现P波低平和QRS增宽。',
          'Hyperkalaemia gives tall narrow T waves too, with a normal or modestly short QT and, as it progresses, P flattening and QRS widening.',
          'La hiperpotasemia también da T altas y estrechas, con QT normal o algo corto y, al progresar, aplanamiento de la P y ensanchamiento del QRS.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
      {
        id: 'early-repolarization',
        discriminator: l('早期复极的高T波伴正常QTc和J点切迹。', 'The tall T waves of early repolarization come with a normal QTc and a J notch.', 'Las T altas de la repolarización precoz se acompañan de QTc normal y muesca J.'),
        leads: ['V4', 'V5'],
      },
    ],
    pitfalls: [
      l('根本不看QT是否过短：读图习惯往往只核对上限。', 'Not looking for a short QT at all: the reading habit only checks the upper limit.', 'No buscar nunca un QT corto: el hábito de lectura solo comprueba el límite superior.'),
      l('心率慢时依据Bazett值诊断短QT。', 'Diagnosing short QT from a Bazett value at a slow heart rate.', 'Diagnosticar QT corto con un valor de Bazett a frecuencia lenta.'),
    ],
    urgency: {
      level: 'urgent',
      next: l(
        '检查血钙、血钾和地高辛浓度；无继发原因时转诊心脏电生理评估，有晕厥或家族猝死史时尽快转诊。',
        'Check calcium, potassium and digoxin; if there is no secondary cause, refer for electrophysiological assessment — promptly if there is syncope or a family history of sudden death.',
        'Determina calcio, potasio y digoxina; si no hay causa secundaria, deriva a evaluación electrofisiológica, con prontitud si hay síncope o antecedentes familiares de muerte súbita.',
      ),
    },
    lessons: ['s4', 'h7'],
    sources: [REF.rautaharju2009, REF.escVa2022],
    aka: ['SQT', 'SQTS', 'short QT', 'QT corto', 'QT缩短', '短QT'],
    exemplar: { scenarios: ['short-qt'], leads: ['II', 'V2', 'V3'] },
  },

  // ── peaked T waves ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'peaked-t',
    definition: l(
      '高耸、基底窄、对称而尖的（“帐篷样”）T波，是高钾血症的经典早期征象。',
      'Tall, narrow-based, symmetric and pointed (“tented”) T waves, the classic early sign of hyperkalaemia.',
      'Ondas T altas, de base estrecha, simétricas y picudas («en tienda de campaña»), el signo precoz clásico de la hiperpotasemia.',
    ),
    features: [
      l(
        'T波相对QRS高，基底窄，顶端尖而对称，V2–V4最明显。',
        'T waves tall relative to the QRS, with a narrow base and a sharp symmetric peak, most visible in V2–V4.',
        'Ondas T altas en relación con el QRS, de base estrecha y vértice agudo y simétrico, más visibles en V2–V4.',
      ),
      l(
        '查看高钾血症的其余表现：P波低平或消失、PR延长、QRS增宽、心动过缓、正弦波。',
        'Check the rest of the hyperkalaemia sequence: flat or absent P, longer PR, widening QRS, bradycardia, sine wave.',
        'Comprueba el resto de la secuencia de hiperpotasemia: P aplanada o ausente, PR más largo, QRS ensanchado, bradicardia, onda sinusoidal.',
      ),
      l(
        '与超急性期T波（宽大、饱满、限于冠脉分布区）及早期复极或左心室肥厚的高T波相鉴别。',
        'Separate them from hyperacute T waves (broad, bulky, in a coronary territory) and from the tall T of early repolarization or LVH.',
        'Distínguelas de las T hiperagudas (anchas, voluminosas, en un territorio coronario) y de las T altas de la repolarización precoz o de la HVI.',
      ),
      l(
        '结合临床：肾衰竭、保钾利尿剂、ACE抑制剂、横纹肌溶解、酸中毒。',
        'Ask the clinical question: kidney failure, potassium-sparing drugs, ACE inhibitors, rhabdomyolysis, acidosis.',
        'Hazte la pregunta clínica: insuficiencia renal, fármacos ahorradores de potasio, IECA, rabdomiólisis, acidosis.',
      ),
    ],
    criteria: [
      {
        label: l('形态', 'Morphology', 'Morfología'),
        value: l('基底窄、两支对称、顶端尖；相对QRS高', 'Narrow base, symmetric limbs, pointed apex; tall relative to the QRS', 'Base estrecha, ramas simétricas, vértice puntiagudo; alta en relación con el QRS'),
        source: 'Littmann 2018; Diercks 2004',
      },
      {
        label: l('敏感性', 'Sensitivity', 'Sensibilidad'),
        value: l('心电图不敏感：严重高钾可无T波高尖，且改变不按固定顺序进展', 'The ECG is insensitive: severe hyperkalaemia can lack peaked T, and changes do not progress in a fixed order', 'El ECG es poco sensible: una hiperpotasemia grave puede no tener T picudas, y los cambios no siguen un orden fijo'),
        source: 'Durfey 2017; Littmann 2018',
      },
      {
        label: l('血钾升高时的演变', 'Sequence as potassium rises', 'Secuencia al subir el potasio'),
        value: l('T波高尖 → P波低平、PR延长 → QRS增宽 → 正弦波、心动过缓、室颤或停搏', 'Peaked T → P flattening and PR prolongation → QRS widening → sine wave, bradycardia, VF or asystole', 'T picudas → aplanamiento de la P y PR largo → QRS ancho → onda sinusoidal, bradicardia, FV o asistolia'),
        source: 'Littmann 2018',
      },
    ],
    mechanism: l(
      '细胞外钾浓度升高使复极末期加快，因此T波变窄、增高、变尖。血钾进一步升高时静息膜电位去极化，心房和心室传导减慢，使P波低平、QRS增宽。',
      'A high extracellular potassium speeds the final phase of repolarization, so the T wave becomes narrow, tall and pointed. As potassium rises further the resting membrane depolarizes and conduction slows in atria and ventricles, which flattens the P wave and widens the QRS.',
      'Un potasio extracelular alto acelera la fase final de la repolarización, de modo que la onda T se vuelve estrecha, alta y picuda. Si el potasio sigue subiendo, la membrana en reposo se despolariza y la conducción se enlentece en aurículas y ventrículos, lo que aplana la onda P y ensancha el QRS.',
    ),
    mimics: [
      {
        id: 'hyperacute-t',
        discriminator: l(
          '超急性期T波基底宽、饱满，局限于冠脉分布区，常有对应性改变；高钾的T波基底窄、对称且分布广泛。',
          'Hyperacute T waves are broad-based and bulky, confined to a coronary territory and often with reciprocal change; the peaked T of hyperkalaemia is narrow-based, symmetric and diffuse.',
          'Las T hiperagudas son de base ancha y voluminosas, limitadas a un territorio coronario y a menudo con cambios recíprocos; las T picudas de la hiperpotasemia son de base estrecha, simétricas y difusas.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
      {
        id: 'early-repolarization',
        discriminator: l(
          '早期复极的高T波宽而不对称，伴J点切迹，见于年轻健康者。',
          'In early repolarization the tall T waves are broad and asymmetric, with a J notch, in a young healthy person.',
          'En la repolarización precoz las T altas son anchas y asimétricas, con muesca J, en una persona joven y sana.',
        ),
        leads: ['V3', 'V4', 'V5'],
      },
      {
        id: 'hyperkalemia',
        discriminator: l(
          'T波高尖只是一个征象；高钾血症的诊断需要血钾，若同时出现P波低平或QRS增宽则可能性更大。',
          'Peaked T alone is a sign; the diagnosis of hyperkalaemia needs the serum potassium and is likelier when P flattening or QRS widening join it.',
          'Las T picudas son solo un signo; el diagnóstico de hiperpotasemia requiere el potasio sérico y es más probable si se suman aplanamiento de la P o ensanchamiento del QRS.',
        ),
        leads: ['II', 'V2', 'V3'],
      },
      {
        id: 'lvh',
        discriminator: l(
          '左心室肥厚时V1–V3可出现与深S波相对的高T波，并符合电压标准。',
          'In LVH tall T waves can appear in V1–V3 opposite deep S waves, with voltage criteria met.',
          'En la HVI pueden aparecer T altas en V1–V3 opuestas a S profundas, con criterios de voltaje.',
        ),
        leads: ['V1', 'V2', 'V3'],
      },
    ],
    pitfalls: [
      l(
        '等到出现T波高尖才治疗：严重高钾可无典型征象——相信血钾结果。',
        'Waiting for peaked T before treating: severe hyperkalaemia may show no typical sign — trust the potassium.',
        'Esperar a ver T picudas para tratar: una hiperpotasemia grave puede no tener signos típicos; fíate del potasio.',
      ),
      l(
        '把前壁超急性期闭塞的高T波称为“高钾”（或反之）。',
        'Calling the tall T of a hyperacute anterior occlusion “hyperkalaemia” (or vice versa).',
        'Llamar «hiperpotasemia» a la T alta de una oclusión anterior hiperaguda (o al revés).',
      ),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '立即测血钾（血气或床旁检测）并心电监护；若QRS增宽、心动过缓或出现正弦波，在结果出来前即按高钾处理（静脉钙剂）。',
        'Check potassium now (blood gas or point-of-care) and monitor the rhythm; with QRS widening, bradycardia or a sine wave, treat as hyperkalaemia (IV calcium) before the result.',
        'Determina ya el potasio (gasometría o prueba a pie de cama) y monitoriza; con QRS ancho, bradicardia u onda sinusoidal, trata como hiperpotasemia (calcio IV) antes del resultado.',
      ),
    },
    lessons: ['o1', 'i7'],
    sources: [REF.littmann2018, REF.durfey2017, REF.diercks2004, REF.rautaharju2009],
    aka: ['tented T', 'peaked T', 'T picudas', 'T en tienda de campaña', 'T波高尖', '帐篷样T波'],
    exemplar: { scenarios: ['hyperkalemia'], leads: ['V2', 'V3', 'V4'] },
  },

  // ── prominent U waves ────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'u-waves',
    definition: l(
      'T波之后明显的波（≥1 mm或高于同导联T波），V2–V3最清楚，常见于低钾血症和某些药物。',
      'A prominent wave after the T (≥ 1 mm or taller than the T in the same lead), clearest in V2–V3, typical of hypokalaemia and some drugs.',
      'Onda prominente tras la T (≥ 1 mm o más alta que la T en la misma derivación), más clara en V2–V3, típica de la hipopotasemia y de algunos fármacos.',
    ),
    features: [
      l('看V2–V3 T波之后：下一个P波之前有一个独立的圆钝波。', 'Look after the T wave in V2–V3: a separate rounded wave before the next P.', 'Mira tras la onda T en V2–V3: una onda redondeada independiente antes de la siguiente P.'),
      l('振幅≥1 mm，或与同导联T波等高甚至更高，即为明显U波。', 'Prominent when ≥ 1 mm or as tall as (or taller than) the T in the same lead.', 'Es prominente si mide ≥ 1 mm o es tan alta como la T de la misma derivación (o más).'),
      l(
        '低钾时：T波低平、ST段轻度压低、T-U融合，类似长QT。',
        'With hypokalaemia: flat T, mild ST depression and a fused T–U wave that mimics a long QT.',
        'Con hipopotasemia: T aplanada, ligero descenso del ST y una onda T-U fusionada que simula un QT largo.',
      ),
      l('U波倒置属异常（缺血、左心室肥厚）。', 'Negative U waves are abnormal (ischaemia, LVH).', 'Las ondas U negativas son anormales (isquemia, HVI).'),
    ],
    criteria: [
      {
        label: l('正常U波', 'Normal U wave', 'Onda U normal'),
        value: l('小，与T波同向，通常远低于T波高度的四分之一', 'Small, same polarity as T, usually well under a quarter of its height', 'Pequeña, de la misma polaridad que la T, habitualmente muy por debajo de un cuarto de su altura'),
        source: 'Rautaharju 2009 (AHA/ACCF/HRS Part IV)',
      },
      {
        label: l('明显U波', 'Prominent U wave', 'Onda U prominente'),
        value: l('≥1 mm（0.1 mV）或≥同导联T波', '≥ 1 mm (0.1 mV) or ≥ T in the same lead', '≥ 1 mm (0,1 mV) o ≥ T en la misma derivación'),
        source: 'Rautaharju 2009; Diercks 2004',
      },
      {
        label: l('测量QT', 'QT measurement', 'Medición del QT'),
        value: l('不包括U波；量到T波终点（切线法）', 'Exclude the U wave; measure to the end of T (tangent method)', 'Excluye la onda U; mide hasta el final de la T (método de la tangente)'),
        source: 'Rautaharju 2009 (AHA/ACCF/HRS Part IV)',
      },
    ],
    mechanism: l(
      'U波可能反映部分心室区域的延迟复极或后电位，复极延长、T波变小时U波增大。低钾两者兼而有之，因此U波明显而T波低平。',
      'The U wave probably reflects late repolarization of some ventricular regions or after-potentials, and it grows when repolarization is prolonged and the T wave shrinks. Low potassium does both, so the U becomes prominent while the T flattens.',
      'La onda U probablemente refleja la repolarización tardía de algunas regiones ventriculares o pospotenciales, y crece cuando la repolarización se prolonga y la T se reduce. El potasio bajo produce ambas cosas, por lo que la U se hace prominente mientras la T se aplana.',
    ),
    mimics: [
      {
        id: 'long-qt',
        discriminator: l(
          '能找到T波终点时量到T波终点，QT可能正常；T-U融合无清晰T波终点时，报告QT-U延长并考虑低钾。',
          'If the end of T can be found, QT is measured to it and may be normal; a fused T–U wave with no clear T end is reported as QT–U prolongation, with hypokalaemia in mind.',
          'Si se encuentra el final de la T, el QT se mide hasta él y puede ser normal; una onda T-U fusionada sin final claro de la T se informa como prolongación QT-U, pensando en hipopotasemia.',
        ),
        leads: ['V2', 'V3'],
      },
      {
        id: 'pac-blocked',
        discriminator: l(
          '落在T波之后的未下传房性期前收缩P波可像U波；它是提前出现的，其后常有长间歇，而U波在每个T波后距离固定。',
          'A non-conducted premature P falling after the T can look like a U wave; it is premature and usually followed by a pause, whereas a U wave sits at a fixed distance after every T.',
          'Una P prematura no conducida que cae tras la T puede parecer una onda U; es prematura y suele seguirse de una pausa, mientras que la U está a distancia fija tras cada T.',
        ),
        leads: ['II', 'V1'],
      },
      {
        id: 'hypokalemia',
        discriminator: l(
          '明显U波伴T波低平和ST段压低指向低钾血症——检查血钾和血镁。',
          'A prominent U with a flat T and ST depression points to hypokalaemia — check potassium and magnesium.',
          'Una U prominente con T aplanada y descenso del ST orienta a hipopotasemia: determina potasio y magnesio.',
        ),
        leads: ['V2', 'V3'],
      },
    ],
    pitfalls: [
      l('把U波计入QT，过度诊断长QT。', 'Counting the U wave into the QT and over-calling long QT.', 'Incluir la onda U en el QT y sobrediagnosticar QT largo.'),
      l('没有仔细看“长QT”而漏诊低钾血症。', 'Missing hypokalaemia because the “long QT” was not looked at closely.', 'Pasar por alto una hipopotasemia por no mirar con atención el «QT largo».'),
    ],
    lessons: ['o1', 's4'],
    sources: [REF.rautaharju2009, REF.diercks2004],
    aka: ['U wave', 'onda U', 'U波'],
    exemplar: { scenarios: ['hypokalemia'], leads: ['V2', 'V3'] },
  },

  // ── Osborn (J) waves ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'osborn-waves',
    definition: l(
      'J点处的圆顶状或驼峰状波（J波），体温越低越大，是低体温的典型表现。',
      'A dome- or hump-shaped deflection at the J point (J wave) that grows as body temperature falls, typical of hypothermia.',
      'Deflexión en cúpula o joroba en el punto J (onda J) que crece al bajar la temperatura corporal, típica de la hipotermia.',
    ),
    features: [
      l('QRS与ST交界处的正向驼峰，Ⅱ和V3–V6最清楚。', 'A positive hump at the junction of QRS and ST, clearest in II and V3–V6.', 'Una joroba positiva en la unión del QRS con el ST, más clara en II y V3–V6.'),
      l('核心体温越低波越高，复温后消退。', 'Its height increases as core temperature falls and regresses with rewarming.', 'Su altura aumenta al bajar la temperatura central y regresa al recalentar.'),
      l('伴随表现：窦性心动过缓，PR、QRS、QT延长，寒战伪差，心房颤动。', 'Companions: sinus bradycardia, long PR, QRS and QT, shivering artefact, atrial fibrillation.', 'Acompañantes: bradicardia sinusal, PR, QRS y QT largos, artefacto por escalofríos, fibrilación auricular.'),
      l('J波的其他原因：高钙血症、脑损伤、早期复极、Brugada图形。', 'Other causes of J waves: hypercalcaemia, brain injury, early repolarization, Brugada pattern.', 'Otras causas de ondas J: hipercalcemia, lesión cerebral, repolarización precoz, patrón de Brugada.'),
    ],
    criteria: [
      {
        label: l('Osborn波', 'Osborn wave', 'Onda de Osborn'),
        value: l('J点偏移≥1 mm，与QRS同向，多见于核心体温低于约32 °C时', 'J-point deflection ≥ 1 mm in the direction of the QRS, usually at core temperature below about 32 °C', 'Deflexión del punto J ≥ 1 mm en la dirección del QRS, habitualmente con temperatura central por debajo de unos 32 °C'),
        source: 'Mattu 2002',
      },
      {
        label: l('低体温分级', 'Hypothermia grades', 'Grados de hipotermia'),
        value: l('轻度32–35 °C，中度28–32 °C，重度<28 °C', 'Mild 32–35 °C, moderate 28–32 °C, severe < 28 °C', 'Leve 32–35 °C, moderada 28–32 °C, grave < 28 °C'),
        source: 'Mattu 2002',
      },
    ],
    mechanism: l(
      '低温对心外膜瞬时外向钾电流的增强作用大于心内膜，使心外膜动作电位早期切迹加深。由此在QRS末形成的跨壁电压梯度描记出J（Osborn）波，其大小与降温程度相关。',
      'Cooling enhances the transient outward potassium current more in the epicardium than in the endocardium, deepening the early notch of the epicardial action potential. The resulting transmural voltage gradient at the end of the QRS draws a J (Osborn) wave whose size tracks the degree of cooling.',
      'El frío potencia la corriente transitoria de salida de potasio más en el epicardio que en el endocardio y profundiza la muesca precoz del potencial de acción epicárdico. El gradiente transmural de voltaje resultante al final del QRS dibuja una onda J (de Osborn) cuyo tamaño sigue el grado de enfriamiento.',
    ),
    mimics: [
      {
        id: 'early-repolarization',
        discriminator: l(
          '早期复极的J波小而稳定，见于体温正常、心率和QT正常的健康人。',
          'Early repolarization J waves are small and stable, in a warm, healthy person with a normal rate and QT.',
          'Las ondas J de la repolarización precoz son pequeñas y estables, en una persona sana, normotérmica, con frecuencia y QT normales.',
        ),
        leads: ['V4', 'V5', 'V6'],
      },
      {
        id: 'stemi-inferior',
        discriminator: l(
          'Osborn波为广泛分布的驼峰，无对应性ST压低、不符合冠脉分布；闭塞时ST抬高局限于某一区域并有对应性改变。',
          'Osborn waves are widespread humps without reciprocal ST depression or a territory; an occlusion gives territorial ST elevation with reciprocal change.',
          'Las ondas de Osborn son jorobas difusas sin descenso recíproco ni territorio; una oclusión da elevación territorial del ST con cambios recíprocos.',
        ),
        leads: ['II', 'III', 'aVF', 'aVL'],
      },
      {
        id: 'brugada-type1',
        discriminator: l(
          'Brugada 1型局限于V1–V2（穹窿样ST段下降至倒置T波）；Osborn波分布广泛且与体温相关。',
          'Brugada type 1 is limited to V1–V2 (coved ST into a negative T); Osborn waves are widespread and tied to temperature.',
          'El Brugada tipo 1 se limita a V1–V2 (ST en cúpula hacia una T negativa); las ondas de Osborn son difusas y dependen de la temperatura.',
        ),
        leads: ['V1', 'V2'],
      },
    ],
    pitfalls: [
      l(
        '把Osborn波当作急性心梗的ST段抬高，为体温过低的患者启动导管室。',
        'Reading Osborn waves as the ST elevation of acute MI and activating the cath lab for a cold patient.',
        'Interpretar las ondas de Osborn como elevación del ST de un IAM y activar la sala de hemodinámica en un paciente frío.',
      ),
      l('不测体温：普通体温计会漏诊重度低体温。', 'Not measuring the temperature: an ordinary thermometer misses severe hypothermia.', 'No medir la temperatura: un termómetro convencional no detecta la hipotermia grave.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '用低温体温计测量核心体温，轻柔搬动患者并复温；持续监护，因为可诱发室颤。',
        'Measure core temperature with a low-reading thermometer, move the patient gently and rewarm; monitor continuously because VF can be triggered.',
        'Mide la temperatura central con un termómetro de baja lectura, moviliza al paciente con suavidad y recaliéntalo; monitoriza de forma continua porque puede desencadenarse una FV.',
      ),
    },
    lessons: ['o5'],
    sources: [REF.mattu2002, REF.antzelevitch2016],
    aka: ['J wave', 'Osborn', 'camel hump', 'onda J', 'J波', 'Osborn波'],
    exemplar: { scenarios: ['hypothermia'], leads: ['II', 'V3', 'V4', 'V5'] },
  },

  // ── digoxin effect ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'digoxin-effect',
    definition: l(
      '服用地高辛者出现的下垂“鱼钩样”ST段压低、T波低平及QT缩短——代表用药，而非中毒。',
      'Sagging, scooped ST depression with low T waves and a short QT in a patient taking digoxin — a sign of exposure, not of toxicity.',
      'Descenso del ST cóncavo («en cubeta») con T bajas y QT corto en un paciente que toma digoxina: signo de exposición, no de toxicidad.',
    ),
    features: [
      l(
        'ST段呈弧形缓慢下降后回升（“反勾”），以R波高的导联（V4–V6、Ⅱ）最明显。',
        'Curved ST depression that falls gradually and returns (a “reverse tick”), clearest in leads with tall R (V4–V6, II).',
        'Descenso curvo del ST que baja gradualmente y vuelve a subir (en «cubeta»), más claro en derivaciones con R alta (V4–V6, II).',
      ),
      l('T波低平、低小或倒置；QT相对心率缩短。', 'Flat, low or inverted T; QT short for the rate.', 'T plana, baja o negativa; QT corto para la frecuencia.'),
      l('有时PR轻度延长、U波更明显。', 'Sometimes a mildly longer PR and a more prominent U wave.', 'A veces un PR algo más largo y una onda U más prominente.'),
      l(
        '中毒表现为心律失常（频发室早、二联律、双向性室速、房速伴阻滞、规则化的慢心室率房颤、房室阻滞），而非ST形态。',
        'Toxicity shows as arrhythmias (frequent PVCs, bigeminy, bidirectional VT, atrial tachycardia with block, regularized slow AF, AV block), not as the ST shape.',
        'La toxicidad se manifiesta con arritmias (extrasístoles frecuentes, bigeminismo, TV bidireccional, taquicardia auricular con bloqueo, FA lenta y regularizada, bloqueo AV), no con la forma del ST.',
      ),
    ],
    criteria: [
      {
        label: l('形态', 'Morphology', 'Morfología'),
        value: l('“鱼钩样”下垂ST段压低伴T波低平或倒置；QT缩短', 'Scooped, sagging ST depression with a low or inverted T; shortened QT', 'Descenso del ST en cubeta con T baja o negativa; QT acortado'),
        source: 'Rautaharju 2009 (AHA/ACCF/HRS Part IV)',
      },
      {
        label: l('运动试验', 'Exercise test', 'Prueba de esfuerzo'),
        value: l('地高辛使约25–40%健康人出现假阳性运动ST段压低', 'Digoxin causes false-positive exercise ST depression in roughly 25–40 % of healthy people', 'La digoxina produce descenso del ST de esfuerzo falso positivo en un 25–40 % de las personas sanas'),
        source: 'Gibbons 2002 (ACC/AHA exercise testing)',
      },
      {
        label: l('Romhilt–Estes', 'Romhilt–Estes', 'Romhilt-Estes'),
        value: l('服用洋地黄时ST-T计1分而非3分', 'ST–T scores 1 point instead of 3 in patients taking digitalis', 'El ST-T puntúa 1 en vez de 3 en pacientes que toman digital'),
        source: 'Romhilt 1968',
      },
    ],
    mechanism: l(
      '地高辛抑制钠钾泵，使细胞内钙升高并缩短心室动作电位平台期。复极提前且变得平缓，使ST段呈弧形下移并使QT缩短。',
      'Digoxin inhibits the sodium–potassium pump, raising intracellular calcium and shortening the plateau of the ventricular action potential. The earlier, more gradual repolarization pulls the ST segment down in a curve and shortens the QT.',
      'La digoxina inhibe la bomba de sodio y potasio, aumenta el calcio intracelular y acorta la meseta del potencial de acción ventricular. La repolarización, más precoz y gradual, arrastra el segmento ST hacia abajo en forma de curva y acorta el QT.',
    ),
    mimics: [
      {
        id: 'st-depression-ischemic',
        discriminator: l(
          '缺血性ST段压低呈水平或下斜型、动态变化且符合冠脉分布；地高辛的ST段呈弧形、广泛、稳定，伴QT缩短。',
          'Ischaemic ST depression is horizontal or downsloping, dynamic and territorial; the digoxin ST is curved, diffuse and stable, with a short QT.',
          'El descenso isquémico del ST es horizontal o descendente, dinámico y territorial; el ST digitálico es curvo, difuso y estable, con QT corto.',
        ),
        leads: ['V5', 'V6'],
      },
      {
        id: 'lvh-strain',
        discriminator: l(
          '左心室肥厚伴继发性ST-T改变需符合电压标准，ST段直线下斜进入不对称倒置T波；地高辛使ST呈弧形并伴QT缩短。',
          'LVH with secondary ST–T changes needs voltage criteria and slopes straight down into an asymmetric inverted T; digoxin curves the ST and shortens the QT.',
          'La HVI con alteraciones secundarias del ST-T exige criterios de voltaje y desciende en línea recta hacia una T negativa asimétrica; la digoxina curva el ST y acorta el QT.',
        ),
        leads: ['V5', 'V6', 'aVL'],
      },
      {
        id: 'hypokalemia',
        discriminator: l(
          '低钾使T波变低、U波增高、表观QT延长；地高辛使QT缩短。',
          'Hypokalaemia lowers the T and raises the U with an apparently long QT; digoxin shortens the QT.',
          'La hipopotasemia baja la T y eleva la U con un QT aparentemente largo; la digoxina acorta el QT.',
        ),
        leads: ['V2', 'V3'],
      },
    ],
    pitfalls: [
      l(
        '把洋地黄效应称为“中毒”：中毒是临床和心律诊断（结合血药浓度）。',
        'Calling digoxin effect “toxicity”: toxicity is a clinical and rhythm diagnosis (plus the drug level).',
        'Llamar «intoxicación» al efecto digitálico: la intoxicación es un diagnóstico clínico y del ritmo (más el nivel del fármaco).',
      ),
      l(
        '把“鱼钩样”ST段当作缺血，或为服用地高辛者做运动心电图评估缺血。',
        'Reading the scooped ST as ischaemia, or using an exercise ECG to look for ischaemia in a patient on digoxin.',
        'Interpretar el ST en cubeta como isquemia, o usar una ergometría para buscar isquemia en un paciente con digoxina.',
      ),
    ],
    lessons: ['o3'],
    sources: [REF.rautaharju2009, REF.gibbons2002, REF.romhilt1968],
    aka: ['digitalis effect', 'reverse tick', 'efecto digitálico', 'cubeta digitálica', '洋地黄效应', '鱼钩样ST'],
    exemplar: { scenarios: ['digoxin-effect'], leads: ['II', 'V5', 'V6'] },
  },

  // ── cerebral T waves ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'cerebral-t',
    definition: l(
      '急性颅内事件（如蛛网膜下腔出血）后出现的巨大、宽阔、多为倒置的T波，伴显著QT延长。',
      'Giant, broad, usually inverted T waves with marked QT prolongation after an acute intracranial event such as subarachnoid haemorrhage.',
      'Ondas T gigantes, anchas y habitualmente negativas, con prolongación marcada del QT, tras un evento intracraneal agudo como una hemorragia subaracnoidea.',
    ),
    features: [
      l(
        '很深（常≥5 mm）、宽阔的T波倒置，多累及胸导联，有时为巨大直立T波。',
        'Very deep (often ≥ 5 mm), wide T inversion, usually across the precordial leads; sometimes giant upright T waves.',
        'Inversión de la T muy profunda (a menudo ≥ 5 mm) y ancha, habitualmente en las precordiales; a veces T positivas gigantes.',
      ),
      l('QT显著延长，常伴明显U波。', 'Marked QT prolongation, often with prominent U waves.', 'Prolongación marcada del QT, a menudo con ondas U prominentes.'),
      l('临床背景：突发头痛、意识障碍、卒中、颅脑外伤。', 'Clinical context: sudden headache, reduced consciousness, stroke, head injury.', 'Contexto clínico: cefalea brusca, disminución del nivel de conciencia, ictus, traumatismo craneal.'),
      l(
        '可伴ST改变和肌钙蛋白升高（神经源性心肌顿抑），类似急性冠脉综合征。',
        'It can come with ST changes and troponin release (neurogenic stunning) that mimic an acute coronary syndrome.',
        'Puede acompañarse de cambios del ST y elevación de troponina (aturdimiento neurogénico) que simulan un síndrome coronario agudo.',
      ),
    ],
    criteria: [
      {
        label: l('T波', 'T waves', 'Ondas T'),
        value: l('多个胸导联深（常≥5 mm）而宽的T波倒置', 'Deep (often ≥ 5 mm), broad T inversion in several precordial leads', 'Inversión de la T profunda (a menudo ≥ 5 mm) y ancha en varias precordiales'),
        source: 'Rautaharju 2009 (AHA Part IV); Bayés de Luna 2014',
      },
      {
        label: l('QT', 'QT', 'QT'),
        value: l('显著延长，常QTc≥500 ms（尖端扭转风险）', 'Markedly prolonged, often QTc ≥ 500 ms (torsades risk)', 'Muy prolongado, a menudo QTc ≥ 500 ms (riesgo de torsade)'),
        source: 'Drew 2010; Rautaharju 2009',
      },
    ],
    mechanism: l(
      '受损大脑引发的交感神经活动骤增改变大片心室区域的复极，并可导致心肌顿抑。复极变得延长且不均一，从而产生宽而深的T波和长QT间期。',
      'A sudden surge of sympathetic activity from the injured brain changes repolarization over large ventricular regions and can stun the myocardium. Repolarization becomes long and uneven, which produces wide, deep T waves and a long QT.',
      'Una descarga simpática brusca desde el cerebro lesionado altera la repolarización de grandes regiones ventriculares y puede aturdir el miocardio. La repolarización se vuelve larga y heterogénea, lo que produce ondas T anchas y profundas y un QT largo.',
    ),
    mimics: [
      {
        id: 'wellens',
        discriminator: l(
          'Wellens的T波倒置局限于V2–V3（±V4），见于胸痛已缓解者，QT正常或轻度延长；脑型T波更宽、更广泛，QT极长。',
          'Wellens T inversion is limited to V2–V3 (± V4) after chest pain has settled, with a normal or mildly long QT; cerebral T waves are wider, more widespread and come with a very long QT.',
          'La inversión de Wellens se limita a V2–V3 (± V4) tras ceder el dolor torácico, con QT normal o algo largo; las T cerebrales son más anchas, más extensas y con un QT muy largo.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
      {
        id: 'apical-hcm',
        discriminator: l(
          '心尖肥厚型心肌病的巨大倒置T波稳定存在，V3–V5伴高R波；脑型T波随神经系统事件急性出现。',
          'Apical HCM gives stable giant T inversion with tall R waves in V3–V5; cerebral T waves appear acutely with a neurological event.',
          'La miocardiopatía hipertrófica apical da T negativas gigantes estables con R altas en V3–V5; las T cerebrales aparecen de forma aguda con un evento neurológico.',
        ),
        leads: ['V3', 'V4', 'V5'],
      },
      {
        id: 'takotsubo',
        discriminator: l(
          'Takotsubo综合征后期也有深倒置T波和长QT，常继发于情绪或躯体应激；超声可见心尖球形变。',
          'Takotsubo syndrome also shows deep T inversion and a long QT later on, after an emotional or physical trigger; the echo shows apical ballooning.',
          'El síndrome de tako-tsubo también muestra después T negativas profundas y QT largo, tras un desencadenante emocional o físico; la ecocardiografía muestra el abombamiento apical.',
        ),
        leads: ['V2', 'V3', 'V4', 'V5'],
      },
      {
        id: 't-inversion-ischemic',
        discriminator: l(
          '缺血性T波倒置符合冠脉分布区；脑型T波弥漫、宽阔且QT极长。',
          'Ischaemic T inversion follows a coronary territory; cerebral T waves are diffuse and broad with a very long QT.',
          'La inversión isquémica de la T sigue un territorio coronario; las T cerebrales son difusas y anchas, con un QT muy largo.',
        ),
        leads: ['V2', 'V3', 'V4'],
      },
    ],
    pitfalls: [
      l(
        '因T波倒置和肌钙蛋白升高把蛛网膜下腔出血患者送往导管室。',
        'Sending a patient with subarachnoid haemorrhage to the cath lab because of T inversion and a raised troponin.',
        'Enviar a hemodinámica a un paciente con hemorragia subaracnoidea por la T negativa y la troponina elevada.',
      ),
      l('忽视长QT：可发生尖端扭转。', 'Ignoring the long QT: torsades can occur.', 'Ignorar el QT largo: puede aparecer una torsade.'),
    ],
    urgency: {
      level: 'immediate',
      next: l(
        '想到大脑：评估意识和神经系统体征并尽快行头颅影像；因QT延长，需心电监护并纠正血钾和血镁。',
        'Think of the brain: assess consciousness and neurological signs and arrange urgent brain imaging; monitor the rhythm and correct potassium and magnesium because of the long QT.',
        'Piensa en el cerebro: valora el nivel de conciencia y los signos neurológicos y solicita una neuroimagen urgente; monitoriza el ritmo y corrige potasio y magnesio por el QT largo.',
      ),
    },
    lessons: ['o8'],
    sources: [REF.rautaharju2009, REF.bayesNegT2014, REF.drew2010],
    aka: ['cerebral T', 'neurogenic T', 'giant T inversion', 'T cerebrales', '脑型T波'],
    exemplar: { scenarios: ['cerebral-t'], leads: ['V2', 'V3', 'V4', 'V5'] },
  },
];
