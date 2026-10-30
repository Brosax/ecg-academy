/**
 * ECG viewer — public entry (contract: src/ecg/api.ts). Other modules import only from here.
 *
 *  - EcgView: the 12-lead sheet (every layout), paper at true scale, calibration pulses, lead labels, overlays from the
 *    model truth, marks / highlights / pins, calipers, magnifier, crosshair, shared time cursor and click-to-pick.
 *  - Monitor: one lead sweeping like a bedside monitor; plays once and holds.
 *
 * The components are thin: geometry, overlays and interaction rules are pure modules (layout, overlays, marks,
 * calipers, interact, sweep), drawing is draw.ts / render.ts, and the DOM controllers (view.ts, monitor.ts) redraw
 * only when something changes.
 */
import './ecg.css';
import { effect, useSignal, type Signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LAYOUTS, store, type LayoutId } from '../app/store';
import { EXTRA_LEADS, STD_LEADS, type Lead } from '../core/leads';
import { tc } from '../i18n/common';
import { te } from '../i18n/ecg';
import { Button, Segmented, type IconName } from '../ui';
import type { EcgMark, EcgPin, EcgViewProps, MonitorProps } from './api';
import { keyHelp } from './help';
import { anyTool, anyToolOn, clampTools, resolveTools, toggleTool, NO_TOOLS, type ToolKey, type ToolState } from './interact';
import { computeSheet, leadArray, leadExtent } from './layout';
import { MonitorView } from './monitor';
import { paperBox, type Gain, type PaperBox, type Speed } from './paper';
import type { BaseOptions } from './render';
import { monitorGeometry } from './sweep';
import { prefersReducedMotion, watchTheme } from './theme';
import { SheetView, type Readouts } from './view';

export type { CaliperMeasure, EcgMark, EcgPin, EcgViewProps, MarkColor, MonitorProps, PickEvent } from './api';

type TeKey = Parameters<typeof te>[0];

const LAYOUT_NAME: Readonly<Record<LayoutId, TeKey>> = {
  '3x4+1': 'layout3x4p1',
  '3x4+3': 'layout3x4p3',
  '6x2': 'layout6x2',
  '12x1': 'layout12x1',
  single: 'layoutSingle',
  strip: 'layoutStrip',
};

const NO_MARKS: readonly EcgMark[] = [];
const NO_LEADS: readonly Lead[] = [];
const NO_PINS: readonly EcgPin[] = [];

let uid = 0;
const useUid = (prefix: string): string => useState(() => `${prefix}-${++uid}`)[0];

interface Local {
  readonly layout?: LayoutId;
  readonly speed?: Speed;
  readonly gain?: Gain;
  readonly chestHalfGain?: boolean;
  readonly cabrera?: boolean;
  readonly lead?: Lead;
}
const LOCAL_KEYS = ['layout', 'speed', 'gain', 'chestHalfGain', 'cabrera', 'lead'] as const;

/** CSS of the paper box (see paperBox: fixed height, calibrated size, or the container width at the sheet's ratio). */
function boxCss(b: PaperBox): Record<string, string> {
  const css: Record<string, string> = {};
  if (b.width !== undefined) css.width = `${b.width.toFixed(2)}px`;
  if (b.height !== undefined) css.height = `${b.height.toFixed(2)}px`;
  if (b.minWidth !== undefined) css.minWidth = `${b.minWidth}px`;
  if (b.aspect !== undefined) css.aspectRatio = b.aspect.toFixed(5);
  return css;
}

/** Text of a read-out value box (written directly, never by Preact, so fast updates do not re-render). */
function setText(el: HTMLElement | null, v: string | undefined): void {
  if (el && el.textContent !== (v ?? '—')) el.textContent = v ?? '—';
}

