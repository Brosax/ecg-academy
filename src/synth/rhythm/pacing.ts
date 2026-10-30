/**
 * Pacemaker (DECISION §6.7, §9.11): timing cycles of single- and dual-chamber devices, sensing faults and the stimulus
 * as a source.
 *
 * Timing (NASPE/BPEG code; simplified to the cycles a reader needs): lower-rate interval LRI = 60000 / lowerRate;
 * ventricular refractory period after a ventricular event (VRP 250 ms) and post-ventricular atrial refractory period
 * (PVARP 250 ms), during which events are not sensed. AAI paces the atrium at the last atrial event + LRI unless an
 * atrial event is sensed. VVI paces the ventricle at the last ventricular event + LRI unless a ventricular event is
 * sensed. DDD paces the atrium at the last ventricular event + (LRI − AV delay) unless a P is sensed outside PVARP,
 * and the ventricle at the atrial event + AV delay unless a QRS is sensed first (sinus tracking: AS–VP).
 * Faults: no capture (selected stimuli do not depolarise the tissue: a spike without a P / QRS), undersensing (native
 * events are ignored: fixed-rate stimuli land inside native QRS / T), oversensing (myopotential bursts are sensed as
 * ventricular events: the device is inhibited for the burst, a pause longer than the LRI).
 *
 * Stimulus: an area-preserving `impulse` kernel along the tip → can (unipolar, large) or tip → ring (bipolar, about
 * 10× smaller) direction, so every lead shows the spike through the same lead system. Areas are chosen so that a
 * bipolar spike is ≈ 0.5–1.5 mV and a unipolar one several mV in most leads at 500 Hz.
 */
import type { Rng } from '../../core/rng';
import type { PacingSite, Vec3 } from '../api';
import { sub, unit } from '../frame';
import { centroidOf } from '../heart/anatomy';
import { impulseKernel, type Kernel } from '../kernel/kernel';

export const VRP_MS = 250;
export const PVARP_MS = 250;
/** stimulus → onset of the paced activation (ms) */
export const LATENCY_MS = 4;
/** sensed atrial event → ventricular stimulus is the programmed AV delay (same for paced and sensed here) */

/** Pulse generator in the left infraclavicular pocket (Frank, cm). */
const CAN: Vec3 = [7, -11, -5];

/** Lead-tip location per site (Frank, cm). */
export function tipOf(site: PacingSite | 'biv'): Vec3 {
  switch (site) {
    case 'ra-appendage': return [-2.6, -4.6, 2.0];
    case 'rv-apex': return centroidOf('rv-apical');
    case 'rv-septal': return centroidOf('lv-mid-anteroseptal');
    case 'rvot': return centroidOf('rv-outflow');
    case 'lv-lateral-epicardial': return centroidOf('lv-mid-anterolateral');
    case 'his': return centroidOf('his');
    case 'lbb-area': return centroidOf('lbb');
    case 'biv': return centroidOf('rv-apical');
  }
}

/** Stimulus kernel(s) at `t` for a site (BiV: RV and LV outputs simultaneously). */
export function stimulusKernels(site: PacingSite | 'biv', t: number, bipolar: boolean, beat: number): Kernel[] {
  const one = (tip: Vec3): Kernel => {
    // bipolar: tip → ring, the ring ≈ 1.5 cm proximal along the lead (toward the RA / the venous entry)
    const dir = bipolar ? unit(sub([-3, -4, 3], tip)) : unit(sub(CAN, tip));
    return impulseKernel(t, dir, bipolar ? 2.2 : 14, null, 1, beat);
  };
  if (site === 'biv') return [one(tipOf('rv-apex')), one(tipOf('lv-lateral-epicardial'))];
  return [one(tipOf(site))];
}

/** Myopotential bursts sensed by the device (oversensing): seeded windows inside the strip (absolute ms). */
export function myopotentialBursts(rng: Rng, durationMs: number): { from: number; to: number }[] {
  const a = rng.range(0.32, 0.42) * durationMs;
  const len = rng.range(600, 900);
  return [{ from: a, to: a + len }];
}

/** Does the stimulus number `k` (0-based, in strip order) fail to capture ('no-capture' fault: every 3rd one)? */
export function failsCapture(k: number): boolean {
  return k % 3 === 2;
}
