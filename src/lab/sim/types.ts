/**
 * FROZEN CONTRACT — shared by sim, view3d, ecg and app. Only the integrator edits this file.
 *
 * Units: time in ms (float64 on the CPU), heart-local geometry in mm, app world in cm, voltage in mV.
 * Frames (see frame.ts):
 *   local  — heart-local, mm. +y = apex→base (long axis, base up), +z = anterior (RV side), +x = y × z (LV lateral).
 *   app    — Three.js world, cm. +x = patient left, +y = superior (head), +z = anterior. Origin = ventricular centroid.
 *   frank  — Frank leads. +X = patient left, +Y = inferior (feet), +Z = posterior.
 * One-source rule: every ECG sample is LeadProjector · H(t); H(t) comes only from voxel activation/repolarization.
 */

export type Vec3 = readonly [number, number, number];
/** Row-major 3×3 matrix. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

// ---------------------------------------------------------------- taxonomy

export const STRUCTURES = [
  'SA', 'RA', 'BACHMANN', 'LA', 'LAA', 'AVN', 'HIS', 'LBB', 'LAF', 'LPF', 'LSF', 'RBB',
  'PURKINJE_LV', 'PURKINJE_RV',
  'SEPTUM', 'LV_APEX', 'LV_ANTERIOR', 'LV_LATERAL', 'LV_INFERIOR', 'LV_POSTEROBASAL',
  'RV_FREE', 'RV_APEX', 'RVOT',
  'MITRAL', 'TRICUSPID', 'AORTIC', 'PULMONARY', 'AV_RING',
] as const;
export type StructureId = (typeof STRUCTURES)[number];
export const STRUCTURE_NONE = 255;

export const WAVE_SEGMENTS = ['P', 'PR', 'QRS', 'ST', 'T', 'TP'] as const;
export type WaveSegment = (typeof WAVE_SEGMENTS)[number];

export const MECH_PHASES = ['atrialSystole', 'isovolumicContraction', 'ejection', 'isovolumicRelaxation', 'filling'] as const;
export type MechPhase = (typeof MECH_PHASES)[number];

export const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type LeadName = (typeof LEADS)[number];
export const LIMB_LEADS: readonly LeadName[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
export const PRECORDIAL_LEADS: readonly LeadName[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

export const ELECTRODES = ['RA', 'LA', 'LL', 'RL', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type ElectrodeId = (typeof ELECTRODES)[number];

export const VALVES = ['MITRAL', 'TRICUSPID', 'AORTIC', 'PULMONARY'] as const;
export type ValveId = (typeof VALVES)[number];

/** Tissue code stored per voxel. */
export const TISSUE = { Out: 0, Blood: 1, LV: 2, RV: 3, Septum: 4, LA: 5, RA: 6, Ring: 7, Vessel: 8, Dead: 9 } as const;
export type Tissue = (typeof TISSUE)[keyof typeof TISSUE];

/** Electrical compartment. The fibrous ring separates them; the His bundle is the only normal connection. */
export const COMP = { None: 0, Atrial: 1, Ventricular: 2 } as const;
export type Comp = (typeof COMP)[keyof typeof COMP];

export const CHAMBER = { None: 0, LA: 1, RA: 2, LV: 3, RV: 4 } as const;
export type Chamber = (typeof CHAMBER)[keyof typeof CHAMBER];

export function compOfTissue(t: number): Comp {
  if (t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum) return COMP.Ventricular;
  if (t === TISSUE.LA || t === TISSUE.RA) return COMP.Atrial;
  return COMP.None;
}
export const isMyocardium = (t: number): boolean => compOfTissue(t) !== COMP.None;

// ---------------------------------------------------------------- geometry

/** Voxel arrays are indexed v = i + nx * (j + ny * k); voxel centres at originMm + hMm * (i, j, k) in the local frame. */
export interface VoxelGrid {
  readonly dims: readonly [number, number, number];
  readonly hMm: number;
  readonly originMm: Vec3;
  /** TISSUE code. */
  readonly tissue: Uint8Array;
  /** CHAMBER for myocardium (septum → LV) and for blood (its cavity); 0 elsewhere. */
  readonly chamber: Uint8Array;
  /** AHA 17-segment id (1..17) for LV free wall and septum, 0 elsewhere. */
  readonly aha: Uint8Array;
  /** Index into STRUCTURES (STRUCTURE_NONE = 255) — used for highlighting and responsibleStructures. */
  readonly region: Uint8Array;
  /** 0 = endocardium … 1 = epicardium. Septum: 0 = LV side … 1 = RV side. */
  readonly wallDepth: Float32Array;
  /** Ventricles: 0 = apex … 1 = base (AV plane). Atria: 0 = AV ring … 1 = roof. */
  readonly apexBase: Float32Array;
  /** 3 floats per voxel: unit transmural direction (∇wallDepth), local frame. */
  readonly transDir: Float32Array;
  /** Signed distance to the myocardium surface in mm (negative inside myocardium). */
  readonly sdfMm: Float32Array;
}

