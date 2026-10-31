/**
 * Renderers for every lesson block kind (src/course/api.ts Block, docs/PLAN.md §4). One block is shown at a time by
 * the lesson player; each renderer keeps its own state (keyed by step, so a revisit starts fresh — except the hook's
 * committed answer, remembered for the session).
 *
 * Teaching rules carried by the UI: the learner commits before any reveal (hook, contrast, real cases); the ECG comes
 * first and stays the largest thing on screen; feedback is immediate (check, drill); real tracings carry their credit.
 */
import { useSignal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { href } from '../app/router';
import { store, type LayoutId } from '../app/store';
import type { EcgTruth } from '../core/ecg';
import { FINDINGS } from '../core/findings';
import type { L10n } from '../core/l10n';
import { hashString } from '../core/rng';
import { Figure, HEART_PHASES, PHASE_LABEL_KEY, phaseBeats, SceneTransport, tsn, useScene, type Beat, type FigureProps, type SceneState } from '../figures';
import { Heart3D } from '../heart3d';
import { lt } from '../i18n';
import { tc } from '../i18n/common';
import { tco } from '../i18n/course';
import type { DrillRunnerProps, Item } from '../practice/api';
import type { DialId, DialRange, SynthResult } from '../synth';
import { Badge, Button, Feedback, Icon, LinkButton } from '../ui';
import type { AutoMark, Block, Lesson, LessonMark } from './api';
import {
  drillMastery,
  drillRunner,
  generateItem,
  itemPlayer,
  progressTick,
  realCase,
  scenarioDef,
  scheduleReview,
  synthesize,
} from './deps';
import { EcgDisplay, EcgPanel, EcgPlaceholder, useEcg } from './EcgFrame';
import { DIAL_META, dialStep, pickDials, realisedDials, startDials } from './live';
import { defaultBeat } from './marks';
import { labLinks } from './lab';
import { Markup } from './LessonText';
import { reviewKeys } from './stages';

type BlockOf<K extends Block['kind']> = Extract<Block, { readonly kind: K }>;
type CourseKey = Parameters<typeof tco>[0];

// ── labels ────────────────────────────────────────────────────────────────────────────────────────────────────────

const KIND_KEY: Readonly<Record<Block['kind'], CourseKey>> = {
  hook: 'kindHook',
  text: 'kindText',
  ecg: 'kindEcg',
  live: 'kindLive',
  figure: 'kindFigure',
  heart: 'kindHeart',
  criteria: 'kindCriteria',
  worked: 'kindWorked',
  contrast: 'kindContrast',
  check: 'kindCheck',
  drill: 'kindDrill',
  real: 'kindReal',
  pitfalls: 'kindPitfalls',
  summary: 'kindSummary',
};

export function blockKindLabel(kind: Block['kind']): string {
  return tco(KIND_KEY[kind]);
}

/** The block's own title, if its kind has one. */
export function blockTitle(b: Block): L10n | null {
  switch (b.kind) {
    case 'text':
      return b.title ?? null;
    case 'criteria':
    case 'worked':
    case 'contrast':
      return b.title;
    default:
      return null;
  }
}

/** "Worked example · Measuring PR" (plain text, for headings and announcements). */
export function blockLabel(b: Block): string {
  const t = blockTitle(b);
  return t ? `${blockKindLabel(b.kind)} · ${lt(t)}` : blockKindLabel(b.kind);
}

const pct = (x: number) => Math.round(x * 100);
const commaIfEs = (s: string) => (store.lang.value === 'es' ? s.replace('.', ',') : s);

function Caption(props: { readonly text?: L10n }) {
  if (!props.text) return null;
  return (
    <figcaption class="crs-caption">
      <Markup text={lt(props.text)} />
    </figcaption>
  );
}

function Unavailable(props: { readonly children: ComponentChildren }) {
  return (
    <div class="crs-unavail" role="status">
      <Icon name="info" />
      <span>{props.children}</span>
    </div>
  );
}

// ── the switch ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface BlockViewProps {
  readonly block: Block;
  readonly lesson: Lesson;
  /** 0-based block index */
  readonly index: number;
}

