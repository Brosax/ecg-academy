// conditions.ts — every condition is ONLY a parameter change of the one model: rhythm generator, conduction graph,
// regional AP / APD / velocity parameters, or geometry. No per-lead waveform edits exist anywhere.
import { defaultParams, sel, angWin, smoothstep } from './model.ts';
import type { Params, Sites } from './model.ts';
import { CH, SF } from './geom.ts';

export interface Condition { rhythm: string; params(seed: number): Params; }

// ---- anatomical territories (weights 0..1 over myocardial nodes) -------------------------------------------------
// th: angle around the LV long axis (0 lateral, 90 anterior, 180 septal, -90 inferior); ab: 0 apex .. 1 base; tm: 0 endo .. 1 epi
// LAD (proximal, before the first diagonal and septal branches): anterior and anterolateral wall, anterior 2/3 of the
// septum, the anterior half of the apex, and the adjacent anterior RV wall (weights 0..1, soft borders)
export const ladProx = (s: Sites, i: number): number => {
  const g = s.g; const th = g.th[i], ab = g.ab[i];
  if (g.ch[i] !== CH.LV && g.ch[i] !== CH.RV) return 0;
  const wall = angWin(th, 40, 200, 30) * smoothstep(0.2, 0.3, ab);
  const apex = (1 - smoothstep(0.3, 0.45, ab)) * angWin(th, 30, 200, 40);
  return Math.max(wall, apex) * (g.ch[i] === CH.RV ? 0.5 : 1);
};
// RCA (dominant): inferior LV wall from apex to base, inferior septum, and the RV free wall (RV branches)
export const rcaDom = (s: Sites, i: number): number => {
  const g = s.g; const th = g.th[i];
  if (g.ch[i] !== CH.LV && g.ch[i] !== CH.RV) return 0;
  return angWin(th, -180, -40, 30) * (g.ch[i] === CH.RV ? 0.5 : 1);
};
const endoLayer = (lo: number, hi: number) => (s: Sites, i: number) => (s.g.ch[i] === CH.LV && !(s.g.sf[i] & SF.SEPTAL) ? 1 - smoothstep(lo, hi, s.g.tm[i]) : 0);
// Brugada substrate: subepicardium (outer ~2/3 of the wall) of the RVOT and of the adjoining anterior RV free wall that
// lies under the right/left parasternal 3rd-4th intercostal spaces. Selected by body position (mm; +x left, +y up,
// +z anterior): anterior RV free wall (z > 42, -10 < x < 35, y > -30) plus the infundibulum, both below the level of
// the pulmonary valve region (y < 12). The high infundibulum is left out: being superior, it projects the J-wave
// current onto the inferior leads (reciprocal ST depression in II/aVF, which Brugada does not show).
const brugadaEpi = (s: Sites, i: number) => {
  const g = s.g; if (g.ch[i] !== CH.RV) return 0;
  const x = g.pos[3 * i], y = g.pos[3 * i + 1], z = g.pos[3 * i + 2];
  const epi = smoothstep(0.15, 0.5, g.tm[i]) * (1 - smoothstep(4, 12, y));
  if (g.sf[i] & SF.RVOT) return epi;
  return epi * smoothstep(-30, -22, y) * smoothstep(42, 50, z) * smoothstep(-10, -2, x) * (1 - smoothstep(27, 35, x));
};

