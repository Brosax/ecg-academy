/**
 * Shared UI primitives. Every module uses these instead of re-inventing buttons, cards, tabs, dialogs.
 * Styling: src/ui/ui.css (tokens only). Owner: integrator; extend by adding, never by changing existing props.
 */
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import './ui.css';

type Tone = 'default' | 'primary' | 'ghost' | 'danger' | 'ok';

export function Button(
  props: {
    readonly tone?: Tone;
    readonly size?: 'sm' | 'md' | 'lg';
    readonly icon?: IconName;
    readonly children?: ComponentChildren;
    readonly title?: string;
  } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'icon'>,
) {
  const { tone = 'default', size = 'md', icon, children, class: cls, ...rest } = props;
  return (
    <button type="button" class={`ui-btn ui-btn--${tone} ui-btn--${size} ${cls ?? ''}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children != null && <span>{children}</span>}
    </button>
  );
}

export function LinkButton(props: { readonly href: string; readonly tone?: Tone; readonly icon?: IconName; readonly children?: ComponentChildren; readonly size?: 'sm' | 'md' | 'lg' }) {
  const { tone = 'default', size = 'md' } = props;
  return (
    <a href={props.href} class={`ui-btn ui-btn--${tone} ui-btn--${size}`}>
      {props.icon && <Icon name={props.icon} />}
      {props.children != null && <span>{props.children}</span>}
    </a>
  );
}

/** Move focus and selection together; leave Tab, activation keys and browser shortcuts alone. */
function navigateChoice(
  e: JSX.TargetedKeyboardEvent<HTMLButtonElement>,
  index: number,
  count: number,
  onSelect: (index: number) => void,
  vertical = false,
): void {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  let next: number;
  switch (e.key) {
    case 'Home': next = 0; break;
    case 'End': next = count - 1; break;
    case 'ArrowLeft': next = (index + count - 1) % count; break;
    case 'ArrowRight': next = (index + 1) % count; break;
    case 'ArrowUp':
      if (!vertical) return;
      next = (index + count - 1) % count;
      break;
    case 'ArrowDown':
      if (!vertical) return;
      next = (index + 1) % count;
      break;
    default: return;
  }
  e.preventDefault();
  e.stopPropagation();
  // Focus before a controlled update, which may replace content or change a route.
  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(':scope > button')[next]?.focus();
  onSelect(next);
}

/** Single-choice segmented control (radio group). */
export function Segmented<T extends string | number>(props: {
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: ComponentChildren; readonly title?: string }[];
  readonly onChange: (v: T) => void;
  readonly ariaLabel: string;
  readonly size?: 'sm' | 'md';
}) {
  const tabStop = Math.max(0, props.options.findIndex((o) => o.value === props.value));
  return (
    <div class={`ui-seg ui-seg--${props.size ?? 'md'}`} role="radiogroup" aria-label={props.ariaLabel}>
      {props.options.map((o, index) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === props.value}
          tabIndex={index === tabStop ? 0 : -1}
          class={o.value === props.value ? 'is-on' : ''}
          title={o.title}
          onClick={() => props.onChange(o.value)}
          onKeyDown={(e) => navigateChoice(e, index, props.options.length, (next) => props.onChange(props.options[next].value), true)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card(props: { readonly children?: ComponentChildren; readonly class?: string; readonly pad?: 'sm' | 'md' | 'lg'; readonly as?: 'div' | 'section' | 'article' }) {
  const Tag = props.as ?? 'div';
  return <Tag class={`ui-card ui-card--${props.pad ?? 'md'} ${props.class ?? ''}`}>{props.children}</Tag>;
}

export function Badge(props: { readonly tone?: 'neutral' | 'ok' | 'warn' | 'err' | 'info' | 'critical' | 'major' | 'minor' | 'normal'; readonly children?: ComponentChildren }) {
  return <span class={`ui-badge ui-badge--${props.tone ?? 'neutral'}`}>{props.children}</span>;
}

/** Tabs: controlled. */
export function Tabs<T extends string>(props: {
  readonly value: T;
  readonly tabs: readonly { readonly id: T; readonly label: ComponentChildren }[];
  readonly onChange: (id: T) => void;
  readonly ariaLabel: string;
}) {
  const tabStop = Math.max(0, props.tabs.findIndex((t) => t.id === props.value));
  return (
    <div class="ui-tabs" role="tablist" aria-label={props.ariaLabel}>
      {props.tabs.map((t, index) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === props.value}
          tabIndex={index === tabStop ? 0 : -1}
          class={t.id === props.value ? 'is-on' : ''}
          onClick={() => props.onChange(t.id)}
          onKeyDown={(e) => navigateChoice(e, index, props.tabs.length, (next) => props.onChange(props.tabs[next].id))}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Modal dialog using <dialog>; Esc and backdrop click close it. */
export function Dialog(props: { readonly open: boolean; readonly onClose: () => void; readonly title: ComponentChildren; readonly children?: ComponentChildren; readonly wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) d.showModal?.();
    if (!props.open && d.open) d.close();
  }, [props.open]);
  return (
    <dialog
      ref={ref}
      class={`ui-dialog ${props.wide ? 'ui-dialog--wide' : ''}`}
      onClose={props.onClose}
      onClick={(e) => {
        if (e.target === ref.current) props.onClose();
      }}
    >
      <div class="ui-dialog__head">
        <h2>{props.title}</h2>
        <button type="button" class="ui-icon-btn" aria-label="close" onClick={props.onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div class="ui-dialog__body">{props.children}</div>
    </dialog>
  );
}

/** Circular progress (0..1). */
export function ProgressRing(props: { readonly value: number; readonly size?: number; readonly label?: string }) {
  const size = props.size ?? 36;
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, props.value));
  return (
    <svg class="ui-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={props.label ?? `${Math.round(v * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} class="ui-ring__bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        class="ui-ring__fg"
        stroke-dasharray={`${c * v} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/** Feedback banner for answers (fixed min-height so the layout does not jump). */
export function Feedback(props: { readonly tone: 'ok' | 'err' | 'partial' | 'info'; readonly title: ComponentChildren; readonly children?: ComponentChildren }) {
  return (
    <div class={`ui-feedback ui-feedback--${props.tone}`} role="status" aria-live="polite">
      <div class="ui-feedback__title">
        <Icon name={props.tone === 'ok' ? 'check' : props.tone === 'err' ? 'close' : props.tone === 'partial' ? 'half' : 'info'} />
        {props.title}
      </div>
      {props.children && <div class="ui-feedback__body">{props.children}</div>}
    </div>
  );
}

/** Collapsible section (native <details>). */
export function Disclosure(props: { readonly summary: ComponentChildren; readonly children?: ComponentChildren; readonly open?: boolean }) {
  return (
    <details class="ui-disclosure" open={props.open}>
      <summary>{props.summary}</summary>
      <div class="ui-disclosure__body">{props.children}</div>
    </details>
  );
}

export const ICONS = {
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  half: 'M5 12h14',
  info: 'M12 8h.01M11 12h1v5h1',
  play: 'M8 5v14l11-7z',
  pause: 'M8 5v14M16 5v14',
  next: 'M9 6l6 6-6 6',
  prev: 'M15 6l-6 6 6 6',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  book: 'M5 4h9a4 4 0 014 4v12H9a4 4 0 01-4-4zM5 16a4 4 0 014-4h9',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8zm0 3.5a.5.5 0 100 1 .5.5 0 000-1z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  wave: 'M2 12h4l2-5 3 10 3-14 2 9h6',
  calipers: 'M7 3v18M17 3v18M7 12h10',
  zoom: 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4.5-4.5',
  grid: 'M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 3',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4.5-4.5',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10-3a3 3 0 100 6 3 3 0 000-6z',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
} as const;
export type IconName = keyof typeof ICONS;

export function Icon(props: { readonly name: IconName; readonly size?: number; readonly label?: string }) {
  const s = props.size ?? 18;
  return (
    <svg
      class="ui-icon"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : true}
    >
      <path d={ICONS[props.name]} />
    </svg>
  );
}
