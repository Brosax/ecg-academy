import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

/** Disease mode translator: td('ui.pick'), td('lbbb.mech') … */
export const td = defineDict('disease', zh, en, es);
