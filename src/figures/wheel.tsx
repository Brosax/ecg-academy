/**
 * The hexaxial wheel drawing shared by the hexaxial figure and the axis calculator: optional axis-category sectors,
 * the six limb-lead axes (positive half solid, negative half dashed), degree labels and lead names.
 */
import { LIMB_ANGLE_DEG, LIMB_LEADS } from '../core/leads';
import { tf } from '../i18n/figures';
import { unit } from './math/geom';
import { AXIS_SECTORS, type AxisClass, type LimbLead } from './math/projection';

export function sectorPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = unit(a0);
  const [x1, y1] = unit(a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${cx} ${cy}L${cx + r * x0} ${cy + r * y0}A${r} ${r} 0 ${large} 1 ${cx + r * x1} ${cy + r * y1}Z`;
}

const DEG_LABELS = [0, 30, 60, 90, 120, 150, 180, -150, -120, -90, -60, -30];

export function HexWheel(props: {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly sectors?: boolean;
  readonly activeClass?: AxisClass | null;
  readonly highlightLead?: LimbLead | null;
  readonly isoLead?: LimbLead | null;
  readonly fontSize?: number;
  readonly degrees?: boolean;
}) {
  const { cx, cy, r } = props;
  const fs = props.fontSize ?? 13;
  return (
    <g aria-hidden="true">
      {props.sectors &&
        (Object.keys(AXIS_SECTORS) as AxisClass[]).map((k) => {
          const [a0, a1] = AXIS_SECTORS[k];
          return <path d={sectorPath(cx, cy, r, a0, a1)} class={`fg-sector fg-sector--${k} ${props.activeClass === k ? 'is-on' : ''}`} />;
        })}
      <circle cx={cx} cy={cy} r={r} class="fg-ring" />
      {LIMB_LEADS.map((lead) => {
        const a = LIMB_ANGLE_DEG[lead];
        const [ux, uy] = unit(a);
        const cls = lead === props.isoLead ? 'is-iso' : lead === props.highlightLead ? 'is-hi' : '';
        return (
          <g class={`fg-leadaxis ${cls}`}>
            <path d={`M${cx} ${cy}L${cx + r * ux} ${cy + r * uy}`} class="fg-leadaxis__pos" />
            <path d={`M${cx} ${cy}L${cx - r * ux} ${cy - r * uy}`} class="fg-leadaxis__neg" />
            <text
              x={cx + (r + fs * 1.55) * ux}
              y={cy + (r + fs * 1.55) * uy}
              text-anchor="middle"
              dominant-baseline="central"
              class="fg-svg-text fg-svg-text--lead"
              style={{ fontSize: `${fs}px` }}
            >
              {lead}
            </text>
          </g>
        );
      })}
      {props.degrees !== false &&
        DEG_LABELS.map((d) => {
          const [ux, uy] = unit(d);
          return (
            <text
              x={cx + (r - fs * 1.1) * ux}
              y={cy + (r - fs * 1.1) * uy}
              text-anchor="middle"
              dominant-baseline="central"
              class="fg-svg-text fg-svg-text--deg"
              style={{ fontSize: `${fs * 0.72}px` }}
            >
              {d > 0 ? `+${d}°` : d < 0 ? `−${-d}°` : '0°'}
            </text>
          );
        })}
    </g>
  );
}

export const AXIS_CLASSES: readonly AxisClass[] = ['normal', 'lad', 'rad', 'extreme'];

/** The coloured axis-category pill (normal / LAD / RAD / extreme). */
export function AxisPill(props: { readonly cls: AxisClass }) {
  return <span class={`fg-pill fg-pill--${props.cls}`}>{tf(`axis_${props.cls}`)}</span>;
}

/** Legend chips for the axis sectors. */
export function SectorLegend(props: { readonly active: AxisClass | null }) {
  return (
    <div class="fg-legend" role="list">
      {AXIS_CLASSES.map((k) => (
        <span role="listitem" class={`fg-legend__item ${props.active === k ? 'is-on' : ''}`}>
          <span class={`fg-swatch fg-swatch--${k}`} />
          {tf(`axis_${k}`)} <span class="fg-legend__range tabular">{tf(`axisRange_${k}`)}</span>
        </span>
      ))}
    </div>
  );
}
