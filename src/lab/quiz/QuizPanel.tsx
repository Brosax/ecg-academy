/**
 * Quiz runner: one question at a time, feedback with the model-computed answer and explanation, "show me in 3D",
 * score summary, restart with the next seed. All app changes go through AppCommands (applyShowPlan).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { dirPhrase, directionsOf, fmtDeg, fmtNum, frontalAngleDeg, horizontalAngleDeg, mag } from '../explain';
import { tc } from '../i18n/common';
import { tq } from '../i18n/quiz';
import type { LeadName, SimEngine, StructureId } from '../sim/types';
import { LIMB_LEADS, PRECORDIAL_LEADS } from '../sim/types';
import { answerText, applyShowPlan, explainAnswer, responseText } from './feedback';
import { generateQuiz } from './generators';
import { grade, showPlan } from './grade';
import type { Grade } from './grade';
import { QuizStrip } from './QuizStrip';
import type { Polarity, Question, QuizKind, QuizResponse } from './types';
import { QUIZ_KINDS } from './types';
import { VectorPlanes } from './VectorPlanes';

interface Draft {
  readonly t?: number;
  readonly leads: readonly LeadName[];
  readonly choice?: string;
  readonly c0?: number;
  readonly c1?: number;
}
const EMPTY: Draft = { leads: [] };

interface Result {
  readonly q: Question;
  readonly response: QuizResponse;
  readonly grade: Grade;
}

function toResponse(q: Question, d: Draft): QuizResponse | null {
  switch (q.kind) {
    case 'segment':
      return d.t === undefined ? null : { kind: 'segment', tMs: d.t };
    case 'leadGroup':
      return d.leads.length ? { kind: 'leadGroup', leads: d.leads } : null;
    case 'projection':
      return d.choice ? { kind: 'projection', choice: d.choice as Polarity } : null;
    case 'structure':
      return d.choice ? { kind: 'structure', choice: d.choice as StructureId } : null;
    case 'calipers':
      return d.c0 === undefined || d.c1 === undefined ? null : { kind: 'calipers', t0: d.c0, t1: d.c1 };
  }
}

function makeQuiz(engine: SimEngine, seed: number): { questions: Question[]; error: string | null } {
  try {
    return { questions: generateQuiz(engine, { seed, tRef: store.time.peek() }), error: null };
  } catch (e) {
    return { questions: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export interface QuizPanelProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
  /** Called after "show me in 3D" (the drawer minimizes). */
  readonly onShow3D: () => void;
  readonly onProgress?: (n: number, total: number) => void;
}

