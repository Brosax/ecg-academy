/**
 * Canvas stage shared by the sheet view and the monitor: keeps a set of stacked canvases at the CSS size of their box
 * times devicePixelRatio (ResizeObserver + a resolution media query for zoom / screen changes), and coalesces redraw
 * requests into one requestAnimationFrame — no loop runs while nothing changes.
 */
export class Stage {
  cssW = 0;
  cssH = 0;
  dpr = 1;
  private ro: ResizeObserver | null = null;
  private raf = 0;
  private mq: MediaQueryList | null = null;
  private readonly onMq = () => this.measure();
  private disposed = false;

  constructor(
    private readonly box: HTMLElement,
    private readonly canvases: readonly HTMLCanvasElement[],
    private readonly onResize: () => void,
    private readonly onFrame: () => void,
  ) {
    if (typeof ResizeObserver === 'function') {
      this.ro = new ResizeObserver(() => this.measure());
      this.ro.observe(box);
    }
    this.measure();
  }

  /** Re-read the box size and resolution; resizes the backing stores only when they change (resizing clears them). */
  measure(): void {
    if (this.disposed) return;
    const r = this.box.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(4, globalThis.devicePixelRatio || 1));
    const w = Math.max(0, r.width), h = Math.max(0, r.height);
    const changed = Math.abs(w - this.cssW) > 0.01 || Math.abs(h - this.cssH) > 0.01 || dpr !== this.dpr;
    this.cssW = w;
    this.cssH = h;
    if (dpr !== this.dpr || !this.mq) this.watchDpr(dpr);
    this.dpr = dpr;
    if (!changed && this.canvases.every((c) => c.width === Math.round(w * dpr))) return;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    for (const c of this.canvases) {
      if (c.width !== pw) c.width = pw;
      if (c.height !== ph) c.height = ph;
    }
    this.onResize();
    this.request();
  }

  private watchDpr(dpr: number): void {
    this.mq?.removeEventListener('change', this.onMq);
    this.mq = null;
    try {
      this.mq = matchMedia(`(resolution: ${dpr}dppx)`);
      this.mq.addEventListener('change', this.onMq);
    } catch {
      this.mq = null;
    }
  }

  get pxW(): number {
    return Math.round(this.cssW * this.dpr);
  }

  get pxH(): number {
    return Math.round(this.cssH * this.dpr);
  }

  /** Schedule one frame (coalesced). */
  request(): void {
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (!this.disposed) this.onFrame();
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
    this.mq?.removeEventListener('change', this.onMq);
  }
}

/** Pointer position in CSS px relative to an element. */
export function localPoint(el: Element, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
