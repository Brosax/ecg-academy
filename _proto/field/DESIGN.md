# Architecture C: activation field on a coarse anatomical heart

Throwaway prototype (`_proto/field/`). Nothing in `src/` imports it. Zero npm dependencies. Every `.ts` file uses erasable
syntax only and runs under Node 24 type stripping (`node gen.ts`).

```
node gen.ts [id ...]     # writes out/<id>.json + out/<id>.truth.json (10 s, fs 500, seed 1) and prints ms per condition
python -I ../harness/render.py out/<id>.json out/<id>      # out/<id>.png (3x4 + II strip), out/<id>-beat.png
node check.ts [id ...]   # measures the signals and compares them with the truth; exit code 1 on failure
```

## 1. The model: one source, one lead system

```
geometry (voxelised analytic heart posed in a thorax)          geom.ts
   -> node graph: myocardium, Purkinje, AV node/His/bundles,    model.ts
      Bachmann/CS bridges, accessory pathway, block lines
   -> event-driven eikonal activation with refractoriness       engine.ts
      and APD restitution (multi-source Dijkstra)
   -> per-node action-potential template (rest, amplitude,      ecg.ts
      notch, plateau slope, APD, phase-3 shape class)
   -> volume source = -sigma_i grad(Vm), with weights from      torso.ts
      a BEM torso through reciprocity (lead fields)
   -> electrode potentials RA, LA, LL, V1..V6 (9 numbers per sample)
   -> leads: I = LA-RA, II = LL-RA, III = LL-LA, aVR/aVL/aVF from RA/LA/LL,        synth.ts
      V1..V6 minus Wilson's central terminal (RA+LA+LL)/3
```

The only thing that differs between conditions is the parameter set `Params` (`model.ts`). A condition
(`conditions.ts`) is a function that takes the normal parameters and changes rhythm, conduction graph, regional AP/APD
or conduction-velocity maps, or geometry. No code anywhere draws or edits a waveform for one lead. The limb leads are
formed from the three limb-electrode potentials, so Einthoven and Goldberger hold exactly. `check.ts` verifies them on
every output file (max error 1e-5 mV, which is the JSON rounding).

### 1.1 Geometry (`geom.ts`)
* Local heart frame: LV = truncated ellipsoidal shell (endo 24/58 mm, epi 33/67 mm, cut at the base plane), RV =
  ellipsoidal crescent wrapped on the septum plus an RVOT tube to the pulmonary valve, RA and LA = ellipsoidal shells
  with SVC/IVC orifices, interatrial septal plane, and a fibrous AV ring (atrial voxels touching ventricular ones are
  removed). Voxel size h = 2.5 mm, which gives 12.9 k myocardial nodes (10.7 k ventricular, 2.2 k atrial) plus 2.6 k
  Purkinje nodes. The graph has 15.6 k nodes and 262 k edges.
* Per-node coordinates used by conditions: chamber, transmural depth `tm` (0 endo..1 epi), apex-base `ab`, angle
  around the LV long axis `th` (0 lateral, 90 anterior, 180 septal, -90 inferior), and surface flags (LV/RV endocardium,
  epicardium, septum, RVOT, Purkinje-eligible).
* Pose in the thorax: apex position, azimuth, elevation and roll of the long axis. These are calibrated (see 1.6).

### 1.2 Conduction graph and activation (`model.ts`, `engine.ts`)
* Myocardium: 26-neighbour edges. Travel time uses anisotropic slowness, with transverse/transmural speed vN = 0.33 m/s
  and in-wall speed vT = 0.61 m/s.
* Purkinje: a second layer over the Purkinje-eligible endocardium, with coverage per wall up to a calibrated apex-base
  height, speed 1.2/1.4 m/s (LV/RV), and Purkinje-muscle junctions (2 ms). An optional retrograde muscle-to-Purkinje
  coupling (`pmjRetro`, per ventricle) lets a late wave engage a resting network (RV in RBBB, LV in LBBB).
* Conduction system: AV node, His bundle, LBB and RBB, then left septal, anterior and posterior fascicles (root
  sites and delays are parameters). The RBB reaches the RV septum and the moderator band. Setting a fascicle delay to
  `null` blocks that fascicle.
* AV node: a gate with an effective refractory period, decremental AH delay (`ahMin + ahExt * exp(-(R - ERP)/tau)`),
  optional jitter and concealed penetration (AF), and retrograde concealment from the ventricles (AV dissociation in VT).
* Atria: isotropic speed vA, crista terminalis, Bachmann's bundle (chain of fast edges), coronary-sinus bridge
  (RA septum to inferior LA), fossa-rim bridge. Direct RA-LA contact along the septum is cut, so the interatrial routes
  are anatomical.
