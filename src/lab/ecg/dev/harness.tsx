/**
 * DEV-ONLY harness (not part of the build): every ECG component on the StubEngine with the real clock and commands.
 * Open /src/lab/ecg/dev/harness.html on the Vite dev server. In ECG Academy the lab tokens live on .lab-root and the dark
 * theme comes from <html data-theme> (written by the host), so the harness wraps everything in .lab-root and its theme
 * button sets that attribute itself.
 */
import { render } from 'preact';
import { startClock } from '../../app/clock';
import { createCommands } from '../../app/commands';
import { store } from '../../app/store';
import { installTheme } from '../../app/theme';
import '../../app/theme.css';
import { LANGS } from '../../i18n';
import { StubEngine } from '../../sim/stub/stubEngine';
import { Ecg12, HexaxialDiagram, HorizontalPlaneDiagram, LeadDetail, RhythmStrip, TimelineBar, WiggersPanel } from '../index';

const engine = new StubEngine();
const commands = createCommands(engine);
installTheme();
startClock(engine);

function Controls() {
  const playing = store.playing.value;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', padding: '8px 0' }}>
      <button type="button" class="ecg-btn" onClick={() => commands.togglePlay()}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" class="ecg-btn" onClick={() => commands.stepPhase(-1)}>
        ◀
      </button>
      <button type="button" class="ecg-btn" onClick={() => commands.stepPhase(1)}>
        ▶
      </button>
      <label>
        HR <input type="range" min={40} max={150} value={store.heartRate.value} onInput={(e) => commands.setHeartRate(+(e.target as HTMLInputElement).value)} />
        {store.heartRate.value}
      </label>
      <label>
        speed{' '}
        <input type="range" min={0.05} max={1} step={0.05} value={store.speed.value} onInput={(e) => commands.setSpeed(+(e.target as HTMLInputElement).value)} />
      </label>
      {LANGS.map((l) => (
        <button type="button" class="ecg-btn" aria-pressed={store.lang.value === l.id} onClick={() => (store.lang.value = l.id)}>
          {l.label}
        </button>
      ))}
      <button type="button" class="ecg-btn" onClick={() => {
          store.theme.value = store.theme.value === 'light' ? 'dark' : 'light';
          document.documentElement.dataset.theme = store.theme.value;
        }}>
        theme
      </button>
      <span>
        highlight: <code>{store.highlight.value.join(', ') || '—'}</code>
      </span>
    </div>
  );
}

function Harness() {
  const p = { engine, commands };
  return (
    <div class="lab-root" style={{ height: '100vh' }}>
    <div class="lab-viewport">
    <div style={{ padding: '12px 16px', display: 'grid', gap: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <Controls />
      <TimelineBar {...p} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '16px' }}>
        <Ecg12 {...p} />
        <LeadDetail {...p} lead={store.selectedLead.value} showProjection />
      </div>
      <RhythmStrip {...p} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
        <WiggersPanel {...p} />
        <HexaxialDiagram {...p} />
        <HorizontalPlaneDiagram {...p} />
      </div>
    </div>
    </div>
    </div>
  );
}

render(<Harness />, document.getElementById('app')!);
