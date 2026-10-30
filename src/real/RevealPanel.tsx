/**
 * The "Reveal" step of a real case: the cardiologists' SCP-ECG statements (translated, with likelihood, each linked to
 * the atlas pages it maps to), the infarct stage, atlas pages worth comparing, the learner's reading against the labels,
 * and the GE 12SL reference measurements next to the learner's with the difference.
 */
import { useEffect, useRef } from 'preact/hooks';
import type { FindingId } from '../core/findings';
import { FINDINGS } from '../core/findings';
import { href } from '../app/router';
import { lt } from '../i18n/index';
import { tr } from '../i18n/real';
import { Button, Icon } from '../ui/index';
import { AXIS_KEY, degOrDash, KIND_KEY, LIKELIHOOD_KEY, MEASURE_LABEL_KEY, numOrDash, signed, stadiumKey } from './format';
import type { RealCase } from './library';
import {
  compareAxis,
  compareFindings,
  compareMeasurements,
  compareRhythm,
  EMPTY_READING,
  parseNum,
  type ChoiceVerdict,
  type MeasureRow,
  type Reading,
} from './reading';
import { caseStatements, compatibleFindings, likelihoodWord } from './scp';

export function RevealPanel(props: {
  readonly c: RealCase;
  /** the learner's checklist; null when a replacement reading panel (slot) is in use */
  readonly reading: Reading | null;
  readonly onHide: () => void;
  /** move focus to the heading (after the learner pressed "Reveal") */
  readonly focusOnMount?: boolean;
}) {
  const { c, reading } = props;
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (props.focusOnMount) headRef.current?.focus();
  }, []);

  const stmts = caseStatements(c.codes, c.infarctionStadium);
  const stage = stadiumKey(c.infarctionStadium);
  const someNotCounted = stmts.some((s) => !s.counted);
  const someSuperseded = stmts.some((s) => s.superseded);

  return (
    <section class="rl-panel rl-answer" aria-labelledby={`rl-answer-${c.id}`}>
      <div class="rl-panel__head">
        <h2 class="rl-h2" id={`rl-answer-${c.id}`} ref={headRef} tabIndex={-1}>
          {tr('answerTitle')}
        </h2>
        <Button size="sm" tone="ghost" icon="eye" onClick={props.onHide}>
          {tr('hideAnswer')}
        </Button>
      </div>

      <h3 class="rl-h3">{tr('labelsTitle')}</h3>
      <ul class="rl-stmts">
        {stmts.map((s) => {
          const lh = s.def?.kind === 'diagnostic' ? likelihoodWord(s.likelihood) : null;
          return (
            <li class={`rl-stmt ${s.counted && !s.superseded ? '' : 'is-dim'}`} key={s.code}>
              <div class="rl-stmt__main">
                <span class="rl-stmt__name">{s.def ? lt(s.def.name) : s.code}</span>
                <span class="rl-stmt__meta">
                  {s.def && <span class="rl-tag">{tr(KIND_KEY[s.def.kind])}</span>}
                  {lh && (
                    <span class={`rl-tag rl-tag--lh rl-tag--${lh} tabular`}>
                      {tr('likelihood', { p: s.likelihood })} · {tr(LIKELIHOOD_KEY[lh])}
                    </span>
                  )}
                  {(!s.counted || s.superseded) && <span class="rl-tag rl-tag--dim">{tr('notCountedTag')}</span>}
                  <code class="rl-code" translate={false}>
                    {s.code}
                  </code>
                </span>
              </div>
              {s.findings.length > 0 && (
                <ul class="rl-linkchips rl-stmt__links" aria-label={tr('atlasCol')}>
                  {s.findings.map((id) => (
                    <li key={id}>
                      <FindingLink id={id} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {someNotCounted && <p class="rl-small rl-muted">{tr('notCounted')}</p>}
      {someSuperseded && <p class="rl-small rl-muted">{tr('normSuperseded')}</p>}
      {stage && (
        <p class="rl-stage">
          <strong>{tr('stadiumTitle')}</strong> <span>{tr(stage)}</span>
        </p>
      )}
      {c.findings.length === 0 && <p class="rl-small rl-muted">{tr('noMapped')}</p>}

      {c.related.length > 0 && (
        <div class="rl-block">
          <h3 class="rl-h3">{tr('relatedTitle')}</h3>
          <ul class="rl-linkchips">
            {c.related.map((id) => (
              <li key={id}>
                <FindingLink id={id} quiet />
              </li>
            ))}
          </ul>
        </div>
      )}

      {reading && <ReadingComparison c={c} reading={reading} />}

      <Measurements c={c} reading={reading} />
    </section>
  );
}

/** A finding name linking to its atlas page (#/atlas/<id>), coloured by severity. */
export function FindingLink(props: { readonly id: FindingId; readonly quiet?: boolean }) {
  const d = FINDINGS[props.id];
  const name = lt(d.name);
  return (
    <a
      class={`rl-flink rl-flink--${props.quiet ? 'quiet' : d.severity}`}
      href={href({ name: 'finding', id: props.id })}
      title={tr('openAtlas', { name })}
    >
      <span>{name}</span>
      <Icon name="next" size={14} />
    </a>
  );
}

function VerdictMark(props: { readonly v: ChoiceVerdict<unknown>['verdict'] }) {
  const v = props.v;
  if (v !== 'ok' && v !== 'partial' && v !== 'wrong') return <span class="rl-verdict rl-verdict--none" aria-hidden="true" />;
  const icon = v === 'ok' ? 'check' : v === 'partial' ? 'half' : 'close';
  const label = tr(v === 'ok' ? 'verdictOk' : v === 'partial' ? 'verdictPartial' : 'verdictWrong');
  return (
    <span class={`rl-verdict rl-verdict--${v}`}>
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </span>
  );
}

function ReadingComparison(props: { readonly c: RealCase; readonly reading: Reading }) {
  const { c, reading } = props;
  const typedAxis = parseNum(reading.axisDeg);
  const rhythm = compareRhythm(reading.rhythm, c.findings);
  const axis = compareAxis(reading.axis, c.ref.qrsAxisDeg, typedAxis);
  const fx = compareFindings(reading, c.findings, c.ref.qrsAxisDeg, compatibleFindings(c.codes, c.infarctionStadium));

  const rhythmMine = !reading.rhythm ? tr('notAnswered') : reading.rhythm === 'other' ? tr('optOther') : lt(FINDINGS[reading.rhythm].name);
  const rhythmTruth = rhythm.truth.length > 0 ? rhythm.truth.map((id) => lt(FINDINGS[id].name)).join(', ') : tr('notLabelled');
  // a class inferred from typed degrees shows those degrees too
  const axisMine = !axis.mine ? tr('notAnswered') : reading.axis ? tr(AXIS_KEY[axis.mine]) : `${degOrDash(typedAxis)} · ${tr(AXIS_KEY[axis.mine])}`;
  const axisTruth = axis.truth.length > 0 ? `${degOrDash(c.ref.qrsAxisDeg)} · ${tr(AXIS_KEY[axis.truth[0]])}` : tr('notAvailable');

  const list = (ids: readonly FindingId[]) =>
    ids.length === 0 ? (
      <p class="rl-small rl-muted">{tr('none')}</p>
    ) : (
      <ul class="rl-names">
        {ids.map((id) => (
          <li key={id}>{lt(FINDINGS[id].name)}</li>
        ))}
      </ul>
    );

  return (
    <div class="rl-block">
      <h3 class="rl-h3">{tr('compareTitle')}</h3>
      <dl class="rl-cmp">
        <div class="rl-cmp__row">
          <dt>{tr('rhythmLine')}</dt>
          <dd>
            <VerdictMark v={rhythm.verdict} />
            <span class="rl-cmp__text">
              <span>{tr('youSaid', { v: rhythmMine })}</span>
              <span class="rl-muted">{tr('labelled', { v: rhythmTruth })}</span>
            </span>
          </dd>
        </div>
        <div class="rl-cmp__row">
          <dt>{tr('axisLine')}</dt>
          <dd>
            <VerdictMark v={axis.verdict} />
            <span class="rl-cmp__text">
              <span>{tr('youSaid', { v: axisMine })}</span>
              <span class="rl-muted">{tr('refSaid', { v: axisTruth })}</span>
            </span>
          </dd>
        </div>
      </dl>
      <div class="rl-fcmp">
        <div class="rl-fcmp__col rl-fcmp__col--hit">
          <h4>{tr('youFound')}</h4>
          {list(fx.hit)}
        </div>
        <div class="rl-fcmp__col rl-fcmp__col--missed">
          <h4>{tr('youMissed')}</h4>
          {list(fx.missed)}
        </div>
        <div class="rl-fcmp__col rl-fcmp__col--extra">
          <h4>{tr('youExtra')}</h4>
          {list(fx.extra)}
        </div>
        {fx.compatible.length > 0 && (
          <div class="rl-fcmp__col rl-fcmp__col--compat">
            <h4>{tr('youCompatible')}</h4>
            {list(fx.compatible)}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtValue(v: number | null, unit: MeasureRow['unit']): string {
  return unit === 'deg' ? degOrDash(v) : numOrDash(v);
}

function Measurements(props: { readonly c: RealCase; readonly reading: Reading | null }) {
  const withYou = props.reading != null;
  const rows = compareMeasurements(props.reading ?? EMPTY_READING, props.c.ref);
  const noneTyped = withYou && rows.every((r) => r.mine == null);
  return (
    <div class="rl-block">
      <h3 class="rl-h3">{tr('measTitle')}</h3>
      <table class={`rl-meas ${withYou ? '' : 'rl-meas--ref'}`}>
        <thead>
          <tr>
            <th scope="col">{tr('colItem')}</th>
            <th scope="col" class="rl-num">
              {tr('colRef')}
            </th>
            {withYou && (
              <th scope="col" class="rl-num">
                {tr('colYou')}
              </th>
            )}
            {withYou && (
              <th scope="col" class="rl-num">
                {tr('colDiff')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{tr(MEASURE_LABEL_KEY[r.key])}</th>
              <td class="rl-num tabular">{fmtValue(r.ref, r.unit)}</td>
              {withYou && <td class="rl-num tabular">{fmtValue(r.mine, r.unit)}</td>}
              {withYou && (
                <td class="rl-num tabular">
                  {r.diff == null ? (
                    '—'
                  ) : (
                    <span class={`rl-diff rl-diff--${r.verdict}`}>
                      <span>{signed(r.diff)}</span>
                      {r.verdict !== 'na' && r.tol != null && (
                        <Icon
                          name={r.verdict === 'ok' ? 'check' : 'close'}
                          size={14}
                          label={tr(r.verdict === 'ok' ? 'tolOk' : 'tolOff', { tol: r.tol })}
                        />
                      )}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {noneTyped && <p class="rl-small rl-muted">{tr('noYouValues')}</p>}
      <p class="rl-small rl-muted">{tr('refNote')}</p>
    </div>
  );
}
