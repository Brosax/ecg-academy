/** Grading and "show me in 3D" plans — pure, so the quiz panel only renders and dispatches. */
import { SEGMENT_STRUCTURES } from '../app/commands';
import type { Mode, SlicePreset } from '../app/store';
import type { LeadName, StructureId, WaveSegment } from '../sim/types';
import { SEGMENT_CLICK_TOL_MS } from './generators';
import type { Question, QuizResponse, Wall } from './types';

export interface Grade {
  readonly correct: boolean;
  /** Calipers: measured interval (ms) and error vs. truth. */
  readonly measuredMs?: number;
  readonly errorMs?: number;
}

export function grade(q: Question, r: QuizResponse): Grade {
  if (q.kind !== r.kind) return { correct: false };
  switch (q.kind) {
    case 'segment': {
      const t = (r as Extract<QuizResponse, { kind: 'segment' }>).tMs;
      return { correct: t >= q.answer.t0 - SEGMENT_CLICK_TOL_MS && t <= q.answer.t1 + SEGMENT_CLICK_TOL_MS };
    }
    case 'leadGroup': {
      const sel = new Set((r as Extract<QuizResponse, { kind: 'leadGroup' }>).leads);
      return { correct: sel.size === q.answer.length && q.answer.every((l) => sel.has(l)) };
    }
    case 'projection':
      return { correct: (r as Extract<QuizResponse, { kind: 'projection' }>).choice === q.answer };
    case 'structure':
      return { correct: (r as Extract<QuizResponse, { kind: 'structure' }>).choice === q.answer };
    case 'calipers': {
      const c = r as Extract<QuizResponse, { kind: 'calipers' }>;
      const measuredMs = Math.abs(c.t1 - c.t0);
      const errorMs = measuredMs - q.answerMs;
      return { correct: Math.abs(errorMs) <= q.toleranceMs, measuredMs, errorMs };
    }
  }
}

// ---------------------------------------------------------------- show me in 3D

export interface ShowPlan {
  readonly mode: Mode | null;
  readonly seek: number | null;
  readonly highlight: readonly StructureId[];
  readonly slice: SlicePreset | null;
  readonly lead: LeadName | null;
}

const SEGMENT_SLICE: Readonly<Record<WaveSegment, SlicePreset>> = {
  P: 'fourChamber', PR: 'fourChamber', QRS: 'shortMid', ST: 'shortMid', T: 'longAxis', TP: 'fourChamber',
};

/** Cut that shows a structure best (atria / conduction system: four-chamber; ventricular regions: short axis). */
export function sliceForStructure(id: StructureId): SlicePreset {
  switch (id) {
    case 'SEPTUM': case 'LV_ANTERIOR': case 'LV_LATERAL': case 'LV_INFERIOR': case 'RV_FREE':
      return 'shortMid';
    case 'LV_APEX': case 'RV_APEX':
      return 'shortApex';
    case 'LV_POSTEROBASAL': case 'RVOT': case 'MITRAL': case 'TRICUSPID': case 'AORTIC': case 'PULMONARY':
      return 'shortBase';
    default:
      return 'fourChamber';
  }
}

const WALL_STRUCTURES: Readonly<Record<Wall, readonly StructureId[]>> = {
  inferior: ['LV_INFERIOR'],
  lateral: ['LV_LATERAL'],
  septal: ['SEPTUM'],
  anterior: ['LV_ANTERIOR'],
};

export function showPlan(q: Question): ShowPlan {
  switch (q.kind) {
    case 'segment': {
      const s = q.answer;
      return { mode: null, seek: s.t0 + 0.4 * (s.t1 - s.t0), highlight: SEGMENT_STRUCTURES[q.seg], slice: SEGMENT_SLICE[q.seg], lead: 'II' };
    }
    case 'leadGroup':
      // Leads mode shows the torso, the electrodes and the selected lead's axis.
      return { mode: 'leads', seek: null, highlight: WALL_STRUCTURES[q.wall], slice: null, lead: q.answer[0] };
    case 'projection':
      return { mode: null, seek: q.tMs, highlight: [], slice: null, lead: q.lead };
    case 'structure':
      return { mode: null, seek: q.tMs, highlight: [q.answer], slice: sliceForStructure(q.answer), lead: null };
    case 'calipers':
      return { mode: null, seek: q.pOn, highlight: ['SA', 'RA', 'AVN', 'HIS'], slice: 'fourChamber', lead: 'II' };
  }
}
