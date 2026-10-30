# ECG synthesizer — architecture decision and production spec

Status: decided 2026-10-17 (bake-off `_proto/workflows/ecg-synth-bakeoff-wf_*.js`). Inputs: the three prototypes in
`_proto/regional` (A), `_proto/vcg` (B) and `_proto/field` (C), their review-fix reports, the blind per-condition
cardiologist scores, and the engineering judge. This file replaces the **[pending]** marker in `docs/PLAN.md` §7.
Nothing in `src/` may import from `_proto/`; the production engine is a port, not a copy.

---

## 0. Decision in ten lines

1. **Winner: Architecture B (parametric VCG kernels → Dower electrode potentials).** It is the core of the production
   engine: source representation, renderer, far-field lead system, ventricular-gradient T rule, rhythm clocks, truth
   from clinical kernel edges.
2. It is a **hybrid**: B's engine plus five grafts — A's region geometry, region activation graph and APD map (they
   drive territories, split-T timing and the 3D heart); A's position-dependent near field (electrode position becomes a
   parameter); C's BEM torso used **offline** to bake lead vectors for any chest position (V3R/V4R, V7–V9, misplaced
   and high electrodes); C's AV-node / refractoriness rules (Wenckebach, AF response, aberrancy, pre-excitation) in the
   rhythm scheduler; C's "axis on the ventricular-only source" and "unmeasurable truth fails" rules.
3. Three structural changes to B are made at port time, because the port re-calibrates everything anyway:
   **split T** (secondary T per QRS lobe + primary regional lobes; no more rank-1 T), **JT-anchored repolarisation**
   (QT = QRS + JT, so widening the QRS moves the T), and **every ventricular lobe carries a location** (region centroid)
   so the near-field term and electrode placement act on all of them.
4. A recording chain (noise, filters, gain, ADC, electrode placement/cables) is new and acts on the nine-plus electrode
   potentials before lead formation, never on a lead.
5. Budget per 10 s, 500 Hz, 12 + 5 lead ECG in the browser: median ≤ 6 ms (sinus family) / ≤ 15 ms (heaviest
   rhythms), p95 ≤ 25 ms (B measured 1.3–2.4 ms medians in its reviews, 3.0–5.4 ms on the judge's loaded machine).

---

## 1. Decision

### 1.1 What comes from where

| Part of the production engine | Source | How it is used |
|---|---|---|
| Kernel source model: `bump` / `plateau` shapes, clinical edges (2 % level, tangent-method T end), peakedness `q`, rotating direction `dir → dir2`, cumulative area | **B** `kernels.ts` | ported as is (strict TS, `as const` objects, `noUncheckedIndexedAccess`) |
| Renderer H(t) + per-electrode near-field sums, gain cache per (location, far) | **B** `synth.ts › render` | ported; cache becomes per-call (bounded) |
| Far-field lead system: forward Dower rows, WCT-gauge electrode vectors, Einthoven/Goldberger/Wilson assembly, limb-cable permutation | **B** `leads.ts` | ported; assembly is the only code that creates lead arrays |
| Near-field (proximity) term κ[(x_e − r)/\|x_e − r\|³ − far·x_e/\|x_e\|³] | **B** `leads.ts` + **A** `leadfield.ts` | generalised: electrode position `x_e` is a parameter (A's `buildLeadField(pos, swap)`), every ventricular lobe carries `loc` = weighted centroid of its regions, one global scale β (calibrated; β = 0 is pure Dower) |
| Lead vectors at non-standard electrode positions | **C** `torso.ts` (BEM, reciprocity) — **offline only** | `scripts/synth/bake-leadfield.ts` computes lead vectors on a chest/back surface grid, blended so the standard sites reproduce Dower exactly; shipped as a small constant table |
| Ventricular-gradient rule A_T = G − (1 − c)·A_QRS, coupling c | **B** `model.ts` | kept as the integral constraint; T is now *split* (B's own DESIGN §8.1 plan) |
| Regional APD map (apex→base, endo−epi, RV and lateral offsets, restitution) and phase-2 plateau slope | **A** `model.ts` (`NORMAL_VREP`), `membrane.ts` | timing of the primary and secondary T lobes, ΔG from regional APD changes, 3D repolarisation sequence |
| Region geometry (centroid, outward normal, wall mass) | **A** `geometry.ts` — baked offline onto the 31 `RegionId`s of `src/core/regions.ts` | territory → injury vector, necrosis (Q-wave) vector, near-field location; lobe `loc` |
| Region activation graph (faces + Purkinje exits with Durrer-type timing, block a branch = remove its exits) | **A** `conduction.ts`, reduced to the core regions | per-pattern region timing map → 3D state, split-T timing, fusion, generated lobe sets for ectopic / paced / pre-excited families, consistency test for authored lobes |
| Rhythm clocks: sinus with respiratory HRV, AF wavelet streams, flutter lobes with per-cycle atrial repolarisation (`taRatio`), VT with an independent sinus clock | **B** `synth.ts › schedule`, `fibrillation` | generalised into one event scheduler (§6.7) |
| AV junction: decremental AV node `AH = ahMin + ahExt·exp(−(R − ERP)/τ)`, ERP, concealment, jitter; accessory-pathway ERP; refractoriness/restitution for aberrancy | **C** `model.ts`, `engine.ts` (the rules, not the graph engine) | in the scheduler; made invertible for exact PR drills |
| Truth: model timing = clinical edges; QRS axis on the **ventricular-only** source; truth that cannot be measured fails the test instead of being skipped | **B** (edges) + **C** (axis rule, fail-not-skip) | §6.10 |
| Oracle delineator and textbook criteria | **B** `measure.ts`, `criteria.ts` + **A** `check.ts` additions (smooth-T, flutter sawtooth ≈ 2 extrema/cycle, V1–V3-predominant ST↓, R′ > r in V2) + **C** `check.ts` techniques (subtract the previous F cycle; QRS width on the signal-averaged beat) | moved to `tests/synth/oracle/` (never shipped) |
| Recording chain, extra leads, pacing stimulus, derived findings, L10n titles | new | §6.8–6.10 |

### 1.2 Why B

**Fidelity (blind cardiologist scores, 12 conditions, 0–10 each).** Totals: **B 86**, A 81, C 54.5. B is best in 7
conditions (RBBB 8, LBBB 8, LVH-strain 8, Brugada 8.5, flutter 8.5, hyperkalaemia 7.5, VT 7), A in 5 (normal 8,
anterior STEMI 7.5, inferior STEMI 7.5, WPW 6, AF 6.5), C in none. A and B are recognisable in 12/12, C in 10/12
(LVH-strain and flutter were not).

**Where B lost, the cause was authoring, not architecture.** Anterior STEMI: hyperacute T authored too large
(1.25–1.4 mV) with no ST segment and weak inferior reciprocity. WPW: one constant-slope delta lobe (no knee) and a
positive lateral delta. AF: wavelet amplitude allowed long flat stretches in the II strip. Normal: septal lobe too
superior (aVL Qr), anterior forces too strong (transition V2–V3), symmetric dome T with no ST segment. Each is a lobe
amplitude, direction or timing — fixable inside B (§12.2 lists every fix). A's remaining failures were structural and
survived its reviewer: M-notched LBBB and W-shaped QS, RBBB V2 r > R′, a 36 ms spike in VT V3, a far-field
reciprocal ST change in Brugada V6 — "architectural ceiling: 22 regions × 2 faces × 8 sweep bins" (A DESIGN §8).

**Engineering (judge, 0–10).** Controllability B 9 / A 6 / C 3; extensibility 7 / 7 / 6; performance 10 / 5 / 1;
simplicity 9 / 5 / 3; 3D support 5 / 8 / 6.

* Speed per 10 s 500 Hz 12-lead: B 1.3–2.4 ms median in its reviews, 3.0–5.4 ms warm medians with p90 ≤ 8.7 ms on
  the judge's loaded machine (AF/flutter slowest);
  A 24 ms quiet median but VT 125–306 ms, flutter 66–133 ms, plus 40–350 ms cold rebuild on any geometry change and an
  unbounded cache; C 0.53–2.2 s, Node-only (`node:fs`, `process.env`), ~2 s per new geometry.
* Truth vs signal: B PR ≤ 10, QRS ≤ 6, QT ≤ 11 ms, axis ≤ 2°; A QRS up to 16, QT up to 23 ms; C systematically biased
  (PR −11…−15 ms, QT up to +29 ms, axis up to −14°).
* Dials: B's are exact and orthogonal (PR 120–260 exact; HR 50–130 exact with QT following Fridericia; QRS ×1.2/1.4/1.6
  → 108/126/144 ms with the axis unchanged at 63.6°; T shift ±60/120 → QT exact). A's are coupled (conduction
  ×0.55: QRS 86→131 but axis 48→38°, QT 367→393). C's are steep and cost ~2 s per evaluation.
* 3D: A scored highest, but production already ships its own mesh (`src/heart3d`, HRA heart, keyed by
  `src/core/regions.ts`). What the 3D view needs from the engine is a per-region activation/repolarisation timeline;
  the hybrid gets it from A's region graph and APD map at negligible cost (§6.11), which removes B's 3D weakness
  ("all ventricular regions read 0.94 at QRS + 200 ms").

### 1.3 What is explicitly not taken

* A's runtime patch model (4 432 patches, sweep bins, closure-corrected weights): too slow for wide/re-entrant rhythms,
  coupled dials, loose truth. Its physiology is grafted as tables and rules.
* C's runtime engine (voxel graph, event-driven eikonal, BEM at runtime): 10–100× over budget, not browser-ready, biased
  truth, lowest fidelity. Its BEM is used offline; its AV-node and restitution rules are re-implemented as arithmetic.
* B's rank-1 T, its fixed electrode sites, its 13 coarse region tags, and its condition-level phenomenological knobs
  where a physiological parameter exists (see §11 for the ones that stay, documented).

---

## 2. Grafts in detail

### 2.1 From A (regional)

1. **Region geometry table.** `scripts/synth/bake-regions.ts` (dev-only, Node) builds A's procedural heart once and
   writes `src/synth/heart/regionGeom.gen.ts`: for each of the 31 core `RegionId`s the centroid (cm, Frank frame,
   origin = ventricular centroid), area-weighted outward epicardial normal, relative mass, wall thickness, and an
   adjacency list. Atrial and conduction-system ids get centroids only. A's 22 ventricular regions map onto the 17 AHA
   LV segments + 4 RV ids (`rv-outflow`, `rv-basal`, `rv-mid`, `rv-apical`); the mapping is a reviewed table in the
   bake script.
2. **Region activation graph.** A's fastest-route activation (faces, transmural / endocardial / epicardial edges,
   Purkinje exits per branch LSF/LAF/LPF/RBB with Durrer-type exit times, slow posterobasal LV and RVOT) is re-written
   on the 21 ventricular regions × {endo, epi} = 42 nodes, plus the conduction-system ids as branch roots. It runs at
   module init (microseconds) and gives, per activation pattern, each region's activation window `[t0, t1]` and
   transmural lag. Blocking a branch removes its exits; an ectopic
   origin, pacing lead or accessory-pathway insertion is an extra source.
3. **APD map.** A's normal map (apd0, apex→base gradient, LV endo − epi, RV offset, lateral offset, restitution
   exponent) assigns each region an APD per layer. Used for: the time at which each secondary-T lobe is centred, the
   primary-T lobes, ΔG from regional APD changes (§6.4), and the 3D recovery time of each region.
4. **Phase-2 plateau slope** (A review: plateau decline 0.25 per 200 ms gave the discordant J-point ST shifts in
   BBB). Re-expressed in B's terms as a small ST lobe ∝ −A_QRS of the early lobes (`repol.plateauSlope`).
5. **Position-dependent near field.** A's `ℓ_e(r) = D_e + κ[G(x_e − r) − G(x_e − r0)]` with `x_e` taken from the
   placement (cable → site), not from a fixed table.
6. **Serialization rule** (A review): when signals are written with rounding (fixtures, golden files), III, aVR, aVL,
   aVF are re-derived from the rounded I and II with `deriveLimbLeads` (already in `src/core/leads.ts`).

### 2.2 From C (field)

1. **Offline BEM lead vectors.** `scripts/synth/bake-leadfield.ts` imports C's torso BEM (homogeneous elliptic-cylinder
   torso, collocation, reciprocity) and computes the reciprocal lead vector at the ventricular centroid and at the atrial
   centroid for every point of a surface grid (anterior chest 2nd–6th ICS × lines from right mid-axillary to left
   mid-axillary, back to the left paravertebral line, limb-trunk junctions and Mason–Likar torso sites). Blending:
   a 3×3 least-squares map M takes BEM vectors to Dower vectors at the 9 standard electrodes, then the residual at
   those 9 sites is interpolated with a smooth radial basis (σ ≈ 4 cm), so the table reproduces Dower *exactly* at
   standard sites and varies smoothly elsewhere. Output: `src/synth/leads/leadTable.gen.ts` (~250 points × 2 × 3
   numbers). Verify against published extra rows if Dower's patent lists V3R–V5R / V7–V9 rows (§13).
