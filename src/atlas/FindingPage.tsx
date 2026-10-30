/**
 * #/atlas/:findingId — one finding. The ECG comes first (synthetic exemplar with variant chips and an optional small
 * 3D heart), then how to recognise it, the criteria card with sources, the mechanism, what to do next, drills and
 * lessons, the look-alikes side by side with the discriminating feature, pitfalls, real PTB-XL tracings (read first,
 * reveal on the case page) and the references. Findings without an entry yet keep the ECG, real cases and drills.
 */
import { useSignal } from '@preact/signals';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { NotFoundPage } from '../app';
import { href } from '../app/router';
import { store } from '../app/store';
import type { Ecg } from '../core/ecg';
import { FINDINGS, isFindingId, type FindingId } from '../core/findings';
import { LANGS, pick } from '../core/l10n';
import type { Lead } from '../core/leads';
import { EcgView } from '../ecg';
import { Heart3D } from '../heart3d';
import { lt } from '../i18n';
import { ta } from '../i18n/atlas';
// links.ts only maps finding ids to lab routes (type-only imports): linking never loads the lab's engine
import { labHref } from '../lab/links';
import { families } from '../practice';
import type { DrillFamily } from '../practice/api';
import { AttributionFooter, casesWithFinding, loadRealEcg, peekRealEcg, SCP_LIST, type RealCase } from '../real';
import { generate, scenarios } from '../synth';
import type { SynthRequest } from '../synth/api';
import { Badge, Button, Icon, LinkButton } from '../ui';
import { badgeLabel, catLabel } from './AtlasPage';
import { exemplarOptions, exemplarRequest, generateCached, peekCached, type ExemplarOption, type Generated } from './exemplar';
import { lessonTitle } from './lessons';
import { entryOf } from './registry';
import type { AtlasEntry, MimicSpec } from './schema';
import { siblings } from './search';
import { rankCases, stripPath, THUMB_H, THUMB_W } from './thumbs';
import './atlas.css';

const REAL_SHOWN = 4;

export function FindingPage(props: { readonly id: string }) {
  if (!isFindingId(props.id)) return <NotFoundPage path={`atlas/${props.id}`} />;
  return <Finding key={props.id} id={props.id} />;
}