* Engine: event-driven multi-source Dijkstra with per-node refractoriness (ERP = fraction of the current APD) and APD
  restitution (APD = APDmax * (1 - A exp(-DI/tau))). For one wave on recovered tissue this is exactly the eikonal
  shortest-path solution. Repeated sources give re-entry, block, concealment and fibrillatory conduction for free.
  Special nodes (AV node) call back into JavaScript to decide whether a wave passes.

### 1.3 Action potential (`ecg.ts`)
Each node's normalised Vm, from activation time AT and its own APD, is

`Vm(tau) = r + (A - r) U(tau) - d N(tau) - plateau ramp - (A - r - ramp) S3(tau - APD)`

* U: upstroke, smeared over the voxel.
* N: phase-1 notch (spike-and-dome, used for Brugada).
* Ramp: linear phase-2 decline.
* S3: phase 3, a skewed logistic: it starts slowly and ends steeply, which makes T waves rise more gradually than they
  fall.

Five shape classes exist: ventricular, atrial, hyperkalaemic (steep), ischaemic, and Brugada RVOT epicardium.

Regional parameters (rest r, amplitude A, notch d, plateau slope, APD, class, speed scale) come from the normal
gradients:
* apex-base, `gAB`
* transmural, `gTM`, with the septum treated as endocardium
* LV vs RV, `gLV`

On top of these come the condition's modifiers. Each modifier is a soft 0..1 territory selector with target values.
The ventricular APD map is then smoothed electrotonically (2 Jacobi passes). Because Vm is a sum of shifted kernels,
the electrode potential becomes weighted event histograms convolved with a few kernels. That is the reason the
synthesis is O(activations x electrodes) and not O(nodes x samples).

### 1.4 Volume conductor and lead field (`torso.ts`)
* Homogeneous bounded elliptic-cylinder torso (half-width 160 mm, half-depth 112 mm), 1204 panels, collocation BEM
  with deflation, solved once by dense LU.
* Electrodes: RA/LA on the shoulders, LL low on the trunk, V1-V6 at standard chest positions (4th ICS parasternal,
  V4 at the 5th ICS mid-clavicular line, V6 mid-axillary).
* By reciprocity each electrode e gets a potential Z_e(x) at every heart node. The node weights are
  `W_e,n = TAU * h * sum over in-myocardium 6-neighbours (Z_e(b) - Z_e(n))`. Then `phi_e = sum_n W_e,n Vm_n` is the
  discrete form of `-integral sigma_i grad(Vm) . grad(Z_e) dV`. That is the equivalent-double-layer and dipole-density
  source with insulated heart boundaries, and it includes the proximity effect without a single-dipole approximation.
* The sum runs over intracellularly coupled neighbours only. The RA and LA walls touch along the interatrial septal
  plane, but the conduction graph does not couple them there (only Bachmann's bundle, the CS and the fossa rim do), so
  an RA/LA face is a no-flux boundary, like the AV ring. (Before the review it counted as coupled, which made a fully
  depolarised RA beside a resting LA a large spurious source.)
* Caches: the BEM coefficients and the node weights are cached in `cache/`, keyed by torso and geometry hashes.
  Conditions that change geometry (LVH, flutter dilatation if used) pay about 0.5-1 s once.

### 1.5 Truth (`synth.ts`)
Truth comes from the model's own timing, not from the signal:
* QRS onset: first ventricular activation.
* QRS offset: 99.5 % quantile of the activation times plus the upstroke kernel tail.
* T end: 90 % quantile of (AT + APD) plus 1.5 phase-3 widths.
* P onset: first atrial activation of the wave that reached the AV node.
* Rate: from ventricular beat onsets.
* Axis: net QRS deflection (largest positive + largest negative deflection, i.e. R - |S|) in I and aVF inside the
  model's QRS window, computed on the **ventricular part of the same source** (atrial node weights masked; a second,
  3-electrode synthesis pass). The QRS axis is a property of ventricular depolarisation, so flutter/fibrillation waves,
  the atrial T wave and a P wave that is not over at QRS onset (short PR) must not move it. Net deflection rather than
  net area: in balanced complexes (RBBB, pre-excitation) the area is close to zero and its sign was decided by the
  atrial T wave or the ST injury current, not by what a reader sees.

The two quantile thresholds were calibrated once against signal measurement (see 3). `check.ts` measures every
interval independently from the 12-lead signals and agrees within the tolerances: HR ±4 %, PR ±25 ms, QRS ±20 ms,
QT ±40 ms, axis ±20°.

`regions.activityAt(t)` returns, for 11 regions (RA, LA, AV node, His-Purkinje, septum, LV anterior/lateral/inferior/
apex, RV, RVOT), the fraction of nodes that are depolarised (0..1, falling with repolarisation), for the 3D heart view.

