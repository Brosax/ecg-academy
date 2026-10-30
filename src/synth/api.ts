/**
 * PUBLIC CONTRACT of the synthetic ECG engine (src/synth) — frozen from _proto/DECISION.md §5 (2026-10-17).
 * Other modules import only from src/synth/index.ts (which re-exports these types plus generate / scenarios / drawDials).
 * One-source rule (CLAUDE.md): every lead comes from one kernel list through one lead system; conditions change only
 * the SourceSpec / RecordingSpec, never a lead.
 */
import type { Ecg } from '../core/ecg';
import type { FindingId } from '../core/findings';
import type { ExtraLead, Lead } from '../core/leads';
import type { L10n } from '../core/l10n';
import type { RegionId } from '../core/regions';
import type { Rng } from '../core/rng';

/** Frank frame: +X patient left, +Y inferior, +Z posterior. Positions in cm (origin = ventricular centroid). */
export type Vec3 = readonly [number, number, number];
export type RegionWeights = readonly (readonly [RegionId, number])[];

// ── sites and territories ────────────────────────────────────────────────────────────────────────────────────────
export const ATRIAL_SITES = ['sinus', 'high-ra', 'crista', 'ra-septal', 'low-ra', 'cs-ostium', 'la-superior',
  'la-inferior', 'left-pv', 'right-pv', 'retrograde'] as const;
export type AtrialSite = (typeof ATRIAL_SITES)[number];

export const VENT_ORIGINS = ['rvot-septal', 'rvot-free', 'rv-free-wall', 'rv-apex', 'lvot-cusp',
  'lv-basal-inferolateral', 'lv-lateral', 'lv-apex', 'lv-anterior-scar', 'lv-inferior-scar',
  'fascicular-posterior', 'fascicular-anterior', 'junctional'] as const;
export type VentOrigin = (typeof VENT_ORIGINS)[number];

export const PATHWAY_SITES = ['left-lateral', 'left-posterolateral', 'posteroseptal-left', 'posteroseptal-right',
  'right-free-wall', 'right-anteroseptal', 'midseptal'] as const;
export type PathwaySite = (typeof PATHWAY_SITES)[number];

export const PACING_SITES = ['ra-appendage', 'rv-apex', 'rv-septal', 'rvot', 'lv-lateral-epicardial', 'his',
  'lbb-area'] as const;
export type PacingSite = (typeof PACING_SITES)[number];

/** Coronary territories on the AHA 17-segment assignment (+ RV, apical ballooning and the global layers). */
export const TERRITORIES = ['lad-proximal', 'lad-mid', 'lad-distal', 'diagonal', 'lcx', 'om', 'rca-proximal',
  'rca-distal', 'pda', 'posterolateral', 'rv', 'apical', 'global'] as const;
export type Territory = (typeof TERRITORIES)[number];
export type Where = Territory | readonly RegionId[];

// ── authoring units ──────────────────────────────────────────────────────────────────────────────────────────────
/** One smooth lobe of the heart vector; times in ms relative to its anchor (P onset, QRS onset, cycle start). */
export interface LobeSpec {
  readonly label: string;
  readonly on: number;                       // 2 % level (what a reader sees as onset)
  readonly peak: number;
  readonly end: number;                      // 2 % level, or tangent-method end when endRule = 'tangent'
  readonly endRule?: 'edge' | 'tangent';
  readonly q?: number;                       // apex shape: 2 = smooth (default), < 2 = pointed
  readonly dir: Vec3;
  readonly dir2?: Vec3;                      // direction rotates dir → dir2 across the support
  readonly amp: number;                      // mV, spatial
  readonly regions: RegionWeights;
  readonly loc?: Vec3 | 'regions' | 'none';  // near-field location; ventricular default 'regions' (weighted centroid)
  readonly far?: number;                     // 1 = dipole + proximity correction (default), 0 = eccentric near field only
}
export interface PlateauSpec {
  readonly label: string;
  readonly on: number; readonly riseEnd: number; readonly fallStart: number; readonly end: number;
  readonly dir: Vec3; readonly amp: number; readonly regions: RegionWeights;
  readonly loc?: Vec3 | 'regions' | 'none'; readonly far?: number;
}

// ── ventricular source ───────────────────────────────────────────────────────────────────────────────────────────
export type BlockLevel = 'delay' | 'complete';
export interface Blocks { readonly rbb?: BlockLevel; readonly lbb?: BlockLevel; readonly laf?: BlockLevel; readonly lpf?: BlockLevel }

/** The native (supraventricular-conducted) pattern. Ectopic, escape, VT and paced beats take their pattern from
 *  RhythmSpec / EctopySpec (origin, pacing site); the scheduler picks the pattern per beat. */
