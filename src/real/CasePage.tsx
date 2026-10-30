/**
 * #/cases/:ecgId — one real PTB-XL case. Read first, then reveal:
 *   1. the full 12-lead tracing (EcgView with toolbar, calipers, magnifier, crosshair) — the protagonist; a case always
 *      opens on a 12-lead layout (a 'single' / 'strip' setting falls back to 3×4+1), and a tracing already decoded is
 *      shown on the first frame (no placeholder flash on previous / next);
 *   2. "your reading": the default checklist + notes (ReadingPanel), or a replacement plugged into the reading slot
 *      (CasePage `readingSlot` prop, or setCaseReadingSlot() for every case page — see state.ts);
 *   3. "Reveal": the cardiologists' labels, atlas links, comparison and 12SL reference measurements (RevealPanel);
 *   4. previous / next along the list the learner came from, and the dataset attribution.
 */
import { useSignal, type Signal } from '@preact/signals';
import type { ComponentType } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ecg } from '../core/ecg';
import { href } from '../app/router';
import { store, type LayoutId } from '../app/store';
import { EcgView } from '../ecg/index';
import type { CaliperMeasure, EcgViewProps } from '../ecg/api';
import { tc } from '../i18n/common';
import { tr } from '../i18n/real';
import { Badge, Button, Icon, LinkButton } from '../ui/index';
import { AttributionFooter } from './AttributionFooter';
import { canDecodeRealEcg, loadRealEcg, peekRealEcg, prefetchRealEcg } from './bundle';
import { caseLayout, caseNumber, patientLine, SHEET_RATIO } from './format';
import { getCase, getCases, navigationList, neighbours, type RealCase } from './library';
import { EMPTY_READING, loadReading, saveReading, type Reading } from './reading';
import { ReadingPanel } from './ReadingPanel';
import { RevealPanel } from './RevealPanel';
import { caseReadingSlot, filter, markRead, readSet, type CaseReadingSlotProps } from './state';
import './real.css';

export interface CasePageProps {
  readonly id: number;
  /**
   * Replacement for the default reading checklist on this page (e.g. the practice module's structured report form).
   * undefined = use the module-wide slot (setCaseReadingSlot) or the default; null = force the default checklist.
   */
  readonly readingSlot?: ComponentType<CaseReadingSlotProps> | null;
}

export function CasePage(props: CasePageProps) {
  const c = getCase(props.id);
  const slot = props.readingSlot === undefined ? caseReadingSlot.value : props.readingSlot;
  if (!c) {
    return (
      <div class="rl-page">
        <a class="rl-back" href={href({ name: 'cases' })}>
          <Icon name="prev" size={16} />
          {tr('backToLibrary')}
        </a>
        <h1 class="rl-h1">{tr('caseNotFound')}</h1>
        <p>
          <LinkButton href={href({ name: 'cases' })} icon="list">
            {tr('title')}
          </LinkButton>
        </p>
      </div>
    );
  }
  // keyed by case: moving to another case starts with fresh state (reading, caliper, decode)
  return <CaseView key={c.id} c={c} Slot={slot} />;
}

/**
 * Viewer props for a real case, typed against the frozen viewer contract (src/ecg/api.ts): a 12-lead sheet with the
 * toolbar and every measuring tool; speed and gain follow the learner's settings.
 */
function viewerProps(
  ecg: Ecg,
  n: string,
  layout: LayoutId,
  cursor: Signal<number | null>,
  onCaliper: (m: CaliperMeasure) => void,
): EcgViewProps {
  return {
    ecg,
    layout,
    toolbar: true,
    tools: { calipers: true, magnifier: true, crosshair: true },
    cursor,
    onCaliper,
    ariaLabel: tr('ecgAria', { n }),
  };
}

type LoadState = { readonly status: 'loading' } | { readonly status: 'ready'; readonly ecg: Ecg } | { readonly status: 'error' };

