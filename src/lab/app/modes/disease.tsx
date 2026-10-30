/**
 * Disease mode (round 2): pick a condition in the left column, watch the 12-lead ECG (the hero) and the 3D heart change
 * together, read what happens and the ECG criteria under the heart. The hero's secondary row shows the selected key
 * lead enlarged. Conditions without a scenario yet are listed as "coming soon" (no fake controls).
 * Layout stability: the info card has fixed-height text regions, so switching conditions never shifts the page.
 */
import { Ecg12, LeadDetail } from '../../ecg';
import { td } from '../../i18n/disease';
import type { DiseaseKey } from '../../i18n/disease/zh';
import { tm } from '../../i18n/modes';
import { SCENARIOS } from '../../sim/scenarios/library';
import type { LeadName } from '../../sim/types';
import { store } from '../store';
import { diseasesByCategory } from './diseaseCatalog';
import type { DiseaseId } from './diseaseCatalog';
import type { ModeProps, ModeView } from './types';

const has = (key: string): key is DiseaseKey => key in TEXT_KEYS;
// keys present in the disease dictionary (mechanism / criteria / 3D note per implemented condition)
const TEXT_KEYS: Readonly<Record<string, true>> = Object.fromEntries(
  Object.keys(SCENARIOS).flatMap((id) => [`${id}.mech`, `${id}.criteria`, `${id}.in3d`].map((k) => [k, true] as const)),
);

/** The far-left column: conditions by category. */
function DiseasePicker({ commands }: ModeProps) {
  const cur = store.scenario.value;
  const groups = diseasesByCategory();
  return (
    <section class="card dz-picker" aria-labelledby="dz-pick-title">
      <h2 id="dz-pick-title">{td('ui.pick')}</h2>
      <div class="dz-picker-list">
        {groups.map((g) => (
          <section class="dz-cat" aria-labelledby={`dzp-${g.category}`}>
            <h3 id={`dzp-${g.category}`}>{tm(`dzcat.${g.category}`)}</h3>
            <ul>
              {g.items.map((d) => {
                const ok = d.id in SCENARIOS;
                const active = cur.id === d.id;
                return (
                  <li>
                    <button
                      type="button"
                      class={`dz-item${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      title={tm(`dz.${d.id}`)}
                      disabled={!ok || cur.loading}
                      onClick={() => void commands.setScenario(d.id)}
                    >
                      <span class="dz-name">{tm(`dz.${d.id}`)}</span>
                      {/* the active row is marked by its fill; only conditions without a scenario carry a badge */}
                      {!ok && <span class="badge">{td('ui.soon')}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

/** Hero: the 12-lead ECG, and the selected key lead enlarged under it. */
function DiseaseHero({ engine, commands }: ModeProps) {
  const lead = store.selectedLead.value;
  return (
    <>
      <div class="hero-primary ecg-frame" data-local-keys="">
        <Ecg12 engine={engine} commands={commands} class="ecg12" />
      </div>
      <div class="hero-secondary hero-strip" data-strip-fill="">
        <div class="ecg-frame" data-local-keys="">
          <LeadDetail engine={engine} commands={commands} lead={lead} class="lead-detail" />
        </div>
      </div>
    </>
  );
}

/** Under the heart: what happens, the ECG criteria, the key leads (one click enlarges one in the hero). */
function DiseaseSide({ commands }: ModeProps) {
  const cur = store.scenario.value;
  const sc = SCENARIOS[cur.id];
  const lead = store.selectedLead.value;
  const text = (k: string) => (has(k) ? td(k) : '');
  const criteria = text(`${cur.id}.criteria`).split('\n').filter(Boolean);
  const keyLeads: readonly LeadName[] = sc?.teach?.keyLeads ?? [];
  return (
    <section class="card dz-info" aria-labelledby="dz-info-title" aria-busy={cur.loading}>
      <div class="dz-head">
        <h2 id="dz-info-title" class="one-line" title={tm(`dz.${cur.id as DiseaseId}`)}>
          {tm(`dz.${cur.id as DiseaseId}`)}
        </h2>
        <span class="badge badge-ok">{cur.loading ? td('ui.loading') : td('ui.active')}</span>
      </div>
      <div class="dz-keyleads" role="group" aria-label={td('ui.keyLeads')}>
        <span class="muted">{td('ui.keyLeads')}</span>
        {keyLeads.map((l) => (
          <button type="button" class="chip chip-btn" aria-pressed={lead === l} onClick={() => commands.selectLead(l)}>
            {l}
          </button>
        ))}
        {cur.id !== 'normal-sinus-rhythm' && (
          <button type="button" class="btn btn-sm" disabled={cur.loading} onClick={() => void commands.setScenario('normal-sinus-rhythm')}>
            {td('ui.backNormal')}
          </button>
        )}
      </div>
      <div class="dz-info-body">
        <h3>{td('ui.mechanism')}</h3>
        <p>{text(`${cur.id}.mech`)}</p>
        <h3>{td('ui.criteria')}</h3>
        <ul class="dz-criteria">
          {criteria.map((c) => (
            <li>{c}</li>
          ))}
        </ul>
        <h3>{td('ui.in3d')}</h3>
        <p>{text(`${cur.id}.in3d`)}</p>
      </div>
      <p class="fine-print">{td('ui.modelNote')}</p>
    </section>
  );
}

export const DiseaseMode: ModeView = { Hero: DiseaseHero, Side: DiseaseSide, Aside: DiseasePicker };
