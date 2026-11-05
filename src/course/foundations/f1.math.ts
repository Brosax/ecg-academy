import type { BeatFiducials } from '../../figures/scene/timeline';

export type HeartMoment = 'p' | 'pr' | 'qrs' | 'st' | 't';

/** Teaching time is stretched independently; every endpoint remains a source fiducial. */
export function phaseWindow(beat: BeatFiducials, step: number): readonly [number, number] {
  const p = beat.pOn ?? beat.qrsOn - 160;
  const pOff = beat.pOff ?? beat.qrsOn - 50;
  if (step === 0) return [p - 55, pOff];
  if (step === 1) return [pOff, beat.qrsOn];
  if (step === 2) return [beat.qrsOn, beat.qrsOff];
  if (step === 3) return [beat.qrsOff, beat.tOff];
  return [p - 55, beat.tOff + 70];
}

export function momentWindow(beat: BeatFiducials, id: HeartMoment): readonly [number, number] {
  const p = beat.pOn ?? beat.qrsOn - 160;
  const pOff = beat.pOff ?? beat.qrsOn - 50;
  const t = beat.tPeak ?? (beat.qrsOff + beat.tOff) / 2;
  switch (id) {
    case 'p': return [p, pOff];
    case 'pr': return [pOff, beat.qrsOn];
    case 'qrs': return [beat.qrsOn, beat.qrsOff];
    case 'st': return [beat.qrsOff, beat.qrsOff + (t - beat.qrsOff) * 0.4];
    case 't': return [beat.qrsOff + (t - beat.qrsOff) * 0.4, beat.tOff];
  }
}

export function teachingTime(beat: BeatFiducials, step: number, progress: number, selected: HeartMoment | null = null): number {
  const [a, b] = selected ? momentWindow(beat, selected) : phaseWindow(beat, step);
  return a + (b - a) * (selected ? 0.55 : Math.max(0, Math.min(1, progress)));
}

export function phaseAt(beat: BeatFiducials, t: number): HeartMoment | null {
  const p = beat.pOn ?? beat.qrsOn - 160;
  const pOff = beat.pOff ?? beat.qrsOn - 50;
  if (t < p || t > beat.tOff) return null;
  if (t < pOff) return 'p';
  if (t < beat.qrsOn) return 'pr';
  if (t < beat.qrsOff) return 'qrs';
  if (t < momentWindow(beat, 't')[0]) return 'st';
  return 't';
}
