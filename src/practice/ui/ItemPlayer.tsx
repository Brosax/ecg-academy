/**
 * ItemPlayer — one practice item: the ECG first (the protagonist), the prompt, the answer panel for the item's kind,
 * optional confidence and hint, then the grade with feedback on THIS answer, the explanation and the reveal marks on
 * the tracing. The learner always commits before anything is revealed.
 *
 * Modes (internal): 'practice' (default), 'exam' (no feedback; advances after submitting), 'review' (locked replay of
 * an exam answer with its grade).
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { FINDINGS, type FindingId } from '../../core/findings';
import type { Lead } from '../../core/leads';
import type { CaliperMeasure, EcgPin, PickEvent } from '../../ecg/index';
import { tc } from '../../i18n/common';
import { lt } from '../../i18n/index';
import { tp } from '../../i18n/practice';
import { Badge, Button, Feedback, Icon, Segmented } from '../../ui/index';
import type { Answer, Grade, Item, ItemPlayerProps } from '../api';
import { decoysOf, viewOf } from '../core/extras';
import { getFamily } from '../core/families';
import { callName, finalizeGrade, gradeItem, pickHits, rateTolerance } from '../core/grade';
import { numericOptions } from '../core/numchoice';
import { labLinkOf } from '../core/links';
import { recordAttempt } from '../core/progress';
import { fname } from '../core/text';
import { AXIS_CATEGORIES, axisCategory } from '../core/truth';
import { ItemEcg } from './ItemEcg';
import { ReportForm } from './ReportForm';

type Call = 'occlusion' | 'indeterminate' | 'not-occlusion';
type Pick = { readonly lead: Lead; readonly tMs: number };

interface Draft {
  readonly text: string;
  readonly choice: string | null;
  readonly multi: readonly string[];
  readonly picks: readonly Pick[];
  readonly call: Call | null;
  readonly territory: string | null;
  readonly mimic: FindingId | null;
}

const EMPTY: Draft = { text: '', choice: null, multi: [], picks: [], call: null, territory: null, mimic: null };

const parseNum = (s: string): number | null => {
  const t = s.replace(',', '.').replace('−', '-').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** The Answer a draft amounts to, or null while incomplete. */
export function toAnswer(item: Item, d: Draft): Answer | null {
  switch (item.kind) {
    case 'rate':
    case 'measure':
    case 'qtc': {
      const v = parseNum(d.text);
      return v === null ? null : { kind: 'number', value: v };
    }
    case 'axis': {
      if (item.key.mode === 'quadrant') return d.choice ? { kind: 'choice', id: d.choice } : null;
      const v = parseNum(d.text);
      return v === null ? null : { kind: 'number', value: v };
    }
    case 'choice':
    case 'compare':
      return d.choice ? { kind: 'choice', id: d.choice } : null;
    case 'findings':
      return { kind: 'multi', ids: d.multi };
    case 'locate':
      return d.picks.length ? { kind: 'picks', picks: d.picks } : null;
    case 'occlusion':
      if (!d.call) return null;
      return { kind: 'occlusion', call: d.call, ...(d.territory ? { territory: d.territory } : {}), ...(d.mimic ? { mimic: d.mimic } : {}) };
    case 'report':
      return null;
  }
}

function fromAnswer(a: Answer | undefined): Draft {
  if (!a) return EMPTY;
  switch (a.kind) {
    case 'number':
      return { ...EMPTY, text: String(Math.round(a.value * 10) / 10) };
    case 'choice':
      return { ...EMPTY, choice: a.id };
    case 'multi':
      return { ...EMPTY, multi: a.ids };
    case 'picks':
      return { ...EMPTY, picks: a.picks };
    case 'occlusion':
      return { ...EMPTY, call: a.call, territory: a.territory ?? null, mimic: a.mimic ?? null };
    case 'report':
      return EMPTY;
  }
}

const UNIT: Readonly<Record<'rate' | 'measure' | 'qtc' | 'axis', () => string>> = {
  rate: () => tp('unitBpm'),
  measure: () => tp('unitMs'),
  qtc: () => tp('unitMs'),
  axis: () => tp('unitDeg'),
};

const DIFF_KEY = { classic: 'dClassic', subtle: 'dSubtle', noisy: 'dNoisy', borderline: 'dBorderline' } as const;

export interface ItemPlayerCoreProps extends ItemPlayerProps {
  readonly mode?: 'practice' | 'exam' | 'review';
  /** review mode: the stored answer and grade */
  readonly reviewed?: { readonly answer: Answer | null; readonly grade: Grade };
  /** "Item 3 of 10" */
  readonly counter?: string;
}

