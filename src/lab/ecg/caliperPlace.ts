/**
 * Places the calipers (store.calipers) on the last complete beat — shared by the caliper bar under the strips and by
 * the shell's tool rail. Measuring is an inspection, so playback pauses first and the cursors stay on screen.
 */
import type { AppCommands } from '../app/commands';
import { store } from '../app/store';
import type { LeadName, SimEngine } from '../sim/types';
import { defaultCalipers } from './calipers';
import type { CaliperMode } from './calipers';
import { getHub } from './sampler';
import { caliperMode } from './state';
import { latestCompleteCycle } from './summary';

export function placeCalipers(engine: SimEngine, commands: AppCommands, lead: LeadName, mode: CaliperMode = caliperMode.peek()): void {
  commands.pause();
  const hub = getHub(engine);
  const t = store.time.peek();
  const c = latestCompleteCycle(hub, t) ?? hub.cycles.at(t);
  if (!c) return;
  const prev = hub.cycles.prev(c);
  // Interval mode spans the last complete RR so both cursors are already on screen.
  if (mode === 'interval' && prev?.qrsOn != null && c.qrsOn !== null) {
    store.calipers.value = { t0: prev.qrsOn, t1: c.qrsOn, lead };
    return;
  }
  const d = defaultCalipers(mode, c, hub.beat(c).rrMs);
  if (d) store.calipers.value = { t0: d.t0, t1: d.t1, lead };
}
