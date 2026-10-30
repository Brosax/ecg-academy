/**
 * Canvas infrastructure for the ECG views (docs/research/tech-stack.md §8b):
 *   - layered canvases: a static layer (paper grid, axes, labels) redrawn only when its key changes (resize, theme,
 *     language, engine/scenario, layout…) and a transparent dynamic layer redrawn per frame when needed;
 *   - ResizeObserver with device-pixel-content-box (fallback contentRect × devicePixelRatio, e.g. Safari) and a
 *     resolution media query for zoom/DPR changes; canvas.width is touched only on resize (setting it clears);
 *   - colours from readThemeColors(), re-read when themeVersion changes;
 *   - prefers-reduced-motion tracked for cursor animation.
 * Each view owns its own requestAnimationFrame loop and reads store.time.peek() (never .value).
 */
import { store } from '../app/store';
import { readThemeColors, themeVersion } from '../app/theme';
import type { ThemeColors } from '../app/theme';

export interface StageSize {
  readonly cssW: number;
  readonly cssH: number;
  readonly dpr: number;
  /** Backing-store size in device px. */
  readonly pxW: number;
  readonly pxH: number;
}

const EMPTY: StageSize = { cssW: 0, cssH: 0, dpr: 1, pxW: 0, pxH: 0 };

export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Reusable scratch buffers (drawing is single-threaded; never hold one across frames). */
const scratch: Float32Array[] = [];
export function scratchBuf(slot: number, n: number): Float32Array {
  const b = scratch[slot];
  if (b && b.length >= n) return b;
  const nb = new Float32Array(Math.max(n, 1024, (b?.length ?? 0) * 2));
  scratch[slot] = nb;
  return nb;
}

export abstract class CanvasView {
  protected size: StageSize = EMPTY;
  protected colors!: ThemeColors;
  protected reducedMotion = prefersReducedMotion();
  protected readonly bgCtx: CanvasRenderingContext2D | null;
  protected readonly fgCtx: CanvasRenderingContext2D;
  private raf = 0;
  private ro: ResizeObserver | null = null;
  private themeV = -1;
  private staticKeyDrawn = '';
  private frameKeyDrawn = '';
  private disposed = false;
  private cleanups: (() => void)[] = [];
  private lastAria = 0;

