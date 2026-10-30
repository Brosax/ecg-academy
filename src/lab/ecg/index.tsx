/**
 * PUBLIC API of the ECG workstream (props are frozen; internals live in the *View classes).
 * All components draw on canvases in their own requestAnimationFrame loop, reading store.time.peek().
 * Clicking a trace pauses, seeks to that instant and highlights engine.responsible(t) (see clickFocus.ts).
 * Preact only renders the chrome (toolbars, buttons, captions); each canvas view is created once per engine/lead.
 */
import type { Ref } from 'preact';
import { useEffect, useId, useMemo, useRef } from 'preact/hooks';
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { tc } from '../i18n/common';
import { te } from '../i18n/ecg';
import type { LeadName, SimEngine } from '../sim/types';
import { PRECORDIAL_LEADS } from '../sim/types';
import { FRONTAL_LEADS, frontalDeg, isFrontalLead } from './axes';
import { placeCalipers } from './caliperPlace';
import { caliperReadout } from './calipers';
import type { CaliperMode } from './calipers';
import { Ecg12View } from './ecg12View';
import { fmtNum, fmtOpt } from './format';
import { sheetLayout } from './paper';
import { PlaneView } from './planeView';
import type { Plane } from './planeView';
import { getHub } from './sampler';
import { bandsOn, caliperMode } from './state';
import { StripView } from './stripView';
import { TimelineView } from './timelineView';
import { WiggersView } from './wiggersView';
import { BEAT_LEVELS, createZoom, GAINS } from './zoom';
import type { StripZoom } from './zoom';
import type { Signal } from '@preact/signals';
import './ecg.css';

export interface EcgCommonProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
  readonly class?: string;
}

const cls = (...xs: (string | undefined | false)[]) => xs.filter(Boolean).join(' ');
const SHEET = sheetLayout();

/** 12-lead panel: 'sync' 3×4 (same time window in every column) or 'clinical' sequential layout (store.ecgLayout). */
export function Ecg12(props: EcgCommonProps) {
  const host = useRef<HTMLDivElement>(null), bg = useRef<HTMLCanvasElement>(null), fg = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const hintId = useId();
  useEffect(() => {
    const v = new Ecg12View(host.current!, bg.current!, fg.current!, props.engine, props.commands, tip.current!);
    return () => v.dispose();
  }, [props.engine, props.commands]);
  const layout = store.ecgLayout.value;
  const bands = bandsOn.value;
  return (
    <section class={cls('ecg-panel', props.class)} aria-label={te('panel.ecg12')}>
      <div class="ecg-toolbar">
        <span class="ecg-title">{te('panel.ecg12')}</span>
        <span class="ecg-scale">{te('paper.scale')}</span>
        <span class="ecg-spacer" />
        <div class="ecg-seg" role="group" aria-label={te('layout.label')}>
          {(['sync', 'clinical'] as const).map((k) => (
            <button
              type="button"
              aria-pressed={layout === k}
              title={te(k === 'sync' ? 'layout.sync.hint' : 'layout.clinical.hint')}
              onClick={() => {
                // No AppCommands entry for the layout yet (reported as a contract request).
                store.ecgLayout.value = k;
              }}
            >
              {te(k === 'sync' ? 'layout.sync' : 'layout.clinical')}
            </button>
          ))}
        </div>
        <BandsToggle on={bands} />
      </div>
      <div
        ref={host}
        class="ecg-stage"
        tabIndex={0}
        role="group"
        aria-label={te('panel.ecg12')}
        aria-describedby={hintId}
        style={{ aspectRatio: `${SHEET.widthMm} / ${SHEET.heightMm}` }}
      >
        <canvas ref={bg} aria-hidden="true" />
        <canvas ref={fg} role="img" aria-label={te('panel.ecg12')} />
        <div ref={tip} class="ecg-tip" hidden />
      </div>
      <p id={hintId} class="ecg-hint">
        {te('ecg.hint')}
      </p>
    </section>
  );
}

function BandsToggle({ on }: { on: boolean }) {
  return (
    <button type="button" class="ecg-btn" aria-pressed={on} title={te('bands.hint')} onClick={() => (bandsOn.value = !on)}>
      <span class="ecg-swatches" aria-hidden="true">
        <i style={{ background: 'var(--c-atrial)' }} />
        <i style={{ background: 'var(--c-qrs)' }} />
        <i style={{ background: 'var(--c-repol)' }} />
      </span>
      {te('bands.toggle')}
    </button>
  );
}

/**
 * Zoom controls of a detail strip: how many beats it shows (standard 25 mm/s, 4, 2 or 1 beat spread over the whole
 * strip) and the gain (×½ / ×1 / ×2 = 5 / 10 / 20 mm/mV). The scale read-out (`scaleOut`, written by the strip view)
 * shows the effective paper speed; its tooltip what one small square is worth.
 */