function ToolButton(props: { readonly on: boolean; readonly icon?: IconName; readonly label: string; readonly title: string; readonly onClick: () => void }) {
  return (
    <Button size="sm" class="ecgv__tog" icon={props.icon} aria-pressed={props.on} title={props.title} onClick={props.onClick}>
      {props.label}
    </Button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════ EcgView

export function EcgView(props: EcgViewProps) {
  const vs = store.settings.value.viewer;
  const lang = store.lang.value;
  const sig = props.ecg.signal;

  // Toolbar choices are local to this instance (the store is written only by the settings page); a prop change from
  // the host drops the matching local choice.
  const [local, setLocal] = useState<Local>({});
  const propVals = [props.layout, props.speed, props.gain, props.chestHalfGain, props.cabrera, props.lead] as const;
  const prevVals = useRef(propVals);
  useEffect(() => {
    const changed = LOCAL_KEYS.filter((_k, i) => prevVals.current[i] !== propVals[i]);
    prevVals.current = propVals;
    if (changed.length) {
      setLocal((l) => {
        const n: Record<string, unknown> = { ...l };
        for (const k of changed) delete n[k];
        return n as Local;
      });
    }
  }, propVals);
  const setLocalKey = <K extends keyof Local>(k: K, v: Local[K]) => setLocal((l) => ({ ...l, [k]: v }));

  const layout = local.layout ?? props.layout ?? vs.layout;
  const speed = local.speed ?? props.speed ?? vs.speed;
  const gain = local.gain ?? props.gain ?? vs.gain;
  const half = local.chestHalfGain ?? props.chestHalfGain ?? vs.chestHalfGain;
  const cabrera = local.cabrera ?? props.cabrera ?? vs.cabrera;
  const lead = local.lead ?? props.lead ?? 'II';

  const truth = props.ecg.truth;
  const hasBeats = !!truth && truth.beats.length > 0;
  const ov = props.overlays;
  const waveLabels = hasBeats && !!ov?.waveLabels;
  const intervals = hasBeats && !!ov?.intervals;
  const stMarkers = hasBeats && !!ov?.stMarkers;
  const w0 = props.window?.[0];
  const w1 = props.window?.[1];

  const sheet = useMemo(
    () =>
      computeSheet(sig, {
        layout,
        speed,
        gain,
        chestHalfGain: half,
        cabrera,
        lead,
        window: w0 !== undefined && w1 !== undefined ? [w0, w1] : null,
        brackets: intervals,
        waveLabels,
        stMarkers,
      }),
    [sig, layout, speed, gain, half, cabrera, lead, w0, w1, intervals, waveLabels, stMarkers],
  );

  const tp = props.tools;
  const avail = useMemo(
    () => resolveTools(tp),
    [tp === false, tp ? tp.calipers : undefined, tp ? tp.magnifier : undefined, tp ? tp.crosshair : undefined],
  );
  const [toolsRaw, setTools] = useState<ToolState>(NO_TOOLS);
  const tools = useMemo(() => clampTools(toolsRaw, avail), [toolsRaw, avail]);
  const toggle = (k: ToolKey) => setTools((s) => toggleTool(clampTools(s, avail), k, avail));

  const base: BaseOptions = useMemo(
    () => ({
      marks: props.marks ?? NO_MARKS,
      highlightLeads: props.highlightLeads ?? NO_LEADS,
      pins: props.pins ?? NO_PINS,
      waveLabels,
      intervals,
      stMarkers,
    }),
    [props.marks, props.highlightLeads, props.pins, waveLabels, intervals, stMarkers],
  );

  const interactive = anyTool(avail) || !!props.onPick || !!props.cursor;
  const calPpm = props.height ? null : vs.pxPerMm;

  // ── DOM refs and the controller
  const boxRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const viewRef = useRef<SheetView | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const keysId = useUid('ecgv-keys');

  const ro = {
    crossBox: useRef<HTMLSpanElement>(null),
    crossT: useRef<HTMLSpanElement>(null),
    crossMv: useRef<HTMLSpanElement>(null),
    calBox: useRef<HTMLSpanElement>(null),
    cal0: useRef<HTMLSpanElement>(null),
    cal1: useRef<HTMLSpanElement>(null),
    cal2: useRef<HTMLSpanElement>(null),
  };
  const lastRo = useRef<Readouts>({ cross: null, cal: null });
  const applyRo = () => {
    const r = lastRo.current;
    setText(ro.crossT.current, r.cross?.[0]);
    setText(ro.crossMv.current, r.cross?.[1]);
    setText(ro.cal0.current, r.cal?.values[0]);
    setText(ro.cal1.current, r.cal?.values[1]);
    setText(ro.cal2.current, r.cal?.values[2]);
    ro.crossBox.current?.classList.toggle('is-on', r.cross !== null);
    ro.calBox.current?.classList.toggle('is-on', r.cal !== null);
  };

  useLayoutEffect(() => {
    const box = boxRef.current, b = baseRef.current, o = overRef.current;
    if (!box || !b || !o) return;
    const v = new SheetView(box, b, o, {
      setTools: (t) => setTools(t),
      pick: (e) => propsRef.current.onPick?.(e),
      setCursor: (t) => {
        const c = propsRef.current.cursor;
        if (c) c.value = t;
      },
      caliper: (m) => propsRef.current.onCaliper?.(m),
      readout: (r) => {
        lastRo.current = r;
        applyRo();
      },
      announce: (text) => {
        const el = liveRef.current;
        // repeat announcements must differ to be read again
        if (el) el.textContent = el.textContent === text ? `${text} ` : text;
      },
    }, probeRef.current);
    viewRef.current = v;
    return () => {
      v.dispose();
      viewRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    viewRef.current?.update({
      ecg: props.ecg,
      sheet,
      base,
      lang,
      avail,
      tools,
      pickable: !!props.onPick,
      cursorEnabled: !!props.cursor,
      pxPerMm: calPpm,
    });
    applyRo();
  });

  useEffect(() => {
    const c = props.cursor;
    if (!c) {
      viewRef.current?.setCursor(null);
      return;
    }
    return effect(() => {
      const v = c.value;
      viewRef.current?.setCursor(v);
    });
  }, [props.cursor]);

  useEffect(() => {
    const tv = watchTheme();
    return effect(() => {
      void tv.value;
      viewRef.current?.themeChanged();
    });
  }, []);

  // ── text
  const kind = props.ecg.origin.kind === 'real' ? te('kindReal') : te('kindSynthetic');
  const aria = props.ariaLabel ?? te('ariaSheet', { kind, layout: te(LAYOUT_NAME[layout]), speed, gain });

  const boxStyle = boxCss(paperBox(sheet.widthMm, sheet.heightMm, props.height, calPpm));

  const leadChoices = useMemo(() => [...STD_LEADS, ...EXTRA_LEADS.filter((l) => leadArray(sig, l))], [sig]);
  const showLeadSelect = layout === 'single' || layout === 'strip' || layout === '3x4+1';
  const amp = tools.amplitude;

  const readouts = (only: 'all' | 'on') => (
    <>
      {avail.crosshair && (only === 'all' || tools.crosshair) && (
        <span class="ecgv__robox" ref={ro.crossBox}>
          <span class="ecgv__rotitle">{te('roCross')}</span>
          <span>t =</span>
          <span class="ecgv__num ecgv__num--5" ref={ro.crossT} />
          <span>ms</span>
          <span class="ecgv__num ecgv__num--6" ref={ro.crossMv} />
          <span>mV</span>
        </span>
      )}
      {avail.calipers && (only === 'all' || tools.calipers) && (
        <span class="ecgv__robox" ref={ro.calBox}>
          <span class="ecgv__rotitle">{te('roCalipers')}</span>
          {amp ? (
            <>
              <span class="ecgv__num ecgv__num--5" ref={ro.cal0} key="a0" />
              <span>mV</span>
              <span class="ecgv__num ecgv__num--5" ref={ro.cal1} key="a1" />
              <span>mm</span>
            </>
          ) : (
            <>
              <span class="ecgv__num ecgv__num--5" ref={ro.cal0} key="t0" />
              <span>ms</span>
              <span class="ecgv__num ecgv__num--5" ref={ro.cal1} key="t1" />
              <span>{te('unitSquares')}</span>
              <span class="ecgv__num ecgv__num--4" ref={ro.cal2} key="t2" />
              <span>{te('unitBpm')}</span>
            </>
          )}
        </span>
      )}
    </>
  );

  return (
    <div class="ecgv">
      {props.toolbar && (
        <div class="ecgv__bar" role="group" aria-label={te('toolbarAria')}>
          <label class="ecgv__group">
            <span class="ecgv__lbl">{te('layout')}</span>
            <select class="ecgv__select" value={layout} onChange={(e) => setLocalKey('layout', e.currentTarget.value as LayoutId)}>
              {LAYOUTS.map((id) => (
                <option key={id} value={id}>
                  {te(LAYOUT_NAME[id])}
                </option>
              ))}
            </select>
          </label>
          {showLeadSelect && (
            <label class="ecgv__group">
              <span class="ecgv__lbl">{layout === '3x4+1' ? te('cursorLead') : tc('lead')}</span>
              <select class="ecgv__select" value={lead} onChange={(e) => setLocalKey('lead', e.currentTarget.value as Lead)}>
                {leadChoices.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div class="ecgv__group">
            <span class="ecgv__lbl">{te('speed')}</span>
            <Segmented<Speed>
              size="sm"
              value={speed}
              ariaLabel={te('speed')}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
              ]}
              onChange={(v) => setLocalKey('speed', v)}
            />
            <span class="ecgv__unit">mm/s</span>
          </div>
          <div class="ecgv__group">
            <span class="ecgv__lbl">{te('gain')}</span>
            <Segmented<Gain>
              size="sm"
              value={gain}
              ariaLabel={te('gain')}
              options={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
              ]}
              onChange={(v) => setLocalKey('gain', v)}
            />
            <span class="ecgv__unit">mm/mV</span>
          </div>
          <div class="ecgv__group">
            <ToolButton on={cabrera} label={te('cabrera')} title={te('cabreraTitle')} onClick={() => setLocalKey('cabrera', !cabrera)} />
            <ToolButton on={half} label={te('halfChest')} title={te('halfChestTitle')} onClick={() => setLocalKey('chestHalfGain', !half)} />
          </div>
          {anyTool(avail) && (
            <div class="ecgv__group" role="group" aria-label={te('tools')}>
              {avail.calipers && (
                <>
                  <ToolButton on={tools.calipers} icon="calipers" label={te('calipers')} title={te('calipersTitle')} onClick={() => toggle('calipers')} />
                  <ToolButton on={tools.amplitude} label={te('amplitude')} title={te('amplitudeTitle')} onClick={() => toggle('amplitude')} />
                  <ToolButton on={tools.march} label={te('marchOut')} title={te('marchOutTitle')} onClick={() => toggle('march')} />
                </>
              )}
              {avail.magnifier && <ToolButton on={tools.magnifier} icon="zoom" label={te('magnifier')} title={te('magnifierTitle')} onClick={() => toggle('magnifier')} />}
              {avail.crosshair && <ToolButton on={tools.crosshair} icon="target" label={te('crosshair')} title={te('crosshairTitle')} onClick={() => toggle('crosshair')} />}
              <Button size="sm" tone="ghost" icon="close" class="ecgv__clear" aria-disabled={!anyToolOn(tools)} onClick={() => setTools(NO_TOOLS)}>
                {te('clear')}
              </Button>
            </div>
          )}
        </div>
      )}
      {props.toolbar && anyTool(avail) && (
        <div class="ecgv__ro" role="group" aria-label={te('readouts')}>
          {readouts('all')}
        </div>
      )}
      <div class="ecgv__stage">
        <div
          class="ecgv__scroll"
          tabIndex={interactive ? 0 : undefined}
          role={interactive ? 'application' : 'img'}
          aria-label={aria}
          aria-describedby={interactive ? keysId : undefined}
          onKeyDown={(e) => {
            viewRef.current?.key(e);
          }}
          onBlur={() => viewRef.current?.blur()}
        >
          <div class="ecgv__paper" ref={boxRef} style={boxStyle}>
            <canvas ref={baseRef} aria-hidden="true" />
            <canvas ref={overRef} aria-hidden="true" />
            <span class="ecgv__probe" ref={probeRef} aria-hidden="true" />
          </div>
        </div>
        {!props.toolbar && anyToolOn(tools) && (tools.calipers || tools.crosshair) && <div class="ecgv__float ecgv__ro">{readouts('on')}</div>}
      </div>
      {interactive && (
        <div id={keysId} class="ecgv__sr">
          {keyHelp(lang, avail, props.onPick ? 'pick' : props.cursor ? 'cursor' : 'none')}
        </div>
      )}
      <div class="ecgv__sr" aria-live="polite" ref={liveRef} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════ Monitor

export function Monitor(props: MonitorProps) {
  const vs = store.settings.value.viewer;
  const lang = store.lang.value;
  const reduced = store.settings.value.reduceMotion || prefersReducedMotion();
  const sig = props.ecg.signal;
  const lead = props.lead ?? 'II';
  const windowMs = Math.max(1000, Math.round((props.seconds ?? 6) * 1000));
  const speed = vs.speed;
  const gain = vs.gain;

  // without a `playing` signal the monitor plays once on its own and shows its own play / pause button (a click on the
  // trace pauses it, so mouse users need a way to resume or replay)
  const internal = useSignal(true);
  const playing: Signal<boolean> = props.playing ?? internal;
  const ownButton = props.playing === undefined;
  const ownPlaying = ownButton && internal.value;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const propsRef = useRef(props);
  propsRef.current = props;
  const keysId = useUid('ecgm-keys');

  const geo = useMemo(() => {
    const e = leadExtent(sig, lead, 0, sig.durationMs);
    return monitorGeometry(e.max, e.min, windowMs, speed, gain);
  }, [sig, lead, windowMs, speed, gain]);

  const boxRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<MonitorView | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current, cv = cvRef.current;
    if (!box || !cv) return;
    const v = new MonitorView(box, cv, {
      setPlaying: (p) => {
        playingRef.current.value = p;
      },
      setCursor: (t) => {
        const c = propsRef.current.cursor;
        if (c) c.value = t;
      },
    });
    viewRef.current = v;
    return () => {
      v.dispose();
      viewRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    viewRef.current?.update({ ecg: props.ecg, lead, windowMs, speed, gain, geo, lang, reduced, cursorEnabled: !!props.cursor });
  });

  useEffect(
    () =>
      effect(() => {
        const p = playing.value;
        viewRef.current?.setPlaying(p);
      }),
    [playing],
  );

  useEffect(() => {
    const c = props.cursor;
    if (!c) return;
    return effect(() => {
      const v = c.value;
      viewRef.current?.setCursor(v);
    });
  }, [props.cursor]);

  useEffect(() => {
    const tv = watchTheme();
    return effect(() => {
      void tv.value;
      viewRef.current?.themeChanged();
    });
  }, []);

  const boxStyle: Record<string, string> = props.height
    ? { height: `${props.height}px` }
    : { aspectRatio: `${geo.widthMm.toFixed(3)} / ${geo.heightMm.toFixed(3)}` };

  return (
    <div class="ecgm-wrap">
      <div
        class="ecgm"
        ref={boxRef}
        style={boxStyle}
        tabIndex={0}
        role="application"
        aria-label={te('monitorAria', { lead })}
        aria-describedby={keysId}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            viewRef.current?.toggle();
          }
        }}
      >
        <canvas ref={cvRef} aria-hidden="true" />
      </div>
      {ownButton && (
        <Button
          size="sm"
          class="ecgm__play"
          icon={ownPlaying ? 'pause' : 'play'}
          aria-label={ownPlaying ? te('pause') : te('play')}
          title={ownPlaying ? te('pause') : te('play')}
          onClick={() => (internal.value = !internal.peek())}
        />
      )}
      <div id={keysId} class="ecgv__sr">
        {te('monitorKeys')}
      </div>
    </div>
  );
}