2. **AV junction rules.** Decremental AV-node delay `AH = ahMin + ahExt·exp(−(R − ERP)/τ)` (R = time since the
   node's last exit), ERP with optional jitter, concealment of blocked impulses, retrograde concealment from ventricular
   beats; accessory pathway with conduction time and ERP; His–Purkinje all-or-none block for Mobitz II.
3. **Refractoriness and restitution.** Bundle-branch ERP that lengthens with the preceding cycle (Ashman), APD
   restitution `APD = APDmax(1 − A·exp(−DI/τ))` for premature beats, alternans and short–long sequences.
4. **Truth rules.** QRS axis from the ventricular source only (atrial activity, F/f waves and a P that runs into the
   QRS must not move it); truth that the oracle cannot measure is a test failure unless the scenario declares the
   interval not applicable.
5. **Oracle techniques.** Subtract the previous flutter cycle before reading the QRS; measure QRS width on the
   signal-averaged representative beat in irregular rhythms; read the axis from net deflections against the TP level.

---

## 3. Engine invariants (enforced by types and tests)

1. **One source.** Every ECG is one list of kernels (atrial, ventricular, injury, near-field, pacing stimulus) rendered
   into one heart vector H(t) plus near-field electrode terms. Kernels are produced only by morphology builders from a
   `SourceSpec`; no code path receives a lead name and a waveform.
2. **One lead system.** Electrode potentials Φ_e(t) for RA, LA, LL, RL and every chest electrode in use come from
   `L(x_e)·H(t) + near field`. Leads are formed only in `leads/assemble.ts`: I = Φ_LA − Φ_RA, II = Φ_LL − Φ_RA,
   III = Φ_LL − Φ_LA, aVR/aVL/aVF by Goldberger, Vk = Φ_Vk − (Φ_RA + Φ_LA + Φ_LL)/3 (Wilson). Extra leads V3R, V4R,
   V7–V9 are the same formula with their electrodes. Cable mix-ups permute which body site feeds which cable.
3. **Conditions change only:** rhythm/conduction events, activation pattern, substrate (mass, scar, slow regions),
   repolarisation (APD map, G, coupling, T shape, U), injury, near-field extras, geometry (orientation, position,
   mirror, torso transfer, per-beat swing), electrode placement, recording chain.
4. **Truth from the model.** Fiducials come from kernel edges and scheduler events; amplitude truths (ST at J+60,
   voltage criteria) are read from the clean, unfiltered, noise-free model signal at model fiducials. Every truth value
   must be re-measurable by the independent oracle within the gates of §8.
5. **Seeded.** All randomness from `createRng` (`src/core/rng.ts`) with named forks (`rng.fork('sinus')`,
   `fork('af')`, `fork('jitter')`, `fork('noise:emg:LA')`…), so adding a draw in one stream never shifts another.
   Same request → byte-identical arrays.
6. **Frame.** Frank axes: +X patient left, +Y inferior, +Z posterior; positions in cm, origin = ventricular centroid;
   kernel amplitudes in mV. `src/synth/frame.ts` holds the only conversions (to hexaxial angles, to the 3D view).

---

## 4. Module layout

```
src/synth/
  index.ts                public surface (re-exports api.ts types + generate, catalogue, dials); other modules import only this
  api.ts                  contract types: ScenarioDef, SynthRequest, SynthResult, DialId … (§5)
  frame.ts                Frank ↔ hexaxial ↔ 3D-view conversions, Vec3 helpers
  kernel/
    shapes.ts             bump / plateau / spike shapes, edges, tangent end, cdf, area (from B kernels.ts)
    kernel.ts             Kernel type, instantiation from LobeSpec/PlateauSpec, time shift, rotate, stretch
    render.ts             kernels → H(t) (Float64) + near-field electrode sums; bounded gain cache
  heart/
    regionGeom.gen.ts     baked region geometry (centroid, normal, mass, wall, adjacency)    [generated]
    territories.ts        coronary territories → RegionId sets (AHA 17-segment assignment + RV + variants)
    activation.ts         region activation graph (42 ventricular nodes), Purkinje exits, blocks, extra sources → RegionTiming
    apd.ts                regional APD map, restitution, ApdChange application
  morph/
    atrial.ts             P lobes from atrial site timing (generated) + authored sinus base, Ta, atrial injury
    ventricular.ts        VentricularMorph builder: activation lobes + substrate ops + repolarisation + injury + extras
    repol.ts              gradient rule, split T (secondary per lobe, primary regional), JT, T shape, U, alternans, memory
    injury.ts             injury plateau from territory/layer; necrosis lobes from scar
    nearfield.ts          Brugada dome loss, epsilon, J/Osborn wave, fragments
    frontsynth.ts         generated lobe sets: region timing + geometry → lobes (ectopic, paced, pre-excited, atrial sites)
    patterns/             authored, calibrated lobe sets: normal.ts rbbb.ts lbbb.ts lafb.ts lpfb.ts rbbb-lafb.ts
                          rbbb-lpfb.ts irbbb.ts ilbbb.ts rvh.ts (one file each, constants + provenance comment)
    compose.ts            composition precedence and validator (§6.3)
  rhythm/
    scheduler.ts          event model: atrial events → junction → ventricular events → beat instances
    clocks.ts             sinus (HRV, respiration, pauses, SA block), ectopic atrial, MAT/WAP, junctional, idioventricular
    junction.ts           AV node gate, His–Purkinje block, bundle refractoriness, accessory pathway, escape
    ectopy.ts             PAC/PJC/PVC insertion patterns (single, bigeminy, trigeminy, couplet, runs, multifocal)
    fibrillation.ts       AF wavelet streams; VF ventricular streams
    flutter.ts            flutter circuits (CCW, CW, LA) + per-cycle atrial repolarisation
    pacing.ts             pacemaker timing (AAI/VVI/DDD/BiV), sensing/capture faults, stimulus kernels
    rate.ts               JT rate law (Fridericia steady state + restitution for premature beats), RR history
  leads/
    electrodes.ts         electrode ids, standard sites (ICS, line), placement → positions
    leadTable.gen.ts      baked lead vectors on the surface grid (ventricular + atrial centroid)   [generated]
    leadfield.ts          L(x) lookup/interpolation, Dower rows at standard sites, κ, proximity gains
    assemble.ts           electrode potentials → 12 + extra leads (the only producer of LeadSignals)
  chain/
    noise.ts              wander, EMG, tremor, mains, electrode pop, motion, lead-off (per electrode, seeded)
    filters.ts            high-pass / low-pass / notch biquads (causal or zero-phase), pre-roll warm-up
    chain.ts              order of operations, gain, ADC quantisation and clipping
  truth/
    truth.ts              EcgTruth from beat instances + clean model signal
    findings.ts           declared + derived findings (thresholds from docs/curriculum/criteria.md)
    axis.ts               ventricular-only net-deflection and area axes, P and T axes, ambiguity flag
  regions3d/
    states.ts             RegionStates implementation (stateAt, highlights)
  dials/
    dials.ts              DialDef table (ranges, threshold bands, mapping, exactness class)
    solve.ts              analytic and 1-D root-find inverses (axis, P axis, PR, ST, T, voltage, conduction ratio)
    jitter.ts             natural per-instance variability (seeded)
  catalogue/
    index.ts              ScenarioDef registry, lookup by id / group / finding
    normal.ts rhythm-atrial.ts rhythm-svt.ts rhythm-ventricular.ts av-block.ts conduction.ts ischemia.ts
    chambers.ts repolarization.ts structural.ts pacing.ts technical.ts
src/i18n/synth.ts         scenario-variant labels only (titles default to FINDINGS[id].name)

scripts/synth/            dev-only Node tools, never imported by src/
  bake-regions.ts         A's procedural heart → regionGeom.gen.ts
  bake-leadfield.ts       C's BEM → leadTable.gen.ts
  envelopes.ts            PTB-XL+ 12SL features × PTB-XL labels → tests/synth/fixtures/ptbxl-envelopes.json
  calibrate.ts            coordinate search of a pattern's constants against criteria + envelopes
  gallery.ts              renders every scenario (PNG via the harness renderer) for human review
  bench.ts                timing per scenario (warm median / p95)

tests/synth/              mirrors src/synth (Vitest)
  kernel/ heart/ morph/ rhythm/ leads/ chain/ truth/ regions3d/ dials/ catalogue/
  oracle/                 independent delineator + criteria registry (imports nothing from src/synth except api.ts types)
  fixtures/               ptbxl-envelopes.json, golden hashes
```

Rules: `*.gen.ts` files are generated, committed, and carry a header naming the script, its inputs and the date;
`src/synth` has no Node-only API, no network, no `Math.random`; `tests/synth/oracle` must not import engine internals.

---

## 5. Types

Public types live in `src/synth/api.ts` and fill the shared contracts of `src/core` (`Ecg`, `EcgTruth`, `BeatMarks`,
`AtrialEvent`, `RegionStates`, `FindingId`, `RegionId`, `Lead`). No parallel truth type exists. All closed sets are
`as const` arrays (no enums).

```ts
// src/synth/api.ts — public contract
import type { Ecg } from '../core/ecg';
import type { FindingId } from '../core/findings';
import type { ExtraLead, Lead } from '../core/leads';
import type { L10n } from '../core/l10n';
import type { RegionId } from '../core/regions';
import type { Rng } from '../core/rng';

/** Frank frame: +X patient left, +Y inferior, +Z posterior. Positions in cm (origin = ventricular centroid). */
export type Vec3 = readonly [number, number, number];
export type RegionWeights = readonly (readonly [RegionId, number])[];

// ── sites and territories ────────────────────────────────────────────────────────────────────────────────────────
export const ATRIAL_SITES = ['sinus', 'high-ra', 'crista', 'ra-septal', 'low-ra', 'cs-ostium', 'la-superior',
  'la-inferior', 'left-pv', 'right-pv', 'retrograde'] as const;
export type AtrialSite = (typeof ATRIAL_SITES)[number];

export const VENT_ORIGINS = ['rvot-septal', 'rvot-free', 'rv-free-wall', 'rv-apex', 'lvot-cusp',
  'lv-basal-inferolateral', 'lv-lateral', 'lv-apex', 'lv-anterior-scar', 'lv-inferior-scar',
  'fascicular-posterior', 'fascicular-anterior', 'junctional'] as const;
export type VentOrigin = (typeof VENT_ORIGINS)[number];

export const PATHWAY_SITES = ['left-lateral', 'left-posterolateral', 'posteroseptal-left', 'posteroseptal-right',
  'right-free-wall', 'right-anteroseptal', 'midseptal'] as const;
export type PathwaySite = (typeof PATHWAY_SITES)[number];

export const PACING_SITES = ['ra-appendage', 'rv-apex', 'rv-septal', 'rvot', 'lv-lateral-epicardial', 'his',
  'lbb-area'] as const;
export type PacingSite = (typeof PACING_SITES)[number];

/** Coronary territories on the AHA 17-segment assignment (+ RV, apical ballooning and the global layers). */
export const TERRITORIES = ['lad-proximal', 'lad-mid', 'lad-distal', 'diagonal', 'lcx', 'om', 'rca-proximal',
  'rca-distal', 'pda', 'posterolateral', 'rv', 'apical', 'global'] as const;
export type Territory = (typeof TERRITORIES)[number];
export type Where = Territory | readonly RegionId[];

// ── authoring units ──────────────────────────────────────────────────────────────────────────────────────────────
/** One smooth lobe of the heart vector; times in ms relative to its anchor (P onset, QRS onset, cycle start). */
export interface LobeSpec {
  readonly label: string;
  readonly on: number;                       // 2 % level (what a reader sees as onset)
  readonly peak: number;
  readonly end: number;                      // 2 % level, or tangent-method end when endRule = 'tangent'
  readonly endRule?: 'edge' | 'tangent';
  readonly q?: number;                       // apex shape: 2 = smooth (default), < 2 = pointed
  readonly dir: Vec3;
  readonly dir2?: Vec3;                      // direction rotates dir → dir2 across the support
  readonly amp: number;                      // mV, spatial
  readonly regions: RegionWeights;
  readonly loc?: Vec3 | 'regions' | 'none';  // near-field location; ventricular default 'regions' (weighted centroid)
  readonly far?: number;                     // 1 = dipole + proximity correction (default), 0 = eccentric near field only
}
export interface PlateauSpec {
  readonly label: string;
  readonly on: number; readonly riseEnd: number; readonly fallStart: number; readonly end: number;
  readonly dir: Vec3; readonly amp: number; readonly regions: RegionWeights;
  readonly loc?: Vec3 | 'regions' | 'none'; readonly far?: number;
}

// ── ventricular source ───────────────────────────────────────────────────────────────────────────────────────────
export type BlockLevel = 'delay' | 'complete';
export interface Blocks { readonly rbb?: BlockLevel; readonly lbb?: BlockLevel; readonly laf?: BlockLevel; readonly lpf?: BlockLevel }

/** The native (supraventricular-conducted) pattern. Ectopic, escape, VT and paced beats take their pattern from
 *  RhythmSpec / EctopySpec (origin, pacing site); the scheduler picks the pattern per beat. */
export type ActivationSpec =
  | { readonly kind: 'conducted'; readonly blocks?: Blocks }
  | { readonly kind: 'preexcited'; readonly pathway: PathwaySite; readonly blocks?: Blocks }; // fraction per beat from the junction

export interface SubstrateSpec {
  readonly lvMass?: number;                  // 1 = normal; LVH 1.3–1.8
  readonly rvMass?: number;                  // RVH 1.5–3
  readonly septum?: number;                  // septal hypertrophy (HCM)
  readonly scar?: readonly { readonly where: Where; readonly transmurality: number; readonly fragmented?: boolean }[];
  readonly slow?: readonly { readonly where: Where; readonly delayMs: number }[];   // ARVC, peri-infarct block
  readonly conduction?: number;              // global conduction-time factor (hyper-K, Na-channel block, IVCD)
}

export interface ApdChange { readonly where: Where; readonly layer: 'epi' | 'endo' | 'transmural'; readonly deltaMs: number }
export interface RepolSpec {
  readonly qtcMs?: number;                   // Fridericia target at the base QRS; sets JT (QT = QRS + JT(RR))
  readonly apd?: readonly ApdChange[];       // regional APD changes → ΔG and primary T lobes
  readonly gScale?: number;                  // magnitude of the primary gradient (flat T, strain)
  readonly coupling?: number;                // electrotonic c ∈ [0, 1]
  readonly plateauSlope?: number;            // phase-2 decline → secondary ST shift at the J point
  readonly tShape?: { readonly q?: number; readonly riseFrac?: number; readonly stMs?: number; readonly widthMs?: number };
  readonly u?: { readonly ratio: number; readonly lagMs?: number };
  readonly split?: { readonly where: Where; readonly lagMs: number; readonly share: number };  // LQT2 / bifid T
  readonly alternans?: number;               // fraction of |G| alternating beat to beat
  readonly memory?: { readonly from: PacingSite | VentOrigin; readonly weight: number };  // cardiac memory
}
export interface InjurySpec {
  readonly where: Where;
  readonly layer: 'transmural' | 'epicardial' | 'subendocardial';   // epicardial = superficial (pericarditis)
  readonly stMv: number;                     // ST at J+60 in `ref` (solved, §7)
  readonly ref?: Lead;                       // default: facing lead with the largest deviation
}
export interface NearFieldSpec {
  readonly kind: 'brugada' | 'epsilon' | 'j-wave' | 'fragment';
  readonly where: Where;
  readonly amp: number;
  readonly shape?: 'coved' | 'saddleback';
  readonly lagMs?: number;
  readonly far?: number;
}

// ── atria ────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface AtrialSpec {
  readonly raScale?: number;                 // RA abnormality
  readonly laScale?: number;                 // LA abnormality
  readonly laDelayMs?: number;               // interatrial conduction delay
  readonly iab?: 'none' | 'partial' | 'advanced';   // advanced: LA activated caudo-cranially
  readonly injuryMv?: number;                // atrial injury current (PR-segment depression)
  readonly gain?: number;                    // P flattening (hyper-K)
}

// ── rhythm, ectopy, junction ─────────────────────────────────────────────────────────────────────────────────────
export type RhythmSpec =
  | { readonly kind: 'sinus'; readonly rateBpm: number; readonly hrv?: number;
      readonly pauses?: readonly { readonly afterBeat: number; readonly ms: number }[];
      readonly saBlock?: { readonly ratio: number; readonly type: 'I' | 'II' } }
  | { readonly kind: 'atrial-ectopic'; readonly sites: readonly AtrialSite[]; readonly rateBpm: number;
      readonly mode: 'fixed' | 'wandering' | 'multifocal' }
  | { readonly kind: 'atrial-tachycardia'; readonly site: AtrialSite; readonly rateBpm: number }
  | { readonly kind: 'flutter'; readonly circuit: 'ccw' | 'cw' | 'la'; readonly cycleMs: number }
  | { readonly kind: 'fibrillation'; readonly coarseness: number; readonly cycleMs: number }
  | { readonly kind: 'junctional'; readonly rateBpm: number; readonly retroLagMs: number | null }
  | { readonly kind: 'avnrt'; readonly rateBpm: number; readonly form: 'typical' | 'atypical' }
  | { readonly kind: 'avrt'; readonly rateBpm: number; readonly form: 'orthodromic' | 'antidromic' }
  | { readonly kind: 'ventricular'; readonly origin: VentOrigin; readonly rateBpm: number;
      readonly sinusBpm: number | null; readonly captures?: boolean }
  | { readonly kind: 'polymorphic'; readonly rateBpm: number; readonly twistBeats: number | null } // null = PMVT
  | { readonly kind: 'vf'; readonly coarseness: number }
  | { readonly kind: 'vflutter'; readonly rateBpm: number }
  | { readonly kind: 'asystole'; readonly atrialBpm: number | null }
  | { readonly kind: 'paced'; readonly mode: 'AAI' | 'VVI' | 'DDD';          // the mode drives timing,
      readonly ventricularSite: PacingSite | 'biv';                           // the site drives the paced pattern
      readonly lowerRateBpm: number; readonly avDelayMs: number; readonly underlying: RhythmSpec;
      readonly bipolar: boolean; readonly fault?: 'no-capture' | 'undersensing' | 'oversensing' };

interface EctopyTiming {
  readonly pattern: 'single' | 'bigeminy' | 'trigeminy' | 'couplet' | 'run' | 'random';
  readonly couplingMs: number;
  readonly probability?: number;            // 'random'
  readonly runLength?: number;              // 'run'
}
export type EctopySpec =
  | (EctopyTiming & { readonly kind: 'pac' | 'pjc'; readonly origins: readonly AtrialSite[] })
  | (EctopyTiming & { readonly kind: 'pvc'; readonly origins: readonly VentOrigin[] });

export interface JunctionSpec {
  readonly intraAtrialMs: number;           // P onset → AV-node entry (default 35)
  readonly avn: { readonly ahMinMs: number; readonly ahExtMs: number; readonly tauMs: number;
                  readonly erpMs: number; readonly jitter: number; readonly conceal: number };
  readonly hvMs: number;                    // default 45
  readonly infraHis?: { readonly pattern: 'mobitz2' | 'fixed-ratio' | 'complete'; readonly ratio?: number;
                        readonly probability?: number };
  readonly completeNodal?: boolean;
  readonly bundleErp?: { readonly rbbMs: number; readonly lbbMs: number; readonly slope: number }; // ERP = base + slope·(RRprev − 1000)
  readonly pathway?: { readonly site: PathwaySite; readonly conductionMs: number; readonly erpMs: number;
                       readonly antegrade: boolean; readonly retrograde: boolean };
  readonly escape?: { readonly level: 'junctional' | 'ventricular'; readonly rateBpm: number; readonly origin?: VentOrigin };
  readonly retrogradeVa?: boolean;          // VA conduction from ventricular beats
}

// ── geometry ─────────────────────────────────────────────────────────────────────────────────────────────────────
export interface GeometrySpec {
  readonly frontalDeg?: number;             // rotation about Frank Z (vertical ↔ horizontal heart)
  readonly transverseDeg?: number;          // rotation about Frank Y (clockwise / counter-clockwise rotation)
  readonly sagittalDeg?: number;            // rotation about Frank X
  readonly shiftCm?: Vec3;
  readonly mirror?: boolean;                // dextrocardia with situs inversus (X → −X for sources and atrial sites)
  readonly torsoGain?: number;              // effusion, obesity, emphysema: scales every lead vector
  readonly respiration?: { readonly rotDeg: number; readonly gain: number };   // with the sinus respiratory phase
  readonly swing?: { readonly rotDeg: number; readonly shiftCm: Vec3; readonly everyBeats: number };   // alternans
}

export interface SourceSpec {
  readonly rhythm: RhythmSpec;
  readonly ectopy?: readonly EctopySpec[];
  readonly junction?: Partial<JunctionSpec>;
  readonly atria?: AtrialSpec;
  readonly activation: ActivationSpec;
  readonly substrate?: SubstrateSpec;
  readonly repol?: RepolSpec;
  readonly injury?: readonly InjurySpec[];
  readonly nearField?: readonly NearFieldSpec[];
  readonly geometry?: GeometrySpec;
}

// ── recording chain ──────────────────────────────────────────────────────────────────────────────────────────────
export const CHEST_LINES = ['sternal', 'parasternal', 'midclavicular', 'anterior-axillary', 'mid-axillary',
  'posterior-axillary', 'scapular', 'paravertebral'] as const;
export interface ChestSite { readonly ics: number; readonly line: (typeof CHEST_LINES)[number]; readonly side: 'L' | 'R' }
export type LimbCable = 'RA' | 'LA' | 'LL' | 'RL';
export type ChestCable = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';

export interface PlacementSpec {
  readonly limbs?: Readonly<Partial<Record<LimbCable, LimbCable>>>;              // cable → limb it is clipped to
  readonly chest?: Readonly<Partial<Record<ChestCable, ChestCable | ChestSite>>>; // swap, or explicit site
  readonly limbsOnTorso?: boolean;                                               // Mason–Likar
}
export interface NoiseSpec {
  readonly wanderMv?: number;
  readonly emgMv?: number; readonly emgOn?: readonly LimbCable[];
  readonly tremor?: { readonly mv: number; readonly hz: number; readonly on: LimbCable };
  readonly mains?: { readonly mv: number; readonly hz: 50 | 60; readonly imbalance: number };
  readonly pop?: { readonly electrode: LimbCable | ChestCable; readonly tMs: number; readonly mv: number };
  readonly motion?: { readonly electrode: LimbCable | ChestCable; readonly tMs: number; readonly durMs: number; readonly mv: number };
  readonly leadOff?: LimbCable | ChestCable;
}
export interface FilterSpec { readonly highpassHz: number; readonly lowpassHz: number; readonly notchHz: 50 | 60 | null; readonly phase: 'causal' | 'zero' }
export const FILTER_PRESETS = {
  diagnostic: { highpassHz: 0.05, lowpassHz: 150, notchHz: null, phase: 'causal' },
  diagnosticLinear: { highpassHz: 0.67, lowpassHz: 150, notchHz: null, phase: 'zero' },
  monitor: { highpassHz: 0.5, lowpassHz: 40, notchHz: 50, phase: 'causal' },
} as const satisfies Record<string, FilterSpec>;
export interface RecordingSpec {
  readonly placement?: PlacementSpec;
  readonly noise?: NoiseSpec;
  readonly filter?: FilterSpec;
  readonly gain?: number;                                       // amplifier calibration error (1 = correct)
  readonly adc?: { readonly lsbUv: number; readonly rangeMv: number };
}

// ── scenarios, dials, requests ───────────────────────────────────────────────────────────────────────────────────
export const SCENARIO_GROUPS = ['normal', 'atrial', 'svt', 'ventricular', 'av-block', 'conduction', 'ischemia',
  'chambers', 'repolarization', 'structural', 'pacing', 'technical'] as const;
export type ScenarioGroup = (typeof SCENARIO_GROUPS)[number];

export const DIAL_IDS = ['rate', 'pr', 'qrs', 'qtc', 'axis', 'pAxis', 'st', 'tAmp', 'voltage', 'hrv',
  'conductionRatio', 'ventricularResponse', 'fCoarseness', 'stage', 'site', 'noise'] as const;
export type DialId = (typeof DIAL_IDS)[number];
export interface DialRange { readonly min: number; readonly max: number }
export const DIFFICULTIES = ['classic', 'subtle', 'noisy', 'borderline'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export type RegionHighlight = 'infarct' | 'ischemia' | 'pathway' | 'focus' | 'block' | 'hypertrophy';
export type DeepPartial<T> = { readonly [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface ScenarioDef {
  readonly id: string;
  readonly group: ScenarioGroup;
  readonly findings: readonly FindingId[];                  // declared by mechanism; derived ones are added at truth time
  readonly title?: L10n;                                    // default FINDINGS[findings[0]].name
  readonly patient?: { readonly sex: 'female' | 'male'; readonly ageY: number };
  readonly source: SourceSpec;
  readonly recording?: RecordingSpec;
  readonly dials: Readonly<Partial<Record<DialId, DialRange>>>;   // ranges narrowed to keep the scenario's identity
  readonly variants?: Readonly<Record<string, { readonly label: L10n; readonly patch: DeepPartial<SourceSpec>;
                                                 readonly findings?: readonly FindingId[] }>>;
  readonly facts?: Readonly<Record<string, string>>;
  readonly intervals?: 'measurable' | 'not-applicable';    // VF, PMVT/torsades, ventricular flutter, asystole
  readonly highlights?: Readonly<Partial<Record<RegionId, RegionHighlight>>>;
}

export interface SynthRequest {
  readonly scenario: string;
  readonly variant?: string;
  readonly seed: number;
  readonly dials?: Readonly<Partial<Record<DialId, number>>>;
  readonly difficulty?: Difficulty;                         // default 'classic'
  readonly jitter?: boolean;                                // natural variability, default true
  readonly durationS?: number;                              // default 10
  readonly fs?: 250 | 500 | 1000;                           // default 500
  readonly recording?: RecordingSpec;                       // lesson overrides (e.g. monitor filter on)
  readonly extraLeads?: readonly ExtraLead[];
  readonly withVcg?: boolean;                               // also return the true heart vector (figures)
}
export interface SynthResult {
  readonly ecg: Ecg;                                        // signal + EcgTruth + RegionStates; origin {synthetic, scenarioId, seed}
  readonly applied: Readonly<Partial<Record<DialId, number>>>;   // dial values actually realised (after solve)
  readonly axisAmbiguous: boolean;                          // net-deflection vs area axis differ > 15°, or indeterminate
  readonly vcg?: readonly [Float32Array, Float32Array, Float32Array];
}

export declare function generate(req: SynthRequest): SynthResult;
export declare function scenarios(filter?: { readonly group?: ScenarioGroup; readonly finding?: FindingId }): readonly ScenarioDef[];
export declare function drawDials(scenarioId: string, rng: Rng, difficulty: Difficulty): Readonly<Partial<Record<DialId, number>>>;
```

Internal types (not exported from `index.ts`):

```ts
export const WAVES = ['P', 'Ta', 'F', 'f', 'QRS', 'J', 'ST', 'T', 'U', 'stim', 'silent'] as const;
export interface Kernel {                 // instantiated lobe, absolute ms
  readonly shape: 'bump' | 'plateau' | 'impulse';
  readonly s0: number; readonly s1: number; readonly tp: number; readonly tq: number;
  readonly wl: number; readonly wr: number; readonly on: number; readonly end: number; readonly q: number;
  readonly dir: Vec3; readonly dir2: Vec3 | null; readonly amp: number;
  readonly loc: Vec3 | null; readonly far: number; readonly atrialField: boolean;
  readonly wave: (typeof WAVES)[number]; readonly beat: number;
}
export interface RegionTiming {           // per RegionId index (REGION_LIST order), ms relative to the beat's QRS onset
  readonly t0: Float32Array; readonly t1: Float32Array;    // activation window; NaN = not activated (blocked)
  readonly apdEndo: Float32Array; readonly apdEpi: Float32Array;
}
export interface BeatInstance {
  readonly index: number;
  readonly kind: BeatKind;                 // from src/core/ecg
  readonly qrsOn: number; readonly qrsOff: number; readonly j: number; readonly tPeak: number; readonly tOff: number;
  readonly uOff: number | null;
  readonly atrialEvent: number | null;     // index into the atrial event list
  readonly patternKey: string;             // cache key of the ventricular morphology
  readonly fraction: number;               // pre-excitation / fusion share (0 = fully normal)
  readonly aberrant: boolean;
  readonly rrPrevMs: number;
  readonly timing: RegionTiming;
}
```

---

## 6. Pipeline and algorithms

### 6.1 `generate()` step by step

1. **Resolve.** Scenario + variant patch + requested dials (`dials/solve.ts`, §7) + seeded jitter → one `SourceSpec`;
   `morph/compose.ts` validates it (ranges, supported combinations) and throws on violation.
2. **Schedule** (`rhythm/scheduler.ts`) from t = −2 s (pre-roll for clocks and filters) to the end + 0.5 s: atrial
   events → junction decisions → ventricular beats (`BeatInstance[]`) with their pattern key and region timing.
3. **Build morphologies** once per distinct pattern key (activation × substrate × repolarisation × injury × extras):
   QRS lobes, split-T lobes, U, ST, near-field lobes. Per beat: shift, rate-adapt the JT part, apply alternans / swing /
   respiration rotation.
4. **Render** all kernels into H(t) (3 × n, Float64) and the near-field sums for the electrodes in use.
5. **Electrode potentials** Φ_e = L(x_e)·H + near field (torso gain applied to both); atrial kernels use the
   atrial-centroid column of the lead table.
6. **Clean leads** (`leads/assemble.ts`) → **truth** (§6.10). The ventricular-only axis renders only the QRS kernels in
   the QRS windows for I and aVF (≈ 50 samples per beat).
7. **Recording chain** on the electrode potentials (§6.9) → assemble the delivered leads (pre-roll dropped).
8. **Region states** from the beat instances (§6.11). Return `SynthResult`.

### 6.2 Source model and near field

Kernel shapes, edges and areas are B's (`f = (1 − |u|^q)^3`, `on`/`end` at 2 %, tangent end at u = 0.7453 for q = 2,
smootherstep plateau). One new shape: `impulse` (pacing stimulus, §6.7), rendered area-preserving into one sample.

