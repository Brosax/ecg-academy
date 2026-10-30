/**
 * Standard ECG paper drawn in millimetres (viewBox units = mm): 1 mm small squares, 5 mm large squares and the 1 mV
 * calibration pulse (10 mm tall, 0.20 s = 5 mm wide at 25 mm/s). Not a tracing — just the ruler every reading starts
 * with. Shown in the home hero when the live ECG cannot be generated.
 */
import { tsh } from '../i18n/shell';
import { store } from './store';
import './pages.css';

const PAPER_W = 60; // mm
const PAPER_H = 30; // mm
const BASELINE = 22; // mm from the top
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function PaperExplainer() {
  return (
    <figure class="home-paper">
      <figcaption class="home-paper__title">
        <strong>{tsh('paperTitle')}</strong>
        <span class="app-muted">{tsh('paperSpeed')}</span>
      </figcaption>
      <svg class="home-paper__svg" viewBox={`0 0 ${PAPER_W} ${PAPER_H}`} role="img" aria-label={tsh('paperAria')}>
        <rect class="paper-bg" x="0" y="0" width={PAPER_W} height={PAPER_H} />
        {range(PAPER_W + 1).map((i) => (
          <line class={i % 5 === 0 ? 'paper-major' : 'paper-minor'} x1={i} y1={0} x2={i} y2={PAPER_H} />
        ))}
        {range(PAPER_H + 1).map((i) => (
          <line class={i % 5 === 0 ? 'paper-major' : 'paper-minor'} x1={0} y1={i} x2={PAPER_W} y2={i} />
        ))}
        {/* one small square and one large square, highlighted */}
        <rect class="paper-small" x="41" y="4" width="1" height="1" />
        <rect class="paper-large" x="45" y="5" width="5" height="5" />
        {/* calibration pulse: 1 mV → 10 mm up, held 0.20 s → 5 mm */}
        <path class="paper-trace" d={`M0 ${BASELINE}H5V${BASELINE - 10}H10V${BASELINE}H${PAPER_W}`} />
        <path class="paper-dim" d={`M12.5 ${BASELINE}V${BASELINE - 10}M11.5 ${BASELINE}h2M11.5 ${BASELINE - 10}h2`} />
        <path class="paper-dim" d={`M5 ${BASELINE + 2.5}H10M5 ${BASELINE + 1.5}v2M10 ${BASELINE + 1.5}v2`} />
        <text class="paper-note" x="14" y={BASELINE - 4.4}>
          10 mm = 1 mV
        </text>
        <text class="paper-note" x="7.5" y={BASELINE + 5.6} text-anchor="middle">
          {store.lang.value === 'es' ? '0,20 s' : '0.20 s'}
        </text>
      </svg>
      <ul class="home-paper__legend">
        <li>
          <span class="swatch swatch--small" aria-hidden="true" />
          <span class="tabular">{tsh('paperSmall')}</span>
        </li>
        <li>
          <span class="swatch swatch--large" aria-hidden="true" />
          <span class="tabular">{tsh('paperLarge')}</span>
        </li>
        <li>
          <span class="swatch swatch--pulse" aria-hidden="true" />
          <span class="tabular">{tsh('paperCal')}</span>
        </li>
      </ul>
    </figure>
  );
}