export interface RenderMesh {
  /** Local-frame mm, 3 per vertex. */
  readonly position: Float32Array;
  readonly normal: Float32Array;
  readonly index: Uint32Array;
  /** Nearest myocardium voxel per vertex — per-vertex attributes are field[voxel[i]]. */
  readonly voxel: Uint32Array;
}

/** local → app:  app_cm = R · (local_mm / 10) + tCm */
export interface Pose {
  readonly R: Mat3;
  readonly tCm: Vec3;
}

/** Contraction axes for the displacement field (local frame). */
export interface ChamberAxis {
  readonly chamber: Chamber;
  readonly centerMm: Vec3;
  /** Unit vector. Ventricles: base → apex. Atria: AV ring → roof. */
  readonly axis: Vec3;
  readonly radiusMm: number;
  readonly lengthMm: number;
}

/** Polyline in the local frame (conduction-system tubes, labels). */
export interface ConductionPath {
  readonly id: StructureId;
  readonly pointsMm: readonly Vec3[];
}

export interface ValveGeom {
  readonly id: ValveId;
  readonly centerMm: Vec3;
  /** Unit normal pointing in the direction of forward flow. */
  readonly normal: Vec3;
  readonly radiusMm: number;
}

/** Static anatomical meshes drawn alongside the heart (not electrically active): vessels, coronaries, veins. */
export interface OverlayMesh {
  /** Stable id, e.g. 'LAD', 'RCA', 'LCX', 'AORTA', 'PULMONARY_TRUNK', 'SVC', 'IVC', 'PV_LS', 'CORONARY_SINUS'. */
  readonly id: string;
  readonly kind: 'coronaryArtery' | 'cardiacVein' | 'greatArtery' | 'greatVein' | 'pulmonaryVein' | 'other';
  /** Local-frame mm, 3 per vertex. */
  readonly position: Float32Array;
  readonly normal: Float32Array;
  readonly index: Uint32Array;
}

export interface ModelCredit {
  readonly title: string;
  readonly authors: string;
  readonly url: string;
  readonly license: string;
}

export type BodyGuideId = 'midsternal' | 'midclavicular' | 'anteriorAxillary' | 'midAxillary' | 'ics4' | 'ics5';

/** Realistic body surface for the electrodes view (app frame, cm; same origin as the heart). */
export interface BodyModel {
  readonly skin: { readonly position: Float32Array; readonly normal: Float32Array; readonly index: Uint32Array };
  /** Electrode sites on the skin and the outward skin normal there. */
  readonly electrodes: Readonly<Record<ElectrodeId, { readonly pos: Vec3; readonly normal: Vec3 }>>;
  /** Precordial landmark lines on the skin (positions estimated from body proportions and the cardiac apex). */
  readonly guides: readonly { readonly id: BodyGuideId; readonly points: readonly Vec3[] }[];
  /** Camera framing spheres. */
  readonly views: {
    readonly chest: { readonly center: Vec3; readonly radius: number };
    readonly full: { readonly center: Vec3; readonly radius: number };
  };
  readonly credit: ModelCredit;
}

export interface GeometryBundle {
  /** Realistic body surface (skin) with electrode sites, when available. */
  readonly body?: BodyModel;
  /** Where the anatomy comes from. */
  readonly source?: 'stub' | 'procedural' | 'hra';
  /** Extra static meshes (vessels, coronary arteries/veins). */
  readonly overlays?: readonly OverlayMesh[];
  /** Attribution required by the model licence(s) — shown in the About dialog. */
  readonly credits?: readonly ModelCredit[];
  readonly grid: VoxelGrid;
  readonly mesh: RenderMesh;
  readonly pose: Pose;
  readonly chambers: readonly ChamberAxis[];
  readonly paths: readonly ConductionPath[];
  readonly valves: readonly ValveGeom[];
  /** Label anchor points (local mm). */
  readonly landmarks: Partial<Record<StructureId, Vec3>>;
  readonly hash: string;
}

// ---------------------------------------------------------------- conduction & activation

export interface ConductionParams {
  readonly vMyoLongMps: number;
  readonly vMyoTransMps: number;
  readonly vAtrialMps: number;
  readonly vBachmannMps: number;
  readonly vPurkinjeMps: number;
  readonly pmjDelayMs: number;
  /** Muscle → Purkinje re-entry delay; Infinity = blocked. */
  readonly retroDelayMs: number;
}

