# Architecture A — regional dipoles + volume-conductor lead field

Prototype synthesiser of 12-lead ECGs for ECG Academy. Zero dependencies, TypeScript with erasable syntax only
(`node gen.ts` on Node 24). Everything here is throw-away prototype code (`_proto/`); nothing in `src/` imports it.

```
node gen.ts [id…]      → out/<id>.json ({fs, title, leads}) + out/<id>.truth.json, prints generation time
./render.sh <id…>      → out/<id>.png (3×4 + II strip, 25 mm/s, 10 mm/mV) and out/<id>-beat.png (50 mm/s, 20 mm/mV)
node check.ts [id…]    → limb identities, signal-measured intervals/axis vs truth, textbook criteria (exit 1 on mismatch)
```

| file | role |
|---|---|
| `synth.ts` | engine: rhythm → beats → regional sources → electrode potentials → 12 leads; `generate()` (required interface) |
| `geometry.ts` | procedural heart: 22 ventricular regions (AHA 17 LV + 5 RV) as closed double-layer patches; 7 atrial regions |
| `conduction.ts` | conduction system (Purkinje exits per fascicle, Durrer timing), face graph, fastest-route activation, atrial routes |
| `membrane.ts` | normalised action-potential template (upstroke window, plateau, optional phase-1 notch, Gompertz phase 3) |
| `leadfield.ts` | one lead field per electrode (Dower torso + infinite-medium proximity term); 12 leads from 9 electrode potentials |
| `model.ts` | global constants (lead system, normal APD map, atria, flutter circuit) and the condition-description types |
| `conditions.ts` | the 12 benchmark conditions — parameter overrides only |
| `measure.ts`, `check.ts` | signal-only measurements and the self-check |
| `dev/` | calibration / debugging scripts (see `dev/README.md`) |

## 1. The source model

### Ventricles: regions as pieces of one closed double layer

The ventricular myocardium is a procedural heart in the body frame (cm; x left, y superior, z anterior, origin at the
ventricular centroid): a truncated prolate-ellipsoid LV shell plus a crescent RV shell that wraps the septum and
funnels into the outflow tract. Its bounding surface (LV endo/epi, RV inner/outer, basal rims) is tessellated into
4432 patches with outward area vectors; the patches close exactly (Σ area vectors ≈ 1e-14 cm²). Every patch belongs to
one of **22 anatomical regions** (`b_/m_/a_` + `ant, antsep, infsep, inf, inflat, antlat`, `apex`, `rv_apex, rv_ant,
rv_free, rv_inf, rvot`) and to one of its two **faces**: IN (endocardial; septum: LV side) or OUT (epicardial; septum:
RV side). Basal rims count half to each face.

The source is the equivalent double layer of that closed surface: every patch carries the normalised transmembrane
potential s_p(t) (0 rest, 1 plateau) of the tissue behind it, and the electrode potentials are

  φ_e(t) = −g_V · Σ_p ℓ_e(c_p)·a_p · s_p(t)   (lead field ℓ_e at the patch centre c_p, area vector a_p).

Grouped by region this is exactly the "regional dipole" of the task: **region k's moment is p_k(t) = −g_V Σ_{p∈k} a_p
s_p(t)** (plus its higher multipoles, which the lead field sees through the per-patch positions). Two consequences:

* **Direction × envelope is not imposed, it falls out.** A region that is uniformly active contributes only its
  boundary with still-resting neighbours, because its own faces plus their edges form a closed surface. That boundary
  term is the wavefront: magnitude = wall thickness × front length, direction = propagation direction. While the front
  crosses a thick wall endo → epi (IN active, OUT not yet), the term is the transmural front a_IN·(s_IN − s_OUT).
* **The ST segment is isoelectric by construction**: a whole heart on its plateau is a uniform double layer on a closed
  surface → zero for every electrode (enforced numerically by a closure correction of the patch weights). Any ST
  deviation therefore has a physiological cause (unequal plateau levels = injury current, notches, plateau slope).
  Repolarisation (T) is the same sum during phase 3: the repolarisation-gradient dipole comes from the APD map, so a
  normal T is concordant because endocardium and base outlast epicardium and apex.

