/**
 * Einthoven triangle + hexaxial wheel with a heart vector (draggable, keyboard operable). The projection of the vector
 * on each limb-lead axis is drawn on the wheel and as a mini QRS per lead (positive / negative / equiphasic); quadrant
 * mode shades normal, left, right and extreme axis.
 */
import { useRef, useState } from 'preact/hooks';
import type { FigureParams } from './api';
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../core/leads';
import { tf } from '../i18n/figures';
import { angleOf, normDeg, polyline, unit } from './math/geom';
import { classifyAxis, deflectionKind, frontalQrsLoop, projectFrontal, projectionPoint, projectLoop, type LimbLead } from './math/projection';
import { angleKey, ArrowDefs, Check, DegReserve, FigureFrame, fmtDeg, fmtSigned, Reserve, Svg, svgPoint, useUid } from './shared';
import { AXIS_CLASSES, AxisPill, HexWheel, SectorLegend } from './wheel';

const W = 720;
const H = 420;
const CX = 205;
const CY = 210;
const R = 150;
const VLEN = R * 0.8;

/** Einthoven triangle vertices (RA, LA, LL) on a circle of radius R around the centre. */
const TRI = { RA: unit(-150), LA: unit(-30), LL: unit(90) } as const;

export function HexaxialFigure(props: { readonly params?: FigureParams['hexaxial'] }) {
  const p = props.params ?? {};
  const interactive = p.interactive ?? true;
  const [deg, setDeg] = useState(() => normDeg(Math.round(p.vectorDeg ?? 60)));
  const [showProj, setShowProj] = useState(p.showProjections ?? true);
  const [quad, setQuad] = useState(p.quadrantMode ?? false);
  const [tri, setTri] = useState(true);
  const [focusLead, setFocusLead] = useState<LimbLead>('II');
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const uid = useUid('hx');

  const set = (d: number) => setDeg(normDeg(Math.round(d)));
  const proj = projectFrontal(deg);
  const loop = frontalQrsLoop(deg, 48);
  const cls = classifyAxis(deg);
  let iso: LimbLead = 'I';
  for (const l of LIMB_LEADS) if (Math.abs(proj[l]) < Math.abs(proj[iso])) iso = l;
  const [vx, vy] = unit(deg);
  const tipX = CX + VLEN * vx;
  const tipY = CY + VLEN * vy;

  const pointer = (e: PointerEvent) => {
    if (!svgRef.current) return;
    const [x, y] = svgPoint(svgRef.current, e);
    if (Math.hypot(x - CX, y - CY) < 8) return;
    set(angleOf(x - CX, y - CY));
  };

  const fp = projectionPoint(deg, VLEN, LIMB_ANGLE_DEG[focusLead]);

  return (
    <FigureFrame
      id="hexaxial"
      title={tf('hexTitle')}
      controls={
        <>
          <Check id={`${uid}-tri`} label={tf('hexTriangle')} checked={tri} onChange={setTri} />
          <Check id={`${uid}-proj`} label={tf('hexProjections')} checked={showProj} onChange={setShowProj} />
          <Check id={`${uid}-quad`} label={tf('hexQuadrants')} checked={quad} onChange={setQuad} />
        </>
      }
      footer={
        <>
          <div class="fg-readout" aria-live="polite">
            <span>
              {tf('axisLabel')} <DegReserve deg={deg} />
            </span>
            <Reserve reserve={AXIS_CLASSES.map((k) => <AxisPill cls={k} />)}>
              <AxisPill cls={cls} />
            </Reserve>
            <Reserve class="fg-muted" reserve={LIMB_LEADS.map((l) => tf('hexIso', { lead: l }))}>
              {tf('hexIso', { lead: iso })}
            </Reserve>
          </div>
          {quad && <SectorLegend active={cls} />}
        </>
      }
      caption={tf('hexCaption')}
    >
      <Svg
        w={W}
        h={H}
        label={tf('hexAria', { deg: fmtDeg(deg) })}
        role="group"
        svgRef={svgRef}
        class={interactive ? 'fg-draggable' : ''}
        onPointerDown={(e) => {
          if (!interactive) return;
          const [x] = svgRef.current ? svgPoint(svgRef.current, e) : [0];
          if (x > CX + R + 40) return; // the mini-QRS panel is not a drag area
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
        <HexWheel cx={CX} cy={CY} r={R} sectors={quad} activeClass={cls} highlightLead={focusLead} isoLead={iso} />

        {tri && (
          <g class="fg-tri" aria-hidden="true">
            <path
              d={`${polyline([
                [CX + R * TRI.RA[0], CY + R * TRI.RA[1]],
                [CX + R * TRI.LA[0], CY + R * TRI.LA[1]],
                [CX + R * TRI.LL[0], CY + R * TRI.LL[1]],
              ])}Z`}
            />
            {(['RA', 'LA', 'LL'] as const).map((k) => {
              // offset the vertex label sideways: the augmented lead of the same limb (aVR/aVL/aVF) is labelled radially
              const [ox, oy] = unit(k === 'RA' ? -60 : k === 'LA' ? -120 : 180);
              return (
                <text
                  x={CX + R * TRI[k][0] + 24 * ox}
                  y={CY + R * TRI[k][1] + 24 * oy}
                  text-anchor="middle"
                  dominant-baseline="central"
                  class="fg-svg-text fg-svg-text--tri"
                >
                  {k}
                </text>
              );
            })}
          </g>
        )}

        {showProj &&
          LIMB_LEADS.map((lead) => {
            const [px, py] = projectionPoint(deg, VLEN, LIMB_ANGLE_DEG[lead]);
            const k = deflectionKind(deg, LIMB_ANGLE_DEG[lead]);
            return <path d={`M${CX} ${CY}L${CX + px} ${CY + py}`} class={`fg-proj fg-proj--${k}`} />;
          })}
        {showProj && (
          <g class="fg-perp" aria-hidden="true">
            <path d={`M${tipX} ${tipY}L${CX + fp[0]} ${CY + fp[1]}`} />
            <circle cx={CX + fp[0]} cy={CY + fp[1]} r={4} />
          </g>
        )}

        {interactive && (
          <circle
            cx={tipX}
            cy={tipY}
            r={13}
            class="fg-handle"
            tabIndex={0}
            role="slider"
            aria-label={tf('hexSlider')}
            aria-valuemin={-180}
            aria-valuemax={180}
            aria-valuenow={deg}
            aria-valuetext={`${fmtDeg(deg)} — ${tf(`axis_${cls}`)}`}
            onKeyDown={(e) => {
              const v = angleKey(e, deg);
              if (v == null) return;
              e.preventDefault();
              set(v);
            }}
          />
        )}
        {/* heart vector */}
        <path d={`M${CX} ${CY}L${tipX} ${tipY}`} class="fg-vector" marker-end={`url(#${uid}-vector)`} />
        <circle cx={CX} cy={CY} r={4} class="fg-vector-origin" />

        {/* mini QRS per lead: bipolar column, augmented column */}
        {LIMB_LEADS.map((lead, i) => {
          const col = i < 3 ? 0 : 1;
          const row = i % 3;
          const x = 430 + col * 145;
          const y = 40 + row * 125;
          const trace = projectLoop(loop, LIMB_ANGLE_DEG[lead]);
          const k = deflectionKind(deg, LIMB_ANGLE_DEG[lead]);
          const on = lead === focusLead;
          return (
            <g
              class={`fg-cell ${on ? 'is-on' : ''}`}
              tabIndex={0}
              role="button"
              aria-pressed={on}
              aria-label={tf('hexCellAria', { lead, kind: tf(`defl_${k}`), v: fmtSigned(proj[lead], 2) })}
              onClick={() => setFocusLead(lead)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFocusLead(lead);
                }
              }}
            >
              <rect x={x} y={y} width={130} height={110} rx={8} class="fg-cell__bg" />
              <text x={x + 10} y={y + 20} class="fg-svg-text fg-svg-text--lead">
                {lead}
              </text>
              <text x={x + 120} y={y + 20} text-anchor="end" class={`fg-svg-text fg-defl fg-defl--${k}`} style={{ fontSize: '11px' }}>
                {tf(`defl_${k}`)}
              </text>
              <path d={`M${x + 12} ${y + 68}H${x + 118}`} class="fg-baseline" />
              <path
                d={polyline(trace.map((v, j) => [x + 20 + (90 * j) / (trace.length - 1), y + 68 - v * 34] as [number, number]))}
                class="fg-trace fg-trace--qrs"
              />
              <text x={x + 120} y={y + 102} text-anchor="end" class="fg-svg-text fg-svg-text--muted tabular" style={{ fontSize: '10.5px' }}>
                {fmtSigned(proj[lead], 2)}
              </text>
            </g>
          );
        })}
      </Svg>
    </FigureFrame>
  );
}
