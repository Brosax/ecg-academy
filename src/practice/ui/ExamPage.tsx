/**
 * #/exam — a blueprinted mixed exam (every competency; occlusion and arrhythmia weighted double; synthetic + real),
 * optional timer, no feedback until the end; then the score by competency, a separate count of missed critical
 * findings, and a review of every mistake (the item replayed with the learner's answer, the feedback, the explanation
 * and the reveal marks).
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { tc } from '../../i18n/common';
import { lt } from '../../i18n/index';
import { tp } from '../../i18n/practice';
import { Button, Disclosure, Feedback, Icon, Segmented } from '../../ui/index';
import { COMPETENCIES, type Answer, type CompetencyId, type Grade, type Item } from '../api';
import { examBlueprint, examSummary, type PlanEntry } from '../core/adaptive';
import { getSpec } from '../core/families';
import { generateItem } from '../core/generate';
import { freshSeed } from './DrillRunner';
import { ItemPlayerCore } from './ItemPlayer';
import { compName, MasteryBar } from './PracticePage';
import { masteryFrom } from '../core/mastery';

interface Done {
  readonly entry: PlanEntry;
  readonly item: Item | null;
  readonly answer: Answer | null;
  readonly grade: Grade | null;
  /** the app could not generate this item: not scored */
  readonly failed?: boolean;
}

type Phase = { readonly name: 'setup' } | { readonly name: 'run'; readonly plan: readonly PlanEntry[]; readonly deadline: number | null } | { readonly name: 'results' };

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function ExamPage() {
  const [length, setLength] = useState<12 | 20 | 30>(20);
  const [minutes, setMinutes] = useState<0 | 15 | 30 | 45>(0);
  const [includeReal, setIncludeReal] = useState(true);
  const [seed, setSeed] = useState(() => freshSeed('exam'));
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });
  const [done, setDone] = useState<Done[]>([]);

  const start = () => {
    setDone([]);
    setPhase({ name: 'run', plan: examBlueprint({ length, includeReal, seed }), deadline: minutes ? Date.now() + minutes * 60_000 : null });
  };

  return (
    <div class="app-page pr-page">
      <header class="app-pagehead">
        <h1>{tc('navExam')}</h1>
        <p>{tp('examLead')}</p>
      </header>
      {phase.name === 'setup' && (
        <section class="pr-exam-setup">
          <div class="pr-field">
            <span>{tp('examLength')}</span>
            <Segmented<12 | 20 | 30> ariaLabel={tp('examLength')} value={length} options={[12, 20, 30].map((n) => ({ value: n as 12 | 20 | 30, label: String(n) }))} onChange={setLength} />
          </div>
          <div class="pr-field">
            <span>{tp('examTimer')}</span>
            <Segmented<0 | 15 | 30 | 45>
              ariaLabel={tp('examTimer')}
              value={minutes}
              options={[0, 15, 30, 45].map((n) => ({ value: n as 0 | 15 | 30 | 45, label: n ? tp('minutesN', { n }) : tp('timerOff') }))}
              onChange={setMinutes}
            />
          </div>
          <label class="pr-check">
            <input type="checkbox" checked={includeReal} onChange={(e) => setIncludeReal((e.currentTarget as HTMLInputElement).checked)} />
            <span>{tp('includeReal')}</span>
          </label>
          <p class="app-muted tabular">{tp('examSeed', { n: seed })}</p>
          <div class="pr-actions">
            <Button tone="primary" size="lg" icon="play" onClick={start}>
              {tp('startExam')}
            </Button>
          </div>
        </section>
      )}
      {phase.name === 'run' && (
        <ExamRun
          plan={phase.plan}
          deadline={phase.deadline}
          onFinish={(d) => {
            setDone(d);
            setPhase({ name: 'results' });
          }}
        />
      )}
      {phase.name === 'results' && (
        <ExamResults
          done={done}
          onNew={() => {
            setSeed(freshSeed('exam'));
            setPhase({ name: 'setup' });
          }}
        />
      )}
    </div>
  );
}

