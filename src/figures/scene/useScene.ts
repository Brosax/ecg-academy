/**
 * The scene hook (spec §2.6): owns the one progress value p ∈ [0, 1] of an animated scene, the beat index, the
 * play-once loop, reduced motion and the bridge to the shared ECG cursor.
 *
 * Contract:
 *  - Play once and hold. replay() plays 0 → 1; playBeat(i) plays beat i and holds at its end; prev / next / seekBeat
 *    land on a beat target and stop; seek(p) stops. Nothing loops.
 *  - Late source. `timeline === null` means "not ready": p = 0 (1 under reduced motion), nothing plays. When the
 *    timeline's `key` changes (the block's ECG arrived, the chosen beat changed) the hook resets p, stops and re-arms
 *    autoplay once for that key (when the stage is in view). Interaction state never belongs in `key`.
 *  - Reduced motion (store setting or media query): p = 1 at mount, every play lands on its end frame.
 *  - Cursor bridge (ECG-backed scenes, `timeline.window` + `cursor`): every p written by the scene is mirrored to the
 *    cursor (whole ms) and remembered; an external cursor write (a click on the 12-lead) stops playback and seeks.
 *
 * The rAF loop is the hook's own (usePlayOnce in shared.tsx cannot re-arm for a late source); the decisions are in
 * timeline.ts and tested there.
 */
import type { Signal } from '@preact/signals';
import { effect } from '@preact/signals';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { prefersReducedMotion } from '../shared';
import {
  beatIndexAt,
  beatTarget,
  compileBeats,
  frameGate,
  gateInterval,
  local as localOf,
  pOfTime,
  seg as segOf,
  timeOfP,
  type Beat,
  type BeatDef,
  type BeatTargetKind,
  type Timeline,
} from './timeline';

export interface UseSceneOptions<Id extends string> {
  /** the compiled timeline, or null while the source is not ready (no autoplay, controls disabled) */
  readonly timeline?: Timeline<Id> | null;
  /** shorthand instead of `timeline`: beats by nominal length (compiled once per identity) */
  readonly beats?: readonly BeatDef<Id>[];
  /** with `beats`: overrides the wall-clock length (fractions stay proportional) */
  readonly durationMs?: number;
  /** default true: play once when the stage first scrolls into view */
  readonly autoplay?: boolean;
  /** where prev / next / the beat bar land; default 'end' (every end frame is complete on its own) */
  readonly seekTo?: BeatTargetKind;
  /** the shared ECG cursor the FigureBlock passes (bridged only when the timeline has a window) */
  readonly cursor?: Signal<number | null>;
  /** IntersectionObserver target for autoplay (the stage wrapper); without it autoplay starts at mount */
  readonly target?: RefObject<Element | null>;
}

export interface SceneState<Id extends string = string> {
  readonly p: number;
  /** index of the current beat */
  readonly i: number;
  /** alias of i */
  readonly beatIndex: number;
  readonly id: Id;
  readonly beats: readonly Beat<Id>[];
  readonly durationMs: number;
  readonly window: readonly [number, number] | null;
  readonly ready: boolean;
  readonly playing: boolean;
  readonly reduced: boolean;
  /** alias of reduced */
  readonly reducedMotion: boolean;
  /** 0 … 1 inside that beat (0 before, 1 after) */
  readonly local: (id: Id) => number;
  /** eased progress of p through [a, b] */
  readonly seg: (a: number, b: number) => number;
  /** play [from, to] once at the nominal speed and hold at `to` (defaults: the whole timeline) */
  readonly play: (from?: number, to?: number) => void;
  readonly replay: () => void;
  readonly stop: () => void;
  readonly seek: (p: number) => void;
  readonly seekBeat: (i: number) => void;
  readonly playBeat: (i: number) => void;
  readonly prev: () => void;
  readonly next: () => void;
  /** alias of prev */
  readonly prevBeat: () => void;
  /** alias of next */
  readonly nextBeat: () => void;
}

const NO_BEATS: readonly Beat<never>[] = [];