```
H(t)    = Σ_k far_k · amp_k f_k(t) d_k(t)
Φ_e(t)  = g·L(x_e)·H(t) + g·β·κ Σ_{k with loc} amp_k f_k(t) d_k(t) · [ (x_e − r_k)/|x_e − r_k|³ − far_k (x_e − r0)/|x_e − r0|³ ]
```

`g` = torso gain, κ = |L_V2|·|x_V2 − r0|² (B: 68.7 cm²), β global (calibrated, start 0.5; β = 0 is pure Dower).
Ventricular lobes default to `loc = 'regions'`, atrial kernels to the atrial centroid (B pass 2: one centroid fixed the
P that was taller in V3–V4 than in II; separate RA/LA locations are available for high-V1 placement but must be
re-calibrated, §11). Gains are cached per (location, far, electrode site) inside one call.

### 6.3 Activation patterns and composition

* **Authored base patterns** (`morph/patterns/`): normal, irbbb, rbbb, ilbbb, lbbb, lafb, lpfb, rbbb+lafb, rbbb+lpfb.
  Each is a calibrated `LobeSpec[]` tagged with core regions, plus the `RegionTiming` that the region graph produces
  with the same blocks. A test asserts that every lobe's window covers ≥ 70 % of its tagged regions' activation
  windows, so the lobes and the 3D timeline describe the same activation.
