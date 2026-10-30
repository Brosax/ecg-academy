/**
 * #/tools[/:tab] — reference tools used while reading: the systematic reading checklist (printable), adult normal values
 * (sex-specific QTc and ST-elevation thresholds, brief paediatric notes), calculators (rate, QTc, axis — the shared
 * figures) and a trilingual glossary. Tabs are part of the route so each tool has a link.
 */
import { signal } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import { lessonTitle } from '../atlas';
import { go, href } from '../app/router';
import { store } from '../app/store';
import { FINDINGS } from '../core/findings';
import { LANGS, pick, type Lang } from '../core/l10n';
import { Figure } from '../figures';
import { lt } from '../i18n';
import { tt } from '../i18n/tools';
import { Button, Icon, Segmented, Tabs } from '../ui';
import { CHECKLIST, type StepId } from './checklist';
import { buildGlossary, searchGlossary, type GlossaryKind, type GlossaryRow } from './glossary';
import { ADULT_NORMALS, NORMALS_SOURCES, PAEDIATRIC_NOTES, QTC_BY_SEX, QTC_SOURCE, ST_SOURCE, ST_THRESHOLDS } from './normals';
import { TOOL_TABS, toolTab, type ToolTab } from './tabs';
import './tools.css';

const TAB_LABEL = {
  checklist: 'tabChecklist',
  values: 'tabValues',
  calculators: 'tabCalculators',
  glossary: 'tabGlossary',
} as const satisfies Record<ToolTab, Parameters<typeof tt>[0]>;

export function ToolsPage(props: { readonly tab?: string }) {
  const tab = toolTab(props.tab);
  return (
    <div class="tl-page">
      <header class="tl-head">
        <h1>{tt('title')}</h1>
        <p class="tl-muted">{tt('intro')}</p>
      </header>
      <Tabs<ToolTab>
        value={tab}
        ariaLabel={tt('tabsLabel')}
        tabs={TOOL_TABS.map((id) => ({ id, label: tt(TAB_LABEL[id]) }))}
        onChange={(id) => go({ name: 'tools', tab: id })}
      />
      <div class="tl-panel" role="tabpanel" aria-label={tt(TAB_LABEL[tab])}>
        {tab === 'checklist' && <Checklist />}
        {tab === 'values' && <NormalValues />}
        {tab === 'calculators' && <Calculators />}
        {tab === 'glossary' && <Glossary />}
      </div>
    </div>
  );
}

// ── checklist ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Ticked steps (kept while the app is open; a fresh visit starts clean). */
const ticked = signal<ReadonlySet<StepId>>(new Set());

