/**
 * Mini Wiggers diagram on the global clock: LV / aortic / LA pressure, LV volume, lead II, valve events and S1/S2 for
 * the current cycle, with the playhead. The mechanical curves are schematic (src/ecg/wiggers.ts — mechanics are NOT
 * simulated); their timing comes only from cycle truth. Lead II is the real model output (projection of H).
 */
import { store } from '../app/store';
import { te } from '../i18n/ecg';
import { tc } from '../i18n/common';
import type { CycleTruth, SimEngine } from '../sim/types';
import { CanvasView, font, withAlpha } from './canvas';
import { pathArray } from './draw';
import { fmtNum } from './format';
import { cycleKey, getHub, leadIndex } from './sampler';
import type { BeatAnalysis, EcgHub } from './sampler';
import { MECH_COLOR, timelineModel, timeToX } from './timeline';
import type { TimelineModel } from './timeline';
import { WIGGERS, wiggersModel } from './wiggers';
import type { WiggersModel } from './wiggers';

const VALVE_LABEL = { MC: 'valve.MC', AO: 'valve.AO', AC: 'valve.AC', MO: 'valve.MO' } as const;
/** LV volume track range (mL): a complete-heart-block or post-PVC beat fills to ≈ 140 mL. */
const VOL_MIN_ML = 30, VOL_SPAN_ML = 120;

export class WiggersView extends CanvasView {
  private readonly hub: EcgHub;
  private key = '';
  private tl: TimelineModel | null = null;
  private wm: WiggersModel | null = null;
  private cy: CycleTruth | null = null;
  private beat: BeatAnalysis | null = null;

  private lastLive = 0;
  private liveLang = '';

  constructor(
    host: HTMLElement,
    bg: HTMLCanvasElement,
    fg: HTMLCanvasElement,
    engine: SimEngine,
    /** Receives the live "LV / aortic pressure · LV volume" text (≈ 4 Hz). */
    private readonly liveOut: HTMLElement | null = null,
  ) {
    super(host, bg, fg, false);
    this.hub = getHub(engine);
  }

  private writeLive(t: number, wm: WiggersModel): void {
    const el = this.liveOut;
    if (!el) return;
    const now = performance.now(), lang = store.lang.peek();
    if (lang === this.liveLang && now - this.lastLive < 250) return;
    this.liveLang = lang;
    this.lastLive = now;
    const sv = wm.beats.find((b) => b.cycle === this.cy)?.svMl;
    const text = `${te.in(lang, 'wiggers.lvp')} ${fmtNum(lang, wm.lvp.at(t))} mmHg · ${te.in(lang, 'wiggers.aop')} ${fmtNum(lang, wm.aop.at(t))} mmHg · ${te.in(lang, 'wiggers.lap')} ${fmtNum(lang, wm.lap.at(t))} mmHg · ${te.in(lang, 'wiggers.lvv')} ${fmtNum(lang, wm.lvv.at(t))} mL${sv === undefined ? '' : ` · ${te.in(lang, 'wiggers.sv')} ${fmtNum(lang, sv)} mL`}`;
    if (el.textContent !== text) el.textContent = text;
  }

  /** Track layout (CSS px). */
  private tracks() {
    const { cssW, cssH } = this.size;
    const left = cssW > 360 ? 40 : 30, right = 8;
    const w = Math.max(10, cssW - left - right);
    const evH = 16;
    const pTop = 14, pH = (cssH - evH) * 0.46;
    const vTop = pTop + pH + 10, vH = (cssH - evH) * 0.2;
    const eTop = vTop + vH + 6;
    const evTop = cssH - evH;
    return { left, w, pTop, pH, vTop, vH, eTop, eH: Math.max(12, evTop - eTop - 2), evTop, evH };
  }

  protected staticKey(): string {
    return '';
  }