function ExamRun(props: { readonly plan: readonly PlanEntry[]; readonly deadline: number | null; readonly onFinish: (d: Done[]) => void }) {
  const [i, setI] = useState(0);
  const [item, setItem] = useState<Item | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const done = useRef<Done[]>([]);
  const cache = useRef(new Map<number, Promise<Item>>());
  const finished = useRef(false);

  const get = (k: number) => {
    const e = props.plan[k];
    if (!e) return null;
    let p = cache.current.get(k);
    if (!p) {
      p = generateItem(e.family, e.seed, e.difficulty);
      p.catch(() => undefined);
      cache.current.set(k, p);
    }
    return p;
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    // unanswered entries count as 0 (except those the app could not generate)
    const answered = new Set(done.current.map((d) => d.entry));
    const rest = props.plan.filter((e) => !answered.has(e)).map((entry): Done => ({ entry, item: null, answer: null, grade: null }));
    props.onFinish([...done.current, ...rest]);
  };

  useEffect(() => {
    if (i >= props.plan.length) {
      finish();
      return;
    }
    let alive = true;
    setItem(null);
    setFailed(false);
    get(i)?.then(
      (it) => {
        if (!alive) return;
        setItem(it);
        get(i + 1);
      },
      () => {
        if (!alive) return;
        done.current.push({ entry: props.plan[i], item: null, answer: null, grade: null, failed: true });
        setFailed(true);
        setI((x) => x + 1);
      },
    );
    return () => {
      alive = false;
    };
  }, [i]);

  useEffect(() => {
    if (props.deadline === null) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (props.deadline !== null && n >= props.deadline) finish();
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const n = props.plan.length;
  return (
    <section class="pr-exam">
      <div class="pr-exam__bar">
        <span class="tabular">{tp('itemOf', { i: Math.min(i + 1, n), n })}</span>
        {props.deadline !== null && (
          <span class="pr-exam__clock tabular" role="timer" aria-label={tp('timeLeft')}>
            <Icon name="clock" size={16} /> {fmtClock(props.deadline - now)}
          </span>
        )}
        <Button size="sm" tone="ghost" onClick={finish}>
          {tp('finishExam')}
        </Button>
      </div>
      {item ? (
        <ItemPlayerCore
          key={`${i}:${item.id}`}
          item={item}
          mode="exam"
          collectConfidence
          counter={tp('itemOf', { i: i + 1, n })}
          onGraded={(grade, answer) => done.current.push({ entry: props.plan[i], item, answer, grade })}
          onNext={() => setI((x) => x + 1)}
        />
      ) : (
        <div class="pr-ecg-ph" role="status">
          <span class="pr-ecg-ph__msg">{failed ? tp('genFailed') : tp('preparing')}</span>
        </div>
      )}
    </section>
  );
}

function competencyOf(d: Done): CompetencyId {
  return d.item?.competency ?? getSpec(d.entry.family)?.competency ?? 'C11';
}

function ExamResults(props: { readonly done: readonly Done[]; readonly onNew: () => void }) {
  const scored = props.done.filter((d) => !d.failed);
  const results = scored.map((d) => ({ competency: competencyOf(d), score: d.grade?.score ?? 0, missedCritical: !!d.grade?.missedCritical }));
  const s = useMemo(() => examSummary(results), [props.done]);
  const mistakes = scored.filter((d) => !d.grade || d.grade.verdict !== 'correct');
  return (
    <section class="pr-results">
      <h2 class="pr-h2">{tp('examResults')}</h2>
      <div class="pr-results__top">
        <p class="pr-results__score tabular">
          {tp('yourScore')}: <strong>{Math.round(s.total * 100)} %</strong>
        </p>
        <Feedback tone={s.missedCritical ? 'err' : 'ok'} title={tp('criticalMissedTitle')}>
          {s.missedCritical ? tp('criticalMissed', { n: s.missedCritical }) : tp('criticalMissedNone')}
        </Feedback>
      </div>
      <h3>{tp('byCompetencyTitle')}</h3>
      <table class="pr-table">
        <tbody>
          {COMPETENCIES.filter((c) => s.byCompetency[c]).map((c) => {
            const e = s.byCompetency[c];
            if (!e) return null;
            return (
              <tr key={c}>
                <th scope="row">
                  <span class="pr-stage-badge">{c}</span> {compName(c)}
                </th>
                <td>
                  <MasteryBar m={{ ...masteryFrom([]), accuracy: e.score, attempts: e.n }} label={compName(c)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3>{tp('reviewMistakes')}</h3>
      {mistakes.length === 0 ? (
        <p>{tp('noMistakes')}</p>
      ) : (
        <div class="pr-mistakes">
          {mistakes.map((d, k) => {
            const fam = getSpec(d.entry.family);
            return (
              <Disclosure
                key={k}
                summary={
                  <span class="pr-mistake__sum">
                    <span class="pr-stage-badge">{competencyOf(d)}</span> {fam ? lt(fam.title) : d.entry.family} ·{' '}
                    <span class="tabular">{d.grade ? `${Math.round(d.grade.score * 100)} %` : tp('unanswered')}</span>
                    {d.grade?.missedCritical && <Icon name="flag" size={14} label={tp('missedCritical')} />}
                  </span>
                }
              >
                {d.item && d.grade ? <ItemPlayerCore item={d.item} mode="review" record={false} reviewed={{ answer: d.answer, grade: d.grade }} /> : <p class="app-muted">{tp('unanswered')}</p>}
              </Disclosure>
            );
          })}
        </div>
      )}
      <div class="pr-actions">
        <Button tone="primary" icon="refresh" onClick={props.onNew}>
          {tp('newExam')}
        </Button>
      </div>
    </section>
  );
}