export function BlockView(props: BlockViewProps) {
  const b = props.block;
  const key = `${props.lesson.id}:${props.index}`;
  switch (b.kind) {
    case 'hook':
      return <HookBlock block={b} stateKey={key} />;
    case 'text':
      return <Markup text={lt(b.body)} class="crs-text" />;
    case 'ecg':
      return (
        <figure class="crs-fig">
          <EcgPanel source={b.ecg} view={b.view} marks={b.marks} />
          <Caption text={b.caption} />
        </figure>
      );
    case 'live':
      return <LiveBlock block={b} />;
    case 'figure':
      return <FigureBlock block={b} />;
    case 'heart':
      return <HeartBlock block={b} />;
    case 'criteria':
      return <CriteriaCard items={b.items} source={b.source} />;
    case 'worked':
      return <WorkedBlock block={b} />;
    case 'contrast':
      return <ContrastBlock block={b} />;
    case 'check':
      return <CheckBlock block={b} />;
    case 'drill':
      return <DrillBlock block={b} seedKey={key} />;
    case 'real':
      return <RealBlock block={b} />;
    case 'pitfalls':
      return (
        <ul class="crs-pitfalls">
          {b.items.map((it, i) => (
            <li key={i}>
              <span class="crs-pitfalls__icon" aria-hidden="true">
                <Icon name="flag" />
              </span>
              <Markup text={lt(it)} />
            </li>
          ))}
        </ul>
      );
    case 'summary':
      return <SummaryBlock block={b} lesson={props.lesson} />;
  }
}

// ── hook: think first, then reveal (no typing) ─────────────────────────────────────────────────────────────────────

/** Hooks already revealed in this session. */
const hookMemory = new Set<string>();

function HookBlock(props: { readonly block: BlockOf<'hook'>; readonly stateKey: string }) {
  const b = props.block;
  const [shown, setShown] = useState(hookMemory.has(props.stateKey));
  const reveal = () => {
    hookMemory.add(props.stateKey);
    setShown(true);
  };
  return (
    <div class="crs-hook">
      <div class="crs-hook__q">
        <Markup text={lt(b.question)} />
      </div>
      <EcgPanel source={b.ecg} view={b.view} />
      <div class="crs-hook__panel">
        {!shown ? (
          <div class="crs-row">
            <Button tone="primary" icon="check" onClick={reveal}>
              {tco('hookCommit')}
            </Button>
            <span class="crs-hint">{tco('hookCommitFirst')}</span>
          </div>
        ) : (
          <div class="crs-hook__reveal">
            <Feedback tone="info" title={tco('hookRevealTitle')}>
              <Markup text={lt(b.reveal)} />
            </Feedback>
          </div>
        )}
      </div>
    </div>
  );
}

// ── live: a synthetic ECG with dials ──────────────────────────────────────────────────────────────────────────────

const DIAL_KEY: Readonly<Record<DialId, CourseKey>> = {
  rate: 'dialRate',
  pr: 'dialPr',
  qrs: 'dialQrs',
  qtc: 'dialQtc',
  axis: 'dialAxis',
  pAxis: 'dialPAxis',
  st: 'dialSt',
  tAmp: 'dialTAmp',
  voltage: 'dialVoltage',
  hrv: 'dialHrv',
  conductionRatio: 'dialConductionRatio',
  ventricularResponse: 'dialVentricularResponse',
  fCoarseness: 'dialFCoarseness',
  stage: 'dialStage',
  site: 'dialSite',
  noise: 'dialNoise',
};

function fmtDial(id: DialId, v: number): string {
  const m = DIAL_META[id];
  const num = commaIfEs(v.toFixed(m.digits));
  if (m.unit === 'bpm') return `${num} ${tc('bpm')}`;
  if (m.unit === ':1') return `${num}:1`;
  if (m.unit === '°') return `${num}°`;
  if (m.unit === '×') return `×${num}`;
  return m.unit ? `${num} ${m.unit}` : num;
}

