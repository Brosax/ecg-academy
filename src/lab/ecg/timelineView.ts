/**
 * Timeline bar: the current cycle from model truth as coloured bands — electrical row (P, PR, QRS, ST, T, TP) and
 * mechanical row (atrial systole … filling) — with valve open/close ticks, S1/S2 and the playhead. Click or drag to
 * seek (the range is frozen while dragging so the bar does not jump to the next cycle); ←/→ step between phases.
 */
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import { te } from '../i18n/ecg';
import { tc } from '../i18n/common';
import type { MechPhase, SimEngine, WaveSegment } from '../sim/types';
import { CanvasView, font, withAlpha } from './canvas';
import { fmtNum } from './format';
import { getHub } from './sampler';
import type { EcgHub } from './sampler';
import { cycleKey } from './sampler';
import { MECH_COLOR, SEG_COLOR, timelineModel, timeToX, xToTime } from './timeline';
import type { TimelineModel } from './timeline';

const VALVE_SHORT = { MITRAL: { open: 'valve.MO', close: 'valve.MC' }, AORTIC: { open: 'valve.AO', close: 'valve.AC' } } as const;

export class TimelineView extends CanvasView {
  private readonly hub: EcgHub;
  private model: TimelineModel | null = null;
  private modelKey = '';
  private frozen: TimelineModel | null = null;
  private drag: { id: number; wasPlaying: boolean } | null = null;

