/**
 * DEV ONLY — visual harness for the course pages (open /src/course/dev/harness.html#/learn with the Vite dev server).
 * Not part of the app build and independent of the other page modules. Synthetic sources listed in `?prime=` are
 * served by the ECG workstream's dev fixture, so lesson layouts and AutoMarks can be checked before src/synth exists.
 *   ?lang=en|es|zh  &theme=dark  &prime=normal (fixture preset used for every synthetic source of the shown lesson)
 *   ?fixture        plays the test fixture lesson (tests/course/fixtures/example-lesson.ts, every block kind) at
 *                   #/learn/<its id> with the real engines — the way to smoke-test the player before lessons exist
 */
import { render } from 'preact';
import '../../app/theme.css';
import '../../app/shell.css';
import '../../app/pages.css';
import { route, startRouter } from '../../app/router';
import { store } from '../../app/store';
import type { Lang } from '../../core/l10n';
import { FIXTURE_PRESETS, makeFixtureEcg, type FixturePreset } from '../../ecg/dev/fixture';
import type { EcgSource } from '../../practice/api';
import type { Block, Lesson } from '../api';
import { primeEcg } from '../deps';
import { ContinueLessonCard, LearnPage, LessonPage, wireCourse } from '../index';
import { LessonPlayer } from '../LessonPage';
import { LESSONS } from '../lessons/index';

const q = new URLSearchParams(location.search);
if (q.get('lang')) store.lang.value = q.get('lang') as Lang;
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!;
const preset = q.get('prime') as FixturePreset | null;

function sourcesOf(b: Block): EcgSource[] {
  switch (b.kind) {
    case 'hook':
    case 'ecg':
    case 'heart':
    case 'worked':
      return [b.ecg];
    case 'figure':
      return b.ecg ? [b.ecg] : [];
    case 'contrast':
      return [b.left.ecg, b.right.ecg];
    default:
      return [];
  }
}

if (preset && preset in FIXTURE_PRESETS) {
  let k = 0;
  for (const lesson of LESSONS.values()) {
    for (const b of lesson.blocks) {
      for (const s of sourcesOf(b)) {
        if (s.kind !== 'synth') continue;
        const names = Object.keys(FIXTURE_PRESETS) as FixturePreset[];
        const p = k++ % 2 === 0 ? preset : names[(names.indexOf(preset) + 1) % names.length];
        primeEcg(s, makeFixtureEcg({ ...FIXTURE_PRESETS[p], seed: s.req.seed }));
      }
    }
  }
}

wireCourse();
startRouter();

const fixture: Lesson | null = q.has('fixture') ? (await import('../../../tests/course/fixtures/example-lesson')).default : null;

function App() {
  const r = route.value;
  return (
    <div class="app">
      <main id="main" class="app-main">
        {r.name === 'lesson' && fixture && r.id === fixture.id ? (
          <LessonPlayer key={fixture.id} lesson={fixture} step={r.step} />
        ) : r.name === 'lesson' ? (
          <LessonPage id={r.id} step={r.step} />
        ) : r.name === 'home' ? (
          <div class="home-slot">
            <ContinueLessonCard />
          </div>
        ) : (
          <LearnPage />
        )}
      </main>
    </div>
  );
}

const root = document.getElementById('app');
if (root) render(<App />, root);
