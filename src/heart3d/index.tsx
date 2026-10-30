/**
 * Public entry of the small 3D heart. Other modules import only from here:
 *   <Heart3D regions={ecg.regions} cursor={cursor} showConduction emphasize={['lv-mid-anterior']} />
 *   HEART_CREDIT — attribution of the HRA model for the About page.
 */
export { Heart3D } from './Heart3D';
export { HEART_CREDIT, type HeartCredit } from './credit';
export type { Heart3DProps } from './api';
