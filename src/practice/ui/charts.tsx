/**
 * Small SVG charts of the progress page (theme tokens only; fixed aspect ratios so nothing jumps): a learning curve per
 * competency with its target line, and the confidence-calibration bars with the ideal marks.
 */
import { tp } from '../../i18n/practice';
import type { CalibrationRow } from '../core/mastery';

export function CurveChart(props: { readonly points: readonly number[]; readonly target: number; readonly label: string }) {
  const W = 220;
  const H = 72;
  const pad = 4;
  const n = props.points.length;
  const x = (i: number) => pad + (n <= 1 ? 0 : (i / (n - 1)) * (W - 2 * pad));
  const y = (v: number) => H - pad - v * (H - 2 * pad);
  const d = props.points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const last = n ? props.points[n - 1] : null;
  return (
    <svg class="pr-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${props.label}: ${last === null ? '—' : `${Math.round(last * 100)} %`}`}>
      <rect x="0" y="0" width={W} height={H} class="pr-curve__bg" rx="4" />
      <line x1={pad} x2={W - pad} y1={y(props.target)} y2={y(props.target)} class="pr-curve__target" />
      {n > 1 && <path d={d} class="pr-curve__line" />}
      {n === 1 && <circle cx={x(0)} cy={y(props.points[0])} r="2.5" class="pr-curve__dot" />}
      {last !== null && n > 1 && <circle cx={x(n - 1)} cy={y(last)} r="2.5" class="pr-curve__dot" />}
    </svg>
  );
}

export function CalibrationChart(props: { readonly rows: readonly CalibrationRow[]; readonly labels: readonly string[] }) {
  const W = 300;
  const H = 160;
  const top = 10;
  const bottom = 28;
  const left = 34;
  const bw = 46;
  const gap = (W - left - 3 * bw) / 4;
  const y = (v: number) => top + (1 - v) * (H - top - bottom);
  return (
    <svg class="pr-calib" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tp('calibrationTitle')}>
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={left} x2={W - 4} y1={y(v)} y2={y(v)} class="pr-calib__grid" />
          <text x={left - 6} y={y(v)} class="pr-calib__tick" text-anchor="end" dominant-baseline="middle">
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}
      {props.rows.map((r, i) => {
        const x0 = left + gap + i * (bw + gap);
        const acc = r.accuracy;
        return (
          <g key={r.confidence}>
            {acc !== null && <rect x={x0} y={y(acc)} width={bw} height={Math.max(0, y(0) - y(acc))} class="pr-calib__bar" rx="3" />}
            <line x1={x0 - 6} x2={x0 + bw + 6} y1={y(r.expected)} y2={y(r.expected)} class="pr-calib__ideal" />
            <text x={x0 + bw / 2} y={H - 14} class="pr-calib__lbl" text-anchor="middle">
              {props.labels[i]}
            </text>
            <text x={x0 + bw / 2} y={H - 2} class="pr-calib__n" text-anchor="middle">
              n={r.n}
            </text>
            <title>{`${props.labels[i]}: ${acc === null ? '—' : `${Math.round(acc * 100)} %`} (${tp('ideal')} ${Math.round(r.expected * 100)} %)`}</title>
          </g>
        );
      })}
    </svg>
  );
}