export type ActivationSpec =
  | { readonly kind: 'conducted'; readonly blocks?: Blocks }
  | { readonly kind: 'preexcited'; readonly pathway: PathwaySite; readonly blocks?: Blocks }; // fraction per beat from the junction

export interface SubstrateSpec {
  readonly lvMass?: number;                  // 1 = normal; LVH 1.3–1.8
  readonly rvMass?: number;                  // RVH 1.5–3
  readonly septum?: number;                  // septal hypertrophy (HCM)
  readonly scar?: readonly { readonly where: Where; readonly transmurality: number; readonly fragmented?: boolean }[];
  readonly slow?: readonly { readonly where: Where; readonly delayMs: number }[];   // ARVC, peri-infarct block
  readonly conduction?: number;              // global conduction-time factor (hyper-K, Na-channel block, IVCD)
}

export interface ApdChange { readonly where: Where; readonly layer: 'epi' | 'endo' | 'transmural'; readonly deltaMs: number }
export interface RepolSpec {
  readonly qtcMs?: number;                   // Fridericia target at the base QRS; sets JT (QT = QRS + JT(RR))
  readonly apd?: readonly ApdChange[];       // regional APD changes → ΔG and primary T lobes
  readonly gScale?: number;                  // magnitude of the primary gradient (flat T, strain)
  readonly coupling?: number;                // electrotonic c ∈ [0, 1]
  readonly plateauSlope?: number;            // phase-2 decline → secondary ST shift at the J point
  readonly tShape?: { readonly q?: number; readonly riseFrac?: number; readonly stMs?: number; readonly widthMs?: number };
  readonly u?: { readonly ratio: number; readonly lagMs?: number };
  readonly split?: { readonly where: Where; readonly lagMs: number; readonly share: number };  // LQT2 / bifid T
  readonly alternans?: number;               // fraction of |G| alternating beat to beat
  readonly memory?: { readonly from: PacingSite | VentOrigin; readonly weight: number };  // cardiac memory
}
export interface InjurySpec {
  readonly where: Where;
  readonly layer: 'transmural' | 'epicardial' | 'subendocardial';   // epicardial = superficial (pericarditis)
  readonly stMv: number;                     // ST at J+60 in `ref` (solved, §7)
  readonly ref?: Lead;                       // default: facing lead with the largest deviation
}
export interface NearFieldSpec {
  readonly kind: 'brugada' | 'epsilon' | 'j-wave' | 'fragment';
  readonly where: Where;
  readonly amp: number;
  readonly shape?: 'coved' | 'saddleback';
  readonly lagMs?: number;
  readonly far?: number;
}

// ── atria ────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface AtrialSpec {
  readonly raScale?: number;                 // RA abnormality
  readonly laScale?: number;                 // LA abnormality
  readonly laDelayMs?: number;               // interatrial conduction delay
  readonly iab?: 'none' | 'partial' | 'advanced';   // advanced: LA activated caudo-cranially
  readonly injuryMv?: number;                // atrial injury current (PR-segment depression)
  readonly gain?: number;                    // P flattening (hyper-K)
}

// ── rhythm, ectopy, junction ─────────────────────────────────────────────────────────────────────────────────────
export type RhythmSpec =
  | { readonly kind: 'sinus'; readonly rateBpm: number; readonly hrv?: number;
      readonly pauses?: readonly { readonly afterBeat: number; readonly ms: number }[];
      readonly saBlock?: { readonly ratio: number; readonly type: 'I' | 'II' } }
  | { readonly kind: 'atrial-ectopic'; readonly sites: readonly AtrialSite[]; readonly rateBpm: number;
      readonly mode: 'fixed' | 'wandering' | 'multifocal' }
  | { readonly kind: 'atrial-tachycardia'; readonly site: AtrialSite; readonly rateBpm: number }
  | { readonly kind: 'flutter'; readonly circuit: 'ccw' | 'cw' | 'la'; readonly cycleMs: number }
  | { readonly kind: 'fibrillation'; readonly coarseness: number; readonly cycleMs: number }
  | { readonly kind: 'junctional'; readonly rateBpm: number; readonly retroLagMs: number | null }
  | { readonly kind: 'avnrt'; readonly rateBpm: number; readonly form: 'typical' | 'atypical' }
  | { readonly kind: 'avrt'; readonly rateBpm: number; readonly form: 'orthodromic' | 'antidromic' }
  | { readonly kind: 'ventricular'; readonly origin: VentOrigin; readonly rateBpm: number;
      readonly sinusBpm: number | null; readonly captures?: boolean }
  | { readonly kind: 'polymorphic'; readonly rateBpm: number; readonly twistBeats: number | null } // null = PMVT
  | { readonly kind: 'vf'; readonly coarseness: number }
  | { readonly kind: 'vflutter'; readonly rateBpm: number }
  | { readonly kind: 'asystole'; readonly atrialBpm: number | null }
  | { readonly kind: 'paced'; readonly mode: 'AAI' | 'VVI' | 'DDD';          // the mode drives timing,
      readonly ventricularSite: PacingSite | 'biv';                           // the site drives the paced pattern
      readonly lowerRateBpm: number; readonly avDelayMs: number; readonly underlying: RhythmSpec;
      readonly bipolar: boolean; readonly fault?: 'no-capture' | 'undersensing' | 'oversensing' };