**Sweep inside a face.** A uniform state per face (22 regions × 2 faces) is too coarse for fronts that cross a region
slowly (bundle-branch blocks, VT, pre-excitation). Every face is therefore split into 8 sweep bins along the
direction the front came from: patches are ordered by distance from the centroid of the face that activated it (or
from the focus point for an ectopic/accessory-pathway source); bin b activates at fraction u_b of the face's activation
window. Purkinje-fed faces activate as a whole (many simultaneous breakthroughs). A face reached transmurally inherits
its partner's sweep. The 3-D view still sees 22 regions; the bins only refine the timing. (Review additions: a face
activated as a whole is split into 4 long-axis levels so that the apex→base APD gradient can continue *inside* the face
(`vrep.gABin`); the levels are merged back into one source whenever their APDs are equal, which keeps every condition
that does not use it identical to the builder's output (within the 0.1 µV rounding of the written files). An optional front dispersion `vcond.sweepDisp` widens the windows of the far bins of
a swept face.)

**Action potential** (`membrane.ts`): s(t) = amp · U · Pl · N · L — U a smoothstep over the activation window; Pl a
plateau decline; N an optional phase-1 notch (Ito: depth, held, recovered — spike-and-dome / Brugada / J waves); L a
Gompertz phase 3 (slow start, steep end), time constant folded with the window width and an intra-region APD spread.
APD per face = normal map (apex→base gradient, endo–epi difference, RV offset, regional offsets) + condition offsets,
× restitution (RR/833)^0.36.

### Atria

Seven regions (sinus node / high RA, RA lateral, cavotricuspid isthmus, low septum, Bachmann's bundle, LA anterior +
appendage, LA posterior). Each activation is a wavefront dipole d·m with an entry/exit pair of smooth windows; the exit
side has a slightly shorter APD so the atrial T (Ta) is small, broad and opposite to P. Sinus activation follows a
7-node fastest-route graph with per-edge front directions. **Flutter** is a moving front: 24 sub-sources travel a
closed Catmull–Rom loop through the RA region centroids (CTI → septum ascending → roof → lateral wall descending; after the review the roof, not the CTI, is the slowest segment, §9)
plus the passively activated LA (from the CS ostium, caudo-cranial) and Bachmann's bundle; the front is always
somewhere, so there is no isoelectric baseline. All circuit constants live in `FlutterCircuit` (`model.ts`) and can be
overridden per condition (`reverse: true` = clockwise — implemented, not exercised by any benchmark). **Fibrillation**: every atrial region re-excited at its own
irregular cycle (fCL ± 20 %) with a random front direction (seeded RNG).

### Lead system — one lead field, exact limb identities

