import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

/** 3D view translator: tv('cam.anterior'), tv.in(lang, 'lead.value', { lead, mv }) for three.js labels. */
export const tv = defineDict('view3d', zh, en, es);
