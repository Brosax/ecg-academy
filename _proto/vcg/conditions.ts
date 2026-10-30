/**
 * Benchmark conditions = NORMAL base + overrides. A condition may only change:
 *  rhythm (event clocks), activation lobes (timing/direction/amplitude per region), the ventricular gradient / T shape
 *  (repolarization), injury currents, localised near-field sources, or geometry. Never a lead.
 *
 * Direction vectors are Frank (X left+, Y inferior+, Z posterior+); `norm` is applied inside the kernel builder.
 */
import type { BumpSpec } from './kernels.ts';
import { gradientFor, type AtrialMorph, type VentMorph } from './model.ts';
import { REGION_POS } from './leads.ts';

/** `taRatio`: atrial repolarisation per cycle as a fraction of the cycle's depolarisation area (opposite sign), spread
 *  over ~2 cycles. In a steady re-entry every atrial cell depolarises and repolarises once per cycle, so the net atrial
 *  area per cycle (the atrial gradient) is small: taRatio ≈ 1 removes the DC offset the depolarisation lobes alone
 *  would leave under the flutter waves (what a real recorder's high-pass filter would otherwise hide). */
export type FlutterSpec = { cycleMs: number; lobes: readonly BumpSpec[]; taRatio?: number; /** atrial lead field (AtrialMorph.loc) */ loc?: readonly [number, number, number] };
export type FibSpec = {
  /** wavelet streams: mean activation cycle (ms), cycle jitter (SD), mean dipole direction, direction spread per cycle,
   *  amplitude range (mV, slow random walk inside it), region tag for the 3D view */
  streams: readonly { meanMs: number; jitterMs: number; dir: readonly [number, number, number]; spread: number; amp: readonly [number, number]; region: 'RA' | 'LA' }[];
  /** atrial lead field (AtrialMorph.loc) */
  loc?: readonly [number, number, number];
};

export type RhythmSpec =
  | { kind: 'sinus'; rateBpm: number; prMs: number; hrv: number }
  | { kind: 'afib'; meanRateBpm: number; cv: number; minRrMs: number; fib: FibSpec }
  | { kind: 'flutter'; flutter: FlutterSpec; conduction: number; frMs: number }
  | { kind: 'vt'; rateBpm: number; sinusRateBpm: number; sinusPrMs: number };

export type Condition = {
  id: string;
  title: string;
  rhythmLabel: string;
  rhythm: RhythmSpec;
  atrial: AtrialMorph;
  vent: VentMorph;
};

// ---------------------------------------------------------------- normal sinus rhythm (the calibrated base)

// Atrial lead field (review): the atrial lobes carry the atrial centroid (posterior-superior to the ventricles) as a
// near-field location, so the chest electrodes see the atria from further away than the Dower rows (fitted to the
// ventricular source) assume. Without it the P was taller in V3–V4 (1.8 mm) than in II (1.4 mm).
export const NORMAL_P: AtrialMorph = {
  lobes: [
    { label: 'RA', on: 0, peak: 38, end: 72, dir: [0.6, 0.8, -0.3], amp: 0.14, regions: [['RA', 1]] },
    { label: 'LA', on: 32, peak: 70, end: 104, dir: [0.7, 0.2, 0.75], amp: 0.13, regions: [['LA', 1]] },
  ],
  ta: { on: 70, peak: 210, end: 400, ratio: 0.45 },
  loc: REGION_POS.ATRIA,
};

const NORMAL_QRS: readonly BumpSpec[] = [
  { label: 'septal L→R', on: 0, peak: 13, end: 27, dir: [-0.55, 0.2, -0.8], amp: 0.24, regions: [['IVS', 1]] },
  { label: 'anteroapical + RV', on: 8, peak: 30, end: 50, dir: [0.5, 0.45, -0.6], amp: 0.8, regions: [['LV_ANT', 1], ['LV_APEX', 0.5], ['RV', 1], ['IVS', 0.5]] },
  { label: 'LV free wall', on: 22, peak: 46, end: 68, dir: [0.62, 0.55, 0.56], amp: 1.65, regions: [['LV_LAT', 1], ['LV_INF', 1], ['LV_APEX', 0.5]] },
  { label: 'posterobasal + RVOT', on: 52, peak: 70, end: 90, dir: [-0.3, -0.55, 0.78], amp: 0.42, regions: [['LV_BASE', 1], ['RVOT', 1]] },
];