`ℓ_e(r) = D_e + κ·[G(x_e − r) − G(x_e − r0)]`, G(d) = d/|d|³. D_e is the electrode's lead vector at the heart centre
from Dower's torso-derived matrix (WCT gauge; limb electrodes reconstructed from I and II), which carries the bounded-
torso amplification and realistic lead directions. The second term is the infinite-homogeneous-medium variation of the
lead field around the centre (proximity: RV/RVOT weigh more in V1–V2, apex in V4). κ = β·|D_V2|·|x_V2 − r0|² with
**β = 1**, the value at which the near-field term has the same scale as the far-field lead vector at the centre (an
electrode on a half-space sees twice the infinite-medium field; Dower's vectors already contain that factor).
Only nine electrode potentials are computed (RA, LA, LL, V1–V6). Leads: I = LA − RA, II = LL − RA, III = II − I,
aVR = −(I+II)/2, aVL = I − II/2, aVF = II − I/2, Vi = φ_Vi − (RA+LA+LL)/3. `check.ts` verifies the limb identities
sample by sample (max error 1e-7 mV = float32 rounding).

## 2. Activation schedule

`conduction.ts` builds a graph whose nodes are the 44 faces: transmural edges (wall / vT), LV-endocardial, RV-
endocardial, epicardial and diagonal edges between touching faces (adjacency from the geometry). Sources are Purkinje–
muscle junctions fed by four branches (LSF, LAF, LPF, RBB) with Durrer-type exit times (earliest LV septal
breakthroughs at 0–5 ms, RV after 5–17 ms, posterobasal LV and RVOT without Purkinje), plus optional extra sources
(ectopic focus, accessory-pathway insertion; at the face centre, its most basal or most apical patch). A fastest-route
pass gives each face an activation window: Purkinje faces ±h around the exit time; faces reached along the wall swept
over ±max(muscle spread, radius / v); transmural partners lag by at least the transmural time. RV free wall ↔ LV free
wall edges cross the interventricular grooves at half speed. Blocking a branch removes its exits; conditions may also
delay branches, scale Purkinje timing, change velocities per surface, per region, or the wall used for transmural
conduction.

## 3. Truth (from the model's own timing)

* QRS onset = first ventricular activation of the beat; QRS offset = instant 99 % of the ventricular surface is
  activated; T end = instant 98 % has repolarised (phase-3 midpoint passed); found by bisection on the bins' windows.
* PR = sinus-node firing → QRS onset (null for non-sinus rhythms); HR from QRS onsets.
* Axis = net-area frontal axis between QRS onset and offset, computed on the **ventricular-only** limb potentials
  (free of P / flutter / f waves).
* The two thresholds were calibrated once so that model fiducials agree with standard signal measurements (global
  slope-energy QRS on/off, tangent T end) across all 12 conditions; `check.ts` re-measures every condition from the
  signal alone and passes with tolerances HR ±3/min, PR ±20, QRS ±20, QT ±30 ms, axis ±15° (QT is not compared in the
  170/min VT, where T runs into the next QRS).

`regions.activityAt(t)` returns 29 values (22 ventricular + 7 atrial) in 0…1: rising while a region depolarises,
held on the plateau, falling with repolarisation — directly usable to colour a small 3-D heart.

## 4. What is global and what a condition may change

**Body / recording constants (set once, identical for every condition)** — lead system β = 1, g_V = 0.071, g_A =
0.09; electrode positions; heart geometry (LV R 2.3 / H 6.6 / wall 1.0 cm, RV depth 2.0 cm, RV wall 0.6 cm);
conduction vT 0.046, vEndo(LV, Purkinje-aided) 0.09, vRvEndo 0.075, vEpi 0.05 cm/ms; junction factor 0.5; muscle
spread 0.5, sweepK 1.0, minimum window half-widths 5 ms (muscle) / 8 ms (Purkinje exit); RV Purkinje exits
(rv_ant, rv_inf) widened from ≈5 to 12 ms in this run (sparser RV network; removes early spikes in BBB / VT); normal APD map (apd0 276 ms,
apex→base +20 ms, LV endo − epi 34 ms, RV −24 ms, lateral −24 ms, phase-3 τ 24 ms, spread 45 ms); truth thresholds.
One acknowledged fudge: the RV wall used for *transmural conduction* in the normal heart is 0.24 cm (only the compact
layer is crossed by muscle; the trabecular layer is activated by the RV Purkinje network), while the RV *geometry*
uses 0.6 cm. Without it the normal V1 r becomes 7–8 mm.

**Condition handles** (`model.ts`, `Condition`):
rhythm (sinus rate / PR / sinus arrhythmia / accessory pathway; flutter circuit; AF; VT focus), conduction
(`blocked`, `branchDelay`, `pmjScale`, velocities, `regionSpeed`, transmural-only `tmSpeed` (unused by any benchmark; tested on LBBB, §9), transmural `wall`, `extra`
sources, front dispersion `sweepDisp`), repolarisation map (`vrep`, incl. the in-face gradient `gABin` and the
electrotonic APD–activation coupling `couple`; both 0 in the normal heart), regional AP modifiers (`amp`, `ampIn/Out`, `dApd*`, `plat`, `tau`, `notchOut`, `rest`), geometry
(`heart`), atria (`gain`, `vScale`, `apd`, directions). Nothing touches a lead or a waveform.

## 5. The 12 benchmark conditions

| id | parameterisation (beyond the normal heart) | measured (check.ts, mm at 10 mm/mV) |
|---|---|---|
| normal | sinus 72, PR 160 | QRS 86, QT 368, axis +48; rS V1 (r 6/S 11), R > S from V3 (transition V2–V3), septal q I/aVL/V6, T + except aVR |
| rbbb | RBB blocked; RV endocardium at muscle speed 0.06; RV transmural wall 0.5 cm (no Purkinje-activated trabeculae); front dispersion 4 in the swept RV faces; plateau decline 0.25 (review) | QRS 154; V1 rsR′ r 7.5 → R′ 10.4 at 92 ms, ST −1, T −5; slurred S I/V6; lateral T 5.5–6.6; net axis 88° |
| lbbb | LSF+LAF+LPF blocked; slow transseptal conduction (septum speed 0.45–0.8); LV endocardial spread 0.1; plateau decline 0.25 (review) | QRS 154; no q I/V5/V6; RPT V6 114 ms; QS V1–V3; ST ↑ V1–V3 1.7–2.7, ST ↓ I/aVL/V5/V6 1.1–1.9; T + V1–V3 (8–12), − I/aVL/V6; axis −19 |
| anterior-stemi | LAD territory (mid/apical anterior, anteroseptal incl. basal, apex): amp 0.62, APD −45; basal anterior + apical lateral rim: amp 0.8, APD −25 (review) | J V2 2.7, V3 4.5; ST↑ V1 1.1–V5; III −1.7, aVF −1.4; hyperacute T 6–10 |
| inferior-stemi | RCA territory (inferior + inferolateral wall, RV inferior): amp 0.62, APD −40; apex, basal inferior septum, RV apex 0.8 / −25 (review) | ST II 2.9 < III 3.9, aVF 3.4; I −1.0, aVL −2.4; V1–V3 −1.7…−2.2, V6 −0.1 |
| lvh-strain | bigger/thicker LV (R 2.6, H 7.2, wall 1.5), lateral wall thickest; vT 0.041; long axis 12° more horizontal; lateral/inferolateral endocardium only: plateau 0.85, APD −30, plateau slope (review) | SV1+RV5 47; R aVL 13.8; QRS 102; RPT V6 50; ST↓ 1.1–2.4 + asymmetric T− 4.6–6 in I/aVL/V5/V6; axis +2 |
| wpw | AP from LA lateral annulus into basal anterolateral + inferolateral epicardium, +50 ms; AV node PR 150 | PR 104, QRS 130; delta in II/III/aVF/V1; V1 R 9.8 > S 3.1 (type A); negative delta aVL; secondary ST-T |
| brugada-type1 | RV free wall + anterior RV + RVOT epicardium: phase-1 notch 0.1 recovering over 280 ms, epicardial APD +13 (RV apex half) | J V1 3.5, V2 3.5, coved, T V1 −5.9 symmetric; limb leads |ST| ≤ 0.2 |
| aflutter | CCW macro-reentry, CL 200 ms, 4:1, FR 310 ms; circuit: CTI 26 %, septum 22 %, roof 30 %, lateral wall 22 % of the cycle (review) | F cycle 200 ms; II/III/aVF −4.5/+1.4 clean sawtooth (≈2 extrema per cycle); V1 +1.5 discrete; QRS 86 |
| hyperk | phase-3 τ 12, spread 10, apd0 240, apex–base gradient 65 continued inside the faces (gABin 1), APD–activation coupling 0.25 (review); conduction × ≈0.75; atrial gain 0.45, speed 0.8; PR 200 | T V2/V3/V4 10.5/13.2/14.3 smooth, symmetric, no notches; P 0.9; QRS 103; QTc 365 |
| afib | AF (fCL 145 ± 20 %, fGain 1.1 — review), ventricular RR = gamma-distributed, mean 600 ms, min 380 | RR CV 27 %, rate 101; f waves 1.2 mm p-p in V1 |
| vt | focus mid-inferolateral LV endocardium, 170/min, no Purkinje assistance (LV endo 0.075); slow transseptal crossing (0.6–0.75), slow RV apex entry (0.5), fast retrograde RV endocardium (0.15), front dispersion 2 (review); sinus 80/min independent (P gain 1.4) | QRS 173; axis −130 (north-west); V1/V2 broad monophasic R; V6 rS |

`node check.ts` currently: all truth/measurement checks pass (exit 0); 72 of 75 textbook criteria pass. The review
(§9) added 7 criteria and tightened 2; the three failures are RBBB R′ > r in V2, Brugada V6 −0.7 mm and VT V3 half-width
36 ms (see §8, §9).

## 6. Scaling to the ~80-condition catalogue

All families map to existing handles or to small, physiologically named additions; none needs a per-lead edit.

* **Rhythm scheduler** (the only real code to add): ectopic atrial rhythm / PAC / atrial tachycardia (`aActivation`
  already takes any source region), junctional rhythm (source low septum, retrograde direction), AV block I
  (`pr`), Mobitz I/II and complete block (per-beat PR sequences / drops; escape focus as `extra`), PVCs, bigeminy,
  fusion beats (His + focus in the same beat), idioventricular / accelerated rhythms, polymorphic VT / torsades
  (focus moving per beat), VF (ventricular analogue of the AF scheduler), AVNRT (atria activated retrogradely from the
  septum during the QRS → pseudo-r′), orthodromic AVRT (retrograde P via the pathway), flutter with variable block,
  clockwise / atypical flutter (`FlutterCircuit.reverse` — implemented, not exercised; other loops).
* **Conduction**: LAFB / LPFB / bifascicular (`blocked`), incomplete RBBB (`branchDelay.RBB`), non-specific IVCD
  (velocities), rate-dependent BBB (block per beat), other accessory-pathway sites (face + `at`).
* **Ischaemia / infarction**: territory = region list; acute = plateau depression + APD shortening (done); evolving =
  epicardial APD lengthening (T inversion); old MI = scar flag (region inexcitable: amp 0 and removed from the graph →
  Q waves, slowed peri-infarct conduction via `regionSpeed`); posterior MI (b/m_inflat), RV infarct (+ right-sided
  electrodes V3R–V6R, which only need positions in `leadfield.ts`).
* **Hypertrophy / enlargement**: LVH (done), RVH (`rvDepth`, `rvWall`, RV transmural wall, apexDir), LA / RA
  enlargement (atrial region size `m`, `extent`, velocities).
* **Electrolytes / drugs / temperature**: hyper-K (done), hypo-K (flattened T + U wave: needs a late-repolarising
  mid-myocardial / Purkinje population — a third face layer or a dedicated small region set), Ca²⁺ (plateau duration
  vs. phase-3 shape), digoxin (plateau slope `plat`, short APD), class I/III (velocities, apd0), hypothermia (Osborn J
  wave = `notchOut` on LV epicardium + bradycardia + long APD).
* **Channelopathies / cardiomyopathies**: LQT1/2/3 (apd0, τ, two APD populations for notched T), Brugada (done),
  early repolarisation (small inferolateral `notchOut`), ARVC (slow RV free wall `regionSpeed` → epsilon wave, RV
  T inversion), short QT (apd0 ↓), pericarditis (global epicardial plateau depression; PR depression needs an atrial
  plateau-injury handle).
* **Pacing**: the stimulus spike must also be one source — a millisecond current dipole at the lead tip seen through
  the same lead field — followed by an `extra` source at rv_apex / atrial region.
* **Electrode misplacement**: `buildLeadField(beta, pos, swap)` already maps cables to sites (limb reversals, swapped
  precordials) and electrode positions can be moved (high V1–V2), but `prepare()` does not plumb a per-condition swap
  / position set yet (one key in the cache).
* **Recording chain (not implemented)**: baseline wander, EMG, mains, gain and filters must be applied to the nine
  electrode potentials (linear filters commute with lead formation, so the limb identities survive); never per lead.

**Continuous drill variation.** Rate (`hr`), PR (`pr`, linear 1:1), QT/QTc (`apd0`, ≈ 1:1, restitution included),
QRS width (velocities / `pmjScale`, monotone), ST deviation (`amp` of a territory, monotone), T amplitude (APD
gradients), hypertrophy degree (`lvWall`), infarct extent (number of regions). Axis is best dialled by rotating
`apexDir` in the frontal plane (physical, smooth, but non-linear → needs a small lookup or a bisection on the truth
axis). Truth is recomputed from the model for every draw, so drill answers stay exact. Seeds give reproducible
variation of RR, AF and flutter phase.

## 7. Performance

Per 10-s, 500 Hz 12-lead, median of 7 warm runs interleaved over the 12 conditions, same machine and load for both
versions (review, quiet laptop): builder version median 27.5 ms (mean 34), reviewed version median 23.7 ms (mean 35).
Per condition after the review: sinus / STEMI / LVH / Brugada / hyper-K 15–22 ms, WPW 24, BBB 29–34, AF 32, flutter
66 (≈ 2 500 atrial sub-sources), VT 125 (29 wide beats, every face swept; front dispersion disables the shared AP
table). Timings on this laptop are noisy (±2×: `gen.ts` printed 27–140 ms warm medians in the same session). The first
call for a new heart geometry adds 150–350 ms (patch geometry, closure-corrected lead weights for 9 electrodes × 4 432
patches, conduction-graph adjacency); these are cached per geometry. Cost is O(beats × bins × AP samples × 9); all bins
of a face share one tabulated pre-phase-3 AP shape and one tabulated phase-3 decay (only the APD differs per bin).

## 8. Known limitations and honest morphology failures (state after the review, §9)

Architectural ceiling: 22 regions × 2 faces with a one-parameter sweep inside each face. Fronts are coarse; where
neighbouring faces activate with different sweep directions, notches appear in slow-conduction complexes, and with a
steep phase 3 the faces repolarise as separate steps. Thin RV walls make small transmural dipoles, so RV-dependent
features (RBBB R′, normal V1 r) depend on RV wall parameters (see the RV fudge in §4).

Still open (could not be removed without breaking another condition or the truth/measurement agreement):

1. **LBBB**: mid-QRS notch in I/aVL/V5/V6 (R dips to ≈ 45–60 %) and W-shaped QS in V1–V3. The septal R→L force ends
   before the lateral LV wall is reached (the anterior/inferior free walls in between project little on V6). It reads
   as the "WiLLiaM" M/W pattern, but deeper than in most real LBBB. Fragmented low-amplitude complexes in II/III/aVF;
   T V1–V2 still 11–12 mm; a small positive overshoot after the inverted T in V5. Not fixed by faster LV endocardium,
   slower or transmural-only septal slowing (`tmSpeed`), coupling or front dispersion.
2. **RBBB**: V2 shows rsr′ (r 10.5 > R′ 6.7), so R′ > r holds only in V1 (new check criterion fails). Initial r in V1
   is 7.5 mm (textbook 2–4); area axis 104° (net-amplitude 88°).
3. **Normal**: V1 r 6 mm (upper normal; early RV free-wall transmural dipole + septal force); R > S already in V3
   (transition V2–V3); J −1 mm with upsloping ST in II/III/aVF; P in V1 small positive, not biphasic. Left alone:
   every condition inherits this calibration.
4. **Brugada**: V6 J+40 −0.7 mm (far-field projection of the anterior RV epicardial dipole on V6's posterior
   lead-vector component; the RV is ~5 cm from V1/V2 here instead of ~3 cm). Dropping the RV apex from the substrate
   or changing the epicardial APD did not help (−0.7 persists; limb reciprocity worsens). V2 ends its negative T with
   a +1 mm terminal bump; V3 is partly coved with a narrow upright T.
5. **VT**: V3 keeps a narrow peak (36 ms at half height; the check criterion ≥ 40 fails) and the low-amplitude limb
   leads (III, aVL, aVF) look fragmented; dissociated P waves are not discernible. The visible QRS starts 15–25 ms
   after the first activation. Smoother complexes (front dispersion ≥ 3, slower apex) made the signal-measured QRS end
   drift 35–100 ms past the truth (no measurable J point at 170/min), so they were not adopted.
6. **Flutter**: the measured axis depends on the F–R phase (16–70° over FR 230–310 ms); FR = 310 ms keeps it within 5°
   of the ventricular truth. V1 positivity still relies on the anterior offset of the descending limb; the CTI (26 %)
   is no longer the longest segment (roof 30 %).
7. **Hyperkalaemia**: aVL T is a small −/+ biphasic wiggle, V1 T is small with a shoulder; the smooth T needs two
   handles the normal heart does not use (`gABin`, `couple`). `regions.activityAt` (3-D view) still evaluates one AP
   per face with the face's base APD, so its repolarisation timing ignores the per-bin gradient / coupling (up to
   ≈ 20 ms on the late basal faces in hyper-K).
