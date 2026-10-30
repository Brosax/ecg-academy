/**
 * §9.2 Sinus node and atrial rhythms (group 'atrial'): sinus pause, SA exit block, sinus-node dysfunction, ectopic
 * atrial rhythm, wandering pacemaker, PACs (conducted, blocked, aberrant), atrial tachycardia, MAT, PJCs and junctional
 * rhythms. Mechanisms: the resettable sinus node and the atrial clocks (rhythm/clocks.ts), the ectopy plans
 * (rhythm/ectopy.ts), the generated atrial-site family (rhythm/atrialSites.ts: P′ axis by site), the AV node and the
 * bundle refractoriness (rhythm/junction.ts). Hallmark criteria: tests/synth/oracle/criteria/atrial.ts.
 */
import { l } from '../../core/l10n';
import type { ScenarioDef } from '../api';
import { defineGroup } from './define';

export const ATRIAL_SCENARIOS: readonly ScenarioDef[] = defineGroup('atrial', [
  {
    id: 'sinus-pause',
    group: 'atrial',
    findings: ['sinus-rhythm', 'sinus-pause'],
    patient: { sex: 'female', ageY: 77 },
    source: {
      // sinus arrest: a pause of 2.85 s (3.3 cycles at 70/min: not a multiple of the P–P) after the 5th P of the strip
      rhythm: { kind: 'sinus', rateBpm: 70, hrv: 0.01, pauses: [{ afterBeat: 4, ms: 2850 }] },
      activation: { kind: 'conducted' },
    },
    dials: {},
    variants: {
      escape: {
        label: l('伴交界性逸搏', 'with a junctional escape beat', 'con latido de escape de la unión'),
        patch: { junction: { escape: { level: 'junctional', rateBpm: 42 } } },
        findings: ['sinus-rhythm', 'sinus-pause', 'junctional-escape-rhythm'],
      },
    },
    facts: { pauseMs: '2850' },
    highlights: { 'sa-node': 'block' },
  },
  {
    id: 'sa-exit-block',
    group: 'atrial',
    findings: ['sinus-rhythm', 'sa-exit-block'],
    patient: { sex: 'male', ageY: 72 },
    source: {
      // type II, 4:3: every 4th sinus discharge does not exit — the pause is exactly two P–P cycles
      rhythm: { kind: 'sinus', rateBpm: 76, hrv: 0.004, saBlock: { ratio: 4, type: 'II' } },
      activation: { kind: 'conducted' },
    },
    dials: {},
    variants: {
      'type-1': {
        label: l('二度I型窦房阻滞（文氏型）', 'type I (Wenckebach) SA block', 'bloqueo sinoauricular tipo I (Wenckebach)'),
        patch: { rhythm: { kind: 'sinus', rateBpm: 76, hrv: 0.004, saBlock: { ratio: 4, type: 'I' } } },
      },
    },
    facts: { type: 'second-degree SA exit block' },
    highlights: { 'sa-node': 'block' },
  },
  {
    id: 'sinus-node-dysfunction',
    group: 'atrial',
    findings: ['sinus-node-dysfunction'],
    patient: { sex: 'female', ageY: 79 },
    source: {
      // tachy-brady: an atrial tachycardia burst after the 2nd sinus P, then the overdrive-suppressed sinus node
      // recovers only after 2.9 s (prolonged sinus-node recovery time), then slow sinus rhythm
      rhythm: { kind: 'sinus', rateBpm: 54, hrv: 0.01, pauses: [{ afterBeat: 1, ms: 2900 }] },
      ectopy: [{ kind: 'pac', pattern: 'run', runLength: 8, couplingMs: 330, origins: ['la-superior'] }],
      activation: { kind: 'conducted' },
    },
    dials: {},
    facts: { mechanism: 'tachycardia–bradycardia syndrome: atrial burst, overdrive-suppression pause' },
    highlights: { 'sa-node': 'block' },
  },
  {
    id: 'ectopic-atrial-rhythm',
    group: 'atrial',
    findings: ['ectopic-atrial-rhythm'],
    patient: { sex: 'male', ageY: 34 },
    source: { rhythm: { kind: 'atrial-ectopic', sites: ['low-ra'], rateBpm: 66, mode: 'fixed' }, activation: { kind: 'conducted' } },
    dials: { rate: { min: 55, max: 90 } },
    variants: {
      'left-atrial': {
        label: l('左房节律', 'left atrial rhythm', 'ritmo auricular izquierdo'),
        patch: { rhythm: { kind: 'atrial-ectopic', sites: ['la-inferior'], rateBpm: 70, mode: 'fixed' } },
      },
    },
    facts: { site: 'low right atrium' },
    highlights: { ra: 'focus' },
  },
  {
    id: 'wandering-atrial-pacemaker',
    group: 'atrial',
    findings: ['wandering-atrial-pacemaker'],
    patient: { sex: 'male', ageY: 22 },
    source: { rhythm: { kind: 'atrial-ectopic', sites: ['sinus', 'ra-septal', 'low-ra'], rateBpm: 68, mode: 'wandering' }, activation: { kind: 'conducted' } },
    dials: {},
    highlights: { ra: 'focus' },
  },
  {
    id: 'pac',
    group: 'atrial',
    findings: ['sinus-rhythm', 'pac'],
    patient: { sex: 'female', ageY: 52 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 72, hrv: 0.015 },
      ectopy: [{ kind: 'pac', pattern: 'single', couplingMs: 540, origins: ['la-inferior'] }],
      activation: { kind: 'conducted' },
    },
    dials: { rate: { min: 62, max: 88 } },
    variants: {
      // several PACs on one strip (random coupling to the sinus P, never two in a row): each resets the sinus node
      frequent: {
        label: l('频发房性早搏', 'frequent PACs', 'extrasístoles auriculares frecuentes'),
        patch: { ectopy: [{ kind: 'pac', pattern: 'random', probability: 0.5, couplingMs: 540, origins: ['la-inferior'] }] },
      },
    },
    facts: { site: 'left atrium (inferior)' },
    highlights: { la: 'focus' },
  },
  {
    id: 'pac-blocked',
    group: 'atrial',
    findings: ['sinus-rhythm', 'pac-blocked'],
    patient: { sex: 'female', ageY: 66 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 72, hrv: 0.015 },
      // a very early P′ (on the T wave) meets a refractory AV node: no QRS, a pause
      ectopy: [{ kind: 'pac', pattern: 'single', couplingMs: 360, origins: ['high-ra'] }],
      activation: { kind: 'conducted' },
      junction: { avn: { ahMinMs: 80, ahExtMs: 60, tauMs: 70, erpMs: 430, jitter: 0, conceal: 0 } },
    },
    dials: {},
    variants: {
      bigeminy: {
        label: l('未下传房早二联律（貌似窦缓）', 'blocked atrial bigeminy (mimics sinus bradycardia)', 'bigeminismo auricular bloqueado (simula bradicardia sinusal)'),
        patch: { ectopy: [{ kind: 'pac', pattern: 'bigeminy', couplingMs: 360, origins: ['high-ra'] }] },
      },
    },
    highlights: { ra: 'focus', 'av-node': 'block' },
  },
  {
    id: 'pac-aberrant',
    group: 'atrial',
    findings: ['sinus-rhythm', 'pac', 'aberrant-conduction'],
    patient: { sex: 'male', ageY: 58 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 70, hrv: 0.01 },
      ectopy: [{ kind: 'pac', pattern: 'single', couplingMs: 440, origins: ['la-superior'] }],
      activation: { kind: 'conducted' },
      // the right bundle recovers last (longer ERP, lengthened by the preceding long cycle): an early PAC is
      // conducted with right bundle-branch block aberrancy (Ashman phenomenon)
      junction: { bundleErp: { rbbMs: 560, lbbMs: 330, slope: 0.35 } },
    },
    dials: {},
    highlights: { la: 'focus', rbb: 'block' },
  },
  {
    id: 'atrial-tachycardia',
    group: 'atrial',
    findings: ['atrial-tachycardia'],
    patient: { sex: 'female', ageY: 48 },
    source: {
      // focus at the left superior pulmonary vein (the commonest left-atrial site): P′ negative in I and aVL, positive
      // inferiorly and in V1 — clearly not sinus. 108/min with 1:1 conduction keeps the P′ off the preceding T (at
      // faster rates it lands on the T)
      rhythm: { kind: 'atrial-tachycardia', site: 'left-pv', rateBpm: 108 },
      activation: { kind: 'conducted' },
      junction: { avn: { ahMinMs: 55, ahExtMs: 40, tauMs: 70, erpMs: 230, jitter: 0, conceal: 0 } },
      repol: { qtcMs: 390 },
    },
    dials: {},
    variants: {
      block: {
        label: l('房速伴2:1房室传导', 'with 2:1 AV conduction', 'con conducción AV 2:1'),
        patch: { rhythm: { kind: 'atrial-tachycardia', site: 'left-pv', rateBpm: 180 }, junction: { avn: { ahMinMs: 70, ahExtMs: 50, tauMs: 70, erpMs: 420, jitter: 0, conceal: 0 } } },
      },
    },
    facts: { site: 'left superior pulmonary vein' },
    highlights: { la: 'focus' },
  },
  {
    id: 'mat',
    group: 'atrial',
    findings: ['mat'],
    patient: { sex: 'male', ageY: 74 },
    source: {
      // four foci with distinct P′ shapes: sinus (upright), left pulmonary vein (negative in I, aVL), low RA (negative
      // inferiorly), LA roof (tall, vertical) — the ≥ 3 morphologies a reader looks for
      rhythm: { kind: 'atrial-ectopic', sites: ['sinus', 'left-pv', 'low-ra', 'la-superior'], rateBpm: 116, mode: 'multifocal' },
      activation: { kind: 'conducted' },
    },
    dials: {},
    facts: { context: 'decompensated COPD' },
    highlights: { ra: 'focus', la: 'focus' },
  },
  {
    id: 'pjc',
    group: 'atrial',
    findings: ['sinus-rhythm', 'pjc'],
    patient: { sex: 'male', ageY: 49 },
    source: {
      rhythm: { kind: 'sinus', rateBpm: 70, hrv: 0.015 },
      ectopy: [{ kind: 'pjc', pattern: 'single', couplingMs: 560, origins: ['retrograde'] }],
      activation: { kind: 'conducted' },
      // the junctional impulse also crosses the node backwards: a retrograde P′ just after the QRS
      junction: { retrogradeVa: true },
    },
    dials: {},
    highlights: { 'av-node': 'focus' },
  },
  {
    id: 'junctional-escape-rhythm',
    group: 'atrial',
    findings: ['junctional-escape-rhythm'],
    patient: { sex: 'female', ageY: 70 },
    // retrograde P′ before the QRS (P′R ≈ 110 ms), in the QRS, or after it
    source: { rhythm: { kind: 'junctional', rateBpm: 46, retroLagMs: -112 }, activation: { kind: 'conducted' } },
    dials: { rate: { min: 40, max: 58 } },
    variants: {
      hidden: {
        label: l('逆行P′隐于QRS中', 'retrograde P′ hidden in the QRS', 'P′ retrógrada oculta en el QRS'),
        patch: { rhythm: { kind: 'junctional', rateBpm: 46, retroLagMs: 10 } },
      },
      after: {
        label: l('逆行P′在QRS之后', 'retrograde P′ after the QRS', 'P′ retrógrada tras el QRS'),
        patch: { rhythm: { kind: 'junctional', rateBpm: 46, retroLagMs: 120 } },
      },
    },
    highlights: { 'av-node': 'focus', 'sa-node': 'block' },
  },
  {
    id: 'accelerated-junctional-rhythm',
    group: 'atrial',
    findings: ['accelerated-junctional-rhythm'],
    patient: { sex: 'male', ageY: 62 },
    source: { rhythm: { kind: 'junctional', rateBpm: 82, retroLagMs: 120 }, activation: { kind: 'conducted' } },
    dials: { rate: { min: 65, max: 98 } },
    variants: {
      isorhythmic: {
        label: l('等频性房室分离', 'isorhythmic AV dissociation', 'disociación AV isorrítmica'),
        patch: { rhythm: { kind: 'sinus', rateBpm: 70, hrv: 0.03 }, junction: { escape: { level: 'junctional', rateBpm: 76 } } },
        findings: ['accelerated-junctional-rhythm', 'av-dissociation'],
      },
    },
    facts: { context: 'digoxin toxicity or after cardiac surgery' },
    highlights: { 'av-node': 'focus' },
  },
  {
    id: 'af-regularised',
    group: 'atrial',
    title: l('心房颤动伴完全性房室传导阻滞（规整化房颤）', 'Atrial fibrillation with complete AV block ("regularised" AF)', 'Fibrilación auricular con bloqueo AV completo (FA «regularizada»)'),
    findings: ['atrial-fibrillation', 'av-block-3'],
    patient: { sex: 'female', ageY: 81 },
    source: {
      // fibrillation waves, no wavelet crosses the blocked AV node; a junctional pacemaker escapes at a fixed rate:
      // regular, narrow, slow QRS with f waves — in AF a regular ventricular rhythm means AV block (or digoxin toxicity)
      rhythm: { kind: 'fibrillation', coarseness: 0.6, cycleMs: 150 },
      activation: { kind: 'conducted' },
      junction: { completeNodal: true, escape: { level: 'junctional', rateBpm: 44 } },
    },
    dials: {},
    facts: { escape: 'junctional 44/min (narrow QRS)', blockLevel: 'AV node', pitfall: 'a regular ventricular rhythm in AF: complete AV block or digoxin toxicity' },
    highlights: { 'av-node': 'block' },
  },
]);
