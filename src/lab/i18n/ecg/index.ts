import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

/** ECG module translator: te('cal.toggle'), te.in(lang, 'hover.readout', {...}) for canvases. */
export const te = defineDict('ecg', zh, en, es);
export type { EcgKey } from './zh';
