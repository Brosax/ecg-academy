/**
 * §9.5 AV conduction (group 'av-block'): first-degree AV block, Mobitz I and II, 2:1, high-grade and complete AV block,
 * AV dissociation. Every block is a junction parameter (rhythm/junction.ts), never a drawn waveform:
 *  - nodal delay / Wenckebach: the decremental AV-node law (ahMin, ahExt, τ, ERP; recovery from the node's last exit);
 *    the ERPs below were solved with `solveWenckebach` (middle of each ratio's ERP range) for typical periods at 75/min:
 *    PR ≈ 146 → 235 → 278 ms in 4:3 (increments shrinking, the largest after the first conducted beat, criteria.md
 *    `wenckebach-arithmetic`), every PR < 300 ms (the longest PR stays well inside the P search window of a reader and
 *    of the oracle);
 *  - infra-His block: all-or-none His–Purkinje conduction (Mobitz II with a ratio, fixed N:1, complete), usually with a
 *    bundle-branch block (criteria.md `mobitz-ii`, `escape-site`);
 *  - escape: a junctional (narrow, 40–60/min) or ventricular (wide, 20–40/min) pacemaker reset by every ventricular
 *    activation (criteria.md `intrinsic-rates`, `escape-site`); with a rate above the sinus rate it is an accelerated
 *    junctional pacemaker that takes over (isorhythmic AV dissociation with capture beats, `av-dissociation`).
 * Hallmark criteria: tests/synth/oracle/criteria/av-block.ts.
 */
import { l } from '../../core/l10n';
import type { ScenarioDef } from '../api';
import { defineGroup } from './define';

/** AV node of a Wenckebach heart: shallow recovery curve (ahExt / τ < 1) → typical decreasing PR increments. */
const WENCKEBACH_AVN = { ahMinMs: 60, ahExtMs: 150, tauMs: 240, jitter: 0, conceal: 0 } as const;

