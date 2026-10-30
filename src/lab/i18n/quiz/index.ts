import { defineDict } from '../index';
import { en } from './en';
import { es } from './es';
import { zh } from './zh';

export const tq = defineDict('quiz', zh, en, es);
export type { QuizKey } from './zh';
