/**
 * DOM controller of the 12-lead sheet: three canvases (pre-rendered paper grid, static base, interactive overlay),
 * pointer and keyboard handling, read-outs. All decisions are delegated to the pure modules (layout, interact, render);
 * this class only owns the mutable interaction state and schedules redraws (one coalesced frame per change — nothing
 * runs while the learner does nothing).
 */
import type { Ecg } from '../core/ecg';
import type { Lang } from '../core/l10n';
import { te } from '../i18n/ecg';
import type { CaliperMeasure, PickEvent } from './api';
import { defaultCalipers, type CaliperState } from './calipers';
import { drawGrid, type DrawEnv } from './draw';
import { fmtNum } from './format';
import {
  anyToolOn,
  applyKey,
  caliperHandleAt,
  caliperHomePanel,
  caliperMeasure,
  caliperMode,
  caliperNumbers,
  crossNumbers,
  dragCalipers,
  layCalipers,
  reconcileCalipers,
  reconcileFocus,
  revealRect,
  traceValue,
  NO_TOOLS,
  HANDLE_TOL_PX,
  type CaliperNumbers,
  type FocusPoint,
  type ToolAvail,
  type ToolState,
} from './interact';
import { hitTest, pxX, pxY, rowOf, xOfT, yOfMv, type Frame, type Sheet } from './layout';
import { caliperAnnouncement } from './help';
import { fitPxPerMm } from './paper';
import { renderBase, renderOverlay, type BaseOptions, type OverlayState } from './render';
import { localPoint, Stage } from './stage';
import { readPalette } from './theme';

export interface SheetInput {
  readonly ecg: Ecg;
  readonly sheet: Sheet;
  readonly base: BaseOptions;
  readonly lang: Lang;
  readonly avail: ToolAvail;
  readonly tools: ToolState;
  /** onPick given: clicks report lead + time */
  readonly pickable: boolean;
  /** a cursor signal is given: clicks (and arrow keys) move it */
  readonly cursorEnabled: boolean;
  /** calibrated CSS px per mm (true physical scale) or null = fit the box */
  readonly pxPerMm: number | null;
}

export interface Readouts {
  readonly cross: readonly [string, string] | null;
  readonly cal: CaliperNumbers | null;
}

export interface SheetHooks {
  setTools(t: ToolState): void;
  pick(e: PickEvent): void;
  setCursor(t: number): void;
  caliper(m: CaliperMeasure): void;
  readout(r: Readouts): void;
  announce(text: string): void;
}

/** Pointer travel (CSS px) that turns a click into a drag. */
const DRAG_PX = 5;

interface Down {
  readonly id: number;
  readonly x0: number;
  readonly y0: number;
  moved: boolean;
  kind: 'click' | 'drag' | 'lay';
  readonly which: 0 | 1 | 2;
  readonly start: CaliperState | null;
  readonly layPanel: number | null;
}

const sameBase = (a: BaseOptions, b: BaseOptions): boolean =>
  a.marks === b.marks &&
  a.highlightLeads === b.highlightLeads &&
  a.pins === b.pins &&
  a.waveLabels === b.waveLabels &&
  a.intervals === b.intervals &&
  a.stMarkers === b.stMarkers;

export class SheetView {
  private readonly stage: Stage;
  private readonly grid: HTMLCanvasElement;
  private input: SheetInput | null = null;
  private frame: Frame = { pxPerMm: 0, ox: 0, oy: 0 };
  private dirtyGrid = true;
  private dirtyBase = true;
  private tools: ToolState = NO_TOOLS;
  private cursor: number | null = null;
  private cal: CaliperState | null = null;
  private calLead: string | null = null;
  private active: 0 | 1 | 2 = 2;
  private focus: FocusPoint | null = null;
  private showFocus = false;
  private hover: { x: number; y: number } | null = null;
  private down: Down | null = null;
  private lastReadout = '';
  private readonly offs: (() => void)[] = [];

