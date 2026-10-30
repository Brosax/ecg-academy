/**
 * Catalogue group 'ventricular' (DECISION §9.4 ventricular ectopy and rhythms; src/synth/catalogue/rhythm-ventricular.ts): every scenario and variant
 * generates a truth that matches its declaration; labels in zh / en / es; highlights and dial ranges sound. The
 * hallmark criteria live in tests/synth/oracle/criteria, the laddergram in tests/synth/rhythm/scheduler.test.ts.
 */
import { describe } from 'vitest';
import { rhythmGroupChecks } from '../rhythm/catalogue-checks';

describe('catalogue: ventricular', () => rhythmGroupChecks('ventricular'));