function toggle(id: StepId): void {
  const s = new Set(ticked.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  ticked.value = s;
}

function Checklist() {
  const done = ticked.value;
  return (
    <section class="tl-print tl-checklist" aria-labelledby="tl-cl">
      <div class="tl-sectionhead">
        <div>
          <h2 id="tl-cl">{tt('clTitle')}</h2>
          <p class="tl-muted">{tt('clIntro')}</p>
        </div>
        <div class="tl-actions tl-noprint">
          <span class="tl-muted tabular tl-progress" role="status" aria-live="polite">
            {tt('clProgress', { n: done.size, total: CHECKLIST.length })}
          </span>
          <Button size="sm" tone="ghost" icon="refresh" onClick={() => (ticked.value = new Set())} disabled={done.size === 0}>
            {tt('clReset')}
          </Button>
          <Button size="sm" icon="list" onClick={() => globalThis.print?.()}>
            {tt('clPrint')}
          </Button>
        </div>
      </div>
      <ol class="tl-steps">
        {CHECKLIST.map((s, i) => {
          const on = done.has(s.id);
          return (
            <li key={s.id} class={`tl-step ${on ? 'is-done' : ''}`}>
              <label class="tl-step__head">
                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} aria-label={tt('clDone', { step: lt(s.title) })} />
                <span class="tl-step__num tabular">{tt('clStep', { n: i + 1 })}</span>
                <span class="tl-step__title">{lt(s.title)}</span>
              </label>
              <ul class="tl-step__check">
                {s.check.map((c, j) => (
                  <li key={j}>{lt(c)}</li>
                ))}
              </ul>
              {(s.normal || s.flags) && (
                <div class="tl-step__facts">
                  {s.normal && (
                    <p class="tl-step__normal">
                      <strong>{tt('clNormal')}:</strong> {lt(s.normal)}
                    </p>
                  )}
                  {s.flags && (
                    <div class="tl-step__flags">
                      <strong>{tt('clFlags')}:</strong>
                      <ul>
                        {s.flags.map((f, j) => (
                          <li key={j}>{lt(f)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {s.lessons.length > 0 && (
                <p class="tl-step__lessons tl-noprint">
                  <span class="tl-muted">{tt('clLessons')}:</span>
                  {s.lessons.map((id) => {
                    const t = lessonTitle(id);
                    return (
                      <a key={id} href={href({ name: 'lesson', id })} title={t ? lt(t) : undefined}>
                        {id.toUpperCase()}
                      </a>
                    );
                  })}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p class="tl-printonly tl-muted">{tt('clPrintFooter')}</p>
    </section>
  );
}

// ── normal values ───────────────────────────────────────────────────────────────────────────────────────────────────

function NormalValues() {
  return (
    <div class="tl-stack">
      <section class="tl-section" aria-labelledby="tl-nv">
        <h2 id="tl-nv">{tt('nvTitle')}</h2>
        <p class="tl-muted">{tt('nvIntro')}</p>
        <div class="tl-scroll">
          <table class="tl-table">
            <thead>
              <tr>
                <th scope="col">{tt('nvColItem')}</th>
                <th scope="col">{tt('nvColNormal')}</th>
                <th scope="col">{tt('nvColAbnormal')}</th>
                <th scope="col">{tt('nvColSource')}</th>
              </tr>
            </thead>
            <tbody>
              {ADULT_NORMALS.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{lt(r.item)}</th>
                  <td class="tabular">{lt(r.normal)}</td>
                  <td class="tabular">{lt(r.abnormal)}</td>
                  <td class="tl-src">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div class="tl-two">
        <section class="tl-section" aria-labelledby="tl-qtc">
          <h2 id="tl-qtc">{tt('qtcTitle')}</h2>
          <div class="tl-scroll">
            <table class="tl-table tl-table--compact">
              <thead>
                <tr>
                  <th scope="col">{tt('qtcColLevel')}</th>
                  <th scope="col">{tt('qtcColMen')}</th>
                  <th scope="col">{tt('qtcColWomen')}</th>
                </tr>
              </thead>
              <tbody>
                {QTC_BY_SEX.map((r, i) => (
                  <tr key={i}>
                    <th scope="row">{lt(r.level)}</th>
                    <td class="tabular">{r.men}</td>
                    <td class="tabular">{r.women}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="tl-src">{QTC_SOURCE}</p>
        </section>

        <section class="tl-section" aria-labelledby="tl-st">
          <h2 id="tl-st">{tt('stTitle')}</h2>
          <p class="tl-muted">{tt('stIntro')}</p>
          <div class="tl-scroll">
            <table class="tl-table tl-table--compact">
              <thead>
                <tr>
                  <th scope="col">{tt('stColLeads')}</th>
                  <th scope="col">{tt('stColMenOld')}</th>
                  <th scope="col">{tt('stColMenYoung')}</th>
                  <th scope="col">{tt('stColWomen')}</th>
                </tr>
              </thead>
              <tbody>
                {ST_THRESHOLDS.map((r, i) => (
                  <tr key={i}>
                    <th scope="row">{lt(r.leads)}</th>
                    <td class="tabular">{lt(r.menOld)}</td>
                    <td class="tabular">{lt(r.menYoung)}</td>
                    <td class="tabular">{lt(r.women)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="tl-src">{ST_SOURCE}</p>
        </section>
      </div>

      <section class="tl-section" aria-labelledby="tl-paed">
        <h2 id="tl-paed">{tt('paedTitle')}</h2>
        <p class="tl-muted">{tt('paedIntro')}</p>
        <ul class="tl-notes">
          {PAEDIATRIC_NOTES.map((n, i) => (
            <li key={i}>
              {lt(n.text)} <span class="tl-src">({n.source})</span>
            </li>
          ))}
        </ul>
      </section>

      <section class="tl-section tl-sources" aria-labelledby="tl-nvsrc">
        <h2 id="tl-nvsrc">{tt('sourcesTitle')}</h2>
        <ol>
          {NORMALS_SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// ── calculators ─────────────────────────────────────────────────────────────────────────────────────────────────────

function Calculators() {
  return (
    <div class="tl-stack">
      <p class="tl-muted">{tt('calcIntro')}</p>
      <section class="tl-section tl-calc" aria-labelledby="tl-c-rate">
        <h2 id="tl-c-rate">{tt('calcRate')}</h2>
        <p class="tl-muted">{tt('calcRateHint')}</p>
        <Figure id="rate-ruler" />
      </section>
      <section class="tl-section tl-calc" aria-labelledby="tl-c-qtc">
        <h2 id="tl-c-qtc">{tt('calcQtc')}</h2>
        <p class="tl-muted">{tt('calcQtcHint')}</p>
        <Figure id="qtc-calculator" />
      </section>
      <section class="tl-section tl-calc" aria-labelledby="tl-c-axis">
        <h2 id="tl-c-axis">{tt('calcAxis')}</h2>
        <p class="tl-muted">{tt('calcAxisHint')}</p>
        <Figure id="axis-calculator" />
      </section>
    </div>
  );
}

// ── glossary ────────────────────────────────────────────────────────────────────────────────────────────────────────

const glossaryQuery = signal('');
const glossaryKind = signal<GlossaryKind | 'all'>('all');

const COLLATOR_LOCALE: Readonly<Record<Lang, string>> = { zh: 'zh-CN-u-co-pinyin', en: 'en', es: 'es' };

function Glossary() {
  const lang = store.lang.value;
  const rows = useMemo(() => buildGlossary(), []);
  const q = glossaryQuery.value;
  const kind = glossaryKind.value;
  const shown = useMemo(() => {
    const col = new Intl.Collator(COLLATOR_LOCALE[lang], { sensitivity: 'base' });
    return searchGlossary(rows, q)
      .filter((r) => kind === 'all' || r.kind === kind)
      .sort((a, b) => col.compare(pick(a.term, lang), pick(b.term, lang)));
  }, [rows, q, kind, lang]);

  return (
    <section class="tl-section tl-glossary" aria-labelledby="tl-gl">
      <h2 id="tl-gl">{tt('glTitle')}</h2>
      <p class="tl-muted">{tt('glIntro')}</p>
      <div class="tl-glbar">
        <label class="tl-search">
          <span class="tl-search__label">{tt('glSearch')}</span>
          <span class="tl-search__box">
            <Icon name="search" />
            <input type="search" value={q} placeholder={tt('glSearchPh')} onInput={(e) => (glossaryQuery.value = e.currentTarget.value)} autoComplete="off" spellcheck={false} />
          </span>
        </label>
        <Segmented<GlossaryKind | 'all'>
          size="sm"
          ariaLabel={tt('glFilterLabel')}
          value={kind}
          onChange={(v) => (glossaryKind.value = v)}
          options={[
            { value: 'all', label: tt('glFilterAll') },
            { value: 'finding', label: tt('glFilterFindings') },
            { value: 'term', label: tt('glFilterTerms') },
          ]}
        />
        <span class="tl-muted tabular tl-count" role="status" aria-live="polite">
          {tt('glCount', { n: shown.length })}
        </span>
      </div>
      {shown.length === 0 ? (
        <p class="tl-empty">{tt('glNone')}</p>
      ) : (
        <div class="tl-scroll">
          <table class="tl-table tl-gltable">
            <thead>
              <tr>
                {LANGS.map((l) => (
                  <th key={l} scope="col" class={l === lang ? 'is-current' : ''} lang={l === 'zh' ? 'zh-CN' : l}>
                    {tt(l === 'zh' ? 'glColZh' : l === 'en' ? 'glColEn' : 'glColEs')}
                  </th>
                ))}
                <th scope="col" class="tl-gltable__atlas">
                  {tt('glColAtlas')}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <GlossaryLine key={r.key} r={r} lang={lang} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function GlossaryLine(props: { readonly r: GlossaryRow; readonly lang: Lang }) {
  const { r, lang } = props;
  const extra = r.replaces || r.note;
  return (
    <tr>
      {LANGS.map((l) => (
        <td key={l} class={l === lang ? 'is-current' : ''} lang={l === 'zh' ? 'zh-CN' : l}>
          <span class="tl-term">{r.term[l]}</span>
          {l === lang && extra && (
            <span class="tl-term__extra">
              {r.replaces && <span>{tt('glReplaces', { old: LANGS.map((x) => r.replaces?.[x] ?? '').join(' / ') })}</span>}
              {r.note && <span>{lt(r.note)}</span>}
            </span>
          )}
        </td>
      ))}
      <td class="tl-gltable__atlas">
        {r.finding && (
          <a href={href({ name: 'finding', id: r.finding })} aria-label={tt('glOpenAtlas', { name: pick(FINDINGS[r.finding].name, lang) })}>
            <Icon name="next" size={16} />
          </a>
        )}
      </td>
    </tr>
  );
}
