/**
 * Default "your reading" panel of a real case: a short structured checklist (rate, rhythm, axis, PR, QRS, QT/QTc,
 * main findings) plus free-text notes, saved per case on this device. Caliper measurements made on the tracing can be
 * copied into the interval fields (and into the rate as 60000 / Δt).
 */
import type { ReadonlySignal } from '@preact/signals';
import { useState } from 'preact/hooks';
import type { FindingCategory, FindingId } from '../core/findings';
import { FINDING_CATEGORIES, FINDING_LIST, FINDINGS } from '../core/findings';
import type { CaliperMeasure } from '../ecg/api';
import { lt } from '../i18n/index';
import { tr } from '../i18n/real';
import { Icon, Segmented } from '../ui/index';
import { AXIS_KEY, decimal } from './format';
import {
  AXIS_CLASSES,
  bpmFromMs,
  caliperReading,
  computeQtc,
  isBlankReading,
  parseNum,
  QTC_FORMULAS,
  RHYTHM_CHOICES,
  type AxisClass,
  type QtcFormula,
  type Reading,
  type RhythmChoice,
} from './reading';

const FORMULA_KEY = { fridericia: 'qtcFridericia', bazett: 'qtcBazett' } as const satisfies Record<QtcFormula, string>;

type NumField = 'rate' | 'pr' | 'qrs' | 'qt' | 'qtc' | 'axisDeg';

