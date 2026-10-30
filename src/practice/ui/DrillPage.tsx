/**
 * #/practice/:drillId — a drill session. Ids: a family ("rate"), a family with a seed ("rate:12345"), a full item id
 * ("rate:subtle:12345", replays that exact item), "mixed" (adaptive mix) or "review" (spaced review of due cards).
 * The difficulty ladder is classic → subtle → noisy → borderline → real (the family's real-ECG twin).
 */
import { useMemo, useState } from 'preact/hooks';
import { href } from '../../app/router';
import { lt } from '../../i18n/index';
import { tp } from '../../i18n/practice';
import type { FindingId } from '../../core/findings';
import type { Difficulty } from '../../synth/index';
import { Badge, Icon, LinkButton, Segmented } from '../../ui/index';
import { COMPETENCIES } from '../api';
import { difficultyFor, fit, planMixed, planReviews } from '../core/adaptive';
import { familyAvailable, getSpec } from '../core/families';
import { parseItemId } from '../core/generate';
import { dueReviews, masteryOf, masteryOfFamily } from '../core/progress';
import { DrillRunner, freshSeed } from './DrillRunner';
import { compName } from './PracticePage';

type Rung = Difficulty | 'real';

const RUNG_KEY: Readonly<Record<Rung, Parameters<typeof tp>[0]>> = {
  classic: 'dClassic',
  subtle: 'dSubtle',
  noisy: 'dNoisy',
  borderline: 'dBorderline',
  real: 'dReal',
};

function parseDrillId(id: string): { family: string; seed?: number; difficulty?: Difficulty; topic?: FindingId } {
  const full = parseItemId(id);
  if (full) return { family: full.family, seed: full.seed, difficulty: full.difficulty, ...(full.topic ? { topic: full.topic } : {}) };
  const m = /^([^:]+):(\d+)$/.exec(id);
  if (m) return { family: m[1], seed: Number(m[2]) };
  return { family: id };
}

function Back() {
  return (
    <a class="pr-back" href={href({ name: 'practice' })}>
      <Icon name="prev" size={16} />
      {tp('backToPractice')}
    </a>
  );
}

function MixedSession() {
  const [seed] = useState(() => freshSeed('mixed'));
  const plan = useMemo(() => planMixed({ seed, count: 12, mastery: masteryOf, due: dueReviews(Date.now()) }), [seed]);
  return (
    <div class="app-page pr-page">
      <Back />
      <header class="app-pagehead">
        <h1>{tp('mixedTitle')}</h1>
        <p>{tp('mixText')}</p>
      </header>
      <DrillRunner families={[...new Set(plan.map((e) => e.family))]} count={plan.length} plan={plan} seed={seed} />
    </div>
  );
}

function ReviewSession() {
  const [seed] = useState(() => freshSeed('review'));
  const plan = useMemo(() => planReviews(dueReviews(Date.now()), seed), [seed]);
  return (
    <div class="app-page pr-page">
      <Back />
      <header class="app-pagehead">
        <h1>{tp('reviewSessionTitle')}</h1>
      </header>
      {plan.length === 0 ? (
        <div class="pr-empty">
          <p>{tp('nothingDue')}</p>
          <LinkButton href={href({ name: 'drill', id: 'mixed' })} tone="primary" icon="bolt">
            {tp('mixTitle')}
          </LinkButton>
        </div>
      ) : (
        <DrillRunner families={[...new Set(plan.map((e) => e.family))]} count={plan.length} plan={plan} seed={seed} />
      )}
    </div>
  );
}

export function DrillPage(props: { readonly id: string }) {
  if (props.id === 'mixed') return <MixedSession />;
  if (props.id === 'review') return <ReviewSession />;
  return <FamilySession key={props.id} id={props.id} />;
}

function FamilySession(props: { readonly id: string }) {
  const parsed = parseDrillId(props.id);
  const spec = getSpec(parsed.family);
  // only the rungs the catalogue / case library can produce today
  const synthOk = !!spec && familyAvailable(spec);
  const realOk = !!spec?.realTwin && familyAvailable(spec.realTwin);
  const initial: Rung = parsed.difficulty ?? (spec && !synthOk && realOk ? 'real' : spec ? fit(spec, difficultyFor(masteryOfFamily(spec.id).accuracy)) : 'classic');
  const [rung, setRung] = useState<Rung>(initial);
  if (!spec) {
    return (
      <div class="app-page pr-page">
        <Back />
        <h1>{tp('familyNotFound')}</h1>
      </div>
    );
  }
  const rungs: Rung[] = [...(synthOk ? spec.difficulties : []), ...(realOk ? (['real'] as const) : [])];
  if (rungs.length === 0) {
    return (
      <div class="app-page pr-page">
        <Back />
        <header class="app-pagehead">
          <h1>{lt(spec.title)}</h1>
          <p>{lt(spec.description)}</p>
        </header>
        <div class="pr-empty">
          <p>{tp('drillSoonLong')}</p>
          <LinkButton href={href({ name: 'drill', id: 'mixed' })} tone="primary" icon="bolt">
            {tp('mixTitle')}
          </LinkButton>
        </div>
      </div>
    );
  }
  const active = rung === 'real' && spec.realTwin ? getSpec(spec.realTwin) ?? spec : spec;
  const difficulty: Difficulty = rung === 'real' ? 'classic' : rung;
  const single = parsed.difficulty !== undefined && parsed.seed !== undefined;
  return (
    <div class="app-page pr-page">
      <Back />
      <header class="app-pagehead pr-drillhead">
        <div>
          <h1>{lt(spec.title)}</h1>
          <p>{lt(spec.description)}</p>
        </div>
        <p class="pr-drillhead__meta">
          <Badge>{spec.competency}</Badge> <span class="app-muted">{COMPETENCIES.includes(spec.competency) ? compName(spec.competency) : ''}</span>
        </p>
      </header>
      {rungs.length > 1 && !single && (
        <div class="pr-ladder">
          <span id="pr-ladder-lbl">{tp('difficulty')}</span>
          <Segmented<Rung> ariaLabel={tp('difficulty')} size="sm" value={rung} options={rungs.map((r) => ({ value: r, label: tp(RUNG_KEY[r]) }))} onChange={setRung} />
        </div>
      )}
      <DrillRunner
        key={`${active.id}:${difficulty}`}
        families={[active.id]}
        count={single ? 1 : 10}
        difficulty={difficulty}
        seed={parsed.seed}
        passScore={0.8}
        {...(parsed.topic && active === spec ? { topic: parsed.topic } : {})}
      />
    </div>
  );
}
