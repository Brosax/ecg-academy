/**
 * Shared building blocks of the figures: the frame (title, stage, controls, caption), play-once animation, pointer →
 * SVG coordinates, angle keyboard handling, localized number formatting and small drawing helpers. Rendering code
 * stays thin; the maths lives in src/figures/math (tested).
 */
import type { Signal } from '@preact/signals';
import { useSignal } from '@preact/signals';
import type { ComponentChildren, JSX, RefObject } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { store } from '../app/store';
import type { Lang } from '../core/l10n';
import { tf } from '../i18n/figures';
import { Icon } from '../ui/index';
import { polyline } from './math/geom';
import { radioKey } from './math/keys';
import { finalNumber, formatFixed, formatSigned, liveNumber } from './math/number';

// ── frame ───────────────────────────────────────────────────────────────────────────────────────────────────────

export function FigureFrame(props: {
  readonly id: string;
  readonly title: string;
  readonly badge?: ComponentChildren;
  readonly controls?: ComponentChildren;
  readonly children: ComponentChildren;
  readonly footer?: ComponentChildren;
  readonly caption?: ComponentChildren;
  readonly wide?: boolean;
}) {
  return (
    <figure class={`fg fg--${props.id} ${props.wide ? 'fg--wide' : ''}`} aria-label={props.title}>
      <div class="fg__head">
        <span class="fg__title">{props.title}</span>
        {props.badge}
      </div>
      {props.controls && <div class="fg__controls">{props.controls}</div>}
      <div class="fg__stage">{props.children}</div>
      {props.footer}
      {props.caption && <figcaption class="fg__caption">{props.caption}</figcaption>}
    </figure>
  );
}

/**
 * An SVG that keeps its aspect ratio from the viewBox. `role` is 'img' (default) for a static picture; use 'group'
 * when the drawing contains focusable controls (sliders, buttons), because the children of role="img" are
 * presentational and hidden from assistive technology.
 */
export function Svg(props: {
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly role?: 'img' | 'group';
  readonly children: ComponentChildren;
  readonly svgRef?: RefObject<SVGSVGElement>;
  readonly class?: string;
  readonly onPointerDown?: JSX.PointerEventHandler<SVGSVGElement>;
  readonly onPointerMove?: JSX.PointerEventHandler<SVGSVGElement>;
  readonly onPointerUp?: JSX.PointerEventHandler<SVGSVGElement>;
  readonly viewBox?: string;
  /** cap the rendered width (CSS px) for tall figures */
  readonly maxWidth?: number;
}) {
  return (
    <svg
      ref={props.svgRef}
      class={`fg-svg ${props.class ?? ''}`}
      viewBox={props.viewBox ?? `0 0 ${props.w} ${props.h}`}
      style={props.maxWidth ? { aspectRatio: `${props.w} / ${props.h}`, maxWidth: `${props.maxWidth}px`, marginInline: 'auto' } : { aspectRatio: `${props.w} / ${props.h}` }}
      role={props.role ?? 'img'}
      aria-label={props.label}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerUp}
    >
      {props.children}
    </svg>
  );
}

/**
 * Layout-stable read-out: shows `children` and reserves the size of the largest of `reserve` (the other wordings it can
 * take, drawn invisibly in the same grid cell). Text that changes while the learner drags or an animation plays then
 * keeps its box at every width and in every language, so nothing around it moves. The reserves are hidden from
 * assistive technology (visibility: hidden + aria-hidden).
 */
export function Reserve(props: {
  readonly children: ComponentChildren;
  readonly reserve: readonly ComponentChildren[];
  /** block-level (a paragraph) instead of inline (a phrase inside a row) */
  readonly block?: boolean;
  readonly class?: string;
}) {
  return (
    <span class={`fg-reserve ${props.block ? 'fg-reserve--block' : ''} ${props.class ?? ''}`}>
      <span class="fg-reserve__on">{props.children}</span>
      {props.reserve.map((r) => (
        <span class="fg-reserve__ghost" aria-hidden="true">
          {r}
        </span>
      ))}
    </span>
  );
}

export function ReplayButton(props: { readonly onClick: () => void; readonly label?: string }) {
  return (
    <button type="button" class="fg-btn" onClick={props.onClick}>
      <Icon name="refresh" size={16} />
      <span>{props.label ?? tf('replay')}</span>
    </button>
  );
}