export function QuizPanel({ engine, commands, onShow3D, onProgress }: QuizPanelProps) {
  const [seed, setSeed] = useState(1);
  const [quiz, setQuiz] = useState(() => makeQuiz(engine, 1));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const lang = store.lang.value;
  const total = quiz.questions.length;
  const done = results.length === total && total > 0;
  const q: Question | undefined = quiz.questions[idx];
  const answered = results[idx] as Result | undefined;

  useEffect(() => onProgress?.(Math.min(idx + 1, total), total), [idx, total]);

  const submit = () => {
    if (!q) return;
    const r = toResponse(q, draft);
    if (!r) return;
    setResults([...results, { q, response: r, grade: grade(q, r) }]);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };
  const next = () => {
    setIdx(idx + 1);
    setDraft(EMPTY);
    requestAnimationFrame(() => questionRef.current?.focus());
  };
  const restart = () => {
    const s = seed + 1;
    setSeed(s);
    setQuiz(makeQuiz(engine, s));
    setIdx(0);
    setResults([]);
    setDraft(EMPTY);
    requestAnimationFrame(() => questionRef.current?.focus());
  };

  if (quiz.error) return <p class="error">{tq('quiz.error', { msg: quiz.error })}</p>;

  if (done && idx >= total) {
    const score = results.filter((r) => r.grade.correct).length;
    return (
      <div class="quiz-summary">
        <h3 ref={questionRef} tabIndex={-1}>
          {tq('quiz.summary', { score, total, pct: Math.round((100 * score) / total) })}
        </h3>
        <ul>
          {QUIZ_KINDS.map((k: QuizKind) => {
            const rs = results.filter((r) => r.q.kind === k);
            return <li>{tq('quiz.summary.kind', { kind: tq(`quiz.kind.${k}`), score: rs.filter((r) => r.grade.correct).length, total: rs.length })}</li>;
          })}
        </ul>
        <button type="button" class="btn btn-primary" onClick={restart}>
          {tq('quiz.restart')}
        </button>
      </div>
    );
  }
  if (!q) return null;

  const locked = !!answered;
  const set = (patch: Partial<Draft>) => !locked && setDraft({ ...draft, ...patch });
  const score = results.filter((r) => r.grade.correct).length;

  return (
    <div class="quiz-body">
      <p class="quiz-progress">
        <span>{tq('quiz.progress', { n: idx + 1, total })}</span>
        <span class="chip">{tq(`quiz.kind.${q.kind}`)}</span>
        <span class="muted">{tq('quiz.scoreLive', { score })}</span>
      </p>
      <h3 class="quiz-question" ref={questionRef} tabIndex={-1}>
        {questionText(q, lang)}
      </h3>

      <QuestionBody q={q} engine={engine} draft={draft} set={set} locked={locked} />

      {!locked && (
        <button type="button" class="btn btn-primary" disabled={!toResponse(q, draft)} onClick={submit}>
          {tq('quiz.submit')}
        </button>
      )}

      {answered && (
        <div class={`quiz-feedback ${answered.grade.correct ? 'is-correct' : 'is-wrong'}`} ref={feedbackRef} tabIndex={-1} role="status">
          <p class="verdict">{answered.grade.correct ? tq('quiz.correct') : tq('quiz.wrong')}</p>
          <p>{tq('quiz.yourAnswer', { answer: responseText(q, answered.response, lang) })}</p>
          <p>
            <strong>{tq('quiz.answer', { answer: answerText(q, lang) })}</strong>
          </p>
          <ul class="explain-steps">
            {explainAnswer(engine, q, answered.grade, lang).map((s) => (
              <li>{s}</li>
            ))}
          </ul>
          <div class="quiz-actions">
            <button
              type="button"
              class="btn"
              onClick={() => {
                applyShowPlan(showPlan(q), commands);
                onShow3D();
              }}
            >
              {tq('quiz.show3d')}
            </button>
            <button type="button" class="btn btn-primary" onClick={next}>
              {idx + 1 < total ? tq('quiz.next') : tq('quiz.finish')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function questionText(q: Question, lang: 'zh' | 'en' | 'es'): string {
  switch (q.kind) {
    case 'segment':
      return tq.in(lang, 'quiz.q.segment', { lead: q.strip.lead, seg: tq.in(lang, `quiz.seg.${q.seg}`) });
    case 'leadGroup':
      return tq.in(lang, 'quiz.q.leadGroup', { wall: tq.in(lang, `quiz.wall.${q.wall}`) });
    case 'projection':
      return tq.in(lang, 'quiz.q.projection', {
        dirs: dirPhrase(lang, directionsOf(q.h)), ang: fmtDeg(frontalAngleDeg(q.h), lang),
        hang: fmtDeg(horizontalAngleDeg(q.h), lang), mag: fmtNum(mag(q.h), 2, lang), lead: q.lead,
      });
    case 'structure':
      return tq.in(lang, 'quiz.q.structure');
    case 'calipers':
      return tq.in(lang, 'quiz.q.calipers');
  }
}

function QuestionBody(p: {
  readonly q: Question;
  readonly engine: SimEngine;
  readonly draft: Draft;
  readonly set: (d: Partial<Draft>) => void;
  readonly locked: boolean;
}) {
  const { q, engine, draft, set, locked } = p;
  const lang = store.lang.value;
  switch (q.kind) {
    case 'segment':
      return (
        <>
          <QuizStrip
            engine={engine}
            spec={q.strip}
            onPick={locked ? undefined : (t) => set({ t })}
            cursors={draft.t !== undefined ? [draft.t] : []}
            answer={locked ? q.answer : null}
          />
          <p class="fine-print">
            {draft.t !== undefined ? tq('quiz.strip.click', { t: Math.round(draft.t - q.strip.zeroMs) }) : tq('quiz.strip.hint')}
          </p>
        </>
      );
    case 'leadGroup': {
      const toggle = (l: LeadName) => set({ leads: draft.leads.includes(l) ? draft.leads.filter((x) => x !== l) : [...draft.leads, l] });
      return (
        <div class="lead-choice">
          {[LIMB_LEADS, PRECORDIAL_LEADS].map((group, gi) => (
            <div class="seg" role="group" aria-label={tc(gi === 0 ? 'leadgroup.limb' : 'leadgroup.precordial')}>
              {group.map((l) => (
                <button
                  type="button"
                  class={`btn btn-sm lead-btn ${locked && q.answer.includes(l) ? 'is-answer' : ''}`}
                  aria-pressed={draft.leads.includes(l)}
                  disabled={locked}
                  onClick={() => toggle(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          ))}
        </div>
      );
    }
    case 'projection':
      return (
        <>
          <VectorPlanes h={q.h} lang={lang} />
          <QuizStrip engine={engine} spec={q.strip} />
          <Choices
            options={(['pos', 'neg', 'iso'] as const).map((o) => ({ value: o, label: tq(`quiz.opt.${o}`) }))}
            value={draft.choice}
            answer={locked ? q.answer : undefined}
            onChange={(v) => set({ choice: v })}
            locked={locked}
          />
        </>
      );
    case 'structure':
      return (
        <>
          <QuizStrip engine={engine} spec={q.strip} />
          <Choices
            options={q.options.map((o) => ({ value: o, label: tc(`struct.${o}`) }))}
            value={draft.choice}
            answer={locked ? q.answer : undefined}
            onChange={(v) => set({ choice: v })}
            locked={locked}
          />
        </>
      );
    case 'calipers':
      return <Calipers q={q} engine={engine} draft={draft} set={set} locked={locked} />;
  }
}

function Choices(p: {
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly value?: string;
  readonly answer?: string;
  readonly onChange: (v: string) => void;
  readonly locked: boolean;
}) {
  return (
    <div class="choices">
      {p.options.map((o) => (
        <button
          type="button"
          class={`btn choice ${p.answer === o.value ? 'is-answer' : ''}`}
          aria-pressed={p.value === o.value}
          disabled={p.locked}
          onClick={() => p.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Calipers(p: {
  readonly q: Extract<Question, { kind: 'calipers' }>;
  readonly engine: SimEngine;
  readonly draft: Draft;
  readonly set: (d: Partial<Draft>) => void;
  readonly locked: boolean;
}) {
  const { q, engine, draft, set, locked } = p;
  const s = q.strip;
  // alternate clicks: first places the start leg, second the end leg, then start again
  const pick = (t: number) => {
    if (draft.c0 === undefined || (draft.c0 !== undefined && draft.c1 !== undefined)) set({ c0: t, c1: undefined });
    else set({ c1: t });
  };
  const legs = [draft.c0, draft.c1].filter((x): x is number => x !== undefined);
  const rel = (t: number) => Math.round(t - s.zeroMs);
  const slider = (id: 'c0' | 'c1', label: string) => {
    const v = draft[id];
    return (
      <div class="range">
        <label for={`cal-${id}`}>{label}</label>
        <input
          id={`cal-${id}`}
          type="range"
          min={Math.round(s.t0 - s.zeroMs)}
          max={Math.round(s.t1 - s.zeroMs)}
          step={1}
          value={v === undefined ? Math.round(s.t0 - s.zeroMs) : rel(v)}
          disabled={locked}
          aria-valuetext={v === undefined ? '—' : `${rel(v)} ms`}
          onInput={(e) => {
            const t = s.zeroMs + Number(e.currentTarget.value);
            set(id === 'c0' ? { c0: t } : { c1: t });
          }}
        />
        <output for={`cal-${id}`}>{v === undefined ? '—' : `${rel(v)} ms`}</output>
      </div>
    );
  };
  return (
    <>
      <QuizStrip engine={engine} spec={s} onPick={locked ? undefined : pick} cursors={legs} answer={locked ? { t0: q.pOn, t1: q.qrsOn } : null} />
      {slider('c0', tq('quiz.cal.start'))}
      {slider('c1', tq('quiz.cal.end'))}
      <p class="cal-reading" aria-live="polite">
        {legs.length === 2 ? tq('quiz.cal.reading', { ms: Math.round(Math.abs(legs[1] - legs[0])) }) : tq('quiz.cal.none')}
        {!locked && legs.length > 0 && (
          <button type="button" class="btn btn-sm" onClick={() => set({ c0: undefined, c1: undefined })}>
            {tq('quiz.cal.reset')}
          </button>
        )}
      </p>
    </>
  );
}
