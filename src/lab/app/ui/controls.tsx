/** Small accessible building blocks shared by the shell, the modes, the tour and the quiz. */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

export interface ToggleProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
  readonly swatch?: string;
}

/** Checkbox styled as a switch; the whole row is the hit target (≥ 40 px). */
export function Toggle({ label, checked, onChange, swatch }: ToggleProps) {
  return (
    <label class="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
      <span class="toggle-track" aria-hidden="true" />
      {swatch && <span class="lab-swatch" style={{ background: swatch }} aria-hidden="true" />}
      <span>{label}</span>
    </label>
  );
}

export interface RangeProps {
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly onInput: (v: number) => void;
  /** Human-readable value (shown and announced). */
  readonly display: string;
}

export function Range({ id, label, min, max, step, value, onInput, display }: RangeProps) {
  return (
    <div class="range">
      <label for={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onInput={(e) => onInput(Number(e.currentTarget.value))}
      />
      <output for={id}>{display}</output>
    </div>
  );
}

export interface SegmentedOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
  readonly title?: string;
  readonly lang?: string;
}

/** A group of toggle buttons where exactly one is pressed. */
export function Segmented<T extends string | number>(p: {
  readonly label: string;
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (v: T) => void;
  readonly class?: string;
}) {
  return (
    <div class={`seg ${p.class ?? ''}`} role="group" aria-label={p.label}>
      {p.options.map((o) => (
        <button
          type="button"
          class="btn btn-sm"
          aria-pressed={o.value === p.value}
          title={o.title}
          lang={o.lang}
          aria-label={o.title}
          onClick={() => p.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card(p: { readonly title?: ComponentChildren; readonly class?: string; readonly children: ComponentChildren; readonly labelledBy?: string }) {
  return (
    <section class={`card ${p.class ?? ''}`} aria-labelledby={p.labelledBy}>
      {p.title && <h2 id={p.labelledBy}>{p.title}</h2>}
      {p.children}
    </section>
  );
}

/**
 * Native <details> disclosure (keyboard and screen-reader support for free). `lazy` mounts the children only while
 * open, so a hidden canvas does not keep its render loop running.
 */
export function Collapsible(p: {
  readonly summary: ComponentChildren;
  readonly open?: boolean;
  readonly lazy?: boolean;
  readonly children: ComponentChildren;
  readonly class?: string;
}) {
  const [open, setOpen] = useState(!!p.open);
  return (
    <details class={`card collapsible ${p.class ?? ''}`} open={p.open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{p.summary}</summary>
      <div class="collapsible-body">{!p.lazy || open ? p.children : null}</div>
    </details>
  );
}

/** Outline icons of the tool rail (stroked, 1.8 px). */
const STROKE_ICONS = {
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  layers: 'M12 3 2 8l10 5 10-5-10-5zM2 12l10 5 10-5M2 16l10 5 10-5',
  swatches: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  wave: 'M2 16c3 0 3-10 6-10s3 8 6 8 3-4 6-4h2',
  calipers: 'M5 3v18M19 3v18M5 12h14M9 9l-4 3 4 3M15 9l4 3-4 3',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
} as const;
type StrokeIcon = keyof typeof STROKE_ICONS;
export type IconName = 'play' | 'pause' | 'prev' | 'next' | 'sun' | 'moon' | 'close' | 'info' | 'quiz' | StrokeIcon;

/** Simple line icons (inline SVG — no external resources). */
export function Icon({ name }: { readonly name: IconName }) {
  if (name in STROKE_ICONS) {
    return (
      <svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d={STROKE_ICONS[name as StrokeIcon]} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    );
  }
  const paths: Record<Exclude<IconName, StrokeIcon>, string> = {
    play: 'M8 5v14l11-7z',
    pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
    prev: 'M6 5h2v14H6zM20 5v14L9 12z',
    next: 'M16 5h2v14h-2zM4 5v14l11-7z',
    sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z',
    moon: 'M20 15.3A8.5 8.5 0 018.7 4a8.5 8.5 0 1011.3 11.3z',
    close: 'M6.4 5L5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z',
    info: 'M11 10h2v7h-2zM11 6h2v2h-2zM12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z',
    quiz: 'M4 4h16v12H8l-4 4zM11 13h2v-2h-2zM12 6a3 3 0 00-3 3h2a1 1 0 112 0c0 1-2 1-2 3h2c0-1.5 2-1.8 2-3a3 3 0 00-3-3z',
  };
  return (
    <svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d={paths[name as Exclude<IconName, StrokeIcon>]} fill="currentColor" />
    </svg>
  );
}
