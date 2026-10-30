import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

export const ts = defineDict('shell', zh, en, es);
export type { ShellKey } from './zh';
