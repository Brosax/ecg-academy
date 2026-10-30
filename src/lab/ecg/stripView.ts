/**
 * Single-lead strip renderer, used by LeadDetail (a few beats, wave labels, interval brackets, projection readout) and
 * RhythmStrip (10 s). Monitor sweep; the rhythm strip runs at 25 mm/s and 10 mm/mV, a detail strip at its own zoom
 * (standard / 4 / 2 / 1 beat spread over the strip, gain 5/10/20 mm/mV, see zoom.ts; Ctrl/Cmd + wheel or +/- keys).
 * Calipers (store.calipers) are drawn and dragged here with pointer events (mouse, pen and touch).
 */
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { te } from '../i18n/ecg';
import type { CycleTruth, LeadName, SimEngine } from '../sim/types';
import { leadDecomposition } from './axes';
import { pickHandle } from './calipers';
import { CanvasView, font, withAlpha } from './canvas';
import { ClickFocus } from './clickFocus';
import { devPerMm, devPerMv, drawCalPulse, drawPaper, haloText, mmX, mmY, pathRing } from './draw';
import type { PaperFrame } from './draw';
import { fmtNum } from './format';
import { fitPxPerMm, mmToMs, msToMm, sweep, sweepFracOf, sweepTimeAt } from './paper';
import type { Sweep } from './paper';
import { getHub, leadIndex } from './sampler';
import type { BeatAnalysis, EcgHub } from './sampler';
import { bandsOn, caliperHandle } from './state';
import { beatSummary, drawBands, latestCompleteCycle } from './summary';
import type { WaveKind } from './waveLabels';
import { gainFactor, speedOf, STANDARD_ZOOM, stepZoom, stripScale, windowForTraceMm } from './zoom';
import type { StripZoom } from './zoom';
import type { Signal } from '@preact/signals';

export interface StripOptions {
  readonly lead: LeadName;
  readonly mode: 'detail' | 'rhythm';
  readonly showProjection?: boolean;
  /** DOM node that receives the live "voltage = |L| · (H · L̂)" values (detail + showProjection). */
  readonly projOut?: HTMLElement | null;
  /** Detail strips: paper speed and gain chosen by the student (rhythm strips stay at the standard 25 mm/s, 10 mm/mV). */
  readonly zoom?: Signal<StripZoom>;
  /** DOM node that receives the scale read-out ("200 mm/s · 10 mm/mV") of a zoomed strip; its title the grid value. */
  readonly scaleOut?: HTMLElement | null;
}

const CAL_MM = 7;
const RIGHT_MM = 2;
const ERASER_PX = 12;
const LABEL_COLOR: Readonly<Record<WaveKind, 'c-atrial' | 'c-qrs' | 'c-repol' | 'ecg-label'>> = {
  P: 'c-atrial', Q: 'c-qrs', R: 'c-qrs', S: 'c-qrs', QS: 'c-qrs', J: 'ecg-label', T: 'c-repol',
};

export class StripView extends CanvasView {
  private readonly hub: EcgHub;
  private f: PaperFrame = { pxPerMm: 0, dpr: 1, ox: 0, oy: 0 };
  private windowMs = 10000;
  private traceHMm = 30;
  private bracketMm = 0;
  private baselineMm = 18;
  private baselineFor = '';
  private hover: [number, number] | null = null;
  private down: { x: number; y: number; id: number } | null = null;
  private drag: { handle: 0 | 1; id: number } | null = null;
  private lastProj = 0;
  private projLang = '';
  /** The window follows the host's CSS-given aspect instead of setting it (see updateWindow). */
  private readonly fill: boolean;
  private readonly focus: ClickFocus;

