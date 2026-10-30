/**
 * The structured report (C11): rate · rhythm · regularity · PR · QRS · QTc · axis · findings · notes, in the fixed
 * reading order the curriculum teaches. Graded per field against a ReportKey (synthetic truth or a real case's 12SL
 * measurements and labels); after submission the form locks and shows the field-by-field comparison.
 * Also the real-case page's reading slot (CaseReportPanel): the learner commits a report before the labels appear.
 */
import type { ReadonlySignal } from '@preact/signals';
import { useMemo, useState } from 'preact/hooks';
import { store } from '../../app/store';
import { FINDING_LIST, FINDINGS, isFindingId, type FindingId } from '../../core/findings';
import { tc } from '../../i18n/common';
import { lt } from '../../i18n/index';
import { tp } from '../../i18n/practice';
import type { CaliperMeasure } from '../../ecg/index';
import type { CaseReadingSlotProps } from '../../real/index';
import { Badge, Button, Feedback, Icon, Segmented } from '../../ui/index';
import type { Grade, ReportAnswer, ReportFormProps, ReportKey } from '../api';
import { gradeReport, reportFields, type ReportField } from '../core/grade';
import { reportKeyFromCase } from '../core/gen/report';
import { ports } from '../core/ports';
import { recordAttempt } from '../core/progress';
import { L } from '../core/text';
import { modelReport } from '../core/gen/report';

export const EMPTY_REPORT: ReportAnswer = { rateBpm: null, rhythm: null, regular: null, prMs: null, qrsMs: null, qtcMs: null, axisDeg: null, findings: [] };

const RHYTHMS = FINDING_LIST.filter((f) => f.cat === 'rhythm');
const PICKABLE = FINDING_LIST.filter((f) => f.cat !== 'rhythm');

