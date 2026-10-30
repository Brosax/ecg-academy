/**
 * DEV ONLY — mounted by the shell at #/dev/viewer in development builds. Renders the dev fixture (one dipole source
 * projected on the 12 leads; src/ecg/dev/fixture.ts) in every layout with all tools, overlays, marks, pins, the
 * shared cursor, locate mode and the monitor, for manual checks in zh / en / es and light / dark.
 */
import { useSignal, type Signal } from '@preact/signals';
import { useMemo, useState } from 'preact/hooks';
import { LAYOUTS, type LayoutId } from '../../app/store';
import type { L10n } from '../../core/l10n';
import { lt } from '../../i18n';
import { te } from '../../i18n/ecg';
import { Button, Card } from '../../ui';
import { EcgView, Monitor, type EcgMark, type EcgPin, type PickEvent } from '../index';
import { fmtNum } from '../format';
import { store } from '../../app/store';
import { FIXTURE_PRESETS, makeFixtureEcg, type FixturePreset } from './fixture';

const PRESET_LABEL: Readonly<Record<FixturePreset, L10n>> = {
  normal: { zh: '正常窦性心律（含 U 波）', en: 'Normal sinus rhythm (with U waves)', es: 'Ritmo sinusal normal (con ondas U)' },
  inferiorStemi: { zh: '下壁 ST 段抬高', en: 'Inferior ST elevation', es: 'Elevación del ST inferior' },
  anteriorStemi: { zh: '前壁 ST 段抬高', en: 'Anterior ST elevation', es: 'Elevación del ST anterior' },
  wpw: { zh: '心室预激（δ 波）', en: 'Pre-excitation (δ wave)', es: 'Preexcitación (onda δ)' },
  osborn: { zh: 'Osborn 波（J 波）', en: 'Osborn (J) waves', es: 'Ondas J de Osborn' },
  mobitz2: { zh: '二度Ⅱ型房室传导阻滞', en: 'Second-degree AV block, Mobitz II', es: 'Bloqueo AV de segundo grado Mobitz II' },
  irregular: { zh: '窦性心律不齐（20 秒）', en: 'Sinus arrhythmia (20 s)', es: 'Arritmia sinusal (20 s)' },
};

const LAYOUT_NAME: Readonly<Record<LayoutId, Parameters<typeof te>[0]>> = {
  '3x4+1': 'layout3x4p1',
  '3x4+3': 'layout3x4p3',
  '6x2': 'layout6x2',
  '12x1': 'layout12x1',
  single: 'layoutSingle',
  strip: 'layoutStrip',
};

function CursorReadout(props: { readonly cursor: Signal<number | null> }) {
  const v = props.cursor.value;
  return (
    <span class="tabular" style={{ display: 'inline-block', minWidth: '14ch' }}>
      {te('demoCursor', { t: v === null ? '—' : fmtNum(store.lang.value, v) })}
    </span>
  );
}

function PlayButton(props: { readonly playing: Signal<boolean> }) {
  const on = props.playing.value;
  return (
    <Button size="sm" icon={on ? 'pause' : 'play'} onClick={() => (props.playing.value = !on)}>
      {on ? te('pause') : te('play')}
    </Button>
  );
}

function Check(props: { readonly label: string; readonly value: boolean; readonly onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
      <input type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.currentTarget.checked)} />
      {props.label}
    </label>
  );
}

