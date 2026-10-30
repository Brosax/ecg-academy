/**
 * DOM controller of the bedside-monitor sweep: one lead written left → right with an erase bar ahead of the write
 * head. It plays once through the record and holds the last screen (no loop). The animation runs only while playing;
 * under reduced motion the screen changes once per full window instead of sweeping. Clicking pauses and sets the
 * shared cursor.
 */
import type { Ecg } from '../core/ecg';
import type { Lang } from '../core/l10n';
import type { Lead } from '../core/leads';
import { te } from '../i18n/ecg';
import { decimatedCapacity, decimateMinMax, scratchBuf } from './decimate';
import { drawGrid, haloText, type DrawEnv } from './draw';
import { leadArray, type Frame } from './layout';
import { fitPxPerMm } from './paper';
import { localPoint, Stage } from './stage';
import { eraseGapMs, pagedTime, sweep, sweepFracOf, sweepTimeAt, type MonitorGeometry } from './sweep';
import { canvasFont, readPalette } from './theme';

export interface MonitorInput {
  readonly ecg: Ecg;
  readonly lead: Lead;
  readonly windowMs: number;
  readonly speed: number;
  readonly gain: number;
  readonly geo: MonitorGeometry;
  readonly lang: Lang;
  readonly reduced: boolean;
  readonly cursorEnabled: boolean;
}

export interface MonitorHooks {
  setPlaying(v: boolean): void;
  setCursor(t: number): void;
}

export class MonitorView {
  private readonly stage: Stage;
  private readonly grid: HTMLCanvasElement;
  private input: MonitorInput | null = null;
  private frame: Frame = { pxPerMm: 0, ox: 0, oy: 0 };
  private dirtyGrid = true;
  private t = 0;
  private playing = false;
  private last = 0;
  private raf = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private cursor: number | null = null;
  /** the cursor value this view wrote last (to tell its own writes from a click elsewhere) */
  private wrote: number | null = null;
  private readonly offs: (() => void)[] = [];

  constructor(
    private readonly box: HTMLElement,
    private readonly cv: HTMLCanvasElement,
    private readonly hooks: MonitorHooks,
  ) {
    this.grid = document.createElement('canvas');
    this.stage = new Stage(box, [cv, this.grid], () => this.onResize(), () => this.render());
    const down = { x: 0, y: 0, id: -1 };
    const onDown = (e: PointerEvent) => {
      down.x = e.clientX;
      down.y = e.clientY;
      down.id = e.pointerId;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== down.id || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      down.id = -1;
      this.click(localPoint(cv, e).x);
    };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointerup', onUp);
    this.offs.push(() => cv.removeEventListener('pointerdown', onDown));
    this.offs.push(() => cv.removeEventListener('pointerup', onUp));
  }

  dispose(): void {
    this.stop();
    this.stage.dispose();
    for (const off of this.offs) off();
  }

  update(next: MonitorInput): void {
    const prev = this.input;
    this.input = next;
    if (!prev || prev.geo !== next.geo || prev.windowMs !== next.windowMs) {
      this.computeFrame();
      this.dirtyGrid = true;
    }
    if (prev && prev.ecg !== next.ecg) this.t = 0;
    if (prev && prev.reduced !== next.reduced && this.playing) {
      this.stop();
      this.last = performance.now();
      this.tick();
    }
    this.stage.request();
  }

  themeChanged(): void {
    this.dirtyGrid = true;
    this.stage.request();
  }

  setCursor(v: number | null): void {
    if (v === this.cursor) return;
    this.cursor = v;
    // a click on another view of the same ECG pauses the sweep (the cursor is the learner's now)
    if (this.playing && v !== null && v !== this.wrote) this.hooks.setPlaying(false);
    if (!this.playing) this.stage.request();
  }

  setPlaying(v: boolean): void {
    const inp = this.input;
    if (v === this.playing) return;
    this.playing = v;
    if (v) {
      if (inp && this.t >= inp.ecg.signal.durationMs) this.t = 0;
      this.last = performance.now();
      this.tick();
    } else {
      this.stop();
      this.stage.request();
    }
  }