  constructor(
    host: HTMLElement,
    bg: HTMLCanvasElement,
    fg: HTMLCanvasElement,
    private readonly engine: SimEngine,
    private readonly commands: AppCommands,
    private readonly opt: StripOptions,
  ) {
    super(host, bg, fg);
    this.hub = getHub(engine);
    this.focus = new ClickFocus(commands, engine);
    this.onDispose(() => this.focus.dispose());
    this.fill = host.closest('[data-strip-fill]') !== null;
    if (opt.mode === 'detail') {
      this.traceHMm = 30;
      this.bracketMm = 13;
      this.baselineMm = 22;
    }
    this.updateWindow();
    this.listen(host, 'pointerdown', (e) => this.pointerDown(e));
    this.listen(host, 'pointermove', (e) => this.pointerMove(e));
    this.listen(host, 'pointerup', (e) => this.pointerUp(e));
    this.listen(host, 'pointercancel', () => {
      this.drag = null;
      this.down = null;
    });
    this.listen(host, 'pointerleave', () => {
      this.hover = null;
      this.invalidateFrame();
    });
    this.listen(host, 'keydown', (e) => this.key(e));
    // Ctrl/Cmd + wheel zooms the time axis (a plain wheel keeps scrolling the page)
    if (opt.zoom)
      this.listen(
        host,
        'wheel',
        (e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          this.stepZoom(e.deltaY < 0 ? 1 : -1);
        },
        { passive: false },
      );
  }

  /** The zoom in effect (detail strips with a zoom signal; otherwise the clinical standard). */
  private zoom(): StripZoom {
    return this.opt.mode === 'detail' && this.opt.zoom ? this.opt.zoom.peek() : STANDARD_ZOOM;
  }
  private stepZoom(dir: 1 | -1): void {
    const z = this.opt.zoom;
    if (z) z.value = stepZoom(z.peek(), dir);
  }
  private zoomKey = '';
  /** Horizontal stretch relative to 25 mm/s (set by updateWindow). */
  private kx = 1;
  /** Sweep phase (ms): zoomed strips start each sweep 120 ms before a P wave. */
  private phaseMs = 0;
  private scaleText = '';

  private get widthMm(): number {
    return CAL_MM + msToMm(this.windowMs) * this.kx + RIGHT_MM;
  }

  /** Scale read-out of a zoomed strip (DOM text, only when it changes). */
  private writeScale(): void {
    const out = this.opt.scaleOut;
    if (!out) return;
    const lang = store.lang.peek();
    const speed = speedOf(this.kx), gain = this.zoom().gain;
    const text = te.in(lang, this.kx === 1 ? 'paper.scaleZ' : 'paper.scaleApprox', { speed, gain });
    const key = `${text}|${lang}`;
    if (key === this.scaleText) return;
    this.scaleText = key;
    out.textContent = text;
    out.title = te.in(lang, 'zoom.square', { ms: fmtNum(lang, 1000 / (25 * this.kx), 1), mv: fmtNum(lang, 1 / gain, 2) });
  }
  private get heightMm(): number {
    return this.traceHMm + this.bracketMm;
  }

  /**
   * Window and horizontal stretch. Rhythm strip: 10 s at 25 mm/s. Detail strip: see zoom.ts stripScale — standard
   * (≈ 3 beats at 25 mm/s, or as much as fits a fill box) or n beats spread over the strip.
   * Fill mode (an ancestor marked `data-strip-fill`, e.g. a fixed-height box): the host's size is set by CSS; otherwise
   * the strip sets its own aspect ratio.
   */
  private updateWindow(): void {
    const z = this.zoom();
    const rr = 60000 / store.heartRate.peek();
    const zk = `${z.beats}|${z.gain}`;
    const zoomChanged = zk !== this.zoomKey;
    this.zoomKey = zk;
    if (this.fill) {
      const { cssW, cssH } = this.size;
      if (cssW <= 0 || cssH <= 0) return;
      const mm = (cssW / cssH) * this.heightMm - CAL_MM - RIGHT_MM;
      const sc = this.opt.mode === 'rhythm' ? { windowMs: windowForTraceMm(mm), kx: 1 } : stripScale(z, rr, mm);
      if (Math.abs(sc.windowMs - this.windowMs) < 1 && Math.abs(sc.kx - this.kx) < 1e-3 && !zoomChanged) return;
      this.windowMs = sc.windowMs;
      this.kx = sc.kx;
      this.fitFrame();
      this.invalidateStatic();
      this.writeScale();
      return;
    }
    const sc = this.opt.mode === 'rhythm' ? { windowMs: 10000, kx: 1 } : stripScale(z, rr, null);
    if (Math.abs(sc.windowMs - this.windowMs) < 1 && this.host.style.aspectRatio && !zoomChanged) return;
    this.windowMs = sc.windowMs;
    this.kx = sc.kx;
    this.writeScale();
    this.host.style.aspectRatio = `${this.widthMm.toFixed(2)} / ${this.heightMm}`;
    this.onResize();
    this.invalidateStatic();
  }