### 1.6 Calibration
`dbg_fit2.ts` runs one coordinate search over the shared normal-heart parameters:
* heart pose
* Purkinje coverage
* Purkinje and myocardial speeds
* fascicle roots and delays
* global gain

The search makes three hearts match textbook targets **at the same time**:
* normal: amplitudes per lead, QRS duration and axis
* complete RBBB: same heart with the RBB removed; small r, R' > r, terminal S in I and V6, QRS about 135
* complete LBBB: same heart with the LBB removed; QRS about 145, QS in V1, no septal q in I and V6

The bundle-branch blocks are therefore consequences of the normal model, not separately tuned morphologies. The
repolarisation gradients were then set by hand for normal T amplitudes, T axis and QRS-T angle. The base AV delay was
set for PR 160.

In the review the conduction system was re-fitted with `dbg_fit3.ts` (same idea, pose kept fixed): fascicle timing and
roots, Purkinje coverage and speeds, myocardial speeds, gain, and the RBBB retrograde-engagement delay. The new
objective adds the septal q in I/aVL/V6, a small r and no r' in V1 (normal), a small r with a broad R' > r and a
normal axis (RBBB), and lateral voltage (LBBB). It also enforces the physiological septal sequence: the left septal
fascicle fires first (22 ms after His), the right bundle 7 ms later, and only the mid/apical left septum carries
Purkinje (`purk.lvSept` 0.46). Without that constraint the search converged to a septum activated last, which gave
a good RBBB but a normal V1 without an r.

## 2. How each benchmark condition is parameterised

Values below are measured from the generated signals in mm at 10 mm/mV, with times in ms.

| id | parameter changes (all in `conditions.ts`) | result (after the review) | status |
|---|---|---|---|
| normal | none | HR 72, PR 151, QRS 94, QT 340, axis +47. Septal q I -0.5, aVL -0.7, V5 -0.7, V6 -1.8; V1 rS (r 1.6, S -9.9); transition V3-V4; R I 5.1, II 6.5, V5 10.4, V6 11.7; T upright I, II, aVF, V2-V6, inverted aVR; P +2.0 in II, +0.9/-0.3 in V1 | good. Small terminal notch (r' 1.1) in V1; axis on the low side of normal. |
| rbbb | `fasc.rbb = null`, retrograde RV Purkinje engagement (4.4 ms) | QRS 132; V1 rSR' (r 3.5, S -4.8, R' 6.4), R peak time 72 ms; V2 rSR' (R' 11); T inverted V1-V2; I R 4.0 with broad shallow S (-1.7, ~47 ms), V6 S -2.2; axis +31 | good. R' still narrower and spikier than real. |
| lbbb | left fascicles `null`; retrograde LV Purkinje engagement (10 ms); LV myocardial CV x0.8 | QRS 156; QS V1-V3 (-10.6/-21/-20) with ST elevation and T +7..+16; notched broad R V6 9.3 (R peak time 108 ms), M-shaped R in I and V5; no septal q; T inverted V6 (-2.6); axis +67 | good in V1-V3 and V6. Lateral limb voltage still low (R I 2.8, aVL 2.6); T flat in I and upright in V5 (not discordant). |
| anterior-stemi | proximal-LAD territory (`ladProx`): rest +0.17, plateau 0.72, APD -65 ms, CV x0.85 | J elevation V1 1.4, V2 2.6, V3 2.6, V4 2.3, V5 1.3, I 0.4, aVL 1.6; the ST rises into tall broad (hyperacute) T: V2 6.3, V3 6.7, V4 5.9; reciprocal II -2.4, III -2.8, aVF -2.6; QS in V1 | good |
| inferior-stemi | dominant-RCA territory (`rcaDom`): rest +0.22, plateau 0.50, APD -45, CV x0.85 | ST elevation II 2.0, III 4.3, aVF 3.2 (III > II); reciprocal I -2.3, aVL -3.3; V2-V6 ST depression -2.3 to -3.7; V1 +1.0 | good; V4-V6 depression larger than typical. |
| lvh-strain | LV epi radius +9 mm, length +8 mm; subendocardial plateau 0.88 with APD -55; subepicardial APD +25 | SV1 22.3 + RV6 21.9 = 44 (SV1+RV5 41); QRS 115; R peak time V5-V6 80; down-sloping ST and asymmetric T inversion I (-8), aVL (-4.5), V5 (-10), V6 (-13), also II/aVF; tall T V1-V3; axis +36; R aVL 7.1 | good. QRS slightly wide; aVL R < 11 mm; V1 QS. |
| wpw | accessory pathway: lateral mitral annulus (LA) -> basal lateral LV epicardium, 15 ms, ERP 280 | PR 89; delta wave in V2-V5, II, III, aVF; V1 positive delta, R-dominant (R 4.3 / S -1.4, notched); negative delta in I and aVL (pseudo-lateral q); QRS 156; T opposite to the delta in V1-V3 | good. QRS on the wide side; limb leads small. |
| brugada-type1 | RVOT + anterior RV subepicardium under V1-V2 selected in body coordinates below the pulmonary-valve level (outer 2/3 of the wall): notch 0.95, slow-dome class, APD +70 ms, CV x0.5 | V1 J +4.4 coved into T -3.4; V2 J +4.3 coved into T -4.4; V3 J +1.9 with upright T; no reciprocal depression in the limb leads | good. V3 mildly saddle-shaped. |
| aflutter | CCW macro re-entry: isthmus band blocked and replaced by one 110 ms unidirectional slow-zone edge whose exit is the CS ostium (`csAtExit`); crista terminalis line of block; RA vA 0.5 m/s, LA x1.6; atrial remodelling: LA +4 mm, wall 5 mm, APD 160 with a restitution floor; CS 10 ms; AV-node ERP 640 | regular atrial cycle 200 ms (300/min), 4:1 at 75/min, narrow QRS; F waves (atrial part) II -1.9/+1.2 mm, aVF -1.3/+0.9, III -1.0/+0.7 with a sharp downstroke and slow upstroke, no isoelectric baseline; V1 +0.8/-0.7 | good. F waves of 2-3 mm peak-to-peak; lead I as large as II. |
| hyperk | ventricles: steep-phase-3 class, APD x0.8, CV x0.8, extra epicardial APD shortening -30; atria: amplitude x0.45, CV x0.75; AV delay +30 | tall, peaked, narrow-based T V2 15.2, V3 15.4, V4 12.0, II 5.3; P 0.4-1.0 mm; PR 201; QRS 113; QT 285 | good. Low T in III/aVF/aVL/V1 still notched. |
| afib | 3 LA drivers + 1 RA free-wall driver (CL 145-175 ms, ±18 % jitter), atrial APD jitter; AV node ERP 500 with jitter and concealment | irregularly irregular, mean 97/min; no P waves; f waves ~1 mm peak-to-peak in II, III, aVF, V1, V2; narrow QRS, normal ST-T | good |
| vt | rhythm `vt`: LV exit zone (20 mm) on the mid inferolateral wall near the endocardium, CL 353 ms; the sinus node keeps firing at 80/min | 170/min regular, QRS 192, RBBB-like (positive V1-V3), rS/QS V6, superior north-west axis (-103), sinus P waves dissociated | good. QRS wider than the 160 target; sharp peaks in V2-V4. |

