/**
 * 12-lead panel renderer.
 *   sync (default): 3×4 cells all showing the SAME 2.5 s window as a monitor sweep (cursor + eraser gap), plus a
 *                   10 s lead-II rhythm row with its own sweep — the same instant sits at the same x in every column,
 *                   which is what makes the link to the 3D heart readable.
 *   clinical:       standard printout of the last 10 s (columns 0–2.5 / 2.5–5 / 5–7.5 / 7.5–10 s) + 10 s rhythm strip;
 *                   a static snapshot refreshed every 2.5 s while playing and held while paused.
 * Every sample comes from the shared hub (engine.sampleLeads = projector · H); nothing is drawn per lead by hand.
 */
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { te } from '../i18n/ecg';
import type { SimEngine } from '../sim/types';
import { CanvasView, font, withAlpha } from './canvas';
import { ClickFocus } from './clickFocus';
import { devPerMm, devPerMs, devPerMv, drawCalPulse, drawPaper, haloText, mmX, mmY, pathRing } from './draw';
import type { PaperFrame } from './draw';
import { fmtNum } from './format';
import {
  cellAt, clinicalAnchor, clinicalColumnOf, clinicalColumnStart, fitPxPerMm, mmToMs, sheetLayout, sweep, sweepTimeAt,
} from './paper';
import type { SheetCell, Sweep } from './paper';
import { getHub, leadIndex } from './sampler';
import type { EcgHub } from './sampler';
import { bandsOn } from './state';
import { beatSummary, drawBands, latestCompleteCycle } from './summary';

/** Eraser gap ≈ 12 CSS px (monitor convention, tech-stack §8 "Unsourced"). */
const ERASER_PX = 12;

export class Ecg12View extends CanvasView {
  private readonly hub: EcgHub;
  private readonly L = sheetLayout();
  private f: PaperFrame = { pxPerMm: 0, dpr: 1, ox: 0, oy: 0 };
  private hover: [number, number] | null = null;
  private anchor: number | null = null;
  private down: { x: number; y: number; id: number } | null = null;
  private readonly focus: ClickFocus;

  constructor(
    host: HTMLElement,
    bg: HTMLCanvasElement,
    fg: HTMLCanvasElement,
    private readonly engine: SimEngine,
    private readonly commands: AppCommands,
    private readonly tip: HTMLElement,
  ) {
    super(host, bg, fg);
    this.hub = getHub(engine);
    this.focus = new ClickFocus(commands, engine);
    this.onDispose(() => this.focus.dispose());
    this.listen(host, 'pointermove', (e) => {
      this.hover = this.localPoint(e);
      this.invalidateFrame();
    });
    this.listen(host, 'pointerleave', () => {
      this.hover = null;
      this.tip.hidden = true;
      this.invalidateFrame();
    });
    this.listen(host, 'pointerdown', (e) => {
      const [x, y] = this.localPoint(e);
      this.down = { x, y, id: e.pointerId };
    });
    this.listen(host, 'pointerup', (e) => {
      const d = this.down;
      this.down = null;
      if (!d || d.id !== e.pointerId) return;
      const [x, y] = this.localPoint(e);
      if (Math.hypot(x - d.x, y - d.y) < 5) this.click(x, y);
    });
    this.listen(host, 'pointercancel', () => (this.down = null));
    this.listen(host, 'keydown', (e) => this.key(e));
  }

  protected onResize(): void {
    const { cssW, cssH, dpr } = this.size;
    const pxPerMm = fitPxPerMm(cssW, cssH, this.L.widthMm, this.L.heightMm);
    // Centre the sheet in a box wider or taller than its aspect; every x/y goes through mmX/mmY (hit() inverts them).
    const ox = Math.max(0, Math.round(((cssW - this.L.widthMm * pxPerMm) / 2) * dpr));
    const oy = Math.max(0, Math.round(((cssH - this.L.heightMm * pxPerMm) / 2) * dpr));
    this.f = { pxPerMm, dpr, ox, oy };
  }

  private layoutKind(): 'sync' | 'clinical' {
    return store.ecgLayout.peek();
  }

  protected staticKey(): string {
    return `${this.layoutKind()}|${store.selectedLead.peek()}`;
  }

