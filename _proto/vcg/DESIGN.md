# Architecture B — parametric VCG kernels → Dower lead system

Throwaway prototype (`_proto/vcg/`). Zero dependencies, erasable TypeScript, runs with Node 24 type stripping.

```
node gen.ts [id …]        # 10 s, 500 Hz, seed 1 → out/<id>.json + out/<id>.truth.json, prints ms per ECG
bash render-all.sh [id …] # ../harness/render.py → out/<id>.png (3×4 + II strip) and out/<id>-beat.png
node check.ts [id …]      # measures the signals independently and compares with truth + textbook criteria
../../node_modules/.bin/tsc --ignoreConfig --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext \
  --allowImportingTsExtensions --erasableSyntaxOnly --noUncheckedIndexedAccess --types node gen.ts check.ts   # passes
```

| file | role |
|---|---|
| `kernels.ts` | kernel shapes (bump / plateau), timing edges, cumulative area (for the 3D state), region names |
| `leads.ts` | forward Dower rows, electrode lead vectors, near-field term, electrode positions, 12-lead assembly, inverse Dower / Kors (checking only) |
| `model.ts` | atrial and ventricular "morphologies" built from kernels; ventricular-gradient rule for T; rate adaptation |
| `conditions.ts` | the 12 benchmark conditions as `normal` + overrides |
| `synth.ts` | `generate()` — rhythm clocks → kernels → H(t) and electrode potentials → leads; truth; `regions.activityAt` |
| `measure.ts`, `criteria.ts`, `check.ts` | signal-side delineation, per-lead features, textbook criteria |

## 1. One source, one lead system

The whole heart is one time-varying source description: a list of kernels. Each kernel is

```
amp · f(t) · d(t)        f: unit-peak shape with compact support, d: unit 3-D direction (Frank X left+, Y inferior+, Z posterior+)
```

with anatomical region tags (`SAN RA LA AVN HIS_BB IVS RV RVOT LV_ANT LV_LAT LV_INF LV_APEX LV_BASE`, each with a weight)
and a role (`depol`, `repol`, `none`).

* **bump**: `f = (1 − |u|^q)^3`, asymmetric (separate left/right half-widths). Authoring uses clinical edges: `on` is the
  2 % level, `end` is the 2 % level or, for T waves, the tangent-method end (the point where the tangent at the steepest
  descent meets zero). So the truth timing *is* what a reader measures. `q = 2` is the default smooth lobe; `q < 2`
  gives a pointed apex (tented T of hyperkalaemia, `q = 1.35`). Optional `dir → dir2` rotation across the support.
* **plateau**: smootherstep rise, flat top, smootherstep fall (injury currents).

Heart vector and electrode potentials (`synth.ts › render`):

```
H(t)   = Σ_k amp_k f_k(t) d_k(t)                                (far field, ordinary kernels)
Φ_e(t) = L_e · H(t) + Σ_{k localised} amp_k f_k(t) d_k(t) · g_e(r_k, far_k)
I = Φ_LA − Φ_RA,  II = Φ_LL − Φ_RA,  III = Φ_LL − Φ_LA,  aVR = Φ_RA − (Φ_LA+Φ_LL)/2, …,  Vk = Φ_Vk − (Φ_RA+Φ_LA+Φ_LL)/3
```

Every lead comes from the same nine electrode potentials, so Einthoven/Goldberger hold exactly (max |error| 1e-7 mV =
float32 rounding, verified by `check.ts`) and V1–V6 are referenced to Wilson's central terminal. No lead is ever
computed, drawn or edited on its own.

### Lead vectors (`leads.ts`)

Forward Dower rows (WCT-referenced, Frank axes), from G. E. Dower's patent US 5,711,304 (lead = a·X + b·Y + c·Z):

| lead | X | Y | Z |
|---|---|---|---|
| I | 0.632 | −0.235 | 0.059 |
| II | 0.235 | 1.066 | −0.132 |
| V1 | −0.515 | 0.157 | −0.917 |
| V2 | 0.044 | 0.164 | −1.387 |
| V3 | 0.882 | 0.098 | −1.277 |
| V4 | 1.213 | 0.127 | −0.601 |
| V5 | 1.125 | 0.127 | −0.086 |
| V6 | 0.831 | 0.076 | 0.230 |

These rows are an empirical, torso-corrected lead field (Frank image surface): they already contain the inhomogeneous
torso and the average proximity of the chest electrodes. Electrode-level lead vectors are recovered in the WCT gauge
(Φ_RA + Φ_LA + Φ_LL = 0): `L_RA = −(L_I + L_II)/3`, `L_LA = L_RA + L_I`, `L_LL = L_RA + L_II`, `L_Vk = Dower Vk`.

Why the forward rows and not "inverse Dower" or Kors for synthesis: those two published matrices map 12 leads → VCG
(3×8); the VCG → 12-lead direction is Dower's forward matrix (8×3), of which inverse Dower is the least-squares
pseudo-inverse (agreement within 0.004 per coefficient). Synthesising through a pseudo-inverse of Kors would also work,
but Kors is a QRS-loop regression and reproduces 12-lead amplitudes less well. The published 12-lead → VCG
matrices are used for checking only: inverse Dower (Edenbrandt L, Pahlm O. J Electrocardiol
1988;21:361–367) and Kors (Kors JA et al. Eur Heart J 1990;11:1083–1092), both stored in `leads.ts`. `check.ts`
reconstructs H(t) from the 8 independent leads with inverse Dower and re-projects it through the forward rows: the
residual is 0.1 % for the purely dipolar conditions (AF, flutter: the two published matrices are consistent with each
other), 0.8–2.3 % for the sinus conditions (the small non-dipolar part of the P/Ta, which since the second review pass
uses the atrial centroid below) and 19 % for Brugada, which is exactly the non-dipolar near-field content that a single
dipole cannot carry. (The Kors "residual" of 15–40 % is not an error: Kors is a QRS regression, not the inverse of
Dower.)