  constructor(host: HTMLElement, fg: HTMLCanvasElement, engine: SimEngine, private readonly commands: AppCommands) {
    super(host, null, fg);
    this.hub = getHub(engine);
    this.listen(host, 'pointerdown', (e) => {
      if (!this.model) return;
      this.frozen = this.model;
      this.drag = { id: e.pointerId, wasPlaying: store.playing.peek() };
      try {
        host.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.commands.pause();
      this.seekAt(e);
      e.preventDefault();
    });
    this.listen(host, 'pointermove', (e) => {
      if (this.drag && this.drag.id === e.pointerId) this.seekAt(e);
    });
    const end = (e: PointerEvent) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const resume = this.drag.wasPlaying && e.type === 'pointerup';
      this.drag = null;
      this.frozen = null;
      if (resume) this.commands.play();
    };
    this.listen(host, 'pointerup', end);
    this.listen(host, 'pointercancel', end);
    this.listen(host, 'keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      if (e.shiftKey) {
        this.commands.pause();
        this.commands.seek(store.time.peek() + dir * 10);
      } else this.commands.stepPhase(dir);
    });
  }

  private gutter(): number {
    return this.size.cssW > 480 ? 76 : 4;
  }

  private seekAt(e: PointerEvent): void {
    const m = this.frozen ?? this.model;
    if (!m) return;
    const [x] = this.localPoint(e);
    const g = this.gutter();
    this.commands.seek(xToTime(x - g, m.t0, m.t1, this.size.cssW - g - 4));
  }

  protected staticKey(): string {
    return '';
  }
  protected drawStatic(): void {}

  protected frameKey(): string {
    return `${store.time.peek()}|${this.hub.version}|${this.frozen ? 'f' : ''}`;
  }

  protected drawFrame(ctx: CanvasRenderingContext2D): void {
    const { pxW, pxH, dpr, cssW } = this.size;
    const c = this.colors, lang = store.lang.peek();
    const t = store.time.peek();
    if (!this.frozen) {
      const cy = this.hub.cycles.at(t);
      const k = cy ? cycleKey(cy) : '';
      if (k !== this.modelKey) {
        this.modelKey = k;
        this.model = cy ? timelineModel(cy) : null;
      }
    }
    const m = this.frozen ?? this.model;
    // transparent: the stage's CSS background (panel, or the shell's glass bar) shows through
    ctx.clearRect(0, 0, pxW, pxH);
    if (!m) return;
    const g = this.gutter(), w = cssW - g - 4;
    const X = (tt: number) => (g + timeToX(tt, m.t0, m.t1, w)) * dpr;
    const rowE = [6, 22], rowM = [32, 22], rowV = [58, 18];

    if (g > 10) {
      ctx.font = font(11, dpr, 600);
      ctx.fillStyle = c['fg-muted'];
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(te.in(lang, 'timeline.electrical'), 4 * dpr, (rowE[0] + rowE[1] / 2) * dpr);
      ctx.fillText(te.in(lang, 'timeline.mechanical'), 4 * dpr, (rowM[0] + rowM[1] / 2) * dpr);
    }

    const band = (t0: number, t1: number, row: number[], token: keyof typeof c, alpha: number, full: string, short: string) => {
      const xa = X(t0), xb = X(t1), y = row[0] * dpr, h = row[1] * dpr;
      withAlpha(ctx, alpha, () => {
        ctx.fillStyle = c[token];
        ctx.fillRect(xa, y, Math.max(1, xb - xa - dpr), h);
      });
      ctx.font = font(11, dpr, 600);
      const room = xb - xa - 6 * dpr;
      const label = ctx.measureText(full).width <= room ? full : ctx.measureText(short).width <= room ? short : '';
      if (!label) return;
      ctx.fillStyle = c.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, (xa + xb) / 2, y + h / 2);
    };
    for (const s of m.segments) {
      const st = SEG_COLOR[s.key as WaveSegment];
      band(s.t0, s.t1, rowE, st.token, st.alpha, tc.in(lang, `seg.${s.key}` as never), s.key);
    }
    for (const s of m.mech) {
      const st = MECH_COLOR[s.key as MechPhase];
      band(s.t0, s.t1, rowM, st.token, st.alpha, tc.in(lang, `mech.${s.key}` as never), te.in(lang, `mechShort.${s.key}` as never));
    }

    // Valve ticks, S1 / S2
    ctx.font = font(10.5, dpr, 600);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    for (const v of m.valves) {
      const x = Math.round(X(v.t)) + 0.5;
      ctx.strokeStyle = c['fg-muted'];
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(x, rowM[0] * dpr);
      ctx.lineTo(x, (rowV[0] + 4) * dpr);
      ctx.stroke();
      const short = te.in(lang, VALVE_SHORT[v.id as 'MITRAL' | 'AORTIC'][v.kind]);
      const sound = m.sounds.find((s) => s.t === v.t && v.kind === 'close');
      ctx.fillStyle = sound ? c.fg : c['fg-muted'];
      // Closures label to the left of their tick, openings to the right: MC/AO and AC/MO are only ~35–95 ms apart.
      ctx.textAlign = v.kind === 'close' ? 'right' : 'left';
      ctx.fillText(sound ? `${sound.id} ${short}` : short, x + (v.kind === 'close' ? -3 : 3) * dpr, (rowV[0] + 5) * dpr);
    }

    // Playhead
    if (t >= m.t0 && t <= m.t1) {
      const x = X(t);
      ctx.strokeStyle = c['ecg-cursor'];
      ctx.lineWidth = Math.max(1, 2 * dpr);
      ctx.beginPath();
      ctx.moveTo(x, 2 * dpr);
      ctx.lineTo(x, (rowM[0] + rowM[1] + 2) * dpr);
      ctx.stroke();
      ctx.fillStyle = c['ecg-cursor'];
      ctx.beginPath();
      ctx.moveTo(x - 5 * dpr, 0);
      ctx.lineTo(x + 5 * dpr, 0);
      ctx.lineTo(x, 6 * dpr);
      ctx.closePath();
      ctx.fill();
    }
  }

  protected updateAria(): void {
    const m = this.frozen ?? this.model;
    if (!m) return;
    const lang = store.lang.peek();
    const now = store.now.peek();
    const t = store.time.peek();
    const seg = now.segment ? tc.in(lang, `seg.${now.segment}` as never) : '—';
    const mech = now.mech ? tc.in(lang, `mech.${now.mech}` as never) : '—';
    const set = (k: string, v: string) => {
      if (this.host.getAttribute(k) !== v) this.host.setAttribute(k, v);
    };
    set('aria-valuemin', String(Math.round(m.t0)));
    set('aria-valuemax', String(Math.round(m.t1)));
    set('aria-valuenow', String(Math.round(Math.min(m.t1, Math.max(m.t0, t)))));
    set('aria-valuetext', `${seg} · ${mech} · ${fmtNum(lang, t / 1000, 2)} s`);
  }
}
