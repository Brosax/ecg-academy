/**
 * "Real case of the day" card for the home page slot (src/app/slots.ts → homeSlots.caseOfDay). Blind: only the case
 * number, sex and age — the learner reads before seeing any diagnosis. Deterministic per local calendar date.
 */
import { href } from '../app/router';
import { tr } from '../i18n/real';
import { Badge, Icon } from '../ui/index';
import { caseNumber, patientLine } from './format';
import { caseOfTheDay, dateKey, getCases } from './library';
import { readSet } from './state';
import './real.css';

export function CaseOfDayCard() {
  const c = caseOfTheDay(getCases(), dateKey(new Date()));
  const read = readSet.value.has(c.id);
  return (
    <article class="rl-cotd">
      <h3 class="rl-cotd__title">
        <Icon name="wave" />
        {tr('caseOfDay')}
      </h3>
      <p class="rl-cotd__case">
        <span class="tabular">{tr('caseNo', { n: caseNumber(c.num) })}</span>
        <span class="rl-muted"> · {patientLine(c)}</span>
        {read && <Badge tone="ok">{tr('readBadge')}</Badge>}
      </p>
      <p class="rl-small rl-muted">{tr('cotdLead')}</p>
      <a class="rl-cotd__action" href={href({ name: 'case', id: c.id })}>
        {tr('openThisCase')}
        <Icon name="next" size={16} />
      </a>
    </article>
  );
}
