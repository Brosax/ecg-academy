/**
 * PUBLIC API of the 3D workstream (props are frozen).
 * <HeartView> mounts a three.js scene (scene.ts), follows store.mode / store.layers / store.slice / store.highlight /
 * store.selectedLead, and reads store.time.peek() in its own render loop. Overlay: camera presets + colour key, and,
 * while the blood-flow layer is on, a fixed-size one-line "blood now" chip (flowControls.flowNow, never store.time) and
 * the "follow the blood once round" walkthrough. Switching the layer on slows playback to 0.25x and enlarges the heart
 * box (both undone when it is switched off, unless the user changed them meanwhile).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { tv } from '../i18n/view3d';
import type { SimEngine } from '../sim/types';
import { CAMERA_PRESETS } from './cameras';
import type { CameraPreset } from './cameras';
import { tourWindow } from './core/flowTour';
import { bloodFlow, FLOW_CAPTION_KEYS, FLOW_COLORS, FLOW_TOUR, flowLegendRows, flowNow, flowStyle, flowTourStep } from './flowControls';
import { HeartScene } from './scene';
import { cameraPreset, cameraRequest, heartEnlarged, LEGEND, PRESET_KEYS } from './viewControls';
import './view3d.css';

export interface HeartViewProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
  readonly class?: string;
}

export function HeartView(props: HeartViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HeartScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let s: HeartScene;
    try {
      s = new HeartScene(el, props.engine, props.commands);
    } catch (err) {
      console.error('[view3d] WebGL initialisation failed', err);
      setFailed(true);
      return;
    }
    setFailed(false);
    scene.current = s;
    if (el.clientWidth < 420) setLegendOpen(false); // the colour key would cover most of a phone-width view
    // camera presets asked for from outside (the shell's tool rail); the first value is not a request
    let first = true;
    const off = cameraRequest.subscribe((req) => {
      if (first) return void (first = false);
      if (req) setPreset(req.preset);
    });
    return () => {
      off();
      s.dispose();
      scene.current = null;
    };
  }, [props.engine, props.commands]);

  // flow layer on → slow motion + enlarged heart; off → restore what we changed, close the walkthrough
  useEffect(() => {
    let first = true;
    let slowed: number | null = null;
    let enlarged = false;
    return bloodFlow.subscribe((on) => {
      if (first) {
        first = false;
        return;
      }
      if (on) {
        const sp = store.speed.peek();
        if (sp > FLOW_SPEED) {
          slowed = sp;
          props.commands.setSpeed(FLOW_SPEED);
        }
        if (!heartEnlarged.peek()) heartEnlarged.value = enlarged = true;
        return;
      }
      flowTourStep.value = null;
      if (slowed !== null && store.speed.peek() === FLOW_SPEED) props.commands.setSpeed(slowed);
      if (enlarged && heartEnlarged.peek()) heartEnlarged.value = false;
      slowed = null;
      enlarged = false;
    });
  }, [props.commands]);

  // walkthrough card open → lift the heart into the free area above the overlay stack (card, chip, legend)
  const tourOpen = flowTourStep.value !== null && bloodFlow.value;
  const folded = useRef(false);
  useEffect(() => {
    const s = scene.current, el = root.current;
    if (!s || !el) return;
    if (!tourOpen) {
      folded.current = false;
      return void s.setViewInset(0);
    }
    // the colour key would stack on top of the card: fold it once when the walkthrough opens (it can be reopened)
    if (legendOpen && !folded.current) {
      folded.current = true;
      return void setLegendOpen(false);
    }
    const raf = requestAnimationFrame(() => {
      const foot = el.querySelector('.hv-foot');
      if (foot) s.setViewInset(el.getBoundingClientRect().bottom - foot.getBoundingClientRect().top + 8);
    });
    return () => cancelAnimationFrame(raf);
  }, [tourOpen, legendOpen]);

  const setPreset = (p: CameraPreset) => {
    scene.current?.setCameraPreset(p);
    cameraPreset.value = p;
  };

  const lead = store.selectedLead.value;
  return (
    <div ref={root} class={`hv-root${props.class ? ` ${props.class}` : ''}`}>
      <div ref={host} class="hv-host" role="img" aria-label={tv('scene.aria')} title={tv('scene.clickHint')} />
      {failed && (
        <div class="hv-fallback" role="alert">
          {tv('scene.webgl')}
        </div>
      )}
      <div class="hv-toolbar" role="toolbar" aria-label={tv('toolbar.label')}>
        {CAMERA_PRESETS.map((p) => {
          const { label, aria } = PRESET_KEYS[p];
          return (
            <button
              key={p}
              type="button"
              class="hv-btn"
              aria-label={tv(aria, { lead })}
              title={tv(aria, { lead })}
              onClick={() => setPreset(p)}
            >
              {tv(label, { lead })}
            </button>
          );
        })}
      </div>
      <div class="hv-foot">
        {!failed && <FlowTour engine={props.engine} commands={props.commands} />}
        {!failed && <FlowChip />}
        <Legend open={legendOpen} onToggle={() => setLegendOpen(!legendOpen)} />
      </div>
    </div>
  );
}

/** The flow layer is drawn only at heart scale (hidden with the torso, like the structure labels). */
function flowShown(): boolean {
  return bloodFlow.value && !store.layers.value.torso;
}