/** A labelled range input with a fixed-width numeric read-out. */
export function Slider(props: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onInput: (v: number) => void;
  readonly display?: string;
  /** the widest read-outs the slider can show, when they exceed the read-out's fixed minimum width */
  readonly displayReserve?: readonly string[];
  readonly id: string;
}) {
  const shown = props.display ?? String(props.value);
  return (
    <label class="fg-slider" for={props.id}>
      <span class="fg-slider__label">{props.label}</span>
      <input
        id={props.id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onInput={(e) => props.onInput(Number(e.currentTarget.value))}
      />
      <span class="fg-slider__value tabular">{props.displayReserve ? <Reserve reserve={props.displayReserve}>{shown}</Reserve> : shown}</span>
    </label>
  );
}

/**
 * Numeric input (integers / decimals) with label. In-range values are committed while typing; partial or
 * out-of-range entries ("4" on the way to "450") wait until the field is left, then are clamped (math/number.ts).
 */
export function NumberField(props: {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onChange: (v: number) => void;
  readonly suffix?: string;
}) {
  const settle = (el: HTMLInputElement) => {
    const v = finalNumber(el.value, props.min, props.max, props.value);
    el.value = String(v);
    if (v !== props.value) props.onChange(v);
  };
  return (
    <label class="fg-num" for={props.id}>
      <span class="fg-num__label">{props.label}</span>
      <span class="fg-num__row">
        <input
          id={props.id}
          class="tabular"
          type="number"
          inputMode="decimal"
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          value={props.value}
          onInput={(e) => {
            const v = liveNumber(e.currentTarget.value, props.min, props.max);
            if (v != null && v !== props.value) props.onChange(v);
          }}
          onBlur={(e) => settle(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') settle(e.currentTarget);
          }}
        />
        {props.suffix && <span class="fg-num__suffix">{props.suffix}</span>}
      </span>
    </label>
  );
}

/**
 * Two-to-six option toggle (radio group) styled like the shared Segmented control. Roving tab index: one tab stop,
 * arrow keys / Home / End select another option and move the focus with the selection (ARIA radio-group pattern).
 */
export function Toggle<T extends string | number>(props: {
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: ComponentChildren }[];
  readonly onChange: (v: T) => void;
  readonly label: string;
}) {
  const sel = props.options.findIndex((x) => x.value === props.value);
  return (
    <div class="fg-toggle" role="radiogroup" aria-label={props.label}>
      <span class="fg-toggle__label" aria-hidden="true">
        {props.label}
      </span>
      <span class="fg-toggle__opts">
        {props.options.map((o, i) => (
          <button
            type="button"
            role="radio"
            aria-checked={o.value === props.value}
            class={o.value === props.value ? 'is-on' : ''}
            onClick={() => props.onChange(o.value)}
            onKeyDown={(e) => {
              const j = radioKey(e.key, i, props.options.length);
              if (j == null) return;
              e.preventDefault();
              // the option buttons are stable siblings: focus the new one now, the re-render marks it checked
              (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
              if (j !== sel) props.onChange(props.options[j].value);
            }}
            // the selected option is the tab stop; if the value matches no option, the first one is
            tabIndex={i === (sel < 0 ? 0 : sel) ? 0 : -1}
          >
            {o.label}
          </button>
        ))}
      </span>
    </div>
  );
}

export function Check(props: { readonly id: string; readonly label: string; readonly checked: boolean; readonly onChange: (v: boolean) => void }) {
  return (
    <label class="fg-check" for={props.id}>
      <input id={props.id} type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.currentTarget.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

// ── animation ──────────────────────────────────────────────────────────────────────────────────────────────────

export function prefersReducedMotion(): boolean {
  try {
    if (store.settings.value.reduceMotion) return true;
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/**
 * Play-once animation progress 0…1: starts when the element first scrolls into view (if autoplay), plays once and
 * holds the last frame. Reduced motion jumps straight to the end. `replay()` restarts; `seek(f)` stops and sets.
 */
export function usePlayOnce(durationMs: number, autoplay: boolean, target?: RefObject<Element>) {
  const [p, setP] = useState(autoplay && !prefersReducedMotion() ? 0 : 1);
  const raf = useRef(0);
  const started = useRef(false);

  const replay = useCallback(() => {
    started.current = true;
    if (typeof requestAnimationFrame !== 'function' || prefersReducedMotion()) {
      setP(1);
      return;
    }
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const step = (now: number) => {
      const f = Math.min(1, (now - t0) / durationMs);
      setP(f);
      if (f < 1) raf.current = requestAnimationFrame(step);
    };
    setP(0);
    raf.current = requestAnimationFrame(step);
  }, [durationMs]);

  const seek = useCallback((f: number) => {
    started.current = true;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf.current);
    setP(Math.min(1, Math.max(0, f)));
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const el = target?.current;
    if (el && typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver((entries) => {
        if (!started.current && entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          replay();
        }
      });
      io.observe(el);
      return () => {
        io.disconnect();
        cancelAnimationFrame(raf.current);
      };
    }
    replay();
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf.current);
    };
  }, []);

  return { p, playing: p > 0 && p < 1, replay, seek };
}

/** The figure's time cursor: the shared one when given, else a local one. */
export function useCursor(cursor: Signal<number | null> | undefined): Signal<number | null> {
  const local = useSignal<number | null>(null);
  return cursor ?? local;
}

// ── pointer & keyboard ─────────────────────────────────────────────────────────────────────────────────────────

/** Pointer position in SVG user units. */
export function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }): [number, number] {
  const ctm = svg.getScreenCTM();
  if (!ctm) return [0, 0];
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return [pt.x, pt.y];
}