  protected onResize(): void {
    if (this.fill) this.updateWindow();
    this.fitFrame();
  }

  private fitFrame(): void {
    const { cssW, cssH, dpr } = this.size;
    const pxPerMm = fitPxPerMm(cssW, cssH, this.widthMm, this.heightMm);
    const oy = Math.max(0, Math.round(((cssH - this.heightMm * pxPerMm) / 2) * dpr));
    this.f = { pxPerMm, dpr, ox: 0, oy };
  }

  /** Baseline placed from the lead's range in the latest complete beat, so tall R or deep S waves fit. */
  private updateBaseline(a: BeatAnalysis | null): void {
    const key = `${this.opt.lead}|${a?.key ?? ''}|${this.zoom().gain}`;
    if (!a || key === this.baselineFor) return;
    this.baselineFor = key;
    const li = leadIndex(this.opt.lead);
    let mx = 0, mn = 0;
    for (let i = 0; i < a.n; i++) {
      const v = a.leads[li * a.n + i];
      if (v > mx) mx = v;
      if (v < mn) mn = v;
    }
    const top = 4, H = this.traceHMm, g = this.zoom().gain;
    let b = top + mx * g;
    if (b - mn * g > H - 1) b = Math.max(top + 4, H - 1 + mn * g);
    b = Math.min(H - 2, Math.max(top, b));
    if (Math.abs(b - this.baselineMm) > 0.5) {
      this.baselineMm = Math.round(b);
      this.invalidateStatic();
    }
  }

  protected staticKey(): string {
    return `${this.opt.lead}|${this.windowMs}|${this.kx.toFixed(4)}|${this.baselineMm}|${this.zoomKey}`;
  }

  protected drawStatic(ctx: CanvasRenderingContext2D): void {
    const { pxW, pxH, dpr } = this.size;
    const f = this.f, c = this.colors;
    drawPaper(ctx, pxW, pxH, f, c);
    drawCalPulse(
      ctx,
      f,
      0,
      this.baselineMm,
      c['ecg-trace'],
      { text: te.in(store.lang.peek(), 'paper.cal'), color: c['ecg-label'], paperColor: c['ecg-paper'] },
      this.zoom().gain,
    );
    ctx.font = font(this.opt.mode === 'detail' ? 14 : 12, dpr, 700);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    haloText(ctx, this.opt.lead, mmX(f, CAL_MM + 1.2), mmY(f, 1.2), c['ecg-label'], c['ecg-paper'], dpr);
  }

  private dispTime(): number {
    const t = store.time.peek();
    return this.reducedMotion && store.playing.peek() ? Math.floor(t / this.windowMs) * this.windowMs : t;
  }

  private sweepNow(): Sweep {
    const gap = this.f.pxPerMm > 0 ? Math.max(20, mmToMs(ERASER_PX / this.f.pxPerMm) / this.kx) : 100;
    return sweep(this.dispTime(), this.windowMs, gap, this.phaseMs);
  }

  /**
   * Zoomed to whole beats: start each sweep 120 ms before a P wave (QRS onset when there is none), so every sweep shows
   * complete beats at the same place. Re-aligned only when a sweep is about to start, so the trace never jumps mid-sweep.
   */
  private alignPhase(latest: CycleTruth | null): void {
    if (this.zoom().beats === 0 || this.opt.mode !== 'detail') {
      this.phaseMs = 0;
      return;
    }
    const anchor = latest ? (latest.pOn ?? latest.qrsOn) : null;
    if (anchor === null) return;
    const want = (((anchor - 120) % this.windowMs) + this.windowMs) % this.windowMs;
    const d = Math.abs(want - this.phaseMs);
    if (Math.min(d, this.windowMs - d) < 30) return;
    const s = sweep(store.time.peek(), this.windowMs, 0, this.phaseMs);
    if (s.cursorFrac < 0.04 || s.cursorFrac > 0.97 || !store.playing.peek()) this.phaseMs = want;
  }

