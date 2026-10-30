/**
 * #/progress — overall mastery, a learning curve per competency against its target, the critical-findings tracker
 * (every can't-miss finding must reach 100 %), the review queue, confidence calibration, and the data controls.
 */
import { href } from '../../app/router';
import { FINDING_LIST, type FindingId } from '../../core/findings';
import { tc } from '../../i18n/common';
import { lt } from '../../i18n/index';
import { tp } from '../../i18n/practice';
import { Badge, Icon, ProgressRing } from '../../ui/index';
import { COMPETENCIES } from '../api';
import { calibration, criticalStatus, DAY_MS, findingOfCard, isPassed, learningCurve, MASTERY_TARGET } from '../core/mastery';
import { allAttempts, allCards, masteryOf, overallMastery, progressVersion } from '../core/progress';
import { familiesTraining, familyAvailable, getSpec } from '../core/families';
import { fname } from '../core/text';
import { ProgressDataControls } from './cards';
import { CalibrationChart, CurveChart } from './charts';
import { compName, MasteryBar } from './PracticePage';

const CRITICAL: readonly FindingId[] = FINDING_LIST.filter((f) => f.severity === 'critical').map((f) => f.id);

const STATUS_KEY = { unseen: 'stUnseen', learning: 'stLearning', secured: 'stSecured' } as const;
const STATUS_TONE = { unseen: 'neutral', learning: 'warn', secured: 'ok' } as const;

export function ProgressPage() {
  void progressVersion.value;
  const attempts = allAttempts();
  const overall = overallMastery();
  const now = Date.now();
  const cards = allCards();
  const due = cards.filter((c) => c.due <= now);
  const upcoming = cards.filter((c) => c.due > now).slice(0, 12);
  const calib = calibration(attempts);
  const sure = calib[2];
  const critical = CRITICAL.map((f) => ({ f, status: criticalStatus(attempts.filter((a) => a.findings.includes(f))) }));
  const secured = critical.filter((c) => c.status === 'secured').length;
  const cardLabel = (key: string) => {
    const f = findingOfCard(key);
    if (f) return lt(fname(f));
    const s = getSpec(key);
    return s ? lt(s.title) : key;
  };

  return (
    <div class="app-page pr-page">
      <header class="app-pagehead">
        <h1>{tc('navProgress')}</h1>
        <p>{tp('progressLead')}</p>
      </header>

      <section class="pr-overall" aria-labelledby="pr-overall-h">
        <ProgressRing value={overall ?? 0} size={72} label={`${tp('overall')}: ${overall === null ? '—' : `${Math.round(overall * 100)} %`}`} />
        <div>
          <h2 id="pr-overall-h" class="pr-h2">
            {tp('overall')}
          </h2>
          <p class="pr-overall__pct tabular">{overall === null ? tp('notStarted') : `${Math.round(overall * 100)} %`}</p>
        </div>
      </section>

      <section class="pr-section" aria-labelledby="pr-curves-h">
        <h2 id="pr-curves-h" class="pr-h2">
          {tp('curves')}
        </h2>
        <div class="pr-curves">
          {COMPETENCIES.map((c) => {
            const scores = attempts.filter((a) => a.competency === c).map((a) => a.score);
            const m = masteryOf(c);
            const passed = isPassed(m, MASTERY_TARGET[c]);
            return (
              <div class="pr-curvecard" key={c}>
                <div class="pr-curvecard__head">
                  <span class="pr-stage-badge">{c}</span>
                  <span class="pr-curvecard__name">{compName(c)}</span>
                  {passed && <Badge tone="ok">{tp('passed')}</Badge>}
                </div>
                <CurveChart points={learningCurve(scores, 10)} target={MASTERY_TARGET[c]} label={compName(c)} />
                <MasteryBar m={m} target={MASTERY_TARGET[c]} label={`${tp('mastery')} — ${compName(c)}`} />
                <span class="app-muted pr-curvecard__target tabular">{tp('target', { n: Math.round(MASTERY_TARGET[c] * 100) })}</span>
              </div>
            );
          })}
        </div>
        {attempts.length === 0 && <p class="app-muted">{tp('curvesEmpty')}</p>}
      </section>

      <section class="pr-section" aria-labelledby="pr-crit-h">
        <h2 id="pr-crit-h" class="pr-h2">
          {tp('criticalTitle')} <span class="tabular app-muted">{`${secured}/${CRITICAL.length}`}</span>
        </h2>
        <p class="app-muted">{tp('criticalLead')}</p>
        <ul class="pr-crit">
          {critical.map(({ f, status }) => {
            const fams = familiesTraining(f).filter((s) => familyAvailable(s));
            const fam = fams.find((s) => s.source === 'synth') ?? fams[0];
            return (
              <li key={f} class={`pr-crit__row is-${status}`}>
                <Badge tone={STATUS_TONE[status]}>{tp(STATUS_KEY[status])}</Badge>
                <span class="pr-crit__name">{lt(fname(f))}</span>
                {fam && status !== 'secured' && (
                  <a class="pr-linkbtn" href={href({ name: 'drill', id: fam.id })}>
                    {tp('practise')}
                    <Icon name="next" size={14} />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section class="pr-section" aria-labelledby="pr-queue-h">
        <h2 id="pr-queue-h" class="pr-h2">
          {tp('queueTitle')}
        </h2>
        {cards.length === 0 ? (
          <p class="app-muted">{tp('queueEmpty')}</p>
        ) : (
          <div class="pr-queue">
            <div>
              <h3>
                {tp('dueNow')} <span class="tabular">({due.length})</span>
              </h3>
              <ul class="pr-queue__list">
                {due.slice(0, 20).map((c) => (
                  <li key={c.key}>
                    <span>{cardLabel(c.key)}</span>
                    <Badge>{tp('box', { n: c.box })}</Badge>
                  </li>
                ))}
              </ul>
              {due.length > 0 && (
                <a class="pr-linkbtn" href={href({ name: 'drill', id: 'review' })}>
                  {tp('homeReviewsStart')}
                  <Icon name="next" size={14} />
                </a>
              )}
            </div>
            <div>
              <h3>{tp('upcoming')}</h3>
              <ul class="pr-queue__list">
                {upcoming.map((c) => (
                  <li key={c.key}>
                    <span>{cardLabel(c.key)}</span>
                    <span class="app-muted tabular">{tp('dueIn', { n: Math.max(1, Math.ceil((c.due - now) / DAY_MS)) })}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section class="pr-section" aria-labelledby="pr-calib-h">
        <h2 id="pr-calib-h" class="pr-h2">
          {tp('calibrationTitle')}
        </h2>
        <p class="app-muted">{tp('calibrationLead')}</p>
        {calib.every((r) => r.n === 0) ? (
          <p class="app-muted">{tp('calibrationEmpty')}</p>
        ) : (
          <>
            <CalibrationChart rows={calib} labels={[tp('conf1'), tp('conf2'), tp('conf3')]} />
            {sure.n >= 5 && sure.accuracy !== null && sure.accuracy < 0.8 && <p class="pr-warn">{tp('overconfident')}</p>}
          </>
        )}
      </section>

      <section class="pr-section" aria-labelledby="pr-data-h">
        <h2 id="pr-data-h" class="pr-h2">
          {tp('dataTitle')}
        </h2>
        <ProgressDataControls />
      </section>
    </div>
  );
}
