/**
 * Tool rail on the right edge of the heart box (icon-only, labels as tooltips): view presets, 3D layers, colour key and
 * the Wiggers diagram open a glass popover beside the rail; the calipers button places/removes the calipers on the
 * rhythm strip, which slides over the ECG hero; the last button enlarges the heart box (Shell's `heart-large` class). The popover closes with Esc, its close button, the same rail button,
 * or a click outside rail and popover.
 */
import { useEffect, useRef } from 'preact/hooks';
import { WiggersPanel } from '../../ecg';
import { placeCalipers } from '../../ecg/caliperPlace';
import { te } from '../../i18n/ecg';
import { tm } from '../../i18n/modes';
import { ts } from '../../i18n/shell';
import { tv } from '../../i18n/view3d';
import type { SimEngine } from '../../sim/types';
import { bloodFlow, FLOW_COLORS, flowLegendRows, flowStyle } from '../../view3d/flowControls';
import { CAMERA_PRESETS, cameraPreset, heartEnlarged, LEGEND, PRESET_KEYS, requestCameraPreset } from '../../view3d/viewControls';
import type { AppCommands } from '../commands';
import { LayerToggles } from '../modes/overview';
import { store } from '../store';
import { Icon } from './controls';
import type { IconName } from './controls';
import { railPanel, sheet } from './overlays';
import type { RailPanel } from './overlays';

const PANELS: readonly { readonly k: RailPanel; readonly icon: IconName }[] = [
  { k: 'view', icon: 'eye' },
  { k: 'layers', icon: 'layers' },
  { k: 'legend', icon: 'swatches' },
  { k: 'wiggers', icon: 'wave' },
];

export interface ToolRailProps {
  readonly engine: SimEngine;
  readonly commands: AppCommands;
}

export function ToolRail({ engine, commands }: ToolRailProps) {
  const open = railPanel.value;
  const lead = store.selectedLead.value;
  const preset = cameraPreset.value;
  const calipersOn = store.calipers.value !== null;
  const enlarged = heartEnlarged.value;
  // the flow rows describe a layer that is drawn only at heart scale (hidden with the torso)
  const flowOn = bloodFlow.value && !store.layers.value.torso;
  const rail = useRef<HTMLElement>(null);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Focus moves into the popover when it opens and back to the rail button when it closes (unless the student has
  // already moved focus elsewhere, e.g. by clicking another rail button or the ECG).
  useEffect(() => {
    if (!open) return;
    const p = panel.current;
    opener.current = document.activeElement as HTMLElement | null;
    p?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (rail.current?.contains(t) || panel.current?.contains(t))) return;
      railPanel.value = null;
    };
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      const a = document.activeElement;
      if (!a || a === document.body || p?.contains(a)) opener.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const label = (k: RailPanel): string =>
    k === 'view'
      ? `${ts('shell.rail.view')} · ${tv(PRESET_KEYS[preset].label, { lead })}`
      : k === 'layers'
        ? tm('ov.layers')
        : k === 'legend'
          ? tv('legend.title')
          : ts('shell.rail.wiggers');
  const title = (k: RailPanel): string => (k === 'view' ? ts('shell.rail.view') : label(k));

  return (
    <>
      <nav class="glass rail" ref={rail} aria-label={ts('shell.rail')}>
        {PANELS.map(({ k, icon }) => (
          <button
            type="button"
            class="rail-btn"
            aria-label={label(k)}
            title={label(k)}
            aria-expanded={open === k}
            aria-controls={open === k ? 'rail-panel' : undefined}
            onClick={() => (railPanel.value = open === k ? null : k)}
          >
            <Icon name={icon} />
          </button>
        ))}
        <button
          type="button"
          class="rail-btn"
          aria-label={te('cal.toggle')}
          title={te('cal.toggle')}
          aria-pressed={calipersOn}
          onClick={() => {
            if (store.calipers.peek()) {
              store.calipers.value = null;
              return;
            }
            // the readout and the mode switch (interval / QT) live with the rhythm strip
            placeCalipers(engine, commands, 'II');
            sheet.value = 'rhythm';
          }}
        >
          <Icon name="calipers" />
        </button>
        <button
          type="button"
          class="rail-btn"
          aria-label={enlarged ? tv('view.shrink') : tv('view.enlarge')}
          title={enlarged ? tv('view.shrink') : tv('view.enlarge')}
          aria-pressed={enlarged}
          onClick={() => (heartEnlarged.value = !enlarged)}
        >
          <Icon name={enlarged ? 'shrink' : 'expand'} />
        </button>
      </nav>

      {open && (
        <section
          id="rail-panel"
          ref={panel}
          class={`glass rail-panel rail-panel-${open}`}
          aria-labelledby="rail-panel-title"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            e.preventDefault();
            railPanel.value = null;
          }}
        >
          <header class="rail-panel-head">
            <h2 id="rail-panel-title">{title(open)}</h2>
            <button type="button" class="btn icon-btn btn-ghost" aria-label={ts('about.close')} title={ts('about.close')} onClick={() => (railPanel.value = null)}>
              <Icon name="close" />
            </button>
          </header>
          {open === 'view' && (
            <div class="view-presets" role="group" aria-label={tv('toolbar.label')}>
              {CAMERA_PRESETS.map((p) => (
                <button type="button" class="btn btn-sm" aria-pressed={preset === p} title={tv(PRESET_KEYS[p].aria, { lead })} onClick={() => requestCameraPreset(p)}>
                  {tv(PRESET_KEYS[p].label, { lead })}
                </button>
              ))}
            </div>
          )}
          {open === 'layers' && <LayerToggles bare />}
          {open === 'legend' && (
            <ul class="rail-legend">
              {LEGEND.map((it) => (
                <li key={it.key}>
                  <span class={`hv-sw${it.ring ? ' hv-sw-ring' : ''}`} style={{ background: it.color }} aria-hidden="true" />
                  {tv(it.key)}
                </li>
              ))}
              {flowOn &&
                flowLegendRows(store.slice.value.enabled, flowStyle.value).map((it) => (
                  <li key={it.key} class={it.tone ? undefined : 'hv-legend-note'}>
                    {it.tone && <span class="hv-sw" style={{ background: FLOW_COLORS[store.theme.value][it.tone] }} aria-hidden="true" />}
                    {tv(it.key)}
                  </li>
                ))}
            </ul>
          )}
          {open === 'wiggers' && <WiggersPanel engine={engine} commands={commands} class="wiggers" />}
        </section>
      )}
    </>
  );
}