* **Generated families** (`morph/frontsynth.ts`) for everything with many sites: PVC/VT origins, pacing sites,
  accessory-pathway insertions, atrial sites. The region graph is run from the extra source; activation is binned
  (8 ms); the bin moment is Σ m_r · d_r over the regions activating in that bin, where d_r mixes the propagation
  direction (source → region centroid, tangential) and the wall normal (transmural crossing); consecutive bins are
  fitted to ≤ 8 bump lobes. One global scale per family is calibrated on two references (RV-apex pacing must look
  LBBB-like with a superior axis; an LV lateral PVC RBBB-like). The gradient rule then gives the secondary T.
* **Fusion** (pre-excitation, ventricular fusion, BiV pacing, capture/fusion in VT): per beat, each region is taken by
  whichever front reaches it first (min of the two region timings). Authored lobes keep their shape and are scaled by
  the share of their tagged mass still reached by their own front; the competing front's lobes are generated for the
  regions it captures. Cached by fraction quantised to 0.05.
* **Substrate operators:** LV mass scales amplitude (∝ mass) and duration (∝ mass^⅓) of LV free-wall lobes and moves
  them posterior; RV mass adds a late rightward-anterior RV lobe ∝ (rvMass − 1) and reduces LV dominance; septum
  scales the septal lobe (deep narrow q in HCM); scar adds necrosis lobes (§6.5); slow regions add small late
  near-field fragment lobes (epsilon, fQRS); `conduction` stretches all QRS lobe timings about QRS onset by the factor
  and scales amplitude by factor^−0.3 (calibrated so the QRS area changes realistically).
* **Composition precedence** (fixed order, each stage sees only the previous output): rhythm → junction (per-beat
  pattern: conducted / aberrant / pre-excited / fused / ectopic / paced) → activation pattern → substrate →
  conduction stretch → repolarisation → injury → near-field extras → geometry → placement → recording chain.
  The validator rejects combinations without a calibrated mechanism (listed in `compose.ts` with the reason).

### 6.4 Repolarisation: gradient rule with split T

Integral constraint (B; Wilson 1934, Burger 1957): total T area A_T = G − (1 − c)·A_QRS. The T is built from parts
whose areas sum exactly to A_T, so the gradient rule and the truth stay exact while the T loop gains width:

* **Secondary lobes**: for every QRS lobe k (area A_k, centre t_k, regions R_k) a T-shaped lobe of area
  −(1 − c)·A_k centred at t_k + APD(R_k), width = phase-3 width (≈ 70–90 ms) + lobe width, rise slower than fall.
  If all cells had the same APD, repolarisation would replay activation reversed and smeared by phase 3; this is that.
* **Primary lobe(s)** carry G (the APD-heterogeneity part): one authored T lobe for the normal gradient (timing from
  the JT, shape `tShape`), plus one lobe per `ApdChange` timed at the changed regions' repolarisation time.
* **ΔG from regional APD changes** (shorter APD pulls G toward a region, longer pushes it away):
  ΔG = −k_G Σ_r m_r ΔAPD_r ĉ_r − k_tm Σ_r m_r (ΔAPD_epi,r − ΔAPD_endo,r) n_r, with ĉ_r the unit vector from the
  ventricular centroid to region r, n_r its outward normal, m_r its mass (all from `regionGeom`), k_G and k_tm calibrated
  once. Epicardial shortening in the LAD territory → hyperacute T; epicardial prolongation → Wellens / post-MI T
  inversion; lateral endocardial prolongation → strain.
* **Truth T end**: the primary lobe's tangent-method end. Secondary and change lobes are clipped to end no later than
  the primary, so the composite's descending limb is the primary's; a test checks |tangent end of the composite in
  the reference lead − primary end| ≤ 8 ms for every scenario.
* **JT anchoring and rate.** T timings are relative to the QRS offset. QT = QRS + JT(RR); JT(RR) = QTc_F·(RR/1000)^⅓
  − QRS₀ (QRS₀ = the pattern's QRS before conduction stretch), so a wider QRS lengthens QT by the widening. RR is an
  exponentially weighted history (0.6 on the preceding RR); premature beats (diastolic interval < 300 ms) add C's
  restitution shortening.
* **Other parts:** U lobe (direction of the primary G, ratio, lag); coupling c (VT 0.7, documented as electrotonic
  modulation); plateau slope (small ST lobe ∝ −A of the early QRS lobes → discordant J-point shift in BBB/LVH); split
  primary (LQT2 bifid T: two primary populations, `split`); memory (G += w·A_QRS of the remembered pattern); alternans
  (|G|·(1 ± a) on alternate beats).

### 6.5 Injury and necrosis from territories

* **Injury vector** for a territory W: transmural → direction Σ_{r∈W} m_r n_r (toward the wall); epicardial
  (pericarditis) → the same direction with one near-field term per region, so the elevation is diffuse; subendocardial →
  the opposite (toward the cavity; for the whole LV this points to the base → ST elevation in aVR with diffuse
  depression). Plateau kernel from the last 30 % of the QRS to the T end (JT-anchored), `loc` = territory centroid
  (far = 1, so V1 sees a proximal-LAD septal injury more than the Dower rows alone would). Amplitude solved from `stMv`.
* **Necrosis (Q waves)**: each scar region r with transmurality τ adds a lobe −τ·k_N·m_r·n_r over r's activation
  window *in the beat's pattern*, i.e. the lost outward wall-crossing force. Q waves face the scar, R waves shrink,
  and old MI inside RBBB/LBBB/paced beats uses the right window automatically. `fragmented: true` adds small
  border-zone fragment lobes.
* **Infarct age** (dial `stage` 0…1): piecewise-linear course of ΔAPD_epi (−40 → 0 → +40 ms), injury amplitude
  (small → max → small → 0), necrosis τ (0 → 0.8): hyperacute → acute → evolving (Q + T↓) → old.

### 6.6 Atria

Sinus P = B's two lobes (RA then LA) with the atrial centroid and Ta (−0.45 × P area), re-calibrated. Other sites
(ectopic, retrograde, wandering, MAT) are generated by `frontsynth` on an internal 7-node atrial graph (A: sinus node,
RA lateral, CTI, low septum, Bachmann, LA anterior, LA posterior; reported to 3D as `ra` / `la`). RAE / LAE / IAB scale,
delay or redirect the two lobes (advanced IAB: LA lobe inferior → superior, biphasic inferior P). Atrial injury is a
plateau over the P–PR (PR depression). Flutter: B's CCW lobe circuit + per-cycle Ta; CW is the reversed loop; LA
flutter its own set. AF: B's wavelet streams with an amplitude floor (no 1 s window below 40 % of the range mean; the
judges saw flat stretches), ≥ 3 streams, cycle 120–200 ms with ≥ 20 % jitter, `coarseness` 0 (fine, < 0.5 mm) … 1
(coarse, > 1 mm), atrial-centroid lead field after re-tuning.

### 6.7 Rhythm scheduler

* **Atrial event generators** per rhythm kind (sinus with respiratory HRV and SA block/pauses; ectopic, wandering,
  multifocal; atrial tachycardia; flutter cycles; in AF the AV node is bombarded at the stream activation times).
* **Ectopy insertion:** PAC = premature atrial event at the coupling interval that resets the sinus clock; PJC = junction
  event with retrograde P′; PVC = ventricular event, sinus clock untouched (the sinus P meets a refractory junction →
  compensatory pause), optional VA conduction.
* **Junction** (C's rules): AV-node gate (refractory → block with optional concealment; else AH by the decremental
  law), His–Purkinje rule (Mobitz II / fixed ratio / complete), bundle refractoriness (a branch whose ERP exceeds the
  coupling interval blocks this beat → aberrant pattern), accessory pathway (antegrade arrival time and ERP → per-beat
  pre-excitation fraction; retrograde limb for AVRT), escape timer (junctional or ventricular, reset by any ventricular
  event).
* **Ventricular clocks:** idioventricular / VT focus with jitter; captures (an atrial event that reaches excitable
  tissue before the next focus beat conducts: narrow capture or fusion); polymorphic VT, torsades (direction rotating
  about a fixed axis with period `twistBeats`, amplitude modulated) and VF (ventricular wavelet streams) use renewal
  processes with no T rule; ventricular flutter is one rotating lobe per cycle.
* **Pacing:** timing cycles (lower rate interval, AV delay, ventricular and post-ventricular atrial refractory periods,
  sensing); the stimulus is a source: an `impulse` kernel at the lead-tip region (unipolar: dipole tip → can; bipolar:
  tip → ring, about 10× smaller surface spike), followed by the paced activation pattern. Faults: no capture (spike,
  no pattern), undersensing (spikes ignore native beats), oversensing (inhibition by chain EMG above threshold).
* **Re-entrant SVT:** AVNRT = a junction loop emitting a narrow ventricular beat and a retrograde P′ at QRS + 0…30 ms
  (typical) per cycle; orthodromic AVRT = retrograde P′ via the pathway at RP′ ≥ 70 ms; antidromic = fully pre-excited
  QRS with retrograde P′ via the node.
* Every process uses its own `rng.fork(name)`; every decision is recorded (beat kind, conducted-from, blocked-at) for
  truth, the laddergram figure and the 3D view.

### 6.8 Lead system and electrode placement

* Electrodes: RA, LA, LL, RL, V1–V6 always; V3R, V4R, V7, V8, V9 on request. A placement maps each cable to a body
  site; limb sites are the four limb–trunk junctions (Mason–Likar: four torso sites). Both legs are taken as
  equipotential (Φ_RL = Φ_LL), so a cable swap involving RL makes one lead nearly flat, the classic signature.
* `L(x)` comes from the baked table (§2.2): exact Dower vectors at the nine standard sites, smooth interpolation
  elsewhere, atrial-centroid column for atrial kernels. The near field (§6.2) uses the same site positions.
* Leads: Einthoven/Goldberger from the three cables RA, LA, LL; Wilson for every chest electrode. Cable swaps never
  touch the source; chest swaps and wrong ICS are site changes.
* Dextrocardia is a **source** mirror (geometry), not a placement: it is the contrast case for an RA/LA cable swap
  (chest leads normal in the swap, reversed R progression in dextrocardia). Right-sided chest leads in dextrocardia are
  ordinary sites.

### 6.9 Recording chain

Order, on electrode potentials (2 s pre-roll):

1. **Additive processes per electrode** (seeded): baseline wander (respiratory sinusoid 0.12–0.5 Hz with per-electrode
   phase + slow random walk; mostly chest electrodes), EMG (band-limited 20–150 Hz noise with burst envelope on chosen
   limb electrodes, so it shows only in the leads that use them, a teaching point), tremor (4–7 Hz quasi-periodic on
   one limb: the Parkinsonian "flutter" mimic), mains (common-mode 50/60 Hz × per-electrode contact imbalance; the
   differential part reaches the leads), electrode pop (step + exponential decay), motion artefact (large
   low-frequency transients on one electrode: the "VT" mimic), lead-off (one electrode floats: large noise +
   saturation).
2. **Amplifier gain** (calibration error; normally 1).
3. **Filters** (LTI, so they commute with lead formation and the identities survive): first-order or zero-phase
   high-pass, second-order Butterworth low-pass, optional notch; presets in `FILTER_PRESETS`. The monitor preset's
   causal 0.5 Hz high-pass visibly distorts the ST segment; lesson o10 uses exactly that.
4. **Assemble** leads, then **ADC** on the independently recorded channels (I, II, V1–V6, extras): quantisation (1 µV)
   and clipping (±range); III, aVR, aVL, aVF are derived from the quantised I and II as real recorders do, so the
   identities stay exact.

Truth is computed on the clean, unfiltered potentials and is never changed by the chain. Visible artefacts add the
technical findings (`baseline-wander`, `muscle-tremor`, `ac-interference`) when they exceed visibility thresholds.
Difficulty presets: `classic` = diagnostic filter only; `subtle` = wander 0.1 mV; `noisy` = wander 0.3 mV + EMG
0.03 mV + mains 0.02 mV; `borderline` = classic chain, dial values drawn near thresholds (§7).

### 6.10 Truth and annotations (`EcgTruth`)