  constructor(
    private readonly box: HTMLElement,
    private readonly baseCv: HTMLCanvasElement,
    private readonly overCv: HTMLCanvasElement,
    private readonly hooks: SheetHooks,
    /** an empty absolutely positioned element inside the paper, moved to the keyboard point to scroll it into view */
    private readonly probe: HTMLElement | null = null,
  ) {
    this.grid = document.createElement('canvas');
    this.stage = new Stage(box, [baseCv, overCv, this.grid], () => this.onResize(), () => this.draw());
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(type, fn as EventListener);
      this.offs.push(() => el.removeEventListener(type, fn as EventListener));
    };
    on(overCv, 'pointerdown', (e) => this.onDown(e));
    on(overCv, 'pointermove', (e) => this.onMove(e));
    on(overCv, 'pointerup', (e) => this.onUp(e));
    on(overCv, 'pointercancel', () => {
      this.down = null;
      this.hover = null;
      this.stage.request();
    });
    on(overCv, 'pointerleave', () => {
      if (this.down) return;
      this.hover = null;
      this.stage.request();
    });
  }

  dispose(): void {
    this.stage.dispose();
    for (const off of this.offs) off();
  }

  // ─────────────────────────────────────────────────────────────────────────── inputs

  update(next: SheetInput): void {
    const prev = this.input;
    this.input = next;
    if (!prev || prev.sheet !== next.sheet || prev.pxPerMm !== next.pxPerMm) {
      this.computeFrame();
      this.dirtyGrid = true;
      this.cal = reconcileCalipers(next.sheet, this.cal, this.calLead);
      this.focus = prev ? reconcileFocus(prev.sheet, next.sheet, this.focus) : null;
    }
    if (!prev || prev.ecg !== next.ecg || prev.lang !== next.lang || !sameBase(prev.base, next.base)) this.dirtyBase = true;
    if (prev && prev.ecg !== next.ecg) {
      this.cal = null;
      this.focus = null;
    }
    const was = this.tools;
    this.tools = next.tools;
    if (next.tools.calipers && !this.cal) {
      const home = caliperHomePanel(next.sheet, this.focus);
      if (home) {
        this.cal = defaultCalipers(home.index, home.t0, home.t1);
        this.active = 2;
        this.reportCaliper();
      }
    } else if (!next.tools.calipers && this.cal) {
      this.cal = null;
    } else if (this.cal && was.amplitude !== next.tools.amplitude) {
      this.reportCaliper();
    }
    // a finger drag drives the tool (calipers, magnifier, crosshair) instead of scrolling the paper
    this.overCv.style.touchAction = anyToolOn(next.tools) ? 'none' : 'pan-x pan-y pinch-zoom';
    this.stage.request();
  }

  setCursor(t: number | null): void {
    if (t === this.cursor) return;
    this.cursor = t;
    this.stage.request();
  }

  themeChanged(): void {
    this.dirtyGrid = true;
    this.stage.request();
  }

  blur(): void {
    if (!this.showFocus) return;
    this.showFocus = false;
    this.stage.request();
  }

  private onResize(): void {
    this.computeFrame();
    this.dirtyGrid = true;
  }

  private computeFrame(): void {
    const inp = this.input;
    if (!inp) return;
    const s = inp.sheet;
    const { cssW, cssH, dpr } = this.stage;
    let ppm = fitPxPerMm(cssW, cssH, s.widthMm, s.heightMm);
    // calibrated screens keep true physical size whenever the box allows it
    if (inp.pxPerMm && inp.pxPerMm <= ppm * 1.01) ppm = inp.pxPerMm;
    const ox = Math.max(0, Math.round(((cssW - s.widthMm * ppm) / 2) * dpr) / dpr);
    const oy = Math.max(0, Math.round(((cssH - s.heightMm * ppm) / 2) * dpr) / dpr);
    this.frame = { pxPerMm: ppm, ox, oy };
  }

  // ─────────────────────────────────────────────────────────────────────────── drawing

  private env(ctx: CanvasRenderingContext2D, lang: Lang): DrawEnv {
    return { ctx, f: this.frame, dpr: this.stage.dpr, pal: readPalette(), lang };
  }

  private draw(): void {
    const inp = this.input;
    if (!inp) return;
    const w = this.stage.pxW, h = this.stage.pxH;
    if (w <= 0 || h <= 0 || !(this.frame.pxPerMm > 0)) return;
    if (this.dirtyGrid) {
      const g = this.grid.getContext('2d');
      if (g) drawGrid(g, w, h, this.frame, this.stage.dpr, readPalette());
      this.dirtyGrid = false;
      this.dirtyBase = true;
    }
    if (this.dirtyBase) {
      const b = this.baseCv.getContext('2d');
      if (b) renderBase(this.env(b, inp.lang), inp.sheet, inp.ecg, inp.base, this.grid, w, h);
      this.dirtyBase = false;
    }
    const o = this.overCv.getContext('2d');
    if (o) renderOverlay(this.env(o, inp.lang), inp.sheet, inp.ecg, this.overlayState(inp), w, h);
    this.pushReadouts(inp);
  }

  /** Focus point → CSS px on its trace. */
  private focusPx(inp: SheetInput, f: FocusPoint): { x: number; y: number } | null {
    const p = inp.sheet.panels[f.panel];
    if (!p) return null;
    const v = traceValue(inp.ecg.signal, p, f.t);
    return { x: pxX(this.frame, xOfT(p, f.t)), y: pxY(this.frame, yOfMv(rowOf(inp.sheet, p), p, Number.isFinite(v) ? v : 0)) };
  }

  private overlayState(inp: SheetInput): OverlayState {
    const s = inp.sheet;
    const hit = this.hover ? hitTest(s, this.frame, this.hover.x, this.hover.y) : null;
    const kbd = this.showFocus && this.focus ? this.focus : null;
    const cross = this.tools.crosshair ? (hit ? { panel: hit.panel.index, t: hit.tMs } : kbd) : null;
    let lens: { x: number; y: number } | null = null;
    if (this.tools.magnifier) {
      if (this.hover && hit) lens = this.hover;
      else if (kbd) lens = this.focusPx(inp, kbd);
    }
    const dragging = this.down !== null && this.down.kind !== 'click';
    return {
      hoverPanel: hit && !dragging ? hit.panel.index : null,
      hoverTint: (inp.pickable || inp.cursorEnabled) && !this.tools.calipers,
      cursor: this.cursor,
      focus: this.focus,
      showFocus: this.showFocus,
      cal: this.cal,
      calMode: caliperMode(this.tools),
      march: this.tools.march,
      active: this.active,
      cross,
      lens,
    };
  }

  private pushReadouts(inp: SheetInput): void {
    const st = this.overlayState(inp);
    let cross: readonly [string, string] | null = null;
    if (st.cross) {
      const p = inp.sheet.panels[st.cross.panel];
      const v = p ? traceValue(inp.ecg.signal, p, st.cross.t) : Number.NaN;
      cross = crossNumbers(inp.lang, st.cross.t, v);
    }
    const cal = this.cal ? caliperNumbers(inp.lang, inp.sheet, this.cal, caliperMode(this.tools)) : null;
    const key = `${cross?.join('|') ?? ''}#${cal ? cal.mode + cal.values.join('|') : ''}`;
    if (key === this.lastReadout) return;
    this.lastReadout = key;
    this.hooks.readout({ cross, cal });
  }

  // ─────────────────────────────────────────────────────────────────────────── actions

  /** Lead and time of the keyboard point; with the crosshair on, also the trace voltage there (its read-out). */
  private announceFocus(inp: SheetInput, f: FocusPoint): void {
    const p = inp.sheet.panels[f.panel];
    if (!p) return;
    const v = this.tools.crosshair ? traceValue(inp.ecg.signal, p, f.t) : Number.NaN;
    const [t, mv] = crossNumbers(inp.lang, f.t, v);
    this.hooks.announce(
      Number.isFinite(v) ? te.in(inp.lang, 'announceCross', { lead: p.label, t, mv }) : te.in(inp.lang, 'announceFocus', { lead: p.label, t }),
    );
  }

  private select(f: FocusPoint): void {
    const inp = this.input;
    if (!inp) return;
    const p = inp.sheet.panels[f.panel];
    if (!p) return;
    const t = Math.round(f.t);
    if (inp.pickable) {
      const v = traceValue(inp.ecg.signal, p, t);
      this.hooks.pick({ lead: p.lead, tMs: t, mv: Number.isFinite(v) ? v : 0 });
      this.hooks.announce(te.in(inp.lang, 'announcePick', { lead: p.label, t: fmtNum(inp.lang, t) }));
    } else if (inp.cursorEnabled) {
      this.hooks.setCursor(t);
    }
  }

  private reportCaliper(): void {
    const inp = this.input;
    const c = this.cal;
    if (!inp || !c) return;
    const mode = caliperMode(this.tools);
    this.calLead = inp.sheet.panels[c.panel]?.lead ?? null;
    this.hooks.caliper(caliperMeasure(inp.sheet, c, mode));
    this.hooks.announce(caliperAnnouncement(inp.lang, caliperNumbers(inp.lang, inp.sheet, c, mode)));
  }

  /** Keyboard entry point; returns true when the key was used. */
  key(e: KeyboardEvent): boolean {
    const inp = this.input;
    if (!inp) return false;
    const r = applyKey(
      { sheet: inp.sheet, avail: inp.avail, cursor: this.cursor },
      { tools: this.tools, cal: this.cal, active: this.active, focus: this.focus },
      e.key,
      { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey },
    );
    if (!r.handled) return false;
    e.preventDefault();
    const st = r.state;
    const toolsChanged = st.tools !== this.tools;
    this.cal = st.cal;
    this.active = st.active;
    this.focus = st.focus;
    this.showFocus = st.focus !== null;
    if (toolsChanged) {
      this.tools = st.tools;
      this.hooks.setTools(st.tools);
    }
    if (r.moved && st.focus) {
      if (!inp.pickable && inp.cursorEnabled) this.hooks.setCursor(Math.round(st.focus.t));
      this.announceFocus(inp, st.focus);
    }
    if (r.select) this.select(r.select);
    if (r.caliperChanged && st.cal) this.reportCaliper();
    this.revealAfterKey(inp, r.moved === true, r.caliperChanged === true, e.key);
    this.stage.request();
    return true;
  }

  /** Keep what the keyboard just moved (focus point or caliper line) on screen. */
  private revealAfterKey(inp: SheetInput, moved: boolean, calChanged: boolean, key: string): void {
    let pt: { x: number; y: number } | null = null;
    if (moved && this.focus) pt = this.focusPx(inp, this.focus);
    else if (calChanged && this.cal && !this.tools.amplitude) {
      const p = inp.sheet.panels[this.cal.panel];
      if (p) {
        const xa = pxX(this.frame, xOfT(p, this.cal.t0)), xb = pxX(this.frame, xOfT(p, this.cal.t1));
        const lead = this.active === 0 ? xa : this.active === 1 ? xb : key === 'ArrowLeft' ? Math.min(xa, xb) : Math.max(xa, xb);
        pt = { x: lead, y: pxY(this.frame, rowOf(inp.sheet, p).baselineMm) };
      }
    }
    this.reveal(pt);
  }

  private reveal(pt: { x: number; y: number } | null): void {
    const el = this.probe;
    if (!pt || !el || typeof el.scrollIntoView !== 'function') return;
    const r = revealRect(pt.x, pt.y, this.stage.cssW, this.stage.cssH);
    el.style.left = `${r.left}px`;
    el.style.top = `${r.top}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); // never animated
  }

  private handleAt(x: number, y: number, tol: number): -1 | 0 | 1 | 2 {
    const inp = this.input;
    if (!inp || !this.cal || !this.tools.calipers) return -1;
    return caliperHandleAt(inp.sheet, this.frame, this.cal, caliperMode(this.tools), x, y, tol);
  }

  private onDown(e: PointerEvent): void {
    const inp = this.input;
    if (!inp || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const { x, y } = localPoint(this.overCv, e);
    const tol = e.pointerType === 'mouse' ? HANDLE_TOL_PX : HANDLE_TOL_PX * 2;
    const hh = this.handleAt(x, y, tol);
    const h: 0 | 1 | 2 | null = hh === -1 ? null : hh;
    let layPanel: number | null = null;
    if (h === null && this.tools.calipers) layPanel = hitTest(inp.sheet, this.frame, x, y)?.panel.index ?? null;
    this.down = {
      id: e.pointerId,
      x0: x,
      y0: y,
      moved: false,
      kind: h !== null ? 'drag' : 'click',
      which: h ?? 1,
      start: h !== null ? this.cal : null,
      layPanel,
    };
    if (h !== null) {
      this.active = h;
      e.preventDefault();
    }
    this.showFocus = false;
    try {
      this.overCv.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best effort */
    }
    this.stage.request();
  }

  private onMove(e: PointerEvent): void {
    const inp = this.input;
    if (!inp) return;
    const { x, y } = localPoint(this.overCv, e);
    const d = this.down && this.down.id === e.pointerId ? this.down : null;
    if (e.pointerType === 'mouse' || d) this.hover = { x, y };
    if (d) {
      if (!d.moved && Math.hypot(x - d.x0, y - d.y0) > DRAG_PX) d.moved = true;
      if (d.moved) {
        const mode = caliperMode(this.tools);
        if (d.kind === 'drag' && d.start) {
          this.cal = dragCalipers(inp.sheet, this.frame, d.start, mode, d.which, d.x0, d.y0, x, y);
        } else if (d.layPanel !== null && this.tools.calipers) {
          const p = inp.sheet.panels[d.layPanel];
          if (p) {
            d.kind = 'lay';
            this.cal = layCalipers(inp.sheet, this.frame, p, mode, this.cal, d.x0, d.y0, x, y);
            this.active = 1;
          }
        }
      }
    }
    this.updatePointerStyle(inp, x, y);
    this.stage.request();
  }

  private onUp(e: PointerEvent): void {
    const d = this.down;
    if (!d || d.id !== e.pointerId) return;
    this.down = null;
    const { x, y } = localPoint(this.overCv, e);
    if (!d.moved && d.kind === 'click') this.click(x, y);
    else if (d.moved && d.kind !== 'click' && this.cal) this.reportCaliper();
    if (e.pointerType !== 'mouse') this.hover = null;
    this.stage.request();
  }

  private click(x: number, y: number): void {
    const inp = this.input;
    if (!inp) return;
    const hit = hitTest(inp.sheet, this.frame, x, y);
    if (!hit) return;
    this.focus = { panel: hit.panel.index, t: Math.round(hit.tMs) };
    this.select(this.focus);
  }

  private updatePointerStyle(inp: SheetInput, x: number, y: number): void {
    let c = 'default';
    if (this.tools.calipers) {
      c = 'crosshair';
      const h = this.handleAt(x, y, HANDLE_TOL_PX);
      if (h === 2) c = 'move';
      else if (h >= 0) c = this.tools.amplitude ? 'ns-resize' : 'ew-resize';
    } else if (this.tools.crosshair || this.tools.magnifier) c = 'crosshair';
    else if ((inp.pickable || inp.cursorEnabled) && hitTest(inp.sheet, this.frame, x, y)) c = 'pointer';
    if (this.overCv.style.cursor !== c) this.overCv.style.cursor = c;
  }
}