function ZoomBar({ zoom, scaleOut }: { readonly zoom: Signal<StripZoom>; readonly scaleOut: Ref<HTMLOutputElement> }) {
  const z = zoom.value;
  return (
    <>
      <output ref={scaleOut} class="ecg-scale ecg-scale-z tnum" aria-live="off">
        {te('paper.scale')}
      </output>
      <span class="ecg-spacer" />
      <div class="ecg-seg ecg-zoom" role="group" aria-label={te('zoom.beats')} title={te('zoom.hint')}>
        {BEAT_LEVELS.map((n) => (
          <button type="button" aria-pressed={z.beats === n} onClick={() => (zoom.value = { ...zoom.peek(), beats: n })}>
            {n === 0 ? te('zoom.std') : te(n === 1 ? 'zoom.beat1' : 'zoom.beatN', { n })}
          </button>
        ))}
      </div>
      <div class="ecg-seg ecg-gain" role="group" aria-label={te('zoom.gain')} title={te('zoom.gain')}>
        {GAINS.map((g) => (
          <button type="button" aria-pressed={z.gain === g} aria-label={te('zoom.gainValue', { gain: g })} onClick={() => (zoom.value = { ...zoom.peek(), gain: g })}>
            {g === 10 ? '×1' : g === 5 ? '×½' : '×2'}
          </button>
        ))}
      </div>
    </>
  );
}

/** One lead, large, with wave labels (P, Q, R, S, T) from model truth, calipers and its own zoom (paper speed, gain). */
export function LeadDetail(props: EcgCommonProps & { readonly lead: LeadName; readonly showProjection?: boolean }) {
  const host = useRef<HTMLDivElement>(null), bg = useRef<HTMLCanvasElement>(null), fg = useRef<HTMLCanvasElement>(null);
  const projOut = useRef<HTMLOutputElement>(null);
  const hintId = useId();
  // one zoom per strip, kept across lead changes (the student zoomed in to compare leads at the same scale)
  const zoom = useMemo(() => createZoom(), []);
  const scaleOut = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    const v = new StripView(host.current!, bg.current!, fg.current!, props.engine, props.commands, {
      lead: props.lead,
      mode: 'detail',
      showProjection: props.showProjection,
      projOut: projOut.current,
      zoom,
      scaleOut: scaleOut.current,
    });
    return () => v.dispose();
  }, [props.engine, props.commands, props.lead, props.showProjection]);
  return (
    <section class={cls('ecg-panel', props.class)} aria-label={te('panel.detail', { lead: props.lead })}>
      <div class="ecg-toolbar">
        <span class="ecg-title">{te('panel.detail', { lead: props.lead })}</span>
        <ZoomBar zoom={zoom} scaleOut={scaleOut} />
        <BandsToggle on={bandsOn.value} />
      </div>
      <div ref={host} class="ecg-stage" tabIndex={0} role="group" aria-label={te('panel.detail', { lead: props.lead })} aria-describedby={hintId}>
        <canvas ref={bg} aria-hidden="true" />
        <canvas ref={fg} role="img" aria-label={te('panel.detail', { lead: props.lead })} />
      </div>
      <p id={hintId} class="ecg-hint">
        {te('labels.legend')}
      </p>
      <CaliperBar engine={props.engine} commands={props.commands} lead={props.lead} />
      {props.showProjection && (
        <div class="ecg-proj">
          <div class="ecg-proj-formula">{te('proj.formula')}</div>
          <output ref={projOut} class="ecg-readout" aria-live="off" />
          <ul>
            <li>{te('proj.sens')}</li>
            <li>{te('proj.along')}</li>
          </ul>
          <p class="ecg-caption">{te('proj.explain')}</p>
        </div>
      )}
    </section>
  );
}

/** Rhythm strip (10 s), default lead II. */
export function RhythmStrip(props: EcgCommonProps & { readonly lead?: LeadName }) {
  const lead = props.lead ?? 'II';
  const host = useRef<HTMLDivElement>(null), bg = useRef<HTMLCanvasElement>(null), fg = useRef<HTMLCanvasElement>(null);
  const hintId = useId();
  useEffect(() => {
    const v = new StripView(host.current!, bg.current!, fg.current!, props.engine, props.commands, { lead, mode: 'rhythm' });
    return () => v.dispose();
  }, [props.engine, props.commands, lead]);
  return (
    <section class={cls('ecg-panel', props.class)} aria-label={te('panel.rhythm', { lead })}>
      <div class="ecg-toolbar">
        <span class="ecg-title">{te('panel.rhythm', { lead })}</span>
        <span class="ecg-scale">{te('paper.scale')}</span>
      </div>
      <div ref={host} class="ecg-stage" tabIndex={0} role="group" aria-label={te('panel.rhythm', { lead })} aria-describedby={hintId}>
        <canvas ref={bg} aria-hidden="true" />
        <canvas ref={fg} role="img" aria-label={te('panel.rhythm', { lead })} />
      </div>
      <p id={hintId} class="ecg-hint">
        {te('ecg.hint')}
      </p>
      <CaliperBar engine={props.engine} commands={props.commands} lead={lead} />
    </section>
  );
}

