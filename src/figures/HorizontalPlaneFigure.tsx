/**
 * Horizontal plane: a transverse chest section (seen from the feet, anterior up, patient's left on screen right) with
 * the V1–V6 lead directions from the heart's electrical centre, a draggable QRS vector, its projection on each lead,
 * the resulting R/S mini-complexes and the transition zone.
 */
import { useRef, useState } from 'preact/hooks';
import type { FigureParams } from './api';
import { CHEST_LEADS } from '../core/leads';
import { tf } from '../i18n/figures';
import { angleOf, normDeg, polyline, unit } from './math/geom';
import { CHEST, DEFAULT_HORIZONTAL_DEG, HEART_CENTER, horizontalComplexes, PRECORDIAL_DEG, PRECORDIAL_SITES, type TransitionClass } from './math/projection';
import { angleKey, ArrowDefs, DegReserve, FigureFrame, fmt, fmtDeg, Reserve, Svg, svgPoint, useUid } from './shared';

const W = 740;
const H = 400;
const S = 1.12; // section scale
const OX = 200; // section centre on screen
const OY = 200;
const VLEN = 82; // vector length in section units

const toScreen = (x: number, y: number): [number, number] => [OX + x * S, OY + y * S];

const TRANSITION_CLASSES = ['early', 'normal', 'late'] as const satisfies readonly TransitionClass[];
/** Every wording of the transition read-out (single leads, adjacent pairs, none), to reserve its width. */
const TRANSITION_NAMES = (): string[] => [
  ...CHEST_LEADS,
  ...CHEST_LEADS.slice(0, -1).map((l, i) => `${l}–${CHEST_LEADS[i + 1]}`),
  tf('hpTransNone'),
];

