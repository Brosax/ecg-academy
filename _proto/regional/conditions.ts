/**
 * Benchmark conditions. Each is the normal parameter set plus overrides of: rhythm, conduction, regional AP
 * parameters, geometry. Nothing here touches a lead or a waveform.
 *
 * Region ids: AHA LV segments b_/m_/a_ + ant, antsep, infsep, inf, inflat, antlat (a_: ant, sep, inf, lat), apex;
 * RV: rv_apex, rv_ant, rv_free, rv_inf, rvot. Faces: IN = endocardial (septum: LV side), OUT = epicardial (septum: RV side).
 */
import type { Condition, RegionMod } from './model.ts';

/** Same modification applied to several regions. */
function many(ids: string[], m: RegionMod): Record<string, RegionMod> {
  const out: Record<string, RegionMod> = {};
  for (const id of ids) out[id] = { ...m };
  return out;
}

const SINUS_72 = { kind: 'sinus', hr: 72, pr: 160, rsa: 0.025 } as const;

export const CONDITIONS: Record<string, Condition> = {
  normal: {
    id: 'normal',
    rhythmLabel: 'sinus rhythm',
    rhythm: { ...SINUS_72 },
  },

  rbbb: {
    id: 'rbbb',
    rhythmLabel: 'sinus rhythm, complete right bundle branch block',
    rhythm: { ...SINUS_72 },
    // the right bundle conducts nothing: the RV is reached only through the septum and the junctions, by plain muscle
    // (no RV Purkinje engagement → RV endocardial spread at myocardial speed, and the front must cross the whole RV
    // wall — trabecular + compact layers — instead of only the compact layer behind Purkinje-activated trabeculae)
    vcond: {
      blocked: { RBB: true },
      vRvEndo: 0.06,
      wall: { rv_apex: 0.5, rv_free: 0.5, rv_ant: 0.5, rv_inf: 0.5, rvot: 0.5 },
      // Review: the RV free wall is crossed by one front through plain muscle; it reaches the tricuspid annulus / outflow
      // over a spread of times (front dispersion 4: the far end of the sweep is 5× wider) → the terminal S in I, V5, V6
      // tapers (slurred S) instead of ending as a flat-bottomed box.
      sweepDisp: 4,
    },
    // Review: phase-2 slope as in LBBB (plateau decline 0.25 per 200 ms): the late RV is still high on its plateau when
    // the early LV has declined → secondary ST ↓ in V1–V2 and lateral T 8–10 → 5–6.5 mm (the late-RV repolarisation
    // excess was carried entirely by the T wave before).
    vrep: { plat: 0.25 },
  },

  lbbb: {
    id: 'lbbb',
    rhythmLabel: 'sinus rhythm, complete left bundle branch block',
    rhythm: { ...SINUS_72 },
    // all three left fascicles blocked proximally: the LV is entered across the septum (slow transverse conduction,
    // R→L), then spreads along the LV endocardium (distal Purkinje still aids subendocardial spread) and endo → epi
    vcond: {
      blocked: { LSF: true, LAF: true, LPF: true },
      // transseptal (transverse) conduction is slow, slowest through the thick basal septum
      regionSpeed: { a_sep: 0.8, m_antsep: 0.6, m_infsep: 0.6, b_antsep: 0.45, b_infsep: 0.45 },
      vEndo: 0.1,
    },
    // Review: phase-2 slope (plateau decline 0.25 per 200 ms). With a 150 ms activation spread, the early-activated
    // septum / RV have declined further than the late LV free wall at the J point → discordant ST shift (ST ↑ V1–V3,
    // ST ↓ I, aVL, V5, V6) instead of a discordance carried by the T wave alone. In the compact normal activation the
    // same slope would shift J by < 0.5 mm, which the normal calibration (plat 0) absorbed.
    vrep: { plat: 0.25 },
  },

  'anterior-stemi': {
    id: 'anterior-stemi',
    rhythmLabel: 'sinus rhythm, acute anterior ST-elevation myocardial infarction (proximal LAD)',
    rhythm: { kind: 'sinus', hr: 84, pr: 160, rsa: 0.02 },
    // transmural injury in the proximal-LAD territory: the injured cells' plateau is depressed (systolic injury current
    // → ST vector toward the anterior wall) and their APD shortened (K-ATP: hyperacute, broad T toward the injury).
    // Review: proximal LAD = before the first septal branch → the basal anteroseptum is part of the full-thickness
    // injury (V1 ST 0.9 → 1.1 mm); the mid anterolateral wall (V5–V6 territory) is left out (V5 2.2 → 1.6, V6 0).
    regions: {
      ...many(['m_ant', 'm_antsep', 'a_ant', 'a_sep', 'apex', 'b_antsep'], { amp: 0.62, dApd: -45 }),
      ...many(['b_ant', 'a_lat'], { amp: 0.8, dApd: -25 }),
    },
  },

  'inferior-stemi': {
    id: 'inferior-stemi',
    rhythmLabel: 'sinus rhythm, acute inferior ST-elevation myocardial infarction (RCA)',
    rhythm: { kind: 'sinus', hr: 66, pr: 170, rsa: 0.02 },
    // dominant RCA: inferior wall (PDA), inferolateral wall (posterolateral branch) and the inferior RV wall (rightward
    // component of the injury vector → III > II, aVL most depressed), lighter injury at the apex, the basal inferior
    // septum and the RV apex
    // Review: the dominant RCA's posterolateral branch also makes the basal + mid inferolateral ("posterior") wall part
    // of the full-thickness injury, and the septum is spared beyond its basal inferior third. The injury vector then has
    // its posterior component (ST ↓ V1–V3, the posterior-wall mirror image) instead of a rightward one (diffuse
    // ST ↓ V2–V6 before, including V5–V6, which face the lateral wall).
    regions: {
      ...many(['b_inf', 'm_inf', 'a_inf', 'b_inflat', 'm_inflat', 'rv_inf'], { amp: 0.62, dApd: -40 }),
      ...many(['apex', 'b_infsep', 'rv_apex'], { amp: 0.8, dApd: -25 }),
    },
  },

  'lvh-strain': {
    id: 'lvh-strain',
    rhythmLabel: 'sinus rhythm, left ventricular hypertrophy with repolarisation abnormality (strain)',
    rhythm: { kind: 'sinus', hr: 70, pr: 170, rsa: 0.02 },
    // pressure-overload LV hypertrophy: bigger, thicker LV (more source area) …
    // Review: the hypertrophied heart lies more horizontally — long axis rotated 12° toward the horizontal in the
    // frontal plane (apexDir [0.62, −0.5, 0.6] → [0.71, −0.36, 0.6]): taller R in I / aVL, leftward axis tendency.
    heart: { lvRin: 2.6, lvHin: 7.2, lvWall: 1.5, lvApexWall: 1.1, septWall: 1.15, apexDir: [0.71, -0.36, 0.6] },
    // … thickest in the lateral / posterolateral wall (longer transmural activation there → taller leftward-posterior
    // forces, later intrinsicoid deflection, mild leftward shift of the axis)
    vcond: {
      wall: { b_inflat: 1.7, m_inflat: 2.0, b_antlat: 2.1, m_antlat: 2.0, a_lat: 1.7, b_inf: 1.5, m_inf: 1.4, a_inf: 1.0, b_ant: 1.4, m_ant: 1.5, a_ant: 1.7, apex: 1.0 },
      // interstitial fibrosis of the hypertrophied myocardium slows transmural conduction a little
      vT: 0.041,
    },
    // strain: subendocardial supply/demand ischaemia of the thick lateral wall → endocardial plateau depressed and the
    // transmural APD gradient reversed (endocardium repolarises first) → ST depression + asymmetric T inversion.
    // Review: confined to the thick lateral / inferolateral wall (the anterior wall and apex were also ischaemic before:
    // strain T −7…−8 mm and +10 mm reciprocal T in III). Much of the T inversion is secondary anyway — the 2 cm lateral
    // wall takes longer to cross than the normal endo–epi APD difference.
    regions: many(['b_antlat', 'm_antlat', 'a_lat', 'b_inflat', 'm_inflat'], { ampIn: 0.85, dApdIn: -30, plat: 0.15 }),
  },

  wpw: {
    id: 'wpw',
    rhythmLabel: 'sinus rhythm, ventricular pre-excitation (WPW pattern, left lateral accessory pathway)',
    // accessory pathway from the lateral mitral annulus (LA) into the basal lateral LV epicardium (insertion fans into the
    // anterolateral and inferolateral basal faces); AV node normal, so the QRS is a fusion of pre-excitation and His–Purkinje
    rhythm: { kind: 'sinus', hr: 75, pr: 150, rsa: 0.02, ap: { face: 'b_antlat:OUT,b_inflat:OUT', site: 'la_ant', delay: 50, h: 14, at: 'base' } },
  },

  'brugada-type1': {
    id: 'brugada-type1',
    rhythmLabel: 'sinus rhythm, Brugada type 1 pattern',
    rhythm: { kind: 'sinus', hr: 68, pr: 170, rsa: 0.02 },
    // Ito-rich anterior RV / outflow epicardium (the free wall under V1–V2): loss of the AP dome (deep phase-1 notch
    // that recovers slowly) and a longer epicardial APD → transmural voltage gradient during the plateau (coved J-ST
    // elevation, no reciprocal change) and inverted transmural repolarisation gradient (negative T) in V1–V2 only.
    // The anterior free wall faces the chest, so its plateau dipole projects on V1–V2 and hardly on the limb leads.
    // The affected epicardium spans the anterior RV free wall and outflow tract (+ a little of the apical RV): their
    // outward normals point anteriorly with opposing left/right and up/down components, so the plateau dipole is
    // directed at V1–V2 and nearly cancels in the frontal plane (no reciprocal ST depression in the limb leads).
    regions: {
      ...many(['rv_free', 'rv_ant', 'rvot'], { notchOut: { depth: 0.1, d1: 0, d2: 280 }, dApdOut: 13 }),
      rv_apex: { notchOut: { depth: 0.05, d1: 0, d2: 280 }, dApdOut: 6 },
    },
  },

  aflutter: {
    id: 'aflutter',
    rhythmLabel: 'typical (counter-clockwise) atrial flutter with 4:1 AV conduction',
    // Review: FR 270 → 310 ms after the circuit change (model.ts): the F wave superimposed on the QRS then leaves the
    // signal-measured axis within 5° of the ventricular truth (the measured axis swings 16–70° with the F–R phase)
    rhythm: { kind: 'flutter', cl: 200, ratio: 4, fr: 310 },
  },

  hyperk: {
    id: 'hyperk',
    rhythmLabel: 'sinus rhythm, moderate hyperkalaemia',
    rhythm: { kind: 'sinus', hr: 70, pr: 200, rsa: 0.02 },
    // high [K]o: IKr / IK1 up → fast, steep phase 3 and shorter APD, shortened most where IK is densest (apex) so the
    // apex–base repolarisation gradient grows; less excitable tissue → slower conduction everywhere; atrial muscle is
    // the most K-sensitive → low, wide P waves.
    // Review: with a steep phase 3 the 44 faces repolarise as separate steps (bifid / notched T in I, III, aVL, V1, V6
    // at τ 7). The apex→base gradient is therefore continued inside each face (gABin 1: patch-level APD) and the
    // electrotonic APD–activation coupling is switched on (couple 0.25: late-activated base shortens), so repolarisation
    // is a continuum again; τ 12 is still half the normal 24 → narrow-based, tented T.
    vrep: { tau: 12, spread: 10, apd0: 240, gAB: 65, gABin: 1, couple: 0.25 },
    vcond: { vT: 0.034, vEndo: 0.065, vEpi: 0.038, pmjScale: 1.4 },
    atria: { gain: 0.45, vScale: 0.8 },
  },

  afib: {
    id: 'afib',
    rhythmLabel: 'atrial fibrillation',
    // Review: fGain 0.7 → 1.1 (f waves 0.7 → 1.2 mm peak-to-peak in V1: still "fine" AF, but visible where the
    // textbook says to look)
    rhythm: { kind: 'af', meanRR: 600, minRR: 380, fCL: 145, fGain: 1.1 },
  },

  vt: {
    id: 'vt',
    rhythmLabel: 'monomorphic ventricular tachycardia (LV inferolateral origin) with AV dissociation',
    // re-entrant exit on the mid inferolateral LV endocardium: the ventricles are activated by muscle from there
    // (no His–Purkinje participation) → wide QRS, front toward the RV (RBBB-like, V1 positive), inferior → superior
    // (north-west axis); the sinus node keeps firing at 80/min independently (AV dissociation)
    rhythm: { kind: 'vt', rate: 170, origin: 'm_inflat:IN', originH: 4, originAt: 'centre', sinusHr: 80 },
    // no Purkinje assistance of the endocardial spread (the front runs through working myocardium).
    // Review: the septum is crossed from the LV side by plain muscle (slow transverse conduction, as in LBBB, slowest in
    // the thick basal septum) and the RV apex is entered without its moderator-band Purkinje (slow), after which the RV
    // Purkinje network is engaged retrogradely (fast RV endocardial spread). Before, the whole septum crossed in ~20 ms
    // and made a narrow 15 mm spike in V1–V3 inside the 170 ms complex; now V1–V2 show the broad monophasic R of an
    // RBBB-like VT.
    vcond: {
      vEndo: 0.075,
      vRvEndo: 0.15,
      regionSpeed: { a_sep: 0.75, m_antsep: 0.7, m_infsep: 0.7, b_antsep: 0.6, b_infsep: 0.6, rv_apex: 0.5 },
      // front dispersion inside the swept faces (as in RBBB): fewer sharp transients in the complex
      sweepDisp: 2,
    },
    // sinus P waves (upper-normal amplitude) keep marching through at 80/min, unrelated to the QRS
    atria: { gain: 1.4 },
  },
};

export const BENCHMARK_IDS = ['normal', 'rbbb', 'lbbb', 'anterior-stemi', 'inferior-stemi', 'lvh-strain', 'wpw', 'brugada-type1', 'aflutter', 'hyperk', 'afib', 'vt'];
