/**
 * The transport row of a scene (spec §2.7): replay · prev · play-this-beat · next · beat dots · counter · scrub slider
 * · optional slow-motion chip. Fixed height; every button is always rendered (disabled at the ends or while the source
 * is not ready), so nothing appears or disappears during playback. Under reduced motion one note line is added.
 */
import { Icon } from '../../ui/index';
import { ReplayButton, Slider, useUid } from '../shared';
import { tsn } from './strings';
import type { SceneState } from './useScene';

export function SceneTransport<Id extends string>(props: {
  readonly scene: SceneState<Id>;
  /** label of each beat dot (title attribute + aria), by beat id; default: the counter */
  readonly beatLabel?: (id: Id, i: number) => string;
  /** slow-motion factor shown as a chip (×k) */
  readonly slow?: number;
  /** show the "play this beat" button (default true) */
  readonly playBeat?: boolean;
}) {
  const s = props.scene;
  const uid = useUid('sc');
  const n = s.beats.length;
  const disabled = !s.ready;
  const pct = Math.round(s.p * 1000) / 10;
  const display = s.window ? tsn('scMs', { ms: Math.round(s.window[0] + (s.window[1] - s.window[0]) * s.p) }) : tsn('scPct', { pct: Math.round(pct) });
  const widest = s.window ? [tsn('scMs', { ms: Math.round(Math.max(Math.abs(s.window[0]), Math.abs(s.window[1]))) })] : [tsn('scPct', { pct: 100 })];
  return (
    <div class="sc-transport">
      <div class="sc-transport__row">
        <ReplayButton onClick={s.replay} />
        <span class="fg-btn-group" role="group">
          <button type="button" class="fg-btn sc-btn" onClick={s.prev} disabled={disabled || s.i <= 0} aria-label={tsn('scPrev')} title={tsn('scPrev')}>
            <Icon name="prev" size={16} />
          </button>
          {props.playBeat !== false && (
            <button type="button" class="fg-btn sc-btn" onClick={() => s.playBeat(s.i)} disabled={disabled || s.playing} aria-label={tsn('scPlayBeat')} title={tsn('scPlayBeat')}>
              <Icon name="play" size={16} />
            </button>
          )}
          <button type="button" class="fg-btn sc-btn" onClick={s.next} disabled={disabled || s.i >= n - 1} aria-label={tsn('scNext')} title={tsn('scNext')}>
            <Icon name="next" size={16} />
          </button>
        </span>
        <span class="sc-bar" role="group" aria-label={tsn('scScrub')}>
          {s.beats.map((b, k) => {
            const label = props.beatLabel ? props.beatLabel(b.id, k) : tsn('scGoBeat', { i: k + 1 });
            return (
              <button
                type="button"
                class={`sc-bar__seg ${k === s.i ? 'is-on' : ''} ${b.to <= s.p ? 'is-done' : ''}`}
                style={{ flexGrow: Math.max(0.05, b.to - b.from) }}
                aria-pressed={k === s.i}
                aria-label={label}
                title={label}
                disabled={disabled}
                onClick={() => s.seekBeat(k)}
              >
                <span class="sc-bar__fill" style={{ width: `${Math.round(100 * (b.to <= b.from ? 1 : Math.min(1, Math.max(0, (s.p - b.from) / (b.to - b.from)))))}%` }} />
              </button>
            );
          })}
        </span>
        <span class="sc-counter tabular" aria-live="off">
          {tsn('scBeatOf', { i: n ? s.i + 1 : 0, n })}
        </span>
        <Slider id={`${uid}-p`} label={tsn('scScrub')} value={Math.round(s.p * 1000)} min={0} max={1000} onInput={(v) => s.seek(v / 1000)} display={display} displayReserve={widest} />
        {props.slow != null && props.slow !== 1 && <span class="sc-chip sc-chip--muted tabular">{tsn('scSlow', { k: props.slow })}</span>}
      </div>
      {s.reduced && <div class="sc-note">{tsn('scReduced')}</div>}
    </div>
  );
}