const toNum = (s: string): number | null => {
  const t = s.replace(',', '.').replace('−', '-').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const FIELD_LABEL: Readonly<Record<ReportField, () => string>> = {
  rate: () => tp('fRate'),
  rhythm: () => tp('fRhythm'),
  regular: () => tp('fRegular'),
  pr: () => tp('fPr'),
  qrs: () => tp('fQrs'),
  qtc: () => tp('fQtc'),
  axis: () => tp('fAxis'),
  findings: () => tp('fFindings'),
};

function NumField(props: { readonly id: string; readonly label: string; readonly unit: string; readonly value: number | null; readonly onChange: (v: number | null) => void; readonly disabled?: boolean; readonly caliper?: number | null }) {
  const [text, setText] = useState(props.value === null ? '' : String(props.value));
  return (
    <div class="pr-rf__num">
      <label for={props.id}>{props.label}</label>
      <span class="pr-num">
        <input
          id={props.id}
          type="text"
          inputMode="decimal"
          class="pr-num__input tabular"
          value={text}
          disabled={props.disabled}
          onInput={(e) => {
            const s = (e.currentTarget as HTMLInputElement).value;
            setText(s);
            props.onChange(toNum(s));
          }}
        />
        <span class="pr-num__unit">{props.unit}</span>
      </span>
      {props.caliper != null && !props.disabled && (
        <button
          type="button"
          class="pr-linkbtn"
          onClick={() => {
            const v = Math.round(props.caliper as number);
            setText(String(v));
            props.onChange(v);
          }}
        >
          <Icon name="calipers" size={14} />
          {tp('useCaliper', { v: Math.round(props.caliper) })}
        </button>
      )}
    </div>
  );
}

/** Searchable multi-select of findings (chips for the selection, a filtered checkbox list). */
export function FindingPicker(props: { readonly value: readonly FindingId[]; readonly onChange: (v: FindingId[]) => void; readonly disabled?: boolean; readonly idPrefix: string }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = useMemo(
    () => (query ? PICKABLE.filter((f) => lt(f.name).toLowerCase().includes(query) || f.id.includes(query) || f.name.en.toLowerCase().includes(query)) : PICKABLE),
    [query, store.lang.value],
  );
  const toggle = (id: FindingId) => props.onChange(props.value.includes(id) ? props.value.filter((x) => x !== id) : [...props.value, id]);
  return (
    <div class="pr-fp">
      <div class="pr-fp__chips" aria-live="polite">
        {props.value.map((id) => (
          <span class="pr-chip" key={id}>
            {lt(FINDINGS[id].name)}
            {!props.disabled && (
              <button type="button" class="pr-chip__x" aria-label={`${tc('close')} ${lt(FINDINGS[id].name)}`} onClick={() => toggle(id)}>
                <Icon name="close" size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {!props.disabled && (
        <>
          <input
            type="search"
            class="pr-fp__search"
            placeholder={tp('searchFindings')}
            aria-label={tp('searchFindings')}
            value={q}
            onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)}
          />
          <ul class="pr-fp__list" role="group" aria-label={tp('fFindings')}>
            {list.length === 0 && <li class="app-muted">{tp('noMatch')}</li>}
            {list.map((f) => (
              <li key={f.id}>
                <label class="pr-check">
                  <input type="checkbox" checked={props.value.includes(f.id)} onChange={() => toggle(f.id)} />
                  <span>{lt(f.name)}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function shown(field: ReportField, s: string): string {
  if (s === '—') return s;
  if (field === 'rhythm') return isFindingId(s) ? lt(FINDINGS[s].name) : s;
  if (field === 'findings')
    return s
      .split(', ')
      .map((x) => (isFindingId(x) ? lt(FINDINGS[x].name) : x))
      .join(' · ');
  if (field === 'regular') return s === 'true' ? tp('yes') : s === 'false' ? tp('no') : s;
  return s;
}

export function ReportComparison(props: { readonly reference: ReportKey; readonly answer: ReportAnswer }) {
  const rows = reportFields(props.reference, props.answer);
  return (
    <table class="pr-cmp">
      <thead>
        <tr>
          <th scope="col">{tp('field')}</th>
          <th scope="col">{tp('yours')}</th>
          <th scope="col">{tp('expected')}</th>
          <th scope="col">
            <span class="app-sr">{tp('ok')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.field} class={r.ok ? 'is-ok' : r.credit > 0 ? 'is-part' : 'is-err'}>
            <th scope="row">{FIELD_LABEL[r.field]()}</th>
            <td class="tabular">{shown(r.field, r.given)}</td>
            <td class="tabular">{shown(r.field, r.expected)}</td>
            <td>
              <Icon name={r.ok ? 'check' : r.credit > 0 ? 'half' : 'close'} label={r.ok ? tc('correct') : r.credit > 0 ? tc('partiallyCorrect') : tc('incorrect')} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface ReportFormInternalProps extends ReportFormProps {
  readonly caliper?: ReadonlySignal<CaliperMeasure | null>;
  readonly answer?: ReportAnswer;
  readonly idPrefix?: string;
  readonly hideFeedback?: boolean;
}

let formSeq = 0;

export function ReportForm(props: ReportFormInternalProps) {
  const [prefix] = useState(() => props.idPrefix ?? `pr-rf-${++formSeq}`);
  const [a, setA] = useState<ReportAnswer>(props.answer ?? EMPTY_REPORT);
  const [submitted, setSubmitted] = useState<{ grade: Grade; answer: ReportAnswer } | null>(null);
  const locked = !!submitted || !!props.revealed;
  const set = <K extends keyof ReportAnswer>(k: K, v: ReportAnswer[K]) => setA((x) => ({ ...x, [k]: v }));
  const cal = props.caliper?.value ?? null;
  const calMs = cal ? Math.abs(cal.dtMs) : null;
  const submit = () => {
    const grade: Grade = props.reference
      ? gradeReport(props.reference, a)
      : { score: 0, verdict: 'partial', feedback: L('自我评估。', 'Self-assessment.', 'Autoevaluación.') };
    setSubmitted({ grade, answer: a });
    props.onSubmit?.(grade, a);
  };
  const grade = submitted?.grade ?? null;
  return (
    <form
      class="pr-rf"
      aria-label={tp('reportTitle')}
      onSubmit={(e) => {
        e.preventDefault();
        if (!locked) submit();
      }}
    >
      <div class="pr-rf__grid">
        <NumField id={`${prefix}-rate`} label={tp('fRate')} unit={tp('unitBpm')} value={a.rateBpm} onChange={(v) => set('rateBpm', v)} disabled={locked} caliper={calMs ? 60000 / calMs : null} />
        <div class="pr-rf__num">
          <label for={`${prefix}-rhythm`}>{tp('fRhythm')}</label>
          <select id={`${prefix}-rhythm`} class="pr-select" disabled={locked} value={a.rhythm ?? ''} onChange={(e) => set('rhythm', ((e.currentTarget as HTMLSelectElement).value || null) as FindingId | null)}>
            <option value="">{tp('choose')}</option>
            {RHYTHMS.map((f) => (
              <option key={f.id} value={f.id}>
                {lt(f.name)}
              </option>
            ))}
          </select>
        </div>
        <div class="pr-rf__num">
          <span id={`${prefix}-reg`}>{tp('fRegular')}</span>
          <Segmented<'yes' | 'no' | 'unsure'>
            ariaLabel={tp('fRegular')}
            size="sm"
            value={a.regular === null ? 'unsure' : a.regular ? 'yes' : 'no'}
            options={[
              { value: 'yes', label: tp('yes') },
              { value: 'no', label: tp('no') },
              { value: 'unsure', label: tp('unsure') },
            ]}
            onChange={(v) => !locked && set('regular', v === 'unsure' ? null : v === 'yes')}
          />
        </div>
        <NumField id={`${prefix}-pr`} label={tp('fPr')} unit="ms" value={a.prMs} onChange={(v) => set('prMs', v)} disabled={locked} caliper={calMs} />
        <NumField id={`${prefix}-qrs`} label={tp('fQrs')} unit="ms" value={a.qrsMs} onChange={(v) => set('qrsMs', v)} disabled={locked} caliper={calMs} />
        <NumField id={`${prefix}-qtc`} label={tp('fQtc')} unit="ms" value={a.qtcMs} onChange={(v) => set('qtcMs', v)} disabled={locked} />
        <NumField id={`${prefix}-axis`} label={tp('fAxis')} unit="°" value={a.axisDeg} onChange={(v) => set('axisDeg', v)} disabled={locked} />
      </div>
      <fieldset class="pr-rf__findings">
        <legend>{tp('fFindings')}</legend>
        <FindingPicker idPrefix={prefix} value={a.findings} onChange={(v) => set('findings', v)} disabled={locked} />
      </fieldset>
      <div class="pr-rf__notes">
        <label for={`${prefix}-notes`}>{tp('fNotes')}</label>
        <textarea id={`${prefix}-notes`} rows={2} disabled={locked} value={a.notes ?? ''} onInput={(e) => set('notes', (e.currentTarget as HTMLTextAreaElement).value)} />
      </div>
      {!locked && (
        <div class="pr-actions">
          <Button type="submit" tone="primary" icon="check">
            {tp('submitReport')}
          </Button>
        </div>
      )}
      {locked && props.reference && (
        <div class="pr-rf__result">
          {grade && !props.hideFeedback && (
            <Feedback tone={grade.verdict === 'correct' ? 'ok' : grade.verdict === 'partial' ? 'partial' : 'err'} title={tp('scorePct', { n: Math.round(grade.score * 100) })}>
              {lt(grade.feedback)}
            </Feedback>
          )}
          {submitted || props.answer ? (
            <ReportComparison reference={props.reference} answer={submitted?.answer ?? (props.answer as ReportAnswer)} />
          ) : (
            <p class="pr-rf__ref">{lt(modelReport(props.reference))}</p>
          )}
        </div>
      )}
      {locked && !props.reference && <p class="app-muted">{tp('selfAssess')}</p>}
    </form>
  );
}

/**
 * The real-case page's reading slot (src/real setCaseReadingSlot): a structured report graded against the case's 12SL
 * measurements and labels; submitting records the attempt and reveals the labels.
 */
export function CaseReportPanel(props: CaseReadingSlotProps) {
  const c = props.caseMeta;
  const key = useMemo(() => reportKeyFromCase(c, ports().real.compatible(c.codes, c.infarctionStadium)), [c.id]);
  return (
    <section class="pr-case">
      <h2 class="pr-h2">
        {tp('reportTitle')} <Badge tone="info">{tp('realBadge')}</Badge>
      </h2>
      {!props.revealed && <p class="app-muted">{tp('caseReportLead')}</p>}
      <ReportForm
        ecg={props.ecg}
        reference={key}
        revealed={props.revealed}
        caliper={props.caliper}
        onSubmit={(g) => {
          recordAttempt({
            itemId: `report-real:case:${c.id}`,
            family: 'report-real',
            competency: 'C11',
            findings: key.findings.filter((f) => FINDINGS[f].severity !== 'normal'),
            score: g.score,
            at: Date.now(),
            ...(g.missedCritical ? { missedCritical: true } : {}),
          });
          props.onReveal();
        }}
      />
    </section>
  );
}