type LiveState = { readonly status: 'loading' } | { readonly status: 'ready'; readonly res: SynthResult } | { readonly status: 'error' };

function LiveBlock(props: { readonly block: BlockOf<'live'> }) {
  const b = props.block;
  const sc = scenarioDef(b.scenario);
  const [state, setState] = useState<LiveState>({ status: 'loading' });
  /** slider positions; the tracing on screen is always generated with exactly these values (live.ts) */
  const [values, setValues] = useState<Partial<Record<DialId, number>> | null>(null);
  /** dials the engine realises for this scenario (the others are not offered) */
  const [active, setActive] = useState<readonly DialId[]>([]);
  /** a dial moved and the tracing is being regenerated (read-outs show the requested value meanwhile) */
  const [pending, setPending] = useState(false);
  const initial = useRef<Partial<Record<DialId, number>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const baseId = useId();

  const run = (vals: Partial<Record<DialId, number>>): SynthResult | null => {
    try {
      return synthesize({ scenario: b.scenario, variant: b.variant, seed: b.seed, dials: vals });
    } catch (e) {
      console.warn('course: live ECG not available', b.scenario, e);
      return null;
    }
  };

  // first tracing: generated WITH the start values, so every realised dial is reported in `applied`
  useEffect(() => {
    const t = setTimeout(() => {
      if (!sc) {
        setState({ status: 'error' });
        return;
      }
      const ids = b.dials.map((d) => d.id);
      const start = startDials(sc, b.variant, ids);
      const res = run(start);
      if (!res) {
        setState({ status: 'error' });
        return;
      }
      const realised = realisedDials(ids, res.applied);
      const missing = ids.filter((id) => !realised.includes(id));
      if (missing.length) console.warn(`course: live block on "${b.scenario}": dial(s) ${missing.join(', ')} not realised by the engine — not offered`);
      const vals = pickDials(start, realised);
      initial.current = vals;
      setActive(realised);
      setValues(vals);
      setState({ status: 'ready', res });
    }, 0);
    return () => clearTimeout(t);
  }, [b]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (vals: Partial<Record<DialId, number>>) => {
    setValues(vals);
    setPending(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const res = run(vals);
      // a failed regeneration keeps the last good tracing on screen
      setState((s) => (res ? { status: 'ready', res } : s.status === 'ready' ? s : { status: 'error' }));
      setPending(false);
    }, 80);
  };

  return (
    <figure class="crs-fig crs-live">
      {state.status === 'ready' ? (
        <EcgDisplay ecg={state.res.ecg} view={b.view} marks={b.marks} />
      ) : (
        <EcgPlaceholder layout={b.view?.layout} status={state.status} />
      )}
      {sc && values && active.length > 0 && (
        <fieldset class="crs-dials">
          <legend class="crs-label">{tco('liveDials')}</legend>
          {b.dials.filter((d) => active.includes(d.id)).map((d) => {
            const r = sc.dials[d.id] as DialRange;
            const v = values[d.id] ?? r.min;
            const applied = state.status === 'ready' && !pending ? state.res.applied[d.id] : undefined;
            const id = `${baseId}-${d.id}`;
            const step = dialStep(d.id, r);
            const off = applied !== undefined && Math.abs(applied - v) > step / 2;
            return (
              <div class="crs-dial" key={d.id}>
                <label class="crs-dial__label" for={id}>
                  {d.label ? lt(d.label) : tco(DIAL_KEY[d.id])}
                </label>
                <input
                  id={id}
                  class="crs-dial__range"
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={step}
                  value={v}
                  aria-valuetext={fmtDial(d.id, v)}
                  onInput={(e) => change({ ...values, [d.id]: Number(e.currentTarget.value) })}
                />
                <output class="crs-dial__out tabular" for={id} title={tco('liveApplied')}>
                  {applied !== undefined ? fmtDial(d.id, applied) : fmtDial(d.id, v)}
                  <span class="crs-dial__set">{off ? tco('liveSet', { v: fmtDial(d.id, v) }) : ''}</span>
                </output>
              </div>
            );
          })}
          <div class="crs-row crs-dials__foot">
            <span class="crs-hint">{tco('liveApplied')}</span>
            <Button size="sm" tone="ghost" icon="refresh" onClick={() => change({ ...initial.current })}>
              {tco('liveReset')}
            </Button>
          </div>
        </fieldset>
      )}
      <Caption text={b.caption} />
    </figure>
  );
}

