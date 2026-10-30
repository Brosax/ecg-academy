/**
 * The 10 s rhythm strip (with the calipers) slides over the lower part of the ECG hero when asked for (the tool rail's
 * calipers button). Mounted only while open, so its canvases do not draw in the background. Esc closes it, unless an
 * inner control used the key first (the calipers clear on the first Esc).
 */
import { RhythmStrip } from '../../ecg';
import { te } from '../../i18n/ecg';
import { ts } from '../../i18n/shell';
import type { SimEngine } from '../../sim/types';
import type { AppCommands } from '../commands';
import { Icon } from './controls';
import { sheet } from './overlays';

export function StageSheet({ engine, commands }: { readonly engine: SimEngine; readonly commands: AppCommands }) {
  if (!sheet.value) return null;
  const title = te('panel.rhythm', { lead: 'II' });
  return (
    <section
      class="glass stage-sheet stage-sheet-rhythm"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return;
        e.preventDefault();
        sheet.value = null;
      }}
    >
      <button type="button" class="btn icon-btn btn-ghost sheet-close" aria-label={ts('about.close')} title={ts('about.close')} onClick={() => (sheet.value = null)}>
        <Icon name="close" />
      </button>
      <div class="ecg-frame" data-local-keys="">
        <RhythmStrip engine={engine} commands={commands} lead="II" class="rhythm-strip" />
      </div>
    </section>
  );
}
