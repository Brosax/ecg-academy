import type { TourKey } from './zh';

export const en: Record<TourKey, string> = {
  'tour.title': 'Guided tour: one heartbeat in ten steps',
  'tour.intro':
    'Ten steps through one heartbeat, from the SA-node discharge to diastole. Each step sets the cross-section, highlights the structures involved, selects a key lead and plays the matching time window once in slow motion, stopping on its last frame.',
  'tour.start': 'Start the tour',
  'tour.exit': 'Exit tour',
  'tour.prev': 'Previous step',
  'tour.next': 'Next step',
  'tour.finish': 'Finish',
  'tour.progress': 'Step {n} of {total}',
  'tour.dots': 'Tour progress',
  'tour.goto': 'Go to step {n}: {title}',
  'tour.loop': 'Playing this window ({ms} ms) once at {speed}×; it stops on the last frame',
  'tour.ended': 'Stopped on the last frame of this window ({ms} ms)',
  'tour.looping': 'Auto-loop: {speed}× ({ms} ms), with a 1.5 s pause after each pass',
  'tour.replay': 'Replay this step',
  'tour.autoLoop': 'Auto-loop',
  'tour.keyMoment': 'Model explanation at this step’s key moment (pause to see the current instant)',
  'tour.lead': 'Key lead: {lead}',
  'tour.keys': 'When the tour panel has focus, use ← / → to change steps and Esc to exit.',
  'tour.live': 'Model explanation right now',
  'tour.unavailable': 'The current cycle has no model data for this window yet — play for a few seconds and try again.',

  'step.sa.title': '1. The SA node fires',
  'step.sa.body':
    'Every heartbeat starts in the sinoatrial node, which lies in the terminal groove at the junction of the superior vena cava and the right atrium; its cells depolarize spontaneously. The node is too small for its discharge to be seen on the surface ECG — it happens just before the P wave begins. Watch the roof of the right atrium in 3D: the impulse starts here.',
  'step.atria.title': '2. Atrial depolarization = P wave',
  'step.atria.body':
    "The impulse spreads through atrial muscle at about 0.8–1.0 m/s: right atrium first, then through Bachmann's bundle to the left atrium, ending in the left atrial appendage, in roughly 80–110 ms. The first part of the P wave comes mainly from the right atrium, the last part from the left atrium. The mean atrial vector points leftward and inferiorly, so P is upright in lead II. The atria start to contract about 40–60 ms later.",
  'step.avDelay.title': '3. AV-node delay = PR segment',
  'step.avDelay.body':
    "The fibrous ring between atria and ventricles is an electrical insulator; the AV node, at the apex of Koch's triangle, is the only way into the ventricles. Conduction through it is slow (about 0.02–0.05 m/s), causing a delay of about 50–120 ms (AH interval) that lets atrial contraction fill the ventricles. The node contains few cells, so the surface ECG stays flat.",
  'step.hisPurkinje.title': '4. His bundle, bundle branches and Purkinje fibres',
  'step.hisPurkinje.body':
    'The impulse crosses the central fibrous body in the bundle of His, which divides into the left bundle branch (with anterior, posterior and septal fascicles) and the right bundle branch (reaching the anterior papillary muscle through the moderator band), and then enters the subendocardial Purkinje network (2–4 m/s). His bundle to ventricular muscle takes about 35–55 ms (HV interval). These fibres are also too thin to show up, so the PR segment stays isoelectric.',
  'step.septum.title': '5. The septum goes first = start of QRS',
  'step.septum.body':
    'Branches of the left bundle reach the middle of the left septal surface first, so the septum depolarizes from left to right and the vector points rightward and anteriorly. This produces a small r wave in V1 and small q waves in I, aVL, V5 and V6 ("septal q waves"). Watch the short-axis cut: the wavefront crosses the septum from the left-ventricular side.',
  'step.apexFreeWalls.title': '6. Apex and free walls = main deflection',
  'step.apexFreeWalls.body':
    'The Purkinje network lets the apex and the free walls of both ventricles depolarize almost simultaneously, from endocardium to epicardium. The thicker left ventricle dominates and the vector points leftward, inferiorly and posteriorly: tall R waves in II, V5 and V6 and a deep S wave in V1. The right-ventricular epicardium breaks through first, about 20–25 ms after QRS onset. Around now the mitral and tricuspid valves close (first heart sound) and isovolumic contraction begins.',
  'step.baseRvot.title': '7. Base and RV outflow tract = terminal deflection',
  'step.baseRvot.body':
    'The posterobasal left ventricle and the right ventricular outflow tract, which the Purkinje network does not cover, are activated last (about 60–90 ms after QRS onset). The remaining vector is small and turns posteriorly and superiorly, producing the small terminal s wave in I, V5 and V6. Then all ventricular muscle is depolarized and the QRS ends.',
  'step.plateau.title': '8. Plateau = ST segment',
  'step.plateau.body':
    'Ventricular cells are in the plateau of the action potential: all of them are depolarized at a similar potential, there is no net voltage difference, the heart vector is close to zero and the ST segment lies on the baseline. Mechanically, the aortic and pulmonary valves are open and the ventricles are ejecting. Any shift of the ST segment from the baseline is an important sign of myocardial injury.',
  'step.repolarization.title': '9. Ventricular repolarization = T wave',
  'step.repolarization.body':
    'Epicardial action potentials are shorter than endocardial ones, and apical ones shorter than basal ones, so repolarization moves from epicardium to endocardium and from apex to base. Both its direction of travel and the polarity of its front are opposite to depolarization; the two reversals cancel, so the normal T wave points the same way as the main QRS deflection. The aortic valve closes around the end of T (second heart sound).',
  'step.diastole.title': '10. Diastole = TP segment',
  'step.diastole.body':
    'Atria and ventricles are back at their resting potential with no electrical activity; the TP segment is the best place to judge the baseline. Mechanically, the ventricles relax isovolumically, then the mitral and tricuspid valves open and blood fills the ventricles until the SA node fires again.',
};