export function ReadingPanel(props: {
  readonly caseId: number;
  readonly reading: Reading;
  readonly update: (patch: Partial<Reading>) => void;
  readonly onClear: () => void;
  readonly caliper: ReadonlySignal<CaliperMeasure | null>;
}) {
  const { reading: r, update } = props;
  const cal = caliperReading(props.caliper.value);
  // only a time measurement feeds the interval and rate fields (an amplitude measure has no meaningful Δt)
  const dt = cal?.kind === 'time' ? cal.ms : null;
  const idp = `rl-${props.caseId}`;

  const numInput = (field: NumField, label: string, opts: { caliper?: 'ms' | 'bpm'; signed?: boolean } = {}) => (
    <div class="rl-form__field">
      <label for={`${idp}-${field}`}>{label}</label>
      <div class="rl-form__inputrow">
        <input
          id={`${idp}-${field}`}
          class="rl-input tabular"
          type="text"
          inputMode={opts.signed ? 'text' : 'numeric'}
          autoComplete="off"
          maxLength={6}
          value={r[field]}
          aria-invalid={r[field] !== '' && parseNum(r[field]) == null}
          onInput={(e) => update({ [field]: e.currentTarget.value } as Partial<Reading>)}
        />
        {opts.caliper && (
          <button
            type="button"
            class="rl-mini"
            disabled={dt == null}
            title={tr('useCaliper')}
            aria-label={`${tr('useCaliper')} — ${label}`}
            onClick={() => {
              if (dt == null) return;
              update({ [field]: String(Math.round(opts.caliper === 'bpm' ? bpmFromMs(dt) : dt)) } as Partial<Reading>);
            }}
          >
            {tr('useCaliperShort')}
          </button>
        )}
      </div>
    </div>
  );

  const qt = parseNum(r.qt);
  const rate = parseNum(r.rate);
  const canQtc = qt != null && rate != null && rate > 0 && qt > 0;

  const available = FINDING_LIST.filter((d) => !r.findings.includes(d.id as FindingId));
  const groups = FINDING_CATEGORIES.map((cat) => ({ cat, items: available.filter((d) => d.cat === cat) })).filter((g) => g.items.length > 0);

  return (
    <div class="rl-reading">
      <h2 class="rl-h2">{tr('yourReading')}</h2>
      <p class="rl-muted rl-small">{tr('readingIntro')}</p>

      <div class="rl-caliper tabular" role="status" aria-live="polite">
        <Icon name="calipers" />
        <span>
          {cal?.kind === 'time'
            ? tr('caliperValue', { ms: Math.round(cal.ms), bpm: Math.round(cal.bpm) })
            : cal?.kind === 'amplitude'
              ? tr('caliperAmp', { mv: decimal(cal.mv, 2) })
              : tr('caliperNone')}
        </span>
      </div>

      <div class="rl-form">
        {numInput('rate', tr('fRate'), { caliper: 'bpm' })}
        <div class="rl-form__field">
          <label for={`${idp}-rhythm`}>{tr('fRhythm')}</label>
          <select id={`${idp}-rhythm`} class="rl-select" value={r.rhythm} onChange={(e) => update({ rhythm: e.currentTarget.value as RhythmChoice })}>
            <option value="">{tr('choose')}</option>
            {RHYTHM_CHOICES.map((id) => (
              <option key={id} value={id}>
                {lt(FINDINGS[id].name)}
              </option>
            ))}
            <option value="other">{tr('optOther')}</option>
          </select>
        </div>
        <div class="rl-form__field">
          <label for={`${idp}-axis`}>{tr('fAxis')}</label>
          <select id={`${idp}-axis`} class="rl-select" value={r.axis} onChange={(e) => update({ axis: e.currentTarget.value as AxisClass | '' })}>
            <option value="">{tr('choose')}</option>
            {AXIS_CLASSES.map((a) => (
              <option key={a} value={a}>
                {tr(AXIS_KEY[a])}
              </option>
            ))}
          </select>
        </div>
        {numInput('axisDeg', tr('fAxisDeg'), { signed: true })}
        {numInput('pr', tr('fPr'), { caliper: 'ms' })}
        {numInput('qrs', tr('fQrs'), { caliper: 'ms' })}
        {numInput('qt', tr('fQt'), { caliper: 'ms' })}
        <div class="rl-form__field">
          <label for={`${idp}-qtc`}>{tr('fQtc')}</label>
          <div class="rl-form__inputrow">
            <input
              id={`${idp}-qtc`}
              class="rl-input tabular"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={r.qtc}
              aria-invalid={r.qtc !== '' && parseNum(r.qtc) == null}
              onInput={(e) => update({ qtc: e.currentTarget.value })}
            />
            <button
              type="button"
              class="rl-mini"
              disabled={!canQtc}
              title={tr(r.qtcFormula === 'bazett' ? 'computeQtcTitleB' : 'computeQtcTitleF')}
              onClick={() => {
                if (canQtc) update({ qtc: String(Math.round(computeQtc(r.qtcFormula, qt, rate))) });
              }}
            >
              {tr('computeQtc')}
            </button>
          </div>
          <Segmented<QtcFormula>
            size="sm"
            ariaLabel={tr('qtcFormula')}
            value={r.qtcFormula}
            onChange={(v) => update({ qtcFormula: v })}
            options={QTC_FORMULAS.map((f) => ({ value: f, label: tr(FORMULA_KEY[f]) }))}
          />
        </div>
      </div>

      <div class="rl-form__field rl-form__field--wide">
        <label for={`${idp}-addf`}>{tr('fFindings')}</label>
        <select
          id={`${idp}-addf`}
          class="rl-select"
          value=""
          onChange={(e) => {
            const v = e.currentTarget.value as FindingId | '';
            if (v && !r.findings.includes(v)) update({ findings: [...r.findings, v] });
            e.currentTarget.value = '';
          }}
        >
          <option value="">{tr('addFinding')}</option>
          {groups.map((g) => (
            <optgroup key={g.cat} label={tr(`fcat_${g.cat}` as `fcat_${FindingCategory}`)}>
              {g.items.map((d) => (
                <option key={d.id} value={d.id}>
                  {lt(d.name)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ul class="rl-picked" aria-live="polite">
          {r.findings.length === 0 ? (
            <li class="rl-muted rl-small">{tr('noFindingsYet')}</li>
          ) : (
            r.findings.map((id) => (
              <li key={id} class="rl-pick">
                <span>{lt(FINDINGS[id].name)}</span>
                <button
                  type="button"
                  class="rl-pick__x"
                  aria-label={tr('removeFinding', { name: lt(FINDINGS[id].name) })}
                  onClick={() => update({ findings: r.findings.filter((x) => x !== id) })}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div class="rl-form__field rl-form__field--wide">
        <label for={`${idp}-notes`}>{tr('fNotes')}</label>
        <textarea
          id={`${idp}-notes`}
          class="rl-notes"
          rows={4}
          placeholder={tr('notesPlaceholder')}
          value={r.notes}
          onInput={(e) => update({ notes: e.currentTarget.value })}
        />
      </div>

      <div class="rl-reading__foot">
        <span class="rl-muted rl-small">{tr('savedLocally')}</span>
        <ClearButton onClear={props.onClear} disabled={isBlankReading(r)} />
      </div>
    </div>
  );
}

/** Two-step clear (the notes are the learner's own work): the first press arms, the second clears; leaving disarms. */
function ClearButton(props: { readonly onClear: () => void; readonly disabled: boolean }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      class={`ui-btn ui-btn--sm ${armed ? 'ui-btn--danger' : 'ui-btn--ghost'} rl-clear`}
      disabled={props.disabled}
      onBlur={() => setArmed(false)}
      onMouseLeave={() => setArmed(false)}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        props.onClear();
      }}
    >
      <Icon name="refresh" />
      <span aria-live="polite">{armed ? tr('clearConfirm') : tr('clearReading')}</span>
    </button>
  );
}
