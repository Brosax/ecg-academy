/**
 * Vector diagrams on the global clock.
 *   frontal:    hexaxial reference system at the IDEAL angles, the live heart vector H (Frank X, Y; +Y inferior drawn
 *               downward), its projection on the selected lead's axis, this beat's frontal loop (P / QRS / ST-T
 *               coloured), and the clinical QRS axis vs the true frontal angle of H.
 *   horizontal: transverse plane (anterior up, patient-left right) with V1–V6 along the real Dower directions, the
 *               horizontal loop and the live projection.
 * H is the same total heart vector the leads are projected from (hub H ring = engine.sampleH, H_A + H_V).
 */
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { te } from '../i18n/ecg';
import type { LeadName, SimEngine } from '../sim/types';
import { PRECORDIAL_LEADS } from '../sim/types';
import {
  deg, frontalDeg, frontalDir, HEXAXIAL_AXES, hexaxialProjection, horizontalDeg, horizontalDir, horizontalProjection,
  isFrontalLead, nearestAxis, qrsAxes,
} from './axes';
import { CanvasView, font, withAlpha } from './canvas';
import { fmtNum } from './format';
import { cycleKey, getHub, leadIndex } from './sampler';
import type { BeatAnalysis, EcgHub } from './sampler';
import { latestCompleteCycle } from './summary';

export type Plane = 'frontal' | 'horizontal';

export interface PlaneOutputs {
  readonly axes?: HTMLElement | null;
  readonly why?: HTMLElement | null;
  readonly proj?: HTMLElement | null;
}

const SEG_TOKEN = { P: 'c-atrial', QRS: 'c-qrs', ST: 'c-repol', T: 'c-repol' } as const;

export class PlaneView extends CanvasView {
  private readonly hub: EcgHub;
  private loopKey = '';
  private beat: BeatAnalysis | null = null;
  private scaleMv = 1;
  private axesInfo: { clinicalDeg: number; trueDeg: number; diffDeg: number } | null = null;
  private axesKey = '';
  private lastOut = 0;
  private outKey = '';

  constructor(
    host: HTMLElement,
    bg: HTMLCanvasElement,
    fg: HTMLCanvasElement,
    private readonly engine: SimEngine,
    private readonly commands: AppCommands,
    private readonly plane: Plane,
    private readonly out: PlaneOutputs,
  ) {
    super(host, bg, fg, false);
    this.hub = getHub(engine);
    this.listen(fg, 'click', (e) => this.click(e));
  }

  /** Centre and radius in CSS px. */
  private geom() {
    const { cssW, cssH } = this.size;
    const R = Math.max(10, 0.36 * Math.min(cssW, cssH));
    return { cx: cssW / 2, cy: cssH / 2, R };
  }

  /** Plane components of a Frank vector → screen offset (unit-free). */
  private toScreen(v: readonly number[]): [number, number] {
    return this.plane === 'frontal' ? [v[0], v[1]] : [v[0], v[2]];
  }

  private precordialAxes() {
    const L = PRECORDIAL_LEADS.map((lead) => ({ lead, v: this.engine.projector.leadVector(lead) }));
    const maxH = Math.max(...L.map((x) => Math.hypot(x.v[0], x.v[2])));
    return L.map((x) => ({ lead: x.lead, deg: horizontalDeg(x.v), rel: Math.hypot(x.v[0], x.v[2]) / maxH }));
  }

  protected staticKey(): string {
    return `${this.plane}|${store.selectedLead.peek()}|${this.hub.version}`;
  }