function Finding(props: { readonly id: FindingId }) {
  const { id } = props;
  const d = FINDINGS[id];
  const entry = entryOf(id);
  const lang = store.lang.value;
  const nav = siblings(id);
  const others = LANGS.filter((l) => l !== lang).map((l) => pick(d.name, l));

  const options = useMemo(() => safeOptions(id, entry), [id, entry]);
  const [optKey, setOptKey] = useState<string | null>(options[0]?.key ?? null);
  const [n, setN] = useState(0);
  const opt = options.find((o) => o.key === optKey) ?? options[0] ?? null;
  const req = useMemo(() => (opt ? exemplarRequest(id, opt, n, entry) : null), [id, opt, n, entry]);
  const gen = useGenerated(req);

  return (
    <div class="at-page at-finding">
      <nav class="at-crumbs" aria-label={ta('backToAtlas')}>
        <a class="at-crumbs__back" href={href({ name: 'atlas' })}>
          <Icon name="prev" size={16} />
          {ta('backToAtlas')}
        </a>
        <span class="at-crumbs__cat">{catLabel(d.cat)}</span>
        <span class="at-crumbs__nav">
          {nav.prev && (
            <a href={href({ name: 'finding', id: nav.prev })} title={lt(FINDINGS[nav.prev].name)}>
              <Icon name="prev" size={16} />
              {ta('prev')}
            </a>
          )}
          {nav.next && (
            <a href={href({ name: 'finding', id: nav.next })} title={lt(FINDINGS[nav.next].name)}>
              {ta('next')}
              <Icon name="next" size={16} />
            </a>
          )}
        </span>
      </nav>

      <header class={`at-head at-head--${d.severity}`}>
        <div class="at-head__title">
          <h1>{lt(d.name)}</h1>
          <Badge tone={d.severity}>
            {d.severity === 'critical' && <Icon name="flag" size={14} />} {badgeLabel(d.severity)}
          </Badge>
        </div>
        <p class="at-head__alt">{others.join(' · ')}</p>
        {entry ? (
          <p class="at-head__def">{lt(entry.definition)}</p>
        ) : (
          <div class="at-pending" role="note">
            <strong>{ta('entryPending')}</strong>
            <span>{ta('entryPendingBody')}</span>
          </div>
        )}
      </header>

      <Exemplar
        id={id}
        entry={entry}
        options={options}
        opt={opt}
        n={n}
        gen={gen}
        onOption={(k) => {
          setOptKey(k);
          setN(0);
        }}
        onNew={() => setN((x) => x + 1)}
      />

      {entry && (
        <section class="at-section at-recognise" aria-labelledby="at-rec">
          <h2 id="at-rec">{ta('recognise')}</h2>
          <ol class="at-steps">
            {entry.features.map((t, i) => (
              <li key={i}>{lt(t)}</li>
            ))}
          </ol>
        </section>
      )}

      <div class="at-cols">
        <div class="at-cols__main">
          {entry && <CriteriaCard entry={entry} />}
          {entry && (
            <section class="at-section" aria-labelledby="at-mech">
              <h2 id="at-mech">{ta('mechanism')}</h2>
              <p class="at-prose">{lt(entry.mechanism)}</p>
            </section>
          )}
        </div>
        <aside class="at-cols__side">
          {entry?.urgency && (
            <section class={`at-urgency at-urgency--${entry.urgency.level}`} aria-labelledby="at-urg">
              <h2 id="at-urg">
                <Icon name="bolt" size={18} />
                {ta('urgency')} · {ta(`urgency_${entry.urgency.level}`)}
              </h2>
              <p>{lt(entry.urgency.next)}</p>
            </section>
          )}
          <Practise id={id} />
          <LabLink id={id} />
          {entry && entry.lessons.length > 0 && (
            <section class="at-side-card" aria-labelledby="at-les">
              <h2 id="at-les">{ta('lessons')}</h2>
              <ul class="at-links">
                {entry.lessons.map((lid) => {
                  const t = lessonTitle(lid);
                  return (
                    <li key={lid}>
                      <a href={href({ name: 'lesson', id: lid })}>
                        <span class="at-links__tag tabular">{ta('lessonLabel', { id: lid.toUpperCase() })}</span>
                        {t && <span>{lt(t)}</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {entry && entry.mimics.length > 0 && <MimicCompare id={id} entry={entry} leftReq={req} />}

      {entry && (
        <section class="at-section" aria-labelledby="at-pit">
          <h2 id="at-pit">{ta('pitfalls')}</h2>
          <ul class="at-pitfalls">
            {entry.pitfalls.map((t, i) => (
              <li key={i}>
                <Icon name="close" size={16} />
                <span>{lt(t)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RealExamples id={id} />

      {entry && (
        <section class="at-section at-sources" aria-labelledby="at-src">
          <h2 id="at-src">{ta('sources')}</h2>
          <ol>
            {entry.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p class="at-muted">{ta('sourcesNote')}</p>
        </section>
      )}
    </div>
  );
}

// ── synthetic exemplar ──────────────────────────────────────────────────────────────────────────────────────────────

/** Scenario options for a finding; an engine without a catalogue yields none (never throws). */
function safeOptions(id: FindingId, entry: AtlasEntry | undefined): ExemplarOption[] {
  try {
    return exemplarOptions(id, entry, scenarios(), scenarios({ finding: id }));
  } catch {
    return [];
  }
}

/**
 * Generated ECG for a request: synchronous when cached, otherwise generated right after paint (so the placeholder
 * shows first). null while pending or when there is no request.
 */
function useGenerated(req: SynthRequest | null): Generated | null {
  const key = req ? JSON.stringify(req) : '';
  const [done, setDone] = useState<{ readonly key: string; readonly g: Generated } | null>(null);
  useEffect(() => {
    if (!req) return;
    if (peekCached(req)) return;
    const t = setTimeout(() => setDone({ key, g: generateCached(req, generate) }), 0);
    return () => clearTimeout(t);
  }, [key]);
  if (!req) return null;
  return peekCached(req) ?? (done && done.key === key ? done.g : null);
}

function viewFor(leads: readonly Lead[] | undefined): { layout?: '3x4+1' | 'single'; lead?: Lead } {
  if (leads && leads.length === 1) return { layout: 'single', lead: leads[0] };
  return { layout: '3x4+1' };
}

function Exemplar(props: {
  readonly id: FindingId;
  readonly entry: AtlasEntry | undefined;
  readonly options: readonly ExemplarOption[];
  readonly opt: ExemplarOption | null;
  readonly n: number;
  readonly gen: Generated | null;
  readonly onOption: (key: string) => void;
  readonly onNew: () => void;
}) {
  const { entry, opt, gen } = props;
  const cursor = useSignal<number | null>(null);
  const [heart, setHeart] = useState(() => store.settings.value.showHeart);
  const ecg: Ecg | null = gen && gen.ok ? gen.result.ecg : null;
  const leads = entry?.exemplar?.leads;
  const name = lt(FINDINGS[props.id].name);
  const showHeart = heart && !!ecg?.regions;

  return (
    <section class="at-ecg" aria-labelledby="at-ex">
      <div class="at-ecg__head">
        <h2 id="at-ex">{ta('exemplar')}</h2>
        {props.options.length > 1 && (
          <div class="at-chips at-chips--sm" role="radiogroup" aria-label={ta('variants')}>
            {props.options.map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={o.key === opt?.key}
                class={`at-chip ${o.key === opt?.key ? 'is-on' : ''}`}
                onClick={() => props.onOption(o.key)}
              >
                {lt(o.label)}
              </button>
            ))}
          </div>
        )}
        <span class="at-ecg__tools">
          {opt && (
            <Button size="sm" icon="refresh" onClick={props.onNew}>
              {ta('newExample')}
            </Button>
          )}
          {ecg?.regions && (
            <Button size="sm" icon="heart" aria-pressed={heart} onClick={() => setHeart(!heart)}>
              {heart ? ta('heartHide') : ta('heartShow')}
            </Button>
          )}
        </span>
      </div>
      {leads && leads.length > 0 && <p class="at-ecg__look">{ta('lookAt', { leads: leads.join(', ') })}</p>}

      <div class={`at-ecg__body ${showHeart ? 'has-heart' : ''}`}>
        <div class="at-ecg__paper">
          {ecg ? (
            <EcgView
              ecg={ecg}
              {...(entry?.exemplar?.layout ? { layout: entry.exemplar.layout } : {})}
              {...(entry?.exemplar?.lead ? { lead: entry.exemplar.lead } : {})}
              highlightLeads={leads}
              toolbar
              cursor={cursor}
              ariaLabel={ta('exemplarAria', { name })}
            />
          ) : (
            <div class={`at-ecgbox ${opt ? '' : 'at-ecgbox--none'}`} role="status">
              <Icon name="wave" size={22} />
              <span>{!opt ? ta('noExemplar') : gen && !gen.ok ? ta('exemplarError') : ta('generating')}</span>
            </div>
          )}
        </div>
        {showHeart && ecg && (
          <figure class="at-ecg__heart">
            <Heart3D regions={ecg.regions} cursor={cursor} size={220} labels ariaLabel={name} />
            <figcaption class="at-muted">{ta('heartCaption')}</figcaption>
          </figure>
        )}
      </div>
      <p class="at-ecg__note at-muted">
        {opt?.recording ? (
          <>
            <strong>{lt(opt.label)}</strong> · {ta('exemplarRecording')}
          </>
        ) : (
          ta('exemplarNote')
        )}
        {opt && <span class="tabular"> · {ta('exampleNo', { n: props.n + 1 })}</span>}
      </p>
    </section>
  );
}

// ── criteria ────────────────────────────────────────────────────────────────────────────────────────────────────────

function CriteriaCard(props: { readonly entry: AtlasEntry }) {
  return (
    <section class="at-section at-criteria" aria-labelledby="at-crit">
      <h2 id="at-crit">{ta('criteria')}</h2>
      <table class="at-table">
        <thead>
          <tr>
            <th scope="col">{ta('colItem')}</th>
            <th scope="col">{ta('colValue')}</th>
            <th scope="col">{ta('colSource')}</th>
          </tr>
        </thead>
        <tbody>
          {props.entry.criteria.map((c, i) => (
            <tr key={i}>
              <th scope="row">{lt(c.label)}</th>
              <td class="tabular">{lt(c.value)}</td>
              <td class="at-table__src">{c.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ── practice ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Drill families that train a finding (src/practice `families()`); never throws. */
function familiesFor(id: FindingId): readonly DrillFamily[] {
  try {
    return families().filter((f) => f.findings.includes(id));
  } catch {
    return [];
  }
}

function Practise(props: { readonly id: FindingId }) {
  const fams = familiesFor(props.id);
  return (
    <section class="at-side-card" aria-labelledby="at-pr">
      <h2 id="at-pr">{ta('practise')}</h2>
      {fams.length > 0 ? (
        <ul class="at-links">
          {fams.map((f) => (
            <li key={f.id}>
              <a href={href({ name: 'drill', id: f.id })}>
                <span class="at-links__tag">
                  <Icon name="target" size={15} />
                </span>
                <span>
                  <strong>{lt(f.title)}</strong>
                  <span class="at-links__sub">{lt(f.description)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p class="at-muted">{ta('practiseNone')}</p>
      )}
      <LinkButton href={href({ name: 'practice' })} size="sm" icon="target">
        {ta('practiseAll')}
      </LinkButton>
    </section>
  );
}

// ── Heart Lab ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Link to the Heart Lab scenario that shows this finding (its own engine, own page); nothing when the lab has none. */
function LabLink(props: { readonly id: FindingId }) {
  const to = labHref(props.id);
  if (!to) return null;
  return (
    <section class="at-side-card at-lab" aria-labelledby="at-lab">
      <h2 id="at-lab">{ta('labTitle')}</h2>
      <p class="at-muted">{ta('labBody')}</p>
      <LinkButton href={to} size="sm" icon="heart">
        {ta('labOpen')}
      </LinkButton>
    </section>
  );
}

// ── look-alikes side by side ───────────────────────────────────────────────────────────────────────────────────────

function MimicCompare(props: { readonly id: FindingId; readonly entry: AtlasEntry; readonly leftReq: SynthRequest | null }) {
  const { entry } = props;
  const [sel, setSel] = useState(0);
  const m: MimicSpec = entry.mimics[Math.min(sel, entry.mimics.length - 1)];
  const mEntry = entryOf(m.id);
  const rightReq = useMemo(() => {
    const opts = safeOptions(m.id, mEntry);
    return opts[0] ? exemplarRequest(m.id, opts[0], 0, mEntry) : null;
  }, [m.id, mEntry]);
  const left = useGenerated(props.leftReq);
  const right = useGenerated(rightReq);
  const view = viewFor(m.leads);
  const mName = lt(FINDINGS[m.id].name);

  return (
    <section class="at-section at-mimics" aria-labelledby="at-mim">
      <h2 id="at-mim">{ta('mimics')}</h2>
      <p class="at-muted">{ta('mimicsIntro')}</p>
      <div class="at-chips" role="tablist" aria-label={ta('mimics')}>
        {entry.mimics.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`at-mtab-${x.id}`}
            aria-selected={i === sel}
            aria-controls="at-mpanel"
            class={`at-chip ${i === sel ? 'is-on' : ''}`}
            onClick={() => setSel(i)}
          >
            {lt(FINDINGS[x.id].name)}
          </button>
        ))}
      </div>
      <div class="at-mpanel" id="at-mpanel" role="tabpanel" aria-labelledby={`at-mtab-${m.id}`}>
        <div class="at-discriminator">
          <h3>{ta('tellApart')}</h3>
          <p>{lt(m.discriminator)}</p>
          {m.leads && m.leads.length > 0 && <p class="at-muted">{ta('lookAt', { leads: m.leads.join(', ') })}</p>}
        </div>
        <div class="at-pair">
          <figure class="at-pair__side">
            <figcaption>
              <span class="at-pair__tag">{ta('thisFinding')}</span> {lt(FINDINGS[props.id].name)}
            </figcaption>
            <PairEcg gen={left} hasReq={!!props.leftReq} view={view} leads={m.leads} label={lt(FINDINGS[props.id].name)} />
          </figure>
          <figure class="at-pair__side">
            <figcaption>
              <span class="at-pair__tag at-pair__tag--mimic">{ta('mimics')}</span> {mName}
            </figcaption>
            <PairEcg gen={right} hasReq={!!rightReq} view={view} leads={m.leads} label={mName} />
          </figure>
        </div>
        <LinkButton href={href({ name: 'finding', id: m.id })} size="sm" icon="next">
          {ta('openMimic', { name: mName })}
        </LinkButton>
      </div>
    </section>
  );
}

function PairEcg(props: {
  readonly gen: Generated | null;
  readonly hasReq: boolean;
  readonly view: { layout?: '3x4+1' | 'single'; lead?: Lead };
  readonly leads: readonly Lead[] | undefined;
  readonly label: string;
}) {
  const ecg = props.gen && props.gen.ok ? props.gen.result.ecg : null;
  if (!ecg) {
    return (
      <div class="at-ecgbox at-ecgbox--sm" role="status">
        <Icon name="wave" size={20} />
        <span>{!props.hasReq ? ta('noExemplar') : props.gen && !props.gen.ok ? ta('exemplarError') : ta('generating')}</span>
      </div>
    );
  }
  return (
    <EcgView
      ecg={ecg}
      {...(props.view.layout ? { layout: props.view.layout } : {})}
      {...(props.view.lead ? { lead: props.view.lead } : {})}
      highlightLeads={props.leads}
      toolbar={false}
      ariaLabel={ta('exemplarAria', { name: props.label })}
    />
  );
}

// ── real PTB-XL examples ──────────────────────────────────────────────────────────────────────────────────────────

function RealExamples(props: { readonly id: FindingId }) {
  const all = useMemo(() => {
    try {
      const classes = new Set(SCP_LIST.filter((s) => s.findings.includes(props.id)).map((s) => s.code));
      return rankCases(casesWithFinding(props.id), (cls) => classes.has(cls));
    } catch {
      return [] as RealCase[];
    }
  }, [props.id]);
  const shown = all.slice(0, REAL_SHOWN);
  return (
    <section class="at-section at-real" aria-labelledby="at-real">
      <h2 id="at-real">{ta('real')}</h2>
      {shown.length === 0 ? (
        <p class="at-muted">{ta('realNone')}</p>
      ) : (
        <>
          <p class="at-muted">{ta('realNote')}</p>
          <ul class="at-thumbs">
            {shown.map((c) => (
              <li key={c.id}>
                <CaseThumb c={c} />
              </li>
            ))}
          </ul>
          {all.length > REAL_SHOWN && (
            <p>
              <a href={href({ name: 'cases' })}>{ta('realMore', { n: all.length })}</a>
            </p>
          )}
          <AttributionFooter />
        </>
      )}
    </section>
  );
}

const caseNo = (n: number) => String(n).padStart(3, '0');

function patient(c: RealCase): string {
  const sex = c.sex === 'M' ? ta('sexM') : c.sex === 'F' ? ta('sexF') : ta('sexU');
  const age = c.age != null ? ta('ageY', { n: c.age }) : ta('ageU');
  return ta('patientLine', { sex, age });
}

function CaseThumb(props: { readonly c: RealCase }) {
  const { c } = props;
  const [ecg, setEcg] = useState<Ecg | null>(() => peekRealEcg(c.id));
  useEffect(() => {
    if (ecg) return;
    let alive = true;
    loadRealEcg(c.id)
      .then((e) => {
        if (alive) setEcg(e);
      })
      .catch(() => {
        /* the card still links to the case */
      });
    return () => {
      alive = false;
    };
  }, [c.id]);
  const path = useMemo(() => (ecg ? stripPath(ecg.signal.leads.II, ecg.signal.fs, 1000) : ''), [ecg]);
  const num = caseNo(c.num);
  return (
    <a class="at-thumb" href={href({ name: 'case', id: c.id })} aria-label={`${ta('readCase')} — ${ta('caseNo', { n: num })}, ${patient(c)}`}>
      <svg class="at-thumb__svg" viewBox={`0 0 ${THUMB_W} ${THUMB_H}`} role="img" aria-label={ta('stripAria', { n: num })}>
        <defs>
          <pattern id={`at-gm-${c.id}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M4 0V4H0" class="at-thumb__minor" />
          </pattern>
          <pattern id={`at-gM-${c.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={`url(#at-gm-${c.id})`} />
            <path d="M20 0V20H0" class="at-thumb__major" />
          </pattern>
        </defs>
        <rect width={THUMB_W} height={THUMB_H} class="at-thumb__paper" />
        <rect width={THUMB_W} height={THUMB_H} fill={`url(#at-gM-${c.id})`} />
        {path && <path d={path} class="at-thumb__trace" />}
      </svg>
      <span class="at-thumb__meta">
        <span class="at-thumb__num tabular">{ta('caseNo', { n: num })}</span>
        <span class="at-thumb__who">{patient(c)}</span>
      </span>
      <span class="at-thumb__cta">
        {ta('readCase')}
        <Icon name="next" size={14} />
      </span>
    </a>
  );
}