export function ViewerDemo() {
  const [preset, setPreset] = useState<FixturePreset>('normal');
  const [waveLabels, setWaveLabels] = useState(true);
  const [intervals, setIntervals] = useState(true);
  const [st, setSt] = useState(false);
  const [withMarks, setWithMarks] = useState(false);
  const [locate, setLocate] = useState(false);
  const [picked, setPicked] = useState<PickEvent | null>(null);
  const cursor = useSignal<number | null>(null);
  const playing = useSignal(false);

  const ecg = useMemo(() => makeFixtureEcg({ ...FIXTURE_PRESETS[preset], seed: 11 }), [preset]);
  const longEcg = useMemo(() => makeFixtureEcg({ ...FIXTURE_PRESETS.irregular, seed: 5 }), []);

  const marks = useMemo((): readonly EcgMark[] => {
    const b = ecg.truth?.beats[1];
    const b2 = ecg.truth?.beats[2];
    if (!withMarks || !b || !b2) return [];
    return [
      { kind: 'bracket', lead: 'II', t0: b.pOn ?? b.qrsOn, t1: b.qrsOn, color: 'atrial', label: { zh: 'PR', en: 'PR', es: 'PR' } },
      { kind: 'region', lead: 'all', t0: b2.qrsOn, t1: b2.qrsOff, color: 'qrs', label: 'QRS' },
      { kind: 'wave', lead: 'V1', t: b2.tPeak ?? b2.tOff - 80, label: 'T', color: 'repol' },
      { kind: 'hline', lead: 'V5', mv: 0, color: 'vector', label: { zh: '基线', en: 'baseline', es: 'línea de base' } },
      { kind: 'arrow', lead: 'III', t: b.j + 60, mv: 0.15, color: 'injury', label: 'J+60' },
      { kind: 'lead', lead: 'aVL', color: 'highlight', label: { zh: '高侧壁', en: 'high lateral', es: 'lateral alta' } },
    ];
  }, [ecg, withMarks]);

  const pins = useMemo((): readonly EcgPin[] => (picked ? [{ lead: picked.lead, tMs: picked.tMs, tone: 'answer' }] : []), [picked]);
  const overlays = { waveLabels, intervals, stMarkers: st };
  const lang = store.lang.value;

  return (
    <div class="app-page" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--sp-5)', paddingBottom: 'var(--sp-7)' }}>
      <header class="app-pagehead">
        <h1>{te('demoTitle')}</h1>
        <p class="app-muted">{te('demoNote')}</p>
      </header>

      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3) var(--sp-5)', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            {te('demoFixture')}
            <select style={{ maxWidth: '16em' }} value={preset} onChange={(e) => setPreset(e.currentTarget.value as FixturePreset)}>
              {(Object.keys(FIXTURE_PRESETS) as FixturePreset[]).map((k) => (
                <option key={k} value={k}>
                  {lt(PRESET_LABEL[k])}
                </option>
              ))}
            </select>
          </label>
          <span>{te('demoOverlays')}:</span>
          <Check label={te('demoWaveLabels')} value={waveLabels} onChange={setWaveLabels} />
          <Check label={te('demoIntervals')} value={intervals} onChange={setIntervals} />
          <Check label={te('demoSt')} value={st} onChange={setSt} />
          <Check label={te('demoMarks')} value={withMarks} onChange={setWithMarks} />
          <Check
            label={te('demoPick')}
            value={locate}
            onChange={(v) => {
              setLocate(v);
              setPicked(null);
            }}
          />
          <CursorReadout cursor={cursor} />
          <span class="tabular" style={{ minWidth: '28ch', display: 'inline-block' }}>
            {picked ? te('demoPicked', { lead: picked.lead, t: fmtNum(lang, picked.tMs), mv: fmtNum(lang, picked.mv, 2, true) }) : ''}
          </span>
        </div>
      </Card>

      <section style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <EcgView
          ecg={ecg}
          toolbar
          overlays={overlays}
          marks={marks}
          pins={pins}
          cursor={cursor}
          onPick={locate ? setPicked : undefined}
          onCaliper={(m) => console.debug('[viewer demo] calipers', m)}
        />
      </section>

      <section style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{te('demoMonitor')}</h2>
        <div>
          <PlayButton playing={playing} />
        </div>
        <Monitor ecg={ecg} lead="II" seconds={6} playing={playing} cursor={cursor} />
        {/* uncontrolled: plays once on its own and shows its own play / pause button. No shared cursor: two playing
            monitors on one cursor would pause each other (each treats the other's writes as a click elsewhere). */}
        <Monitor ecg={ecg} lead="V1" seconds={4} />
      </section>

      {LAYOUTS.map((layout) => (
        <section key={layout} style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{te(LAYOUT_NAME[layout])}</h2>
          <EcgView
            ecg={layout === 'strip' ? longEcg : ecg}
            layout={layout}
            lead={layout === 'single' ? 'V1' : 'II'}
            window={layout === 'single' ? [1000, 3600] : undefined}
            overlays={overlays}
            marks={marks}
            cursor={cursor}
          />
        </section>
      ))}

      <section style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{`${te('layout3x4p1')} · ${te('cabrera')} · ½V · 50 mm/s`}</h2>
        <EcgView ecg={ecg} layout="3x4+1" cabrera chestHalfGain speed={50} gain={10} overlays={overlays} cursor={cursor} highlightLeads={['aVR']} />
      </section>

      <section style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{`${te('layoutSingle')} · 240 px`}</h2>
        <EcgView ecg={ecg} layout="single" lead="aVF" height={240} tools={{ calipers: true, magnifier: false, crosshair: true }} overlays={{ stMarkers: true }} />
      </section>

      <section style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{`${te('layout6x2')} · tools: false`}</h2>
        <EcgView ecg={ecg} layout="6x2" tools={false} gain={5} />
      </section>
    </div>
  );
}

export default ViewerDemo;