### Near-field (non-dipolar) term

A kernel may carry a source location `r` (cm, Frank axes, origin = ventricular centroid) and a far-field weight `far`:

```
g_e = κ [ (x_e − r)/|x_e − r|³ − far · x_e/|x_e|³ ]        and only far·(moment) is added to H(t)
```

* `far = 1`: the dipole lives in H(t) (Dower) and g adds only the proximity correction (off-centre minus centred
  infinite-medium potential).
* `far = 0`: the source is a small eccentric dipole seen through its full infinite-medium potential: large at the nearest
  electrodes, ~1/d² elsewhere, absent from H(t). Used for the Brugada RVOT source.
* Atrial lead field (`far = 1`, second review pass): every sinus atrial kernel (P lobes and Ta) carries the atrial
  centroid `REGION_POS.ATRIA` = (−2, −3, 2.25) cm, the midpoint of the RA and LA centroids, posterior-superior to the
  ventricular centroid the Dower rows were fitted for. The chest electrodes then see the atria from further away, so
  the P is no longer taller in V3–V4 than in II (`AtrialMorph.loc`; flutter and AF lobes can take the same `loc` but do
  not yet, see §8.5).

κ = |L_V2|·|x_V2|² (68.7 cm²) is chosen so that a centred infinite-medium dipole reproduces the Dower V2 lead-vector
length at the V2 electrode. Electrode positions are landmark estimates (no public table exists):

| electrode | X | Y | Z | landmark |
|---|---|---|---|---|
| V1 | −4.5 | −0.5 | −7.0 | 4th ICS right sternal border |
| V2 | −0.5 | −0.5 | −7.0 | 4th ICS left sternal border |
| V3 | 3.0 | 1.0 | −6.5 | midway V2–V4 |
| V4 | 6.5 | 2.5 | −5.5 | 5th ICS mid-clavicular |
| V5 | 10.5 | 2.5 | −2.5 | anterior axillary, V4 level |
| V6 | 13.5 | 2.5 | 2.5 | mid-axillary, V4 level |
| RA / LA / LL | (−18.5,−16,0) / (13.5,−16,0) / (6,30,0) | | | limb–trunk junctions |

The term acts on electrode potentials by electrode position; it never edits a lead.

### Geometry and recording chain

Electrode misplacement is a cable permutation (`opts.hookup`, e.g. `{RA:'LA', LA:'RA', LL:'LL'}`); `check.ts` verifies
that the RA/LA swap inverts I, swaps II↔III and aVR↔aVL and leaves V1–V6 untouched. No noise or filters are applied in
this prototype (see §6).

## 2. Physiology encoded in the kernels (`model.ts`)

**Atria.** P = RA lobe (inferior-leftward, slightly anterior, 0–72 ms) then LA lobe (leftward-posterior, 32–104 ms),
both seen through the atrial lead field of §1 → P axis ≈ +55°, tallest P in II (1.5 mm), 0.9–1.0 mm in V2–V6, biphasic
P in V1 (+0.6/−0.7 mm). Atrial repolarisation (Ta) is a long, low lobe whose area is −0.45 × the P area vector (same
atrial location), so the PR segment and early ST carry the physiological Ta.

**Ventricles.** QRS = 4 lobes in the normal heart: septal L→R (0–27 ms, rightward-anterior → septal q in I, aVL, V5,
V6 and r in V1), anteroapical + RV (8–50 ms), LV free wall (22–68 ms, the dominant leftward-inferior-posterior force),
posterobasal + RVOT terminal (52–90 ms).

**Ventricular gradient.** T is not authored per condition. Each ventricular morphology stores the ventricular gradient
G = ∫QRST H dt (Wilson 1934; Burger 1957), which depends on the action-potential-duration map, not on the activation
sequence. The T area vector is A_T = G − A_QRS (+ c·A_QRS, see coupling below), turned into one T kernel with the
authored timing. Consequences:

* Pure activation changes (RBBB, LBBB, WPW, ectopic beats) produce the correct **secondary, discordant** ST–T
  automatically, with the normal G.
* Primary repolarisation changes edit G or the T shape: LVH strain (G × 0.25), hyperkalaemia (larger, narrow, tented T),
  hyperacute T in STEMI (G pulled toward the injured wall).
* `coupling c` (default 0): electrotonic interaction makes late-activated muscle repolarise relatively earlier, so the
  secondary T is (1 − c)·A_QRS instead of A_QRS. Used only for VT.

**Rate.** The QT (everything after the QRS) scales with Fridericia's cube root of the preceding RR relative to the
morphology's `rrRef`.

**Injury currents.** Plateau kernels from early QRS to late T, directed toward the injured wall (anterior / inferior).
They shift the TQ-to-ST difference in every lead consistently (elevation facing the wall, reciprocal depression opposite).

**Conduction system.** Silent kernels (amp 0) for SAN, AVN and His–bundle branches: they move the 3-D state but are, as in
reality, invisible on the surface ECG.

**3-D state (`regions.activityAt`).** For each region, Σ (depol weight × cumulative area of its depol kernels) −
Σ (repol weight × cumulative area of its repol kernels), clipped to [0, 1]: 0 = resting, rising while the region's
lobes are on, 1 = depolarised, falling with its T/Ta. `check.ts` verifies boundedness and that the ventricles are 0 before
the QRS, ≈1 after it and back to 0 after the T.