  protected drawStatic(ctx: CanvasRenderingContext2D): void {
    const { pxW, pxH, dpr } = this.size;
    const f = this.f, c = this.colors, L = this.L;
    drawPaper(ctx, pxW, pxH, f, c);
    const sel = store.selectedLead.peek();
    const fs = Math.max(9, Math.min(13, 3.6 * f.pxPerMm));
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    // "1 mV" caption on the first row only (the pulse is the same on every row).
    const calLabel = { text: te.in(store.lang.peek(), 'paper.cal'), color: c['ecg-label'], paperColor: c['ecg-paper'] };
    for (const row of [0, 1, 2, 3]) {
      const cell = row < 3 ? L.cells.find((x) => x.row === row && x.col === 0)! : L.rhythm;
      drawCalPulse(ctx, f, 0, cell.baselineMm, c['ecg-trace'], row === 0 ? calLabel : undefined);
    }
    for (const cell of [...L.cells, L.rhythm]) {
      const isSel = cell.lead === sel && cell !== L.rhythm;
      ctx.font = font(fs, dpr, isSel ? 700 : 600);
      haloText(ctx, cell.lead, mmX(f, cell.xMm + 1.2), mmY(f, cell.topMm + 1.2), isSel ? c['c-vector'] : c['ecg-label'], c['ecg-paper'], dpr);
      // Column boundary tick (lead change marker on a printout).
      if (cell.col > 0 && cell !== L.rhythm) {
        ctx.strokeStyle = c['ecg-label'];
        ctx.lineWidth = Math.max(1, dpr);
        const x = Math.round(mmX(f, cell.xMm)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, mmY(f, cell.baselineMm - 3));
        ctx.lineTo(x, mmY(f, cell.baselineMm + 3));
        ctx.stroke();
      }
    }
  }

  /** Displayed time: with reduced motion the sweep only refreshes once per window instead of animating. */
  private dispTime(t: number, windowMs: number): number {
    return this.reducedMotion && store.playing.peek() ? Math.floor(t / windowMs) * windowMs : t;
  }

  private gapMs(): number {
    return this.f.pxPerMm > 0 ? Math.max(60, mmToMs(ERASER_PX / this.f.pxPerMm)) : 100;
  }

  protected frameKey(): string {
    const t = store.time.peek();
    const kind = this.layoutKind();
    const base = `${kind}|${bandsOn.peek()}|${this.hover?.join(',')}|${this.hub.version}|${this.reducedMotion}`;
    if (kind === 'sync') return `${base}|${this.dispTime(t, this.L.colMs)}|${this.dispTime(t, this.L.rhythmMs)}`;
    const playing = store.playing.peek();
    // A printout is static while playing: redraw only when the anchor moves (or the paused playhead does).
    return `${base}|${clinicalAnchor(this.anchor, t, playing)}|${playing ? '' : t}`;
  }

  protected drawFrame(ctx: CanvasRenderingContext2D): void {
    const { pxW, pxH } = this.size;
    ctx.clearRect(0, 0, pxW, pxH);
    if (this.f.pxPerMm <= 0) return;
    const t = store.time.peek();
    this.hub.ensureLeads(Math.max(0, t - this.L.rhythmMs - 50), t);
    if (this.layoutKind() === 'sync') this.drawSync(ctx, t);
    else this.drawClinical(ctx, t);
    this.drawHover(ctx);
  }

  // ---------------------------------------------------------------- sync

  private sweeps(t: number): { cells: Sweep; rhythm: Sweep } {
    const gap = this.gapMs();
    return {
      cells: sweep(this.dispTime(t, this.L.colMs), this.L.colMs, gap),
      rhythm: sweep(this.dispTime(t, this.L.rhythmMs), this.L.rhythmMs, gap),
    };
  }