`check.ts`: all 12 conditions pass. For VT, QRS and QT boundaries are reported as "not scored": with RR < 2.2 x QRS
there is no isoelectric segment for the simple detector to anchor on.

## 3. Self-check (`check.ts`)

The check works only on `out/<id>.json` plus the truth file:
* Lead-system identities: III = II - I, aVR = -(I+II)/2, aVL = I - II/2, aVF = II - I/2 on every sample (max error
  1e-5 mV, the JSON rounding; on the in-memory Float32 leads it is 1e-7 mV, see `dbg_ident.ts`).
* QRS detection: high-passed 8-lead spatial velocity.
* Regular continuous atrial activity (flutter): the atrial cycle is estimated from the TQ segments (autocorrelation of
  the lead derivatives, accepted above r = 0.8). The QRS boundaries and the axis are then read on x(t) - x(t - CL),
  which subtracts the F wave of the previous atrial cycle, as a reader "marches out" the F waves.
* QRS boundaries: quiet-run thresholds relative to the local QRS velocity and to the background velocity of the P/PR and
  ST-T segments, so slurred QRS parts and delta waves count. The scored QRS duration is measured on the representative
  (QRS-aligned, signal-averaged) beat, so fibrillation waves and dissociated P waves average out.
* T end: tangent method on the lead with the largest T. A biphasic T (second lobe of opposite sign >= 35 % of the
  first, within 150 ms) ends after the second lobe.
* P onset: P-wave velocity (peak above 2 % of the QRS velocity). A truth interval that cannot be measured fails.
* Axis: net QRS deflections (max + min) in I and aVF, read against the TP level before the P wave (with a short PR the
  P wave is not over at QRS onset); with no isoelectric segment (VT) the net QRS area is used.

Measured values come out slightly longer than truth: QRS by about 10 ms, PR shorter by about 10 ms. Both are well
inside the tolerances.

## 4. Scaling to the ~80-condition catalogue

Everything is a parameter of one model, and almost every catalogue entry maps onto an existing knob or a new territory
selector:

| group | knobs |
|---|---|
| sinus rhythms, sinus arrhythmia, SA block, sinus arrest | `rhythm.sinus` rr, hrv, dropped SA events |
| ectopic atrial rhythm / atrial premature beats, wandering pacemaker | `atrialFocus` (any atrial site), extra external events |
| junctional rhythm/escape, junctional premature beats | external event at the His node (retrograde atrial activation follows from the graph) |
| 1st-degree AVB, Wenckebach, Mobitz II, 2:1, 3rd-degree AVB with junctional/ventricular escape | AV-node `ahMin`, `ahExt`, `tauDec` (decremental, so Wenckebach emerges), His-level block probability, escape focus |
| AF, flutter (typical CCW/CW, atypical), atrial tachycardia, MAT | rhythm generators already present; lines of block; driver count/CL; multiple ectopic foci |
| AVNRT, AVRT orthodromic/antidromic | dual AV-node pathways (two gate nodes); accessory pathway already present (antegrade or retrograde ERP) |
| PVCs (any site), bigeminy, couplets, NSVT, idioventricular/AIVR, monomorphic VT, polymorphic VT/TdP, VF | ventricular focus site + timing schedule; TdP = rotating focus/two competing foci with long-QT parameters; VF = several re-entrant drivers with steep restitution |
| RBBB/LBBB (complete/incomplete), LAFB, LPFB, bifascicular, trifascicular, nonspecific IVCD | fascicle delays (`null` = block, +n ms = incomplete); global CV scale |
| WPW (all pathway sites, intermittent) | accessory pathway `ventTh/ventAb`, delay, ERP |
| MI by territory and age: hyperacute -> acute STEMI -> Q waves -> T inversion -> aneurysm; NSTEMI/subendocardial; posterior; RV infarction | territory selectors (`ladProx`, `rcaDom`, plus LCx, D1, distal LAD, RV); age = sequence of parameter sets: hyperacute (APD shortening only), acute (rest/plateau shift), evolving (scar = non-excitable nodes, so Q waves emerge from the missing forces), chronic (scar + APD prolongation of border zone -> T inversion), aneurysm (persistent epicardial plateau shift) |
| LVH/RVH/biatrial enlargement, dilated LV, athlete heart | geometry (wall thickness, cavity radius, atrial size) + strain repolarisation modifiers |
| electrolytes and drugs: hypo/hyper-K, hypo/hyper-Ca, digoxin, class IA/IC/III, QT-prolonging drugs | AP class (phase-3 slope), APD scale, plateau slope (digoxin scooping), CV scale (IC), atrial amplitude, U wave (a delayed-repolarising Purkinje/M-cell class) |
| Brugada, LQT1/2/3, short QT, ARVC (epsilon), early repolarisation, hypothermia (Osborn J), pericarditis, Takotsubo, PE (S1Q3T3, RV strain) | regional notch/dome (J waves = epicardial notch, more inferolateral for early repol / global for hypothermia), APD maps (LQT), slow RV free-wall CV + late islands (epsilon), diffuse epicardial injury (pericarditis), RV dilatation + RV strain |
| pacing (AAI/VVI/DDD, CRT), pacemaker failure | external events at RA appendage / RV apex / LV lateral; the pacing spike is a recording-chain stimulus artefact (added to the electrode potentials, not to a lead) |
| electrode misplacement (LA/RA swap, LL/LA swap, V1-V2 high, precordial swaps), dextrocardia | electrode positions or limb assignment in the lead system; heart pose mirrored |
| artefacts: baseline wander, mains hum, muscle tremor, lost contact | recording chain applied to the 9 electrode potentials before the lead formation (so even the noise obeys Einthoven) |

### Continuous drill variation
Because every feature is a continuous parameter, a drill dial maps onto physiology:
* PR: AV-node `ahMin`, atrial speed.
* QRS duration: myocardial and Purkinje CV scale, fascicle delays.
* QRS axis: heart roll/elevation within the physiological range, or LAF/LPF delay for hemiblocks.
* QTc: `apd0` with restitution, so QT shortens with rate automatically and QTc stays consistent.
* Rate: rr / focus CL.
* ST shift: injury rest/plateau magnitude.
* T amplitude: transmural gradient.
* Voltage: wall thickness, or torso size as the "body habitus" knob.

Seeded per-patient jitter (pose ±10°, speeds ±5 %, gradients ±10 %, torso ±10 %) gives endless, reproducible
variants. Truth is always recomputed from the model.

## 5. Performance

Measured on Node 24 on this laptop. 10 s, fs 500, 12 leads.

* Mean 0.86-0.90 s per condition in `gen.ts` after the review (0.64-1.27 s; LVH, AF, VT and flutter are the slowest because
  of their geometry rebuild or their many activation events). The truth axis costs one extra 3-electrode synthesis
  pass (about 0.1-0.2 s).