export interface Seed {
  readonly voxel: number;
  readonly tMs: number;
}

export interface ActivationVariant {
  readonly id: string;
  readonly comp: Comp;
  readonly seeds: readonly Seed[];
  readonly params: ConductionParams;
}

export interface ActivationField {
  readonly id: string;
  readonly comp: Comp;
  /** Per voxel, ms relative to the beat event; +Infinity where not activated or other compartment. */
  readonly tAct: Float32Array;
  readonly tMinMs: number;
  readonly tMaxMs: number;
}

export interface ApdField {
  /** Per voxel, ms, at rrRefMs. */
  readonly apdRefMs: Float32Array;
  readonly rrRefMs: number;
  /** APD scale = (rrPrev / rrRef) ^ rateExp. */
  readonly rateExp: number;
}

/** s(t) = σ((t−δ)/τu) · (1 − a·(t−δ)/200) · σ(−(t−ρ)/τr), low-passed. */
export interface ApParams {
  readonly tauUpMs: number;
  readonly tauRepMs: number;
  readonly plateauSlope: number;
  readonly lowpassHz: number;
}

// ---------------------------------------------------------------- source

/** Voxel-face equivalent double layer: H(t) = −gain · Σ c_v · s_v(t). Σ c_v ≡ 0 exactly. */
export interface SourceKernel {
  readonly comp: Comp;
  readonly voxels: Uint32Array;
  /** 3 per kernel voxel, local frame, mm². */
  readonly c: Float32Array;
}

export interface TemplateTruth {
  /** First activation, rel. to the beat event (ms). */
  readonly onMs: number;
  /** Last activation. */
  readonly offMs: number;
  /** Onset of repolarization (ST → T boundary). */
  readonly repolOnMs: number;
  /** Last repolarization. */
  readonly repolEndMs: number;
}

export interface BeatTemplate {
  readonly key: string;
  readonly comp: Comp;
  readonly fsHz: number;
  /** Time of sample 0 relative to the beat event (ms). */
  readonly t0Ms: number;
  readonly n: number;
  /** 3·n, heart-LOCAL frame, already scaled to mV. The stream applies pose and converts to Frank. */
  readonly H: Float32Array;
  readonly truth: TemplateTruth;
}

// ---------------------------------------------------------------- rhythm

export type BeatEvent =
  | { readonly kind: 'A'; readonly id: number; readonly tMs: number; readonly variant: string; readonly rrPrevMs: number }
  | {
      readonly kind: 'V';
      readonly id: number;
      readonly tMs: number;
      readonly variant: string;
      readonly rrPrevMs: number;
      readonly apdScale: number;
      /** Id of the conducted atrial beat, or null (ectopic / escape). */
      readonly fromA: number | null;
    }
  | { readonly kind: 'block'; readonly id: number; readonly tMs: number; readonly aId: number; readonly site: 'AVN' | 'His' };

export interface RhythmGenerator {
  /** Deterministic, append-only. Returns all events with tMs ≤ tMs (generating as needed). */
  eventsUntil(tMs: number): readonly BeatEvent[];
  /** Applies to beats scheduled after fromMs. */
  setHeartRate(bpm: number, fromMs: number): void;
  readonly heartRate: number;
}

export interface HeartVectorStream {
  readonly fsHz: number;
  /**
   * Fills n samples starting at t0Ms (step 1000/fsHz ms). Frank frame, mV, pose applied.
   * outA / outV hold 3·n floats, interleaved X,Y,Z per sample.
   */
  sample(t0Ms: number, n: number, outA: Float32Array, outV: Float32Array): void;
}

// ---------------------------------------------------------------- leads

export type FrankVec = readonly [number, number, number];

/** Electrode lead vectors in the WCT gauge (L_RA + L_LA + L_LL = 0). */
export interface ElectrodeField {
  readonly L: Readonly<Record<ElectrodeId, FrankVec>>;
}

/**
 * Electrode cable → physical position it is attached to (limb-lead reversal / misplacement).
 * Identity when omitted. E.g. LA/RA reversal = { LA: 'RA', RA: 'LA' }.
 */
export type Wiring = Partial<Record<ElectrodeId, ElectrodeId>>;

export interface LeadProjector {
  readonly leads: readonly LeadName[];
  /** 12×3 row-major lead matrices applied to H_A and H_V. */
  readonly mA: Float32Array;
  readonly mV: Float32Array;
  /** out[lead * n + i] (lead order = LEADS). */
  project(hA: Float32Array, hV: Float32Array, n: number, out: Float32Array): void;
  /** Ventricular lead vector (Frank) — for display of lead axes and sensitivity |L|. */
  leadVector(lead: LeadName): FrankVec;
}

