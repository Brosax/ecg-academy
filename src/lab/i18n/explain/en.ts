import type { ExplainKey } from './zh';

export const en: Record<ExplainKey, string> = {
  'dir.left': 'leftward',
  'dir.right': 'rightward',
  'dir.inferior': 'inferiorly',
  'dir.superior': 'superiorly',
  'dir.anterior': 'anteriorly',
  'dir.posterior': 'posteriorly',
  'dir.join1': '{a}',
  'dir.join2': '{a} and {b}',
  'dir.join3': '{a}, {b} and {c}',
  'list.sep': ', ',
  'sentence.sep': ' ',

  'ctx.P':
    'During the P wave: the SA node fires and the atria depolarize from right to left (the first part of P comes mainly from the right atrium, the last part from the left atrium).',
  'ctx.PR':
    'During the PR segment: the impulse is delayed in the AV node, then runs quickly down the His bundle, the bundle branches and the Purkinje fibres; these structures are too small to register on the body-surface ECG.',
  'ctx.QRS.early': 'Early QRS: the interventricular septum depolarizes first, the wavefront crossing it from left to right.',
  'ctx.QRS.mid':
    'Mid QRS: the apex and the free walls of both ventricles depolarize from endocardium to epicardium; the left ventricle dominates.',
  'ctx.QRS.late':
    'Late QRS: the last regions to depolarize are the posterobasal left ventricle and the right ventricular outflow tract.',
  'ctx.ST': 'During the ST segment: all ventricular myocardium is in the plateau phase at a similar potential.',
  'ctx.T': 'During the T wave: the ventricles repolarize — epicardium before endocardium, apex before base.',
  'ctx.TP': 'During the TP segment: atria and ventricles are at rest (electrical diastole).',
  'ctx.none': 'This instant is not inside a known segment of a complete cardiac cycle.',

  // short forms of ctx.* for the one-sentence caption under the heart (≤ 110 characters)
  'cap.P': 'P wave: the SA node fires and the atria depolarize from right to left.',
  'cap.PR': 'PR segment: the AV node delays the impulse and His–Purkinje conducts it, with no visible signal on the ECG.',
  'cap.QRS.early': 'Early QRS: the interventricular septum depolarizes first, the wavefront crossing it from left to right.',
  'cap.QRS.mid': 'Mid QRS: apex and free walls depolarize from endocardium to epicardium; the left ventricle dominates.',
  'cap.QRS.late': 'Late QRS: the posterobasal left ventricle and the RV outflow tract depolarize last.',
  'cap.ST': 'During the ST segment: all ventricular myocardium is in the plateau phase at a similar potential.',
  'cap.T': 'During the T wave: the ventricles repolarize — epicardium before endocardium, apex before base.',
  'cap.TP': 'During the TP segment: atria and ventricles are at rest (electrical diastole).',
  'cap.none': 'This instant is not inside a known segment of a complete cardiac cycle.',
  'active.list': 'Structures active now: {list}.',

  'h.zero': 'The heart vector is almost zero ({mag} mV): there is no net voltage difference inside the heart.',
  'h.dir': 'The heart vector H points {dirs} (frontal-plane angle {ang}, horizontal-plane angle {hang}); magnitude {mag} mV.',
  'lead.axis.limb': 'The axis of lead {lead} (toward its positive pole) points {dirs} (frontal-plane angle {ang}); sensitivity |L| = {mag}.',
  'lead.axis.prec': 'The axis of lead {lead} (toward its positive pole) points {dirs} (horizontal-plane angle {hang}); sensitivity |L| = {mag}.',
  'proj': 'The angle between H and the lead axis is {theta}° → projection = |H|·|L|·cos θ = {v} mV.',
  'iso.perp': 'H is almost perpendicular to this lead axis, so the projection is close to zero.',
  'iso.small': 'The projection is too small to see on the tracing.',
  'iso.zero': 'With no heart vector, every lead sits on the baseline.',
  'defl.result': '→ Lead {lead}: {word}{wave}.',
  'word.up': 'upward (positive) deflection',
  'word.down': 'downward (negative) deflection',
  'word.iso': 'near-isoelectric',
  'wave.is': ' — this is {name}',
  'wn.P': 'the P wave',
  'wn.T': 'the T wave',
  'wn.Q': 'a Q wave',
  'wn.q': 'a small q wave',
  'wn.R': 'the R wave',
  'wn.r': 'a small r wave',
  'wn.R2': 'the R′ wave',
  'wn.r2': 'a small r′ wave',
  'wn.S': 'the S wave',
  'wn.s': 'a small s wave',
  'wn.QS': 'a QS complex',
  'angles.note': 'Angle conventions: frontal plane 0° = left, +90° = inferior; horizontal plane 0° = left, +90° = anterior.',

  'segx.P':
    "The P wave is atrial depolarization. The impulse starts in the SA node at the junction of the superior vena cava and the right atrium, activates the right atrium first, reaches the left atrium through Bachmann's bundle and ends in the left atrial appendage. The mean atrial vector points leftward and inferiorly, so P is upright in I, II and aVF, inverted in aVR and often biphasic in V1.",
  'segx.PR':
    'The PR segment is isoelectric: the impulse crosses the AV node slowly (about 0.02–0.05 m/s), giving the atria time to contract and fill the ventricles; it then runs quickly through the His bundle, the bundle branches and the Purkinje fibres (HV interval about 35–55 ms). These conducting tissues are too small to produce a visible wave on the body-surface ECG.',
  'segx.QRS':
    'The QRS complex is ventricular depolarization. The left side of the septum is activated first and the wavefront crosses the septum from left to right, so the vector points rightward and anteriorly: small q waves in I, aVL and V5–V6 and a small r wave in V1. Next the apex and both free walls depolarize from endocardium to epicardium; the left ventricle dominates and the vector points leftward, inferiorly and posteriorly, giving the main R wave in II, V5 and V6 and the deep S wave in V1. The posterobasal left ventricle and the right ventricular outflow tract are activated last; the vector turns posteriorly and superiorly and produces the terminal s wave.',
  'segx.ST':
    'The ST segment corresponds to the plateau of the action potential: all ventricular cells are depolarized at a similar potential, so there is no net voltage difference, the heart vector is close to zero and the ST segment lies on the baseline.',
  'segx.T':
    'The T wave is ventricular repolarization. Epicardial action potentials are shorter than endocardial ones, and apical ones shorter than basal ones, so repolarization spreads from epicardium to endocardium — opposite to depolarization. Because the repolarization front also has the opposite polarity, the two reversals cancel: the repolarization vector points roughly the same way as the depolarization vector and the normal T wave is concordant with the QRS.',
  'segx.TP':
    'The TP segment is electrical diastole: atria and ventricles are at their resting potential with no electrical activity — the best place to judge the baseline. Mechanically, the ventricles relax isovolumically and then fill.',
  'segx.structs': 'Structures involved: {list}.',
  'segx.dur': 'In this beat it lasts about {ms} ms.',
  'segx.mech': 'Simultaneous mechanical events: {list}.',

  'm.p': "P wave {shape} (peak {peak} mV): the mean atrial vector points {dirs}, {theta}° from this lead's axis.",
  'm.qrs':
    "QRS pattern {pattern}, predominantly {main}: the mean QRS vector points {dirs} (frontal-plane angle {ang}), {theta}° from this lead's axis (< 90° → positive, > 90° → negative).",
  'm.t': 'T wave {shape} (peak {peak} mV), {conc}; spatial QRS–T angle {qrst}°.',
  'm.none': 'No complete cardiac cycle is available yet.',
  'shape.up': 'upright',
  'shape.down': 'inverted',
  'shape.biphasic': 'biphasic',
  'shape.flat': 'flat',
  'main.pos': 'positive',
  'main.neg': 'negative',
  'main.equi': 'equiphasic',
  'conc.yes': 'concordant with the main QRS deflection',
  'conc.no': 'discordant with the main QRS deflection',
  'conc.na': 'the QRS is equiphasic, so concordance is undefined',
};
