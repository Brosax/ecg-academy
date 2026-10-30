/**
 * The hexaxial axis dial (axis items): drag the vector, or use the keyboard (role="slider": arrows ±5°, Shift ±15°,
 * Page Up/Down ±30°, Home 0°). Frontal-plane convention: 0° = lead I (patient's left, drawn right), +90° = aVF
 * (inferior, drawn down). After grading it shows the reference vector beside the learner's.
 */
import { useRef } from 'preact/hooks';
import { tp } from '../../i18n/practice';
import { fmtDeg } from '../core/text';
import { normDeg } from '../core/truth';

const LEADS: readonly (readonly [string, number])[] = [
  ['I', 0],
  ['II', 60],
  ['III', 120],
  ['aVF', 90],
  ['aVL', -30],
  ['aVR', -150],
];

const R = 80;
const C = 100;

function pt(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

export interface AxisDialProps {
  readonly value: number | null;
  readonly onChange?: (deg: number) => void;
  readonly truth?: number | null;
  readonly disabled?: boolean;
  readonly label?: string;
}

export function AxisDial(props: AxisDialProps) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const set = (d: number) => {
    if (props.disabled) return;
    props.onChange?.(Math.round(normDeg(d)));
  };
  const fromEvent = (e: PointerEvent) => {
    const el = svg.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 200 - C;
    const y = ((e.clientY - r.top) / r.height) * 200 - C;
    if (x * x + y * y < 16) return;
    set((Math.atan2(y, x) * 180) / Math.PI);
  };
  const onKey = (e: KeyboardEvent) => {
    if (props.disabled) return;
    const v = props.value ?? 0;
    const step = e.shiftKey ? 15 : 5;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = v + step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = v - step;
    else if (e.key === 'PageDown') next = v + 30;
    else if (e.key === 'PageUp') next = v - 30;
    else if (e.key === 'Home') next = 0;
    if (next !== null) {
      e.preventDefault();
      set(next);
    }
  };
  const v = props.value;
  const t = props.truth;
  return (
    <div class="pr-dial">
      <svg
        ref={svg}
        class={`pr-dial__svg ${props.disabled ? 'is-locked' : ''}`}
        viewBox="0 0 200 200"
        role="slider"
        tabIndex={props.disabled ? -1 : 0}
        aria-label={props.label ?? tp('axisDial')}
        aria-valuemin={-179}
        aria-valuemax={180}
        aria-valuenow={v ?? undefined}
        aria-valuetext={v === null ? '—' : fmtDeg(v)}
        aria-disabled={props.disabled ? true : undefined}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (props.disabled) return;
          dragging.current = true;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          fromEvent(e);
        }}
        onPointerMove={(e) => dragging.current && fromEvent(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <circle cx={C} cy={C} r={R} class="pr-dial__ring" />
        {/* normal-axis sector −30°…+90° */}
        <path d={`M${C},${C} L${pt(-30, R)[0]},${pt(-30, R)[1]} A${R},${R} 0 0 1 ${pt(90, R)[0]},${pt(90, R)[1]} Z`} class="pr-dial__normal" />
        {LEADS.map(([name, deg]) => {
          const [x1, y1] = pt(deg + 180, R);
          const [x2, y2] = pt(deg, R);
          const [lx, ly] = pt(deg, R + 12);
          return (
            <g key={name}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} class="pr-dial__axis" />
              <text x={lx} y={ly} class="pr-dial__lbl" text-anchor="middle" dominant-baseline="middle">
                {name}
              </text>
            </g>
          );
        })}
        {t != null && <line x1={C} y1={C} x2={pt(t, R - 6)[0]} y2={pt(t, R - 6)[1]} class="pr-dial__truth" marker-end="url(#pr-dial-ok)" />}
        {v != null && <line x1={C} y1={C} x2={pt(v, R - 6)[0]} y2={pt(v, R - 6)[1]} class="pr-dial__vec" marker-end="url(#pr-dial-arrow)" />}
        <circle cx={C} cy={C} r={3.5} class="pr-dial__hub" />
        <defs>
          <marker id="pr-dial-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" class="pr-dial__head" />
          </marker>
          <marker id="pr-dial-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" class="pr-dial__head-ok" />
          </marker>
        </defs>
      </svg>
      <p class="pr-dial__help app-muted">{tp('axisDialHelp')}</p>
    </div>
  );
}