// ── figure (+ optional ECG on a shared cursor) ────────────────────────────────────────────────────────────────────

function FigureBlock(props: { readonly block: BlockOf<'figure'> }) {
  const b = props.block;
  const cursor = useSignal<number | null>(null);
  const { state, retry } = useEcg(b.ecg);
  const ecg = state.status === 'ready' ? state.ecg : undefined;
  const fig = { ...b.figure, cursor, ...(ecg ? { ecg } : {}) } as FigureProps;
  return (
    <figure class="crs-fig">
      <div class="crs-figure">
        <Figure {...fig} />
      </div>
      {b.ecg &&
        (ecg ? (
          <EcgDisplay ecg={ecg} cursor={cursor} />
        ) : (
          <EcgPlaceholder status={state.status === 'error' ? 'error' : 'loading'} real={b.ecg.kind === 'real'} onRetry={retry} />
        ))}
      <Caption text={b.caption} />
    </figure>
  );
}

// ── 3D heart following the ECG cursor ─────────────────────────────────────────────────────────────────────────────
//
// Spec docs/design/f-explainers.md §3: the shared cursor is the one clock (the heart reads it, the strip draws it);
// useScene owns play-once / scrub / prev-next over one beat in slow motion, landing on phase middles (a phase end is
// ambiguous in 3D). The phase sentence is Heart3D's own fixed .h3d__phase box (no second narration box); per-phase
// emphasis goes on the ECG as one AutoMark, never on the heart (view.ts turns the camera on emphasis changes).

/** Slow-motion factor of "play one beat" (one beat of ≈ 0.6 s takes ≈ 3 s). */
const SLOW_MOTION = 5;

type HeartPhaseId = (typeof HEART_PHASES)[number]['id'];

/** The ECG region each heart phase draws (the sinus node draws nothing). */
export const HEART_PHASE_AUTO: Readonly<Record<HeartPhaseId, AutoMark['auto'] | null>> = {
  sa: null,
  p: 'p',
  pr: 'pr-segment',
  qrs: 'qrs',
  st: 'st',
  t: 't',
};

/** The one mark of a phase on lead II of beat k (undefined for the sinus node or no phase). Pure. */
export function heartPhaseMarks(id: HeartPhaseId | '', beat: number): readonly LessonMark[] | undefined {
  const auto = id === '' ? null : HEART_PHASE_AUTO[id];
  return auto ? [{ auto, lead: 'II', beat, color: 'highlight' }] : undefined;
}

/**
 * Where prev / next / the phase bar land (p): the middle of phase i, except that the T phase is measured to the end of
 * the T wave (tOff), not to the window end (tOff + 60) — past tOff the heart has recovered and would say "at rest"
 * while the bar says "T wave". Pure.
 */
export function heartPhaseTarget(beats: readonly Beat[], window: readonly [number, number] | null, i: number, tOffMs: number): number {
  if (beats.length === 0) return 0;
  const b = beats[Math.min(beats.length - 1, Math.max(0, Math.round(i)))];
  const span = window ? window[1] - window[0] : 0;
  const pOff = window && span > 0 ? (tOffMs - window[0]) / span : 1;
  const to = Math.max(b.from, Math.min(b.to, pOff));
  return (b.from + to) / 2;
}