function CaseView(props: { readonly c: RealCase; readonly Slot: ComponentType<CaseReadingSlotProps> | null }) {
  const { c, Slot } = props;
  const n = caseNumber(c.num);
  const layout = caseLayout(store.settings.value.viewer.layout);
  const [load, setLoad] = useState<LoadState>(() => {
    const hit = peekRealEcg(c.id);
    return hit ? { status: 'ready', ecg: hit } : { status: 'loading' };
  });
  const [attempt, setAttempt] = useState(0);
  const [reading, setReading] = useState<Reading>(() => loadReading(c.id));
  const [justRevealed, setJustRevealed] = useState(false);
  const [justHidden, setJustHidden] = useState(false);
  const gateRef = useRef<HTMLElement>(null);
  const caliper = useSignal<CaliperMeasure | null>(null);
  const cursor = useSignal<number | null>(null);

  const list = navigationList(getCases(), filter.value, readSet.value, c.id);
  const pos = list.findIndex((x) => x.id === c.id);
  const nb = neighbours(list, c.id);

  useEffect(() => {
    const hit = peekRealEcg(c.id);
    if (hit) {
      setLoad((l) => (l.status === 'ready' && l.ecg === hit ? l : { status: 'ready', ecg: hit }));
      return;
    }
    let alive = true;
    setLoad({ status: 'loading' });
    loadRealEcg(c.id).then(
      (ecg) => alive && setLoad({ status: 'ready', ecg }),
      (err: unknown) => {
        console.error('real-ecg: decode failed', err);
        if (alive) setLoad({ status: 'error' });
      },
    );
    return () => {
      alive = false;
    };
  }, [c.id, attempt]);

  // warm the neighbours once this tracing is on screen
  const prevId = nb?.prev.id;
  const nextId = nb?.next.id;
  useEffect(() => {
    if (load.status !== 'ready') return;
    if (nextId != null) prefetchRealEcg(nextId);
    if (prevId != null) prefetchRealEcg(prevId);
  }, [load.status, prevId, nextId]);

  useEffect(() => {
    saveReading(c.id, reading);
  }, [c.id, reading]);

  const update = useCallback((patch: Partial<Reading>) => setReading((r) => ({ ...r, ...patch })), []);
  const onReveal = useCallback(() => {
    setReading((r) => ({ ...r, revealed: true }));
    setJustRevealed(true);
    setJustHidden(false);
    markRead(c.id);
  }, [c.id]);
  const onHide = useCallback(() => {
    setReading((r) => ({ ...r, revealed: false }));
    setJustRevealed(false);
    setJustHidden(true);
  }, []);
  // the "Hide" button disappears with the answer: keep keyboard focus on the page (the Reveal button that replaces it)
  useEffect(() => {
    if (justHidden && !reading.revealed) gateRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [justHidden, reading.revealed]);
  const onClear = useCallback(() => setReading((r) => ({ ...EMPTY_READING, revealed: r.revealed })), []);

  // The reading changes on every keystroke in the notes; the viewer must not re-render (and redraw) with it. A memoized
  // element is skipped by Preact's diff; the viewer still follows the store (settings, language) through its own signals.
  const onCaliper = useCallback((m: CaliperMeasure) => {
    caliper.value = m;
  }, [caliper]);
  const lang = store.lang.value;
  const ecg = load.status === 'ready' ? load.ecg : null;
  const viewer = useMemo(
    () => (ecg ? <EcgView {...viewerProps(ecg, n, layout, cursor, onCaliper)} /> : null),
    [ecg, n, layout, cursor, onCaliper, lang],
  );

  return (
    <div class="rl-page rl-case">
      <header class="rl-casehead">
        <div class="rl-casehead__title">
          <a class="rl-back" href={href({ name: 'cases' })}>
            <Icon name="prev" size={16} />
            {tr('backToLibrary')}
          </a>
          <h1 class="rl-h1 tabular">{tr('caseNo', { n })}</h1>
          <p class="rl-casehead__who">
            <span>{patientLine(c)}</span>
            {reading.revealed && <Badge tone="info">{tr('revealedBadge')}</Badge>}
          </p>
        </div>
        {nb && (
          <nav class="rl-casenav" aria-label={tr('caseNav')}>
            <a class="ui-btn ui-btn--default ui-btn--sm" href={href({ name: 'case', id: nb.prev.id })} rel="prev">
              <Icon name="prev" />
              <span>{tr('prevCase')}</span>
            </a>
            <span class="rl-casenav__pos tabular">
              <span aria-hidden="true">{tr('position', { i: pos + 1, n: list.length })}</span>
              <span class="rl-sr">{tr('positionAria', { i: pos + 1, n: list.length })}</span>
            </span>
            <a class="ui-btn ui-btn--default ui-btn--sm" href={href({ name: 'case', id: nb.next.id })} rel="next">
              <span>{tr('nextCase')}</span>
              <Icon name="next" />
            </a>
          </nav>
        )}
      </header>

      <section class="rl-ecg" aria-label={tr('ecgSection')}>
        {viewer ?? (
          <div class="rl-ecg__ph" style={{ '--rl-ratio': String(SHEET_RATIO[layout]) }}>
            {/* room for the viewer's toolbar and read-outs, then the paper */}
            <div class="rl-ecg__phbar" aria-hidden="true" />
            <div class="rl-ecg__phpaper" role="status" aria-live="polite">
              {load.status === 'loading' ? (
                <span class="rl-muted">{tr('loadingEcg')}</span>
              ) : canDecodeRealEcg() ? (
                <span class="rl-ecg__err">
                  <span>{tr('loadError')}</span>
                  <Button size="sm" icon="refresh" onClick={() => setAttempt((a) => a + 1)}>
                    {tc('retry')}
                  </Button>
                </span>
              ) : (
                <span class="rl-ecg__err">{tr('loadErrorUnsupported')}</span>
              )}
            </div>
          </div>
        )}
      </section>

      <div class="rl-work" aria-label={tr('readingSection')} role="group">
        <div class="rl-work__reading">
          {Slot ? (
            <Slot
              caseMeta={c}
              ecg={load.status === 'ready' ? load.ecg : null}
              revealed={reading.revealed}
              onReveal={onReveal}
              caliper={caliper}
            />
          ) : (
            <ReadingPanel caseId={c.id} reading={reading} update={update} onClear={onClear} caliper={caliper} />
          )}
        </div>
        <div class="rl-work__answer">
          {reading.revealed ? (
            <RevealPanel c={c} reading={Slot ? null : reading} onHide={onHide} focusOnMount={justRevealed} />
          ) : (
            <section class="rl-panel rl-gate" aria-labelledby={`rl-gate-${c.id}`} ref={gateRef}>
              <h2 class="rl-h2" id={`rl-gate-${c.id}`}>
                {tr('answerTitle')}
              </h2>
              <p class="rl-muted">{tr('revealHint')}</p>
              <Button tone="primary" icon="eye" onClick={onReveal}>
                {tr('reveal')}
              </Button>
            </section>
          )}
        </div>
      </div>

      <AttributionFooter ecgId={c.id} />
    </div>
  );
}