8. **Anterior STEMI**: V1 elevation 1.1 mm (limited by the V1–septum distance).
9. **LVH**: T in III +7.7 mm (reciprocal of the lateral strain; tall for a limb lead).
10. **WPW**: frontal axis +107° with tall inferior R (plausible for a left lateral pathway; kept).
11. **Not implemented**: recording chain (noise, wander, filters, gain), electrode misplacement plumbing, U waves,
    pacing spikes, right-sided / posterior leads.

## 9. Review (fresh-eyes pass, 2026-10-17)

**Method.** Regenerated everything (byte-identical to the builder's out/), rendered all 24 PNGs and read each one as a
cardiologist against the task criteria; ran `check.ts`; re-verified the limb identities on the written JSON with an
independent script. Every fix below is a parameter of the source description (rhythm, conduction, regional AP,
geometry) or a source-model refinement applied identically to all leads. No lead or waveform is edited, and the 12
leads are still formed only from RA, LA, LL, V1–V6.

**Deviations found** (lead, feature, expected vs seen, builder version):

| condition | deviation |
|---|---|
| hyperk | bifid / notched T in I, III, aVL, V1, V6 (two humps 30–40 ms apart; V5 shoulder), expected a smooth tented T; V2 T 9.1 (< 10) |
| vt | narrow 15 mm spikes in V2–V3 (≈ 25–35 ms at half height) inside a 168 ms complex; jagged limb leads; P waves not visible |
| aflutter | each F wave in II/III/aVF had a 30 ms positive spike + notch after its trough (≈ 4 extrema per cycle), expected a plain sawtooth |
| lbbb | M-shaped R (dip to 40–50 %) in I/aVL/V5/V6, W-shaped QS V1–V3; J ≈ 0 (no ST ↑ V1–V3 / ST ↓ lateral at the J point); T V1/V2 15–17 mm; lateral T −6…−8 |
| rbbb | lateral T 8–10 mm; flat-bottomed "box" S in I/V4–V6 ending abruptly; V2 r > R′; area axis 102° |
| lvh-strain | R aVL 10.5; axis +25° (no left tendency); strain T −7/−8 with T III +10 |
| inferior-stemi | precordial ST ↓ diffuse incl. V5–V6 (−1.3…−1.6), expected V1–V3 predominant |
| anterior-stemi | V1 ST +0.9 |
| afib | f waves 0.7 mm p-p in V1 (barely visible) |
| brugada-type1 | V6 −0.7 mm reciprocal; V2 T with a +1 mm terminal bump |
| normal | V1 r 6 mm; transition V2–V3; J −1 mm II/III/aVF; P V1 not biphasic |
| JSON | limb identities only to 1e-4 mV in the written files (each lead rounded separately) |
| check.ts | softened criteria (hyper-K "2 of 3 ≥ 10 mm"; RBBB V2 R′ not tested; LBBB V1 "r" picked up the J elevation) |

**Fixed or improved.**

* **Hyper-K**: root cause: with τ 7 ms every face repolarises as a step, and small-T leads show the steps. Engine:
  faces activated as a whole are split into 4 long-axis levels so that the apex→base APD gradient continues inside the
  face (`vrep.gABin`); all bins now share a tabulated pre-phase-3 shape × a tabulated phase-3 decay, so per-bin APDs
  (gradient, coupling) cost nothing extra. Condition: τ 12, gAB 65, gABin 1, APD–activation coupling 0.25 (the late
  base shortens). T V2/V3/V4 10.5/13.2/14.3, smooth (the new criterion "no notch in any lead" passes), symmetric, QTc
  365. `gABin` stays 0 in the normal heart: as a global default it changed the VT measurement and the normal T by 0.4 mm.
* **Flutter**: the roof segment (15 % of the cycle, largest front) made the spike. `TYPICAL_FLUTTER`: CTI 26 %, septum
  22 %, roof 30 %, lateral 22 %; fronts 0.3/1.6/1.6/0.8; anterior offset 2.5 cm. Result: a clean sawtooth (≈ 2 extrema
  per cycle, new criterion) and V1 +1.5 mm discrete. FR 270 → 310 ms keeps the measured axis on the truth.
* **LBBB / RBBB ST-T**: plateau decline 0.25 per 200 ms (phase-2 slope) in both. The early-activated muscle has
  declined further at the J point, which gives secondary ST shifts. LBBB: ST ↑ V1–V3 1.7–2.7, ST ↓ I/aVL/V5/V6 1.1–1.9,
  T V1/V2 11–12. RBBB: ST ↓ V1, lateral T 5.5–6.6.
* **RBBB terminal S**: new `vcond.sweepDisp` (front dispersion; 0 = off everywhere else). RBBB uses 4: slurred,
  tapering S in I/V5/V6 and a broad terminal R in aVR; truth/measured QRS now 154/150 ms (was 140/156).
* **VT**: slow transseptal crossing (septum 0.6–0.75), slow RV apex entry (0.5), fast retrograde RV endocardium (0.15),
  front dispersion 2. V1/V2 now show a broad monophasic R (half-width 35 → 90 ms in V2), V6 rS; QRS 173; axis −130.
* **LVH**: long axis 12° more horizontal (geometry) and strain confined to the thick lateral/inferolateral wall:
  R aVL 13.8, axis +2°, SV1+RV5 47, strain T −4.6…−6, T III 10.1 → 7.7.
* **Inferior STEMI**: inferolateral wall added to the RCA territory, septum spared beyond its basal third: V1–V3
  −1.7…−2.2, V6 −0.1 (new criterion passes); III > II and aVL deepest kept.
* **Anterior STEMI**: basal anteroseptum added to the injured territory, mid anterolateral wall left out: V1 1.1 (from
  0.9).
* **AF**: fGain 0.7 → 1.1, so f waves are 1.2 mm p-p in V1.
* **JSON identities**: `gen.ts` re-derives III, aVR, aVL and aVF from the rounded I and II (5 decimals for the
  Goldberger leads). The written files now satisfy the identities to 2.2e-16 mV (in memory: ≤ 1.2e-7 mV, float32).
* **check.ts**: hyper-K now needs all of V2–V4 ≥ 10 mm; LBBB tests the initial r (first 40 ms) of V1–V3. New criteria:
  T without notches (hyper-K), R′ > r in V2 (RBBB, fails), left axis tendency (LVH), V1–V3-predominant ST ↓ (inferior
  STEMI), clean sawtooth (flutter), every precordial complex ≥ 40 ms wide (VT, fails in V3).

**Verified after the fixes.** `node check.ts`: exit 0, all truth/measurement rows agree for the 12 conditions; 72 of
75 criteria pass (the failures are §8 items 2, 4 and 5). All 24 PNGs re-read. Normal, WPW and Brugada outputs equal
the builder's to the last written decimal (max |difference| 0.1 µV, i.e. rounding). Two consecutive `node gen.ts` runs give byte-identical JSON. Strict `tsc` with
`--erasableSyntaxOnly` passes for all files including `dev/`.

**Tried and rejected:** global `gABin` 1; coupling in the BBBs (flips the lateral T upright); transmural-only septal
slowing in LBBB; Brugada substrate without the RV apex or with other epicardial APDs; more or wider flutter
sub-sources (no effect on the spike); VT front dispersion ≥ 3 and a slower apex (measurement drift).
