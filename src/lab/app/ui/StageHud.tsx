/**
 * Read-outs of the side panel (ECG-first layout): the "now" strip above the heart (time, electrical segment, mechanical
 * phase, structures taking part, and the button that opens the causal chain for the selected lead) and the
 * one-sentence caption under the heart. Both re-render from store.now (~10 Hz) and keep a fixed size whatever the
 * text, so nothing around them moves.
 */
import { captionSentences, fmtNum } from '../../explain';
import { tc } from '../../i18n/common';
import { tm } from '../../i18n/modes';
import { ts } from '../../i18n/shell';
import type { SimEngine } from '../../sim/types';
import { store } from '../store';
import { Icon } from './controls';
import { explainOpen, WHY_BUTTON_ID } from './overlays';

export function NowStrip() {
  const now = store.now.value;
  const lang = store.lang.value;
  const lead = store.selectedLead.value;
  const open = explainOpen.value;
  const names = now.responsible.map((r) => tc(`struct.${r.id}`));
  const why = tm('ov.explainTitle', { lead });
  return (
    <div class="now-strip" role="group" aria-label={tm('ov.now')} aria-live="off">
      <div class="now-row">
        <span class="now-t tnum">
          <small>t = </small>
          {fmtNum(now.tMs / 1000, 2, lang)}
          <small> s</small>
        </span>
        <span class={`seg-badge${now.segment ? ` seg-${now.segment}` : ''}`} title={tm('ov.segment')}>
          {now.segment ? tc(`seg.${now.segment}`) : tm('ov.none')}
        </span>
        <span class="now-mech one-line" title={tm('ov.mech')}>
          {now.mech ? tc(`mech.${now.mech}`) : tm('ov.none')}
        </span>
      </div>
      <div class="now-row now-row-2">
        <p class="now-structs one-line">
          <span class="now-k">{tm('ov.structures')}</span> {names.length ? names.join(' · ') : tm('ov.none')}
        </p>
        <button
          type="button"
          id={WHY_BUTTON_ID}
          class="btn btn-sm now-why"
          aria-expanded={open}
          aria-controls="explain-pop"
          aria-haspopup="dialog"
          title={why}
          onClick={() => (explainOpen.value = !explainOpen.peek())}
        >
          <Icon name="quiz" />
          {/* the short label is the accessible name; the tooltip keeps the full question */}
          <span>{tm('ov.whyShort', { lead })}</span>
        </button>
      </div>
    </div>
  );
}

/** One short sentence (cap.*) on screen; the full one (ctx.*) as its tooltip. */
export function StageCaption({ engine }: { readonly engine: SimEngine }) {
  const now = store.now.value;
  const { caption, context } = captionSentences(engine, now.tMs, store.lang.value);
  return (
    <div class="stage-caption" role="group" aria-label={ts('shell.caption')} aria-live="off">
      <span title={context}>{caption}</span>
    </div>
  );
}