  /** Track frames and axis ticks (depend only on size and theme). */
  protected drawStatic(ctx: CanvasRenderingContext2D): void {
    const { pxW, pxH, dpr } = this.size;
    const c = this.colors, L = this.tracks();
    ctx.clearRect(0, 0, pxW, pxH);
    ctx.font = font(10, dpr, 500);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const pY = (p: number) => (L.pTop + L.pH * (1 - p / 130)) * dpr;
    const vY = (v: number) => (L.vTop + L.vH * (1 - (v - VOL_MIN_ML) / VOL_SPAN_ML)) * dpr;
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    for (const p of [0, 40, 80, 120]) {
      const y = Math.round(pY(p)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(L.left * dpr, y);
      ctx.lineTo((L.left + L.w) * dpr, y);
      ctx.stroke();
      ctx.fillStyle = c['fg-muted'];
      ctx.fillText(String(p), (L.left - 4) * dpr, y);
    }
    for (const v of [WIGGERS.esvMl, WIGGERS.edvMl]) {
      const y = Math.round(vY(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(L.left * dpr, y);
      ctx.lineTo((L.left + L.w) * dpr, y);
      ctx.stroke();
      ctx.fillText(String(v), (L.left - 4) * dpr, y);
    }
    // Units only; the curve legend and live values are HTML next to the canvas (they wrap on narrow screens).
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = c['fg-muted'];
    ctx.fillText('mmHg', 2 * dpr, 1 * dpr);
    ctx.textBaseline = 'middle';
    ctx.fillText('mL', 2 * dpr, (L.vTop + L.vH * 0.45) * dpr); // between the 120 and 50 mL ticks
  }

  protected frameKey(): string {
    return `${store.time.peek()}|${this.hub.version}`;
  }

  private refresh(t: number): void {
    const cy = this.hub.cycles.at(t);
    const k = cy ? `${cycleKey(cy)}|${this.hub.version}` : '';
    if (k === this.key) return;
    this.key = k;
    if (!cy) {
      this.tl = this.wm = this.beat = this.cy = null;
      return;
    }
    const prev = this.hub.cycles.prev(cy), next = this.hub.cycles.next(cy);
    this.tl = timelineModel(cy);
    // beat volumes from each beat's own history (the same numbers as the blood-flow layer)
    this.wm = wiggersModel([prev, cy, next].filter((x): x is NonNullable<typeof x> => x !== null), 60000 / store.heartRate.peek(), (tt) => this.hub.cycles.at(tt));
    this.cy = cy;
    this.beat = this.hub.beat(cy);
  }

  protected drawFrame(ctx: CanvasRenderingContext2D): void {
    const { pxW, pxH, dpr } = this.size;
    ctx.clearRect(0, 0, pxW, pxH);
    const t = store.time.peek();
    this.refresh(t);
    const tl = this.tl, wm = this.wm, c = this.colors, lang = store.lang.peek();
    if (!tl || !wm) return;
    const L = this.tracks();
    const X = (tt: number) => (L.left + timeToX(tt, tl.t0, tl.t1, L.w)) * dpr;
    const pY = (p: number) => (L.pTop + L.pH * (1 - p / 130)) * dpr;
    const vY = (v: number) => (L.vTop + L.vH * (1 - (v - VOL_MIN_ML) / VOL_SPAN_ML)) * dpr;

    // Phase tint behind the pressure track (same colours as the timeline's mechanical row).
    for (const s of tl.mech) {
      const st = MECH_COLOR[s.key];
      withAlpha(ctx, st.alpha * 0.25, () => {
        ctx.fillStyle = c[st.token];
        ctx.fillRect(X(s.t0), L.pTop * dpr, X(s.t1) - X(s.t0), (L.vTop + L.vH - L.pTop) * dpr);
      });
    }

    const curve = (fn: (tt: number) => number, Y: (v: number) => number, color: string, width: number) => {
      const n = Math.max(2, Math.round(L.w));
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, width * dpr);
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const tt = tl.t0 + ((tl.t1 - tl.t0) * i) / n;
        const x = X(tt), y = Y(fn(tt));
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    };
    curve((tt) => wm.aop.at(tt), pY, c['c-vector'], 1.6);
    curve((tt) => wm.lap.at(tt), pY, c['c-atrial'], 1.6);
    curve((tt) => wm.lvp.at(tt), pY, c['c-qrs'], 2);
    curve((tt) => wm.lvv.at(tt), vY, c['c-repol'], 2);

    // a, c, v letters on the LA curve
    ctx.font = font(10.5, dpr, 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = c['c-atrial'];
    for (const m of wm.marks) if (m.t >= tl.t0 && m.t <= tl.t1) ctx.fillText(m.kind, X(m.t), pY(wm.lap.at(m.t)) - 3 * dpr);

    // Lead II of this beat (model output)
    const b = this.beat;
    if (b) {
      const li = leadIndex('II');
      const i0 = Math.max(0, Math.ceil((tl.t0 - b.t0) / b.dt)), i1 = Math.min(b.n - 1, Math.floor((tl.t1 - b.t0) / b.dt));
      if (i1 > i0) {
        const base = b.labels('II').baseline;
        const yMid = (L.eTop + L.eH * 0.65) * dpr;
        const sy = (L.eH * 0.6 * dpr) / 1.2; // ≈ 1.2 mV fills the track
        ctx.strokeStyle = c.fg;
        ctx.lineWidth = Math.max(1, 1.3 * dpr);
        ctx.beginPath();
        const src = b.leads.subarray(li * b.n, (li + 1) * b.n);
        const dx = ((b.dt / (tl.t1 - tl.t0)) * L.w) * dpr;
        pathArray(ctx, src, i0, i1 - i0 + 1, X(b.t0 + i0 * b.dt), dx, yMid + base * sy, sy);
        ctx.stroke();
      }
    }

    // Valve events and heart sounds
    ctx.font = font(10, dpr, 600);
    ctx.textBaseline = 'top';
    ctx.setLineDash([3 * dpr, 3 * dpr]);
    for (const e of wm.events) {
      if (e.t < tl.t0 || e.t > tl.t1) continue;
      const x = Math.round(X(e.t)) + 0.5;
      ctx.strokeStyle = c['fg-muted'];
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, L.pTop * dpr);
      ctx.lineTo(x, (L.evTop + 2) * dpr);
      ctx.stroke();
      const sound = e.kind === 'MC' ? 'S1' : e.kind === 'AC' ? 'S2' : '';
      ctx.fillStyle = sound ? c.fg : c['fg-muted'];
      const closing = e.kind === 'MC' || e.kind === 'AC';
      ctx.textAlign = closing ? 'right' : 'left';
      ctx.fillText(sound ? `${sound} ${te.in(lang, VALVE_LABEL[e.kind])}` : te.in(lang, VALVE_LABEL[e.kind]), x + (closing ? -3 : 3) * dpr, (L.evTop + 3) * dpr);
    }
    ctx.setLineDash([]);

    // Playhead + live values
    if (t >= tl.t0 && t <= tl.t1) {
      const x = X(t);
      ctx.strokeStyle = c['ecg-cursor'];
      ctx.lineWidth = Math.max(1, 2 * dpr);
      ctx.beginPath();
      ctx.moveTo(x, L.pTop * dpr);
      ctx.lineTo(x, (L.eTop + L.eH) * dpr);
      ctx.stroke();
      for (const [fn, Y, col] of [
        [(tt: number) => wm.lvp.at(tt), pY, c['c-qrs']],
        [(tt: number) => wm.aop.at(tt), pY, c['c-vector']],
        [(tt: number) => wm.lap.at(tt), pY, c['c-atrial']],
        [(tt: number) => wm.lvv.at(tt), vY, c['c-repol']],
      ] as const) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, Y(fn(t)), 3 * dpr, 0, 2 * Math.PI);
        ctx.fill();
      }
      this.writeLive(t, wm);
    }
  }

  protected updateAria(): void {
    const lang = store.lang.peek();
    const mech = store.now.peek().mech;
    const label = te.in(lang, 'wiggers.aria', { mech: mech ? tc.in(lang, `mech.${mech}` as never) : '—' });
    if (this.fg.getAttribute('aria-label') !== label) this.fg.setAttribute('aria-label', label);
  }
}