  private drawSync(ctx: CanvasRenderingContext2D, t: number): void {
    const f = this.f, L = this.L, c = this.colors;
    const { cells: sw, rhythm: rs } = this.sweeps(t);
    const dpm = devPerMm(f);
    const rowsTop = mmY(f, 0), rowsH = 3 * L.cells[0].hMm * dpm;
    if (bandsOn.peek()) {
      const cycles = this.hub.cycles.range(t - L.rhythmMs, t);
      for (let col = 0; col < 4; col++) {
        const cell = L.cells.find((x) => x.row === 0 && x.col === col)!;
        const x0 = mmX(f, cell.xMm), w = cell.wMm * dpm;
        for (const sp of sw.spans) drawBands(ctx, cycles, sp.t0, sp.t1, (tau) => x0 + ((tau - sp.tOrigin) / sw.windowMs) * w, rowsTop, rowsH, c);
      }
      const rx = mmX(f, L.rhythm.xMm), rw = L.rhythm.wMm * dpm;
      for (const sp of rs.spans) drawBands(ctx, cycles, sp.t0, sp.t1, (tau) => rx + ((tau - sp.tOrigin) / rs.windowMs) * rw, mmY(f, L.rhythm.topMm), L.rhythm.hMm * dpm, c);
    }
    ctx.strokeStyle = c['ecg-trace'];
    ctx.lineWidth = Math.max(1, 1.2 * f.dpr);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const cell of L.cells) this.pathSweep(ctx, cell, sw);
    this.pathSweep(ctx, L.rhythm, rs);
    ctx.stroke();
    // Cursors
    ctx.strokeStyle = c['ecg-cursor'];
    ctx.lineWidth = Math.max(1, 1.5 * f.dpr);
    ctx.beginPath();
    for (let col = 0; col < 4; col++) {
      const cell = L.cells.find((x) => x.row === 0 && x.col === col)!;
      const x = mmX(f, cell.xMm) + sw.cursorFrac * cell.wMm * dpm;
      ctx.moveTo(x, rowsTop);
      ctx.lineTo(x, rowsTop + rowsH);
    }
    const xr = mmX(f, L.rhythm.xMm) + rs.cursorFrac * L.rhythm.wMm * dpm;
    ctx.moveTo(xr, mmY(f, L.rhythm.topMm));
    ctx.lineTo(xr, mmY(f, L.rhythm.topMm + L.rhythm.hMm));
    ctx.stroke();
  }

  private pathSweep(ctx: CanvasRenderingContext2D, cell: SheetCell, s: Sweep): void {
    const f = this.f, dt = this.hub.dt;
    const x0 = mmX(f, cell.xMm), w = cell.wMm * devPerMm(f);
    const y0 = mmY(f, cell.baselineMm), sy = devPerMv(f);
    const ch = leadIndex(cell.lead);
    for (const sp of s.spans) {
      const kA = Math.ceil(Math.max(0, sp.t0) / dt), kB = Math.floor(sp.t1 / dt);
      if (kB <= kA) continue;
      const xa = x0 + ((kA * dt - sp.tOrigin) / s.windowMs) * w;
      pathRing(ctx, this.hub.leads, ch, kA, kB, xa, (dt / s.windowMs) * w, y0, sy);
    }
  }

  // ---------------------------------------------------------------- clinical

  private drawClinical(ctx: CanvasRenderingContext2D, t: number): void {
    const f = this.f, L = this.L, c = this.colors, dt = this.hub.dt;
    const anchor = clinicalAnchor(this.anchor, t, store.playing.peek());
    this.anchor = anchor;
    const dpm = devPerMm(f), dms = devPerMs(f), sy = devPerMv(f);
    const cycles = bandsOn.peek() ? this.hub.cycles.range(anchor - L.rhythmMs, anchor) : [];
    const rowsTop = mmY(f, 0), rowsH = 3 * L.cells[0].hMm * dpm;
    for (let col = 0; col < 4; col++) {
      const ts = clinicalColumnStart(anchor, col);
      const x0 = mmX(f, L.calMm) + col * L.colMs * dms;
      drawBands(ctx, cycles, ts, ts + L.colMs, (tau) => x0 + (tau - ts) * dms, rowsTop, rowsH, c);
    }
    const rStart = anchor - L.rhythmMs;
    drawBands(ctx, cycles, rStart, anchor, (tau) => mmX(f, L.rhythm.xMm) + (tau - rStart) * dms, mmY(f, L.rhythm.topMm), L.rhythm.hMm * dpm, c);

    ctx.strokeStyle = c['ecg-trace'];
    ctx.lineWidth = Math.max(1, 1.2 * f.dpr);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const span = (cell: SheetCell, ts: number, te_: number) => {
      const kA = Math.ceil(Math.max(0, ts) / dt), kB = Math.floor(te_ / dt);
      if (kB <= kA) return;
      pathRing(ctx, this.hub.leads, leadIndex(cell.lead), kA, kB, mmX(f, cell.xMm) + (kA * dt - ts) * dms, dt * dms, mmY(f, cell.baselineMm), sy);
    };
    for (const cell of L.cells) {
      const ts = clinicalColumnStart(anchor, cell.col);
      span(cell, ts, ts + L.colMs);
    }
    span(L.rhythm, rStart, anchor);
    ctx.stroke();

    // The playhead appears only when the current instant is on the sheet (paused / after clicking).
    const col = clinicalColumnOf(anchor, t);
    if (col >= 0 && !store.playing.peek()) {
      ctx.strokeStyle = c['ecg-cursor'];
      ctx.lineWidth = Math.max(1, 1.5 * f.dpr);
      ctx.beginPath();
      const x = mmX(f, L.calMm) + (t - rStart) * dms;
      ctx.moveTo(x, rowsTop);
      ctx.lineTo(x, rowsTop + rowsH);
      const xr = mmX(f, L.rhythm.xMm) + (t - rStart) * dms;
      ctx.moveTo(xr, mmY(f, L.rhythm.topMm));
      ctx.lineTo(xr, mmY(f, L.rhythm.topMm + L.rhythm.hMm));
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- hit testing & interaction

  /** Lead and absolute time under a CSS-px point, or null. */
  private hit(x: number, y: number): { cell: SheetCell; t: number } | null {
    const f = this.f;
    if (f.pxPerMm <= 0) return null;
    const xMm = (x * f.dpr - f.ox) / devPerMm(f), yMm = (y * f.dpr - f.oy) / devPerMm(f);
    const cell = cellAt(this.L, xMm, yMm);
    if (!cell) return null;
    const frac = (xMm - cell.xMm) / cell.wMm;
    const t = store.time.peek();
    const isRhythm = cell === this.L.rhythm;
    if (this.layoutKind() === 'sync') {
      const s = this.sweeps(t);
      const tau = sweepTimeAt(isRhythm ? s.rhythm : s.cells, frac);
      return tau === null || tau < 0 ? null : { cell, t: tau };
    }
    const anchor = this.anchor ?? clinicalAnchor(null, t, store.playing.peek());
    const tau = isRhythm ? anchor - this.L.rhythmMs + frac * this.L.rhythmMs : clinicalColumnStart(anchor, cell.col) + frac * this.L.colMs;
    return tau < 0 ? null : { cell, t: tau };
  }

  private drawHover(ctx: CanvasRenderingContext2D): void {
    if (!this.hover) return;
    const h = this.hit(this.hover[0], this.hover[1]);
    if (!h) {
      this.tip.hidden = true;
      return;
    }
    const f = this.f, c = this.colors;
    const v = this.hub.leadAt(h.cell.lead, h.t);
    const x = this.hover[0] * f.dpr;
    const y = mmY(f, h.cell.baselineMm) - v * devPerMv(f);
    withAlpha(ctx, 0.5, () => {
      ctx.strokeStyle = c['ecg-cursor'];
      ctx.lineWidth = Math.max(1, f.dpr);
      ctx.beginPath();
      ctx.moveTo(x, mmY(f, h.cell.topMm));
      ctx.lineTo(x, mmY(f, h.cell.topMm + h.cell.hMm));
      ctx.stroke();
    });
    ctx.fillStyle = c['ecg-cursor'];
    ctx.beginPath();
    ctx.arc(x, y, 3 * f.dpr, 0, 2 * Math.PI);
    ctx.fill();
    const lang = store.lang.peek();
    this.tip.textContent = te.in(lang, 'hover.readout', { lead: h.cell.lead, t: fmtNum(lang, h.t / 1000, 3), v: fmtNum(lang, v, 2) });
    this.tip.hidden = false;
    const left = Math.min(this.hover[0] + 12, Math.max(0, this.size.cssW - this.tip.offsetWidth - 4));
    this.tip.style.left = `${left}px`;
    this.tip.style.top = `${Math.max(0, this.hover[1] - 30)}px`;
  }

  /** Freeze the heart at the clicked instant: pause → seek → select the lead → highlight (see ClickFocus). */
  private click(x: number, y: number): void {
    const h = this.hit(x, y);
    if (!h) return;
    this.focus.focus(h.t, h.cell.lead);
  }

  private key(e: KeyboardEvent): void {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.shiftKey ? 200 : 40;
    this.commands.pause();
    this.commands.seek(store.time.peek() + (e.key === 'ArrowRight' ? step : -step));
  }

  protected updateAria(): void {
    const lang = store.lang.peek();
    const c = latestCompleteCycle(this.hub, store.time.peek());
    const layout = te.in(lang, this.layoutKind() === 'sync' ? 'layout.sync' : 'layout.clinical');
    const label = te.in(lang, 'ecg12.aria', { layout, summary: beatSummary(lang, c ? this.hub.beat(c) : null) });
    if (this.fg.getAttribute('aria-label') !== label) this.fg.setAttribute('aria-label', label);
  }
}
