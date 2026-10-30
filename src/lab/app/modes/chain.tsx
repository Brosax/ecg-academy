/**
 * The causal chain for the selected lead, read top to bottom in a popup over the heart — ② the heart vector H
 * (frontal + horizontal plane) → ③ its projection on the lead axis, drawn in the plane of H and the lead vector so the
 * angle is the true 3-D θ and the foot is H·L̂ → ④ the lead's waveform and value now. Step ① is the "now" strip above
 * the heart (what the heart is doing). The popup opens from the "why does lead X look like this now?" button; its
 * header lets the student switch the explained lead without touching the ECG (a click on the ECG also selects a lead,
 * but freezes the heart at that instant).
 * Text and numbers come from explainLeadAt (store.now, ~10 Hz); every box keeps a fixed size.
 */
import { useEffect, useRef } from 'preact/hooks';
import { LeadDetail } from '../../ecg';
import { explainLeadAt, fmtNum } from '../../explain';
import type { LeadExplanation } from '../../explain';
import { tm } from '../../i18n/modes';
import { ts } from '../../i18n/shell';
import { VectorPlanes } from '../../quiz/VectorPlanes';
import { LEADS } from '../../sim/types';
import type { Lang } from '../store';
import { store } from '../store';
import { Icon } from '../ui/controls';
import { explainOpen, WHY_BUTTON_ID } from '../ui/overlays';
import type { ModeProps } from './types';

const fmtMv = (v: number, lang: Lang) => fmtNum(v, 2, lang, true);

function Gut({ n, last }: { readonly n: number; readonly last?: boolean }) {
  return (
    <div class="stage-gut" aria-hidden="true">
      <span class="stn">{n}</span>
      {!last && <span class="stage-spine" />}
    </div>
  );
}

/** H and the lead axis in their common plane: axis horizontal (+ to the right), H at the true angle θ above it. */
function ProjectionDiagram({ ex, lang }: { readonly ex: LeadExplanation; readonly lang: Lang }) {
  const S = 50; // drawing units per mV (|H| ≈ 0.2–1.5 mV in a normal beat; the arrow is clamped to the frame)
  const theta = ex.angleDeg;
  const lead = ex.lead;
  const head = (x: number, y: number, ux: number, uy: number, len = 6, w = 3.2) =>
    `${x},${y} ${x - len * ux - w * uy},${y - len * uy + w * ux} ${x - len * ux + w * uy},${y - len * uy - w * ux}`;
  let body = null;
  if (theta !== null) {
    const a = (theta * Math.PI) / 180;
    const r = Math.min(46, Math.max(10, ex.hMag * S));
    const ux = Math.cos(a), uy = -Math.sin(a);
    const tx = r * ux, ty = r * uy;
    const foot = Math.max(-54, Math.min(54, ex.hMag * Math.cos(a) * S));
    const arcEnd = `${(9 * ux).toFixed(2)} ${(9 * uy).toFixed(2)}`;
    // θ sits on the arc's bisector, H just beyond the arrow tip, so the two never overlap
    const bx = Math.cos(a / 2), by = -Math.sin(a / 2);
    body = (
      <>
        <path d={`M9 0A9 9 0 0 0 ${arcEnd}`} class="pd-arc" />
        <line x1={tx} y1={ty} x2={tx} y2={0} class="pd-drop" />
        <line x1={0} y1={0} x2={foot} y2={0} class="pd-proj" />
        <line x1={0} y1={0} x2={tx} y2={ty} class="pd-h" />
        <polygon points={head(tx, ty, ux, uy)} class="pd-h-head" />
        <text x={tx + 5 * ux} y={ty + 5 * uy + 2} text-anchor={ux >= 0 ? 'start' : 'end'} class="pd-h-label">
          H
        </text>
        <text x={16 * bx} y={16 * by + 2} text-anchor={bx >= 0.2 ? 'start' : bx <= -0.2 ? 'end' : 'middle'} class="pd-label">
          θ = {fmtNum(theta, 0, lang)}°
        </text>
        <text x={foot} y={10} text-anchor="middle" class="pd-value">
          {fmtMv(ex.valueMv, lang)}
        </text>
      </>
    );
  }
  return (
    <svg
      class="proj-diagram"
      viewBox="-60 -50 120 66"
      role="img"
      aria-label={
        theta === null
          ? tm('ov.chain.noVector')
          : tm('ov.chain.planeAria', { lead, theta: fmtNum(theta, 0, lang), v: fmtMv(ex.valueMv, lang) })
      }
    >
      <line x1={-56} y1={0} x2={52} y2={0} class="pd-axis" />
      <polygon points={head(57, 0, 1, 0)} class="pd-axis-head" />
      <text x={57} y={-4} text-anchor="end" class="pd-label">
        {tm('ov.chain.axis', { lead })}
      </text>
      <circle cx={0} cy={0} r={1.6} class="pd-origin" />
      {body}
      {theta === null && (
        <text x={0} y={-16} text-anchor="middle" class="pd-label">
          {tm('ov.chain.noVector')}
        </text>
      )}
    </svg>
  );
}