/** The phase whose wave the pen is drawing at ECG time tMs: none for the sinus node and none after the T wave. Pure. */
export function heartMarkPhase(id: HeartPhaseId | '', tMs: number | null, tOffMs: number): HeartPhaseId | '' {
  if (id === 'sa' || (id === 't' && tMs !== null && tMs > tOffMs)) return '';
  return id;
}

/** The Heart Lab link of an ECG: its first finding the lab can show, preferring one that is not just the rhythm. Pure. */
export function heartLabHref(truth: Pick<EcgTruth, 'rhythm' | 'findings'> | null | undefined, links: typeof labLinks = labLinks): string | null {
  if (!truth) return null;
  const all = links(truth.findings);
  return (all.find((x) => x.finding !== truth.rhythm) ?? all[0])?.href ?? null;
}

function HeartBlock(props: { readonly block: BlockOf<'heart'> }) {
  const b = props.block;
  const cursor = useSignal<number | null>(null);
  const side = useRef<HTMLDivElement>(null);
  const { state, retry } = useEcg(b.ecg);
  const ecg = state.status === 'ready' ? state.ecg : null;
  const truth = ecg?.truth;
  const k = ecg && truth ? defaultBeat(truth, ecg.signal.durationMs) : null;
  // window = [pOn − 40, tOff + 60], ×5, clamped to 1.5–6 s (anchorBeats); one identity per ECG
  const timeline = useMemo(() => {
    if (!truth || k === null) return null;
    try {
      return phaseBeats(HEART_PHASES, truth.beats[k], SLOW_MOTION);
    } catch {
      return null; // fiducials out of order (anchorBeats throws): the heart still follows clicks on the ECG
    }
  }, [truth, k]);
  const scene = useScene<HeartPhaseId>({ timeline, autoplay: false, seekTo: 'middle', cursor, target: side });
  const tOff = truth && k !== null ? truth.beats[k].tOff : 0;
  const seekPhase = (i: number) => scene.seek(heartPhaseTarget(scene.beats, scene.window, i, tOff));
  const qrs = scene.beats.findIndex((x) => x.id === 'qrs');
  // reduced motion: the cursor goes straight to the middle of the QRS; otherwise the beat plays once and holds
  const playOne = () => (scene.reduced ? seekPhase(qrs) : scene.replay());
  const transport: SceneState<HeartPhaseId> = {
    ...scene,
    replay: playOne,
    seekBeat: seekPhase,
    prev: () => seekPhase(scene.i - 1),
    next: () => seekPhase(scene.i + 1),
    prevBeat: () => seekPhase(scene.i - 1),
    nextBeat: () => seekPhase(scene.i + 1),
  };
  // one mark, whose identity changes only at phase boundaries → EcgDisplay re-resolves ≈ 6 times per play, never per frame
  const tNow = scene.window ? scene.window[0] + (scene.window[1] - scene.window[0]) * scene.p : null;
  const markId = heartMarkPhase(scene.id, tNow, tOff);
  const marks = useMemo(() => (k === null ? undefined : heartPhaseMarks(markId, k)), [markId, k]);
  const lab = useMemo(() => heartLabHref(truth), [truth]);

  return (
    <figure class="crs-fig">
      <div class="crs-heart">
        <div class="crs-heart__ecg">
          {ecg ? (
            <EcgDisplay ecg={ecg} cursor={cursor} marks={marks} />
          ) : (
            <EcgPlaceholder status={state.status === 'error' ? 'error' : 'loading'} real={b.ecg.kind === 'real'} onRetry={retry} />
          )}
        </div>
        <div class="crs-heart__side" ref={side}>
          <Heart3D regions={ecg?.regions ?? null} cursor={cursor} emphasize={b.emphasize} showConduction={b.showConduction} labels size={260} />
          <Button size="sm" icon="play" onClick={playOne} disabled={!scene.ready || scene.playing}>
            {tco('playBeat')}
          </Button>
          {lab && (
            <LinkButton size="sm" tone="ghost" icon="heart" href={lab}>
              {tco('heartLabBeat')}
            </LinkButton>
          )}
        </div>
        <div class="crs-heart__transport">
          <SceneTransport scene={transport} beatLabel={(id) => tsn(PHASE_LABEL_KEY[id])} slow={SLOW_MOTION} playBeat={false} />
        </div>
      </div>
      <Caption text={b.caption} />
    </figure>
  );
}

