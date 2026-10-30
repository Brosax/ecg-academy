/**
 * PUBLIC API of the 3D workstream (props are frozen).
 * <HeartView> mounts a three.js scene (scene.ts), follows store.mode / store.layers / store.slice / store.highlight /
 * store.selectedLead, and reads store.time.peek() in its own render loop. Overlay: camera presets + colour key, and,
 * while the blood-flow layer is on, a fixed-size one-line "blood now" chip (flowControls.flowNow, never store.time).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { tv } from '../i18n/view3d';
import type { SimEngine } from '../sim/types';
import { CAMERA_PRESETS } from './cameras';
import type { CameraPreset } from './cameras';
import { bloodFlow, FLOW_CAPTION_KEYS, FLOW_COLORS, flowLegendRows, flowNow, flowStyle } from './flowControls';
import { HeartScene } from './scene';
import { cameraPreset, cameraRequest, LEGEND, PRESET_KEYS } from './viewControls';
import './view3d.css';

export interface HeartViewProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
  readonly class?: string;
}

export function HeartView(props: HeartViewProps) {
  const host = useRef<HTMLDivElement>(null);
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

  const setPreset = (p: CameraPreset) => {
    scene.current?.setCameraPreset(p);
    cameraPreset.value = p;
  };

  const lead = store.selectedLead.value;
  return (
    <div class={`hv-root${props.class ? ` ${props.class}` : ''}`}>
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