  protected frameKey(): string {
    const cal = store.calipers.peek();
    const want = cal ? 'none' : 'pan-y';
    if (this.host.style.touchAction !== want) this.host.style.touchAction = want;
    return [
      this.dispTime(), this.windowMs, this.kx.toFixed(4), this.phaseMs, this.zoomKey, store.heartRate.peek(), bandsOn.peek(), this.hover?.join(','), this.hub.version,
      cal ? `${cal.t0},${cal.t1}` : '-', caliperHandle.peek(), this.reducedMotion,
    ].join('|');
  }

  // ---------------------------------------------------------------- geometry

  private traceX0(): number {
    return mmX(this.f, CAL_MM);
  }
  private traceW(): number {
    return msToMm(this.windowMs) * this.kx * devPerMm(this.f);
  }
  private xOfFrac(frac: number): number {
    return this.traceX0() + frac * this.traceW();
  }
  /** Device px per mV at this strip's gain. */
  private devPerMvZ(): number {
    return devPerMv(this.f) * gainFactor(this.zoom());
  }
  /** Absolute time under a CSS-px x, or null (eraser gap / outside). */
  private timeAtCss(x: number, s: Sweep): number | null {
    const frac = (x * this.f.dpr - this.traceX0()) / this.traceW();
    if (frac < 0 || frac > 1) return null;
    const t = sweepTimeAt(s, frac);
    return t === null || t < 0 ? null : t;
  }

  // ---------------------------------------------------------------- frame

  protected drawFrame(ctx: CanvasRenderingContext2D): void {
    this.updateWindow();
    this.alignPhase(latestCompleteCycle(this.hub, store.time.peek()));
    const { pxW, pxH, dpr } = this.size;
    ctx.clearRect(0, 0, pxW, pxH);
    const f = this.f, c = this.colors;
    if (f.pxPerMm <= 0) return;
    const s = this.sweepNow();
    const t = s.t;
    const latest = latestCompleteCycle(this.hub, t);
    const latestA = latest ? this.hub.beat(latest) : null;
    this.updateBaseline(latestA);
    this.hub.ensureLeads(Math.max(0, t - this.windowMs - 50), t);
    const x0 = this.traceX0(), w = this.traceW();
    const y0 = mmY(f, this.baselineMm), sy = this.devPerMvZ();
    const top = mmY(f, 0), h = this.traceHMm * devPerMm(f);
    const cycles = this.hub.cycles.range(t - this.windowMs, t);

    if (bandsOn.peek())
      for (const sp of s.spans) drawBands(ctx, cycles, sp.t0, sp.t1, (tau) => x0 + ((tau - sp.tOrigin) / s.windowMs) * w, top, h, c);

    // Trace (clipped to the trace area: at a high gain tall waves may run past it, as on paper)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, pxW, h);
    ctx.clip();
    const dt = this.hub.dt, ch = leadIndex(this.opt.lead);
    ctx.strokeStyle = c['ecg-trace'];
    ctx.lineWidth = Math.max(1, (this.opt.mode === 'detail' ? 1.6 : 1.3) * dpr);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const sp of s.spans) {
      const kA = Math.ceil(Math.max(0, sp.t0) / dt), kB = Math.floor(sp.t1 / dt);
      if (kB <= kA) continue;
      pathRing(ctx, this.hub.leads, ch, kA, kB, x0 + ((kA * dt - sp.tOrigin) / s.windowMs) * w, (dt / s.windowMs) * w, y0, sy);
    }
    ctx.stroke();

    if (this.opt.mode === 'detail') this.drawLabels(ctx, s, cycles);
    ctx.restore();
    if (this.opt.mode === 'detail') this.drawBrackets(ctx, s, cycles);