const NORMAL_T = { on: 150, peak: 292, end: 380 };
/** normal T vector target: clinical T axis ≈ +40°, upright V2–V6, ≈ flat V1, 0.45 mV spatial peak */
const NORMAL_T_DIR = [0.85, 0.3, -0.5] as const;

export const NORMAL_V: VentMorph = {
  qrs: NORMAL_QRS,
  G: gradientFor({ qrs: NORMAL_QRS, t: NORMAL_T }, NORMAL_T_DIR, 0.45),
  t: NORMAL_T,
  u: { on: 385, peak: 455, end: 540, ratio: 0.08 },
  st: [],
  repolExtra: [],
  rrRef: 833,
};

const normal: Condition = {
  id: 'normal',
  title: 'Normal sinus rhythm',
  rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 72, prMs: 160, hrv: 0.02 },
  atrial: NORMAL_P,
  vent: NORMAL_V,
};

// ---------------------------------------------------------------- helpers (the "dials")

type V3 = readonly [number, number, number];
const addG = (g: V3, d: V3, k: number): [number, number, number] => [g[0] + d[0] * k, g[1] + d[1] * k, g[2] + d[2] * k];
const scaleG = (g: V3, k: number): [number, number, number] => [g[0] * k, g[1] * k, g[2] * k];
/** stretch activation in time (slower conduction: hyperkalaemia, drugs, diffuse disease) */
export const stretch = (ls: readonly BumpSpec[], k: number, ampK = 1): BumpSpec[] =>
  ls.map((l) => ({ ...l, on: l.on * k, peak: l.peak * k, end: l.end * k, amp: l.amp * ampK }));

// ---------------------------------------------------------------- right bundle-branch block
// LV activated normally (septum L→R first); the RV is activated late and slowly through the septum. Two lobes:
//  * transseptal (18–72 ms): with no right bundle, the septum is crossed from the left only and the wavefront breaks
//    through into the RV endocardium; this anterior force overlaps the LV free-wall lobe and truncates the V1 S
//    (rsR′ "M" in V1–V2 instead of rS + R′);
//  * RV free wall / RVOT (slow, cell to cell, 46–142 ms): the terminal rightward-anterior, slightly superior lobe →
//    R′ in V1–V2 (R peak time ≈ 90 ms) and the broad slurred S in I, aVL, V5, V6.
// T follows from the unchanged G (secondary, discordant: inverted V1–V2).
const RBBB_QRS: BumpSpec[] = [
  NORMAL_QRS[0]!,
  { ...NORMAL_QRS[1]!, regions: [['LV_ANT', 1], ['LV_APEX', 0.5], ['IVS', 0.5]] },
  NORMAL_QRS[2]!,
  { label: 'posterobasal LV', on: 52, peak: 68, end: 86, dir: [-0.2, -0.55, 0.8], amp: 0.32, regions: [['LV_BASE', 1]] },
  { label: 'transseptal → RV breakthrough', on: 18, peak: 44, end: 72, dir: [-0.05, 0.1, -0.99], amp: 0.55, regions: [['IVS', 0.5], ['RV', 0.3]] },
  { label: 'RV free wall + RVOT (slow)', on: 46, peak: 94, end: 142, dir: [-0.3, -0.2, -0.93], amp: 0.85, regions: [['RV', 0.7], ['RVOT', 1]] },
];
const rbbb: Condition = {
  id: 'rbbb', title: 'Complete right bundle-branch block', rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 70, prMs: 160, hrv: 0.02 },
  atrial: NORMAL_P,
  vent: { ...NORMAL_V, qrs: RBBB_QRS, t: { on: 168, peak: 322, end: 412 }, u: null },
};

