import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

/** Shared glossary translator: tc('struct.SA'), tc('seg.QRS'), tc('mode.leads') … */
export const tc = defineDict('common', zh, en, es);
