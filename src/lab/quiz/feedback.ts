/** Localized correct-answer text and model-generated explanations for quiz feedback. */
import type { AppCommands } from '../app/commands';
import type { Lang } from '../app/store';
import { dirPhrase, directionsOf, explainLeadAt, explainSegment, fmtNum, joinList, meanLeadDirection } from '../explain';
import { tc } from '../i18n/common';
import { tq } from '../i18n/quiz';
import type { SimEngine } from '../sim/types';
import { depolarizingAt } from './generators';
import type { Grade, ShowPlan } from './grade';
import type { Question, QuizResponse } from './types';

const rel = (t: number, zero: number) => Math.round(t - zero);

export function answerText(q: Question, lang: Lang): string {
  switch (q.kind) {
    case 'segment':
      return `${tc.in(lang, `seg.${q.seg}`)} (${rel(q.answer.t0, q.strip.zeroMs)}–${rel(q.answer.t1, q.strip.zeroMs)} ms)`;
    case 'leadGroup':
      return q.answer.join(', ');
    case 'projection':
      return `${tq.in(lang, `quiz.opt.${q.answer}`)} (${fmtNum(q.valueMv, 2, lang, true)} mV)`;
    case 'structure':
      return tc.in(lang, `struct.${q.answer}`);
    case 'calipers':
      return `${Math.round(q.answerMs)} ms`;
  }
}

export function responseText(q: Question, r: QuizResponse, lang: Lang): string {
  switch (r.kind) {
    case 'segment':
      return q.kind === 'segment' ? `${rel(r.tMs, q.strip.zeroMs)} ms` : '';
    case 'leadGroup':
      return r.leads.length ? r.leads.join(', ') : '—';
    case 'projection':
      return tq.in(lang, `quiz.opt.${r.choice}`);
    case 'structure':
      return tc.in(lang, `struct.${r.choice}`);
    case 'calipers':
      return `${Math.round(Math.abs(r.t1 - r.t0))} ms`;
  }
}

export function explainAnswer(engine: SimEngine, q: Question, g: Grade, lang: Lang): string[] {
  switch (q.kind) {
    case 'segment': {
      const z = q.strip.zeroMs;
      const cycle = engine.cycleAt(q.answer.t0 + 0.5);
      return [
        tq.in(lang, 'fb.segment', {
          seg: tq.in(lang, `quiz.seg.${q.seg}`), t0: rel(q.answer.t0, z), t1: rel(q.answer.t1, z),
          dur: Math.round(q.answer.t1 - q.answer.t0),
        }),
        explainSegment(q.seg, lang, cycle).sentences[0],
      ];
    }
    case 'leadGroup':
      return [
        tq.in(lang, 'fb.leadGroup', {
          wall: tq.in(lang, `quiz.wall.${q.wall}`), leads: q.answer.join(', '),
          dirs: dirPhrase(lang, directionsOf(meanLeadDirection(engine, q.answer))),
        }),
      ];
    case 'projection':
      return [...explainLeadAt(engine, q.lead, q.tMs, lang).sentences];
    case 'structure': {
      const dep = depolarizingAt(engine, q.tMs).map((id) => tc.in(lang, `struct.${id}`));
      const ex = explainLeadAt(engine, 'II', q.tMs, lang);
      return [tq.in(lang, 'fb.structure', { list: joinList(lang, dep) }), ex.sentences[0]];
    }
    case 'calipers':
      return [
        tq.in(lang, 'fb.calipers', {
          pr: Math.round(q.answerMs), m: Math.round(g.measuredMs ?? 0), err: fmtNum(g.errorMs ?? 0, 0, lang, true),
          tol: q.toleranceMs,
        }),
      ];
  }
}

/** Executes a "show me in 3D" plan through AppCommands only. */
export function applyShowPlan(plan: ShowPlan, commands: AppCommands): void {
  if (plan.mode) commands.setMode(plan.mode);
  commands.pause();
  if (plan.seek !== null) commands.seek(plan.seek);
  if (plan.lead) commands.selectLead(plan.lead);
  if (plan.slice) commands.setSlice(plan.slice);
  if (plan.highlight.length) commands.highlight(plan.highlight);
  else commands.clearHighlight();
}
