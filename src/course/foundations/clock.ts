import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { store } from '../../app/store';

export const clampProgress = (x: number): number => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
export const advanceProgress = (from: number, elapsed: number, duration: number): number => clampProgress(from + Math.max(0, elapsed) / Math.max(1, duration));
export const canContinue = (_progress: number, attempted: boolean): boolean => attempted;
export function advancePlayback(from:number,elapsed:number,duration:number,rate=1,loop=false) {
  const next=from+Math.max(0,elapsed)/Math.max(1,duration)*Math.max(.1,Math.min(4,Number.isFinite(rate)?rate:1));
  return loop?next%1:clampProgress(next);
}

/** Explanation time only. Scenes explicitly map it to physiological time. */
export function useStoryClock(key: string, duration: number, alreadyAttempted: boolean, options: {rate?:number;loop?:boolean} = {}) {
  const [systemReduced, setSystemReduced] = useState(() => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const reduced = store.settings.value.reduceMotion || systemReduced;
  const [progress, setProgress] = useState(reduced || alreadyAttempted ? 1 : 0);
  const [playing, setPlaying] = useState(false);
  const current = useRef(progress);
  const raf = useRef(0);
  const playback=useRef(options);playback.current=options;
  current.current = progress;
  const pause = useCallback(() => { cancelAnimationFrame(raf.current); raf.current = 0; setPlaying(false); }, []);
  const seek = useCallback((p: number) => { pause(); current.current = clampProgress(p); setProgress(current.current); }, [pause]);
  const play = useCallback((restart = false) => {
    pause();
    if (reduced) { seek(1); return; }
    const from = restart || current.current >= 1 ? 0 : current.current;
    let last = performance.now();
    current.current = from; setProgress(from); setPlaying(true);
    const tick = (now: number) => {
      const next = advancePlayback(current.current, now-last, duration, playback.current.rate, playback.current.loop);
      last=now;
      current.current = next; setProgress(next);
      if (next >= 1) { raf.current = 0; setPlaying(false); }
      else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [duration, reduced, pause, seek]);
  useEffect(() => { seek(reduced || alreadyAttempted ? 1 : 0); return pause; }, [key]);
  useEffect(() => { if (reduced) seek(1); }, [reduced]);
  useEffect(() => {
    const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(query?.matches ?? false);
    query?.addEventListener('change', update);
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility);
    return () => { query?.removeEventListener('change', update); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); pause(); };
  }, [pause]);
  return { progress, playing, reduced, pause, seek, play };
}