export { angleKey } from './math/keys';

// ── formatting ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Fixed decimals, localized decimal separator (comma in Spanish), true minus sign (current language by default). */
export function fmt(x: number, digits = 0, lang: Lang = store.lang.value): string {
  return formatFixed(x, digits, lang);
}

/** Signed with an explicit plus (axis angles: +60°, −30°). */
export function fmtSigned(x: number, digits = 0, lang: Lang = store.lang.value): string {
  return formatSigned(x, digits, lang);
}

export function fmtDeg(x: number, digits = 0): string {
  return `${fmtSigned(x, digits)}°`;
}

/** The big angle read-out (axis, vector), in a box that fits every angle so the row around it never re-wraps. */
export function DegReserve(props: { readonly deg: number | null; readonly digits?: number; readonly big?: boolean }) {
  const d = props.digits ?? 0;
  const cls = props.big === false ? 'tabular' : 'fg-big tabular';
  // tabular digits: three-digit angles of either sign are the widest
  return (
    <Reserve reserve={[<b class={cls}>{fmtDeg(-150, d)}</b>, <b class={cls}>{fmtDeg(150, d)}</b>]}>
      <b class={cls}>{props.deg == null ? '—' : fmtDeg(props.deg, d)}</b>
    </Reserve>
  );
}

// ── drawing helpers ────────────────────────────────────────────────────────────────────────────────────────────

/** A mini trace (values in arbitrary units) drawn into a box; `scale` units per value unit. */
export function MiniTrace(props: {
  readonly values: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly scale: number;
  readonly class?: string;
  readonly upto?: number;
}) {
  const n = props.values.length;
  const m = props.upto == null ? n : Math.max(1, Math.min(n, Math.round(props.upto * (n - 1)) + 1));
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < m; i++) pts.push([props.x + (props.w * i) / Math.max(1, n - 1), props.y - props.values[i] * props.scale]);
  return <path d={polyline(pts)} class={props.class ?? 'fg-trace'} />;
}

/** ECG paper grid inside a rectangle; `mm` = user units per millimetre. */
export function PaperGrid(props: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly mm: number; readonly minor?: boolean }) {
  const { x, y, w, h, mm } = props;
  const minor: string[] = [];
  const major: string[] = [];
  const nx = Math.floor(w / mm + 1e-6);
  const ny = Math.floor(h / mm + 1e-6);
  for (let i = 0; i <= nx; i++) (i % 5 === 0 ? major : minor).push(`M${x + i * mm} ${y}V${y + h}`);
  for (let j = 0; j <= ny; j++) (j % 5 === 0 ? major : minor).push(`M${x} ${y + j * mm}H${x + w}`);
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} class="fg-paper" />
      {props.minor !== false && <path d={minor.join('')} class="fg-grid-minor" />}
      <path d={major.join('')} class="fg-grid-major" />
    </g>
  );
}

/** SVG text broken into two lines at the space nearest the middle when longer than `max` characters. */
export function SvgLabel(props: { readonly x: number; readonly y: number; readonly text: string; readonly max?: number; readonly anchor?: 'start' | 'middle' | 'end'; readonly class?: string }) {
  const { x, y, text } = props;
  const max = props.max ?? 14;
  let lines = [text];
  if (text.length > max && text.includes(' ')) {
    const mid = text.length / 2;
    let best = -1;
    for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    lines = [text.slice(0, best), text.slice(best + 1)];
  }
  return (
    <text x={x} y={y} text-anchor={props.anchor ?? 'start'} class={props.class ?? 'fg-svg-text fg-svg-text--small'}>
      {lines.map((ln, i) => (
        <tspan x={x} dy={i === 0 ? 0 : '1.15em'}>
          {ln}
        </tspan>
      ))}
    </text>
  );
}

/** Arrow head marker defs (one per colour class). */
export function ArrowDefs(props: { readonly id: string; readonly kinds: readonly string[] }) {
  return (
    <defs>
      {props.kinds.map((k) => (
        <marker id={`${props.id}-${k}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" class={`fg-ah fg-ah--${k}`} />
        </marker>
      ))}
    </defs>
  );
}

/** Stable unique id prefix for SVG defs inside one figure instance. */
let uid = 0;
export function useUid(prefix: string): string {
  const ref = useRef<string>('');
  if (!ref.current) ref.current = `${prefix}${++uid}`;
  return ref.current;
}