let seq = 0;

export function ItemPlayerCore(props: ItemPlayerCoreProps) {
  const item = props.item;
  const mode = props.mode ?? 'practice';
  const [uid] = useState(() => `pr-item-${++seq}`);
  const [draft, setDraft] = useState<Draft>(() => (props.reviewed ? fromAnswer(props.reviewed.answer ?? undefined) : EMPTY));
  const [grade, setGrade] = useState<Grade | null>(props.reviewed?.grade ?? null);
  const [usedHint, setUsedHint] = useState(false);
  const [confidence, setConfidence] = useState<1 | 2 | 3 | null>(null);
  const [cal, setCal] = useState<CaliperMeasure | null>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const locked = grade !== null;
  const view = viewOf(item);
  const answer = toAnswer(item, draft);
  const needConf = !!props.collectConfidence && mode !== 'review';
  const ready = !!answer && (!needConf || confidence !== null);
  const fam = getFamily(item.family);
  const lab = useMemo(() => labLinkOf(item.findings), [item]);

  useEffect(() => {
    if (locked && mode === 'practice') nextRef.current?.querySelector('button')?.focus();
  }, [locked]);

  const commit = (a: Answer, raw: Grade) => {
    const g = finalizeGrade(raw, { usedHint, ...(confidence ? { confidence } : {}) });
    if (props.record !== false) {
      recordAttempt({
        itemId: item.id,
        family: item.family,
        competency: item.competency,
        findings: item.findings,
        score: g.score,
        at: Date.now(),
        ...(g.confidence ? { confidence: g.confidence } : {}),
        ...(g.missedCritical ? { missedCritical: true } : {}),
      });
    }
    setGrade(g);
    props.onGraded?.(g, a);
    if (mode === 'exam') props.onNext?.();
  };

  const check = () => {
    if (locked || !answer || !ready) return;
    commit(answer, gradeItem(item, answer));
  };

  // one-pick items (single choice, left/right, axis quadrant) are graded the moment an option is chosen by pointer or
  // digit key, outside the exam; arrow keys only move the selection (Enter checks), so browsing never commits
  const instant = mode === 'practice' && !needConf;
  const committed = useRef(false);
  const pickNow = (id: string) => {
    if (locked || committed.current) return;
    const d = numericChoices(item).length ? { ...draft, text: id } : { ...draft, choice: id };
    setDraft(d);
    const a = instant ? toAnswer(item, d) : null;
    if (!a) return;
    committed.current = true;
    commit(a, gradeItem(item, a));
  };

  const set = (patch: Partial<Draft>) => !locked && setDraft((d) => ({ ...d, ...patch }));

  // digits 1–9 pick an option (choice, quadrant, compare); Enter checks / goes on
  const onKey = (e: KeyboardEvent) => {
    const tgt = e.target as HTMLElement;
    if (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT') return;
    if (!locked && /^[1-9]$/.test(e.key)) {
      const opts = optionIds(item);
      const id = opts[Number(e.key) - 1];
      if (id) {
        pickNow(id);
        e.preventDefault();
      }
    }
  };

  const onPick = (p: PickEvent) => {
    if (locked || item.kind !== 'locate') return;
    const pick = { lead: p.lead, tMs: Math.round(p.tMs) };
    setDraft((d) => ({ ...d, picks: item.key.need === 'one' ? [pick] : [...d.picks, pick].slice(-(item.key.targets.length + 3)) }));
  };

  const pins: EcgPin[] = useMemo(() => {
    if (item.kind !== 'locate') return [];
    return draft.picks.map((p) => ({
      lead: p.lead,
      tMs: p.tMs,
      tone: !locked ? 'answer' : item.key.targets.some((t) => pickHits(t, p)) ? 'correct' : 'wrong',
    }));
  }, [draft.picks, locked, item]);

  const marks = locked ? (item.reveal ?? []) : [];
  const ecgCommon = {
    view,
    marks,
    compact: props.compact,
    onCaliper: setCal,
  };

  const tone = grade ? (grade.verdict === 'correct' ? 'ok' : grade.verdict === 'partial' ? 'partial' : 'err') : 'info';
  const title = grade ? (grade.verdict === 'correct' ? tc('correct') : grade.verdict === 'partial' ? tc('partiallyCorrect') : tc('incorrect')) : '';

  return (
    <article class={`pr-item ${props.compact ? 'pr-item--compact' : ''}`} aria-labelledby={`${uid}-prompt`} onKeyDown={onKey}>
      <header class="pr-item__head">
        {props.counter && <span class="pr-item__counter tabular">{props.counter}</span>}
        {mode !== 'exam' && fam && <span class="pr-item__fam">{lt(fam.title)}</span>}
        {mode !== 'exam' && <Badge>{tp(DIFF_KEY[item.difficulty])}</Badge>}
      </header>
      <p id={`${uid}-prompt`} class="pr-item__prompt">
        {lt(item.prompt)}
      </p>

      {item.kind === 'compare' ? (
        <div class="pr-pair">
          {(['left', 'right'] as const).map((side) => (
            <figure class={`pr-pair__ecg ${locked && item.key.correct === side ? 'is-answer' : ''}`} key={side}>
              <figcaption>{side === 'left' ? tp('leftEcg') : tp('rightEcg')}</figcaption>
              <ItemEcg source={side === 'left' ? item.ecg : item.ecg2} {...ecgCommon} compact ariaLabel={side === 'left' ? tp('ecgAriaLeft') : tp('ecgAriaRight')} />
            </figure>
          ))}
        </div>
      ) : (
        <ItemEcg source={item.ecg} {...ecgCommon} pins={pins} onPick={item.kind === 'locate' && !locked ? onPick : undefined} />
      )}

      <div class="pr-item__body">
        {item.kind === 'report' ? (
          <div class="pr-answer">
            <ReportForm
              ecg={null}
              reference={item.key}
              revealed={mode === 'review'}
              answer={mode === 'review' && props.reviewed?.answer?.kind === 'report' ? props.reviewed.answer.report : undefined}
              hideFeedback
              onSubmit={(g, a) => !locked && commit({ kind: 'report', report: a }, g)}
            />
          </div>
        ) : (
          <form
            class="pr-answer"
            aria-label={tp('yourAnswer')}
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
          >
            <AnswerPanel item={item} draft={draft} set={set} pick={pickNow} locked={locked} uid={uid} caliper={cal} truthShown={locked && mode !== 'exam'} />
            {needConf && !locked && (
              <div class="pr-conf">
                <span id={`${uid}-conf`}>{tp('confidence')}</span>
                <Segmented<1 | 2 | 3>
                  ariaLabel={tp('confidence')}
                  size="sm"
                  value={confidence ?? (0 as 1)}
                  options={[
                    { value: 1, label: tp('conf1') },
                    { value: 2, label: tp('conf2') },
                    { value: 3, label: tp('conf3') },
                  ]}
                  onChange={(v) => setConfidence(v)}
                />
              </div>
            )}
            {!locked && !(instant && optionIds(item).length > 0 && !draft.choice && !draft.text) && (
              <div class="pr-actions">
                <Button type="submit" tone="primary" icon="check" disabled={!ready}>
                  {mode === 'exam' ? tp('submitAnswer') : tc('check')}
                </Button>
                {mode === 'practice' && item.hint && !usedHint && (
                  <Button tone="ghost" size="sm" icon="info" onClick={() => setUsedHint(true)}>
                    {tp('showHint')}
                  </Button>
                )}
              </div>
            )}
            {usedHint && item.hint && (
              <p class="pr-hint" role="note">
                <Icon name="info" size={16} /> {lt(item.hint)} <span class="app-muted">({tp('hintUsed')})</span>
              </p>
            )}
          </form>
        )}

        {mode !== 'exam' && (
          <div class="pr-item__fb" aria-live="polite">
            {grade ? (
              <>
                <Feedback tone={tone} title={`${title} · ${tp('scorePct', { n: Math.round(grade.score * 100) })}`}>
                  {lt(grade.feedback)}
                  {grade.missedCritical && (
                    <p class="pr-critical">
                      <Icon name="flag" size={16} /> {tp('missedCritical')}
                    </p>
                  )}
                </Feedback>
                <section class="pr-expl">
                  <h3>{tc('explanation')}</h3>
                  <p>{lt(item.explanation)}</p>
                  {lab && (
                    <p class="pr-expl__lab">
                      <a href={lab.href}>
                        <Icon name="heart" size={16} /> {tp('seeInLab', { f: lt(fname(lab.finding)) })}
                      </a>
                    </p>
                  )}
                </section>
                {props.onNext && mode === 'practice' && (
                  <div class="pr-actions" ref={nextRef}>
                    <Button tone="primary" icon="next" onClick={props.onNext}>
                      {tc('next')}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p class="pr-item__wait app-muted">{tp('answerFirst')}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function optionIds(item: Item): string[] {
  if (item.kind === 'choice') return item.key.options.map((o) => o.id);
  if (item.kind === 'compare') return ['left', 'right'];
  if (item.kind === 'axis' && item.key.mode === 'quadrant') return [...AXIS_CATEGORIES];
  return numericChoices(item).map(String);
}

/** Lowest value worth offering as a distractor (shorter would be implausible on any tracing). */
const MEASURE_MIN = { p: 40, pr: 80, qrs: 60, qt: 200, rr: 250, pp: 250 } as const;

/** Numeric items are answered by picking one of four values (no typing); [] for other kinds. */
function numericChoices(item: Item): number[] {
  const seed = item.id;
  switch (item.kind) {
    case 'rate':
      return numericOptions({ truth: item.key.truthBpm, tol: rateTolerance(item.key.truthBpm, item.key.tolerancePct, item.key.minTolBpm), unit: 1, min: 20, seed });
    case 'measure':
      return numericOptions({ truth: item.key.truthMs, tol: item.key.toleranceMs, unit: 10, min: MEASURE_MIN[item.key.what], decoys: decoysOf(item).map((d) => d.ms), seed });
    case 'qtc':
      return numericOptions({ truth: item.key.truthMs, tol: item.key.toleranceMs, unit: 10, min: 300, seed });
    case 'axis':
      return item.key.mode === 'degrees' ? numericOptions({ truth: item.key.truthDeg, tol: item.key.fullDeg, unit: 5, angle: true, seed }) : [];
    default:
      return [];
  }
}

// ── answer panels ───────────────────────────────────────────────────────────────────────────────────────────────
interface PanelProps {
  readonly item: Item;
  readonly draft: Draft;
  readonly set: (p: Partial<Draft>) => void;
  /** a one-pick answer chosen by pointer (may grade at once) */
  readonly pick: (id: string) => void;
  readonly locked: boolean;
  readonly uid: string;
  readonly caliper: CaliperMeasure | null;
  readonly truthShown: boolean;
}

function Radio(props: { readonly name: string; readonly options: readonly { readonly id: string; readonly label: string }[]; readonly value: string | null; readonly onChange: (id: string) => void; readonly locked: boolean; readonly correct?: string | null; readonly label: string; readonly numbered?: boolean; readonly onPick?: (id: string) => void }) {
  return (
    <div class="pr-opts" role="radiogroup" aria-label={props.label}>
      {props.options.map((o, i) => {
        const on = props.value === o.id;
        const state = props.correct == null ? '' : o.id === props.correct ? 'is-right' : on ? 'is-wrong' : '';
        return (
          <label class={`pr-opt ${on ? 'is-on' : ''} ${state}`} key={o.id} onPointerUp={props.onPick && !props.locked ? () => props.onPick?.(o.id) : undefined}>
            <input type="radio" name={props.name} value={o.id} checked={on} disabled={props.locked} onChange={() => props.onChange(o.id)} />
            {props.numbered !== false && <span class="pr-opt__n tabular" aria-hidden="true">{i + 1}</span>}
            <span class="pr-opt__label">{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function NumberChoice(props: PanelProps & { readonly unit: string }) {
  const values = numericChoices(props.item);
  const sel = parseNum(props.draft.text);
  // after grading, mark the option nearest the reference as the right one
  const truth = props.truthShown ? values.reduce((b, v) => (Math.abs(v - truthOf(props.item)) < Math.abs(b - truthOf(props.item)) ? v : b), values[0]) : null;
  const label = (v: number) => `${props.item.kind === 'axis' && v > 0 ? '+' : ''}${v}${props.item.kind === 'axis' ? '' : ' '}${props.unit}`;
  return (
    <Radio
      name={`${props.uid}-n`}
      label={tp('yourAnswer')}
      options={values.map((v) => ({ id: String(v), label: label(v) }))}
      value={sel === null ? null : String(sel)}
      onChange={(id) => props.set({ text: id })}
      onPick={props.pick}
      locked={props.locked}
      correct={truth === null ? null : String(truth)}
    />
  );
}

function truthOf(item: Item): number {
  switch (item.kind) {
    case 'rate':
      return item.key.truthBpm;
    case 'measure':
    case 'qtc':
      return item.key.truthMs;
    case 'axis':
      return item.key.truthDeg;
    default:
      return 0;
  }
}

function AnswerPanel(props: PanelProps) {
  const { item, draft, set, locked } = props;
  switch (item.kind) {
    case 'rate':
      return <NumberChoice {...props} unit={UNIT.rate()} />;
    case 'measure':
      return <NumberChoice {...props} unit={UNIT.measure()} />;
    case 'qtc':
      return <NumberChoice {...props} unit={UNIT.qtc()} />;
    case 'axis': {
      if (item.key.mode === 'quadrant') {
        return (
          <Radio
            name={`${props.uid}-q`}
            label={tp('quadrant')}
            options={AXIS_CATEGORIES.map((c) => ({ id: c, label: lt(FINDINGS[c].name) }))}
            value={draft.choice}
            onChange={(id) => set({ choice: id })}
            onPick={props.pick}
            locked={locked}
            correct={props.truthShown ? axisCategory(item.key.truthDeg) : null}
          />
        );
      }
      return <NumberChoice {...props} unit={UNIT.axis()} />;
    }
    case 'choice':
      return (
        <Radio
          name={`${props.uid}-c`}
          label={tp('yourAnswer')}
          options={item.key.options.map((o) => ({ id: o.id, label: lt(o.label) }))}
          value={draft.choice}
          onChange={(id) => set({ choice: id })}
            onPick={props.pick}
          locked={locked}
          correct={props.truthShown ? item.key.correct : null}
        />
      );
    case 'compare':
      return (
        <Radio
          name={`${props.uid}-lr`}
          label={tp('chooseSide')}
          options={[
            { id: 'left', label: tp('leftEcg') },
            { id: 'right', label: tp('rightEcg') },
          ]}
          value={draft.choice}
          onChange={(id) => set({ choice: id })}
            onPick={props.pick}
          locked={locked}
          correct={props.truthShown ? item.key.correct : null}
        />
      );
    case 'findings':
      return (
        <fieldset class="pr-multi">
          <legend>{tp('selectAll')}</legend>
          {item.key.options.map((f) => {
            const on = draft.multi.includes(f);
            const state = !props.truthShown ? '' : item.key.correct.includes(f) ? (on ? 'is-right' : 'is-missed') : on ? 'is-wrong' : '';
            return (
              <label class={`pr-opt ${on ? 'is-on' : ''} ${state}`} key={f}>
                <input type="checkbox" checked={on} disabled={locked} onChange={() => set({ multi: on ? draft.multi.filter((x) => x !== f) : [...draft.multi, f] })} />
                <span class="pr-opt__label">{lt(fname(f))}</span>
              </label>
            );
          })}
        </fieldset>
      );
    case 'locate':
      return (
        <div class="pr-locate">
          <p class="app-muted">{tp('pickHint')}</p>
          <p class="pr-locate__picked tabular" aria-live="polite">
            {draft.picks.length ? draft.picks.map((p) => tp('picked', { lead: p.lead, t: p.tMs })).join(' · ') : tp('noPick')}
          </p>
          {!locked && draft.picks.length > 0 && (
            <Button size="sm" tone="ghost" icon="close" onClick={() => set({ picks: [] })}>
              {tp('clearPick')}
            </Button>
          )}
        </div>
      );
    case 'occlusion': {
      const k = item.key;
      return (
        <div class="pr-occ">
          <Radio
            name={`${props.uid}-call`}
            label={tp('callTitle')}
            options={(['occlusion', 'indeterminate', 'not-occlusion'] as const).map((c) => ({ id: c, label: c === 'occlusion' ? tp('callOcclusion') : c === 'indeterminate' ? tp('callIndeterminate') : tp('callNot') }))}
            value={draft.call}
            onChange={(id) => set({ call: id as Call, territory: null, mimic: null })}
            locked={locked}
            correct={props.truthShown ? k.call : null}
          />
          {draft.call === 'occlusion' && k.territoryOptions && (
            <fieldset class="pr-sub">
              <legend>{tp('territory')}</legend>
              <Radio
                name={`${props.uid}-terr`}
                label={tp('territory')}
                numbered={false}
                options={k.territoryOptions.map((o) => ({ id: o.id, label: lt(o.label) }))}
                value={draft.territory}
                onChange={(id) => set({ territory: id })}
                locked={locked}
                correct={props.truthShown ? (k.territory ?? null) : null}
              />
            </fieldset>
          )}
          {draft.call === 'not-occlusion' && k.mimicOptions && (
            <fieldset class="pr-sub">
              <legend>{tp('mimic')}</legend>
              <Radio
                name={`${props.uid}-mimic`}
                label={tp('mimic')}
                numbered={false}
                options={k.mimicOptions.map((m) => ({ id: m, label: lt(fname(m)) }))}
                value={draft.mimic}
                onChange={(id) => set({ mimic: id as FindingId })}
                locked={locked}
                correct={props.truthShown ? (k.mimic ?? null) : null}
              />
            </fieldset>
          )}
          {props.truthShown && <p class="app-muted">{lt(callName(k.call))}</p>}
        </div>
      );
    }
    case 'report':
      return null;
  }
}

/** Public ItemPlayer (practice mode). */
export function ItemPlayer(props: ItemPlayerProps) {
  return <ItemPlayerCore key={props.item.id} {...props} />;
}