// ---------------------------------------------------------------- left bundle-branch block
// No left-septal start: initial forces from the right septum / RV (small, anterior-leftward); the LV is activated
// slowly across the septum and then the free wall: two leftward-posterior lobes whose overlap gives the broad
// flat-topped/notched R in I, aVL, V5, V6. Directions (review, see DESIGN.md "Review"): with the normal ventricular
// gradient G ≈ (79, 45, −14) mV·ms, the secondary T area G − A_QRS projects negatively on V5 only if A_QRS is clearly
// more leftward than G (A_x ≳ 100 for A_z ≈ 140); septum ≈ 56° and free wall ≈ 44° posterior to +X give
// A_QRS ≈ (119, 23, 137) → T upright V1–V4, inverted I, aVL, V5, V6, V4 the transition lead (broad R), and a
// terminal lobe aligned with the free wall (no Cabrera-like notch on the V3 S upstroke). Second review pass: the
// free-wall lobe points slightly inferior (Y +0.15; the LV free wall includes the inferior wall), which brings the
// axis from −18° to ≈ −4° and lead II from a low fragmented rs (2.4/−0.7 mm) to an upright R ≈ 4.6 mm, as in the
// PTB-XL LBBB (../harness/real-lbbb.png, axis 0°); V5/V6 T inversion is unchanged (more A_y helps it).
const LBBB_QRS: BumpSpec[] = [
  { label: 'RV + right septum', on: 0, peak: 16, end: 36, dir: [0.4, 0.3, -0.87], amp: 0.14, regions: [['RV', 1], ['IVS', 0.3]] },
  { label: 'septum R→L (slow)', on: 14, peak: 58, end: 102, dir: [0.55, 0.12, 0.83], amp: 1.7, regions: [['IVS', 1], ['LV_ANT', 1], ['LV_APEX', 0.5]] },
  { label: 'LV free wall (slow)', on: 50, peak: 106, end: 142, dir: [0.72, 0.15, 0.69], amp: 2.0, regions: [['LV_LAT', 1], ['LV_INF', 1], ['LV_APEX', 0.5]] },
  { label: 'posterobasal LV', on: 112, peak: 134, end: 150, dir: [0.55, -0.35, 0.76], amp: 0.3, regions: [['LV_BASE', 1], ['RVOT', 1]] },
];
const lbbb: Condition = {
  id: 'lbbb', title: 'Complete left bundle-branch block', rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 68, prMs: 170, hrv: 0.02 },
  atrial: NORMAL_P,
  vent: { ...NORMAL_V, qrs: LBBB_QRS, t: { on: 110, peak: 320, end: 430 }, u: null },
};

// ---------------------------------------------------------------- acute anterior STEMI (proximal LAD)
// Transmural injury of the anterior wall/septum: ST injury vector toward the anterior wall (−Z, slightly left and
// superior) present from the time the zone depolarises until it repolarises; hyperacute T = G pulled toward the
// injured zone (shorter local APD); loss of septal forces (early r loss in V1–V2).
const ANT_ST_DIR: V3 = [0.3, -0.3, -0.92];
const ANT_QRS: BumpSpec[] = [
  { ...NORMAL_QRS[0]!, amp: 0.1 },
  { ...NORMAL_QRS[1]!, amp: 0.55 },
  NORMAL_QRS[2]!,
  NORMAL_QRS[3]!,
];
const ANT_T = { on: 120, peak: 270, end: 370 };
const antStemi: Condition = {
  id: 'anterior-stemi', title: 'Acute anterior STEMI (proximal LAD)', rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 84, prMs: 160, hrv: 0.015 },
  atrial: NORMAL_P,
  vent: {
    ...NORMAL_V,
    qrs: ANT_QRS,
    G: addG(gradientFor({ qrs: ANT_QRS, t: ANT_T }, NORMAL_T_DIR, 0.45), ANT_ST_DIR, 70),
    t: ANT_T,
    u: null,
    st: [{ label: 'anterior injury current', on: 15, riseEnd: 70, fallStart: 250, end: 360, dir: ANT_ST_DIR, amp: 0.26, regions: [['LV_ANT', 1], ['IVS', 1], ['LV_APEX', 1]] }],
    rrRef: 714,
  },
};