interface EctopyTiming {
  readonly pattern: 'single' | 'bigeminy' | 'trigeminy' | 'couplet' | 'run' | 'random';
  readonly couplingMs: number;
  readonly probability?: number;            // 'random'
  readonly runLength?: number;              // 'run'
}
export type EctopySpec =
  | (EctopyTiming & { readonly kind: 'pac' | 'pjc'; readonly origins: readonly AtrialSite[] })
  | (EctopyTiming & { readonly kind: 'pvc'; readonly origins: readonly VentOrigin[] });

export interface JunctionSpec {
  readonly intraAtrialMs: number;           // P onset → AV-node entry (default 35)
  readonly avn: { readonly ahMinMs: number; readonly ahExtMs: number; readonly tauMs: number;
                  readonly erpMs: number; readonly jitter: number; readonly conceal: number };
  readonly hvMs: number;                    // default 45
  readonly infraHis?: { readonly pattern: 'mobitz2' | 'fixed-ratio' | 'complete'; readonly ratio?: number;
                        readonly probability?: number };
  readonly completeNodal?: boolean;
  readonly bundleErp?: { readonly rbbMs: number; readonly lbbMs: number; readonly slope: number }; // ERP = base + slope·(RRprev − 1000)
  readonly pathway?: { readonly site: PathwaySite; readonly conductionMs: number; readonly erpMs: number;
                       readonly antegrade: boolean; readonly retrograde: boolean };
  readonly escape?: { readonly level: 'junctional' | 'ventricular'; readonly rateBpm: number; readonly origin?: VentOrigin };
  readonly retrogradeVa?: boolean;          // VA conduction from ventricular beats
}

// ── geometry ─────────────────────────────────────────────────────────────────────────────────────────────────────
export interface GeometrySpec {
  readonly frontalDeg?: number;             // rotation about Frank Z (vertical ↔ horizontal heart)
  readonly transverseDeg?: number;          // rotation about Frank Y (clockwise / counter-clockwise rotation)
  readonly sagittalDeg?: number;            // rotation about Frank X
  readonly shiftCm?: Vec3;
  readonly mirror?: boolean;                // dextrocardia with situs inversus (X → −X for sources and atrial sites)
  readonly torsoGain?: number;              // effusion, obesity, emphysema: scales every lead vector
  readonly respiration?: { readonly rotDeg: number; readonly gain: number };   // with the sinus respiratory phase
  readonly swing?: { readonly rotDeg: number; readonly shiftCm: Vec3; readonly everyBeats: number };   // alternans
}

export interface SourceSpec {
  readonly rhythm: RhythmSpec;
  readonly ectopy?: readonly EctopySpec[];
  readonly junction?: Partial<JunctionSpec>;
  readonly atria?: AtrialSpec;
  readonly activation: ActivationSpec;
  readonly substrate?: SubstrateSpec;
  readonly repol?: RepolSpec;
  readonly injury?: readonly InjurySpec[];
  readonly nearField?: readonly NearFieldSpec[];
  readonly geometry?: GeometrySpec;
}

// ── recording chain ──────────────────────────────────────────────────────────────────────────────────────────────
export const CHEST_LINES = ['sternal', 'parasternal', 'midclavicular', 'anterior-axillary', 'mid-axillary',
  'posterior-axillary', 'scapular', 'paravertebral'] as const;
export interface ChestSite { readonly ics: number; readonly line: (typeof CHEST_LINES)[number]; readonly side: 'L' | 'R' }
export type LimbCable = 'RA' | 'LA' | 'LL' | 'RL';
export type ChestCable = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';