/** Caliper toggle, mode and readout (measured vs model truth). State: store.calipers. */
function CaliperBar({ engine, commands, lead }: { engine: SimEngine; commands: AppCommands; lead: LeadName }) {
  const cal = store.calipers.value;
  const mode = caliperMode.value;
  const lang = store.lang.value;
  const hub = getHub(engine);
  const place = (m: CaliperMode) => placeCalipers(engine, commands, lead, m);
  let lines: string[] = [];
  if (cal) {
    const c = hub.cycles.at(Math.min(cal.t0, cal.t1) + 1);
    const r = caliperReadout(mode, cal.t0, cal.t1, c, c ? hub.beat(c).rrMs : null);
    if (mode === 'interval') {
      lines = [
        `${te('cal.dt', { dt: fmtOpt(lang, r.dtMs) })} · ${te('cal.rate', { bpm: fmtOpt(lang, r.rateBpm) })}`,
        te('cal.truth.rr', { rr: fmtOpt(lang, r.truth.rrMs), bpm: fmtOpt(lang, r.truth.rateBpm) }),
      ];
    } else {
      lines = [
        `${te('cal.qt', { qt: fmtOpt(lang, r.dtMs) })} · ${te('cal.qtc', { b: fmtOpt(lang, r.qtcBazettMs), f: fmtOpt(lang, r.qtcFridericiaMs), rr: fmtOpt(lang, r.rrMs) })}`,
        te('cal.truth.qt', { qt: fmtOpt(lang, r.truth.qtMs), b: fmtOpt(lang, r.truth.qtcBazettMs), f: fmtOpt(lang, r.truth.qtcFridericiaMs) }),
        te('cal.note'),
      ];
    }
  }
  return (
    <div class="ecg-cal">
      <button
        type="button"
        class="ecg-btn"
        aria-pressed={!!cal}
        onClick={() => {
          if (store.calipers.peek()) store.calipers.value = null;
          else place(mode);
        }}
      >
        {te('cal.toggle')}
      </button>
      {cal && (
        <div class="ecg-seg" role="group" aria-label={te('cal.toggle')}>
          {(['interval', 'qt'] as const).map((m) => (
            <button
              type="button"
              aria-pressed={mode === m}
              onClick={() => {
                caliperMode.value = m;
                place(m);
              }}
            >
              {te(m === 'interval' ? 'cal.mode.interval' : 'cal.mode.qt')}
            </button>
          ))}
        </div>
      )}
      {cal ? (
        <output class="ecg-cal-out ecg-readout" aria-live="off">
          {lines.map((l) => (
            <span>{l}</span>
          ))}
        </output>
      ) : null}
      {cal && <p class="ecg-hint">{te('cal.hint')}</p>}
    </div>
  );
}

/** Global timeline: electrical segments + mechanical phases of the current cycle with the playhead. */
export function TimelineBar(props: EcgCommonProps) {
  const host = useRef<HTMLDivElement>(null), fg = useRef<HTMLCanvasElement>(null);
  const legendId = useId();
  useEffect(() => {
    const v = new TimelineView(host.current!, fg.current!, props.engine, props.commands);
    return () => v.dispose();
  }, [props.engine, props.commands]);
  return (
    <section class={cls('ecg-panel', props.class)} aria-label={te('panel.timeline')}>
      <div
        ref={host}
        class="ecg-stage ecg-stage-timeline"
        role="slider"
        tabIndex={0}
        aria-label={te('timeline.aria')}
        aria-describedby={legendId}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={0}
      >
        <canvas ref={fg} aria-hidden="true" />
      </div>
      <p id={legendId} class="ecg-hint ecg-legend">
        <NowText />
        <span>{te('timeline.legend')}</span>
      </p>
    </section>
  );
}

/** Current segment / mechanical phase (store.now, ~10 Hz) in its own component so the parent never re-renders. */
function NowText() {
  const now = store.now.value;
  const seg = now.segment ? tc(`seg.${now.segment}` as never) : '—';
  const mech = now.mech ? tc(`mech.${now.mech}` as never) : '—';
  return <strong class="ecg-now">{te('timeline.now', { seg, mech })}</strong>;
}