export function HorizontalPlaneFigure(props: { readonly params?: FigureParams['horizontal-plane'] }) {
  const interactive = props.params?.interactive ?? true;
  const [deg, setDeg] = useState(() => normDeg(Math.round(props.params?.vectorDeg ?? DEFAULT_HORIZONTAL_DEG)));
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const uid = useUid('hp');
  const set = (d: number) => setDeg(normDeg(Math.round(d)));

  const { traces, rs, transition } = horizontalComplexes(deg, 56);
  const [hx, hy] = toScreen(HEART_CENTER[0], HEART_CENTER[1]);
  const [ux, uy] = unit(deg);
  const tip: [number, number] = [hx + VLEN * S * ux, hy + VLEN * S * uy];

  const pointer = (e: PointerEvent) => {
    if (!svgRef.current) return;
    const [x, y] = svgPoint(svgRef.current, e);
    if (Math.hypot(x - hx, y - hy) < 8) return;
    set(angleOf(x - hx, y - hy));
  };

  const trName =
    transition.firstIndex == null
      ? tf('hpTransNone')
      : transition.crossing != null && transition.crossing > 0 && transition.crossing < 5
        ? `${CHEST_LEADS[Math.floor(transition.crossing)]}–${CHEST_LEADS[Math.min(5, Math.floor(transition.crossing) + 1)]}`
        : CHEST_LEADS[transition.firstIndex];

  // mini complexes row
  const cellW = 52;
  const rowX = 418;
  const rowY = 210;
  const maxAmp = Math.max(...rs.map((m) => Math.max(m.r, m.s)), 0.01);
  const scale = 70 / maxAmp;

  return (
    <FigureFrame
      id="horizontal-plane"
      title={tf('hpTitle')}
      footer={
        <div class="fg-readout" aria-live="polite">
          <span>
            {tf('hpVector')} <DegReserve deg={deg} />
          </span>
          <Reserve reserve={TRANSITION_NAMES().map((w) => <span class="fg-pill">{tf('hpTransition', { where: w })}</span>)}>
            <span class={`fg-pill fg-pill--tr-${transition.cls}`}>{tf('hpTransition', { where: trName })}</span>
          </Reserve>
          <Reserve class="fg-muted" reserve={TRANSITION_CLASSES.map((k) => tf(`hpTrans_${k}`))}>
            {tf(`hpTrans_${transition.cls}`)}
          </Reserve>
        </div>
      }
      caption={tf('hpCaption')}
    >
      <Svg
        w={W}
        h={H}
        label={tf('hpAria', { deg: fmtDeg(deg), where: trName })}
        role="group"
        svgRef={svgRef}
        class={interactive ? 'fg-draggable' : ''}
        onPointerDown={(e) => {
          if (!interactive || !svgRef.current) return;
          const [x] = svgPoint(svgRef.current, e);
          if (x > 400) return;
          dragging.current = true;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          pointer(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) pointer(e);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        <ArrowDefs id={uid} kinds={['vector']} />
        {/* section */}
        <g aria-hidden="true">
          <ellipse cx={OX} cy={OY} rx={CHEST.rx * S} ry={CHEST.ry * S} class="fg-body" />
          <ellipse cx={OX - 62 * S} cy={OY + 8 * S} rx={52 * S} ry={70 * S} class="fg-lung" />
          <ellipse cx={OX + 74 * S} cy={OY + 14 * S} rx={46 * S} ry={64 * S} class="fg-lung" />
          <rect x={OX - 9 * S} y={OY - CHEST.ry * S + 2} width={18 * S} height={14 * S} rx={3} class="fg-bone fg-bone--fill" />
          <circle cx={OX} cy={OY + 80 * S} r={13 * S} class="fg-bone fg-bone--fill" />
          <ellipse cx={hx + 4} cy={hy + 6} rx={48 * S} ry={34 * S} transform={`rotate(-30 ${hx} ${hy})`} class="fg-heart-shadow" />
          <text x={OX} y={OY - CHEST.ry * S - 26} text-anchor="middle" class="fg-svg-text fg-svg-text--muted">
            {tf('anterior')}
          </text>
          <text x={OX} y={OY + CHEST.ry * S + 20} text-anchor="middle" class="fg-svg-text fg-svg-text--muted">
            {tf('posterior')}
          </text>
          <text x={OX - CHEST.rx * S - 5} y={OY + 4} text-anchor="end" class="fg-svg-text fg-svg-text--strong">
            {tf('sideR')}
          </text>
          <text x={OX + CHEST.rx * S + 5} y={OY + 4} class="fg-svg-text fg-svg-text--strong">
            {tf('sideL')}
          </text>
          <text x={OX} y={OY + 80 * S + 4} text-anchor="middle" class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '9px' }}>
            {tf('spine')}
          </text>
        </g>

        {/* lead axes and projections */}
        {CHEST_LEADS.map((l, i) => {
          const [sx, sy] = toScreen(PRECORDIAL_SITES[l][0], PRECORDIAL_SITES[l][1]);
          const [lx, ly] = unit(PRECORDIAL_DEG[l]);
          const p = Math.cos(((deg - PRECORDIAL_DEG[l]) * Math.PI) / 180) * VLEN * S;
          const isTr = transition.firstIndex === i;
          return (
            <g class={`fg-leadaxis ${isTr ? 'is-hi' : ''}`} aria-hidden="true">
              <path d={`M${hx} ${hy}L${sx} ${sy}`} class="fg-leadaxis__pos" />
              <path d={`M${hx} ${hy}L${hx - lx * 70} ${hy - ly * 70}`} class="fg-leadaxis__neg" />
              <path d={`M${hx} ${hy}L${hx + p * lx} ${hy + p * ly}`} class={`fg-proj fg-proj--${p >= 0 ? 'positive' : 'negative'}`} />
              <circle cx={sx} cy={sy} r={10} class="fg-el__dot fg-el--chest" />
              <text x={sx} y={sy} text-anchor="middle" dominant-baseline="central" class="fg-el__label" style={{ fontSize: '8.5px' }}>
                {l}
              </text>
            </g>
          );
        })}

        {interactive && (
          <circle
            cx={tip[0]}
            cy={tip[1]}
            r={13}
            class="fg-handle"
            tabIndex={0}
            role="slider"
            aria-label={tf('hpSlider')}
            aria-valuemin={-180}
            aria-valuemax={180}
            aria-valuenow={deg}
            aria-valuetext={`${fmtDeg(deg)} — ${tf('hpTransition', { where: trName })}`}
            onKeyDown={(e) => {
              const v = angleKey(e, deg);
              if (v == null) return;
              e.preventDefault();
              set(v);
            }}
          />
        )}
        <path d={`M${hx} ${hy}L${tip[0]} ${tip[1]}`} class="fg-vector" marker-end={`url(#${uid}-vector)`} />
        <circle cx={hx} cy={hy} r={4} class="fg-vector-origin" />

        {/* R/S progression */}
        <g aria-hidden="true">
          <text x={rowX} y={56} class="fg-svg-text fg-svg-text--strong">
            {tf('hpProgression')}
          </text>
          <path d={`M${rowX} ${rowY}H${rowX + cellW * 6 - 6}`} class="fg-baseline" />
          {transition.crossing != null && (
            <g>
              <rect x={rowX + cellW * transition.crossing + cellW / 2 - 3 - 11} y={rowY - 118} width={22} height={236} rx={6} class="fg-transition" />
              <text x={rowX + cellW * transition.crossing + cellW / 2 - 3} y={rowY - 124} text-anchor="middle" class="fg-svg-text fg-svg-text--hi" style={{ fontSize: '10px' }}>
                {tf('hpZone')}
              </text>
            </g>
          )}
          {CHEST_LEADS.map((l, i) => {
            const x = rowX + cellW * i;
            const tr = traces[l];
            const m = rs[i];
            return (
              <g>
                <path d={polyline(tr.map((v, j) => [x + 4 + ((cellW - 14) * j) / (tr.length - 1), rowY - v * scale] as [number, number]))} class="fg-trace fg-trace--qrs" />
                <text x={x + cellW / 2 - 3} y={rowY + 110} text-anchor="middle" class="fg-svg-text fg-svg-text--lead">
                  {l}
                </text>
                <text x={x + cellW / 2 - 3} y={rowY + 128} text-anchor="middle" class="fg-svg-text fg-svg-text--muted tabular" style={{ fontSize: '10px' }}>
                  {m.s > 0 ? fmt(m.r / m.s, 1) : '∞'}
                </text>
              </g>
            );
          })}
          <text x={rowX} y={rowY + 146} class="fg-svg-text fg-svg-text--muted" style={{ fontSize: '10px' }}>
            {tf('hpRs')}
          </text>
        </g>
      </Svg>
    </FigureFrame>
  );
}