// ---------------------------------------------------------------- acute inferior STEMI (RCA)
// Injury vector toward the inferior wall, slightly rightward (RCA: III > II) and posterior (inferoposterior extension
// → ST depression in V1–V3). Review: the earlier [−0.4, 1, 0.25] put the deepest chest-lead depression in V3–V5
// through its rightward component (a lateral, not a posterior, pattern); less rightward and more posterior moves it
// to V2–V3 and leaves V5–V6 near isoelectric.
const INF_ST_DIR: V3 = [-0.2, 1, 0.45];
const infStemi: Condition = {
  id: 'inferior-stemi', title: 'Acute inferior STEMI (RCA)', rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 66, prMs: 170, hrv: 0.02 },
  atrial: NORMAL_P,
  vent: {
    ...NORMAL_V,
    G: addG(NORMAL_V.G, INF_ST_DIR, 45),
    t: { on: 130, peak: 285, end: 385 },
    u: null,
    st: [{ label: 'inferior injury current', on: 20, riseEnd: 75, fallStart: 260, end: 370, dir: INF_ST_DIR, amp: 0.22, regions: [['LV_INF', 1], ['RV', 0.3]] }],
    rrRef: 909,
  },
};

// ---------------------------------------------------------------- LVH with strain
// Thick LV free wall: larger and longer leftward-posterior lobe, R peak time > 50 ms; "strain" = primary repolarization
// change (reduced ventricular gradient: subendocardial APD prolongation/ischaemia) so T opposes the big QRS, with an
// early, slowly descending start (downsloping ST) and a faster return (asymmetric T).
const LVH_QRS: BumpSpec[] = [
  { ...NORMAL_QRS[0]!, amp: 0.2 },
  { ...NORMAL_QRS[1]!, dir: [0.55, 0.3, -0.55], amp: 0.7 },
  { label: 'hypertrophied LV free wall', on: 20, peak: 56, end: 90, dir: [0.62, -0.05, 0.78], amp: 2.6, regions: [['LV_LAT', 1], ['LV_INF', 1], ['LV_APEX', 0.5], ['LV_BASE', 0.5]] },
  { label: 'posterobasal', on: 72, peak: 86, end: 100, dir: [-0.2, -0.6, 0.75], amp: 0.4, regions: [['LV_BASE', 1], ['RVOT', 1]] },
];
const lvh: Condition = {
  id: 'lvh-strain', title: 'Left ventricular hypertrophy with strain', rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 70, prMs: 170, hrv: 0.02 },
  atrial: { ...NORMAL_P, lobes: [NORMAL_P.lobes[0]!, { ...NORMAL_P.lobes[1]!, peak: 76, end: 112, amp: NORMAL_P.lobes[1]!.amp * 1.18 }] },
  vent: {
    ...NORMAL_V,
    qrs: LVH_QRS,
    G: scaleG(NORMAL_V.G, 0.25),
    t: { on: 75, peak: 300, end: 395 },
    u: null,
  },
};

// ---------------------------------------------------------------- WPW, left lateral accessory pathway
// Short PR: the delta lobe starts 100 ms after P onset at the left lateral base and spreads slowly (cell to cell);
// normal AV-nodal activation arrives ~60 ms later and fuses. Secondary ST–T from the unchanged G.
const WPW_QRS: BumpSpec[] = [
  { label: 'delta: pre-excited LV lateral base', on: 0, peak: 48, end: 75, dir: [0.12, 0.6, -0.79], amp: 0.5, regions: [['LV_LAT', 1], ['LV_BASE', 1]] },
  { label: 'pre-excited LV (anterior spread)', on: 30, peak: 72, end: 105, dir: [0.05, 0.5, -0.86], amp: 0.95, regions: [['LV_ANT', 1], ['LV_INF', 1], ['LV_APEX', 0.5]] },
  { label: 'AV-nodal: septum + LV free wall', on: 58, peak: 84, end: 110, dir: [0.62, 0.45, 0.5], amp: 1.05, regions: [['IVS', 1], ['LV_LAT', 0.5], ['LV_APEX', 0.5], ['RV', 1]] },
  { label: 'terminal RVOT', on: 96, peak: 110, end: 124, dir: [-0.3, -0.6, 0.6], amp: 0.3, regions: [['RVOT', 1]] },
];
const wpw: Condition = {
  id: 'wpw', title: 'Ventricular pre-excitation (WPW), left lateral pathway', rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 72, prMs: 100, hrv: 0.02 },
  atrial: NORMAL_P,
  vent: { ...NORMAL_V, qrs: WPW_QRS, t: { on: 120, peak: 300, end: 395 }, u: null },
};