## 3. Rhythm clocks (`synth.ts › schedule`)

* **sinus**: RR = 60000/rate · (1 + hrv·sin(2πt/4.2 s)) + 4 ms noise (respiratory arrhythmia); P → QRS after the PR.
* **atrial fibrillation**: three wavelet streams (lateral RA, septal RA, LA) of comparable amplitude; each is a renewal
  process of contiguous biphasic cycles (cycle ~N(128–160, 30–35 ms)), direction random-walking around the stream mean,
  amplitude random-walking within a range, so the superposed f waves are irregular in rate, shape and size.
  Ventricular RR is log-normal (mean 600 ms, nominal CV 0.26 before truncation, min 360 ms), independent of the f waves.
* **flutter**: one 200 ms macro-reentrant cycle of four overlapping lobes (CTI slow drift → septal ascent → RA roof →
  lateral-wall descent), conducted every Nth cycle with a fixed F–R interval. Each cycle also carries its atrial
  repolarisation: one broad lobe (≈ 2 cycles wide) whose area is −`taRatio` × the cycle's depolarisation area. In a
  steady re-entry every cell depolarises and repolarises once per cycle, so the net area per cycle is ~0; the
  overlapping lobes sum to an almost flat level that cancels the DC the depolarisation lobes alone leave (shape and
  timing of the F waves are unchanged).
* **VT**: two independent clocks (ventricular focus 170/min; sinus 80/min with its own jitter) → AV dissociation.

All randomness is seeded (`rng.ts`, mulberry32 with named sub-streams so adding one draw never shifts another stream).

## 4. Truth

Truth comes from the model's own timing: P onset = first atrial lobe's `on`; QRS on/off = first `on` / last `end` of the
ventricular lobes; T end = tangent-method end of the T kernel; HR from the clock's RRs; QRS axis = atan2 of the net QRS
area in aVF and I over the model's QRS windows of the generated signal (hexaxial convention, includes anything
superimposed, as a reader would). `check.ts` measures the same quantities from the signals alone and agrees within
HR ±2/min, PR ≤ 10 ms, QRS ≤ 6 ms, QT ≤ 11 ms, axis ≤ 2° on all 12 conditions (RR intervals are measured between
QRS energy peaks, so a dissociated P wave sitting on a QRS onset does not create false RR jitter; the QRS onset stops at
the slope minimum where a P wave hands over to a delta wave, searched on a ±1-sample smoothed slope and only before the
high-curvature QRS body, so it neither vanishes in the ±3-sample smoothing nor fires inside a broad LBBB QRS).

## 5. The 12 benchmark conditions (`conditions.ts`)

Every condition is `normal` plus overrides of rhythm, activation lobes, repolarisation (G / T timing / shape), injury
or near-field sources. Measured values are from `node check.ts` (10 mm/mV).

| id | what changes | key measured result |
|---|---|---|
| normal | — (calibrated base: 72/min, PR 160, QRS 90, QT 380) | axis +64°, P +55°, T +40°; P 1.5 mm II (tallest), 0.9–1.0 mm V2–V6, +0.6/−0.7 mm V1; q in I aVL V5 V6; rS V1; transition V3–V4; SV1+RV5 25 mm |
| rbbb | RV lobe removed from the early QRS; transseptal L→R breakthrough lobe 18–72 ms (anterior); slow RV free wall + RVOT lobe 46–142 ms (rightward-anterior, slightly superior) | QRS 142, rsR′ "M" V1 (r 3.6, s −6.5, R′ 8.3 mm) and V2 (8.7/−2.5/10.5), RPT V1 92 ms, broad S I/aVL/V5/V6 60/38/66/70 ms, T −4.0 / −2.6 mm V1/V2, axis +85° |
| lbbb | no left-septal start; small right-septal/RV lobe; slow septum R→L (≈ 56° posterior of +X) and LV free-wall (≈ 44° posterior, slightly inferior) lobes, overlapping → broad flat-topped/notched R; terminal posterobasal lobe aligned with the free wall | QRS 150, no q I/V5/V6, RPT V5 102 ms, rS V1–V3 (S 10–22 mm), V4 broad R 9 mm (transition), ST↑+T↑ V1–V3 (T 9–12 mm), ST↓+T↓ I aVL V5 V6 (T −2.2/−3.1/−1.6/−3.7 mm), II broad R 4.6 mm, axis −4° — compare `../harness/real-lbbb.png` (see §10) |
| anterior-stemi | anterior injury vector (plateau, −Z, slightly left & superior); G pulled anterior; smaller septal/anterior lobes | J ↑ V1–V4 1.4–3.1 mm, reciprocal ↓ III aVF, hyperacute T V2–V4 12–17 mm |
| inferior-stemi | inferior injury vector, slightly rightward and posterior (RCA with inferoposterior extension); G pulled the same way | J ↑ II 1.4, III 2.2, aVF 1.8 mm (III > II); ↓ I −0.7, aVL −1.5 mm; ST ↓ V1–V3 (J −0.6/−1.5/−1.9 mm), V5–V6 ≈ isoelectric |
| lvh-strain | larger, longer, more posterior LV free-wall lobe (2.6 mV, 20–90 ms); G × 0.25 (primary strain) with early-starting T | SV1 + RV6 45 mm, R aVL 11.8 mm, QRS 100, RPT 54 ms, asymmetric T↓ I aVL V5 V6, axis −24° |
| wpw | delta lobe from the left lateral base starting 100 ms after P onset (slow), fused with AV-nodal activation | PR 100, delta in all leads (slow initial 30 ms), dominant R V1 (type A), QRS 124, secondary ST–T |
| brugada-type1 | two near-field (`far = 0`) RVOT epicardial sources between V1 and V2: dome-loss lobe (anterior, 64–290 ms) then delayed-repolarisation lobe (reversed, 170–420 ms) | coved J ↑ 3.2/3.1 mm V1/V2 into T −2.8/−2.0 mm; V3 J −0.3 mm; no lead with reciprocal ↓ > 0.5 mm |
| aflutter | flutter clock (200 ms, 4 lobes: slow CTI drift, narrow septal ascent, RA roof, lateral descent) + atrial repolarisation per cycle (`taRatio` 1), 4:1 | F waves 3.4 mm in II, 4.8 mm in III, downward excursion 2.3× upward in II/III/aVF (slow descent → sharp trough → fast upstroke, no isoelectric baseline), F-train mean 0.0 mm, discrete positive F in V1 (2.4 mm), ventricles 75/min |
| hyperk | QRS stretched ×1.22, P stretched ×1.2 and ×0.4 amplitude, PR 205, narrow tented T (q = 1.35, larger G) | T 11–15 mm V2–V4, symmetric, FWHM 68 ms; P 0.6 mm in II; QRS 110; QT 318 (QTc 354) |
| afib | AF clock (no P, three wavelet streams) | RR CV 17 %, mean 100/min, f waves 1.2 mm in V1 at ≈146 ms cycle (zero crossings), narrow QRS |
| vt | LV inferoapical exit (slow) → LV-septum-RV wavefront → basal/RVOT terminal; G × 0.2, coupling 0.7, T end 312 ms; independent sinus clock (80/min) | 170/min regular, QRS 162 (measured 167 independently), monophasic R V1 11.5 mm, QS II III aVF V5 V6, axis −102°, QRS:T ≈ 3:1 in II and V6, sinus P notches visible on some ST–T segments |

