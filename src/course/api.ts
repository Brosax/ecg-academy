/**
 * PUBLIC CONTRACT of the course (src/course): the lesson schema (lessons are data in src/course/lessons/<id>.ts), the
 * lesson player and the course map. Lesson anatomy: docs/PLAN.md §4; curriculum: §3. Text is inline L10n {zh, en, es}
 * written for medical students: short paragraphs, one idea per block, numeric criteria from docs/curriculum/criteria.md.
 *
 * Synthetic ECGs in lessons are SynthRequests (scenario ids from _proto/DECISION.md §9 / src/synth catalogue). Marks on
 * synthetic ECGs should be AutoMarks (resolved from the model truth at render time) rather than hard-coded times.
 */
import type { CompetencyId, EcgSource, ItemView, StageId } from '../practice/api';
import type { FindingId } from '../core/findings';
import type { L10n } from '../core/l10n';
import type { Lead } from '../core/leads';
import type { RegionId } from '../core/regions';
import type { EcgMark, MarkColor } from '../ecg/api';
import type { FigureProps } from '../figures/api';
import type { Difficulty, DialId } from '../synth/api';

/**
 * A mark computed from the ECG's truth when the lesson renders (works for any seed / dial value).
 * `beat`: index into truth.beats (default: the dominant beat in the middle of the strip).
 */
export interface AutoMark {
  readonly auto:
    | 'p' // P wave region
    | 'pr' // PR interval bracket
    | 'pr-segment'
    | 'qrs' // QRS duration bracket
    | 'q' | 'r' | 's' // wave labels of the dominant QRS in that lead
    | 'j' // J point
    | 'st' // ST segment region (J → T onset)
    | 'st60' // J+60 ms marker with ST deviation
    | 't' // T wave region
    | 'qt' // QT bracket
    | 'rr' // RR interval between beat and beat+1
    | 'u'
    | 'delta'
    | 'f-waves' // flutter / fibrillatory waves
    | 'blocked-p' // non-conducted P waves
    | 'pacing-spike';
  readonly lead?: Lead | 'all';
  readonly beat?: number;
  readonly color?: MarkColor;
  readonly label?: L10n;
}
export type LessonMark = EcgMark | AutoMark;

/** A reference to a practice item: generated from a drill family (seeded) or written inline for this lesson. */
export type ItemRef =
  | { readonly family: string; readonly seed: number; readonly difficulty?: Difficulty }
  | { readonly inline: import('../practice/api').Item };

/** One question the learner answers before an experiment plays; the reveal is the experiment itself. Never sent to the assistant. */
export interface Prediction {
  readonly question: L10n;
  readonly options: readonly L10n[];
  /** index into options */
  readonly answer: number;
  /** the options form a scale (numbers, less → more) and are shown as written; otherwise the player shows them in a
   * fixed order seeded by the question (live.ts optionOrder), so the answer's position gives nothing away */
  readonly ordered?: boolean;
}

/** What the tracing shows while the played dial is inside [min, max]. */
export interface DialNote {
  readonly min: number;
  readonly max: number;
  readonly text: L10n;
}

/**
 * A live block's experiment: `dial` starts at `from` (default: its start value), sweeps once to `to` and holds;
 * `notes` follow its value.
 */
export interface LivePlay {
  readonly dial: DialId;
  readonly from?: number;
  readonly to: number;
  readonly notes?: readonly DialNote[];
}

/** One state of a film: an ECG from the engine, a short chip label and what to look at. */
export interface FilmFrame {
  readonly label: L10n;
  readonly ecg: EcgSource;
  readonly note: L10n;
  readonly marks?: readonly LessonMark[];
}

export interface WorkedStep {
  readonly title: L10n;
  readonly body: L10n;
  readonly marks?: readonly LessonMark[];
  readonly highlightLeads?: readonly Lead[];
  readonly view?: ItemView;
}

export type Block =
  /** attempt-first question before teaching */
  | { readonly kind: 'hook'; readonly ecg: EcgSource; readonly view?: ItemView; readonly question: L10n; readonly reveal: L10n }
  /** short text; light markup: **bold**, *italic*, line breaks, "- " bullets */
  | { readonly kind: 'text'; readonly title?: L10n; readonly body: L10n }
  | { readonly kind: 'ecg'; readonly ecg: EcgSource; readonly view?: ItemView; readonly marks?: readonly LessonMark[]; readonly caption: L10n }
  /** live synthetic ECG with dials the learner moves (truth stays exact) */
  | { readonly kind: 'live'; readonly scenario: string; readonly variant?: string; readonly seed: number; readonly dials: readonly { readonly id: DialId; readonly label?: L10n }[]; readonly view?: ItemView; readonly marks?: readonly LessonMark[]; readonly caption: L10n; readonly play?: LivePlay; readonly predict?: Prediction }
  /** engine states shown in turn in one place (plays once and holds, then the learner steps), each with what to notice */
  | { readonly kind: 'film'; readonly title: L10n; readonly frames: readonly FilmFrame[]; readonly view?: ItemView; readonly predict?: Prediction; readonly caption: L10n }
  | { readonly kind: 'figure'; readonly figure: FigureProps; readonly ecg?: EcgSource; readonly caption?: L10n }
  /** ECG + small 3D heart following the shared cursor */
  | { readonly kind: 'heart'; readonly ecg: EcgSource; readonly emphasize?: readonly RegionId[]; readonly showConduction?: boolean; readonly caption: L10n }
  | { readonly kind: 'criteria'; readonly title: L10n; readonly items: readonly { readonly label: L10n; readonly value: L10n }[]; readonly source?: string }
  | { readonly kind: 'worked'; readonly title: L10n; readonly ecg: EcgSource; readonly view?: ItemView; readonly steps: readonly WorkedStep[] }
  | { readonly kind: 'contrast'; readonly title: L10n; readonly left: { readonly ecg: EcgSource; readonly caption: L10n; readonly marks?: readonly LessonMark[] }; readonly right: { readonly ecg: EcgSource; readonly caption: L10n; readonly marks?: readonly LessonMark[] }; readonly point: L10n; readonly view?: ItemView }
  | { readonly kind: 'check'; readonly item: ItemRef }
  | { readonly kind: 'drill'; readonly families: readonly string[]; readonly count: number; readonly passScore: number; readonly difficulty?: Difficulty }
  | { readonly kind: 'real'; readonly ids: readonly number[]; readonly caption: L10n }
  | { readonly kind: 'pitfalls'; readonly items: readonly L10n[] }
  | { readonly kind: 'summary'; readonly points: readonly L10n[] };

export interface Lesson {
  /** stable id, e.g. 'f1', 's4' (docs/PLAN.md §3) */
  readonly id: string;
  readonly stage: StageId;
  readonly order: number;
  readonly title: L10n;
  readonly summary: L10n;
  readonly objectives: readonly L10n[];
  readonly minutes: number;
  readonly competencies: readonly CompetencyId[];
  readonly findings: readonly FindingId[];
  readonly blocks: readonly Block[];
  /** references (guidelines, papers; the book only as "Castellano et al. 2004") */
  readonly sources: readonly string[];
}

export interface StageDef {
  readonly id: StageId;
  readonly title: L10n;
  readonly goal: L10n;
  /** lesson ids in order (lessons not yet written are listed as 'planned') */
  readonly lessons: readonly { readonly id: string; readonly title: L10n; readonly status: 'ready' | 'planned' }[];
}
