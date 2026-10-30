/**
 * Overview mode (ECG-first layout). The hero is the 12-lead ECG (sync 3×4 or clinical layout, segment bands, "1 mV"
 * calibration pulse); clicking a trace freezes the heart at that instant and selects the lead. The side panel holds
 * the "now" strip (step ①), the heart and the caption; the "why does lead X look like this now?" button opens the
 * causal chain (② H → ③ projection → ④ the lead) over the heart. The 3D layers live in the tool rail's popover.
 */
import { Ecg12 } from '../../ecg';
import { tm } from '../../i18n/modes';
import { bloodFlow, FLOW_COLORS, flowStyle, flowSwatch } from '../../view3d/flowControls';
import { store } from '../store';
import type { Layers } from '../store';
import { Range, Toggle } from '../ui/controls';
import type { ModeProps, ModeView } from './types';

function setLayer<K extends keyof Layers>(k: K, v: Layers[K]) {
  store.layers.value = { ...store.layers.peek(), [k]: v };
}

const LAYER_TOGGLES = [
  ['conduction', 'ov.layer.conduction', '--c-conduction'],
  ['vector', 'ov.layer.vector', '--c-vector'],
  ['vcgTrail', 'ov.layer.vcgTrail', '--c-vector'],
  ['valves', 'ov.layer.valves', undefined],
  ['labels', 'ov.layer.labels', undefined],
] as const;

/** 3D layer switches + contraction amplitude; `bare` drops the card and its title (the rail popover has its own). */
export function LayerToggles({ bare = false }: { readonly bare?: boolean }) {
  const layers = store.layers.value;
  const body = (
    <>
      <div class="toggle-grid">
        {LAYER_TOGGLES.map(([k, label, token]) => (
          <Toggle label={tm(label)} checked={layers[k]} swatch={token ? `var(${token})` : undefined} onChange={(v) => setLayer(k, v)} />
        ))}
        <Toggle
          label={tm('ov.layer.autoHighlight')}
          checked={store.autoHighlight.value}
          onChange={(v) => (store.autoHighlight.value = v)}
        />
        {/* not a Layers key (the store is frozen): a view3d signal, wired like autoHighlight */}
        <Toggle
          label={tm('ov.layer.bloodFlow')}
          checked={bloodFlow.value}
          swatch={flowSwatch(FLOW_COLORS[store.theme.value])}
          onChange={(v) => (bloodFlow.value = v)}
        />
        {bloodFlow.value && (
          <Toggle
            label={tm('ov.layer.bloodCells')}
            checked={flowStyle.value === 'cells'}
            onChange={(v) => (flowStyle.value = v ? 'cells' : 'comets')}
          />
        )}
      </div>
      <Range
        id="contraction-range"
        label={tm('ov.layer.contraction')}
        min={0}
        max={1}
        step={0.05}
        value={layers.contraction}
        display={`${Math.round(layers.contraction * 100)}%`}
        onInput={(v) => setLayer('contraction', v)}
      />
    </>
  );
  if (bare) return <div class="layer-toggles">{body}</div>;
  return (
    <section class="card" aria-labelledby="layers-title">
      <h2 id="layers-title">{tm('ov.layers')}</h2>
      {body}
    </section>
  );
}

/** The hero: the 12-lead ECG, filling the main area. */
function OverviewHero({ engine, commands }: ModeProps) {
  return (
    <div class="hero-primary ecg-frame" data-local-keys="">
      <Ecg12 engine={engine} commands={commands} class="ecg12" />
    </div>
  );
}

/** Nothing under the heart: it gets the whole side panel. */
function OverviewSide(_: ModeProps) {
  return null;
}

export const OverviewMode: ModeView = { Hero: OverviewHero, Side: OverviewSide };
