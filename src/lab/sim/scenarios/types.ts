/**
 * Disease / rhythm scenario specification (round 2). A scenario may only change (CLAUDE.md, one-source rule):
 *   1. the rhythm generator,
 *   2. the conduction graph (activation variants: blocked terminals, Purkinje exclusions, ectopic or accessory seeds),
 *   3. voxel / region parameters (injury, necrosis, voltage weights, AP parameters via EngineParams),
 *   4. geometry (via tissue relabelling).
 * Every ECG sample still comes from H(t) = −gain · Σ c_v · s_v(t); nothing is drawn per lead.
 */
import type { AtrialCircuitSpec } from '../conduction/atrialCircuit';
import type { EngineParams } from '../conduction/params';
import type { AfSpec } from '../source/afField';
import type { NotchSpec } from '../source/apNotch';
import type { VfSpec } from '../source/vfField';
import type { LeadName, StructureId, Vec3 } from '../types';

export type DiseaseCategory =
  | 'normal-sinus' | 'supraventricular' | 'ventricular' | 'av-conduction' | 'intraventricular-conduction'
  | 'pre-excitation' | 'ischemia-infarction' | 'hypertrophy' | 'electrolyte-drug-qt' | 'other';

export type Terminal = 'LAF' | 'LPF' | 'LSF' | 'RBB';

/** Where a seed sits: a landmark, or a point in the heart-local frame (mm). */
export type SiteRef = StructureId | Vec3;

export interface VentricularVariantSpec {
  /** BeatEvent.variant id. */
  readonly id: string;
  /** Bundle / fascicle terminals that do not conduct (bundle-branch or fascicular block). */
  readonly blockTerminals?: readonly Terminal[];
  /** Extra conduction delay at terminals (ms). */
  readonly terminalDelayMs?: Partial<Record<Terminal, number>>;
  /** Additional regions without Purkinje coverage (added to EngineParams.purkinjeExclude). */
  readonly purkinjeExclude?: readonly StructureId[];
  /**
   * AHA segments (1–17) whose LV endocardium has no Purkinje coverage (finer than purkinjeExclude; the RV side of the
   * septum keeps its Purkinje). Fascicular block: the blocked fascicle's own Purkinje territory, which is then
   * activated late through the muscle from the neighbouring territories.
   */
  readonly purkinjeExcludeAha?: readonly number[];
  /**
   * Muscle → Purkinje re-entry delay (ms). Finite for bundle-branch block so the blocked side's Purkinje network is
   * reached through the muscle (QRS ≈ 140–160 ms rather than > 180 ms).
   */
  readonly retroDelayMs?: number;
  /** Ectopic origin (PVC, VT, ventricular escape): no His–Purkinje input; t = 0 at the V event. */
  readonly ectopic?: { readonly at: SiteRef; readonly layer?: 'endo' | 'epi' };
  /** Accessory pathway insertion (pre-excitation): extra ventricular seed, ms relative to the V (His) event. */
  readonly accessory?: { readonly at: SiteRef; readonly tMs: number };
  /** Regional conduction-speed factors (e.g. slow transseptal conduction in LBBB, ischaemic or hyperkalaemic tissue). */
  readonly speed?: readonly (RegionSelector & { readonly factor: number })[];
}

export interface AtrialVariantSpec {
  readonly id: string;
  /** Activation origin: the SA node (default), an ectopic atrial site, or the AV node (retrograde). */
  readonly origin?: 'SA' | 'AVN' | SiteRef;
  /**
   * Macro-re-entry around the tricuspid annulus (atrial flutter, conduction/atrialCircuit.ts): one revolution of the
   * circuit instead of a beat from `origin`; its cycle length drives the rhythm's `flutter` mode.
   */
  readonly circuit?: AtrialCircuitSpec;
}

/** AV conduction of each atrial beat. */
export interface AvSpec {
  readonly mode: 'normal' | 'first-degree' | 'wenckebach' | 'mobitz2' | 'complete';
  /** PR target (first degree) or first PR of a Wenckebach cycle (ms). */
  readonly prMs?: number;
  /** Wenckebach / Mobitz II: beats per cycle (e.g. 4 → 4:3 conduction). */
  readonly ratio?: number;
  /** Wenckebach: PR increment of the 2nd beat (ms), decreasing afterwards. */
  readonly incrementMs?: number;
  /** Mobitz II: where the dropped beats block (default His–Purkinje; the AV-node delay stays constant). */
  readonly site?: 'AVN' | 'His';
  /** Escape rhythm when no conducted beat arrives (complete block). */
  readonly escape?: { readonly variant: string; readonly bpm: number };
}

