/**
 * Fascicular blocks (hemiblocks) of the left bundle: left anterior (LAFB) and left posterior (LPFB) fascicular block.
 *
 * Why blocking the fascicle terminal alone is not enough on this heart: the model's LV Purkinje layer is one continuous
 * sheet (3 m/s) seeded by the three fascicle terminals (LAF → mid anterior paraseptal wall, AHA 7; LSF → mid left
 * septum, AHA 8; LPF → apical inferior wall, AHA 15). A blocked terminal is simply re-fed by the sheet from the other
 * terminals within a few ms: the LPF site is reached from the LSF terminal ≈ 17 mm away in ≈ 6 ms, i.e. at the same time
 * as through the LPF itself (blocking the LPF terminal changes nothing: axis +21° vs +19°), and the LAF site in ≈ 9 ms
 * (axis −39°, short of LAFB). In the heart the peripheral Purkinje networks of the fascicles interconnect only sparsely,
 * and the blocked fascicle's territory is activated 10–20 ms late, largely through the working muscle (Rosenbaum
 * hemiblocks; Elizari et al., Circulation 2007;115:1154). Both scenarios therefore apply the same rule:
 *   1. the fascicle's terminal does not conduct (blockTerminals);
 *   2. the fascicle's own LV Purkinje territory is removed (purkinjeExcludeAha, LV endocardium only — the right septal
 *      surface keeps the RBB's Purkinje), so that territory is reached late, cell to cell, from the neighbouring
 *      territories (disease-spec "activated … through myocardium");
 *   3. muscle conduction in that territory ×0.8 — the small-HRA-heart compensation already used for the RV in RBBB and
 *      the LV in LBBB (QRS widths on this heart run ≈ 10 % short), giving the 10–20 ms territorial delay of the spec.
 * The apex (AHA 13, 16, 17) is fed by the distal network of all fascicles and keeps its Purkinje coverage in both.
 * Repolarization (APD map) is unchanged; ST-T follow the altered activation order. The normal heart is untouched.
 */
import { defineScenario } from '../define';

/** LAF territory: basal and mid anterior (1, 7) and anterolateral (6, 12) segments — anterolateral papillary muscle. */
const LAF_TERRITORY = [1, 6, 7, 12] as const;

/**
 * LPF territory: basal and mid inferoseptal (3, 9), inferior (4, 10) and inferolateral (5, 11) segments — the posterior
 * septum, the inferior wall and the posteromedial papillary muscle — and the apical inferior segment 15, where the HRA
 * heart's LPF ends. (The anteroseptal segments 2 / 8 belong to the septal fascicle, whose terminal is in segment 8.)
 */
const LPF_TERRITORY = [3, 4, 5, 9, 10, 11, 15] as const;

/**
 * Left anterior fascicular block: the anterosuperior fascicle does not conduct. The LV is activated first from the
 * septal and posterior fascicles — initial forces inferior and rightward (small q in I and aVL, small r in II, III, aVF)
 * — and the anterior/anterolateral wall last, 13–21 ms later than normal, reached through the muscle from below → late
 * dominant forces superior and leftward (qR in aVL with a late R peak, deep S in II, III, aVF; counter-clockwise frontal
 * loop). On the HRA heart: axis −55°, QRS 81 ms (NSR 78), R-peak time aVL 52 ms.
 */
export const LAFB = defineScenario({
  id: 'lafb',
  category: 'intraventricular-conduction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: {
    main: {
      id: 'lafb',
      blockTerminals: ['LAF'],
      purkinjeExcludeAha: LAF_TERRITORY,
      speed: [{ aha: LAF_TERRITORY, factor: 0.8 }],
    },
  },
  teach: { keyLeads: ['I', 'aVL', 'II', 'III', 'aVF'], highlight: ['LAF', 'LV_ANTERIOR', 'LV_LATERAL'] },
});

/**
 * Left posterior fascicular block: the posteroinferior fascicle does not conduct. The LV is activated first from the
 * anterior and septal fascicles — initial forces superior and leftward (small r in I and aVL, q in II, III, aVF) — and the
 * inferior wall and posterior septum last, reached through the muscle from the anterolateral side → late forces
 * inferior and rightward (qR in III and aVF with a late R peak, S in I and aVL; clockwise frontal loop).
 * On the HRA heart the axis moves from +19° to +69° (QRS 82 ms): the rightward shift of LPFB (≈ +50°, as when an
 * intermittent LPFB appears) but short of the adult criterion of +90°…+180°, and lead I keeps a net positive area —
 * this heart lies horizontally (normal axis +19°) and its large lateral LV wall dominates lead I. Even slowing the
 * inferior muscle to 0.4× (QRS 112 ms, not justified for an isolated LPFB) leaves the axis at ≈ +87°, so the territory
 * keeps the same mild ×0.8 as LAFB.
 */
export const LPFB = defineScenario({
  id: 'lpfb',
  category: 'intraventricular-conduction',
  rhythm: {},
  atrial: { main: { id: 'sinus' } },
  ventricular: {
    main: {
      id: 'lpfb',
      blockTerminals: ['LPF'],
      purkinjeExcludeAha: LPF_TERRITORY,
      speed: [{ aha: LPF_TERRITORY, factor: 0.8 }],
    },
  },
  teach: { keyLeads: ['I', 'aVL', 'III', 'aVF', 'II'], highlight: ['LPF', 'LV_INFERIOR', 'LV_POSTEROBASAL'] },
});
