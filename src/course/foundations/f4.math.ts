/** Paper dimensions, in millimetres; changing the drawing scale never changes the signal. */
export function paperDistance(ms: number, speed: number): number { return ms * speed / 1000; }
export function paperHeight(mv: number, gain: number): number { return mv * gain; }
export function pulseSize(speed: number, gain: number) { return { width: paperDistance(200, speed), height: paperHeight(1, gain) }; }
export function rateFromPaper(rrMm: number, speed: number): number { return 60 * speed / rrMm; }