* Breakdown: model build (voxelise + graph) 350-430 ms; activation 300-650 ms (250 k-600 k events);
  synthesis 200-1000 ms (9 electrodes x 5 kernel classes, 1 ms grid).
* One-off costs: BEM solve about 1 s; node weights per geometry about 0.5-1 s. Both are cached on disk.
* For the app:
  * the browser has no `node:fs`: precompute the BEM coefficients and node weights (9 x 13 k, Float32 is enough) at
    build time and ship them in the bundle (about 0.5 MB);
  * cache the built geometry/graph per pose (regional parameters only re-weight edges);
  * generate on a worker;
  * synthesize at 2 ms;
  * restrict synthesis to the displayed window.

  Together these should bring it to about 150-300 ms per 10 s 12-lead in a browser. The model (13 k nodes, 262 k edges)
  is about 4 MB of typed arrays.

## 6. Known limitations and morphology failures still present (after the review)

1. **Limb-lead voltage is modest** (normal R I 5.1, II 6.5 mm; LBBB R I 2.8 mm) while the precordial leads are at
   textbook size. The homogeneous torso (no lungs, no blood-cavity contrast) and the coarse heart give too small a
   limb/precordial ratio; a larger gain would make V2-V4 too large.
2. **LBBB**: lateral limb leads are small (R I 2.8, aVL 2.6) and the T wave is flat in I and upright in V5, so the
   discordant ST-T is shown only in V6 (and V1-V3). The notched lateral R comes from retrograde engagement of the left
   Purkinje network; its notches are sharper than real.
3. **RBBB**: R' is still narrower and spikier than real (retrograde RV Purkinje engagement, 4.4 ms); without it the R'
   is broad but smaller than r.
4. **VT**: QRS 192 ms (target about 160) with sharp peaks in V2-V4 (proximity of the apex to V3/V4); engaging the
   Purkinje network narrows it but makes the spikes and the amplitudes worse.
5. **Hyperkalaemia**: the low-amplitude T in III, aVF, aVL and V1 is notched/bifid. It comes from the thin RV wall
   (1-2 voxels) whose endo- and epicardial nodes repolarise ~20-30 ms apart with opposite lead weights; the tall
   precordial T itself depends on that RV epicardial APD shortening. Smoothing repolarisation TIMES electrotonically
   (tested in the review) kept the notch and flattened the peaked T, so it was not kept.
6. **Inferior STEMI**: V2-V6 ST depression (-2.3 to -3.7 mm) is larger than usual; it is insensitive to the extent of
   the RCA territory, i.e. it comes from the pose (the AHA inferior wall faces down-right-posterior) and the border-zone
   field near V4-V5.
7. **Flutter**: F waves are 2-3 mm peak-to-peak in II (textbook range but on the small side) and lead I is as large
   as II (typically flatter). The isthmus is a lumped delay edge, not a slow tissue strip, and its exit is placed at
   the CS ostium by the flutter condition (`csAtExit`); the sinus-rhythm CS ostium is still the older, more posterior
   site.
8. **LVH**: QRS 115 ms (target 100-110), R aVL 7 mm (< 11), V1 QS. A left-anterior-fascicular delay gives R aVL 12 and
   a leftward axis but a qR in aVL and QRS 120, so it was not used.
