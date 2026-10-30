/**
 * Electrodes & leads mode. commands.setMode('leads') already shows torso, electrodes and the lead axis in 3D.
 * Hero: the selected lead, large, with the projection read-out (strip "fill" mode), and under it the frontal /
 * horizontal plane diagrams. Side (under the heart): the grouped lead picker + AHA/IEC colour code, how the lead is
 * formed (poles, Wilson central terminal, placement, sensitivity |L|) and a model-generated "why does this lead look
 * like this".
 */
import { useMemo } from 'preact/hooks';
import { HexaxialDiagram, HorizontalPlaneDiagram, LeadDetail } from '../../ecg';
import { explainLeadMorphology, fmtDeg, fmtNum, frontalAngleDeg, horizontalAngleDeg, mag } from '../../explain';
import { tc } from '../../i18n/common';
import { tm } from '../../i18n/modes';
import { ELECTRODE_COLORS } from '../../sim/leads/electrodes';
import type { ElectrodeId, LeadName } from '../../sim/types';
import { store } from '../store';
import { Segmented } from '../ui/controls';
import { HEXAXIAL_DEG, LEAD_FORMATION, LEAD_PICKER_GROUPS } from './leadFormation';
import type { ModeProps, ModeView } from './types';

function ElectrodeChip({ id, sign }: { readonly id: ElectrodeId; readonly sign?: '+' | '−' }) {
  const std = store.electrodeStandard.value;
  return (
    <span class="chip electrode-chip">
      <span class="lab-swatch" style={{ background: ELECTRODE_COLORS[std][id] }} aria-hidden="true" />
      <strong>{id}</strong>
      {sign && <span aria-hidden="true">({sign})</span>}
    </span>
  );
}

export function LeadPicker({ commands }: Pick<ModeProps, 'commands'>) {
  const lead = store.selectedLead.value;
  return (
    <section class="card" aria-labelledby="lead-picker-title">
      <h2 id="lead-picker-title">{tm('ld.picker')}</h2>
      {LEAD_PICKER_GROUPS.map((g) => (
        <div class="lead-group" role="group" aria-label={tm(`ld.group.${g.kind}`)}>
          <h3>{tm(`ld.group.${g.kind}`)}</h3>
          <div class="seg lead-buttons">
            {g.leads.map((l) => (
              <button type="button" class="btn btn-sm lead-btn" aria-pressed={l === lead} onClick={() => commands.selectLead(l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div class="lead-group">
        <h3>{tm('ld.colors')}</h3>
        <Segmented
          label={tm('ld.colors')}
          value={store.electrodeStandard.value}
          options={[
            { value: 'IEC', label: tm('ld.colors.IEC') },
            { value: 'AHA', label: tm('ld.colors.AHA') },
          ]}
          onChange={(v) => (store.electrodeStandard.value = v)}
        />
      </div>
    </section>
  );
}

function Formation({ engine, lead }: { readonly engine: ModeProps['engine']; readonly lead: LeadName }) {
  const f = LEAD_FORMATION[lead];
  const lang = store.lang.value;
  const L = engine.projector.leadVector(lead);
  const formula =
    f.kind === 'bipolar'
      ? `${lead} = ${f.plus} − ${f.minus[0]}`
      : f.kind === 'augmented'
        ? `${lead} = ${f.plus} − (${f.minus[0]} + ${f.minus[1]}) / 2`
        : `${lead} = ${f.plus} − WCT`;
  const involved: readonly ElectrodeId[] = [f.plus, ...f.minus];
  return (
    <section class="card" aria-labelledby="formation-title">
      <h2 id="formation-title">{tm('ld.formation', { lead })}</h2>
      <p>{tm(`ld.desc.${f.kind}`)}</p>
      <div class="formula" aria-label={formula}>
        <code>{formula}</code>
      </div>
      <dl class="poles">
        <div>
          <dt>{tm('ld.plus')}</dt>
          <dd>
            <ElectrodeChip id={f.plus} sign="+" />
          </dd>
        </div>
        <div>
          <dt>{f.minus.length > 1 ? tm('ld.reference') : tm('ld.minus')}</dt>
          <dd class="chip-row">
            {f.minus.map((m) => (
              <ElectrodeChip id={m} sign="−" />
            ))}
          </dd>
        </div>
      </dl>
      {f.kind === 'precordial' && <p class="muted">{tm('ld.wct')}</p>}
      <h3>{tm('ld.placement')}</h3>
      <ul class="placement">
        {involved.map((id) => (
          <li>
            <ElectrodeChip id={id} /> {tc(`electrode.${id}`)}
          </li>
        ))}
      </ul>
      <p class="fine-print">{tm('ld.ground')}</p>
      <p>{tm('ld.sensitivity', { mag: fmtNum(mag(L), 2, lang) })}</p>
      <p class="fine-print">
        {lead in HEXAXIAL_DEG
          ? tm('ld.note.ideal', { lead, real: fmtDeg(frontalAngleDeg(L), lang), ideal: fmtDeg(HEXAXIAL_DEG[lead]!, lang) })
          : tm('ld.note.prec', { lead, real: fmtDeg(horizontalAngleDeg(L), lang) })}
      </p>
    </section>
  );
}

function WhyCard({ engine, lead }: { readonly engine: ModeProps['engine']; readonly lead: LeadName }) {
  const lang = store.lang.value;
  const cycle = engine.cycleAt(store.now.value.tMs);
  const key = cycle?.pOn ?? null;
  // three windows × 12 leads of sampling: recompute once per beat, lead or language — not at 10 Hz
  const m = useMemo(() => explainLeadMorphology(engine, lead, cycle, lang), [engine, lead, lang, key]);
  return (
    <section class="card" aria-labelledby="why-title">
      <h2 id="why-title">{tm('ld.why', { lead })}</h2>
      <ul class="explain-steps">
        {m.sentences.map((s) => (
          <li>{s}</li>
        ))}
      </ul>
      <p class="fine-print">{tm('ov.anglesNote')}</p>
    </section>
  );
}

/** Hero: the selected lead (large, with its projection) and the two plane diagrams. */
function LeadsHero({ engine, commands }: ModeProps) {
  const lead = store.selectedLead.value;
  return (
    <>
      <div class="hero-primary ecg-frame" data-local-keys="" data-strip-fill="">
        <LeadDetail engine={engine} commands={commands} lead={lead} showProjection class="lead-detail" />
      </div>
      <div class="hero-secondary hero-planes">
        <HexaxialDiagram engine={engine} commands={commands} class="plane-diagram" />
        <HorizontalPlaneDiagram engine={engine} commands={commands} class="plane-diagram" />
      </div>
    </>
  );
}

/** Under the heart: pick a lead, see how it is formed and why it looks like this. */
function LeadsSide({ engine, commands }: ModeProps) {
  const lead = store.selectedLead.value;
  return (
    <>
      <LeadPicker commands={commands} />
      <Formation engine={engine} lead={lead} />
      <WhyCard engine={engine} lead={lead} />
    </>
  );
}

export const LeadsMode: ModeView = { Hero: LeadsHero, Side: LeadsSide };