    // Cursor + current value marker
    const xc = this.xOfFrac(s.cursorFrac);
    ctx.strokeStyle = c['ecg-cursor'];
    ctx.lineWidth = Math.max(1, 1.5 * dpr);
    ctx.beginPath();
    ctx.moveTo(xc, top);
    ctx.lineTo(xc, top + h);
    ctx.stroke();
    if (this.opt.mode === 'detail') {
      const v = this.hub.leadAt(this.opt.lead, t);
      ctx.fillStyle = c['ecg-cursor'];
      ctx.beginPath();
      ctx.arc(xc, y0 - v * sy, 3.5 * dpr, 0, 2 * Math.PI);
      ctx.fill();
      const lang = store.lang.peek();
      ctx.font = font(11, dpr, 600);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      haloText(ctx, te.in(lang, 'detail.now', { v: fmtNum(lang, v, 2) }), pxW - 4 * dpr, mmY(f, 1.2), c['ecg-cursor'], c['ecg-paper'], dpr);
      this.updateProjection(t, v);
    }

    this.drawCalipers(ctx, s);
    this.drawHover(ctx, s);
  }

  private drawLabels(ctx: CanvasRenderingContext2D, s: Sweep, cycles: readonly CycleTruth[]): void {
    const f = this.f, c = this.colors, dpr = f.dpr;
    const y0 = mmY(f, this.baselineMm), sy = this.devPerMvZ();
    ctx.font = font(12, dpr, 700);
    ctx.textAlign = 'center';
    for (const cy of cycles) {
      const a = this.hub.beat(cy);
      for (const l of a.labels(this.opt.lead).labels) {
        if (l.t > s.t) continue;
        const frac = sweepFracOf(s, l.t);
        if (frac === null) continue;
        const x = this.xOfFrac(frac), y = y0 - l.v * sy;
        const col = c[LABEL_COLOR[l.kind]];
        if (l.kind === 'J') {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(x, y, 2.5 * dpr, 0, 2 * Math.PI);
          ctx.fill();
          ctx.textBaseline = 'top';
          haloText(ctx, 'J', x + 7 * dpr, y + 3 * dpr, col, c['ecg-paper'], dpr);
          continue;
        }
        const up = l.amp >= 0;
        ctx.textBaseline = up ? 'bottom' : 'top';
        haloText(ctx, l.kind, x, y + (up ? -4 : 4) * dpr, col, c['ecg-paper'], dpr);
      }
    }
  }

  /** PR, QRS and QT brackets (measured from H) under the most recent beat fully on screen. */
  private drawBrackets(ctx: CanvasRenderingContext2D, s: Sweep, cycles: readonly CycleTruth[]): void {
    const f = this.f, c = this.colors, dpr = f.dpr, lang = store.lang.peek();
    for (let i = cycles.length - 1; i >= 0; i--) {
      const m = this.hub.beat(cycles[i]).measured;
      if (m.qrsOn === null || m.tEnd === null || m.tEnd > s.t) continue;
      const first = m.pOn ?? m.qrsOn;
      const fa = sweepFracOf(s, first), fb = sweepFracOf(s, m.tEnd);
      if (fa === null || fb === null || fb <= fa) continue;
      const X = (tt: number) => this.xOfFrac(sweepFracOf(s, tt) ?? 0);
      ctx.font = font(10.5, dpr, 600);
      ctx.textBaseline = 'middle';
      // One row per interval so short PR / QRS labels never collide; label after the bracket (before it near the edge).
      const bracket = (a: number, b: number, rowMm: number, label: string, color: string) => {
        const xa = X(a), xb = X(b), y = mmY(f, this.traceHMm + rowMm), tick = 3 * dpr;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, 1.2 * dpr);
        ctx.beginPath();
        ctx.moveTo(xa, y - tick);
        ctx.lineTo(xa, y);
        ctx.lineTo(xb, y);
        ctx.lineTo(xb, y - tick);
        ctx.stroke();
        const wText = ctx.measureText(label).width;
        const after = xb + 4 * dpr + wText < this.size.pxW;
        ctx.textAlign = after ? 'left' : 'right';
        haloText(ctx, label, after ? xb + 4 * dpr : xa - 4 * dpr, y - 1 * dpr, color, c['ecg-paper'], dpr);
      };
      if (m.pOn !== null && m.prMs !== null) bracket(m.pOn, m.qrsOn, 3.5, `PR ${fmtNum(lang, m.prMs)} ms`, c['c-conduction']);
      if (m.qrsOff !== null && m.qrsMs !== null) bracket(m.qrsOn, m.qrsOff, 7.5, `QRS ${fmtNum(lang, m.qrsMs)} ms`, c['c-qrs']);
      if (m.qtMs !== null) bracket(m.qrsOn, m.tEnd, 11.5, `QT ${fmtNum(lang, m.qtMs)} ms`, c['c-repol']);
      return;
    }
  }

  private calXs(s: Sweep): [number | null, number | null] {
    const cal = store.calipers.peek();
    if (!cal) return [null, null];
    const fx = (tt: number) => {
      const fr = sweepFracOf(s, tt);
      return fr === null ? null : this.xOfFrac(fr) / this.f.dpr;
    };
    return [fx(cal.t0), fx(cal.t1)];
  }

  private drawCalipers(ctx: CanvasRenderingContext2D, s: Sweep): void {
    const cal = store.calipers.peek();
    if (!cal) return;
    const f = this.f, c = this.colors, dpr = f.dpr, lang = store.lang.peek();
    const [xa, xb] = this.calXs(s);
    const top = mmY(f, 0), h = this.traceHMm * devPerMm(f);
    const active = caliperHandle.peek();
    ctx.strokeStyle = c['c-vector'];
    ctx.fillStyle = c['c-vector'];
    [xa, xb].forEach((xc, i) => {
      if (xc === null) return;
      const x = xc * dpr;
      ctx.lineWidth = Math.max(1, (i === active ? 2 : 1.4) * dpr);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + h);
      ctx.stroke();
      // Grab handle: wide enough for a fingertip.
      withAlpha(ctx, i === active ? 1 : 0.7, () => ctx.fillRect(x - 5 * dpr, top, 10 * dpr, 14 * dpr));
    });
    if (xa !== null && xb !== null) {
      // Connector and Δt at the bottom of the trace area, clear of the "now" readout and wave labels at the top.
      const y = top + h - 8 * dpr;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(xa * dpr, y);
      ctx.lineTo(xb * dpr, y);
      ctx.stroke();
      ctx.font = font(11, dpr, 700);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      haloText(ctx, te.in(lang, 'cal.dt', { dt: fmtNum(lang, Math.abs(cal.t1 - cal.t0)) }), ((xa + xb) / 2) * dpr, y - 3 * dpr, c['c-vector'], c['ecg-paper'], dpr);
    }
  }

  private drawHover(ctx: CanvasRenderingContext2D, s: Sweep): void {
    if (!this.hover || this.drag) return;
    const tt = this.timeAtCss(this.hover[0], s);
    if (tt === null) return;
    const f = this.f, c = this.colors, dpr = f.dpr, lang = store.lang.peek();
    const v = this.hub.leadAt(this.opt.lead, tt);
    const x = this.hover[0] * dpr, y = mmY(f, this.baselineMm) - v * this.devPerMvZ();
    withAlpha(ctx, 0.45, () => {
      ctx.strokeStyle = c['ecg-cursor'];
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(x, mmY(f, 0));
      ctx.lineTo(x, mmY(f, this.traceHMm));
      ctx.stroke();
    });
    ctx.fillStyle = c['ecg-cursor'];
    ctx.beginPath();
    ctx.arc(x, y, 3 * dpr, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = font(11, dpr, 600);
    ctx.textBaseline = 'bottom';
    const text = te.in(lang, 'hover.readout', { lead: this.opt.lead, t: fmtNum(lang, tt / 1000, 3), v: fmtNum(lang, v, 2) });
    const right = x + ctx.measureText(text).width + 12 * dpr > this.size.pxW;
    ctx.textAlign = right ? 'right' : 'left';
    haloText(ctx, text, x + (right ? -8 : 8) * dpr, Math.max(14 * dpr, y - 8 * dpr), c['ecg-label'], c['ecg-paper'], dpr);
  }

  /** Live "voltage = |L| · (H · L̂)" readout (~10 Hz, DOM text). */
  private updateProjection(t: number, v: number): void {
    const out = this.opt.projOut;
    if (!this.opt.showProjection || !out) return;
    const now = performance.now();
    const lang = store.lang.peek();
    if (lang === this.projLang && now - this.lastProj < 100) return;
    this.projLang = lang;
    this.lastProj = now;
    const d = leadDecomposition(this.hub.hAt(t), this.engine.projector.leadVector(this.opt.lead));
    // With L_A = L_V (MVP) the decomposition equals the lead sample; show the sampled value on the left.
    out.textContent = te.in(lang, 'proj.values', { v: fmtNum(lang, v, 2), sens: fmtNum(lang, d.sens, 2), along: fmtNum(lang, d.along, 2) });
  }

  // ---------------------------------------------------------------- interaction

  private pointerDown(e: PointerEvent): void {
    const [x, y] = this.localPoint(e);
    if (store.calipers.peek()) {
      const [xa, xb] = this.calXs(this.sweepNow());
      const hnd = pickHandle(xa, xb, x, e.pointerType === 'touch' ? 22 : 10);
      if (hnd !== -1) {
        this.drag = { handle: hnd, id: e.pointerId };
        caliperHandle.value = hnd;
        try {
          this.host.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        e.preventDefault();
        return;
      }
    }
    this.down = { x, y, id: e.pointerId };
  }

  private pointerMove(e: PointerEvent): void {
    const [x, y] = this.localPoint(e);
    this.hover = [x, y];
    this.invalidateFrame();
    const d = this.drag;
    const cal = store.calipers.peek();
    if (!d || d.id !== e.pointerId || !cal) return;
    const tt = this.timeAtCss(x, this.sweepNow());
    if (tt === null) return;
    store.calipers.value = d.handle === 0 ? { ...cal, t0: tt } : { ...cal, t1: tt };
  }

  private pointerUp(e: PointerEvent): void {
    if (this.drag && this.drag.id === e.pointerId) {
      this.drag = null;
      return;
    }
    const d = this.down;
    this.down = null;
    if (!d || d.id !== e.pointerId) return;
    const [x, y] = this.localPoint(e);
    if (Math.hypot(x - d.x, y - d.y) >= 5) return;
    const tt = this.timeAtCss(x, this.sweepNow());
    if (tt === null) return;
    // A tap freezes the heart at that instant: pause → seek → highlight (see ClickFocus).
    this.focus.focus(tt);
  }

  private key(e: KeyboardEvent): void {
    const cal = store.calipers.peek();
    if (cal) {
      if (e.key === 'Escape') {
        store.calipers.value = null;
        e.preventDefault();
        return;
      }
      if (e.key === '1' || e.key === '2') {
        caliperHandle.value = e.key === '1' ? 0 : 1;
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = (e.shiftKey ? 40 : 4) * (e.key === 'ArrowRight' ? 1 : -1);
        store.calipers.value = caliperHandle.peek() === 0 ? { ...cal, t0: cal.t0 + step } : { ...cal, t1: cal.t1 + step };
        return;
      }
      return;
    }
    if (this.opt.zoom && (e.key === '+' || e.key === '=' || e.key === '-')) {
      e.preventDefault();
      this.stepZoom(e.key === '-' ? -1 : 1);
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.shiftKey ? 200 : 40;
    this.commands.pause();
    this.commands.seek(store.time.peek() + (e.key === 'ArrowRight' ? step : -step));
  }

  protected updateAria(): void {
    const lang = store.lang.peek();
    const c = latestCompleteCycle(this.hub, store.time.peek());
    const summary = beatSummary(lang, c ? this.hub.beat(c) : null);
    const label = te.in(lang, this.opt.mode === 'detail' ? 'detail.aria' : 'rhythm.aria', { lead: this.opt.lead, summary });
    if (this.fg.getAttribute('aria-label') !== label) this.fg.setAttribute('aria-label', label);
  }
}
