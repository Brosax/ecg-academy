/**
 * Cross-section mode. Hero: a large lead (II, or the tour's key lead while the tour runs) and the Wiggers diagram on
 * the same clock. Side (under the heart): the guided tour and the slice controls — presets (SLICE_PRESETS), the LVOT
 * (three-chamber) cut, a custom tilt / rotation / offset and the propagation arrows, all via commands.setSlice.
 * The LVOT cut is geometry-derived (view3d/core/lvotSlice.ts) and goes in as preset 'custom' until the frozen
 * SlicePreset union has an 'lvot' member.
 */
import { useRef } from 'preact/hooks';
import { LeadDetail, WiggersPanel } from '../../ecg';
import { tm } from '../../i18n/modes';
import { TourPanel } from '../../tour/TourPanel';
import { lvotSlice, lvotSliceKey } from '../../view3d/core/lvotSlice';
import { SLICE_PRESETS } from '../commands';
import { store } from '../store';
import type { SlicePreset } from '../store';
import { Range, Toggle } from '../ui/controls';
import { anglesFromNormal, normalFromAngles, SLICE_OFFSET_RANGE_MM } from './sliceAngles';
import type { ModeProps, ModeView } from './types';

const PRESETS = Object.keys(SLICE_PRESETS) as SlicePreset[];

export function SliceControls({ engine, commands }: Pick<ModeProps, 'engine' | 'commands'>) {
  const s = store.slice.value;
  const lvot = lvotSlice(engine.geometry);
  const a = anglesFromNormal(s.normal);
  // keep the last azimuth while the normal sits on the long axis (short-axis cuts), so the slider does not jump
  const lastRot = useRef(90);
  if (a.rotDeg !== null) lastRot.current = a.rotDeg;
  const tilt = Math.round(a.tiltDeg), rot = Math.round(lastRot.current);
  const setCustom = (t: number, r: number) => commands.setSlice({ enabled: true, preset: 'custom', normal: normalFromAngles(t, r) });
  return (
    <section class="card" aria-labelledby="slice-title">
      <h2 id="slice-title">{tm('sec.slice')}</h2>
      <Toggle label={tm('sec.enabled')} checked={s.enabled} onChange={(v) => commands.setSlice({ enabled: v })} />
      <h3>{tm('sec.presets')}</h3>
      <div class="seg preset-grid" role="group" aria-label={tm('sec.presets')}>
        {PRESETS.map((p) => (
          <button type="button" class="btn btn-sm" aria-pressed={s.enabled && s.preset === p} onClick={() => commands.setSlice(p)}>
            {tm(`sec.preset.${p}`)}
          </button>
        ))}
        {lvot && (
          <button
            type="button"
            class="btn btn-sm"
            title={tm('sec.preset.lvot.title')}
            aria-pressed={s.enabled && lvotSliceKey(engine.geometry, s) === 'lvot'}
            onClick={() => commands.setSlice({ enabled: true, preset: 'custom', normal: lvot.normal, offsetMm: lvot.offsetMm })}
          >
            {tm('sec.preset.lvot')}
          </button>
        )}
      </div>
      <h3>{tm('sec.custom')}</h3>
      <Range id="slice-tilt" label={tm('sec.tilt')} min={0} max={180} step={1} value={tilt} display={`${tilt}°`} onInput={(v) => setCustom(v, rot)} />
      <Range id="slice-rot" label={tm('sec.rotate')} min={-180} max={180} step={1} value={rot} display={`${rot}°`} onInput={(v) => setCustom(tilt, v)} />
      <Range
        id="slice-offset"
        label={tm('sec.offset')}
        min={SLICE_OFFSET_RANGE_MM.min}
        max={SLICE_OFFSET_RANGE_MM.max}
        step={1}
        value={Math.round(s.offsetMm)}
        display={`${Math.round(s.offsetMm)} mm`}
        onInput={(v) => commands.setSlice({ enabled: true, preset: 'custom', offsetMm: v })}
      />
      <Toggle label={tm('sec.arrows')} checked={s.arrows} onChange={(v) => commands.setSlice({ arrows: v })} />
      <p class="fine-print">{tm('sec.hint')}</p>
    </section>
  );
}

/** Hero: the lead that the tour is talking about (II otherwise), and the Wiggers diagram on the same clock. */
function SectionHero({ engine, commands }: ModeProps) {
  const touring = store.tourStep.value !== null;
  const lead = touring ? store.selectedLead.value : 'II';
  return (
    <>
      <section class="hero-primary ecg-frame" data-local-keys="" data-strip-fill="" aria-label={tm('sec.leadTitle', { lead })}>
        <LeadDetail engine={engine} commands={commands} lead={lead} class="lead-detail" />
      </section>
      <div class="hero-secondary hero-wiggers">
        <WiggersPanel engine={engine} commands={commands} class="wiggers" />
      </div>
    </>
  );
}

/** Under the heart: the guided tour, then the slice controls. */
function SectionSide({ engine, commands }: ModeProps) {
  return (
    <>
      <TourPanel engine={engine} commands={commands} />
      <SliceControls engine={engine} commands={commands} />
    </>
  );
}

export const SectionMode: ModeView = { Hero: SectionHero, Side: SectionSide };