// ---------------------------------------------------------------- Brugada type 1
// Localised RVOT epicardial source (pure near field, far = 0): loss of the epicardial action-potential dome in the
// anterior RVOT → a transmural voltage gradient whose local dipole points out of the epicardium (anterior) from the end
// of the QRS (coved J/ST elevation, slow convex decay); the epicardium then repolarises late (dipole reverses →
// negative T). The source sits ≈ 2 cm behind the chest wall between V1 and V2, so its 1/d² field is large at V1–V2,
// small at V3 and negligible elsewhere: no reciprocal ST depression. Activation and the global gradient are unchanged.
const RVOT_EPI: V3 = [-2.0, -2.5, -5.0];
const brugada: Condition = {
  id: 'brugada-type1', title: 'Brugada pattern, type 1 (coved)', rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 70, prMs: 170, hrv: 0.02 },
  atrial: NORMAL_P,
  vent: {
    ...NORMAL_V,
    u: null,
    repolExtra: [
      { label: 'RVOT epicardial dome loss (coved ST)', on: 64, peak: 94, end: 290, dir: [-0.25, 0, -1], amp: 0.105, loc: RVOT_EPI, far: 0, regions: [['RVOT', 1]] },
      { label: 'RVOT delayed epicardial repolarization (negative T)', on: 170, peak: 300, end: 420, dir: [0, 0, 1], amp: 0.12, loc: RVOT_EPI, far: 0, regions: [['RVOT', 1]] },
    ],
  },
};

// ---------------------------------------------------------------- typical atrial flutter (CCW), 4:1
// One macro-reentrant cycle of 200 ms around the tricuspid annulus: slow conduction through the cavotricuspid isthmus
// (small mass, slow → a gentle superior drift, the "plateau" of the sawtooth), fast caudo-cranial septal ascent with
// LA activation (superior vector → the sharp negative deflection in II, III, aVF), RA roof / anterior wall (anterior
// vector → the discrete positive wave in V1), cranio-caudal lateral-wall descent (inferior vector → the sharp positive
// return with overshoot that decays into the next isthmus plateau). Lobes overlap: no isoelectric interval.
const FLUTTER: FlutterSpec = {
  cycleMs: 200,
  taRatio: 1,
  lobes: [
    { label: 'cavotricuspid isthmus (slow)', on: 0, peak: 85, end: 118, dir: [0.1, -0.9, 0.4], amp: 0.09, regions: [['RA', 0.2]] },
    { label: 'septal ascent + LA', on: 78, peak: 114, end: 138, dir: [0.3, -0.95, -0.05], amp: 0.26, regions: [['RA', 0.4], ['LA', 1]] },
    { label: 'RA roof / anterior wall', on: 100, peak: 135, end: 165, dir: [-0.35, -0.2, -0.92], amp: 0.15, regions: [['RA', 0.2]] },
    { label: 'lateral RA descent', on: 122, peak: 150, end: 218, dir: [-0.2, 0.95, -0.2], amp: 0.085, regions: [['RA', 0.2]] },
  ],
};
const aflutter: Condition = {
  id: 'aflutter', title: 'Typical atrial flutter with 4:1 AV conduction', rhythmLabel: 'atrial flutter 4:1',
  rhythm: { kind: 'flutter', flutter: FLUTTER, conduction: 4, frMs: 255 },
  atrial: NORMAL_P,
  vent: { ...NORMAL_V, rrRef: 800, u: null },
};