| field | definition |
|---|---|
| `beats[]` | one `BeatMarks` per ventricular beat with qrsOn in [0, duration): `kind`; `pOn/pOff` of the conducting atrial event or the beat's own retrograde P′; `qrsOn` = first QRS lobe 2 % edge; `qrsOff` = last QRS lobe 2 % edge; `j` = qrsOff unless a J-wave lobe exists (then its end); `tPeak` = primary T peak; `tOff` = primary T tangent end; `uOff`; `aberrant` |
| `atrial[]` | every atrial event (sinus, ectopic, retrograde, flutter cycle, paced; AF as one `fibrillation` event per wavelet cluster) with `conductedTo`; `visible` = no overlap with any [qrsOn − 10, qrsOff + 10] and peak ≥ 0.05 mV in II or V1 on the clean signal |
| `rhythm` | scenario rhythm finding; sinus is re-labelled by rate: < 60 `sinus-bradycardia`, > 100 `sinus-tachycardia`, PP variation > 120 ms `sinus-arrhythmia` (criteria.md, rate-rhythm rows) |
| `regular` | from the schedule: all RR within ±5 % of the mean (sinus arrhythmia, AF, MAT, ectopy → false) |
| `hrBpm`, `atrialRateBpm` | 60000 / mean ventricular RR inside the strip; atrial rate from atrial events (AF → null) |
| `prMs` | median PR of conducted dominant beats; null without a consistent PR (AF, VT, complete block); Mobitz I → the post-pause PR (range in `facts.prRangeMs`) |
| `qrsMs`, `qtMs` | medians over dominant beats; `qtcBazettMs`, `qtcFridericiaMs` with the median preceding RR |
| `axisDeg.qrs` | net-deflection axis on the **ventricular-only** clean limb potentials: θ = atan2((2/√3)·net aVF, net I), net = largest positive + largest negative deflection in the QRS window. This is the method the curriculum teaches (criteria.md `axis-methods`). The area axis is also computed; `axisAmbiguous` when they differ by > 15° or all limb leads are isodiphasic |
| `axisDeg.p`, `axisDeg.t` | same formula on the atrial-only P window and the ventricular-only T window (area) |
| `stMv` | every lead (12 + extras), clean signal, J+60 ms of the dominant beat minus the PR-segment level (mean of qrsOn − 30…−10 ms) |
| `facts` | territory, culprit artery, pathway site, ectopic origin, pacing mode, stage, voltage criteria in mm (Sokolow–Lyon, Cornell, Peguero–Lo Presti), noise level, PR range |
| `findings` | declared ∪ derived, de-duplicated; derived from truth numbers with criteria.md thresholds and the patient's sex/age: rate class, `axis-normal` / `lad` / `rad` / `extreme-axis`, `av-block-1` (PR > 200), `short-pr` (< 120 without delta), `long-qt` / `short-qt` (QTc_F, sex-specific), `low-voltage`, `poor-r-progression`, visible artefacts |

Note for the port: B computed the axis as atan2(aVF, I) without the 2/√3 factor (up to ≈ 8° bias near ±45°); the
production formula above is the hexaxial one.

### 6.11 Region states for the 3D heart

`RegionStates.ids` = `REGION_LIST` order. For each region the beat instances give activation windows and APDs, so
`stateAt(t, out)` writes: 0 at rest; (0, 1) depolarising (smoothstep over [t0, t1]); 1 on the plateau; (1, 2)
repolarising (smoothstep over the phase-3 window centred at t0 + APD); 2 recovered until the region's next activation,
which restarts at 0. Conduction-system regions: `sa-node` before each sinus P; `av-node` from AV-node entry to His;
`his`, `rbb`, `lbb`, `laf`, `lpf`, `purkinje` over the HV interval per branch; a blocked branch stays 0 and carries the
`block` highlight. Atria follow atrial events (flutter/AF: per-stream phase). Highlights come from the scenario (scar →
`infarct`, injury → `ischemia`, pathway, focus, block, hypertrophy). Cost: per-region binary search over beats,
< 0.05 ms per frame for 31 regions.

---

## 7. Continuous drill variation with exact truth

**Rules.** (1) A dial maps to model parameters through one documented function; truth is always read from the
instantiated model, never echoed from the dial. (2) Each dial has an exactness class. (3) Natural jitter (seeded:
lobe amplitude ±8 %, timing ±3 ms, direction ±6°, P and T likewise) is applied before truth is computed, so two normals
are never identical and the answer key is still exact. (4) Dials are orthogonal except for the couplings listed.
(5) Derived findings are recomputed after the dials. (6) Each threshold has an exclusion band = max(oracle gate,
½ × grading tolerance): draws inside a band are rejected except in `borderline` difficulty, where the item's feedback
explains the borderline.

| dial | mechanism | exactness | couplings |
|---|---|---|---|
| `rate` | clock rate (sinus, focus, flutter conduction, pacing LRI) | forward: mean RR exact | JT follows the rate law (QT changes, QTc kept); PR follows the AV node unless `pr` is set |
| `pr` | AV node `ahMin` solved at the beat's RR: ahMin = PR − intraAtrial − HV − ahExt·exp(−(R − ERP)/τ) | analytic, exact per beat | none |
| `qrs` | conduction stretch k = target / base QRS about QRS onset | forward exact (edges scale) | QT grows by the same ms (JT anchored); axis unchanged (B measured 63.6° at ×1.2/1.4/1.6) |
| `qtc` | JT from QTc_F | forward exact | none |
| `axis` | rotate ventricular lobes, injury, near-field directions and G about Frank Z (a heart-orientation change) | solve: bisection on the ventricular-only net-deflection axis, evaluated on QRS windows of I and aVF only (µs per evaluation, no full render); residual ≤ 1° | precordial pattern changes physiologically; range limited to the scenario's identity (e.g. LAFB −85…−45°) |
| `pAxis` | rotate atrial lobes about Frank Z | solve, ≤ 2° | none |
| `st` | injury amplitude | affine in the amplitude → exact from two evaluations | T unchanged |
| `tAmp` | \|G\| scale (primary) | affine in the reference lead → exact | none |
| `voltage` | LV mass / torso gain | affine for the chosen criterion (e.g. Sokolow mm) | LV mass also lengthens QRS by mass^⅓ (reported) |
| `hrv` | sinus respiratory modulation depth | statistic: realised PP variation is the truth | none |
| `conductionRatio` | flutter/AT N:1, Mobitz ratio: AV-gate parameters searched by simulating 20 events | exact on the realised sequence | rate |
| `ventricularResponse` | AF: AV node ERP/τ/concealment | statistic: realised mean RR is the truth | none |
| `fCoarseness`, `stage`, `site`, `noise` | stream amplitude, infarct age / hyper-K stage, origin / pathway / territory variant, chain level | categorical or forward | site changes the answer set (facts) |

Solves that cannot reach the target inside the scenario's range reject the draw and redraw (bounded, seeded). The
`applied` field reports realised values; graders use truth, not the request.

**Difficulty ladder:** `classic` (effect sizes in the middle of the range, clean chain), `subtle` (effect sizes near the
lower bound but outside exclusion bands, e.g. ST 1–1.5 mm), `noisy` (classic dials + noise preset), `borderline`
(values inside the bands, only for items whose feedback teaches the threshold).

---

## 8. Calibration and oracle test plan

All tests are Vitest in `tests/synth/` (mirroring `src/synth`) and run in `npm test`; the oracle in
`tests/synth/oracle/` is independent of the engine (it imports only `api.ts` types and `src/core`).

### 8.1 Oracle delineator

Port of B's `measure.ts` (QRS energy detection, slope-minimum P→delta guard, tangent T end, per-lead features: P±, q,
R, S, R′, R-peak time, J, ST60, T±, T asymmetry/FWHM, morphology label) + A's and C's additions (notch/extrema count,
sawtooth extrema per cycle, previous-F-cycle subtraction, signal-averaged beat for irregular rhythms, net deflections vs
TP level). **The oracle itself is validated on real data**: on the 300 curated PTB-XL records shipped in
`src/data/real/` it must agree with the 12SL reference measurements in `ptbxl-meta.json` (median |Δ| ≤ 10 ms for PR,
QRS, QT; ≤ 10° for the axis). A delineator that cannot read real ECGs is not allowed to grade synthetic ones.

### 8.2 Test tiers