const WIGGERS_LEGEND = [
  ['wiggers.lvp', 'var(--c-qrs)'],
  ['wiggers.aop', 'var(--c-vector)'],
  ['wiggers.lap', 'var(--c-atrial)'],
  ['wiggers.lvv', 'var(--c-repol)'],
  ['wiggers.ecg', 'var(--fg)'],
] as const;

/** Mini Wiggers diagram: LV pressure/volume, valve events, S1/S2, on the same clock. */
export function WiggersPanel(props: EcgCommonProps) {
  const host = useRef<HTMLDivElement>(null), bg = useRef<HTMLCanvasElement>(null), fg = useRef<HTMLCanvasElement>(null);
  const capId = useId();
  const live = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    const v = new WiggersView(host.current!, bg.current!, fg.current!, props.engine, live.current);
    return () => v.dispose();
  }, [props.engine]);
  return (
    <section class={cls('ecg-panel', props.class)} aria-label={te('panel.wiggers')}>
      <div class="ecg-toolbar">
        <span class="ecg-title">{te('panel.wiggers')}</span>
      </div>
      <ul class="ecg-legend-list" aria-hidden="true">
        {WIGGERS_LEGEND.map(([k, color]) => (
          <li>
            <i style={{ background: color }} />
            {te(k)}
          </li>
        ))}
      </ul>
      <div ref={host} class="ecg-stage ecg-stage-wiggers" aria-describedby={capId}>
        <canvas ref={bg} aria-hidden="true" />
        <canvas ref={fg} role="img" aria-label={te('panel.wiggers')} />
      </div>
      <output ref={live} class="ecg-readout" aria-live="off" />
      <p id={capId} class="ecg-caption">
        {te('wiggers.caption')}
      </p>
    </section>
  );
}

function PlanePanel(props: EcgCommonProps & { plane: Plane }) {
  const host = useRef<HTMLDivElement>(null), bg = useRef<HTMLCanvasElement>(null), fg = useRef<HTMLCanvasElement>(null);
  const axes = useRef<HTMLElement>(null), why = useRef<HTMLParagraphElement>(null), proj = useRef<HTMLOutputElement>(null);
  const frontal = props.plane === 'frontal';
  useEffect(() => {
    const v = new PlaneView(host.current!, bg.current!, fg.current!, props.engine, props.commands, props.plane, {
      axes: axes.current,
      why: why.current,
      proj: proj.current,
    });
    return () => v.dispose();
  }, [props.engine, props.commands, props.plane]);
  const sel = store.selectedLead.value;
  const leads: readonly LeadName[] = frontal ? FRONTAL_LEADS : PRECORDIAL_LEADS;
  const title = te(frontal ? 'panel.hexaxial' : 'panel.horizontal');
  return (
    <section class={cls('ecg-panel', props.class)} aria-label={title}>
      <div class="ecg-toolbar">
        <span class="ecg-title">{title}</span>
      </div>
      <div ref={host} class="ecg-stage ecg-stage-square">
        <canvas ref={bg} aria-hidden="true" />
        <canvas ref={fg} role="img" aria-label={title} />
      </div>
      <div class="ecg-leadpick" role="group" aria-label={te('hex.selectLead')}>
        {leads.map((l) => (
          <button type="button" class="ecg-btn" aria-pressed={sel === l} onClick={() => props.commands.selectLead(l)}>
            {l}
          </button>
        ))}
      </div>
      <output ref={proj} class="ecg-readout" aria-live="off" />
      {frontal ? (
        <>
          <p class="ecg-readout">
            <span class="ecg-muted">
              {te('hex.clinical')} / {te('hex.true')}:
            </span>{' '}
            <span ref={axes} />
          </p>
          <p ref={why} class="ecg-caption" />
          {isFrontalLead(sel) && (
            <p class="ecg-caption">{te('hex.trueAxis', { lead: sel, deg: fmtNum(store.lang.value, frontalDeg(props.engine.projector.leadVector(sel)), 0, true) })}</p>
          )}
        </>
      ) : (
        <p class="ecg-caption">{te('hor.caption')}</p>
      )}
      <p class="ecg-caption">{te('loop.legend')}</p>
    </section>
  );
}

/** Frontal hexaxial diagram with the heart vector and its lead projections. */
export function HexaxialDiagram(props: EcgCommonProps) {
  return <PlanePanel {...props} plane="frontal" />;
}

/** Horizontal-plane precordial diagram with the VCG loop. */
export function HorizontalPlaneDiagram(props: EcgCommonProps) {
  return <PlanePanel {...props} plane="horizontal" />;
}