export const CONDITIONS: Record<string, Condition> = {
  normal: {
    rhythm: 'sinus rhythm',
    params: () => defaultParams(),
  },
  rbbb: {
    rhythm: 'sinus rhythm, complete right bundle branch block',
    // right bundle blocked; the RV is reached across the septum, after which the wave engages the (intact, resting)
    // RV Purkinje network retrogradely
    params: () => { const p = defaultParams(); p.fasc.rbb = null; p.pmjRetro = 4.4; p.retroLV = false; return p; },
  },
  lbbb: {
    rhythm: 'sinus rhythm, complete left bundle branch block',
    // left bundle blocked: the LV is reached across the septum from the RV. When that wave arrives at the left septal
    // endocardium it enters the intact distal left Purkinje network (retrograde muscle -> Purkinje coupling, 10 ms)
    // and the LV free wall is then activated endocardium -> epicardium, late; the LV myocardium conducts 20 % slower
    // (LBBB usually comes with myocardial disease). Result: broad notched lateral R with discordant ST-T.
    params: () => {
      const p = defaultParams(); p.fasc.lsf = null; p.fasc.laf = null; p.fasc.lpf = null;
      p.pmjRetro = 10; p.retroLV = true; p.retroRV = false;
      p.mods.push({ sel: sel.lv, vScale: 0.8 });
      return p;
    },
  },
  'anterior-stemi': {
    rhythm: 'sinus rhythm, acute anterior ST-elevation myocardial infarction',
    params: () => {
      const p = defaultParams();
      // transmural ischaemia in the proximal-LAD territory: partially depolarised rest, low plateau, short APD,
      // slowed upstroke and conduction. The APD shortening is the larger effect (early, hyperacute phase): it makes the
      // elevated ST rise into a tall broad T instead of a flat-topped plateau
      p.mods.push({ sel: ladProx, rest: 0.17, amp: 0.72, apdAdd: -65, cls: 3, vScale: 0.85 });
      return p;
    },
  },
  'inferior-stemi': {
    rhythm: 'sinus rhythm, acute inferior ST-elevation myocardial infarction',
    params: () => {
      const p = defaultParams();
      p.mods.push({ sel: rcaDom, rest: 0.22, amp: 0.5, apdAdd: -45, cls: 3, vScale: 0.85 });
      return p;
    },
  },
  'lvh-strain': {
    rhythm: 'sinus rhythm, left ventricular hypertrophy with repolarisation abnormality',
    params: () => {
      const p = defaultParams();
      // concentric hypertrophy: thicker LV wall (geometry: more myocardium -> larger, later LV forces; the thick wall
      // also takes longer to cross), plus "strain": relative subendocardial ischaemia (lower plateau, much shorter
      // APD) and longer subepicardial APD -> reversed transmural repolarisation gradient
      p.geom.lvEpiR += 9; p.geom.lvEpiL += 8;
      p.mods.push({ sel: endoLayer(0.35, 0.7), amp: 0.88, apdAdd: -55 });
      p.mods.push({ sel: (s, i) => (s.g.ch[i] === CH.LV && !(s.g.sf[i] & SF.SEPTAL) ? smoothstep(0.5, 0.9, s.g.tm[i]) : 0), apdAdd: 25 });
      return p;
    },
  },
  wpw: {
    rhythm: 'sinus rhythm, ventricular pre-excitation (left lateral accessory pathway)',
    params: () => {
      const p = defaultParams();
      // left lateral pathway (atrial end on the lateral mitral annulus, ventricular insertion on the basal lateral LV
      // epicardium), 15 ms: the LV base is pre-excited ~50 ms before the His-Purkinje wave arrives
      p.ap = { delay: 15, erp: 280, ventTh: 0, ventAb: 0.9 };
      return p;
    },
  },
  'brugada-type1': {
    rhythm: 'sinus rhythm, Brugada type 1 pattern',
    params: () => {
      const p = defaultParams();
      // RVOT / anterior RV subepicardium: accentuated Ito notch with loss/delay of the dome (prolonged local APD),
      // slow conduction
      p.mods.push({ sel: brugadaEpi, notch: 0.95, cls: 4, apdAdd: 70, vScale: 0.5 });
      return p;
    },
  },
  aflutter: {
    rhythm: 'typical atrial flutter (counter-clockwise) with 4:1 AV conduction',
    params: () => {
      const p = defaultParams();
      // macro re-entry round the tricuspid annulus: slowed atrial conduction (atrial disease), isthmus slow zone,
      // atrial refractoriness with a restitution floor; AV node refractoriness gives fixed 4:1 conduction
      // the isthmus exit is the CS ostium (csAtExit), so the LA is entered through the CS musculature first and is
      // activated caudo-cranially together with the ascending RA septum: that common caudo-cranial phase is what makes
      // the F waves negative in II, III, aVF and positive in V1. Atrial remodelling: dilated LA, thicker atrial walls,
      // short atrial APD; the RA conducts slowly (0.5 m/s), the LA at normal speed (0.8 m/s).
      p.rhythm = { kind: 'flutter', ctiScale: 1, ctiDelay: 110, ratio: 4, csAtExit: true }; // ratio < 0 would run it clockwise
      p.geom.laAx = [p.geom.laAx[0] + 4, p.geom.laAx[1] + 4, p.geom.laAx[2] + 4]; p.geom.atrialWall = 5;
      p.vA = 0.5; p.vBB = 1.0; p.aApd = 160; p.aRestA = 0.3;
      p.mods.push({ sel: (s, i) => (s.g.ch[i] === CH.LA ? 1 : 0), vScale: 1.6 });
      // interatrial conduction only through Bachmann's bundle and the coronary sinus (no fossa bridge)
      p.fossaBridge = false; p.csDelay = 10;
      p.avn = { ...p.avn, erp: 640, ahMin: 70 };
      return p;
    },
  },
  hyperk: {
    rhythm: 'sinus rhythm, moderate hyperkalaemia',
    params: () => {
      const p = defaultParams();
      // raised [K]o: steeper phase 3 and shorter APD (tall narrow T), slower ventricular and atrial conduction,
      // depressed atrial excitability (low P), slower AV conduction
      p.mods.push({ sel: sel.vent, cls: 2, apdScale: 0.8, vScale: 0.8 });
      // IK1/IKr up-regulation shortens epicardial APD most -> larger transmural repolarisation gradient (peaked T)
      p.mods.push({ sel: (s, i) => (s.g.dom[i] === 0 ? smoothstep(0.2, 0.9, s.g.tm[i]) : 0), apdAdd: -30 });
      p.aAmp = 0.45; p.vA *= 0.75; p.vCrista *= 0.75; p.vBB *= 0.75;
      p.avn = { ...p.avn, ahMin: p.avn.ahMin + 30 };
      return p;
    },
  },
  afib: {
    rhythm: 'atrial fibrillation',
    params: (seed) => {
      const p = defaultParams();
      void seed;
      // three LA drivers (posterior wall, lateral LA, near the right pulmonary veins) and one on the RA free wall: the RA
      // driver makes the f waves visible in V1 (the electrode closest to the RA), as on real AF tracings
      p.rhythm = { kind: 'af', drivers: [{ dir: [0.3, 0.2, -1], cl: 145 }, { dir: [1, -0.2, -0.4], cl: 160 }, { dir: [-0.6, 0.4, -0.6], cl: 175 }, { dir: [-1, -0.3, 0.4], cl: 155, ra: true }], clJitter: 0.18 };
      p.aApdJitter = 0.12; p.aAmp = 0.8;
      p.avn = { ...p.avn, erp: 500, ahMin: 70, jitter: 0.22, conceal: 0.15 };
      return p;
    },
  },
  vt: {
    rhythm: 'monomorphic ventricular tachycardia with AV dissociation',
    params: () => {
      const p = defaultParams();
      // re-entrant LV source exiting through a ~20 mm border zone on the mid inferolateral wall near the endocardium:
      // activation runs from the inferolateral LV toward base, septum and RV -> RBBB-like, superior (north-west) axis;
      // the sinus node keeps firing at 80/min (AV dissociation, retrograde concealment blocks most P waves)
      p.rhythm = { kind: 'vt', rr: 750, hrv: 0.01, cl: 353, focus: { th: -45, ab: 0.5, tm: 0.1, r: 20 } };
      return p;
    },
  },
};
export type { Sites };