export function CausalChain({ engine, commands }: ModeProps) {
  const now = store.now.value;
  const lang = store.lang.value;
  const lead = store.selectedLead.value;
  const ex = explainLeadAt(engine, lead, now.tMs, lang);
  // the diagram itself says "H ≈ 0"; keep the caption line (and its height) but leave it blank
  const formula =
    ex.angleDeg === null
      ? ' '
      : tm('ov.chain.formula', {
          h: fmtNum(ex.hMag, 2, lang),
          l: fmtNum(ex.leadMag, 2, lang),
          theta: fmtNum(ex.angleDeg, 0, lang),
          v: fmtMv(ex.valueMv, lang),
        });
  return (
    <section class="chain-card" aria-labelledby="chain-title" aria-live="off">
      <header class="chain-head">
        <h2 id="chain-title" class="one-line">
          {tm('ov.explainTitle', { lead })}
        </h2>
        <div class="explain-leads">
          <span class="muted">{tm('ov.explainLead')}</span>
          <div class="seg" role="group" aria-label={tm('ov.explainLead')}>
            {LEADS.map((l) => (
              <button type="button" class="btn btn-sm" aria-pressed={l === lead} onClick={() => commands.selectLead(l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>
      <ol class="chain">
        <li class="chain-stage">
          <Gut n={2} />
          <div class="stage-body">
            <h3>{tm('ov.chain.vector')}</h3>
            <div class="stage-row">
              {/* the angle convention as a tooltip: the popup has no room for a third line */}
              <div class="stage-col" title={tm('ov.anglesNote')}>
                <p class="stage-text lines-3">{ex.parts.vector.join(' ')}</p>
              </div>
              <VectorPlanes h={ex.h} lang={lang} />
            </div>
          </div>
        </li>
        <li class="chain-stage">
          <Gut n={3} />
          <div class="stage-body">
            <h3>{tm('ov.chain.projection', { lead })}</h3>
            <div class="stage-row">
              <p class="stage-text lines-6">{[...ex.parts.axis, ...ex.parts.projection].join(' ')}</p>
              <figure class="proj-figure">
                <ProjectionDiagram ex={ex} lang={lang} />
                <figcaption class="proj-formula tnum one-line">{formula}</figcaption>
              </figure>
            </div>
          </div>
        </li>
        <li class="chain-stage">
          <Gut n={4} last />
          <div class="stage-body">
            <div class="stage-title-row">
              <h3>{tm('ov.chain.result', { lead })}</h3>
              <span class="stage-value tnum">{fmtMv(ex.valueMv, lang)} mV</span>
            </div>
            <p class="stage-result lines-2" title={ex.parts.result.join(' ')}>
              {ex.parts.result.join(' ')}
            </p>
            {/* data-strip-fill: the strip widens its time window to use the whole box (fixed height) */}
            <div class="ecg-frame chain-strip" data-local-keys="" data-strip-fill="">
              <LeadDetail engine={engine} commands={commands} lead={lead} class="lead-detail" />
            </div>
          </div>
        </li>
      </ol>
    </section>
  );
}

/**
 * The causal chain as a popup over the heart, opened from the "now" strip's button; it follows the selected lead
 * (the header's lead buttons, or a click on the ECG). Esc or the close button closes it.
 */
export function ExplainPopup({ engine, commands }: ModeProps) {
  const open = explainOpen.value;
  const lead = store.selectedLead.value;
  const panel = useRef<HTMLElement>(null);
  const shownLead = useRef<string | null>(null);
  // Focus moves into the popup when it opens (so Esc and the lead buttons are at hand) and back to the opener on close.
  // Esc closes it only while focus is in the popup, on its opener, or nowhere (a click in the ECG keeps it open, and
  // the ECG's own Esc — e.g. the calipers — comes first).
  useEffect(() => {
    if (!open) return;
    const p = panel.current;
    p?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const a = document.activeElement;
      if (a && a !== document.body && !p?.contains(a) && a.id !== WHY_BUTTON_ID) return;
      e.preventDefault();
      explainOpen.value = false;
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const a = document.activeElement;
      if (!a || a === document.body || p?.contains(a)) document.getElementById(WHY_BUTTON_ID)?.focus({ preventScroll: true });
    };
  }, [open]);
  // another lead picked while open: bring step ④ (its trace and value) into view; not on opening
  useEffect(() => {
    if (!open) {
      shownLead.current = null;
      return;
    }
    const prev = shownLead.current;
    shownLead.current = lead;
    if (prev !== null && prev !== lead) panel.current?.querySelector('.chain-stage:last-child')?.scrollIntoView({ block: 'nearest' });
  }, [open, lead]);
  if (!open) return null;
  return (
    <section ref={panel} id="explain-pop" class="glass explain-pop" role="dialog" aria-modal="false" aria-labelledby="chain-title" tabIndex={-1}>
      <button type="button" class="btn icon-btn btn-ghost explain-close" aria-label={ts('about.close')} title={ts('about.close')} onClick={() => (explainOpen.value = false)}>
        <Icon name="close" />
      </button>
      <CausalChain engine={engine} commands={commands} />
    </section>
  );
}
