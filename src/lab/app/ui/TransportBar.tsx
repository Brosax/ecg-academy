/**
 * Transport: play/pause, previous/next phase (commands.stepPhase), speed 0.05–1 with presets, heart rate 40–150.
 * Only the small DockTime read-out subscribes to store.now (10 Hz), so the bar itself does not re-render while playing;
 * never store.time.value in render.
 */
import type { ComponentChildren } from 'preact';
import { fmtCompact, fmtNum } from '../../explain/vector';
import { tc } from '../../i18n/common';
import { ts } from '../../i18n/shell';
import { SCENARIOS } from '../../sim/scenarios/library';
import { rateKind } from '../../sim/scenarios/rate';
import type { AppCommands } from '../commands';
import { store } from '../store';
import { Icon } from './controls';
import { ShortcutHint } from './ShortcutHint';

const SPEED_PRESETS = [0.1, 0.25, 0.5, 1] as const;

const fmtSpeed = (x: number) => fmtCompact(x, store.lang.value);

/** t = … s, from store.now (hidden at ≥ 1024 px, where the "now" strip shows the time). */
function DockTime() {
  return (
    <span class="time-readout" aria-live="off">
      {ts('shell.time', { s: fmtNum(store.now.value.tMs / 1000, 2, store.lang.value) })}
    </span>
  );
}

export interface TransportBarProps {
  readonly commands: AppCommands;
  /** Rendered between the play group and the speed group (the shell puts the cycle timeline here). */
  readonly middle?: ComponentChildren;
}

export function TransportBar({ commands, middle }: TransportBarProps) {
  const playing = store.playing.value;
  const speed = store.speed.value;
  const hr = store.heartRate.value;
  // which pacemaker the control drives in the current scenario (sinus node, VT focus, junction, AV node in AF, atria)
  const sc = SCENARIOS[store.scenario.value.id];
  const kind = sc ? rateKind(sc) : 'sinus';
  const hrLabel = kind === 'sinus' ? tc('ctl.heartRate') : ts(`shell.hr.kind.${kind}`);
  // VF: no pacemaker drives the ventricles — the control is disabled and shows no rate
  const noRate = kind === 'none';
  return (
    <section class="transport" aria-label={ts('shell.transport')}>
      <div class="transport-group play-group">
        <button type="button" class="btn icon-btn" aria-label={tc('ctl.stepBack')} title={tc('ctl.stepBack')} onClick={() => commands.stepPhase(-1)}>
          <Icon name="prev" />
        </button>
        <button type="button" class="btn btn-primary play-btn" onClick={() => commands.togglePlay()}>
          <Icon name={playing ? 'pause' : 'play'} />
          {/* both labels occupy the same cell, so the button keeps its width when Play ↔ Pause toggles */}
          <span class="stable-stack inline">
            <span class={playing ? 'is-ghost' : 'is-active'} aria-hidden={playing ? 'true' : undefined}>
              {tc('ctl.play')}
            </span>
            <span class={playing ? 'is-active' : 'is-ghost'} aria-hidden={playing ? undefined : 'true'}>
              {tc('ctl.pause')}
            </span>
          </span>
        </button>
        <button type="button" class="btn icon-btn" aria-label={tc('ctl.stepForward')} title={tc('ctl.stepForward')} onClick={() => commands.stepPhase(1)}>
          <Icon name="next" />
        </button>
        <DockTime />
      </div>

      {middle}

      <div class="transport-group speed-group">
        <label for="speed-range">{tc('ctl.speed')}</label>
        <input
          id="speed-range"
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={speed}
          aria-valuetext={ts('shell.speed.value', { x: fmtSpeed(speed) })}
          onInput={(e) => commands.setSpeed(Number(e.currentTarget.value))}
        />
        <output for="speed-range" class="readout">
          {ts('shell.speed.value', { x: fmtSpeed(speed) })}
        </output>
        <div class="seg" role="group" aria-label={ts('shell.speed.presets')}>
          {SPEED_PRESETS.map((x) => (
            <button type="button" class="btn btn-sm" aria-pressed={Math.abs(speed - x) < 1e-6} onClick={() => commands.setSpeed(x)}>
              {ts('shell.speed.value', { x: fmtSpeed(x) })}
            </button>
          ))}
        </div>
      </div>

      <div class="transport-group hr-group">
        <label for="hr-range" class="hr-label one-line" title={hrLabel}>
          {hrLabel}
        </label>
        <input
          id="hr-range"
          type="range"
          min={40}
          max={150}
          step={1}
          value={hr}
          disabled={noRate}
          aria-valuetext={noRate ? hrLabel : ts('shell.hr.value', { bpm: hr })}
          onInput={(e) => commands.setHeartRate(Number(e.currentTarget.value))}
        />
        <output for="hr-range" class="readout">
          {noRate ? (
            '—'
          ) : (
            <>
              {ts('shell.hr.value', { bpm: hr })}
              <span class="muted"> · {ts(kind === 'atrial' ? 'shell.hr.pp' : 'shell.hr.rr', { ms: Math.round(60000 / hr) })}</span>
            </>
          )}
        </output>
      </div>

      <ShortcutHint />
    </section>
  );
}
