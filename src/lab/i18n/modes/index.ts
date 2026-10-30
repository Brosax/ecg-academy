import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

export const tm = defineDict('modes', zh, en, es);
export type { ModesKey } from './zh';