/**
 * "Blood now" chip: fixed size and one line (ellipsis), so caption changes never resize or move anything. Its own
 * component, so only it re-renders when the scene publishes flowNow (≤ 10 Hz). No live region: it would chatter.
 */
function FlowChip() {
  if (!flowShown()) return null;
  const id = flowNow.value;
  const text = tv(FLOW_CAPTION_KEYS[id]);
  return (
    <div class="hv-flow-chip" data-flow={id} title={text}>
      <span class="hv-flow-tag">{tv('flow.tag')}</span>
      <span class="hv-flow-text">{text}</span>
    </div>
  );
}

/** Playback speed while the flow layer is on (blood moves visibly; 1x shows a beat in under a second). */
const FLOW_SPEED = 0.25;

/**
 * "Follow the blood once round": a fixed-size card that steps through FLOW_TOUR. Each step dims the other streams,
 * emphasises its name tags and plays its moment of the beat once (seek, play at 0.25x, pause at the end of the window);
 * no looping. Closed, it is a single button above the chip.
 */
function FlowTour({ engine, commands }: { readonly engine: SimEngine; readonly commands: AppCommands }) {
  const i = flowTourStep.value;
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (i === null) return;
    const step = FLOW_TOUR[i];
    const w = step ? tourWindow(engine, store.time.peek(), step) : null;
    if (!w) {
      commands.pause();
      return;
    }
    commands.seek(w.t0);
    if (store.speed.peek() > FLOW_SPEED) commands.setSpeed(FLOW_SPEED);
    commands.play();
    let raf = 0;
    const tick = () => {
      if (!store.playing.peek()) return; // the user took over
      if (store.time.peek() >= w.t1) return commands.pause();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, nonce, engine, commands]);

  if (!flowShown()) return null;
  if (i === null)
    return (
      <button type="button" class="hv-flow-tour-open" onClick={() => (flowTourStep.value = 0)}>
        {tv('flow.tour.open')}
      </button>
    );
  const step = FLOW_TOUR[i];
  const last = FLOW_TOUR.length - 1;
  return (
    <section class="hv-flow-tour" aria-label={tv('flow.tour.title')}>
      <header>
        <strong>{tv('flow.tour.title')}</strong>
        <span class="hv-flow-tour-n">{tv('flow.tour.step', { n: i + 1, total: FLOW_TOUR.length })}</span>
        <button type="button" class="hv-flow-tour-x" aria-label={tv('flow.tour.close')} title={tv('flow.tour.close')} onClick={() => (flowTourStep.value = null)}>
          ×
        </button>
      </header>
      <p aria-live="polite">{step ? tv(step.key) : ''}</p>
      <div class="hv-flow-tour-nav">
        <button type="button" class="btn btn-sm" disabled={i === 0} onClick={() => (flowTourStep.value = i - 1)}>
          {tv('flow.tour.prev')}
        </button>
        <button type="button" class="btn btn-sm" disabled={step?.at === 'none'} onClick={() => setNonce(nonce + 1)}>
          {tv('flow.tour.replay')}
        </button>
        <button type="button" class="btn btn-sm" disabled={i === last} onClick={() => (flowTourStep.value = i + 1)}>
          {tv('flow.tour.next')}
        </button>
      </div>
    </section>
  );
}

function Legend({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div class="hv-legend">
      <button type="button" class="hv-legend-toggle" aria-expanded={open} aria-label={tv('legend.toggle')} onClick={onToggle}>
        {tv('legend.title')}
        <span aria-hidden="true">{open ? ' ▾' : ' ▸'}</span>
      </button>
      {open && (
        <ul>
          {LEGEND.map((it) => (
            <li key={it.key}>
              <span class={`hv-sw${it.ring ? ' hv-sw-ring' : ''}`} style={{ background: it.color }} aria-hidden="true" />
              {tv(it.key)}
            </li>
          ))}
          {flowShown() &&
            flowLegendRows(store.slice.value.enabled, flowStyle.value).map((it) => (
              <li key={it.key} class={it.tone ? undefined : 'hv-legend-note'}>
                {it.tone && <span class="hv-sw" style={{ background: FLOW_COLORS[store.theme.value][it.tone] }} aria-hidden="true" />}
                {tv(it.key)}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