// ---------------------------------------------------------------- truth & measurement

export interface SegmentSpan {
  readonly seg: WaveSegment;
  readonly t0: number;
  readonly t1: number;
}
export interface MechSpan {
  readonly phase: MechPhase;
  readonly t0: number;
  readonly t1: number;
}
export interface ValveEvents {
  readonly id: ValveId;
  readonly openMs: number;
  readonly closeMs: number;
}

/** Model truth for one cardiac cycle, absolute ms. */
export interface CycleTruth {
  readonly aId: number | null;
  readonly vId: number | null;
  readonly segments: readonly SegmentSpan[];
  readonly mech: readonly MechSpan[];
  readonly valves: readonly ValveEvents[];
  /** Absolute times of key truth points. */
  readonly pOn: number | null;
  readonly pOff: number | null;
  readonly qrsOn: number | null;
  readonly qrsOff: number | null;
  readonly tEnd: number | null;
}

export interface LeadMeasure {
  readonly lead: LeadName;
  readonly pAmp: number;
  readonly qAmp: number;
  readonly qDurMs: number;
  readonly rAmp: number;
  readonly sAmp: number;
  readonly stJ: number;
  readonly stJ60: number;
  readonly tAmp: number;
  readonly netQrsArea: number;
  readonly netTArea: number;
}

export interface BeatMeasurement {
  readonly hrBpm: number;
  readonly prMs: number;
  readonly pDurMs: number;
  readonly qrsMs: number;
  readonly qtMs: number;
  readonly qtcBazettMs: number;
  readonly qtcFridericiaMs: number;
  /** Clinical frontal axis atan2(2·aVF/√3, I) from net areas (deg). */
  readonly axisQrsDeg: number;
  readonly axisPDeg: number;
  readonly axisTDeg: number;
  readonly leads: Readonly<Record<LeadName, LeadMeasure>>;
  /** First precordial lead with R/S ≥ 1. */
  readonly transitionLead: LeadName | null;
  readonly vcg: { readonly qrsPeakMv: number; readonly tPeakMv: number; readonly qrsTAngleDeg: number; readonly svgMvMs: number };
}

// ---------------------------------------------------------------- engine facade (what the UI consumes)

/** One of up to two simultaneously visible beats per compartment (GPU slots). */
export interface ActiveBeat {
  readonly eventId: number;
  /** Which activation-field slot (aTAct0 / aTAct1) this beat uses. */
  readonly slot: 0 | 1;
  /** Time since the beat event, ms (computed in float64 on the CPU). */
  readonly sinceMs: number;
  readonly apdScale: number;
}

export interface BeatSnapshot {
  /** Most recent beat first. */
  readonly atrial: readonly [ActiveBeat | null, ActiveBeat | null];
  readonly ventricular: readonly [ActiveBeat | null, ActiveBeat | null];
}

export interface EngineFields {
  /** Activation fields per compartment slot. Slot 1 is null when unused. */
  readonly atrial: readonly [ActivationField, ActivationField | null];
  readonly ventricular: readonly [ActivationField, ActivationField | null];
  readonly apd: ApdField;
  readonly apAtrial: ApParams;
  readonly apVentricular: ApParams;
}

export interface SimEngine {
  readonly geometry: GeometryBundle;
  readonly fields: EngineFields;
  readonly fsHz: number;
  readonly projector: LeadProjector;
  readonly electrodes: ElectrodeField;
  readonly rhythm: RhythmGenerator;
  /** Frank H_A, H_V in mV, 3·n interleaved. */
  sampleH(t0Ms: number, n: number, outA: Float32Array, outV: Float32Array): void;
  /** 12 leads, out[lead * n + i]. */
  sampleLeads(t0Ms: number, n: number, out: Float32Array): void;
  activeBeats(tMs: number): BeatSnapshot;
  cycleAt(tMs: number): CycleTruth | null;
  responsible(tMs: number): readonly { readonly id: StructureId; readonly w: number }[];
  /**
   * Continuous atrial field (AF) for the GPU: writes the packed rotor frame for time t into out (AF_STRIDE floats per
   * rotor, layout in sim/source/afField.ts) and returns the rotor count; 0 when the atria follow discrete beats.
   */
  afFrame(tMs: number, out: Float32Array): number;
  setHeartRate(bpm: number): void;
  setPose(pose: Pose): void;
  /** Fires when geometry/fields/projector change (scenario switch). Returns unsubscribe. */
  onChange(cb: () => void): () => void;
}