  constructor(
    protected readonly host: HTMLElement,
    protected readonly bg: HTMLCanvasElement | null,
    protected readonly fg: HTMLCanvasElement,
    /** false: the static layer is transparent (the stage's CSS background shows through) instead of opaque paper. */
    opaqueBg = true,
  ) {
    this.bgCtx = bg ? bg.getContext('2d', { alpha: !opaqueBg }) : null;
    const ctx = fg.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.fgCtx = ctx;
    if (typeof ResizeObserver === 'function') {
      this.ro = new ResizeObserver((entries) => {
        const e = entries[entries.length - 1];
        if (e) this.applySize(e);
      });
      try {
        this.ro.observe(host, { box: 'device-pixel-content-box' });
      } catch {
        this.ro.observe(host);
      }
    }
    this.watchDpr();
    try {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      const on = () => {
        this.reducedMotion = mq.matches;
        this.invalidateFrame();
      };
      mq.addEventListener('change', on);
      this.cleanups.push(() => mq.removeEventListener('change', on));
    } catch {
      /* no matchMedia */
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Re-measures when the device-pixel ratio changes (browser zoom, moving between screens). */
  private watchDpr(): void {
    try {
      const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      const on = () => {
        mq.removeEventListener('change', on);
        const r = this.host.getBoundingClientRect();
        this.setSize(r.width, r.height, null);
        this.watchDpr();
      };
      mq.addEventListener('change', on);
      this.cleanups.push(() => mq.removeEventListener('change', on));
    } catch {
      /* ignore */
    }
  }

  private applySize(e: ResizeObserverEntry): void {
    const dp = e.devicePixelContentBoxSize?.[0];
    this.setSize(e.contentRect.width, e.contentRect.height, dp ? [dp.inlineSize, dp.blockSize] : null);
  }

  private setSize(cssW: number, cssH: number, devicePx: [number, number] | null): void {
    const dprNow = window.devicePixelRatio || 1;
    const pxW = devicePx ? devicePx[0] : Math.round(cssW * dprNow);
    const pxH = devicePx ? devicePx[1] : Math.round(cssH * dprNow);
    const dpr = cssW > 0 ? pxW / cssW : dprNow;
    if (pxW === this.size.pxW && pxH === this.size.pxH && cssW === this.size.cssW && cssH === this.size.cssH) return;
    this.size = { cssW, cssH, dpr, pxW, pxH };
    for (const c of [this.bg, this.fg]) {
      if (!c) continue;
      if (c.width !== pxW) c.width = pxW;
      if (c.height !== pxH) c.height = pxH;
    }
    this.staticKeyDrawn = '';
    this.frameKeyDrawn = '';
    this.onResize();
  }

  /** Forces the dynamic layer to redraw on the next frame (pointer moves, toggles). */
  invalidateFrame(): void {
    this.frameKeyDrawn = '';
  }
  /** Forces the static layer to redraw on the next frame. */
  invalidateStatic(): void {
    this.staticKeyDrawn = '';
  }

  private tick = (ts: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const { pxW, pxH } = this.size;
    if (pxW <= 0 || pxH <= 0) return;
    const tv = themeVersion.peek();
    if (tv !== this.themeV) {
      this.themeV = tv;
      this.colors = readThemeColors(this.host);
      this.staticKeyDrawn = '';
      this.frameKeyDrawn = '';
    }
    const sk = `${pxW}x${pxH}|${tv}|${store.lang.peek()}|${this.staticKey()}`;
    if (sk !== this.staticKeyDrawn) {
      this.staticKeyDrawn = sk;
      this.frameKeyDrawn = '';
      if (this.bgCtx) this.drawStatic(this.bgCtx);
    }
    const fk = this.frameKey(ts);
    if (fk !== this.frameKeyDrawn) {
      this.frameKeyDrawn = fk;
      this.drawFrame(this.fgCtx, ts);
    }
    if (ts - this.lastAria > 500) {
      this.lastAria = ts;
      this.updateAria();
    }
  };

  /** Changes of anything drawn on the static layer (besides size/theme/language, which are handled here). */
  protected abstract staticKey(): string;
  protected abstract drawStatic(ctx: CanvasRenderingContext2D): void;
  /** Dynamic-layer key; return the same string to skip a redraw (e.g. paused and nothing changed). */
  protected abstract frameKey(ts: number): string;
  protected abstract drawFrame(ctx: CanvasRenderingContext2D, ts: number): void;
  /** Throttled (2 Hz) accessibility text update. */
  protected updateAria(): void {}
  protected onResize(): void {}

  /** CSS-px point of a pointer event relative to the host. */
  protected localPoint(e: { clientX: number; clientY: number }): [number, number] {
    const r = this.host.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  protected onDispose(fn: () => void): void {
    this.cleanups.push(fn);
  }

  /** Adds a DOM listener removed on dispose. */
  protected listen<K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions): void {
    el.addEventListener(type, fn as EventListener, opts);
    this.cleanups.push(() => el.removeEventListener(type, fn as EventListener, opts));
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    for (const f of this.cleanups) f();
    this.cleanups = [];
  }
}

/** Sets alpha on a hex/rgb colour by using globalAlpha around a fill. */
export function withAlpha(ctx: CanvasRenderingContext2D, alpha: number, fn: () => void): void {
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  fn();
  ctx.globalAlpha = a;
}

/** Font string in device px (canvas text is drawn in device px on unscaled contexts). */
export function font(px: number, dpr: number, weight = 500, mono = false): string {
  const fam = mono
    ? "ui-monospace, 'SFMono-Regular', 'Cascadia Mono', Consolas, monospace"
    : "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
  return `${weight} ${Math.round(px * dpr)}px ${fam}`;
}