// ---------------------------------------------------------------- hyperkalaemia (moderate)
// Primary repolarization change: faster phase-3 → short, steep, symmetric, tall T (G larger, T narrow);
// slowed conduction → wider QRS and P, longer PR; atrial depolarization depressed → flat P.
const HK_QRS = stretch(NORMAL_QRS, 1.22, 0.92);
const HK_T = { on: 172, peak: 252, end: 318, q: 1.35 };
const hyperk: Condition = {
  id: 'hyperk', title: 'Moderate hyperkalaemia', rhythmLabel: 'sinus',
  rhythm: { kind: 'sinus', rateBpm: 75, prMs: 205, hrv: 0.015 },
  atrial: { ...NORMAL_P, lobes: stretch(NORMAL_P.lobes, 1.2, 0.4), ta: { ...NORMAL_P.ta!, ratio: 0.3 } },
  vent: {
    ...NORMAL_V,
    qrs: HK_QRS,
    G: gradientFor({ qrs: HK_QRS, t: HK_T }, [0.6, 0.3, -0.75], 1.0),
    t: HK_T,
    u: null,
    rrRef: 800,
  },
};

// ---------------------------------------------------------------- atrial fibrillation
const afib: Condition = {
  id: 'afib', title: 'Atrial fibrillation', rhythmLabel: 'atrial fibrillation',
  rhythm: {
    kind: 'afib', meanRateBpm: 100, cv: 0.26, minRrMs: 360,
    fib: {
      streams: [
        { meanMs: 145, jitterMs: 32, dir: [-0.3, 0.55, -0.78], spread: 0.45, amp: [0.03, 0.08], region: 'RA' },
        { meanMs: 128, jitterMs: 30, dir: [0.1, 0.9, -0.3], spread: 0.5, amp: [0.02, 0.05], region: 'RA' },
        { meanMs: 160, jitterMs: 35, dir: [0.45, 0.6, 0.55], spread: 0.5, amp: [0.02, 0.045], region: 'LA' },
      ],
    },
  },
  atrial: NORMAL_P,
  vent: { ...NORMAL_V, rrRef: 600, u: null },
};

// ---------------------------------------------------------------- monomorphic VT (LV inferior origin), AV dissociation
const VT_QRS: BumpSpec[] = [
  { label: 'exit LV inferoapical (slow, cell to cell)', on: 0, peak: 42, end: 78, dir: [-0.1, -0.75, -0.65], amp: 0.55, regions: [['LV_INF', 1], ['LV_APEX', 1]] },
  { label: 'LV → septum → RV wavefront', on: 34, peak: 84, end: 128, dir: [-0.55, -0.62, -0.56], amp: 1.65, regions: [['IVS', 1], ['RV', 1], ['LV_ANT', 1], ['LV_LAT', 1]] },
  { label: 'basal / RVOT terminal', on: 108, peak: 136, end: 162, dir: [-0.15, -0.4, 0.9], amp: 0.5, regions: [['LV_BASE', 1], ['RVOT', 1]] },
];
const vt: Condition = {
  id: 'vt', title: 'Monomorphic ventricular tachycardia', rhythmLabel: 'ventricular tachycardia',
  rhythm: { kind: 'vt', rateBpm: 170, sinusRateBpm: 80, sinusPrMs: 160 },
  atrial: NORMAL_P,
  // repolarization at 170/min: APD (and its dispersion, which is what G integrates) shortens, so G is scaled to 0.2; strong
  // electrotonic coupling (0.7) makes the secondary T much smaller than −A_QRS (see VentMorph.coupling); T ends 40 ms before the next QRS
  vent: { ...NORMAL_V, qrs: VT_QRS, G: scaleG(NORMAL_V.G, 0.2), t: { on: 150, peak: 240, end: 312 }, coupling: 0.7, u: null, rrRef: 353 },
};

export const CONDITIONS: Record<string, Condition> = {
  normal, rbbb, lbbb, 'anterior-stemi': antStemi, 'inferior-stemi': infStemi, 'lvh-strain': lvh, wpw,
  'brugada-type1': brugada, aflutter, hyperk, afib, vt,
};
export const BENCHMARK_IDS = [
  'normal', 'rbbb', 'lbbb', 'anterior-stemi', 'inferior-stemi', 'lvh-strain', 'wpw', 'brugada-type1', 'aflutter',
  'hyperk', 'afib', 'vt',
] as const;
