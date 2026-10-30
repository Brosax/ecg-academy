/**
 * Catalogue group 'atrial' (DECISION §9.2 sinus node and atrial rhythms; src/synth/catalogue/rhythm-atrial.ts): every scenario and variant
 * generates a truth that matches its declaration; labels in zh / en / es; highlights and dial ranges sound. The
 * hallmark criteria live in tests/synth/oracle/criteria, the laddergram in tests/synth/rhythm/scheduler.test.ts.
 */
import { describe } from 'vitest';
import { rhythmGroupChecks } from '../rhythm/catalogue-checks';

describe('catalogue: atrial', () => rhythmGroupChecks('atrial'));