  /** Space / Enter */
  toggle(): void {
    this.hooks.setPlaying(!this.playing);
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private readonly tick = (): void => {
    this.raf = 0;
    this.timer = null;
    const inp = this.input;
    if (!this.playing || !inp) return;
    const dur = inp.ecg.signal.durationMs;
    const now = performance.now();
    this.t = Math.min(dur, this.t + (now - this.last));
    this.last = now;
    if (inp.cursorEnabled) {
      this.wrote = Math.round(this.t);
      this.hooks.setCursor(this.wrote);
    }
    if (this.t >= dur) {
      // hold the last screen (no write head) and hand the play state back
      this.playing = false;
      this.render();
      this.hooks.setPlaying(false);
      return;
    }
    this.render();
    if (inp.reduced) {
      // next page boundary: one redraw per window
      const next = Math.min(dur, (Math.floor(this.t / inp.windowMs) + 1) * inp.windowMs);
      this.timer = setTimeout(this.tick, Math.max(16, next - this.t + 1));
    } else {
      this.raf = requestAnimationFrame(this.tick);
    }
  };

  private onResize(): void {
    this.computeFrame();
    this.dirtyGrid = true;
  }

  private computeFrame(): void {
    const inp = this.input;
    if (!inp) return;
    const { cssW, cssH, dpr } = this.stage;
    const ppm = fitPxPerMm(cssW, cssH, inp.geo.widthMm, inp.geo.heightMm);
    const ox = Math.max(0, Math.round(((cssW - inp.geo.widthMm * ppm) / 2) * dpr) / dpr);
    const oy = Math.max(0, Math.round(((cssH - inp.geo.heightMm * ppm) / 2) * dpr) / dpr);
    this.frame = { pxPerMm: ppm, ox, oy };
  }

  /**
   * Time shown on screen: before the first play the first window is shown complete (a still preview, so the screen is
   * never empty); under reduced motion whole pages; otherwise the write head.
   */
  private shownTime(inp: MonitorInput): number {
    const dur = inp.ecg.signal.durationMs;
    if (!this.playing && this.t === 0) return Math.min(dur, inp.windowMs - 1e-6);
    return inp.reduced ? pagedTime(this.t, inp.windowMs, dur) : this.t;
  }

  private click(x: number): void {
    const inp = this.input;
    if (!inp) return;
    if (this.playing) this.hooks.setPlaying(false);
    const s = sweep(this.shownTime(inp), inp.windowMs, eraseGapMs(inp.windowMs));
    const frac = (x - this.frame.ox) / (inp.geo.widthMm * this.frame.pxPerMm);
    const t = sweepTimeAt(s, frac);
    if (t !== null && inp.cursorEnabled) {
      this.wrote = null;
      this.hooks.setCursor(Math.round(t));
    }
  }

  private render(): void {
    const inp = this.input;
    if (!inp) return;
    const w = this.stage.pxW, h = this.stage.pxH, dpr = this.stage.dpr;
    const f = this.frame;
    if (w <= 0 || h <= 0 || !(f.pxPerMm > 0)) return;
    const pal = readPalette();
    if (this.dirtyGrid) {
      const g = this.grid.getContext('2d');
      if (g) drawGrid(g, w, h, f, dpr, pal);
      this.dirtyGrid = false;
    }
    const ctx = this.cv.getContext('2d');
    if (!ctx) return;
    const e: DrawEnv = { ctx, f, dpr, pal, lang: inp.lang };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.grid, 0, 0);
    const dpm = f.pxPerMm * dpr;
    const X = (mm: number) => (f.ox + mm * f.pxPerMm) * dpr;
    const y0 = (f.oy + inp.geo.baselineMm * f.pxPerMm) * dpr;
    const W = inp.geo.widthMm;
    const shown = this.shownTime(inp);
    const s = sweep(shown, inp.windowMs, eraseGapMs(inp.windowMs));
    const a = leadArray(inp.ecg.signal, inp.lead);
    const fs = inp.ecg.signal.fs;
    ctx.strokeStyle = pal['ecg-trace'];
    ctx.lineWidth = Math.max(1, Math.min(1.8, 0.32 * f.pxPerMm) * dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (a && shown > 0) {
      ctx.beginPath();
      const sy = inp.gain * dpm;
      for (const sp of s.spans) {
        const i0 = Math.max(0, Math.ceil((sp.t0 * fs) / 1000));
        const i1 = Math.min(a.length - 1, Math.floor((sp.t1 * fs) / 1000));
        const n = i1 - i0 + 1;
        if (n < 2) continue;
        const x0 = X((((i0 * 1000) / fs - sp.tOrigin) / inp.windowMs) * W);
        const dx = ((1000 / fs) / inp.windowMs) * W * dpm;
        const out = scratchBuf(2, 2 * decimatedCapacity(n, dx) + 4);
        const m = decimateMinMax(a, i0, n, x0, dx, out);
        if (m === 0) continue;
        ctx.moveTo(out[0], y0 - out[1] * sy);
        for (let i = 1; i < m; i++) ctx.lineTo(out[2 * i], y0 - out[2 * i + 1] * sy);
      }
      ctx.stroke();
      // write head
      if (this.playing && !inp.reduced) {
        const hx = X(s.headFrac * W);
        const v = a[Math.min(a.length - 1, Math.max(0, Math.round((shown * fs) / 1000)))] ?? 0;
        ctx.fillStyle = pal['ecg-trace'];
        ctx.beginPath();
        ctx.arc(hx, y0 - v * sy, 2.6 * dpr, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    // cursor (when paused)
    if (!this.playing && this.cursor !== null) {
      const fr = sweepFracOf(s, this.cursor);
      if (fr !== null) {
        const x = Math.round(X(fr * W)) + 0.5;
        ctx.strokeStyle = pal['ecg-cursor'];
        ctx.lineWidth = Math.max(1, 1.5 * dpr);
        ctx.beginPath();
        ctx.moveTo(x, (f.oy + 0.5) * dpr);
        ctx.lineTo(x, (f.oy + inp.geo.heightMm * f.pxPerMm - 0.5) * dpr);
        ctx.stroke();
      }
    }
    // label: lead · speed · gain
    const px = Math.max(10, Math.min(14, 3.2 * f.pxPerMm));
    ctx.font = canvasFont(px, dpr, 650);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const label = `${inp.lead}   ${inp.speed} mm/s · ${inp.gain} mm/mV`;
    haloText(e, label, X(1.5), (f.oy + 1.2 * f.pxPerMm) * dpr, pal['ecg-label']);
    if (!a) {
      ctx.textBaseline = 'middle';
      haloText(e, te.in(inp.lang, 'noLead', { lead: inp.lead }), X(10), y0, pal['ecg-trace-muted']);
    }
  }
}