export interface PlacementSpec {
  readonly limbs?: Readonly<Partial<Record<LimbCable, LimbCable>>>;              // cable → limb it is clipped to
  readonly chest?: Readonly<Partial<Record<ChestCable, ChestCable | ChestSite>>>; // swap, or explicit site
  readonly limbsOnTorso?: boolean;                                               // Mason–Likar
}
export interface NoiseSpec {
  readonly wanderMv?: number;
  readonly emgMv?: number; readonly emgOn?: readonly LimbCable[];
  readonly tremor?: { readonly mv: number; readonly hz: number; readonly on: LimbCable };
  readonly mains?: { readonly mv: number; readonly hz: 50 | 60; readonly imbalance: number };
  readonly pop?: { readonly electrode: LimbCable | ChestCable; readonly tMs: number; readonly mv: number };
  readonly motion?: { readonly electrode: LimbCable | ChestCable; readonly tMs: number; readonly durMs: number; readonly mv: number };
  readonly leadOff?: LimbCable | ChestCable;
}
export interface FilterSpec { readonly highpassHz: number; readonly lowpassHz: number; readonly notchHz: 50 | 60 | null; readonly phase: 'causal' | 'zero' }
export const FILTER_PRESETS = {
  diagnostic: { highpassHz: 0.05, lowpassHz: 150, notchHz: null, phase: 'causal' },
  diagnosticLinear: { highpassHz: 0.67, lowpassHz: 150, notchHz: null, phase: 'zero' },
  monitor: { highpassHz: 0.5, lowpassHz: 40, notchHz: 50, phase: 'causal' },
} as const satisfies Record<string, FilterSpec>;
export interface RecordingSpec {
  readonly placement?: PlacementSpec;
  readonly noise?: NoiseSpec;
  readonly filter?: FilterSpec;
  readonly gain?: number;                                       // amplifier calibration error (1 = correct)
  readonly adc?: { readonly lsbUv: number; readonly rangeMv: number };
}

// ── scenarios, dials, requests ───────────────────────────────────────────────────────────────────────────────────
export const SCENARIO_GROUPS = ['normal', 'atrial', 'svt', 'ventricular', 'av-block', 'conduction', 'ischemia',
  'chambers', 'repolarization', 'structural', 'pacing', 'technical'] as const;
export type ScenarioGroup = (typeof SCENARIO_GROUPS)[number];

export const DIAL_IDS = ['rate', 'pr', 'qrs', 'qtc', 'axis', 'pAxis', 'st', 'tAmp', 'voltage', 'hrv',
  'conductionRatio', 'ventricularResponse', 'fCoarseness', 'stage', 'site', 'noise'] as const;
export type DialId = (typeof DIAL_IDS)[number];
export interface DialRange { readonly min: number; readonly max: number }
export const DIFFICULTIES = ['classic', 'subtle', 'noisy', 'borderline'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export type RegionHighlight = 'infarct' | 'ischemia' | 'pathway' | 'focus' | 'block' | 'hypertrophy';
export type DeepPartial<T> = { readonly [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface ScenarioDef {
  readonly id: string;
  readonly group: ScenarioGroup;
  readonly findings: readonly FindingId[];                  // declared by mechanism; derived ones are added at truth time
  readonly title?: L10n;                                    // default FINDINGS[findings[0]].name
  readonly patient?: { readonly sex: 'female' | 'male'; readonly ageY: number };
  readonly source: SourceSpec;
  readonly recording?: RecordingSpec;
  readonly dials: Readonly<Partial<Record<DialId, DialRange>>>;   // ranges narrowed to keep the scenario's identity
  readonly variants?: Readonly<Record<string, { readonly label: L10n; readonly patch: DeepPartial<SourceSpec>;
                                                 readonly findings?: readonly FindingId[] }>>;
  readonly facts?: Readonly<Record<string, string>>;
  readonly intervals?: 'measurable' | 'not-applicable';    // VF, PMVT/torsades, ventricular flutter, asystole
  readonly highlights?: Readonly<Partial<Record<RegionId, RegionHighlight>>>;
}

export interface SynthRequest {
  readonly scenario: string;
  readonly variant?: string;
  readonly seed: number;
  readonly dials?: Readonly<Partial<Record<DialId, number>>>;
  readonly difficulty?: Difficulty;                         // default 'classic'
  readonly jitter?: boolean;                                // natural variability, default true
  readonly durationS?: number;                              // default 10
  readonly fs?: 250 | 500 | 1000;                           // default 500
  readonly recording?: RecordingSpec;                       // lesson overrides (e.g. monitor filter on)
  readonly extraLeads?: readonly ExtraLead[];
  readonly withVcg?: boolean;                               // also return the true heart vector (figures)
}
export interface SynthResult {
  readonly ecg: Ecg;                                        // signal + EcgTruth + RegionStates; origin {synthetic, scenarioId, seed}
  readonly applied: Readonly<Partial<Record<DialId, number>>>;   // dial values actually realised (after solve)
  readonly axisAmbiguous: boolean;                          // net-deflection vs area axis differ > 15°, or indeterminate
  readonly vcg?: readonly [Float32Array, Float32Array, Float32Array];
}