export interface RhythmSpec {
  /** Sinus (atrial) rate; the heart-rate slider sets this. */
  readonly bpm?: number;
  /** Respiratory sinus arrhythmia: fractional RR modulation depth and period. */
  readonly respiratory?: { readonly depth: number; readonly periodMs: number };
  readonly av?: AvSpec;
  /** Premature beats: every Nth beat is replaced by an ectopic beat with the given coupling (fraction of RR). */
  readonly ectopy?: { readonly comp: 'A' | 'V'; readonly variant: string; readonly every: number; readonly couplingFrac: number };
  /** Ventricular tachycardia: ventricular events at bpm from an ectopic variant; sinus P waves dissociated. */
  readonly vt?: { readonly variant: string; readonly bpm: number };
  /**
   * Junctional rhythm: the sinus node is silent; the AV junction fires at bpm, activating the ventricles through the
   * His bundle (normal QRS) and the atria retrogradely (P′ = retroVariant, retroDelayMs after the His event).
   */
  readonly junctional?: {
    readonly bpm: number;
    readonly retroVariant: string;
    readonly retroDelayMs: number;
    /**
     * The junctional beats come from AV-nodal re-entry (AVNRT: each turn of the slow–fast circuit sends one impulse down
     * the His bundle and one up to the atria), not from an automatic focus. Same timing model; the rate control is
     * labelled as the tachycardia rate (rate.ts 'svt').
     */
    readonly reentry?: boolean;
  };
  /**
   * Atrial fibrillation: the atria are driven by a continuous rotor field (no A events, no P waves); the AV node
   * filters the bombardment and bpm is the mean ventricular rate.
   */
  readonly af?: AfSpec;
  /**
   * Atrial flutter: the main atrial variant is a re-entry circuit (AtrialVariantSpec.circuit); one A event per revolution
   * at the circuit's cycle length, no sinus beats. The AV node conducts every `ratio`-th flutter wave (2 → 2:1); the
   * heart-rate control sets the mean ventricular rate through the ratio (rhythm/flutterAv.ts).
   */
  readonly flutter?: { readonly ratio: number };
  /**
   * Ventricular fibrillation / torsades de pointes: the ventricles are driven by a continuous scroll-wave field
   * (source/vfField.ts) instead of ventricular beats. Without `episodes` the field runs all the time (VF: no V events,
   * the atria keep their sinus rhythm, nothing conducts); with `episodes` it runs in torsades episodes initiated by
   * short–long–short sequences on a long-QT sinus rhythm (rhythm/tdpRhythm.ts).
   */
  readonly vf?: VfSpec;
  /** Random seed for any stochastic element. */
  readonly seed?: number;
}

export interface RegionSelector {
  /** AHA segments (1–17). */
  readonly aha?: readonly number[];
  readonly regions?: readonly StructureId[];
  /** Restrict to a wall layer: transmural (default), subendocardial (inner ⅓) or epicardial (outer ⅓). */
  readonly layer?: 'transmural' | 'subendocardial' | 'epicardial';
  /**
   * Interleaved subset (added for hypokalaemia): keep `keep` of every `of` voxel lattice classes (i + 2j + 3k) mod `of`,
   * spread evenly (tissue.ts interleaveKeeps) — a fraction keep/of of the selection mixed in at the voxel scale, so every
   * small patch of wall contains both populations (Σ c over the subset ≈ keep/of · Σ c over the selection: no net
   * dipole of its own).
   */
  readonly interleave?: { readonly keep: number; readonly of: number };
}

export interface TissueSpec {
  /**
   * Current of injury: plateau reduction ε (systolic) and resting depolarization r (diastolic), normalized to the AP
   * excursion. Per voxel the AP becomes r + (1 − ε − r)·s(t).
   */
  readonly injury?: readonly (RegionSelector & { readonly plateauDrop: number; readonly restRise: number })[];
  /** Necrosis: voxels relabelled Dead (non-excitable, insulating) — Q waves emerge from the missing wavefront. */
  readonly dead?: readonly RegionSelector[];
  /** Source-strength weights (e.g. hypertrophy). */
  readonly gain?: readonly (RegionSelector & { readonly factor: number })[];
  /**
   * Regional action-potential-duration changes (ms, added to the anatomical APD map): repolarization changes such as
   * RV strain or Wellens. The ECG, the 3D colouring and the slice all read the same modified APD field.
   */
  readonly apd?: readonly (RegionSelector & { readonly deltaMs: number })[];
  /**
   * Hypertrophy / chamber enlargement (batch 3, scenarios/wallThickness.ts). Ventricular selectors: the wall is `factor`
   * times thicker than the voxel geometry, mapped onto the fixed grid as a transmural stretch — fronts running along
   * the wall get a factor-fold larger source surface and crossing the wall takes factor-fold longer (same tissue
   * speed, longer path). Atrial selectors (RA / LA / LAA): enlargement as an isotropic source factor. Both act per voxel
   * FACE (source/hypertrophyKernel.ts), so Σc ≡ 0 holds and a uniform plateau gives no current (unlike `gain`).
   */
  readonly hypertrophy?: readonly (RegionSelector & { readonly factor: number })[];
  /**
   * Phase-1 notch of the ventricular AP (transient outward current I_to, spike-and-dome; source/apNotch.ts): changes
   * s_v(t) of the selected ventricular voxels (later entries override earlier ones). An epicardial notch gives the J
   * (Osborn) wave of hypothermia; a deep RVOT-epicardial notch with a partly lost dome the coved ST of Brugada.
   */
  readonly notch?: readonly (RegionSelector & NotchSpec)[];
}

/** Teaching metadata (text lives in src/i18n/disease). */
export interface TeachSpec {
  readonly keyLeads: readonly LeadName[];
  /** Structures to highlight in 3D. */
  readonly highlight: readonly StructureId[];
  /** Overlay meshes to highlight (culprit coronary artery ids). */
  readonly overlays?: readonly string[];
}

export interface Scenario {
  /** docs/research/disease-spec.json id (or 'normal-sinus-rhythm'). */
  readonly id: string;
  readonly category: DiseaseCategory;
  /** EngineParams overrides on top of the calibrated normal parameters. */
  readonly params: Partial<EngineParams>;
  readonly rhythm: RhythmSpec;
  /** Activation variants. Slot 0 = main, slot 1 = alternative (ectopic / escape / retrograde). */
  readonly atrial: { readonly main: AtrialVariantSpec; readonly alt?: AtrialVariantSpec };
  readonly ventricular: { readonly main: VentricularVariantSpec; readonly alt?: VentricularVariantSpec };
  readonly tissue?: TissueSpec;
  readonly teach?: TeachSpec;
}