export const AV_BLOCK_SCENARIOS: readonly ScenarioDef[] = defineGroup('av-block', [
  {
    id: 'av-block-1',
    group: 'av-block',
    findings: ['av-block-1', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 67 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 68, hrv: 0.02 },
      activation: { kind: 'conducted' },
      // PR 280: slow AV-nodal conduction (AH 200 ms), every P conducted
      junction: { avn: { ahMinMs: 200, ahExtMs: 60, tauMs: 70, erpMs: 430, jitter: 0, conceal: 0 } },
    },
    dials: { rate: { min: 55, max: 90 }, pr: { min: 220, max: 360 } },
    facts: { blockLevel: 'AV node' },
    highlights: { 'av-node': 'block' },
  },
  {
    id: 'av-block-2-mobitz1',
    group: 'av-block',
    findings: ['av-block-2-mobitz1', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 74 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 75, hrv: 0.004 },
      activation: { kind: 'conducted' },
      junction: { avn: { ...WENCKEBACH_AVN, erpMs: 685 } },
    },
    dials: {},
    variants: {
      '3to2': {
        label: l('3:2 文氏周期', '3:2 Wenckebach periods', 'periodos de Wenckebach 3:2'),
        patch: { junction: { avn: { ...WENCKEBACH_AVN, erpMs: 745 } } },
      },
      '5to4': {
        label: l('5:4 文氏周期', '5:4 Wenckebach periods', 'periodos de Wenckebach 5:4'),
        patch: { junction: { avn: { ...WENCKEBACH_AVN, erpMs: 667 } } },
      },
    },
    facts: { blockLevel: 'AV node' },
    highlights: { 'av-node': 'block' },
  },
  {
    id: 'av-block-2-mobitz2',
    group: 'av-block',
    findings: ['av-block-2-mobitz2', 'sinus-rhythm', 'rbbb'],
    patient: { sex: 'female', ageY: 79 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 75, hrv: 0.01 },
      // diseased conduction system below the His: right bundle-branch block and intermittent all-or-none block
      activation: { kind: 'conducted', blocks: { rbb: 'complete' } },
      junction: { infraHis: { pattern: 'mobitz2', ratio: 4 } },
    },
    dials: { rate: { min: 60, max: 90 } },
    variants: {
      lbbb: {
        label: l('合并左束支阻滞', 'with left bundle-branch block', 'con bloqueo de rama izquierda'),
        patch: { activation: { kind: 'conducted', blocks: { lbb: 'complete' } } },
        findings: ['av-block-2-mobitz2', 'sinus-rhythm', 'lbbb'],
      },
    },
    facts: { blockLevel: 'infra-His', conduction: '4:3' },
    highlights: { his: 'block', rbb: 'block' },
  },
  {
    id: 'av-block-2-2to1',
    group: 'av-block',
    findings: ['av-block-2-2to1', 'sinus-rhythm'],
    patient: { sex: 'male', ageY: 71 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 84, hrv: 0.01 },
      activation: { kind: 'conducted' },
      // nodal 2:1: the AV-node refractoriness exceeds one P–P cycle but not two
      junction: { avn: { ahMinMs: 100, ahExtMs: 60, tauMs: 80, erpMs: 880, jitter: 0, conceal: 0 } },
    },
    // PR of the conducted beats (nodal 2:1 with a long PR is the AV-node clue, criteria.md 2:1 localisation): solved for
    // the node's recovery over two P–P cycles (dials/solve.ts › nodalRatio); the infra-His variant owns its node
    dials: { pr: { min: 160, max: 340 } },
    variants: {
      'infra-his': {
        label: l('希氏束下阻滞（宽QRS）', 'infra-His block (wide QRS)', 'bloqueo infrahisiano (QRS ancho)'),
        patch: {
          activation: { kind: 'conducted', blocks: { rbb: 'complete' } },
          junction: { avn: { ahMinMs: 80, ahExtMs: 60, tauMs: 70, erpMs: 280, jitter: 0, conceal: 0 }, infraHis: { pattern: 'fixed-ratio', ratio: 2 } },
        },
        findings: ['av-block-2-2to1', 'sinus-rhythm', 'rbbb'],
      },
    },
    facts: { conduction: '2:1' },
    highlights: { 'av-node': 'block' },
  },
  {
    id: 'av-block-high-grade',
    group: 'av-block',
    findings: ['av-block-high-grade', 'sinus-rhythm'],
    patient: { sex: 'female', ageY: 82 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 96, hrv: 0.008 },
      activation: { kind: 'conducted' },
      // 3:1 nodal block (two consecutive P waves blocked; ERP from erpForRatio at a 625 ms P–P); a slow junctional
      // escape (30/min) stays in reserve
      junction: {
        avn: { ahMinMs: 100, ahExtMs: 60, tauMs: 80, erpMs: 1740, jitter: 0, conceal: 0 },
        escape: { level: 'junctional', rateBpm: 30 },
      },
    },
    dials: {},
    facts: { conduction: '3:1' },
    highlights: { 'av-node': 'block' },
  },
  {
    id: 'av-block-3',
    group: 'av-block',
    findings: ['av-block-3', 'av-dissociation', 'junctional-escape-rhythm'],
    patient: { sex: 'male', ageY: 76 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 78, hrv: 0.02 },
      activation: { kind: 'conducted' },
      // block in the AV node: a narrow junctional escape at 45/min takes over
      junction: { completeNodal: true, escape: { level: 'junctional', rateBpm: 45 } },
    },
    dials: {},
    variants: {
      'infra-his': {
        label: l('希氏束下阻滞，室性逸搏心律', 'infra-His block, ventricular escape', 'bloqueo infrahisiano, ritmo de escape ventricular'),
        patch: { junction: { completeNodal: false, infraHis: { pattern: 'complete' }, escape: { level: 'ventricular', rateBpm: 34, origin: 'lv-apex' } } },
        findings: ['av-block-3', 'av-dissociation', 'ventricular-escape-rhythm'],
      },
    },
    facts: { blockLevel: 'AV node', escape: 'junctional 45/min' },
    highlights: { 'av-node': 'block' },
  },
  {
    id: 'av-dissociation',
    group: 'av-block',
    findings: ['av-dissociation', 'accelerated-junctional-rhythm'],
    patient: { sex: 'male', ageY: 58 },
    source: {
      // slowed sinus node and a slightly faster junctional pacemaker: isorhythmic dissociation with capture beats
      rhythm: { kind: 'sinus', rateBpm: 60, hrv: 0.03 },
      activation: { kind: 'conducted' },
      junction: { escape: { level: 'junctional', rateBpm: 66 } },
    },
    dials: {},
    facts: { mechanism: 'isorhythmic dissociation: sinus 60/min, junctional 66/min' },
    highlights: { 'av-node': 'focus' },
  },
]);