| tier | what | gate |
|---|---|---|
| T0 unit | shapes (2 % edges, tangent end analytic, cdf monotone), vectors, frame conversions, rng streams independent, lead table exact at standard sites (≤ 1e-9) and smooth (≤ 5 % change per cm) | exact |
| T1 lead system | every scenario × 3 seeds: \|III − (II − I)\|, \|aVR + (I + II)/2\|, \|aVL − (I − II/2)\|, \|aVF − (II − I/2)\| ≤ 1e-6 mV; Wilson by construction (unit test on assembly); every limb-cable permutation equals its algebraic expectation; RL swaps give a flat lead (< 0.05 mV p2p); chest swaps exchange traces exactly; Mason–Likar changes only limb leads; filtering electrodes ≡ filtering leads (≤ 1e-6) | hard |
| T2 truth vs signal (clean) | oracle vs truth for every scenario × 5 seeds: HR ±2 bpm, PR ±10 ms, QRS ±8 ms, QT ±15 ms, QRS axis ±5° (P ±10°, T ±10°), per-beat qrsOn ±8 ms for ≥ 95 % of beats, beat count exact, visible atrial event count exact, stMv ±0.03 mV. Truth the oracle cannot measure **fails** unless the scenario declares `intervals: 'not-applicable'` | hard (gates ≤ ½ of the practice tolerances: intervals ±20, QT ±30, axis ±20°) |
| T3 textbook criteria | per scenario, the hallmark criteria of §9 measured on the clean signal at 10 mm/mV, thresholds from `docs/curriculum/criteria.md` ("current value" column), plus the generic sanity set below | hard |
| T4 realism envelopes | `scripts/synth/envelopes.ts` turns PTB-XL+ `12sl_features.csv` + PTB-XL labels into per-class 5th–95th percentiles (R/S/Q/T/P amplitudes and durations per lead, ST amplitudes, intervals, axes) for classes with ≥ 30 records (NORM, CRBBB, IRBBB, CLBBB, LAFB, LVH, IMI, AMI, 1AVB, AFIB, AFLT, WPW if enough …). At default dials and 5 seeds, ≥ 90 % of a scenario's features lie inside its class envelope; outliers are listed | ratchet (the threshold only goes up) |
| T5 dial sweeps | each scenario × each applicable dial at {min, mid, max} + 10 seeded draws: T1–T3 pass; forward dials realise the request within 1 ms / 1 bpm, solves within their residual; changing one dial moves other truths only by the declared couplings | hard |
| T6 noise robustness | `noisy` difficulty × 20 seeds: truth unchanged; oracle within HR ±3, PR/QRS ±15, QT ±20 ms, axis ±10°, hallmark criteria pass in ≥ 90 % of seeds (the tracing stays readable) | hard |
| T7 determinism | same request twice → byte-identical arrays; golden hash per scenario (seed 1, rounded with A's serialization rule) in `tests/synth/fixtures/`; a change needs an explicit snapshot update and a regenerated review gallery | hard |
| T8 region states | values in [0, 2]; monotone within a beat; ventricles ≈ 1 at qrsOff + 10 ms and ≈ 2 at tOff + 60 ms; blocked branches stay 0; `sa-node` precedes `ra`; highlights match the scenario | hard |
| T9 performance | bench per scenario (warm median, p95) vs §10; CI asserts a ×5 margin only (machines vary ×2) | soft |
| T10 human review | `scripts/synth/gallery.ts` renders every scenario, with a real PTB-XL case of the same class beside it, for cardiologist review; sign-off per scenario recorded in a review log; a scenario without sign-off is not used in exams | process |

**Generic sanity criteria** (every scenario, unless it declares the opposite; they encode the judges' recurring
complaints): no slope-reversal pair < 10 ms apart with > 0.05 mV excursion outside declared notches (spikes,
fragmentation); no sample-to-sample jump > 0.5 mV except pacing stimuli; QT dispersion between adjacent leads ≤ 25 ms;
TP level within ±0.05 mV of the PR level; T/R < 1 in V5–V6; at least one limb lead with QRS ≥ 0.5 mV p2p; P present
and sinus-shaped when the rhythm is sinus; an ST segment exists (T 2 % onset ≥ 60 ms after J at rates < 100); a normal
T is asymmetric (rise/fall duration ratio ≥ 1.2).

### 8.3 Calibration procedure

1. **Normal base first**, against the PTB-XL+ NORM envelope medians (per-lead amplitudes, intervals, axes) and the
   normal criteria: coordinate search (`scripts/synth/calibrate.ts`) over lobe amplitudes, directions and timings, G
   and T shape, P lobes, β. The result is committed as constants with a provenance comment. Every other pattern
   inherits it, so a change to the normal base re-runs T1–T5 on the whole catalogue (CI does).
2. **Authored patterns** (RBBB, LBBB, LAFB, LPFB, combinations, iRBBB, iLBBB) against their criteria and class
   envelopes, holding the normal base fixed.
3. **Generated families**: one scale per family against two references (§6.3), then per-site criteria (delta/QRS
   polarity tables, origin features).
4. **Global coefficients** k_G, k_tm (ΔG), k_N (necrosis), injury scale, near-field β: fitted on hyperacute T,
   Wellens, strain, old MI and STEMI criteria together.
5. Any knob that exists for one condition only must be named after its physiology, have a range and appear in §11.

---

## 9. Condition catalogue

Mechanism codes: **R** rhythm clocks / ectopy · **J** junction (AV node, His–Purkinje, bundle refractoriness,
pathway, escape) · **A** authored activation pattern · **Ag** generated pattern (`frontsynth`) · **S** substrate (mass,
scar, slow regions, conduction stretch) · **Rp** repolarisation (split T, ΔG/ApdChange, JT, T shape, U, coupling,
memory) · **In** injury · **Nc** necrosis · **N** near-field extra · **At** atrial morphology / atrial injury ·
**Geo** geometry · **Pl** electrode placement / cables / extra leads · **Ch** recording chain · **St** pacing stimulus.
Every scenario also inherits the generic sanity criteria (§8.2). `secondary-st-t` is declared for every pattern whose
T follows the gradient rule with an abnormal activation (BBB, WPW, ventricular, paced). Thresholds in the criteria
column are the ones the oracle checks; the authoritative values come from `docs/curriculum/criteria.md`.

A catalogue test asserts that every `FindingId` in `src/core/findings.ts` is produced by at least one scenario.

### 9.1 Normal and normal variants (`normal`)

| id | findings | mechanism | hallmark criteria (oracle) |
|---|---|---|---|
| normal | normal-ecg, sinus-rhythm | A normal, R sinus | rate 60–100; PR 120–200; QRS < 110; QRS axis −30…+90 (default +30…+75); P axis 0…+75; septal q in I/aVL/V5/V6 < 25 % of R and < 40 ms; rS in V1 (r < S); R grows V1→V4/V5, transition V3–V4; T upright I, II, aVF, V2–V6, inverted aVR; \|J\| < 0.1 mV; SV1 + RV5 < 35 mm; NORM envelope |
| sinus-bradycardia | sinus-bradycardia | R sinus 35–59 | rate < 60; every QRS preceded by a sinus P at constant PR |
| sinus-tachycardia | sinus-tachycardia | R sinus 101–170, JT rate law | rate > 100; sinus P (upright II); QTc normal; P `visible` flag false when buried in the T |
| sinus-arrhythmia | sinus-arrhythmia | R respiratory HRV + Geo respiration | PP max − min > 120 ms; P morphology constant |
| early-repolarization | early-repolarization | N j-wave (inferolateral) + low global epicardial In + Rp tall T | J notch/slur ≥ 0.1 mV in ≥ 2 contiguous inferior or lateral leads; concave ST↑ ≤ 0.2 mV; no reciprocal ST↓ except aVR |
| juvenile-t | juvenile-t | Rp ApdChange (RV / anteroseptal epi +) | T↓ V1–V3, upright V4–V6; ST isoelectric |
| athlete | athlete-changes | R brady + S lvMass + N j-wave + A irbbb (+ J PR > 200 variant) | rate < 60; voltage LVH without strain; iRBBB; early repolarisation |
| irbbb | irbbb | A irbbb | rsr′ in V1, QRS 100–119; terminal slurred S in I and V6 |

### 9.2 Sinus node and atrial rhythms (`atrial`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| sinus-pause | sinus-pause | R pause (optional junctional escape) | pause ≥ 2 s not a multiple of PP (±10 %); same P before and after |
| sa-exit-block | sa-exit-block | R saBlock type II (ratio) / type I | type II: pause = 2 × PP ± 20 ms; type I: PP shortening then pause < 2 PP |
| sinus-node-dysfunction | sinus-node-dysfunction | R AT/AF burst → overdrive-suppression pause → escape → sinus | tachycardia run, then pause ≥ 2 s, then escape or sinus |
| ectopic-atrial-rhythm | ectopic-atrial-rhythm | R atrial-ectopic fixed + At generated (variants low-ra, cs-ostium, la-*) | rate < 100; P axis outside 0…+75 (low RA: negative P in II, III, aVF); PR ≥ 120 |
| wandering-atrial-pacemaker | wandering-atrial-pacemaker | R wandering, ≥ 3 sites | ≥ 3 P morphologies (oracle clusters P features); rate < 100 |
| pac | pac | R sinus + ectopy pac + J | premature P′ of different shape; non-compensatory pause; QRS as in sinus beats |
| pac-blocked | pac-blocked | ectopy pac with coupling < AV-node ERP | P′ deforms the T; no QRS follows; pause |
| pac-aberrant | pac, aberrant-conduction | J bundle ERP (long–short, Ashman) | premature P′; that beat QRS ≥ 120 with RBBB morphology; next beats narrow |
| atrial-tachycardia | atrial-tachycardia | R AT (site) + J 1:1 / 2:1 | atrial rate 150–250; isoelectric baseline between P′; P′ axis by site |
| mat | mat | R multifocal, irregular | ≥ 3 P morphologies; rate > 100; irregular PP and PR |
| pjc | pjc | ectopy pjc + retrograde P′ | premature narrow QRS; P′ negative in II/III/aVF within 120 ms of the QRS, or none |
| junctional-escape-rhythm | junctional-escape-rhythm | R junctional 40–60 (variants: P′ before / hidden / after) | rate 40–60; narrow QRS; no sinus P before the QRS, or retrograde P′ with PR < 120 |
| accelerated-junctional-rhythm | accelerated-junctional-rhythm | R junctional 61–100 (isorhythmic dissociation variant) | rate 61–100; narrow; P′ retrograde or dissociated |

### 9.3 Supraventricular tachycardias, flutter, fibrillation, pre-excitation (`svt`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| atrial-fibrillation | atrial-fibrillation | R fibrillation (coarseness) + J AV-node bombardment with concealment (ventricularResponse slow / controlled / rapid) | RR CV > 10 % with no repeating pattern; no consistent PR; f waves 0.3–2 mm p2p in V1 at 120–200 ms cycles, present in every 1 s window of II and V1, larger in V1/inferior than in I; narrow QRS; AFIB envelope |
| atrial-flutter | atrial-flutter | R flutter ccw (variants cw, la) + J N:1 / variable | atrial cycle 180–250 ms; inferior sawtooth negative (down/up ≥ 1.3, ≈ 2 extrema per cycle, no isoelectric stretch ≥ 40 ms); discrete positive F in V1 (ccw); ventricular rate = atrial / N ± 2 bpm; F-train mean ≤ 0.1 mm |
| avnrt | avnrt, svt | R avnrt typical / atypical | regular 140–220, narrow; no P before the QRS; pseudo-r′ in V1 / pseudo-S in II, III, aVF absent in the same heart's sinus beat; RP′ < 70 ms |
| avrt | avrt, svt | R avrt orthodromic (antidromic variant) + J pathway | orthodromic: regular 150–240, narrow, retrograde P′ in the ST with 70 ms ≤ RP′ < P′R; antidromic: wide, fully pre-excited |
| preexcited-af | atrial-fibrillation, wpw | R fibrillation + J pathway with short ERP (per-beat fraction) | irregular; shortest RR < 250 ms; ≥ 3 distinct QRS widths; delta in pre-excited beats |
| wpw | wpw, short-pr | Ag preexcited (7 sites) + J pathway | PR < 120; delta = slow initial 30–50 ms (initial slope index < 0.32) in ≥ 6 leads, then a steeper QRS; QRS ≥ 110; secondary ST-T opposite to the delta; per-site polarity table (left lateral: delta negative/isoelectric in I, aVL, V5–V6, dominant R in V1; posteroseptal: negative delta in II, III, aVF; right free wall: LBBB-like, left axis) |
| short-pr | short-pr | J small ahMin, no pathway | PR < 120; normal initial QRS slope; QRS < 110 |

### 9.4 Ventricular ectopy and rhythms (`ventricular`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| pvc | pvc | ectopy pvc + Ag (13 origins) + Rp secondary (coupling 0.3) | premature QRS ≥ 120 without a premature P; compensatory pause (pre + post = 2 PP ± 20 ms); T opposite to the main QRS deflection; origin table (RVOT: LBBB-like, inferior axis, transition ≥ V3; LV lateral: RBBB-like; fascicular: RBBB-like with LAD or RAD, QRS 110–140) |
| ventricular-bigeminy | ventricular-bigeminy, pvc | ectopy bigeminy | every second beat a PVC for ≥ 4 cycles |
| pvc-patterns | pvc, ventricular-couplet | ectopy trigeminy / couplet / multifocal (variants) | pattern counts; multifocal: ≥ 2 PVC morphologies |
| aivr | aivr, av-dissociation | R ventricular focus 60–110 competing with sinus | wide, regular 60–110; fusion beats of intermediate shape at the transitions |
| ventricular-escape-rhythm | ventricular-escape-rhythm, av-block-3 | J complete block + ventricular escape 20–40 | wide, regular 20–40; P waves marching through |
| vt-monomorphic | vt-monomorphic, av-dissociation | R ventricular (origins) + Ag + Rp coupling 0.7 + independent sinus (captures variant) | regular 120–250 (RR CV < 3 %); QRS ≥ 140; QRS p2p > \|T\| in II, V1, V6; origin hallmarks (LV inferolateral: dominant R in V1, superior axis, rS/QS in V6; RVOT: LBBB-like, inferior axis); ≥ 1 visible dissociated P per strip in the `teaching` variant (rate ≤ 160); captures narrow and early |
| vt-polymorphic | vt-polymorphic | R polymorphic (direction/origin random walk) | 150–300/min; consecutive-beat QRS correlation < 0.8; normal QT in preceding sinus beats; intervals n/a |
| torsades | torsades, long-qt | R polymorphic twist + Rp long QT baseline + short–long initiation | QTc ≥ 500 in preceding sinus beats; short–long–short onset; amplitude envelope modulated with a 5–20-beat period; 160–250/min |
| ventricular-flutter | ventricular-flutter | R vflutter (one rotating lobe per cycle) | sinusoidal 250–350/min; no isoelectric segment; QRS and T indistinguishable |
| ventricular-fibrillation | ventricular-fibrillation | R vf ventricular streams (coarseness) | < 3 organised complexes detected; dominant frequency 4–8 Hz; fine < 0.2 mV / coarse > 0.3 mV |
| asystole | asystole | R asystole (P-wave asystole variant) | no QRS in 10 s; \|signal\| < 0.05 mV apart from wander; P waves in the variant |

### 9.5 AV conduction (`av-block`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| av-block-1 | av-block-1 | J ahMin solved | PR > 200, constant ± 10 ms, every P conducted |
| av-block-2-mobitz1 | av-block-2-mobitz1 | J decremental gate solved for 3:2…6:5 | PR lengthens within each group (largest increment after the first beat) until a P is blocked; post-pause PR shortest; RR shortens before the pause; pause < 2 PP |
| av-block-2-mobitz2 | av-block-2-mobitz2 | J infraHis mobitz2 + A rbbb(+lafb) or lbbb | constant PR (± 5 ms) before and after the blocked P; pause = 2 PP ± 20 ms; QRS ≥ 120 by default |
| av-block-2-2to1 | av-block-2-2to1 | J ratio 2 (variants nodal narrow / infra-His wide) | every second P blocked; constant PR; atrial rate = 2 × ventricular |
| av-block-high-grade | av-block-high-grade | J ratio 3–4 + escape | ≥ 2 consecutive blocked P; conducted beats at constant PR |
| av-block-3 | av-block-3, av-dissociation | J complete (nodal or infra-His) + escape (junctional 40–60 narrow / ventricular 20–40 wide) | PP and RR each regular and independent (PR SD > 40 ms, no conducted beat); atrial rate > ventricular |
| av-dissociation | av-dissociation | R slowed sinus + accelerated junctional (isorhythmic) | P–QRS relation drifts; ventricular rate ≥ atrial rate |

### 9.6 Intraventricular conduction (`conduction`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| rbbb | rbbb, secondary-st-t | A rbbb | QRS ≥ 120; rsR′ in V1 with R′ > r (also V2 unless RSr′); R-peak time V1 > 50 ms; wide slurred S (≥ 40 ms) in I, V6 and aVL; T↓ ≤ −1 mm in V1–V2; axis −30…+90; CRBBB envelope |
| lbbb | lbbb, secondary-st-t | A lbbb | QRS ≥ 120 (default 140–160); no q in I, V5, V6; broad notched/slurred R in I, aVL, V5, V6; R-peak time V5–V6 > 60 ms; QS/rS in V1–V3 with r < 0.3 mV; discordant ST-T (V1–V3 ST↑ + T↑; I, aVL, V5, V6 ST↓ + T↓); axis −45…+60; CLBBB envelope |
| ilbbb | ilbbb | A ilbbb | QRS 110–119; no septal q in I, V5, V6; R-peak time V5–V6 > 60 ms |
| lafb | lafb | A lafb | axis −45…−90; qR in aVL with R-peak time ≥ 45 ms; rS in II, III, aVF; QRS < 120; LAFB envelope |
| lpfb | lpfb | A lpfb | axis +90…+180; rS in I and aVL; qR in III and aVF; QRS < 120 |
| bifascicular-block | bifascicular-block, rbbb, lafb (lpfb variant) | A rbbb+lafb / rbbb+lpfb | RBBB criteria + LAFB (or LPFB) axis criteria |
| trifascicular-block | trifascicular-block, bifascicular-block, av-block-1 | A rbbb+lafb + J PR > 200 | bifascicular criteria + PR > 200 (naming per criteria.md) |
| ivcd | ivcd | A normal or LVH + S conduction stretch | QRS ≥ 110 without RBBB or LBBB criteria |
| rate-dependent-bbb | aberrant-conduction, rbbb or lbbb | J bundle ERP vs rate (alternating-BBB variant) | BBB pattern only in beats with RR below the threshold, or alternating RBBB/LBBB beats |

### 9.7 Ischaemia and infarction (`ischemia`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| stemi-anterior | stemi-anterior, reciprocal-changes | In lad-proximal (incl. diagonal, basal anteroseptum) + Rp ΔG epi | J-point ST↑ ≥ 0.2 mV in V2–V3 (sex/age thresholds from criteria.md), ≥ 0.1 mV in V1–V4, I, aVL; reciprocal ST↓ in III and aVF; QRS < 110 |
| stemi-anteroseptal | stemi-anteroseptal | In lad-mid (after D1) | ST↑ V1–V3(V4); no ST↑ in I/aVL |
| stemi-anterolateral | stemi-anterolateral | In lad + diagonal + lateral | ST↑ V3–V6, I, aVL |
| stemi-high-lateral | stemi-high-lateral | In diagonal / om | ST↑ ≥ 0.1 mV in I and aVL (± V2); reciprocal ST↓ III > aVF |
| stemi-lateral | stemi-lateral | In lcx / om | ST↑ ≥ 0.1 mV in V5–V6, I, aVL |
| stemi-inferior | stemi-inferior, reciprocal-changes | In rca-proximal / rca-distal / lcx (variants) | ST↑ ≥ 0.1 mV in II, III, aVF; RCA: III > II and aVL the deepest limb-lead ST↓; LCx: II ≥ III, ST↑ V5–V6, little aVL ST↓; posterior extension: ST↓ V1–V3 |
| rv-infarction | rv-infarction, stemi-inferior | In rca-proximal + rv; Pl V3R, V4R | ST↑ ≥ 0.1 mV in V4R; ST↑ V1 with less ST↑ (or ST↓) in V2; inferior criteria |
| stemi-posterior | stemi-posterior | In posterolateral; Pl V7–V9; Nc with `stage` | horizontal ST↓ ≥ 0.05 mV in V1–V3 with upright T; ST↑ ≥ 0.05 mV in V7–V9; R/S in V2 > 1 at later stages |
| hyperacute-t | hyperacute-t | Rp ΔG epi shortening (lad) + small In | broad-based T in V2–V4 with T/QRS ratio > 0.75 in ≥ 2 leads; ST↑ < 0.1 mV |
| de-winter | de-winter | In subendocardial anterior + Rp strong anterior ΔG | upsloping J-point ST↓ 0.1–0.3 mV in V1–V6 into tall symmetric T; ST↑ 0.05–0.1 mV in aVR; no precordial ST↑ |
| wellens | wellens | Rp ApdChange epi + (lad), late primary lobe (split T); variants A (biphasic) / B (deep) | V2–V3 T biphasic with terminal negativity ≥ 0.1 mV (A) or symmetric T↓ ≥ 0.2 mV (B); ST < 0.1 mV; R preserved, no Q in V2–V3 |
| avr-elevation-diffuse-std | avr-elevation-diffuse-std, st-depression-ischemic | In global subendocardial (left-main variant) | ST↓ ≥ 0.1 mV in ≥ 6 leads incl. I, II, V4–V6; ST↑ ≥ 0.1 mV in aVR (≥ V1 in the left-main variant) |
| st-depression-ischemic | st-depression-ischemic | In subendocardial regional | horizontal or downsloping ST↓ ≥ 0.05 mV in ≥ 2 contiguous leads; no ST↑ except aVR |
| t-inversion-ischemic | t-inversion-ischemic | Rp ApdChange epi prolongation (territory) | symmetric T↓ ≥ 0.1 mV in ≥ 2 contiguous leads with R/S > 1 |
| stemi-evolution | stemi-* by territory, pathological-q | In + Nc + Rp along `stage` | per stage: hyperacute T → ST↑ → Q (≥ 40 ms or ≥ 25 % of R) with T↓ → old (Q, ST ≈ 0) |
| old-mi | old-mi-anterior / old-mi-inferior / old-mi-lateral, pathological-q | Nc territory (fragmented option) | Q ≥ 40 ms (or ≥ 0.1 mV and ≥ 25 % of R) in ≥ 2 contiguous territory leads; QS V1–V3 (anterior); ST within ± 0.05 mV |
| lv-aneurysm | lv-aneurysm, old-mi-anterior | Nc anterior (τ 1) + small chronic In | QS V1–V4 with persistent ST↑ 0.1–0.3 mV; Σ T / Σ QRS amplitude in V1–V4 < 0.36 |
| sgarbossa | sgarbossa-positive, lbbb | A lbbb + In territory | LBBB criteria + concordant ST↑ ≥ 0.1 mV in a positive-QRS lead, or ST↓ ≥ 0.1 mV in V1–V3, or discordant ST↑ with ST/S ≤ −0.25 (Smith) |
| takotsubo | takotsubo | In apical (acute) → Rp ApdChange apical epi + long QT (late), along `stage` | acute: ST↑ V2–V5 and II without reciprocal ST↓ except aVR; late: deep T↓ V2–V6, QTc > 470 |

### 9.8 Chambers and voltage (`chambers`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| lae | lae | At laScale / laDelay | P ≥ 120 ms, notched in II (peaks ≥ 40 ms apart); P-terminal force in V1 ≥ 0.04 mm·s |
| rae | rae | At raScale + rightward P axis | P in II ≥ 0.25 mV; initial P in V1/V2 ≥ 0.15 mV; P < 120 ms; P axis > +75 |
| biatrial-abnormality | biatrial-abnormality | At both | both sets |
| interatrial-block | interatrial-block | At iab partial / advanced | P ≥ 120; advanced: biphasic (+/−) P in II, III, aVF |
| lvh | lvh | S lvMass | Sokolow–Lyon ≥ 35 mm or Cornell > 28 / 20 mm (sex); no strain; QRS < 110 |
| lvh-strain | lvh-strain | S lvMass + Rp ApdChange lateral endo + plateau slope | voltage criteria; QRS 100–115; R-peak time V5–V6 > 50 ms; downsloping ST↓ + asymmetric T↓ (rise/fall ≥ 1.3) in I, aVL, V5, V6; axis −30…+30; LVH envelope |
| rvh | rvh | S rvMass + Rp ApdChange RV (strain variant) + At rae option | R/S in V1 > 1 (R ≥ 0.7 mV); axis > +90; deep S in V5–V6; T↓ V1–V3 (strain) |
| biventricular-hypertrophy | biventricular-hypertrophy | S lvMass + rvMass | LVH voltage + right axis or tall R in V1; large biphasic V2–V4 (R + S ≥ 6 mV) |
| low-voltage | low-voltage | Geo torsoGain (variants effusion, obesity, emphysema) | all limb-lead QRS < 0.5 mV p2p, or all chest leads < 1.0 mV |
| electrical-alternans | electrical-alternans, pericardial-effusion | Geo swing every beat + torsoGain + R tachy | QRS amplitude alternates ≥ 10 % beat to beat in ≥ 3 leads; low voltage; rate > 100 |
| poor-r-progression | poor-r-progression | Geo clockwise transverse rotation (variant: Nc anteroseptal) | R in V3 ≤ 0.3 mV; R not increasing V1→V3; no Q ≥ 40 ms in the rotation variant |
| dextrocardia | dextrocardia | Geo mirror (with atrial situs) | P, QRS and T negative in I; aVR upright; R decreasing V1→V6; contrast test against the LA/RA reversal of the same heart |
| copd-pattern | copd-pattern | Geo vertical, lower heart, torsoGain + At rae + small rvMass | axis > +90 or indeterminate; low limb-lead voltage; P in II ≥ 0.25 mV; small R V1–V3, late transition |

### 9.9 Repolarisation, electrolytes, drugs, temperature (`repolarization`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| hyperkalemia | hyperkalemia, peaked-t | `stage` 1–3: Rp tShape q 1.3–1.6, narrower T, larger G; At gain ↓; J PR ↑; S conduction ↑ (stage ≥ 2); stage 3 sine wave | stage 1: T ≥ 1.0 mV in V2–V4, symmetric (0.8 < asym < 1.25), FWHM < 110 ms, smooth (no notch), QTc normal/short; stage 2: + P in II < 0.1 mV, PR 185–240, QRS 100–130; stage 3: QRS > 160 merging into T, no P (intervals n/a) |
| hypokalemia | hypokalemia, u-waves | Rp gScale ↓, U ratio ↑, plateau slope | T ≤ 0.1 mV in ≥ 4 leads; U ≥ 0.1 mV and > T in V2–V3; ST↓ ≈ 0.05 mV |
| hypercalcemia | hypercalcemia | Rp short JT (ST ≈ 0), normal T | QTc_F < 360; T onset within 20 ms of J |
| hypocalcemia | hypocalcemia, long-qt | Rp long ST (`stMs`), normal T width | QTc_F > 460; T on→end < 200 ms; long isoelectric ST |
| digoxin-effect | digoxin-effect | Rp scooped plateau slope + short JT + low T; J PR mildly ↑ | curved ST↓ ("reverse tick") in leads with tall R; QTc < 400; low T |
| long-qt | long-qt | Rp variants lqt1 (broad T), lqt2 (`split`, bifid low T), lqt3 (long ST + late narrow T), drug (lqt2-like) | QTc_F above the sex-specific limit of criteria.md; variant shape criteria (T on→end > 200 ms; bifid notch in ≥ 2 leads; ST ≥ 150 ms) |
| short-qt | short-qt | Rp short JT + tall narrow T | QTc ≤ 340; tall peaked T |
| na-channel-blockade | na-channel-blockade, sinus-tachycardia | S conduction ↑ + terminal rightward lobe + R tachy | QRS > 100 (> 120 variant); terminal R in aVR ≥ 0.3 mV with R/S > 0.7; terminal 40 ms axis > +120 |
| hypothermia | hypothermia, osborn-waves | N j-wave (LV epicardial, amplitude ∝ cooling) + R brady + Rp long QT + Ch tremor (shivering variant) | J (Osborn) wave ≥ 0.1 mV in II, V3–V6; rate < 60; long QTc |
| cerebral-t | cerebral-t, long-qt | Rp large reversed ΔG (global epi prolongation) + U | giant T↓ ≥ 0.5 mV in ≥ 4 precordial leads; QTc ≥ 500 |
| cardiac-memory | nonspecific-st-t (+ proposed `cardiac-memory`) | Rp memory (from rv-apex pacing) | T↓ where the paced QRS was negative (inferior, V1–V4) with a normal sinus QRS |
| nonspecific-st-t | nonspecific-st-t | Rp lateral gScale ↓ | T < 0.1 mV in I, aVL, V5–V6 without ST↓ ≥ 0.05 mV |

### 9.10 Structural, channelopathies, systemic (`structural`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| brugada-type1 | brugada-type1 | N brugada coved (RVOT epicardium, far 0) | coved J ≥ 0.2 mV in V1–V2 descending into a symmetric negative T; no reciprocal ST↓ (all leads > −0.05 mV); V3 J < 0.15 mV; other leads normal |
| brugada-type2 | brugada-type2 | N brugada saddleback; `high-leads` variant (Pl V1/V2 at 2nd ICS) | saddleback: J ≥ 0.2 mV, ST trough ≥ 0.05 mV, positive/biphasic T; the high-lead variant meets the type-1 criteria |
| hcm | hcm, lvh | S septum ↑ + lvMass (+ strain variant) | deep narrow Q (≥ 0.3 mV, < 40 ms) in I, aVL, V5–V6 or II, III, aVF; LVH voltage |
| apical-hcm | apical-hcm | S apical lvMass + Rp ApdChange apical epi + | giant T↓ ≥ 1.0 mV in V3–V5; tall R in V4–V5 |
| arvc | arvc, epsilon-wave | S slow RV (40–80 ms) → N epsilon + Rp ApdChange RV | low-amplitude deflection after the QRS end in V1–V3; terminal activation duration ≥ 55 ms in V1–V3; T↓ V1–V3 without RBBB |
| pericarditis | pericarditis | In global epicardial + At injury (PR↓) + R tachy; `stage` I–IV | stage I: concave ST↑ ≥ 0.1 mV in ≥ 6 leads, ST↓ in aVR (and V1); PR↓ ≥ 0.05 mV in II with PR↑ in aVR; no other reciprocal ST↓; ST/T ratio in V6 > 0.25 |
| pericardial-effusion | pericardial-effusion, low-voltage | Geo torsoGain + swing + R tachy | low voltage + tachycardia (± alternans) |
| pulmonary-embolism | pulmonary-embolism, sinus-tachycardia | R tachy + S RV dilation (terminal rightward lobe, initial q in III) + Rp ApdChange RV epi + A irbbb/rbbb variants | rate > 100; S in I ≥ 0.15 mV, Q in III ≥ 0.1 mV, T↓ in III; T↓ V1–V3(V4); rightward axis shift |

### 9.11 Pacing (`pacing`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| paced-aai | paced-rhythm | St ra-appendage + generated P + conducted QRS | spike before each P at the lower rate; normal QRS |
| paced-vvi | paced-rhythm, secondary-st-t | St rv-apex (variants rv-septal, rvot) + Ag paced | spike before a QRS ≥ 140, LBBB-like, superior axis (rv-apex); discordant T; rate = lower rate |
| paced-ddd | paced-rhythm | St atrial + ventricular, AV delay, sinus tracking | atrial and ventricular spikes; AV interval = programmed ± 2 ms |
| paced-biv | paced-rhythm | St biv (rv + lv-lateral fronts fused) | dominant R or QR in V1, negative I (variant); QRS narrower than VVI of the same heart |
| pacing-failure-capture | pacing-failure-capture, paced-rhythm | St without the paced pattern on some beats | spikes not followed by a QRS at the expected time |
| pacing-undersensing | pacing-undersensing | St at fixed rate ignoring native beats | spikes inside native QRS/T windows |
| pacing-oversensing | pacing-oversensing | St inhibited by Ch EMG bursts | pause > lower-rate interval coinciding with an EMG burst |

### 9.12 Technical (`technical`)

| id | findings | mechanism | hallmark criteria |
|---|---|---|---|
| electrode-reversal-la-ra | electrode-reversal-la-ra | Pl limb cables | I inverted (P, QRS, T); aVR ↔ aVL; II ↔ III; aVF and chest leads unchanged |
| electrode-reversal-la-ll | electrode-reversal-la-ll | Pl | I ↔ II; III inverted; aVL ↔ aVF; aVR unchanged |
| electrode-reversal-ra-ll | electrode-reversal-ra-ll | Pl | II inverted; I ↔ −III; aVR ↔ aVF; aVL unchanged |
| neutral-cable-reversal | (proposed `electrode-reversal-rl`) | Pl with RL | one limb lead flat (< 0.05 mV p2p) |
| precordial-misplacement | precordial-misplacement | Pl chest swap (V1↔V2 …) and high V1–V2 (2nd/3rd ICS) variants | swap: non-monotonic R progression with exact trace exchange; high V1–V2: rSr′, negative P and T↓ in V1–V2 |
| limbs-on-torso | (fact only) | Pl Mason–Likar | axis shifts rightward and inferior R grows vs the standard placement of the same heart |
| baseline-wander | baseline-wander | Ch wander | low-frequency excursion ≥ 0.2 mV; truth unchanged |
| muscle-tremor | muscle-tremor | Ch EMG on chosen limbs (Parkinsonian 4–7 Hz "pseudo-flutter" variant) | high-frequency noise only in the leads that use the chosen electrodes; pseudo-flutter: 4–7 Hz oscillation with regular sinus QRS |
| ac-interference | ac-interference | Ch mains with contact imbalance | spectral peak at 50/60 Hz ≥ 0.02 mV p2p |
| motion-artefact | (proposed `motion-artefact`) | Ch motion ("pseudo-VT") | large transients mimicking wide complexes while the native narrow QRS continues on the sinus RR |
| filter-distortion | (lesson only) | Ch monitor vs diagnostic preset | ST level differs ≥ 0.05 mV between presets for the same STEMI heart; diagnostic preset = truth |

Count: 125 scenario ids (≈ 80 distinct mechanisms plus variants and contrast cases), covering every `FindingId`.
Proposed taxonomy additions (integrator-owned `src/core/findings.ts`): `electrode-reversal-rl`, `motion-artefact`,
`cardiac-memory`, `indeterminate-axis`, `ventricular-trigeminy`.

---

## 10. Performance budget

Measured baseline (B, Node 24, 10 s, 500 Hz, 12 leads): median 1.3 ms (quiet) – 2.4 ms (busy) in B's reviews;
3.0–5.4 ms warm medians, p90 ≤ 8.7 ms in the engineering judge's run at ~46 % background load; AF/flutter slowest.
Cost ≈ Σ kernels × support samples × 3 + electrodes × n. The additions (split T ≈ 5 extra lobes per beat, near field
on all ventricular lobes, 15 electrodes, two lead assemblies, chain) are estimated at 2–3× the baseline.

| item | budget (browser main thread, mid-range laptop) |
|---|---|
| `generate`, sinus-family scenario, 10 s, 500 Hz, 12 leads, clean chain | median ≤ 6 ms, p95 ≤ 15 ms |
| worst scenarios (AF, VF, flutter, torsades, pre-excited AF) + 5 extra leads + `noisy` chain | median ≤ 15 ms, p95 ≤ 25 ms |
| 60 s monitor strip | ≤ 60 ms (or 10 s chunks with scheduler state carried over) |
| module init (registry, lead table, region graph for the base patterns, lazy per pattern) | ≤ 30 ms |
| dial solves per item (axis, P axis, PR, ST, T, voltage) | ≤ 2 ms |
| `stateAt` (31 regions) | ≤ 0.05 ms per frame |
| 50-item exam set | ≤ 1 s total; drills pre-generate the next item during feedback (idle callback) |
| memory | ≤ 400 KB per ECG (17 × 5000 × 4 B + truth); gain cache per call; morphology cache LRU ≤ 64 entries; no unbounded caches |
| bundle | `src/synth` ≤ 120 KB minified + generated tables ≤ 30 KB (within the 8 MB single-file budget) |

If a budget is missed: shape lookup tables per q, skip zero-weight near-field terms, render only the electrodes in
use, and move exam pre-generation into a Web Worker. Lowering fs is not allowed (it changes what is measurable).

---

## 11. Known-hard conditions and planned mechanism

| condition / feature | why it is hard | planned mechanism | acceptance (oracle) | fallback |
|---|---|---|---|---|
| Wellens A, LQT2 bifid T, hypo-K T–U, biphasic transition-lead T, LBBB V4/V5 (B: "V4 rS and V5 T↓ cannot both hold") | rank-1 T (one direction per beat) | split T (§6.4): secondary lobes per QRS lobe + primary lobes per ApdChange / `split`; note the split never changes a lead's *net* T area, so LBBB V4/V5 still needs the right A_QRS | criteria of §9; T dispersion ≤ 25 ms | an extra primary lobe with region tags (still one source) |
| VT with visible AV dissociation, capture and fusion beats | at 170/min, QRS 160 and QT 310 there is no free baseline (B, A) | independent sinus clock (exists); `teaching` variant at ≤ 160/min with coupling 0.7 shortening the JT so P waves land on the TQ; captures via the junction rule; fusion via the region-timing blend | ≥ 1 visible P per strip; `atrial[].visible` matches the oracle | lesson text points to the P on the laddergram (truth carries every P) |
| Polymorphic VT, torsades, VF, ventricular flutter | no stable QRS/T, no interval truth | renewal processes on ventricular lobes; torsades = direction rotating about a fixed axis + amplitude envelope; VF streams 4–8 Hz | spectral and morphology-change criteria; intervals declared n/a; cardiologist review | none needed for grading (rhythm label only) |
| AF realism | B's f waves were smooth and intermittent; A's too small | ≥ 3 streams, amplitude floor per 1 s window, ≥ 20 % cycle jitter, coarseness dial, atrial-centroid lead field re-tuned so V1/inferior dominate | f present in every 1 s window of II and V1; V1 ≥ 1.5 × lead I; dominant frequency 5–8 Hz | per-stream location (RA vs LA) |
| Flutter variants (2:1 hiding F waves, CW, LA flutter) | F superimposed on QRS/T; other circuits | lobe circuits per form; per-cycle Ta; ratio from the AV gate | atrial cycle and polarity criteria per form; 2:1 variant: F detectable after subtracting the averaged QRST | none |
| WPW delta knee, site localisation, pre-excited AF | B's one-slope delta had no knee; site tables | generated pathway front fused with the authored normal pattern per region (min arrival); delta lobe low and slow (40–60 ms) before the steep main lobes | initial-slope index, knee present (slope ratio ≥ 2), per-site polarity table | authored delta lobes per site |
| Brugada type 1/2 and the high-lead manoeuvre | depends on κ, electrode positions and a near-field source | RVOT epicardial source with far = 0 (B) + position-dependent near field; placement variants | type-1/2 criteria at standard and 2nd-ICS sites; no reciprocal ST↓ | tune source depth and β jointly |
| Fragmentation family: epsilon, fQRS, Osborn/J waves, notched LBBB R | smooth lobes cannot notch | small late near-field lobes at the slow/scar/epicardial regions (`slow`, `fragmented`, `j-wave`) | declared notches present; generic smoothness test passes elsewhere | — |
| Right-sided and posterior leads; chest misplacement | fixed Dower rows | offline BEM lead table (C) blended to Dower | V4R/V7–V9 criteria in RV and posterior MI; misplacement criteria | published extra rows if they exist (§13) |
| Hyperkalaemia continuum to the sine wave | the tent is a shape exponent, not a mechanism | accepted and named: `tShape.q` = phase-3 steepening (the physiology of hyper-K), with narrower T width; stage map; stage 3 merges QRS and T | stage criteria; smooth T | — |
| Combinations (Sgarbossa, old MI in BBB, LVH + LBBB, WPW pseudo-infarct, RBBB + STEMI) | authored morphologies don't compose by themselves | fixed composition order; necrosis and injury use the beat pattern's region timing; gradient rule gives the secondary T | both conditions' criteria where defined for the combination; validator rejects the rest | not offered until calibrated |
| Pacing spikes at 500 Hz | sub-sample events | area-preserving `impulse` kernel at the lead tip (unipolar vs bipolar amplitude); filters shape it like a recorder | spike visible (≥ 0.5 mV unipolar) in the diagnostic preset | viewer pacing markers (the ECG-machine convention) |
| Pericarditis PR depression, atrial infarction | atrial injury current | atrial injury plateau over P–PR (`AtrialSpec.injuryMv`) | PR↓ in II, PR↑ in aVR | — |
| Normal base itself (V1 r, transition, T asymmetry, ST segment, lead I R amplitude) | every scenario inherits it; judges flagged each item | PTB-XL+ NORM envelope calibration (§8.3) with the generic sanity criteria | NORM envelope ≥ 90 %; normal criteria | — |
| Generated families (PVC/VT origins, paced sites, atrial sites) | morphology quality depends on the front synthesis | two-reference family calibration + per-site criteria + review | per-site criteria; cardiologist sign-off | authored lobes for the sites that fail |
| Very fast rates (sinus 150+, 2:1 flutter, AT with block) | P hidden in T | truth `visible` flag from geometry; teaching variants | visible-P counts match the oracle | — |
| Dextrocardia vs reversal; COPD / vertical heart | geometry vs cables | Geo mirror / rotation vs Pl cable permutation | contrast tests on the same seed | — |

Condition-level physiological knobs that stay (documented with ranges): VT coupling c (electrotonic APD modulation),
flutter `taRatio` (atrial repolarisation per cycle), hyper-K `tShape.q` (phase-3 steepness), Brugada source depth and
`far`, AF stream amplitudes.

---

## 12. Port plan

### 12.1 Milestones

1. **M1 Core port** — kernel, render, Dower leads at standard sites, assembly, B's 12 benchmarks as is, oracle port,
   T0–T2 + T7. Exit: B's numbers reproduced (regression baseline).
2. **M2 Structural changes** — split T, JT anchoring, region geometry + region graph + APD map (bake scripts),
   `loc` on all ventricular lobes with β, hexaxial axis formula, ventricular-only axis; normal base re-calibrated on the
   PTB-XL+ NORM envelope; the judge fixes of §12.2. Exit: 12 benchmarks pass T1–T4, gallery reviewed.
3. **M3 Scheduler** — junction rules, ectopy, blocks, re-entrant SVT, pacing; groups `atrial`, `svt`,
   `ventricular`, `av-block`, `pacing`.
4. **M4 Territories and repolarisation** — injury, necrosis, stage, ΔG; groups `ischemia`, `repolarization`,
   `structural`, `chambers`, `conduction`.
5. **M5 Leads and chain** — BEM lead-table bake, placement, extra leads, recording chain; group `technical`; T6.
6. **M6 Drills** — dials, solves, `drawDials`, difficulty ladder, T5; performance tuning (T9); cardiologist sign-off
   (T10). The `src/synth/index.ts` contract is frozen at M2 so practice and course can build against it.

### 12.2 Fixes carried from the blind judges into the port (B's 12 benchmarks)

* **normal**: septal lobe less superior (aVL q ≈ 45 % of R and a Qr read as pathological → q < 25 % of R); less
  anterior force (transition V3–V4, not V2–V3); real ST segment and asymmetric T (rise slower than fall; T in V3–V4
  ≤ 50 % of R); P axis toward +50°; lead I R larger (it also left RBBB's axis at +85°).
* **rbbb**: V1 s not a needle (broader, shallower); smaller initial r in V2; no notched R′ in V3; no terminal r′ in V4
  (slurred S V4–V6); clearer terminal S in aVL; smooth terminal S in II/aVF.
* **lbbb**: initial r in V1–V3 rounded (no 15–20 ms spike, no square shelf in V4); gradual V3→V4 transition; V4 ST
  not concordant; stronger V5 discordance; a mild notch or plateau on the lateral R; clean aVF.
* **anterior-stemi**: hyperacute T much smaller (V2–V4 ≈ 0.6–0.9 mV, not 1.25–1.4); a visible ST segment (straight or
  convex) before the T; inferior reciprocity (III and aVF ST↓) through a more superior injury vector; no QT difference
  between adjacent leads.
* **inferior-stemi**: larger injury, smaller dome T (not hyperacute-looking); clear reciprocal ST↓ in I; III > II by a
  clear margin; low-voltage notched aVL avoided.
* **lvh-strain**: smooth curved ST-T (no straight ramps); J depression ≈ 0.5–1 mm; taller V5–V6 R; no notches on V3
  S / V4 R / II–aVF S.
* **wpw**: two-phase QRS (slow delta 40–60 ms, then steep) in II, III, aVF, V1–V3; delta negative or isoelectric in I,
  aVL, V5–V6 for a left lateral pathway; secondary T discordant in V3–V6, II, aVF.
* **brugada-type1**: narrow small initial r in V1; coved descent starting at the J peak (no 30–45 ms flat top).
* **aflutter**: V3 T smaller (shared normal fix); small negative F in V6.
* **hyperk**: tented T also in the inferior leads; lateral T not fading by V6; no S-upstroke kink in V1–V2; P still
  visible at stage 1.
* **afib**: f waves present in every window of the II strip; less regular, less sinusoidal; normal T (shared fix);
  QT at 100/min within normal.
* **vt**: broader terminal QRS (no 30–40 ms spike); monophasic or qR R in V1–V2 without a sharp s; `teaching` variant
  for visible P waves.

---

## 13. Open items to verify before or during implementation

1. **Dower extra rows.** B's DESIGN refers to "the patent's extra rows (V3R–V5R, V7–V9)". This was not verified here.
   If US 5,711,304 lists them, they are validation targets for the BEM lead table (and could replace it at those sites);
   if not, the BEM table (§2.2) is the only source.
2. **Electrode positions and κ** are landmark estimates (no public table). β and the positions are calibrated against
   the PTB-XL+ envelopes (V1–V2 vs V5–V6 amplitude ratios, P amplitudes by lead).
3. **Thresholds** used by derived findings and criteria (STEMI by sex/age, QTc limits, voltage criteria) are taken from
   the "current value" column of `docs/curriculum/criteria.md`; record the row id next to each threshold constant.
4. **12SL vs oracle conventions** for the T4 envelopes: validate the oracle on the real records first (§8.1).
5. **Taxonomy additions** listed at the end of §9 need the integrator (owner of `src/core`).
6. **3D frame**: `frame.ts` mapping to the HRA mesh orientation is pinned by a test against `src/heart3d` fixtures.
7. **Licensing**: the envelope fixture is derived from PTB-XL / PTB-XL+ (CC BY 4.0); its header carries the
   attribution. Nothing from `data-raw/` ships.

## References

Dower GE, US patent 5,711,304 (forward lead-vector rows). Edenbrandt L, Pahlm O. J Electrocardiol 1988;21:361–367
(inverse Dower). Kors JA et al. Eur Heart J 1990;11:1083–1092. Wilson FN et al. Am Heart J 1934 (ventricular
gradient); Burger HC 1957. Fridericia LS 1920 (QT rate correction). Durrer D et al. Circulation 1970;41:899–912
(activation of the human heart). Cerqueira MD et al. Circulation 2002;105:539–542 (AHA 17-segment model and coronary
assignment). Mason RE, Likar I. Am Heart J 1966 (torso limb electrodes). Pan J, Tompkins WJ. IEEE TBME 1985 (QRS
detection). Wagner P et al. Sci Data 2020 (PTB-XL); Strodthoff N et al. Sci Data 2023 (PTB-XL+); PhysioNet, CC BY 4.0.
Curriculum structure, criteria and terminology: Castellano C, Pérez de Juan MA, Attie F. *Electrocardiografía
Clínica*, 2nd ed. Elsevier, 2004 (no text, tables or figures reproduced), cross-checked against current guidelines in
`docs/curriculum/criteria.md`. Prototype sources: `_proto/vcg/DESIGN.md` (§1–§10), `_proto/regional/DESIGN.md`
(§1–§9), `_proto/field/DESIGN.md` (§1–§8).

