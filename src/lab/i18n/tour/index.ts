import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

export const tt = defineDict('tour', zh, en, es);
export type { TourKey } from './zh';