## 6. Scaling to ~80 catalogue conditions

The architecture separates five orthogonal "knob sets"; most catalogue entries are a new value of one or two of them.

| family | knobs | examples |
|---|---|---|
| rhythm clocks | event scheduler (sinus, ectopic insertion with coupling interval / compensatory pause, renewal processes, independent clocks, N:1 / Wenckebach conduction rules) | sinus brady/tachy/arrhythmia, pauses, SA block, PAC, PVC (+ bigeminy), junctional (retrograde P lobes), AVNRT (pseudo-r′ V1), AVRT, atrial tachycardia, MAT (several atrial morphs drawn at random), AF fine/coarse, flutter 2:1/variable/atypical (other lobe sets), 1° / Mobitz I / Mobitz II / 2:1 / 3° AV block (independent clocks + escape morph), VF (renewal process on ventricular lobes), torsades (VT with `dir → dir2` axis rotation modulated beat to beat), AIVR |
| activation lobes | per-region timing, width, direction, amplitude; removal = loss of forces | LAFB / LPFB (rotate initial vs main forces), bifascicular (compose RBBB + LAFB lobes), IVCD (`stretch`), incomplete RBBB, WPW by pathway site (delta direction table), old MI by territory (shrink / remove that region's lobes → Q waves), poor R progression, HCM (big septal lobe → deep narrow q), RVH (late rightward-anterior lobe), biventricular, dextrocardia (geometry: mirror X), LAE / RAE (P lobe widths and amplitudes), pacing (stimulus spike as a 1-sample recording-chain event + paced activation lobes from the lead site) |
| repolarisation | G, T timing/shape (`q`, asymmetry, two-lobe notched T), U ratio, coupling | strain patterns, hypo-K (flat T, big U), hypo/hyper-Ca (ST length), digoxin (scooped ST plateau, short QT), LQT1/2/3 shapes, short QT, Wellens (biphasic T: two opposite T lobes), cardiac memory, post-MI T inversion, drug QT prolongation |
| injury / local sources | plateau injury vectors by territory; near-field sources with location | STEMI by territory and age (hyperacute → ST↑ → Q → T↓ as parameter time-courses), posterior MI, RV infarct (near-field RV source, needs V4R from the patent's extra rows), subendocardial ischaemia / left main (vector toward the cavity: diffuse ST↓ + aVR ↑), pericarditis (diffuse injury + atrial injury for PR depression), early repolarisation (J notch kernel + concave ST), Osborn wave in hypothermia, Brugada type 2, ARVC (epsilon = small late near-field RV lobe; T↓ V1–V3) |
| geometry / recording chain | hookup permutations, electrode positions, gain, additive seeded processes on electrode potentials, filters | limb-lead reversals (all 5 non-trivial permutations), chest-lead misplacement / high V1–V2 (needs a position-dependent lead field, see §8), low voltage / effusion (global gain), electrical alternans (per-beat geometry swing), baseline wander, mains 50/60 Hz, EMG / shivering, electrode pop, monitor vs diagnostic filter (ST distortion) |

**Continuous drill variation.** Every dial is a model parameter, so the truth moves with it:

* rate → RR clock (QT follows Fridericia automatically); PR → scheduler; QRS width → `stretch(lobes, k)`;
* frontal QRS axis → rotate all ventricular lobe directions *and* G about the Frank Z axis (a heart-orientation
  change); P axis likewise for the atrial lobes;
* QTc → scale the post-QRS timings; ST level → injury amplitude; voltages → lobe amplitudes; T amplitude → |G|;
* natural variability → seeded per-exercise jitter of every lobe (≈ ±8 % amplitude, ±3 ms timing, ±8° direction),
  so two "normal" ECGs are never identical while the grading truth stays exact.

## 7. Performance

Steady state (Node 24, Windows laptop, 20 warm-up + mean of 50 calls of `generate`): **2.7–4.6 ms per 10 s 12-lead at
500 Hz, median ≈ 3.2 ms** (AF slowest) in the builder's run; the review re-run on a quieter machine measured
**1.1–2.1 ms, median 1.3 ms** (AF 2.1, flutter 1.9); the second review pass, on a loaded machine, measured
**2.1–3.0 ms, median 2.4 ms**, identical to the code before that pass run side by side (2.1–3.7, median 2.4: the
atrial near-field term costs nothing measurable once its electrode gains are cached per source location). The numbers
depend on laptop load by a factor of ~2. `node gen.ts` prints a mean of 5 after a single warm-up, which includes JIT and
laptop load noise (1.5–9 ms). A CPU profile puts ~70 % of the time in `render` (kernel sums and the 9-electrode
projection) and the rest in truth/regions bookkeeping. Cost ≈ (number of kernels in the strip) × (support in samples) × 3, plus 9 × n for the electrode sums;
near-field kernels add 9 dot products per sample. AF and flutter are the most expensive (hundreds of atrial kernels).
Easily real-time in the browser; a whole drill set of 50 ECGs is < 0.3 s.

## 8. Known limitations

1. **Rank-1 T wave.** One T kernel per beat means one T direction: the T has the same shape (scaled) in every lead and
   the T loop has no width. Biphasic or notched T in transition leads is impossible without a second T lobe (this is
   why normal V1 has a flat T; LBBB V5 was a second case until the review re-aimed the LBBB QRS, §10). Next step (not done: it re-opens the calibration of every
   condition): split the secondary part of the T by activation sequence. Each QRS lobe k contributes a reversed,
   T-shaped lobe of area −(1 − c)·A_k centred at its own activation time + APD, while G keeps the primary part. The
   integral (and so the ventricular-gradient rule and the truth) is unchanged; the T loop gains width. Because the
   integral is unchanged, the split T can make a transition lead biphasic but can never change its *net* T polarity:
   that is set by (G − A_QRS)·L_lead alone (see the LBBB fix in §10).
2. **Dower rows are fixed to standard electrode sites.** Chest-electrode misplacement (high V1–V2, V4R, posterior
   leads) needs either the patent's extra rows (V3R–V5R, V7–V9) or a position-dependent lead field; the near-field
   term only adds the proximity correction for localised sources. Electrode positions and κ are estimates.
3. **Smooth lobes.** QRS components are smooth bells; fragmentation, slurs and notches arise only where lobes overlap
   (e.g. the small notch on the R peak of LVH V4, the notch on the LBBB lead II upstroke, the S-upstroke kink in V1–V2
   of hyperkalaemia, where the ×1.22 stretch makes it visible). Fine structure (epsilon, fQRS) needs extra small lobes.
4. **3-D state is coarse.** All ventricular regions repolarise on one shared T time course; there is no apex-to-base
   repolarisation sequence, and the silent conduction-system kernels have rule-of-thumb timings.
5. **Atrial geometry.** Partly addressed in the second review pass: the sinus P and Ta now carry the atrial centroid
   as a near-field location (§1), which fixed the P that was taller in V3–V4 than in II. It is still one point source
   for both atria (no separate RA/LA positions, so the high-V1 negative P of a misplaced V1 cannot be shown), and the
   flutter and AF lobes still use the plain Dower field: giving them the same `loc` (tried) halves the AF f waves in V1
   (1.2 → 0.7 mm, slower-looking) and weakens the positive V1 flutter waves, so their lobes would have to be re-tuned
   first.
6. **Self-check.** The measurement assumes noise-free signals and a 0 mV resting level (flutter's F train used to have a
   −0.4 mm mean in II; since the review it carries its own atrial repolarisation and the mean is 0.0 mm). For fully fused
   rhythms (no quiet segment in > 50 % of beats) it falls back to the model's QRS windows; none of the 12 benchmarks needs
   that any more (VT now has a short TQ segment). WPW PR measures 90 vs 100 ms because the P runs into the delta wave
   (by eye the delta starts at ≈ 96–98 ms; the detector's junction guard, §4, lands a few ms earlier).

## 9. Honest morphology failures at build time (review status in §10)

* **VT**: QRS now dominates (≈ 3:1 over the T in II and V6), but only through two condition-level repolarisation knobs
  (G × 0.2, coupling 0.7); the plain gradient rule with the normal G gives a T as large as the QRS and a sinusoidal look.
  The QRS is 3 smooth lobes, so it lacks the irregular notching of many real VTs. Dissociated sinus P waves are in the
  signal (1.5 mm in II, every 750 ms) and show as notches on a few ST–T segments of the II strip; they are subtle.
* **LBBB** (fixed in the review, §10): V5 now has ST depression and an inverted T (−1.6 mm). The price is the one the
  builder predicted: V4 is a broad R (9 mm, the transition lead) with an upright T, where the PTB-XL LBBB in
  `../harness/real-lbbb.png` has an rS in V4. Both are seen in LBBB; the textbook criteria only constrain V1–V3 and
  I, aVL, V5, V6. A mild slur remains on the V3 S upstroke.
* **RBBB** (fixed in the review, §10): V1 is now rsR′ with s −6.5 mm < R′ 8.3 mm and V2 an "M"; V2 T −2.6 mm. The axis
  (+85°) is still at the vertical end of normal because the normal model's lead I R is small (5 mm).
* **AF**: f waves are irregular now (three streams), but they are smooth bump lobes and the amplitude range is fixed;
  the very fine, almost flat baseline of long-standing AF needs a lower amplitude setting.
* **Hyperkalaemia**: the tented T is a shape exponent, not a mechanism; T base width is set directly.
* **Brugada**: depends on the landmark electrode positions and κ; type-1 morphology is correct in V1–V2 but the
  sensitivity to a 1-ICS electrode shift (the clinical high-V1/V2 manoeuvre) cannot be shown with the fixed Dower rows.

## 10. Review (fresh-eyes passes)

Done (two passes; the second is §10.4): re-ran `node gen.ts`, `bash render-all.sh` and `node check.ts`, read every
`out/<id>.png` and `out/<id>-beat.png` as a reader would, fixed what could be fixed inside this folder, re-rendered,
re-checked, re-read the changed PNGs.

**Lead system.** Einthoven/Goldberger hold in all 12 ECGs: max |III − (II − I)|, |aVR + (I + II)/2|,
|aVL − (I − II/2)|, |aVF − (II − I/2)| = 0.6–1.2·10⁻⁷ mV on the generated arrays (`check.ts`) and ≤ 1·10⁻⁶ mV on the
written `out/*.json` (that is the 6-decimal rounding of the files; aVR + aVL + aVF = 0 holds as well). V1–V6 are
Φ_Vk − (Φ_RA + Φ_LA + Φ_LL)/3 in `leadsFromElectrodes` (the Wilson reference cannot be verified from the 12 leads
alone, since adding any common potential to all six precordial electrodes is invisible in them; it holds by that
construction). The second pass re-verified the identities with an independent script reading the written
`out/*.json` (not `check.ts`): max |III − (II − I)| = 1.0·10⁻⁶, |aVR + (I + II)/2| = 0.5–1.0·10⁻⁶,
|aVL − (I − II/2)| = 1.0·10⁻⁶, |aVF − (II − I/2)| = 1.0·10⁻⁶, |aVR + aVL + aVF| = 1.0·10⁻⁶ mV in all 12 files, i.e. the
6-decimal rounding. No fix touched a lead: every change below is a lobe (region activation), an atrial or ventricular
source location or direction, an atrial-repolarisation parameter, or a check criterion / detector detail.

### 10.1 Deviations found (lead, feature: expected vs seen, mm at 10 mm/mV)

| id | deviation before the review | status |
|---|---|---|
| normal | P in V3–V4 1.7–1.8 mm, taller than in II (1.4 mm): expected the largest P in II and ≲ 1–1.5 mm in V3–V6 | **fixed in pass 2** (§10.4): II 1.5 mm tallest, V2–V6 0.9–1.0, V1 +0.6/−0.7, P axis +55° (all sinus conditions) |
| normal | J point V2–V4 −0.5/−0.6 mm, ST60 0: expected 0 to +1 mm in V2–V3 | open, minor (pass 2: −0.5/−0.5/−0.4; mostly the J sample falling 4 ms before the terminal lobe ends, not Ta) |
| normal | V1 T +0.3 mm (flat) | normal variant, no change |
| rbbb | V1 rS + R′ (r 3.5, S −11.6, R′ 8.8): expected rsR′ "M" with a small s | **fixed**: r 3.7, s −6.5, R′ 8.4; V2 RsR′ 8.7/−2.5/10.5 |
| rbbb | V2 T −0.9: expected clearly inverted secondary T V1–V2 | **fixed**: V1 −4.0, V2 −2.6, V3 +1.3 |
| rbbb | S in V5/V6 3.7/5.0 mm (deep) | improved: 2.7/4.2 mm, still 66–70 ms wide |
| rbbb | axis +89° (edge of normal) | improved: +85°, still vertical |
| lbbb | V5 T +0.6, ST60 +0.3: expected ST depression + T inversion in V5 (as in I, aVL, V6) | **fixed**: ST60 −0.9, T −1.5 (pass 2: −0.9 / −1.6) |
| lbbb | V4 near-isoelectric fragmented rsr′s (1.2/−0.5/2.1): expected rS or a clean transitional complex | **fixed** as a clean broad R 9 mm (transition at V4), T +2.6 |
| lbbb | small notch on the V3 S upstroke (would read as a Cabrera-like sign) | improved: terminal lobe re-aligned, a mild slur remains |
| lbbb | lead II low and notched (rs 1.6/−2.3) | pass 1: rs 2.4/−0.7 (axis −18°); **fixed in pass 2**: broad R 4.6 mm, axis −4°, as in the PTB-XL LBBB |
| anterior-stemi | ST in V2–V4 rises straight into the hyperacute T (no convex "tombstone" plateau); II J −0.7 | open, acceptable for the hyperacute phase |
| inferior-stemi | aVL loses its small r (reads QS) because the injury current starts inside the QRS | open, minor (a later injury onset, 36 ms, did not restore the r; aVL QS alone is a normal variant at a +74° axis) |
| inferior-stemi | chest-lead ST depression deepest in V3–V4 and reaching V5 (J V3/V4/V5 −1.7/−1.5/−1.0): a lateral, not a posterior, pattern; expected V1–V3 | **fixed in pass 2**: J V1/V2/V3 −0.6/−1.5/−1.9, V5 −0.6, V6 −0.1 (ST60 V5–V6 ≈ 0) |
| lvh-strain | none (SV1 + RV6 45 mm, R aVL 11.8, strain T in I aVL V5 V6); tiny notches V4 R / V3 S | none |
| wpw | PR measures 90 vs truth 100 ms: the P runs straight into the delta, the visible corner precedes the delta lobe's 2 % edge | open (inside the ±15 ms check; pass 2 made the detector's P→delta guard robust, §10.4) |
| brugada-type1 | none (coved J 3.2/3.1 mm into negative T in V1–V2, rest normal) | none |
| aflutter | F train had a DC offset (mean −0.37 mm in II) | **fixed** (atrial repolarisation per cycle): 0.0 mm in II, III, aVF, V1 |
| aflutter | rounded positive overshoot after each trough made the inferior F waves read half-positive (down/up excursion 1.6×) | **improved**: septal-ascent lobe 0.22 → 0.26 mV, lateral-descent lobe 0.115 → 0.085 mV → 2.3×, sharper negative troughs |
| hyperk | none (T 11–15 mm V2–V4, symmetric, FWHM 68 ms; P 0.6 mm; QRS 110) | none |
| afib | none (RR CV 17 %, f 1.2 mm in V1, irregular) | pass 2 measured f p2p per lead: V1 1.2, V2 1.2, V3 1.35, III/aVF 1.0, II 0.7, V5/V6 0.6–0.7 mm: largest in V1–V3 and the inferior leads, as expected; no change |
| vt | dissociated sinus P only visible as subtle T-hump distortions; T hump as wide as the QRS (sinusoidal look at 25 mm/s) | open (§10.3) |

### 10.2 What was changed

* **RBBB (`RBBB_QRS`).** The old single slow RV lobe only started rising at ~60 ms, so nothing anterior opposed the
  LV free-wall force at 46 ms and V1 showed the full normal S. Physiology: without a right bundle the septum is crossed
  from the left only and the wavefront breaks through into the RV endocardium while the LV free wall is still active.
  Added a *transseptal → RV breakthrough* lobe (18–72 ms, anterior, 0.55 mV) and re-aimed the slow RV free wall +
  RVOT lobe (46–142 ms, rightward-anterior, slightly superior: the RVOT is activated last; this also keeps the frontal
  axis below +90°). V1 becomes rsR′ "M", V2 RsR′, and the larger anterior QRS area turns the secondary T clearly
  negative in V1–V2 through the unchanged gradient rule.
* **LBBB (`LBBB_QRS`).** Worked from the gradient budget instead of by trial: with the normal G = (79, 45, −14) mV·ms
  the secondary T area is G − A_QRS, and its V5 projection is ≈ 108 − 1.125·A_x − 0.127·A_y (for A_z ≈ 140), so the T
  in V5 inverts only when A_x ≳ 100. The old lobes (A_QRS = (88, −1, 159)) left V5 on the T's null plane. Rotating the
  septal lobe to ≈ 56° and the free-wall lobe to ≈ 44° posterior of +X (A_QRS = (120, 5, 137); pass 2, with the
  free wall slightly inferior: (119, 23, 137)) points the T area at ≈ (−0.25, 0.25, −0.94) (pass 2: (−0.25, 0.14, −0.96)): upright V1–V4, inverted I, aVL, V5, V6 (the textbook discordance), and V4 becomes the
  transition lead. The posterobasal lobe was aligned with the free wall so the V3 S upstroke no longer has a separate
  notch. The relaxed "V5 flat or inverted" criterion was removed: V5 is back in the ST↓ + T↓ check with I, aVL, V6.
  (The split T of §8.1 would not have fixed V5, because it keeps the T integral.)
* **Flutter.** New `FlutterSpec.taRatio` (atrial repolarisation per cycle, §3): the F waves keep their shape but the
  train is now zero-mean, as a real recorder shows it. The two lobe amplitudes above make the inferior F waves read
  as a negative sawtooth rather than as positive humps. V1 F waves stay discrete and positive.
* **Checks (`criteria.ts`).** Tightened or added: RBBB "M" in V1 (s shallower than R′), RBBB T ≤ −1 mm in V1 *and* V2,
  LBBB ST↓ + T↓ in V5, flutter F-train DC < 0.1 mm. All 12 conditions pass; `tsc --strict --erasableSyntaxOnly
  --noUncheckedIndexedAccess` passes.

### 10.3 What still deviates (tried, not adopted, or out of scope)

* ~~**P too tall in V3–V4.**~~ Fixed in pass 2 (§10.4). Pass 1 had tried separate RA/LA centroids as near-field
  locations: P in V3–V6 fell to 0.9–1.1 mm but V1 saw the nearby RA strongly (+1.4/−0.3 mm, no longer biphasic).
* **VT sinus P waves stay subtle.** A 1.5× sinus P (2.1 mm in II, still normal; sympathetic drive raises inferior P
  amplitude) was tried: no clearly better visibility on the strip, and the P superposition jittered the detector's
  QRS fiducials (measured RR CV 3.6 % on a 0.4 % clock), so it was reverted. With QRS 162 ms and QT 312 ms at a
  353 ms RR there is no free baseline for a P to land on; P waves show only as changes of the repeating shape. VT still
  relies on G × 0.2 and coupling 0.7 (§9).
* **LBBB V4 vs the real tracing.** V4 is now a broad R with a low upright T (J +0.4 mm, ST60 +1.3 mm); the PTB-XL LBBB
  has an rS in V4. With a single T direction and the normal gradient, "V4 rS" and "V5 T inverted" cannot both hold
  (V4 rS needs the QRS area ≳ 64° posterior of +X, which leaves V5 on the T's null plane). Teaching note: the V4 J
  point (+0.4 mm) is below the 1 mm concordant-elevation threshold used for ischaemia in LBBB, but V4 should not be the
  lead a learner is asked to grade for concordance.
* **RBBB axis +85°** (vertical end of normal) because the normal model's lead I R is only 5 mm; raising it would mean
  re-calibrating `NORMAL_QRS`, which all conditions share.
* **WPW PR 90 vs 100**, **anterior STEMI concave ST**, **inferior STEMI aVL QS**, **normal V2–V3 J −0.5 mm**: as in the
  table; each is minor and each fix would touch a shared base (`NORMAL_V`, the P/delta truth convention).
* Unchanged from §8–§9: rank-1 T, fixed Dower rows (no chest-electrode misplacement, no V3R/V7), smooth lobes (no
  fragmentation, smooth AF f waves), hyperkalaemia tent as a shape exponent, Brugada dependent on κ and electrode
  positions, no noise or filters.

### 10.4 Second pass

Re-ran everything from a clean state (all 12 passed `check.ts` before any change), re-read all 24 PNGs, re-verified
the limb identities independently on the written JSON files (§10 above). Changes, each followed by a full
`node check.ts` (all 12 conditions, since two of them touch shared bases) and a re-render and re-read of the PNGs:

* **Atrial lead field (`NORMAL_P`, shared by all sinus conditions and by the VT's dissociated P).** The P was tallest
  in V3–V4 (1.8 mm) instead of II (1.4 mm), because the atrial lobes went through Dower rows fitted to the ventricular
  source. Now the P lobes and the Ta carry one atrial centroid (`REGION_POS.ATRIA`, midpoint of the RA and LA centroids)
  as a `far = 1` near-field location (`AtrialMorph.loc`), and the lobe directions were re-fitted against all P criteria
  together with a small grid search: RA (0.6, 0.8, −0.3) × 0.14 mV (less anterior), LA (0.7, 0.2, 0.75) × 0.13 mV
  (more posterior). Result: P axis +55° (was +59°), II 1.5 mm and the tallest P, III 1.1, aVF 1.3, I 0.6, V1 +0.6/−0.7
  (biphasic), V2 0.9/−0.3, V3–V6 0.9–1.0 mm. LVH keeps its mildly enlarged LA lobe as a ratio (× 1.18) of the new
  base; hyperkalaemia keeps the atrial centroid (P 0.6 mm in II). The direction-only fix (no near-field) needed a P
  axis of ≈ 65° to get V3 ≤ II, which is why the lead-field fix was preferred.
* **QRS-onset detector (`measure.ts`).** The new P runs into the WPW delta with a slightly different slope, and the
  detector's "P → delta slope minimum" guard, evaluated on the ±3-sample smoothed slope, no longer saw the minimum:
  measured PR 80 / QRS 138 against truth 100 / 124 (by eye the delta starts at ≈ 96–98 ms). The guard now uses a
  ±1-sample smoothed slope and only accepts minima before the high-curvature QRS body (the first version without that
  restriction fired inside the broad LBBB QRS and was corrected before anything else was changed). WPW measures
  PR 90 / QRS 128 again; with the detector swapped alone, every other condition's measured HR, PR, QRS and QT are
  identical and only the VT axis moves by 1°.
* **Inferior STEMI (`INF_ST_DIR`).** The injury vector (−0.4, 1, 0.25) put the deepest chest-lead depression in V3–V4
  and reached V5 through its rightward component. (−0.2, 1, 0.45), amplitude 0.20 → 0.22 mV: ST elevation II/III/aVF
  1.4/2.2/1.8 mm (III > II kept), reciprocal I −0.7, aVL −1.5 mm (aVL deepest), ST depression V1–V3 (J −0.6/−1.5/−1.9),
  V5–V6 ≈ isoelectric: the RCA pattern with inferoposterior extension.
* **LBBB (`LBBB_QRS`, free-wall lobe Y −0.03 → +0.15).** Lead II was a low fragmented rs (2.4/−0.7 mm) — the rhythm
  strip was hard to read and the PTB-XL LBBB (axis 0°) has an upright broad R in II. Now II is a broad R 4.6 mm, axis
  −4°; V5/V6 still ST↓ + T↓ (−1.6/−3.7 mm) because extra inferior QRS area helps the V5 inversion (§10.2 formula).
* **Renderer.** Near-field electrode gains are cached per (location, far), so the atrial term costs nothing measurable
  (§7). Optional `loc` fields were added to `FlutterSpec` and `FibSpec` but are left unset (§8.5: tried, would need
  re-tuning of the flutter/AF lobes).

Considered and not changed in pass 2: VT P visibility (pass 1 reason stands: no free baseline at RR 353 ms; the P is
now 1.5 mm in II), WPW PR 90 vs 100 (within tolerance, see above), anterior STEMI straight ST into the hyperacute T,
AF f-wave distribution (largest in V1–V3 and the inferior leads, smallest laterally, as expected), the S-upstroke kink in
hyperkalaemia V1–V2 (§8.3). All 12 conditions pass `check.ts`; `tsc --strict --erasableSyntaxOnly
--noUncheckedIndexedAccess` passes.

Reference for curriculum structure, criteria and terminology: Castellano C, Pérez de Juan MA, Attie F.
*Electrocardiografía Clínica*, 2nd ed. Elsevier, 2004 (no text, tables or figures reproduced). Other sources: Dower GE,
US patent 5,711,304; Edenbrandt & Pahlm 1988; Kors et al. 1990; Wilson FN et al. Am Heart J 1934 (ventricular
gradient); Fridericia 1920 (QT rate correction); Pan & Tompkins, IEEE TBME 1985 (T-wave discrimination in the detector).
