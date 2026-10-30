/**
 * The single clock. Advances store.time while playing (real dt × speed, dt capped so a background tab does not jump),
 * and publishes store.now ~10×/s. Views run their own render loops and read store.time.peek().
 */
import type { SimEngine } from '../sim/types';
import { store } from './store';

export function startClock(engine: SimEngine): () => void {
  let last = performance.now();
  let lastNow = 0;
  let raf = 0;
  const tick = (ts: number) => {
    const dt = Math.min(100, Math.max(0, ts - last));
    last = ts;
    if (store.playing.peek()) store.time.value = store.time.peek() + dt * store.speed.peek();
    if (ts - lastNow > 100) {
      lastNow = ts;
      const t = store.time.peek();
      const c = engine.cycleAt(t);
      const seg = c?.segments.find((s) => t >= s.t0 && t < s.t1)?.seg ?? null;
      const mech = c?.mech.find((m) => t >= m.t0 && t < m.t1)?.phase ?? null;
      store.now.value = { tMs: t, segment: seg, mech, responsible: engine.responsible(t).slice(0, 6) };
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