9. **Normal**: a small terminal notch (r' 1.1 mm) remains in V1; axis +47 (normal, on the low side of the +60 target).
10. **WPW**: QRS 156 ms (wide for pre-excitation); limb leads small.
11. The AV node is a phenomenological gate, not a tissue (no dual-pathway physiology yet).
12. `regions.activityAt` is depolarised fraction only (no separate depolarising/repolarising channels); His-Purkinje
    lights up mostly during the QRS because Purkinje nodes outnumber the His/bundle nodes.
13. The truth axis of the STEMIs includes the injury current that starts inside the QRS window (that is what the signal
    shows); it is normal (+32, +41) for both.

## 7. Files

* `geom.ts` heart geometry.
* `model.ts` parameters, graph, activation driver.
* `engine.ts` event-driven eikonal engine and PRNG.
* `ecg.ts` AP kernels and synthesis.
* `torso.ts` BEM torso and lead weights.
* `synth.ts` public `generate()`, truth, regions.
* `conditions.ts` the benchmark conditions.
* `gen.ts`, `check.ts`.
* `measure.ts`: legacy fiducial helpers used by the dev scripts.
* `dbg_*.ts`, `*.py`: development probes used during calibration:
  * `dbg_fit2.ts` multi-condition fit (pose), `dbg_fit3.ts` review re-fit of the conduction system (log in
    `out/dbg/fit5.log`);
  * review probes: `dbg_flw.ts` (F waves from the atria only + sinus P), `dbg_fdip.ts` (atrial dipole), `dbg_fseq.ts` /
    `dbg_fsite.ts` / `dbg_fband.ts` (flutter circuit map, landmarks, isthmus band), `dbg_atria.ts` (atrial layout),
    `dbg_bb.ts` / `dbg_qrs.ts` (bundle-branch and QRS morphology metrics), `dbg_lb.ts` / `dbg_rb.ts` / `dbg_hk.ts` /
    `dbg_af.ts` / `dbg_stemi.ts` (condition variants), `dbg_axis.ts` (axis definitions), `dbg_ident.ts` (identities
    and interface on the in-memory leads);
  * `dbg_m.ts` per-lead table;
  * `dbg_reg.ts` region contributions;
  * `dbg_terr.ts` and `dbg_brug.ts` territory search;
  * `dbg_amap.ts` + `amap.py` atrial activation maps;
  * `dbg_avcg.ts` atrial dipole.
* `cache/`: BEM and weight caches plus fit logs. Safe to delete.

Reference for criteria and terminology: Castellano, Pérez de Juan, Attie, *Electrocardiografía Clínica*, 2nd ed.,
Elsevier 2004. No text or figures are reproduced.

## 8. Review (fresh-eyes pass)

**Method.** `node gen.ts`, the harness renders (`out/<id>.png`, `out/<id>-beat.png`) and `node check.ts` were re-run;
every 12-lead and beat plot was read against the benchmark criteria; amplitudes were measured with `dbg_m.ts`
(mm at 10 mm/mV, durations in ms); Einthoven/Goldberger were verified numerically on the JSON (`check.ts`, max error
1e-5 mV = rounding) and on the in-memory Float32 leads (`dbg_ident.ts`, max error 1e-7 mV). The one-source rule was
kept throughout: every change below is a rhythm, conduction-graph, regional AP/APD/CV, geometry or volume-conductor
change; no lead is edited anywhere.

### 8.1 Deviations found (state as handed over)

| condition | lead(s) | feature | expected | seen |
|---|---|---|---|---|
| aflutter | II, III, aVF | F-wave polarity and size | negative saw-tooth, 2-5 mm, no isoelectric line | ±0.4 mm in II, positive-dominant (III +1.0/-0.6) |
| aflutter | V1 | F waves | positive discrete waves | ±0.3 mm, not discrete |
| aflutter | - | atrial sequence | LA activated caudo-cranially from the CS | CS ostium reached only 69 ms after the isthmus exit; LA activated top-down from Bachmann's bundle |
| all (P waves) | - | volume source | RA/LA coupled only where the graph couples them | the RA/LA septal contact counted as coupled tissue: a depolarised RA beside a resting LA was a large source |
| normal | I, aVL | septal q | small q | none (q 0.0) |
| normal | V1 | rS | r 1-3 mm, no r' | r 0.9, terminal r' 0.9 (rSr') |
| normal | all | QRS | ~90 ms | 101 ms; S in I -2.8 mm (large terminal rightward force) |
| normal | limb | voltage | R II ~8-12 mm | R II 5.8, R I 4.2 |
| rbbb | V1 | rsR' | r small, R' > r, broad | r 5.4, R' 6.9 narrow spike (~25 ms) |
| rbbb | I, aVF | frontal axis | normal | +167° (R in I 2.0 < S 3.5) |
| lbbb | I, aVL, V5, V6 | broad notched R | R 10-15 mm | R I 3.0, aVL 2.5, V5 5.2, V6 4.5; narrow spikes in I/V5 |
| lbbb | I, V5 | discordant ST-T | T inverted | T upright (I +1.4, V5 +4.8) |
| anterior-stemi | V2-V4 | hyperacute T | ST elevation rising into tall broad T | flat-topped "tombstone" plateau (ST 3.7-3.8 mm = T level) |
| anterior-stemi | II, III, aVF | reciprocal depression | present, smaller than the elevation | -3.4/-4.0/-3.7 mm (as deep as the elevation) |
| anterior-stemi, inferior-stemi | I, aVF | truth axis | normal | -80° / +104° (injury current and area method) |
| inferior-stemi | V4-V6 | ST | at most mild change | -2.5 to -3.7 mm depression |
| lvh-strain | - | wall | moderate hypertrophy | 21 mm wall needed for SV1+RV6 = 40 |
| lvh-strain | aVL | R / axis | tall R, leftward axis | R 2.7 mm, axis +48 |
| wpw | V1 | dominant R (type A) | R > S, clear delta | R 3.0 then S then R' (RSR'), small |
| wpw | I, aVL | delta | negative delta (left lateral pathway) | not visible |
| wpw | - | truth axis | ventricular axis | -85° (P wave still running at QRS onset entered the area) |
| brugada-type1 | V2 | coved type 1 | coved | saddle (fixed in the interrupted first review pass: substrate selected in body coordinates under V1-V2, below the pulmonary valve) |
| hyperk | III, aVF, aVL, V1 | T shape | smooth | notched/bifid |
| afib | V1 | f waves | best seen in V1 | 0.6 mm peak-to-peak (II 1.2) |
| vt | all | QRS | ~160 ms | 189 ms; sharp peaks in V2-V4 |
| check.ts | - | robustness | measures what a reader measures | area axis meaningless for balanced QRS; flutter/f waves inflate the QRS; biphasic T ends read too early |

### 8.2 What was fixed

* **Flutter** (the largest failure). The isthmus exit is now the CS ostium (`csAtExit`), so the wave leaving the
  isthmus enters the LA through the CS at once and the LA is activated caudo-cranially together with the ascending RA
  septum; the LA conducts at normal speed (x1.6 of the slowed RA), the LA is mildly dilated, the atrial walls are 5 mm
  and the atrial APD is 160 ms (the isthmus delay is 110 ms to keep the cycle at 200 ms). Together with the RA/LA
  no-flux fix below: II -1.9/+1.2 mm with a sharp downstroke and slow upstroke, aVF -1.3/+0.9, III -1.0/+0.7, V1
  positive-dominant, 300/min, regular 4:1 at 75/min.
* **Volume source**: RA/LA septal faces are no-flux (section 1.4). Each chamber's dipole now returns to zero when it
  is fully depolarised. Sinus P changed only slightly (II 2.3 -> 2.0 mm, V1 +0.9/-0.3).
* **Conduction-system re-fit** (`dbg_fit3.ts`, section 1.6), with the left septum activated first:
  * normal: septal q in I/aVL/V5/V6, rS in V1 (r 1.6), QRS 94, S in I -1.4, R II 6.5;
  * RBBB: r 3.5 < R' 6.4, R' broader, broad shallow S in I, normal axis (+31);
  * LBBB: QRS 156, V6 R 9.3.
* **LBBB condition**: retrograde engagement of the intact distal left Purkinje network (10 ms) and LV CV x0.8. This
  gives the broad notched (M-shaped) lateral R, R peak time V6 108 ms, and T inversion in V6, with QS and tall T in
  V1-V3.
* **Anterior STEMI**: the APD shortening is the main effect (hyperacute phase): rest +0.17, plateau 0.72, APD -65. The
  ST (2.3-2.6 mm in V2-V4) now rises into tall broad T waves (5.9-6.7 mm), and the reciprocal depression is smaller
  (-2.4 to -2.8 mm).
* **LVH**: wall +9 mm instead of +12 for SV1+RV6 = 44 mm; aVL R 7.1 with strain, axis +36.
* **WPW**: the pathway inserts at the basal lateral LV (th 0) with 15 ms delay. PR 89; V1 R-dominant with a positive
  delta; negative delta in I and aVL (pseudo-lateral q); delta wave clearly visible in V2-V5, II, III, aVF.
* **AF**: one RA free-wall driver added to the three LA drivers, so the f waves are ~1 mm in V1/V2 as well as in the
  inferior leads.
* **Truth axis**: now the net QRS deflection of the ventricular source (section 1.5). It is normal for RBBB (+31),
  both STEMIs (+32/+41) and WPW (+90); VT is -103.
* **check.ts**:
  * F-wave cycle subtraction (flutter);
  * QRS duration on the representative beat (AF);
  * net-deflection axis read against the TP level (short PR), with net area when there is no isoelectric segment
    (VT);
  * biphasic-T end;
  * a truth value that cannot be measured on the signal now fails instead of being skipped. The hyperkalaemia PR had
    silently gone unmeasured; the P-detection floor is now 2 % (was 3 %) of the QRS velocity, so the flat
    hyperkalaemic P is found (PR 186 measured vs 201 truth);
  * per-beat listing with `CHECK_VERBOSE=1`.

  All 12 conditions pass; identities hold to 1e-5 mV in the JSON and 1e-7 mV in memory.

### 8.3 What still deviates
See section 6, items 1-10. In order of teaching impact:
1. LBBB lateral limb voltage and the missing T inversion in I/V5.
2. RBBB R' is spiky.
3. The low-amplitude T in III/aVF/aVL/V1 is notched in hyperkalaemia.
4. Inferior STEMI ST depression in V4-V6.
5. Modest limb-lead voltage overall.
6. VT QRS is wider than the target.
7. Flutter F waves are on the small side, and lead I is too large.
8. LVH: QRS 115 and aVL R 7.
