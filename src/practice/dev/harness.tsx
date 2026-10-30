/**
 * DEV ONLY — visual harness for the practice pages (open /src/practice/dev/harness.html with the Vite dev server). Not
 * part of the app build. Uses the real synthetic engine and the real PTB-XL decoder; `?synth=fake` installs the
 * practice tests' fake engine instead (schematic signals, self-consistent truth, the full DECISION §9 catalogue — handy
 * to see families whose scenarios the real catalogue does not offer yet).
 * Query: ?lang=zh|en|es&theme=dark&synth=fake&real=fake  · hash routes as in the app (#/practice, #/practice/<id>, …).
 */
import { render } from 'preact';
import '../../app/theme.css';
import '../../app/shell.css';
import '../../app/pages.css';
import { route, startRouter } from '../../app/router';
import { store } from '../../app/store';
import type { Lang } from '../../core/l10n';
import { fakeReal, fakeSynth } from '../../../tests/practice/fake';
import { DrillPage, ExamPage, PracticePage, ProgressPage, setPracticePorts, wirePractice } from '../index';
import { ReviewsDueCard, ProgressDataControls } from '../ui/cards';

const q = new URLSearchParams(location.search);
if (q.get('lang')) store.lang.value = q.get('lang') as Lang;
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme') as string;
setPracticePorts({ ...(q.get('synth') === 'fake' ? { synth: fakeSynth } : {}), ...(q.get('real') === 'fake' ? { real: fakeReal } : {}) });
wirePractice();
startRouter();

function Page() {
  const r = route.value;
  switch (r.name) {
    case 'drill':
      return <DrillPage id={r.id} />;
    case 'exam':
      return <ExamPage />;
    case 'progress':
      return <ProgressPage />;
    case 'home':
      return (
        <div class="app-page">
          <div class="home-slot" style={{ maxWidth: '360px', border: '1px solid var(--border)', padding: '16px', borderRadius: '10px' }}>
            <ReviewsDueCard />
          </div>
          <ProgressDataControls />
        </div>
      );
    default:
      return <PracticePage />;
  }
}

function App() {
  return (
    <div style={{ padding: '16px 24px', background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <nav style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
        <a href="#/practice">practice</a>
        <a href="#/practice/mixed">mixed</a>
        <a href="#/practice/review">review</a>
        <a href="#/exam">exam</a>
        <a href="#/progress">progress</a>
        <a href="#/">home card</a>
        {(['zh', 'en', 'es'] as const).map((l) => (
          <button type="button" onClick={() => (store.lang.value = l)}>
            {l}
          </button>
        ))}
      </nav>
      <Page />
    </div>
  );
}

const root = document.getElementById('app');
if (root) render(<App />, root);