// ── criteria card (also usable by the atlas) ──────────────────────────────────────────────────────────────────────

export function CriteriaCard(props: {
  readonly title?: L10n;
  readonly items: readonly { readonly label: L10n; readonly value: L10n }[];
  readonly source?: string;
}) {
  return (
    <section class="crs-criteria">
      {props.title && <h3 class="crs-criteria__title">{lt(props.title)}</h3>}
      <dl class="crs-criteria__list">
        {props.items.map((it, i) => (
          <div class="crs-criteria__row" key={i}>
            <dt>
              <Markup text={lt(it.label)} />
            </dt>
            <dd>
              <Markup text={lt(it.value)} />
            </dd>
          </div>
        ))}
      </dl>
      {props.source && <p class="crs-source">{tco('criteriaSource', { source: props.source })}</p>}
    </section>
  );
}

// ── worked example: the same ECG, marks change step by step ───────────────────────────────────────────────────────

function WorkedBlock(props: { readonly block: BlockOf<'worked'> }) {
  const b = props.block;
  const [k, setK] = useState(0);
  const n = b.steps.length;
  const step = b.steps[Math.min(k, n - 1)];
  const view = step.view ?? b.view;
  const listId = useId();
  return (
    <div class="crs-worked">
      <EcgPanel source={b.ecg} view={view} marks={step.marks} highlightLeads={step.highlightLeads ?? view?.highlightLeads} />
      <div class="crs-worked__grid">
        <ol class="crs-worked__steps" id={listId} aria-label={tco('workedStepsAria')}>
          {b.steps.map((s, i) => (
            <li key={i}>
              <button type="button" class={`crs-worked__step${i === k ? ' is-on' : ''}${i < k ? ' is-seen' : ''}`} aria-current={i === k ? 'step' : undefined} onClick={() => setK(i)}>
                <span class="crs-worked__n tabular">{i + 1}</span>
                <span>{lt(s.title)}</span>
              </button>
            </li>
          ))}
        </ol>
        <div class="crs-worked__body">
          <p class="crs-worked__count tabular">{tco('workedStepOf', { i: k + 1, n })}</p>
          <div aria-live="polite">
            <h3 class="crs-worked__title">{lt(step.title)}</h3>
            <Markup text={lt(step.body)} />
          </div>
          <div class="crs-row">
            <Button size="sm" icon="prev" disabled={k === 0} onClick={() => setK(k - 1)}>
              {tco('workedPrev')}
            </Button>
            <Button size="sm" tone={k < n - 1 ? 'primary' : 'default'} disabled={k >= n - 1} onClick={() => setK(k + 1)}>
              {tco('workedNext')}
              <Icon name="next" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── contrast: compare first, then see the discriminating point ────────────────────────────────────────────────────

function ContrastBlock(props: { readonly block: BlockOf<'contrast'> }) {
  const b = props.block;
  const [shown, setShown] = useState(false);
  const side = (s: BlockOf<'contrast'>['left'], tag: string) => (
    <figure class="crs-contrast__side">
      <figcaption class="crs-contrast__cap">
        <span class="crs-contrast__tag" aria-hidden="true">
          {tag}
        </span>
        <Markup text={lt(s.caption)} />
      </figcaption>
      <EcgPanel source={s.ecg} view={b.view} marks={shown ? s.marks : undefined} label={`${tag}: ${lt(s.caption)}`} />
    </figure>
  );
  return (
    <div class="crs-contrast">
      <div class="crs-contrast__pair">
        {side(b.left, 'A')}
        {side(b.right, 'B')}
      </div>
      {shown ? (
        <Feedback tone="info" title={tco('contrastPoint')}>
          <Markup text={lt(b.point)} />
        </Feedback>
      ) : (
        <div class="crs-contrast__ask">
          <p class="crs-hint">{tco('contrastPrompt')}</p>
          <Button tone="primary" icon="eye" onClick={() => setShown(true)}>
            {tco('contrastShow')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── check: one practice item ──────────────────────────────────────────────────────────────────────────────────────

type ItemState = { readonly status: 'loading' } | { readonly status: 'ready'; readonly item: Item } | { readonly status: 'error' };

function CheckBlock(props: { readonly block: BlockOf<'check'> }) {
  const ref = props.block.item;
  const Player = itemPlayer();
  const [state, setState] = useState<ItemState>(() => ('inline' in ref ? { status: 'ready', item: ref.inline } : { status: 'loading' }));
  useEffect(() => {
    if ('inline' in ref) {
      setState({ status: 'ready', item: ref.inline });
      return;
    }
    let alive = true;
    setState({ status: 'loading' });
    generateItem(ref.family, ref.seed, ref.difficulty).then(
      (item) => alive && setState({ status: 'ready', item }),
      (e: unknown) => {
        console.warn('course: check item not available', ref, e);
        if (alive) setState({ status: 'error' });
      },
    );
    return () => {
      alive = false;
    };
  }, [ref]);
  if (!Player || state.status === 'error') return <Unavailable>{tco('checkUnavailable')}</Unavailable>;
  if (state.status === 'loading') return <EcgPlaceholder status="loading" />;
  return <Player item={state.item} compact />;
}

// ── drill: a mini-drill with a mastery bar ────────────────────────────────────────────────────────────────────────

type DrillSummary = Parameters<NonNullable<DrillRunnerProps['onFinish']>>[0];

function MasteryBar(props: { readonly value: number | null; readonly pass: number }) {
  const v = props.value;
  return (
    <div class="crs-mastery" role="img" aria-label={v === null ? `${tco('mastery')}: ${tco('masteryNone')}` : tco('masteryAria', { pct: pct(v), p: pct(props.pass) })}>
      <span class="crs-mastery__label">{tco('mastery')}</span>
      <span class="crs-mastery__track" aria-hidden="true">
        <span class={`crs-mastery__fill${v !== null && v >= props.pass ? ' is-pass' : ''}`} style={{ width: `${v === null ? 0 : pct(v)}%` }} />
        <span class="crs-mastery__pass" style={{ left: `${pct(props.pass)}%` }} />
      </span>
      <span class="crs-mastery__val tabular" aria-hidden="true">
        {v === null ? '—' : `${pct(v)}%`}
      </span>
    </div>
  );
}

function DrillBlock(props: { readonly block: BlockOf<'drill'>; readonly seedKey: string }) {
  const b = props.block;
  void progressTick();
  const Runner = drillRunner();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DrillSummary | null>(null);
  const seed = hashString(`${props.seedKey}:${attempt}`);
  const mastery = drillMastery(b.families);
  return (
    <div class="crs-drill">
      <div class="crs-drill__head">
        <strong>{tco('drillTitle', { n: b.count })}</strong>
        <span class="crs-hint tabular">{tco('drillPass', { p: pct(b.passScore) })}</span>
      </div>
      <MasteryBar value={mastery} pass={b.passScore} />
      {Runner ? (
        <Runner key={attempt} families={b.families} count={b.count} passScore={b.passScore} difficulty={b.difficulty} seed={seed} compact onFinish={setResult} />
      ) : (
        <Unavailable>{tco('drillUnavailable')}</Unavailable>
      )}
      {result && (
        <div class="crs-drill__result">
          <Feedback
            tone={result.passed ? 'ok' : 'partial'}
            title={result.passed ? tco('drillPassed', { s: pct(result.score) }) : tco('drillNotPassed', { s: pct(result.score), p: pct(b.passScore) })}
          >
            {result.missedCritical > 0 ? tco('drillCritical', { n: result.missedCritical }) : null}
          </Feedback>
          <Button
            icon="refresh"
            onClick={() => {
              setResult(null);
              setAttempt((a) => a + 1);
            }}
          >
            {tco('drillAgain')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── real: blind real cases ────────────────────────────────────────────────────────────────────────────────────────

const TWELVE_LEAD: readonly LayoutId[] = ['3x4+1', '3x4+3', '6x2', '12x1'];

function RealCaseCard(props: { readonly id: number }) {
  const c = realCase(props.id);
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const layout = store.settings.value.viewer.layout;
  const view = useMemo(() => ({ layout: TWELVE_LEAD.includes(layout) ? layout : ('3x4+1' as const) }), [layout]);
  if (!c) return <Unavailable>{tco('realUnknown', { id: props.id })}</Unavailable>;
  const who = [c.sex === 'M' ? tco('sexMale') : c.sex === 'F' ? tco('sexFemale') : null, c.age !== null ? tco('ageYears', { n: c.age }) : null]
    .filter((x) => x !== null)
    .join(' · ');
  const num = String(c.num).padStart(3, '0');
  return (
    <li class="crs-realcase">
      <div class="crs-realcase__head">
        <span class="crs-realcase__no tabular">{tco('realCase', { n: num })}</span>
        {who && <span class="app-muted">{who}</span>}
        {!open && (
          <Button size="sm" tone="primary" icon="eye" onClick={() => setOpen(true)}>
            {tco('realOpen')}
          </Button>
        )}
      </div>
      {open && (
        <div class="crs-realcase__body">
          <EcgPanel source={{ kind: 'real', id: c.id }} view={view} label={tco('realCase', { n: num })} />
          {revealed ? (
            <div class="crs-realcase__labels">
              <h4 class="crs-label">{tco('realLabels')}</h4>
              {c.findings.length ? (
                <ul class="crs-chips">
                  {c.findings.map((f) => (
                    <li key={f}>
                      <Badge tone={FINDINGS[f].severity}>{lt(FINDINGS[f].name)}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p class="app-muted">{tco('realNoLabels')}</p>
              )}
              <LinkButton size="sm" href={href({ name: 'case', id: c.id })} icon="external">
                {tco('realFullCase')}
              </LinkButton>
            </div>
          ) : (
            <Button icon="eye" onClick={() => setRevealed(true)}>
              {tco('realReveal')}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function RealBlock(props: { readonly block: BlockOf<'real'> }) {
  const b = props.block;
  return (
    <div class="crs-real">
      <Markup text={lt(b.caption)} class="crs-real__caption" />
      <p class="crs-hint">{tco('realLead')}</p>
      <ol class="crs-real__list">
        {b.ids.map((id) => (
          <RealCaseCard key={id} id={id} />
        ))}
      </ol>
    </div>
  );
}

// ── summary: take-aways → spaced review ───────────────────────────────────────────────────────────────────────────

/** Lessons whose review cards were already queued in this session. */
const queued = new Set<string>();

function SummaryBlock(props: { readonly block: BlockOf<'summary'>; readonly lesson: Lesson }) {
  const keys = useMemo(() => reviewKeys(props.lesson), [props.lesson]);
  const [added, setAdded] = useState(() => queued.has(props.lesson.id));
  useEffect(() => {
    if (queued.has(props.lesson.id)) return;
    if (scheduleReview(keys, Date.now())) {
      queued.add(props.lesson.id);
      setAdded(true);
    }
  }, [props.lesson.id, keys]);
  return (
    <div class="crs-summary">
      <ul class="crs-summary__list">
        {props.block.points.map((p, i) => (
          <li key={i}>
            <span class="crs-summary__icon" aria-hidden="true">
              <Icon name="check" />
            </span>
            <Markup text={lt(p)} />
          </li>
        ))}
      </ul>
      <p class="crs-hint">{added ? tco('summaryReview', { n: keys.length }) : tco('summaryReviewLater')}</p>
    </div>
  );
}
