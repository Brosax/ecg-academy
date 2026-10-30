import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

/** Explanation templates: te('h.dir', {...}) or te.in(lang, ...) for pure generators. */
export const te = defineDict('explain', zh, en, es);
export type { ExplainKey } from './zh';