  protected drawStatic(ctx: CanvasRenderingContext2D): void {
    const { pxW, pxH, dpr } = this.size;
    const c = this.colors, lang = store.lang.peek();
    const { cx, cy, R } = this.geom();
    const sel = store.selectedLead.peek();
    ctx.clearRect(0, 0, pxW, pxH);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    ctx.arc(cx * dpr, cy * dpr, R * dpr, 0, 2 * Math.PI);
    ctx.stroke();
    // 30° ticks
    ctx.beginPath();
    for (let a = 0; a < 360; a += 30) {
      const r = (a * Math.PI) / 180;
      ctx.moveTo((cx + Math.cos(r) * R) * dpr, (cy + Math.sin(r) * R) * dpr);
      ctx.lineTo((cx + Math.cos(r) * (R + 5)) * dpr, (cy + Math.sin(r) * (R + 5)) * dpr);
    }
    ctx.stroke();

    const fsz = Math.max(10, Math.min(13, R / 9));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (this.plane === 'frontal') {
      ctx.font = font(9.5, dpr, 500);
      ctx.fillStyle = c['fg-muted'];
      for (const [a, s] of [[0, '0°'], [90, '+90°'], [180, '±180°'], [-90, '−90°']] as const) {
        const r = (a * Math.PI) / 180;
        ctx.fillText(s, (cx + Math.cos(r) * (R + 16)) * dpr, (cy + Math.sin(r) * (R + 12)) * dpr);
      }
      for (const ax of HEXAXIAL_AXES) {
        const [ux, uy] = frontalDir(ax.deg);
        const isSel = ax.lead === sel;
        ctx.strokeStyle = isSel ? c['c-vector'] : c['fg-muted'];
        ctx.lineWidth = Math.max(1, (isSel ? 2.2 : 1) * dpr);
        withAlpha(ctx, isSel ? 0.45 : 0.3, () => {
          ctx.setLineDash([4 * dpr, 4 * dpr]);
          ctx.beginPath();
          ctx.moveTo(cx * dpr, cy * dpr);
          ctx.lineTo((cx - ux * R) * dpr, (cy - uy * R) * dpr);
          ctx.stroke();
          ctx.setLineDash([]);
        });
        withAlpha(ctx, isSel ? 1 : 0.8, () => {
          ctx.beginPath();
          ctx.moveTo(cx * dpr, cy * dpr);
          ctx.lineTo((cx + ux * R) * dpr, (cy + uy * R) * dpr);
          ctx.stroke();
        });
        ctx.font = font(fsz, dpr, isSel ? 800 : 600);
        ctx.fillStyle = isSel ? c['c-vector'] : c.fg;
        ctx.fillText(`${ax.lead}+`, (cx + ux * (R - 14)) * dpr + uy * 10 * dpr, (cy + uy * (R - 14)) * dpr - ux * 10 * dpr);
      }
      // Real (Dower) direction of the selected limb lead.
      if (isFrontalLead(sel)) {
        const a = frontalDeg(this.engine.projector.leadVector(sel));
        const [ux, uy] = frontalDir(a);
        ctx.strokeStyle = c['c-vector'];
        ctx.lineWidth = Math.max(1, 1.2 * dpr);
        ctx.setLineDash([2 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(cx * dpr, cy * dpr);
        ctx.lineTo((cx + ux * (R + 4)) * dpr, (cy + uy * (R + 4)) * dpr);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      ctx.font = font(10, dpr, 600);
      ctx.fillStyle = c['fg-muted'];
      ctx.fillText(te.in(lang, 'hor.anterior'), cx * dpr, (cy - R - 12) * dpr);
      ctx.fillText(te.in(lang, 'hor.posterior'), cx * dpr, (cy + R + 12) * dpr);
      // Left / right in the bottom corners: the words are long in Spanish and would clip beside the circle.
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'right';
      ctx.fillText(`${te.in(lang, 'hor.left')} →`, pxW - 4 * dpr, pxH - 4 * dpr);
      ctx.textAlign = 'left';
      ctx.fillText(`← ${te.in(lang, 'hor.right')}`, 4 * dpr, pxH - 4 * dpr);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const ax of this.precordialAxes()) {
        const [ux, uz] = horizontalDir(ax.deg);
        const len = R * (0.35 + 0.5 * ax.rel); // labels stay inside the circle, clear of the orientation words
        const isSel = ax.lead === sel;
        ctx.strokeStyle = isSel ? c['c-vector'] : c['fg-muted'];
        ctx.lineWidth = Math.max(1, (isSel ? 2.2 : 1.2) * dpr);
        ctx.beginPath();
        ctx.moveTo(cx * dpr, cy * dpr);
        ctx.lineTo((cx + ux * len) * dpr, (cy + uz * len) * dpr);
        ctx.stroke();
        ctx.font = font(fsz, dpr, isSel ? 800 : 600);
        ctx.fillStyle = isSel ? c['c-vector'] : c.fg;
        ctx.fillText(ax.lead, (cx + ux * (len + 11)) * dpr, (cy + uz * (len + 11)) * dpr);
      }
    }
  }

  protected frameKey(): string {
    return `${store.time.peek()}|${store.selectedLead.peek()}|${this.hub.version}`;
  }

  /** Current beat (for the loop) and its plane scale; the clinical/true axes of the latest complete beat. */
  private refresh(t: number): void {
    const cy = this.hub.cycles.at(t);
    const k = cy ? `${cycleKey(cy)}|${this.hub.version}` : '';
    if (k !== this.loopKey) {
      this.loopKey = k;
      this.beat = cy ? this.hub.beat(cy) : null;
      if (this.beat) {
        let mx = 0;
        const H = this.beat.H;
        for (let i = 0; i < this.beat.n; i++) {
          const [a, b] = this.toScreen([H[3 * i], H[3 * i + 1], H[3 * i + 2]]);
          mx = Math.max(mx, Math.hypot(a, b));
        }
        this.scaleMv = Math.max(0.5, Math.ceil(mx / 0.5) * 0.5);
      }
    }
    if (this.plane === 'frontal') {
      const done = latestCompleteCycle(this.hub, t);
      const ak = done ? `${cycleKey(done)}|${this.hub.version}` : '';
      if (ak !== this.axesKey) {
        this.axesKey = ak;
        this.axesInfo = done ? this.computeAxes(this.hub.beat(done)) : null;
      }
    }
  }

  private computeAxes(a: BeatAnalysis): { clinicalDeg: number; trueDeg: number; diffDeg: number } | null {
    const m = a.measured;
    const on = m.qrsOn ?? a.truth.qrsOn, off = m.qrsOff ?? a.truth.qrsOff;
    if (on === null || off === null) return null;
    const i0 = Math.round((on - a.t0) / a.dt), i1 = Math.round((off - a.t0) / a.dt);
    const lead = (l: LeadName) => a.leads.subarray(leadIndex(l) * a.n, (leadIndex(l) + 1) * a.n);
    const b = Math.max(0, i0 - 3);
    return qrsAxes(a.H, lead('I'), lead('aVF'), i0, i1, {
      I: a.labels('I').baseline,
      aVF: a.labels('aVF').baseline,
      H: [a.H[3 * b], a.H[3 * b + 1], a.H[3 * b + 2]],
    });
  }

  protected drawFrame(ctx: CanvasRenderingContext2D): void {
    const { pxW, pxH, dpr } = this.size;
    ctx.clearRect(0, 0, pxW, pxH);
    const t = store.time.peek();
    this.refresh(t);
    const c = this.colors;
    const { cx, cy, R } = this.geom();
    const k = R / this.scaleMv; // CSS px per mV
    const P = (v: readonly number[]): [number, number] => {
      const [a, b] = this.toScreen(v);
      return [(cx + a * k) * dpr, (cy + b * k) * dpr];
    };

    // This beat's loop, coloured by segment truth; the part not yet reached is faint.
    const a = this.beat;
    if (a) {
      const segs = a.truth.segments;
      let cur: string | null = null;
      const stroke = () => ctx.stroke();
      ctx.lineWidth = Math.max(1, 1.4 * dpr);
      ctx.lineJoin = 'round';
      for (let i = 0; i < a.n; i += 1) {
        const ti = a.t0 + i * a.dt;
        const seg = segs.find((s) => ti >= s.t0 && ti < s.t1)?.seg;
        const tok = seg && seg in SEG_TOKEN ? SEG_TOKEN[seg as keyof typeof SEG_TOKEN] : null;
        if (!tok) {
          if (cur) stroke();
          cur = null;
          continue;
        }
        const key = `${tok}|${ti <= t}`;
        const [x, y] = P([a.H[3 * i], a.H[3 * i + 1], a.H[3 * i + 2]]);
        if (key !== cur) {
          if (cur) {
            ctx.lineTo(x, y);
            stroke();
          }
          cur = key;
          ctx.strokeStyle = c[tok];
          ctx.globalAlpha = ti <= t ? 0.95 : 0.25;
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else ctx.lineTo(x, y);
      }
      if (cur) stroke();
      ctx.globalAlpha = 1;
    }

    // Live heart vector
    const h = this.hub.hAt(t);
    const [hx, hy] = P(h);
    const sel = store.selectedLead.peek();
    let dir: [number, number] | null = null;
    let proj = 0;
    if (this.plane === 'frontal' && isFrontalLead(sel)) {
      const ax = HEXAXIAL_AXES.find((x) => x.lead === sel)!;
      dir = frontalDir(ax.deg);
      proj = hexaxialProjection(h, sel);
    } else if (this.plane === 'horizontal' && !isFrontalLead(sel)) {
      const L = this.engine.projector.leadVector(sel);
      const [ux, uz] = horizontalDir(horizontalDeg(L));
      dir = [ux, uz];
      proj = horizontalProjection(h, L);
    }
    if (dir) {
      const fx = (cx + dir[0] * proj * k) * dpr, fy = (cy + dir[1] * proj * k) * dpr;
      withAlpha(ctx, 0.7, () => {
        ctx.strokeStyle = c['fg-muted'];
        ctx.lineWidth = Math.max(1, dpr);
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.strokeStyle = c['c-highlight'];
      ctx.lineWidth = Math.max(2, 5 * dpr);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx * dpr, cy * dpr);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    this.arrow(ctx, cx * dpr, cy * dpr, hx, hy, c['c-vector'], dpr);

    ctx.font = font(9.5, dpr, 500);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = c['fg-muted'];
    ctx.fillText(`⌀ ${fmtNum(store.lang.peek(), 2 * this.scaleMv, 1)} mV`, pxW - 4 * dpr, 3 * dpr);

    this.writeOutputs(t, proj, dir !== null);
  }

  private arrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, dpr: number): void {
    const len = Math.hypot(x1 - x0, y1 - y0);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.5, 2.5 * dpr);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (len < 4 * dpr) return;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len, hl = Math.min(10 * dpr, len * 0.5), hw = hl * 0.55;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * hl - uy * hw, y1 - uy * hl + ux * hw);
    ctx.lineTo(x1 - ux * hl + uy * hw, y1 - uy * hl - ux * hw);
    ctx.closePath();
    ctx.fill();
  }

  /** Live text (≈ 4 Hz): projection value vs the real lead voltage; clinical vs true axis (frontal). */
  private writeOutputs(t: number, proj: number, hasProj: boolean): void {
    const now = performance.now();
    const lang = store.lang.peek(), sel = store.selectedLead.peek();
    // Throttled to ≈ 4 Hz, but refreshed at once when the language, lead or measured beat changes (also when paused).
    const key = `${lang}|${sel}|${this.axesKey}`;
    if (key === this.outKey && now - this.lastOut < 250) return;
    this.outKey = key;
    this.lastOut = now;
    const set = (el: HTMLElement | null | undefined, text: string) => {
      if (el && el.textContent !== text) el.textContent = text;
    };
    if (this.out.proj) {
      const projText = hasProj
        ? te.in(lang, this.plane === 'frontal' ? 'hex.proj' : 'hor.proj', {
            lead: sel,
            v: fmtNum(lang, proj, 2),
            lv: fmtNum(lang, this.hub.leadAt(sel, t), 2),
          })
        : te.in(lang, this.plane === 'frontal' ? 'hex.pickLimb' : 'hor.pickPrecordial');
      set(this.out.proj, projText);
    }
    if (this.plane === 'frontal') {
      const ax = this.axesInfo;
      set(this.out.axes, ax ? te.in(lang, 'hex.axes', { clin: fmtNum(lang, ax.clinicalDeg, 0, true), tru: fmtNum(lang, ax.trueDeg, 0, true) }) : '—');
      set(this.out.why, ax ? te.in(lang, 'hex.why', { d: fmtNum(lang, Math.abs(ax.diffDeg), 0) }) : '');
    }
  }

  private click(e: MouseEvent): void {
    const [x, y] = this.localPoint(e);
    const { cx, cy, R } = this.geom();
    const dx = x - cx, dy = y - cy;
    if (Math.hypot(dx, dy) < 0.25 * R) return;
    if (this.plane === 'frontal') {
      const lead = nearestAxis(deg(Math.atan2(dy, dx)), HEXAXIAL_AXES, 15);
      if (lead) this.commands.selectLead(lead);
    } else {
      const lead = nearestAxis(deg(Math.atan2(-dy, dx)), this.precordialAxes(), 12);
      if (lead) this.commands.selectLead(lead);
    }
  }

  protected updateAria(): void {
    const lang = store.lang.peek();
    const ax = this.axesInfo;
    const label =
      this.plane === 'frontal'
        ? te.in(lang, 'hex.aria', { axes: ax ? te.in(lang, 'hex.axes', { clin: fmtNum(lang, ax.clinicalDeg, 0, true), tru: fmtNum(lang, ax.trueDeg, 0, true) }) : '' })
        : te.in(lang, 'hor.aria');
    if (this.fg.getAttribute('aria-label') !== label) this.fg.setAttribute('aria-label', label);
  }
}