export function useScene<Id extends string>(opts: UseSceneOptions<Id>): SceneState<Id> {
  const autoplay = opts.autoplay ?? true;
  const seekTo = opts.seekTo ?? 'end';
  const reduced = prefersReducedMotion();

  // the timeline: explicit, or compiled from beats (identity by the compiled key, not by array identity)
  const beatsKey = opts.beats ? `${opts.beats.map((b) => `${b.id}:${b.ms}`).join('|')}#${opts.durationMs ?? ''}` : '';
  const compiled = useMemo<Timeline<Id> | null>(() => {
    if (opts.timeline !== undefined) return opts.timeline;
    if (!opts.beats || opts.beats.length === 0) return null;
    return compileBeats(opts.beats, opts.durationMs == null ? {} : { durationMs: opts.durationMs });
  }, [opts.timeline, beatsKey]);
  const tl = compiled;
  const key = tl?.key ?? '';

  const [p, setP] = useState(reduced ? 1 : 0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const tlRef = useRef(tl);
  tlRef.current = tl;
  const lastWritten = useRef<number | null>(null);

  // a manual replay must not outlive the scene (the autoplay effect only cleans up its own run)
  useEffect(
    () => () => {
      if (raf.current && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );

  const stop = useCallback(() => {
    if (raf.current && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf.current);
    raf.current = 0;
    setPlaying(false);
  }, []);

  const play = useCallback(
    (from = 0, to = 1) => {
      stop();
      const t = tlRef.current;
      const a = Math.min(1, Math.max(0, from));
      const b = Math.min(1, Math.max(0, to));
      if (!t || b <= a || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
        setP(b);
        return;
      }
      const durationMs = Math.max(1, t.durationMs * (b - a));
      setP(a);
      setPlaying(true);
      const t0 = performance.now();
      let lastEmit = t0;
      let lastFrame = t0;
      const step = (now: number) => {
        const f = Math.min(1, (now - t0) / durationMs);
        if (f >= 1) {
          raf.current = 0;
          setP(b);
          setPlaying(false);
          return;
        }
        if (frameGate(lastEmit, now, gateInterval(now - lastFrame))) {
          setP(a + (b - a) * f);
          lastEmit = now;
        }
        lastFrame = now;
        raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    },
    [stop],
  );

  const replay = useCallback(() => play(0, 1), [play]);

  const seek = useCallback(
    (x: number) => {
      stop();
      setP(Math.min(1, Math.max(0, x)));
    },
    [stop],
  );

  const beats = (tl?.beats ?? NO_BEATS) as readonly Beat<Id>[];
  const i = beatIndexAt(beats, p);

  const seekBeat = useCallback(
    (k: number) => {
      const t = tlRef.current;
      if (!t) return;
      seek(beatTarget(t.beats, k, seekTo));
    },
    [seek, seekTo],
  );

  const playBeat = useCallback(
    (k: number) => {
      const t = tlRef.current;
      if (!t || t.beats.length === 0) return;
      const b = t.beats[Math.min(t.beats.length - 1, Math.max(0, Math.round(k)))];
      play(b.from, b.to);
    },
    [play],
  );

  const iRef = useRef(i);
  iRef.current = i;
  const prev = useCallback(() => seekBeat(iRef.current - 1), [seekBeat]);
  const next = useCallback(() => seekBeat(iRef.current + 1), [seekBeat]);

  // ── source identity: reset, then arm autoplay once per key ──
  useEffect(() => {
    stop();
    setP(reduced ? 1 : 0);
    if (!tl || !autoplay || reduced) return;
    const el = opts.target?.current;
    if (el && typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play(0, 1);
        }
      });
      io.observe(el);
      return () => {
        io.disconnect();
        stop();
      };
    }
    play(0, 1);
    return stop;
  }, [key]);

  // ── cursor bridge: own writes are remembered, foreign writes stop and seek ──
  const cursor = opts.cursor;
  // stable by source identity, so the bridge subscribes once per key, not once per render
  const win = useMemo<readonly [number, number] | null>(() => tl?.window ?? null, [key]);
  useEffect(() => {
    if (!cursor || !win) return;
    const t = Math.round(timeOfP(win, p));
    lastWritten.current = t;
    if (cursor.peek() !== t) cursor.value = t;
  }, [cursor, win, p]);
  useEffect(() => {
    if (!cursor || !win) return;
    return effect(() => {
      const t = cursor.value;
      if (t == null || t === lastWritten.current) return;
      stop();
      setP(pOfTime(win, t));
    });
  }, [cursor, win, stop]);

  const localFn = useCallback(
    (id: Id) => {
      const k = beats.findIndex((b) => b.id === id);
      return k < 0 ? 0 : localOf(beats, k, p);
    },
    [beats, p],
  );
  const segFn = useCallback((a: number, b: number) => segOf(p, a, b), [p]);

  return {
    p,
    i,
    beatIndex: i,
    id: (beats[i]?.id ?? '') as Id,
    beats,
    durationMs: tl?.durationMs ?? 0,
    window: win,
    ready: tl != null,
    playing,
    reduced,
    reducedMotion: reduced,
    local: localFn,
    seg: segFn,
    play,
    replay,
    stop,
    seek,
    seekBeat,
    playBeat,
    prev,
    next,
    prevBeat: prev,
    nextBeat: next,
  };
}
