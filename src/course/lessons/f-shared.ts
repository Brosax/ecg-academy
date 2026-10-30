/**
 * Helpers shared by the stage-F lesson files (f1–f6). Not a lesson: the registry glob ('./[a-z][0-9]*.ts') does not
 * match this file name.
 *
 * Synthetic ECGs come from the synth catalogue scenarios. Technical conditions (cable reversals, chest-electrode swaps)
 * are the `normal` scenario recorded through another placement (SynthRequest.recording): the heart is untouched and
 * only the lead system changes (CLAUDE.md one-source rule). Filters and artefacts are recording-chain settings too
 * (`rec()` below, or the technical scenarios of the synth catalogue).
 */
import { l, type L10n } from '../../core/l10n';
import type { Lead } from '../../core/leads';
import type { FindingId } from '../../core/findings';
import type { EcgMark } from '../../ecg/api';
import type { CompetencyId, EcgSource, Item, ItemView } from '../../practice/api';
import type { DialId, FilterSpec, PlacementSpec, RecordingSpec } from '../../synth/api';

type Dials = Readonly<Partial<Record<DialId, number>>>;

/** A synthetic ECG source. */
export function syn(scenario: string, seed: number, dials?: Dials, placement?: PlacementSpec): EcgSource {
  return {
    kind: 'synth',
    req: {
      scenario,
      seed,
      ...(dials ? { dials } : {}),
      ...(placement ? { recording: { placement } } : {}),
    },
  };
}

/** A synthetic ECG recorded through a given recording chain (filter, noise, placement). */
export function rec(scenario: string, seed: number, recording: RecordingSpec, dials?: Dials): EcgSource {
  return { kind: 'synth', req: { scenario, seed, recording, ...(dials ? { dials } : {}) } };
}

/** The bedside-monitor filter (= FILTER_PRESETS.monitor of src/synth/api: 0.5–40 Hz, causal, 50-Hz notch). */
export const MONITOR_FILTER: FilterSpec = { highpassHz: 0.5, lowpassHz: 40, notchHz: 50, phase: 'causal' };

/** A real PTB-XL tracing. */
export const real = (id: number): EcgSource => ({ kind: 'real', id });

/** Cable / electrode errors as placements (cable → the limb or chest site it is attached to). */
export const PLACEMENT = {
  /** left- and right-arm cables reversed */
  laRa: { limbs: { RA: 'LA', LA: 'RA' } },
  /** left-arm and left-leg cables reversed */
  laLl: { limbs: { LA: 'LL', LL: 'LA' } },
  /** right-arm and left-leg cables reversed */
  raLl: { limbs: { RA: 'LL', LL: 'RA' } },
  /** right-arm cable on the right leg, neutral cable on the right arm */
  raRl: { limbs: { RA: 'RL', RL: 'RA' } },
  /** left-arm cable on the right leg, neutral cable on the left arm */
  laRl: { limbs: { LA: 'RL', RL: 'LA' } },
  /** V1 and V2 cables exchanged */
  v1v2: { chest: { V1: 'V2', V2: 'V1' } },
  /** V2 and V3 cables exchanged */
  v2v3: { chest: { V2: 'V3', V3: 'V2' } },
  /** V1 and V3 cables exchanged */
  v1v3: { chest: { V1: 'V3', V3: 'V1' } },
} as const satisfies Readonly<Record<string, PlacementSpec>>;

interface ItemCommon {
  /** an existing practice family (mastery and spaced review stay coherent) */
  readonly family: string;
  readonly competency: CompetencyId;
  readonly seed: number;
  readonly prompt: L10n;
  readonly ecg: EcgSource;
  readonly view?: ItemView;
  readonly explanation: L10n;
  readonly hint?: L10n;
  readonly findings?: readonly FindingId[];
  readonly reveal?: readonly EcgMark[];
}

function base(p: ItemCommon) {
  return {
    id: `${p.family}:classic:${p.seed}`,
    family: p.family,
    competency: p.competency,
    difficulty: 'classic' as const,
    seed: p.seed,
    prompt: p.prompt,
    ecg: p.ecg,
    ...(p.view ? { view: p.view } : {}),
    explanation: p.explanation,
    ...(p.hint ? { hint: p.hint } : {}),
    ...(p.reveal ? { reveal: p.reveal } : {}),
    findings: p.findings ?? [],
  };
}

/** An inline single-choice item. */
export function choiceItem(p: ItemCommon & { readonly options: readonly { readonly id: string; readonly label: L10n }[]; readonly correct: string }): Item {
  return { ...base(p), kind: 'choice', key: { options: p.options, correct: p.correct } };
}

/** An inline "click the lead" item: any click inside one of the target leads is right. */
export function leadItem(p: ItemCommon & { readonly leads: readonly Lead[]; readonly durationMs?: number }): Item {
  const t1 = p.durationMs ?? 10_000;
  return {
    ...base({ ...p, reveal: p.reveal ?? p.leads.map((lead) => ({ kind: 'lead' as const, lead, color: 'ok' as const })) }),
    kind: 'locate',
    key: { targets: p.leads.map((lead) => ({ lead, t0: 0, t1 })), need: 'one' },
  };
}

/** Shared answer labels. */
export const OPT = {
  laRa: l('左右上肢电极反接', 'Left/right arm cables reversed', 'Inversión de los cables de los brazos'),
  laLl: l('左上肢与左下肢电极反接', 'Left arm / left leg cables reversed', 'Inversión de los cables de brazo izquierdo y pierna izquierda'),
  raLl: l('右上肢与左下肢电极反接', 'Right arm / left leg cables reversed', 'Inversión de los cables de brazo derecho y pierna izquierda'),
  normal: l('记录正确，可以判读', 'Correct recording: go on and read it', 'Registro correcto: se puede interpretar'),
  dextro: l('右位心', 'Dextrocardia', 'Dextrocardia'),
} as const;

/** Sources cited by several stage-F lessons. */
export const SRC = {
  kligfield: 'Kligfield P et al. AHA/ACCF/HRS Recommendations for the Standardization and Interpretation of the ECG, Part I: The electrocardiogram and its technology. Circulation 2007;115:1306-1324',
  book: 'Castellano et al. 2004 (Electrocardiografía Clínica, 2nd ed.): curriculum structure only',
} as const;
